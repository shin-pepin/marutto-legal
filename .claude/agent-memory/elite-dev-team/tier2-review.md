# Tier 2 Code Review Findings (2026-02-26)

## CRITICAL (2 items - release blockers)
1. **isTest: true hardcoded** in requirePlan.server.ts:19 and app.wizard.$pageType.tsx:96
   - Fix: `isTest: process.env.NODE_ENV !== "production"`
2. **Action-side billing check missing** in app.wizard.$pageType.tsx action
   - save-draft and publish intents bypass billing paywall
   - Fix: Add checkPlanAccess before intent processing

## HIGH (6 items)
3. Shopify API + DB write not transactional in publish flow (A-1)
4. createPage always sets published:false (A-2, recurring from MVP)
5. collectedInfo/purposeOfUse accept arbitrary strings, should be z.enum (S-2)
6. siteUrl lacks z.url() validation (S-3)
7. Route handler tests = zero (T-1)
8. Client-side registry usage fragile with side-effect imports (F-1)

## MEDIUM (11 items)
9. pageTypeUI.ts / registry / dashboard triple management (F-2)
10. expectedVersion undefined TOCTOU still non-atomic (A-3)
11. Side-effect import reliability in bundler (A-4)
12. Template safeHtml usage inconsistency (S-4)
13. CompletionScreen URL assembly unsanitized (S-6)
14. Privacy validation edge case tests missing (T-2)
15. Registry test global state dependency (T-3)
16. checkPlanAccess has no tests (T-4)
17. formData typed as Record<string, any> (F-3, F-4)
18. Step2 UI overloaded - 8 sections in 1 step (U-1)

## LOW (6 items)
19. Price hardcoded in wizard upgrade UI (U-2)
20. DEFAULT_STEPS tokushoho-specific (U-3)
21. debounce timer no cleanup on unmount (F-5)
22. getLegalPage double-called in publish flow (A-5)
23. Template tests lack structural verification (T-5)
24. Crypto format validation incomplete for IV/authTag length (T-6)
