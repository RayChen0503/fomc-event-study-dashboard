import test from "node:test";
import assert from "node:assert/strict";

import { assessResearchReadiness } from "../src/data-quality.js";

const validEvents = [
  { event_date: "2022-03-16", decision_type: "hike", policy_tone: "hawkish", source: "Federal Reserve FOMC statement" }
];

const validPrices = [
  { date: "2022-03-15", index_name: "TAIEX", close: 100 },
  { date: "2022-03-16", index_name: "TAIEX", close: 101 },
  { date: "2022-03-17", index_name: "TAIEX", close: 103 },
  { date: "2022-03-18", index_name: "TAIEX", close: 104 },
  { date: "2022-03-21", index_name: "TAIEX", close: 105 },
  { date: "2022-03-22", index_name: "TAIEX", close: 106 },
  { date: "2022-03-15", index_name: "Electronics", close: 200 },
  { date: "2022-03-16", index_name: "Electronics", close: 202 },
  { date: "2022-03-17", index_name: "Electronics", close: 205 },
  { date: "2022-03-18", index_name: "Electronics", close: 206 },
  { date: "2022-03-21", index_name: "Electronics", close: 207 },
  { date: "2022-03-22", index_name: "Electronics", close: 208 }
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
