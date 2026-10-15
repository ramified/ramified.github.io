import { passwordHash } from './theorem-graph.worker.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
if (!['--local', '--deploy'].includes(mode)) {
  console.log('Usage: node cloudflare/set-theorem-password.mjs --local|--deploy');
  process.exit(0);
}
function hiddenInput(prompt) {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal. Passwords are never command-line arguments.');
  process.stdout.write(prompt);
  process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => { process.stdin.off('data', input); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const input = data => {
      for (const char of data) {
        if (char === '\u0003') { finish(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') { value = [...value].slice(0, -1).join(''); continue; }
        if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', input);
  });
}
try {
  const password = await hiddenInput('New password for ramified (at least 14 characters, hidden): ');
  if (password.length < 14 || password.length > 1024) throw new Error('Use a password between 14 and 1024 characters.');
  if (password !== await hiddenInput('Repeat password (hidden): ')) throw new Error('Passwords did not match.');
  const encoded = await passwordHash(password);
  if (mode === '--local') {
    const folder = path.join(here, '.theorem-local');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'password.json'), JSON.stringify({ ADMIN_PASSWORD_HASH: encoded }), { mode: 0o600 });
    console.log('Local password hash saved in the ignored .theorem-local directory.');
  } else {
    // Fixed arguments only; the secret goes through stdin, never the shell/history.
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['wrangler', 'secret', 'put', 'ADMIN_PASSWORD_HASH', '--config', 'theorem-graph.wrangler.toml'],
      { cwd: here, shell: process.platform === 'win32', stdio: ['pipe', 'inherit', 'inherit'] });
    child.stdin.end(encoded + '\n');
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    if (code !== 0) throw new Error('Cloudflare did not accept the password secret.');
    console.log('Cloud password configured. Existing sessions expire when the password changes.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
