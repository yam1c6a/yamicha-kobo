import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { needsAnswerPlan, schemaWithAnswerPlan } from '../src/services/ai/answer-plan.js';
import { caseStudies } from '../src/data/case-studies.js';
const root = await mkdtemp(path.join(tmpdir(), 'answer-completeness-'));
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
const load = (file) => import(pathToFileURL(path.join(root, file)).href);
const { WorkersAIProvider } = await load('src/services/ai/providers/workers-ai.js');
const { publicCaseCatalog } = await load('src/services/ai/public-case-catalog.js');
const { POST } = await load('src/pages/api/chat.js');
const { env } = await load('runtime.js');
const user = (content) => ({ role: 'user', content });
const query = '毎月、同じ列構成のExcelファイル30個を1つに結合し、部署別の金額を集計します。Windows版Excelで作業し、社内にPythonを保守できる人はいません。AIは必要ですか。最小構成と導入手順を教えてください。';
const validPlan = { reasons: ['既存機能を使うと独自コードの保守を減らせます。'], steps: ['フォルダーから対象ファイルを取り込みます。', '部署別に金額を集計し、元データの合計と照合します。'], cautions: ['重複取込みとエラー行を確認します。'] };
const answer = (phase, plan = null) => ({ phase, reply: 'Power Queryで結合します。', questions: [], diagnosis: null, plan, source_ids: [], cta: { show: false, message: '' } });
const generate = (response) => new WorkersAIProvider().generate({ messages: [user(query)], env: { AI: { async run() { return { response }; } } } });

test('exact live Excel procedure question always requests a plan', () => assert.ok(needsAnswerPlan([user(query)])));
for (const phase of ['answer ', 'unexpected', undefined, 'diagnosis', 'discovery', 'out_of_scope']) {
  test(`normalized ${String(phase)} cannot bypass required plan`, async () => {
    await assert.rejects(generate(answer(phase)), /AI_INVALID_RESPONSE/);
  });
}
test('phase normalization preserves a complete generated plan', async () => {
  const result = await generate(answer(' answer ', validPlan));
  assert.equal(result.phase, 'answer');
  assert.ok(result.reply.includes('進め方') && result.reply.includes(validPlan.steps[1]));
});
test('planning schema cannot select an unrelated diagnosis or discovery branch', () => {
  const schema = schemaWithAnswerPlan({ properties: {}, required: [] });
  assert.equal(schema.properties.phase, undefined);
  assert.equal(schema.properties.diagnosis, undefined);
  assert.ok(schema.required.includes('plan'));
  assert.equal(schema.properties.plan.type, 'object');
});
test('GIS catalogue renders both real cases, not an introductory stub', () => {
  const reply = publicCaseCatalog([user('やみちゃ工房のGIS関連の実績を教えてください。資格や取引先名は推測しないでください。')]);
  assert.equal(reply.answerSource, 'public-catalog');
  const selected = caseStudies.filter((item) => item.category.includes('GIS'));
  assert.equal(selected.length, 2);
  for (const item of selected) assert.ok(reply.reply.includes(item.title) && reply.reply.includes(item.overview));
  assert.ok(reply.reply.length <= 1800);
  assert.ok(!reply.reply.includes(caseStudies[0].title));
});
test('generic catalogue is based on the same public titles and overviews', () => {
  const result = publicCaseCatalog([user('やみちゃ工房の開発実績を教えてください。')]);
  assert.ok(result && result.reply.includes(caseStudies[0].title));
  assert.ok(result.reply.length <= 1800);
});
for (const question of ['工房のGIS実績を踏まえた構成と手順を教えて', '医療関係の実績を工房から紹介して', 'GISシステムの料金を教えて', 'AWSの構成を教えて']) {
  test(`catalogue does not hijack a technical or unknown-domain inquiry: ${question}`, () => assert.equal(publicCaseCatalog([user(question)]), null));
}
test('actual API identifies catalogue provenance and makes no model call', async () => {
  let calls = 0;
  env.AI = { async run() { calls++; throw new Error('must not run'); } };
  env.CHAT_RATE_LIMIT = { async limit() { return { success: true }; } };
  const request = new Request('https://example.test/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test' }, body: JSON.stringify({ messages: [user('やみちゃ工房のGIS実績を教えて')] }) });
  const result = await POST({ request });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('x-consultation-source'), 'public-catalog');
  assert.equal((await result.json()).answerSource, 'public-catalog');
  assert.equal(calls, 0);
});
