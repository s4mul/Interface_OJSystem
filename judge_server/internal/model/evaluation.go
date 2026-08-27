package model

type EvaluateResult struct {
	Result bool
}

type EvaluateRequest struct {
	ProblemID    int
	TestCaseID   int
	ActualOutput string
}
