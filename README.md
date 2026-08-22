# SmartScan Pro

SmartScan Pro is a mobile-first barcode intelligence, inventory, serialized-tool tracking, and sales application. It combines fast scanning, safe result handling, product information, local-first business records, exports, and point-of-sale workflows in one independent implementation.

> Status: **Android 0.4.0 release candidate.** The native Android package targets API 36 under `com.smartscanpro.app`. Release builds, SmartScan launcher branding, privacy/support/terms pages, Google Play release documentation, and upload-key signing are prepared. Cloud accounts, multi-device team sync, online billing, and production price feeds remain future product work rather than blockers for the local-first 0.4.0 release.

## What works now

- Camera scanning for QR, UPC, EAN, Code 39, Code 93, Code 128, ITF, Codabar, Data Matrix, Aztec, and PDF417 where the device supports them.
- Scan from an image file.
- USB and Bluetooth keyboard-wedge scanner input, including alphanumeric internal asset labels.
- Flashlight and camera zoom controls when supported by the phone.
- Normal scan and rapid batch-counting modes.
- Safe result classification for URLs, email, phone, Wi-Fi, locations, and plain text.
- Product lookup adapter for Open Food Facts API v3, with a manual fallback.
- Food summary with Nutri-Score and allergen information when supplied by the data provider.
- Offline inventory with quantity, minimum stock, unit cost, selling price, location, expiration, notes, and total value.
- Serialized tool and asset records with condition, responsible person, job site, due date, checkout, return, maintenance, missing, and overdue states.
- Low-stock and expiration warnings.
- Sales/POS workflow with cart, tax, discount, payment-method label, stock updates, daily/monthly totals, profit summary, and printable receipt.
- Search, filters, scan history, activity audit trail, CSV export, and JSON backup/restore.
- Installable PWA shell with offline caching and a controlled update prompt that protects in-progress field work.
- Native Android packaging through Capacitor 8 with API 36 target/compile SDK.
- Public Privacy Policy, Support, and Terms of Use pages included in the production shell.
- No advertising SDK or developer-controlled behavioral analytics in version 0.4.0.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm run verify
npm run dev
```

Open `http://localhost:4173`. Camera access requires HTTPS in production; `localhost` is accepted by modern browsers for development.

## Automated verification and deployment

- `.github/workflows/ci.yml` runs the complete verification suite for pull requests and updates to `main`.
- `.github/workflows/pages.yml` verifies, packages, and deploys the production web shell to GitHub Pages.
- `.github/workflows/generate-android-native.yml` builds and validates Android Debug and Release bundles, targets API 36, and publishes the clean generated native project to `android-native-v0.4`.
- `.github/workflows/build-signed-android.yml` is the protected signed-release pipeline and expects the SmartScan upload key through GitHub Actions Secrets.
- The web deployment artifact is built in `dist/`; tests, product documents, and development scripts are excluded.
- GitHub Pages must use **GitHub Actions** as its publishing source under **Settings → Pages**.

After Pages is enabled and the deployment workflow succeeds, the public app/support base is:

`https://taqueriaelreloj-bit.github.io/smartscan-barcode-app/`

## Android release

Current release target:

- Application ID: `com.smartscanpro.app`
- Version name: `0.4.0`
- Version code: `4`
- Minimum SDK: `24`
- Compile SDK: `36`
- Target SDK: `36`
- Signing: dedicated SmartScan Pro upload key; private key material is not stored in the repository.

See [docs/PLAY_STORE_RELEASE.md](docs/PLAY_STORE_RELEASE.md) and [docs/RELEASE_NOTES_0.4.0.md](docs/RELEASE_NOTES_0.4.0.md) before uploading a release to Google Play.

## Product strategy

The product direction comes from a feature-level study of visible market references, without copying their code, branding, text, or visual assets:

- Gamma Play QR & Barcode Scanner: instant scan, wide format support, batch mode, and code generation.
- TeaCapps QR & Barcode Scanner: minimal permissions, safe actions, image scanning, custom searches, annotations, and CSV history.
- ShopSavvy: price comparison, price history, alerts, and offline scan queueing.
- Yuka: understandable product scoring, ingredient detail, alternatives, preferences, history, and offline access.
- Orca Scan: configurable inventory, locations, labels, audit history, offline work, exports, integrations, and team workflows.

See [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) and [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md).

## Architecture

```text
index.html
sales.html
privacy.html
support.html
terms.html
src/
  app.js              UI orchestration and workflows
  hardware-scanner.js USB/Bluetooth keyboard-wedge capture
  scanner.js          Camera, image, torch, zoom, format detection
  inventory.js        Pure inventory and reporting domain logic
  product-catalog.js  Product-data provider adapter
  result-actions.js   Result classification and URL risk checks
  storage.js          Versioned local persistence and audit history
  sales.js            Sales domain logic and summaries
  sales-page.js       POS screen orchestration
tests/                 Node built-in test suite
sw.js                  Offline application shell
```

The domain modules are deliberately separated from browser and vendor APIs so a cloud backend, native scan engine, alternate product provider, online pricing service, or business integration can be added without rewriting the core inventory and sales logic.

## Data and commercial-use notes

SmartScan Pro can query Open Food Facts for optional product metadata. Product information can be incomplete and must not be presented as medical advice. Operational business records are primarily stored on the user's device in version 0.4.0; users should export backups before clearing app data, uninstalling, or replacing a device.

Before each public release, verify that the Privacy Policy and Google Play Data Safety answers still match the actual source code. If accounts, cloud sync, analytics, advertising, online payments, additional third-party services, or sensitive permissions are added later, update the disclosures before release.

The repository currently has no open-source license. Unless the owner intentionally chooses a license, the source remains all rights reserved by default.

## Repository policy

Private signing keys, keystore passwords, payment credentials, customer information, and other secrets must never be committed to this repository or posted in public issues.
