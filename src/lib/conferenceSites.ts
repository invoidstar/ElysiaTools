export interface ConferenceYearWebsite {
  year:number;
  url:string;
  source:'ccfddl'|'curated-edition';
  reference:string;
}
export interface ConferenceWebsiteRecord {
  id:string;
  website:string|null;
  years:ConferenceYearWebsite[];
  source:'ccfddl'|null;
  match:string|null;
}
interface Payload {version:number;revision:string;records:ConferenceWebsiteRecord[]}
let cache:Promise<Map<string,ConferenceWebsiteRecord>>|null=null;
export function loadConferenceWebsites():Promise<Map<string,ConferenceWebsiteRecord>> {
  if(cache)return cache;
  const url=new URL('data/conference-websites.json?v=1',document.baseURI).toString();
  cache=fetch(url).then(async response=>{
    if(!response.ok)throw Error('会议官网索引暂时不可用');
    const data=await response.json() as Payload;
    if(data.version!==1||!Array.isArray(data.records)||data.records.length<380)
      throw Error('会议官网目录不完整');
    const byId=new Map<string,ConferenceWebsiteRecord>();
    for(const row of data.records){
      if(row.id && !byId.has(row.id))byId.set(row.id,row);
    }
    return byId;
  }).catch(error=>{cache=null;throw error;});
  return cache;
}
