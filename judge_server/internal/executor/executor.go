package executor

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"

	"judge_server/internal/model"
)

type Executor struct {
}

func New() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(request model.ExecutionRequest) (model.ExecutionResult, error) {
	if request.Command == "" {
		return model.ExecutionResult{}, fmt.Errorf("execution command is empty")
	}
	if request.TimeLimit <= 0 {
		return model.ExecutionResult{}, fmt.Errorf("time limit must be greater than zero")
	}
	//timer set
	ctx, cancel := context.WithTimeout(
		context.Background(),
		request.TimeLimit,
	)
	defer cancel()

	cmd := exec.CommandContext(
		ctx,
		request.Command,
		request.Args...,
	)

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := model.ExecutionResult{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	return result, err
}
