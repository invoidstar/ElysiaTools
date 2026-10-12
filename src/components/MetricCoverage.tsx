import { Database, ExternalLink, ShieldCheck } from 'lucide-react';
import { journals } from '../lib/catalog';

const systems = [
  { id: 'cas', label: '中科院历史 2025' },
  { id: 'xinrui', label: '新锐 2026' },
  { id: 'jcr', label: 'JCR 分区' },
  { id: 'jif', label: '影响因子' }
];
const count = (system: string) => journals.filter(j => j.indicators.some(m => m.system === system)).length;

export function MetricCoverage() {
  return <section className="metric-coverage" aria-label="期刊评价信息覆盖率">
    <div className="metric-coverage-title">
      <Database size={16}/><strong>期刊评价信息覆盖率</strong><span>{journals.length} 本期刊</span>
    </div>
    <div className="metric-coverage-bars">{systems.map(s =>
      <div className="coverage-stat" key={s.id} title={s.label + ' · ' + count(s.id) + ' / ' + journals.length}>
        <span>{s.label}</span><strong>{count(s.id)}<small>/{journals.length}</small></strong>
        <i><b style={{ width: count(s.id) / journals.length * 100 + '%' }} /></i>
      </div>
    )}</div>
    <p><ShieldCheck size={14}/>
      此处仅统计已公开且可提供来源的期刊数据，未收录并不代表没有评级。分区资料请以发行机构公布的数据为准。
      <a className="micro-link" href="https://www.xr-scholar.com/Journals/Search" target="_blank" rel="noopener noreferrer">新锐官方查询 <ExternalLink size={12}/></a>
    </p>
  </section>;
}
