'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, MessageSquare, X } from 'lucide-react';
import ChatPanel from './ChatPanel';
import type { FormData, ChatMessage } from '../types';
import { PRIORITY_OPTIONS } from '../types';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id:      'basic',
    title:   '기본 정보',
    desc:    '성별, 나이, 신체 정보를 입력해주세요',
    context: '신체 정보가 왜 필요한지, BMI가 보험에 미치는 영향 등을 물어보실 수 있어요.',
  },
  {
    id:      'lifestyle',
    title:   '생활 습관',
    desc:    '흡연·음주 여부를 알려주세요',
    context: '흡연이나 음주가 보험료·가입 조건에 어떤 영향을 주는지 물어보세요.',
  },
  {
    id:      'health',
    title:   '건강 상태',
    desc:    '과거 병력과 가족력을 입력해주세요',
    context: '어떤 병력이 보험 가입에 영향을 주는지, 간편심사형이 뭔지 등을 물어보세요.',
  },
  {
    id:      'work',
    title:   '직업 & 현재 보험',
    desc:    '직업과 현재 가입된 보험을 알려주세요',
    context: '직업이 보험에 미치는 영향, 중복 보장 여부 등을 물어보세요.',
  },
  {
    id:      'goal',
    title:   '보험 목적 & 예산',
    desc:    '원하시는 방향과 월 납입 예산을 설정하세요',
    context: '적정 보험료 수준, 어떤 보험이 목적에 맞는지 물어보세요.',
  },
  {
    id:      'pref',
    title:   '세부 선호도',
    desc:    '상세한 보험 조건을 선택해주세요',
    context: '갱신형/비갱신형 차이, 납입기간·보장기간 선택 기준 등을 물어보세요.',
  },
  {
    id:      'rank',
    title:   '중요 항목 순위',
    desc:    '가장 중요하게 생각하는 항목 4가지를 순서대로 선택해주세요',
    context: '각 항목이 Fit Score에 어떻게 반영되는지 물어보세요.',
  },
];

// ─── UI 헬퍼 ──────────────────────────────────────────────────────────────────

function OptionBtn({
  selected, onClick, children, fullWidth,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
        border:      `2px solid ${selected ? '#3182F6' : '#E5E8EB'}`,
        background:  selected ? '#EFF6FF' : '#fff',
        color:       selected ? '#3182F6' : '#3D4A5C',
        fontWeight:  selected ? 700 : 400,
        fontSize:    14, fontFamily: 'inherit',
        transition:  'all 0.15s',
        width:       fullWidth ? '100%' : 'auto',
        display:     'flex', alignItems: 'center', gap: 6,
        justifyContent: 'center',
      }}
    >
      {selected && <Check size={14} />}
      {children}
    </button>
  );
}

function ChipBtn({
  selected, onClick, children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
        border:     `1.5px solid ${selected ? '#3182F6' : '#E5E8EB'}`,
        background: selected ? '#3182F6' : '#fff',
        color:      selected ? '#fff' : '#3D4A5C',
        fontWeight: selected ? 600 : 400,
        fontSize: 13, fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: '#3D4A5C', marginBottom: 8 }}>
      {children}
    </p>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text', suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, padding: '10px 14px', borderRadius: 10,
          border: '1.5px solid #E5E8EB', fontSize: 14, color: '#191F28',
          outline: 'none', fontFamily: 'inherit', background: '#fff',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = '#3182F6')}
        onBlur={e  => (e.target.style.borderColor = '#E5E8EB')}
      />
      {suffix && <span style={{ fontSize: 13, color: '#6B7684', flexShrink: 0 }}>{suffix}</span>}
    </div>
  );
}

function TextArea({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 10,
        border: '1.5px solid #E5E8EB', fontSize: 14, color: '#191F28',
        outline: 'none', fontFamily: 'inherit', resize: 'vertical',
        background: '#fff', transition: 'border-color 0.15s',
      }}
      onFocus={e => (e.target.style.borderColor = '#3182F6')}
      onBlur={e  => (e.target.style.borderColor = '#E5E8EB')}
    />
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 24 }}>{children}</div>;
}

