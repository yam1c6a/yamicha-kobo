/** Detect the concrete responsibility error observed in the live evaluation.
 * This is a narrow publication rule, not a complete cloud-architecture verifier.
 */
export function cloudAdviceIssues(response) {
  const text = [response.reply, JSON.stringify(response.diagnosis || {}), response.cta?.message || ''].join('\n').normalize('NFKC');
  const statements = text.split(/[。！？!?\n]/u);
  return statements.some((sentence) => /EC2/i.test(sentence) &&
    /フルマネージド(?:の)?OS|OS(?:は|が|を).{0,12}フルマネージド/u.test(sentence) &&
    !/では(?:ありません|ない)|(?:という|との)(?:説明|記述)は(?:誤り|不正確)/u.test(sentence))
    ? ['EC2_GUEST_OS_RESPONSIBILITY'] : [];
}
