import type { AIEnvironment } from './types';

export const DEFAULT_AI_PROVIDER = 'workers-ai';
export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export const getAIConfig = (env: AIEnvironment) => ({
	provider: env.AI_PROVIDER?.trim() || DEFAULT_AI_PROVIDER,
	model: env.WORKERS_AI_MODEL?.trim() || DEFAULT_WORKERS_AI_MODEL,
	gatewayId: env.AI_GATEWAY_ID?.trim() || undefined,
});
