from abc import ABC, abstractmethod
from typing import Optional
import json
import asyncio
import logging
from fastapi import WebSocket
from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents
from deepgram.clients.listen import AsyncListenWebSocketClient
import os
import queue
import threading

from ..exceptions import SttServiceError, ApiKeyError
from ..config.audio import SYSTEM_AUDIO_CONFIG

logger = logging.getLogger(__name__)

class ISttServiceProvider(ABC):
    @abstractmethod
    async def start_stream(self, websocket: WebSocket) -> None:
        pass
    
    @abstractmethod
    async def process_audio(self, audio_data: bytes) -> None:
        pass
    
    @abstractmethod
    async def stop_stream(self) -> None:
        pass
    
    def _handle_error(self, error: Exception, provider: str) -> None:
        """Standardized error handling for all STT providers"""
        logger.error(f"{provider} STT error: {error}")
        raise SttServiceError(str(error), provider)

class DeepgramSttAdapter(ISttServiceProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.websocket = None
        self.deepgram_connection = None
        self.client = None
        self.transcript_queue = queue.Queue()
        self._running = False
        
    async def start_stream(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self._running = True
        
        config = DeepgramClientOptions(
            options={"keepalive": "true"}
        )
        self.client = DeepgramClient(self.api_key, config)
        
        self.deepgram_connection = self.client.listen.asyncwebsocket.v("1")
        
        await self.deepgram_connection.start({
            "model": "nova-2",
            "language": "zh-TW",  # Changed to Traditional Chinese
            "smart_format": True,
            "interim_results": True,
            "encoding": "linear16",
            "sample_rate": SYSTEM_AUDIO_CONFIG.SAMPLE_RATE,
            "channels": 1,
            "endpointing": SYSTEM_AUDIO_CONFIG.ENDPOINTING,
            "vad_events": True,  # Voice activity detection
            "punctuate": True
        })
        
        # Use simple function callbacks instead of methods
        self.deepgram_connection.on(LiveTranscriptionEvents.Transcript, self._handle_transcript)
        self.deepgram_connection.on(LiveTranscriptionEvents.Error, self._handle_deepgram_error)
        
        # Direct sending, no need for separate task
        
        logger.info("Deepgram stream started")
    
    async def process_audio(self, audio_data: bytes) -> None:
        if self.deepgram_connection:
            try:
                await self.deepgram_connection.send(audio_data)
                logger.debug(f"Sent {len(audio_data)} bytes to Deepgram")
            except Exception as e:
                self._handle_error(e, "deepgram")
    
    async def stop_stream(self) -> None:
        self._running = False
        if self.deepgram_connection:
            await self.deepgram_connection.finish()
            self.deepgram_connection = None
        logger.info("Deepgram stream stopped")
    
    async def _handle_transcript(self, *args, **kwargs):
        """Async function to handle transcripts"""
        try:
            result = kwargs.get('result')
            logger.info(f"Received Deepgram result")
            
            if result and hasattr(result, 'channel') and result.channel:
                alternatives = result.channel.alternatives
                if alternatives and len(alternatives) > 0:
                    transcript = alternatives[0].transcript
                    is_final = result.is_final
                    confidence = alternatives[0].confidence if hasattr(alternatives[0], 'confidence') else None
                    
                    logger.info(f"Transcript: '{transcript}', is_final: {is_final}, confidence: {confidence}")
                    
                    if transcript.strip():  # Only send non-empty transcripts
                        response = {
                            "transcript": transcript,
                            "is_final": is_final,
                            "confidence": confidence
                        }
                        
                        # Send directly in the event handler
                        if self.websocket:
                            try:
                                await self.websocket.send_text(json.dumps(response))
                                logger.info(f"Sent transcript to client: {response}")
                            except Exception as e:
                                logger.error(f"Error sending transcript: {e}")
            else:
                logger.debug("No transcript data in result")
                        
        except Exception as e:
            self._handle_error(e, "deepgram")
    
    async def _handle_deepgram_error(self, *args, **kwargs):
        """Async function to handle Deepgram-specific errors"""
        error = kwargs.get('error')
        logger.error(f"Deepgram error: {error}")
    
    async def _transcript_sender(self):
        """Async task to send transcripts from queue"""
        while self._running:
            try:
                # Check queue for new transcripts
                try:
                    response = self.transcript_queue.get_nowait()
                    if self.websocket:
                        await self.websocket.send_text(json.dumps(response))
                        logger.info(f"Sent transcript to client: {response}")
                except queue.Empty:
                    pass
                
                await asyncio.sleep(0.1)  # Check every 100ms
            except Exception as e:
                logger.error(f"Error in transcript sender: {e}")
                break

def get_stt_service() -> ISttServiceProvider:
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        raise ApiKeyError("deepgram")
    
    return DeepgramSttAdapter(deepgram_api_key)