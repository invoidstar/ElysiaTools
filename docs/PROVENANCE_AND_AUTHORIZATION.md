# Source provenance and publication-rights checklist

ElysiaTools differentiates **factual source validation** from **authorization to publicly
redistribute data**. A verified number or URL is not itself a license to republish a
proprietary annual database.

## Current authorization state

As of 2026-10-26, the site operator has reported authorization for the three annual
ShowJCR-derived snapshots. The repository has **not** independently verified the
authorization letters or terms; the public manifest
[data/publication-rights.json](../data/publication-rights.json) deliberately records
`reported-authorized-unverified` for each input. The original CSVs remain excluded
from version control. ElysiaTools is MIT licensed; the data is not relicensed under MIT.

Before renewing the snapshot, privately verify and retain:
1. Identified legal data owner/licensor and the permission grant.
2. Whether public GitHub Pages publication of the full **derived JSON** is permitted
   (and whether public download, caching, comparisons and sublicensing are restricted).
3. Covered source file, evaluation edition, territory, duration, retention and attribution.
4. Validity of redistributing full per-journal categories, JIF and bibliographic metadata.
5. A process to remove/replace records when permission changes.

Do not put confidential authorization files, private subscription tokens, license
agreements or provider keys in the public repository or browser JavaScript.

## Conference data / historical acceptance

- **Official CFP**: manually checked year-specific publication with explicit original
  date and timezone. A page change or CDN error is never treated as a changed deadline.
- **Official-history**: official organizer statements, with explicit year, submission
  denominator, accepted-paper count and track; statistics may use different denominators.
- **Community-history**: attributed transcription, not equivalent to organizer
  certification. Historical curves preserve this distinction, and isolated conflicts
  are flagged rather than silently overwritten.

The provenance audit (`npm run audit:provenance`) asserts all official and community
history records reference existing source IDs of the correct kind, that every structured
track resolves to a declared source, and that permission claims remain qualified.

## Daily source health

The scheduled workflow checks only curated official sources (CFPs, official histories,
classification references and selected publisher notices). It restores prior page
fingerprints from an Actions cache, reports `baseline_created`, `unchanged`,
`changed` and `unreachable` distinctly, and saves fresh fingerprints **only on a
successful read**. On a changed page it updates a persistent GitHub Issue for manual
review. A page digest change is not proof that any deadline moved; no data updates are
made by this monitor. Rate limits, blockers and transient failures are recorded in
artifacts, without triggering false deadline changes.

GitHub Actions caches are not durable archival storage. If a baseline expires, the
next run establishes a fresh baseline without claiming that earlier observations were
unchanged.
