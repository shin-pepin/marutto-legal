import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "プライバシーポリシー | まるっと法務作成" },
    {
      name: "description",
      content: "まるっと法務作成アプリのプライバシーポリシー",
    },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.8,
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>プライバシーポリシー</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        最終更新日: 2025年2月25日
      </p>

      <p>
        まるっと法務作成（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本アプリが収集する情報、その使用目的、および保護方法について説明します。
      </p>

      <Section title="1. 収集する情報">
        <p>
          本アプリは、特定商取引法に基づく表記ページを作成するために、以下の情報を収集します。
        </p>
        <ul>
          <li>事業者名（法人名または個人事業主名）</li>
          <li>代表者名</li>
          <li>事業所の住所</li>
          <li>電話番号</li>
          <li>メールアドレス</li>
          <li>販売条件（支払い方法、送料、返品条件など）</li>
        </ul>
      </Section>

      <Section title="2. 情報の使用目的">
        <p>収集した情報は、以下の目的にのみ使用されます。</p>
        <ul>
          <li>
            特定商取引法に基づく表記ページのHTML生成およびShopifyストアへの公開
          </li>
          <li>入力内容のプレビュー表示</li>
        </ul>
      </Section>

      <Section title="3. 情報の保存">
        <p>
          収集した情報は、アプリケーションサーバー上のSQLiteデータベースに保存されます。データは暗号化された通信（HTTPS）を通じてのみ送受信されます。
        </p>
      </Section>

      <Section title="4. 第三者への提供">
        <p>
          本アプリは、収集した情報を第三者に提供、販売、または共有することはありません。情報はShopify
          Pages
          APIを通じて、お客様自身のShopifyストアにHTMLとして送信されるのみです。
        </p>
      </Section>

      <Section title="5. データの保持期間">
        <p>
          アプリのアンインストール時に、Shopifyからの通知（webhook）を受信し、該当ストアに関連するすべてのデータを48時間以内に完全に削除します。
        </p>
      </Section>

      <Section title="6. GDPRへの対応">
        <p>本アプリは、以下のGDPR関連webhookに対応しています。</p>
        <ul>
          <li>
            <strong>顧客データリクエスト</strong>:
            保存している顧客関連データの開示
          </li>
          <li>
            <strong>顧客データ削除</strong>: 顧客関連データの完全削除
          </li>
          <li>
            <strong>ショップデータ削除</strong>:
            ストアに関連する全データの完全削除
          </li>
        </ul>
      </Section>

      <Section title="7. お問い合わせ">
        <p>
          プライバシーに関するご質問やご要望がございましたら、以下までご連絡ください。
        </p>
        <p>
          メール:{" "}
          <a href="mailto:support@pepin.co.jp">support@pepin.co.jp</a>
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}
