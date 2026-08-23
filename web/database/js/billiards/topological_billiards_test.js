'use strict';

const assert = require('assert');
const fs = require('fs');
const M = require('./topological_billiards_math.js');
const P = require('./topological_billiards_physics.js');
const R = require('./topological_billiards_renderer.js');
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

function pointEdgeDistance(point, frame) {
  return M.dot2(M.sub2(point, frame.start), frame.inward);
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
  const native = fs.readFileSync(require.resolve('./topological_billiards_native.js'), 'utf8');
  const renderer = fs.readFileSync(require.resolve('./topological_billiards_renderer.js'), 'utf8');
  assert.ok(html.includes('value="billiards"'));
  assert.ok(html.includes('data-i18n="games.billiards">Billiard</option>'));
  assert.ok(!html.includes('Topological Billiards'));
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
  assert.ok(setup.includes('topological_billiards_simulation_worker.js'));
  assert.ok(setup.includes('BILLIARDS_FALLBACK_FRAME_BUDGET_MS'));
  assert.ok(setup.includes('BILLIARDS_SQUARE_BOARD_SIZE = 4'));
  assert.ok(setup.includes('BILLIARDS_RECTANGLE_ROWS = 3'));
  assert.ok(setup.includes('BILLIARDS_RECTANGLE_COLS = 5'));
  assert.ok(html.includes('id="boundary-glue-rows" type="number" min="2" max="25" step="1" value="3"'));
  assert.ok(html.includes('id="boundary-glue-cols" type="number" min="2" max="25" step="1" value="5"'));
  assert.ok(!html.includes('topological_billiards_game.js'));
  assert.ok(setup.includes("BILLIARDS: 'billiards'"));
  assert.ok(setup.includes('orderedModes.push(GAME_MODES.BILLIARDS)'));
  assert.ok(setup.includes('billiardsTable ? 1.0015 : 0.96'));
  assert.ok(setup.includes('selectNextMissingNumberedBall'));
  assert.ok(setup.includes('renderer.paletteBallSprite(ball, size - 8)'));
  assert.ok(renderer.includes('function numberedBallSprite'));
  assert.ok(native.includes("const fixedLabel = state.phase === 'setup'"));
  assert.ok(native.includes('showNumberPatch: !fixedLabel'));
  assert.ok(!setup.includes('togglePocket(game, local.tileIndex, local.position, true)'));
}

