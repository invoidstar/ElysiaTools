export interface ImportedMetric {
  system: 'cas' | 'xinrui' | 'jcr' | 'jif';
  value: string;
  year: number;
  category: string;
  sourceId: string;
  license: string;
  provenance: 'user-provided' | 'third-party-personal';
}
export interface ImportStats {
  file: string;
  total: number;
  matched: number;
  unmatched: number;
  withoutMetrics: number;
  ambiguous: number;
  systems: Record<'cas' | 'xinrui' | 'jcr' | 'jif',number>;
  sampleUnmatched: string[];
}
export type ImportedLayer = Record<string,ImportedMetric[]>;
export function normalizeJournal(value: string): string;
export function parseCsvRows(text: string, maxRows?: number): Record<string,string>[];
export function parseMetricFile(text: string, filename: string, journals: Array<{
  id: string;
  name: string;
  aliases?: string[];
  issn?: string | null;
  eissn?: string | null;
  issnL?: string | null;
}>): {records: ImportedLayer; stats: ImportStats};
export function mergeImportedMetrics(base: ImportedLayer, incoming: ImportedLayer): ImportedLayer;
