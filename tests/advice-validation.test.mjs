import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { privacyReviewIssues } from '../src/services/ai/advice-validation.js';
const user = (content) => ({ role: 'user', content });
const check = (reply, messages = []) => privacyReviewIssues({ reply, diagnosis: null, cta: { message: '' } }, messages);

test('observed unconditional local privacy guarantee is blocked', () => {
  assert.deepEqual(check('ローカルLLMを採用することで、社外へのデータ送信を完全に防ぐことができます。'), ['LOCAL_PRIVACY_GUARANTEE']);
});
for (const text of [
  'ローカルLLMだけで社外送信を完全に防げるとは限りません。',
  'Ollamaを置くだけで漏えいを完全に防ぐことは保証できません。',
  'ローカルLLMなら社外送信を完全に防ぐという説明は誤りです。',
  'ローカルLLMを使い、外向き通信とクラウド機能を確認してください。',
]) test(`safe qualification remains publishable: ${text}`, () => assert.deepEqual(check(text), []));
test('observed real-document comparison is blocked while permission is pending', () => {
  assert.ok(check('まずはローカルLLMと外部LLM APIの両方を試して、実際の文書と質問で評価してください。', [user('社外へのデータ送信可否はまだ確認中です。')]).includes('UNAPPROVED_REAL_DATA'));
});
for (const state of ['社外送信禁止です。', '外部送信は未承認です。']) {
  test(`real data blocked: ${state}`, () => assert.ok(check('実データを外部LLM APIへ送信して比較します。', [user(state)]).includes('UNAPPROVED_REAL_DATA')));
}
test('public or synthetic evaluation remains possible without approval', () => {
  assert.deepEqual(check('社内資料は送信せず、公開または合成データで外部LLM APIを比較します。', [user('社外送信は未確認です。')]), []);
});
test('explicit later approval supersedes pending user state', () => {
  assert.deepEqual(check('実データを外部LLM APIで評価します。', [user('社外送信は禁止です。'), user('条件を訂正します。外部送信は許可済みです。')]), []);
});
test('assistant-only approval does not relax user constraint', () => {
  assert.ok(check('実データを外部LLM APIで評価します。', [user('社外送信は禁止です。'), { role: 'assistant', content: '外部送信は許可済みです。' }]).includes('UNAPPROVED_REAL_DATA'));
});
test('guard is non-mutating and checks diagnosis / CTA too', () => {
  const response = { reply: '案を検討します。', diagnosis: { recommended_solution: ['ローカルLLMなら社外送信を完全に防ぐことができます。'] }, cta: { message: '' } };
  const original = structuredClone(response);
  assert.ok(privacyReviewIssues(response, []).includes('LOCAL_PRIVACY_GUARANTEE'));
  assert.deepEqual(response, original);
});
test('unrelated topic does not retain permission state', () => {
  assert.deepEqual(check('実データを外部LLM APIで評価します。', [user('社外送信禁止です。'), user('別件です。公開資料の比較です。')]), []);
});
test('provider fails closed and preserves original dialogue roles without another model call', async () => {
  const text = await readFile(new URL('../src/services/ai/providers/workers-ai.ts', import.meta.url), 'utf8');
  assert.ok(text.includes('privacyReviewIssues(response, messages)'));
  assert.ok(text.includes("throw new Error('AI_ADVICE_REVIEW_REQUIRED')"));
  assert.ok(text.includes('role: message.role'));
  assert.equal((text.match(/await ai\.run\(/g) || []).length, 1);
});
