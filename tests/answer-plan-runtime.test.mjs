import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
const root = await mkdtemp(path.join(tmpdir(), 'answer-plan-runtime-'));
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
const { WorkersAIProvider } = await import(pathToFileURL(path.join(root, 'src/services/ai/providers/workers-ai.js')).href);
const data = () => ({ phase: 'answer', reply: 'EC2を移行検証の候補にします。', plan: { reasons: ['非コンテナ型の既存環境に近いからです。'], steps: ['依存ライブラリとDB接続先を洗い出します。', '隔離した環境で動作と復元を検証します。'], cautions: ['ゲストOSとアプリの更新は利用者が管理します。'] }, questions: [], diagnosis: null, source_ids: ['aws-compute'], cta: { show: false, message: '' } });
const messages = [{ role: 'user', content: 'AWSへの移行構成と手順を教えて' }];
test('actual provider requests and renders model-generated plan in one call', async () => {
  let calls = 0;
  const result = await new WorkersAIProvider().generate({ messages, env: { AI: { async run(model, input) {
    calls++;
    assert.ok(input.response_format.json_schema.required.includes('plan'));
    assert.ok(input.messages[1].content.includes('ゲストOS'));
    return { response: data() };
  } } } });
  assert.equal(calls, 1);
  assert.ok(result.reply.includes('進め方') && result.reply.includes('ゲストOSとアプリ'));
  assert.equal(result.sources[0].id, 'aws-compute');
});
test('actual provider rejects omitted plan instead of fabricating steps', async () => {
  await assert.rejects(new WorkersAIProvider().generate({ messages, env: { AI: { async run() { return { response: { ...data(), plan: null } }; } } } }), /AI_INVALID_RESPONSE/);
});
test('actual provider checks composed sections for unsafe cloud advice', async () => {
  const response = data(); response.plan.reasons = ['EC2のフルマネージドOSで保守が不要です。'];
  await assert.rejects(new WorkersAIProvider().generate({ messages, env: { AI: { async run() { return { response }; } } } }), /AI_ADVICE_REVIEW_REQUIRED/);
});