function testPaletteLabelsAreCenteredAndUpright() {
  class FakeContext {
    constructor(canvas) {
      this.canvas = canvas;
      this.operations = [];
    }

    beginPath() {}
    arc() {}
    fill() {}
    fillRect() {}
    lineTo() {}
    moveTo() {}
    restore() {}
    save() {}
    stroke() {}
    createImageData(width, height) {
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    }
    getImageData(x, y, width, height) {
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    }
    putImageData() {}
    fillText(text, x, y) {
      this.operations.push({ kind: 'text', text, x, y, font: this.font });
    }
    rotate(angle) { this.operations.push({ kind: 'rotate', angle }); }
    scale(x, y) { this.operations.push({ kind: 'scale', x, y }); }
    transform(a, b, c, d, e, f) { this.operations.push({ kind: 'transform', a, b, c, d, e, f }); }
    setTransform(a, b, c, d, e, f) { this.operations.push({ kind: 'setTransform', a, b, c, d, e, f }); }
  }

  class FakeCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.context = new FakeContext(this);
    }

    getContext() {
      return this.context;
    }
  }

  const originalOffscreenCanvas = global.OffscreenCanvas;
  global.OffscreenCanvas = FakeCanvas;
  try {
    assert.strictEqual(R.ballLabel({ kind: 'cue', number: 0 }), '0');
    assert.strictEqual(R.ballLabel({ kind: 'target', number: 15 }), '15');
    const texture = R.makeTexture({ kind: 'cue', number: 0, color: '#f7f4e8' }, false);
    assert.strictEqual(texture.canvas.context.operations.find((entry) => entry.kind === 'text').text, '0');

    const fontSizes = new Map();
    [0, 1, 6, 9, 10, 15].forEach((number) => {
      const kind = number === 0 ? 'cue' : 'target';
      const sprite = R.paletteBallSprite({ kind, number, color: N.ballColor(kind, number) }, 64);
      const operations = sprite.context.operations;
      const labels = operations.filter((entry) => entry.kind === 'text');
      assert.strictEqual(labels.length, 1, `palette ball ${number} has one fixed label`);
      assert.strictEqual(labels[0].text, String(number));
      near(labels[0].x, 32, 1e-12, `palette ball ${number} label x`);
      near(labels[0].y, 32, 1e-12, `palette ball ${number} label y`);
      assert.ok(!operations.some((entry) => ['rotate', 'scale', 'transform', 'setTransform'].includes(entry.kind)));
      fontSizes.set(number, Number.parseFloat(labels[0].font.match(/([\d.]+)px/)[1]));
    });
    assert.ok(fontSizes.get(10) < fontSizes.get(9), 'two-digit labels use a smaller fitting font');

    [
      M.quaternion(),
      M.quaternionFromAxisAngle({ x: 1, y: 2, z: 3 }, 1.7),
      M.quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI)
    ].forEach((orientation, index) => {
      const sprite = R.numberedBallSprite({ kind: 'target', number: 12, color: N.ballColor('target', 12) }, orientation, 64);
      const operations = sprite.context.operations;
      const label = operations.find((entry) => entry.kind === 'text');
      assert.strictEqual(label.text, '12');
      near(label.x, 32, 1e-12, `board label ${index} x`);
      near(label.y, 32, 1e-12, `board label ${index} y`);
      assert.ok(!operations.some((entry) => ['rotate', 'scale', 'transform', 'setTransform'].includes(entry.kind)));
    });
  } finally {
    if (originalOffscreenCanvas === undefined) delete global.OffscreenCanvas;
    else global.OffscreenCanvas = originalOffscreenCanvas;
  }
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
  assert.strictEqual(squareState.pockets.length, 4, 'only the four outer corners receive default pockets');
  assert.ok(squareState.pockets.every((pocket) => squareState.atlas.vertexClasses[pocket.classIndex].singular));
  assert.ok(squareState.pockets.every((pocket) => (
    Math.abs(squareState.atlas.vertexClasses[pocket.classIndex].coneAngle - Math.PI) > 1e-7
  )), 'smooth 180-degree boundary vertices do not receive automatic pockets');

  const rectangleState = N.createState({ ...squarePreset, id: 'native-rectangle-pockets', rows: 3, cols: 5 });
  assert.strictEqual(rectangleState.pockets.length, 4, 'the default 3x5 rectangle has corner pockets only');
  rectangleState.pockets.forEach((pocket) => {
    near(rectangleState.atlas.vertexClasses[pocket.classIndex].coneAngle, Math.PI / 2);
  });

  const explicitPiState = N.createState({
    ...squarePreset,
    billiards: { pockets: [{ id: 'smooth-boundary', vertex: { row: 1, col: 1, corner: 'NE' } }] }
  });
  assert.strictEqual(explicitPiState.pockets.length, 1, 'explicit pi-angle pockets remain valid');
  near(explicitPiState.atlas.vertexClasses[explicitPiState.pockets[0].classIndex].coneAngle, Math.PI);

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
  near(added.state.atlas.vertexClasses[added.state.pockets[0].classIndex].coneAngle, Math.PI);
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

  const pocketState = N.createState({
    ...squarePreset,
    id: 'native-pocket-aim',
    rows: 1,
    cols: 1,
    billiards: {
      ballRadius: 0.1,
      pockets: [{ id: 'corner', vertex: { row: 1, col: 1, corner: 'NE' } }],
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }]
    }
  });
  const pocketTrace = N.traceAim(pocketState, { x: 1, y: -1 });
  assert.strictEqual(pocketTrace.termination, 'pocket');
  assert.strictEqual(pocketTrace.contactedPocket.id, 'corner');
  assert.strictEqual(pocketTrace.contactedBall, null);
  near(pocketTrace.contactedPocket.captureRadius, 0.32, 1e-9, 'guide uses the physical pocket capture radius');
  assert.ok(pocketTrace.segments[0].to.x < 0.4, 'pocket capture precedes the physical wall stop');

  const vertexGuideState = N.createState({
    ...squarePreset,
    id: 'native-vertex-guide-images',
    rows: 2,
    cols: 2,
    billiards: { pockets: [] }
  });
  const guideImages = N.nearbyImages({
    tileIndex: 0,
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    orientation: N.defaultBallOrientation()
  }, vertexGuideState.atlas, {
    padding: 0.1,
    maxDepth: 3,
    onlyIntersecting: true,
    minimal: true
  });
  assert.deepStrictEqual(
    Array.from(new Set(guideImages.map((image) => image.tileIndex))).sort((a, b) => a - b),
    [0, 1, 2, 3],
    'a guide circle at a regular vertex is represented in all four incident tiles'
  );

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

