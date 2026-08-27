'use strict';

const assert = require('assert');
const hex = require('./hex_homology_game.js');

function squareTorus(rows = 1, cols = 1) {
  const gluedEdges = [];
  for (let row = 1; row <= rows; row += 1) {
    gluedEdges.push({ first: { row, col: 1, dir: 2 }, second: { row, col: cols, dir: 0 } });
  }
  for (let col = 1; col <= cols; col += 1) {
    gluedEdges.push({ first: { row: 1, col, dir: 3 }, second: { row: rows, col, dir: 1 } });
  }
  return { lattice: 'square', rows, cols, cutEdges: [], gluedEdges };
}

function squareBoundaryGlue(mode, rows, cols) {
  const gluedEdges = [];
  for (let row = 1; row <= rows; row += 1) {
    gluedEdges.push({
      first: { row, col: cols, dir: 0 },
      second: { row: mode === 'torus' ? row : rows - row + 1, col: 1, dir: 2 },
      reversed: mode !== 'torus'
    });
  }
  for (let col = 1; col <= cols; col += 1) {
    gluedEdges.push({
      first: { row: 1, col, dir: 3 },
      second: { row: rows, col: mode === 'rp2' ? cols - col + 1 : col, dir: 1 },
      reversed: mode === 'rp2'
    });
  }
  return {
    lattice: 'square',
    rows,
    cols,
    cutEdges: [],
    gluedEdges,
    boundaryGlueMode: mode,
    hex: { homology: { version: 1, scheme: 'square-boundary-glue-v1' } }
  };
}

function runtimeFor(signatures, generators = [{ id: 'a1', kind: 'free', order: null }]) {
  const total = 3;
  const edges = [
    { id: 0, u: 0, uDir: 0, v: 1, vDir: 2 },
    { id: 1, u: 1, uDir: 0, v: 2, vDir: 2 },
    { id: 2, u: 2, uDir: 0, v: 0, vDir: 2 }
  ];
  const topology = {
    valid: true,
    total,
    generators,
    active: [true, true, true],
    edges,
    signatures,
    incident: [[0, 2], [0, 1], [1, 2]],
    adjacency: [[], [], []]
  };
  return hex.createRuntime(topology);
}

function testOneTileTorusWinsAcrossSelfGlue() {
  const topology = hex.buildTopology(squareTorus());
  assert.strictEqual(topology.valid, true);
  assert.strictEqual(topology.generators.length, 2);
  const runtime = hex.createRuntime(topology);
  const colours = new Map([[0, 'red']]);
  const result = hex.registerPlacement(runtime, 'red', 0, (index) => colours.get(index) || '');
  assert.strictEqual(result.win, true);
  assert.notStrictEqual(result.classExpression, '0');
  assert.strictEqual(result.witness.traversals.length, 1);
}

function testProjectiveTorsionUsesIntegralCoordinates() {
  const topology = hex.buildTopology({
    lattice: 'square', rows: 1, cols: 1, cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: 0 }, second: { row: 1, col: 1, dir: 2 }, reversed: true },
      { first: { row: 1, col: 1, dir: 1 }, second: { row: 1, col: 1, dir: 3 }, reversed: true }
    ]
  });
  assert.strictEqual(topology.valid, true);
  assert.deepStrictEqual(topology.generators.map((entry) => [entry.id, entry.kind, entry.order]), [['t1', 'torsion', 2]]);
  const runtime = hex.createRuntime(topology);
  const result = hex.registerPlacement(runtime, 'red', 0, () => 'red');
  assert.strictEqual(result.win, true);
  assert.deepStrictEqual(result.cycleClass, [1]);
  assert.strictEqual(result.classExpression, 't1');
}

function testIntegralDoubleClassIsNotDiscarded() {
  const runtime = runtimeFor([[0], [0], [2]]);
  hex.registerPlacement(runtime, 'red', 0, (index) => (index === 0 ? 'red' : ''));
  hex.registerPlacement(runtime, 'red', 1, (index) => (index === 0 || index === 1 ? 'red' : ''));
  const result = hex.registerPlacement(runtime, 'red', 2, () => 'red');
  assert.strictEqual(result.win, true);
  assert.deepStrictEqual(result.cycleClass, [2]);
  assert.strictEqual(result.classExpression, '2a1');
}

function testTorsionCoordinatesWrap() {
  const torsion = [{ id: 't1', kind: 'torsion', order: 2 }];
  const zeroRuntime = runtimeFor([[0], [0], [2]], torsion);
  hex.registerPlacement(zeroRuntime, 'red', 0, (index) => (index === 0 ? 'red' : ''));
  hex.registerPlacement(zeroRuntime, 'red', 1, (index) => (index < 2 ? 'red' : ''));
  assert.strictEqual(hex.registerPlacement(zeroRuntime, 'red', 2, () => 'red').win, false);

  const nonzeroRuntime = runtimeFor([[0], [0], [1]], torsion);
  hex.registerPlacement(nonzeroRuntime, 'red', 0, (index) => (index === 0 ? 'red' : ''));
  hex.registerPlacement(nonzeroRuntime, 'red', 1, (index) => (index < 2 ? 'red' : ''));
  assert.strictEqual(hex.registerPlacement(nonzeroRuntime, 'red', 2, () => 'red').win, true);
}

function testContractibleLoopsAreIgnored() {
  const runtime = runtimeFor([[0], [0], [0]]);
  hex.registerPlacement(runtime, 'red', 0, (index) => (index === 0 ? 'red' : ''));
  hex.registerPlacement(runtime, 'red', 1, (index) => (index < 2 ? 'red' : ''));
  const result = hex.registerPlacement(runtime, 'red', 2, () => 'red');
  assert.strictEqual(result.win, false);
  assert.deepStrictEqual(result.cycleClass, [0]);
}

