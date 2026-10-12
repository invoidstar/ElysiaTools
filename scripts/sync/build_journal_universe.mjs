#!/usr/bin/env node
/**
 * Deterministic, loss-aware build of the ElysiaTools annual journal universe.
 *
 * Identity resolution and metric extraction are intentionally separate:
 * every source CSV row receives a resolved journal ID BEFORE its indicators
 * are extracted. A second global name/ISSN matching pass is not allowed.
 *
 * Ambiguous joins remain independent, searchable records with explicit
 * source-level review diagnostics. No journal is discarded for missing ratings.
 */
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvRows, normalizeJournal, extractAnnualMetrics } from '../../src/lib/metricCsv.mjs';

export const REVISION='4687a8f608f20aaf004299992f5d347dba009361';
const SPECS={
  cas:{file:'FQBJCR2025-UTF8.csv',sha:'5918c4ee712878e2b6bc2e5d50f7a87b3c67a719',source:'showjcr-cas2025'},
  xinrui:{file:'XR2026-UTF8.csv',sha:'805202d8a8bf3a6364708b8a4fd4b3c0b5fa9d7e',source:'showjcr-xinrui2026'},
  jcr:{file:'JCR2025-UTF8.csv',sha:'d3a825960d1fb36e5a05827bdf0ae6e41da4ccd4',source:'showjcr-jcr2025'}
};
const FILES=['cas','xinrui','jcr'];
const METRICS=['cas','xinrui','jcr','jif'];
const CODES={cas:'c',xinrui:'x',jcr:'q',jif:'f'};
const STATUS={available:'P',source_no_metric:'L',not_in_source:'N',identity_review:'R'};
const METHOD={issn:'i',title:'t',new:'n',review:'r'};
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,18);
const text=value=>String(value==null?'':value).normalize('NFKC').trim();
const getName=row=>text(row.Journal||row['刊名']||row['期刊名称']||row.Title);
const gitBlobSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');

function canonicalISSN(input) {
  const value=text(input).toUpperCase().replace(/[^0-9X]/g,'');
  if(!/^[0-9]{7}[0-9X]$/.test(value))return '';
  let sum=0;
  for(let i=0;i<8;i++)sum+=(value[i]==='X'?10:Number(value[i]))*(8-i);
  return sum%11===0?value.slice(0,4)+'-'+value.slice(4):'';
}
function sourceISSNs(row) {
  const raw=[row['ISSN/EISSN'],row.ISSN,row.EISSN,row.eISSN,row['ISSN-L']]
    .filter(Boolean).join(' ');
  const tokens=raw.match(/[0-9]{4}-?[0-9]{3}[0-9X]/gi)||[];
  const valid=[...new Set(tokens.map(canonicalISSN).filter(Boolean))];
  // A bad checksum is not an ISSN match. It remains reviewable evidence.
  return {valid,invalid:tokens.some(value=>!canonicalISSN(value))};
}
function sourceAliases(row) {
  return [row['刊名'],row['中文刊名']].map(text).filter(Boolean);
}
function freshDetails() {
  return {
    sourceRows:{cas:[],xinrui:[],jcr:[]},
    methods:{cas:new Set(),xinrui:new Set(),jcr:new Set()},
    issues:new Set(),
    reviewSources:new Set()
  };
}

/**
 * The return shape deliberately includes an entire searchable catalogue,
 * per-journal status records, and source-row counts (including unresolved
 * conflicts). The caller may enable strict size/coverage checks for CI.
 */
