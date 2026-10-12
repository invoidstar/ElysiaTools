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
  assert.equal(journals.find(x => x.id === 'tro').ccf, null);
  const acl = conferences.find(x => x.acronym === 'ACL');
  assert.equal(acl.ccfYear, 2026);
  assert.equal(acl.ccf, 'A');
});
test('date-only events never invent a UTC instant', () => {
  const all = editions.flatMap(e => e.tracks.flatMap(t => t.events));
  const dateOnly = all.find(e => e.precision === 'date');
  assert.ok(dateOnly && !dateOnly.utc);
});
