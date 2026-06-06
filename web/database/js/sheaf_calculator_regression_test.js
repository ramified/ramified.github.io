const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'sheaf_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    refs,
    VARS,
    geometryFromVariety,
    sheafFromObject,
    buildBundleForSheaf,
    buildCharacteristicClasses,
    buildHodgeNumbers,
    applyHomologyRules,
    createSymbolicBudget,
    currentHomologyRulePasses,
    classDisplayOptions,
    buildClassRows,
    polyFromPowers,
    pushforwardPolynomialByDegree,
    formatPolyPlain,
    mapHomologyClassDefinitions,
    homologyClassDefinitions,
    homologyVariableId,
    homologyDefVariableId,
    standardHomologyRules,
    defaultMapHomologyRulesForGeometry,
    deleteMapHomologyRuleById,
    mapHomologyPromotionContext,
    addMapHomologyClassToTargetHomology,
    requestSheafChernClassPromotion,
    answerSheafChernClassPrompt,
    tangentChernHomologyClassId,
    tangentChernHomologyClassSymbol,
    tangentChernSheafDefForIndex,
    sheafChernClassUsesBaseHomology,
    computedSheafChernClassRule,
    baseHomologyRuleFromSheafChernRule,
    renderSheafHomologyLhs,
    renderSheafHomologySpecialAction,
    HOMOLOGY_HYPERPLANE_CLASS,
    HOMOLOGY_POINT_CLASS,
    HOMOLOGY_BRANCH_DIVISOR_CLASS,
    HOMOLOGY_RAMIFICATION_DIVISOR_CLASS,
    HOMOLOGY_CYCLIC_ROOT_CLASS,
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
    createRamifiedCoverConstruction,
    createGrassmannianMapConstruction,
    createDualSheafConstruction,
    createInternalHomSheafConstruction,
    createIdealSheafConstruction,
    createNormalBundleConstruction,
    createRelativeSheafConstruction,
    activePickFlow,
    canvasPickAvailable,
    pickFlowHint,
    pickFlowComplete,
    pickFlowCandidate,
    pickFlowSelectedState,
    syncPickFlowNote,
    handleActivePickFlow,
    refreshConstructedObjects,
    buildPresetState,
    applyPresetState,
    importPresetFromText
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

function testSelfDirectSumScalesChernCharacter() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^2' }];
  api.state.sheaves = [
    { id: 'O1', type: 'twist', twist: '1', basis: 'chern', rank: '1', name: '\\mathcal{O}(1)', baseVarietyId: 'P2' }
  ];

  const rows = characteristicRows(api, {
    id: 'sum',
    type: 'abstract',
    basis: 'chern',
    rank: '3',
    name: '\\mathcal{O}(1)^{\\oplus 3}',
    baseVarietyId: 'P2',
    construction: { type: 'self-direct-sum', sheafId: 'O1', multiplicity: 3 }
  });

  assert.strictEqual(chernPlain(rows), '1 + 3*H + 3*[p]');
  assert.strictEqual(characterPlain(rows), '3 + 3*H + 3/2*[p]');
}

function testPresetStateIncludesRecoverableConstructionData() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^2', labelX: 0.25, labelY: 0.6 }];
  api.state.sheaves = [
    { id: 'O1', type: 'twist', twist: '1', basis: 'chern', rank: '1', name: '\\mathcal{O}(1)', baseVarietyId: 'P2' },
    {
      id: 'sum',
      type: 'abstract',
      basis: 'chern',
      rank: '3',
      name: '\\mathcal{O}(1)^{\\oplus 3}',
      baseVarietyId: 'P2',
      construction: { type: 'self-direct-sum', sheafId: 'O1', multiplicity: 3 }
    }
  ];
  api.state.activeVarietyId = 'P2';
  api.state.activeSheafId = 'sum';

  const preset = api.buildPresetState();
  assert.strictEqual(preset.schema, 'sheaf-calculator-preset');
  assert.strictEqual(preset.version, 1);
  assert.strictEqual(preset.active.sheafId, 'sum');
  assert.strictEqual(preset.objects.varieties[0].id, 'P2');
  assert.strictEqual(preset.objects.sheaves[1].construction.type, 'self-direct-sum');
  assert.strictEqual(preset.objects.sheaves[1].construction.multiplicity, 3);
  assert.strictEqual(preset.objects.sheaves[1].construction.sheafId, 'O1');
}

function testPresetImportRestoresRecoverableState() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^2', labelX: 0.25, labelY: 0.6 }];
  api.state.sheaves = [
    { id: 'O1', type: 'twist', twist: '1', basis: 'chern', rank: '1', name: '\\mathcal{O}(1)', baseVarietyId: 'P2' },
    {
      id: 'sum',
      type: 'abstract',
      basis: 'chern',
      rank: '3',
      name: '\\mathcal{O}(1)^{\\oplus 3}',
      baseVarietyId: 'P2',
      construction: { type: 'self-direct-sum', sheafId: 'O1', multiplicity: 3 }
    }
  ];
  api.state.activeVarietyId = 'P2';
  api.state.activeSheafId = 'sum';
  api.state.inputMode = 'modify';
  api.state.nextObjectId = 12;

  const presetText = JSON.stringify(api.buildPresetState());
  api.state.varieties = [];
  api.state.sheaves = [];
  api.state.activeVarietyId = null;
  api.state.activeSheafId = null;

  api.importPresetFromText(presetText);
  assert.strictEqual(api.state.activeSheafId, 'sum');
  assert.strictEqual(api.state.activeVarietyId, 'P2');
  assert.strictEqual(api.state.nextObjectId, 12);
  assert.strictEqual(api.state.sheaves[1].construction.type, 'self-direct-sum');

  const rows = characteristicRows(api, api.state.sheaves[1]);
  assert.strictEqual(chernPlain(rows), '1 + 3*H + 3*[p]');
  assert.strictEqual(characterPlain(rows), '3 + 3*H + 3/2*[p]');
}

function testDualSheafUsesAlternatingChernClasses() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.25, labelY: 0.6 }];
  const parent = {
    id: 'E',
    type: 'abstract',
    basis: 'chern',
    rank: '3',
    name: '\\mathcal{E}',
    baseVarietyId: 'X',
    labelX: 0.32,
    labelY: 0.4
  };
  api.state.sheaves = [parent];

  const dual = api.createDualSheafConstruction({
    parent,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{E}^{\\vee}',
    name: '\\mathcal{E}^{\\vee}',
    nameDirty: false
  });

  assert.strictEqual(dual.construction.type, 'dual');
  assert.strictEqual(dual.construction.sheafId, 'E');
  assert.strictEqual(dual.baseVarietyId, 'X');
  assert.strictEqual(dual.rank, '3');

  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(dual, geometry);
  const result = api.buildCharacteristicClasses(geometry, sheaf);
  assert.strictEqual(chernPlain(result.classRows), '1 - c_1(E) + c_2(E) - c_3(E)');

  const rules = result.bundle.defaultSheafHomologyRules;
  assert.strictEqual(rules.length, 3);
  assert.strictEqual(rules[0].rhs[0].coefficient, '-1');
  assert.strictEqual(Object.keys(rules[0].rhs[0].powers)[0], 'sheaf_E_c1');
  assert.strictEqual(rules[1].rhs[0].coefficient, '1');
  assert.strictEqual(Object.keys(rules[1].rhs[0].powers)[0], 'sheaf_E_c2');
  assert.strictEqual(rules[2].rhs[0].coefficient, '-1');
  assert.strictEqual(Object.keys(rules[2].rhs[0].powers)[0], 'sheaf_E_c3');

  api.state.activeVarietyId = 'X';
  api.state.activeSheafId = dual.id;
  const restored = loadCalculator();
  restored.importPresetFromText(JSON.stringify(api.buildPresetState()));
  const restoredDual = restored.state.sheaves.find((item) => item.name === '\\mathcal{E}^{\\vee}');
  assert(restoredDual);
  assert.strictEqual(restoredDual.construction.type, 'dual');
  assert.strictEqual(restoredDual.construction.sheafId, 'E');
}

function testDualSheafNameMergesExistingExponent() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.25, labelY: 0.6 }];
  const parent = {
    id: 'E1',
    type: 'abstract',
    basis: 'chern',
    rank: '2',
    name: '\\mathcal{E}^{1}',
    baseVarietyId: 'X',
    labelX: 0.32,
    labelY: 0.4
  };
  api.state.sheaves = [parent];

  const dual = api.createDualSheafConstruction({
    parent,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{E}^{1,\\vee}',
    name: '\\mathcal{E}^{1,\\vee}',
    nameDirty: false
  });

  assert.strictEqual(dual.name, '\\mathcal{E}^{1,\\vee}');
  assert(!dual.name.includes('}^{\\vee}'));
  assert.strictEqual(dual.construction.type, 'dual');
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(dual, geometry);
  const result = api.buildCharacteristicClasses(geometry, sheaf);
  assert.strictEqual(result.bundle.labelLatex, '\\mathcal{E}^{1,\\vee}');
}

