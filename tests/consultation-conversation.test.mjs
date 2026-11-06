import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { activeUserTexts, retrieveTechnicalNotes, technicalContext } from '../src/services/ai/technical-context.js';
import { deduplicateFollowUp, stripHistoryLabel, explicitlyAddressedQuestion } from '../src/services/ai/question-deduplication.js';

const aiRoot = new URL('../src/services/ai/', import.meta.url);
const temp = await mkdtemp(path.join(tmpdir(), 'consultation-conversation-'));
after(() => rm(temp, { recursive: true, force: true }));
async function loadTS(name) {
  const source = stripTypeScriptTypes(await readFile(new URL(`${name}.ts`, aiRoot), 'utf8'), { mode: 'strip' })
    .replace(/from\s+(['"])(\.\/[^'"]+\.js)\1/g, (_, quote, specifier) => `from ${JSON.stringify(new URL(specifier, aiRoot).href)}`);
  const target = path.join(temp, `${name}.mjs`);
  await writeFile(target, source);
  return import(pathToFileURL(target).href);
}
const { applyConversationPolicy } = await loadTS('conversation-policy');
const { buildAssistantHistory } = await loadTS('consultation-history');
const user = (content) => ({ role: 'user', content });
const assistant = (content) => ({ role: 'assistant', content });
const response = (reply, questions = []) => ({ phase: 'answer', reply, questions, diagnosis: null, cta: { show: false, message: '' }, sources: [] });

// Exact synthetic questions from live run 42165628572. Not answer fixtures.
const aws = [
  '既存のWindows Server/IIS上の.NET Framework 4.8業務システムをAWSで動かしたいです。コンテナ化しておらず、常時稼働が必要です。運用担当は少人数です。EC2・ECS/Fargate・Lambdaから何を選びますか。最小構成と選ぶ理由、運用上の注意を教えてください。',
  '条件を変更します。アプリはLinuxコンテナで動作し、ローカルディスクへの永続保存もOSへのログインも不要です。OSの更新作業を減らしたい場合、先ほどの構成をどう変えますか。',
];
const llm = [
  '社内規程の検索と問い合わせの回答案作成にLLMを使いたいです。日本語の回答品質と運用の負担を重視します。社外へのデータ送信可否はまだ確認中です。外部LLM APIとローカルLLMをどう選べばよいですか。判断基準と最初に試す方法を教えてください。',
  '条件を追加します。文書本文だけでなく、質問・埋め込み生成の入力・処理ログも社外送信禁止です。外部LLM APIを使う案は外してください。この条件で最小構成と運用上の注意点を提案してください。',
];

test('live AWS continuation retains compute and operations notes', () => {
  const notes = retrieveTechnicalNotes([user(aws[0]), assistant('EC2を候補とします。'), user(aws[1])]);
  assert.ok(notes.some((note) => note.id === 'aws-compute'));
  assert.ok(notes.some((note) => note.id === 'aws-operations'));
  assert.ok(notes.every((note) => note.id.startsWith('aws-')));
  assert.ok(technicalContext(notes).includes('Fargate'));
});
test('live local-only continuation retains local execution guidance', () => {
  const notes = retrieveTechnicalNotes([user(llm[0]), assistant('APIとローカルを比較します。'), user(llm[1])]);
  assert.ok(notes.some((note) => note.id === 'llm-local'));
  assert.ok(notes.some((note) => note.id === 'llm-selection'));
  assert.ok(notes.every((note) => note.id.startsWith('llm-')));
});
for (const prefix of ['条件を変更します。', '条件を追加します。', '追加条件です。', '補足します。', '訂正します。', '前提を変えます。']) {
  test(`continuation prefix keeps context: ${prefix}`, () => {
    assert.ok(retrieveTechnicalNotes([user('AWS EC2を使いたい'), user(prefix + '運用担当は一人です。')]).some((note) => note.id === 'aws-compute'));
  });
}
test('multiple short continuations retain the root topic without assistant keywords', () => {
  const notes = retrieveTechnicalNotes([user('AWS EC2'), assistant('PostgreSQL RAG Ollama'), user('条件を追加します。担当者は一人です。'), user('その注意点は？')]);
  assert.ok(notes.length > 0 && notes.every((note) => note.id.startsWith('aws-')));
});
for (const query of ['ところで料理の作り方は？', '別件です。Pythonの構文を教えて', 'おすすめの料理は？']) {
  test(`do not revive an old topic after topic change: ${query}`, () => {
    assert.equal(retrieveTechnicalNotes([user('AWS EC2'), user(query), user('それを詳しく')]).length, 0);
  });
}
test('an explicitly different domain drops unrelated prior notes', () => {
  const notes = retrieveTechnicalNotes([user('AWS EC2 IAM'), user('ではRAGの精度を説明して')]);
  assert.ok(notes.length > 0 && notes.every((note) => note.id.startsWith('rag-')));
});
test('DB selection can continue RAG but an unrelated DB task cannot', () => {
  assert.equal(retrieveTechnicalNotes([user('RAGで社内文書を検索'), user('PostgreSQLです')])[0].id, 'rag-postgres');
  assert.ok(!retrieveTechnicalNotes([user('RAG'), user('PostgreSQLのバックアップを取りたい')]).some((note) => note.id === 'rag-postgres'));
});

test('live CPU question is shown once despite old history prefix and punctuation', () => {
  const question = '現在のシステムの予想されるCPUとメモリの使用率はどの程度ですか？';
  const result = applyConversationPolicy(response(`ECS/Fargateを提案します。確認したこと: ${question.replace('？', '?')}`, [question]), { messages: aws.map(user), env: {} });
  assert.equal(result.reply, 'ECS/Fargateを提案します。'); assert.deepEqual(result.questions, [question]);
});
test('history label removal keeps the following explanation', () => {
  const text = '集計は通常処理に残します。確認したこと: 自由文の分類と返信案の精度を評価します。';
  assert.equal(stripHistoryLabel(text), '集計は通常処理に残します。自由文の分類と返信案の精度を評価します。');
});
for (const text of ['「確認したこと: テスト」という表現です。', '例です。\n> 確認したこと: 引用です。', '```text\n確認したこと: サンプル\n```', '`確認したこと: サンプル`', '「例です。確認したこと: 引用です。」']) {
  test(`quoted history label is preserved: ${text}`, () => assert.equal(stripHistoryLabel(text), text));
}
test('different, quoted and non-terminal questions are not deleted', () => {
  const question = 'OSは何ですか？';
  for (const reply of ['OSを確認します。', '「確認したこと: OSは何ですか？」', 'OSは何ですか？ 次に対応を検討します。']) assert.deepEqual(deduplicateFollowUp(reply, [question]), { reply, questions: [question] });
});
test('new history carries the question but never marks it as confirmed', () => {
  const text = buildAssistantHistory('本文。', ['OSは何ですか？'], null);
  assert.equal(text, '本文。\n\nOSは何ですか？');
  assert.ok(!text.includes('確認したこと'));
});
test('live pending permission question is suppressed, including its identical reply tail', () => {
  const question = '社外へのデータ送信は可否を決定しましたか？';
  const result = applyConversationPolicy(response(`公開データで試作します。確認したこと: ${question}`, [question]), { messages: [user(llm[0])], env: {} });
  assert.equal(result.reply, '公開データで試作します。'); assert.deepEqual(result.questions, []);
});
test('permission guard accepts pending, forbidden and approved explicit statements', () => {
  const q = '社外へのデータ送信は可能ですか？';
  for (const text of ['社外へのデータ送信は未確認です', '社外送信禁止です', '外部送信は許可済みです']) assert.ok(explicitlyAddressedQuestion(q, [text]));
});
test('permission guard does not invent a decision or suppress unrelated questions', () => {
  assert.equal(explicitlyAddressedQuestion('社外へのデータ送信は可能ですか？', ['社外送信の規則を知りたい']), false);
  assert.equal(explicitlyAddressedQuestion('ログの保存期間はどの程度ですか？', [llm[0]]), false);
  assert.equal(explicitlyAddressedQuestion('文書の形式は何ですか？', [llm[0]]), false);
  assert.equal(explicitlyAddressedQuestion('社外へのデータ送信は可能ですか？', ['「社外送信禁止」は文例です']), false);
});
test('pending budget is respected but independent conditions remain askable', () => {
  assert.equal(explicitlyAddressedQuestion('予算はどの程度ですか？', ['予算は未定です。']), true);
  assert.equal(explicitlyAddressedQuestion('文書の更新頻度は？', ['予算は未定です。']), false);
});
test('a new topic does not inherit a previous permission decision', () => {
  const context = activeUserTexts([user('LLMの社外送信は確認中です'), user('別件です。外部へのデータ送信の相談です')]);
  assert.equal(explicitlyAddressedQuestion('社外へのデータ送信は可能ですか？', context), false);
});
test('prompt defaults to no question and does not force the old PostgreSQL example', async () => {
  const text = await readFile(new URL('consultation-prompt.ts', aiRoot), 'utf8');
  assert.ok(text.includes('questions=[]が既定'));
  assert.ok(text.includes('未定') && text.includes('確認中'));
  assert.ok(text.includes('残す部分・外す部分・置き換える部分'));
  assert.ok(!text.includes('例：PythonとPostgreSQL'));
});

test('history-label-only replies never become empty', () => {
  assert.equal(stripHistoryLabel('確認したこと: '), '確認したこと: ');
});
test('permission knowledge does not answer approval-process or destination questions', () => {
  const known = ['社外へのデータ送信は確認中です'];
  for (const question of ['社外送信先は確認済みですか？', '社外送信はどこで承認を取りますか？', '社外送信時の暗号化は可能ですか？']) {
    assert.equal(explicitlyAddressedQuestion(question, known), false);
  }
});
