# ElysiaTools

**Research, Made Easier.** — 学术会议、期刊分区和个人科研工作台。

[网站](https://invoidstar.github.io/ElysiaTools/) · [会议](https://invoidstar.github.io/ElysiaTools/#conference) · [完整期刊分区查询](https://invoidstar.github.io/ElysiaTools/#journal) · [数据来源与许可](docs/METRIC_IMPORT.md)

ElysiaTools uses React, TypeScript and Vite and runs exclusively on **GitHub Pages**. There are no visitor accounts, application servers or browser CSV uploads.

## Features

| Module | Features |
| --- | --- |
| Home | Conference/journal search, CCF overview, deadlines |
| Conferences | CCF 2026 A/B/C full conference directory, historic acceptance, deadlines, timezone conversion, ICS |
| Journals | **23,100 unique journal identities**; name/ISSN search, CAS 2025 historical divisions, XinRui 2026 divisions, JCR 2025 quartiles, JIF 2025, CCF 2026 classifications, filters, detail views and comparisons |
| My Academic | Browser-local favorites, comparison lists, backups |
| Tools | DOI / arXiv / ISSN links plus a local BibTeX organizer: parse, check, deduplicate, sort, copy and export |

Light/dark mode and responsive layouts are included.

## Journal data coverage

The 2026-10-12 GitHub Pages build identified **23,100 unique journals** (including the existing CCF catalogue). **23,026 journals** have at least one of the following annual evaluation records:

| Metric | Journal coverage | Meaning |
| --- | ---: | --- |
| CAS historical divisions | 21,772 | 2025 major and subsidiary categories |
| XinRui divisions | 22,299 | Independent 2026 major and subsidiary categories |
| JCR quartiles | 20,337 | 2025 dataset, released 2026, per JCR subject |
| Journal Impact Factor | 22,594 | JIF for 2025, released 2026 |

The four counts overlap and must not be added. An absent field means no matching entry was verified in the particular snapshot, **not** that a journal has no rating. CCF classification remains separate: its seventh edition has 291 unique ranked journals (295 subject rows) plus an additional RA-L record.

### Bibliographic fields supplemented in V1.5.0

The same pinned annual source files now supply bibliographic metadata when explicitly present: **22,339 journal publisher records**, **23,038 journal indexing-system records**, **22,273 publication-language records**, and **5,965 positive OA classifications**. These counts refer to nonexclusive bibliographic coverage and do not add new or invented JCR/CAS/XinRui rankings. Journal websites not confirmed in the original directory are looked up on demand via an exact OpenAlex source match and clearly attributed; no guessed publisher URLs are published.

## Data delivery and provenance

Data inputs are the three pinned ShowJCR files: **FQBJCR2025-UTF8.csv**, **XR2026-UTF8.csv**, and **JCR2025-UTF8.csv**, at [source revision 4687a8f](https://github.com/hitfyd/ShowJCR/tree/4687a8f608f20aaf004299992f5d347dba009361).

The [journal generator](scripts/sync/build_journal_universe.mjs) downloads sources during GitHub Actions, verifies file checksums, resolves titles and valid ISSNs while guarding against same-name collisions, retains multiple subject divisions, and produces a **approximately 10.6 MB static index**. GitHub Pages deploys the index together with the site; the original CSVs are not checked into ElysiaTools. Identity matching uses checksum-validated ISSNs first, conservative unique-title fallback second; disjoint IDs stay separate and are flagged instead of silently merged. Unrated records are retained, and source metrics are attached directly to their resolved CSV records (without a second title-based rematch). The index is requested by the browser only when visiting the journal features, so the homepage JS stays light. Annual source rows now also contribute publisher, language, verified OA flags (positive values only) and SCIE/SSCI/ESCI/AHCI/Scopus indexing labels. Neither a missing OA field nor a negative OA flag is assumed to mean subscription-only.

The journal index now retains **all known identities**, including the 74 original CCF/supplementary titles without any metric in the pinned annual CSVs. Each journal has a four-system status: **available**, **listed but no valid metric**, **not matched in this annual source**, or **identity conflict requiring review**. Search can filter these statuses and the detail panel shows source record numbers, match method and matching issues. The [per-journal audit](https://invoidstar.github.io/ElysiaTools/data/journal-diagnostics.json) is generated with Pages, while [coverage counters](https://invoidstar.github.io/ElysiaTools/data/journal-coverage.json) summarize each missingness class. Both reflect the pinned annual snapshot, not a real-time publisher query.

The journal detail page now resolves a publisher/journal homepage on demand from the matching OpenAlex source record when a verified website is absent. OpenAlex also supplies an **automatic rolling five-year publication chart** (including the current partial year), with unavailable years shown as missing rather than zero. OpenAlex indexing is **not a publisher-certified article count** and its public API can occasionally be rate-limited. For conferences with a verified annual edition, the direct yearly homepage and that edition's official CFP are both linked; years without a verified edition are not guessed.

### OpenAlex request-limit handling (V1.6)

The OpenAlex anonymous API has a smaller daily budget than free-key access. Because ElysiaTools runs on public GitHub Pages, an OpenAlex API key must never be inserted into frontend JavaScript: it is also an account credential. The old mailto polite-pool parameter is deprecated.

The journal lookup now:
- Shares one pending request per journal, across publication charts and homepage links.
- Stores successful responses in browser-local cache for 48 hours (maximum 100 journals), with a visibly labeled stale-cache fallback up to 90 days.
- Remembers unmatched journal identities for 24 hours instead of repeatedly querying the same unsuccessful record.
- Runs at roughly one request every 850 ms per browser tab.
- Applies bounded retries and respects OpenAlex Retry-After / X-RateLimit-Reset hints, pausing additional anonymous traffic when the quota is exhausted.

These improvements cannot eliminate API-wide quotas for first-time visitors. At larger scale, use a server-side proxy with a protected key and shared cache (for example Cloudflare Worker + KV/D1), subject to later approval. No server has been added in this version.

### BibTeX organizer (V1.6)

The new BibTeX workspace has its own independent page at [Tools → BibTeX](https://invoidstar.github.io/ElysiaTools/#tools/bibtex). The identifier resolver has its own page at [Tools → Identifier Resolver](https://invoidstar.github.io/ElysiaTools/#tools/identifier). The [Tools landing page](https://invoidstar.github.io/ElysiaTools/#tools) is now a simple directory of fully operational tools. It accepts pasted references or imported .bib files (up to 3 MB / 4,000 entries), preserves LaTeX braces/commands and BibTeX string definitions, identifies strong DOI / arXiv duplicate candidates, flags missing fields and conflicting citation keys, and supports sorting, review, copy and export.

Only identifier-backed duplicate suggestions may be excluded automatically; title/year similarity alone does not remove records. Existing citation keys are not silently renamed because this might break references in LaTeX manuscripts. The three unused image-check, statistics and academic plotting roadmap cards remain removed from the Tools directory.

The three journal rating filters are now independently selectable from the first render: evaluation system, annual data status, and zone/quartile. Tier values explicitly identify CAS, XinRui or JCR, even when the evaluation system filter is left on All.

The former online “同步期刊评价数据” function remains removed. A standalone aggregated [historic matching audit](scripts/sync/audit_metric_csv.py) is retained for developers. The CCF source data and 2026 conference/acceptance directory remain unchanged.

## Licensing and responsibility

The site operator has reported that the necessary source-provider republication permissions have been obtained. The repository does **not independently verify or include** those permissions. ShowJCR application software is GPL-3.0, but that license does not automatically cover CAS, Clarivate JCR or XinRui evaluation databases. Public data-use rights must be maintained separately.

See [annual source notes](docs/METRIC_IMPORT.md), [data policy](docs/DATA_POLICY.md), and [third-party notices](docs/THIRD_PARTY_NOTICES.md). ElysiaTools code and original documentation are under [MIT](LICENSE); third-party data is not automatically relicensed.

## Development and deployment

Node.js 22+ is recommended.

- npm install
- npm run check
- npm run build

The [Pages workflow](.github/workflows/pages.yml) builds and deploys from the **main** branch to https://invoidstar.github.io/ElysiaTools/ . It obtains the three journal data files from the pinned upstream revision during CI.
