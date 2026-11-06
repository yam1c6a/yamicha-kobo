import { getAIConfig } from '../config';
import { buildConsultationInput, CONSULTATION_SYSTEM_PROMPT } from '../consultation-prompt';
import { consultationResponseSchema } from '../consultation-schema';
import { CHAT_LIMITS } from '../consultation-limits.js';
import { retrieveTechnicalNotes, technicalContext, resolveSources, freshnessNotice } from '../technical-context.js';
import type { AIRequirement, ConsultationDiagnosis, ConsultationPhase, ConsultationProvider, ConsultationResponse, GenerateConsultationInput, ImplementationDifficulty } from '../types';

type WorkersAIBinding = { run(model: string, input: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown> };
const phases: ConsultationPhase[] = ['answer', 'discovery', 'diagnosis', 'out_of_scope'];
const aiRequirements: AIRequirement[] = ['recommended', 'partially_recommended', 'not_required', 'undetermined'];
const difficulties: ImplementationDifficulty[] = ['low', 'medium', 'high', 'undetermined'];
const cleanString = (value: unknown, length = 220) => typeof value === 'string' ? value.trim().slice(0, length) : '';
const strings = (value: unknown, count = 3) => Array.isArray(value) ? value.map((item) => cleanString(item)).filter(Boolean).slice(0, count) : [];

export const parseJsonResponse = (result: unknown): Record<string, unknown> => {
  let response = typeof result === 'object' && result !== null && 'response' in result ? (result as { response: unknown }).response : result;
  if (typeof response === 'string') response = JSON.parse(response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('AI_INVALID_RESPONSE');
  return response as Record<string, unknown>;
};

const normalizeDiagnosis = (value: unknown): ConsultationDiagnosis | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const required = cleanString(data.ai_required) as AIRequirement;
  const difficulty = cleanString(data.difficulty) as ImplementationDifficulty;
  return {
    category: cleanString(data.category, 80), current_process: strings(data.current_process), problems: strings(data.problems),
    recommended_solution: strings(data.recommended_solution), automation_methods: strings(data.automation_methods),
    ai_required: aiRequirements.includes(required) ? required : 'undetermined', ai_reason: cleanString(data.ai_reason, 300),
    expected_effects: strings(data.expected_effects), difficulty: difficulties.includes(difficulty) ? difficulty : 'undetermined',
    missing_information: strings(data.missing_information),
  };
};

export const normalizeResponse = (data: Record<string, unknown>): ConsultationResponse => {
  const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
  // Do not silently slice a technical explanation or display an empty fallback as a real answer.
  if (!reply || reply.length > CHAT_LIMITS.replyChars) throw new Error('AI_INVALID_RESPONSE');
  const requested = cleanString(data.phase) as ConsultationPhase;
  let phase: ConsultationPhase = phases.includes(requested) ? requested : 'answer';
  const diagnosis = phase === 'diagnosis' ? normalizeDiagnosis(data.diagnosis) : null;
  if (phase === 'diagnosis' && !diagnosis) phase = 'answer';
  const cta = data.cta && typeof data.cta === 'object' ? data.cta as Record<string, unknown> : {};
  return {
    phase, reply, questions: strings(data.questions, 1), diagnosis,
    cta: { show: (phase === 'answer' || phase === 'diagnosis') && cta.show === true, message: cleanString(cta.message, 160) },
  };
};

export class WorkersAIProvider implements ConsultationProvider {
  async generate({ messages, env }: GenerateConsultationInput): Promise<ConsultationResponse> {
    const ai = env.AI as WorkersAIBinding | undefined;
    if (!ai?.run) throw new Error('Workers AI binding is not configured.');
    const config = getAIConfig(env);
    const notes = retrieveTechnicalNotes(messages);
    // Exactly one inference per request. No hidden retry, live crawler or paid search.
    const result = await ai.run(config.model, {
      messages: [
        { role: 'system', content: CONSULTATION_SYSTEM_PROMPT },
        { role: 'user', content: buildConsultationInput(messages, technicalContext(notes)) },
      ],
      response_format: { type: 'json_schema', json_schema: consultationResponseSchema },
      max_tokens: config.maxTokens, temperature: 0.2,
    }, config.gatewayId ? { gateway: { id: config.gatewayId, skipCache: true, collectLog: false } } : undefined);
    const parsed = parseJsonResponse(result);
    const response = normalizeResponse(parsed);
    return {
      ...response,
      sources: response.phase === 'out_of_scope' ? [] : resolveSources(parsed.source_ids, notes),
      sourceNotice: freshnessNotice(messages, notes),
    };
  }
}
