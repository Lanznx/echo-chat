# EchoChat - Real-time Voice AI Assistant

A modern web application that provides real-time speech-to-text transcription with AI chat capabilities. Built with FastAPI backend and Next.js frontend.

## Features

- **Real-time Speech-to-Text**: Powered by Deepgram for accurate, streaming transcription
- **AI Chat Interface**: Ask questions about your transcript using OpenAI or Google Gemini
- **Audio Visualization**: Live audio level visualization during recording
- **Responsive Design**: Clean, modern UI with Tailwind CSS
- **Service Abstraction**: Extensible architecture for STT and LLM providers

## 🚀 Quick Start

For the fastest setup, use the provided scripts:

```bash
# 1. 設定後端環境變數
cd backend
cp .env.example .env
# 編輯 .env 填入你的 API keys

# 2. 回到專案根目錄並啟動
cd ..
./start.sh
```

The script will automatically:
- Start the backend server on `http://localhost:8000`
- Start the frontend server on `http://localhost:3000`
- Monitor both services
- Provide easy shutdown with `Ctrl+C`

To stop services manually:
```bash
./stop.sh
```

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.10+
- **Package Manager**: uv
- **STT Service**: Deepgram
- **LLM Services**: OpenAI / Google Gemini
- **Real-time Communication**: WebSockets

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Audio Processing**: Web Audio API
- **Real-time Communication**: WebSockets

## Project Structure

```
echo-chat/
├── backend/
│   ├── src/
│   │   └── echo_chat_backend/
│   │       ├── main.py              # FastAPI app entry point
│   │       └── services/
│   │           ├── stt_service.py   # Speech-to-Text service
│   │           └── llm_service.py   # LLM service
│   ├── .env.example                 # Environment variables template
│   ├── pyproject.toml              # Python dependencies
│   └── uv.lock                     # Dependency lock file
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Main application page
│   │   │   └── layout.tsx          # Root layout
│   │   ├── components/
│   │   │   ├── AudioVisualizer.tsx # Audio visualization
│   │   │   ├── ChatInterface.tsx   # Chat UI
│   │   │   └── TranscriptSidebar.tsx # Transcript sidebar
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts     # WebSocket management
│   │   │   └── useAudioRecorder.ts # Audio recording
│   │   └── types/
│   │       └── index.ts            # TypeScript types
│   ├── .env.local                  # Frontend environment variables
│   └── package.json                # Node.js dependencies
├── start.sh                        # Quick start script (启动前后端)
├── stop.sh                         # Stop script (停止所有服务)
└── README.md                       # This file
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment with uv:
   ```bash
   uv sync
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your API keys:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   LLM_PROVIDER=openai  # or "gemini"
   OPENAI_API_KEY=your_openai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Run the backend server:
   ```bash
   uv run uvicorn src.echo_chat_backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:3000`

## Usage

1. **Start Recording**: Click the "Start Recording" button to begin voice transcription
2. **View Transcript**: See real-time transcription in the left sidebar
3. **Ask Questions**: Use the chat interface to ask questions about your transcript
4. **Stop Recording**: Click "Stop Recording" when finished
5. **Clear Transcript**: Use the "Clear" button to reset the transcript

## API Endpoints

### WebSocket Endpoints

- **`/ws/stream`**: Real-time audio streaming for speech-to-text conversion

### REST API Endpoints

- **`GET /health`**: Health check endpoint
- **`POST /api/chat/completion`**: Chat completion endpoint
  - Request: `{"context": "string", "query": "string"}`
  - Response: `{"response": "string"}`

## Configuration

### Environment Variables

#### Backend (`.env`)
- `DEEPGRAM_API_KEY`: Your Deepgram API key
- `LLM_PROVIDER`: Choose between "openai" or "gemini"
- `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI)
- `GEMINI_API_KEY`: Your Google Gemini API key (if using Gemini)

#### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: `http://127.0.0.1:8000`)

## Development

### Running Tests

Backend tests (if implemented):
```bash
cd backend
uv run pytest
```

Frontend tests:
```bash
cd frontend
npm test
```

### Building for Production

Backend:
```bash
cd backend
uv build
```

Frontend:
```bash
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Requirements

- Python 3.10+
- Node.js 18+
- Modern web browser with WebRTC support
- Microphone access for audio recording

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**: Ensure the backend is running on port 8000
2. **Microphone Access Denied**: Check browser permissions for microphone access
3. **API Key Errors**: Verify your API keys are correctly set in environment variables
4. **Audio Recording Issues**: Ensure you're using HTTPS in production (required for microphone access)

### Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

For the best experience, use Chrome or Edge with their superior WebRTC implementation.