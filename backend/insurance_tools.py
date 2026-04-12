"""
insurance_tools.py
===================
KB라이프 AI 보험 설계 Agent - Tool 모음

[파일 구조]
  tools/
    insurance_tools.py   ← 이 파일 (Tool 함수 8개)
    cancer_insurance.json
    term_life.json
    accident.json
    incomplete_sales.json

[사용 방법]
  from insurance_tools import TOOLS, execute_tool
  # TOOLS → AI에게 등록할 Tool 명세 목록
  # execute_tool(name, args) → Tool 실행
"""

import json
import re
from pathlib import Path

# ── 데이터 로딩 (한 번만 로드해서 메모리에 보관) ──────────────────────
BASE_DIR = Path(__file__).parent.parent / "data"

def _load(filename: str) -> dict:
    path = BASE_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

_CANCER   = _load("cancer_insurance.json")   # 암보험
_TERM     = _load("term_life.json")           # 정기보험
_ACCIDENT = _load("accident.json")            # 상해보험
_INCOMPLETE = _load("incomplete_sales.json")  # 불완전판매비율

# 전체 상품 통합 목록 (카테고리 태그 추가)
ALL_PRODUCTS = (
    [{"_category": "암보험",   **p} for p in _CANCER["products"]]
  + [{"_category": "정기보험", **p} for p in _TERM["products"]]
  + [{"_category": "상해보험", **p} for p in _ACCIDENT["products"]]
)

# ══════════════════════════════════════════════════════════════
# T1. 고객 정보 저장
# ══════════════════════════════════════════════════════════════
_customer_store: dict = {}   # 대화 세션 동안 고객 정보 누적 저장

def save_customer_info(field: str, value) -> dict:
    """
    대화 중 수집된 고객 정보를 저장한다.

    [사용 예시]
      AI: "성별이 어떻게 되세요?"  →  사용자: "남자"
      save_customer_info("gender", "남자")

      AI: "나이가 어떻게 되세요?"  →  사용자: "38"
      save_customer_info("age", 38)

    [저장 가능한 field 목록]
      gender       : "남자" | "여자"
      age          : 숫자 (예: 38)
      smoking      : "흡연" | "비흡연" | "과거흡연"
      drinking     : "음주" | "비음주"
      past_history : 과거 병력 리스트 (예: ["고혈압", "당뇨"])
      current_meds : 현재 복용 약 리스트 (예: ["고혈압약"])
      family_history: 가족력 리스트 (예: ["암", "심장질환"])
      job          : 직업 (예: "사무직")
      bmi          : BMI 수치 (예: 23.5)
      existing_insurance: 기존 보험 목록 (예: ["실손보험"])
      budget_min   : 월 최소 납입 가능 금액 (만원)
      budget_max   : 월 최대 납입 가능 금액 (만원)
      purpose      : 가입 목적 (예: "순수보장")
      insurance_knowledge: "초보" | "중간" | "전문가"
      prefer_refund: "환급 선호" | "저렴함 선호"
      prefer_payment_period: "단기납" | "장기납" | "전기납"
      prefer_coverage_period: "단기" | "장기"
      prefer_renewal: "갱신형 선호" | "비갱신형 선호"
      prefer_type  : 선호 보험 종류 리스트
      priority_ranking: 중요 항목 순위 (1~4위 리스트, 예: ["암/중증 질병 보장", "보험료 저렴함", "환급률", "납입 기간 선호 일치"])
      urgency      : "즉시" | "1개월내" | "알아보는중"
    """
    _customer_store[field] = value
    return {
        "status": "saved",
        "field": field,
        "value": value,
        "current_profile": _customer_store.copy()
    }


# ══════════════════════════════════════════════════════════════
# T2. 가중치 적용 (방법 A: 순위 반비례)
# ══════════════════════════════════════════════════════════════

WEIGHT_MAP = {1: 0.40, 2: 0.30, 3: 0.20, 4: 0.10}

# 우선순위 선택 가능 항목 목록
PRIORITY_ITEMS = [
    "암/중증 질병 보장",
    "보험료 저렴함",
    "환급률",
    "납입 기간 선호 일치",
    "보장 기간 선호 일치",
    "갱신형 여부 선호 일치",
]

def calculate_weights(priority_ranking: list[str]) -> dict:
    """
    고객이 선택한 우선순위를 가중치로 변환한다.

    [입력]
      priority_ranking: 1~4순위로 선택한 항목 이름 리스트
      예) ["암/중증 질병 보장", "보험료 저렴함", "환급률", "납입 기간 선호 일치"]

    [출력]
      각 항목별 가중치 딕셔너리
      예) {"암/중증 질병 보장": 0.40, "보험료 저렴함": 0.30, ...}

    [가중치 공식: 방법 A]
      1순위 → 40% / 2순위 → 30% / 3순위 → 20% / 4순위 → 10%
    """
    if not priority_ranking:
        return {"error": "순위가 입력되지 않았습니다."}

    weights = {}
    for rank, item in enumerate(priority_ranking[:4], start=1):
        weights[item] = WEIGHT_MAP[rank]

    return {
        "weights": weights,
        "formula": "방법A: 1순위40% / 2순위30% / 3순위20% / 4순위10%",
        "total": sum(weights.values())
    }