function testNativeCachedChartsAndChunkedSimulation() {
  const preset = {
    id: 'native-chunked-shot',
    label: 'Native chunked shot',
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
        { id: '1', kind: 'target', number: 1, at: { row: 1, col: 2, x: 0.1, y: 0 } }
      ],
      parameters: {
        maxShotSeconds: 0.5,
        localCoverDepth: 3,
        clothFriction: 0,
        rollingResistance: 0,
        spinResistance: 0,
        restitution: 1
      }
    }
  };
  const state = N.begin(N.createState(preset)).state;
  const cue = state.balls.find((ball) => ball.kind === 'cue');
  const firstImages = N.nearbyImages(cue, state.atlas, { maxDepth: 3, onlyIntersecting: false, minimal: true });
  const cacheSize = state.atlas.chartTransformCache.size;
  const secondImages = N.nearbyImages(cue, state.atlas, { maxDepth: 3, onlyIntersecting: false, minimal: true });
  assert.deepStrictEqual(secondImages, firstImages, 'cached atlas charts preserve exact image transforms');
  assert.strictEqual(state.atlas.chartTransformCache.size, cacheSize, 'repeated image lookup reuses the cached chart');

  const aim = { x: 1, y: 0 };
  const contact = { x: 0, y: 0 };
  const expected = N.resolveShot(state, aim, 0.5, contact, { collectTrajectory: true });
  assert.ok(expected.state.balls.find((ball) => ball.id === '1').position.x > 0.2, 'broad phase retains direct-seam collision transfer');
  assert.strictEqual(expected.simulationSteps, 120);
  [1, 7, 64].forEach((chunkSize) => {
    const simulation = N.createShotSimulation(state, aim, 0.5, contact, { collectTrajectory: true });
    while (!simulation.done) N.advanceShotSimulation(simulation, chunkSize);
    assert.deepStrictEqual(
      N.shotSimulationResult(simulation),
      expected,
      `chunk size ${chunkSize} preserves deterministic state and trajectory`
    );
  });

  [false, true].forEach((secondArrowReversed) => {
    const gluedPreset = {
      ...preset,
      id: `native-glued-collision-${secondArrowReversed}`,
      rows: 1,
      cols: 1,
      gluedEdges: [{
        first: { row: 1, col: 1, dir: 'E' },
        second: { row: 1, col: 1, dir: 'W' },
        firstArrowReversed: false,
        secondArrowReversed
      }],
      billiards: {
        ...preset.billiards,
        ballRadius: 0.08,
        balls: [
          { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0.3, y: 0.12 } },
          { id: '1', kind: 'target', number: 1, at: { row: 1, col: 1, x: -0.3, y: secondArrowReversed ? 0.12 : -0.12 } }
        ],
        parameters: { ...preset.billiards.parameters, maxShotSeconds: 0.2 }
      }
    };
    const gluedState = N.begin(N.createState(gluedPreset)).state;
    const gluedResult = N.resolveShot(gluedState, aim, 0.5, contact);
    const gluedTarget = gluedResult.state.balls.find((ball) => ball.id === '1');
    assert.ok(gluedTarget.position.x > -0.2, `collision crosses ${secondArrowReversed ? 'preserving' : 'reflected'} glue`);
  });

  const hexPreset = {
    ...preset,
    id: 'native-hex-collision',
    lattice: 'hexagonal',
    billiards: {
      ...preset.billiards,
      parameters: { ...preset.billiards.parameters, maxShotSeconds: 0.8 }
    }
  };
  const hexState = N.begin(N.createState(hexPreset)).state;
  const hexResult = N.resolveShot(hexState, aim, 0.5, contact);
  assert.ok(hexResult.state.balls.find((ball) => ball.id === '1').position.x > 0.2, 'broad phase retains hex seam collision transfer');

  const rollingPreset = {
    ...preset,
    id: 'native-visible-rolling-spin',
    rows: 1,
    cols: 4,
    billiards: {
      ballRadius: 0.12,
      pockets: [],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 1, col: 2, x: 0, y: 0 } }
      ],
      parameters: { maxShotSeconds: 1 }
    }
  };
  const rollingState = N.begin(N.createState(rollingPreset)).state;
  const rollingResult = N.resolveShot(rollingState, aim, 0.7, contact, { collectTrajectory: true });
  const patchFacing = rollingResult.trajectory.map((frame) => (
    M.rotateVector3(frame[1].orientation, { x: 1, y: 0, z: 0 }).z
  ));
  assert.ok(
    rollingResult.trajectory.some((frame) => Math.abs(frame[1].angularVelocity.y) > 0.1),
    'a struck numbered ball retains rolling angular velocity while translating'
  );
  assert.ok(Math.min(...patchFacing) < 0.5, 'the numbered texture patch visibly rotates away from the viewer');
}

