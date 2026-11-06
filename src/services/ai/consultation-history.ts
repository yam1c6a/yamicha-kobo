import type { ConsultationDiagnosis } from './types';
import { CHAT_LIMITS } from './consultation-limits.js';

// Carry what was actually displayed, without labelling a question as a fact.
export const buildAssistantHistory = (content: string, questions: string[], diagnosis?: ConsultationDiagnosis | null) => {
  const parts = [content.slice(0, CHAT_LIMITS.replyChars)];
  if (questions.length) parts.push(questions[0].slice(0, 220));
  if (diagnosis) {
    if (diagnosis.recommended_solution.length) parts.push(diagnosis.recommended_solution.slice(0, 3).map((item) => item.slice(0, 160)).join('\n'));
    if (diagnosis.ai_reason) parts.push(diagnosis.ai_reason.slice(0, 160));
    if (diagnosis.missing_information.length) parts.push(diagnosis.missing_information[0].slice(0, 100));
  }
  return parts.join('\n\n').slice(0, CHAT_LIMITS.assistantChars);
};