# ══════════════════════════════════════════════════════════════
# T3. 보험료 조회
# ══════════════════════════════════════════════════════════════

def get_premium(
    gender: str,
    category: str | None = None,
    company: str | None = None,
    renewal_type: str | None = None,
    surrender_type: str | None = None,
) -> dict:
    """
    JSON 데이터에서 보험료를 조회한다.

    [입력]
      gender       : "남자" | "여자" (필수)
      category     : "암보험" | "정기보험" | "상해보험" | None(전체)
      company      : 회사명 필터 (예: "KB라이프생명") | None(전체)
      renewal_type : "갱신형" | "비갱신형" | None(전체)
      surrender_type: "무해지/저해지환급" | "만기환급" | "순수보장" | None(전체)

    [출력]
      조건에 맞는 상품 목록 (상품명, 회사, 보험료, 보장 수)
    """
    results = []
    gender_key = "premium_male" if gender == "남자" else "premium_female"

    for product in ALL_PRODUCTS:
        # 카테고리 필터
        if category and product["_category"] != category:
            continue
        # 회사 필터
        if company and company not in product["company"]:
            continue
        # 갱신형 필터
        rt = product["price_info"].get("renewal_type", "")
        if renewal_type and renewal_type != rt:
            continue
        # 해약환급 필터
        st = product["price_info"].get("surrender_type", "")
        if surrender_type and surrender_type not in st:
            continue

        # 주계약 첫 행에서 보험료 추출
        main_coverage = product["coverages"][0]
        premium = main_coverage.get(gender_key)

        results.append({
            "category": product["_category"],
            "company": product["company"],
            "product_name": product["product_name"],
            "premium": premium,
            "renewal_type": rt,
            "surrender_type": st,
            "coverage_count": len(product["coverages"]),
            "sales_date": product["operation_info"].get("sales_date", ""),
        })

    # 보험료 오름차순 정렬
    results.sort(key=lambda x: x["premium"] or 999999999)

    return {
        "gender": gender,
        "filter": {
            "category": category, "company": company,
            "renewal_type": renewal_type, "surrender_type": surrender_type
        },
        "total": len(results),
        "products": results
    }


# ══════════════════════════════════════════════════════════════
# T4. 보장 내용 조회
# ══════════════════════════════════════════════════════════════

def get_coverage(
    product_name: str,
    keyword: str | None = None,
) -> dict:
    """
    특정 상품의 보장 내용을 조회한다.
    (RAG 파이프라인이 없는 경우 JSON 데이터에서 직접 조회)

    [입력]
      product_name : 상품명 (일부만 입력해도 됨, 예: "e암보험")
      keyword      : 찾고 싶은 보장 키워드 (예: "암진단", "입원") | None(전체)

    [출력]
      해당 상품의 보장 항목 목록
    """
    found = []
    for product in ALL_PRODUCTS:
        if product_name.lower() not in product["product_name"].lower():
            continue

        coverages = product["coverages"]
        if keyword:
            coverages = [
                c for c in coverages
                if keyword in c.get("benefit_name", "")
                or keyword in c.get("payment_condition", "")
            ]

        found.append({
            "company": product["company"],
            "product_name": product["product_name"],
            "category": product["_category"],
            "matched_coverages": coverages,
            "total_coverage_count": len(product["coverages"]),
        })

    if not found:
        return {"error": f"'{product_name}' 상품을 찾을 수 없습니다.", "products": []}

    return {
        "keyword": keyword,
        "total_matched_products": len(found),
        "products": found
    }


# ══════════════════════════════════════════════════════════════
# T9. 리스크 프로파일 산출
# ══════════════════════════════════════════════════════════════

