/* ═══════════════════════════════════════════════════════════════════════════
   lib/tokens.ts — NGUỒN DUY NHẤT cho mọi kích thước chart
   Không đọc clientWidth, không ResizeObserver ⇒ mọi máy vẽ ra cùng một pixel.
   ═══════════════════════════════════════════════════════════════════════════ */
import { LOSS, meets } from './config';
import type { Agg } from './types';

export const CV = { w: 1600, h: 900 } as const;

export const SIDE_BORDER = 1;
export const BODY_PAD_X = 24;
export const GAP = 14;
export const KPI_GAP = 12;
/* 46 + 20 + 52 + 14 + 118 + 14 + 301 + 14 + 301 + 20 = 900 */
export const BAND = { greet: 52, kpi: 118, row2: 301, row3: 301 } as const;
export const CARD_PAD = 14; // = .card { padding:14px }. Đổi một bên là chart bị xén mép phải
export const CHEAD = 43;
export const LGD1 = 24; // legend 1 hàng — line nhiều đường
export const LGD2 = 44; // legend 2 hàng — donut
export const SIDE_WIDE = 206;
export const SIDE_RAIL = 58;

export type Plot = { w: number; h: number };
export type Layout = {
  innerW: number;
  a: number; b: number; c: number; d: number;
  kpiW: number;
  p2a: Plot; p2b: Plot; p3c: Plot; p3d: Plot;
};

/* Mọi kích thước suy ra từ MỘT biến: bề rộng sidebar.
   206 → Row 2: 399 / 932 · Row 3: 532 / 799 · KPI 259 · chiều cao vẽ 230
    58 → Row 2: 443 / 1036 · Row 3: 591 / 888 · KPI 289 · chiều cao vẽ 230 */
export function layout(side: number = SIDE_WIDE): Layout {
  const innerW = CV.w - side - SIDE_BORDER - BODY_PAD_X * 2;
  const a = Math.floor((innerW - GAP) * 0.3), b = innerW - GAP - a;
  const c = Math.floor((innerW - GAP) * 0.4), d = innerW - GAP - c;
  const plot = (w: number, bandH: number): Plot => ({ w: w - CARD_PAD * 2, h: bandH - CARD_PAD * 2 - CHEAD });
  return {
    innerW, a, b, c, d,
    kpiW: Math.floor((innerW - KPI_GAP * 4) / 5),
    p2a: plot(a, BAND.row2), p2b: plot(b, BAND.row2),
    p3c: plot(c, BAND.row3), p3d: plot(d, BAND.row3),
  };
}

/* Thang mực 5 bậc: chênh nhau về độ sáng, không về sắc. */
export const SER = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'] as const;

/* Màu một chuỗi dữ liệu, đọc từ trên xuống, gặp là dừng:
   1 · dưới ngưỡng lỗ → --bad   2 · hạng 1 → --focus   3 · còn lại → --series-N theo hạng.
   Trả về var(...) nên đổi sáng/tối là chart tự đổi màu, không cần vẽ lại. */
export function seriesColor(v: Agg | null, rank: number): string {
  if (v && LOSS && meets(v[LOSS.metric], LOSS)) return 'var(--bad)';
  if (rank === 0) return 'var(--focus)';
  return `var(${SER[Math.min(4, rank)]})`;
}

/* Đừng viết Math.max(1, ...v): tỷ lệ 0,0121 bị ép max = 1, thanh teo còn 10px.
   Đừng viết Math.max(...v) || 1: mảng rỗng cho -Infinity, mà -Infinity là truthy. */
export function maxOf(values: number[]): number {
  let m = -Infinity;
  for (const v of values) if (Number.isFinite(v) && v > m) m = v;
  return m > 0 ? m : 1;
}
