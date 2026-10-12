import {
  CheckCircle2, CloudDownload, Database, Download, ExternalLink, FileInput,
  FileSpreadsheet, Info, LockKeyhole, RefreshCw, ShieldCheck, Trash2, Upload
} from 'lucide-react';
import { useRef, useState } from 'react';
import { journals } from '../lib/catalog';
import { useJournalMetrics, type SyncStep } from '../lib/metricsContext';
import { SHOWJCR_FILES, SHOWJCR_REPOSITORY, showJcrBrowseUrl } from '../lib/showJcrSources';
import { downloadContent } from '../lib/storage';
import type { ImportStats } from '../lib/metricCsv.mjs';

const systems = [
  { id: 'cas', label: '中科院历史 2025' },
  { id: 'xinrui', label: '新锐 2026' },
  { id: 'jcr', label: 'JCR 分区' },
  { id: 'jif', label: '影响因子' }
];

export function MetricCoverage() {
  const { count, privateCount, lastSync } = useJournalMetrics();
  return <div className="metric-coverage">
    <div className="metric-coverage-title"><Database size={16}/><strong>期刊指标覆盖度</strong><span>{journals.length} 本期刊</span></div>
    <div className="metric-coverage-bars">{systems.map(system =>
      <div className="coverage-stat" key={system.id} title={system.label + '：已收录 ' + count(system.id) + ' / ' + journals.length}>
        <span>{system.label}</span><strong>{count(system.id)}<small>/{journals.length}</small></strong>
        <i><b style={{width:(count(system.id)/journals.length*100)+'%'}}/></i>
      </div>
    )}</div>
    <p><ShieldCheck size={13}/>
      {lastSync
        ? '已在本机同步三份第三方参考表 · 同步日期 ' + new Date(lastSync.at).toLocaleDateString('zh-CN') + ' · 数据未发布到网站服务器。'
        : privateCount > 0
          ? '已在本机保存 ' + privateCount + ' 本期刊的私人指标。'
          : '当前数字为已公开数据；下方可一键同步第三方参考表至当前浏览器。'}
    </p>
  </div>;
}

