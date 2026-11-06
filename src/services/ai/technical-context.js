import { technicalNotes } from './technical-notes.js';

const normalize = (text) => text.normalize('NFKC').toLowerCase().trim();
function matches(text, keyword) {
  const term = normalize(keyword);
  // Do not match "rag" inside "storage" or "iam" inside a name.
  if (/^[a-z0-9]+$/.test(term)) return new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, 'i').test(text);
  return text.includes(term);
}
function score(text, note) {
  return note.keywords.reduce((sum, keyword) => sum + (matches(text, keyword) ? 1 : 0), 0);
}
function domains(text) {
  const words = {
    aws: ['AWS', 'EC2', 'Lambda', 'Fargate', 'ECS', 'IAM', 'クラウド', 'IIS'],
    llm: ['LLM', 'モデル', '生成AI', 'ローカル推論', 'ローカルモデル', 'Ollama', 'GPU', 'VRAM', 'APIと'],
    rag: ['RAG', 'ラグ', '社内文書', '社内資料', '文書検索', 'ナレッジ', 'ベクトル', 'チャンク', 'pgvector'],
  };
  return Object.keys(words).filter((key) => words[key].some((word) => matches(text, word)));
}
const topicReset = /^(?:ところで|別(?:件|の(?:話|相談|質問))|話(?:題)?を変|新しい(?:相談|質問)|前の話は(?:忘|置))/u;
const conditionReply = /^(?:(?:db|データベース|言語)\s*(?:は|:)\s*)?(?:python|postgresql|postgres|pgvector)(?:です|を使います|を使っています|を使いたい|を使う予定です|でお願いします|にします|にしたい)?[。.!！]?$/u;
const continuation = /^(?:それ|その|では|じゃあ|そう|もっと|もう少し|具体的|詳しく|費用は|料金は|構成は|どちら|どう違|前の|先ほど|windows|linux|社内だけ|[0-9]|(?:条件|要件|前提)(?:を|の|は|に)|追加(?:条件|要件|です|します)|補足|訂正)/u;

/** User-only, contiguous context. Never search backwards past a new topic.
 * These are untrusted statements, not verified facts or authorization rules.
 * Explicit new domains replace unrelated old domains; assistant text never
 * chooses a stack. Bounded by the existing eight-turn conversation budget.
 */
export function activeUserTexts(messages) {
  let active = [];
  for (const message of messages.filter((item) => item.role === 'user')) {
    const text = normalize(message.content);
    const currentDomains = domains(text);
    const priorDomains = new Set(active.flatMap(domains));
    const differentDomain = currentDomains.length > 0 && priorDomains.size > 0 &&
      currentDomains.every((domain) => !priorDomains.has(domain));
    if (!active.length || topicReset.test(text) || differentDomain ||
        !(continuation.test(text) || conditionReply.test(text))) active = [text];
    else active = [...active, text].slice(-8);
  }
  return active;
}

export function retrieveTechnicalNotes(messages) {
  const active = activeUserTexts(messages);
  const latest = active.at(-1) || '';
  const previous = active.slice(0, -1).join('\n');
  const relevant = new Set(active.flatMap(domains));
  const context = active.join('\n');
  return technicalNotes.map((note, index) => {
    const eligible = relevant.has(note.id.split('-')[0]) &&
      (!note.requiresAny || note.requiresAny.some((keyword) => matches(context, keyword)));
    return { note, index, specificity: note.requiresAny ? 1 : 0,
      score: eligible ? score(latest, note) * 4 + score(previous, note) : 0 };
  }).filter((item) => item.score > 0)
    .sort((a, b) => b.specificity - a.specificity || b.score - a.score || a.index - b.index)
    .slice(0, 3).map((item) => item.note);
}

export function technicalContext(notes) {
  return JSON.stringify(notes.map(({ id, title, text, checkedAt }) => ({ id, title, text, checkedAt })));
}

// URLs always come from the reviewed allowlist, never from the model or visitor.
export function resolveSources(ids, notes) {
  if (!Array.isArray(ids)) return [];
  const selected = new Set(ids.filter((id) => typeof id === 'string'));
  return notes.filter((note) => selected.has(note.id)).map((note) => ({
    id: note.id, title: note.sourceTitle, url: note.url, checkedAt: note.checkedAt,
  }));
}

export function freshnessNotice(messages, notes, now = new Date()) {
  const last = messages.filter((message) => message.role === 'user').at(-1)?.content || '';
  const dated = /最新|今日|現在|今の|今は|料金|価格|単価|費用|無料|廃止|制限|リージョン/.test(last);
  const stale = notes.some((note) => now.getTime() - Date.parse(`${note.checkedAt}T00:00:00Z`) > 90 * 86400000);
  return dated || stale
    ? '料金・提供状況・仕様の最新情報は未確認です。参照資料の確認日以降に変更されている可能性があるため、導入時に公式情報を確認してください。'
    : '';
}
