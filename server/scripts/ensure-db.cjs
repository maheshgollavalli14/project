const net = require('net');
const { execSync } = require('child_process');
const path = require('path');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureDb() {
  const isRunning = await checkPort(5433);
  if (isRunning) {
    console.log('[DB-Init] ✓ PostgreSQL cluster is running on port 5433.');
    return;
  }

  console.log('[DB-Init] ⚡ Port 5433 is not reachable. Starting local PostgreSQL cluster (c:\\event\\pgdata)...');
  const scriptPath = path.resolve(__dirname, '../../scripts/start-db.ps1');

  try {
    execSync(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      stdio: 'inherit',
      windowsHide: true,
    });
    console.log('[DB-Init] ✓ PostgreSQL cluster started and verified on port 5433.');
  } catch (err) {
    console.error('[DB-Init] ❌ Failed to start PostgreSQL on port 5433:', err.message);
    process.exit(1);
  }
}

ensureDb();
