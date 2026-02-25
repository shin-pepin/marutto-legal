import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>
          まるっと法務作成
        </h1>
        <p className={styles.text}>
          Shopifyストアに必要な特商法ページを、フォーム入力だけで自動生成。フッターへの配置まで自動で完了します。
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>ショップドメイン</span>
              <input className={styles.input} type="text" name="shop" />
              <span>例: my-shop.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              ログイン
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>かんたん3ステップ</strong>
            。フォームに入力するだけで特定商取引法に基づく表記ページを自動生成。
          </li>
          <li>
            <strong>フッター自動配置</strong>
            。生成と同時にフッターメニューへリンクを自動追加。
          </li>
          <li>
            <strong>住所非公開対応</strong>
            。個人事業主向けの住所非公開設定に対応。
          </li>
        </ul>
      </div>
    </div>
  );
}
