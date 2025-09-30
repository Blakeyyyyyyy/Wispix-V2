require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...');
    await prisma.$connect();
    
    // Check automations table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'automations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Automations table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Check if we can query the table directly
    console.log('\n🔄 Testing direct query...');
    const result = await prisma.$queryRaw`SELECT * FROM automations LIMIT 1`;
    console.log('✅ Direct query successful');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema(); 