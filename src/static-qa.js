export function runStaticQa({ html = "", css = "", scripts = [] } = {}) {
  const failures = [];
  const allScripts = Array.isArray(scripts) ? scripts.join("\n") : String(scripts || "");

  requireSignal(failures, /<html[^>]+lang=["']zh-Hant["']/i.test(html), "HTML must declare lang=\"zh-Hant\".");
  requireSignal(failures, /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html), "HTML must include viewport metadata.");
  requireSignal(failures, html.includes("非投資建議"), "Dashboard must include 非投資建議 disclosure.");
  requireSignal(failures, html.includes("不保證任何報酬"), "Dashboard must disclose that returns are not guaranteed.");
  requireSignal(failures, html.includes("研究流程"), "Dashboard must include a research workflow section.");
  requireSignal(failures, html.includes("下一步"), "Dashboard must include a next-step signal.");
  requireSignal(failures, html.includes("載入官方資料集"), "Dashboard must include an official dataset loading action.");
  requireSignal(failures, html.includes("分析摘要"), "Dashboard must include an analysis summary section.");
  requireSignal(failures, html.includes("目前視角"), "Dashboard must include an active-view label.");
  requireSignal(failures, html.includes("主要發現"), "Dashboard must include a key finding narrative.");
  requireSignal(failures, html.includes("圖例"), "Dashboard must include chart legend guidance.");
  requireSignal(failures, html.includes("計算口徑"), "Dashboard must include chart calculation notes.");
  requireSignal(failures, html.includes("排序依據"), "Dashboard must include a table sort control.");
  requireSignal(failures, html.includes("<th>來源</th>"), "Event table must include a source column.");
  requireSignal(failures, /id=["']dataStatus["'][^>]+aria-live=["']polite["']/i.test(html), "Data status must use aria-live=\"polite\".");
  requireSignal(failures, /id=["']readinessList["'][^>]+aria-live=["']polite["']/i.test(html), "Research readiness list must use aria-live=\"polite\".");
  requireSignal(failures, /<svg[^>]+role=["']img["'][^>]+aria-label=/i.test(html), "Charts must expose image role and aria-label.");
  requireSignal(failures, /@media\s*\(\s*max-width:\s*820px\s*\)/i.test(css), "CSS must include a mobile media query at max-width 820px.");
  requireSignal(failures, !/letter-spacing\s*:\s*-\d/i.test(css), "CSS must not use negative letter-spacing.");
  requireSignal(failures, !/\son[a-z]+\s*=/i.test(html), "HTML must not include inline event handler attributes.");
  requireSignal(failures, !/console\.log|debugger/i.test(allScripts), "Frontend scripts must not include debug logging or debugger statements.");

  return {
    ok: failures.length === 0,
    failures
  };
}

function requireSignal(failures, condition, message) {
  if (!condition) failures.push(message);
}
