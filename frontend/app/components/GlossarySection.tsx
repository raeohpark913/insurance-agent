'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface Term {
  term: string;
  badge: string;   // 한 줄 요약
  detail: string;  // 쉬운 설명
  tip?: string;    // 실전 팁
}

const TERMS: Term[] = [
  {
    term:   '갱신형 보험',
    badge:  '일정 기간마다 보험료가 바뀌는 보험',
    detail: '계약 기간이 끝날 때마다 새로 갱신하는 구조예요. 처음에는 보험료가 저렴하지만, 갱신할수록 나이가 들어 보험료가 높아져요.',
    tip:    '💡 단기간만 보험이 필요하거나 당장 보험료를 아끼고 싶다면 고려해볼 수 있어요.',
  },
  {
    term:   '비갱신형 보험',
    badge:  '보험료가 처음부터 끝까지 변하지 않는 보험',
    detail: '가입할 때 정한 보험료가 보장 기간 내내 동일해요. 처음에는 갱신형보다 비싸지만 장기적으로 총 납입액이 더 유리할 수 있어요.',
    tip:    '💡 오랫동안 일정 보험료로 안정적인 보장을 원한다면 비갱신형이 유리해요.',
  },
  {
    term:   '종신보험',
    badge:  '평생 동안 사망을 보장하는 보험',
    detail: '사망 시점에 상관없이 보험금을 지급해요. 가족의 생계 보호나 상속 설계에 활용되며, 해지 시 환급금(해지환급금)도 받을 수 있어요.',
    tip:    '💡 부양가족이 있고 사망 보장을 평생 유지하고 싶다면 종신보험이 적합해요.',
  },
  {
    term:   '실손보험 (실비보험)',
    badge:  '병원에서 실제로 쓴 의료비를 보상해주는 보험',
    detail: '입원·통원·약값 등 실제 지출한 의료비를 보험사가 대신 내줘요. 단, 자기부담금(10~20%)이 있고 다른 의료보험과 중복 지급은 안 돼요.',
    tip:    '💡 우리나라 국민건강보험과 함께 가입하면 의료비 부담을 크게 줄일 수 있어요.',
  },
  {
    term:   '연금보험',
    badge:  '노후에 매달 연금처럼 돈을 받는 보험',
    detail: '일정 기간 보험료를 내고 은퇴 후 매달 연금 형태로 돌려받아요. 세액공제 혜택의 연금저축보험과 비과세 혜택의 일반 연금보험이 있어요.',
    tip:    '💡 노후 준비를 시작하고 싶다면 세제 혜택을 비교해서 선택하세요.',
  },
  {
    term:   'Fit Score',
    badge:  '나에게 맞는 상품 점수 (0~100점)',
    detail: '입력하신 건강 정보·예산·선호도를 바탕으로 각 상품이 얼마나 잘 맞는지 계산한 점수예요. 높을수록 내 조건과 잘 맞는 상품이에요.',
    tip:    '💡 80점 이상이면 매칭 높음, 60~79점은 보통, 60점 미만은 낮음으로 분류돼요.',
  },
  {
    term:   '납입기간',
    badge:  '보험료를 내야 하는 기간',
    detail: '"20년납"이면 20년 동안 보험료를 납입해요. 납입기간이 짧을수록 월 보험료가 높지만 총 납입액은 적을 수 있어요.',
    tip:    '💡 10년납처럼 단기납은 월 보험료가 비싸지만 빨리 납입을 끝낼 수 있어요.',
  },
  {
    term:   '보장기간',
    badge:  '보험이 보호해주는 기간',
    detail: '"100세 보장"이면 100세까지 보험금 지급이 가능해요. 보장기간이 길수록 보험료가 높지만 더 오래 안심할 수 있어요.',
    tip:    '💡 암·중증질환처럼 나이 들수록 발생 위험이 높은 질병은 100세 보장이 유리해요.',
  },
  {
    term:   '면책기간',
    badge:  '가입 직후 보험금을 받을 수 없는 기간',
    detail: '보험에 가입하자마자 보험금을 받으면 이미 아픈 사람들이 악용할 수 있어서, 가입 후 일정 기간(보통 90일~1년)은 보험금을 지급하지 않아요.',
    tip:    '💡 암보험의 경우 가입 후 90일이 지나야 암 진단금을 받을 수 있는 경우가 많아요.',
  },
  {
    term:   '환급형 vs 순수보장형',
    badge:  '만기 때 돈을 돌려받느냐 vs 보험료만 아끼느냐',
    detail: '환급형은 만기 시 납입 보험료 일부를 돌려받지만 보험료가 비싸요. 순수보장형(비환급형)은 만기 환급금이 없는 대신 보험료가 훨씬 저렴해요.',
    tip:    '💡 보험의 본질은 보장이에요. 저축이 목적이라면 별도 금융상품이 더 효율적일 수 있어요.',
  },
];

function TermItem({ term, badge, detail, tip }: Term) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #F2F4F6' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>{term}</span>
          <span style={{ fontSize: 12, color: '#B0B8C1', marginLeft: 8 }}>— {badge}</span>
        </div>
        {open
          ? <ChevronUp size={15} color="#B0B8C1" style={{ flexShrink: 0 }} />
          : <ChevronDown size={15} color="#B0B8C1" style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="fade-up" style={{ paddingBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#3D4A5C', lineHeight: 1.8, marginBottom: tip ? 8 : 0 }}>
            {detail}
          </p>
          {tip && (
            <p style={{
              fontSize: 12, color: '#3182F6', lineHeight: 1.7,
              background: '#EFF6FF', borderRadius: 8, padding: '8px 12px',
            }}>
              {tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GlossarySection() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #E5E8EB',
      padding: '0 20px', marginBottom: 24,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={15} color="#3182F6" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>보험 용어 사전</span>
          <span style={{
            fontSize: 11, background: '#EFF6FF', color: '#3182F6',
            padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          }}>
            {TERMS.length}개 용어
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#B0B8C1' }}>
            {open ? '접기' : '어려운 용어를 쉽게 설명해드려요'}
          </span>
          {open
            ? <ChevronUp size={15} color="#B0B8C1" />
            : <ChevronDown size={15} color="#B0B8C1" />}
        </div>
      </button>

      {open && (
        <div className="fade-up" style={{ paddingBottom: 8 }}>
          {TERMS.map((t, i) => <TermItem key={i} {...t} />)}
        </div>
      )}
    </div>
  );
}
