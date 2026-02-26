# まるっと法務作成 -- 次フェーズ実装計画

> 作成日: 2026-02-25
> チームレビュー完了。全メンバーの合意済み。

---

## 前提: MVP完了時点の状況

- 特商法ページ生成ウィザード(3ステップ)、ダッシュボード、GDPR webhooks、自動保存が動作
- ユニットテスト49件パス(sanitize 15, validation 19, tokushoho 15)
- ルートハンドラ(loader/action)のテストは未実装
- App Store申請はまだ行っていない

---

## Tier 0: 審査ブロッカー (申請前に必須) ✅ 全完了

申請するとリジェクトが確実な問題。全てApp Store申請の前提条件。

### T0-1: Dockerfile の Node バージョン修正 ✅
### T0-2: ボタンラベルの整合性修正 ✅
### T0-3: API Version 整合性の修正 ✅
### T0-4: 未使用スコープの解消 ✅
### T0-5: アプリのプライバシーポリシー作成 ✅
### T0-6: App Listing 素材の準備 ✅(テキスト部分)
### T0-7: DevConsole エラーゼロの確認 ✅(チェックリスト作成)

---

## Tier 1: 品質向上・差別化 ✅ 全完了

### T1-7: GraphQL API リトライロジック ✅
### T1-5: 楽観的ロックのバージョン同期改善 ✅
### T1-3: form_data AES-256-GCM暗号化 ✅
### T1-1: フッターメニュー自動追加 ✅
### T1-2: 完了画面の充実 ✅
### T1-4: Shopify側ページ削除の検知 ✅
### T1-6: ウィザード離脱確認ダイアログ ✅

### Tier 1 検証結果
- `npx tsc --noEmit`: パス ✅
- `npx vitest run`: 80テスト全パス ✅ (新規31テスト追加)
  - sanitize: 15, tokushoho: 15, validation: 19, retry: 21, crypto: 10

---

## Tier 2: Privacy Policy + ウィザード汎用化 + Billing ✅ 全完了

### Phase 0: Tier 1 残件修正 ✅
- [x] TOCTOU修正: `updateMany` + version WHERE条件で原子的チェック&更新
- [x] hex バリデーション: ENCRYPTION_KEY に `/^[0-9a-fA-F]{64}$/` 正規表現チェック追加
- [x] 非公開リンク制御: 新規作成時は「ストアで表示」リンク非表示

### Phase 1: ウィザード汎用化リファクタリング ✅
- [x] `app/lib/pageTypes/privacy.ts` — privacy pageType 登録
- [x] `app/lib/pageTypes/index.ts` — side-effect import で全 pageType 登録
- [x] `app/routes/app.wizard.$pageType.tsx` — 汎用ウィザードルート
  - registry config ベースの動的 loader/action/component
- [x] `app/routes/app.wizard.tsx` → Layout (`<Outlet />`)
- [x] `app/routes/app.wizard._index.tsx` → `/app/wizard/tokushoho` リダイレクト
- [x] `app/components/wizard/pageTypeUI.ts` — pageType → StepComponent[] マッピング
- [x] `app/components/wizard/WizardStepper.tsx` — steps を props で受け取り
- [x] `app/components/wizard/CompletionScreen.tsx` — `pageTypeTitle` prop 対応
- [x] ダッシュボード改修: navigate先を `/app/wizard/${page.pageType}` に変更 + 未作成ページ提案UI

### Phase 2: Privacy Policy 実装 ✅
- [x] `app/components/wizard/privacy/Step1BasicInfo.tsx` — 基本情報フォーム
- [x] `app/components/wizard/privacy/Step2DataCollection.tsx` — 収集情報・利用目的・Cookie・アナリティクス
- [x] `app/lib/__tests__/privacy-template.test.ts` — 28テスト
- [x] `app/lib/__tests__/privacy-validation.test.ts` — 29テスト
- [x] `app/lib/__tests__/registry.test.ts` — 27テスト

### Phase 3: Billing API 実装 ✅
- [x] `shopify.server.ts` に billing config 追加 (Basic $4.99/月, 7日トライアル)
- [x] `prisma/schema.prisma` Store モデルに `plan`, `trialEndsAt`, `billingConfirmedAt` 追加
- [x] `app/lib/pageTypes/registry.ts` に `requiredPlan` フィールド追加
  - tokushoho: `"free"`, privacy: `"basic"`
