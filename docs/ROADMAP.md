# ElysiaTools — Maintenance and Next Steps

## Delivered

- V1.0–V1.2: React / GitHub Pages foundation, CCF conference and journal directories, calendars, ICS, historical acceptance trends, My Academic and academic identifier links.
- V1.3–V1.4: Complete authorized annual journal ranking directory, careful ISSN/title matching, source provenance, classification subjects and missing-data diagnostics.
- V1.5: Publisher/language/indexing metadata enrichment, verified year-specific conference homepages and auto-loaded five-year publication history from OpenAlex.
- V1.6: Local OpenAlex caching, bounded rate control and HTTP 429 cooldown handling. Real BibTeX parser/organizer with cautious duplicate detection, bibliography sorting and downloadable output. Removed three unused roadmap UI cards.

## V1.7 delivered (2026-10-26)

- Official source health now maintains a cross-run baseline, classifies changed
  pages separately from HTTP failures, emits reports and opens actionable review
  Issues. It never alters conference dates without manual verification.
- Annual-source permission status is explicit, with a provenance audit and a
  private-evidence checklist (repository does not independently verify grants).
- Five more high-interest official annual conference timelines; separate ARR
  paper submission and commitment events for ACL-family conferences.
- CVPR 2026 acceptance count sourced from the official organizers' statement.
- Memoized/deferred large-catalogue journal search and coverage indicators.
- Exact direct dependency versions, lockfile and PR build validation.
- Crossref DOI and OpenAlex arXiv citation ingestion in the actual BibTeX editor.
- Mobile card/importer layout and keyboard focus/accessibility improvements.

## Future candidates (not published as nonfunctional cards)

1. LaTeX, Markdown and CSV table conversions — practical formatting transforms including academic three-line tables.
2. Continued official conference annual website/CFP coverage and source review.
3. Further verified official acceptance counts and improvements to anonymous OpenAlex quotas.

Focus on working, simple features and data quality rather than speculative dashboards. Preserve GitHub Pages-only deployment until an actual shared backend is explicitly approved.


## V1.6 interface refinement

- Journal system, annual data status and zone/quartile selectors are no longer disabled by an earlier selection. Rank options carry separate CAS, XinRui and JCR system identifiers.
- The Tools landing page is a lightweight directory only. Active utilities have their own deep-linkable GitHub Pages routes (#tools/identifier and #tools/bibtex), with working back navigation.
