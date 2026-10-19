/* Cấu hình dashboard — nạp từ lib/dashboard.config.json.
   File JSON đó là bản chép của docs/1-spec/dashboard.json (skill dashboard-design viết, bạn duyệt).
   Muốn đổi KPI, ngưỡng, nhãn: sửa docs/1-spec/dashboard.json rồi chạy lại scaffold. Đừng sửa số ở đây. */
import raw from './dashboard.config.json';
import type { IconName } from './icons';

export type Format = 'money' | 'int' | 'dec' | 'pct' | 'x';
export type Role = 'DATE' | 'PRIMARY_DIM' | 'SECONDARY_DIM' | 'METRIC' | 'ATTRIBUTE' | 'IGNORE';
export type Op = '<' | '<=' | '>' | '>=';

export type Column = {
  name: string;
  label: string;
  type: 'date' | 'text' | 'number';
  role: Role;
  agg?: 'sum' | 'last' | 'avg' | 'max';
  entity?: string;
  format?: Format;
  icons?: Record<string, IconName>;
};

export type Metric = {
  key: string;
  label: string;
  format: Format;
  better: 'higher' | 'lower';
  col?: string;
  num?: string[];
  den?: string[];
  scale?: number;
  icon?: IconName;
  window?: 'filtered' | 'all';
};

export type Threshold = {
  key: string;
  label: string;
  kind: 'loss' | 'target' | 'unit_cost' | 'resource';
  metric: string;
  op: Op;
  value: number;
  alert?: string;
};

export type DashboardConfig = {
  app: {
    name: string;
    tagline: string;
    domain: string;
    user?: { name: string; first: string; role?: string; email?: string };
  };
  source: { type: 'sheets' | 'csv'; sheet?: string; title?: string; csv?: string };
  columns: Column[];
  metrics: Metric[];
  kpis: string[];
  params: string[];
  defaultParam: string;
  donutMetric: string;
  matrixMetrics: string[];
  tableMetrics: string[];
  pages: {
    primary: string;
    secondary: string;
    filter?: string | null;
    primaryIcon?: IconName;
    secondaryIcon?: IconName;
  };
  thresholds: Threshold[];
  alerts?: { dim?: string };
  defaultDays: number;
  export?: { separator?: ',' | ';'; filename?: string };
};

export const CFG = raw as unknown as DashboardConfig;

export const COLUMNS = CFG.columns.filter((c) => c.role !== 'IGNORE');
export const DATE_COL = (COLUMNS.find((c) => c.role === 'DATE') ?? COLUMNS[0]).name;
export const PRIMARY = CFG.pages.primary;
export const SECONDARY = CFG.pages.secondary;
export const FILTER_DIM = CFG.pages.filter || null;
export const ALERT_DIM = CFG.alerts?.dim || SECONDARY;

export const colOf = (name: string): Column | undefined => COLUMNS.find((c) => c.name === name);
export const labelOf = (name: string): string => colOf(name)?.label ?? name;
export const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
export const iconOf = (dim: string, value: string): IconName | undefined => colOf(dim)?.icons?.[value];

export const METRICS: Record<string, Metric> = Object.fromEntries(CFG.metrics.map((m) => [m.key, m]));
export const metric = (key: string): Metric =>
  METRICS[key] ?? { key, label: key, format: 'dec', better: 'higher', col: key };

/* Chỉ số cộng được (tổng của một cột METRIC) mới được vẽ thành "tỷ trọng". Tỷ trọng ROAS là con số vô nghĩa. */
export function isAdditive(key: string): boolean {
  const m = METRICS[key];
  if (!m?.col) return false;
  const c = colOf(m.col);
  return c?.role === 'METRIC' && (c.agg ?? 'sum') === 'sum';
}

export const LOSS = CFG.thresholds.find((t) => t.kind === 'loss') ?? null;
export const thresholdsOf = (key: string): Threshold[] => CFG.thresholds.filter((t) => t.metric === key);

export function meets(v: number | undefined, t: Threshold): boolean {
  if (v === undefined || !Number.isFinite(v)) return false;
  if (t.op === '<') return v < t.value;
  if (t.op === '<=') return v <= t.value;
  if (t.op === '>') return v > t.value;
  return v >= t.value;
}
