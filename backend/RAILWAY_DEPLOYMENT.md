# Railway Deployment Guide for Wispix AI Backend

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Environment variables configured

## Step 1: Connect Repository to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `Blakeyyyyyyy/Wispix-AI`
5. Select the `backend` directory as the service root

## Step 2: Configure Environment Variables

In Railway dashboard, go to your service → Variables tab and add:

### Required Variables:
```
DATABASE_URL=your-supabase-postgresql-url
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
REDIS_URL=your-redis-url
NODE_ENV=production
PORT=3000
ANTHROPIC_API_KEY=your-anthropic-api-key
CLAUDE_MODEL=claude-3-haiku-20240307
```

### Optional Variables:
```
RAILWAY_PROJECT_ID=your-railway-project-id
RAILWAY_SERVICE_ID=your-railway-service-id
ALLOWED_ORIGINS=https://your-frontend-domain.com
DEBUG_ROUTES=0
```

## Step 3: Database Setup

### Option A: Use Supabase (Recommended)
1. Create a Supabase project
2. Get your PostgreSQL connection string
3. Add to Railway variables: `DATABASE_URL=postgresql://...`

### Option B: Use Railway PostgreSQL
1. Add PostgreSQL service in Railway
2. Railway will automatically provide `DATABASE_URL`
3. Run migrations: `npx prisma db push`

## Step 4: Redis Setup

### Option A: Use Railway Redis
1. Add Redis service in Railway
2. Railway will automatically provide `REDIS_URL`

### Option B: Use External Redis
1. Use Redis Cloud, Upstash, or other provider
2. Add `REDIS_URL` to Railway variables

## Step 5: Deploy

1. Railway will automatically detect the build configuration
2. Build process:
   - `npm install`
   - `npm run build` (compiles TypeScript)
   - `npx prisma generate` (generates Prisma client)
   - `npm start` (runs the server)

## Step 6: Verify Deployment

1. Check the deployment logs in Railway
2. Test the health endpoint: `https://your-app.railway.app/health`
3. Test API endpoints: `https://your-app.railway.app/api/claude/`

## Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check TypeScript compilation: `npm run build`
- Verify Prisma schema: `npx prisma generate`

### Runtime Errors
- Check environment variables are set correctly
- Verify database connection
- Check Redis connection
- Review Railway logs for detailed error messages

### Health Check Failures
- Ensure `/health` endpoint is working
- Check database and Redis connectivity
- Verify all required environment variables

## Configuration Files

### railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300

[build.steps]
- "npm install"
- "npm run build"
- "npx prisma generate"
```

### package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "prisma generate"
  }
}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `REDIS_URL` | Yes | Redis connection string |
| `ANTHROPIC_API_KEY` | Yes | Claude AI API key |
| `NODE_ENV` | Yes | Set to "production" |
| `PORT` | No | Defaults to 3000 |
| `CLAUDE_MODEL` | No | Defaults to "claude-3-haiku-20240307" |

## Support

If you encounter issues:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are set
3. Test database and Redis connections
4. Ensure TypeScript compilation succeeds 