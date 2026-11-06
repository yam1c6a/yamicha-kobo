/** Whole terminal sentences only. Never fuzzy-match or rewrite an explanation. */
export const comparableQuestion = (value) => value.normalize('NFKC').trim()
  .replace(/^(?:[0-9]+[.)、]\s+|[-・]\s+)/u, '')
  .replace(/^(?:質問(?:は)?|確認(?:事項|したこと|したいこと)?(?:は)?)[：:、,]\s*/u, '')
  .replace(/[。.!?]+$/u, '').replace(/\s+/gu, '');

/** @param {string} reply @param {string[]} questions */
export function deduplicateFollowUp(reply, questions) {
  const expected = questions[0] && comparableQuestion(questions[0]);
  if (!expected) return { reply, questions };
  let result = reply;
  while (true) {
    const sentences = [...result.matchAll(/[^。！？!?\r\n]+[。！？!?]*/gu)]
      .filter((match) => match[0].trim());
    const last = sentences.at(-1);
    if (!last || comparableQuestion(last[0]) !== expected) return { reply: result, questions };
    const remaining = result.slice(0, last.index).trimEnd();
    if (!remaining.trim()) return { reply: result, questions: [] };
    result = remaining;
  }
}

/** Remove only the obsolete history label, preserving all explanatory text.
 * Quoted examples, Markdown blockquotes and fenced/inline code are left alone.
 */
export function stripHistoryLabel(reply) {
  const cleaned = reply.replace(/(^|[。！？!?\r\n])([ \t]*)確認したこと[：:][ \t]*/gu,
    (match, boundary, space, offset) => {
      const prefix = reply.slice(0, offset + boundary.length);
      const line = prefix.slice(prefix.lastIndexOf('\n') + 1);
      const fenced = ((prefix.match(/^\s*(?:```|~~~)/gm) || []).length % 2) !== 0;
      const quoted = /[「『"'`]/u.test(line) || /^\s*>/u.test(line) ||
        prefix.lastIndexOf('「') > prefix.lastIndexOf('」') ||
        prefix.lastIndexOf('『') > prefix.lastIndexOf('』');
      return fenced || quoted ? match : boundary + space;
    });
  return cleaned.trim() ? cleaned : reply;
}

const transferTopic = /(?:社外|外部)(?:への|へ|に|の)?(?:データ)?(?:送信|持ち出し)|(?:データ|情報)(?:の)?(?:社外|外部)(?:送信|提供)/u;
const transferDecision = /可否|許可|承認|禁止|可能|決定|決ま|できますか|しても(?:よい|いい)/u;
const pending = /確認中|未確認|未定|未決定|調整中|分からない|わからない|(?:まだ|未だ)(?:決まって|決定して|確認できて)いない/u;

/** High-confidence suppression, not general semantic inference.
 * Suppress a permission decision question only when that exact topic has an
 * explicit pending/allowed/forbidden statement. Do not suppress questions
 * about retention, CPU, format, destination, or unrelated topics.
 */
export function explicitlyAddressedQuestion(question, userTexts) {
  const q = question.normalize('NFKC').replace(/\s+/gu, '');
  if (transferTopic.test(q) && transferDecision.test(q) && !/送信先|保存(?:先|期間)|暗号|誰|どこ|経路/u.test(q)) {
    const statements = userTexts.flatMap((text) => text.normalize('NFKC').split(/[。！？!?\n]/u));
    return statements.some((text) => !/[「『>"`]/u.test(text) && transferTopic.test(text) &&
      (pending.test(text) || /禁止|不可|許可済|承認済|許可され|送信可能|送信できます|送信できません/u.test(text)));
  }
  // A stated unknown is a valid answer; don't immediately request the same field.
  for (const field of [/予算/u, /更新頻度/u, /(?:文書|資料|ファイル)(?:の)?(?:数|件数)/u]) {
    if (field.test(q) && userTexts.some((text) => text.split(/[。！？!?\n]/u)
      .some((sentence) => !/[「『>"`]/u.test(sentence) && field.test(sentence) && pending.test(sentence)))) return true;
  }
  return false;
}
