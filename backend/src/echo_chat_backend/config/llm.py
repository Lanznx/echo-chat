"""
LLM configuration constants
"""

class LlmConfig:
    """Configuration for LLM providers"""
    OPENAI_MODEL = "gpt-4o"
    GEMINI_MODEL = "gemini-2.5-pro"
    MAX_TOKENS = 1000
    TEMPERATURE = 0.7
    
    DEFAULT_SYSTEM_PROMPT = "你是一個聰明的 AI 參與會議者. 我需要你用繁體中文，並且根據會議的前後文回答問題."

LLM_CONFIG = LlmConfig()