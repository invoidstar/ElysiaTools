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

**XinRui (新锐), 2026** is an independent evaluation and must never be relabeled CAS 2026. The operator reports authorization to publish this annual derived index; its original terms otherwise govern redistribution. Official search: https://www.xr-scholar.com/Journals/Search .

**JCR / JIF** each carry the original subject/year and source. JCR published in 2026 commonly contains **2025 JIF values**, whereas a 2025 JCR publisher notice may cite **2024 JIF**. A Q1 JCR classification is not a CAS 1 区 result. Only issuer/publisher publicly disclosed facts may be reproduced, e.g. IEEE and ACM notices with URLs in the Source Registry.

**Publication count** is loaded automatically when a journal detail opens, from the exact-matched OpenAlex source's `counts_by_year` for a rolling **five-year window**, including the current partial year. It means “works indexed by OpenAlex”; it is not official total published article count, and may include non-research items. The frontend matches the journal by verified ISSN or a full normalized name; near-match results are rejected. If unavailable it shows an informative error and never supplies a guess. Year entries without a count appear missing rather than as zero; the current partial year is labeled. An OpenAlex `homepage_url` is shown as an indexed journal homepage only when its source identity is matched unambiguously; publisher-verified links take precedence.

## 5. Quality controls

**npm run validate** checks IDs, source resolution, complete CCF 681 row count, cross-listed journals, independent grades and systems, acceptance numerator/denominator, ISSN checksum, timezone support and AoE UTC conversion. **npm test** checks known tricky edge cases such as CVPR AoE, separate USENIX cycles and KDD unpublished rounds.

The source-health workflow can observe unavailable pages or changed content, but neither is proof of a changed deadline. Bot restrictions, CDN content and layouts can vary. The monitor never silently rewrites data or relabels an old check as verified today. It produces reports for human review.

## 6. Personal data

My Academic stores preferences in localStorage, not in a cloud database. Export and import are user-controlled. Backups contain only selected preferences, not credentials. No analytics or server-side user profile is included in V1.0.


## 7. Historical acceptance source policy

CCF-Deadlines (MIT License, Copyright 2021 CCFDDL) is the attributed secondary historical conference data feed. Its counts are retained by conference/year/track and cross-referenced to original sources, but community transcription is not independent official verification. Officially reviewed records stay separately identified.

LetPub is a *secondary* issuer for a small number of individually checked XinRui 2026 factual summaries. The page links the original third-party record rather than claiming issuer certification.

## 8. Authorized annual journal index

The 2026-10-12 Pages build generated a journal lookup catalogue with 23,100 unique identities and 23,026 profiles containing annual metrics. CAS 2025 covers 21,772 journals, independent XinRui 2026 covers 22,299, JCR quartiles cover 20,337, and JIF 2025 covers 22,594.

The original provider CSVs are fetched in GitHub Actions at a pinned ShowJCR commit and checked against published SHA digests. Git does not store the raw source files; Pages contains the derived static index. The production UI continues to omit the former import/sync controls.

The site operator reports receiving permissions for public republication and derivative use. **Permission scope is not independently verified here.** ShowJCR's software GPL cannot substitute for provider-specific permissions covering CAS, Clarivate JCR and XinRui source data.

Never infer a missing rating, combine evaluation systems, or merge two publications solely because they share a title. Maintain separate year, category and source attribution. See [METRIC_IMPORT.md](METRIC_IMPORT.md).


## V1.6 OpenAlex and bibliography operation

The journal source API client uses a browser-local 48-hour source cache (100 records), a clearly labeled 90-day stale-data fallback, a 24-hour negative identity cache and serialized requests. It honors OpenAlex HTTP 429 response headers to avoid repeated calls while the anonymous quota is exhausted. These measures do not expand the external API quota. Public GitHub Pages must not embed an OpenAlex API key; personal keys are authentication credentials. The legacy email-based polite-pool approach no longer changes rate limits.

The BibTeX organizer parses and formats user text locally, without sending bibliographies to a server. The original braced LaTeX field contents, string definitions and citation keys are retained; suspected same-title references are review hints rather than automatic duplicate deletion.


## 9. V1.7 provenance checks and ARR commitment

An ARR submission is distinct from the later *conference commitment* for
conferences such as NAACL and EMNLP. Commitment is stored as its own deadline
kind, not disguised as a new review-cycle initial paper submission. Year-specific
official URLs, submission tracks and independent cycles remain separate.

`npm run audit:provenance` checks source-kind integrity, including
official-history vs community-history acceptance reports. The scheduled source
health workflow records page digest differences and HTTP failures separately;
a changed page is a review request, not an automatic deadline correction.
The annual provider permission state is recorded without claiming independent
verification in [PROVENANCE_AND_AUTHORIZATION.md](PROVENANCE_AND_AUTHORIZATION.md).


## 10. V1.8 source accuracy and publication boundaries

Main-conference submission events have list and homepage priority over
workshops or industry/arts proposals when a verified future main deadline
exists. Date-only verified deadlines (e.g. IROS 2027) have no invented time
or timezone. ICCV 2027 paper deadlines remain unannounced/TBD.

Historical acceptance source kinds differ: official-history is an organizer
statement, publisher-history is publisher proceedings, institutional-history
is reporting from an independent research institution, and community-history
is third-party transcription. No type is silently relabeled as another,
and any divergent denominator merits review before changing a statistic.

Source monitoring requires two successful matching observations of a new
page fingerprint before raising an individual GitHub review Issue. A failed
HTTP request never overwrites the last-good source observation. Cache loss
establishes a fresh baseline, not evidence that nothing changed. No dates,
acceptance figures, or journal rankings are rewritten by the monitor.

Annual CAS, XinRui and JCR/JIF data rights remain reported-authorized-unverified
until provider-specific redistribution grants are privately verified. No paid
source CSV, key, subscriber credentials or contracts belong in this public
repository. BibTeX imports send only an academic identifier to Crossref or
OpenAlex, not the user's local library.
