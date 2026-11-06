import test from 'node:test';
import assert from 'node:assert/strict';
import { needsAnswerPlan, schemaWithAnswerPlan, composeAnswerPlan } from '../src/services/ai/answer-plan.js';
import { cloudAdviceIssues } from '../src/services/ai/cloud-advice-validation.js';
const user = (content) => ({ role: 'user', content });
const answer = () => ({ phase: 'answer', reply: '合成データで検証を始めます。', plan: { reasons: ['許可未確認なので実資料を使いません。'], steps: ['公開資料と評価質問を用意します。', '同じ質問を実行して正確さを比較します。'], cautions: ['外部への実データ送信は承認まで保留します。'] } });
for (const query of ['AWSで構成を提案して', 'Excelの導入手順を教えて', 'APIとローカルをどう選べばよい？最初に試す方法は？', '前の案のどこを残しますか？']) {
  test(`explicit procedure / architecture receives plan schema: ${query}`, () => assert.ok(needsAnswerPlan([user(query)])));
}
for (const query of ['RAGとは？', '構成とは何ですか？', 'ありがとうございます']) {
  test(`brief request remains brief: ${query}`, () => assert.equal(needsAnswerPlan([user(query)]), false));
}
test('reply preserves exactly the generated sections and does not mutate input', () => {
  const data = answer(), original = structuredClone(data);
  const result = composeAnswerPlan(data, true);
  for (const value of [data.reply, ...data.plan.reasons, ...data.plan.steps, ...data.plan.cautions]) assert.ok(result.reply.includes(value));
  assert.ok(result.reply.includes('進め方\n1.'));
  assert.deepEqual(data, original);
});
test('missing or malformed planning content is rejected, never silently filled', () => {
  for (const plan of [null, {}, { reasons: ['理由'], steps: [], cautions: ['注意'] }, { reasons: ['理由'], steps: ['一つ', '二つ'], cautions: [' '.repeat(4)] }]) assert.throws(() => composeAnswerPlan({ ...answer(), plan }, true), /AI_INVALID_RESPONSE/);
});
test('question and out-of-scope responses do not require invented steps', () => {
  const data = { phase: 'out_of_scope', reply: 'IT関連の相談をお願いします。', plan: null };
  assert.equal(composeAnswerPlan(data, true), data);
  assert.equal(composeAnswerPlan({ phase: 'answer', reply: 'RAGの説明です。' }, false).reply, 'RAGの説明です。');
});
test('schema describes and bounds displayed model-generated fields', () => {
  const base = { properties: { reply: { type: 'string' } }, required: ['reply'] };
  const result = schemaWithAnswerPlan(base);
  assert.deepEqual(result.required, ['reply', 'plan']);
  assert.equal(result.properties.plan.anyOf[1].properties.steps.minItems, 2);
  assert.equal(base.properties.plan, undefined);
});
test('observed EC2 fully-managed guest OS claim is blocked', () => {
  assert.deepEqual(cloudAdviceIssues({ reply: 'EC2のフルマネージドOSで柔軟な制御が可能です。' }), ['EC2_GUEST_OS_RESPONSIBILITY']);
});
test('correct EC2 / Fargate responsibilities are not blocked', () => {
  assert.deepEqual(cloudAdviceIssues({ reply: 'EC2はフルマネージドOSではありません。ゲストOSの更新は利用者の責任です。Fargateでもイメージ更新は残ります。' }), []);
});
