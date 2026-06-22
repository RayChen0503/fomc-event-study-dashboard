const REQUIRED_EVENT_FIELDS = ["event_date", "decision_type", "policy_tone"];
const REQUIRED_PRICE_FIELDS = ["date", "index_name", "close"];
const DEFAULT_WINDOWS = [1, 3, 5, 10];

export function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value ?? "").trim();
  const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const slash = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slash) return `${slash[1]}-${slash[2].padStart(2, "0")}-${slash[3].padStart(2, "0")}`;
  return null;
}

function sortDates(values) {
  return [...new Set(values.map(normalizeDate).filter(Boolean))].sort();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value.replaceAll(",", ""));
  return Number.NaN;
}

function assertUserSafe(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateInputs(events, priceRows) {
  const errors = [];

  if (!Array.isArray(events) || events.length === 0) {
    errors.push("Events data is empty. Import a FOMC event CSV before analysis.");
  }
  if (!Array.isArray(priceRows) || priceRows.length === 0) {
    errors.push("Price data is empty. Import a Taiwan sector index CSV before analysis.");
  }

  events?.forEach((event, index) => {
    REQUIRED_EVENT_FIELDS.forEach((field) => {
      if (!event[field]) errors.push(`Event row ${index + 1} is missing ${field}.`);
    });
    if (event.event_date && !normalizeDate(event.event_date)) {
      errors.push(`Event row ${index + 1} has an invalid event_date.`);
    }
  });

  priceRows?.forEach((row, index) => {
    REQUIRED_PRICE_FIELDS.forEach((field) => {
      if (row[field] == null || row[field] === "") errors.push(`Price row ${index + 1} is missing ${field}.`);
    });
    const close = toNumber(row.close);
    if (!Number.isFinite(close) || close <= 0) {
      errors.push(`Price row ${index + 1} must have a positive close value.`);
    }
    if (row.date && !normalizeDate(row.date)) {
      errors.push(`Price row ${index + 1} has an invalid date.`);
    }
  });

  return { ok: errors.length === 0, errors };
}

export function alignToTaiwanReactionDate(eventDate, tradeDates) {
  const normalizedEventDate = normalizeDate(eventDate);
  assertUserSafe(normalizedEventDate, "Event date is invalid.");

  const eventTime = new Date(`${normalizedEventDate}T00:00:00`).getTime();
  const candidates = sortDates(tradeDates).filter((date) => {
    const time = new Date(`${date}T00:00:00`).getTime();
    return time > eventTime;
  });

  assertUserSafe(candidates.length > 0, `No Taiwan trading day found after ${normalizedEventDate}.`);
  return candidates[0];
}

export function groupPricesByIndex(priceRows) {
  const groups = new Map();
  priceRows.forEach((row) => {
    const indexName = String(row.index_name || "").trim();
    const normalized = {
      date: normalizeDate(row.date),
      index_name: indexName,
      close: toNumber(row.close)
    };
    if (!groups.has(indexName)) groups.set(indexName, []);
    groups.get(indexName).push(normalized);
  });

  groups.forEach((rows) => rows.sort((a, b) => a.date.localeCompare(b.date)));
  return groups;
}

export function calculateWindowReturn(series, eventTradeDate, window) {
  const rows = [...series].sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));
  const normalizedEventDate = normalizeDate(eventTradeDate);
  const eventIndex = rows.findIndex((row) => normalizeDate(row.date) === normalizedEventDate);
  const previousIndex = eventIndex - 1;
  const targetIndex = eventIndex + window - 1;

  assertUserSafe(eventIndex >= 0, `Event trading date ${normalizedEventDate} is not present in price data.`);
  assertUserSafe(previousIndex >= 0, "Not enough price history before the event date.");
  assertUserSafe(targetIndex < rows.length, `Not enough price history for T+${window}.`);

  const previousClose = toNumber(rows[previousIndex].close);
  const targetClose = toNumber(rows[targetIndex].close);
  assertUserSafe(previousClose > 0 && targetClose > 0, "Price data contains non-positive close values.");
  return targetClose / previousClose - 1;
}

