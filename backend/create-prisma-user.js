const { Client } = require('pg');

async function createPrismaUser() {
  // Use the original DATABASE_URL to create the prisma user
  const originalDbUrl = "postgresql://postgres.tmremyvoduqyjezgglcu:Growthy221%2421xyzisthename@aws-0-us-east-2.pooler.supabase.com:6543/postgres";
  
  const client = new Client({
    connectionString: originalDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Creating Prisma user in database...');
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Create the Prisma user
    await client.query(`
      -- Create custom user for Prisma
      create user "prisma" with password 'PrismaSecure2024!' bypassrls createdb;
    `);
    console.log('✅ Created prisma user');
    
    // Grant privileges
    await client.query(`
      -- extend prisma's privileges to postgres (necessary to view changes in Dashboard)
      grant "prisma" to "postgres";
    `);
    console.log('✅ Granted prisma to postgres');
    
    await client.query(`
      -- Grant it necessary permissions over the relevant schemas (public)
      grant usage on schema public to prisma;
      grant create on schema public to prisma;
      grant all on all tables in schema public to prisma;
      grant all on all routines in schema public to prisma;
      grant all on all sequences in schema public to prisma;
      alter default privileges for role postgres in schema public grant all on tables to prisma;
      alter default privileges for role postgres in schema public grant all on routines to prisma;
      alter default privileges for role postgres in schema public grant all on sequences to prisma;
    `);
    console.log('✅ Granted all permissions to prisma user');
    
  } catch (error) {
    console.error('❌ Failed to create Prisma user:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Prisma user already exists, continuing...');
    }
  } finally {
    await client.end();
  }
}

createPrismaUser()
  .then(() => {
    console.log('✅ Prisma user setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Prisma user setup failed:', error);
    process.exit(1);
  }); 