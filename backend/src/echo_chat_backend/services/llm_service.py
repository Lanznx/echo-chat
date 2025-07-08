from abc import ABC, abstractmethod
from typing import Optional
import os
import logging
import openai
import google.generativeai as genai

logger = logging.getLogger(__name__)

class ILlmProvider(ABC):
    @abstractmethod
    async def get_completion(self, context: str, query: str) -> str:
        pass

class OpenAiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def get_completion(self, context: str, query: str) -> str:
        try:
            messages = [
                {"role": "system", "content": "You are a helpful AI assistant. Use the provided context to answer questions accurately."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
            ]
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

class GeminiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
    
    async def get_completion(self, context: str, query: str) -> str:
        try:
            prompt = f"Context: {context}\n\nQuestion: {query}\n\nPlease provide a helpful answer based on the context provided."
            
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

def get_llm_service() -> ILlmProvider:
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        return OpenAiLlmAdapter(api_key)
    
    elif provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        return GeminiLlmAdapter(api_key)
    
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")