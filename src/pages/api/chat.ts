import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
};

type OpenAIResponse = {
	output_text?: string;
	output?: Array<{
		type?: string;
		content?: Array<{ type?: string; text?: string }>;
	}>;
	error?: { message?: string };
};

const instructions = `あなたは「やみちゃ工房」の業務改善AIコンシェルジュです。
相談者の面倒な作業を聞き、実務的な改善方法を日本語で提案してください。

方針:
- AI導入を目的にせず、通常のプログラム、Excel、既存サービスも含めて適切な方法を選ぶ
- 最初は相談内容を短く整理し、自動化の可能性と理由を伝える
- 情報が足りない場合は、一度に最大2問だけ具体的な追加質問をする
- 十分な情報があれば「現状」「改善案」「確認したいこと」を簡潔に示す
- 根拠のない削減時間、価格、納期は断定しない
- 法律・税務・医療などの専門判断は行わない
- 個人情報や機密情報を追加で求めない
- やみちゃ工房への相談につながる内容なら、最後に「この内容なら、やみちゃ工房でご相談いただけます。」と自然に案内する
- 1回の返答は350文字程度まで。Markdownの見出しは使わず、読みやすい短い段落か箇条書きにする`;

const json = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
		},
	});

const extractText = (data: OpenAIResponse) => {
	if (data.output_text?.trim()) return data.output_text.trim();
	return data.output
		?.flatMap((item) => item.content ?? [])
		.find((item) => item.type === 'output_text' && item.text)
		?.text?.trim();
};

export const POST: APIRoute = async ({ request }) => {
	if (!request.headers.get('content-type')?.includes('application/json')) {
		return json({ error: '送信形式が正しくありません。' }, 415);
	}

	let body: { messages?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: '相談内容を読み取れませんでした。' }, 400);
	}

	if (!Array.isArray(body.messages)) {
		return json({ error: '相談内容を入力してください。' }, 400);
	}

	const messages = body.messages
		.slice(-8)
		.filter(
			(message): message is ChatMessage =>
				typeof message === 'object' &&
				message !== null &&
				(message.role === 'user' || message.role === 'assistant') &&
				typeof message.content === 'string' &&
				message.content.trim().length > 0 &&
				message.content.length <= 1000,
		)
		.map((message) => ({ role: message.role, content: message.content.trim() }));

	if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
		return json({ error: '相談内容を入力してください。' }, 400);
	}

	const runtimeEnv = env as unknown as {
		OPENAI_API_KEY?: string;
		OPENAI_MODEL?: string;
	};

	if (!runtimeEnv.OPENAI_API_KEY) {
		return json({ error: 'AI相談室は現在準備中です。環境設定後にご利用いただけます。' }, 503);
	}

	try {
		const response = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${runtimeEnv.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: runtimeEnv.OPENAI_MODEL || 'gpt-5-mini',
				instructions,
				input: messages,
				max_output_tokens: 700,
				store: false,
			}),
		});

		const data = (await response.json()) as OpenAIResponse;
		if (!response.ok) {
			console.error('OpenAI API error', response.status, data.error?.message);
			return json({ error: 'ただいまAI相談室が混み合っています。少し時間をおいてお試しください。' }, 502);
		}

		const reply = extractText(data);
		if (!reply) return json({ error: '回答を作成できませんでした。もう一度お試しください。' }, 502);
		return json({ reply });
	} catch (error) {
		console.error('Chat request failed', error);
		return json({ error: 'ただいまAI相談室に接続できません。少し時間をおいてお試しください。' }, 502);
	}
};
