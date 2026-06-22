# Official Data Sources

This dashboard should use verifiable official sources before results are written into the paper.

## FOMC Events

Primary source:

- Federal Reserve Board, FOMC meeting calendars and information
- URL: `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm`
- Use for: meeting dates, statements, minutes, implementation notes, and policy decision context.
- Verified in this project on: `2026-06-22`

Required CSV fields:

```csv
event_id,event_date,decision_type,rate_change_bp,policy_tone,target_rate_lower,target_rate_upper,source
```

Field rules:

- `event_date`: policy decision date in `YYYY-MM-DD`.
- `decision_type`: `hike`, `hold`, or `cut`.
- `rate_change_bp`: rate change in basis points, such as `25`, `0`, or `-25`.
- `policy_tone`: researcher classification based on statement language.
- `target_rate_lower` and `target_rate_upper`: target federal funds range after the decision.
- `source`: official statement or calendar URL.

## Taiwan Index Prices

Primary sources:

- TWSE daily market information
- URL: `https://www.twse.com.tw/zh/trading/historical/mi-index.html`
- JSON endpoint used by the local builder: `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=YYYYMMDD&type=IND`
- Use for: sector index close values from daily market reports.

- TWSE TAIEX historical data
- URL: `https://www.twse.com.tw/zh/indices/taiex/mi-5min-hist.html`
- JSON endpoint used by the local builder: `https://www.twse.com.tw/indicesReport/MI_5MINS_HIST?response=json&date=YYYYMM01`
- Use for: TAIEX benchmark close values.

Verified in this project on: `2026-06-22`

Required CSV fields:

```csv
date,index_name,close,source
```

Field rules:

- `date`: Taiwan trading date in `YYYY-MM-DD`.
- `index_name`: use `TAIEX` for the benchmark and clear English labels for sectors.
- `close`: closing index value as a positive number.
- `source`: official TWSE page or downloaded report URL.

## Research Rule

Do not mix demo and official data in the formal paper. The site may calculate with demo data for UI testing, but the research-readiness gate must pass before exported results are used in `肆、研究分析與結果`.

## Generated Dataset

Run:

```powershell
npm.cmd run build:data
```

Current generated files:

- `data/generated/twse_sector_prices_2022_2024_official.csv`: 1,320 rows covering 264 Taiwan trading dates and 5 indexes.
- `data/generated/fomc_event_returns_2022_2024_official.csv`: 480 event-return rows.
- `data/generated/sector_sensitivity_2022_2024_official.csv`: 60 grouped summary rows.
- `data/generated/official_dataset_metadata.json`: generation timestamp, selected windows, sectors, and official sources.
