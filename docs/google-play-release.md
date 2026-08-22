# SmartScan Pro — Google Play release checklist

Version: 0.4.0  
Package: `com.smartscanpro.app`  
Target SDK: 36  
Minimum SDK: 24

## Store listing draft

**App name**  
SmartScan Pro

**Short description**  
Scan barcodes, manage local inventory, track tools, and record sales from one app.

**Full description**  
SmartScan Pro turns your phone into a practical barcode, inventory, tool-tracking, and point-of-sale workspace.

Scan supported barcodes and QR codes with the camera, identify supported food products through Open Food Facts, add or update inventory, track quantities and locations, assign serialized tools to workers and job sites, record returns and maintenance status, and create local sales with tax, discounts, payment-method labels, receipts, daily totals, and profit summaries.

SmartScan Pro is designed around local-first storage. Core inventory, activity, tool, and sales records remain on the device instead of requiring a SmartScan account. Hardware barcode scanners that behave like a keyboard can also be used for fast entry.

Key features:
- Camera barcode and QR scanning
- Manual barcode entry
- Local inventory and stock adjustments
- Product lookup for supported numeric barcodes
- Serialized tool checkout and return tracking
- Worker and job-site assignment fields
- Local POS cart, tax, discount, and receipt workflow
- Daily and monthly sales summaries
- Backup/export workflows
- Offline-capable local-first operation
- No SmartScan account required
- No ads or developer-controlled analytics in v0.4.0

SmartScan Pro does not process payment cards. Payment-method labels are recorded only for local sales tracking.

## App content answers — draft

**Ads:** No.

**App access / login:** No login is required.

**Target audience:** Business/productivity users. Do not select child-directed age groups unless the product strategy changes and Families requirements are reviewed.

**Sensitive permissions:** Camera, used for barcode/QR scanning.

**Location:** Not requested by v0.4.0.

**Payments:** The app records local payment-method labels; it does not process card payments or collect card credentials.

**Account deletion:** Not applicable because v0.4.0 does not create SmartScan user accounts.

## Data Safety — draft for v0.4.0

This must be re-checked in Play Console against the final signed binary and every included SDK.

- Operational inventory, sales, tool assignment, worker/assignee, job-site, and activity records are stored locally and are not intentionally transmitted to a SmartScan-controlled server.
- Camera frames are used for scanning and are not intentionally uploaded to a SmartScan-controlled server.
- Supported numeric barcodes can be sent to Open Food Facts when product lookup is used. The request omits credentials and HTTP referrer information.
- No advertising SDK is included.
- No developer-controlled analytics SDK is included.
- No SmartScan cloud account exists in v0.4.0.
- No precise location, contacts, messages, health data, or financial account credentials are intentionally collected.

Because Google defines Data Safety categories and SDK behavior may change, verify the final declaration against current Play Console definitions before submission.

## Privacy policy

Public path after deployment: `/privacy.html`

The privacy policy must also be entered as a full HTTPS URL in Play Console and remain publicly reachable.

## Testing

1. Internal test first on at least two Android devices if possible.
2. Verify camera permission denial/approval behavior.
3. Scan EAN/UPC, QR, and at least one unsupported code.
4. Test Open Food Facts lookup online and graceful failure offline.
5. Add/edit/delete inventory and restart the app to confirm persistence.
6. Test tool checkout/return and maintenance status.
7. Complete multiple POS sales and verify stock decrement, tax, discount, receipt, daily totals, and local-date behavior.
8. Force-close/reopen during normal use and verify no corrupt state.
9. Test export/backup and restore if included in the release UI.
10. Confirm privacy policy is reachable from the installed app.

For personal Play Console accounts created after November 13, 2023, Google may require a closed test with at least 12 opted-in testers continuously for 14 days before production access.

## Required Play assets still to prepare

- 512 × 512 Play Store app icon
- 1024 × 500 feature graphic
- Phone screenshots showing scanner, inventory, tool tracking, sales, and receipt/summary screens
- Developer support email and, if available, support website
- Content rating questionnaire
- Final countries/regions and pricing choice

## Signing secrets expected by GitHub Actions

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit the keystore or these secret values to the repository.
