import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/reset`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
