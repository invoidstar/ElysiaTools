import { ExternalLink, Globe2 } from 'lucide-react';
import { homepageFromOpenAlex, useJournalOpenAlex } from '../lib/openAlex';
import type { Journal } from '../types';

interface Props { journal:Journal; description?:boolean }
export function JournalHomepageLink({journal,description=false}:Props) {
  const verified=journal.website?.startsWith('https://')?journal.website:null;
  const profile=useJournalOpenAlex(journal,!verified);
  const openalex=profile.status==='success'?homepageFromOpenAlex(profile.source):null;
  const url=verified||openalex;
  return <span className="journal-homepage">
    {url
      ? <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">
          <Globe2 size={14}/> {verified?'期刊官方网站':'期刊主页（OpenAlex 收录）'}
          <ExternalLink size={13}/>
        </a>
      : <span className="muted small-text">
          {profile.status==='loading'?'正在查找期刊官网…':
            profile.status==='error'?'暂未核实期刊官网':'暂无期刊官网链接'}
        </span>
    }
    {description&&openalex&&!verified&&<small className="homepage-provenance">
      主页地址来自准确匹配的 OpenAlex 期刊记录；投稿前请核对出版社页面。
    </small>}
  </span>;
}
