# Elite Dev Team Memory - marutto-legal

## Project Overview
- Shopify app for Japanese legal page generation (tokushoho, privacy, terms, return)
- Tech stack: React Router v7 (Remix) + Polaris + Prisma/SQLite + Fly.io
- 4 pageTypes: tokushoho (free), privacy/terms/return (paid, $4.99/mo Basic plan)
- Litestream backup: SQLite -> S3 continuous replication (added in Tier 3)

## Current Status (Tier 4 PR #6 under review, 2026-02-27)
- 385 tests passing (329->385), TypeScript clean
- T4-A: Template versioning + dashboard update notification
- T4-B: Confirmation screen (app settings + Theme App Extension)
- See [tier4-review.md](./tier4-review.md) for Tier 4 findings

## Tier 4 Review Critical Issues
- CRITICAL: Shopify page recreate in apply-template-update doesn't save new shopifyPageId to DB
- HIGH: ownerId "gid://shopify/Shop" may need full Shop GID with numeric ID
- HIGH: Decrypted formData leaks to client via dashboard loader response
- HIGH: apply-template-update action missing checkPlanAccess for paid pageTypes
- HIGH: No tests for apply-template-update action (most complex business logic untested)
- HIGH: as unknown as casts scattered in UI code (needs discriminated union types)
- HIGH: Checkbox in Liquid extension doesn't block checkout (spec clarification needed)
- HIGH: updateLegalPageVersion lacks optimistic locking (unlike other DB functions)

## Prior Review Issues (some still open)
- See [tier3-review.md](./tier3-review.md) for Tier 3 findings
- See [tier2-review.md](./tier2-review.md) for Tier 2 findings
- Still open: Shopify API + DB not transactional, published:false on createPage
- Recurring: nlToBr() duplicated in template files
- Recurring: pageTypeUI.ts triple management with registry

## Architecture Decisions
- Pages API (method A) for Shopify page creation
- SQLite + Persistent Volume on Fly.io + Litestream -> S3
- Tagged template literals for HTML generation with auto XSS escaping
- Optimistic locking via version column on LegalPage table
- Registry pattern for pageType config (side-effect imports in index.ts)
- Billing: $4.99/month Basic plan, 7-day trial, tokushoho=free
- T4: Template versioning via formSchemaVersion column + PageTypeConfig.templateVersion
- T4: Confirmation data stored in Shop metafields ($app:confirmation namespace)
- T4: Theme App Extension for cart page confirmation display
- T4: Checkout UI Extension (checkout-confirmation-block) for checkout page confirmation (display-only, no checkbox)

## Shopify Checkout UI Extension Notes
- Disclosure/Pressable components: supported in api_version 2025-07, NOT supported in 2025-10+/2026-01
- Details/Summary (Web Components): supported in 2025-10+/2026-01 but no React wrapper
- For React-based checkout extensions, use api_version 2025-07 with @shopify/ui-extensions@2025.7.4 + @shopify/ui-extensions-react@2025.7.4
- @shopify/ui-extensions-react peer depends on matching @shopify/ui-extensions version
- Checkout UI Extension runs in Remote UI sandbox (no DOM, no innerHTML, XSS-safe by design)
- useAppMetafields({type:"shop"}) reads shop-level metafields declared in shopify.extension.toml
- marutto_confirmation namespace (not $app:) because Liquid extension also needs access

## Key File Paths
- Wizard route: app/routes/app.wizard.$pageType.tsx
- Dashboard: app/routes/app._index.tsx
- Confirmation: app/routes/app.confirmation.tsx
- Registry: app/lib/pageTypes/{registry,index,tokushoho,privacy,terms,return}.ts
- UI mapping: app/components/wizard/pageTypeUI.ts
- Templates: app/lib/templates/{tokushoho,privacy,terms,return}.ts
- Validation: app/lib/validation/{wizard,privacy,terms,return,confirmation}.ts
- Metafields: app/lib/shopify/metafields.server.ts
- Billing: app/lib/requirePlan.server.ts
- Crypto: app/lib/crypto.server.ts
- DB layer: app/lib/db/legalPage.server.ts, store.server.ts
- Webhooks: app/routes/webhooks.app.{uninstalled,subscriptions_update}.tsx
- Tests: app/lib/__tests__/ + app/routes/__tests__/
- Extension (cart/Liquid): extensions/final-confirmation-block/
- Extension (checkout/React): extensions/checkout-confirmation-block/
- DevOps: Dockerfile, litestream.yml, scripts/run.sh, fly.toml

## Patterns & Conventions
- eslint-disable for Record<string, any> in wizard step props
- safeHtml() wrapper for pre-escaped HTML in tagged template literals
- nlToBr() duplicated per template (should move to sanitize.ts)
- vi.hoisted() + vi.mock() pattern for route handler tests
- Dynamic await import() after mocks for route module loading
- Auto-save via 3-second debounce on form change
- Shopify Liquid {{ }} auto-escapes HTML by default (XSS safe for metafield output)
