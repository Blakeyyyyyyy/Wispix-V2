const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function testAppPrisma() {
  try {
    console.log('🔧 Testing application-style Prisma usage...');
    
    // Test exactly what the application does
    const email = 'test-app@example.com';
    const password = 'Test123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    
    console.log('🔧 Creating user with application logic...');
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash: hashedPassword,
        subscriptionTier: 'free',
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log('✅ User created successfully:', user);
    
    // Test finding user by email
    console.log('🔧 Testing findUserByEmail...');
    const foundUser = await prisma.user.findUnique({
      where: { email }
    });
    
    console.log('✅ User found by email:', foundUser);
    
  } catch (error) {
    console.error('❌ Application Prisma test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAppPrisma()
  .then(() => {
    console.log('✅ Application Prisma test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Application Prisma test failed:', error);
    process.exit(1);
  }); 