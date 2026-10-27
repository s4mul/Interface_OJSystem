package model

type ReportRequest struct {
	SubmissionID int
	Result       string
}

type ReportPayload struct {
	SubmissionID int    `json:"SubmissionID"`
	Result       string `json:"Result"`
	IsSuccess    bool   `json:"IsSuccess"`
}
