#!/usr/bin/env node
/**
 * Offline invariant checks for the generated V2 Pages assets.
 * Run after the annual-source compiler, before GitHub Pages deployment.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [indexPath,diagPath,auditPath]=[
  process.argv[2]||'public/data/journal-universe.json',
  process.argv[3]||'public/data/journal-diagnostics.json',
  process.argv[4]||'public/data/journal-coverage.json'
];
const read=path=>JSON.parse(readFileSync(resolve(path),'utf8'));
const index=read(indexPath),diagnostics=read(diagPath),audit=read(auditPath);
const baseline=read('data/journals.json');
const validStatus=new Set(['P','L','N','R']);
const systems=['cas','xinrui','jcr','jif'];
const kinds=['cas','xinrui','jcr'];
const code=['c','x','q','f'];
const indexByID=new Map();
const diagByID=new Map(diagnostics.journals.map(d=>[d.id,d]));
const statusCounts=Object.fromEntries(systems.map(s=>[
  s,{available:0,source_no_metric:0,not_in_source:0,identity_review:0}
]));
const coverage=Object.fromEntries(systems.map(s=>[s,0]));
const joinedRows={cas:0,xinrui:0,jcr:0};
let missingAll=0;
const statusName={P:'available',L:'source_no_metric',N:'not_in_source',R:'identity_review'};

assert.equal(index.version,2,'Expected retention-aware V2 journal index');
assert.equal(diagnostics.version,2,'Expected journal-level audit report');
assert.equal(index.sourceRevision,diagnostics.sourceRevision,'Mixed annual source revisions');
assert.equal(index.entries.length,audit.indexed,'Count differs from source audit');
assert.equal(index.entries.length,diagnostics.journals.length,'Missing per-journal diagnosis');
assert.ok(index.entries.length>=22000,'Suspiciously small journal universe');
assert.equal(diagByID.size,diagnostics.journals.length,'Duplicated diagnosis ID');

for(const row of index.entries){
  const [id,title,issn,eissn,field,publisher,metrics,aliases,status,methods,issues,additionalISSNs,source,sourceRows]=row;
  assert.ok(id&&title,'Missing journal ID/title');
  assert.ok(!indexByID.has(id),'Duplicate journal identity '+id);
  indexByID.set(id,row);
  assert.ok(Array.isArray(metrics)&&Array.isArray(aliases),'Malformed journal '+id);
  assert.equal(status?.length,4,'Incomplete annual statuses for '+id);
  assert.equal(methods?.length,3,'Incomplete match methods for '+id);
  assert.ok(Array.isArray(issues)&&Array.isArray(additionalISSNs),'Malformed identification evidence '+id);
  assert.ok(typeof source==='string'&&source,'Missing identity source '+id);
  assert.ok(Array.isArray(sourceRows)&&sourceRows.length===3,'Missing row trace '+id);
  const diagnostic=diagByID.get(id);
  assert.ok(diagnostic,'No diagnostic entry for '+id);
  assert.equal(diagnostic.name,title,'Diagnostic name mismatch '+id);
  assert.equal(diagnostic.issn,issn||null,'ISSN mismatch '+id);
  assert.deepEqual(diagnostic.issues||[],issues,'Review flags mismatch '+id);
  if(!metrics.length)missingAll++;
  for(let i=0;i<3;i++){
    const kind=kinds[i];
    const rows=sourceRows[i];
    assert.ok(Array.isArray(rows),'Invalid source rows '+id+':'+kind);
    assert.ok(rows.every(n=>Number.isInteger(n)&&n>0),'Bad source record number '+id);
    assert.deepEqual(diagnostic.matches[kind].sourceRecordNumbers,rows,'Source reference mismatch '+id);
    joinedRows[kind]+=rows.length;
  }
  for(let i=0;i<4;i++){
    const system=systems[i],c=status[i];
    assert.ok(validStatus.has(c),'Invalid annual status '+id+':'+c);
    const present=metrics.some(m=>m[0]===code[i]&&m[1]);
    const listing=sourceRows[i>=2?2:i].length>0;
    if(c==='P')assert.ok(present,'Available status without metric '+id+':'+system);
    else if(c==='L')assert.ok(!present&&listing,'Listed-no-metric lacks a listing '+id+':'+system);
    else if(c==='N'||c==='R')assert.ok(!present&&!listing,'Unlisted status conflicts with source evidence '+id+':'+system);
    if(c==='R')assert.ok(issues.length>0,'Review state lacks review reason '+id+':'+system);
    const name=statusName[c];
    assert.equal(diagnostic.status[system],name,'Per-journal diagnosis mismatch '+id+':'+system);
    statusCounts[system][name]++;
    if(present)coverage[system]++;
  }
}
for(const base of baseline)assert.ok(indexByID.has(base.id),'Baseline CCF journal was removed: '+base.id);
for(const system of systems){
  assert.deepEqual(statusCounts[system],audit.statusCounts[system],'Status count mismatch '+system);
  assert.equal(coverage[system],audit.coverage[system],'Indicator coverage count mismatch '+system);
}
for(const kind of kinds){
  assert.equal(joinedRows[kind],audit.sourceStats[kind].resolvedRows,
    'Some source records are not linked or were counted twice: '+kind);
  assert.equal(audit.sourceStats[kind].rows,
    audit.sourceStats[kind].resolvedRows+audit.sourceStats[kind].unidentifiable,
    'Source rows were silently dropped: '+kind);
}
assert.equal(audit.withoutAnnualMetrics,
  index.entries.filter(row=>!row[6].length).length,
  'Annual no-metric retention count mismatch');
assert.equal(audit.withAnnualMetrics, index.entries.filter(row=>row[6].length>0).length,
  'Annual metric coverage count mismatch');
assert.equal(missingAll,audit.withoutAnnualMetrics);
console.log('JOURNAL DATA VALID:',JSON.stringify({
  indexed:index.entries.length,withAnnualMetrics:audit.withAnnualMetrics,
  withoutAnnualMetrics:missingAll,systems:coverage,
  sourceRowsPreserved:joinedRows
}));
