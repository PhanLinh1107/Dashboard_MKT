/* Card chart: tiêu đề (chead 43px) → legend (nếu có, NẰM TRÊN chart) → vùng vẽ.
   Bề rộng là số px cứng từ layout(). padding .card = 14 = CARD_PAD — đổi một bên là chart bị xén. */
import type { ReactNode } from 'react';
import { GRAIN_VI } from '@/lib/aggregate';
import type { Grain } from '@/lib/types';

export function ChartCard({ width, title, sub, right, legend, children }: {
  width: number;
  title: string;
  sub: string;
  right?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card" style={{ width, flex: `0 0 ${width}px` }}>
      <div className="chead">
        <div><div className="ct">{title}</div><div className="cs">{sub}</div></div>
        {right}
      </div>
      {legend}
      {children}
    </div>
  );
}

/* Ngày/Tuần/Tháng: CHỈ đặt ở card có trục thời gian. Bảng theo kỳ dùng chung biến grain, không có nút riêng. */
export function GrainSeg({ grain, onGrain }: { grain: Grain; onGrain: (g: Grain) => void }) {
  return (
    <div className="seg sm">
      {(['day', 'week', 'month'] as const).map((g) => (
        <button key={g} className={grain === g ? 'on' : undefined} onClick={() => onGrain(g)}>{GRAIN_VI[g]}</button>
      ))}
    </div>
  );
}

/* Legend: chỉ màu ↔ tên nhóm, không kèm số. Chỉ donut (two = 2 hàng, 44px) và line nhiều đường (24px). */
export function Legend({ items, two }: { items: { name: string; color: string }[]; two?: boolean }) {
  return (
    <div className={two ? 'lgd two' : 'lgd'}>
      {items.map((i) => (
        <span className="li" key={i.name}><i style={{ background: i.color }} /><b>{i.name}</b></span>
      ))}
    </div>
  );
}
