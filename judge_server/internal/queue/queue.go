package queue

import "judge_server/internal/model"

type Queue struct {
	jobs chan model.Job
}

func New(size int) *Queue {
	return &Queue{
		jobs: make(chan model.Job, size),
	}
}

// Push는 Queue에 Job을 추가한다.
// 버퍼가 가득 차면 공간이 생길 때까지 대기한다.
func (q *Queue) Push(job model.Job) {
	q.jobs <- job
}

// Pop은 Queue에서 Job 하나를 가져온다.
// Queue가 비어 있으면 Job이 들어올 때까지 대기한다.
func (q *Queue) Pop() model.Job {
	return <-q.jobs
}

// Len은 현재 대기 중인 Job 개수를 반환한다.
func (q *Queue) Len() int {
	return len(q.jobs)
}

// Close는 더 이상 Job을 받지 않을 때 사용한다.
func (q *Queue) Close() {
	close(q.jobs)
}
