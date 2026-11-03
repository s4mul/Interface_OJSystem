const express = require('express');
const router = express.Router();

// 1. 더미 데이터 (상세 내용 포함)
const dummyProblems = [
  {
    problemId: 1001,
    title: "DFS와 BFS",
    difficulty: "실버 2",
    category: "그래프",
    isSolved: true,
    description: "그래프를 DFS로 탐색한 결과와 BFS로 탐색한 결과를 출력하는 프로그램을 작성하시오.",
    inputDescription: "첫째 줄에 정점의 개수 N, 간선의 개수 M, 탐색을 시작할 정점의 번호 V가 주어진다.",
    outputDescription: "첫째 줄에 DFS를 수행한 결과를, 그 다음 줄에는 BFS를 수행한 결과를 출력한다.",
    timeLimit: "2초",
    memoryLimit: "128MB"
  },
  {
    problemId: 1002,
    title: "연결 요소의 개수",
    difficulty: "실버 2",
    category: "그래프",
    isSolved: false,
    description: "방향 없는 그래프가 주어졌을 때, 연결 요소 (Connected Component)의 개수를 구하는 프로그램을 작성하시오.",
    inputDescription: "첫째 줄에 정점의 개수 N과 간선의 개수 M이 주어진다.",
    outputDescription: "첫째 줄에 연결 요소의 개수를 출력한다.",
    timeLimit: "3초",
    memoryLimit: "512MB"
  }
];

// 2. 문제 목록 조회 (GET /api/problems)
router.get('/', (req, res) => {
  res.json({
    success: true,
    count: dummyProblems.length,
    problems: dummyProblems
  });
});

// 3. 문제 상세 조회 (GET /api/problems/:id)
router.get('/:id', (req, res) => {
  const problemId = parseInt(req.params.id, 10);
  const problem = dummyProblems.find(p => p.problemId === problemId);

  if (!problem) {
    return res.status(404).json({
      success: false,
      message: "해당 문제를 찾을 수 없습니다."
    });
  }

  res.json({
    success: true,
    problem: problem
  });
});

module.exports = router;
