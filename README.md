# ElysiaTools

**Research, Made Easier.** · Free & open-source academic research toolkit.

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-7469df?logo=github)](https://invoidstar.github.io/ElysiaTools/)
[![React](https://img.shields.io/badge/React-TypeScript-77a8eb)](https://react.dev/)
[![License](https://img.shields.io/badge/Code-MIT-9b95d6)](LICENSE)

ElysiaTools 是一套面向研究人员的免费科研信息查询与辅助工具，以 **Conference Explorer** 和 **Journal Explorer** 为核心，整合个人关注、截稿日历与轻量科研工具。无需账号或独立服务器，采用 React + TypeScript + Vite 构建并通过 GitHub Pages 部署。

**Website:** https://invoidstar.github.io/ElysiaTools/ · [Data import & rights](docs/METRIC_IMPORT.md)

## Features / 主要功能

| 模块 | 当前能力 |
| --- | --- |
| **Home** | 会议与期刊统一搜索、CCF 全目录统计图、录用率趋势、近期截止日期、数据更新摘要 |
| **Conference Explorer** | CCF 第七版 386 场会议、十大领域、A/B/C 分类；新增 1,062 条有出处的年度投稿/录用统计（官方与社区转录区分）；会议时间线、日历与 ICS 导出 |
| **Journal Explorer** | 291 本 CCF 期刊（292 本含补充期刊）；CCF/CAS 2025/新锐 2026/JCR/JIF 独立指标，8 本公开新锐评级、期刊来源核验链接；**本地导入有授权的 CSV**，完整筛选和四刊对比；OpenAlex 发文量查询 |
| **My Academic** | 收藏会议和期刊、个人截止日期清单、筛选保存、JSON 导入/导出、个人 ICS 日历 |
| **Research Utilities** | DOI / arXiv ID / ISSN 解析直达；其他工具按需逐步扩展 |
| **Data integrity** | 681 条 CCF 目录完整性校验、历史录用率来源分类、CSV 精确期刊身份匹配、AoE、未公布日期 TBD、受限分区不公开批量转载 |

此外提供浅色/深色模式、移动端适配和无服务器部署。

## Data status / 数据覆盖

V1.1 已覆盖 **CCF 2026 第七版 681 条推荐记录**，包含 **386 场会议 + 295 条期刊领域推荐**。其中 4 本期刊属于跨领域重复推荐，按期刊身份去重为 **291 本 CCF 评级期刊**，额外保留 1 本不在本版目录中的 RA-L，因此期刊检索一共 **292 本**。不同领域的推荐等级在详情页全部保留。与此同时，收录了 **13 条有官方历史来源的录用率记录**，以及首批 8 届会议的 12 条投稿路径和 51 个日程节点。

**2026-10-12 · V1.2 增量：** 已整理 **1,062 条会议年度统计**，覆盖 **273 场会议**，其中 1,049 条源自 [CCF-Deadlines](https://github.com/ccfddl/ccf-deadlines) 的 MIT 许可历史统计，附带原始网页来源。社区转录并不等同于本站逐条核实的官方数字，在图表和年度表格中会分别标记。与已有官方统计冲突的年份不自动覆盖（例如 AAAI 2025）。记录年份通常覆盖 2015—2026。

**期刊分区的使用方式：** 当前公开仓库只收录允许公开展示的少量事实级元数据：**8 本期刊的新锐 2026 公开检索值**、部分出版社公开的 JIF/JCR；不声称已导入全部 291 本的中科院 2025 / JCR 完整表。界面会显示各分区的真实覆盖率，尚无数据的筛选项会禁用，而不是出现误导性的「0 条结果」。用户可在期刊页选择 **补充期刊分区数据**，导入其合法获得的 `FQBJCR2025-UTF8.csv` / `XR2026-UTF8.csv` / `JCR2025-UTF8.csv` 或本站 CSV 模板，完成完整的本地分区查询和筛选。导入仅在当前浏览器解析并持久化，**不上传或发布 CSV 原文**；详见 [分区数据导入指南](docs/METRIC_IMPORT.md)。

**注意：** 全量覆盖的是 CCF 推荐目录的评级和身份

- **CCF 分类：** 使用 2026 年第七版正式目录（含 4 月 9 日勘误），字段记录目录年份与官方出处。为便于整理，初始条目参考了 [第三方结构化提取项目](https://github.com/haozhou-wong/ccf-recommended-list-2026-markdown)，数据以 [CCF 官方目录](https://www.ccf.org.cn/Academic_Evaluation/By_category/) 为准。
- **Deadline：** 日期以当届官网 / CFP 为准。精确截止日期同时保存原始本地时间、IANA 时区与 UTC instant；仅公布日历日的通知保留 date-only，不凭空填充 23:59。
- **Journal metrics：** 2025 年原中科院分区为停更前最后的历史体系；**新锐期刊分区 2026 是独立机构发布的另一套体系**，不应称作中科院 2026 版。付费 CAS/XinRui 数据不能擅自批量公开，缺失时显示「—」并提供官方查询入口。
- **JCR and JIF：** 严格区分 **指标年份**与**年度 JCR 发布版本**。部分期刊根据出版社公开资料录入了 JIF 或学科 Q1/Q2 数据，其余保留来源链接，绝不复制未经授权的 JCR 数据。
- **Publication count：** 期刊详情页支持用户触发查询 OpenAlex **2025 年已索引作品数**。该数值不能直接等同于官方出版总发文量；按 DOI/ISSN 完全匹配，没找到就提示不可用，不基于名称近似误填。
- **Historical acceptance：** 优先使用官方主办方发布的事实数据，并明确标识 CCF-Deadlines 的社区整理记录；各年度均保存投稿量、录用量、录用率和原始来源（存在数据的字段才显示）。不同会议/年份的口径不能混用或用于预测。
- **Local data：** 收藏和筛选保存在浏览器 localStorage。可以导出 JSON 备份；清理浏览器存储可能清除收藏信息。
- **Source checks：** 每日/每周 GitHub Actions 对重点官方来源执行可访问性和内容摘要检查，提供审核报告；**不会自动爬取或直接改写截稿日期**。

详细规则请见 [数据政策](docs/DATA_POLICY.md)，修订流程请见 [贡献指南](docs/CONTRIBUTING.md)。

## Tech stack

React 19 · TypeScript · Vite · Lucide Icons · JSON datasets · GitHub Actions · GitHub Pages

Repo layout:

- **src/** — app, shared UI, conference / journal / academic / utility views
- **data/** — CCF 2026 directory, journal metadata, 1,062 historical conference records + source entries, verified editions and permitted indicators
- **scripts/validate.mjs** — data integrity and AoE conversion checks
- **scripts/sync/check_sources.py** — conservative official-source health monitoring
- **tests/** — regression checks for date conversion and catalog consistency
- **.github/workflows/** — build, validation, Pages deployment and scheduled source checks

## Development

Node.js 22+ recommended:

~~~bash
npm install
npm run dev
npm run check
npm run build
~~~

The production deployment route is **GitHub Pages only**, with Vite base set to /ElysiaTools/ and a GitHub Actions deployment workflow. No database service, custom domain or user account is required.

> To enable publishing for a new repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Pushing to main then runs data tests, type checks, build and deployment.

## Contributing

Corrections are welcome. For academic data, please provide an **official link, edition/year, precise track, original deadline timezone and verification date**. If a deadline is unannounced, leave it TBD rather than deriving it from past years. See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

Original application code and documentation: [MIT](LICENSE). CCF lists, journal metadata and publisher pages remain subject to their respective original rights and licenses. ElysiaTools is an independent community project, not an official service of CCF or any conference/publisher.
