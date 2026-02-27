# Tier 3 Code Review Findings (2026-02-26)

## CRITICAL (1 item)
1. **U-1: "近日対応" text left in upgrade UI** - app.wizard.$pageType.tsx L485-486
   - Terms and return are implemented but upgrade screen says "近日対応"

## HIGH (4 items)
2. **T-3: No integration tests for terms/return pageTypes** - wizard test only uses tokushoho
3. **A-1: npm run start in Litestream signal chain** - scripts/run.sh L15, should use direct node command
   - Also retention 168h too short (should be 720h/30 days)
4. **C-1: jurisdiction "other" allows empty jurisdictionOther** - terms validation.ts lacks .refine()
5. **A-2: Dockerfile hardcodes linux-amd64** - should parameterize or document

## MEDIUM (7 items)
6. S-3: phone field accepts 500 chars (should be ~20 with regex)
7. C-2/U-2: returnCondition "no_returns" still requires all return fields
8. A-3: nlToBr() duplicated in terms.ts, return.ts, privacy.ts templates
9. A-4: getLabelFromOptions pattern inconsistent between terms.ts and return.ts
10. T-2: webhooks.test.ts missing vi.resetModules() in beforeEach
11. T-4: No loader tests for terms/return pageTypes
12. S-5: Litestream restore failure has no fallback (only set -e)

## LOW (7 items)
13. S-2: Webhook payload logged to console without filtering
14. C-3: enum type safety lost via `as [string, ...string[]]` cast
15. T-5: Dashboard loader test doesn't verify getAllPageTypes()
16. T-6: Template tests only use .toContain(), no structural HTML validation
17. T-7: No tests for Litestream scripts
18. U-3: terms Step2 has 10 fields in one step
19. U-4: return Step2 field order not optimal for user flow

## Good Points
- Registry pattern consistent across all pageTypes
- XSS protection via tagged template literals properly applied
- Validation with enum constraints, URL/email, length limits
- 26 integration tests added (was zero)
- Litestream exec mode + conditional restore is correct pattern
- Billing webhook API-only approach maintained
