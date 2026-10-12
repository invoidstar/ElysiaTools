import { ArrowUpRight, CalendarPlus, CheckCircle2, Clock3, ExternalLink, GitCompareArrows, Info, Link2, MapPin, Star, X } from 'lucide-react';
import { GradeTag, SourceAnchor } from './Common';
import { JournalDiagnostics } from './JournalDiagnostics';
import { AcceptanceTrend, JournalMetricCards, JournalPublicationCount } from './ResearchCharts';
import { ccfEntries, getConference, getEdition, getJournal, getSource, isFuture, sourceForRow } from '../lib/catalog';
import { countdown, displayEvent, kindLabel, originalDate, prettyDate, type ZoneChoice } from '../lib/time';
import { calendarICS } from '../lib/ics';
import { downloadContent } from '../lib/storage';
import type { AcademicState, DeadlineRow, Journal } from '../types';

interface Props {
  journalRecord?: Journal;
  kind: 'conference' | 'journal';
  id: string;
  onClose: () => void;
  academic: AcademicState;
  toggleFavorite: (kind: 'conference' | 'journal', id: string) => void;
  toggleCompare: (id: string) => void;
  zone: ZoneChoice;
  now: number;
}

export function DetailDrawer({ journalRecord, kind, id, onClose, academic, toggleFavorite, toggleCompare, zone, now }: Props) {
  const c = kind === 'conference' ? getConference(id) : undefined;
  const j = kind === 'journal' ? (journalRecord||getJournal(id)) : undefined;
  const edition = c ? getEdition(c.id) : undefined;
  if (!c && !j) return null;
  const item = c || j!;
  const saved = c ? academic.conferences.includes(id) : academic.journals.includes(id);
  const allRows: DeadlineRow[] = c && edition ? edition.tracks.flatMap(track => track.events.map(event => ({ conference: c, edition, track, event }))) : [];
  const handleICS = () => downloadContent(item.acronym.toLowerCase().replace(/\W/g, '-') + '-deadlines.ics', calendarICS(allRows, false), 'text/calendar;charset=utf-8');

  return <div className="drawer-backdrop" onClick={onClose}>
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={item.name} onClick={e => e.stopPropagation()}>
      <div className="drawer-top"><span className="drawer-kicker">ACADEMIC DIRECTORY / {kind === 'conference' ? 'CONFERENCE' : 'JOURNAL'}</span><button className="icon-button" onClick={onClose} aria-label="关闭详情"><X size={20} /></button></div>
      <div className="drawer-heading"><span className="detail-avatar">{item.acronym.slice(0, 2).toUpperCase()}</span><div><div className="detail-title-line"><h2>{item.acronym}</h2><GradeTag grade={item.ccf} year={item.ccfYear} /></div><p>{item.name}</p></div></div>
      <div className="detail-tags"><span>{item.fieldZh}</span>{item.ccf ? <span>CCF · {item.ccfYear} 版</span> : <span>未列入 CCF 推荐目录</span>}{ccfEntries(item).length>0 && <span>{ccfEntries(item).length} 条领域推荐</span>}{c && edition && <span>{edition.year} Edition</span>}</div>
      <div className="drawer-actions">
        <button className="primary-button" onClick={() => toggleFavorite(kind, id)}><Star size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? '已收藏' : '加入收藏'}</button>
        {c && <button className="secondary-button" onClick={handleICS} disabled={!allRows.length}><CalendarPlus size={16} /> 导出 .ics</button>}
        {j && <button className="secondary-button" onClick={() => toggleCompare(j.id)}><GitCompareArrows size={16} />{academic.compare.includes(j.id) ? '移出对比' : '加入对比'}</button>}
      </div>
      <div className="drawer-scroll">
        {c ? <>
          <section className="drawer-section"><h3>会议信息 <span>OVERVIEW</span></h3>
            <div className="info-grid">
              <div><span>会议年度</span><strong>{edition ? edition.year : '尚未收录当届'}</strong></div>
              <div><span>召开时间</span><strong>{edition?.meetingStart ? prettyDate(edition.meetingStart) + (edition.meetingEnd ? ' — ' + prettyDate(edition.meetingEnd) : '') : 'TBD'}</strong></div>
              <div><span>举办地点</span><strong>{edition?.location || 'TBD'}</strong></div>
              <div><span>数据最后核验</span><strong>{edition?.verifiedAt || '待核验'}</strong></div>
            </div>
            <div className="link-stack"><SourceAnchor href={c.website}>会议官方网站 <ArrowUpRight size={14} /></SourceAnchor><SourceAnchor href={c.indexUrl}>学术索引 / DBLP</SourceAnchor></div>
          </section>
          <section className="drawer-section"><h3>历年录用趋势 <span>ACCEPTANCE HISTORY</span></h3>
            <AcceptanceTrend conferenceId={c.id}/>
          </section>
          <section className="drawer-section"><h3>CCF 分类领域 <span>CCF 2026</span></h3>
            <div className="ccf-class-list">{ccfEntries(c).map(entry=><div key={entry.field}><span>{entry.fieldZh}</span><GradeTag grade={entry.grade} year={entry.year}/></div>)}</div>
          </section>
          <section className="drawer-section"><h3>投稿时间线 <span>SUBMISSION TIMELINE</span></h3>
            {!edition && <div className="notice-soft"><Info size={17} /> 当前尚未收录有官方来源的当届日程。历史日期不会自动套用。</div>}
            {edition?.tracks.map(track => <div key={track.id} className="track-block">
              <div className="track-heading"><span className="track-index" /><strong>{track.name}</strong><span>{track.events.length} 个已记录节点</span></div>
              {track.events.length ? <div className="track-events">{track.events.map(event => {
                const row: DeadlineRow = { conference: c, edition, track, event };
                const source = sourceForRow(row);
                const future = isFuture(event, now);
                return <div key={event.id} className="timeline-item">
                  <div className={'timeline-dot ' + (future ? 'future' : '')} />
                  <div className="timeline-content"><span className="timeline-type">{kindLabel[event.kind]}</span><strong>{event.title}</strong><p>{displayEvent(event, zone)} {event.precision === 'minute' && future && <span className="deadline-mini"><Clock3 size={12} /> {countdown(event, now)}</span>}</p><div className="original-time">原始时间：{originalDate(event)}</div>{source && <a href={source.url} target="_blank" rel="noreferrer" className="micro-link"><Link2 size={12} /> 官方来源 <ExternalLink size={11} /></a>}</div>
                </div>;
              })}</div> : <div className="pending-item">该投稿轮次尚未发布可核验的时间节点。</div>}
              {track.pending.length > 0 && <div className="pending-list"><b>待公布 / TBD</b>{track.pending.map(p => <span key={p}>{p}</span>)}</div>}
            </div>)}
          </section>
          <section className="drawer-section"><h3>来源与更新 <span>PROVENANCE</span></h3>
            <div className="source-panel"><CheckCircle2 size={18} /><div><strong>当届官方信息</strong><p>{edition ? '本届条目依据官方页面整理；核验日期 ' + edition.verifiedAt : '当前未收录官方当届截止日期。'}</p><SourceAnchor href={edition ? getSource(edition.sourceId)?.url : getSource(c.sourceId)?.url}>查看原始来源</SourceAnchor></div></div>
            <div className="small-note">数据变更历史：{edition?.changeLog.length ? edition.changeLog.map(x => x.date + ' · ' + x.note).join('；') : '首版记录，暂无已核实的修改事件。'} 如与官网冲突，请以官方公告为准。</div>
          </section>
        </> : j && <>
          <section className="drawer-section"><h3>期刊信息 <span>OVERVIEW</span></h3>
            <div className="info-grid">
              <div><span>出版社</span><strong>{j.publisher || '待核验'}</strong></div>
              <div><span>开放获取</span><strong>{{open:'Open Access',hybrid:'Hybrid OA',subscription:'Subscription',unknown:'未核验'}[j.oa]}</strong></div>
              <div><span>ISSN / ISSN-L</span><strong>{j.issn || '待核验'} / {j.issnL || '—'}</strong></div>
              <div><span>eISSN</span><strong>{j.eissn || '待核验'}</strong></div>{!!j.extraIssns?.length&&<div><span>其他 ISSN</span><strong>{j.extraIssns.join('、')}</strong></div>}
            </div>
            <div className="link-stack"><SourceAnchor href={j.website}>期刊官方网站 <ArrowUpRight size={14} /></SourceAnchor><SourceAnchor href={j.indexUrl}>学术索引 / DBLP</SourceAnchor>{j.identifierSource && <SourceAnchor href={j.identifierSource}>标识符来源</SourceAnchor>}
              <a className="source-link" href={'https://www.letpub.com.cn/index.php?page=journalapp&view=search&searchname='+encodeURIComponent(j.name)} target="_blank" rel="noopener noreferrer">LetPub 期刊查询 <ExternalLink size={13}/></a></div>
          </section>
          <section className="drawer-section"><h3>学术评价 <span>INDICATORS</span></h3>
            <div className="ccf-class-list">{ccfEntries(j).length ? ccfEntries(j).map(entry=><div key={entry.field}><span>{entry.fieldZh}</span><GradeTag grade={entry.grade} year={entry.year}/></div>):<div><span>本期刊不在已收录的 CCF 2026 目录中</span></div>}</div>
            <JournalMetricCards journal={j}/>
            <JournalPublicationCount journal={j}/>
            <JournalDiagnostics journal={j}/>
            <div className="notice-soft"><Info size={17} /> 中科院历史 2025、新锐 2026 与 JCR 是不同评价体系。本页面展示经许可的年度数据快照，保留大类、小类与 JCR 学科分类。不同体系不能直接互换；请以原始评价机构发布的数据为准。JIF 标注指标数据年份。</div>
          </section>
          <section className="drawer-section"><h3>研究范围与投稿 <span>SCOPE & SUBMISSION</span></h3><p className="body-muted">所属领域：{ccfEntries(j).map(e=>e.fieldZh).join("、") || j.fieldZh}。Aims &amp; Scope、文章类型及 APC 应以出版社的最新说明为准，未核实的费用和审稿周期暂不展示。</p><SourceAnchor href={j.website}>前往期刊官方页面查看投稿说明</SourceAnchor></section>
          <section className="drawer-section"><h3>来源与标识 <span>PROVENANCE</span></h3><div className="source-panel"><CheckCircle2 size={18} /><div><strong>{j.ccf ? 'CCF 2026 推荐目录' : '出版社 / ISSN 资料'}</strong><p>等级与身份数据来源分离管理；尚未完成核验的字段明确留空。</p><SourceAnchor href={getSource(j.sourceId)?.url}>查看记录来源</SourceAnchor></div></div></section>
        </>}
        <div className="detail-end"><MapPin size={15} /> ElysiaTools · Research, Made Easier.</div>
      </div>
    </aside>
  </div>;
}
