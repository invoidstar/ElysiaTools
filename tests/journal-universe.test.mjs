import test from 'node:test';
import assert from 'node:assert/strict';
import { collectJournalUniverse } from '../scripts/sync/build_journal_universe.mjs';

const sources={
  cas:'Journal,ISSN/EISSN,大类,大类分区,小类1,小类1分区\nSAME JOURNAL,0036-8075,工程技术,1区,机器人学,2区\nSAME JOURNAL,0028-0836,医学,2区,医学,3区\n',
  xinrui:'Journal,ISSN/EISSN,大类中文名,大类新锐分区,小类1中文名,小类1新锐分区\nSAME JOURNAL,0036-8075,工程技术,2区,自动化,1区\nSAME JOURNAL,0028-0836,医学,1区,公共卫生,2区\n',
  jcr:'Journal,ISSN/EISSN,IF(2025),Category_1,IF Quartile(2025)_1,Category_2,IF Quartile(2025)_2\nSAME JOURNAL,0036-8075,5.123,ROBOTICS,Q1,COMPUTER SCIENCE,Q2\nSAME JOURNAL,0028-0836,4.8,MEDICINE,Q3,GENERAL,Q2\n'
};
const bare=(id,name,issn=null)=>({
  id,name,acronym:name,aliases:[],field:'Interdisciplinary',fieldZh:'交叉',
  publisher:null,ccf:null,ccfYear:null,issn,eissn:null,issnL:null,
  oa:'unknown',website:null,indexUrl:null,sourceId:'ccf-2026',
  identifierSource:null,indicators:[]
});
function item(result,issn){
  const entry=result.output.entries.find(row=>row[2]===issn);
  assert.ok(entry,'Missing journal with ISSN '+issn);
  return entry;
}
function diagnostic(result,id){
  const entry=result.diagnostics.journals.find(row=>row.id===id);
  assert.ok(entry,'Missing per-journal diagnostics '+id);
  return entry;
}
test('identity matching never merges distinct valid ISSNs with identical titles',()=>{
  const result=collectJournalUniverse([],sources,false);
  assert.equal(result.output.version,2);
  assert.equal(result.output.entries.length,2);
  assert.equal(result.audit.indexed,2);
  assert.deepEqual(new Set(result.output.entries.map(row=>row[2])),
    new Set(['0036-8075','0028-0836']));
  for(const row of result.output.entries){
    assert.equal(row[6].filter(m=>m[0]==='c').length,2);
    assert.equal(row[6].filter(m=>m[0]==='x').length,2);
    assert.equal(row[6].filter(m=>m[0]==='q').length,2);
    assert.equal(row[6].filter(m=>m[0]==='f').length,1);
  }
  assert.equal(result.audit.sourceRowIntegrity.cas.resolved,2);
  assert.equal(result.audit.sourceRowIntegrity.xinrui.resolved,2);
  assert.equal(result.audit.sourceRowIntegrity.jcr.resolved,2);
});

test('CCF journal ID, subject metadata and inherited identifiers survive',()=>{
  const original=bare('science','SAME JOURNAL','0036-8075');
  original.ccf='A';
  original.ccfYear=2026;
  const result=collectJournalUniverse([original],sources,false);
  assert.equal(result.output.entries.length,2);
  assert.equal(item(result,'0036-8075')[0],'science');
  assert.equal(item(result,'0036-8075')[4],'');
  assert.equal(diagnostic(result,'science').status.cas,'available');
});

test('source rows with no valid ranking are still searchable identities',()=>{
  const empty={
    cas:'Journal,ISSN/EISSN,大类分区\nUNRATED JOURNAL,0036-8075,\n',
    xinrui:'Journal,ISSN,EISSN,大类新锐分区\nUNRATED JOURNAL,0036-8075,,\n',
    jcr:'Journal,ISSN,EISSN,IF(2025),Category_1,IF Quartile(2025)_1\nUNRATED JOURNAL,0036-8075,,,RELIGION,\n'
  };
  const result=collectJournalUniverse([],empty,false);
  assert.equal(result.output.entries.length,1);
  const row=item(result,'0036-8075');
  assert.deepEqual(row[6],[]);
  assert.equal(row[8],'LLLL');
  assert.equal(result.audit.withAnnualMetrics,0);
  for(const value of Object.values(diagnostic(result,row[0]).status))
    assert.equal(value,'source_no_metric');
});

test('baseline journals absent from every annual source are not deleted',()=>{
  const result=collectJournalUniverse([bare('existing','BASELINE ONLY','2049-3630')],sources,false);
  assert.equal(result.output.entries.length,3);
  const row=result.output.entries.find(r=>r[0]==='existing');
  assert.ok(row);
  assert.equal(row[8],'NNNN');
  assert.equal(result.audit.withoutAnnualMetrics,1);
  assert.equal(diagnostic(result,'existing').status.cas,'not_in_source');
});

