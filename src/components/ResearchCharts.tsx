import { ArrowUpRight, BarChart3, CircleHelp, Database, ExternalLink, History, Layers3, LoaderCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { acceptance, ccfEntries, conferences, coverage, getSource, journalMetric, journals } from '../lib/catalog';
import type { Journal } from '../types';
import { useJournalOpenAlex } from '../lib/openAlex';

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
  const minY=0, maxY=Math.min(100,Math.ceil(Math.max(30,...rows.map(r=>r.rate))/10)*10);
  const W=460,H=142,padX=35,padTop=13,padBot=30;
  const x=(i:number)=> rows.length===1?W/2:padX+(i/(rows.length-1))*(W-2*padX);
  const y=(rate:number)=>padTop+(maxY-rate)/(maxY-minY)*(H-padTop-padBot);
  const pts=rows.map((r,i)=>x(i)+','+y(r.rate)).join(' ');
  const area='M '+pts.replace(/ /g,' L ')+' L '+x(rows.length-1)+' '+(H-padBot)+' L '+x(0)+' '+(H-padBot)+' Z';
  if(compact) return <div className="acceptance-inline"><TrendingUp size={14}/><b>{rows.at(-1)!.rate}%</b><span>{rows.at(-1)!.year} 录用率</span></div>;
  return <div className="acceptance-trend">
    <div className="trend-head"><div><span className="trend-eyebrow">HISTORICAL ACCEPTANCE</span><strong>历年投稿与录用趋势</strong></div><span className="trend-head-meta">{rows.length} 条有来源的记录 · 非预测</span></div>
    <svg viewBox={'0 0 '+W+' '+H} className="trend-svg" role="img" aria-label={'历年录用率：'+rows.map(r=>r.year+'年'+r.rate+'%').join('，')}>
      <defs><linearGradient id={'area-'+conferenceId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8d80e9" stopOpacity=".23"/><stop offset="1" stopColor="#8d80e9" stopOpacity=".015"/></linearGradient></defs>
      {[0,maxY/3,maxY*2/3,maxY].map(t=><g key={t}><line x1={padX} x2={W-padX} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="4 5"/><text x={padX-9} y={y(t)+4} textAnchor="end" fontSize="9" fill="var(--faint)">{Math.round(t)}%</text></g>)}
      <path d={area} fill={'url(#area-'+conferenceId+')'}/>
      <polyline points={pts} stroke="var(--primary)" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {rows.map((r,i)=><g key={r.year}><circle cx={x(i)} cy={y(r.rate)} r="5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5"/><text x={x(i)} y={H-10} fontSize="9" textAnchor="middle" fill="var(--muted)">{rows.length<9 || i%2===0 || i===rows.length-1 ? r.year : ""}</text><title>{r.year}: {r.rate}%</title></g>)}
    </svg>
    <div className="trend-year-list">{rows.map(r=><div key={r.year} className="trend-year-chip"><strong>{r.rate}%</strong><span>{r.year}</span><a target="_blank" rel="noopener noreferrer" href={getSource(r.sourceId)?.url} aria-label={'查看'+r.year+'官方录用率来源'}><ExternalLink size={12}/></a></div>)}</div>
    <div className="acceptance-table-wrap"><table className="acceptance-table"><thead><tr><th>年份</th><th>投稿量</th><th>录用量</th><th>录用率</th><th>来源</th></tr></thead><tbody>{[...rows].reverse().map(r=><tr key={r.year+'-'+r.track}>
      <td><b>{r.year}</b></td><td>{r.submissions?.toLocaleString('en-US') ?? '—'}</td><td>{r.accepted?.toLocaleString('en-US') ?? '—'}</td>
      <td><strong className="acceptance-rate-value">{r.rate}%</strong></td>
      <td><a href={getSource(r.sourceId)?.url} target="_blank" rel="noopener noreferrer" className="micro-link">{getSource(r.sourceId)?.kind==='official-history'?'官方报告':'社区整理'} <ExternalLink size={12}/></a></td>
    </tr>)}</tbody></table></div>
    <div className="trend-notes"><ShieldCheck size={14}/> 官方资料与 CCF-Deadlines 社区数据分别标注；投稿量、录用量及统计口径以原始链接为准。部分年份含不同 Track 或阶段，录用率不是未来录用概率。</div>
  </div>;
}

const metricTitle: Record<string,string> = {jif:'影响因子 · JIF',jcr:'JCR 学科分区',cas:'中科院分区 · 历史',xinrui:'新锐分区',articles:'发文量' };
const metricLink: Record<string,string> = {
 jcr:'https://clarivate.com/academia-government/scientific-and-academic-research/research-funding-analytics/journal-citation-reports/',
 cas:'https://www.lib.szu.edu.cn/er/fenqubiao',xinrui:'https://www.xr-scholar.com/Journals/Search'
};
export function JournalMetricCards({journal}:{journal:Journal}) {
  const getMetric = journalMetric;
  const getMetrics = (j: Journal, system: string) => j.indicators.filter(m => m.system === system).sort((a,b) => b.year - a.year);
  const metrics = [
    {id:'cas',year:2025,caption:'原中科院 2025 升级版'},
    {id:'xinrui',year:2026,caption:'独立机构 2026'},
    {id:'jcr',year:2026,caption:'2025 年度 JCR · 2026 发布'},
    {id:'jif',year:2025,caption:'2025 JIF · 2026 发布'}
  ];
  return <div className="journal-metric-dashboard">{metrics.map(m=>{
    const found=getMetric(journal,m.id);
    const source = found ? getSource(found.sourceId) : undefined;
    const secondarySource = source?.kind === 'thirdparty-public-fact';
    const url = source?.url || metricLink[m.id] || (m.id === 'xinrui' ? 'https://www.xr-scholar.com/Journals/Search' : undefined);
    return <div key={m.id} className={'journal-metric-card metric-'+m.id}>
      <span>{metricTitle[m.id]}</span>
      <strong className={found?'has-data':''}>{found ? found.value : '—'}</strong>
      <small>{found?(secondarySource?'LetPub 二次来源 · '+found.year:m.id==='jif'?'JIF '+found.year+' · '+(found.year+1)+' 年发布':m.id==='jcr'?'JCR 2025 评价 · 2026 年发布':'指标年份 '+found.year):m.caption}</small>
      {found?.category && <p className="metric-category" title={found.category}>{found.category}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer">{source?'查看数据出处':'前往官方查询'} <ArrowUpRight size={12}/></a>}
      {['jcr','cas','xinrui'].includes(m.id) && getMetrics(journal,m.id).length>1 && <div className="metric-subjects">
        {getMetrics(journal,m.id).map((v,i)=><small key={v.category+'-'+i}>{v.category||'所属学科'} · {v.value}</small>)}
      </div>}
    </div>;
  })}</div>;
}

/** OpenAlex work counts are indexed-source counts, not publisher-certified totals. */
export function JournalPublicationCount({journal}:{journal:Journal}) {
  const profile=useJournalOpenAlex(journal);
  const currentYear=new Date().getFullYear();
  const years=Array.from({length:5},(_,i)=>currentYear-4+i);
  const raw=profile.status==='success'?(profile.source.counts_by_year||[]):[];
  const counts=years.map(year=>{
    const entry=raw.find(x=>x.year===year);
    return {year,count:entry&&Number.isFinite(entry.works_count)?Math.max(0,entry.works_count):null};
  });
  const known=counts.filter(x=>x.count!==null);
  const maximum=Math.max(1,...known.map(x=>x.count||0));
  const sum=known.reduce((n,x)=>n+(x.count||0),0);

  return <div className="article-count-panel publication-trend">
    <div className="publication-heading">
      <div className="article-count-icon"><Database size={21}/></div>
      <div className="article-count-copy">
        <span className="trend-eyebrow">PUBLICATION HISTORY · OPENALEX</span>
        <strong>近五年发文量</strong>
        <small>{years[0]}—{currentYear} · OpenAlex 按年份收录的作品数量</small>
      </div>
      {profile.status==='success'&&<a className="micro-link" href={profile.source.id} target="_blank" rel="noopener noreferrer">数据来源 <ExternalLink size={13}/></a>}
    </div>
    {profile.status==='loading'&&<div className="publication-loading">
      <LoaderCircle size={16} className="is-spinning"/> 正在自动获取近五年的发文记录…
    </div>}
    {profile.status==='error'&&<div className="publication-error">
      <CircleHelp size={16}/> {profile.message}
    </div>}
    {profile.status==='success'&&<>
      <div className="publication-summary">
        <strong>{sum.toLocaleString('zh-CN')}</strong>
        <span>篇已查询到的收录作品 · {known.length} / 5 个年份具有记录</span>
      </div>
      <div className="publication-year-grid" role="list" aria-label="近五年 OpenAlex 发文量">
        {counts.map(({year,count})=><div className="publication-year" key={year} role="listitem">
          <strong>{count===null?'—':count.toLocaleString('zh-CN')}</strong>
          <span className="publication-track"><i style={{height:count===null?'0%':Math.max(count>0?4:0,Math.round(count/maximum*100))+'%'}}/></span>
          <b>{year}</b>
          <small>{year===currentYear?'截至目前':count===null?'暂无记录':'全年'}</small>
        </div>)}
      </div>
    </>}
    <p className="publication-explain">
      统计为 OpenAlex 收录的期刊作品数，并非出版社正式公布的论文总量；尚无记录的年份显示“—”，不按 0 篇处理。
      {years.includes(currentYear)&&' 当年数据尚未结束，且可能持续回填。'}
    </p>
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
    <div className="snapshot-foot"><History size={14}/> 另有 {acceptance.length} 条有出处的历年录用记录（含社区整理）</div>
  </div>;
}
