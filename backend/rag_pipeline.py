#!/usr/bin/env python3
"""
C1 RAG 검색 파이프라인 (Weaviate Cloud 버전) + C5 Guardrail
벡터DB: Weaviate Cloud  |  임베딩: gemini-embedding-001 (OpenRouter)
"""

import sys, os, re, json, sqlite3, time
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, AuthenticationError, APIConnectionError
import weaviate
import weaviate.classes as wvc

load_dotenv(Path(__file__).parent.parent / ".env")

WEAVIATE_URL     = os.getenv("WEAVIATE_URL")
WEAVIATE_KEY     = os.getenv("WEAVIATE_API_KEY")
_PROJECT_ROOT    = Path(__file__).parent.parent
BM25_PATH        = str(_PROJECT_ROOT / "data" / "bm25_index.json")
DB_PATH          = str(_PROJECT_ROOT / "data" / "insurance.db")
EMBEDDING_MODEL  = "google/gemini-embedding-001"
OPENAI_MODEL    = "openai/gpt-oss-120b:free"
# ──────────────────────────────────────────
# C5 Guardrail
# ──────────────────────────────────────────
 
HARD_BLOCK_PATTERNS = [
    # 판매/청약 유도 — "가입 방법", "가입 도와줘"는 허용, 직접 시켜달라는 것만 차단
    r"청약\s*(시켜|해드릴|해줘|해주세요)",
    r"가입\s*(시켜|해드릴|해줘|해주세요)",
    r"지금\s*바로\s*(가입|신청)",
    r"계약\s*(체결|해드릴|해줘|해주세요)",
    # 의료 판단
    r"(이\s*병은|이\s*질환은)\s*(보험|해당|적용)",
    r"병원\s*(가세요|가셔야|가야)",
    r"(진단|처방|치료)\s*해\s*(드릴|줄)",
    # 확정적 수익/보장 약속
    r"(무조건|반드시|확실히)\s*(보장|수익|받을\s*수\s*있)",
    r"원금\s*보장",
    # 타사 비방 / 과장 광고
    r"타사\s*(보험|상품).{0,10}(나빠|별로|최악|사기|쓰레기)",
    r"(이\s*보험|이\s*상품)\s*(무조건|반드시)\s*(좋|최고|최선)",
]
 
OUT_OF_SCOPE_KEYWORDS = [
    "주식", "펀드", "코인", "부동산",
    "대출금리", "대출 금리",          # 붙여쓰기/띄어쓰기 둘 다
    "은행", "세금", "법률 상담", "법률상담",
    "의료 진단", "의료진단",
    "투자 추천", "투자추천",
    "타사 비방", "타사비방",
]
 
 
def _normalize_number(s: str) -> str:
    """숫자 표현 정규화 — '3만원' '30,000원' 둘 다 '30000'으로"""
    s = re.sub(r'[원,%\s]', '', s).replace(',', '')
    if '만' in s:
        s = s.replace('만', '')
        try:
            s = str(int(float(s) * 10000))
        except:
            pass
    return s
 
 
class Guardrail:
    def check_input(self, query: str) -> dict:
        for pat in HARD_BLOCK_PATTERNS:
            if re.search(pat, query):
                return {"blocked": True, "reason": "sales_act",
                        "message": "죄송해요, 해당 요청은 직접 도와드리기 어려워요. "
                                   "가입이나 계약은 KB라이프 상담사를 통해 진행해 주세요."}
        for kw in OUT_OF_SCOPE_KEYWORDS:
            if kw in query:
                return {"blocked": True, "reason": "out_of_scope",
                        "message": f"'{kw}' 관련 내용은 제 전문 영역 밖이에요. "
                                   "보험 상품 정보와 보장 내용 안내만 도와드릴 수 있어요."}
        return {"blocked": False}
 
    def check_output(self, response: str, chunks: list) -> dict:
        numbers = re.findall(r'[\d,]+\s*(?:만\s*)?(?:원|%)', response)
        if numbers:
            ctx = " ".join([c.get("document", "") for c in chunks])
            ctx_numbers = set(
                _normalize_number(n)
                for n in re.findall(r'[\d,]+\s*(?:만\s*)?(?:원|%)', ctx)
            )
            ungrounded = [
                n for n in numbers
                if _normalize_number(n) not in ctx_numbers
            ]
            if ungrounded:
                return {"flagged": True, "reason": "hallucination_risk"}
        return {"flagged": False}
 
 
