const { Client } = require('pg');
const url = process.env.DIRECT_URL;
const client = new Client({ connectionString: url });

client
  .connect()
  .then(() => {
    console.log('Connected to direct DB (5432)');
    return client.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Direct DB connection failed:', err.message);
    process.exit(1);
  });


