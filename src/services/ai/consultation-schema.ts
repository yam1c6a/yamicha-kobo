const items = { type: 'array', items: { type: 'string', maxLength: 220 }, maxItems: 3 } as const;
const diagnosis = {
  type: 'object', additionalProperties: false,
  properties: {
    category: { type: 'string', maxLength: 80 },
    current_process: items, problems: items, recommended_solution: items,
    automation_methods: items, expected_effects: items, missing_information: items,
    ai_required: { type: 'string', enum: ['recommended', 'partially_recommended', 'not_required', 'undetermined'] },
    ai_reason: { type: 'string', maxLength: 300 },
    difficulty: { type: 'string', enum: ['low', 'medium', 'high', 'undetermined'] },
  },
  required: ['category', 'current_process', 'problems', 'recommended_solution', 'automation_methods', 'ai_required', 'ai_reason', 'expected_effects', 'difficulty', 'missing_information'],
} as const;
export const consultationResponseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    phase: { type: 'string', enum: ['answer', 'discovery', 'diagnosis', 'out_of_scope'] },
    reply: { type: 'string', minLength: 1, maxLength: 1800 },
    questions: { type: 'array', items: { type: 'string', maxLength: 220 }, maxItems: 1 },
    diagnosis: { anyOf: [{ type: 'null' }, diagnosis] },
    source_ids: { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 3 },
    cta: {
      type: 'object', additionalProperties: false,
      properties: { show: { type: 'boolean' }, message: { type: 'string', maxLength: 160 } },
      required: ['show', 'message'],
    },
  },
  required: ['phase', 'reply', 'questions', 'diagnosis', 'source_ids', 'cta'],
} as const;
