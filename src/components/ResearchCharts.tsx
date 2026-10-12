import { ArrowUpRight, BarChart3, CircleHelp, Database, ExternalLink, History, Layers3, LoaderCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { acceptance, ccfEntries, conferences, coverage, getSource, journalMetric, journals } from '../lib/catalog';
import type { Conference, Journal, AcceptanceRecord } from '../types';

const colors = { A: '#8271e8', B: '#69adc9', C: '#a8b8d3' };
const fields = [
  'Artificial Intelligence', 'Systems', 'Networking', 'Security', 'Software', 'Data & IR',
  'Theory', 'Graphics', 'HCI', 'Interdisciplinary'
];
const fieldNames: Record<string,string> = {
  'Artificial Intelligence':'人工智能','Systems':'体系结构与系统','Networking':'计算机网络',
  'Security':'网络与信息安全','Software':'软件工程与程序语言','Data & IR':'数据库与信息检索',
  'Theory':'计算机科学理论','Graphics':'图形学与多媒体','HCI':'人机交互与普适计算',
  'Interdisciplinary':'交叉 / 综合 / 新兴'
};
const gradeSum = (type: 'conference' | 'journal', field?: string) =>
  (type === 'conference' ? conferences : journals)
    .flatMap(v => ccfEntries(v).filter(e => !field || e.field === field))
    .reduce((acc, e) => {acc[e.grade]++; return acc;}, {A:0,B:0,C:0});

export function DirectoryViz({ type, onField, activeField = '' }: {
  type: 'conference' | 'journal'; onField: (value: string) => void; activeField?: string;
}) {
  const summary = gradeSum(type);
  const sum = summary.A + summary.B + summary.C;
  const sliceOrder = (['A','B','C'] as const);
  let offset = 0;
  const donut = sliceOrder.map(key => {
    const len = sum ? summary[key] / sum * 100 : 0;
    const circle = <circle key={key} cx="88" cy="88" r="64" fill="none" stroke={colors[key]} strokeWidth="22"
      strokeDasharray={len + ' ' + (100 - len)} strokeDashoffset={-offset}
      pathLength="100" transform="rotate(-90 88 88)" />;
    offset += len;
    return circle;
  });
  const ordered = fields.map(field=>({field,...gradeSum(type,field)}));
  const max = Math.max(...ordered.map(x=>x.A+x.B+x.C));
  return <div className="directory-viz">
    <div className="viz-donut-wrap">
      <div className="viz-title"><Layers3 size={16}/><span>CCF 等级分布</span><small>2026 第七版</small></div>
      <div className="viz-donut-content"><svg viewBox="0 0 176 176" className="viz-donut" role="img" aria-label={'CCF A ' + summary.A + '、B ' + summary.B + '、C ' + summary.C}>
        <circle cx="88" cy="88" r="64" stroke="var(--line)" strokeWidth="22" fill="none"/>
        {donut}<text x="88" y="84" textAnchor="middle" fill="var(--text)" fontSize="30" fontWeight="790">{sum}</text>
        <text x="88" y="104" textAnchor="middle" fill="var(--muted)" fontSize="10">分类记录</text>
      </svg>
      <div className="viz-donut-legend">{sliceOrder.map(g=><div key={g}><i style={{background:colors[g]}}/><span>CCF {g}</span><strong>{summary[g]}</strong></div>)}<span className="viz-legend-note">跨领域记录按目录行计数</span></div></div>
    </div>
    <div className="viz-areas-wrap">
      <div className="viz-title"><BarChart3 size={16}/><span>研究领域图谱</span><small>点击领域筛选</small></div>
      <div className="viz-areas">
        {ordered.map(r=>{
          const total=r.A+r.B+r.C;
          return <button key={r.field} className={'viz-area '+(activeField===r.field?'is-selected':'')} onClick={()=>onField(activeField===r.field?'':r.field)} title={fieldNames[r.field]+': '+total+' 条推荐记录'}>
            <span className="viz-area-name">{fieldNames[r.field]}</span>
            <span className="viz-area-track"><span style={{width:(r.A/max*100)+'%',background:colors.A}}/><span style={{width:(r.B/max*100)+'%',background:colors.B}}/><span style={{width:(r.C/max*100)+'%',background:colors.C}}/></span>
            <strong>{total}</strong>
          </button>;
        })}</div>
    </div>
  </div>;
}

export function AcceptanceTrend({conferenceId,compact=false}:{conferenceId:string;compact?:boolean}) {
  const rows=acceptance.filter(r=>r.conferenceId===conferenceId).sort((a,b)=>a.year-b.year);
  if(!rows.length) return <div className="data-unavailable"><History size={18}/><div><strong>往年录用率待补充</strong><p>仅收录具有来源、年份和明确 Track 的历史录用数据。</p></div></div>;
  const minY=0, maxY=45;
  const W=460,H=142,padX=35,padTop=13,padBot=30;
  const x=(i:number)=> rows.length===1?W/2:padX+(i/(rows.length-1))*(W-2*padX);
  const y=(rate:number)=>padTop+(maxY-rate)/(maxY-minY)*(H-padTop-padBot);
  const pts=rows.map((r,i)=>x(i)+','+y(r.rate)).join(' ');
  const area='M '+pts.replace(/ /g,' L ')+' L '+x(rows.length-1)+' '+(H-padBot)+' L '+x(0)+' '+(H-padBot)+' Z';
  if(compact) return <div className="acceptance-inline"><TrendingUp size={14}/><b>{rows.at(-1)!.rate}%</b><span>{rows.at(-1)!.year} 录用率</span></div>;
  return <div className="acceptance-trend">
    <div className="trend-head"><div><span className="trend-eyebrow">HISTORICAL ACCEPTANCE</span><strong>主会历年录用趋势</strong></div><span className="trend-head-meta">{rows.length} 年已核实 · 非预测</span></div>
    <svg viewBox={'0 0 '+W+' '+H} className="trend-svg" role="img" aria-label={'历年录用率：'+rows.map(r=>r.year+'年'+r.rate+'%').join('，')}>
      <defs><linearGradient id={'area-'+conferenceId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8d80e9" stopOpacity=".23"/><stop offset="1" stopColor="#8d80e9" stopOpacity=".015"/></linearGradient></defs>
      {[0,15,30,45].map(t=><g key={t}><line x1={padX} x2={W-padX} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="4 5"/><text x={padX-9} y={y(t)+4} textAnchor="end" fontSize="9" fill="var(--faint)">{t}%</text></g>)}
      <path d={area} fill={'url(#area-'+conferenceId+')'}/>
      <polyline points={pts} stroke="var(--primary)" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {rows.map((r,i)=><g key={r.year}><circle cx={x(i)} cy={y(r.rate)} r="5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5"/><text x={x(i)} y={H-10} fontSize="10" textAnchor="middle" fill="var(--muted)">{r.year}</text><title>{r.year}: {r.rate}%</title></g>)}
    </svg>
    <div className="trend-year-list">{rows.map(r=><div key={r.year} className="trend-year-chip"><strong>{r.rate}%</strong><span>{r.year}</span><a target="_blank" rel="noopener noreferrer" href={getSource(r.sourceId)?.url} aria-label={'查看'+r.year+'官方录用率来源'}><ExternalLink size={12}/></a></div>)}</div>
    <div className="trend-notes"><ShieldCheck size={14}/> 录用率来自主办方；不同年份的统计口径可能不同，不能直接作为投稿概率。{rows.find(x=>x.note) && <span> 部分年份有单独的统计口径说明。</span>}</div>
  </div>;
}

const metricTitle: Record<string,string> = {jif:'影响因子 · JIF',jcr:'JCR 学科分区',cas:'中科院分区 · 历史',xinrui:'新锐分区',articles:'发文量' };
const metricLink: Record<string,string> = {
 jcr:'https://clarivate.com/academia-government/scientific-and-academic-research/research-funding-analytics/journal-citation-reports/',
 cas:'https://www.lib.szu.edu.cn/er/fenqubiao',xinrui:'https://www.xr-scholar.com/Journals/Search'
};
export function JournalMetricCards({journal}:{journal:Journal}) {
  const metrics = [
    {id:'cas',year:2025,caption:'原中科院 2025 升级版'},
    {id:'xinrui',year:2026,caption:'独立机构 2026'},
    {id:'jcr',year:2026,caption:'2026 JCR · 学科 Q1–Q4'},
    {id:'jif',year:2025,caption:'2025 JIF · 2026 发布'}
  ];
  return <div className="journal-metric-dashboard">{metrics.map(m=>{
    const found=journalMetric(journal,m.id);
    const url=m.id==='xinrui'
      ? 'https://www.xr-scholar.com/Journals/Search?keyword='+encodeURIComponent(journal.name)+'&year=2026'
      : found ? getSource(found.sourceId)?.url : metricLink[m.id];
    return <div key={m.id} className={'journal-metric-card metric-'+m.id}>
      <span>{metricTitle[m.id]}</span>
      <strong className={found?'has-data':''}>{found ? found.value : '—'}</strong>
      <small>{found?(m.id==='jif'?'JIF '+found.year+' · JCR '+(found.year+1):'版本 '+found.year):m.caption}</small>
      {found?.category && <p className="metric-category" title={found.category}>{found.category}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer">官方来源 <ArrowUpRight size={12}/></a>}
    </div>;
  })}</div>;
}

function normalizeTitle(input:string):string{return input.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');}
export function JournalPublicationCount({journal}:{journal:Journal}) {
  const [state,setState]=useState<{status:'idle'|'loading'|'success'|'fail';count?:number;source?:string;message?:string}>({status:'idle'});
  async function lookup(){
    setState({status:'loading'});
    try {
      const params=new URLSearchParams({per_page:'5',select:'id,display_name,issn,counts_by_year,homepage_url'});
      const identifier=journal.issnL||journal.issn||journal.eissn;
      if(identifier)params.set('filter','issn:'+identifier);else params.set('search',journal.name);
      const response=await fetch('https://api.openalex.org/sources?'+params.toString(),{headers:{Accept:'application/json'}});
      if(!response.ok)throw Error(response.status===429?'OpenAlex 请求受限，请稍后再试。':'暂时无法从 OpenAlex 获取数据。');
      const data=await response.json() as {results?:Array<{id?:string;display_name?:string;issn?:string[];counts_by_year?:Array<{year:number;works_count:number}>}>};
      const found=data.results?.find(x=>identifier?x.issn?.includes(identifier):normalizeTitle(x.display_name||'')===normalizeTitle(journal.name));
      if(!found)throw Error('未找到能够精确匹配该期刊的 OpenAlex 记录。');
      const count=found.counts_by_year?.find(x=>x.year===2025)?.works_count;
      if(typeof count!=='number')throw Error('该期刊暂无 2025 年的可核验作品数。');
      setState({status:'success',count,source:found.id});
    }catch(e){setState({status:'fail',message:e instanceof Error?e.message:'数据查询失败'});}
  }
  return <div className="article-count-panel">
    <div className="article-count-icon"><Database size={21}/></div>
    <div className="article-count-copy"><span className="trend-eyebrow">PUBLICATION ACTIVITY · 2025</span><strong>2025 年发文量</strong><small>采用 OpenAlex 收录作品数，不等同于出版社官方全年发文总量。</small>
      {state.status==='success'&& <div className="count-result"><b>{state.count?.toLocaleString('zh-CN')}</b> 篇 OpenAlex 2025 收录作品 <a href={state.source?.replace('https://openalex.org/','https://openalex.org/')} target="_blank" rel="noopener noreferrer">查看来源 <ArrowUpRight size={12}/></a></div>}
      {state.status==='fail'&&<p className="count-error">{state.message}</p>}
    </div>
    <button className="secondary-button" onClick={lookup} disabled={state.status==='loading'}>{state.status==='loading'?<LoaderCircle size={15} className="is-spinning"/>:<CircleHelp size={15}/>} {state.status==='loading'?'查询中':'查询发文量'}</button>
  </div>;
}

export function DirectorySnapshot() {
  const topFields=fields.map(field=>({field,count:gradeSum('conference',field).A+gradeSum('conference',field).B+gradeSum('conference',field).C})).sort((a,b)=>b.count-a.count);
  const top=topFields[0];
  return <div className="snapshot-widget">
    <div className="snapshot-title"><span className="tiny-dot"/><strong>CCF 2026 · FULL DIRECTORY</strong><span>已整理</span></div>
    <div className="snapshot-numbers"><div><strong>{coverage.conferenceRows}</strong><span>会议记录</span></div><div><strong>{coverage.journalRows}</strong><span>期刊分类记录</span></div><div><strong>{coverage.fields}</strong><span>学科领域</span></div></div>
    <div className="snapshot-mini">
      <span>分类领域示意</span>
      {topFields.slice(0,5).map(r=><div key={r.field} className="snapshot-line"><span>{fieldNames[r.field]}</span><i><b style={{width:(r.count/top.count*100)+'%'}}/></i><strong>{r.count}</strong></div>)}
    </div>
    <div className="snapshot-foot"><History size={14}/> 另有 {acceptance.length} 条已核实的历年录用数据</div>
  </div>;
}
