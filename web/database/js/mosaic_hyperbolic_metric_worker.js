'use strict';

importScripts('mosaic_hyperbolic_metric.js?v=20260909-1');

self.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.type !== 'solve') return;
  const requestId = message.requestId;
  try {
    const result = self.MosaicHyperbolicMetric.solve(message.surface, message.options || {});
    result.topologyKey = String(message.topologyKey || '');
    self.postMessage({ type: 'result', requestId, result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      topologyKey: String(message.topologyKey || ''),
      message: error && error.message ? error.message : String(error)
    });
  }
});