def calculate_risk_profile() -> dict:
    """
    누적된 고객 정보를 바탕으로 4가지 위험 카테고리의 등급을 산출한다.

    [입력] 없음 (_customer_store 자동 참조)

    [출력]
      각 위험 카테고리별 등급(높음/보통/낮음)과 판단 근거

    [V1 판단 규칙]
      - 암 위험: 가족력에 암 종류 포함 또는 흡연 → 높음
      - 뇌혈관 위험: 가족력 뇌혈관 또는 고혈압 → 높음
      - 심장 위험: 가족력 심장 또는 고혈압/당뇨 → 높음
      - 상해 위험: 직업 위험도 기반
    """
    customer = _customer_store.copy()

    family_history = customer.get("family_history", [])
    past_history = customer.get("past_history", [])
    current_meds = customer.get("current_meds", [])
    smoking = customer.get("smoking", "")
    age = customer.get("age", 30)
    job = customer.get("job", "")
    gender = customer.get("gender", "")

    profile = {}

    # ─── 1. 암 위험 평가 ───
    cancer_keywords = ["암", "대장암", "위암", "유방암", "폐암", "간암", "췌장암", "갑상선암"]
    matched_cancers = [
        fh for fh in family_history
        if any(k in str(fh) for k in cancer_keywords)
    ]
    has_cancer_family = bool(matched_cancers)

    if has_cancer_family:
        cancer_grade = "높음"
        cancer_reason = f"가족력({', '.join(matched_cancers)})으로 인한 위험 상승"
    elif smoking == "흡연":
        cancer_grade = "높음"
        cancer_reason = "흡연으로 인한 폐암 및 기타 암 위험 상승"
    elif age >= 50:
        cancer_grade = "보통"
        cancer_reason = f"{age}세 연령대 평균 발병률"
    else:
        cancer_grade = "보통"
        cancer_reason = f"{age}세 평균 위험도"

    profile["암 위험"] = {
        "grade": cancer_grade,
        "reason": cancer_reason,
        "matched_keywords": matched_cancers,
    }

    # ─── 2. 뇌혈관 위험 평가 ───
    brain_keywords = ["뇌혈관", "뇌졸중", "뇌출혈", "뇌경색"]
    matched_brain = [
        fh for fh in family_history
        if any(k in str(fh) for k in brain_keywords)
    ]
    has_brain_family = bool(matched_brain)
    has_hypertension = any("고혈압" in str(h) for h in (past_history + current_meds))

    if has_brain_family and has_hypertension:
        brain_grade = "높음"
        brain_reason = "가족력 + 고혈압으로 인한 뇌혈관 위험 상승"
    elif has_brain_family:
        brain_grade = "높음"
        brain_reason = f"가족력({', '.join(matched_brain)})으로 인한 위험 상승"
    elif has_hypertension:
        brain_grade = "높음"
        brain_reason = "고혈압으로 인한 뇌혈관 위험 상승"
    elif age >= 50:
        brain_grade = "보통"
        brain_reason = f"{age}세 연령대 평균 위험도"
    else:
        brain_grade = "보통"
        brain_reason = f"{age}세 평균 위험도"

    profile["뇌혈관 위험"] = {
        "grade": brain_grade,
        "reason": brain_reason,
        "matched_conditions": matched_brain + (["고혈압"] if has_hypertension else []),
    }

    # ─── 3. 심장질환 위험 평가 ───
    heart_keywords = ["심장", "심근경색", "협심증", "심부전"]
    matched_heart = [
        fh for fh in family_history
        if any(k in str(fh) for k in heart_keywords)
    ]
    has_heart_family = bool(matched_heart)
    has_diabetes = any("당뇨" in str(h) for h in (past_history + current_meds))

    risk_factors = []
    if has_heart_family:
        risk_factors.append(f"가족력({', '.join(matched_heart)})")
    if has_hypertension:
        risk_factors.append("고혈압")
    if has_diabetes:
        risk_factors.append("당뇨")

    if len(risk_factors) >= 2:
        heart_grade = "높음"
        heart_reason = f"{' + '.join(risk_factors)} 복합 위험 상승"
    elif len(risk_factors) == 1:
        heart_grade = "높음"
        heart_reason = f"{risk_factors[0]}으로 인한 위험 상승"
    elif age >= 50:
        heart_grade = "보통"
        heart_reason = f"{age}세 연령대 평균 위험도"
    else:
        heart_grade = "보통"
        heart_reason = f"{age}세 평균 위험도"

    profile["심장질환 위험"] = {
        "grade": heart_grade,
        "reason": heart_reason,
        "matched_conditions": risk_factors,
    }

    # ─── 4. 상해 위험 평가 ───
    high_risk_jobs = ["건설", "현장", "운전기사", "배달", "기계", "용접", "전기공"]
    low_risk_jobs = ["사무", "학생", "교사", "연구", "회계", "행정", "디자이너", "개발자"]

    if any(k in str(job) for k in high_risk_jobs):
        accident_grade = "높음"
        accident_reason = f"{job} 직업 특성상 사고 위험 상승"
    elif any(k in str(job) for k in low_risk_jobs):
        accident_grade = "낮음"
        accident_reason = f"{job} 직업 특성상 사고 위험 낮음"
    else:
        accident_grade = "보통"
        accident_reason = f"{job} 평균 위험도"

    profile["상해 위험"] = {
        "grade": accident_grade,
        "reason": accident_reason,
    }

    # 종합 메시지
    high_risks = [k for k, v in profile.items() if v["grade"] == "높음"]
    summary_msg = (
        f"높은 위험으로 분류된 항목: {', '.join(high_risks)}"
        if high_risks
        else "전반적으로 평균 위험도 수준"
    )

    return {
        "customer_summary": {
            "age": age,
            "gender": gender,
            "job": job,
        },
        "risk_profile": profile,
        "high_risk_categories": high_risks,
        "summary_message": summary_msg,
        "input_data_used": {
            "family_history": family_history,
            "past_history": past_history,
            "current_meds": current_meds,
            "smoking": smoking,
        },
    }