export function calculateEventStudy(events, priceRows, options = {}) {
  const windows = options.windows || DEFAULT_WINDOWS;
  const benchmarkName = options.benchmarkName || "TAIEX";
  const validation = validateInputs(events, priceRows);
  assertUserSafe(validation.ok, validation.errors[0] || "Input data is invalid.");

  const groupedPrices = groupPricesByIndex(priceRows);
  assertUserSafe(groupedPrices.has(benchmarkName), `Benchmark index "${benchmarkName}" was not found.`);

  const tradeDates = sortDates(priceRows.map((row) => row.date));
  const benchmarkSeries = groupedPrices.get(benchmarkName);
  const results = [];

  events.forEach((event, eventIndex) => {
    const twEventTradeDate = alignToTaiwanReactionDate(event.event_date, tradeDates);
    const benchmarkReturns = new Map(
      windows.map((window) => [window, calculateWindowReturn(benchmarkSeries, twEventTradeDate, window)])
    );

    groupedPrices.forEach((series, indexName) => {
      windows.forEach((window) => {
        const returnRate = calculateWindowReturn(series, twEventTradeDate, window);
        const benchmarkReturn = benchmarkReturns.get(window);
        results.push({
          event_id: event.event_id || `E${String(eventIndex + 1).padStart(3, "0")}`,
          event_date: normalizeDate(event.event_date),
          tw_event_trade_date: twEventTradeDate,
          decision_type: event.decision_type,
          policy_tone: event.policy_tone,
          rate_change: event.rate_change ?? "",
          index_name: indexName,
          window,
          return_rate: returnRate,
          benchmark_return: benchmarkReturn,
          excess_return: returnRate - benchmarkReturn,
          source: event.source || ""
        });
      });
    });
  });

  return results;
}

export function calculateMaxDrawdown(series) {
  const rows = [...series].sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));
  let peak = -Infinity;
  let maxDrawdown = 0;

  rows.forEach((row) => {
    const close = toNumber(row.close);
    if (!Number.isFinite(close) || close <= 0) return;
    peak = Math.max(peak, close);
    maxDrawdown = Math.min(maxDrawdown, close / peak - 1);
  });

  return maxDrawdown;
}

export function calculateDrawdowns(priceRows) {
  const groupedPrices = groupPricesByIndex(priceRows);
  return [...groupedPrices.entries()]
    .map(([indexName, series]) => ({
      index_name: indexName,
      max_drawdown: calculateMaxDrawdown(series),
      start_date: series[0]?.date || "",
      end_date: series.at(-1)?.date || ""
    }))
    .sort((a, b) => a.max_drawdown - b.max_drawdown);
}

export function summarizeSensitivity(eventReturns, window = 5) {
  const byIndex = new Map();
  eventReturns
    .filter((row) => row.window === window)
    .forEach((row) => {
      if (!byIndex.has(row.index_name)) byIndex.set(row.index_name, []);
      byIndex.get(row.index_name).push(row);
    });

  return [...byIndex.entries()]
    .map(([indexName, rows]) => {
      const avgExcess = rows.reduce((sum, row) => sum + row.excess_return, 0) / rows.length;
      const avgAbsExcess = rows.reduce((sum, row) => sum + Math.abs(row.excess_return), 0) / rows.length;
      return {
        index_name: indexName,
        window,
        event_count: rows.length,
        avg_excess_return: Number(avgExcess.toFixed(12)),
        avg_abs_excess_return: Number(avgAbsExcess.toFixed(12))
      };
    })
    .sort((a, b) => b.avg_abs_excess_return - a.avg_abs_excess_return);
}

export function buildDataStatus(metadata, validation) {
  const warnings = [...(metadata.warnings || [])];
  if (metadata.isDemo) warnings.push("目前使用示範資料，不能作為正式研究結論或投資判斷。");
  if (!validation.ok) warnings.push(...validation.errors);
  return {
    label: metadata.label || "未命名資料集",
    source: metadata.source || "未提供來源",
    retrievedAt: metadata.retrievedAt || "未提供擷取時間",
    generatedAt: new Date().toISOString(),
    isDemo: Boolean(metadata.isDemo),
    ok: validation.ok,
    warnings
  };
}
