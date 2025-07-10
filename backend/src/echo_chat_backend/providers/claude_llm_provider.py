"""
Claude (Anthropic) LLM Provider
示例：展示如何添加新的 LLM Provider

只需創建此檔案，Provider 就會自動註冊到系統中！
"""

import httpx
from typing import Optional
from ..services.llm_service import ILlmProvider
from ..core import ProviderType, ProviderMetadata, register_provider, config_manager, registry_manager
from ..exceptions import LlmServiceError
import logging

logger = logging.getLogger(__name__)

@register_provider(ProviderMetadata(
    name="claude",
    display_name="Anthropic Claude",
    description="Claude AI models by Anthropic, including Claude 3.5 Sonnet and Claude 3 Haiku",
    version="1.0.0",
    provider_type=ProviderType.LLM,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "Anthropic API Key"},
        "model": {"type": "string", "required": False, "description": "Model name", "default": "claude-3-5-sonnet-20241022"},
        "max_tokens": {"type": "integer", "required": False, "description": "Maximum tokens", "default": 1000},
        "temperature": {"type": "number", "required": False, "description": "Temperature", "default": 0.7}
    },
    supported_models=[
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022", 
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307"
    ],
    default_model="claude-3-5-sonnet-20241022",
    capabilities=["text-generation", "chat", "analysis", "coding", "reasoning"],
    author="Anthropic",
    homepage="https://www.anthropic.com"
))
class ClaudeLlmAdapter(ILlmProvider):
    """Claude LLM Provider - 展示新 Provider 的簡單實現"""
    
    def __init__(self, api_key: str = None, **kwargs):
        # 使用配置管理器獲取配置
        metadata = registry_manager.llm_registry.get_metadata("claude")
        if metadata:
            config = config_manager.get_provider_config("claude", metadata.config_schema)
            self.api_key = api_key or config.get("api_key")
            self.model = config.get("model", "claude-3-5-sonnet-20241022")
            self.max_tokens = config.get("max_tokens", 1000)
            self.temperature = config.get("temperature", 0.7)
        else:
            # 向後相容
            self.api_key = api_key
            self.model = kwargs.get("model", "claude-3-5-sonnet-20241022")
            self.max_tokens = kwargs.get("max_tokens", 1000)
            self.temperature = kwargs.get("temperature", 0.7)
        
        self.base_url = "https://api.anthropic.com/v1"
    
    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        try:
            final_system_prompt = self._build_system_prompt(system_prompt, user_role)
            
            # Claude API 格式
            messages = [
                {
                    "role": "user",
                    "content": f"Context: {context}\\n\\nQuestion: {query}"
                }
            ]
            
            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01"
            }
            
            payload = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "system": final_system_prompt,
                "messages": messages
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception(f"Claude API error: {response.status_code} - {response.text}")
                
                result = response.json()
                return result["content"][0]["text"]
                
        except Exception as e:
            self._handle_error(e, "claude")

# 自動導入以確保註冊
# 此檔案被導入時，@register_provider 裝飾器會自動執行註冊