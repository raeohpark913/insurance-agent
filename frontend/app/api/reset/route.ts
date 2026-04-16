import { NextResponse } from 'next/server';
import { fetchBackend } from '../_lib/backend';

export async function POST() {
  try {
    const res = await fetchBackend('/reset', { method: 'POST', retry: false });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