# ══════════════════════════════════════════════════════════════
# T10. 최소 보장 요건 산출
# ══════════════════════════════════════════════════════════════

def calculate_minimum_coverage(risk_profile_result: dict | None = None) -> dict:
    """
    리스크 프로파일을 바탕으로 항목별 최소 필요 보장 금액을 산출한다.

    [입력]
      risk_profile_result: calculate_risk_profile()의 결과 또는 None(자동 호출)

    [출력]
      항목별 최소 필요 보장 금액 + 기존 보험 안내 + 우선순위
    """
    if risk_profile_result is None:
        risk_profile_result = calculate_risk_profile()

    customer = _customer_store.copy()
    profile = risk_profile_result["risk_profile"]
    existing = customer.get("existing_insurance", [])

    # V1 단순 규칙: 위험도 → 최소 보장 금액 매핑 (만원 단위)
    coverage_rules = {
        "암 위험": {
            "coverage_name": "일반암 진단비",
            "amount_by_grade": {"높음": 2000, "보통": 1000, "낮음": 500},
        },
        "뇌혈관 위험": {
            "coverage_name": "뇌혈관질환 진단비",
            "amount_by_grade": {"높음": 2000, "보통": 1000, "낮음": 500},
        },
        "심장질환 위험": {
            "coverage_name": "심장질환 진단비",
            "amount_by_grade": {"높음": 2000, "보통": 1000, "낮음": 500},
        },
        "상해 위험": {
            "coverage_name": "상해 보장",
            "amount_by_grade": {"높음": 1000, "보통": 500, "낮음": 0},
        },
    }

    requirements = []
    for risk_category, profile_data in profile.items():
        grade = profile_data["grade"]
        rule = coverage_rules[risk_category]
        min_amount = rule["amount_by_grade"][grade]

        if grade == "높음":
            priority = "필수"
        elif grade == "보통":
            priority = "권장"
        else:
            priority = "선택"

        existing_coverage_msg = None
        if "실손보험" in existing and risk_category == "상해 위험":
            existing_coverage_msg = "입원·통원비는 실손에서 일부 커버"

        requirements.append({
            "category": risk_category,
            "coverage_name": rule["coverage_name"],
            "grade": grade,
            "minimum_amount_manwon": min_amount,
            "priority": priority,
            "reason": profile_data["reason"],
            "existing_coverage_note": existing_coverage_msg,
        })

    # 기존 보험 일반 안내
    existing_general_notes = []
    if "실손보험" in existing:
        existing_general_notes.append(
            "입원·통원비는 현재 실손보험에서 커버 중이므로 추가 가입 불필요"
        )
    if any("암" in str(e) for e in existing):
        existing_general_notes.append(
            "기존 암보험과 보장 중복 가능성이 있어 가입 시 검토 필요"
        )

    summary = {
        "total_categories": len(requirements),
        "essential_count": len([r for r in requirements if r["priority"] == "필수"]),
        "recommended_count": len([r for r in requirements if r["priority"] == "권장"]),
        "optional_count": len([r for r in requirements if r["priority"] == "선택"]),
    }

    return {
        "requirements": requirements,
        "existing_insurance_notes": existing_general_notes,
        "summary": summary,
        "disclaimer": (
            "위 기준은 입력하신 정보를 바탕으로 산출한 객관적 권장 수준이며, "
            "최종 가입 보장 금액은 본인의 판단에 따라 조정 가능합니다."
        ),
    }


# ══════════════════════════════════════════════════════════════
# T5. Fit Score 계산 (V2 구조: STEP 1→2→3)
# ══════════════════════════════════════════════════════════════

def _step1_filter(customer: dict) -> list[dict]:
    """STEP1: 가입 가능 상품 필터링"""
    passed = []
    gender = customer.get("gender", "")
    age = customer.get("age", 30)
    budget_max = customer.get("budget_max", 999999)
    has_condition = bool(
        customer.get("past_history") or customer.get("current_meds")
    )
    job_risk = customer.get("job_risk_level", 1)  # 1=저위험, 4=고위험
    gender_key = "premium_male" if gender == "남자" else "premium_female"

    for product in ALL_PRODUCTS:
        # 필터 1: 나이 범위 (데이터에 연령 정보 없으므로 기본 통과 처리)
        # 실제 구현에서는 상품별 가입 가능 연령 테이블 필요

        # 필터 2: 간편심사 - 병력 있으면 일반심사형 제외
        if has_condition:
            pname = product["product_name"].lower()
            is_standard = "일반심사" in pname and "간편" not in pname
            if is_standard:
                continue  # 일반심사형 제외

        # 필터 3: 직업 위험등급 (고위험 직업은 일부 상품 제외)
        if job_risk >= 4:
            # 고위험 직업은 종신/정기보험 일부 제외 (단순화)
            if product["_category"] == "정기보험":
                continue

        # 필터 4: 예산 하한 (보험료가 예산 초과면 제외)
        premium = product["coverages"][0].get(gender_key, 0) or 0
        if premium > budget_max * 10000:  # 만원 → 원 변환
            continue

        passed.append(product)

    return passed