function testDualSheafSimplifiesLineAndStructureSheaves() {
  const api = loadCalculator();
  const projective = { id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^{2}', labelX: 0.25, labelY: 0.6 };
  const twist = {
    id: 'O3',
    type: 'twist',
    basis: 'chern',
    twist: '3',
    rank: '1',
    name: '\\mathcal{O}_{\\mathbb{P}^{2}}(3)',
    baseVarietyId: 'P2'
  };
  const structure = {
    id: 'OX',
    type: 'structure',
    basis: 'chern',
    twist: '1',
    rank: '1',
    name: '\\mathcal{O}_{\\mathbb{P}^{2}}',
    baseVarietyId: 'P2'
  };
  api.state.varieties = [projective];
  api.state.sheaves = [twist, structure];

  const twistDual = api.createDualSheafConstruction({
    parent: twist,
    baseVarietyId: 'P2',
    defaultName: '\\mathcal{O}_{\\mathbb{P}^{2}}(-3)',
    name: '\\mathcal{O}_{\\mathbb{P}^{2}}(-3)',
    nameDirty: false
  });
  assert.strictEqual(twistDual.type, 'twist');
  assert.strictEqual(twistDual.twist, '-3');
  assert.strictEqual(twistDual.construction, undefined);
  assert.strictEqual(chernPlain(characteristicRows(api, twistDual)), '1 - 3*H');

  const structureDual = api.createDualSheafConstruction({
    parent: structure,
    baseVarietyId: 'P2',
    defaultName: '\\mathcal{O}_{\\mathbb{P}^{2}}',
    name: '\\mathcal{O}_{\\mathbb{P}^{2}}',
    nameDirty: false
  });
  assert.strictEqual(structureDual.type, 'structure');
  assert.strictEqual(structureDual.construction, undefined);
  assert.strictEqual(chernPlain(characteristicRows(api, structureDual)), '1');
}

function testInternalHomCreatesHiddenDualTensor() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.25, labelY: 0.6 }];
  const source = {
    id: 'E',
    type: 'abstract',
    basis: 'chern',
    rank: '2',
    name: '\\mathcal{E}',
    baseVarietyId: 'X',
    labelX: 0.32,
    labelY: 0.4
  };
  const target = {
    id: 'F',
    type: 'abstract',
    basis: 'chern',
    rank: '3',
    name: '\\mathcal{F}',
    baseVarietyId: 'X',
    labelX: 0.48,
    labelY: 0.4
  };
  api.state.sheaves = [source, target];

  const internalHom = api.createInternalHomSheafConstruction({
    source,
    target,
    baseVarietyId: 'X',
    exact: false,
    derived: true,
    defaultName: '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})',
    tensorDefaultName: '\\mathcal{E}^{\\vee}\\otimes^{\\mathbf{L}}\\mathcal{F}',
    name: '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})',
    nameDirty: false
  });

  assert(internalHom);
  assert.strictEqual(internalHom.name, '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})');
  assert.strictEqual(internalHom.rank, '6');
  assert.strictEqual(internalHom.construction.type, 'tensor');
  assert.strictEqual(internalHom.construction.internalHom, true);
  assert.strictEqual(internalHom.construction.derived, true);
  assert.strictEqual(internalHom.construction.exact, false);
  assert.strictEqual(internalHom.construction.sourceSheafId, 'E');
  assert.strictEqual(internalHom.construction.targetSheafId, 'F');

  const hiddenDual = api.state.sheaves.find((item) => item.id === internalHom.construction.dualSheafId);
  assert(hiddenDual);
  assert.strictEqual(hiddenDual.hiddenOnCanvas, true);
  assert.strictEqual(hiddenDual.construction.type, 'dual');
  assert.strictEqual(hiddenDual.construction.sheafId, 'E');
  assert.strictEqual(hiddenDual.construction.internalHomDual, true);
  assert.deepStrictEqual(Array.from(internalHom.construction.sheafIds), [hiddenDual.id, 'F']);

  const before = {
    sheaves: api.state.sheaves.length,
    duals: api.state.sheaves.filter((item) => item.construction?.internalHomDual).length
  };
  api.refreshConstructedObjects();
  assert.deepStrictEqual({
    sheaves: api.state.sheaves.length,
    duals: api.state.sheaves.filter((item) => item.construction?.internalHomDual).length
  }, before);

  api.state.activeVarietyId = 'X';
  api.state.activeSheafId = internalHom.id;
  const restored = loadCalculator();
  restored.importPresetFromText(JSON.stringify(api.buildPresetState()));
  const restoredInternalHom = restored.state.sheaves.find((item) => item.name === '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})');
  assert(restoredInternalHom);
  assert.strictEqual(restoredInternalHom.construction.internalHom, true);
  assert.strictEqual(restoredInternalHom.construction.sourceSheafId, 'E');
  assert.strictEqual(restoredInternalHom.construction.targetSheafId, 'F');
  const restoredDual = restored.state.sheaves.find((item) => item.id === restoredInternalHom.construction.dualSheafId);
  assert.strictEqual(restoredDual.hiddenOnCanvas, true);
}

function testExactInternalHomUsesOrdinaryHomName() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.25, labelY: 0.6 }];
  const source = { id: 'E', type: 'abstract', basis: 'chern', rank: 'r', name: '\\mathcal{E}', baseVarietyId: 'X' };
  const target = { id: 'F', type: 'abstract', basis: 'chern', rank: 'r', name: '\\mathcal{F}', baseVarietyId: 'X' };
  api.state.sheaves = [source, target];

  const internalHom = api.createInternalHomSheafConstruction({
    source,
    target,
    baseVarietyId: 'X',
    exact: true,
    derived: false,
    defaultName: '\\mathcal{H}om(\\mathcal{E}, \\mathcal{F})',
    tensorDefaultName: '\\mathcal{E}^{\\vee}\\otimes\\mathcal{F}',
    name: '\\mathcal{H}om(\\mathcal{E}, \\mathcal{F})',
    nameDirty: false
  });

  assert.strictEqual(internalHom.name, '\\mathcal{H}om(\\mathcal{E}, \\mathcal{F})');
  assert.strictEqual(internalHom.construction.derived, false);
  assert.strictEqual(internalHom.construction.exact, true);
}

function testInternalHomUpdateReusesHiddenDual() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.25, labelY: 0.6 }];
  const source = { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: '\\mathcal{E}', baseVarietyId: 'X' };
  const target = { id: 'F', type: 'abstract', basis: 'chern', rank: '3', name: '\\mathcal{F}', baseVarietyId: 'X' };
  api.state.sheaves = [source, target];

  const internalHom = api.createInternalHomSheafConstruction({
    source,
    target,
    baseVarietyId: 'X',
    exact: false,
    derived: true,
    defaultName: '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})',
    tensorDefaultName: '\\mathcal{E}^{\\vee}\\otimes^{\\mathbf{L}}\\mathcal{F}',
    name: '\\mathcal{RHom}(\\mathcal{E}, \\mathcal{F})',
    nameDirty: false
  });
  const dualId = internalHom.construction.dualSheafId;
  const dualCount = api.state.sheaves.filter((item) => item.construction?.internalHomDual).length;

  const updated = api.createInternalHomSheafConstruction({
    source,
    target,
    baseVarietyId: 'X',
    exact: true,
    derived: false,
    defaultName: '\\mathcal{H}om(\\mathcal{E}, \\mathcal{F})',
    tensorDefaultName: '\\mathcal{E}^{\\vee}\\otimes\\mathcal{F}',
    name: '\\mathcal{H}om(\\mathcal{E}, \\mathcal{F})',
    nameDirty: false
  }, { replaceSheaf: internalHom });

  assert.strictEqual(updated.id, internalHom.id);
  assert.strictEqual(updated.construction.dualSheafId, dualId);
  assert.strictEqual(updated.construction.sheafIds[0], dualId);
  assert.strictEqual(api.state.sheaves.filter((item) => item.construction?.internalHomDual).length, dualCount);
  assert.strictEqual(api.state.sheaves.find((item) => item.id === dualId).hiddenOnCanvas, true);
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

function testPointPushforwardDefaultsToTargetPoint() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '1', name: 'X' },
    { id: 'Y', type: 'abstract', dim: '3', name: 'Y' }
  ];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' }
  ];
  const sourceGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sourcePointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, sourceGeometry);
  const sourcePoint = api.polyFromPowers({ [sourcePointId]: 1 });
  const pushed = api.pushforwardPolynomialByDegree(api.state.maps[0], sourcePoint, 1, 3, {});
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

  api.state.activeHomologyTarget = { kind: 'map', id: 'i' };
  const pointGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const pullbackDefs = api.mapHomologyClassDefinitions(pointGeometry);
  assert.strictEqual(pullbackDefs.length, 1);
  assert.strictEqual(pullbackDefs[0].degree, 0);

  api.state.activeHomologyTarget = { kind: 'map', id: 'q' };
  const targetPointGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const pushforwardDefs = api.mapHomologyClassDefinitions(targetPointGeometry);
  assert.strictEqual(pushforwardDefs.length, 1);
  assert.strictEqual(pushforwardDefs[0].degree, 0);
  assert.match(pushforwardDefs[0].kind, /point/);
}

