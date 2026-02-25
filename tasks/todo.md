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

## Tier 0: 審査ブロッカー (申請前に必須)

申請するとリジェクトが確実な問題。全てApp Store申請の前提条件。

### T0-1: Dockerfile の Node バージョン修正 ✅
- [x] `Dockerfile` の `node:18-alpine` を `node:20-alpine` に変更(ビルドステージ・ランタイム両方)
- **工数**: 15分
- **理由**: `package.json` の `engines` フィールドが `>=20.19 <22 || >=22.12` を要求。Node 18ではランタイムエラーのリスクがあり、Shopifyの審査テンプレートとも不整合。
- **対象ファイル**: `Dockerfile` (L1, L9)
- **検証方法**: `docker build` が成功すること

### T0-2: ボタンラベルの整合性修正 ✅
- [x] `Step3PreviewPublish.tsx` のボタンラベル「ページを公開する」→「ページを作成する」に変更
- **理由**: ボタンが「公開する」だが実際は `published: false` で非公開作成（意図的な設計）。ラベルを実際の動作に合わせた。
- **対象ファイル**: `app/components/wizard/Step3PreviewPublish.tsx` (L49)

### T0-3: API Version 整合性の修正 ✅
- [x] `shopify.server.ts` の `ApiVersion.January25` を `ApiVersion.January26` に更新（L13, L29両方）
- **検証**: `npx tsc --noEmit` パス済み

### T0-4: 未使用スコープの解消 ✅
- [x] 方針A採用: `shopify.app.toml` から `write_online_store_navigation` と `read_online_store_navigation` を削除
- **検証**: スコープが `write_online_store_pages,read_online_store_pages` のみであること確認済み

### T0-5: アプリのプライバシーポリシー作成 ✅
- [x] 外部HP上のプライバシーポリシーを使用: https://pepin.studio/privacy
- [ ] Shopify Partner Dashboardに上記URLを設定（手動作業）

### T0-6: App Listing 素材の準備 ✅(テキスト部分)
- [x] `docs/app-listing.md` にテキスト素材ドラフト作成（紹介文、詳細説明、機能リスト、検索キーワード）
- [x] スクリーンショット撮影チェックリスト作成
- [x] スクリーンキャスト動画の構成案作成
- [ ] アプリアイコン作成（手動作業）
- [ ] スクリーンショット撮影（手動作業）
- [ ] スクリーンキャスト動画撮影（手動作業）

### T0-7: DevConsole エラーゼロの確認 ✅(チェックリスト作成)
- [x] `docs/app-listing.md` 内にDevConsoleエラーチェックリスト作成
- [ ] 実際のチェック実行（手動作業）

---

## Tier 1: 品質向上・差別化 (審査待ち期間に実装)

申請後の審査待ち(5-10営業日)を利用して実装する項目。V1.1としてリリース。

### T1-1: フッターメニュー自動追加 (Menu API連携)
- [ ] `app/lib/shopify/menu.server.ts` 新規作成
  - `getMenus()`: GraphQL Menu APIで全メニュー取得
  - `getMenuByHandle(handle)`: handle指定でメニュー取得(footer候補)
  - `addMenuItemToMenu(menuId, title, url)`: メニューアイテム追加
  - `checkMenuItemExists(menuId, url)`: 重複チェック
- [ ] Step 3 のUIにフッターメニュー追加オプション追加
  - チェックボックス「フッターメニューに自動追加する」(デフォルトON)
  - メニュー選択ドロップダウン(handle="footer" を初期候補として提示)
  - 「手動で追加する方法」のフォールバックリンク
- [ ] publish処理にMenu API呼び出しを組み込み
- [ ] LegalPageテーブルの `menu_item_added` フラグの更新
- [ ] `shopify.app.toml` にnavigationスコープを再追加
- **工数**: 1.5日
- **理由**: Specificationで「差別化ポイント」として明記。App Store説明文にも「フッターへの自動配置」を謳っている。未実装のままだと説明文とアプリの実態が乖離する。Shopifyのメニュー手動追加は初心者にとって分かりにくい作業であり、この自動化こそがアプリの価値。
- **対象ファイル**:
  - 新規: `app/lib/shopify/menu.server.ts`
  - 修正: `app/routes/app.wizard.tsx`
  - 修正: `app/components/wizard/Step3PreviewPublish.tsx`
  - 修正: `shopify.app.toml`
