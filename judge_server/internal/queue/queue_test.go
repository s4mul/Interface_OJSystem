package queue

import (
	"testing"

	"judge_server/internal/model"
)

func TestTryPushRejectsFullQueue(t *testing.T) {
	q := New(1)

	if !q.TryPush(model.Job{SubmissionID: 1}) {
		t.Fatal("first job should be accepted")
	}

	if q.TryPush(model.Job{SubmissionID: 2}) {
		t.Fatal("full queue should reject the second job")
	}
}
