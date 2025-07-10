import { useEffect, useRef, useState } from 'react';
import { TranscriptResponse, TranscriptSegment } from '@/types';
import { appConfig } from '@/config/app';
import { WEBSOCKET_CONFIG } from '@/config/websocket';

export const useWebSocket = (url?: string) => {
  const wsUrl = url || appConfig.websocketUrl;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(wsUrl);

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
      socketRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const data: TranscriptResponse = JSON.parse(event.data);

        // 處理新的 segments 格式
        if (data.segments && data.segments.length > 0) {
          setTranscriptSegments(prev => {
            if (data.is_final) {
              // 最終結果，追加到列表
              return [...prev, ...data.segments];
            } else {
              // 臨時結果，替換最後一個臨時結果
              const finalSegments = prev.filter(seg => seg.confidence !== undefined && seg.confidence > 0);
              return [...finalSegments, ...data.segments];
            }
          });

          // 更新顯示用的文字 transcript
          const segmentText = data.segments.map(seg => seg.text).join(' ');
          setTranscript(prev => {
            if (data.is_final) {
              return prev + segmentText + ' ';
            } else {
              // 替換最後的臨時結果
              const parts = prev.split(' ');
              const finalParts = parts.slice(0, -1);
              return finalParts.join(' ') + (finalParts.length > 0 ? ' ' : '') + segmentText;
            }
          });
        }
        // 向後相容：處理舊的 transcript 格式
        else if (data.transcript) {
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
        }

        setIsReceiving(true);

        // Clear receiving status after a delay
        setTimeout(() => setIsReceiving(false), WEBSOCKET_CONFIG.RECEIVING_TIMEOUT);
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
    setTranscriptSegments([]);
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
    transcriptSegments,
    isReceiving
  };
};