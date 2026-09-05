import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateConsultationResponse } from '../../services/ai/consultation';
import type { AIEnvironment, ChatMessage } from '../../services/ai/types';

export const prerender = false;

const MAX_MESSAGE_CHARS = 800;
const MAX_ASSISTANT_MESSAGE_CHARS = 1_600;
const MAX_USER_TURNS = 6;
const MAX_MESSAGES = MAX_USER_TURNS * 2 - 1;
const MAX_TOTAL_CHARS = 6_000;
const MAX_BODY_BYTES = 16_000;

type ChatRequest = {
	messages?: unknown;
	sessionId?: unknown;
};

type RateLimitBinding = {
	limit(options: { key: string }): Promise<{ success: boolean }>;
};

type RuntimeEnvironment = AIEnvironment & {
	CHAT_RATE_LIMIT?: RateLimitBinding;
};

const json = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			...headers,
		},
	});

const validateMessages = (value: unknown): { messages?: ChatMessage[]; error?: string } => {
	if (!Array.isArray(value) || value.length === 0) return { error: '相談内容を入力してください。' };
	if (value.length > MAX_MESSAGES) return { error: 'この相談で利用できる会話回数に達しました。' };

	const messages: ChatMessage[] = [];
	let totalChars = 0;
	let userTurns = 0;

	for (let index = 0; index < value.length; index += 1) {
		const message = value[index];
		const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
		if (
			typeof message !== 'object' ||
			message === null ||
			(message as { role?: unknown }).role !== expectedRole ||
			typeof (message as { content?: unknown }).content !== 'string'
		) {
			return { error: '会話データの形式が正しくありません。' };
		}

		const content = (message as { content: string }).content.trim();
		const maxChars = expectedRole === 'user' ? MAX_MESSAGE_CHARS : MAX_ASSISTANT_MESSAGE_CHARS;
		if (!content || content.length > maxChars) {
			return { error: expectedRole === 'user'
				? `1回の入力は${MAX_MESSAGE_CHARS}文字以内にしてください。`
				: '会話データの形式が正しくありません。' };
		}

		totalChars += content.length;
		if (expectedRole === 'user') userTurns += 1;
		messages.push({ role: expectedRole, content });
	}

	if (messages.at(-1)?.role !== 'user') return { error: '新しい相談内容を入力してください。' };
	if (userTurns > MAX_USER_TURNS) return { error: 'この相談で利用できる会話回数に達しました。' };
	if (totalChars > MAX_TOTAL_CHARS) return { error: '会話が長くなったため、新しい相談としてやり直してください。' };
	return { messages };
};

const isSameOriginRequest = (request: Request) => {
	const fetchSite = request.headers.get('sec-fetch-site');
	if (fetchSite === 'cross-site') return false;
	const origin = request.headers.get('origin');
	return !origin || origin === new URL(request.url).origin;
};

export const POST: APIRoute = async ({ request }) => {
	if (!isSameOriginRequest(request)) return json({ error: 'このサイトから送信してください。', code: 'INVALID_ORIGIN' }, 403);
	if (!request.headers.get('content-type')?.includes('application/json')) {
		return json({ error: '送信形式が正しくありません。', code: 'INVALID_CONTENT_TYPE' }, 415);
	}

	const contentLength = Number(request.headers.get('content-length') || 0);
	if (contentLength > MAX_BODY_BYTES) return json({ error: '送信内容が大きすぎます。', code: 'PAYLOAD_TOO_LARGE' }, 413);

	const runtimeEnv = env as unknown as RuntimeEnvironment;
	const ipAddress = request.headers.get('cf-connecting-ip') || 'local-development';
	if (runtimeEnv.CHAT_RATE_LIMIT) {
		const rateLimit = await runtimeEnv.CHAT_RATE_LIMIT.limit({ key: ipAddress });
		if (!rateLimit.success) {
			return json(
				{ error: '短時間の利用回数が上限に達しました。1分ほど待ってからお試しください。', code: 'RATE_LIMITED' },
				429,
				{ 'Retry-After': '60' },
			);
		}
	}

	let body: ChatRequest;
	try {
		body = await request.json();
	} catch {
		return json({ error: '相談内容を読み取れませんでした。', code: 'INVALID_JSON' }, 400);
	}

	if (
		body.sessionId !== undefined &&
		(typeof body.sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.sessionId))
	) {
		return json({ error: 'セッション情報が正しくありません。', code: 'INVALID_SESSION' }, 400);
	}

	const validation = validateMessages(body.messages);
	if (!validation.messages) return json({ error: validation.error, code: 'INVALID_MESSAGES' }, 400);

	const userTurns = validation.messages.filter((message) => message.role === 'user').length;
	try {
		const result = await generateConsultationResponse({ messages: validation.messages, env: runtimeEnv });
		return json({
			message: {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: result.reply,
				createdAt: new Date().toISOString(),
			},
			phase: result.phase,
			questions: result.questions,
			diagnosis: result.phase === 'diagnosis' ? result.diagnosis : null,
			cta: result.cta,
			limits: {
				turnsUsed: userTurns,
				turnsRemaining: Math.max(0, MAX_USER_TURNS - userTurns),
				maxTurns: MAX_USER_TURNS,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Workers AI consultation failed', message);
		if (/3036|free allocation|daily allocation|quota/i.test(message)) {
			return json({ error: '本日のAI利用枠に達しました。明日以降にもう一度お試しください。', code: 'AI_DAILY_LIMIT' }, 503);
		}
		if (/binding is not configured/i.test(message)) {
			return json({ error: 'AI相談室の接続設定を確認しています。しばらくしてからお試しください。', code: 'AI_NOT_CONFIGURED' }, 503);
		}
		return json({ error: 'ただいまAI相談室に接続できません。少し時間をおいてお試しください。', code: 'AI_UNAVAILABLE' }, 502);
	}
};
