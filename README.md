# KB라이프 보험 AI Agent

KB라이프 보험 상품 정보를 RAG 기반으로 제공하는 AI 챗봇 서비스입니다.

## 아키텍처

```
브라우저 → Next.js (포트 3000) → API Routes (/api/*) → FastAPI (포트 8000) → Weaviate / Supabase
```

프론트엔드가 자체 API Route를 통해 백엔드로 요청을 중계하므로, 사용자는 `localhost:3000`만 접속하면 됩니다.

## 프로젝트 구조

```
insurance-agent/
├── package.json      # 루트 — npm run dev 로 백엔드+프론트 동시 실행
├── backend/          # FastAPI 서버 + AI 도구
│   ├── api.py                 # API 엔드포인트
│   ├── rag_pipeline.py        # RAG 검색 + Guardrail + LLM 응답
│   ├── insurance_tools.py     # 보험 설계 Agent Tool 함수
│   └── risk_profile_tools.py  # 리스크 프로파일링 도구
├── frontend/         # Next.js 채팅 UI
│   └── app/
│       ├── page.tsx           # 메인 채팅 인터페이스
│       └── api/               # API Routes (→ FastAPI 프록시)
│           ├── chat/route.ts
│           ├── reset/route.ts
│           └── health/route.ts
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

### 2. 의존성 설치

```bash
# Python 백엔드
cd backend && pip install -r requirements.txt && cd ..

# Node.js 프론트엔드 + 루트
npm install
npm run install:all
```

### 3. 실행 (한 번에)

```bash
npm run dev
```

백엔드(포트 8000)와 프론트엔드(포트 3000)가 동시에 실행됩니다.
브라우저에서 `http://localhost:3000` 접속

### 개별 실행 (필요 시)

```bash
npm run dev:backend    # 백엔드만
npm run dev:frontend   # 프론트엔드만
```

## 주요 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/chat`   | POST   | 채팅 질의 (→ FastAPI 프록시) |
| `/api/reset`  | POST   | 대화 초기화 |
| `/api/health` | GET    | 서버 상태 확인 |

## 대용량 데이터

`management_disclosure_*.json` 파일(~56MB)은 Git에 포함되지 않습니다.
팀 공유 드라이브에서 다운로드하여 `data/` 폴더에 넣어주세요.

## 주의사항

- `.env` 파일은 **절대 커밋하지 마세요** (API 키 포함)
- AI 답변은 참고용이며, 정확한 내용은 약관 및 상담사를 통해 확인하세요
