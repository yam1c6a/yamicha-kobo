import type { ConsultationResponse, GenerateConsultationInput } from './types';
import { CHAT_LIMITS } from './consultation-limits.js';

export const applyConversationPolicy = (response: ConsultationResponse, input: GenerateConsultationInput): ConsultationResponse => {
  const lastTurn = input.messages.filter((message) => message.role === 'user').length >= CHAT_LIMITS.turns;
  const previous = input.messages.filter((message) => message.role === 'assistant');
  const questions = response.phase === 'diagnosis' || response.phase === 'out_of_scope' || lastTurn ? []
    : response.questions.map((question) => question.trim())
      .filter((question) => question && !previous.some((message) => message.content.includes(question))).slice(0, 1);
  return {
    ...response, questions,
    diagnosis: response.phase === 'diagnosis' ? response.diagnosis : null,
    cta: response.phase === 'out_of_scope' || response.phase === 'discovery'
      ? { show: false, message: '' } : response.cta,
    sources: response.phase === 'out_of_scope' ? [] : response.sources,
  };
};
