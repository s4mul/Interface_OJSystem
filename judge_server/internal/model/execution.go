package model

import "time"

//result
type ExecuteResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
	TimeOut  bool
	Duration time.Duration
}

type ExecuteRequest struct {
	Command    string
	Args       []string
	WorkingDir string
	Stdin      string
	TimeLimit  time.Duration
}
