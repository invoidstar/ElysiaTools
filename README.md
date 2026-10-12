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
| Tools | Academic identifiers |

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

## Data delivery and provenance

Data inputs are the three pinned ShowJCR files: **FQBJCR2025-UTF8.csv**, **XR2026-UTF8.csv**, and **JCR2025-UTF8.csv**, at [source revision 4687a8f](https://github.com/hitfyd/ShowJCR/tree/4687a8f608f20aaf004299992f5d347dba009361).

The [journal generator](scripts/sync/build_journal_universe.mjs) downloads sources during GitHub Actions, verifies file checksums, resolves titles and valid ISSNs while guarding against same-name collisions, retains multiple subject divisions, and produces a **compact 7.9 MB static index**. GitHub Pages deploys the index together with the site; the original CSVs are not checked into ElysiaTools. The index is requested by the browser only when visiting the journal features, so the homepage JS stays light.

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
