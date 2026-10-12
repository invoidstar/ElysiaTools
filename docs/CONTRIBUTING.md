# Contributing to ElysiaTools

Corrections and additions are welcome, especially independently verifiable official deadlines and journal identifiers.

## Academic-data pull requests

For each proposed conference change, provide the stable conference ID, edition year, exact track/cycle, official CFP URL, original event time and timezone if available, verification date, and an explanation of what changed.

For journals, provide the full title, ISSN-L or ISSN/eISSN where verified, publisher link, OA source, and reference year/category/system for every metric. JCR/JIF data must have redistribution permission.

**TBD** is the correct value for unannounced deadlines. Do not derive them from earlier years, neighboring tracks or other websites.

## Checklist

1. Edit structured JSON under **data/**. Keep source IDs stable and reference them from editions or indicators.
2. Run **npm run validate**, **npm test**, and **npm run build**.
3. Confirm calendar and deadline rendering in the local timezone and AoE, including the international date boundary.
4. Include original authoritative links and the previous/new value for a changed deadline.
5. Review GitHub Actions. Source-monitor reports alone never approve deadline edits.

## Code and rights

UI should be accessible, mobile-friendly, fast and not dependent on user accounts. Shared styling uses design tokens. Only GitHub Pages production deployment is maintained.

Contribute attributed academic **facts** rather than copying complete protected directories, paywalled reports or publisher descriptions. Respect third-party data rights and provide provenance.
