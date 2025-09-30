#!/bin/bash

# Railway Deployment Script for Wispix Runtime Server
echo "🚀 Deploying Wispix Runtime Server to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "railway.toml" ]; then
    echo "❌ railway.toml not found. Please run this script from the project root."
    exit 1
fi

# Clean up existing automations to keep only TaskManager and InboxManager
echo "🧹 Cleaning up automations..."
cd backend
node ../cleanup-agents.js
if [ $? -ne 0 ]; then
    echo "⚠️  Cleanup had issues, but continuing..."
fi

# Build the runtime server
echo "🔨 Building runtime server..."
npm run build:runtime
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
cd ..

# Deploy to Railway
echo "🚂 Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your runtime server is now running on Railway!"
    echo "📊 Check the Railway dashboard for logs and monitoring."
    echo "🔗 Health check endpoint: https://your-railway-url.railway.app/api/health"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up PostgreSQL service in Railway"
    echo "2. Set up Redis service in Railway"
    echo "3. Configure environment variables in Railway dashboard"
    echo "4. Test the health check endpoint"
else
    echo "❌ Deployment failed!"
    exit 1
fi
