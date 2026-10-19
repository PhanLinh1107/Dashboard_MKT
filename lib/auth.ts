/* Đăng nhập Google: session là cookie httpOnly ký HMAC-SHA256 bằng AUTH_SECRET.
   Không lưu gì phía server; proxy.ts, trang và route đều kiểm cùng một hàm readSession().
   Dùng Web Crypto nên chạy được ở cả proxy lẫn route handler. Không import vào component trình duyệt. */

export const SESSION_COOKIE = 'mpd_session';
export const STATE_COOKIE = 'mpd_oauth_state';
export const DENIED_COOKIE = 'mpd_denied';
export const SESSION_MAX_AGE = 12 * 3600; // giây — hết hạn thì đăng nhập lại

export type SessionUser = { email: string; name: string; picture?: string };
type Payload = SessionUser & { exp: number };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Thiếu AUTH_SECRET (≥32 ký tự) trong .env.local');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(user: SessionUser): Promise<string> {
  const payload: Payload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Trả user nếu cookie hợp lệ, còn hạn; null nếu không. Không kiểm danh sách email (xem isAllowed). */
export async function readSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload;
    if (!p.email || p.exp < Date.now() / 1000) return null;
    return { email: p.email, name: p.name, picture: p.picture };
  } catch {
    return null;
  }
}

/** ALLOWED_EMAILS trong .env.local: các email cách nhau bằng dấu phẩy, chấm phẩy hoặc khoảng trắng. */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAllowed(email: string): boolean {
  return allowedEmails().includes(email.trim().toLowerCase());
}

export function randomToken(bytes = 24): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Địa chỉ gốc của app. AUTH_URL (tuỳ chọn) dùng khi chạy sau proxy/tên miền thật; mặc định lấy từ request. */
export function appOrigin(reqUrl: string): string {
  return (process.env.AUTH_URL ?? new URL(reqUrl).origin).replace(/\/+$/, '');
}

export const CALLBACK_PATH = '/api/auth/callback/google';

/** Đọc phần payload của id_token. Chỉ dùng cho token nhận TRỰC TIẾP từ endpoint token của Google qua HTTPS
    (OpenID Connect Core §3.1.3.7: khi đó TLS thay cho kiểm chữ ký); vẫn kiểm iss, aud, exp. */
export function decodeIdToken(idToken: string, clientId: string): { email?: string; email_verified?: boolean; name?: string; picture?: string } | null {
  try {
    const p = JSON.parse(new TextDecoder().decode(fromB64url(idToken.split('.')[1] ?? '')));
    if (p.iss !== 'https://accounts.google.com' && p.iss !== 'accounts.google.com') return null;
    if (p.aud !== clientId || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export function cookieBase(reqUrl: string) {
  return { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: new URL(reqUrl).protocol === 'https:' };
}
