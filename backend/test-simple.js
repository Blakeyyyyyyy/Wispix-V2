require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('🔧 Simple Database Test');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('');

const prisma = new PrismaClient({
  log: ['error'],
});

async function simpleTest() {
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected successfully');
    
    // Test with a simple count instead of raw query
    console.log('🔄 Testing table access...');
    
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table: ${userCount} records`);
    } catch (error) {
      console.log(`❌ Users table error: ${error.message}`);
    }
    
    try {
      const automationCount = await prisma.automation.count();
      console.log(`✅ Automations table: ${automationCount} records`);
    } catch (error) {
      console.log(`❌ Automations table error: ${error.message}`);
    }
    
    try {
      const executionCount = await prisma.execution.count();
      console.log(`✅ Executions table: ${executionCount} records`);
    } catch (error) {
      console.log(`❌ Executions table error: ${error.message}`);
    }
    
    console.log('\n✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 This is expected when running locally.');
      console.log('   The database is on Supabase and requires deployment to Railway.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest(); 