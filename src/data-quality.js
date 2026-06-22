import { calculateEventStudy, validateInputs } from "./analysis.js";

const VALID_DECISIONS = new Set(["hike", "hold", "cut"]);

export function assessResearchReadiness({
  events = [],
  prices = [],
  sources = {},
  benchmarkName = "TAIEX",
  windows = [1, 3, 5, 10]
} = {}) {
  const validation = validateInputs(events, prices);
  const checks = [
    checkSourceState(sources),
    checkBasicValidation(validation),
    checkEventSources(events),
    checkDecisionTypes(events),
    checkRateChanges(events),
    checkPriceSources(prices),
    checkBenchmark(prices, benchmarkName)
  ];

  checks.push(checkWindowCoverage({
    events,
    prices,
    benchmarkName,
    windows,
    canCalculate: validation.ok && checks.every((check) => (
      !["source-state", "event-sources", "decision-types", "benchmark"].includes(check.id) || check.status === "pass"
    ))
  }));

  return {
    ready: checks.every((check) => check.status === "pass"),
    checks
  };
}

function checkSourceState(sources) {
  const eventsImported = sources?.events?.isDemo === false;
  const pricesImported = sources?.prices?.isDemo === false;
  if (eventsImported && pricesImported) {
    return pass("source-state", "資料來源完整性", "FOMC 事件與產業指數資料皆為使用者匯入。");
  }
  return fail("source-state", "資料來源完整性", "正式研究需同時匯入 FOMC 事件 CSV 與臺灣產業指數 CSV；示範或混合資料不得寫入研究結論。");
}

function checkBasicValidation(validation) {
  if (validation.ok) return pass("basic-fields", "基本欄位格式", "必要欄位、日期與收盤價通過基本檢查。");
  return fail("basic-fields", "基本欄位格式", validation.errors[0] || "資料欄位尚未通過基本檢查。");
}

function checkEventSources(events) {
  const invalid = events.filter((event) => !isVerifiableUrl(event.source)).length;
  if (invalid === 0) return pass("event-sources", "事件來源可追溯", "每筆 FOMC 事件皆有可驗證 URL。");
  return fail("event-sources", "事件來源可追溯", `${invalid} 筆 FOMC 事件缺少可驗證 URL。`);
}

function checkDecisionTypes(events) {
  const invalid = events.filter((event) => !VALID_DECISIONS.has(String(event.decision_type || "").trim()));
  if (invalid.length === 0) return pass("decision-types", "利率決策分類", "決策分類皆為 hike、hold 或 cut。");
  return fail("decision-types", "利率決策分類", `${invalid.length} 筆事件的 decision_type 不屬於 hike、hold 或 cut。`);
}

function checkRateChanges(events) {
  const missing = events.filter((event) => !hasFiniteRateChange(event)).length;
  if (missing === 0) return pass("rate-change", "利率變動欄位", "每筆 FOMC 事件皆有 rate_change_bp，可作為政策變數。");
  return fail("rate-change", "利率變動欄位", `${missing} 筆 FOMC 事件缺少 rate_change_bp。`);
}

function checkPriceSources(prices) {
  const invalid = prices.filter((row) => !isVerifiableUrl(row.source)).length;
  if (invalid === 0) return pass("price-sources", "價格來源可追溯", "每筆指數價格皆有可驗證 URL。");
  return fail("price-sources", "價格來源可追溯", `${invalid} 筆指數價格缺少可驗證 URL。`);
}

function checkBenchmark(prices, benchmarkName) {
  const hasBenchmark = prices.some((row) => String(row.index_name || "").trim() === benchmarkName);
  if (hasBenchmark) return pass("benchmark", "大盤基準指數", `資料包含 ${benchmarkName}，可計算超額報酬。`);
  return fail("benchmark", "大盤基準指數", `資料缺少 ${benchmarkName}，無法計算相對大盤超額報酬。`);
}

function hasFiniteRateChange(event) {
  const value = event.rate_change_bp;
  return value !== "" && value != null && Number.isFinite(Number(value));
}

function isVerifiableUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function checkWindowCoverage({ events, prices, benchmarkName, windows, canCalculate }) {
  if (!canCalculate) {
    return fail("window-coverage", "事件窗資料覆蓋", "請先修正資料來源、欄位、事件來源與基準指數問題。");
  }

  try {
    calculateEventStudy(events, prices, { benchmarkName, windows });
    return pass("window-coverage", "事件窗資料覆蓋", `所有事件可計算 ${windows.map((window) => `T+${window}`).join("、")}。`);
  } catch (error) {
    return fail("window-coverage", "事件窗資料覆蓋", userSafeDetail(error));
  }
}

function pass(id, label, detail) {
  return { id, label, status: "pass", detail };
}

function fail(id, label, detail) {
  return { id, label, status: "fail", detail };
}

function userSafeDetail(error) {
  if (error instanceof Error && error.message) return error.message;
  return "事件窗資料不足，無法完成研究計算。";
}
