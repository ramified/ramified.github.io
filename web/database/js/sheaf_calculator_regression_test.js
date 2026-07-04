const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'sheaf_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    refs,
    window,
    VARS,
    geometryFromVariety,
    sheafFromObject,
    sheafIdentificationRuleForSheaf,
    buildBundleForSheaf,
    buildCharacteristicClasses,
    buildHodgeNumbers,
    buildPolyvectorParallelogram,
    buildSheafCohomology,
    hodgeEntryAt,
    applyHomologyRules,
    createSymbolicBudget,
    currentHomologyRulePasses,
    chartRevealAvailability,
    parseSymbolicRuleCoefficient,
    formatRuleCoefficientPlain,
    homologyRuleRhsPoly,
    homologyRuleCoefficientMap,
    normalizeHomologyRule,
    classDisplayOptions,
    buildClassRows,
    exportResult,
    classStepAutoFamily,
    buildClassStepFallbackResult,
    createClassStepSession,
    classStepDisplayPoly,
    classStepSyncCurrentTotalDisplay,
    collectClassStepRuleCandidates,
    classStepMaterializeRule,
    renderClassStepPanel,
    renderClassStepCalculationLatex,
    classStepHistoryPlain,
    toggleClassStepHistoryLine,
    stopClassStepSession,
    saveCurrentClassStepFormulaAsRule,
    deleteClassStepSavedRule,
    applySelectedClassStepRules,
    undoLastClassStep,
    applyClassStepRulesToPoly,
    applyOneHomologyRuleOnce,
    buildClassRowsFromStepSession,
    rememberClassStepComponents,
    syncClassStepAvailability,
    toggleClassStepLayout,
    renderClassFormulaBuilder,
    renderHodgePolyvectorParallelogram,
    renderBettiTableChart,
    bettiTableAvailableForGeometry,
    buildCompleteIntersectionBettiTable,
    setClassFormulaBuilderVariety,
    classFormulaHomologyTokenDefs,
    classFormulaSheafTokenDefs,
    classFormulaSheafTokenForSelection,
    classFormulaClassFamiliesForGeometry,
    classFormulaMapTokenDefs,
    classFormulaFunctorTemplateToken,
    classFormulaOperatorToken,
    validateClassFormulaBuilder,
    checkClassFormulaBuilder,
    startClassStepSessionFromFormulaBuilder,
    createClassFormulaStepSession,
    polyFromPowers,
    formatPolyLatex,
    pullbackPolynomial,
    pushforwardPolynomialByDegree,
    mapPushforwardClassDefinitions,
    mapPushforwardSourceKeyHasDirectAutomaticFormula,
    directAutomaticPushforwardSourceKeyPolynomial,
    formatPolyPlain,
    mapHomologyClassDefinitions,
    homologyClassDefinitions,
    homologyVariableId,
    homologyDefVariableId,
    divisorHomologyClassDefinitions,
    divisorLatexFromCoefficients,
    divisorPlainFromCoefficients,
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
    ppavLambdaClassId,
    MAX_DIMENSION,
    MAX_HODGE_GRID_DIMENSION,
    sheafChernClassUsesBaseHomology,
    computedSheafChernClassRule,
    baseHomologyRuleFromSheafChernRule,
    sheafHomologyClassDefinitions,
    sheafHomologyRuleForDef,
    renderSheafHomologyLhs,
    renderSheafHomologySpecialAction,
    ensureAbelJacobiKnownHomologyRules,
    HOMOLOGY_HYPERPLANE_CLASS,
    HOMOLOGY_UNIT_CLASS,
    HOMOLOGY_POINT_CLASS,
    HOMOLOGY_BRANCH_DIVISOR_CLASS,
    HOMOLOGY_RAMIFICATION_DIVISOR_CLASS,
    HOMOLOGY_RAMIFIED_COVER_HYPERPLANE_CLASS,
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
    createDefaultSheaf,
    addSheafObject,
    ensureAbsoluteDifferentialSesForCreatedSheaf,
    createGrassmannianMapConstruction,
    recommendationItemsForSource,
    createRecommendationConstructions,
    recommendationConstructionData,
    completeIntersectionEmbeddingMapContext,
    createPicardCanonicalConstruction,
    createDualSheafConstruction,
    createDifferentialWedgeSheafConstruction,
    createIdentifyFromDraft,
    activateIdentifyPick,
    createInternalHomSheafConstruction,
    createIdealSheafConstruction,
    createNormalBundleConstruction,
    createRelativeSheafConstruction,
    setCanvasPickEnabled,
    activePickFlow,
    canvasPickAvailable,
    pickFlowHint,
    pickFlowComplete,
    pickFlowCandidate,
    pickFlowSelectedState,
    syncPickFlowNote,
    handleActivePickFlow,
    refreshConstructedObjects,
    sheafDifferentialWedgeConstructionType,
    buildPresetState,
    applyPresetState,
    importPresetFromText,
    syncSymmetricProductControls,
    syncDefaultVarietyName,
    defaultVarietyNameLatex
  };
})();`);
  return vm.runInNewContext(source, {
    console,
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; },
      createComment(value) { return { nodeType: 8, value, parentElement: null, nextSibling: null }; }
    },
    window: { addEventListener() {}, matchMedia: () => ({ matches: true }) },
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

function cohomologyPlain(api, geometry, sheaf) {
  const cohomology = api.buildSheafCohomology(geometry, sheaf, api.buildHodgeNumbers(geometry));
  assert(cohomology?.dimensions, cohomology?.message || 'missing cohomology dimensions');
  return Array.from(cohomology.dimensions, (entry) => entry.plain);
}

function testStepBuilderMarkupIsBelowCanvasAndClassChartHasNoStepButton() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'sheaf_calculator.html'), 'utf8');
  assert(!html.includes('id="step-classes"'));
  assert(!html.includes('id="class-step-entry"'));
  const hostIndex = html.indexOf('<section id="class-step-wide-host">');
  const asideIndex = html.indexOf('<aside class="side" id="cards">');
  const classCardIndex = html.indexOf('<section class="card collapsed" id="class-card"');
  const stepCardIndex = html.indexOf('id="class-step-card"');
  assert(hostIndex > 0);
  assert(stepCardIndex > hostIndex && stepCardIndex < asideIndex);
  assert(classCardIndex > asideIndex);
  assert(html.includes('class="card collapsed sheaf-step-card wide" id="class-step-card"'));
  assert(html.includes('Step-by-Step Formula'));
  assert(!html.includes('Step-by-Step Characteristic Class'));
  assert(html.includes('id="class-formula-variety"'));
  assert(html.includes('id="class-formula-compute"'));
  assert(html.includes('id="class-formula-add-sheaf-class"'));
  assert(html.includes('class="sheaf-step-token-button" id="class-formula-add-sheaf-class"'));
  assert(html.includes('id="class-formula-class-family"'));
  assert(html.includes('id="class-formula-class-degree"'));
  assert(html.includes('id="class-formula-class-sheaf"'));
  assert(!html.includes('id="class-formula-sheaf-buttons"'));
  assert(html.includes('<option value="recommendations" disabled>Recommended constructions</option>'));
  assert(html.includes('id="recommendation-editor"'));
  const combinedSelectStart = html.indexOf('<select id="combined-type"');
  const combinedSelectEnd = html.indexOf('</select>', combinedSelectStart);
  assert(combinedSelectStart > 0 && combinedSelectEnd > combinedSelectStart);
  const combinedSelectHtml = html.slice(combinedSelectStart, combinedSelectEnd);
  assert(!combinedSelectHtml.includes('value="recommendations"'));
}

function testSymmetricProductGenusCanBeClearedWhileEditing() {
  const api = loadCalculator();
  const unchangedRows = { hidden: false };
  Object.assign(api.refs, {
    varietyType: { value: 'symmetric-product-curve' },
    symmetricProductM: { value: '3', max: '' },
    symmetricProductGenus: { value: '' },
    dim: { value: '3' },
    varietyName: { value: '', closest: () => unchangedRows },
    repeatNames: { checked: false }
  });

  assert.strictEqual(api.defaultVarietyNameLatex(), '\\operatorname{Sym}^{3}(C)');
  assert.strictEqual(api.refs.symmetricProductGenus.value, '');
  api.syncSymmetricProductControls({ commitValues: false });
  assert.strictEqual(api.refs.symmetricProductGenus.value, '');
  api.syncDefaultVarietyName();
  assert.strictEqual(api.refs.symmetricProductGenus.value, '');
  api.syncSymmetricProductControls();
  assert.strictEqual(api.refs.symmetricProductGenus.value, 'g');
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

function testSheafIdentificationRulesForDirectCases() {
  const api = loadCalculator();

  const abelianGeometry = api.geometryFromVariety({ id: 'A3', type: 'abelian', dim: '3', name: 'A' });
  const tangent = api.sheafFromObject({ id: 'TA', type: 'tangent', basis: 'chern', rank: '3', name: 'T_A', baseVarietyId: 'A3' }, abelianGeometry);
  const tangentRule = api.sheafIdentificationRuleForSheaf(abelianGeometry, tangent);
  assert.strictEqual(tangentRule.target.kind, 'trivial');
  assert.strictEqual(tangentRule.target.rank, 3);
  const tangentCohomology = api.buildSheafCohomology(abelianGeometry, tangent, api.buildHodgeNumbers(abelianGeometry));
  assert.strictEqual(tangentCohomology.dimensions[0].plain, '3');
  assert.strictEqual(tangentCohomology.dimensions[1].plain, '9');
  assert(tangentCohomology.message.includes('identified'));

  const canonical = api.sheafFromObject({ id: 'KA', type: 'canonical', basis: 'chern', rank: '1', name: 'K_A', baseVarietyId: 'A3' }, abelianGeometry);
  const canonicalRule = api.sheafIdentificationRuleForSheaf(abelianGeometry, canonical);
  assert.strictEqual(canonicalRule.target.kind, 'structure');

  const p1Geometry = api.geometryFromVariety({ id: 'P1', type: 'projective', dim: '1', name: '\\mathbb{P}^{1}' });
  const p1Canonical = api.sheafFromObject({ id: 'KP1', type: 'canonical', basis: 'chern', rank: '1', name: 'K_{P^1}', baseVarietyId: 'P1' }, p1Geometry);
  const p1CanonicalRule = api.sheafIdentificationRuleForSheaf(p1Geometry, p1Canonical);
  assert.strictEqual(p1CanonicalRule.target.kind, 'twist');
  assert.strictEqual(p1CanonicalRule.target.twist, -2);
  assert(p1CanonicalRule.message.includes('P^1'));

  const p1Tangent = api.sheafFromObject({ id: 'TP1', type: 'tangent', basis: 'chern', rank: '1', name: 'T_{P^1}', baseVarietyId: 'P1' }, p1Geometry);
  const p1TangentRule = api.sheafIdentificationRuleForSheaf(p1Geometry, p1Tangent);
  assert.strictEqual(p1TangentRule.target.kind, 'twist');
  assert.strictEqual(p1TangentRule.target.twist, 2);
  const p1TangentRows = api.buildCharacteristicClasses(p1Geometry, p1Tangent).classRows;
  assert.strictEqual(chernPlain(p1TangentRows), '1 + 2*[p]');

  const ciGeometry = api.geometryFromVariety({ id: 'X23', type: 'complete-intersection', dim: '2', ciDegrees: '2,3', name: 'X_{2,3}' });
  const ciCanonical = api.sheafFromObject({ id: 'KX', type: 'canonical', basis: 'chern', rank: '1', name: 'K_X', baseVarietyId: 'X23' }, ciGeometry);
  const ciRule = api.sheafIdentificationRuleForSheaf(ciGeometry, ciCanonical);
  assert.strictEqual(ciRule.target.kind, 'twist');
  assert.strictEqual(ciRule.target.twist, 0);

  const grassmannianGeometry = api.geometryFromVariety({ id: 'G', type: 'grassmannian', grassmannianR: '2', grassmannianN: '5', name: '\\operatorname{Gr}(2,5)' });
  const grassmannianCanonical = api.sheafFromObject({ id: 'KG', type: 'canonical', basis: 'chern', rank: '1', name: 'K_G', baseVarietyId: 'G' }, grassmannianGeometry);
  const grassmannianRule = api.sheafIdentificationRuleForSheaf(grassmannianGeometry, grassmannianCanonical);
  assert.strictEqual(grassmannianRule.target.kind, 'grassmannian-plucker');
  assert.strictEqual(grassmannianRule.target.twist, -5);
}

function testClassStepOffersSheafIdentificationRules() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A2', type: 'abelian', dim: '2', name: 'A' }];
  api.state.sheaves = [
    { id: 'TA', type: 'tangent', basis: 'chern', rank: '2', name: 'T_A', baseVarietyId: 'A2' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', 0);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'r(T_A)');
  const identification = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Identification');
  assert(identification);
  const rankRule = identification.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)) === 'r(T_A)');
  assert(rankRule);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(rankRule)), 'ch_0(O_A^{oplus 2})');
  session.candidates = [identification];
  api.state.classStepSession = session;
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'ch_0(O_A^{oplus 2})');
  const followup = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Chern character');
  assert(followup);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(followup.rule)), '2');
}

function testFormulaStepOffersSheafIdentificationRules() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A3', type: 'abelian', dim: '3', name: 'A' }];
  api.state.sheaves = [
    { id: 'Omega', type: 'cotangent', basis: 'chern', rank: '3', name: '\\Omega^1_{A}', baseVarietyId: 'A3' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  api.setClassFormulaBuilderVariety('A3');
  const token = api.classFormulaSheafTokenForSelection(geometry, 'Omega', 'chern', '');
  assert(token);
  api.state.classFormulaBuilder.tokens = [token];
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert(session);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'c(Omega^1_A)');
  const identification = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Identification');
  assert(identification, session.candidates.map((candidate) => candidate.sourceLabel).join(', '));
  const totalRule = identification.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)) === 'c(Omega^1_A)');
  assert(totalRule);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(totalRule)), 'c(O_A^{oplus 3})');
  session.candidates = [identification];
  api.state.classStepSession = session;
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'c(O_A^{oplus 3})');
  const expansion = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Expand total class');
  assert(expansion);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(expansion.rule)), '1 + c_1(O_A^{oplus 3}) + c_2(O_A^{oplus 3}) + c_3(O_A^{oplus 3})');
}

function testFormulaStepComputesIdentifiedCompleteIntersectionCanonicalTwist() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X5',
    type: 'complete-intersection',
    dim: '3',
    name: 'X',
    ciDegrees: '6, 4',
    ciAmbient: '5',
    homology: {
      classes: {
        unit: { symbol: '1' },
        hyperplane: { symbol: 'H' },
        point: { symbol: '[p]' }
      },
      rules: [{
        id: 'top-hyperplane-point',
        builtin: true,
        enabled: true,
        lhs: { powers: { homology_v_X5_H: 3 } },
        rhs: [{ coefficient: '24', powers: { homology_v_X5_point: 1 } }]
      }]
    }
  }];
  api.state.sheaves = [
    { id: 'KX', type: 'canonical', basis: 'chern', rank: '1', name: 'K_{X}', baseVarietyId: 'X5' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  api.setClassFormulaBuilderVariety('X5');
  const token = api.classFormulaSheafTokenForSelection(geometry, 'KX', 'chern', '');
  assert(token);
  api.state.classFormulaBuilder.tokens = [token];
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert(session);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'c(K_X)');

  const identification = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Identification');
  assert(identification);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(identification.rule)), 'c(O_X in P^5(4))');
  session.candidates = [identification];
  api.state.classStepSession = session;
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'c(O_X in P^5(4))');

  const identifiedId = Array.from(api.VARS.keys()).find((id) => id.startsWith('identified_KX_twist_c_total_X5'));
  assert(identifiedId);
  api.VARS.delete(identifiedId);
  const expansion = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Expand total class');
  assert(expansion, session.candidates.map((candidate) => candidate.sourceLabel).join(', '));
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(expansion.rule)), '1 + c_1(O_X in P^5(4)) + c_2(O_X in P^5(4)) + c_3(O_X in P^5(4))');
  session.candidates = [expansion];
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), '1 + c_1(O_X in P^5(4)) + c_2(O_X in P^5(4)) + c_3(O_X in P^5(4))');

  const chernRules = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Chern class');
  assert(chernRules);
  assert(chernRules.rules.some((rule) => api.formatPolyPlain(api.homologyRuleRhsPoly(rule)) === '4*H'));
  assert(chernRules.rules.some((rule) => api.formatPolyPlain(api.homologyRuleRhsPoly(rule)) === '0'));
}

function testFormulaStepToddOfIdentifiedSheafUsesNormalExpansion() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X3',
    type: 'complete-intersection',
    dim: '3',
    name: 'X',
    ciDegrees: '3, 2, 3',
    ciAmbient: '6',
    homology: {
      classes: {
        unit: { symbol: '1' },
        hyperplane: { symbol: 'H' },
        point: { symbol: '[p]' }
      },
      rules: [{
        id: 'top-hyperplane-point',
        builtin: true,
        enabled: true,
        lhs: { powers: { homology_v_X3_H: 3 } },
        rhs: [{ coefficient: '18', powers: { homology_v_X3_point: 1 } }]
      }]
    }
  }];
  api.state.sheaves = [
    { id: 'KX', type: 'canonical', basis: 'chern', rank: '1', name: 'K_{X}', baseVarietyId: 'X3' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  api.setClassFormulaBuilderVariety('X3');
  const token = api.classFormulaSheafTokenForSelection(geometry, 'KX', 'todd', '');
  assert(token);
  api.state.classFormulaBuilder.tokens = [token];
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'td(K_X)');

  const identification = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Identification');
  assert(identification);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(identification.rule)), 'td(O_X in P^6(1))');
  session.candidates = [identification];
  api.state.classStepSession = session;
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'td(O_X in P^6(1))');

  const afterIdentification = api.collectClassStepRuleCandidates(session);
  assert(!afterIdentification.some((candidate) => candidate.sourceLabel === 'Identified sheaf'));
  const expansion = afterIdentification.find((candidate) => candidate.sourceLabel === 'Expand total class');
  assert(expansion);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(expansion.rule)), '1 + td_1(O_X in P^6(1)) + td_2(O_X in P^6(1)) + td_3(O_X in P^6(1))');
  session.candidates = [expansion];
  api.applySelectedClassStepRules();

  const toddRules = api.collectClassStepRuleCandidates(session)
    .find((candidate) => candidate.sourceLabel === 'Todd');
  assert(toddRules);
  assert(toddRules.rules.some((rule) => api.formatPolyPlain(api.homologyRuleRhsPoly(rule)) === '1/2*c_1(O_X in P^6(1))'));
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

function testDivisorLineBundleUsesAssignedDivisorChernClass() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'P2',
    type: 'projective',
    dim: '2',
    name: '\\mathbb{P}^2',
    homology: {
      customClasses: [{ id: 'branch', symbol: 'B', degree: 1, cohomologyDegree: 2 }]
    }
  }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const hyperplaneId = api.HOMOLOGY_HYPERPLANE_CLASS;
  const rows = characteristicRows(api, {
    id: 'OD',
    type: 'divisor-line',
    basis: 'chern',
    rank: '1',
    name: '\\mathcal{O}(D)',
    baseVarietyId: 'P2',
    divisorCoefficients: {
      [hyperplaneId]: '2',
      branch: '-1'
    }
  });

  assert.strictEqual(api.divisorHomologyClassDefinitions(geometry).some((def) => def.id === 'branch'), true);
  assert.strictEqual(api.divisorLatexFromCoefficients({ [hyperplaneId]: '2', branch: '-1' }, geometry), '2H - B');
  assert.strictEqual(api.divisorPlainFromCoefficients({ [hyperplaneId]: '2', branch: '-1' }, geometry), '2*H - B');
  assert.strictEqual(chernPlain(rows), '1 - B + 2*H');
  assert.strictEqual(characterPlain(rows), '1 - B + 2*H - 2*B*H + 1/2*B^2 + 2*[p]');
}

function testDivisorLineBundlePresetRoundTrip() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'P2',
    type: 'projective',
    dim: '2',
    name: '\\mathbb{P}^2',
    labelX: 0.25,
    labelY: 0.6
  }];
  api.state.sheaves = [{
    id: 'OD',
    type: 'divisor-line',
    basis: 'chern',
    rank: '1',
    name: '\\mathcal{O}(2H)',
    baseVarietyId: 'P2',
    divisorCoefficients: { [api.HOMOLOGY_HYPERPLANE_CLASS]: '2' }
  }];

  const presetText = JSON.stringify(api.buildPresetState());
  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const sheaf = restored.state.sheaves.find((item) => item.id === 'OD');
  assert(sheaf);
  assert.strictEqual(sheaf.type, 'divisor-line');
  assert.strictEqual(sheaf.divisorCoefficients[api.HOMOLOGY_HYPERPLANE_CLASS], '2');
  assert.strictEqual(chernPlain(characteristicRows(restored, sheaf)), '1 + 2*H');
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

function testMukaiAndKappaRespectClassBasis() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.refs.classFamilyToggles = [
    { checked: true, dataset: { classFamilyToggle: 'mukai' } },
    { checked: true, dataset: { classFamilyToggle: 'kappa' } }
  ];
  api.refs.classTermOnly = { checked: false };
  api.refs.classBracketDisplay = { checked: false };
  api.refs.classTermIndex = { value: '1' };
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const rowsForBasis = (basis, rootForm = 'expanded') => {
    api.refs.rootForm = { value: rootForm };
    const sheaf = api.sheafFromObject({ id: `E_${basis}`, type: 'abstract', basis, rank: '2', name: 'E', baseVarietyId: 'X' }, geometry);
    return api.buildCharacteristicClasses(geometry, sheaf).classRows;
  };
  const chernRows = rowsForBasis('chern');
  const chernKappa = chernRows.find((row) => row.key === 'kappa')?.plain || '';
  const chernMukai = chernRows.find((row) => row.key === 'mukai')?.plain || '';
  assert(chernKappa.includes('c_1(E)'), chernKappa);
  assert(chernKappa.includes('c_2(E)'), chernKappa);
  assert(!chernKappa.includes('ch_1(E)'), chernKappa);
  assert(chernMukai.includes('c_1(E)'), chernMukai);
  assert(!chernMukai.includes('ch_1(E)'), chernMukai);

  const characterRows = rowsForBasis('character');
  const characterKappa = characterRows.find((row) => row.key === 'kappa')?.plain || '';
  const characterMukai = characterRows.find((row) => row.key === 'mukai')?.plain || '';
  assert(characterKappa.includes('ch_1(E)'), characterKappa);
  assert(characterKappa.includes('ch_2(E)'), characterKappa);
  assert(!characterKappa.includes('c_1(E)'), characterKappa);
  assert(characterMukai.includes('ch_1(E)'), characterMukai);
  assert(!characterMukai.includes('c_1(E)'), characterMukai);

  const rootRows = rowsForBasis('roots', 'expanded');
  const rootKappa = rootRows.find((row) => row.key === 'root_kappa')?.plain || '';
  const rootMukai = rootRows.find((row) => row.key === 'root_mukai')?.plain || '';
  assert(rootKappa.includes('alpha_1'), rootKappa);
  assert(!rootKappa.includes('c_1(E)'), rootKappa);
  assert(!rootKappa.includes('ch_1(E)'), rootKappa);
  assert(rootMukai.includes('alpha_1'), rootMukai);
  assert(!rootMukai.includes('c_1(E)'), rootMukai);
  assert(!rootMukai.includes('ch_1(E)'), rootMukai);
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

function testCurveSymplecticBasisIsOptIn() {
  const api = loadCalculator();
  const curve = { id: 'C', type: 'curve', genus: '2', name: 'C' };
  api.state.varieties = [curve];

  const hiddenGeometry = api.geometryFromVariety(curve);
  assert.strictEqual(api.homologyClassDefinitions(hiddenGeometry).some((def) => def.id === 'curve_a_1'), false);
  assert.strictEqual(hiddenGeometry.homology.rules.some((rule) => String(rule.id).startsWith('curve-symplectic-')), false);

  curve.homology.symplecticBasisConfirmed = true;
  const visibleGeometry = api.geometryFromVariety(curve);
  assert.strictEqual(api.homologyClassDefinitions(visibleGeometry).some((def) => def.id === 'curve_a_1'), true);
  assert.strictEqual(api.homologyClassDefinitions(visibleGeometry).some((def) => def.id === 'curve_b_2'), true);
  assert.strictEqual(visibleGeometry.homology.rules.some((rule) => String(rule.id).startsWith('curve-symplectic-')), true);
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

function testPpavModuliUsesLambdaClassesAndRules() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A2', type: 'ppav-moduli', ppavGenus: '2', name: '\\mathcal{A}_{2}' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  assert.strictEqual(geometry.dim, 3);
  assert.strictEqual(geometry.ppavGenus, 2);

  const defs = api.homologyClassDefinitions(geometry);
  const tautological = defs.filter((def) => def.kind === 'tautological');
  assert.deepStrictEqual(Array.from(tautological, (def) => def.id), ['ppav_lambda_1', 'ppav_lambda_2']);
  assert.deepStrictEqual(Array.from(tautological, (def) => def.symbolLatex), ['\\lambda_{1}', '\\lambda_{2}']);

  const lambda1Id = api.homologyVariableId(api.ppavLambdaClassId(1), geometry);
  const lambda2Id = api.homologyVariableId(api.ppavLambdaClassId(2), geometry);
  assert.strictEqual(
    api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [lambda2Id]: 1 }), { geometry, homology: geometry.homology })),
    '0'
  );
  assert.strictEqual(
    api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [lambda1Id]: 2 }), { geometry, homology: geometry.homology })),
    '0'
  );
}

function testPpavModuliTangentChernClassesAreTautological() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A3', type: 'ppav-moduli', ppavGenus: '3', name: '\\mathcal{A}_{3}' }];
  const tangentRows = characteristicRows(api, {
    id: 'TA3',
    type: 'tangent',
    basis: 'chern',
    rank: '6',
    name: 'T',
    baseVarietyId: 'A3'
  });
  const total = chernPlain(tangentRows);
  assert(total.includes('1 - 4*lambda_1'));
  assert(total.includes('15/2*lambda_1^2'));
  assert(total.includes('15/2*lambda_1^3'));
}

function testPpavModuliPresetRoundTrip() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A3', type: 'ppav-moduli', ppavGenus: '3', name: '\\mathcal{A}_{3}' }];
  api.state.activeVarietyId = 'A3';
  const preset = api.buildPresetState();
  const restored = loadCalculator();
  restored.applyPresetState(preset);
  const variety = restored.state.varieties[0];
  assert.strictEqual(variety.type, 'ppav-moduli');
  assert.strictEqual(variety.ppavGenus, '3');
  assert.strictEqual(restored.geometryFromVariety(variety).dim, 6);
}

function testHigherDimensionPpavUsesTrueDimensionAndQueryOnlyHodge() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'A5', type: 'ppav-moduli', ppavGenus: '5', name: '\\mathcal{A}_{5}' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  assert.strictEqual(api.MAX_DIMENSION, 15);
  assert.strictEqual(api.MAX_HODGE_GRID_DIMENSION, 12);
  assert.strictEqual(geometry.dim, 15);
  assert.strictEqual(geometry.ppavGenus, 5);
  const hodge = api.buildHodgeNumbers(geometry);
  assert.strictEqual(hodge.queryOnly, true);
  assert.strictEqual(hodge.queryAvailable, false);
  assert.strictEqual(hodge.entries, null);
}

function testLargeAbelianHodgeUsesSingleEntryQuery() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'A13', type: 'abelian', dim: '13', name: 'A' });
  const hodge = api.buildHodgeNumbers(geometry);
  assert.strictEqual(hodge.queryOnly, true);
  assert.strictEqual(hodge.queryAvailable, true);
  assert.strictEqual(hodge.entries, null);
  assert.strictEqual(api.hodgeEntryAt(geometry, 2, 3).plain, '22308');
  const cohomology = api.buildSheafCohomology(geometry, null, hodge);
  assert(cohomology.dimensions);
  assert.strictEqual(cohomology.dimensions.length, 14);
  assert.strictEqual(cohomology.dimensions[1].plain, '13');
}

function testTwelveDimensionalHodgeStillRendersFullTable() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'P12', type: 'projective', dim: '12', name: '\\mathbb{P}^{12}' });
  const hodge = api.buildHodgeNumbers(geometry);
  assert.strictEqual(hodge.queryOnly, undefined);
  assert.strictEqual(hodge.entries.length, 13);
  assert.strictEqual(hodge.entries[12][12].plain, '1');
}

function testPolyvectorParallelogramForProjectiveSpace() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^{2}' });
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert.strictEqual(polyvector.entries[0][0].plain, '1');
  assert.strictEqual(polyvector.entries[0][1].plain, '8');
  assert.strictEqual(polyvector.entries[0][2].plain, '10');
  assert.strictEqual(polyvector.entries[1][1].plain, '0');
}

function testPolyvectorParallelogramForAbelianVariety() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'A3', type: 'abelian', dim: '3', name: 'A' });
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert(polyvector.message.includes('trivial tangent bundle'));
  assert.strictEqual(polyvector.entries[0][0].plain, '1');
  assert.strictEqual(polyvector.entries[1][2].plain, '9');
  assert.strictEqual(polyvector.entries[3][3].plain, '1');
}

function testPolyvectorParallelogramForCurves() {
  const api = loadCalculator();
  const cases = [
    ['P1', { id: 'P1', type: 'projective', dim: '1', name: '\\mathbb{P}^{1}' }, ['1', '3', '0', '0']],
    ['E', { id: 'E', type: 'curve', genus: '1', name: 'E' }, ['1', '1', '1', '0']],
    ['C2', { id: 'C2', type: 'curve', genus: '2', name: 'C' }, ['1', '0', '2', '3']]
  ];
  cases.forEach(([, variety, expected]) => {
    const geometry = api.geometryFromVariety(variety);
    const hodge = api.buildHodgeNumbers(geometry);
    const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
    assert(polyvector, variety.id);
    assert(polyvector.message.includes('Curve polyvectors'));
    assert.deepStrictEqual([
      polyvector.entries[0][0].plain,
      polyvector.entries[0][1].plain,
      polyvector.entries[1][0].plain,
      polyvector.entries[1][1].plain
    ], expected);
  });
}

function testPolyvectorParallelogramForProductOfKnownFactors() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'L', type: 'projective', dim: '1', name: '\\mathbb{P}^{1}' },
    { id: 'R', type: 'projective', dim: '1', name: '\\mathbb{P}^{1}' },
    { id: 'Q', type: 'abstract', dim: '2', name: 'Q', construction: { type: 'product', varietyIds: ['L', 'R'] } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[2]);
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert(polyvector.message.includes('Kunneth'));
  assert.strictEqual(polyvector.entries[0][0].plain, '1');
  assert.strictEqual(polyvector.entries[0][1].plain, '6');
  assert.strictEqual(polyvector.entries[0][2].plain, '9');
  assert.strictEqual(polyvector.entries[1][1].plain, '0');
}

function testPolyvectorParallelogramForProductWithAbelianFactor() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', genus: '2', name: 'C' },
    { id: 'A', type: 'abelian', dim: '2', name: 'A' },
    { id: 'CA', type: 'abstract', dim: '3', name: 'C\\times A', construction: { type: 'product', varietyIds: ['C', 'A'] } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[2]);
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert.strictEqual(polyvector.entries[0][1].plain, '2');
  assert.strictEqual(polyvector.entries[1][1].plain, '11');
  assert.strictEqual(polyvector.entries[2][3].plain, '6');
}

function testPolyvectorParallelogramForProductWithUnknownFactorIsSymbolic() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'S', type: 'abstract', dim: '2', name: 'S' },
    { id: 'A', type: 'abelian', dim: '1', name: 'A' },
    { id: 'SA', type: 'abstract', dim: '3', name: 'S\\times A', construction: { type: 'product', varietyIds: ['S', 'A'] } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[2]);
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert(polyvector.message.includes('both factor polyvector parallelograms are known'));
  assert.strictEqual(polyvector.entries[1][2].plain, 'g^1,2');
}

function testPolyvectorParallelogramForSymmetricProductCurveSpecialCases() {
  const api = loadCalculator();
  const symCurve = api.geometryFromVariety({ id: 'S1', type: 'symmetric-product-curve', dim: '1', symmetricProductM: '1', symmetricProductGenus: '2', name: '\\operatorname{Sym}^{1}(C)' });
  const symCurvePolyvector = api.buildPolyvectorParallelogram({ geometry: symCurve, hodge: api.buildHodgeNumbers(symCurve) });
  assert(symCurvePolyvector.message.includes('Curve polyvectors'));
  assert.strictEqual(symCurvePolyvector.entries[0][1].plain, '0');
  assert.strictEqual(symCurvePolyvector.entries[1][1].plain, '3');

  const rationalSym = api.geometryFromVariety({ id: 'S3', type: 'symmetric-product-curve', dim: '3', symmetricProductM: '3', symmetricProductGenus: '0', name: '\\operatorname{Sym}^{3}(\\mathbb{P}^{1})' });
  const rationalPolyvector = api.buildPolyvectorParallelogram({ geometry: rationalSym, hodge: api.buildHodgeNumbers(rationalSym) });
  assert(rationalPolyvector.message.includes('P^3'));
  assert.strictEqual(rationalPolyvector.entries[0][1].plain, '15');
  assert.strictEqual(rationalPolyvector.entries[0][3].plain, '35');

  const generalSym = api.geometryFromVariety({ id: 'S2', type: 'symmetric-product-curve', dim: '2', symmetricProductM: '2', symmetricProductGenus: 'g', name: '\\operatorname{Sym}^{2}(C)' });
  const generalPolyvector = api.buildPolyvectorParallelogram({ geometry: generalSym, hodge: api.buildHodgeNumbers(generalSym) });
  assert(generalPolyvector.message.includes('not implemented without a reference-backed formula'));
  assert.strictEqual(generalPolyvector.entries[1][1].plain, 'g^1,1');
}

function testExpandedPolyvectorParallelogramShowsHochschildTotals() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'C2', type: 'curve', genus: '2', name: 'C' });
  const hodge = api.buildHodgeNumbers(geometry);
  api.state.hodgeExpanded = true;
  api.refs.hodgePolyvector = { hidden: true, innerHTML: '' };
  api.renderHodgePolyvectorParallelogram({ geometry, hodge });
  assert.strictEqual(api.refs.hodgePolyvector.hidden, false);
  assert(api.refs.hodgePolyvector.innerHTML.includes('hodge-polyvector-board is-expanded'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('title="chi(lambda^0 T_X)">\\(-1\\)'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('title="chi(lambda^1 T_X)">\\(-3\\)'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('title="HH^0">\\(1\\)'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('title="HH^1">\\(2\\)'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('title="HH^2">\\(3\\)'));
  assert(!api.refs.hodgePolyvector.innerHTML.includes('\\mathrm{HH}^{0}=1'));
  assert(!api.refs.hodgePolyvector.innerHTML.includes('\\chi(\\lambda^{0}\\mathcal{T}_X)=-1'));
}

function testPolyvectorParallelogramUsesHodgeCellSizeScale() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'C2', type: 'curve', genus: '2', name: 'C' });
  const hodge = api.buildHodgeNumbers(geometry);
  api.refs.hodgePolyvector = { hidden: true, innerHTML: '' };
  api.state.hodgeCellSize = 20;
  api.renderHodgePolyvectorParallelogram({ geometry, hodge });
  assert(api.refs.hodgePolyvector.innerHTML.includes('style="--poly-cell:38px;--poly-scale:1;--poly-cols:2;"'));
  api.state.hodgeCellSize = 30;
  api.renderHodgePolyvectorParallelogram({ geometry, hodge });
  assert(api.refs.hodgePolyvector.innerHTML.includes('style="--poly-cell:57px;--poly-scale:1.5;--poly-cols:2;"'));
}

function testExpandedPolyvectorParallelogramUsesSymbolsForSymbolicTotals() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'S', type: 'abstract', dim: '2', name: 'S' });
  const hodge = api.buildHodgeNumbers(geometry);
  api.state.hodgeExpanded = true;
  api.refs.hodgePolyvector = { hidden: true, innerHTML: '' };
  api.renderHodgePolyvectorParallelogram({ geometry, hodge });
  assert(api.refs.hodgePolyvector.innerHTML.includes('\\chi(\\mathcal{O}_{S})'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('\\chi(\\mathcal{T}_{S})'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('\\mathrm{HH}^{0}'));
  assert(api.refs.hodgePolyvector.innerHTML.includes('\\mathrm{HH}^{1}'));
  assert(!api.refs.hodgePolyvector.innerHTML.includes('g^{0,0} - g^{1,0}'));
}

function testPolyvectorParallelogramForCalabiYauCompleteIntersectionUsesHodgeMirror() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({
    id: 'Q',
    type: 'complete-intersection',
    dim: '3',
    ciDegrees: '5',
    name: 'X'
  });
  const hodge = api.buildHodgeNumbers(geometry);
  const polyvector = api.buildPolyvectorParallelogram({ geometry, hodge });
  assert(polyvector);
  assert(polyvector.message.includes('trivial canonical'));
  assert.strictEqual(polyvector.entries[1][1].plain, hodge.entries[2][1].plain);
  assert.strictEqual(polyvector.entries[1][2].plain, hodge.entries[1][1].plain);
}

function testCompleteIntersectionBettiTableUsesKoszulDegrees() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({
    id: 'X23',
    type: 'complete-intersection',
    dim: '2',
    ciDegrees: '2,3',
    name: 'X'
  });
  assert.strictEqual(api.bettiTableAvailableForGeometry(geometry), true);
  const table = api.buildCompleteIntersectionBettiTable(geometry);
  assert.deepStrictEqual(Array.from(table.columns), [0, 1, 2]);
  assert.deepStrictEqual(Array.from(table.rows, (row) => row.shift), [0, 1, 2, 3]);
  assert.deepStrictEqual(Array.from(table.rows, (row) => Array.from(row.values, String)), [
    ['1', '0', '0'],
    ['0', '1', '0'],
    ['0', '1', '0'],
    ['0', '0', '1']
  ]);
}

function testBettiTableFillsMissingRowsForSparseCompleteIntersectionDegrees() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({
    id: 'X48',
    type: 'complete-intersection',
    dim: '2',
    ciDegrees: '4,8',
    name: 'X'
  });
  const table = api.buildCompleteIntersectionBettiTable(geometry);
  assert.deepStrictEqual(Array.from(table.rows, (row) => row.shift), Array.from({ length: 11 }, (_, index) => index));
  assert.deepStrictEqual(Array.from(table.rows[0].values, String), ['1', '0', '0']);
  assert.deepStrictEqual(Array.from(table.rows[3].values, String), ['0', '1', '0']);
  assert.deepStrictEqual(Array.from(table.rows[4].values, String), ['0', '0', '0']);
  assert.deepStrictEqual(Array.from(table.rows[7].values, String), ['0', '1', '0']);
  assert.deepStrictEqual(Array.from(table.rows[10].values, String), ['0', '0', '1']);
}

function testProjectiveSpaceBettiTableIsTrivialCoordinateRing() {
  const api = loadCalculator();
  const projective = api.geometryFromVariety({ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^2' });
  assert.strictEqual(api.bettiTableAvailableForGeometry(projective), true);
  const table = api.buildCompleteIntersectionBettiTable(projective);
  assert.deepStrictEqual(Array.from(table.columns), [0]);
  assert.deepStrictEqual(Array.from(table.rows, (row) => row.shift), [0]);
  assert.deepStrictEqual(Array.from(table.rows[0].values, String), ['1']);
  assert(table.message.includes('beta_{0,0}=1'));
}

function testBettiTableRevealIsLazyAndExplainsSymbols() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({
    id: 'X23',
    type: 'complete-intersection',
    dim: '2',
    ciDegrees: '2,3',
    name: 'X'
  });
  api.refs.bettiTableChart = { hidden: true, innerHTML: '' };
  api.refs.bettiTableMessage = { textContent: '' };
  api.state.revealedCharts.betti = false;
  api.renderBettiTableChart({ geometry });
  assert.strictEqual(api.refs.bettiTableChart.hidden, true);
  assert.strictEqual(api.refs.bettiTableChart.innerHTML, '');
  api.state.revealedCharts.betti = true;
  api.renderBettiTableChart({ geometry });
  assert.strictEqual(api.refs.bettiTableChart.hidden, false);
  assert(api.refs.bettiTableChart.innerHTML.includes('class="betti-table"'));
  assert(api.refs.bettiTableChart.innerHTML.includes('\\beta_{i,j}=\\dim_k'));
  assert(api.refs.bettiTableChart.innerHTML.includes('<th>\\(j-i\\backslash i\\)</th>'));
  assert(api.refs.bettiTableMessage.textContent.includes('Koszul Betti table'));
}

function testBettiTableFallbackShowsSymbolicTemplateForUnsupportedVariety() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'A', type: 'abstract', dim: '3', name: 'X' });
  assert.strictEqual(api.bettiTableAvailableForGeometry(geometry), false);
  api.refs.bettiTableChart = { hidden: true, innerHTML: '' };
  api.refs.bettiTableMessage = { textContent: '' };
  api.state.revealedCharts.betti = true;
  api.renderBettiTableChart({ geometry });
  assert.strictEqual(api.refs.bettiTableChart.hidden, false);
  assert(api.refs.bettiTableChart.innerHTML.includes('betti-table is-symbolic'));
  assert(api.refs.bettiTableChart.innerHTML.includes('\\beta_{0,0}'));
  assert(api.refs.bettiTableChart.innerHTML.includes('\\beta_{3,5}'));
  assert(api.refs.bettiTableMessage.textContent.includes('not well-defined'));
  api.state.inputMode = 'modify';
  api.state.activeVarietyId = 'A';
  api.state.varieties = [{ id: 'A', type: 'abstract', dim: '3', name: 'X' }];
  assert.strictEqual(api.chartRevealAvailability({ geometry, hodge: { entries: [] } }).betti, true);
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

function testCyclicRamifiedCoverAddsRamificationPushforwardRules() {
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
  const baseGeometry = api.geometryFromVariety(base);
  const coverGeometry = api.geometryFromVariety(cover);
  const branchDef = api.homologyClassDefinitions(baseGeometry).find((def) => def.id === api.HOMOLOGY_BRANCH_DIVISOR_CLASS);
  const ramificationDef = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS);
  const branchId = api.homologyDefVariableId(branchDef, baseGeometry);
  const ramificationId = api.homologyDefVariableId(ramificationDef, coverGeometry);
  const rules = api.defaultMapHomologyRulesForGeometry(baseGeometry);
  const ramificationRule = rules.find((rule) => rule.id.startsWith(`default-ramified-cover-ramification-pushforward-${map.id}-`)
    && rule.rhs.length === 1
    && rule.rhs[0].coefficient === '1'
    && rule.rhs[0].powers[branchId] === 1);
  assert(ramificationRule);
  const ramificationPushforwardId = Object.keys(ramificationRule.lhs.powers)[0];
  const reduced = api.applyHomologyRules(api.polyFromPowers({ [ramificationPushforwardId]: 1 }), {
    geometry: baseGeometry,
    homology: baseGeometry.homology
  });
  assert.strictEqual(api.formatPolyPlain(reduced), 'B');

  const pushedSquare = api.pushforwardPolynomialByDegree(
    map,
    api.polyFromPowers({ [ramificationId]: 2 }),
    coverGeometry.dim,
    baseGeometry.dim,
    {}
  );
  assert.strictEqual(api.formatPolyPlain(pushedSquare), '1/4*B^2');
}

function testGeneralRamifiedCoverDoesNotAddRamificationPushforwardRule() {
  const api = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 4,
    coverMode: 'general',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: 'Y',
    name: 'Y'
  });

  const map = api.state.maps[0];
  const baseGeometry = api.geometryFromVariety(base);
  const coverGeometry = api.geometryFromVariety(cover);
  const ramificationDef = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS);
  const ramificationId = api.homologyDefVariableId(ramificationDef, coverGeometry);
  assert(!api.defaultMapHomologyRulesForGeometry(baseGeometry)
    .some((rule) => rule.id.startsWith(`default-ramified-cover-ramification-pushforward-${map.id}-`)));

  const pushed = api.pushforwardPolynomialByDegree(
    map,
    api.polyFromPowers({ [ramificationId]: 1 }),
    coverGeometry.dim,
    baseGeometry.dim,
    {}
  );
  assert.notStrictEqual(api.formatPolyPlain(pushed), 'B');
}

function testSmoothCyclicProjectiveRamifiedCoverAddsTildeHyperplaneRules() {
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

  const map = api.state.maps[0];
  const coverGeometry = api.geometryFromVariety(cover);
  const tilde = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFIED_COVER_HYPERPLANE_CLASS);
  const ramification = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFICATION_DIVISOR_CLASS);
  assert(tilde);
  assert.strictEqual(tilde.symbolLatex, '\\widetilde{H}');
  assert.strictEqual(tilde.cohomologyDegree, 2);

  const pullbackRule = coverGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-hyperplane-pullback-${map.id}`);
  const ramificationRule = coverGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-ramification-hyperplane-${cover.id}`);
  const topRule = coverGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-hyperplane-top-${cover.id}`);
  assert(pullbackRule);
  assert(ramificationRule);
  assert(topRule);
  assert.strictEqual(ramificationRule.rhs[0].coefficient, '2');
  assert.strictEqual(topRule.rhs[0].coefficient, '2');

  const pullbackId = Object.keys(pullbackRule.lhs.powers)[0];
  const ramificationId = api.homologyDefVariableId(ramification, coverGeometry);
  const tildeId = api.homologyDefVariableId(tilde, coverGeometry);
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [pullbackId]: 1 }), {
    geometry: coverGeometry,
    homology: coverGeometry.homology
  })), 'widetildeH');
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [ramificationId]: 1 }), {
    geometry: coverGeometry,
    homology: coverGeometry.homology
  })), '2*widetildeH');
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [tildeId]: 3 }), {
    geometry: coverGeometry,
    homology: coverGeometry.homology
  })), '2*[p]');
}

