import type { ConsultationResponse, GenerateConsultationInput } from './types';

export const applyConversationPolicy = (
	response: ConsultationResponse,
	input: GenerateConsultationInput,
): ConsultationResponse => {
	// Preserve a useful diagnosis regardless of initial message length.
	if (response.phase === 'diagnosis') return { ...response, questions: [] };
	const lastTurn = input.messages.filter((message) => message.role === 'user').length >= 6;
	const priorReplies = input.messages.filter((message) => message.role === 'assistant');
	const questions = response.phase === 'out_of_scope' || lastTurn ? []
		: response.questions.map((question) => question.trim())
			.filter((question) => question && !priorReplies.some((message) => message.content.includes(question)))
			.slice(0, 1);
	return { ...response, questions, cta: { show: false, message: '' } };
};
