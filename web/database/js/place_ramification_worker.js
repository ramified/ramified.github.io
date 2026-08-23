'use strict';

importScripts('place_ramification_engine.js?v=20260823-1');

self.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.type !== 'compute') return;
  try {
    const result = self.RamificationLocalEngine.compute(message.request);
    self.postMessage({ type: 'result', requestId: message.requestId, result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: message.requestId,
      error: {
        code: error.code || 'local-engine-error',
        message: error.message || 'The local ramification computation failed.'
      }
    });
  }
});
