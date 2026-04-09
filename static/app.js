// ========== Chat Flow Configuration ==========
const QUESTIONS = [
    {
        id: "age",
        message: "안녕하세요! AI 보험 설계사입니다. 먼저 나이대를 알려주세요.",
        type: "options",
        options: ["20대", "30대", "40대", "50대", "60대 이상"],
    },
    {
        id: "gender",
        message: "성별을 선택해 주세요.",
        type: "options",
        options: ["남성", "여성"],
    },
    {
        id: "occupation",
        message: "직업 유형을 선택해 주세요. 직업에 따라 위험도가 달라집니다.",
        type: "options",
        options: ["사무직", "전문직", "자영업", "생산/기술직", "학생", "주부", "무직/은퇴"],
    },
    {
        id: "family",
        message: "가족 구성을 알려주세요.",
        type: "options",
        options: ["미혼 (1인)", "부부 (자녀 없음)", "부부 + 자녀", "한부모 + 자녀", "부모님 부양"],
    },
    {
        id: "concerns",
        message: "가장 걱정되는 위험 요소를 모두 골라주세요. (복수 선택 가능)",
        type: "multi",
        options: ["질병/건강", "사고/상해", "사망/유족보장", "노후/연금", "자녀 교육", "재산/화재", "운전/자동차"],
    },
    {
        id: "existing",
        message: "현재 가입 중인 보험이 있나요?",
        type: "options",
        options: ["없음", "실손보험만", "실손 + 종신/정기", "3개 이상 보유", "잘 모르겠음"],
    },
    {
        id: "budget",
        message: "월 보험료 예산은 어느 정도인가요?",
        type: "slider",
        min: 5,
        max: 50,
        step: 5,
        unit: "만원",
        defaultValue: 15,
    },
];

// ========== State ==========
let currentStep = 0;
let answers = {};

// ========== DOM ==========
const $landing = document.getElementById("landing");
const $chatSection = document.getElementById("chatSection");
const $chatMessages = document.getElementById("chatMessages");
const $inputArea = document.getElementById("inputArea");
const $progressFill = document.getElementById("progressFill");
const $progressText = document.getElementById("progressText");
const $resultSection = document.getElementById("resultSection");
const $resultContent = document.getElementById("resultContent");

// ========== Events ==========
document.getElementById("startBtn").addEventListener("click", startChat);
document.getElementById("resetBtn").addEventListener("click", resetChat);
document.getElementById("restartBtn").addEventListener("click", resetChat);

function startChat() {
    $landing.classList.add("hidden");
    $chatSection.classList.remove("hidden");
    currentStep = 0;
    answers = {};
    $chatMessages.innerHTML = "";
    showQuestion();
}

function resetChat() {
    $chatSection.classList.add("hidden");
    $resultSection.classList.add("hidden");
    $landing.classList.remove("hidden");
}

// ========== Chat Logic ==========
function showQuestion() {
    const q = QUESTIONS[currentStep];
    updateProgress();
    addBotMessage(q.message);

    setTimeout(() => {
        renderInput(q);
    }, 600);
}

function updateProgress() {
    const pct = ((currentStep) / QUESTIONS.length) * 100;
    $progressFill.style.width = pct + "%";
    $progressText.textContent = `질문 ${currentStep + 1}/${QUESTIONS.length}`;
}

function addBotMessage(text) {
    const div = document.createElement("div");
    div.className = "message bot";
    div.innerHTML = `
        <div class="msg-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#4F6BFF"/>
                <path d="M12 7v4M12 14v1M9 11a3 3 0 116 0 3 3 0 01-6 0z" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        </div>
        <div class="msg-bubble">${text}</div>
    `;
    $chatMessages.appendChild(div);
    scrollToBottom();
}

function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "message user";
    div.innerHTML = `
        <div class="msg-avatar">&#128100;</div>
        <div class="msg-bubble">${text}</div>
    `;
    $chatMessages.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => {
        $chatMessages.scrollTop = $chatMessages.scrollHeight;
    }, 50);
}

// ========== Input Renderers ==========
function renderInput(q) {
    $inputArea.innerHTML = "";

    switch (q.type) {
        case "options":
            renderOptions(q);
            break;
        case "multi":
            renderMultiSelect(q);
            break;
        case "slider":
            renderSlider(q);
            break;
        case "text":
            renderTextInput(q);
            break;
    }
}

function renderOptions(q) {
    const wrapper = document.createElement("div");
    wrapper.className = "options-grid";

    q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
            addUserMessage(opt);
            answers[q.id] = opt;
            nextStep();
        });
        wrapper.appendChild(btn);
    });

    $inputArea.appendChild(wrapper);
}

