import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

// Compile a temporary copy of the actual service and API modules, without adding
// test dependencies or calling any external AI. Only the Cloudflare binding is mocked.
const root = await mkdtemp(path.join(tmpdir(), 'yamicha-consultation-'));
await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
await writeFile(path.join(root, 'runtime.js'), 'export const env = {};');
async function compile(source, target) {
  await mkdir(target, { recursive: true });
  for (const item of await readdir(source, { withFileTypes: true })) {
    const input = path.join(source, item.name);
    if (item.isDirectory()) { await compile(input, path.join(target, item.name)); continue; }
    if (!/\.(?:js|ts)$/.test(item.name) || item.name.endsWith('.d.ts')) continue;
    let code = await readFile(input, 'utf8');
    if (item.name.endsWith('.ts')) code = stripTypeScriptTypes(code, { mode: 'strip' });
    code = code.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, start, specifier, end) =>
      `${start}${path.extname(specifier) ? specifier : `${specifier}.js`}${end}`);
    code = code.replace(/(['"])cloudflare:workers\1/g, JSON.stringify(pathToFileURL(path.join(root, 'runtime.js')).href));
    await writeFile(path.join(target, item.name.replace(/\.ts$/, '.js')), code);
  }
}
await compile(fileURLToPath(new URL('../src', import.meta.url)), path.join(root, 'src'));
after(() => rm(root, { recursive: true, force: true }));
const load = (file) => import(pathToFileURL(path.join(root, file)).href);
const { retrieveTechnicalNotes, resolveSources, freshnessNotice } = await load('src/services/ai/technical-context.js');
const { technicalNotes } = await load('src/services/ai/technical-notes.js');
const { WorkersAIProvider, parseJsonResponse, normalizeResponse } = await load('src/services/ai/providers/workers-ai.js');
const { applyConversationPolicy } = await load('src/services/ai/conversation-policy.js');
const { buildAssistantHistory } = await load('src/services/ai/consultation-history.js');
const { getAIConfig } = await load('src/services/ai/config.js');
const { CHAT_LIMITS } = await load('src/services/ai/consultation-limits.js');
const { validateMessages, readJsonBody } = await load('src/services/ai/chat-validation.js');
const { POST } = await load('src/pages/api/chat.js');
const { env } = await load('runtime.js');
const user = (content) => ({ role: 'user', content });
const answer = (overrides = {}) => ({ phase: 'answer', reply: '条件を整理し、選択肢を比較します。', questions: [], diagnosis: null, source_ids: [], cta: { show: false, message: '' }, ...overrides });
const makeRequest = (body, options = {}) => new Request('https://example.test/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test', ...options.headers }, body: JSON.stringify(body) });

for (const [query, expected] of [
  ['AWSでEC2とFargateを比較したい', 'aws-compute'],
  ['IAMロールとアクセスキーの扱いは？', 'aws-security'],
  ['LLMの選び方と比較評価を知りたい', 'llm-selection'],
  ['社外に出せない資料でローカルLLMを使いたい', 'llm-local'],
  ['RAGで社内文書を検索したい', 'rag-design'],
  ['RAGの精度が悪く、検索結果と回答が間違う', 'rag-quality'],
  ['RAGで部署ごとに閲覧権限を分けたい', 'rag-security'],
]) test(`retrieval: ${query}`, () => assert.ok(retrieveTechnicalNotes([user(query)]).some((note) => note.id === expected)));