function testNativeSeamConditionedGlueImages() {
  const preset = {
    id: 'native-nonparallel-image-regression',
    label: 'Native nonparallel image regression',
    lattice: 'square',
    rows: 2,
    cols: 2,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [{
      first: { row: 1, col: 1, dir: 'N' },
      second: { row: 1, col: 1, dir: 'W' },
      firstArrowReversed: false,
      secondArrowReversed: false
    }],
    billiards: { ballRadius: 0.12, pockets: [] }
  };
  const state = N.createState(preset);
  const makeBall = (position) => ({
    tileIndex: 0,
    position,
    velocity: { x: 0, y: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    orientation: N.defaultBallOrientation(),
    radius: 0.12
  });
  const imagesFor = (position) => N.nearbyImages(makeBall(position), state.atlas, {
    padding: 0.12,
    maxDepth: 4,
    onlyIntersecting: true,
    minimal: true
  });

  assert.deepStrictEqual(imagesFor({ x: 0, y: 0.4 }).map((image) => image.tileIndex), [0, 2]);
  assert.deepStrictEqual(imagesFor({ x: 0.4, y: 0 }).map((image) => image.tileIndex), [0, 1]);
  const cornerImages = imagesFor({ x: 0.4, y: 0.4 });
  assert.deepStrictEqual(cornerImages.map((image) => image.tileIndex), [0, 1, 2, 3]);
  assert.strictEqual(new Set(cornerImages.map((image) => (
    `${image.tileIndex}:${image.position.x.toFixed(7)}:${image.position.y.toFixed(7)}`
  ))).size, cornerImages.length, 'visible representatives contain no coincident duplicates');

  const rawImages = N.nearbyImages(makeBall({ x: 0, y: 0.4 }), state.atlas, {
    maxDepth: 4,
    onlyIntersecting: false,
    minimal: true
  });
  assert.ok(rawImages.some((image) => image.path === '2.2.0'), 'raw diagnostics retain cached nonlocal charts');
  assert.ok(!imagesFor({ x: 0, y: 0.4 }).some((image) => image.path === '2.2.0'), 'rendered images require seam-connected paths');

  [
    { lattice: 'square', firstDir: 'N', secondDir: 'W' },
    { lattice: 'hexagonal', firstDir: 'E', secondDir: 'NW' }
  ].forEach((spec) => {
    [false, true].forEach((secondArrowReversed) => {
      const glueState = N.createState({
        ...preset,
        id: `${spec.lattice}-${secondArrowReversed ? 'rotated' : 'reflected'}-glue`,
        lattice: spec.lattice,
        rows: 1,
        cols: 1,
        gluedEdges: [{
          first: { row: 1, col: 1, dir: spec.firstDir },
          second: { row: 1, col: 1, dir: spec.secondDir },
          firstArrowReversed: false,
          secondArrowReversed
        }]
      });
      const tile = glueState.atlas.tiles[0];
      const sourceDir = glueState.atlas.info.dirNames.indexOf(spec.firstDir);
      const destinationDir = glueState.atlas.info.dirNames.indexOf(spec.secondDir);
      const sourceFrame = tile.frames[sourceDir];
      const destinationFrame = tile.frames[destinationDir];
      const transition = tile.transitions[sourceDir];
      const expectedStart = secondArrowReversed ? destinationFrame.end : destinationFrame.start;
      const expectedEnd = secondArrowReversed ? destinationFrame.start : destinationFrame.end;
      const mappedStart = M.applyAffine(transition.transform, sourceFrame.start);
      const mappedEnd = M.applyAffine(transition.transform, sourceFrame.end);
      near(mappedStart.x, expectedStart.x, 1e-7, `${spec.lattice} glue start x`);
      near(mappedStart.y, expectedStart.y, 1e-7, `${spec.lattice} glue start y`);
      near(mappedEnd.x, expectedEnd.x, 1e-7, `${spec.lattice} glue end x`);
      near(mappedEnd.y, expectedEnd.y, 1e-7, `${spec.lattice} glue end y`);

      const sourceMidpoint = M.scale2(M.add2(sourceFrame.start, sourceFrame.end), 0.5);
      const acrossSource = M.add2(sourceMidpoint, M.scale2(sourceFrame.outward, 0.05));
      const insideDestination = M.applyAffine(transition.transform, acrossSource);
      near(pointEdgeDistance(insideDestination, destinationFrame), 0.05, 1e-7, `${spec.lattice} glue signed distance`);
      const roundTrip = M.applyAffine(transition.inverseTransform, insideDestination);
      near(roundTrip.x, acrossSource.x, 1e-7, `${spec.lattice} glue inverse x`);
      near(roundTrip.y, acrossSource.y, 1e-7, `${spec.lattice} glue inverse y`);

      const center = M.add2(sourceMidpoint, M.scale2(sourceFrame.inward, 0.05));
      const seamImages = N.nearbyImages(makeBall(center), glueState.atlas, {
        padding: 0.12,
        maxDepth: 3,
        onlyIntersecting: true,
        minimal: true
      });
      assert.strictEqual(seamImages.length, 2, `${spec.lattice} nonparallel glue has two complementary pieces`);
    });
  });
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
  testPaletteLabelsAreCenteredAndUpright();
  testNativeAtlasesAndPocketDefaults();
  testNativeStatusRoundTrip();
  testNativeSetupPaletteModelAndPocketToggle();
  testNativeBallAppearanceRoundTripsCanonically();
  testNativeBeginnerAimTracing();
  testNativeCachedChartsAndChunkedSimulation();
  testNativeSeamConditionedGlueImages();
  testControllerStatusAndRecordIntegration();
  testPageIntegration();
  console.log('topological_billiards_test: all tests passed');
}

run();
