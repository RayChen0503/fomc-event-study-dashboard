# Deployment Checklist

This site is static and can be deployed to GitHub Pages, Netlify, Vercel static hosting, or any ordinary static file server. It does not need a backend for the current feature set.

## Before Publishing

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run qa
npm.cmd run build
npm.cmd test
```

Publish only after all commands exit successfully.

## GitHub Pages Option A: Publish `fomc-tool/`

Use this option if the repository contains the broader paper project.

1. Keep the dashboard inside `fomc-tool/`.
2. In GitHub Pages settings, publish from a branch and set the site root to the folder that contains `index.html`, if the repository setup supports it.
3. Confirm `.nojekyll` remains in the published folder.

## GitHub Pages Option B: Repository Root

Use this option if the repository is only for the dashboard.

1. Copy the contents of `fomc-tool/` to the repository root.
2. Keep `src/`, `scripts/`, `tests/`, `docs/`, `index.html`, `styles.css`, `package.json`, `README.md`, and `.nojekyll`.
3. Publish from the repository root.

## Security Rules

- Do not add API keys, tokens, secrets, or private credentials to frontend files.
- Do not make the demo dataset look official.
- Do not remove the non-investment-advice disclosure.
- If live third-party APIs are added later, proxy them through a backend and add timeout, rate-limit, loading, empty, and error states.

## Post-Deploy Checks

- Open the deployed URL and confirm the dashboard loads without console-visible user errors.
- Confirm CSV import still works in the browser.
- Confirm exported CSV includes a UTF-8 BOM so Chinese labels open correctly in spreadsheet software.
- Run the manual visual QA checklist in `docs/manual-visual-qa.md`.
