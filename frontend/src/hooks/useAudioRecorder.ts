import { useEffect, useRef, useState } from 'react';
import { useSystemAudio } from './useSystemAudio';
import { useWebAudio } from './useWebAudio';
import { isTauri } from '@/utils/tauri';

export const useAudioRecorder = (onAudioData: (data: ArrayBuffer) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Use system audio if in Tauri environment
  const systemAudio = useSystemAudio(onAudioData);
  const webAudio = useWebAudio(onAudioData);
  const isInTauri = isTauri();

  const startRecording = async () => {
    try {
      if (isInTauri) {
        // Use system audio capture in Tauri environment
        await systemAudio.startCapture();
        setIsRecording(true);
        console.log('System audio recording started');
      } else {
        // Use browser microphone in web environment
        await webAudio.startRecording();
        setIsRecording(true);
        console.log('Web audio recording started');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    if (isInTauri) {
      // Stop system audio capture
      try {
        await systemAudio.stopCapture();
      } catch (error) {
        console.error('Error stopping system audio capture:', error);
        // Don't throw to prevent runtime crashes
      }
    } else {
      // Stop browser microphone
      webAudio.stopRecording();
    }
    
    setAudioLevel(0);
    console.log('Recording stopped');
  };

  // Update audio level from the appropriate source
  useEffect(() => {
    if (isInTauri) {
      setAudioLevel(systemAudio.audioLevel);
    } else {
      setAudioLevel(webAudio.audioLevel);
    }
  }, [isInTauri, systemAudio.audioLevel, webAudio.audioLevel]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    // Expose system audio properties for device selection
    ...(isInTauri && {
      audioDevices: systemAudio.audioDevices,
      selectedDevice: systemAudio.selectedDevice,
      setSelectedDevice: systemAudio.setSelectedDevice,
      refreshDevices: systemAudio.listDevices
    })
  };
};