# ElysiaTools

**Research, Made Easier.** — Open-source Academic Research Toolkit.

[Website](https://invoidstar.github.io/ElysiaTools/) · [Conferences](https://invoidstar.github.io/ElysiaTools/#conference) · [Journals](https://invoidstar.github.io/ElysiaTools/#journal) · [Source & licensing policy](docs/METRIC_IMPORT.md)

ElysiaTools is a lightweight academic information toolkit built with React, TypeScript and Vite, deployed exclusively via GitHub Pages. It has no accounts or database server.

## Features

| Page | Available functions |
| --- | --- |
| **Home** | Joint venue search, conference deadlines, CCF category visualizations |
| **Conference** | Complete CCF 2026 conference catalog, searchable A/B/C classifications, 1,062 dated acceptance-statistic records with source distinctions, multi-track timelines, calendars and ICS export |
| **Journal** | 291 ranked CCF journals plus 1 supplementary venue, CCF fields, publisher/ISSN metadata, independently sourced public evaluation metrics, official external lookup links, filtering and multi-journal comparison |
| **My Academic** | Browser-local favorites, filters, target calendars, JSON backups |
| **Tools** | DOI / arXiv / ISSN identifier resolution |

Light and dark themes, mobile layouts and first-party GitHub Pages deployment are included.

## Data coverage and limitations

The 2026 CCF seventh edition contributes **386 conference entries and 295 journal recommendation rows** (291 unique CCF journal identities; 4 titles appear in more than one subject). With RA-L as an additional journal, the searchable journal directory has **292 titles**. CCF classification is separate from JCR quartiles, Journal Impact Factor, CAS historical divisions and XinRui independent divisions.

Conference historical records span **1,062 year/track data points across 273 conference identities**, combining separately checked official statistics and attributed CCF-Deadlines community transcriptions. A historical submission/acceptance ratio does not predict future odds.

**Journal data:**

- Publicly documented bibliographic identifiers (currently 246 ISSN and 250 eISSN fields) and source-linked individual evaluation facts are available in the website.
- The three source files **FQBJCR2025-UTF8.csv**, **XR2026-UTF8.csv** and **JCR2025-UTF8.csv** were assessed as *candidate reference sources*. Approximate identity matching reached 249, 248 and 249 of the 292 catalog journals respectively (see [audit metadata](data/metric-source-audit.json)).
- **These figures describe possible matching, not public indicator coverage.** The third-party CSVs and any substitute bulk derived metrics have *not* been published into ElysiaTools. JCR and some institutional classification services impose redistribution restrictions that are not waived by a file being visible on GitHub.
- The former **“同步期刊评价数据”** browser download/import interface has been removed. The production website reads public, sourced JSON only. Missing restricted metrics remain unfilled and can be checked at their original authorized publisher portals.
- An offline [three-source match audit](scripts/sync/audit_metric_csv.py) is retained. It calculates aggregate coverage only, never writes license-restricted journal indicator values. See [journal data access and licensing](docs/METRIC_IMPORT.md).

The site is independent of CCF, Clarivate, CAS, XinRui and the listed publishers. All official submission dates retain the published timezone; unannounced deadlines remain TBD.

## Stack and project files

React 19 · TypeScript · Vite · Lucide · JSON · Python · GitHub Actions · GitHub Pages

- **src/** — UI and independent feature modules
- **data/conferences.json**, **data/editions.json** — stable identities and official deadline records
- **data/journals.json** — journal identities and individually sourced public indicators
- **data/sources.json** — original publisher/CFP links and source classifications
- **data/acceptance.json** — conference-history statistics with original sources
- **data/metric-source-audit.json** — aggregate third-party source matching report **without** protected metric data
- **scripts/validate.mjs**, **tests/** — quality checks
- **scripts/sync/** — source health and offline source-matching audit tools
- **docs/** — [Data policy](docs/DATA_POLICY.md), [Contributing](docs/CONTRIBUTING.md), [Roadmap](docs/ROADMAP.md), [Third-party notices](docs/THIRD_PARTY_NOTICES.md)

## Development

Node.js 22+ recommended.

~~~bash
npm install
npm run dev
npm run check
npm run build
~~~

Deployment is **GitHub Pages only**, via **.github/workflows/pages.yml** on the **main** branch. Vite is configured for **/ElysiaTools/**.

## Publishing additional indicator data

Before adding a full JCR/CAS/XinRui dataset to a public static site, confirm that the **original issuer** has granted the required distribution rights, including any derived-database use. Permission solely from a GitHub mirror is insufficient. See [Data publication requirements](docs/METRIC_IMPORT.md).

## License

Original ElysiaTools code and documentation are under [MIT](LICENSE). All third-party evaluation data remains governed by its **own** terms; the application license does not change those rights.