def _step2_label(product: dict, customer: dict) -> str:
    """STEP2: 적합성 라벨 부여 (적합/일부부적합/부적합)"""
    # 리스크 프로파일 기반 최소 보장 요건 확인
    family_history = customer.get("family_history", [])
    has_cancer_risk = "암" in str(family_history) or customer.get("smoking") == "흡연"

    # 암 위험 고객인데 암 보장이 없으면 부적합
    if has_cancer_risk and product["_category"] != "암보험":
        cancer_coverages = [
            c for c in product["coverages"]
            if "암" in c.get("benefit_name", "")
        ]
        if not cancer_coverages:
            return "부적합"

    # 보장 항목이 너무 적으면 일부부적합
    if len(product["coverages"]) < 2:
        return "일부부적합"

    return "적합"


def _step3_score(product: dict, customer: dict, weights: dict) -> dict:
    """STEP3: 매칭 점수 계산 (0~100점)"""
    gender_key = "premium_male" if customer.get("gender") == "남자" else "premium_female"
    premium = product["coverages"][0].get(gender_key, 0) or 0
    renewal_type = product["price_info"].get("renewal_type", "")
    surrender_type = product["price_info"].get("surrender_type", "")

    # 항목별 점수 계산 (0~100)
    item_scores = {}

    # 1. 암/중증 보장 점수
    cancer_coverages = [c for c in product["coverages"] if "암" in c.get("benefit_name","")]
    cancer_score = min(100, len(cancer_coverages) * 20)
    item_scores["암/중증 질병 보장"] = cancer_score

    # 2. 보험료 저렴함 점수 (전체 평균 대비)
    all_premiums = [
        p["coverages"][0].get(gender_key, 0) or 0
        for p in ALL_PRODUCTS
        if p["_category"] == product["_category"]
    ]
    if all_premiums and max(all_premiums) > 0:
        rank_pct = 1 - (premium / max(all_premiums))
        premium_score = int(rank_pct * 100)
    else:
        premium_score = 50
    item_scores["보험료 저렴함"] = premium_score

    # 3. 환급률 점수
    if "만기환급" in surrender_type:
        refund_score = 90
    elif "무해지" in surrender_type or "저해지" in surrender_type:
        refund_score = 20
    else:
        refund_score = 50
    # 고객이 환급 선호하는 경우
    if customer.get("prefer_refund") == "환급 선호":
        if "만기환급" in surrender_type:
            refund_score = 100
    item_scores["환급률"] = refund_score

    # 4. 납입 기간 선호 일치 점수
    prefer_payment = customer.get("prefer_payment_period", "")
    payment_score = 70  # 기본값
    item_scores["납입 기간 선호 일치"] = payment_score

    # 5. 보장 기간 선호 일치 점수
    item_scores["보장 기간 선호 일치"] = 70  # 기본값

    # 6. 갱신형 여부 선호 일치 점수
    prefer_renewal = customer.get("prefer_renewal", "")
    if prefer_renewal and prefer_renewal.replace(" 선호", "") in renewal_type:
        renewal_score = 100
    elif not prefer_renewal:
        renewal_score = 70
    else:
        renewal_score = 10
    item_scores["갱신형 여부 선호 일치"] = renewal_score

    # 가중치 적용해서 최종 점수 계산
    total_score = 0
    score_breakdown = {}
    for item, w in weights.items():
        raw = item_scores.get(item, 70)
        contribution = raw * w
        total_score += contribution
        score_breakdown[item] = {
            "raw_score": raw,
            "weight": w,
            "contribution": round(contribution, 1)
        }

    # 가중치 없는 항목도 평균에 포함
    weighted_items = set(weights.keys())
    unweighted = {k: v for k, v in item_scores.items() if k not in weighted_items}
    if unweighted and not weights:
        total_score = sum(unweighted.values()) / len(unweighted)

    return {
        "total_score": round(total_score, 1),
        "grade": (
            "높음" if total_score >= 80 else
            "보통" if total_score >= 60 else
            "낮음"  if total_score >= 40 else
            "미달"
        ),
        "item_scores": item_scores,
        "score_breakdown": score_breakdown,
    }