- **検証方法**: ページ公開後にShopify管理画面のナビゲーション設定でフッターメニューにリンクが追加されていること。既存リンクが削除されていないこと。重複追加されないこと。

### T1-2: 完了画面の充実
- [ ] `app/components/wizard/CompletionScreen.tsx` 新規作成
  - ストアフロントでの表示リンク(新しいタブで開く)
  - Shopify管理画面のページ一覧リンク
  - ダッシュボードへの戻りボタン
  - 「次にプライバシーポリシーを作成しませんか?」の提案(Phase 2への布石)
- [ ] レビュー依頼バナー(公開成功後に表示)
  - Shopify App Storeのレビューページへのリンク
  - 「お役に立ちましたか?」のメッセージ
- [ ] 現在のpublishSuccess Bannerを完了画面コンポーネントに置き換え
- **工数**: 4時間
- **理由**: 現在の完了表示はBannerのみで、ユーザーが次に何をすべきか不明。FTX(First Time Experience)を改善し、レビュー獲得の導線を確保する。KPI「レビュー数」に直結。
- **対象ファイル**:
  - 新規: `app/components/wizard/CompletionScreen.tsx`
  - 修正: `app/routes/app.wizard.tsx`
- **検証方法**: 公開成功後にストアフロントリンクをクリックして実際のページが表示されること。レビューリンクがApp Storeページに遷移すること。

### T1-3: form_data の AES-256-GCM 暗号化
- [ ] `app/lib/crypto.server.ts` 新規作成
  - `encrypt(plaintext, key)`: AES-256-GCM暗号化。IV + AuthTag + Ciphertext をBase64エンコードして返す
  - `decrypt(encrypted, key)`: 復号
  - key は環境変数 `ENCRYPTION_KEY` から取得(32バイト)
- [ ] `legalPage.server.ts` の upsertLegalPageDraft / publishLegalPage で保存前に暗号化
- [ ] `app.wizard.tsx` の loader で form_data 読み込み時に復号
- [ ] `webhooks.tsx` の shop/redact で削除対象が暗号化データであることの確認
- [ ] `.env.example` に `ENCRYPTION_KEY` を追加
- [ ] fly.ioには `fly secrets set ENCRYPTION_KEY=...` で設定
- [ ] 既存平文データのマイグレーション戦略の検討(初回デプロイ時に一括暗号化するか、アクセス時に遅延暗号化するか)
- **工数**: 1日
- **理由**: Specificationに「form_data内の個人情報をAES-256-GCMで暗号化保存」と明記。住所・電話番号・メールアドレスという個人情報保護法上の「個人情報」が平文保存されている。プライバシーポリシーとの整合性も確保する必要あり。
- **対象ファイル**:
  - 新規: `app/lib/crypto.server.ts`
  - 修正: `app/lib/db/legalPage.server.ts`
  - 修正: `app/routes/app.wizard.tsx`
  - 修正: `.env.example`
- **検証方法**: DBに保存された form_data がBase64エンコードされた暗号文であること。復号後に正しいJSONが復元されること。暗号化キーを変更した場合に復号が失敗すること。

### T1-4: Shopify側ページ削除の検知
- [ ] ダッシュボードの loader で、各ページの `shopifyPageId` があるものについて `getPage` で存在確認
- [ ] 存在しない場合は `markDeletedOnShopify` を呼んでステータスを更新
- [ ] API呼び出し回数を最小化するため、ページ数が多い場合はバッチクエリを検討
- **工数**: 3時間
- **理由**: `markDeletedOnShopify` 関数が実装済みだがどこからも呼ばれていない。ユーザーがShopify管理画面から手動でページを削除した場合、ダッシュボードでは「公開中」と表示され続ける。Specificationの「Shopify側でページ手動削除 → ダッシュボードで検知し再作成を促す」が未実装。
- **対象ファイル**:
  - 修正: `app/routes/app._index.tsx`
  - 使用: `app/lib/db/legalPage.server.ts` (markDeletedOnShopify)
  - 使用: `app/lib/shopify/pages.server.ts` (getPage)