# ──────────────────────────────────────────
# C1 RAG 검색 파이프라인
# ──────────────────────────────────────────
 
class RAGPipeline:
    def _embed(self, texts: list) -> list:
        resp = _get_client().embeddings.create(model=EMBEDDING_MODEL, input=texts)
        return [e.embedding for e in resp.data]

    def __init__(self):
        print("RAG 파이프라인 초기화...")
        self.wv      = weaviate.connect_to_weaviate_cloud(
            cluster_url=WEAVIATE_URL,
            auth_credentials=wvc.init.Auth.api_key(WEAVIATE_KEY),
        )
        self.ins_col  = self.wv.collections.get("InsuranceChunk")
        self.prem_col = self.wv.collections.get("PremiumInfo")
        self.db_conn  = sqlite3.connect(DB_PATH) if Path(DB_PATH).exists() else None
        print("  [OK] Weaviate 연결 완료")

        self.bm25 = None
        self.bm25_index = None
        if Path(BM25_PATH).exists():
            try:
                from rank_bm25 import BM25Okapi
                with open(BM25_PATH, encoding="utf-8") as f:
                    self.bm25_index = json.load(f)
                self.bm25 = BM25Okapi([self._tok(t) for t in self.bm25_index["corpus"]])
                print(f"  [OK] BM25 인덱스 ({len(self.bm25_index['corpus'])}개)")
            except ImportError:
                print("  [!] rank-bm25 없음 -- pip install rank-bm25")

    def _tok(self, text: str) -> list:
        text = re.sub(r"[^\w\s]", " ", text)
        return [t for t in text.split() if len(t) > 1]

    def _hybrid(self, query: str, n: int, chunk_type_filter: str = None) -> list:
        emb = self._embed([query])

        # Weaviate 벡터 검색
        filters = None
        if chunk_type_filter:
            filters = wvc.query.Filter.by_property("chunk_type").equal(chunk_type_filter)

        vr = self.ins_col.query.near_vector(
            near_vector=emb[0],
            limit=n * 2,
            filters=filters,
            return_properties=["content", "insurer", "product", "doc_type",
                               "chunk_type", "source", "product_tag"],
            return_metadata=wvc.query.MetadataQuery(distance=True),
        )
        vec_hits = [
            (obj.properties.get("content", ""), obj.properties, obj.metadata.distance)
            for obj in vr.objects
        ]

        # BM25
        bm25_hits = []
        if self.bm25 and self.bm25_index:
            scores   = self.bm25.get_scores(self._tok(query))
            top_idxs = sorted(range(len(scores)), key=lambda x: -scores[x])[:n * 2]
            bm25_hits = [
                (self.bm25_index["chunk_contents"][i],
                 self.bm25_index["chunk_metas"][i], scores[i])
                for i in top_idxs if scores[i] > 0
            ]

        # RRF 합산
        k, rrf = 60, {}
        for rank, (doc, meta, _) in enumerate(vec_hits):
            key = doc[:80]
            rrf.setdefault(key, {"doc": doc, "meta": meta, "score": 0})
            rrf[key]["score"] += 1 / (k + rank + 1)
        for rank, (doc, meta, _) in enumerate(bm25_hits):
            key = doc[:80]
            rrf.setdefault(key, {"doc": doc, "meta": meta, "score": 0})
            rrf[key]["score"] += 1 / (k + rank + 1)

        # 노이즈 필터링
        noise_kw = ["(사업방법서 별지)", "보험종목의 명칭", "가입나이", "계약형태"]
        results = []
        for r in sorted(rrf.values(), key=lambda x: -x["score"]):
            is_noise = any(kw in r["doc"] for kw in noise_kw)
            if is_noise and not any(k in r["doc"] for k in ["15일", "30일", "철회할 수"]):
                continue
            results.append(r)

        return results[:n]

    def search(self, query: str, user_profile: dict = None, n_results: int = 5) -> dict:
        emb = self._embed([query])

        # 약관·보장 — 하이브리드
        chunks = [
            {"document": r["doc"], "meta": r["meta"],
             "distance": r["score"], "type": "coverage"}
            for r in self._hybrid(query, n_results)
        ]

        # 보험료 — Weaviate 벡터
        premium_chunks = []
        if any(kw in query for kw in ["보험료", "얼마", "가격", "월납", "납입"]):
            filters = None
            if user_profile and user_profile.get("gender"):
                filters = wvc.query.Filter.by_property("gender").equal(user_profile["gender"])
            pr = self.prem_col.query.near_vector(
                near_vector=emb[0],
                limit=3,
                filters=filters,
                return_properties=["prem_id", "product", "product_tag",
                                   "product_category", "age", "gender",
                                   "total_premium", "summary"],
                return_metadata=wvc.query.MetadataQuery(distance=True),
            )
            premium_chunks = [
                {"document": obj.properties.get("summary", ""),
                 "meta": obj.properties,
                 "distance": obj.metadata.distance,
                 "type": "premium"}
                for obj in pr.objects
            ]

        # 법률 조문 — chunk_type 필터
        law_chunks = []
        if any(kw in query for kw in ["고지", "청약철회", "설명의무", "취소", "해지"]):
            law_hits = self._hybrid(query, 2, chunk_type_filter="law_article")
            law_chunks = [
                {"document": r["doc"], "meta": r["meta"], "distance": r["score"]}
                for r in law_hits
            ]

        return {"coverage_chunks": chunks, "premium_chunks": premium_chunks,
                "law_chunks": law_chunks, "query": query}
 
    def build_context(self, sr: dict) -> str:
        MIN_CONTENT_LEN = 100  # 이 미만이면 실질 내용 없는 것으로 간주해 제외
        parts = []
        coverage = [c for c in sr["coverage_chunks"] if len(c["document"].strip()) >= MIN_CONTENT_LEN]
        if coverage:
            parts.append("## 관련 약관·보장 내용")
            for i, c in enumerate(coverage):
                m = c["meta"]
                parts.append(
                    f"[{i+1}] {m.get('insurer','')} - {m.get('product','')[:30]}"
                    f" ({m.get('doc_type','')})\n{c['document'][:500]}"
                )
        premium = [c for c in sr["premium_chunks"] if len(c["document"].strip()) >= MIN_CONTENT_LEN]
        if premium:
            parts.append("\n## 보험료 정보")
            for c in premium:
                parts.append(f"- {c['meta'].get('product','')[:30]} | {c['document'][:200]}")
        if sr["law_chunks"]:
            parts.append("\n## 관련 법률 조문")
            for c in sr["law_chunks"]:
                m = c["meta"]
                parts.append(f"[{m.get('law','')} {m.get('category','')}]\n{c['document'][:400]}")
        return "\n\n".join(parts)
 
    def get_premium_table(self, product: str, age: int, gender: str) -> str:
        from supabase import create_client
        sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        res = (sb.table("premium_table")
               .select("age,gender,plan_name,insurance_term,payment_term,payment_method,total_premium")
               .ilike("product", f"%{product}%")
               .eq("age", age)
               .eq("gender", gender)
               .order("total_premium")
               .limit(5)
               .execute())
        rows = res.data
        if not rows:
            return ""
        lines = [f"{product} {age}세 {gender} 보험료"]
        for r in rows:
            if r["total_premium"]:
                plan = f" [{r['plan_name']}형]" if r.get("plan_name") else ""
                lines.append(
                    f"  보험기간 {r['insurance_term']}년 / 납입 {r['payment_term']}년"
                    f" / {r['payment_method']}{plan} → 월 {r['total_premium']:,}원")
        return "\n".join(lines)
 
 