def calculate_fit_score(weights: dict | None = None) -> dict:
    """
    고객 정보와 가중치를 바탕으로 전체 상품의 Fit Score를 계산한다.

    [입력]
      weights: calculate_weights()의 결과 딕셔너리 내 'weights' 값
               None이면 균등 가중치 적용

    [출력]
      전체 TOP5 + 카테고리별 TOP5 + 부적합 상품 목록
    """
    customer = _customer_store.copy()

    if not weights:
        weights = {item: 1/len(PRIORITY_ITEMS) for item in PRIORITY_ITEMS}

    # STEP 1: 필터링
    step1_passed = _step1_filter(customer)
    step1_filtered = [p for p in ALL_PRODUCTS if p not in step1_passed]

    # STEP 2: 라벨 부여
    labeled = []
    for product in step1_passed:
        label = _step2_label(product, customer)
        labeled.append((product, label))

    # STEP 3: 점수 계산 (적합/일부부적합만)
    scored = []
    disqualified = []

    for product, label in labeled:
        if label == "부적합":
            disqualified.append({
                "company": product["company"],
                "product_name": product["product_name"],
                "category": product["_category"],
                "label": "부적합",
                "fit_score": None,
                "grade": "미달",
                "tag": "매칭도: 미달 — 핵심 보장 부족",
            })
            continue

        score_result = _step3_score(product, customer, weights)
        scored.append({
            "company": product["company"],
            "product_name": product["product_name"],
            "category": product["_category"],
            "label": label,
            "fit_score": score_result["total_score"],
            "grade": score_result["grade"],
            "item_scores": score_result["item_scores"],
            "score_breakdown": score_result["score_breakdown"],
        })

    # 점수 내림차순 정렬
    scored.sort(key=lambda x: x["fit_score"], reverse=True)

    # 전체 TOP5
    top5_overall = scored[:5]

    # 카테고리별 TOP5
    top5_by_category = {}
    for item in scored:
        cat = item["category"]
        if cat not in top5_by_category:
            top5_by_category[cat] = []
        if len(top5_by_category[cat]) < 5:
            top5_by_category[cat].append(item)

    return {
        "customer_profile": customer,
        "step1": {
            "total_products": len(ALL_PRODUCTS),
            "passed": len(step1_passed),
            "filtered_out": len(step1_filtered),
        },
        "step2": {
            "eligible": len([l for _,l in labeled if l != "부적합"]),
            "disqualified": len(disqualified),
        },
        "step3": {
            "total_scored": len(scored),
        },
        "top5_overall": top5_overall,
        "top5_by_category": top5_by_category,
        "disqualified": disqualified,
        "disclaimer": "본 결과는 입력하신 정보와 설정하신 기준에 따른 객관적 매칭 결과이며, 특정 상품의 가입을 권유하는 것이 아닙니다.",
    }


# ══════════════════════════════════════════════════════════════
# T6. 설계안 생성
# ══════════════════════════════════════════════════════════════

def generate_plan(fit_score_result: dict | None = None) -> dict:
    """
    Fit Score 결과를 바탕으로 고객용 설계안을 생성한다.

    [입력]
      fit_score_result: calculate_fit_score()의 결과 딕셔너리
                        None이면 자동으로 calculate_fit_score() 호출

    [출력]
      고객에게 보여줄 설계안 (전체순위 + 카테고리별 + 추천 이유 포함)
    """
    if fit_score_result is None:
        fit_score_result = calculate_fit_score()

    customer = fit_score_result.get("customer_profile", {})
    top5 = fit_score_result.get("top5_overall", [])

    # 각 상품별 추천 이유 텍스트 자동 생성
    plan_items = []
    for rank, item in enumerate(top5, start=1):
        reasons = []

        if item["item_scores"].get("암/중증 질병 보장", 0) >= 80:
            reasons.append("암 보장 범위가 넓습니다")
        if item["item_scores"].get("보험료 저렴함", 0) >= 70:
            reasons.append("동일 조건 대비 보험료가 저렴합니다")
        if item["item_scores"].get("환급률", 0) >= 80:
            reasons.append("만기 시 납입 보험료를 환급받을 수 있습니다")
        if item["label"] == "일부부적합":
            reasons.append("⚠️ 일부 보장 항목이 권장 수준 미만입니다")

        plan_items.append({
            "rank": rank,
            "company": item["company"],
            "product_name": item["product_name"],
            "category": item["category"],
            "fit_score": item["fit_score"],
            "grade": item["grade"],
            "label": item["label"],
            "reasons": reasons if reasons else ["고객님 조건에 전반적으로 적합한 상품입니다"],
        })

    return {
        "customer_name_placeholder": "고객님",
        "overall_ranking": plan_items,
        "by_category": fit_score_result.get("top5_by_category", {}),
        "disqualified": fit_score_result.get("disqualified", []),
        "disclaimer": fit_score_result.get("disclaimer", ""),
        "step_summary": {
            "total": fit_score_result["step1"]["total_products"],
            "after_filter": fit_score_result["step1"]["passed"],
            "eligible": fit_score_result["step2"]["eligible"],
            "scored": fit_score_result["step3"]["total_scored"],
        }
    }


