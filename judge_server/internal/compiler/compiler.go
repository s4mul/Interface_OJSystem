package compiler

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"judge_server/internal/model"
)

const compilerTimeout = 10 * time.Second

type Compiler struct {
}

func New() *Compiler {
	return &Compiler{}
}

func (c *Compiler) Compile(request model.CompileRequest) (model.CompileResult, error) {
	filePath, err := buildFile(request)
	if err != nil {
		result := model.CompileResult{
			Success: false,
			Command: "",
			Args:    nil,
			WorkDir: "",
			Stderr:  "",
		}

		return result, err
	}

	result := model.CompileResult{
		Success: true,
		Command: "",
		Args:    nil,
		WorkDir: request.WorkDir,
		Stderr:  "",
	}

	// Python은 별도의 컴파일 과정이 없음
	if request.Language == "Python" {
		result.Command = "python3"
		result.Args = []string{filePath}

		return result, nil
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		compilerTimeout,
	)
	defer cancel()

	var cmd *exec.Cmd

	switch request.Language {
	case "C":
		outputPath := filepath.Join(request.WorkDir, "main")

		cmd = exec.CommandContext(
			ctx,
			"gcc",
			filePath,
			"-o",
			outputPath,
		)

		result.Command = outputPath

	case "C++":
		outputPath := filepath.Join(request.WorkDir, "main")

		cmd = exec.CommandContext(
			ctx,
			"g++",
			filePath,
			"-o",
			outputPath,
		)

		result.Command = outputPath

	case "Java":
		cmd = exec.CommandContext(
			ctx,
			"javac",
			filePath,
		)

		result.Command = "java"
		result.Args = []string{"Main"}
	}

	// 컴파일러의 현재 작업 디렉토리
	cmd.Dir = request.WorkDir

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err = cmd.Run()

	result.Stderr = stderr.String()

	// 컴파일 시간 초과
	if ctx.Err() == context.DeadlineExceeded {
		result.Success = false

		return result, fmt.Errorf(
			"compiler timeout: %w",
			ctx.Err(),
		)
	}

	if err != nil {
		var exitErr *exec.ExitError

		// 컴파일러는 실행됐지만 사용자 코드가 컴파일되지 않음
		if errors.As(err, &exitErr) {
			result.Success = false

			return result, nil
		}

		// gcc, g++, javac 자체를 실행하지 못한 경우
		result.Success = false

		return result, fmt.Errorf(
			"failed to run compiler: %w",
			err,
		)
	}

	return result, nil
}

func language2Extension(language string) (string, error) {
	switch language {
	case "C":
		return ".c", nil
	case "C++":
		return ".cpp", nil
	case "Python":
		return ".py", nil
	case "Java":
		return ".java", nil
	}

	return "", fmt.Errorf(
		"지원하지 않는 언어입니다: %s",
		language,
	)
}

func buildFile(request model.CompileRequest) (string, error) {
	extension, err := language2Extension(request.Language)
	if err != nil {
		return "", err
	}

	if request.WorkDir == "" {
		return "", fmt.Errorf("작업 디렉토리가 비어 있습니다")
	}

	var filePath string

	if request.Language == "Java" {
		filePath = filepath.Join(
			request.WorkDir,
			"Main"+extension,
		)
	} else {
		filePath = filepath.Join(
			request.WorkDir,
			"main"+extension,
		)
	}

	err = os.WriteFile(
		filePath,
		[]byte(request.Source),
		0644,
	)
	if err != nil {
		return "", fmt.Errorf(
			"파일 생성에 실패했습니다: %w",
			err,
		)
	}

	return filePath, nil
}
