'use client';
import { useEffect } from 'react';
import { X, TrendingUp, Star, Shield, AlertTriangle } from 'lucide-react';
import type { PlanProduct } from '../types';

const GRADE_CONFIG = {
  high:   { label: '매칭 높음', color: '#00C471', bg: '#E8FBF1' },
  medium: { label: '매칭 보통', color: '#3182F6', bg: '#EFF6FF' },
  low:    { label: '매칭 낮음', color: '#FF6B00', bg: '#FFF4EB' },
  miss:   { label: '미달',      color: '#B0B8C1', bg: '#F2F4F6' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '암보험':   '#F04452',
  '건강보험': '#3182F6',
  '종신보험': '#6B7684',
  '정기보험': '#3D4A5C',
  '연금보험': '#00C471',
  '상해보험': '#FF6B00',
};

// 각 평가 항목에 대한 쉬운 설명
const CRITERIA_EXPLAIN: Record<string, string> = {
  '암/중증 질병 보장': '암·뇌졸중·심근경색 등 중대 질병 발생 시 보험금이 얼마나 잘 나오는지 평가해요.',
  '보험료 저렴함':     '같은 보장 수준일 때 다른 상품보다 보험료가 얼마나 저렴한지 비교해요.',
  '환급률':            '보험 만기 때 납입한 보험료를 얼마나 돌려받을 수 있는지 평가해요.',
  '납입 기간 선호 일치': '선택하신 납입 기간(몇 년납)과 이 상품의 납입 기간이 얼마나 일치하는지예요.',
  '보장 기간 선호 일치': '선택하신 보장 기간(몇 세까지)과 이 상품의 보장 기간이 얼마나 일치하는지예요.',
  '갱신형 여부 선호 일치': '갱신형·비갱신형 선호와 이 상품의 특성이 얼마나 맞는지 평가해요.',
};

function formatAmt(amount: number): string {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}억`;
  if (amount >= 1000)  return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}천만원`;
  return `${amount.toLocaleString()}만원`;
}

function ScoreBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#3D4A5C', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}점</span>
      </div>
      <div style={{ height: 8, background: '#F2F4F6', borderRadius: 4, overflow: 'hidden' }}>
        <div
          className="bar-grow"
          style={{
            height: '100%', background: color, borderRadius: 4,
            width: `${score}%`,
          }}
        />
      </div>
      {CRITERIA_EXPLAIN[label] && (
        <p style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4, lineHeight: 1.6 }}>
          {CRITERIA_EXPLAIN[label]}
        </p>
      )}
    </div>
  );
}

export default function DetailModal({
  product,
  rank,
  onClose,
}: {
  product: PlanProduct;
  rank: number;
  onClose: () => void;
}) {
  const cfg      = GRADE_CONFIG[product.matchGrade];
  const catColor = CATEGORY_COLORS[product.category] ?? '#6B7684';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="slide-up"
        style={{
          width: '100%', maxWidth: 600,
          background: '#fff', borderRadius: '20px 20px 0 0',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: '#E5E8EB', borderRadius: 2 }} />
        </div>

        {/* 헤더 */}
        <div style={{
          padding: '12px 20px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '1px solid #F2F4F6',
        }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: rank === 1 ? '#191F28' : '#F2F4F6',
                color: rank === 1 ? '#fff' : '#6B7684',
              }}>
                {rank === 1 ? '⭐ TOP 1' : `TOP ${rank}`}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: catColor + '1A', color: catColor,
              }}>
                {product.category}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: cfg.bg, color: cfg.color,
              }}>
                {cfg.label}
              </span>
            </div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#191F28', lineHeight: 1.4 }}>
              {product.name}
            </p>
            <p style={{ fontSize: 13, color: '#6B7684', marginTop: 3 }}>{product.company}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: '#F2F4F6', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} color="#6B7684" />
          </button>
        </div>

        {/* 스크롤 본문 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 32px' }}>

          {/* 스코어 + 보험료 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{
              flex: 1, borderRadius: 14, padding: '16px',
              background: cfg.bg, textAlign: 'center',
            }}>
              <p style={{ fontSize: 11, color: cfg.color, fontWeight: 700, marginBottom: 6 }}>Fit Score</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                {product.fitScore}
              </p>
              <p style={{ fontSize: 11, color: cfg.color, marginTop: 2 }}>/ 100점</p>
            </div>
            {product.monthlyPremium != null && (
              <div style={{
                flex: 1, borderRadius: 14, padding: '16px',
                background: '#F9FAFB', textAlign: 'center',
              }}>
                <p style={{ fontSize: 11, color: '#6B7684', fontWeight: 700, marginBottom: 6 }}>월 보험료</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#191F28', lineHeight: 1 }}>
                  {product.monthlyPremium.toLocaleString()}
                </p>
                <p style={{ fontSize: 11, color: '#6B7684', marginTop: 2 }}>원 / 월</p>
              </div>
            )}
          </div>

          {/* 항목별 매칭 점수 */}
          {product.itemScores && Object.keys(product.itemScores).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <TrendingUp size={14} color="#3182F6" />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>항목별 매칭 점수</p>
              </div>
              {Object.entries(product.itemScores).map(([key, score]) => (
                <ScoreBar key={key} score={score} color={cfg.color} label={key} />
              ))}
            </div>
          )}

          {/* 추천 이유 */}
          {product.reasons.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Star size={14} color="#FF6B00" />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
                  이 상품을 추천하는 이유
                </p>
              </div>
              {product.reasons.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: '#F9FAFB', borderRadius: 10,
                  padding: '10px 14px', marginBottom: 8,
                }}>
                  <span style={{ color: cfg.color, fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}>✓</span>
                  <p style={{ fontSize: 13, color: '#3D4A5C', lineHeight: 1.7 }}>{r}</p>
                </div>
              ))}
            </div>
          )}

          {/* 주요 보장 */}
          {product.coverage.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Shield size={14} color="#6B7684" />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>주요 보장 내역</p>
              </div>
              {product.coverage.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10,
                  background: i % 2 === 0 ? '#F9FAFB' : '#fff',
                  border: '1px solid #F2F4F6', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 13, color: '#3D4A5C' }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
                    {formatAmt(c.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 주의사항 */}
          {product.warnings && product.warnings.length > 0 && (
            <div style={{
              background: '#FFF4EB', borderRadius: 12,
              padding: '12px 16px', border: '1px solid #FFD9B8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <AlertTriangle size={13} color="#FF6B00" />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#FF6B00' }}>주의 사항</p>
              </div>
              {product.warnings.map((w, i) => (
                <p key={i} style={{ fontSize: 12, color: '#FF6B00', lineHeight: 1.7 }}>{w}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
