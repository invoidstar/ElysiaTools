# Journal Data Sources and Publishing Requirements

ElysiaTools no longer offers the former **"同步期刊评价数据"** browser interface. Its public GitHub Pages release reads attributed JSON metadata from the repository.

## Three audited ShowJCR reference files

The following GitHub files were checked as matching candidates against the ElysiaTools list of 292 distinct journals:

| Report | File at ShowJCR | Approximate matched journal identities |
| --- | --- | ---: |
| CAS journal divisions, historical 2025 | FQBJCR2025-UTF8.csv | 249 |
| Independent XinRui divisions, 2026 | XR2026-UTF8.csv | 248 |
| JCR 2025 (published 2026), including JIF 2025 | JCR2025-UTF8.csv | 249 |

[Upstream files](https://github.com/hitfyd/ShowJCR/tree/master/%E4%B8%AD%E7%A7%91%E9%99%A2%E5%88%86%E5%8C%BA%E8%A1%A8%E5%8F%8AJCR%E5%8E%9F%E5%A7%8B%E6%95%B0%E6%8D%AE%E6%96%87%E4%BB%B6). Reviewed source revision: **4687a8f608f20aaf004299992f5d347dba009361**.

These counts are an **identity matching assessment**, not publicly republished rankings. The original CSV bytes and systematic extracted journal metrics are not included in ElysiaTools assets.

## Why the complete tables are not pushed to a public repository

Public availability of source files is not a redistribution license. ShowJCR uses GPL-3.0 for application code, but that license is not an authorization from the original issuers to redistribute paid JCR, CAS or XinRui evaluation datasets.

Clarivate explicitly restricts wholesale JCR distribution **and** creating replacement/derivative databases from downloaded data:

- [Clarivate licensing explanation](https://clarivate.com/academia-government/blog/a-quick-refresher-on-journal-citation-reports-use-cases-branding-and-terms-of-use/)
- [Product terms (JCR)](https://www.mpdl.mpg.de/images/documents/lib_res_center/terms_of_use/Nutzungsbedingungen_Clarivate_2024-2026_42678.pdf)
- [CAS journal division user agreement](https://www.fenqubiao.com/User/UseProtocol.aspx)
- [XinRui official search](https://www.xr-scholar.com/Journals/Search)

A complete published catalogue of 292 indexed JCR values, even without copying the whole 22,000-row file, is a structured derived database, so citing the third-party mirror alone is insufficient.

## Offline audit (no restricted values exported)

To reproduce *matching coverage* using CSV files that you have permission to access:

~~~bash
python3 scripts/sync/audit_metric_csv.py \
  --cas /path/to/FQBJCR2025-UTF8.csv \
  --xinrui /path/to/XR2026-UTF8.csv \
  --jcr /path/to/JCR2025-UTF8.csv \
  --report /tmp/showjcr-audit.json
~~~

The script reads but does not upload the three CSV files. Its output consists of **aggregated counts only** (matched journal identities, ambiguous matches, unmatched and source rows). It deliberately does not create a separate publicly usable ranking table. The baseline is summarized in [metric-source-audit.json](../data/metric-source-audit.json).

## Requirements to publish a complete indicator table

Provide documentation from the **original data issuers** specifying the publication and derivative-database rights for the intended GitHub Pages use. The scope should cover JCR/CAS/XinRui independently. After permission is verified, structured annual indicators can be published with explicit ISSN-based joins, original source citations, category, license and evaluation year.

Until then, ElysiaTools retains the sourced, individually verifiable public facts and official lookup links, and leaves other ratings unfilled rather than implying that an unverified classification is current.
