export const WEBSOCKET_CONFIG = {
  RECEIVING_TIMEOUT: 1000, // Timeout for receiving status in ms
  RECONNECT_DELAY: 3000,   // Delay before reconnecting in ms
  MAX_RETRIES: 5           // Maximum number of reconnection attempts
} as const;