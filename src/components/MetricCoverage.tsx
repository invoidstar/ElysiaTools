import { useMemo } from 'react';
import { Database, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Journal } from '../types';

const systems = [
  { id: 'cas', label: '中科院历史 2025' },
  { id: 'xinrui', label: '新锐 2026' },
  { id: 'jcr', label: 'JCR 分区' },
  { id: 'jif', label: '影响因子' }
];
export function MetricCoverage({journals,loading}:{journals:Journal[];loading:boolean}) {
  const stats = useMemo(() => {
    const counts: Record<string, number> = {cas:0,xinrui:0,jcr:0,jif:0};
    let withoutAnnual = 0, needsReview = 0, withDiagnostics = false;
    for(const journal of journals){
      for(const system of new Set(journal.indicators.map(m=>m.system)))
        if(system in counts)counts[system]++;
      if(journal.diagnostic){
        withDiagnostics = true;
        const statuses = Object.values(journal.diagnostic.status);
        if(statuses.every(value=>value!=='available'))withoutAnnual++;
        if(journal.diagnostic.issues.length>0 || statuses.includes('identity_review'))needsReview++;
      }
    }
    return {counts,withoutAnnual,needsReview,withDiagnostics};
  },[journals]);
  const count=(system:string)=>stats.counts[system] || 0;
  const {withoutAnnual,needsReview} = stats;
  return <section className="metric-coverage" aria-label="期刊评价信息覆盖率">
    <div className="metric-coverage-title">
      <Database size={16}/><strong>期刊评价信息覆盖率</strong><span>{loading?'正在加载…':journals.length.toLocaleString('zh-CN')+' 本期刊'}</span>
    </div>
    <div className="metric-coverage-bars">{systems.map(s =>
      <div className="coverage-stat" key={s.id} title={s.label + ' · ' + count(s.id) + ' / ' + journals.length}>
        <span>{s.label}</span><strong>{count(s.id)}<small>/{journals.length}</small></strong>
        <i><b style={{ width: count(s.id) / journals.length * 100 + '%' }} /></i>
      </div>
    )}</div>
    <p><ShieldCheck size={14}/>
      按年度固定数据快照统计，未匹配不等于未被评级。{!loading && stats.withDiagnostics && <span>
        本版无任何年度指标 {withoutAnnual.toLocaleString('zh-CN')} 本；身份或数据待核对 {needsReview.toLocaleString('zh-CN')} 本。
      </span>} 点击期刊可查看逐项缺失原因及匹配依据。
      <a className="micro-link" href="https://www.xr-scholar.com/Journals/Search" target="_blank" rel="noopener noreferrer">新锐官方查询 <ExternalLink size={12}/></a>
    </p>
  </section>;
}
