# Third-party data and licenses

## CCF-Deadlines historical acceptance records

The historical conference statistics integrated into ElysiaTools V1.2 were obtained in part from the openly published CCF-Deadlines project (MIT licensed source code/data organization), which collates public historical submission and acceptance counts, and links to conference reports and community archives.

- Upstream: https://github.com/ccfddl/ccf-deadlines
- MIT License: https://github.com/ccfddl/ccf-deadlines/blob/main/LICENSE
- Historical material snapshot: https://github.com/ccfddl/ccfddl.github.io/blob/page/conference/allacc.json
- Copyright (c) 2021 CCFDDL
- ElysiaTools adaptation: joined historical entries by stable conference identifiers, normalized validated counts and percentages, deduplicated conflicting year/track rows, and labeled entries as `community-history` rather than independently verified official facts.
- Each accepted statistic keeps a `sourceId` pointing to its source URL. Independent official conference statistics remain separately marked.

### Upstream MIT License notice

MIT License

Copyright (c) 2021 CCFDDL

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Other providers

- CCF seventh edition (2026): factual catalog entries, **CCF retains original directory copyright**; https://www.ccf.org.cn/Academic_Evaluation/By_category/
- LetPub individual journal queries: a small number of individually source-linked, secondary XinRui 2026 factual results; no bulk copying of the LetPub database; https://www.letpub.com.cn/index.php?page=journalapp&view=search
- CAS 2025, XinRui 2026 and Clarivate JCR/JIF are separately owned annual evaluations. The operator reports having received the necessary permission to publish a derived journal index, but the legal documentation and scope are not independently verified by this repository.
- OpenAlex: optional client-side source-indexed work counts, not publisher-certified total article counts; https://openalex.org/


## ShowJCR annual data snapshot

- Upstream reference: https://github.com/hitfyd/ShowJCR . Its GPL-3.0 license applies to the application code, not automatically to the underlying proprietary datasets.
- Pinned snapshot: 4687a8f608f20aaf004299992f5d347dba009361.
- Files: FQBJCR2025-UTF8.csv, XR2026-UTF8.csv and JCR2025-UTF8.csv.
- The site operator reports separate rights to publish the derived static journal catalogue. This repository does not contain the signed agreements or independently evaluate their scope.
- GitHub Actions fetches the source CSVs at build time and compiles a compact index for the published site. The raw original CSVs are not included in Git.
- Source checksums, coverage and publishing instructions: [METRIC_IMPORT.md](METRIC_IMPORT.md).
