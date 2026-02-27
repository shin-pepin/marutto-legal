# Elite Dev Team Memory - marutto-legal

## Project Overview
- Shopify app for Japanese legal page generation (tokushoho, privacy, terms, return)
- Tech stack: React Router v7 (Remix) + Polaris + Prisma/SQLite + Fly.io
- 4 pageTypes: tokushoho (free), privacy/terms/return (paid, $6.99/mo Basic plan)
- Litestream backup: SQLite -> S3 continuous replication (added in Tier 3)

## Current Status (Tier 3, 2026-02-26)
- 316 tests passing, TypeScript clean
- Terms + Return wizards: DONE (validation, templates, components, registry)
- Billing webhook handler: DONE (log-only, API-only approach)
- Route handler integration tests: 26 tests (dashboard, wizard, webhooks)
- Litestream: DONE (Dockerfile, litestream.yml, scripts/run.sh)

## Active Review Issues
- See [tier3-review.md](./tier3-review.md) for Tier 3 findings
- See [tier2-review.md](./tier2-review.md) for Tier 2 findings (some still open)
- CRITICAL: "近日対応" text in upgrade UI (terms/return already implemented)
- HIGH: No integration tests for terms/return pageTypes
- HIGH: npm run start in Litestream signal chain (should be direct node)
- HIGH: jurisdiction "other" allows empty jurisdictionOther
- Recurring: nlToBr() duplicated in 3 template files
- Recurring: pageTypeUI.ts triple management with registry

## Tier 2 Issues Status
- isTest billing: FIXED (now uses IS_TEST_BILLING env-based)
- Action-side billing check: FIXED (added in wizard action)
- collectedInfo/purposeOfUse enum validation: FIXED
- siteUrl z.url(): FIXED (in terms.ts and return.ts too)
- Route handler tests: FIXED (26 tests added in Tier 3)
- Still open: Shopify API + DB not transactional, published:false on createPage

## Architecture Decisions
- Pages API (method A) for Shopify page creation
- SQLite + Persistent Volume on Fly.io + Litestream -> S3
- Tagged template literals for HTML generation with auto XSS escaping
- Optimistic locking via version column on LegalPage table
- Registry pattern for pageType config (side-effect imports in index.ts)
- Billing: $6.99/month Basic plan, 7-day trial, tokushoho=free

## Key File Paths
- Wizard route: app/routes/app.wizard.$pageType.tsx
- Dashboard: app/routes/app._index.tsx
- Registry: app/lib/pageTypes/{registry,index,tokushoho,privacy,terms,return}.ts
- UI mapping: app/components/wizard/pageTypeUI.ts
- Templates: app/lib/templates/{tokushoho,privacy,terms,return}.ts
- Validation: app/lib/validation/{wizard,privacy,terms,return}.ts
- Billing: app/lib/requirePlan.server.ts
- Crypto: app/lib/crypto.server.ts
- DB layer: app/lib/db/legalPage.server.ts, store.server.ts
- Webhooks: app/routes/webhooks.app.{uninstalled,subscriptions_update}.tsx
- Tests: app/lib/__tests__/ + app/routes/__tests__/
- DevOps: Dockerfile, litestream.yml, scripts/run.sh, fly.toml

## Patterns & Conventions
- eslint-disable for Record<string, any> in wizard step props
- safeHtml() wrapper for pre-escaped HTML in tagged template literals
- nlToBr() duplicated per template (should move to sanitize.ts)
- vi.hoisted() + vi.mock() pattern for route handler tests
- Dynamic await import() after mocks for route module loading
- Auto-save via 3-second debounce on form change
