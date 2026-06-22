import { formatPercent, formatSignedPercent } from "./format.js";

const BENCHMARK_NAME = "TAIEX";
const DECISION_LABELS = {
  all: "全部決策",
  hike: "升息",
  hold: "維持",
  cut: "降息"
};

export function buildInsightSummary({
  rows = [],
  sensitivity = [],
  drawdowns = [],
  selectedWindow = 5,
  decisionFilter = "all",
  sectorFilter = "all"
} = {}) {
  const viewLabel = `T+${selectedWindow} / ${decisionText(decisionFilter)} / ${sectorText(sectorFilter)}`;
  const sectorRows = rows.filter((row) => row.index_name !== BENCHMARK_NAME);
  const eventCount = new Set(rows.map((row) => row.event_id).filter(Boolean)).size;
  const sectorCount = new Set(sectorRows.map((row) => row.index_name).filter(Boolean)).size;
  const sectorSensitivity = sensitivity.filter((item) => item.index_name !== BENCHMARK_NAME);
  const byAverageExcess = [...sectorSensitivity].sort((a, b) => b.avg_excess_return - a.avg_excess_return);
  const strongest = byAverageExcess[0];
  const weakest = [...sectorSensitivity].sort((a, b) => a.avg_excess_return - b.avg_excess_return)[0];
  const deepestDrawdown = drawdowns.filter((item) => item.index_name !== BENCHMARK_NAME)[0];

  if (rows.length === 0) {
    return {
      viewLabel,
      sample: {
        label: "樣本範圍",
        value: "沒有符合條件的事件",
        detail: "目前篩選條件下沒有可分析的事件-類股觀察值。"
      },
      strongest: emptyMetric("相對大盤最強"),
      weakest: emptyMetric("相對大盤最弱"),
      drawdown: emptyMetric("最大回撤壓力"),
      narrative: "目前篩選條件下沒有足夠資料，請調整事件窗、決策類型或產業篩選。"
    };
  }

  return {
    viewLabel,
    sample: {
      label: "樣本範圍",
      value: `${eventCount} 個事件`,
      detail: `${rows.length} 筆事件-類股觀察值；${sectorCount} 個產業類股`
    },
    strongest: metricFromSensitivity("相對大盤最強", strongest),
    weakest: metricFromSensitivity("相對大盤最弱", weakest),
    drawdown: metricFromDrawdown("最大回撤壓力", deepestDrawdown),
    narrative: buildNarrative(strongest, weakest, deepestDrawdown)
  };
}

function decisionText(value) {
  return DECISION_LABELS[value] || value || DECISION_LABELS.all;
}

function sectorText(value) {
  return value === "all" ? "全部類股" : value || "全部類股";
}

function emptyMetric(label) {
  return {
    label: "—",
    value: "—",
    detail: `${label}無可呈現資料`
  };
}

function metricFromSensitivity(label, item) {
  if (!item) return emptyMetric(label);
  return {
    label: item.index_name,
    value: formatSignedPercent(item.avg_excess_return),
    detail: `平均絕對超額報酬 ${formatPercent(item.avg_abs_excess_return)}`
  };
}

function metricFromDrawdown(label, item) {
  if (!item) return emptyMetric(label);
  return {
    label: item.index_name,
    value: formatPercent(item.max_drawdown),
    detail: "樣本期間最大回撤"
  };
}

function buildNarrative(strongest, weakest, deepestDrawdown) {
  if (!strongest || !weakest || !deepestDrawdown) {
    return "目前資料不足以產生完整摘要，請確認資料來源、事件窗與篩選條件。";
  }

  return `在目前視角下，${strongest.index_name} 的平均超額報酬較高，${weakest.index_name} 較弱；${deepestDrawdown.index_name} 在樣本期間最大回撤為 ${formatPercent(deepestDrawdown.max_drawdown)}。此摘要用於描述事件研究結果，不能解讀為未來報酬預測。`;
}
