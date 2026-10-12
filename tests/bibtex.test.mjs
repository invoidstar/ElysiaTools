import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBibtex,formatBibtex,analyzeBibtex,bibYear,canonicalDoi} from '../src/lib/bibtex.mjs';

const sample=String.raw`% project bibliography
@string{aij = "Artificial Intelligence Journal"}
@article{vision2024,
  author={Lee, Alice and Zhang, Bo},
  title={{Vision-Language Models} for Robotics},
  journal = aij,
  year = {2024},
  doi = {https://doi.org/10.1000/ABC.1},
  note = {One {nested} expression, with comma}
}
@inproceedings{embodied2025,
  title = "Embodied Robotics, {A} Study",
  author={Wu, Kai},
  year={2025},
  booktitle={Proceedings of {Robotics}, and AI},
  url={https://arxiv.org/abs/2501.12345}
}`;
test('parse multiline BibTeX, strings, nested braces and quoted commas without discarding data',()=>{
  const parsed=parseBibtex(sample);
  assert.equal(parsed.entries.length,2);
  assert.equal(parsed.entries[0].fields.note,'{One {nested} expression, with comma}');
  assert.equal(parsed.entries[1].fields.booktitle,'{Proceedings of {Robotics}, and AI}');
  assert.ok(parsed.directives.some(x=>x.startsWith('@string')));
  assert.ok(parsed.directives.some(x=>x.startsWith('%')));
  const exported=formatBibtex(parsed);
  assert.match(exported,/journal = aij/);
  assert.match(exported,/One \{nested\} expression/);
  assert.ok(exported.indexOf('embodied2025')<exported.indexOf('vision2024'));
  assert.deepEqual(parseBibtex(exported).entries.map(x=>x.key),['embodied2025','vision2024']);
});
test('same DOI identifies high-confidence duplicate without losing first key by default',()=>{
  const s='@article{old,title={Hello},year={2020},doi={10.1234/ABC}}\\n@article{new,title={Hello New},year={2020},author={Ada},journal={Nature},doi={https://doi.org/10.1234/abc}}'.replace('\\n','\n');
  const parsed=parseBibtex(s);
  const report=analyzeBibtex(parsed);
  assert.equal(report.duplicateIds.length,1);
  assert.equal(report.duplicateGroups[0].reason,'DOI');
  const defaultOut=formatBibtex(parsed);
  assert.match(defaultOut,/@article\{old/);
  const clean=formatBibtex(parsed,{excluded:report.duplicateIds});
  assert.equal(parseBibtex(clean).entries.length,1);
  assert.equal(canonicalDoi('{https://doi.org/10.1234/ABC}'),'10.1234/abc');
});
test('similar title with different DOI is flagged only, not auto-removed',()=>{
  const parsed=parseBibtex('@article{a,title={Same Paper},author={A},year={2024},journal={X},doi={10.1111/a}}\n@article{b,title={{Same Paper}},author={B},year={2024},journal={X},doi={10.1111/b}}');
  const analysis=analyzeBibtex(parsed);
  assert.equal(analysis.duplicateIds.length,0);
  assert.ok(analysis.suspicious.some(x=>x.includes('标题')));
});
test('BibTeX key conflicts and missing metadata are reported',()=>{
  const parsed=parseBibtex('@article{same, title={A}, year={2022}}\n@misc{same,title={B}}');
  const report=analyzeBibtex(parsed);
  assert.ok(report.issues.some(x=>x.includes('引用键重复')));
  assert.ok(report.issues.some(x=>x.includes('journal')));
  assert.ok(report.issues.some(x=>x.includes('year')));
});
test('parse parenthesized entries, protect LaTeX and export unknown fields',()=>{
  const parsed=parseBibtex('@misc(foo, title="A \\\\alpha and {B}", howpublished={arXiv}, customfield={yes}, year=2026)');
  assert.equal(parsed.entries[0].fields.customfield,'{yes}');
  assert.ok(formatBibtex(parsed).includes('customfield = {yes}'));
  assert.equal(bibYear(parsed.entries[0]),2026);
});
test('reject malformed BibTeX rather than silently deleting citations',()=>{
  assert.throws(()=>parseBibtex('@article{bad,title={Unclosed}'),/未闭合/);
  assert.throws(()=>parseBibtex('@article{bad,title=}'),/空的字段/);
  assert.throws(()=>parseBibtex('mystery text\n@article{ok,title={A}}'),/不合法/);
});
test('trim duplicated BibTeX safely while keeping directives',()=>{
  const parsed=parseBibtex(sample);
  const report=analyzeBibtex(parsed);
  assert.equal(report.duplicateIds.length,0);
  assert.equal(parseBibtex(formatBibtex(parsed,{sort:'key'})).entries.length,2);
  assert.ok(formatBibtex(parsed,{excluded:[0]}).includes('@string'));
});
