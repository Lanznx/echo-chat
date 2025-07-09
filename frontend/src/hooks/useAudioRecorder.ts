import { useEffect, useRef, useState } from 'react';
import { useSystemAudio } from './useSystemAudio';
import { isTauri } from '@/utils/tauri';

export const useAudioRecorder = (onAudioData: (data: ArrayBuffer) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef(false);

  // Use system audio if in Tauri environment
  const systemAudio = useSystemAudio(onAudioData);
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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
        
        streamRef.current = stream;
        isRecordingRef.current = true;

        // Setup audio context for processing and visualization
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        // Setup analyzer for visualization
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);

        // Setup script processor for audio data extraction (deprecated but widely supported)
        // Use larger buffer for better streaming
        processorRef.current = audioContextRef.current.createScriptProcessor(8192, 1, 1);
        
        processorRef.current.onaudioprocess = (event) => {
          if (isRecordingRef.current) {
            const inputBuffer = event.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Convert float32 to int16
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const clampedValue = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] = clampedValue * 0x7FFF;
            }
            
            // Always send audio data for streaming, let Deepgram handle silence detection
            console.log('Sending audio chunk, size:', int16Data.buffer.byteLength);
            onAudioData(int16Data.buffer);
          }
        };
        
        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        setIsRecording(true);
        
        // Start audio level monitoring
        monitorAudioLevel();
        
        console.log('Microphone recording started');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    
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
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }
    
    setAudioLevel(0);
    console.log('Recording stopped');
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let smoothedLevel = 0;
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecordingRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const currentLevel = average / 255;
      
      // Apply smoothing for more responsive visualization
      const smoothingFactor = currentLevel > smoothedLevel ? 0.8 : 0.4;
      smoothedLevel = smoothedLevel + (currentLevel - smoothedLevel) * smoothingFactor;
      
      // Apply amplification for better visibility
      const amplifiedLevel = Math.min(1.0, smoothedLevel * 3.0);
      setAudioLevel(amplifiedLevel);
      
      if (isRecordingRef.current) {
        requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel: isInTauri ? systemAudio.audioLevel : audioLevel,
    // Expose system audio properties for device selection
    ...(isInTauri && {
      audioDevices: systemAudio.audioDevices,
      selectedDevice: systemAudio.selectedDevice,
      setSelectedDevice: systemAudio.setSelectedDevice,
      refreshDevices: systemAudio.listDevices
    })
  };
};