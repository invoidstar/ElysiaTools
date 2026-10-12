import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { journals } from './catalog';
import { mergeImportedMetrics, parseMetricFile, type ImportStats, type ImportedLayer, type ImportedMetric } from './metricCsv.mjs';
import { SHOWJCR_COMMIT, SHOWJCR_FILES, showJcrRawUrl } from './showJcrSources';
import type { Journal, JournalIndicator } from '../types';

const STORE = 'elysiatools-private-journal-metrics-v1';
const SYNC_META = 'elysiatools-private-showjcr-sync-v1';
const validIds = new Set(journals.map(j => j.id));
const systems = new Set(['jcr', 'jif', 'cas', 'xinrui']);
const privateIds = new Set(['user-import', 'showjcr-local']);

export type MetricRecord = JournalIndicator & { provenance?: string };
export type SyncStep = { index: number; total: number; title: string; phase: 'fetch' | 'parse' | 'complete' };
export type SyncSummary = { at: string; commit: string; reports: ImportStats[] };
type MetricsState = {
  layer: ImportedLayer;
  getMetrics: (journal: Journal, system: string) => MetricRecord[];
  getMetric: (journal: Journal, system: string) => MetricRecord | undefined;
  count: (system: string) => number;
  privateCount: number;
  importCSV: (file: File) => Promise<ImportStats>;
  syncShowJCR: (progress: (step: SyncStep) => void) => Promise<ImportStats[]>;
  lastSync: SyncSummary | null;
  clearPrivate: () => void;
};

const MetricsContext = createContext<MetricsState | null>(null);

