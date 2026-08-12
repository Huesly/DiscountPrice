import { spawn } from 'node:child_process';

const child = spawn(
  'C:\\Program Files\\nodejs\\node.exe',
  ['--import', 'tsx', 'src/mcp/server.ts'],
  {
    cwd: 'C:\\Users\\snayl\\Desktop\\Github\\MCPprice',
    stdio: ['pipe', 'pipe', 'inherit'],
  }
);

let buf = '';
let reqId = 0;
const pending = new Map<number, (m: any) => void>();

child.stdout.on('data', (d) => {
  buf += d.toString();
  let idx: number;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const r = pending.get(msg.id);
    if (r) {
      pending.delete(msg.id);
      r(msg);
    }
  }
});

function call(method: string, params: Record<string, unknown> = {}) {
  return new Promise<any>((resolve) => {
    const id = ++reqId;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

await new Promise((r) => setTimeout(r, 2500));
const init = await call('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'opencode-sim', version: '1.0' },
});
console.log('initialize OK:', JSON.stringify(init.result?.serverInfo));
await call('notifications/initialized', {});
const tools = await call('tools/list', {});
console.log('tools/list OK:', (tools.result?.tools ?? []).map((t: any) => t.name).join(', '));
const deals = await call('tools/call', { name: 'get_deals', arguments: { limit: 3 } });
console.log('get_deals OK:', deals.result?.content?.[0]?.text?.slice(0, 120));
child.kill();
process.exit(0);