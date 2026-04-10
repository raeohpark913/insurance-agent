'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Shield, AlertCircle, X } from 'lucide-react';
import type { ChatMessage } from '../types';

interface Props {
  messages:    ChatMessage[];
  onSend:      (text: string) => Promise<void>;
  loading:     boolean;
  stepContext?: string;   // 현재 단계 힌트
  onClose?:    () => void; // 모바일 닫기
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '11px 14px' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`dot-${i + 1}`}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#B0B8C1', display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
}

export default function ChatPanel({ messages, onSend, loading, stepContext, onClose }: Props) {
  const [input,   setInput]   = useState('');
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await onSend(text);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#fff', borderLeft: '1px solid #E5E8EB',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #E5E8EB',
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
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>AI 도우미</p>
            <p style={{ fontSize: 10, color: '#B0B8C1' }}>궁금한 점을 바로 물어보세요</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: '#B0B8C1', borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 현재 단계 컨텍스트 힌트 */}
      {stepContext && (
        <div style={{
          margin: '10px 12px 0',
          padding: '8px 12px', borderRadius: 10,
          background: '#EFF6FF', fontSize: 12, color: '#3182F6', lineHeight: 1.5,
          flexShrink: 0,
        }}>
          💡 {stepContext}
        </div>
      )}

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: '#B0B8C1' }}>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>
              입력 중 모르는 내용이 있으면<br />
              언제든지 물어보세요!
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                '간편심사형이 뭔가요?',
                '가족력이 보험에 어떤 영향을 주나요?',
                '비갱신형과 갱신형의 차이가 뭔가요?',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend(q)}
                  style={{
                    background: '#F9FAFB', border: '1px solid #E5E8EB',
                    borderRadius: 8, padding: '7px 10px',
                    fontSize: 11, color: '#6B7684', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#F9FAFB')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className="fade-up"
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
              gap: 6,
              alignItems: 'flex-end',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: 24, height: 24, borderRadius: 7, background: '#3182F6',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={11} color="#fff" />
              </div>
            )}

            <div style={{ maxWidth: '82%' }}>
              {msg.blocked ? (
                <div style={{
                  background: '#FFF0F1', border: '1px solid #FFCDD2',
                  borderRadius: '4px 10px 10px 10px',
                  padding: '9px 12px', fontSize: 12, color: '#F04452',
                  display: 'flex', gap: 6, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  {msg.content}
                </div>
              ) : (
                <div style={{
                  background:   msg.role === 'user' ? '#3182F6' : '#F9FAFB',
                  color:        msg.role === 'user' ? '#fff' : '#191F28',
                  borderRadius: msg.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
                  padding:      '9px 12px', fontSize: 13, lineHeight: 1.65,
                  border:       msg.role === 'assistant' ? '1px solid #E5E8EB' : 'none',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              )}

              {msg.flagged && (
                <p style={{ fontSize: 10, color: '#FF6B00', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AlertCircle size={9} /> 수치는 공식 자료를 통해 확인하세요.
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="fade-up" style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, background: '#3182F6',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={11} color="#fff" />
            </div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E8EB', borderRadius: '4px 10px 10px 10px' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        padding: '10px 12px 12px', borderTop: '1px solid #E5E8EB', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 6, background: '#F9FAFB',
          border: '1.5px solid #E5E8EB', borderRadius: 12,
          padding: '5px 5px 5px 12px',
          transition: 'border-color 0.15s',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="궁금한 점을 물어보세요"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 13, color: '#191F28',
              padding: '6px 0', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 32, height: 32, borderRadius: 9, border: 'none',
              background: input.trim() && !loading ? '#3182F6' : '#E5E8EB',
              cursor:     input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <Send size={13} color={input.trim() && !loading ? '#fff' : '#B0B8C1'} />
          </button>
        </div>
      </div>
    </div>
  );
}
