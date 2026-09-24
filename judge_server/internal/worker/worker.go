package worker

import (
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
const root = "judge_server"

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

	// 3. 샌드박스를 생성한다.
	sandboxRes, err := w.sandbox.Create(sandboxReq)

	if err != nil {
		return "", fmt.Errorf(
			"failed to create sandbox: %w",
			err,
		)
	}

	// TODO: 채점 종료 시 샌드박스 상태 확인 및 삭제.
	// TODO: 컴파일 결과에 따른 CE 판정 처리.

	// 4. 평가 요청을 구성한다.
	evaluateReq := model.EvaluateRequest{
		ProblemID: job.ProblemID,
		SandboxID: sandboxRes.ContainerId,
	}

	// 5. 실행 설정을 구성한다.
	executionConf := w.buildExecutionConfig(
		job,
		sandboxRes.ContainerId,
		sandboxReq.TimeLimitsMs,
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
		WorkDir:        "",
	}

	// TODO: 컴파일 명령어를 샌드박스 내부에서 실행하고
	// 컴파일 결과를 별도로 확인하도록 구현한다.
	switch job.Language {

	case "C":
		req.Command = "gcc"
		req.Args = []string{
			"main.c",
			"-o",
			"main",
		}

	case "C++":
		req.Command = "g++"
		req.Args = []string{
			"main.cpp",
			"-o",
			"main",
		}

	case "Java":
		req.Command = "javac"
		req.Args = []string{
			"Main.java",
		}

	case "python", "Python":
		// Sandbox의 언어 매핑에 맞춰 소문자로 통일한다.
		req.Language = "python"
		req.Command = ""
		req.Args = []string{}

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
	job model.Job,
	containerID string,
	timeLimit time.Duration,
) model.ExecutionConfig {

	return model.ExecutionConfig{
		Command: "docker",

		Args: []string{
			"exec",
			"-i",
			containerID,
		},

		WorkDir: filepath.Join(
			root,
			"sandboxes",
			strconv.Itoa(job.SubmissionID),
		),

		TimeLimit: timeLimit,
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
