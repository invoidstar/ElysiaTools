import type { AcademicState } from '../types';
import { conferences, journals } from './catalog';

const KEY = 'elysiatools-academic-v1';
const conferenceIds = new Set(conferences.map(x => x.id));
const journalIds = new Set(journals.map(x => x.id));
export const emptyAcademic: AcademicState = { conferences: [], journals: [], compare: [], savedFilters: [] };

export function normalizeAcademic(input: unknown): AcademicState {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const valid = (value: unknown, ids: Set<string>, max = 200) =>
    Array.isArray(value) ? Array.from(new Set(value.filter((v): v is string => typeof v === 'string' && ids.has(v)))).slice(0, max) : [];
  const filters = Array.isArray(raw.savedFilters) ? raw.savedFilters.slice(0, 20).flatMap((v: unknown) => {
    if (!v || typeof v !== 'object') return [];
    const item = v as Record<string, unknown>;
    if (typeof item.label !== 'string') return [];
    return [{
      id: String(item.id ?? Date.now()).slice(0, 60),
      label: item.label.slice(0, 60),
      keyword: String(item.keyword ?? '').slice(0, 150),
      grade: String(item.grade ?? '').slice(0, 8),
      field: String(item.field ?? '').slice(0, 100),
      status: ['upcoming', 'closed', 'tbd'].includes(String(item.status ?? '')) ? String(item.status) : '',
      from: /^\d{4}-\d{2}-\d{2}$/.test(String(item.from ?? '')) ? String(item.from) : '',
      to: /^\d{4}-\d{2}-\d{2}$/.test(String(item.to ?? '')) ? String(item.to) : ''
    }];
  }) : [];
  return {
    conferences: valid(raw.conferences, conferenceIds),
    journals: valid(raw.journals, journalIds),
    compare: valid(raw.compare, journalIds, 4),
    savedFilters: filters
  };
}

export function readAcademic(): AcademicState {
  try { const raw = localStorage.getItem(KEY); return raw ? normalizeAcademic(JSON.parse(raw)) : emptyAcademic; }
  catch { return emptyAcademic; }
}
export function writeAcademic(value: AcademicState): void {
  try { localStorage.setItem(KEY, JSON.stringify(value)); }
  catch { /* browser storage may be disabled */ }
}
export function exportAcademic(value: AcademicState): string {
  return JSON.stringify({ format: 'elysiatools-academic', version: 1, exportedAt: new Date().toISOString(), data: value }, null, 2);
}
export function parseAcademic(text: string): AcademicState {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('无效的备份文件');
  const item = parsed as Record<string, unknown>;
  if (item.format !== 'elysiatools-academic' || item.version !== 1 || !item.data || typeof item.data !== 'object')
    throw new Error('不是 ElysiaTools V1 备份文件');
  return normalizeAcademic(item.data);
}
export function downloadContent(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
