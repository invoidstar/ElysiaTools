# ElysiaTools — Journal Metrics CSV Import

## Why local data import?

CCF 2026 directory membership is open-directory bibliographic information; CAS 2025 historical divisions, XinRui 2026 independent divisions and Clarivate JCR/JIF figures are **different, licensed evaluation products**. Finding a CSV on a third-party website does not automatically confer redistribution permission. ElysiaTools does not silently copy those databases into its publicly deployed GitHub Pages assets.

Users who are **authorized to access and use** the tables may import local CSV/TSV files for personal research. The browser parses and stores matched metrics in localStorage **on that device only**. ElysiaTools does not send uploaded content to our servers, GitHub, LetPub, or other services.

## How to import

1. Open **Journal Explorer → 补充期刊分区数据 → 选择 CSV / TSV**.
2. Select up to four UTF-8 CSV or TSV files. Maximum 30 MB and 50,000 rows per file.
3. The interface reports exact matches, unmatched journal names, rows without metrics and potential ISSN conflicts.
4. Use the **已验证指标** selector to filter by imported CAS, XinRui, JCR or JIF metrics, or open individual journals to compare their ratings.
5. To delete all locally imported metric records, click **清除已导入的私人指标**. Clearing browser storage also removes them. Do not confuse this local data with the ordinary My Academic favorites JSON backup: **private metrics are intentionally not exported into that backup**.

### Supported CSV header formats

**Simple ElysiaTools format:** Download the template from the importer. Its headers are:

```csv
Journal,ISSN,CAS2025,XR2026,JCR2025,JIF2025
```

Fill only the fields you have verified/are authorized to use. CAS and XinRui values take the form `1区`–`4区`; JCR quartiles are `Q1`–`Q4`; JIF is a numerical figure. These systems **do not share a rank scale**.

**Common existing files supported:** CSVs with `Journal` and `ISSN/EISSN` + `大类分区` (FQBJCR2025), with `大类新锐分区` (XR2026), or `IF(2025)` and `Category_1`/`IF Quartile(2025)_1` style fields (JCR2025). CSV columns may be rearranged; UTF-8 BOM, quoted commas, CRLF and tabs are handled.

The `JCR2025` CSV represents JIF metric year 2025 (the report was released in 2026), while `CAS2025` and `XR2026` are separate institutions' editions. Category-specific JCR quartiles are preserved rather than being combined into a pseudo CAS division.

### Matching and quality

Records match by an exact known ISSN, eISSN, ISSN-L, or an exact normalized official journal name/alias. If multiple ISSNs point to different journals, the row is rejected. Titles are **not fuzzy matched** because journal name overlap or a rename could corrupt an academic comparison. Unknown rows are reported and ignored, never silently assigned to another journal.

The **public catalog** includes a handful of publisher-disclosed JIF/JCR facts and eight individually linked LetPub XinRui 2026 summary values. LetPub is **secondary, not the issuing XinRui institution**; always confirm critical assessments on the official portal. A filter with no publicly licensed metrics is disabled until relevant private data is loaded, instead of showing an unexplained zero-result page.

### Official/secondary research links

- LetPub journal reference: https://www.letpub.com.cn/index.php?page=journalapp&view=search
- XinRui official query: https://www.xr-scholar.com/Journals/Search
- Clarivate JCR: https://clarivate.com/academia-government/scientific-and-academic-research/research-funding-analytics/journal-citation-reports/
- CAS 2025 historical edition (institutional access): https://www.lib.szu.edu.cn/er/fenqubiao

Do not upload any private dataset into a public Issue or PR. To expand the site's public catalog, propose only individually attributable public facts or an explicitly licensed redistribution source.
