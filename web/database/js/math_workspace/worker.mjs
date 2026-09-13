import { execute } from './kernel.mjs?v=20260913-2';
self.onmessage = async ({ data: { operation, args } }) => {
  try { self.postMessage({ value: await execute(operation, args) }); }
  catch (e) { self.postMessage({ error: { message: e.message, name: e.name } }); }
};
