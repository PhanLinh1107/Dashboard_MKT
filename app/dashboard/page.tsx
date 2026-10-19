'use client';
/* Trang dashboard: CHỈ giữ state và bố cục. Toán ở lib/aggregate.ts, hình vẽ ở components/.
   Dữ liệu tải MỘT lần từ /api/data; mọi thao tác lọc chạy trên mảng đã có trong bộ nhớ. */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FilterDrawer } from '@/components/FilterDrawer';
import { ExportModal } from '@/components/ExportModal';
import { GreetBar, type Chip } from '@/components/GreetBar';
import { KpiBand } from '@/components/KpiBand';
import { Shell } from '@/components/Shell';
import { Sidebar, navItems } from '@/components/Sidebar';
import { Tip } from '@/components/Tip';
import { TopBar } from '@/components/TopBar';
import { DimPage } from '@/components/pages/DimPage';
import { OverviewPage } from '@/components/pages/OverviewPage';
import { SourcePage } from '@/components/pages/SourcePage';
import { ALERT_DIM, FILTER_DIM, PRIMARY, SECONDARY, labelOf, lower } from '@/lib/config';
import { alertTotal, alerts as alertsOf, applyFilters, defaultFilters, filterCount, prevRows, type Alert } from '@/lib/aggregate';
import { clockOf, ddmm, isoAt, vi } from '@/lib/format';
import { SIDE_RAIL, SIDE_WIDE, layout } from '@/lib/tokens';
import type { DataErr, DataOk, Filters, Grain, Meta, PageId, Row } from '@/lib/types';

