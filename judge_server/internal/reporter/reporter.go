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
JE — Judge Error
*/

type Reporter struct {
	client *http.Client
	url    string
	token  string
}

func New(url string, token string) *Reporter {
	return &Reporter{
		client: &http.Client{
			Timeout: 3 * time.Second,
		},
		url:   url,
		token: token,
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

	var lastErr error

	for attempt := 1; attempt <= 3; attempt++ {
		if err := r.send(jsonData); err == nil {
			return nil
		} else {
			lastErr = err
		}

		if attempt < 3 {
			time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
		}
	}

	return fmt.Errorf("failed to report after 3 attempts: %w", lastErr)
}

func (r *Reporter) send(jsonData []byte) error {
	req, err := http.NewRequest(
		http.MethodPost,
		r.url,
		bytes.NewReader(jsonData),
	)
	if err != nil {
		return fmt.Errorf("failed to create report request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+r.token)

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send report: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf(
			"report failed: status code %d",
			resp.StatusCode,
		)
	}

	return nil
}
