#!/bin/bash

# EchoChat 快速啟動腳本
# 此腳本會同時啟動前後端服務

# 確認當前目錄
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查環境變數檔案
if [ ! -f "backend/.env" ]; then
    echo "❌ 請先設定 backend/.env 檔案"
    echo "💡 可以複製 backend/.env.example 並填入你的 API keys"
    exit 1
fi

echo "🚀 啟動 EchoChat 開發環境..."
echo "================================="

# 創建日誌目錄
mkdir -p logs

# 啟動後端服務
echo "🔧 啟動後端服務..."
cd backend
uv run uvicorn src.echo_chat_backend.main:app --reload --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "⏳ 等待後端服務啟動..."
sleep 3

# 檢查後端是否正常運行
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 後端服務啟動失敗，請檢查日誌："
    cat logs/backend.log
    exit 1
fi

# 啟動前端服務
echo "🎨 啟動前端服務..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端啟動
echo "⏳ 等待前端服務啟動..."
sleep 5

# 檢查前端是否正常運行
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ 前端服務啟動失敗，請檢查日誌："
    cat logs/frontend.log
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 服務啟動成功！"
echo "================================="
echo "🌐 前端服務: http://localhost:3000"
echo "🔧 後端服務: http://localhost:8000"
echo "📊 後端健康檢查: http://localhost:8000/health"
echo "📝 後端文檔: http://localhost:8000/docs"
echo "================================="
echo "📋 程序 PID:"
echo "   - 後端: $BACKEND_PID"
echo "   - 前端: $FRONTEND_PID"
echo "🛑 按 Ctrl+C 停止所有服務"

# 保存 PID 到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 等待用戶中斷
trap 'echo "🛑 停止服務中..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; echo "✅ 服務已停止"; exit 0' INT

# 持續監控服務狀態
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ 後端服務意外停止"
        kill $FRONTEND_PID 2>/dev/null
        rm -f .backend.pid .frontend.pid
        exit 1
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ 前端服務意外停止"
        kill $BACKEND_PID 2>/dev/null
        rm -f .backend.pid .frontend.pid
        exit 1
    fi
    
    sleep 5
done