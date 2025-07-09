'use client';

import { useState, useEffect } from 'react';
import { AudioDevice } from '@/hooks/useSystemAudio';

interface AudioDeviceSelectorProps {
  devices: AudioDevice[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceName: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export default function AudioDeviceSelector({
  devices,
  selectedDevice,
  onDeviceSelect,
  onRefresh,
  disabled = false
}: AudioDeviceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group devices by type
  const inputDevices = devices.filter(d => d.device_type === 'input');
  const outputDevices = devices.filter(d => d.device_type === 'output');

  const selectedDeviceInfo = devices.find(d => d.name === selectedDevice);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm font-medium text-gray-700">
          音訊來源:
        </label>
        <button
          onClick={onRefresh}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
        >
          重新整理
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <div>
              {selectedDeviceInfo ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    selectedDeviceInfo.device_type === 'input' 
                      ? 'bg-blue-500' 
                      : 'bg-green-500'
                  }`} />
                  <span className="text-sm">
                    {selectedDeviceInfo.name}
                  </span>
                  {selectedDeviceInfo.is_default && (
                    <span className="text-xs text-gray-500">(預設)</span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">選擇音訊裝置</span>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {inputDevices.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  🎤 輸入裝置 (麥克風)
                </div>
                {inputDevices.map((device) => (
                  <button
                    key={device.name}
                    onClick={() => {
                      onDeviceSelect(device.name);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                      selectedDevice === device.name ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">{device.name}</span>
                      {device.is_default && (
                        <span className="text-xs text-gray-500">(預設)</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {outputDevices.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  🔊 輸出裝置 (系統音訊)
                </div>
                {outputDevices.map((device) => (
                  <button
                    key={device.name}
                    onClick={() => {
                      onDeviceSelect(device.name);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                      selectedDevice === device.name ? 'bg-green-50 text-green-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{device.name}</span>
                      {device.is_default && (
                        <span className="text-xs text-gray-500">(預設)</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {devices.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                沒有可用的音訊裝置
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}