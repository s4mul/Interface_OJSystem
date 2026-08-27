package evaluator

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"judge_server/internal/model"
)

const problemDir string = "data/problems"

type Evaluator struct {
}

func New() *Evaluator {
	return &Evaluator{}
}

func (e *Evaluator) Evaluate(request model.EvaluateRequest) (model.EvaluateResult, error) {

	outputPath := filepath.Join(problemDir, strconv.Itoa(request.ProblemID), "output", strconv.Itoa(request.TestCaseID))
	expectedOutput, err := os.ReadFile(outputPath)

	if err != nil {
		return model.EvaluateResult{}, fmt.Errorf("채점중 오류가 발생했습니다. %w", err)
	}

	actualOutput := normalizeOutput(request.ActualOutput)
	expectedOutput = normalizeOutput(string(expectedOutput))
	result := model.EvaluateResult{
		Result: bytes.Equal(actualOutput, expectedOutput),
	}

	return result, nil
}

/*
\r\n        → \n으로 변경
줄 끝 공백  → 제거
줄 끝 탭    → 제거
마지막 개행 → 제거

줄 앞 공백  → 유지
중간 공백   → 유지
중간 개행   → 유지
*/
func normalizeOutput(output string) []byte {
	// string은 직접 수정할 수 없으므로 []byte로 변환한다.
	// 이후 write 인덱스를 이용해 같은 배열 안에서 내용을 덮어쓰며 정규화한다.
	data := []byte(output)
	write := 0

	for read := 0; read < len(data); read++ {
		// Windows 줄바꿈 CRLF(\r\n)를 Unix 형식 LF(\n)로 통일한다.
		// \r만 건너뛰고 다음 \n은 아래에서 그대로 기록한다.
		if data[read] == '\r' &&
			read+1 < len(data) &&
			data[read+1] == '\n' {
			continue
		}

		// 줄바꿈을 만나면 현재 줄 끝에 붙어 있는
		// 의미 없는 공백과 탭을 제거한다.
		if data[read] == '\n' {
			for write > 0 &&
				(data[write-1] == ' ' || data[write-1] == '\t') {
				write--
			}
		}

		// 정규화된 문자를 배열 앞쪽부터 덮어쓴다.
		data[write] = data[read]
		write++
	}

	// 마지막 줄은 뒤에 \n이 없을 수도 있으므로
	// 남아 있는 오른쪽 공백과 탭을 별도로 제거한다.
	for write > 0 &&
		(data[write-1] == ' ' || data[write-1] == '\t') {
		write--
	}

	// 출력 마지막에 붙은 개행은 정답 비교에서 무시한다.
	for write > 0 && data[write-1] == '\n' {
		write--
	}

	// 실제 정규화된 영역까지만 반환한다.
	return data[:write]
}
