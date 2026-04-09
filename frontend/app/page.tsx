'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, RotateCcw, ShieldAlert, AlertTriangle, BookOpen, ChevronDown, ChevronUp, User } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  flagged?: boolean;
  blocked?: boolean;
}

interface UserProfile {
  age: string;
  gender: string;
  job: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-slate-400 dot-1 inline-block" />
      <span className="w-2 h-2 rounded-full bg-slate-400 dot-2 inline-block" />
      <span className="w-2 h-2 rounded-full bg-slate-400 dot-3 inline-block" />
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ border: '1px solid #FFB800', color: '#1A2B4A', background: '#FFFBF0' }}>
      <BookOpen size={10} />
      {source}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = msg.role === 'user';

  if (msg.blocked) {
    return (
      <div className="bubble-in flex justify-start mb-4">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
          <span>{msg.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bubble-in flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser ? 'rounded-br-sm text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}
          style={isUser ? { background: '#1A2B4A' } : {}}>
          {msg.content}
        </div>

        {msg.flagged && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 px-1">
            <AlertTriangle size={12} />
            정확한 수치는 공식 홈페이지나 상담사를 통해 확인하세요.
          </div>
        )}

        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-1.5 px-1">
            <button onClick={() => setShowSources(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              출처 {msg.sources.length}개
              {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showSources && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '안녕하세요! KB라이프 보험 AI 어시스턴트입니다.\n보험 상품 정보, 보장 내용, 보험료 등 궁금한 점을 질문해주세요.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ age: '', gender: '', job: '' });
  const [showProfile, setShowProfile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const userProfile = (profile.age || profile.gender || profile.job)
        ? { age: profile.age ? parseInt(profile.age) : undefined, gender: profile.gender || undefined, job: profile.job || undefined }
        : undefined;

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, user_profile: userProfile }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        flagged: data.flagged,
        blocked: data.blocked,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송해요, 서버 연결에 실패했어요. 잠시 후 다시 시도해주세요.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = async () => {
    await fetch(`${API_URL}/reset`, { method: 'POST' }).catch(() => {});
    setMessages([{ role: 'assistant', content: '대화가 초기화되었습니다. 새로운 질문을 입력해주세요.' }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">

      {/* 헤더 */}
      <header className="shrink-0 px-5 py-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: '#1A2B4A' }}>
            KB
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1A2B4A' }}>KB라이프 보험 AI</p>
            <p className="text-xs text-slate-400">보험 상담 어시스턴트</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProfile(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${showProfile ? 'border-yellow-400 text-yellow-700 bg-yellow-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <User size={13} /> 프로필
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors">
            <RotateCcw size={13} /> 초기화
          </button>
        </div>
      </header>

      {/* 프로필 패널 */}
      {showProfile && (
        <div className="shrink-0 px-5 py-3 border-b border-amber-100 flex flex-wrap gap-3 items-center" style={{ background: '#FFFBF0' }}>
          <span className="text-xs font-medium text-amber-700">유저 프로필 (선택)</span>
          <input type="number" placeholder="나이" value={profile.age}
            onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
            className="w-20 text-xs px-2 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-yellow-400" />
          <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
            className="text-xs px-2 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-yellow-400">
            <option value="">성별</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
          <input type="text" placeholder="직업" value={profile.job}
            onChange={e => setProfile(p => ({ ...p, job: e.target.value }))}
            className="w-28 text-xs px-2 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-yellow-400" />
        </div>
      )}

      {/* 메시지 */}
      <main className="flex-1 overflow-y-auto px-5 py-5" style={{ background: '#F4F6FA' }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="bubble-in flex justify-start mb-4">
            <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* 입력창 */}
      <footer className="shrink-0 px-5 py-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="보험에 대해 궁금한 점을 입력하세요 (Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm
              focus:outline-none focus:ring-2 placeholder:text-slate-400 leading-relaxed transition-all"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            onFocus={e => e.target.style.borderColor = '#FFB800'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#FFB800' }}>
            <Send size={18} color="#1A2B4A" />
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-slate-300">
          AI 답변은 참고용입니다. 정확한 내용은 약관 및 상담사를 통해 확인하세요.
        </p>
      </footer>
    </div>
  );
}
