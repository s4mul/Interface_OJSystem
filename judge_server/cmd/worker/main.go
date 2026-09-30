package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"judge_server/internal/worker"
)

func main() {
	fmt.Println("OJ Worker starting")

	root := os.Getenv("OJ_ROOT")
	if root == "" {
		log.Fatal("OJ_ROOT is not set")
	}

	backendURL := strings.TrimRight(
		os.Getenv("BACKEND_URL"),
		"/",
	)

	if backendURL == "" {
		log.Fatal("BACKEND_URL is not set")
	}

	reportURL := backendURL + "/api/result"

	w := worker.New(
		root,
		reportURL,
	)

	if err := w.Run(); err != nil {
		log.Fatalf(
			"worker stopped with err: %v",
			err,
		)
	}

	fmt.Println("OJ Worker stopped")
}
