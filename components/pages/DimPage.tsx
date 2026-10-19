/* Trang 2 và 3 · Theo một dimension — cùng bố cục, đổi dimension.
   Màu của một nhóm = hạng của nó theo chỉ số đang chọn, giữ nguyên trên cả 4 chart của trang. */
import { GRAIN_VI, agg, byGrain, group, sortBy } from '@/lib/aggregate';
import { CFG, PRIMARY, isAdditive, labelOf, lower, metric } from '@/lib/config';
import { fmt, pct } from '@/lib/format';
import { LGD1, LGD2, seriesColor, type Layout } from '@/lib/tokens';
import type { Grain, Group, Row } from '@/lib/types';
import { ChartCard, GrainSeg, Legend } from '../ChartCard';
import { DonutChart } from '../charts/DonutChart';
import { RankBars } from '../charts/RankBars';
import { DimTable } from '../charts/Tables';
import { TrendChart } from '../charts/TrendChart';
import { short } from './OverviewPage';

export function DimPage({ rows, L, dim, param, grain, onGrain, from, onToggle }: {
  rows: Row[];
  L: Layout;
  dim: string;
  param: string;
  grain: Grain;
  onGrain: (g: Grain) => void;
  from: string;
  onToggle: (dim: string, key: string) => void;
}) {
  const p = metric(param);
  const f = (v: number) => fmt(p.format, v);
  const dl = lower(labelOf(dim));
  const total = agg(rows);
  const G = sortBy(group(rows, dim), param);
  const rank = new Map(G.map((g, i) => [g.k, i]));
  const colorOf = (g: Group) => seriesColor(g.v, rank.get(g.k) ?? 0);
  const top = G.slice(0, 5); // 5 đường là trần đọc được của line chart
  const dk = isAdditive(param) ? param : CFG.donutMetric;
  const dm = metric(dk);
  const share = sortBy([...G], dk).slice(0, 6);
  const periods = byGrain(rows, grain, from);
  const lines = top.map((g) => {
    const m = new Map(byGrain(rows.filter((r) => r.d[dim] === g.k), grain, from).map((x) => [x.k, x.v[param] ?? 0]));
    return { name: g.k, color: colorOf(g), width: 2, values: periods.map((x) => m.get(x.k) ?? 0) };
  });

  return (
    <>
      <div id="row2">
        <ChartCard width={L.a} title={`Xếp hạng ${dl}`} sub={`${p.label} · bấm để lọc`}>
          <div className="plot">
            <RankBars w={L.p2a.w} h={L.p2a.h} pl={dim === PRIMARY ? 100 : 126} pr={76}
                      items={G.slice(0, 7).map((g) => ({
                        k: g.k, name: short(g.k, 14), v: g.v[param] ?? 0, lab: f(g.v[param] ?? 0), color: colorOf(g),
                        onClick: () => onToggle(dim, g.k),
                      }))} />
          </div>
        </ChartCard>
        <ChartCard width={L.b} title={`${p.label} theo ${dl} qua thời gian`} sub={`Top ${top.length} · theo ${lower(GRAIN_VI[grain])}`}
                   right={<GrainSeg grain={grain} onGrain={onGrain} />}
                   legend={<Legend items={lines.map((l) => ({ name: l.name, color: l.color }))} />}>
          <div className="plot">
            <TrendChart w={L.p2b.w} h={L.p2b.h - LGD1} labels={periods.map((x) => x.label)} series={lines} fmt={f} />
          </div>
        </ChartCard>
      </div>
      <div id="row3">
        <ChartCard width={L.c} title={`Tỷ trọng ${dm.label}`} sub={`Trên tổng ${fmt(dm.format, total[dk] ?? 0)}`}
                   legend={<Legend two items={share.map((g) => ({ name: g.k, color: colorOf(g) }))} />}>
          <div className="plot">
            <DonutChart w={L.p3c.w} h={L.p3c.h - LGD2}
                        items={share.map((g) => ({
                          k: g.k, v: Math.max(0, g.v[dk] ?? 0), lab: fmt(dm.format, g.v[dk] ?? 0), color: colorOf(g),
                          onClick: () => onToggle(dim, g.k),
                        }))}
                        center={[share.length ? pct((share[0].v[dk] ?? 0) / (total[dk] || 1), 0) : '—', share[0] ? short(share[0].k, 18) : '']} />
          </div>
        </ChartCard>
        <ChartCard width={L.d} title="Bảng chỉ số đầy đủ" sub={`Sắp theo ${p.label}`}>
          <DimTable dim={dim} dimLabel={labelOf(dim)} groups={G} total={total} keys={CFG.tableMetrics} />
        </ChartCard>
      </div>
    </>
  );
}