test('JIF value without Q1-Q4 is specifically listed-without-quartile',()=>{
  const datasets={
    cas:'Journal,ISSN/EISSN,大类分区\nVALUE WITHOUT Q,0036-8075,1区\n',
    xinrui:'Journal,ISSN,大类新锐分区\nVALUE WITHOUT Q,0036-8075,2 区\n',
    jcr:'Journal,ISSN,IF(2025),Category_1,IF Quartile(2025)_1\nVALUE WITHOUT Q,0036-8075,4.7,RELIGION,\n'
  };
  const result=collectJournalUniverse([],datasets,false);
  const id=item(result,'0036-8075')[0];
  const d=diagnostic(result,id);
  assert.equal(d.status.jcr,'source_no_metric');
  assert.equal(d.status.jif,'available');
  assert.equal(d.status.cas,'available');
  assert.equal(d.status.xinrui,'available');
});

test('renamed journal titles merge only through shared valid ISSN',()=>{
  const datasets={
    cas:'Journal,ISSN/EISSN,大类分区\nOLD TITLED JOURNAL,0036-8075,1区\n',
    xinrui:'Journal,ISSN,大类新锐分区\nRENAMED JOURNAL,0036-8075,2区\n',
    jcr:'Journal,ISSN,IF(2025),Category_1,IF Quartile(2025)_1\nRENAMED JOURNAL,0036-8075,5.1,SCIENCE,Q1\n'
  };
  const result=collectJournalUniverse([],datasets,false);
  assert.equal(result.output.entries.length,1);
  const row=item(result,'0036-8075');
  assert.ok(row[7].includes('RENAMED JOURNAL'));
  assert.equal(diagnostic(result,row[0]).matches.xinrui.matchedBy[0],'issn');
  assert.equal(diagnostic(result,row[0]).matches.jcr.matchedBy[0],'issn');
});

test('conflicting identifiers never silently attach a source row to two CCF journals',()=>{
  const datasets={
    cas:'Journal,ISSN/EISSN,大类分区\nCONFLICT ROW,0036-8075/0028-0836,1区\n',
    xinrui:'Journal,ISSN,EISSN,大类新锐分区\nOTHER JOURNAL,1500-0000,,\n',
    jcr:'Journal,ISSN,EISSN,IF(2025)\nOTHER JOURNAL,1500-0000,,\n'
  };
  const result=collectJournalUniverse([
    bare('science','SCIENCE','0036-8075'),bare('nature','NATURE','0028-0836')
  ],datasets,false);
  const separate=result.output.entries.find(x=>x[1]==='CONFLICT ROW');
  assert.ok(separate);
  assert.ok(separate[6].some(m=>m[0]==='c'&&m[1]==='1区'));
  assert.equal(result.output.entries.find(x=>x[0]==='science')[6].length,0);
  assert.equal(result.output.entries.find(x=>x[0]==='nature')[6].length,0);
  assert.equal(diagnostic(result,'science').status.cas,'identity_review');
  assert.equal(diagnostic(result,'nature').status.cas,'identity_review');
  assert.ok(diagnostic(result,separate[0]).issues.includes('multiple_issn_candidates'));
});

test('same normalized Unicode title can be joined without guessing unrelated ISSNs',()=>{
  const data={
    cas:'Journal,ISSN/EISSN,大类分区\nRevue de l’École,0036-8075,1区\n',
    xinrui:'Journal,ISSN,EISSN,大类新锐分区\nRevue de l’Ecole,,,2 区\n',
    jcr:'Journal,ISSN,IF(2025)\nRevue de l’Ecole,0036-8075,2.2\n'
  };
  const result=collectJournalUniverse([],data,false);
  assert.equal(result.output.entries.length,1);
  assert.equal(diagnostic(result,item(result,'0036-8075')[0]).matches.xinrui.matchedBy[0],'title');
});

test('per-journal diagnostics preserve source row numbers and explain absent systems',()=>{
  const result=collectJournalUniverse([bare('missing','MISSING ALL','0039-3847')],sources,false);
  const row=item(result,'0036-8075');
  const d=diagnostic(result,row[0]);
  assert.deepEqual(d.matches.cas.sourceRecordNumbers,[1]);
  assert.deepEqual(d.matches.xinrui.sourceRecordNumbers,[1]);
  assert.deepEqual(d.matches.jcr.sourceRecordNumbers,[1]);
  assert.equal(result.diagnostics.journals.length,result.output.entries.length);
  for(const system of ['cas','xinrui','jcr','jif']){
    const statuses=result.audit.statusCounts[system];
    assert.equal(Object.values(statuses).reduce((a,b)=>a+b,0),result.output.entries.length);
  }
});

test('the same input yields a deterministic index without dropping source records',()=>{
  const x=collectJournalUniverse([],sources,false),y=collectJournalUniverse([],sources,false);
  assert.deepEqual(x.output,y.output);
  assert.deepEqual(x.audit.sourceRowIntegrity,y.audit.sourceRowIntegrity);
  assert.equal(x.audit.sourceStats.cas.resolvedRows+x.audit.sourceStats.cas.unidentifiable,
    x.audit.sourceStats.cas.rows);
});
