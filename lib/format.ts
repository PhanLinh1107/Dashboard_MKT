import type { Format } from './config';

const NF = new Map<number, Intl.NumberFormat>();
export function vi(n: number, d = 0): string {
  if (!Number.isFinite(n)) return '—';
  let f = NF.get(d);
  if (!f) {
    f = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
    NF.set(d, f);
  }
  return f.format(n);
}

export function money(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return vi(n / 1e9, 2) + ' tỷ';
  if (a >= 1e6) return vi(n / 1e6, 1) + ' tr';
  if (a >= 1e3) return vi(n / 1e3, 0) + 'k';
  return vi(n);
}
export const pct = (n: number, d = 1): string => (Number.isFinite(n) ? vi(n * 100, d) + '%' : '—');
export const xx = (n: number): string => (Number.isFinite(n) ? vi(n, 2) + 'x' : '—');

export function fmt(format: Format, n: number): string {
  if (format === 'money') return money(n);
  if (format === 'pct') return pct(n);
  if (format === 'x') return xx(n);
  if (format === 'dec') return vi(n, 2);
  return vi(Math.round(n));
}

/* ── Ngày ─────────────────────────────────────────────────────────────────
   Ngày luôn là chuỗi ISO 'yyyy-mm-dd' và tính bằng UTC. new Date('05/02/2026') đọc thành 2 tháng 5. */
export const DAY = 86_400_000;
export function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
export const utcToIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const isoAt = (from: string, t: number): string => utcToIso(isoToUtc(from) + t * DAY);
export const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const ddmmyyyy = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/* ── Giờ Việt Nam (UTC+7) ─────────────────────────────────────────────────
   Không dùng getHours() của máy: người xem ở múi giờ khác sẽ thấy lời chào sai. */
const WDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const p2 = (n: number): string => String(n).padStart(2, '0');
export const nowVN = (): Date => new Date(Date.now() + 7 * 3600e3);
export function greetVN(d: Date = nowVN()): string {
  const h = d.getUTCHours();
  if (h >= 5 && h < 11) return 'Chào buổi sáng';
  if (h >= 11 && h < 13) return 'Chào buổi trưa';
  if (h >= 13 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}
export const todayVN = (d: Date = nowVN()): string =>
  `${WDAY[d.getUTCDay()]}, ${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
export const clockVN = (d: Date = nowVN()): string => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
export const clockOf = (iso: string): string => clockVN(new Date(new Date(iso).getTime() + 7 * 3600e3));
