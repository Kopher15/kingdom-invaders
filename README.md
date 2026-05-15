# FCA CVR — Kingdom Invaders (v2)

Campus Volunteer Record portal for **Fellowship of Christian Athletes — Kingdom Invaders**.

> **v2** is the active development line. v1 remains stable on its original GitHub Pages URL.
> Both versions share the same Apps Script backend + Google Sheet, so data is unified.

## Stack
- **Frontend:** Static HTML / CSS / Vanilla JS · GitHub Pages
- **Backend:** Google Apps Script Web App (`Code.gs`)
- **DB:** Google Sheets (10 tabs)
- **Media:** Google Drive (auto-organised Campus → Week → Day folders)

## Pages
`index` (login) · `home` · `calendar` · `players` · `staffing` · `topics` · `gallery` · `profile` · `manage` (admin)

## Sprint history
See [`docs/sprint-log.md`](docs/sprint-log.md).

## Local development
Static files — open `index.html` directly or serve with any static server:

```bash
npx serve .
```

The backend URL is hard-coded in `js/api.js`.

## Deployment
- **Frontend:** push to `main` → GitHub Pages serves at the repo's Pages URL.
- **Backend:** copy `Code.gs` into the Apps Script editor → New version → Deploy.

## Architecture
See [`ARCHITECT.md`](ARCHITECT.md) for the Architect-driven workflow (Claude = Architect, DeepSeek = code engine, Kopher = bridge).

## Spec
See [`spec.md`](spec.md) for current sprint specs.
