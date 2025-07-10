"""
Audio configuration constants for the backend
"""

class SystemAudioConfig:
    """Configuration for system audio processing"""
    SAMPLE_RATE = 48000
    ENDPOINTING = 300  # Extend endpointing for better streaming
    STREAMING_DELAY = 0.1  # Small delay for streaming effect

SYSTEM_AUDIO_CONFIG = SystemAudioConfig()