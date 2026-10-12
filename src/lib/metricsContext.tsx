import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { journals } from './catalog';
import { mergeImportedMetrics, parseMetricFile, type ImportStats, type ImportedLayer } from './metricCsv.mjs';
import type { Journal, JournalIndicator } from '../types';

const STORE = 'elysiatools-private-journal-metrics-v1';
export type MetricRecord = JournalIndicator & { provenance?: string };
type State = {
  layer: ImportedLayer;
  count: (system: string) => number;
  getMetric: (journal: Journal, system: string) => MetricRecord | undefined;
  getMetrics: (journal: Journal, system: string) => MetricRecord[];
  importCSV: (file: File) => Promise<ImportStats>;
  clearPrivate: () => void;
  privateCount: number;
};
const MetricsContext = createContext<State | null>(null);
const journalIds = new Set(journals.map(j=>j.id));
const allowed = new Set(['jcr','jif','cas','xinrui']);

function readLocal(): ImportedLayer {
  try {
    const raw=localStorage.getItem(STORE);
    if(!raw) return {};
    const data: unknown=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))return {};
    const result: ImportedLayer={};
    for(const [id,metrics] of Object.entries(data).slice(0,500)){
      if(!journalIds.has(id)||!Array.isArray(metrics))continue;
      result[id]=metrics.slice(0,80).flatMap((m:unknown)=>{
        if(!m||typeof m!=='object')return [];
        const r=m as Record<string,unknown>;
        if(!allowed.has(String(r.system))||typeof r.value!=='string'||r.value.length>80||
           typeof r.year!=='number'||r.year<2024||r.year>2026)return [];
        return [{
          system:r.system as 'cas'|'xinrui'|'jcr'|'jif',
          value:r.value,
          year:r.year,
          category:typeof r.category==='string'?r.category.slice(0,140):'',
          sourceId:'user-import',
          license:'private-only',
          provenance:'user-provided' as const
        }];
      });
    }
    return result;
  } catch {return {};}
}

export function MetricsProvider({children}:{children:React.ReactNode}){
  const [layer,setLayer]=useState<ImportedLayer>(readLocal);
  useEffect(()=>{
    try {localStorage.setItem(STORE,JSON.stringify(layer));} catch {/* storage disabled or quota exceeded */}
  },[layer]);
  const privateCount=Object.values(layer).filter(x=>x.length>0).length;
  const getMetrics=useCallback((journal:Journal,system:string):MetricRecord[]=>{
    const local=(layer[journal.id]||[]).filter(m=>m.system===system);
    const built=journal.indicators.filter(m=>m.system===system);
    // Private licensed data wins within the same edition/category, public data remains as fallback.
    const seen=new Set<string>();
    return [...local,...built].filter(m=>{
      const id=m.system+'|'+m.year+'|'+(m.category||'');
      if(seen.has(id))return false;
      seen.add(id);return true;
    }).sort((a,b)=>b.year-a.year || (system==='jcr'?a.value.localeCompare(b.value):0));
  },[layer]);
  const getMetric=useCallback((journal:Journal,system:string):MetricRecord|undefined=>getMetrics(journal,system)[0],[getMetrics]);
  const count=useCallback((system:string)=>journals.filter(j=>getMetric(j,system)!==undefined).length,[getMetric]);
  const importCSV=useCallback(async(file:File):Promise<ImportStats>=>{
    if(file.size>30*1024*1024)throw Error('CSV 文件超过 30 MB。');
    if(!/\.csv$|\.tsv$/i.test(file.name))throw Error('仅支持 .csv 或 .tsv 文本文件。');
    const raw=await file.text();
    const result=parseMetricFile(raw,file.name,journals);
    if(!result.stats.matched)throw Error('数据表已经读取，但没有任何能够精确匹配且含有效分区的期刊。请检查期刊名、ISSN 与 CSV 格式。');
    setLayer(prev=>mergeImportedMetrics(prev,result.records));
    return result.stats;
  },[]);
  const clearPrivate=useCallback(()=>setLayer({}),[]);
  const value=useMemo<State>(()=>({layer,count,getMetric,getMetrics,importCSV,clearPrivate,privateCount}),
    [layer,count,getMetric,getMetrics,importCSV,clearPrivate,privateCount]);
  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}
export function useJournalMetrics():State {
  const context=useContext(MetricsContext);
  if(!context)throw Error('Journal metrics provider is missing');
  return context;
}
