# やみちゃ工房 公式サイト

Astro + Cloudflare Workers で構築した「やみちゃ工房」の公式サイトです。

## 構成

```text
ブラウザ
  ↓ POST /api/chat
Cloudflare Worker（入力検証・利用制限）
  ↓ AI binding
Cloudflare Workers AI
```

ブラウザからAIへ直接接続せず、モデル名やAI呼び出しは `src/services/ai/` に集約しています。会話はv1ではサーバーへ永続保存しません。

## ローカル起動

```sh
npm ci
npm run dev
```

Workers AIのローカル呼び出しにはCloudflareアカウントへのログインが必要で、ローカル開発でもWorkers AIの利用量に加算されます。静的ページはNode環境で事前生成するため、本番ビルドにCloudflare APIトークンは不要です。

## Cloudflare の設定

`wrangler.jsonc` に以下を設定しています。

- Workers AI binding: `AI`
- Rate Limiting binding: `CHAT_RATE_LIMIT`（同一IPあたり8リクエスト/60秒）

既定モデルは `@cf/meta/llama-3.1-8b-instruct-fast` です。変更する場合はCloudflareの環境変数 `WORKERS_AI_MODEL` を設定します。モデル名はクライアントへ送信されません。

AI Gatewayを利用する場合は、CloudflareでGatewayを用意し、環境変数 `AI_GATEWAY_ID` にGateway IDを設定します。未設定時はWorkers AIを直接呼び出します。会話内容をキャッシュ・ログ保存しないよう、Gateway経由でも `skipCache: true` と `collectLog: false` を指定しています。

## チャットの利用制限

- 1回の入力: 800文字まで
- 1相談: ユーザー発言6回まで
- 会話全体: 6,000文字まで
- リクエスト本文: 16KBまで
- 同一IP: 8リクエスト/60秒（Cloudflareロケーション単位）
- 同一オリジン確認、メッセージ順序・型のサーバー検証

最終診断は画面表示とは別に構造化データとしてブラウザ内で保持し、`yamicha:consultation-updated` と `yamicha:consultation-handoff` イベントで将来の問い合わせ画面へ渡せます。「この内容で相談する」を押した場合のみ、同一タブの `sessionStorage` に引き継ぎデータを保存します。

## AI providerの変更

共通入口は `src/services/ai/consultation.ts` の `generateConsultationResponse()` です。Geminiなどを追加する場合は `src/services/ai/providers/` にproviderを実装し、`consultation.ts` のprovider一覧へ登録します。APIキーが必要なproviderでは、Cloudflare Secretsからサーバー側だけで読み取ってください。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | ローカル開発サーバーを起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm run preview` | 本番用ビルドをローカル確認 |
| `npm run deploy` | ビルド後に Cloudflare Workers へデプロイ |

GitHub の `main` ブランチへの push を起点に、既存の Cloudflare 自動デプロイが実行されます。
