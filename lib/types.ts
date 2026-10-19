/* Một dòng dữ liệu sau khi ép kiểu ở server.
   t = số ngày tính từ ngày nhỏ nhất (0..days-1): nguồn sự thật của khoảng thời gian.
   d = cột chữ (dimension), m = cột số (metric, attribute). */
export type Row = {
  t: number;
  date: string;
  d: Record<string, string>;
  m: Record<string, number>;
};

export type Meta = {
  source: 'sheets' | 'csv';
  sheet: string;
  title: string;
  count: number;
  skipped: number;
  badDates: number;
  badNumbers: number;
  from: string;
  to: string;
  days: number;
  fetchedAt: string;
  header: string[];
  env: Record<string, boolean>;
};

export type DataOk = { rows: Row[]; meta: Meta };
export type DataErr = { error: string; hint?: string };

export type Agg = Record<string, number>;
export type Group = { k: string; n: number; v: Agg };
export type Period = { k: number | string; label: string; v: Agg };

export type Grain = 'day' | 'week' | 'month';
export type PageId = 'home' | 'primary' | 'secondary' | 'source';
export type Preset = 7 | 30 | 90 | 'all' | 'custom';

export type Filters = {
  param: string;
  preset: Preset;
  from: number;
  to: number;
  primary: string[];
  secondary: string[];
  filter: string;
  losing: boolean;
};
