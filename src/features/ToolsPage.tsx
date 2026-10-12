import {ArrowUpRight,BookOpenText,CheckCircle2,Link2,ShieldCheck,Wrench} from 'lucide-react';

interface Props {onNavigate:(path:string)=>void}
const tools=[
  {
    id:'identifier',number:'01',title:'学术标识符直达',
    english:'IDENTIFIER RESOLVER',icon:Link2,
    description:'快速解析 DOI、arXiv ID 与 ISSN，直接打开对应的官方资源页面。',
    details:['DOI / arXiv / ISSN','官方解析链接','无需账号']
  },
  {
    id:'bibtex',number:'02',title:'BibTeX 引用整理',
    english:'BIBTEX ORGANIZER',icon:BookOpenText,
    description:'批量整理 .bib 参考文献，检查重复与缺失字段，排序并导出。',
    details:['BibTeX 批量导入','引用查重与格式检查','本地导出 .bib']
  }
];
export function ToolsPage({onNavigate}:Props){
  return <section className="page-enter content-page tools-hub-page">
    <div className="page-intro">
      <div className="eyebrow"><Wrench size={16}/> RESEARCH UTILITIES <span className="eyebrow-line"/></div>
      <h1>科研小工具<span className="accent-dot">.</span></h1>
      <p>选择需要使用的工具，每项功能都有独立页面，不必在同一页里反复滚动。</p>
      <div className="intro-stats">
        <span><b>{tools.length}</b> 项可用工具</span>
        <span>独立工作区</span>
        <span>简洁 · 可直接使用</span>
      </div>
    </div>
    <div className="tool-hub-intro">
      <div><span className="section-overline">SELECT YOUR WORKSPACE</span><h2>选择一个工具开始</h2>
        <p>只展示已经实现的功能，没有无法点击的“规划中”占位卡片。</p>
      </div>
      <span className="tool-hub-ready"><CheckCircle2 size={15}/> ALL TOOLS AVAILABLE</span>
    </div>
    <div className="tool-hub-grid">
      {tools.map(tool=><button className={'tool-hub-card tool-hub-'+tool.id} key={tool.id}
        onClick={()=>onNavigate('tools/'+tool.id)}>
        <span className="tool-hub-card-top">
          <span className="tool-hub-icon"><tool.icon size={25} strokeWidth={1.7}/></span>
          <span className="tool-hub-number">{tool.number} / 02</span>
        </span>
        <span className="tool-hub-kicker">{tool.english}</span>
        <strong className="tool-hub-title">{tool.title}</strong>
        <span className="tool-hub-desc">{tool.description}</span>
        <span className="tool-hub-features">
          {tool.details.map(d=><span key={d}><CheckCircle2 size={12}/>{d}</span>)}
        </span>
        <span className="tool-hub-action">打开独立页面 <ArrowUpRight size={17}/></span>
      </button>)}
    </div>
    <div className="tool-hub-note"><ShieldCheck size={18}/>
      <span>工具按实际需求维护，优先保留简单、可靠、真正可用的功能。BibTeX 内容仅在本地浏览器中处理。</span>
    </div>
  </section>;
}