function testCompleteIntersectionRamifiedCoverTildeHyperplaneTopUsesBaseDegree() {
  const api = loadCalculator();
  const base = { id: 'X23', type: 'complete-intersection', dim: '2', ciDegrees: '2,3', name: 'X_{2,3}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{X}_{2,3}',
    name: 'Y'
  });

  const coverGeometry = api.geometryFromVariety(cover);
  const tilde = api.homologyClassDefinitions(coverGeometry).find((def) => def.id === api.HOMOLOGY_RAMIFIED_COVER_HYPERPLANE_CLASS);
  const topRule = coverGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-hyperplane-top-${cover.id}`);
  assert(tilde);
  assert(topRule);
  assert.strictEqual(topRule.rhs[0].coefficient, '12');
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [api.homologyDefVariableId(tilde, coverGeometry)]: 2 }), {
    geometry: coverGeometry,
    homology: coverGeometry.homology
  })), '12*[p]');
}

function testGeneralProjectiveRamifiedCoverAddsTildeHyperplaneButNoRamificationRule() {
  const api = loadCalculator();
  const base = { id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^{2}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 3,
    coverMode: 'general',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    defaultName: '\\widetilde{\\mathbb{P}^{2}}',
    name: 'Y'
  });

  const coverGeometry = api.geometryFromVariety(cover);
  assert(api.homologyClassDefinitions(coverGeometry).some((def) => def.id === api.HOMOLOGY_RAMIFIED_COVER_HYPERPLANE_CLASS));
  assert(coverGeometry.homology.rules.some((item) => item.id === `default-ramified-cover-hyperplane-top-${cover.id}`));
  assert(!coverGeometry.homology.rules.some((item) => item.id === `default-ramified-cover-ramification-hyperplane-${cover.id}`));
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
  const branch = api.homologyClassDefinitions(baseGeometry).find((def) => def.id === api.HOMOLOGY_BRANCH_DIVISOR_CLASS);
  const hyperplane = api.homologyClassDefinitions(baseGeometry).find((def) => def.id === api.HOMOLOGY_HYPERPLANE_CLASS);
  const branchRule = baseGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-projective-branch-degree-${cover.id}`);
  assert(branchRule);
  assert.strictEqual(branchRule.rhs[0].coefficient, '4');
  assert.strictEqual(Object.keys(branchRule.lhs.powers)[0], api.homologyDefVariableId(branch, baseGeometry));
  assert.strictEqual(Object.keys(branchRule.rhs[0].powers)[0], api.homologyDefVariableId(hyperplane, baseGeometry));
  const rootRule = baseGeometry.homology.rules.find((item) => item.id === `default-ramified-cover-root-hyperplane-${cover.id}`);
  assert(rootRule);
  assert.strictEqual(rootRule.rhs[0].coefficient, '2');
  assert.strictEqual(Object.keys(rootRule.lhs.powers)[0], api.homologyDefVariableId(root, baseGeometry));
  assert.strictEqual(Object.keys(rootRule.rhs[0].powers)[0], api.homologyDefVariableId(hyperplane, baseGeometry));
  assert(!baseGeometry.homology.rules.some((item) => item.id === `default-ramified-cover-root-branch-${cover.id}`));

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

function testSmoothCyclicRamifiedCoverRelativeDifferentialsStayLazyUntilAbsoluteSheaf() {
  const api = loadCalculator();
  const base = { id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^{2}', labelX: 0.4, labelY: 0.7 };
  api.state.varieties = [base];

  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    defaultName: '\\widetilde{\\mathbb{P}^{2}}',
    name: 'Y'
  });
  const map = api.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  const coverGeometry = api.geometryFromVariety(cover);
  assert(coverGeometry.specialLabels.includes('relative-differential-easy'));
  assert(cover.specialLabels.includes('relative-differential-easy'));
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.ramifiedCoverCotangent === true), false);
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.ramifiedCoverTangent === true), false);

  const relativeCotangent = api.createRelativeSheafConstruction({
    type: 'cotangent',
    map,
    domain: cover,
    codomain: base,
    baseVarietyId: cover.id,
    defaultName: '\\Omega^1_{Y/P}',
    name: '\\Omega^1_{Y/P}',
    nameDirty: false
  });
  assert(relativeCotangent);
  assert.strictEqual(relativeCotangent.hiddenOnCanvas, false);
  assert.strictEqual(relativeCotangent.construction.ramifiedCoverRelative, true);
  assert.strictEqual(relativeCotangent.construction.sourceSheafIds.length, 0);
  assert.strictEqual(relativeCotangent.construction.pulledTargetDifferentialSheafId, null);
  assert.strictEqual(api.state.sequences.length, 0);
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.type === 'pullback'), false);
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.ramifiedCoverCotangent === true), false);

  const cotangent = {
    id: 'OmegaY',
    type: 'cotangent',
    name: '\\Omega^1_Y',
    twist: '1',
    rank: '2',
    baseVarietyId: cover.id,
    basis: 'chern',
    nameDirty: true
  };
  api.addSheafObject(cotangent, { activate: false });
  api.ensureAbsoluteDifferentialSesForCreatedSheaf(cotangent, cover);
  assert.strictEqual(cotangent.construction?.ramifiedCoverCotangent, true);
  assert.strictEqual(cover.construction.cotangentSheafId, cotangent.id);
  assert.strictEqual(cover.construction.relativeCotangentSheafId, relativeCotangent.id);
  assert(api.state.sheaves.some((item) => item.construction?.type === 'pullback'
    && item.construction.mapId === map.id
    && item.baseVarietyId === cover.id));
  assert(api.state.sequences.some((sequence) => (sequence.sheafIds || []).includes(cotangent.id)));

  const relativeTangent = api.createRelativeSheafConstruction({
    type: 'tangent',
    map,
    domain: cover,
    codomain: base,
    baseVarietyId: cover.id,
    defaultName: '\\mathcal{T}_{Y/P}',
    name: '\\mathcal{T}_{Y/P}',
    nameDirty: false
  });
  assert(relativeTangent);
  assert.strictEqual(relativeTangent.hiddenOnCanvas, false);
  assert.strictEqual(relativeTangent.construction.ramifiedCoverTangentQuotient, true);
  assert.strictEqual(relativeTangent.construction.sourceSheafIds.length, 0);
  assert.strictEqual(relativeTangent.construction.sourceTangentSheafId, null);
  assert.strictEqual(relativeTangent.construction.pulledTargetTangentSheafId, null);

  const tangent = {
    id: 'TY',
    type: 'tangent',
    name: '\\mathcal{T}_Y',
    twist: '1',
    rank: '2',
    baseVarietyId: cover.id,
    basis: 'chern',
    nameDirty: false
  };
  api.addSheafObject(tangent, { activate: false });
  api.ensureAbsoluteDifferentialSesForCreatedSheaf(tangent, cover);
  assert.strictEqual(tangent.construction?.ramifiedCoverTangent, true);
  assert.strictEqual(cover.construction.tangentSheafId, tangent.id);
  assert.strictEqual(cover.construction.relativeTangentSheafId, relativeTangent.id);
  assert(api.state.sequences.some((sequence) => (sequence.sheafIds || []).includes(tangent.id)));
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
  const tangent = {
    id: 'TY',
    type: 'tangent',
    name: '\\mathcal{T}_{Y}',
    twist: '1',
    rank: '2',
    baseVarietyId: cover.id,
    basis: 'chern',
    nameDirty: true
  };
  api.addSheafObject(tangent, { activate: false });
  api.ensureAbsoluteDifferentialSesForCreatedSheaf(tangent, cover);
  assert.strictEqual(tangent.construction?.ramifiedCoverTangent, true);
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
  assert.strictEqual(tangentClass.symbol, 'c_{1}(\\widetilde{X})');
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

