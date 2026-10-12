import test from 'node:test';
import assert from 'node:assert/strict';
import {journalTierOptions,matchesJournalRankFilters} from '../src/lib/journalFilters.mjs';
const rated={
  indicators:[
    {system:'cas',value:'1区',category:'工程技术'},
    {system:'cas',value:'2区',category:'小类:ROBOTICS'},
    {system:'xinrui',value:'3区',category:'医学'},
    {system:'xinrui',value:'1区',category:'第二大类:工程技术'},
    {system:'jcr',value:'Q2',category:'ROBOTICS'},
    {system:'jif',value:'6.1'}
  ],
  diagnostic:{status:{cas:'available',xinrui:'available',jcr:'available',jif:'available'},issues:[]}
};
const unrated={
  indicators:[],
  diagnostic:{status:{cas:'not_in_source',xinrui:'source_no_metric',jcr:'not_in_source',jif:'not_in_source'},issues:['title_issn_conflict']}
};
test('independent grade dropdown has 12 categorized options without first choosing a rating system',()=>{
  const options=journalTierOptions();
  assert.equal(options.length,12);
  for(const code of ['cas|1区','xinrui|1区','jcr|Q1'])
    assert.ok(options.some(x=>x.value===code));
  assert.deepEqual(journalTierOptions('jif'),[]);
});
test('rank filtering does not confuse JCR quartiles with CAS/XinRui major and subcategories',()=>{
  assert.equal(matchesJournalRankFilters(rated,'','','cas|1区'),true);
  assert.equal(matchesJournalRankFilters(rated,'','','xinrui|1区'),false);
  assert.equal(matchesJournalRankFilters(rated,'','','jcr|Q2'),true);
  assert.equal(matchesJournalRankFilters(rated,'','','cas|2区'),false);
  assert.equal(matchesJournalRankFilters(rated,'cas','','jcr|Q2'),false);
  assert.equal(matchesJournalRankFilters(rated,'jcr','','jcr|Q2'),true);
});
test('data status can be selected without choosing a rating system first',()=>{
  assert.equal(matchesJournalRankFilters(unrated,'','source_no_metric'),true);
  assert.equal(matchesJournalRankFilters(unrated,'cas','source_no_metric'),false);
  assert.equal(matchesJournalRankFilters(unrated,'xinrui','source_no_metric'),true);
  assert.equal(matchesJournalRankFilters(unrated,'','not_in_source'),true);
  assert.equal(matchesJournalRankFilters(unrated,'','issues'),true);
  assert.equal(matchesJournalRankFilters(unrated,'','available'),false);
  assert.equal(matchesJournalRankFilters(rated,'','available'),true);
  assert.equal(matchesJournalRankFilters(rated,'jif','available'),true);
  assert.equal(matchesJournalRankFilters(unrated,'cas','all'),true);
});
test('default filters preserve the complete journal list, while chosen evaluation requires metrics',()=>{
  assert.equal(matchesJournalRankFilters(unrated),true);
  assert.equal(matchesJournalRankFilters(rated),true);
  assert.equal(matchesJournalRankFilters(unrated,'cas'),false);
  assert.equal(matchesJournalRankFilters(rated,'cas'),true);
});
