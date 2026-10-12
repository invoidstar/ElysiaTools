/**
 * ShowJCR reference dataset links, pinned for reproducibility.
 *
 * CSV bytes are never committed to ElysiaTools nor bundled into GitHub Pages.
 * User-triggered browser-only downloads must follow third-party terms.
 */
export const SHOWJCR_COMMIT = '4687a8f608f20aaf004299992f5d347dba009361';
export const SHOWJCR_REPOSITORY = 'https://github.com/hitfyd/ShowJCR';
const folder = encodeURIComponent('中科院分区表及JCR原始数据文件');
export const SHOWJCR_FILES = [
  { id: 'cas', title: '中科院 2025 历史分区', filename: 'FQBJCR2025-UTF8.csv', bytes: 3982738, gitBlob: '5918c4ee712878e2b6bc2e5d50f7a87b3c67a719' },
  { id: 'xinrui', title: '新锐 2026 独立分区', filename: 'XR2026-UTF8.csv', bytes: 6071512, gitBlob: '805202d8a8bf3a6364708b8a4fd4b3c0b5fa9d7e' },
  { id: 'jcr', title: 'JCR 2025 / 2025 JIF', filename: 'JCR2025-UTF8.csv', bytes: 2735506, gitBlob: 'd3a825960d1fb36e5a05827bdf0ae6e41da4ccd4' }
] as const;
export const showJcrRawUrl = (file: typeof SHOWJCR_FILES[number]): string =>
  'https://raw.githubusercontent.com/hitfyd/ShowJCR/' + SHOWJCR_COMMIT + '/' + folder + '/' + file.filename;
export const showJcrBrowseUrl = (file: typeof SHOWJCR_FILES[number]): string =>
  SHOWJCR_REPOSITORY + '/blob/' + SHOWJCR_COMMIT + '/' + folder + '/' + file.filename;
