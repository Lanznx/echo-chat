import { ProviderMetadata, ProvidersResponse } from '@/types';
import { appConfig } from '@/config/app';

export class ProviderService {
  private static instance: ProviderService;
  private llmProvidersCache: ProviderMetadata[] | null = null;
  private sttProvidersCache: ProviderMetadata[] | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastLlmFetch: number = 0;
  private lastSttFetch: number = 0;

  static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private constructor() {}

  private async fetchProviders(type: 'llm' | 'stt'): Promise<ProviderMetadata[]> {
    try {
      console.log('AppConfig apiBaseUrl:', appConfig.apiBaseUrl);
      const url = `${appConfig.apiBaseUrl}/api/providers/${type}`;
      console.log(`Fetching ${type} providers from:`, url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add some timeout and error handling
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      console.log(`Response status for ${type} providers:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch ${type} providers:`, response.status, errorText);
        throw new Error(`Failed to fetch ${type} providers: ${response.status} - ${errorText}`);
      }
      
      const data: ProvidersResponse = await response.json();
      console.log(`Received ${type} providers:`, data.providers);
      return data.providers;
    } catch (error) {
      console.error(`Error fetching ${type} providers:`, error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  async getLlmProviders(forceRefresh = false): Promise<ProviderMetadata[]> {
    const now = Date.now();
    
    if (!forceRefresh && 
        this.llmProvidersCache && 
        (now - this.lastLlmFetch) < this.cacheExpiry) {
      return this.llmProvidersCache;
    }

    this.llmProvidersCache = await this.fetchProviders('llm');
    this.lastLlmFetch = now;
    return this.llmProvidersCache;
  }

  async getSttProviders(forceRefresh = false): Promise<ProviderMetadata[]> {
    const now = Date.now();
    
    if (!forceRefresh && 
        this.sttProvidersCache && 
        (now - this.lastSttFetch) < this.cacheExpiry) {
      return this.sttProvidersCache;
    }

    this.sttProvidersCache = await this.fetchProviders('stt');
    this.lastSttFetch = now;
    return this.sttProvidersCache;
  }

  async getProviderByName(type: 'llm' | 'stt', name: string): Promise<ProviderMetadata | undefined> {
    const providers = type === 'llm' 
      ? await this.getLlmProviders() 
      : await this.getSttProviders();
    
    return providers.find(provider => provider.name === name);
  }

  clearCache(): void {
    this.llmProvidersCache = null;
    this.sttProvidersCache = null;
    this.lastLlmFetch = 0;
    this.lastSttFetch = 0;
  }

  // Get default provider for a type
  async getDefaultProvider(type: 'llm' | 'stt'): Promise<ProviderMetadata | undefined> {
    const providers = type === 'llm' 
      ? await this.getLlmProviders() 
      : await this.getSttProviders();
    
    // Return first available provider as default
    return providers.length > 0 ? providers[0] : undefined;
  }

  // Check if a provider supports a specific capability
  async providerSupportsCapability(
    type: 'llm' | 'stt', 
    providerName: string, 
    capability: string
  ): Promise<boolean> {
    const provider = await this.getProviderByName(type, providerName);
    return provider?.capabilities.includes(capability) ?? false;
  }
}

export const providerService = ProviderService.getInstance();