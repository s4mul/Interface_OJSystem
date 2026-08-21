package worker

import (
	"fmt"

	"judge_server/internal/executor"
	"judge_server/internal/model"
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

	return nil
}

func (w *Worker) Process(submission model.Job) error {
	fmt.Println(submission.ID)
	fmt.Println(submission.Language)
	fmt.Println(submission.Source)

	return nil
}
