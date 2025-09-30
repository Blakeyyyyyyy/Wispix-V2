require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { 
    console.error("❌  DATABASE_URL missing"); 
    process.exit(1); 
  }

  try {
    const c = new Client({ connectionString: url });
    await c.connect();
    await c.query('SELECT 1');
    await c.end();
    console.log("✅  Postgres is back online");
  } catch (e) {
    console.error("❌  Postgres still down:", e.message);
  }
})(); 