function testAbstractSmoothCyclicRamifiedCoverKeepsBranchDegreeSymbolic() {
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
    rootTwist: 2,
    defaultName: 'Y',
    name: 'Y'
  });

  assert.strictEqual(cover.construction.smoothCyclic, true);
  assert.strictEqual(cover.construction.branchDegree, null);
  assert.strictEqual(cover.construction.rootTwist, null);
  assert.strictEqual(api.state.sheaves.some((item) => item.construction?.type === 'ramified-cover-root'), false);
  assert(!base.homology?.rules?.some((item) => String(item.id || '').startsWith('default-ramified-cover-projective-branch-degree-')));
  assert(!base.homology?.rules?.some((item) => String(item.id || '').startsWith('default-ramified-cover-root-hyperplane-')));
  assert.strictEqual(api.buildHodgeNumbers(api.geometryFromVariety(cover)).entries[1][1].plain, 'h^1,1');
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

function testCurveRecommendationsCreateAjAndPicardCanonicalIdempotently() {
  const api = loadCalculator();
  const curve = { id: 'C', type: 'curve', dim: '1', genus: '3', name: 'C', labelX: 0.35, labelY: 0.65 };
  api.state.varieties = [curve];

  const items = api.recommendationItemsForSource({ kind: 'variety', object: curve });
  assert.strictEqual(items.map((item) => item.id).join(','), 'abel-jacobi-jacobian,picard-canonical');
  api.state.recommendationDraft = { sourceKind: 'variety', sourceId: 'C', selectedIds: { 'abel-jacobi-jacobian': true, 'picard-canonical': true } };
  const data = api.recommendationConstructionData();
  assert(data);
  api.createRecommendationConstructions(data);

  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'jacobian').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'abel-jacobi').length, 1);
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'picard-variety').length, 1);
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'product').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'projection').length, 2);
  const poincare = api.state.sheaves.find((item) => item.construction?.type === 'picard-poincare-line-bundle');
  assert(poincare);
  assert.notStrictEqual(poincare.hiddenOnCanvas, true);
  assert.strictEqual(poincare.construction.curveId, 'C');
  assert.strictEqual(poincare.construction.degreeSymbol, 'd');
  assert.strictEqual(api.state.sheaves.filter((item) => item.baseVarietyId === 'C' && item.type === 'canonical').length, 0);

  const realized = api.recommendationItemsForSource({ kind: 'variety', object: curve });
  assert(realized.every((item) => item.realized));
  api.createRecommendationConstructions({ source: { kind: 'variety', object: curve }, items: realized });
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'jacobian').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'abel-jacobi').length, 1);
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'picard-variety').length, 1);
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'product').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'projection').length, 2);
  assert.strictEqual(api.state.sheaves.filter((item) => item.construction?.type === 'picard-poincare-line-bundle').length, 1);
  assert.strictEqual(api.state.sheaves.filter((item) => item.baseVarietyId === 'C' && item.type === 'canonical').length, 0);
}

function testSymmetricProductRecommendationsCreateAjOnly() {
  const api = loadCalculator();
  const sym = {
    id: 'S',
    type: 'symmetric-product-curve',
    dim: '2',
    symmetricProductM: '2',
    symmetricProductGenus: '4',
    name: '\\operatorname{Sym}^{2}(C)',
    labelX: 0.35,
    labelY: 0.65
  };
  api.state.varieties = [sym];

  const items = api.recommendationItemsForSource({ kind: 'variety', object: sym });
  assert.strictEqual(items.map((item) => item.id).join(','), 'abel-jacobi-jacobian');
  api.createRecommendationConstructions({ source: { kind: 'variety', object: sym }, items });

  const jacobian = api.state.varieties.find((item) => item.construction?.type === 'jacobian');
  const map = api.state.maps.find((item) => item.construction?.type === 'abel-jacobi');
  assert(jacobian);
  assert.strictEqual(jacobian.dim, '4');
  assert(map);
  assert.strictEqual(map.domainId, 'S');
  assert.strictEqual(api.state.sheaves.filter((item) => item.construction?.type === 'picard-poincare-line-bundle').length, 0);
  assert.strictEqual(api.state.sheaves.filter((item) => item.baseVarietyId === 'S' && item.type === 'canonical').length, 0);
}

function testCompleteIntersectionRecommendationCreatesEmbeddingAndRules() {
  const api = loadCalculator();
  const ci = { id: 'X', type: 'complete-intersection', dim: '2', ciDegrees: '2,3', name: 'X', labelX: 0.35, labelY: 0.65 };
  api.state.varieties = [ci];

  const items = api.recommendationItemsForSource({ kind: 'variety', object: ci });
  assert.strictEqual(items.map((item) => item.id).join(','), 'complete-intersection-embedding');
  const map = api.createRecommendationConstructions({ source: { kind: 'variety', object: ci }, items });
  assert(map);
  assert.strictEqual(map.construction.type, 'complete-intersection-embedding');

  const ambient = api.state.varieties.find((item) => item.construction?.type === 'complete-intersection-ambient');
  assert(ambient);
  assert.strictEqual(ambient.type, 'projective');
  assert.strictEqual(ambient.dim, '4');
  assert.strictEqual(map.domainId, 'X');
  assert.strictEqual(map.codomainId, ambient.id);
  assert(api.completeIntersectionEmbeddingMapContext(map));

  const sourceGeometry = api.geometryFromVariety(ci);
  const ambientGeometry = api.geometryFromVariety(ambient);
  const sourceRules = api.defaultMapHomologyRulesForGeometry(sourceGeometry);
  const pullbackRule = sourceRules.find((rule) => rule.id === `default-complete-intersection-embedding-hyperplane-pullback-${map.id}`);
  assert(pullbackRule);
  const pullbackId = Object.keys(pullbackRule.lhs.powers)[0];
  assert.strictEqual(
    api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [pullbackId]: 1 }), { geometry: sourceGeometry, homology: sourceGeometry.homology })),
    'H'
  );

  const ambientRules = api.defaultMapHomologyRulesForGeometry(ambientGeometry);
  const pushforwardRule = ambientRules.find((rule) => rule.id === `default-complete-intersection-embedding-hyperplane-pushforward-${map.id}-1`);
  assert(pushforwardRule);
  const pushforwardId = Object.keys(pushforwardRule.lhs.powers)[0];
  assert.strictEqual(
    api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [pushforwardId]: 1 }), { geometry: ambientGeometry, homology: ambientGeometry.homology })),
    '6*H^3'
  );

  const sourceH = api.homologyVariableId(api.HOMOLOGY_HYPERPLANE_CLASS, sourceGeometry);
  const directPushforward = api.pushforwardPolynomialByDegree(map, api.polyFromPowers({ [sourceH]: 1 }), sourceGeometry.dim, ambientGeometry.dim, { proper: false });
  assert.strictEqual(api.formatPolyPlain(directPushforward), '6*H^3');

  api.createRecommendationConstructions({ source: { kind: 'variety', object: ci }, items: api.recommendationItemsForSource({ kind: 'variety', object: ci }) });
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'complete-intersection-ambient').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'complete-intersection-embedding').length, 1);
}

function testCompleteIntersectionRecommendationUnavailableForProjectiveOrTooLargeAmbient() {
  const api = loadCalculator();
  const projectiveAsCi = { id: 'P', type: 'complete-intersection', dim: '3', ciDegrees: '', name: '\\mathbb{P}^{3}' };
  const tooLarge = { id: 'Y', type: 'complete-intersection', dim: '15', ciDegrees: '2', name: 'Y' };
  api.state.varieties = [projectiveAsCi, tooLarge];

  assert.strictEqual(api.recommendationItemsForSource({ kind: 'variety', object: projectiveAsCi }).map((item) => item.id).join(','), '');
  assert.strictEqual(api.recommendationItemsForSource({ kind: 'variety', object: tooLarge }).map((item) => item.id).join(','), '');
}

function testRamifiedCoverMapRecommendationsCreateRamificationAndRevealRootLine() {
  const api = loadCalculator();
  const base = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}', labelX: 0.35, labelY: 0.65 };
  api.state.varieties = [base];
  const cover = api.createRamifiedCoverConstruction({
    base,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: true,
    branchDegree: 4,
    rootTwist: 2,
    defaultName: '\\widetilde{\\mathbb{P}^{3}}',
    name: '\\widetilde{\\mathbb{P}^{3}}'
  });
  const coverMap = api.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  const root = api.state.sheaves.find((item) => item.construction?.type === 'ramified-cover-root');
  assert(cover);
  assert(coverMap);
  assert(root);
  assert.strictEqual(root.hiddenOnCanvas, true);

  const items = api.recommendationItemsForSource({ kind: 'map', object: coverMap });
  assert.strictEqual(items.map((item) => item.id).join(','), 'ramification-divisor-inclusion,ramified-cover-root-line-bundle');
  assert.strictEqual(items.find((item) => item.id === 'ramified-cover-root-line-bundle').realized, false);
  api.createRecommendationConstructions({ source: { kind: 'map', object: coverMap }, items });

  const divisor = api.state.varieties.find((item) => item.construction?.type === 'ramified-cover-ramification-divisor');
  const inclusion = api.state.maps.find((item) => item.construction?.type === 'ramified-cover-ramification-inclusion');
  const visibleRoot = api.state.sheaves.find((item) => item.construction?.type === 'ramified-cover-root');
  assert(divisor);
  assert.strictEqual(divisor.name, 'R');
  assert.strictEqual(divisor.dim, '2');
  assert(inclusion);
  assert.strictEqual(inclusion.domainId, divisor.id);
  assert.strictEqual(inclusion.codomainId, cover.id);
  assert(visibleRoot);
  assert.strictEqual(visibleRoot.hiddenOnCanvas, false);
  assert.strictEqual(visibleRoot.construction.visibleOnCanvas, true);

  const coverGeometry = api.geometryFromVariety(cover);
  const rule = api.defaultMapHomologyRulesForGeometry(coverGeometry)
    .find((item) => item.id === `default-ramification-inclusion-unit-pushforward-${inclusion.id}`);
  assert(rule);
  const lhsId = Object.keys(rule.lhs.powers)[0];
  assert.strictEqual(
    api.formatPolyPlain(api.applyHomologyRules(api.polyFromPowers({ [lhsId]: 1 }), { geometry: coverGeometry, homology: coverGeometry.homology })),
    'R'
  );

  const realized = api.recommendationItemsForSource({ kind: 'map', object: coverMap });
  assert(realized.every((item) => item.realized));
  api.createRecommendationConstructions({ source: { kind: 'map', object: coverMap }, items: realized });
  assert.strictEqual(api.state.varieties.filter((item) => item.construction?.type === 'ramified-cover-ramification-divisor').length, 1);
  assert.strictEqual(api.state.maps.filter((item) => item.construction?.type === 'ramified-cover-ramification-inclusion').length, 1);
  assert.strictEqual(api.state.sheaves.filter((item) => item.construction?.type === 'ramified-cover-root').length, 1);
}

function testRamifiedCoverMapRecommendationEligibilityEdges() {
  const generalApi = loadCalculator();
  const base = { id: 'X', type: 'abstract', dim: '2', name: 'X' };
  generalApi.state.varieties = [base];
  generalApi.createRamifiedCoverConstruction({
    base,
    degree: 3,
    coverMode: 'general',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: false,
    defaultName: '\\widetilde{X}',
    name: '\\widetilde{X}'
  });
  const generalMap = generalApi.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  assert.strictEqual(
    generalApi.recommendationItemsForSource({ kind: 'map', object: generalMap }).map((item) => item.id).join(','),
    'ramification-divisor-inclusion'
  );

  const nonsmoothApi = loadCalculator();
  const nonsmoothBase = { id: 'Y', type: 'abstract', dim: '2', name: 'Y' };
  nonsmoothApi.state.varieties = [nonsmoothBase];
  nonsmoothApi.createRamifiedCoverConstruction({
    base: nonsmoothBase,
    degree: 2,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: false,
    defaultName: '\\widetilde{Y}',
    name: '\\widetilde{Y}'
  });
  const nonsmoothMap = nonsmoothApi.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  assert.strictEqual(
    nonsmoothApi.recommendationItemsForSource({ kind: 'map', object: nonsmoothMap }).map((item) => item.id).join(','),
    'ramification-divisor-inclusion'
  );

  const degreeOneApi = loadCalculator();
  const degreeOneBase = { id: 'Z', type: 'abstract', dim: '2', name: 'Z' };
  degreeOneApi.state.varieties = [degreeOneBase];
  degreeOneApi.createRamifiedCoverConstruction({
    base: degreeOneBase,
    degree: 1,
    coverMode: 'cyclic',
    branchSymbol: 'B',
    ramificationSymbol: 'R',
    smoothCyclic: false,
    defaultName: '\\widetilde{Z}',
    name: '\\widetilde{Z}'
  });
  const degreeOneMap = degreeOneApi.state.maps.find((item) => item.construction?.type === 'ramified-cover-map');
  assert.strictEqual(degreeOneApi.recommendationItemsForSource({ kind: 'map', object: degreeOneMap }).map((item) => item.id).join(','), '');
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

function testClassStepAutoTargetSelection() {
  const api = loadCalculator();
  assert.strictEqual(api.classStepAutoFamily({ basis: 'chern' }), 'chern');
  assert.strictEqual(api.classStepAutoFamily({ basis: 'character' }), 'character');
  assert.strictEqual(api.classStepAutoFamily({ basis: 'roots', type: 'abstract' }), 'chern');
  assert.strictEqual(api.classStepAutoFamily({ basis: 'chern', construction: { type: 'pushforward' } }), 'character');
}

function testClassStepFormalRanksAreSheafSpecific() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '1', name: 'X' }];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: 'r', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: 'r', name: 'F', baseVarietyId: 'X' },
    { id: 'G', type: 'abstract', basis: 'chern', rank: '2', name: 'G', baseVarietyId: 'X' }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sessionFor = (sheafObject) => {
    const sheaf = api.sheafFromObject(sheafObject, geometry);
    return api.createClassStepSession(api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' }), 'character', 0);
  };
  const eSession = sessionFor(api.state.sheaves[0]);
  assert.strictEqual(api.formatPolyPlain(eSession.rankComponent), 'r(E)');
  assert([...eSession.rankComponent.terms.keys()][0].startsWith('sheaf_E_ch0'));
  assert.strictEqual(api.VARS.get('sheaf_E_ch0').classStepDisplayPlain, 'ch_0(E)');
  assert.strictEqual(api.formatPolyPlain(sessionFor(api.state.sheaves[1]).rankComponent), 'r(F)');
  const gSession = sessionFor(api.state.sheaves[2]);
  assert.strictEqual(api.formatPolyPlain(gSession.rankComponent), 'r(G)');
  assert([...gSession.rankComponent.terms.keys()][0].startsWith('sheaf_G_ch0'));
  const gRank = api.collectClassStepRuleCandidates(gSession).find((candidate) => candidate.sourceLabel === 'rank');
  assert(gRank);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(gRank.rule)), '2');

  api.state.globalInvariants = [{ id: 'auto-r', type: 'rational-number', name: 'r', hasValue: true, value: '5', replaceWithValue: true }];
  const eKnownSession = sessionFor(api.state.sheaves[0]);
  assert.strictEqual(api.formatPolyPlain(eKnownSession.rankComponent), 'r(E)');
  assert([...eKnownSession.rankComponent.terms.keys()][0].startsWith('sheaf_E_ch0'));
  const eKnownRank = api.collectClassStepRuleCandidates(eKnownSession).find((candidate) => candidate.sourceLabel === 'rank');
  assert(eKnownRank);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(eKnownRank.rule)), '5');
}

function testClassStepSesAppliesRankAsCharacterZero() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '1', name: 'X' }];
  api.state.sheaves = [
    { id: 'A', type: 'abstract', basis: 'character', rank: 'a', name: 'A', baseVarietyId: 'X' },
    { id: 'B', type: 'abstract', basis: 'character', rank: 'b', name: 'B', baseVarietyId: 'X', construction: { type: 'ses-term', role: 'middle', sequenceId: 'S' } },
    { id: 'C', type: 'abstract', basis: 'character', rank: 'c', name: 'C', baseVarietyId: 'X' }
  ];
  api.state.sequences = [{ id: 'S', type: 'short-exact-sequence', sheafIds: ['A', 'B', 'C'], mapIds: [], baseVarietyId: 'X' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[1], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', 0);
  const ses = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'SES');
  assert(ses, api.collectClassStepRuleCandidates(session).map((candidate) => candidate.sourceLabel).join(','));
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(ses.rule)), 'r(A) + r(C)');
  session.components[0] = api.applyClassStepRulesToPoly(session.components[0], ses.rules, geometry.dim, { oncePerRule: true, onePass: true });
  assert.strictEqual(api.formatPolyPlain(session.components[0]), 'r(A) + r(C)');
}

function testClassStepDerivedCharacteristicTargets() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [{ id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const toddSession = api.createClassStepSession(result, 'chern', 1, 'todd');
  assert.strictEqual(toddSession.family, 'chern');
  assert.strictEqual(toddSession.target, 'todd');
  assert.strictEqual(api.buildClassRowsFromStepSession(toddSession, api.classDisplayOptions(geometry, sheaf))[0].label, 'td_1(E)');
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(toddSession)), 'td_1(E)');
  const toddRule = api.collectClassStepRuleCandidates(toddSession).find((candidate) => candidate.sourceLabel === 'Todd');
  assert(toddRule);
  assert(api.formatPolyPlain(api.homologyRuleRhsPoly(toddRule.rule)).includes('c_1(E)'));

  const segreSession = api.createClassStepSession(result, 'chern', null, 'segre');
  segreSession.active = false;
  segreSession.stopped = true;
  const segreRows = api.buildClassRowsFromStepSession(segreSession, api.classDisplayOptions(geometry, sheaf));
  assert.strictEqual(segreRows.length, 1);
  assert.strictEqual(segreRows[0].key, 'segre');

  const mukaiSession = api.createClassStepSession(result, 'chern', 1, 'mukai');
  assert.strictEqual(mukaiSession.family, 'chern');
  assert.strictEqual(mukaiSession.target, 'mukai');
  assert.strictEqual(api.buildClassRowsFromStepSession(mukaiSession, api.classDisplayOptions(geometry, sheaf))[0].label, 'v_1(E)');
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(mukaiSession)), 'v_1(E)');
  const mukaiRule = api.collectClassStepRuleCandidates(mukaiSession).find((candidate) => candidate.sourceLabel === 'Mukai vector');
  assert(mukaiRule);
  const mukaiPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(mukaiRule.rule));
  assert.strictEqual(mukaiPlain, '(ch(E)*sqrt td(X))_1');
  mukaiSession.displayOverrides = { 'mukai:1': api.homologyRuleRhsPoly(mukaiRule.rule) };
  const mukaiExpandRule = api.collectClassStepRuleCandidates(mukaiSession).find((candidate) => candidate.sourceLabel === 'Mukai vector');
  assert(mukaiExpandRule);
  const mukaiExpandedPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(api.classStepMaterializeRule(mukaiSession, mukaiExpandRule.rule)));
  assert(mukaiExpandedPlain.includes('ch_1(E)'), mukaiExpandedPlain);
  assert(mukaiExpandedPlain.includes('td_1(X)') || mukaiExpandedPlain.includes('r(E)'), mukaiExpandedPlain);

  const kappaSession = api.createClassStepSession(result, 'chern', 2, 'kappa');
  assert.strictEqual(kappaSession.family, 'chern');
  assert.strictEqual(kappaSession.target, 'kappa');
  assert.strictEqual(api.buildClassRowsFromStepSession(kappaSession, api.classDisplayOptions(geometry, sheaf))[0].label, 'kappa_2(E)');
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(kappaSession)), 'kappa_2(E)');
  const kappaRule = api.collectClassStepRuleCandidates(kappaSession).find((candidate) => candidate.sourceLabel === 'Kappa');
  assert(kappaRule);
  const kappaPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(kappaRule.rule));
  assert(kappaPlain.includes('ch_2(E)'), kappaPlain);
  assert(kappaPlain.includes('ch_1(E)'), kappaPlain);
  assert(!kappaPlain.includes('c_1(E)'), kappaPlain);

  api.state.sheaves[0].rank = 'r';
  const symbolicSheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const symbolicResult = api.buildClassStepFallbackResult(geometry, symbolicSheaf, { message: 'test' });
  const symbolicKappaSession = api.createClassStepSession(symbolicResult, 'chern', 2, 'kappa');
  const symbolicKappaRule = api.collectClassStepRuleCandidates(symbolicKappaSession).find((candidate) => candidate.sourceLabel === 'Kappa');
  assert(symbolicKappaRule);
  const symbolicKappaPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(symbolicKappaRule.rule));
  assert(symbolicKappaPlain.includes('r(E)^-1') || symbolicKappaPlain.includes('1/(r(E))'), symbolicKappaPlain);
  assert(symbolicKappaPlain.includes('ch_1(E)^2'), symbolicKappaPlain);
  assert(!symbolicKappaPlain.includes('c_1(E)'), symbolicKappaPlain);
}

function testClassStepToddRuleStopsAtChernClasses() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X',
    type: 'abstract',
    dim: '2',
    name: 'X',
    homology: {
      classes: { unit: { symbol: '1' } },
      customClasses: [
        { id: api.tangentChernHomologyClassId(1), symbol: 'K', degree: 1, cohomologyDegree: 2 },
        { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 }
      ],
      rules: []
    }
  }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(geometry);
  const tangentId = api.homologyDefVariableId(defs.find((def) => def.id === api.tangentChernHomologyClassId(1)), geometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), geometry);
  geometry.homology.rules = [{
    id: 'tangent-to-a',
    enabled: true,
    lhs: { powers: { [tangentId]: 1 } },
    rhs: [{ coefficient: '1', powers: { [aId]: 1 } }]
  }];
  const session = {
    geometry,
    family: 'chern',
    target: 'todd',
    dimension: 2,
    index: 1,
    components: [api.polyFromPowers({}), api.polyFromPowers({}), api.polyFromPowers({})],
    rankComponent: api.polyFromPowers({}),
    bundleLabelLatex: 'E',
    bundleLabelPlain: 'E',
    displayOverrides: {}
  };
  const tdId = 'class_step_td_v_X_1';
  api.VARS.set(tdId, { degree: 1, latex: '\\operatorname{td}_{1}(X)', plain: 'td_1(X)', classStepKind: 'formalTodd', geometryId: 'X', classStepDegree: 1 });
  session.components[1] = api.polyFromPowers({ [tdId]: 1 });
  const todd = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'Todd');
  assert(todd);
  const rhs = api.formatPolyPlain(api.homologyRuleRhsPoly(todd.rule));
  assert(rhs.includes('c_1(X)'), rhs);
  assert(!rhs.includes('A'), rhs);
}

