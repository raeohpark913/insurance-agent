'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, ChevronRight } from 'lucide-react';
import type { CoverageItem, MatchGrade } from '../types';

export type { CoverageItem };
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
}

const GRADE_CONFIG = {
  high:   { label: '매칭 높음',  color: '#00C471', bg: '#E8FBF1' },
  medium: { label: '매칭 보통',  color: '#3182F6', bg: '#EFF6FF' },
  low:    { label: '매칭 낮음',  color: '#FF6B00', bg: '#FFF4EB' },
  miss:   { label: '미달',       color: '#B0B8C1', bg: '#F2F4F6' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '암보험':   '#F04452',
  '건강보험': '#3182F6',
  '종신보험': '#6B7684',
  '정기보험': '#3D4A5C',
  '연금보험': '#00C471',
  '상해보험': '#FF6B00',
};

function formatAmount(amount: number): string {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}억`;
  if (amount >= 1000)  return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}천만원`;
  return `${amount.toLocaleString()}만원`;
}

// SVG 도넛 차트
function ScoreRing({ score, grade }: { score: number; grade: PlanProduct['matchGrade'] }) {
  const cfg   = GRADE_CONFIG[grade];
  const r     = 20;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;

  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#F2F4F6" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={cfg.color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="26" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill={cfg.color}>{score}</text>
        <text x="26" y="32" textAnchor="middle" fontSize="8"  fontWeight="400" fill="#B0B8C1">점</text>
      </svg>
    </div>
  );
}

export default function PlanCard({
  product,
  rank,
  maxCoverage,
  onDetail,
}: {
  product: PlanProduct;
  rank: number;
  maxCoverage: number;
  onDetail: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg          = GRADE_CONFIG[product.matchGrade];
  const catColor     = CATEGORY_COLORS[product.category] ?? '#6B7684';
  const visibleItems = expanded ? product.coverage : product.coverage.slice(0, 3);
  const hasMore      = product.coverage.length > 3;

  return (
    <div
      className="slide-in"
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #E5E8EB',
        padding: 20,
        marginBottom: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 순위 뱃지 */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        background: rank === 1 ? '#191F28' : '#F2F4F6',
        color: rank === 1 ? '#fff' : '#6B7684',
        fontSize: 10, fontWeight: 700,
        padding: '4px 10px', borderRadius: '16px 0 8px 0',
      }}>
        {rank === 1 ? '⭐ TOP 1' : `TOP ${rank}`}
      </div>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, marginRight: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: catColor + '1A', color: catColor,
            }}>
              {product.category}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: cfg.bg, color: cfg.color,
            }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
            {product.name}
          </p>
          <p style={{ fontSize: 12, color: '#6B7684', marginTop: 3 }}>
            {product.company}
          </p>
        </div>
        <ScoreRing score={product.fitScore} grade={product.matchGrade} />
      </div>

      {/* 월 보험료 */}
      {product.monthlyPremium != null && (
        <div style={{
          background: '#F9FAFB', borderRadius: 10, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 13, color: '#6B7684' }}>월 보험료</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#191F28', letterSpacing: '-0.3px' }}>
            {product.monthlyPremium.toLocaleString()}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7684', marginLeft: 2 }}>원</span>
          </span>
        </div>
      )}

      {/* 보장 내역 */}
      {product.coverage.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            주요 보장
          </p>
          {visibleItems.map((item, i) => {
            const pct = maxCoverage > 0 ? Math.min(100, (item.amount / maxCoverage) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#3D4A5C' }}>{item.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#191F28' }}>
                    {formatAmount(item.amount)}
                  </span>
                </div>
                <div style={{ height: 4, background: '#F2F4F6', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: cfg.color, borderRadius: 2,
                    width: `${pct}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 12, color: '#3182F6', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              }}
            >
              {expanded
                ? <><ChevronUp size={13} /> 접기</>
                : <><ChevronDown size={13} /> +{product.coverage.length - 3}개 더 보기</>
              }
            </button>
          )}
        </div>
      )}

      {/* 추천 이유 태그 */}
      {product.reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: product.warnings?.length ? 10 : 0 }}>
          {product.reasons.map((r, i) => (
            <span key={i} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: '#EFF6FF', color: '#3182F6', fontWeight: 500,
            }}>
              ✓ {r}
            </span>
          ))}
        </div>
      )}

      {/* 주의사항 태그 */}
      {product.warnings && product.warnings.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {product.warnings.map((w, i) => (
            <span key={i} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: '#FFF4EB', color: '#FF6B00', fontWeight: 500,
            }}>
              <AlertTriangle size={10} /> {w}
            </span>
          ))}
        </div>
      )}

      {/* 상세보기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={onDetail}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 12, fontWeight: 600, color: '#3182F6',
            background: '#EFF6FF', border: 'none', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#DBEAFE')}
          onMouseLeave={e => (e.currentTarget.style.background = '#EFF6FF')}
        >
          상세보기 <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
