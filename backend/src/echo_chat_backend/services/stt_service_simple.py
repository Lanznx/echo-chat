from abc import ABC, abstractmethod
from typing import Optional
import json
import asyncio
import logging
import websockets
import os

logger = logging.getLogger(__name__)

class ISttServiceProvider(ABC):
    @abstractmethod
    async def start_stream(self, websocket) -> None:
        pass
    
    @abstractmethod
    async def process_audio(self, audio_data: bytes) -> None:
        pass
    
    @abstractmethod
    async def stop_stream(self) -> None:
        pass

class SimpleDeepgramAdapter(ISttServiceProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.websocket = None
        self.deepgram_ws = None
        self._running = False
        
    async def start_stream(self, websocket) -> None:
        self.websocket = websocket
        self._running = True
        
        # Connect to Deepgram directly via WebSocket
        deepgram_url = f"wss://api.deepgram.com/v1/listen?model=nova-2&language=zh-TW&smart_format=true&interim_results=true&encoding=linear16&sample_rate=16000&channels=1"
        
        # Try different header formats based on websockets version
        try:
            # Try modern format first
            try:
                self.deepgram_ws = await websockets.connect(
                    deepgram_url,
                    extra_headers={
                        "Authorization": f"Token {self.api_key}"
                    }
                )
            except TypeError:
                # Fallback to older format
                self.deepgram_ws = await websockets.connect(
                    deepgram_url,
                    additional_headers={
                        "Authorization": f"Token {self.api_key}"
                    }
                )
            logger.info("Connected to Deepgram WebSocket")
            
            # Start listening for responses
            asyncio.create_task(self._listen_for_transcripts())
            
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {e}")
            raise
    
    async def process_audio(self, audio_data: bytes) -> None:
        if self.deepgram_ws and not self.deepgram_ws.closed:
            try:
                await self.deepgram_ws.send(audio_data)
                logger.debug(f"Sent {len(audio_data)} bytes to Deepgram")
            except Exception as e:
                logger.error(f"Error sending audio to Deepgram: {e}")
    
    async def stop_stream(self) -> None:
        self._running = False
        if self.deepgram_ws and not self.deepgram_ws.closed:
            await self.deepgram_ws.close()
        logger.info("Deepgram stream stopped")
    
    async def _listen_for_transcripts(self):
        try:
            while self._running and self.deepgram_ws and not self.deepgram_ws.closed:
                try:
                    message = await asyncio.wait_for(self.deepgram_ws.recv(), timeout=1.0)
                    
                    if isinstance(message, str):
                        data = json.loads(message)
                        await self._handle_transcript(data)
                        
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error receiving from Deepgram: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Error in transcript listener: {e}")
    
    async def _handle_transcript(self, data):
        try:
            if data.get("type") == "Results":
                channel = data.get("channel", {})
                alternatives = channel.get("alternatives", [])
                
                if alternatives:
                    transcript = alternatives[0].get("transcript", "")
                    is_final = data.get("is_final", False)
                    confidence = alternatives[0].get("confidence", 0.0)
                    
                    logger.info(f"Transcript: '{transcript}', is_final: {is_final}, confidence: {confidence}")
                    
                    if transcript.strip():
                        response = {
                            "transcript": transcript,
                            "is_final": is_final,
                            "confidence": confidence
                        }
                        
                        if self.websocket:
                            await self.websocket.send_text(json.dumps(response))
                            logger.info(f"Sent transcript to client: {response}")
                            
        except Exception as e:
            logger.error(f"Error handling transcript: {e}")

def get_stt_service() -> ISttServiceProvider:
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        raise ValueError("DEEPGRAM_API_KEY environment variable is required")
    
    return SimpleDeepgramAdapter(deepgram_api_key)