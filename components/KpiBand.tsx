/* Băng 5 thẻ KPI (118px). Mỗi thẻ: nhãn · số lớn + so kỳ trước · sparkline có đường chuẩn · chân ghi ngưỡng.
   Chỉ KPI có ngưỡng mới được tô xanh/đỏ. Chỉ số nghịch (better: lower) tăng là xấu ⇒ mũi tên đảo màu. */
import type { ReactNode } from 'react';
import { agg, byGrain } from '@/lib/aggregate';
import { CFG, meets, metric, thresholdsOf } from '@/lib/config';
import { fmt, pct } from '@/lib/format';
import type { IconName } from '@/lib/icons';
import type { Agg, Period, Row } from '@/lib/types';
import { Icon } from './Icon';
import { SparkLine } from './charts/SparkLine';

const DEFAULT_ICONS: IconName[] = ['coins', 'trending-up', 'target', 'gauge', 'chart-pie'];

function KpiCard({ k, i, a, p, days, w }: { k: string; i: number; a: Agg; p: Agg; days: Period[]; w: number }) {
  const m = metric(k);
  const f = (x: number) => fmt(m.format, x);
  const v = a[k] ?? 0, pv = p[k] ?? 0;

  let cls = 'n';
  let delta: ReactNode = '—';
  if (pv) {
    const d = (v - pv) / pv;
    const good = m.better === 'lower' ? d < 0 : d > 0;
    cls = Math.abs(d) < 0.002 ? 'n' : good ? 'u' : 'd';
    delta = <><Icon name={d >= 0 ? 'arrow-up' : 'arrow-down'} className="lu-xs" />{pct(Math.abs(d))}</>;
  }

  const ths = thresholdsOf(k);
  const t = ths.find((x) => x.kind === 'target') ?? ths.find((x) => x.kind === 'unit_cost') ?? ths.find((x) => x.kind === 'loss');
  const values = days.map((d) => d.v[k] ?? 0);
  let hit: boolean | null = null;
  let note: string;
  let base: number | null;
  if (t) {
    base = t.value;
    if (t.kind === 'target') {
      hit = meets(v, t);
      note = `mục tiêu ${f(t.value)}` + (hit ? '' : ` · đang thiếu ${f(Math.abs(t.value - v))}`);
    } else if (t.kind === 'unit_cost') {
      hit = !meets(v, t);
      note = `ngưỡng ${f(t.value)}` + (hit ? '' : ` · vượt ${f(Math.abs(v - t.value))}`);
    } else {
      hit = !meets(v, t);
      note = `hoà vốn ${f(t.value)}` + (hit ? '' : ' · đang lỗ');
    }
  } else {
    base = values.length ? values.reduce((s, x) => s + x, 0) / values.length : null;
    note = `so với ${f(pv)} kỳ trước`;
  }
  const color = hit === null ? (k === CFG.defaultParam ? 'var(--focus)' : 'var(--series-2)') : hit ? 'var(--ok)' : 'var(--bad)';

  return (
    <div className="card kpi">
      <div className="kl"><Icon name={m.icon ?? DEFAULT_ICONS[i % 5]} className="lu-sm" />{m.label}</div>
      <div className="kv">{f(v)}<span className={`del ${cls}`}>{delta}</span></div>
      <div className="kspark"><SparkLine w={w} h={34} values={values} color={color} base={base} /></div>
      <div className={hit === null ? 'ks' : hit ? 'ks ok' : 'ks bad'}>
        <Icon name={hit === null ? 'clock' : hit ? 'circle-check' : 'triangle-alert'} className="lu-xs" />{note}
      </div>
    </div>
  );
}

export function KpiBand({ rows, prev, kpiW, from }: { rows: Row[]; prev: Row[]; kpiW: number; from: string }) {
  const a = agg(rows), p = agg(prev);
  const days = byGrain(rows, 'day', from);
  return (
    <div id="kpis">
      {CFG.kpis.map((k, i) => <KpiCard key={k} k={k} i={i} a={a} p={p} days={days} w={kpiW - 28} />)}
    </div>
  );
}
