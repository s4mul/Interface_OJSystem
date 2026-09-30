package sandbox

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"judge_server/internal/model"
)

func TestSandboxLifecycle(t *testing.T) {
	s := New()

	// 테스트 전용 작업 디렉터리
	baseDir := t.TempDir()
	workDir := filepath.Join(baseDir, "sandboxs", "1")

	request := model.SandboxRequest{
		SubmissionID:   1,
		Language:       "C",
		MemoryLimitsMb: 128,
		ProcessLimits:  64,
		WorkDir:        workDir,
	}

	// 1. 샌드박스 생성
	result, err := s.Create(request)
	if err != nil {
		t.Fatalf("Create() failed: %v", err)
	}

	containerID := result.ContainerId
	if containerID == "" {
		t.Fatal("Create() returned empty container ID")
	}

	// 테스트 실패 시에도 컨테이너가 남지 않도록 정리
	cleaned := false

	t.Cleanup(func() {
		if !cleaned {
			_ = s.Cleanup(containerID, workDir)
		}
	})

	// 작업 디렉터리 생성 확인
	if _, err := os.Stat(workDir); err != nil {
		t.Fatalf("work directory was not created: %v", err)
	}

	// 2. 컨테이너 시작
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := s.BuildStartCommand(ctx, containerID)

	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to start sandbox: %v", err)
	}

	// 3. 실행 상태 확인
	state, err := s.Inspect(containerID)
	if err != nil {
		t.Fatalf("Inspect() failed: %v", err)
	}

	if !state.Running {
		t.Fatalf(
			"sandbox is not running: ExitCode=%d OOMKilled=%v Error=%q",
			state.ExitCode,
			state.OOMKilled,
			state.Error,
		)
	}

	// 4. 샌드박스 정리
	if err := s.Cleanup(containerID, workDir); err != nil {
		t.Fatalf("Cleanup() failed: %v", err)
	}

	cleaned = true

	// 중복 Cleanup 방지
	containerID = ""

	// 5. 작업 디렉터리 삭제 확인
	if _, err := os.Stat(workDir); !os.IsNotExist(err) {
		t.Fatalf("work directory still exists after Cleanup()")
	}
}
