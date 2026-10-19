/* Nơi DUY NHẤT chạm credential. Chỉ chạy ở server (import 'server-only' làm build fail ngay nếu ai lỡ
   import file này vào component 'use client').
   Đọc Google Sheets qua Service Account bằng REST API v4: ký JWT bằng node:crypto rồi gọi fetch.
   Không cần package googleapis (nặng ~100 MB) — cùng một API, ít thứ phải cài hơn. */
import 'server-only';
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CFG, COLUMNS, DATE_COL } from './config';
import { DAY, isoToUtc, utcToIso } from './format';
import type { Meta, Row } from './types';

export const ENV_NAMES = ['GOOGLE_SHEETS_SPREADSHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'] as const;

export class SourceError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

/* ── Google Sheets ──────────────────────────────────────────────────────── */
let cached: { token: string; exp: number } | null = null;

async function accessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  let sig: string;
  try {
    sig = createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url');
  } catch {
    throw new SourceError(
      'GOOGLE_PRIVATE_KEY không đọc được (DECODER routines::unsupported).',
      'Chép lại nguyên giá trị "private_key" trong file JSON của service account, giữ cặp ngoặc kép và các ký tự \\n.',
    );
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
    cache: 'no-store',
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !j.access_token) {
    throw new SourceError(
      `Google từ chối service account: ${j.error_description ?? j.error ?? 'HTTP ' + res.status}`,
      'GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_PRIVATE_KEY phải lấy từ CÙNG một file JSON; đồng hồ máy phải đúng giờ.',
    );
  }
  cached = { token: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return cached.token;
}

function sheetHint(status: number, msg: string): string {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? 'email service account';
  if (status === 403) return `Mở Google Sheet → Share → thêm ${email} quyền Viewer.`;
  if (status === 404) return 'GOOGLE_SHEETS_SPREADSHEET_ID sai: lấy đoạn giữa /d/ và /edit trong link Sheet.';
  if (/parse range/i.test(msg)) return `Không thấy tab "${CFG.source.sheet}". Sửa source.sheet trong docs/1-spec/dashboard.json cho đúng tên tab rồi chạy lại scaffold.`;
  return 'Kiểm tra kết nối mạng và ba biến trong app/.env.local.';
}

