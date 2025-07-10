// 代表一個有時間和講者資訊的語句片段
export interface TranscriptSegment {
  text: string;
  speaker: string; // e.g., "Speaker A", "Speaker B"
  start_time: number; // 單位：秒
  end_time: number;   // 單位：秒
  confidence?: number;
}

// WebSocket 回傳的完整資料結構
export interface TranscriptResponse {
  is_final: boolean; // 標示是否為最終結果
  segments: TranscriptSegment[]; // 包含一個或多個語句片段
  // 向後相容性：保留舊格式
  transcript?: string;
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
  provider: string;
  system_prompt: string;
  user_role: string;
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
  provider_type: 'stt' | 'llm';
  requires_api_key: boolean;
  config_schema: Record<string, unknown>;
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