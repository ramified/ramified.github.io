const assert = require('assert');
const fs = require('fs');

const mosaic = require('./mosaic_calculator.js').__test;

function makeContext() {
  const calls = [];
  const context = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      if (property === 'measureText') {
        target[property] = (value) => {
          calls.push({ method: property, args: [value] });
          return { width: String(value).length * 6 };
        };
      } else {
        target[property] = (...args) => calls.push({ method: property, args });
      }
      return target[property];
    },
    set(target, property, value) {
      calls.push({ property, value });
      target[property] = value;
      return true;
    }
  });
  return { context, calls };
}

function squareCells(rows, cols, spacing = 60, offset = 30) {
  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    x: offset + ((index % cols) * spacing),
    y: offset + (Math.floor(index / cols) * spacing)
  }));
}

function setSquareBoard(options = {}) {
  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    boundary: 'glued',
    showGlueFlaps: options.showGlueFlaps !== false,
    gluedEdges: [{
      group: 9,
      first: { row: 1, col: 2, dir: 0 },
      second: { row: 1, col: 1, dir: 2 },
      firstArrowReversed: false,
      secondArrowReversed: true
    }]
  });
  mosaic.setTestGeometry({
    width: 120,
    height: 120,
    radius: 10,
    cssScale: options.cssScale,
    cells: squareCells(2, 2)
  });
}

function nearlyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function testLatticeDerivedGeometry() {
  setSquareBoard();
  assert.strictEqual(mosaic.defaultGlueFlapBaseAngle(), 45);
  const outward = mosaic.glueFlapGeometry({ index: 1, dir: 0 }, true);
  const inward = mosaic.glueFlapGeometry({ index: 1, dir: 0 }, false);
  assert.ok(outward && inward);
  assert.strictEqual(outward.angle, 45);
  assert.ok(nearlyEqual(outward.depth, outward.length * 0.22));
  assert.ok(nearlyEqual(outward.inset, outward.depth));
  assert.ok(outward.normal.x > 0.999 && Math.abs(outward.normal.y) < 1e-9);
  assert.ok(inward.normal.x < -0.999 && Math.abs(inward.normal.y) < 1e-9);
  outward.points.forEach((point) => {
    assert.ok(point.x >= 0 && point.x <= 120 && point.y >= 0 && point.y <= 120);
  });

  mosaic.setTestBoard({ rows: 2, cols: 2, lattice: 'hexagonal', boundary: 'glued' });
  mosaic.setTestGeometry({
    width: 120,
    height: 120,
    radius: 12,
    cells: [{ x: 30, y: 30 }, { x: 80, y: 30 }, { x: 42, y: 70 }, { x: 92, y: 70 }]
  });
  assert.strictEqual(mosaic.defaultGlueFlapBaseAngle(), 60);
  const hexOutward = mosaic.glueFlapGeometry({ index: 0, dir: 0 }, true);
  const hexInward = mosaic.glueFlapGeometry({ index: 0, dir: 0 }, false);
  assert.strictEqual(hexOutward.angle, 60);
  assert.ok(nearlyEqual(hexOutward.inset, hexOutward.depth / Math.tan(Math.PI / 3)));
  const hexMidpoint = {
    x: (hexOutward.segment.start.x + hexOutward.segment.end.x) / 2,
    y: (hexOutward.segment.start.y + hexOutward.segment.end.y) / 2
  };
  const centerVector = { x: hexMidpoint.x - 30, y: hexMidpoint.y - 30 };
  assert.ok((hexOutward.normal.x * centerVector.x) + (hexOutward.normal.y * centerVector.y) > 0);
  assert.ok((hexInward.normal.x * centerVector.x) + (hexInward.normal.y * centerVector.y) < 0);
}

function testDeterministicLabels() {
  const pairs = Array.from({ length: 28 }, () => ({ group: 40 }));
  pairs.push({ group: 3 });
  const labels = mosaic.glueFlapPairLabels(pairs);
  assert.deepStrictEqual(labels.slice(0, 3), ['1a', '1b', '1c']);
  assert.strictEqual(labels[25], '1z');
  assert.strictEqual(labels[26], '1aa');
  assert.strictEqual(labels[27], '1ab');
  assert.strictEqual(labels[28], '2');
  assert.strictEqual(mosaic.alphabeticGlueFlapSuffix(51), 'az');
}

