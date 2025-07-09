use tauri::{AppHandle, Emitter};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{StreamConfig, SampleFormat, BufferSize, SampleRate};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioDevice {
    pub name: String,
    pub device_type: String, // "input" or "output"
    pub is_default: bool,
}

pub struct AudioCapture {
    _app_handle: AppHandle,
    // We'll use a simpler approach - let the stream live independently
}

impl AudioCapture {
    #[allow(dead_code)]
    pub async fn new(app_handle: AppHandle) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Self::new_with_device(app_handle, None).await
    }
    
    pub async fn new_with_device(app_handle: AppHandle, device_name: Option<String>) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        println!("Starting system audio capture...");
        
        let host = cpal::default_host();
        
        // Select device based on name or use default
        let device = if let Some(name) = device_name {
            // Try to find device by name
            let mut selected_device = None;
            
            // Check input devices first
            for device in host.input_devices()? {
                if let Ok(device_name_str) = device.name() {
                    if device_name_str == name {
                        selected_device = Some(device);
                        break;
                    }
                }
            }
            
            // If not found in input devices, check output devices for system audio capture
            if selected_device.is_none() {
                for device in host.output_devices()? {
                    if let Ok(device_name_str) = device.name() {
                        if device_name_str == name {
                            selected_device = Some(device);
                            break;
                        }
                    }
                }
            }
            
            selected_device.ok_or(format!("Device '{}' not found", name))?
        } else {
            // Use default input device
            host.default_input_device()
                .ok_or("No default input device available")?
        };
        
        println!("Using audio device: {}", device.name()?);
        
        // Get default config and adapt to device capabilities
        let default_config = device.default_input_config()?;
        println!("Default input config: {:?}", default_config);
        
        // Try to use device's native sample rate if available, otherwise fallback to common rates
        let sample_rate = if default_config.sample_rate().0 >= 16000 {
            // Use device's native rate if it's >= 16kHz
            default_config.sample_rate()
        } else {
            // Try common sample rates
            SampleRate(44100) // Most common fallback
        };
        
        // Use mono if possible, otherwise use device's default channels
        let channels = if default_config.channels() >= 1 {
            1 // Prefer mono for speech
        } else {
            default_config.channels()
        };
        
        let stream_config = StreamConfig {
            channels,
            sample_rate,
            buffer_size: BufferSize::Default, // Use device's preferred buffer size
        };
        
        println!("Using stream config: channels={}, sample_rate={}, buffer_size=Default", 
                 channels, sample_rate.0);
        
        let app_handle_clone = app_handle.clone();
        
        // Create stream based on sample format
        let stream = match default_config.sample_format() {
            SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        // Convert f32 to i16 for transmission
                        let i16_data: Vec<i16> = data.iter()
                            .map(|&sample| (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
                            .collect();
                        
                        let audio_bytes = i16_data.iter()
                            .flat_map(|&sample| sample.to_le_bytes())
                            .collect::<Vec<u8>>();
                        
                        // Emit audio data to frontend
                        if let Err(e) = app_handle_clone.emit("audio-data", audio_bytes) {
                            eprintln!("Failed to emit audio data: {}", e);
                        }
                    },
                    move |err| {
                        eprintln!("Audio stream error: {}", err);
                    },
                    None,
                )?
            }
            SampleFormat::I16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        let audio_bytes = data.iter()
                            .flat_map(|&sample| sample.to_le_bytes())
                            .collect::<Vec<u8>>();
                        
                        // Emit audio data to frontend
                        if let Err(e) = app_handle_clone.emit("audio-data", audio_bytes) {
                            eprintln!("Failed to emit audio data: {}", e);
                        }
                    },
                    move |err| {
                        eprintln!("Audio stream error: {}", err);
                    },
                    None,
                )?
            }
            SampleFormat::U16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[u16], _: &cpal::InputCallbackInfo| {
                        // Convert u16 to i16
                        let i16_data: Vec<i16> = data.iter()
                            .map(|&sample| (sample as i32 - 32768) as i16)
                            .collect();
                        
                        let audio_bytes = i16_data.iter()
                            .flat_map(|&sample| sample.to_le_bytes())
                            .collect::<Vec<u8>>();
                        
                        // Emit audio data to frontend
                        if let Err(e) = app_handle_clone.emit("audio-data", audio_bytes) {
                            eprintln!("Failed to emit audio data: {}", e);
                        }
                    },
                    move |err| {
                        eprintln!("Audio stream error: {}", err);
                    },
                    None,
                )?
            }
            _ => {
                return Err("Unsupported sample format".into());
            }
        };
        
        // Start the stream
        stream.play()?;
        println!("System audio capture started successfully");
        
        // Let the stream live independently
        std::mem::forget(stream); // Keep the stream alive
        
        let capture = AudioCapture {
            _app_handle: app_handle,
        };
        
        Ok(capture)
    }
    
    pub async fn stop(self) {
        // Note: We can't easily stop the stream due to Rust's ownership system
        // In a production app, we'd use a more sophisticated approach
        println!("System audio capture stopped (stream continues running)");
    }
    
    pub async fn list_devices() -> Result<Vec<AudioDevice>, Box<dyn std::error::Error + Send + Sync>> {
        let host = cpal::default_host();
        let mut devices = Vec::new();
        
        // Get default devices for comparison
        let default_input = host.default_input_device();
        let default_output = host.default_output_device();
        
        // List input devices (microphones)
        for device in host.input_devices()? {
            match device.name() {
                Ok(name) => {
                    let is_default = default_input.as_ref()
                        .map_or(false, |d| d.name().map_or(false, |n| n == name));
                    
                    devices.push(AudioDevice {
                        name: name.clone(),
                        device_type: "input".to_string(),
                        is_default,
                    });
                }
                Err(e) => eprintln!("Error getting input device name: {}", e),
            }
        }
        
        // List output devices (speakers/system audio)
        for device in host.output_devices()? {
            match device.name() {
                Ok(name) => {
                    let is_default = default_output.as_ref()
                        .map_or(false, |d| d.name().map_or(false, |n| n == name));
                    
                    devices.push(AudioDevice {
                        name: name.clone(),
                        device_type: "output".to_string(),
                        is_default,
                    });
                }
                Err(e) => eprintln!("Error getting output device name: {}", e),
            }
        }
        
        Ok(devices)
    }
}