// Utility to check if running in Tauri environment
export const isTauri = () => {
  try {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  } catch {
    return false;
  }
};

// Fallback for non-Tauri environment
export const getTauriAPI = () => {
  if (isTauri()) {
    return import('@tauri-apps/api/core');
  }
  return null;
};