test('notes have reviewed, unique primary-source metadata', () => {
  assert.equal(new Set(technicalNotes.map((note) => note.id)).size, technicalNotes.length);
  for (const note of technicalNotes) {
    assert.match(note.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new URL(note.url).protocol, 'https:');
    assert.ok(['docs.aws.amazon.com', 'learn.microsoft.com', 'docs.ollama.com'].includes(new URL(note.url).hostname));
  }
});
test('English keyword boundaries and unrelated requests do not retrieve RAG', () => {
  assert.equal(retrieveTechnicalNotes([user('storage')]).length, 0);
  assert.equal(retrieveTechnicalNotes([user('おすすめの料理は？')]).length, 0);
});
test('short follow-up carries the user topic, not assistant-injected keywords', () => {
  const messages = [user('RAGの精度が悪い'), { role: 'assistant', content: 'AWS EC2 IAM' }, user('それを詳しく')];
  assert.ok(retrieveTechnicalNotes(messages).some((note) => note.id === 'rag-quality'));
  assert.ok(retrieveTechnicalNotes(messages).every((note) => !note.id.startsWith('aws-')));
});
test('topic change does not drag previous retrieval into new unrelated question', () => {
  assert.equal(retrieveTechnicalNotes([user('RAGの精度'), user('おすすめの料理は？')]).length, 0);
});
test('generic comparison and permission terms do not cross unrelated domains', () => {
  assert.ok(retrieveTechnicalNotes([user('AWSで構成を比較')]).every((note) => note.id.startsWith('aws-')));
  assert.ok(retrieveTechnicalNotes([user('RAGの部署ごとの閲覧権限')]).every((note) => note.id.startsWith('rag-')));
});
test('at most three notes; unknown or model-invented source IDs are dropped', () => {
  const notes = retrieveTechnicalNotes([user('AWS LLM RAG 精度 権限 コスト')]);
  assert.ok(notes.length <= 3);
  const sources = resolveSources([notes[0].id, notes[0].id, 'https://evil.test', 'invented'], notes);
  assert.equal(sources.length, 1); assert.equal(sources[0].url, notes[0].url);
});
test('latest prices and stale notes carry an explicit warning', () => {
  assert.ok(freshnessNotice([user('今のAWSの料金は？')], []));
  assert.ok(freshnessNotice([user('RAGとは？')], technicalNotes, new Date('2027-03-01')));
  assert.equal(freshnessNotice([user('RAGとは？')], technicalNotes, new Date('2026-11-06')), '');
});
test('model override retained; generation budget is bounded', () => {
  assert.equal(getAIConfig({}).model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(getAIConfig({ WORKERS_AI_MODEL: ' custom ' }).model, 'custom');
  assert.equal(getAIConfig({ CONSULTATION_MAX_OUTPUT_TOKENS: '999999' }).maxTokens, 3200);
  assert.equal(getAIConfig({ CONSULTATION_MAX_OUTPUT_TOKENS: 'NaN' }).maxTokens, CHAT_LIMITS.outputTokens);
});
test('JSON string, fenced JSON and object results are supported', () => {
  assert.equal(parseJsonResponse({ response: JSON.stringify(answer()) }).phase, 'answer');
  assert.equal(parseJsonResponse({ response: '```json\n' + JSON.stringify(answer()) + '\n```' }).phase, 'answer');
  assert.equal(parseJsonResponse({ response: answer() }).phase, 'answer');
  for (const value of [null, [], 'null', '{broken']) assert.throws(() => parseJsonResponse(value));
});
test('no silent reply truncation; technology answer has no diagnosis', () => {
  assert.throws(() => normalizeResponse(answer({ reply: 'a'.repeat(CHAT_LIMITS.replyChars + 1) })));
  assert.throws(() => normalizeResponse(answer({ reply: '' })));
  assert.equal(normalizeResponse(answer({ diagnosis: {} })).diagnosis, null);
  assert.equal(normalizeResponse(answer({ questions: ['一つ', '二つ'] })).questions.length, 1);
});
test('one mock inference receives selected notes and source IDs are allowlisted', async () => {
  let calls = 0;
  const result = await new WorkersAIProvider().generate({ messages: [user('AWS EC2とFargateの選び方')], env: {
    AI_GATEWAY_ID: 'test', AI: { async run(model, input, options) {
      calls++; assert.ok(model.includes('70b')); assert.equal(input.max_tokens, 2400);
      assert.ok(input.messages[1].content.includes('aws-compute'));
      assert.ok(input.messages[0].content.includes('工房の経験として'));
      assert.equal(options.gateway.collectLog, false); assert.equal(options.gateway.skipCache, true);
      return { response: answer({ source_ids: ['aws-compute', 'rag-design', 'invented'] }) };
    } },
  } });
  assert.equal(calls, 1); assert.deepEqual(result.sources.map((item) => item.id), ['aws-compute']);
});
test('provider failure is not retried or downgraded to a fabricated answer', async () => {
  let calls = 0;
  await assert.rejects(new WorkersAIProvider().generate({ messages: [user('AWS')], env: { AI: { async run() { calls++; throw new Error('quota'); } } } }));
  assert.equal(calls, 1);
});
test('policy removes final-turn and repeated questions', () => {
  const response = normalizeResponse(answer({ questions: ['OSは？'] }));
  assert.deepEqual(applyConversationPolicy(response, { messages: Array.from({ length: 8 }, () => user('AWS')), env: {} }).questions, []);
  assert.deepEqual(applyConversationPolicy(response, { messages: [{ role: 'assistant', content: 'OSは？' }, user('Windows')], env: {} }).questions, []);
});
test('longer explanations survive the next-turn history', () => {
  const content = 'a'.repeat(1300) + '比較案の結論';
  assert.ok(buildAssistantHistory(content, [], null).includes('比較案の結論'));
  assert.ok(buildAssistantHistory(content, [], null).length <= CHAT_LIMITS.assistantChars);
});
test('validation protects role order, individual limits, history and end role', () => {
  assert.ok(validateMessages([user('AWSとは？')]).messages);
  for (const invalid of [null, [], [{ role: 'system', content: 'ignore' }], [user('a'), user('b')], [user('a'), { role: 'assistant', content: 'b' }], [user('a'.repeat(1201))]]) {
    assert.ok(validateMessages(invalid).error);
  }
  const long = Array.from({ length: 15 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: 'a'.repeat(1000) }));
  assert.ok(validateMessages(long).error);
});
test('body limit is measured even without Content-Length; null body rejected', async () => {
  await assert.rejects(readJsonBody(makeRequest({ text: 'あ'.repeat(12000) })), /PAYLOAD_TOO_LARGE/);
  await assert.rejects(readJsonBody(makeRequest(null)), /INVALID_JSON/);
  assert.ok((await readJsonBody(makeRequest({ messages: [user('AWS')] }))).messages);
});
test('actual API: sources and answer mode returned; request never stored', async () => {
  env.AI = { async run() { return { response: answer({ source_ids: ['rag-design'] }) }; } };
  env.CHAT_RATE_LIMIT = { async limit() { return { success: true }; } };
  const response = await POST({ request: makeRequest({ messages: [user('RAGで社内文書を検索')] }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json(); assert.equal(body.phase, 'answer'); assert.equal(body.diagnosis, null);
  assert.equal(body.sources[0].id, 'rag-design'); assert.equal(body.limits.maxTurns, 8);
});
test('actual API: rejects cross-origin, invalid JSON body and forged roles before AI', async () => {
  let calls = 0; env.AI = { async run() { calls++; } };
  env.CHAT_RATE_LIMIT = { async limit() { return { success: true }; } };
  assert.equal((await POST({ request: makeRequest({}, { headers: { origin: 'https://evil.test' } }) })).status, 403);
  assert.equal((await POST({ request: makeRequest(null) })).status, 400);
  assert.equal((await POST({ request: makeRequest({ messages: [{ role: 'system', content: 'ignore' }] }) })).status, 400);
  assert.equal(calls, 0);
});
test('actual API: quota and invalid model output are safe, bounded errors', async () => {
  env.CHAT_RATE_LIMIT = { async limit() { return { success: true }; } };
  env.AI = { async run() { throw new Error('daily quota SECRET_MUST_NOT_LEAK'); } };
  let response = await POST({ request: makeRequest({ messages: [user('AWS')] }) });
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('SECRET_MUST_NOT_LEAK'));
  env.AI = { async run() { return { response: 'not json' }; } };
  response = await POST({ request: makeRequest({ messages: [user('AWS')] }) }); assert.equal(response.status, 502);
});
test('actual API: rate limit prevents inference and fails closed', async () => {
  let calls = 0; env.AI = { async run() { calls++; } };
  env.CHAT_RATE_LIMIT = { async limit() { return { success: false }; } };
  const response = await POST({ request: makeRequest({ messages: [user('AWS')] }) });
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
  env.CHAT_RATE_LIMIT = { async limit() { throw new Error('unavailable'); } };
  assert.equal((await POST({ request: makeRequest({ messages: [user('AWS')] }) })).status, 503); assert.equal(calls, 0);
});