async function readSheet(): Promise<unknown[][]> {
  const missing = ENV_NAMES.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    throw new SourceError(`Thiếu biến môi trường: ${missing.join(', ')}`, 'Mở app/.env.local, điền đủ ba biến, rồi tắt và chạy lại npm run dev.');
  }
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const token = await accessToken(email, key);
  const tab = CFG.source.sheet ? `'${CFG.source.sheet.replace(/'/g, "''")}'` : 'A:ZZ';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(tab)}` +
    // Số trả về dạng số (không bị định dạng 1.234,5); ô ngày trả về chuỗi theo định dạng của ô.
    '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING';
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = j.error?.message ?? `HTTP ${res.status}`;
    throw new SourceError(`Google Sheets: ${msg}`, sheetHint(res.status, msg));
  }
  const j = (await res.json()) as { values?: unknown[][] };
  return j.values ?? [];
}

/* ── CSV (chỉ dùng khi chạy trên máy) ───────────────────────────────────── */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const first = s.slice(0, s.search(/\r?\n/) >>> 0);
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const out: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); out.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out;
}

async function readCsv(): Promise<unknown[][]> {
  // scaffold chép file CSV vào app/data/. Đường dẫn khoá trong thư mục data để Next không phải gói cả dự án.
  const name = path.basename(CFG.source.csv ?? '');
  try {
    return parseCsv(await readFile(path.join(process.cwd(), 'data', name), 'utf8'));
  } catch {
    throw new SourceError(`Không đọc được file app/data/${name}`, 'Chạy lại scaffold để chép file CSV vào app/data/.');
  }
}

/* ── Ép kiểu: ở đây, một lần, không đẩy xuống component ─────────────────── */
/* Ngày dạng a/b/yyyy: thứ tự ngày-tháng quyết định theo CẢ CỘT, không theo từng ô.
   Có ô a > 12 ⇒ dd/mm; có ô b > 12 ⇒ mm/dd (Sheet đặt locale Mỹ); không phân biệt được ⇒ dd/mm (Việt Nam). */
export function dateOrder(values: unknown[]): 'dmy' | 'mdy' {
  let dmy = false, mdy = false;
  for (const v of values) {
    const m = String(v ?? '').trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{4}/);
    if (!m) continue;
    if (+m[1] > 12) dmy = true;
    if (+m[2] > 12) mdy = true;
  }
  return mdy && !dmy ? 'mdy' : 'dmy';
}

export function toIsoDate(v: unknown, order: 'dmy' | 'mdy' = 'dmy'): string | null {
  if (typeof v === 'number' && v > 20000 && v < 80000) return utcToIso(Date.UTC(1899, 11, 30) + Math.round(v) * DAY);
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) {
    y = +m[3];
    [d, mo] = order === 'mdy' ? [+m[2], +m[1]] : [+m[1], +m[2]];
  } else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = utcToIso(Date.UTC(y, mo - 1, d));
  return iso.slice(5, 7) === String(mo).padStart(2, '0') ? iso : null;
}

export function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v ?? '').trim().replace(/[\s₫đ%]/g, '');
  if (s === '') return 0;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toRows(values: unknown[][]): { rows: Row[]; skipped: number; badDates: number; badNumbers: number; header: string[] } {
  const header = (values[0] ?? []).map((v) => String(v ?? '').trim());
  const idx = new Map(header.map((h, i) => [h.toLowerCase(), i]));
  const missing = COLUMNS.filter((c) => !idx.has(c.name.toLowerCase())).map((c) => c.name);
  if (!header.length) throw new SourceError('Sheet rỗng.', `Tab "${CFG.source.sheet}" chưa có dữ liệu, hoặc sai tên tab.`);
  if (missing.length) {
    throw new SourceError(`Thiếu cột: ${missing.join(', ')}`, `Hàng đầu của tab phải có đúng tên cột như dashboard.json. Đang có: ${header.join(', ')}`);
  }
  const at = (raw: unknown[], name: string): unknown => raw[idx.get(name.toLowerCase())!];
  const order = dateOrder(values.slice(1).map((r) => at(r, DATE_COL)));
  const rows: Row[] = [];
  let skipped = 0, badDates = 0, badNumbers = 0;
  for (const raw of values.slice(1)) {
    if (!raw.length || raw.every((v) => v === '' || v == null)) { skipped++; continue; }
    const date = toIsoDate(at(raw, DATE_COL), order);
    if (!date) { badDates++; continue; }
    const d: Record<string, string> = {}, m: Record<string, number> = {};
    for (const c of COLUMNS) {
      if (c.type === 'text') d[c.name] = String(at(raw, c.name) ?? '').trim();
      else if (c.type === 'number') {
        const n = toNum(at(raw, c.name));
        if (n === null) badNumbers++;
        m[c.name] = n ?? 0;
      }
    }
    rows.push({ t: 0, date, d, m });
  }
  if (rows.length) {
    let min = rows[0].date;
    for (const r of rows) if (r.date < min) min = r.date;
    const base = isoToUtc(min);
    for (const r of rows) r.t = Math.round((isoToUtc(r.date) - base) / DAY);
    rows.sort((a, b) => a.t - b.t);
  }
  return { rows, skipped, badDates, badNumbers, header };
}

export async function loadData(): Promise<{ rows: Row[]; meta: Meta }> {
  const values = CFG.source.type === 'csv' ? await readCsv() : await readSheet();
  const { rows, skipped, badDates, badNumbers, header } = toRows(values);
  if (!rows.length) throw new SourceError('Đọc được tab nhưng không có dòng dữ liệu nào.', 'Kiểm tra tab có dữ liệu bên dưới hàng tiêu đề, và cột ngày đúng định dạng yyyy-mm-dd.');
  const last = rows[rows.length - 1];
  return {
    rows,
    meta: {
      source: CFG.source.type,
      sheet: CFG.source.type === 'csv' ? (CFG.source.csv ?? '') : (CFG.source.sheet ?? ''),
      title: CFG.source.title ?? '',
      count: rows.length,
      skipped, badDates, badNumbers,
      from: rows[0].date,
      to: last.date,
      days: last.t + 1,
      fetchedAt: new Date().toISOString(),
      header,
      env: Object.fromEntries(ENV_NAMES.map((n) => [n, Boolean(process.env[n]?.trim())])),
    },
  };
}
