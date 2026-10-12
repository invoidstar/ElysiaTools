/**
 * BibTeX organizer. All parsing/formatting is local; original field values
 * remain untouched (including case-protecting braces and LaTeX commands).
 */
export const MAX_BIB_BYTES=3_000_000;
export const MAX_BIB_ENTRIES=4000;
const fieldOrder=['author','editor','title','journal','booktitle','year','date','volume','number','pages','publisher','organization','series','edition','address','doi','eprint','archiveprefix','primaryclass','url','isbn','issn','month','note','abstract','keywords'];
const rank=new Map(fieldOrder.map((f,i)=>[f,i]));
const lower=x=>String(x||'').trim().toLowerCase();

function segments(text){
  const out=[];let current='',braces=0,quote=false,escaped=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(escaped){current+=ch;escaped=false;continue;}
    if(ch==='\\'){current+=ch;escaped=true;continue;}
    if(ch==='"'&&braces===0){quote=!quote;current+=ch;continue;}
    if(!quote){
      if(ch==='{')braces++;
      if(ch==='}')braces--;
      if(braces<0)throw Error('BibTeX 字段包含未匹配的右花括号。');
      if(ch===','&&braces===0){out.push(current.trim());current='';continue;}
    }
    current+=ch;
  }
  if(escaped||quote||braces!==0)throw Error('BibTeX 字段引号或花括号没有正确闭合。');
  out.push(current.trim());
  return out;
}
function equalsIndex(text){
  let braces=0,quote=false,escaped=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(escaped){escaped=false;continue;}
    if(ch==='\\'){escaped=true;continue;}
    if(ch==='"'&&braces===0){quote=!quote;continue;}
    if(!quote){
      if(ch==='{')braces++;
      if(ch==='}')braces--;
      if(ch==='='&&braces===0)return i;
    }
  }
  return -1;
}
function extractBlock(text,openPos){
  const opener=text[openPos];
  if(opener!=='{'&&opener!=='(')throw Error('BibTeX 记录缺少起始括号。');
  let depth=1, braces=0,quoted=false,escaped=false;
  for(let i=openPos+1;i<text.length;i++){
    const c=text[i];
    if(escaped){escaped=false;continue;}
    if(c==='\\'){escaped=true;continue;}
    if(c==='"'&&(opener==='{'?depth===1:braces===0)){quoted=!quoted;continue;}
    if(quoted)continue;
    if(opener==='{'){
      if(c==='{')depth++;
      if(c==='}')depth--;
    }else{
      if(c==='{')braces++;
      if(c==='}')braces--;
      if(braces===0&&c==='(')depth++;
      if(braces===0&&c===')')depth--;
    }
    if(depth===0)return {content:text.slice(openPos+1,i),end:i+1};
    if(depth<0||braces<0)throw Error('BibTeX 记录的括号配对错误。');
  }
  throw Error('BibTeX 存在未闭合的 @ 记录，请检查末尾花括号。');
}
function safeOutside(text){
  if(!text.trim())return [];
  const lines=text.split(/\r?\n/);
  const kept=[];
  for(const line of lines){
    if(!line.trim())continue;
    if(!line.trim().startsWith('%'))throw Error('BibTeX 记录之外存在不合法的文字：'+line.trim().slice(0,50));
    kept.push(line.trimEnd());
  }
  return kept;
}
export function parseBibtex(input){
  if(typeof input!=='string'||!input.trim())throw Error('请输入 BibTeX 记录或上传 .bib 文件。');
  if(input.length>MAX_BIB_BYTES)throw Error('BibTeX 内容超过 3 MB，建议分批整理。');
  const text=input.replace(/^\uFEFF/,'');
  const entries=[],directives=[],warnings=[];
  let offset=0;
  while(offset<text.length){
    const at=text.indexOf('@',offset);
    if(at<0){directives.push(...safeOutside(text.slice(offset)));break;}
    directives.push(...safeOutside(text.slice(offset,at)));
    let pos=at+1;
    while(pos<text.length&&/\s/.test(text[pos]))pos++;
    const match=/^[A-Za-z][A-Za-z0-9_-]*/.exec(text.slice(pos));
    if(!match)throw Error('第 '+String(text.slice(0,at).split('\n').length)+' 行附近的 @ 后缺少记录类型。');
    const type=match[0].toLowerCase();
    pos+=match[0].length;
    while(pos<text.length&&/\s/.test(text[pos]))pos++;
    const block=extractBlock(text,pos);
    offset=block.end;
    const original=text.slice(at,block.end).trim();
    if(['string','preamble','comment'].includes(type)){
      directives.push(original);
      continue;
    }
    if(entries.length>=MAX_BIB_ENTRIES)throw Error('一次最多整理 4,000 条 BibTeX 引用。');
    const tokens=segments(block.content);
    const key=tokens.shift()?.trim()||'';
    if(!key||/[{}\s,]/.test(key))throw Error('@'+type+' 引用缺少合法 citation key。');
    const fields={},fieldNames=[];
    for(const token of tokens){
      if(!token)continue;
      const eq=equalsIndex(token);
      if(eq<0)throw Error('引用 '+key+' 中存在无效字段：'+token.slice(0,80));
      const name=token.slice(0,eq).trim().toLowerCase();
      const value=token.slice(eq+1).trim();
      if(!/^[a-z][a-z0-9_-]*$/.test(name)||!value)
        throw Error('引用 '+key+' 有无效或空的字段：'+name);
      if(Object.prototype.hasOwnProperty.call(fields,name))
        warnings.push(key+'：重复字段 '+name+'，保留首次出现的值。');
      else{fields[name]=value;fieldNames.push(name);}
    }
    entries.push({id:entries.length,key,type,fields,fieldNames});
  }
  if(!entries.length)throw Error('没有找到可整理的 BibTeX 文献条目。');
  return {entries,directives,warnings};
}
export function plainBibValue(raw){
  let s=String(raw||'').trim();
  for(let i=0;i<4;i++){
    if((s.startsWith('{')&&s.endsWith('}'))||(s.startsWith('"')&&s.endsWith('"'))){
      s=s.slice(1,-1).trim();
    }else break;
  }
  return s;
}
function canonicalTitle(raw){
  return plainBibValue(raw)
    .normalize('NFKD').replace(/\p{M}/gu,'')
    .replace(/\\[a-z]+/gi,'').replace(/[{}\\]/g,'')
    .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}
