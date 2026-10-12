import { AlertCircle, ClipboardCheck, Database } from 'lucide-react';
import type { Journal } from '../types';

const specs = [
  { key:'cas', title:'中科院历史 2025',source:'cas' },
  { key:'xinrui', title:'新锐 2026',source:'xinrui' },
  { key:'jcr', title:'JCR 2025 学科分区',source:'jcr' },
  { key:'jif', title:'JIF 2025 影响因子',source:'jcr' }
] as const;
const reasons = {
  available:'该年度来源已匹配到有效指标',
  source_no_metric:'原始年度表包含该期刊，但此项指标为空或无有效分区',
  not_in_source:'该年度来源没有匹配到这本期刊',
  identity_review:'存在同名或 ISSN 身份冲突，未进行不确定的自动合并'
};
const issueNames:Record<string,string>={
  title_issn_conflict:'同名期刊的出版标识不一致；已避免自动合并',
  multiple_issn_candidates:'出版标识符关联多个期刊；需要人工确认',
  ambiguous_title:'同名候选不唯一；已保留独立记录',
  invalid_identifier:'来源出版标识符未通过格式校验',
  missing_title:'原始记录缺少期刊名，依据有效 ISSN 单独保留',
  alias_collision:'期刊别名或出版标识存在冲突',
  metric_conflict:'同一评价分类出现不同值，已记录冲突以供核查'
};
const methods={issn:'ISSN 匹配',title:'唯一名称匹配',new:'独立来源记录',review:'身份待核对'};
export function JournalDiagnostics({journal}:{journal:Journal}) {
  const diagnostic=journal.diagnostic;
  if(!diagnostic)return null;
  const unresolved=Object.values(diagnostic.status).filter(s=>s!=='available').length;
  return <section className="drawer-section">
    <h3>年度数据诊断 <span>DATA DIAGNOSTICS</span></h3>
    <div className="notice-soft">
      {unresolved===0?<ClipboardCheck size={17}/>:<Database size={17}/>}
      当前数据源中 {4-unresolved} / 4 项年度指标可用。下列缺失状态只针对所标记的数据源与年份，不等于期刊没有实际分区。
    </div>
    <div className="ccf-class-list">
      {specs.map(item=>{
        const state=diagnostic.status[item.key];
        const method=diagnostic.matchMethod[item.source];
        const rows=diagnostic.sourceRows[item.source]||[];
        return <div key={item.key}>
          <span><strong>{item.title}</strong><small style={{display:'block',marginTop:3}}>{reasons[state]}
            {method?' · '+methods[method]:''}
            {rows.length?' · 来源记录 '+rows.slice(0,4).join('、')+(rows.length>4?' 等':''):''}
          </small></span>
          <strong className={state==='available'?'metric-known':'metric-missing'}>
            {{available:'已覆盖',source_no_metric:'来源无指标',not_in_source:'未匹配收录',identity_review:'待核对'}[state]}
          </strong>
        </div>;
      })}
    </div>
    {diagnostic.issues.length>0&&<div className="notice-soft">
      <AlertCircle size={17}/>
      <div><strong>身份与数据核查提示</strong>
        {diagnostic.issues.map(code=><p key={code}>{issueNames[code]||code}</p>)}
      </div>
    </div>}
  </section>;
}
