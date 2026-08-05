package worker

import (
	"fmt"

	"judge_server/internal/model"
)

type Worker struct {
}

func New() *Worker {
	return &Worker{}
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
	return nil
}

func (w *Worker) Process(submission model.Job) error {
	fmt.Println(submission.ID)
	fmt.Println(submission.Language)
	fmt.Println(submission.Source)

	return nil
}
