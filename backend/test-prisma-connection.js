const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaConnection() {
  try {
    console.log('🔧 Testing Prisma connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic Prisma connection test successful:', result);
    
    // Test if we can query the users table
    console.log('🔧 Testing users table query...');
    const users = await prisma.user.findMany({
      take: 5
    });
    console.log('✅ Users table query successful:', users);
    
    // Test creating a user
    console.log('🔧 Testing user creation...');
    const newUser = await prisma.user.create({
      data: {
        id: 'test-prisma-' + Date.now(),
        email: 'test-prisma@example.com',
        passwordHash: 'test-hash',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ User creation successful:', newUser);
    
    // Clean up test user
    await prisma.user.delete({
      where: { id: newUser.id }
    });
    console.log('✅ Test user cleaned up');
    
  } catch (error) {
    console.error('❌ Prisma test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection()
  .then(() => {
    console.log('✅ Prisma connection test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Prisma connection test failed:', error);
    process.exit(1);
  }); 