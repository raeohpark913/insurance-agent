// 백엔드 호출 공통 헬퍼
// - render.yaml의 fromService 는 호스트만 주입하므로 https:// 자동 보정
// - cold start 대응을 위해 타임아웃 60s + 1회 재시도

const raw = process.env.BACKEND_URL || 'http://localhost:8000';
export const BACKEND_URL = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;

type FetchOptions = RequestInit & { timeoutMs?: number; retry?: boolean };

export async function fetchBackend(
  path: string,
  { timeoutMs = 60_000, retry = true, ...init }: FetchOptions = {},
): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;

  const run = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await run();
  } catch (e) {
    if (!retry) throw e;
    // cold start 가정 — 짧게 쉬고 한 번만 재시도
    await new Promise((r) => setTimeout(r, 1_500));
    return run();
  }
}

// cold start / 네트워크 실패 구분 메시지
export function coldStartMessage(): string {
  return '서버를 깨우는 중입니다. 10~30초 후 다시 시도해 주세요.';
}