// ─── 각 Step 폼 ───────────────────────────────────────────────────────────────

function StepBasic({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const years = Array.from({ length: 80 }, (_, i) => String(2005 - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const days   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <>
      <Section>
        <Label>성별</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          <OptionBtn selected={data.gender === 'male'}   onClick={() => set('gender', 'male')}>남성</OptionBtn>
          <OptionBtn selected={data.gender === 'female'} onClick={() => set('gender', 'female')}>여성</OptionBtn>
        </div>
      </Section>

      <Section>
        <Label>생년월일</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: data.birthYear,  key: 'birthYear',  opts: years,  placeholder: '년도' },
            { val: data.birthMonth, key: 'birthMonth', opts: months, placeholder: '월' },
            { val: data.birthDay,   key: 'birthDay',   opts: days,   placeholder: '일' },
          ].map(({ val, key, opts, placeholder }) => (
            <select
              key={key}
              value={val}
              onChange={e => set(key as keyof FormData, e.target.value)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 10,
                border: '1.5px solid #E5E8EB', fontSize: 14,
                color: val ? '#191F28' : '#B0B8C1', fontFamily: 'inherit',
                background: '#fff', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">{placeholder}</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section>
          <Label>신장</Label>
          <TextInput value={data.height} onChange={v => set('height', v)} placeholder="예: 170" type="number" suffix="cm" />
        </Section>
        <Section>
          <Label>체중</Label>
          <TextInput value={data.weight} onChange={v => set('weight', v)} placeholder="예: 65" type="number" suffix="kg" />
        </Section>
      </div>
    </>
  );
}

function StepLifestyle({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  return (
    <>
      <Section>
        <Label>흡연 여부</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { v: 'none',    label: '비흡연' },
            { v: 'past',    label: '과거 흡연 (현재 금연)' },
            { v: 'current', label: '현재 흡연 중' },
          ].map(({ v, label }) => (
            <OptionBtn key={v} selected={data.smoking === v} onClick={() => set('smoking', v)}>
              {label}
            </OptionBtn>
          ))}
        </div>
        {data.smoking === 'current' && (
          <div style={{ marginTop: 12 }}>
            <Label>흡연 빈도</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['하루 0.5갑 미만', '하루 0.5~1갑', '하루 1갑 이상'].map(freq => (
                <ChipBtn key={freq} selected={data.smokingFreq === freq} onClick={() => set('smokingFreq', freq)}>
                  {freq}
                </ChipBtn>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section>
        <Label>음주 여부 및 빈도</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { v: 'none',     label: '음주 안 함' },
            { v: 'light',    label: '가끔 (월 1-2회)' },
            { v: 'moderate', label: '적당히 (주 1-2회)' },
            { v: 'heavy',    label: '자주 (주 3회 이상)' },
          ].map(({ v, label }) => (
            <OptionBtn key={v} selected={data.drinking === v} onClick={() => set('drinking', v)}>
              {label}
            </OptionBtn>
          ))}
        </div>
      </Section>
    </>
  );
}

function StepHealth({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const PAST_OPTIONS = ['고혈압', '당뇨', '암', '뇌혈관질환', '심장질환', '간질환', '신장질환', '척추질환', '없음'];
  const FAMILY_OPTIONS = ['고혈압', '당뇨', '암', '뇌혈관질환', '심장질환', '없음'];

  const toggleArr = (key: 'pastConditions' | 'familyHistory', val: string) => {
    const arr = data[key] as string[];
    if (val === '없음') {
      set(key, ['없음']);
      return;
    }
    const next = arr.includes(val)
      ? arr.filter(v => v !== val)
      : [...arr.filter(v => v !== '없음'), val];
    set(key, next);
  };

  return (
    <>
      <Section>
        <Label>과거 병력 (해당 항목 모두 선택)</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PAST_OPTIONS.map(opt => (
            <ChipBtn
              key={opt}
              selected={(data.pastConditions as string[]).includes(opt)}
              onClick={() => toggleArr('pastConditions', opt)}
            >
              {opt}
            </ChipBtn>
          ))}
        </div>
      </Section>

      <Section>
        <Label>현재 복용 중인 약 (있으면 간략히 작성)</Label>
        <TextArea
          value={data.currentMeds}
          onChange={v => set('currentMeds', v)}
          placeholder="예: 고혈압약 복용 중, 없음"
        />
      </Section>

      <Section>
        <Label>가족력 (부모·형제자매 기준, 해당 항목 모두 선택)</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FAMILY_OPTIONS.map(opt => (
            <ChipBtn
              key={opt}
              selected={(data.familyHistory as string[]).includes(opt)}
              onClick={() => toggleArr('familyHistory', opt)}
            >
              {opt}
            </ChipBtn>
          ))}
        </div>
      </Section>
    </>
  );
}

function StepWork({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const JOB_EXAMPLES = ['회사원 (사무직)', '자영업', '교사/공무원', '건설/현장직', '운전직', '전문직 (의사/변호사 등)'];

  return (
    <>
      <Section>
        <Label>직업</Label>
        <TextInput
          value={data.occupation}
          onChange={v => set('occupation', v)}
          placeholder="예: 회사원 (사무직)"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {JOB_EXAMPLES.map(j => (
            <button
              key={j}
              type="button"
              onClick={() => set('occupation', j)}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 16,
                border: '1px solid #E5E8EB', background: data.occupation === j ? '#EFF6FF' : '#F9FAFB',
                color: data.occupation === j ? '#3182F6' : '#6B7684',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
              }}
            >
              {j}
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <Label>현재 가입된 보험 (없으면 "없음")</Label>
        <TextArea
          value={data.currentInsurance}
          onChange={v => set('currentInsurance', v)}
          placeholder="예: 실비보험 A사, 암보험 B사 (연간 100만원) &#13;없으면 '없음' 입력"
        />
        <p style={{ fontSize: 11, color: '#B0B8C1', marginTop: 6 }}>
          💡 현재 보험 정보가 있어야 보장 공백을 정확히 분석할 수 있어요.
        </p>
      </Section>
    </>
  );
}

function StepGoal({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const PURPOSES = ['암·중증질병 대비', '사망 시 가족 보장', '노후·연금 준비', '상해·사고 대비', '실손 의료비 보장'];

  const togglePurpose = (p: string) => {
    const arr = data.purpose as string[];
    set('purpose', arr.includes(p) ? arr.filter(v => v !== p) : [...arr, p]);
  };

  return (
    <>
      <Section>
        <Label>보험 가입 목적 (복수 선택 가능)</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PURPOSES.map(p => (
            <ChipBtn
              key={p}
              selected={(data.purpose as string[]).includes(p)}
              onClick={() => togglePurpose(p)}
            >
              {p}
            </ChipBtn>
          ))}
        </div>
      </Section>

      <Section>
        <Label>월 납입 가능 금액</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['5만원 이하', '5~10만원', '10~20만원', '20~30만원', '30만원 이상'].map(b => (
            <OptionBtn key={b} selected={data.monthlyBudget === b} onClick={() => set('monthlyBudget', b)}>
              {b}
            </OptionBtn>
          ))}
        </div>
      </Section>

      <Section>
        <Label>보험에 대한 이해도</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { v: 'low',    label: '잘 모름', sub: '쉽게 설명해주세요' },
            { v: 'medium', label: '보통',    sub: '기본 개념은 알아요' },
            { v: 'high',   label: '잘 앎',   sub: '전문 용어도 괜찮아요' },
          ].map(({ v, label, sub }) => (
            <button
              key={v}
              type="button"
              onClick={() => set('knowledgeLevel', v)}
              style={{
                flex: 1, minWidth: 90, padding: '12px 10px', borderRadius: 12,
                border:      `2px solid ${data.knowledgeLevel === v ? '#3182F6' : '#E5E8EB'}`,
                background:  data.knowledgeLevel === v ? '#EFF6FF' : '#fff',
                cursor:      'pointer', fontFamily: 'inherit', textAlign: 'center',
                transition:  'all 0.15s',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: data.knowledgeLevel === v ? '#3182F6' : '#191F28' }}>
                {label}
              </p>
              <p style={{ fontSize: 11, color: '#B0B8C1', marginTop: 3 }}>{sub}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <Label>가입 긴급도</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { v: 'immediate', label: '즉시 가입 희망' },
            { v: 'month',     label: '1개월 내 예정' },
            { v: 'exploring', label: '천천히 알아보는 중' },
          ].map(({ v, label }) => (
            <OptionBtn key={v} selected={data.urgency === v} onClick={() => set('urgency', v)}>
              {label}
            </OptionBtn>
          ))}
        </div>
      </Section>
    </>
  );
}

function StepPref({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const INS_TYPES = ['암보험', '건강보험', '실손보험', '종신보험', '정기보험', '연금보험', '상해보험'];

  const toggleType = (t: string) => {
    const arr = data.preferredTypes as string[];
    set('preferredTypes', arr.includes(t) ? arr.filter(v => v !== t) : [...arr, t]);
  };

  return (
    <>
      <Section>
        <Label>보험료 vs 보장 우선순위</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { v: 'cost',     label: '보험료 절약 우선', sub: '저렴한 게 최우선' },
            { v: 'balanced', label: '균형 있게',        sub: '둘 다 고려' },
            { v: 'coverage', label: '보장 강화 우선',   sub: '보장 범위가 최우선' },
          ].map(({ v, label, sub }) => (
            <button
              key={v}
              type="button"
              onClick={() => set('coverageVsCost', v)}
              style={{
                flex: 1, minWidth: 90, padding: '12px 10px', borderRadius: 12,
                border:     `2px solid ${data.coverageVsCost === v ? '#3182F6' : '#E5E8EB'}`,
                background: data.coverageVsCost === v ? '#EFF6FF' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: data.coverageVsCost === v ? '#3182F6' : '#191F28' }}>
                {label}
              </p>
              <p style={{ fontSize: 11, color: '#B0B8C1', marginTop: 2 }}>{sub}</p>
            </button>
          ))}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section>
          <Label>환급 여부 선호</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { v: 'refund',    label: '환급형 (보험료 일부 돌려받음)' },
              { v: 'no-refund', label: '비환급형 (보험료 낮음)' },
              { v: 'either',    label: '상관없음' },
            ].map(({ v, label }) => (
              <OptionBtn key={v} selected={data.refundPref === v} onClick={() => set('refundPref', v)} fullWidth>
                {label}
              </OptionBtn>
            ))}
          </div>
        </Section>

        <Section>
          <Label>갱신형 vs 비갱신형</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { v: 'renewal',     label: '갱신형 (초기 보험료 낮음)' },
              { v: 'non-renewal', label: '비갱신형 (보험료 고정)' },
              { v: 'either',      label: '상관없음' },
            ].map(({ v, label }) => (
              <OptionBtn key={v} selected={data.renewalPref === v} onClick={() => set('renewalPref', v)} fullWidth>
                {label}
              </OptionBtn>
            ))}
          </div>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section>
          <Label>납입 기간 선호</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { v: '10', label: '10년납' },
              { v: '20', label: '20년납' },
              { v: '30', label: '30년납' },
              { v: 'full', label: '전기납' },
            ].map(({ v, label }) => (
              <ChipBtn key={v} selected={data.paymentPeriod === v} onClick={() => set('paymentPeriod', v)}>
                {label}
              </ChipBtn>
            ))}
          </div>
        </Section>

        <Section>
          <Label>보장 기간 선호</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { v: '80',   label: '80세' },
              { v: '90',   label: '90세' },
              { v: '100',  label: '100세' },
              { v: 'whole', label: '종신' },
            ].map(({ v, label }) => (
              <ChipBtn key={v} selected={data.coveragePeriod === v} onClick={() => set('coveragePeriod', v)}>
                {label}
              </ChipBtn>
            ))}
          </div>
        </Section>
      </div>

      <Section>
        <Label>선호하는 보험 종류 (복수 선택)</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {INS_TYPES.map(t => (
            <ChipBtn
              key={t}
              selected={(data.preferredTypes as string[]).includes(t)}
              onClick={() => toggleType(t)}
            >
              {t}
            </ChipBtn>
          ))}
        </div>
      </Section>
    </>
  );
}