export function collectJournalUniverse(baseline,texts,strict=true) {
  const all=new Map(baseline.map(j=>[j.id,{
    ...j,aliases:[...(j.aliases||[])],indicators:[...(j.indicators||[])]
  }]));
  const details=new Map();
  const issnSets=new Map();
  const byISSN=new Map(),byName=new Map();
  const journalOrigin=new Map();
  const diagnosticsByRow={cas:[],xinrui:[],jcr:[]};
  const sourceRows={};
  const sourceStats={};
  const anomalies=[];
  const addToIndex=(map,key,id)=>{
    if(!key)return;
    if(!map.has(key))map.set(key,new Set());
    map.get(key).add(id);
  };
  const getDetails=id=>{
    if(!details.has(id))details.set(id,freshDetails());
    return details.get(id);
  };
  function addIdentifier(id,raw){
    const value=canonicalISSN(raw);
    if(!value)return;
    if(!issnSets.has(id))issnSets.set(id,new Set());
    issnSets.get(id).add(value);
    addToIndex(byISSN,value,id);
  }
  function addAlias(id,alias){
    const key=normalizeJournal(alias);
    if(!key)return;
    addToIndex(byName,key,id);
  }
  function indexExisting(j){
    for(const value of [j.issn,j.eissn,j.issnL,...(j.extraIssns||[])])addIdentifier(j.id,value);
    for(const alias of [j.name,...(j.aliases||[])])addAlias(j.id,alias);
  }
  for(const journal of all.values()){
    indexExisting(journal);
    getDetails(journal.id);
    journalOrigin.set(journal.id,journal.sourceId);
  }
  function markReview(ids,kind,code){
    for(const id of ids){
      const d=getDetails(id);
      d.issues.add(code);
      d.reviewSources.add(kind);
    }
  }
  function createJournal(name,ids,kind,recordIndex,reviewReasons=[]){
    const normalized=normalizeJournal(name);
    const key=normalized+'|'+(ids[0]||'');
    let id='journal-'+hash(key);
    if(all.has(id))id='journal-'+hash(key+'|'+kind+'|'+recordIndex);
    const journal={
      id,acronym:name,name,aliases:[],field:'Other',fieldZh:'其他 / 待分类',
      publisher:null,ccf:null,ccfYear:null,issn:ids[0]||null,
      eissn:ids.find(s=>s!==ids[0])||null,issnL:null,
      oa:'unknown',website:null,indexUrl:null,identifierSource:null,
      sourceId:SPECS[kind].source,indicators:[]
    };
    all.set(id,journal);
    journalOrigin.set(id,SPECS[kind].source);
    const d=getDetails(id);
    for(const reason of reviewReasons)d.issues.add(reason);
    // REVIEW entries cannot contaminate the strong/weak indices; further
    // sources must independently resolve rather than be forced to this row.
    if(!reviewReasons.length)indexExisting(journal);
    else if(!reviewReasons.includes('multiple_issn_candidates')){
      // A conflicting *title* is not a conflicting ISSN. Keep the safe new
      // identifier anchor, so later source rows attach to this same record.
      // Never index the ambiguous name or identifiers claimed by two journals.
      for(const identifier of ids)addIdentifier(id,identifier);
    }
    sourceStats[kind].created++;
    return journal;
  }
  for(const kind of FILES){
    const rows=parseCsvRows(texts[kind]);
    sourceRows[kind]=rows;
    sourceStats[kind]={
      file:SPECS[kind].file,rows:rows.length,issn:0,title:0,created:0,
      review:0,unidentifiable:0,invalidISSNRows:0,withMetrics:0,
      resolvedRows:0,sourceWithoutMetrics:0,duplicateRows:0,
      metricsBySystem:{},unidentifiableSamples:[]
    };
    if(strict&&rows.length<20000)throw Error(kind+': incomplete source ('+rows.length+' rows)');
    const seenRowKeys=new Set();
    rows.forEach((row,index)=>{
      const {valid:ids,invalid}=sourceISSNs(row);
      const title=getName(row)||(ids[0]?'ISSN '+ids[0]:'');
      const nameKey=normalizeJournal(title);
      const stats=sourceStats[kind];
      if(invalid)stats.invalidISSNRows++;
      if(!nameKey){
        stats.unidentifiable++;
        if(stats.unidentifiableSamples.length<20)stats.unidentifiableSamples.push(index+1);
        diagnosticsByRow[kind].push(null);
        return;
      }
      const rowKey=nameKey+'|'+ids.join('/');
      if(seenRowKeys.has(rowKey))stats.duplicateRows++;
      seenRowKeys.add(rowKey);

      const candidatesByIdentifier=new Set(ids.flatMap(value=>[...(byISSN.get(value)||[])]));
      const names=[...(byName.get(nameKey)||[])];
      let resolved=null,method='',reviewReasons=[];
      if(candidatesByIdentifier.size===1){
        const id=[...candidatesByIdentifier][0];
        resolved=all.get(id);
        method='issn';
        // Same title may refer to different ISSNs; the ISSN join wins,
        // but candidate aliases need to remain reviewable.
        const otherNames=names.filter(nameId=>nameId!==id);
        if(otherNames.length){
          markReview(otherNames,kind,'alias_collision');
          getDetails(id).issues.add('alias_collision');
        }
      }else if(candidatesByIdentifier.size>1){
        method='review';
        reviewReasons.push('multiple_issn_candidates');
        markReview(candidatesByIdentifier,kind,'multiple_issn_candidates');
      }else if(names.length===1){
        const id=names[0];
        const known=issnSets.get(id)||new Set();
        const overlapping=ids.some(value=>known.has(value));
        if(ids.length&&known.size&&!overlapping){
          method='review';
          reviewReasons.push('title_issn_conflict');
          markReview(names,kind,'title_issn_conflict');
        }else{
          resolved=all.get(id);
          method='title';
        }
      }else if(names.length>1){
        method='review';
        reviewReasons.push('ambiguous_title');
        markReview(names,kind,'ambiguous_title');
      }
      if(!resolved){
        if(!method)method='new';
        resolved=createJournal(title,ids,kind,index+1,reviewReasons);
        if(method==='review')stats.review++;
      }else{
        stats[method]++;
      }
      const d=getDetails(resolved.id);
      const rowNumber=index+1; // 1-based data-record index (not CSV text line)
      d.sourceRows[kind].push(rowNumber);
      d.methods[kind].add(method);
      if(invalid)d.issues.add('invalid_identifier');
      if(title.startsWith('ISSN '))d.issues.add('missing_title');
      // An ISSN matched to a different title is plausible (renamed journal),
      // but only trusted identifiers may be attached automatically.
      const known=issnSets.get(resolved.id)||new Set();
      const hasDifferentIds=ids.length&&known.size&&ids.every(id=>!known.has(id));
      if(hasDifferentIds&&method==='issn')d.issues.add('alias_collision');
      if(method!=='review'){
        for(const id of ids)addIdentifier(resolved.id,id);
        addAlias(resolved.id,title);
        if(normalizeJournal(resolved.name)!==nameKey &&
           !resolved.aliases.includes(title))resolved.aliases.push(title);
        for(const alias of sourceAliases(row)){
          if(normalizeJournal(alias)!==normalizeJournal(resolved.name)&&
             !resolved.aliases.includes(alias))resolved.aliases.push(alias);
          addAlias(resolved.id,alias);
        }
        if(!resolved.issn&&ids[0])resolved.issn=ids[0];
        if(!resolved.eissn){
          const next=ids.find(s=>s!==resolved.issn);
          if(next)resolved.eissn=next;
        }
      }
      const publisher=text(row['出版机构']||row.Publisher||row['出版社']);
      if(publisher&&!resolved.publisher)resolved.publisher=publisher;
      if(!resolved.ccf && resolved.field==='Other'){
        const field=text(row['大类中文名']||row['大类']||row['大类名称']);
        if(field&&field.length<=65){
          resolved.field=field;
          resolved.fieldZh=field;
        }
      }
      stats.resolvedRows++;
      diagnosticsByRow[kind].push(resolved.id);
    });
  }

  // Transfer each row's metrics DIRECTLY to the pre-resolved identity.
  // There is no lossy second pass over global names, which previously
  // overwrote ambiguous ISSNs and discarded otherwise valid entries.
  for(const kind of FILES){
    sourceRows[kind].forEach((row,index)=>{
      const id=diagnosticsByRow[kind][index];
      if(!id)return;
      const journal=all.get(id),d=getDetails(id);
      const indicators=extractAnnualMetrics(row,kind);
      const stats=sourceStats[kind];
      if(indicators.length)stats.withMetrics++;
      else stats.sourceWithoutMetrics++;
      for(const entry of indicators){
        stats.metricsBySystem[entry.system]=(stats.metricsBySystem[entry.system]||0)+1;
        const metric={
          ...entry,sourceId:SPECS[kind].source,license:'operator-authorized'
        };
        const existing=journal.indicators.find(m=>
          m.system===metric.system&&m.year===metric.year&&
          (m.category||'')===(metric.category||''));
        if(existing){
          if(existing.value!==metric.value){
            d.issues.add('metric_conflict');
            if(anomalies.length<50)anomalies.push({
              journalId:id,source:kind,record:index+1,
              category:metric.category,existing:existing.value,incoming:metric.value
            });
          }
          // Keep the same per-record category's first documented value.
        }else journal.indicators.push(metric);
      }
    });
  }

  const entries=[],diagnosticEntries=[];
  const licensed=new Set(Object.values(SPECS).map(s=>s.source));
  const statusCounts=Object.fromEntries(METRICS.map(system=>[
    system,{available:0,source_no_metric:0,not_in_source:0,identity_review:0}
  ]));
  const coverage={cas:0,xinrui:0,jcr:0,jif:0};
  let withAnnualMetrics=0,withAnyRatings=0,reviewed=0;
  const problemCounts={};
  for(const journal of all.values()){
    const d=getDetails(journal.id);
    const annual=journal.indicators.filter(m=>licensed.has(m.sourceId));
    if(annual.length)withAnnualMetrics++;
    if(journal.indicators.length)withAnyRatings++;
    const validExtra=[...(issnSets.get(journal.id)||new Set())].filter(
      value=>![journal.issn,journal.eissn,journal.issnL].includes(value)
    ).sort();
    const statuses={},statusCode=[];
    for(const system of METRICS){
      const kind=system==='jif'?'jcr':system;
      const present=annual.some(m=>m.system===system);
      const matched=d.sourceRows[kind].length>0;
      const status=present?'available':
        matched?'source_no_metric':
        d.reviewSources.has(kind)?'identity_review':'not_in_source';
      statuses[system]=status;
      statusCode.push(STATUS[status]);
      statusCounts[system][status]++;
      if(present)coverage[system]++;
    }
    const issues=[...d.issues].sort();
    if(issues.length)reviewed++;
    for(const code of issues)problemCounts[code]=(problemCounts[code]||0)+1;
    const method=FILES.map(kind=>{
      const types=d.methods[kind];
      for(const name of ['review','issn','title','new'])if(types.has(name))return METHOD[name];
      return '-';
    }).join('');
    const retainedSourceRows=FILES.map(kind=>d.sourceRows[kind]);
    const explicitAliases=[...new Set(journal.aliases||[])]
      .filter(alias=>alias&&alias!==journal.name).slice(0,7);
    entries.push([
      journal.id,journal.name,journal.issn||'',journal.eissn||'',
      journal.ccf?'':journal.fieldZh,
      journal.ccf?'':journal.publisher||'',
      annual.map(m=>[CODES[m.system],m.value,m.category||'']),
      explicitAliases,statusCode.join(''),method,issues,validExtra,
      journalOrigin.get(journal.id)||journal.sourceId,retainedSourceRows
    ]);
    diagnosticEntries.push({
      id:journal.id,name:journal.name,issn:journal.issn||null,
      status:statuses,
      matches:Object.fromEntries(FILES.map(kind=>[
        kind,{
          sourceRecordNumbers:d.sourceRows[kind],
          matchedBy:[...d.methods[kind]].sort()
        }
      ])),
      ...(issues.length?{issues}:{}),
      ...(validExtra.length?{additionalISSNs:validExtra}:{})
    });
  }
  entries.sort((a,b)=>a[1].localeCompare(b[1],'en')||a[0].localeCompare(b[0]));
  diagnosticEntries.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id));
  const sourceRowIntegrity=Object.fromEntries(FILES.map(kind=>[
    kind,{
      total:sourceStats[kind].rows,
      resolved:sourceStats[kind].resolvedRows,
      unidentifiable:sourceStats[kind].unidentifiable
    }
  ]));
  if(FILES.some(k=>sourceStats[k].resolvedRows+sourceStats[k].unidentifiable!==sourceStats[k].rows))
    throw Error('Source record loss during journal matching: '+JSON.stringify(sourceRowIntegrity));
  if(strict && (entries.length<22000||withAnnualMetrics<20000||
      coverage.cas<20000||coverage.xinrui<20000||coverage.jcr<18000||
      coverage.jif<20000))
    throw Error('Unexpected reduction in annual coverage: '+JSON.stringify({
      indexed:entries.length,withAnnualMetrics,coverage
    }));
  if(strict&&baseline.some(j=>!all.has(j.id)))throw Error('Lost a baseline CCF journal');
  const output={version:2,sourceRevision:REVISION,entries};
  const audit={
    sourceRevision:REVISION,
    indexed:entries.length,
    entries:entries.length, // backwards-compatible alias of indexed entries
    withAnnualMetrics,withAnyRatings,withoutAnnualMetrics:entries.length-withAnnualMetrics,
    existing:baseline.length,coverage,statusCounts,sourceRowIntegrity,
    sourceStats,identityIssues:problemCounts,journalsWithIdentityOrMetricIssues:reviewed,
    sampledMetricConflicts:anomalies
  };
  const diagnostics={
    version:2,sourceRevision:REVISION,systems:METRICS,
    meaning:{
      available:'source has a valid annual value for this system',
      source_no_metric:'journal is listed in this source but has no valid value for this system',
      not_in_source:'no source-row identity was confidently matched',
      identity_review:'a related source identity was ambiguous or in conflict; no unsafe merge was made'
    },
    auditSummary:{indexed:audit.indexed,coverage,statusCounts,identityIssues:problemCounts},
    journals:diagnosticEntries
  };
  return {output,audit,diagnostics};
}

