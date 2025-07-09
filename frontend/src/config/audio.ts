/**
 * Audio Configuration
 * 
 * Centralized configuration for audio processing and visualization
 * All magic numbers and tunable parameters are defined here
 */

// Audio Processing Configuration
export const AUDIO_PROCESSING_CONFIG = {
  // Sensitivity multipliers - Higher values = more sensitive
  AVERAGE_LEVEL_AMPLIFICATION: 500.0,  // 160.0 → 500.0 (3x increase)
  PEAK_LEVEL_AMPLIFICATION: 150.0,     // 40.0 → 150.0 (3.75x increase)

  // Smoothing factors - Higher values = faster response
  ATTACK_SMOOTHING: 0.9,   // How quickly audio level rises (0.85 → 0.9)
  DECAY_SMOOTHING: 0.4,    // How quickly audio level falls (0.5 → 0.4 slower decay)

  // Normalization constants
  SAMPLE_RATE_NORMALIZATION: 32768,
  MAX_LEVEL: 1.0,
} as const;

// Audio Visualizer Configuration
export const AUDIO_VISUALIZER_CONFIG = {
  // Basic layout
  BAR_COUNT: 24,
  BASE_HEIGHT: 0.05,
  MIN_HEIGHT: 0.01,
  MAX_HEIGHT: 1.0,

  // Sensitivity settings - Higher values = more responsive
  AUDIO_AMPLIFICATION: 8.0,           // 4.0 → 8.0 (2x increase)
  FREQUENCY_RESPONSE_MULTIPLIER: 6.0, // 3.0 → 6.0 (2x increase)
  FREQUENCY_BAND_VARIATION: 0.8,      // 0.5 → 0.8 (1.6x increase)
  RANDOM_VARIATION: 0.6,              // 0.4 → 0.6 (1.5x increase)

  // Animation timing
  ATTACK_SMOOTHING: 0.95,  // How quickly bars rise (0.85 → 0.95 更快響應)
  DECAY_SMOOTHING: 0.5,    // How quickly bars fall (0.6 → 0.5 稍微慢一點)
  DECAY_INTERVAL: 10,      // ms between decay updates (15 → 10 更快更新)
  PEAK_UPDATE_INTERVAL: 16, // ms between peak updates (~60fps)

  // Decay rates (0-1, lower = faster decay)
  BAR_DECAY_RATE: 0.9,    // 0.85 → 0.9 (更慢衰減，保持更久)
  PEAK_DECAY_RATE: 0.95,  // 0.93 → 0.95 (更慢衰減)
  RECORDING_PEAK_DECAY_RATE: 0.995, // 0.99 → 0.995 (更慢衰減)

  // Visual effects
  MIN_DISPLAY_HEIGHT: 1,     // Minimum bar height in %
  GLOW_THRESHOLD: 0.02,      // Audio level threshold for glow effect (0.1 → 0.02 極低閾值)
  SHADOW_THRESHOLD: 0.05,    // Audio level threshold for shadow effect (0.15 → 0.05 極低閾值)
  BRIGHTNESS_MULTIPLIER: 2.0, // How bright the glow gets (1.2 → 2.0 更亮)
  SHADOW_INTENSITY: 30,      // Shadow blur radius multiplier (20 → 30 更強)
  SHADOW_OPACITY_BASE: 0.9,  // Base shadow opacity (0.8 → 0.9 更不透明)
  SHADOW_OPACITY_MULTIPLIER: 1.2, // Shadow opacity multiplier (1.0 → 1.2 更強)

  // Frequency response curve
  FREQUENCY_POWER_CURVE: 0.3,    // Shape of frequency response (0.6 → 0.3 更平坦，更敏感)
  CENTER_FREQUENCY_BOOST: 8,     // Number of center bars to boost (6 → 8 更多中心增強)
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Frame rate limits
  MAX_FPS: 60,
  MIN_UPDATE_INTERVAL: 16, // ms (60fps)

  // Memory management
  MAX_AUDIO_BUFFER_SIZE: 4096,
  CLEANUP_INTERVAL: 1000, // ms
} as const;

// Preset configurations for different sensitivity levels
export const SENSITIVITY_PRESETS = {
  LOW: {
    AUDIO_AMPLIFICATION: 1.0,
    AVERAGE_LEVEL_AMPLIFICATION: 4.0,
    PEAK_LEVEL_AMPLIFICATION: 1.5,
  },
  MEDIUM: {
    AUDIO_AMPLIFICATION: 1.5,
    AVERAGE_LEVEL_AMPLIFICATION: 6.0,
    PEAK_LEVEL_AMPLIFICATION: 2.0,
  },
  HIGH: {
    AUDIO_AMPLIFICATION: 2.0,
    AVERAGE_LEVEL_AMPLIFICATION: 8.0,
    PEAK_LEVEL_AMPLIFICATION: 3.0,
  },
  ULTRA: {
    AUDIO_AMPLIFICATION: 3.0,
    AVERAGE_LEVEL_AMPLIFICATION: 12.0,
    PEAK_LEVEL_AMPLIFICATION: 4.0,
  },
} as const;

// Type definitions for configuration
export type SensitivityLevel = keyof typeof SENSITIVITY_PRESETS;
export type AudioProcessingConfig = typeof AUDIO_PROCESSING_CONFIG;
export type AudioVisualizerConfig = typeof AUDIO_VISUALIZER_CONFIG;