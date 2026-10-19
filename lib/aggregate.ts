/* Toàn bộ toán tổng hợp. Không có JSX, không đụng DOM ⇒ chạy được cả ở server (API) lẫn trình duyệt.
   Ba luật không thương lượng:
   1 · Tỷ lệ = SUM(tử) / SUM(mẫu), tính lại từ tổng. Không bao giờ lấy trung bình tỷ lệ từng dòng.
   2 · Cột ATTRIBUTE (ngân sách, công suất…) lặp ở mọi dòng của một thực thể ⇒ MAX theo thực thể rồi mới cộng.
   3 · Cột ảnh chụp (agg 'last' / 'avg', ví dụ headcount) không cộng qua ngày. */
import {
  ALERT_DIM, CFG, COLUMNS, FILTER_DIM, LOSS, METRICS, PRIMARY, SECONDARY, labelOf, lower, meets, metric,
  type Threshold,
} from './config';
import { fmt, isoAt, ddmm } from './format';
import type { Agg, Filters, Grain, Group, Meta, Period, Preset, Row } from './types';

const SUM_COLS = COLUMNS.filter((c) => c.role === 'METRIC' && (c.agg ?? 'sum') === 'sum').map((c) => c.name);
const SNAP_COLS = COLUMNS.filter((c) => c.role === 'METRIC' && (c.agg === 'last' || c.agg === 'avg'));
const ATTR_COLS = COLUMNS.filter((c) => c.role === 'ATTRIBUTE');

export function colTotals(rows: Row[]): Agg {
  const s: Agg = {};
  for (const c of SUM_COLS) s[c] = 0;
  for (const r of rows) for (const c of SUM_COLS) s[c] += r.m[c] ?? 0;

  for (const c of SNAP_COLS) {
    const byT = new Map<number, number>();
    for (const r of rows) byT.set(r.t, (byT.get(r.t) ?? 0) + (r.m[c.name] ?? 0));
    if (!byT.size) { s[c.name] = 0; continue; }
    if (c.agg === 'last') s[c.name] = byT.get(Math.max(...byT.keys())) ?? 0;
    else s[c.name] = [...byT.values()].reduce((a, b) => a + b, 0) / byT.size;
  }

  for (const c of ATTR_COLS) {
    const ent = c.entity ?? SECONDARY;
    const per = new Map<string, number>();
    for (const r of rows) {
      const k = r.d[ent] ?? '';
      per.set(k, Math.max(per.get(k) ?? -Infinity, r.m[c.name] ?? 0));
    }
    s[c.name] = [...per.values()].reduce((a, b) => a + b, 0);
  }
  return s;
}

const term = (s: Agg, t: string): number => (t.startsWith('-') ? -(s[t.slice(1)] ?? 0) : (s[t] ?? 0));

export function withMetrics(s: Agg): Agg {
  const out: Agg = { ...s };
  for (const m of CFG.metrics) {
    if (m.col) { out[m.key] = s[m.col] ?? 0; continue; }
    const n = (m.num ?? []).reduce((a, t) => a + term(s, t), 0);
    const scale = m.scale ?? 1;
    if (!m.den || !m.den.length) { out[m.key] = n * scale; continue; }
    const d = m.den.reduce((a, t) => a + term(s, t), 0);
    out[m.key] = d ? (n / d) * scale : 0;
  }
  return out;
}

export const agg = (rows: Row[]): Agg => withMetrics(colTotals(rows));

export function group(rows: Row[], dim: string): Group[] {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.d[dim] ?? '';
    let a = m.get(k);
    if (!a) m.set(k, (a = []));
    a.push(r);
  }
  return [...m].map(([k, rs]) => ({ k, n: rs.length, v: agg(rs) }));
}

export const sortBy = (gs: Group[], key: string): Group[] => gs.sort((a, b) => (b.v[key] ?? 0) - (a.v[key] ?? 0));

export const GRAIN_VI: Record<Grain, string> = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };

/* Gom theo kỳ. Tuần tính từ ngày đầu của dữ liệu (k = floor(t/7)), nhãn là ngày đầu tuần. */
export function byGrain(rows: Row[], grain: Grain, from: string): Period[] {
  const keyOf = (r: Row): number | string =>
    grain === 'day' ? r.t : grain === 'week' ? Math.floor(r.t / 7) : r.date.slice(0, 7);
  const m = new Map<number | string, Row[]>();
  for (const r of rows) {
    const k = keyOf(r);
    let a = m.get(k);
    if (!a) m.set(k, (a = []));
    a.push(r);
  }
  const years = new Set(rows.map((r) => r.date.slice(0, 4))).size;
  const label = (k: number | string): string => {
    if (grain === 'day') return ddmm(isoAt(from, k as number));
    if (grain === 'week') return ddmm(isoAt(from, (k as number) * 7));
    const s = String(k);
    return 'T' + Number(s.slice(5, 7)) + (years > 1 ? '/' + s.slice(2, 4) : '');
  };
  return [...m]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, rs]) => ({ k, label: label(k), v: agg(rs) }));
}

