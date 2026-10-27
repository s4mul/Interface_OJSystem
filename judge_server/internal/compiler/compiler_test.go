package compiler

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"judge_server/internal/model"
)

func TestLanguage2Extension(t *testing.T) {
	tests := []struct {
		language string
		expected string
	}{
		{"C", ".c"},
		{"C++", ".cpp"},
		{"Python", ".py"},
		{"Java", ".java"},
	}

	for _, test := range tests {
		extension, err := language2Extension(test.language)

		if err != nil {
			t.Fatalf(
				"language2Extension(%s) returned error: %v",
				test.language,
				err,
			)
		}

		if extension != test.expected {
			t.Errorf(
				"language2Extension(%s): expected %s, got %s",
				test.language,
				test.expected,
				extension,
			)
		}
	}
}

func TestBuildFile(t *testing.T) {
	workDir := t.TempDir()

	source := `#include <stdio.h>

int main() {
	printf("hello");
	return 0;
}
`

	request := model.CompileRequest{
		Language: "C",
		Source:   source,
		WorkDir:  workDir,
	}

	filePath, err := buildFile(request)

	if err != nil {
		t.Fatalf("buildFile() returned error: %v", err)
	}

	expectedPath := filepath.Join(workDir, "main.c")

	if filePath != expectedPath {
		t.Errorf(
			"expected file path %q, got %q",
			expectedPath,
			filePath,
		)
	}

	data, err := os.ReadFile(filePath)

	if err != nil {
		t.Fatalf("failed to read created file: %v", err)
	}

	if string(data) != source {
		t.Errorf(
			"source mismatch\nexpected:\n%s\ngot:\n%s",
			source,
			string(data),
		)
	}
}

func TestBuildJavaFile(t *testing.T) {
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "Java",
		Source: `
public class Main {
	public static void main(String[] args) {
		System.out.println("hello");
	}
}
`,
		WorkDir: workDir,
	}

	filePath, err := buildFile(request)

	if err != nil {
		t.Fatalf("buildFile() returned error: %v", err)
	}

	expectedPath := filepath.Join(workDir, "Main.java")

	if filePath != expectedPath {
		t.Errorf(
			"expected file path %q, got %q",
			expectedPath,
			filePath,
		)
	}
}

func TestCompilePython(t *testing.T) {
	c := New()
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "Python",
		Source:   `print("hello, world!")`,
		WorkDir:  workDir,
	}

	result, err := c.Compile(request)

	if err != nil {
		t.Fatalf("Compile() returned error: %v", err)
	}

	if !result.Success {
		t.Fatal("expected compile success, got failure")
	}

	if result.Command != "python3" {
		t.Errorf(
			"expected command %q, got %q",
			"python3",
			result.Command,
		)
	}

	expectedPath := filepath.Join(workDir, "main.py")

	if len(result.Args) != 1 {
		t.Fatalf(
			"expected 1 argument, got %d",
			len(result.Args),
		)
	}

	if result.Args[0] != expectedPath {
		t.Errorf(
			"expected argument %q, got %q",
			expectedPath,
			result.Args[0],
		)
	}

	if _, err := os.Stat(expectedPath); err != nil {
		t.Fatalf("expected Python source file to exist: %v", err)
	}
}

func TestCompileC(t *testing.T) {
	// 개발 PC에 gcc가 없으면 이 테스트만 건너뜀
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc is not installed")
	}

	c := New()
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "C",
		Source: `
#include <stdio.h>

int main() {
	printf("hello");
	return 0;
}
`,
		WorkDir: workDir,
	}

	result, err := c.Compile(request)

	if err != nil {
		t.Fatalf("Compile() returned error: %v", err)
	}

	if !result.Success {
		t.Fatalf(
			"expected compile success, stderr: %s",
			result.Stderr,
		)
	}

	if result.Command == "" {
		t.Fatal("expected executable command, got empty string")
	}

	if result.WorkDir != workDir {
		t.Errorf(
			"expected WorkDir %q, got %q",
			workDir,
			result.WorkDir,
		)
	}
}

func TestCompileCError(t *testing.T) {
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc is not installed")
	}

	c := New()
	workDir := t.TempDir()

	// 의도적으로 세미콜론 누락
	request := model.CompileRequest{
		Language: "C",
		Source: `
#include <stdio.h>

int main() {
	printf("hello")
	return 0;
}
`,
		WorkDir: workDir,
	}

	result, err := c.Compile(request)

	if err != nil {
		t.Fatalf(
			"compile error should not be system error: %v",
			err,
		)
	}

	if result.Success {
		t.Fatal("expected compile failure, got success")
	}

	if strings.TrimSpace(result.Stderr) == "" {
		t.Fatal("expected compiler stderr, got empty string")
	}
}

func TestCompileUnsupportedLanguage(t *testing.T) {
	c := New()
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "Ruby",
		Source:   `puts "hello"`,
		WorkDir:  workDir,
	}

	result, err := c.Compile(request)

	if err == nil {
		t.Fatal("expected error for unsupported language, got nil")
	}

	if result.Success {
		t.Fatal("expected Success false for unsupported language")
	}
}

func TestCompileCpp(t *testing.T) {
	if _, err := exec.LookPath("g++"); err != nil {
		t.Skip("g++ is not installed")
	}

	c := New()
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "C++",
		Source: `
#include <iostream>

int main() {
	std::cout << "hello";
	return 0;
}
`,
		WorkDir: workDir,
	}

	result, err := c.Compile(request)

	if err != nil {
		t.Fatalf("Compile() returned error: %v", err)
	}

	if !result.Success {
		t.Fatalf(
			"expected compile success, stderr: %s",
			result.Stderr,
		)
	}

	if result.Command == "" {
		t.Fatal("expected executable command, got empty string")
	}

	if result.WorkDir != workDir {
		t.Errorf(
			"expected WorkDir %q, got %q",
			workDir,
			result.WorkDir,
		)
	}
}

func TestCompileJava(t *testing.T) {
	if _, err := exec.LookPath("javac"); err != nil {
		t.Skip("javac is not installed")
	}

	c := New()
	workDir := t.TempDir()

	request := model.CompileRequest{
		Language: "Java",
		Source: `
public class Main {
	public static void main(String[] args) {
		System.out.println("hello");
	}
}
`,
		WorkDir: workDir,
	}

	result, err := c.Compile(request)

	if err != nil {
		t.Fatalf("Compile() returned error: %v", err)
	}

	if !result.Success {
		t.Fatalf(
			"expected compile success, stderr: %s",
			result.Stderr,
		)
	}

	if result.Command != "java" {
		t.Errorf(
			"expected command %q, got %q",
			"java",
			result.Command,
		)
	}

	if len(result.Args) != 1 {
		t.Fatalf(
			"expected 1 argument, got %d",
			len(result.Args),
		)
	}

	if result.Args[0] != "Main" {
		t.Errorf(
			"expected argument %q, got %q",
			"Main",
			result.Args[0],
		)
	}

	if result.WorkDir != workDir {
		t.Errorf(
			"expected WorkDir %q, got %q",
			workDir,
			result.WorkDir,
		)
	}

	classPath := filepath.Join(workDir, "Main.class")

	if _, err := os.Stat(classPath); err != nil {
		t.Fatalf(
			"expected Main.class to exist: %v",
			err,
		)
	}
}