function testClassStepDerivedTargetAppliesVisibleHomologyRule() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'A',
    type: 'abstract',
    dim: '2',
    name: 'A',
    homology: {
      classes: { point: { symbol: '[p]' }, unit: { symbol: '1' } },
      customClasses: [{ id: 'T', symbol: '\\Theta', cohomologyDegree: 2 }],
      rules: []
    }
  }];
  api.state.sheaves = [{ id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'A' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(geometry);
  const thetaId = api.homologyDefVariableId(defs.find((def) => def.id === 'T'), geometry);
  const pointId = api.homologyDefVariableId(defs.find((def) => def.id === 'point'), geometry);
  geometry.homology.rules = [{
    id: 'theta-square-point',
    enabled: true,
    lhs: { powers: { [thetaId]: 2 } },
    rhs: [{ coefficient: '2', powers: { [pointId]: 1 } }]
  }];
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  api.state.lastResult = result;
  const session = api.createClassStepSession(result, 'chern', 2, 'sqrtTodd');
  const zero = api.polyFromPowers({}).sub(api.polyFromPowers({}));
  session.components[1] = api.polyFromPowers({ [thetaId]: 1 });
  session.components[2] = zero;
  api.state.classStepSession = session;
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'sqrt td_2(E)');
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.sourceLabel === 'sqrt Todd'
  }));
  assert(session.candidates.some((candidate) => candidate.selected),
    session.candidates.map((candidate) => `${candidate.sourceLabel}:${candidate.rule.id}:${api.formatPolyPlain(api.homologyRuleRhsPoly(candidate.rule))}`).join(' | '));
  api.applySelectedClassStepRules();
  assert(api.formatPolyPlain(api.classStepDisplayPoly(session)).includes('Theta^2'));
  assert(api.buildClassRowsFromStepSession(session, api.classDisplayOptions(geometry, sheaf))[0].plain.includes('[p]'));
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: (candidate.rules || [candidate.rule]).some((rule) => rule.id === 'theta-square-point')
  }));
  assert(session.candidates.some((candidate) => candidate.selected),
    session.candidates.map((candidate) => `${candidate.sourceLabel}:${candidate.rule.id}:${api.formatPolyPlain(api.homologyRuleRhsPoly(candidate.rule))}`).join(' | '));
  api.applySelectedClassStepRules();
  const after = api.formatPolyPlain(api.classStepDisplayPoly(session));
  assert(after.includes('[p]'), after);
  assert(!after.includes('Theta^2'), after);
  assert.strictEqual(session.message, 'Applied selected rules.');
}

function testClassFormulaBuilderTokenSourcesAndValidation() {
  const api = loadCalculator();
  api.state.varieties = [
    {
      id: 'X',
      type: 'abstract',
      dim: '2',
      name: 'X',
      homology: {
        customClasses: [{ id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 }],
        rules: []
      }
    },
    {
      id: 'Y',
      type: 'projective',
      dim: '2',
      name: 'Y',
      homology: { classes: { hyperplane: { symbol: 'H' }, point: { symbol: '[p]' } } }
    }
  ];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: '2', name: 'F', baseVarietyId: 'Y' }
  ];
  api.state.maps = [{ id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' }];
  const xGeometry = api.geometryFromVariety(api.state.varieties[0]);
  api.setClassFormulaBuilderVariety('X');
  api.state.activeHomologyTarget = { kind: 'map', id: 'f' };
  const homologyTokens = api.classFormulaHomologyTokenDefs(xGeometry);
  const sheafTokens = api.classFormulaSheafTokenDefs(xGeometry);
  const mapTokens = api.classFormulaMapTokenDefs(xGeometry);
  assert(homologyTokens.some((token) => token.plain === 'A'));
  assert(!homologyTokens.some((token) => token.atomKind === 'map-pullback' || token.plain.includes('f^*')), homologyTokens.map((token) => token.plain).join(', '));
  assert(sheafTokens.some((token) => token.plain === 'c_1(E)'));
  assert(sheafTokens.some((token) => token.plain === 'v(E)'));
  assert(sheafTokens.some((token) => token.plain === 'kappa(E)'));
  assert(!sheafTokens.some((token) => token.plain.includes('F')));
  assert(mapTokens.some((token) => token.type === 'functor-template' && token.operation === 'pullback' && token.sourceGeometryId === 'Y'));
  const classFamilies = api.classFormulaClassFamiliesForGeometry(xGeometry).map((family) => family.value);
  assert(classFamilies.includes('mukai'));
  assert(classFamilies.includes('kappa'));

  const selectedTotal = api.classFormulaSheafTokenForSelection(xGeometry, 'E', 'chern', '');
  assert.strictEqual(selectedTotal.plain, 'c(E)');
  const selectedDegree = api.classFormulaSheafTokenForSelection(xGeometry, 'E', 'chern', '1');
  assert.strictEqual(selectedDegree.plain, 'c_1(E)');
  const selectedMukai = api.classFormulaSheafTokenForSelection(xGeometry, 'E', 'mukai', '1');
  assert.strictEqual(selectedMukai.plain, 'v_1(E)');
  api.state.classFormulaBuilder.tokens = [selectedMukai];
  const mukaiValid = api.validateClassFormulaBuilder();
  assert.strictEqual(mukaiValid.ok, true, mukaiValid.message);
  assert.strictEqual(api.formatPolyPlain(mukaiValid.poly), 'v_1(E)');
  const missingSheaf = api.classFormulaSheafTokenForSelection(xGeometry, 'F', 'chern', '1');
  assert.strictEqual(missingSheaf, null);

  const a = homologyTokens.find((token) => token.plain === 'A');
  api.state.classFormulaBuilder.tokens = [a, api.classFormulaOperatorToken('times'), a];
  const valid = api.validateClassFormulaBuilder();
  assert.strictEqual(valid.ok, true, valid.message);
  assert.strictEqual(api.formatPolyPlain(valid.poly), 'A^2');
  api.state.classFormulaBuilder.tokens = [a, a];
  const implicitProduct = api.validateClassFormulaBuilder();
  assert.strictEqual(implicitProduct.ok, true, implicitProduct.message);
  assert.strictEqual(api.formatPolyPlain(implicitProduct.poly), 'A^2');

  const unresolved = sheafTokens.find((token) => token.plain === 'c_1(E)');
  api.state.classFormulaBuilder.tokens = [unresolved];
  const unresolvedValid = api.validateClassFormulaBuilder();
  assert.strictEqual(unresolvedValid.ok, true, unresolvedValid.message);
  assert(api.formatPolyPlain(unresolvedValid.poly).includes('c_1(E)'));

  const yGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const yHyperplane = api.classFormulaHomologyTokenDefs(yGeometry).find((token) => token.plain === 'H');
  const pullbackTemplate = mapTokens.find((token) => token.operation === 'pullback');
  api.state.classFormulaBuilder.tokens = [{
    ...pullbackTemplate,
    type: 'functor-slot',
    slotId: 'slot-test',
    tokens: []
  }];
  const emptyFunctor = api.validateClassFormulaBuilder();
  assert.strictEqual(emptyFunctor.ok, false);
  assert(/empty/i.test(emptyFunctor.message), emptyFunctor.message);
  api.state.classFormulaBuilder.tokens[0].tokens = [yHyperplane];
  const pullbackValid = api.validateClassFormulaBuilder();
  assert.strictEqual(pullbackValid.ok, true, pullbackValid.message);
  assert(pullbackValid.plain.includes('f^*(H)'), pullbackValid.plain);
  assert(api.formatPolyPlain(pullbackValid.poly).includes('f^*'), api.formatPolyPlain(pullbackValid.poly));
}

function testClassFormulaBuilderRejectsInvalidMapAndStartsStepSession() {
  const api = loadCalculator();
  api.state.varieties = [
    {
      id: 'X',
      type: 'abstract',
      dim: '2',
      name: 'X',
      homology: {
        customClasses: [
          { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 },
          { id: 'B', symbol: 'B', degree: 1, cohomologyDegree: 2 }
        ],
        rules: []
      }
    },
    { id: 'Y', type: 'abstract', dim: '1', name: 'Y' }
  ];
  api.state.maps = [{ id: 'f', name: 'f', domainKind: 'variety', domainId: 'Y', codomainKind: 'variety', codomainId: 'X' }];
  const xGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(xGeometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), xGeometry);
  const bId = api.homologyDefVariableId(defs.find((def) => def.id === 'B'), xGeometry);
  api.state.varieties[0].homology.rules = [{
    id: 'A-to-B',
    enabled: true,
    lhs: { powers: { [aId]: 1 } },
    rhs: [{ coefficient: '1', powers: { [bId]: 1 } }]
  }];
  api.setClassFormulaBuilderVariety('X');
  const aToken = api.classFormulaHomologyTokenDefs(api.geometryFromVariety(api.state.varieties[0])).find((token) => token.plain === 'A');
  api.state.classFormulaBuilder.tokens = [
    {
      type: 'functor',
      operation: 'pullback',
      mapId: 'f',
      sourceGeometryId: 'Y',
      targetGeometryId: 'Y',
      latex: 'f^*',
      plain: 'f^*'
    },
    { type: 'paren', value: '(', latex: '(', plain: '(' },
    aToken,
    { type: 'paren', value: ')', latex: ')', plain: ')' }
  ];
  const invalid = api.validateClassFormulaBuilder();
  assert.strictEqual(invalid.ok, false);
  assert(/target|different variety|source/i.test(invalid.message), invalid.message);

  api.state.classFormulaBuilder.tokens = [aToken];
  const check = api.checkClassFormulaBuilder();
  assert.strictEqual(check.ok, true, check.message);
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert(session.formulaSession);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'A');
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.rule.id === 'A-to-B'
  }));
  assert(session.candidates.some((candidate) => candidate.selected));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'B');
}

function testClassFormulaBuilderRendersSelectedClassButtonAndEditableTokens() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '3', name: 'X' }];
  api.state.sheaves = [{ id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' }];
  api.refs.classFormulaBuilder = {};
  api.refs.classFormulaVariety = { innerHTML: '', disabled: true };
  api.refs.classFormulaHomologyButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaAddSheafClass = { disabled: true, innerHTML: '', title: '' };
  api.refs.classFormulaClassFamily = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassDegree = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassSheaf = { innerHTML: '', disabled: true };
  api.refs.classFormulaMapButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaPreview = { innerHTML: '', classList: { toggle() {} }, setAttribute() {} };
  api.refs.classFormulaMessage = { textContent: '' };
  api.refs.classFormulaUndo = { disabled: true };
  api.refs.classFormulaClear = { disabled: true };
  api.refs.classFormulaCheck = { disabled: true };
  api.refs.classFormulaCompute = { disabled: true };

  api.state.classFormulaEditorOpen = true;
  api.setClassFormulaBuilderVariety('X');
  api.state.classFormulaBuilder.classFamily = 'chern';
  api.state.classFormulaBuilder.classDegree = '3';
  api.state.classFormulaBuilder.classSheafId = 'E';
  api.renderClassFormulaBuilder();
  assert(api.refs.classFormulaAddSheafClass.innerHTML.includes('c_{3}(E)'), api.refs.classFormulaAddSheafClass.innerHTML);

  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const token = api.classFormulaSheafTokenForSelection(geometry, 'E', 'chern', '3');
  api.state.classFormulaBuilder.tokens = [token];
  api.state.classFormulaBuilder.cursorIndex = 1;
  api.renderClassFormulaBuilder();
  assert(api.refs.classFormulaPreview.innerHTML.includes('formula-token-chip'), api.refs.classFormulaPreview.innerHTML);
  assert(api.refs.classFormulaPreview.innerHTML.includes('formula-cursor is-active'), api.refs.classFormulaPreview.innerHTML);
  api.checkClassFormulaBuilder();
  assert(!api.refs.classFormulaPreview.innerHTML.includes('formula-token-chip'), api.refs.classFormulaPreview.innerHTML);
  assert(api.refs.classFormulaPreview.innerHTML.includes('\\('), api.refs.classFormulaPreview.innerHTML);
}

function testClassStepFormulaHistoryAndUndoLastStep() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X',
    type: 'abstract',
    dim: '2',
    name: 'X',
    homology: {
      customClasses: [
        { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 },
        { id: 'B', symbol: 'B', degree: 1, cohomologyDegree: 2 }
      ],
      rules: []
    }
  }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(geometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), geometry);
  const bId = api.homologyDefVariableId(defs.find((def) => def.id === 'B'), geometry);
  api.state.varieties[0].homology.rules = [{
    id: 'A-to-B',
    enabled: true,
    lhs: { powers: { [aId]: 1 } },
    rhs: [{ coefficient: '1', powers: { [bId]: 1 } }]
  }];
  api.refs.classStepPanel = { hidden: false, classList: { toggle() {} } };
  api.refs.classStepCard = { hidden: false, classList: { remove() {} } };
  api.refs.classStepFormula = { innerHTML: '' };
  api.refs.classStepHistoryControls = { hidden: true, innerHTML: '' };
  api.refs.classStepRules = { hidden: false, innerHTML: '' };
  api.refs.classStepCheckSwitch = { disabled: false, textContent: '' };
  api.refs.classStepMessage = { textContent: '' };
  api.refs.classStepApply = { disabled: false };
  api.refs.classStepUndo = { disabled: true };
  api.refs.classStepUseCache = { checked: false };
  api.refs.classStepOncePerRule = { checked: true };
  api.refs.classStepOnePass = { checked: false };
  api.setClassFormulaBuilderVariety('X');
  const aToken = api.classFormulaHomologyTokenDefs(geometry).find((token) => token.plain === 'A');
  api.state.classFormulaBuilder.tokens = [aToken];
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert.strictEqual(session.stepHistory.length, 1);
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.rule.id === 'A-to-B'
  }));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'B');
  assert.strictEqual(session.stepHistory.length, 2);
  assert(api.refs.classStepFormula.innerHTML.includes('\\begin{aligned}'), api.refs.classStepFormula.innerHTML);
  assert(!api.refs.classStepFormula.innerHTML.includes('\\cong'), api.refs.classStepFormula.innerHTML);
  assert(api.refs.classStepFormula.innerHTML.includes('=\\;& B'), api.refs.classStepFormula.innerHTML);
  assert(api.refs.classStepHistoryControls.innerHTML.includes('hide line 2'), api.refs.classStepHistoryControls.innerHTML);
  api.state.classStepSession = session;
  api.toggleClassStepHistoryLine(0);
  assert(session.stepHistory[0].hidden);
  assert(api.renderClassStepCalculationLatex(session).includes('A:=\\;& \\cdots'));
  assert(api.renderClassStepCalculationLatex(session).includes('B'));
  assert(api.classStepHistoryPlain(session).includes('A := ...'));
  api.toggleClassStepHistoryLine(0);
  assert(!session.stepHistory[0].hidden);
  assert.strictEqual(api.refs.classStepUndo.disabled, false);
  api.undoLastClassStep();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'A');
  assert.strictEqual(session.stepHistory.length, 1);
  assert.strictEqual(api.refs.classStepUndo.disabled, true);
}

function testClassStepSavedFormulaRulesAreReusableAndRemovable() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X',
    type: 'abstract',
    dim: '1',
    name: 'X'
  }];
  api.state.sheaves = [{ id: 'E', type: 'abstract', basis: 'chern', rank: '', name: 'E', baseVarietyId: 'X' }];
  api.refs.classStepPanel = { hidden: false, classList: { toggle() {} } };
  api.refs.classStepCard = { hidden: false, classList: { remove() {} } };
  api.refs.classStepFormula = { innerHTML: '' };
  api.refs.classStepHistoryControls = { hidden: true, innerHTML: '' };
  api.refs.classStepRules = { hidden: false, innerHTML: '' };
  api.refs.classStepCheckSwitch = { disabled: false, textContent: '' };
  api.refs.classStepMessage = { textContent: '' };
  api.refs.classStepApply = { disabled: false };
  api.refs.classStepSaveRule = { disabled: true, title: '' };
  api.refs.classStepUndo = { disabled: true };
  api.refs.classStepUseCache = { checked: false };
  api.refs.classStepOncePerRule = { checked: true };
  api.refs.classStepOnePass = { checked: false };
  api.refs.classStepSavedRules = { hidden: true, innerHTML: '' };

  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  api.state.lastResult = result;
  const session = api.createClassStepSession(result, 'character', 0);
  api.state.classStepSession = session;
  session.components[0] = api.polyFromPowers({}).sub(api.polyFromPowers({}));
  assert.strictEqual(api.saveCurrentClassStepFormulaAsRule(), true);
  assert.strictEqual(api.state.classStepSavedRules.length, 1);
  assert(api.refs.classStepSavedRules.innerHTML.includes('saved formulas'), api.refs.classStepSavedRules.innerHTML);

  api.stopClassStepSession();
  assert.strictEqual(api.state.classStepSavedRules.length, 1);

  const nextSession = api.createClassStepSession(result, 'character', 0);
  api.state.classStepSession = nextSession;
  const saved = api.collectClassStepRuleCandidates(nextSession).find((candidate) => candidate.sourceLabel === 'saved formula');
  assert(saved);
  assert.strictEqual(saved.selected, false);
  nextSession.candidates = api.collectClassStepRuleCandidates(nextSession).map((candidate) => ({
    ...candidate,
    selected: candidate.sourceLabel === 'saved formula'
  }));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(nextSession)), '0');

  assert.strictEqual(api.deleteClassStepSavedRule(api.state.classStepSavedRules[0].id), true);
  assert.strictEqual(api.state.classStepSavedRules.length, 0);
  assert(!api.collectClassStepRuleCandidates(api.createClassStepSession(result, 'character', 0)).some((candidate) => candidate.sourceLabel === 'saved formula'));
}

function testUnitFactorsAreNormalizedInStepPolynomials() {
  const api = loadCalculator();
  api.VARS.set('unitX', { degree: 0, cohomologyDegree: 0, latex: '1', plain: '1' });
  api.VARS.set('a', { degree: 1, cohomologyDegree: 2, latex: 'a', plain: 'a' });
  api.VARS.set('b', { degree: 1, cohomologyDegree: 2, latex: 'b', plain: 'b' });
  const withUnit = api.polyFromPowers({ unitX: 1, a: 1 });
  const withoutUnit = api.polyFromPowers({ a: 1 });
  assert.strictEqual(api.formatPolyPlain(withUnit), 'a');
  assert.strictEqual(api.formatPolyLatex(withUnit), 'a');
  assert.strictEqual(api.formatPolyPlain(withUnit.add(withoutUnit)), '2*a');

  const rule = {
    id: 'a-to-b',
    enabled: true,
    lhs: { powers: { a: 1 } },
    rhs: [{ coefficient: '1', powers: { b: 1, unitX: 1 } }]
  };
  const after = api.applyClassStepRulesToPoly(withUnit, [rule], 2, { oncePerRule: true, onePass: true });
  assert.strictEqual(api.formatPolyPlain(after), 'b');
}

function testClassStepSimplifyIsSelectableRule() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X',
    type: 'abstract',
    dim: '2',
    name: 'X',
    homology: {
      customClasses: [
        { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 },
        { id: 'B', symbol: 'B', degree: 1, cohomologyDegree: 2 },
        { id: 'C', symbol: 'C', degree: 1, cohomologyDegree: 2 }
      ],
      rules: []
    }
  }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const defs = api.homologyClassDefinitions(geometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), geometry);
  const bId = api.homologyDefVariableId(defs.find((def) => def.id === 'B'), geometry);
  const cId = api.homologyDefVariableId(defs.find((def) => def.id === 'C'), geometry);
  api.state.varieties[0].homology.rules = [
    {
      id: 'A-to-B',
      enabled: true,
      lhs: { powers: { [aId]: 1 } },
      rhs: [{ coefficient: '1', powers: { [bId]: 1 } }]
    },
    {
      id: 'B-to-C',
      enabled: true,
      lhs: { powers: { [bId]: 1 } },
      rhs: [{ coefficient: '1', powers: { [cId]: 1 } }]
    }
  ];
  api.refs.classStepPanel = { hidden: false, classList: { toggle() {} } };
  api.refs.classStepCard = { hidden: false, classList: { remove() {} } };
  api.refs.classStepFormula = { innerHTML: '' };
  api.refs.classStepHistoryControls = { hidden: true, innerHTML: '' };
  api.refs.classStepRules = { hidden: false, innerHTML: '' };
  api.refs.classStepCheckSwitch = { disabled: false, textContent: '' };
  api.refs.classStepMessage = { textContent: '' };
  api.refs.classStepApply = { disabled: false };
  api.refs.classStepUndo = { disabled: true };
  api.refs.classStepUseCache = { checked: false };
  api.refs.classStepOncePerRule = { checked: true };
  api.refs.classStepOnePass = { checked: false };
  api.setClassFormulaBuilderVariety('X');
  const aToken = api.classFormulaHomologyTokenDefs(geometry).find((token) => token.plain === 'A');
  api.state.classFormulaBuilder.tokens = [aToken];
  const session = api.startClassStepSessionFromFormulaBuilder();
  assert(session.candidates.some((candidate) => candidate.sourceLabel === 'simplify' && candidate.selected !== false));
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.rule.id === 'A-to-B'
  }));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'B');
  api.undoLastClassStep();

  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.rule.id === 'A-to-B' || candidate.sourceLabel === 'simplify'
  }));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'C');
  const historyLength = session.stepHistory.length;
  session.candidates = api.collectClassStepRuleCandidates(session).map((candidate) => ({
    ...candidate,
    selected: candidate.sourceLabel === 'simplify'
  }));
  api.applySelectedClassStepRules();
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'C');
  assert.strictEqual(session.stepHistory.length, historyLength);
}

function testClassStepCandidatesOnlyIncludeApplicableRules() {
  const api = loadCalculator();
  const geometry = {
    type: 'abstract',
    dim: 2,
    labelLatex: 'X',
    labelPlain: 'X',
    varietyId: 'X',
    homology: {
      customClasses: [
        { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 },
        { id: 'B', symbol: 'B', degree: 1, cohomologyDegree: 2 },
        { id: 'C', symbol: 'C', degree: 1, cohomologyDegree: 2 }
      ],
      rules: []
    }
  };
  const defs = api.homologyClassDefinitions(geometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), geometry);
  const bId = api.homologyDefVariableId(defs.find((def) => def.id === 'B'), geometry);
  const cId = api.homologyDefVariableId(defs.find((def) => def.id === 'C'), geometry);
  geometry.homology.rules = [
    { id: 'A-to-B', enabled: true, lhs: { powers: { [aId]: 1 } }, rhs: [{ coefficient: '1', powers: { [bId]: 1 } }] },
    { id: 'C-to-B', enabled: true, lhs: { powers: { [cId]: 1 } }, rhs: [{ coefficient: '1', powers: { [bId]: 1 } }] }
  ];
  const session = {
    geometry,
    sheaf: { id: 'E', type: 'abstract', basis: 'chern', rankPlain: '2', rankLatex: '2', labelLatex: 'E', labelPlain: 'E', sourceObject: { id: 'E', basis: 'chern' } },
    family: 'chern',
    dimension: 2,
    index: 1,
    components: [api.polyFromPowers({}), api.polyFromPowers({ [aId]: 1 }), api.polyFromPowers({})]
  };
  const ids = api.collectClassStepRuleCandidates(session).map((candidate) => candidate.rule.id);
  assert(ids.includes('A-to-B'));
  assert(!ids.includes('C-to-B'));
}

function testClassStepStartsFromFormalConstructedSheafClassAndOffersSesRule() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [
    { id: 'I', type: 'abstract', basis: 'chern', rank: '1', name: 'I_C', baseVarietyId: 'X', construction: { type: 'ses-term', role: 'subobject', sequenceId: 'S' } },
    { id: 'O', type: 'structure', basis: 'chern', rank: '1', name: '\\mathcal{O}_X', baseVarietyId: 'X' },
    { id: 'Q', type: 'abstract', basis: 'chern', rank: '1', name: 'Q', baseVarietyId: 'X' }
  ];
  api.state.sequences = [{ id: 'S', type: 'short-exact-sequence', sheafIds: ['I', 'O', 'Q'], mapIds: [], baseVarietyId: 'X' }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const computedBundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  api.state.lastResult = { geometry, sheaf, bundle: computedBundle };
  const session = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  const first = api.formatPolyPlain(session.components[1]);
  assert(first.includes('c_1(I_C)'));
  assert(!first.includes('c_1(Q)'));
  const candidates = api.collectClassStepRuleCandidates(session);
  const sesRule = candidates.find((candidate) => candidate.sourceLabel === 'SES');
  assert(sesRule);
  assert(api.formatPolyPlain(api.homologyRuleRhsPoly(sesRule.rule)).includes('c_1(Q)'));
  assert.strictEqual(candidates.filter((candidate) => candidate.sourceLabel === 'SES').length, 1);
}

function testClassStepPushforwardOffersGrrRule() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '4', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    {
      id: 'J',
      type: 'abelian',
      dim: '4',
      name: 'J',
      genus: 'g',
      homology: { classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } }, rules: [] },
      construction: { type: 'jacobian', curveId: 'C' }
    }
  ];
  api.state.maps = [{ id: 'AJ', name: 'AJ', domainKind: 'variety', domainId: 'C', codomainKind: 'variety', codomainId: 'J', construction: { type: 'abel-jacobi', curveId: 'C', jacobianId: 'J' } }];
  api.state.sheaves = [
    { id: 'T', type: 'tangent', basis: 'chern', rank: 'r', name: 'T_C', baseVarietyId: 'C' },
    { id: 'P', type: 'abstract', basis: 'chern', rank: 'r', name: 'AJ_*T_C', baseVarietyId: 'J', construction: { type: 'pushforward', mapId: 'AJ', sheafId: 'T', exact: true, proper: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[1], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', null);
  const grrRules = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel === 'GRR');
  assert.strictEqual(grrRules.length, 1);
  const grrRule = grrRules[0];
  assert(grrRule.rules.some((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)).includes('ch_3(AJ_*T_C)')));
  assert(grrRule.rule.classStepDisplayLatex.includes('\\operatorname{ch}'));
  assert(grrRule.rule.classStepDisplayLatex.includes('\\operatorname{td}'));
  const ch3Rule = grrRule.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)).includes('ch_3(AJ_*T_C)'));
  const materializedCh3 = api.classStepMaterializeRule(session, ch3Rule);
  const ch3Plain = api.formatPolyPlain(api.homologyRuleRhsPoly(materializedCh3));
  assert.strictEqual(ch3Plain, '1/6*Theta^3*r(T_C)');
  const ch4Rule = grrRule.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)).includes('ch_4(AJ_*T_C)'));
  const materializedCh4 = api.classStepMaterializeRule(session, ch4Rule);
  const ch4Plain = api.formatPolyPlain(api.homologyRuleRhsPoly(materializedCh4));
  assert(ch4Plain.includes('AJ_*'), ch4Plain);
  assert(ch4Plain.includes('td_1(C)') || ch4Plain.includes('ch_1(T_C)'), ch4Plain);
  assert(!ch4Plain.includes('+ 1/3*Theta^3*r(T_C)'), ch4Plain);
  session.components[4] = api.applyClassStepRulesToPoly(session.components[4], [materializedCh4], geometry.dim, { oncePerRule: true, onePass: true });
  const nextCandidates = api.collectClassStepRuleCandidates(session).map((candidate) => candidate.sourceLabel);
  assert(nextCandidates.includes('Todd'));
}

