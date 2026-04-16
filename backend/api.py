#!/usr/bin/env python3
"""
보험 AI — FastAPI 백엔드
"""
import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from rag_pipeline import InsuranceRAGAgent  # load_dotenv 가 이 시점에 실행됨

# ─── 필수 환경변수 검증 ───────────────────────────────
# Render/Railway/Vercel 등 배포 환경에서 env 누락 시
# 쿼리 실패로 원인을 추정하는 대신, 부팅 단계에서 즉시 명확히 실패.
_REQUIRED_ENV = [
    "OPENROUTER_API_KEY",
    "WEAVIATE_URL",
    "WEAVIATE_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
]
_missing = [k for k in _REQUIRED_ENV if not os.getenv(k)]
if _missing:
    raise RuntimeError(
        f"❌ 필수 환경변수 누락: {_missing}. "
        f"배포 플랫폼의 Environment 설정에서 위 값들을 추가하세요."
    )

app = FastAPI(title="보험 AI API")

# CORS_ORIGINS 미설정 시 전체 허용(로컬 개발용),
# 배포 시 "https://foo.vercel.app,https://bar.com" 형태로 지정.
_cors_env = os.getenv("CORS_ORIGINS", "").strip()
_allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = InsuranceRAGAgent()

# ─── /chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str
    user_profile: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    blocked: bool
    block_reason: Optional[str]
    sources: list[str]
    flagged: bool
    grounded: bool

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    result = agent.chat(req.query, req.user_profile)
    return ChatResponse(
        response=result["response"],
        blocked=result["blocked"],
        block_reason=result.get("block_reason"),
        sources=result.get("sources", []),
        flagged=result.get("flagged", False),
        grounded=result.get("grounded", False),
    )

# ─── /plan ────────────────────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    gender:          str            # 'male' | 'female'
    birth_year:      Optional[str]  = None
    height:          Optional[str]  = None
    weight:          Optional[str]  = None
    smoking:         Optional[str]  = None   # 'none' | 'past' | 'current'
    smoking_freq:    Optional[str]  = None
    drinking:        Optional[str]  = None   # 'none' | 'light' | 'moderate' | 'heavy'
    past_conditions: Optional[List[str]] = []
    current_meds:    Optional[str]  = None
    family_history:  Optional[List[str]] = []
    occupation:      Optional[str]  = None
    current_insurance: Optional[str] = None
    purpose:         Optional[List[str]] = []
    knowledge_level: Optional[str]  = None
    monthly_budget:  Optional[str]  = None
    coverage_vs_cost: Optional[str] = None
    refund_pref:     Optional[str]  = None
    payment_period:  Optional[str]  = None
    coverage_period: Optional[str]  = None
    renewal_pref:    Optional[str]  = None
    preferred_types: Optional[List[str]] = []
    urgency:         Optional[str]  = None
    priorities:      Optional[List[str]] = []


def _parse_amount_to_man(amount_str: str) -> int:
    """'3,000만원' 또는 '2년이상 3,000만원' → 3000 (만원 단위)"""
    if not amount_str:
        return 0
    m = re.search(r'([\d,]+)\s*만원', str(amount_str))
    if m:
        return int(m.group(1).replace(',', ''))
    return 0


def _format_products(plan_result: dict, gender: str, fit_result: dict | None = None) -> list:
    """generate_plan() 결과 → 프론트엔드 PlanProduct[] 형식으로 변환"""
    from insurance_tools import ALL_PRODUCTS

    gender_key = "premium_male" if gender == "남자" else "premium_female"

    # product_name → product 빠른 조회 맵
    product_map = {p["product_name"]: p for p in ALL_PRODUCTS}

    # fit_result의 top5_overall에서 item_scores 추출
    item_scores_map: dict = {}
    if fit_result:
        for entry in fit_result.get("top5_overall", []):
            name = entry.get("product_name", "")
            if name and "item_scores" in entry:
                item_scores_map[name] = entry["item_scores"]
        # by_category도 커버
        for cat_items in fit_result.get("top5_by_category", {}).values():
            for entry in cat_items:
                name = entry.get("product_name", "")
                if name and "item_scores" in entry:
                    item_scores_map[name] = entry["item_scores"]

    grade_map = {"높음": "high", "보통": "medium", "낮음": "low", "미달": "miss"}

    result = []
    for item in plan_result.get("overall_ranking", []):
        raw = product_map.get(item["product_name"], {})
        coverages_raw = raw.get("coverages", [])

        # 보장 내역 (payment_amount 파싱, 상위 5개)
        coverage_items = []
        for c in coverages_raw[:5]:
            amt = _parse_amount_to_man(c.get("payment_amount", ""))
            if amt == 0:
                amt = _parse_amount_to_man(c.get("coverage_amount", ""))
            name = c.get("benefit_name", "")
            # 너무 긴 이름 줄이기
            if len(name) > 20:
                name = name[:18] + "…"
            if name:
                coverage_items.append({"name": name, "amount": amt})

        # 월 보험료 (첫 번째 coverage 항목 기준)
        monthly_premium = None
        if coverages_raw:
            mp = coverages_raw[0].get(gender_key)
            if mp:
                monthly_premium = int(mp)

        # 경고 (일부부적합)
        warnings = []
        if item.get("label") == "일부부적합":
            warnings.append("일부 보장 항목이 권장 수준 미만")

        result.append({
            "name":           item["product_name"],
            "company":        item["company"],
            "category":       item["category"],
            "fitScore":       int(item.get("fit_score") or 0),
            "matchGrade":     grade_map.get(item.get("grade", "보통"), "medium"),
            "monthlyPremium": monthly_premium,
            "coverage":       coverage_items,
            "reasons":        item.get("reasons", []),
            "warnings":       warnings,
            "itemScores":     item_scores_map.get(item["product_name"], {}),
        })

    return result


