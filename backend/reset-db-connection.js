const { PrismaClient } = require('@prisma/client');

async function resetDatabaseConnection() {
  console.log('🔧 Resetting database connection...');
  
  // Create a fresh Prisma client
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Force disconnect any existing connections
    await prisma.$disconnect();
    console.log('✅ Disconnected existing connections');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect
    await prisma.$connect();
    console.log('✅ Reconnected to database');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test successful:', result);
    
    // Try to check if users table exists
    try {
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `;
      console.log('📋 Users table check:', tableCheck);
    } catch (tableError) {
      console.log('❌ Table check failed:', tableError.message);
    }
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabaseConnection(); 