function testClassStepTotalCharacterGrrAppliesToVisibleTotal() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '3', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    { id: 'J', type: 'abelian', dim: '3', name: 'J', genus: '3', homology: { classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } }, rules: [] }, construction: { type: 'jacobian', curveId: 'C' } }
  ];
  api.state.maps = [{ id: 'AJ', name: 'AJ', domainKind: 'variety', domainId: 'C', codomainKind: 'variety', codomainId: 'J', construction: { type: 'abel-jacobi', curveId: 'C', jacobianId: 'J' } }];
  api.state.sheaves = [
    { id: 'OC', type: 'structure', basis: 'chern', rank: '1', name: 'O_C', baseVarietyId: 'C' },
    { id: 'P', type: 'abstract', basis: 'chern', rank: 'r', name: 'AJ_*O_C', baseVarietyId: 'J', construction: { type: 'pushforward', mapId: 'AJ', sheafId: 'OC', exact: true, proper: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[1], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', null);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'ch(AJ_*O_C)');
  const grr = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'GRR');
  assert(grr);
  assert.strictEqual(grr.rule.classStepKind, 'pushforward-grr-total');
  assert.strictEqual(api.formatPolyPlain(api.polyFromPowers(grr.rule.lhs.powers)), 'ch(AJ_*O_C)');
  assert(grr.rules.some((rule) => rule.classStepKind === 'pushforward-grr'));
  const materializedTotal = api.classStepMaterializeRule(session, grr.rule);
  const directAfter = api.applyClassStepRulesToPoly(api.classStepDisplayPoly(session), [materializedTotal], geometry.dim, {
    oncePerRule: true,
    onePass: true
  });
  const directPlain = api.formatPolyPlain(directAfter);
  assert.notStrictEqual(directPlain, 'ch(AJ_*O_C)');
  assert(directPlain.includes('ch_1(O_C)'), directPlain);
  assert(directPlain.includes('td_1(J)') || directPlain.includes('td_1(C)'), directPlain);
}

function testClassStepAbelJacobiStructureSheafGrrKeepsSourceTermsSymbolic() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '3', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    { id: 'J', type: 'abelian', dim: '3', name: 'J', genus: '3', homology: { classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } }, rules: [] }, construction: { type: 'jacobian', curveId: 'C' } }
  ];
  api.state.maps = [{ id: 'AJ', name: 'AJ', domainKind: 'variety', domainId: 'C', codomainKind: 'variety', codomainId: 'J', construction: { type: 'abel-jacobi', curveId: 'C', jacobianId: 'J' } }];
  api.state.sheaves = [
    { id: 'OC', type: 'structure', basis: 'chern', rank: '1', name: 'O_C', baseVarietyId: 'C' },
    { id: 'P', type: 'abstract', basis: 'chern', rank: 'r', name: 'AJ_*O_C', baseVarietyId: 'J', construction: { type: 'pushforward', mapId: 'AJ', sheafId: 'OC', exact: true, proper: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[1], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', null);
  const grr = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'GRR');
  assert(grr);
  const ch2Rule = grr.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)).includes('ch_2(AJ_*O_C)'));
  const ch2Plain = api.formatPolyPlain(api.homologyRuleRhsPoly(api.classStepMaterializeRule(session, ch2Rule)));
  assert.strictEqual(ch2Plain, '1/2*Theta^2*r(O_C)');
  const ch3Rule = grr.rules.find((rule) => api.formatPolyPlain(api.polyFromPowers(rule.lhs.powers)).includes('ch_3(AJ_*O_C)'));
  const ch3Plain = api.formatPolyPlain(api.homologyRuleRhsPoly(api.classStepMaterializeRule(session, ch3Rule)));
  assert(ch3Plain.includes('AJ_*'), ch3Plain);
  assert(ch3Plain.includes('O_C') || ch3Plain.includes('(C)'), ch3Plain);
  assert(!ch3Plain.includes('+ Theta^2*r(O_C)'), ch3Plain);

  applyClassStepCandidatesWithLabel(api, session, 'GRR');
  applyClassStepCandidatesWithLabel(api, session, 'rank');
  applyClassStepCandidatesWithLabel(api, session, 'Chern character');
  applyClassStepCandidatesWithLabel(api, session, 'Todd');
  applyClassStepCandidatesWithLabel(api, session, 'Tangent class');
  api.classStepSyncCurrentTotalDisplay(session);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), '1/2*Theta^2 - 2*[p]');
}

function applyClassStepCandidatesWithLabel(api, session, sourceLabel) {
  const rules = api.collectClassStepRuleCandidates(session)
    .filter((candidate) => candidate.sourceLabel === sourceLabel)
    .flatMap((candidate) => candidate.rules?.length ? candidate.rules : [candidate.rule].filter(Boolean))
    .map((rule) => api.classStepMaterializeRule(session, rule));
  assert(rules.length, sourceLabel);
  for (let degree = 0; degree <= session.geometry.dim; degree += 1) {
    session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], rules, session.geometry.dim, {
      oncePerRule: false,
      onePass: false
    });
  }
}

function testSymmetricProductAggregateRulesUseAveragedCoefficients() {
  const api = loadCalculator();
  api.state.varieties = [{
    id: 'X',
    type: 'symmetric-product-curve',
    dim: '2',
    name: '\\operatorname{Sym}^{2}(C)',
    genus: '4',
    symmetricProductM: '2',
    symmetricProductGenus: '4'
  }];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const etaId = api.homologyDefVariableId(
    api.homologyClassDefinitions(geometry).find((def) => def.id === 'symmetric_product_eta'),
    geometry
  );
  const sigmaId = api.homologyDefVariableId(
    api.homologyClassDefinitions(geometry).find((def) => def.id === 'symmetric_product_sigma_sum'),
    geometry
  );

  const etaSquared = geometry.homology.rules.find((rule) => (
    rule.id === 'symmetric-product-curve-tautological-eta-r0-c1-q1'
  ));
  const etaSigma = geometry.homology.rules.find((rule) => (
    rule.id === 'symmetric-product-curve-tautological-eta-r1-c1-q0'
  ));
  assert(etaSquared);
  assert(etaSigma);
  assert.strictEqual(etaSquared.lhs.powers[etaId], 2);
  assert.strictEqual(Object.keys(etaSquared.lhs.powers).length, 1);
  assert.strictEqual(etaSquared.rhs.length, 1);
  assert.strictEqual(etaSquared.rhs[0].coefficient, '1/4');
  assert.strictEqual(etaSquared.rhs[0].powers[etaId], 1);
  assert.strictEqual(etaSquared.rhs[0].powers[sigmaId], 1);
  assert.strictEqual(etaSigma.lhs.powers[etaId], 1);
  assert.strictEqual(etaSigma.lhs.powers[sigmaId], 1);
  assert.strictEqual(Object.keys(etaSigma.lhs.powers).length, 2);
  assert.strictEqual(etaSigma.rhs.length, 1);
  assert.strictEqual(etaSigma.rhs[0].coefficient, '1/3');
  assert.strictEqual(etaSigma.rhs[0].powers[sigmaId], 2);
  assert.strictEqual(Object.keys(etaSigma.rhs[0].powers).length, 1);

  const c1 = api.polyFromPowers({ [etaId]: 1 }).add(api.polyFromPowers({ [sigmaId]: 1 })).neg();
  const c1Squared = c1.mul(c1, geometry.dim);
  const reduced = api.applyHomologyRules(c1Squared, {
    geometry,
    homology: geometry.homology,
    homologyRulePasses: 4
  });
  assert.strictEqual(api.formatPolyPlain(reduced), '7/4*Sigma^2');
}

function testSymmetricProductAbelJacobiUsesProjectionFormulaForSigma() {
  const api = loadCalculator();
  const staleUnitPushforwardId = 'map_pushforward_AJ_homology_v_X_unit';
  api.state.varieties = [
    {
      id: 'X',
      type: 'symmetric-product-curve',
      dim: '2',
      name: '\\operatorname{Sym}^{2}(C)',
      genus: '4',
      symmetricProductM: '2',
      symmetricProductGenus: '4'
    },
    {
      id: 'J',
      type: 'abelian',
      dim: '4',
      name: 'J',
      genus: '4',
      homology: {
        classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } },
        customClasses: [{
          id: staleUnitPushforwardId,
          symbol: '[\\operatorname{Sym}^{2}(C)]',
          degree: 2,
          cohomologyDegree: 4,
          special: 'map-homology',
          variableId: staleUnitPushforwardId
        }, {
          id: 'pushforward_AJ_unit',
          symbol: '[\\operatorname{Sym}^{2}(C)]',
          degree: 2,
          cohomologyDegree: 4,
          special: 'map-homology',
          variableId: 'map_pushforward_AJ_unit'
        }],
        rules: [{
          id: 'default-abel-jacobi-symmetric-pushforward-AJ-unit-stale',
          builtin: true,
          automatic: 'abel-jacobi',
          enabled: true,
          lhs: { powers: { [staleUnitPushforwardId]: 1 } },
          rhs: [{ coefficient: '1/2', powers: { homology_v_J_theta: 2 } }]
        }]
      },
      construction: { type: 'jacobian', curveId: 'X' }
    }
  ];
  api.state.maps = [{
    id: 'AJ',
    name: '\\operatorname{AJ}_{C^{(2)}}',
    domainKind: 'variety',
    domainId: 'X',
    codomainKind: 'variety',
    codomainId: 'J',
    construction: { type: 'abel-jacobi', curveId: 'X', jacobianId: 'J' }
  }];
  const sourceGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const jacobianGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sigmaDef = api.homologyClassDefinitions(sourceGeometry).find((def) => def.id === 'symmetric_product_sigma_sum');
  const thetaDef = api.homologyClassDefinitions(jacobianGeometry).find((def) => def.id === 'theta');
  const sigmaId = api.homologyDefVariableId(sigmaDef, sourceGeometry);
  const thetaId = api.homologyDefVariableId(thetaDef, jacobianGeometry);
  const unitPushforward = api.pushforwardPolynomialByDegree(
    api.state.maps[0],
    api.polyFromPowers({}),
    sourceGeometry.dim,
    jacobianGeometry.dim,
    { proper: true }
  );
  assert.strictEqual(api.formatPolyPlain(unitPushforward), '1/2*Theta^2');
  assert.strictEqual(api.mapPushforwardSourceKeyHasDirectAutomaticFormula(api.state.maps[0], '', sourceGeometry, jacobianGeometry), true);
  assert(!api.mapPushforwardClassDefinitions(api.state.maps[0], sourceGeometry, jacobianGeometry)
    .some((def) => def.id === staleUnitPushforwardId || def.variableId === staleUnitPushforwardId));
  assert(api.ensureAbelJacobiKnownHomologyRules(api.state.maps[0]));
  assert(!api.state.varieties[1].homology.customClasses.some((item) => (
    item.id === staleUnitPushforwardId
    || item.variableId === staleUnitPushforwardId
    || item.variableId === 'map_pushforward_AJ_unit'
    || item.symbol === '[\\operatorname{Sym}^{2}(C)]'
  )));
  assert(!api.state.varieties[1].homology.rules.some((rule) => rule.lhs?.powers?.[staleUnitPushforwardId] === 1));
  const pullbackRule = api.defaultMapHomologyRulesForGeometry(sourceGeometry)
    .find((rule) => rule.id === 'default-abel-jacobi-symmetric-theta-pullback-AJ');
  assert(pullbackRule);
  assert.strictEqual(pullbackRule.rhs.length, 1);
  assert.strictEqual(pullbackRule.rhs[0].coefficient, '1');
  assert.strictEqual(pullbackRule.rhs[0].powers[sigmaId], 1);

  const etaSigmaSquared = api.polyFromPowers({
    [api.homologyDefVariableId(
      api.homologyClassDefinitions(sourceGeometry).find((def) => def.id === 'symmetric_product_eta'),
      sourceGeometry
    )]: 1,
    [sigmaId]: 1
  });
  const pushed = api.pushforwardPolynomialByDegree(
    api.state.maps[0],
    etaSigmaSquared,
    sourceGeometry.dim,
    jacobianGeometry.dim,
    { proper: true }
  );
  assert.strictEqual(api.formatPolyPlain(pushed), '1/6*Theta^4');
  assert.strictEqual(api.formatPolyPlain(api.polyFromPowers({ [thetaId]: 4 }).scale(pushed.terms.get(`${thetaId}:4`))), '1/6*Theta^4');
}

function testClassStepNestedPushforwardOffersGrrAfterSes() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '4', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    { id: 'J', type: 'abelian', dim: '4', name: 'J', genus: 'g', homology: { classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } }, rules: [] }, construction: { type: 'jacobian', curveId: 'C' } }
  ];
  api.state.maps = [{ id: 'AJ', name: 'AJ', domainKind: 'variety', domainId: 'C', codomainKind: 'variety', codomainId: 'J', construction: { type: 'abel-jacobi', curveId: 'C', jacobianId: 'J' } }];
  api.state.sheaves = [
    { id: 'OC', type: 'structure', basis: 'chern', rank: '1', name: 'O_C', baseVarietyId: 'C' },
    { id: 'OJ', type: 'structure', basis: 'chern', rank: '1', name: 'O_J', baseVarietyId: 'J' },
    { id: 'P', type: 'abstract', basis: 'chern', rank: 'r', name: 'AJ_*O_C', baseVarietyId: 'J', construction: { type: 'pushforward', mapId: 'AJ', sheafId: 'OC', exact: true, proper: true } },
    { id: 'I', type: 'abstract', basis: 'chern', rank: 'r', name: 'I_C', baseVarietyId: 'J', construction: { type: 'ses-term', role: 'subobject', sequenceId: 'S' } }
  ];
  api.state.sequences = [{ id: 'S', type: 'short-exact-sequence', sheafIds: ['I', 'OJ', 'P'], mapIds: [], baseVarietyId: 'J' }];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[3], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'chern', 1);
  const ses = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'SES');
  assert(ses);
  session.components[1] = api.applyClassStepRulesToPoly(session.components[1], [ses.rule], geometry.dim, { oncePerRule: true, onePass: true });
  const grr = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'GRR');
  assert(grr);
  assert.strictEqual(api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel === 'GRR').length, 1);
  assert(grr.rule.classStepDisplayLatex.includes('\\operatorname{ch}'));
  assert(grr.rule.classStepDisplayLatex.includes('\\operatorname{td}'));
  const materialized = api.classStepMaterializeRule(session, grr.rules[0]);
  const grrPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(materialized));
  assert.strictEqual(grrPlain, '0');
}

function testClassStepTensorRulesForCharacterAndChern() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: '3', name: 'F', baseVarietyId: 'X' },
    { id: 'T', type: 'abstract', basis: 'chern', rank: '6', name: 'E\\otimes F', baseVarietyId: 'X', construction: { type: 'tensor', sheafIds: ['E', 'F'], exact: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[2], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });

  const chSession = api.createClassStepSession(result, 'character', 1);
  const chTensor = api.collectClassStepRuleCandidates(chSession).find((candidate) => candidate.sourceLabel === 'Tensor product');
  assert(chTensor);
  assert.strictEqual(api.collectClassStepRuleCandidates(chSession).filter((candidate) => candidate.sourceLabel === 'Tensor product').length, 1);
  assert(chTensor.rule.classStepDisplayLatex.includes('\\operatorname{ch}'));
  const chRule = api.classStepMaterializeRule(chSession, chTensor.rules[0]);
  const chPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(chRule));
  assert(chPlain.includes('ch_1(E)'));
  assert(chPlain.includes('ch_1(F)'));

  const cSession = api.createClassStepSession(result, 'chern', 1);
  const cTensor = api.collectClassStepRuleCandidates(cSession).find((candidate) => candidate.sourceLabel === 'Tensor product');
  assert(cTensor);
  assert.strictEqual(api.collectClassStepRuleCandidates(cSession).filter((candidate) => candidate.sourceLabel === 'Tensor product').length, 1);
  assert(cTensor.rule.classStepDisplayLatex.includes('c('));
  const cRule = api.classStepMaterializeRule(cSession, cTensor.rules[0]);
  const cPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(cRule));
  assert(cPlain.includes('ch_1(E)'));
  assert(cPlain.includes('ch_1(F)'));
}

function testStrengthenedTensorUsesMultipleParentsAndExponents() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [
    { id: 'L', type: 'abstract', basis: 'chern', rank: '1', name: 'L', baseVarietyId: 'X' },
    { id: 'M', type: 'abstract', basis: 'chern', rank: '1', name: 'M', baseVarietyId: 'X' },
    { id: 'N', type: 'abstract', basis: 'chern', rank: '1', name: 'N', baseVarietyId: 'X' },
    { id: 'T', type: 'abstract', basis: 'chern', rank: '1', name: 'T', baseVarietyId: 'X', construction: { type: 'tensor', sheafIds: ['L', 'M', 'N'], exponents: ['2', '1/2', '0'], exact: true } },
    { id: 'U', type: 'abstract', basis: 'chern', rank: '1', name: 'U', baseVarietyId: 'X', construction: { type: 'tensor', sheafIds: [], exponents: [], exact: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const tensorSheaf = api.sheafFromObject(api.state.sheaves[3], geometry);
  const tensorRows = api.buildCharacteristicClasses(geometry, tensorSheaf).classRows;
  const tensorCharacter = tensorRows.find((row) => row.key === 'character').plain;
  const tensorChern = tensorRows.find((row) => row.key === 'chern').plain;
  assert(tensorCharacter.includes('2*c_1(L)'), tensorCharacter);
  assert(tensorCharacter.includes('1/2*c_1(M)'), tensorCharacter);
  assert(!tensorCharacter.includes('N'), tensorCharacter);
  assert(tensorChern.includes('2*c_1(L)'), tensorChern);
  assert(tensorChern.includes('1/2*c_1(M)'), tensorChern);
  assert(!tensorChern.includes('N'), tensorChern);

  const result = api.buildClassStepFallbackResult(geometry, tensorSheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', 1);
  const tensorRule = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'Tensor product');
  assert(tensorRule);
  assert(tensorRule.rule.classStepDisplayLatex.includes('\\operatorname{ch}(L)^{2}'), tensorRule.rule.classStepDisplayLatex);
  assert(tensorRule.rule.classStepDisplayLatex.includes('\\operatorname{ch}(M)^{\\frac{1}{2}}'), tensorRule.rule.classStepDisplayLatex);
  assert(!tensorRule.rule.classStepDisplayLatex.includes('\\operatorname{ch}(N)'), tensorRule.rule.classStepDisplayLatex);

  const unitSheaf = api.sheafFromObject(api.state.sheaves[4], geometry);
  const unitRows = api.buildCharacteristicClasses(geometry, unitSheaf).classRows;
  assert.strictEqual(unitRows.find((row) => row.key === 'character').plain, '1');
  assert.strictEqual(unitRows.find((row) => row.key === 'chern').plain, '1');
  const unitResult = api.buildClassStepFallbackResult(geometry, unitSheaf, { message: 'test' });
  const unitSession = api.createClassStepSession(unitResult, 'character', 1);
  const unitRule = api.collectClassStepRuleCandidates(unitSession).find((candidate) => candidate.sourceLabel === 'Tensor product');
  assert(unitRule);
  assert.strictEqual(unitRule.rule.classStepDisplayLatex, '\\operatorname{ch}(U)=1');
}

function exteriorPowerData(api, base, sourceType, degree, kind, rank, defaultName) {
  const geometry = api.geometryFromVariety(base);
  return {
    sourceType,
    degree,
    kind,
    baseVariety: base,
    baseVarietyId: base.id,
    geometry,
    partition: Array.from({ length: degree }, () => 1),
    rank,
    defaultName,
    name: defaultName,
    nameDirty: false
  };
}

function testStrengthenedDifferentialExteriorPowerConstructions() {
  const api = loadCalculator();
  const p3 = { id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}' };
  api.state.varieties = [p3];

  const degreeZero = api.createDifferentialWedgeSheafConstruction(exteriorPowerData(api, p3, 'cotangent', 0, 'structure', '1', '\\mathcal{O}_{\\mathbb{P}^{3}}'));
  assert.strictEqual(degreeZero.type, 'structure');
  assert.strictEqual(degreeZero.construction, undefined);

  const degreeOne = api.createDifferentialWedgeSheafConstruction(exteriorPowerData(api, p3, 'tangent', 1, 'standard', '3', '\\mathcal{T}_{\\mathbb{P}^{3}}'));
  assert.strictEqual(degreeOne.type, 'tangent');
  assert.strictEqual(degreeOne.construction, undefined);

  const topCotangent = api.createDifferentialWedgeSheafConstruction(exteriorPowerData(api, p3, 'cotangent', 3, 'canonical', '1', 'K_{\\mathbb{P}^{3}}'));
  assert.strictEqual(topCotangent.type, 'canonical');
  assert.strictEqual(topCotangent.construction, undefined);

  const topTangent = api.createDifferentialWedgeSheafConstruction(exteriorPowerData(api, p3, 'tangent', 3, 'anticanonical', '1', 'K_{\\mathbb{P}^{3}}^{\\vee}'));
  assert.strictEqual(topTangent.type, 'abstract');
  assert.strictEqual(topTangent.construction.type, 'dual');
  assert.strictEqual(topTangent.construction.differentialWedge, true);
  assert.strictEqual(topTangent.construction.differentialType, 'tangent');
  assert.strictEqual(topTangent.construction.wedgeDegree, 3);
  assert(api.state.sheaves.some((sheaf) => sheaf.id === topTangent.construction.sheafId && sheaf.type === 'canonical'));

  const middleCotangent = api.createDifferentialWedgeSheafConstruction(exteriorPowerData(api, p3, 'cotangent', 2, 'schur', '3', '\\Omega^{2}_{\\mathbb{P}^{3}}'));
  assert.strictEqual(middleCotangent.type, 'abstract');
  assert.strictEqual(middleCotangent.rank, '3');
  assert.strictEqual(middleCotangent.construction.type, 'schur');
  assert.deepStrictEqual(Array.from(middleCotangent.construction.partition), [1, 1]);
  assert.strictEqual(middleCotangent.construction.differentialWedge, true);
  assert.strictEqual(middleCotangent.construction.differentialType, 'cotangent');
  assert.strictEqual(middleCotangent.construction.wedgeDegree, 2);
  assert.strictEqual(api.sheafDifferentialWedgeConstructionType(middleCotangent), 'cotangent');
  assert(api.state.sheaves.some((sheaf) => sheaf.type === 'cotangent' && sheaf.hiddenOnCanvas));

  const presetText = JSON.stringify(api.buildPresetState());
  const restored = loadCalculator();
  restored.importPresetFromText(presetText);
  const restoredMiddle = restored.state.sheaves.find((sheaf) => sheaf.name === '\\Omega^{2}_{\\mathbb{P}^{3}}');
  assert(restoredMiddle);
  assert.strictEqual(restored.sheafDifferentialWedgeConstructionType(restoredMiddle), 'cotangent');
  assert.strictEqual(restoredMiddle.construction.wedgeDegree, 2);
  assert.deepStrictEqual(Array.from(restoredMiddle.construction.partition), [1, 1]);
  const restoredTopTangent = restored.state.sheaves.find((sheaf) => sheaf.name === 'K_{\\mathbb{P}^{3}}^{\\vee}');
  assert(restoredTopTangent);
  assert.strictEqual(restored.sheafDifferentialWedgeConstructionType(restoredTopTangent), 'tangent');
  assert.strictEqual(restoredTopTangent.construction.wedgeDegree, 3);
}

function testStrengthenedDifferentialExteriorPowerCohomologyOnProjectiveSpace() {
  const api = loadCalculator();
  const p2 = api.geometryFromVariety({ id: 'P2', type: 'projective', dim: '2', name: '\\mathbb{P}^{2}' });
  const p3 = api.geometryFromVariety({ id: 'P3', type: 'projective', dim: '3', name: '\\mathbb{P}^{3}' });

  assert.deepStrictEqual(cohomologyPlain(api, p2, { id: 'O', type: 'structure', name: '\\mathcal{O}_{\\mathbb{P}^{2}}', rank: '1', basis: 'chern' }), ['1', '0', '0']);
  assert.deepStrictEqual(cohomologyPlain(api, p2, { id: 'Omega1', type: 'cotangent', name: '\\Omega^1_{\\mathbb{P}^{2}}', rank: '2', basis: 'chern' }), ['0', '1', '0']);
  assert.deepStrictEqual(cohomologyPlain(api, p2, { id: 'TP2', type: 'tangent', name: '\\mathcal{T}_{\\mathbb{P}^{2}}', rank: '2', basis: 'chern' }), ['8', '0', '0']);
  assert.deepStrictEqual(cohomologyPlain(api, p2, { id: 'KP2', type: 'canonical', name: 'K_{\\mathbb{P}^{2}}', rank: '1', basis: 'chern' }), ['0', '0', '1']);
  assert.deepStrictEqual(cohomologyPlain(api, p2, {
    id: 'AntiP2',
    type: 'abstract',
    name: 'K_{\\mathbb{P}^{2}}^{\\vee}',
    rank: '1',
    basis: 'chern',
    construction: { type: 'dual', sheafId: 'KP2', differentialWedge: true, differentialType: 'tangent', wedgeDegree: 2 }
  }), ['10', '0', '0']);

  assert.deepStrictEqual(cohomologyPlain(api, p3, {
    id: 'Omega2',
    type: 'abstract',
    name: '\\Omega^{2}_{\\mathbb{P}^{3}}',
    rank: '3',
    basis: 'chern',
    construction: { type: 'schur', sheafId: 'Omega1', partition: [1, 1], differentialWedge: true, differentialType: 'cotangent', wedgeDegree: 2 }
  }), ['0', '0', '1', '0']);
  assert.deepStrictEqual(cohomologyPlain(api, p3, {
    id: 'Lambda2T',
    type: 'abstract',
    name: '\\bigwedge^{2}\\mathcal{T}_{\\mathbb{P}^{3}}',
    rank: '3',
    basis: 'chern',
    construction: { type: 'schur', sheafId: 'TP3', partition: [1, 1], differentialWedge: true, differentialType: 'tangent', wedgeDegree: 2 }
  }), ['45', '0', '0', '0']);
  assert.deepStrictEqual(cohomologyPlain(api, p3, { id: 'KP3', type: 'canonical', name: 'K_{\\mathbb{P}^{3}}', rank: '1', basis: 'chern' }), ['0', '0', '0', '1']);
  assert.deepStrictEqual(cohomologyPlain(api, p3, {
    id: 'AntiP3',
    type: 'abstract',
    name: 'K_{\\mathbb{P}^{3}}^{\\vee}',
    rank: '1',
    basis: 'chern',
    construction: { type: 'dual', sheafId: 'KP3', differentialWedge: true, differentialType: 'tangent', wedgeDegree: 3 }
  }), ['35', '0', '0', '0']);
}

function testClassStepWrapsPullbackSourceRulesInsidePushforward() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    { id: 'Pic', type: 'abstract', dim: '1', name: 'Pic', homology: { classes: { unit: { symbol: '1' } }, rules: [] } },
    { id: 'Prod', type: 'abstract', dim: '2', name: 'C\\times Pic', construction: { type: 'product', varietyIds: ['C', 'Pic'] }, homology: { classes: { unit: { symbol: '1' } }, rules: [] } }
  ];
  api.state.maps = [
    { id: 'piC', name: '\\pi_C', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'C', construction: { type: 'projection', productId: 'Prod', factorIndex: 0 } },
    { id: 'piPic', name: '\\pi_{Pic}', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'Pic', construction: { type: 'projection', productId: 'Prod', factorIndex: 1 } }
  ];
  api.state.sheaves = [
    { id: 'L', type: 'locally-free', name: '\\mathcal{L}', rank: '1', baseVarietyId: 'C', basis: 'character', homology: { rules: [] } },
    { id: 'F', type: 'abstract', name: 'F', rank: 'r', baseVarietyId: 'Pic', basis: 'character' }
  ];
  const curveGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const picGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sourceSheaf = api.sheafFromObject(api.state.sheaves[0], curveGeometry);
  const sourceResult = api.buildClassStepFallbackResult(curveGeometry, sourceSheaf, { message: 'test' });
  const sourceSession = api.createClassStepSession(sourceResult, 'character', 1);
  const ch1Key = Array.from(sourceSession.components[1].terms.keys())[0];
  const ch1Id = ch1Key.split(':')[0];
  const pointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, curveGeometry);
  api.state.sheaves[0].homology.rules = [{
    id: 'rule-ch1-L',
    enabled: true,
    lhs: { powers: { [ch1Id]: 1 } },
    rhs: [{ coefficient: '4', powers: { [pointId]: 1 } }]
  }];

  const pulled = api.pullbackPolynomial(sourceSession.components[1], api.state.maps[0]);
  const pullbackKey = Array.from(pulled.terms.keys())[0];
  const pullbackId = pullbackKey.split(':')[0];
  const pushedId = 'test_pushforward_pullback_ch1';
  api.VARS.set(pushedId, {
    kind: 'mapHomology',
    mapId: 'piPic',
    operation: 'pushforward',
    sourceKey: `${pullbackId}:1`,
    degree: 0,
    cohomologyDegree: 0,
    latex: '\\pi_{Pic,*}\\pi_C^*\\operatorname{ch}_1(\\mathcal{L})',
    plain: 'piPic_*piC^*ch_1(L)'
  });

  const targetSheaf = api.sheafFromObject(api.state.sheaves[1], picGeometry);
  const result = api.buildClassStepFallbackResult(picGeometry, targetSheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', 0);
  session.components[0] = api.polyFromPowers({ [pushedId]: 1 });
  const candidates = api.collectClassStepRuleCandidates(session);
  const wrapped = candidates.find((candidate) => candidate.sourceLabel === 'Pullback'
    && candidate.rule.classStepDisplayLatex.includes('\\pi_C')
    && candidate.rules.some((rule) => api.formatPolyPlain(api.homologyRuleRhsPoly(rule)) === '4'));
  assert(wrapped, candidates.map((candidate) => `${candidate.sourceLabel}:${candidate.rule.classStepDisplayLatex}`).join(' | '));
  session.components[0] = api.applyClassStepRulesToPoly(session.components[0], wrapped.rules, picGeometry.dim, {
    oncePerRule: true,
    onePass: true
  });
  assert.strictEqual(api.formatPolyPlain(session.components[0]), '4');
}

