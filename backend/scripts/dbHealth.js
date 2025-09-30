const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.$queryRaw`select 1`
  .then(() => {
    console.log('DB OK');
    process.exit(0);
  })
  .catch((e) => {
    console.error('DB ERROR', e);
    process.exit(1);
  });


