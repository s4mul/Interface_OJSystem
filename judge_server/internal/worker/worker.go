package worker

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"judge_server/internal/compiler"
	"judge_server/internal/evaluator"
	"judge_server/internal/executor"
	"judge_server/internal/model"
	"judge_server/internal/queue"
	"judge_server/internal/reporter"
)

const (
	queueSize = 100

	// Sandbox 구현 전까지 사용하는 임시 작업 디렉터리
	workDir = "C:/Users/Development/Documents/GitHub/Interface_OJSystem/judge_server/workDirectorty"
)

// 문제별 실행 제한 설정
type limits struct {
	TimeLimitMs   int `json:"timeLimitMs"`
	MemoryLimitMb int `json:"memoryLimitMb"`
	OutputLimitKb int `json:"outputLimitKb"`
}

type Worker struct {
	executor  *executor.Executor
	compiler  *compiler.Compiler
	evaluator *evaluator.Evaluator
	reporter  *reporter.Reporter
	queue     *queue.Queue
}

func New() *Worker {
	return &Worker{
		executor:  executor.New(),
		compiler:  compiler.New(),
		evaluator: evaluator.New(),
		reporter:  reporter.New(),
		queue:     queue.New(queueSize),
	}
}

// Run은 Queue에서 제출을 기다린다.
// Job이 들어오면 채점을 수행하고 최종 결과를 웹서버에 보고한다.
func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	for {
		// Queue가 비어 있으면 새로운 Job이 들어올 때까지 대기한다.
		job := w.queue.Pop()

		result, err := w.process(job)

		// 채점 시스템 내부에서 오류가 발생한 경우 Judge Error로 처리한다.
		if err != nil {
			result = "JE"
		}

		// 채점 결과는 Job당 한 번만 웹서버에 보고한다.
		if err := w.report(job.SubmissionID, result); err != nil {
			return fmt.Errorf("failed to report submission %d: %w", job.SubmissionID, err)
		}
	}
}

// Push는 외부에서 전달받은 Job을 Worker의 Queue에 추가한다.
// 이후 HTTP endpoint가 이 함수를 호출하게 된다.
func (w *Worker) Push(job model.Job) {
	w.queue.Push(job)
}

// process는 제출 하나에 대한 채점을 수행하고 최종 상태 코드를 반환한다.
//
// 정상적인 채점 결과:
// AC  - Accepted
// WA  - Wrong Answer
// CE  - Compile Error
// RE  - Runtime Error
// TLE - Time Limit Exceeded
//
// 채점 시스템 자체에서 오류가 발생한 경우 error를 반환하며,
// Run에서 해당 제출을 JE(Judge Error)로 처리한다.
func (w *Worker) process(job model.Job) (string, error) {
	// 제출된 소스 코드를 컴파일하고 실행 정보를 생성한다.
	compileResult, err := w.compile(job, workDir)
	if err != nil {
		return "", fmt.Errorf("failed to compile submission: %w", err)
	}

	if !compileResult.Success {
		return "CE", nil
	}

	problemRoot := filepath.Join(
		"data/problems",
		strconv.Itoa(job.ProblemID),
	)

	// 문제의 시간/메모리/출력 제한을 읽는다.
	limits, err := loadLimits(problemRoot)
	if err != nil {
		return "", fmt.Errorf("failed to load limits: %w", err)
	}

	// 컴파일 결과와 문제 제한을 기반으로 실행 요청을 생성한다.
	executionRequest := model.ExecuteRequest{
		Command:   compileResult.Command,
		Args:      compileResult.Args,
		WorkDir:   compileResult.WorkDir,
		TimeLimit: time.Duration(limits.TimeLimitMs) * time.Millisecond,
	}

	// input 디렉터리의 파일 개수를 이용해 테스트케이스 수를 확인한다.
	testcaseCount, err := countTestCases(problemRoot)
	if err != nil {
		return "", fmt.Errorf("failed to count testcases: %w", err)
	}

	// 테스트케이스 파일명은 1부터 시작하는 연속된 정수여야 한다.
	for testCaseID := 1; testCaseID <= testcaseCount; testCaseID++ {
		input, err := readTestCaseInput(problemRoot, testCaseID)
		if err != nil {
			return "", err
		}

		executionRequest.Stdin = string(input)

		// 제출 프로그램을 실행한다.
		executionResult, err := w.execute(executionRequest)
		if err != nil {
			return "", fmt.Errorf("failed to execute submission: %w", err)
		}

		if executionResult.TimeOut {
			return "TLE", nil
		}

		if executionResult.ExitCode != 0 {
			return "RE", nil
		}

		// 프로그램의 실제 출력과 테스트케이스의 정답을 비교한다.
		evaluateResult, err := w.evaluate(
			job.ProblemID,
			testCaseID,
			executionResult.Stdout,
		)
		if err != nil {
			return "", fmt.Errorf("failed to evaluate testcase %d: %w", testCaseID, err)
		}

		if !evaluateResult.Result {
			return "WA", nil
		}
	}

	// 모든 테스트케이스를 통과했다.
	return "AC", nil
}