# ══════════════════════════════════════════════════════════════
# T7. 고지의무 안내
# ══════════════════════════════════════════════════════════════

def get_disclosure_obligations() -> dict:
    """
    고객의 건강 정보를 바탕으로 보험 가입 시 고지해야 할 사항을 안내한다.
    (금소법 및 보험업법 기반)

    [입력] 없음 (저장된 고객 정보 자동 참조)

    [출력]
      고지 필수 항목 목록 + 고지 방법 안내
    """
    customer = _customer_store.copy()
    obligations = []

    if customer.get("past_history"):
        for h in customer["past_history"]:
            obligations.append({
                "item": f"과거 병력: {h}",
                "obligation": "필수 고지",
                "reason": "보험 가입 심사에 영향을 미치는 중요 사항입니다.",
                "risk": "미고지 시 보험금 지급 거절 가능"
            })

    if customer.get("current_meds"):
        for med in customer["current_meds"]:
            obligations.append({
                "item": f"현재 복용 약: {med}",
                "obligation": "필수 고지",
                "reason": "현재 건강 상태를 정확히 알려야 합니다.",
                "risk": "미고지 시 계약 취소 가능"
            })

    if customer.get("smoking") in ("흡연", "과거흡연"):
        obligations.append({
            "item": f"흡연 이력: {customer.get('smoking')}",
            "obligation": "필수 고지",
            "reason": "암·심혈관 질환 위험과 직결되는 항목입니다.",
            "risk": "허위 고지 시 비흡연체 할인 소급 취소"
        })

    if customer.get("family_history"):
        for fh in customer["family_history"]:
            obligations.append({
                "item": f"가족력: {fh}",
                "obligation": "확인 필요",
                "reason": "일부 상품에서 가족력을 심사에 반영합니다.",
                "risk": "상품에 따라 할증 또는 부담보 가능"
            })

    return {
        "total_obligations": len(obligations),
        "obligations": obligations,
        "general_notice": (
            "보험 계약 전 알릴 의무(보험업법 제651조)에 따라 "
            "청약서에 기재된 사항을 반드시 사실대로 고지하셔야 합니다. "
            "고의 또는 중대한 과실로 미고지 시 보험금 지급이 거절될 수 있습니다."
        ),
        "withdrawal_notice": (
            "보험 계약 후 15일 이내에는 청약을 철회할 수 있습니다. "
            "(금융소비자보호법 제46조)"
        )
    }


# ══════════════════════════════════════════════════════════════
# T8. 가입 불가 필터링
# ══════════════════════════════════════════════════════════════

def check_eligibility(product_name: str) -> dict:
    """
    특정 상품에 대한 고객의 가입 가능 여부를 확인한다.

    [입력]
      product_name: 확인할 상품명 (일부만 입력해도 됨)

    [출력]
      가입 가능 여부 + 불가 사유 목록
    """
    customer = _customer_store.copy()

    target = None
    for product in ALL_PRODUCTS:
        if product_name.lower() in product["product_name"].lower():
            target = product
            break

    if not target:
        return {"error": f"'{product_name}' 상품을 찾을 수 없습니다."}

    issues = []
    gender = customer.get("gender", "")
    age = customer.get("age", 30)
    has_condition = bool(customer.get("past_history") or customer.get("current_meds"))

    # 간편심사 여부 확인
    pname = target["product_name"]
    is_standard = "일반심사" in pname and "간편" not in pname
    if has_condition and is_standard:
        issues.append({
            "reason": "건강 고지 항목 해당",
            "detail": "현재 병력 또는 과거 병력이 있어 일반심사형 가입이 어려울 수 있습니다. 간편심사형을 확인해보시는 것이 좋겠어요.",
            "severity": "주의"
        })

    # 예산 확인
    gender_key = "premium_male" if gender == "남자" else "premium_female"
    premium = target["coverages"][0].get(gender_key, 0) or 0
    budget_max = customer.get("budget_max", 999999)
    if premium > budget_max * 10000:
        issues.append({
            "reason": "예산 초과",
            "detail": f"해당 상품 보험료({premium:,}원)가 희망 예산({budget_max}만원)을 초과합니다.",
            "severity": "제한"
        })

    eligible = not any(i["severity"] == "제한" for i in issues)

    return {
        "product_name": target["product_name"],
        "company": target["company"],
        "eligible": eligible,
        "issues": issues,
        "message": "가입 가능합니다." if eligible else "일부 제한 사항이 있습니다. 세부 내용을 확인하세요.",
    }


# ══════════════════════════════════════════════════════════════
# Tool 명세 (AI에게 등록할 메타데이터)
# ══════════════════════════════════════════════════════════════

