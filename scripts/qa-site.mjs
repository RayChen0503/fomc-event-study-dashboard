import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { runStaticQa } from "../src/static-qa.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const scriptFiles = [
  "src/app.js",
  "src/analysis.js",
  "src/csv.js",
  "src/data-quality.js",
  "src/format.js",
  "src/metadata.js",
  "src/sample-data.js"
];
const scripts = scriptFiles.map((file) => readFileSync(join(root, file), "utf8"));
const result = runStaticQa({ html, css, scripts });

if (!result.ok) {
  console.error(result.failures.join("\n"));
  process.exit(1);
}

console.log("Static QA passed.");
