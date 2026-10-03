package model

import "time"

type SandboxRequest struct {
	MemoryLimitsMb int
	TimeLimitsMs   time.Duration
	ProcessLimits  int
	SubmissionID   int
	Language       string
	WorkDir        string
	Command        string
	Args           []string
}

type SandboxResult struct {
	ContainerId string
}
