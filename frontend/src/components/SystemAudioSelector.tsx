'use client';

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SystemAudioDevice {
  name: string;
  device_type: string;
  is_default: boolean;
}

interface SystemAudioSelectorProps {
  onSystemAudioSelect: (deviceName: string) => void;
  disabled?: boolean;
}

const SystemAudioSelector: React.FC<SystemAudioSelectorProps> = ({
  onSystemAudioSelect,
  disabled = false,
}) => {
  const [devices, setDevices] = useState<SystemAudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSystemAudioDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const systemDevices = await invoke<SystemAudioDevice[]>('list_system_audio_devices');
      setDevices(systemDevices);
      
      // Check if BlackHole installation is needed
      const hasValidDevice = systemDevices.some(d => d.device_type === 'system_output');
      if (!hasValidDevice) {
        setError('System audio capture requires BlackHole virtual audio device');
      }
    } catch (err) {
      console.error('Failed to load system audio devices:', err);
      setError('Failed to load system audio devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemAudioDevices();
  }, []);

  const handleDeviceSelect = (deviceName: string) => {
    if (deviceName) {
      setSelectedDevice(deviceName);
      onSystemAudioSelect(deviceName);
    }
  };

  const handleRefresh = () => {
    loadSystemAudioDevices();
  };

  const openBlackHoleLink = () => {
    window.open('https://github.com/ExistentialAudio/BlackHole', '_blank');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          System Audio Source:
        </label>
        <button
          onClick={handleRefresh}
          disabled={isLoading || disabled}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Refresh devices"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
          {error.includes('BlackHole') && (
            <div className="mt-1">
              <button
                onClick={openBlackHoleLink}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Install BlackHole
              </button>
            </div>
          )}
        </div>
      )}
      
      <select
        value={selectedDevice || ''}
        onChange={(e) => handleDeviceSelect(e.target.value)}
        disabled={isLoading || disabled || devices.length === 0}
        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">Select system audio device...</option>
        {devices.filter(d => d.device_type === 'system_output').map((device) => (
          <option key={device.name} value={device.name}>
            {device.name} {device.is_default ? '(Default)' : ''}
          </option>
        ))}
      </select>
      
      {devices.length > 0 && devices[0].device_type === 'instruction' && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          <p>To capture system audio, you need to:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Install BlackHole virtual audio device</li>
            <li>Set BlackHole as your system audio output</li>
            <li>Refresh the device list</li>
          </ol>
          <button
            onClick={openBlackHoleLink}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Download BlackHole
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="text-xs text-gray-500">Loading system audio devices...</div>
      )}
    </div>
  );
};

export default SystemAudioSelector;