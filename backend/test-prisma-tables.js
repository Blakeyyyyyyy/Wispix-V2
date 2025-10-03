const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaTables() {
  try {
    console.log('🔧 Testing Prisma table access...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic connection test successful:', result);
    
    // Check table structure
    console.log('🔧 Checking table structure...');
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'automations', 'executions')
      ORDER BY table_name, ordinal_position
    `;
    console.log('📋 Table structure:', tables);
    
    // Try to count users
    console.log('🔧 Testing user count...');
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
    console.log('✅ User count:', userCount);
    
    // Try to insert a test user
    console.log('🔧 Testing user insertion...');
    const userId = 'test-prisma-' + Date.now();
    const now = new Date();
    const insertResult = await prisma.$queryRaw`
      INSERT INTO users (id, email, "passwordHash", "createdAt", "updatedAt") 
      VALUES (${userId}, ${'test-prisma@example.com'}, ${'test-hash'}, ${now}, ${now}) 
      RETURNING id, email
    `;
    console.log('✅ User insertion test:', insertResult);
    
  } catch (error) {
    console.error('❌ Prisma table test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaTables()
  .then(() => {
    console.log('✅ Prisma table test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Prisma table test failed:', error);
    process.exit(1);
  }); 