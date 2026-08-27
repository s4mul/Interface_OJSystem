package model

type CompileRequest struct {
	Language string
	Source   string
	WorkDir  string
}

type CompileResult struct {
	Success bool
	Command string
	Args    []string
	WorkDir string
	Stderr  string
}
