'use client';
/* Xuất dữ liệu HAI BƯỚC: bấm nút không tải ngay — mở bảng chọn, xem trước số dòng, rồi mới "Tải xuống".
   "Theo bộ lọc dashboard" trả về ĐÚNG tập dòng đang hiển thị (filtered), không lọc lại từ đầu.
   Sửa ở đây không đụng bộ lọc dashboard. Chỉ xuất dữ liệu: không PNG, không PDF. */
import { useEffect, useMemo, useState } from 'react';
import { CFG, COLUMNS, PRIMARY, labelOf } from '@/lib/config';
import { DAY, ddmm, isoAt, isoToUtc, vi } from '@/lib/format';
import type { Filters, Row } from '@/lib/types';
import { Icon } from './Icon';
import { DimName } from './charts/Tables';

type Scope = 'filter' | 'all' | 'custom';
type Sep = ',' | ';';

const valueOf = (r: Row, name: string, type: string): string | number =>
  type === 'date' ? r.date : type === 'text' ? r.d[name] ?? '' : r.m[name] ?? 0;

export function ExportModal({ open, filtered, rows, filters, days, from, onClose }: {
  open: boolean;
  filtered: Row[];
  rows: Row[];
  filters: Filters;
  days: number;
  from: string;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<Scope>('filter');
  const [range, setRange] = useState({ from: filters.from, to: filters.to });
  const [prim, setPrim] = useState<string[]>(filters.primary);
  const [cols, setCols] = useState<string[]>(COLUMNS.map((c) => c.name));
  const [sep, setSep] = useState<Sep>(CFG.export?.separator ?? ';');

  useEffect(() => {
    if (!open) return;
    setScope('filter');
    setRange({ from: filters.from, to: filters.to });
    setPrim(filters.primary);
  }, [open, filters]);

  const primVals = useMemo(() => [...new Set(rows.map((r) => r.d[PRIMARY]))], [rows]);
  const out = useMemo(() => {
    if (scope === 'filter') return filtered;
    if (scope === 'all') return rows;
    return rows.filter((r) => r.t >= range.from && r.t <= range.to && (!prim.length || prim.includes(r.d[PRIMARY])));
  }, [scope, filtered, rows, range, prim]);

  const custom = () => setScope('custom');
  function pickScope(s: Scope) {
    setScope(s);
    if (s === 'all') { setRange({ from: 0, to: days - 1 }); setPrim([]); }
    if (s === 'filter') { setRange({ from: filters.from, to: filters.to }); setPrim(filters.primary); }
  }
  function date(which: 'from' | 'to', v: string) {
    if (!v) return;
    const t = Math.max(0, Math.min(days - 1, Math.round((isoToUtc(v) - isoToUtc(from)) / DAY)));
    setRange((r) => (which === 'from' ? { ...r, from: Math.min(t, r.to) } : { ...r, to: Math.max(t, r.from) }));
    custom();
  }

  const chosen = COLUMNS.filter((c) => cols.includes(c.name));
  const ok = out.length > 0 && chosen.length > 0;

  function download() {
    if (!ok) return;
    // RFC 4180: ô chứa dấu phân cách, nháy kép hoặc xuống dòng thì bọc nháy kép; nháy kép bên trong nhân đôi
    const cell = (v: string | number) => {
      const s = String(v);
      return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [chosen.map((c) => c.name).join(sep), ...out.map((r) => chosen.map((c) => cell(valueOf(r, c.name, c.type))).join(sep))].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM: Excel mới đọc đúng tiếng Việt
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = CFG.export?.filename ?? CFG.app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = u;
    a.download = `${name}_${isoAt(from, range.from)}_${isoAt(from, range.to)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1500);
    onClose();
  }

  const radios: [Scope, string, number][] = [['filter', 'Theo bộ lọc dashboard đang mở', filtered.length], ['all', 'Toàn bộ dữ liệu', rows.length]];

  return (
    <div id="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-label="Xuất dữ liệu">
        <div className="sh"><b>Xuất dữ liệu</b><button className="ibtn icon" onClick={onClose} aria-label="Đóng"><Icon name="x" className="lu-sm" /></button></div>
        <div className="sb">
          <div className="fl">Phạm vi dòng</div>
          {radios.map(([k, l, n]) => (
            <button key={k} className={scope === k ? 'rad on' : 'rad'} onClick={() => pickScope(k)}>
              <span className="dot" />{l}<span className="n">{vi(n)} dòng</span>
            </button>
          ))}
          {scope === 'custom' && (
            <button className="rad on"><span className="dot" />Tùy chỉnh bên dưới<span className="n">{vi(out.length)} dòng</span></button>
          )}

          <div className="fl">Khoảng ngày</div>
          <div className="dates">
            <label>Từ ngày<input type="date" value={isoAt(from, range.from)} min={isoAt(from, 0)} max={isoAt(from, range.to)} onChange={(e) => date('from', e.target.value)} /></label>
            <label>Đến ngày<input type="date" value={isoAt(from, range.to)} min={isoAt(from, range.from)} max={isoAt(from, days - 1)} onChange={(e) => date('to', e.target.value)} /></label>
          </div>

          <div className="fl">{labelOf(PRIMARY)} <span style={{ color: 'var(--label3)', fontWeight: 400 }}>{prim.length ? `(${prim.length})` : '(tất cả)'}</span></div>
          <div className="cols">
            {primVals.map((k) => (
              <button className="cbx" key={k} onClick={() => { setPrim((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); custom(); }}>
                <span className={prim.includes(k) ? 'box on' : 'box'}><Icon name="check" /></span><DimName dim={PRIMARY} value={k} />
              </button>
            ))}
          </div>

          <div className="fl">Cột xuất
            <button className="chip" style={{ marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}
                    onClick={() => setCols(cols.length === COLUMNS.length ? [] : COLUMNS.map((c) => c.name))}>
              {cols.length === COLUMNS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="cols">
            {COLUMNS.map((c) => (
              <button className="cbx" key={c.name} onClick={() => setCols((p) => (p.includes(c.name) ? p.filter((x) => x !== c.name) : [...p, c.name]))}>
                <span className={cols.includes(c.name) ? 'box on' : 'box'}><Icon name="check" /></span><span className="mono">{c.name}</span>
              </button>
            ))}
          </div>

          <div className="fl">Định dạng</div>
          <div className="seg sm" style={{ flexWrap: 'wrap' }}>
            {([[',', 'CSV (dấu phẩy)'], [';', 'CSV cho Excel VN (dấu ;)']] as [Sep, string][]).map(([v, l]) => (
              <button key={v} className={sep === v ? 'on' : undefined} onClick={() => setSep(v)}>{l}</button>
            ))}
          </div>
          <div className="cs" style={{ marginTop: 8 }}>Excel bản Việt thường tách cột theo dấu chấm phẩy. Cả hai lựa chọn đều là UTF-8 có BOM nên không lỗi font tiếng Việt.</div>
        </div>
        <div className="sf">
          <div className="cs">
            {ok
              ? <>Sẽ xuất <b>{vi(out.length)} dòng</b> × <b>{chosen.length} cột</b> · {ddmm(isoAt(from, range.from))} → {ddmm(isoAt(from, range.to))}</>
              : <span style={{ color: 'var(--red)' }}>{out.length ? 'Chưa chọn cột nào' : 'Không có dòng nào khớp'}</span>}
          </div>
          <button className="dbtn ghost" style={{ flex: '0 0 auto' }} onClick={onClose}>Huỷ</button>
          <button className="dbtn pri" onClick={download} disabled={!ok} style={{ opacity: ok ? 1 : 0.4, pointerEvents: ok ? 'auto' : 'none' }}>
            <Icon name="download" />Tải xuống
          </button>
        </div>
      </div>
    </div>
  );
}
