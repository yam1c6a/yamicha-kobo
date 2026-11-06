/** A narrow, deterministic publication guard, not a general semantic verifier.
 * A flagged model answer is withheld, never silently replaced with a canned answer.
 * Never log the answer or conversation here. There is no retry / second inference.
 */
const normalized = (value) => value.normalize('NFKC').replace(/\s+/gu, '');
const sentences = (value) => normalized(value).split(/[。！？!?\n]/u).filter(Boolean);

export function privacyReviewIssues(response, messages) {
  const text = [response.reply, JSON.stringify(response.diagnosis || {}), response.cta?.message || ''].join('\n');
  const issues = new Set();
  for (const sentence of sentences(text)) {
    const local = /ローカル|オンプレ|Ollama|ollama/u.test(sentence);
    const disclosure = /社外|外部|送信|漏(?:洩|えい)|流出/u.test(sentence);
    const absolute = /完全に(?:防|阻止|遮断)|絶対に(?:送信|漏|流出|安全)|(?:送信|漏洩|漏えい)(?:され|し)ないことを保証|100%(?:安全|防)/u.test(sentence);
    const denial = /(?:保証|断言)(?:は)?でき(?:ません|ない)|防(?:げません|げない|げるとは限ら)|とは限(?:りません|らない)|だけでは(?:不十分|防げ)|という(?:説明|主張|断言)は(?:誤り|不正確)/u.test(sentence);
    if (local && disclosure && absolute && !denial) issues.add('LOCAL_PRIVACY_GUARANTEE');
  }
  // Only explicit user conditions, never an assistant's invented approval.
  let restricted = false;
  for (const { role, content } of messages) {
    if (role !== 'user') continue;
    if (/^(?:別件|ところで|話題を変|新しい相談)/u.test(content.trim())) restricted = false;
    for (const sentence of sentences(content)) {
      if (/[「『>]/u.test(sentence) || !/(?:社外|外部).{0,16}(?:送信|持ち出し)/u.test(sentence)) continue;
      if (/許可済|承認済|許可されました|送信可能と確認/u.test(sentence)) restricted = false;
      else if (/確認中|未確認|未定|未承認|禁止|不可|送信できません/u.test(sentence)) restricted = true;
    }
  }
  if (restricted) {
    for (const sentence of sentences(text)) {
      const external = /外部.{0,16}API|クラウド.{0,16}(?:試|送信|比較)|API.{0,24}(?:両方|双方)/u.test(sentence);
      const real = /実(?:際の)?(?:文書|資料|データ)|社内(?:文書|規程|資料)/u.test(sentence);
      const action = /試|評価|比較|送信|入力|アップロード/u.test(sentence);
      const safe = /公開.{0,8}(?:データ|文書|資料)|合成|ダミー|承認後|許可後|送(?:らない|信しない|信せず|信は禁止)|避け|使わない/u.test(sentence);
      if (external && real && action && !safe) issues.add('UNAPPROVED_REAL_DATA');
    }
  }
  return [...issues];
}
