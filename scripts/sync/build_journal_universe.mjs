#!/usr/bin/env node
// Compile pinned annual journal datasets into a compact, browser-searchable index.
// Publication rights are asserted by the site operator, not by the ShowJCR GPL license.
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvRows, parseMetricFile, normalizeJournal } from '../../src/lib/metricCsv.mjs';

export const REVISION = '4687a8f608f20aaf004299992f5d347dba009361';
const SPECS = {
  cas: { file:'FQBJCR2025-UTF8.csv', sha:'5918c4ee712878e2b6bc2e5d50f7a87b3c67a719', source:'showjcr-cas2025' },
  xinrui: { file:'XR2026-UTF8.csv', sha:'805202d8a8bf3a6364708b8a4fd4b3c0b5fa9d7e', source:'showjcr-xinrui2026' },
  jcr: { file:'JCR2025-UTF8.csv', sha:'d3a825960d1fb36e5a05827bdf0ae6e41da4ccd4', source:'showjcr-jcr2025' }
};
const CODES = { cas:'c', xinrui:'x', jcr:'q', jif:'f' };
function validIssn(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^0-9X]/g,'');
  if (!/^[0-9]{7}[0-9X]$/.test(s)) return '';
  let n=0;
  for(let i=0;i<8;i++) n+=(s[i]==='X'?10:Number(s[i]))*(8-i);
  return n%11===0?s.slice(0,4)+'-'+s.slice(4):'';
}
function issns(row) {
  const raw=[row['ISSN/EISSN'],row.ISSN,row.EISSN,row.eISSN,row['ISSN-L']].filter(Boolean).join(' ');
  return [...new Set((raw.match(/[0-9]{4}-?[0-9]{3}[0-9X]/gi)||[]).map(validIssn).filter(Boolean))];
}
const hash = s=>createHash('sha256').update(s).digest('hex').slice(0,18);
const name = r=>String(r.Journal||r['期刊名称']||r.Title||'').trim();
const copy = j=>({...j,indicators:[...(j.indicators||[])],aliases:[...(j.aliases||[])]});

