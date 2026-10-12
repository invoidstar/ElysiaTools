export type Grade = 'A' | 'B' | 'C' | null;
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

export interface Journal {
  id: string;
  acronym: string;
  name: string;
  aliases: string[];
  field: string;
  fieldZh: string;
  publisher: string | null;
  ccf: Grade;
  ccfYear: number | null;
  issn: string | null;
  eissn: string | null;
  issnL: string | null;
  oa: 'open' | 'hybrid' | 'subscription' | 'unknown';
  website: string | null;
  indexUrl: string | null;
  sourceId: string;
  identifierSource: string | null;
  indicators: JournalIndicator[];
}

export interface AcademicState {
  conferences: string[];
  journals: string[];
  compare: string[];
  savedFilters: Array<{ id: string; label: string; keyword: string; grade: string; field: string }>;
}

export interface DeadlineRow {
  conference: Conference;
  edition: Edition;
  track: SubmissionTrack;
  event: DeadlineEvent;
}
