from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import Optional, AsyncGenerator
import json
import logging
import asyncio

from .services.stt_service import get_stt_service, get_available_stt_providers
from .services.llm_service import get_llm_service, get_available_llm_providers
from .exceptions import EchoChatBaseException
from .config.audio import SYSTEM_AUDIO_CONFIG

# 導入所有 Provider 以確保自動註冊
# 手動導入核心 Provider 確保註冊
from .services.llm_service import OpenAiLlmAdapter, GeminiLlmAdapter
from .services.stt_service import DeepgramSttAdapter

# 導入額外 Provider
try:
    from . import providers
except ImportError as e:
    logger.warning(f"Failed to import additional providers: {e}")

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EchoChat Backend", version="1.0.0")

# 應用啟動時記錄已註冊的 Provider
@app.on_event("startup")
async def startup_event():
    from .core import registry_manager
    llm_providers = registry_manager.llm_registry.list_providers()
    stt_providers = registry_manager.stt_registry.list_providers()
    logger.info(f"Registered LLM providers: {llm_providers}")
    logger.info(f"Registered STT providers: {stt_providers}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    context: str
    query: str
    provider: Optional[str] = None
    system_prompt: Optional[str] = None
    user_role: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

class TranscriptResponse(BaseModel):
    transcript: str
    is_final: bool
    confidence: Optional[float] = None

@app.websocket("/ws/stream")
async def websocket_endpoint(
    websocket: WebSocket, 
    provider: Optional[str] = None,
    model: Optional[str] = None
):
    await websocket.accept()
    logger.info(f"WebSocket connection established with STT provider: {provider or 'default'}")
    
    try:
        stt_service = get_stt_service(provider)
    except Exception as e:
        logger.error(f"Failed to initialize STT service: {e}")
        await websocket.close(code=1003, reason=f"STT service initialization failed: {str(e)}")
        return
    
    try:
        await stt_service.start_stream(websocket)
        logger.info("STT service started successfully")
        
        while True:
            try:
                # Check if websocket is still connected
                if websocket.client_state.name != 'CONNECTED':
                    logger.info("WebSocket client disconnected")
                    break
                    
                audio_data = await websocket.receive_bytes()
                logger.debug(f"Received audio data: {len(audio_data)} bytes")
                
                if len(audio_data) > 0:
                    await stt_service.process_audio(audio_data)
                else:
                    logger.debug("Received empty audio data")
                    
            except Exception as e:
                logger.error(f"Error processing audio: {e}")
                # Check if it's a WebSocket disconnect
                if "1005" in str(e) or "WebSocket" in str(e) or "connection" in str(e).lower():
                    logger.info("WebSocket connection lost")
                    break
                # For other errors, continue trying
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await stt_service.stop_stream()
        except Exception as e:
            logger.error(f"Error stopping STT service: {e}")
        logger.info("WebSocket connection closed")

@app.post("/api/chat/completion", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    try:
        llm_service = get_llm_service(request.provider)
        response = await llm_service.get_completion(
            context=request.context,
            query=request.query,
            system_prompt=request.system_prompt,
            user_role=request.user_role
        )
        return ChatResponse(response=response)
    except EchoChatBaseException as e:
        logger.error(f"Chat completion error: {e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected chat completion error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            llm_service = get_llm_service(request.provider)
            response = await llm_service.get_completion(
                context=request.context,
                query=request.query,
                system_prompt=request.system_prompt,
                user_role=request.user_role
            )
            
            # Simulate streaming by yielding chunks
            words = response.split(' ')
            for i, word in enumerate(words):
                chunk = word + (' ' if i < len(words) - 1 else '')
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                await asyncio.sleep(SYSTEM_AUDIO_CONFIG.STREAMING_DELAY)
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except EchoChatBaseException as e:
            logger.error(f"Chat streaming error: {e.message}")
            yield f"data: {json.dumps({'error': e.message})}\n\n"
        except Exception as e:
            logger.error(f"Unexpected chat streaming error: {e}")
            yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/providers/llm")
async def get_llm_providers():
    """獲取可用的 LLM Provider 列表"""
    try:
        providers = get_available_llm_providers()
        return {"providers": [provider.to_dict() for provider in providers]}
    except Exception as e:
        logger.error(f"Error getting LLM providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get LLM providers")

@app.get("/api/providers/stt")
async def get_stt_providers():
    """獲取可用的 STT Provider 列表"""
    try:
        providers = get_available_stt_providers()
        return {"providers": [provider.to_dict() for provider in providers]}
    except Exception as e:
        logger.error(f"Error getting STT providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get STT providers")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)