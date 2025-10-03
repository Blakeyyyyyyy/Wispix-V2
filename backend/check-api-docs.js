const { PrismaClient } = require('@prisma/client');

async function checkApiDocs() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking API docs in database...');
    
    // Check if api_docs table has data
    const apiDocs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM api_docs`;
    console.log('📊 API docs count:', apiDocs);
    
    // Check if api_chunks table has data
    const apiChunks = await prisma.$queryRaw`SELECT COUNT(*) as count FROM api_chunks`;
    console.log('📊 API chunks count:', apiChunks);
    
    // Check what providers exist
    const providers = await prisma.$queryRaw`SELECT DISTINCT provider FROM api_docs`;
    console.log('📊 Providers:', providers);
    
  } catch (error) {
    console.error('❌ Error checking API docs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiDocs(); 