/* ── Bộ lọc ─────────────────────────────────────────────────────────────── */
export function presetOf(n: number, days: number): Preset {
  if (n >= days) return 'all';
  return n === 7 || n === 30 || n === 90 ? n : 'custom';
}

export function defaultFilters(days: number): Filters {
  const n = Math.min(CFG.defaultDays || 30, Math.max(1, days));
  return {
    param: CFG.defaultParam, preset: presetOf(n, days),
    from: Math.max(0, days - n), to: Math.max(0, days - 1),
    primary: [], secondary: [], filter: 'all', losing: false,
  };
}

function dimsMatch(r: Row, f: Filters): boolean {
  if (f.primary.length && !f.primary.includes(r.d[PRIMARY])) return false;
  if (f.secondary.length && !f.secondary.includes(r.d[SECONDARY])) return false;
  if (FILTER_DIM && f.filter !== 'all' && r.d[FILTER_DIM] !== f.filter) return false;
  return true;
}

export function applyFilters(rows: Row[], f: Filters): Row[] {
  let losing: Set<string> | null = null;
  const loss = LOSS;
  if (f.losing && loss) {
    const inRange = rows.filter((r) => r.t >= f.from && r.t <= f.to);
    losing = new Set(group(inRange, ALERT_DIM).filter((g) => meets(g.v[loss.metric], loss)).map((g) => g.k));
  }
  return rows.filter((r) =>
    r.t >= f.from && r.t <= f.to && dimsMatch(r, f) && (!losing || losing.has(r.d[ALERT_DIM])));
}

/* Kỳ trước = cùng số ngày, ngay trước from, cùng bộ lọc dimension. */
export function prevRows(rows: Row[], f: Filters): Row[] {
  const len = f.to - f.from + 1;
  return rows.filter((r) => r.t >= f.from - len && r.t <= f.from - 1 && dimsMatch(r, f));
}

export function filterCount(f: Filters): number {
  return f.primary.length + f.secondary.length + (f.filter !== 'all' ? 1 : 0) + (f.losing ? 1 : 0);
}

/* ── Cảnh báo ngưỡng ────────────────────────────────────────────────────── */
export type Alert = { th: Threshold; label: string; tone: 'bad' | 'warn' | 'ink3'; keys: string[] };

export function alertLabel(t: Threshold): string {
  if (t.alert) return t.alert;
  const m = metric(t.metric);
  if (t.kind === 'loss') return `${labelOf(ALERT_DIM)} đang lỗ`;
  if (t.kind === 'resource') return `${m.label} ${t.op} ${fmt(m.format, t.value)}`;
  return `${m.label} vượt ${fmt(m.format, t.value)}`;
}

export function alerts(filtered: Row[], all: Row[]): Alert[] {
  const out: Alert[] = [];
  const present = group(filtered, ALERT_DIM);
  for (const t of CFG.thresholds) {
    if (t.kind === 'target') continue;
    const life = METRICS[t.metric]?.window === 'all';
    const base = life ? new Map(group(all, ALERT_DIM).map((g) => [g.k, g.v])) : null;
    const keys = present.filter((g) => meets((base?.get(g.k) ?? g.v)[t.metric], t)).map((g) => g.k);
    out.push({ th: t, label: alertLabel(t), tone: t.kind === 'loss' ? 'bad' : t.kind === 'unit_cost' ? 'warn' : 'ink3', keys });
  }
  return out;
}

export const alertTotal = (as: Alert[]): number => as.reduce((s, a) => s + a.keys.length, 0);

/* ── Tóm tắt cho script kiểm tra (GET /api/data?summary=1) ───────────────── */
export function summary(rows: Row[], meta: Meta) {
  const f = defaultFilters(meta.days);
  const cur = agg(rows.filter((r) => r.t >= f.from && r.t <= f.to));
  const all = agg(rows);
  const pick = (a: Agg) => Object.fromEntries(CFG.kpis.map((k) => [k, a[k] ?? 0]));
  return {
    count: rows.length,
    from: meta.from,
    to: meta.to,
    days: meta.days,
    defaultPeriod: { from: isoAt(meta.from, f.from), to: isoAt(meta.from, f.to), rows: rows.filter((r) => r.t >= f.from && r.t <= f.to).length },
    groups: { [PRIMARY]: new Set(rows.map((r) => r.d[PRIMARY])).size, [SECONDARY]: new Set(rows.map((r) => r.d[SECONDARY])).size },
    kpisDefault: pick(cur),
    kpisAll: pick(all),
  };
}

export const dimLabelLower = (dim: string): string => lower(labelOf(dim));
