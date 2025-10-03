#!/bin/bash

echo "🔍 Checking Railway Deployment Health..."

# Get Railway URL
echo "📡 Getting Railway service URL..."
RAILWAY_URL=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Could not get Railway URL. Check if service is deployed."
    exit 1
fi

echo "🌐 Railway URL: $RAILWAY_URL"

# Check health endpoint
echo "🏥 Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s "$RAILWAY_URL/health" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Health endpoint responding:"
    echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ Health endpoint failed"
fi

# Check if InboxManager is running
echo "📧 Checking InboxManager status..."
INBOX_STATUS=$(curl -s "$RAILWAY_URL/api/dev/run/InboxManager" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ InboxManager endpoint responding:"
    echo "$INBOX_STATUS" | jq . 2>/dev/null || echo "$INBOX_STATUS"
else
    echo "❌ InboxManager endpoint failed"
fi

echo "✅ Health check complete"
echo ""
echo "🔗 Railway Dashboard: https://railway.app"
echo "📊 Service URL: $RAILWAY_URL"

