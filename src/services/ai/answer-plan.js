import { activeUserTexts } from './technical-context.js';

/** Planning shape is selected from an explicit technical request, not an LLM's
 * self-classification. Definitions and unrelated requests retain the base format.
 */
export function needsAnswerPlan(messages) {
  const latest = messages.filter((message) => message.role === 'user').at(-1)?.content || '';
  if (/^(?:.{0,25})(?:とは何|って何|の意味だけ|を一言で)/u.test(latest)) return false;
  const technical = /\b(?:AWS|EC2|ECS|Fargate|Lambda|LLM|RAG|AI|API|GIS|Excel|VBA|Python|PostgreSQL|SQL|Windows|Linux|Ollama)\b|システム|ソフトウェア|プログラム|データベース|サーバー|クラウド|ネットワーク|アプリ|自動化|コード|ツール|Power\s*Query/i;
  return technical.test(activeUserTexts(messages).join('\n')) && /構成|手順|進め方|導入方法|最初に試す|どう選|どう変|どこを残|どこだけに/u.test(latest);
}
const list = (description, minimum, maximum) => ({
  type: 'array', description, minItems: minimum, maxItems: maximum,
  items: { type: 'string', minLength: 1, maxLength: 160 },
});

/** No phase, nullable plan or diagnosis branch: these previously allowed a
 * procedure request to become a one-line discovery response without a question.
 */
export function schemaWithAnswerPlan(_base) {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      reply: { type: 'string', minLength: 1, maxLength: 250, description: '相談条件に対する短い結論。具体的な理由・操作・注意点はplanに書く。' },
      plan: {
        type: 'object', additionalProperties: false,
        properties: {
          reasons: list('主案の機能と今回の条件を結び付けた選定理由。採用例が多い、だけでは不可。', 1, 2),
          steps: list('実際に行う操作の順番。使用する機能、入力元、設定や変換、正しい結果の確認を具体化する。調べる・検討するだけで終えない。', 2, 4),
          cautions: list('利用者に残る運用責任、情報の送信先と許可、未確認の重要条件。安全性を無条件に保証しない。', 1, 3),
        }, required: ['reasons', 'steps', 'cautions'],
      },
      questions: { type: 'array', items: { type: 'string', maxLength: 220 }, maxItems: 1, description: '通常は空配列。安全な暫定案も出せない不可欠な未回答条件だけ最大1問。' },
      source_ids: { type: 'array', items: { type: 'string' }, maxItems: 3, description: '実際に使用した提供済み技術ノートのid。' },
    }, required: ['reply', 'plan', 'questions', 'source_ids'],
  };
}
export const ANSWER_PLAN_INSTRUCTION = '\n【今回の専用出力】JSON Schemaのreply・plan・questions・source_idsだけを出力する。phase・diagnosis・ctaは出力しない。planは必須でnull不可。replyは250文字以内の結論、plan.reasonsは条件に合う理由、stepsは実際の操作、cautionsは運用責任と安全条件。各項目160文字以内、全体は目安600〜1000文字。これらは利用者向けの説明であり、内部思考ではない。条件不足なら確定できない部分を明示し、安全な確認・試作の進め方を説明する。質問だけの回答や結論だけで終えない。一般論や「適切に設定する」で終わらず、使う機能と操作・照合する結果を書く。例えばデータ処理は入力元を選ぶ→対象を絞る→変換・集計→件数と合計を照合する。EC2のゲストOS、Fargateのコンテナイメージの更新責任は利用者に残る。ローカル生成だけで埋め込みやログの送信先まで社内になると仮定しない。';

export function planningSystemPrompt(base) {
  const start = base.indexOf('【出力】');
  const safety = base.indexOf('【入力の扱い】');
  const instructions = start >= 0 && safety > start ? base.slice(0, start) + base.slice(safety) : base;
  return instructions + ANSWER_PLAN_INSTRUCTION;
}

/** Validate and compose model-generated parts; never fill absent facts or steps.
 * No model-selected phase may bypass these checks once planning was requested.
 */
export function composeAnswerPlan(data, required) {
  if (!required) return data;
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
  return { ...data, phase: 'answer', diagnosis: null, cta: { show: false, message: '' }, reply };
}
