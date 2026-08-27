package executor

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"judge_server/internal/model"
	"os/exec"
	"strings"
	"time"
)

type Executor struct {
}

func New() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(request model.ExecuteRequest) (model.ExecuteResult, error) {
	if request.Command == "" {
		return model.ExecuteResult{}, fmt.Errorf("execution command is empty")
	}
	if request.TimeLimit <= 0 {
		return model.ExecuteResult{}, fmt.Errorf("time limit must be greater than zero")
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
	cmd.Stdin = strings.NewReader(request.Stdin)
	cmd.Dir = request.WorkingDir

	start := time.Now()
	err := cmd.Run()
	duration := time.Since(start)

	result := model.ExecuteResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: 0,
		TimeOut:  false,
		Duration: duration,
	}

	//timeout
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		result.TimeOut = true
		result.ExitCode = -1

		return result, nil
	}

	if err != nil {
		var exitErr *exec.ExitError

		if errors.As(err, &exitErr) {
			result.ExitCode = exitErr.ExitCode()

			return result, nil
		}

		return result, err
	}
	return result, nil
}
