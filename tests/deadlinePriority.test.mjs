import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrimaryTrack,isFutureDeadline,pickNextDeadline,upcomingMainDeadlines} from '../src/lib/deadlinePriority.mjs';
import {readFileSync} from 'node:fs';
const editions=JSON.parse(readFileSync(new URL('../data/editions.json',import.meta.url)));
const date=event=>({event,track:{id:'main',name:'Main Conference'}});
const timed=(id,day,kind='paper')=>({id,kind,original:day+'T23:59',precision:'minute',
  utc:new Date(Date.parse(day+'T23:59:00Z')+12*3600000).toISOString()});
const dayOnly=(id,day)=>({id,kind:'paper',original:day,precision:'date'});
test('main conference chosen ahead of an earlier workshop proposal',()=>{
  const now=Date.parse('2026-10-31T00:00:00Z');
  const workshop={track:{id:'workshops',name:'Workshop Proposals'},event:timed('proposal','2026-11-04')};
  const main=date(timed('paper','2026-11-16'));
  const choice=pickNextDeadline([workshop,main],now);
  assert.equal(choice.event.id,'paper');
  assert.equal(upcomingMainDeadlines([workshop,main],now)[0].event.id,'paper');
  assert.equal(isPrimaryTrack(workshop.track),false);
});
test('separate workshop remains reachable when main paper date passed',()=>{
  const now=Date.parse('2026-11-02T00:00:00Z');
  const workshop={track:{id:'workshops',name:'Workshops'},event:timed('proposal','2026-11-08')};
  const main=date(timed('paper','2026-10-01'));
  assert.equal(pickNextDeadline([main,workshop],now).event.id,'proposal');
});
test('date-only submission stays visible without fabricated hour',()=>{
  const now=Date.parse('2027-02-27T00:00:00Z');
  const row=date(dayOnly('iros-paper','2027-03-01'));
  assert.ok(isFutureDeadline(row.event,now));
  assert.equal(pickNextDeadline([row],now),row);
  assert.equal(row.event.utc,undefined);
});
test('ICRA 2027 arts and workshop are separate from main paper timeline',()=>{
  const icra=editions.find(e=>e.id==='icra-2027');
  assert.ok(icra);
  assert.equal(isPrimaryTrack(icra.tracks[0]),true);
  assert.equal(isPrimaryTrack(icra.tracks[1]),false);
  assert.equal(isPrimaryTrack(icra.tracks[2]),false);
  assert.equal(icra.tracks[1].events[0].precision,'date');
});
