const net = require('net');
const host = process.env.WAIT_HOST || '127.0.0.1';
const port = parseInt(process.env.WAIT_PORT || '5432', 10);
const timeoutMs = parseInt(process.env.WAIT_TIMEOUT || '60000', 10);
const start = Date.now();

function tryOnce() {
  const s = net.createConnection(port, host, () => {
    console.log(`port ${host}:${port} open`);
    s.end();
    process.exit(0);
  });
  s.on('error', () => {
    if (Date.now() - start > timeoutMs) {
      console.error(`timeout waiting for ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(tryOnce, 500);
  });
}

tryOnce();

