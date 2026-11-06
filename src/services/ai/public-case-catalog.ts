import { caseStudies } from '../../data/case-studies.js';
import { CHAT_LIMITS } from './consultation-limits.js';
import type { ChatMessage, ConsultationResponse } from './types';

/** Pure catalogue requests use published facts, not model-authored biographies.
 * Technical proposals, quotations, feasibility and inferred experience still
 * go through consultation. No synthetic expected answers or new case facts.
 */
export function publicCaseCatalog(messages: ChatMessage[]): ConsultationResponse | null {
  const query = (messages.filter((item) => item.role === 'user').at(-1)?.content || '').normalize('NFKC');
  if (!/工房|御社|貴社/u.test(query) || !/実績|事例|開発例/u.test(query) ||
      !/教え|紹介|見せ|一覧|挙げ|どんな/u.test(query)) return null;
  if (/構成|手順|比較|見積|料金|費用|納期|依頼|要件|作りたい|作れます|開発して|導入して|可能ですか/u.test(query)) return null;
  const topics = [
    { match: /GIS|地理空間|地図|道路/i, includes: (item: typeof caseStudies[number]) => item.category.includes('GIS') },
    { match: /Teams|ナレッジ|対話/i, includes: (item: typeof caseStudies[number]) => item.id === 'knowledge-memory' },
    { match: /ECサイト|EC運営|EC関連|商品|在庫/i, includes: (item: typeof caseStudies[number]) => item.id === 'ec-operations' },
    { match: /RAG|文書検索|公開文書/i, includes: (item: typeof caseStudies[number]) => item.tech.includes('RAG') || item.id === 'public-documents' },
  ];
  const matched = topics.filter((topic) => topic.match.test(query));
  // Generic catalogue requests are accepted, but don't turn an unknown sector
  // request into all projects and imply there is experience in that sector.
  if (!matched.length && !/(?:工房|御社|貴社)(?:の)?(?:主な|開発|全体の|すべての)?(?:実績|事例)|どんな(?:開発)?実績/u.test(query)) return null;
  const selected = matched.length ? caseStudies.filter((item) => matched.some((topic) => topic.includes(item))) : caseStudies;
  if (!selected.length) return null;
  const header = '公開している開発事例は次のとおりです。';
  const footer = '掲載内容は開発に関わったシステムの概要です。工房による単独受託や既製品の販売を意味するものではありません。個別の対応可否はご相談時に確認します。';
  const entries: string[] = [];
  for (const item of selected) {
    const entry = `${entries.length + 1}. ${item.title}\n${item.overview}`;
    if ([header, ...entries, entry, footer].join('\n\n').length > CHAT_LIMITS.replyChars) break;
    entries.push(entry);
  }
  if (!entries.length) return null;
  return {
    phase: 'answer', reply: [header, ...entries, footer].join('\n\n'), questions: [], diagnosis: null,
    cta: { show: false, message: '' }, sources: [], answerSource: 'public-catalog',
  };
}
