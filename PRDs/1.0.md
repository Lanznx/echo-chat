好的，完全理解。我們要為一個全新的專案撰寫一份 PRD，指定使用 FastAPI 作為後端、Next.js 作為前端。這是一個絕佳的現代技術棧組合。

這份 PRD 將會是從零開始的完整藍圖，涵蓋專案願景、技術選型、架構設計到具體的 API 規格。

-----

## **產品需求文件 (PRD): "EchoChat" - 即時語音 AI 助理平台**

### **1. 文件資訊**

  * **專案名稱:** EchoChat
  * **文件版本:** 1.0
  * **日期:** 2025年7月8日
  * **作者:** Gemini
  * **狀態:** **草稿**

### **2. 專案總覽與願景 (Project Overview & Vision)**

**總覽:**
"EchoChat" 是一個全新的 Web 應用程式，旨在提供頂尖的即時語音轉文字 (Streaming Speech-to-Text) 功能，並結合先進的大型語言模型 (LLM) 技術，打造一個互動式的 AI 助理。使用者可以透過麥克風無縫地將語音轉換為文字稿，並基於這些文字稿內容，與 AI 進行深入的對話與問答。

**願景:**
我們的願景是打破人機互動的延遲障礙，創造一個「所言即所得、所得即可問」的流暢體驗。EchoChat 不僅是一個轉錄工具，更是一個能即時理解對話脈絡、並提供智慧洞察的知識夥伴。

### **3. 目標使用者 (Target Audience)**

  * **內容創作者:** 記者、Podcaster、Youtuber，需要快速將口述內容轉為文字初稿。
  * **專業人士:** 律師、醫師、研究員，需要在會議或諮詢中即時記錄並整理要點。
  * **學生與教育者:** 需要將課程、講座內容記錄下來，並能立即針對內容提問以加深理解。
  * **開發者:** 需要一個高效的語音互動範例或 API 服務。

### **4. 核心功能與範疇 (Core Features & Scope)**

#### **4.1. 前端 (Frontend - Next.js)**

1.  **響應式 UI 介面:**
      * 採用左側邊欄 + 中間主內容區的佈局。
      * **左側邊欄:** 用於顯示由後端即時推送的語音轉錄結果。文字需平滑地更新，而非跳動式刷新。
      * **中間內容區:** 仿照主流 Chatbot（如 ChatGPT）的對話視窗。包含對話歷史顯示區與使用者問題輸入框。
2.  **音訊處理模組:**
      * **音訊來源抽象層 (`IAudioSource`):** 設計一個標準介面，首期實作 `MicrophoneAudioSource`，為未來擴展（如螢幕錄音）預留接口。
      * **錄音控制元件:** 提供清晰的「開始/停止錄音」按鈕，並附帶錄音狀態的視覺回饋（如閃爍圖示）。
      * **音訊視覺化元件:** 即時渲染麥克風音訊的波形或頻譜圖，讓使用者確認音訊正在被擷取。
3.  **狀態管理與通訊:**
      * 使用 React Hooks (`useState`, `useEffect`, `useRef`) 管理 WebSocket 連線狀態、轉錄稿內容及聊天歷史。
      * 實作一個 WebSocket 客戶端服務，負責與 FastAPI 後端建立/關閉連線、傳送音訊數據、接收轉錄結果並更新 UI。
      * 實作一個 HTTP 客戶端，用於向後端的 `/api/chat/completion` 端點發送聊天請求。

#### **4.2. 後端 (Backend - FastAPI)**

1.  **WebSocket 即時串流端點:**
      * **Endpoint:** `/ws/stream`
      * **職責:**
          * 接收 Next.js 前端的 WebSocket 連線請求。
          * 非同步地接收前端傳來的位元組音訊流 (audio bytes)。
          * 將音訊流即時代理 (proxy) 到 Deepgram 的串流服務。
          * 非同步地接收 Deepgram 的 JSON 格式轉錄結果。
          * 將結果轉換為標準內部格式後，即時回傳給前端。
2.  **RESTful AI 聊天端點:**
      * **Endpoint:** `POST /api/chat/completion`
      * **職責:**
          * 使用 Pydantic 模型定義清晰的請求 (`context`, `query`) 與回應 (`response`) 格式，並自動進行數據驗證。
          * 接收前端的聊天請求。
          * 呼叫 LLM 服務抽象層，與指定的 LLM 供應商（如 Gemini, OpenAI）互動。
          * 回傳 AI 生成的答案。
3.  **服務抽象層 (Service Abstraction Layers):**
      * **STT 服務層:** 雖然初期鎖定 Deepgram，但仍需建立 `ISttServiceProvider` 介面 (可使用 Python 的 `ABC` 模組)，並實作 `DeepgramSttAdapter`。這確保了架構的彈性。
      * **LLM 服務層:** 建立 `ILlmProvider` 介面，並實作 `GeminiLlmAdapter` 和 `OpenAiLlmAdapter` 等，可透過環境變數輕鬆切換。

