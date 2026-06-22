import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveRequiredTaiwanDates,
  parseTwseIndustryRows,
  parseTwseTaiexRows,
  summarizeEventReturns,
  twseRocDateToIso
} from "../src/official-data.js";

test("converts TWSE ROC date text to ISO date", () => {
  assert.equal(twseRocDateToIso("111/09/22"), "2022-09-22");
  assert.equal(twseRocDateToIso("113/1/3"), "2024-01-03");
});

test("parses TWSE TAIEX monthly JSON rows into dashboard price rows", () => {
  const rows = parseTwseTaiexRows({
    data: [
      ["111/09/21", "14,500.00", "14,600.00", "14,300.00", "14,424.52"],
      ["111/09/22", "14,410.00", "14,450.00", "14,200.00", "14,284.63"]
    ]
  }, "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?date=20220901&response=json");

  assert.deepEqual(rows, [
    {
      date: "2022-09-21",
      index_name: "TAIEX",
      close: 14424.52,
      source: "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?date=20220901&response=json"
    },
    {
      date: "2022-09-22",
      index_name: "TAIEX",
      close: 14284.63,
      source: "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?date=20220901&response=json"
    }
  ]);
});

test("parses selected TWSE industry index rows", () => {
  const rows = parseTwseIndustryRows({
    tables: [
      {
        title: "111年09月22日 價格指數(臺灣證券交易所)",
        fields: ["指數", "收盤指數", "漲跌(+/-)", "漲跌點數"],
        data: [
          ["電子工業類指數", "680.12", "+", "1.23"],
          ["金融保險類指數", "1,500.50", "-", "4.10"],
          ["其他類指數", "300.00", "+", "0.50"]
        ]
      }
    ]
  }, "2022-09-22", {
    "電子工業類指數": "Electronics",
    "金融保險類指數": "Financials"
  }, "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20220922&type=IND&response=json");

  assert.deepEqual(rows, [
    {
      date: "2022-09-22",
      index_name: "Electronics",
      close: 680.12,
      source: "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20220922&type=IND&response=json"
    },
    {
      date: "2022-09-22",
      index_name: "Financials",
      close: 1500.5,
      source: "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20220922&type=IND&response=json"
    }
  ]);
});

test("derives Taiwan trading dates required for previous close and event windows", () => {
  const dates = deriveRequiredTaiwanDates(
    [{ event_date: "2022-09-21" }],
    ["2022-09-20", "2022-09-21", "2022-09-22", "2022-09-23", "2022-09-26", "2022-09-27"],
    [1, 3]
  );

  assert.deepEqual(dates, ["2022-09-21", "2022-09-22", "2022-09-23", "2022-09-26"]);
});

test("summarizes event returns by window decision and sector", () => {
  const summary = summarizeEventReturns([
    { window: 5, decision_type: "hike", index_name: "Electronics", return_rate: 0.03, excess_return: 0.01 },
    { window: 5, decision_type: "hike", index_name: "Electronics", return_rate: -0.01, excess_return: -0.03 },
    { window: 5, decision_type: "hold", index_name: "Financials", return_rate: 0.02, excess_return: 0.015 }
  ]);

  assert.deepEqual(summary[0], {
    window: 5,
    decision_type: "hike",
    index_name: "Electronics",
    event_count: 2,
    avg_return: 0.01,
    avg_excess_return: -0.01,
    avg_abs_excess_return: 0.02,
    min_excess_return: -0.03,
    max_excess_return: 0.01
  });
});
