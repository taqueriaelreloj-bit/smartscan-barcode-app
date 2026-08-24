# ProServices app editions

The project uses one shared scanning core and ships two separate Google Play products.

## QR & Barcode Scanner — $0.99
Package: `com.proservices.qrbarcodescanner`

Focused edition for fast QR/barcode scanning. Includes scanning, opening detected links, copy/share actions, and basic local history. Inventory, sales/POS, stock management, asset/tool tracking, and CSV business exports are excluded.

## Barcode Inventory & POS — $4.99
Package: `com.proservices.barcodeinventory`

Professional edition. Includes the scanner features plus inventory, stock, sales/POS, totals, asset/tool tracking, and CSV export.

## Architecture rule

Do not fork the scanner engine. Both products must reuse the same scanner, result parsing, product lookup, storage primitives, tests, and security/privacy fixes. Edition-specific UI and capabilities are selected at build time. This keeps bug fixes synchronized while allowing independent Play Store listings, pricing, package IDs, analytics, and release schedules.

## Commercial rule

Prices are initial market-test prices, not permanent branding or pricing commitments. Measure paid installs, refunds, retention, and feature usage before investing in permanent branding or adding subscriptions.
