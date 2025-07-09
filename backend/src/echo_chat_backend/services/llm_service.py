from abc import ABC, abstractmethod
from typing import Optional
import os
import logging
import openai
import google.generativeai as genai

logger = logging.getLogger(__name__)


class ILlmProvider(ABC):
    @abstractmethod
    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        pass


class OpenAiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model

    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        try:
            # Use custom system prompt if provided, otherwise use default
            default_system_prompt = "你是一個聰明的 AI 參與會議者. 我需要你用繁體中文，並且根據會議的前後文回答問題."
            final_system_prompt = system_prompt or default_system_prompt
            
            # Add user role context if provided
            if user_role:
                final_system_prompt += f"\n\n使用者角色：{user_role}"
            
            messages = [
                {
                    "role": "system",
                    "content": final_system_prompt,
                },
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"},
            ]

            response = await self.client.chat.completions.create(
                model=self.model, messages=messages, max_tokens=1000, temperature=0.7
            )

            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise


class GeminiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-pro"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        try:
            # Use custom system prompt if provided, otherwise use default
            default_system_prompt = "你是一個聰明的 AI 參與會議者. 我需要你用繁體中文，並且根據會議的前後文回答問題."
            final_system_prompt = system_prompt or default_system_prompt
            
            # Add user role context if provided
            if user_role:
                final_system_prompt += f"\n\n使用者角色：{user_role}"
            
            prompt = f"{final_system_prompt}\n\nContext: {context}\n\nQuestion: {query}\n\n請用繁體中文回答."

            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise


def get_llm_service(provider: Optional[str] = None) -> ILlmProvider:
    # Use provided provider, fallback to environment variable, then default to openai
    selected_provider = (provider or os.getenv("LLM_PROVIDER", "openai")).lower()

    if selected_provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        return OpenAiLlmAdapter(api_key)

    elif selected_provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        return GeminiLlmAdapter(api_key)

    else:
        raise ValueError(f"Unsupported LLM provider: {selected_provider}")
