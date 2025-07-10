# Provider 擴展指南

這個目錄展示了 EchoChat 的插件化架構。只需創建新檔案，Provider 就會自動註冊！

## 🚀 快速添加新 Provider

### 添加 LLM Provider

1. 在此目錄創建新檔案，例如 `your_llm_provider.py`
2. 複製下面的模板並修改：

```python
from ..services.llm_service import ILlmProvider
from ..core import ProviderType, ProviderMetadata, register_provider, config_manager, registry_manager
from ..exceptions import LlmServiceError

@register_provider(ProviderMetadata(
    name="your_provider",  # 唯一名稱
    display_name="Your Provider",  # 顯示名稱
    description="Your provider description",
    version="1.0.0",
    provider_type=ProviderType.LLM,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "API Key"},
        "model": {"type": "string", "required": False, "description": "Model name", "default": "default-model"}
    },
    supported_models=["model1", "model2"],
    default_model="model1",
    capabilities=["text-generation", "chat"],
    author="Your Name",
    homepage="https://your-provider.com"
))
class YourLlmAdapter(ILlmProvider):
    def __init__(self, api_key: str = None, **kwargs):
        # 配置初始化
        pass
    
    async def get_completion(self, context: str, query: str, system_prompt: Optional[str] = None, user_role: Optional[str] = None) -> str:
        # 實現你的 LLM 調用邏輯
        return "Your LLM response"
```

### 添加 STT Provider

1. 在此目錄創建新檔案，例如 `your_stt_provider.py`
2. 複製下面的模板並修改：

```python
from ..services.stt_service import ISttServiceProvider
from ..core import ProviderType, ProviderMetadata, register_provider, config_manager, registry_manager
from ..exceptions import SttServiceError

@register_provider(ProviderMetadata(
    name="your_stt",
    display_name="Your STT Provider",
    description="Your STT description",
    version="1.0.0",
    provider_type=ProviderType.STT,
    requires_api_key=True,
    config_schema={
        "api_key": {"type": "string", "required": True, "description": "API Key"},
        "language": {"type": "string", "required": False, "description": "Language", "default": "zh-TW"}
    },
    supported_models=["model1"],
    default_model="model1",
    capabilities=["streaming", "real-time"],
    author="Your Name",
    homepage="https://your-stt.com"
))
class YourSttAdapter(ISttServiceProvider):
    def __init__(self, api_key: str = None, **kwargs):
        # 配置初始化
        pass
    
    async def start_stream(self, websocket: WebSocket) -> None:
        # 開始串流
        pass
    
    async def process_audio(self, audio_data: bytes) -> None:
        # 處理音訊
        pass
    
    async def stop_stream(self) -> None:
        # 停止串流
        pass
```

## 📁 目前的 Provider 範例

- `claude_llm_provider.py` - Anthropic Claude LLM
- `whisper_stt_provider.py` - OpenAI Whisper STT

## ✨ 自動註冊機制

1. **裝飾器註冊**: 使用 `@register_provider` 裝飾器
2. **自動發現**: 應用啟動時自動導入所有 Provider
3. **動態前端**: 前端會自動獲取並顯示所有可用 Provider
4. **配置管理**: 支援靈活的配置和環境變數

## 🔧 配置

Provider 配置支援：
- 環境變數: `{PROVIDER_NAME}_{CONFIG_KEY}`
- 配置檔案: `config.json`
- 動態配置: 運行時設定

範例環境變數：
```bash
CLAUDE_API_KEY=your_claude_key
WHISPER_API_KEY=your_openai_key
WHISPER_MODEL=whisper-1
```

## 🎯 就這麼簡單！

添加新 Provider 只需要：
1. ✅ 創建一個檔案
2. ✅ 使用裝飾器註冊
3. ✅ 實現介面方法
4. ✅ 前端自動顯示新選項

不需要修改任何現有代碼！🚀