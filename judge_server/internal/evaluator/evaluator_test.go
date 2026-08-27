package evaluator

import (
	"bytes"
	"judge_server/internal/model"
	"os"
	"testing"
)

func TestNormalizeOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []byte
	}{
		{
			name:     "일반 출력",
			input:    "hello\nworld",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "마지막 개행 제거",
			input:    "hello\nworld\n",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "여러 마지막 개행 제거",
			input:    "hello\nworld\n\n\n",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "줄 끝 공백 제거",
			input:    "hello   \nworld   ",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "줄 끝 탭 제거",
			input:    "hello\t\t\nworld\t",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "앞 공백 유지",
			input:    "   *\n  ***\n *****",
			expected: []byte("   *\n  ***\n *****"),
		},
		{
			name:     "중간 공백 유지",
			input:    "hello   world",
			expected: []byte("hello   world"),
		},
		{
			name:     "CRLF 변환",
			input:    "hello\r\nworld\r\n",
			expected: []byte("hello\nworld"),
		},
		{
			name:     "공백 탭 혼합",
			input:    "hello \t \t\nworld\t  \n",
			expected: []byte("hello\nworld"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeOutput(tt.input)

			if !bytes.Equal(result, tt.expected) {
				t.Errorf(
					"normalizeOutput() = %q, expected %q",
					result,
					tt.expected,
				)
			}
		})
	}
}

func TestEvaluate(t *testing.T) {
	err := os.Chdir("../../..")
	if err != nil {
		t.Fatalf("failed to change working directory: %v", err)
	}

	e := New()

	request := model.EvaluateRequest{
		ProblemID:    1,
		TestCaseID:   1,
		ActualOutput: "hello\nworld\n",
	}

	result, err := e.Evaluate(request)
	if err != nil {
		t.Fatalf("Evaluate() returned error: %v", err)
	}

	if !result.Result {
		t.Fatalf("expected correct answer: %s, got wrong answer", request.ActualOutput)

	}
}
