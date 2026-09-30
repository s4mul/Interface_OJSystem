package compiler

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"judge_server/internal/model"
)

const compilerTimeout = 10 * time.Second

// Docker 컨테이너 내부 작업 디렉터리
const containerWorkDir = "/work"

type Compiler struct {
}

func New() *Compiler {
	return &Compiler{}
}

// Compile은 제출 소스 파일을 생성하고
// Docker 컨테이너 내부에서 컴파일한다.
func (c *Compiler) Compile(
	request model.CompileRequest,
) (model.CompileResult, error) {

	result := model.CompileResult{
		Success: false,
		Command: "",
		Args:    nil,
		WorkDir: containerWorkDir,
		Stderr:  "",
	}

	if request.ContainerID == "" {
		return result, fmt.Errorf(
			"container ID is empty",
		)
	}

	// 제출 소스 파일을 호스트 작업 디렉터리에 생성한다.
	filePath, err := buildFile(request)
	if err != nil {
		return result, err
	}

	// Docker 내부에서는 호스트 경로가 아니라
	// /work에 마운트된 파일 이름을 사용한다.
	fileName := filepath.Base(filePath)

	ctx, cancel := context.WithTimeout(
		context.Background(),
		compilerTimeout,
	)
	defer cancel()

	var cmd *exec.Cmd

	switch request.Language {

	case "C":
		cmd = exec.CommandContext(
			ctx,
			"docker",
			"exec",
			"-w", containerWorkDir,
			request.ContainerID,
			"gcc",
			fileName,
			"-o",
			"main",
		)

		result.Command = "/work/main"

	case "C++":
		cmd = exec.CommandContext(
			ctx,
			"docker",
			"exec",
			"-w", containerWorkDir,
			request.ContainerID,
			"g++",
			fileName,
			"-o",
			"main",
		)

		result.Command = "/work/main"

	case "Java":
		cmd = exec.CommandContext(
			ctx,
			"docker",
			"exec",
			"-w", containerWorkDir,
			request.ContainerID,
			"javac",
			fileName,
		)

		result.Command = "java"
		result.Args = []string{"Main"}

	case "Python":
		cmd := exec.CommandContext(
			ctx,
			"docker",
			"exec",
			request.ContainerID,
			"python3",
			"-m",
			"py_compile",
			"/work/main.py",
		)

		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		err := cmd.Run()

		if err != nil {
			result.Success = false
			result.Stderr = stderr.String()
			return result, nil
		}

		result.Success = true
		result.Command = "python3"
		result.Args = []string{"main.py"}
		result.WorkDir = "/work"

		return result, nil

	default:
		return result, fmt.Errorf(
			"unsupported language: %s",
			request.Language,
		)
	}

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err = cmd.Run()

	result.Stderr = stderr.String()

	// 컴파일 시간 초과
	if ctx.Err() == context.DeadlineExceeded {
		return result, fmt.Errorf(
			"compiler timeout: %w",
			ctx.Err(),
		)
	}

	if err != nil {
		var exitErr *exec.ExitError

		// 컴파일러가 실행되었지만 컴파일에 실패한 경우
		if errors.As(err, &exitErr) {

			// Docker 자체의 실행 오류는 JE로 처리한다.
			if isDockerError(result.Stderr) {
				return result, fmt.Errorf(
					"docker execution failed: %s",
					result.Stderr,
				)
			}

			// 컴파일러의 일반적인 오류 종료는 CE로 처리한다.
			if exitErr.ExitCode() == 1 {
				return result, nil
			}

			return result, fmt.Errorf(
				"compiler exited unexpectedly (exit %d): %s",
				exitErr.ExitCode(),
				result.Stderr,
			)
		}

		// Docker CLI 자체를 실행하지 못한 경우
		return result, fmt.Errorf(
			"failed to run compiler: %w",
			err,
		)
	}

	result.Success = true

	return result, nil
}

// Docker 자체에서 발생한 오류인지 확인한다.
func isDockerError(stderr string) bool {

	messages := []string{
		"Error response from daemon:",
		"OCI runtime exec failed",
		"Cannot connect to the Docker daemon",
		"No such container:",
		"is not running",
	}

	lowerStderr := strings.ToLower(stderr)

	for _, message := range messages {
		if strings.Contains(
			lowerStderr,
			strings.ToLower(message),
		) {
			return true
		}
	}

	return false
}

// language2Extension은 언어에 따른 파일 확장자를 반환한다.
func language2Extension(language string) (string, error) {

	switch language {

	case "C":
		return ".c", nil

	case "C++":
		return ".cpp", nil

	case "Python", "python":
		return ".py", nil

	case "Java":
		return ".java", nil
	}

	return "", fmt.Errorf(
		"지원하지 않는 언어입니다: %s",
		language,
	)
}

// buildFile은 제출한 소스 코드를
// 호스트의 작업 디렉터리에 저장한다.
func buildFile(
	request model.CompileRequest,
) (string, error) {

	extension, err := language2Extension(
		request.Language,
	)

	if err != nil {
		return "", err
	}

	if request.WorkDir == "" {
		return "", fmt.Errorf(
			"작업 디렉터리가 비어 있습니다",
		)
	}

	var fileName string

	if request.Language == "Java" {
		fileName = "Main" + extension
	} else {
		fileName = "main" + extension
	}

	filePath := filepath.Join(
		request.WorkDir,
		fileName,
	)

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
