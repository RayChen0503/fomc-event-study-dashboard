import test from "node:test";
import assert from "node:assert/strict";

import { buildCombinedMetadata } from "../src/metadata.js";

test("marks fully demo data as demo with separate source warnings", () => {
  const metadata = buildCombinedMetadata({
    events: { source: "Synthetic events", retrievedAt: "2026-06-22T20:00:00+08:00", isDemo: true },
    prices: { source: "Synthetic prices", retrievedAt: "2026-06-22T20:00:00+08:00", isDemo: true }
  });

  assert.equal(metadata.label, "Synthetic demo dataset for UI and calculation testing");
  assert.equal(metadata.isDemo, true);
  assert.match(metadata.source, /FOMC events: Synthetic events/);
  assert.match(metadata.source, /Taiwan sector prices: Synthetic prices/);
  assert.match(metadata.warnings.join(" "), /FOMC 事件資料仍使用示範資料/);
  assert.match(metadata.warnings.join(" "), /產業指數價格資料仍使用示範資料/);
});

test("keeps mixed imported and demo data from being labeled as official research data", () => {
  const metadata = buildCombinedMetadata({
    events: { source: "FOMC events CSV: fomc.csv", retrievedAt: "2026-06-22 21:30", isDemo: false },
    prices: { source: "Synthetic prices", retrievedAt: "2026-06-22T20:00:00+08:00", isDemo: true }
  });

  assert.equal(metadata.label, "Mixed imported and demo dataset");
  assert.equal(metadata.isDemo, true);
  assert.match(metadata.warnings.join(" "), /混合資料狀態/);
});

test("marks data as user-imported only when both required datasets are imported", () => {
  const metadata = buildCombinedMetadata({
    events: { source: "FOMC events CSV: fomc.csv", retrievedAt: "2026-06-22 21:30", isDemo: false },
    prices: { source: "Taiwan sector index prices CSV: prices.csv", retrievedAt: "2026-06-22 21:31", isDemo: false }
  });

  assert.equal(metadata.label, "User-imported dataset");
  assert.equal(metadata.isDemo, false);
  assert.equal(metadata.warnings.length, 0);
});