function testMapHomologyClassPromotionAddsClassToRowVariety() {
  const api = loadCalculator();
  const domain = { id: 'Y', type: 'abstract', dim: '2', name: 'Y' };
  const codomain = { id: 'S', type: 'abstract', dim: '2', name: 'S' };
  api.state.varieties = [domain, codomain];
  api.state.maps = [
    { id: 'f', name: 'f', domainKind: 'variety', domainId: 'Y', codomainKind: 'variety', codomainId: 'S' }
  ];
  api.state.activeHomologyTarget = { kind: 'map', id: 'f' };

  const domainGeometry = api.geometryFromVariety(domain);
  const pullbackDef = api.homologyClassDefinitions(domainGeometry)
    .find((def) => def.id === 'pullback_f_point');
  assert(pullbackDef);
  const pullbackVariableId = api.homologyDefVariableId(pullbackDef, domainGeometry);
  const pullbackContext = api.mapHomologyPromotionContext(pullbackDef.id, domain.id);
  assert(api.addMapHomologyClassToTargetHomology(pullbackDef, pullbackContext));
  const promotedPullback = domain.homology.customClasses.find((item) => item.id === pullbackDef.id);
  assert(promotedPullback);
  assert.strictEqual(promotedPullback.special, 'map-homology');
  assert.strictEqual(promotedPullback.variableId, pullbackVariableId);
  const promotedDomainGeometry = api.geometryFromVariety(domain);
  assert.strictEqual(
    api.homologyClassDefinitions(promotedDomainGeometry).find((def) => def.id === pullbackDef.id).variableId,
    pullbackVariableId
  );

  const point = { id: 'p', type: 'point', dim: '0', name: 'p' };
  const target = { id: 'X', type: 'abstract', dim: '2', name: 'X' };
  api.state.varieties = [point, target];
  api.state.maps = [
    { id: 'i', name: 'i', domainKind: 'variety', domainId: 'p', codomainKind: 'variety', codomainId: 'X' }
  ];
  api.state.activeHomologyTarget = { kind: 'map', id: 'i' };

  const targetGeometry = api.geometryFromVariety(target);
  const pushforwardDef = api.homologyClassDefinitions(targetGeometry)
    .find((def) => def.kind.includes('pushforward'));
  assert(pushforwardDef);
  const pushforwardVariableId = api.homologyDefVariableId(pushforwardDef, targetGeometry);
  const pushforwardContext = api.mapHomologyPromotionContext(pushforwardDef.id, target.id);
  assert(api.addMapHomologyClassToTargetHomology(pushforwardDef, pushforwardContext));
  const promotedPushforward = target.homology.customClasses.find((item) => item.id === pushforwardDef.id);
  assert(promotedPushforward);
  assert.strictEqual(promotedPushforward.special, 'map-homology');
  assert.strictEqual(promotedPushforward.variableId, pushforwardVariableId);
  const promotedTargetGeometry = api.geometryFromVariety(target);
  assert.strictEqual(
    api.homologyClassDefinitions(promotedTargetGeometry).find((def) => def.id === pushforwardDef.id).variableId,
    pushforwardVariableId
  );
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

function testBlowupPointConstructionDefaultsCenterAndExceptionalClass() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(X)',
    name: '\\operatorname{Bl}_{p}(X)'
  });

  assert(blowup);
  assert.strictEqual(blowup.name, '\\operatorname{Bl}_{p}(X)');
  assert.strictEqual(blowup.construction.pointId, null);
  assert.strictEqual(blowup.construction.pointLabel, 'p');
  assert.strictEqual(api.state.maps[0].construction.pointId, null);
  assert.strictEqual(api.state.maps[0].construction.pointLabel, 'p');

  const geometry = api.geometryFromVariety(blowup);
  const exceptional = api.homologyClassDefinitions(geometry).find((def) => def.id === 'exceptional_divisor');
  assert(exceptional);
  assert.strictEqual(exceptional.symbolLatex, 'E');
  assert.strictEqual(exceptional.degree, 1);

  const exceptionalId = api.homologyVariableId('exceptional_divisor', geometry);
  const square = api.polyFromPowers({ [exceptionalId]: 2 });
  const reduced = api.applyHomologyRules(square, { geometry, homology: geometry.homology });
  assert.strictEqual(api.formatPolyPlain(reduced), '-[p]');

  const pointPullbackRule = geometry.homology.rules.find((rule) => rule.id === 'blowup-point-pullback');
  assert.strictEqual(pointPullbackRule, undefined);
  assert.strictEqual(
    api.homologyClassDefinitions(geometry).some((def) => def.id === `pullback_${api.state.maps[0].id}_point`),
    false
  );
  const pointPullbackDefault = api.defaultMapHomologyRulesForGeometry(geometry)
    .find((rule) => rule.id === `default-blowdown-point-pullback-${api.state.maps[0].id}`);
  assert(pointPullbackDefault);
  const pullbackPointId = Object.keys(pointPullbackDefault.lhs.powers)[0];
  assert(pullbackPointId.startsWith('map_pullback_'));
  const pointPullback = api.polyFromPowers({ [pullbackPointId]: 1 });
  const reducedPointPullback = api.applyHomologyRules(pointPullback, { geometry, homology: geometry.homology });
  assert.strictEqual(api.formatPolyPlain(reducedPointPullback), '[p]');
}

function testBlowupMapDefaultsAreGeneratedAndDeletable() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(X)',
    name: '\\operatorname{Bl}_{p}(X)'
  });
  const map = api.state.maps[0];
  const baseGeometry = api.geometryFromVariety(base);
  const blowupGeometry = api.geometryFromVariety(blowup);
  const rules = api.defaultMapHomologyRulesForGeometry(baseGeometry);
  const unitRule = rules.find((rule) => rule.id === `default-blowdown-unit-pushforward-${map.id}`);
  assert(unitRule);
  const unitPushforwardId = Object.keys(unitRule.lhs.powers)[0];
  const reducedUnitPushforward = api.applyHomologyRules(api.polyFromPowers({ [unitPushforwardId]: 1 }), {
    geometry: baseGeometry,
    homology: baseGeometry.homology
  });
  assert.strictEqual(api.formatPolyPlain(reducedUnitPushforward), '1');

  api.state.activeHomologyTarget = { kind: 'map', id: map.id };
  assert(api.deleteMapHomologyRuleById(unitRule.id));
  const suppressedGeometry = api.geometryFromVariety(base);
  assert.strictEqual(api.defaultMapHomologyRulesForGeometry(suppressedGeometry).some((rule) => rule.id === unitRule.id), false);
  const unreducedUnitPushforward = api.applyHomologyRules(api.polyFromPowers({ [unitPushforwardId]: 1 }), {
    geometry: suppressedGeometry,
    homology: suppressedGeometry.homology
  });
  assert.notStrictEqual(api.formatPolyPlain(unreducedUnitPushforward), '1');

  assert.strictEqual(
    (blowupGeometry.homology?.customClasses || []).some((def) => def.id === `pullback_${map.id}_point`),
    false
  );
  assert.strictEqual(rules.some((rule) => rule.id.startsWith(`default-blowdown-projection-${map.id}-`)), false);
}

function testBlowupOfGrassmannianAddsPullbacksAndUsesProjectionFormula() {
  const api = loadCalculator();
  const base = {
    id: 'G',
    type: 'grassmannian',
    dim: '4',
    name: '\\operatorname{Gr}(2,4)',
    grassmannianR: '2',
    grassmannianN: '4',
    labelX: 0.4,
    labelY: 0.7
  };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(\\operatorname{Gr}(2,4))',
    name: '\\operatorname{Bl}_{p}(\\operatorname{Gr}(2,4))'
  });
  const map = api.state.maps[0];
  const baseGeometry = api.geometryFromVariety(base);
  const blowupGeometry = api.geometryFromVariety(blowup);
  const pullbackC1 = (blowupGeometry.homology?.customClasses || [])
    .find((item) => item.id === `pullback_${map.id}_grassmannian_s_1`);
  const pullbackC2 = (blowupGeometry.homology?.customClasses || [])
    .find((item) => item.id === `pullback_${map.id}_grassmannian_s_2`);
  assert(pullbackC1);
  assert(pullbackC2);
  assert.strictEqual(pullbackC1.special, 'map-homology');
  assert.strictEqual(pullbackC1.variableId, `map_pullback_${map.id}_homology_v_${base.id}_grassmannian_s_1`);
  assert.strictEqual(
    (blowupGeometry.homology?.customClasses || []).some((item) => item.id === `pullback_${map.id}_point`),
    false
  );
  assert.strictEqual(
    api.defaultMapHomologyRulesForGeometry(baseGeometry)
      .some((rule) => rule.id.startsWith(`default-blowdown-projection-${map.id}-`)),
    false
  );

  api.state.activeHomologyTarget = { kind: 'map', id: map.id };
  assert.strictEqual(
    api.homologyClassDefinitions(baseGeometry)
      .some((def) => def.id === `pushforward_${map.id}_${pullbackC1.id}`),
    false
  );
  const pullbackC1Def = api.homologyClassDefinitions(blowupGeometry).find((def) => def.id === pullbackC1.id);
  const reducedPushforward = api.pushforwardPolynomialByDegree(
    map,
    api.polyFromPowers({ [api.homologyDefVariableId(pullbackC1Def, blowupGeometry)]: 1 }),
    blowupGeometry.dim,
    baseGeometry.dim,
    { proper: false }
  );
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(reducedPushforward, {
    geometry: baseGeometry,
    homology: baseGeometry.homology
  })), 'c_1(S)');

  const exceptionalDef = api.homologyClassDefinitions(blowupGeometry).find((def) => def.id === 'exceptional_divisor');
  const c1TimesExceptional = api.polyFromPowers({
    [api.homologyDefVariableId(pullbackC1Def, blowupGeometry)]: 1,
    [api.homologyDefVariableId(exceptionalDef, blowupGeometry)]: 1
  });
  const productPushforward = api.pushforwardPolynomialByDegree(
    map,
    c1TimesExceptional,
    blowupGeometry.dim,
    baseGeometry.dim,
    { proper: false }
  );
  assert.strictEqual(api.formatPolyPlain(productPushforward), 'c_1(S)*beta_*left(Eright)');
}

