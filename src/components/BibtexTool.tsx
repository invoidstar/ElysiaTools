import {useMemo,useState,type ChangeEvent} from 'react';
import {AlertTriangle,ArrowDownToLine,BookCopy,BookOpenText,Check,ClipboardCopy,FileUp,ListChecks,RefreshCcw,SearchCheck,Trash2} from 'lucide-react';
import {analyzeBibtex,bibYear,formatBibtex,parseBibtex,plainBibValue,MAX_BIB_BYTES,type ParsedBibtex} from '../lib/bibtex.mjs';
import {downloadContent} from '../lib/storage';

type SortMode='year-desc'|'year-asc'|'key'|'title';
const example=[
 '@article{Smith2025VLA,','  author={Smith, Alex and Lee, Jane},',
 '  title={{Vision-Language-Action} Models for Robotics},',
 '  journal={IEEE Robotics and Automation Letters},','  year={2025},',
 '  doi={10.1109/example.2025.0001}','}',
 '',
 '@inproceedings{Zhang2024Robot,','  author={Zhang, Wei and Chen, Bo},',
 '  title={Learning Manipulation from Multimodal Data},',
 '  booktitle={Proceedings of Robotics Conference},','  year={2024}','}'
].join('\n');
export function BibtexTool(){
  const [input,setInput]=useState('');
  const [parsed,setParsed]=useState<ParsedBibtex|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [sort,setSort]=useState<SortMode>('year-desc');
  const [removed,setRemoved]=useState<number[]>([]);
  const [showAll,setShowAll]=useState(false);
  const report=useMemo(()=>parsed?analyzeBibtex(parsed):null,[parsed]);
  const output=useMemo(()=>parsed?formatBibtex(parsed,{sort,excluded:removed}):'',[parsed,sort,removed]);
  const visible=useMemo(()=>{
    if(!parsed)return [];
    const deleted=new Set(removed);
    return parsed.entries.filter(e=>!deleted.has(e.id)).sort((a,b)=>{
      if(sort==='year-desc')return (bibYear(b)||0)-(bibYear(a)||0)||a.key.localeCompare(b.key);
      if(sort==='year-asc')return (bibYear(a)||9999)-(bibYear(b)||9999)||a.key.localeCompare(b.key);
      if(sort==='title')return plainBibValue(a.fields.title||'').localeCompare(plainBibValue(b.fields.title||''));
      return a.key.localeCompare(b.key);
    });
  },[parsed,removed,sort]);
  function analyze(text=input){
    try{
      const result=parseBibtex(text);
      setParsed(result);setRemoved([]);setError('');setShowAll(false);
      setNotice('已完成本地解析，文献不会上传到任何服务器。');
    }catch(e){
      setParsed(null);setRemoved([]);setNotice('');
      setError(e instanceof Error?e.message:'解析失败，请检查 BibTeX 格式。');
    }
  }
  async function upload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(file.size>MAX_BIB_BYTES){setError('文件超过 3 MB，请分批处理。');return;}
    try{const value=await file.text();setInput(value);analyze(value);}
    catch{setError('无法读取本地 .bib 文件。');}
  }
  function copy(){
    if(!output)return;
    navigator.clipboard.writeText(output)
      .then(()=>setNotice('已复制整理后的 BibTeX。'))
      .catch(()=>setNotice('浏览器禁止复制，请从结果框中手动复制。'));
  }
  function download(){
    if(!output)return;
    downloadContent('ElysiaTools-references.bib',output,'text/plain;charset=utf-8');
    setNotice('已导出 BibTeX 文件。');
  }
  function clear(){setInput('');setParsed(null);setError('');setNotice('');setRemoved([]);}
  function toggle(id:number){setRemoved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);}
  return <section className="bib-workspace" id="bibtex-organizer">
    <div className="bib-head">
      <div><span className="section-overline">AVAILABLE NOW / BIBTEX WORKSPACE</span>
        <h2><BookOpenText size={23}/> BibTeX 引用整理</h2>
        <p>上传或粘贴 .bib 文献库，检查缺失字段、重复 DOI / arXiv 文献与引用键冲突，排序后复制或导出。</p>
      </div>
      <span className="bib-private"><Check size={14}/> 本地解析 · 无需上传服务器</span>
    </div>
    <div className="bib-editors">
      <div className="bib-editor">
        <div className="bib-editor-heading"><strong>01 / 原始引用</strong><span>支持 LaTeX、嵌套花括号</span></div>
        <textarea value={input} aria-label="粘贴原始 BibTeX" spellCheck={false}
          placeholder="@article{key,&#10;  author = {Author, Name},&#10;  title = {Your Paper},&#10;  year = {2025}&#10;}"
          onChange={e=>{setInput(e.target.value);setParsed(null);setError('');setNotice('');setRemoved([]);}}/>
        <div className="bib-editor-actions">
          <label className="secondary-button bib-upload"><FileUp size={15}/> 导入 .bib
            <input type="file" accept=".bib,.txt,text/plain" onChange={upload}/>
          </label>
          <button className="secondary-button" onClick={()=>{setInput(example);setParsed(null);setError('');setNotice('');}}>示例</button>
          <button className="secondary-button" disabled={!input} onClick={clear}><Trash2 size={15}/> 清空</button>
          <button className="primary-button" disabled={!input.trim()} onClick={()=>analyze()}>
            <SearchCheck size={15}/> 分析整理
          </button>
        </div>
      </div>
      <div className="bib-editor">
        <div className="bib-editor-heading"><strong>02 / 整理结果</strong><span>{parsed?'已排版，可直接使用':'分析后自动生成'}</span></div>
        <textarea readOnly value={output} aria-label="整理后的 BibTeX" spellCheck={false}
          placeholder="排版后的 BibTeX 会显示在这里…"/>
        <div className="bib-editor-actions">
          <label className="bib-sort-label">排序
            <select value={sort} className="select-input" onChange={e=>setSort(e.target.value as SortMode)}>
              <option value="year-desc">年份 · 新到旧</option><option value="year-asc">年份 · 旧到新</option>
              <option value="key">引用键 A–Z</option><option value="title">标题 A–Z</option>
            </select>
          </label>
          <button className="secondary-button" disabled={!output} onClick={copy}><ClipboardCopy size={15}/> 复制</button>
          <button className="primary-button" disabled={!output} onClick={download}><ArrowDownToLine size={15}/> 导出 .bib</button>
        </div>
      </div>
    </div>
    {error&&<div className="bib-error" role="alert"><AlertTriangle size={17}/>{error}</div>}
    {notice&&!error&&<div className="bib-notice" role="status"><Check size={15}/>{notice}</div>}
    {parsed&&report&&<>
      <div className="bib-overview">
        <div><span>原始文献</span><strong>{parsed.entries.length}</strong></div>
        <div><span>重复候选</span><strong>{report.duplicateIds.length}</strong></div>
        <div><span>核查提醒</span><strong>{report.issues.length+report.suspicious.length}</strong></div>
        <div><span>待导出</span><strong>{visible.length}</strong></div>
      </div>
      <div className="bib-review-top">
        <div><h3><ListChecks size={16}/> 质量检查</h3>
          <p>只建议删除 DOI / arXiv 标识高度一致的重复项；标题相似但身份不确定的文献保留。</p>
        </div>
        {report.duplicateIds.length>0&&<button className="secondary-button"
          onClick={()=>setRemoved(prev=>[...new Set([...prev,...report.duplicateIds])])}>
          <BookCopy size={15}/> 排除 {report.duplicateIds.length} 条重复候选
        </button>}
        {removed.length>0&&<button className="secondary-button" onClick={()=>setRemoved([])}><RefreshCcw size={15}/> 恢复全部</button>}
      </div>
      {report.duplicateGroups.length>0&&<div className="bib-analysis-group"><strong>高置信重复</strong>
        {report.duplicateGroups.slice(0,15).map((g,i)=><p key={i}>{g.reason}: {g.identity} · {g.ids.map(id=>parsed.entries[id].key).join(' / ')}</p>)}</div>}
      {report.suspicious.length>0&&<div className="bib-analysis-group"><strong>相似文献（未自动合并）</strong>
        {report.suspicious.slice(0,12).map((msg,i)=><p key={i}>{msg}</p>)}</div>}
      {report.issues.length>0&&<div className="bib-analysis-group"><strong>格式及缺失字段</strong>
        {report.issues.slice(0,20).map((msg,i)=><p key={i}>{msg}</p>)}
        {report.issues.length>20&&<small>其余 {report.issues.length-20} 项提醒请核对原始文献。</small>}
      </div>}
      {!report.duplicateIds.length&&!report.suspicious.length&&!report.issues.length&&
        <div className="bib-notice"><Check size={15}/> 未发现明显重复或缺失字段。</div>}
      <div className="bib-reference-heading"><strong>文献条目预览</strong><span>取消勾选可从导出文件中排除</span></div>
      <div className="bib-references">
        {parsed.entries.slice(0,showAll?parsed.entries.length:12).map(e=><label className={'bib-reference '+(removed.includes(e.id)?'is-excluded':'')} key={e.id}>
          <input type="checkbox" checked={!removed.includes(e.id)} onChange={()=>toggle(e.id)}
            aria-label={'保留引用 '+e.key}/>
          <div><span className="bib-reference-meta">{e.type.toUpperCase()} · {bibYear(e)||'年份待核对'} · {e.key}</span>
            <strong>{plainBibValue(e.fields.title||'（缺少 title）')}</strong>
            <small>{plainBibValue(e.fields.author||e.fields.editor||'作者信息待补充')}</small>
          </div>
        </label>)}
      </div>
      {parsed.entries.length>12&&<button className="secondary-button bib-expand" onClick={()=>setShowAll(v=>!v)}>
        {showAll?'收起':'查看全部 '+parsed.entries.length+' 条'}
      </button>}
    </>}
    <p className="bib-note">引用键默认不修改，以免破坏论文中的引用。保留 BibTeX 原始大小写保护、LaTeX 命令、@string 及 @preamble。排序和排除操作只影响导出文件。</p>
  </section>;
}
