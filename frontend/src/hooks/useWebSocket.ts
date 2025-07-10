import { useEffect, useRef, useState } from 'react';
import { TranscriptResponse } from '@/types';
import { appConfig } from '@/config/app';
import { WEBSOCKET_CONFIG } from '@/config/websocket';

export const useWebSocket = (url?: string) => {
  const wsUrl = url || appConfig.websocketUrl;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isReceiving, setIsReceiving] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.binaryType = 'arraybuffer';
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
      socketRef.current = ws;
      console.log('WebSocket connected successfully');
    };

    ws.onmessage = (event) => {
      try {
        const data: TranscriptResponse = JSON.parse(event.data);
        console.log('Received transcript:', data);
        if (data.transcript) {
          setTranscript(prev => {
            if (data.is_final) {
              return prev + data.transcript + ' ';
            } else {
              // Replace the last interim result
              const parts = prev.split(' ');
              const finalParts = parts.slice(0, -1); // Remove last part (interim)
              return finalParts.join(' ') + (finalParts.length > 0 ? ' ' : '') + data.transcript;
            }
          });
          setIsReceiving(true);
          
          // Clear receiving status after a delay
          setTimeout(() => setIsReceiving(false), WEBSOCKET_CONFIG.RECEIVING_TIMEOUT);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setSocket(null);
      socketRef.current = null;
      setIsReceiving(false);
      console.log('WebSocket disconnected:', event.code, event.reason);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const sendAudio = (audioData: ArrayBuffer) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(audioData);
      } catch (error) {
        console.error('Error sending audio data:', error);
      }
    } else {
      console.warn('WebSocket not connected, cannot send audio data');
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    sendAudio,
    clearTranscript,
    isConnected,
    transcript,
    isReceiving
  };
};