function testPointBlowupHodgeNumbersAddExceptionalDiagonal() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^3', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(\\mathbb{P}^3)',
    name: '\\operatorname{Bl}_{p}(\\mathbb{P}^3)'
  });
  const geometry = api.geometryFromVariety(blowup);
  const hodge = api.buildHodgeNumbers(geometry);

  assert.strictEqual(hodge.entries[0][0].plain, '1');
  assert.strictEqual(hodge.entries[1][1].plain, '2');
  assert.strictEqual(hodge.entries[2][2].plain, '2');
  assert.strictEqual(hodge.entries[3][3].plain, '1');
  assert.strictEqual(hodge.entries[1][2].plain, '0');
  assert(hodge.message.includes('Point blow-up'));
}

function testCurvePointBlowupHodgeNumbersAreUnchanged() {
  const api = loadCalculator();
  const base = { id: 'C', type: 'curve', dim: '1', genus: '3', name: 'C', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(C)',
    name: '\\operatorname{Bl}_{p}(C)'
  });
  const hodge = api.buildHodgeNumbers(api.geometryFromVariety(blowup));

  assert.strictEqual(hodge.entries[0][0].plain, '1');
  assert.strictEqual(hodge.entries[0][1].plain, '3');
  assert.strictEqual(hodge.entries[1][0].plain, '3');
  assert.strictEqual(hodge.entries[1][1].plain, '1');
  assert(hodge.message.includes('unchanged'));
}

function testSymbolicGenusCurvePointBlowupHodgeNumbersAreUnchanged() {
  const api = loadCalculator();
  const base = { id: 'C', type: 'curve', dim: '1', genus: 'g', name: 'C', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const blowup = api.createBlowupPointConstruction({
    base,
    point: null,
    centerLabel: 'p',
    defaultName: '\\operatorname{Bl}_{p}(C)',
    name: '\\operatorname{Bl}_{p}(C)'
  });
  const hodge = api.buildHodgeNumbers(api.geometryFromVariety(blowup));

  assert.strictEqual(hodge.entries[0][0].plain, '1');
  assert.strictEqual(hodge.entries[0][1].plain, 'g');
  assert.strictEqual(hodge.entries[1][0].plain, 'g');
  assert.strictEqual(hodge.entries[1][1].plain, '1');
  assert(hodge.message.includes('unchanged'));
}

function testRamifiedCoverConstructionCreatesCoverMapAndHomology() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 3,
    coverMode: 'general',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: 'Y',
    name: 'Y'
  });

  assert(cover);
  assert.strictEqual(api.state.varieties.length, 2);
  assert.strictEqual(api.state.maps.length, 1);
  const map = api.state.maps[0];
  assert.strictEqual(cover.construction.type, 'ramified-cover');
  assert.strictEqual(map.construction.type, 'ramified-cover-map');
  assert.strictEqual(map.domainId, cover.id);
  assert.strictEqual(map.codomainId, 'X');
  assert.strictEqual(api.geometryFromVariety(cover).dim, api.geometryFromVariety(base).dim);
  assert(cover.parents.some((item) => item.id === 'X' && item.role === 'base'));

  const baseGeometry = api.geometryFromVariety(base);
  const coverGeometry = api.geometryFromVariety(cover);
  const branch = api.homologyClassDefinitions(baseGeometry).find((def) => def.id === api.HOMOLOGY_BRANCH_DIVISOR_CLASS);
  const ramification = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS);
  assert(branch);
  assert(ramification);
  assert.strictEqual(branch.cohomologyDegree, 2);
  assert.strictEqual(ramification.cohomologyDegree, 2);

  const rule = api.defaultMapHomologyRulesForGeometry(baseGeometry)
    .find((item) => item.id === `default-ramified-cover-unit-pushforward-${map.id}`);
  assert(rule);
  const unitPushforwardId = Object.keys(rule.lhs.powers)[0];
  const reduced = api.applyHomologyRules(api.polyFromPowers({ [unitPushforwardId]: 1 }), {
    geometry: baseGeometry,
    homology: baseGeometry.homology
  });
  assert.strictEqual(api.formatPolyPlain(reduced), '3');
}

function testCyclicRamifiedCoverAddsBranchRamificationRule() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 4,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: 'Y',
    name: 'Y'
  });
  const map = api.state.maps[0];
  const coverGeometry = api.geometryFromVariety(cover);
  const rule = coverGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-cyclic-branch-${map.id}`);
  assert(rule);
  const rhs = rule.rhs[0];
  assert.strictEqual(rhs.coefficient, '4');
  const rhsId = Object.keys(rhs.powers)[0];
  const ramificationDef = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS);
  assert.strictEqual(rhsId, api.homologyDefVariableId(ramificationDef, coverGeometry));
}

function testSmoothCyclicRamifiedCoverAddsRootClassAndHodgeNumbers() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{3}}',
    name: 'Y'
  });

  const baseGeometry = api.geometryFromVariety(base);
  const coverGeometry = api.geometryFromVariety(cover);
  const root = api.homologyClassDefinitions(baseGeometry).find((def) => def.id === api.HOMOLOGY_CYCLIC_ROOT_CLASS);
  assert(root);
  assert.strictEqual(root.cohomologyDegree, 2);
  const rootRule = baseGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-root-branch-${cover.id}`);
  assert(rootRule);
  assert.strictEqual(rootRule.rhs[0].coefficient, '2');

  const hodge = api.buildHodgeNumbers(coverGeometry);
  assert.strictEqual(hodge.entries[0][0].plain, '1');
  assert.strictEqual(hodge.entries[1][1].plain, '1');
  assert.strictEqual(hodge.entries[2][1].plain, '10');
  assert.strictEqual(hodge.entries[1][2].plain, '10');
  assert.strictEqual(hodge.entries[3][3].plain, '1');
  assert(hodge.message.includes('smooth hypersurface of degree 4'));
  assert(hodge.message.includes('L=O(2)'));
  assert.strictEqual(cover.construction.branchDegree, 4);
  assert.strictEqual(cover.construction.rootTwist, 2);
  const rootSheaf = api.state.sheaves.find((item) => item.id === cover.construction.rootSheafId);
  assert(rootSheaf);
  assert.strictEqual(rootSheaf.construction.type, 'ramified-cover-root');
  assert.strictEqual(rootSheaf.type, 'twist');
  assert.strictEqual(rootSheaf.twist, '2');
  assert.strictEqual(rootSheaf.baseVarietyId, 'P3');

  cover.construction.branchDegree = 8;
  cover.construction.rootTwist = 4;
  const branchEightHodge = api.buildHodgeNumbers(api.geometryFromVariety(cover));
  assert.strictEqual(branchEightHodge.entries[2][1].plain, '149');
}

function testTangentHomologyPromotionUsesVarietyDisplay() {
  const api = loadCalculator();
  const variety = { id: 'X', type: 'abstract', dim: '2', name: 'X' };
  const tangent = { id: 'TX', type: 'tangent', basis: 'chern', rank: '2', name: '\\mathcal{T}_{X}', baseVarietyId: 'X' };
  api.state.varieties = [variety];
  api.state.sheaves = [tangent];
  api.state.activeHomologyTarget = { kind: 'sheaf', id: 'TX' };

  const geometry = api.geometryFromVariety(variety);
  const sheaf = api.sheafFromObject(tangent, geometry);
  api.state.lastResult = api.buildCharacteristicClasses(geometry, sheaf);
  const context = { sheafObject: tangent, sheaf, variety, geometry, result: api.state.lastResult };
  const def = api.tangentChernSheafDefForIndex(context, 1);
  const lhs = api.renderSheafHomologyLhs(def);
  const action = api.renderSheafHomologySpecialAction(def, context);

  assert(lhs.includes('data-add-tangent-chern-class="1"'));
  assert(lhs.includes('c_{1}(X)='));
  assert(!lhs.includes('\\mathcal{T}_{X}'));
  assert(!action.includes('add class'));
  api.requestSheafChernClassPromotion('1', { tangent: true });
  assert.strictEqual(api.state.homologyClassPromotionPrompt.type, 'sheaf-chern');
  assert.strictEqual(api.state.homologyClassPromotionPrompt.tangent, true);
  assert.strictEqual(api.state.homologyClassPromotionPrompt.tangentIndex, 1);
}

