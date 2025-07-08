'use client';

import React, { useState } from 'react';
import { AudioVisualizer } from './AudioVisualizer';

interface TranscriptSidebarProps {
  transcript: string;
  isRecording: boolean;
  audioLevel: number;
  isReceiving: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearTranscript: () => void;
}

export const TranscriptSidebar: React.FC<TranscriptSidebarProps> = ({
  transcript,
  isRecording,
  audioLevel,
  isReceiving,
  onStartRecording,
  onStopRecording,
  onClearTranscript
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  
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
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Live Transcript</h2>
        
        <div className="space-y-4">
          <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} />
          
          <div className="flex gap-2">
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            <button
              onClick={onClearTranscript}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={copyTranscript}
              disabled={!transcript}
              className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copyStatus === 'copied' ? 'Copied!' : 'Copy Transcript'}
            </button>
          </div>
        </div>
        
        {isReceiving && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Receiving transcript...
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {transcript || (
            <div className="text-gray-400 italic">
              Click "Start Recording" to begin transcribing your voice...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};