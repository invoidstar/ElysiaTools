import { Archive, CalendarDays, Clock3, Download, FileDown, FolderHeart, GitCompareArrows, Import, Star, Trash2, Upload } from 'lucide-react';
import { EmptyState, GradeTag } from '../components/Common';
import { conferences, deadlineRows, eventMillis, getConference, isFuture, sourceForRow } from '../lib/catalog';
import { countdown, displayEvent, kindLabel, type ZoneChoice } from '../lib/time';
import type { AcademicState, Journal } from '../types';
import type { ChangeEvent } from 'react';

interface Props {
  journals: Journal[];
  academic: AcademicState;
  zone: ZoneChoice;
  now: number;
  toggleFavorite: (kind: 'conference' | 'journal', id: string) => void;
  openConference: (id: string) => void;
  openJournal: (id: string) => void;
  exportData: () => void;
  importData: (text: string) => void;
  exportCalendar: () => void;
  restoreFilter: (id: string) => void;
  removeFilter: (id: string) => void;
  openComparison: () => void;
}

export function AcademicPage({ journals, academic, zone, now, toggleFavorite, openConference, openJournal, exportData, importData, exportCalendar, restoreFilter, removeFilter, openComparison }: Props) {
  const favorites = academic.conferences.map(getConference).filter((c): c is (typeof conferences)[number] => Boolean(c));
  const savedJournals = academic.journals.map(id=>journals.find(j=>j.id===id)).filter((j): j is (typeof journals)[number] => Boolean(j));
  const upcoming = deadlineRows.filter(r => academic.conferences.includes(r.conference.id) && isFuture(r.event, now))
    .sort((a, b) => eventMillis(a.event) - eventMillis(b.event)).slice(0, 12);

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert('备份文件不能超过 1 MB'); return; }
      try { importData(await file.text()); } catch { alert('文件读取失败'); }
    }
    e.target.value = '';
  }

  return <section className="page-enter content-page academic-page">
    <div className="page-intro">
      <div className="eyebrow"><FolderHeart size={16} /> MY ACADEMIC <span className="eyebrow-line" /></div>
      <h1>我的科研工作台<span className="accent-dot">.</span></h1>
      <p>收藏重要的学术目标，把分散的信息组织成自己的研究视野。</p>
      <div className="intro-stats"><span>无需账号</span><span>浏览器本地保存</span><span>支持 JSON / iCalendar 导出</span></div>
    </div>

    <div className="academic-stats">
      <div><Star size={20} /><strong>{favorites.length}</strong><span>关注会议</span></div>
      <div><Archive size={20} /><strong>{savedJournals.length}</strong><span>收藏期刊</span></div>
      <div><Clock3 size={20} /><strong>{upcoming.length}</strong><span>近期时间节点</span></div>
      <div><GitCompareArrows size={20} /><strong>{academic.compare.length}</strong><span>期刊对比清单</span></div>
    </div>

    <div className="academic-layout">
      <div className="academic-main">
        <section className="surface-section">
          <div className="section-heading"><div><span className="section-overline">01 / TRACKING</span><h2>我的截稿日历</h2></div><button className="secondary-button" disabled={!upcoming.length} onClick={exportCalendar}><FileDown size={16} /> 导出 .ics</button></div>
          {upcoming.length ? <div className="personal-deadlines">{upcoming.map(r => <button key={r.edition.id + r.track.id + r.event.id} onClick={() => openConference(r.conference.id)} className="personal-deadline"><div className="personal-date">{r.event.original.slice(5, 10).replace('-', '/')}<small>{r.event.original.slice(0, 4)}</small></div><div className="personal-detail"><strong>{r.conference.acronym} · {r.event.title}</strong><span>{r.edition.year} / {r.track.name} / {kindLabel[r.event.kind]}</span><small>{displayEvent(r.event, zone)} · {r.event.precision === 'minute' ? countdown(r.event, now) : '仅公布日期'}</small></div><span className="personal-source">{sourceForRow(r)?.owner || 'Official'}</span></button>)}</div> :
            <EmptyState title="暂无即将到来的关注节点" description="在会议列表中点击星标，即可将会议日程汇总到这里。" />}
        </section>
        <section className="surface-section">
          <div className="section-heading"><div><span className="section-overline">02 / FAVORITES</span><h2>关注的会议</h2></div><span className="section-count">{favorites.length} 场</span></div>
          {favorites.length ? <div className="saved-venue-list">{favorites.map(c=><div className="saved-venue" key={c.id}><button onClick={()=>openConference(c.id)}><strong>{c.acronym}</strong><span>{c.name}</span></button><GradeTag grade={c.ccf}/><button className="icon-button" aria-label={'取消收藏 ' + c.acronym} onClick={()=>toggleFavorite('conference', c.id)}><Trash2 size={16}/></button></div>)}</div> :
            <EmptyState title="还没有收藏会议" description="寻找你正在关注的投稿目标，使用星标将其加入这里。" />}
        </section>
        <section className="surface-section">
          <div className="section-heading"><div><span className="section-overline">03 / JOURNALS</span><h2>收藏的期刊</h2></div><span className="section-count">{savedJournals.length} 本</span></div>
          {savedJournals.length ? <div className="saved-venue-list">{savedJournals.map(j=><div className="saved-venue" key={j.id}><button onClick={()=>openJournal(j.id)}><strong>{j.acronym}</strong><span>{j.name}</span></button><GradeTag grade={j.ccf}/><button className="icon-button" aria-label={'取消收藏 ' + j.acronym} onClick={()=>toggleFavorite('journal', j.id)}><Trash2 size={16}/></button></div>)}</div> :
            <EmptyState title="还没有收藏期刊" description="浏览期刊目录，把备选投稿目标保存在这里。" />}
          {!!academic.compare.length && <button className="secondary-button compare-from-academic" onClick={openComparison}><GitCompareArrows size={16}/> 查看期刊比较清单（{academic.compare.length}）</button>}
        </section>
      </div>
      <aside className="academic-aside">
        <section className="surface-section"><div className="section-heading"><div><span className="section-overline">MY WORKSPACE</span><h2>数据与备份</h2></div></div>
          <p className="body-muted">你的收藏、对比列表及筛选偏好只存放在当前浏览器，不会发送到服务器。建议定期导出备份。</p>
          <div className="backup-actions"><button className="primary-button" onClick={exportData}><Download size={16} /> 导出 JSON 备份</button><label className="secondary-button upload-label"><Upload size={16} /> 导入 JSON 备份<input type="file" accept=".json,application/json" onChange={handleImport} /></label></div>
          <div className="privacy-tip"><Import size={15} /> 导入将替换当前收藏和筛选设置。</div>
        </section>
        <section className="surface-section"><div className="section-heading"><div><span className="section-overline">QUICK ACCESS</span><h2>保存的筛选</h2></div></div>
          {academic.savedFilters.length ? <div className="saved-filters">{academic.savedFilters.map(f=><div key={f.id}><button onClick={()=>restoreFilter(f.id)}><span>{f.label}</span><small>一键恢复筛选</small></button><button className="icon-button" onClick={()=>removeFilter(f.id)} title="删除筛选"><Trash2 size={15}/></button></div>)}</div> : <p className="body-muted">在 Conference Explorer 的侧边栏可以保存常用检索条件。</p>}
        </section>
        <section className="workspace-quote"><CalendarDays size={23} /><h3>Less searching.<br/>More researching.</h3><p>掌握重要日期，把时间留给真正的研究。</p></section>
      </aside>
    </div>
  </section>;
}
