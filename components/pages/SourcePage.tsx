/* Trang 4 · Nguồn dữ liệu — không có băng KPI (#body.nokpi giãn hai hàng còn lại).
   Biến môi trường chỉ hiện TÊN và có/thiếu, không bao giờ hiện giá trị. */
import type { CSSProperties, ReactNode } from 'react';
import { COLUMNS, DATE_COL } from '@/lib/config';
import { ddmmyyyy, vi } from '@/lib/format';
import type { Layout } from '@/lib/tokens';
import type { Meta, Row } from '@/lib/types';
import { ChartCard } from '../ChartCard';
import { Icon } from '../Icon';

const ENV_NAMES = ['GOOGLE_SHEETS_SPREADSHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
const kv: CSSProperties = { flex: '0 0 auto', minHeight: 0, padding: '9px 0', borderBottom: '1px solid var(--line2)' };

function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="rank" style={{ overflow: 'visible' }}>
      {items.map(([k, v]) => (
        <div className="rk" style={kv} key={k}><div className="rkh" style={{ margin: 0 }}><b>{k}</b><span>{v}</span></div></div>
      ))}
    </div>
  );
}

function quality(rows: Row[], meta: Meta): [string, number, string][] {
  const metrics = COLUMNS.filter((c) => c.role === 'METRIC').map((c) => c.name);
  const dims = COLUMNS.filter((c) => c.type === 'text').map((c) => c.name);
  const neg = rows.filter((r) => metrics.some((m) => (r.m[m] ?? 0) < 0)).length;
  const seen = new Set<string>();
  let dup = 0;
  for (const r of rows) {
    const key = [r.date, ...dims.map((d) => r.d[d])].join('|');
    if (seen.has(key)) dup++;
    else seen.add(key);
  }
  const gaps = meta.days - new Set(rows.map((r) => r.date)).size;
  let drift = 0;
  for (const c of COLUMNS.filter((x) => x.role === 'ATTRIBUTE')) {
    const per = new Map<string, Set<number>>();
    for (const r of rows) {
      const k = r.d[c.entity ?? ''] ?? '';
      let s = per.get(k);
      if (!s) per.set(k, (s = new Set()));
      s.add(r.m[c.name] ?? 0);
    }
    drift += [...per.values()].filter((s) => s.size > 1).length;
  }
  return [
    ['Dòng trống bị bỏ qua', meta.skipped, '—'],
    ['Ngày sai định dạng (bị bỏ)', meta.badDates, `cột ${DATE_COL}, dạng yyyy-mm-dd`],
    ['Ô số không đọc được', meta.badNumbers, 'tính là 0'],
    ['Số âm ở cột metric', neg, '—'],
    ['Trùng khoá (ngày + mọi cột chữ)', dup, '—'],
    ['Ngày không có dòng nào', gaps, `trong ${vi(meta.days)} ngày`],
    ['Thuộc tính đổi giá trị trong một thực thể', drift, 'cột ATTRIBUTE phải cố định'],
  ];
}

export function SourcePage({ rows, meta, L }: { rows: Row[]; meta: Meta; L: Layout }) {
  const sheets = meta.source === 'sheets';
  const first = rows[0];
  const example = (name: string, type: string) =>
    !first ? '—' : type === 'date' ? first.date : type === 'text' ? first.d[name] : vi(first.m[name] ?? 0);

  return (
    <>
      <div id="row2">
        <ChartCard width={L.a} title="Kết nối" sub={sheets ? 'Google Sheets API v4' : 'File CSV trên máy'}>
          <KV items={[
            ['Trạng thái', <span className="ok" key="s"><Icon name="circle-check" className="lu-sm" />Đã kết nối</span>],
            [sheets ? 'Spreadsheet' : 'File', sheets ? meta.title || '—' : meta.sheet],
            ...(sheets ? [['Tab', meta.sheet] as [string, ReactNode]] : []),
            ['Số dòng', vi(meta.count)],
            ['Khoảng ngày', `${ddmmyyyy(meta.from)} → ${ddmmyyyy(meta.to)}`],
            ['Quyền', sheets ? 'Service Account · chỉ đọc' : 'Đọc file'],
            ['Làm mới', 'Mỗi lần mở trang hoặc bấm Tải lại'],
          ]} />
        </ChartCard>
        <ChartCard width={L.b} title="Schema & vai trò cột" sub="Do skill dashboard-design gán, duyệt trong docs/1-spec">
          <div className="tscroll">
            <table>
              <thead><tr><th>Cột</th><th style={{ textAlign: 'left' }}>Kiểu</th><th style={{ textAlign: 'left' }}>Vai trò</th><th>Ví dụ</th></tr></thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className="mono" style={{ textAlign: 'left', color: 'var(--ink3)' }}>{c.type}</td>
                    <td style={{ textAlign: 'left' }}><span className="role">{c.role}{c.role === 'ATTRIBUTE' ? ' · MAX' : ''}</span></td>
                    <td style={{ color: 'var(--label2)' }}>{example(c.name, c.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
      <div id="row3">
        <ChartCard width={L.c} title="Biến môi trường" sub="Chỉ tên biến. Giá trị nằm trong app/.env.local, không bao giờ hiện ra đây">
          <KV items={ENV_NAMES.map((k) => [
            k,
            !sheets ? <span key={k} style={{ color: 'var(--ink3)' }}>không dùng (CSV)</span>
              : meta.env[k] ? <span className="ok" key={k}><Icon name="check" className="lu-sm" />có</span>
              : <span key={k} style={{ color: 'var(--red)' }}>thiếu</span>,
          ] as [string, ReactNode])} />
        </ChartCard>
        <ChartCard width={L.d} title="Chất lượng dữ liệu" sub="Kiểm tự động sau mỗi lần tải">
          <div className="tscroll">
            <table>
              <thead><tr><th>Kiểm tra</th><th>Kết quả</th><th style={{ textAlign: 'left' }}>Ghi chú</th></tr></thead>
              <tbody>
                {quality(rows, meta).map(([a, n, note]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td style={{ color: n ? 'var(--orange)' : 'var(--green)', fontWeight: 600 }}>{vi(n)}</td>
                    <td style={{ textAlign: 'left', color: 'var(--label2)' }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
