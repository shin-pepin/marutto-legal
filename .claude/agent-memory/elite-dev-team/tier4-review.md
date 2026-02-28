# Tier 4 Review Findings (PR #6) - 2026-02-27

## CRITICAL

### C-1: shopifyPageId not saved on page recreate
- File: app/routes/app._index.tsx (apply-template-update action, line ~190)
- When Shopify page is deleted and recreated, the new pageId is not saved to DB
- Comment says "skip for now" - this is a data integrity bug
- Fix: Save result.pageId to DB after createPage

## HIGH

### H-1: updateLegalPageVersion lacks optimistic locking
- File: app/lib/db/legalPage.server.ts (line 199-212)
- All other DB update functions use version checking, this one doesn't

### H-2/H-8: Decrypted formData sent to client
- File: app/routes/app._index.tsx loader (pagesWithUpdates mapping)
- formData, contentHtml, version sent in loader response unnecessarily
- formData contains decrypted personal info - violates data minimization

### H-3: as unknown as casts in UI
- Files: app._index.tsx, app.confirmation.tsx
- fetcher.data typed incorrectly, needs discriminated union

### H-4: Checkbox doesn't block checkout
- File: extensions/.../confirmation.liquid
- Pure decorative checkbox - spec clarification needed
- 改正特商法 requires "表示" not "同意取得"

### H-5: No tests for apply-template-update action
- Most complex action in the PR has zero test coverage

### H-6: versioning.test.ts DB mock path may be incorrect
- Mocking ../../db.server from __tests__ dir vs ../db/legalPage.server

### H-7: ownerId may need full Shop GID
- File: app/lib/shopify/metafields.server.ts line 58
- "gid://shopify/Shop" vs "gid://shopify/Shop/12345678"
- Needs real-device verification

### H-9: apply-template-update missing billing check
- No checkPlanAccess for paid pageTypes (privacy/terms/return)

## MEDIUM

### M-1: handleFieldChange creates new closures per render
### M-2: Success banner persists across submissions
### M-3: Confirmation card shows for free users without upgrade hint
### M-4: Theme setup instructions lack direct link
### M-5: Confirmation validation missing edge cases (HTML, Unicode)
### M-6: Metafield access scope verification needed
### M-7: Extension target "section" vs "block" mismatch with instructions
### M-8: No metafield cleanup on app uninstall
### M-9: formSchemaVersion migration behavior should be verified

## LOW

### L-1: Badge text "更新あり" is ambiguous - should say "テンプレート更新あり"
### L-2: Liquid XSS - actually safe due to Shopify {{ }} auto-escaping
