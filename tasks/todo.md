# まるっと法務ページ — MVP実装 Todo

## Part 1: Specification.md 修正
- [x] C-1: APIスコープ名・API種別の修正
- [x] C-2: セキュリティ仕様セクション新設（4.6）
- [x] C-3: テスト戦略セクション新設（4.8）
- [x] C-4: フィールド数の矛盾解消（15→18フィールド）
- [x] C-5: テンプレートエンジンの明確化（TypeScriptタグ付きテンプレートリテラル）
- [x] M-1: データモデル再設計（Store認証のみ、PaymentMethod削除）
- [x] M-2: エラーハンドリング・エッジケースセクション新設（4.7）
- [x] M-3: SQLite + Fly.ioリスク追記
- [x] M-4: 自動保存の実装方針明記
- [x] M-5: バリデーション仕様追加（3.4）
- [x] M-6: ウィザード3ステップ化
- [x] M-7: フッターメニュー特定ロジック明記（4.7内に含む）
- [x] M-8: GDPR mandatory webhooks追記
- [x] M-9: XSS対策具体化（4.6内）
- [x] M-10: 免責事項の具体化
- [x] M-11: form_data JSONスキーマバージョニング（データモデル内）
- [x] M-12: リスクセクション追加項目
- [x] Minor: ダッシュボードEmpty State仕様追記
- [x] Minor: CSSテーマ追従方針
- [x] Minor: Step 2アコーディオンUI
- [x] Minor: MVPリリースチェックリスト追加

## Part 2: MVP実装
- [x] Step 1: プロジェクト初期化（Shopify CLI scaffold + Prisma）
- [x] Step 2: コアライブラリ（sanitize, templates, validation, db, shopify API）
- [x] Step 3: ウィザードUI（3ステップフォーム）
- [x] Step 4: ダッシュボード
- [x] Step 5: GDPR Webhooks + エッジケース
- [x] Step 6: テスト・品質（49テスト全パス）
- [x] Step 7: デプロイ準備（fly.toml、.env.example、Dockerfile本番DB対応、ランディングページ）

## Review Notes
- TypeScript: `npx tsc --noEmit` クリーンパス
- Tests: 49テスト全パス（sanitize 15, validation 19, tokushoho 15）
- XSSエスケープ: タグ付きテンプレートリテラルで自動エスケープ確認済み
- GDPR: customers/data_request, customers/redact, shop/redact 全実装
- 楽観的ロック: LegalPage.versionカラムによる競合検出実装
- メニュー重複防止: 既存アイテムチェック実装
- 住所非公開: on_request時に住所・電話番号の非表示確認テスト済み
