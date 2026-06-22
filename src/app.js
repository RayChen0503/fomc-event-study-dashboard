import {
  buildDataStatus,
  calculateDrawdowns,
  calculateEventStudy,
  summarizeSensitivity,
  validateInputs
} from "./analysis.js";
import { parseCsv, toCsv } from "./csv.js";
import { assessResearchReadiness } from "./data-quality.js";
import { formatDateTime, formatNumber, formatPercent, formatSignedPercent } from "./format.js";
import { buildCombinedMetadata } from "./metadata.js";
import { sampleEvents, sampleMetadata, samplePrices } from "./sample-data.js";

const state = {
  events: sampleEvents,
  prices: samplePrices,
  sources: demoSources(),
  selectedWindow: 5,
  decisionFilter: "all",
  sectorFilter: "all",
  lastRows: []
};

const elements = {
  dataStatus: document.querySelector("#dataStatus"),
  eventCount: document.querySelector("#eventCount"),
  topSensitive: document.querySelector("#topSensitive"),
  worstDrawdown: document.querySelector("#worstDrawdown"),
  windowSelect: document.querySelector("#windowSelect"),
  decisionFilter: document.querySelector("#decisionFilter"),
  sectorFilter: document.querySelector("#sectorFilter"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  exportButton: document.querySelector("#exportButton"),
  eventsInput: document.querySelector("#eventsInput"),
  pricesInput: document.querySelector("#pricesInput"),
  windowChip: document.querySelector("#windowChip"),
  excessChart: document.querySelector("#excessChart"),
  drawdownChart: document.querySelector("#drawdownChart"),
  rankingList: document.querySelector("#rankingList"),
  eventTableBody: document.querySelector("#eventTableBody"),
  emptyRowTemplate: document.querySelector("#emptyRowTemplate"),
  sourceDetails: document.querySelector("#sourceDetails"),
  messagePanel: document.querySelector("#messagePanel"),
  messages: document.querySelector("#messages"),
  readinessSummary: document.querySelector("#readinessSummary"),
  readinessList: document.querySelector("#readinessList")
};

function visibleRows(rows) {
  return rows.filter((row) => {
    const decisionOk = state.decisionFilter === "all" || row.decision_type === state.decisionFilter;
    const sectorOk = state.sectorFilter === "all" || row.index_name === state.sectorFilter;
    const windowOk = row.window === state.selectedWindow;
    return decisionOk && sectorOk && windowOk;
  });
}

function filteredEvents() {
  if (state.decisionFilter === "all") return state.events;
  return state.events.filter((event) => event.decision_type === state.decisionFilter);
}

function setMessages(messages) {
  elements.messagePanel.hidden = messages.length === 0;
  elements.messages.innerHTML = messages.map((message) => (
    `<div class="message">${escapeHtml(message)}</div>`
  )).join("");
}

function updateStatus(validation) {
  const status = buildDataStatus(buildCombinedMetadata(state.sources), validation);
  elements.dataStatus.classList.toggle("ok", status.ok && !status.isDemo);
  elements.dataStatus.innerHTML = `<strong>資料狀態：</strong><span>${escapeHtml(status.label)}｜來源：${escapeHtml(status.source)}｜擷取時間：${escapeHtml(status.retrievedAt)}｜產生時間：${formatDateTime(new Date(status.generatedAt))}</span>`;
  setMessages(status.warnings);
  renderSourceDetails(status);
}

function renderSourceDetails(status) {
  const pairs = [
    ["資料集", status.label],
    ["來源", status.source],
    ["擷取時間", status.retrievedAt],
    ["示範資料", status.isDemo ? "是，不能作為正式研究結論" : "否"],
    ["更新狀態", status.ok ? "資料欄位通過基本驗證" : "資料尚未通過驗證"]
  ];

  elements.sourceDetails.innerHTML = pairs.map(([label, value]) => (
    `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`
  )).join("");
}

function renderReadiness(readiness) {
  elements.readinessSummary.textContent = readiness.ready ? "可作為研究分析資料" : "尚不可作為正式結論";
  elements.readinessSummary.classList.toggle("ok", readiness.ready);
  elements.readinessSummary.classList.toggle("blocked", !readiness.ready);
  elements.readinessList.innerHTML = readiness.checks.map((check) => (
    `<div class="readiness-item ${escapeAttr(check.status)}">
      <span class="readiness-status">${check.status === "pass" ? "通過" : "待處理"}</span>
      <div>
        <strong>${escapeHtml(check.label)}</strong>
        <p>${escapeHtml(check.detail)}</p>
      </div>
    </div>`
  )).join("");
}

function renderSectorOptions() {
  const sectors = [...new Set(state.prices.map((row) => row.index_name))].sort();
  const current = state.sectorFilter;
  elements.sectorFilter.innerHTML = [
    `<option value="all">全部產業</option>`,
    ...sectors.map((sector) => `<option value="${escapeAttr(sector)}">${escapeHtml(sector)}</option>`)
  ].join("");
  elements.sectorFilter.value = sectors.includes(current) ? current : "all";
  state.sectorFilter = elements.sectorFilter.value;
}

function renderKpis(filteredRows, sensitivity, drawdowns) {
  elements.eventCount.textContent = String(new Set(filteredRows.map((row) => row.event_id)).size);
  const top = sensitivity[0];
  elements.topSensitive.textContent = top ? top.index_name : "—";
  const worst = drawdowns[0];
  elements.worstDrawdown.textContent = worst ? `${worst.index_name} ${formatPercent(worst.max_drawdown)}` : "—";
}

function renderRanking(sensitivity) {
  if (sensitivity.length === 0) {
    elements.rankingList.innerHTML = `<div class="empty-cell">目前沒有可排序資料。</div>`;
    return;
  }

  elements.rankingList.innerHTML = sensitivity.map((item, index) => (
    `<div class="ranking-item">
      <span class="rank-number">${index + 1}</span>
      <div>
        <div class="rank-title">${escapeHtml(item.index_name)}</div>
        <div class="rank-meta">事件數 ${item.event_count}｜平均超額報酬 ${formatSignedPercent(item.avg_excess_return)}</div>
      </div>
      <div class="rank-value">${formatPercent(item.avg_abs_excess_return)}</div>
    </div>`
  )).join("");
}

function renderTable(rows) {
  elements.eventTableBody.innerHTML = "";
  if (rows.length === 0) {
    elements.eventTableBody.appendChild(elements.emptyRowTemplate.content.cloneNode(true));
    return;
  }

  rows
    .slice()
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.index_name.localeCompare(b.index_name))
    .forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.event_date)}</td>
        <td>${escapeHtml(row.tw_event_trade_date)}</td>
        <td>${escapeHtml(decisionLabel(row.decision_type))}</td>
        <td>${escapeHtml(row.index_name)}</td>
        <td>T+${row.window}</td>
        <td class="numeric ${valueClass(row.return_rate)}">${formatSignedPercent(row.return_rate)}</td>
        <td class="numeric ${valueClass(row.benchmark_return)}">${formatSignedPercent(row.benchmark_return)}</td>
        <td class="numeric ${valueClass(row.excess_return)}">${formatSignedPercent(row.excess_return)}</td>
      `;
      elements.eventTableBody.appendChild(tr);
    });
}

function renderBarChart(svg, items, options) {
  const width = 720;
  const barHeight = 32;
  const gap = 14;
  const top = 32;
  const left = 150;
  const right = 60;
  const height = Math.max(260, top * 2 + items.length * (barHeight + gap));
  const zeroX = left + (width - left - right) / 2;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  if (items.length === 0) {
    svg.innerHTML = `
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#687083">目前沒有圖表資料。</text>
    `;
    return;
  }

  const maxAbs = Math.max(...items.map((item) => Math.abs(item.value)), 0.001);
  const scale = (width - left - right) / 2 / maxAbs;

  svg.innerHTML = `
    <line x1="${zeroX}" y1="18" x2="${zeroX}" y2="${height - 20}" stroke="#cfd8e5" />
    ${items.map((item, index) => {
      const y = top + index * (barHeight + gap);
      const x = item.value >= 0 ? zeroX : zeroX + item.value * scale;
      const w = Math.max(2, Math.abs(item.value) * scale);
      const color = item.value >= 0 ? "#1d6f72" : "#a33b3b";
      return `
        <text x="18" y="${y + 21}" font-size="13" fill="#344055">${escapeSvg(item.label)}</text>
        <rect x="${x}" y="${y}" width="${w}" height="${barHeight}" rx="5" fill="${color}" opacity="0.88"></rect>
        <text x="${item.value >= 0 ? x + w + 8 : x - 8}" y="${y + 21}" text-anchor="${item.value >= 0 ? "start" : "end"}" font-size="12" font-weight="700" fill="#172033">${escapeSvg(options.format(item.value))}</text>
      `;
    }).join("")}
  `;
}

function renderCharts(filteredRows, drawdowns) {
  const bySector = aggregateRows(filteredRows);
  renderBarChart(
    elements.excessChart,
    bySector.map((item) => ({ label: item.index_name, value: item.avg_excess_return })),
    { format: formatSignedPercent }
  );
  renderBarChart(
    elements.drawdownChart,
    drawdowns.map((item) => ({ label: item.index_name, value: item.max_drawdown })),
    { format: formatPercent }
  );
}

function aggregateRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.index_name)) groups.set(row.index_name, []);
    groups.get(row.index_name).push(row);
  });

  return [...groups.entries()].map(([indexName, group]) => ({
    index_name: indexName,
    avg_excess_return: group.reduce((sum, row) => sum + row.excess_return, 0) / group.length,
    avg_return: group.reduce((sum, row) => sum + row.return_rate, 0) / group.length
  })).sort((a, b) => Math.abs(b.avg_excess_return) - Math.abs(a.avg_excess_return));
}

function render() {
  const validation = validateInputs(state.events, state.prices);
  updateStatus(validation);
  renderReadiness(assessResearchReadiness({
    events: state.events,
    prices: state.prices,
    sources: state.sources,
    windows: [1, 3, 5, 10]
  }));
  renderSectorOptions();
  elements.windowChip.textContent = `T+${state.selectedWindow}`;

  if (!validation.ok) {
    state.lastRows = [];
    renderKpis([], [], []);
    renderRanking([]);
    renderTable([]);
    renderCharts([], []);
    return;
  }

  let allRows = [];
  try {
    allRows = calculateEventStudy(filteredEvents(), state.prices, { benchmarkName: "TAIEX", windows: [1, 3, 5, 10] });
  } catch (error) {
    setMessages([userSafeError(error)]);
    renderTable([]);
    renderCharts([], []);
    return;
  }

  const rows = visibleRows(allRows);
  const sensitivity = summarizeSensitivity(allRows.filter((row) => (
    state.decisionFilter === "all" || row.decision_type === state.decisionFilter
  )), state.selectedWindow).filter((item) => state.sectorFilter === "all" || item.index_name === state.sectorFilter);
  const drawdowns = calculateDrawdowns(state.prices).filter((item) => state.sectorFilter === "all" || item.index_name === state.sectorFilter);

  state.lastRows = rows;
  renderKpis(rows, sensitivity, drawdowns);
  renderRanking(sensitivity);
  renderTable(rows);
  renderCharts(rows, drawdowns);
}

async function handleFileInput(input, target) {
  const file = input.files?.[0];
  if (!file) return;

  try {
    setMessages([`${target === "events" ? "FOMC 事件" : "產業指數"} CSV 讀取中，請稍候。`]);
    const text = await file.text();
    const rows = parseCsv(text);
    if (target === "events") state.events = rows;
    if (target === "prices") state.prices = rows;
    state.sources[target] = {
      source: `${target === "events" ? "FOMC events" : "Taiwan sector index prices"} CSV: ${file.name}`,
      retrievedAt: formatDateTime(new Date()),
      isDemo: false,
      warnings: ["使用者匯入資料：請確認來源為官方或可驗證資料後再寫入正式研究結論。"]
    };
    render();
  } catch {
    setMessages(["CSV 讀取失敗。請確認檔案為 UTF-8 CSV，且欄位符合 README 的資料格式。"]);
  } finally {
    input.value = "";
  }
}

function exportRows() {
  if (state.lastRows.length === 0) {
    setMessages(["目前沒有可匯出的事件報酬資料。請調整篩選或匯入有效資料。"]);
    return;
  }

  const csv = toCsv(state.lastRows, [
    { label: "event_date", value: (row) => row.event_date },
    { label: "tw_event_trade_date", value: (row) => row.tw_event_trade_date },
    { label: "decision_type", value: (row) => row.decision_type },
    { label: "index_name", value: (row) => row.index_name },
    { label: "window", value: (row) => `T+${row.window}` },
    { label: "return_rate", value: (row) => row.return_rate },
    { label: "benchmark_return", value: (row) => row.benchmark_return },
    { label: "excess_return", value: (row) => row.excess_return },
    { label: "source", value: (row) => row.source }
  ]);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fomc-event-returns-t${state.selectedWindow}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resetDemo() {
  state.events = sampleEvents;
  state.prices = samplePrices;
  state.sources = demoSources();
  state.decisionFilter = "all";
  state.sectorFilter = "all";
  state.selectedWindow = 5;
  elements.windowSelect.value = "5";
  elements.decisionFilter.value = "all";
  render();
}

function decisionLabel(value) {
  return { hike: "升息", hold: "維持", cut: "降息" }[value] || value;
}

function demoSources() {
  return {
    events: {
      source: `${sampleMetadata.source} (FOMC events)`,
      retrievedAt: sampleMetadata.retrievedAt,
      isDemo: true
    },
    prices: {
      source: `${sampleMetadata.source} (Taiwan sector index prices)`,
      retrievedAt: sampleMetadata.retrievedAt,
      isDemo: true
    }
  };
}

function valueClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

function userSafeError(error) {
  if (error instanceof Error && error.message) return error.message;
  return "分析失敗。請確認資料格式、事件日期與交易日資料是否完整。";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function escapeSvg(value) {
  return escapeHtml(value);
}

elements.windowSelect.addEventListener("change", () => {
  state.selectedWindow = Number(elements.windowSelect.value);
  render();
});
elements.decisionFilter.addEventListener("change", () => {
  state.decisionFilter = elements.decisionFilter.value;
  render();
});
elements.sectorFilter.addEventListener("change", () => {
  state.sectorFilter = elements.sectorFilter.value;
  render();
});
elements.resetDemoButton.addEventListener("click", resetDemo);
elements.exportButton.addEventListener("click", exportRows);
elements.eventsInput.addEventListener("change", () => handleFileInput(elements.eventsInput, "events"));
elements.pricesInput.addEventListener("change", () => handleFileInput(elements.pricesInput, "prices"));

render();
