# SmartScan Pro — Google Play Release Package

Release target: **0.4.0**  
Android application ID: **com.smartscanpro.app**  
Version code: **4**  
Target/compile SDK: **36 (Android 16)**

## Store listing

**App name**  
SmartScan Pro

**Short description**  
Scan barcodes, track inventory and tools, and record sales from one app.

**Full description**

SmartScan Pro turns your Android phone into a practical barcode, inventory, tool-tracking and sales workspace.

Scan common barcode and QR formats with the camera, enter codes manually, or use compatible USB/Bluetooth keyboard-wedge scanners. Save products and assets locally, track quantities and locations, record tool checkouts and returns, review activity history, and export business data when needed.

For sales, SmartScan Pro can build a cart from scanned inventory, calculate subtotal, discount and tax, record a payment-method label, update stock and create a printable receipt. SmartScan Pro does not process payment cards or bank transactions.

Key capabilities:
- QR and common 1D/2D barcode scanning where supported by the device
- Manual code entry and image-based scanning
- Local inventory with quantity, minimum stock, cost, price, location, expiration and notes
- Serialized tool/asset custody, job-site assignments, due dates, returns and maintenance state
- Low-stock and expiration alerts
- Sales cart, tax, discounts, totals and printable receipts
- Scan history and activity audit trail
- CSV export and JSON backup/restore
- Optional public product lookup through Open Food Facts
- Local-first operation without a required SmartScan account
- No advertising SDK and no developer-controlled behavioral analytics in version 0.4.0

Operational records are primarily stored on the device. Users should create backups before clearing app data, uninstalling the app or replacing a device.

## Category

Recommended primary category: **Business**.  
Alternative: **Productivity**.

## Release notes — 0.4.0

First Android release of SmartScan Pro.

- Barcode and QR camera scanning
- Local inventory and serialized tool tracking
- Sales, tax, discounts, totals and receipts
- CSV export and JSON backup/restore
- Offline/local-first workflows
- Android 16 / API 36 support
- Privacy, support and terms pages included in the app

## Privacy / support URLs

After GitHub Pages deployment succeeds:

- Privacy: `https://taqueriaelreloj-bit.github.io/smartscan-barcode-app/privacy.html`
- Support: `https://taqueriaelreloj-bit.github.io/smartscan-barcode-app/support.html`
- Terms: `https://taqueriaelreloj-bit.github.io/smartscan-barcode-app/terms.html`

Verify all three URLs from a signed build and a normal browser before submitting Play Console.

## Data Safety working declaration for 0.4.0

This section is a release worksheet, not a substitute for answering the current Play Console questionnaire.

Current architecture verified from source:

- No SmartScan account required.
- Inventory, sales, tool assignments and activity records are stored locally on device.
- Camera permission is used for barcode/QR scanning.
- Camera frames are not intentionally uploaded to a developer-controlled server.
- No advertising SDK is included.
- No developer-controlled analytics/behavioral tracking is included.
- Optional product lookup sends a supported numeric barcode value to Open Food Facts over the network.
- Open Food Facts may receive normal network metadata such as IP address under its own practices.
- POS records payment-method labels only; SmartScan Pro does not process card credentials.

Before answering **No data collected/shared**, review the current Google Play definition of collection and third-party service processing. The Open Food Facts request must be handled consistently between Data Safety and the Privacy Policy.

## Permissions

Expected Android permissions for 0.4.0:

- `android.permission.CAMERA` — barcode/QR scanning
- `android.permission.INTERNET` — application web content/product lookup

Do not add location, contacts, microphone, SMS, call-log, storage-all-files or other sensitive permissions unless a release feature actually requires them.

## Content / policy answers to verify

- Ads: **No** for 0.4.0.
- App access: no login required.
- Target audience: business/productivity; not directed to children.
- News app: No.
- Government app: No.
- Financial features: sales record keeping only; not banking, lending, investment or payment processing.
- Health features: No. Product nutrition metadata must not be represented as medical advice.

## Testing before upload

Run these checks on at least two Android devices if available:

1. Fresh install and first launch.
2. Camera permission denied, then granted from Settings.
3. Scan QR, UPC/EAN and at least one additional supported format.
4. Manual code entry.
5. Inventory add/edit/delete and quantity adjustments.
6. Low-stock alert.
7. Serialized tool checkout and return.
8. Create sale, apply tax/discount, complete checkout and confirm stock decrement.
9. Print/share receipt flow.
10. CSV export.
11. JSON backup and restore.
12. Force-close/reopen and verify local persistence.
13. Airplane-mode/offline behavior.
14. Privacy, Support and Terms pages.
15. Open Food Facts lookup with network available and unavailable.
16. Upgrade test from the currently installed field version if applicable.

## Store graphics

Required/prepared separately:

- 512 × 512 Play icon
- 1024 × 500 feature graphic
- Phone screenshots captured from the final installed build; do not use fabricated UI screenshots.

## Signing and Play App Signing

Use **Google Play App Signing** for production. The generated SmartScan Pro keystore is the **upload key**, not a file to publish or commit.

Upload certificate SHA-256 currently recorded in the private signing package:

`7E:51:21:8F:A5:03:6E:01:B5:21:48:FB:C9:2B:87:28:6C:A4:69:C5:45:9A:DE:B7:8B:85:30:AE:DF:76:C4:A9`

Never commit the `.jks`, keystore password or key password.

## Closed testing note

If the Play Console account is a personal account subject to Google's newer production-access testing requirement, complete the required closed test and production-access application before expecting a production rollout. Confirm the exact requirement shown in the account's Play Console because eligibility rules can change.

## Final upload gate

Do not submit production until all are true:

- CI passes.
- Release AAB is signed with the SmartScan upload key.
- AAB signature is verified.
- Version code is 4 and version name is 0.4.0.
- targetSdk is 36.
- Final app icon is present.
- Camera scanning works on a physical phone.
- Store screenshots come from the final build.
- Privacy/Support URLs are public and reachable.
- Data Safety matches actual code behavior.
- Play App Signing is enabled.