function testRamifiedCoverTangentPromotionCopiesComputedRuleToVariety() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: 'Y',
    name: 'Y'
  });
  const tangent = api.state.sheaves.find((item) => item.construction?.ramifiedCoverTangent === true);
  assert(tangent);
  api.state.activeHomologyTarget = { kind: 'sheaf', id: tangent.id };
  let coverGeometry = api.geometryFromVariety(cover);
  const sheaf = api.sheafFromObject(tangent, coverGeometry);
  api.state.lastResult = api.buildCharacteristicClasses(coverGeometry, sheaf);
  const context = { sheafObject: tangent, sheaf, variety: cover, geometry: coverGeometry, result: api.state.lastResult };
  const def = api.tangentChernSheafDefForIndex(context, 1);
  assert(api.computedSheafChernClassRule(def, context));

  api.requestSheafChernClassPromotion('1', { tangent: true });
  assert.strictEqual(api.state.homologyClassPromotionPrompt.tangent, true);
  api.answerSheafChernClassPrompt('yes');
  coverGeometry = api.geometryFromVariety(cover);
  const tangentClassId = api.tangentChernHomologyClassId(1);
  const tangentClass = cover.homology.customClasses.find((item) => item.id === tangentClassId);
  assert(tangentClass);
  assert.strictEqual(tangentClass.symbol, 'c_{1}(Y)');
  assert.strictEqual(api.sheafChernClassUsesBaseHomology(def, {
    ...context,
    geometry: coverGeometry,
    result: api.state.lastResult
  }), true);

  const variableId = api.homologyVariableId(tangentClassId, coverGeometry);
  const rule = cover.homology.rules.find((item) => item.lhs?.powers?.[variableId] === 1);
  assert(rule);
  const rhsIds = new Set(rule.rhs.flatMap((term) => Object.keys(term.powers || {})));
  assert(rhsIds.has(api.homologyVariableId(api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS, coverGeometry)));
  assert(Array.from(rhsIds).some((id) => id.startsWith('map_pullback_') && id.includes('_tangent_1')));

  const reduced = api.applyHomologyRules(api.polyFromPowers({ [variableId]: 1 }), {
    geometry: coverGeometry,
    homology: coverGeometry.homology
  });
  const plain = api.formatPolyPlain(reduced);
  assert(plain.includes('-R'));
  assert(plain.includes('c_1(X)'));
}

function testRamifiedCoverPresetRoundTripAndDegreeOneSuppression() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 1,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: 'Y',
    name: 'Y'
  });
  const coverGeometry = api.geometryFromVariety(cover);
  assert.strictEqual(api.homologyClassDefinitions(api.geometryFromVariety(base)).some((def) => def.id === api.HOMOLOGY_BRANCH_DIVISOR_CLASS), false);
  assert.strictEqual(api.homologyClassDefinitions(coverGeometry).some((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS), false);

  const presetText = JSON.stringify(api.buildPresetState());
  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredCover = restored.state.varieties.find((item) => item.construction?.type === 'ramified-cover');
  const restoredMap = restored.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  assert(restoredCover);
  assert(restoredMap);
  assert.strictEqual(restoredCover.construction.degree, 1);
  assert.strictEqual(restoredCover.construction.coverMode, 'cyclic');
  assert.strictEqual(restoredCover.construction.branchSymbol, 'B');
  assert.strictEqual(restoredCover.construction.ramificationSymbol, 'R');
}

function testRamifiedCoverPresetRoundTripBranchDegree() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{3}}',
    name: 'Y'
  });

  const presetText = JSON.stringify(api.buildPresetState());
  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredCover = restored.state.varieties.find((item) => item.construction?.type === 'ramified-cover');
  const restoredMap = restored.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  assert(restoredCover);
  assert(restoredMap);
  assert.strictEqual(restoredCover.construction.branchDegree, 4);
  assert.strictEqual(restoredCover.construction.rootTwist, 2);
  assert.strictEqual(restoredMap.construction.branchDegree, 4);
  assert.strictEqual(restoredMap.construction.rootTwist, 2);
  const restoredRoot = restored.state.sheaves.find((item) => item.id === restoredCover.construction.rootSheafId);
  assert(restoredRoot);
  assert.strictEqual(restoredRoot.construction.type, 'ramified-cover-root');
  assert.strictEqual(restoredRoot.construction.branchDegree, 4);
}

function testRamifiedCoverMapConstructionUpdatesCoverData() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{3}}',
    name: 'Y'
  });
  const map = api.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  map.construction.degree = 3;
  map.construction.coverMode = 'cyclic';
  map.construction.smoothCyclic = true;
  map.construction.branchDegree = 6;
  map.construction.rootTwist = 2;
  map.construction.branchSymbol = 'D';
  map.construction.ramificationSymbol = 'E';

  api.refreshConstructedObjects();

  assert.strictEqual(cover.construction.degree, 3);
  assert.strictEqual(cover.construction.coverMode, 'cyclic');
  assert.strictEqual(cover.construction.smoothCyclic, true);
  assert.strictEqual(cover.construction.branchDegree, 6);
  assert.strictEqual(cover.construction.rootTwist, 2);
  assert.strictEqual(cover.construction.branchSymbol, 'D');
  assert.strictEqual(cover.construction.ramificationSymbol, 'E');
  const rootSheaf = api.state.sheaves.find((item) => item.id === cover.construction.rootSheafId);
  assert(rootSheaf);
  assert.strictEqual(rootSheaf.twist, '2');
  assert.strictEqual(rootSheaf.construction.branchDegree, 6);
}

function testRamifiedCoverMapGeneralModeSuppressesSmoothCyclicData() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{3}}',
    name: 'Y'
  });
  const map = api.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  map.construction.coverMode = 'general';
  map.construction.smoothCyclic = false;
  map.construction.branchDegree = null;
  map.construction.rootTwist = null;

  api.refreshConstructedObjects();

  assert.strictEqual(cover.construction.coverMode, 'general');
  assert.strictEqual(cover.construction.smoothCyclic, false);
  assert.strictEqual(cover.construction.branchDegree, null);
  assert.strictEqual(cover.construction.rootTwist, null);
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.type === 'ramified-cover-root'), false);
  assert.strictEqual(api.buildHodgeNumbers(api.geometryFromVariety(cover)).entries[2][1].plain, 'h^2,1');
}

function testRamifiedCoverRefreshPreservesConstructionAfterDimensionEdit() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'general',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: '\\widetilde{X}',
    name: '\\widetilde{X}'
  });
  cover.dim = '5';
  cover.type = 'curve';

  api.refreshConstructedObjects();

  assert.strictEqual(cover.construction.type, 'ramified-cover');
  assert.strictEqual(cover.type, 'abstract');
  assert.strictEqual(cover.dim, '3');
  const map = api.state.maps.find((item) => item.id === cover.construction.mapId);
  assert.strictEqual(map.construction.type, 'ramified-cover-map');
}

function testSmoothCyclicCurveRamifiedCoverUsesRiemannHurwitz() {
  const api = loadCalculator();
  const base = { id: 'P1', type: 'projective', dim: '1', name: '\\mathbb{P}^{1}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{1}}',
    name: 'Y'
  });
  const hodge = api.buildHodgeNumbers(api.geometryFromVariety(cover));

  assert.strictEqual(hodge.entries[0][1].plain, '1');
  assert.strictEqual(hodge.entries[1][0].plain, '1');
  assert(hodge.message.includes('Riemann-Hurwitz'));
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
    genericallyGenerated: true,
    basePointFree: true,
    defaultTargetName: '\\operatorname{Gr}(2,4)',
    targetName: '\\operatorname{Gr}(2,4)',
    mapName: '\\varphi_{\\mathcal{E}}'
  });

  assert(map);
  assert.strictEqual(api.state.varieties.length, 2);
  assert.strictEqual(api.state.maps.length, 1);
  const target = api.state.varieties[1];
  const grassmannianMap = api.state.maps[0];
  assert.strictEqual(target.type, 'grassmannian');
  assert.strictEqual(target.construction.type, 'grassmannian-target');
  assert.strictEqual(grassmannianMap.domainId, 'X');
  assert.strictEqual(grassmannianMap.codomainId, target.id);
  assert.strictEqual(grassmannianMap.construction.type, 'grassmannian-map');
  assert.strictEqual(grassmannianMap.construction.basePointFree, true);

  const universal = api.state.sheaves.find((item) => item.type === 'universal-bundle' && item.baseVarietyId === target.id);
  assert(universal?.hiddenOnCanvas);
  const dual = api.state.sheaves.find((item) => item.construction?.type === 'dual' && item.construction.sheafId === universal.id);
  assert(dual?.hiddenOnCanvas);
  const pullback = api.state.sheaves.find((item) => item.construction?.grassmannianMapPullback);
  assert(pullback);
  assert.strictEqual(pullback.baseVarietyId, 'X');
  assert.strictEqual(pullback.construction.mapId, grassmannianMap.id);
  assert.strictEqual(pullback.construction.sheafId, dual.id);
  assert.strictEqual(pullback.construction.sourceSheafId, 'E');
  assert.strictEqual(api.state.activeSheafId, pullback.id);
  const geometry = api.geometryFromVariety(base);
  const sourceSheaf = api.sheafFromObject(bundle, geometry);
  const sourceRows = api.buildCharacteristicClasses(geometry, sourceSheaf).classRows;
  assert(chernPlain(sourceRows).includes('varphi_E^*'));
  assert(!chernPlain(sourceRows).includes('c_1(E)'));
  const sourceRules = bundle.homology?.rules || [];
  const c1Rule = sourceRules.find((rule) => rule.lhs?.powers?.sheaf_E_c1 === 1);
  const c2Rule = sourceRules.find((rule) => rule.lhs?.powers?.sheaf_E_c2 === 1);
  assert(c1Rule, 'expected a default rule for c_1(E)');
  assert(c2Rule, 'expected a default rule for c_2(E)');
  assert.strictEqual(c1Rule.preserveUnknownVariables, true);
  assert.strictEqual(c1Rule.rhs[0].coefficient, '-1');
  assert.strictEqual(c2Rule.rhs[0].coefficient, '1');
  const c1RhsKeys = Object.keys(c1Rule.rhs[0].powers || {});
  assert.strictEqual(c1RhsKeys.length, 1);
  assert(c1RhsKeys[0].startsWith(`map_pullback_${grassmannianMap.id}_`));
  assert(c1RhsKeys[0].endsWith('grassmannian_s_1'));

  const restored = loadCalculator();
  api.state.activeVarietyId = 'X';
  api.state.activeSheafId = pullback.id;
  restored.importPresetFromText(JSON.stringify(api.buildPresetState()));
  const restoredPullback = restored.state.sheaves.find((item) => item.construction?.grassmannianMapPullback);
  assert(restoredPullback);
  assert.strictEqual(restoredPullback.construction.sourceSheafId, 'E');
  assert.strictEqual(restored.state.maps[0].construction.basePointFree, true);
  const restoredSource = restored.state.sheaves.find((item) => item.id === 'E');
  const restoredRule = restoredSource.homology?.rules?.find((rule) => rule.lhs?.powers?.sheaf_E_c1 === 1);
  assert(restoredRule);
  assert.strictEqual(restoredRule.preserveUnknownVariables, true);
}

