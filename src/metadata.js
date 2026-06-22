export function buildCombinedMetadata(sourceState) {
  const events = normalizeSource(sourceState?.events, "FOMC events");
  const prices = normalizeSource(sourceState?.prices, "Taiwan sector index prices");
  const usesDemo = events.isDemo || prices.isDemo;
  const importedCount = [events, prices].filter((item) => !item.isDemo).length;

  const label = usesDemo
    ? importedCount > 0
      ? "Mixed imported and demo dataset"
      : "Synthetic demo dataset for UI and calculation testing"
    : "User-imported dataset";

  return {
    label,
    source: `FOMC events: ${events.source}; Taiwan sector prices: ${prices.source}`,
    retrievedAt: `FOMC events: ${events.retrievedAt}; Taiwan sector prices: ${prices.retrievedAt}`,
    isDemo: usesDemo,
    warnings: [
      ...events.warnings,
      ...prices.warnings,
      events.isDemo ? "FOMC 事件資料仍使用示範資料，不能作為正式研究結論。" : "",
      prices.isDemo ? "產業指數價格資料仍使用示範資料，不能作為正式研究結論。" : "",
      importedCount === 1 ? "目前為混合資料狀態：請同時匯入 FOMC 事件與產業指數 CSV 後，再將結果寫入正式小論文。" : ""
    ].filter(Boolean)
  };
}

function normalizeSource(value, fallbackLabel) {
  return {
    source: value?.source || `${fallbackLabel}: source not provided`,
    retrievedAt: value?.retrievedAt || "not provided",
    isDemo: value?.isDemo !== false,
    warnings: Array.isArray(value?.warnings) ? value.warnings : []
  };
}
