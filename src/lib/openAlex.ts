import { useEffect, useState } from 'react';
import type { Journal } from '../types';

/** One on-demand OpenAlex request per opened journal, shared by website and charts. */
export interface OpenAlexYear {year:number;works_count:number}
export interface OpenAlexSource {
  id:string;
  display_name:string;
  issn?:string[]|null;
  issn_l?:string|null;
  alternate_titles?:string[]|null;
  homepage_url?:string|null;
  counts_by_year?:OpenAlexYear[]|null;
  type?:string|null;
}
export type OpenAlexState =
  | {status:'idle'|'loading'; source?:undefined; message?:undefined}
  | {status:'success';source:OpenAlexSource;message?:undefined}
  | {status:'error';source?:undefined;message:string};

const requests=new Map<string,Promise<OpenAlexSource>>();
const normalizeName=(v:string)=>v.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const normalizeIdentifier=(v:string)=>v.toUpperCase().replace(/[^0-9X]/g,'');
const isHttps=(v:string):boolean=>{
  try {
    const url=new URL(v);
    return url.protocol==='https:' && url.hostname!=='' && !url.username && !url.password;
  }catch{return false;}
};
export function homepageFromOpenAlex(source:OpenAlexSource):string|null {
  const url=source.homepage_url?.trim();
  if(!url||!isHttps(url))return null;
  try{
    const host=new URL(url).hostname;
    if(/(^|\.)openalex\.org$|(^|\.)doi\.org$|(^|\.)crossref\.org$/i.test(host))return null;
  }catch{return null;}
  return url;
}
function journalIds(journal:Journal):string[] {
  return [...new Set([journal.issnL,journal.issn,journal.eissn,...(journal.extraIssns||[])]
    .filter((v):v is string=>Boolean(v))
    .map(normalizeIdentifier).filter(v=>/^\d{7}[\dX]$/.test(v)))];
}
function exactTitleMatch(source:OpenAlexSource, journal:Journal):boolean{
  const names=[journal.name,...journal.aliases];
  const titles=[source.display_name,...(source.alternate_titles||[])];
  return titles.some(title=>names.some(name=>normalizeName(title)===normalizeName(name)));
}
function findExactSource(results:OpenAlexSource[],journal:Journal):OpenAlexSource|null {
  const candidates=results.filter(s=>s.id?.startsWith('https://openalex.org/S') && (!s.type||s.type==='journal'));
  const ids=journalIds(journal);
  if(ids.length){
    const matched=candidates.filter(s=>[...(s.issn||[]),s.issn_l||''].some(v=>ids.includes(normalizeIdentifier(v))));
    if(matched.length===1)return matched[0];
    const exact=matched.filter(s=>exactTitleMatch(s,journal));
    // Multiple valid matches without a unique title are ambiguous, not a guess.
    return exact.length===1?exact[0]:null;
  }
  const exact=candidates.filter(s=>exactTitleMatch(s,journal));
  return exact.length===1?exact[0]:null;
}
async function loadSource(journal:Journal):Promise<OpenAlexSource>{
  const params=new URLSearchParams({
    select:'id,display_name,issn,issn_l,alternate_titles,homepage_url,counts_by_year,type',
    per_page:'25'
  });
  const ids=journalIds(journal);
  if(ids.length)params.set('filter','issn:'+ids.map(v=>v.slice(0,4)+'-'+v.slice(4)).join('|'));
  else params.set('search',journal.name);
  const response=await fetch('https://api.openalex.org/sources?'+params.toString(),{
    headers:{Accept:'application/json'}
  });
  if(!response.ok) {
    if(response.status===429)throw Error('OpenAlex 查询次数受限，请稍后重试。');
    throw Error('OpenAlex 暂时不可用（HTTP '+response.status+'）。');
  }
  const data=await response.json() as {results?:OpenAlexSource[]};
  const found=findExactSource(data.results||[],journal);
  if(!found)throw Error('未找到可通过期刊名称或内部标识准确对应的 OpenAlex 来源记录。');
  return found;
}
function lookup(journal:Journal):Promise<OpenAlexSource> {
  const key=journal.id;
  if(!requests.has(key)){
    const request=loadSource(journal).catch(err=>{
      requests.delete(key); // Failed lookups may be retried.
      throw err;
    });
    requests.set(key,request);
  }
  return requests.get(key)!;
}
export function useJournalOpenAlex(journal:Journal,enabled=true):OpenAlexState {
  const [state,setState]=useState<OpenAlexState>({status:enabled?'loading':'idle'});
  useEffect(()=>{
    if(!enabled){setState({status:'idle'});return;}
    let mounted=true;
    setState({status:'loading'});
    lookup(journal).then(source=>{
      if(mounted)setState({status:'success',source});
    }).catch(e=>{
      if(mounted)setState({status:'error',message:e instanceof Error?e.message:'查询失败'});
    });
    return ()=>{mounted=false;};
  },[journal.id,enabled]);
  return state;
}
