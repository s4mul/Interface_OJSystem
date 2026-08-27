package worker

import (
	"os"
	"testing"
)

func TestWorkerRun(t *testing.T) {
	w := New()
	os.Chdir("C:/Users/Development/Documents/GitHub/Interface_OJSystem") //test only
	err := w.Run()
	if err != nil {
		t.Fatalf("Worker.Run() failed: %v", err)
	}
}
