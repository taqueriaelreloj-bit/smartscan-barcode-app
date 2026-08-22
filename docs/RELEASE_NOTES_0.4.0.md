# SmartScan Pro 0.4.0

Android release candidate — August 22, 2026

## What is included

- Native Android packaging through Capacitor 8
- Android application ID `com.smartscanpro.app`
- Android 16 / API 36 target and compile SDK
- SmartScan Pro launcher branding
- Camera permission for barcode/QR scanning
- Local-first inventory and activity persistence
- Serialized tool/asset tracking with checkout, return and maintenance state
- Sales/POS workflow with tax, discounts, totals, stock updates and receipts
- Product lookup adapter for Open Food Facts
- CSV export and JSON backup/restore
- Privacy Policy, Support and Terms of Use pages included in the production app shell
- Release build and signing automation

## Reliability hardening included

- Local-date sales summaries to avoid UTC day-boundary errors
- Scanner concurrency protection
- Storage errors surfaced instead of failing silently
- Inventory quantity validation against invalid numeric values
- Checkout rollback safeguards when inventory persistence fails
- Regression tests for date and inventory edge cases

## Known release boundaries

- Version 0.4.0 does not provide developer-hosted cloud sync or multi-device team sync.
- The app does not process card payments; payment method is a record label only.
- Public product data can be incomplete or unavailable.
- Operational records are primarily local to the device; exports/backups are recommended before clearing app data or changing devices.

## Google Play artifact

Expected production artifact name:

`SmartScanPro-0.4.0-release.aab`

Expected version code: `4`  
Expected version name: `0.4.0`  
Expected package: `com.smartscanpro.app`
