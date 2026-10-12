/**
 * Independent, source-aware journal ranking filters.
 * Each selector remains usable without a prior evaluation-system selection.
 * Prefixes prevent CAS 1区, XinRui 1区 and JCR Q1 from being conflated.
 */
export const RATING_SYSTEMS = ['cas','xinrui','jcr','jif'];
const tiers = {
  cas: ['1区','2区','3区','4区'],
  xinrui: ['1区','2区','3区','4区'],
  jcr: ['Q1','Q2','Q3','Q4']
};
const labels = {
  cas: '中科院 2025',
  xinrui: '新锐 2026',
  jcr: 'JCR 2025'
};
export function journalTierOptions(system='') {
  return (system ? [system] : ['cas','xinrui','jcr']).flatMap(k=>
    (tiers[k]||[]).map(value=>({value:k+'|'+value,label:value,group:labels[k]})));
}
export function matchesJournalRankFilters(journal,system='',status='',tier='') {
  const metrics=journal.indicators||[];
  const systems=system?[system]:RATING_SYSTEMS;
  const hasMetric=systems.some(key=>metrics.some(m=>m.system===key));
  let valid=true;
  if(status==='' && system)valid=hasMetric;
  else if(status==='available')valid=hasMetric;
  else if(status==='issues')valid=Boolean(journal.diagnostic?.issues?.length);
  else if(status && status!=='all')
    valid=systems.some(key=>journal.diagnostic?.status?.[key]===status);
  if(!valid)return false;
  if(!tier)return true;
  const [rankSystem,grade]=tier.split('|');
  if(!grade || !tiers[rankSystem]?.includes(grade))return false;
  if(system && system!==rankSystem)return false;
  return metrics.some(m=>
    m.system===rankSystem && m.value===grade &&
    (rankSystem==='jcr' || (!m.category?.startsWith('小类:')&&!m.category?.startsWith('第二大类:'))));
}