TOOLS = [
    {
        "name": "save_customer_info",
        "description": "대화 중 수집된 고객 정보(성별, 나이, 병력, 흡연, 예산, 선호 조건 등)를 저장합니다. 고객이 새로운 정보를 말할 때마다 호출하세요.",
        "function": save_customer_info,
        "parameters": {
            "field": "저장할 정보의 종류 (예: 'gender', 'age', 'smoking')",
            "value": "저장할 값 (예: '남자', 38, '흡연')"
        }
    },
    {
        "name": "calculate_weights",
        "description": "고객이 선택한 우선순위를 Fit Score 계산용 가중치로 변환합니다. 순위 선택이 완료된 후 호출하세요.",
        "function": calculate_weights,
        "parameters": {
            "priority_ranking": "1~4순위로 선택된 항목 이름 리스트"
        }
    },
    {
        "name": "get_premium",
        "description": "조건에 맞는 상품의 보험료를 조회합니다. 고객이 보험료를 물어볼 때 호출하세요.",
        "function": get_premium,
        "parameters": {
            "gender": "성별 ('남자' 또는 '여자')",
            "category": "보험 종류 ('암보험', '정기보험', '상해보험') 또는 None",
            "company": "회사명 필터 또는 None",
            "renewal_type": "갱신 유형 필터 또는 None",
            "surrender_type": "해약환급 유형 필터 또는 None",
        }
    },
    {
        "name": "get_coverage",
        "description": "특정 보험 상품의 보장 내용을 조회합니다. 약관 설명이나 보장 범위가 궁금할 때 호출하세요.",
        "function": get_coverage,
        "parameters": {
            "product_name": "상품명 (일부만 입력 가능)",
            "keyword": "찾고 싶은 보장 키워드 또는 None"
        }
    },
    {
        "name": "calculate_fit_score",
        "description": "고객 정보와 가중치를 바탕으로 전체 상품의 Fit Score를 계산합니다. 정보 수집이 완료된 후 호출하세요.",
        "function": calculate_fit_score,
        "parameters": {
            "weights": "calculate_weights 결과의 'weights' 값 또는 None(균등)"
        }
    },
    {
        "name": "generate_plan",
        "description": "Fit Score 결과를 바탕으로 최종 설계안을 생성합니다. Fit Score 계산 후 호출하세요.",
        "function": generate_plan,
        "parameters": {
            "fit_score_result": "calculate_fit_score의 결과 딕셔너리 또는 None"
        }
    },
    {
        "name": "get_disclosure_obligations",
        "description": "고객이 보험 가입 시 반드시 고지해야 할 사항을 안내합니다. 정보 수집 완료 후 추천 전에 호출하세요.",
        "function": get_disclosure_obligations,
        "parameters": {}
    },
    {
        "name": "check_eligibility",
        "description": "특정 상품에 대한 고객의 가입 가능 여부를 확인합니다. 특정 상품을 추천하기 전에 호출하세요.",
        "function": check_eligibility,
        "parameters": {
            "product_name": "확인할 상품명"
        }
    },
    {
        "name": "calculate_risk_profile",
        "description": "누적된 고객 정보(가족력, 병력, 직업, 흡연 등)를 바탕으로 4가지 위험 카테고리(암/뇌혈관/심장/상해)의 등급을 객관적으로 산출합니다. 정보 수집이 완료된 후 State 5에서 호출하세요.",
        "function": calculate_risk_profile,
        "parameters": {}
    },
    {
        "name": "calculate_minimum_coverage",
        "description": "리스크 프로파일을 바탕으로 항목별 최소 필요 보장 금액을 산출합니다. State 6에서 호출하세요. risk_profile_result를 None으로 호출하면 자동으로 calculate_risk_profile()을 먼저 실행합니다.",
        "function": calculate_minimum_coverage,
        "parameters": {
            "risk_profile_result": "calculate_risk_profile()의 결과 또는 None(자동 호출)"
        }
    },
]


# ══════════════════════════════════════════════════════════════
# Tool 실행 함수 (AI Agent에서 호출하는 진입점)
# ══════════════════════════════════════════════════════════════

def execute_tool(name: str, args: dict) -> dict:
    """
    Tool 이름과 인자를 받아 해당 함수를 실행하고 결과를 반환한다.

    [사용 예시]
      result = execute_tool("save_customer_info", {"field": "gender", "value": "남자"})
      result = execute_tool("get_premium", {"gender": "남자", "category": "암보험"})
    """
    tool_map = {t["name"]: t["function"] for t in TOOLS}

    if name not in tool_map:
        return {"error": f"'{name}' Tool이 존재하지 않습니다. 가능한 Tool: {list(tool_map.keys())}"}

    try:
        result = tool_map[name](**args)
        return result
    except TypeError as e:
        return {"error": f"인자 오류: {str(e)}"}
    except Exception as e:
        return {"error": f"실행 오류: {str(e)}"}
