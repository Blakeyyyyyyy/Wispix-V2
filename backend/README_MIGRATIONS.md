# Prisma Migrations Guide

## Overview
Database migrations are executed in CI/CD using GitHub Actions since direct database access on port 5432 is restricted from local environments.

## Setup Instructions

### 1. Add GitHub Secret
1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following:
   - **Name:** `SUPABASE_DIRECT_URL`
   - **Value:** Your Supabase direct connection string with URL-encoded password:
     ```
     postgresql://postgres.<projectref>:URL_ENCODED_PASSWORD@db.<projectref>.supabase.co:5432/postgres?sslmode=require
     ```
   - Example (replace with your actual values):
     ```
     postgresql://postgres.tmremyvoduqyjezgglcu:Growthy221%24%21xyzisthename@db.tmremyvoduqyjezgglcu.supabase.co:5432/postgres?sslmode=require
     ```

### 2. Running Migrations
Migrations will run automatically when:
- You push changes to `main` branch that modify:
  - `backend/prisma/schema.prisma`
  - Any files in `backend/prisma/migrations/`

To run manually:
1. Go to Actions tab in GitHub
2. Select "Prisma Migrate Deploy" workflow
3. Click "Run workflow"

### 3. Local Development
After migrations are deployed:
```bash
cd backend
npx prisma generate
```

This ensures your local Prisma Client is in sync with the deployed schema.

## Creating New Migrations
Since we can't run `prisma migrate dev` locally:

1. Make schema changes in `backend/prisma/schema.prisma`
2. Generate migration SQL:
   ```bash
   cd backend
   npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/002_your_migration_name/migration.sql
   ```
3. Add a README.md to the migration folder explaining the changes
4. Commit and push to trigger deployment

## Rollback Strategy
To rollback changes:
1. Create a new migration that reverses the changes
2. Never delete or modify existing migration files
3. Deploy the rollback migration through the same CI process

## Troubleshooting
- Check GitHub Actions logs for migration errors
- Ensure `SUPABASE_DIRECT_URL` secret is correctly set
- Verify password is URL-encoded in the connection string
- Confirm `sslmode=require` is included in the URL
