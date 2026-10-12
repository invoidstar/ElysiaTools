import type { DeadlineRow } from '../types';
import { sourceForRow, isFuture } from './catalog';

const escape = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const dayAfter = (day: string) => new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const compactDate = (d: string) => d.replace(/-/g, '');
const compactUTC = (d: string) => d.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const fold = (line: string): string => {
  // iCalendar requires folded physical lines; use byte lengths for UTF-8 strings.
  const encoder = new TextEncoder();
  let out = '', chunk = '';
  for (const char of line) {
    if (encoder.encode(chunk + char).length > 73) {
      out += chunk + '\r\n ';
      chunk = char;
    } else chunk += char;
  }
  return out + chunk;
};

export function calendarICS(rows: DeadlineRow[], upcomingOnly = true): string {
  const dtstamp = compactUTC(new Date().toISOString());
  const items = rows.filter(r => !upcomingOnly || isFuture(r.event)).sort((a, b) => (a.event.utc || a.event.original).localeCompare(b.event.utc || b.event.original));
  const events = items.map(row => {
    const { event, conference, edition, track } = row;
    const source = sourceForRow(row);
    const start = event.precision === 'date'
      ? 'DTSTART;VALUE=DATE:' + compactDate(event.original)
      : 'DTSTART:' + compactUTC(event.utc!);
    const end = event.precision === 'date'
      ? 'DTEND;VALUE=DATE:' + compactDate(dayAfter(event.original))
      : '';
    const lines = [
      'BEGIN:VEVENT',
      'UID:' + escape(edition.id + '-' + track.id + '-' + event.id) + '@elysiatools',
      'DTSTAMP:' + dtstamp,
      start,
      ...(end ? [end] : []),
      'SUMMARY:' + escape(conference.acronym + ' ' + edition.year + ' · ' + event.title),
      'DESCRIPTION:' + escape(track.name + ' | Official zone: ' + event.timezone + ' | Original: ' + event.original + ' | Source: ' + (source?.url || 'TBD')),
      ...(source ? ['URL:' + source.url] : []),
      'END:VEVENT'
    ];
    return lines.map(fold).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ElysiaTools//Academic Deadlines//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR', ''].join('\r\n');
}
