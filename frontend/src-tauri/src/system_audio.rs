use tauri::{AppHandle, Emitter};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Stream, StreamConfig, SampleFormat, BufferSize, SampleRate};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemAudioDevice {
    pub name: String,
    pub device_type: String, // "system_output" for system audio capture
    pub is_default: bool,
}

#[cfg(target_os = "macos")]
pub struct SystemAudioCapture {
    app_handle: AppHandle,
}

#[cfg(target_os = "macos")]
impl SystemAudioCapture {
    pub async fn new_with_device(app_handle: AppHandle, device_name: String) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        println!("Starting system audio capture for device: {}", device_name);
        
        let host = cpal::default_host();
        
        // Find the system audio device (usually this would be a virtual device like BlackHole)
        let mut selected_device = None;
        
        // Look for system audio devices in input devices (virtual devices appear as inputs)
        for device in host.input_devices()? {
            if let Ok(device_name_str) = device.name() {
                if device_name_str.contains("BlackHole") || 
                   device_name_str.contains("Soundflower") || 
                   device_name_str == device_name {
                    selected_device = Some(device);
                    break;
                }
            }
        }
        
        // If no virtual device found, try to use the specified device as system audio
        if selected_device.is_none() {
            for device in host.output_devices()? {
                if let Ok(device_name_str) = device.name() {
                    if device_name_str == device_name {
                        // On macOS, we can't directly capture output devices
                        // User needs to install BlackHole or similar virtual audio device
                        return Err(format!(
                            "System audio capture requires a virtual audio device like BlackHole. \
                            Please install BlackHole from https://github.com/ExistentialAudio/BlackHole \
                            and set it as your system audio output device."
                        ).into());
                    }
                }
            }
        }
        
        let device = selected_device.ok_or(format!(
            "System audio device '{}' not found. \
            For system audio capture, you need to install BlackHole or Soundflower virtual audio device.",
            device_name
        ))?;
        
        println!("Using system audio device: {}", device.name()?);
        
        // Get default config
        let default_config = device.default_input_config()?;
        println!("System audio config: {:?}", default_config);
        
        // Configure stream for system audio
        let sample_rate = if default_config.sample_rate().0 >= 16000 {
            default_config.sample_rate()
        } else {
            SampleRate(44100)
        };
        
        let channels = if default_config.channels() >= 2 {
            2 // System audio is usually stereo
        } else {
            default_config.channels()
        };
        
        let stream_config = StreamConfig {
            channels,
            sample_rate,
            buffer_size: BufferSize::Default,
        };
        
        println!("Using system audio stream config: channels={}, sample_rate={}", 
                 channels, sample_rate.0);
        
        let app_handle_clone = app_handle.clone();
        
        // Create stream for system audio capture
        let stream = match default_config.sample_format() {
            SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        // Convert stereo to mono if needed and f32 to i16
                        let mono_data: Vec<i16> = if channels == 2 {
                            // Average stereo channels to mono
                            data.chunks_exact(2)
                                .map(|frame| {
                                    let avg = (frame[0] + frame[1]) / 2.0;
                                    (avg.clamp(-1.0, 1.0) * i16::MAX as f32) as i16
                                })
                                .collect()
                        } else {
                            data.iter()
                                .map(|&sample| (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
                                .collect()
                        };
                        
                        let audio_bytes = mono_data.iter()
                            .flat_map(|&sample| sample.to_le_bytes())
                            .collect::<Vec<u8>>();
                        
                        // Emit system audio data to frontend
                        if let Err(e) = app_handle_clone.emit("system-audio-data", audio_bytes) {
                            eprintln!("Failed to emit system audio data: {}", e);
                        }
                    },
                    move |err| {
                        eprintln!("System audio stream error: {}", err);
                    },
                    None,
                )?
            }
            SampleFormat::I16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        // Convert stereo to mono if needed
                        let mono_data: Vec<i16> = if channels == 2 {
                            data.chunks_exact(2)
                                .map(|frame| ((frame[0] as i32 + frame[1] as i32) / 2) as i16)
                                .collect()
                        } else {
                            data.to_vec()
                        };
                        
                        let audio_bytes = mono_data.iter()
                            .flat_map(|&sample| sample.to_le_bytes())
                            .collect::<Vec<u8>>();
                        
                        if let Err(e) = app_handle_clone.emit("system-audio-data", audio_bytes) {
                            eprintln!("Failed to emit system audio data: {}", e);
                        }
                    },
                    move |err| {
                        eprintln!("System audio stream error: {}", err);
                    },
                    None,
                )?
            }
            _ => {
                return Err("Unsupported sample format for system audio".into());
            }
        };
        
        // Start the stream
        stream.play()?;
        println!("System audio capture started successfully");
        
        // Keep the stream alive
        std::mem::forget(stream);
        
        let capture = SystemAudioCapture {
            app_handle,
        };
        
        Ok(capture)
    }
    
    pub async fn list_system_audio_devices() -> Result<Vec<SystemAudioDevice>, Box<dyn std::error::Error + Send + Sync>> {
        let host = cpal::default_host();
        let mut devices = Vec::new();
        
        // Look for virtual audio devices that can capture system audio
        for device in host.input_devices()? {
            match device.name() {
                Ok(name) => {
                    if name.contains("BlackHole") || 
                       name.contains("Soundflower") ||
                       name.contains("VB-Audio") ||
                       name.contains("Loopback") {
                        devices.push(SystemAudioDevice {
                            name: name.clone(),
                            device_type: "system_output".to_string(),
                            is_default: false,
                        });
                    }
                }
                Err(e) => eprintln!("Error getting device name: {}", e),
            }
        }
        
        // If no virtual devices found, provide instructions
        if devices.is_empty() {
            devices.push(SystemAudioDevice {
                name: "No system audio devices found - Install BlackHole".to_string(),
                device_type: "instruction".to_string(),
                is_default: false,
            });
        }
        
        Ok(devices)
    }
}

// Non-macOS platforms
#[cfg(not(target_os = "macos"))]
pub struct SystemAudioCapture;

#[cfg(not(target_os = "macos"))]
impl SystemAudioCapture {
    pub async fn new_with_device(_app_handle: AppHandle, _device_name: String) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Err("System audio capture is currently only supported on macOS".into())
    }
    
    pub async fn list_system_audio_devices() -> Result<Vec<SystemAudioDevice>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(vec![SystemAudioDevice {
            name: "System audio capture not supported on this platform".to_string(),
            device_type: "error".to_string(),
            is_default: false,
        }])
    }
}