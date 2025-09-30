require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('🔧 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✅ SET' : '❌ MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function testConnection() {
  console.log('Testing database connection...\n');
  
  try {
    // Test basic connection
    console.log('🔄 Attempting to connect...');
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Test simple query
    console.log('🔄 Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
    // Check if tables exist
    console.log('🔄 Checking database tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('\n📋 Tables in database:');
    if (tables.length === 0) {
      console.log('  ⚠️  No tables found - database might be empty');
    } else {
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }
    
    // Try to access specific tables
    console.log('\n🔄 Testing table access...');
    
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table accessible: ${userCount} users`);
    } catch (error) {
      console.log(`❌ Users table error: ${error.message}`);
    }
    
    try {
      const automationCount = await prisma.automation.count();
      console.log(`✅ Automations table accessible: ${automationCount} automations`);
    } catch (error) {
      console.log(`❌ Automations table error: ${error.message}`);
    }
    
    try {
      const executionCount = await prisma.execution.count();
      console.log(`✅ Executions table accessible: ${executionCount} executions`);
    } catch (error) {
      console.log(`❌ Executions table error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Meta:', error.meta);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 Solution: This is expected when running locally.');
      console.log('   The database is on Supabase and requires deployment to Railway.');
      console.log('   For local testing, you can:');
      console.log('   1. Deploy to Railway where connection will work');
      console.log('   2. Set up a local PostgreSQL database');
      console.log('   3. Use Supabase HTTP API instead of direct connection');
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test completed');
  }
}

testConnection(); 