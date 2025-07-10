export interface TranscriptResponse {
  transcript: string;
  is_final: boolean;
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatRequest {
  context: string;
  query: string;
  provider?: string;
  system_prompt?: string;
  user_role?: string;
}

export interface ChatResponse {
  response: string;
}

export interface AudioVisualizationData {
  frequency: number[];
  volume: number;
}

// Provider related types
export interface ProviderMetadata {
  name: string;
  display_name: string;
  description: string;
  version: string;
  provider_type: 'llm' | 'stt';
  requires_api_key: boolean;
  config_schema: Record<string, any>;
  supported_models: string[];
  default_model: string;
  capabilities: string[];
  author: string;
  homepage: string;
}

export interface ProvidersResponse {
  providers: ProviderMetadata[];
}

export interface ProviderConfig {
  [key: string]: any;
}

export interface ProviderSelection {
  provider: string;
  model?: string;
  config?: ProviderConfig;
}