import { Database, Download, ExternalLink, FileInput, FileSpreadsheet, Info, LockKeyhole, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { journals } from '../lib/catalog';
import { useJournalMetrics } from '../lib/metricsContext';
import { downloadContent } from '../lib/storage';
import type { ImportStats } from '../lib/metricCsv.mjs';

const systems=[
  {id:'cas',label:'中科院历史 2025'},
  {id:'xinrui',label:'新锐 2026'},
  {id:'jcr',label:'JCR 分区'},
  {id:'jif',label:'影响因子'}
];

export function MetricCoverage(){
  const {count,privateCount}=useJournalMetrics();
  return <div className="metric-coverage">
    <div className="metric-coverage-title"><Database size={16}/><strong>期刊指标覆盖度</strong><span>{journals.length} 本期刊</span></div>
    <div className="metric-coverage-bars">{systems.map(x=><div className="coverage-stat" key={x.id} title={x.label+'：已收录 '+count(x.id)+' / '+journals.length}>
      <span>{x.label}</span><strong>{count(x.id)}<small>/{journals.length}</small></strong>
      <i><b style={{width:(count(x.id)/journals.length*100)+'%'}}/></i>
    </div>)}</div>
    <p><ShieldCheck size={13}/>{privateCount>0?'已导入 '+privateCount+' 本期刊的本地指标，全部仅存于当前浏览器。':'缺少授权分区数据时显示「待补充」，不将缺失误判为无分区。'}</p>
  </div>;
}

export function MetricImportPanel(){
  const {importCSV,clearPrivate,privateCount}=useJournalMetrics();
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [report,setReport]=useState<ImportStats[]>([]);
  const [error,setError]=useState('');
  const picker=useRef<HTMLInputElement>(null);
  async function importFiles(fileList: FileList|null){
    if(!fileList?.length)return;
    setLoading(true);setError('');setReport([]);
    try{
      const reports:ImportStats[]=[];
      for(const file of Array.from(fileList).slice(0,4)){
        reports.push(await importCSV(file));
      }
      setReport(reports);
    }catch(e){setError(e instanceof Error?e.message:'无法读取数据文件。');}
    finally{setLoading(false);if(picker.current)picker.current.value='';}
  }
  function exportTemplate(){
    const headers=['Journal','ISSN','CAS2025','XR2026','JCR2025','JIF2025'];
    const escape=(value:string) => '"'+value.replace(/"/g,'""')+'"';
    const rows=[headers,...journals.map(j=>[j.name,j.issn||'','','','',''])];
    downloadContent('ElysiaTools-journal-metrics-template.csv',
      '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8');
  }
  return <div className="metric-import">
    <button className="metric-import-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><FileSpreadsheet size={18}/><span><strong>补充期刊分区数据</strong><small>CSV 文件仅在本地浏览器读取</small></span><span className="metric-import-arrow">{open?'−':'+'}</span></button>
    {open&&<div className="metric-import-inner">
      <div className="metric-import-intro"><LockKeyhole size={15}/> 可导入你有权使用的中科院 2025、新锐 2026、JCR/JIF CSV。数据不会上传或写入公开仓库。</div>
      <p>支持带 <code>Journal</code>、<code>ISSN</code> 等字段的标准 CSV，也支持常见的 FQBJCR2025、XR2026、JCR2025 字段格式。优先用 ISSN，其他记录使用期刊全称严格匹配。</p>
      <input ref={picker} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" multiple className="metric-hidden-input" onChange={e=>void importFiles(e.target.files)}/>
      <div className="metric-import-actions">
        <button className="primary-button" disabled={loading} onClick={()=>picker.current?.click()}><Upload size={15}/>{loading?'正在解析...':'选择 CSV / TSV'}</button>
        <button className="secondary-button" onClick={exportTemplate}><Download size={15}/>下载 292 本期刊模板</button>
      </div>
      {error&&<p className="import-error" role="alert">{error}</p>}
      {report.map((s,i)=><div className="import-report" role="status" key={i}><strong>{s.file}：匹配 {s.matched} / {s.total} 行</strong><span>中科院 {s.systems.cas} · 新锐 {s.systems.xinrui} · JCR {s.systems.jcr} · JIF {s.systems.jif}</span><small>未匹配 {s.unmatched} · 无指标 {s.withoutMetrics} · 标识冲突 {s.ambiguous}</small></div>)}
      {privateCount>0&&<button className="danger-clear" onClick={()=>{if(window.confirm('确定清除当前浏览器中导入的所有期刊指标吗？')){clearPrivate();setReport([]);}}}><Trash2 size={14}/> 清除已导入的私人指标</button>}
      <div className="metric-external-links"><Info size={13}/><span>自行核对：</span><a href="https://www.letpub.com.cn/index.php?page=journalapp&view=search" target="_blank" rel="noopener noreferrer">LetPub <ExternalLink size={12}/></a><a href="https://www.xr-scholar.com/Journals/Search" target="_blank" rel="noopener noreferrer">新锐官方 <ExternalLink size={12}/></a></div>
      <small className="metric-import-credit"><FileInput size={13}/> 请尊重文件授权。该功能用于个人持有的数据检索，不提供非授权数据的批量下载。</small>
    </div>}
  </div>;
}