- [x] `app/lib/requirePlan.server.ts` — `checkPlanAccess()` プランチェックユーティリティ
- [x] ウィザードルートに billing check + アップグレード UI 統合
- [x] ダッシュボードに有料プランバッジ + アップグレードボタン

### Tier 2 検証結果
- `npx tsc --noEmit`: パス ✅
- `npx vitest run`: 164テスト全パス ✅ (新規84テスト追加)
  - sanitize: 15, tokushoho: 15, validation: 19, retry: 21, crypto: 10
  - privacy-template: 28, privacy-validation: 29, registry: 27

---

## Tier 3: 追加機能 + 品質強化 ✅ 全完了

### T3-3: 利用規約 + 返品・交換ポリシー生成機能 ✅
- [x] `app/lib/validation/terms.ts` — Zod スキーマ + 選択肢定数
- [x] `app/lib/templates/terms.ts` — `generateTermsHtml()` HTML テンプレート
- [x] `app/lib/pageTypes/terms.ts` — `registerPageType()` 登録
- [x] `app/components/wizard/terms/Step1BasicInfo.tsx` — 基本情報フォーム
- [x] `app/components/wizard/terms/Step2TermsDetails.tsx` — 規約内容フォーム
- [x] `app/lib/validation/return.ts` — Zod スキーマ + 選択肢定数
- [x] `app/lib/templates/return.ts` — `generateReturnHtml()` HTML テンプレート
- [x] `app/lib/pageTypes/return.ts` — `registerPageType()` 登録
- [x] `app/components/wizard/return/Step1BasicInfo.tsx` — 基本情報フォーム
- [x] `app/components/wizard/return/Step2ReturnDetails.tsx` — 返品条件フォーム
- [x] `app/lib/pageTypes/index.ts` — terms, return の import 追加
- [x] `app/components/wizard/pageTypeUI.ts` — PAGE_TYPE_STEPS に terms, return 追加
- [x] テスト: +116件 (terms-validation 31, terms-template 22, return-validation 34, return-template 29)

### T3-4: Billing Webhook ハンドラ ✅
- [x] `app/routes/webhooks.app.subscriptions_update.tsx` — ログ記録のみ (API-only 方式)
- [x] `shopify.app.toml` — `app_subscriptions/update` webhook 追加

### T3-1: ルートハンドラの統合テスト ✅
- [x] `app/routes/__tests__/helpers/mockShopify.ts` — テストヘルパー
- [x] `app/routes/__tests__/helpers/requestBuilder.ts` — テストヘルパー
- [x] `app/routes/__tests__/app._index.test.ts` — ダッシュボード 6件
- [x] `app/routes/__tests__/app.wizard.$pageType.test.ts` — ウィザード 16件
- [x] `app/routes/__tests__/webhooks.test.ts` — Webhook 4件

### T3-2: Litestream バックアップ設定 ✅
- [x] `litestream.yml` — S3 レプリカ設定
- [x] `scripts/run.sh` — 起動時リストア + レプリケーション
- [x] `Dockerfile` — Litestream v0.3.13 インストール + CMD 変更

### Tier 3 検証結果
- `npx tsc --noEmit`: パス ✅
- `npx vitest run`: 316テスト全パス ✅ (新規142テスト追加)
  - 既存: sanitize 15, tokushoho 15, validation 19, retry 21, crypto 10, requirePlan 5
  - 既存: privacy-template 28, privacy-validation 33, registry 28
  - 新規: terms-validation 31, terms-template 22, return-validation 34, return-template 29
  - 新規: app._index 6, app.wizard 16, webhooks 4

---

## 過去のMVP実装記録

<details>
<summary>Part 1: Specification.md 修正 (完了)</summary>

- [x] C-1 ~ C-5, M-1 ~ M-12, Minor items: 全完了

</details>

<details>
<summary>Part 2: MVP実装 (完了)</summary>

- [x] Step 1-7: 全完了
- Tests: 49テスト全パス → Tier 1完了後: 80テスト全パス → Tier 2完了後: 164テスト全パス → Tier 3完了後: 316テスト全パス

</details>
