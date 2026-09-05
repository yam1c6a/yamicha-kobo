import { getAIConfig } from '../config';
import { buildConsultationInput, CONSULTATION_SYSTEM_PROMPT } from '../consultation-prompt';
import { consultationResponseSchema } from '../consultation-schema';
import type {
	AIRequirement,
	ConsultationDiagnosis,
	ConsultationPhase,
	ConsultationProvider,
	ConsultationResponse,
	GenerateConsultationInput,
	ImplementationDifficulty,
} from '../types';

type WorkersAIBinding = {
	run(model: string, input: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
};

const phases: ConsultationPhase[] = ['discovery', 'diagnosis', 'out_of_scope'];
const aiRequirements: AIRequirement[] = ['recommended', 'partially_recommended', 'not_required', 'undetermined'];
const difficulties: ImplementationDifficulty[] = ['low', 'medium', 'high', 'undetermined'];

const cleanString = (value: unknown, maxLength = 600) =>
	typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const cleanStringArray = (value: unknown, maxItems = 8) =>
	Array.isArray(value)
		? value.map((item) => cleanString(item, 240)).filter(Boolean).slice(0, maxItems)
		: [];

const parseJsonResponse = (result: unknown): Record<string, unknown> => {
	const response = typeof result === 'object' && result !== null && 'response' in result
		? (result as { response: unknown }).response
		: result;

	if (typeof response === 'object' && response !== null) return response as Record<string, unknown>;
	if (typeof response !== 'string') throw new Error('Workers AI returned an unsupported response.');

	const normalized = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	return JSON.parse(normalized) as Record<string, unknown>;
};

const normalizeDiagnosis = (value: unknown): ConsultationDiagnosis => {
	const diagnosis = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
	const aiRequired = cleanString(diagnosis.ai_required) as AIRequirement;
	const difficulty = cleanString(diagnosis.difficulty) as ImplementationDifficulty;

	return {
		category: cleanString(diagnosis.category, 120),
		current_process: cleanStringArray(diagnosis.current_process),
		problems: cleanStringArray(diagnosis.problems),
		recommended_solution: cleanStringArray(diagnosis.recommended_solution),
		automation_methods: cleanStringArray(diagnosis.automation_methods),
		ai_required: aiRequirements.includes(aiRequired) ? aiRequired : 'undetermined',
		ai_reason: cleanString(diagnosis.ai_reason, 360),
		expected_effects: cleanStringArray(diagnosis.expected_effects),
		difficulty: difficulties.includes(difficulty) ? difficulty : 'undetermined',
		missing_information: cleanStringArray(diagnosis.missing_information, 5),
	};
};

const normalizeResponse = (value: Record<string, unknown>): ConsultationResponse => {
	const phaseValue = cleanString(value.phase) as ConsultationPhase;
	const ctaValue = typeof value.cta === 'object' && value.cta !== null ? value.cta as Record<string, unknown> : {};
	const phase = phases.includes(phaseValue) ? phaseValue : 'discovery';
	const questions = cleanStringArray(value.questions, 3);

	return {
		phase,
		reply: cleanString(value.reply, 700) || '内容をもう少し詳しく教えてください。',
		questions,
		diagnosis: normalizeDiagnosis(value.diagnosis),
		cta: {
			show: phase === 'diagnosis' && ctaValue.show === true,
			message: cleanString(ctaValue.message, 220),
		},
	};
};

export class WorkersAIProvider implements ConsultationProvider {
	async generate({ messages, env }: GenerateConsultationInput): Promise<ConsultationResponse> {
		const ai = env.AI as WorkersAIBinding | undefined;
		if (!ai?.run) throw new Error('Workers AI binding is not configured.');

		const config = getAIConfig(env);
		const gatewayOptions = config.gatewayId
			? { gateway: { id: config.gatewayId, skipCache: true, collectLog: false } }
			: undefined;

		const result = await ai.run(
			config.model,
			{
				messages: [
					{ role: 'system', content: CONSULTATION_SYSTEM_PROMPT },
					{ role: 'user', content: buildConsultationInput(messages) },
				],
				response_format: {
					type: 'json_schema',
					json_schema: consultationResponseSchema,
				},
				max_tokens: 900,
				temperature: 0.2,
			},
			gatewayOptions,
		);

		return normalizeResponse(parseJsonResponse(result));
	}
}
