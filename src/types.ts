export type Grade = 'A' | 'B' | 'C' | null;

export interface CCFEntry { field: string; fieldZh: string; grade: 'A' | 'B' | 'C'; year: number; seq: number; }

export interface AcceptanceRecord { conferenceId: string; year: number; track: string; submissions?: number | null; accepted?: number | null; rate: number; sourceId: string; note?: string; }

export interface CCFCoverage { edition: number; label: string; officialUrl: string; listedRows: number; conferenceRows: number; journalRows: number; uniqueConferences: number; uniqueCCFJournals: number; crossListedJournalNames: number; supplementalJournals: number; fields: number; compiledAt: string; policy: string; }
export type Precision = 'minute' | 'date';
export type Kind = 'abstract' | 'paper' | 'supplement' | 'rebuttal' | 'notification' | 'camera-ready' | 'review' | 'revision';

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  kind: string;
  owner: string;
  verifiedAt: string;
  note?: string;
  extractUrl?: string;
}

export interface Conference {
  id: string;
  acronym: string;
  name: string;
  aliases: string[];
  field: string;
  fieldZh: string;
  ccf: Grade;
  ccfYear: number | null;
  ccfEntries?: CCFEntry[];
  website: string | null;
  indexUrl: string | null;
  sourceId: string;
}

export interface DeadlineEvent {
  id: string;
  kind: Kind;
  title: string;
  precision: Precision;
  original: string;
  timezone: string;
  utc?: string;
  sourceId?: string;
}

export interface SubmissionTrack {
  id: string;
  name: string;
  events: DeadlineEvent[];
  pending: string[];
  sourceId?: string;
}

export interface Edition {
  id: string;
  conferenceId: string;
  year: number;
  location: string | null;
  meetingStart: string | null;
  meetingEnd: string | null;
  sourceId: string;
  verifiedAt: string;
  website?: string | null;
  websiteSourceId?: string;
  tracks: SubmissionTrack[];
  changeLog: Array<{ date: string; note: string; sourceId?: string }>;
}

export interface JournalIndicator {
  system: string;
  value: string;
  year: number;
  category?: string;
  sourceId: string;
  license?: string;
}

export type JournalSnapshotStatus = 'available' | 'source_no_metric' | 'not_in_source' | 'identity_review';

export interface JournalDiagnostic {
  status: Record<'cas' | 'xinrui' | 'jcr' | 'jif', JournalSnapshotStatus>;
  matchMethod: Partial<Record<'cas' | 'xinrui' | 'jcr', 'issn' | 'title' | 'new' | 'review'>>;
  sourceRows: Partial<Record<'cas' | 'xinrui' | 'jcr', number[]>>;
  issues: string[];
}

export interface Journal {
  id: string;
  acronym: string;
  name: string;
  aliases: string[];
  field: string;
  fieldZh: string;
  additionalFields?: string[];
  ccfEntries?: CCFEntry[];
  publisher: string | null;
  ccf: Grade;
  ccfYear: number | null;
  issn: string | null;
  eissn: string | null;
  issnL: string | null;
  extraIssns?: string[];
  diagnostic?: JournalDiagnostic;
  indexing?: string[];
  language?: string;
  oa: 'open' | 'hybrid' | 'subscription' | 'unknown';
  website: string | null;
  websiteSource?: 'curated' | 'doaj' | 'openalex';
  websiteReference?: string | null;
  websiteMatch?: string;
  indexUrl: string | null;
  sourceId: string;
  identifierSource: string | null;
  indicators: JournalIndicator[];
}

export interface AcademicState {
  conferences: string[];
  journals: string[];
  compare: string[];
  savedFilters: Array<{ id: string; label: string; keyword: string; grade: string; field: string; status?: string; from?: string; to?: string }>;
}

export interface DeadlineRow {
  conference: Conference;
  edition: Edition;
  track: SubmissionTrack;
  event: DeadlineEvent;
}
