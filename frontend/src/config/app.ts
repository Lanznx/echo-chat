export interface IAppConfig {
  apiBaseUrl: string;
  streamingDelay: number;
  websocketUrl: string;
}

class AppConfig implements IAppConfig {
  get apiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  get streamingDelay(): number {
    return Number(process.env.NEXT_PUBLIC_STREAMING_DELAY) || 0.1;
  }

  get websocketUrl(): string {
    const baseUrl = this.apiBaseUrl.replace('http', 'ws');
    return `${baseUrl}/ws/stream`;
  }
}

export const appConfig = new AppConfig();