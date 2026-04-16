import { NextRequest, NextResponse } from 'next/server';
import { fetchBackend, coldStartMessage } from '../_lib/backend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetchBackend('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          response: `서버 응답 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`,
          blocked: false,
          sources: [],
          flagged: false,
          grounded: false,
        },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[api/chat] backend unreachable:', (e as Error)?.message);
    return NextResponse.json(
      {
        response: coldStartMessage(),
        blocked: false,
        sources: [],
        flagged: false,
        grounded: false,
      },
      { status: 503 },
    );
  }
}