function renderMultiSelect(q) {
    const wrapper = document.createElement("div");
    wrapper.className = "multi-select-wrapper";

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "multi-options";

    const selected = new Set();

    q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
            if (selected.has(opt)) {
                selected.delete(opt);
                btn.classList.remove("selected");
            } else {
                selected.add(opt);
                btn.classList.add("selected");
            }
            confirmBtn.disabled = selected.size === 0;
        });
        optionsDiv.appendChild(btn);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "confirm-btn";
    confirmBtn.textContent = "선택 완료";
    confirmBtn.disabled = true;
    confirmBtn.addEventListener("click", () => {
        const arr = Array.from(selected);
        addUserMessage(arr.join(", "));
        answers[q.id] = arr;
        nextStep();
    });

    wrapper.appendChild(optionsDiv);
    wrapper.appendChild(confirmBtn);
    $inputArea.appendChild(wrapper);
}

function renderSlider(q) {
    const wrapper = document.createElement("div");
    wrapper.className = "slider-wrapper";

    const label = document.createElement("div");
    label.className = "slider-label";
    label.innerHTML = `<span>월 보험료 예산</span><span class="slider-value">${q.defaultValue}${q.unit}</span>`;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = q.min;
    slider.max = q.max;
    slider.step = q.step;
    slider.value = q.defaultValue;

    slider.addEventListener("input", () => {
        label.querySelector(".slider-value").textContent = `${slider.value}${q.unit}`;
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "confirm-btn";
    confirmBtn.textContent = "확인";
    confirmBtn.addEventListener("click", () => {
        const val = `월 ${slider.value}${q.unit}`;
        addUserMessage(val);
        answers[q.id] = parseInt(slider.value);
        nextStep();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    wrapper.appendChild(confirmBtn);
    $inputArea.appendChild(wrapper);
}

function renderTextInput(q) {
    const wrapper = document.createElement("div");
    wrapper.className = "text-input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = q.placeholder || "입력해 주세요...";

    const sendBtn = document.createElement("button");
    sendBtn.className = "send-btn";
    sendBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

    const submit = () => {
        const val = input.value.trim();
        if (!val) return;
        addUserMessage(val);
        answers[q.id] = val;
        nextStep();
    };

    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(sendBtn);
    $inputArea.appendChild(wrapper);
    input.focus();
}

// ========== Flow Control ==========
function nextStep() {
    $inputArea.innerHTML = "";
    currentStep++;

    if (currentStep >= QUESTIONS.length) {
        updateProgress();
        $progressFill.style.width = "100%";
        $progressText.textContent = "분석 중...";

        addBotMessage("감사합니다! 입력하신 정보를 바탕으로 최적의 보험 포트폴리오를 설계 중입니다...");

        // Show typing indicator
        const typing = document.createElement("div");
        typing.className = "message bot";
        typing.id = "typingMsg";
        typing.innerHTML = `
            <div class="msg-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" fill="#4F6BFF"/>
                    <path d="M12 7v4M12 14v1M9 11a3 3 0 116 0 3 3 0 01-6 0z" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        $chatMessages.appendChild(typing);
        scrollToBottom();

        setTimeout(() => {
            showResult();
        }, 2500);
    } else {
        setTimeout(() => showQuestion(), 500);
    }
}

// ========== Result Generation ==========
function generateRecommendation() {
    const age = answers.age || "30대";
    const gender = answers.gender || "남성";
    const family = answers.family || "미혼 (1인)";
    const concerns = answers.concerns || ["질병/건강"];
    const budget = answers.budget || 15;
    const existing = answers.existing || "없음";
    const occupation = answers.occupation || "사무직";

    const recommendations = [];
    let totalPremium = 0;

    // 실손의료보험 (거의 필수)
    if (existing === "없음" || existing === "잘 모르겠음") {
        recommendations.push({
            name: "실손의료보험",
            sub: "4세대 실손",
            icon: "&#127973;",
            iconBg: "#DBEAFE",
            priority: "high",
            premium: 2,
            coverage: "입원/통원 의료비 보장",
            period: "15년 갱신형",
            reason: "기본 의료비 보장의 핵심",
        });
        totalPremium += 2;
    }

    // 건강/질병 관련
    if (concerns.includes("질병/건강")) {
        const premium = age === "20대" ? 3 : age === "30대" ? 4 : age === "40대" ? 5 : 6;
        recommendations.push({
            name: "종합건강보험",
            sub: "3대 질병 + 수술비",
            icon: "&#128154;",
            iconBg: "#D1FAE5",
            priority: "high",
            premium: premium,
            coverage: "암/뇌/심장 진단비 + 수술비",
            period: "20년납 80세 보장",
            reason: "3대 질병 대비 핵심 보장",
        });
        totalPremium += premium;
    }

    // 사고/상해
    if (concerns.includes("사고/상해") || occupation === "생산/기술직") {
        recommendations.push({
            name: "상해보험",
            sub: "일상생활 + 교통상해",
            icon: "&#129657;",
            iconBg: "#FEF3C7",
            priority: occupation === "생산/기술직" ? "high" : "medium",
            premium: 2,
            coverage: "상해 사망/후유장해/수술비",
            period: "10년 갱신형",
            reason: "예기치 못한 사고 대비",
        });
        totalPremium += 2;
    }

    // 사망/유족
    if (concerns.includes("사망/유족보장") || family.includes("자녀")) {
        const premium = age === "20대" ? 3 : age === "30대" ? 4 : 5;
        recommendations.push({
            name: "정기보험",
            sub: "가족 생활자금 보장",
            icon: "&#128106;",
            iconBg: "#EDE9FE",
            priority: family.includes("자녀") ? "high" : "medium",
            premium: premium,
            coverage: "사망보험금 1~3억",
            period: "20년 만기",
            reason: "가족의 경제적 안정 보장",
        });
        totalPremium += premium;
    }

    // 노후/연금
    if (concerns.includes("노후/연금")) {
        const premium = Math.max(5, Math.min(budget - totalPremium - 2, 15));
        if (premium >= 5) {
            recommendations.push({
                name: "연금보험",
                sub: "노후 생활자금",
                icon: "&#127793;",
                iconBg: "#FEE2E2",
                priority: age === "40대" || age === "50대" ? "high" : "medium",
                premium: premium,
                coverage: "65세부터 월 연금 수령",
                period: "10~20년 납입",
                reason: "국민연금 부족분 보완",
            });
            totalPremium += premium;
        }
    }

    // 자녀 교육
    if (concerns.includes("자녀 교육") && family.includes("자녀")) {
        recommendations.push({
            name: "자녀보험",
            sub: "교육비 + 건강보장",
            icon: "&#127891;",
            iconBg: "#DBEAFE",
            priority: "medium",
            premium: 3,
            coverage: "자녀 질병/상해 + 교육자금",
            period: "30세 만기",
            reason: "자녀 성장기 종합 보장",
        });
        totalPremium += 3;
    }

    // 재산/화재
    if (concerns.includes("재산/화재")) {
        recommendations.push({
            name: "화재보험",
            sub: "주택/재산 보장",
            icon: "&#127968;",
            iconBg: "#FEF3C7",
            priority: "low",
            premium: 1,
            coverage: "화재/풍수해/도난 보장",
            period: "1년 갱신형",
            reason: "주거 재산 보호",
        });
        totalPremium += 1;
    }

    // 자동차
    if (concerns.includes("운전/자동차")) {
        recommendations.push({
            name: "자동차보험",
            sub: "종합 + 운전자보험",
            icon: "&#128663;",
            iconBg: "#DBEAFE",
            priority: "high",
            premium: 4,
            coverage: "대인/대물/자차 + 벌금/변호사",
            period: "1년 갱신형",
            reason: "운전 관련 종합 보장",
        });
        totalPremium += 4;
    }

    // 예산 초과 시 조정
    if (totalPremium > budget) {
        // 우선순위 낮은 것부터 제거
        recommendations.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
        });

        let adjusted = [];
        let sum = 0;
        for (const rec of recommendations) {
            if (sum + rec.premium <= budget) {
                adjusted.push(rec);
                sum += rec.premium;
            }
        }
        totalPremium = sum;
        return { recommendations: adjusted, totalPremium, budget };
    }

    return { recommendations, totalPremium, budget };
}

function showResult() {
    const { recommendations, totalPremium, budget } = generateRecommendation();

    $chatSection.classList.add("hidden");
    $resultSection.classList.remove("hidden");

    const coverageScores = computeCoverage(recommendations);
    const tips = generateTips();

    let html = "";

    // Summary card
    html += `
        <div class="result-summary">
            <h2>${answers.age} ${answers.gender}을 위한 맞춤 설계</h2>
            <p>${answers.family} · ${answers.occupation}</p>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${recommendations.length}개</span>
                    <span class="stat-label">추천 보험</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${totalPremium}만원</span>
                    <span class="stat-label">월 보험료</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${budget}만원</span>
                    <span class="stat-label">예산</span>
                </div>
            </div>
        </div>
    `;

    // Coverage chart
    html += `<div class="coverage-section"><h3>보장 분석</h3>`;
    coverageScores.forEach((item) => {
        const cls = item.score >= 70 ? "fill-high" : item.score >= 40 ? "fill-medium" : "fill-low";
        html += `
            <div class="coverage-bar-item">
                <div class="coverage-bar-label">
                    <span>${item.label}</span>
                    <span>${item.score}%</span>
                </div>
                <div class="coverage-bar-bg">
                    <div class="coverage-bar-fill ${cls}" style="width: 0%;" data-width="${item.score}%"></div>
                </div>
            </div>
        `;
    });
    html += `</div>`;

    // Insurance cards
    recommendations.forEach((rec) => {
        html += `
            <div class="insurance-card">
                <div class="insurance-card-header">
                    <div class="insurance-type">
                        <div class="insurance-icon" style="background:${rec.iconBg}">${rec.icon}</div>
                        <div>
                            <div class="insurance-name">${rec.name}</div>
                            <div class="insurance-sub">${rec.sub}</div>
                        </div>
                    </div>
                    <span class="insurance-priority priority-${rec.priority}">
                        ${rec.priority === "high" ? "필수" : rec.priority === "medium" ? "권장" : "선택"}
                    </span>
                </div>
                <div class="insurance-details">
                    <div class="detail-item">
                        <span class="detail-label">월 보험료</span>
                        <span class="detail-value">${rec.premium}만원</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">보장 기간</span>
                        <span class="detail-value">${rec.period}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">주요 보장</span>
                        <span class="detail-value">${rec.coverage}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">추천 사유</span>
                        <span class="detail-value">${rec.reason}</span>
                    </div>
                </div>
            </div>
        `;
    });

    // Tips
    html += `
        <div class="tip-section">
            <h3>AI 설계사의 조언</h3>
            <ul>
                ${tips.map((t) => `<li>${t}</li>`).join("")}
            </ul>
        </div>
    `;

    // Actions
    html += `
        <div class="result-actions">
            <button class="action-btn action-primary" onclick="alert('실제 서비스에서는 상담사 연결이 진행됩니다.')">전문 상담 신청</button>
            <button class="action-btn action-secondary" onclick="document.getElementById('restartBtn').click()">다시 설계하기</button>
        </div>
    `;

    $resultContent.innerHTML = html;

    // Animate coverage bars
    setTimeout(() => {
        document.querySelectorAll(".coverage-bar-fill").forEach((bar) => {
            bar.style.width = bar.dataset.width;
        });
    }, 300);
}

function computeCoverage(recs) {
    const names = recs.map((r) => r.name);
    const scores = [];

    scores.push({
        label: "의료비 보장",
        score: names.includes("실손의료보험") ? 90 : names.includes("종합건강보험") ? 50 : 10,
    });
    scores.push({
        label: "중대질병 보장",
        score: names.includes("종합건강보험") ? 85 : 15,
    });
    scores.push({
        label: "사고/상해 보장",
        score: names.includes("상해보험") ? 80 : names.includes("자동차보험") ? 40 : 10,
    });
    scores.push({
        label: "가족 보장",
        score: names.includes("정기보험") ? 85 : names.includes("자녀보험") ? 50 : 10,
    });
    scores.push({
        label: "노후 대비",
        score: names.includes("연금보험") ? 75 : 10,
    });

    return scores;
}

function generateTips() {
    const tips = [];
    const age = answers.age;
    const family = answers.family;
    const budget = answers.budget;
    const existing = answers.existing;

    if (existing === "없음") {
        tips.push("현재 보험이 없으시므로, 실손의료보험을 최우선으로 가입하시는 것을 추천합니다.");
    }

    if (age === "20대" || age === "30대") {
        tips.push("젊은 나이에 가입할수록 보험료가 저렴합니다. 지금이 가입 적기입니다.");
    }

    if (age === "40대" || age === "50대") {
        tips.push("3대 질병(암, 뇌혈관, 심장) 진단비를 넉넉하게 설정하시는 것이 중요합니다.");
    }

    if (family && family.includes("자녀")) {
        tips.push("자녀가 있는 경우, 가장의 정기보험(사망보장)은 필수입니다.");
    }

    if (budget <= 10) {
        tips.push("예산이 제한적이라면, 실손 + 3대 질병 보장에 집중하시는 것이 효율적입니다.");
    }

    if (budget >= 30) {
        tips.push("여유 예산은 연금보험이나 저축성 보험으로 활용하시면 노후 대비에 도움이 됩니다.");
    }

    tips.push("보험 가입 전, 반드시 여러 보험사의 상품을 비교해 보시기 바랍니다.");

    return tips;
}
