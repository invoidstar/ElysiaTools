import { Download, ExternalLink, GitCompareArrows, X } from 'lucide-react';
import { GradeTag } from './Common';
import { journals } from '../lib/catalog';
import { downloadContent } from '../lib/storage';
import type { AcademicState, Journal } from '../types';

interface Props { academic: AcademicState; onClose: () => void; toggleCompare: (id: string) => void; }
const oaName = { open: '开放获取', hybrid: 'Hybrid OA', subscription: '订阅制', unknown: '尚未核验' };

export function JournalCompare({ academic, onClose, toggleCompare }: Props) {
  const selected = academic.compare.map(id => journals.find(j => j.id === id)).filter((j): j is Journal => Boolean(j));
  const exportCSV = () => {
    const data = [
      ['Comparison dimension', ...selected.map(j => j.acronym)],
      ['Full title', ...selected.map(j => j.name)],
      ['Research field', ...selected.map(j => [j.field, ...(j.additionalFields || [])].join('; '))],
      ['Publisher', ...selected.map(j => j.publisher || '')],
      ['CCF grade', ...selected.map(j => j.ccf || '')],
      ['CCF edition', ...selected.map(j => j.ccf ? '2026' : '')],
      ['ISSN', ...selected.map(j => j.issn || '')],
      ['eISSN', ...selected.map(j => j.eissn || '')],
      ['Open access', ...selected.map(j => oaName[j.oa])],
      ['JCR JIF', ...selected.map(() => 'Not available')],
      ['CAS historical division', ...selected.map(() => 'Not available')],
      ['Official journal URL', ...selected.map(j => j.website || '')]
    ];
    const cell = (v: string) => '"' + v.replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + data.map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';
    downloadContent('ElysiaTools-journal-comparison.csv', csv, 'text/csv;charset=utf-8');
  };
  const rows: Array<{ label: string; value: (j: Journal) => React.ReactNode }> = [
    {label:'研究领域',value:j=>j.field},
    {label:'出版社',value:j=>j.publisher || '—'},
    {label:'CCF 推荐',value:j=><GradeTag grade={j.ccf} year={j.ccfYear} />},
    {label:'CCF 目录',value:j=>j.ccf ? '2026 第七版' : '未提供'},
    {label:'ISSN',value:j=>j.issn || '—'},
    {label:'eISSN',value:j=>j.eissn || '—'},
    {label:'开放获取',value:j=>oaName[j.oa]},
    {label:'JCR 分区 / 年度',value:()=>'未获取授权数据'},
    {label:'JIF / 年度',value:()=>'未获取授权数据'},
    {label:'中科院历史分区',value:()=>'未收录'},
    {label:'官方网站',value:j=>j.website ? <a href={j.website} target="_blank" rel="noreferrer" className="micro-link">访问期刊 <ExternalLink size={13}/></a> : '暂无已核实链接'}
  ];
  return <div className="modal-backdrop" onClick={onClose}><section className="comparison-modal" role="dialog" aria-modal="true" aria-label="期刊横向比较" onClick={e=>e.stopPropagation()}>
    <div className="modal-heading"><div><div className="eyebrow"><GitCompareArrows size={16} /> JOURNAL COMPARISON</div><h2>期刊横向比较</h2><p>独立展示来源明确的信息，不以单一分区或指标生成排名。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭对比"><X size={21} /></button></div>
    <div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>对比维度</th>{selected.map(j=><th key={j.id}><div className="compare-head"><span>{j.acronym}</span><button onClick={()=>toggleCompare(j.id)} aria-label={'移除 ' + j.acronym}><X size={16}/></button></div><small>{j.name}</small></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.label}><th>{row.label}</th>{selected.map(j=><td key={j.id}>{row.value(j)}</td>)}</tr>)}</tbody></table></div>
    <div className="modal-foot"><span>数据缺失表示暂无可核验记录，不代表该期刊没有对应指标。</span><div className="row" style={{display:'flex',gap:8,alignItems:'center'}}><button className="secondary-button" disabled={!selected.length} onClick={exportCSV}><Download size={15}/> 导出 CSV</button><button className="secondary-button" onClick={onClose}>完成比较</button></div></div>
  </section></div>;
}
