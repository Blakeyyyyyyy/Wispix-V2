#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🚀 Starting Wispix MVP from: $SCRIPT_DIR"

# Kill all conflicting processes
echo "🧹 Cleaning up old processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "node server" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
sleep 2

# Check if ports are free
echo "🔍 Checking ports..."
if lsof -i :3000 >/dev/null 2>&1; then
    echo "❌ Port 3000 is still in use. Killing process..."
    lsof -ti :3000 | xargs kill -9
    sleep 1
fi

if lsof -i :3002 >/dev/null 2>&1; then
    echo "❌ Port 3002 is still in use. Killing process..."
    lsof -ti :3002 | xargs kill -9
    sleep 1
fi

# Start backend
echo "🔧 Starting backend on port 3000..."
cd "$SCRIPT_DIR/backend"
PORT=3000 node server.js &
BACKEND_PID=$!
sleep 3

# Test backend
echo "🧪 Testing backend..."
if curl -s http://localhost:3000/ >/dev/null; then
    echo "✅ Backend is running on http://localhost:3000"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend on port 3002..."
cd "$SCRIPT_DIR/frontend"
npm start &
FRONTEND_PID=$!
sleep 5

# Test frontend
echo "🧪 Testing frontend..."
if curl -s http://localhost:3002/ | grep -q "Wispix"; then
    echo "✅ Frontend is running on http://localhost:3002"
else
    echo "❌ Frontend failed to start or not serving content"
    exit 1
fi

echo ""
echo "🎉 Wispix MVP is ready!"
echo "📍 Backend: http://localhost:3000"
echo "📍 Frontend: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
