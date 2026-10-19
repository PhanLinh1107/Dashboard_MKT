/* Chặn trước khi render: /dashboard và /api/data chỉ mở cho người đã đăng nhập VÀ có email trong ALLOWED_EMAILS.
   Kiểm lại danh sách mỗi request, nên xoá một email khỏi .env.local là người đó mất quyền ngay (sau khi khởi động lại server). */
import { NextResponse, type NextRequest } from 'next/server';
import { DENIED_COOKIE, SESSION_COOKIE, cookieBase, isAllowed, readSession } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const user = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = req.nextUrl.pathname.startsWith('/api/');

  if (user && isAllowed(user.email)) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: user ? 'Bạn không có quyền truy cập' : 'Chưa đăng nhập' }, { status: user ? 403 : 401 });
  }

  const to = new URL('/login', req.url);
  if (user) to.searchParams.set('error', 'denied');
  const res = NextResponse.redirect(to);
  if (user) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.set(DENIED_COOKIE, user.email, { ...cookieBase(req.url), maxAge: 120 });
  }
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/data/:path*'],
};
