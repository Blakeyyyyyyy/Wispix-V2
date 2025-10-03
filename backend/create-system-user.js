const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSystemUser() {
  try {
    console.log('🔍 Creating system user for Cline...');
    
    // Try to create the system user directly
    const systemUser = await prisma.user.create({
      data: {
        id: 'cline-system-user',
        email: 'cline-system@wispix.ai',
        passwordHash: 'system-user-no-password',
        name: 'Cline System User',
        subscriptionTier: 'system'
      }
    });
    
    console.log('✅ Created system user:', systemUser.id);
    return systemUser.id;
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('✅ System user already exists');
      return 'cline-system-user';
    } else {
      console.error('❌ Failed to create system user:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

createSystemUser(); 