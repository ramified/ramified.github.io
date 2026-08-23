'use strict';

importScripts(
  './topological_billiards_math.js?v=20260823-1',
  './topological_billiards_physics.js?v=20260823-1',
  './topological_billiards_native.js?v=20260823-9'
);

self.addEventListener('message', (event) => {
  const payload = event && event.data && typeof event.data === 'object' ? event.data : {};
  const id = payload.id;
  const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  try {
    const engine = self.TopologicalBilliardsNative;
    if (!engine) throw new Error('Billiards simulation engine is unavailable.');
    const state = engine.stateFromExport(payload.preset, payload.state);
    const result = engine.resolveShot(state, payload.aim, payload.power, payload.contact, {
      shooter: payload.shooter,
      collectTrajectory: payload.collectTrajectory !== false
    });
    const finishedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    self.postMessage({
      id,
      ok: true,
      changed: !!result.changed,
      state: result.changed ? engine.stateExport(result.state) : payload.state,
      shot: result.shot || null,
      trajectory: Array.isArray(result.trajectory) ? result.trajectory : [],
      message: result.message || '',
      simulationSteps: Math.max(0, Number(result.simulationSteps) || 0),
      elapsedMs: Math.max(0, finishedAt - startedAt)
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error && error.message ? error.message : String(error || 'Billiards simulation failed.')
    });
  }
});
