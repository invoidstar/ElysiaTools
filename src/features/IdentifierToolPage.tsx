import {useState} from 'react';
import {ArrowLeft,ArrowUpRight,Link2,Wrench} from 'lucide-react';

type Identifier='doi'|'arxiv'|'issn';
const kinds:Array<{id:Identifier,label:string,placeholder:string}>=[
  {id:'doi',label:'DOI',placeholder:'10.1145/1234567.1234568'},
  {id:'arxiv',label:'arXiv ID',placeholder:'2601.01234'},
  {id:'issn',label:'ISSN',placeholder:'1234-567X'}
];
function issnValid(value:string):boolean{
  const s=value.toUpperCase().replace('-','');
  if(!/^\d{7}[\dX]$/.test(s))return false;
  let sum=0;
  for(let i=0;i<8;i++)sum+=(s[i]==='X'?10:Number(s[i]))*(8-i);
  return sum%11===0;
}
function resolve(id:Identifier,raw:string):string|null{
  const input=raw.trim();
  if(id==='doi')return /^10\.\d{4,9}\/\S+$/i.test(input)?'https://doi.org/'+encodeURI(input):null;
  if(id==='arxiv')return /^(\d{4}\.\d{4,5}(v\d+)?|[a-z.-]+\/\d{7}(v\d+)?)$/i.test(input)
    ?'https://arxiv.org/abs/'+encodeURIComponent(input).replace('%2F','/'):null;
  return issnValid(input)?'https://portal.issn.org/resource/ISSN/'+input.toUpperCase():null;
}
interface Props {onBack:()=>void}
export function IdentifierToolPage({onBack}:Props){
  const [kind,setKind]=useState<Identifier>('doi');
  const [value,setValue]=useState('');
  const target=resolve(kind,value);
  return <section className="page-enter content-page tool-detail-page">
    <button className="tool-back-link" onClick={onBack}><ArrowLeft size={16}/> 返回科研工具</button>
    <div className="page-intro">
      <div className="eyebrow"><Wrench size={15}/> RESEARCH UTILITIES / 01 <span className="eyebrow-line"/></div>
      <h1>学术标识符直达<span className="accent-dot">.</span></h1>
      <p>使用 DOI、arXiv ID 或 ISSN，直接访问官方解析页面，无须在多个网站之间重复搜索。</p>
      <div className="intro-stats"><span>DOI / arXiv / ISSN</span><span>无需登录</span><span>官方解析入口</span></div>
    </div>
    <section className="resolver-box tool-single-panel">
      <div className="resolver-copy">
        <span className="section-overline">IDENTIFIER RESOLVER</span>
        <h2><Link2 size={23}/> 输入学术标识符</h2>
        <p>输入内容只在浏览器本地校验格式。点击打开后直接跳转至相应的解析服务，不经过 ElysiaTools 后端。</p>
        <div className="identifier-switch">
          {kinds.map(k=><button key={k.id} className={kind===k.id?'active':''}
            onClick={()=>{setKind(k.id);setValue('');}}>{k.label}</button>)}
        </div>
        <div className="resolver-form">
          <input value={value} onChange={e=>setValue(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter' && target)window.open(target,'_blank','noopener,noreferrer');}}
            placeholder={kinds.find(k=>k.id===kind)?.placeholder} aria-label="学术标识符"/>
          <a className={'primary-button '+(!target?'disabled-link':'')} href={target||undefined}
            target="_blank" rel="noopener noreferrer" aria-disabled={!target}
            onClick={e=>{if(!target)e.preventDefault();}}>
            打开 <ArrowUpRight size={17}/>
          </a>
        </div>
        <small>{value.trim()&&!target?'请检查标识符格式。ISSN 同时校验校验位。':
          'DOI → doi.org · arXiv → arxiv.org · ISSN → ISSN Portal'}</small>
      </div>
      <div className="resolver-art" aria-hidden="true">
        <div className="resolver-orbit"><span><Link2 size={34}/></span></div>
        <span className="art-label art-label-a">DOI</span>
        <span className="art-label art-label-b">ISSN</span>
        <span className="art-label art-label-c">arXiv</span>
      </div>
    </section>
  </section>;
}
