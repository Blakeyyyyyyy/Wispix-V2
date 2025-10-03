# Supabase Setup Guide for Automation Platform

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `automation-platform` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

### 2. Get Your Project Credentials
Once your project is created, go to **Settings > API** and copy:
- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Run Database Migrations
Your project already has migration files ready! Run these commands:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations to create all tables
supabase db push
```

### 4. Configure Environment Variables in Vercel
Go to your Vercel project settings and add these environment variables:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Automation Platform
VITE_APP_URL=https://adkitai.com
```

### 5. Redeploy Your Application
```bash
vercel --prod
```

## 📊 Database Schema Overview

Your platform will have these tables:

### Core Tables
- **`automation_threads`** - Main automation projects
- **`chat_messages`** - User-Agent 1 conversations  
- **`activity_logs`** - Agent 2 execution logs
- **`user_credentials`** - Stored service credentials
- **`automation_flows`** - Visual flow steps and context

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - users only see their own data
- **Real-time subscriptions** for live updates

## 🔧 Migration Files Included

Your project includes 5 migration files:
1. `holy_island.sql` - Creates automation_flows table
2. `rapid_moon.sql` - Fixes project_context column
3. `turquoise_pond.sql` - Adds project_context column
4. `pink_scene.sql` - Another project_context fix
5. `wandering_summit.sql` - Creates activity_logs table

## 🚨 Important Security Notes

### Authentication
- **Email/Password** authentication enabled
- **No email confirmation** required (for quick onboarding)
- **Session management** with automatic token refresh

### Data Protection
- **RLS policies** ensure users only access their own data
- **Credential storage** currently unencrypted (consider encryption for production)
- **Secure transmission** over HTTPS

## 🧪 Testing Your Setup

### 1. Test Database Connection
```bash
# Check if migrations were applied
supabase db diff

# View your tables
supabase db diff --schema public
```

### 2. Test Authentication
1. Visit your deployed app
2. Try creating an account
3. Verify you can login/logout

### 3. Test Real-time Features
1. Create a new automation thread
2. Send a message in chat
3. Verify real-time updates work

## 🔍 Troubleshooting

### Common Issues

#### Migration Errors
```bash
# Reset and reapply migrations
supabase db reset
supabase db push
```

#### Authentication Issues
- Check your Supabase project is active
- Verify environment variables are set correctly
- Check browser console for errors

#### Real-time Not Working
- Ensure RLS policies are enabled
- Check Supabase project is not paused
- Verify user is authenticated

### Getting Help
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Discord Community**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Issues**: [github.com/supabase/supabase](https://github.com/supabase/supabase)

## 🎯 Next Steps After Setup

1. **Test the platform** - Create an automation and test all features
2. **Configure webhooks** - Ensure Agent 1 and Agent 2 webhooks are working
3. **Set up monitoring** - Consider adding error tracking
4. **Customize branding** - Update colors, logos, etc.
5. **Add more integrations** - Extend the platform with new services

## 📈 Production Considerations

### Performance
- **Database indexing** is already configured
- **Real-time subscriptions** are optimized
- **Code splitting** reduces bundle size

### Security
- **Consider credential encryption** for production
- **Set up monitoring** for suspicious activity
- **Regular security audits** recommended

### Scaling
- **Supabase scales automatically** with your usage
- **Consider upgrading** to Pro plan for production
- **Monitor usage** in Supabase dashboard