'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AUDIO_VISUALIZER_CONFIG } from '@/config/audio';

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isRecording }) => {
  const [barHeights, setBarHeights] = useState<number[]>(Array(AUDIO_VISUALIZER_CONFIG.BAR_COUNT).fill(AUDIO_VISUALIZER_CONFIG.BASE_HEIGHT));
  const [peakHolds, setPeakHolds] = useState<number[]>(Array(AUDIO_VISUALIZER_CONFIG.BAR_COUNT).fill(0));
  const animationRef = useRef<number>();
  const lastAudioLevelRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording) {
      // Smoothly decay bars when not recording
      const decayInterval = setInterval(() => {
        setBarHeights(prev => prev.map(height => 
          Math.max(AUDIO_VISUALIZER_CONFIG.MIN_HEIGHT, height * AUDIO_VISUALIZER_CONFIG.BAR_DECAY_RATE)
        ));
        setPeakHolds(prev => prev.map(peak => 
          Math.max(0, peak * AUDIO_VISUALIZER_CONFIG.PEAK_DECAY_RATE)
        ));
      }, AUDIO_VISUALIZER_CONFIG.DECAY_INTERVAL);
      
      return () => clearInterval(decayInterval);
    }

    const updateBars = () => {
      setBarHeights(prev => {
        const newHeights = Array.from({ length: AUDIO_VISUALIZER_CONFIG.BAR_COUNT }, (_, i) => {
          const position = i / (AUDIO_VISUALIZER_CONFIG.BAR_COUNT - 1); // 0 to 1
          const centerDistance = Math.abs(position - 0.5) * 2; // 0 to 1, center is 0
          
          // Create frequency-like distribution (lower frequencies in center, higher on sides)
          const frequencyResponse = Math.pow(1 - centerDistance, AUDIO_VISUALIZER_CONFIG.FREQUENCY_POWER_CURVE);
          
          // Add some randomness to simulate different frequency bands
          const randomVariation = (Math.random() - 0.5) * AUDIO_VISUALIZER_CONFIG.RANDOM_VARIATION;
          
          // Base height influenced by audio level and position
          let targetHeight = AUDIO_VISUALIZER_CONFIG.BASE_HEIGHT;
          if (audioLevel > 0) {
            // Increase sensitivity by amplifying the audio level effect
            const amplifiedAudio = Math.pow(audioLevel, 0.3) * AUDIO_VISUALIZER_CONFIG.AUDIO_AMPLIFICATION;
            targetHeight = AUDIO_VISUALIZER_CONFIG.BASE_HEIGHT * 2 + 
              (amplifiedAudio * frequencyResponse * AUDIO_VISUALIZER_CONFIG.FREQUENCY_RESPONSE_MULTIPLIER) + 
              randomVariation;
            
            // Add some frequency-band specific variation
            const frequencyBand = Math.sin(i * 0.5) * AUDIO_VISUALIZER_CONFIG.FREQUENCY_BAND_VARIATION;
            targetHeight += frequencyBand * amplifiedAudio;
          }
          
          targetHeight = Math.max(AUDIO_VISUALIZER_CONFIG.MIN_HEIGHT, Math.min(AUDIO_VISUALIZER_CONFIG.MAX_HEIGHT, targetHeight));
          
          // Smooth transition to target height
          const currentHeight = prev[i] || AUDIO_VISUALIZER_CONFIG.BASE_HEIGHT;
          const smoothing = audioLevel > lastAudioLevelRef.current ? 
            AUDIO_VISUALIZER_CONFIG.ATTACK_SMOOTHING : AUDIO_VISUALIZER_CONFIG.DECAY_SMOOTHING;
          
          return currentHeight + (targetHeight - currentHeight) * smoothing;
        });
        
        return newHeights;
      });

      lastAudioLevelRef.current = audioLevel;
      
      if (isRecording) {
        animationRef.current = requestAnimationFrame(updateBars);
      }
    };

    animationRef.current = requestAnimationFrame(updateBars);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isRecording]);

  // Separate effect for peak holds to avoid dependency issues
  useEffect(() => {
    if (!isRecording) return;

    const updatePeaks = () => {
      setPeakHolds(prev => prev.map((peak, i) => {
        const currentHeight = barHeights[i] || 0;
        if (currentHeight > peak) {
          return currentHeight;
        }
        return Math.max(0, peak * AUDIO_VISUALIZER_CONFIG.RECORDING_PEAK_DECAY_RATE);
      }));
    };

    const peakInterval = setInterval(updatePeaks, AUDIO_VISUALIZER_CONFIG.PEAK_UPDATE_INTERVAL);

    return () => clearInterval(peakInterval);
  }, [isRecording, barHeights]);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-muted/30 to-muted/60 border border-muted-foreground/10">
      <div className="flex items-end justify-center h-20 gap-0.5 p-4">
        {barHeights.map((height, index) => {
          const isCenter = Math.abs(index - (AUDIO_VISUALIZER_CONFIG.BAR_COUNT / 2)) < AUDIO_VISUALIZER_CONFIG.CENTER_FREQUENCY_BOOST;
          const intensity = Math.max(0, 1 - Math.abs(index - (AUDIO_VISUALIZER_CONFIG.BAR_COUNT / 2)) / (AUDIO_VISUALIZER_CONFIG.BAR_COUNT / 2));
          const peakHeight = peakHolds[index];
          
          return (
            <div key={index} className="relative w-1">
              {/* Main bar */}
              <div
                className={cn(
                  "w-full rounded-full transition-all duration-75 ease-out",
                  isRecording
                    ? isCenter
                      ? "bg-gradient-to-t from-primary via-primary/90 to-primary/70"
                      : "bg-gradient-to-t from-primary/60 via-primary/40 to-primary/20"
                    : "bg-muted-foreground/30"
                )}
                style={{
                  height: `${Math.max(AUDIO_VISUALIZER_CONFIG.MIN_DISPLAY_HEIGHT, height * 100)}%`,
                  opacity: isRecording ? 0.8 + (intensity * 0.2) : 0.5,
                  filter: isRecording && isCenter && height > AUDIO_VISUALIZER_CONFIG.GLOW_THRESHOLD ? 
                    `brightness(${1 + height * AUDIO_VISUALIZER_CONFIG.BRIGHTNESS_MULTIPLIER})` : 'none',
                  boxShadow: isRecording && height > AUDIO_VISUALIZER_CONFIG.SHADOW_THRESHOLD && isCenter
                    ? `0 0 ${2 + height * AUDIO_VISUALIZER_CONFIG.SHADOW_INTENSITY}px hsl(var(--primary) / ${AUDIO_VISUALIZER_CONFIG.SHADOW_OPACITY_BASE + height * AUDIO_VISUALIZER_CONFIG.SHADOW_OPACITY_MULTIPLIER})` 
                    : 'none'
                }}
              />
              
              {/* Peak hold indicator */}
              {isRecording && peakHeight > height + 0.1 && (
                <div
                  className="absolute w-full bg-primary/80 rounded-full"
                  style={{
                    height: '2px',
                    bottom: `${peakHeight * 100}%`,
                    opacity: 0.6 + (intensity * 0.4)
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Animated background gradient when recording */}
      {isRecording && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-primary/8 to-primary/3 recording-bg" />
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            style={{
              animation: 'pulse 1.5s ease-in-out infinite alternate'
            }}
          />
        </>
      )}
      
      {/* Recording indicator with enhanced pulse */}
      {isRecording && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 bg-red-500/50 rounded-full animate-ping" />
          </div>
        </div>
      )}
      
      {/* Subtle border animation when recording */}
      {isRecording && (
        <div 
          className="absolute inset-0 border-2 border-primary/20 rounded-lg"
          style={{
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      )}
    </Card>
  );
};