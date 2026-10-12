import { useMemo, useState } from 'react';
import { ArrowUpRight, GitCompareArrows, LibraryBig, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, FavoriteButton, GradeTag } from '../components/Common';
import { journals, matches } from '../lib/catalog';
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
  const [limit, setLimit] = useState(18);
  const fields = [...new Set(journals.map(j => j.field))].sort();
  const filtered = useMemo(() =>
    journals.filter(j =>
      matches(j, keyword) &&
      (!grade || (grade === 'unset' ? !j.ccf : j.ccf === grade)) &&
      (!field || j.field === field || j.additionalFields?.includes(field)) &&
      (!oa || j.oa === oa)
    ).sort((a, b) => {
      const rank = { A: 0, B: 1, C: 2 };
      const av = a.ccf ? rank[a.ccf] : 3;
      const bv = b.ccf ? rank[b.ccf] : 3;
      return av - bv || a.acronym.localeCompare(b.acronym);
    }), [keyword, grade, field, oa]);

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setLimit(18); };
  const selected = academic.compare.map(id => journals.find(j => j.id === id)).filter((j): j is Journal => Boolean(j));

  return <section className="page-enter content-page">
    <div className="page-intro">
      <div className="eyebrow"><LibraryBig size={15} /> JOURNAL EXPLORER <span className="eyebrow-line" /></div>
      <h1>学术期刊<span className="accent-dot">.</span></h1>
      <p>清晰了解研究范围、CCF 推荐分类和出版信息，让期刊选择更有依据。</p>
      <div className="intro-stats"><span><b>{journals.length}</b> 本精选期刊</span><span>CCF 第七版 · 2026</span><span>不混用不同评价指标</span></div>
    </div>
    <div className="explorer-layout">
      <aside className="filter-panel">
        <div className="panel-title"><SlidersHorizontal size={17} /><strong>筛选条件</strong><button className="text-button" onClick={() => { setKeyword(''); setGrade(''); setField(''); setOa(''); }}>重置</button></div>
        <label className="filter-label">检索期刊</label>
        <div className="field-with-icon"><Search size={17} /><input value={keyword} onChange={e => setFilter(setKeyword, e.target.value)} placeholder="名称 / 简称 / 领域" /></div>
        <label className="filter-label">CCF 推荐等级</label>
        <div className="chip-choice">{['','A','B','C'].map(g => <button key={g || 'all'} className={'chip ' + (grade === g ? 'active' : '')} onClick={() => setFilter(setGrade, g)}>{g ? 'CCF ' + g : '全部'}</button>)}</div>
        <label className="filter-label" htmlFor="jour-field">研究领域</label>
        <select id="jour-field" className="select-input" value={field} onChange={e => setFilter(setField, e.target.value)}><option value="">全部领域</option>{fields.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <label className="filter-label" htmlFor="jour-oa">开放获取</label>
        <select id="jour-oa" className="select-input" value={oa} onChange={e => setFilter(setOa, e.target.value)}><option value="">全部类型</option>{Object.entries(oaText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <div className="filter-footnote"><span className="tiny-dot" /> JCR / JIF / 中科院历史分区仅在具有合法、可核验数据时展示。</div>
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
    <div className="data-note"><LibraryBig size={16} /> CCF 采用 2026 第七版。期刊评价指标按体系、学科与年份独立展示；空缺信息不会推测。</div>
    {selected.length > 0 && <div className="compare-dock"><div className="compare-summary"><GitCompareArrows size={18} /><strong>期刊对比</strong><span>{selected.length} / 4</span></div><div className="compare-chips">{selected.map(j => <button onClick={() => toggleCompare(j.id)} key={j.id}>{j.acronym}<X size={13} /></button>)}</div><button className="primary-button" onClick={openComparison}>开始比较 <ArrowUpRight size={16} /></button></div>}
  </section>;
}
