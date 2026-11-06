import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { deduplicateFollowUp } from '../src/services/ai/question-deduplication.js';
import { technicalNotes } from '../src/services/ai/technical-notes.js';
import { retrieveTechnicalNotes, technicalContext, resolveSources } from '../src/services/ai/technical-context.js';

// Execute the real policy: strip TS only, and resolve its real JS imports.
const aiRoot = new URL('../src/services/ai/', import.meta.url);
const temp = await mkdtemp(path.join(tmpdir(), 'consultation-regressions-'));
after(() => rm(temp, { recursive: true, force: true }));
const policy = stripTypeScriptTypes(await readFile(new URL('conversation-policy.ts', aiRoot), 'utf8'), { mode: 'strip' })
  .replace(/from\s+(['"])(\.\/[^'"]+\.js)\1/g, (_, quote, name) => `from ${JSON.stringify(new URL(name, aiRoot).href)}`);
await writeFile(path.join(temp, 'policy.mjs'), policy);
const { applyConversationPolicy } = await import(pathToFileURL(path.join(temp, 'policy.mjs')).href);
const user = (content) => ({ role: 'user', content });
const question = 'どのような種類の文書を検索する予定ですか。';
const originalAnswer = 'RAGの構成では、まず文書の取り込みからテキスト抽出、適切な単位への分割、索引作成を行います。質問を受けると、索引を検索して関連する資料を取り出し、LLMへ渡して回答を生成します。検索にはキーワードやベクトル検索を選択できますが、必ずベクトルDBが必要というわけではありません。検索精度を高めるためには、まず正解に必要な資料が検索結果に含まれるかを確認し、次に回答がその資料に忠実か・質問に十分答えているかを分けて評価します。アクセス権限の管理では、利用者の認証と文書単位のアクセス制御を設計し、索引へ権限情報を反映します。PythonとPostgreSQLを使う場合、文書の出典・版・更新日時・閲覧権限をPostgreSQLのテーブルに持たせ、Pythonで索引を作成し検索を行います。';
const response = (reply, questions = [question]) => ({ phase: 'answer', reply, questions, diagnosis: null, cta: { show: false, message: '' }, sources: [] });

test('reported reply retains every explanation and renders the question once', () => {
  const result = applyConversationPolicy(response(`${originalAnswer}質問は、${question}`), { messages: [user('PythonとPostgreSQLでRAGを作りたい')], env: {} });
  assert.equal(result.reply, originalAnswer);
  assert.deepEqual(result.questions, [question]);
  const displayed = `${result.reply}\n${result.questions.join('\n')}`;
  assert.equal(displayed.split('どのような種類の文書を検索する予定ですか').length - 1, 1);
});

for (const tail of [question, '質問は、' + question, '質問：' + question, '確認事項：' + question, '1. ' + question, question.replace('。', '？'), question.replace('。', '?')]) {
  test(`terminal duplicate: ${tail}`, () => {
    assert.deepEqual(deduplicateFollowUp(`構成を提案します。\n${tail}\n`, [question]), { reply: '構成を提案します。', questions: [question] });
  });
}

test('width and whitespace normalization never rewrites the answer itself', () => {
  assert.deepEqual(deduplicateFollowUp('本文ＡＢＣ。\n質問：ＰＤＦ ですか？', ['PDFですか。']), { reply: '本文ＡＢＣ。', questions: ['PDFですか。'] });
});

test('question-only answer remains nonempty without a second question', () => {
  assert.deepEqual(deduplicateFollowUp(`質問は、${question}`, [question]), { reply: `質問は、${question}`, questions: [] });
});

test('repeated terminal copies are removed and deduplication is idempotent', () => {
  const cleaned = deduplicateFollowUp(`本文。${question}\n${question}`, [question]);
  assert.equal(cleaned.reply, '本文。');
  assert.deepEqual(deduplicateFollowUp(cleaned.reply, cleaned.questions), cleaned);
});

for (const reply of [
  `構成案です。例えば、${question}`,
  `構成案です。「${question}」`,
  `構成案です。\n> ${question}`,
  `${question}\n次に検索方式を比較します。`,
  '構成案です。文書の形式を教えてください。',
  `構成案です。質問は、${question}理由も教えてください。`,
]) test(`do not remove different, quoted or non-terminal content: ${reply}`, () => {
  assert.deepEqual(deduplicateFollowUp(reply, [question]), { reply, questions: [question] });
});

test('no structured question means no answer manipulation', () => {
  const reply = `${originalAnswer}質問は、${question}`;
  assert.deepEqual(deduplicateFollowUp(reply, []), { reply, questions: [] });
});

test('final-turn and already-answered duplicate questions are removed from both channels', () => {
  const r = response(`本文。質問は、${question}`);
  for (const messages of [Array.from({ length: 8 }, () => user('RAG')), [{ role: 'assistant', content: question }, user('PDFです')]]) {
    const result = applyConversationPolicy(r, { messages, env: {} });
    assert.equal(result.reply, '本文。'); assert.deepEqual(result.questions, []);
  }
});

test('policy still limits questions, preserves sources and does not mutate its input', () => {
  const r = response('本文。', ['  ', question, '予算は？']);
  r.sources = [{ id: 'rag-design', title: 'RAG', url: 'https://learn.microsoft.com/', checkedAt: '2026-11-06' }];
  const original = structuredClone(r);
  const result = applyConversationPolicy(r, { messages: [user('RAG')], env: {} });
  assert.deepEqual(result.questions, [question]); assert.deepEqual(result.sources, r.sources); assert.deepEqual(r, original);
});

for (const query of [
  'PythonとPostgreSQLで社内文書のRAGを作りたい。構成と検索精度と権限管理を教えて。',
  'PostgresでRAGを構築したい', 'pgvectorでRAGを作るには？',
  'ＰｙｔｈｏｎとＰｏｓｔｇｒｅＳＱＬでＲＡＧの構成を教えて',
]) test(`specific architecture note is prioritized and included in actual context: ${query}`, () => {
  const notes = retrieveTechnicalNotes([user(query)]);
  assert.equal(notes[0].id, 'rag-postgres'); assert.ok(notes.length <= 3);
  assert.ok(JSON.parse(technicalContext(notes)).some((note) => note.id === 'rag-postgres' && note.text.includes('類似検索SQL')));
  assert.equal(resolveSources(['rag-postgres', 'invented'], notes)[0].url, technicalNotes.find((note) => note.id === 'rag-postgres').url);
});

for (const query of ['RAGとは？', 'PythonでRAGを作りたい', 'AWSでPostgreSQLを運用したい', 'PostgreSQLのバックアップ方法', 'Pythonの構文を教えて', 'storage']) {
  test(`do not force a PostgreSQL RAG architecture into unrelated/generic advice: ${query}`, () => {
    assert.ok(!retrieveTechnicalNotes([user(query)]).some((note) => note.id === 'rag-postgres'));
  });
}

test('short DB condition can follow a user RAG topic; assistant-only stack does not qualify', () => {
  const notes = retrieveTechnicalNotes([user('社内文書のRAGを作りたい'), { role: 'assistant', content: 'どのDBですか？' }, user('PostgreSQLです')]);
  assert.equal(notes[0].id, 'rag-postgres');
  const assistantOnly = retrieveTechnicalNotes([user('RAGを作りたい'), { role: 'assistant', content: 'Python PostgreSQL' }, user('その構成を詳しく')]);
  assert.ok(!assistantOnly.some((note) => note.id === 'rag-postgres'));
});

test('changing subject drops the prior PostgreSQL example', () => {
  assert.ok(!retrieveTechnicalNotes([user('PythonとPostgreSQLでRAG'), user('AWSでEC2とLambdaを比較')]).some((note) => note.id === 'rag-postgres'));
});

test('new note has reviewed source metadata and conditional, non-promotional content', () => {
  const note = technicalNotes.find((item) => item.id === 'rag-postgres');
  assert.equal(technicalNotes.length, 9);
  assert.equal(new Set(technicalNotes.map((item) => item.id)).size, 9);
  assert.equal(new URL(note.url).hostname, 'learn.microsoft.com');
  assert.equal(new URL(note.url).protocol, 'https:');
  assert.equal(note.checkedAt, '2026-11-06');
  for (const phrase of ['条件付き', '導入実績でも', 'Python', 'PostgreSQL/pgvector', '選ぶ理由', '負担', '代替案', 'サーバーで確認した利用者', '検索SQLに強制', '許可されない本文', '更新・削除・権限変更', '標準全文検索だけで十分とは断言しない']) assert.ok(note.text.includes(phrase), phrase);
});

test('a different PostgreSQL task is not mistaken for a short DB condition', () => {
  assert.ok(!retrieveTechnicalNotes([user('RAGの構成を教えて'), user('PostgreSQLでバックアップを取りたい')]).some((note) => note.id === 'rag-postgres'));
});