# ──────────────────────────────────────────
# LLM 응답 생성
# ──────────────────────────────────────────
 
SYSTEM_PROMPT = """당신은 KB라이프 보험 AI 어시스턴트입니다.
 
역할: 보험 상품 정보 제공, 보장 내용 설명, 상품 비교, 시뮬레이션
 
절대 금지:
- 청약 권유, 계약 체결 유도, 판매 행위
- 의료적 진단이나 치료 판단
- DB에 없는 수치를 만들어서 답변
- 범위 밖 주제 (주식, 투자, 타사 비방 등)
- 한자(漢字) 사용 — 반드시 순한글 또는 한글+영문으로만 표기할 것 (예: 契約 → 계약, 請約 → 청약)
- [1], [2] 같은 인용 번호 또는 각주 번호 사용 — 출처 표기 없이 내용만 서술할 것
- <br>, <b>, <p> 등 HTML 태그 사용 — 줄바꿈은 빈 줄로, 강조는 **굵게** 마크다운으로만 표현할 것
- 데이터가 부족한 상품은 표나 목록에서 생략 — 상품명만 있고 보장 내용이 없으면 언급하지 말 것

답변 원칙:
1. 제공된 컨텍스트(약관·공시 데이터)에만 근거
2. "(사업방법서 별지)" 내용이나 상품 명칭만 나열된 데이터는 무시하고, 실제 보장 내용이나 절차가 적힌 데이터를 우선할 것.
3. 특히 '청약철회' 질문 시, 단순 상품 목록이 아닌 '철회 가능 기간(15일, 30일 등)'과 '방법'이 명시된 정보를 바탕으로 답변할 것.
4. 근거 없는 수치는 절대 언급 금지
5. 불확실하면 "약관을 확인하세요" 안내
6. 고지의무·청약철회 규제 안내 자연스럽게 포함
7. 따뜻하고 친근한 톤, 쉬운 설명
"""
 
 
_openrouter_client = None

