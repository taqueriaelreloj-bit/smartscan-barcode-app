# SmartScan Pro product and launch roadmap

## Positioning

**One scan to understand, compare, and control any product or asset.**

Primary launch wedge: independent workers and small businesses that need a simple barcode inventory without dedicated hardware. Personal shopping and food intelligence bring consumer growth; business workflows create recurring revenue.

## Commercial model to validate

| Plan | Candidate value | Candidate price for testing |
| --- | --- | --- |
| Free | Unlimited scanning, local history, up to 100 inventory records, basic export | $0 |
| Pro | Unlimited records, product insights, watchlists, price alerts, cloud backup, advanced exports | $4.99/month or $39.99/year |
| Business | Team workspace, multi-location, roles, audit, labels, API/webhooks, priority support | From $19/month plus seats |

Prices are hypotheses for customer testing, not a final price sheet.

## Phase 1 — functional beta

- [x] Mobile-first PWA shell.
- [x] Camera, image, and manual scanning.
- [x] Broad format negotiation with the device.
- [x] Torch and zoom where supported.
- [x] URL/result classification and basic risk flags.
- [x] Local inventory, batch counting, locations, costs, minimum stock, expiration.
- [x] Product catalog adapter and food insight fields.
- [x] Search, filters, audit history, CSV, backup/restore.
- [x] Serialized tool checkout/return with assignee, job site, due date, condition, maintenance, missing and overdue states.
- [x] USB/Bluetooth keyboard-wedge scanners with alphanumeric asset labels.
- [x] Controlled PWA update prompt for safer field deployment.
- [x] Offline app shell.
- [x] Domain tests and no-dependency development server.

## Phase 2 — sellable hosted product

- [ ] User accounts with email verification, MFA option, secure sessions, and account deletion.
- [ ] Cloud database with tenant isolation, encrypted backups, migration strategy, and audit retention.
- [ ] Conflict-safe offline sync and background retry queue.
- [ ] Workspaces, invitations, owner/admin/member/viewer roles.
- [ ] Stripe or app-store subscriptions, trials, receipts, cancellation and tax handling.
- [ ] Privacy policy, terms, data-processing inventory, support and incident process.
- [ ] Error monitoring, privacy-aware analytics, uptime and backup alerts.
- [ ] Production product-catalog proxy with caching, rate limits, provider attribution and license compliance.
- [ ] Native Android/iOS packaging, store screenshots, onboarding and accessibility audit.

## Phase 3 — differentiated intelligence

- [ ] Licensed price providers, affiliate disclosure, retailer normalization, price history and drop alerts.
- [ ] Explainable nutrition and ingredient views with allergy/diet preferences and prominent limitations.
- [ ] Product alternatives ranked by user goal, availability, price, and confidence.
- [ ] Receipt import and pantry replenishment suggestions.
- [ ] AI-assisted field creation, inventory cleanup and anomaly detection.
- [ ] Cloud contractor mode: shared crews, trucks, warehouses, job-site transfers, approvals and conflict-safe synchronization.

## Phase 4 — business platform

- [ ] Custom fields, forms, views, workflow rules and approvals.
- [ ] Code/label generator with print templates.
- [ ] Purchase orders, receiving, picking, cycle counts and stock transfers.
- [ ] Photos, signatures, condition, serial/lot/batch and optional GPS.
- [ ] REST API, webhooks, API keys with scopes and rotation.
- [ ] Excel, Google Sheets, accounting, POS and automation integrations.
- [ ] Enterprise scanners and GS1 Digital Link support.

## Launch gates

The product is not ready for paid public distribution until every Phase 2 security, legal, billing, data-deletion, and support item is complete and tested. Also complete a trademark/name search before using SmartScan Pro publicly.