function testFlapRenderingAndDirectedLabels() {
  setSquareBoard({ showGlueFlaps: true });
  mosaic.setTestGeometry({
    width: 210,
    height: 210,
    radius: 30,
    cssScale: 2,
    cells: [
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 150, y: 50 },
      { row: 1, col: 0, x: 50, y: 150 },
      { row: 1, col: 1, x: 150, y: 150 }
    ]
  });
  const enabled = makeContext();
  mosaic.drawGluedBoundaryPairs(enabled.context);
  const labels = enabled.calls.filter((call) => call.method === 'fillText');
  const rotations = enabled.calls.filter((call) => call.method === 'rotate');
  const dashed = enabled.calls.filter((call) => call.method === 'setLineDash' && call.args[0].length > 0);
  assert.deepStrictEqual(labels.map((call) => call.args[0]), ['1', '1']);
  assert.strictEqual(rotations.length, 2);
  assert.ok(nearlyEqual(rotations[0].args[0], Math.PI / 2));
  assert.ok(nearlyEqual(rotations[1].args[0], Math.PI / 2));
  assert.strictEqual(dashed.length, 1);
  assert.strictEqual(enabled.calls.filter((call) => call.method === 'strokeText').length, 0);
}

function testWholeTrapezoidHoverHitArea() {
  setSquareBoard({ showGlueFlaps: true });
  const pair = mosaic.state.gluedEdges[0];
  const outward = mosaic.glueFlapGeometry(pair.first, true);
  const inward = mosaic.glueFlapGeometry(pair.second, false);
  const outwardHit = mosaic.glueFlapHoverAtBoardPoint(outward.labelPoint);
  const inwardHit = mosaic.glueFlapHoverAtBoardPoint(inward.labelPoint);
  assert.strictEqual(outwardHit.pairIndex, 0);
  assert.strictEqual(outwardHit.edgeKey, `${pair.first.index}:${pair.first.dir}`);
  assert.strictEqual(inwardHit.pairIndex, 0);
  assert.strictEqual(inwardHit.edgeKey, `${pair.second.index}:${pair.second.dir}`);
  const nearOutline = {
    x: outward.labelPoint.x + (outward.normal.x * outward.depth * 0.62),
    y: outward.labelPoint.y + (outward.normal.y * outward.depth * 0.62)
  };
  assert.strictEqual(mosaic.glueFlapHoverAtBoardPoint(nearOutline).pairIndex, 0);
}

