const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadBrowserApi() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const sandbox = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    performance: { now: () => 0 }
  };
  vm.runInNewContext(source, sandbox, { filename: 'ramified_minigames_setup.js' });
  return sandbox.window.RamifiedMinigames;
}

const game = loadBrowserApi();
const test = game.__test;

function makeContext() {
  const calls = [];
  const stack = [];
  const target = {
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    font: '',
    dash: [],
    save() {
      stack.push({
        globalAlpha: this.globalAlpha,
        lineWidth: this.lineWidth,
        strokeStyle: this.strokeStyle,
        fillStyle: this.fillStyle,
        font: this.font,
        dash: this.dash.slice()
      });
      calls.push({ method: 'save' });
    },
    restore() {
      Object.assign(this, stack.pop() || {});
      calls.push({ method: 'restore' });
    },
    beginPath() { calls.push({ method: 'beginPath' }); },
    moveTo(...args) { calls.push({ method: 'moveTo', args }); },
    lineTo(...args) { calls.push({ method: 'lineTo', args }); },
    closePath() { calls.push({ method: 'closePath' }); },
    fill() { calls.push({ method: 'fill', alpha: this.globalAlpha, color: this.fillStyle }); },
    stroke() { calls.push({ method: 'stroke', width: this.lineWidth, color: this.strokeStyle, dash: this.dash.slice() }); },
    setLineDash(value) { this.dash = value.slice(); calls.push({ method: 'setLineDash', args: [value.slice()] }); },
    measureText(value) { return { width: String(value).length * 6 }; },
    translate(...args) { calls.push({ method: 'translate', args }); },
    rotate(...args) { calls.push({ method: 'rotate', args }); },
    fillText(...args) { calls.push({ method: 'fillText', args, font: this.font }); }
  };
  const context = new Proxy(target, {
    set(object, property, value) {
      calls.push({ property, value });
      object[property] = value;
      return true;
    }
  });
  return { context, calls };
}

function pair(group, first, second, options = {}) {
  return { group, first, second, ...options };
}

function squarePreset(gluedEdges) {
  return {
    id: 'glue-flap-square-test',
    label: 'glue flap square test',
    lattice: 'square',
    rows: 3,
    cols: 3,
    removedTiles: [],
    cutEdges: [],
    gluedEdges
  };
}

function hexPreset(gluedEdges) {
  return {
    id: 'glue-flap-hex-test',
    label: 'glue flap hex test',
    lattice: 'hexagonal',
    rows: 3,
    cols: 3,
    removedTiles: [],
    cutEdges: [],
    gluedEdges
  };
}

function nearlyEqual(left, right, tolerance = 1e-7) {
  return Math.abs(left - right) <= tolerance;
}

function testGeometryAndContainment() {
  const square = squarePreset([]);
  const squareGeometry = test.buildGeometry(square, 280, 28, 1);
  const edge = { row: 1, col: 3, dir: game.DIRS.E };
  const outward = test.glueFlapGeometry(squareGeometry, square, edge, true);
  const inward = test.glueFlapGeometry(squareGeometry, square, edge, false);
  assert.strictEqual(outward.angle, 45);
  assert.ok(nearlyEqual(outward.depth, outward.length * 0.22));
  assert.ok(nearlyEqual(outward.inset, outward.depth));
  assert.ok(outward.normal.x > 0.999);
  assert.ok(inward.normal.x < -0.999);
  outward.points.forEach((point) => {
    assert.ok(point.x >= 0 && point.x <= squareGeometry.width);
    assert.ok(point.y >= 0 && point.y <= squareGeometry.height);
  });

  const tightGeometry = test.buildGeometry(square, 280, 0, 1);
  const constrained = test.glueFlapGeometry(tightGeometry, square, edge, true);
  assert.ok(constrained.depth < constrained.length * 0.22, 'an edge at the canvas margin is depth-constrained');
  constrained.points.forEach((point) => {
    assert.ok(point.x >= -1e-7 && point.x <= tightGeometry.width + 1e-7);
    assert.ok(point.y >= -1e-7 && point.y <= tightGeometry.height + 1e-7);
  });

  const hex = hexPreset([]);
  const hexGeometry = test.buildGeometry(hex, 320, 28, 1);
  const hexFlap = test.glueFlapGeometry(hexGeometry, hex, { row: 1, col: 2, dir: game.HEX_DIRS.NE }, true);
  assert.strictEqual(hexFlap.angle, 60);
  assert.ok(nearlyEqual(hexFlap.inset, hexFlap.depth / Math.tan(Math.PI / 3)));
}

