/* Trang giới thiệu. Cùng hộp 1600×900 và cùng hệ token với dashboard, nên bấm vào không có cú giật thị giác.
   Buổi 6 thay nút này bằng nút đăng nhập Google (style #gbtn đã có sẵn trong globals.css). */
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Shell } from '@/components/Shell';
import { CFG, labelOf, lower } from '@/lib/config';

export default function Home() {
  const src = CFG.source.type === 'sheets'
    ? <>Google Sheets, tab <b>{CFG.source.sheet}</b>, đọc qua Service Account với quyền chỉ đọc. Khoá nằm trong <code>app/.env.local</code> và không bao giờ gửi xuống trình duyệt.</>
    : <>File CSV <b>{CFG.source.csv}</b> trên máy này.</>;
  return (
    <Shell id="login">
      <div className="logincard">
        <div className="loginbrand"><div className="lmark"><Icon name="activity" /></div><b>{CFG.app.name}</b></div>
        <h1>{CFG.app.tagline}</h1>
        <p className="lead">
          Dashboard theo dõi 4 trang: tổng quan, theo {lower(labelOf(CFG.pages.primary))}, theo {lower(labelOf(CFG.pages.secondary))} và nguồn dữ liệu.
        </p>
        <Link className="dbtn pri" href="/dashboard" style={{ width: '100%', height: 46, fontSize: 14 }}>
          Mở dashboard<Icon name="chevron-right" className="lu-sm" />
        </Link>
        <div className="note"><i><Icon name="database" className="lu-sm" /></i><span>{src}</span></div>
        <div className="legal">Thiết kế bằng skill dashboard-design, dựng bằng skill dashboard-build.</div>
      </div>
    </Shell>
  );
}
