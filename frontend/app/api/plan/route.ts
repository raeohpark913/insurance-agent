import { NextRequest, NextResponse } from 'next/server';
import { fetchBackend, coldStartMessage } from '../_lib/backend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetchBackend('/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return NextResponse.json(
        { products: [], summary: {}, disclaimer: `서버 응답 오류 (${res.status})` },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[api/plan] backend unreachable:', (e as Error)?.message);
    return NextResponse.json(
      { products: [], summary: {}, disclaimer: coldStartMessage() },
      { status: 503 },
    );
  }
}
