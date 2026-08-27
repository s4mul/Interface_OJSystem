package executor

import (
	"runtime"
	"strings"
	"testing"
	"time"

	"judge_server/internal/model"
)

func TestExecuteSuccess(t *testing.T) {
	e := New()

	request := model.ExecutionRequest{
		Command:   "go",
		Args:      []string{"version"},
		TimeLimit: 2 * time.Second,
	}

	result, err := e.Execute(request)

	if err != nil {
		t.Fatalf("Execute() returned error: %v", err)
	}

	if result.ExitCode != 0 {
		t.Errorf("expected exit code 0, got %d", result.ExitCode)
	}

	if result.TimeOut {
		t.Errorf("expected TimeOut false, got true")
	}

	if !strings.Contains(result.Stdout, "go version") {
		t.Errorf("unexpected stdout: %q", result.Stdout)
	}
}

func TestExecuteCommandNotFound(t *testing.T) {
	e := New()

	request := model.ExecutionRequest{
		Command:   "this-command-does-not-exist",
		TimeLimit: 2 * time.Second,
	}

	_, err := e.Execute(request)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestExecuteNonZeroExitCode(t *testing.T) {
	e := New()

	var command string
	var args []string

	if runtime.GOOS == "windows" {
		command = "powershell"
		args = []string{"-Command", "exit 3"}
	} else {
		command = "sh"
		args = []string{"-c", "exit 3"}
	}

	request := model.ExecutionRequest{
		Command:   command,
		Args:      args,
		TimeLimit: 2 * time.Second,
	}

	result, err := e.Execute(request)

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if result.ExitCode != 3 {
		t.Errorf("expected exit code 3, got %d", result.ExitCode)
	}

	if result.TimeOut {
		t.Errorf("expected TimeOut false, got true")
	}
}

func TestExecuteTimeout(t *testing.T) {
	e := New()

	var command string
	var args []string

	if runtime.GOOS == "windows" {
		command = "powershell"
		args = []string{"-Command", "Start-Sleep -Seconds 2"}
	} else {
		command = "sh"
		args = []string{"-c", "sleep 2"}
	}

	request := model.ExecutionRequest{
		Command:   command,
		Args:      args,
		TimeLimit: 100 * time.Millisecond,
	}

	result, err := e.Execute(request)

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if !result.TimeOut {
		t.Errorf("expected TimeOut true, got false")
	}

	if result.ExitCode != -1 {
		t.Errorf("expected exit code -1, got %d", result.ExitCode)
	}
}
