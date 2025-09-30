#!/bin/bash

echo "🛑 Stopping Wispix MVP..."

# Kill all MVP-related processes
pkill -f "vite" 2>/dev/null || true
pkill -f "node server" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Force kill any remaining processes on our ports
if lsof -i :3001 >/dev/null 2>&1; then
    echo "🔪 Force killing port 3001..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
fi

if lsof -i :3002 >/dev/null 2>&1; then
    echo "🔪 Force killing port 3002..."
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
fi

echo "✅ All MVP processes stopped"
