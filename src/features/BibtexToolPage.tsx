import {ArrowLeft,BookOpenText,Wrench} from 'lucide-react';
import {BibtexTool} from '../components/BibtexTool';

interface Props {onBack:()=>void}
export function BibtexToolPage({onBack}:Props){
  return <section className="page-enter content-page tool-detail-page">
    <button className="tool-back-link" onClick={onBack}><ArrowLeft size={16}/> 返回科研工具</button>
    <div className="page-intro">
      <div className="eyebrow"><Wrench size={15}/> RESEARCH UTILITIES / 02 <span className="eyebrow-line"/></div>
      <h1>BibTeX 引用整理<span className="accent-dot">.</span></h1>
      <p>独立的参考文献工作台，支持批量导入、格式检查、重复文献识别和整理结果导出。</p>
      <div className="intro-stats"><span><BookOpenText size={14}/> BibTeX / .bib</span><span>本地处理</span><span>无需登录</span></div>
    </div>
    <BibtexTool/>
  </section>;
}
