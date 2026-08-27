package worker

import (
	"testing"
)

func TestWorkerRun(t *testing.T) {
	w := New()

	err := w.Run()
	if err != nil {
		t.Fatalf("Worker.Run() failed: %v", err)
	}
}
