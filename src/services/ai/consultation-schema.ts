export const consultationResponseSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		phase: { type: 'string', enum: ['discovery', 'diagnosis', 'out_of_scope'] },
		reply: { type: 'string' },
		questions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
		diagnosis: {
			type: 'object',
			additionalProperties: false,
			properties: {
				category: { type: 'string' },
				current_process: { type: 'array', items: { type: 'string' } },
				problems: { type: 'array', items: { type: 'string' } },
				recommended_solution: { type: 'array', items: { type: 'string' } },
				automation_methods: { type: 'array', items: { type: 'string' } },
				ai_required: { type: 'string', enum: ['recommended', 'partially_recommended', 'not_required', 'undetermined'] },
				ai_reason: { type: 'string' },
				expected_effects: { type: 'array', items: { type: 'string' } },
				difficulty: { type: 'string', enum: ['low', 'medium', 'high', 'undetermined'] },
				missing_information: { type: 'array', items: { type: 'string' } },
			},
			required: ['category', 'current_process', 'problems', 'recommended_solution', 'automation_methods', 'ai_required', 'ai_reason', 'expected_effects', 'difficulty', 'missing_information'],
		},
		cta: {
			type: 'object',
			additionalProperties: false,
			properties: {
				show: { type: 'boolean' },
				message: { type: 'string' },
			},
			required: ['show', 'message'],
		},
	},
	required: ['phase', 'reply', 'questions', 'diagnosis', 'cta'],
} as const;
