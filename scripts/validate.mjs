#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const conferences = load('data/conferences.json');
const editions = load('data/editions.json');
const journals = load('data/journals.json');
const sources = load('data/sources.json');
const acceptance = load('data/acceptance.json');
const coverage = load('data/ccf-coverage.json');
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
function verifyCCFEntries(venue, kind) {
  if (venue.ccf === null) {
    check((venue.ccfEntries || []).length === 0, kind + ' unranked entry cannot claim CCF category: ' + venue.id);
    return 0;
  }
  check(venue.ccfEntries?.length > 0, 'CCF entries missing from '+kind+': ' + venue.id);
  unique(venue.ccfEntries.map(v=>v.field), kind + ' CCF fields for ' + venue.id);
  for (const entry of venue.ccfEntries) {
    check(['A','B','C'].includes(entry.grade), kind + ' CCF entry grade invalid: ' + venue.id);
    check(entry.year === coverage.edition && entry.field && entry.fieldZh && Number.isInteger(entry.seq),
      kind + ' CCF entry must contain grade/year/subject/sequence: ' + venue.id);
  }
  check(venue.ccfEntries.some(entry=>entry.grade===venue.ccf),'CCF principal grade mismatch: ' + venue.id);
  return venue.ccfEntries.length;
}
const listedConferences = conferences.reduce((n,v)=>n+verifyCCFEntries(v,'conference'),0);
const listedJournals = journals.reduce((n,v)=>n+verifyCCFEntries(v,'journal'),0);
check(coverage.edition===2026 && coverage.listedRows===681 && coverage.fields===10,
  'CCF seventh edition metadata invalid');
check(conferences.length === coverage.uniqueConferences && listedConferences === coverage.conferenceRows,
  'CCF 2026 conference directory coverage incomplete');
check(journals.filter(j=>j.ccf!==null).length === coverage.uniqueCCFJournals &&
    listedJournals === coverage.journalRows,
  'CCF 2026 journal directory coverage incomplete');
check(listedConferences+listedJournals === coverage.listedRows,
  'CCF directory row count mismatch');
check(coverage.uniqueCCFJournals === 291 && coverage.journalRows === 295 &&
    journals.filter(j=>j.ccf===null).length === coverage.supplementalJournals,
  'Cross-listed journals must be deduplicated without losing subject memberships');
const approval=new Set();
for (const row of acceptance) {
  check(confIds.has(row.conferenceId),'acceptance references unknown conference: '+row.conferenceId);
  check(Number.isInteger(row.year)&&row.year>=1990&&row.year<=2026&&row.track,
    'acceptance requires official year and track: '+row.conferenceId);
  check(typeof row.rate==='number'&&row.rate>=0&&row.rate<=100&&Number.isFinite(row.rate),
    'acceptance rate invalid: '+row.conferenceId+' '+row.year);
  source(row.sourceId, 'acceptance history');
  if(row.submissions!=null)check(Number.isInteger(row.submissions)&&row.submissions>0,
    'submissions invalid: '+row.conferenceId);
  if(row.accepted!=null)check(Number.isInteger(row.accepted)&&row.accepted>0,
    'accepted invalid: '+row.conferenceId);
  if(row.submissions!=null&&row.accepted!=null) {
    check(row.accepted<=row.submissions,'accepted exceeds submissions: '+row.conferenceId);
    check(Math.abs(100*row.accepted/row.submissions-row.rate)<=0.6,
      'acceptance numerator/denominator conflict: '+row.conferenceId+' '+row.year);
  }
  const key=[row.conferenceId,row.year,row.track].join('::');
  check(!approval.has(key),'duplicate historical acceptance row: '+key);
  approval.add(key);
}
for(const j of journals)for(const i of j.indicators){
  check(['jif','jcr','cas','xinrui','articles'].includes(i.system),
    'journal metric system not recognized: '+j.id);
  if(i.system==='jcr')check(/^Q[1-4]$/.test(i.value),'JCR quartile invalid '+j.id);
  if(i.system==='cas'||i.system==='xinrui')
    check(i.license && i.sourceId,'division record requires explicit licensed provenance '+j.id);
}
check(acceptance.length>=1000,'historical acceptance coverage unexpectedly low');
check(new Set(acceptance.map(r=>r.conferenceId)).size>=200,'too few conference histories');
const acceptanceKinds=new Set(acceptance.map(r=>sources.find(s=>s.id===r.sourceId)?.kind));
check(acceptanceKinds.has('official-history') && acceptanceKinds.has('community-history'),
  'official and community history sources must both be retained');
const xinrui=journals.filter(j=>j.indicators.some(m=>m.system==='xinrui' && m.year===2026));
check(xinrui.length>=8,'expected curated 2026 XinRui public reference facts');
for (const j of xinrui)for(const m of j.indicators.filter(x=>x.system==='xinrui')){
  check(/^[1-4]区$/.test(m.value), 'invalid XinRui division: '+j.id);
  const sr=sources.find(s=>s.id===m.sourceId);
  check(sr?.kind==='thirdparty-public-fact' && sr.url.includes('letpub.com.cn'),
    'single-journal source must not be mislabeled official: '+j.id);
}

console.log('VALID: CCF 2026 '+coverage.listedRows+' recommendation rows / '+coverage.uniqueConferences+' conferences / '+coverage.uniqueCCFJournals+' ranked journals / '+acceptance.length+' acceptance records.');
console.log('VALID: ' + conferences.length + ' conferences / ' + journals.length + ' journals / ' + editions.length + ' editions / ' + tracks + ' tracks / ' + events + ' events (' + timed + ' timed, ' + days + ' date-only).');
