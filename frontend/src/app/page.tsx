'use client';

import React from 'react';
import { TranscriptSidebar } from '@/components/TranscriptSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSystemAudio } from '@/hooks/useSystemAudio';
import { useSttProviders } from '@/hooks/useProviders';

export default function Home() {
  const sttProviders = useSttProviders();

  // Build WebSocket URL with STT provider parameter
  const baseWsUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('http://', 'ws://').replace('https://', 'wss://') || 'ws://127.0.0.1:8000';
  const wsUrl = sttProviders.selectedProvider
    ? `${baseWsUrl}/ws/stream?provider=${sttProviders.selectedProvider}${sttProviders.selectedModel ? `&model=${sttProviders.selectedModel}` : ''}`
    : `${baseWsUrl}/ws/stream`;
  const {
    connect,
    disconnect,
    sendAudio,
    clearTranscript,
    transcript,
    transcriptSegments,
    isReceiving
  } = useWebSocket(wsUrl);

  const {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    refreshDevices
  } = useAudioRecorder(sendAudio);

  const {
    startSystemAudioCapture,
    stopSystemAudioCapture,
    isSystemAudioCapturing,
    selectedSystemDevice,
    setSelectedSystemDevice
  } = useSystemAudio(sendAudio);

  const handleStartRecording = () => {
    connect();
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    disconnect();
  };

  const handleStartSystemRecording = () => {
    if (selectedSystemDevice) {
      connect();
      startSystemAudioCapture(selectedSystemDevice);
    }
  };

  const handleStopSystemRecording = () => {
    stopSystemAudioCapture();
    disconnect();
  };

  const handleClearTranscript = () => {
    clearTranscript();
  };

  const handleSttProviderChange = (provider: string) => {
    // STT provider change is handled by the useSttProviders hook
    // WebSocket URL will be rebuilt automatically
    console.log('STT Provider changed to:', provider);
  };

  const handleSystemAudioSelect = async (deviceName: string) => {
    try {
      setSelectedSystemDevice(deviceName);
      console.log('System audio device selected:', deviceName);
    } catch (error) {
      console.error('Failed to select system audio device:', error);
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full">
        <div className="w-80 flex-shrink-0 border-r border-border">
          <TranscriptSidebar
            transcript={transcript}
            transcriptSegments={transcriptSegments}
            isRecording={isRecording || isSystemAudioCapturing}
            audioLevel={audioLevel}
            isReceiving={isReceiving}
            onStartRecording={selectedSystemDevice ? handleStartSystemRecording : handleStartRecording}
            onStopRecording={isSystemAudioCapturing ? handleStopSystemRecording : handleStopRecording}
            onClearTranscript={handleClearTranscript}
            audioDevices={audioDevices}
            selectedDevice={selectedDevice}
            onDeviceSelect={setSelectedDevice}
            onRefreshDevices={refreshDevices}
            onSystemAudioSelect={handleSystemAudioSelect}
            onSttProviderChange={handleSttProviderChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <ChatInterface transcript={transcript} />
        </div>
      </div>
    </div>
  );
}
