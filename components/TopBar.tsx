/* Header 46px: breadcrumb bên trái, hành động bên phải.
   "Bộ lọc" là nút brand DUY NHẤT trên màn hình dashboard. */
import type { Alert } from '@/lib/aggregate';
import { alertTotal } from '@/lib/aggregate';
import type { IconName } from '@/lib/icons';
import { Icon } from './Icon';

export function TopBar({ icon, label, synced, syncing, onRefresh, alerts, notifOpen, onNotif, onAlert, onExport, onDrawer, filterCount }: {
  icon: IconName;
  label: string;
  synced: string;
  syncing: boolean;
  onRefresh: () => void;
  alerts: Alert[];
  notifOpen: boolean;
  onNotif: () => void;
  onAlert: (a: Alert) => void;
  onExport: () => void;
  onDrawer: () => void;
  filterCount: number;
}) {
  const n = alertTotal(alerts);
  return (
    <header id="top">
      <div className="htitle"><Icon name={icon} className="lu-sm" /><b>{label}</b></div>
      <div className="topright">
        <div className="sync"><span className={syncing ? 'led busy' : 'led'} />Cập nhật <b>{synced}</b></div>
        <button className={syncing ? 'ibtn icon spin' : 'ibtn icon'} onClick={onRefresh} disabled={syncing} title="Tải lại" aria-label="Tải lại">
          <Icon name="refresh-cw" className="lu-sm" />
        </button>
        <div className="wrap">
          <button className="ibtn icon" onClick={onNotif} title="Cảnh báo" aria-label="Cảnh báo">
            <Icon name="bell" className="lu-sm" />{n ? <s>{n}</s> : null}
          </button>
          <div className="pop" hidden={!notifOpen}>
            <div className="h">Cảnh báo ngưỡng</div>
            {alerts.length ? alerts.map((a) => (
              <button className="r" key={a.th.key} onClick={() => onAlert(a)}>
                <i style={{ background: `var(--${a.tone})` }} />{a.label}<b>{a.keys.length}</b>
              </button>
            )) : <div className="r" style={{ color: 'var(--ink3)' }}>Chưa có ngưỡng nào</div>}
          </div>
        </div>
        <button className="ibtn" onClick={onExport}><Icon name="download" className="lu-sm" />Xuất dữ liệu</button>
        <button className="ibtn pri" onClick={onDrawer}>
          <Icon name="sliders-horizontal" className="lu-sm" />Bộ lọc{filterCount ? <b>{' ' + filterCount}</b> : null}
        </button>
      </div>
    </header>
  );
}