@app.post("/plan")
def create_plan(req: PlanRequest):
    import insurance_tools as t

    # 고객 정보 초기화 후 저장 (T1)
    t._customer_store.clear()

    gender = "남자" if req.gender == "male" else "여자"
    t.save_customer_info("gender", gender)

    if req.birth_year:
        import datetime
        age = datetime.datetime.now().year - int(req.birth_year)
        t.save_customer_info("age", age)

    # BMI
    if req.height and req.weight:
        try:
            bmi = float(req.weight) / ((float(req.height) / 100) ** 2)
            t.save_customer_info("bmi", round(bmi, 1))
        except Exception:
            pass

    # 흡연
    smoking_map = {"none": "비흡연", "past": "과거흡연", "current": "흡연"}
    if req.smoking:
        t.save_customer_info("smoking", smoking_map.get(req.smoking, "비흡연"))

    # 음주
    drinking_map = {"none": "비음주", "light": "음주", "moderate": "음주", "heavy": "음주"}
    if req.drinking:
        t.save_customer_info("drinking", drinking_map.get(req.drinking, "비음주"))

    # 건강 정보
    if req.past_conditions:
        conds = [c for c in req.past_conditions if c != "없음"]
        if conds:
            t.save_customer_info("past_history", conds)

    if req.current_meds and req.current_meds.strip() not in ("없음", ""):
        t.save_customer_info("current_meds", [req.current_meds.strip()])

    if req.family_history:
        fh = [f for f in req.family_history if f != "없음"]
        if fh:
            t.save_customer_info("family_history", fh)

    # 직업
    if req.occupation:
        t.save_customer_info("job", req.occupation)

    # 기존 보험
    if req.current_insurance and req.current_insurance.strip() not in ("없음", ""):
        t.save_customer_info("existing_insurance", [req.current_insurance.strip()])

    # 예산 파싱
    budget_map = {
        "5만원 이하":   (0, 5),
        "5~10만원":     (5, 10),
        "10~20만원":    (10, 20),
        "20~30만원":    (20, 30),
        "30만원 이상":  (30, 999),
    }
    if req.monthly_budget and req.monthly_budget in budget_map:
        mn, mx = budget_map[req.monthly_budget]
        t.save_customer_info("budget_min", mn)
        t.save_customer_info("budget_max", mx)

    # 선호도
    refund_map = {"refund": "환급 선호", "no-refund": "저렴함 선호", "either": ""}
    if req.refund_pref and req.refund_pref in refund_map:
        val = refund_map[req.refund_pref]
        if val:
            t.save_customer_info("prefer_refund", val)

    payment_map = {"10": "단기납", "20": "장기납", "30": "장기납", "full": "전기납"}
    if req.payment_period and req.payment_period in payment_map:
        t.save_customer_info("prefer_payment_period", payment_map[req.payment_period])

    renewal_map = {
        "renewal":     "갱신형 선호",
        "non-renewal": "비갱신형 선호",
        "either":      "",
    }
    if req.renewal_pref and req.renewal_pref in renewal_map:
        val = renewal_map[req.renewal_pref]
        if val:
            t.save_customer_info("prefer_renewal", val)

    if req.preferred_types:
        t.save_customer_info("prefer_type", req.preferred_types)

    if req.urgency:
        urgency_map = {"immediate": "즉시", "month": "1개월내", "exploring": "알아보는중"}
        t.save_customer_info("urgency", urgency_map.get(req.urgency, "알아보는중"))

    # 우선순위 → 가중치 (T2)
    priorities = req.priorities or []
    weights_result = t.calculate_weights(priorities) if priorities else {}
    weights = weights_result.get("weights") if weights_result else None

    # Fit Score 계산 (T5)
    fit_result = t.calculate_fit_score(weights)

    # 설계안 생성 (T6)
    plan = t.generate_plan(fit_result)

    # 프론트엔드 형식으로 변환
    products = _format_products(plan, gender, fit_result)

    return {
        "products": products,
        "summary": plan.get("step_summary", {}),
        "disclaimer": plan.get("disclaimer", ""),
    }


# ─── 기타 ─────────────────────────────────────────────────────────────────────

@app.post("/reset")
def reset():
    agent.reset()
    return {"ok": True}

@app.get("/health")
def health():
    return {"status": "ok"}
