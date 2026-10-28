import type { ConsultationDiagnosis } from './types';

// Carry displayed proposals into follow-up turns within the API's history limit.
export const buildAssistantHistory = (content: string, questions: string[], diagnosis?: ConsultationDiagnosis | null) => {
	const parts = [content.slice(0, 700)];
	if (questions.length) parts.push(`確認したこと:\n${questions.slice(0, 1).map((q) => `- ${q.slice(0, 240)}`).join('\n')}`);
	if (diagnosis) {
		const proposals = diagnosis.recommended_solution.slice(0, 2).map((item) => item.slice(0, 160));
		if (proposals.length) parts.push(`提示した改善案:\n${proposals.join('\n')}`);
		if (diagnosis.ai_reason) parts.push(`AIの使いどころ: ${diagnosis.ai_reason.slice(0, 140)}`);
		if (diagnosis.missing_information.length) parts.push(`未確認事項: ${diagnosis.missing_information[0].slice(0, 100)}`);
	}
	return parts.join('\n\n').slice(0, 1_600);
};
