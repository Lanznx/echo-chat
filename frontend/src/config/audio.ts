/**
 * Audio Configuration
 * 
 * Centralized configuration for audio processing and visualization
 * All magic numbers and tunable parameters are defined here
 */

// Audio Processing Configuration
export const AUDIO_PROCESSING_CONFIG = {
  // Sensitivity multipliers - Higher values = more sensitive
  AVERAGE_LEVEL_AMPLIFICATION: 8.0,
  PEAK_LEVEL_AMPLIFICATION: 3.0,

  // Smoothing factors - Higher values = faster response
  ATTACK_SMOOTHING: 0.85,  // How quickly audio level rises
  DECAY_SMOOTHING: 0.5,    // How quickly audio level falls

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
  AUDIO_AMPLIFICATION: 4.0,
  FREQUENCY_RESPONSE_MULTIPLIER: 2.5,
  FREQUENCY_BAND_VARIATION: 0.4,
  RANDOM_VARIATION: 0.3,

  // Animation timing
  ATTACK_SMOOTHING: 0.9,   // How quickly bars rise
  DECAY_SMOOTHING: 0.3,    // How quickly bars fall
  DECAY_INTERVAL: 16,      // ms between decay updates
  PEAK_UPDATE_INTERVAL: 8, // ms between peak updates (~120fps)

  // Decay rates (0-1, lower = faster decay)
  BAR_DECAY_RATE: 0.85,
  PEAK_DECAY_RATE: 0.93,
  RECORDING_PEAK_DECAY_RATE: 0.99,

  // Visual effects
  MIN_DISPLAY_HEIGHT: 2,     // Minimum bar height in %
  GLOW_THRESHOLD: 0.1,       // Audio level threshold for glow effect
  SHADOW_THRESHOLD: 0.15,    // Audio level threshold for shadow effect
  BRIGHTNESS_MULTIPLIER: 1.2, // How bright the glow gets
  SHADOW_INTENSITY: 15,      // Shadow blur radius multiplier
  SHADOW_OPACITY_BASE: 0.6,  // Base shadow opacity
  SHADOW_OPACITY_MULTIPLIER: 0.8, // Shadow opacity multiplier

  // Frequency response curve
  FREQUENCY_POWER_CURVE: 0.6,    // Shape of frequency response
  CENTER_FREQUENCY_BOOST: 6,     // Number of center bars to boost
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