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
  "src/insights.js",
  "src/metadata.js",
  "src/sample-data.js",
  "src/table-view.js"
];
const scripts = scriptFiles.map((file) => readFileSync(join(root, file), "utf8"));
const result = runStaticQa({ html, css, scripts });
const appScript = readFileSync(join(root, "src/app.js"), "utf8");
const officialEventsPath = "data/fomc_events_2022_2024_official.csv";
const officialPricesPath = "data/generated/twse_sector_prices_2022_2024_official.csv";
const officialEventsCsv = readFileSync(join(root, officialEventsPath), "utf8")
  .trim()
  .split(/\r?\n/);
const officialPricesCsv = readFileSync(join(root, officialPricesPath), "utf8")
  .trim()
  .split(/\r?\n/);
const qaFailures = [...result.failures];

requireQa(html.includes('id="loadOfficialButton"'), "Header official dataset button is missing.");
requireQa(html.includes('id="loadOfficialInlineButton"'), "Inline official dataset button is missing.");
requireQa(html.includes('id="nextStepTitle"'), "Next-step status title is missing.");
requireQa(
  appScript.includes(`fetchText("./${officialEventsPath}")`),
  "Frontend does not fetch the official FOMC events dataset."
);
requireQa(
  appScript.includes(`fetchText("./${officialPricesPath}")`),
  "Frontend does not fetch the official TWSE sector prices dataset."
);
requireQa(
  officialEventsCsv[0] === "event_id,event_date,decision_type,rate_change_bp,policy_tone,target_rate_lower,target_rate_upper,source",
  "Official FOMC events CSV header is not compatible with the dashboard."
);
requireQa(officialEventsCsv.length > 1, "Official FOMC events CSV has no data rows.");
requireQa(
  officialPricesCsv[0] === "date,index_name,close,source",
  "Official TWSE sector prices CSV header is not compatible with the dashboard."
);
requireQa(officialPricesCsv.length > 1, "Official TWSE sector prices CSV has no data rows.");

if (qaFailures.length > 0) {
  console.error(qaFailures.join("\n"));
  process.exit(1);
}

console.log("Static QA passed.");

function requireQa(condition, message) {
  if (!condition) qaFailures.push(message);
}
