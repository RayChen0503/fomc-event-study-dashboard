# Manual Visual QA

Use this checklist after running the automated checks. Browser automation for the local in-app tab is blocked by environment policy, so these checks must be performed in the visible browser.

## Desktop

Open `http://127.0.0.1:65260/`.

- The first screen shows the dashboard title, data status, main actions, research settings, and KPI cards.
- The first screen also shows `研究工作台`, `下一步`, and a visible `載入官方資料集` action.
- The left controls read as a guided `研究流程`, not only loose filters.
- The data status banner clearly says whether the dataset is demo, mixed, or user-imported.
- The research-readiness panel appears below the source disclosure and shows pass or pending states.
- Charts are visible and not blank. When filters remove all rows, the chart area shows an empty-state message.
- The event table scrolls horizontally if needed and does not overlap nearby panels.
- No stack traces, local file paths, debug messages, API keys, or secrets are visible.
- Risk text says the tool is not investment advice and does not guarantee returns.

## Mobile

Use browser developer tools or resize the window below 820px width.

- Header actions stack vertically and stay tappable.
- The controls panel is no longer sticky and appears above the content.
- KPI cards, charts, ranking rows, and readiness items stack into one column.
- Long source text wraps inside its container without horizontal page overflow.
- The table may scroll horizontally inside its own frame, but the whole page should not require sideways scrolling.

## Data States

- Demo data: readiness summary must say the data is not ready for formal conclusions.
- Official dataset button: clicking `載入官方資料集` should load Fed/TWSE generated CSV files and update the readiness summary.
- One CSV imported: readiness summary must remain blocked because the dataset is mixed.
- Both CSV files imported with valid sources and sufficient event-window coverage: readiness summary may pass.