// compile은 Job을 CompileRequest로 변환하고 Compiler에 전달한다.
func (w *Worker) compile(
	job model.Job,
	dir string,
) (model.CompileResult, error) {

	request := model.CompileRequest{
		Language: job.Language,
		Source:   job.Source,
		WorkDir:  dir,
	}

	return w.compiler.Compile(request)
}

// execute는 실행 요청을 Executor에 전달한다.
func (w *Worker) execute(
	request model.ExecuteRequest,
) (model.ExecuteResult, error) {

	return w.executor.Execute(request)
}

// evaluate는 실행 결과를 EvaluateRequest로 변환하고 Evaluator에 전달한다.
func (w *Worker) evaluate(
	problemID int,
	testCaseID int,
	actualOutput string,
) (model.EvaluateResult, error) {

	request := model.EvaluateRequest{
		ProblemID:    problemID,
		TestCaseID:   testCaseID,
		ActualOutput: actualOutput,
	}

	return w.evaluator.Evaluate(request)
}

// report는 채점 결과를 ReportRequest로 변환하고 Reporter에 전달한다.
func (w *Worker) report(
	submissionID int,
	result string,
) error {

	request := model.ReportRequest{
		SubmissionID: submissionID,
		Result:       result,
	}

	return w.reporter.Report(request)
}

// loadLimits는 문제의 limits.json을 읽어 실행 제한을 반환한다.
func loadLimits(problemRoot string) (limits, error) {
	data, err := os.ReadFile(
		filepath.Join(problemRoot, "limits", "limits.json"),
	)
	if err != nil {
		return limits{}, err
	}

	var result limits

	if err := json.Unmarshal(data, &result); err != nil {
		return limits{}, err
	}

	return result, nil
}

// countTestCases는 input 디렉터리에 존재하는 파일 개수를 반환한다.
func countTestCases(problemRoot string) (int, error) {
	entries, err := os.ReadDir(
		filepath.Join(problemRoot, "input"),
	)
	if err != nil {
		return 0, err
	}

	count := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			count++
		}
	}

	return count, nil
}

// readTestCaseInput은 지정된 테스트케이스의 입력 파일을 읽는다.
func readTestCaseInput(
	problemRoot string,
	testCaseID int,
) ([]byte, error) {

	path := filepath.Join(
		problemRoot,
		"input",
		strconv.Itoa(testCaseID),
	)

	input, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf(
			"cannot find input testcase %d: %w",
			testCaseID,
			err,
		)
	}

	return input, nil
}

// 테스트에서 Reporter가 사용할 HTTP 서버 주소를 변경한다.
func (w *Worker) SetReporterURL(url string) {
	w.reporter.SetURL(url)
}
