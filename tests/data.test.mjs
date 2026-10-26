import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = file => JSON.parse(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const editions = load('editions.json');
const conferences = load('conferences.json');
const journals = load('journals.json');

test('AoE deadline preserves official day and converts to UTC', () => {
  const cvpr = editions.find(x => x.id === 'cvpr-2027');
  const paper = cvpr.tracks[0].events.find(x => x.kind === 'paper');
  assert.equal(paper.original, '2026-11-16T23:59');
  assert.equal(paper.utc, '2026-11-17T11:59:00.000Z');
  assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Singapore',hour:'2-digit',hourCycle:'h23'}).format(new Date(paper.utc)), '19');
});
test('separate USENIX submission cycles cannot collide', () => {
  const usenix = editions.find(x => x.id === 'usenix-security-2027');
  assert.equal(usenix.tracks.length, 2);
  assert.notEqual(usenix.tracks[0].events.find(e => e.kind === 'paper').utc, usenix.tracks[1].events.find(e => e.kind === 'paper').utc);
});
test('unpublished KDD cycle stays TBD', () => {
  const kdd = editions.find(x => x.id === 'sigkdd-2027');
  const cycle = kdd.tracks.find(x => x.id === 'research-c2');
  assert.equal(cycle.events.length, 0);
  assert.ok(cycle.pending.length > 0);
});
test('CCF versions remain separate from ISSN and other identifiers', () => {
  assert.equal(journals.find(x => x.id === 'tro').ccf, 'B');
  const acl = conferences.find(x => x.acronym === 'ACL');
  assert.equal(acl.ccfYear, 2026);
  assert.equal(acl.ccf, 'A');
});
test('date-only events never invent a UTC instant', () => {
  const all = editions.flatMap(e => e.tracks.flatMap(t => t.events));
  const dateOnly = all.find(e => e.precision === 'date');
  assert.ok(dateOnly && !dateOnly.utc);
});


test('full CCF 2026 directory matches official row totals', () => {
  const coverage = load('ccf-coverage.json');
  assert.equal(coverage.listedRows, 681);
  assert.equal(conferences.length, 386);
  assert.equal(journals.filter(x => x.ccf).length, 291);
  assert.equal(journals.length, 292); // includes extra non-CCF RA-L
  assert.equal(conferences.reduce((n,x)=>n+x.ccfEntries.length,0),386);
  assert.equal(journals.reduce((n,x)=>n+x.ccfEntries.length,0),295);
});

test('four journals cross-list subjects without duplicate identity', () => {
  for(const name of ['TOMM','DKE','IPL','IJIS']) {
    const matches=journals.filter(x=>x.acronym===name);
    assert.equal(matches.length,1,name);
    assert.equal(matches[0].ccfEntries.length,2,name);
  }
  const securityFSE=conferences.find(x=>x.id==='fse-crypto');
  const softwareFSE=conferences.find(x=>x.id==='fse-software');
  assert.ok(securityFSE&&softwareFSE&&securityFSE.id!==softwareFSE.id);
});

test('acceptance rates have distinct conference-year-track records and official provenance', () => {
  const acceptance=load('acceptance.json'), sources=load('sources.json');
  const ids=new Set(sources.map(x=>x.id));
  assert.ok(acceptance.length>=10);
  const keys=acceptance.map(x=>[x.conferenceId,x.year,x.track].join('|'));
  assert.equal(new Set(keys).size,keys.length);
  for(const x of acceptance){
    assert.ok(ids.has(x.sourceId));
    assert.ok(x.rate>0&&x.rate<=100);
    if(x.submissions!=null && x.accepted!=null)
      assert.ok(Math.abs(100*x.accepted/x.submissions-x.rate)<0.6);
  }
});

test('restricted CAS 2025 and independent XinRui 2026 are not fabricated', () => {
  for(const journal of journals){
    for(const entry of journal.indicators){
      if(['cas','xinrui'].includes(entry.system))
        assert.ok(entry.sourceId && entry.license);
    }
  }
  const enriched=journals.filter(j=>j.indicators.some(m=>m.system==='jif'));
  assert.ok(enriched.length>0);
  assert.ok(enriched.every(j=>j.indicators.every(m=>m.year>=2024)));
});

test('AAAI 2027 change log preserves corrected author feedback window', () => {
  const aaai=editions.find(x=>x.id==='aaai-2027');
  const feedback=aaai.tracks.find(x=>x.id==='main');
  assert.equal(feedback.events.find(e=>e.title==='Author feedback opens').original,'2026-10-24');
  assert.equal(feedback.events.find(e=>e.title==='Author feedback closes').original,'2026-10-31');
  assert.ok(aaai.changeLog.length>0);
});


test('expanded history covers many conferences and preserves source quality',()=>{
  const rows=load('acceptance.json'),sources=load('sources.json');
  const kinds=new Map(sources.map(s=>[s.id,s.kind]));
  assert.ok(rows.length>=1000);
  assert.ok(new Set(rows.map(r=>r.conferenceId)).size>=200);
  assert.ok(rows.some(r=>kinds.get(r.sourceId)==='community-history'));
  assert.ok(rows.some(r=>kinds.get(r.sourceId)==='official-history'));
  for(const row of rows){
    assert.ok(kinds.has(row.sourceId));
    assert.ok(row.year>=1990&&row.year<=2026);
    assert.ok(row.rate>0&&row.rate<100);
    if(row.accepted!=null&&row.submissions!=null)
      assert.ok(Math.abs(row.rate-100*row.accepted/row.submissions)<0.7);
  }
});
test('LetPub public limited XinRui facts have per-journal source and edition',()=>{
  const src=load('sources.json');
  const byId=new Map(src.map(s=>[s.id,s]));
  const withXinrui=journals.filter(j=>j.indicators.some(x=>x.system==='xinrui'));
  assert.ok(withXinrui.length>=8);
  for(const journal of withXinrui){
    for(const metric of journal.indicators.filter(x=>x.system==='xinrui')){
      assert.equal(metric.year,2026);
      assert.match(metric.value,/^[1-4]区$/);
      assert.ok(byId.get(metric.sourceId)?.url?.includes('letpub.com.cn'));
      assert.equal(byId.get(metric.sourceId)?.kind,'thirdparty-public-fact');
    }
  }
});


test('public journal UI has no browser sync or import control', () => {
  const page = readFileSync(new URL('../src/features/JournalPage.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(!page.includes('MetricImportPanel'));
  assert.ok(!app.includes('MetricsProvider'));
});


test('pinned annual source audit records full coverage without duplicating source CSV values', () => {
  const report = load('metric-source-audit.json');
  assert.equal(report.previousAudit.referenceJournalIdentities, 292);
  assert.ok(report.compiledPublicData.indexedJournals >= 23000);
  assert.ok(report.compiledPublicData.entriesWithAnyIndicators >= 23000);
  assert.ok(report.compiledPublicData.cas2025 >= 21000);
  assert.ok(report.compiledPublicData.xinrui2026 >= 22000);
  assert.ok(report.compiledPublicData.jcr2025 >= 20000);
  assert.ok(report.compiledPublicData.jif2025 >= 22000);
  assert.ok(report.rightsStatus.includes('independent verification not recorded'));
  const row = JSON.stringify(report);
  assert.ok(!row.includes('Category_1'));
  assert.ok(!('indicators' in report));
});

test('all curated current conference editions expose the corresponding year homepage',()=>{
  const sources=load('sources.json');
  assert.ok(editions.length>=13,'Expected independently checked annual editions');
  for(const edition of editions){
    const conf=conferences.find(c=>c.id===edition.conferenceId);
    const source=sources.find(s=>s.id===edition.sourceId);
    assert.ok(conf && source,'missing conference/source for '+edition.id);
    assert.ok(edition.website?.startsWith('https://'),'missing edition-specific website '+edition.id);
    // Curated conference-series homepage may legitimately differ from annual site.
    assert.equal(edition.websiteSourceId,edition.sourceId,'annual URL requires official source provenance');
    assert.equal(source.kind,'official-cfp','annual website provenance must be official');
  }
});

test('journal UI hides identifier fields but retains internal identity matching',()=>{
  const drawer=readFileSync(new URL('../src/components/DetailDrawer.tsx',import.meta.url),'utf8');
  const page=readFileSync(new URL('../src/features/JournalPage.tsx',import.meta.url),'utf8');
  const compare=readFileSync(new URL('../src/components/JournalCompare.tsx',import.meta.url),'utf8');
  for(const text of [drawer,page,compare]){
    assert.ok(!['ISSN-L','ISSN /','eISSN','ISSN 待补充'].some(term=>text.includes(term)));
  }
  const indexer=readFileSync(new URL('../scripts/sync/build_journal_universe.mjs',import.meta.url),'utf8');
  assert.ok(indexer.includes('canonicalISSN'),'must retain internal identity crosswalk');
});

test('journal publication figures load automatically for a rolling five-year period',()=>{
  const component=readFileSync(new URL('../src/components/ResearchCharts.tsx',import.meta.url),'utf8');
  assert.ok(component.includes('useJournalOpenAlex(journal)'));
  assert.ok(component.includes('Array.from({length:5}'));
  assert.ok(!component.includes('onClick={lookup}'),'publication history must not require a button');
  assert.ok(component.includes('year===currentYear'),'incomplete current year must be disclosed');
});

test('research utilities have independent navigable pages and retain working BibTeX editing',()=>{
  const hub=readFileSync(new URL('../src/features/ToolsPage.tsx',import.meta.url),'utf8');
  const bibPage=readFileSync(new URL('../src/features/BibtexToolPage.tsx',import.meta.url),'utf8');
  const identifier=readFileSync(new URL('../src/features/IdentifierToolPage.tsx',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../src/components/BibtexTool.tsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  for(const removed of ['论文图像检查','科研统计计算','学术绘图助手','ON THE ROADMAP'])
    assert.ok(!hub.includes(removed),'Unused card should not be displayed: '+removed);
  assert.ok(hub.includes("onNavigate('tools/'+tool.id)"));
  assert.ok(hub.includes("id:'identifier'") && hub.includes("id:'bibtex'"));
  assert.ok(bibPage.includes('<BibtexTool/>'));
  assert.ok(identifier.includes('resolver-box') && identifier.includes('onBack'));
  for(const route of ["detailId === 'identifier'","detailId === 'bibtex'"])
    assert.ok(app.includes(route),'Independent tool route missing: '+route);
  for(const feature of ['parseBibtex','analyzeBibtex','formatBibtex','downloadContent','type="file"'])
    assert.ok(editor.includes(feature),'BibTeX editor is missing capability: '+feature);
});
test('OpenAlex client caches results and honors anonymous quota cooldown without hardcoded keys',()=>{
  const source=readFileSync(new URL('../src/lib/openAlex.ts',import.meta.url),'utf8');
  for(const token of ['getCachedSource','putCachedSource','getApiCooldown','Retry-After','X-RateLimit-Reset'])
    assert.ok(source.includes(token),'Missing source API control: '+token);
  assert.ok(!source.includes('api_key='));
  assert.ok(!source.includes('mailto='));
});

test('journal dropdowns stay enabled and offer separate evaluation-system tiers',()=>{
  const page=readFileSync(new URL('../src/features/JournalPage.tsx',import.meta.url),'utf8');
  assert.ok(page.includes('journalTierOptions(indicator)'));
  assert.ok(page.includes('matchesJournalRankFilters'));
  assert.ok(!page.includes('disabled={!indicator}'));
  assert.ok(!page.includes('disabled={!indicator ||'));
  assert.ok(!page.includes("disabled={!loading&&count("));
  assert.ok(page.includes('<optgroup label={group}'));
});


test('new official deadlines distinguish ARR commitment from initial paper submission',()=>{
  const naacl=editions.find(e=>e.id==='naacl-2027');
  const main=naacl.tracks.find(t=>t.id==='main');
  const arr=main.events.find(e=>e.kind==='paper');
  const commit=main.events.find(e=>e.kind==='commitment');
  assert.ok(Date.parse(commit.utc)>Date.parse(arr.utc));
  assert.equal(commit.original,'2026-12-23T23:59');
  const siggraph=editions.find(e=>e.id==='siggraph-2027');
  assert.equal(siggraph.tracks[0].events.find(e=>e.kind==='paper').utc,'2027-01-28T22:00:00.000Z');
});
