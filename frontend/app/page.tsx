'use client';

import { useState } from 'react';
import { Shield, ChevronRight, Sparkles } from 'lucide-react';
import FormWizard from './components/FormWizard';
import ResultScreen from './components/ResultScreen';
import type { PlanProduct } from './types';

type Screen = 'landing' | 'form' | 'result';

const FEATURES = [
  { icon: '📊', title: '공시 데이터 기반',      desc: '금융감독원 공시자료 및 보험사 약관 기반' },
  { icon: '⚖️',  title: '수수료 편향 없음',     desc: '특정 보험사 수수료에 관계없는 객관적 추천' },
  { icon: '🔍', title: '전체 보험사 비교',      desc: '국내 주요 보험사 상품 일괄 비교 분석' },
  { icon: '🤖', title: 'AI Fit Score',          desc: '20개 항목 기반 정밀 매칭 알고리즘' },
];

const HOW_IT_WORKS = [
  { step: '01', title: '정보 입력',     desc: '건강 상태, 직업, 선호도 등 20가지 항목을 단계별로 입력해요.' },
  { step: '02', title: 'AI 분석',       desc: 'AI가 리스크를 분석하고 Fit Score를 계산해요.' },
  { step: '03', title: '설계안 완성',   desc: '나에게 맞는 보험 TOP5와 카테고리별 추천을 제공해요.' },
];

export default function Home() {
  const [screen,   setScreen]   = useState<Screen>('landing');
  const [products, setProducts] = useState<PlanProduct[]>([]);

  if (screen === 'form') {
    return (
      <FormWizard
        onComplete={prods => { setProducts(prods); setScreen('result'); }}
        onBack={() => setScreen('landing')}
      />
    );
  }

  if (screen === 'result') {
    return (
      <ResultScreen
        products={products}
        onReset={() => { setProducts([]); setScreen('landing'); }}
      />
    );
  }

  // ── 랜딩 페이지 ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      fontFamily: "'Pretendard', -apple-system, system-ui, sans-serif",
    }}>

      {/* 상단 네비 */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #E5E8EB',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: '#3182F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#191F28' }}>보험 AI 설계사</span>
        </div>
        <button
          onClick={() => setScreen('form')}
          style={{
            padding: '8px 18px', borderRadius: 10,
            background: '#3182F6', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          무료로 시작하기
        </button>
      </nav>

      {/* 히어로 */}
      <section style={{
        background: 'linear-gradient(180deg, #fff 0%, #F9FAFB 100%)',
        padding: '72px 24px 80px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EFF6FF', padding: '6px 14px', borderRadius: 20,
            marginBottom: 20,
          }}>
            <Sparkles size={13} color="#3182F6" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3182F6' }}>
              AI 기반 공정 보험 추천 서비스
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 800, color: '#191F28',
            lineHeight: 1.3, marginBottom: 16, letterSpacing: '-0.5px',
          }}>
            나에게 딱 맞는 보험,<br />
            <span style={{ color: '#3182F6' }}>AI가 직접 설계해드립니다</span>
          </h1>

          <p style={{
            fontSize: 16, color: '#6B7684', lineHeight: 1.8,
            marginBottom: 36, maxWidth: 440, margin: '0 auto 36px',
          }}>
            복잡한 보험, 이제 쉽게 이해하세요.<br />
            10분이면 나에게 맞는 설계안이 완성됩니다.
          </p>

          <button
            onClick={() => setScreen('form')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 36px', borderRadius: 14,
              background: '#3182F6', color: '#fff', border: 'none',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 24px rgba(49,130,246,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(49,130,246,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'none';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(49,130,246,0.35)';
            }}
          >
            AI로 보험 완벽 설계하기
            <ChevronRight size={18} />
          </button>

          <p style={{ fontSize: 12, color: '#B0B8C1', marginTop: 14 }}>
            무료 · 회원가입 불필요 · 약 10분 소요
          </p>
        </div>
      </section>

      {/* 특징 카드 */}
      <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 22, fontWeight: 800, color: '#191F28',
          textAlign: 'center', marginBottom: 32,
        }}>
          왜 다른가요?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                background: '#fff', borderRadius: 16, border: '1px solid #E5E8EB',
                padding: '24px 20px',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#191F28', marginBottom: 6 }}>{f.title}</p>
              <p style={{ fontSize: 12, color: '#6B7684', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 이용 방법 */}
      <section style={{
        padding: '60px 24px',
        background: '#fff', borderTop: '1px solid #E5E8EB', borderBottom: '1px solid #E5E8EB',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 22, fontWeight: 800, color: '#191F28',
            textAlign: 'center', marginBottom: 36,
          }}>
            이렇게 이용하세요
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  paddingBottom: i < HOW_IT_WORKS.length - 1 ? 28 : 0,
                  position: 'relative',
                }}
              >
                {/* 연결선 */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 19, top: 44, bottom: 0,
                    width: 2, background: '#E5E8EB',
                  }} />
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#EFF6FF', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 1,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#3182F6' }}>{item.step}</span>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#6B7684', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 하단 */}
      <section style={{ padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 24, fontWeight: 800, color: '#191F28',
            marginBottom: 12, lineHeight: 1.4,
          }}>
            지금 바로 나에게 맞는<br />보험을 찾아보세요
          </h2>
          <p style={{ fontSize: 14, color: '#6B7684', marginBottom: 28, lineHeight: 1.7 }}>
            보험을 잘 몰라도 괜찮아요.<br />
            AI 도우미가 단계마다 도움을 드립니다.
          </p>
          <button
            onClick={() => setScreen('form')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 14,
              background: '#191F28', color: '#fff', border: 'none',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3D4A5C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#191F28')}
          >
            무료로 설계 시작하기 <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{
        borderTop: '1px solid #E5E8EB', padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: '#3182F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={11} color="#fff" />
          </div>
          <span style={{ fontSize: 12, color: '#6B7684' }}>보험 AI 설계사</span>
        </div>
        <p style={{ fontSize: 11, color: '#B0B8C1' }}>
          본 서비스는 AI 기반 참고 정보 제공 서비스입니다. 정확한 내용은 전문 상담사를 통해 확인하세요.
        </p>
      </footer>
    </div>
  );
}
