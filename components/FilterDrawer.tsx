'use client';
/* Drawer bộ lọc: trượt từ phải, nền sau tối đi, ẩn HOÀN TOÀN khi đóng (CSS #stage.drawer).
   Mọi thay đổi trong drawer là NHÁP — chỉ áp dụng khi bấm "Áp dụng".
   Thứ tự: chỉ số → thời gian → dimension chính → bộ lọc phụ → dimension phụ → trạng thái → chân. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultFilters, presetOf } from '@/lib/aggregate';
import { ALERT_DIM, CFG, FILTER_DIM, LOSS, PRIMARY, SECONDARY, labelOf, lower, metric } from '@/lib/config';
import { DAY, ddmmyyyy, fmt, isoAt, isoToUtc, vi } from '@/lib/format';
import type { Filters, Preset, Row } from '@/lib/types';
import { Icon } from './Icon';
import { DimName } from './charts/Tables';

export function FilterDrawer({ open, filters, rows, days, from, onApply, onClose }: {
  open: boolean;
  filters: Filters;
  rows: Row[];
  days: number;
  from: string;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  useEffect(() => {
    if (open) setDraft(filters); // mở drawer = chụp lại bộ lọc đang áp làm nháp
  }, [open, filters]);
  const fromRef = useRef<HTMLInputElement>(null);

  const { prim, sec, parent, extra } = useMemo(() => {
    const cnt = new Map<string, number>();
    const par = new Map<string, Set<string>>();
    const ext = new Set<string>();
    for (const r of rows) {
      cnt.set(r.d[PRIMARY], (cnt.get(r.d[PRIMARY]) ?? 0) + 1);
      let s = par.get(r.d[SECONDARY]);
      if (!s) par.set(r.d[SECONDARY], (s = new Set()));
      s.add(r.d[PRIMARY]);
      if (FILTER_DIM) ext.add(r.d[FILTER_DIM]);
    }
    const nested = [...par.values()].every((s) => s.size === 1); // mỗi giá trị phụ thuộc đúng một nhóm chính
    return {
      prim: [...cnt].sort((a, b) => b[1] - a[1]),
      sec: [...par.keys()].sort((a, b) => a.localeCompare(b, 'vi')),
      parent: (k: string) => (nested ? [...(par.get(k) ?? [])][0] : ''),
      extra: [...ext].sort((a, b) => a.localeCompare(b, 'vi')),
    };
  }, [rows]);

  const set = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));
  const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const idx = (iso: string) => Math.round((isoToUtc(iso) - isoToUtc(from)) / DAY);
  const clamp = (t: number) => Math.max(0, Math.min(days - 1, t));

  function preset(p: Preset) {
    if (p === 'custom') return fromRef.current?.focus();
    const n = p === 'all' ? days : p;
    set({ preset: presetOf(n, days), from: Math.max(0, days - n), to: days - 1 });
  }
  function date(which: 'from' | 'to', v: string) {
    if (!v) return;
    const t = clamp(idx(v));
    if (!Number.isFinite(t)) return;
    if (which === 'from') set({ from: Math.min(t, draft.to), preset: 'custom' });
    else set({ to: Math.max(t, draft.from), preset: 'custom' });
  }

  const presets: [Preset, string][] = [[7, '7 ngày'], [30, '30 ngày'], [90, '3 tháng'], ['all', 'Toàn bộ']];
  const lossM = LOSS ? metric(LOSS.metric) : null;

  return (
    <aside id="drawer" role="dialog" aria-label="Bộ lọc">
      <div className="dh"><b>Bộ lọc</b><button className="ibtn icon" onClick={onClose} aria-label="Đóng"><Icon name="x" className="lu-sm" /></button></div>

      <div className="fl">Chỉ số theo dõi</div>
      <div className="seg sm" style={{ flexWrap: 'wrap' }}>
        {CFG.params.map((k) => (
          <button key={k} className={draft.param === k ? 'on' : undefined} onClick={() => set({ param: k })}>{metric(k).label}</button>
        ))}
      </div>
      <div className="cs" style={{ marginTop: 7 }}>Mọi chart trên dashboard vẽ theo chỉ số này.</div>

      <div className="fl">Khoảng thời gian</div>
      <div className="seg sm" style={{ flexWrap: 'wrap' }}>
        {presets.map(([p, l]) => (
          <button key={String(p)} className={draft.preset === p ? 'on' : undefined} onClick={() => preset(p)}>{l}</button>
        ))}
        <button className={draft.preset === 'custom' ? 'on' : undefined} onClick={() => preset('custom')}>Tùy chọn</button>
      </div>
      {/* min/max giao nhau ⇒ trình duyệt tự chặn chọn khoảng ngược */}
      <div className="dates">
        <label>Từ ngày<input ref={fromRef} type="date" value={isoAt(from, draft.from)} min={isoAt(from, 0)} max={isoAt(from, draft.to)}
                             onChange={(e) => date('from', e.target.value)} /></label>
        <label>Đến ngày<input type="date" value={isoAt(from, draft.to)} min={isoAt(from, draft.from)} max={isoAt(from, days - 1)}
                              onChange={(e) => date('to', e.target.value)} /></label>
      </div>
      <div className="cs" style={{ marginTop: 7 }}>
        {ddmmyyyy(isoAt(from, draft.from))} → {ddmmyyyy(isoAt(from, draft.to))} · {draft.to - draft.from + 1} ngày
      </div>

      <div className="fl">{labelOf(PRIMARY)} <span style={{ color: 'var(--label3)', fontWeight: 400 }}>{draft.primary.length ? `(${draft.primary.length})` : '(tất cả)'}</span></div>
      <div>
        {prim.map(([k, n]) => (
          <button className="cbx" key={k} onClick={() => set({ primary: toggle(draft.primary, k) })}>
            <span className={draft.primary.includes(k) ? 'box on' : 'box'}><Icon name="check" /></span>
            <DimName dim={PRIMARY} value={k} /><span className="n">{vi(n)}</span>
          </button>
        ))}
      </div>

      {FILTER_DIM && (
        <>
          <div className="fl">{labelOf(FILTER_DIM)}</div>
          <select className="fin" value={draft.filter} aria-label={labelOf(FILTER_DIM)} onChange={(e) => set({ filter: e.target.value })}>
            <option value="all">Tất cả {lower(labelOf(FILTER_DIM))}</option>
            {extra.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </>
      )}

      <div className="fl">{labelOf(SECONDARY)} <span style={{ color: 'var(--label3)', fontWeight: 400 }}>{draft.secondary.length ? `(${draft.secondary.length})` : '(tất cả)'}</span></div>
      {/* 140 = 5 hàng × 28px. Cắt giữa một hàng trông như lỗi dựng. */}
      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
        {sec.map((k) => (
          <button className="cbx" key={k} onClick={() => set({ secondary: toggle(draft.secondary, k) })}>
            <span className={draft.secondary.includes(k) ? 'box on' : 'box'}><Icon name="check" /></span>
            {k}<span className="n">{parent(k)}</span>
          </button>
        ))}
      </div>

      {LOSS && lossM && (
        <>
          <div className="fl">Chỉ hiện {lower(labelOf(ALERT_DIM))} đang lỗ</div>
          <button className="cbx" onClick={() => set({ losing: !draft.losing })} style={{ padding: '2px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--label2)' }}>{lossM.label} {LOSS.op} {fmt(lossM.format, LOSS.value)}</span>
            <span className={draft.losing ? 'sw on' : 'sw'}><i /></span>
          </button>
        </>
      )}

      <div className="dfoot">
        <button className="dbtn ghost" onClick={() => setDraft(defaultFilters(days))}>Xoá hết</button>
        <button className="dbtn pri" onClick={() => onApply(draft)}>Áp dụng</button>
      </div>
    </aside>
  );
}
