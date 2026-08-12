import { spawn } from 'node:child_process';

const child = spawn('npx', ['tsx', 'src/mcp/server.ts'], {
  cwd: process.cwd(),
  shell: true,
  stdio: ['pipe', 'pipe', 'inherit'],
});

let buf = '';
let reqId = 0;

type RpcMessage = { jsonrpc: string; id: number; result?: unknown; error?: unknown; [k: string]: unknown };

const pending = new Map<number, (m: RpcMessage) => void>();

child.stdout.on('data', (d: Buffer) => {
  buf += d.toString();
  let idx: number;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg: RpcMessage;
    try {
      msg = JSON.parse(line) as RpcMessage;
    } catch {
      continue;
    }
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

function call(method: string, params: Record<string, unknown> = {}): Promise<RpcMessage> {
  return new Promise((resolve) => {
    const id = ++reqId;
    pending.set(id, resolve as (m: RpcMessage) => void);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

await new Promise((r) => setTimeout(r, 2500));

const init = await call('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test', version: '1.0' },
});
console.log('initialize:', (init.result as { serverInfo?: unknown })?.serverInfo);

await call('notifications/initialized', {});

const tools = await call('tools/list', {});
console.log('\nTOOLS:');
for (const t of ((tools.result as { tools?: Array<{ name: string; description: string }> })?.tools) ?? [])
  console.log('  -', t.name, '-', t.description);

const stats = await call('tools/call', {
  name: 'get_price_stats',
  arguments: { sku: '153008200' },
});
console.log('\nSTATS RESULT:');
console.log((stats.result as { content?: Array<{ text?: string }> })?.content?.[0]?.text);

const deals = await call('tools/call', { name: 'get_deals', arguments: { limit: 5 } });
console.log('\nDEALS RESULT:');
console.log((deals.result as { content?: Array<{ text?: string }> })?.content?.[0]?.text);

child.kill();
process.exit(0);