/* /dashboard: proxy.ts đã chặn người chưa đăng nhập; ở đây đọc lại session để lấy tên + ảnh đại diện
   rồi giao cho DashboardView (component trình duyệt). Kiểm lại ở server phòng khi proxy bị bỏ qua. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, isAllowed, readSession } from '@/lib/auth';
import DashboardView from './DashboardView';

export default async function DashboardPage() {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  if (!isAllowed(user.email)) redirect('/login?error=denied');
  return <DashboardView user={user} />;
}
