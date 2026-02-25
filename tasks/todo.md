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
- [x] `app/lib/shopify/retry.server.ts` 新規作成
  - `withRetry<T>`: Exponential backoff (500ms → 1000ms → 2000ms、ジッター ±20%)
  - リトライ対象: 429, 5xx, THROTTLED, ネットワークエラー (ECONNRESET, ETIMEDOUT等)
  - リトライ非対象: 4xx (認証エラー), userErrors (バリデーション)
- [x] `app/lib/__tests__/retry.test.ts` 新規テスト (21テスト)
- [x] `pages.server.ts` の `createPage`, `updatePage`, `getPage` をwithRetryでラップ

### T1-5: 楽観的ロックのバージョン同期改善 ✅
- [x] action: save-draft / publish レスポンスに `newVersion` を追加
- [x] component: `fetcher.data.newVersion` から `setPageVersion` を更新
- [x] ローカルインクリメント `(prev) => prev + 1` を廃止

### T1-3: form_data AES-256-GCM暗号化 ✅
- [x] `app/lib/crypto.server.ts` 新規作成
  - フォーマット: `v1:[iv_hex]:[authTag_hex]:[ciphertext_base64]`
  - AES-256-GCM, IV 12バイトランダム
  - キー: env `ENCRYPTION_KEY` (64 hex chars = 32 bytes)
- [x] `app/lib/__tests__/crypto.test.ts` 新規テスト (10テスト)
- [x] `legalPage.server.ts`: 保存前に暗号化、読み出し時に復号
- [x] Lazy migration: `isEncrypted()` で平文検出 → そのまま読み、次回保存時に暗号化
- [x] `.env.example` に `ENCRYPTION_KEY` 追加

### T1-1: フッターメニュー自動追加 ✅
- [x] `app/lib/shopify/menu.server.ts` 新規作成
  - `getMenus()`: 全メニュー取得
  - `hasPageInMenu()`: 重複チェック
  - `addPageToMenu()`: 安全な追加 (既存items保持)
- [x] `shopify.app.toml` にnavigationスコープ再追加
- [x] `.env.example` SCOPES更新
- [x] wizard loader: メニュー一覧取得
- [x] wizard action: `addToMenu` + `menuId` パラメータ対応
- [x] `Step3PreviewPublish`: メニュー選択UI (チェックボックス + ドロップダウン)

### T1-2: 完了画面の充実 ✅
- [x] `app/components/wizard/CompletionScreen.tsx` 新規作成
  - チェックマーク + 完了ヘッディング
  - Shopify管理画面で確認リンク
  - ストアで表示リンク
  - メニュー追加成功バナー
  - ダッシュボードに戻るボタン
  - 次のアクション提案 (プライバシーポリシー)
- [x] `app.wizard.tsx`: publishSuccess Banner → CompletionScreen に置換

### T1-4: Shopify側ページ削除の検知 ✅
- [x] `app._index.tsx` loader: `nodes(ids)` bulk queryで存在確認 (O(1)リクエスト)
- [x] 存在しないページ → `markDeletedOnShopify` でステータス更新
- [x] ローカルページデータも即座に反映

### T1-6: ウィザード離脱確認ダイアログ ✅
- [x] `useBlocker` (Remix) でクライアントサイドナビゲーションブロック
- [x] `isDirty` フラグ: formData変更時にtrue、保存/publish成功時にfalse
- [x] Polaris Modal で確認ダイアログ表示
- [x] publishSuccess後はブロック解除

### Tier 1 検証結果
- `npx tsc --noEmit`: パス ✅
- `npx vitest run`: 80テスト全パス ✅ (新規31テスト追加)
  - sanitize: 15, tokushoho: 15, validation: 19, retry: 21, crypto: 10

---

## Tier 2: 次フェーズ機能 (App Store掲載後)

App Storeに掲載後、ユーザーフィードバックを得ながら実装する機能。

### T2-1: プライバシーポリシー生成機能
- [ ] wizard ルートパラメータ化: `app.wizard.tsx` → `app.wizard.$pageType.tsx`
- [ ] `app/lib/pageTypes/registry.ts` — PageTypeConfig registry
- [ ] 各pageType config: `tokushoho.ts`, `privacy.ts`
- [ ] `app/lib/templates/privacy.ts`, `app/lib/validation/privacy.ts`
- [ ] Step1/Step2コンポーネント for privacy
- **工数**: 5-7日

### T2-2: Billing API連携 (サブスクリプション課金)
- [ ] Free: 特商法ページのみ
- [ ] Basic ($4.99/月): 全ページタイプ + メニュー自動追加
- [ ] `requireSubscription(request, requiredPlan)` ミドルウェアパターン
- [ ] 7日間無料トライアル
- **工数**: 5-7日

### T2-3: ルートハンドラの統合テスト
- [ ] 最小限はT1と並行、本格はT1完了後
- **工数**: 2-3日

### T2-4: Litestream バックアップ設定
- [ ] 独立して実装可能
- **工数**: 1日

### T2-5: 利用規約 + 返品・交換ポリシー生成機能
- [ ] T2-1完了後（同アーキテクチャ流用）
- **工数**: 各3-4日

---

## 過去のMVP実装記録

<details>
<summary>Part 1: Specification.md 修正 (完了)</summary>

- [x] C-1 ~ C-5, M-1 ~ M-12, Minor items: 全完了

</details>

<details>
<summary>Part 2: MVP実装 (完了)</summary>

- [x] Step 1-7: 全完了
- Tests: 49テスト全パス → Tier 1完了後: 80テスト全パス

</details>
