'use strict';

importScripts(
  './topological_billiards_math.js?v=20260823-1',
  './topological_billiards_physics.js?v=20260823-1',
  './topological_billiards_native.js?v=20260906-1'
);

const activeResearchShots = new Map();

function shotOptions(payload) {
  return {
    shooter: payload.shooter,
    collectTrajectory: payload.collectTrajectory !== false,
    cueSpeedMps: payload.cueSpeedMps,
    tipOffset: payload.tipOffset || payload.contact,
    elevationRad: payload.elevationRad,
    cueProfileId: payload.cueProfileId,
    tipProfileId: payload.tipProfileId,
    strokePresetId: payload.strokePresetId
  };
}

function postResult(engine, id, payload, result, startedAt) {
  const finishedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  self.postMessage({
    id,
    type: 'result',
    ok: true,
    changed: !!result.changed,
    state: result.changed ? engine.stateExport(result.state) : payload.state,
    shot: result.shot || null,
    trajectory: Array.isArray(result.trajectory) ? result.trajectory : [],
    telemetry: result.telemetry || null,
    message: result.message || '',
    simulationSteps: Math.max(0, Number(result.simulationSteps) || 0),
    elapsedMs: Math.max(0, finishedAt - startedAt)
  });
}

function runResearchShot(engine, state, payload, id, startedAt) {
  const simulation = engine.createShotSimulation(
    state,
    payload.aim,
    payload.power,
    payload.contact,
    shotOptions(payload)
  );
  const token = { cancelled: false, simulation };
  activeResearchShots.set(id, token);
  const runChunk = () => {
    if (token.cancelled) {
      activeResearchShots.delete(id);
      self.postMessage({ id, type: 'cancelled', ok: false, cancelled: true });
      return;
    }
    engine.advanceShotSimulation(simulation, 96);
    const progress = engine.shotSimulationProgress(simulation);
    self.postMessage({ id, type: 'progress', ok: true, ...progress });
    if (simulation.done) {
      activeResearchShots.delete(id);
      postResult(engine, id, payload, engine.shotSimulationResult(simulation), startedAt);
      return;
    }
    setTimeout(runChunk, 0);
  };
  runChunk();
}

self.addEventListener('message', (event) => {
  const payload = event && event.data && typeof event.data === 'object' ? event.data : {};
  const id = payload.id;
  if (payload.type === 'cancel') {
    const active = activeResearchShots.get(id);
    if (active) active.cancelled = true;
    return;
  }
  const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  try {
    const engine = self.TopologicalBilliardsNative;
    if (!engine) throw new Error('Billiards simulation engine is unavailable.');
    const state = engine.stateFromExport(payload.preset, payload.state);
    if (state.deterministic && state.deterministic.physicsProfile === 'research') {
      runResearchShot(engine, state, payload, id, startedAt);
      return;
    }
    const result = engine.resolveShot(state, payload.aim, payload.power, payload.contact, shotOptions(payload));
    postResult(engine, id, payload, result, startedAt);
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      ok: false,
      error: error && error.message ? error.message : String(error || 'Billiards simulation failed.')
    });
  }
});
