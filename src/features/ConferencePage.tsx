import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileDown, List, Search, SlidersHorizontal, BookmarkPlus, ExternalLink } from 'lucide-react';
import { FavoriteButton, GradeTag, EmptyState } from '../components/Common';
import { DirectoryViz } from '../components/ResearchCharts';
import { conferences, coverage, deadlineRows, deadlineState, eventMillis, nextDeadline, orderedConferences, matches, latestAcceptance, getEdition } from '../lib/catalog';
import { countdown, displayEvent, kindLabel, monthKey, zoneValue, type ZoneChoice } from '../lib/time';
import type { AcademicState, DeadlineRow } from '../types';
import { loadConferenceWebsites, type ConferenceWebsiteRecord } from '../lib/conferenceSites';

export interface ConferenceFilters {
  keyword: string; grade: string; field: string; status: string; from: string; to: string;
}
export const emptyConferenceFilters: ConferenceFilters = { keyword: '', grade: '', field: '', status: '', from: '', to: '' };

interface Props {
  filters: ConferenceFilters;
  onFilters: (filters: ConferenceFilters) => void;
  academic: AcademicState;
  toggleFavorite: (id: string) => void;
  openConference: (id: string) => void;
  zone: ZoneChoice;
  now: number;
  saveFilter: () => void;
}

function calendarDate(row: DeadlineRow, zone: ZoneChoice): string {
  if (row.event.precision === 'date') return row.event.original;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneValue(zone), year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(row.event.utc!));
  const pick = (part: string) => parts.find(x => x.type === part)?.value || '';
  return pick('year') + '-' + pick('month') + '-' + pick('day');
}

