// 백엔드 조회 API 연결 전 프론트 UI 확인용 임시 데이터입니다.
export const GROUPS = [
  {
    id: 1,
    name: 'admin',
  },
]

export const PROBLEMS = [
  {
    id: 1,
    groupId: 1,
    title: 'A + B',
    status: 'READY',
    description: '두 정수를 입력받아 합을 출력하세요.',
    input: '첫째 줄에 두 정수 A와 B가 주어집니다.',
    output: '첫째 줄에 A와 B의 합을 출력합니다.',
    exampleInput: '1 2',
    exampleOutput: '3',
    timeLimit: '2초',
    memoryLimit: '256MB',
    outputLimit: '1024KB',
  },
]
