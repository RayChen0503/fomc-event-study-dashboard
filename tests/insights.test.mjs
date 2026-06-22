import test from "node:test";
import assert from "node:assert/strict";

import { buildInsightSummary } from "../src/insights.js";

test("builds a readable research insight summary for the active view", () => {
  const summary = buildInsightSummary({
    rows: [
      { event_id: "E1", index_name: "Electronics" },
      { event_id: "E2", index_name: "Electronics" },
      { event_id: "E1", index_name: "Financials" },
      { event_id: "E1", index_name: "TAIEX" }
    ],
    sensitivity: [
      { index_name: "Electronics", avg_excess_return: 0.024, avg_abs_excess_return: 0.031 },
      { index_name: "Financials", avg_excess_return: -0.015, avg_abs_excess_return: 0.018 },
      { index_name: "TAIEX", avg_excess_return: 0, avg_abs_excess_return: 0 }
    ],
    drawdowns: [
      { index_name: "TAIEX", max_drawdown: -0.08 },
      { index_name: "Electronics", max_drawdown: -0.12 },
      { index_name: "Financials", max_drawdown: -0.06 }
    ],
    selectedWindow: 5,
    decisionFilter: "hike",
    sectorFilter: "all"
  });

  assert.equal(summary.viewLabel, "T+5 / 升息 / 全部類股");
  assert.equal(summary.sample.value, "2 個事件");
  assert.equal(summary.sample.detail, "4 筆事件-類股觀察值；2 個產業類股");
  assert.equal(summary.strongest.label, "Electronics");
  assert.equal(summary.strongest.value, "+2.40%");
  assert.equal(summary.weakest.label, "Financials");
  assert.equal(summary.weakest.value, "-1.50%");
  assert.equal(summary.drawdown.label, "Electronics");
  assert.equal(summary.drawdown.value, "-12.00%");
  assert.match(summary.narrative, /不能解讀為未來報酬預測/);
});

test("returns safe empty-state insight text when filters remove all rows", () => {
  const summary = buildInsightSummary({
    rows: [],
    sensitivity: [],
    drawdowns: [],
    selectedWindow: 10,
    decisionFilter: "cut",
    sectorFilter: "Financials"
  });

  assert.equal(summary.viewLabel, "T+10 / 降息 / Financials");
  assert.equal(summary.sample.value, "沒有符合條件的事件");
  assert.equal(summary.strongest.value, "—");
  assert.match(summary.narrative, /請調整事件窗、決策類型或產業篩選/);
});