- **検証方法**: Shopify管理画面でページを手動削除後、ダッシュボードリロードでステータスが「Shopify側で削除済み」に変わること

### T1-5: 楽観的ロックのバージョン同期改善
- [ ] サーバーの save-draft / publish レスポンスに `newVersion` フィールドを追加
- [ ] クライアント側でローカルインクリメントではなく、サーバーレスポンスの `newVersion` を採用
- [ ] `upsertLegalPageDraft` / `publishLegalPage` の戻り値から version を取得して返す
- **工数**: 1時間
- **理由**: 現在クライアントが `setPageVersion(prev => prev + 1)` でローカルにインクリメントしているが、auto-save と step完了save が短い間隔で連続した場合、fetcher.data の更新タイミングによってバージョンがズレる。結果として不要な 409 Conflict が返り、ユーザーに「別のセッションで更新されています」という誤った警告が出る。
- **対象ファイル**:
  - 修正: `app/routes/app.wizard.tsx` (action: レスポンスにversion追加、component: useEffectでserverVersionを採用)
- **検証方法**: 高速で入力 → ステップ移動を繰り返しても 409 が発生しないこと

### T1-6: ウィザード離脱確認ダイアログ
- [ ] `useBlocker` (React Router) を使ったクライアントサイドナビゲーションガード
- [ ] `beforeunload` イベントによるブラウザ閉じ/リロードガード
- [ ] 公開成功後はガードを解除
- **工数**: 1.5時間
- **理由**: 入力途中でナビゲーションすると、3秒debounce内の最新入力が失われる。自動保存があるためデータは概ね保護されるが、直前の変更が失われることへの不安を解消する。
- **対象ファイル**:
  - 修正: `app/routes/app.wizard.tsx`
- **検証方法**: 入力中にブラウザバックした際に確認ダイアログが表示されること。公開完了後にはダイアログが出ないこと。

### T1-7: GraphQL API リトライロジック
- [ ] `app/lib/shopify/graphqlClient.server.ts` 新規作成(または pages.server.ts に組み込み)
  - Exponential backoff (300ms, 900ms, 2700ms の3回リトライ)
  - リトライ対象: ネットワークエラー、429 (Rate Limit)、5xx
  - リトライ非対象: 4xx (認証エラー、バリデーションエラー)、userErrors
- **工数**: 2時間
- **理由**: Specificationに「Exponential backoffリトライ(最大3回)」と明記。現在はネットワーク障害やShopify側の一時的なエラーで即座に失敗する。本番運用では必須のレジリエンス機能。
- **対象ファイル**:
  - 新規または修正: `app/lib/shopify/pages.server.ts`
- **検証方法**: ユニットテストでリトライ動作を確認(1-2回失敗後に成功するケース)

---

## Tier 2: 次フェーズ機能 (App Store掲載後)

App Storeに掲載後、ユーザーフィードバックを得ながら実装する機能。

### T2-1: プライバシーポリシー生成機能
- [ ] `app/lib/templates/privacy.ts` 新規作成(プライバシーポリシーHTMLテンプレート)
- [ ] `app/lib/validation/privacy.ts` 新規作成(Zodスキーマ)
- [ ] `app/types/wizard.ts` にプライバシーポリシー用の型追加
- [ ] ウィザードルートを pageType パラメータ対応に拡張
  - `/app/wizard?type=tokushoho` (既存)
  - `/app/wizard?type=privacy` (新規)
- [ ] Step1/Step2コンポーネントの共通化 or 新規コンポーネント作成
- [ ] ダッシュボードに「プライバシーポリシーを作成する」CTAを追加
- [ ] テスト追加(テンプレート生成、バリデーション)
- **工数**: 5-7日
- **理由**: 特商法と並んで日本のECサイトの必須ページ。Specificationでは「P0(MVP必須)」だったものをスコープ縮小でPhase 2に繰り延べた。ユーザーが特商法ページ作成後に最も求める次の機能。Free -> Basic プランへの転換トリガー。
- **対象ファイル**: 新規ファイル多数 + 既存ルートの拡張
- **検証方法**: プライバシーポリシーの全フィールドが正しくHTML生成されること。XSSテスト。開発ストアでのE2E確認。