function testStrokeOnlyHoverTiers() {
  mosaic.setTestBoard({
    rows: 3,
    cols: 3,
    lattice: 'square',
    boundary: 'glued',
    showGlueFlaps: true,
    gluedEdges: [
      {
        group: 9,
        first: { row: 1, col: 3, dir: 0 },
        second: { row: 1, col: 1, dir: 2 }
      },
      {
        group: 9,
        first: { row: 1, col: 2, dir: 3 },
        second: { row: 3, col: 2, dir: 1 }
      },
      {
        group: 42,
        first: { row: 3, col: 3, dir: 0 },
        second: { row: 3, col: 1, dir: 2 }
      }
    ]
  });
  mosaic.setTestGeometry({
    width: 200,
    height: 200,
    radius: 25,
    cssScale: 2,
    cells: squareCells(3, 3, 50, 40)
  });

  const resting = makeContext();
  mosaic.drawGluedBoundaryPairs(resting.context);
  const restingWidths = resting.calls.filter((call) => call.property === 'lineWidth').map((call) => call.value);
  assert.strictEqual(restingWidths.length, 6);
  restingWidths.forEach((width) => assert.ok(nearlyEqual(width, restingWidths[0])));

  const firstPair = mosaic.state.gluedEdges[0];
  mosaic.state.gluedHover = {
    edgeKey: `${firstPair.first.index}:${firstPair.first.dir}`,
    pairIndex: 0,
    group: firstPair.group
  };
  const hovered = makeContext();
  mosaic.drawGluedBoundaryPairs(hovered.context);
  const widths = hovered.calls.filter((call) => call.property === 'lineWidth').map((call) => call.value);
  assert.strictEqual(widths.length, 6);
  assert.ok(nearlyEqual(widths[0], widths[1]));
  assert.ok(nearlyEqual(widths[2], widths[3]));
  assert.ok(nearlyEqual(widths[4], widths[5]));
  assert.ok(nearlyEqual(widths[2] / widths[0], 0.75));
  assert.ok(nearlyEqual(widths[4] / widths[0], 0.55));
  const restingFillAlphas = resting.calls
    .filter((call) => call.property === 'globalAlpha' && call.value < 1)
    .map((call) => call.value);
  const hoveredFillAlphas = hovered.calls
    .filter((call) => call.property === 'globalAlpha' && call.value < 1)
    .map((call) => call.value);
  assert.strictEqual(restingFillAlphas.length, 3);
  restingFillAlphas.forEach((alpha) => assert.ok(nearlyEqual(alpha, 0.14)));
  assert.ok(nearlyEqual(hoveredFillAlphas[0], 0.14 / 0.75));
  assert.ok(nearlyEqual(hoveredFillAlphas[1], 0.14));
  assert.ok(nearlyEqual(hoveredFillAlphas[2], 0.14 * 0.55 / 0.75));
  assert.strictEqual(hovered.calls.filter((call) => call.property === 'shadowBlur').length, 0);
  assert.strictEqual(hovered.calls.filter((call) => call.method === 'strokeText').length, 0);
  assert.strictEqual(
    hovered.calls.filter((call) => call.property === 'strokeStyle' && /^rgba?\(255,\s*255,\s*255/.test(call.value)).length,
    0
  );
  mosaic.clearGluedBoundaryHover();
}

function testStraightSquareGroupsUseCombinedTrapezoids() {
  mosaic.setTestBoard({
    rows: 3,
    cols: 3,
    lattice: 'square',
    boundary: 'glued',
    showGlueFlaps: true,
    removedTiles: [{ row: 2, col: 1 }, { row: 2, col: 2 }],
    gluedEdges: [
      {
        group: 17,
        first: { row: 1, col: 3, dir: 0 },
        second: { row: 3, col: 2, dir: 3 }
      },
      {
        group: 17,
        first: { row: 2, col: 3, dir: 0 },
        second: { row: 3, col: 1, dir: 3 }
      }
    ]
  });
  mosaic.setTestGeometry({
    width: 200,
    height: 200,
    radius: 25,
    cssScale: 2,
    cells: squareCells(3, 3, 50, 40)
  });
  const entries = mosaic.state.gluedEdges.map((pair, pairIndex) => ({ pair, pairIndex }));
  const combined = mosaic.straightGlueFlapGroupGeometry(entries);
  assert.ok(combined && combined.first && combined.second);
  const individual = mosaic.glueFlapGeometry(mosaic.state.gluedEdges[0].first, true);
  assert.ok(combined.first.length > individual.length * 1.8);
  assert.ok(nearlyEqual(combined.first.depth, individual.depth));
  assert.ok(nearlyEqual(combined.second.depth, individual.depth));

  const rendered = makeContext();
  mosaic.drawGluedBoundaryPairs(rendered.context);
  assert.strictEqual(rendered.calls.filter((call) => call.method === 'stroke').length, 2);
  assert.strictEqual(rendered.calls.filter((call) => call.method === 'fill').length, 1);
  assert.deepStrictEqual(
    rendered.calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]),
    ['1', '1']
  );
  const labelTranslations = rendered.calls.filter((call) => call.method === 'translate');
  assert.strictEqual(labelTranslations.length, 2);
  assert.ok(nearlyEqual(labelTranslations[0].args[0], combined.first.labelPoint.x));
  assert.ok(nearlyEqual(labelTranslations[0].args[1], combined.first.labelPoint.y));
  assert.ok(nearlyEqual(labelTranslations[1].args[0], combined.second.labelPoint.x));
  assert.ok(nearlyEqual(labelTranslations[1].args[1], combined.second.labelPoint.y));

  const bridgeHit = mosaic.glueFlapHoverAtBoardPoint(combined.first.labelPoint);
  assert.ok(bridgeHit);
  assert.strictEqual(bridgeHit.group, 17);

  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'hexagonal',
    boundary: 'glued',
    showGlueFlaps: true,
    gluedEdges: [
      { group: 3, first: { row: 1, col: 2, dir: 0 }, second: { row: 1, col: 1, dir: 3 } },
      { group: 3, first: { row: 2, col: 2, dir: 0 }, second: { row: 2, col: 1, dir: 3 } }
    ]
  });
  mosaic.setTestGeometry({
    width: 140,
    height: 140,
    radius: 16,
    cells: [{ x: 35, y: 35 }, { x: 90, y: 35 }, { x: 48, y: 85 }, { x: 103, y: 85 }]
  });
  const hexEntries = mosaic.state.gluedEdges.map((pair, pairIndex) => ({ pair, pairIndex }));
  assert.strictEqual(mosaic.straightGlueFlapGroupGeometry(hexEntries), null);
}

