# Annual Journal Data: Sources, Build and Licensing

ElysiaTools supplies a **static public journal index** through GitHub Pages. Users search directly; the earlier browser CSV import/sync interface stays removed.

## Pinned annual source files

Source project: [ShowJCR](https://github.com/hitfyd/ShowJCR), fixed at commit **4687a8f608f20aaf004299992f5d347dba009361**.

| System | Input file | Git blob SHA | Input rows |
| --- | --- | --- | ---: |
| CAS historical 2025 | FQBJCR2025-UTF8.csv | 5918c4ee712878e2b6bc2e5d50f7a87b3c67a719 | 21,772 |
| XinRui 2026 | XR2026-UTF8.csv | 805202d8a8bf3a6364708b8a4fd4b3c0b5fa9d7e | 22,299 |
| JCR metrics 2025, released 2026 | JCR2025-UTF8.csv | d3a825960d1fb36e5a05827bdf0ae6e41da4ccd4 | 22,643 |

[Browse pinned source directory](https://github.com/hitfyd/ShowJCR/tree/4687a8f608f20aaf004299992f5d347dba009361/%E4%B8%AD%E7%A7%91%E9%99%A2%E5%88%86%E5%8C%BA%E8%A1%A8%E5%8F%8AJCR%E5%8E%9F%E5%A7%8B%E6%95%B0%E6%8D%AE%E6%96%87%E4%BB%B6).

## Public catalogue coverage

The successful 2026-10-12 build matched **23,100 unique journal identities** and produced **23,026 journal profiles with annual metrics**. Coverage is CAS 21,772, XinRui 22,299, JCR quartiles 20,337 and JIF 22,594. Counts can overlap. CCF metadata for the existing 292 journal identities is preserved.

Every evaluation retains its own source and annual label. CAS major/subcategory divisions, XinRui first/second major category and subcategories, and all JCR subject quartiles are kept as separate journal indicators. Identity joins use normalized titles and validated ISSNs; conflicting identities are not forcibly merged. No missing quartile is inferred.

## GitHub Pages publication

On pushes to **main**, the Pages workflow performs these steps:

1. Verify the original CCF data and run unit tests.
2. Download the three CSVs from the pinned upstream commit.
3. Verify all three Git blob SHA digests, minimum record counts, identity-match rate and minimum metric coverage.
4. Build static **public/data/journal-universe.json** (about 7.9 MB) and **public/data/journal-coverage.json**.
5. Typecheck, compile and publish the static website to https://invoidstar.github.io/ElysiaTools/ .

These generated files exist inside the deployed Pages build, not as versioned sources in the GitHub repository. Original CSV bytes are not checked in. Visitors fetch the generated data only when needed, without making third-party requests or uploading files.

## Year labeling and permission boundary

- CAS **2025** is historical, not an invented CAS 2026 edition.
- XinRui **2026** is a separate classification system.
- JCR **2025** source provides 2025 JIF and subject quartiles published in **2026**. Neither Q1 nor XinRui 1区 should be labeled CAS 1区.
- The operator reports that explicit permission to publish the derived database has been secured, but the repository **does not contain or independently validate** the actual permission documents.
- A third-party open-source application's GPL license cannot itself grant rights to a separate data provider's copyright, database rights or terms of use. Provider-specific redistribution and derivative use rights must remain effective for public deployment.

Provider portals: [CAS](https://www.fenqubiao.com/), [XinRui](https://www.xr-scholar.com/Journals/Search), [Clarivate JCR](https://clarivate.com/academia-government/scientific-and-academic-research/research-funding-analytics/journal-citation-reports/).
