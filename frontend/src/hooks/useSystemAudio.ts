import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@/utils/tauri';

export interface AudioDevice {
  name: string;
  device_type: string; // "input" or "output"
  is_default: boolean;
}

export const useSystemAudio = (onAudioData: (data: ArrayBuffer) => void) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const unlistenRef = useRef<(() => void) | null>(null);

  // List available audio devices
  const listDevices = async () => {
    if (!isTauri()) {
      console.log('Not in Tauri environment, skipping device listing');
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
        
        // Calculate audio level for visualization
        const samples = new Int16Array(audioData.buffer);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += Math.abs(samples[i]);
        }
        const avgLevel = sum / samples.length / 32768; // Normalize to 0-1
        setAudioLevel(avgLevel);
      });
      
      unlistenRef.current = unlisten;
      
      // Start audio capture with selected device
      const device = deviceName || selectedDevice;
      await invoke('start_system_audio_capture', { device_name: device });
      setIsCapturing(true);
      console.log('System audio capture started with device:', device);
    } catch (error) {
      console.error('Failed to start system audio capture:', error);
      throw error;
    }
  };

  // Stop system audio capture
  const stopCapture = async () => {
    if (!isTauri()) {
      console.log('Not in Tauri environment, nothing to stop');
      return;
    }
    
    // Only try to stop if we're actually capturing
    if (!isCapturing) {
      console.log('Audio capture not running, nothing to stop');
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
      
      console.log('System audio capture stopped');
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
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  return {
    startCapture,
    stopCapture,
    listDevices,
    isCapturing,
    audioLevel,
    audioDevices,
    selectedDevice,
    setSelectedDevice
  };
};