function main(){
  const input=resolve(process.argv[2]||'.cache/journal-metrics');
  const outputPath=resolve(process.argv[3]||'public/data/journal-universe.json');
  const texts={};
  for(const [kind,spec] of Object.entries(SPECS)){
    const bytes=readFileSync(join(input,spec.file));
    const digest=gitBlobSha(bytes);
    if(digest!==spec.sha)throw Error(spec.file+': source checksum mismatch '+digest);
    texts[kind]=bytes.toString('utf8');
  }
  const baseline=JSON.parse(readFileSync(new URL('../../data/journals.json',import.meta.url),'utf8'));
  const {output,audit,diagnostics}=collectJournalUniverse(baseline,texts,true);
  const dir=dirname(outputPath);
  mkdirSync(dir,{recursive:true});
  writeFileSync(outputPath,JSON.stringify(output),'utf8');
  writeFileSync(join(dir,'journal-coverage.json'),JSON.stringify(audit,null,2)+'\n','utf8');
  writeFileSync(join(dir,'journal-diagnostics.json'),JSON.stringify(diagnostics),'utf8');
  console.log('Journal catalogue generated:',JSON.stringify({
    indexed:audit.indexed,withAnnualMetrics:audit.withAnnualMetrics,
    withoutAnnualMetrics:audit.withoutAnnualMetrics,coverage:audit.coverage,
    identityIssues:audit.identityIssues,statusCounts:audit.statusCounts,
    sizeBytes:readFileSync(outputPath).length
  }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
