import test from 'node:test';
import assert from 'node:assert/strict';
import {CACHE_MAX,CACHE_TTL_MS,STALE_TTL_MS,getCachedSource,putCachedSource,
  getApiCooldown,setApiCooldown,retryAfterMs,utcResetMs,getMissingSource,putMissingSource} from '../src/lib/openAlexCache.mjs';

function storage(){
  const records=new Map();
  return {getItem:key=>records.get(key)||null,setItem:(key,value)=>{records.set(key,value);}};
}
const source={id:'https://openalex.org/S12345',display_name:'Test Journal',counts_by_year:[{year:2025,works_count:14}]};
test('OpenAlex success is persisted and shared across reloads without a new query',()=>{
  const store=storage(),now=Date.UTC(2026,9,12);
  putCachedSource('journal-1',source,now,store);
  assert.deepEqual(getCachedSource('journal-1',now+1000,store)?.source,source);
  assert.equal(getCachedSource('journal-1',now+CACHE_TTL_MS+1000,store),null);
  assert.equal(getCachedSource('journal-1',now+CACHE_TTL_MS+1000,store,true)?.stale,true);
  assert.equal(getCachedSource('journal-1',now+STALE_TTL_MS+1000,store,true),null);
});
test('cache has bounded LRU size and does not store invalid source IDs',()=>{
  const store=storage(),now=Date.UTC(2026,9,12);
  for(let i=0;i<CACHE_MAX+5;i++)
    putCachedSource('journal-'+i,{id:'https://openalex.org/S'+(i+10)},now+i,store);
  assert.equal(getCachedSource('journal-0',now+CACHE_MAX+5,store),null);
  assert.ok(getCachedSource('journal-'+(CACHE_MAX+4),now+CACHE_MAX+5,store));
  putCachedSource('wrong',{id:'https://evil.invalid/S123'},now,store);
  assert.equal(getCachedSource('wrong',now,store),null);
});
test('429 cooldown is stored with bounded duration and obeys reset hints',()=>{
  const store=storage(),now=Date.UTC(2026,9,12,9,0,0);
  assert.equal(retryAfterMs('15',now),15000);
  assert.equal(retryAfterMs(new Date(now+5000).toUTCString(),now),5000);
  assert.equal(utcResetMs(now),15*60*60*1000);
  setApiCooldown(now+12000,now,store);
  assert.equal(getApiCooldown(now+4000,store),8000);
  setApiCooldown(now+2000,now,store);
  assert.equal(getApiCooldown(now+4000,store),8000);
});
test('storage failures cannot prevent journal browsing',()=>{
  const store={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
  putCachedSource('journal',source,100,store);
  assert.equal(getCachedSource('journal',100,store),null);
  assert.equal(getApiCooldown(100,store),0);
});

test('negative cache limits repeated unmatched-source lookups for one day',()=>{
  const store=storage(),now=Date.UTC(2026,9,12,0,0);
  assert.equal(getMissingSource('unmatched',now,store),false);
  putMissingSource('unmatched',now,store);
  assert.equal(getMissingSource('unmatched',now+12000,store),true);
  assert.equal(getMissingSource('unmatched',now+24*60*60*1000+1,store),false);
  putCachedSource('unmatched',source,now+1000,store);
  assert.equal(getMissingSource('unmatched',now+12000,store),false);
});
