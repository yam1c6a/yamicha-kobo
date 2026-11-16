import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;
type ContactEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  CONTACT_RATE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
};
const reply = (message: string, status = 200) => new Response(JSON.stringify({ message }), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
export const GET: APIRoute = async () => {
  const e = env as ContactEnv;
  const ready = Boolean(e.RESEND_API_KEY && e.RESEND_FROM && e.TURNSTILE_SECRET_KEY && e.TURNSTILE_SITE_KEY && e.CONTACT_RATE_LIMIT);
  return new Response(JSON.stringify({ ready, siteKey: ready ? e.TURNSTILE_SITE_KEY : null }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) return reply('送信元を確認できません。', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply('送信形式が正しくありません。', 415);
  const e = env as ContactEnv;
  if (!(e.RESEND_API_KEY && e.RESEND_FROM && e.TURNSTILE_SECRET_KEY && e.TURNSTILE_SITE_KEY && e.CONTACT_RATE_LIMIT)) return reply('現在フォーム送信を準備中です。メールでお問い合わせください。', 503);
  if (Number(request.headers.get('content-length') || 0) > 16000) return reply('送信内容が大きすぎます。', 413);
  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reply('送信内容が大きすぎます。', 413);
    input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid');
  } catch { return reply('入力内容を読み取れませんでした。', 400); }
  const field = (key: string, max: number) => typeof input[key] === 'string' && (input[key] as string).trim().length <= max ? (input[key] as string).trim() : '';
  const name = field('name', 100), email = field('email', 254), company = field('company', 200), message = field('message', 4000);
  const token = field('turnstileToken', 2048);
  if (!name || !email || !message || !token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email)) return reply('入力内容を確認してください。', 400);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  try {
    const allowed = await e.CONTACT_RATE_LIMIT.limit({ key: ip });
    if (!allowed.success) return reply('送信回数が多すぎます。時間をおいてお試しください。', 429);
  } catch { return reply('送信制限を確認できません。後ほどお試しください。', 503); }
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: e.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    if (!verify.ok) return reply('認証を確認できません。再度お試しください。', 503);
    const result = await verify.json() as { success?: boolean; hostname?: string };
    if (!result.success || result.hostname !== new URL(request.url).hostname) return reply('認証に失敗しました。もう一度お試しください。', 403);
  } catch { return reply('認証処理に失敗しました。', 503); }
  const text = ['やみちゃ工房 ご担当者さま', '', 'ホームページからご相談です。', '', 'お名前：' + name, 'メールアドレス：' + email, ...(company ? ['会社名・屋号：' + company] : []), '', '【ご相談内容】', message].join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + e.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ from: e.RESEND_FROM, to: ['contact@yamicha.com'], reply_to: email, subject: 'やみちゃ工房へのご相談', text }),
    });
    if (!response.ok) { console.error('Contact delivery rejected', response.status); return reply('送信できませんでした。時間をおいてお試しください。', 502); }
    return reply('ご相談を受け付けました。');
  } catch { console.error('Contact delivery network failure'); return reply('送信できませんでした。時間をおいてお試しください。', 502); }
};
