import { useState } from 'react';
import { ArrowUpRight, BookOpenText, ChartNoAxesCombined, FileImage, Link2, PenLine, ShieldCheck, Wrench } from 'lucide-react';

type Identifier = 'doi' | 'arxiv' | 'issn';
const kinds: Array<{id:Identifier,label:string,placeholder:string}> = [
  {id:'doi',label:'DOI',placeholder:'10.1145/1234567.1234568'},
  {id:'arxiv',label:'arXiv ID',placeholder:'2601.01234'},
  {id:'issn',label:'ISSN',placeholder:'1234-567X'}
];
function issnValid(value: string): boolean {
  const s = value.toUpperCase().replace('-', '');
  if (!/^\d{7}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (8 - i);
  return sum % 11 === 0;
}
function resolve(id:Identifier, raw:string):string | null {
  const input = raw.trim();
  if (id==='doi') return /^10\.\d{4,9}\/\S+$/i.test(input) ? 'https://doi.org/' + encodeURI(input) : null;
  if (id==='arxiv') return /^(\d{4}\.\d{4,5}(v\d+)?|[a-z.-]+\/\d{7}(v\d+)?)$/i.test(input) ? 'https://arxiv.org/abs/' + encodeURIComponent(input).replace('%2F','/') : null;
  return issnValid(input) ? 'https://portal.issn.org/resource/ISSN/' + input.toUpperCase() : null;
}

export function ToolsPage() {
  const [kind,setKind] = useState<Identifier>('doi');
  const [value,setValue] = useState('');
  const target = resolve(kind,value);
  const planned = [
    {title:'BibTeX 引用整理',desc:'引用格式转换、去重与批量检查',icon:BookOpenText},
    {title:'论文图像检查',desc:'分辨率、尺寸和常用投稿格式核验',icon:FileImage},
    {title:'科研统计计算',desc:'均值、置信区间与常用统计检验',icon:ChartNoAxesCombined},
    {title:'学术绘图助手',desc:'CSV 曲线绘制及规范化图表导出',icon:PenLine}
  ];
  return <section className="page-enter content-page">
    <div className="page-intro"><div className="eyebrow"><Wrench size={16} /> RESEARCH UTILITIES <span className="eyebrow-line" /></div><h1>科研小工具<span className="accent-dot">.</span></h1><p>把常用而琐碎的科研操作，变成简单、可靠的日常工具。</p><div className="intro-stats"><span>无需登录</span><span>尽可能本地运行</span><span>按实际需求逐步扩展</span></div></div>
    <section className="resolver-box"><div className="resolver-copy"><span className="section-overline">AVAILABLE NOW · V1.0</span><h2><Link2 size={23}/> 学术标识符直达</h2><p>输入 DOI、arXiv ID 或 ISSN，快速跳转到对应的官方解析服务。输入内容不会经过 ElysiaTools 后端。</p><div className="identifier-switch">{kinds.map(k=><button key={k.id} onClick={()=>{setKind(k.id);setValue('');}} className={kind===k.id?'active':''}>{k.label}</button>)}</div><div className="resolver-form"><input value={value} onChange={e=>setValue(e.target.value)} placeholder={kinds.find(k=>k.id===kind)?.placeholder} aria-label="学术标识符" /><a className={'primary-button ' + (!target ? 'disabled-link' : '')} href={target || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!target} onClick={e=>{if(!target)e.preventDefault();}}>打开 <ArrowUpRight size={17}/></a></div><small>{value.trim() && !target ? '请检查标识符格式。ISSN 同时校验校验位。' : 'DOI → doi.org · arXiv → arxiv.org · ISSN → ISSN Portal'}</small></div><div className="resolver-art"><div className="resolver-orbit"><span><Link2 size={34}/></span></div><span className="art-label art-label-a">DOI</span><span className="art-label art-label-b">ISSN</span><span className="art-label art-label-c">arXiv</span></div></section>
    <div className="section-heading tools-coming"><div><span className="section-overline">ON THE ROADMAP</span><h2>按需扩展的工具</h2><p>以下为规划方向，尚未开放；不会提前引入复杂插件体系。</p></div><span className="planned-label"><ShieldCheck size={15}/> 正在规划</span></div>
    <div className="tools-grid">{planned.map(x=><div className="tool-tile" key={x.title}><div className="tool-icon"><x.icon size={23}/></div><h3>{x.title}</h3><p>{x.desc}</p><span>规划中</span></div>)}</div>
  </section>;
}
