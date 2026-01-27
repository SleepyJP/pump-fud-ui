import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import 'dotenv/config';

const processes: ChildProcess[] = [];

function startProcess(name: string, script: string): ChildProcess {
  console.log(`🚀 Starting ${name}...`);

  const proc = spawn('npx', ['ts-node', script], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (error) => {
    console.error(`❌ ${name} error:`, error);
  });

  proc.on('exit', (code) => {
    console.log(`⚠️ ${name} exited with code ${code}`);
    // Restart on crash
    if (code !== 0) {
      console.log(`🔄 Restarting ${name} in 5 seconds...`);
      setTimeout(() => {
        const index = processes.indexOf(proc);
        if (index > -1) {
          processes.splice(index, 1);
        }
        processes.push(startProcess(name, script));
      }, 5000);
    }
  });

  return proc;
}

function shutdown() {
  console.log('\n🛑 Shutting down...');
  for (const proc of processes) {
    proc.kill();
  }
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main
console.log('═══════════════════════════════════════');
console.log('👑 PUMP.FUD Indexer Suite');
console.log('═══════════════════════════════════════');

const mode = process.argv[2] || 'all';

switch (mode) {
  case 'indexer':
    processes.push(startProcess('Indexer', 'src/indexer.ts'));
    break;

  case 'api':
    processes.push(startProcess('API', 'src/api.ts'));
    break;

  case 'distribute':
    processes.push(startProcess('Distributor', 'src/distribute.ts schedule'));
    break;

  case 'all':
  default:
    processes.push(startProcess('Indexer', 'src/indexer.ts'));
    // Small delay to let indexer initialize first
    setTimeout(() => {
      processes.push(startProcess('API', 'src/api.ts'));
    }, 2000);
    break;
}

console.log('');
console.log('Press Ctrl+C to stop all processes');