def _get_client() -> OpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        _openrouter_client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "Insurance RAG Agent"
            }
        )
    return _openrouter_client


def generate_response(query: str, context: str, history: list, user_profile: dict = None) -> str:
    client = _get_client()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history[-6:])

    user_msg = (f"유저 질문: {query}\n\n--- 참고 데이터 ---\n{context}\n---\n\n"
                "위 데이터에 근거해서 답변해주세요.")
    if user_profile:
        user_msg = f"[유저: {json.dumps(user_profile, ensure_ascii=False)}]\n\n" + user_msg

    messages.append({"role": "user", "content": user_msg})

    for attempt in range(3):  # 최대 3번 재시도
        try:
            resp = client.chat.completions.create(
                model=OPENAI_MODEL, messages=messages, temperature=0.3, max_tokens=1000
            )
            return resp.choices[0].message.content
        except RateLimitError:
            if attempt < 2:
                wait = 25 * (attempt + 1)  # 25초, 50초
                print(f"  Rate limit — {wait}초 후 재시도... ({attempt+1}/3)")
                time.sleep(wait)
            else:
                return "죄송해요, 현재 서버가 혼잡해요. 잠시 후 다시 시도해주세요."
        except AuthenticationError:
            return "죄송해요, API 인증 오류가 발생했어요. OPENROUTER_API_KEY를 확인해주세요."
        except APIConnectionError:
            if attempt < 2:
                print(f"  연결 오류 — 5초 후 재시도... ({attempt+1}/3)")
                time.sleep(5)
            else:
                return "죄송해요, 서버 연결에 실패했어요. 네트워크를 확인해주세요."
        except Exception as e:
            return f"죄송해요, 예상치 못한 오류가 발생했어요: {type(e).__name__}"
 
# ──────────────────────────────────────────
# 통합 Agent (외부에서 import해서 사용)
# ──────────────────────────────────────────
 