function testGrassmannianMapGenericallyGeneratedOnlyIsRational() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  const bundle = { id: 'E', type: 'locally-free', basis: 'chern', rank: '2', name: '\\mathcal{E}', baseVarietyId: 'X', labelX: 0.45, labelY: 0.4 };
  api.state.varieties = [base];
  api.state.sheaves = [bundle];

  const map = api.createGrassmannianMapConstruction({
    bundle,
    base,
    params: { r: 2, n: 5, dim: 6 },
    genericallyGenerated: true,
    basePointFree: false,
    defaultTargetName: '\\operatorname{Gr}(2,5)',
    targetName: '\\operatorname{Gr}(2,5)',
    mapName: '\\varphi_{\\mathcal{E}}'
  });

  assert(map);
  assert.strictEqual(api.state.varieties.length, 2);
  assert.strictEqual(api.state.maps.length, 1);
  assert.strictEqual(api.state.sheaves.length, 1);
  assert.strictEqual(map.construction.genericallyGenerated, true);
  assert.strictEqual(map.construction.basePointFree, false);
  assert.strictEqual(map.construction.linearSystemDimension, 5);
}

function testRankOneGrassmannianMapUsesProjectiveSpaceAndTwists() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  const bundle = { id: 'L', type: 'locally-free', basis: 'chern', rank: '1', name: '\\mathcal{L}', baseVarietyId: 'X', labelX: 0.45, labelY: 0.4 };
  api.state.varieties = [base];
  api.state.sheaves = [bundle];

  api.createGrassmannianMapConstruction({
    bundle,
    base,
    params: { r: 1, n: 4, dim: 3 },
    genericallyGenerated: true,
    basePointFree: true,
    defaultTargetName: '\\mathbb{P}^{3}',
    targetName: '\\mathbb{P}^{3}',
    mapName: '\\varphi_{\\mathcal{L}}'
  });

  const target = api.state.varieties[1];
  const map = api.state.maps[0];
  assert.strictEqual(target.type, 'projective');
  assert.strictEqual(target.name, '\\mathbb{P}^{3}');
  assert.strictEqual(target.construction.projectiveModel, true);
  assert.strictEqual(map.construction.projectiveModel, true);
  const tautological = api.state.sheaves.find((item) => item.baseVarietyId === target.id && item.type === 'twist' && item.twist === '-1');
  const dual = api.state.sheaves.find((item) => item.baseVarietyId === target.id && item.type === 'twist' && item.twist === '1');
  assert(tautological);
  assert(dual);
  assert.strictEqual(tautological.name, '\\mathcal{O}_{\\mathbb{P}^{3}}(-1)');
  assert.strictEqual(dual.name, '\\mathcal{O}_{\\mathbb{P}^{3}}(1)');
  assert.strictEqual(dual.construction ?? undefined, undefined);
  const rule = bundle.homology?.rules?.find((item) => item.lhs?.powers?.sheaf_L_c1 === 1);
  assert(rule);
  assert.strictEqual(rule.rhs[0].coefficient, '1');
  assert(Object.keys(rule.rhs[0].powers || {})[0].endsWith('_H'));
}

function testIdealSheafConstructionCreatesHiddenSesAndImageClass() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '1', name: 'X', labelX: 0.35, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '3', name: 'Y', labelX: 0.62, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];

  const ideal = api.createIdealSheafConstruction({
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'Y',
    defaultName: 'I_X',
    name: 'I_X',
    nameDirty: false
  });

  assert(ideal);
  assert.strictEqual(ideal.baseVarietyId, 'Y');
  assert.strictEqual(ideal.construction.type, 'ses-term');
  assert.strictEqual(ideal.construction.role, 'subobject');
  assert.strictEqual(ideal.construction.idealSheafMapId, 'f');
  assert.strictEqual(api.state.sequences.length, 1);
  assert.strictEqual(api.state.sequences[0].sheafIds[0], ideal.id);
  assert.strictEqual(api.state.maps.filter((item) => item.domainKind === 'sheaf').length, 2);
  assert(api.state.sheaves.find((item) => item.baseVarietyId === 'X' && item.type === 'structure')?.hiddenOnCanvas);
  assert(api.state.sheaves.find((item) => item.baseVarietyId === 'Y' && item.type === 'structure')?.hiddenOnCanvas);
  const pushed = api.state.sheaves.find((item) => item.construction?.type === 'pushforward');
  assert(pushed?.hiddenOnCanvas);
  assert.strictEqual(pushed.construction.mapId, 'f');
  assert.strictEqual(pushed.construction.proper, true);

  const imageClass = target.homology.customClasses.find((item) => item.id === 'ideal_f_image');
  assert(imageClass);
  assert.strictEqual(imageClass.symbol, '[X]');
  assert.strictEqual(imageClass.degree, 2);
  assert.strictEqual(imageClass.cohomologyDegree, 4);
  const rule = target.homology.rules.find((item) => item.id === 'map-rule-map_pushforward_f_homology_v_X_unit');
  assert(rule);
  assert(rule.rhs.some((term) => term.powers.homology_v_Y_ideal_f_image === 1));
  assert.strictEqual(api.state.activeSheafId, ideal.id);
}

function testNormalBundleConstructionCreatesHiddenTangentSes() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '5', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];

  const normal = api.createNormalBundleConstruction({
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{N}_{X/Y}',
    name: '\\mathcal{N}_{X/Y}',
    nameDirty: false
  });

  assert(normal);
  assert.strictEqual(normal.baseVarietyId, 'X');
  assert.strictEqual(normal.rank, '2');
  assert.strictEqual(normal.construction.type, 'ses-term');
  assert.strictEqual(normal.construction.role, 'quotient');
  assert.strictEqual(normal.construction.normalBundleMapId, 'f');
  assert.strictEqual(normal.construction.cleanEmbeddingConfirmed, true);

  const sourceTangent = api.state.sheaves.find((item) => item.id === normal.construction.sourceTangentSheafId);
  const targetTangent = api.state.sheaves.find((item) => item.id === normal.construction.targetTangentSheafId);
  const pulledTargetTangent = api.state.sheaves.find((item) => item.id === normal.construction.pulledTargetTangentSheafId);
  assert.strictEqual(sourceTangent?.type, 'tangent');
  assert.strictEqual(sourceTangent.baseVarietyId, 'X');
  assert.strictEqual(sourceTangent.hiddenOnCanvas, true);
  assert.strictEqual(targetTangent?.type, 'tangent');
  assert.strictEqual(targetTangent.baseVarietyId, 'Y');
  assert.strictEqual(targetTangent.hiddenOnCanvas, true);
  assert.strictEqual(pulledTargetTangent?.construction?.type, 'pullback');
  assert.strictEqual(pulledTargetTangent.construction.mapId, 'f');
  assert.strictEqual(pulledTargetTangent.construction.sheafId, targetTangent.id);
  assert.strictEqual(pulledTargetTangent.construction.exact, true);
  assert.strictEqual(pulledTargetTangent.construction.derived, false);
  assert.strictEqual(pulledTargetTangent.hiddenOnCanvas, true);
  assert.match(pulledTargetTangent.name, /^f\^\{\*\}/);

  assert.strictEqual(api.state.sequences.length, 1);
  const sequence = api.state.sequences[0];
  assert.strictEqual(sequence.sheafIds.join(','), [sourceTangent.id, pulledTargetTangent.id, normal.id].join(','));
  assert.strictEqual(sequence.baseVarietyId, 'X');
  assert.strictEqual(sequence.tail.hiddenOnCanvas, true);
  assert.strictEqual(api.state.maps.filter((item) => item.domainKind === 'sheaf').length, 2);
  sequence.mapIds.forEach((mapId) => {
    const sequenceMap = api.state.maps.find((item) => item.id === mapId);
    assert.strictEqual(sequenceMap.hiddenOnCanvas, true);
  });
  assert.strictEqual(api.state.activeSheafId, normal.id);
}

