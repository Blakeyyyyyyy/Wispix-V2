const { PrismaClient } = require('@prisma/client');

async function testUsers() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing user database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if users table exists and has data
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });
      
      console.log('✅ User query successful');
      console.log(`📋 Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`  - ${user.id} (${user.email})`);
      });
      
      if (users.length === 0) {
        console.log('⚠️ No users found in database');
        console.log('💡 This explains the "No users found" error');
      }
      
    } catch (userError) {
      console.error('❌ User query failed:', userError.message);
      
      // Check if it's a schema issue
      if (userError.message.includes('does not exist')) {
        console.log('💡 The users table might not exist in the database');
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUsers(); 