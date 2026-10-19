/* Donut tỷ trọng. Chỉ dùng cho chỉ số CỘNG ĐƯỢC (chi phí, doanh thu) — tỷ trọng của một tỷ lệ là vô nghĩa.
   Bấm một lát = lọc theo nhóm đó. */
export type Slice = { k: string; v: number; lab: string; color: string; onClick?: () => void };

export function DonutChart({ w, h, items, center }: { w: number; h: number; items: Slice[]; center: [string, string] }) {
  const size = Math.max(80, Math.min(w, h) - 6), r = size / 2, ir = r * 0.64, cx = w / 2, cy = h / 2;
  const tot = items.reduce((s, i) => s + Math.max(0, i.v), 0) || 1;
  let a = -Math.PI / 2;
  const pt = (rad: number, ang: number) => `${cx + rad * Math.cos(ang)} ${cy + rad * Math.sin(ang)}`;
  return (
    <svg width={w} height={h}>
      {items.map((it) => {
        const ang = (Math.max(0, it.v) / tot) * Math.PI * 2;
        const s = a, e = a + ang;
        a = e;
        if (ang <= 0) return null;
        let d: string;
        if (ang > Math.PI * 2 - 1e-6) {
          // một nhóm chiếm 100%: một cung tròn khép kín không vẽ được bằng A, nên vẽ hai nửa
          d = `M${pt(r, s)} A${r} ${r} 0 1 1 ${pt(r, s + Math.PI)} A${r} ${r} 0 1 1 ${pt(r, s)} ` +
              `M${pt(ir, s)} A${ir} ${ir} 0 1 0 ${pt(ir, s + Math.PI)} A${ir} ${ir} 0 1 0 ${pt(ir, s)}Z`;
        } else {
          const lg = ang > Math.PI ? 1 : 0;
          d = `M${pt(r, s)} A${r} ${r} 0 ${lg} 1 ${pt(r, e)} L${pt(ir, e)} A${ir} ${ir} 0 ${lg} 0 ${pt(ir, s)}Z`;
        }
        return (
          <path key={it.k} d={d} fillRule="evenodd" style={{ fill: it.color, stroke: 'var(--bg)', cursor: it.onClick ? 'pointer' : undefined }}
                strokeWidth={2} onClick={it.onClick}>
            <title>{`${it.k} · ${it.lab}`}</title>
          </path>
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={19} fontWeight={600} letterSpacing="-.6" style={{ fill: 'var(--label)' }}>{center[0]}</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize={11} style={{ fill: 'var(--label2)' }}>{center[1]}</text>
    </svg>
  );
}
