import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

// Execute real service/API code. Only the external Cloudflare binding is mocked.
const root = await mkdtemp(path.join(tmpdir(), 'advice-runtime-'));
after(() => rm(root, { recursive: true, force: true }));
await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
await writeFile(path.join(root, 'runtime.js'), 'export const env = {};');
async function compile(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const input = path.join(source, entry.name);
    if (entry.isDirectory()) { await compile(input, path.join(target, entry.name)); continue; }
    if (!/\.(js|ts)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    let code = await readFile(input, 'utf8');
    if (entry.name.endsWith('.ts')) code = stripTypeScriptTypes(code, { mode: 'strip' });
    code = code.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, start, spec, end) => `${start}${path.extname(spec) ? spec : spec + '.js'}${end}`);
    code = code.replace(/(['"])cloudflare:workers\1/g, JSON.stringify(pathToFileURL(path.join(root, 'runtime.js')).href));
    await writeFile(path.join(target, entry.name.replace(/\.ts$/, '.js')), code);
  }
}
await compile(fileURLToPath(new URL('../src', import.meta.url)), path.join(root, 'src'));
const load = (name) => import(pathToFileURL(path.join(root, name)).href);
const { WorkersAIProvider } = await load('src/services/ai/providers/workers-ai.js');
const { POST } = await load('src/pages/api/chat.js');
const { env } = await load('runtime.js');
const { buildConsultationInput } = await load('src/services/ai/consultation-prompt.js');
const user = (content) => ({ role: 'user', content });
const answer = (reply) => ({ phase: 'answer', reply, questions: [], diagnosis: null, source_ids: [], cta: { show: false, message: '' } });
const request = (messages) => new Request('https://example.test/api/chat', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ messages }) });

test('provider retains actual assistant and latest user roles, selected references and one inference', async () => {
  let calls = 0;
  const messages = [user('AWS EC2で動かしたい'), { role: 'assistant', content: 'EC2を検討します。' }, user('条件を変更します。Linuxコンテナです。')];
  await new WorkersAIProvider().generate({ messages, env: { AI: { async run(model, input) {
    calls++;
    assert.deepEqual(input.messages.map((item) => item.role), ['system', 'user', 'assistant', 'user']);
    assert.equal(input.messages[2].content, messages[1].content);
    assert.equal(input.messages[3].content, messages[2].content);
    assert.ok(input.messages[1].content.includes('aws-compute'));
    assert.ok(input.messages[1].content.includes('"studio_facts":""'));
    return { response: answer('ECSとFargateで実行する案を検討します。') };
  } } } });
  assert.equal(calls, 1);
});
test('studio inquiry still receives published experience facts', () => {
  assert.ok(buildConsultationInput([user('工房の実績を教えて')]).includes('工房の公開実績'));
});
test('actual provider rejects unsafe claim, does not retry or return a substitute', async () => {
  let calls = 0;
  await assert.rejects(new WorkersAIProvider().generate({ messages: [user('ローカルLLM')], env: { AI: { async run() {
    calls++; return { response: answer('ローカルLLMなら社外送信を完全に防ぐことができます。') };
  } } } }), /AI_ADVICE_REVIEW_REQUIRED/);
  assert.equal(calls, 1);
});
test('actual API withholds unsafe text and provides bounded public diagnostics', async () => {
  env.CHAT_RATE_LIMIT = { async limit() { return { success: true }; } };
  env.WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  env.AI = { async run() { return { response: answer('ローカルLLMなら社外送信を完全に防ぐことができます。') }; } };
  const result = await POST({ request: request([user('ローカルLLMを使いたい')]) });
  assert.equal(result.status, 502);
  const body = await result.json();
  assert.equal(body.code, 'AI_ADVICE_REVIEW_REQUIRED');
  assert.ok(!body.message && !JSON.stringify(body).includes('完全に防ぐ'));
  assert.equal(result.headers.get('x-consultation-model'), env.WORKERS_AI_MODEL);
  assert.equal(result.headers.get('x-consultation-revision'), 'quality-20261106-r1');
});
test('actual API blocks unapproved real-data advice but allows synthetic evaluation', async () => {
  const messages = [user('社外へのデータ送信は確認中です。APIとローカルを比較したい。')];
  env.AI = { async run() { return { response: answer('実データを外部LLM APIへ送信して評価します。') }; } };
  assert.equal((await POST({ request: request(messages) })).status, 502);
  env.AI = { async run() { return { response: answer('公開・合成データで比較し、承認前は実データを外部へ送信しないでください。') }; } };
  assert.equal((await POST({ request: request(messages) })).status, 200);
});
test('custom model configuration cannot inject arbitrary header values', async () => {
  env.WORKERS_AI_MODEL = 'private-config-value';
  env.AI = { async run() { return { response: answer('一般的な設計案です。') }; } };
  const result = await POST({ request: request([user('RAGとは？')]) });
  assert.equal(result.headers.get('x-consultation-model'), 'custom');
});
