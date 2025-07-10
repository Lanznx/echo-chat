import { useRef, useState, useCallback } from 'react';
import { AUDIO_CONFIG } from '@/config/audio';

export const useWebAudio = (onAudioData: (data: ArrayBuffer) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef(false);

  const setupAudioContext = useCallback(async (stream: MediaStream) => {
    audioContextRef.current = new AudioContext({ sampleRate: AUDIO_CONFIG.SAMPLE_RATE });
    const source = audioContextRef.current.createMediaStreamSource(stream);
    
    // Setup analyzer for visualization
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = AUDIO_CONFIG.FFT_SIZE;
    source.connect(analyserRef.current);

    // Setup script processor for audio data extraction
    processorRef.current = audioContextRef.current.createScriptProcessor(
      AUDIO_CONFIG.BUFFER_SIZE, 
      1, 
      1
    );
    
    processorRef.current.onaudioprocess = (event) => {
      if (!isRecordingRef.current) return;
      
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Convert float32 to int16
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const clampedValue = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = clampedValue * 0x7FFF;
      }
      
      console.log('Sending audio chunk, size:', int16Data.buffer.byteLength);
      onAudioData(int16Data.buffer);
    };
    
    source.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);
  }, [onAudioData]);

  const monitorAudioLevel = useCallback(() => {
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
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: AUDIO_CONFIG.CONSTRAINTS
      });
      
      streamRef.current = stream;
      isRecordingRef.current = true;
      setIsRecording(true);

      await setupAudioContext(stream);
      monitorAudioLevel();
      
      console.log('Microphone recording started');
    } catch (error) {
      console.error('Error starting web audio recording:', error);
      throw error;
    }
  }, [setupAudioContext, monitorAudioLevel]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
    console.log('Web audio recording stopped');
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel
  };
};