export function ConferencePage({ filters, onFilters, academic, toggleFavorite, openConference, zone, now, saveFilter }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [limit, setLimit] = useState(18);
  const [historyOnly, setHistoryOnly] = useState(false);
  const [conferenceLinks,setConferenceLinks]=useState<Map<string,ConferenceWebsiteRecord>>(new Map());
  useEffect(()=>{
    let live=true;
    loadConferenceWebsites().then(records=>{if(live)setConferenceLinks(records);})
      .catch(()=>{});
    return ()=>{live=false;};
  },[]);
  const fields = useMemo(() => [...new Set(conferences.map(c => c.field))].sort(), []);
  const change = (key: keyof ConferenceFilters, value: string) => { onFilters({ ...filters, [key]: value }); setLimit(18); };
  const filtered = useMemo(() => {
    const matchesDate = (id: string) => {
      if (!filters.from && !filters.to) return true;
      const next = nextDeadline(id, now);
      if (!next?.event.utc || deadlineState(id, now) !== 'upcoming') return false;
      const time = eventMillis(next.event);
      if (filters.from && time < Date.parse(filters.from + 'T00:00:00Z')) return false;
      if (filters.to && time > Date.parse(filters.to + 'T23:59:59Z')) return false;
      return true;
    };
    return orderedConferences(conferences.filter(c =>
      (!historyOnly || Boolean(latestAcceptance(c.id))) &&
      matches(c, filters.keyword) &&
      (!filters.grade || c.ccf === filters.grade) &&
      (!filters.field || c.field === filters.field) &&
      (!filters.status || deadlineState(c.id, now) === filters.status) &&
      matchesDate(c.id)
    ), now);
  }, [filters, now, historyOnly]);

  const year = month.getFullYear(), monthNumber = month.getMonth();
  const firstOffset = (new Date(year, monthNumber, 1).getDay() + 6) % 7;
  const countDays = new Date(year, monthNumber + 1, 0).getDate();
  const allowedIds = new Set(filtered.map(c => c.id));
  const monthlyRows = deadlineRows.filter(r => allowedIds.has(r.conference.id) && calendarDate(r, zone).slice(0, 7) === monthKey(month));
  const byDay = new Map<number, DeadlineRow[]>();
  for (const row of monthlyRows) {
    const day = Number(calendarDate(row, zone).slice(8, 10));
    byDay.set(day, [...(byDay.get(day) || []), row]);
  }
  const todayKey = calendarDate({ event: { id: '', kind: 'paper', title: '', precision: 'minute', original: '', timezone: 'UTC', utc: new Date(now).toISOString() } } as DeadlineRow, zone);

  return <section className="page-enter content-page">
    <div className="page-intro">
      <div className="eyebrow"><CalendarDays size={15} /> CONFERENCE EXPLORER <span className="eyebrow-line" /></div>
      <h1>学术会议<span className="accent-dot">.</span></h1>
      <p>从研究方向到下一次截稿，在一个地方掌握会议动态。</p>
      <div className="intro-stats"><span><b>{coverage.conferenceRows}</b> 场 CCF 评级会议</span><span><b>{coverage.fields}</b> 个研究领域</span><span>CCF 第七版 · 2026</span></div>
    </div>

    <DirectoryViz type="conference" activeField={filters.field} onField={field=>onFilters({...filters,field})}/>
    <div className="explorer-layout">
      <aside className="filter-panel">
        <div className="panel-title"><SlidersHorizontal size={17} /><strong>筛选条件</strong><button onClick={() => {onFilters(emptyConferenceFilters);setHistoryOnly(false);}} className="text-button">重置</button></div>
        <label className="filter-label">检索会议</label>
        <div className="field-with-icon"><Search size={17} /><input value={filters.keyword} onChange={e => change('keyword', e.target.value)} placeholder="会议名称 / 简称 / 领域" /></div>
        <label className="filter-label">CCF 推荐等级</label>
        <div className="chip-choice">{['', 'A', 'B', 'C'].map(g => <button key={g || 'all'} className={'chip ' + (filters.grade === g ? 'active' : '')} onClick={() => change('grade', g)}>{g ? 'CCF ' + g : '全部'}</button>)}</div>
        <label className="filter-label" htmlFor="conf-field">研究领域</label>
        <select id="conf-field" className="select-input" value={filters.field} onChange={e => change('field', e.target.value)}><option value="">全部领域</option>{fields.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <label className="filter-label" htmlFor="conf-state">截稿状态</label>
        <select id="conf-state" className="select-input" value={filters.status} onChange={e => change('status', e.target.value)}>
          <option value="">全部状态</option><option value="upcoming">尚有投稿节点</option><option value="closed">已截止</option><option value="tbd">尚未公布 / TBD</option>
        </select>
        <label className="filter-label" htmlFor="conf-history">录用率信息</label>
        <label className="history-check"><input type="checkbox" checked={historyOnly} onChange={e=>setHistoryOnly(e.target.checked)} id="conf-history"/> 仅显示有来源的历年录用统计</label>
        <label className="filter-label">最近截稿日期范围</label>
        <div className="date-pair"><input type="date" aria-label="开始日期" value={filters.from} onChange={e => change('from', e.target.value)} /><span>至</span><input type="date" aria-label="结束日期" value={filters.to} onChange={e => change('to', e.target.value)} /></div>
        <button className="save-filter" onClick={saveFilter}><BookmarkPlus size={16} /> 保存当前筛选</button>
        <div className="filter-footnote"><span className="tiny-dot" /> 未经当届官方核实的日期不会被补充推测。</div>
      </aside>

      <div className="results-panel">
        <div className="results-toolbar">
          <div><strong>{filtered.length}</strong><span> 条检索结果</span><small> · 含待公布日程</small></div>
          <div className="view-switch" role="group" aria-label="切换会议视图"><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><List size={16} /> 列表</button><button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')}><CalendarDays size={16} /> 日历</button></div>
        </div>

        {view === 'list' ? <div className="venue-list">
          {filtered.slice(0, limit).map(conf => {
            const state = deadlineState(conf.id, now);
            const row = nextDeadline(conf.id, now);
            const edition = getEdition(conf.id);
            const links=conferenceLinks.get(conf.id);
            const current=edition?.website ? {year:edition.year,url:edition.website,source:'curated-edition'}
              : links?.years?.[0];
            return <article key={conf.id} className="venue-row">
              <button className="venue-main" onClick={() => openConference(conf.id)}>
                <span className="venue-monogram">{conf.acronym.slice(0, 2).toUpperCase()}</span>
                <span className="venue-identity"><span className="venue-title">{conf.acronym} <GradeTag grade={conf.ccf} year={conf.ccfYear} /></span><span className="venue-subtitle">{conf.name}</span><span className="venue-field">{conf.fieldZh} {latestAcceptance(conf.id) && <span className="acceptance-tiny">· {latestAcceptance(conf.id)?.year} 录用率 {latestAcceptance(conf.id)?.rate}%</span>}</span></span>
              </button>
              <div className="deadline-wrapper"><button className="deadline-cell" onClick={() => openConference(conf.id)}>
                {state === 'upcoming' && row ? <>
                  <span className="deadline-main">{displayEvent(row.event, zone)}</span>
                  <span className="deadline-sub">{row.edition.year} · {row.track.name} · {kindLabel[row.event.kind]}</span>
                  <span className="countdown-small"><Clock3 size={13} /> {countdown(row.event, now)}</span>
                </> : state === 'closed' ? <><span className="state-closed">本轮已截止</span><span className="deadline-sub">{row?.edition.year || ''} · 查看历史时间线</span></> :
                  <><span className="state-tbd">TBD</span><span className="deadline-sub">暂无可核验的当届截稿</span></>}
              </button>{current && <a className="conference-year-link"
                href={current.url} target="_blank" rel="noopener noreferrer">
                {current.year} 年网站 {current.source==='ccfddl'?'· 社区收录':''} <ExternalLink size={12}/>
              </a>}
              {!current && (links?.website||conf.website)&&<a className="conference-year-link"
                href={links?.website||conf.website||undefined} target="_blank" rel="noopener noreferrer">
                会议主页 <ExternalLink size={12}/>
              </a>}</div>
              <FavoriteButton active={academic.conferences.includes(conf.id)} onClick={() => toggleFavorite(conf.id)} label={conf.acronym} />
            </article>;
          })}
          {!filtered.length && <EmptyState title="没有匹配的会议" description="试试放宽筛选条件，或查看尚未公布日期的会议。" />}
          {filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 18)}>加载更多 · 剩余 {filtered.length - limit} 条</button>}
        </div> : <div className="calendar-shell">
          <div className="calendar-toolbar"><div><strong>{year} 年 {monthNumber + 1} 月</strong><small>按当前所选时区排列</small></div><div className="month-controls"><button aria-label="上个月" onClick={() => setMonth(new Date(year, monthNumber - 1, 1))}><ChevronLeft size={18} /></button><button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>本月</button><button aria-label="下个月" onClick={() => setMonth(new Date(year, monthNumber + 1, 1))}><ChevronRight size={18} /></button></div></div>
          <div className="calendar-grid">{['一','二','三','四','五','六','日'].map(day => <div key={day} className="calendar-weekday">周{day}</div>)}
            {Array.from({length: firstOffset}, (_, i) => <div className="calendar-day blank" key={'b' + i} />)}
            {Array.from({length: countDays}, (_, i) => { const day = i + 1; const key = monthKey(month) + '-' + String(day).padStart(2, '0'); const items = byDay.get(day) || []; return <div className={'calendar-day ' + (key === todayKey ? 'is-today' : '')} key={day}><span className="day-number">{day}</span>{items.slice(0, 3).map(row => <button key={row.edition.id + row.track.id + row.event.id} title={row.track.name + ' · ' + row.event.title} className={'calendar-event event-' + row.event.kind} onClick={() => openConference(row.conference.id)}><span>{row.conference.acronym}</span><small>{kindLabel[row.event.kind]}</small></button>)}{items.length > 3 && <span className="calendar-more">+{items.length - 3} 个节点</span>}</div>; })}
          </div>
          <div className="calendar-caption"><span className="tiny-dot" /> 仅显示已记录的官方时间；仅公布日期的事件不进行跨时区推算。</div>
        </div>}
      </div>
    </div>
    <div className="data-note"><FileDown size={16} /> 已覆盖 CCF 2026 全部会议推荐记录；历年录用率分别标注官方与社区来源；当届日程仅使用官方发布的时间，未核实项为 TBD。</div>
  </section>;
}
