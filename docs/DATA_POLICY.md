# ElysiaTools — Academic Data Policy

## 1. Sources and ranking systems

1. **CCF (2026, seventh edition)**: the source of all 386 conference rows and all 295 journal recommendation rows. Four cross-listed journal names are deduplicated to 291 journal identities without losing any category membership. Reference: https://www.ccf.org.cn/Academic_Evaluation/By_category/ (formal edition March 31, 2026; corrected April 9, 2026). Store CCF grade and edition year on the venue. An empty grade is not equivalent to “non-CCF” unless proven.
2. **Conference deadlines**: official edition pages or the official Call for Papers take precedence. Community aggregators may flag discrepancies for manual checking, but cannot overwrite official evidence on their own.
3. **Journal identity**: use ISSN-L where verified, with distinct print ISSN/eISSN. Never assume the same abbreviation means the same publication (e.g. FSE has different conference identities in separate disciplines).
4. **JCR / JIF**: display only legally accessible, authorized, year-tagged figures and their respective subject categories. Never import premium metrics from scraped secondary sites.
5. **CAS division (historical)**: if available, show original edition/year. No unverified current-year extrapolation; Chinese Academy of Sciences division information is historical since its 2026 discontinuation.
6. **APC / Open Access**: unknown is an explicit first-class value. A hybrid publishing route is not equivalent to a fully OA journal.

The initial CCF facts were curated from the formal directory with reference to an independent, machine-readable extraction at https://github.com/haozhou-wong/ccf-recommended-list-2026-markdown . The directory itself is owned by CCF; we do not redistribute its PDF or paid indicators. Verify controversial grades against the CCF original.

## 2. Data entities

- **data/conferences.json:** long-lived Conference (ID, acronym, name, aliases, discipline, CCF grade & edition).
- **data/editions.json:** annual Conference Edition with meeting dates and location. It contains separately identified Submission Track and Deadline Event objects.
- **data/journals.json:** Journal with stable ID, verified identifiers, publisher, OA state, grade and per-system Journal Indicator records if available.
- **data/acceptance.json:** source-backed historical acceptance data with year, track, submissions, accepted and rate (when officially published).
- **data/ccf-coverage.json:** formal edition and row-count contract (386 conference rows / 295 journal rows / 10 subjects).
- **data/sources.json:** Source Record with stable ID, link, type, owner, verification date and notes.

No entity should use its free-text name alone as a join key.

## 3. Deadline representation

An exact AoE paper deadline is modeled as follows:

~~~json
{
  "kind": "paper",
  "precision": "minute",
  "original": "2026-11-16T23:59",
  "timezone": "Etc/GMT+12",
  "utc": "2026-11-17T11:59:00.000Z"
}
~~~

IANA Etc/GMT+12 means **AoE (UTC−12)**. The counterintuitive plus sign is normal IANA convention. Preserve the original local time and timezone, and use browser Intl APIs to render the UTC instant in the visitor's chosen timezone.

If only a calendar day has been published, use **precision: date** and **original: YYYY-MM-DD** without a UTC instant. Do not invent clock times for announcements or review periods. Such records export as all-day calendar dates.

Unknown deadlines appear in the separate Track pending array and are displayed as **TBD**. Independent submission tracks and cycles must not share guessed dates. Future verified changes should record previous value, new value, source and date.

## 4. Journal rankings, licensing and article counts

**CAS 2025** is the last historical edition from the Chinese Academy of Sciences journal division before discontinuation in 2026. Historical fields are optional and should be populated only from rights-cleared primary evidence. Official discontinuation: https://nssc.cas.cn/library/dtxx/202604/t20260409_8183275.html .

**XinRui (新锐), 2026** is published by an independent institution and must never be relabeled “CAS 2026”. Its official search and terms: https://www.xr-scholar.com/Journals/Search . Its website terms restrict republication. ElysiaTools therefore does not republish the underlying restricted divisions without a license; links lead users to authorized lookup.

**JCR / JIF** each carry the original subject/year and source. JCR published in 2026 commonly contains **2025 JIF values**, whereas a 2025 JCR publisher notice may cite **2024 JIF**. A Q1 JCR classification is not a CAS 1 区 result. Only issuer/publisher publicly disclosed facts may be reproduced, e.g. IEEE and ACM notices with URLs in the Source Registry.

**Publication count** is user-initiated and retrieved from OpenAlex's source `counts_by_year` with the index year **2025**. It means “works indexed by OpenAlex”; it is not official total published article count, and may include non-research items. The frontend matches the journal by verified ISSN or a full normalized name; near-match results are rejected. If unavailable it shows an informative error and never supplies a guess.

## 5. Quality controls

**npm run validate** checks IDs, source resolution, complete CCF 681 row count, cross-listed journals, independent grades and systems, acceptance numerator/denominator, ISSN checksum, timezone support and AoE UTC conversion. **npm test** checks known tricky edge cases such as CVPR AoE, separate USENIX cycles and KDD unpublished rounds.

The source-health workflow can observe unavailable pages or changed content, but neither is proof of a changed deadline. Bot restrictions, CDN content and layouts can vary. The monitor never silently rewrites data or relabels an old check as verified today. It produces reports for human review.

## 6. Personal data

My Academic stores preferences in localStorage, not in a cloud database. Export and import are user-controlled. Backups contain only selected preferences, not credentials. No analytics or server-side user profile is included in V1.0.


## 7. V1.2 provenance and privately imported metrics

CCF-Deadlines (MIT License, Copyright 2021 CCFDDL) is used as a *secondary, publicly contributed historical conference data feed*. We record the original URL for each row and distinguish its CCFDDL-transcribed provenance from independently checked official-source records. The repository copy of its historical count/rate facts is not proof of individual human verification. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and https://github.com/ccfddl/ccf-deadlines .

**Historic rate statistics**: show exact year, assumed main conference, submitted/accepted counts where available and computed ratio; ignore mismatched or unparseable rows, and never replace a conflicting existing official statistic without review. Values in community aggregation may refer to specific tracks or conference phases; the original cited document remains authoritative.

**LetPub**: the platform can deep-link to its public journal search. Eight individual new-rising-division results were independently matched by journal title/ISSN and are marked explicitly as *LetPub secondary reference*, not publisher-verified or official XinRui bulk data. They are factual single-journal references only, not a rehosted LetPub database. Source pages may require the reader to check the current edition.

**User-held indicators**: CSV/TSV imports occur locally using a built-in RFC-4180 parser. Matching by exact ISSN or normalized full title prevents ambiguous joins. Four systems remain separate: `cas` (2025), `xinrui` (2026), `jcr` (2026 report / 2025 JIF), `jif` (2025). Imported records are saved under an isolated localStorage key and never included in GitHub Pages or in the My Academic backup; users need to reimport on another device. See [METRIC_IMPORT.md](METRIC_IMPORT.md).

Third-party JCR/CAS/XinRui tables may be accessible on GitHub or commercial journal portals, but *public download does not automatically confer rights to republish the database*. We will not aggregate a paywalled ranking into this repository without confirmed downstream redistribution rights.
