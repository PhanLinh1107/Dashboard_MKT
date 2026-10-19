/* /login: một card, một hành động chính (nút Google). Lỗi hiện ngay trên nút, nói rõ chuyện gì xảy ra và làm gì tiếp.
   Đã đăng nhập hợp lệ thì vào thẳng dashboard. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/GoogleButton';
import { Icon } from '@/components/Icon';
import { Shell } from '@/components/Shell';
import { DENIED_COOKIE, SESSION_COOKIE, isAllowed, readSession } from '@/lib/auth';
import { CFG } from '@/lib/config';

const MESSAGES: Record<string, { title: string; body: string }> = {
  cancelled: { title: 'Bạn đã huỷ đăng nhập', body: 'Bấm nút bên dưới để thử lại khi sẵn sàng.' },
  state: { title: 'Phiên đăng nhập đã hết hạn', body: 'Vui lòng bấm đăng nhập lại.' },
  google: { title: 'Google chưa xác nhận được tài khoản', body: 'Vui lòng thử lại sau ít phút. Nếu vẫn lỗi, liên hệ Admin.' },
  config: { title: 'Đăng nhập chưa được cấu hình', body: 'Thiếu AUTH_GOOGLE_ID hoặc AUTH_GOOGLE_SECRET trong .env.local. Liên hệ Admin.' },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const jar = await cookies();
  const user = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (user && isAllowed(user.email)) redirect('/dashboard');

  const { error } = await searchParams;
  const deniedEmail = error === 'denied' ? jar.get(DENIED_COOKIE)?.value : undefined;
  const msg = error && error !== 'denied' ? MESSAGES[error] : undefined;

  return (
    <Shell id="login">
      <div className="logincard">
        <div className="loginbrand"><div className="lmark"><Icon name="activity" /></div><b>{CFG.app.name}</b></div>
        <h1>Đăng nhập để xem dashboard</h1>
        <p className="lead">Dùng tài khoản Google đã được cấp quyền. Chỉ email trong danh sách cho phép mới mở được dashboard.</p>

        <GoogleButton label={error === 'denied' ? 'Đăng nhập bằng tài khoản khác' : undefined} />

        {error === 'denied' && (
          <div className="err" role="alert">
            <b>Bạn không có quyền truy cập vui lòng liên hệ Admin</b>
            {deniedEmail
              ? <>Tài khoản <code>{deniedEmail}</code> chưa có trong danh sách được phép xem dashboard.</>
              : <>Tài khoản vừa đăng nhập chưa có trong danh sách được phép xem dashboard.</>}
          </div>
        )}
        {msg && (
          <div className="err" role="alert"><b>{msg.title}</b>{msg.body}</div>
        )}

        <div className="note">
          <i><Icon name="circle-check" className="lu-sm" /></i>
          <span>Ứng dụng chỉ đọc tên, email và ảnh đại diện từ Google để xác định bạn. Phiên đăng nhập tự hết hạn sau 12 giờ.</span>
        </div>
      </div>
    </Shell>
  );
}
