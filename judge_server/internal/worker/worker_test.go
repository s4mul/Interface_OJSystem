package worker

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"judge_server/internal/model"
)

func TestWorkerRun(t *testing.T) {
	// 테스트 종료 후 기존 작업 디렉터리로 복구한다.
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir("C:/Users/Development/Documents/GitHub/Interface_OJSystem")
	if err != nil {
		t.Fatalf("failed to change working directory: %v", err)
	}

	w := New()

	// Reporter가 전송한 결과를 테스트 코드로 전달하기 위한 채널
	reportCh := make(chan model.ReportPayload, 1)

	// 실제 웹서버 대신 채점 결과를 받아줄 테스트 서버
	server := httptest.NewServer(
		http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("expected POST, got %s", r.Method)
			}

			var result model.ReportPayload

			if err := json.NewDecoder(r.Body).Decode(&result); err != nil {
				t.Errorf("failed to decode report: %v", err)
				rw.WriteHeader(http.StatusBadRequest)
				return
			}

			reportCh <- result

			rw.WriteHeader(http.StatusOK)
		}),
	)
	defer server.Close()

	w.SetReporterURL(server.URL)

	// Run은 Queue에서 계속 대기하는 함수이므로 별도 goroutine에서 실행한다.
	workerErrCh := make(chan error, 1)

	go func() {
		workerErrCh <- w.Run()
	}()

	// Worker에게 전달할 테스트 제출
	job := model.Job{
		SubmissionID: 1,
		ProblemID:    1,
		Language:     "C",
		Source: `
#include <stdio.h>

int main(void) {
	int a, b;
	scanf("%d %d", &a, &b);

	if (a == -1) {
		while (1) {
		}
	} else if (a == 0) {
		a++;
		printf("%d", a / b);
	} else {
		printf("%d", a / b);
	}

	return 0;
}
`,
	}

	// Queue에 Job을 넣는다.
	w.Push(job)

	// Worker가 결과를 Reporter까지 전달했는지 확인한다.
	select {
	case result := <-reportCh:
		if result.SubmissionID != job.SubmissionID {
			t.Errorf(
				"expected SubmissionID %d, got %d",
				job.SubmissionID,
				result.SubmissionID,
			)
		}

		if result.Result == "" {
			t.Error("expected judge result, got empty result")
		}

		t.Logf(
			"submission %d result: %s",
			result.SubmissionID,
			result.Result,
		)

	case err := <-workerErrCh:
		t.Fatalf("Worker.Run() failed: %v", err)

	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for worker result")
	}
}
