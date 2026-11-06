import { CHAT_LIMITS } from './consultation-limits.js';

export function validateMessages(value) {
  if (!Array.isArray(value) || !value.length) return { error: '相談内容を入力してください。' };
  if (value.length > CHAT_LIMITS.turns * 2 - 1) return { error: 'この相談の会話上限に達しました。新しい相談を始めてください。' };
  const messages = [];
  let total = 0;
  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    const role = index % 2 === 0 ? 'user' : 'assistant';
    if (!item || typeof item !== 'object' || item.role !== role || typeof item.content !== 'string') return { error: '会話データの形式が正しくありません。' };
    const content = item.content.trim();
    const limit = role === 'user' ? CHAT_LIMITS.userChars : CHAT_LIMITS.assistantChars;
    if (!content || content.length > limit) return { error: `1回の${role === 'user' ? '入力' : '応答'}は${limit}文字以内にしてください。` };
    total += content.length;
    messages.push({ role, content });
  }
  if (messages.at(-1)?.role !== 'user') return { error: '新しい相談内容を入力してください。' };
  if (total > CHAT_LIMITS.totalChars) return { error: '会話の文字数上限に達しました。必要な条件をまとめて、新しい相談を始めてください。' };
  return { messages };
}

export async function readJsonBody(request) {
  if (Number(request.headers.get('content-length')) > CHAT_LIMITS.bodyBytes) throw new Error('PAYLOAD_TOO_LARGE');
  if (!request.body) throw new Error('INVALID_JSON');
  const reader = request.body.getReader();
  const parts = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > CHAT_LIMITS.bodyBytes) {
        await reader.cancel();
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_JSON');
  return parsed;
}