function testClassStepPicardPushforwardGroupsToddAndFindsTensor() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '4', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    {
      id: 'Pic',
      type: 'abelian',
      dim: '4',
      name: 'Pic^d(C)',
      genus: '4',
      ppavGenus: '4',
      homology: {
        classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } },
        rules: [{ id: 'top-theta-point', builtin: true, enabled: true, lhs: { powers: { homology_v_Pic_theta: 4 } }, rhs: [{ coefficient: '24', powers: { homology_v_Pic_point: 1 } }] }]
      },
      construction: { type: 'picard-variety', curveId: 'C', degreeSymbol: 'd' }
    },
    { id: 'Prod', type: 'abstract', dim: '5', name: 'C\\times Pic^d(C)', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } }, construction: { type: 'product', varietyIds: ['C', 'Pic'] } }
  ];
  api.state.maps = [
    { id: 'piC', name: '\\pi_{C}', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'C', construction: { type: 'projection', productId: 'Prod', factorIndex: 0 } },
    { id: 'piPic', name: '\\pi_{Pic^d(C)}', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'Pic', construction: { type: 'projection', productId: 'Prod', factorIndex: 1 } }
  ];
  api.state.sheaves = [
    { id: 'P', type: 'locally-free', name: '\\mathcal{P}_{d}', rank: '1', baseVarietyId: 'Prod', basis: 'chern', construction: { type: 'picard-poincare-line-bundle', curveId: 'C', picardId: 'Pic', productId: 'Prod', curveProjectionId: 'piC', picardProjectionId: 'piPic' } },
    { id: 'E', type: 'locally-free', name: '\\mathcal{E}', rank: 'r', baseVarietyId: 'C', basis: 'chern' },
    { id: 'LE', type: 'abstract', name: '\\mathbf{L}\\pi_{C}^{*}\\mathcal{E}', rank: 'r', baseVarietyId: 'Prod', basis: 'chern', construction: { type: 'pullback', mapId: 'piC', sheafId: 'E', exact: true } },
    { id: 'Tensor', type: 'abstract', name: '\\mathcal{P}_{d} \\otimes^{\\mathbf{L}} \\mathbf{L}\\pi_{C}^{*}\\mathcal{E}', rank: 'r', baseVarietyId: 'Prod', basis: 'chern', construction: { type: 'tensor', sheafIds: ['P', 'LE'], exact: true } },
    { id: 'F', type: 'abstract', name: 'F', rank: 'r', baseVarietyId: 'Pic', basis: 'chern', construction: { type: 'pushforward', mapId: 'piPic', sheafId: 'Tensor', exact: true, proper: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[4], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', null);
  const grr = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'GRR');
  assert(grr);
  const materializedGrrRules = grr.rules.map((rule) => api.classStepMaterializeRule(session, rule));
  for (let degree = 1; degree <= geometry.dim; degree += 1) {
    session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], materializedGrrRules, geometry.dim, {
      oncePerRule: true,
      onePass: true
    });
  }
  const candidates = api.collectClassStepRuleCandidates(session);
  const picTodd = candidates.filter((candidate) => candidate.rule.classStepDisplayLatex === '\\operatorname{td}(Pic^d(C))');
  const tensor = candidates.filter((candidate) => candidate.sourceLabel === 'Tensor product');
  assert.strictEqual(picTodd.length, 1);
  assert.strictEqual(tensor.length, 1);
  assert.strictEqual(tensor[0].rules.length > 1, true);
  assert(tensor[0].rule.classStepDisplayLatex.includes('\\otimes^{\\mathbf{L}}'));
}

function testClassStepPicardPoincarePushforwardToddStepMatchesNormalCharacter() {
  const api = loadCalculator();
  api.state.globalInvariants = [{ id: 'auto-d', type: 'rational-number', name: 'd', auto: true }];
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C', genus: '3', homology: { classes: { unit: { symbol: '1' }, point: { symbol: '[p]' } } } },
    {
      id: 'Pic',
      type: 'abelian',
      dim: '3',
      name: 'Pic^d(C)',
      genus: '3',
      homology: {
        classes: { theta: { symbol: '\\Theta' }, unit: { symbol: '1' }, point: { symbol: '[p]' } },
        rules: [{ id: 'top-theta-point', builtin: true, enabled: true, lhs: { powers: { homology_v_Pic_theta: 3 } }, rhs: [{ coefficient: '6', powers: { homology_v_Pic_point: 1 } }] }]
      },
      construction: { type: 'picard-variety', curveId: 'C', degreeSymbol: 'd' }
    },
    {
      id: 'Prod',
      type: 'abstract',
      dim: '4',
      name: 'C\\times Pic^d(C)',
      construction: { type: 'product', varietyIds: ['C', 'Pic'] },
      homology: {
        classes: { unit: { symbol: '1' }, point: { symbol: '[p]' }, picard_poincare_gamma: { symbol: '\\gamma' }, picard_eta: { symbol: '\\eta' } },
        customClasses: [
          { id: 'picard_poincare_gamma', symbol: '\\gamma', degree: 1, cohomologyDegree: 2, special: 'picard-canonical', productBidegree: [1, 1] },
          { id: 'picard_eta', symbol: '\\eta', degree: 1, cohomologyDegree: 2, special: 'map-homology', variableId: 'map_pullback_piC_homology_v_C_point', productBidegree: [2, 0] }
        ],
        rules: []
      }
    }
  ];
  api.state.maps = [
    { id: 'piC', name: '\\pi_C', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'C', construction: { type: 'projection', productId: 'Prod', factorIndex: 0 } },
    { id: 'piPic', name: '\\pi_{Pic^d(C)}', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'Pic', construction: { type: 'projection', productId: 'Prod', factorIndex: 1 } }
  ];
  api.state.sheaves = [
    {
      id: 'P',
      type: 'locally-free',
      name: '\\mathcal{P}_{d}',
      rank: '1',
      baseVarietyId: 'Prod',
      basis: 'chern',
      homology: {
        rules: [{
          id: 'sheaf-rule-sheaf_P_c1',
          enabled: true,
          lhs: { powers: { sheaf_P_c1: 1 } },
          rhs: [
            { coefficient: '1', powers: { homology_v_Prod_picard_poincare_gamma: 1 } },
            { coefficient: '1', powers: { global_d: 1, map_pullback_piC_homology_v_C_point: 1 } }
          ],
          preserveUnknownVariables: true
        }]
      },
      construction: { type: 'picard-poincare-line-bundle', curveId: 'C', picardId: 'Pic', productId: 'Prod', curveProjectionId: 'piC', picardProjectionId: 'piPic' }
    },
    { id: 'F', type: 'abstract', name: '\\pi_{Pic^d(C)}_{*}\\mathcal{P}_{d}', rank: 'r', baseVarietyId: 'Pic', basis: 'chern', construction: { type: 'pushforward', mapId: 'piPic', sheafId: 'P', exact: true, proper: true } }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[1], geometry);
  const normalBundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', null);
  let candidates = api.collectClassStepRuleCandidates(session);
  const grr = candidates.find((candidate) => candidate.sourceLabel === 'GRR');
  assert(grr);
  const grrRules = grr.rules.map((rule) => api.classStepMaterializeRule(session, rule));
  for (let degree = 0; degree <= geometry.dim; degree += 1) {
    session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], grrRules, geometry.dim, {
      oncePerRule: true,
      onePass: true
    });
  }
  const toddCandidates = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel === 'Todd');
  assert(toddCandidates.some((candidate) => String(candidate.rule.id || '').startsWith('step-todd-class_step_td_v_Pic')));
  assert(toddCandidates.some((candidate) => String(candidate.rule.id || '').startsWith('step-map-wrap-')));
  assert(toddCandidates.filter((candidate) => candidate.selected !== false)
    .every((candidate) => String(candidate.rule.id || '').startsWith('step-todd-class_step_td_v_Pic')));
  api.state.classStepSession = session;
  api.refs.classStepPanel = { hidden: false, classList: { toggle() {} } };
  api.refs.classStepFormula = { innerHTML: '' };
  api.refs.classStepRules = { hidden: false, innerHTML: '' };
  api.refs.classStepMessage = { textContent: '' };
  api.refs.classStepApply = { disabled: false };
  session.candidates = toddCandidates;
  for (let round = 0; round < 4; round += 1) {
    const selectedToddRules = session.candidates
      .filter((candidate) => candidate.selected !== false)
      .flatMap((candidate) => candidate.rules.map((rule) => api.classStepMaterializeRule(session, rule)));
    assert(selectedToddRules.length > 0);
    for (let degree = 0; degree <= geometry.dim; degree += 1) {
      session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], selectedToddRules, geometry.dim, {
        oncePerRule: true,
        onePass: true
      });
    }
    api.renderClassStepPanel();
    const selectedTargetTodd = session.candidates
      .filter((candidate) => candidate.selected !== false)
      .some((candidate) => String(candidate.rule.id || '').startsWith('step-todd-class_step_td_v_Pic'));
    if (!selectedTargetTodd) break;
  }
  const postTargetToddCandidates = session.candidates.filter((candidate) => candidate.sourceLabel === 'Todd');
  assert(postTargetToddCandidates
    .some((candidate) => String(candidate.rule.id || '').startsWith('step-map-wrap-') && candidate.selected !== false),
    postTargetToddCandidates.map((candidate) => `${candidate.rule.id}:${candidate.selected !== false}:${candidate.classStepAutoSelectionReason || ''}`).join(' | '));
  for (let round = 0; round < 8; round += 1) {
    candidates = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel !== 'GRR');
    if (!candidates.length) break;
    const rules = candidates.flatMap((candidate) => candidate.rules.map((rule) => api.classStepMaterializeRule(session, rule)));
    for (let degree = 0; degree <= geometry.dim; degree += 1) {
      session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], rules, geometry.dim, {
        oncePerRule: true,
        onePass: true
      });
    }
  }
  session.checkSwitchingRules = true;
  candidates = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel === 'Switch c/ch');
  assert(candidates.length > 0);
  let rules = candidates.flatMap((candidate) => candidate.rules.map((rule) => api.classStepMaterializeRule(session, rule)));
  for (let degree = 0; degree <= geometry.dim; degree += 1) {
    session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], rules, geometry.dim, {
      oncePerRule: true,
      onePass: true
    });
  }
  session.checkSwitchingRules = false;
  const poincareCandidates = api.collectClassStepRuleCandidates(session)
    .filter((candidate) => candidate.rule.id.includes('sheaf-rule-sheaf_P_c1'));
  assert.strictEqual(poincareCandidates.length, 1);
  assert(poincareCandidates[0].rules.length > 1);
  for (let round = 0; round < 8; round += 1) {
    candidates = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel !== 'GRR');
    if (!candidates.length) break;
    rules = candidates.flatMap((candidate) => candidate.rules.map((rule) => api.classStepMaterializeRule(session, rule)));
    for (let degree = 0; degree <= geometry.dim; degree += 1) {
      session.components[degree] = api.applyClassStepRulesToPoly(session.components[degree], rules, geometry.dim, {
        oncePerRule: true,
        onePass: true
      });
    }
  }
  assert.strictEqual(api.formatPolyPlain(session.components[0]), 'd - 2');
  assert.strictEqual(api.formatPolyPlain(session.components[1]), '-Theta');
  assert.strictEqual(api.formatPolyPlain(session.components[2]), '0');
  assert.strictEqual(api.formatPolyPlain(session.components[3]), '0');
  assert.notStrictEqual(api.formatPolyPlain(session.components[1]), '0');
  api.classStepSyncCurrentTotalDisplay(session);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(session)), 'd - 2 - Theta');

  const uiSession = api.createClassStepSession(result, 'chern', null);
  assert.strictEqual(uiSession.family, 'character');
  const applyUiStep = (label, configure = null, switching = false) => {
    uiSession.checkSwitchingRules = switching;
    const stepCandidates = api.collectClassStepRuleCandidates(uiSession);
    if (configure) configure(stepCandidates);
    const selected = stepCandidates.filter((candidate) => candidate.selected !== false);
    assert(selected.length > 0, label);
    const stepRules = selected.flatMap((candidate) => candidate.rules.map((rule) => api.classStepMaterializeRule(uiSession, rule)));
    for (let degree = 0; degree <= geometry.dim; degree += 1) {
      uiSession.components[degree] = api.applyClassStepRulesToPoly(uiSession.components[degree], stepRules, geometry.dim, {
        oncePerRule: true,
        onePass: false
      });
    }
  };
  applyUiStep('ui GRR', (stepCandidates) => stepCandidates.forEach((candidate) => {
    candidate.selected = candidate.sourceLabel === 'GRR';
  }));
  for (let round = 0; round < 6; round += 1) {
    const selected = api.collectClassStepRuleCandidates(uiSession)
      .filter((candidate) => candidate.sourceLabel !== 'GRR' && candidate.selected !== false);
    if (!selected.length) break;
    applyUiStep(`ui pre-switch ${round}`, (stepCandidates) => stepCandidates.forEach((candidate) => {
      if (candidate.sourceLabel === 'GRR') candidate.selected = false;
    }));
  }
  applyUiStep('ui switch', (stepCandidates) => stepCandidates.forEach((candidate) => {
    candidate.selected = candidate.sourceLabel === 'Switch c/ch';
  }), true);
  uiSession.checkSwitchingRules = false;
  for (let round = 0; round < 10; round += 1) {
    const selected = api.collectClassStepRuleCandidates(uiSession)
      .filter((candidate) => candidate.sourceLabel !== 'GRR' && candidate.selected !== false);
    if (!selected.length) break;
    applyUiStep(`ui post-switch ${round}`, (stepCandidates) => stepCandidates.forEach((candidate) => {
      if (candidate.sourceLabel === 'GRR') candidate.selected = false;
    }));
  }
  api.classStepSyncCurrentTotalDisplay(uiSession);
  assert.strictEqual(api.formatPolyPlain(api.classStepDisplayPoly(uiSession)), 'd - 2 - Theta');
  assert(!api.collectClassStepRuleCandidates(uiSession).some((candidate) => candidate.sourceLabel === 'GRR'));
  api.state.classStepSession = uiSession;
  const stepLatexExport = api.exportResult(result, 'latex', 'step-classes');
  assert(stepLatexExport.includes('% source: step-by-step formula'));
  assert(stepLatexExport.includes('d - 2'));
  assert(stepLatexExport.includes('\\Theta'));

  const legacyChernSession = api.createClassStepSession(result, 'character', null);
  const rankComponent = legacyChernSession.rankComponent;
  legacyChernSession.family = 'chern';
  legacyChernSession.components = result.bundle.cComps.slice();
  legacyChernSession.components[0] = api.polyFromPowers({});
  legacyChernSession.rankComponent = rankComponent;
  const legacyGrr = api.collectClassStepRuleCandidates(legacyChernSession)
    .find((candidate) => candidate.sourceLabel === 'GRR');
  assert(legacyGrr);
  assert(legacyGrr.rules.some((rule) => rule.classStepRankRule === true));
  const legacyRules = legacyGrr.rules.map((rule) => api.classStepMaterializeRule(legacyChernSession, rule));
  const beforeRank = api.formatPolyPlain(legacyChernSession.rankComponent);
  legacyChernSession.rankComponent = api.applyClassStepRulesToPoly(legacyChernSession.rankComponent, legacyRules, geometry.dim, {
    oncePerRule: true,
    onePass: false
  });
  assert(beforeRank.startsWith('r('), beforeRank);
  assert.notStrictEqual(beforeRank, 'r');
  const afterRank = api.formatPolyPlain(legacyChernSession.rankComponent);
  assert.notStrictEqual(afterRank, beforeRank);
  legacyChernSession.active = false;
  legacyChernSession.stopped = true;
  const ch0Rows = api.buildClassRowsFromStepSession(legacyChernSession, {
    ...api.classDisplayOptions(geometry, sheaf),
    termMode: 'term',
    termIndex: 0
  });
  assert.strictEqual(ch0Rows.find((row) => row.key === 'character_0')?.plain, afterRank);
}

function testClassStepRepeatedDisplayedRulesOnlyAppearOnce() {
  const api = loadCalculator();
  const geometry = {
    type: 'abstract',
    dim: 2,
    labelLatex: 'X',
    labelPlain: 'X',
    varietyId: 'X',
    homology: {
      customClasses: [
        { id: 'A', symbol: 'A', degree: 1, cohomologyDegree: 2 },
        { id: 'B', symbol: 'B', degree: 1, cohomologyDegree: 2 },
        { id: 'C', symbol: 'C', degree: 1, cohomologyDegree: 2 }
      ],
      rules: []
    }
  };
  const defs = api.homologyClassDefinitions(geometry);
  const aId = api.homologyDefVariableId(defs.find((def) => def.id === 'A'), geometry);
  const bId = api.homologyDefVariableId(defs.find((def) => def.id === 'B'), geometry);
  const cId = api.homologyDefVariableId(defs.find((def) => def.id === 'C'), geometry);
  geometry.homology.rules = [
    { id: 'repeat-1', enabled: true, stepSourceLabel: 'repeat', classStepDisplayLatex: '\\mathcal{R}', lhs: { powers: { [aId]: 1 } }, rhs: [{ coefficient: '1', powers: { [cId]: 1 } }] },
    { id: 'repeat-2', enabled: true, stepSourceLabel: 'repeat', classStepDisplayLatex: '\\mathcal{R}', lhs: { powers: { [bId]: 1 } }, rhs: [{ coefficient: '1', powers: { [cId]: 1 } }] }
  ];
  const session = {
    geometry,
    sheaf: { id: 'E', type: 'abstract', basis: 'chern', rankPlain: '2', rankLatex: '2', labelLatex: 'E', labelPlain: 'E', sourceObject: { id: 'E', basis: 'chern' } },
    family: 'chern',
    dimension: 2,
    index: 1,
    components: [api.polyFromPowers({}), api.polyFromPowers({ [aId]: 1 }).add(api.polyFromPowers({ [bId]: 1 })), api.polyFromPowers({})]
  };
  const candidates = api.collectClassStepRuleCandidates(session).filter((candidate) => candidate.sourceLabel === 'repeat');
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].rules.length, 2);
}

