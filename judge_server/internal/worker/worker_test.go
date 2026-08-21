package worker

import (
	"testing"

	"judge_server/internal/model"
)

func TestNew(t *testing.T) {
	w := New()

	if w == nil {
		t.Fatal("expected worker, got nil")
	}

	if w.executor == nil {
		t.Fatal("expected executor, got nil")
	}
}

func TestProcess(t *testing.T) {
	w := New()

	job := model.Job{
		ID:       "12",
		Language: "Python",
		Source: `print("hello, world!")
if 1:
	print("1")
`,
	}

	err := w.Process(job)

	if err != nil {
		t.Fatalf("Process() returned error: %v", err)
	}
}

func TestRun(t *testing.T) {
	w := New()

	err := w.Run()

	if err != nil {
		t.Fatalf("Run() returned error: %v", err)
	}
}
