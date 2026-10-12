// Local transport for browser integration tests. It executes the actual Worker
// and Durable Object handlers; only Cloudflare storage/WebSocket IO is replaced.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function startWorkerTestServer(staticServer) {
  const worker = await import(pathToFileURL(path.join(__dirname, 'ramified-chess.worker.js')));
  const objects = new Map(), sockets = new Set(), timers = new Set();
  const env = { GAME_ROOM: { idFromName: name => name, get: name => getObject(name) } };
  function getObject(name) {
    if (objects.has(name)) return objects.get(name);
    const values = new Map(); let timer = null, object;
    const storage = {
      async get(k) { return structuredClone(values.get(k)); },
      async put(k, value) { values.set(k, structuredClone(value)); },
      async deleteAll() { values.clear(); await this.deleteAlarm(); },
      async deleteAlarm() { clearTimeout(timer); timers.delete(timer); timer = null; },
      async setAlarm(at) { await this.deleteAlarm(); timer = setTimeout(() => { timers.delete(timer); object.alarm().catch(console.error); }, Math.max(1, at - Date.now())); timers.add(timer); }
    };
    object = new worker.GameRoom({ storage, getWebSockets: () => [] }, env);
    objects.set(name, object); return object;
  }
  const original = staticServer.listeners('request')[0];
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/api/')) {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const request = new Request(`http://127.0.0.1:${server.address().port}${req.url}`, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
        const response = await worker.default.fetch(request, env);
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
      }
      if (req.url.split('?')[0] === '/ramified_minigames.html') {
        const html = fs.readFileSync(path.join(__dirname, '../ramified_minigames.html'), 'utf8').replace('https://ramified-chess.ramified.workers.dev', `http://127.0.0.1:${server.address().port}`);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
      }
      original(req, res);
    } catch (error) { res.writeHead(500); res.end(error.stack); }
  });
  server.on('upgrade', (req, net) => {
    const url = new URL(req.url, 'http://localhost');
    const name = url.pathname === '/ws/lobby' ? '__room-index__' : url.pathname.split('/').pop();
    const object = getObject(name), clientId = url.searchParams.get('clientId');
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    net.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let attachment = { clientId, joined: false, roles: [], lobby: name === '__room-index__', playerName: `Player ${clientId.slice(-4)}` };
    const ws = {
      deserializeAttachment: () => attachment,
      serializeAttachment: v => { attachment = v; },
      send(text) {
        const body = Buffer.from(text), header = Buffer.alloc(body.length < 126 ? 2 : body.length < 65536 ? 4 : 10);
        header[0] = 0x81; header[1] = body.length < 126 ? body.length : body.length < 65536 ? 126 : 127;
        if (header.length === 4) header.writeUInt16BE(body.length, 2);
        if (header.length === 10) header.writeBigUInt64BE(BigInt(body.length), 2);
        if (!net.destroyed) net.write(Buffer.concat([header, body]));
      },
      close() { net.end(Buffer.from([0x88, 0])); }
    };
    sockets.add(net); object.sessions.set(ws, attachment);
    if (attachment.lobby) object.broadcastLobby();
    let buffer = Buffer.alloc(0), fragments = [], queue = Promise.resolve();
    net.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const opcode = buffer[0] & 15, final = !!(buffer[0] & 128), masked = !!(buffer[1] & 128);
        let length = buffer[1] & 127, offset = 2;
        if (length === 126) { if (buffer.length < 4) return; length = buffer.readUInt16BE(2); offset = 4; }
        if (length === 127) { if (buffer.length < 10) return; length = Number(buffer.readBigUInt64BE(2)); offset = 10; }
        const mask = masked ? buffer.subarray(offset, offset + 4) : null; if (masked) offset += 4;
        if (buffer.length < offset + length) return;
        const payload = Buffer.from(buffer.subarray(offset, offset + length)); buffer = buffer.subarray(offset + length);
        if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        if (opcode === 8) { net.end(Buffer.from([0x88, 0])); return; }
        if (![0, 1].includes(opcode)) continue;
        fragments.push(payload);
        if (final) {
          const text = Buffer.concat(fragments).toString(); fragments = [];
          queue = queue.then(() => object.webSocketMessage(ws, text)).catch(error => { console.error(error); ws.send(JSON.stringify({ type: 'error', error: error.message })); });
        }
      }
    });
    net.on('error', () => {});
    net.on('close', () => { sockets.delete(net); queue.then(() => object.webSocketClose(ws)).catch(console.error); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, objects, async close() { for (const net of sockets) net.destroy(); for (const timer of timers) clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
module.exports = { startWorkerTestServer };
