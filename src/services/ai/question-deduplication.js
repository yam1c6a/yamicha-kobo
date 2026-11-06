/** Compare only whole terminal sentences; never fuzzy-match or rewrite an answer. */
const comparable = (value) => value.normalize('NFKC').trim()
  .replace(/^(?:[0-9]+[.)、]\s+|[-・]\s+)/u, '')
  .replace(/^(?:質問(?:は)?|確認(?:事項)?(?:は)?)[：:、,]\s*/u, '')
  .replace(/[。.!?]+$/u, '').replace(/\s+/gu, '');

/**
 * Keep the structured question once, removing an identical trailing sentence.
 * Wording differences, quotes, inline examples and non-terminal occurrences are
 * deliberately left alone. NFKC is used for comparison only, never for output.
 * @param {string} reply
 * @param {string[]} questions Already trimmed and limited to one question.
 * @returns {{reply: string, questions: string[]}}
 */
export function deduplicateFollowUp(reply, questions) {
  const expected = questions[0] && comparable(questions[0]);
  if (!expected) return { reply, questions };
  let result = reply;
  while (true) {
    const sentences = [...result.matchAll(/[^。！？!?\r\n]+[。！？!?]*/gu)]
      .filter((match) => match[0].trim());
    const last = sentences.at(-1);
    if (!last || comparable(last[0]) !== expected) return { reply: result, questions };
    const remaining = result.slice(0, last.index).trimEnd();
    // A question-only reply must not turn into an empty assistant message.
    if (!remaining.trim()) return { reply: result, questions: [] };
    result = remaining;
  }
}
