import { NextResponse } from 'next/server';
import { fetchBackend } from '../_lib/backend';

export async function GET() {
  try {
    const res = await fetchBackend('/health', { retry: false, timeoutMs: 5_000 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'backend_unreachable' }, { status: 502 });
  }
}
