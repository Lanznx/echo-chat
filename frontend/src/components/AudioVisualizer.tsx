'use client';

import React from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isRecording }) => {
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = Math.max(0.1, audioLevel * Math.random() * 0.8 + 0.2);
    return height;
  });

  return (
    <div className="flex items-center justify-center h-16 gap-1 bg-gray-100 rounded-lg p-2">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-2 rounded-full transition-all duration-150 ${
            isRecording 
              ? 'bg-gradient-to-t from-blue-500 to-blue-300' 
              : 'bg-gray-300'
          }`}
          style={{
            height: `${height * 100}%`,
            opacity: isRecording ? 0.7 + (height * 0.3) : 0.3
          }}
        />
      ))}
    </div>
  );
};