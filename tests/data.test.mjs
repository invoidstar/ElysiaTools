import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = file => JSON.parse(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const editions = load('editions.json');
const conferences = load('conferences.json');
const journals = load('journals.json');

test('AoE deadline preserves official day and converts to UTC', () => {
  const cvpr = editions.find(x => x.id === 'cvpr-2027');
  const paper = cvpr.tracks[0].events.find(x => x.kind === 'paper');
  assert.equal(paper.original, '2026-11-16T23:59');
  assert.equal(paper.utc, '2026-11-17T11:59:00.000Z');
  assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Singapore',hour:'2-digit',hourCycle:'h23'}).format(new Date(paper.utc)), '19');
});
test('separate USENIX submission cycles cannot collide', () => {
  const usenix = editions.find(x => x.id === 'usenix-security-2027');
  assert.equal(usenix.tracks.length, 2);
  assert.notEqual(usenix.tracks[0].events.find(e => e.kind === 'paper').utc, usenix.tracks[1].events.find(e => e.kind === 'paper').utc);
});
test('unpublished KDD cycle stays TBD', () => {
  const kdd = editions.find(x => x.id === 'sigkdd-2027');
  const cycle = kdd.tracks.find(x => x.id === 'research-c2');
  assert.equal(cycle.events.length, 0);
  assert.ok(cycle.pending.length > 0);
});
test('CCF versions remain separate from ISSN and other identifiers', () => {
  assert.equal(journals.find(x => x.id === 'tro').ccf, 'B');
  const acl = conferences.find(x => x.acronym === 'ACL');
  assert.equal(acl.ccfYear, 2026);
  assert.equal(acl.ccf, 'A');
});
test('date-only events never invent a UTC instant', () => {
  const all = editions.flatMap(e => e.tracks.flatMap(t => t.events));
  const dateOnly = all.find(e => e.precision === 'date');
  assert.ok(dateOnly && !dateOnly.utc);
});


test('full CCF 2026 directory matches official row totals', () => {
  const coverage = load('ccf-coverage.json');
  assert.equal(coverage.listedRows, 681);
  assert.equal(conferences.length, 386);
  assert.equal(journals.filter(x => x.ccf).length, 291);
  assert.equal(journals.length, 292); // includes extra non-CCF RA-L
  assert.equal(conferences.reduce((n,x)=>n+x.ccfEntries.length,0),386);
  assert.equal(journals.reduce((n,x)=>n+x.ccfEntries.length,0),295);
});

test('four journals cross-list subjects without duplicate identity', () => {
  for(const name of ['TOMM','DKE','IPL','IJIS']) {
    const matches=journals.filter(x=>x.acronym===name);
    assert.equal(matches.length,1,name);
    assert.equal(matches[0].ccfEntries.length,2,name);
  }
  const securityFSE=conferences.find(x=>x.id==='fse-crypto');
  const softwareFSE=conferences.find(x=>x.id==='fse-software');
  assert.ok(securityFSE&&softwareFSE&&securityFSE.id!==softwareFSE.id);
});

test('acceptance rates have distinct conference-year-track records and official provenance', () => {
  const acceptance=load('acceptance.json'), sources=load('sources.json');
  const ids=new Set(sources.map(x=>x.id));
  assert.ok(acceptance.length>=10);
  const keys=acceptance.map(x=>[x.conferenceId,x.year,x.track].join('|'));
  assert.equal(new Set(keys).size,keys.length);
  for(const x of acceptance){
    assert.ok(ids.has(x.sourceId));
    assert.ok(x.rate>0&&x.rate<=100);
    if(x.submissions!=null && x.accepted!=null)
      assert.ok(Math.abs(100*x.accepted/x.submissions-x.rate)<0.6);
  }
});

test('restricted CAS 2025 and independent XinRui 2026 are not fabricated', () => {
  for(const journal of journals){
    for(const entry of journal.indicators){
      if(['cas','xinrui'].includes(entry.system))
        assert.ok(entry.sourceId && entry.license);
    }
  }
  const enriched=journals.filter(j=>j.indicators.some(m=>m.system==='jif'));
  assert.ok(enriched.length>0);
  assert.ok(enriched.every(j=>j.indicators.every(m=>m.year>=2024)));
});

test('AAAI 2027 change log preserves corrected author feedback window', () => {
  const aaai=editions.find(x=>x.id==='aaai-2027');
  const feedback=aaai.tracks.find(x=>x.id==='main');
  assert.equal(feedback.events.find(e=>e.title==='Author feedback opens').original,'2026-10-24');
  assert.equal(feedback.events.find(e=>e.title==='Author feedback closes').original,'2026-10-31');
  assert.ok(aaai.changeLog.length>0);
});
