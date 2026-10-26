#!/usr/bin/env node
/** Source evidence checks: all cited histories resolve to documented provenance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../../'+name, import.meta.url),'utf8'));
const sources=read('data/sources.json');
const acceptance=read('data/acceptance.json');
const editions=read('data/editions.json');
const rights=read('data/publication-rights.json');
const byId=new Map(sources.map(s=>[s.id,s]));
assert.equal(byId.size,sources.length,'Source IDs must be unique');
const kinds={};
for(const row of acceptance){
  const source=byId.get(row.sourceId);
  assert.ok(source,'Missing conference history source: '+row.sourceId);
  assert.ok(['community-history','official-history'].includes(source.kind),
    'History labeled as a non-history source: '+row.sourceId);
  kinds[source.kind]=(kinds[source.kind]||0)+1;
  if(source.kind==='community-history')
    assert.notEqual(row.provenance,'official-verified','Community history falsely marked official');
}
for(const e of editions){
  assert.ok(byId.has(e.sourceId),'Annual edition missing source: '+e.id);
  for(const t of e.tracks){
    assert.ok(byId.has(t.sourceId||e.sourceId),'Track missing source: '+e.id+'/'+t.id);
    for(const event of t.events)
      assert.ok(byId.has(event.sourceId||t.sourceId||e.sourceId),
        'Event missing source: '+e.id+'/'+event.id);
  }
}
assert.equal(rights.sourceRevision,read('data/metric-source-audit.json').pinnedCommit,
  'Rights claim and source revision diverged');
assert.deepEqual(rights.systems.map(s=>s.system).sort(),
  ['cas2025','jcr2025','xinrui2026'].sort());
for(const source of rights.systems){
  assert.equal(source.status,'reported-authorized-unverified',
    'Cannot upgrade rights status without external evidence');
  assert.ok(source.requiresPrivateEvidence,'Rights need retained private evidence');
}
console.log(JSON.stringify({
  officialHistory:kinds['official-history']||0,
  communityHistory:kinds['community-history']||0,
  verifiedAnnualEdtions:editions.length,
  pinnedAnnualMetrics:rights.systems.map(s=>s.system),
  permissionEvidence:"NOT independently verified by repository"
},null,2));
