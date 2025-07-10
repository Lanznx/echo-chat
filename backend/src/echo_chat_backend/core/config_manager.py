"""
Configuration Manager
動態配置管理系統，支援 Provider 特定配置
"""

import os
import json
from typing import Dict, Any, Optional, List, Type, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

@dataclass
class ConfigValue:
    """配置值結構"""
    value: Any
    source: str  # 來源：env, config_file, default
    provider: str  # 所屬 Provider
    key: str  # 配置鍵名

class IConfigSource(ABC):
    """配置來源抽象接口"""
    
    @abstractmethod
    def get_value(self, key: str) -> Optional[Any]:
        """獲取配置值"""
        pass
    
    @abstractmethod
    def has_key(self, key: str) -> bool:
        """檢查是否存在配置鍵"""
        pass
    
    @abstractmethod
    def get_source_name(self) -> str:
        """獲取來源名稱"""
        pass

class EnvironmentConfigSource(IConfigSource):
    """環境變數配置來源"""
    
    def get_value(self, key: str) -> Optional[Any]:
        return os.getenv(key)
    
    def has_key(self, key: str) -> bool:
        return key in os.environ
    
    def get_source_name(self) -> str:
        return "environment"

class FileConfigSource(IConfigSource):
    """配置檔案來源"""
    
    def __init__(self, config_path: str):
        self.config_path = config_path
        self._config_cache: Optional[Dict[str, Any]] = None
    
    def _load_config(self) -> Dict[str, Any]:
        """載入配置檔案"""
        if self._config_cache is None:
            try:
                if os.path.exists(self.config_path):
                    with open(self.config_path, 'r', encoding='utf-8') as f:
                        self._config_cache = json.load(f)
                else:
                    self._config_cache = {}
            except Exception as e:
                logger.error(f"Error loading config file {self.config_path}: {e}")
                self._config_cache = {}
        return self._config_cache
    
    def get_value(self, key: str) -> Optional[Any]:
        config = self._load_config()
        return config.get(key)
    
    def has_key(self, key: str) -> bool:
        config = self._load_config()
        return key in config
    
    def get_source_name(self) -> str:
        return f"file:{self.config_path}"

class DefaultConfigSource(IConfigSource):
    """預設配置來源"""
    
    def __init__(self, defaults: Dict[str, Any]):
        self.defaults = defaults
    
    def get_value(self, key: str) -> Optional[Any]:
        return self.defaults.get(key)
    
    def has_key(self, key: str) -> bool:
        return key in self.defaults
    
    def get_source_name(self) -> str:
        return "default"

class ConfigManager:
    """配置管理器"""
    
    def __init__(self):
        self._config_sources: List[tuple] = []
        self._provider_configs: Dict[str, Dict[str, Any]] = {}
        self._config_cache: Dict[str, ConfigValue] = {}
    
    def add_config_source(self, source: IConfigSource, priority: int = 100) -> None:
        """添加配置來源（優先級越低越優先）"""
        self._config_sources.append((priority, source))
        self._config_sources.sort(key=lambda x: x[0])  # 按優先級排序
        self._clear_cache()
    
    def set_provider_config(self, provider: str, config: Dict[str, Any]) -> None:
        """設定 Provider 特定配置"""
        self._provider_configs[provider] = config
        self._clear_cache()
    
    def get_config(self, provider: str, key: str, default: Any = None) -> ConfigValue:
        """獲取配置值"""
        cache_key = f"{provider}.{key}"
        
        if cache_key in self._config_cache:
            return self._config_cache[cache_key]
        
        # 優先級順序：Provider 特定配置 > 環境變數 > 配置檔案 > 預設值
        
        # 1. 檢查 Provider 特定配置
        if provider in self._provider_configs:
            provider_config = self._provider_configs[provider]
            if key in provider_config:
                config_value = ConfigValue(
                    value=provider_config[key],
                    source=f"provider:{provider}",
                    provider=provider,
                    key=key
                )
                self._config_cache[cache_key] = config_value
                return config_value
        
        # 2. 檢查環境變數（Provider 特定格式：{PROVIDER}_{KEY}）
        env_key = f"{provider.upper()}_{key.upper()}"
        for priority, source in self._config_sources:
            if source.has_key(env_key):
                value = source.get_value(env_key)
                if value is not None:
                    config_value = ConfigValue(
                        value=value,
                        source=source.get_source_name(),
                        provider=provider,
                        key=key
                    )
                    self._config_cache[cache_key] = config_value
                    return config_value
        
        # 3. 檢查通用環境變數
        generic_key = key.upper()
        for priority, source in self._config_sources:
            if source.has_key(generic_key):
                value = source.get_value(generic_key)
                if value is not None:
                    config_value = ConfigValue(
                        value=value,
                        source=source.get_source_name(),
                        provider=provider,
                        key=key
                    )
                    self._config_cache[cache_key] = config_value
                    return config_value
        
        # 4. 使用預設值
        config_value = ConfigValue(
            value=default,
            source="default",
            provider=provider,
            key=key
        )
        self._config_cache[cache_key] = config_value
        return config_value
    
    def get_value(self, provider: str, key: str, default: Any = None) -> Any:
        """獲取配置值（僅返回值）"""
        return self.get_config(provider, key, default).value
    
    def validate_config(self, provider: str, config_schema: Dict[str, Any]) -> Dict[str, Any]:
        """驗證 Provider 配置"""
        validated_config = {}
        errors = []
        
        for key, schema in config_schema.items():
            required = schema.get("required", False)
            default_value = schema.get("default")
            config_type = schema.get("type", "string")
            
            config_value = self.get_config(provider, key, default_value)
            
            if config_value.value is None and required:
                errors.append(f"Required configuration '{key}' is missing for provider '{provider}'")
                continue
            
            if config_value.value is not None:
                # 類型轉換
                try:
                    if config_type == "integer":
                        validated_config[key] = int(config_value.value)
                    elif config_type == "number":
                        validated_config[key] = float(config_value.value)
                    elif config_type == "boolean":
                        if isinstance(config_value.value, str):
                            validated_config[key] = config_value.value.lower() in ("true", "1", "yes", "on")
                        else:
                            validated_config[key] = bool(config_value.value)
                    else:
                        validated_config[key] = str(config_value.value)
                except (ValueError, TypeError) as e:
                    errors.append(f"Invalid value for '{key}' in provider '{provider}': {e}")
        
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")
        
        return validated_config
    
    def get_provider_config(self, provider: str, config_schema: Dict[str, Any]) -> Dict[str, Any]:
        """獲取並驗證 Provider 完整配置"""
        return self.validate_config(provider, config_schema)
    
    def _clear_cache(self) -> None:
        """清除配置快取"""
        self._config_cache.clear()

# 全域配置管理器實例
config_manager = ConfigManager()

# 添加預設配置來源
config_manager.add_config_source(EnvironmentConfigSource(), priority=10)
config_manager.add_config_source(DefaultConfigSource({}), priority=1000)

# 如果存在配置檔案，自動載入
default_config_path = os.path.join(os.path.dirname(__file__), "../../config.json")
if os.path.exists(default_config_path):
    config_manager.add_config_source(FileConfigSource(default_config_path), priority=50)