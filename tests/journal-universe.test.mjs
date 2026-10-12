import test from 'node:test';
import assert from 'node:assert/strict';
import {collectJournalUniverse} from '../scripts/sync/build_journal_universe.mjs';

const sources={
  cas:'Journal,ISSN/EISSN,大类,大类分区,小类1,小类1分区\nSAME JOURNAL,0036-8075,工程技术,1区,机器人学,2区\nSAME JOURNAL,0028-0836,医学,2区,医学,3区\n',
  xinrui:'Journal,ISSN/EISSN,大类中文名,大类新锐分区,小类1中文名,小类1新锐分区\nSAME JOURNAL,0036-8075,工程技术,2区,自动化,1区\nSAME JOURNAL,0028-0836,医学,1区,公共卫生,2区\n',
  jcr:'Journal,ISSN/EISSN,IF(2025),Category_1,IF Quartile(2025)_1,Category_2,IF Quartile(2025)_2\nSAME JOURNAL,0036-8075,5.123,ROBOTICS,Q1,COMPUTER SCIENCE,Q2\nSAME JOURNAL,0028-0836,4.8,MEDICINE,Q3,GENERAL,Q2\n'
};
test('identity matching never merges distinct valid ISSNs with identical titles',()=>{
  const {output,audit}=collectJournalUniverse([],sources,false);
  assert.equal(output.entries.length,2);
  assert.equal(audit.indexed,2);
  assert.deepEqual(new Set(output.entries.map(x=>x[2])),new Set(['0036-8075','0028-0836']));
  for(const row of output.entries){
    assert.equal(row[6].filter(i=>i[0]==='c').length,2);
    assert.equal(row[6].filter(i=>i[0]==='x').length,2);
    assert.equal(row[6].filter(i=>i[0]==='q').length,2);
    assert.equal(row[6].filter(i=>i[0]==='f').length,1);
  }
});
test('CCF journal IDs and academic classification are preserved',()=>{
  const base=[{id:'science',name:'SAME JOURNAL',acronym:'SCI',aliases:[],
    field:'Interdisciplinary',fieldZh:'交叉',publisher:'Test Publisher',ccf:'A',ccfYear:2026,
    issn:'0036-8075',eissn:null,issnL:null,oa:'unknown',website:null,indexUrl:null,
    sourceId:'ccf-2026',identifierSource:null,indicators:[]}];
  const {output}=collectJournalUniverse(base,sources,false);
  assert.equal(output.entries.find(x=>x[0]==='science')[4],'');
  assert.equal(output.entries.length,2);
});
