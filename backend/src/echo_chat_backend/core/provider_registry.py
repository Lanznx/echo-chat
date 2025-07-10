"""
Provider Registry System
核心插件化架構，支援動態 Provider 註冊與發現
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Type, Any, TypeVar, Generic
from dataclasses import dataclass
from enum import Enum
import importlib
import pkgutil
import inspect
import logging

logger = logging.getLogger(__name__)

class ProviderType(Enum):
    """Provider 類型枚舉"""
    LLM = "llm"
    STT = "stt"

@dataclass
class ProviderMetadata:
    """Provider 元數據"""
    name: str                  # Provider 名稱 (如 "openai", "gemini")
    display_name: str          # 顯示名稱 (如 "OpenAI GPT")
    description: str           # 描述
    version: str               # 版本
    provider_type: ProviderType # Provider 類型
    requires_api_key: bool     # 是否需要 API Key
    config_schema: Dict[str, Any] # 配置結構定義
    supported_models: List[str] # 支援的模型列表
    default_model: str         # 預設模型
    capabilities: List[str]    # 功能列表
    author: str = "Unknown"    # 作者
    homepage: str = ""         # 首頁
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典格式"""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "version": self.version,
            "provider_type": self.provider_type.value,
            "requires_api_key": self.requires_api_key,
            "config_schema": self.config_schema,
            "supported_models": self.supported_models,
            "default_model": self.default_model,
            "capabilities": self.capabilities,
            "author": self.author,
            "homepage": self.homepage
        }

P = TypeVar('P')  # Provider 類型

class IProviderRegistry(ABC, Generic[P]):
    """Provider Registry 抽象接口"""
    
    @abstractmethod
    def register(self, provider_class: Type[P], metadata: ProviderMetadata) -> None:
        """註冊 Provider"""
        pass
    
    @abstractmethod
    def get_provider(self, name: str) -> Optional[Type[P]]:
        """獲取 Provider 類別"""
        pass
    
    @abstractmethod
    def get_metadata(self, name: str) -> Optional[ProviderMetadata]:
        """獲取 Provider 元數據"""
        pass
    
    @abstractmethod
    def list_providers(self) -> List[str]:
        """列出所有 Provider 名稱"""
        pass
    
    @abstractmethod
    def list_metadata(self) -> List[ProviderMetadata]:
        """列出所有 Provider 元數據"""
        pass
    
    @abstractmethod
    def is_available(self, name: str) -> bool:
        """檢查 Provider 是否可用"""
        pass

class ProviderRegistry(IProviderRegistry[P]):
    """Provider Registry 實現"""
    
    def __init__(self, provider_type: ProviderType):
        self.provider_type = provider_type
        self._providers: Dict[str, Type[P]] = {}
        self._metadata: Dict[str, ProviderMetadata] = {}
    
    def register(self, provider_class: Type[P], metadata: ProviderMetadata) -> None:
        """註冊 Provider"""
        if metadata.provider_type != self.provider_type:
            raise ValueError(f"Provider type mismatch: expected {self.provider_type.value}, got {metadata.provider_type.value}")
        
        self._providers[metadata.name] = provider_class
        self._metadata[metadata.name] = metadata
        logger.info(f"Registered {self.provider_type.value} provider: {metadata.name}")
    
    def get_provider(self, name: str) -> Optional[Type[P]]:
        """獲取 Provider 類別"""
        return self._providers.get(name)
    
    def get_metadata(self, name: str) -> Optional[ProviderMetadata]:
        """獲取 Provider 元數據"""
        return self._metadata.get(name)
    
    def list_providers(self) -> List[str]:
        """列出所有 Provider 名稱"""
        return list(self._providers.keys())
    
    def list_metadata(self) -> List[ProviderMetadata]:
        """列出所有 Provider 元數據"""
        return list(self._metadata.values())
    
    def is_available(self, name: str) -> bool:
        """檢查 Provider 是否可用"""
        return name in self._providers

class ProviderRegistryManager:
    """Provider Registry 管理器 - 單例模式"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._llm_registry = ProviderRegistry(ProviderType.LLM)
            self._stt_registry = ProviderRegistry(ProviderType.STT)
            ProviderRegistryManager._initialized = True
    
    @property
    def llm_registry(self) -> ProviderRegistry:
        """LLM Provider Registry"""
        return self._llm_registry
    
    @property
    def stt_registry(self) -> ProviderRegistry:
        """STT Provider Registry"""
        return self._stt_registry
    
    def get_registry(self, provider_type: ProviderType) -> ProviderRegistry:
        """根據類型獲取 Registry"""
        if provider_type == ProviderType.LLM:
            return self._llm_registry
        elif provider_type == ProviderType.STT:
            return self._stt_registry
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
    
    def auto_discover_providers(self, package_name: str) -> None:
        """自動發現並註冊 Provider"""
        try:
            package = importlib.import_module(package_name)
            if hasattr(package, '__path__'):
                for importer, modname, ispkg in pkgutil.iter_modules(package.__path__, package.__name__ + "."):
                    if not ispkg:
                        try:
                            module = importlib.import_module(modname)
                            self._discover_providers_in_module(module)
                        except Exception as e:
                            logger.warning(f"Failed to import module {modname}: {e}")
        except Exception as e:
            logger.error(f"Failed to auto-discover providers in {package_name}: {e}")
    
    def _discover_providers_in_module(self, module) -> None:
        """在模組中發現 Provider"""
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and hasattr(obj, '__provider_metadata__'):
                metadata = obj.__provider_metadata__
                if isinstance(metadata, ProviderMetadata):
                    registry = self.get_registry(metadata.provider_type)
                    registry.register(obj, metadata)

# 全局 Registry 管理器實例
registry_manager = ProviderRegistryManager()

def register_provider(metadata: ProviderMetadata):
    """裝飾器：註冊 Provider"""
    def decorator(cls):
        cls.__provider_metadata__ = metadata
        registry = registry_manager.get_registry(metadata.provider_type)
        registry.register(cls, metadata)
        return cls
    return decorator