import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDOI,normalizeArxiv,escapeBibText,crossrefToBibtex,
  openAlexArxivToBibtex,lookupBibtex} from '../src/lib/bibtexLookup.mjs';
import {parseBibtex} from '../src/lib/bibtex.mjs';
test('normalizes exact identifiers and rejects arbitrary URLs',()=>{
  assert.equal(normalizeDOI('https://doi.org/10.1145/123.42'),'10.1145/123.42');
  assert.equal(normalizeArxiv('https://arxiv.org/abs/2601.01234v2'),'2601.01234');
  assert.throws(()=>normalizeDOI('https://example.com/foo'));
  assert.throws(()=>normalizeArxiv('not-an-id'));
});
test('UTF-8 and special characters remain safe in BibTeX fields',()=>{
  const s=escapeBibText('A_B & C% {X} in 中国');
  assert.match(s,/A\\_B \\& C\\% \\{X\\}/);
  assert.match(s,/中国/);
  const work={DOI:'10.1145/123.42',type:'journal-article',
    title:['<i>Vision-Language</i> &amp; Robot_1: 20% {Success}'],
    author:[{given:'Zoë',family:'Li'}],
    published:{'date-parts':[[2026,1]]},
    'container-title':['Robotics & Learning'],
    volume:'7',issue:'2',page:'10-20'};
  const bib=crossrefToBibtex(work,work.DOI).bibtex;
  assert.match(bib,/title = \{\{Vision-Language \\& Robot\\_1: 20\\% \\{Success\\}\}\}/);
  assert.match(bib,/journal = \{Robotics \\& Learning\}/);
  assert.match(bib,/author = \{Li, Zoë\}/);
  assert.equal(parseBibtex(bib).entries.length,1);
});
test('Crossref article produces parseable BibTeX with original DOI',()=>{
  const input={DOI:'10.1145/123.42',type:'journal-article',
    title:['An Interesting Paper'],author:[{given:'Alice',family:'Smith'}],
    published:{'date-parts':[[2026,1]]},'container-title':['Sample Journal']};
  const bib=crossrefToBibtex(input,input.DOI).bibtex;
  assert.equal(parseBibtex(bib).entries.length,1);
  assert.match(bib,/doi = \{10\.1145\/123\.42\}/);
});
test('arXiv BibTeX keeps exact eprint and parses locally',()=>{
  const bib=openAlexArxivToBibtex({id:'https://openalex.org/W123',
    display_name:'Robot Learns Motion',publication_year:2026,
    authorships:[{author:{display_name:'Alex Smith'}}]},'2601.01234').bibtex;
  assert.match(bib,/eprint = \{2601\.01234\}/);
  assert.match(bib,/archiveprefix = \{arXiv\}/);
  assert.equal(parseBibtex(bib).entries.length,1);
});
test('Crossref mismatch is blocked',async()=>{
  await assert.rejects(lookupBibtex('doi','10.1145/123.42',async()=>({
    ok:true,status:200,json:async()=>({message:{DOI:'10.1145/99.99',title:['Wrong']}})
  })),/不一致/);
});
test('OpenAlex requires verified matching arXiv DOI not just Work ID',async()=>{
  const wrong={id:'https://openalex.org/W123',doi:'https://doi.org/10.48550/arxiv.2501.99999',
    display_name:'Unrelated work',publication_year:2026};
  await assert.rejects(lookupBibtex('arxiv','2601.01234',async()=>({
    ok:true,status:200,json:async()=>wrong
  })),/未能确认/);
  const correct={...wrong,doi:'https://doi.org/10.48550/arxiv.2601.01234'};
  const result=await lookupBibtex('arxiv','2601.01234',async()=>({
    ok:true,status:200,json:async()=>correct
  }));
  assert.match(result.bibtex,/eprint = \{2601\.01234\}/);
});
test('rate limits are surfaced and invalid JSON not merged',async()=>{
  await assert.rejects(lookupBibtex('arxiv','2601.01234',async()=>({
    status:429,ok:false
  })),/限流/);
  await assert.rejects(lookupBibtex('doi','10.1145/123.42',async()=>({
    status:200,ok:true,json:async()=>{throw Error('invalid JSON')}
  })),/无法解析/);
});
