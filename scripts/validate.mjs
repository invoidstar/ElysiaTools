#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const conferences = load('data/conferences.json');
const editions = load('data/editions.json');
const journals = load('data/journals.json');
const sources = load('data/sources.json');
const check = (condition, reason) => assert.ok(condition, reason);
const grade = v => v === null || ['A','B','C'].includes(v);
const yyyyMmDd = text => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text + 'T00:00:00Z'));
const sourceIds = new Set(sources.map(x => x.id));
const confIds = new Set(conferences.map(x => x.id));
const journalIds = new Set(journals.map(x => x.id));
function validISSN(issn) {
  if (issn === null) return true;
  if (!/^\d{4}-\d{3}[\dX]$/.test(issn)) return false;
  const chars = issn.replace('-', '');
  let sum = 0;
  for (let i=0;i<8;i++) sum += (chars[i] === 'X' ? 10 : Number(chars[i])) * (8 - i);
  return sum % 11 === 0;
}
function source(id, context) { check(sourceIds.has(id), context + ': missing source ' + id); }
function unique(list, label) { check(new Set(list).size === list.length, label + ': duplicate ID'); }

unique(sources.map(x => x.id), 'source');
for (const s of sources) {
  check(s.title && s.url?.startsWith('https://'), 'source requires HTTPS URL/title: ' + s.id);
  check(yyyyMmDd(s.verifiedAt), 'source verification date invalid: ' + s.id);
}
check(confIds.size === conferences.length, 'conference IDs are not unique');
for (const c of conferences) {
  check(c.id && c.acronym && c.name && c.field && c.fieldZh, 'incomplete conference: ' + c.id);
  check(grade(c.ccf), 'bad grade: ' + c.id);
  check(c.ccfYear === 2026, 'conference CCF edition mismatch: ' + c.id);
  source(c.sourceId, c.id);
  if (c.website !== null) check(c.website.startsWith('https://'), 'invalid conference URL: ' + c.id);
}
check(journalIds.size === journals.length, 'journal IDs are not unique');
for (const j of journals) {
  check(j.id && j.acronym && j.name && j.field, 'incomplete journal: ' + j.id);
  check(grade(j.ccf), 'bad journal CCF grade: ' + j.id);
  check(j.ccf ? j.ccfYear === 2026 : j.ccfYear === null, 'journal edition/grade mismatch: ' + j.id);
  check(['open','hybrid','subscription','unknown'].includes(j.oa), 'bad OA type: ' + j.id);
  for (const issn of [j.issn,j.eissn,j.issnL]) check(validISSN(issn), 'bad ISSN: ' + j.id + ' ' + issn);
  source(j.sourceId, j.id);
  for (const i of j.indicators) {
    check(i.system && Number.isInteger(i.year) && i.year > 1950 && i.value, 'indicator needs year/system/value: ' + j.id);
    source(i.sourceId, j.id + ': indicator');
  }
}
unique(editions.map(e => e.id), 'edition');
let tracks = 0, events = 0, timed = 0, days = 0;
for (const e of editions) {
  check(confIds.has(e.conferenceId), 'edition references unknown conference: ' + e.id);
  check(e.id && Number.isInteger(e.year) && e.year >= 2020 && e.year <= 2035, 'bad edition: ' + e.id);
  check(yyyyMmDd(e.verifiedAt), 'edition verification invalid: ' + e.id);
  if (e.meetingStart) check(yyyyMmDd(e.meetingStart), 'bad meeting start: ' + e.id);
  if (e.meetingEnd) check(yyyyMmDd(e.meetingEnd), 'bad meeting end: ' + e.id);
  source(e.sourceId, e.id);
  unique(e.tracks.map(t => t.id), 'track in ' + e.id);
  tracks += e.tracks.length;
  for (const t of e.tracks) {
    check(t.name && Array.isArray(t.pending) && Array.isArray(t.events), 'bad track: ' + t.id);
    if (t.sourceId) source(t.sourceId, t.id);
    unique(t.events.map(ev => ev.id), 'events in ' + e.id + '/' + t.id);
    for (const event of t.events) {
      events++;
      check(event.title && ['abstract','paper','supplement','rebuttal','notification','camera-ready','review','revision'].includes(event.kind), 'bad event: ' + event.id);
      check(['minute','date'].includes(event.precision), 'missing precision: ' + event.id);
      check(event.timezone && event.original, 'missing original time/zone: ' + event.id);
      try { new Intl.DateTimeFormat('en-US',{timeZone:event.timezone}); }
      catch { throw new Error('unknown IANA time zone: ' + event.timezone); }
      if (event.sourceId) source(event.sourceId, event.id);
      if (event.precision === 'date') {
        days++; check(yyyyMmDd(event.original) && !event.utc, 'date-only event must not have invented time: ' + event.id);
      } else {
        timed++;
        check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.original), 'invalid precise clock: ' + event.id);
        check(event.utc && !Number.isNaN(Date.parse(event.utc)), 'precise event requires UTC instant: ' + event.id);
        if (event.timezone === 'Etc/GMT+12') {
          const expected = new Date(Date.parse(event.original + ':00Z') + 12 * 60 * 60 * 1000).toISOString();
          check(event.utc === expected, 'AoE conversion mismatch: ' + event.id);
        }
      }
    }
  }
}
check(sources.some(s => s.id === 'ccf-2026'), 'CCF 2026 source required');
console.log('VALID: ' + conferences.length + ' conferences / ' + journals.length + ' journals / ' + editions.length + ' editions / ' + tracks + ' tracks / ' + events + ' events (' + timed + ' timed, ' + days + ' date-only).');
