import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRows, parseMetricFile, mergeImportedMetrics } from '../src/lib/metricCsv.mjs';

const journals=[
  {id:'tro',name:'IEEE Transactions on Robotics',issn:'1552-3098',eissn:null,issnL:'1552-3098',aliases:['T-RO']},
  {id:'tpami',name:'IEEE Transactions on Pattern Analysis and Machine Intelligence',issn:'0162-8828',eissn:null,issnL:null,aliases:['TPAMI']},
  {id:'tip',name:'IEEE Transactions on Image Processing',issn:null,eissn:null,issnL:null,aliases:['TIP']}
];

test('CSV parser handles BOM, quoted punctuation, CRLF, tabs and escaped quotes',()=>{
  const rows=parseCsvRows('\uFEFFJournal,CAS2025\r\n"IEEE Transactions on Robotics","1区"\r\n"Review ""A"", Journal","2区"\r\n');
  assert.equal(rows.length,2);
  assert.equal(rows[0].Journal,'IEEE Transactions on Robotics');
  assert.equal(rows[1].Journal,'Review "A", Journal');
  assert.equal(parseCsvRows('Journal\tXR2026\nABC\t3区\n')[0].XR2026,'3区');
});
test('generic ElysiaTools template imports all four independent metric systems',()=>{
  const csv='Journal,ISSN,CAS2025,XR2026,JCR2025,JIF2025\n"IEEE Transactions on Robotics","1552-3098","1区","2区","Q1","11.1"';
  const {records,stats}=parseMetricFile(csv,'template.csv',journals);
  assert.equal(stats.matched,1);
  assert.deepEqual(stats.systems,{cas:1,xinrui:1,jcr:1,jif:1});
  assert.equal(records.tro.find(x=>x.system==='cas').year,2025);
  assert.equal(records.tro.find(x=>x.system==='xinrui').year,2026);
  assert.equal(records.tro.find(x=>x.system==='jif').year,2025);
  assert.equal(records.tro.find(x=>x.system==='jcr').year,2026);
});
test('FQBJCR2025-UTF8 shape matches ISSN when journal title differs',()=>{
  const csv='Journal,ISSN/EISSN,大类学科,大类分区\n"OLD JOURNAL NAME","1552-3098/","计算机科学","1区"';
  const r=parseMetricFile(csv,'FQBJCR2025-UTF8.csv',journals);
  assert.equal(r.stats.matched,1);
  assert.equal(r.records.tro[0].category,'计算机科学');
});
test('XR2026-UTF8 shape matches exact title and retains 2026 edition',()=>{
  const csv='Journal,ISSN,EISSN,大类新锐分区\n"IEEE Transactions on Image Processing",,,"3区"\n';
  const r=parseMetricFile(csv,'XR2026-UTF8.csv',journals);
  assert.equal(r.records.tip[0].value,'3区');
  assert.equal(r.records.tip[0].year,2026);
});
test('JCR2025 shape preserves category-specific JCR quartiles and JIF',()=>{
  const csv='Journal,ISSN,EISSN,IF(2025),Category_1,IF Quartile(2025)_1,Category_2,IF Quartile(2025)_2\n"IEEE Transactions on Robotics","1552-3098",,11.3,Robotics,Q1,Engineering,Q2';
  const r=parseMetricFile(csv,'JCR2025-UTF8.csv',journals);
  const records=r.records.tro;
  assert.equal(records.find(x=>x.system==='jif').value,'11.3');
  assert.equal(records.filter(x=>x.system==='jcr').length,2);
  assert.ok(records.some(x=>x.category==='Engineering'&&x.value==='Q2'));
});
test('ambiguous, unmatched and no-metric imports do not fabricate matches',()=>{
  const csv='Journal,CAS2025\n"NOT A REAL JOURNAL","1区"\n"IEEE Transactions on Robotics",""\n';
  const {records,stats}=parseMetricFile(csv,'template.csv',journals);
  assert.equal(stats.matched,0);
  assert.equal(stats.unmatched,1);
  assert.equal(stats.withoutMetrics,1);
  assert.deepEqual(records,{});
});
test('private merge updates only matching system, edition and category',()=>{
  const p={tro:[{system:'cas',year:2025,category:'',value:'3区'}]};
  const n={tro:[{system:'cas',year:2025,category:'',value:'2区'},{system:'xinrui',year:2026,category:'',value:'1区'}]};
  const r=mergeImportedMetrics(p,n);
  assert.equal(r.tro.length,2);
  assert.equal(r.tro.find(x=>x.system==='cas').value,'2区');
});
