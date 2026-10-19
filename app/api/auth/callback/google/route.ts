/* GET /api/auth/callback/google — Google trả về đây sau khi người dùng chọn tài khoản.
   Đổi code lấy id_token (server ↔ Google, không qua trình duyệt), kiểm email trong ALLOWED_EMAILS,
   đạt thì ký cookie session; không đạt thì về /login báo không có quyền. */
import { NextResponse } from 'next/server';
import {
  CALLBACK_PATH, DENIED_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE,
  appOrigin, cookieBase, decodeIdToken, isAllowed, signSession,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

function back(req: Request, error: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieState = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`))?.[1];

  if (url.searchParams.get('error')) return back(req, 'cancelled'); // người dùng bấm Huỷ ở màn Google
  const code = url.searchParams.get('code');
  if (!code || !cookieState || url.searchParams.get('state') !== cookieState) return back(req, 'state');

  const clientId = process.env.AUTH_GOOGLE_ID ?? '';
  let token: { id_token?: string };
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
        redirect_uri: appOrigin(req.url) + CALLBACK_PATH,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
    if (!r.ok) return back(req, 'google');
    token = await r.json();
  } catch {
    return back(req, 'google');
  }

  const p = token.id_token ? decodeIdToken(token.id_token, clientId) : null;
  if (!p?.email || p.email_verified === false) return back(req, 'google');

  if (!isAllowed(p.email)) {
    const res = back(req, 'denied');
    res.cookies.set(DENIED_COOKIE, p.email, { ...cookieBase(req.url), maxAge: 120 });
    return res;
  }

  const res = NextResponse.redirect(new URL('/dashboard', req.url));
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(DENIED_COOKIE);
  res.cookies.set(SESSION_COOKIE, await signSession({ email: p.email, name: p.name ?? p.email, picture: p.picture }), {
    ...cookieBase(req.url),
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
