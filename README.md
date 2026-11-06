# やみちゃ工房 公式サイト

Astro + Cloudflare Workersで構築した「やみちゃ工房」の公式サイトです。

## 構成

```text
ブラウザ
  ↓ POST /api/chat
Cloudflare Worker（入力検証・利用制限）
  ↓ 公開実績 + 質問に関連する技術ノートの取得
Cloudflare Workers AI
  ↓ 回答 + 登録済み資料の出典
ブラウザ
```

モデル呼び出しは `src/services/ai/` に集約しています。ブラウザへAPIキーやモデル設定は渡しません。
サイトでは会話本文をサーバーに永続保存しません。入力内容はWorkers AIの応答処理に利用されます。

## 技術相談

業務改善だけでなく、AWS等のクラウド構成、LLM選定、RAGの設計・精度改善・権限管理を相談できます。
技術説明・比較・構成案と、業務改善の診断を使い分けます。追加質問は必要な場合だけ最大1問です。

- 公開実績の正本: `src/data/case-studies.js`
- AI案内用の実績・境界: `src/services/ai/studio-knowledge.ts`
- 公式資料を要約した技術ノート: `src/services/ai/technical-notes.js`
- 質問と直近のユーザー文脈から最大3件を選ぶ検索: `src/services/ai/technical-context.js`

小規模なキーワード検索型RAGであり、リアルタイムのWeb検索やベクトルDBは使いません。
資料にない最新料金や導入実績は補わず、工房の経験と一般的な技術情報を区別します。
出典リンクと確認日はサーバーの登録データから返し、AIが生成した任意URLはリンクにしません。
詳しい設計・制約・評価例は [技術相談の設計](docs/technical-consultation.md) を参照してください。

## ローカル起動・検証

Node 22.16以上を使用してください。

```sh
npm ci
npm run dev
```

Workers AIのローカル呼び出しにはCloudflareアカウントへのログインが必要です。
ローカルでも実際にAIを呼ぶと通常の利用量に加算されます。静的ページの本番ビルドにCloudflare APIトークンは不要です。

```sh
node --test tests/technical-consultation.test.mjs
npm run build
node scripts/verify-home.mjs
```

自動テストはCloudflareのバインディングをモック化し、実際の応答処理とAPIを検証します。
実モデルの推論品質や公開サイトの最終表示を測るテストではありません。

## Cloudflare設定と費用

`wrangler.jsonc` の既存バインディングを使います。

- Workers AI: `AI`
- Rate Limiting: `CHAT_RATE_LIMIT`（同一IPあたり8リクエスト/60秒、Cloudflareロケーション単位）

コード上の既定モデルは `@cf/meta/llama-3.3-70b-instruct-fp8-fast` です。
`WORKERS_AI_MODEL` が設定されている場合はその値を優先します。
以前の8B既定値からの変更や出力上限の拡張で、利用料金・無料枠の消費が増える可能性があります。
モデルの変更はCloudflareの利用状況と併せて評価してください。料金プランの変更や新規有料リソース作成は行っていません。

`CONSULTATION_MAX_OUTPUT_TOKENS` は既定2400、設定可能範囲1200〜3200です。
1リクエストにつきモデル呼び出しは1回のみで、自動再試行や別モデルへの切替はしません。
`AI_GATEWAY_ID` を指定すると既存Gatewayを利用し、`skipCache: true` / `collectLog: false` を指定します。
未設定時はWorkers AIを直接呼び出します。

## 利用制限とプライバシー

共有設定は `src/services/ai/consultation-limits.js` にあります。

- 1回の入力: 1200文字
- 1相談: ユーザー発言8回、会話全体8000文字
- リクエスト本文: 32000バイト（Content-Lengthがなくても実測）
- 同一オリジン、メッセージの順序・型をサーバー側で検証

会話回数はブラウザ上の相談単位の制限であり、利用者認証による月額課金上限ではありません。
プロバイダーエラーは分類コードだけを記録し、会話を含む可能性のある生のエラー本文は記録しません。

会話はページ内で保持し、「新しい相談」で初期化します。
`yamicha:consultation-updated` / `yamicha:consultation-handoff` イベントを維持しています。
「この内容で相談する」を選んだ場合のみ、同じタブの `sessionStorage` に引継ぎ情報を保存します。
機密情報、顧客情報、APIキー、パスワードは入力しないよう画面で案内しています。

## コマンドとデプロイ

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | ローカル開発サーバー |
| `npm run build` | 本番用ビルド |
| `npm run preview` | 本番用ビルドのローカル確認 |
| `npm run deploy` | ビルド後にCloudflare Workersへデプロイ |

GitHub Actionsで自動テスト・ビルド・生成されたホームページの検証を行います。
`main` へのpushで既存のCloudflare自動デプロイが実行されます。
