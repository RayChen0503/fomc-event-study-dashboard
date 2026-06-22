const SORTERS = {
  date_asc: (a, b) => compareText(a.event_date, b.event_date) || compareText(a.index_name, b.index_name),
  abs_excess_desc: (a, b) => Math.abs(numberOrZero(b.excess_return)) - Math.abs(numberOrZero(a.excess_return))
    || compareText(a.event_date, b.event_date),
  excess_desc: (a, b) => numberOrZero(b.excess_return) - numberOrZero(a.excess_return)
    || compareText(a.event_date, b.event_date),
  excess_asc: (a, b) => numberOrZero(a.excess_return) - numberOrZero(b.excess_return)
    || compareText(a.event_date, b.event_date),
  sector_asc: (a, b) => compareText(a.index_name, b.index_name) || compareText(a.event_date, b.event_date)
};

export function sortEventRows(rows = [], sortKey = "date_asc") {
  const sorter = SORTERS[sortKey] || SORTERS.date_asc;
  return [...rows].sort(sorter);
}

export function sourceSummary(row = {}) {
  const eventSource = row.event_source || row.source || "";
  const priceSource = row.price_source || "";
  const eventLabel = sourceLabel(eventSource, "Fed");
  const priceLabel = sourceLabel(priceSource, "TWSE");

  if (!eventSource || !priceSource) {
    return {
      label: "來源待確認",
      title: "缺少事件來源或價格來源，正式引用前需補齊。"
    };
  }

  return {
    label: `${eventLabel} / ${priceLabel}`,
    title: `事件來源：${eventSource}\n價格來源：${priceSource}`
  };
}

function sourceLabel(value, fallback) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (host.includes("federalreserve.gov")) return "Fed";
    if (host.includes("twse.com.tw")) return "TWSE";
    return host;
  } catch {
    return fallback;
  }
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "zh-Hant");
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
