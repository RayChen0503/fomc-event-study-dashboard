import test from "node:test";
import assert from "node:assert/strict";

import { runStaticQa } from "../src/static-qa.js";

const validHtml = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FOMC Event Study Dashboard</title>
</head>
<body>
  <section id="dataStatus" aria-live="polite">資料狀態</section>
  <section>研究流程</section>
  <section>下一步</section>
  <button type="button">載入官方資料集</button>
  <button type="button">匯出事件報酬 CSV</button>
  <svg role="img" aria-label="事件後超額報酬長條圖"></svg>
  <section id="readinessList" aria-live="polite">研究可用性檢核</section>
  <p>非投資建議，不保證任何報酬。</p>
  <script type="module" src="./src/app.js"></script>
</body>
</html>`;

const validCss = `
body { letter-spacing: 0; }
.button { border-radius: 8px; }
@media (max-width: 820px) { .dashboard { grid-template-columns: 1fr; } }
`;

test("passes a dashboard with required accessibility and financial disclosure signals", () => {
  const result = runStaticQa({ html: validHtml, css: validCss, scripts: [""] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test("fails when viewport metadata is missing", () => {
  const result = runStaticQa({
    html: validHtml.replace('<meta name="viewport" content="width=device-width, initial-scale=1">', ""),
    css: validCss,
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /viewport/);
});

test("fails when financial risk disclosure is missing", () => {
  const result = runStaticQa({
    html: validHtml.replace("非投資建議，不保證任何報酬。", ""),
    css: validCss,
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /非投資建議/);
});

test("fails when mobile media query is missing", () => {
  const result = runStaticQa({
    html: validHtml,
    css: "body { letter-spacing: 0; }",
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /mobile/);
});

test("fails when guided workflow signals are missing", () => {
  const result = runStaticQa({
    html: validHtml.replace("研究流程", "").replace("下一步", "").replace("載入官方資料集", ""),
    css: validCss,
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /research workflow/);
});

test("fails when inline event handlers are present", () => {
  const result = runStaticQa({
    html: validHtml.replace("<button type=\"button\">", "<button onclick=\"debug()\" type=\"button\">"),
    css: validCss,
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /inline event handler/);
});

test("fails when CSS uses negative letter spacing", () => {
  const result = runStaticQa({
    html: validHtml,
    css: validCss.replace("letter-spacing: 0", "letter-spacing: -0.02em"),
    scripts: [""]
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /negative letter-spacing/);
});
