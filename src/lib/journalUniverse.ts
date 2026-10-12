import { journals as existingJournals } from './catalog';
import type { Journal, JournalDiagnostic, JournalIndicator, JournalSnapshotStatus } from '../types';

// Keep V1 support for a mixed-cache deploy. V2 additionally retains journals
// without annual ratings and embeds reproducible source-status diagnostics.
type MetricRow = [string,string,string];
type SourceRows = [number[],number[],number[]];
type PackedRow = [
  string,string,string,string,string,string,MetricRow[],string[]?,
  string?,string?,string[]?,string[]?,string?,SourceRows?
];
interface Payload {version:number;sourceRevision:string;entries:PackedRow[]}
const sourceRevision='4687a8f608f20aaf004299992f5d347dba009361';
const systems=['cas','xinrui','jcr','jif'] as const;
const fileSystems=['cas','xinrui','jcr'] as const;
const statusCode:Record<string,JournalSnapshotStatus>={
  P:'available',L:'source_no_metric',N:'not_in_source',R:'identity_review'
};
const matchCode:Record<string,'issn'|'title'|'new'|'review'>={
  i:'issn',t:'title',n:'new',r:'review'
};
const codes:Record<string,{system:string;year:number;sourceId:string}>={
  c:{system:'cas',year:2025,sourceId:'showjcr-cas2025'},
  x:{system:'xinrui',year:2026,sourceId:'showjcr-xinrui2026'},
  q:{system:'jcr',year:2026,sourceId:'showjcr-jcr2025'},
  f:{system:'jif',year:2025,sourceId:'showjcr-jcr2025'}
};
let pending:Promise<Journal[]>|null=null;

function decodeDiagnostic(
  statuses:string|undefined,
  methods:string|undefined,
  issues:string[]|undefined,
  sourceRows:SourceRows|undefined
):JournalDiagnostic|undefined {
  if(!statuses||statuses.length!==4)return undefined;
  const status={} as JournalDiagnostic['status'];
  for(let i=0;i<systems.length;i++){
    const value=statusCode[statuses[i]];
    if(!value)return undefined;
    status[systems[i]]=value;
  }
  const matchMethod:JournalDiagnostic['matchMethod']={};
  const matches:JournalDiagnostic['sourceRows']={};
  for(let i=0;i<fileSystems.length;i++){
    if(methods?.[i]&&matchCode[methods[i]])matchMethod[fileSystems[i]]=matchCode[methods[i]];
    if(sourceRows?.[i]?.length)matches[fileSystems[i]]=sourceRows[i];
  }
  return {status,matchMethod,sourceRows:matches,issues:issues||[]};
}

function decode(payload:Payload):Journal[] {
  if(![1,2].includes(payload.version)||payload.sourceRevision!==sourceRevision||
     !Array.isArray(payload.entries)||payload.entries.length<19000){
    throw Error('期刊分区数据不完整或版本不匹配。');
  }
  const catalogue=new Map(existingJournals.map(j=>[j.id,j]));
  const seen=new Set<string>();
  for(const row of payload.entries){
    const [id,title,issn,eissn,field,publisher,packed,aliases,
      statusCodes,matchCodes,issues,extraIssns,origin,rows]=row;
    if(!id||!title||!Array.isArray(packed)||seen.has(id))
      throw Error('期刊索引包含重复或无效身份：'+String(id));
    seen.add(id);
    const diagnostic=decodeDiagnostic(statusCodes,matchCodes,issues,rows);
    if(payload.version===2&&!diagnostic)throw Error('期刊诊断记录缺失：'+id);
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
        extraIssns:[...new Set([...(prior.extraIssns||[]),...(extraIssns||[])])],
        ...(diagnostic?{diagnostic}:{}),indicators:[...byKey.values()]});
    }else{
      const subject=field||'其他 / 待分类';
      catalogue.set(id,{
        id,acronym:title,name:title,aliases:aliases||[],field:subject,fieldZh:subject,
        publisher:publisher||null,ccf:null,ccfYear:null,issn:issn||null,
        eissn:eissn||null,issnL:null,extraIssns:extraIssns||[],
        ...(diagnostic?{diagnostic}:{}),
        oa:'unknown',website:null,indexUrl:null,
        sourceId:origin||metrics[0]?.sourceId||'showjcr-cas2025',
        identifierSource:null,indicators:metrics
      });
    }
  }
  if(payload.version===2&&seen.size<20000)throw Error('年度索引保留期刊数异常：'+seen.size);
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
