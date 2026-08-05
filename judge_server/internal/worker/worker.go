package worker

import "fmt"

type Worker struct {
}

func New() *Worker {
	return &Worker{}
}

func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	return nil
}
