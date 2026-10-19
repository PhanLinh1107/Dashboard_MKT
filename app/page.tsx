/* Trang gốc chuyển thẳng vào dashboard; proxy.ts đưa người chưa đăng nhập sang /login. */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
