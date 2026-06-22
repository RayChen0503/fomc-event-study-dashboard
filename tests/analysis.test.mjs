import test from "node:test";
import assert from "node:assert/strict";

import {
  alignToTaiwanReactionDate,
  calculateEventStudy,
  calculateMaxDrawdown,
  calculateWindowReturn,
  summarizeSensitivity,
  validateInputs
} from "../src/analysis.js";

const priceRows = [
  { date: "2022-03-15", index_name: "TAIEX", close: 100 },
  { date: "2022-03-16", index_name: "TAIEX", close: 101 },
  { date: "2022-03-17", index_name: "TAIEX", close: 103 },
  { date: "2022-03-18", index_name: "TAIEX", close: 104 },
  { date: "2022-03-21", index_name: "TAIEX", close: 102 },
  { date: "2022-03-22", index_name: "TAIEX", close: 105 },
  { date: "2022-03-15", index_name: "Electronics", close: 200 },
  { date: "2022-03-16", index_name: "Electronics", close: 202 },
  { date: "2022-03-17", index_name: "Electronics", close: 212 },
  { date: "2022-03-18", index_name: "Electronics", close: 210 },
  { date: "2022-03-21", index_name: "Electronics", close: 206 },
  { date: "2022-03-22", index_name: "Electronics", close: 214 },
  { date: "2022-03-15", index_name: "Financials", close: 80 },
  { date: "2022-03-16", index_name: "Financials", close: 81 },
  { date: "2022-03-17", index_name: "Financials", close: 82 },
  { date: "2022-03-18", index_name: "Financials", close: 80 },
  { date: "2022-03-21", index_name: "Financials", close: 79 },
  { date: "2022-03-22", index_name: "Financials", close: 83 }
];

test("aligns a FOMC event to the next Taiwan trading day", () => {
  const tradeDates = ["2022-03-15", "2022-03-16", "2022-03-17", "2022-03-18"];
  assert.equal(alignToTaiwanReactionDate("2022-03-16", tradeDates), "2022-03-17");
});

test("calculates event-window return from the previous trading day close", () => {
  const series = priceRows.filter((row) => row.index_name === "TAIEX");
  assert.equal(calculateWindowReturn(series, "2022-03-17", 1), 103 / 101 - 1);
  assert.equal(calculateWindowReturn(series, "2022-03-17", 3), 102 / 101 - 1);
});

test("calculates event study rows and benchmark-relative excess return", () => {
  const events = [
    {
      event_date: "2022-03-16",
      decision_type: "hike",
      rate_change_bp: 25,
      policy_tone: "hawkish",
      source: "Federal Reserve sample"
    }
  ];

  const sourcedPrices = priceRows.map((row) => ({ ...row, source: `Source for ${row.index_name}` }));
  const rows = calculateEventStudy(events, sourcedPrices, { benchmarkName: "TAIEX", windows: [1, 3] });
  const electronicsT1 = rows.find((row) => row.index_name === "Electronics" && row.window === 1);

  assert.equal(rows.length, 6);
  assert.equal(electronicsT1.tw_event_trade_date, "2022-03-17");
  assert.equal(electronicsT1.return_rate, 212 / 202 - 1);
  assert.equal(electronicsT1.benchmark_return, 103 / 101 - 1);
  assert.equal(electronicsT1.excess_return, electronicsT1.return_rate - electronicsT1.benchmark_return);
  assert.equal(electronicsT1.rate_change_bp, 25);
  assert.equal(electronicsT1.event_source, "Federal Reserve sample");
  assert.equal(electronicsT1.price_source, "Source for Electronics");
  assert.equal(electronicsT1.benchmark_source, "Source for TAIEX");
});

test("calculates max drawdown from the running peak", () => {
  const series = [
    { date: "2022-01-03", close: 100 },
    { date: "2022-01-04", close: 120 },
    { date: "2022-01-05", close: 90 },
    { date: "2022-01-06", close: 96 }
  ];

  assert.equal(calculateMaxDrawdown(series), 90 / 120 - 1);
});

test("summarizes sector sensitivity by average absolute excess return", () => {
  const summary = summarizeSensitivity([
    { index_name: "Electronics", window: 5, excess_return: -0.04 },
    { index_name: "Electronics", window: 5, excess_return: 0.02 },
    { index_name: "Financials", window: 5, excess_return: 0.01 }
  ]);

  assert.equal(summary[0].index_name, "Electronics");
  assert.equal(summary[0].event_count, 2);
  assert.equal(summary[0].avg_abs_excess_return, 0.03);
});

test("rejects invalid financial inputs with user-safe validation errors", () => {
  const result = validateInputs(
    [{ event_date: "2022-03-16", decision_type: "hike", policy_tone: "hawkish" }],
    [{ date: "2022-03-17", index_name: "TAIEX", close: 0 }]
  );

  assert.equal(result.ok, false);
  assert.match(result.errors[0], /positive close/i);
});

test("throws a user-safe error when benchmark index is missing", () => {
  assert.throws(
    () => calculateEventStudy([{ event_date: "2022-03-16", decision_type: "hike", policy_tone: "hawkish" }], priceRows, { benchmarkName: "Missing", windows: [1] }),
    /Benchmark index/
  );
});
