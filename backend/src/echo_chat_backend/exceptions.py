"""
Custom exceptions for the Echo Chat backend
"""

class EchoChatBaseException(Exception):
    """Base exception for all Echo Chat errors"""
    def __init__(self, message: str, error_code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class LlmServiceError(EchoChatBaseException):
    """Raised when LLM service encounters an error"""
    def __init__(self, message: str, provider: str = "unknown"):
        self.provider = provider
        super().__init__(message, f"LLM_{provider.upper()}_ERROR")

class SttServiceError(EchoChatBaseException):
    """Raised when STT service encounters an error"""
    def __init__(self, message: str, provider: str = "unknown"):
        self.provider = provider
        super().__init__(message, f"STT_{provider.upper()}_ERROR")

class ConfigurationError(EchoChatBaseException):
    """Raised when configuration is invalid"""
    def __init__(self, message: str, config_key: str = "unknown"):
        self.config_key = config_key
        super().__init__(message, "CONFIGURATION_ERROR")

class ApiKeyError(ConfigurationError):
    """Raised when API key is missing or invalid"""
    def __init__(self, provider: str):
        super().__init__(
            f"API key for {provider} is missing or invalid",
            f"{provider.upper()}_API_KEY"
        )