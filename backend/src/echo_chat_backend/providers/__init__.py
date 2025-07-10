"""
Providers Module

這個目錄包含所有額外的 Provider 實現。
只需在此目錄中創建新的 Provider 檔案，它們就會自動被註冊！

展示擴展性：
- claude_llm_provider.py: Anthropic Claude LLM Provider
- whisper_stt_provider.py: OpenAI Whisper STT Provider

要添加新的 Provider，只需：
1. 在此目錄創建新檔案
2. 使用 @register_provider 裝飾器
3. 實現相應的介面 (ILlmProvider 或 ISttServiceProvider)
4. Provider 會自動在前端顯示為選項！
"""

# 自動導入所有 Provider 以確保註冊
from .claude_llm_provider import ClaudeLlmAdapter
from .whisper_stt_provider import WhisperSttAdapter

__all__ = [
    'ClaudeLlmAdapter',
    'WhisperSttAdapter'
]