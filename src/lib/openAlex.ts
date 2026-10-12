import {useEffect,useState} from 'react';
import type {Journal} from '../types';
import {
  getCachedSource,putCachedSource,getApiCooldown,setApiCooldown,retryAfterMs,utcResetMs
} from './openAlexCache.mjs';

/**
 * A no-backend OpenAlex lookup. Browser requests use:
 *  - 48-hour localStorage cache (up to 100 journals)
 *  - one pending promise per journal, shared by detail and homepage links
 *  - a serialized queue, no more than ~1.25 requests/second per tab
 *  - bounded retries for transient failures, X-RateLimit and Retry-After
 *  - stale-cache fallback during 429, shared cooldown across tabs.
 *
 * Never ship an OpenAlex API key in this public GitHub Pages bundle. OpenAlex
 * keys are sign-in credentials and belong behind a server-side secret.
 */
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
  _cached?:'fresh'|'stale';
  _cachedAt?:number;
}
export type OpenAlexState =
  | {status:'idle'|'loading';source?:undefined;message?:undefined}
  | {status:'success';source:OpenAlexSource;message?:undefined}
  | {status:'error';source?:undefined;message:string};

const requests=new Map<string,Promise<OpenAlexSource>>();
let queue:Promise<void>=Promise.resolve();
let nextRequestAfter=0;
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const normalizeName=(v:string)=>v.normalize('NFKD').replace(/\p{M}/gu,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const normalizeIdentifier=(v:string)=>v.toUpperCase().replace(/[^0-9X]/g,'');
function safeHttps(v:string):boolean{
  try{
    const url=new URL(v);
    return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password;
  }catch{return false;}
}
export function homepageFromOpenAlex(source:OpenAlexSource):string|null{
  const url=source.homepage_url?.trim();
  if(!url||!safeHttps(url))return null;
  try{
    const host=new URL(url).hostname;
    if(/(^|\.)openalex\.org$|(^|\.)doi\.org$|(^|\.)crossref\.org$/i.test(host))return null;
  }catch{return null;}
  return url;
}
function journalIds(journal:Journal):string[]{
  return [...new Set([journal.issnL,journal.issn,journal.eissn,...(journal.extraIssns||[])]
    .filter((x):x is string=>Boolean(x))
    .map(normalizeIdentifier).filter(x=>/^\d{7}[\dX]$/.test(x)))].slice(0,20);
}
function exactTitleMatch(source:OpenAlexSource,journal:Journal):boolean{
  const names=[journal.name,...journal.aliases];
  const titles=[source.display_name,...(source.alternate_titles||[])];
  return titles.some(title=>names.some(name=>normalizeName(title)===normalizeName(name)));
}
function findExactSource(results:OpenAlexSource[],journal:Journal):OpenAlexSource|null{
  const candidates=results.filter(s=>/^https:\/\/openalex\.org\/S\d+$/.test(s.id||'')&&
    (!s.type||s.type==='journal'));
  const ids=journalIds(journal);
  if(ids.length){
    const matched=candidates.filter(s=>[...(s.issn||[]),s.issn_l||'']
      .some(value=>ids.includes(normalizeIdentifier(value))));
    if(matched.length===1)return matched[0];
    const exact=matched.filter(s=>exactTitleMatch(s,journal));
    return exact.length===1?exact[0]:null;
  }
  const matched=candidates.filter(s=>exactTitleMatch(s,journal));
  return matched.length===1?matched[0]:null;
}
function scheduled<T>(work:()=>Promise<T>):Promise<T>{
  const upcoming=queue.then(async()=>{
    const wait=Math.max(0,nextRequestAfter-Date.now());
    if(wait>0)await delay(wait);
    nextRequestAfter=Date.now()+850;
    return work();
  });
  queue=upcoming.then(()=>{},()=>{});
  return upcoming;
}
async function fetchTimed(url:string):Promise<Response>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{return await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});}
  finally{clearTimeout(timeout);}
}
function quotaMessage(waitMs:number):string{
  if(waitMs>=60*60*1000)return 'OpenAlex 今日匿名查询额度可能已用完。已暂停重复请求，预计重置后恢复；以前查询过的期刊将使用本地缓存。';
  return 'OpenAlex 暂时限制查询。已为当前浏览器启用冷却机制，稍后重新打开期刊即可重试。';
}
async function fetchWithLimitAwareness(url:string):Promise<Response>{
  const now=Date.now();
  const remainingCooldown=getApiCooldown(now);
  if(remainingCooldown>0)throw Error(quotaMessage(remainingCooldown));
  for(let attempt=0;attempt<2;attempt++){
    let response:Response;
    try{response=await fetchTimed(url);}
    catch(error){
      if(attempt===0){await delay(1200);continue;}
      throw Error(error instanceof Error && error.name==='AbortError'
        ?'OpenAlex 查询超时，请检查网络后稍后再试。'
        :'无法连接 OpenAlex，请检查当前网络是否允许访问 api.openalex.org。');
    }
    if(response.ok)return response;
    if(response.status===429){
      const remaining=response.headers.get('X-RateLimit-Remaining');
      const resetHeader=Number(response.headers.get('X-RateLimit-Reset'));
      const retry=retryAfterMs(response.headers.get('Retry-After'),Date.now());
      const budgetExhausted=remaining==='0';
      const reset=Number.isFinite(resetHeader)&&resetHeader>0?Math.min(resetHeader*1000,26*60*60*1000):utcResetMs();
      if(budgetExhausted){
        setApiCooldown(Date.now()+Math.max(retry,reset));
        throw Error(quotaMessage(Math.max(retry,reset)));
      }
      if(attempt===0&&retry<=5000){
        await delay(Math.max(1700,retry));
        continue;
      }
      const wait=Math.max(90_000,retry);
      setApiCooldown(Date.now()+wait);
      throw Error(quotaMessage(wait));
    }
    if(response.status>=500&&attempt===0){await delay(1500);continue;}
    if(response.status===400)throw Error('OpenAlex 拒绝了请求参数，查询暂不可用。');
    throw Error('OpenAlex 暂时不可用（HTTP '+response.status+'）。');
  }
  throw Error('OpenAlex 查询暂时失败。');
}
async function fetchSource(journal:Journal):Promise<OpenAlexSource>{
  const params=new URLSearchParams({
    select:'id,display_name,issn,issn_l,alternate_titles,homepage_url,counts_by_year,type',
    per_page:'25'
  });
  const ids=journalIds(journal);
  if(ids.length)params.set('filter','issn:'+ids.map(x=>x.slice(0,4)+'-'+x.slice(4)).join('|'));
  else params.set('search',journal.name);
  const response=await fetchWithLimitAwareness('https://api.openalex.org/sources?'+params.toString());
  const data=await response.json() as {results?:OpenAlexSource[]};
  const source=findExactSource(data.results||[],journal);
  if(!source)throw Error('没有找到可通过期刊名称或内部标识准确匹配的 OpenAlex 来源记录。');
  return source;
}
function lookup(journal:Journal):Promise<OpenAlexSource>{
  const key=journal.id;
  const cached=getCachedSource(key);
  if(cached)return Promise.resolve({...cached.source,_cached:'fresh',_cachedAt:cached.fetchedAt} as OpenAlexSource);
  if(!requests.has(key)){
    const request=scheduled(async()=>{
      const old=getCachedSource(key,Date.now(),undefined,true);
      try{
        const source=await fetchSource(journal);
        putCachedSource(key,source);
        return source;
      }catch(error){
        if(old)return {...old.source,_cached:'stale',_cachedAt:old.fetchedAt} as OpenAlexSource;
        throw error;
      }
    }).catch(error=>{
      requests.delete(key); // failures can be retried after cooldown
      throw error;
    });
    requests.set(key,request);
  }
  return requests.get(key)!;
}
export function useJournalOpenAlex(journal:Journal,enabled=true):OpenAlexState{
  const [state,setState]=useState<OpenAlexState>({status:enabled?'loading':'idle'});
  useEffect(()=>{
    if(!enabled){setState({status:'idle'});return;}
    let alive=true;
    setState({status:'loading'});
    lookup(journal).then(source=>{
      if(alive)setState({status:'success',source});
    }).catch(error=>{
      if(alive)setState({status:'error',message:error instanceof Error?error.message:'查询失败'});
    });
    return ()=>{alive=false;};
  },[journal.id,enabled]);
  return state;
}
