#!/usr/bin/env bash
set -euo pipefail
: "${VERCEL_TOKEN:?Set VERCEL_TOKEN in Cursor/terminal env}"
: "${VERCEL_ORG_ID:?Set VERCEL_ORG_ID}"
: "${VERCEL_PROJECT_ID:?Set VERCEL_PROJECT_ID}"

echo "🚀 Starting headless production deployment..."

# 1) Link repo to Vercel project (no prompts)
echo "📌 Linking to Vercel project..."
vercel link --yes --token "$VERCEL_TOKEN" \
  --project "$VERCEL_PROJECT_ID"

# 2) Pull prod env (ensures SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
echo "🔧 Pulling production environment variables..."
vercel pull --yes --environment=production --token "$VERCEL_TOKEN"

# 3) Build & deploy to prod (no prompts)
echo "🏗️ Building and deploying to production..."
DEPLOY_OUT=$(vercel deploy --prod --token "$VERCEL_TOKEN" --confirm)

echo ""
echo "=== Production URL ==="
echo "$DEPLOY_OUT" | tail -n 1
echo ""
echo "✅ Deployment complete!"