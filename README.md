# SmartScan Pro

SmartScan Pro is a mobile-first barcode intelligence and inventory progressive web app. It combines fast scanning, safe result handling, product information, batch inventory workflows, local-first storage, and business reporting in one independent implementation.

> Status: commercial MVP foundation. The local-first scanner and inventory workflows are functional. Cloud accounts, team sync, billing, production price feeds, and native app-store packages remain launch work and are tracked in the roadmap.

## What works now

- Camera scanning for QR, UPC, EAN, Code 39, Code 93, Code 128, ITF, Codabar, Data Matrix, Aztec, and PDF417 where the device supports them.
- Scan from an image file.
- Flashlight and camera zoom controls when supported by the phone.
- Normal scan and rapid batch-counting modes.
- Safe result classification for URLs, email, phone, Wi-Fi, locations, and plain text.
- Product lookup adapter for Open Food Facts API v3, with a manual fallback.
- Food summary with Nutri-Score and allergen information when supplied by the data provider.
- Offline inventory with quantity, minimum stock, unit cost, location, expiration, notes, and total value.
- Low-stock and expiration warnings.
- Search, filters, scan history, activity audit trail, CSV export, and JSON backup/restore.
- Installable PWA shell with offline caching.
- No runtime dependencies, advertisements, trackers, or API keys.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm run verify
npm run dev
```

Open `http://localhost:4173`. Camera access requires HTTPS in production; `localhost` is accepted by modern browsers for development.

## Automated verification and beta deployment

- `.github/workflows/ci.yml` runs the complete verification suite for pull requests and every update to `main`.
- `.github/workflows/pages.yml` verifies, packages, and deploys only the production app shell to GitHub Pages.
- The deployment artifact is built in `dist/`; tests, product documents, and development scripts are excluded.
- GitHub Pages must use **GitHub Actions** as its publishing source under **Settings → Pages**.

After Pages is enabled and the deployment workflow succeeds, the beta is available at:

`https://taqueriaelreloj-bit.github.io/smartscan-barcode-app/`

## Product strategy

The product direction comes from a feature-level study of five visible market references, without copying their code, branding, text, or visual assets:

- Gamma Play QR & Barcode Scanner: instant scan, wide format support, batch mode, and code generation.
- TeaCapps QR & Barcode Scanner: minimal permissions, safe actions, image scanning, custom searches, annotations, and CSV history.
- ShopSavvy: price comparison, price history, alerts, and offline scan queueing.
- Yuka: understandable product scoring, ingredient detail, alternatives, preferences, history, and offline access.
- Orca Scan: configurable inventory, locations, labels, audit history, offline work, exports, integrations, and team workflows.

See [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) and [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md).

## Architecture

```text
index.html
src/
  app.js              UI orchestration and workflows
  scanner.js          Camera, image, torch, zoom, format detection
  inventory.js        Pure inventory and reporting domain logic
  product-catalog.js  Product-data provider adapter
  result-actions.js   Result classification and URL risk checks
  storage.js          Versioned local persistence and audit history
tests/                 Node built-in test suite
sw.js                  Offline application shell
```

The domain modules are deliberately separated from browser and vendor APIs so a cloud backend, native wrapper, alternate scan engine, price provider, or business integration can be added without rewriting inventory logic.

## Data and commercial-use notes

SmartScan Pro can query Open Food Facts for optional food metadata. Open Food Facts recommends API v3 for new integrations and publishes its database under the Open Database License. Before public launch, complete its usage declaration, attribution, share-alike review, rate-limit plan, and terms review. Product information can be incomplete and must not be presented as medical advice.

Do not market the current codename until a trademark and app-store name search is complete. A production launch also needs a privacy policy, terms, support process, security review, analytics consent design, billing, account deletion, cloud backups, and store compliance.

## Repository policy

No license has been selected yet. Until the owner chooses one, the code remains all rights reserved by default.
