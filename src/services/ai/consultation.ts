import { getAIConfig } from './config';
import { applyConversationPolicy } from './conversation-policy';
import { publicCaseCatalog } from './public-case-catalog';
import { WorkersAIProvider } from './providers/workers-ai';
import type { ConsultationProvider, GenerateConsultationInput } from './types';

const providers: Record<string, ConsultationProvider> = { 'workers-ai': new WorkersAIProvider() };

export const generateConsultationResponse = async (input: GenerateConsultationInput) => {
  const catalog = publicCaseCatalog(input.messages);
  if (catalog) return applyConversationPolicy(catalog, input);
  const { provider } = getAIConfig(input.env);
  const selectedProvider = providers[provider];
  if (!selectedProvider) throw new Error(`Unsupported AI provider: ${provider}`);
  return applyConversationPolicy(await selectedProvider.generate(input), input);
};
