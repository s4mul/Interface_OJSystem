package reporter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"judge_server/internal/model"
)

func TestReporterReport(t *testing.T) {
	var received model.ReportPayload

	server := httptest.NewServer(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Fatalf("expected POST, got %s", r.Method)
			}

			if r.Header.Get("Content-Type") != "application/json" {
				t.Fatalf(
					"expected application/json, got %s",
					r.Header.Get("Content-Type"),
				)
			}

			if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
				t.Fatalf("failed to decode request body: %v", err)
			}

			w.WriteHeader(http.StatusOK)
		}),
	)
	defer server.Close()

	r := New(server.URL)

	err := r.Report(model.ReportRequest{
		SubmissionID: 1,
		Result:       "AC",
	})
	if err != nil {
		t.Fatalf("Report() failed: %v", err)
	}

	if received.SubmissionID != 1 {
		t.Fatalf(
			"expected SubmissionID=1, got %d",
			received.SubmissionID,
		)
	}

	if received.Result != "AC" {
		t.Fatalf(
			"expected Result=AC, got %s",
			received.Result,
		)
	}

	if !received.IsSuccess {
		t.Fatal("expected IsSuccess=true")
	}
}
