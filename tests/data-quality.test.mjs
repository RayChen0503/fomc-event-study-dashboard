import test from "node:test";
import assert from "node:assert/strict";

import { assessResearchReadiness } from "../src/data-quality.js";

const validEvents = [
  {
    event_date: "2022-03-16",
    decision_type: "hike",
    rate_change_bp: 25,
    policy_tone: "hawkish",
    source: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
  }
];

const validPrices = [
  { date: "2022-03-15", index_name: "TAIEX", close: 100, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-16", index_name: "TAIEX", close: 101, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-17", index_name: "TAIEX", close: 103, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-18", index_name: "TAIEX", close: 104, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-21", index_name: "TAIEX", close: 105, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-22", index_name: "TAIEX", close: 106, source: "https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html" },
  { date: "2022-03-15", index_name: "Electronics", close: 200, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" },
  { date: "2022-03-16", index_name: "Electronics", close: 202, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" },
  { date: "2022-03-17", index_name: "Electronics", close: 205, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" },
  { date: "2022-03-18", index_name: "Electronics", close: 206, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" },
  { date: "2022-03-21", index_name: "Electronics", close: 207, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" },
  { date: "2022-03-22", index_name: "Electronics", close: 208, source: "https://www.twse.com.tw/zh/trading/historical/mi-index.html" }
];

const importedSources = {
  events: { source: "FOMC events CSV: fomc.csv", retrievedAt: "2026-06-22 21:30", isDemo: false },
  prices: { source: "Taiwan sector index prices CSV: prices.csv", retrievedAt: "2026-06-22 21:31", isDemo: false }
};

test("blocks demo or mixed sources from formal research readiness", () => {
  const result = assessResearchReadiness({
    events: validEvents,
    prices: validPrices,
    sources: {
      events: importedSources.events,
      prices: { source: "Synthetic prices", retrievedAt: "2026-06-22", isDemo: true }
    },
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "source-state").status, "fail");
});

test("blocks events without verifiable source labels", () => {
  const result = assessResearchReadiness({
    events: [{ ...validEvents[0], source: "" }],
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "event-sources").status, "fail");
});

test("blocks FOMC event sources that are not URLs", () => {
  const result = assessResearchReadiness({
    events: [{ ...validEvents[0], source: "Federal Reserve FOMC statement" }],
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "event-sources").status, "fail");
});

test("blocks invalid FOMC decision classifications", () => {
  const result = assessResearchReadiness({
    events: [{ ...validEvents[0], decision_type: "pause" }],
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "decision-types").status, "fail");
});

test("blocks FOMC events without rate-change basis points", () => {
  const result = assessResearchReadiness({
    events: [{ ...validEvents[0], rate_change_bp: "" }],
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "rate-change").status, "fail");
});

test("does not accept legacy rate_change as a substitute for rate_change_bp", () => {
  const { rate_change_bp: _unused, ...eventWithoutBasisPoints } = validEvents[0];
  const result = assessResearchReadiness({
    events: [{ ...eventWithoutBasisPoints, rate_change: 0.25 }],
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "rate-change").status, "fail");
});

test("blocks price rows without source labels", () => {
  const result = assessResearchReadiness({
    events: validEvents,
    prices: validPrices.map((row, index) => index === 0 ? { ...row, source: "" } : row),
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "price-sources").status, "fail");
});

test("blocks price row sources that are not URLs", () => {
  const result = assessResearchReadiness({
    events: validEvents,
    prices: validPrices.map((row, index) => index === 0 ? { ...row, source: "TWSE daily report" } : row),
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "price-sources").status, "fail");
});

test("blocks missing benchmark index", () => {
  const result = assessResearchReadiness({
    events: validEvents,
    prices: validPrices.filter((row) => row.index_name !== "TAIEX"),
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.id === "benchmark").status, "fail");
});

test("passes complete imported data with event-window coverage", () => {
  const result = assessResearchReadiness({
    events: validEvents,
    prices: validPrices,
    sources: importedSources,
    windows: [1, 3]
  });

  assert.equal(result.ready, true);
  assert.equal(result.checks.every((check) => check.status === "pass"), true);
});
