import { getAIConfig } from './config';
import { WorkersAIProvider } from './providers/workers-ai';
import type { ConsultationProvider, ConsultationResponse, GenerateConsultationInput } from './types';

const providers: Record<string, ConsultationProvider> = {
	'workers-ai': new WorkersAIProvider(),
};

const defaultDiscoveryQuestions = [
	'最終的に、どのような形や場所へまとめていますか？',
	'形式が崩れたファイルや、例外的な処理はありますか？',
	'この作業には、普段どのくらい時間がかかっていますか？',
];

const asQuestion = (value: string) => {
	const text = value.trim().replace(/[。.!！]+$/, '');
	return /[?？]$/.test(text) ? text : `${text}について、分かる範囲で教えてください。`;
};

const ensureDiscoveryQuestions = (questions: string[]) => {
	const result = [...new Set(questions.filter(Boolean))].slice(0, 3);
	for (const question of defaultDiscoveryQuestions) {
		if (result.length >= 2) break;
		if (!result.includes(question)) result.push(question);
	}
	return result;
};

const applyConversationPolicy = (
	response: ConsultationResponse,
	input: GenerateConsultationInput,
): ConsultationResponse => {
	const userTurns = input.messages.filter((message) => message.role === 'user').length;
	const firstTurnNeedsDetails = userTurns === 1
		&& response.phase === 'diagnosis'
		&& response.diagnosis.missing_information.length > 0;

	if (response.phase !== 'discovery' && !firstTurnNeedsDetails) return response;

	const sourceQuestions = firstTurnNeedsDetails
		? response.diagnosis.missing_information.map(asQuestion)
		: response.questions;

	return {
		...response,
		phase: 'discovery',
		reply: firstTurnNeedsDetails
			? '改善方法を絞り込むため、もう少しだけ確認させてください。'
			: response.reply,
		questions: ensureDiscoveryQuestions(sourceQuestions),
		cta: { show: false, message: '' },
	};
};

export const generateConsultationResponse = async (input: GenerateConsultationInput) => {
	const { provider } = getAIConfig(input.env);
	const selectedProvider = providers[provider];
	if (!selectedProvider) throw new Error(`Unsupported AI provider: ${provider}`);
	return applyConversationPolicy(await selectedProvider.generate(input), input);
};