function testCssPixelLabelCutoffAndArrowFallback() {
  setSquareBoard({ showGlueFlaps: true });
  const geometry = {
    width: 210,
    height: 210,
    radius: 30,
    cells: [
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 150, y: 50 },
      { row: 1, col: 0, x: 50, y: 150 },
      { row: 1, col: 1, x: 150, y: 150 }
    ]
  };
  mosaic.setTestGeometry({ ...geometry, cssScale: 1 });
  const native = makeContext();
  mosaic.drawGluedBoundaryPairs(native.context);
  assert.strictEqual(native.calls.filter((call) => call.method === 'fillText').length, 0);

  mosaic.setTestGeometry({ ...geometry, cssScale: 1.25 });
  const enlarged = makeContext();
  mosaic.drawGluedBoundaryPairs(enlarged.context);
  assert.strictEqual(enlarged.calls.filter((call) => call.method === 'fillText').length, 2);

  mosaic.setTestGeometry({ ...geometry, cssScale: 0.65 });
  const reduced = makeContext();
  mosaic.drawGluedBoundaryPairs(reduced.context);
  assert.strictEqual(reduced.calls.filter((call) => call.method === 'fillText').length, 0);

  mosaic.state.showGlueFlaps = false;
  const disabled = makeContext();
  mosaic.drawGluedBoundaryPairs(disabled.context);
  assert.strictEqual(disabled.calls.filter((call) => call.method === 'fillText').length, 0);
  assert.strictEqual(disabled.calls.filter((call) => call.method === 'setLineDash').length, 0);
  assert.strictEqual(disabled.calls.filter((call) => call.method === 'fill').length, 2);
}

function testCanvasBackingMetrics() {
  const metrics = mosaic.mainCanvasRenderMetrics(300, 150, 750, 2);
  assert.deepStrictEqual(metrics, {
    displayedWidth: 750,
    cssScale: 2.5,
    backingScale: 5,
    backingWidth: 1500,
    backingHeight: 750
  });
  const reduced = mosaic.mainCanvasRenderMetrics(400, 200, 300, 1.5);
  assert.ok(nearlyEqual(reduced.cssScale, 0.75));
  assert.ok(nearlyEqual(reduced.backingScale, 1.125));
  assert.strictEqual(reduced.backingWidth, 450);
  assert.strictEqual(reduced.backingHeight, 225);
}

function testDisplayImportMerging() {
  const previous = {
    showErrors: true,
    showCoords: true,
    showGlueFlaps: true,
    colorComponents: false,
    displayPick: true,
    showCusps: true,
    showSeifertSurface: true,
    showSeifertBackground: true,
    colorSeifertBoundaries: true,
    seifertBandWidth: 0.4,
    seifertSurfaceColor: '#123456'
  };
  assert.deepStrictEqual(mosaic.importedDisplaySettings(undefined, previous), previous);
  assert.deepStrictEqual(
    mosaic.importedDisplaySettings({ glueFlaps: false, showCoords: false }, previous),
    { ...previous, showGlueFlaps: false, showCoords: false }
  );
  assert.strictEqual(mosaic.importedWrappedViewMode({}, 'single'), 'single');
  assert.strictEqual(mosaic.importedWrappedViewMode({ wrappedViewMode: 'periodic' }, 'single'), 'periodic');
}

function testDisplayExportAndMarkup() {
  setSquareBoard({ showGlueFlaps: true });
  const display = mosaic.buildFullExport().display;
  assert.strictEqual(display.glueFlaps, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(display, 'glueFlapBaseAngle'), false);

  const html = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  assert.ok(html.includes('id="show-glue-flaps"'));
  assert.ok(!html.includes('id="glue-flap-base-angle"'));
  assert.ok(html.includes('js/mosaic_calculator.js?v=glue-flaps-4'));
}

testLatticeDerivedGeometry();
testDeterministicLabels();
testFlapRenderingAndDirectedLabels();
testWholeTrapezoidHoverHitArea();
testStrokeOnlyHoverTiers();
testStraightSquareGroupsUseCombinedTrapezoids();
testCssPixelLabelCutoffAndArrowFallback();
testCanvasBackingMetrics();
testDisplayImportMerging();
testDisplayExportAndMarkup();

console.log('mosaic glue flap tests passed');