function testClassStepLayoutToggleDefaultsWideAndSwitchesSide() {
  const api = loadCalculator();
  const classList = new Set();
  const sidebar = {
    insertBefore(child, nextSibling) {
      child.parentElement = sidebar;
      child.nextSibling = nextSibling || null;
    }
  };
  const wideHost = {
    hidden: true,
    appendChild(child) {
      child.parentElement = wideHost;
    }
  };
  const anchor = { parentElement: sidebar, nextSibling: null };
  const cardClassList = new Set();
  const card = {
    hidden: true,
    parentElement: sidebar,
    classList: {
      toggle(name, value) {
        if (value) cardClassList.add(name);
        else cardClassList.delete(name);
      }
    }
  };
  const panel = {
    hidden: true,
    classList: {
      toggle(name, value) {
        if (value) classList.add(name);
        else classList.delete(name);
      }
    }
  };
  const button = {
    textContent: '',
    attributes: {},
    title: '',
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  api.refs.classStepCard = card;
  api.refs.classStepWideHost = wideHost;
  api.refs.classStepSideAnchor = anchor;
  api.refs.classStepPanel = panel;
  api.refs.classStepLayout = button;
  api.state.classStepSession = { layout: 'wide' };
  api.toggleClassStepLayout();
  assert.strictEqual(api.state.classStepSession.layout, 'side');
  assert.strictEqual(card.parentElement, wideHost);
  assert.strictEqual(classList.has('is-side'), true);
  assert.strictEqual(classList.has('is-wide'), false);
  assert.strictEqual(button.textContent, 'side');
  api.toggleClassStepLayout();
  assert.strictEqual(api.state.classStepSession.layout, 'wide');
  assert.strictEqual(card.parentElement, wideHost);
  assert.strictEqual(wideHost.hidden, false);
  assert.strictEqual(cardClassList.has('wide'), true);
  assert.strictEqual(classList.has('is-wide'), true);
  assert.strictEqual(button.textContent, 'wide');
}

function testClassStepPhoneForcesSideLayout() {
  const api = loadCalculator();
  const classList = new Set();
  const panel = {
    classList: {
      toggle(name, value) {
        if (value) classList.add(name);
        else classList.delete(name);
      }
    }
  };
  const button = {
    hidden: false,
    disabled: false,
    textContent: '',
    attributes: {},
    title: '',
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  api.refs.classStepPanel = panel;
  api.refs.classStepLayout = button;
  api.refs.classStepWideHost = { hidden: false };
  api.refs.classStepCard = { classList: { toggle() {} } };
  api.state.classStepSession = { layout: 'side' };
  const previous = api.window.matchMedia;
  try {
    api.window.matchMedia = () => ({ matches: false });
    api.toggleClassStepLayout();
  } finally {
    api.window.matchMedia = previous;
  }
  assert.strictEqual(api.state.classStepSession.layout, 'side');
  assert.strictEqual(classList.has('is-side'), true);
  assert.strictEqual(button.hidden, true);
  assert.strictEqual(button.disabled, true);
}

function testClassStepSessionOpensSeparateCard() {
  const api = loadCalculator();
  const classList = new Set(['collapsed']);
  const card = {
    hidden: false,
    parentElement: null,
    classList: {
      remove(name) {
        classList.delete(name);
      },
      toggle() {
      }
    }
  };
  const host = {
    hidden: false,
    appendChild(child) {
      child.parentElement = this;
    }
  };
  const panel = {
    hidden: true,
    classList: { toggle() {} }
  };
  api.refs.classStepCard = card;
  api.refs.classStepWideHost = host;
  api.refs.classStepPanel = panel;
  const geometry = api.geometryFromVariety({ id: 'X', type: 'abstract', dim: '1', name: 'X' });
  const sheaf = api.sheafFromObject({ id: 'E', type: 'abstract', basis: 'chern', rank: '1', name: 'E', baseVarietyId: 'X' }, geometry);
  const bundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  api.state.lastResult = { geometry, sheaf, bundle };
  const session = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  api.state.classStepSession = session;
  api.refs.classStepFamily = { value: '' };
  api.refs.classStepTermOnly = { checked: false };
  api.refs.classStepTermIndex = { max: '', disabled: false, value: '' };
  api.refs.classStepFormula = { innerHTML: '' };
  api.refs.classStepRules = { hidden: false, innerHTML: '' };
  api.refs.classStepMessage = { textContent: '' };
  api.refs.classStepApply = { disabled: true };
  api.renderClassStepPanel();
  assert.strictEqual(card.hidden, false);
  assert.strictEqual(panel.hidden, false);
  assert.strictEqual(classList.has('collapsed'), false);
  api.stopClassStepSession();
  assert.strictEqual(card.hidden, false);
  assert.strictEqual(panel.hidden, true);
}

function testClassStepRuleOnceAndOnePassSemantics() {
  const api = loadCalculator();
  const rule = {
    id: 'a-to-b',
    enabled: true,
    lhs: { powers: { a: 1 } },
    rhs: [{ coefficient: '1', powers: { b: 1 } }]
  };
  api.VARS.set('a', { degree: 1, latex: 'a', plain: 'a' });
  api.VARS.set('b', { degree: 1, latex: 'b', plain: 'b' });
  const square = api.polyFromPowers({ a: 2 });
  const once = api.applyOneHomologyRuleOnce(square, rule, 2, {});
  assert.strictEqual(api.formatPolyPlain(once), 'a*b');
  const vanishingOnce = api.applyOneHomologyRuleOnce(square, { ...rule, rhs: [] }, 2, {});
  assert.strictEqual(api.formatPolyPlain(vanishingOnce), '0');
  const sweep = api.applyClassStepRulesToPoly(square, [rule], 2, { oncePerRule: false, onePass: true });
  assert.strictEqual(api.formatPolyPlain(sweep), 'b^2');

  const secondRule = {
    id: 'b-to-c',
    enabled: true,
    lhs: { powers: { b: 1 } },
    rhs: [{ coefficient: '1', powers: { c: 1 } }]
  };
  api.VARS.set('c', { degree: 1, latex: 'c', plain: 'c' });
  const onePass = api.applyClassStepRulesToPoly(api.polyFromPowers({ a: 1 }), [rule, secondRule], 2, { oncePerRule: false, onePass: true });
  assert.strictEqual(api.formatPolyPlain(onePass), 'c');
}

function testClassStepCachedRulesIncludeMapWrappedCandidates() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '1', name: 'X' },
    { id: 'Y', type: 'abstract', dim: '1', name: 'Y' }
  ];
  api.state.maps = [{ id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' }];
  const sourceGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sourceSheafObject = { id: 'E', type: 'abstract', basis: 'chern', rank: '1', name: 'E', baseVarietyId: 'X' };
  const sourceSheaf = api.sheafFromObject(sourceSheafObject, sourceGeometry);
  const sourceBundle = api.buildBundleForSheaf(sourceGeometry, sourceSheaf, { geometry: sourceGeometry });
  api.state.lastResult = { geometry: sourceGeometry, sheaf: sourceSheaf, bundle: sourceBundle };
  const sourceSession = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  sourceSession.components[1] = api.polyFromPowers({});
  api.rememberClassStepComponents(sourceSession);

  const map = api.state.maps[0];
  const pushedFormal = api.pushforwardPolynomialByDegree(map, sourceSession.originalComponents[1], 1, 1, { proper: false });
  const targetSheaf = { id: 'G', type: 'abstract', basis: 'chern', rankPlain: '1', rankLatex: '1', labelLatex: 'G', labelPlain: 'G', sourceObject: { id: 'G', basis: 'chern' } };
  const targetBundle = api.buildBundleForSheaf(targetGeometry, targetSheaf, { geometry: targetGeometry });
  api.state.lastResult = { geometry: targetGeometry, sheaf: targetSheaf, bundle: targetBundle };
  api.refs.classStepUseCache = { checked: true };
  const targetSession = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  targetSession.components[1] = pushedFormal;
  const candidates = api.collectClassStepRuleCandidates(targetSession);
  assert(candidates.some((candidate) => candidate.sourceLabel === 'cached pushforward'));
}

function testClassStepSwitchingRulesUnlockStoredOppositeBasisRule() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.maps = [{ id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'X' }];
  api.state.sheaves = [
    {
      id: 'E',
      type: 'locally-free',
      basis: 'chern',
      rank: '1',
      name: 'E',
      baseVarietyId: 'X',
      homology: {
        rules: [{
          id: 'rule-c1-E',
          enabled: true,
          lhs: { powers: { sheaf_E_c1: 1 } },
          rhs: []
        }]
      }
    }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const result = api.buildClassStepFallbackResult(geometry, sheaf, { message: 'test' });
  const session = api.createClassStepSession(result, 'character', 1);
  assert(!api.collectClassStepRuleCandidates(session).some((candidate) => candidate.sourceLabel === 'Switch c/ch'));
  session.checkSwitchingRules = true;
  const switchRule = api.collectClassStepRuleCandidates(session).find((candidate) => candidate.sourceLabel === 'Switch c/ch');
  assert(switchRule);
  assert.strictEqual(switchRule.selected, false);
  const afterSwitch = api.applyClassStepRulesToPoly(session.components[1], switchRule.rules, geometry.dim, { oncePerRule: true, onePass: true });
  session.components[1] = afterSwitch;
  assert(api.collectClassStepRuleCandidates(session).some((candidate) => candidate.rule.id === 'rule-c1-E'));
}

function testClassStepUseCacheRenderingSurvivesStaleVariableMetadata() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'abstract', dim: '1', name: 'X' },
    { id: 'Y', type: 'abstract', dim: '1', name: 'Y' }
  ];
  api.state.maps = [{ id: 'f', name: 'f', domainKind: 'variety', domainId: 'X', codomainKind: 'variety', codomainId: 'Y' }];
  const sourceGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sourceSheaf = api.sheafFromObject({ id: 'E', type: 'abstract', basis: 'chern', rank: '1', name: 'E', baseVarietyId: 'X' }, sourceGeometry);
  api.state.lastResult = { geometry: sourceGeometry, sheaf: sourceSheaf, bundle: api.buildBundleForSheaf(sourceGeometry, sourceSheaf, { geometry: sourceGeometry }) };
  const sourceSession = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  sourceSession.components[1] = api.polyFromPowers({});
  api.rememberClassStepComponents(sourceSession);
  api.VARS.clear();
  const targetSheaf = api.sheafFromObject({ id: 'G', type: 'abstract', basis: 'chern', rank: '1', name: 'G', baseVarietyId: 'Y' }, targetGeometry);
  api.state.lastResult = { geometry: targetGeometry, sheaf: targetSheaf, bundle: api.buildBundleForSheaf(targetGeometry, targetSheaf, { geometry: targetGeometry }) };
  api.refs.classStepUseCache = { checked: true };
  const targetSession = api.createClassStepSession(api.state.lastResult, 'chern', 1);
  targetSession.components[1] = api.pushforwardPolynomialByDegree(api.state.maps[0], sourceSession.originalComponents[1], 1, 1, { proper: false });
  assert.doesNotThrow(() => api.collectClassStepRuleCandidates(targetSession));
}

function testClassStepStopRowsUsePreservedComponents() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'X', type: 'abstract', dim: '2', name: 'X' });
  const sheafObject = { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' };
  const sheaf = api.sheafFromObject(sheafObject, geometry);
  const bundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  api.state.lastResult = { geometry, sheaf, bundle, classDisplay: { expression: 'standard', termMode: 'total', geometry, homology: geometry.homology, homologyRulePasses: 1 } };
  const session = api.createClassStepSession(api.state.lastResult, 'chern', null);
  const zero = session.components[1].sub(session.components[1]);
  session.components[1] = zero;
  session.components[2] = zero;
  session.active = false;
  session.stopped = true;
  const rows = api.buildClassRowsFromStepSession(session, api.state.lastResult.classDisplay);
  assert(rows.some((row) => row.key === 'chern' && row.plain === '1'));
  assert(rows.some((row) => row.key === 'character'));
}

function testClassFormulaBuilderAvailableWhenRowsAreLimited() {
  const api = loadCalculator();
  const geometry = api.geometryFromVariety({ id: 'X', type: 'abstract', dim: '2', name: 'X' });
  const sheafObject = { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' };
  const sheaf = api.sheafFromObject(sheafObject, geometry);
  const bundle = api.buildBundleForSheaf(geometry, sheaf, { geometry });
  const panel = { hidden: false };
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.refs.classFormulaBuilder = {};
  api.refs.classFormulaVariety = { innerHTML: '', disabled: true };
  api.refs.classFormulaHomologyButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaAddSheafClass = { disabled: true };
  api.refs.classFormulaClassFamily = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassDegree = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassSheaf = { innerHTML: '', disabled: true };
  api.refs.classFormulaMapButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaPreview = { innerHTML: '' };
  api.refs.classFormulaMessage = { textContent: '' };
  api.refs.classFormulaCheck = { disabled: true };
  api.refs.classFormulaCompute = { disabled: true };
  api.refs.classStepPanel = panel;
  api.state.classFormulaEditorOpen = true;
  api.syncClassStepAvailability({
    geometry,
    sheaf,
    bundle,
    classRows: [],
    classComputationLimited: true
  });
  assert.strictEqual(panel.hidden, false);
  assert.strictEqual(api.refs.classFormulaVariety.disabled, false);
  assert(api.refs.classFormulaVariety.innerHTML.includes('X'));
}

function testClassFormulaBuilderAvailableAfterErrorWithoutResult() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [{ id: 'F', type: 'abstract', basis: 'chern', rank: '2', name: 'F', baseVarietyId: 'X' }];
  api.state.activeSheafId = 'F';
  api.state.activeVarietyId = 'X';
  api.state.inputMode = 'modify';
  api.refs.inputMode = { value: 'modify' };
  api.refs.addObjectKind = { value: 'sheaf' };
  const panel = { hidden: false };
  api.refs.classFormulaBuilder = {};
  api.refs.classFormulaVariety = { innerHTML: '', disabled: true };
  api.refs.classFormulaHomologyButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaAddSheafClass = { disabled: true };
  api.refs.classFormulaClassFamily = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassDegree = { innerHTML: '', disabled: true };
  api.refs.classFormulaClassSheaf = { innerHTML: '', disabled: true };
  api.refs.classFormulaMapButtons = { classList: { toggle() {} }, textContent: '', innerHTML: '' };
  api.refs.classFormulaPreview = { innerHTML: '' };
  api.refs.classFormulaMessage = { textContent: '' };
  api.refs.classFormulaCheck = { disabled: true };
  api.refs.classFormulaCompute = { disabled: true };
  api.refs.classStepPanel = panel;
  api.state.classFormulaEditorOpen = true;
  api.syncClassStepAvailability(null);
  assert.strictEqual(panel.hidden, false);
  assert.strictEqual(api.refs.classFormulaVariety.disabled, false);
  assert(api.refs.classFormulaVariety.innerHTML.includes('X'));
}

function testClassStepBudgetFailureKeepsLastFormula() {
  const api = loadCalculator();
  api.VARS.set('a', { degree: 1, latex: 'a', plain: 'a' });
  api.VARS.set('b', { degree: 1, latex: 'b', plain: 'b' });
  api.VARS.set('c', { degree: 1, latex: 'c', plain: 'c' });
  const rule = {
    id: 'explode',
    enabled: true,
    lhs: { powers: { a: 1 } },
    rhs: [
      { coefficient: '1', powers: { b: 1 } },
      { coefficient: '1', powers: { c: 1 } }
    ]
  };
  const original = api.polyFromPowers({ a: 1 });
  assert.throws(() => api.applyClassStepRulesToPoly(original, [rule], 2, {
    oncePerRule: false,
    onePass: false,
    budget: api.createSymbolicBudget('step', { maxOps: 1, maxTerms: 100, maxMillis: 10000 })
  }), /symbolic work limit/);
  assert.strictEqual(api.formatPolyPlain(original), 'a');
}

function testHomologyCoefficientEditorAcceptsSymbolicRationalPolynomials() {
  const api = loadCalculator();
  api.state.globalInvariants = [
    { id: 'Nr', type: 'rational-number', name: 'r', value: '0', hasValue: false, replaceWithValue: false },
    { id: 'Nd', type: 'rational-number', name: 'd', value: '0', hasValue: false, replaceWithValue: false }
  ];
  const geometry = {
    type: 'abstract',
    dim: 2,
    labelLatex: 'X',
    labelPlain: 'X',
    varietyId: 'X',
    homology: {
      customClasses: [{ id: 'H', symbol: 'H', degree: 1, cohomologyDegree: 2 }],
      rules: []
    }
  };
  api.VARS.clear();
  api.homologyClassDefinitions(geometry).forEach((def) => {
    api.VARS.set(api.homologyDefVariableId(def, geometry), {
      degree: def.degree,
      cohomologyDegree: def.cohomologyDegree,
      latex: def.symbolLatex,
      plain: def.symbolPlain
    });
  });

  const symbolic = api.parseSymbolicRuleCoefficient('3rd+d^3');
  assert.strictEqual(api.formatRuleCoefficientPlain(symbolic), '(3*d*r + d^3)');

  const rationalSymbolic = api.parseSymbolicRuleCoefficient('1/3*rd+1/(3r)');
  assert.strictEqual(api.formatRuleCoefficientPlain(rationalSymbolic), '(1/3*d*r + 1/(3*r))');

  const hId = api.homologyDefVariableId(api.homologyClassDefinitions(geometry).find((def) => def.id === 'H'), geometry);
  const normalized = api.normalizeHomologyRule({
    id: 'symbolic-coeff',
    lhs: { powers: { [hId]: 1 } },
    rhs: [{ coefficient: '3rd+d^3', powers: { [hId]: 1 } }]
  }, geometry);
  assert(normalized);
  assert.strictEqual(normalized.rhs[0].coefficient, '(3*d*r + d^3)');
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(normalized)), '3*d*r*H + d^3*H');
  assert.strictEqual(api.homologyRuleCoefficientMap(normalized).get(`${hId}:1`), '(3*d*r + d^3)');
}

function testProductCustomClassBidegreeTruncatesImpossiblePowers() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', genus: '2', name: 'C' },
    { id: 'P', type: 'abelian', dim: '2', name: 'P' },
    {
      id: 'CP',
      type: 'abstract',
      dim: '3',
      name: 'C\\times P',
      construction: { type: 'product', varietyIds: ['C', 'P'], defaultName: 'C\\times P' },
      homology: {
        customClasses: [{
          id: 'gamma',
          symbol: '\\gamma',
          degree: 1,
          cohomologyDegree: 2,
          productBidegree: [1, 1]
        }],
        rules: []
      }
    }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[2]);
  const gamma = api.homologyClassDefinitions(geometry).find((def) => def.id === 'gamma');
  assert.strictEqual(gamma.productBidegree?.join(','), '1,1');
  const gammaId = api.homologyDefVariableId(gamma, geometry);
  const cube = api.polyFromPowers({ [gammaId]: 3 });
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(cube, { geometry, homology: geometry.homology })), '0');
}

function testProjectionPushforwardUsesFiberTopBidegree() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'projective', dim: '1', name: 'X' },
    { id: 'Y', type: 'projective', dim: '1', name: 'Y' },
    {
      id: 'XY',
      type: 'abstract',
      dim: '2',
      name: 'X\\times Y',
      construction: { type: 'product', varietyIds: ['X', 'Y'], defaultName: 'X\\times Y' },
      homology: { rules: [] }
    }
  ];
  api.state.maps = [{
    id: 'p1',
    name: 'p_1',
    domainKind: 'variety',
    domainId: 'XY',
    codomainKind: 'variety',
    codomainId: 'X',
    construction: { type: 'projection', productId: 'XY', factorIndex: 0 }
  }];
  api.state.activeHomologyTarget = { kind: 'map', id: 'p1' };
  const productGeometry = api.geometryFromVariety(api.state.varieties[2]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const sourceDefs = api.homologyClassDefinitions(productGeometry);
  const yGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const yPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, yGeometry);
  const fiberPointBox = sourceDefs.find((def) => def.productBox?.leftKey === '' && def.productBox?.rightKey === `${yPointId}:1`);
  assert(fiberPointBox);

  const sourceBidegrees = (defs) => defs
    .map((def) => api.VARS.get(def.variableId)?.sourceKey || '')
    .flatMap((sourceKey) => sourceKey.split('|').map((part) => part.split(':')[0]).filter(Boolean))
    .map((id) => api.VARS.get(id)?.productBidegree)
    .filter(Array.isArray)
    .map((bidegree) => bidegree.join(','));

  const candidateBidegrees = sourceBidegrees(api.mapHomologyClassDefinitions(targetGeometry));
  assert(!candidateBidegrees.includes('2,0'));
  assert(!candidateBidegrees.includes('0,2'));

  const defaultBidegrees = sourceBidegrees(api.defaultMapHomologyRulesForGeometry(targetGeometry)
    .filter((rule) => String(rule.id || '').startsWith('default-projection-pushforward-p1-'))
    .map((rule) => ({ variableId: Object.keys(rule.lhs?.powers || {})[0] }))
    .filter((def) => def.variableId));
  assert(!defaultBidegrees.includes('2,0'));
  assert(!defaultBidegrees.includes('0,2'));

  const fiberPointBoxId = api.homologyDefVariableId(fiberPointBox, productGeometry);
  const pushedFiberPoint = api.pushforwardPolynomialByDegree(
    api.state.maps[0],
    api.polyFromPowers({ [fiberPointBoxId]: 1 }),
    productGeometry.dim,
    targetGeometry.dim,
    {}
  );
  assert.strictEqual(api.formatPolyPlain(pushedFiberPoint), '1');

  const productPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, productGeometry);
  const pushedProductPoint = api.pushforwardPolynomialByDegree(
    api.state.maps[0],
    api.polyFromPowers({ [productPointId]: 1 }),
    productGeometry.dim,
    targetGeometry.dim,
    {}
  );
  assert.strictEqual(api.formatPolyPlain(pushedProductPoint), '[p]');
}

function testStepProjectionPushforwardUsesExistingProductBidegreeOnly() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'projective', dim: '1', name: 'X' },
    { id: 'Y', type: 'projective', dim: '1', name: 'Y' },
    {
      id: 'XY',
      type: 'abstract',
      dim: '2',
      name: 'X\\times Y',
      construction: { type: 'product', varietyIds: ['X', 'Y'], defaultName: 'X\\times Y' },
      homology: { rules: [] }
    }
  ];
  api.state.maps = [{
    id: 'p1',
    name: 'p_1',
    domainKind: 'variety',
    domainId: 'XY',
    codomainKind: 'variety',
    codomainId: 'X',
    construction: { type: 'projection', productId: 'XY', factorIndex: 0 }
  }];
  const productGeometry = api.geometryFromVariety(api.state.varieties[2]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const sourceDefs = api.homologyClassDefinitions(productGeometry);
  const xGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const yGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const xPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, xGeometry);
  const yPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, yGeometry);
  const leftOnly = api.homologyDefVariableId(sourceDefs.find((def) => def.productBox?.leftKey === `${xPointId}:1` && def.productBox?.rightKey === ''), productGeometry);
  const rightOnly = api.homologyDefVariableId(sourceDefs.find((def) => def.productBox?.leftKey === '' && def.productBox?.rightKey === `${yPointId}:1`), productGeometry);
  const mixed = api.polyFromPowers({ [leftOnly]: 1 }).add(api.polyFromPowers({ [rightOnly]: 1 }));
  const pushed = api.pushforwardPolynomialByDegree(api.state.maps[0], mixed, productGeometry.dim, targetGeometry.dim, {});
  const plain = api.formatPolyPlain(pushed);
  assert.strictEqual(plain, '1');
}

function testStepSimplifyProjectionPushforwardChecksFiberBidegree() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'projective', dim: '1', name: 'X' },
    { id: 'Y', type: 'projective', dim: '1', name: 'Y' },
    {
      id: 'XY',
      type: 'abstract',
      dim: '2',
      name: 'X\\times Y',
      construction: { type: 'product', varietyIds: ['X', 'Y'], defaultName: 'X\\times Y' },
      homology: { rules: [] }
    }
  ];
  api.state.maps = [{
    id: 'p1',
    name: 'p_1',
    domainKind: 'variety',
    domainId: 'XY',
    codomainKind: 'variety',
    codomainId: 'X',
    construction: { type: 'projection', productId: 'XY', factorIndex: 0 }
  }];
  const productGeometry = api.geometryFromVariety(api.state.varieties[2]);
  const targetGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const sourceDefs = api.homologyClassDefinitions(productGeometry);
  const xGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const yGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const xPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, xGeometry);
  const yPointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, yGeometry);
  const leftOnly = sourceDefs.find((def) => def.productBox?.leftKey === `${xPointId}:1` && def.productBox?.rightKey === '');
  const rightOnly = sourceDefs.find((def) => def.productBox?.leftKey === '' && def.productBox?.rightKey === `${yPointId}:1`);
  assert(leftOnly);
  assert(rightOnly);

  const pointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, targetGeometry);
  const options = {
    geometry: targetGeometry,
    homology: {
      rules: [{
        id: 'target-point-identity',
        enabled: true,
        lhs: { powers: { [pointId]: 1 } },
        rhs: [{ coefficient: '1', powers: { [pointId]: 1 } }]
      }]
    },
    includeMapClasses: true
  };
  const leftOnlyPushforwardId = 'map_pushforward_p1_left_only_for_simplify_test';
  api.VARS.set(leftOnlyPushforwardId, {
    degree: 0,
    cohomologyDegree: 0,
    latex: 'p_{1*}([p]\\boxtimes 1)',
    plain: 'p1_*([p]boxtimes 1)',
    kind: 'mapHomology',
    mapId: 'p1',
    operation: 'pushforward',
    sourceId: 'left_only_for_simplify_test',
    sourceKey: `${api.homologyDefVariableId(leftOnly, productGeometry)}:1`
  });
  const rightOnlyPushforwardId = 'map_pushforward_p1_right_only_for_simplify_test';
  api.VARS.set(rightOnlyPushforwardId, {
    degree: 0,
    cohomologyDegree: 0,
    latex: 'p_{1*}(1\\boxtimes [p])',
    plain: 'p1_*(1boxtimes [p])',
    kind: 'mapHomology',
    mapId: 'p1',
    operation: 'pushforward',
    sourceId: 'right_only_for_simplify_test',
    sourceKey: `${api.homologyDefVariableId(rightOnly, productGeometry)}:1`
  });

  const vanished = api.applyHomologyRules(api.polyFromPowers({ [leftOnlyPushforwardId]: 1 }), options);
  assert.strictEqual(api.formatPolyPlain(vanished), '0');
  const integrated = api.applyHomologyRules(api.polyFromPowers({ [rightOnlyPushforwardId]: 1 }), options);
  assert.strictEqual(api.formatPolyPlain(integrated), '1');
}

function testProjectionPullbackCarriesProductBidegreeForPushforwardVanishing() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'C', type: 'curve', dim: '1', name: 'C' },
    { id: 'Pic', type: 'abelian', dim: '4', name: 'Pic^d(C)', genus: '4', homology: { classes: { theta: { symbol: '\\Theta' } }, rules: [] } },
    {
      id: 'Prod',
      type: 'abstract',
      dim: '5',
      name: 'C\\times Pic^d(C)',
      construction: { type: 'product', varietyIds: ['C', 'Pic'], defaultName: 'C\\times Pic^d(C)' },
      homology: {
        classes: { eta: { symbol: '\\eta' } },
        customClasses: [{ id: 'eta', symbol: '\\eta', cohomologyDegree: 2, productBidegree: [2, 0] }],
        rules: []
      }
    }
  ];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', name: '\\mathcal{E}', twist: '1', rank: 'r', baseVarietyId: 'C', basis: 'character' }
  ];
  api.state.maps = [
    { id: 'piC', name: '\\pi_C', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'C', construction: { type: 'projection', productId: 'Prod', factorIndex: 0 } },
    { id: 'piPic', name: '\\pi_{Pic}', domainKind: 'variety', domainId: 'Prod', codomainKind: 'variety', codomainId: 'Pic', construction: { type: 'projection', productId: 'Prod', factorIndex: 1 } }
  ];
  const curveGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const productGeometry = api.geometryFromVariety(api.state.varieties[2]);
  const picGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const sheaf = api.sheafFromObject(api.state.sheaves[0], curveGeometry);
  const curveBundle = api.buildBundleForSheaf(curveGeometry, sheaf, { geometry: curveGeometry });
  const pulledCh1 = api.pullbackPolynomial(curveBundle.chComps[1], api.state.maps[0]);
  const pulledKey = Array.from(pulledCh1.terms.keys())[0];
  const pulledId = Object.keys((pulledKey || '').split('|').reduce((powers, part) => {
    const [id, exp] = part.split(':');
    if (id) powers[id] = Number(exp);
    return powers;
  }, {}))[0];
  assert.strictEqual(api.VARS.get(pulledId)?.productBidegree?.join(','), '2,0');
  const etaDef = api.homologyClassDefinitions(productGeometry).find((def) => def.id === 'eta');
  const etaId = api.homologyDefVariableId(etaDef, productGeometry);
  const term = api.polyFromPowers({ [etaId]: 1 }).mul(pulledCh1, productGeometry.dim);
  const pushed = api.pushforwardPolynomialByDegree(api.state.maps[1], term, productGeometry.dim, picGeometry.dim, {});
  assert.strictEqual(api.formatPolyPlain(pushed), '0');
}

