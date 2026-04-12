"""
risk_profile_tools.py
====================
리스크 프로파일링 + 최소 보장 요건 산출 도구 2개

[목적]
- State 5 (리스크 프로파일 확인) 를 객관화
- State 6 (최소 보장 요건 제시) 를 결정론적으로 산출
- 두 질문 프레이밍의 첫 번째 질문 ("이 보험이 정말 필요한가?")에 대한 답을 도구로 제공

[통합 방법]
이 코드를 insurance_tools.py 파일의 T5 (calculate_fit_score) 위에 추가.
TOOLS 리스트에 두 도구 등록 추가.

[V1 범위]
- 단순 규칙 기반 (medical 데이터 없이 가족력/병력/직업/생활습관만 사용)
- 4가지 위험 카테고리: 암 / 뇌혈관 / 심장질환 / 상해
- V2에서 발병률 통계 + 정량 모델로 정교화 예정
"""

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

    # 종합 메시지 (LLM이 카드로 출력할 때 참고)
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
    기존 보유 보험에서 커버되는 부분은 안내하여 중복 가입 방지.

    [입력]
      risk_profile_result: calculate_risk_profile()의 결과 딕셔너리
                          None이면 자동으로 calculate_risk_profile() 호출

    [출력]
      항목별 최소 필요 보장 금액 + 기존 보험 안내 + 우선순위

    [V1 산출 규칙]
      위험도 → 최소 보장 금액 매핑 (만원 단위)
      - 높음: 2,000만원
      - 보통: 1,000만원
      - 낮음: 500만원 (또는 권장 사항)

    [V2 정교화 예정]
      - 연령대별 차등 (30대 vs 60대)
      - 가족력 종류별 차등 (대장암 vs 갑상선암)
      - 기존 보험의 보장 금액 정확 차감
    """
    if risk_profile_result is None:
        risk_profile_result = calculate_risk_profile()

    customer = _customer_store.copy()
    profile = risk_profile_result["risk_profile"]
    existing = customer.get("existing_insurance", [])

    # V1 단순 규칙: 위험도 → 최소 보장 금액 매핑
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

        # 우선순위 결정
        if grade == "높음":
            priority = "필수"
        elif grade == "보통":
            priority = "권장"
        else:
            priority = "선택"

        # V1 단순화: 기존 보험 차감은 메시지로만
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

    # 요약
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
# TOOLS 리스트에 추가할 항목 (insurance_tools.py 기존 TOOLS에 append)
# ══════════════════════════════════════════════════════════════

NEW_TOOLS = [
    {
        "name": "calculate_risk_profile",
        "description": "누적된 고객 정보(가족력, 병력, 직업, 흡연 등)를 바탕으로 4가지 위험 카테고리(암/뇌혈관/심장/상해)의 등급을 객관적으로 산출합니다. 정보 수집(State 4)이 완료된 후 State 5에서 호출하세요.",
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

# 사용 예시:
# from insurance_tools import TOOLS
# TOOLS.extend(NEW_TOOLS)

# 또는 insurance_tools.py 내 기존 TOOLS 리스트에 직접 추가
