/** Explicit architecture / procedure requests need more than a conclusion.
 * Select output shape, not technical choices or expected answers.
 */
export function needsAnswerPlan(messages) {
  const latest = messages.filter((message) => message.role === 'user').at(-1)?.content || '';
  if (/^(?:.{0,25})(?:とは何|って何|の意味だけ|を一言で)/u.test(latest)) return false;
  return /構成|手順|進め方|導入方法|最初に試す|どう選|どう変|どこを残|どこだけに/u.test(latest);
}
const list = (description, minimum, maximum) => ({
  type: 'array', description, minItems: minimum, maxItems: maximum,
  items: { type: 'string', minLength: 1, maxLength: 160 },
});
export function schemaWithAnswerPlan(base) {
  return {
    ...base,
    properties: {
      ...base.properties,
      // Explicit planning uses one answer shape, never the unrelated diagnosis
      // branch whose empty payload could previously normalize back to answer.
      phase: { type: 'string', enum: ['answer', 'discovery', 'out_of_scope'] },
      diagnosis: { type: 'null' },
      reply: { type: 'string', minLength: 1, maxLength: 250, description: '相談条件に対する結論。手順や注意点はplanへ分ける。' },
      plan: {
        description: 'answerの場合は必須の具体案。他のphaseではnull。すべて利用者に見せる回答。',
        anyOf: [{ type: 'null' }, {
          type: 'object', additionalProperties: false,
          properties: {
            reasons: list('今回の条件に主案が適する理由。採用例が多いから、だけではなく条件と機能の関係を説明する。', 1, 2),
            steps: list('実際に行う操作を順に書く。対象の機能、入力、設定・操作内容、結果の確認を具体化する。調べる・検討する・適切に設定するだけでは不可。', 2, 4),
            cautions: list('利用者に残る運用責任と安全条件。本文で省いた重要な条件をここに書く。', 1, 3),
          }, required: ['reasons', 'steps', 'cautions'],
        }],
      },
    }, required: [...base.required, 'plan'],
  };
}
export const ANSWER_PLAN_INSTRUCTION = '\n【今回の構成・手順回答】今回はdiagnosisは使わずnullにする。answerならplan必須、replyは250文字以内の結論だけ。選定理由をreasons、実際の操作をsteps、利用者に残る運用責任と安全条件をcautionsへ。各項目160文字以内、全体は目安600〜1000文字。すべて利用者に表示される説明であり内部思考ではない。一般論や「適切に設定する」で終わらず、使う機能とその操作・検証結果を書く。例えばデータ処理は入力元を選ぶ→対象を絞る→変換・集計→件数と合計を照合する。システム構成は役割を持つ部品をどう接続して動作確認するかを書く。EC2のゲストOS、Fargateのコンテナイメージの更新責任は利用者に残る。ローカル生成だけで埋め込みやログの送信先まで社内になると仮定しない。';

/** Compose generated sections only. Caller supplies the normalized phase before
 * validation: phase coercion must never bypass completeness checks.
 */
export function composeAnswerPlan(data, required) {
  if (!required) return data;
  if (data.phase === 'diagnosis' || !['answer', 'discovery', 'out_of_scope'].includes(data.phase)) throw new Error('AI_INVALID_RESPONSE');
  if (data.phase !== 'answer') return data;
  const plan = data.plan;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || typeof data.reply !== 'string' || !data.reply.trim() || data.reply.trim().length > 250) throw new Error('AI_INVALID_RESPONSE');
  const limits = { reasons: [1, 2], steps: [2, 4], cautions: [1, 3] };
  const lists = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    const values = plan[key];
    if (!Array.isArray(values) || values.length < min || values.length > max || values.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 160)) throw new Error('AI_INVALID_RESPONSE');
    lists[key] = values.map((value) => value.trim());
  }
  const reply = [data.reply.trim(), '選ぶ理由\n' + lists.reasons.map((value) => '・' + value).join('\n'),
    '進め方\n' + lists.steps.map((value, index) => `${index + 1}. ${value}`).join('\n'),
    '注意点\n' + lists.cautions.map((value) => '・' + value).join('\n')].join('\n\n');
  if (reply.length > 1800) throw new Error('AI_INVALID_RESPONSE');
  return { ...data, reply };
}
