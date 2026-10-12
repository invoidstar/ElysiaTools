/**
 * User-provided metric tables are processed locally in the browser.
 * Nothing is fetched, redistributed or uploaded. Import only data you are
 * authorized to use. CCF journals are matched by ISSN or exact title.
 */

const clean = v => String(v == null ? '' : v).normalize('NFKC').trim();
export const normalizeJournal = v => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizeHeader = v => clean(v).toLowerCase().replace(/[\s_\-()[\]\/（）]/g, '');
const validISSN = v => /^\d{4}-\d{3}[\dX]$/i.test(clean(v)) ? clean(v).toUpperCase() : '';
const findZone = v => {
  const result = clean(v).match(/^\s*([1-4])\s*(?:区|區|\[|$)/u);
  return result ? result[1] + '区' : '';
};
const findQuartile = v => /^Q[1-4]$/i.test(clean(v)) ? clean(v).toUpperCase() : '';
const findImpact = v => /^(?:<\s*)?(?:\d+(?:\.\d+)?|\.\d+)$/.test(clean(v)) ? clean(v) : '';

/** Lightweight RFC-4180 compatible parser; supports CSV, TSV, UTF-8 BOM. */
export function parseCsvRows(text, maxRows = 50000) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('CSV 文件为空。');
  if (text.length > 30_000_000) throw new Error('CSV 文件过大（最大 30 MB）。');
  const firstLine = text.slice(0, 6000).split(/\r?\n/)[0];
  const count = delimiter => {
    let quote = false, n = 0;
    for (let i=0; i<firstLine.length; i++) {
      if (firstLine[i] === '"') quote = !quote;
      else if (!quote && firstLine[i] === delimiter) n++;
    }
    return n;
  };
  const delim = ['\t', ',', ';'].sort((a, b) => count(b) - count(a))[0];
  const rows = [], row = [];
  let field = '', quoted = false;
  const pushRow = () => {
    row.push(field);
    if (row.some(v => v.trim())) rows.push(row.slice());
    row.length = 0;
    field = '';
    if (rows.length > maxRows + 1) throw new Error('CSV 最多支持 50,000 行数据。');
  };
  for (let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch === '"') {
      if(quoted && text[i+1] === '"') {field+='"';i++;}
      else quoted=!quoted;
    } else if (ch===delim && !quoted) {row.push(field);field='';}
    else if ((ch==='\n'||ch==='\r') && !quoted) {
      pushRow();
      if (ch==='\r' && text[i+1]==='\n') i++;
    } else field+=ch;
  }
  if(quoted)throw new Error('CSV 中存在未闭合的引号。');
  if(field.length||row.length)pushRow();
  if(rows.length<2)throw new Error('CSV 缺少表头或数据行。');
  const headers=rows[0].map((x,i)=>i===0?x.replace(/^\uFEFF/,'').trim():x.trim());
  return rows.slice(1).map(row => Object.fromEntries(headers.map((h,i)=>[h, clean(row[i])]))).filter(v => Object.values(v).some(Boolean));
}