export function canonicalDoi(raw){
  return plainBibValue(raw).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'')
    .replace(/^doi:\s*/i,'').trim().replace(/[.;,]+$/,'').toLowerCase();
}
export function canonicalArxiv(entry){
  const f=entry.fields||{};
  let value=plainBibValue(f.eprint||f.arxivid||f['arxiv-id']||'');
  if(!value){
    const url=plainBibValue(f.url||'');
    const found=/arxiv\.org\/(?:abs|pdf)\/([^\s?#]+)/i.exec(url);
    if(found)value=found[1].replace(/\.pdf$/i,'');
  }
  value=value.replace(/^arxiv:/i,'').toLowerCase().replace(/v\d+$/,'');
  return /^(\d{4}\.\d{4,5}|[a-z.-]+\/\d{7})$/.test(value)?value:'';
}
export function bibYear(entry){
  const text=plainBibValue(entry.fields.year||entry.fields.date||'');
  const match=/(?:19|20)\d\d/.exec(text);
  return match?Number(match[0]):null;
}
const rich=e=>Object.keys(e.fields).filter(k=>!['abstract','keywords'].includes(k)).length;
export function analyzeBibtex(parsed){
  const entries=parsed.entries||[];
  const issues=[...(parsed.warnings||[])];
  const duplicateGroups=[];
  const seenDoi=new Map(),seenArxiv=new Map(),seenKeys=new Map(),weak=new Map();
  const duplicateIds=new Set();
  const suspicious=[];
  const add=(map,key,id)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(id);};
  for(const e of entries){
    const fields=e.fields;
    const doi=canonicalDoi(fields.doi||'');
    if(doi){
      if(/^10\.\d{4,9}\/\S+$/i.test(doi))add(seenDoi,doi,e.id);
      else issues.push(e.key+'：DOI 格式需要核查。');
    }
    const arxiv=canonicalArxiv(e);
    if(arxiv)add(seenArxiv,arxiv,e.id);
    add(seenKeys,e.key.toLowerCase(),e.id);
    const title=canonicalTitle(fields.title||'');
    const year=bibYear(e);
    if(title&&year)add(weak,title+'|'+year,e.id);
    if(!fields.title)issues.push(e.key+'：缺少 title。');
    if(!fields.author&&!fields.editor)issues.push(e.key+'：缺少 author / editor。');
    if(!year)issues.push(e.key+'：缺少有效 year / date。');
    if(e.type==='article'&&!fields.journal)issues.push(e.key+'：article 缺少 journal。');
    if(['inproceedings','conference'].includes(e.type)&&!fields.booktitle)
      issues.push(e.key+'：inproceedings 缺少 booktitle。');
  }
  const duplicateReason=(map,label)=>{
    for(const [identity,ids] of map){
      if(ids.length<2)continue;
      duplicateGroups.push({reason:label,identity,ids});
    }
  };
  duplicateReason(seenDoi,'DOI');
  // Only auto dedupe by arXiv when neither candidate has a conflicting DOI.
  for(const [identity,ids] of seenArxiv){
    if(ids.length<2)continue;
    const dois=new Set(ids.map(id=>canonicalDoi(entries[id].fields.doi||'')).filter(Boolean));
    if(dois.size<=1)duplicateGroups.push({reason:'arXiv',identity,ids});
    else suspicious.push('arXiv '+identity+' 对应多个不同 DOI，请人工核对。');
  }
  const groupsMerged=[];
  // First-seen citation keys are deliberately kept, never silently renamed.
  const sortedGroups=[...duplicateGroups].sort((a,b)=>a.reason.localeCompare(b.reason));
  for(const group of sortedGroups){
    const ranked=[...group.ids].sort((a,b)=>rich(entries[b])-rich(entries[a])||a-b);
    const survivor=ranked[0];
    for(const id of ranked.slice(1))if(!duplicateIds.has(survivor))duplicateIds.add(id);
    groupsMerged.push({...group,survivor});
  }
  for(const [key,ids] of seenKeys){
    if(ids.length>1)issues.push('引用键重复：'+key+'（'+ids.length+' 条），导出前请修改，防止引用冲突。');
  }
  for(const [identity,ids] of weak){
    if(ids.length<2||ids.every(id=>duplicateIds.has(id)))continue;
    const reference=ids.map(id=>entries[id]);
    const dois=new Set(reference.map(e=>canonicalDoi(e.fields.doi||'')).filter(Boolean));
    if(dois.size>1||!ids.some(id=>duplicateIds.has(id)))
      suspicious.push('标题及年份接近：'+reference.map(e=>e.key).join(' / ')+'，未自动删除。');
  }
  return {issues:[...new Set(issues)],duplicateGroups:groupsMerged,
    duplicateIds:[...duplicateIds].sort((a,b)=>a-b),suspicious:[...new Set(suspicious)]};
}
export function formatBibtex(parsed,{sort='year-desc',excluded=[]}={}){
  const excludedSet=new Set(excluded);
  const original=(parsed.entries||[]).filter(e=>!excludedSet.has(e.id));
  const items=[...original];
  const key=(e)=>e.key.toLowerCase();
  if(sort==='year-desc')items.sort((a,b)=>(bibYear(b)||0)-(bibYear(a)||0)||key(a).localeCompare(key(b)));
  if(sort==='year-asc')items.sort((a,b)=>(bibYear(a)||9999)-(bibYear(b)||9999)||key(a).localeCompare(key(b)));
  if(sort==='key')items.sort((a,b)=>key(a).localeCompare(key(b)));
  if(sort==='title')items.sort((a,b)=>canonicalTitle(a.fields.title).localeCompare(canonicalTitle(b.fields.title)));
  const directives=(parsed.directives||[]).filter(Boolean);
  const formatted=items.map(e=>{
    const fields=Object.keys(e.fields).sort((a,b)=>
      (rank.get(a)??999)-(rank.get(b)??999)||a.localeCompare(b));
    const body=fields.map(f=>'  '+f+' = '+e.fields[f]).join(',\n');
    return '@'+e.type+'{'+e.key+(body?',\n'+body+'\n':'')+'}';
  });
  const output=[...directives,...formatted].join('\n\n');
  return output.trim()+(output?'\n':'');
}
