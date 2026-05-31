const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'sheaf_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    VARS,
    geometryFromVariety,
    sheafFromObject,
    buildBundleForSheaf,
    buildCharacteristicClasses,
    applyHomologyRules,
    polyFromPowers,
    pushforwardPolynomialByDegree,
    formatPolyPlain,
    mapHomologyClassDefinitions,
    homologyClassDefinitions,
    homologyVariableId,
    standardHomologyRules,
    HOMOLOGY_HYPERPLANE_CLASS,
    HOMOLOGY_POINT_CLASS,
    standardMapCurve,
    isStraightMapCurve,
    mapCurveAnchorCount,
    normalizedMapPointCount,
    mapPointCountFromSliderValue,
    mapPointCountSliderValue,
    setMapControlPoint,
    preserveEndpointHandlesForMovedObject,
    buildShortExactSequence,
    defaultShortExactSequenceLabel,
    shortExactSequenceTailGeometry,
    hideShortExactSequenceTail,
    showHiddenCanvasObjects,
    setSequenceTailPoint,
    sequenceTailPointCount,
    createBlowupPointConstruction,
    createGrassmannianMapConstruction
  };
})();`);
  return vm.runInNewContext(source, {
    console,
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; }
    },
    window: { addEventListener() {} },
    MathJax: null,
    setTimeout,
    clearTimeout
  });
}

function characteristicRows(api, targetSheaf) {
  const geometry = api.geometryFromVariety(api.state.varieties.find((variety) => variety.id === targetSheaf.baseVarietyId));
  const sheaf = api.sheafFromObject(targetSheaf, geometry);
  return api.buildCharacteristicClasses(geometry, sheaf).classRows;
}

function chernPlain(rows) {
  return rows.find((row) => row.key === 'chern')?.plain || '';
}

function characterPlain(rows) {
  return rows.find((row) => row.key === 'character')?.plain || '';
}

function testAbelianSpecialSheavesAreTrivial() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A', type: 'abelian', dim: '2', name: 'A' }];

  const tangentRows = characteristicRows(api, {
    id: 'TA',
    type: 'tangent',
    basis: 'chern',
    rank: '2',
    name: 'TA',
    baseVarietyId: 'A'
  });
  assert.strictEqual(chernPlain(tangentRows), '1');
  assert.strictEqual(characterPlain(tangentRows), '2');

  const canonicalRows = characteristicRows(api, {
    id: 'KA',
    type: 'canonical',
    basis: 'chern',
    rank: '1',
    name: 'KA',
    baseVarietyId: 'A'
  });
  assert.strictEqual(chernPlain(canonicalRows), '1');
  assert.strictEqual(characterPlain(canonicalRows), '1');
}

function testPointClassDefaultsToUnit() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'pt', type: 'point', dim: '0', name: '\\{*\\}' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const pointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, geometry);
  const point = api.polyFromPowers({ [pointId]: 1 });
  const reduced = api.applyHomologyRules(point, { geometry, homology: geometry.homology });
  assert.strictEqual(api.formatPolyPlain(reduced), '1');
}

function testPointSourcePushforwardDefaultsToTargetPoint() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'pt', type: 'point', dim: '0', name: '\\{*\\}' },
    { id: 'X', type: 'abstract', dim: '2', name: 'X' }
  ];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'pt', codomainKind: 'variety', codomainId: 'X' }
  ];
  const targetGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const pushed = api.pushforwardPolynomialByDegree(api.state.maps[0], api.polyFromPowers({}), 0, 2, {});
  const reduced = api.applyHomologyRules(pushed, { geometry: targetGeometry, homology: targetGeometry.homology });
  assert.strictEqual(api.formatPolyPlain(reduced), '[p]');
}

function testMapToPointPushforwardOfPointDefaultsToOne() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '2', name: 'X' },
    { id: 'pt', type: 'point', dim: '0', name: '\\{*\\}' }
  ];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'pt' }
  ];
  const sourceGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sourcePointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, sourceGeometry);
  const sourcePoint = api.polyFromPowers({ [sourcePointId]: 1 });
  const pushed = api.pushforwardPolynomialByDegree(api.state.maps[0], sourcePoint, 2, 0, {});
  const reduced = api.applyHomologyRules(pushed, { geometry: targetGeometry, homology: targetGeometry.homology });
  assert.strictEqual(api.formatPolyPlain(reduced), '1');
}

function testOutOfRangeMapHomologyRelationsAreOmitted() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'pt', type: 'point', dim: '0', name: '\\{*\\}' },
    { id: 'X', type: 'abstract', dim: '2', name: 'X' }
  ];
  api.state.maps = [
    { id: 'i', name: 'i', domainKind: 'variety', domainId: 'pt', codomainKind: 'variety', codomainId: 'X' },
    { id: 'q', name: 'q', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'pt' }
  ];

  api.state.activeMapId = 'i';
  const pointGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const pullbackDefs = api.mapHomologyClassDefinitions(pointGeometry);
  assert.strictEqual(pullbackDefs.length, 1);
  assert.strictEqual(pullbackDefs[0].degree, 0);

  api.state.activeMapId = 'q';
  const targetPointGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const pushforwardDefs = api.mapHomologyClassDefinitions(targetPointGeometry);
  assert.strictEqual(pushforwardDefs.length, 1);
  assert.strictEqual(pushforwardDefs[0].degree, 0);
  assert.match(pushforwardDefs[0].kind, /point/);
}

function testCurveToProjectivePullbackUsesCurvePoint() {
  const api = loadCalculator();
  api.state.varieties = [
    {
      id: 'C',
      type: 'curve',
      dim: '1',
      genus: 'g',
      name: 'X',
      homology: {
        rules: [
          {
            id: 'curve-pullback-rule',
            enabled: true,
            lhs: { powers: { map_pullback_f_H: 1 } },
            rhs: [{ coefficient: '1', powers: { point: 1 } }]
          }
        ]
      }
    },
    { id: 'P3', type: 'projective', dim: '3', name: 'X' }
  ];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'C', codomainKind: 'variety', codomainId: 'P3' }
  ];
  api.state.sheaves = [
    { id: 'O1', type: 'twist', twist: '1', basis: 'chern', rank: '1', name: 'O1', baseVarietyId: 'P3' }
  ];

  const rows = characteristicRows(api, {
    id: 'pullback',
    type: 'abstract',
    basis: 'chern',
    rank: '1',
    name: 'pullback',
    baseVarietyId: 'C',
    construction: { type: 'pullback', mapId: 'f', sheafId: 'O1' }
  });
  assert.strictEqual(chernPlain(rows), '1 + [p]');
}

function testProjectivePullbackStillUsesTargetHyperplane() {
  const api = loadCalculator();
  api.state.varieties = [
    {
      id: 'P1',
      type: 'projective',
      dim: '1',
      name: 'X',
      homology: {
        rules: [
          {
            id: 'projective-pullback-rule',
            enabled: true,
            lhs: { powers: { map_pullback_f_H: 1 } },
            rhs: [{ coefficient: '1', powers: { H: 1 } }]
          }
        ]
      }
    },
    { id: 'P3', type: 'projective', dim: '3', name: 'X' }
  ];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'P1', codomainKind: 'variety', codomainId: 'P3' }
  ];
  api.state.sheaves = [
    { id: 'O1', type: 'twist', twist: '1', basis: 'chern', rank: '1', name: 'O1', baseVarietyId: 'P3' }
  ];

  const rows = characteristicRows(api, {
    id: 'pullback',
    type: 'abstract',
    basis: 'chern',
    rank: '1',
    name: 'pullback',
    baseVarietyId: 'P1',
    construction: { type: 'pullback', mapId: 'f', sheafId: 'O1' }
  });
  assert.strictEqual(chernPlain(rows), '1 + H');
}

function testDuplicateDisplayNamesHaveDistinctInternalClasses() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'P3a', type: 'projective', dim: '3', name: 'X' },
    { id: 'P3b', type: 'projective', dim: '3', name: 'X' }
  ];
  const first = api.geometryFromVariety(api.state.varieties[0]);
  const second = api.geometryFromVariety(api.state.varieties[1]);
  assert.notStrictEqual(
    api.homologyVariableId(api.HOMOLOGY_HYPERPLANE_CLASS, first),
    api.homologyVariableId(api.HOMOLOGY_HYPERPLANE_CLASS, second)
  );
  assert.notStrictEqual(
    api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, first),
    api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, second)
  );
}

function testDuplicateSheafNamesHaveDistinctInternalClasses() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [
    { id: 'E1', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' },
    { id: 'E2', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const first = api.buildBundleForSheaf(geometry, api.sheafFromObject(api.state.sheaves[0], geometry));
  const second = api.buildBundleForSheaf(geometry, api.sheafFromObject(api.state.sheaves[1], geometry));
  assert.notDeepStrictEqual(
    Array.from(first.cComps[1].terms.keys()),
    Array.from(second.cComps[1].terms.keys())
  );
}

function testGrassmannianUsesTautologicalBundleClasses() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'G', type: 'grassmannian', grassmannianR: '2', grassmannianN: '4', name: 'G' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(geometry);
  const tautological = defs.filter((def) => def.kind === 'tautological');
  assert.deepStrictEqual(Array.from(tautological, (def) => def.id), ['grassmannian_s_1', 'grassmannian_s_2']);
  assert.deepStrictEqual(Array.from(tautological, (def) => def.symbolLatex), ['c_{1}(S)', 'c_{2}(S)']);
  assert.strictEqual(defs.some((def) => def.id === 'grassmannian_o1'), false);
  assert.strictEqual(defs.some((def) => String(def.id).startsWith('grassmannian_young_')), false);

  const twistRows = characteristicRows(api, {
    id: 'O1',
    type: 'twist',
    twist: '1',
    basis: 'chern',
    rank: '1',
    name: 'O1',
    baseVarietyId: 'G'
  });
  assert.strictEqual(chernPlain(twistRows), '1 - c_1(S)');

  const tangentRows = characteristicRows(api, {
    id: 'TG',
    type: 'tangent',
    basis: 'chern',
    rank: '4',
    name: 'TG',
    baseVarietyId: 'G'
  });
  assert.match(chernPlain(tangentRows), /^1 - 4\*c_1\(S\)/);
}

function testGrassmannianYoungBasisRulesExpressTautologicalClasses() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'G', type: 'grassmannian', grassmannianR: '2', grassmannianN: '4', grassmannianYoungBasis: true, name: 'G' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const rules = api.standardHomologyRules(geometry);
  const c1Rule = rules.find((rule) => rule.id === 'grassmannian-tautological-1');
  const c2Rule = rules.find((rule) => rule.id === 'grassmannian-tautological-2');
  assert(c1Rule);
  assert(c2Rule);
  assert.strictEqual(c1Rule.rhs[0].coefficient, '-1');
  assert.strictEqual(c2Rule.rhs[0].coefficient, '1');

  const c1Id = api.homologyVariableId('grassmannian_s_1', geometry);
  const c2Id = api.homologyVariableId('grassmannian_s_2', geometry);
  const sigma1Id = api.homologyVariableId('grassmannian_young_1', geometry);
  const sigma11Id = api.homologyVariableId('grassmannian_young_1_1', geometry);
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [c1Id]: 1 }), { geometry, homology: geometry.homology })), '-sigma_1');
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [c2Id]: 1 }), { geometry, homology: geometry.homology })), 'sigma_1,1');

  const twistRows = characteristicRows(api, {
    id: 'O1',
    type: 'twist',
    twist: '1',
    basis: 'chern',
    rank: '1',
    name: 'O1',
    baseVarietyId: 'G'
  });
  assert.strictEqual(chernPlain(twistRows), `1 + sigma_1`);
  assert.notStrictEqual(sigma1Id, sigma11Id);
}

function testStraightMapIsDefaultNoControlCase() {
  const api = loadCalculator();
  const curve = api.standardMapCurve({ x: 100, y: 100 }, { x: 300, y: 100 }, 500, 300, 0, 0);
  assert.strictEqual(api.isStraightMapCurve(curve), true);
  assert.strictEqual(api.mapCurveAnchorCount({ curve }), 0);
  assert.strictEqual(api.normalizedMapPointCount(0), 0);
  assert.strictEqual(api.normalizedMapPointCount(-1), 0);
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((value) => api.mapPointCountFromSliderValue(value)), [0, 2, 3, 4, 5]);
  assert.strictEqual(api.mapPointCountSliderValue(0), 0);
  assert.strictEqual(api.mapPointCountSliderValue(5), 4);
}

function testEndpointMovePreservesAttachedHandleVector() {
  const api = loadCalculator();
  const curve = api.standardMapCurve({ x: 100, y: 100 }, { x: 300, y: 100 }, 500, 300, 2, 40);
  const map = { id: 'm', domainKind: 'variety', domainId: 'A', codomainKind: 'variety', codomainId: 'B', curve };
  api.state.maps = [map];
  const movedHandle = { ...map.curve.handles[0] };
  const fixedHandle = { ...map.curve.handles[1] };
  api.preserveEndpointHandlesForMovedObject('variety', 'A', 50, 20, 500, 300);
  assert.strictEqual((map.curve.handles[0].x - movedHandle.x).toFixed(6), (50 / 500).toFixed(6));
  assert.strictEqual((map.curve.handles[0].y - movedHandle.y).toFixed(6), (20 / 300).toFixed(6));
  assert.strictEqual(map.curve.handles[1].x, fixedHandle.x);
  assert.strictEqual(map.curve.handles[1].y, fixedHandle.y);
}

function testMapControlCanMoveOutsideCanvas() {
  const api = loadCalculator();
  const curve = api.standardMapCurve({ x: 100, y: 100 }, { x: 300, y: 100 }, 500, 300, 2, 40);
  const map = { id: 'm', domainKind: 'variety', domainId: 'A', codomainKind: 'variety', codomainId: 'B', curve };
  api.setMapControlPoint(map, { type: 'handle', index: 0, direction: 'out' }, -40, 420, 500, 300);
  assert.strictEqual(map.curve.handles[0].x, -40 / 500);
  assert.strictEqual(map.curve.handles[0].y, 420 / 300);
}

function testShortExactSequenceCreatesMissingTermAndSheafMaps() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.5, labelY: 0.7 }];
  const left = { id: 'A', type: 'abstract', basis: 'chern', rank: '2', name: '\\mathcal{A}', baseVarietyId: 'X' };
  const middle = { id: 'B', type: 'abstract', basis: 'chern', rank: '5', name: '\\mathcal{B}', baseVarietyId: 'X' };
  api.state.sheaves = [left, middle];

  const sequence = api.buildShortExactSequence({
    sheafA: left,
    sheafB: middle,
    sheafC: null,
    mapAB: null,
    mapBC: null,
    baseVarietyId: 'X'
  });

  assert(sequence);
  assert.strictEqual(api.state.sequences.length, 1);
  assert.strictEqual(api.state.sheaves.length, 3);
  assert.strictEqual(api.state.maps.length, 2);
  const right = api.state.sheaves.find((sheaf) => sheaf.id !== 'A' && sheaf.id !== 'B');
  assert.strictEqual(right.baseVarietyId, 'X');
  assert.strictEqual(right.rank, '3');
  assert.strictEqual(right.name, '\\operatorname{coker}(\\iota)');
  assert.deepStrictEqual(Array.from(sequence.sheafIds), ['A', 'B', right.id]);
  assert(api.state.maps.every((map) => map.domainKind === 'sheaf' && map.codomainKind === 'sheaf'));
  assert.strictEqual(api.state.maps[0].domainId, 'A');
  assert.strictEqual(api.state.maps[0].codomainId, 'B');
  assert.strictEqual(api.state.maps[1].domainId, 'B');
  assert.strictEqual(api.state.maps[1].codomainId, right.id);
  assert.match(api.defaultShortExactSequenceLabel(sequence), /\\to \\mathcal\{A\}\\to \\mathcal\{B\}\\to/);
  assert(left.labelX < middle.labelX);
  assert(middle.labelX < right.labelX);
}

function testShortExactSequenceMissingTermNamesUseMapLabels() {
  let api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.5, labelY: 0.7 }];
  const source = { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: '\\mathcal{E}', baseVarietyId: 'X' };
  const target = { id: 'F', type: 'abstract', basis: 'chern', rank: '5', name: '\\mathcal{F}', baseVarietyId: 'X' };
  const f = { id: 'f', name: 'f', domainKind: 'sheaf', domainId: 'E', codomainKind: 'sheaf', codomainId: 'F' };
  api.state.sheaves = [source, target];
  api.state.maps = [f];
  api.buildShortExactSequence({
    sheafA: source,
    sheafB: target,
    sheafC: null,
    mapAB: f,
    mapBC: null,
    baseVarietyId: 'X'
  });
  const quotient = api.state.sheaves.find((sheaf) => sheaf.id !== 'E' && sheaf.id !== 'F');
  assert.strictEqual(quotient.name, '\\operatorname{coker}(f)');

  api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.5, labelY: 0.7 }];
  const middle = { id: 'F', type: 'abstract', basis: 'chern', rank: '5', name: '\\mathcal{F}', baseVarietyId: 'X' };
  const right = { id: 'G', type: 'abstract', basis: 'chern', rank: '3', name: '\\mathcal{G}', baseVarietyId: 'X' };
  const g = { id: 'g', name: 'g', domainKind: 'sheaf', domainId: 'F', codomainKind: 'sheaf', codomainId: 'G' };
  api.state.sheaves = [middle, right];
  api.state.maps = [g];
  api.buildShortExactSequence({
    sheafA: null,
    sheafB: middle,
    sheafC: right,
    mapAB: null,
    mapBC: g,
    baseVarietyId: 'X'
  });
  const kernel = api.state.sheaves.find((sheaf) => sheaf.id !== 'F' && sheaf.id !== 'G');
  assert.strictEqual(kernel.name, '\\ker(g)');
}

function testShortExactSequenceTailCanMoveEndpointAndHandles() {
  const api = loadCalculator();
  const sequence = { id: 'S', type: 'short-exact-sequence', sheafIds: ['A', 'B', 'C'], mapIds: [] };
  api.state.sheaves = [
    { id: 'A', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{A}', baseVarietyId: 'X', labelX: 0.2, labelY: 0.4 },
    { id: 'B', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{B}', baseVarietyId: 'X', labelX: 0.4, labelY: 0.4 },
    { id: 'C', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{C}', baseVarietyId: 'X', labelX: 0.6, labelY: 0.4 }
  ];
  const rightLabel = { x: 300, y: 120, maxWidth: 120, main: '\\mathcal{C}', objectKind: 'sheaf', objectId: 'C' };
  let geometry = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(geometry);
  api.setSequenceTailPoint(sequence, 'end', 430, 170, 500, 300);
  assert.strictEqual(sequence.tail.end.x, 430 / 500);
  assert.strictEqual(sequence.tail.end.y, 170 / 300);
  geometry = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(Math.abs(geometry.end.x - 430) < 0.001);
  sequence.tail.pointCount = 2;
  api.setSequenceTailPoint(sequence, 'handle:0:out', 365, 80, 500, 300);
  geometry = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(geometry.path);
  assert(Math.abs(geometry.path.outHandles[0].x - 365) < 0.001);
  assert(Math.abs(geometry.path.outHandles[0].y - 80) < 0.001);
}

function testShortExactSequenceTailPointCountKeepsFreeEndpoint() {
  const api = loadCalculator();
  const sequence = { id: 'S', type: 'short-exact-sequence', sheafIds: ['A', 'B', 'C'], mapIds: [], tail: { pointCount: 2 } };
  const rightLabel = { x: 300, y: 120, maxWidth: 120, main: '\\mathcal{C}', objectKind: 'sheaf', objectId: 'C' };
  const geometry = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(geometry.path);
  assert.strictEqual(api.sequenceTailPointCount(sequence.tail), 2);
  assert.strictEqual(geometry.path.anchors.length, 2);
  assert(geometry.end.x > rightLabel.x);
}

function testShortExactSequenceStraightTailUsesZeroPoints() {
  const api = loadCalculator();
  const sequence = { id: 'S', type: 'short-exact-sequence', sheafIds: ['A', 'B', 'C'], mapIds: [], tail: { pointCount: 0 } };
  const rightLabel = { x: 300, y: 120, maxWidth: 120, main: '\\mathcal{C}', objectKind: 'sheaf', objectId: 'C' };
  const geometry = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(geometry.path);
  assert.strictEqual(api.sequenceTailPointCount(sequence.tail), 0);
  assert.strictEqual(geometry.path.anchors.length, 2);
  assert.strictEqual(geometry.path.handles.length, 0);
  assert(geometry.label.y < geometry.end.y);
  assert(Math.abs(geometry.label.x - (geometry.start.x + geometry.end.x) / 2) < 0.001);
  const segment = geometry.path.segments[0];
  const tangent = {
    x: 3 * (segment.end.x - segment.c2.x),
    y: 3 * (segment.end.y - segment.c2.y)
  };
  assert(tangent.x > 0);
  assert(Math.abs(tangent.y) < 0.001);
}

function testShortExactSequenceTailHideAndShowRestoresGeometry() {
  const api = loadCalculator();
  const sequence = {
    id: 'S',
    type: 'short-exact-sequence',
    sheafIds: ['A', 'B', 'C'],
    mapIds: [],
    tail: {
      pointCount: 1,
      end: { x: 0.86, y: 0.5 },
      handle: { x: 0.8, y: 0.5 }
    }
  };
  const rightLabel = { x: 300, y: 120, maxWidth: 120, main: '\\mathcal{C}', objectKind: 'sheaf', objectId: 'C' };
  api.state.sheaves = [
    { id: 'A', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{A}', baseVarietyId: 'X' },
    { id: 'B', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{B}', baseVarietyId: 'X' },
    { id: 'C', type: 'abstract', basis: 'chern', rank: '1', name: '\\mathcal{C}', baseVarietyId: 'X' }
  ];
  api.state.sequences = [sequence];

  const visible = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(visible);

  api.hideShortExactSequenceTail('S');
  assert.strictEqual(sequence.tail.hiddenOnCanvas, true);
  assert.strictEqual(api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300), null);

  api.showHiddenCanvasObjects();
  assert.strictEqual(sequence.tail.hiddenOnCanvas, false);
  const restored = api.shortExactSequenceTailGeometry(sequence, rightLabel, 500, 300);
  assert(restored);
  assert(restored.path);
}

function testBlowupPointConstructionCreatesVarietyAndMap() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.4, labelY: 0.7 };
  const point = { id: 'p', type: 'point', dim: '0', name: 'p', labelX: 0.6, labelY: 0.7 };
  api.state.varieties = [base, point];

  const blowup = api.createBlowupPointConstruction({
    base,
    point,
    defaultName: '\\operatorname{Bl}_{p}X',
    name: '\\operatorname{Bl}_{p}X'
  });

  assert(blowup);
  assert.strictEqual(api.state.varieties.length, 3);
  assert.strictEqual(api.state.maps.length, 1);
  assert.strictEqual(blowup.construction.type, 'blow-up-point');
  assert.strictEqual(api.state.maps[0].domainId, blowup.id);
  assert.strictEqual(api.state.maps[0].codomainId, 'X');
}

function testGrassmannianMapConstructionCreatesTargetAndMap() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  const bundle = { id: 'E', type: 'locally-free', basis: 'chern', rank: '2', name: '\\mathcal{E}', baseVarietyId: 'X', labelX: 0.45, labelY: 0.4 };
  api.state.varieties = [base];
  api.state.sheaves = [bundle];

  const map = api.createGrassmannianMapConstruction({
    bundle,
    base,
    params: { r: 2, n: 4, dim: 4 },
    defaultTargetName: '\\operatorname{Gr}(2,4)',
    targetName: '\\operatorname{Gr}(2,4)',
    mapName: '\\varphi_{\\mathcal{E}}'
  });

  assert(map);
  assert.strictEqual(api.state.varieties.length, 2);
  assert.strictEqual(api.state.maps.length, 1);
  const target = api.state.varieties[1];
  assert.strictEqual(target.type, 'grassmannian');
  assert.strictEqual(target.construction.type, 'grassmannian-target');
  assert.strictEqual(map.domainId, 'X');
  assert.strictEqual(map.codomainId, target.id);
  assert.strictEqual(map.construction.type, 'grassmannian-map');
}

testCurveToProjectivePullbackUsesCurvePoint();
testProjectivePullbackStillUsesTargetHyperplane();
testDuplicateDisplayNamesHaveDistinctInternalClasses();
testDuplicateSheafNamesHaveDistinctInternalClasses();
testGrassmannianUsesTautologicalBundleClasses();
testGrassmannianYoungBasisRulesExpressTautologicalClasses();
testAbelianSpecialSheavesAreTrivial();
testPointClassDefaultsToUnit();
testPointSourcePushforwardDefaultsToTargetPoint();
testMapToPointPushforwardOfPointDefaultsToOne();
testOutOfRangeMapHomologyRelationsAreOmitted();
testStraightMapIsDefaultNoControlCase();
testEndpointMovePreservesAttachedHandleVector();
testMapControlCanMoveOutsideCanvas();
testShortExactSequenceCreatesMissingTermAndSheafMaps();
testShortExactSequenceMissingTermNamesUseMapLabels();
testShortExactSequenceTailCanMoveEndpointAndHandles();
testShortExactSequenceTailPointCountKeepsFreeEndpoint();
testShortExactSequenceStraightTailUsesZeroPoints();
testShortExactSequenceTailHideAndShowRestoresGeometry();
testBlowupPointConstructionCreatesVarietyAndMap();
testGrassmannianMapConstructionCreatesTargetAndMap();

console.log('sheaf calculator regression tests passed');
