import { useState, useEffect, useCallback } from 'react';
import { ProviderMetadata, ProviderSelection } from '@/types';
import { providerService } from '@/services/providerService';

export const useProviders = (type: 'llm' | 'stt') => {
  const [providers, setProviders] = useState<ProviderMetadata[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = useCallback(async (forceRefresh = false) => {
    try {
      console.log(`Loading ${type} providers, forceRefresh:`, forceRefresh);
      setIsLoading(true);
      setError(null);
      
      const providersData = type === 'llm' 
        ? await providerService.getLlmProviders(forceRefresh)
        : await providerService.getSttProviders(forceRefresh);
      
      console.log(`Loaded ${type} providers:`, providersData);
      setProviders(providersData);
      
      // Set default provider if none selected
      if (!selectedProvider && providersData.length > 0) {
        const defaultProvider = providersData[0];
        console.log(`Setting default ${type} provider:`, defaultProvider.name);
        setSelectedProvider(defaultProvider.name);
        setSelectedModel(defaultProvider.default_model);
      }
    } catch (err) {
      const errorMessage = `Failed to load ${type} providers: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMessage);
      console.error(`Error loading ${type} providers:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [type, selectedProvider]);

  useEffect(() => {
    // Add a small delay to ensure app is ready
    const timer = setTimeout(() => {
      loadProviders();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadProviders]);

  const selectProvider = useCallback((providerName: string) => {
    const provider = providers.find(p => p.name === providerName);
    if (provider) {
      setSelectedProvider(providerName);
      setSelectedModel(provider.default_model);
    }
  }, [providers]);

  const selectModel = useCallback((modelName: string) => {
    setSelectedModel(modelName);
  }, []);

  const getCurrentProvider = useCallback((): ProviderMetadata | undefined => {
    return providers.find(p => p.name === selectedProvider);
  }, [providers, selectedProvider]);

  const getAvailableModels = useCallback((): string[] => {
    const provider = getCurrentProvider();
    return provider?.supported_models || [];
  }, [getCurrentProvider]);

  const getProviderSelection = useCallback((): ProviderSelection => {
    return {
      provider: selectedProvider,
      model: selectedModel
    };
  }, [selectedProvider, selectedModel]);

  const refreshProviders = useCallback(() => {
    loadProviders(true);
  }, [loadProviders]);

  return {
    providers,
    selectedProvider,
    selectedModel,
    isLoading,
    error,
    selectProvider,
    selectModel,
    getCurrentProvider,
    getAvailableModels,
    getProviderSelection,
    refreshProviders
  };
};

export const useLlmProviders = () => useProviders('llm');
export const useSttProviders = () => useProviders('stt');