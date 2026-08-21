package worker

import (
	"fmt"
	"strings"

	"judge_server/internal/executor"
	"judge_server/internal/model"

	"log"
	"time"
)

type Worker struct {
	executor *executor.Executor
}

func New() *Worker {
	return &Worker{
		executor: executor.New(),
	}
}

func (w *Worker) Run() error {
	fmt.Println("Worker is running")
	var testID string = "12"
	testLanguage := "Python"
	testSource :=
		`print("hello, world!")
if 1:
	print("1")
`

	w.Process(model.Job{
		ID:       testID,
		Language: testLanguage,
		Source:   testSource,
	})

	e := executor.New()

	request := model.ExecutionRequest{
		Command:   "go",
		Args:      []string{"version"},
		TimeLimit: 2 * time.Second,
	}

	result, err := e.Execute(request)

	if err != nil {
		log.Fatalf("Execute() returned error: %v", err)
	}

	if !strings.Contains(result.Stdout, "go version") {
		log.Fatalf("unexpected stdout: %q", result.Stdout)
	}

	return nil
}

func (w *Worker) Process(submission model.Job) error {
	fmt.Println(submission.ID)
	fmt.Println(submission.Language)
	fmt.Println(submission.Source)

	return nil
}
