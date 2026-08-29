package reporter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"judge_server/internal/model"
)

/*
AC — Accepted
WA — Wrong Answer
CE — Compile Error
RE — Runtime Error
TLE — Time Limit Exceeded
MLE — Memory Limit Exceeded
OLE — Output Limit Exceeded
JE — Judge Erro
*/

type Reporter struct {
	client *http.Client
	url    string
}

func New() *Reporter {
	return &Reporter{
		client: &http.Client{
			Timeout: 3 * time.Second,
		},
	}
}
func (r *Reporter) Report(request model.ReportRequest) error {

	result := model.ReportPayload{
		SubmissionID: request.SubmissionID,
		Result:       request.Result,
		IsSuccess:    request.Result == "AC",
	}

	jsonData, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal report: %w", err)
	}

	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	resp, err := client.Post(
		r.url,
		"application/json",
		bytes.NewBuffer(jsonData),
	)

	if err != nil {
		return fmt.Errorf("failed to send report: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("report failed: status code %d", resp.StatusCode)
	}

	return nil
}

func (r *Reporter) SetURL(url string) {
	r.url = url
}