function testProductBoxMultiplicationUsesKoszulSign() {
  const api = loadCalculator();
  api.state.varieties = [
    { id: 'X', type: 'curve', genus: '1', name: 'X', homology: { symplecticBasisConfirmed: true } },
    { id: 'Y', type: 'curve', genus: '1', name: 'Y', homology: { symplecticBasisConfirmed: true } },
    {
      id: 'XY',
      type: 'abstract',
      dim: '2',
      name: 'X\\times Y',
      construction: { type: 'product', varietyIds: ['X', 'Y'], defaultName: 'X\\times Y' },
      homology: { rules: [] }
    }
  ];
  const geometry = api.geometryFromVariety(api.state.varieties[2]);
  const defs = api.homologyClassDefinitions(geometry);
  const xGeometry = api.geometryFromVariety(api.state.varieties[0]);
  const yGeometry = api.geometryFromVariety(api.state.varieties[1]);
  const xA = api.homologyVariableId('curve_a_1', xGeometry);
  const xB = api.homologyVariableId('curve_b_1', xGeometry);
  const yA = api.homologyVariableId('curve_a_1', yGeometry);
  const yB = api.homologyVariableId('curve_b_1', yGeometry);
  const aa = defs.find((def) => def.productBox?.leftKey === `${xA}:1` && def.productBox?.rightKey === `${yA}:1`);
  const bb = defs.find((def) => def.productBox?.leftKey === `${xB}:1` && def.productBox?.rightKey === `${yB}:1`);
  assert(aa);
  assert(bb);
  const aaId = api.homologyDefVariableId(aa, geometry);
  const bbId = api.homologyDefVariableId(bb, geometry);
  const product = api.polyFromPowers({ [aaId]: 1 }).mul(api.polyFromPowers({ [bbId]: 1 }), geometry.dim);
  const reduced = api.applyHomologyRules(product, { geometry, homology: geometry.homology });
  assert.strictEqual(api.formatPolyPlain(reduced), '-[p]');
}

function testPicardPoincareGammaDefaultsToProductBidegree() {
  const api = loadCalculator();
  const curve = { id: 'C', type: 'curve', genus: '2', name: 'C' };
  api.state.varieties = [curve];
  const sheaf = api.createPicardCanonicalConstruction({
    curve,
    genus: 2,
    degreeSymbol: 'd',
    degreeValue: ''
  });
  assert(sheaf);
  const product = api.state.varieties.find((variety) => variety.construction?.type === 'product');
  assert(product);
  const geometry = api.geometryFromVariety(product);
  const gamma = api.homologyClassDefinitions(geometry).find((def) => def.id === 'picard_poincare_gamma');
  assert(gamma);
  assert.strictEqual(gamma.productBidegree?.join(','), '1,1');
  const gammaId = api.homologyDefVariableId(gamma, geometry);
  const cube = api.polyFromPowers({ [gammaId]: 3 });
  assert.strictEqual(api.formatPolyPlain(api.applyHomologyRules(cube, { geometry, homology: geometry.homology })), '0');

  const sheafModel = api.sheafFromObject(sheaf, geometry);
  const result = api.buildCharacteristicClasses(geometry, sheafModel);
  const chern = chernPlain(result.classRows);
  assert(chern.includes('gamma'));
  assert(chern.includes('d*[p]boxtimes 1'));
  assert(!chern.includes('c_2'));
  assert(!chern.includes('c_3'));

  const c1Def = api.sheafHomologyClassDefinitions(sheafModel, geometry).find((def) => def.degree === 1);
  const defaultRule = result.bundle.defaultSheafHomologyRules.find((rule) => rule.lhs?.powers?.[c1Def.id] === 1);
  assert(defaultRule);
  assert.notStrictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(defaultRule)), '0');

  const staleZeroRule = {
    id: `default-sheaf-rule-${c1Def.id}`,
    builtin: true,
    enabled: true,
    lhs: { powers: { [c1Def.id]: 1 } },
    rhs: []
  };
  const displayedRule = api.sheafHomologyRuleForDef(c1Def, [staleZeroRule]);
  const displayedPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(displayedRule));
  assert(displayedPlain.includes('gamma'));
  assert(displayedPlain.includes('d*'));
  assert.notStrictEqual(displayedPlain, '0');
}

function testPicardPoincareSheafKeepsClassRevealAvailableBeforeResult() {
  const api = loadCalculator();
  const curve = { id: 'C', type: 'curve', genus: '2', name: 'C' };
  api.state.varieties = [curve];
  const sheaf = api.createPicardCanonicalConstruction({
    curve,
    genus: 2,
    degreeSymbol: 'd',
    degreeValue: ''
  });
  assert(sheaf);
  api.state.inputMode = 'modify';
  api.state.activeSheafId = sheaf.id;
  api.state.activeMapId = null;
  api.state.lastResult = null;
  assert.strictEqual(api.chartRevealAvailability(null).classes, true);
}

function testPicardPoincareLargeGenusThetaAndProjectionRules() {
  const api = loadCalculator();
  const genus = 9;
  const curve = { id: 'C', type: 'curve', genus: String(genus), name: 'C' };
  api.state.varieties = [curve];
  const sheaf = api.createPicardCanonicalConstruction({
    curve,
    genus,
    degreeSymbol: 'd',
    degreeValue: ''
  });
  assert(sheaf);
  const product = api.state.varieties.find((variety) => variety.construction?.type === 'product');
  const picard = api.state.varieties.find((variety) => variety.construction?.type === 'picard-variety');
  const projectionPicard = api.state.maps.find((map) => map.construction?.type === 'projection' && map.codomainId === picard.id);
  assert(product);
  assert(picard);
  assert(projectionPicard);

  const productGeometry = api.geometryFromVariety(product);
  const picardGeometry = api.geometryFromVariety(picard);
  const thetaDef = api.homologyClassDefinitions(picardGeometry).find((def) => def.id === 'theta');
  assert(thetaDef);
  const thetaId = api.homologyDefVariableId(thetaDef, picardGeometry);
  const pointId = api.homologyVariableId(api.HOMOLOGY_POINT_CLASS, picardGeometry);
  const thetaTopRule = api.standardHomologyRules(picardGeometry)
    .find((rule) => rule.lhs?.powers?.[thetaId] === genus);
  assert(thetaTopRule);
  assert.strictEqual(thetaTopRule.rhs[0].coefficient, '362880');
  assert.strictEqual(thetaTopRule.rhs[0].powers[pointId], 1);

  const gammaDef = api.homologyClassDefinitions(productGeometry).find((def) => def.id === 'picard_poincare_gamma');
  const etaDef = api.homologyClassDefinitions(productGeometry).find((def) => def.id === 'picard_eta');
  assert(gammaDef);
  assert(etaDef);
  const gammaId = api.homologyDefVariableId(gammaDef, productGeometry);
  const etaId = api.homologyDefVariableId(etaDef, productGeometry);
  const projectionRules = api.defaultMapHomologyRulesForGeometry(picardGeometry);
  const etaRule = projectionRules.find((rule) => rule.id === `default-picard-projection-eta-pushforward-${projectionPicard.id}`);
  const gammaSquareRule = projectionRules.find((rule) => rule.id === `default-picard-projection-gamma-square-pushforward-${projectionPicard.id}`);
  assert(etaRule);
  assert(gammaSquareRule);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(etaRule)), '1');
  assert.strictEqual(api.VARS.get(Object.keys(etaRule.lhs.powers)[0])?.sourceKey, `${etaId}:1`);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(gammaSquareRule)), '-2*Theta');
  assert.strictEqual(api.VARS.get(Object.keys(gammaSquareRule.lhs.powers)[0])?.sourceKey, `${gammaId}:2`);

  const sheafModel = api.sheafFromObject(sheaf, productGeometry);
  const result = api.buildCharacteristicClasses(productGeometry, sheafModel);
  const c1Def = api.sheafHomologyClassDefinitions(sheafModel, productGeometry).find((def) => def.degree === 1);
  const displayedRule = api.sheafHomologyRuleForDef(c1Def, result.bundle.defaultSheafHomologyRules);
  const displayedPlain = api.formatPolyPlain(api.homologyRuleRhsPoly(displayedRule));
  assert(displayedPlain.includes('gamma'));
  assert(displayedPlain.includes('d*eta'));
  assert.notStrictEqual(displayedPlain, '0');
}

function testPicardPushforwardDoesNotInventHyperplaneClass() {
  const api = loadCalculator();
  const curve = { id: 'C', type: 'curve', genus: '3', name: 'C' };
  api.state.varieties = [curve];
  const poincare = api.createPicardCanonicalConstruction({
    curve,
    genus: 3,
    degreeSymbol: 'd',
    degreeValue: ''
  });
  assert(poincare);
  const picard = api.state.varieties.find((variety) => variety.construction?.type === 'picard-variety');
  const product = api.state.varieties.find((variety) => variety.construction?.type === 'product');
  const projectionPicard = api.state.maps.find((map) => map.construction?.type === 'projection' && map.codomainId === picard.id);
  assert(picard);
  assert(product);
  assert(projectionPicard);

  const rows = characteristicRows(api, {
    id: 'F',
    type: 'abstract',
    basis: 'chern',
    twist: '1',
    rank: 'r',
    name: 'F',
    baseVarietyId: picard.id,
    construction: {
      type: 'pushforward',
      mapId: projectionPicard.id,
      sheafId: poincare.id,
      exact: true,
      proper: true
    }
  });
  const c = chernPlain(rows);
  const ch = characterPlain(rows);
  assert(!c.includes('H'));
  assert(!ch.includes('H'));
  assert(!ch.includes('pi_'));
  assert(ch.includes('d'));
  assert(ch.includes('Theta'));

  const picardGeometry = api.geometryFromVariety(picard);
  assert.strictEqual(api.homologyClassDefinitions(picardGeometry).some((def) => def.id === api.HOMOLOGY_HYPERPLANE_CLASS), false);
  const hyperplaneVariables = Array.from(api.VARS.entries()).filter(([id, data]) => id.includes('_H') || data.latex === 'H');
  assert.deepStrictEqual(hyperplaneVariables, []);
}

function testClassTermModeShowsZeroChernTermsAboveRank() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.refs.classTermOnly = { checked: true };
  api.refs.classBracketDisplay = { checked: false };
  api.refs.classTermIndex = { value: '2' };
  api.refs.classFamilyToggles = [{ checked: true, dataset: { classFamilyToggle: 'chern' } }];
  api.refs.rootForm = { value: 'product' };

  const line = { id: 'L', type: 'locally-free', basis: 'chern', rank: '1', name: 'L', baseVarietyId: 'X' };
  const rows = characteristicRows(api, line);
  assert.strictEqual(rows.find((row) => row.key === 'chern_2')?.plain, '0');

  const rootLine = { ...line, id: 'R', basis: 'roots', name: 'R' };
  const productRootRows = characteristicRows(api, rootLine);
  assert.strictEqual(productRootRows.find((row) => row.key === 'root_chern_2')?.plain, '0');

  api.refs.rootForm.value = 'expanded';
  const expandedRootRows = characteristicRows(api, rootLine);
  assert.strictEqual(expandedRootRows.find((row) => row.key === 'root_chern_2')?.plain, '0');
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

function identifyTestSelect(value = 'variety') {
  return {
    value,
    options: [
      { value: 'variety', disabled: false },
      { value: 'sheaf', disabled: false }
    ]
  };
}

function identifyTestPickButton() {
  return {
    hidden: true,
    disabled: false,
    textContent: '',
    title: '',
    setAttribute(name, value) { this[name] = value; }
  };
}

function installIdentifyTestRefs(api, kind = 'variety') {
  api.refs.addObjectKind = { value: 'combined' };
  api.refs.combinedType = { value: 'identify' };
  api.refs.identifyKind = identifyTestSelect(kind);
  api.refs.identifyRuleOnly = { checked: false };
  api.refs.identifyAutoClasses = { checked: true };
  api.refs.inputPickMode = identifyTestPickButton();
}

function testIdentifyPickFlowChoosesAvailableKindAndStopsAfterPair() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '1', name: 'X' }];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: '1', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: '1', name: 'F', baseVarietyId: 'X' }
  ];
  installIdentifyTestRefs(api, 'variety');

  assert.strictEqual(api.activateIdentifyPick('left', { render: false }), true);
  assert.strictEqual(api.refs.identifyKind.value, 'sheaf');
  assert.strictEqual(api.activePickFlow().id, 'identify');
  assert.strictEqual(api.canvasPickAvailable(), true);
  assert.strictEqual(api.pickFlowCandidate('sheaf', 'E'), true);

  api.handleActivePickFlow('sheaf', 'E');
  assert.strictEqual(api.state.canvasPickEnabled, true);
  assert.strictEqual(api.pickFlowHint().includes('second sheaf'), true);

  api.handleActivePickFlow('sheaf', 'F');
  assert.strictEqual(api.state.identifyDraft.objectIds.join(','), 'E,F');
  assert.strictEqual(api.state.canvasPickEnabled, false);

  assert.strictEqual(api.activateIdentifyPick('left', { render: false }), true);
  api.setCanvasPickEnabled(false, { render: false });
  assert.strictEqual(api.state.canvasPickEnabled, false);
}

function testRuleOnlySheafIdentificationPersistsAfterSheafDeletion() {
  const api = loadCalculator();
  api.state.varieties = [{ id: 'X', type: 'abstract', dim: '2', name: 'X' }];
  api.state.sheaves = [
    { id: 'E', type: 'abstract', basis: 'chern', rank: '2', name: 'E', baseVarietyId: 'X' },
    { id: 'F', type: 'abstract', basis: 'chern', rank: '2', name: 'F', baseVarietyId: 'X' }
  ];
  installIdentifyTestRefs(api, 'sheaf');
  api.refs.identifyRuleOnly.checked = true;
  api.state.identifyDraft = {
    kind: 'sheaf',
    objectIds: ['E', 'F'],
    mainId: 'F',
    nameMode: 'main',
    name: '',
    ruleOnly: true,
    autoClassMatches: true,
    classMatches: {},
    classRenames: {}
  };

  const kept = api.createIdentifyFromDraft();
  assert.strictEqual(kept.id, 'F');
  assert.strictEqual(api.state.sheaves.map((sheaf) => sheaf.id).join(','), 'E,F');
  assert.strictEqual(api.state.classStepSavedRules.length, 1);
  const identificationEntry = api.state.classStepSavedRules[0];
  assert.strictEqual(identificationEntry.kind, 'sheaf-identification');
  assert.strictEqual(identificationEntry.sourceSheafId, 'E');
  assert.strictEqual(identificationEntry.targetSheafId, 'F');
  assert(identificationEntry.variables?.sheaf_E_c1);
  assert(identificationEntry.variables?.sheaf_F_c1);
  const sourceToddTotalId = identificationEntry.variableIds.find((id) => id === 'sheaf_E_tdTotal_X');
  assert(sourceToddTotalId, identificationEntry.variableIds.join(','));

  api.state.sheaves = api.state.sheaves.filter((sheaf) => sheaf.id !== 'E');
  const geometry = api.geometryFromVariety(api.state.varieties[0]);
  const targetSheaf = api.sheafFromObject(api.state.sheaves[0], geometry);
  const bundle = api.buildBundleForSheaf(geometry, targetSheaf, { geometry });
  const session = api.createClassStepSession({ geometry, sheaf: targetSheaf, bundle }, 'chern', 1);
  session.components[1] = api.polyFromPowers({ sheaf_E_c1: 1 });
  session.originalComponents[1] = api.polyFromPowers({ sheaf_E_c1: 1 });
  const candidate = api.collectClassStepRuleCandidates(session)
    .find((item) => item.sourceLabel === 'Identification' && item.rule.lhs?.powers?.sheaf_E_c1 === 1);
  assert(candidate, api.collectClassStepRuleCandidates(session).map((item) => item.sourceLabel).join(','));
  const rhs = api.formatPolyPlain(api.homologyRuleRhsPoly(api.classStepMaterializeRule(session, candidate.rule)));
  assert.strictEqual(rhs, 'c_1(F)');

  const formulaSession = api.createClassFormulaStepSession({
    ok: true,
    geometry,
    poly: api.polyFromPowers({ [sourceToddTotalId]: 1 }),
    latex: '\\operatorname{td}(E)',
    plain: 'td(E)',
    signature: 'test-identification-todd'
  });
  const toddCandidate = api.collectClassStepRuleCandidates(formulaSession)
    .find((item) => item.sourceLabel === 'Identification' && item.rules.some((rule) => rule.lhs?.powers?.[sourceToddTotalId] === 1));
  assert(toddCandidate, api.collectClassStepRuleCandidates(formulaSession).map((item) => item.sourceLabel).join(','));
  const toddRule = toddCandidate.rules.find((rule) => rule.lhs?.powers?.[sourceToddTotalId] === 1);
  assert.strictEqual(api.formatPolyPlain(api.homologyRuleRhsPoly(toddRule)), 'td(F)');

  const preset = api.buildPresetState();
  const savedPresetRule = preset.step.savedRules.find((entry) => entry.id === identificationEntry.id);
  assert.strictEqual(savedPresetRule.kind, 'sheaf-identification');
  assert(savedPresetRule.sourceSheaf);
  assert(savedPresetRule.variables?.sheaf_E_c1);
}

testStepBuilderMarkupIsBelowCanvasAndClassChartHasNoStepButton();
testCurveToProjectivePullbackUsesCurvePoint();
testCurveSymplecticBasisIsOptIn();
testProjectivePullbackStillUsesTargetHyperplane();
testDuplicateDisplayNamesHaveDistinctInternalClasses();
testDuplicateSheafNamesHaveDistinctInternalClasses();
testGrassmannianUsesTautologicalBundleClasses();
testGrassmannianYoungBasisRulesExpressTautologicalClasses();
testPpavModuliUsesLambdaClassesAndRules();
testPpavModuliTangentChernClassesAreTautological();
testPpavModuliPresetRoundTrip();
testHigherDimensionPpavUsesTrueDimensionAndQueryOnlyHodge();
testLargeAbelianHodgeUsesSingleEntryQuery();
testTwelveDimensionalHodgeStillRendersFullTable();
testPolyvectorParallelogramForProjectiveSpace();
testPolyvectorParallelogramForAbelianVariety();
testPolyvectorParallelogramForCurves();
testPolyvectorParallelogramForProductOfKnownFactors();
testPolyvectorParallelogramForProductWithAbelianFactor();
testPolyvectorParallelogramForProductWithUnknownFactorIsSymbolic();
testPolyvectorParallelogramForSymmetricProductCurveSpecialCases();
testExpandedPolyvectorParallelogramShowsHochschildTotals();
testPolyvectorParallelogramUsesHodgeCellSizeScale();
testExpandedPolyvectorParallelogramUsesSymbolsForSymbolicTotals();
testPolyvectorParallelogramForCalabiYauCompleteIntersectionUsesHodgeMirror();
testCompleteIntersectionBettiTableUsesKoszulDegrees();
testBettiTableFillsMissingRowsForSparseCompleteIntersectionDegrees();
testProjectiveSpaceBettiTableIsTrivialCoordinateRing();
testBettiTableRevealIsLazyAndExplainsSymbols();
testBettiTableFallbackShowsSymbolicTemplateForUnsupportedVariety();
testAbelianSpecialSheavesAreTrivial();
testSheafIdentificationRulesForDirectCases();
testClassStepOffersSheafIdentificationRules();
testFormulaStepOffersSheafIdentificationRules();
testSelfDirectSumScalesChernCharacter();
testDivisorLineBundleUsesAssignedDivisorChernClass();
testDivisorLineBundlePresetRoundTrip();
testPresetStateIncludesRecoverableConstructionData();
testPresetImportRestoresRecoverableState();
testDualSheafUsesAlternatingChernClasses();
testDualSheafNameMergesExistingExponent();
testMukaiAndKappaRespectClassBasis();
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
testCyclicRamifiedCoverAddsRamificationPushforwardRules();
testGeneralRamifiedCoverDoesNotAddRamificationPushforwardRule();
testSmoothCyclicProjectiveRamifiedCoverAddsTildeHyperplaneRules();
testCompleteIntersectionRamifiedCoverTildeHyperplaneTopUsesBaseDegree();
testGeneralProjectiveRamifiedCoverAddsTildeHyperplaneButNoRamificationRule();
testSmoothCyclicRamifiedCoverAddsRootClassAndHodgeNumbers();
testTangentHomologyPromotionUsesVarietyDisplay();
testRamifiedCoverTangentPromotionCopiesComputedRuleToVariety();
testAbstractSmoothCyclicRamifiedCoverKeepsBranchDegreeSymbolic();
testRamifiedCoverPresetRoundTripAndDegreeOneSuppression();
testRamifiedCoverPresetRoundTripBranchDegree();
testRamifiedCoverMapConstructionUpdatesCoverData();
testRamifiedCoverMapGeneralModeSuppressesSmoothCyclicData();
testRamifiedCoverRefreshPreservesConstructionAfterDimensionEdit();
testSmoothCyclicCurveRamifiedCoverUsesRiemannHurwitz();
testSmoothCyclicRamifiedCoverRelativeDifferentialsStayLazyUntilAbsoluteSheaf();
testGrassmannianMapConstructionCreatesTargetAndMap();
testGrassmannianMapGenericallyGeneratedOnlyIsRational();
testRankOneGrassmannianMapUsesProjectiveSpaceAndTwists();
testCurveRecommendationsCreateAjAndPicardCanonicalIdempotently();
testSymmetricProductRecommendationsCreateAjOnly();
testCompleteIntersectionRecommendationCreatesEmbeddingAndRules();
testCompleteIntersectionRecommendationUnavailableForProjectiveOrTooLargeAmbient();
testRamifiedCoverMapRecommendationsCreateRamificationAndRevealRootLine();
testRamifiedCoverMapRecommendationEligibilityEdges();
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
testClassStepAutoTargetSelection();
testClassStepFormalRanksAreSheafSpecific();
testClassStepSesAppliesRankAsCharacterZero();
testClassStepDerivedCharacteristicTargets();
testClassStepToddRuleStopsAtChernClasses();
testClassStepDerivedTargetAppliesVisibleHomologyRule();
testClassFormulaBuilderTokenSourcesAndValidation();
testClassFormulaBuilderRejectsInvalidMapAndStartsStepSession();
testClassFormulaBuilderRendersSelectedClassButtonAndEditableTokens();
testClassStepFormulaHistoryAndUndoLastStep();
testClassStepSavedFormulaRulesAreReusableAndRemovable();
testUnitFactorsAreNormalizedInStepPolynomials();
testClassStepSimplifyIsSelectableRule();
testClassStepCandidatesOnlyIncludeApplicableRules();
testClassStepStartsFromFormalConstructedSheafClassAndOffersSesRule();
testClassStepPushforwardOffersGrrRule();
testClassStepTotalCharacterGrrAppliesToVisibleTotal();
testClassStepAbelJacobiStructureSheafGrrKeepsSourceTermsSymbolic();
testSymmetricProductGenusCanBeClearedWhileEditing();
testSymmetricProductAggregateRulesUseAveragedCoefficients();
testSymmetricProductAbelJacobiUsesProjectionFormulaForSigma();
testClassStepNestedPushforwardOffersGrrAfterSes();
testClassStepTensorRulesForCharacterAndChern();
testStrengthenedTensorUsesMultipleParentsAndExponents();
testStrengthenedDifferentialExteriorPowerConstructions();
testStrengthenedDifferentialExteriorPowerCohomologyOnProjectiveSpace();
testClassStepWrapsPullbackSourceRulesInsidePushforward();
testClassStepPicardPushforwardGroupsToddAndFindsTensor();
testClassStepPicardPoincarePushforwardToddStepMatchesNormalCharacter();
testClassStepRepeatedDisplayedRulesOnlyAppearOnce();
testClassStepLayoutToggleDefaultsWideAndSwitchesSide();
testClassStepPhoneForcesSideLayout();
testClassStepSessionOpensSeparateCard();
testClassStepRuleOnceAndOnePassSemantics();
testClassStepCachedRulesIncludeMapWrappedCandidates();
testClassStepSwitchingRulesUnlockStoredOppositeBasisRule();
testClassStepUseCacheRenderingSurvivesStaleVariableMetadata();
testClassStepStopRowsUsePreservedComponents();
testClassFormulaBuilderAvailableWhenRowsAreLimited();
testClassFormulaBuilderAvailableAfterErrorWithoutResult();
testClassStepBudgetFailureKeepsLastFormula();
testHomologyCoefficientEditorAcceptsSymbolicRationalPolynomials();
testProductCustomClassBidegreeTruncatesImpossiblePowers();
testProjectionPushforwardUsesFiberTopBidegree();
testStepProjectionPushforwardUsesExistingProductBidegreeOnly();
testStepSimplifyProjectionPushforwardChecksFiberBidegree();
testProjectionPullbackCarriesProductBidegreeForPushforwardVanishing();
testProductBoxMultiplicationUsesKoszulSign();
testPicardPoincareGammaDefaultsToProductBidegree();
testPicardPoincareSheafKeepsClassRevealAvailableBeforeResult();
testPicardPoincareLargeGenusThetaAndProjectionRules();
testPicardPushforwardDoesNotInventHyperplaneClass();
testClassTermModeShowsZeroChernTermsAboveRank();
testClassDisplayUsesCappedPasses();
testProductPickFlowRegistryCoversCandidatesAndSelection();
testMapCompositionPickFlowRegistryCoversMapCandidates();
testSheafBinaryPickFlowRegistryCoversSheafCandidates();
testIdentifyPickFlowChoosesAvailableKindAndStopsAfterPair();
testRuleOnlySheafIdentificationPersistsAfterSheafDeletion();

console.log('sheaf calculator regression tests passed');
