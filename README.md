# やみちゃ工房 公式サイト

Astro + Cloudflare Workers で構築した「やみちゃ工房」の公式サイトです。

## ローカル起動

```sh
npm ci
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

AIチャットを使う場合は、`.dev.vars` の `OPENAI_API_KEY` を実際の値へ置き換えてください。`.dev.vars` は Git の管理対象外です。

## Cloudflare の設定

本番用の API キーは、コードや `wrangler.jsonc` に記載せず、Workers の Secret として登録します。

```sh
npx wrangler secret put OPENAI_API_KEY
```

利用モデルを変更する場合は、Cloudflare の環境変数 `OPENAI_MODEL` を設定してください。未設定時は `gpt-5-mini` を使用します。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | ローカル開発サーバーを起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm run preview` | 本番用ビルドをローカル確認 |
| `npm run deploy` | ビルド後に Cloudflare Workers へデプロイ |

GitHub の `main` ブランチへの push を起点に、既存の Cloudflare 自動デプロイが実行されます。
