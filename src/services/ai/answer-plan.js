/** Explicit architecture / procedure requests need more than a one-line conclusion.
 * This routes output shape, not technical choices or expected answers.
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
      reply: { type: 'string', minLength: 1, maxLength: 250, description: '相談条件に対する結論。手順や注意点はplanへ分ける。' },
      plan: {
        description: 'answerの場合は必須の具体案。他のphaseではnull。内部思考ではなく、利用者に見せる回答の各部分。',
        anyOf: [
          { type: 'null' },
          { type: 'object', additionalProperties: false,
            properties: {
              reasons: list('相談条件に合う理由と、代替案に切り替える条件。一般論ではなく今回の前提に結び付ける。', 1, 2),
              steps: list('順番のある具体的操作。利用する機能、何を入力・設定し、どの結果を確認するか。開発・テスト等の工程名だけは不可。', 2, 4),
              cautions: list('利用者に残る運用責任、情報の送信先と許可、判断の前提。安全性を無条件に保証しない。', 1, 3),
            }, required: ['reasons', 'steps', 'cautions'] },
        ],
      },
    }, required: [...base.required, 'plan'],
  };
}
export const ANSWER_PLAN_INSTRUCTION = '\n【今回の構成・手順回答】指定Schemaのplanを使う。replyは250文字以内の結論だけ。answerならplan=nullは禁止。理由をreasons、実際の操作をsteps、運用責任や安全条件をcautionsへ書く。各項目160文字以内、全体は目安600〜1000文字。すべて利用者に表示される説明であり、内部思考ではない。例えば「適切に設定する」ではなく、対象の機能と設定・照合する内容を具体化する。EC2のゲストOSは利用者が更新する。Fargateでもコンテナイメージ内のパッケージは利用者が更新する。生成LLMのローカル化と、埋め込み・ログ等のローカル化は別々に設定と通信を検証する。';

/** Compose only generated sections. Never insert expected factual answers. */
export function composeAnswerPlan(data, required) {
  if (!required || data.phase !== 'answer') return data;
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