export function parseMetricFile(text, filename, journals) {
  const rows = parseCsvRows(text);
  const headers = Object.keys(rows[0]);
  const hm = new Map(headers.map(h => [normalizeHeader(h),h]));
  const raw = (r, candidates) => {
    for(const name of candidates) {
      const key=hm.get(normalizeHeader(name));
      if(key && r[key]) return r[key];
    }
    return '';
  };
  const has = name => hm.has(normalizeHeader(name));
  const isJcr = headers.some(h=>/^IF\(\d{4}\)/i.test(h) || /^IF Quartile/i.test(h));
  const isCas = has('大类分区') || /FQBJCR/i.test(filename);
  const isXr = has('大类新锐分区') || /^XR20/i.test(filename);
  const isSimple = ['CAS2025','XR2026','JCR2025','JIF2025','中科院2025','新锐2026'].some(has);
  if(!isJcr&&!isCas&&!isXr&&!isSimple)throw new Error('无法识别表格：需包含 JCR、2025 中科院、新锐 2026 或 ElysiaTools 模板字段。');
  if(!has('Journal')&&!has('期刊名称')&&!has('期刊名')&&!has('Title'))
    throw new Error('表格缺少 Journal（或期刊名称）字段。');
  const indexed=new Map(), byIssn=new Map(), ambiguous=new Set();
  for(const j of journals){
    const names=[j.name,...(j.aliases||[])];
    for(const n of names){
      const key=normalizeJournal(n);
      if(!key)continue;
      if(indexed.has(key)&&indexed.get(key)!==j.id)ambiguous.add(key);
      else indexed.set(key,j.id);
    }
    for(const identifier of [j.issn,j.eissn,j.issnL].filter(Boolean)){
      const id=validISSN(identifier);
      if(id&&!byIssn.has(id))byIssn.set(id,j.id);
    }
  }
  for(const id of ambiguous)indexed.delete(id);
  const records={},stats={file:filename,total:rows.length,matched:0,unmatched:0,withoutMetrics:0,ambiguous:0,systems:{cas:0,xinrui:0,jcr:0,jif:0},sampleUnmatched:[]};
  const append = (id, metric) => {
    const list=records[id] || (records[id]=[]);
    const key=m=>m.system+'|'+m.year+'|'+(m.category||'');
    const index=list.findIndex(m=>key(m)===key(metric));
    if(index<0)list.push(metric);else list[index]=metric;
    stats.systems[metric.system]++;
  };
  for(const row of rows){
    const title=raw(row,['Journal','期刊名称','期刊名','Title']);
    const issns=[...String(raw(row,['ISSN/EISSN'])).split(/[\/;,| ]+/),raw(row,['ISSN']),raw(row,['EISSN','eISSN'])].map(validISSN).filter(Boolean);
    const ids=[...new Set(issns.map(x=>byIssn.get(x)).filter(Boolean))];
    let id='';
    if(ids.length>1){stats.ambiguous++;continue;}
    if(ids.length===1)id=ids[0];
    else if(title)id=indexed.get(normalizeJournal(title))||'';
    if(!id){stats.unmatched++;if(stats.sampleUnmatched.length<6&&title)stats.sampleUnmatched.push(title);continue;}
    const list=[];
    const add=(system,value,year,category='')=>{
      if(!value)return;
      list.push({system,value,year,category:clean(category),sourceId:'user-import',license:'private-only',provenance:'user-provided'});
    };
    const category=raw(row,['大类','大类学科','大类名称','大类中文名','Category']);
    if(isCas) {
      add('cas',findZone(raw(row,['大类分区'])),2025,category);
      for(let n=1;n<=6;n++){
        const name=raw(row,['小类'+n]).trim();
        const zone=findZone(raw(row,['小类'+n+'分区']));
        if(name&&zone)add('cas',zone,2025,'小类:'+name);
      }
    }
    if(isXr) {
      add('xinrui',findZone(raw(row,['大类新锐分区'])),2026,
        raw(row,['大类中文名','大类英文名'])||category);
      const additionalMajor=findZone(raw(row,['大类2新锐分区']));
      if(additionalMajor)add('xinrui',additionalMajor,2026,
        '第二大类:'+(raw(row,['大类2中文名','大类2英文名'])||'其他'));
      for(let n=1;n<=6;n++){
        const name=raw(row,['小类'+n+'中文名','小类'+n+'英文名']);
        const zone=findZone(raw(row,['小类'+n+'新锐分区']));
        if(name&&zone)add('xinrui',zone,2026,'小类:'+name);
      }
    }
    add('cas',findZone(raw(row,['CAS2025','中科院2025'])),2025,category);
    add('xinrui',findZone(raw(row,['XR2026','新锐2026'])),2026,category);
    add('jcr',findQuartile(raw(row,['JCR2025','JCR2026'])),2026,category);
    add('jif',findImpact(raw(row,['JIF2025','IF(2025)','影响因子2025'])),2025,category);
    if(isJcr){
      const jcrKeys=headers.filter(h=>/^IF Quartile\(2025\)_[1-9]$/i.test(h));
      for(const key of jcrKeys){
        const n=Number(key.match(/_([1-9])$/)?.[1]||0);
        const q=findQuartile(row[key]);
        if(q) add('jcr',q,2026,raw(row,['Category_'+n]) || 'JCR category '+n);
      }
    }
    // Each system is a separate rating, not a single interchangeable level.
    if(!list.length){stats.withoutMetrics++;continue;}
    stats.matched++;
    for(const m of list)append(id,m);
  }
  return {records,stats};
}

export function mergeImportedMetrics(base, incoming) {
  const out={...base};
  for(const [id,entries] of Object.entries(incoming)){
    const copy=[...(out[id]||[])];
    for(const entry of entries){
      const pos=copy.findIndex(m=>m.system===entry.system&&m.year===entry.year&&(m.category||'')===(entry.category||''));
      if(pos<0)copy.push(entry);else copy[pos]=entry;
    }
    out[id]=copy;
  }
  return out;
}
