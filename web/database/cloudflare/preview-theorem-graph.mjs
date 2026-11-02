// A complete local preview: the same Worker/API, with an isolated memory database.
// It never reads production credentials or writes to the production database.
import { randomBytes } from 'node:crypto';
import { passwordHash } from './theorem-graph.worker.mjs';
import { startLocalServer } from './theorem-graph-local-server.mjs';

await import('./build-theorem-graph-assets.mjs');
const password = 'preview-' + randomBytes(12).toString('base64url');
const service = await startLocalServer({ memory: true, password: await passwordHash(password) });
console.log(`Preview: ${service.origin}/theorem_graph_calculator.html`);
console.log('Username: ramified');
console.log(`Local test password: ${password}`);
console.log('Use Import / Export > Import > Sign in to My graphs.');
console.log('Local test data lasts until this preview process stops. Production data is separate.');

const stop = () => service.server.close(() => { service.db.close(); process.exit(0); });
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
