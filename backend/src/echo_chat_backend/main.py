from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import Optional
import json
import logging
import asyncio

from .services.stt_service import get_stt_service
from .services.llm_service import get_llm_service

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EchoChat Backend", version="1.0.0")

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

class ChatResponse(BaseModel):
    response: str

class TranscriptResponse(BaseModel):
    transcript: str
    is_final: bool
    confidence: Optional[float] = None

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    stt_service = get_stt_service()
    
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
        llm_service = get_llm_service()
        response = await llm_service.get_completion(
            context=request.context,
            query=request.query
        )
        return ChatResponse(response=response)
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)