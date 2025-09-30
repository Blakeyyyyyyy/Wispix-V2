require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnections() {
  console.log('🔧 Testing Supabase database connections...\n');
  
  let pooledSuccess = false;
  let directSuccess = false;
  
  // Test pooled connection (DATABASE_URL - port 6543)
  console.log('📡 Testing pooled connection (DATABASE_URL)...');
  const pooled = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    // Test basic connection
    const pooledResult = await pooled.$queryRaw`SELECT current_user, inet_server_port(), now()`;
    console.log('✅ Pooled connection successful:', pooledResult[0]);
    
    // Test users table
    try {
      const userCount = await pooled.$queryRaw`SELECT count(*) FROM users`;
      console.log('✅ Pooled users table query successful:', userCount[0]);
    } catch (error) {
      console.log('⚠️  Pooled users table not found (expected):', error.message);
    }
    
    pooledSuccess = true;
  } catch (error) {
    console.log('❌ Pooled connection failed:', error.message);
  } finally {
    await pooled.$disconnect();
  }
  
  console.log('');
  
  // Test direct connection (DIRECT_URL - port 5432)
  console.log('📡 Testing direct connection (DIRECT_URL)...');
  const direct = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  });
  
  try {
    // Test basic connection
    const directResult = await direct.$queryRaw`SELECT current_user, inet_server_port(), now()`;
    console.log('✅ Direct connection successful:', directResult[0]);
    
    // Test users table
    try {
      const userCount = await direct.$queryRaw`SELECT count(*) FROM users`;
      console.log('✅ Direct users table query successful:', userCount[0]);
    } catch (error) {
      console.log('⚠️  Direct users table not found (expected):', error.message);
    }
    
    directSuccess = true;
  } catch (error) {
    console.log('❌ Direct connection failed:', error.message);
  } finally {
    await direct.$disconnect();
  }
  
  console.log('\n📊 Test Results:');
  console.log(`Pooled connection (6543): ${pooledSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Direct connection (5432): ${directSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (pooledSuccess && directSuccess) {
    console.log('\n🎉 All database connections working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Some database connections failed!');
    process.exit(1);
  }
}

testDatabaseConnections().catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