function testRelativeTangentConstructionCreatesHiddenTangentSes() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '1', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];

  const relative = api.createRelativeSheafConstruction({
    type: 'tangent',
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{T}_{X/Y}',
    name: '\\mathcal{T}_{X/Y}',
    nameDirty: false
  });

  assert(relative);
  assert.strictEqual(relative.baseVarietyId, 'X');
  assert.strictEqual(relative.rank, '2');
  assert.strictEqual(relative.construction.type, 'ses-term');
  assert.strictEqual(relative.construction.role, 'subobject');
  assert.strictEqual(relative.construction.relativeSheafMapId, 'f');
  assert.strictEqual(relative.construction.relativeSheafType, 'tangent');
  assert.strictEqual(relative.construction.smoothSubmersionConfirmed, true);

  const sourceTangent = api.state.sheaves.find((item) => item.id === relative.construction.sourceDifferentialSheafId);
  const targetTangent = api.state.sheaves.find((item) => item.id === relative.construction.targetDifferentialSheafId);
  const pulledTargetTangent = api.state.sheaves.find((item) => item.id === relative.construction.pulledTargetDifferentialSheafId);
  assert.strictEqual(sourceTangent?.type, 'tangent');
  assert.strictEqual(sourceTangent.baseVarietyId, 'X');
  assert.strictEqual(sourceTangent.hiddenOnCanvas, true);
  assert.strictEqual(targetTangent?.type, 'tangent');
  assert.strictEqual(targetTangent.baseVarietyId, 'Y');
  assert.strictEqual(targetTangent.hiddenOnCanvas, true);
  assert.strictEqual(pulledTargetTangent?.construction?.type, 'pullback');
  assert.strictEqual(pulledTargetTangent.construction.mapId, 'f');
  assert.strictEqual(pulledTargetTangent.construction.sheafId, targetTangent.id);
  assert.strictEqual(pulledTargetTangent.construction.exact, true);
  assert.strictEqual(pulledTargetTangent.construction.derived, false);
  assert.strictEqual(pulledTargetTangent.hiddenOnCanvas, true);
  assert.strictEqual(relative.construction.sourceSheafIds.join(','), [sourceTangent.id, pulledTargetTangent.id].join(','));

  assert.strictEqual(api.state.sequences.length, 1);
  const sequence = api.state.sequences[0];
  assert.strictEqual(sequence.sheafIds.join(','), [relative.id, sourceTangent.id, pulledTargetTangent.id].join(','));
  assert.strictEqual(sequence.baseVarietyId, 'X');
  assert.strictEqual(sequence.tail.hiddenOnCanvas, true);
  sequence.mapIds.forEach((mapId) => {
    const sequenceMap = api.state.maps.find((item) => item.id === mapId);
    assert.strictEqual(sequenceMap.hiddenOnCanvas, true);
  });
  assert.strictEqual(api.state.activeSheafId, relative.id);
}

function testRelativeCotangentConstructionCreatesHiddenCotangentSes() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '1', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];

  const relative = api.createRelativeSheafConstruction({
    type: 'cotangent',
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\Omega^1_{X/Y}',
    name: '\\Omega^1_{X/Y}',
    nameDirty: false
  });

  assert(relative);
  assert.strictEqual(relative.baseVarietyId, 'X');
  assert.strictEqual(relative.rank, '2');
  assert.strictEqual(relative.construction.type, 'ses-term');
  assert.strictEqual(relative.construction.role, 'quotient');
  assert.strictEqual(relative.construction.relativeSheafMapId, 'f');
  assert.strictEqual(relative.construction.relativeSheafType, 'cotangent');
  assert.strictEqual(relative.construction.smoothSubmersionConfirmed, true);

  const sourceCotangent = api.state.sheaves.find((item) => item.id === relative.construction.sourceDifferentialSheafId);
  const targetCotangent = api.state.sheaves.find((item) => item.id === relative.construction.targetDifferentialSheafId);
  const pulledTargetCotangent = api.state.sheaves.find((item) => item.id === relative.construction.pulledTargetDifferentialSheafId);
  assert.strictEqual(sourceCotangent?.type, 'cotangent');
  assert.strictEqual(sourceCotangent.baseVarietyId, 'X');
  assert.strictEqual(sourceCotangent.hiddenOnCanvas, true);
  assert.strictEqual(targetCotangent?.type, 'cotangent');
  assert.strictEqual(targetCotangent.baseVarietyId, 'Y');
  assert.strictEqual(targetCotangent.hiddenOnCanvas, true);
  assert.strictEqual(pulledTargetCotangent?.construction?.type, 'pullback');
  assert.strictEqual(pulledTargetCotangent.construction.mapId, 'f');
  assert.strictEqual(pulledTargetCotangent.construction.sheafId, targetCotangent.id);
  assert.strictEqual(pulledTargetCotangent.construction.exact, true);
  assert.strictEqual(pulledTargetCotangent.construction.derived, false);
  assert.strictEqual(pulledTargetCotangent.hiddenOnCanvas, true);
  assert.strictEqual(relative.construction.sourceSheafIds.join(','), [pulledTargetCotangent.id, sourceCotangent.id].join(','));

  assert.strictEqual(api.state.sequences.length, 1);
  const sequence = api.state.sequences[0];
  assert.strictEqual(sequence.sheafIds.join(','), [pulledTargetCotangent.id, sourceCotangent.id, relative.id].join(','));
  assert.strictEqual(sequence.baseVarietyId, 'X');
  assert.strictEqual(sequence.tail.hiddenOnCanvas, true);
  sequence.mapIds.forEach((mapId) => {
    const sequenceMap = api.state.maps.find((item) => item.id === mapId);
    assert.strictEqual(sequenceMap.hiddenOnCanvas, true);
  });
  assert.strictEqual(api.state.activeSheafId, relative.id);
}

function testPresetImportPreservesRelativeSheafMarker() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '1', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];
  const relative = api.createRelativeSheafConstruction({
    type: 'cotangent',
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\Omega^1_{X/Y}',
    name: '\\Omega^1_{X/Y}',
    nameDirty: false
  });
  api.state.activeSheafId = relative.id;
  api.state.activeVarietyId = 'X';
  const presetText = JSON.stringify(api.buildPresetState());

  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredRelative = restored.state.sheaves.find((sheaf) => sheaf.name === '\\Omega^1_{X/Y}');
  assert(restoredRelative);
  assert.strictEqual(restoredRelative.construction.relativeSheafMapId, 'f');
  assert.strictEqual(restoredRelative.construction.relativeSheafType, 'cotangent');
  assert.strictEqual(restoredRelative.construction.smoothSubmersionConfirmed, true);
  assert.strictEqual(restoredRelative.rank, '2');
  assert.strictEqual(restored.state.activeSheafId, restoredRelative.id);
}

function testNormalBundleShowKeepsRevealedScaffoldingStable() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '5', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];
  const normal = api.createNormalBundleConstruction({
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{N}_{X/Y}',
    name: '\\mathcal{N}_{X/Y}',
    nameDirty: false
  });
  const counts = () => ({
    tangents: api.state.sheaves.filter((item) => item.type === 'tangent').length,
    pullbacks: api.state.sheaves.filter((item) => item.construction?.type === 'pullback').length,
    sheafMaps: api.state.maps.filter((item) => item.construction?.type === 'short-exact-sequence-map').length,
    sequences: api.state.sequences.length
  });
  const before = counts();

  api.showHiddenCanvasObjects();
  api.refreshConstructedObjects();

  assert.deepStrictEqual(counts(), before);
  const sourceTangent = api.state.sheaves.find((item) => item.id === normal.construction.sourceTangentSheafId);
  const targetTangent = api.state.sheaves.find((item) => item.id === normal.construction.targetTangentSheafId);
  const pulledTargetTangent = api.state.sheaves.find((item) => item.id === normal.construction.pulledTargetTangentSheafId);
  assert.strictEqual(sourceTangent.hiddenOnCanvas, false);
  assert.strictEqual(targetTangent.hiddenOnCanvas, false);
  assert.strictEqual(pulledTargetTangent.hiddenOnCanvas, false);
  const sequence = api.state.sequences.find((item) => item.id === normal.construction.sequenceId);
  assert.strictEqual(sequence.tail.hiddenOnCanvas, false);
  sequence.mapIds.forEach((mapId) => {
    const sequenceMap = api.state.maps.find((item) => item.id === mapId);
    assert.strictEqual(sequenceMap.hiddenOnCanvas, false);
  });
}

function testPresetImportPreservesNormalBundleMarker() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '3', name: 'X', labelX: 0.3, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '5', name: 'Y', labelX: 0.6, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];
  const normal = api.createNormalBundleConstruction({
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'X',
    defaultName: '\\mathcal{N}_{X/Y}',
    name: '\\mathcal{N}_{X/Y}',
    nameDirty: false
  });
  api.state.activeSheafId = normal.id;
  api.state.activeVarietyId = 'X';
  const presetText = JSON.stringify(api.buildPresetState());

  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredNormal = restored.state.sheaves.find((sheaf) => sheaf.name === '\\mathcal{N}_{X/Y}');
  assert(restoredNormal);
  assert.strictEqual(restoredNormal.construction.normalBundleMapId, 'f');
  assert.strictEqual(restoredNormal.construction.cleanEmbeddingConfirmed, true);
  assert.strictEqual(restoredNormal.rank, '2');
  assert.strictEqual(restored.state.activeSheafId, restoredNormal.id);
}

