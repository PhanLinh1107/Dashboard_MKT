'use client';
/* Area một chuỗi (trang Tổng quan) và line nhiều đường (trang theo dimension) — cùng một hàm vẽ.
   SVG tay, kích thước px cứng. Nhãn trục x cuối neo 'end' để không bị overflow:hidden của card xén. */
import { useId, type MouseEvent } from 'react';
import { maxOf } from '@/lib/tokens';
import { hideTip, showTip } from '../Tip';

export type Series = { name: string; color: string; values: number[]; area?: boolean; width?: number };

export function TrendChart({ w, h, labels, series, fmt }: {
  w: number;
  h: number;
  labels: string[];
  series: Series[];
  fmt: (v: number) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pl = 56, pr = 12, pt = 12, pb = 24;
  const iw = Math.max(20, w - pl - pr), ih = Math.max(20, h - pt - pb);
  const n = labels.length;
  const max = maxOf(series.flatMap((s) => s.values)) * 1.12;
  const x = (i: number) => pl + (n < 2 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => pt + ih - (Math.max(0, v) / max) * ih;
  const step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 78))));

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    const sc = b.width / w;
    const j = Math.round(((e.clientX - b.left) / sc - pl) / iw * (n - 1));
    if (j < 0 || j >= n) return hideTip();
    showTip(e, labels[j], series.map((s) => ({ name: s.name, color: s.color, v: fmt(s.values[j] ?? 0) })));
  }

  return (
    <svg width={w} height={h} onMouseMove={onMove} onMouseLeave={hideTip}>
      {[0, 1, 2, 3].map((i) => {
        const yy = pt + ih - (i * ih) / 3;
        return (
          <g key={i}>
            <line x1={pl} y1={yy} x2={w - pr} y2={yy} style={{ stroke: 'var(--fill4)' }} strokeWidth={1} />
            <text x={pl - 9} y={yy + 4} textAnchor="end" fontSize={10.5} style={{ fill: 'var(--label2)' }}>{fmt((max * i) / 3)}</text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
        if (!d) return null;
        const gid = `g${uid}${si}`;
        return (
          <g key={s.name}>
            {s.area && (
              <>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: s.color, stopOpacity: 0.22 }} />
                    <stop offset="1" style={{ stopColor: s.color, stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d={`${d} L${x(n - 1)} ${pt + ih} L${x(0)} ${pt + ih}Z`} fill={`url(#${gid})`} />
              </>
            )}
            <path d={d} fill="none" style={{ stroke: s.color }} strokeWidth={s.width ?? 2.2}
                  strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % step === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={h - 7} textAnchor={i === n - 1 && n > 1 ? 'end' : 'middle'} fontSize={10.5}
                style={{ fill: 'var(--label2)' }}>{l}</text>
        ) : null,
      )}
    </svg>
  );
}
