export interface BibtexLookupResult {
  bibtex: string;
  source: string;
  title: string;
  identifier: string;
}
export function normalizeDOI(value: string): string;
export function normalizeArxiv(value: string): string;
export function crossrefToBibtex(item: Record<string, any>, doi: string): BibtexLookupResult;
export function openAlexArxivToBibtex(item: Record<string, any>, id: string): BibtexLookupResult;
export function lookupBibtex(kind: 'doi'|'arxiv', value: string,
  fetcher?: (url:string,init?:RequestInit)=>Promise<Response>): Promise<BibtexLookupResult>;
