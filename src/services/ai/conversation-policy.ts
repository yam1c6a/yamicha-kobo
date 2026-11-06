import type { ConsultationResponse, GenerateConsultationInput } from './types';
import { CHAT_LIMITS } from './consultation-limits.js';
import { deduplicateFollowUp } from './question-deduplication.js';

export const applyConversationPolicy = (response: ConsultationResponse, input: GenerateConsultationInput): ConsultationResponse => {
  const lastTurn = input.messages.filter((message) => message.role === 'user').length >= CHAT_LIMITS.turns;
  const previous = input.messages.filter((message) => message.role === 'assistant');
  const candidates = response.questions.map((question) => question.trim()).filter(Boolean).slice(0, 1);
  // Clean before suppressing final-turn/repeated questions so the identical
  // question cannot remain in the reply after its structured entry is removed.
  const cleaned = deduplicateFollowUp(response.reply, candidates);
  const questions = response.phase === 'diagnosis' || response.phase === 'out_of_scope' || lastTurn ? []
    : cleaned.questions.filter((question) => !previous.some((message) => message.content.includes(question)));
  return {
    ...response, reply: cleaned.reply, questions,
    diagnosis: response.phase === 'diagnosis' ? response.diagnosis : null,
    cta: response.phase === 'out_of_scope' || response.phase === 'discovery'
      ? { show: false, message: '' } : response.cta,
    sources: response.phase === 'out_of_scope' ? [] : response.sources,
  };
};
