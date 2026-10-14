import { execute } from './kernel.mjs';
self.onmessage = async ({ data: { operation, args } }) => {
  try { self.postMessage({ value: await execute(operation, args) }); }
  catch (e) { self.postMessage({ error: { message: e.message, name: e.name } }); }
};
