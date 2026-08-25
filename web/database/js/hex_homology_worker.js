/* global importScripts, TopologicalHex */
'use strict';

importScripts('background_homology.js?v=20260824-1', 'hex_homology_game.js?v=20260825-2');

self.onmessage = (event) => {
  const message = event && event.data ? event.data : {};
  try {
    if (!self.TopologicalHex) throw new Error('The Hex homology engine is unavailable.');
    const topology = self.TopologicalHex.buildTopology(message.preset, message.removed || []);
    self.postMessage({ id: message.id, ok: true, topology });
  } catch (error) {
    self.postMessage({
      id: message.id,
      ok: false,
      error: error && error.message ? error.message : 'Hex homology calculation failed'
    });
  }
};
