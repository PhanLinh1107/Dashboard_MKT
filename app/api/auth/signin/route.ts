/* GET /api/auth/signin → chuyển sang màn chọn tài khoản Google.
   state ngẫu nhiên lưu trong cookie httpOnly, callback so khớp để chống giả mạo (CSRF). */
import { NextResponse } from 'next/server';
import { CALLBACK_PATH, STATE_COOKIE, appOrigin, cookieBase, randomToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId || !process.env.AUTH_GOOGLE_SECRET) {
    return NextResponse.redirect(new URL('/login?error=config', req.url));
  }
  const state = randomToken();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: appOrigin(req.url) + CALLBACK_PATH,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account', // luôn cho chọn tài khoản, để người bị từ chối đổi sang email khác được
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, { ...cookieBase(req.url), maxAge: 600 });
  return res;
}