export function collectJournalUniverse(baseline, texts, strict=true) {
  const all=new Map(baseline.map(j=>[j.id,copy(j)]));
  const byIssn=new Map(),byName=new Map();
  const stats={scanned:{},matched:{},ambiguous:0,newJournals:0};
  function put(map,k,id) {if(!k)return; if(!map.has(k))map.set(k,new Set());map.get(k).add(id);}
  function register(j,alias='') {
    for(const x of [j.issn,j.eissn,j.issnL])put(byIssn,validIssn(x),j.id);
    for(const x of [j.name,...j.aliases,alias])put(byName,normalizeJournal(x),j.id);
  }
  for(const j of all.values())register(j);
  for(const [kind,text] of Object.entries(texts)) {
    const rows=parseCsvRows(text);
    stats.scanned[kind]=rows.length;
    if(strict&&rows.length<20000)throw Error(kind+': incomplete CSV '+rows.length);
    for(const row of rows) {
      const title=name(row), key=normalizeJournal(title);
      if(!key)continue;
      const ids=issns(row);
      const matchedByIssn=new Set(ids.flatMap(s=>[...(byIssn.get(s)||[])]));
      if(matchedByIssn.size>1){stats.ambiguous++;continue;}
      let j=matchedByIssn.size===1?all.get([...matchedByIssn][0]):null;
      if(!j) {
        const candidates=[...(byName.get(key)||[])].map(id=>all.get(id));
        const viable=candidates.filter(c=>{
          const known=[c.issn,c.eissn,c.issnL].map(validIssn).filter(Boolean);
          return !ids.length||!known.length||ids.some(s=>known.includes(s));
        });
        if(viable.length>1){stats.ambiguous++;continue;}
        j=viable[0];
      }
      if(!j) {
        const id='journal-'+hash(key+'|'+(ids[0]||''));
        j={id,acronym:title,name:title,aliases:[],field:'Other',fieldZh:'其他 / 待分类',
          publisher:null,ccf:null,ccfYear:null,issn:ids[0]||null,eissn:ids[1]||null,
          issnL:null,oa:'unknown',website:null,indexUrl:null,sourceId:SPECS[kind].source,
          identifierSource:null,indicators:[]};
        if(all.has(id)&&all.get(id).name!==title)throw Error('Journal key collision: '+id);
        all.set(id,j);stats.newJournals++;
      }
      if(normalizeJournal(j.name)!==key&&!j.aliases.includes(title))j.aliases.push(title);
      if(!j.issn&&ids[0])j.issn=ids[0];
      if(!j.eissn&&ids[1]&&ids[1]!==j.issn)j.eissn=ids[1];
      const pub=String(row.Publisher||row['出版社']||'').trim();
      if(!j.publisher&&pub)j.publisher=pub;
      if(!j.ccf&&j.field==='Other') {
        const cat=String(row['大类中文名']||row['大类']||row['大类名称']||'').trim();
        if(cat&&cat.length<60) {j.field=cat;j.fieldZh=cat;}
      }
      register(j,title);
    }
  }
  const complete=[...all.values()];
  for(const [kind,text] of Object.entries(texts)) {
    const parsed=parseMetricFile(text,SPECS[kind].file,complete);
    stats.matched[kind]=parsed.stats;
    if(strict&&parsed.stats.matched<stats.scanned[kind]*.8)
      throw Error(kind+': poor matching '+parsed.stats.matched+'/'+stats.scanned[kind]);
    for(const [id,metrics] of Object.entries(parsed.records)) {
      const j=all.get(id);
      if(!j)continue;
      for(const original of metrics) {
        const m={system:original.system,value:original.value,year:original.year,
          category:original.category||'',sourceId:SPECS[kind].source,license:'operator-authorized'};
        const idx=j.indicators.findIndex(x=>x.system===m.system&&x.year===m.year&&(x.category||'')===m.category);
        if(idx>=0)j.indicators[idx]=m;else j.indicators.push(m);
      }
    }
  }
  const entries=[];
  const recognized=new Set(Object.values(SPECS).map(s=>s.source));
  for(const j of all.values()) {
    const licensed=j.indicators.filter(m=>recognized.has(m.sourceId));
    if(!licensed.length)continue;
    const packed=licensed.map(m=>[CODES[m.system],m.value,m.category||'']);
    entries.push([j.id,j.name,j.issn||'',j.eissn||'',
      j.ccf?'':j.fieldZh,j.ccf?'':j.publisher||'',packed,j.aliases.filter(a=>a!==j.name).slice(0,5)]);
  }
  entries.sort((a,b)=>a[1].localeCompare(b[1],'en'));
  const counts=Object.fromEntries(Object.entries(CODES).map(([kind,code])=>
    [kind,entries.filter(e=>e[6].some(v=>v[0]===code)).length]));
  if(strict&&(entries.length<19000||Object.values(counts).some(n=>n<5000)))
    throw Error('Incomplete coverage: '+JSON.stringify({entries:entries.length,counts}));
  return {output:{version:1,sourceRevision:REVISION,entries},
    audit:{sourceRevision:REVISION,indexed:all.size,entries:entries.length,
      existing:baseline.length,coverage:counts,...stats}};
}
function main() {
  const input=resolve(process.argv[2]||'.cache/journal-metrics');
  const output=resolve(process.argv[3]||'public/data/journal-universe.json');
  const texts={};
  for(const [kind,spec] of Object.entries(SPECS)) {
    const bytes=readFileSync(join(input,spec.file));
    const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    if(digest!==spec.sha)throw Error(spec.file+': source checksum mismatch '+digest);
    texts[kind]=bytes.toString('utf8');
  }
  const baseline=JSON.parse(readFileSync(new URL('../../data/journals.json',import.meta.url),'utf8'));
  const {output:catalog,audit}=collectJournalUniverse(baseline,texts,true);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(catalog),'utf8');
  writeFileSync(join(dirname(output),'journal-coverage.json'),JSON.stringify(audit,null,2)+'\n','utf8');
  console.log('Journal catalogue generated:',JSON.stringify({indexed:audit.indexed,entries:audit.entries,
    coverage:audit.coverage,bytes:readFileSync(output).length}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
