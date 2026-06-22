import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsv } from "../src/csv.js";
import { calculateEventStudy } from "../src/analysis.js";
import {
  DEFAULT_SECTOR_MAP,
  csvFromRows,
  deriveRequiredTaiwanDates,
  parseTwseIndustryRows,
  parseTwseTaiexRows,
  summarizeEventReturns
} from "../src/official-data.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const eventsPath = join(root, "data", "fomc_events_2022_2024_official.csv");
const generatedDir = join(root, "data", "generated");
const windows = [1, 3, 5, 10];
const monthKeys = buildMonthKeys("2022-01", "2025-01");
const events = parseCsv(readFileSync(eventsPath, "utf8"));
const generatedAt = new Date().toISOString();

mkdirSync(generatedDir, { recursive: true });

const taiexByDate = new Map();
for (const monthKey of monthKeys) {
  const url = taiexUrl(monthKey);
  const payload = await fetchJson(url);
  parseTwseTaiexRows(payload, url).forEach((row) => taiexByDate.set(row.date, row));
  await wait(180);
}

const tradeDates = [...taiexByDate.keys()].sort();
const requiredDates = deriveRequiredTaiwanDates(events, tradeDates, windows);
const industryRows = [];

for (const date of requiredDates) {
  const { payload, url } = await fetchIndustryPayload(date);
  industryRows.push(...parseTwseIndustryRows(payload, date, DEFAULT_SECTOR_MAP, url));
  await wait(180);
}

const rows = [
  ...requiredDates.map((date) => taiexByDate.get(date)).filter(Boolean),
  ...industryRows
].sort((a, b) => a.date.localeCompare(b.date) || a.index_name.localeCompare(b.index_name));

const outputPath = join(generatedDir, "twse_sector_prices_2022_2024_official.csv");
writeFileSync(outputPath, `${csvFromRows(rows, ["date", "index_name", "close", "source"])}\n`, "utf8");

const eventReturns = calculateEventStudy(events, rows, { benchmarkName: "TAIEX", windows });
writeFileSync(
  join(generatedDir, "fomc_event_returns_2022_2024_official.csv"),
  `${csvFromRows(eventReturns, [
    "event_id",
    "event_date",
    "tw_event_trade_date",
    "decision_type",
    "rate_change_bp",
    "policy_tone",
    "index_name",
    "window",
    "return_rate",
    "benchmark_return",
    "excess_return",
    "event_source",
    "price_source",
    "benchmark_source"
  ])}\n`,
  "utf8"
);

const summaryRows = summarizeEventReturns(eventReturns);
writeFileSync(
  join(generatedDir, "sector_sensitivity_2022_2024_official.csv"),
  `${csvFromRows(summaryRows, [
    "window",
    "decision_type",
    "index_name",
    "event_count",
    "avg_return",
    "avg_excess_return",
    "avg_abs_excess_return",
    "min_excess_return",
    "max_excess_return"
  ])}\n`,
  "utf8"
);

const metadata = {
  generatedAt,
  eventsSource: "data/fomc_events_2022_2024_official.csv",
  outputs: {
    prices: "data/generated/twse_sector_prices_2022_2024_official.csv",
    eventReturns: "data/generated/fomc_event_returns_2022_2024_official.csv",
    sensitivitySummary: "data/generated/sector_sensitivity_2022_2024_official.csv"
  },
  windows,
  sectors: ["TAIEX", ...Object.values(DEFAULT_SECTOR_MAP)],
  requiredTradingDates: requiredDates.length,
  rows: rows.length,
  eventReturnRows: eventReturns.length,
  summaryRows: summaryRows.length,
  officialSources: [
    "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "https://www.twse.com.tw/zh/trading/historical/mi-index.html",
    "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html",
    "https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=YYYYMMDD&type=IND",
    "https://www.twse.com.tw/indicesReport/MI_5MINS_HIST?response=json&date=YYYYMM01"
  ]
};
writeFileSync(join(generatedDir, "official_dataset_metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(`Wrote ${rows.length} TWSE rows for ${requiredDates.length} trading dates.`);

function taiexUrl(monthKey) {
  return `https://www.twse.com.tw/indicesReport/MI_5MINS_HIST?response=json&date=${monthKey.replace("-", "")}01`;
}

function industryUrl(date) {
  return `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${date.replaceAll("-", "")}&type=IND`;
}

function industryFallbackUrl(date) {
  return `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${date.replaceAll("-", "")}&type=ALL`;
}

function buildMonthKeys(start, end) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const keys = [];
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); month += 1) {
    if (month === 13) {
      year += 1;
      month = 1;
    }
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return keys;
}

async function fetchJson(url) {
  let lastStatus = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json,text/plain,*/*",
        "referer": "https://www.twse.com.tw/",
        "user-agent": "Mozilla/5.0 FOMC-event-study-educational-research"
      }
    });
    lastStatus = String(response.status);
    if (!response.ok) {
      await wait(attempt * 500);
      continue;
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`TWSE response was not JSON: ${url}`);
    }
  }
  throw new Error(`Fetch failed ${lastStatus}: ${url}`);
}

async function fetchIndustryPayload(date) {
  const primaryUrl = industryUrl(date);
  try {
    const payload = await fetchJson(primaryUrl);
    if (hasUsableIndustryTable(payload)) return { payload, url: primaryUrl };
  } catch {
    // Fall through to the official ALL endpoint for dates where IND is inconsistent.
  }

  const fallbackUrl = industryFallbackUrl(date);
  const fallbackPayload = await fetchJson(fallbackUrl);
  if (!hasUsableIndustryTable(fallbackPayload)) {
    throw new Error(`TWSE industry data was unavailable for ${date}`);
  }
  return { payload: fallbackPayload, url: fallbackUrl };
}

function hasUsableIndustryTable(payload) {
  return (payload?.tables || []).some((table) => (
    Array.isArray(table.data) && table.data.some((row) => Object.hasOwn(DEFAULT_SECTOR_MAP, row[0]))
  ));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
