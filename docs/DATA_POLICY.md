# ElysiaTools — Academic Data Policy

## 1. Sources and ranking systems

1. **CCF (2026, seventh edition)**: the source of grades for curated computer-science conferences and journals. Reference: https://www.ccf.org.cn/Academic_Evaluation/By_category/ (formal edition March 31, 2026; corrected April 9, 2026). Store CCF grade and edition year on the venue. An empty grade is not equivalent to “non-CCF” unless proven.
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

## 4. Quality controls

**npm run validate** checks IDs, referential integrity, CCF year, ISSN checksum, source resolution, timezone support, precision and AoE UTC conversion. **npm test** checks known tricky edge cases such as CVPR AoE, separate USENIX cycles and KDD unpublished rounds.

The source-health workflow can observe unavailable pages or changed content, but neither is proof of a changed deadline. Bot restrictions, CDN content and layouts can vary. The monitor never silently rewrites data or relabels an old check as verified today. It produces reports for human review.

## 5. Personal data

My Academic stores preferences in localStorage, not in a cloud database. Export and import are user-controlled. Backups contain only selected preferences, not credentials. No analytics or server-side user profile is included in V1.0.
