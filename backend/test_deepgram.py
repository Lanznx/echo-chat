#!/usr/bin/env python3

import os
import asyncio
from dotenv import load_dotenv
from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents

load_dotenv()

async def test_deepgram():
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("ERROR: DEEPGRAM_API_KEY not found in environment")
        return
    
    print(f"Testing Deepgram with API key: {api_key[:10]}...")
    
    try:
        config = DeepgramClientOptions(options={"keepalive": "true"})
        client = DeepgramClient(api_key, config)
        connection = client.listen.asyncwebsocket.v("1")
        
        def on_transcript(self, result, **kwargs):
            print(f"Transcript received: {result}")
        
        def on_error(self, error, **kwargs):
            print(f"Error: {error}")
            
        def on_open(self, open, **kwargs):
            print("Connection opened successfully")
            
        connection.on(LiveTranscriptionEvents.Transcript, on_transcript)
        connection.on(LiveTranscriptionEvents.Error, on_error)
        connection.on(LiveTranscriptionEvents.Open, on_open)
        
        await connection.start({
            "model": "nova-2",
            "language": "zh-TW",
            "smart_format": True,
            "interim_results": True,
            "encoding": "linear16",
            "sample_rate": 16000,
            "channels": 1
        })
        
        print("Connection started, waiting for events...")
        await asyncio.sleep(5)
        
        await connection.finish()
        print("Test completed")
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_deepgram())