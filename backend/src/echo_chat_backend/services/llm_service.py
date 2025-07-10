from abc import ABC, abstractmethod
from typing import Optional, List
import os
import logging
import openai
import google.generativeai as genai

from ..exceptions import LlmServiceError, ApiKeyError
from ..config.llm import LLM_CONFIG
from ..core import ProviderType, ProviderMetadata, registry_manager, register_provider, config_manager

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


@register_provider(ProviderMetadata(
    name="openai",
    display_name="OpenAI GPT",
    description="OpenAI GPT models including GPT-4o, GPT-4, GPT-3.5",
    version="1.0.0",
    provider_type=ProviderType.LLM,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "OpenAI API Key"},
        "model": {"type": "string", "required": False, "description": "Model name", "default": "gpt-4o"},
        "max_tokens": {"type": "integer", "required": False, "description": "Maximum tokens", "default": 1000},
        "temperature": {"type": "number", "required": False, "description": "Temperature", "default": 0.7}
    },
    supported_models=["gpt-4o", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    default_model="gpt-4o",
    capabilities=["text-generation", "chat", "streaming"],
    author="OpenAI",
    homepage="https://openai.com"
))
class OpenAiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str = None, **kwargs):
        # 使用配置管理器獲取配置
        metadata = registry_manager.llm_registry.get_metadata("openai")
        if metadata:
            config = config_manager.get_provider_config("openai", metadata.config_schema)
            api_key = api_key or config.get("api_key")
            self.model = config.get("model", LLM_CONFIG.OPENAI_MODEL)
            self.max_tokens = config.get("max_tokens", LLM_CONFIG.MAX_TOKENS)
            self.temperature = config.get("temperature", LLM_CONFIG.TEMPERATURE)
        else:
            # 向後相容
            self.model = kwargs.get("model", LLM_CONFIG.OPENAI_MODEL)
            self.max_tokens = LLM_CONFIG.MAX_TOKENS
            self.temperature = LLM_CONFIG.TEMPERATURE
        
        self.client = openai.AsyncOpenAI(api_key=api_key)

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
                max_tokens=self.max_tokens, 
                temperature=self.temperature
            )

            return response.choices[0].message.content
        except Exception as e:
            self._handle_error(e, "openai")


@register_provider(ProviderMetadata(
    name="gemini",
    display_name="Google Gemini",
    description="Google Gemini AI models including Gemini 2.5 Pro",
    version="1.0.0",
    provider_type=ProviderType.LLM,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "Google API Key"},
        "model": {"type": "string", "required": False, "description": "Model name", "default": "gemini-2.5-pro"},
    },
    supported_models=["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
    default_model="gemini-2.5-pro",
    capabilities=["text-generation", "chat", "vision", "multimodal"],
    author="Google",
    homepage="https://ai.google.dev"
))
class GeminiLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str = None, **kwargs):
        # 使用配置管理器獲取配置
        metadata = registry_manager.llm_registry.get_metadata("gemini")
        if metadata:
            config = config_manager.get_provider_config("gemini", metadata.config_schema)
            api_key = api_key or config.get("api_key")
            model_name = config.get("model", LLM_CONFIG.GEMINI_MODEL)
        else:
            # 向後相容
            model_name = kwargs.get("model", LLM_CONFIG.GEMINI_MODEL)
        
        genai.configure(api_key=api_key)
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
    """獲取 LLM 服務實例 - 支援 Registry 系統"""
    # Use provided provider, fallback to environment variable, then default to openai
    selected_provider = (provider or os.getenv("LLM_PROVIDER", "openai")).lower()
    
    # 嘗試從 Registry 獲取 Provider
    llm_registry = registry_manager.llm_registry
    provider_class = llm_registry.get_provider(selected_provider)
    
    if provider_class:
        # 從 Registry 獲取 Provider 元數據
        metadata = llm_registry.get_metadata(selected_provider)
        if not metadata:
            raise LlmServiceError(f"Provider metadata not found: {selected_provider}", selected_provider)
        
        # 獲取 API Key
        api_key_env = f"{selected_provider.upper()}_API_KEY"
        api_key = os.getenv(api_key_env)
        if metadata.requires_api_key and not api_key:
            raise ApiKeyError(selected_provider)
        
        # 創建 Provider 實例
        return provider_class(api_key)
    
    # 向後相容性 - 硬編碼的 Provider (將來可移除)
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

def get_available_llm_providers() -> List[ProviderMetadata]:
    """獲取可用的 LLM Provider 列表"""
    return registry_manager.llm_registry.list_metadata()
