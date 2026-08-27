package model

import "time"

//result
type ExecutionResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
	TimeOut  bool
	Duration time.Duration
}

type ExecutionRequest struct {
	Command    string
	Args       []string
	WorkingDir string
	Stdin      string
	TimeLimit  time.Duration
}
