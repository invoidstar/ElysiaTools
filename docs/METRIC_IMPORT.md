# ElysiaTools — 一键同步与个人期刊分区数据

## 推荐方式：网站内一键同步参考数据

ElysiaTools V1.3 无需你先分别下载 CSV。打开 https://invoidstar.github.io/ElysiaTools/#journal ，在 **「期刊指标覆盖度」下方** 展开 **「同步期刊评价数据」**。阅读来源和使用条件，勾选确认你的个人使用权限，然后点击 **「一键同步三份参考表」**。

该操作直接从 ShowJCR 固定 GitHub 提交读取：

- 中科院历史分区 **2025**：FQBJCR2025-UTF8.csv（约 4.0 MB）
- **2026 新锐**独立分区：XR2026-UTF8.csv（约 6.1 MB）
- Clarivate **JCR 2025** 及当年 JIF（2026 年发布）：JCR2025-UTF8.csv（约 2.7 MB）

经过数据结构核对，292 本期刊中约有 249 本可匹配 CAS、248 本可匹配新锐、249 本可匹配 JCR；实际覆盖以网页解析结果为准。分区的大小类记录分开储存，JCR 不同学科 Q1–Q4 不合并成中科院一区。

同步在浏览器中完成并保存到 `localStorage`，**不会上传至 ElysiaTools、GitHub Pages 或公开仓库**；退出后可在同一浏览器再次使用。同步不会改变其他访客的网站指标数量。清除本地数据后可重新同步。

**注意：网页浏览或 GitHub 公开下载不等于获得 JCR / CAS / 新锐数据的公开再分发许可；请在有权访问和使用的范围内开展个人研究。** Clarivate 明确限制机构外的批量共享。ElysiaTools 提供的是用户自主同步能力，不是第三方授权数据库的公共镜像。

### 网络不通时

通过 https://github.com/hitfyd/ShowJCR/tree/master/中科院分区表及JCR原始数据文件 分别下载以上文件，之后在同一面板点击「选择本地 CSV / TSV」。也可下载 292 本期刊模板填写合法取得的指标。

### 数据匹配和来源

匹配优先使用 ISSN / eISSN / ISSN-L，同名冲突会拒绝；无匹配 ISSN 时使用规范化全称的严格匹配，不进行可能导致错配的模糊匹配。ShowJCR 中科院原始字段的 `1 [排名/总数]` 格式已修复为可筛选的 `1区`。对于 CAS 与新锐，既保存大类，也保存有来源的小类分区；JCR 按学科分别保存 Q1–Q4。

期刊界面将同步取得的结果标为「本机同步 / 第三方参考」，原有出版社公开数据保持独立。CSV 本地手动上传的值优先于第三方同步参考值。

---

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
