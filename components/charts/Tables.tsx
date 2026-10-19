/* Hai bảng viết tay bằng <table>: bảng theo kỳ tô nhiệt (trang Tổng quan) và bảng chỉ số đầy đủ theo nhóm.
   Bảng cuộn TRONG khối .tscroll, không làm cuộn cả trang. */
import { iconOf, meets, metric, thresholdsOf } from '@/lib/config';
import { fmt } from '@/lib/format';
import type { Agg, Group, Period } from '@/lib/types';
import { Icon } from '../Icon';

/* Ô nhiệt pha 5% → 29% mực. Pha mạnh hơn (8% → 48%) thì ô cao nhất lại là ô khó đọc nhất, và ở dark mode đảo ngược.
   Chỉ số chi phí đơn vị (có ngưỡng unit_cost, ví dụ CPL) pha bằng --bad: càng đậm càng xấu. */
export function PeriodTable({ periods, total, keys }: { periods: Period[]; total: Agg; keys: string[] }) {
  if (!periods.length) return <div className="cs">Không có dữ liệu</div>;
  const range = Object.fromEntries(keys.map((k) => {
    const v = periods.map((p) => p.v[k] ?? 0);
    return [k, [Math.min(...v), Math.max(...v)] as const];
  }));
  const heat = (k: string, v: number) => {
    const [mn, mx] = range[k];
    if (mx === mn) return undefined;
    const p = (5 + ((v - mn) / (mx - mn)) * 24).toFixed(0);
    const ink = thresholdsOf(k).some((t) => t.kind === 'unit_cost') ? '--bad' : '--focus';
    return { background: `color-mix(in srgb, var(${ink}) ${p}%, transparent)` };
  };
  return (
    <div className="tscroll">
      <table>
        <thead><tr><th>Kỳ</th>{keys.map((k) => <th key={k}>{metric(k).label}</th>)}</tr></thead>
        <tbody>
          {periods.map((p) => (
            <tr key={String(p.k)}>
              <td>{p.label}</td>
              {keys.map((k) => (
                <td key={k}><span className="heat" style={heat(k, p.v[k] ?? 0)}>{fmt(metric(k).format, p.v[k] ?? 0)}</span></td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td>Tổng / TB</td>{keys.map((k) => <td key={k}>{fmt(metric(k).format, total[k] ?? 0)}</td>)}</tr></tfoot>
      </table>
    </div>
  );
}

export function DimName({ dim, value }: { dim: string; value: string }) {
  const ic = iconOf(dim, value);
  if (!ic) return <>{value}</>;
  return (
    <span className="cn"><span className="sq"><Icon name={ic} /></span><span className="nm">{value}</span></span>
  );
}

/* Màu chữ trong bảng chỉ xuất hiện khi có một con số so với một ngưỡng (luật 2). */
function cellStyle(k: string, v: number) {
  for (const t of thresholdsOf(k)) {
    if (t.kind === 'loss') return { color: meets(v, t) ? 'var(--red)' : 'var(--green)', fontWeight: 600 };
    if (t.kind === 'unit_cost' && meets(v, t)) return { color: 'var(--red)' };
  }
  return undefined;
}

export function DimTable({ dim, dimLabel, groups, total, keys }: {
  dim: string; dimLabel: string; groups: Group[]; total: Agg; keys: string[];
}) {
  return (
    <div className="tscroll">
      <table>
        <thead><tr><th>{dimLabel}</th>{keys.map((k) => <th key={k}>{metric(k).label}</th>)}</tr></thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.k}>
              <td><DimName dim={dim} value={g.k} /></td>
              {keys.map((k) => <td key={k} style={cellStyle(k, g.v[k] ?? 0)}>{fmt(metric(k).format, g.v[k] ?? 0)}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td>Tổng</td>{keys.map((k) => <td key={k}>{fmt(metric(k).format, total[k] ?? 0)}</td>)}</tr></tfoot>
      </table>
    </div>
  );
}
