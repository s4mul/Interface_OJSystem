package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"judge_server/internal/model"
	"judge_server/internal/queue"
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
	q := queue.New(100)
	w := worker.New(
		root,
		reportURL,
		q,
	)
	go func() {
		if err := w.Run(); err != nil {
			log.Fatalf(
				"worker stopped with err: %v",
				err,
			)
		}
	}()
	http.HandleFunc("/api/submissions", func(
		res http.ResponseWriter,
		req *http.Request,
	) {
		if req.Method != http.MethodPost {
			http.Error(
				res,
				"method not allowed",
				http.StatusMethodNotAllowed,
			)
			return
		}

		var job model.Job

		if err := json.NewDecoder(req.Body).Decode(&job); err != nil {
			http.Error(
				res,
				"invalid request body",
				http.StatusBadRequest,
			)
			return
		}

		q.Push(job)

		res.WriteHeader(http.StatusAccepted)
	})

	fmt.Println("Judge server running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
	fmt.Println("OJ Worker stopped")
}
