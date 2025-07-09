'use client';

import React from 'react';
import { TranscriptSidebar } from '@/components/TranscriptSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function Home() {
  const wsUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/stream' || 'ws://127.0.0.1:8000/ws/stream';
  const { 
    connect, 
    disconnect, 
    sendAudio, 
    clearTranscript, 
    transcript, 
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

  const handleStartRecording = () => {
    connect();
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    disconnect();
  };

  const handleClearTranscript = () => {
    clearTranscript();
  };

  return (
    <div className="flex h-screen bg-white">
      <TranscriptSidebar
        transcript={transcript}
        isRecording={isRecording}
        audioLevel={audioLevel}
        isReceiving={isReceiving}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onClearTranscript={handleClearTranscript}
        audioDevices={audioDevices}
        selectedDevice={selectedDevice}
        onDeviceSelect={setSelectedDevice}
        onRefreshDevices={refreshDevices}
      />
      
      <ChatInterface transcript={transcript} />
    </div>
  );
}
