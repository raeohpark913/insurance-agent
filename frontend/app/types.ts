// ─── 공통 타입 ────────────────────────────────────────────────────────────────

export type MatchGrade = 'high' | 'medium' | 'low' | 'miss';

export interface CoverageItem {
  name: string;
  amount: number; // 만원
}

export interface PlanProduct {
  name: string;
  company: string;
  category: string;
  fitScore: number;
  matchGrade: MatchGrade;
  monthlyPremium?: number;
  coverage: CoverageItem[];
  reasons: string[];
  warnings?: string[];
  itemScores?: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  blocked?: boolean;
  flagged?: boolean;
}

// ─── 폼 데이터 ────────────────────────────────────────────────────────────────

export interface FormData {
  // 객관적 정보
  gender:          string;   // 'male' | 'female'
  birthYear:       string;
  birthMonth:      string;
  birthDay:        string;
  height:          string;   // cm
  weight:          string;   // kg
  smoking:         string;   // 'none' | 'past' | 'current'
  smokingFreq:     string;
  drinking:        string;   // 'none' | 'light' | 'moderate' | 'heavy'
  pastConditions:  string[]; // 과거 병력
  currentMeds:     string;   // 현재 복용약
  familyHistory:   string[]; // 가족력
  occupation:      string;
  currentInsurance: string;

  // 주관적 정보
  purpose:         string[];  // 가입 목적 (복수)
  knowledgeLevel:  string;    // 'low' | 'medium' | 'high'
  monthlyBudget:   string;    // 만원
  coverageVsCost:  string;    // 'cost' | 'balanced' | 'coverage'
  refundPref:      string;    // 'refund' | 'no-refund' | 'either'
  paymentPeriod:   string;    // '10' | '20' | '30' | 'full'
  coveragePeriod:  string;    // '80' | '90' | '100' | 'whole'
  renewalPref:     string;    // 'renewal' | 'non-renewal' | 'either'
  preferredTypes:  string[];  // 선호 보험 종류 (복수)
  urgency:         string;    // 'immediate' | 'month' | 'exploring'

  // 우선순위 (1~4순위 선택)
  priorities: string[];
}

export const INITIAL_FORM: FormData = {
  gender: '', birthYear: '', birthMonth: '', birthDay: '',
  height: '', weight: '',
  smoking: '', smokingFreq: '',
  drinking: '',
  pastConditions: [], currentMeds: '', familyHistory: [],
  occupation: '', currentInsurance: '',
  purpose: [], knowledgeLevel: '', monthlyBudget: '',
  coverageVsCost: '', refundPref: '', paymentPeriod: '',
  coveragePeriod: '', renewalPref: '', preferredTypes: [],
  urgency: '',
  priorities: [],
};

export const PRIORITY_OPTIONS = [
  '암/중증질병 보장',
  '보험료 저렴함',
  '환급률',
  '납입기간 일치',
  '보장기간 일치',
  '갱신형 여부 일치',
];

// 폼 데이터 → 자연어 변환
export function formatFormDataToMessage(f: FormData): string {
  const age = f.birthYear ? new Date().getFullYear() - parseInt(f.birthYear) : null;
  const bmi = f.height && f.weight
    ? (parseFloat(f.weight) / Math.pow(parseFloat(f.height) / 100, 2)).toFixed(1)
    : null;

  const smokingText = f.smoking === 'none' ? '비흡연'
    : f.smoking === 'past' ? `과거 흡연 (현재 금연)`
    : f.smokingFreq ? `흡연 중 (${f.smokingFreq})` : '흡연 중';

  const drinkingMap: Record<string, string> = {
    none: '음주 안 함', light: '가끔 (월 1-2회)',
    moderate: '적당히 (주 1-2회)', heavy: '자주 (주 3회 이상)',
  };

  const coverageVsCostText: Record<string, string> = {
    cost: '보험료 절약 우선', balanced: '균형 있게', coverage: '보장 강화 우선',
  };
  const refundText: Record<string, string> = {
    refund: '환급형 선호', 'no-refund': '비환급형 선호', either: '상관없음',
  };
  const renewalText: Record<string, string> = {
    renewal: '갱신형 선호', 'non-renewal': '비갱신형 선호', either: '상관없음',
  };
  const payText: Record<string, string> = {
    '10': '10년납', '20': '20년납', '30': '30년납', full: '전기납',
  };
  const covText: Record<string, string> = {
    '80': '80세', '90': '90세', '100': '100세', whole: '종신',
  };
  const urgencyText: Record<string, string> = {
    immediate: '즉시 가입 희망', month: '1개월 내 가입 희망', exploring: '알아보는 중',
  };
  const knowledgeText: Record<string, string> = {
    low: '낮음 (잘 모름)', medium: '보통', high: '높음 (잘 알고 있음)',
  };

  return `다음 고객 정보를 바탕으로 보험 설계안을 작성해주세요.

【기본 정보】
성별: ${f.gender === 'male' ? '남성' : '여성'}
나이: ${age ? `${age}세 (${f.birthYear}년생)` : '미입력'}
신장/체중: ${f.height || '?'}cm / ${f.weight || '?'}kg${bmi ? ` (BMI ${bmi})` : ''}

【생활 습관】
흡연: ${smokingText}
음주: ${drinkingMap[f.drinking] || '미입력'}

【건강 상태】
과거 병력: ${f.pastConditions.length ? f.pastConditions.join(', ') : '없음'}
현재 복용약: ${f.currentMeds || '없음'}
가족력: ${f.familyHistory.length ? f.familyHistory.join(', ') : '없음'}

【직업 & 현재 보험】
직업: ${f.occupation || '미입력'}
현재 가입 보험: ${f.currentInsurance || '없음'}

【보험 목적 & 예산】
가입 목적: ${f.purpose.length ? f.purpose.join(', ') : '미입력'}
월 예산: ${f.monthlyBudget ? `${f.monthlyBudget}만원` : '미입력'}
긴급도: ${urgencyText[f.urgency] || '미입력'}
보험 이해도: ${knowledgeText[f.knowledgeLevel] || '미입력'}

【세부 선호도】
보험료 vs 보장: ${coverageVsCostText[f.coverageVsCost] || '미입력'}
환급 여부: ${refundText[f.refundPref] || '미입력'}
납입 기간: ${payText[f.paymentPeriod] || '미입력'}
보장 기간: ${covText[f.coveragePeriod] || '미입력'}
갱신형 여부: ${renewalText[f.renewalPref] || '미입력'}
선호 보험 종류: ${f.preferredTypes.length ? f.preferredTypes.join(', ') : '미입력'}

【중요 항목 우선순위】
${f.priorities.map((p, i) => `${i + 1}순위: ${p}`).join('\n') || '미입력'}`;
}
