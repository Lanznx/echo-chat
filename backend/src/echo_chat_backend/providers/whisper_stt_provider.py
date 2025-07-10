"""
OpenAI Whisper STT Provider
示例：展示如何添加新的 STT Provider

只需創建此檔案，Provider 就會自動註冊到系統中！
"""

import asyncio
import json
import httpx
from typing import Optional
from fastapi import WebSocket
from ..services.stt_service import ISttServiceProvider
from ..core import ProviderType, ProviderMetadata, register_provider, config_manager, registry_manager
from ..exceptions import SttServiceError
import logging

logger = logging.getLogger(__name__)

@register_provider(ProviderMetadata(
    name="whisper",
    display_name="OpenAI Whisper",
    description="OpenAI Whisper speech-to-text service with high accuracy",
    version="1.0.0",
    provider_type=ProviderType.STT,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "OpenAI API Key"},
        "model": {"type": "string", "required": False, "description": "Whisper model", "default": "whisper-1"},
        "language": {"type": "string", "required": False, "description": "Language code", "default": "zh"},
        "response_format": {"type": "string", "required": False, "description": "Response format", "default": "json"}
    },
    supported_models=["whisper-1"],
    default_model="whisper-1",
    capabilities=["batch-transcription", "multilingual", "high-accuracy"],
    author="OpenAI",
    homepage="https://openai.com/research/whisper"
))
class WhisperSttAdapter(ISttServiceProvider):
    """OpenAI Whisper STT Provider - 展示批次處理模式的 STT Provider"""
    
    def __init__(self, api_key: str = None, **kwargs):
        # 使用配置管理器獲取配置
        metadata = registry_manager.stt_registry.get_metadata("whisper")
        if metadata:
            config = config_manager.get_provider_config("whisper", metadata.config_schema)
            self.api_key = api_key or config.get("api_key")
            self.model = config.get("model", "whisper-1")
            self.language = config.get("language", "zh")
            self.response_format = config.get("response_format", "json")
        else:
            # 向後相容
            self.api_key = api_key
            self.model = kwargs.get("model", "whisper-1")
            self.language = kwargs.get("language", "zh")
            self.response_format = kwargs.get("response_format", "json")
        
        self.base_url = "https://api.openai.com/v1"
        self.websocket = None
        self._running = False
        self._audio_buffer = bytearray()
        self._buffer_size = 1024 * 64  # 64KB buffer for batching
        
    async def start_stream(self, websocket: WebSocket) -> None:
        """開始串流處理"""
        self.websocket = websocket
        self._running = True
        self._audio_buffer.clear()
        
        # 啟動處理任務
        asyncio.create_task(self._process_audio_buffer())
        logger.info("Whisper STT stream started (batch mode)")
    
    async def process_audio(self, audio_data: bytes) -> None:
        """處理音訊數據（累積到緩衝區）"""
        if self._running:
            self._audio_buffer.extend(audio_data)
            logger.debug(f"Added {len(audio_data)} bytes to buffer, total: {len(self._audio_buffer)}")
    
    async def stop_stream(self) -> None:
        """停止串流處理"""
        self._running = False
        
        # 處理剩餘的音訊數據
        if len(self._audio_buffer) > 0:
            await self._transcribe_buffer()
        
        self._audio_buffer.clear()
        logger.info("Whisper STT stream stopped")
    
    async def _process_audio_buffer(self) -> None:
        """定期處理音訊緩衝區"""
        while self._running:
            try:
                if len(self._audio_buffer) >= self._buffer_size:
                    await self._transcribe_buffer()
                
                await asyncio.sleep(2.0)  # 每 2 秒檢查一次
                
            except Exception as e:
                logger.error(f"Error in audio buffer processing: {e}")
                await asyncio.sleep(1.0)
    
    async def _transcribe_buffer(self) -> None:
        """轉錄緩衝區中的音訊"""
        if len(self._audio_buffer) == 0:
            return
            
        try:
            # 準備音訊數據（簡化：假設是 WAV 格式）
            audio_bytes = bytes(self._audio_buffer)
            
            # 創建多部分表單數據
            files = {
                'file': ('audio.wav', audio_bytes, 'audio/wav'),
                'model': (None, self.model),
                'language': (None, self.language),
                'response_format': (None, self.response_format)
            }
            
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=headers,
                    files=files,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    transcript_text = result.get('text', '').strip()
                    
                    if transcript_text:
                        # 發送轉錄結果
                        response_data = {
                            "transcript": transcript_text,
                            "is_final": True,
                            "confidence": 0.95  # Whisper 通常有很高的準確度
                        }
                        
                        if self.websocket:
                            await self.websocket.send_text(json.dumps(response_data))
                            logger.info(f"Sent Whisper transcription: {transcript_text}")
                else:
                    error_msg = f"Whisper API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    self._handle_error(Exception(error_msg), "whisper")
            
            # 清空緩衝區
            self._audio_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error transcribing audio with Whisper: {e}")
            self._handle_error(e, "whisper")

# 自動導入以確保註冊
# 此檔案被導入時，@register_provider 裝飾器會自動執行註冊