export function MetricImportPanel() {
  const { importCSV, syncShowJCR, clearPrivate, privateCount, lastSync } = useJournalMetrics();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [progress, setProgress] = useState<SyncStep | null>(null);
  const [reports, setReports] = useState<ImportStats[]>([]);
  const [error, setError] = useState('');
  const filePicker = useRef<HTMLInputElement>(null);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(''); setReports([]);
    try {
      const values: ImportStats[] = [];
      for (const file of Array.from(files).slice(0, 4)) values.push(await importCSV(file));
      setReports(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : '本地文件解析失败。');
    } finally {
      setBusy(false);
      if (filePicker.current) filePicker.current.value = '';
    }
  }

  async function syncRemote() {
    if (!approved || busy) return;
    setBusy(true); setReports([]); setError(''); setProgress(null);
    try {
      const values = await syncShowJCR(setProgress);
      setReports(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败，请使用本地导入。');
    } finally {
      setBusy(false); setProgress(null);
    }
  }

  function exportTemplate() {
    const headers = ['Journal', 'ISSN', 'CAS2025', 'XR2026', 'JCR2025', 'JIF2025'];
    const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const rows = [headers, ...journals.map(j => [j.name, j.issn || '', '', '', '', ''])];
    downloadContent('ElysiaTools-journal-metrics-template.csv',
      '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n',
      'text/csv;charset=utf-8');
  }

  return <div className="metric-import">
    <button className="metric-import-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}>
      <CloudDownload size={19}/>
      <span><strong>同步期刊评价数据</strong><small>中科院 2025 · 新锐 2026 · JCR / JIF 2025 · 本机保存</small></span>
      {lastSync && <span className="sync-ready-tag"><CheckCircle2 size={13}/> 已同步</span>}
      <span className="metric-import-arrow">{open ? '−' : '+'}</span>
    </button>
    {open && <div className="metric-import-inner">
      <div className="metric-import-intro"><LockKeyhole size={16}/>
        <span>选择性同步 <a href={SHOWJCR_REPOSITORY} target="_blank" rel="noopener noreferrer">ShowJCR</a> 的三份历史参考表。CSV 仅由你的浏览器下载、解析和保存；本站不托管、不向服务器上传完整的授权受限指标。</span>
      </div>
      <div className="reference-files">{SHOWJCR_FILES.map(f =>
        <div key={f.id} className="reference-file">
          <span className="reference-file-icon"><FileSpreadsheet size={17}/></span>
          <span className="reference-file-text"><strong>{f.title}</strong><small>{(f.bytes / (1024*1024)).toFixed(1)} MB · {f.filename}</small></span>
          <a title={'访问 ' + f.title + ' 原始文件'} href={showJcrBrowseUrl(f)} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15}/>
          </a>
        </div>
      )}</div>
      <label className="sync-agreement">
        <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)}/>
        <span>我理解这些分区数据来自第三方整理，可能受到机构授权限制；我会仅在本人有权使用的范围内进行本地同步、核验和研究，不将其重新公开发布。</span>
      </label>
      <button className="primary-button sync-button" disabled={busy || !approved} onClick={() => void syncRemote()}>
        {busy ? <RefreshCw size={16} className="is-spinning"/> : <CloudDownload size={16}/>}
        {busy ? '正在同步，请保持页面打开…' : lastSync ? '重新同步三份参考表' : '一键同步三份参考表'}
      </button>
      {busy && progress && <div role="status" className="sync-progress">
        <div className="sync-progress-heading">{progress.index} / {progress.total} · {progress.title}</div>
        <span>{progress.phase === 'fetch' ? '正在下载文件' : progress.phase === 'parse' ? '正在匹配 ISSN 和刊名' : '已完成匹配'}</span>
        <i><b style={{width: (((progress.index-1)+(progress.phase==='fetch'?.2:progress.phase==='parse'?.65:1))/progress.total*100)+'%'}}/></i>
      </div>}
      {lastSync && <p className="sync-timestamp"><CheckCircle2 size={14}/> 最近本机同步：{new Date(lastSync.at).toLocaleString('zh-CN')} · 固定来源版本 {lastSync.commit.slice(0, 8)}</p>}
      <div className="metric-import-divider"><span>网络无法连接 GitHub？改用手动导入</span></div>
      <input ref={filePicker} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" multiple
        className="metric-hidden-input" onChange={e => void importFiles(e.target.files)} />
      <div className="metric-import-actions">
        <button className="secondary-button" onClick={() => filePicker.current?.click()} disabled={busy}><Upload size={15}/> 选择本地 CSV / TSV</button>
        <button className="secondary-button" onClick={exportTemplate}><Download size={15}/> 下载期刊模板</button>
      </div>
      {error && <p className="import-error" role="alert">{error}</p>}
      {reports.map((s, i) => <div className="import-report" role="status" key={s.file + i}>
        <strong>{s.file}：匹配 {s.matched.toLocaleString('zh-CN')} / {s.total.toLocaleString('zh-CN')} 行</strong>
        <span>中科院 {s.systems.cas} · 新锐 {s.systems.xinrui} · JCR {s.systems.jcr} · JIF {s.systems.jif}</span>
        <small>未匹配 {s.unmatched} · 无指标 {s.withoutMetrics} · 标识冲突 {s.ambiguous}</small>
      </div>)}
      {privateCount > 0 && <button className="danger-clear" onClick={() => {
        if (window.confirm('清除本浏览器所有导入和同步的私人期刊指标？（不会删除收藏记录）')) {
          clearPrivate(); setReports([]);
        }
      }}><Trash2 size={14}/> 清除本机同步及导入数据</button>}
      <div className="metric-external-links"><Info size={13}/>
        <span>官方核对：</span>
        <a href="https://www.letpub.com.cn/index.php?page=journalapp&view=search" target="_blank" rel="noopener noreferrer">LetPub <ExternalLink size={12}/></a>
        <a href="https://www.xr-scholar.com/Journals/Search" target="_blank" rel="noopener noreferrer">新锐官方 <ExternalLink size={12}/></a>
        <a href="https://clarivate.com/academia-government/scientific-and-academic-research/research-funding-analytics/journal-citation-reports/" target="_blank" rel="noopener noreferrer">Clarivate JCR <ExternalLink size={12}/></a>
      </div>
      <small className="metric-import-credit"><FileInput size={13}/> 第三方参考数据不等于官方核验数据，不能用于保证评价结论。同步并不修改公开网站数据；更换浏览器或清理缓存后可能需要重新同步。</small>
    </div>}
  </div>;
}
