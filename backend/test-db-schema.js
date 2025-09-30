const { PrismaClient } = require('@prisma/client');

async function testDatabaseSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database schema...');
    
    // Try to find the first automation
    const automation = await prisma.automation.findFirst();
    console.log('✅ Database query successful');
    console.log('📋 Found automation:', automation ? automation.id : 'None');
    
    // Try to create a test automation to see if lastRunAt and runLog work
    const testAutomation = await prisma.automation.create({
      data: {
        id: `test_${Date.now()}`,
        userId: 'test-user',
        name: 'Test Automation',
        description: 'Testing schema',
        workflowJson: {},
        status: 'active',
        isActive: true,
        lastRunAt: null,
        runLog: []
      }
    });
    
    console.log('✅ Test automation created successfully');
    console.log('📋 Test automation ID:', testAutomation.id);
    
    // Clean up
    await prisma.automation.delete({
      where: { id: testAutomation.id }
    });
    console.log('✅ Test automation cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.message.includes('lastRunAt')) {
      console.error('💡 The lastRunAt column does not exist in the database');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseSchema(); 