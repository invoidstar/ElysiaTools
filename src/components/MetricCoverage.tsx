import { Database, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Journal } from '../types';

const systems = [
  { id: 'cas', label: '中科院历史 2025' },
  { id: 'xinrui', label: '新锐 2026' },
  { id: 'jcr', label: 'JCR 分区' },
  { id: 'jif', label: '影响因子' }
];
export function MetricCoverage({journals,loading}:{journals:Journal[];loading:boolean}) {
  const count = (system: string) => journals.filter(j => j.indicators.some(m => m.system === system)).length;
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
      按年度固定数据快照统计覆盖，未匹配不等于未被评级。点击期刊可查看大类、小类和学科分区及来源。
      <a className="micro-link" href="https://www.xr-scholar.com/Journals/Search" target="_blank" rel="noopener noreferrer">新锐官方查询 <ExternalLink size={12}/></a>
    </p>
  </section>;
}
