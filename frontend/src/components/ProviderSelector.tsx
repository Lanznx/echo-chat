'use client';

import React from 'react';
import { ProviderMetadata } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProviderSelectorProps {
  providers: ProviderMetadata[];
  selectedProvider: string;
  selectedModel?: string;
  onProviderChange: (provider: string) => void;
  onModelChange?: (model: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  showModels?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  isLoading = false,
  error = null,
  onRefresh,
  showModels = false,
  disabled = false,
  className = ""
}) => {
  const currentProvider = providers.find(p => p.name === selectedProvider);
  const availableModels = currentProvider?.supported_models || [];

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading providers...</span>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-destructive truncate">⚠️ Connection error</div>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0 flex-shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  if (providers.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">No providers available</span>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Provider Selection */}
      <div className="flex items-center gap-1.5 flex-1">
        <Select 
          value={selectedProvider} 
          onValueChange={onProviderChange}
          disabled={disabled || providers.length === 0}
        >
          <SelectTrigger className="flex-1 min-w-0">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.name} value={provider.name}>
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{provider.display_name}</span>
                  {provider.requires_api_key && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      API
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Provider Info */}
        {currentProvider && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1.5">
                  <div>
                    <h4 className="font-medium text-sm">{currentProvider.display_name}</h4>
                    <p className="text-xs text-muted-foreground">{currentProvider.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentProvider.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Model Selection */}
      {showModels && onModelChange && availableModels.length > 1 && (
        <Select 
          value={selectedModel} 
          onValueChange={onModelChange}
          disabled={disabled}
        >
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model} value={model}>
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{model}</span>
                  {model === currentProvider?.default_model && (
                    <Badge variant="default" className="text-xs ml-2">
                      ✓
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading} className="h-8 w-8 p-0 flex-shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};