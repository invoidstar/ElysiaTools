import conferenceData from '../../data/conferences.json';
import editionData from '../../data/editions.json';
import journalData from '../../data/journals.json';
import sourceData from '../../data/sources.json';
import type { Conference, Edition, Journal, SourceRecord, DeadlineRow, DeadlineEvent } from '../types';

export const conferences = conferenceData as unknown as Conference[];
export const editions = editionData as unknown as Edition[];
export const journals = journalData as unknown as Journal[];
export const sources = sourceData as unknown as SourceRecord[];

const sourceById = new Map(sources.map(s => [s.id, s]));
export const getSource = (id: string) => sourceById.get(id);
export const getConference = (id: string) => conferences.find(c => c.id === id);
export const getJournal = (id: string) => journals.find(j => j.id === id);
export const getEdition = (conferenceId: string) =>
  editions.filter(e => e.conferenceId === conferenceId).sort((a, b) => b.year - a.year)[0];

export const matches = (venue: Conference | Journal, term: string) => {
  const query = term.trim().toLocaleLowerCase();
  if (!query) return true;
  return [venue.acronym, venue.name, venue.field, venue.fieldZh, ...(venue.aliases || [])]
    .filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
};

export function allDeadlineRows(): DeadlineRow[] {
  return editions.flatMap(edition => {
    const conference = getConference(edition.conferenceId);
    if (!conference) return [];
    return edition.tracks.flatMap(track =>
      track.events.map(event => ({ conference, edition, track, event }))
    );
  });
}

export const deadlineRows = allDeadlineRows();
export const submissionKinds = new Set(['abstract', 'paper', 'supplement', 'revision']);

export function eventMillis(event: DeadlineEvent): number {
  return event.utc ? new Date(event.utc).getTime() : Date.parse(event.original + 'T12:00:00Z');
}

export function isFuture(event: DeadlineEvent, now = Date.now()): boolean {
  if (event.precision === 'date') {
    return Date.parse(event.original + 'T23:59:59Z') >= now;
  }
  return eventMillis(event) >= now;
}

export function nextDeadline(conferenceId: string, now = Date.now()): DeadlineRow | undefined {
  const rows = deadlineRows.filter(r =>
    r.conference.id === conferenceId && submissionKinds.has(r.event.kind) && r.event.precision === 'minute'
  );
  const future = rows.filter(r => eventMillis(r.event) >= now);
  return (future.find(r => r.event.kind === 'paper') || future.sort((a, b) => eventMillis(a.event) - eventMillis(b.event))[0] ||
    rows.sort((a, b) => eventMillis(b.event) - eventMillis(a.event))[0]);
}

export function deadlineState(conferenceId: string, now = Date.now()): 'upcoming' | 'closed' | 'tbd' {
  const rows = deadlineRows.filter(r =>
    r.conference.id === conferenceId && submissionKinds.has(r.event.kind) && r.event.precision === 'minute'
  );
  if (!rows.length) return 'tbd';
  return rows.some(r => eventMillis(r.event) >= now) ? 'upcoming' : 'closed';
}

export function upcomingRows(now = Date.now(), limit = 20): DeadlineRow[] {
  return deadlineRows.filter(r =>
    submissionKinds.has(r.event.kind) && r.event.precision === 'minute' && eventMillis(r.event) >= now
  ).sort((a, b) => eventMillis(a.event) - eventMillis(b.event)).slice(0, limit);
}

export function orderedConferences(items: Conference[], now = Date.now()): Conference[] {
  return [...items].sort((a, b) => {
    const aState = deadlineState(a.id, now);
    const bState = deadlineState(b.id, now);
    const rank = { upcoming: 0, tbd: 1, closed: 2 };
    if (rank[aState] !== rank[bState]) return rank[aState] - rank[bState];
    if (aState === 'upcoming') return eventMillis(nextDeadline(a.id, now)!.event) - eventMillis(nextDeadline(b.id, now)!.event);
    return a.acronym.localeCompare(b.acronym);
  });
}

export function sourceForRow(row: DeadlineRow): SourceRecord | undefined {
  return getSource(row.event.sourceId || row.track.sourceId || row.edition.sourceId);
}

export const areas = Array.from(new Set([...conferences, ...journals].map(v => v.field))).sort();
