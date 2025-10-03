require('dotenv').config();
const { Client } = require('pg');

async function testSimpleConnection() {
  console.log('🔍 Testing simple PostgreSQL connection...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL directly');
    
    // Test a simple query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Query successful:', result.rows);
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    console.log('📋 Users table exists:', tableCheck.rows.length > 0);
    
    if (tableCheck.rows.length > 0) {
      // Check if there are any users
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 User count:', userCount.rows[0].count);
      
      if (userCount.rows[0].count === '0') {
        console.log('💡 No users in database - this explains the error!');
        
        // Try to create a test user
        console.log('🔧 Creating a test user...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        const insertResult = await client.query(`
          INSERT INTO users (id, email, "passwordHash", name, "subscriptionTier", "createdAt", "updatedAt") 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING id, email
        `, ['test-user-123', 'test@wispix.ai', hashedPassword, 'Test User', 'free', new Date(), new Date()]);
        
        console.log('✅ Test user created:', insertResult.rows[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testSimpleConnection(); 