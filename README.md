# ElysiaTools

**Research, Made Easier.** · Free & open-source academic research toolkit.

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-7469df?logo=github)](https://invoidstar.github.io/ElysiaTools/)
[![React](https://img.shields.io/badge/React-TypeScript-77a8eb)](https://react.dev/)
[![License](https://img.shields.io/badge/Code-MIT-9b95d6)](LICENSE)

ElysiaTools 是一套面向研究人员的免费科研信息查询与辅助工具，以 **Conference Explorer** 和 **Journal Explorer** 为核心，整合个人关注、截稿日历与轻量科研工具。无需账号或独立服务器，采用 React + TypeScript + Vite 构建并通过 GitHub Pages 部署。

**Website:** https://invoidstar.github.io/ElysiaTools/ （首次访问前需在仓库 Settings → Pages 中启用 GitHub Actions 作为发布来源）

## Features / 主要功能

| 模块 | 当前能力 |
| --- | --- |
| **Home** | 会议与期刊统一搜索、即将截稿、领域入口、数据更新摘要 |
| **Conference Explorer** | CCF 2026 分类、搜索筛选、列表/月份日历、多年度实体结构、多 Track / Cycle 官方时间线、倒计时、时区切换和 ICS 导出 |
| **Journal Explorer** | 期刊名录、出版社与 ISSN（可核验部分）、CCF 2026、OA 已核实状态、最多四本期刊横向比较 |
| **My Academic** | 收藏会议和期刊、个人截止日期清单、筛选保存、JSON 导入/导出、个人 ICS 日历 |
| **Research Utilities** | DOI / arXiv ID / ISSN 解析直达；其他工具按需逐步扩展 |
| **Data integrity** | 官方来源链接、原始时区、核验日期、未公布日期 TBD、无授权指标不冒充当前数据 |

此外提供浅色/深色模式、移动端适配和无服务器部署。

## Data status / 数据覆盖

首次发布包含 **47 场精选会议、36 本精选期刊、8 个已核实年度会议（12 条投稿路径、51 个时间节点）**。其中多项官方截稿时间来自 AAAI 2027、CVPR 2027、ICLR 2027、ACL 2027、USENIX Security 2027 等当届会议页面。它是一批经过选择的初始数据，**不是 CCF 全目录，也不保证覆盖所有最新会议**。

- **CCF 分类：** 使用 2026 年第七版正式目录（含 4 月 9 日勘误），字段记录目录年份与官方出处。为便于整理，初始条目参考了 [第三方结构化提取项目](https://github.com/haozhou-wong/ccf-recommended-list-2026-markdown)，数据以 [CCF 官方目录](https://www.ccf.org.cn/Academic_Evaluation/By_category/) 为准。
- **Deadline：** 日期以当届官网 / CFP 为准。精确截止日期同时保存原始本地时间、IANA 时区与 UTC instant；仅公布日历日的通知保留 date-only，不凭空填充 23:59。
- **Journal metrics：** CCF、JCR/JIF 和中科院历史分区彼此独立。初版不包含非授权 JCR / JIF 或未经核实的 APC、审稿周期。
- **Local data：** 收藏和筛选保存在浏览器 localStorage。可以导出 JSON 备份；清理浏览器存储可能清除收藏信息。
- **Source checks：** 每日/每周 GitHub Actions 对重点官方来源执行可访问性和内容摘要检查，提供审核报告；**不会自动爬取或直接改写截稿日期**。

详细规则请见 [数据政策](docs/DATA_POLICY.md)，修订流程请见 [贡献指南](docs/CONTRIBUTING.md)。

## Tech stack

React 19 · TypeScript · Vite · Lucide Icons · JSON datasets · GitHub Actions · GitHub Pages

Repo layout:

- **src/** — app, shared UI, conference / journal / academic / utility views
- **data/** — conference identities, editions/tracks, journals and source records
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
