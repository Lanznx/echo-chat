from abc import ABC, abstractmethod
from typing import Optional
import os
import logging
import openai
import google.generativeai as genai

from ..exceptions import LlmServiceError, ApiKeyError
from ..config.llm import LLM_CONFIG

logger = logging.getLogger(__name__)


class ILlmProvider(ABC):
    @abstractmethod
    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        pass
    
    def _handle_error(self, error: Exception, provider: str) -> None:
        """Standardized error handling for all LLM providers"""
        logger.error(f"{provider} API error: {error}")
        raise LlmServiceError(str(error), provider)
    
    def _build_system_prompt(self, system_prompt: Optional[str], user_role: Optional[str]) -> str:
        """Build system prompt with optional user role"""
        final_system_prompt = system_prompt or LLM_CONFIG.DEFAULT_SYSTEM_PROMPT
        
        if user_role:
            final_system_prompt += f"\n\n使用者角色：{user_role}"
        
        return final_system_prompt


class OpenAiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = None):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model or LLM_CONFIG.OPENAI_MODEL

    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        try:
            final_system_prompt = self._build_system_prompt(system_prompt, user_role)
            
            messages = [
                {
                    "role": "system",
                    "content": final_system_prompt,
                },
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"},
            ]

            response = await self.client.chat.completions.create(
                model=self.model, 
                messages=messages, 
                max_tokens=LLM_CONFIG.MAX_TOKENS, 
                temperature=LLM_CONFIG.TEMPERATURE
            )

            return response.choices[0].message.content
        except Exception as e:
            self._handle_error(e, "openai")


class GeminiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = None):
        genai.configure(api_key=api_key)
        model_name = model or LLM_CONFIG.GEMINI_MODEL
        self.model = genai.GenerativeModel(model_name)

    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        try:
            final_system_prompt = self._build_system_prompt(system_prompt, user_role)
            prompt = f"{final_system_prompt}\n\nContext: {context}\n\nQuestion: {query}\n\n請用繁體中文回答."

            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            self._handle_error(e, "gemini")


def get_llm_service(provider: Optional[str] = None) -> ILlmProvider:
    # Use provided provider, fallback to environment variable, then default to openai
    selected_provider = (provider or os.getenv("LLM_PROVIDER", "openai")).lower()

    if selected_provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ApiKeyError("openai")
        return OpenAiLlmAdapter(api_key)

    elif selected_provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ApiKeyError("gemini")
        return GeminiLlmAdapter(api_key)

    else:
        raise LlmServiceError(f"Unsupported LLM provider: {selected_provider}", "unknown")
