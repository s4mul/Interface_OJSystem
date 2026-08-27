package worker

import (
	"fmt"
	"strconv"
	"time"

	"judge_server/internal/compiler"
	"judge_server/internal/executor"
	"judge_server/internal/model"
)

type Worker struct {
	executor *executor.Executor
	compiler *compiler.Compiler
}

func New() *Worker {
	return &Worker{
		executor: executor.New(),
		compiler: compiler.New(),
	}
}

func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	// wait queue

	// accept Job - tmp Job
	job := model.Job{
		ID:       "1",
		Language: "C",
		Source: `
#include<stdio.h>
int main(void){
	int a, b;
	scanf("%d %d", &a, &b);
    printf("%d", a + b);
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
		return fmt.Errorf("compile error: %s", compileResult.Stderr)
	}

	// read limits
	stdin := ""
	timeLimit := 1 * time.Second
	testcaseNumber := 3

	// TODO: WorkingDir, WorkDir 통일
	executionRequest := model.ExecuteRequest{
		Command:    compileResult.Command,
		Args:       compileResult.Args,
		WorkingDir: compileResult.WorkDir,
		Stdin:      stdin,
		TimeLimit:  timeLimit,
	}

	// execute & validation
	for i := 0; i < testcaseNumber; i++ {
		executionRequest.Stdin = "1 0"
		executionResult, err := w.execute(executionRequest)

		if err != nil {
			return fmt.Errorf("OJ ERROR: %w", err)
		}

		if executionResult.ExitCode != 0 {
			return fmt.Errorf(
				"runtime error: exit code %d: %s",
				executionResult.ExitCode,
				executionResult.Stderr,
			)
		}

		if executionResult.Stdout == strconv.Itoa(i) {
			fmt.Printf("Correct\n")
		} else {
			fmt.Printf("Wrong\t, res: %s\n", executionResult.Stdout)
		}
	}

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