function testHolesHexLatticeAndParallelSeams() {
  const punctured = hex.buildTopology(squareTorus(3, 3), new Set([4]));
  assert.strictEqual(punctured.valid, true);
  assert.ok(punctured.generators.length > 0);

  const hexagonal = hex.buildTopology({
    lattice: 'hexagonal',
    rows: 1,
    cols: 1,
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: 0 }, second: { row: 1, col: 1, dir: 3 } },
      { first: { row: 1, col: 1, dir: 1 }, second: { row: 1, col: 1, dir: 4 } },
      { first: { row: 1, col: 1, dir: 2 }, second: { row: 1, col: 1, dir: 5 } }
    ]
  });
  assert.strictEqual(hexagonal.valid, true);
  assert.ok(hexagonal.edges.some((edge) => edge.u === edge.v));

  const parallel = hex.buildTopology(squareTorus(1, 2));
  assert.strictEqual(parallel.valid, true);
  const betweenTiles = parallel.edges.filter((edge) => (
    (edge.u === 0 && edge.v === 1) || (edge.u === 1 && edge.v === 0)
  ));
  assert.ok(betweenTiles.length >= 2);
}

function testRejectsUngluedAndTrivialBoards() {
  assert.strictEqual(hex.buildTopology({ lattice: 'square', rows: 2, cols: 2, cutEdges: [], gluedEdges: [] }).valid, false);
}

function testTileLocalVerticesWithCornerTouchingHoles() {
  const preset = {
    lattice: 'square',
    rows: 4,
    cols: 4,
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: 3 }, second: { row: 4, col: 1, dir: 1 } }
    ]
  };
  const removed = new Set([5, 10]);
  hex.__test.topologyCache.clear();
  const topology = hex.buildTopology(preset, removed);
  assert.strictEqual(topology.valid, true);
  assert.strictEqual(topology.analysis.group, 'Z^2');
  const first = topology.analysis.complex.vertices.find((vertex) => (
    vertex.corners.some((corner) => corner.index === 6 && corner.vertex === 3)
  ));
  const second = topology.analysis.complex.vertices.find((vertex) => (
    vertex.corners.some((corner) => corner.index === 9 && corner.vertex === 1)
  ));
  assert.ok(first && second);
  assert.notStrictEqual(first.id, second.id);
  assert.strictEqual(hex.__test.snapshotHasSplitCanvasVertex(topology.snapshot), true);

  const stored = hex.serializeTopology(topology);
  assert.strictEqual(stored.vertexEquivalence, hex.TILE_LOCAL_VERTEX_SCHEME);
  const legacy = { ...stored };
  delete legacy.vertexEquivalence;
  assert.strictEqual(hex.topologyFromPresetHomology({ ...preset, hex: { homology: legacy } }, removed), null);
  assert.ok(hex.topologyFromPresetHomology({ ...preset, hex: { homology: stored } }, removed));
}

function testSerializedTopologyRoundTripAndMismatch() {
  const preset = squareTorus(2, 3);
  const computed = hex.buildTopology(preset);
  const stored = hex.serializeTopology(computed);
  assert.strictEqual(stored.version, 1);
  assert.match(stored.fingerprint, /^v1:/);
  assert.ok(stored.signatures.length < computed.signatures.length, 'zero edge signatures are omitted');

  hex.__test.topologyCache.clear();
  const restored = hex.topologyFromPresetHomology({ ...preset, hex: { homology: stored } });
  assert.ok(restored && restored.valid);
  assert.deepStrictEqual(restored.generators, computed.generators);
  assert.deepStrictEqual(restored.signatures, computed.signatures);

  assert.strictEqual(hex.topologyFromPresetHomology({
    ...preset,
    hex: { homology: { ...stored, fingerprint: `${stored.fingerprint}-stale` } }
  }), null);
  assert.strictEqual(hex.topologyFromPresetHomology({
    ...preset,
    hex: { homology: { ...stored, signatures: [[9999, 1, 0]] } }
  }), null);
}

function testDynamicBoundaryGlueHomologySchemes() {
  const expected = {
    torus: [['free', null], ['free', null]],
    'klein-bottle': [['torsion', 2], ['free', null]],
    rp2: [['torsion', 2]]
  };
  Object.keys(expected).forEach((mode) => {
    [[3, 7], [8, 5]].forEach(([rows, cols]) => {
      hex.__test.topologyCache.clear();
      const preset = squareBoundaryGlue(mode, rows, cols);
      const topology = hex.topologyFromPresetHomology(preset);
      assert.ok(topology && topology.valid, `${mode} ${rows}x${cols} uses its preset scheme`);
      assert.deepStrictEqual(topology.generators.map((entry) => [entry.kind, entry.order]), expected[mode]);
      assert.strictEqual(topology.signatures.length, topology.edges.length);
    });
  });
  const mismatched = squareBoundaryGlue('torus', 4, 4);
  mismatched.gluedEdges.pop();
  assert.strictEqual(hex.topologyFromPresetHomology(mismatched), null);
}

[
  testOneTileTorusWinsAcrossSelfGlue,
  testProjectiveTorsionUsesIntegralCoordinates,
  testIntegralDoubleClassIsNotDiscarded,
  testTorsionCoordinatesWrap,
  testContractibleLoopsAreIgnored,
  testHolesHexLatticeAndParallelSeams,
  testRejectsUngluedAndTrivialBoards,
  testTileLocalVerticesWithCornerTouchingHoles,
  testSerializedTopologyRoundTripAndMismatch,
  testDynamicBoundaryGlueHomologySchemes
].forEach((test) => test());

console.log('hex_homology_game_test: all tests passed');
