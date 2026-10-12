import { ExternalLink, Globe2 } from 'lucide-react';
import { homepageFromOpenAlex, useJournalOpenAlex } from '../lib/openAlex';
import type { Journal } from '../types';

interface Props { journal:Journal; description?:boolean }
function validWebsite(input:string|null):string|null{
  if(!input)return null;
  try{
    const url=new URL(input);
    return ['https:','http:'].includes(url.protocol) && url.hostname && !url.username&&!url.password?input:null;
  }catch{return null;}
}
export function JournalHomepageLink({journal,description=false}:Props) {
  const staticWebsite=validWebsite(journal.website);
  const provenance=journal.websiteSource;
  const profile=useJournalOpenAlex(journal,!staticWebsite);
  const dynamic=profile.status==='success'?homepageFromOpenAlex(profile.source):null;
  const url=staticWebsite||dynamic;
  const title=staticWebsite?
    (provenance==='doaj'?'期刊主页（DOAJ）':
      provenance==='openalex'?'期刊主页（OpenAlex）':'期刊官方网站'):
    '期刊主页（OpenAlex 实时匹配）';
  return <span className="journal-homepage">
    {url
      ? <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">
          <Globe2 size={14}/> {title} <ExternalLink size={13}/>
        </a>
      : <span className="muted small-text">
          {profile.status==='loading'?'正在查找期刊主页…':
            profile.status==='error'?'当前没有可确认的期刊主页':'尚无可核实的期刊主页'}
        </span>}
    {description && staticWebsite&&provenance&&<small className="homepage-provenance">
      {provenance==='curated'?'本站已核验的期刊官网。':
        provenance==='doaj'?'来源：DOAJ 公开期刊目录。':
        '来源：OpenAlex 公开书目快照。'}
      {journal.websiteReference&&<a href={journal.websiteReference} target="_blank" rel="noopener noreferrer">
        查看来源 <ExternalLink size={11}/>
      </a>}
    </small>}
    {description&&profile.status==='error'&&!staticWebsite&&<small className="homepage-provenance">{profile.message}</small>}
    {description&&dynamic&&!staticWebsite&&<small className="homepage-provenance">
      本次网页查询获得的 OpenAlex 主页地址，投稿前请核对出版社页面。
    </small>}
  </span>;
}
