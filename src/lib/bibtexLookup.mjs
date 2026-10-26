/** Lightweight browser-only DOI/arXiv -> BibTeX. Only the identifier is sent. */
const plain=value=>String(value??'').replace(/<[^>]*>/g,' ')
  .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&quot;/gi,'"').replace(/&apos;/gi,"'")
  .replace(/\s+/g,' ').trim();
const first=value=>Array.isArray(value)?value[0]:value;

/** Preserve UTF-8, LaTeX syntax and source punctuation without altering identity. */
export function escapeBibText(value){
  const escapes={
    '\\':'\\textbackslash{}','{':'\\{','}':'\\}',
    '#':'\\#','$':'\\$','%':'\\%','&':'\\&','_':'\\_',
    '~':'\\textasciitilde{}','^':'\\textasciicircum{}'
  };
  // Escape input characters in a single pass so inserted macro braces are preserved.
  return plain(value).replace(/[\\{}#$%&_~^]/g,character=>escapes[character]);
}
export function normalizeDOI(value){
  const doi=String(value||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'')
    .replace(/^doi:\s*/i,'').replace(/[).,;\s]+$/,'');
  if(!/^10\.\d{4,9}\/\S+$/i.test(doi)||doi.length>260)
    throw Error('DOI 格式无效，请输入 10.xxxx/… 或 doi.org 链接。');
  return doi;
}
export function normalizeArxiv(value){
  const id=String(value||'').trim()
    .replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i,'')
    .replace(/^arxiv:/i,'').replace(/\.pdf$/i,'');
  if(!/^(\d{4}\.\d{4,5}|[a-z.-]+\/\d{7})(v\d+)?$/i.test(id)||id.length>70)
    throw Error('arXiv ID 格式无效，例如 2601.01234。');
  return id.replace(/v\d+$/i,'');
}
function keyFor(name,year,title){
  const family=plain(name).split(/,\s*|\s+/).filter(Boolean).at(-1)||'Paper';
  const word=plain(title).split(/\s+/).find(x=>x.length>3)||'Work';
  const ascii=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9]/g,'').slice(0,22);
  return (ascii(family)||'Paper')+(year||'ND')+(ascii(word)||'Work');
}
function bibEntry(type,key,fields){
  const textFields=new Set(['title','author','journal','booktitle','publisher']);
  const rows=Object.entries(fields).filter(([,value])=>plain(value))
    .map(([field,value])=>{
      const escaped=textFields.has(field)?escapeBibText(value):plain(value);
      // Case protection helps preserve known acronyms such as VLA/GPT.
      return '  '+field+' = {'+(field==='title'?'{'+escaped+'}':escaped)+'}';
    });
  if(!rows.length)throw Error('书目信息不完整，不能生成引用。');
  return '@'+type+'{'+key+',\n'+rows.join(',\n')+'\n}';
}
export function crossrefToBibtex(item,doi){
  const title=plain(first(item.title));
  if(!title)throw Error('Crossref 未返回文章标题，已停止导入。');
  const authors=(item.author||[]).map(a=>plain([a.family,a.given].filter(Boolean).join(', ')))
    .filter(Boolean);
  const year=Number(item.published?.['date-parts']?.[0]?.[0] ||
    item.issued?.['date-parts']?.[0]?.[0] || 0);
  const container=plain(first(item['container-title']));
  const type=item.type==='journal-article'?'article':
    item.type==='proceedings-article'?'inproceedings':'misc';
  const key=keyFor(item.author?.[0]?.family||'Paper',year,title);
  return {bibtex:bibEntry(type,key,{
    title,author:authors.join(' and '),year:year||'',
    ...(type==='article'?{journal:container}:
       type==='inproceedings'?{booktitle:container}:{}),
    volume:item.volume,number:item.issue,pages:item.page,
    publisher:item.publisher,doi,url:'https://doi.org/'+doi
  }),source:'Crossref',title,identifier:doi};
}
export function openAlexArxivToBibtex(work,id){
  const title=plain(work.display_name||work.title);
  if(!title)throw Error('OpenAlex 未返回文章标题，已停止导入。');
  const authors=(work.authorships||[]).map(a=>plain(a.author?.display_name)).filter(Boolean);
  const year=Number(work.publication_year||0);
  const key=keyFor(authors[0],year,title);
  return {bibtex:bibEntry('misc',key,{
    title,author:authors.join(' and '),year:year||'',
    eprint:id,archiveprefix:'arXiv',url:'https://arxiv.org/abs/'+id
  }),source:'OpenAlex (arXiv DOI crosswalk)',title,identifier:id};
}
async function readJSON(fetcher,url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{
    response=await fetcher(url,{headers:{Accept:'application/json'},signal:controller.signal});
    if(response.status===429)throw Error('元数据接口已限流。请稍后重试，或从原站复制 BibTeX。');
    if(!response.ok)throw Error('未找到匹配的书目元数据（HTTP '+response.status+'）。');
    try{return await response.json();}
    catch{throw Error('元数据接口返回了无法解析的内容。');}
  }catch(error){
    if(error?.name==='AbortError')
      throw Error('元数据查询已超时（12 秒），请稍后重试。');
    if(error instanceof Error && (error.message.includes('限流')||
       error.message.includes('HTTP ')||error.message.includes('无法解析')))throw error;
    throw Error('学术元数据接口连接失败，请检查网络或稍后重试。');
  }finally{
    clearTimeout(timeout);
  }
}
export async function lookupBibtex(kind,value,fetcher=fetch){
  if(kind==='doi'){
    const doi=normalizeDOI(value);
    const data=await readJSON(fetcher,'https://api.crossref.org/works/'+encodeURIComponent(doi));
    if(!data?.message?.DOI||normalizeDOI(data.message.DOI).toLowerCase()!==doi.toLowerCase())
      throw Error('Crossref 返回的 DOI 与输入不一致，已阻止导入。');
    return crossrefToBibtex(data.message,doi);
  }
  if(kind==='arxiv'){
    const id=normalizeArxiv(value);
    // The arXiv Atom API lacks browser CORS. Query its DOI-indexed OpenAlex entry.
    const doi='10.48550/arxiv.'+id;
    const work=await readJSON(fetcher,'https://api.openalex.org/works/doi:'+encodeURIComponent(doi));
    if(!work?.id||!String(work.id).startsWith('https://openalex.org/W')||
       !work.doi||normalizeDOI(work.doi).toLowerCase()!==doi.toLowerCase())
      throw Error('OpenAlex 未能确认该 arXiv DOI 的准确身份，已阻止错误引用导入。');
    return openAlexArxivToBibtex(work,id);
  }
  throw Error('仅支持 DOI 和 arXiv 元数据导入。');
}
