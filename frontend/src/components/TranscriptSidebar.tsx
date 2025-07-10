'use client';

import React, { useState, useEffect } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import AudioDeviceSelector from './AudioDeviceSelector';
import SystemAudioSelector from './SystemAudioSelector';
import { ProviderSelector } from './ProviderSelector';
import { AudioDevice } from '@/hooks/useSystemAudio';
import { isTauri } from '@/utils/tauri';
import { useSttProviders } from '@/hooks/useProviders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, Square, Copy, Trash2, Loader2 } from 'lucide-react';

interface TranscriptSidebarProps {
  transcript: string;
  isRecording: boolean;
  audioLevel: number;
  isReceiving: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearTranscript: () => void;
  audioDevices?: AudioDevice[];
  selectedDevice?: string | null;
  onDeviceSelect?: (deviceName: string) => void;
  onRefreshDevices?: () => void;
  onSystemAudioSelect?: (deviceName: string) => void;
  onSttProviderChange?: (provider: string) => void;
}

export const TranscriptSidebar: React.FC<TranscriptSidebarProps> = ({
  transcript,
  isRecording,
  audioLevel,
  isReceiving,
  onStartRecording,
  onStopRecording,
  onClearTranscript,
  audioDevices,
  selectedDevice,
  onDeviceSelect,
  onRefreshDevices,
  onSystemAudioSelect
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [isMounted, setIsMounted] = useState(false);
  const [audioSourceType, setAudioSourceType] = useState<'microphone' | 'system'>('microphone');
  
  // STT Provider management
  const sttProviders = useSttProviders();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const copyTranscript = async () => {
    if (!transcript) return;
    
    try {
      await navigator.clipboard.writeText(transcript);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy transcript:', error);
    }
  };
  
  return (
    <Card className="flex flex-col h-full border-0 rounded-none">
      <CardHeader className="pb-3 px-4 py-3">
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Live Transcript
        </CardTitle>
        
        <div className="space-y-2.5">
          {/* STT Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Speech-to-Text Provider
            </label>
            <ProviderSelector
              providers={sttProviders.providers}
              selectedProvider={sttProviders.selectedProvider}
              selectedModel={sttProviders.selectedModel}
              onProviderChange={sttProviders.selectProvider}
              onModelChange={sttProviders.selectModel}
              isLoading={sttProviders.isLoading}
              error={sttProviders.error}
              onRefresh={sttProviders.refreshProviders}
              showModels={false}
              disabled={isRecording}
              className="w-full"
            />
          </div>
          
          {/* Audio Source Selector - Only show in Tauri environment */}
          {isMounted && isTauri() && (
            <div className="space-y-2">
              <Tabs value={audioSourceType} onValueChange={(value) => setAudioSourceType(value as 'microphone' | 'system')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="microphone" disabled={isRecording}>
                    Microphone
                  </TabsTrigger>
                  <TabsTrigger value="system" disabled={isRecording}>
                    System Audio
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="microphone" className="mt-3">
                  {audioDevices && onDeviceSelect && onRefreshDevices && (
                    <AudioDeviceSelector
                      devices={audioDevices}
                      selectedDevice={selectedDevice || null}
                      onDeviceSelect={onDeviceSelect}
                      onRefresh={onRefreshDevices}
                      disabled={isRecording}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="system" className="mt-3">
                  {onSystemAudioSelect && (
                    <SystemAudioSelector
                      onSystemAudioSelect={onSystemAudioSelect}
                      disabled={isRecording}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <div className="px-1">
            <AudioVisualizer 
              audioLevel={audioLevel} 
              isRecording={isRecording}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={isRecording ? onStopRecording : onStartRecording}
              variant={isRecording ? "destructive" : "default"}
              size="sm"
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
            
            <Button
              onClick={onClearTranscript}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={copyTranscript}
            disabled={!transcript}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copyStatus === 'copied' ? 'Copied!' : 'Copy Transcript'}
          </Button>
        </div>
        
        {isReceiving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Receiving transcript...
          </div>
        )}
        
        <Separator className="mt-4" />
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full max-h-full">
          <div className="px-4 py-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {transcript || (
                <div className="text-muted-foreground italic text-center py-6">
                  Click &quot;Start Recording&quot; to begin transcribing your voice...
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};