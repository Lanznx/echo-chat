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
}

export interface ChatResponse {
  response: string;
}

export interface AudioVisualizationData {
  frequency: number[];
  volume: number;
}