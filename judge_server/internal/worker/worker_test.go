package worker

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"testing"

	"judge_server/internal/model"
)

// findProjectRoot는 현재 디렉터리에서 상위로 올라가며
// Interface_OJSystem 프로젝트 루트를 찾는다.
//
// Worker의 root가 "."이므로 테스트 실행 시 프로젝트 루트로
// 작업 디렉터리를 변경하기 위해 사용한다.
func findProjectRoot(t *testing.T) string {
	t.Helper()

	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}

	for {
		problemDir := filepath.Join(
			dir,
			"data",
			"problems",
		)

		judgeDir := filepath.Join(
			dir,
			"judge_server",
		)

		if _, err := os.Stat(problemDir); err == nil {
			if _, err := os.Stat(judgeDir); err == nil {
				return dir
			}
		}

		parent := filepath.Dir(dir)

		if parent == dir {
			t.Fatal("failed to find project root")
		}

		dir = parent
	}
}

// requireDocker는 통합 테스트를 실행하기 전에
// Docker daemon을 사용할 수 있는지 확인한다.
func requireDocker(t *testing.T) {
	t.Helper()

	cmd := exec.Command(
		"docker",
		"info",
	)

	output, err := cmd.CombinedOutput()

	if err != nil {
		t.Fatalf(
			"Docker is not available: %v\n%s",
			err,
			string(output),
		)
	}
}

// setupWorkerTest는 Worker 테스트에 필요한 공통 환경을 구성한다.
//
// Worker는 root="."을 기준으로 data/problems를 찾으므로
// 프로젝트 루트로 작업 디렉터리를 이동한다.
func setupWorkerTest(t *testing.T) string {
	t.Helper()

	requireDocker(t)

	projectRoot := findProjectRoot(t)

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf(
			"failed to get working directory: %v",
			err,
		)
	}

	if err := os.Chdir(projectRoot); err != nil {
		t.Fatalf(
			"failed to change directory to project root: %v",
			err,
		)
	}

	t.Cleanup(func() {
		_ = os.Chdir(originalDir)
	})

	return projectRoot
}

// cleanupSubmissionDirectory는 테스트 후 생성된
// 호스트의 sandboxes/<submissionID> 디렉터리를 제거한다.
func cleanupSubmissionDirectory(
	t *testing.T,
	projectRoot string,
	submissionID int,
) {
	t.Helper()

	sandboxDir := filepath.Join(
		projectRoot,
		"sandboxes",
		strconv.Itoa(submissionID),
	)

	// 이전 테스트 흔적 제거.
	_ = os.RemoveAll(sandboxDir)

	t.Cleanup(func() {
		_ = os.RemoveAll(sandboxDir)
	})
}

// TestWorkerProcess는 C 제출을 사용하여
// Worker가 지원하는 주요 Verdict를 통합 테스트한다.
//
// 문제 1 기준:
//
//	input  : 1 1 / 2 1 / 0 1
//	output : 1   / 2   / 1
func TestWorkerProcess(t *testing.T) {
	projectRoot := setupWorkerTest(t)

	tests := []struct {
		name            string
		submissionID    int
		source          string
		expectedVerdict string
	}{
		{
			name:         "AC",
			submissionID: 1001,
			source: `
#include <stdio.h>

int main(void) {
	int a, b;

	if (scanf("%d %d", &a, &b) != 2) {
		return 1;
	}

	if (a == 0) {
		printf("1");
	} else {
		printf("%d", a / b);
	}

	return 0;
}
`,
			expectedVerdict: "AC",
		},

		{
			name:         "WA",
			submissionID: 1002,
			source: `
#include <stdio.h>

int main(void) {
	printf("999");
	return 0;
}
`,
			expectedVerdict: "WA",
		},

		{
			name:         "CE",
			submissionID: 1003,
			source: `
#include <stdio.h>

int main(void) {
	printf("compile error")
	return 0;
}
`,
			expectedVerdict: "CE",
		},

		{
			name:         "RE",
			submissionID: 1004,
			source: `
int main(void) {
	return 1;
}
`,
			expectedVerdict: "RE",
		},

		{
			name:         "TLE",
			submissionID: 1005,
			source: `
int main(void) {
	while (1) {
	}

	return 0;
}
`,
			expectedVerdict: "TLE",
		},

		{
			name:         "MLE",
			submissionID: 1006,
			source: `
#include <stdlib.h>
#include <stddef.h>

int main(void) {
	size_t size = 512ULL * 1024 * 1024;

	char *p = (char *)malloc(size);

	if (p == NULL) {
		return 1;
	}

	for (size_t i = 0; i < size; i += 4096) {
		p[i] = 1;
	}

	return 0;
}
`,
			expectedVerdict: "MLE",
		},

		{
			name:         "OLE",
			submissionID: 1007,
			source: `
#include <stdio.h>
#include <string.h>

int main(void) {
	char buffer[4096];

	memset(
		buffer,
		'A',
		sizeof(buffer)
	);

	while (1) {
		fwrite(
			buffer,
			1,
			sizeof(buffer),
			stdout
		);
	}

	return 0;
}
`,
			expectedVerdict: "OLE",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cleanupSubmissionDirectory(
				t,
				projectRoot,
				tc.submissionID,
			)

			w := New()

			job := model.Job{
				SubmissionID: tc.submissionID,
				ProblemID:    1,
				Language:     "C",
				Source:       tc.source,
			}

			verdict, err := w.process(job)

			if err != nil {
				t.Fatalf(
					"process failed: %v",
					err,
				)
			}

			if verdict != tc.expectedVerdict {
				t.Fatalf(
					"expected verdict %s, got %s",
					tc.expectedVerdict,
					verdict,
				)
			}

			t.Logf(
				"submission %d: %s",
				tc.submissionID,
				verdict,
			)
		})
	}
}