### T2-2: Billing API連携 (サブスクリプション課金)
- [ ] Shopify Billing APIで3プラン(Free/Basic/Pro)を設定
- [ ] プラン選択画面の実装
- [ ] プランに応じた機能制限ロジック
  - Free: 特商法のみ
  - Basic: 全4ページ + 法改正通知
  - Pro: 全機能 + 越境EC(将来)
- [ ] 7日間無料トライアルの設定
- [ ] アップグレード/ダウングレードのUI
- **工数**: 5-7日
- **理由**: 収益化のコア機能。T2-1のプライバシーポリシー機能が有料プランの目玉になるため、T2-1と同時または直後に実装。
- **検証方法**: 開発ストアで全プランの課金フローが正常に動作すること。無料トライアルの開始・終了・課金開始が正しく処理されること。

### T2-3: ルートハンドラの統合テスト
- [ ] `app/routes/__tests__/app.wizard.test.tsx` 新規作成
  - loader: 既存データの読み込み、新規(データなし)
  - action (save-draft): 正常保存、サイズ超過、楽観的ロック競合
  - action (publish): 正常公開、バリデーションエラー、Shopify API失敗
  - action (publish): ページ新規作成 vs 更新 vs Shopify側削除後再作成
- [ ] `app/routes/__tests__/app._index.test.tsx` 新規作成
  - loader: ページ0件(EmptyState)、ページ1件以上
- [ ] Shopify Admin APIのモック(`vi.mock`)
- [ ] Prismaのモック
- **工数**: 2-3日
- **理由**: 現在のテストはユニットテストのみで、ルートハンドラのロジック(APIコール分岐、エラーハンドリング、DB操作)がテストされていない。リファクタリング時のデグレを防止するために統合テストが必要。
- **検証方法**: `npm run test` で新規テスト含む全テストがパスすること

### T2-4: Litestream バックアップ設定
- [ ] Dockerfile に Litestream バイナリのインストール追加
- [ ] `litestream.yml` 設定ファイル作成(S3 or GCS へのレプリケーション)
- [ ] `fly.toml` のCMDをLitestream経由の起動に変更
- [ ] バックアップ先のクラウドストレージ設定
- [ ] リストア手順のドキュメント化
- **工数**: 1日
- **理由**: SQLiteはファイルDB一本。Fly.ioのPersistent Volumeはマシン障害時にデータが失われるリスクがある。本番運用で実ユーザーデータを扱う前に必須。
- **検証方法**: fly.ioにデプロイ後、データを作成 → マシン再起動 → データが保持されていること

### T2-5: 利用規約 + 返品・交換ポリシー生成機能
- [ ] T2-1と同様の構造で2つのページタイプを追加
- **工数**: 各3-4日(テンプレート設計含む)
- **理由**: 4ページ揃ってBasicプランの完全な価値提案が成立する。T2-1のプライバシーポリシーでアーキテクチャが確立されていれば追加は効率的。

---

## Tier 3: 将来拡張 (Phase 3以降)

### T3-1: 越境EC対応(英語版ページ同時生成)
- **工数**: 2-3週間
- **理由**: Proプランの差別化機能。多言語テンプレート基盤の設計が必要。

### T3-2: 最終確認画面テキスト生成ガイド
- **工数**: 1週間
- **理由**: 2022年改正特商法対応。P2扱い。

### T3-3: デザインカスタマイズ(テーブルスタイル変更)
- **工数**: 1週間
- **理由**: Proプランの付加価値。現在のインラインスタイルベースから拡張。

---

## タイムライン概要

```
Week 1 前半 (Day 1-2):
  T0-1 Dockerfile修正             [15分]
  T0-2 公開フロー修正             [30分]
  T0-3 API Version修正            [15分]
  T0-4 スコープ方針決定・対応      [15分-2日]
  T0-5 プライバシーポリシー作成    [4-6時間]
  T0-7 DevConsoleチェック          [2-3時間]

Week 1 後半 (Day 3-5):
  T0-6 App Listing素材準備         [1-2日]
  --> App Store申請提出

Week 2-3 (審査待ち 5-10営業日):
  T1-5 楽観的ロック改善            [1時間]
  T1-6 離脱確認ダイアログ          [1.5時間]
  T1-7 APIリトライロジック         [2時間]
  T1-2 完了画面充実                [4時間]
  T1-4 ページ削除検知              [3時間]
  T1-1 フッターメニュー自動追加    [1.5日]
  T1-3 form_data暗号化            [1日]

Week 4-5 (App Store掲載後):
  T2-1 プライバシーポリシー生成    [5-7日]

Week 6-7:
  T2-2 Billing API連携            [5-7日]

Week 8-9:
  T2-3 統合テスト                  [2-3日]
  T2-4 Litestream設定             [1日]
  T2-5 利用規約 + 返品ポリシー     [6-8日]
```

