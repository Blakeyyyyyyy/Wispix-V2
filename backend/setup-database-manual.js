const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database schema manually...');
    
    // Test connection first
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Push schema to database
    console.log('📊 Pushing schema to database...');
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Database schema created successfully');
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma client generated');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test successful:', result);
    
    await prisma.$disconnect();
    console.log('✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 