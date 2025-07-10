import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@/utils/tauri';
import { AUDIO_PROCESSING_CONFIG } from '@/config/audio';

export interface AudioDevice {
  name: string;
  device_type: string; // "input" or "output"
  is_default: boolean;
}

export interface SystemAudioDevice {
  name: string;
  device_type: string; // "system_output"
  is_default: boolean;
}

export const useSystemAudio = (onAudioData: (data: ArrayBuffer) => void) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [systemAudioDevices, setSystemAudioDevices] = useState<SystemAudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedSystemDevice, setSelectedSystemDevice] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSystemAudioCapturing, setIsSystemAudioCapturing] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);
  const systemUnlistenRef = useRef<(() => void) | null>(null);

  // List available audio devices
  const listDevices = async () => {
    if (!isTauri()) {
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const devices = await invoke<AudioDevice[]>('list_audio_devices');
      setAudioDevices(devices);
      
      // Auto-select default input device if none selected
      if (!selectedDevice && devices.length > 0) {
        const defaultInput = devices.find(d => d.device_type === 'input' && d.is_default);
        if (defaultInput) {
          setSelectedDevice(defaultInput.name);
        }
      }
    } catch (error) {
      console.error('Failed to list audio devices:', error);
    }
  };

  // List system audio devices
  const listSystemAudioDevices = async () => {
    if (!isTauri()) {
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const devices = await invoke<SystemAudioDevice[]>('list_system_audio_devices');
      setSystemAudioDevices(devices);
    } catch (error) {
      console.error('Failed to list system audio devices:', error);
    }
  };

  // Start system audio capture
  const startCapture = async (deviceName?: string) => {
    if (!isTauri()) {
      throw new Error('System audio capture is only available in Tauri environment');
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');
      
      // Set up audio data listener
      const unlisten = await listen<number[]>('audio-data', (event) => {
        const audioData = new Uint8Array(event.payload);
        onAudioData(audioData.buffer);
        
        // Calculate audio level for visualization with better sensitivity
        const samples = new Int16Array(audioData.buffer);
        let sum = 0;
        let peak = 0;
        
        for (let i = 0; i < samples.length; i++) {
          const absValue = Math.abs(samples[i]);
          sum += absValue;
          peak = Math.max(peak, absValue);
        }
        
        const avgLevel = sum / samples.length / AUDIO_PROCESSING_CONFIG.SAMPLE_RATE_NORMALIZATION;
        const peakLevel = peak / AUDIO_PROCESSING_CONFIG.SAMPLE_RATE_NORMALIZATION;
        
        // Use a combination of average and peak for more responsive visualization
        // Increase sensitivity by amplifying the signal
        const responsiveLevel = Math.min(
          AUDIO_PROCESSING_CONFIG.MAX_LEVEL, 
          avgLevel * AUDIO_PROCESSING_CONFIG.AVERAGE_LEVEL_AMPLIFICATION + 
          peakLevel * AUDIO_PROCESSING_CONFIG.PEAK_LEVEL_AMPLIFICATION
        );
        
        // Add some smoothing but keep responsiveness
        setAudioLevel(prevLevel => {
          const smoothing = responsiveLevel > prevLevel ? 
            AUDIO_PROCESSING_CONFIG.ATTACK_SMOOTHING : 
            AUDIO_PROCESSING_CONFIG.DECAY_SMOOTHING;
          return prevLevel + (responsiveLevel - prevLevel) * smoothing;
        });
      });
      
      unlistenRef.current = unlisten;
      
      // Start audio capture with selected device
      const device = deviceName || selectedDevice;
      await invoke('start_system_audio_capture', { device_name: device });
      setIsCapturing(true);
    } catch (error) {
      console.error('Failed to start system audio capture:', error);
      throw error;
    }
  };

  // Stop system audio capture
  const stopCapture = async () => {
    if (!isTauri()) {
      return;
    }
    
    // Only try to stop if we're actually capturing
    if (!isCapturing) {
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('stop_system_audio_capture');
      setIsCapturing(false);
      setAudioLevel(0);
      
      // Clean up event listener
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      
    } catch (error) {
      console.error('Failed to stop system audio capture:', error);
      // Don't throw error to prevent runtime crashes
      // throw error;
    }
  };

  // Initialize devices list on mount
  useEffect(() => {
    // Only list devices if in Tauri environment
    if (isTauri()) {
      listDevices();
      listSystemAudioDevices();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      if (systemUnlistenRef.current) {
        systemUnlistenRef.current();
      }
    };
  }, []);

  // Start system audio capture
  const startSystemAudioCapture = async (deviceName: string) => {
    if (!isTauri()) {
      throw new Error('System audio capture is only available in Tauri environment');
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');
      
      // Set up system audio data listener
      const unlisten = await listen<number[]>('system-audio-data', (event) => {
        const audioData = new Uint8Array(event.payload);
        onAudioData(audioData.buffer);
        
        // Calculate audio level for visualization with better sensitivity
        const samples = new Int16Array(audioData.buffer);
        let sum = 0;
        let peak = 0;
        
        for (let i = 0; i < samples.length; i++) {
          const absValue = Math.abs(samples[i]);
          sum += absValue;
          peak = Math.max(peak, absValue);
        }
        
        const avgLevel = sum / samples.length / AUDIO_PROCESSING_CONFIG.SAMPLE_RATE_NORMALIZATION;
        const peakLevel = peak / AUDIO_PROCESSING_CONFIG.SAMPLE_RATE_NORMALIZATION;
        
        // Use a combination of average and peak for more responsive visualization
        // Increase sensitivity by amplifying the signal
        const responsiveLevel = Math.min(
          AUDIO_PROCESSING_CONFIG.MAX_LEVEL, 
          avgLevel * AUDIO_PROCESSING_CONFIG.AVERAGE_LEVEL_AMPLIFICATION + 
          peakLevel * AUDIO_PROCESSING_CONFIG.PEAK_LEVEL_AMPLIFICATION
        );
        
        // Add some smoothing but keep responsiveness
        setAudioLevel(prevLevel => {
          const smoothing = responsiveLevel > prevLevel ? 
            AUDIO_PROCESSING_CONFIG.ATTACK_SMOOTHING : 
            AUDIO_PROCESSING_CONFIG.DECAY_SMOOTHING;
          return prevLevel + (responsiveLevel - prevLevel) * smoothing;
        });
      });
      
      systemUnlistenRef.current = unlisten;
      
      // Start system audio capture with selected device
      await invoke('start_system_audio_capture_device', { deviceName });
      setIsSystemAudioCapturing(true);
      setSelectedSystemDevice(deviceName);
    } catch (error) {
      console.error('Failed to start system audio capture:', error);
      throw error;
    }
  };

  // Stop system audio capture
  const stopSystemAudioCapture = async () => {
    if (!isTauri()) {
      return;
    }
    
    if (!isSystemAudioCapturing) {
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('stop_system_audio_capture_device');
      setIsSystemAudioCapturing(false);
      setAudioLevel(0);
      
      // Clean up event listener
      if (systemUnlistenRef.current) {
        systemUnlistenRef.current();
        systemUnlistenRef.current = null;
      }
      
    } catch (error) {
      console.error('Failed to stop system audio capture:', error);
    }
  };

  return {
    startCapture,
    stopCapture,
    listDevices,
    isCapturing,
    audioLevel,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    // System audio methods
    startSystemAudioCapture,
    stopSystemAudioCapture,
    listSystemAudioDevices,
    isSystemAudioCapturing,
    systemAudioDevices,
    selectedSystemDevice,
    setSelectedSystemDevice
  };
};