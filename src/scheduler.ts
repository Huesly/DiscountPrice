import 'dotenv/config';
import cron from 'node-cron';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const SCHEDULE = process.env.SCHEDULE_CRON ?? '0 */6 * * *';
const RUN_ON_START = (process.env.RUN_ON_START ?? 'true') === 'true';

function run(script: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsxBin, ['tsx', join(__dirname, script)], {
      cwd: process.cwd(),
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.on('exit', (code) => (code === 0 ? resolve(code ?? 0) : reject(new Error(`${script} falló (exit ${code})`))));
    child.on('error', reject);
  });
}

async function job() {
  const start = Date.now();
  console.log(`\n[${new Date().toISOString()}] ===== CICLO SCHEDULED =====`);
  try {
    await run('collector.ts');
    await run('analyzer.ts');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error en ciclo:`, (err as Error).message);
  }
  console.log(`[${new Date().toISOString()}] Ciclo terminado en ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
}

if (!cron.validate(SCHEDULE)) {
  console.error(`CRON inválido: ${SCHEDULE}`);
  process.exit(1);
}

console.log(`Scheduler activo. Próxima ejecución según: "${SCHEDULE}"`);
if (RUN_ON_START) {
  console.log('Ejecutando ciclo inicial...');
  job();
}
cron.schedule(SCHEDULE, job);