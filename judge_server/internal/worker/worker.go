package worker

import (
	"context"
	"fmt"
	"path/filepath"
	"strconv"
	"time"

	"judge_server/internal/compiler"
	"judge_server/internal/evaluator"
	"judge_server/internal/executor"
	"judge_server/internal/filereader"
	"judge_server/internal/model"
	"judge_server/internal/queue"
	"judge_server/internal/reporter"
	"judge_server/internal/sandbox"
)

const queueSize = 100
const root = "."

type Worker struct {
	executor   *executor.Executor
	compiler   *compiler.Compiler
	evaluator  *evaluator.Evaluator
	reporter   *reporter.Reporter
	queue      *queue.Queue
	sandbox    *sandbox.Sandbox
	filereader *filereader.FileReader
}

func New() *Worker {
	return &Worker{
		executor:   executor.New(),
		compiler:   compiler.New(),
		evaluator:  evaluator.New(root),
		reporter:   reporter.New(),
		queue:      queue.New(queueSize),
		sandbox:    sandbox.New(),
		filereader: filereader.New(root),
	}
}

// Run은 Queue에서 제출을 기다린다.
// 제출이 들어오면 채점을 수행하고 결과를 웹서버에 보고한다.
func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	for {
		job := w.queue.Pop()

		verdict, err := w.process(job)

		if err != nil {
			fmt.Printf(
				"submission %d: %v\n",
				job.SubmissionID,
				err,
			)

			verdict = "JE"
		}

		// 채점 결과는 제출당 한 번만 보고한다.
		repReq := model.ReportRequest{
			SubmissionID: job.SubmissionID,
			Result:       verdict,
		}

		if err := w.reporter.Report(repReq); err != nil {
			// 보고 실패가 Worker 전체를 종료시키지 않도록 한다.
			fmt.Printf(
				"failed to report submission %d: %v\n",
				job.SubmissionID,
				err,
			)
		}
	}
}

// process는 제출 하나의 채점 과정을 수행한다.
// 정상적으로 채점하면 Verdict를 반환하고,
// 시스템 내부 오류가 발생하면 error를 반환한다.
func (w *Worker) process(job model.Job) (string, error) {

	// 1. 문제별 제한 설정을 읽는다.
	limits, err := w.filereader.ReadLimits(job.ProblemID)

	if err != nil {
		return "", fmt.Errorf(
			"failed to read limits: %w",
			err,
		)
	}

	// 2. 언어와 문제 제한에 맞는 샌드박스 요청을 구성한다.
	sandboxReq, err := w.buildSandboxRequest(job, limits)

	if err != nil {
		return "", err
	}
	sandboxReq.WorkDir, err = filepath.Abs(sandboxReq.WorkDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve work directory: %w", err)
	}

	// 3. 샌드박스를 생성한다.
	sandboxRes, err := w.sandbox.Create(sandboxReq)
	if err != nil {
		return "", fmt.Errorf(
			"failed to create sandbox: %w",
			err,
		)
	}
	defer w.sandbox.Cleanup(sandboxRes.ContainerId)

	//3-1 샌드박스 시작
	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	cmd := w.sandbox.BuildStartCommand(
		ctx,
		sandboxRes.ContainerId,
	)
	err = cmd.Run()
	cancel()

	if err != nil {
		return "", fmt.Errorf("failed to start sandbox: %w", err)
	}

	// TODO: 채점 종료 시 샌드박스 상태 확인 및 삭제.
	// 4. 생성된 샌드박스에서 컴파일

	compileRes, err := w.compiler.Compile(
		model.CompileRequest{
			Language:    job.Language,
			Source:      job.Source,
			WorkDir:     sandboxReq.WorkDir,
			ContainerID: sandboxRes.ContainerId,
		},
	)
	if err != nil {
		return "", fmt.Errorf(
			"failed to compile submission: %w",
			err,
		)
	}

	if !compileRes.Success {
		return "CE", nil
	}

	// 4. 평가 요청을 구성한다.
	evaluateReq := model.EvaluateRequest{
		ProblemID: job.ProblemID,
		SandboxID: sandboxRes.ContainerId,
	}

	// 5. 실행 설정을 구성한다.
	executionConf := w.buildExecutionConfig(
		compileRes,
		sandboxRes.ContainerId,
		sandboxReq.TimeLimitsMs,
		limits.OutputLimitKb,
	)

	// 6. 테스트케이스를 평가한다.
	evalRes, err := w.evaluator.Evaluate(
		evaluateReq,
		executionConf,
	)

	if err != nil {
		return "", fmt.Errorf(
			"failed to evaluate submission: %w",
			err,
		)
	}

	if evalRes.Verdict == "RE" && evalRes.ExitCode == 137 { //MLE 여부를 확인

		state, err := w.sandbox.Inspect(
			sandboxRes.ContainerId,
		)

		if err != nil {
			return "", fmt.Errorf(
				"failed to inspect sandbox: %w",
				err,
			)
		}

		if state.OOMKilled {
			return "MLE", nil
		}
	}

	// 7. 최종 채점 결과를 반환한다.
	if evalRes.Verdict == "" {
		return "", fmt.Errorf(
			"empty verdict for submission %d",
			job.SubmissionID,
		)
	}

	return evalRes.Verdict, nil
}

// buildSandboxRequest는 문제 제한과 제출 언어를 바탕으로
// 샌드박스 생성 요청을 구성한다.
func (w *Worker) buildSandboxRequest(
	job model.Job,
	limits filereader.Limits,
) (model.SandboxRequest, error) {

	req := model.SandboxRequest{
		MemoryLimitsMb: limits.MemoryLimitMb,
		TimeLimitsMs:   time.Duration(limits.TimeLimitMs) * time.Millisecond,
		ProcessLimits:  16,
		SubmissionID:   job.SubmissionID,
		Language:       job.Language,

		WorkDir: filepath.Join(
			root,
			"sandboxes",
			strconv.Itoa(job.SubmissionID),
		),
	}

	switch job.Language {

	case "C", "C++", "Java":

	case "python", "Python":
		req.Language = "python"

	default:
		return model.SandboxRequest{},
			fmt.Errorf(
				"unsupported language: %s",
				job.Language,
			)
	}

	return req, nil
}

// buildExecutionConfig는 컨테이너 실행에 필요한 설정을 구성한다.
func (w *Worker) buildExecutionConfig(
	compileRes model.CompileResult,
	containerID string,
	timeLimit time.Duration,
	outputLimitKb int,
) model.ExecutionConfig {

	return model.ExecutionConfig{
		ContainerID:      containerID,
		Command:          compileRes.Command,
		Args:             compileRes.Args,
		WorkDir:          compileRes.WorkDir,
		TimeLimit:        timeLimit,
		OutputLimitBytes: int64(outputLimitKb) * 1024,
	}
}

// Push는 외부에서 전달받은 Job을 Worker의 Queue에 추가한다.
func (w *Worker) Push(job model.Job) {
	w.queue.Push(job)
}

// 테스트에서 Reporter가 사용할 HTTP 서버 주소를 변경한다.
func (w *Worker) SetReporterURL(url string) {
	w.reporter.SetURL(url)
}
