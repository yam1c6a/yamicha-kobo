import { getAIConfig } from './config';
import { WorkersAIProvider } from './providers/workers-ai';
import type { ConsultationProvider, GenerateConsultationInput } from './types';

const providers: Record<string, ConsultationProvider> = {
	'workers-ai': new WorkersAIProvider(),
};

export const generateConsultationResponse = async (input: GenerateConsultationInput) => {
	const { provider } = getAIConfig(input.env);
	const selectedProvider = providers[provider];
	if (!selectedProvider) throw new Error(`Unsupported AI provider: ${provider}`);
	return selectedProvider.generate(input);
};
