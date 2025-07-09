// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use std::sync::Mutex;

// Audio capture module
mod audio_capture;
mod system_audio;
use audio_capture::{AudioCapture, AudioDevice};
use system_audio::{SystemAudioCapture, SystemAudioDevice};

// Shared state for audio capture
struct AppState {
    audio_capture: Arc<Mutex<Option<AudioCapture>>>,
    system_audio_capture: Arc<Mutex<Option<SystemAudioCapture>>>,
}

// Tauri command to start system audio capture
#[tauri::command]
async fn start_system_audio_capture(
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    device_name: Option<String>,
) -> Result<(), String> {
    println!("Starting system audio capture...");
    
    {
        let audio_capture = state.audio_capture.lock().unwrap();
        if audio_capture.is_some() {
            return Err("Audio capture already running".to_string());
        }
    }
    
    match AudioCapture::new_with_device(app_handle, device_name).await {
        Ok(capture) => {
            let mut audio_capture = state.audio_capture.lock().unwrap();
            *audio_capture = Some(capture);
            println!("System audio capture started successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("Failed to start audio capture: {}", e);
            Err(format!("Failed to start audio capture: {}", e))
        }
    }
}

// Tauri command to stop system audio capture
#[tauri::command]
async fn stop_system_audio_capture(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Stopping system audio capture...");
    
    let capture = {
        let mut audio_capture = state.audio_capture.lock().unwrap();
        audio_capture.take()
    };
    
    if let Some(capture) = capture {
        capture.stop().await;
        println!("System audio capture stopped");
        Ok(())
    } else {
        Err("No audio capture running".to_string())
    }
}

// Tauri command to list available audio devices
#[tauri::command]
async fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    match AudioCapture::list_devices().await {
        Ok(devices) => Ok(devices),
        Err(e) => Err(format!("Failed to list audio devices: {}", e))
    }
}

// Tauri command to start system audio capture specifically
#[tauri::command]
async fn start_system_audio_capture_device(
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    device_name: String,
) -> Result<(), String> {
    println!("Starting system audio capture for device: {}", device_name);
    
    {
        let system_audio_capture = state.system_audio_capture.lock().unwrap();
        if system_audio_capture.is_some() {
            return Err("System audio capture already running".to_string());
        }
    }
    
    match SystemAudioCapture::new_with_device(app_handle, device_name).await {
        Ok(capture) => {
            let mut system_audio_capture = state.system_audio_capture.lock().unwrap();
            *system_audio_capture = Some(capture);
            println!("System audio capture started successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("Failed to start system audio capture: {}", e);
            Err(format!("Failed to start system audio capture: {}", e))
        }
    }
}

// Tauri command to stop system audio capture
#[tauri::command]
async fn stop_system_audio_capture_device(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Stopping system audio capture...");
    
    let capture = {
        let mut system_audio_capture = state.system_audio_capture.lock().unwrap();
        system_audio_capture.take()
    };
    
    if let Some(_capture) = capture {
        println!("System audio capture stopped");
        Ok(())
    } else {
        Err("No system audio capture running".to_string())
    }
}

// Tauri command to list system audio devices
#[tauri::command]
async fn list_system_audio_devices() -> Result<Vec<SystemAudioDevice>, String> {
    match SystemAudioCapture::list_system_audio_devices().await {
        Ok(devices) => Ok(devices),
        Err(e) => Err(format!("Failed to list system audio devices: {}", e))
    }
}

fn main() {
    // Initialize app state
    let app_state = AppState {
        audio_capture: Arc::new(Mutex::new(None)),
        system_audio_capture: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_system_audio_capture,
            stop_system_audio_capture,
            list_audio_devices,
            start_system_audio_capture_device,
            stop_system_audio_capture_device,
            list_system_audio_devices
        ])
        .setup(|_app| {
            // Only open devtools when explicitly needed
            // #[cfg(debug_assertions)]
            // {
            //     let window = app.get_webview_window("main").unwrap();
            //     window.open_devtools();
            // }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}