function StepRank({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const priorities = data.priorities as string[];

  const handleClick = (item: string) => {
    const idx = priorities.indexOf(item);
    if (idx >= 0) {
      // 이미 선택 → 제거
      set('priorities', priorities.filter(p => p !== item));
    } else if (priorities.length < 4) {
      // 새로 추가
      set('priorities', [...priorities, item]);
    }
  };

  return (
    <>
      <p style={{ fontSize: 13, color: '#6B7684', marginBottom: 16, lineHeight: 1.6 }}>
        보험 매칭 점수 계산에 직접 반영됩니다.<br />
        순서대로 클릭해서 <strong>4개 항목</strong>을 선택해주세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PRIORITY_OPTIONS.map(item => {
          const rank = priorities.indexOf(item) + 1;
          const selected = rank > 0;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleClick(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                border:     `2px solid ${selected ? '#3182F6' : '#E5E8EB'}`,
                background: selected ? '#EFF6FF' : '#fff',
                cursor:     priorities.length >= 4 && !selected ? 'default' : 'pointer',
                opacity:    priorities.length >= 4 && !selected ? 0.45 : 1,
                fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: selected ? '#3182F6' : '#F2F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected
                  ? <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{rank}</span>
                  : <span style={{ fontSize: 11, color: '#B0B8C1' }}>?</span>
                }
              </div>
              <span style={{ fontSize: 14, fontWeight: selected ? 700 : 400, color: selected ? '#3182F6' : '#3D4A5C' }}>
                {item}
              </span>
              {selected && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3182F6', fontWeight: 600 }}>
                  {rank}순위
                </span>
              )}
            </button>
          );
        })}
      </div>

      {priorities.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: '#6B7684', marginBottom: 6 }}>선택한 순위</p>
          {priorities.map((p, i) => (
            <p key={i} style={{ fontSize: 13, color: '#191F28', lineHeight: 1.8 }}>
              <span style={{ fontWeight: 700, color: '#3182F6' }}>{i + 1}순위</span> — {p}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

// ─── 메인 FormWizard ──────────────────────────────────────────────────────────

interface Props {
  onComplete: (products: import('../types').PlanProduct[]) => void;
  onBack: () => void;
}

export default function FormWizard({ onComplete, onBack }: Props) {
  const [step,         setStep]         = useState(0);
  const [formData,     setFormData]     = useState<FormData>({
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
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading,  setChatLoading]  = useState(false);
  const [showChat,     setShowChat]     = useState(false);   // 모바일용
  const [submitting,   setSubmitting]   = useState(false);

  const set = useCallback((key: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const sendChat = async (text: string) => {
    const stepLabel = STEPS[step].title;
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: text, timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `[${stepLabel} 단계 질문] ${text}` }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   data.response ?? '답변을 가져오지 못했습니다.',
        timestamp: new Date(),
        blocked:   data.blocked,
        flagged:   data.flagged,
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: '서버 연결에 실패했습니다.', timestamp: new Date(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        gender:           formData.gender,
        birth_year:       formData.birthYear   || undefined,
        height:           formData.height       || undefined,
        weight:           formData.weight       || undefined,
        smoking:          formData.smoking      || undefined,
        smoking_freq:     formData.smokingFreq  || undefined,
        drinking:         formData.drinking     || undefined,
        past_conditions:  formData.pastConditions.length  ? formData.pastConditions  : undefined,
        current_meds:     formData.currentMeds  || undefined,
        family_history:   formData.familyHistory.length   ? formData.familyHistory   : undefined,
        occupation:       formData.occupation   || undefined,
        current_insurance: formData.currentInsurance || undefined,
        purpose:          formData.purpose.length         ? formData.purpose         : undefined,
        knowledge_level:  formData.knowledgeLevel || undefined,
        monthly_budget:   formData.monthlyBudget  || undefined,
        coverage_vs_cost: formData.coverageVsCost || undefined,
        refund_pref:      formData.refundPref     || undefined,
        payment_period:   formData.paymentPeriod  || undefined,
        coverage_period:  formData.coveragePeriod || undefined,
        renewal_pref:     formData.renewalPref    || undefined,
        preferred_types:  formData.preferredTypes.length  ? formData.preferredTypes  : undefined,
        urgency:          formData.urgency        || undefined,
        priorities:       formData.priorities.length      ? formData.priorities      : undefined,
      };

      const res  = await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      onComplete(data.products ?? []);
    } catch {
      alert('설계안 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const progress   = ((step + 1) / STEPS.length) * 100;

  const StepContent = [StepBasic, StepLifestyle, StepHealth, StepWork, StepGoal, StepPref, StepRank][step];

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'Pretendard', -apple-system, system-ui, sans-serif",
      background: '#F9FAFB',
    }}>

      {/* 헤더 */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E5E8EB',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button
          onClick={handlePrev}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#6B7684', padding: '4px 8px', borderRadius: 8,
            fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={16} /> 이전
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#191F28' }}>{STEPS[step].title}</p>
          <p style={{ fontSize: 11, color: '#B0B8C1' }}>{step + 1} / {STEPS.length}</p>
        </div>

        {/* 모바일 AI 도우미 토글 */}
        <button
          onClick={() => setShowChat(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: showChat ? '#EFF6FF' : '#F9FAFB',
            border:     `1px solid ${showChat ? '#3182F6' : '#E5E8EB'}`,
            borderRadius: 8, padding: '5px 10px',
            fontSize: 12, color: showChat ? '#3182F6' : '#6B7684',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <MessageSquare size={13} />
          AI 도우미
          {chatMessages.length > 0 && (
            <span style={{
              background: '#3182F6', color: '#fff',
              borderRadius: 10, padding: '0 5px', fontSize: 10, lineHeight: '16px',
            }}>
              {chatMessages.filter(m => m.role === 'assistant').length}
            </span>
          )}
        </button>
      </header>

      {/* 진행 바 */}
      <div style={{ height: 3, background: '#F2F4F6', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: '#3182F6',
          width: `${progress}%`, transition: 'width 0.35s ease',
        }} />
      </div>

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>

        {/* 폼 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>

            {/* 단계 헤더 */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#191F28', marginBottom: 6 }}>
                {STEPS[step].title}
              </h2>
              <p style={{ fontSize: 14, color: '#6B7684' }}>{STEPS[step].desc}</p>
            </div>

            {/* 폼 내용 */}
            <div className="fade-up">
              <StepContent data={formData} set={set} />
            </div>

            {/* 하단 버튼 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 24, marginTop: 8, borderTop: '1px solid #F2F4F6',
            }}>
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 20px', borderRadius: 12,
                  border: '1.5px solid #E5E8EB', background: '#fff',
                  fontSize: 14, color: '#6B7684', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#B0B8C1')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E8EB')}
              >
                <ArrowLeft size={15} /> 이전
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || (formData.priorities as string[]).length < 4}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '11px 28px', borderRadius: 12, border: 'none',
                    background: submitting || (formData.priorities as string[]).length < 4 ? '#E5E8EB' : '#3182F6',
                    color:      submitting || (formData.priorities as string[]).length < 4 ? '#B0B8C1' : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                >
                  {submitting ? (
                    '설계안 생성 중...'
                  ) : (
                    <><Check size={16} /> 보험 설계 완료</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '11px 24px', borderRadius: 12, border: 'none',
                    background: '#3182F6', color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2563EB')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#3182F6')}
                >
                  다음 단계 <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 데스크탑 채팅 패널 (우측 고정) */}
        <div
          className="desktop-only"
          style={{ width: 340, flexShrink: 0, borderLeft: '1px solid #E5E8EB' }}
        >
          <ChatPanel
            messages={chatMessages}
            onSend={sendChat}
            loading={chatLoading}
            stepContext={STEPS[step].context}
          />
        </div>

        {/* 모바일 채팅 오버레이 */}
        {showChat && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', justifyContent: 'flex-end',
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowChat(false); }}
          >
            <div style={{ width: '85%', maxWidth: 360, height: '100%' }}>
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                loading={chatLoading}
                stepContext={STEPS[step].context}
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
