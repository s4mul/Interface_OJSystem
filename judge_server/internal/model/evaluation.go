package model

import "time"

type EvaluateResult struct {
	Result   bool
	Verdict  string
	ExitCode int
}

type EvaluateRequest struct {
	ProblemID int
	SandboxID string
}

type ExecutionConfig struct {
	ContainerID      string
	Command          string
	Args             []string
	WorkDir          string
	TimeLimit        time.Duration
	OutputLimitBytes int64
}
