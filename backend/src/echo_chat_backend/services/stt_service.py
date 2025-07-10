from abc import ABC, abstractmethod
from typing import Optional, List
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
from ..core import (
    ProviderType,
    ProviderMetadata,
    registry_manager,
    register_provider,
    config_manager,
)

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


@register_provider(
    ProviderMetadata(
        name="deepgram",
        display_name="Deepgram STT",
        description="Deepgram Speech-to-Text with real-time streaming capabilities",
        version="1.0.0",
        provider_type=ProviderType.STT,
        requires_api_key=True,
        config_schema={
            "api_key": {
                "type": "string",
                "required": True,
                "description": "Deepgram API Key",
            },
            "model": {
                "type": "string",
                "required": False,
                "description": "Model name",
                "default": "nova-2",
            },
            "language": {
                "type": "string",
                "required": False,
                "description": "Language code",
                "default": "zh-TW",
            },
            "sample_rate": {
                "type": "integer",
                "required": False,
                "description": "Sample rate",
                "default": 48000,
            },
        },
        supported_models=["nova-2", "nova", "enhanced", "base"],
        default_model="nova-2",
        capabilities=["streaming", "real-time", "multilingual", "punctuation"],
        author="Deepgram",
        homepage="https://deepgram.com",
    )
)
class DeepgramSttAdapter(ISttServiceProvider):
    def __init__(self, api_key: str = None, **kwargs):
        # 使用配置管理器獲取配置
        metadata = registry_manager.stt_registry.get_metadata("deepgram")
        if metadata:
            config = config_manager.get_provider_config(
                "deepgram", metadata.config_schema
            )
            self.api_key = api_key or config.get("api_key")
            self.model = config.get("model", "nova-2")
            self.language = config.get("language", "zh-TW")
            self.sample_rate = config.get(
                "sample_rate", SYSTEM_AUDIO_CONFIG.SAMPLE_RATE
            )
        else:
            # 向後相容
            self.api_key = api_key
            self.model = kwargs.get("model", "nova-2")
            self.language = kwargs.get("language", "zh-TW")
            self.sample_rate = kwargs.get(
                "sample_rate", SYSTEM_AUDIO_CONFIG.SAMPLE_RATE
            )

        self.websocket = None
        self.deepgram_connection = None
        self.client = None
        self.transcript_queue = queue.Queue()
        self._running = False

    async def start_stream(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self._running = True

        config = DeepgramClientOptions(options={"keepalive": "true"})
        self.client = DeepgramClient(self.api_key, config)

        self.deepgram_connection = self.client.listen.asyncwebsocket.v("1")

        await self.deepgram_connection.start(
            {
                "model": self.model,
                "language": self.language,
                "smart_format": True,
                "interim_results": True,
                "encoding": "linear16",
                "sample_rate": self.sample_rate,
                "channels": 1,
                "endpointing": SYSTEM_AUDIO_CONFIG.ENDPOINTING,
                "vad_events": True,  # Voice activity detection
                "punctuate": True,
                "diarize": True,  # 啟用講者辨識
                "timestamps": True,  # 啟用時間戳
            }
        )

        # Use simple function callbacks instead of methods
        self.deepgram_connection.on(
            LiveTranscriptionEvents.Transcript, self._handle_transcript
        )
        self.deepgram_connection.on(
            LiveTranscriptionEvents.Error, self._handle_deepgram_error
        )

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
            result = kwargs.get("result")
            logger.info(f"Received Deepgram result")

            if result and hasattr(result, "channel") and result.channel:
                alternatives = result.channel.alternatives
                if alternatives and len(alternatives) > 0:
                    alternative = alternatives[0]
                    transcript = alternative.transcript
                    is_final = result.is_final
                    confidence = (
                        alternative.confidence
                        if hasattr(alternative, "confidence")
                        else None
                    )

                    logger.info(
                        f"Transcript: '{transcript}', is_final: {is_final}, confidence: {confidence}"
                    )

                    if transcript.strip():  # Only send non-empty transcripts
                        # 提取時間戳和講者資訊
                        segments = []

                        # 檢查是否有 words 陣列（包含時間戳）
                        if hasattr(alternative, "words") and alternative.words:
                            # 按講者分組 words
                            current_speaker = None
                            current_segment = {
                                "text": "",
                                "speaker": "Speaker A",  # 預設講者
                                "start_time": 0.0,
                                "end_time": 0.0,
                                "confidence": confidence or 0.0,
                            }

                            for word in alternative.words:
                                word_text = (
                                    word.punctuated_word
                                    if hasattr(word, "punctuated_word")
                                    else word.word
                                )
                                word_start = (
                                    word.start if hasattr(word, "start") else 0.0
                                )
                                word_end = word.end if hasattr(word, "end") else 0.0
                                word_speaker = getattr(word, "speaker", None)

                                # 如果講者改變，或這是第一個 word
                                if (
                                    word_speaker is not None
                                    and word_speaker != current_speaker
                                ):
                                    # 保存前一個 segment（如果有內容）
                                    if current_segment["text"].strip():
                                        segments.append(current_segment.copy())

                                    # 開始新的 segment
                                    current_speaker = word_speaker
                                    current_segment = {
                                        "text": word_text,
                                        "speaker": (
                                            f"Speaker {chr(65 + word_speaker)}"
                                            if isinstance(word_speaker, int)
                                            else f"Speaker {word_speaker}"
                                        ),
                                        "start_time": word_start,
                                        "end_time": word_end,
                                        "confidence": confidence or 0.0,
                                    }
                                else:
                                    # 同一講者，追加到當前 segment
                                    if current_segment["text"]:
                                        current_segment["text"] += " " + word_text
                                    else:
                                        current_segment["text"] = word_text
                                        current_segment["start_time"] = word_start
                                    current_segment["end_time"] = word_end

                            # 保存最後一個 segment
                            if current_segment["text"].strip():
                                segments.append(current_segment)

                        # 如果沒有時間戳資訊，創建單個 segment
                        if not segments:
                            segments = [
                                {
                                    "text": transcript,
                                    "speaker": "Speaker A",
                                    "start_time": 0.0,
                                    "end_time": 0.0,
                                    "confidence": confidence or 0.0,
                                }
                            ]

                        # 創建新格式的回應
                        response = {
                            "is_final": is_final,
                            "segments": segments,
                            # 向後相容：保留舊格式
                            "transcript": transcript,
                            "confidence": confidence,
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
        error = kwargs.get("error")
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


def get_stt_service(provider: Optional[str] = None) -> ISttServiceProvider:
    """獲取 STT 服務實例 - 支援 Registry 系統"""
    # Use provided provider, fallback to environment variable, then default to deepgram
    selected_provider = (provider or os.getenv("STT_PROVIDER", "deepgram")).lower()

    # 嘗試從 Registry 獲取 Provider
    stt_registry = registry_manager.stt_registry
    provider_class = stt_registry.get_provider(selected_provider)

    if provider_class:
        # 從 Registry 獲取 Provider 元數據
        metadata = stt_registry.get_metadata(selected_provider)
        if not metadata:
            raise SttServiceError(
                f"Provider metadata not found: {selected_provider}", selected_provider
            )

        # 獲取 API Key
        api_key_env = f"{selected_provider.upper()}_API_KEY"
        api_key = os.getenv(api_key_env)
        if metadata.requires_api_key and not api_key:
            raise ApiKeyError(selected_provider)

        # 創建 Provider 實例
        return provider_class(api_key)

    # 向後相容性 - 硬編碼的 Provider (將來可移除)
    if selected_provider == "deepgram":
        deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        if not deepgram_api_key:
            raise ApiKeyError("deepgram")
        return DeepgramSttAdapter(deepgram_api_key)

    else:
        raise SttServiceError(
            f"Unsupported STT provider: {selected_provider}", "unknown"
        )


def get_available_stt_providers() -> List[ProviderMetadata]:
    """獲取可用的 STT Provider 列表"""
    return registry_manager.stt_registry.list_metadata()
