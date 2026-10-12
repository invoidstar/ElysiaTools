import { useMemo, useState } from 'react';
import { ArrowUpRight, GitCompareArrows, LibraryBig, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, FavoriteButton, GradeTag } from '../components/Common';
import { matches, coverage, journalMetric } from '../lib/catalog';
import { DirectoryViz } from '../components/ResearchCharts';
import { MetricCoverage } from '../components/MetricCoverage';
import type { AcademicState, Journal } from '../types';

interface Props {
  journals: Journal[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  academic: AcademicState;
  toggleFavorite: (id: string) => void;
  toggleCompare: (id: string) => void;
  openJournal: (id: string) => void;
  openComparison: () => void;
  keyword: string;
  setKeyword: (value: string) => void;
}

const oaText: Record<string, string> = { open: '开放获取', hybrid: 'Hybrid OA', subscription: '订阅', unknown: '尚未核验' };

export function JournalPage({ journals, loading, error, retry, academic, toggleFavorite, toggleCompare, openJournal, openComparison, keyword, setKeyword }: Props) {
  const getMetric = journalMetric;
  const count = (system: string) => journals.filter(j => j.indicators.some(m => m.system === system)).length;
  const [grade, setGrade] = useState('');
  const [field, setField] = useState('');
  const [oa, setOa] = useState('');
  const [publisher, setPublisher] = useState('');
  const [indicator, setIndicator] = useState('');
  const [tier, setTier] = useState('');
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
      (!indicator || j.indicators.some(m => m.system===indicator && (!tier || (m.value===tier && (indicator==='jcr' || !m.category?.startsWith('小类:'))))))
    ).sort((a, b) => {
      const rank = { A: 0, B: 1, C: 2 };
      const av = a.ccf ? rank[a.ccf] : 3;
      const bv = b.ccf ? rank[b.ccf] : 3;
      return av - bv || a.acronym.localeCompare(b.acronym);
    }), [journals, keyword, grade, field, oa, publisher, indicator, tier]);

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setLimit(18); };
  const selected = academic.compare.map(id => journals.find(j => j.id === id)).filter((j): j is Journal => Boolean(j));

  return <section className="page-enter content-page">
    <div className="page-intro">
      <div className="eyebrow"><LibraryBig size={15} /> JOURNAL EXPLORER <span className="eyebrow-line" /></div>
      <h1>学术期刊<span className="accent-dot">.</span></h1>
      <p>查询中科院历史分区、新锐分区、JCR 学科分区与影响因子，并结合 CCF 目录选择目标期刊。</p>
      <div className="intro-stats"><span><b>{journals.length.toLocaleString('zh-CN')}</b> 本期刊收录</span><span><b>{coverage.uniqueCCFJournals}</b> 本 CCF 评级期刊</span><span>中科院 2025 · 新锐 2026 · JCR 2025</span></div>
    </div>
    <DirectoryViz type="journal" activeField={field} onField={value=>setFilter(setField,value)}/>
    <MetricCoverage journals={journals} loading={loading}/>
    <div className="explorer-layout">
      <aside className="filter-panel">
        <div className="panel-title"><SlidersHorizontal size={17} /><strong>筛选条件</strong><button className="text-button" onClick={() => { setKeyword(''); setGrade(''); setField(''); setOa(''); setPublisher(''); setIndicator(''); setTier(''); }}>重置</button></div>
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
        <label className="filter-label" htmlFor="jour-indicator">期刊评价体系</label>
        <select id="jour-indicator" className="select-input" value={indicator} onChange={e=>{setFilter(setIndicator,e.target.value);setTier('');}}>
          <option value="">不限 · 显示全部期刊</option>
          <option value="cas" disabled={!loading&&count('cas')===0}>中科院历史 2025 · {count('cas').toLocaleString('zh-CN')} 本</option>
          <option value="xinrui" disabled={!loading&&count('xinrui')===0}>新锐 2026 · {count('xinrui').toLocaleString('zh-CN')} 本</option>
          <option value="jcr" disabled={!loading&&count('jcr')===0}>JCR 2025 · {count('jcr').toLocaleString('zh-CN')} 本</option>
          <option value="jif" disabled={!loading&&count('jif')===0}>JIF 2025 · {count('jif').toLocaleString('zh-CN')} 本</option>
        </select>
        <label className="filter-label" htmlFor="jour-tier">分区等级</label>
        <select id="jour-tier" className="select-input" disabled={!indicator || indicator==='jif'} value={tier} onChange={e=>setFilter(setTier,e.target.value)}>
          <option value="">全部等级</option>
          {(indicator==='jcr'?['Q1','Q2','Q3','Q4']:['1区','2区','3区','4区']).map(v=><option key={v} value={v}>{v}</option>)}
        </select>
        <div className="filter-footnote"><span className="tiny-dot" /> 中科院和新锐等级按大类筛选；JCR 按任一学科分区匹配。各评价体系与年份独立，不合并为统一评级。</div>

      </aside>
      <div className="results-panel">
        <div className="results-toolbar"><div><strong>{loading?'…':filtered.length.toLocaleString('zh-CN')}</strong><span> 条检索结果</span><small> · 按 CCF 等级整理</small></div><span className="muted small-text">公开来源与指标年份明确 · 最多对比 4 本</span></div>
        <div className="venue-list">
          {loading && <div className="metric-empty"><EmptyState title="正在加载完整期刊数据库" description="约 2.3 万种期刊的分区资料正在载入，无需下载或上传文件。"/></div>}
          {error && <div className="metric-empty"><EmptyState title="暂时无法载入完整期刊数据库" description="请检查网络后重试，当前不会将数据缺失误判为无分区。"/><button className="secondary-button" onClick={retry}>重新加载数据</button></div>}
          {!loading && !error && filtered.slice(0, limit).map(j => <article key={j.id} className="venue-row journal-row">
            <button className="venue-main" onClick={() => openJournal(j.id)}>
              <span className="venue-monogram journal-monogram">{j.acronym.slice(0, 2).toUpperCase()}</span>
              <span className="venue-identity"><span className="venue-title">{j.acronym} <GradeTag grade={j.ccf} year={j.ccfYear} /></span>{j.name!==j.acronym && <span className="venue-subtitle">{j.name}</span>}<span className="venue-field">{j.fieldZh}</span></span>
            </button>
            <button className="journal-publisher" onClick={() => openJournal(j.id)}>
              <strong>{j.publisher || '出版社待核验'}</strong>
              <span>{j.issn ? 'ISSN ' + j.issn : 'ISSN 待补充'}</span>
              <small>{oaText[j.oa]}</small>
              <span className="journal-quick-metrics">
                {(['cas','xinrui','jcr','jif'] as const).filter(sys=>getMetric(j,sys)).map(sys=><span className={'journal-metric-preview source-'+sys} key={sys}>{({cas:'中科院',xinrui:'新锐',jcr:'JCR',jif:'JIF'})[sys]} {getMetric(j,sys)?.value}</span>)}
              </span>
            </button>
            <div className="row-actions">
              <label className={'compare-toggle ' + (academic.compare.includes(j.id) ? 'checked' : '')} title="添加期刊对比">
                <input type="checkbox" checked={academic.compare.includes(j.id)} onChange={() => toggleCompare(j.id)} /><GitCompareArrows size={15} /><span>对比</span>
              </label>
              <FavoriteButton active={academic.journals.includes(j.id)} onClick={() => toggleFavorite(j.id)} label={j.acronym} />
            </div>
          </article>)}
          {!loading && !error && !filtered.length && <div className="metric-empty">
              <EmptyState title="当前条件下没有匹配的期刊" description={indicator ? '现有公开记录中没有匹配项，可调整筛选条件，或前往相应官方平台查询。' : '调整筛选条件，或尝试使用期刊全称搜索。'}/>
              <button className="secondary-button" onClick={()=>{setGrade('');setField('');setPublisher('');setOa('');setIndicator('');setTier('');setKeyword('');}}>清除筛选，查看完整目录</button>
            </div>}
          {!loading && !error && filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 18)}>加载更多 · 剩余 {filtered.length - limit} 条</button>}
        </div>
      </div>
    </div>
    <div className="data-note"><LibraryBig size={16} /> CCF 2026 完整目录与授权的年度期刊分区快照独立管理。分区与影响因子标明对应年份；空缺表示本版本未匹配到记录，并非无评价。</div>
    {selected.length > 0 && <div className="compare-dock"><div className="compare-summary"><GitCompareArrows size={18} /><strong>期刊对比</strong><span>{selected.length} / 4</span></div><div className="compare-chips">{selected.map(j => <button onClick={() => toggleCompare(j.id)} key={j.id}>{j.acronym}<X size={13} /></button>)}</div><button className="primary-button" onClick={openComparison}>开始比较 <ArrowUpRight size={16} /></button></div>}
  </section>;
}
