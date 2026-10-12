/**
 * Persistent browser cache for OpenAlex source profiles.
 * No API key is stored here: keys must never be embedded in GitHub Pages.
 */
export const OPENALEX_CACHE_KEY='elysiatools-openalex-source-v1';
export const CACHE_MAX=100;
export const CACHE_TTL_MS=2*24*60*60*1000;
export const STALE_TTL_MS=90*24*60*60*1000;

function getStorage(given){
  if(given)return given;
  try{return typeof localStorage==='undefined'?null:localStorage;}
  catch{return null;}
}
function empty(){return {version:1,items:{},cooldownUntil:0};}
function load(given){
  const storage=getStorage(given);
  if(!storage)return empty();
  try{
    const raw=JSON.parse(storage.getItem(OPENALEX_CACHE_KEY)||'null');
    if(raw?.version!==1||!raw.items||typeof raw.items!=='object')return empty();
    return raw;
  }catch{return empty();}
}
function save(value,given){
  const storage=getStorage(given);
  if(!storage)return;
  try{storage.setItem(OPENALEX_CACHE_KEY,JSON.stringify(value));}
  catch{
    // A locked/full browser storage should never break journal navigation.
    try{
      const keys=Object.keys(value.items).sort((a,b)=>
        value.items[b].fetchedAt-value.items[a].fetchedAt);
      value.items=Object.fromEntries(keys.slice(0,Math.floor(CACHE_MAX/2))
        .map(key=>[key,value.items[key]]));
      storage.setItem(OPENALEX_CACHE_KEY,JSON.stringify(value));
    }catch{/* storage disabled */}
  }
}
export function getCachedSource(key,now=Date.now(),given,includeStale=false){
  const record=load(given).items[key];
  if(!record||!record.source||typeof record.fetchedAt!=='number')return null;
  const age=Math.max(0,now-record.fetchedAt);
  if(age>(includeStale?STALE_TTL_MS:CACHE_TTL_MS))return null;
  if(!/^https:\/\/openalex\.org\/S\d+$/.test(String(record.source.id||'')))return null;
  return {source:record.source,fetchedAt:record.fetchedAt,stale:age>CACHE_TTL_MS};
}
export function putCachedSource(key,source,now=Date.now(),given){
  if(!source||!/^https:\/\/openalex\.org\/S\d+$/.test(String(source.id||'')))return;
  const state=load(given);
  state.items[key]={source,fetchedAt:now};
  const keys=Object.keys(state.items).sort((a,b)=>
    state.items[b].fetchedAt-state.items[a].fetchedAt);
  for(const old of keys.slice(CACHE_MAX))delete state.items[old];
  save(state,given);
}
export function getApiCooldown(now=Date.now(),given){
  return Math.max(0,Number(load(given).cooldownUntil||0)-now);
}
export function setApiCooldown(until,now=Date.now(),given){
  const state=load(given);
  state.cooldownUntil=Math.max(state.cooldownUntil||0,Math.min(until,now+26*60*60*1000));
  save(state,given);
}
export function retryAfterMs(value,now=Date.now()){
  if(!value)return 0;
  const numeric=Number(value);
  if(Number.isFinite(numeric)&&numeric>=0)return Math.min(numeric*1000,26*60*60*1000);
  const date=Date.parse(value);
  return Number.isFinite(date)?Math.max(0,Math.min(date-now,26*60*60*1000)):0;
}
export function utcResetMs(now=Date.now()){
  const date=new Date(now);
  return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+1)-now;
}
