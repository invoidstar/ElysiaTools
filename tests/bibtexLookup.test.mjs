import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDOI,normalizeArxiv,crossrefToBibtex,openAlexArxivToBibtex,lookupBibtex} from '../src/lib/bibtexLookup.mjs';
import {parseBibtex} from '../src/lib/bibtex.mjs';

test('normalizes identifiers, rejects arbitrary URLs',()=>{
  assert.equal(normalizeDOI('https://doi.org/10.1145/123.42'),'10.1145/123.42');
  assert.equal(normalizeArxiv('https://arxiv.org/abs/2601.01234v2'),'2601.01234');
  assert.throws(()=>normalizeDOI('https://example.com/foo'));
  assert.throws(()=>normalizeArxiv('not-an-id'));
});
test('Crossref response produces parseable journal article BibTeX',()=>{
  const source={DOI:'10.1145/123.42',type:'journal-article',
    title:['An Interesting Paper'],author:[{given:'Alice',family:'Smith'}],
    published:{'date-parts':[[2026,1]]},'container-title':['Sample Journal'],
    volume:'7',issue:'2',page:'10-20'};
  const bib=crossrefToBibtex(source,source.DOI).bibtex;
  const parsed=parseBibtex(bib);
  assert.equal(parsed.entries.length,1);
  assert.match(bib,/doi = \{10\.1145\/123\.42\}/);
  assert.match(bib,/journal = \{Sample Journal\}/);
});
test('arXiv BibTeX contains explicit eprint identity',()=>{
  const bib=openAlexArxivToBibtex({id:'https://openalex.org/W123',display_name:'Robot Learns Motion',
    publication_year:2026,authorships:[{author:{display_name:'Alex Smith'}}]},'2601.01234').bibtex;
  assert.match(bib,/eprint = \{2601\.01234\}/);
  assert.equal(parseBibtex(bib).entries.length,1);
});
test('Crossref mismatch blocked; no blind metadata merge',async()=>{
  await assert.rejects(lookupBibtex('doi','10.1145/123.42',async()=>({
    ok:true,status:200,json:async()=>({message:{DOI:'10.1145/99.99',title:['Wrong']}})
  })),/不一致/);
});