function testPresetImportPreservesIdealSheafMarker() {
  const api = loadCalculator();
  const source = { id: 'X', type: 'abstract', dim: '1', name: 'X', labelX: 0.35, labelY: 0.65 };
  const target = { id: 'Y', type: 'abstract', dim: '3', name: 'Y', labelX: 0.62, labelY: 0.65 };
  const map = { id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' };
  api.state.varieties = [source, target];
  api.state.maps = [map];
  const ideal = api.createIdealSheafConstruction({
    map,
    domain: source,
    codomain: target,
    baseVarietyId: 'Y',
    defaultName: 'I_X',
    name: 'I_X',
    nameDirty: false
  });
  api.state.activeSheafId = ideal.id;
  api.state.activeVarietyId = 'Y';
  const presetText = JSON.stringify(api.buildPresetState());

  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredIdeal = restored.state.sheaves.find((sheaf) => sheaf.name === 'I_X');
  assert(restoredIdeal);
  assert.strictEqual(restoredIdeal.construction.idealSheafMapId, 'f');
  assert.strictEqual(restored.state.activeSheafId, restoredIdeal.id);
  assert.strictEqual(restored.state.varieties.find((item) => item.id === 'Y').homology.customClasses[0].id, 'ideal_f_image');
}

function testHomologyRulePassesAreCapped() {
  const api = loadCalculator();
  assert.strictEqual(api.currentHomologyRulePasses(1), 1);
  assert.strictEqual(api.currentHomologyRulePasses(999), 8);
  api.state.homologyRulePasses = 999;
  assert.strictEqual(api.currentHomologyRulePasses(), 8);
}

function testSymbolicBudgetFallbackKeepsUnsimplifiedPolynomial() {
  const api = loadCalculator();
  const geometry = {
    type: 'abstract',
    dim: 2,
    labelLatex: 'X',
    labelPlain: 'X',
    varietyId: 'X',
    homology: {
      rules: [{
        id: 'budget-rule',
        enabled: true,
        lhs: { powers: { a: 1 } },
        rhs: [
          { coefficient: '1', powers: { b: 1 } },
          { coefficient: '1', powers: { c: 1 } }
        ]
      }]
    }
  };
  api.VARS.clear();
  api.VARS.set('a', { degree: 1, latex: 'a', plain: 'a' });
  api.VARS.set('b', { degree: 1, latex: 'b', plain: 'b' });
  api.VARS.set('c', { degree: 1, latex: 'c', plain: 'c' });
  const poly = api.polyFromPowers({ a: 1 });
  const simplified = api.applyHomologyRules(poly, {
    geometry,
    homology: geometry.homology,
    includeDefaultMapRules: false,
    budget: api.createSymbolicBudget('test', { maxOps: 1, maxTerms: 100, maxMillis: 10000 })
  });
  assert.strictEqual(api.formatPolyPlain(simplified), 'a');
  assert(api.state.symbolicWarnings.some((warning) => warning.includes('symbolic work limit')));
}

function testClassDisplayUsesCappedPasses() {
  const api = loadCalculator();
  api.state.homologyRulePasses = 999;
  const geometry = api.geometryFromVariety({ id: 'X', type: 'abstract', dim: '2', name: 'X' });
  const sheafObject = { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' };
  const sheaf = api.sheafFromObject(sheafObject, geometry);
  const bundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  const options = api.classDisplayOptions(geometry, sheaf);
  assert.strictEqual(options.homologyRulePasses, 8);
  const rows = api.buildClassRows(bundle, geometry.dim, options);
  assert(rows.some((row) => row.key === 'chern'));
}

function testProductPickFlowRegistryCoversCandidatesAndSelection() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '1', name: 'X' },
    { id: 'Y', type: 'abstract', dim: '1', name: 'Y' }
  ];
  api.refs.addObjectKind = { value: 'combined' };
  api.refs.combinedType = { value: 'product' };
  api.state.productDraft = { varietyIds: ['X'] };
  const flow = api.activePickFlow();
  assert.strictEqual(flow.id, 'product');
  assert.strictEqual(api.canvasPickAvailable(), true);
  assert.strictEqual(api.pickFlowSelectedState('variety', 'X'), 'domain');
  assert.strictEqual(api.pickFlowCandidate('variety', 'Y'), true);
  assert.strictEqual(api.pickFlowComplete(flow), false);
  assert(api.pickFlowHint(flow).includes('second variety'));
  const note = { hidden: true, textContent: '' };
  api.syncPickFlowNote(note, 'product', true);
  assert.strictEqual(note.hidden, false);
  assert.strictEqual(note.textContent, api.pickFlowHint(flow));
  assert.strictEqual(api.handleActivePickFlow('sheaf', 'missing'), true);
  assert.deepStrictEqual(api.state.productDraft.varietyIds, ['X']);
}

function testMapCompositionPickFlowRegistryCoversMapCandidates() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '1', name: 'X' },
    { id: 'Y', type: 'abstract', dim: '1', name: 'Y' },
    { id: 'Z', type: 'abstract', dim: '1', name: 'Z' }
  ];
  api.state.maps = [
    { id: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y', name: 'f' },
    { id: 'g', domainKind: 'variety', domainId: 'Y', codomainKind: 'variety', codomainId: 'Z', name: 'g' }
  ];
  api.refs.addObjectKind = { value: 'map' };
  api.refs.mapType = { value: 'composition' };
  api.state.mapDraft = { type: 'composition', mapIds: ['f'] };
  api.state.mapPickTarget = 'second';
  const flow = api.activePickFlow();
  assert.strictEqual(flow.id, 'map-composition');
  assert.strictEqual(api.canvasPickAvailable(), true);
  assert.strictEqual(api.pickFlowSelectedState('map', 'f'), 'domain');
  assert.strictEqual(api.pickFlowCandidate('map', 'g'), true);
}

function testSheafBinaryPickFlowRegistryCoversSheafCandidates() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '1', name: 'X' }];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: '1', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: '1', name: 'F', baseVarietyId: 'X' }
  ];
  api.refs.addObjectKind = { value: 'sheaf' };
  api.refs.sheafType = { value: 'direct-sum' };
  api.state.sheafBinaryDraft = { sheafIds: ['E'] };
  api.state.sheafBinaryPickTarget = 'right';
  const flow = api.activePickFlow();
  assert.strictEqual(flow.id, 'sheaf-binary');
  assert.strictEqual(api.canvasPickAvailable(), true);
  assert.strictEqual(api.pickFlowSelectedState('sheaf', 'E'), 'domain');
  assert.strictEqual(api.pickFlowCandidate('sheaf', 'F'), true);
  assert.strictEqual(api.pickFlowComplete(flow), false);
  assert(api.pickFlowHint(flow).includes('second sheaf'));
}

testCurveToProjectivePullbackUsesCurvePoint();
testProjectivePullbackStillUsesTargetHyperplane();
testDuplicateDisplayNamesHaveDistinctInternalClasses();
testDuplicateSheafNamesHaveDistinctInternalClasses();
testGrassmannianUsesTautologicalBundleClasses();
testGrassmannianYoungBasisRulesExpressTautologicalClasses();
testAbelianSpecialSheavesAreTrivial();
testSelfDirectSumScalesChernCharacter();
testPresetStateIncludesRecoverableConstructionData();
testPresetImportRestoresRecoverableState();
testDualSheafUsesAlternatingChernClasses();
testDualSheafNameMergesExistingExponent();
testDualSheafSimplifiesLineAndStructureSheaves();
testInternalHomCreatesHiddenDualTensor();
testExactInternalHomUsesOrdinaryHomName();
testInternalHomUpdateReusesHiddenDual();
testPointClassDefaultsToUnit();
testPointSourcePushforwardDefaultsToTargetPoint();
testPointPushforwardDefaultsToTargetPoint();
testMapToPointPushforwardOfPointDefaultsToOne();
testOutOfRangeMapHomologyRelationsAreOmitted();
testMapHomologyClassPromotionAddsClassToRowVariety();
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
testBlowupPointConstructionDefaultsCenterAndExceptionalClass();
testBlowupMapDefaultsAreGeneratedAndDeletable();
testBlowupOfGrassmannianAddsPullbacksAndUsesProjectionFormula();
testPointBlowupHodgeNumbersAddExceptionalDiagonal();
testCurvePointBlowupHodgeNumbersAreUnchanged();
testSymbolicGenusCurvePointBlowupHodgeNumbersAreUnchanged();
testRamifiedCoverConstructionCreatesCoverMapAndHomology();
testCyclicRamifiedCoverAddsBranchRamificationRule();
testSmoothCyclicRamifiedCoverAddsRootClassAndHodgeNumbers();
testTangentHomologyPromotionUsesVarietyDisplay();
testRamifiedCoverTangentPromotionCopiesComputedRuleToVariety();
testRamifiedCoverPresetRoundTripAndDegreeOneSuppression();
testRamifiedCoverPresetRoundTripBranchDegree();
testRamifiedCoverMapConstructionUpdatesCoverData();
testRamifiedCoverMapGeneralModeSuppressesSmoothCyclicData();
testRamifiedCoverRefreshPreservesConstructionAfterDimensionEdit();
testSmoothCyclicCurveRamifiedCoverUsesRiemannHurwitz();
testGrassmannianMapConstructionCreatesTargetAndMap();
testGrassmannianMapGenericallyGeneratedOnlyIsRational();
testRankOneGrassmannianMapUsesProjectiveSpaceAndTwists();
testIdealSheafConstructionCreatesHiddenSesAndImageClass();
testNormalBundleConstructionCreatesHiddenTangentSes();
testRelativeTangentConstructionCreatesHiddenTangentSes();
testRelativeCotangentConstructionCreatesHiddenCotangentSes();
testPresetImportPreservesNormalBundleMarker();
testPresetImportPreservesRelativeSheafMarker();
testNormalBundleShowKeepsRevealedScaffoldingStable();
testPresetImportPreservesIdealSheafMarker();
testHomologyRulePassesAreCapped();
testSymbolicBudgetFallbackKeepsUnsimplifiedPolynomial();
testClassDisplayUsesCappedPasses();
testProductPickFlowRegistryCoversCandidatesAndSelection();
testMapCompositionPickFlowRegistryCoversMapCandidates();
testSheafBinaryPickFlowRegistryCoversSheafCandidates();

console.log('sheaf calculator regression tests passed');
