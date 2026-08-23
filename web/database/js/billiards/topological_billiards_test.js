'use strict';

const assert = require('assert');
const fs = require('fs');
const M = require('./topological_billiards_math.js');
const P = require('./topological_billiards_physics.js');
const N = require('./topological_billiards_native.js');
const Controller = require('../ramified_minigames_setup.js');

function near(actual, expected, tolerance = 1e-7, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, received ${actual}`);
}

function speed(ball) {
  return Math.hypot(ball.velocity.x, ball.velocity.y);
}

function quaternionNorm(ball) {
  const q = ball.orientation;
  return Math.hypot(q.w, q.x, q.y, q.z);
}

function frictionless(extra = {}) {
  return {
    clothFriction: 0,
    rollingResistance: 0,
    spinResistance: 0,
    restitution: 1,
    ...extra
  };
}

function deterministicState(surface, balls, parameters = {}) {
  const geometry = P.createSurface(surface);
  geometry.pockets = [];
  return {
    version: 2,
    surface: geometry,
    balls: balls.map((ball) => P.createBall(ball)),
    phase: 'moving',
    shots: 0,
    score: 0,
    seed: 1,
    simulatedTime: 0,
    lastCollision: null,
    lastCrossings: [],
    warning: '',
    parameters: { ...P.DEFAULT_PARAMETERS, ...parameters }
  };
}

function testOrdinaryMotionAndDeterminism() {
  const spec = {
    surface: 'torus',
    initialBallStates: [{ id: 1, number: 1, x: 0.4, y: 0.31, vx: 0.12, vy: -0.03, radius: 0.02 }],
    dt: 1 / 240,
    numberOfSteps: 240,
    physicsParameters: frictionless()
  };
  const first = P.simulateDeterministic(spec);
  const second = P.simulateDeterministic(spec);
  near(first.balls[0].position.x, 0.52, 1e-9, 'ordinary x');
  near(first.balls[0].position.y, 0.28, 1e-9, 'ordinary y');
  assert.deepStrictEqual(first.balls[0], second.balls[0]);
}

function testTranslationSeamAndFiniteRadiusImage() {
  const surface = P.createSurface('torus');
  const ball = P.createBall({ id: 1, number: 1, x: 0.99, y: 0.31, vx: 0.2, radius: 0.025 });
  const images = P.findNearbyBallImages(ball, surface, { padding: ball.radius, maxDepth: 1 });
  assert.ok(images.some((image) => image.position.x < 0), 'destination image appears before center crossing');
  const beforeSpeed = speed(ball);
  for (let index = 0; index < 30; index += 1) {
    ball.position.x += ball.velocity.x / 240;
    P.canonicalizeBall(ball, surface);
  }
  assert.ok(ball.position.x > 0 && ball.position.x < 0.03);
  near(speed(ball), beforeSpeed, 1e-12, 'translation seam speed');
  assert.strictEqual(ball.crossings, 1);
}

function testRotationalAndOrientationReversingTransport() {
  const quarter = P.createSurface('quarter-turn');
  const rotating = P.createBall({ id: 1, x: 1.01, y: 0.25, vx: 0.4, vy: 0.1, wx: 1, wy: 2, wz: 3 });
  P.canonicalizeBall(rotating, quarter);
  near(rotating.position.x, 0.75);
  near(rotating.position.y, 0.01);
  near(rotating.velocity.x, -0.1);
  near(rotating.velocity.y, 0.4);
  near(rotating.angularVelocity.x, -2);
  near(rotating.angularVelocity.y, 1);
  near(rotating.angularVelocity.z, 3);

  const mobius = P.createSurface('mobius');
  const reversed = P.createBall({ id: 2, x: -0.01, y: 0.2, vx: -0.3, vy: 0.07, wx: 1, wy: 2, wz: 3 });
  P.canonicalizeBall(reversed, mobius);
  near(reversed.position.x, 0.99);
  near(reversed.position.y, 0.42);
  near(reversed.velocity.x, -0.3);
  near(reversed.velocity.y, -0.07);
  near(reversed.angularVelocity.x, 1);
  near(reversed.angularVelocity.y, -2);
  near(reversed.angularVelocity.z, -3);
  near(quaternionNorm(reversed), 1, 1e-12, 'orientation reversing quaternion norm');
  assert.ok(M.affineDeterminant(P.seamForSide(mobius, 'left').transform) < 0);
  const lift = M.liftedMatrix3(P.seamForSide(mobius, 'left').transform);
  const determinant3 = (lift[0][0] * lift[1][1] * lift[2][2]);
  near(determinant3, 1, 1e-12, 'lift is a proper rotation');
}

function testRepeatedTraversalStability() {
  const state = deterministicState('torus', [
    { id: 1, number: 1, x: 0.5, y: 0.31, vx: 1.37, vy: 0.41, wx: -8, wy: 24, wz: 3, radius: 0.018 }
  ], frictionless());
  const initialSpeed = speed(state.balls[0]);
  for (let index = 0; index < 12000; index += 1) P.stepPhysics(state, 1 / 480);
  near(speed(state.balls[0]), initialSpeed, 2e-9, 'speed after repeated seams');
  near(quaternionNorm(state.balls[0]), 1, 2e-12, 'quaternion after repeated seams');
  assert.ok(state.balls[0].crossings > 20);
  assert.strictEqual(state.balls.length, 1, 'local images never become physical balls');
}

function testHeadOnCollisionAndConservation() {
  const state = deterministicState('classic', [
    { id: 1, number: 1, x: 0.35, y: 0.31, vx: 0.7, radius: 0.025 },
    { id: 2, number: 2, x: 0.55, y: 0.31, vx: 0, radius: 0.025 }
  ], frictionless());
  const momentumBefore = state.balls.reduce((sum, ball) => sum + ball.mass * ball.velocity.x, 0);
  const energyBefore = state.balls.reduce((sum, ball) => sum + 0.5 * ball.mass * speed(ball) ** 2, 0);
  for (let index = 0; index < 90; index += 1) P.stepPhysics(state, 1 / 240);
  assert.ok(Math.abs(state.balls[0].velocity.x) < 1e-5);
  near(state.balls[1].velocity.x, 0.7, 1e-5, 'head-on velocity transfer');
  const momentumAfter = state.balls.reduce((sum, ball) => sum + ball.mass * ball.velocity.x, 0);
  const energyAfter = state.balls.reduce((sum, ball) => sum + 0.5 * ball.mass * speed(ball) ** 2, 0);
  near(momentumAfter, momentumBefore, 1e-7, 'momentum conservation');
  near(energyAfter, energyBefore, 1e-7, 'energy conservation');
}

function testSeamAndHighSpeedCollision() {
  let state = deterministicState('torus', [
    { id: 1, number: 1, x: 0.08, y: 0.31, vx: -0.6, radius: 0.03 },
    { id: 2, number: 2, x: 0.96, y: 0.31, vx: 0, radius: 0.03 }
  ], frictionless());
  for (let index = 0; index < 40; index += 1) P.stepPhysics(state, 1 / 240);
  assert.ok(state.balls[1].velocity.x < -0.5, 'seam image receives canonical collision impulse');
  assert.ok(Math.abs(state.balls[0].velocity.x) < 0.1);

  state = deterministicState('classic', [
    { id: 1, number: 1, x: 0.18, y: 0.31, vx: 4, radius: 0.025 },
    { id: 2, number: 2, x: 0.72, y: 0.31, vx: 0, radius: 0.025 }
  ], frictionless());
  P.stepPhysics(state, 0.18);
  assert.ok(state.balls[1].velocity.x > 3.9, 'CCD catches collision with no final overlap');
  assert.ok(state.balls[0].position.x < state.balls[1].position.x);
}

function testNoSelfCollisionAndImageIndependence() {
  const state = deterministicState('torus', [
    { id: 1, number: 1, x: 0.01, y: 0.31, vx: 0.2, radius: 0.03 }
  ], frictionless());
  for (let index = 0; index < 500; index += 1) P.stepPhysics(state, 1 / 240);
  near(speed(state.balls[0]), 0.2, 1e-10, 'no self-image impulse');
  assert.strictEqual(state.lastCollision, null);

  const surface = P.createSurface('torus');
  const ball = P.createBall({ id: 2, x: 0.98, y: 0.31, vx: 0.2, vy: 0.1 });
  const image = P.findNearbyBallImages(ball, surface, { point: { x: 0.01, y: 0.31 }, radius: 0.1, maxDepth: 1 })[0];
  const roundTripVelocity = M.applyLinear(image.inverseTransform, image.velocity);
  near(roundTripVelocity.x, ball.velocity.x, 1e-12);
  near(roundTripVelocity.y, ball.velocity.y, 1e-12);
}

function testCueSpinAndSlidingToRolling() {
  const topState = P.createInitialState('classic');
  topState.surface.pockets = [];
  assert.strictEqual(P.applyCueImpulse(topState, { x: 1, y: 0 }, 0.7, { x: 0, y: -0.7 }), true);
  assert.ok(topState.balls[0].angularVelocity.y > 0, 'top contact creates forward spin');

  const drawState = P.createInitialState('classic');
  drawState.surface.pockets = [];
  P.applyCueImpulse(drawState, { x: 1, y: 0 }, 0.7, { x: 0, y: 0.7 });
  assert.ok(drawState.balls[0].angularVelocity.y < 0, 'bottom contact creates draw');

  const sideState = P.createInitialState('classic');
  sideState.surface.pockets = [];
  P.applyCueImpulse(sideState, { x: 1, y: 0 }, 0.7, { x: 0.7, y: 0 });
  assert.ok(Math.abs(sideState.balls[0].angularVelocity.z) > 1, 'side contact creates vertical-axis spin');

  const sliding = P.createBall({ id: 1, x: 0.5, y: 0.31, vx: 0.5, radius: 0.025 });
  const parameters = { ...P.DEFAULT_PARAMETERS, spinResistance: 0 };
  const slip = (ball) => Math.hypot(
    ball.velocity.x - (ball.radius * ball.angularVelocity.y),
    ball.velocity.y + (ball.radius * ball.angularVelocity.x)
  );
  const before = slip(sliding);
  for (let index = 0; index < 400; index += 1) P.applyClothFriction(sliding, 1 / 240, parameters);
  assert.ok(slip(sliding) < before * 0.02, 'contact-point slip converges toward rolling');
}

function testOrientationPersistenceAndSpinThroughGlue() {
  const ball = P.createBall({ id: 1, x: 0.99, y: 0.2, vx: 0.2, wx: 2, wy: 3, wz: 4 });
  const originalOrientation = { ...ball.orientation };
  ball.velocity = { x: 0, y: 0 };
  ball.angularVelocity = { x: 0, y: 0, z: 0 };
  const state = deterministicState('torus', [], frictionless());
  state.balls = [ball];
  P.stepPhysics(state, 1);
  assert.deepStrictEqual(ball.orientation, originalOrientation, 'orientation persists at rest');

  ball.position = { x: -0.01, y: 0.2 };
  ball.angularVelocity = { x: 2, y: 3, z: 4 };
  P.canonicalizeBall(ball, P.createSurface('mobius'));
  near(ball.angularVelocity.x, 2);
  near(ball.angularVelocity.y, -3);
  near(ball.angularVelocity.z, -4);
  near(quaternionNorm(ball), 1, 1e-12);
}

function testPageIntegration() {
  const html = fs.readFileSync(require.resolve('../../ramified_minigames.html'), 'utf8');
  const setup = fs.readFileSync(require.resolve('../ramified_minigames_setup.js'), 'utf8');
  assert.ok(html.includes('value="billiards"'));
  assert.ok(html.includes('id="mosaic-canvas"'));
  assert.ok(!html.includes('id="topological-billiards-canvas"'));
  assert.ok(html.includes('id="billiards-spin-pad"'));
  assert.ok(html.includes('id="billiards-ball-palette"'));
  assert.ok(html.includes('class="tile-palette-grid billiards-ball-palette"'));
  assert.ok(html.includes('.billiards-spin-row[hidden]'));
  assert.ok(html.includes('topological_billiards_math.js'));
  assert.ok(html.includes('topological_billiards_physics.js'));
  assert.ok(html.includes('topological_billiards_renderer.js'));
  assert.ok(html.includes('topological_billiards_native.js'));
  assert.ok(!html.includes('topological_billiards_game.js'));
  assert.ok(setup.includes("BILLIARDS: 'billiards'"));
  assert.ok(setup.includes('orderedModes.push(GAME_MODES.BILLIARDS)'));
  assert.ok(setup.includes('billiardsTable ? 1.0015 : 0.96'));
  assert.ok(setup.includes('selectNextMissingNumberedBall'));
  assert.ok(!setup.includes('togglePocket(game, local.tileIndex, local.position, true)'));
}

function testNativeAtlasesAndPocketDefaults() {
  const squarePreset = {
    id: 'native-square-test',
    label: 'Native square test',
    lattice: 'square',
    rows: 2,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const squareAtlas = N.buildAtlas(squarePreset);
  assert.strictEqual(squareAtlas.tiles.length, 4);
  assert.strictEqual(squareAtlas.tiles[0].transitions[0].kind, 'direct');
  assert.ok(squareAtlas.vertexClasses.some((vertex) => Math.abs(vertex.coneAngle - Math.PI * 2) < 1e-7));
  const squareState = N.createState(squarePreset);
  assert.strictEqual(squareState.balls.length, 0, 'omitted balls open blank setup');
  assert.ok(squareState.pockets.length > 0, 'singular square vertices receive default pockets');
  assert.ok(squareState.pockets.every((pocket) => squareState.atlas.vertexClasses[pocket.classIndex].singular));

  const noPocketState = N.createState({ ...squarePreset, billiards: { pockets: [] } });
  assert.strictEqual(noPocketState.pockets.length, 0, 'explicit empty pockets disable defaults');

  const hexState = N.createState({
    id: 'native-hex-test',
    label: 'Native hex test',
    lattice: 'hexagonal',
    rows: 1,
    cols: 1,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  });
  assert.strictEqual(hexState.atlas.info.shape, 'hex');
  assert.strictEqual(hexState.atlas.vertexClasses.length, 6);
  hexState.atlas.vertexClasses.forEach((vertex) => near(vertex.coneAngle, Math.PI * 2 / 3));
  assert.strictEqual(hexState.pockets.length, 6);
}

function testNativeStatusRoundTrip() {
  const preset = {
    id: 'native-round-trip',
    label: 'Native round trip',
    lattice: 'square',
    rows: 2,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      rules: 'competitive',
      ballRadius: 0.18,
      pocketRadius: 0.31,
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 2, col: 2, x: 0, y: 0 } }
      ]
    }
  };
  const begun = N.begin(N.createState(preset));
  assert.strictEqual(begun.changed, true);
  const exported = N.stateExport(begun.state);
  const restored = N.stateFromExport(preset, exported);
  assert.strictEqual(restored.rules, 'competitive');
  near(restored.ballRadius, 0.18);
  near(restored.pocketRadius, 0.31);
  assert.strictEqual(restored.phase, 'ready');
  assert.deepStrictEqual(N.stateExport(restored), exported);
}

function testNativeSetupPaletteModelAndPocketToggle() {
  const preset = {
    id: 'native-palette-test',
    label: 'Native palette test',
    lattice: 'square',
    rows: 2,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: { ballRadius: 0.1, pockets: [] }
  };
  let state = N.createState(preset);
  let result = N.placeBall(state, { kind: 'cue', number: 0 }, 0, { x: 0, y: 0 });
  assert.strictEqual(result.changed, true);
  state = result.state;
  assert.strictEqual(state.balls[0].color, '#f7f4e9');
  assert.strictEqual(N.placeBall(state, 'cue', 1, { x: 0, y: 0 }).changed, false, 'cue is unique');

  result = N.placeBall(state, { kind: 'target', number: 2 }, 1, { x: 0, y: 0 });
  assert.strictEqual(result.changed, true);
  state = result.state;
  assert.strictEqual(state.balls.find((ball) => ball.number === 2).color, P.BALL_COLORS[1]);
  assert.strictEqual(N.placeBall(state, { kind: 'target', number: 2 }, 2, { x: 0, y: 0 }).changed, false, 'numbered balls are unique');

  result = N.placeBall(state, 'target', 2, { x: 0, y: 0 });
  assert.strictEqual(result.changed, true);
  state = result.state;
  assert.strictEqual(state.balls.find((ball) => ball.tileIndex === 2).number, 1, 'legacy target chooses the lowest missing number');
  assert.strictEqual(state.nextTargetNumber, 3);

  result = N.eraseAt(state, 1, { x: 0, y: 0 });
  assert.strictEqual(result.changed, true);
  state = result.state;
  assert.strictEqual(state.nextTargetNumber, 2, 'erasing makes that number available again');

  const added = N.togglePocket(state, 0, { x: 0.5, y: -0.5 });
  assert.strictEqual(added.changed, true);
  assert.strictEqual(added.state.pockets.length, 1);
  const removedViaOtherRepresentative = N.togglePocket(added.state, 1, { x: -0.5, y: -0.5 });
  assert.strictEqual(removedViaOtherRepresentative.changed, true);
  assert.strictEqual(removedViaOtherRepresentative.state.pockets.length, 0, 'any quotient representative removes the canonical pocket');
}

function testNativeBallAppearanceRoundTripsCanonically() {
  const preset = {
    id: 'native-color-round-trip',
    label: 'Native color round trip',
    lattice: 'square',
    rows: 1,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      ballRadius: 0.1,
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: 'legacy-21', kind: 'target', number: 21, color: '#000000', at: { row: 1, col: 2, x: 0, y: 0 } }
      ]
    }
  };
  const state = N.createState(preset);
  const target = state.balls.find((ball) => ball.kind === 'target');
  assert.strictEqual(target.number, 21, 'positive imported numbers outside the palette are preserved');
  assert.strictEqual(target.color, P.BALL_COLORS[(21 - 1) % P.BALL_COLORS.length], 'appearance is derived from number');
  const status = N.stateExport(state);
  assert.strictEqual(status.balls[1].color, target.color);
  assert.strictEqual(N.stateFromExport(preset, status).balls[1].color, target.color);
  const block = N.presetBlockFromState(state);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(block.balls[1], 'color'), false, 'preset records remain number-canonical');
}

function testNativeBeginnerAimTracing() {
  const squarePreset = {
    id: 'native-square-aim',
    label: 'Native square aim',
    lattice: 'square',
    rows: 1,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      ballRadius: 0.1,
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 1, col: 2, x: 0.2, y: 0 } }
      ]
    }
  };
  const squareTrace = N.traceAim(N.createState(squarePreset), { x: 1, y: 0 });
  assert.strictEqual(squareTrace.termination, 'ball');
  assert.strictEqual(squareTrace.contactedBall.ballId, '1');
  assert.strictEqual(squareTrace.segments.length, 2, 'guide is split at the direct tile seam');
  assert.deepStrictEqual(squareTrace.segments.map((segment) => segment.tileIndex), [0, 1]);
  near(squareTrace.contactedBall.cuePosition.x, 0, 2e-7, 'combined-radius collision point');

  const wallState = N.createState({
    ...squarePreset,
    id: 'native-wall-aim',
    cols: 1,
    billiards: {
      ballRadius: 0.1,
      pockets: [],
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }]
    }
  });
  const wallTrace = N.traceAim(wallState, { x: 1, y: 0 });
  assert.strictEqual(wallTrace.termination, 'wall');
  near(wallTrace.segments[0].to.x, 0.4, 1e-7, 'wall trace accounts for cue radius');

  const hexTrace = N.traceAim(N.createState({
    ...squarePreset,
    id: 'native-hex-aim',
    lattice: 'hexagonal'
  }), { x: 1, y: 0 });
  assert.strictEqual(hexTrace.termination, 'ball');
  assert.strictEqual(hexTrace.contactedBall.ballId, '1');
  assert.deepStrictEqual(hexTrace.segments.map((segment) => segment.tileIndex), [0, 1]);

  const reflectedTrace = N.traceAim(N.createState({
    id: 'native-reflected-aim',
    label: 'Native reflected aim',
    lattice: 'square',
    rows: 1,
    cols: 1,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [{
      first: { row: 1, col: 1, dir: 'E' },
      second: { row: 1, col: 1, dir: 'W' },
      firstArrowReversed: false,
      secondArrowReversed: false
    }],
    billiards: {
      ballRadius: 0.1,
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0.15 } },
        { id: '1', kind: 'target', number: 1, at: { row: 1, col: 1, x: -0.1, y: -0.15 } }
      ]
    }
  }), { x: 1, y: 0 });
  assert.strictEqual(reflectedTrace.termination, 'ball');
  assert.strictEqual(reflectedTrace.transitions, 1);
  near(reflectedTrace.contactedBall.position.y, -0.15, 1e-7, 'reflected glue transports the guide');

  const closedState = N.createState({
    id: 'native-closed-aim',
    label: 'Native closed aim',
    lattice: 'square',
    rows: 1,
    cols: 1,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: 'E' }, second: { row: 1, col: 1, dir: 'W' } },
      { first: { row: 1, col: 1, dir: 'N' }, second: { row: 1, col: 1, dir: 'S' } }
    ],
    billiards: {
      ballRadius: 0.1,
      pockets: [],
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }]
    }
  });
  const closedTrace = N.traceAim(closedState, { x: 1, y: 0 });
  assert.ok(['loop', 'max-transitions'].includes(closedTrace.termination));
  assert.ok(closedTrace.transitions <= 12);
  assert.ok(closedTrace.segments.length <= 13);
}

function testControllerStatusAndRecordIntegration() {
  const preset = {
    id: 'controller-billiards-round-trip',
    label: 'Controller Billiards round trip',
    lattice: 'square',
    rows: 2,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      rules: 'competitive',
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 2, col: 2, x: 0, y: 0 } }
      ]
    }
  };
  const state = Controller.createBilliardsState(preset);
  assert.strictEqual(Controller.isBilliardsGame(state), true);
  const begun = N.begin(state).state;
  const status = {
    gameMode: 'billiards',
    preset,
    ...N.stateExport(begun),
    settings: { displayStyle: 'billiards-table' }
  };
  const statusImport = Controller.gameStateFromDebugImportPayload(status);
  assert.strictEqual(statusImport.state.rules, 'competitive');
  assert.strictEqual(statusImport.state.phase, 'ready');
  assert.strictEqual(statusImport.displayStyle, 'billiards-table');

  const recordImport = Controller.gameStateFromRecordImportPayload({
    kind: 'ramified-minigame-record',
    version: 1,
    gameMode: 'billiards',
    preset,
    settings: { rules: 'competitive', displayStyle: 'billiards-table' },
    moves: []
  });
  assert.strictEqual(recordImport.state.phase, 'ready');
  assert.strictEqual(recordImport.state.recordMoves.length, 0);
  assert.strictEqual(Controller.stateSummary(recordImport.state).gameMode, 'billiards');
}

function run() {
  testOrdinaryMotionAndDeterminism();
  testTranslationSeamAndFiniteRadiusImage();
  testRotationalAndOrientationReversingTransport();
  testRepeatedTraversalStability();
  testHeadOnCollisionAndConservation();
  testSeamAndHighSpeedCollision();
  testNoSelfCollisionAndImageIndependence();
  testCueSpinAndSlidingToRolling();
  testOrientationPersistenceAndSpinThroughGlue();
  testNativeAtlasesAndPocketDefaults();
  testNativeStatusRoundTrip();
  testNativeSetupPaletteModelAndPocketToggle();
  testNativeBallAppearanceRoundTripsCanonically();
  testNativeBeginnerAimTracing();
  testControllerStatusAndRecordIntegration();
  testPageIntegration();
  console.log('topological_billiards_test: all tests passed');
}

run();
