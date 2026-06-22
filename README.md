# FOMC Event Study Dashboard

This static web tool supports a high-school finance research paper about:

> 美國利率政策對臺灣股市產業類股之影響：以 FOMC 決策事件與產業指數回撤為例

The dashboard calculates event-window returns, benchmark-relative excess returns, sector sensitivity rankings, and maximum drawdown. It is designed as a research tool, not an investment-advice product.

## Current Data Status

The bundled dataset is synthetic demo data for interface and calculation testing only. It must not be used as official market evidence or written into the paper as a research result.

Before drawing conclusions, import verifiable data from sources such as:

- Federal Reserve FOMC meeting calendars and statements
- Taiwan Stock Exchange market and sector index data
- Central Bank of the Republic of China or FSC statistics for macro-financial context

The dashboard treats the FOMC event CSV and Taiwan sector index CSV as two separate sources. If only one file is imported, the site labels the analysis as mixed imported and demo data, and it must not be used as formal research evidence.

Official-source notes are in `docs/official-data-sources.md`. Empty formal templates are provided at:

- `data/fomc_events_official_template.csv`
- `data/twse_sector_prices_official_template.csv`

The first official-source generated dataset is provided at:

- `data/fomc_events_2022_2024_official.csv`
- `data/generated/twse_sector_prices_2022_2024_official.csv`
- `data/generated/fomc_event_returns_2022_2024_official.csv`
- `data/generated/sector_sensitivity_2022_2024_official.csv`
- `data/generated/official_dataset_metadata.json`

The research-readiness gate blocks formal use until:

- Both required CSV files are imported by the user.
- Each FOMC event has a source label.
- Each FOMC event has `rate_change_bp`.
- `decision_type` is one of `hike`, `hold`, or `cut`.
- The Taiwan price dataset includes `TAIEX` as the benchmark.
- Each Taiwan index price row has a source label.
- Every selected event has enough trading days for the configured event windows.

Primary user flow:

1. Open the dashboard.
2. Click `載入官方資料集`.
3. Confirm `研究可用性檢核` passes.
4. Adjust event window, decision type, or sector filters.
5. Export the event-return table for the paper's analysis section.

Manual CSV import remains available as a backup path for revised datasets.

## CSV Data Contract

### FOMC Events CSV

Required columns:

```csv
event_id,event_date,decision_type,rate_change_bp,policy_tone,target_rate_lower,target_rate_upper,source
```

Rules:

- `event_date` uses `YYYY-MM-DD`.
- `decision_type` should be `hike`, `hold`, or `cut`.
- `rate_change_bp` is basis points, such as `25`, `0`, or `-25`.
- `policy_tone` is a research classification written by the researcher.
- `target_rate_lower` and `target_rate_upper` describe the post-meeting target range.
- `source` should identify the official Federal Reserve page, statement, or document.

### Taiwan Sector Index Prices CSV

Required columns:

```csv
date,index_name,close,source
```

Rules:

- `date` uses `YYYY-MM-DD`.
- `index_name` must include the benchmark index `TAIEX`.
- `close` must be a positive number.
- `source` should identify the official TWSE page, report, or downloaded CSV.
- Every selected sector needs enough trading days before and after each event window.

## Method

FOMC statements are usually released after the Taiwan stock market closes. The tool therefore defines the Taiwan market reaction day as the first Taiwan trading day after the FOMC event date.

Calculations:

- Event-window return = selected future close / previous trading-day close - 1
- Excess return = sector event-window return - TAIEX event-window return
- Maximum drawdown = lowest close / prior running peak - 1

## Local Development

Run tests:

```powershell
node --test
```

Run static checks:

```powershell
node scripts/check-site.mjs
```

Run local QA checks:

```powershell
node scripts/qa-site.mjs
```

Regenerate official TWSE-derived datasets:

```powershell
npm.cmd run build:data
```

Run all project scripts on Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run qa
npm.cmd run build
npm.cmd test
```

Serve locally:

```powershell
python -m http.server 65260
```

Then open:

```text
http://127.0.0.1:65260/
```

## Deployment

This is a static site. It can be deployed to GitHub Pages by publishing the `fomc-tool/` folder as the site root or copying its contents to the repository root.

GitHub Pages does not run Python on the server, so all analysis logic is implemented in browser-side JavaScript. No API key, token, or secret should be placed in this frontend.

See `docs/deployment.md` for a safe GitHub Pages checklist. See `docs/manual-visual-qa.md` for the manual desktop and mobile checks that remain necessary because local in-app browser automation is blocked in this environment.

## Safety And Compliance Notes

- This tool does not provide personal financial advice.
- It does not guarantee returns or recommend buying or selling securities.
- Demo numbers are clearly labeled and are not official financial data.
- Imported data stays in the browser during normal use; no backend upload is implemented.
- User-facing errors avoid stack traces, local file paths, and technical internals.
