# KB라이프 보험 AI Agent

KB라이프 보험 상품 정보를 RAG 기반으로 제공하는 AI 챗봇 서비스입니다.

## 프로젝트 구조

```
insurance-agent/
├── backend/          # FastAPI 서버 + AI 도구
│   ├── api.py                 # API 엔드포인트
│   ├── rag_pipeline.py        # RAG 검색 + Guardrail + LLM 응답
│   ├── insurance_tools.py     # 보험 설계 Agent Tool 함수
│   └── risk_profile_tools.py  # 리스크 프로파일링 도구
├── frontend/         # Next.js 채팅 UI
│   └── app/page.tsx           # 메인 채팅 인터페이스
├── data/             # 보험 상품 JSON 데이터
├── prompts/          # AI 시스템 프롬프트
└── static/           # 단독 HTML 데모 UI
```

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 API 키 입력
```

### 2. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 주요 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/chat`   | POST   | 채팅 질의 |
| `/reset`  | POST   | 대화 초기화 |
| `/health` | GET    | 서버 상태 확인 |

## 대용량 데이터

`management_disclosure_*.json` 파일(~56MB)은 Git에 포함되지 않습니다.
팀 공유 드라이브에서 다운로드하여 `data/` 폴더에 넣어주세요.

## 주의사항

- `.env` 파일은 **절대 커밋하지 마세요** (API 키 포함)
- AI 답변은 참고용이며, 정확한 내용은 약관 및 상담사를 통해 확인하세요
