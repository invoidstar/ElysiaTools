import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, Compass, LibraryBig, Search, ShieldCheck, Sparkles, Star, Target } from 'lucide-react';
import { conferences, matches, upcomingRows, coverage, acceptance } from '../lib/catalog';
import { countdown, displayEvent, type ZoneChoice } from '../lib/time';
import type { AcademicState, Journal } from '../types';
import { AcceptanceTrend, DirectoryViz, DirectorySnapshot } from '../components/ResearchCharts';

interface Props {
  journalCatalogue: Journal[];
  catalogueReady: boolean;
  academic: AcademicState;
  zone: ZoneChoice;
  now: number;
  onNavigate: (page: string) => void;
  onConferenceSearch: (value: string, field?: string) => void;
  onJournalSearch: (value: string) => void;
}

export function HomePage({ academic, zone, now, onNavigate, onConferenceSearch, onJournalSearch, journalCatalogue, catalogueReady }: Props) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'conference' | 'journal'>('all');
  const confMatches = useMemo(() => query.trim() ? conferences.filter(c => matches(c, query)).slice(0, 4) : [], [query]);
  const journalMatches = useMemo(() => query.trim() ? journalCatalogue.filter(j => matches(j, query)).slice(0, 4) : [], [query,journalCatalogue]);
  const featured = useMemo(() => {
    const seen = new Set<string>();
    return upcomingRows(now, 60).filter(r => {
      if (seen.has(r.conference.id)) return false;
      seen.add(r.conference.id); return true;
    }).slice(0, 4);
  }, [now]);
  const submitSearch = () => {
    if (!query.trim()) return onNavigate('conference');
    if (searchMode === 'journal' || (searchMode === 'all' && confMatches.length === 0 && journalMatches.length > 0)) onJournalSearch(query);
    else onConferenceSearch(query);
  };
  const areas = [
    {name:'Artificial Intelligence',zh:'人工智能',symbol:'AI',desc:'机器学习 · 计算机视觉'},
    {name:'Data & IR',zh:'数据与信息检索',symbol:'DB',desc:'数据挖掘 · 数据库'},
    {name:'Security',zh:'网络与信息安全',symbol:'SEC',desc:'安全 · 隐私 · 密码学'},
    {name:'Systems',zh:'计算机系统',symbol:'SYS',desc:'体系结构 · 分布计算'},
    {name:'HCI',zh:'人机交互',symbol:'HCI',desc:'交互设计 · 普适计算'},
    {name:'Software',zh:'软件工程',symbol:'SE',desc:'软件系统 · 程序设计'}
  ];

  return <div className="page-enter home-page">
    <section className="home-hero">
      <div className="hero-text">
        <div className="hero-badge"><Sparkles size={15} /> ACADEMIC RESEARCH TOOLKIT <span>V1.3.1</span></div>
        <h1>让科研信息<span className="headline-comma">，</span><br/><span>变得更简单<span className="accent-dot">.</span></span></h1>
        <p>会议截稿、期刊信息、学术分类与个人日程。<br/>一个精心整理的科研工具箱，帮助你专注于真正重要的研究。</p>
        <div className="hero-search-box">
          <div className="search-mode">{[{id:'all',label:'全部'},{id:'conference',label:'会议'},{id:'journal',label:'期刊'}].map(mode=><button key={mode.id} className={searchMode===mode.id?'active':''} onClick={()=>setSearchMode(mode.id as 'all'|'conference'|'journal')}>{mode.label}</button>)}</div>
          <div className="hero-search-row"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') submitSearch();}} placeholder="搜索会议、期刊、研究方向..." aria-label="统一搜索" /><button onClick={submitSearch} aria-label="开始搜索"><ArrowRight size={20}/></button></div>
          {query.trim() && <div className="quick-results">
            {searchMode !== 'journal' && confMatches.map(c=><button key={c.id} onClick={()=>onNavigate('conference/'+c.id)}><CalendarDays size={15}/><strong>{c.acronym}</strong><span>{c.name}</span><ChevronRight size={15}/></button>)}
            {searchMode !== 'conference' && journalMatches.map(j=><button key={j.id} onClick={()=>onNavigate('journal/'+j.id)}><LibraryBig size={15}/><strong>{j.acronym}</strong><span>{j.name}</span><ChevronRight size={15}/></button>)}
            {(!confMatches.length && !journalMatches.length) && <span className="quick-empty">{searchMode==='journal'&&!catalogueReady?'按 Enter 搜索完整期刊目录。':'没有找到匹配条目，试试其他关键词。'}</span>}
          </div>}
        </div>
        <div className="popular-search"><span>试试搜索</span>{['CVPR','ICLR','TPAMI','Security'].map(q=><button key={q} onClick={()=>setQuery(q)}>{q}<ArrowUpRight size={12}/></button>)}</div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="visual-topline"><span><span className="live-dot"/> ACADEMIC NAVIGATOR</span><span>2026 / 2027</span></div>
        <div className="orbit-system"><div className="orbit-ring ring-outer"/><div className="orbit-ring ring-inner"/><div className="orbit-center"><span className="orbit-center-e">E</span><small>TOOLS</small></div><span className="orbit-node node-top"><CalendarDays size={19}/></span><span className="orbit-node node-right"><LibraryBig size={19}/></span><span className="orbit-node node-bottom"><Star size={19}/></span><span className="orbit-node node-left"><Compass size={19}/></span><span className="orbit-spark spark-one"/><span className="orbit-spark spark-two"/></div>
        <div className="visual-bottomline"><span>DISCOVER <i/> COMPARE <i/> ORGANIZE</span><span className="visual-verified"><CheckCircle2 size={13}/> SOURCE AWARE</span></div>
      </div>
    </section>
    <section className="home-stats"><div><span className="stat-icon"><CalendarDays size={19}/></span><strong>{coverage.conferenceRows}</strong><span>CCF 会议</span></div><div><span className="stat-icon"><LibraryBig size={19}/></span><strong>{coverage.uniqueCCFJournals}</strong><span>CCF 期刊</span></div><div><span className="stat-icon"><Target size={19}/></span><strong>{coverage.listedRows}</strong><span>CCF 分类记录</span></div><div><span className="stat-icon"><ShieldCheck size={19}/></span><strong>{acceptance.length}</strong><span>有来源的历史录用记录</span></div></section>

    <section className="home-section">
      <div className="section-heading"><div><span className="section-overline">START EXPLORING / 01</span><h2>从这里开始探索</h2><p>找到适合你的科研入口，减少重复查找的时间。</p></div></div>
      <div className="feature-grid"><button className="feature-card feature-conference" onClick={()=>onNavigate('conference')}><span className="feature-icon"><CalendarDays size={23}/></span><span className="feature-number">01 — CONFERENCES</span><h3>学术会议查询</h3><p>截稿时间 · CCF 等级 · 会议日历</p><span className="feature-link">探索会议 <ArrowUpRight size={18}/></span><span className="feature-decoration deco-calendar"><CalendarClock size={126} strokeWidth={0.85}/></span></button>
        <button className="feature-card feature-journal" onClick={()=>onNavigate('journal')}><span className="feature-icon"><LibraryBig size={23}/></span><span className="feature-number">02 — JOURNALS</span><h3>学术期刊查询</h3><p>学术分类 · 出版信息 · 横向比较</p><span className="feature-link">探索期刊 <ArrowUpRight size={18}/></span><span className="feature-decoration deco-book"><LibraryBig size={126} strokeWidth={0.85}/></span></button>
        <button className="feature-card feature-academic" onClick={()=>onNavigate('academic')}><span className="feature-icon"><Star size={23}/></span><span className="feature-number">03 — MY ACADEMIC</span><h3>我的科研工作台</h3><p>收藏关注 · 截稿日历 · 本地备份</p><span className="feature-link">打开工作台 <ArrowUpRight size={18}/></span><span className="feature-decoration deco-star"><Star size={126} strokeWidth={0.85}/></span></button></div>
    </section>

    <section className="home-section research-insights-section">
      <div className="section-heading"><div><span className="section-overline">ACADEMIC INSIGHTS / 02</span><h2>用数据探索科研版图</h2><p>收录 CCF 第七版全部推荐记录，查看不同领域与等级的分布。</p></div><span className="planned-label">2026 · 完整目录</span></div>
      <div className="insights-grid">
        <DirectorySnapshot/>
        <div className="insights-trend"><AcceptanceTrend conferenceId="cvpr"/><button className="inline-link" onClick={()=>onNavigate('conference/cvpr')}>查看 CVPR 历年数据 <ArrowRight size={16}/></button></div>
      </div>
      <DirectoryViz type="conference" onField={field=>onConferenceSearch('',field)} />
    </section>
    <section className="home-section deadline-section">
      <div className="section-heading"><div><span className="section-overline">DEADLINE RADAR / 03</span><h2>即将到来的截稿</h2><p>仅展示已核实、尚未截止的官方时间节点。</p></div><button className="inline-link" onClick={()=>onNavigate('conference')}>查看全部会议 <ArrowRight size={17}/></button></div>
      {featured.length ? <div className="deadline-feature-grid">{featured.map((r,index)=><button className="deadline-feature" key={r.edition.id+r.track.id+r.event.id} onClick={()=>onNavigate('conference/'+r.conference.id)}><div className="feature-deadline-top"><span>0{index+1} / {r.conference.field}</span><span className="deadline-countdown"><CalendarClock size={13}/> {countdown(r.event,now)}</span></div><strong>{r.conference.acronym} <small>{r.edition.year}</small></strong><p>{r.event.title} · {r.track.name}</p><div className="deadline-feature-bottom"><span>{displayEvent(r.event,zone)}</span><ArrowUpRight size={17}/></div></button>)}</div> : <div className="no-upcoming"><ShieldCheck size={18}/> 当前没有更多已核验的未来投稿时间，请查看会议目录和官方来源。</div>}
      <p className="section-disclaimer"><ShieldCheck size={15}/> AoE = UTC−12；所有时间可在页面右上角切换时区。核验记录不代表会议信息永不变化。</p>
    </section>

    <section className="home-section fields-section"><div className="section-heading"><div><span className="section-overline">EXPLORE BY FIELD / 04</span><h2>按研究领域浏览</h2><p>以 CCF 学术领域为基础，从你熟悉的方向开始。</p></div></div>
      <div className="field-grid">{areas.map((a,i)=><button key={a.name} onClick={()=>onConferenceSearch('',a.name)} className="field-card"><span className={'field-symbol field-'+i}>{a.symbol}</span><div><strong>{a.zh}</strong><span>{a.desc}</span></div><ArrowUpRight size={17}/></button>)}</div>
    </section>

    <section className="home-section home-bottom-grid">
      <div className="update-panel"><div className="section-heading"><div><span className="section-overline">LATEST UPDATES / 05</span><h2>平台更新</h2></div><button className="inline-link" onClick={()=>onNavigate('tools')}>科研工具 <ArrowRight size={16}/></button></div>
        <div className="update-row"><span className="update-date">2026.10.12</span><div><strong>期刊公开来源核对与数据规范化</strong><p>CCF 全目录 · 来源版本与授权边界更清晰 · 期刊比较</p></div><span className="update-tag">V1.3.1</span></div>
        <div className="update-row"><span className="update-date">2026.04.09</span><div><strong>CCF 第七版目录作为分类基准</strong><p>保留目录年份，不混用旧版分类</p></div><span className="update-tag neutral">DATA</span></div>
      </div>
      <div className="my-radar-panel"><span className="section-overline">YOUR PERSONAL SPACE</span><div className="my-radar-orb"><Star size={24}/></div><h2>你的科研关注清单</h2><p>收藏 {academic.conferences.length} 场会议 · {academic.journals.length} 本期刊。你的研究日程由你掌握。</p><button onClick={()=>onNavigate('academic')}>前往 My Academic <ArrowRight size={17}/></button></div>
    </section>
  </div>;
}
