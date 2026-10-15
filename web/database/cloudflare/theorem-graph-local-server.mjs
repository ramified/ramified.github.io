import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './theorem-graph.worker.mjs';
import database from './theorem-graph-test-db.cjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '.theorem-assets');
export async function startLocalServer({ password, memory = false, port = 0 } = {}) {
  const db = new database.TestDatabase(memory ? ':memory:' : path.join(here, '.theorem-local', 'graphs.sqlite'));
  const env = { DB: db, ADMIN_USERNAME: 'ramified', ADMIN_PASSWORD_HASH: password, LOCAL_HTTP: 'true',
    ASSETS: { async fetch(request) {
      const file = path.resolve(assets, '.' + decodeURIComponent(new URL(request.url).pathname));
      if (!file.startsWith(assets + path.sep)) return new Response('Not found', { status: 404 });
      try {
        const body = await fs.readFile(file);
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
        return new Response(body, { headers: { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8' } });
      } catch { return new Response('Not found', { status: 404 }); }
    } }
  };
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(`http://127.0.0.1:${server.address().port}${incoming.url}`, {
        method: incoming.method, headers: incoming.headers,
        ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: incoming, duplex: 'half' })
      });
      const response = await worker.fetch(request, env);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { outgoing.writeHead(500); outgoing.end('Local server error.'); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { server, db, env, origin: `http://127.0.0.1:${server.address().port}` };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const secret = JSON.parse(await fs.readFile(path.join(here, '.theorem-local', 'password.json'), 'utf8'));
    const { origin } = await startLocalServer({ password: secret.ADMIN_PASSWORD_HASH, port: 8788 });
    console.log(`Personal editor: ${origin}/theorem_graph_calculator.html`);
  } catch (error) { console.error('Set a local password and build the assets first. ' + error.message); process.exitCode = 1; }
}
