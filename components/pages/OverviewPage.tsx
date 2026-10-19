/* Trang 1 · Tổng quan — đúng 4 chart, chia 30/70 (Row 2) và 40/60 (Row 3). */
import { GRAIN_VI, agg, byGrain, group, sortBy } from '@/lib/aggregate';
import { CFG, PRIMARY, SECONDARY, isAdditive, labelOf, lower, metric, thresholdsOf } from '@/lib/config';
import { fmt, pct } from '@/lib/format';
import { LGD2, seriesColor, type Layout } from '@/lib/tokens';
import type { Grain, Row } from '@/lib/types';
import { ChartCard, GrainSeg, Legend } from '../ChartCard';
import { DonutChart } from '../charts/DonutChart';
import { RankBars } from '../charts/RankBars';
import { PeriodTable } from '../charts/Tables';
import { TrendChart } from '../charts/TrendChart';

export const short = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function OverviewPage({ rows, L, param, grain, onGrain, from, onToggle }: {
  rows: Row[];
  L: Layout;
  param: string;
  grain: Grain;
  onGrain: (g: Grain) => void;
  from: string;
  onToggle: (dim: string, key: string) => void;
}) {
  const p = metric(param);
  const f = (v: number) => fmt(p.format, v);
  const dk = isAdditive(param) ? param : CFG.donutMetric; // donut chỉ vẽ chỉ số cộng được
  const dm = metric(dk);
  const total = agg(rows);
  const byPrim = sortBy(group(rows, PRIMARY), dk);
  const bySec = sortBy(group(rows, SECONDARY), param).slice(0, 7);
  const periods = byGrain(rows, grain, from);
  const slices = byPrim.map((g, i) => ({
    k: g.k, v: Math.max(0, g.v[dk] ?? 0), lab: fmt(dm.format, g.v[dk] ?? 0), color: seriesColor(g.v, i),
    onClick: () => onToggle(PRIMARY, g.k),
  }));
  const bad = CFG.matrixMetrics.filter((k) => thresholdsOf(k).some((t) => t.kind === 'unit_cost')).map((k) => metric(k).label);

  return (
    <>
      <div id="row2">
        <ChartCard width={L.a} title={`Tỷ trọng theo ${lower(labelOf(PRIMARY))}`} sub={`${dm.label} · bấm để lọc`}
                   legend={<Legend two items={slices.map((s) => ({ name: s.k, color: s.color }))} />}>
          <div className="plot">
            <DonutChart w={L.p2a.w} h={L.p2a.h - LGD2} items={slices}
                        center={[byPrim.length ? pct((byPrim[0].v[dk] ?? 0) / (total[dk] || 1), 0) : '—', byPrim[0]?.k ?? '']} />
          </div>
        </ChartCard>
        <ChartCard width={L.b} title={`Xu hướng ${p.label}`} sub={`Theo ${lower(GRAIN_VI[grain])} · đưa chuột lên chart để xem chi tiết`}
                   right={<GrainSeg grain={grain} onGrain={onGrain} />}>
          <div className="plot">
            <TrendChart w={L.p2b.w} h={L.p2b.h} labels={periods.map((x) => x.label)} fmt={f}
                        series={[{ name: p.label, color: 'var(--focus)', area: true, values: periods.map((x) => x.v[param] ?? 0) }]} />
          </div>
        </ChartCard>
      </div>
      <div id="row3">
        <ChartCard width={L.c} title={`Top ${lower(labelOf(SECONDARY))}`} sub={`${p.label} · bấm để lọc chéo`}>
          <div className="plot">
            <RankBars w={L.p3c.w} h={L.p3c.h} pl={132} pr={76}
                      items={bySec.map((g, i) => ({
                        k: g.k, name: short(g.k, 16), v: g.v[param] ?? 0, lab: f(g.v[param] ?? 0), color: seriesColor(g.v, i),
                        onClick: () => onToggle(SECONDARY, g.k),
                      }))} />
          </div>
        </ChartCard>
        <ChartCard width={L.d} title={`Hiệu quả theo ${lower(GRAIN_VI[grain])}`}
                   sub={'Ô càng đậm càng cao' + (bad.length ? ` · ${bad.join(', ')} đỏ là càng xấu` : '')}>
          <PeriodTable periods={periods} total={total} keys={CFG.matrixMetrics} />
        </ChartCard>
      </div>
    </>
  );
}
