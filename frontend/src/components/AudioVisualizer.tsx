'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isRecording }) => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-muted/30 to-muted/60 border border-muted-foreground/10">
      <div className="flex items-center justify-center h-20 p-4">
        {/* 錄音指示燈 */}
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-red-500/50 rounded-full animate-ping" />
            </div>
            <span className="text-sm font-medium text-red-500">
              Recording...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted-foreground/30 rounded-full" />
            <span className="text-sm text-muted-foreground">
              Ready to record
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};