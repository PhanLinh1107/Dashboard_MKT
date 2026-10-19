'use client';
/* Tooltip của chart. Nằm NGOÀI #viewport: phần tử position:fixed bên trong một khối có scale sẽ bị lệch toạ độ. */
import { useSyncExternalStore } from 'react';

export type TipRow = { name: string; color: string; v: string };
type TipState = { x: number; y: number; title: string; rows: TipRow[] } | null;

let state: TipState = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function showTip(e: { clientX: number; clientY: number }, title: string, rows: TipRow[]) {
  state = { x: e.clientX, y: e.clientY, title, rows };
  emit();
}
export function hideTip() {
  if (state) { state = null; emit(); }
}

export function Tip() {
  const s = useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => state,
    () => null,
  );
  return (
    <div className="tip" style={s ? { opacity: 1, left: Math.min(innerWidth - 200, s.x + 16), top: Math.max(8, s.y - 14) } : undefined}>
      {s && (
        <>
          <b>{s.title}</b>
          {s.rows.map((r) => (
            <div className="r" key={r.name}><i style={{ background: r.color }} />{r.name}<span>{r.v}</span></div>
          ))}
        </>
      )}
    </div>
  );
}
