export const sampleMetadata = {
  label: "Synthetic demo dataset for UI and calculation testing",
  source: "Researcher-created sample data; not official Federal Reserve or TWSE data",
  retrievedAt: "2026-06-22T20:00:00+08:00",
  isDemo: true,
  warnings: [
    "此資料集為介面與計算流程示範，不得放入正式研究結論。",
    "正式研究需匯入 Federal Reserve FOMC 與臺灣證券交易所官方資料。"
  ]
};

export const sampleEvents = [
  { event_id: "E001", event_date: "2022-03-16", decision_type: "hike", rate_change_bp: 25, rate_change: 0.25, policy_tone: "hawkish", source: "Synthetic sample" },
  { event_id: "E002", event_date: "2022-05-04", decision_type: "hike", rate_change_bp: 50, rate_change: 0.50, policy_tone: "hawkish", source: "Synthetic sample" },
  { event_id: "E003", event_date: "2023-09-20", decision_type: "hold", rate_change_bp: 0, rate_change: 0, policy_tone: "higher-for-longer", source: "Synthetic sample" },
  { event_id: "E004", event_date: "2024-09-18", decision_type: "cut", rate_change_bp: -25, rate_change: -0.25, policy_tone: "dovish", source: "Synthetic sample" }
];

const dates = [
  "2022-03-15", "2022-03-16", "2022-03-17", "2022-03-18", "2022-03-21", "2022-03-22", "2022-03-23", "2022-03-24", "2022-03-25", "2022-03-28", "2022-03-29",
  "2022-05-03", "2022-05-04", "2022-05-05", "2022-05-06", "2022-05-09", "2022-05-10", "2022-05-11", "2022-05-12", "2022-05-13", "2022-05-16", "2022-05-17",
  "2023-09-19", "2023-09-20", "2023-09-21", "2023-09-22", "2023-09-25", "2023-09-26", "2023-09-27", "2023-09-28", "2023-09-29", "2023-10-02", "2023-10-03",
  "2024-09-17", "2024-09-18", "2024-09-19", "2024-09-20", "2024-09-23", "2024-09-24", "2024-09-25", "2024-09-26", "2024-09-27", "2024-09-30", "2024-10-01"
];

const series = {
  TAIEX: [100, 101, 102, 101, 99, 100, 101, 103, 102, 104, 105, 106, 105, 102, 101, 99, 98, 100, 101, 102, 103, 104, 108, 109, 106, 107, 108, 107, 109, 110, 109, 111, 112, 114, 113, 116, 118, 119, 118, 120, 121, 120, 122, 123],
  Electronics: [200, 202, 210, 208, 202, 204, 207, 211, 209, 213, 216, 220, 218, 210, 206, 198, 196, 202, 205, 209, 211, 214, 230, 232, 224, 226, 229, 227, 234, 236, 233, 239, 243, 250, 248, 257, 262, 265, 263, 268, 272, 270, 276, 280],
  Financials: [80, 81, 82, 81, 80, 81, 82, 83, 84, 84, 85, 86, 86, 85, 84, 82, 81, 82, 83, 84, 85, 85, 88, 89, 88, 89, 90, 89, 90, 91, 90, 91, 92, 94, 94, 96, 97, 98, 97, 99, 100, 99, 101, 102],
  Shipping: [60, 61, 59, 58, 56, 55, 56, 57, 56, 58, 59, 62, 61, 58, 56, 54, 53, 55, 56, 57, 58, 59, 65, 64, 61, 60, 62, 61, 63, 64, 62, 64, 65, 67, 66, 68, 70, 71, 70, 72, 73, 72, 74, 75],
  Construction: [50, 50.5, 50.8, 50.2, 49.5, 49.8, 50.1, 50.4, 50.2, 50.8, 51, 51.5, 51.4, 50.1, 49.4, 48.7, 48.1, 48.8, 49.1, 49.6, 50, 50.2, 52, 52.3, 51.6, 51.9, 52.1, 51.8, 52.5, 52.8, 52.4, 53, 53.4, 54, 53.9, 54.8, 55.3, 55.6, 55.1, 55.9, 56.4, 56.1, 56.8, 57.2]
};

export const samplePrices = Object.entries(series).flatMap(([indexName, closes]) => (
  dates.map((date, index) => ({
    date,
    index_name: indexName,
    close: closes[index],
    source: "Synthetic sample"
  }))
));