type Load = 'loading' | 'error' | 'ready';

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [load, setLoad] = useState<Load>('loading');
  const [err, setErr] = useState<DataErr | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(0));
  const [page, setPage] = useState<PageId>('home');
  const [grain, setGrain] = useState<Grain>('week');
  const [rail, setRail] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [drawer, setDrawer] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pop, setPop] = useState<'notif' | 'acct' | null>(null);

  const fetchData = useCallback(async (first: boolean) => {
    if (first) setLoad('loading');
    else setSyncing(true);
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const json = (await res.json()) as DataOk | DataErr;
      if ('error' in json) throw json;
      setRows(json.rows);
      setMeta(json.meta);
      // khoảng ngày mặc định tính từ NGÀY CUỐI TRONG DỮ LIỆU, không phải từ hôm nay
      if (first) setFilters(defaultFilters(json.meta.days));
      setErr(null);
      setLoad('ready');
    } catch (e) {
      setErr(e && typeof e === 'object' && 'error' in e ? (e as DataErr) : { error: e instanceof Error ? e.message : 'Không gọi được /api/data' });
      if (first) setLoad('error');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { void fetchData(true); }, [fetchData]);

  useEffect(() => {
    if (document.documentElement.dataset.theme === 'dark') setTheme('dark');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(false); setExporting(false); setPop(null); } };
    const onClick = (e: MouseEvent) => { if (!(e.target as Element).closest?.('.wrap')) setPop(null); };
    addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  function toggleTheme() {
    const t = theme === 'light' ? 'dark' : 'light';
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch { /* chế độ riêng tư: bỏ qua */ }
  }

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const prev = useMemo(() => prevRows(rows, filters), [rows, filters]);
  const al = useMemo(() => alertsOf(filtered, rows), [filtered, rows]);
  const L = useMemo(() => layout(rail ? SIDE_RAIL : SIDE_WIDE), [rail]);
  const days = meta?.days ?? 0;
  const from = meta?.from ?? '2000-01-01';

  const items = navItems({
    alerts: alertTotal(al),
    primary: new Set(rows.map((r) => r.d[PRIMARY])).size,
    secondary: new Set(rows.map((r) => r.d[SECONDARY])).size,
  });
  const current = items.find((p) => p.id === page) ?? items[0];

  const go = (p: PageId) => { setPage(p); setPop(null); };
  const toggleIn = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  function onToggle(dim: string, key: string) {
    if (dim === PRIMARY) setFilters((f) => ({ ...f, primary: toggleIn(f.primary, key) }));
    else if (dim === SECONDARY) setFilters((f) => ({ ...f, secondary: toggleIn(f.secondary, key) }));
  }
  function onAlert(a: Alert) {
    setPop(null);
    if (!a.keys.length) return;
    // bấm cảnh báo = lọc tới đúng các nhóm đó + nhảy sang trang của dimension đó
    if (ALERT_DIM === PRIMARY) { setFilters((f) => ({ ...f, primary: a.keys, secondary: [] })); setPage('primary'); }
    else { setFilters((f) => ({ ...f, secondary: a.keys, primary: [] })); setPage('secondary'); }
  }
  const reset = () => { setFilters(defaultFilters(days)); setPop(null); };

  const chips: Chip[] = [
    ...filters.primary.map((k) => ({ key: 'p' + k, label: k, remove: () => onToggle(PRIMARY, k) })),
    ...filters.secondary.map((k) => ({ key: 's' + k, label: k, remove: () => onToggle(SECONDARY, k) })),
    ...(FILTER_DIM && filters.filter !== 'all' ? [{ key: 'f', label: filters.filter, remove: () => setFilters((f) => ({ ...f, filter: 'all' })) }] : []),
    ...(filters.losing ? [{ key: 'l', label: 'Đang lỗ', remove: () => setFilters((f) => ({ ...f, losing: false })) }] : []),
  ];
  const n = filters.to - filters.from + 1;
  const period = filters.preset === 'custom' ? `${n} ngày (tùy chọn)` : filters.preset === 'all' ? `Toàn bộ ${n} ngày` : `${n} ngày`;
  const context = meta
    ? `${period} (${ddmm(isoAt(from, filters.from))} → ${ddmm(isoAt(from, filters.to))}) · ${vi(new Set(filtered.map((r) => r.d[SECONDARY])).size)} ${lower(labelOf(SECONDARY))} trên ${vi(new Set(filtered.map((r) => r.d[PRIMARY])).size)} ${lower(labelOf(PRIMARY))}`
    : 'Đang tải dữ liệu';

  const isSource = page === 'source';
  let body: ReactNode;
  if (load === 'loading') {
    body = <div id="row2"><div className="card empty" style={{ flex: 1 }}><span className="spin" style={{ marginBottom: 10 }} />Đang tải dữ liệu…</div></div>;
  } else if (load === 'error' || !meta) {
    body = (
      <div id="row2">
        <div className="card empty" style={{ flex: 1 }}>
          <div className="err" style={{ maxWidth: 560 }}>
            <b>Không tải được dữ liệu</b>
            {err?.error}
            {err?.hint && <div style={{ marginTop: 6 }}>{err.hint}</div>}
            <button onClick={() => void fetchData(true)}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  } else if (isSource) {
    body = <SourcePage rows={rows} meta={meta} L={L} />;
  } else if (!filtered.length) {
    body = (
      <>
        <KpiBand rows={[]} prev={prev} kpiW={L.kpiW} from={from} />
        <div id="row2"><div className="card empty" style={{ flex: 1 }}><b>Không có dòng nào khớp bộ lọc</b>Mở rộng khoảng thời gian hoặc bấm “Xoá tất cả”.</div></div>
        <div id="row3" />
      </>
    );
  } else {
    const common = { rows: filtered, L, param: filters.param, grain, onGrain: setGrain, from, onToggle };
    body = (
      <>
        <KpiBand rows={filtered} prev={prev} kpiW={L.kpiW} from={from} />
        {page === 'home' && <OverviewPage {...common} />}
        {page === 'primary' && <DimPage {...common} dim={PRIMARY} />}
        {page === 'secondary' && <DimPage {...common} dim={SECONDARY} />}
      </>
    );
  }

  const stageClass = [rail && 'rail', drawer && 'drawer', exporting && 'modal'].filter(Boolean).join(' ');

  return (
    <>
      <Shell className={stageClass}>
        <Sidebar items={items} page={page} onPage={go} onRail={() => setRail((v) => !v)}
                 shown={filtered.length} total={rows.length}
                 note={meta ? `${vi(items[1].badge ?? 0)} ${lower(labelOf(PRIMARY))} · ${vi(days)} ngày dữ liệu` : '—'}
                 theme={theme} onTheme={toggleTheme} onReset={reset}
                 acctOpen={pop === 'acct'} onAcct={() => setPop((p) => (p === 'acct' ? null : 'acct'))} />
        <main id="main">
          <TopBar icon={current.icon} label={current.label}
                  synced={meta ? clockOf(meta.fetchedAt) : '—'} syncing={syncing} onRefresh={() => void fetchData(false)}
                  alerts={al} notifOpen={pop === 'notif'} onNotif={() => setPop((p) => (p === 'notif' ? null : 'notif'))} onAlert={onAlert}
                  onExport={() => { setDrawer(false); setPop(null); setExporting(true); }}
                  onDrawer={() => { setExporting(false); setPop(null); setDrawer(true); }}
                  filterCount={filterCount(filters)} />
          <div id="body" className={isSource ? 'nokpi' : undefined}>
            <GreetBar context={context} chips={chips} onClear={reset} />
            {body}
          </div>
        </main>
        <div id="scrim" onClick={() => setDrawer(false)} />
        <FilterDrawer open={drawer} filters={filters} rows={rows} days={Math.max(1, days)} from={from}
                      onApply={(f) => { setFilters(f); setDrawer(false); }} onClose={() => setDrawer(false)} />
        <ExportModal open={exporting} filtered={filtered} rows={rows} filters={filters} days={Math.max(1, days)} from={from}
                     onClose={() => setExporting(false)} />
      </Shell>
      <Tip />
    </>
  );
}
