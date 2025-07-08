#!/bin/bash

# EchoChat 停止腳本
# 此腳本會停止所有運行中的服務

echo "🛑 停止 EchoChat 服務..."

# 檢查 PID 文件
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "🔧 停止後端服務 (PID: $BACKEND_PID)"
        kill $BACKEND_PID
    fi
    rm -f .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "🎨 停止前端服務 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID
    fi
    rm -f .frontend.pid
fi

# 清理可能殘留的 Node.js 和 Python 進程
echo "🧹 清理殘留進程..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "uvicorn.*echo_chat_backend" 2>/dev/null || true

echo "✅ 服務已停止"