// TestWorkerLanguages는 지원 언어별로 Sandbox 생성부터
// Compile/Execute/Evaluate까지 정상 연결되는지 확인한다.
//
// C의 상세 Verdict는 TestWorkerProcess에서 검증하므로
// 여기서는 각 언어의 고유 실행 경로를 중점적으로 확인한다.
func TestWorkerLanguages(t *testing.T) {
	projectRoot := setupWorkerTest(t)

	tests := []struct {
		name            string
		submissionID    int
		language        string
		source          string
		expectedVerdict string
	}{
		// --------------------
		// C
		// --------------------
		{
			name:         "C_AC",
			submissionID: 1101,
			language:     "C",
			source: `
#include <stdio.h>

int main(void) {
	int a, b;

	scanf("%d %d", &a, &b);

	if (a == 0) {
		printf("1");
	} else {
		printf("%d", a / b);
	}

	return 0;
}
`,
			expectedVerdict: "AC",
		},

		// --------------------
		// C++
		// --------------------
		{
			name:         "CPP_AC",
			submissionID: 1201,
			language:     "C++",
			source: `
#include <iostream>

int main() {
	int a, b;

	std::cin >> a >> b;

	if (a == 0) {
		std::cout << 1;
	} else {
		std::cout << a / b;
	}

	return 0;
}
`,
			expectedVerdict: "AC",
		},

		{
			name:         "CPP_CE",
			submissionID: 1202,
			language:     "C++",
			source: `
#include <iostream>

int main() {
	std::cout << "compile error"
	return 0;
}
`,
			expectedVerdict: "CE",
		},

		{
			name:         "CPP_RE",
			submissionID: 1203,
			language:     "C++",
			source: `
int main() {
	return 1;
}
`,
			expectedVerdict: "RE",
		},

		// --------------------
		// Java
		// --------------------
		{
			name:         "Java_AC",
			submissionID: 1301,
			language:     "Java",
			source: `
import java.util.Scanner;

public class Main {
	public static void main(String[] args) {
		Scanner sc = new Scanner(System.in);

		int a = sc.nextInt();
		int b = sc.nextInt();

		if (a == 0) {
			System.out.print(1);
		} else {
			System.out.print(a / b);
		}
	}
}
`,
			expectedVerdict: "AC",
		},

		{
			name:         "Java_CE",
			submissionID: 1302,
			language:     "Java",
			source: `
public class Main {
	public static void main(String[] args) {
		System.out.println("compile error")
	}
}
`,
			expectedVerdict: "CE",
		},

		{
			name:         "Java_RE",
			submissionID: 1303,
			language:     "Java",
			source: `
public class Main {
	public static void main(String[] args) {
		throw new RuntimeException("test");
	}
}
`,
			expectedVerdict: "RE",
		},

		// --------------------
		// Python
		// --------------------
		{
			name:         "Python_AC",
			submissionID: 1401,
			language:     "Python",
			source: `
a, b = map(int, input().split())

if a == 0:
    print(1)
else:
    print(a // b)
`,
			expectedVerdict: "AC",
		},

		{
			name:         "Python_RE",
			submissionID: 1402,
			language:     "Python",
			source: `
raise RuntimeError("test")
`,
			expectedVerdict: "CE",
		},

		{
			name:         "Python_SyntaxError",
			submissionID: 1403,
			language:     "Python",
			source: `
print(
`,
			expectedVerdict: "RE",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cleanupSubmissionDirectory(
				t,
				projectRoot,
				tc.submissionID,
			)

			w := New()

			job := model.Job{
				SubmissionID: tc.submissionID,
				ProblemID:    1,
				Language:     tc.language,
				Source:       tc.source,
			}

			verdict, err := w.process(job)

			if err != nil {
				t.Fatalf(
					"process failed: %v",
					err,
				)
			}

			if verdict != tc.expectedVerdict {
				t.Fatalf(
					"language=%s expected verdict %s, got %s",
					tc.language,
					tc.expectedVerdict,
					verdict,
				)
			}

			t.Logf(
				"%s submission %d: %s",
				tc.language,
				tc.submissionID,
				verdict,
			)
		})
	}
}
