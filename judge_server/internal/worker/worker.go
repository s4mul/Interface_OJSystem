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
)

type Worker struct {
	executor  *executor.Executor
	compiler  *compiler.Compiler
	evaluator *evaluator.Evaluator
}

func New() *Worker {
	return &Worker{
		executor:  executor.New(),
		compiler:  compiler.New(),
		evaluator: evaluator.New(),
	}
}

func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	// wait queue

	// accept Job - tmp Job
	job := model.Job{
		SubmissionID: 1,
		ProblemID:    1,
		Language:     "C",
		Source: `
#include<stdio.h>
int main(void){
	int a, b
	scanf("%d %d", &a, &b);
	if(a == -1){
		while(1){
		}
	}else if(a == 0){
		a++;
		printf("%d", a / b);
	}
	else{
		printf("%d", a / b);
	}

    return 0;
}`,
	}

	// build sandbox
	dir := "C:/Users/Development/Documents/GitHub/Interface_OJSystem/judge_server/workDirectorty"

	// compile sourcecode
	compileResult, err := w.compile(job, dir)

	if err != nil {
		return fmt.Errorf("OJ ERROR: %w", err)
	}

	if !compileResult.Success {
		fmt.Printf("compile error:\n %s\n", compileResult.Stderr)
		return nil
	}

	// read limits
	problemRoot := filepath.Join("data/problems", strconv.Itoa(job.ProblemID))

	type Limits struct {
		TimeLimitMs   int `json:"timeLimitMs"`
		MemoryLimitMb int `json:"memoryLimitMb"`
		OutputLimitKb int `json:"outputLimitKb"`
	}

	data, err := os.ReadFile(filepath.Join(problemRoot, "limits/limits.json"))
	if err != nil {
		return err
	}

	var limits Limits

	err = json.Unmarshal(data, &limits)

	if err != nil {
		return err
	}

	executionRequest := model.ExecuteRequest{
		Command:   compileResult.Command,
		Args:      compileResult.Args,
		WorkDir:   compileResult.WorkDir,
		TimeLimit: time.Duration(limits.TimeLimitMs) * time.Millisecond,
	}

	entries, err := os.ReadDir(filepath.Join(problemRoot, "input"))
	if err != nil {
		return err
	}

	testcaseCount := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			testcaseCount++
		}
	}

	// execute & evaluation
	for i := 1; i <= testcaseCount; i++ {
		//read input
		//반드시 테스트케이스는 1부터 연속된 정수여야 함.
		input, err := os.ReadFile(filepath.Join(problemRoot, "input", strconv.Itoa(i)))
		if err != nil {
			return fmt.Errorf("cannot find input: %w", err)
		}

		executionRequest.Stdin = string(input)

		//execution
		executionResult, err := w.execute(executionRequest)

		if err != nil {
			return fmt.Errorf("OJ ERROR: %w", err)
		}
		if executionResult.TimeOut {
			fmt.Printf("Time Limit Exceeded: testcase %d\n", i)
			return nil
		}
		if executionResult.ExitCode != 0 {
			fmt.Printf("runtime error: exit code %d: %s\n", executionResult.ExitCode, executionResult.Stderr)
			return nil
		}

		//evaluation
		actualOutput := executionResult.Stdout

		evaluateRequest := model.EvaluateRequest{
			ProblemID:    job.ProblemID,
			TestCaseID:   i,
			ActualOutput: actualOutput,
		}

		evaluateResult, err := w.evaluator.Evaluate(evaluateRequest)
		if err != nil {
			return fmt.Errorf("fail to evaluate: %w", err)
		}
		if !evaluateResult.Result {
			fmt.Println("Wrong Answer")
			return nil //reporter의 부재로 출력후 종료만
		} else {
			fmt.Println("correct")
		}
	}

	//report
	fmt.Println("Accept!")
	return nil
}

func (w *Worker) compile(
	submission model.Job,
	dir string,
) (model.CompileResult, error) {

	compileRequest := model.CompileRequest{
		Language: submission.Language,
		Source:   submission.Source,
		WorkDir:  dir,
	}

	compileResult, err := w.compiler.Compile(compileRequest)

	return compileResult, err
}

func (w *Worker) execute(
	request model.ExecuteRequest,
) (model.ExecuteResult, error) {

	return w.executor.Execute(request)
}