function testLabelsAndStraightAggregation() {
  const labels = test.glueFlapPairLabels([
    ...Array.from({ length: 28 }, () => ({ group: 91 })),
    { group: -4 },
    { group: 700 }
  ]);
  assert.deepStrictEqual(Array.from(labels.slice(0, 3)), ['1a', '1b', '1c']);
  assert.strictEqual(labels[25], '1z');
  assert.strictEqual(labels[26], '1aa');
  assert.strictEqual(labels[27], '1ab');
  assert.strictEqual(labels[28], '2');
  assert.strictEqual(labels[29], '3');
  assert.strictEqual(test.alphabeticGlueFlapSuffix(51), 'az');

  const pairs = [1, 2].map((row) => pair(
    17,
    { row, col: 3, dir: game.DIRS.E },
    { row, col: 1, dir: game.DIRS.W }
  ));
  const preset = squarePreset(pairs);
  const geometry = test.buildGeometry(preset, 300, 28, 1);
  geometry.cssScale = 2;
  const groups = new Map();
  pairs.forEach((item, pairIndex) => {
    const key = `group:${item.group}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ pair: item, pairIndex });
  });
  const combined = test.straightGlueFlapGroupGeometry(geometry, preset, groups.get('group:17'));
  assert.ok(combined);
  assert.ok(combined.first.length > test.glueFlapGeometry(geometry, preset, pairs[0].first, true).length * 1.8);

  test.setGlueFlapsForTest(true);
  const rendered = makeContext();
  test.drawGlueEdges(rendered.context, geometry, preset, null);
  assert.strictEqual(rendered.calls.filter((call) => call.method === 'stroke').length, 2);
  assert.deepStrictEqual(rendered.calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]), ['1', '1']);
}

function testRenderingDirectionsCutoffAndArrowFallback() {
  const preset = squarePreset([pair(
    8,
    { row: 1, col: 3, dir: game.DIRS.E },
    { row: 1, col: 1, dir: game.DIRS.W },
    { firstArrowReversed: false, secondArrowReversed: true }
  )]);
  const geometry = test.buildGeometry(preset, 300, 28, 1);
  geometry.cssScale = 2;
  test.setGlueFlapsForTest(true);
  const flap = makeContext();
  test.drawGlueEdges(flap.context, geometry, preset, null);
  assert.strictEqual(flap.calls.filter((call) => call.method === 'fill').length, 1, 'only the physical flap is filled');
  assert.strictEqual(flap.calls.filter((call) => call.method === 'stroke' && call.dash.length).length, 1, 'only the target is dashed');
  assert.deepStrictEqual(flap.calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]), ['1', '1']);
  const rotations = flap.calls.filter((call) => call.method === 'rotate').map((call) => call.args[0]);
  assert.strictEqual(rotations.length, 2);
  assert.ok(nearlyEqual(rotations[0], Math.PI / 2));
  assert.ok(nearlyEqual(rotations[1], Math.PI / 2));
  assert.strictEqual(flap.calls.filter((call) => call.method === 'strokeText').length, 0);
  assert.strictEqual(flap.calls.filter((call) => call.property === 'shadowBlur').length, 0);

  geometry.cssScale = 0.4;
  const tiny = makeContext();
  test.drawGlueEdges(tiny.context, geometry, preset, null);
  assert.strictEqual(tiny.calls.filter((call) => call.method === 'fillText').length, 0, 'labels below 10 CSS px are omitted');

  test.setGlueFlapsForTest(false);
  const arrows = makeContext();
  test.drawGlueEdges(arrows.context, geometry, preset, null);
  assert.strictEqual(arrows.calls.filter((call) => call.method === 'setLineDash' && call.args[0].length).length, 0);
  assert.strictEqual(arrows.calls.filter((call) => call.method === 'fillText').length, 0);
  assert.ok(arrows.calls.filter((call) => call.method === 'fill').length >= 2, 'the existing arrowheads remain');
}

function testHoverAndHighlightTiers() {
  const pairs = [
    pair(9, { row: 1, col: 3, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W }),
    pair(9, { row: 1, col: 2, dir: game.DIRS.N }, { row: 3, col: 2, dir: game.DIRS.S }),
    pair(42, { row: 3, col: 3, dir: game.DIRS.E }, { row: 3, col: 1, dir: game.DIRS.W })
  ];
  const preset = squarePreset(pairs);
  const geometry = test.buildGeometry(preset, 300, 28, 1);
  geometry.cssScale = 2;
  const firstFlap = test.glueFlapGeometry(geometry, preset, pairs[0].first, true);
  const hover = game.hoveredGlueBoundaryAtPoint(preset, geometry, firstFlap.labelPoint, { glueFlaps: true });
  assert.strictEqual(hover.pairIndex, 0);
  assert.strictEqual(hover.half, 'first');

  test.setGlueFlapsForTest(true);
  const rendered = makeContext();
  test.drawGlueEdges(rendered.context, geometry, preset, hover);
  const widths = rendered.calls.filter((call) => call.method === 'stroke').map((call) => call.width);
  assert.strictEqual(widths.length, 6);
  assert.ok(nearlyEqual(widths[0], widths[1]));
  assert.ok(nearlyEqual(widths[2] / widths[0], 0.75));
  assert.ok(nearlyEqual(widths[4] / widths[0], 0.55));
  const fills = rendered.calls.filter((call) => call.method === 'fill').map((call) => call.alpha);
  assert.ok(nearlyEqual(fills[0], 0.14 / 0.75));
  assert.ok(nearlyEqual(fills[1], 0.14));
  assert.ok(nearlyEqual(fills[2], 0.14 * 0.55 / 0.75));
  assert.strictEqual(rendered.calls.filter((call) => call.property === 'shadowBlur').length, 0);
  assert.strictEqual(rendered.calls.filter((call) => call.property === 'strokeStyle' && /255\s*,\s*255\s*,\s*255/.test(String(call.value))).length, 0);
}

function testCanvasBackingMetrics() {
  const metrics = test.canvasBackingMetrics(400, 200, 700, 350, 2);
  assert.deepStrictEqual(
    {
      backingWidth: metrics.backingWidth,
      backingHeight: metrics.backingHeight,
      cssScaleX: metrics.cssScaleX,
      cssScaleY: metrics.cssScaleY,
      backingScaleX: metrics.backingScaleX,
      backingScaleY: metrics.backingScaleY
    },
    { backingWidth: 1400, backingHeight: 700, cssScaleX: 1.75, cssScaleY: 1.75, backingScaleX: 3.5, backingScaleY: 3.5 }
  );
  const nonUniform = test.canvasBackingMetrics(400, 200, 600, 280, 1.5);
  assert.strictEqual(nonUniform.backingWidth, 900);
  assert.strictEqual(nonUniform.backingHeight, 420);
  assert.strictEqual(nonUniform.backingScaleX, 2.25);
  assert.strictEqual(nonUniform.backingScaleY, 2.1);
  assert.strictEqual(nonUniform.cssScale, 1.4);
}

testGeometryAndContainment();
testLabelsAndStraightAggregation();
testRenderingDirectionsCutoffAndArrowFallback();
testHoverAndHighlightTiers();
testCanvasBackingMetrics();

console.log('ramified_minigames_glue_flap_test: all tests passed');
