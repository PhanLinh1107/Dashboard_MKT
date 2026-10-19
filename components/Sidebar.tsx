/* Sidebar 206px (thu gọn 58px), ngăn với nội dung bằng 1px hairline.
   Mục đang chọn tô nền --sub2 + chữ --ink, KHÔNG tô brand: brand để dành cho nút hành động chính. */
import type { ReactNode } from 'react';
import { CFG, labelOf, lower } from '@/lib/config';
import { vi } from '@/lib/format';
import type { PageId } from '@/lib/types';
import type { IconName } from '@/lib/icons';
import { Icon } from './Icon';

export type NavItem = { id: PageId; label: string; icon: IconName; group: string; badge?: number; alert?: boolean };

export function navItems(counts: { alerts: number; primary: number; secondary: number }): NavItem[] {
  return [
    { id: 'home', label: 'Tổng quan', icon: 'layout-dashboard', group: 'Phân tích', badge: counts.alerts || undefined, alert: true },
    { id: 'primary', label: 'Theo ' + lower(labelOf(CFG.pages.primary)), icon: CFG.pages.primaryIcon ?? 'chart-pie', group: 'Phân tích', badge: counts.primary },
    { id: 'secondary', label: 'Theo ' + lower(labelOf(CFG.pages.secondary)), icon: CFG.pages.secondaryIcon ?? 'target', group: 'Phân tích', badge: counts.secondary },
    { id: 'source', label: 'Nguồn dữ liệu', icon: 'database', group: 'Hệ thống' },
  ];
}

export function Sidebar({ items, page, onPage, onRail, shown, total, note, theme, onTheme, onReset, acctOpen, onAcct }: {
  items: NavItem[];
  page: PageId;
  onPage: (p: PageId) => void;
  onRail: () => void;
  shown: number;
  total: number;
  note: string;
  theme: 'light' | 'dark';
  onTheme: () => void;
  onReset: () => void;
  acctOpen: boolean;
  onAcct: () => void;
}) {
  const user = CFG.app.user ?? { name: 'Bạn', first: 'bạn' };
  const nav: ReactNode[] = [];
  let group = '';
  for (const p of items) {
    if (p.group !== group) {
      group = p.group;
      nav.push(<div className="lbl" key={`g-${group}`}>{group}</div>);
    }
    nav.push(
      <button key={p.id} className={page === p.id ? 'nav on' : 'nav'} onClick={() => onPage(p.id)} title={p.label}>
        <span className="ic"><Icon name={p.icon} /></span>
        <span className="nvt">{p.label}</span>
        {p.badge ? <span className={p.alert ? 'bdg alert' : 'bdg'}>{p.badge}</span> : null}
      </button>,
    );
  }
  return (
    <aside id="side">
      <div className="brand">
        <div className="mark"><Icon name="activity" /></div>
        <div className="brandtxt"><b>{CFG.app.name}</b></div>
        <button id="collapse" title="Thu gọn menu" aria-label="Thu gọn menu" onClick={onRail}>
          <Icon name="panel-left" className="lu-sm" />
        </button>
      </div>

      <nav id="nav">{nav}</nav>

      <div className="sfoot">
        {/* Hai con số TÍNH TỪ DỮ LIỆU, không gõ tay. */}
        <div className="usage">
          <div className="uhd"><b>{vi(shown)}</b><span>/ {vi(total)} dòng đang xem</span></div>
          <div className="utrack"><div className="ufill" style={{ width: `${total ? Math.min(100, (shown / total) * 100).toFixed(1) : 0}%` }} /></div>
          <div className="unote">{note}</div>
          <button className="ubtn" onClick={() => onPage('source')}>Xem nguồn dữ liệu</button>
        </div>
        <div className="wrap">
          <button className="acct" onClick={onAcct} title={user.email ?? user.name}>
            <span className="av">{user.name.charAt(0).toUpperCase()}</span>
            <span className="at"><span className="an">{user.name}</span><span className="ae">{user.email ?? user.role ?? ''}</span></span>
            <Icon name="chevron-down" className="lu-xs" />
          </button>
          <div className="pop up" hidden={!acctOpen}>
            <button className="r" onClick={onTheme}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} className="lu-sm" />
              <span>{theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}</span>
            </button>
            <button className="r" onClick={() => onPage('source')}><Icon name="database" className="lu-sm" />Nguồn dữ liệu</button>
            <button className="r" onClick={onReset}><Icon name="rotate-ccw" className="lu-sm" />Đặt lại bộ lọc</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
