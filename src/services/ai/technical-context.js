import { technicalNotes } from './technical-notes.js';

const normalize = (text) => text.normalize('NFKC').toLowerCase();
function matches(text, keyword) {
  const term = normalize(keyword);
  // Avoid matching e.g. "rag" inside "storage" or "iam" inside a name.
  if (/^[a-z0-9]+$/.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(term);
}
function score(text, note) {
  return note.keywords.reduce((sum, keyword) => sum + (matches(text, keyword) ? 1 : 0), 0);
}

function domains(text) {
  const words = {
    aws: ['AWS', 'EC2', 'Lambda', 'Fargate', 'ECS', 'IAM', 'クラウド', 'IIS'],
    llm: ['LLM', 'モデル', '生成AI', 'ローカル', 'Ollama', 'GPU', 'VRAM', 'APIと'],
    rag: ['RAG', 'ラグ', '社内文書', '社内資料', '文書検索', 'ナレッジ', 'ベクトル', 'チャンク', 'pgvector'],
  };
  return Object.keys(words).filter((key) => words[key].some((word) => matches(text, word)));
}

export function retrieveTechnicalNotes(messages) {
  const users = messages.filter((message) => message.role === 'user');
  const latest = normalize(users.at(-1)?.content || '');
  // Carry only a recent user topic into a genuine follow-up/short condition reply.
  const followUp = /^(それ|その|では|じゃあ|そう|もっと|もう少し|具体的|詳しく|費用は|料金は|構成は|どちら|どう違|前の|先ほど|windows|linux|社内だけ|[0-9])/.test(latest);
  const previous = followUp ? normalize([...users].slice(0, -1).reverse().find((message) =>
    domains(normalize(message.content)).length > 0)?.content || '') : '';
  const relevant = new Set([...domains(latest), ...domains(previous)]);
  // Generic words like "comparison" or "permission" do not pull in another domain.
  return technicalNotes.map((note, index) => ({ note, index,
    score: relevant.has(note.id.split('-')[0]) ? score(latest, note) * 4 + score(previous, note) : 0,
  })).filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).map((item) => item.note);
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
