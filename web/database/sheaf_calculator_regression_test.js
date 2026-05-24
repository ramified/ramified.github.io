const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync('sheaf_calculator.js', 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    VARS,
    geometryFromVariety,
    sheafFromObject,
    buildBundleForSheaf,
    buildCharacteristicClasses,
    homologyVariableId,
    HOMOLOGY_HYPERPLANE_CLASS,
    HOMOLOGY_POINT_CLASS,
    standardMapCurve,
    isStraightMapCurve,
    mapCurveAnchorCount,
    normalizedMapPointCount,
    mapPointCountFromSliderValue,
    mapPointCountSliderValue,
    setMapControlPoint,
    preserveEndpointHandlesForMovedObject
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

testCurveToProjectivePullbackUsesCurvePoint();
testProjectivePullbackStillUsesTargetHyperplane();
testDuplicateDisplayNamesHaveDistinctInternalClasses();
testDuplicateSheafNamesHaveDistinctInternalClasses();
testStraightMapIsDefaultNoControlCase();
testEndpointMovePreservesAttachedHandleVector();
testMapControlCanMoveOutsideCanvas();

console.log('sheaf calculator regression tests passed');
