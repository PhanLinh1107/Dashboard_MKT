/* Bar xếp hạng: tên nhóm nằm ngay cạnh thanh nên không cần legend. Bấm một thanh = lọc chéo theo nhóm đó. */
import { maxOf } from '@/lib/tokens';

export type Bar = { k: string; name: string; v: number; lab: string; color: string; onClick?: () => void };

export function RankBars({ w, h, items, pl = 118, pr = 88 }: { w: number; h: number; items: Bar[]; pl?: number; pr?: number }) {
  const iw = Math.max(20, w - pl - pr);
  const n = Math.max(1, items.length), slot = h / n, bh = Math.min(30, Math.max(8, slot * 0.54));
  const max = maxOf(items.map((i) => i.v));
  return (
    <svg width={w} height={h}>
      {items.map((it, i) => {
        const y = i * slot + (slot - bh) / 2, bw = Math.max(3, (Math.max(0, it.v) / max) * iw);
        return (
          <g key={it.k} onClick={it.onClick} style={{ cursor: it.onClick ? 'pointer' : undefined }}>
            <title>{`${it.k} · ${it.lab}`}</title>
            <text x={pl - 11} y={y + bh / 2 + 4} textAnchor="end" fontSize={12} style={{ fill: 'var(--label)' }}>{it.name}</text>
            <rect x={pl} y={y} width={iw} height={bh} rx={5} style={{ fill: 'var(--fill4)' }} />
            <rect x={pl} y={y} width={bw} height={bh} rx={5} style={{ fill: it.color }} />
            <text x={pl + iw + 9} y={y + bh / 2 + 4} fontSize={11.5} style={{ fill: 'var(--label2)' }}>{it.lab}</text>
          </g>
        );
      })}
    </svg>
  );
}