---

## リスク・注意事項

1. **ApiVersion.January26 の存在確認**: `@shopify/shopify-app-remix` パッケージが `January26` をexportしているか未確認。存在しない場合はパッケージ更新が必要。
2. **Shopify審査のリードタイム**: 通常5-10営業日だが、修正要求(リジェクト)があると再申請でさらに1-2週間。Tier 0の品質を確実にすることが全体スケジュールに最も影響する。
3. **フッターメニューの多様性**: Shopifyテーマによってフッターメニューのhandleが異なる場合がある("footer", "footer-menu", "main-menu" 等)。Menu API実装時にユーザーにメニューを選択させるUIが必要。
4. **暗号化マイグレーション**: 既に開発ストアに平文データがある場合、暗号化導入時に既存データの扱い(一括暗号化 or 次回アクセス時の遅延暗号化)を決定する必要あり。
5. **プライバシーポリシーの法的レビュー**: 弁護士による正式レビューが理想だが、MVPフェーズではテンプレートベースで作成し、後で専門家レビューを受ける方針。

---

## 過去のMVP実装記録

<details>
<summary>Part 1: Specification.md 修正 (完了)</summary>

- [x] C-1: APIスコープ名・API種別の修正
- [x] C-2: セキュリティ仕様セクション新設(4.6)
- [x] C-3: テスト戦略セクション新設(4.8)
- [x] C-4: フィールド数の矛盾解消(15 -> 18フィールド)
- [x] C-5: テンプレートエンジンの明確化(TypeScriptタグ付きテンプレートリテラル)
- [x] M-1: データモデル再設計(Store認証のみ、PaymentMethod削除)
- [x] M-2: エラーハンドリング・エッジケースセクション新設(4.7)
- [x] M-3: SQLite + Fly.ioリスク追記
- [x] M-4: 自動保存の実装方針明記
- [x] M-5: バリデーション仕様追加(3.4)
- [x] M-6: ウィザード3ステップ化
- [x] M-7: フッターメニュー特定ロジック明記(4.7内に含む)
- [x] M-8: GDPR mandatory webhooks追記
- [x] M-9: XSS対策具体化(4.6内)
- [x] M-10: 免責事項の具体化
- [x] M-11: form_data JSONスキーマバージョニング(データモデル内)
- [x] M-12: リスクセクション追加項目
- [x] Minor: ダッシュボードEmpty State仕様追記
- [x] Minor: CSSテーマ追従方針
- [x] Minor: Step 2アコーディオンUI
- [x] Minor: MVPリリースチェックリスト追加

</details>

<details>
<summary>Part 2: MVP実装 (完了)</summary>

- [x] Step 1: プロジェクト初期化(Shopify CLI scaffold + Prisma)
- [x] Step 2: コアライブラリ(sanitize, templates, validation, db, shopify API)
- [x] Step 3: ウィザードUI(3ステップフォーム)
- [x] Step 4: ダッシュボード
- [x] Step 5: GDPR Webhooks + エッジケース
- [x] Step 6: テスト・品質(49テスト全パス)
- [x] Step 7: デプロイ準備(fly.toml、.env.example、Dockerfile本番DB対応、ランディングページ)

### Review Notes
- TypeScript: `npx tsc --noEmit` クリーンパス
- Tests: 49テスト全パス(sanitize 15, validation 19, tokushoho 15)
- XSSエスケープ: タグ付きテンプレートリテラルで自動エスケープ確認済み
- GDPR: customers/data_request, customers/redact, shop/redact 全実装
- 楽観的ロック: LegalPage.versionカラムによる競合検出実装
- メニュー重複防止: 既存アイテムチェック実装
- 住所非公開: on_request時に住所・電話番号の非表示確認テスト済み

</details>
