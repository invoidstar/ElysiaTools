import {journals as existingJournals} from './catalog';
import type {Journal,JournalIndicator} from '../types';

// Vite serves this compact table as a separate Pages asset, outside the initial JS bundle.
type MetricRow = [string,string,string];
type PackedRow = [string,string,string,string,string,string,MetricRow[],string[]?];
interface Payload {version:number;sourceRevision:string;entries:PackedRow[]}
const sourceRevision='4687a8f608f20aaf004299992f5d347dba009361';
const codes:Record<string,{system:string;year:number;sourceId:string}>={
  c:{system:'cas',year:2025,sourceId:'showjcr-cas2025'},
  x:{system:'xinrui',year:2026,sourceId:'showjcr-xinrui2026'},
  q:{system:'jcr',year:2026,sourceId:'showjcr-jcr2025'},
  f:{system:'jif',year:2025,sourceId:'showjcr-jcr2025'}
};
let pending:Promise<Journal[]>|null=null;

function decode(payload:Payload):Journal[] {
  if(payload.version!==1||payload.sourceRevision!==sourceRevision||!Array.isArray(payload.entries)||payload.entries.length<19000){
    throw Error('期刊分区数据不完整或版本不匹配。');
  }
  const catalogue=new Map(existingJournals.map(j=>[j.id,j]));
  for(const row of payload.entries){
    const [id,title,issn,eissn,field,publisher,packed,aliases]=row;
    if(!id||!title||!Array.isArray(packed))continue;
    const metrics=packed.flatMap(([code,value,category]):JournalIndicator[]=>{
      const spec=codes[code];
      return spec&&value?[{...spec,value,category:category||'',license:'operator-authorized'}]:[];
    });
    const prior=catalogue.get(id);
    if(prior){
      const byKey=new Map<string,JournalIndicator>();
      for(const m of [...prior.indicators,...metrics]){
        byKey.set(m.system+'|'+m.year+'|'+(m.category||''),m);
      }
      catalogue.set(id,{...prior,
        aliases:[...new Set([...(prior.aliases||[]),...(aliases||[])])],
        indicators:[...byKey.values()]});
    }else{
      const subject=field||'其他 / 待分类';
      catalogue.set(id,{
        id,acronym:title,name:title,aliases:aliases||[],field:subject,fieldZh:subject,
        publisher:publisher||null,ccf:null,ccfYear:null,issn:issn||null,
        eissn:eissn||null,issnL:null,oa:'unknown',website:null,indexUrl:null,
        sourceId:metrics[0]?.sourceId||'showjcr-cas2025',identifierSource:null,indicators:metrics
      });
    }
  }
  return [...catalogue.values()];
}

export function loadJournalUniverse():Promise<Journal[]> {
  if(pending)return pending;
  const url=new URL('data/journal-universe.json',document.baseURI).toString();
  pending=fetch(url).then(async response=>{
    if(!response.ok)throw Error('无法取得期刊资料（HTTP '+response.status+'）。');
    const data=await response.json() as Payload;
    return decode(data);
  }).catch(error=>{pending=null;throw error;});
  return pending;
}
