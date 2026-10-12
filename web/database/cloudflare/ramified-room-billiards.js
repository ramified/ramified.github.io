import '../js/billiards/topological_billiards_math.js';
import '../js/billiards/topological_billiards_physics.js';
import '../js/billiards/topological_billiards_native.js';

// The same deterministic engine drives browser playback and server timing.
// No client-supplied animation flag or duration can stop the room clock.
export function resolveRoomShot(snapshot, action) {
  const engine = globalThis.TopologicalBilliardsNative;
  const state = engine.stateFromExport(snapshot.preset, snapshot);
  const result = engine.resolveShot(state, action.aim, action.power, action.contact, { ...action, collectTrajectory: true });
  if (!result.changed) throw new Error('Invalid shot.');
  const exported = engine.stateExport(result.state);
  return {
    snapshot: { ...snapshot, ...exported, billiardsState: exported },
    action: { ...action, ...result.shot, type: 'billiards-shot', animationMs: Math.max(0, (result.trajectory.length - 1) * 1000 / 30) }
  };
}
