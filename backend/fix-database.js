const { PrismaClient } = require('@prisma/client');

async function fixDatabase() {
  console.log('🔧 Fixing database issues...');
  
  const prisma = new PrismaClient();
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Create tables if they don't exist
    console.log('📋 Creating database tables...');
    
    // Create User table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password_hash TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        )
      `;
      console.log('✅ User table created/verified');
    } catch (error) {
      console.log('⚠️ User table already exists or error:', error.message);
    }
    
    // Create Automation table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Automation" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          config JSONB,
          "runLog" JSONB,
          "lastRunAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "userId" TEXT NOT NULL,
          "workflowJson" JSONB,
          FOREIGN KEY ("userId") REFERENCES "User"(id)
        )
      `;
      console.log('✅ Automation table created/verified');
    } catch (error) {
      console.log('⚠️ Automation table already exists or error:', error.message);
    }
    
    // Create Execution table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Execution" (
          id TEXT PRIMARY KEY,
          "automationId" TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          result JSONB,
          logs JSONB,
          error TEXT,
          progress JSONB,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "userId" TEXT NOT NULL,
          FOREIGN KEY ("automationId") REFERENCES "Automation"(id),
          FOREIGN KEY ("userId") REFERENCES "User"(id)
        )
      `;
      console.log('✅ Execution table created/verified');
    } catch (error) {
      console.log('⚠️ Execution table already exists or error:', error.message);
    }
    
    // Create ApiDoc table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "api_docs" (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          version TEXT NOT NULL,
          raw_md TEXT NOT NULL,
          source_url TEXT,
          fetched_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          UNIQUE(provider, version)
        )
      `;
      console.log('✅ ApiDoc table created/verified');
    } catch (error) {
      console.log('⚠️ ApiDoc table already exists or error:', error.message);
    }
    
    // Create ApiChunk table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "api_chunks" (
          id TEXT PRIMARY KEY,
          api_doc_id TEXT NOT NULL,
          hash TEXT UNIQUE NOT NULL,
          content_md TEXT NOT NULL,
          embedding DOUBLE PRECISION[],
          token_count INTEGER,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          FOREIGN KEY (api_doc_id) REFERENCES "api_docs"(id)
        )
      `;
      console.log('✅ ApiChunk table created/verified');
    } catch (error) {
      console.log('⚠️ ApiChunk table already exists or error:', error.message);
    }
    
    // Create DraftPlan table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "DraftPlan" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          json JSONB NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id)
        )
      `;
      console.log('✅ DraftPlan table created/verified');
    } catch (error) {
      console.log('⚠️ DraftPlan table already exists or error:', error.message);
    }
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase(); 