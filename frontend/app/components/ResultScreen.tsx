'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, MessageSquare, Shield, BookOpen } from 'lucide-react';
import PlanCard from './PlanCard';
import ChatPanel from './ChatPanel';
import ComparisonChart from './ComparisonChart';
import DetailModal from './DetailModal';
import GlossarySection from './GlossarySection';
import Confetti from './Confetti';
import type { PlanProduct, ChatMessage } from '../types';

interface Props {
  products: PlanProduct[];
  onReset:  () => void;
}

export default function ResultScreen({ products, onReset }: Props) {
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([]);
  const [chatLoading,   setChatLoading]   = useState(false);
  const [showChat,      setShowChat]      = useState(false);
  const [activeTab,     setActiveTab]     = useState<'all' | string>('all');
  const [showConfetti,  setShowConfetti]  = useState(true);
  const [detailProduct, setDetailProduct] = useState<{ product: PlanProduct; rank: number } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // 폭죽 1.8초 후 제거
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const maxCoverage = Math.max(
    ...products.flatMap(p => p.coverage.map(c => c.amount)),
    1,
  );

  const categories = Array.from(new Set(products.map(p => p.category)));

  const displayed = activeTab === 'all'
    ? products
    : products.filter(p => p.category === activeTab);

  const sendChat = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: text, timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `[설계안 관련 질문] ${text}` }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: (data.response ?? '').replace(/```json[\s\S]*?```/g, '').trim(),
        timestamp: new Date(), blocked: data.blocked, flagged: data.flagged,
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

  const highCount = products.filter(p => p.matchGrade === 'high').length;
  const medCount  = products.filter(p => p.matchGrade === 'medium').length;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'Pretendard', -apple-system, system-ui, sans-serif",
      background: '#F9FAFB',
    }}>
      {/* 폭죽 */}
      <Confetti active={showConfetti} />

      {/* 상세보기 모달 */}
      {detailProduct && (
        <DetailModal
          product={detailProduct.product}
          rank={detailProduct.rank}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {/* 헤더 */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E5E8EB',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: '#3182F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={14} color="#fff" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>맞춤 설계안</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowChat(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: showChat ? '#EFF6FF' : '#F9FAFB',
              border: `1px solid ${showChat ? '#3182F6' : '#E5E8EB'}`,
              borderRadius: 8, padding: '5px 12px',
              fontSize: 12, color: showChat ? '#3182F6' : '#6B7684',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <MessageSquare size={13} /> 추가 질문
          </button>
          <button
            onClick={onReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: '#6B7684',
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid #E5E8EB', background: '#fff', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RotateCcw size={13} /> 처음부터
          </button>
        </div>
      </header>

      {/* 메인 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* 설계안 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>

            {/* ── 요약 배너 ── */}
            {products.length > 0 && (
              <div
                className="fade-up"
                style={{
                  background: 'linear-gradient(135deg, #191F28 0%, #2d3748 100%)',
                  borderRadius: 16, padding: '20px 24px', marginBottom: 24,
                  color: '#fff',
                }}
              >
                <p style={{ fontSize: 13, color: '#A0AEC0', marginBottom: 4 }}>분석 완료</p>
                <p style={{ fontSize: 19, fontWeight: 800, marginBottom: 16 }}>
                  {products.length}개 상품이 매칭됐어요 🎉
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: '전체 분석',   value: `${products.length}개`,                                        color: '#E2E8F0' },
                    { label: '높은 매칭',   value: `${highCount}개`,                                              color: '#00C471' },
                    { label: '보통 매칭',   value: `${medCount}개`,                                               color: '#63B3ED' },
                    { label: '최고 점수',   value: `${Math.max(...products.map(p => p.fitScore))}점`,             color: '#F6AD55' },
                  ].map(({ label, value, color }, i) => (
                    <div key={i} style={{
                      flex: '1 1 100px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      <p style={{ fontSize: 11, color: '#718096', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 비어있을 때 ── */}
            {products.length === 0 && (
              <div
                className="fade-up"
                style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #E5E8EB',
                  padding: '40px 24px', textAlign: 'center', marginBottom: 24,
                }}
              >
                <BookOpen size={32} color="#B0B8C1" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>
                  설계안 데이터가 아직 없습니다
                </p>
                <p style={{ fontSize: 13, color: '#6B7684', lineHeight: 1.7 }}>
                  AI가 응답을 생성했지만 구조화된 설계안 데이터가<br />
                  포함되지 않았습니다. 아래에서 AI에게 추가로 질문해보세요.
                </p>
                <button
                  onClick={() => setShowChat(true)}
                  style={{
                    marginTop: 16, padding: '10px 20px', borderRadius: 10,
                    background: '#3182F6', color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  AI에게 설계안 요청하기
                </button>
              </div>
            )}

            {/* ── 비교 차트 토글 버튼 ── */}
            {products.length > 0 && (
              <button
                onClick={() => setShowComparison(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fff', border: '1px solid #E5E8EB', borderRadius: 12,
                  padding: '12px 16px', marginBottom: showComparison ? 0 : 16,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
                  📊 상품 비교 분석 보기
                </span>
                <span style={{ fontSize: 12, color: '#3182F6', fontWeight: 600 }}>
                  {showComparison ? '접기 ↑' : '펼치기 ↓'}
                </span>
              </button>
            )}

            {/* ── 비교 차트 ── */}
            {showComparison && products.length > 0 && (
              <div className="fade-up" style={{ marginBottom: 16 }}>
                <ComparisonChart products={products} />
              </div>
            )}

            {/* ── 카테고리 필터 탭 ── */}
            {products.length > 0 && categories.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', ...categories].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 14px', borderRadius: 20,
                      border:     `1.5px solid ${activeTab === tab ? '#3182F6' : '#E5E8EB'}`,
                      background: activeTab === tab ? '#3182F6' : '#fff',
                      color:      activeTab === tab ? '#fff' : '#6B7684',
                      fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'all' ? `전체 (${products.length})` : tab}
                  </button>
                ))}
              </div>
            )}

            {/* ── 상품 카드 ── */}
            {displayed.map((product, i) => {
              const rank = products.indexOf(product) + 1;
              return (
                <PlanCard
                  key={i}
                  product={product}
                  rank={rank}
                  maxCoverage={maxCoverage}
                  onDetail={() => setDetailProduct({ product, rank })}
                />
              );
            })}

            {/* ── 보험 용어 사전 ── */}
            {products.length > 0 && <GlossarySection />}

            {/* ── 면책 고지 ── */}
            {products.length > 0 && (
              <div style={{
                padding: '14px 16px',
                background: '#fff', borderRadius: 12, border: '1px solid #E5E8EB',
                marginBottom: 24,
              }}>
                <p style={{ fontSize: 11, color: '#B0B8C1', lineHeight: 1.8, textAlign: 'center' }}>
                  본 결과는 고객님이 입력한 정보와 설정한 기준에 따른 객관적 매칭 결과이며,<br />
                  특정 상품의 가입을 권유하는 것이 아닙니다.<br />
                  정확한 내용은 약관 및 전문 상담사를 통해 반드시 확인하세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 데스크탑 채팅 패널 */}
        {showChat && (
          <div
            className="desktop-only"
            style={{ width: 340, flexShrink: 0, borderLeft: '1px solid #E5E8EB' }}
          >
            <ChatPanel
              messages={chatMessages}
              onSend={sendChat}
              loading={chatLoading}
              stepContext="설계안에 대해 궁금한 점, 특정 상품 보장 내용, 보험료 관련 질문 등을 물어보세요."
              onClose={() => setShowChat(false)}
            />
          </div>
        )}

        {/* 모바일 채팅 오버레이 */}
        {showChat && (
          <div
            className="mobile-tab-bar"
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
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
                stepContext="설계안에 대해 궁금한 점을 물어보세요."
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
