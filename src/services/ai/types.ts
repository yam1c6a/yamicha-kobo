export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
	role: ChatRole;
	content: string;
};

export type ConsultationPhase = 'discovery' | 'diagnosis' | 'out_of_scope';
export type AIRequirement = 'recommended' | 'partially_recommended' | 'not_required' | 'undetermined';
export type ImplementationDifficulty = 'low' | 'medium' | 'high' | 'undetermined';

export type ConsultationDiagnosis = {
	category: string;
	current_process: string[];
	problems: string[];
	recommended_solution: string[];
	automation_methods: string[];
	ai_required: AIRequirement;
	ai_reason: string;
	expected_effects: string[];
	difficulty: ImplementationDifficulty;
	missing_information: string[];
};

export type ConsultationResponse = {
	phase: ConsultationPhase;
	reply: string;
	questions: string[];
	diagnosis: ConsultationDiagnosis;
	cta: {
		show: boolean;
		message: string;
	};
};

export type AIEnvironment = {
	AI?: unknown;
	AI_PROVIDER?: string;
	WORKERS_AI_MODEL?: string;
	AI_GATEWAY_ID?: string;
};

export type GenerateConsultationInput = {
	messages: ChatMessage[];
	env: AIEnvironment;
};

export interface ConsultationProvider {
	generate(input: GenerateConsultationInput): Promise<ConsultationResponse>;
}
