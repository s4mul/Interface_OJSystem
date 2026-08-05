package main

import(
	"fmt"
	"log"

	"judge_server/internal/worker"
)

func main(){

	fmt.Println("OJ Worker starting")

	w := worker.New()

	if err := w.Run(); err != nil {
		log.Fatalf("worker stopped with err: %v", err)
	}

	fmt.Println("OJ Worker stopped")
}