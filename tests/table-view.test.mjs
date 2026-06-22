import test from "node:test";
import assert from "node:assert/strict";

import { sourceSummary, sortEventRows } from "../src/table-view.js";

const rows = [
  {
    event_date: "2022-05-04",
    index_name: "Shipping",
    excess_return: -0.04,
    event_source: "https://www.federalreserve.gov/monetarypolicy/fomc20220504a.htm",
    price_source: "https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=20220505&type=IND"
  },
  {
    event_date: "2022-03-16",
    index_name: "Electronics",
    excess_return: 0.03,
    event_source: "https://www.federalreserve.gov/monetarypolicy/fomc20220316a.htm",
    price_source: "https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=20220317&type=IND"
  },
  {
    event_date: "2022-03-16",
    index_name: "Financials",
    excess_return: -0.01,
    event_source: "https://www.federalreserve.gov/monetarypolicy/fomc20220316a.htm",
    price_source: "https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=20220317&type=IND"
  }
];

test("sorts event rows by date and sector by default", () => {
  const sorted = sortEventRows(rows, "date_asc");

  assert.deepEqual(sorted.map((row) => `${row.event_date}:${row.index_name}`), [
    "2022-03-16:Electronics",
    "2022-03-16:Financials",
    "2022-05-04:Shipping"
  ]);
});

test("sorts event rows by excess return magnitude for research scanning", () => {
  const sorted = sortEventRows(rows, "abs_excess_desc");

  assert.deepEqual(sorted.map((row) => row.index_name), ["Shipping", "Electronics", "Financials"]);
});

test("summarizes official source URLs without exposing long technical URLs in the table", () => {
  const summary = sourceSummary(rows[0]);

  assert.equal(summary.label, "Fed / TWSE");
  assert.match(summary.title, /federalreserve\.gov/);
  assert.match(summary.title, /twse\.com\.tw/);
});

test("marks missing row sources as not ready for formal citation", () => {
  const summary = sourceSummary({});

  assert.equal(summary.label, "來源待確認");
  assert.match(summary.title, /缺少/);
});
