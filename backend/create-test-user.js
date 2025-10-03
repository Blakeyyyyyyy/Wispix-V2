const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Creating test user...');
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const user = await prisma.user.create({
      data: {
        id: 'test-user-123',
        email: 'test@wispix.ai',
        passwordHash: hashedPassword,
        name: 'Test User',
        subscriptionTier: 'free'
      }
    });
    
    console.log('✅ Test user created successfully:', user.id);
    console.log('📧 Email:', user.email);
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    
    if (error.message.includes('prepared statement')) {
      console.log('💡 This is a connection issue, not a schema issue');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 