### **5. 技術棧 (Technology Stack)**

  * **前端:**
      * 框架: **Next.js 14+** (App Router)
      * 語言: **TypeScript**
      * 樣式: **Tailwind CSS**
      * 狀態管理: React Hooks / Context API
  * **後端:**
      * 框架: **FastAPI**
      * 語言: **Python 3.10+**
      * 伺服器: **Uvicorn**
      * 通訊: `websockets` 函式庫
  * **第三方服務:**
      * 語音轉文字 (STT): **Deepgram**
      * 大型語言模型 (LLM): **OpenAI** / **Google Gemini** (可配置)

### **6. 系統架構與資料流 (System Architecture & Data Flow)**

```mermaid
graph TD
    subgraph Browser (Next.js)
        A[使用者] --> B[React UI Components];
        B -- 點擊錄音 --> C[AudioSource: Microphone];
        C -- Audio Chunks --> D[WebSocket Client];
        B -- 聊天提問 --> E[REST API Client];
        D -- 接收轉錄稿 --> B;
        E -- 接收AI回覆 --> B;
    end

    subgraph Server (FastAPI on Uvicorn)
        F[WebSocket Endpoint\n/ws/stream] <--> D;
        F -- Audio Chunks --> G[STT Adapter\n(DeepgramSttAdapter)];
        G -- Proxy Stream --> H((Deepgram API));
        H -- Transcript JSON --> G;
        G -- Formatted Transcript --> F;

        I[REST API Endpoint\n/api/chat/completion] <--> E;
        I -- (Context, Query) --> J[LLM Adapter\n(Gemini/OpenAI)];
        J -- API Call --> K((LLM Service API));
        K -- Completion --> J;
        J -- Formatted Response --> I;
    end
```

### **7. API 規格定義 (API Specification)**

#### **7.1. Backend: FastAPI**

**WebSocket 端點: `/ws/stream`**

```python
# main.py
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # 1. 建立與 Deepgram 的連線
    # 2. 進入迴圈，接收來自前端的音訊
    try:
        while True:
            audio_data = await websocket.receive_bytes()
            # 3. 將 audio_data 轉發給 Deepgram
            # 4. 在一個獨立的 task 中接收 Deepgram 的回覆，並傳回前端
            #    response = format_deepgram_response(dg_response)
            #    await websocket.send_text(response)
    except Exception as e:
        print(f"Connection closed: {e}")

```

**REST API 端點: `POST /api/chat/completion`**

```python
# main.py
from pydantic import BaseModel

class ChatRequest(BaseModel):
    context: str
    query: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat/completion", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    # 1. 從 LLM Adapter 獲取回覆
    #    llm_adapter = get_llm_adapter()
    #    ai_response = await llm_adapter.get_completion(
    #        context=request.context,
    #        query=request.query
    #    )
    # 2. 回傳結果
    return ChatResponse(response=ai_response)
```

### **8. 使用者故事 (User Stories)**

(與先前版本相同，此處不再贅述)

### **9. 成功指標 (Success Metrics)**

  * **端對端延遲:** 從使用者說話到文字出現在左側邊欄的 P95 (95百分位) 延遲 \< 800ms。
  * **API 可用性:** 所有 API 端點的正常運行時間 (Uptime) \> 99.9%。
  * **功能採用率:** 上線後一個月，每日活躍使用者 (DAU) 中有 25% 曾使用聊天功能。

### **10. 未來展望 (Out of Scope)**

  * 支援檔案上傳進行非即時轉錄。
  * 使用者帳號系統與歷史紀錄雲端儲存。
  * 實作螢幕音訊或分頁音訊的 `IAudioSource`。
  * 支援多國語言切換。

### **11. 專案設定與啟動 (Project Setup)**

  * **後端:**
    1.  `python -m venv venv`
    2.  `source venv/bin/activate`
    3.  `pip install fastapi uvicorn websockets python-dotenv httpx`
    4.  建立 `.env` 檔案並填入 `DEEPGRAM_API_KEY`, `LLM_PROVIDER`, `OPENAI_API_KEY`, 等。
  * **前端:**
    1.  `npx create-next-app@latest echo-chat-frontend` (選擇 TypeScript, Tailwind CSS, App Router)
    2.  `npm install`
    3.  建立 `.env.local` 並填入後端 API 的 URL，例如 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`。

-----

這份 PRD 為一個全新的、使用 FastAPI 和 Next.js 的專案提供了完整的開發藍圖。開發團隊可以立即根據此文件分工合作，開始專案的生命週期。
