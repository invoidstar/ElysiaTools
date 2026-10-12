import { useMemo, useState } from 'react';
import { ArrowUpRight, GitCompareArrows, LibraryBig, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, FavoriteButton, GradeTag } from '../components/Common';
import { journals, matches, journalMetric, coverage } from '../lib/catalog';
import { DirectoryViz } from '../components/ResearchCharts';
import type { AcademicState, Journal } from '../types';

interface Props {
  academic: AcademicState;
  toggleFavorite: (id: string) => void;
  toggleCompare: (id: string) => void;
  openJournal: (id: string) => void;
  openComparison: () => void;
  keyword: string;
  setKeyword: (value: string) => void;
}

const oaText: Record<string, string> = { open: '开放获取', hybrid: 'Hybrid OA', subscription: '订阅', unknown: '尚未核验' };

export function JournalPage({ academic, toggleFavorite, toggleCompare, openJournal, openComparison, keyword, setKeyword }: Props) {
  const [grade, setGrade] = useState('');
  const [field, setField] = useState('');
  const [oa, setOa] = useState('');
  const [publisher, setPublisher] = useState('');
  const [indicator, setIndicator] = useState('');
  const [limit, setLimit] = useState(18);
  const fields = [...new Set(journals.flatMap(j => [j.field, ...(j.additionalFields || [])]))].sort();
  const publishers = [...new Set(journals.map(j => j.publisher).filter((p): p is string => Boolean(p)))].sort();
  const filtered = useMemo(() =>
    journals.filter(j =>
      matches(j, keyword) &&
      (!grade || (grade === 'unset' ? !j.ccf : j.ccf === grade)) &&
      (!field || j.field === field || j.additionalFields?.includes(field)) &&
      (!oa || j.oa === oa) &&
      (!publisher || j.publisher === publisher) &&
      (!indicator || j.indicators.some(i => i.system === indicator))
    ).sort((a, b) => {
      const rank = { A: 0, B: 1, C: 2 };
      const av = a.ccf ? rank[a.ccf] : 3;
      const bv = b.ccf ? rank[b.ccf] : 3;
      return av - bv || a.acronym.localeCompare(b.acronym);
    }), [keyword, grade, field, oa, publisher, indicator]);

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setLimit(18); };
  const selected = academic.compare.map(id => journals.find(j => j.id === id)).filter((j): j is Journal => Boolean(j));

  return <section className="page-enter content-page">
    <div className="page-intro">
      <div className="eyebrow"><LibraryBig size={15} /> JOURNAL EXPLORER <span className="eyebrow-line" /></div>
      <h1>学术期刊<span className="accent-dot">.</span></h1>
      <p>清晰了解研究范围、CCF 推荐分类和出版信息，让期刊选择更有依据。</p>
      <div className="intro-stats"><span><b>{coverage.uniqueCCFJournals}</b> 本 CCF 评级期刊</span><span><b>{coverage.journalRows}</b> 条目录推荐</span><span>10 个研究领域 · 独立指标体系</span></div>
    </div>
    <DirectoryViz type="journal" activeField={field} onField={value=>setFilter(setField,value)}/>
    <div className="explorer-layout">
      <aside className="filter-panel">
        <div className="panel-title"><SlidersHorizontal size={17} /><strong>筛选条件</strong><button className="text-button" onClick={() => { setKeyword(''); setGrade(''); setField(''); setOa(''); setPublisher(''); setIndicator(''); }}>重置</button></div>
        <label className="filter-label">检索期刊</label>
        <div className="field-with-icon"><Search size={17} /><input value={keyword} onChange={e => setFilter(setKeyword, e.target.value)} placeholder="名称 / 简称 / 领域" /></div>
        <label className="filter-label">CCF 推荐等级</label>
        <div className="chip-choice">{['','A','B','C'].map(g => <button key={g || 'all'} className={'chip ' + (grade === g ? 'active' : '')} onClick={() => setFilter(setGrade, g)}>{g ? 'CCF ' + g : '全部'}</button>)}</div>
        <label className="filter-label" htmlFor="jour-field">研究领域</label>
        <select id="jour-field" className="select-input" value={field} onChange={e => setFilter(setField, e.target.value)}><option value="">全部领域</option>{fields.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <label className="filter-label" htmlFor="jour-oa">开放获取</label>
        <select id="jour-oa" className="select-input" value={oa} onChange={e => setFilter(setOa, e.target.value)}><option value="">全部类型</option>{Object.entries(oaText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label className="filter-label" htmlFor="jour-publisher">出版社</label>
        <select id="jour-publisher" className="select-input" value={publisher} onChange={e=>setFilter(setPublisher,e.target.value)}><option value="">全部出版社</option>{publishers.map(p=><option key={p} value={p}>{p}</option>)}</select>
        <label className="filter-label" htmlFor="jour-indicator">已验证指标</label>
        <select id="jour-indicator" className="select-input" value={indicator} onChange={e=>setFilter(setIndicator,e.target.value)}><option value="">不限 / 包含待核验</option><option value="jif">已公开影响因子</option><option value="jcr">已公开 JCR 分区</option><option value="cas">2025 中科院历史分区</option><option value="xinrui">2026 新锐分区</option></select>
        <div className="filter-footnote"><span className="tiny-dot" /> 中科院 2025、新锐 2026 与 JCR 分区独立展示。尚无合法来源的数据保留「—」，支持跳转官方查询。</div>
      </aside>
      <div className="results-panel">
        <div className="results-toolbar"><div><strong>{filtered.length}</strong><span> 条检索结果</span><small> · 按 CCF 等级整理</small></div><span className="muted small-text">最多选择 4 本期刊比较</span></div>
        <div className="venue-list">
          {filtered.slice(0, limit).map(j => <article key={j.id} className="venue-row journal-row">
            <button className="venue-main" onClick={() => openJournal(j.id)}>
              <span className="venue-monogram journal-monogram">{j.acronym.slice(0, 2).toUpperCase()}</span>
              <span className="venue-identity"><span className="venue-title">{j.acronym} <GradeTag grade={j.ccf} year={j.ccfYear} /></span><span className="venue-subtitle">{j.name}</span><span className="venue-field">{j.field}</span></span>
            </button>
            <button className="journal-publisher" onClick={() => openJournal(j.id)}>
              <strong>{j.publisher || '出版社待核验'}</strong>
              <span>{j.issn ? 'ISSN ' + j.issn : 'ISSN 待补充'}</span>
              <small>{oaText[j.oa]}</small>
              {journalMetric(j,'jif') && <span className="journal-metric-preview">JIF {journalMetric(j,'jif')?.value} · {journalMetric(j,'jif')?.year}</span>}
            </button>
            <div className="row-actions">
              <label className={'compare-toggle ' + (academic.compare.includes(j.id) ? 'checked' : '')} title="添加期刊对比">
                <input type="checkbox" checked={academic.compare.includes(j.id)} onChange={() => toggleCompare(j.id)} /><GitCompareArrows size={15} /><span>对比</span>
              </label>
              <FavoriteButton active={academic.journals.includes(j.id)} onClick={() => toggleFavorite(j.id)} label={j.acronym} />
            </div>
          </article>)}
          {!filtered.length && <EmptyState title="没有匹配的期刊" description="调整筛选条件，或尝试使用期刊全称进行搜索。" />}
          {filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 18)}>加载更多 · 剩余 {filtered.length - limit} 条</button>}
        </div>
      </div>
    </div>
    <div className="data-note"><LibraryBig size={16} /> 已完整导入 CCF 2026 国际期刊目录。2025 中科院和 2026 新锐分区不属于同一体系；受授权限制的指标可在详情页访问官方渠道。</div>
    {selected.length > 0 && <div className="compare-dock"><div className="compare-summary"><GitCompareArrows size={18} /><strong>期刊对比</strong><span>{selected.length} / 4</span></div><div className="compare-chips">{selected.map(j => <button onClick={() => toggleCompare(j.id)} key={j.id}>{j.acronym}<X size={13} /></button>)}</div><button className="primary-button" onClick={openComparison}>开始比较 <ArrowUpRight size={16} /></button></div>}
  </section>;
}
