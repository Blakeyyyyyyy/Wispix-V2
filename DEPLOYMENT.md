# Deployment Guide - Automation Platform

## Deploying to adkitai.com

This guide will help you deploy the Automation Platform to adkitai.com using Vercel.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project**: Ensure your Supabase project is set up
3. **Domain**: adkitai.com (configured in Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Configure Environment Variables

In your Vercel dashboard or via CLI, set these environment variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Production Environment
NODE_ENV=production
VITE_APP_NAME=Automation Platform
VITE_APP_URL=https://adkitai.com
```

### Step 4: Deploy

#### Option A: Deploy via CLI
```bash
# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy
```

#### Option B: Deploy via Vercel Dashboard
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Step 5: Configure Custom Domain

1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains" section
3. Add `adkitai.com` as custom domain
4. Configure DNS records as instructed by Vercel

### Step 6: Verify Deployment

1. Visit https://adkitai.com
2. Test user registration/login
3. Test automation creation
4. Verify webhook integrations work

### Production Checklist

- [ ] Environment variables configured
- [ ] Custom domain set up
- [ ] SSL certificate active
- [ ] Supabase RLS policies enabled
- [ ] Webhook endpoints accessible
- [ ] Real-time subscriptions working
- [ ] Error monitoring set up

### Troubleshooting

#### Build Errors
- Ensure Node.js version is 18.x in Vercel settings
- Check all environment variables are set
- Verify all dependencies are in package.json

#### Runtime Errors
- Check Supabase connection
- Verify webhook URLs are accessible
- Check browser console for errors

#### Domain Issues
- Verify DNS records are correct
- Check SSL certificate status
- Ensure domain is properly configured in Vercel

### Support

For deployment issues, check:
1. Vercel deployment logs
2. Supabase logs
3. Browser network tab
4. Console errors