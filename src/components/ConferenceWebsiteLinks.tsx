import { ExternalLink, Globe2, History, ShieldCheck } from 'lucide-react';
import { SourceAnchor } from './Common';
import type { Conference, Edition } from '../types';
import type { ConferenceWebsiteRecord } from '../lib/conferenceSites';

interface Props {conference:Conference; edition?:Edition; site?:ConferenceWebsiteRecord}
export function ConferenceWebsiteLinks({conference,edition,site}:Props){
  const curated=edition?.website||site?.website||conference.website;
  const years=site?.years||[];
  const latest=years[0];
  const generic=curated||latest?.url||null;
  return <section className="drawer-section">
    <h3>会议官网 <span>OFFICIAL & EDITION WEBSITES</span></h3>
    <div className="link-stack">
      {generic
        ? <a className="source-link" href={generic} target="_blank" rel="noopener noreferrer">
            <Globe2 size={15}/> {curated?'会议官网':'最近已收录届次网站'}
            {latest&&!curated?' · '+latest.year:''} <ExternalLink size={13}/>
          </a>
        : <span className="muted small-text">尚无经来源记录的会议官网。</span>}
      <SourceAnchor href={conference.indexUrl}>学术索引 / DBLP</SourceAnchor>
    </div>
    {years.length>0&&<>
      <div className="conference-sites-subheading"><History size={14}/>
        已收录的年度官网 · {years.length} 届
      </div>
      <div className="conference-sites-years">
        {years.map(site=><a key={site.year} href={site.url} target="_blank" rel="noopener noreferrer"
          title={site.source==='ccfddl'?'CCFDDL 社区整理的年度会议网址':'人工核验的当届会议官网'}
          className={'conference-sites-year '+(site.source==='curated-edition'?'verified':'community')}>
          {site.year} <ExternalLink size={12}/>
        </a>)}
      </div>
      <p className="conference-sites-note"><ShieldCheck size={13}/>
        年度链接根据 <a href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener noreferrer">CCFDDL</a>
        历史记录整理；其中只有本站单独核验过的当届地址标注为已核验。旧届会议网站可能已经迁移或停用。
      </p>
    </>}
    {!years.length&&!curated&&<p className="conference-sites-note">该会议在当前目录里没有可核实的独立网站，因此暂时保留空缺，不用搜索结果代替官网。</p>}
  </section>;
}
