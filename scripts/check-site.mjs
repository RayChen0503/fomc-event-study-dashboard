import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/analysis.js",
  "src/csv.js",
  "src/data-quality.js",
  "src/format.js",
  "src/metadata.js",
  "src/official-data.js",
  "src/sample-data.js",
  "src/static-qa.js",
  "scripts/build-official-datasets.mjs",
  "docs/deployment.md",
  "docs/manual-visual-qa.md",
  "docs/official-data-sources.md",
  "data/fomc_events_official_template.csv",
  "data/fomc_events_2022_2024_official.csv",
  "data/twse_sector_prices_official_template.csv",
  "data/generated/fomc_event_returns_2022_2024_official.csv",
  "data/generated/official_dataset_metadata.json",
  "data/generated/sector_sensitivity_2022_2024_official.csv",
  "data/generated/twse_sector_prices_2022_2024_official.csv",
  "README.md",
  ".gitignore",
  ".nojekyll",
  "scripts/qa-site.mjs"
];

const forbiddenPatterns = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /api[_-]?key/i,
  /secret/i,
  /guaranteed profit/i,
  /保證獲利/
];

const failures = [];

for (const file of requiredFiles) {
  const path = join(root, file);
  try {
    const stat = statSync(path);
    if (!stat.isFile()) failures.push(`${file} is not a file`);
  } catch {
    failures.push(`${file} is missing`);
  }
}

for (const file of requiredFiles.filter((file) => /\.(html|css|js)$/.test(file))) {
  const text = readFileSync(join(root, file), "utf8");
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(text)) failures.push(`${file} contains forbidden pattern ${pattern}`);
  });
}

const html = readFileSync(join(root, "index.html"), "utf8");
[
  "dataStatus",
  "事件報酬明細",
  "資料來源與限制",
  "研究可用性檢核",
  "非投資建議",
  "匯入 FOMC 事件 CSV",
  "匯入產業指數 CSV"
].forEach((needle) => {
  if (!html.includes(needle)) failures.push(`index.html is missing required text: ${needle}`);
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Static site check passed (${requiredFiles.length} files).`);
