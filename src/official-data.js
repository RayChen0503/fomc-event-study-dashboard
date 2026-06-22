import { alignToTaiwanReactionDate } from "./analysis.js";

export const DEFAULT_SECTOR_MAP = {
  "電子工業類指數": "Electronics",
  "電子類指數": "Electronics",
  "金融保險類指數": "Financials",
  "航運類指數": "Shipping",
  "建材營造類指數": "Construction"
};

export function twseRocDateToIso(value) {
  const match = String(value || "").trim().match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]) + 1911;
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTwseTaiexRows(payload, source) {
  const rows = payload?.data || [];
  return rows.map((row) => ({
    date: twseRocDateToIso(row[0]),
    index_name: "TAIEX",
    close: parseNumber(row[4]),
    source
  })).filter((row) => row.date && Number.isFinite(row.close));
}

export function parseTwseIndustryRows(payload, date, sectorMap = DEFAULT_SECTOR_MAP, source) {
  const table = (payload?.tables || []).find((item) => Array.isArray(item.data));
  const rows = table?.data || [];
  return rows
    .filter((row) => Object.hasOwn(sectorMap, row[0]))
    .map((row) => ({
      date,
      index_name: sectorMap[row[0]],
      close: parseNumber(row[1]),
      source
    }))
    .filter((row) => Number.isFinite(row.close));
}

export function deriveRequiredTaiwanDates(events, tradeDates, windows) {
  const sortedTradeDates = [...new Set(tradeDates)].sort();
  const required = new Set();
  events.forEach((event) => {
    const reactionDate = alignToTaiwanReactionDate(event.event_date, sortedTradeDates);
    const reactionIndex = sortedTradeDates.indexOf(reactionDate);
    const startIndex = reactionIndex - 1;
    const endIndex = reactionIndex + Math.max(...windows) - 1;
    for (let index = startIndex; index <= endIndex; index += 1) {
      required.add(sortedTradeDates[index]);
    }
  });
  return [...required].filter(Boolean).sort();
}

export function csvFromRows(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))
  ].join("\n");
}

export function summarizeEventReturns(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${row.window}|${row.decision_type}|${row.index_name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.values()].map((group) => {
    const first = group[0];
    const returns = group.map((row) => Number(row.return_rate));
    const excessReturns = group.map((row) => Number(row.excess_return));
    return {
      window: Number(first.window),
      decision_type: first.decision_type,
      index_name: first.index_name,
      event_count: group.length,
      avg_return: round(mean(returns)),
      avg_excess_return: round(mean(excessReturns)),
      avg_abs_excess_return: round(mean(excessReturns.map(Math.abs))),
      min_excess_return: round(Math.min(...excessReturns)),
      max_excess_return: round(Math.max(...excessReturns))
    };
  }).sort((a, b) => (
    a.window - b.window ||
    a.decision_type.localeCompare(b.decision_type) ||
    a.index_name.localeCompare(b.index_name)
  ));
}

function parseNumber(value) {
  return Number(String(value || "").replaceAll(",", "").trim());
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Number(value.toFixed(12));
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
