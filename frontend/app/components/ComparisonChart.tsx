'use client';
import type { PlanProduct } from '../types';

const GRADE_COLORS: Record<string, string> = {
  high:   '#00C471',
  medium: '#3182F6',
  low:    '#FF6B00',
  miss:   '#B0B8C1',
};

function shortName(name: string): string {
  return name
    .replace(/\(무\)/g, '')
    .replace(/무배당\s*/g, '')
    .replace(/\(갱신형\)/g, '')
    .trim()
    .slice(0, 14);
}

function shortCompany(name: string): string {
  return name.replace(/생명|손해보험|화재|보험/g, '').trim().slice(0, 6);
}

// Score → heatmap color (blue tint)
function heatColor(score: number): string {
  const intensity = Math.min(1, score / 100);
  const r = Math.round(239 - intensity * 150);
  const g = Math.round(246 - intensity * 66);
  const b = Math.round(255);
  return `rgb(${r},${g},${b})`;
}

function textColor(score: number): string {
  return score >= 70 ? '#1a5fb4' : score >= 40 ? '#3D4A5C' : '#B0B8C1';
}

export default function ComparisonChart({ products }: { products: PlanProduct[] }) {
  if (!products.length) return null;

  // Collect all unique criteria
  const allCriteria = Array.from(
    new Set(products.flatMap(p => Object.keys(p.itemScores ?? {}))),
  );

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #E5E8EB',
      padding: '20px 24px', marginBottom: 24,
    }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 18 }}>
        상품 비교 분석
      </p>

      {/* ── Fit Score 가로 막대 차트 ── */}
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#B0B8C1',
        textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12,
      }}>
        Fit Score
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {products.map((p, i) => {
          const color = GRADE_COLORS[p.matchGrade];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* 상품 이름 */}
              <div style={{ width: 130, flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#3D4A5C', lineHeight: 1.3 }}>
                  {shortName(p.name)}
                </p>
                <p style={{ fontSize: 10, color: '#B0B8C1' }}>{shortCompany(p.company)}</p>
              </div>

              {/* 막대 */}
              <div style={{
                flex: 1, height: 22, background: '#F2F4F6', borderRadius: 11,
                overflow: 'hidden', position: 'relative',
              }}>
                <div
                  className="bar-grow"
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    background: color, borderRadius: 11,
                    width: `${p.fitScore}%`,
                  }}
                />
                <span style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  mixBlendMode: 'difference',
                }}>
                  {p.fitScore}점
                </span>
              </div>

              {/* 등급 뱃지 */}
              <div style={{
                width: 52, flexShrink: 0, textAlign: 'center',
                background: color + '1A', borderRadius: 8, padding: '3px 0',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>
                  {p.matchGrade === 'high' ? '높음' : p.matchGrade === 'medium' ? '보통' : p.matchGrade === 'low' ? '낮음' : '미달'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 항목별 히트맵 ── */}
      {allCriteria.length > 0 && (
        <>
          <div style={{ height: 1, background: '#F2F4F6', marginBottom: 16 }} />
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#B0B8C1',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12,
          }}>
            항목별 점수 비교
          </p>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', fontSize: 11, minWidth: 380 }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left', padding: '4px 8px',
                    color: '#B0B8C1', fontWeight: 600, fontSize: 10,
                    width: 130,
                  }}>
                    항목
                  </th>
                  {products.map((p, i) => (
                    <th key={i} style={{
                      textAlign: 'center', padding: '4px 6px',
                      color: '#6B7684', fontWeight: 600, fontSize: 10,
                      minWidth: 58,
                    }}>
                      {shortName(p.name).slice(0, 8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCriteria.map((criterion, ci) => (
                  <tr key={ci}>
                    <td style={{
                      padding: '5px 8px', fontSize: 11, color: '#6B7684',
                      whiteSpace: 'nowrap',
                    }}>
                      {criterion.length > 12 ? criterion.slice(0, 11) + '…' : criterion}
                    </td>
                    {products.map((p, pi) => {
                      const score = p.itemScores?.[criterion] ?? 0;
                      return (
                        <td key={pi} style={{
                          padding: '6px 4px', textAlign: 'center',
                          background: heatColor(score), borderRadius: 6,
                          color: textColor(score),
                          fontWeight: score >= 80 ? 700 : 400,
                          fontSize: 12,
                        }}>
                          {score}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#B0B8C1' }}>점수 범례:</span>
            {[
              { label: '90+', score: 95 },
              { label: '70~89', score: 75 },
              { label: '~69', score: 50 },
            ].map(({ label, score }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: heatColor(score),
                  border: '1px solid #E5E8EB',
                }} />
                <span style={{ fontSize: 10, color: '#6B7684' }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
