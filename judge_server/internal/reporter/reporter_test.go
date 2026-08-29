package reporter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"judge_server/internal/model"
)

func TestReport(t *testing.T, url string) {
	var received model.ReportPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf(
				"expected Content-Type application/json, got %s",
				r.Header.Get("Content-Type"),
			)
		}

		err := json.NewDecoder(r.Body).Decode(&received)
		if err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	r := New()
	r.url = server.URL

	request := model.ReportRequest{
		SubmissionID: 1,
		Result:       "AC",
	}

	err := r.Report(request)
	if err != nil {
		t.Fatalf("Report() failed: %v", err)
	}

	if received.SubmissionID != 1 {
		t.Errorf(
			"expected SubmissionID 1, got %d",
			received.SubmissionID,
		)
	}

	if received.Result != "AC" {
		t.Errorf(
			"expected Result AC, got %s",
			received.Result,
		)
	}

	if !received.IsSuccess {
		t.Errorf(
			"expected IsSuccess true, got false",
		)
	}
}
func TestReportServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	r := New()
	r.url = server.URL

	request := model.ReportRequest{
		SubmissionID: 1,
		Result:       "WA",
	}

	err := r.Report(request)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
