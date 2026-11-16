# 問い合わせフォームの直接送信（準備手順）

この変更は**設定完了前に公開しない**。未設定時は `mailto:` の従来送信を維持し、直接送信ボタンは表示しない。

1. Resendで `send.yamicha.com` を送信ドメインとして追加し、Resendが提示するDNSレコードをCloudflare DNSに設定して認証する。Google Workspaceの `yamicha.com` のMXレコードは変更しない。
2. Resend APIキーを発行する。Cloudflare Worker `yamicha-kobo` のSecretに `RESEND_API_KEY` を設定する。キーをGitHubに書かない。
3. Workerの `RESEND_FROM` に認証済みドメインの送信元（例：`やみちゃ工房 <notifications@send.yamicha.com>`）を設定する。受信先は `contact@yamicha.com`、返信先はフォーム入力メールアドレス。
4. Cloudflare Turnstileで `yamicha.com` のウィジェットを作成し、Workerに `TURNSTILE_SITE_KEY`（公開キー）と `TURNSTILE_SECRET_KEY`（Secret）を設定する。プレビュー環境でテストする場合はそのホストも許可する。
5. `wrangler.jsonc` の `CONTACT_RATE_LIMIT` binding を反映し、Cloudflare Workerをデプロイする。
6. `GET /api/contact` の `ready: true` を確認。テストフォームを送信し、Turnstile検証、Resend受け付け、Google Workspaceの受信箱への実到達、返信先、エラー表示、重複送信を確認する。
7. テストが完了するまで、本番の従来方式を維持する。

安全上の制約：サーバー側でOrigin・入力長・メール形式・Turnstile token/hostname・IPレート制限を検証。送信本文やAPIキーはログに出さない。Resendがリクエストを受理した時点を「受付」と表示し、到達保証とは区別する。

注意：CloudflareのRate Limiting bindingはサービス契約・利用条件に依存するため、デプロイ前に利用可否を確認する。