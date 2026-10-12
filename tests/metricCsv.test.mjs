import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsvRows, parseMetricFile, mergeImportedMetrics, extractAnnualMetrics } from '../src/lib/metricCsv.mjs';

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


test('ShowJCR CAS 2025 bracketed rank format is converted to the correct large and small divisions',()=>{
  const csv=[
    'Journal,年份,ISSN/EISSN,Review,大类,大类分区,Top,小类1,小类1分区,小类2,小类2分区',
    '"IEEE Transactions on Robotics",2025,1552-3098/1552-3098,否,计算机科学,"1 [14/750]",是,ROBOTICS,"1 [4/56]",ENGINEERING,"2 [89/200]"'
  ].join('\n');
  const result=parseMetricFile(csv,'FQBJCR2025-UTF8.csv',journals);
  assert.equal(result.stats.matched,1);
  const metrics=result.records.tro.filter(x=>x.system==='cas');
  assert.equal(metrics.length,3);
  assert.equal(metrics.find(m=>m.category==='计算机科学').value,'1区');
  assert.ok(metrics.some(m=>m.category==='小类:ROBOTICS'&&m.value==='1区'));
  assert.ok(metrics.some(m=>m.category==='小类:ENGINEERING'&&m.value==='2区'));
});

test('ShowJCR XinRui 2026 can parse category-dependent divisions without mixing publishers',()=>{
  const csv=[
    'Journal,年份,ISSN,EISSN,大类中文名,大类新锐分区,大类2中文名,大类2新锐分区,小类1中文名,小类1新锐分区',
    '"IEEE Transactions on Robotics",2026,1552-3098,1552-3098,计算机科学,2 区,工程技术,1 区,机器人学,1 区'
  ].join('\n');
  const result=parseMetricFile(csv,'XR2026-UTF8.csv',journals);
  const metrics=result.records.tro.filter(x=>x.system==='xinrui');
  assert.equal(metrics.length,3);
  assert.ok(metrics.some(m=>m.category==='计算机科学'&&m.value==='2区'));
  assert.ok(metrics.some(m=>m.category==='第二大类:工程技术'&&m.value==='1区'));
  assert.ok(metrics.some(m=>m.category==='小类:机器人学'&&m.value==='1区'));
});

test('import refuses duplicate journal names that are ambiguous across different IDs',()=>{
  const duplicate=[...journals,{id:'duplicate',name:'IEEE Transactions on Robotics',aliases:[],issn:null,eissn:null}];
  const result=parseMetricFile('Journal,CAS2025\n"IEEE Transactions on Robotics",2区\n',
    'template.csv',duplicate);
  assert.equal(result.stats.matched,0);
  assert.equal(result.stats.unmatched,1);
});

test('journal identifier crosswalk is sufficiently complete for private syncing',()=>{
  // The public crosswalk contains only bibliographic ISSN and publisher facts.
  const data=JSON.parse(readFileSync(new URL('../data/journals.json',import.meta.url),'utf8'));
  assert.ok(data.filter(j=>j.issn).length>=240);
  assert.ok(data.filter(j=>j.eissn).length>=240);
  assert.equal(data.length,292);
});

test('row-level metric extraction distinguishes listed-but-unranked from an absent record',()=>{
  assert.deepEqual(extractAnnualMetrics({
    'IF(2025)':'4.7','Category_1':'RELIGION','IF Quartile(2025)_1':''
  },'jcr'),[{system:'jif',value:'4.7',year:2025,category:''}]);
  assert.deepEqual(extractAnnualMetrics({'大类分区':''},'cas'),[]);
  assert.deepEqual(extractAnnualMetrics({'大类新锐分区':'4 区'},'xinrui'),
    [{system:'xinrui',value:'4区',year:2026,category:''}]);
});
