import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateConsultationResponse } from '../../services/ai/consultation';
import { getAIConfig } from '../../services/ai/config';
import { CHAT_LIMITS } from '../../services/ai/consultation-limits.js';
import { validateMessages, readJsonBody } from '../../services/ai/chat-validation.js';
import type { AIEnvironment, ChatMessage } from '../../services/ai/types';

export const prerender = false;
type RuntimeEnvironment = AIEnvironment & { CHAT_RATE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> } };
const json = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) {
    return json({ error: 'このサイトから送信してください。', code: 'INVALID_ORIGIN' }, 403);
  }
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: '送信形式が正しくありません。', code: 'INVALID_CONTENT_TYPE' }, 415);
  const runtimeEnv = env as unknown as RuntimeEnvironment;
  try {
    if (runtimeEnv.CHAT_RATE_LIMIT) {
      const allowed = await runtimeEnv.CHAT_RATE_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') || 'local-development' });
      if (!allowed.success) return json({ error: '短時間の利用回数が上限に達しました。1分ほど待ってからお試しください。', code: 'RATE_LIMITED' }, 429, { 'Retry-After': '60' });
    }
  } catch {
    return json({ error: '利用状況を確認できません。時間をおいてお試しください。', code: 'LIMIT_UNAVAILABLE' }, 503);
  }
  let body;
  try { body = await readJsonBody(request); }
  catch (error) {
    const large = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE';
    return json({ error: large ? '送信内容が大きすぎます。' : '相談内容を読み取れませんでした。', code: large ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON' }, large ? 413 : 400);
  }
  if (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.sessionId))) {
    return json({ error: 'セッション情報が正しくありません。', code: 'INVALID_SESSION' }, 400);
  }
  const validation = validateMessages(body.messages);
  if (!validation.messages) return json({ error: validation.error, code: 'INVALID_MESSAGES' }, 400);
  const turns = validation.messages.filter((message) => message.role === 'user').length;
  // Configured public model ID, not attestation and not a claim that catalog
  // responses invoke inference. X-Consultation-Source distinguishes those.
  const configuredModel = getAIConfig(runtimeEnv).model;
  const diagnostics = {
    'X-Consultation-Model': /^@cf\/[a-zA-Z0-9_./-]{1,120}$/.test(configuredModel) ? configuredModel : 'custom',
    'X-Consultation-Revision': 'quality-20261106-r1',
  };
  try {
    const result = await generateConsultationResponse({ messages: validation.messages as ChatMessage[], env: runtimeEnv });
    const answerSource = result.answerSource === 'public-catalog' ? 'public-catalog' : 'model';
    return json({
      message: { id: crypto.randomUUID(), role: 'assistant', content: result.reply, createdAt: new Date().toISOString() },
      phase: result.phase, questions: result.questions, diagnosis: result.diagnosis,
      cta: result.cta, sources: result.sources || [], sourceNotice: result.sourceNotice || '', answerSource,
      limits: { turnsUsed: turns, turnsRemaining: Math.max(0, CHAT_LIMITS.turns - turns), maxTurns: CHAT_LIMITS.turns },
    }, 200, { ...diagnostics, 'X-Consultation-Source': answerSource });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const review = message === 'AI_ADVICE_REVIEW_REQUIRED';
    const quota = /3036|free allocation|daily allocation|quota/i.test(message);
    const invalid = /AI_INVALID_RESPONSE|JSON Mode|JSON|Unexpected token/i.test(message);
    const missing = /binding is not configured/i.test(message);
    const code = review ? 'AI_ADVICE_REVIEW_REQUIRED' : quota ? 'AI_DAILY_LIMIT' : missing ? 'AI_NOT_CONFIGURED' : invalid ? 'AI_INVALID_RESPONSE' : 'AI_UNAVAILABLE';
    console.error('AI consultation failed', code);
    return json({ code, error: review ? '回答に安全性の確認が必要な説明が含まれたため、表示を止めました。実際の機密資料は入力せず、条件だけでご相談ください。直接のお問い合わせも利用できます。'
      : quota ? '本日のAI利用枠に達しました。直接お問い合わせください。'
      : missing ? 'AI相談室の接続設定を確認しています。直接お問い合わせください。'
      : invalid ? '回答を正しい形式で受け取れませんでした。入力内容は残してあるので、もう一度お試しください。'
      : 'ただいまAI相談室に接続できません。時間をおいてお試しください。' }, quota || missing ? 503 : 502, diagnostics);
  }
};
