import type { AIEnvironment } from './types';
import { CHAT_LIMITS } from './consultation-limits.js';

export const DEFAULT_AI_PROVIDER = 'workers-ai';
// Same Workers AI binding; no new API key or automatically created paid service.
// An existing WORKERS_AI_MODEL override always takes precedence.
export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const getAIConfig = (env: AIEnvironment) => {
  const requested = Number(env.CONSULTATION_MAX_OUTPUT_TOKENS);
  return {
    provider: env.AI_PROVIDER?.trim() || DEFAULT_AI_PROVIDER,
    model: env.WORKERS_AI_MODEL?.trim() || DEFAULT_WORKERS_AI_MODEL,
    gatewayId: env.AI_GATEWAY_ID?.trim() || undefined,
    maxTokens: Number.isInteger(requested) && requested >= 1200
      ? Math.min(requested, 3200) : CHAT_LIMITS.outputTokens,
  };
};