class InsuranceRAGAgent:
    """C1 + C5 통합 — 외부에서 chat() 하나만 호출"""
 
    def __init__(self):
        self.rag       = RAGPipeline()
        self.guardrail = Guardrail()
        self.history   = []
 
    @staticmethod
    def _clean_response(text: str) -> str:
        # 한자(CJK Unified Ideographs) 제거 — 한글은 유지
        text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+', '', text)
        # 특수 괄호 및 일반 괄호로 된 인용 번호 제거 (예: [4], 【4】, 〔4〕 등)
        text = re.sub(r'[【〔\[❲⟦]\s*\d+\s*[】〕\]❳⟧]', '', text)
        # HTML 태그 제거 (<br> → 줄바꿈, 나머지 태그 제거)
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        return text

    def chat(self, query: str, user_profile: dict = None) -> dict:
        chk = self.guardrail.check_input(query)
        if chk["blocked"]:
            return {"response": chk["message"], "blocked": True,
                    "block_reason": chk["reason"], "sources": [], "grounded": False}
 
        sr      = self.rag.search(query, user_profile)
        context = self.rag.build_context(sr)
 
        if user_profile and any(kw in query for kw in ["얼마", "보험료"]):
            age, gender = user_profile.get("age"), user_profile.get("gender")
            if age and gender:
                for prod in ["e건강보험", "착한암보험", "하이파이브연금"]:
                    tbl = self.rag.get_premium_table(prod, age, gender)
                    if tbl:
                        context += f"\n\n## 정확한 보험료\n{tbl}"
 
        all_chunks = sr["coverage_chunks"] + sr["premium_chunks"] + sr["law_chunks"]
        response   = self._clean_response(generate_response(query, context, self.history, user_profile))
 
        out_chk = self.guardrail.check_output(response, all_chunks)
        if out_chk["flagged"]:
            response += "\n\n정확한 수치는 공식 홈페이지나 상담사를 통해 확인하세요."
 
        self.history.append({"role": "user",      "content": query})
        self.history.append({"role": "assistant",  "content": response})
 
        def _decode(s):
            return re.sub(r'#U([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)

        sources = list(set(
            f"{_decode(c['meta'].get('insurer',''))} - {_decode(c['meta'].get('product',''))[:25]}"
            for c in sr["coverage_chunks"] if c["meta"].get("product")
        ))
 
        return {"response": response, "blocked": False, "block_reason": None,
                "sources": sources, "grounded": bool(all_chunks),
                "flagged": out_chk["flagged"]}
 
    def reset(self):
        self.history = []

    def close(self):
        self.rag.wv.close()
        if self.rag.db_conn:
            self.rag.db_conn.close()
 
 
# ──────────────────────────────────────────
# 테스트
# ──────────────────────────────────────────
if __name__ == "__main__":
    agent = InsuranceRAGAgent()
    user_profile = {"age": 35, "gender": "남", "job": "직장인"}
 
    tests = [
        "암 진단받으면 보험금 얼마 받아요?",
        "35세 남자 e건강보험 월 보험료 얼마예요?",
        "면책 사항이 뭐예요?",
        "청약 취소는 언제까지 할 수 있나요?",
        "지금 바로 가입해 주세요",
        "주식 투자 추천해줘",
    ]
 
    print("\n" + "=" * 55)
    print("  하이브리드 RAG + Guardrail 테스트")
    print("=" * 55)
 
    try:
        for q in tests:
            print(f"\n[유저] {q}")
            r = agent.chat(q, user_profile)
            if r["blocked"]:
                print(f"[차단-{r['block_reason']}] {r['response']}")
            else:
                print(f"[Agent] {r['response'][:300]}")
                if r.get("flagged"):
                    print("[경고] 환각 위험 수치 감지 — 공식 확인 필요")
                if r["sources"]:
                    print(f"[출처] {', '.join(r['sources'][:2])}")
            print("-" * 40)
    finally:
        agent.close()