function readLocal(): ImportedLayer {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: ImportedLayer = {};
    for (const [id, metrics] of Object.entries(parsed).slice(0, 500)) {
      if (!validIds.has(id) || !Array.isArray(metrics)) continue;
      next[id] = metrics.slice(0, 100).flatMap((m: unknown) => {
        if (!m || typeof m !== 'object') return [];
        const item = m as Record<string, unknown>;
        if (!systems.has(String(item.system)) || typeof item.value !== 'string' || item.value.length > 80 ||
          !Number.isInteger(item.year) || Number(item.year) < 2024 || Number(item.year) > 2026) return [];
        const sourceId = privateIds.has(String(item.sourceId)) ? String(item.sourceId) : 'user-import';
        return [{
          system: item.system as ImportedMetric['system'],
          value: item.value,
          year: Number(item.year),
          category: typeof item.category === 'string' ? item.category.slice(0, 140) : '',
          sourceId,
          license: 'private-only',
          provenance: sourceId === 'showjcr-local' ? 'third-party-personal' : 'user-provided'
        } satisfies ImportedMetric];
      });
    }
    return next;
  } catch { return {}; }
}
function readSync(): SyncSummary | null {
  try {
    const raw = localStorage.getItem(SYNC_META);
    if (!raw) return null;
    const v = JSON.parse(raw) as SyncSummary;
    if (!v || !Array.isArray(v.reports) || typeof v.at !== 'string' || typeof v.commit !== 'string') return null;
    return v;
  } catch { return null; }
}

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [layer, setLayer] = useState<ImportedLayer>(readLocal);
  const [lastSync, setLastSync] = useState<SyncSummary | null>(readSync);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(layer)); }
    catch { /* browser may forbid localStorage; manual CSV can be re-imported */ }
  }, [layer]);
  useEffect(() => {
    try {
      if (lastSync) localStorage.setItem(SYNC_META, JSON.stringify(lastSync));
      else localStorage.removeItem(SYNC_META);
    } catch { /* storage disabled */ }
  }, [lastSync]);

  const getMetrics = useCallback((journal: Journal, system: string): MetricRecord[] => {
    const local = (layer[journal.id] || []).filter(m => m.system === system);
    const publicValues = journal.indicators.filter(m => m.system === system);
    const used = new Set<string>();
    return [...local, ...publicValues].filter(value => {
      const key = value.system + '|' + value.year + '|' + (value.category || '');
      if (used.has(key)) return false;
      used.add(key);
      return true;
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (system === 'cas' || system === 'xinrui') {
        const level = (m: MetricRecord) => m.category?.startsWith('小类：') ? 2 :
          m.category?.startsWith('第二大类：') ? 1 : 0;
        if (level(a) !== level(b)) return level(a) - level(b);
      }
      return system === 'jcr' ? a.value.localeCompare(b.value) : 0;
    });
  }, [layer]);

  const getMetric = useCallback(
    (journal: Journal, system: string): MetricRecord | undefined => getMetrics(journal, system)[0],
    [getMetrics]
  );
  const count = useCallback((system: string) =>
    journals.filter(j => getMetric(j, system) !== undefined).length,
    [getMetric]
  );
  const privateCount = Object.values(layer).filter(metrics => metrics.length > 0).length;

  const importCSV = useCallback(async (file: File): Promise<ImportStats> => {
    if (file.size > 30 * 1024 * 1024) throw Error('CSV 文件超过 30 MB。');
    if (!/\.(csv|tsv)$/i.test(file.name)) throw Error('仅支持 CSV / TSV 文本文件。');
    const result = parseMetricFile(await file.text(), file.name, journals);
    if (!result.stats.matched) throw Error('未能匹配到有有效指标的期刊，请检查 ISSN、刊名或表头。');
    setLayer(prev => mergeImportedMetrics(prev, result.records));
    return result.stats;
  }, []);

  const syncShowJCR = useCallback(async (progress: (step: SyncStep) => void): Promise<ImportStats[]> => {
    // This is an opt-in, browser-only download. Do not mirror restricted CSVs in Pages.
    // Complete the entire batch before mutating local preferences (atomic sync).
    let imported: ImportedLayer = {};
    const reports: ImportStats[] = [];
    for (let i = 0; i < SHOWJCR_FILES.length; i++) {
      const file = SHOWJCR_FILES[i];
      progress({ index: i + 1, total: SHOWJCR_FILES.length, title: file.title, phase: 'fetch' });
      let csv: string;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 75000);
      try {
        const response = await fetch(showJcrRawUrl(file), {
          method: 'GET', signal: controller.signal, mode: 'cors',
          credentials: 'omit', cache: 'default', headers: { Accept: 'text/csv,text/plain,*/*' }
        });
        if (!response.ok) throw Error('下载失败：HTTP ' + response.status);
        csv = await response.text();
        if (csv.length < 10000 || csv.length > 25_000_000 ||
            !csv.replace(/^\uFEFF/, '').startsWith('Journal,')) {
          throw Error('来源返回的不是预期版本的 CSV，请手动下载核验。');
        }
      } catch (error) {
        if (controller.signal.aborted) throw Error(file.title + '下载超时，请检查网络或改用本地 CSV 导入。');
        throw Error(file.title + '无法下载。' +
          (error instanceof Error ? error.message : '') + '；如无法访问 GitHub Raw，请手动下载三份 CSV。');
      } finally {
        window.clearTimeout(timeout);
      }
      progress({ index: i + 1, total: SHOWJCR_FILES.length, title: file.title, phase: 'parse' });
      const result = parseMetricFile(csv, file.filename, journals);
      if (result.stats.matched < 100) throw Error(file.title + '仅匹配到 ' + result.stats.matched +
        ' 行，未达到预期覆盖量。已停止同步以避免写入错误数据。');
      const tagged: ImportedLayer = {};
      for (const [id, entries] of Object.entries(result.records)) {
        tagged[id] = entries.map(m => ({
          ...m, sourceId: 'showjcr-local', license: 'private-only',
          provenance: 'third-party-personal'
        }));
      }
      imported = mergeImportedMetrics(imported, tagged);
      reports.push(result.stats);
      progress({ index: i + 1, total: SHOWJCR_FILES.length, title: file.title, phase: 'complete' });
    }

    // Keep explicitly uploaded personal files ahead of synced third-party reference data.
    setLayer(previous => {
      const manualOnly: ImportedLayer = {};
      for (const [id, metrics] of Object.entries(previous)) {
        const manual = metrics.filter(m => m.sourceId !== 'showjcr-local');
        if (manual.length) manualOnly[id] = manual;
      }
      return mergeImportedMetrics(imported, manualOnly);
    });
    setLastSync({ at: new Date().toISOString(), commit: SHOWJCR_COMMIT, reports });
    return reports;
  }, []);

  const clearPrivate = useCallback(() => { setLayer({}); setLastSync(null); }, []);
  const value = useMemo<MetricsState>(() => ({
    layer, getMetrics, getMetric, count, privateCount,
    importCSV, syncShowJCR, lastSync, clearPrivate
  }), [layer, getMetrics, getMetric, count, privateCount, importCSV, syncShowJCR, lastSync, clearPrivate]);

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useJournalMetrics(): MetricsState {
  const value = useContext(MetricsContext);
  if (!value) throw Error('Journal metrics provider is missing');
  return value;
}
