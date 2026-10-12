import { Download, ExternalLink, GitCompareArrows, X } from 'lucide-react';
import { GradeTag } from './Common';
import { ccfEntries, getSource } from '../lib/catalog';
import { downloadContent } from '../lib/storage';
import type { AcademicState, Journal } from '../types';

interface Props { journals: Journal[]; academic: AcademicState; onClose: () => void; toggleCompare: (id: string) => void; }
const oaName = { open: '开放获取', hybrid: 'Hybrid OA', subscription: '订阅制', unknown: '尚未核验' };
const ccfLabel = (j:Journal)=>ccfEntries(j).map(r=>r.field+' · '+r.grade).join('；')||'—';

export function JournalCompare({ journals, academic, onClose, toggleCompare }: Props) {
  const indicator = (j:Journal,system:string)=>{
    const found=j.indicators.filter(m=>m.system===system).sort((a,b)=>b.year-a.year);
    return found.length ? found.map(m=>(m.category?m.category+': ':'')+m.value+' ['+m.year+']').join('；') : '—';
  };
  const selected = academic.compare.map(id => journals.find(j => j.id === id)).filter((j): j is Journal => Boolean(j));
  const exportCSV = () => {
    const data = [
      ['Comparison dimension', ...selected.map(j => j.acronym)],
      ['Full title', ...selected.map(j => j.name)],
      ['Research field', ...selected.map(j => [j.field, ...(j.additionalFields || [])].join('; '))],
      ['Publisher', ...selected.map(j => j.publisher || '')],
      ['CCF grade', ...selected.map(j => j.ccf || '')],
      ['CCF subject classifications', ...selected.map(ccfLabel)],
      ['CCF edition', ...selected.map(j => j.ccf ? '2026' : '')],
      ['ISSN', ...selected.map(j => j.issn || '')],
      ['eISSN', ...selected.map(j => j.eissn || '')],
      ['Open access', ...selected.map(j => oaName[j.oa])],
      ['JCR Quartile and metric year', ...selected.map(j=>indicator(j,'jcr'))],
      ['Journal Impact Factor and metric year', ...selected.map(j=>indicator(j,'jif'))],
      ['CAS 2025 historical division', ...selected.map(j=>indicator(j,'cas'))],
      ['Independent XinRui 2026 division', ...selected.map(j=>indicator(j,'xinrui'))],
      ['2025 publications (OpenAlex)', ...selected.map(()=>'Look up from journal details')],
      ['Official journal URL', ...selected.map(j => j.website || '')]
    ];
    const cell = (v: string) => '"' + v.replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + data.map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';
    downloadContent('ElysiaTools-journal-comparison.csv', csv, 'text/csv;charset=utf-8');
  };

  const rows: Array<{ label: string; value: (j: Journal) => React.ReactNode }> = [
    {label:'研究领域',value:j=>[j.fieldZh,...ccfEntries(j).filter(e=>e.field!==j.field).map(e=>e.fieldZh)].join(' / ')},
    {label:'出版社',value:j=>j.publisher || '—'},
    {label:'CCF 2026 推荐',value:j=><GradeTag grade={j.ccf} year={j.ccfYear} />},
    {label:'CCF 推荐领域',value:j=><div className="comparison-ccf">{ccfEntries(j).map(e=><span key={e.field}>{e.fieldZh} · {e.grade}</span>)}</div>},
    {label:'ISSN / eISSN',value:j=><>{j.issn || '—'} / {j.eissn || '—'}</>},
    {label:'OA 类型',value:j=>oaName[j.oa]},
    {label:'JCR 分区',value:j=>metricCell(j,'jcr')},
    {label:'JIF 影响因子',value:j=>metricCell(j,'jif')},
    {label:'中科院 2025 历史分区',value:j=>metricCell(j,'cas','https://www.lib.szu.edu.cn/er/fenqubiao')},
    {label:'新锐 2026 分区',value:j=>metricCell(j,'xinrui','https://www.xr-scholar.com/Journals/Search')},
    {label:'2025 年发文量',value:()=><span className="metric-missing">详情页按需查询 OpenAlex</span>},
    {label:'官方网站',value:j=>j.website ? <a href={j.website} target="_blank" rel="noopener noreferrer" className="micro-link">访问期刊 <ExternalLink size={13}/></a> : '尚未收录官方链接'}
  ];
  function metricCell(j:Journal,system:string,fallback?:string){
    const metrics=j.indicators.filter(m=>m.system===system).sort((a,b)=>b.year-a.year);
    const value=metrics[0];
    const url=value?getSource(value.sourceId)?.url || fallback:fallback;
    return <div className="comparison-metric"><strong className={value?'metric-known':'metric-missing'}>{value ? value.value : '—'}</strong><small>{value?(system==='jcr'?'JCR 2025 · 2026 发布':'指标年份 '+value.year):'本版无对应记录'}</small>{metrics.length>1 && <div className="metric-subjects">{metrics.map((m,i)=><small key={m.category+'-'+i}>{m.category||'所属学科'} · {m.value}</small>)}</div>}{url&&<a href={url} target="_blank" rel="noopener noreferrer" className="micro-link">查看来源 <ExternalLink size={12}/></a>}</div>;
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="comparison-modal" role="dialog" aria-modal="true" aria-label="期刊横向比较" onClick={e=>e.stopPropagation()}>
    <div className="modal-heading"><div><div className="eyebrow"><GitCompareArrows size={16} /> JOURNAL COMPARISON</div><h2>期刊横向比较</h2><p>CCF、JCR、2025 中科院历史分区和 2026 新锐分区分别记录，空缺不推测。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭对比"><X size={21} /></button></div>
    <div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>对比维度</th>{selected.map(j=><th key={j.id}><div className="compare-head"><span>{j.acronym}</span><button onClick={()=>toggleCompare(j.id)} aria-label={'移除 ' + j.acronym}><X size={16}/></button></div><small>{j.name}</small></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.label}><th>{row.label}</th>{selected.map(j=><td key={j.id}>{row.value(j)}</td>)}</tr>)}</tbody></table></div>
    <div className="modal-foot"><span>指标保留来源和年份，不同出版商或分类体系不可混用。</span><div className="row" style={{display:'flex',gap:8,alignItems:'center'}}><button className="secondary-button" disabled={!selected.length} onClick={exportCSV}><Download size={15}/> 导出 CSV</button><button className="secondary-button" onClick={onClose}>完成比较</button></div></div>
  </section></div>;
}
