# Post-MVP Review Findings (2026-02-25)

## Bugs
1. **Dockerfile node:18** - engines field requires >=20.19, Docker uses 18-alpine
2. **Publish flow** - createPage always `published: false`, no subsequent update to true
3. **API version** - shopify.server.ts: January25, shopify.app.toml: 2026-01
4. **markDeletedOnShopify** - function exists in legalPage.server.ts but never called
5. **Optimistic lock version sync** - client increments locally, may desync with server

## Missing Implementations (spec vs code)
1. form_data AES-256-GCM encryption (spec 4.6)
2. Menu API / footer auto-add (spec 2.4, scopes requested but unused)
3. Completion screen with store link and review prompt (spec 3.1)
4. Shopify-side page deletion detection in dashboard (spec 4.7)
5. Exponential backoff retry for API calls (spec 4.7)
6. Wizard navigation guard (beforeunload / useBlocker)
7. Litestream backup configuration

## Security Concerns
- Personal data (address, phone, email) stored as plaintext JSON in formData
- Session accessToken stored in plaintext (Shopify template default)
- No rate limiting on app endpoints
- Navigation scope requested but not used (review risk)

## Test Coverage Gaps
- 49 unit tests pass (sanitize: 15, validation: 19, tokushoho: 15)
- No route handler tests (loader/action in app.wizard.tsx, app._index.tsx)
- No integration tests with mocked Shopify API
- No E2E test suite

## App Store Submission Requirements
- Privacy policy URL (required, not created)
- App icon 1200x1200px
- 3-6 screenshots 1600x900px
- Demo store URL
- App listing text (draft in Specification.md section 7)
- DevConsole zero errors in incognito mode
