/* global importScripts, BackgroundHomology */
'use strict';

importScripts('background_homology.js?v=20260821-2');

self.onmessage = (event) => {
  const message = event && event.data ? event.data : {};
  try {
    const analysis = self.BackgroundHomology.analyze(message.snapshot);
    self.postMessage({ id: message.id, ok: true, analysis });
  } catch (error) {
    self.postMessage({ id: message.id, ok: false, error: error && error.message ? error.message : 'homology calculation failed' });
  }
};
