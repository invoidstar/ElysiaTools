# ElysiaTools

**Research, Made Easier.** · Free & open-source academic research toolkit.

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-7469df?logo=github)](https://invoidstar.github.io/ElysiaTools/)
[![React](https://img.shields.io/badge/React-TypeScript-77a8eb)](https://react.dev/)
[![License](https://img.shields.io/badge/Code-MIT-9b95d6)](LICENSE)

ElysiaTools 是一套面向研究人员的免费科研信息查询与辅助工具，以 **Conference Explorer** 和 **Journal Explorer** 为核心，整合个人关注、截稿日历与轻量科研工具。无需账号或独立服务器，采用 React + TypeScript + Vite 构建并通过 GitHub Pages 部署。

**Website:** https://invoidstar.github.io/ElysiaTools/

## Features / 主要功能

| 模块 | 当前能力 |
| --- | --- |
| **Home** | 会议与期刊统一搜索、CCF 全目录统计图、录用率趋势、近期截止日期、数据更新摘要 |
| **Conference Explorer** | CCF 第七版完整 386 条会议目录、十大研究领域统计、A/B/C 分类筛选、官方历年录用率可视化、多 Track 截稿时间线、日历与 ICS 导出 |
| **Journal Explorer** | CCF 第七版 295 条期刊分类记录（去重后 291 本）、出版社与 ISSN、CAS 2025 历史分区 / 新锐 2026 / JCR / JIF 独立显示、OpenAlex 2025 收录发文量按需查询、四刊对比和 CSV 导出 |
| **My Academic** | 收藏会议和期刊、个人截止日期清单、筛选保存、JSON 导入/导出、个人 ICS 日历 |
| **Research Utilities** | DOI / arXiv ID / ISSN 解析直达；其他工具按需逐步扩展 |
| **Data integrity** | 681 条 CCF 推荐记录完整性校验、跨领域期刊去重、官方录用率源引用、原始时区、TBD、受限指标留空 |

此外提供浅色/深色模式、移动端适配和无服务器部署。

## Data status / 数据覆盖

V1.1 已覆盖 **CCF 2026 第七版 681 条推荐记录**，包含 **386 场会议 + 295 条期刊领域推荐**。其中 4 本期刊属于跨领域重复推荐，按期刊身份去重为 **291 本 CCF 评级期刊**，额外保留 1 本不在本版目录中的 RA-L，因此期刊检索一共 **292 本**。不同领域的推荐等级在详情页全部保留。与此同时，收录了 **13 条有官方历史来源的录用率记录**，以及首批 8 届会议的 12 条投稿路径和 51 个日程节点。

**注意：** 全量覆盖的是 CCF 推荐目录的评级和身份，不意味着 386 场会议的历年录用率、投稿日期以及 291 本期刊的每项指标全部已经核实。未取得证据的字段标记为待核验。

- **CCF 分类：** 使用 2026 年第七版正式目录（含 4 月 9 日勘误），字段记录目录年份与官方出处。为便于整理，初始条目参考了 [第三方结构化提取项目](https://github.com/haozhou-wong/ccf-recommended-list-2026-markdown)，数据以 [CCF 官方目录](https://www.ccf.org.cn/Academic_Evaluation/By_category/) 为准。
- **Deadline：** 日期以当届官网 / CFP 为准。精确截止日期同时保存原始本地时间、IANA 时区与 UTC instant；仅公布日历日的通知保留 date-only，不凭空填充 23:59。
- **Journal metrics：** 2025 年原中科院分区为停更前最后的历史体系；**新锐期刊分区 2026 是独立机构发布的另一套体系**，不应称作中科院 2026 版。付费 CAS/XinRui 数据不能擅自批量公开，缺失时显示「—」并提供官方查询入口。
- **JCR and JIF：** 严格区分 **指标年份**与**年度 JCR 发布版本**。部分期刊根据出版社公开资料录入了 JIF 或学科 Q1/Q2 数据，其余保留来源链接，绝不复制未经授权的 JCR 数据。
- **Publication count：** 期刊详情页支持用户触发查询 OpenAlex **2025 年已索引作品数**。该数值不能直接等同于官方出版总发文量；按 DOI/ISSN 完全匹配，没找到就提示不可用，不基于名称近似误填。
- **Historical acceptance：** 仅收录官方会议事实表、主办方报告和 CFP 能核实的历史录用率，并明确年度、Track、录用和投稿的口径差异。不能自动推出未来录用率。
- **Local data：** 收藏和筛选保存在浏览器 localStorage。可以导出 JSON 备份；清理浏览器存储可能清除收藏信息。
- **Source checks：** 每日/每周 GitHub Actions 对重点官方来源执行可访问性和内容摘要检查，提供审核报告；**不会自动爬取或直接改写截稿日期**。

详细规则请见 [数据政策](docs/DATA_POLICY.md)，修订流程请见 [贡献指南](docs/CONTRIBUTING.md)。

## Tech stack

React 19 · TypeScript · Vite · Lucide Icons · JSON datasets · GitHub Actions · GitHub Pages

Repo layout:

- **src/** — app, shared UI, conference / journal / academic / utility views
- **data/** — full CCF 2026 directory, journal metadata, source-provenanced acceptance rates, annual editions/tracks, permitted indicators
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
