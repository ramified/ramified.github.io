(() => {
  'use strict';

  const MAX_DIMENSION = 8;
  const MAX_CI_EQUATIONS = 8;
  const MAX_AMBIENT = 16;
  const MAX_CI_DEGREE = 99;
  const MAX_CI_SLIDER_DEGREE = 12;
  const MAX_ROOT_EXPANSION_MONOMIALS = 1500;
  const MAX_EXPLICIT_ROOT_FACTORS = 64;
  const MAX_SCHUR_PARTITION_SIZE = 12;
  const MAX_SELF_DIRECT_SUM_MULTIPLICITY = 99;
  const MAX_GRASSMANNIAN_N = MAX_DIMENSION + 1;
  const DEFAULT_HOMOLOGY_RULE_PASSES = 1;
  const DEFAULT_VARIETY_SPACING_PX = 110;
  const DEFAULT_FIRST_VARIETY_X = 0.22;
  const DEFAULT_FIRST_VARIETY_Y = 0.6;
  const DEFAULT_FIRST_SHEAF_DX = 0.03;
  const DEFAULT_FIRST_SHEAF_DY = -0.2;
  const DEFAULT_MAP_LABEL_OFFSET = -18;
  const MIN_MAP_LABEL_OFFSET = -25;
  const MAX_MAP_LABEL_OFFSET = 25;
  const DEFAULT_MAP_LABEL_T = 0.5;
  const MAP_BEND_SLOTS = [0, -60, 60, -120, 120];
  const LEGACY_STRAIGHT_MAP_POINT_COUNT = -1;
  const STRAIGHT_MAP_POINT_COUNT = 0;
  const DEFAULT_MAP_POINT_COUNT = STRAIGHT_MAP_POINT_COUNT;
  const MAX_MAP_POINT_COUNT = 5;
  const MAP_POINT_COUNT_OPTIONS = [STRAIGHT_MAP_POINT_COUNT, 2, 3, 4, 5];
  const DEFAULT_SEQUENCE_TAIL_POINT_COUNT = STRAIGHT_MAP_POINT_COUNT;
  const MAX_SEQUENCE_TAIL_POINT_COUNT = MAX_MAP_POINT_COUNT;
  const SEQUENCE_TAIL_POINT_COUNT_OPTIONS = MAP_POINT_COUNT_OPTIONS;
  const MAP_CURVE_SAMPLE_COUNT = 48;
  const VARIETY_LETTER_NAMES = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'Q'];
  const SHEAF_LETTER_NAMES = ['\\mathcal{E}', '\\mathcal{F}', '\\mathcal{G}', '\\mathcal{H}', '\\mathcal{I}', '\\mathcal{J}', '\\mathcal{K}', '\\mathcal{L}', '\\mathcal{M}', '\\mathcal{N}'];
  const MAP_LETTER_NAMES = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w'];
  const REPETITION_STYLE_LABELS = {
    variety: {
      letters: 'X,Y,Z,W...',
      prime: "X,X',X''...",
      paren: 'X,X^{(1)},X^{(2)}...',
      subscript: 'X,X_{1},X_{2}...'
    },
    sheaf: {
      letters: '\\mathcal{E},\\mathcal{F},\\mathcal{G}...',
      prime: "\\mathcal{E},\\mathcal{E}',\\mathcal{E}''...",
      paren: '\\mathcal{E},\\mathcal{E}^{(1)},\\mathcal{E}^{(2)}...',
      subscript: '\\mathcal{E},\\mathcal{E}_{1},\\mathcal{E}_{2}...'
    },
    map: {
      letters: 'f,g,h,i...',
      prime: "f,f',f''...",
      paren: 'f,f^{(1)},f^{(2)}...',
      subscript: 'f,f_1,f_2...'
    }
  };
  const HOMOLOGY_UNIT_CLASS = 'unit';
  const HOMOLOGY_HYPERPLANE_CLASS = 'hyperplane';
  const HOMOLOGY_THETA_CLASS = 'theta';
  const HOMOLOGY_POINT_CLASS = 'point';
  const HOMOLOGY_CURVE_A_CLASS_PREFIX = 'curve_a_';
  const HOMOLOGY_CURVE_B_CLASS_PREFIX = 'curve_b_';
  const HOMOLOGY_CURVE_SYMPLECTIC_RULE_PREFIX = 'curve-symplectic-';
  const HOMOLOGY_JACOBIAN_THETA_RULE_ID = 'jacobian-theta-symplectic';
  const HOMOLOGY_JACOBIAN_TOP_RULE_ID = 'jacobian-symplectic-point';
  const HOMOLOGY_PRODUCT_BOX_CLASS_PREFIX = 'product_box_';
  const HOMOLOGY_PRODUCT_BOX_RULE_PREFIX = 'product-box-';
  const HOMOLOGY_GRASSMANNIAN_TAUTOLOGICAL_CLASS_PREFIX = 'grassmannian_s_';
  const HOMOLOGY_GRASSMANNIAN_YOUNG_CLASS_PREFIX = 'grassmannian_young_';
  const HOMOLOGY_GRASSMANNIAN_RULE_PREFIX = 'grassmannian-';
  const HOMOLOGY_TANGENT_CHERN_CLASS_PREFIX = 'tangent_chern_';
  const HOMOLOGY_TOP_RULE_ID = 'top-hyperplane-point';
  const HOMOLOGY_THETA_TOP_RULE_ID = 'top-theta-point';
  const HOMOLOGY_POINT_UNIT_RULE_ID = 'point-class-unit';
  const MAX_PRODUCT_BOX_CLASSES = 600;
  const POINT_VARIETY_NAMES = ['\\{*\\}', 'pt', 'p', '\\{p\\}'];
  const VARS = new Map();
  const refs = {};
  const hodgeACoeffCache = new Map();
  const completeSymmetricCache = new Map();
  const schurPowerPolynomialCache = new Map();
  const integerPartitionCountCache = new Map();
  const state = {
    lastResult: null,
    varieties: [],
    sheaves: [],
    maps: [],
    sequences: [],
    globalInvariants: [],
    activeGlobalInvariantId: null,
    activeVarietyId: null,
    activeSheafId: null,
    activeMapId: null,
    activeSequenceId: null,
    inputMode: 'create',
    labelDrag: null,
    productDraft: null,
    sesDraft: null,
    sesPickTarget: 'sheaf-a',
    blowupDraft: null,
    blowupPickTarget: 'base',
    tautologicalSesDraft: null,
    grassmannianMapDraft: null,
    grassmannianMapPickTarget: 'bundle',
    mapDraft: null,
    mapPickTarget: 'domain',
    mapDrag: null,
    mapControlDrag: null,
    sequenceTailDrag: null,
    sheafBinaryDraft: null,
    sheafBinaryPickTarget: 'left',
    sheafSelfSumDraft: null,
    sheafSchurDraft: null,
    sheafIdealDraft: null,
    sheafMapDraft: null,
    sheafMapPickTarget: 'map',
    canvasPickEnabled: false,
    draftSheafBaseVarietyId: null,
    productPickIndex: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    draftVarietyNameDirty: false,
    draftSheafNameDirty: false,
    draftMapNameDirty: false,
    nextObjectId: 1,
    hodgeExpanded: false,
    hodgeWide: false,
    hodgeCellSize: 20,
    revealedCharts: {
      hodge: false,
      classes: false,
      cohomology: false
    },
    homologyRulePasses: DEFAULT_HOMOLOGY_RULE_PASSES,
    homologyMapInputMode: 'coefficients',
    homologyMapClassTableOpen: false,
    homologyExpressionTransposed: true,
    hiddenObjects: [],
    exportScope: 'main',
    suppressLabelClickUntil: 0,
    suppressCardToggleUntil: 0,
    mathJaxQueue: Promise.resolve()
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    bindRuntimeErrorWarnings();
    initializeInputObjects();
    syncInputEditorVisibility();
    normalizeControlVisibility();
    syncCompleteIntersectionControls();
    bindControls();
    bindCards();
    syncHodgeWidePlacement();
    recompute();
    window.addEventListener('resize', debounce(() => {
      renderCanvas(state.lastResult);
      syncHodgeWidePlacement();
    }, 80));
  }

  function bindRuntimeErrorWarnings() {
    if (typeof window === 'undefined' || window.__sheafCalculatorRuntimeWarningsBound) return;
    window.__sheafCalculatorRuntimeWarningsBound = true;
    window.addEventListener('error', (event) => {
      reportInputActionError(event.error || event.message || new Error('Unexpected JavaScript error.'));
    });
    window.addEventListener('unhandledrejection', (event) => {
      reportInputActionError(event.reason || new Error('Unexpected asynchronous JavaScript error.'));
    });
  }

  function collectRefs() {
    refs.dim = $('variety-dim');
    refs.varietyType = $('variety-type');
    refs.curveGenusRow = $('curve-genus-row');
    refs.curveGenus = $('curve-genus');
    refs.ciDegreesRow = $('ci-degrees-row');
    refs.ciDegrees = $('ci-degrees');
    refs.ciEquationCountRow = $('ci-equation-count-row');
    refs.ciEquationCount = $('ci-equation-count');
    refs.ciEquationCountValue = $('ci-equation-count-value');
    refs.ciDegreeSliders = $('ci-degree-sliders');
    refs.ciNote = $('ci-note');
    refs.productFactorsRow = $('product-factors-row');
    refs.productFactorA = $('product-factor-a');
    refs.productFactorB = $('product-factor-b');
    refs.productPickNote = $('product-pick-note');
    refs.grassmannianParamsRow = $('grassmannian-params-row');
    refs.grassmannianR = $('grassmannian-r');
    refs.grassmannianN = $('grassmannian-n');
    refs.pointNamePresetRow = $('point-name-preset-row');
    refs.pointNamePresets = Array.from(document.querySelectorAll('[data-point-variety-name]'));
    refs.varietyName = $('variety-name');
    refs.varietyEditorTitle = $('variety-editor-title');
    refs.varietyEditor = $('variety-editor');
    refs.sheafType = $('sheaf-type');
    refs.sheafName = $('sheaf-name');
    refs.sheafEditorTitle = $('sheaf-editor-title');
    refs.sheafEditor = $('sheaf-editor');
    refs.sheafBaseRow = $('sheaf-base-row');
    refs.sheafBaseVariety = $('sheaf-base-variety');
    refs.sheafBaseButton = $('sheaf-base-button');
    refs.sheafBinaryFormulaRow = $('sheaf-binary-formula-row');
    refs.sheafBinaryLeftButton = $('sheaf-binary-left-button');
    refs.sheafBinarySymbol = $('sheaf-binary-symbol');
    refs.sheafBinaryRightButton = $('sheaf-binary-right-button');
    refs.sheafBinaryExactRow = $('sheaf-binary-exact-row');
    refs.sheafBinaryExact = $('sheaf-binary-exact');
    refs.sheafBinaryPickNote = $('sheaf-binary-pick-note');
    refs.sheafSelfSumFormulaRow = $('sheaf-self-sum-formula-row');
    refs.sheafSelfSumParentButton = $('sheaf-self-sum-parent-button');
    refs.sheafSelfSumCount = $('sheaf-self-sum-count');
    refs.sheafSelfSumPickNote = $('sheaf-self-sum-pick-note');
    refs.sheafIdealFormulaRow = $('sheaf-ideal-formula-row');
    refs.sheafIdealMapButton = $('sheaf-ideal-map-button');
    refs.sheafIdealConfirmRow = $('sheaf-ideal-confirm-row');
    refs.sheafIdealConfirm = $('sheaf-ideal-confirm');
    refs.sheafIdealPickNote = $('sheaf-ideal-pick-note');
    refs.sheafSchurFormulaRow = $('sheaf-schur-formula-row');
    refs.sheafSchurParentButton = $('sheaf-schur-parent-button');
    refs.sheafSchurDiagramPreview = $('sheaf-schur-diagram-preview');
    refs.sheafSchurPartitionRow = $('sheaf-schur-partition-row');
    refs.sheafSchurPartition = $('sheaf-schur-partition');
    refs.sheafSchurPickNote = $('sheaf-schur-pick-note');
    refs.sheafMapOperationRow = $('sheaf-map-operation-row');
    refs.sheafMapOperation = $('sheaf-map-operation');
    refs.sheafMapFormulaRow = $('sheaf-map-formula-row');
    refs.sheafMapPrefix = $('sheaf-map-prefix');
    refs.sheafMapMapButton = $('sheaf-map-map-button');
    refs.sheafMapScript = $('sheaf-map-script');
    refs.sheafMapSheafButton = $('sheaf-map-sheaf-button');
    refs.sheafMapExactRow = $('sheaf-map-exact-row');
    refs.sheafMapExact = $('sheaf-map-exact');
    refs.sheafMapProperRow = $('sheaf-map-proper-row');
    refs.sheafMapProper = $('sheaf-map-proper');
    refs.sheafMapPickNote = $('sheaf-map-pick-note');
    refs.mapEditor = $('map-editor');
    refs.mapEditorTitle = $('map-editor-title');
    refs.mapType = $('map-type');
    refs.mapAbelJacobiOption = $('map-abel-jacobi-option');
    refs.mapName = $('map-name');
    refs.mapEndpointsRow = $('map-endpoints-row');
    refs.mapAbelJacobiRow = $('map-abel-jacobi-row');
    refs.mapAbelJacobiCurveButton = $('map-abel-jacobi-curve-button');
    refs.mapCompositionRow = $('map-composition-row');
    refs.mapDomainButton = $('map-domain-button');
    refs.mapCodomainButton = $('map-codomain-button');
    refs.mapFirstButton = $('map-first-button');
    refs.mapSecondButton = $('map-second-button');
    refs.mapCurveRow = $('map-curve-row');
    refs.mapPointCount = $('map-point-count');
    refs.mapPointCountValue = $('map-point-count-value');
    refs.standardMapCurve = $('standard-map-curve');
    refs.mapLabelOffsetRow = $('map-label-offset-row');
    refs.mapLabelOffset = $('map-label-offset');
    refs.mapLabelOffsetValue = $('map-label-offset-value');
    refs.mapPickStatus = $('map-pick-status');
    refs.resetMapPick = $('reset-map-pick');
    refs.inputMode = $('input-mode');
    refs.inputPickMode = $('input-pick-mode');
    refs.importPresetToggle = $('import-preset-toggle');
    refs.importPresetPanel = $('import-preset-panel');
    refs.importPresetInput = $('import-preset-input');
    refs.importPresetApply = $('import-preset-apply');
    refs.importPresetCancel = $('import-preset-cancel');
    refs.importPresetMessage = $('import-preset-message');
    refs.addObjectKind = $('add-object-kind');
    refs.globalInvariantEditor = $('global-invariant-editor');
    refs.globalInvariantEditorTitle = $('global-invariant-editor-title');
    refs.globalInvariantName = $('global-invariant-name');
    refs.globalInvariantModeSymbolic = $('global-invariant-mode-symbolic');
    refs.globalInvariantModeInteger = $('global-invariant-mode-integer');
    refs.globalInvariantValueRow = $('global-invariant-value-row');
    refs.globalInvariantValue = $('global-invariant-value');
    refs.globalInvariantReplace = $('global-invariant-replace');
    refs.globalInvariantUsage = $('global-invariant-usage');
    refs.combinedEditor = $('combined-editor');
    refs.combinedType = $('combined-type');
    refs.sesParentsRow = $('ses-parents-row');
    refs.sesLeftButton = $('ses-left-button');
    refs.sesFirstMapButton = $('ses-first-map-button');
    refs.sesMiddleButton = $('ses-middle-button');
    refs.sesSecondMapButton = $('ses-second-map-button');
    refs.sesRightButton = $('ses-right-button');
    refs.sesPickNote = $('ses-pick-note');
    refs.sesTailRow = $('ses-tail-row');
    refs.sesTailPointCount = $('ses-tail-point-count');
    refs.sesTailPointCountValue = $('ses-tail-point-count-value');
    refs.blowupParentsRow = $('blowup-parents-row');
    refs.blowupBaseButton = $('blowup-base-button');
    refs.blowupPointButton = $('blowup-point-button');
    refs.blowupPickNote = $('blowup-pick-note');
    refs.tautologicalSesBaseRow = $('tautological-ses-base-row');
    refs.tautologicalSesBaseButton = $('tautological-ses-base-button');
    refs.tautologicalSesPickNote = $('tautological-ses-pick-note');
    refs.grassmannianMapParentRow = $('grassmannian-map-parent-row');
    refs.grassmannianMapBundleButton = $('grassmannian-map-bundle-button');
    refs.grassmannianMapTargetPreview = $('grassmannian-map-target-preview');
    refs.grassmannianMapParamsRow = $('grassmannian-map-params-row');
    refs.grassmannianMapR = $('grassmannian-map-r');
    refs.grassmannianMapN = $('grassmannian-map-n');
    refs.grassmannianMapPickNote = $('grassmannian-map-pick-note');
    refs.inputOptions = $('input-options');
    refs.modifyWarning = $('modify-warning');
    refs.inputRevealActions = $('input-reveal-actions');
    refs.toggleHodgeCard = $('toggle-hodge-card');
    refs.toggleClassCard = $('toggle-class-card');
    refs.toggleCohomologyCard = $('toggle-cohomology-card');
    refs.repeatNames = $('repeat-names');
    refs.repeatStyle = $('repeat-style');
    refs.addObject = $('add-object');
    refs.deleteObject = $('delete-object');
    refs.twistOption = $('sheaf-twist-option');
    refs.universalBundleOption = $('sheaf-universal-bundle-option');
    refs.twistRow = $('twist-row');
    refs.twist = $('twist-r');
    refs.basisRow = $('basis-row');
    refs.basis = $('abstract-basis');
    refs.rootFormRow = $('root-form-row');
    refs.rootForm = $('root-form');
    refs.classTermRow = $('class-term-row');
    refs.classTermOnly = $('class-term-only');
    refs.classTermIndex = $('class-term-index');
    refs.rankRow = $('rank-row');
    refs.rank = $('rank-symbol');
    refs.canvas = $('sheaf-canvas');
    refs.canvasLabels = $('sheaf-canvas-labels');
    refs.clearCanvas = $('clear-canvas');
    refs.showCanvas = $('show-canvas');
    refs.objectBadge = $('object-badge');
    refs.status = $('sheaf-status');
    refs.ringSummary = $('ring-summary');
    refs.classCard = $('class-card');
    refs.classActions = $('class-actions');
    refs.classChart = $('class-chart');
    refs.classMessage = $('class-message');
    refs.furtherSimplify = $('further-simplify');
    refs.exportClasses = $('export-classes');
    refs.cohomologyCard = $('cohomology-card');
    refs.cohomologyActions = $('cohomology-actions');
    refs.cohomologyDimOnly = $('cohomology-dim-only');
    refs.cohomologyChart = $('cohomology-chart');
    refs.cohomologyMessage = $('cohomology-message');
    refs.homologyCard = $('homology-card');
    refs.homologyActive = $('homology-active');
    refs.homologyMapTools = $('homology-map-tools');
    refs.homologyMapInputMode = $('homology-map-input-mode');
    refs.homologyTransposeExpressions = $('homology-transpose-expressions');
    refs.homologyUpdateAll = $('homology-update-all');
    refs.homologyAssignmentForm = $('homology-assignment-form');
    refs.homologyAssignmentLhs = $('homology-assignment-lhs');
    refs.homologyAssignmentRhs = $('homology-assignment-rhs');
    refs.homologyAssignmentCoefficients = $('homology-assignment-coefficients');
    refs.homologyAssignmentSave = $('homology-assignment-save');
    refs.homologyAssignmentCancel = $('homology-assignment-cancel');
    refs.homologyExpressionPanel = $('homology-expression-panel');
    refs.homologyExpressionChart = $('homology-expression-chart');
    refs.homologyGrassmannianBasisRow = $('homology-grassmannian-basis-row');
    refs.homologyGrassmannianYoungBasis = $('homology-grassmannian-young-basis');
    refs.homologyHyperplaneRow = $('homology-hyperplane-row');
    refs.homologyHyperplaneSymbol = $('homology-hyperplane-symbol');
    refs.homologyPointRow = $('homology-point-row');
    refs.homologyPointSymbol = $('homology-point-symbol');
    refs.homologySymbols = $('homology-symbols');
    refs.homologyRules = $('homology-rules');
    refs.homologyAddClass = $('homology-add-class');
    refs.homologyClassSymbol = $('homology-class-symbol');
    refs.homologyClassDegree = $('homology-class-degree');
    refs.homologyAddClassButton = $('homology-add-class-button');
    refs.homologyAddRule = $('homology-add-rule');
    refs.homologyRuleEquation = $('homology-rule-equation');
    refs.homologyAddRuleButton = $('homology-add-rule-button');
    refs.homologyMessage = $('homology-message');
    refs.hodgeCard = $('hodge-card');
    refs.hodgeSideAnchor = $('hodge-side-anchor');
    refs.hodgeWideHost = $('hodge-wide-host');
    refs.toggleHodgeWide = $('toggle-hodge-wide');
    refs.hodgeExpanded = $('hodge-expanded');
    refs.hodgeCellSize = $('hodge-cell-size');
    refs.hodgeCellSizeValue = $('hodge-cell-size-value');
    refs.hodgeActions = $('hodge-actions');
    refs.hodgeChart = $('hodge-chart');
    refs.hodgeMessage = $('hodge-message');
    refs.exportHodge = $('export-hodge');
    refs.exportCard = $('export-card');
    refs.exportFormat = $('export-format');
    refs.refreshExport = $('refresh-export');
    refs.copyExport = $('copy-export');
    refs.exportOut = $('export-out');
  }

  function $(id) {
    return document.getElementById(id);
  }

  function initializeInputObjects() {
    const defaultVariety = createDefaultVariety();
    positionVarietyOnCanvas(defaultVariety);
    const defaultSheaf = createDefaultSheaf(defaultVariety);
    positionSheafNearBase(defaultSheaf, defaultVariety);
    state.varieties = [defaultVariety];
    state.sheaves = [defaultSheaf];
    state.maps = [];
    state.sequences = [];
    state.globalInvariants = [];
    state.activeGlobalInvariantId = null;
    state.activeVarietyId = defaultVariety.id;
    state.activeSheafId = defaultSheaf.id;
    state.activeMapId = null;
    state.activeSequenceId = null;
    state.inputMode = 'modify';
  }

  function createDefaultVariety() {
    return {
      id: nextInputId('X'),
      type: 'abstract',
      dim: '3',
      name: 'X',
      genus: 'g',
      grassmannianR: '2',
      grassmannianN: '4',
      grassmannianYoungBasis: false,
      ciDegrees: '',
      nameDirty: false
    };
  }

  function createDefaultSheaf(baseVariety = null) {
    return {
      id: nextInputId('E'),
      type: 'abstract',
      name: '\\mathcal{E}',
      twist: '1',
      rank: 'r',
      baseVarietyId: baseVariety?.id || null,
      basis: 'chern',
      nameDirty: false
    };
  }

  function createDefaultMap(domain, codomain, options = {}) {
    const from = normalizeMapEndpoint(domain, 'domain');
    const to = normalizeMapEndpoint(codomain, 'codomain');
    return {
      id: nextInputId('M'),
      name: sanitizeMathLabel(options.name, readMapDraftName()),
      domainKind: from.kind,
      domainId: from.id,
      codomainKind: to.kind,
      codomainId: to.id,
      construction: options.construction || null,
      curve: options.curve ? normalizeMapCurve(options.curve) : null
    };
  }

  function createDefaultSequence(options = {}) {
    return {
      id: options.id || nextInputId('S'),
      type: options.type || 'short-exact-sequence',
      sheafIds: Array.isArray(options.sheafIds) ? options.sheafIds.slice(0, 3) : [],
      mapIds: Array.isArray(options.mapIds) ? options.mapIds.slice(0, 2) : [],
      baseVarietyId: options.baseVarietyId || null,
      tail: normalizeSequenceTailCurve(options.tail)
    };
  }

  function createDefaultGlobalInvariant(options = {}) {
    const name = sanitizeGlobalInvariantName(options.name, nextGlobalInvariantName());
    const value = sanitizeIntegerString(options.value, '0');
    return {
      id: options.id || nextInputId('N'),
      type: 'rational-number',
      name,
      value,
      hasValue: !!options.hasValue,
      replaceWithValue: !!options.replaceWithValue
    };
  }

  function normalizeMapEndpoint(endpoint, role) {
    return {
      kind: endpoint?.kind || endpoint?.[`${role}Kind`] || null,
      id: endpoint?.id || endpoint?.[`${role}Id`] || null
    };
  }

  function createVarietyFromDraft() {
    const variety = {
      id: nextInputId('X'),
      ...readVarietyDraft()
    };
    if (variety.type === 'grassmannian') variety.grassmannianYoungBasis = false;
    variety.name = uniqueObjectName('variety', variety.name);
    refs.varietyName.value = variety.name;
    variety.nameDirty = variety.nameDirty || variety.name !== defaultVarietyNameLatex();
    geometryFromVariety(variety);
    positionVarietyOnCanvas(variety);
    avoidCanvasLabelOverlap(variety);
    return variety;
  }

  function createSheafFromDraft(baseVariety = draftBaseVariety()) {
    if (!baseVariety) return null;
    if (!state.draftSheafNameDirty) refs.sheafName.value = defaultSheafNameLatex(baseVariety);
    const sheaf = {
      id: nextInputId('E'),
      ...readSheafDraft(baseVariety)
    };
    sheaf.name = uniqueObjectName('sheaf', sheaf.name);
    refs.sheafName.value = sheaf.name;
    sheaf.nameDirty = sheaf.nameDirty || sheaf.name !== defaultSheafNameLatex(baseVariety);
    positionSheafNearBase(sheaf, baseVariety);
    avoidCanvasLabelOverlap(sheaf);
    sheafFromObject(sheaf, baseVariety ? geometryFromVariety(baseVariety) : null);
    return sheaf;
  }

  function addSheafFromDraft(baseVariety = draftBaseVariety()) {
    if (sheafBinaryInputMode() && inputIsCreateMode()) {
      return addBinarySheafFromDraft();
    }
    if (sheafSelfSumInputMode() && inputIsCreateMode()) {
      return addSelfSumSheafFromDraft();
    }
    if (sheafIdealInputMode() && inputIsCreateMode()) {
      return addIdealSheafFromDraft();
    }
    if (sheafSchurInputMode() && inputIsCreateMode()) {
      return addSchurSheafFromDraft();
    }
    if (refs.sheafType?.value === 'map-operation' && inputIsCreateMode()) {
      return addMapOperationSheafFromDraft();
    }
    const sheaf = createSheafFromDraft(baseVariety);
    if (!sheaf) return null;
    addSheafObject(sheaf);
    prepareNextDraftName('sheaf', sheaf.name);
    return sheaf;
  }

  function addBinarySheafFromDraft() {
    const data = binarySheafConstructionData();
    if (!data) return null;
    const sheaf = createBinarySheafConstruction(data);
    if (!sheaf) return null;
    clearSheafBinaryDraft();
    state.draftSheafNameDirty = false;
    refs.sheafName.value = defaultCreateSheafNameLatex();
    return sheaf;
  }

  function addSelfSumSheafFromDraft() {
    const data = selfSumSheafConstructionData();
    if (!data) return null;
    const sheaf = createSelfSumSheafConstruction(data);
    if (!sheaf) return null;
    clearSheafSelfSumDraft();
    state.draftSheafNameDirty = false;
    refs.sheafName.value = defaultCreateSheafNameLatex();
    return sheaf;
  }

  function addIdealSheafFromDraft() {
    const data = idealSheafConstructionData();
    if (!data) return null;
    const sheaf = createIdealSheafConstruction(data);
    if (!sheaf) return null;
    clearSheafIdealDraft();
    state.draftSheafNameDirty = false;
    refs.sheafName.value = defaultCreateSheafNameLatex();
    return sheaf;
  }

  function addSheafObject(sheaf, options = {}) {
    if (!sheaf) return null;
    if (state.sheaves.some((item) => item.id === sheaf.id)) return sheaf;
    state.sheaves.push(sheaf);
    if (options.activate !== false) {
      state.activeSequenceId = null;
      state.activeSheafId = sheaf.id;
      state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
      state.activeMapId = null;
    }
    return sheaf;
  }

  function addSchurSheafFromDraft() {
    const data = schurSheafConstructionData();
    if (!data) return null;
    const sheaf = createSchurSheafConstruction(data);
    if (!sheaf) return null;
    clearSheafSchurDraft();
    state.draftSheafNameDirty = false;
    refs.sheafName.value = defaultCreateSheafNameLatex();
    return sheaf;
  }

  function updateBinarySheafFromDraft(sheaf) {
    const data = binarySheafConstructionData();
    if (!sheaf || !data) return null;
    const oldBaseId = sheaf.baseVarietyId;
    const isTensor = data.operation === 'tensor-sheaf';
    sheaf.type = 'abstract';
    sheaf.name = data.name;
    sheaf.twist = '1';
    sheaf.rank = constructionRankPlaceholder(data.operation, data.left, data.right);
    sheaf.baseVarietyId = data.baseVarietyId;
    sheaf.basis = 'chern';
    sheaf.nameDirty = data.nameDirty;
    sheaf.construction = {
      type: isTensor ? 'tensor' : 'direct-sum',
      sheafIds: [data.left.id, data.right.id],
      derived: isTensor ? !!data.derived : false,
      exact: isTensor ? !!data.exact : true,
      defaultName: data.defaultName
    };
    const baseVariety = baseVarietyForSheaf(sheaf);
    if (oldBaseId !== sheaf.baseVarietyId) {
      positionSheafNearBase(sheaf, baseVariety);
      avoidCanvasLabelOverlap(sheaf);
    }
    if (baseVariety) sheafFromObject(sheaf, geometryFromVariety(baseVariety));
    state.activeSequenceId = null;
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
    state.activeMapId = null;
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    syncObjectLineage(sheaf, 'sheaf');
    refreshConstructedObjects();
    return sheaf;
  }

  function updateSelfSumSheafFromDraft(sheaf) {
    const data = selfSumSheafConstructionData();
    if (!sheaf || !data) return null;
    const oldBaseId = sheaf.baseVarietyId;
    sheaf.type = 'abstract';
    sheaf.name = data.name;
    sheaf.twist = '1';
    sheaf.rank = selfSumRankPlaceholder(data.parent, data.multiplicity);
    sheaf.baseVarietyId = data.baseVarietyId;
    sheaf.basis = 'chern';
    sheaf.nameDirty = data.nameDirty;
    sheaf.construction = {
      type: 'self-direct-sum',
      sheafId: data.parent.id,
      multiplicity: data.multiplicity,
      defaultName: data.defaultName
    };
    const baseVariety = baseVarietyForSheaf(sheaf);
    if (oldBaseId !== sheaf.baseVarietyId) {
      positionSheafNearBase(sheaf, baseVariety);
      avoidCanvasLabelOverlap(sheaf);
    }
    if (baseVariety) sheafFromObject(sheaf, geometryFromVariety(baseVariety));
    state.activeSequenceId = null;
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
    state.activeMapId = null;
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    syncObjectLineage(sheaf, 'sheaf');
    refreshConstructedObjects();
    return sheaf;
  }

  function updateIdealSheafFromDraft(sheaf) {
    const data = idealSheafConstructionData();
    if (!sheaf || !data) return null;
    const ideal = createIdealSheafConstruction(data, { replaceSheaf: sheaf });
    if (!ideal) return null;
    refs.basis.value = normalizeBasisValue(ideal.basis);
    return ideal;
  }

  function updateSchurSheafFromDraft(sheaf) {
    const data = schurSheafConstructionData();
    if (!sheaf || !data) return null;
    const oldBaseId = sheaf.baseVarietyId;
    sheaf.type = 'abstract';
    sheaf.name = data.name;
    sheaf.twist = '1';
    sheaf.rank = schurRankPlaceholder(data.parent, data.partition);
    sheaf.baseVarietyId = data.parent.baseVarietyId;
    sheaf.basis = 'chern';
    sheaf.nameDirty = data.nameDirty;
    sheaf.construction = {
      type: 'schur',
      sheafId: data.parent.id,
      partition: data.partition,
      defaultName: data.defaultName
    };
    const baseVariety = baseVarietyForSheaf(sheaf);
    if (oldBaseId !== sheaf.baseVarietyId) {
      positionSheafNearBase(sheaf, baseVariety);
      avoidCanvasLabelOverlap(sheaf);
    }
    if (baseVariety) sheafFromObject(sheaf, geometryFromVariety(baseVariety));
    state.activeSequenceId = null;
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
    state.activeMapId = null;
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    syncObjectLineage(sheaf, 'sheaf');
    refreshConstructedObjects();
    return sheaf;
  }

  function addMapOperationSheafFromDraft() {
    const data = mapOperationSheafConstructionData();
    if (!data) return null;
    const sheaf = createMapSheafConstruction(data);
    if (!sheaf) return null;
    clearSheafMapDraft();
    state.draftSheafNameDirty = false;
    refs.sheafName.value = defaultCreateSheafNameLatex();
    return sheaf;
  }

  function updateMapOperationSheafFromDraft(sheaf) {
    const data = mapOperationSheafConstructionData();
    if (!sheaf || !data) return null;
    const isPullback = data.operation === 'pullback-sheaf';
    const oldBaseId = sheaf.baseVarietyId;
    sheaf.type = 'abstract';
    sheaf.name = data.name;
    sheaf.twist = '1';
    sheaf.rank = isPullback ? sanitizeRankInput(data.sheaf.rank) : 'r';
    sheaf.baseVarietyId = isPullback ? data.map.domainId : data.map.codomainId;
    sheaf.basis = normalizeBasisValue(data.sheaf.basis);
    sheaf.nameDirty = data.nameDirty;
    sheaf.construction = {
      type: isPullback ? 'pullback' : 'pushforward',
      mapId: data.map.id,
      sheafId: data.sheaf.id,
      derived: !!data.derived,
      exact: !!data.exact,
      proper: isPullback ? false : !!data.proper,
      defaultName: data.defaultName
    };
    const baseVariety = baseVarietyForSheaf(sheaf);
    if (oldBaseId !== sheaf.baseVarietyId) {
      positionSheafNearBase(sheaf, baseVariety);
      avoidCanvasLabelOverlap(sheaf);
    }
    if (baseVariety) sheafFromObject(sheaf, geometryFromVariety(baseVariety));
    state.activeSequenceId = null;
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
    state.activeMapId = null;
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    syncObjectLineage(sheaf, 'sheaf');
    refreshConstructedObjects();
    return sheaf;
  }

  function mapOperationSheafConstructionData() {
    const map = sheafMapDraftMap();
    const sourceSheaf = sheafMapDraftSheaf();
    const operationKind = sheafMapOperationFor(map);
    if (!map || !sourceSheaf || !operationKind) return null;
    if (!allowableSheafMapOperationSheaf(sourceSheaf.id)) return null;
    const operation = operationKind === 'pushforward' ? 'pushforward-sheaf' : 'pullback-sheaf';
    const exact = !!refs.sheafMapExact?.checked;
    const proper = operationKind === 'pushforward' && !!refs.sheafMapProper?.checked;
    const defaultName = operationKind === 'pullback'
      ? defaultPullbackSheafNameFromObjects(map, sourceSheaf, { derived: !exact })
      : defaultPushforwardSheafNameFromObjects(map, sourceSheaf, { derived: !exact, proper });
    const name = state.draftSheafNameDirty
      ? sanitizeMathLabel(refs.sheafName.value, defaultName)
      : defaultName;
    return {
      operation,
      map,
      sheaf: sourceSheaf,
      exact,
      derived: !exact,
      proper,
      defaultName,
      name,
      nameDirty: state.draftSheafNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function schurSheafConstructionData() {
    if (refs.sheafType?.value !== 'schur') return null;
    const parent = sheafSchurDraftSheaf();
    const partition = currentSchurPartition();
    if (!parent || !partition || !allowableSheafSchurPick(parent.id)) return null;
    const defaultName = defaultSchurSheafNameFromObjects(parent, partition);
    const name = state.draftSheafNameDirty
      ? sanitizeMathLabel(refs.sheafName.value, defaultName)
      : defaultName;
    return {
      parent,
      partition,
      baseVarietyId: parent.baseVarietyId,
      defaultName,
      name,
      nameDirty: state.draftSheafNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function selfSumSheafConstructionData() {
    if (refs.sheafType?.value !== 'self-direct-sum') return null;
    const parent = sheafSelfSumDraftSheaf();
    const multiplicity = currentSelfSumMultiplicity();
    if (!parent || !allowableSheafSelfSumPick(parent.id)) return null;
    const defaultName = defaultSelfSumSheafNameFromObjects(parent, multiplicity);
    const name = state.draftSheafNameDirty
      ? sanitizeMathLabel(refs.sheafName.value, defaultName)
      : defaultName;
    return {
      parent,
      multiplicity,
      baseVarietyId: parent.baseVarietyId,
      defaultName,
      name,
      nameDirty: state.draftSheafNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function idealSheafConstructionData() {
    if (refs.sheafType?.value !== 'ideal-sheaf') return null;
    const map = sheafIdealDraftMap();
    if (!map || !allowableSheafIdealMapPick(map.id) || !refs.sheafIdealConfirm?.checked) return null;
    const domain = state.varieties.find((variety) => variety.id === map.domainId);
    const codomain = state.varieties.find((variety) => variety.id === map.codomainId);
    if (!domain || !codomain) return null;
    const defaultName = defaultIdealSheafNameFromObjects(map);
    const name = state.draftSheafNameDirty
      ? sanitizeMathLabel(refs.sheafName.value, defaultName)
      : defaultName;
    return {
      map,
      domain,
      codomain,
      baseVarietyId: codomain.id,
      defaultName,
      name,
      nameDirty: state.draftSheafNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function binarySheafConstructionData() {
    const operation = refs.sheafType?.value === 'tensor' ? 'tensor-sheaf' : refs.sheafType?.value === 'direct-sum' ? 'direct-sum-sheaf' : null;
    if (!operation) return null;
    const left = sheafBinaryDraftSheaf('left');
    const right = sheafBinaryDraftSheaf('right');
    if (!left || !right || !left.baseVarietyId || left.baseVarietyId !== right.baseVarietyId) return null;
    const exact = operation === 'tensor-sheaf' && !!refs.sheafBinaryExact?.checked;
    const operationLatex = operation === 'direct-sum-sheaf' ? '\\oplus' : tensorOperationLatex(!exact);
    const defaultName = defaultBinarySheafNameFromObjects(left, right, operationLatex);
    const name = state.draftSheafNameDirty
      ? sanitizeMathLabel(refs.sheafName.value, defaultName)
      : defaultName;
    return {
      operation,
      left,
      right,
      exact,
      derived: operation === 'tensor-sheaf' && !exact,
      baseVarietyId: left.baseVarietyId,
      defaultName,
      name,
      nameDirty: state.draftSheafNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function readVarietyDraft() {
    if (refs.varietyType.value === 'product' && inputIsModifyMode()) {
      const active = activeVariety();
      if (active?.construction?.type === 'product') return {
        type: 'abstract',
        dim: String(Math.min(productDimensionFromSlots(), MAX_DIMENSION) || active.dim || refs.dim.value),
        name: sanitizeMathLabel(refs.varietyName.value, active.name || 'X'),
        genus: active.genus || 'g',
        ciDegrees: active.ciDegrees || '',
        nameDirty: state.draftVarietyNameDirty || active.nameDirty
      };
      refs.varietyType.value = 'abstract';
    }
    const active = inputIsModifyMode() ? activeVariety() : null;
    const defaultName = defaultVarietyNameLatex();
    const name = sanitizeMathLabel(refs.varietyName.value, defaultName);
    const grassmannian = syncGrassmannianControls();
    if (refs.varietyType.value === 'grassmannian' && grassmannian.dim > MAX_DIMENSION) {
      throw new Error(`Grassmannian dimension ${grassmannian.dim} exceeds the calculator limit ${MAX_DIMENSION}.`);
    }
    return {
      type: refs.varietyType.value,
      dim: normalizedDraftDimension(),
      name,
      genus: sanitizeGenusInput(refs.curveGenus.value),
      grassmannianR: String(grassmannian.r),
      grassmannianN: String(grassmannian.n),
      grassmannianYoungBasis: refs.varietyType.value === 'grassmannian' && active?.grassmannianYoungBasis === true,
      ciAmbient: derivedCompleteIntersectionAmbient(),
      ciDegrees: normalizedCompleteIntersectionDegreesText(),
      nameDirty: state.draftVarietyNameDirty || name !== defaultName
    };
  }

  function readSheafDraft(baseVariety = draftBaseVariety()) {
    const defaultName = defaultSheafNameLatex(baseVariety);
    const name = sanitizeMathLabel(refs.sheafName.value, defaultName);
    const type = canonicalSheafType(refs.sheafType.value);
    return {
      type,
      name,
      twist: refs.twist.value,
      rank: type === 'structure' ? '1' : refs.rank.value,
      baseVarietyId: baseVariety?.id || null,
      basis: normalizeBasisValue(refs.basis.value),
      nameDirty: state.draftSheafNameDirty || name !== defaultName
    };
  }

  function readMapDraftName() {
    const fallback = inputIsModifyMode() ? (activeMap()?.name || defaultMapNameLatex()) : defaultCreateMapNameLatex();
    return sanitizeMathLabel(refs.mapName?.value, fallback);
  }

  function uniqueObjectName(kind, proposedName, excludeId = null) {
    if (!refs.repeatNames?.checked) return proposedName;
    const items = objectCollectionForNameKind(kind);
    const used = new Set(items
      .filter((item) => item.id !== excludeId)
      .map((item) => canonicalMathLabel(item.name)));
    const sequence = repetitionNameSequence(kind, proposedName);
    const sequenceKeys = new Set(sequence.map(canonicalMathLabel));
    const proposedKey = canonicalMathLabel(proposedName);
    if (!sequenceKeys.has(proposedKey)) return proposedName;
    if (!used.has(proposedKey)) return proposedName;
    for (const candidate of sequence) {
      if (!used.has(canonicalMathLabel(candidate))) return candidate;
    }
    return proposedName;
  }

  function objectCollectionForNameKind(kind) {
    if (kind === 'number') return state.globalInvariants || [];
    if (kind === 'map') return state.maps;
    return kind === 'sheaf' ? state.sheaves : state.varieties;
  }

  function nameBelongsToRepetitionModel(kind, name) {
    const sequence = repetitionNameSequence(kind, name);
    const key = canonicalMathLabel(name);
    return sequence.some((candidate) => canonicalMathLabel(candidate) === key);
  }

  function repetitionNameSequence(kind, proposedName) {
    const pointNames = pointVarietyNameSequence(kind, proposedName);
    if (pointNames) return pointNames;
    if (kind === 'number') return ['a', 'b', 'c', 'd', 'e', 'm', 'n', 'r', 's', 't'];
    const style = refs.repeatStyle?.value || 'letters';
    if (style === 'letters') {
      if (kind === 'map') return MAP_LETTER_NAMES;
      return kind === 'sheaf' ? SHEAF_LETTER_NAMES : VARIETY_LETTER_NAMES;
    }
    const base = repetitionBaseName(kind, proposedName);
    if (style === 'prime') {
      return Array.from({ length: 24 }, (_, index) => `${base}${"'".repeat(index)}`);
    }
    if (style === 'paren') {
      return Array.from({ length: 25 }, (_, index) => (index === 0 ? base : `${base}^{(${index})}`));
    }
    if (style === 'subscript') {
      return Array.from({ length: 25 }, (_, index) => {
        if (index === 0) return base;
        if (kind === 'map' && index < 10) return `${base}_${index}`;
        return `${base}_{${index}}`;
      });
    }
    return [base];
  }

  function pointVarietyNameSequence(kind, proposedName) {
    if (kind !== 'variety') return null;
    const keys = new Set(POINT_VARIETY_NAMES.map(canonicalMathLabel));
    if (refs.varietyType?.value === 'point' || keys.has(canonicalMathLabel(proposedName))) {
      return POINT_VARIETY_NAMES;
    }
    return null;
  }

  function repetitionBaseName(kind, proposedName) {
    const fallback = kind === 'map'
      ? 'f'
      : (kind === 'sheaf' ? '\\mathcal{E}' : defaultVarietyFallbackName());
    const name = sanitizeMathLabel(proposedName, fallback);
    if (refs.repeatStyle?.value === 'letters') return name;
    if (kind === 'sheaf') {
      const match = name.match(/^\\mathcal\{([A-Z])\}(?:'*)?(?:\^\{\(\d+\)\}|_\{?\d+\}?)?$/);
      return match ? `\\mathcal{${match[1]}}` : name;
    }
    const match = name.match(/^([A-Za-z])(?:'*)?(?:\^\{\(\d+\)\}|_\{?\d+\}?)?$/);
    return match ? match[1] : name;
  }

  function defaultVarietyFallbackName() {
    if (refs.varietyType?.value === 'curve') return curveDefaultName(refs.curveGenus?.value);
    if (refs.varietyType?.value === 'point') return POINT_VARIETY_NAMES[0];
    if (refs.varietyType?.value === 'abelian') return 'A';
    return 'X';
  }

  function canonicalMathLabel(value) {
    return String(value || '')
      .replace(/\s+/g, '')
      .replace(/_\{(\d+)\}/g, '_$1');
  }

  function normalizeGlobalInvariantNameInput(value) {
    return String(value || '').trim().replace(/\s+/g, '');
  }

  function globalInvariantNameIsValid(value) {
    return /^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(normalizeGlobalInvariantNameInput(value));
  }

  function globalInvariantNameWarning() {
    return 'Name must start with a letter, be at most 16 characters, and contain only letters, digits, or _. Examples: r, g, f_1.';
  }

  function sanitizeGlobalInvariantName(value, fallback = 'a') {
    const raw = normalizeGlobalInvariantNameInput(value);
    const fallbackText = String(fallback ?? 'a').trim();
    if (!raw && fallbackText === '') return '';
    const safeFallback = fallbackText || 'a';
    if (globalInvariantNameIsValid(raw)) return raw;
    if (fallbackText === '') return '';
    const normalizedFallback = normalizeGlobalInvariantNameInput(safeFallback);
    return globalInvariantNameIsValid(normalizedFallback) ? normalizedFallback : 'a';
  }

  function sanitizeIntegerString(value, fallback = '0') {
    const raw = String(value ?? '').trim();
    return /^-?\d+$/.test(raw) ? raw : fallback;
  }

  function globalInvariantKey(name) {
    return sanitizeGlobalInvariantName(name).toLowerCase();
  }

  function nextGlobalInvariantName() {
    const used = new Set((state.globalInvariants || []).map((item) => globalInvariantKey(item.name)));
    return ['a', 'b', 'c', 'd', 'e', 'm', 'n', 'r', 's', 't'].find((name) => !used.has(globalInvariantKey(name))) || `a_${(state.globalInvariants || []).length + 1}`;
  }

  function uniqueGlobalInvariantName(name, excludeId = null) {
    const base = sanitizeGlobalInvariantName(name, nextGlobalInvariantName());
    const used = new Set((state.globalInvariants || [])
      .filter((item) => item.id !== excludeId)
      .map((item) => globalInvariantKey(item.name)));
    if (!used.has(globalInvariantKey(base))) return base;
    for (let index = 1; index < 999; index += 1) {
      const suffix = `_${index}`;
      const candidate = `${base.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`;
      if (!used.has(globalInvariantKey(candidate))) return candidate;
    }
    return base;
  }

  function ensureGlobalInvariantForSymbol(name, source = {}) {
    const symbol = sanitizeGlobalInvariantName(name, '');
    if (!symbol || /^-?\d+$/.test(symbol)) return null;
    const key = globalInvariantKey(symbol);
    let invariant = (state.globalInvariants || []).find((item) => globalInvariantKey(item.name) === key);
    if (!invariant) {
      invariant = createDefaultGlobalInvariant({
        id: `auto-${key}`,
        name: symbol,
        hasValue: false,
        value: '0',
        replaceWithValue: false
      });
      invariant.auto = true;
      state.globalInvariants.push(invariant);
    }
    if (source.kind && source.id && source.field) {
      invariant.sources = mergeGlobalInvariantSources(invariant.sources, [source]);
    }
    return invariant;
  }

  function mergeGlobalInvariantSources(existing = [], additions = []) {
    const byKey = new Map();
    [...(existing || []), ...(additions || [])].forEach((source) => {
      if (!source?.kind || !source.id || !source.field) return;
      byKey.set(`${source.kind}:${source.id}:${source.field}`, {
        kind: source.kind,
        id: source.id,
        field: source.field
      });
    });
    return Array.from(byKey.values());
  }

  function registerGlobalInvariantVariable(name, source = null) {
    const invariant = ensureGlobalInvariantForSymbol(name, source || {});
    if (!invariant) return null;
    const id = globalInvariantVariableId(invariant);
    const latex = symbolToLatex(invariant.name);
    defineVariable(id, 0, latex, { kind: 'globalInvariant', globalInvariantId: invariant.id });
    return { invariant, id };
  }

  function globalInvariantVariableId(invariantOrName) {
    const name = typeof invariantOrName === 'string' ? invariantOrName : invariantOrName?.name;
    return `global_${variableIdSafe(globalInvariantKey(name || 'a'))}`;
  }

  function globalInvariantValue(invariant) {
    if (!invariant?.hasValue || !invariant.replaceWithValue) return null;
    return sanitizeIntegerString(invariant.value, '0');
  }

  function globalInvariantLatex(invariant) {
    if (!invariant) return 'a';
    const value = globalInvariantValue(invariant);
    if (value != null) return value;
    return symbolToLatex(invariant.name);
  }

  function globalInvariantPlain(invariant) {
    if (!invariant) return 'a';
    const value = globalInvariantValue(invariant);
    if (value != null) return value;
    return invariant.hasValue ? sanitizeIntegerString(invariant.value, '0') : invariant.name;
  }

  function globalInvariantChipValue(invariant) {
    return invariant?.hasValue ? sanitizeIntegerString(invariant.value, '0') : '';
  }

  function scalarExpressionPoly(text, source = null) {
    const raw = String(text || '').replace(/\s+/g, '');
    if (!raw) return Poly.zero();
    if (!/^[A-Za-z0-9_+\-]+$/.test(raw)) return null;
    let normalized = raw.replace(/-/g, '+-');
    if (normalized.startsWith('+')) normalized = normalized.slice(1);
    const parts = normalized.split('+').filter((part) => part !== '');
    let out = Poly.zero();
    for (const part of parts) {
      const integer = part.match(/^-?\d+$/);
      if (integer) {
        out = out.add(Poly.constant(BigInt(integer[0])));
        continue;
      }
      const sign = part.startsWith('-') ? -1 : 1;
      const symbol = sign < 0 ? part.slice(1) : part;
      if (!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(symbol)) return null;
      const registered = registerGlobalInvariantVariable(symbol, source);
      if (!registered) return null;
      const value = globalInvariantValue(registered.invariant);
      const term = value == null ? Poly.variable(registered.id) : Poly.constant(BigInt(value));
      out = out.add(sign < 0 ? term.neg() : term);
    }
    return out;
  }

  function simplifyScalarExpressionPlain(text, source = null) {
    const poly = scalarExpressionPoly(text, source);
    return poly ? formatPolyPlain(poly) : sanitizeGlobalInvariantName(text, 'r');
  }

  function simplifyScalarExpressionLatex(text, source = null) {
    const poly = scalarExpressionPoly(text, source);
    return poly ? formatPolyLatex(poly) : symbolToLatex(sanitizeGlobalInvariantName(text, 'r'));
  }

  function scalarExpressionIntegerValue(text, source = null) {
    const poly = scalarExpressionPoly(text, source);
    if (!poly || poly.terms.size !== 1) return null;
    const coeff = poly.terms.get('');
    if (!coeff || coeff.den !== 1n) return null;
    const value = Number(coeff.num);
    return Number.isSafeInteger(value) ? value : null;
  }

  function globalInvariantReferences(invariant) {
    if (!invariant) return [];
    const key = globalInvariantKey(invariant.name);
    return scalarReferenceRecords().filter((record) => (
      record.symbols.some((symbol) => globalInvariantKey(symbol) === key)
    ));
  }

  function scalarReferenceRecords() {
    const records = [];
    state.varieties.forEach((variety) => {
      if ((variety.type || 'abstract') !== 'curve') return;
      addScalarReferenceRecord(records, variety, 'variety', 'genus', variety.genus);
    });
    state.sheaves.forEach((sheaf) => {
      addScalarReferenceRecord(records, sheaf, 'sheaf', 'rank', sheaf.rank);
    });
    return records;
  }

  function addScalarReferenceRecord(records, object, kind, field, value) {
    const symbols = scalarSymbolsInText(value);
    if (!symbols.length) return;
    records.push({ kind, id: object.id, field, object, symbols });
  }

  function scalarSymbolsInText(value) {
    const text = String(value || '');
    const matches = text.match(/[A-Za-z][A-Za-z0-9_]{0,15}/g) || [];
    return [...new Set(matches.filter((symbol) => !['mathcal', 'mathbb', 'operatorname', 'text'].includes(symbol)))];
  }

  function refreshGlobalInvariantReferences() {
    const records = scalarReferenceRecords();
    const used = new Set();
    records.forEach((record) => {
      record.symbols.forEach((symbol) => {
        const invariant = ensureGlobalInvariantForSymbol(symbol);
        if (!invariant) return;
        invariant.sources = mergeGlobalInvariantSources(invariant.sources, [record]);
        used.add(invariant.id);
      });
    });
    (state.globalInvariants || []).forEach((invariant) => {
      invariant.sources = globalInvariantReferences(invariant).map((record) => ({
        kind: record.kind,
        id: record.id,
        field: record.field
      }));
      if (invariant.auto && !used.has(invariant.id) && !invariant.hasValue) invariant.unused = true;
      else invariant.unused = false;
    });
    state.globalInvariants = (state.globalInvariants || []).filter((item) => !item.auto || !item.unused || item.id === state.activeGlobalInvariantId);
  }

  function formatGlobalInvariantReferences(invariant) {
    const refsForInvariant = globalInvariantReferences(invariant);
    if (!refsForInvariant.length) return 'No current object uses this symbol.';
    return `Used by ${refsForInvariant.map((record) => `${objectPlainLabel(record.kind, record.id)} ${record.field}`).join(', ')}.`;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function renameGlobalInvariantReferences(beforeName, nextName) {
    const before = sanitizeGlobalInvariantName(beforeName, '');
    const next = sanitizeGlobalInvariantName(nextName, before);
    if (!before || before === next) return;
    const replace = (value) => String(value || '').replace(new RegExp(`\\b${escapeRegExp(before)}\\b`, 'g'), next);
    state.varieties.forEach((variety) => {
      if ((variety.type || 'abstract') !== 'curve') return;
      if (scalarSymbolsInText(variety.genus).includes(before)) variety.genus = replace(variety.genus);
    });
    state.sheaves.forEach((sheaf) => {
      if (scalarSymbolsInText(sheaf.rank).includes(before)) sheaf.rank = replace(sheaf.rank);
    });
  }

  function curveDefaultName(genusValue) {
    return sanitizeGenusInput(genusValue) === '1' ? 'E' : 'C';
  }

  function sanitizeGenusInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'g';
    if (/^\d+$/.test(raw)) return raw;
    return sanitizeGlobalInvariantName(raw, 'g');
  }

  function completeIntersectionCurveGenus(geometry) {
    if (geometry?.type !== 'complete-intersection' || geometry.dim !== 1) return null;
    const ambient = Number(geometry.ambient);
    const degrees = Array.isArray(geometry.degrees) ? geometry.degrees : [];
    if (!Number.isInteger(ambient) || ambient < 1 || degrees.some((degree) => !Number.isInteger(degree) || degree <= 0)) return null;
    const degreeProduct = degrees.reduce((product, degree) => product * degree, 1);
    const canonicalDegree = (degrees.reduce((sum, degree) => sum + degree, 0) - ambient - 1) * degreeProduct;
    const numerator = canonicalDegree + 2;
    return numerator % 2 === 0 && numerator >= 0 ? numerator / 2 : null;
  }

  function numericalCurveGenus(geometry) {
    if (!geometry || geometry.dim !== 1) return null;
    if (geometry.type === 'curve') {
      const genus = sanitizeGenusInput(geometry.genus);
      if (/^\d+$/.test(genus)) return Number(genus);
      const scalarValue = scalarExpressionIntegerValue(genus, { kind: 'variety', id: geometry.varietyId || 'curve', field: 'genus' });
      return scalarValue != null ? scalarValue : null;
    }
    if (geometry.type === 'projective' && geometry.ambient === 1) return 0;
    if (geometry.type === 'complete-intersection') return completeIntersectionCurveGenus(geometry);
    return null;
  }

  function geometryHasNumericalCurveLabel(geometry) {
    return numericalCurveGenus(geometry) != null;
  }

  function sheafHasLocallyFreeLabel(sheaf) {
    if (!sheaf) return false;
    if (['locally-free', 'structure', 'tangent', 'cotangent', 'canonical', 'twist', 'universal-bundle', 'universal-line'].includes(sheaf.type)) return true;
    if (!sheaf.construction) return false;
    if (sheaf.construction.type === 'direct-sum' || sheaf.construction.type === 'tensor') {
      return (sheaf.construction.sheafIds || [])
        .map((id) => state.sheaves.find((item) => item.id === id))
        .every((item) => sheafHasLocallyFreeLabel(item));
    }
    if (sheaf.construction.type === 'self-direct-sum') {
      return sheafHasLocallyFreeLabel(state.sheaves.find((item) => item.id === sheaf.construction.sheafId));
    }
    if (sheaf.construction.type === 'schur') {
      return sheafHasLocallyFreeLabel(state.sheaves.find((item) => item.id === sheaf.construction.sheafId));
    }
    return sheaf.construction.type === 'pullback'
      && sheafHasLocallyFreeLabel(state.sheaves.find((item) => item.id === sheaf.construction.sheafId));
  }

  function varietyHasHyperplaneClass(type) {
    return type === 'projective' || type === 'complete-intersection';
  }

  function varietySupportsTwist(type) {
    return varietyHasHyperplaneClass(type) || type === 'grassmannian';
  }

  function varietySupportsUniversalBundle(type) {
    return varietyHasHyperplaneClass(type) || type === 'grassmannian';
  }

  function varietySupportsTautologicalSequence(type) {
    return varietyHasHyperplaneClass(type) || type === 'grassmannian';
  }

  function universalBundleRankPlain(geometry = null) {
    return geometry?.type === 'grassmannian' ? String(geometry.grassmannianR) : '1';
  }

  function isUniversalBundleSheafType(type) {
    return type === 'universal-bundle' || type === 'universal-line';
  }

  function canonicalSheafType(type) {
    if (type === 'universal-line') return 'universal-bundle';
    return type || 'abstract';
  }

  function sheafSupportsChernRoots(sheaf = activeSheaf()) {
    return !!sheaf && (sheaf.type === 'abstract' || sheaf.type === 'locally-free');
  }

  function normalizeBasisValue(value) {
    if (value === 'character') return 'character';
    if (value === 'roots') return 'roots';
    return 'chern';
  }

  function basisLabel(value) {
    const basis = normalizeBasisValue(value);
    if (basis === 'character') return 'Chern character';
    if (basis === 'roots') return 'Chern roots';
    return 'Chern classes';
  }

  function basisStatusLabel(value) {
    return basisLabel(value).toLowerCase();
  }

  function syncClassDisplayControls(result = state.lastResult) {
    const hasClasses = !!result?.classRows?.length || (!!activeSheaf() && !!activeVariety());
    const supportsRoots = sheafSupportsChernRoots(result?.sheaf || activeSheaf());
    syncBasisOptions(supportsRoots);
    const usingRoots = supportsRoots && refs.basis?.value === 'roots';
    if (refs.rootFormRow) refs.rootFormRow.hidden = !hasClasses || !usingRoots;
    const rankPlain = result?.bundle?.rankPlain || result?.sheaf?.rankPlain || activeSheaf()?.rank;
    const activeDim = Number.isInteger(result?.geometry?.dim) ? result.geometry.dim : null;
    const fallbackVariety = activeVariety();
    const classDim = activeDim == null
      ? (fallbackVariety ? normalizedInt(fallbackVariety.dim, 0, MAX_DIMENSION, MAX_DIMENSION) : MAX_DIMENSION)
      : activeDim;
    const expandedOption = refs.rootForm?.querySelector('option[value="expanded"]');
    const canExpandRoots = usingRoots && rootExpansionRankFromPlain(rankPlain, classDim) != null;
    if (expandedOption) expandedOption.disabled = !canExpandRoots;
    if (!canExpandRoots && refs.rootForm?.value === 'expanded') refs.rootForm.value = 'product';
    if (refs.classTermRow) refs.classTermRow.hidden = !hasClasses;
    const termOnly = !!refs.classTermOnly?.checked;
    if (refs.classTermIndex) refs.classTermIndex.disabled = !hasClasses || !termOnly;
    if (refs.classTermIndex) {
      refs.classTermIndex.max = String(Math.max(0, classDim));
    }
  }

  function syncBasisOptions(supportsRoots = sheafSupportsChernRoots()) {
    if (!refs.basis) return;
    const rootOption = refs.basis.querySelector('option[value="roots"]');
    if (rootOption) rootOption.hidden = !supportsRoots;
    if (!supportsRoots && refs.basis.value === 'roots') refs.basis.value = 'chern';
  }

  function genusLatex(value) {
    return simplifyScalarExpressionLatex(sanitizeGenusInput(value), { kind: 'variety', id: activeVariety()?.id || 'draft', field: 'genus' });
  }

  function genusPlain(value) {
    return simplifyScalarExpressionPlain(sanitizeGenusInput(value), { kind: 'variety', id: activeVariety()?.id || 'draft', field: 'genus' });
  }

  function nextInputId(prefix) {
    const id = `${prefix}${state.nextObjectId}`;
    state.nextObjectId += 1;
    return id;
  }

  function activeVariety() {
    return state.varieties.find((item) => item.id === state.activeVarietyId) || state.varieties[0] || null;
  }

  function activeSheaf() {
    return state.sheaves.find((item) => item.id === state.activeSheafId) || null;
  }

  function activeMap() {
    return state.maps.find((item) => item.id === state.activeMapId) || null;
  }

  function activeSequence() {
    return (state.sequences || []).find((item) => item.id === state.activeSequenceId) || null;
  }

  function activeGlobalInvariant() {
    return (state.globalInvariants || []).find((item) => item.id === state.activeGlobalInvariantId) || null;
  }

  function selectedVariety() {
    return state.varieties.find((item) => item.id === state.activeVarietyId) || null;
  }

  function selectedSheaf() {
    return state.sheaves.find((item) => item.id === state.activeSheafId) || null;
  }

  function selectedMap() {
    return state.maps.find((item) => item.id === state.activeMapId) || null;
  }

  function selectedSequence() {
    return activeSequence();
  }

  function selectedGlobalInvariant() {
    return activeGlobalInvariant();
  }

  function activeObjectForModifyMode() {
    if (state.activeGlobalInvariantId) return selectedGlobalInvariant();
    if (state.activeSequenceId) return selectedSequence();
    if (state.activeMapId) return selectedMap();
    if (state.activeSheafId) return selectedSheaf();
    if (state.activeVarietyId) return selectedVariety();
    return null;
  }

  function canvasHasObjects() {
    return state.varieties.length > 0
      || state.sheaves.length > 0
      || state.maps.length > 0
      || (state.sequences || []).length > 0
      || (state.globalInvariants || []).length > 0;
  }

  function syncInputAvailabilityControls() {
    const hasBaseVariety = state.varieties.length > 0;
    const hasCanvasObjects = canvasHasObjects();
    const hasAbelJacobiCurve = abelJacobiCurveVarieties().length > 0;
    const hasSheaf = state.sheaves.length > 0;
    ['sheaf', 'map', 'combined'].forEach((kind) => {
      const option = refs.addObjectKind?.querySelector?.(`option[value="${kind}"]`);
      if (option) option.disabled = !hasBaseVariety;
    });
    const numberOption = refs.addObjectKind?.querySelector?.('option[value="number"]');
    if (numberOption) numberOption.disabled = false;
    const abelJacobiTypeOption = refs.combinedType?.querySelector?.('option[value="abel-jacobi"]');
    if (abelJacobiTypeOption) abelJacobiTypeOption.disabled = !hasAbelJacobiCurve;
    const sesTypeOption = refs.combinedType?.querySelector?.('option[value="short-exact-sequence"]');
    if (sesTypeOption) sesTypeOption.disabled = !hasSheaf && !activeSesEditMode();
    const tautologicalSesTypeOption = refs.combinedType?.querySelector?.('option[value="grassmannian-tautological-ses"]');
    const hasTautologicalSesBase = state.varieties.some((variety) => varietySupportsTautologicalSequence(variety.type || 'abstract'));
    if (tautologicalSesTypeOption) tautologicalSesTypeOption.disabled = !hasTautologicalSesBase;
    if (combinedCreateMode() && refs.combinedType?.value === 'abel-jacobi' && !hasAbelJacobiCurve) {
      refs.combinedType.value = 'product';
    }
    if (combinedCreateMode() && refs.combinedType?.value === 'short-exact-sequence' && !hasSheaf) {
      refs.combinedType.value = 'product';
      clearSesDraft();
    }
    if (combinedCreateMode() && refs.combinedType?.value === 'grassmannian-tautological-ses' && !hasTautologicalSesBase) {
      refs.combinedType.value = 'product';
      clearTautologicalSesDraft();
    }
    if (refs.addObjectKind && !createKindIsAvailable(refs.addObjectKind.value)) {
      refs.addObjectKind.value = 'variety';
    }
    if (refs.combinedEditor) refs.combinedEditor.hidden = inputIsModifyMode() || !combinedCreateMode();
    updateCombinedDraftControls();
    const modifyOption = refs.inputMode?.querySelector?.('option[value="modify"]');
    if (modifyOption) modifyOption.disabled = !hasCanvasObjects;
    if (!hasCanvasObjects && state.inputMode === 'modify') {
      state.inputMode = 'create';
    }
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
  }

  function createKindIsAvailable(kind) {
    if (kind === 'number') return true;
    if (kind === 'sheaf' || kind === 'map' || kind === 'combined') return state.varieties.length > 0;
    return true;
  }

  function numericalCurveVarieties() {
    return state.varieties.filter((variety) => geometryHasNumericalCurveLabel(geometryFromVariety(variety)));
  }

  function abelJacobiCurveGenus(geometry) {
    const genus = numericalCurveGenus(geometry);
    return Number.isInteger(genus) && genus > 0 && genus < 10 ? genus : null;
  }

  function abelJacobiCurveVarieties() {
    return state.varieties.filter((variety) => abelJacobiCurveGenus(geometryFromVariety(variety)) != null);
  }

  function syncMapTypeOptions() {
    if (!refs.mapType) return;
    const canAbelJacobi = abelJacobiCurveVarieties().length > 0;
    const editingAbelJacobi = inputIsModifyMode() && selectedMap()?.construction?.type === 'abel-jacobi';
    const allowAbelJacobiOption = combinedAbelJacobiCreateMode() || editingAbelJacobi;
    const sheafMapOption = refs.mapType.querySelector?.('option[value="sheaf"]');
    if (sheafMapOption) sheafMapOption.disabled = !state.sheaves.length;
    if (!state.sheaves.length && refs.mapType.value === 'sheaf') refs.mapType.value = 'ordinary';
    if (refs.mapAbelJacobiOption) {
      refs.mapAbelJacobiOption.hidden = !allowAbelJacobiOption;
      refs.mapAbelJacobiOption.disabled = !allowAbelJacobiOption || !canAbelJacobi;
    }
    if ((!allowAbelJacobiOption || !canAbelJacobi) && refs.mapType.value === 'abel-jacobi' && !combinedAbelJacobiCreateMode()) refs.mapType.value = 'ordinary';
  }

  function modifyKind() {
    if (state.activeGlobalInvariantId) return 'number';
    if (state.activeSequenceId) return 'sequence';
    if (state.activeMapId) return 'map';
    return state.activeSheafId ? 'sheaf' : 'variety';
  }

  function defaultBaseVarietyId() {
    return state.varieties.find((item) => item.id === state.activeVarietyId)?.id
      || state.varieties[0]?.id
      || null;
  }

  function clearActiveGlobalInvariant() {
    state.activeGlobalInvariantId = null;
  }

  function draftBaseVariety() {
    const selectedId = [
      state.draftSheafBaseVarietyId,
      refs.sheafBaseVariety?.value,
      defaultBaseVarietyId()
    ].find((id) => state.varieties.some((item) => item.id === id));
    return state.varieties.find((item) => item.id === selectedId) || null;
  }

  function setDraftBaseVariety(varietyId) {
    if (!refs.sheafBaseVariety || !state.varieties.some((variety) => variety.id === varietyId)) return false;
    if (!Array.from(refs.sheafBaseVariety.options || []).some((option) => option.value === varietyId)) syncSheafBaseOptions(true);
    const pickTarget = state.sheafMapPickTarget;
    refs.sheafBaseVariety.value = varietyId;
    state.draftSheafBaseVarietyId = refs.sheafBaseVariety.value === varietyId ? varietyId : null;
    updateSheafBaseButton();
    clearSheafMapDraft();
    if (refs.sheafType?.value === 'map-operation' && inputIsCreateMode()) {
      state.sheafMapPickTarget = pickTarget === 'map' || pickTarget === 'sheaf' ? pickTarget : 'map';
      updateSheafMapDraftControls();
    }
    return refs.sheafBaseVariety.value === varietyId;
  }

  function baseVarietyForSheaf(sheaf) {
    if (!sheaf) return null;
    return state.varieties.find((item) => item.id === sheaf.baseVarietyId) || activeVariety() || state.varieties[0] || null;
  }

  function syncSheafBaseOptions(force = false) {
    if (!refs.sheafBaseVariety) return;
    if (!state.varieties.length) {
      refs.sheafBaseVariety.innerHTML = '';
      state.draftSheafBaseVarietyId = null;
      updateSheafBaseButton(null);
      return;
    }
    if (state.draftSheafBaseVarietyId && !state.varieties.some((item) => item.id === state.draftSheafBaseVarietyId)) {
      state.draftSheafBaseVarietyId = null;
    }
    const editingSheaf = inputIsModifyMode() && modifyKind() === 'sheaf' ? activeSheaf() : null;
    const fallback = editingSheaf?.baseVarietyId || defaultBaseVarietyId();
    const current = force ? fallback : (state.draftSheafBaseVarietyId || refs.sheafBaseVariety.value || fallback);
    refs.sheafBaseVariety.innerHTML = state.varieties.map((variety) => {
      const label = sanitizeMathLabel(variety.name, 'X');
      return `<option value="${escapeHtml(variety.id)}">${escapeHtml(latexToPlain(label))}</option>`;
    }).join('');
    const next = state.varieties.some((item) => item.id === current) ? current : fallback;
    if (next) refs.sheafBaseVariety.value = next;
    if (force && !refs.sheafBaseVariety.value) refs.sheafBaseVariety.value = next || '';
    updateSheafBaseButton(selectedSheafBaseForButton());
  }

  function selectedSheafBaseForButton() {
    const selectedId = state.draftSheafBaseVarietyId
      || (inputIsModifyMode() && modifyKind() === 'sheaf' ? activeSheaf()?.baseVarietyId : null);
    return state.varieties.find((item) => item.id === selectedId) || null;
  }

  function updateSheafBaseButton(variety = selectedSheafBaseForButton()) {
    if (!refs.sheafBaseButton) return;
    const label = variety ? latexToPlain(sanitizeMathLabel(variety.name, 'X')) : 'variety';
    refs.sheafBaseButton.textContent = label;
    refs.sheafBaseButton.title = variety ? `Replace ${label}` : 'Pick a base variety on the canvas';
    refs.sheafBaseButton.disabled = !state.varieties.length;
    refs.sheafBaseButton.setAttribute('aria-pressed', state.canvasPickEnabled && sheafBasePickInputMode() ? 'true' : 'false');
  }

  function positionSheafNearBase(sheaf, baseVariety) {
    if (!sheaf || !baseVariety) return;
    const baseX = Number.isFinite(baseVariety.labelX) ? baseVariety.labelX : DEFAULT_FIRST_VARIETY_X;
    const baseY = Number.isFinite(baseVariety.labelY) ? baseVariety.labelY : DEFAULT_FIRST_VARIETY_Y;
    sheaf.labelX = clamp(baseX + DEFAULT_FIRST_SHEAF_DX, 0.08, 0.94);
    sheaf.labelY = clamp(baseY + DEFAULT_FIRST_SHEAF_DY, 0.08, 0.92);
  }

  function positionVarietyOnCanvas(variety) {
    if (!variety) return;
    const spacing = canvasSpacingRatio('x');
    const index = state.varieties.length;
    variety.labelX = clamp(DEFAULT_FIRST_VARIETY_X + index * spacing, 0.08, 0.92);
    variety.labelY = DEFAULT_FIRST_VARIETY_Y;
  }

  function positionJacobianVarietyLabel(jacobian, curve) {
    if (!jacobian) return;
    if (!curve) {
      positionVarietyOnCanvas(jacobian);
      return;
    }
    const baseX = Number.isFinite(curve.labelX) ? curve.labelX : DEFAULT_FIRST_VARIETY_X;
    const baseY = Number.isFinite(curve.labelY) ? curve.labelY : DEFAULT_FIRST_VARIETY_Y;
    const spacing = Math.max(0.12, canvasSpacingRatio('x'));
    jacobian.labelX = clamp(baseX + spacing, 0.08, 0.94);
    jacobian.labelY = clamp(baseY, 0.08, 0.92);
  }

  function avoidCanvasLabelOverlap(object) {
    if (!object) return;
    const step = Math.max(0.075, canvasSpacingRatio('x') * 0.72);
    const rowStep = 0.045;
    const thresholdX = 0.055;
    const thresholdY = 0.055;
    const startX = Number.isFinite(object.labelX) ? object.labelX : 0.5;
    const startY = Number.isFinite(object.labelY) ? object.labelY : 0.5;
    const existing = [...state.varieties, ...state.sheaves];
    for (let row = 0; row < 6; row += 1) {
      const candidateY = clamp(startY + row * rowStep, 0.08, 0.92);
      for (let col = 0; col < 10; col += 1) {
        const candidateX = clamp(startX + col * step, 0.08, 0.94);
        const overlaps = existing.some((item) => (
          item.id !== object.id
          && Number.isFinite(item.labelX)
          && Number.isFinite(item.labelY)
          && Math.abs(item.labelX - candidateX) < thresholdX
          && Math.abs(item.labelY - candidateY) < thresholdY
        ));
        if (!overlaps) {
          object.labelX = candidateX;
          object.labelY = candidateY;
          return;
        }
      }
    }
  }

  function canvasSpacingRatio(axis = 'x') {
    const size = axis === 'y'
      ? (state.canvasHeight || refs.canvas?.clientHeight || 280)
      : (state.canvasWidth || refs.canvas?.clientWidth || 760);
    return clamp(DEFAULT_VARIETY_SPACING_PX / Math.max(1, size), axis === 'y' ? 0.05 : 0.07, axis === 'y' ? 0.3 : 0.32);
  }

  function syncInputEditorVisibility() {
    syncInputAvailabilityControls();
    const modifying = inputIsModifyMode();
    const hasModifyTarget = !!activeObjectForModifyMode();
    const showingNumber = modifying ? !!state.activeGlobalInvariantId : refs.addObjectKind?.value === 'number';
    const showingSequence = modifying && !!state.activeSequenceId;
    const showingMap = !showingNumber && (modifying ? !!state.activeMapId : refs.addObjectKind?.value === 'map');
    const showingCombinedAbelJacobi = !showingNumber && !modifying && combinedAbelJacobiCreateMode();
    const showingMapEditor = showingMap || showingCombinedAbelJacobi;
    const showingCombinedStructure = !showingNumber && (showingSequence || (!modifying && (combinedSesCreateMode() || combinedBlowupCreateMode() || combinedGrassmannianTautologicalSesCreateMode() || combinedGrassmannianMapCreateMode())));
    const showingSheaf = !showingNumber && !showingMapEditor && !showingCombinedStructure && (modifying ? !!state.activeSheafId : refs.addObjectKind?.value === 'sheaf');
    const waitingForSheafBase = inputIsCreateMode() && showingSheaf && !state.draftSheafBaseVarietyId;
    if (refs.addObjectKind) refs.addObjectKind.hidden = modifying;
    if (refs.combinedEditor) refs.combinedEditor.hidden = !showingSequence && (modifying || !combinedCreateMode());
    if (refs.inputOptions) refs.inputOptions.hidden = modifying;
    if (refs.modifyWarning) refs.modifyWarning.hidden = !modifying || hasModifyTarget;
    if (refs.globalInvariantEditor) refs.globalInvariantEditor.hidden = !showingNumber || (modifying && !hasModifyTarget);
    refs.varietyEditor.hidden = showingNumber || (modifying ? (showingSequence || showingSheaf || showingMapEditor || !hasModifyTarget) : (showingSheaf || showingMapEditor || showingCombinedStructure));
    refs.sheafEditor.hidden = showingNumber || (modifying ? (showingSequence || !showingSheaf || !hasModifyTarget) : !showingSheaf);
    if (refs.mapEditor) refs.mapEditor.hidden = showingNumber || (modifying ? (showingSequence || !showingMap || !hasModifyTarget) : !showingMapEditor);
    syncGlobalInvariantDraftControls();
    syncMapCurveControls(showingMapEditor && modifying ? selectedMap() : null);
    syncRepetitionStyleLabels();
    syncInputModeControls();
    updateInputEditorTitles();
    updateDeleteObjectButton();
    syncChartRevealControls(state.lastResult);
  }

  function chartRevealAvailability(result = state.lastResult) {
    const modifying = inputIsModifyMode();
    const kind = modifying ? modifyKind() : null;
    return {
      hodge: modifying && kind === 'variety' && !!result?.hodge,
      classes: modifying && kind === 'sheaf' && !!result && !!selectedSheaf(),
      cohomology: modifying && kind === 'sheaf' && !!result?.cohomology?.dimensions?.length
    };
  }

  function setChartCardVisible(scope, visible) {
    const card = scope === 'hodge'
      ? refs.hodgeCard
      : scope === 'classes'
        ? refs.classCard
        : refs.cohomologyCard;
    if (!card) return;
    if (scope === 'hodge' && !visible && state.hodgeWide) setHodgeWide(false);
    card.hidden = !visible;
    if (visible) card.classList.remove('collapsed');
  }

  function syncRevealButton(button, scope, available) {
    if (!button) return;
    button.hidden = !available;
    const revealed = !!state.revealedCharts[scope] && available;
    button.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    const label = scope === 'hodge'
      ? 'Hodge numbers'
      : scope === 'classes'
        ? 'characteristic classes'
        : 'sheaf cohomology';
    button.textContent = `${revealed ? 'hide' : 'show'} ${label}`;
  }

  function syncChartRevealControls(result = state.lastResult) {
    const available = chartRevealAvailability(result);
    Object.keys(available).forEach((scope) => {
      if (!available[scope]) state.revealedCharts[scope] = false;
    });
    setChartCardVisible('hodge', available.hodge && state.revealedCharts.hodge);
    setChartCardVisible('classes', available.classes && state.revealedCharts.classes);
    setChartCardVisible('cohomology', available.cohomology && state.revealedCharts.cohomology);
    syncRevealButton(refs.toggleHodgeCard, 'hodge', available.hodge);
    syncRevealButton(refs.toggleClassCard, 'classes', available.classes);
    syncRevealButton(refs.toggleCohomologyCard, 'cohomology', available.cohomology);
    if (refs.inputRevealActions) {
      refs.inputRevealActions.hidden = !available.hodge && !available.classes && !available.cohomology;
    }
  }

  function toggleChartReveal(scope) {
    if (!state.revealedCharts || !(scope in state.revealedCharts)) return;
    const available = chartRevealAvailability();
    if (!available[scope]) return;
    state.revealedCharts[scope] = !state.revealedCharts[scope];
    syncChartRevealControls();
  }

  function syncRepetitionStyleLabels() {
    if (!refs.repeatStyle) return;
    const labels = REPETITION_STYLE_LABELS[currentInputKind()] || REPETITION_STYLE_LABELS.variety;
    Array.from(refs.repeatStyle.options).forEach((option) => {
      if (labels[option.value]) option.textContent = labels[option.value];
    });
  }

  function resetDraftForKind(kind = currentInputKind()) {
    if (kind === 'number') {
      if (refs.globalInvariantName) refs.globalInvariantName.value = nextGlobalInvariantName();
      if (refs.globalInvariantValue) refs.globalInvariantValue.value = '0';
      if (refs.globalInvariantModeSymbolic) refs.globalInvariantModeSymbolic.checked = true;
      if (refs.globalInvariantModeInteger) refs.globalInvariantModeInteger.checked = false;
      if (refs.globalInvariantReplace) refs.globalInvariantReplace.checked = false;
      syncGlobalInvariantDraftControls();
    } else if (combinedProductCreateMode()) {
      refs.varietyType.value = 'product';
      refs.dim.value = '3';
      refs.curveGenus.value = 'g';
      refs.grassmannianR.value = '2';
      refs.grassmannianN.value = '4';
      refs.ciDegrees.value = '';
      syncCompleteIntersectionControls();
      clearProductDraft();
      state.draftVarietyNameDirty = false;
      refs.varietyName.value = defaultCreateVarietyNameLatex();
      activateProductFactorPick(0, { render: false });
    } else if (combinedAbelJacobiCreateMode()) {
      if (refs.mapType) refs.mapType.value = 'abel-jacobi';
      clearMapDraft();
      state.draftMapNameDirty = false;
      syncDefaultMapName(true);
    } else if (combinedSesCreateMode()) {
      clearSesDraft();
      state.sesPickTarget = 'sheaf-a';
      activateSesPick('sheaf-a', { render: false });
    } else if (combinedBlowupCreateMode()) {
      clearBlowupDraft();
      state.blowupPickTarget = 'base';
      activateBlowupPick('base', { render: false });
    } else if (combinedGrassmannianTautologicalSesCreateMode()) {
      clearTautologicalSesDraft();
      activateTautologicalSesPick({ render: false });
    } else if (combinedGrassmannianMapCreateMode()) {
      clearGrassmannianMapDraft();
      state.grassmannianMapPickTarget = 'bundle';
      if (refs.grassmannianMapR) refs.grassmannianMapR.value = '2';
      if (refs.grassmannianMapN) refs.grassmannianMapN.value = '4';
      activateGrassmannianMapPick({ render: false });
    } else if (kind === 'sheaf') {
      refs.sheafType.value = 'abstract';
      refs.twist.value = '1';
      refs.rank.value = 'r';
      refs.basis.value = 'chern';
      state.draftSheafBaseVarietyId = null;
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafSchurDraft();
      clearSheafIdealDraft();
      clearSheafMapDraft();
      state.draftSheafNameDirty = false;
      syncSheafBaseOptions(true);
      refs.sheafName.value = defaultCreateSheafNameLatex();
    } else if (kind === 'map') {
      if (refs.mapType) refs.mapType.value = 'ordinary';
      clearMapDraft();
      state.draftMapNameDirty = false;
      syncDefaultMapName(true);
    } else {
      clearProductDraft();
      refs.varietyType.value = 'abstract';
      refs.dim.value = '3';
      refs.curveGenus.value = 'g';
      refs.grassmannianR.value = '2';
      refs.grassmannianN.value = '4';
      refs.ciDegrees.value = '';
      syncCompleteIntersectionControls();
      state.draftVarietyNameDirty = false;
      refs.varietyName.value = defaultCreateVarietyNameLatex();
    }
    normalizeControlVisibility();
  }

  function selectObject(kind, id) {
    activateObject(kind, id, { mode: 'modify', loadDraft: true });
    recompute();
  }

  function activateObject(kind, id, options = {}) {
    const object = objectByKind(kind, id);
    if (object?.hiddenOnCanvas) {
      object.hiddenOnCanvas = false;
      state.hiddenObjects = hiddenObjectRefs();
    }
    if (kind === 'number') {
      state.activeGlobalInvariantId = id;
      state.activeSequenceId = null;
      state.activeVarietyId = null;
      state.activeSheafId = null;
      state.activeMapId = null;
      syncMapCurveControls(null);
    } else if (kind === 'variety') {
      clearActiveGlobalInvariant();
      state.activeSequenceId = null;
      state.activeVarietyId = id;
      state.activeSheafId = null;
      state.activeMapId = null;
      syncMapCurveControls(null);
    } else if (kind === 'sheaf') {
      clearActiveGlobalInvariant();
      state.activeSequenceId = null;
      state.activeSheafId = id;
      state.activeMapId = null;
      syncMapCurveControls(null);
      const sheaf = activeSheaf();
      const baseVariety = baseVarietyForSheaf(sheaf);
      if (baseVariety) state.activeVarietyId = baseVariety.id;
      if (sheaf) refs.basis.value = normalizeBasisValue(sheaf.basis);
    } else if (kind === 'map') {
      clearActiveGlobalInvariant();
      state.activeSequenceId = null;
      state.activeMapId = id;
      state.activeSheafId = null;
      syncMapCurveControls(selectedMap());
    } else if (kind === 'sequence') {
      clearActiveGlobalInvariant();
      const sequence = state.sequences.find((item) => item.id === id) || null;
      if (!sequence) return;
      state.activeSequenceId = id;
      state.activeMapId = null;
      state.activeSheafId = null;
      state.activeVarietyId = sequence.baseVarietyId || defaultBaseVarietyId();
      syncMapCurveControls(null);
      if (refs.addObjectKind) refs.addObjectKind.value = 'combined';
      if (refs.combinedType) refs.combinedType.value = 'short-exact-sequence';
    }
    if (refs.addObjectKind && inputIsCreateMode() && (kind === 'variety' || kind === 'sheaf' || kind === 'map' || kind === 'number')) {
      refs.addObjectKind.value = kind;
    }
    if (options.mode) setInputMode(options.mode, { loadDraft: false });
    if (options.loadDraft) loadActiveObjectIntoDraft(kind);
    syncInputEditorVisibility();
  }

  function inputIsModifyMode() {
    return state.inputMode === 'modify';
  }

  function inputIsCreateMode() {
    return state.inputMode !== 'modify';
  }

  function setInputMode(mode, options = {}) {
    state.inputMode = mode === 'modify' && canvasHasObjects() ? 'modify' : 'create';
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    if (state.inputMode === 'modify' && options.clearSelection) {
      state.activeGlobalInvariantId = null;
      state.activeVarietyId = null;
      state.activeSheafId = null;
      state.activeMapId = null;
      state.activeSequenceId = null;
      if (refs.combinedType) refs.combinedType.disabled = false;
    }
    if (state.inputMode === 'create') {
      state.activeGlobalInvariantId = null;
      state.activeSheafId = null;
      state.activeMapId = null;
      state.activeSequenceId = null;
      if (refs.combinedType) refs.combinedType.disabled = false;
      if (refs.modifyWarning) refs.modifyWarning.hidden = true;
    }
    setCanvasPickEnabled(false, { render: false });
    if (state.inputMode === 'modify') {
      state.draftSheafBaseVarietyId = null;
    }
    if (state.inputMode === 'create' && options.resetDraft) {
      resetDraftForKind(currentInputKind());
    }
    if (options.loadDraft && state.inputMode === 'modify' && activeObjectForModifyMode()) {
      loadActiveObjectIntoDraft(modifyKind());
    }
    syncInputEditorVisibility();
    if (state.inputMode === 'create') activateFirstCreateBlankPick({ render: false });
  }

  function syncInputModeControls() {
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    if (refs.addObject) {
      refs.addObject.hidden = inputIsModifyMode() && !activeObjectForModifyMode();
    }
    updateInputEditorTitles();
  }

  function updateInputEditorTitles() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    if (refs.combinedType) refs.combinedType.disabled = activeSesEditMode();
    if (refs.globalInvariantEditorTitle) {
      if (inputIsModifyMode() && kind === 'number') {
        setInlineMath(refs.globalInvariantEditorTitle, `\\text{the number } ${globalInvariantLatex(activeGlobalInvariant())}`);
      } else {
        refs.globalInvariantEditorTitle.textContent = 'new rational number';
      }
    }
    if (refs.varietyEditorTitle) {
      if (combinedProductCreateMode()) {
        refs.varietyEditorTitle.textContent = 'new product construction';
      } else if (inputIsModifyMode() && kind === 'variety') {
        setInlineMath(refs.varietyEditorTitle, `\\text{the variety } ${sanitizeMathLabel(refs.varietyName?.value || activeVariety()?.name, 'X')}`);
      } else {
        refs.varietyEditorTitle.textContent = 'new variety';
      }
    }
    if (refs.sheafEditorTitle) {
      if (combinedSesCreateMode()) {
        refs.sheafEditorTitle.textContent = activeSesEditMode() ? 'short exact sequence' : 'new short exact sequence';
      } else if (combinedGrassmannianTautologicalSesCreateMode()) {
        refs.sheafEditorTitle.textContent = 'new canonical SES';
      } else if (combinedGrassmannianMapCreateMode()) {
        refs.sheafEditorTitle.textContent = 'new Grassmannian map';
      } else if (inputIsModifyMode() && kind === 'sheaf') {
        setInlineMath(refs.sheafEditorTitle, `\\text{the sheaf } ${sanitizeMathLabel(refs.sheafName?.value || activeSheaf()?.name, '\\mathcal{E}')}`);
      } else {
        refs.sheafEditorTitle.textContent = 'new sheaf';
      }
    }
    if (refs.mapEditorTitle) {
      if (combinedAbelJacobiCreateMode()) {
        refs.mapEditorTitle.textContent = 'new Abel-Jacobi construction';
      } else if (inputIsModifyMode() && kind === 'map') {
        setInlineMath(refs.mapEditorTitle, `\\text{the map } ${readMapDraftName()}`);
      } else {
        refs.mapEditorTitle.textContent = 'new map';
      }
    }
  }

  function syncMapCurveControls(map = inputIsModifyMode() ? selectedMap() : null) {
    const showCurveControls = inputIsModifyMode() && !!map;
    if (refs.mapCurveRow) refs.mapCurveRow.hidden = !showCurveControls;
    if (refs.mapLabelOffsetRow) refs.mapLabelOffsetRow.hidden = !showCurveControls;
    const count = mapCurveAnchorCount(map);
    if (refs.mapPointCount) {
      refs.mapPointCount.min = '0';
      refs.mapPointCount.max = String(MAP_POINT_COUNT_OPTIONS.length - 1);
      refs.mapPointCount.step = '1';
      refs.mapPointCount.value = String(mapPointCountSliderValue(count));
      refs.mapPointCount.disabled = !showCurveControls;
    }
    if (refs.mapPointCountValue) refs.mapPointCountValue.textContent = formatMapPointCount(count);
    if (refs.standardMapCurve) refs.standardMapCurve.disabled = !showCurveControls;
    const offset = normalizedMapLabelOffset(map?.labelOffset);
    if (refs.mapLabelOffset) {
      refs.mapLabelOffset.min = String(MIN_MAP_LABEL_OFFSET);
      refs.mapLabelOffset.max = String(MAX_MAP_LABEL_OFFSET);
      refs.mapLabelOffset.value = String(offset);
      refs.mapLabelOffset.disabled = !showCurveControls;
    }
    if (refs.mapLabelOffsetValue) refs.mapLabelOffsetValue.textContent = `${offset}px`;
  }

  function syncSequenceTailControls(sequence = activeSesDraftSequence()) {
    const show = combinedSesCreateMode();
    if (refs.sesTailRow) refs.sesTailRow.hidden = !show;
    const count = sequence ? sequenceTailPointCount(sequence.tail) : sequenceTailPointCount(state.sesDraft);
    if (refs.sesTailPointCount) {
      refs.sesTailPointCount.min = '0';
      refs.sesTailPointCount.max = String(SEQUENCE_TAIL_POINT_COUNT_OPTIONS.length - 1);
      refs.sesTailPointCount.step = '1';
      refs.sesTailPointCount.value = String(sequenceTailPointCountSliderValue(count));
      refs.sesTailPointCount.disabled = !show;
    }
    if (refs.sesTailPointCountValue) refs.sesTailPointCountValue.textContent = formatSequenceTailPointCount(count);
  }

  function setActiveSequenceTailPointCount(value) {
    const sequence = activeSesDraftSequence();
    const count = sequenceTailPointCountFromSliderValue(value);
    if (refs.sesTailPointCount) refs.sesTailPointCount.value = String(sequenceTailPointCountSliderValue(count));
    if (refs.sesTailPointCountValue) refs.sesTailPointCountValue.textContent = formatSequenceTailPointCount(count);
    if (!sequence) {
      setSesDraft({ ...sesDraftIds(), tailPointCount: count });
      return;
    }
    const width = state.canvasWidth || refs.canvas?.clientWidth || 760;
    const height = state.canvasHeight || refs.canvas?.clientHeight || 280;
    const current = sequenceTailGeometryFromCanvas(sequence, width, height);
    if (!current?.path) {
      sequence.tail = { ...normalizeSequenceTailCurve(sequence.tail), pointCount: count };
      sequence.modified = true;
      recompute();
      return;
    }
    const previous = sequenceTailStateFromPath(sequence.tail, current.path, width, height);
    sequence.tail = sequenceTailWithPointCount(previous, current.start, current.end, count, width, height);
    sequence.modified = true;
    recompute();
  }

  function repositionCanvasObjectsForSpacing() {
    state.varieties.forEach((variety, index) => {
      variety.labelX = clamp(DEFAULT_FIRST_VARIETY_X + index * canvasSpacingRatio('x'), 0.08, 0.92);
      variety.labelY = DEFAULT_FIRST_VARIETY_Y;
    });
    repositionDependentCanvasObjects();
  }

  function repositionDependentCanvasObjects() {
    state.sheaves.forEach((sheaf) => {
      if (sheaf.labelPositionDirty) return;
      const base = baseVarietyForSheaf(sheaf);
      positionSheafNearBase(sheaf, base);
      avoidCanvasLabelOverlap(sheaf);
    });
    state.maps.forEach((map) => {
      map.curve = null;
      positionMapLabel(map);
    });
  }

  function applyStandardMapCurve(map, pointCount = mapCurveAnchorCount(map), bendPx = map?.defaultBendPx) {
    if (!map) return;
    const width = state.canvasWidth || refs.canvas?.clientWidth || 760;
    const height = state.canvasHeight || refs.canvas?.clientHeight || 280;
    const labels = canvasObjectLabels(width, height);
    const endpoints = mapEndpointLabels(map, labels);
    if (!endpoints) {
      map.curve = null;
      return;
    }
    const bend = Number.isFinite(bendPx) ? bendPx : 0;
    map.curve = standardMapCurve(endpoints.from, endpoints.to, width, height, normalizedMapPointCount(pointCount), bend);
    map.defaultBendPx = bend;
    map.modified = false;
    map.labelOffset = DEFAULT_MAP_LABEL_OFFSET;
    map.labelT = DEFAULT_MAP_LABEL_T;
    syncMapCurveControls(map);
  }

  function loadActiveObjectIntoDraft(kind = currentInputKind()) {
    const item = activeObjectForKind(kind);
    if (!item) return;
    if (kind === 'number') loadGlobalInvariantIntoDraft(item);
    else if (kind === 'map') loadMapIntoDraft(item);
    else if (kind === 'sheaf') loadSheafIntoDraft(item);
    else if (kind === 'sequence') loadShortExactSequenceIntoDraft(item);
    else loadVarietyIntoDraft(item);
    normalizeControlVisibility();
  }

  function loadVarietyIntoDraft(variety) {
    refs.varietyType.value = variety.type || 'abstract';
    if (variety.construction?.type === 'product') refs.varietyType.value = 'product';
    refs.dim.value = variety.dim ?? '3';
    refs.varietyName.value = variety.name || defaultVarietyNameLatex();
    refs.curveGenus.value = variety.genus || 'g';
    refs.grassmannianR.value = variety.grassmannianR || '2';
    refs.grassmannianN.value = variety.grassmannianN || '4';
    refs.ciDegrees.value = variety.ciDegrees || '';
    state.productDraft = variety.construction?.type === 'product'
      ? { varietyIds: [...(variety.construction.varietyIds || []).slice(0, 2)] }
      : null;
    state.productPickIndex = 0;
    updateProductDraftControls();
    syncCompleteIntersectionControls();
    state.draftVarietyNameDirty = !!variety.nameDirty;
    updateInputEditorTitles();
  }

  function loadSheafIntoDraft(sheaf) {
    const mapConstruction = sheafMapConstructionType(sheaf);
    const binaryConstruction = sheafBinaryConstructionType(sheaf);
    const selfSumConstruction = sheafSelfSumConstructionType(sheaf);
    const idealConstruction = sheafIdealConstructionType(sheaf);
    const schurConstruction = sheafSchurConstructionType(sheaf);
    const canonicalType = canonicalSheafType(sheaf.type);
    sheaf.type = canonicalType;
    refs.sheafType.value = mapConstruction ? 'map-operation' : (idealConstruction || schurConstruction || selfSumConstruction || binaryConstruction || canonicalType);
    refs.sheafName.value = sheaf.name || defaultSheafNameLatex();
    refs.twist.value = sheaf.twist ?? '1';
    refs.rank.value = sheaf.rank || 'r';
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    state.draftSheafNameDirty = !!sheaf.nameDirty;
    syncSheafBaseOptions();
    state.draftSheafBaseVarietyId = sheaf.baseVarietyId || null;
    if (refs.sheafBaseVariety && sheaf.baseVarietyId && state.varieties.some((item) => item.id === sheaf.baseVarietyId)) {
      refs.sheafBaseVariety.value = sheaf.baseVarietyId;
    }
    updateSheafBaseButton();
    if (mapConstruction) {
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafIdealDraft();
      clearSheafSchurDraft();
      loadMapOperationSheafIntoDraft(sheaf);
    } else if (idealConstruction) {
      clearSheafMapDraft();
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafSchurDraft();
      loadIdealSheafIntoDraft(sheaf);
    } else if (schurConstruction) {
      clearSheafMapDraft();
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafIdealDraft();
      loadSchurSheafIntoDraft(sheaf);
    } else if (selfSumConstruction) {
      clearSheafMapDraft();
      clearSheafBinaryDraft();
      clearSheafIdealDraft();
      clearSheafSchurDraft();
      loadSelfSumSheafIntoDraft(sheaf);
    } else if (binaryConstruction) {
      clearSheafMapDraft();
      clearSheafSelfSumDraft();
      clearSheafIdealDraft();
      clearSheafSchurDraft();
      loadBinarySheafIntoDraft(sheaf);
    } else {
      clearSheafMapDraft();
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafIdealDraft();
      clearSheafSchurDraft();
    }
    updateInputEditorTitles();
  }

  function sheafBinaryConstructionType(sheaf) {
    const type = sheaf?.construction?.type;
    return type === 'direct-sum' || type === 'tensor' ? type : null;
  }

  function sheafSelfSumConstructionType(sheaf) {
    return sheaf?.construction?.type === 'self-direct-sum' ? 'self-direct-sum' : null;
  }

  function sheafIdealConstructionType(sheaf) {
    return sheaf?.construction?.type === 'ses-term' && sheaf.construction.idealSheafMapId ? 'ideal-sheaf' : null;
  }

  function sheafSchurConstructionType(sheaf) {
    return sheaf?.construction?.type === 'schur' ? 'schur' : null;
  }

  function sheafMapConstructionType(sheaf) {
    const type = sheaf?.construction?.type;
    return type === 'pullback' || type === 'pushforward' ? type : null;
  }

  function loadBinarySheafIntoDraft(sheaf) {
    const construction = sheaf?.construction || {};
    state.sheafBinaryDraft = {
      sheafIds: [...(construction.sheafIds || []).slice(0, 2)]
    };
    state.sheafBinaryPickTarget = 'left';
    if (refs.sheafBinaryExact) refs.sheafBinaryExact.checked = !!construction.exact;
    updateSheafBinaryDraftControls();
  }

  function loadSelfSumSheafIntoDraft(sheaf) {
    const construction = sheaf?.construction || {};
    state.sheafSelfSumDraft = {
      sheafId: construction.sheafId || null
    };
    if (refs.sheafSelfSumCount) refs.sheafSelfSumCount.value = String(normalizeSelfSumMultiplicity(construction.multiplicity));
    updateSheafSelfSumDraftControls();
  }

  function loadIdealSheafIntoDraft(sheaf) {
    const construction = sheaf?.construction || {};
    state.sheafIdealDraft = {
      mapId: construction.idealSheafMapId || null
    };
    if (refs.sheafIdealConfirm) refs.sheafIdealConfirm.checked = true;
    updateSheafIdealDraftControls();
  }

  function loadSchurSheafIntoDraft(sheaf) {
    const construction = sheaf?.construction || {};
    state.sheafSchurDraft = {
      sheafId: construction.sheafId || null
    };
    if (refs.sheafSchurPartition) refs.sheafSchurPartition.value = formatSchurPartitionInput(construction.partition);
    updateSheafSchurDraftControls();
  }

  function loadMapOperationSheafIntoDraft(sheaf) {
    const construction = sheaf?.construction || {};
    state.sheafMapDraft = {
      mapId: construction.mapId || null,
      sheafId: construction.sheafId || null
    };
    state.sheafMapPickTarget = 'map';
    if (refs.sheafMapOperation) {
      refs.sheafMapOperation.value = construction.type === 'pushforward' ? 'pushforward' : 'pullback';
    }
    if (refs.sheafMapExact) refs.sheafMapExact.checked = !!construction.exact;
    if (refs.sheafMapProper) refs.sheafMapProper.checked = !!construction.proper;
    updateSheafMapDraftControls();
  }

  function loadGlobalInvariantIntoDraft(invariant) {
    if (!invariant) return;
    if (refs.globalInvariantName) refs.globalInvariantName.value = invariant.name || 'a';
    if (refs.globalInvariantValue) refs.globalInvariantValue.value = invariant.value ?? '0';
    const hasValue = invariant.hasValue === true;
    if (refs.globalInvariantModeSymbolic) refs.globalInvariantModeSymbolic.checked = !hasValue;
    if (refs.globalInvariantModeInteger) refs.globalInvariantModeInteger.checked = hasValue;
    if (refs.globalInvariantReplace) refs.globalInvariantReplace.checked = hasValue && invariant.replaceWithValue === true;
    syncGlobalInvariantDraftControls();
    updateInputEditorTitles();
  }

  function loadMapIntoDraft(map) {
    if (refs.mapType) refs.mapType.value = map?.construction?.type === 'composition'
      ? 'composition'
      : (map?.construction?.type === 'abel-jacobi' ? 'abel-jacobi' : 'ordinary');
    if (refs.mapType && map && !map.construction && map.domainKind === 'sheaf' && map.codomainKind === 'sheaf') refs.mapType.value = 'sheaf';
    state.mapDraft = map
      ? (map.construction?.type === 'composition'
        ? { type: 'composition', mapIds: [...(map.construction.mapIds || []).slice(0, 2)] }
        : map.construction?.type === 'abel-jacobi'
          ? { type: 'abel-jacobi', curveId: map.construction.curveId || map.domainId, jacobianId: map.codomainId }
        : { type: 'ordinary', domainKind: map.domainKind, domainId: map.domainId, codomainKind: map.codomainKind, codomainId: map.codomainId })
      : null;
    state.mapPickTarget = refs.mapType?.value === 'composition' ? 'first' : (refs.mapType?.value === 'abel-jacobi' ? 'curve' : 'domain');
    if (refs.mapName) refs.mapName.value = map?.name || defaultMapNameLatex();
    syncMapCurveControls(map);
    state.draftMapNameDirty = false;
    updateMapPickStatus();
    updateMapDraftControls();
    updateInputEditorTitles();
  }

  function loadShortExactSequenceIntoDraft(sequence) {
    if (!sequence || sequence.type !== 'short-exact-sequence') return;
    if (refs.addObjectKind) refs.addObjectKind.value = 'combined';
    if (refs.combinedType) refs.combinedType.value = 'short-exact-sequence';
    sequence.tail = normalizeSequenceTailCurve(sequence.tail);
    const sheafIds = sequence.sheafIds || [];
    const mapIds = sequence.mapIds || [];
    setSesDraft({
      sequenceId: sequence.id,
      sheafAId: sheafIds[0] || null,
      sheafBId: sheafIds[1] || null,
      sheafCId: sheafIds[2] || null,
      mapABId: mapIds[0] || null,
      mapBCId: mapIds[1] || null,
      tailPointCount: sequenceTailPointCount(sequence.tail)
    });
    state.sesPickTarget = 'sheaf-a';
    updateSesDraftControls();
    syncSequenceTailControls(sequence);
    updateInputEditorTitles();
  }

  function activeObjectForKind(kind) {
    if (inputIsModifyMode()) {
      if (kind === 'number') return selectedGlobalInvariant();
      if (kind === 'sequence') return selectedSequence();
      if (kind === 'map') return selectedMap();
      if (kind === 'sheaf') return selectedSheaf();
      if (state.activeSequenceId || state.activeGlobalInvariantId) return null;
      return state.activeSheafId || state.activeMapId ? null : selectedVariety();
    }
    if (kind === 'number') return activeGlobalInvariant();
    if (kind === 'map') return activeMap();
    return kind === 'sheaf' ? activeSheaf() : activeVariety();
  }

  function activeEditingSheaf() {
    return inputIsModifyMode() && modifyKind() === 'sheaf' ? selectedSheaf() : null;
  }

  function currentInputKind() {
    if (inputIsModifyMode()) return modifyKind();
    const value = refs.addObjectKind?.value;
    if (value === 'number') return 'number';
    if (!state.varieties.length && (value === 'sheaf' || value === 'map' || value === 'combined')) return 'variety';
    if (value === 'map' || combinedAbelJacobiCreateMode()) return 'map';
    if (combinedSesCreateMode() || combinedGrassmannianTautologicalSesCreateMode() || combinedGrassmannianMapCreateMode()) return 'sheaf';
    return value === 'sheaf' ? 'sheaf' : 'variety';
  }

  function combinedCreateMode() {
    return inputIsCreateMode() && refs.addObjectKind?.value === 'combined';
  }

  function combinedProductCreateMode() {
    return combinedCreateMode() && refs.combinedType?.value === 'product';
  }

  function combinedAbelJacobiCreateMode() {
    return combinedCreateMode() && refs.combinedType?.value === 'abel-jacobi';
  }

  function combinedSesCreateMode() {
    return (combinedCreateMode() && refs.combinedType?.value === 'short-exact-sequence') || activeSesEditMode();
  }

  function combinedBlowupCreateMode() {
    return combinedCreateMode() && refs.combinedType?.value === 'blow-up-point';
  }

  function combinedGrassmannianTautologicalSesCreateMode() {
    return combinedCreateMode() && refs.combinedType?.value === 'grassmannian-tautological-ses';
  }

  function combinedGrassmannianMapCreateMode() {
    return combinedCreateMode() && refs.combinedType?.value === 'grassmannian-map';
  }

  function activeSesEditMode() {
    return inputIsModifyMode() && !!state.activeSequenceId && selectedSequence()?.type === 'short-exact-sequence';
  }

  function deleteActiveObject(kind = currentInputKind()) {
    if (kind === 'number') {
      const active = activeGlobalInvariant();
      if (!active) return;
      state.globalInvariants = (state.globalInvariants || []).filter((item) => item.id !== active.id);
      state.activeGlobalInvariantId = null;
      if (inputIsModifyMode()) setInputMode('create', { resetDraft: true });
      recompute();
      return;
    }
    if (kind === 'sequence') {
      const active = selectedSequence();
      if (!active) return;
      deleteShortExactSequence(active.id);
      return;
    }
    if (kind === 'map') {
      const active = activeObjectForKind(kind);
      if (active) removeCanvasObject('map', active.id);
      return;
    }
    const deletingSheaf = kind === 'sheaf';
    const items = deletingSheaf ? state.sheaves : state.varieties;
    const active = activeObjectForKind(kind);
    if (!active) return;
    const index = items.findIndex((item) => item.id === active.id);
    if (index < 0) return;
    const removed = items.splice(index, 1)[0] || null;
    const next = items[Math.min(index, items.length - 1)] || null;
    if (deletingSheaf) {
      clearActiveGlobalInvariant();
      state.activeSheafId = next?.id || null;
      state.maps = state.maps.filter((map) => !(map.domainKind === 'sheaf' && map.domainId === removed?.id) && !(map.codomainKind === 'sheaf' && map.codomainId === removed?.id));
      removeSequencesTouchingSheaves(new Set([removed?.id].filter(Boolean)));
      if (next) {
        state.activeVarietyId = next.baseVarietyId || defaultBaseVarietyId();
        refs.basis.value = normalizeBasisValue(next.basis);
      }
    } else {
      clearActiveGlobalInvariant();
      const removedSheafIds = new Set(state.sheaves.filter((sheaf) => sheaf.baseVarietyId === removed?.id).map((sheaf) => sheaf.id));
      state.activeVarietyId = next?.id || null;
      state.activeSheafId = null;
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.baseVarietyId !== removed?.id);
      state.maps = state.maps.filter((map) => (
        !(map.domainKind === 'variety' && map.domainId === removed?.id)
        && !(map.codomainKind === 'variety' && map.codomainId === removed?.id)
        && !(map.domainKind === 'sheaf' && removedSheafIds.has(map.domainId))
        && !(map.codomainKind === 'sheaf' && removedSheafIds.has(map.codomainId))
      ));
      removeSequencesTouchingSheaves(removedSheafIds);
      if (!state.varieties.some((variety) => variety.id === state.activeVarietyId)) {
        state.activeVarietyId = state.varieties[0]?.id || null;
      }
      syncDefaultSheafName();
    }
    if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
    clearMapDraft();
    syncSheafBaseOptions(true);
    if (inputIsModifyMode()) {
      const nextActive = activeObjectForKind(kind);
      if (nextActive) loadActiveObjectIntoDraft(kind);
      else setInputMode('create', { resetDraft: true });
    }
    recompute();
  }

  function removeCanvasObject(kind, id) {
    if (kind === 'sequence') {
      deleteShortExactSequence(id);
      return;
    }
    if (kind === 'map') {
      state.maps = state.maps.filter((map) => map.id !== id);
      removeSequencesTouchingMaps(new Set([id]));
      if (state.activeMapId === id) state.activeMapId = null;
      if (state.mapDraft?.type === 'composition' && (state.mapDraft.mapIds || []).includes(id)) clearMapDraft();
      recompute();
      return;
    }
    if (kind === 'sheaf') {
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.id !== id);
      state.maps = state.maps.filter((map) => !(map.domainKind === 'sheaf' && map.domainId === id) && !(map.codomainKind === 'sheaf' && map.codomainId === id));
      removeSequencesTouchingSheaves(new Set([id]));
      if (state.activeSheafId === id) state.activeSheafId = null;
      if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
      clearMapDraft();
      syncSheafBaseOptions(true);
      recompute();
      return;
    }
    if (kind === 'variety') {
      const removedSheafIds = new Set(state.sheaves.filter((sheaf) => sheaf.baseVarietyId === id).map((sheaf) => sheaf.id));
      state.varieties = state.varieties.filter((variety) => variety.id !== id);
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.baseVarietyId !== id);
      state.maps = state.maps.filter((map) => (
        !(map.domainKind === 'variety' && map.domainId === id)
        && !(map.codomainKind === 'variety' && map.codomainId === id)
        && !(map.domainKind === 'sheaf' && removedSheafIds.has(map.domainId))
        && !(map.codomainKind === 'sheaf' && removedSheafIds.has(map.codomainId))
      ));
      removeSequencesTouchingSheaves(removedSheafIds);
      if (state.activeVarietyId === id) state.activeVarietyId = state.varieties[0]?.id || null;
      if (state.activeSheafId && !state.sheaves.some((sheaf) => sheaf.id === state.activeSheafId)) state.activeSheafId = null;
      if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
      clearMapDraft();
      syncSheafBaseOptions(true);
      syncDefaultSheafName();
      recompute();
    }
  }

  function deleteShortExactSequence(sequenceId) {
    const sequence = (state.sequences || []).find((item) => item.id === sequenceId);
    if (!sequence) return;
    detachShortExactSequenceMemberships(sequenceId);
    (sequence.mapIds || []).forEach((mapId) => detachShortExactSequenceMap(mapId, sequenceId));
    state.sequences = state.sequences.filter((item) => item.id !== sequenceId);
    if (state.activeSequenceId === sequenceId) state.activeSequenceId = null;
    if (refs.combinedType) refs.combinedType.disabled = false;
    clearSesDraft();
    recompute();
  }

  function removeSequencesTouchingSheaves(sheafIds) {
    if (!sheafIds?.size || !Array.isArray(state.sequences)) return;
    const removedSequenceIds = new Set();
    state.sequences = state.sequences.filter((sequence) => {
      const touches = (sequence.sheafIds || []).some((id) => sheafIds.has(id));
      if (touches) removedSequenceIds.add(sequence.id);
      return !touches;
    });
    if (removedSequenceIds.size) {
      state.maps = state.maps.filter((map) => !removedSequenceIds.has(map.construction?.sequenceId));
      if (removedSequenceIds.has(state.activeSequenceId)) state.activeSequenceId = null;
    }
  }

  function removeSequencesTouchingMaps(mapIds) {
    if (!mapIds?.size || !Array.isArray(state.sequences)) return;
    const removedSequenceIds = new Set();
    state.sequences = state.sequences.filter((sequence) => {
      const touches = (sequence.mapIds || []).some((id) => mapIds.has(id));
      if (touches) removedSequenceIds.add(sequence.id);
      return !touches;
    });
    if (removedSequenceIds.has(state.activeSequenceId)) state.activeSequenceId = null;
  }

  function clearCanvasObjects() {
    state.varieties = [];
    state.sheaves = [];
    state.maps = [];
    state.sequences = [];
    state.activeVarietyId = null;
    state.activeSheafId = null;
    state.activeMapId = null;
    state.activeSequenceId = null;
    state.labelDrag = null;
    state.mapControlDrag = null;
    state.sequenceTailDrag = null;
    state.hiddenObjects = [];
    clearMapDraft();
    if (refs.addObjectKind) refs.addObjectKind.value = 'variety';
    setInputMode('create', { resetDraft: true });
    syncSheafBaseOptions(true);
    syncInputEditorVisibility();
    recompute();
  }

  function hideCanvasObject(kind, id) {
    const object = objectByKind(kind, id);
    if (!object) return;
    object.hiddenOnCanvas = true;
    if (kind !== 'map') {
      state.maps.forEach((map) => {
        if (map.domainKind === kind && map.domainId === id) map.hiddenOnCanvas = true;
        if (map.codomainKind === kind && map.codomainId === id) map.hiddenOnCanvas = true;
      });
    }
    state.hiddenObjects = hiddenObjectRefs();
    recompute();
  }

  function hideShortExactSequenceTail(sequenceId) {
    const sequence = (state.sequences || []).find((item) => item.id === sequenceId);
    if (!sequence) return;
    const tail = normalizeSequenceTailCurve(sequence.tail) || {};
    sequence.tail = { ...tail, hiddenOnCanvas: true };
    state.hiddenObjects = hiddenObjectRefs();
    recompute();
  }

  function showHiddenCanvasObjects() {
    let changed = false;
    allCanvasObjects().forEach((object) => {
      if (object.hiddenOnCanvas) {
        object.hiddenOnCanvas = false;
        changed = true;
      }
    });
    (state.sequences || []).forEach((sequence) => {
      if (!sequence.tail?.hiddenOnCanvas) return;
      sequence.tail = { ...normalizeSequenceTailCurve(sequence.tail), hiddenOnCanvas: false };
      changed = true;
    });
    state.hiddenObjects = [];
    if (changed) recompute();
    else syncShowCanvasButton();
  }

  function allCanvasObjects() {
    return [...state.varieties, ...state.sheaves, ...state.maps];
  }

  function hiddenObjectRefs() {
    return [
      ...state.varieties.filter((item) => item.hiddenOnCanvas).map((item) => ({ kind: 'variety', id: item.id })),
      ...state.sheaves.filter((item) => item.hiddenOnCanvas).map((item) => ({ kind: 'sheaf', id: item.id })),
      ...state.maps.filter((item) => item.hiddenOnCanvas).map((item) => ({ kind: 'map', id: item.id })),
      ...state.sequences.filter((item) => item.tail?.hiddenOnCanvas).map((item) => ({ kind: 'sequence-tail', id: item.id }))
    ];
  }

  function hasHiddenCanvasObjects() {
    return allCanvasObjects().some((object) => object.hiddenOnCanvas) || (state.sequences || []).some((sequence) => sequence.tail?.hiddenOnCanvas);
  }

  function syncShowCanvasButton() {
    if (!refs.showCanvas) return;
    const hiddenRefs = hiddenObjectRefs();
    const count = hiddenRefs.length;
    state.hiddenObjects = hiddenRefs;
    refs.showCanvas.disabled = count === 0;
    refs.showCanvas.title = count ? `Show ${count} hidden label${count === 1 ? '' : 's'}` : 'No hidden labels';
  }

  function canvasObjectLabelFromEvent(event) {
    const direct = event?.target?.closest?.('[data-object-kind][data-object-id]');
    if (direct && refs.canvasLabels?.contains(direct)) return direct;
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (!node?.closest) continue;
      const label = node.closest('[data-object-kind][data-object-id]');
      if (label && refs.canvasLabels?.contains(label)) return label;
    }
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    let node = document.elementFromPoint(x, y);
    while (node && node !== refs.canvasLabels) {
      if (node?.matches?.('[data-object-kind][data-object-id]')) return node;
      node = node.parentElement || node.getRootNode?.()?.host || null;
    }
    return null;
  }

  function isCanvasSequenceControl(target) {
    return target?.closest?.('[data-object-kind="sequence"][data-object-id]');
  }

  function handleCanvasLabelContextMenu(event) {
    const sequenceTailControl = event.target.closest('[data-sequence-tail-control]');
    if (sequenceTailControl) {
      const sequence = sequenceFromTailControl(sequenceTailControl);
      if (sequence?.type === 'short-exact-sequence') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        hideShortExactSequenceTail(sequence.id);
      }
      return;
    }
    const target = canvasObjectLabelFromEvent(event);
    if (!target) return;
    if (target.dataset.objectKind === 'sequence') {
      const control = target.dataset.sequenceTailControl;
      if (control === 'end') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        hideShortExactSequenceTail(target.dataset.objectId);
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    hideCanvasObject(target.dataset.objectKind, target.dataset.objectId);
  }

  function updateDeleteObjectButton() {
    if (!refs.deleteObject) return;
    const kind = currentInputKind();
    const active = activeObjectForKind(kind);
    refs.deleteObject.hidden = inputIsCreateMode() || (inputIsModifyMode() && !activeObjectForModifyMode());
    refs.deleteObject.disabled = !active;
    refs.deleteObject.textContent = 'delete';
    refs.deleteObject.title = active ? `Delete selected ${kind}` : `No ${kind} to delete`;
  }

  function readGlobalInvariantDraft() {
    const existing = inputIsModifyMode() ? selectedGlobalInvariant() : null;
    const fallback = existing?.name || nextGlobalInvariantName();
    if (!globalInvariantNameIsValid(refs.globalInvariantName?.value)) {
      syncGlobalInvariantDraftControls();
      return null;
    }
    const name = sanitizeGlobalInvariantName(refs.globalInvariantName?.value, fallback);
    const hasValue = !!refs.globalInvariantModeInteger?.checked;
    const value = sanitizeIntegerString(refs.globalInvariantValue?.value, existing?.value || '0');
    return {
      type: 'rational-number',
      name,
      value,
      hasValue,
      replaceWithValue: hasValue && !!refs.globalInvariantReplace?.checked
    };
  }

  function createGlobalInvariantFromDraft() {
    const draft = readGlobalInvariantDraft();
    if (!draft) return null;
    const invariant = createDefaultGlobalInvariant(draft);
    invariant.name = uniqueGlobalInvariantName(invariant.name);
    if (refs.globalInvariantName) refs.globalInvariantName.value = invariant.name;
    state.globalInvariants.push(invariant);
    state.activeGlobalInvariantId = invariant.id;
    resetDraftForKind('number');
    return invariant;
  }

  function updateGlobalInvariantFromDraft(invariant) {
    if (!invariant) return null;
    const beforeName = invariant.name;
    const draft = readGlobalInvariantDraft();
    if (!draft) return null;
    const nextName = uniqueGlobalInvariantName(draft.name, invariant.id);
    Object.assign(invariant, draft, { name: nextName });
    if (beforeName !== nextName) renameGlobalInvariantReferences(beforeName, nextName);
    if (refs.globalInvariantName) refs.globalInvariantName.value = invariant.name;
    syncGlobalInvariantDraftControls();
    return invariant;
  }

  function syncGlobalInvariantDraftControls() {
    const hasValue = !!refs.globalInvariantModeInteger?.checked;
    if (refs.globalInvariantValueRow) refs.globalInvariantValueRow.hidden = !hasValue;
    if (refs.globalInvariantValue) refs.globalInvariantValue.disabled = !hasValue;
    if (refs.globalInvariantReplace) refs.globalInvariantReplace.disabled = !hasValue;
    if (!hasValue && refs.globalInvariantReplace) refs.globalInvariantReplace.checked = false;
    if (refs.globalInvariantUsage) {
      const invariant = inputIsModifyMode() ? selectedGlobalInvariant() : null;
      const showingNumberEditor = inputIsModifyMode()
        ? !!state.activeGlobalInvariantId
        : refs.addObjectKind?.value === 'number';
      const invalidName = showingNumberEditor && !globalInvariantNameIsValid(refs.globalInvariantName?.value);
      const refsText = invalidName
        ? globalInvariantNameWarning()
        : (invariant ? formatGlobalInvariantReferences(invariant) : 'Used after you place this symbol in a sheaf rank or curve genus field.');
      refs.globalInvariantUsage.textContent = refsText;
      refs.globalInvariantUsage.classList.toggle('is-warning', invalidName);
    }
  }

  function createObjectFromDraft(kind = currentInputKind()) {
    if (kind === 'number') return createGlobalInvariantFromDraft();
    if (combinedProductCreateMode()) return createProductVarietyFromDraft();
    if (combinedAbelJacobiCreateMode()) return createAbelJacobiMapFromDraft();
    if (combinedSesCreateMode()) return createSesFromDraft();
    if (combinedGrassmannianTautologicalSesCreateMode()) return createTautologicalSesFromDraft();
    if (combinedBlowupCreateMode()) return createBlowupPointFromDraft();
    if (combinedGrassmannianMapCreateMode()) return createGrassmannianMapFromDraft();
    if (kind === 'map') return createMapFromDraft();
    if (kind === 'sheaf') {
      return addSheafFromDraft();
    }
    if (creatingProductVariety()) return createProductVarietyFromDraft();
    const variety = createVarietyFromDraft();
    state.varieties.push(variety);
    state.activeSequenceId = null;
    state.activeVarietyId = variety.id;
    state.activeSheafId = null;
    state.activeMapId = null;
    prepareNextDraftName('variety', variety.name);
    return variety;
  }

  function createProductVarietyFromDraft() {
    const factors = productDraftFactors();
    if (factors.length !== 2) return null;
    const dim = productDimensionFromFactors(factors[0], factors[1]);
    if (dim > MAX_DIMENSION) return null;
    const defaultName = defaultProductVarietyNameFromObjects(factors[0], factors[1]);
    const name = state.draftVarietyNameDirty
      ? sanitizeMathLabel(refs.varietyName.value, defaultName)
      : defaultName;
    const created = createProductVariety({
      left: factors[0],
      right: factors[1],
      dim,
      defaultName,
      name,
      nameDirty: state.draftVarietyNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    });
    clearProductDraft();
    state.draftVarietyNameDirty = false;
    refs.varietyName.value = defaultCreateVarietyNameLatex();
    return created;
  }

  function createMapFromDraft() {
    if (mapCompositionInputMode()) {
      const data = mapCompositionConstructionData();
      if (!data) return null;
      const map = createComposedMap(data);
      if (!map) return null;
      clearMapDraft();
      state.draftMapNameDirty = false;
      refs.mapName.value = defaultCreateMapNameLatex();
      return map;
    }
    if (abelJacobiMapInputMode()) return createAbelJacobiMapFromDraft();
    const data = ordinaryMapDraftData();
    if (!data) return null;
    const map = createMapObject(
      { kind: data.kind, id: data.domain.id },
      { kind: data.kind, id: data.codomain.id },
      { name: uniqueObjectName('map', data.name) }
    );
    if (!map) return null;
    map.nameDirty = data.nameDirty;
    clearMapDraft();
    return map;
  }

  function updateMapFromDraft(map) {
    if (!map) return null;
    if (mapCompositionInputMode()) {
      const data = mapCompositionConstructionData();
      if (!data) return null;
      map.name = data.name;
      map.domainKind = data.first.domainKind;
      map.domainId = data.first.domainId;
      map.codomainKind = data.second.codomainKind;
      map.codomainId = data.second.codomainId;
      map.nameDirty = data.nameDirty;
      map.construction = {
        type: 'composition',
        mapIds: [data.first.id, data.second.id],
        defaultName: data.defaultName,
        nameDirty: data.nameDirty
      };
      map.curve = null;
      positionMapLabel(map);
      syncObjectLineage(map, 'map');
      refreshConstructedObjects();
      updateInputEditorTitles();
      return map;
    }
    const data = ordinaryMapDraftData();
    if (!data) return null;
    map.name = data.name;
    map.domainKind = data.kind;
    map.domainId = data.domain.id;
    map.codomainKind = data.kind;
    map.codomainId = data.codomain.id;
    map.nameDirty = data.nameDirty;
    map.construction = null;
    map.curve = null;
    map.defaultBendPx = isSelfMap(map) ? nextDefaultSelfMapAngle(map) : nextDefaultMapBend(map);
    positionMapLabel(map);
    syncObjectLineage(map, 'map');
    refreshConstructedObjects();
    updateInputEditorTitles();
    return map;
  }

  function ordinaryMapDraftData() {
    const draft = state.mapDraft || {};
    const domainId = draft.domainId;
    const codomainId = draft.codomainId;
    const kind = sheafMapInputMode() ? 'sheaf' : 'variety';
    if ((draft.domainKind && draft.domainKind !== kind) || (draft.codomainKind && draft.codomainKind !== kind)) return null;
    const collection = kind === 'sheaf' ? state.sheaves : state.varieties;
    const domain = collection.find((item) => item.id === domainId);
    const codomain = collection.find((item) => item.id === codomainId);
    if (!domain || !codomain) return null;
    if (kind === 'sheaf' && domain.baseVarietyId !== codomain.baseVarietyId) return null;
    const defaultName = defaultMapNameLatex();
    const name = state.draftMapNameDirty
      ? sanitizeMathLabel(refs.mapName?.value, defaultName)
      : (inputIsCreateMode() ? defaultCreateMapNameLatex() : readMapDraftName());
    return {
      kind,
      domain,
      codomain,
      name,
      nameDirty: state.draftMapNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function mapCompositionConstructionData() {
    const [firstId, secondId] = mapDraftMapIds();
    const first = state.maps.find((item) => item.id === firstId);
    const second = state.maps.find((item) => item.id === secondId);
    if (!first || !second) return null;
    if (first.codomainKind !== second.domainKind || first.codomainId !== second.domainId) return null;
    if (inputIsModifyMode() && (first.id === state.activeMapId || second.id === state.activeMapId)) return null;
    const defaultName = defaultComposedMapNameFromObjects(first, second);
    const name = state.draftMapNameDirty
      ? sanitizeMathLabel(refs.mapName?.value, defaultName)
      : (inputIsCreateMode() ? uniqueObjectName('map', defaultName) : defaultName);
    return {
      operation: 'compose-map',
      first,
      second,
      defaultName,
      name,
      nameDirty: state.draftMapNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
    };
  }

  function prepareNextDraftName(kind, createdName) {
    if (!refs.repeatNames?.checked || !nameBelongsToRepetitionModel(kind, createdName)) return false;
    if (kind === 'map') {
      state.draftMapNameDirty = false;
      refs.mapName.value = uniqueObjectName('map', createdName);
    } else if (kind === 'sheaf') {
      state.draftSheafNameDirty = false;
      refs.sheafName.value = uniqueObjectName('sheaf', createdName);
    } else {
      state.draftVarietyNameDirty = false;
      refs.varietyName.value = uniqueObjectName('variety', createdName);
    }
    return true;
  }

  function updateObjectFromDraft(kind = currentInputKind()) {
    const active = activeObjectForKind(kind);
    if (!active) return null;
    if (kind === 'number') return updateGlobalInvariantFromDraft(active);
    if (kind === 'sequence') return updateShortExactSequenceFromDraft();
    if (kind === 'map') {
      if (abelJacobiMapInputMode()) return null;
      return updateMapFromDraft(active);
    }
    if (kind === 'sheaf') {
      if (sheafBinaryInputMode()) return updateBinarySheafFromDraft(active);
      if (sheafSelfSumInputMode()) return updateSelfSumSheafFromDraft(active);
      if (sheafIdealInputMode()) return updateIdealSheafFromDraft(active);
      if (sheafSchurInputMode()) return updateSchurSheafFromDraft(active);
      if (refs.sheafType?.value === 'map-operation') return updateMapOperationSheafFromDraft(active);
      const oldBaseId = active.baseVarietyId;
      const baseVariety = draftBaseVariety();
      if (!baseVariety) return null;
      Object.assign(active, readSheafDraft(baseVariety));
      if (oldBaseId !== active.baseVarietyId) {
        positionSheafNearBase(active, baseVariety);
        avoidCanvasLabelOverlap(active);
      }
      sheafFromObject(active, geometryFromVariety(baseVariety));
      state.activeSequenceId = null;
      state.activeSheafId = active.id;
      state.activeVarietyId = active.baseVarietyId || defaultBaseVarietyId();
      refs.basis.value = normalizeBasisValue(active.basis);
      syncObjectLineage(active, 'sheaf');
      refreshConstructedObjects();
      return active;
    }
    Object.assign(active, readVarietyDraft());
    if (active.construction?.type === 'product' && refs.varietyType.value === 'product') {
      updateProductVarietyConstructionFromDraft(active);
    } else if (refs.varietyType.value !== 'product') {
      active.construction = null;
      syncObjectLineage(active, 'variety');
    }
    geometryFromVariety(active);
    if (active.type === 'curve') refs.dim.value = '1';
    state.activeSequenceId = null;
    state.activeVarietyId = active.id;
    state.activeSheafId = null;
    state.sheaves.forEach((sheaf) => {
      if (sheaf.baseVarietyId === active.id && !sheaf.construction && !sheaf.nameDirty) {
        const rank = sanitizeRankInput(sheaf.rank);
        const twist = normalizedInt(sheaf.twist, -24, 24, 1);
        sheaf.name = defaultSheafNameFor(sheaf.type, rank, twist, active.name, geometryFromVariety(active));
      }
    });
    syncDefaultSheafName();
    syncObjectLineage(active, 'variety');
    refreshConstructedObjects();
    return active;
  }

  function updateProductVarietyConstructionFromDraft(variety) {
    const factors = productDraftFactors();
    if (!variety || factors.length !== 2) return false;
    const defaultName = defaultProductVarietyNameFromObjects(factors[0], factors[1]);
    variety.construction = {
      ...(variety.construction || {}),
      type: 'product',
      varietyIds: [factors[0].id, factors[1].id],
      defaultName
    };
    if (!state.draftVarietyNameDirty) variety.name = defaultName;
    variety.dim = String(Math.min(productDimensionFromFactors(factors[0], factors[1]), MAX_DIMENSION));
    if (!variety.labelPositionDirty) positionProductVarietyLabel(variety, factors[0], factors[1]);
    syncObjectLineage(variety, 'variety');
    return true;
  }

  function bindControls() {
    if (refs.inputMode) {
      refs.inputMode.addEventListener('change', () => {
        setInputMode(refs.inputMode.value, {
          loadDraft: true,
          resetDraft: true,
          clearSelection: refs.inputMode.value === 'modify'
        });
        recompute();
      });
    }
    if (refs.repeatNames) {
      refs.repeatNames.addEventListener('change', () => {
        syncDefaultVarietyName();
        syncDefaultSheafName();
        syncDefaultMapName();
      });
    }
    if (refs.repeatStyle) {
      refs.repeatStyle.addEventListener('change', () => {
        syncDefaultVarietyName();
        syncDefaultSheafName();
        syncDefaultMapName();
      });
    }
    refs.addObjectKind.addEventListener('change', () => {
      syncInputAvailabilityControls();
      state.activeSequenceId = null;
      state.activeMapId = null;
      if (!combinedProductCreateMode() && refs.addObjectKind.value !== 'variety') clearProductDraft();
      clearSesDraft();
      clearBlowupDraft();
      clearTautologicalSesDraft();
      clearGrassmannianMapDraft();
      clearMapDraft();
      clearSheafBinaryDraft();
      clearSheafSelfSumDraft();
      clearSheafSchurDraft();
      clearSheafMapDraft();
      setCanvasPickEnabled(false, { render: false });
      if (combinedProductCreateMode()) refs.varietyType.value = 'product';
      if (combinedAbelJacobiCreateMode() && refs.mapType) refs.mapType.value = 'abel-jacobi';
      if (refs.addObjectKind.value === 'variety') state.activeSheafId = null;
      clearActiveGlobalInvariant();
      if (inputIsModifyMode()) {
        if (!activeObjectForKind(currentInputKind())) setInputMode('create', { resetDraft: true });
        else loadActiveObjectIntoDraft(currentInputKind());
      } else {
        resetDraftForKind(currentInputKind());
      }
      syncInputEditorVisibility();
      if (inputIsModifyMode()) syncSheafBaseOptions();
      normalizeControlVisibility();
      typeset(refs.varietyEditor);
      typeset(refs.sheafEditor);
      typeset(refs.mapEditor);
      typeset(refs.combinedEditor);
      if (combinedProductCreateMode()) activateProductFactorPick(0, { render: false });
      else if (combinedSesCreateMode()) activateSesPick(state.sesPickTarget || 'sheaf-a', { render: false });
      else if (combinedBlowupCreateMode()) activateBlowupPick(state.blowupPickTarget || 'base', { render: false });
      else if (combinedGrassmannianTautologicalSesCreateMode()) activateTautologicalSesPick({ render: false });
      else if (combinedGrassmannianMapCreateMode()) activateGrassmannianMapPick({ render: false });
      else activateFirstCreateBlankPick({ render: false });
      recompute();
    });
    if (refs.combinedType) {
      refs.combinedType.addEventListener('change', () => {
        if (activeSesEditMode()) return;
        syncInputAvailabilityControls();
        clearProductDraft();
        clearSesDraft();
        clearBlowupDraft();
        clearTautologicalSesDraft();
        clearGrassmannianMapDraft();
        clearMapDraft();
        setCanvasPickEnabled(false, { render: false });
        if (combinedProductCreateMode()) refs.varietyType.value = 'product';
        if (combinedAbelJacobiCreateMode() && refs.mapType) refs.mapType.value = 'abel-jacobi';
        resetDraftForKind(currentInputKind());
        syncInputEditorVisibility();
        normalizeControlVisibility();
        typeset(refs.varietyEditor);
        typeset(refs.mapEditor);
        typeset(refs.combinedEditor);
        if (combinedProductCreateMode()) activateProductFactorPick(0, { render: false });
        else if (combinedSesCreateMode()) activateSesPick(state.sesPickTarget || 'sheaf-a', { render: false });
        else if (combinedBlowupCreateMode()) activateBlowupPick(state.blowupPickTarget || 'base', { render: false });
        else if (combinedGrassmannianTautologicalSesCreateMode()) activateTautologicalSesPick({ render: false });
        else if (combinedGrassmannianMapCreateMode()) activateGrassmannianMapPick({ render: false });
        else activateFirstCreateBlankPick({ render: false });
        recompute();
      });
    }
    [refs.productFactorA, refs.productFactorB].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        activateProductFactorPick(button.dataset.productFactorIndex);
      });
    });
    [refs.sesLeftButton, refs.sesFirstMapButton, refs.sesMiddleButton, refs.sesSecondMapButton, refs.sesRightButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        activateSesPick(button.dataset.sesPick || 'sheaf-a');
      });
    });
    [refs.blowupBaseButton, refs.blowupPointButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        activateBlowupPick(button.dataset.blowupPick || 'base');
      });
    });
    if (refs.tautologicalSesBaseButton) {
      refs.tautologicalSesBaseButton.addEventListener('click', () => {
        activateTautologicalSesPick();
      });
    }
    if (refs.grassmannianMapBundleButton) {
      refs.grassmannianMapBundleButton.addEventListener('click', () => {
        activateGrassmannianMapPick();
      });
    }
    [refs.grassmannianMapR, refs.grassmannianMapN].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        syncGrassmannianMapControls();
        normalizeControlVisibility();
      });
      input.addEventListener('change', () => {
        syncGrassmannianMapControls();
        normalizeControlVisibility();
        recompute();
      });
    });
    (refs.pointNamePresets || []).forEach((button) => {
      button.addEventListener('click', () => {
        if (refs.varietyType?.value !== 'point') return;
        refs.varietyName.value = sanitizeMathLabel(button.dataset.pointVarietyName, POINT_VARIETY_NAMES[0]);
        state.draftVarietyNameDirty = true;
        updateInputEditorTitles();
        syncDefaultSheafName();
      });
    });
    if (refs.inputPickMode) {
      refs.inputPickMode.addEventListener('click', () => {
        setCanvasPickEnabled(false);
        normalizeControlVisibility();
      });
    }
    if (refs.importPresetToggle) {
      refs.importPresetToggle.addEventListener('click', () => {
        const show = !!refs.importPresetPanel?.hidden;
        setPresetImportPanelVisible(show);
      });
    }
    if (refs.importPresetCancel) {
      refs.importPresetCancel.addEventListener('click', () => {
        if (refs.importPresetInput) refs.importPresetInput.value = '';
        setPresetImportPanelVisible(false);
      });
    }
    if (refs.importPresetApply) {
      refs.importPresetApply.addEventListener('click', () => {
        try {
          importPresetFromText(refs.importPresetInput?.value || '');
        } catch (error) {
          showPresetImportMessage(error?.message || 'Unable to import preset.', true);
          reportInputActionError(error);
        }
      });
    }
    refs.addObject.addEventListener('click', () => {
      try {
        const kind = currentInputKind();
        const modifying = inputIsModifyMode();
        const selectingBuiltAbelJacobi = !modifying && combinedAbelJacobiCreateMode();
        const changed = inputIsModifyMode()
          ? updateObjectFromDraft()
          : createObjectFromDraft();
        if (!changed) return;
        syncSheafBaseOptions(true);
        if (selectingBuiltAbelJacobi && changed?.id) {
          state.activeMapId = changed.id;
          state.activeSheafId = null;
          setInputMode('modify', { loadDraft: true });
          recompute();
          return;
        }
        if (modifying) {
          setCanvasPickEnabled(false, { render: false });
        } else {
          if (kind === 'sheaf') state.draftSheafBaseVarietyId = null;
          if (kind === 'number' && changed?.id) activateObject('number', changed.id, { mode: 'modify', loadDraft: true });
          setCanvasPickEnabled(false, { render: false });
        }
        recompute();
      } catch (error) {
        reportInputActionError(error);
      }
    });
    if (refs.deleteObject) {
      refs.deleteObject.addEventListener('click', () => {
        deleteActiveObject();
      });
    }
    refs.varietyType.addEventListener('change', () => {
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      if (refs.varietyType.value === 'curve') refs.dim.value = '1';
      else if (refs.varietyType.value === 'point') refs.dim.value = '0';
      else if (refs.varietyType.value === 'grassmannian') syncGrassmannianControls();
      else refs.dim.value = String(dim);
      if (refs.varietyType.value !== 'product') clearProductDraft();
      else if (inputIsCreateMode() && currentInputKind() === 'variety') activateProductFactorPick(0, { render: false });
      if (refs.varietyType.value === 'complete-intersection') syncCompleteIntersectionControls();
      updateProductDraftControls();
      normalizeControlVisibility();
      syncDefaultVarietyName();
      syncDefaultSheafName();
      if (refs.varietyType.value === 'product') renderCanvas(state.lastResult);
    });
    refs.dim.addEventListener('change', () => {
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = refs.varietyType.value === 'curve' ? '1' : (refs.varietyType.value === 'point' ? '0' : (refs.varietyType.value === 'grassmannian' ? String(syncGrassmannianControls().dim) : String(dim)));
      if (refs.varietyType.value === 'complete-intersection') syncCompleteIntersectionControls();
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    [refs.grassmannianR, refs.grassmannianN].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (refs.varietyType?.value !== 'grassmannian') return;
        syncGrassmannianControls();
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
      input.addEventListener('change', () => {
        if (refs.varietyType?.value !== 'grassmannian') return;
        syncGrassmannianControls();
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
    });
    refs.curveGenus.addEventListener('input', () => {
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.curveGenus.addEventListener('change', () => {
      refs.curveGenus.value = sanitizeGenusInput(refs.curveGenus.value);
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.ciDegrees.addEventListener('change', () => {
      syncCompleteIntersectionControls();
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    if (refs.ciEquationCount) {
      refs.ciEquationCount.addEventListener('input', () => {
        syncCompleteIntersectionControls({ source: 'count' });
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
      refs.ciEquationCount.addEventListener('change', () => {
        syncCompleteIntersectionControls({ source: 'count' });
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
    }
    if (refs.ciDegreeSliders) {
      refs.ciDegreeSliders.addEventListener('input', (event) => {
        const slider = event.target.closest('.ci-degree-slider');
        if (!slider) return;
        updateDegreeFromSlider(slider);
      });
      refs.ciDegreeSliders.addEventListener('change', (event) => {
        const slider = event.target.closest('.ci-degree-slider');
        if (!slider) return;
        updateDegreeFromSlider(slider);
      });
    }
    refs.varietyName.addEventListener('input', () => {
      state.draftVarietyNameDirty = true;
      updateInputEditorTitles();
      syncDefaultSheafName();
    });
    refs.varietyName.addEventListener('change', () => {
      refs.varietyName.value = normalizeDraftNameForKind('variety', refs.varietyName.value);
      updateInputEditorTitles();
      syncDefaultSheafName();
    });
    refs.sheafType.addEventListener('change', () => {
      const type = refs.sheafType.value;
      if (type !== 'map-operation') clearSheafMapDraft();
      if (type !== 'direct-sum' && type !== 'tensor') clearSheafBinaryDraft();
      if (type !== 'self-direct-sum') clearSheafSelfSumDraft();
      if (type !== 'ideal-sheaf') clearSheafIdealDraft();
      if (type !== 'schur') clearSheafSchurDraft();
      if (type === 'map-operation' && inputIsModifyMode()) {
        const sheaf = activeSheaf();
        if (sheafMapConstructionType(sheaf)) loadMapOperationSheafIntoDraft(sheaf);
      } else if (type === 'map-operation') {
        state.sheafMapPickTarget = 'map';
      } else if (type === 'ideal-sheaf' && inputIsModifyMode()) {
        const sheaf = activeSheaf();
        if (sheafIdealConstructionType(sheaf)) loadIdealSheafIntoDraft(sheaf);
      } else if (type === 'ideal-sheaf') {
        state.sheafIdealDraft = state.sheafIdealDraft || {};
      } else if (type === 'schur' && inputIsModifyMode()) {
        const sheaf = activeSheaf();
        if (sheafSchurConstructionType(sheaf)) loadSchurSheafIntoDraft(sheaf);
      } else if (type === 'schur') {
        state.sheafSchurDraft = state.sheafSchurDraft || {};
      } else if ((type === 'direct-sum' || type === 'tensor') && inputIsModifyMode()) {
        const sheaf = activeSheaf();
        if (sheafBinaryConstructionType(sheaf)) loadBinarySheafIntoDraft(sheaf);
      } else if (type === 'direct-sum' || type === 'tensor') {
        state.sheafBinaryPickTarget = 'left';
      } else if (type === 'self-direct-sum' && inputIsModifyMode()) {
        const sheaf = activeSheaf();
        if (sheafSelfSumConstructionType(sheaf)) loadSelfSumSheafIntoDraft(sheaf);
      } else if (type === 'self-direct-sum') {
        state.sheafSelfSumDraft = state.sheafSelfSumDraft || {};
      }
      syncDefaultRank(true);
      syncDefaultSheafName();
      normalizeControlVisibility();
      activateFirstCreateBlankPick({ kind: 'sheaf', render: false });
      renderCanvas(state.lastResult);
    });
    refs.sheafName.addEventListener('input', () => {
      state.draftSheafNameDirty = true;
      updateInputEditorTitles();
    });
    refs.sheafName.addEventListener('change', () => {
      refs.sheafName.value = normalizeDraftNameForKind('sheaf', refs.sheafName.value);
      updateInputEditorTitles();
    });
    if (refs.mapName) {
      refs.mapName.addEventListener('input', () => {
        state.draftMapNameDirty = true;
        updateInputEditorTitles();
      });
      refs.mapName.addEventListener('change', () => {
        refs.mapName.value = normalizeDraftNameForKind('map', refs.mapName.value);
        updateInputEditorTitles();
      });
    }
    if (refs.mapType) {
      refs.mapType.addEventListener('change', () => {
        syncMapTypeOptions();
        clearMapDraft();
        state.mapPickTarget = refs.mapType.value === 'composition' ? 'first' : (refs.mapType.value === 'abel-jacobi' ? 'curve' : 'domain');
        syncDefaultMapName(true);
        normalizeControlVisibility();
        activateFirstCreateBlankPick({ kind: 'map', render: false });
        updateMapDraftControls();
        renderCanvas(state.lastResult);
      });
    }
    if (refs.sesTailPointCount) {
      refs.sesTailPointCount.addEventListener('input', () => {
        setActiveSequenceTailPointCount(refs.sesTailPointCount.value);
      });
      refs.sesTailPointCount.addEventListener('change', () => {
        setActiveSequenceTailPointCount(refs.sesTailPointCount.value);
      });
      syncSequenceTailControls();
    }
    if (refs.mapPointCount) {
      refs.mapPointCount.addEventListener('input', () => {
        const map = selectedMap();
        if (!map) return;
        setMapPointCount(map, refs.mapPointCount.value);
        recompute();
      });
      refs.mapPointCount.addEventListener('change', () => {
        const map = selectedMap();
        if (!map) return;
        setMapPointCount(map, refs.mapPointCount.value);
        recompute();
      });
      syncMapCurveControls();
    }
    if (refs.mapLabelOffset) {
      refs.mapLabelOffset.addEventListener('input', () => {
        const map = selectedMap();
        if (!map) return;
        setMapLabelOffset(map, refs.mapLabelOffset.value);
        recompute();
      });
      refs.mapLabelOffset.addEventListener('change', () => {
        const map = selectedMap();
        if (!map) return;
        setMapLabelOffset(map, refs.mapLabelOffset.value);
        recompute();
      });
    }
    if (refs.standardMapCurve) {
      refs.standardMapCurve.addEventListener('click', () => {
        const map = selectedMap();
        if (!map) return;
        applyStandardMapCurve(map);
        recompute();
      });
    }
    if (refs.sheafBaseVariety) {
      refs.sheafBaseVariety.addEventListener('change', () => {
        if (refs.sheafBaseVariety.value) {
          state.activeVarietyId = refs.sheafBaseVariety.value;
          state.draftSheafBaseVarietyId = refs.sheafBaseVariety.value;
          clearSheafMapDraft();
          clearSheafBinaryDraft();
          clearSheafSelfSumDraft();
          clearSheafSchurDraft();
          updateSheafBaseButton();
        }
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
        recompute();
      });
    }
    if (refs.sheafBaseButton) {
      refs.sheafBaseButton.addEventListener('click', () => {
        if (!sheafBasePickInputMode()) return;
        setCanvasPickEnabled(true);
        normalizeControlVisibility();
      });
    }
    if (refs.sheafMapOperation) {
      refs.sheafMapOperation.addEventListener('change', () => {
        if (state.sheafMapDraft?.sheafId && !allowableSheafMapOperationSheaf(state.sheafMapDraft.sheafId)) {
          state.sheafMapDraft = { ...(state.sheafMapDraft || {}), sheafId: null };
          if (state.sheafMapPickTarget !== 'map') state.sheafMapPickTarget = 'sheaf';
        }
        updateSheafMapDraftControls();
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
        recompute();
      });
    }
    [refs.sheafMapExact, refs.sheafMapProper].forEach((control) => {
      if (!control) return;
      control.addEventListener('change', () => {
        syncDefaultSheafName();
        updateSheafMapDraftControls();
        recompute();
      });
    });
    [refs.sheafMapMapButton, refs.sheafMapSheafButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        setSheafMapPickTarget(button.dataset.sheafMapPick || 'map');
      });
    });
    [refs.sheafBinaryLeftButton, refs.sheafBinaryRightButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        setSheafBinaryPickTarget(button.dataset.sheafBinaryPick || 'left');
      });
    });
    if (refs.sheafSelfSumParentButton) {
      refs.sheafSelfSumParentButton.addEventListener('click', () => {
        setSheafSelfSumPickTarget();
      });
    }
    if (refs.sheafIdealMapButton) {
      refs.sheafIdealMapButton.addEventListener('click', () => {
        setSheafIdealPickTarget();
      });
    }
    if (refs.sheafIdealConfirm) {
      refs.sheafIdealConfirm.addEventListener('change', () => {
        updateSheafIdealDraftControls();
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
      });
    }
    if (refs.sheafSelfSumCount) {
      refs.sheafSelfSumCount.addEventListener('input', () => {
        updateSheafSelfSumDraftControls();
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
      });
      refs.sheafSelfSumCount.addEventListener('change', () => {
        refs.sheafSelfSumCount.value = String(currentSelfSumMultiplicity());
        updateSheafSelfSumDraftControls({ normalizeCount: true });
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
        recompute();
      });
    }
    if (refs.sheafBinaryExact) {
      refs.sheafBinaryExact.addEventListener('change', () => {
        syncDefaultSheafName();
        updateSheafBinaryDraftControls();
        recompute();
      });
    }
    if (refs.sheafSchurParentButton) {
      refs.sheafSchurParentButton.addEventListener('click', () => {
        setSheafSchurPickTarget();
      });
    }
    if (refs.sheafSchurPartition) {
      refs.sheafSchurPartition.addEventListener('input', () => {
        updateSheafSchurDraftControls();
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
      });
      refs.sheafSchurPartition.addEventListener('change', () => {
        const partition = currentSchurPartition() || [2, 1];
        refs.sheafSchurPartition.value = formatSchurPartitionInput(partition);
        updateSheafSchurDraftControls();
        syncDefaultRank(true);
        syncDefaultSheafName();
        normalizeControlVisibility();
        recompute();
      });
    }
    [refs.mapDomainButton, refs.mapCodomainButton, refs.mapFirstButton, refs.mapSecondButton, refs.mapAbelJacobiCurveButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        setMapPickTarget(button.dataset.mapPick || 'domain');
      });
    });
    refs.twist.addEventListener('change', () => {
      refs.twist.value = String(normalizedInt(refs.twist.value, -24, 24, 1));
      syncDefaultSheafName();
    });
    refs.basis.addEventListener('change', () => {
      const sheaf = activeSheaf();
      if (sheaf) sheaf.basis = normalizeBasisValue(refs.basis.value);
      syncClassDisplayControls();
      recompute();
    });
    if (refs.rootForm) {
      refs.rootForm.addEventListener('change', () => {
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.classTermOnly) {
      refs.classTermOnly.addEventListener('change', () => {
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.classTermIndex) {
      refs.classTermIndex.addEventListener('change', () => {
        const max = normalizedInt(refs.classTermIndex.max, 0, MAX_DIMENSION, MAX_DIMENSION);
        refs.classTermIndex.value = String(normalizedInt(refs.classTermIndex.value, 0, max, 1));
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.homologyHyperplaneSymbol) {
      refs.homologyHyperplaneSymbol.addEventListener('change', () => {
        updateHomologySymbol(HOMOLOGY_HYPERPLANE_CLASS, refs.homologyHyperplaneSymbol.value);
      });
    }
    if (refs.homologyPointSymbol) {
      refs.homologyPointSymbol.addEventListener('change', () => {
        updateHomologySymbol(HOMOLOGY_POINT_CLASS, refs.homologyPointSymbol.value);
      });
    }
    if (refs.homologyMapInputMode) {
      refs.homologyMapInputMode.addEventListener('change', () => {
        const openAssignmentKey = !activeHomologyMapContext()
          && !activeHomologySheafContext()
          && refs.homologyAssignmentForm
          && !refs.homologyAssignmentForm.hidden
          ? refs.homologyAssignmentForm.dataset.monomialKey || ''
          : '';
        state.homologyMapInputMode = refs.homologyMapInputMode.value === 'coefficients' ? 'coefficients' : 'formula';
        renderHomologyPanel(state.lastResult);
        if (openAssignmentKey) beginHomologyMonomialAssignment(openAssignmentKey);
      });
    }
    if (refs.homologyTransposeExpressions) {
      refs.homologyTransposeExpressions.addEventListener('click', () => {
        state.homologyExpressionTransposed = !state.homologyExpressionTransposed;
        renderHomologyPanel(state.lastResult);
      });
    }
    if (refs.homologyUpdateAll) {
      refs.homologyUpdateAll.addEventListener('click', updateAllHomologyAssignments);
    }
    if (refs.homologyExpressionPanel) {
      refs.homologyExpressionPanel.addEventListener('toggle', () => {
        state.homologyMapClassTableOpen = refs.homologyExpressionPanel.open;
      });
    }
    if (refs.homologyExpressionChart) {
      refs.homologyExpressionChart.addEventListener('click', (event) => {
        const button = event.target.closest('[data-homology-assign-monomial]');
        if (!button) return;
        beginHomologyMonomialAssignment(button.dataset.homologyAssignMonomial);
      });
    }
    if (refs.homologyAssignmentSave) {
      refs.homologyAssignmentSave.addEventListener('click', saveHomologyMonomialAssignmentFromControls);
    }
    if (refs.homologyAssignmentCancel) {
      refs.homologyAssignmentCancel.addEventListener('click', clearHomologyMonomialAssignmentForm);
    }
    if (refs.status) {
      refs.status.addEventListener('click', (event) => {
        const invariantChip = event.target.closest('[data-global-invariant-id]');
        if (!invariantChip) return;
        event.preventDefault();
        activateObject('number', invariantChip.dataset.globalInvariantId, { mode: 'modify', loadDraft: true });
        recompute();
      });
      refs.status.addEventListener('keydown', (event) => {
        const invariantChip = event.target.closest('[data-global-invariant-id]');
        if (!invariantChip || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        activateObject('number', invariantChip.dataset.globalInvariantId, { mode: 'modify', loadDraft: true });
        recompute();
      });
    }
    if (refs.globalInvariantName) {
      refs.globalInvariantName.addEventListener('input', () => {
        syncGlobalInvariantDraftControls();
        normalizeControlVisibility();
        updateInputEditorTitles();
      });
      refs.globalInvariantName.addEventListener('change', () => {
        if (globalInvariantNameIsValid(refs.globalInvariantName.value)) {
          refs.globalInvariantName.value = sanitizeGlobalInvariantName(refs.globalInvariantName.value, nextGlobalInvariantName());
        }
        syncGlobalInvariantDraftControls();
        normalizeControlVisibility();
        updateInputEditorTitles();
      });
    }
    if (refs.globalInvariantModeSymbolic) refs.globalInvariantModeSymbolic.addEventListener('change', syncGlobalInvariantDraftControls);
    if (refs.globalInvariantModeInteger) refs.globalInvariantModeInteger.addEventListener('change', syncGlobalInvariantDraftControls);
    if (refs.globalInvariantValue) {
      refs.globalInvariantValue.addEventListener('change', () => {
        refs.globalInvariantValue.value = sanitizeIntegerString(refs.globalInvariantValue.value, '0');
      });
    }
    if (refs.homologyAssignmentRhs) {
      refs.homologyAssignmentRhs.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        saveHomologyMonomialAssignmentFromControls();
      });
    }
    if (refs.homologyAssignmentCoefficients) {
      refs.homologyAssignmentCoefficients.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const input = event.target.closest('[data-homology-assignment-coeff]');
        if (!input) return;
        event.preventDefault();
        saveHomologyMonomialAssignmentFromControls();
      });
    }
    if (refs.homologyRules) {
      refs.homologyRules.addEventListener('input', (event) => {
        const mapInput = event.target.closest('input[data-map-homology-rule]');
        if (mapInput) {
          const toggle = mapInput.closest('.homology-rule-row')?.querySelector('[data-map-homology-assign]');
          if (toggle && String(mapInput.value || '').trim()) toggle.checked = true;
          return;
        }
        const sheafInput = event.target.closest('input[data-sheaf-homology-rule], [data-sheaf-homology-coeff]');
        if (sheafInput) {
          const toggle = sheafInput.closest('.homology-rule-row')?.querySelector('[data-sheaf-homology-assign]');
          if (toggle && String(sheafInput.value || '').trim()) toggle.checked = true;
        }
      });
      refs.homologyRules.addEventListener('change', (event) => {
        const toggle = event.target.closest('[data-homology-rule-toggle]');
        if (toggle) {
          setHomologyRuleEnabled(toggle.dataset.homologyRuleToggle, toggle.checked);
          return;
        }
      });
      refs.homologyRules.addEventListener('keydown', (event) => {
        const input = event.target.closest('input[data-map-homology-rule]');
        const coefficientInput = event.target.closest('[data-map-homology-coeff]');
        const sheafInput = event.target.closest('input[data-sheaf-homology-rule]');
        const sheafCoefficientInput = event.target.closest('[data-sheaf-homology-coeff]');
        if ((!input && !coefficientInput && !sheafInput && !sheafCoefficientInput) || event.key !== 'Enter') return;
        event.preventDefault();
        updateAllHomologyAssignments();
      });
      refs.homologyRules.addEventListener('click', (event) => {
        const tangentClassButton = event.target.closest('[data-add-tangent-chern-class]');
        if (tangentClassButton) {
          addTangentChernClassToBaseHomology(normalizedInt(tangentClassButton.dataset.addTangentChernClass, 1, MAX_DIMENSION, 1));
          return;
        }
        const button = event.target.closest('[data-homology-rule-delete]');
        if (!button) return;
        deleteHomologyRule(button.dataset.homologyRuleDelete);
      });
    }
    if (refs.homologySymbols) {
      refs.homologySymbols.addEventListener('change', (event) => {
        const symbolInput = event.target.closest('[data-homology-class-symbol]');
        if (symbolInput) {
          updateHomologySymbol(symbolInput.dataset.homologyClassSymbol, symbolInput.value);
          return;
        }
        const degreeInput = event.target.closest('[data-homology-class-degree]');
        if (degreeInput) updateHomologyClassDegree(degreeInput.dataset.homologyClassDegree, degreeInput.value);
      });
      refs.homologySymbols.addEventListener('click', (event) => {
        const button = event.target.closest('[data-homology-class-delete]');
        if (!button) return;
        deleteHomologyClass(button.dataset.homologyClassDelete);
      });
    }
    if (refs.homologyClassDegree) {
      refs.homologyClassDegree.addEventListener('change', () => {
        const geometry = activeHomologyGeometry();
        refs.homologyClassDegree.value = String(normalizedInt(refs.homologyClassDegree.value, 0, 2 * (geometry?.dim ?? MAX_DIMENSION), 2));
      });
    }
    if (refs.homologyAddClassButton) {
      refs.homologyAddClassButton.addEventListener('click', addHomologyClassFromControls);
    }
    if (refs.homologyAddRuleButton) {
      refs.homologyAddRuleButton.addEventListener('click', addHomologyRuleFromControls);
    }
    if (refs.resetMapPick) {
      refs.resetMapPick.addEventListener('click', () => {
        clearMapDraft();
        recompute();
      });
    }
    refs.rank.addEventListener('change', () => {
      refs.rank.value = sanitizeRankInput(refs.rank.value);
      syncDefaultSheafName();
    });
    if (refs.exportClasses) {
      refs.exportClasses.addEventListener('click', () => openChartExport('classes'));
    }
    if (refs.furtherSimplify) {
      refs.furtherSimplify.addEventListener('click', () => {
        state.homologyRulePasses += 1;
        recompute();
      });
    }
    if (refs.toggleHodgeCard) {
      refs.toggleHodgeCard.addEventListener('click', () => toggleChartReveal('hodge'));
    }
    if (refs.toggleClassCard) {
      refs.toggleClassCard.addEventListener('click', () => toggleChartReveal('classes'));
    }
    if (refs.toggleCohomologyCard) {
      refs.toggleCohomologyCard.addEventListener('click', () => toggleChartReveal('cohomology'));
    }
    if (refs.exportHodge) {
      refs.exportHodge.addEventListener('click', () => openChartExport('hodge'));
    }
    if (refs.cohomologyDimOnly) {
      refs.cohomologyDimOnly.addEventListener('change', () => {
        if (state.lastResult) {
          renderSheafCohomologyChart(state.lastResult);
          typeset(refs.cohomologyChart);
        }
      });
    }
    if (refs.clearCanvas) {
      refs.clearCanvas.addEventListener('click', clearCanvasObjects);
    }
    if (refs.showCanvas) {
      refs.showCanvas.addEventListener('click', showHiddenCanvasObjects);
    }
    if (refs.homologyGrassmannianYoungBasis) {
      refs.homologyGrassmannianYoungBasis.addEventListener('change', () => {
        const variety = activeHomologyVariety();
        if (!variety || variety.type !== 'grassmannian') return;
        resetHomologyRulePasses();
        variety.grassmannianYoungBasis = refs.homologyGrassmannianYoungBasis.checked;
        recompute();
      });
    }
    refs.refreshExport.addEventListener('click', () => refreshExport('main'));
    refs.copyExport.addEventListener('click', copyExport);
    refs.exportFormat.addEventListener('change', () => refreshExport());
    refs.hodgeExpanded.addEventListener('change', () => {
      state.hodgeExpanded = refs.hodgeExpanded.checked;
      if (state.lastResult?.hodge) {
        renderHodgeChart(state.lastResult);
        typeset(refs.hodgeChart);
      }
    });
    if (refs.toggleHodgeWide) {
      refs.toggleHodgeWide.addEventListener('click', () => {
        setHodgeWide(!state.hodgeWide);
      });
    }
    if (refs.hodgeCellSize) {
      refs.hodgeCellSize.addEventListener('input', () => {
        setHodgeCellSize(refs.hodgeCellSize.value);
      });
      refs.hodgeCellSize.addEventListener('change', () => {
        setHodgeCellSize(refs.hodgeCellSize.value);
      });
    }
    refs.canvasLabels.addEventListener('click', (event) => {
      if (Date.now() < state.suppressLabelClickUntil) return;
      const invariantChip = event.target.closest('[data-global-invariant-id]');
      if (invariantChip) {
        event.preventDefault();
        activateObject('number', invariantChip.dataset.globalInvariantId, { mode: 'modify', loadDraft: true });
        recompute();
        return;
      }
      const sequenceControl = event.target.closest('[data-object-kind="sequence"][data-object-id]');
      if (sequenceControl) {
        event.preventDefault();
        event.stopPropagation();
        activateObject('sequence', sequenceControl.dataset.objectId, { mode: 'modify', loadDraft: true });
        recompute();
        return;
      }
      if (event.target.closest('[data-map-control]')) return;
      const target = canvasObjectLabelFromEvent(event);
      if (!target) return;
      if (handleCanvasPickClick(target)) return;
      selectObject(target.dataset.objectKind, target.dataset.objectId);
    });
    refs.canvasLabels.addEventListener('keydown', (event) => {
      const invariantChip = event.target.closest('[data-global-invariant-id]');
      if (invariantChip && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activateObject('number', invariantChip.dataset.globalInvariantId, { mode: 'modify', loadDraft: true });
        recompute();
        return;
      }
      const sequenceTailControl = event.target.closest('[data-sequence-tail-control]');
      if (sequenceTailControl && handleSequenceTailControlKey(event, sequenceTailControl)) {
        return;
      }
      const sequenceControl = event.target.closest('[data-object-kind="sequence"][data-object-id]');
      if (sequenceControl && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activateObject('sequence', sequenceControl.dataset.objectId, { mode: 'modify', loadDraft: true });
        recompute();
        return;
      }
      const control = event.target.closest('[data-map-control]');
      if (control) {
        handleMapControlKey(event, control);
        return;
      }
      const target = canvasObjectLabelFromEvent(event);
      if (!target) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (handleCanvasPickClick(target)) return;
        selectObject(target.dataset.objectKind, target.dataset.objectId);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const kind = target.dataset.objectKind;
        activateObject(kind, target.dataset.objectId);
        deleteActiveObject(kind);
      }
    });
    refs.canvasLabels.addEventListener('contextmenu', handleCanvasLabelContextMenu, true);
    refs.canvasLabels.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const sequenceTailControl = event.target.closest('[data-sequence-tail-control]');
      if (sequenceTailControl) {
        startSequenceTailDrag(sequenceTailControl, event);
        return;
      }
      const control = event.target.closest('[data-map-control]');
      if (control) {
        startMapControlDrag(control, event);
        return;
      }
      const target = canvasObjectLabelFromEvent(event);
      if (!target) return;
      if (state.canvasPickEnabled) return;
      if (currentInputKind() === 'map' && inputIsCreateMode() && ordinaryMapInputMode()) {
        if (shouldUseMapCanvasDrag(target)) startMapCanvasDrag(target, event);
        return;
      }
      startCanvasLabelDrag(target, event);
    });
    syncMapCurveControls();
    refs.hodgeChart.addEventListener('click', toggleHodgeExpanded);
    refs.hodgeChart.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleHodgeExpanded();
    });
  }

  function activeHomologyGeometry() {
    const variety = activeHomologyVariety();
    return variety ? geometryFromVariety(variety) : null;
  }

  function activeHomologyMapContext() {
    const map = activeMap();
    if (!map || (inputIsModifyMode() && modifyKind() !== 'map')) return null;
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const domain = state.varieties.find((item) => item.id === map.domainId);
    const codomain = state.varieties.find((item) => item.id === map.codomainId);
    if (!domain || !codomain) return null;
    const domainGeometry = geometryFromVariety(domain);
    const codomainGeometry = geometryFromVariety(codomain);
    return {
      map,
      domain: { variety: domain, geometry: domainGeometry },
      codomain: { variety: codomain, geometry: codomainGeometry }
    };
  }

  function activeHomologyVariety() {
    if (inputIsModifyMode()) return modifyKind() === 'variety' ? selectedVariety() : null;
    return activeVariety() || selectedVariety();
  }

  function activeHomologySheafContext(result = state.lastResult) {
    const sheafObject = selectedSheaf();
    if (!inputIsModifyMode() || !sheafObject || activeMap() || modifyKind() !== 'sheaf') return null;
    const variety = baseVarietyForSheaf(sheafObject);
    if (!variety) return null;
    const geometry = result?.geometry?.varietyId === variety.id
      ? result.geometry
      : geometryFromVariety(variety);
    if (!geometry) return null;
    const sheaf = result?.sheaf?.sourceObject === sheafObject
      ? result.sheaf
      : sheafFromObject(sheafObject, geometry);
    return { sheafObject, sheaf, variety, geometry, result };
  }

  function activeHomologyContext(result = state.lastResult) {
    const map = activeHomologyMapContext();
    if (map) return { kind: 'map', ...map };
    const sheaf = activeHomologySheafContext(result);
    if (sheaf) return { kind: 'sheaf', ...sheaf };
    const variety = activeHomologyVariety();
    if (!variety) return { kind: 'empty' };
    const geometry = result?.geometry?.homology && result.geometry.varietyId === variety.id
      ? result.geometry
      : geometryFromVariety(variety);
    return geometry ? { kind: 'variety', variety, geometry, result } : { kind: 'empty' };
  }

  function updateHomologySymbol(classId, value) {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const def = homologyClassDefById(geometry, classId);
    if (!def) return;
    const homology = ensureHomologySystem(variety, geometry);
    homology.classes[classId] = homology.classes[classId] || {};
    homology.classes[classId].symbol = sanitizeHomologySymbol(value, def.defaultSymbol);
    const custom = homology.customClasses?.find((item) => item.id === classId);
    if (custom) custom.symbol = homology.classes[classId].symbol;
    recompute();
  }

  function updateHomologyClassDegree(classId, value) {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    const custom = homology.customClasses.find((item) => item.id === classId);
    if (!custom) return;
    const variableId = homologyVariableId(classId, geometry);
    const cohomologyDegree = normalizedInt(value, 0, 2 * geometry.dim, custom.cohomologyDegree ?? homologyClassCohomologyDegree(custom));
    custom.cohomologyDegree = cohomologyDegree;
    custom.degree = cohomologyDegree / 2;
    homology.rules = homology.rules.filter((rule) => rule.builtin || !homologyRuleContainsVariable(rule, variableId));
    recompute();
  }

  function setHomologyRuleEnabled(ruleId, enabled) {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    const rule = homology.rules.find((item) => item.id === ruleId);
    if (!rule) return;
    rule.enabled = !!enabled;
    recompute();
  }

  function addTangentChernClassToBaseHomology(index) {
    resetHomologyRulePasses();
    const context = activeHomologySheafContext();
    if (!context || !tangentChernClassRowCanAdd(context, index)) return;
    const { variety, geometry } = context;
    const homology = ensureHomologySystem(variety, geometry);
    const id = tangentChernHomologyClassId(index);
    const symbol = tangentChernHomologyClassSymbol(geometry, index);
    if (!homology.customClasses.some((item) => item.id === id)) {
      homology.customClasses.push({
        id,
        symbol,
        degree: index,
        special: 'tangent-chern'
      });
    }
    homology.classes[id] = { ...(homology.classes[id] || {}), symbol };
    recompute();
    if (refs.homologyMessage) refs.homologyMessage.textContent = `Added c_${index}(${geometry.labelPlain}) to homology of ${geometry.labelPlain}.`;
  }

  function deleteHomologyRule(ruleId) {
    resetHomologyRulePasses();
    const context = activeHomologyContext();
    if (context.kind === 'map') {
      if (deleteMapHomologyRuleById(ruleId)) recompute();
      return;
    }
    if (context.kind === 'sheaf') {
      if (deleteSheafHomologyRuleById(ruleId, context)) recompute();
      return;
    }
    const variety = context.kind === 'variety' ? context.variety : null;
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    homology.rules = homology.rules.filter((rule) => rule.builtin || rule.id !== ruleId);
    recompute();
  }

  function deleteMapHomologyRuleById(ruleId) {
    const context = activeHomologyMapContext();
    if (!context) return false;
    let changed = false;
    [context.domain, context.codomain].forEach((entry) => {
      const homology = ensureHomologySystem(entry.variety, entry.geometry);
      const before = homology.rules.length;
      homology.rules = homology.rules.filter((rule) => rule.builtin || rule.id !== ruleId);
      if (homology.rules.length !== before) changed = true;
    });
    return changed;
  }

  function deleteSheafHomologyRuleById(ruleId, context = activeHomologySheafContext()) {
    if (!context?.sheafObject || !context.geometry) return false;
    const homology = ensureSheafHomologySystem(context.sheafObject, context.geometry);
    const before = homology.rules.length;
    homology.rules = homology.rules.filter((rule) => rule.builtin || rule.id !== ruleId);
    return homology.rules.length !== before;
  }

  function addHomologyClassFromControls() {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = activeHomologyGeometry();
    if (!geometry) return;
    const homology = ensureHomologySystem(variety, geometry);
    const symbol = sanitizeHomologySymbol(refs.homologyClassSymbol?.value || '', nextHomologyClassSymbol(homology, geometry));
    const cohomologyDegree = normalizedInt(refs.homologyClassDegree?.value, 0, 2 * geometry.dim, Math.min(2, 2 * geometry.dim));
    const degree = cohomologyDegree / 2;
    const id = nextInputId('C');
    homology.customClasses.push({ id, symbol, degree, cohomologyDegree });
    homology.classes[id] = { symbol };
    if (refs.homologyClassSymbol) refs.homologyClassSymbol.value = '';
    if (refs.homologyClassDegree) refs.homologyClassDegree.value = String(Math.min(2, 2 * geometry.dim));
    recompute();
  }

  function deleteHomologyClass(classId) {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    const variableId = homologyVariableId(classId, geometry);
    homology.customClasses = homology.customClasses.filter((item) => item.id !== classId);
    delete homology.classes[classId];
    homology.rules = homology.rules.filter((rule) => rule.builtin || !homologyRuleContainsVariable(rule, variableId));
    recompute();
  }

  function addHomologyRuleFromControls() {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety) return;
    const geometry = activeHomologyGeometry();
    if (!geometry) return;
    const homology = ensureHomologySystem(variety, geometry);
    let rule;
    try {
      rule = parseHomologyRuleEquation(refs.homologyRuleEquation?.value || '', geometry);
    } catch (error) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid rule.';
      return;
    }
    const validationMessage = validateHomologyRuleInput(rule, { ...geometry, homology });
    if (validationMessage) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = validationMessage;
      return;
    }
    homology.rules.push(rule);
    if (refs.homologyRuleEquation) refs.homologyRuleEquation.value = '';
    if (refs.homologyMessage) refs.homologyMessage.textContent = '';
    recompute();
  }

  function beginHomologyMonomialAssignment(key) {
    const variety = activeHomologyVariety();
    if (!variety || !key || !refs.homologyAssignmentForm) return;
    const geometry = activeHomologyGeometry() || geometryFromVariety(variety);
    if (!geometry) return;
    const reductionMessage = homologyMonomialReductionWarning(geometry, key, null, 'left');
    if (reductionMessage) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = reductionMessage;
      return;
    }
    defineHomologyVariables(geometry);
    refs.homologyAssignmentForm.hidden = false;
    refs.homologyAssignmentForm.dataset.monomialKey = key;
    if (refs.homologyAssignmentLhs) {
      setInlineMath(refs.homologyAssignmentLhs, `${monomialLatex(key)}=`);
    }
    renderHomologyMonomialAssignmentEditor(key, geometry);
  }

  function rerenderHomologyMonomialAssignmentForm() {
    if (!refs.homologyAssignmentForm || refs.homologyAssignmentForm.hidden) return;
    const key = refs.homologyAssignmentForm.dataset.monomialKey || '';
    const variety = activeHomologyVariety();
    if (!key || !variety) return;
    const geometry = activeHomologyGeometry() || geometryFromVariety(variety);
    if (!geometry) return;
    renderHomologyMonomialAssignmentEditor(key, geometry);
  }

  function renderHomologyMonomialAssignmentEditor(key, geometry) {
    const coefficientMode = state.homologyMapInputMode === 'coefficients';
    if (refs.homologyAssignmentRhs) {
      refs.homologyAssignmentRhs.hidden = coefficientMode;
      refs.homologyAssignmentRhs.value = '';
      refs.homologyAssignmentRhs.placeholder = homologyAssignmentPlaceholder(key, geometry);
    }
    if (refs.homologyAssignmentCoefficients) {
      refs.homologyAssignmentCoefficients.hidden = !coefficientMode;
      refs.homologyAssignmentCoefficients.innerHTML = coefficientMode
        ? renderHomologyMonomialAssignmentCoefficientEditor(key, geometry)
        : '';
    }
    const focusTarget = coefficientMode
      ? refs.homologyAssignmentCoefficients?.querySelector('[data-homology-assignment-coeff]')
      : refs.homologyAssignmentRhs;
    if (refs.homologyAssignmentForm) typeset(refs.homologyAssignmentForm);
    focusTarget?.focus();
  }

  function clearHomologyMonomialAssignmentForm() {
    if (!refs.homologyAssignmentForm) return;
    refs.homologyAssignmentForm.hidden = true;
    refs.homologyAssignmentForm.dataset.monomialKey = '';
    if (refs.homologyAssignmentLhs) refs.homologyAssignmentLhs.textContent = '';
    if (refs.homologyAssignmentRhs) refs.homologyAssignmentRhs.value = '';
    if (refs.homologyAssignmentCoefficients) refs.homologyAssignmentCoefficients.innerHTML = '';
  }

  function saveHomologyMonomialAssignmentFromControls() {
    resetHomologyRulePasses();
    const variety = activeHomologyVariety();
    if (!variety || !refs.homologyAssignmentForm) return;
    const key = refs.homologyAssignmentForm.dataset.monomialKey || '';
    if (!key) return;
    const geometry = activeHomologyGeometry() || geometryFromVariety(variety);
    if (!geometry) return;
    const rhsTerms = state.homologyMapInputMode === 'coefficients'
      ? readHomologyMonomialAssignmentCoefficientTerms()
      : readHomologyMonomialAssignmentFormulaTerms(geometry);
    if (!rhsTerms) return;
    const rule = {
      id: `monomial-rule-${hashString(key)}`,
      builtin: false,
      enabled: true,
      lhs: { powers: parseMonoKey(key) },
      rhs: rhsTerms
    };
    const defs = homologyClassDefinitions(geometry);
    if (!homologyRulePreservesDegree(rule, defs, { geometry })) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = 'Rule degrees must match.';
      return;
    }
    const homology = ensureHomologySystem(variety, geometry);
    const validationMessage = validateHomologyRuleInput(rule, { ...geometry, homology });
    if (validationMessage) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = validationMessage;
      return;
    }
    homology.rules = withoutHomologyRuleForMonomial(homology.rules, key);
    homology.rules.push(rule);
    clearHomologyMonomialAssignmentForm();
    recompute();
    if (refs.homologyMessage) refs.homologyMessage.textContent = 'Assigned monomial.';
  }

  function homologyAssignmentPlaceholder(key, geometry) {
    const degree = homologyPowersCohomologyDegree(parseMonoKey(key), homologyClassDefinitions(geometry), { geometry });
    if (degree === 0) return '1';
    const productBidegree = productHomologyBidegreeForPowers(parseMonoKey(key), geometry);
    const expressions = homologyDisplayMonomialsOfCohomologyDegree(geometry, degree, { productBidegree })
      .filter((mono) => mono.key !== key)
      .filter((mono) => homologyMonomialIsRuleNormalForm(geometry, mono.key))
      .slice(0, 3)
      .map((mono) => mono.plain || mono.latex || '1');
    return expressions.join('+') || '0';
  }

  function readHomologyMonomialAssignmentFormulaTerms(geometry) {
    const value = String(refs.homologyAssignmentRhs?.value || '').trim();
    if (!value) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = 'Enter the assigned expression.';
      return null;
    }
    try {
      return serializeHomologyPoly(parseHomologyExpression(value, geometry, { side: 'right' }));
    } catch (error) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid right side.';
      return null;
    }
  }

  function readHomologyMonomialAssignmentCoefficientTerms() {
    const terms = [];
    let sawInput = false;
    for (const input of refs.homologyAssignmentCoefficients?.querySelectorAll('[data-homology-assignment-coeff]') || []) {
      const raw = String(input.value || '').trim();
      if (!raw) continue;
      sawInput = true;
      let coefficient;
      try {
        coefficient = parseRuleCoefficient(raw);
      } catch (error) {
        if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid coefficient.';
        return null;
      }
      if (coefficient.isZero()) continue;
      terms.push({
        coefficient: formatFractionPlain(coefficient),
        powers: parseMonoKey(input.dataset.monomialKey || '')
      });
    }
    return sawInput || !terms.length ? terms : null;
  }

  function renderHomologyMonomialAssignmentCoefficientEditor(key, geometry) {
    const cohomologyDegree = homologyPowersCohomologyDegree(parseMonoKey(key), homologyClassDefinitions(geometry), { geometry });
    if (cohomologyDegree == null) return '<span class="homology-coefficient-empty">0</span>';
    const productBidegree = productHomologyBidegreeForPowers(parseMonoKey(key), geometry);
    const terms = homologyDisplayMonomialsOfCohomologyDegree(geometry, cohomologyDegree, { productBidegree })
      .filter((mono) => mono.key !== key)
      .filter((mono) => homologyMonomialIsRuleNormalForm(geometry, mono.key));
    if (!terms.length) return '<span class="homology-coefficient-empty">0</span>';
    return terms.map((mono, index) => `
      ${index ? '<span class="homology-coefficient-plus">+</span>' : ''}
      <label class="homology-coefficient-term">
        <input class="sheaf-input homology-coefficient-input" type="text" value="" placeholder="0" spellcheck="false" autocomplete="off" aria-label="Coefficient of ${escapeHtml(mono.plain || '1')}" data-homology-assignment-coeff data-monomial-key="${escapeHtml(mono.key)}">
        <span>\\(${mono.latex || '1'}\\)</span>
      </label>
    `).join('');
  }

  function createProductVariety(data) {
    const variety = {
      id: nextInputId('X'),
      type: 'abstract',
      dim: String(data.dim),
      name: uniqueConstructedObjectName('variety', data.name),
      genus: 'g',
      ciDegrees: '',
      nameDirty: data.nameDirty,
      construction: {
        type: 'product',
        varietyIds: [data.left.id, data.right.id],
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(variety, 'variety');
    positionProductVarietyLabel(variety, data.left, data.right);
    state.varieties.push(variety);
    state.activeSequenceId = null;
    state.activeVarietyId = variety.id;
    state.activeSheafId = null;
    state.activeMapId = null;
    createProjectionMapForProduct(variety, data.left, 0);
    createProjectionMapForProduct(variety, data.right, 1);
    return variety;
  }

  function createJacobianVariety(curve) {
    const curveGeometry = geometryFromVariety(curve);
    const genus = abelJacobiCurveGenus(curveGeometry);
    if (genus == null) return null;
    const defaultName = defaultJacobianNameFromCurve(curve);
    const variety = {
      id: nextInputId('X'),
      type: 'abelian',
      dim: String(genus),
      name: uniqueConstructedObjectName('variety', defaultName),
      genus: 'g',
      ciDegrees: '',
      nameDirty: false,
      specialLabels: ['jacobian'],
      construction: {
        type: 'jacobian',
        curveId: curve.id,
        defaultName,
        nameDirty: false
      }
    };
    ensureThetaClass(variety);
    syncObjectLineage(variety, 'variety');
    positionJacobianVarietyLabel(variety, curve);
    state.varieties.push(variety);
    avoidCanvasLabelOverlap(variety);
    return variety;
  }

  function ensureThetaClass(variety) {
    if (!variety) return;
    const homology = variety.homology && typeof variety.homology === 'object' ? variety.homology : {};
    homology.classes = homology.classes && typeof homology.classes === 'object' ? homology.classes : {};
    homology.classes[HOMOLOGY_THETA_CLASS] = {
      ...(homology.classes[HOMOLOGY_THETA_CLASS] || {}),
      symbol: sanitizeHomologySymbol(homology.classes[HOMOLOGY_THETA_CLASS]?.symbol, '\\Theta')
    };
    variety.homology = homology;
  }

  function ensureCurveSymplecticBasis(curve) {
    const geometry = geometryFromVariety(curve);
    const genus = abelJacobiCurveGenus(geometry);
    if (genus == null || genus === 0) return true;
    const homology = curve.homology && typeof curve.homology === 'object' ? curve.homology : {};
    if (homology.symplecticBasisConfirmed) return true;
    homology.symplecticBasisConfirmed = true;
    curve.homology = homology;
    geometryFromVariety(curve);
    return true;
  }

  function createProjectionMapForProduct(product, factor, factorIndex) {
    if (!product || !factor) return null;
    const defaultName = defaultProjectionMapNameFromObjects(product, factor, factorIndex);
    const map = createMapObject(
      { kind: 'variety', id: product.id },
      { kind: 'variety', id: factor.id },
      {
        name: uniqueConstructedObjectName('map', defaultName),
        activate: false,
        autoBend: true,
        syncDraft: false,
        construction: {
          type: 'projection',
          productId: product.id,
          factorIndex,
          defaultName,
          nameDirty: false
        }
      }
    );
    if (map) map.nameDirty = false;
    return map;
  }

  function positionProductVarietyLabel(product, left, right) {
    if (!product || !left || !right) {
      positionVarietyOnCanvas(product);
      return;
    }
    const leftX = Number.isFinite(left.labelX) ? left.labelX : 0.35;
    const rightX = Number.isFinite(right.labelX) ? right.labelX : 0.65;
    const leftY = Number.isFinite(left.labelY) ? left.labelY : 0.42;
    const rightY = Number.isFinite(right.labelY) ? right.labelY : leftY;
    const averageY = (leftY + rightY) / 2;
    product.labelX = clamp((leftX + rightX) / 2, 0.08, 0.94);
    product.labelY = clamp(averageY - Math.max(0.11, canvasSpacingRatio('y') * 0.72), 0.08, 0.92);
    avoidCanvasLabelVerticalOverlap(product);
  }

  function avoidCanvasLabelVerticalOverlap(object) {
    if (!object) return;
    const thresholdX = 0.055;
    const thresholdY = 0.055;
    const startY = Number.isFinite(object.labelY) ? object.labelY : 0.5;
    const existing = [...state.varieties, ...state.sheaves];
    for (let step = 0; step < 8; step += 1) {
      const candidateY = clamp(startY - step * 0.045, 0.08, 0.92);
      const overlaps = existing.some((item) => (
        item.id !== object.id
        && Number.isFinite(item.labelX)
        && Number.isFinite(item.labelY)
        && Math.abs(item.labelX - object.labelX) < thresholdX
        && Math.abs(item.labelY - candidateY) < thresholdY
      ));
      if (!overlaps) {
        object.labelY = candidateY;
        return;
      }
    }
  }

  function createBinarySheafConstruction(data) {
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: constructionRankPlaceholder(data.operation, data.left, data.right),
      baseVarietyId: data.baseVarietyId,
      basis: 'chern',
      nameDirty: data.nameDirty,
      construction: {
        type: data.operation === 'direct-sum-sheaf' ? 'direct-sum' : 'tensor',
        sheafIds: [data.left.id, data.right.id],
        derived: data.operation === 'tensor-sheaf' ? !!data.derived : false,
        exact: data.operation === 'tensor-sheaf' ? !!data.exact : true,
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    return addSheafObject(sheaf);
  }

  function createSelfSumSheafConstruction(data) {
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: selfSumRankPlaceholder(data.parent, data.multiplicity),
      baseVarietyId: data.baseVarietyId,
      basis: 'chern',
      nameDirty: data.nameDirty,
      construction: {
        type: 'self-direct-sum',
        sheafId: data.parent.id,
        multiplicity: data.multiplicity,
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    return addSheafObject(sheaf);
  }

  function createIdealSheafConstruction(data, options = {}) {
    if (!data?.map || !data.domain || !data.codomain) return null;
    const replacing = options.replaceSheaf || null;
    if (replacing) cleanupIdealSheafScaffolding(replacing);
    const sourceStructure = ensureStructureSheafForVariety(data.domain);
    const targetStructure = ensureStructureSheafForVariety(data.codomain);
    if (!sourceStructure || !targetStructure) return null;
    const pushedStructure = ensureIdealPushforwardSheaf(data, sourceStructure);
    if (!pushedStructure) return null;
    const ideal = replacing || {
      id: nextInputId('E')
    };
    const oldBaseId = ideal.baseVarietyId;
    Object.assign(ideal, {
      type: 'abstract',
      name: replacing ? data.name : uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: 'r',
      baseVarietyId: data.codomain.id,
      basis: 'chern',
      nameDirty: data.nameDirty,
      hiddenOnCanvas: false,
      construction: {
        type: 'ses-term',
        role: 'subobject',
        sourceSheafIds: [targetStructure.id, pushedStructure.id],
        idealSheafMapId: data.map.id,
        structureSheafId: sourceStructure.id,
        targetStructureSheafId: targetStructure.id,
        pushforwardSheafId: pushedStructure.id,
        defaultName: data.defaultName
      }
    });
    syncObjectLineage(ideal, 'sheaf');
    if (!replacing) {
      positionSheafNearBase(ideal, data.codomain);
      avoidCanvasLabelOverlap(ideal);
      addSheafObject(ideal, { activate: false });
    } else if (oldBaseId !== ideal.baseVarietyId) {
      positionSheafNearBase(ideal, data.codomain);
      avoidCanvasLabelOverlap(ideal);
    }
    const sequence = createShortExactSequenceFromObjects({
      sheafA: ideal,
      sheafB: targetStructure,
      sheafC: pushedStructure,
      baseVarietyId: data.codomain.id,
      autoMapABName: '\\iota',
      autoMapBCName: '\\pi'
    });
    if (sequence) {
      ideal.construction.sequenceId = sequence.id;
      ideal.construction.inclusionMapId = sequence.mapIds?.[0] || null;
      ideal.construction.quotientMapId = sequence.mapIds?.[1] || null;
      (sequence.mapIds || []).forEach((mapId) => {
        const map = state.maps.find((item) => item.id === mapId);
        if (map) map.hiddenOnCanvas = true;
      });
      syncObjectLineage(ideal, 'sheaf');
    }
    ensureIdealSheafHomologyRules(data);
    state.activeSequenceId = null;
    state.activeSheafId = ideal.id;
    state.activeVarietyId = data.codomain.id;
    state.activeMapId = null;
    state.hiddenObjects = hiddenObjectRefs();
    refreshConstructedObjects();
    return ideal;
  }

  function cleanupIdealSheafScaffolding(sheaf) {
    if (!sheaf) return;
    const construction = sheaf.construction || {};
    const sequenceIds = new Set([
      construction.sequenceId,
      ...(sheaf.sequenceMemberships || []).map((item) => item.sequenceId)
    ].filter(Boolean));
    const mapIds = new Set([construction.inclusionMapId, construction.quotientMapId].filter(Boolean));
    sequenceIds.forEach((sequenceId) => {
      const sequence = state.sequences.find((item) => item.id === sequenceId);
      (sequence?.mapIds || []).forEach((mapId) => mapIds.add(mapId));
      detachShortExactSequenceMemberships(sequenceId);
    });
    state.sequences = state.sequences.filter((sequence) => !sequenceIds.has(sequence.id));
    state.maps = state.maps.filter((map) => !mapIds.has(map.id));
    delete sheaf.sequenceMemberships;
  }

  function ensureStructureSheafForVariety(variety) {
    if (!variety) return null;
    const geometry = geometryFromVariety(variety);
    const defaultName = defaultSheafNameFor('structure', '1', 1, geometry.labelLatex, geometry);
    const existing = state.sheaves.find((sheaf) => (
      sheaf.baseVarietyId === variety.id
      && sheaf.type === 'structure'
      && !sheaf.construction
      && sheaf.hiddenOnCanvas
    ));
    if (existing) {
      existing.rank = '1';
      existing.twist = '1';
      existing.basis = 'chern';
      if (!existing.nameDirty) existing.name = defaultName;
      sheafFromObject(existing, geometry);
      return existing;
    }
    const sheaf = {
      id: nextInputId('E'),
      type: 'structure',
      name: defaultName,
      twist: '1',
      rank: '1',
      baseVarietyId: variety.id,
      basis: 'chern',
      nameDirty: false,
      hiddenOnCanvas: true
    };
    positionSheafNearBase(sheaf, variety);
    avoidCanvasLabelOverlap(sheaf);
    sheafFromObject(sheaf, geometry);
    return addSheafObject(sheaf, { activate: false });
  }

  function ensureIdealPushforwardSheaf(data, sourceStructure) {
    const defaultName = defaultPushforwardSheafNameFromObjects(data.map, sourceStructure, { proper: true });
    const existing = state.sheaves.find((sheaf) => (
      sheaf.construction?.type === 'pushforward'
      && sheaf.construction.mapId === data.map.id
      && sheaf.construction.sheafId === sourceStructure.id
      && sheaf.construction.proper === true
      && sheaf.hiddenOnCanvas
    ));
    if (existing) {
      existing.baseVarietyId = data.codomain.id;
      existing.rank = 'r';
      existing.basis = 'chern';
      existing.construction.exact = true;
      existing.construction.defaultName = defaultName;
      if (!existing.nameDirty) existing.name = defaultName;
      syncObjectLineage(existing, 'sheaf');
      return existing;
    }
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: defaultName,
      twist: '1',
      rank: 'r',
      baseVarietyId: data.codomain.id,
      basis: 'chern',
      nameDirty: false,
      hiddenOnCanvas: true,
      construction: {
        type: 'pushforward',
        mapId: data.map.id,
        sheafId: sourceStructure.id,
        exact: true,
        proper: true,
        defaultName
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    positionSheafNearBase(sheaf, data.codomain);
    avoidCanvasLabelOverlap(sheaf);
    return addSheafObject(sheaf, { activate: false });
  }

  function ensureIdealSheafHomologyRules(data) {
    if (!data?.map || !data.domain || !data.codomain) return false;
    const sourceGeometry = geometryFromVariety(data.domain);
    let targetGeometry = geometryFromVariety(data.codomain);
    if (!Number.isInteger(sourceGeometry?.dim) || !Number.isInteger(targetGeometry?.dim)) return false;
    const codim = Math.max(0, Math.min(targetGeometry.dim, targetGeometry.dim - sourceGeometry.dim));
    const homology = ensureHomologySystem(data.codomain, targetGeometry);
    const classId = idealSheafImageClassId(data.map);
    const classSymbol = idealSheafImageClassSymbol(data.domain);
    const nextClass = {
      id: classId,
      symbol: classSymbol,
      degree: codim,
      cohomologyDegree: 2 * codim
    };
    homology.customClasses = [
      ...(homology.customClasses || []).filter((item) => item.id !== classId),
      nextClass
    ];
    targetGeometry = geometryFromVariety(data.codomain);
    const targetClassId = homologyVariableId(classId, targetGeometry);
    const unitPushforwardId = defineMapHomologyVariable(data.map, 'pushforward', mapSourceUnitVariableId(data.map), codim, '1', {
      cohomologyDegree: 2 * codim,
      sourceKey: ''
    });
    const rules = (data.codomain.homology?.rules || []).filter((rule) => !idealSheafRuleIds(data.map).includes(rule.id));
    const unitRule = normalizeHomologyRule({
      id: idealSheafUnitRuleId(data.map),
      enabled: true,
      lhs: { powers: { [unitPushforwardId]: 1 } },
      rhs: [{ coefficient: '1', powers: { [targetClassId]: 1 } }]
    }, targetGeometry, { includeMapClasses: true, preserveUnknownVariables: true });
    if (unitRule) rules.push(unitRule);
    const pointRule = idealSheafPointPushforwardRule(data.map, sourceGeometry, targetGeometry);
    if (pointRule) rules.push(pointRule);
    data.codomain.homology.rules = rules;
    ensureHomologySystem(data.codomain, targetGeometry);
    return true;
  }

  function idealSheafImageClassId(map) {
    return `ideal_${variableIdSafe(map?.id || 'map')}_image`;
  }

  function idealSheafImageClassSymbol(domain) {
    return sanitizeHomologySymbol(`[${sanitizeMathLabel(domain?.name, 'X')}]`, '[X]');
  }

  function idealSheafUnitRuleId(map) {
    return `map-rule-${mapHomologyVariableId(map, 'pushforward', mapSourceUnitVariableId(map))}`;
  }

  function idealSheafPointRuleId(map) {
    return `map-rule-pushforward_${variableIdSafe(map?.id || 'map')}_point`;
  }

  function idealSheafRuleIds(map) {
    return [idealSheafUnitRuleId(map), idealSheafPointRuleId(map)];
  }

  function idealSheafPointPushforwardRule(map, sourceGeometry, targetGeometry) {
    if (!map || !sourceGeometry || !targetGeometry) return null;
    const sourcePointId = homologyVariableId(HOMOLOGY_POINT_CLASS, sourceGeometry);
    const targetPointId = homologyVariableId(HOMOLOGY_POINT_CLASS, targetGeometry);
    const sourcePoint = homologyClassDefById(sourceGeometry, HOMOLOGY_POINT_CLASS);
    const targetDegree = mapOperationTargetDegree('pushforward', sourceGeometry.dim, sourceGeometry, targetGeometry);
    const targetCohomologyDegree = mapOperationTargetCohomologyDegree('pushforward', 2 * sourceGeometry.dim, sourceGeometry, targetGeometry);
    if (targetDegree == null || targetCohomologyDegree == null) return null;
    defineVariable(sourcePointId, sourceGeometry.dim, sourcePoint?.symbolLatex || '[p]', {
      cohomologyDegree: sourcePoint?.cohomologyDegree ?? 2 * sourceGeometry.dim
    });
    const variableId = defineMapHomologyVariable(map, 'pushforward', sourcePointId, targetDegree, sourcePoint?.symbolLatex || '[p]', {
      cohomologyDegree: targetCohomologyDegree,
      sourceKey: monoKey({ [sourcePointId]: 1 })
    });
    return normalizeHomologyRule({
      id: idealSheafPointRuleId(map),
      enabled: true,
      lhs: { powers: { [variableId]: 1 } },
      rhs: [{ coefficient: '1', powers: { [targetPointId]: 1 } }]
    }, targetGeometry, { includeMapClasses: true, preserveUnknownVariables: true });
  }

  function createSchurSheafConstruction(data) {
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: schurRankPlaceholder(data.parent, data.partition),
      baseVarietyId: data.parent.baseVarietyId,
      basis: 'chern',
      nameDirty: data.nameDirty,
      construction: {
        type: 'schur',
        sheafId: data.parent.id,
        partition: data.partition,
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    return addSheafObject(sheaf);
  }

  function createComposedMap(data) {
    const map = createMapObject(
      { kind: data.first.domainKind, id: data.first.domainId },
      { kind: data.second.codomainKind, id: data.second.codomainId },
      {
        name: uniqueConstructedObjectName('map', data.name),
        construction: {
          type: 'composition',
          mapIds: [data.first.id, data.second.id],
          defaultName: data.defaultName,
          nameDirty: data.nameDirty
        }
      }
    );
    if (map) {
      map.nameDirty = data.nameDirty;
      map.construction.nameDirty = data.nameDirty;
      syncObjectLineage(map, 'map');
    }
    return map;
  }

  function createAbelJacobiMapFromDraft() {
    const curve = mapDraftAbelJacobiCurve();
    if (!curve) return null;
    ensureCurveSymplecticBasis(curve);
    const jacobian = createJacobianVariety(curve);
    if (!jacobian) return null;
    const defaultName = defaultAbelJacobiMapNameFromCurve(curve);
    const name = state.draftMapNameDirty
      ? sanitizeMathLabel(refs.mapName?.value, defaultName)
      : defaultName;
    const map = createMapObject(
      { kind: 'variety', id: curve.id },
      { kind: 'variety', id: jacobian.id },
      {
        name: uniqueConstructedObjectName('map', name),
        construction: {
          type: 'abel-jacobi',
          curveId: curve.id,
          jacobianId: jacobian.id,
          defaultName,
          nameDirty: state.draftMapNameDirty || canonicalMathLabel(name) !== canonicalMathLabel(defaultName)
        }
      }
    );
    if (!map) return null;
    map.nameDirty = state.draftMapNameDirty || canonicalMathLabel(map.name) !== canonicalMathLabel(defaultName);
    map.construction.nameDirty = map.nameDirty;
    syncObjectLineage(map, 'map');
    ensureAbelJacobiKnownHomologyRules(map);
    state.draftMapNameDirty = false;
    refs.mapName.value = defaultCreateMapNameLatex();
    clearMapDraft();
    return map;
  }

  function createSesFromDraft() {
    if (activeSesDraftSequence()) return updateShortExactSequenceFromDraft();
    const data = shortExactSequenceData();
    if (!data) return null;
    const sequence = buildShortExactSequence(data);
    if (!sequence) return null;
    clearSesDraft();
    return sequence;
  }

  function updateShortExactSequenceFromDraft() {
    const sequence = activeSesDraftSequence();
    const data = shortExactSequenceData({ requireComplete: true, requireMaps: true });
    if (!sequence || !data?.sheafA || !data.sheafB || !data.sheafC || !data.mapAB || !data.mapBC) return null;
    const sheafIds = [data.sheafA.id, data.sheafB.id, data.sheafC.id];
    const mapIds = [data.mapAB.id, data.mapBC.id];
    detachShortExactSequenceMemberships(sequence.id);
    (sequence.mapIds || []).forEach((mapId) => {
      if (!mapIds.includes(mapId)) detachShortExactSequenceMap(mapId, sequence.id);
    });
    sequence.sheafIds = sheafIds;
    sequence.mapIds = mapIds;
    sequence.baseVarietyId = data.baseVarietyId;
    attachShortExactSequenceMap(data.mapAB, sequence, 0);
    attachShortExactSequenceMap(data.mapBC, sequence, 1);
    attachShortExactSequenceMemberships(sequence);
    state.activeSheafId = data.sheafB.id;
    state.activeVarietyId = data.baseVarietyId;
    state.activeMapId = null;
    setCanvasPickEnabled(false, { render: false });
    loadShortExactSequenceIntoDraft(sequence);
    refreshConstructedObjects();
    return sequence;
  }

  function createBlowupPointFromDraft() {
    const data = blowupConstructionData();
    if (!data) return null;
    const created = createBlowupPointConstruction(data);
    if (!created) return null;
    clearBlowupDraft();
    return created;
  }

  function createTautologicalSesFromDraft() {
    const data = tautologicalSesConstructionData();
    if (!data) return null;
    const sequence = createTautologicalSesConstruction(data);
    if (!sequence) return null;
    clearTautologicalSesDraft();
    return sequence;
  }

  function createGrassmannianMapFromDraft() {
    const data = grassmannianMapConstructionData();
    if (!data) return null;
    const created = createGrassmannianMapConstruction(data);
    if (!created) return null;
    clearGrassmannianMapDraft();
    return created;
  }

  function buildShortExactSequence(data) {
    const sheaves = [data.sheafA, data.sheafB, data.sheafC];
    const missingIndex = sheaves.findIndex((sheaf) => !sheaf);
    if (missingIndex < 0) return createShortExactSequenceFromObjects(data);
    const sourceSheaves = sheaves.filter(Boolean);
    if (sourceSheaves.length !== 2 || !data.baseVarietyId) return null;
    const autoMapABName = data.mapAB ? null : uniqueConstructedObjectName('map', '\\iota');
    const autoMapBCName = data.mapBC ? null : uniqueConstructedObjectName('map', '\\pi');
    const missing = createMissingSesSheaf({ ...data, autoMapABName, autoMapBCName }, missingIndex);
    if (!missing) return null;
    sheaves[missingIndex] = missing;
    addSheafObject(missing, { activate: false });
    return createShortExactSequenceFromObjects({
      ...data,
      autoMapABName,
      autoMapBCName,
      sheafA: sheaves[0],
      sheafB: sheaves[1],
      sheafC: sheaves[2]
    });
  }

  function createMissingSesSheaf(data, missingIndex) {
    const mapAB = data.mapAB || (data.autoMapABName ? { name: data.autoMapABName } : null);
    const mapBC = data.mapBC || (data.autoMapBCName ? { name: data.autoMapBCName } : null);
    const names = [
      defaultSesLeftSheafName(data.sheafB, data.sheafC, mapBC),
      defaultSesMiddleSheafName(data.sheafA, data.sheafC),
      defaultSesRightSheafName(data.sheafA, data.sheafB, mapAB)
    ];
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', names[missingIndex]),
      twist: '1',
      rank: sesMissingRankPlaceholder(data, missingIndex),
      baseVarietyId: data.baseVarietyId,
      basis: 'chern',
      nameDirty: false,
      construction: {
        type: 'ses-term',
        role: ['subobject', 'extension', 'quotient'][missingIndex],
        sourceSheafIds: [data.sheafA, data.sheafB, data.sheafC].filter(Boolean).map((sheaf) => sheaf.id),
        defaultName: names[missingIndex]
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    return sheaf;
  }

  function createShortExactSequenceFromObjects(data) {
    const sheafA = data.sheafA;
    const sheafB = data.sheafB;
    const sheafC = data.sheafC;
    if (!sheafA || !sheafB || !sheafC || sheafA.baseVarietyId !== sheafB.baseVarietyId || sheafB.baseVarietyId !== sheafC.baseVarietyId) return null;
    arrangeShortExactSequenceLabels(sheafA, sheafB, sheafC);
    const sequenceId = nextInputId('S');
    const mapAB = data.mapAB || createSesMapObject(sheafA, sheafB, data.autoMapABName || '\\iota', sequenceId, 0);
    const mapBC = data.mapBC || createSesMapObject(sheafB, sheafC, data.autoMapBCName || '\\pi', sequenceId, 1);
    if (!mapAB || !mapBC) return null;
    const sequence = createDefaultSequence({
      id: sequenceId,
      type: 'short-exact-sequence',
      sheafIds: [sheafA.id, sheafB.id, sheafC.id],
      mapIds: [mapAB.id, mapBC.id],
      baseVarietyId: sheafA.baseVarietyId,
      tail: { pointCount: sequenceTailPointCount(state.sesDraft) }
    });
    attachShortExactSequenceMap(mapAB, sequence, 0);
    attachShortExactSequenceMap(mapBC, sequence, 1);
    state.sequences.push(sequence);
    attachShortExactSequenceMemberships(sequence);
    state.activeSheafId = sheafB.id;
    state.activeVarietyId = sheafB.baseVarietyId;
    state.activeMapId = null;
    return sequence;
  }

  function attachShortExactSequenceMap(map, sequence, position) {
    if (!map || !sequence) return;
    map.construction = {
      ...(map.construction || {}),
      type: 'short-exact-sequence-map',
      sequenceId: sequence.id,
      position,
      sheafIds: [...(sequence.sheafIds || [])],
      defaultName: map.construction?.defaultName || map.name
    };
    syncObjectLineage(map, 'map');
  }

  function detachShortExactSequenceMap(mapId, sequenceId) {
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || map.construction?.type !== 'short-exact-sequence-map' || map.construction.sequenceId !== sequenceId) return;
    map.construction = null;
    syncObjectLineage(map, 'map');
  }

  function attachShortExactSequenceMemberships(sequence) {
    if (!sequence) return;
    (sequence.sheafIds || []).forEach((sheafId, index) => {
      const sheaf = state.sheaves.find((item) => item.id === sheafId);
      if (!sheaf) return;
      sheaf.sequenceMemberships = [
        ...(sheaf.sequenceMemberships || []).filter((item) => item.sequenceId !== sequence.id),
        { sequenceId: sequence.id, role: ['A', 'B', 'C'][index] }
      ];
      syncObjectLineage(sheaf, 'sheaf');
    });
  }

  function detachShortExactSequenceMemberships(sequenceId) {
    state.sheaves.forEach((sheaf) => {
      const memberships = sheaf.sequenceMemberships || [];
      if (!memberships.some((item) => item.sequenceId === sequenceId)) return;
      sheaf.sequenceMemberships = memberships.filter((item) => item.sequenceId !== sequenceId);
      syncObjectLineage(sheaf, 'sheaf');
    });
  }

  function createSesMapObject(domainSheaf, codomainSheaf, fallbackName, sequenceId, position) {
    const map = createMapObject(
      { kind: 'sheaf', id: domainSheaf.id },
      { kind: 'sheaf', id: codomainSheaf.id },
      {
        name: uniqueConstructedObjectName('map', fallbackName),
        activate: false,
        syncDraft: false,
        construction: {
          type: 'short-exact-sequence-map',
          sequenceId,
          position,
          defaultName: fallbackName,
          nameDirty: false
        }
      }
    );
    if (map) {
      map.nameDirty = false;
      map.labelOffset = -16;
      map.labelT = 0.5;
    }
    return map;
  }

  function arrangeShortExactSequenceLabels(sheafA, sheafB, sheafC) {
    const base = state.varieties.find((variety) => variety.id === sheafA.baseVarietyId) || baseVarietyForSheaf(sheafA);
    const baseX = Number.isFinite(base?.labelX) ? base.labelX : DEFAULT_FIRST_VARIETY_X;
    const baseY = Number.isFinite(base?.labelY) ? base.labelY : DEFAULT_FIRST_VARIETY_Y;
    const spacing = Math.max(0.14, canvasSpacingRatio('x') * 1.15);
    const y = clamp(baseY - Math.max(0.18, canvasSpacingRatio('y') * 1.35), 0.1, 0.9);
    [sheafA, sheafB, sheafC].forEach((sheaf, index) => {
      if (sheaf.labelPositionDirty) return;
      sheaf.labelX = clamp(baseX + (index - 1) * spacing, 0.08, 0.94);
      sheaf.labelY = y;
    });
  }

  function sesMissingRankPlaceholder(data, missingIndex) {
    const ranks = [data.sheafA, data.sheafB, data.sheafC].map((sheaf) => sheaf ? sanitizeRankInput(sheaf.rank) : null);
    const numeric = ranks.map((rank) => (/^\d+$/.test(rank || '') ? Number(rank) : null));
    if (missingIndex === 0 && numeric[1] != null && numeric[2] != null) return String(Math.max(0, numeric[1] - numeric[2]));
    if (missingIndex === 1 && numeric[0] != null && numeric[2] != null) return String(numeric[0] + numeric[2]);
    if (missingIndex === 2 && numeric[1] != null && numeric[0] != null) return String(Math.max(0, numeric[1] - numeric[0]));
    return 'r';
  }

  function sesRankPlaceholderFromTerms(terms, missingIndex) {
    const ranks = (terms || []).map((sheaf) => sheaf ? sanitizeRankInput(sheaf.rank) : null);
    const numeric = ranks.map((rank) => (/^-?\d+$/.test(rank || '') ? Number(rank) : null));
    if (missingIndex === 0 && numeric[1] != null && numeric[2] != null) return String(numeric[1] - numeric[2]);
    if (missingIndex === 1 && numeric[0] != null && numeric[2] != null) return String(numeric[0] + numeric[2]);
    if (missingIndex === 2 && numeric[1] != null && numeric[0] != null) return String(numeric[1] - numeric[0]);
    return 'r';
  }

  function tautologicalSesDraftBase() {
    const id = state.tautologicalSesDraft?.baseId;
    return state.varieties.find((variety) => variety.id === id) || null;
  }

  function tautologicalSesPickAvailable() {
    return combinedGrassmannianTautologicalSesCreateMode()
      && state.varieties.some((variety) => allowableTautologicalSesBasePick(variety.id));
  }

  function allowableTautologicalSesBasePick(varietyId) {
    const variety = state.varieties.find((item) => item.id === varietyId);
    return !!variety && !variety.hiddenOnCanvas && varietySupportsTautologicalSequence(variety.type || 'abstract');
  }

  function activateTautologicalSesPick(options = {}) {
    if (!combinedGrassmannianTautologicalSesCreateMode()) return false;
    setCanvasPickEnabled(true, { render: false });
    updateTautologicalSesDraftControls();
    syncGlobalPickButton();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function handleTautologicalSesPick(kind, id) {
    if (kind !== 'variety' || !allowableTautologicalSesBasePick(id)) return;
    state.tautologicalSesDraft = { baseId: id };
    state.activeVarietyId = id;
    setCanvasPickEnabled(false, { render: false });
    updateTautologicalSesDraftControls();
    recompute();
  }

  function updateTautologicalSesDraftControls() {
    const show = combinedGrassmannianTautologicalSesCreateMode();
    if (refs.tautologicalSesBaseRow) refs.tautologicalSesBaseRow.hidden = !show;
    if (refs.tautologicalSesPickNote) {
      refs.tautologicalSesPickNote.hidden = !show;
      refs.tautologicalSesPickNote.textContent = tautologicalSesPickHint();
    }
    updateCombinedVarietySlotButton(
      refs.tautologicalSesBaseButton,
      tautologicalSesDraftBase(),
      'base',
      combinedGrassmannianTautologicalSesCreateMode() && state.canvasPickEnabled
    );
  }

  function tautologicalSesPickHint() {
    if (!state.varieties.some((variety) => varietySupportsTautologicalSequence(variety.type || 'abstract'))) return 'add a projective space or Grassmannian first';
    if (!tautologicalSesDraftBase()) return 'click the projective space or Grassmannian';
    return 'click build to create 0 -> S -> O^N -> Q -> 0';
  }

  function tautologicalSesConstructionData() {
    const base = tautologicalSesDraftBase();
    if (!base || !varietySupportsTautologicalSequence(base.type || 'abstract')) return null;
    const geometry = geometryFromVariety(base);
    const ambientRank = tautologicalAmbientRank(geometry);
    const subRank = universalBundleRankPlain(geometry);
    if (!Number.isInteger(ambientRank) || ambientRank < 1) return null;
    return { base, geometry, ambientRank, subRank };
  }

  function tautologicalAmbientRank(geometry) {
    if (geometry?.type === 'grassmannian') return geometry.grassmannianN;
    if (varietyHasHyperplaneClass(geometry?.type || 'abstract')) return (geometry.ambient ?? geometry.dim) + 1;
    return null;
  }

  function createTautologicalSesConstruction(data) {
    const universal = ensureTautologicalUniversalBundle(data);
    const middle = createTautologicalTrivialBundle(data, universal);
    if (!universal || !middle) return null;
    const quotient = createTautologicalQuotientBundle(data, universal, middle);
    if (!quotient) return null;
    addSheafObject(middle, { activate: false });
    addSheafObject(quotient, { activate: false });
    return createShortExactSequenceFromObjects({
      sheafA: universal,
      sheafB: middle,
      sheafC: quotient,
      baseVarietyId: data.base.id,
      autoMapABName: '\\iota',
      autoMapBCName: '\\pi'
    });
  }

  function findUniversalBundleOnBase(baseId) {
    return state.sheaves.find((sheaf) => (
      sheaf.baseVarietyId === baseId
      && isUniversalBundleSheafType(sheaf.type)
      && !sheaf.construction
    )) || null;
  }

  function ensureTautologicalUniversalBundle(data) {
    const existing = findUniversalBundleOnBase(data.base.id);
    if (existing) {
      sheafFromObject(existing, data.geometry);
      return existing;
    }
    const sheaf = {
      id: nextInputId('E'),
      type: 'universal-bundle',
      name: uniqueConstructedObjectName('sheaf', defaultSheafNameFor('universal-bundle', data.subRank, 1, data.geometry.labelLatex, data.geometry)),
      twist: '1',
      rank: data.subRank,
      baseVarietyId: data.base.id,
      basis: 'chern',
      nameDirty: false
    };
    positionSheafNearBase(sheaf, data.base);
    avoidCanvasLabelOverlap(sheaf);
    sheafFromObject(sheaf, data.geometry);
    return addSheafObject(sheaf, { activate: false });
  }

  function createTautologicalTrivialBundle(data, universal) {
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', `\\mathcal{O}^{\\oplus ${data.ambientRank}}`),
      twist: '1',
      rank: String(data.ambientRank),
      baseVarietyId: data.base.id,
      basis: 'chern',
      nameDirty: false,
      construction: {
        type: 'trivial-bundle',
        rank: String(data.ambientRank),
        defaultName: `\\mathcal{O}^{\\oplus ${data.ambientRank}}`
      }
    };
    positionSheafNearBase(sheaf, data.base);
    if (Number.isFinite(universal?.labelX)) sheaf.labelX = clamp(universal.labelX + Math.max(0.14, canvasSpacingRatio('x') * 1.15), 0.08, 0.94);
    if (Number.isFinite(universal?.labelY)) sheaf.labelY = universal.labelY;
    avoidCanvasLabelOverlap(sheaf);
    syncObjectLineage(sheaf, 'sheaf');
    return sheaf;
  }

  function createTautologicalQuotientBundle(data, universal, middle) {
    const quotientRank = Math.max(0, data.ambientRank - Number(data.subRank || 0));
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', 'Q'),
      twist: '1',
      rank: String(quotientRank),
      baseVarietyId: data.base.id,
      basis: 'chern',
      nameDirty: false,
      construction: {
        type: 'ses-term',
        role: 'quotient',
        sourceSheafIds: [universal.id, middle.id],
        defaultName: 'Q'
      }
    };
    positionSheafNearBase(sheaf, data.base);
    if (Number.isFinite(middle?.labelX)) sheaf.labelX = clamp(middle.labelX + Math.max(0.14, canvasSpacingRatio('x') * 1.15), 0.08, 0.94);
    if (Number.isFinite(middle?.labelY)) sheaf.labelY = middle.labelY;
    avoidCanvasLabelOverlap(sheaf);
    syncObjectLineage(sheaf, 'sheaf');
    return sheaf;
  }

  function blowupConstructionData() {
    const base = blowupDraftVariety('base');
    const point = blowupDraftVariety('point');
    if (!base || !point || point.type !== 'point') return null;
    const defaultName = defaultBlowupVarietyNameFromObjects(base, point);
    return {
      base,
      point,
      defaultName,
      name: uniqueConstructedObjectName('variety', defaultName)
    };
  }

  function createBlowupPointConstruction(data) {
    const variety = {
      id: nextInputId('X'),
      type: 'abstract',
      dim: String(normalizedInt(data.base.dim, 0, MAX_DIMENSION, 3)),
      name: data.name,
      genus: data.base.genus || 'g',
      ciDegrees: '',
      nameDirty: false,
      construction: {
        type: 'blow-up-point',
        baseId: data.base.id,
        pointId: data.point.id,
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(variety, 'variety');
    positionConstructedObjectNear(variety, [data.base, data.point]);
    state.varieties.push(variety);
    state.activeSequenceId = null;
    state.activeVarietyId = variety.id;
    state.activeSheafId = null;
    state.activeMapId = null;
    const map = createMapObject(
      { kind: 'variety', id: variety.id },
      { kind: 'variety', id: data.base.id },
      {
        name: uniqueConstructedObjectName('map', defaultBlowdownMapNameFromObjects(variety)),
        activate: false,
        syncDraft: false,
        construction: {
          type: 'blow-down',
          blowupId: variety.id,
          baseId: data.base.id,
          pointId: data.point.id,
          defaultName: defaultBlowdownMapNameFromObjects(variety),
          nameDirty: false
        }
      }
    );
    if (map) map.nameDirty = false;
    return variety;
  }

  function grassmannianMapConstructionData() {
    const bundle = grassmannianMapDraftSheaf();
    const params = syncGrassmannianMapControls();
    if (!bundle || params.dim > MAX_DIMENSION) return null;
    const base = state.varieties.find((variety) => variety.id === bundle.baseVarietyId);
    if (!base) return null;
    const defaultTargetName = defaultGrassmannianTargetName(params);
    return {
      bundle,
      base,
      params,
      defaultTargetName,
      targetName: uniqueConstructedObjectName('variety', defaultTargetName),
      mapName: uniqueConstructedObjectName('map', defaultGrassmannianMapNameFromObjects(bundle))
    };
  }

  function createGrassmannianMapConstruction(data) {
    const target = {
      id: nextInputId('X'),
      type: 'grassmannian',
      dim: String(data.params.dim),
      name: data.targetName,
      genus: 'g',
      grassmannianR: String(data.params.r),
      grassmannianN: String(data.params.n),
      grassmannianYoungBasis: false,
      ciDegrees: '',
      nameDirty: false,
      construction: {
        type: 'grassmannian-target',
        sheafId: data.bundle.id,
        baseId: data.base.id,
        defaultName: data.defaultTargetName
      }
    };
    syncObjectLineage(target, 'variety');
    positionConstructedObjectNear(target, [data.base, data.bundle]);
    state.varieties.push(target);
    const map = createMapObject(
      { kind: 'variety', id: data.base.id },
      { kind: 'variety', id: target.id },
      {
        name: data.mapName,
        activate: false,
        syncDraft: false,
        construction: {
          type: 'grassmannian-map',
          sheafId: data.bundle.id,
          baseId: data.base.id,
          targetId: target.id,
          defaultName: defaultGrassmannianMapNameFromObjects(data.bundle),
          nameDirty: false
        }
      }
    );
    if (map) map.nameDirty = false;
    state.activeSequenceId = null;
    state.activeVarietyId = target.id;
    state.activeSheafId = null;
    state.activeMapId = map?.id || null;
    return map || target;
  }

  function defaultSesMapName(map, fallback) {
    if (!map) return null;
    return sanitizeMathLabel(map.name || map.construction?.defaultName, fallback);
  }

  function defaultSesLeftSheafName(middle, right, map = null) {
    const mapName = defaultSesMapName(map, '\\pi');
    if (mapName) return `\\ker(${mapName})`;
    return `\\ker(${sanitizeMathLabel(middle?.name, '\\mathcal{F}')}\\to ${sanitizeMathLabel(right?.name, '\\mathcal{G}')})`;
  }

  function defaultSesMiddleSheafName(left, right) {
    return `${sanitizeMathLabel(left?.name, '\\mathcal{E}')}\\oplus ${sanitizeMathLabel(right?.name, '\\mathcal{G}')}`;
  }

  function defaultSesRightSheafName(left, middle, map = null) {
    const mapName = defaultSesMapName(map, '\\iota');
    if (mapName) return `\\operatorname{coker}(${mapName})`;
    return `\\operatorname{coker}(${sanitizeMathLabel(left?.name, '\\mathcal{E}')}\\to ${sanitizeMathLabel(middle?.name, '\\mathcal{F}')})`;
  }

  function defaultShortExactSequenceLabel(sequence) {
    const [left, middle, right] = (sequence?.sheafIds || []).map((id) => state.sheaves.find((sheaf) => sheaf.id === id));
    return `0\\to ${sanitizeMathLabel(left?.name, '\\mathcal{E}')}\\to ${sanitizeMathLabel(middle?.name, '\\mathcal{F}')}\\to ${sanitizeMathLabel(right?.name, '\\mathcal{G}')}\\to 0`;
  }

  function defaultBlowupVarietyNameFromObjects(base, point) {
    return `\\operatorname{Bl}_{${sanitizeMathLabel(point?.name, 'p')}}${sanitizeMathLabel(base?.name, 'X')}`;
  }

  function defaultBlowdownMapNameFromObjects() {
    return '\\beta';
  }

  function defaultGrassmannianTargetName(params) {
    return `\\operatorname{Gr}(${params.r},${params.n})`;
  }

  function defaultGrassmannianMapNameFromObjects(bundle) {
    return `\\varphi_{${sanitizeMathLabel(bundle?.name, '\\mathcal{E}')}}`;
  }

  function createMapSheafConstruction(data) {
    const isPullback = data.operation === 'pullback-sheaf';
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: isPullback ? data.sheaf.rank : 'r',
      baseVarietyId: isPullback ? data.map.domainId : data.map.codomainId,
      basis: normalizeBasisValue(data.sheaf.basis),
      nameDirty: data.nameDirty,
      construction: {
        type: isPullback ? 'pullback' : 'pushforward',
        mapId: data.map.id,
        sheafId: data.sheaf.id,
        derived: !!data.derived,
        exact: !!data.exact,
        proper: isPullback ? false : !!data.proper,
        defaultName: data.defaultName
      }
    };
    syncObjectLineage(sheaf, 'sheaf');
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    return addSheafObject(sheaf);
  }

  function defaultProductVarietyName(leftId, rightId) {
    const left = state.varieties.find((item) => item.id === leftId);
    const right = state.varieties.find((item) => item.id === rightId);
    return defaultProductVarietyNameFromObjects(left, right);
  }

  function defaultProductVarietyNameFromObjects(left, right) {
    return `${sanitizeMathLabel(left?.name, 'X')}\\times ${sanitizeMathLabel(right?.name, 'Y')}`;
  }

  function defaultBinarySheafName(leftId, rightId, operationLatex) {
    const left = state.sheaves.find((item) => item.id === leftId);
    const right = state.sheaves.find((item) => item.id === rightId);
    return defaultBinarySheafNameFromObjects(left, right, operationLatex);
  }

  function defaultBinarySheafNameFromObjects(left, right, operationLatex) {
    return `${sanitizeMathLabel(left?.name, '\\mathcal{E}')}${operationLatex}${sanitizeMathLabel(right?.name, '\\mathcal{F}')}`;
  }

  function defaultSelfSumSheafNameFromObjects(parent, multiplicity) {
    return `${sanitizeMathLabel(parent?.name, '\\mathcal{E}')}^{\\oplus ${normalizeSelfSumMultiplicity(multiplicity)}}`;
  }

  function defaultIdealSheafNameFromObjects(map) {
    const domain = state.varieties.find((variety) => variety.id === map?.domainId);
    const label = sanitizeMathLabel(domain?.name, 'X');
    return /^[A-Za-z0-9]+$/.test(label) ? `I_${label}` : `I_{${label}}`;
  }

  function defaultSchurSheafNameFromObjects(parent, partition) {
    return `\\mathbb{S}_{${schurPartitionLatex(partition)}}${sanitizeMathLabel(parent?.name, '\\mathcal{E}')}`;
  }

  function tensorOperationLatex(derived) {
    return derived ? '\\otimes^{\\mathbf{L}}' : '\\otimes';
  }

  function defaultComposedMapName(firstId, secondId) {
    const first = state.maps.find((item) => item.id === firstId);
    const second = state.maps.find((item) => item.id === secondId);
    return defaultComposedMapNameFromObjects(first, second);
  }

  function defaultComposedMapNameFromObjects(first, second) {
    return `${sanitizeMathLabel(second?.name, 'g')}\\circ ${sanitizeMathLabel(first?.name, 'f')}`;
  }

  function defaultPullbackSheafName(mapId, sheafId, options = {}) {
    const map = state.maps.find((item) => item.id === mapId);
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return defaultPullbackSheafNameFromObjects(map, sheaf, options);
  }

  function defaultPullbackSheafNameFromObjects(map, sheaf, options = {}) {
    return `${pullbackFunctorLatex(map, options)}${sanitizeMathLabel(sheaf?.name, '\\mathcal{E}')}`;
  }

  function defaultPushforwardSheafName(mapId, sheafId, options = {}) {
    const map = state.maps.find((item) => item.id === mapId);
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return defaultPushforwardSheafNameFromObjects(map, sheaf, options);
  }

  function defaultPushforwardSheafNameFromObjects(map, sheaf, options = {}) {
    return `${pushforwardFunctorLatex(map, options)}${sanitizeMathLabel(sheaf?.name, '\\mathcal{E}')}`;
  }

  function defaultProjectionMapNameFromObjects(product, factor, factorIndex = 0) {
    const factorName = sanitizeMathLabel(factor?.name, factorIndex === 0 ? 'X' : 'Y');
    const productFactors = product?.construction?.type === 'product' ? (product.construction.varietyIds || []) : [];
    const repeatedFactor = productFactors[0] && productFactors[0] === productFactors[1];
    return repeatedFactor ? `\\pi_{${factorName},${factorIndex + 1}}` : `\\pi_{${factorName}}`;
  }

  function defaultJacobianNameFromCurve(curve) {
    return `\\operatorname{Jac}(${sanitizeMathLabel(curve?.name, 'C')})`;
  }

  function defaultAbelJacobiMapNameFromCurve(curve) {
    return `\\operatorname{AJ}_{${sanitizeMathLabel(curve?.name, 'C')}}`;
  }

  function mapPullbackOperatorLatex(map) {
    const mapName = sanitizeMathLabel(map?.name, 'f');
    return `${mapName}^{*}`;
  }

  function mapPushforwardOperatorLatex(map, lower = '*') {
    const mapName = sanitizeMathLabel(map?.name, 'f');
    return `${mapName}_{${lower}}`;
  }

  function pullbackFunctorLatex(map, options = {}) {
    const operator = mapPullbackOperatorLatex(map);
    return options.derived === false ? operator : `\\mathbf{L}${operator}`;
  }

  function pushforwardFunctorLatex(map, options = {}) {
    const lower = options.proper ? '*' : '!';
    const operator = mapPushforwardOperatorLatex(map, lower);
    return options.derived === false ? operator : `\\mathbf{R}${operator}`;
  }

  function constructionRankPlaceholder(operation, left, right) {
    const leftRank = sanitizeRankInput(left.rank);
    const rightRank = sanitizeRankInput(right.rank);
    if (/^\d+$/.test(leftRank) && /^\d+$/.test(rightRank)) {
      return operation === 'direct-sum-sheaf'
        ? String(Number(leftRank) + Number(rightRank))
        : String(Number(leftRank) * Number(rightRank));
    }
    return 'r';
  }

  function selfSumRankPlaceholder(parent, multiplicity) {
    const rank = sanitizeRankInput(parent?.rank);
    const n = normalizeSelfSumMultiplicity(multiplicity);
    if (/^-?\d+$/.test(rank)) return String(Number(rank) * n);
    return 'r';
  }

  function schurRankPlaceholder(parent, partition) {
    const rank = sanitizeRankInput(parent?.rank);
    const numericRank = numericRankFromPlain(rank);
    const normalizedPartition = normalizeSchurPartition(partition);
    if (numericRank != null && normalizedPartition && normalizedPartition.length <= numericRank) return String(schurRepresentationRank(normalizedPartition, numericRank));
    return rank || 'r';
  }

  function uniqueConstructedObjectName(kind, proposedName) {
    const fallback = kind === 'map' ? defaultMapNameLatex() : (kind === 'sheaf' ? '\\mathcal{E}' : 'X');
    const sanitized = sanitizeMathLabel(proposedName, fallback);
    const items = kind === 'map' ? state.maps : (kind === 'sheaf' ? state.sheaves : state.varieties);
    const used = new Set(items.map((item) => canonicalMathLabel(item.name)));
    if (!used.has(canonicalMathLabel(sanitized))) return sanitized;
    for (let index = 2; index <= 50; index += 1) {
      const candidate = sanitizeMathLabel(`${sanitized}^{(${index})}`, sanitized);
      if (!used.has(canonicalMathLabel(candidate))) return candidate;
    }
    return sanitized;
  }

  function positionConstructedObjectNear(object, sources) {
    const positioned = sources.filter((source) => Number.isFinite(source?.labelX) && Number.isFinite(source?.labelY));
    if (!positioned.length) {
      positionVarietyOnCanvas(object);
      return;
    }
    const x = positioned.reduce((sum, source) => sum + source.labelX, 0) / positioned.length;
    const y = positioned.reduce((sum, source) => sum + source.labelY, 0) / positioned.length;
    object.labelX = clamp(x + 0.08, 0.08, 0.94);
    object.labelY = clamp(y + 0.1, 0.08, 0.92);
    avoidCanvasLabelOverlap(object);
  }

  function setCanvasPickEnabled(enabled, options = {}) {
    if (!refs.inputPickMode) {
      state.canvasPickEnabled = false;
      state.mapDrag = null;
      return;
    }
    state.canvasPickEnabled = !!enabled && canvasPickAvailable();
    if (!state.canvasPickEnabled) {
      state.mapDrag = null;
    }
    syncGlobalPickButton();
    if (options.render !== false) renderCanvas(state.lastResult);
  }

  function activateFirstCreateBlankPick(options = {}) {
    if (!inputIsCreateMode()) return false;
    const kind = options.kind || currentInputKind();
    if (combinedSesCreateMode()) return activateSesPick(state.sesPickTarget || 'sheaf-a', options);
    if (combinedBlowupCreateMode()) return activateBlowupPick(state.blowupPickTarget || 'base', options);
    if (combinedGrassmannianTautologicalSesCreateMode()) return activateTautologicalSesPick(options);
    if (combinedGrassmannianMapCreateMode()) return activateGrassmannianMapPick(options);
    if (kind === 'sheaf') {
      if (sheafBinaryInputMode()) {
        state.sheafBinaryPickTarget = sheafBinaryDraftSheaf('left') ? 'right' : 'left';
      } else if (sheafSelfSumInputMode()) {
        state.sheafSelfSumDraft = state.sheafSelfSumDraft || {};
      } else if (sheafIdealInputMode()) {
        state.sheafIdealDraft = state.sheafIdealDraft || {};
      } else if (sheafSchurInputMode()) {
        state.sheafSchurDraft = state.sheafSchurDraft || {};
      } else if (sheafMapOperationInputMode()) {
        state.sheafMapPickTarget = sheafMapDraftMap() ? 'sheaf' : 'map';
      } else if (sheafBasePickInputMode()) {
        // Ordinary sheaf creation starts by choosing its base variety.
      } else {
        return false;
      }
    } else if (kind === 'map') {
      state.mapPickTarget = mapCompositionInputMode()
        ? (mapDraftMap('first') ? 'second' : 'first')
        : (abelJacobiMapInputMode() ? 'curve' : (mapDraftEndpointObject('domain') ? 'codomain' : 'domain'));
    } else {
      return false;
    }
    setCanvasPickEnabled(true, { render: false });
    normalizeControlVisibility();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function canvasPickAvailable() {
    if (combinedSesCreateMode()) return sesPickAvailable();
    if (combinedBlowupCreateMode()) return blowupPickAvailable();
    if (combinedGrassmannianTautologicalSesCreateMode()) return tautologicalSesPickAvailable();
    if (combinedGrassmannianMapCreateMode()) return grassmannianMapPickAvailable();
    if (productVarietyInputMode()) return productPickableVarieties().length > 0;
    if (mapInputMode()) return mapPickAvailable();
    if (sheafBinaryInputMode()) return sheafBinaryPickableSheaves().length > 0;
    if (sheafSelfSumInputMode()) return sheafSelfSumPickableSheaves().length > 0;
    if (sheafIdealInputMode()) return sheafIdealPickableMaps().length > 0;
    if (sheafSchurInputMode()) return sheafSchurPickableSheaves().length > 0;
    if (sheafMapOperationInputMode()) {
      return state.maps.some((map) => allowableSheafMapOperationMap(map.id))
        || state.sheaves.some((sheaf) => allowableSheafMapOperationSheaf(sheaf.id));
    }
    if (sheafBasePickInputMode()) return state.varieties.some((variety) => allowableSheafBase(variety.id));
    return false;
  }

  function syncGlobalPickButton() {
    if (!refs.inputPickMode) return;
    const available = canvasPickAvailable();
    if (!available) state.canvasPickEnabled = false;
    refs.inputPickMode.hidden = !state.canvasPickEnabled;
    refs.inputPickMode.disabled = !state.canvasPickEnabled;
    refs.inputPickMode.setAttribute('aria-pressed', 'false');
    refs.inputPickMode.textContent = 'cancel';
    refs.inputPickMode.title = 'Cancel canvas selection';
  }

  function clearMapDraft() {
    state.mapDraft = null;
    state.mapPickTarget = 'domain';
    state.mapDrag = null;
    updateMapPickStatus();
    updateMapDraftControls();
  }

  function clearSesDraft() {
    state.sesDraft = null;
    state.sesPickTarget = 'sheaf-a';
    updateSesDraftControls();
  }

  function clearBlowupDraft() {
    state.blowupDraft = null;
    state.blowupPickTarget = 'base';
    updateBlowupDraftControls();
  }

  function clearTautologicalSesDraft() {
    state.tautologicalSesDraft = null;
    updateTautologicalSesDraftControls();
  }

  function clearGrassmannianMapDraft() {
    state.grassmannianMapDraft = null;
    state.grassmannianMapPickTarget = 'bundle';
    updateGrassmannianMapDraftControls();
  }

  function clearSheafMapDraft() {
    state.sheafMapDraft = null;
    state.sheafMapPickTarget = 'map';
    if (refs.sheafMapOperation) refs.sheafMapOperation.value = 'auto';
    if (refs.sheafMapExact) refs.sheafMapExact.checked = false;
    if (refs.sheafMapProper) refs.sheafMapProper.checked = false;
    updateSheafMapDraftControls();
  }

  function clearSheafBinaryDraft() {
    state.sheafBinaryDraft = null;
    state.sheafBinaryPickTarget = 'left';
    if (refs.sheafBinaryExact) refs.sheafBinaryExact.checked = false;
    updateSheafBinaryDraftControls();
  }

  function clearSheafSelfSumDraft() {
    state.sheafSelfSumDraft = null;
    if (refs.sheafSelfSumCount) refs.sheafSelfSumCount.value = '2';
    updateSheafSelfSumDraftControls({ normalizeCount: true });
  }

  function clearSheafIdealDraft() {
    state.sheafIdealDraft = null;
    if (refs.sheafIdealConfirm) refs.sheafIdealConfirm.checked = false;
    updateSheafIdealDraftControls();
  }

  function clearSheafSchurDraft() {
    state.sheafSchurDraft = null;
    updateSheafSchurDraftControls();
  }

  function clearProductDraft() {
    state.productDraft = null;
    state.productPickIndex = 0;
    updateProductDraftControls();
  }

  function updateCombinedDraftControls() {
    updateSesDraftControls();
    updateBlowupDraftControls();
    updateTautologicalSesDraftControls();
    updateGrassmannianMapDraftControls();
  }

  function activateProductFactorPick(index = 0, options = {}) {
    if (!productVarietyInputMode()) return false;
    state.productPickIndex = normalizedInt(index, 0, 1, 0);
    setCanvasPickEnabled(true, { render: false });
    updateProductDraftControls();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function updateProductDraftControls() {
    if (refs.varietyType?.value !== 'product' && !combinedProductCreateMode()) {
      if (refs.productFactorsRow) refs.productFactorsRow.hidden = true;
      if (refs.productPickNote) refs.productPickNote.hidden = true;
      return;
    }
    const slots = productDraftFactorSlots();
    const factors = productDraftFactors();
    if (refs.productFactorsRow) refs.productFactorsRow.hidden = false;
    updateProductFactorButton(refs.productFactorA, slots[0], 0);
    updateProductFactorButton(refs.productFactorB, slots[1], 1);
    if (refs.productPickNote) {
      refs.productPickNote.hidden = false;
      refs.productPickNote.textContent = productPickHint(slots);
    }
    if (refs.dim) {
      const dim = productDimensionFromSlots(slots);
      refs.dim.value = String(Math.min(dim, MAX_DIMENSION));
    }
    if (refs.varietyName && !state.draftVarietyNameDirty && factors.length === 2) {
      refs.varietyName.value = defaultProductVarietyNameFromObjects(factors[0], factors[1]);
    }
    syncGlobalPickButton();
  }

  function updateProductFactorButton(button, variety, index) {
    if (!button) return;
    button.textContent = variety ? latexToPlain(sanitizeMathLabel(variety.name, index === 0 ? 'X' : 'Y')) : (index === 0 ? 'varietyA' : 'varietyB');
    button.title = variety ? `Replace ${button.textContent}` : `Pick ${index === 0 ? 'the first' : 'the second'} variety`;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && productVarietyInputMode() && state.productPickIndex === index ? 'true' : 'false');
  }

  function productPickHint(factors = productDraftFactorSlots()) {
    if (!productPickableVarieties().length) {
      return inputIsModifyMode()
        ? 'add another variety before replacing a factor'
        : 'add a variety before building a product construction';
    }
    if (inputIsModifyMode()) return `click a variety to replace ${state.productPickIndex === 0 ? 'varietyA' : 'varietyB'}`;
    if (!factors[0]) return 'click the first variety on the canvas';
    if (!factors[1]) return 'click the second variety on the canvas';
    const dim = productDimensionFromFactors(factors[0], factors[1]);
    if (dim > MAX_DIMENSION) return `product dimension ${dim} exceeds the calculator limit ${MAX_DIMENSION}`;
    return 'click build to create the product and projection maps';
  }

  function productDraftFactors() {
    const ids = productDraftFactorIds();
    return ids.map((id) => state.varieties.find((item) => item.id === id)).filter(Boolean);
  }

  function productDraftFactorSlots() {
    return productDraftFactorIds().map((id) => state.varieties.find((item) => item.id === id) || null);
  }

  function productDraftFactorIds() {
    const ids = state.productDraft?.varietyIds || [];
    return [ids[0] || null, ids[1] || null];
  }

  function productDimensionFromSlots(slots = productDraftFactorSlots()) {
    if (!slots[0] || !slots[1]) return 0;
    return productDimensionFromFactors(slots[0], slots[1]);
  }

  function productDimensionFromFactors(left, right) {
    if (!left || !right) return 0;
    return geometryFromVariety(left).dim + geometryFromVariety(right).dim;
  }

  function productPickableVarieties() {
    const activeProduct = inputIsModifyMode() ? selectedVariety() : null;
    const activeProductId = activeProduct?.construction?.type === 'product'
      ? activeProduct.id
      : null;
    return state.varieties.filter((variety) => (
      !activeProductId
      || (variety.id !== activeProductId && !productVarietyHasAncestor(variety.id, activeProductId))
    ));
  }

  function productCanPickVariety(varietyId) {
    return productPickableVarieties().some((variety) => variety.id === varietyId);
  }

  function sesDraftIds() {
    const draft = state.sesDraft || {};
    return {
      sequenceId: draft.sequenceId || null,
      sheafAId: draft.sheafAId || null,
      sheafBId: draft.sheafBId || null,
      sheafCId: draft.sheafCId || null,
      mapABId: draft.mapABId || null,
      mapBCId: draft.mapBCId || null,
      tailPointCount: sequenceTailPointCount(draft)
    };
  }

  function sesDraftSheaf(slot) {
    const ids = sesDraftIds();
    const id = slot === 'sheaf-c' ? ids.sheafCId : (slot === 'sheaf-b' ? ids.sheafBId : ids.sheafAId);
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function sesDraftMap(slot) {
    const ids = sesDraftIds();
    const id = slot === 'map-bc' ? ids.mapBCId : ids.mapABId;
    return state.maps.find((map) => map.id === id) || null;
  }

  function activeSesDraftSequence() {
    const id = state.sesDraft?.sequenceId || state.activeSequenceId;
    const sequence = (state.sequences || []).find((item) => item.id === id);
    return sequence?.type === 'short-exact-sequence' ? sequence : null;
  }

  function setSesDraft(nextDraft) {
    const draft = { ...(nextDraft || {}) };
    if (activeSesEditMode()) draft.sequenceId = draft.sequenceId || state.activeSequenceId;
    const mapAB = state.maps.find((map) => map.id === draft.mapABId) || null;
    if (mapAB?.domainKind === 'sheaf') draft.sheafAId = mapAB.domainId;
    if (mapAB?.codomainKind === 'sheaf') draft.sheafBId = mapAB.codomainId;
    const mapBC = state.maps.find((map) => map.id === draft.mapBCId) || null;
    if (mapBC?.domainKind === 'sheaf') draft.sheafBId = mapBC.domainId;
    if (mapBC?.codomainKind === 'sheaf') draft.sheafCId = mapBC.codomainId;
    if (draft.sheafAId && draft.sheafBId) {
      const map = findSheafMapBetween(draft.sheafAId, draft.sheafBId);
      if (map) draft.mapABId = map.id;
    }
    if (draft.sheafBId && draft.sheafCId) {
      const map = findSheafMapBetween(draft.sheafBId, draft.sheafCId);
      if (map) draft.mapBCId = map.id;
    }
    state.sesDraft = Object.values(draft).some(Boolean) ? draft : null;
  }

  function sesSelectedSheaves() {
    return ['sheaf-a', 'sheaf-b', 'sheaf-c'].map((slot) => sesDraftSheaf(slot)).filter(Boolean);
  }

  function sesBaseVarietyId() {
    return sesSelectedSheaves().find((sheaf) => sheaf.baseVarietyId)?.baseVarietyId || null;
  }

  function sesSheafMatchesBase(sheaf) {
    const baseId = sesBaseVarietyId();
    return !!sheaf && (!baseId || sheaf.baseVarietyId === baseId);
  }

  function sesPickAvailable() {
    if (!combinedSesCreateMode()) return false;
    const target = state.sesPickTarget || 'sheaf-a';
    if (activeSesEditMode()) {
      if (target === 'map-ab' || target === 'map-bc') return state.maps.some((map) => allowableSesFixedMapPick(map.id, target));
      return state.sheaves.some((sheaf) => allowableSesSheafPick(sheaf.id, target));
    }
    if (target === 'map-ab' || target === 'map-bc') return state.maps.some((map) => allowableSesMapPick(map.id, target));
    return state.sheaves.some((sheaf) => allowableSesSheafPick(sheaf.id, target));
  }

  function allowableSesSheafPick(sheafId, target = state.sesPickTarget) {
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    if (!sheaf || sheaf.hiddenOnCanvas || !sesSheafMatchesBase(sheaf)) return false;
    const draft = sesDraftIds();
    if (target === 'sheaf-a' && draft.sheafAId === sheafId) return false;
    if (target === 'sheaf-b' && draft.sheafBId === sheafId) return false;
    if (target === 'sheaf-c' && draft.sheafCId === sheafId) return false;
    if (target === 'sheaf-a' && draft.mapABId) {
      const map = state.maps.find((item) => item.id === draft.mapABId);
      return !!map && map.domainKind === 'sheaf' && map.domainId === sheafId;
    }
    if (target === 'sheaf-b') {
      const mapAB = state.maps.find((item) => item.id === draft.mapABId);
      const mapBC = state.maps.find((item) => item.id === draft.mapBCId);
      if (mapAB && (mapAB.codomainKind !== 'sheaf' || mapAB.codomainId !== sheafId)) return false;
      if (mapBC && (mapBC.domainKind !== 'sheaf' || mapBC.domainId !== sheafId)) return false;
    }
    if (target === 'sheaf-c' && draft.mapBCId) {
      const map = state.maps.find((item) => item.id === draft.mapBCId);
      return !!map && map.codomainKind === 'sheaf' && map.codomainId === sheafId;
    }
    return true;
  }

  function allowableSesMapPick(mapId, target = state.sesPickTarget) {
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || map.hiddenOnCanvas || map.domainKind !== 'sheaf' || map.codomainKind !== 'sheaf') return false;
    const domain = state.sheaves.find((sheaf) => sheaf.id === map.domainId);
    const codomain = state.sheaves.find((sheaf) => sheaf.id === map.codomainId);
    if (!domain || !codomain || domain.baseVarietyId !== codomain.baseVarietyId) return false;
    const baseId = sesBaseVarietyId();
    if (baseId && domain.baseVarietyId !== baseId) return false;
    const draft = sesDraftIds();
    if (target === 'map-ab') {
      if (draft.sheafAId && map.domainId !== draft.sheafAId) return false;
      if (draft.sheafBId && map.codomainId !== draft.sheafBId) return false;
      return true;
    }
    if (target === 'map-bc') {
      if (draft.sheafBId && map.domainId !== draft.sheafBId) return false;
      if (draft.sheafCId && map.codomainId !== draft.sheafCId) return false;
      return true;
    }
    return false;
  }

  function allowableSesFixedMapPick(mapId, target = state.sesPickTarget) {
    const sequence = activeSesDraftSequence();
    const draft = sesDraftIds();
    if (!sequence || !sequence.mapIds?.includes(mapId)) return false;
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || map.hiddenOnCanvas || map.domainKind !== 'sheaf' || map.codomainKind !== 'sheaf') return false;
    if (target === 'map-ab') {
      if (draft.sheafAId && map.domainId !== draft.sheafAId) return false;
      if (draft.sheafBId && map.codomainId !== draft.sheafBId) return false;
      return true;
    }
    if (target === 'map-bc') {
      if (draft.sheafBId && map.domainId !== draft.sheafBId) return false;
      if (draft.sheafCId && map.codomainId !== draft.sheafCId) return false;
      return true;
    }
    return false;
  }

  function activateSesPick(target = 'sheaf-a', options = {}) {
    if (!combinedSesCreateMode()) return false;
    const normalized = ['sheaf-a', 'map-ab', 'sheaf-b', 'map-bc', 'sheaf-c'].includes(target) ? target : 'sheaf-a';
    state.sesPickTarget = normalized;
    setCanvasPickEnabled(true, { render: false });
    updateSesDraftControls();
    syncGlobalPickButton();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function handleSesPick(kind, id) {
    const target = state.sesPickTarget || 'sheaf-a';
    const draft = sesDraftIds();
    let changed = false;
    const canPickMap = activeSesEditMode() ? allowableSesFixedMapPick(id, target) : allowableSesMapPick(id, target);
    if ((target === 'map-ab' || target === 'map-bc') && kind === 'map' && canPickMap) {
      if (target === 'map-ab') draft.mapABId = id;
      else draft.mapBCId = id;
      setSesDraft(draft);
      changed = true;
    } else if (kind === 'sheaf' && allowableSesSheafPick(id, target)) {
      if (target === 'sheaf-a') draft.sheafAId = id;
      else if (target === 'sheaf-b') draft.sheafBId = id;
      else if (target === 'sheaf-c') draft.sheafCId = id;
      setSesDraft(draft);
      changed = true;
    } else {
      return;
    }
    let normalizedDraft = sesDraftIds();
    if (changed && target === 'sheaf-a' && normalizedDraft.sheafBId && !normalizedDraft.mapABId) {
      const map = findSheafMapBetween(normalizedDraft.sheafAId, normalizedDraft.sheafBId);
      if (map) setSesDraft({ ...normalizedDraft, mapABId: map.id });
    }
    normalizedDraft = sesDraftIds();
    if (changed && target === 'sheaf-b') {
      const mapAB = normalizedDraft.sheafAId && !normalizedDraft.mapABId ? findSheafMapBetween(normalizedDraft.sheafAId, normalizedDraft.sheafBId) : null;
      const mapBC = normalizedDraft.sheafCId && !normalizedDraft.mapBCId ? findSheafMapBetween(normalizedDraft.sheafBId, normalizedDraft.sheafCId) : null;
      if (mapAB || mapBC) setSesDraft({ ...normalizedDraft, mapABId: mapAB?.id || normalizedDraft.mapABId, mapBCId: mapBC?.id || normalizedDraft.mapBCId });
    }
    normalizedDraft = sesDraftIds();
    if (changed && target === 'sheaf-c' && normalizedDraft.sheafBId && !normalizedDraft.mapBCId) {
      const map = findSheafMapBetween(normalizedDraft.sheafBId, normalizedDraft.sheafCId);
      if (map) setSesDraft({ ...normalizedDraft, mapBCId: map.id });
    }
    const ready = !!shortExactSequenceData();
    if (ready) setCanvasPickEnabled(false, { render: false });
    else state.sesPickTarget = nextSesPickTarget();
    updateSesDraftControls();
    recompute();
  }

  function findSheafMapBetween(domainId, codomainId) {
    return state.maps.find((map) => (
      map.domainKind === 'sheaf'
      && map.domainId === domainId
      && map.codomainKind === 'sheaf'
      && map.codomainId === codomainId
    )) || null;
  }

  function nextSesPickTarget() {
    const draft = sesDraftIds();
    if (!draft.sheafAId && !draft.mapABId) return 'sheaf-a';
    if (!draft.sheafBId && !draft.mapABId && !draft.mapBCId) return 'sheaf-b';
    if (!draft.sheafCId && !draft.mapBCId) return 'sheaf-c';
    return 'sheaf-a';
  }

  function updateSesDraftControls() {
    const show = combinedSesCreateMode();
    if (refs.sesParentsRow) refs.sesParentsRow.hidden = !show;
    syncSequenceTailControls(activeSesDraftSequence());
    if (refs.sesPickNote) {
      refs.sesPickNote.hidden = !show;
      refs.sesPickNote.textContent = sesPickHint();
    }
    updateSesSlotButton(refs.sesLeftButton, sesDraftSheaf('sheaf-a'), 'sheaf-a');
    updateSesSlotButton(refs.sesFirstMapButton, sesDraftMap('map-ab'), 'map-ab');
    updateSesSlotButton(refs.sesMiddleButton, sesDraftSheaf('sheaf-b'), 'sheaf-b');
    updateSesSlotButton(refs.sesSecondMapButton, sesDraftMap('map-bc'), 'map-bc');
    updateSesSlotButton(refs.sesRightButton, sesDraftSheaf('sheaf-c'), 'sheaf-c');
    syncGlobalPickButton();
  }

  function updateSesSlotButton(button, object, target) {
    if (!button) return;
    button.disabled = false;
    const picking = state.canvasPickEnabled && combinedSesCreateMode() && state.sesPickTarget === target;
    button.setAttribute('aria-pressed', picking ? 'true' : 'false');
    const isMap = target === 'map-ab' || target === 'map-bc';
    const fallback = isMap ? 'map' : 'sheaf';
    const label = object ? latexToPlain(sanitizeMathLabel(object.name, isMap ? 'f' : '\\mathcal{E}')) : fallback;
    button.textContent = label;
    button.title = object ? `Replace ${label}` : `Pick a ${fallback} on the canvas`;
    button.disabled = activeSesEditMode() && isMap && !!object && !state.maps.some((map) => allowableSesFixedMapPick(map.id, target));
  }

  function sesPickHint() {
    const data = shortExactSequenceData();
    if (activeSesEditMode()) {
      if (data) return 'click update to modify this short exact sequence with the existing sheaves/maps';
      return 'choose compatible existing sheaves and sequence maps';
    }
    if (data) return 'click build to add the missing sheaf/maps and arrange 0 -> A -> B -> C -> 0';
    if (!state.sheaves.length) return 'add two sheaves on the same base first';
    const target = state.sesPickTarget || nextSesPickTarget();
    if (target === 'map-ab' || target === 'map-bc') {
      if (!state.maps.some((map) => allowableSesMapPick(map.id, target))) return 'no compatible sheaf map is on the canvas yet';
      return target === 'map-ab' ? 'click the map A -> B' : 'click the map B -> C';
    }
    if (!state.sheaves.some((sheaf) => allowableSesSheafPick(sheaf.id, target))) return 'add a compatible sheaf on the same base';
    if (target === 'sheaf-a') return 'click A, the left sheaf';
    if (target === 'sheaf-b') return 'click B, the middle sheaf';
    return 'click C, the right sheaf';
  }

  function shortExactSequenceData(options = {}) {
    const draft = sesDraftIds();
    const sheaves = ['sheafAId', 'sheafBId', 'sheafCId'].map((key) => state.sheaves.find((sheaf) => sheaf.id === draft[key]) || null);
    const selectedSheaves = sheaves.filter(Boolean);
    const baseId = selectedSheaves[0]?.baseVarietyId || null;
    if (selectedSheaves.some((sheaf) => sheaf.baseVarietyId !== baseId)) return null;
    const count = selectedSheaves.length;
    if (options.requireComplete ? count !== 3 : (count !== 2 && count !== 3)) return null;
    const mapAllowed = (mapId, target) => activeSesEditMode()
      ? allowableSesFixedMapPick(mapId, target)
      : allowableSesMapPick(mapId, target);
    if (draft.mapABId && !mapAllowed(draft.mapABId, 'map-ab')) return null;
    if (draft.mapBCId && !mapAllowed(draft.mapBCId, 'map-bc')) return null;
    if (options.requireMaps && (!draft.mapABId || !draft.mapBCId)) return null;
    return {
      sheafA: sheaves[0],
      sheafB: sheaves[1],
      sheafC: sheaves[2],
      mapAB: state.maps.find((map) => map.id === draft.mapABId) || null,
      mapBC: state.maps.find((map) => map.id === draft.mapBCId) || null,
      baseVarietyId: baseId
    };
  }

  function blowupDraftVariety(role) {
    const id = role === 'point' ? state.blowupDraft?.pointId : state.blowupDraft?.baseId;
    return state.varieties.find((variety) => variety.id === id) || null;
  }

  function blowupPickAvailable() {
    if (!combinedBlowupCreateMode()) return false;
    return state.varieties.some((variety) => allowableBlowupPick(variety.id, state.blowupPickTarget));
  }

  function allowableBlowupPick(varietyId, target = state.blowupPickTarget) {
    const variety = state.varieties.find((item) => item.id === varietyId);
    if (!variety || variety.hiddenOnCanvas) return false;
    return target === 'point' ? variety.type === 'point' : variety.type !== 'point';
  }

  function activateBlowupPick(target = 'base', options = {}) {
    if (!combinedBlowupCreateMode()) return false;
    state.blowupPickTarget = target === 'point' ? 'point' : 'base';
    setCanvasPickEnabled(true, { render: false });
    updateBlowupDraftControls();
    syncGlobalPickButton();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function handleBlowupPick(kind, id) {
    if (kind !== 'variety' || !allowableBlowupPick(id, state.blowupPickTarget)) return;
    const draft = { ...(state.blowupDraft || {}) };
    if (state.blowupPickTarget === 'point') draft.pointId = id;
    else draft.baseId = id;
    state.blowupDraft = draft;
    state.blowupPickTarget = draft.baseId && !draft.pointId ? 'point' : 'base';
    updateBlowupDraftControls();
    recompute();
  }

  function updateBlowupDraftControls() {
    const show = combinedBlowupCreateMode();
    if (refs.blowupParentsRow) refs.blowupParentsRow.hidden = !show;
    if (refs.blowupPickNote) {
      refs.blowupPickNote.hidden = !show;
      refs.blowupPickNote.textContent = blowupPickHint();
    }
    updateCombinedVarietySlotButton(refs.blowupBaseButton, blowupDraftVariety('base'), 'base', combinedBlowupCreateMode() && state.blowupPickTarget === 'base');
    updateCombinedVarietySlotButton(refs.blowupPointButton, blowupDraftVariety('point'), 'point', combinedBlowupCreateMode() && state.blowupPickTarget === 'point');
    syncGlobalPickButton();
  }

  function blowupPickHint() {
    if (!state.varieties.length) return 'add a variety first';
    if (!blowupDraftVariety('base')) return 'click the variety to blow up';
    if (!blowupDraftVariety('point')) return 'click a point';
    return 'blow-up construction is ready for the later geometry rules';
  }

  function grassmannianMapDraftSheaf() {
    const id = state.grassmannianMapDraft?.sheafId;
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function grassmannianMapPickAvailable() {
    return combinedGrassmannianMapCreateMode() && state.sheaves.some((sheaf) => allowableGrassmannianMapSheafPick(sheaf.id));
  }

  function allowableGrassmannianMapSheafPick(sheafId) {
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return !!sheaf && !sheaf.hiddenOnCanvas && sheafHasLocallyFreeLabel(sheaf);
  }

  function activateGrassmannianMapPick(options = {}) {
    if (!combinedGrassmannianMapCreateMode()) return false;
    state.grassmannianMapPickTarget = 'bundle';
    setCanvasPickEnabled(true, { render: false });
    updateGrassmannianMapDraftControls();
    syncGlobalPickButton();
    if (options.render !== false) renderCanvas(state.lastResult);
    return state.canvasPickEnabled;
  }

  function handleGrassmannianMapPick(kind, id) {
    if (kind !== 'sheaf' || !allowableGrassmannianMapSheafPick(id)) return;
    state.grassmannianMapDraft = { sheafId: id };
    setCanvasPickEnabled(false, { render: false });
    updateGrassmannianMapDraftControls();
    recompute();
  }

  function updateGrassmannianMapDraftControls() {
    const show = combinedGrassmannianMapCreateMode();
    if (refs.grassmannianMapParentRow) refs.grassmannianMapParentRow.hidden = !show;
    if (refs.grassmannianMapParamsRow) refs.grassmannianMapParamsRow.hidden = !show;
    const params = syncGrassmannianMapControls();
    if (refs.grassmannianMapPickNote) {
      refs.grassmannianMapPickNote.hidden = !show;
      refs.grassmannianMapPickNote.textContent = grassmannianMapPickHint(params);
    }
    const sheaf = grassmannianMapDraftSheaf();
    if (refs.grassmannianMapBundleButton) {
      const label = sheaf ? latexToPlain(sanitizeMathLabel(sheaf.name, '\\mathcal{E}')) : 'bundle';
      refs.grassmannianMapBundleButton.textContent = label;
      refs.grassmannianMapBundleButton.title = sheaf ? `Replace ${label}` : 'Pick a locally free sheaf on the canvas';
      refs.grassmannianMapBundleButton.setAttribute('aria-pressed', state.canvasPickEnabled && show ? 'true' : 'false');
    }
    syncGlobalPickButton();
  }

  function syncGrassmannianMapControls() {
    const params = normalizedGrassmannianParams({
      grassmannianR: refs.grassmannianMapR?.value,
      grassmannianN: refs.grassmannianMapN?.value
    });
    if (refs.grassmannianMapR) {
      refs.grassmannianMapR.max = String(Math.max(1, params.n - 1));
      refs.grassmannianMapR.value = String(params.r);
    }
    if (refs.grassmannianMapN) {
      refs.grassmannianMapN.max = String(MAX_GRASSMANNIAN_N);
      refs.grassmannianMapN.value = String(params.n);
    }
    if (refs.grassmannianMapTargetPreview) refs.grassmannianMapTargetPreview.textContent = `Gr(${params.r},${params.n})`;
    return params;
  }

  function grassmannianMapPickHint(params = syncGrassmannianMapControls()) {
    if (params.dim > MAX_DIMENSION) return `Grassmannian dimension ${params.dim} exceeds the calculator limit ${MAX_DIMENSION}`;
    if (!state.sheaves.some((sheaf) => allowableGrassmannianMapSheafPick(sheaf.id))) return 'add a locally free sheaf first';
    if (!grassmannianMapDraftSheaf()) return 'click the vector bundle on the canvas';
    return 'Grassmannian-map construction is ready for the later geometry rules';
  }

  function updateCombinedVarietySlotButton(button, variety, fallback, picking) {
    if (!button) return;
    const label = variety ? latexToPlain(sanitizeMathLabel(variety.name, fallback === 'point' ? 'p' : 'X')) : fallback;
    button.textContent = label;
    button.title = variety ? `Replace ${label}` : `Pick a ${fallback} on the canvas`;
    button.setAttribute('aria-pressed', picking && state.canvasPickEnabled ? 'true' : 'false');
  }

  function productVarietyHasAncestor(varietyId, ancestorId, seen = new Set()) {
    if (!varietyId || !ancestorId || seen.has(varietyId)) return false;
    seen.add(varietyId);
    const variety = state.varieties.find((item) => item.id === varietyId);
    const parentIds = variety?.construction?.type === 'product' ? (variety.construction.varietyIds || []) : [];
    return parentIds.some((parentId) => parentId === ancestorId || productVarietyHasAncestor(parentId, ancestorId, seen));
  }

  function updateMapPickStatus() {
    if (!refs.mapPickStatus) return;
    if (!mapInputMode()) {
      refs.mapPickStatus.hidden = true;
      return;
    }
    refs.mapPickStatus.hidden = false;
    if (mapCompositionInputMode()) {
      refs.mapPickStatus.textContent = mapCompositionPickHint();
      return;
    }
    if (abelJacobiMapInputMode()) {
      refs.mapPickStatus.textContent = abelJacobiMapPickHint();
      return;
    }
    refs.mapPickStatus.textContent = ordinaryMapPickHint();
  }

  function handleCanvasPickClick(target) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    if (!state.canvasPickEnabled) return false;
    if (combinedSesCreateMode()) {
      handleSesPick(kind, id);
      return true;
    }
    if (combinedBlowupCreateMode()) {
      handleBlowupPick(kind, id);
      return true;
    }
    if (combinedGrassmannianTautologicalSesCreateMode()) {
      handleTautologicalSesPick(kind, id);
      return true;
    }
    if (combinedGrassmannianMapCreateMode()) {
      handleGrassmannianMapPick(kind, id);
      return true;
    }
    if (productVarietyInputMode()) {
      if (kind === 'variety') handleProductPick(id);
      return true;
    }
    if (mapInputMode()) {
      handleMapPick(kind, id);
      return true;
    }
    if (sheafBinaryInputMode()) {
      handleSheafBinaryPick(kind, id);
      return true;
    }
    if (sheafSelfSumInputMode()) {
      handleSheafSelfSumPick(kind, id);
      return true;
    }
    if (sheafIdealInputMode()) {
      handleSheafIdealPick(kind, id);
      return true;
    }
    if (sheafSchurInputMode()) {
      handleSheafSchurPick(kind, id);
      return true;
    }
    if (sheafMapOperationInputMode()) {
      handleSheafMapOperationPick(kind, id);
      return true;
    }
    if (sheafBasePickInputMode()) {
      if (kind !== 'variety') return true;
      chooseSheafBaseFromCanvas(id);
      return true;
    }
    return false;
  }

  function creatingProductVariety() {
    return inputIsCreateMode() && currentInputKind() === 'variety' && refs.varietyType?.value === 'product';
  }

  function productVarietyInputMode() {
    return combinedProductCreateMode() || (refs.varietyType?.value === 'product' && (
      creatingProductVariety()
      || (inputIsModifyMode() && currentInputKind() === 'variety' && selectedVariety()?.construction?.type === 'product')
    ));
  }

  function sheafMapOperationInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'sheaf' && refs.sheafType?.value === 'map-operation';
  }

  function sheafBinaryInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'sheaf' && (refs.sheafType?.value === 'direct-sum' || refs.sheafType?.value === 'tensor');
  }

  function sheafSelfSumInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'sheaf' && refs.sheafType?.value === 'self-direct-sum';
  }

  function sheafIdealInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'sheaf' && refs.sheafType?.value === 'ideal-sheaf';
  }

  function sheafSchurInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'sheaf' && refs.sheafType?.value === 'schur';
  }

  function sheafBasePickInputMode() {
    return currentInputKind() === 'sheaf'
      && !activeSesEditMode()
      && !combinedSesCreateMode()
      && !combinedGrassmannianMapCreateMode()
      && !sheafMapOperationInputMode()
      && !sheafBinaryInputMode()
      && !sheafSelfSumInputMode()
      && !sheafIdealInputMode()
      && !sheafSchurInputMode()
      && state.varieties.length > 0;
  }

  function mapInputMode() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    return kind === 'map' || combinedAbelJacobiCreateMode();
  }

  function mapCompositionInputMode() {
    return !combinedAbelJacobiCreateMode() && mapInputMode() && refs.mapType?.value === 'composition';
  }

  function abelJacobiMapInputMode() {
    return combinedAbelJacobiCreateMode() || (mapInputMode() && refs.mapType?.value === 'abel-jacobi');
  }

  function sheafMapInputMode() {
    return !combinedAbelJacobiCreateMode() && mapInputMode() && refs.mapType?.value === 'sheaf';
  }

  function ordinaryMapInputMode() {
    return mapInputMode() && !mapCompositionInputMode() && !abelJacobiMapInputMode();
  }

  function mapPickAvailable() {
    if (!mapInputMode()) return false;
    if (mapCompositionInputMode()) return state.maps.some((map) => allowableMapCompositionPick(map.id));
    if (abelJacobiMapInputMode()) return abelJacobiCurveVarieties().length > 0;
    if (sheafMapInputMode()) return visibleCanvasSheaves().length > 0;
    return visibleCanvasVarieties().length > 0;
  }

  function sheafMapDraftBase() {
    if (!sheafMapOperationInputMode()) return null;
    const map = sheafMapDraftMap();
    const operation = sheafMapOperationForMapAndBase(map, state.draftSheafBaseVarietyId || activeEditingSheaf()?.baseVarietyId || null);
    if (map && operation) {
      const baseId = operation === 'pullback' ? map.domainId : map.codomainId;
      const base = state.varieties.find((item) => item.id === baseId) || null;
      if (base) return base;
    }
    const selectedId = state.draftSheafBaseVarietyId || activeEditingSheaf()?.baseVarietyId || null;
    return state.varieties.find((item) => item.id === selectedId) || null;
  }

  function sheafMapOperationFor(map = sheafMapDraftMap()) {
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const sourceSheaf = sheafMapDraftSheaf();
    if (sourceSheaf) {
      const canPullback = sourceSheaf.baseVarietyId === map.codomainId;
      const canPushforward = sourceSheaf.baseVarietyId === map.domainId;
      if (canPullback && canPushforward) {
        return refs.sheafMapOperation?.value === 'pushforward' ? 'pushforward' : 'pullback';
      }
      if (canPullback) return 'pullback';
      if (canPushforward) return 'pushforward';
    }
    const baseId = state.draftSheafBaseVarietyId || activeEditingSheaf()?.baseVarietyId || null;
    if (map && activeEditingSheaf()?.construction?.type === 'pullback' && map.domainKind === 'variety') {
      return sheafMapOperationForMapAndBase(map, map.domainId);
    }
    if (map && activeEditingSheaf()?.construction?.type === 'pushforward' && map.codomainKind === 'variety') {
      return sheafMapOperationForMapAndBase(map, map.codomainId);
    }
    return sheafMapOperationForMapAndBase(map, baseId);
  }

  function sheafMapOperationForMapAndBase(map, baseId) {
    if (!baseId || !map) return null;
    if (map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const canPullback = map.domainId === baseId;
    const canPushforward = map.codomainId === baseId;
    if (canPullback && canPushforward) {
      return refs.sheafMapOperation?.value === 'pushforward' ? 'pushforward' : 'pullback';
    }
    if (canPullback) return 'pullback';
    if (canPushforward) return 'pushforward';
    return null;
  }

  function sheafMapDraftMap() {
    const id = state.sheafMapDraft?.mapId;
    return state.maps.find((map) => map.id === id) || null;
  }

  function sheafMapDraftSheaf() {
    const id = state.sheafMapDraft?.sheafId;
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function setSheafMapPickTarget(target = 'map') {
    const normalized = target === 'sheaf' ? 'sheaf' : 'map';
    state.sheafMapPickTarget = normalized;
    setCanvasPickEnabled(true, { render: false });
    updateSheafMapDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function sheafBinaryDraftSheaf(slot) {
    const ids = sheafBinaryDraftIds();
    const id = slot === 'right' ? ids[1] : ids[0];
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function sheafSelfSumDraftSheaf() {
    const id = state.sheafSelfSumDraft?.sheafId;
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function sheafIdealDraftMap() {
    const id = state.sheafIdealDraft?.mapId;
    return state.maps.find((map) => map.id === id) || null;
  }

  function currentSelfSumMultiplicity() {
    return normalizeSelfSumMultiplicity(refs.sheafSelfSumCount?.value);
  }

  function sheafBinaryDraftIds() {
    const ids = state.sheafBinaryDraft?.sheafIds || [];
    return [ids[0] || null, ids[1] || null];
  }

  function setSheafBinaryPickTarget(target = 'left') {
    state.sheafBinaryPickTarget = target === 'right' ? 'right' : 'left';
    setCanvasPickEnabled(true, { render: false });
    updateSheafBinaryDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function setSheafSelfSumPickTarget() {
    state.sheafSelfSumDraft = state.sheafSelfSumDraft || {};
    setCanvasPickEnabled(true, { render: false });
    updateSheafSelfSumDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function setSheafIdealPickTarget() {
    state.sheafIdealDraft = state.sheafIdealDraft || {};
    setCanvasPickEnabled(true, { render: false });
    updateSheafIdealDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function setSheafSchurPickTarget() {
    state.sheafSchurDraft = state.sheafSchurDraft || {};
    setCanvasPickEnabled(true, { render: false });
    updateSheafSchurDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function sheafBinaryPickableSheaves() {
    return state.sheaves.filter((sheaf) => (
      !inputIsModifyMode() || sheaf.id !== state.activeSheafId
    ));
  }

  function allowableSheafBinaryPick(sheafId, target = state.sheafBinaryPickTarget) {
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    if (!sheaf || (inputIsModifyMode() && sheaf.id === state.activeSheafId)) return false;
    const other = sheafBinaryDraftSheaf(target === 'right' ? 'left' : 'right');
    return !other || sheaf.baseVarietyId === other.baseVarietyId;
  }

  function sheafSelfSumPickableSheaves() {
    return state.sheaves.filter((sheaf) => allowableSheafSelfSumPick(sheaf.id));
  }

  function allowableSheafSelfSumPick(sheafId) {
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return !!sheaf && !(inputIsModifyMode() && sheaf.id === state.activeSheafId);
  }

  function sheafIdealPickableMaps() {
    return state.maps.filter((map) => allowableSheafIdealMapPick(map.id));
  }

  function allowableSheafIdealMapPick(mapId) {
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || map.hiddenOnCanvas || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return false;
    if (!map.domainId || !map.codomainId || map.domainId === map.codomainId) return false;
    const domain = state.varieties.find((variety) => variety.id === map.domainId);
    const codomain = state.varieties.find((variety) => variety.id === map.codomainId);
    if (!domain || !codomain) return false;
    const sourceDim = geometryFromVariety(domain).dim;
    const targetDim = geometryFromVariety(codomain).dim;
    return Number.isInteger(sourceDim) && Number.isInteger(targetDim) && targetDim >= sourceDim;
  }

  function sheafSchurDraftSheaf() {
    const id = state.sheafSchurDraft?.sheafId;
    return state.sheaves.find((sheaf) => sheaf.id === id) || null;
  }

  function sheafSchurPickableSheaves() {
    return state.sheaves.filter((sheaf) => allowableSheafSchurPick(sheaf.id));
  }

  function allowableSheafSchurPick(sheafId) {
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return !!sheaf
      && !(inputIsModifyMode() && sheaf.id === state.activeSheafId)
      && sheafHasLocallyFreeLabel(sheaf);
  }

  function handleSheafSchurPick(kind, id) {
    if (kind !== 'sheaf' || !allowableSheafSchurPick(id)) return;
    state.sheafSchurDraft = { sheafId: id };
    setCanvasPickEnabled(false, { render: false });
    updateSheafSchurDraftControls();
    syncDefaultRank(true);
    syncDefaultSheafName();
    recompute();
  }

  function handleSheafSelfSumPick(kind, id) {
    if (kind !== 'sheaf' || !allowableSheafSelfSumPick(id)) return;
    state.sheafSelfSumDraft = { sheafId: id };
    setCanvasPickEnabled(false, { render: false });
    updateSheafSelfSumDraftControls();
    syncDefaultRank(true);
    syncDefaultSheafName();
    recompute();
  }

  function handleSheafIdealPick(kind, id) {
    if (kind !== 'map' || !allowableSheafIdealMapPick(id)) return;
    state.sheafIdealDraft = { mapId: id };
    setCanvasPickEnabled(false, { render: false });
    updateSheafIdealDraftControls();
    syncDefaultRank(true);
    syncDefaultSheafName();
    recompute();
  }

  function handleSheafBinaryPick(kind, id) {
    if (kind !== 'sheaf' || !allowableSheafBinaryPick(id)) return;
    const ids = sheafBinaryDraftIds();
    const index = state.sheafBinaryPickTarget === 'right' ? 1 : 0;
    ids[index] = id;
    if (ids[0] && ids[1] && !allowableSheafBinaryPick(ids[1], 'right')) ids[1] = null;
    state.sheafBinaryDraft = { sheafIds: ids };
    if (state.sheafBinaryPickTarget === 'left' && !ids[1]) state.sheafBinaryPickTarget = 'right';
    if (ids[0] && ids[1]) setCanvasPickEnabled(false, { render: false });
    updateSheafBinaryDraftControls();
    syncDefaultRank(true);
    syncDefaultSheafName();
    recompute();
  }

  function updateSheafBinaryDraftControls() {
    const show = sheafBinaryInputMode();
    if (refs.sheafBinaryFormulaRow) refs.sheafBinaryFormulaRow.hidden = !show;
    if (refs.sheafBinaryExactRow) refs.sheafBinaryExactRow.hidden = !show || refs.sheafType?.value !== 'tensor';
    if (refs.sheafBinaryExact && refs.sheafType?.value !== 'tensor') refs.sheafBinaryExact.checked = false;
    if (refs.sheafBinarySymbol) refs.sheafBinarySymbol.textContent = refs.sheafType?.value === 'tensor' ? String.fromCharCode(0x2297) : String.fromCharCode(0x2295);
    updateSheafBinarySlotButton(refs.sheafBinaryLeftButton, sheafBinaryDraftSheaf('left'), 'left');
    updateSheafBinarySlotButton(refs.sheafBinaryRightButton, sheafBinaryDraftSheaf('right'), 'right');
    if (refs.sheafBinaryPickNote) {
      refs.sheafBinaryPickNote.hidden = !show;
      refs.sheafBinaryPickNote.textContent = sheafBinaryPickHint();
    }
    syncGlobalPickButton();
    if (show && !state.draftSheafNameDirty) syncDefaultSheafName();
  }

  function updateSheafSelfSumDraftControls(options = {}) {
    const show = sheafSelfSumInputMode();
    if (refs.sheafSelfSumFormulaRow) refs.sheafSelfSumFormulaRow.hidden = !show;
    if (refs.sheafSelfSumCount && options.normalizeCount) refs.sheafSelfSumCount.value = String(currentSelfSumMultiplicity());
    updateSheafSelfSumSlotButton(refs.sheafSelfSumParentButton, sheafSelfSumDraftSheaf());
    if (refs.sheafSelfSumPickNote) {
      refs.sheafSelfSumPickNote.hidden = !show;
      refs.sheafSelfSumPickNote.textContent = sheafSelfSumPickHint();
    }
    syncGlobalPickButton();
    if (show && !state.draftSheafNameDirty) syncDefaultSheafName();
  }

  function updateSheafIdealDraftControls() {
    const show = sheafIdealInputMode();
    if (refs.sheafIdealFormulaRow) refs.sheafIdealFormulaRow.hidden = !show;
    if (refs.sheafIdealConfirmRow) refs.sheafIdealConfirmRow.hidden = !show;
    updateSheafIdealMapButton(refs.sheafIdealMapButton, sheafIdealDraftMap());
    if (refs.sheafIdealPickNote) {
      refs.sheafIdealPickNote.hidden = !show;
      refs.sheafIdealPickNote.textContent = sheafIdealPickHint();
    }
    syncGlobalPickButton();
    if (show && !state.draftSheafNameDirty) syncDefaultSheafName();
  }

  function updateSheafBinarySlotButton(button, sheaf, target) {
    if (!button) return;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && sheafBinaryInputMode() && state.sheafBinaryPickTarget === target ? 'true' : 'false');
    const fallback = target === 'left' ? 'sheafA' : 'sheafB';
    const label = sheaf ? latexToPlain(sanitizeMathLabel(sheaf.name, '\\mathcal{E}')) : fallback;
    button.textContent = label;
    button.title = sheaf ? `Replace ${label}` : `Pick ${fallback} on the canvas`;
  }

  function updateSheafSelfSumSlotButton(button, sheaf) {
    if (!button) return;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && sheafSelfSumInputMode() ? 'true' : 'false');
    const label = sheaf ? latexToPlain(sanitizeMathLabel(sheaf.name, '\\mathcal{E}')) : 'sheaf';
    button.textContent = sheaf ? label : 'pick sheaf';
    button.title = sheaf ? `Replace ${label}` : 'Pick a sheaf on the canvas';
  }

  function updateSheafIdealMapButton(button, map) {
    if (!button) return;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && sheafIdealInputMode() ? 'true' : 'false');
    const label = map ? latexToPlain(sanitizeMathLabel(map.name, 'f')) : 'map';
    button.textContent = map ? label : 'pick map';
    button.title = map ? `Replace ${label}` : 'Pick an embedding map on the canvas';
  }

  function sheafBinaryPickHint() {
    if (!sheafBinaryPickableSheaves().length) return 'add compatible sheaves on the same base';
    const left = sheafBinaryDraftSheaf('left');
    const right = sheafBinaryDraftSheaf('right');
    if (!left) return 'click the first sheaf on the canvas';
    if (!state.sheaves.some((sheaf) => allowableSheafBinaryPick(sheaf.id, 'right'))) return 'add a sheaf on the same base';
    if (!right) return 'click the second sheaf on the same base';
    return inputIsModifyMode() ? 'click update to rebuild the sheaf' : 'click add to create the sheaf';
  }

  function sheafSelfSumPickHint() {
    if (!sheafSelfSumPickableSheaves().length) return 'add a sheaf first';
    if (!sheafSelfSumDraftSheaf()) return 'click a sheaf on the canvas';
    return inputIsModifyMode() ? 'click update to rebuild the self direct sum' : 'click add to create the self direct sum';
  }

  function sheafIdealPickHint() {
    if (!sheafIdealPickableMaps().length) return 'add a non-loop variety map X -> Y first';
    if (!sheafIdealDraftMap()) return 'click the embedding map X -> Y';
    if (!refs.sheafIdealConfirm?.checked) return 'verify: f is an embedding, and not an iso';
    return inputIsModifyMode() ? 'click update to rebuild the ideal sheaf' : 'click add to create the ideal sheaf';
  }

  function updateSheafSchurDraftControls() {
    const show = sheafSchurInputMode();
    if (refs.sheafSchurFormulaRow) refs.sheafSchurFormulaRow.hidden = !show;
    if (refs.sheafSchurPartitionRow) refs.sheafSchurPartitionRow.hidden = !show;
    const partition = currentSchurPartition();
    if (refs.sheafSchurDiagramPreview) {
      setInlineMath(refs.sheafSchurDiagramPreview, `_{${schurPartitionLatex(partition || [2, 1])}}`);
    }
    updateSheafSchurSlotButton(refs.sheafSchurParentButton, sheafSchurDraftSheaf());
    if (refs.sheafSchurPickNote) {
      refs.sheafSchurPickNote.hidden = !show;
      refs.sheafSchurPickNote.textContent = sheafSchurPickHint(partition);
    }
    syncGlobalPickButton();
    if (show && !state.draftSheafNameDirty) syncDefaultSheafName();
  }

  function updateSheafSchurSlotButton(button, sheaf) {
    if (!button) return;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && sheafSchurInputMode() ? 'true' : 'false');
    const label = sheaf ? latexToPlain(sanitizeMathLabel(sheaf.name, '\\mathcal{E}')) : 'bundle';
    button.textContent = label;
    button.title = sheaf ? `Replace ${label}` : 'Pick a locally free sheaf on the canvas';
  }

  function sheafSchurPickHint(partition = currentSchurPartition()) {
    if (!partition) return 'enter a Young diagram such as 2,1';
    if (!sheafSchurPickableSheaves().length) return 'add a locally free sheaf first';
    if (!sheafSchurDraftSheaf()) return 'click a locally free sheaf on the canvas';
    return inputIsModifyMode() ? 'click update to rebuild the Schur functor' : 'click add to create the Schur functor';
  }

  function sheafMapOperationSourceBaseId(map = sheafMapDraftMap(), operation = sheafMapOperationFor(map)) {
    if (!map || !operation) return null;
    return operation === 'pullback' ? map.codomainId : map.domainId;
  }

  function allowableSheafMapOperationMap(mapId) {
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return false;
    if (inputIsModifyMode() || !sheafMapDraftBase()) {
      return state.sheaves.some((sheaf) => (
        sheaf.id !== state.activeSheafId
        && (
          (sheaf.baseVarietyId === map.codomainId && sheafMapOperationForMapAndBase(map, map.domainId) === 'pullback')
          || (sheaf.baseVarietyId === map.domainId && sheafMapOperationForMapAndBase(map, map.codomainId) === 'pushforward')
        )
      ));
    }
    const base = sheafMapDraftBase();
    if (!base) return false;
    return map.domainId === base.id || map.codomainId === base.id;
  }

  function allowableSheafMapOperationSheaf(sheafId) {
    const map = sheafMapDraftMap();
    const operation = sheafMapOperationFor(map);
    const sourceBaseId = sheafMapOperationSourceBaseId(map, operation);
    return state.sheaves.some((sheaf) => (
      sheaf.id === sheafId
      && !(inputIsModifyMode() && sheaf.id === state.activeSheafId)
      && (
        sourceBaseId
          ? sheaf.baseVarietyId === sourceBaseId
          : !!map && (sheaf.baseVarietyId === map.domainId || sheaf.baseVarietyId === map.codomainId)
      )
    ));
  }

  function syncSheafMapDraftBaseFromOperation() {
    const map = sheafMapDraftMap();
    const operation = sheafMapOperationFor(map);
    if (!map || !operation) return null;
    const baseId = operation === 'pullback' ? map.domainId : map.codomainId;
    if (!state.varieties.some((item) => item.id === baseId)) return null;
    state.draftSheafBaseVarietyId = baseId;
    if (refs.sheafBaseVariety) {
      if (!Array.from(refs.sheafBaseVariety.options || []).some((option) => option.value === baseId)) syncSheafBaseOptions(true);
      refs.sheafBaseVariety.value = baseId;
    }
    return baseId;
  }

  function handleSheafMapOperationPick(kind, id) {
    if (state.sheafMapPickTarget === 'map' && kind === 'map' && allowableSheafMapOperationMap(id)) {
      const changingMap = state.sheafMapDraft?.mapId !== id;
      if (changingMap && refs.sheafMapOperation) refs.sheafMapOperation.value = 'auto';
      state.sheafMapDraft = { mapId: id, sheafId: null };
      syncSheafMapDraftBaseFromOperation();
      state.sheafMapPickTarget = 'sheaf';
      updateSheafMapDraftControls();
      syncDefaultRank(true);
      syncDefaultSheafName();
      recompute();
      return;
    }
    if (state.sheafMapPickTarget === 'sheaf' && kind === 'sheaf' && allowableSheafMapOperationSheaf(id)) {
      state.sheafMapDraft = { ...(state.sheafMapDraft || {}), sheafId: id };
      syncSheafMapDraftBaseFromOperation();
      setCanvasPickEnabled(false, { render: false });
      updateSheafMapDraftControls();
      syncDefaultRank(true);
      syncDefaultSheafName();
      recompute();
    }
  }

  function updateSheafMapDraftControls() {
    if (!refs.sheafMapOperationRow && !refs.sheafMapPickNote && !refs.sheafMapFormulaRow) return;
    const show = sheafMapOperationInputMode();
    const map = show ? sheafMapDraftMap() : null;
    const base = show ? sheafMapDraftBase() : null;
    const loopMap = !!map && map.domainKind === 'variety' && map.domainId === map.codomainId;
    const operation = show ? sheafMapOperationFor(map) : null;
    if (refs.sheafMapOperationRow) refs.sheafMapOperationRow.hidden = !show || !loopMap;
    if (refs.sheafMapFormulaRow) refs.sheafMapFormulaRow.hidden = !show;
    if (refs.sheafMapExactRow) refs.sheafMapExactRow.hidden = !show;
    if (refs.sheafMapProperRow) refs.sheafMapProperRow.hidden = !show || operation !== 'pushforward';
    if (refs.sheafMapProper && operation === 'pullback') refs.sheafMapProper.checked = false;
    updateSheafMapFormulaControls(show, operation);
    if (refs.sheafMapPickNote) {
      refs.sheafMapPickNote.hidden = !show;
      refs.sheafMapPickNote.textContent = sheafMapPickHint(base, map);
    }
    syncGlobalPickButton();
    if (show && !state.draftSheafNameDirty) syncDefaultSheafName();
  }

  function updateSheafMapFormulaControls(show, operation = sheafMapOperationFor()) {
    const map = show ? sheafMapDraftMap() : null;
    const sheaf = show ? sheafMapDraftSheaf() : null;
    const decoration = sheafMapFormulaDecoration(operation);
    if (refs.sheafMapPrefix) {
      refs.sheafMapPrefix.textContent = decoration.prefix || '';
      refs.sheafMapPrefix.hidden = !show || !decoration.prefix;
    }
    if (refs.sheafMapScript) {
      refs.sheafMapScript.textContent = decoration.script;
      refs.sheafMapScript.hidden = !show;
    }
    updateSheafMapSlotButton(refs.sheafMapMapButton, map, 'map');
    updateSheafMapSlotButton(refs.sheafMapSheafButton, sheaf, 'sheaf');
  }

  function updateSheafMapSlotButton(button, object, target) {
    if (!button) return;
    const picking = state.canvasPickEnabled && sheafMapOperationInputMode() && state.sheafMapPickTarget === target;
    button.setAttribute('aria-pressed', picking ? 'true' : 'false');
    const fallback = target === 'map' ? 'map' : 'sheaf';
    const label = object ? latexToPlain(sanitizeMathLabel(object.name, target === 'map' ? 'f' : '\\mathcal{E}')) : fallback;
    button.textContent = object && inputIsModifyMode() ? `replace ${label}` : (object ? label : `pick ${fallback}`);
    button.title = object ? `Pick a replacement for ${label}` : `Pick a ${fallback} on the canvas`;
  }

  function sheafMapPickHint(base = sheafMapDraftBase(), map = sheafMapDraftMap()) {
    if (!base) return 'pick a base variety first';
    if (!state.maps.some((item) => allowableSheafMapOperationMap(item.id))) return inputIsModifyMode() ? 'add a compatible map and source sheaf' : 'add a map touching the base variety';
    if (state.sheafMapPickTarget === 'map') return map ? 'click a map to replace the parent map' : 'click a map whose domain or codomain is the base variety';
    if (!map) return 'click the map button first';
    const sourceBaseId = sheafMapOperationSourceBaseId(map);
    if (!state.sheaves.some((sheaf) => sheaf.baseVarietyId === sourceBaseId && !(inputIsModifyMode() && sheaf.id === state.activeSheafId))) return 'add a sheaf on the source side of the operation';
    if (state.sheafMapPickTarget === 'sheaf') return 'click a sheaf on the source side of the operation';
    if (!sheafMapDraftSheaf()) return 'click the sheaf button first';
    return inputIsModifyMode() ? 'click update to rebuild the sheaf' : 'click add to create the sheaf';
  }

  function handleProductPick(varietyId) {
    if (!productCanPickVariety(varietyId)) return;
    const ids = productDraftFactorIds();
    let nextIds = [...ids];
    if (inputIsModifyMode()) {
      nextIds[state.productPickIndex] = varietyId;
    } else {
      nextIds[state.productPickIndex] = varietyId;
      if (state.productPickIndex === 0) state.productPickIndex = nextIds[1] ? 0 : 1;
      else state.productPickIndex = nextIds[0] ? 1 : 0;
    }
    state.productDraft = nextIds.some(Boolean) ? { varietyIds: nextIds.slice(0, 2) } : null;
    updateProductDraftControls();
    recompute();
  }

  function chooseSheafBaseFromCanvas(varietyId) {
    if (!state.varieties.some((variety) => variety.id === varietyId)) return;
    setDraftBaseVariety(varietyId);
    if (!inputIsModifyMode()) {
      state.activeSequenceId = null;
      state.activeVarietyId = varietyId;
    }
    setCanvasPickEnabled(false, { render: false });
    syncDefaultRank(true);
    syncDefaultSheafName();
    normalizeControlVisibility();
    recompute();
  }

  function allowableSheafBase(varietyId) {
    const variety = state.varieties.find((item) => item.id === varietyId);
    if (!variety) return false;
    if (refs.sheafType?.value === 'twist') return varietySupportsTwist(variety.type || 'abstract');
    if (isUniversalBundleSheafType(refs.sheafType?.value)) return varietySupportsUniversalBundle(variety.type || 'abstract');
    return true;
  }

  function handleMapPick(kind, id) {
    if (mapCompositionInputMode()) {
      handleMapCompositionPick(kind, id);
      return;
    }
    if (abelJacobiMapInputMode()) {
      handleAbelJacobiMapPick(kind, id);
      return;
    }
    const endpointKind = sheafMapInputMode() ? 'sheaf' : 'variety';
    const endpointCollection = endpointKind === 'sheaf' ? state.sheaves : state.varieties;
    if (kind !== endpointKind || !endpointCollection.some((item) => item.id === id)) return;
    if (endpointCollection.some((item) => item.id === id && item.hiddenOnCanvas)) return;
    const draft = state.mapDraft?.type === 'ordinary' ? { ...state.mapDraft } : { type: 'ordinary' };
    if (state.mapPickTarget === 'codomain') {
      draft.codomainKind = endpointKind;
      draft.codomainId = id;
    } else {
      draft.domainKind = endpointKind;
      draft.domainId = id;
      if (!draft.codomainId && inputIsModifyMode()) {
        const active = selectedMap();
        if (active?.codomainKind === endpointKind) {
          draft.codomainKind = endpointKind;
          draft.codomainId = active.codomainId;
        }
      }
      if (!draft.codomainId) state.mapPickTarget = 'codomain';
    }
    state.mapDraft = draft;
    if (draft.domainId && draft.codomainId) setCanvasPickEnabled(false, { render: false });
    updateMapDraftControls();
    syncDefaultMapName();
    recompute();
  }

  function handleMapCompositionPick(kind, id) {
    if (kind !== 'map' || !allowableMapCompositionPick(id)) return;
    const ids = mapDraftMapIds();
    const index = state.mapPickTarget === 'second' ? 1 : 0;
    ids[index] = id;
    state.mapDraft = { type: 'composition', mapIds: ids };
    if (state.mapPickTarget === 'first' && !ids[1]) state.mapPickTarget = 'second';
    if (ids[0] && ids[1]) setCanvasPickEnabled(false, { render: false });
    updateMapDraftControls();
    syncDefaultMapName();
    recompute();
  }

  function handleAbelJacobiMapPick(kind, id) {
    if (kind !== 'variety' || !allowableAbelJacobiCurvePick(id)) return;
    state.mapDraft = { type: 'abel-jacobi', curveId: id };
    setCanvasPickEnabled(false, { render: false });
    updateMapDraftControls();
    syncDefaultMapName();
    recompute();
  }

  function mapDraftMapIds() {
    const ids = state.mapDraft?.type === 'composition' ? (state.mapDraft.mapIds || []) : [];
    return [ids[0] || null, ids[1] || null];
  }

  function mapDraftAbelJacobiCurve() {
    const id = state.mapDraft?.type === 'abel-jacobi' ? state.mapDraft.curveId : null;
    const variety = state.varieties.find((item) => item.id === id);
    return variety && abelJacobiCurveGenus(geometryFromVariety(variety)) != null ? variety : null;
  }

  function mapDraftMap(slot) {
    const ids = mapDraftMapIds();
    const id = slot === 'second' ? ids[1] : ids[0];
    return state.maps.find((map) => map.id === id) || null;
  }

  function setMapPickTarget(target = 'domain') {
    const composition = mapCompositionInputMode();
    if (composition) {
      state.mapPickTarget = target === 'second' ? 'second' : 'first';
    } else if (abelJacobiMapInputMode()) {
      state.mapPickTarget = 'curve';
    } else {
      state.mapPickTarget = target === 'codomain' ? 'codomain' : 'domain';
    }
    setCanvasPickEnabled(true, { render: false });
    updateMapDraftControls();
    syncGlobalPickButton();
    renderCanvas(state.lastResult);
  }

  function updateMapDraftControls() {
    const show = mapInputMode();
    const composition = mapCompositionInputMode();
    const abelJacobi = abelJacobiMapInputMode();
    if (refs.mapEndpointsRow) refs.mapEndpointsRow.hidden = !show || composition || abelJacobi;
    if (refs.mapAbelJacobiRow) refs.mapAbelJacobiRow.hidden = !show || !abelJacobi;
    if (refs.mapCompositionRow) refs.mapCompositionRow.hidden = !show || !composition;
    if (refs.resetMapPick) refs.resetMapPick.hidden = !show;
    updateMapSlotButton(refs.mapDomainButton, mapDraftEndpointObject('domain'), 'domain');
    updateMapSlotButton(refs.mapCodomainButton, mapDraftEndpointObject('codomain'), 'codomain');
    updateMapSlotButton(refs.mapFirstButton, mapDraftMap('first'), 'first');
    updateMapSlotButton(refs.mapSecondButton, mapDraftMap('second'), 'second');
    updateMapSlotButton(refs.mapAbelJacobiCurveButton, mapDraftAbelJacobiCurve(), 'curve');
    updateMapPickStatus();
    syncGlobalPickButton();
  }

  function updateMapSlotButton(button, object, target) {
    if (!button) return;
    button.setAttribute('aria-pressed', state.canvasPickEnabled && (mapInputMode() || combinedAbelJacobiCreateMode()) && state.mapPickTarget === target ? 'true' : 'false');
    const isMapSlot = target === 'first' || target === 'second';
    const isCurveSlot = target === 'curve';
    const endpointKind = sheafMapInputMode() ? 'sheaf' : 'variety';
    const fallback = isMapSlot ? 'map' : (isCurveSlot ? 'curve' : endpointKind);
    const label = object ? objectPlainLabel(isMapSlot ? 'map' : endpointKind, object.id) : fallback;
    button.textContent = label;
    button.title = object ? `Replace ${label}` : `Pick a ${fallback} on the canvas`;
  }

  function mapDraftEndpointObject(role) {
    const draft = state.mapDraft || {};
    const id = role === 'codomain' ? draft.codomainId : draft.domainId;
    const kind = draft[role === 'codomain' ? 'codomainKind' : 'domainKind'] || (sheafMapInputMode() ? 'sheaf' : 'variety');
    if (kind === 'sheaf') return state.sheaves.find((sheaf) => sheaf.id === id) || null;
    return state.varieties.find((variety) => variety.id === id) || null;
  }

  function ordinaryMapPickHint() {
    const endpointKind = sheafMapInputMode() ? 'sheaf' : 'variety';
    const domain = mapDraftEndpointObject('domain');
    const codomain = mapDraftEndpointObject('codomain');
    if (endpointKind === 'sheaf' && !state.sheaves.length) return 'add a sheaf first';
    if (endpointKind === 'variety' && !state.varieties.length) return 'add a variety first';
    if (!domain) return `click the domain ${endpointKind}`;
    if (!codomain) return `click the codomain ${endpointKind}`;
    if (endpointKind === 'sheaf' && domain.baseVarietyId !== codomain.baseVarietyId) return 'the sheaves must have the same base variety';
    return inputIsModifyMode() ? 'click update to rebuild the map' : 'click add to create the map';
  }

  function mapCompositionPickHint() {
    const first = mapDraftMap('first');
    const second = mapDraftMap('second');
    if (!state.maps.some((map) => allowableMapCompositionPick(map.id))) return 'add composable maps first';
    if (!first) return 'click the first map';
    if (!second) return 'click the second map after the first';
    if (first.codomainKind !== second.domainKind || first.codomainId !== second.domainId) return 'the maps must compose as second after first';
    return inputIsModifyMode() ? 'click update to rebuild the map' : 'click add to create the map';
  }

  function abelJacobiMapPickHint() {
    if (!abelJacobiCurveVarieties().length) return 'add a curve with positive numerical genus below 10 first';
    if (!mapDraftAbelJacobiCurve()) return 'click the source curve';
    return inputIsModifyMode() ? 'Abel-Jacobi maps are rebuilt from the source curve' : 'click build to create the Jacobian and Abel-Jacobi map';
  }

  function allowableMapCompositionPick(mapId, target = state.mapPickTarget) {
    const map = state.maps.find((item) => item.id === mapId);
    if (!map || (inputIsModifyMode() && map.id === state.activeMapId)) return false;
    const other = mapDraftMap(target === 'second' ? 'first' : 'second');
    if (!other) return true;
    return target === 'second'
      ? other.codomainKind === map.domainKind && other.codomainId === map.domainId
      : map.codomainKind === other.domainKind && map.codomainId === other.domainId;
  }

  function allowableAbelJacobiCurvePick(varietyId) {
    const variety = state.varieties.find((item) => item.id === varietyId);
    return !!variety && abelJacobiCurveGenus(geometryFromVariety(variety)) != null;
  }

  function createMapObject(domain, codomain, options = {}) {
    const map = createDefaultMap(domain, codomain, options);
    if (!isValidMapCodomain(map.domainKind, map.domainId, map.codomainKind, map.codomainId)) return null;
    if (!options.name) {
      map.name = uniqueObjectName('map', map.name);
    }
    state.maps.push(map);
    if (!map.curve && (!options.construction || options.autoBend)) {
      map.defaultBendPx = isSelfMap(map) ? nextDefaultSelfMapAngle(map) : nextDefaultMapBend(map);
    }
    positionMapLabel(map);
    if (options.activate !== false) {
      state.activeSequenceId = null;
      state.activeMapId = map.id;
      state.activeSheafId = null;
    }
    state.draftMapNameDirty = false;
    if (options.syncDraft !== false) {
      if (!prepareNextDraftName('map', map.name)) syncDefaultMapName(true);
      syncMapCurveControls(map);
    }
    return map;
  }

  function isValidMapCodomain(domainKind, domainId, codomainKind, codomainId) {
    if (!domainKind || !domainId || !codomainKind || !codomainId) return false;
    if (domainKind !== codomainKind) return false;
    if (domainKind === 'variety') {
      return state.varieties.some((item) => item.id === domainId)
        && state.varieties.some((item) => item.id === codomainId);
    }
    if (domainKind === 'sheaf') {
      const domain = state.sheaves.find((item) => item.id === domainId);
      const codomain = state.sheaves.find((item) => item.id === codomainId);
      return !!domain && !!codomain && domain.baseVarietyId === codomain.baseVarietyId;
    }
    return false;
  }

  function nextDefaultMapBend(map) {
    const occupied = new Set(state.maps
      .filter((item) => (
        item !== map
        &&
        !item.modified
        && item.domainKind === map.domainKind
        && item.domainId === map.domainId
        && item.codomainKind === map.codomainKind
        && item.codomainId === map.codomainId
        && Number.isFinite(item.defaultBendPx)
      ))
      .map((item) => item.defaultBendPx));
    return MAP_BEND_SLOTS.find((bend) => !occupied.has(bend)) ?? 0;
  }

  function isSelfMap(map) {
    return !!map && map.domainKind === map.codomainKind && map.domainId === map.codomainId;
  }

  function nextDefaultSelfMapAngle(map) {
    const used = new Set(state.maps
      .filter((item) => (
        item !== map
        && !item.modified
        && isSelfMap(item)
        && item.domainKind === map.domainKind
        && item.domainId === map.domainId
        && Number.isFinite(item.defaultBendPx)
      ))
      .map((item) => item.defaultBendPx));
    for (let index = 0; index < 12; index += 1) {
      const angle = index * 120;
      if (!used.has(angle)) return angle;
    }
    return 0;
  }

  function shouldUseMapCanvasDrag(target) {
    const kind = target.dataset.objectKind;
    if (!state.canvasPickEnabled || !ordinaryMapInputMode() || !inputIsCreateMode()) return false;
    if (kind !== (sheafMapInputMode() ? 'sheaf' : 'variety')) return false;
    return state.mapPickTarget === 'domain';
  }

  function startMapCanvasDrag(target, event) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    if (kind !== 'variety' && kind !== 'sheaf') return;
    const canvasRect = refs.canvas.getBoundingClientRect();
    state.mapDrag = {
      domainKind: kind,
      domainId: id,
      target,
      pointerId: event.pointerId,
      canvasRect,
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    document.addEventListener('pointermove', updateMapCanvasDrag);
    document.addEventListener('pointerup', finishMapCanvasDrag);
    document.addEventListener('pointercancel', finishMapCanvasDrag);
  }

  function updateMapCanvasDrag(event) {
    const drag = state.mapDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX - drag.canvasRect.left;
    drag.y = event.clientY - drag.canvasRect.top;
    if (!drag.moved && (Math.abs(event.clientX - drag.startX) > 5 || Math.abs(event.clientY - drag.startY) > 5)) {
      event.preventDefault();
      drag.moved = true;
      try { drag.target?.setPointerCapture?.(drag.pointerId); } catch (_) {}
      state.mapDraft = { type: 'ordinary', domainKind: drag.domainKind, domainId: drag.domainId };
      state.mapPickTarget = 'codomain';
      updateMapPickStatus();
      updateMapDraftControls();
      renderCanvas(state.lastResult);
      return;
    }
    if (!drag.moved) return;
    event.preventDefault();
    redrawCanvasSurface();
  }

  function finishMapCanvasDrag(event) {
    const drag = state.mapDrag;
    document.removeEventListener('pointermove', updateMapCanvasDrag);
    document.removeEventListener('pointerup', finishMapCanvasDrag);
    document.removeEventListener('pointercancel', finishMapCanvasDrag);
    if (!drag) return;
    const target = event.type === 'pointercancel'
      ? null
      : document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-object-kind]');
    const targetKind = target?.dataset.objectKind;
    const targetId = target?.dataset.objectId;
    try { drag.target?.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    state.mapDrag = null;
    const clickedSameLabel = !drag.moved
      && event.type !== 'pointercancel'
      && targetKind === drag.domainKind
      && targetId === drag.domainId;
    if (clickedSameLabel) {
      state.suppressLabelClickUntil = Date.now() + 180;
      handleMapPick(targetKind, targetId);
      return;
    }
    if (!drag.moved) return;
    state.suppressLabelClickUntil = Date.now() + 180;
    if (targetKind === drag.domainKind && (targetKind === 'sheaf' ? state.sheaves : state.varieties).some((item) => item.id === targetId)) {
      state.mapDraft = { type: 'ordinary', domainKind: drag.domainKind, domainId: drag.domainId, codomainKind: targetKind, codomainId: targetId };
      state.mapPickTarget = 'codomain';
      updateMapDraftControls();
    }
    recompute();
  }

  function objectPlainLabel(kind, id) {
    if (kind === 'variety') return latexToPlain(state.varieties.find((item) => item.id === id)?.name || 'X');
    if (kind === 'sheaf') return latexToPlain(state.sheaves.find((item) => item.id === id)?.name || 'E');
    if (kind === 'map') return latexToPlain(state.maps.find((item) => item.id === id)?.name || 'f');
    if (kind === 'sequence') return (state.sequences || []).find((item) => item.id === id)?.id || 'SES';
    if (kind === 'number') return (state.globalInvariants || []).find((item) => item.id === id)?.name || 'number';
    return '';
  }

  function safeParseDegrees() {
    try {
      return parseDegrees(refs.ciDegrees.value);
    } catch (_) {
      return [];
    }
  }

  function normalizedDraftDimension() {
    if (refs.varietyType?.value === 'point') return '0';
    if (refs.varietyType?.value === 'grassmannian') return String(syncGrassmannianControls().dim);
    return String(normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3));
  }

  function normalizedGrassmannianParams(source = {}) {
    const n = normalizedInt(source.n ?? source.grassmannianN ?? refs.grassmannianN?.value, 2, MAX_GRASSMANNIAN_N, 4);
    const r = normalizedInt(source.r ?? source.grassmannianR ?? refs.grassmannianR?.value, 1, Math.max(1, n - 1), Math.min(2, n - 1));
    return {
      r,
      n,
      dim: grassmannianDimension(r, n)
    };
  }

  function syncGrassmannianControls() {
    const params = normalizedGrassmannianParams();
    if (refs.grassmannianR) {
      refs.grassmannianR.max = String(Math.max(1, params.n - 1));
      refs.grassmannianR.value = String(params.r);
    }
    if (refs.grassmannianN) {
      refs.grassmannianN.max = String(MAX_GRASSMANNIAN_N);
      refs.grassmannianN.value = String(params.n);
    }
    if (refs.dim && refs.varietyType?.value === 'grassmannian') {
      refs.dim.value = String(params.dim);
    }
    return params;
  }

  function grassmannianDimension(r, n) {
    return r * Math.max(0, n - r);
  }

  function completeIntersectionDegrees() {
    return safeParseDegrees().map((degree) => normalizedInt(degree, 1, MAX_CI_DEGREE, 2));
  }

  function normalizedCompleteIntersectionDegreesText() {
    return completeIntersectionDegrees().join(', ');
  }

  function derivedCompleteIntersectionAmbient() {
    const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
    const degrees = completeIntersectionDegrees();
    return String(Math.min(MAX_AMBIENT, dim + degrees.length));
  }

  function derivedCompleteIntersectionAmbientFor(variety, degrees) {
    const dim = normalizedInt(variety?.dim, 0, MAX_DIMENSION, 3);
    return Math.min(MAX_AMBIENT, dim + degrees.length);
  }

  function syncCompleteIntersectionControls({ source = 'text' } = {}) {
    if (!refs.ciDegrees || !refs.ciEquationCount || !refs.ciDegreeSliders) return;
    let degrees = completeIntersectionDegrees();
    if (source === 'count') {
      const count = normalizedInt(refs.ciEquationCount.value, 0, MAX_CI_EQUATIONS, degrees.length);
      if (degrees.length < count) degrees = degrees.concat(Array.from({ length: count - degrees.length }, () => 2));
      else degrees = degrees.slice(0, count);
    }
    refs.ciDegrees.value = degrees.join(', ');
    refs.ciEquationCount.value = String(degrees.length);
    refs.ciEquationCountValue.textContent = String(degrees.length);
    refs.ciDegreeSliders.hidden = degrees.length === 0 || refs.varietyType.value !== 'complete-intersection';
    refs.ciDegreeSliders.innerHTML = degrees.map((degree, index) => `
      <label class="ci-degree-slider-row" for="ci-degree-${index}">
        <span>degree ${index + 1}</span>
        <input id="ci-degree-${index}" class="ci-degree-slider" type="range" min="1" max="${Math.max(MAX_CI_SLIDER_DEGREE, degree)}" step="1" value="${degree}" data-degree-index="${index}">
        <output for="ci-degree-${index}">${degree}</output>
      </label>
    `).join('');
  }

  function updateDegreeFromSlider(slider) {
    const index = Number(slider.dataset.degreeIndex);
    if (!Number.isInteger(index)) return;
    const degrees = completeIntersectionDegrees();
    degrees[index] = normalizedInt(slider.value, 1, MAX_CI_DEGREE, 2);
    refs.ciDegrees.value = degrees.join(', ');
    const output = slider.parentElement?.querySelector('output');
    if (output) output.textContent = String(degrees[index]);
    syncDefaultVarietyName();
    syncDefaultSheafName();
  }

  function defaultVarietyNameLatex() {
    const type = refs.varietyType.value;
    if (type === 'product') {
      const factors = productDraftFactors();
      if (factors.length === 2) return defaultProductVarietyNameFromObjects(factors[0], factors[1]);
    }
    if (type === 'projective') {
      const n = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      return `\\mathbb{P}^{${n}}`;
    }
    if (type === 'grassmannian') {
      const { r, n } = syncGrassmannianControls();
      return `\\operatorname{Gr}(${r},${n})`;
    }
    if (type === 'curve') return curveDefaultName(refs.curveGenus.value);
    if (type === 'abelian') return 'A';
    if (type === 'point') return POINT_VARIETY_NAMES[0];
    if (type === 'complete-intersection') {
      const degrees = safeParseDegrees();
      const ambient = derivedCompleteIntersectionAmbient();
      return degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
    }
    return 'X';
  }

  function defaultCreateVarietyNameLatex() {
    return inputIsModifyMode() ? defaultVarietyNameLatex() : uniqueObjectName('variety', defaultVarietyNameLatex());
  }

  function defaultSheafNameLatex(baseVarietyOverride = null) {
    if (refs.sheafType?.value === 'direct-sum' || refs.sheafType?.value === 'tensor') {
      const data = binarySheafConstructionData();
      if (data?.defaultName) return data.defaultName;
    }
    if (refs.sheafType?.value === 'self-direct-sum') {
      const data = selfSumSheafConstructionData();
      if (data?.defaultName) return data.defaultName;
    }
    if (refs.sheafType?.value === 'ideal-sheaf') {
      const data = idealSheafConstructionData();
      if (data?.defaultName) return data.defaultName;
      const map = sheafIdealDraftMap();
      if (map) return defaultIdealSheafNameFromObjects(map);
    }
    if (refs.sheafType?.value === 'schur') {
      const data = schurSheafConstructionData();
      if (data?.defaultName) return data.defaultName;
    }
    if (refs.sheafType?.value === 'map-operation') {
      const data = mapOperationSheafConstructionData();
      if (data?.defaultName) return data.defaultName;
    }
    const baseVariety = baseVarietyOverride || draftBaseVariety() || activeVariety();
    const geometry = baseVariety ? geometryFromVariety(baseVariety) : null;
    const variety = geometry ? geometry.labelLatex : 'X';
    const type = refs.sheafType.value;
    return defaultSheafNameFor(type, sanitizeRankInput(refs.rank.value), normalizedInt(refs.twist.value, -24, 24, 1), variety, geometry);
  }

  function defaultCreateSheafNameLatex() {
    return inputIsModifyMode() ? defaultSheafNameLatex() : uniqueObjectName('sheaf', defaultSheafNameLatex());
  }

  function sheafMapFormulaDecoration(operation = sheafMapOperationFor()) {
    const exact = !!refs.sheafMapExact?.checked;
    const proper = !!refs.sheafMapProper?.checked;
    if (operation === 'pullback') return { prefix: exact ? '' : 'L', script: '^*' };
    if (operation === 'pushforward') return { prefix: exact ? '' : 'R', script: proper ? '_*' : '_!' };
    return { prefix: exact ? '' : 'R', script: '_!' };
  }

  function normalizeDraftNameForKind(kind, value) {
    const defaultName = kind === 'map' ? defaultMapNameLatex() : (kind === 'sheaf' ? defaultSheafNameLatex() : defaultVarietyNameLatex());
    const sanitized = sanitizeMathLabel(value, defaultName);
    return inputIsModifyMode() ? sanitized : uniqueObjectName(kind, sanitized);
  }

  function defaultSheafNameFor(type, rankPlain, twist, variety, geometry = null) {
    if (type === 'structure') return `\\mathcal{O}_{${variety}}`;
    if (type === 'locally-free') return rankPlain === '1' ? '\\mathcal{L}' : '\\mathcal{E}';
    if (type === 'tangent') return `\\mathcal{T}_{${variety}}`;
    if (type === 'cotangent') return `\\Omega^1_{${variety}}`;
    if (type === 'canonical') return `K_{${variety}}`;
    if (type === 'twist') return `\\mathcal{O}_{${variety}}(${twist})`;
    if (isUniversalBundleSheafType(type)) return geometry?.type === 'grassmannian' ? 'S' : `\\mathcal{O}_{${variety}}(-1)`;
    return '\\mathcal{E}';
  }

  function defaultMapNameLatex() {
    if (refs.mapType?.value === 'composition') {
      const data = mapCompositionConstructionData();
      if (data?.defaultName) return data.defaultName;
    }
    if (refs.mapType?.value === 'abel-jacobi') {
      const curve = mapDraftAbelJacobiCurve() || abelJacobiCurveVarieties()[0];
      return defaultAbelJacobiMapNameFromCurve(curve);
    }
    return 'f';
  }

  function defaultCreateMapNameLatex() {
    if (refs.mapType?.value === 'composition') {
      const defaultName = defaultMapNameLatex();
      return inputIsModifyMode() ? defaultName : uniqueObjectName('map', defaultName);
    }
    if (inputIsModifyMode()) return defaultMapNameLatex();
    if (!refs.repeatNames?.checked) return defaultMapNameLatex();
    const sequence = repetitionNameSequence('map', defaultMapNameLatex());
    const used = new Set(state.maps.map((item) => canonicalMathLabel(item.name)));
    return sequence.find((candidate) => !used.has(canonicalMathLabel(candidate))) || defaultMapNameLatex();
  }

  function syncDefaultMapName(force = false) {
    if (!refs.mapName) return;
    if (force || !state.draftMapNameDirty) refs.mapName.value = defaultCreateMapNameLatex();
  }

  function syncDefaultVarietyName(force = false) {
    if (!refs.varietyName) return;
    if (force || !state.draftVarietyNameDirty) refs.varietyName.value = defaultCreateVarietyNameLatex();
  }

  function syncDefaultSheafName(force = false) {
    if (!refs.sheafName) return;
    if (force || !state.draftSheafNameDirty) refs.sheafName.value = defaultCreateSheafNameLatex();
  }

  function syncDefaultRank(force = false) {
    if (!refs.rank || !force) return;
    if (refs.sheafType.value === 'locally-free' || refs.sheafType.value === 'structure') refs.rank.value = '1';
    else if (refs.sheafType.value === 'abstract') refs.rank.value = 'r';
    else if (isUniversalBundleSheafType(refs.sheafType.value)) {
      const geometry = draftBaseVariety() ? geometryFromVariety(draftBaseVariety()) : null;
      refs.rank.value = universalBundleRankPlain(geometry);
    }
    else if (refs.sheafType.value === 'direct-sum' || refs.sheafType.value === 'tensor') {
      const data = binarySheafConstructionData();
      refs.rank.value = data ? constructionRankPlaceholder(data.operation, data.left, data.right) : 'r';
    }
    else if (refs.sheafType.value === 'self-direct-sum') {
      const data = selfSumSheafConstructionData();
      refs.rank.value = data ? selfSumRankPlaceholder(data.parent, data.multiplicity) : 'r';
    }
    else if (refs.sheafType.value === 'ideal-sheaf') {
      refs.rank.value = 'r';
    }
    else if (refs.sheafType.value === 'schur') {
      const data = schurSheafConstructionData();
      refs.rank.value = data ? schurRankPlaceholder(data.parent, data.partition) : 'r';
    }
    else if (refs.sheafType.value === 'map-operation') {
      const data = mapOperationSheafConstructionData();
      refs.rank.value = data?.operation === 'pullback-sheaf' ? sanitizeRankInput(data.sheaf.rank) : 'r';
    }
  }

  function refreshConstructedObjects() {
    let changed = false;
    state.varieties.forEach((variety) => {
      if (syncObjectLineage(variety, 'variety')) changed = true;
    });
    state.sheaves.forEach((sheaf) => {
      if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    });
    state.maps.forEach((map) => {
      if (syncObjectLineage(map, 'map')) changed = true;
    });
    state.varieties.forEach((variety) => {
      if (refreshConstructedVariety(variety)) changed = true;
    });
    state.sheaves.forEach((sheaf) => {
      if (refreshConstructedSheaf(sheaf)) changed = true;
    });
    state.maps.forEach((map) => {
      if (refreshConstructedMap(map)) changed = true;
    });
    if (Array.isArray(state.sequences)) {
      const before = state.sequences.length;
      state.sequences = state.sequences.filter((sequence) => {
        const sheavesPresent = (sequence.sheafIds || []).every((id) => state.sheaves.some((sheaf) => sheaf.id === id));
        const mapsPresent = (sequence.mapIds || []).every((id) => state.maps.some((map) => map.id === id));
        return sheavesPresent && mapsPresent;
      });
      if (state.sequences.length !== before) changed = true;
    }
    if (changed) {
      syncSheafBaseOptions(true);
      syncDefaultSheafName();
    }
    if (state.activeSequenceId && !state.sequences.some((sequence) => sequence.id === state.activeSequenceId)) {
      state.activeSequenceId = null;
    }
  }

  function syncObjectLineage(object, kind = objectKindForItem(object)) {
    if (!object) return false;
    const lineage = objectLineage(object, kind);
    let changed = false;
    if (JSON.stringify(object.parents || []) !== JSON.stringify(lineage.parents)) {
      object.parents = lineage.parents;
      changed = true;
    }
    if (JSON.stringify(object.subobjects || []) !== JSON.stringify(lineage.subobjects)) {
      object.subobjects = lineage.subobjects;
      changed = true;
    }
    const parentIds = lineage.parents.map((parent) => parent.id).filter(Boolean);
    if (JSON.stringify(object.parentIds || []) !== JSON.stringify(parentIds)) {
      object.parentIds = parentIds;
      changed = true;
    }
    return changed;
  }

  function objectLineage(object, kind) {
    const construction = object?.construction || null;
    if (!construction) return { parents: [], subobjects: [] };
    const parent = (parentKind, id, role) => ({ kind: parentKind, id, role });
    if (kind === 'variety' && construction.type === 'product') {
      return {
        parents: (construction.varietyIds || []).map((id, index) => parent('variety', id, index === 0 ? 'left-factor' : 'right-factor')),
        subobjects: []
      };
    }
    if (kind === 'variety' && construction.type === 'jacobian') {
      return {
        parents: [parent('variety', construction.curveId, 'curve')].filter((item) => item.id),
        subobjects: []
      };
    }
    if (kind === 'variety' && construction.type === 'blow-up-point') {
      return {
        parents: [
          parent('variety', construction.baseId, 'base'),
          parent('variety', construction.pointId, 'center')
        ].filter((item) => item.id),
        subobjects: []
      };
    }
    if (kind === 'variety' && construction.type === 'grassmannian-target') {
      return {
        parents: [
          parent('sheaf', construction.sheafId, 'bundle'),
          parent('variety', construction.baseId, 'base')
        ].filter((item) => item.id),
        subobjects: []
      };
    }
    if (kind === 'sheaf' && (construction.type === 'direct-sum' || construction.type === 'tensor')) {
      return {
        parents: (construction.sheafIds || []).map((id, index) => parent('sheaf', id, index === 0 ? 'left-summand' : 'right-summand')),
        subobjects: object.baseVarietyId ? [parent('variety', object.baseVarietyId, 'base')] : []
      };
    }
    if (kind === 'sheaf' && construction.type === 'self-direct-sum') {
      return {
        parents: [parent('sheaf', construction.sheafId, 'summand')].filter((item) => item.id),
        subobjects: object.baseVarietyId ? [parent('variety', object.baseVarietyId, 'base')] : []
      };
    }
    if (kind === 'sheaf' && construction.type === 'schur') {
      return {
        parents: [parent('sheaf', construction.sheafId, 'parent-bundle')].filter((item) => item.id),
        subobjects: object.baseVarietyId ? [parent('variety', object.baseVarietyId, 'base')] : []
      };
    }
    if (kind === 'sheaf' && (construction.type === 'pullback' || construction.type === 'pushforward')) {
      return {
        parents: [
          parent('map', construction.mapId, 'map'),
          parent('sheaf', construction.sheafId, 'source-sheaf')
        ].filter((item) => item.id),
        subobjects: object.baseVarietyId ? [parent('variety', object.baseVarietyId, 'base')] : []
      };
    }
    if (kind === 'sheaf' && construction.type === 'ses-term') {
      return {
        parents: (construction.sourceSheafIds || []).map((id) => parent('sheaf', id, 'known-term')),
        subobjects: object.baseVarietyId ? [parent('variety', object.baseVarietyId, 'base')] : []
      };
    }
    if (kind === 'map' && construction.type === 'composition') {
      return {
        parents: (construction.mapIds || []).map((id, index) => parent('map', id, index === 0 ? 'first-map' : 'second-map')),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    if (kind === 'map' && construction.type === 'projection') {
      const product = state.varieties.find((item) => item.id === construction.productId);
      const factorId = product?.construction?.type === 'product'
        ? product.construction.varietyIds?.[normalizedInt(construction.factorIndex, 0, 1, 0)]
        : null;
      return {
        parents: [
          parent('variety', construction.productId, 'product'),
          factorId ? parent('variety', factorId, 'factor') : null
        ].filter((item) => item?.id),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    if (kind === 'map' && construction.type === 'abel-jacobi') {
      return {
        parents: [
          parent('variety', construction.curveId, 'curve'),
          parent('variety', construction.jacobianId, 'jacobian')
        ].filter((item) => item.id),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    if (kind === 'map' && construction.type === 'short-exact-sequence-map') {
      return {
        parents: (construction.sheafIds || []).map((id, index) => parent('sheaf', id, ['left-term', 'middle-term', 'right-term'][index] || 'term')),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    if (kind === 'map' && construction.type === 'blow-down') {
      return {
        parents: [
          parent('variety', construction.blowupId, 'blow-up'),
          parent('variety', construction.baseId, 'base'),
          parent('variety', construction.pointId, 'center')
        ].filter((item) => item.id),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    if (kind === 'map' && construction.type === 'grassmannian-map') {
      return {
        parents: [
          parent('sheaf', construction.sheafId, 'bundle'),
          parent('variety', construction.baseId, 'base'),
          parent('variety', construction.targetId, 'target')
        ].filter((item) => item.id),
        subobjects: [
          object.domainId ? parent(object.domainKind, object.domainId, 'domain') : null,
          object.codomainId ? parent(object.codomainKind, object.codomainId, 'codomain') : null
        ].filter(Boolean)
      };
    }
    return { parents: [], subobjects: [] };
  }

  function objectKindForItem(object) {
    if (!object) return 'object';
    if (state.varieties.includes(object)) return 'variety';
    if (state.sheaves.includes(object)) return 'sheaf';
    if (state.maps.includes(object)) return 'map';
    return 'object';
  }

  function refreshConstructedVariety(variety) {
    const construction = variety?.construction;
    if (construction?.type === 'jacobian') return refreshJacobianVariety(variety, construction);
    if (construction?.type === 'blow-up-point') return refreshBlowupVariety(variety, construction);
    if (construction?.type === 'grassmannian-target') return refreshGrassmannianTargetVariety(variety, construction);
    if (construction?.type !== 'product') return false;
    const [left, right] = (construction.varietyIds || []).map((id) => state.varieties.find((item) => item.id === id));
    if (!left || !right) return false;
    const leftGeometry = geometryFromVariety(left);
    const rightGeometry = geometryFromVariety(right);
    const oldDefault = construction.defaultName || defaultProductVarietyNameFromObjects(left, right);
    const nextDefault = defaultProductVarietyNameFromObjects(left, right);
    const dim = leftGeometry.dim + rightGeometry.dim;
    let changed = false;
    if (String(variety.dim) !== String(dim)) {
      variety.dim = String(Math.min(dim, MAX_DIMENSION));
      changed = true;
    }
    if (!variety.nameDirty && canonicalMathLabel(variety.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(variety.name) !== canonicalMathLabel(nextDefault)) {
      variety.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (!variety.labelPositionDirty) {
      const oldX = variety.labelX;
      const oldY = variety.labelY;
      positionProductVarietyLabel(variety, left, right);
      if (variety.labelX !== oldX || variety.labelY !== oldY) changed = true;
    }
    if (syncObjectLineage(variety, 'variety')) changed = true;
    return changed;
  }

  function refreshJacobianVariety(variety, construction) {
    const curve = state.varieties.find((item) => item.id === construction.curveId);
    if (!curve) return false;
    const curveGeometry = geometryFromVariety(curve);
    const genus = numericalCurveGenus(curveGeometry);
    if (genus == null) return false;
    const oldDefault = construction.defaultName || defaultJacobianNameFromCurve(curve);
    const nextDefault = defaultJacobianNameFromCurve(curve);
    let changed = false;
    if (variety.type !== 'abelian') {
      variety.type = 'abelian';
      changed = true;
    }
    if (String(variety.dim) !== String(genus)) {
      variety.dim = String(genus);
      changed = true;
    }
    const nameDirty = variety.nameDirty || construction.nameDirty;
    if (!nameDirty && canonicalMathLabel(variety.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(variety.name) !== canonicalMathLabel(nextDefault)) {
      variety.name = nextDefault;
      changed = true;
    }
    if (variety.nameDirty !== !!nameDirty) {
      variety.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.nameDirty !== !!nameDirty) {
      construction.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (!variety.specialLabels?.includes('jacobian')) {
      variety.specialLabels = [...(variety.specialLabels || []), 'jacobian'];
      changed = true;
    }
    ensureThetaClass(variety);
    if (syncObjectLineage(variety, 'variety')) changed = true;
    return changed;
  }

  function refreshBlowupVariety(variety, construction) {
    const base = state.varieties.find((item) => item.id === construction.baseId);
    const point = state.varieties.find((item) => item.id === construction.pointId);
    if (!base || !point) return false;
    const nextDefault = defaultBlowupVarietyNameFromObjects(base, point);
    let changed = false;
    const nextDim = String(normalizedInt(base.dim, 0, MAX_DIMENSION, 3));
    if (variety.type !== 'abstract') {
      variety.type = 'abstract';
      changed = true;
    }
    if (variety.dim !== nextDim) {
      variety.dim = nextDim;
      changed = true;
    }
    if (!variety.nameDirty && canonicalMathLabel(variety.name) !== canonicalMathLabel(nextDefault)) {
      variety.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(variety, 'variety')) changed = true;
    return changed;
  }

  function refreshGrassmannianTargetVariety(variety, construction) {
    const bundle = state.sheaves.find((item) => item.id === construction.sheafId);
    if (!bundle) return false;
    const params = normalizedGrassmannianParams(variety);
    const nextDefault = defaultGrassmannianTargetName(params);
    let changed = false;
    if (variety.type !== 'grassmannian') {
      variety.type = 'grassmannian';
      changed = true;
    }
    if (variety.dim !== String(params.dim)) {
      variety.dim = String(params.dim);
      changed = true;
    }
    if (variety.grassmannianR !== String(params.r) || variety.grassmannianN !== String(params.n)) {
      variety.grassmannianR = String(params.r);
      variety.grassmannianN = String(params.n);
      changed = true;
    }
    if (!variety.nameDirty && canonicalMathLabel(variety.name) !== canonicalMathLabel(nextDefault)) {
      variety.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (construction.baseId !== bundle.baseVarietyId) {
      construction.baseId = bundle.baseVarietyId;
      changed = true;
    }
    if (syncObjectLineage(variety, 'variety')) changed = true;
    return changed;
  }

  function refreshConstructedSheaf(sheaf) {
    const construction = sheaf?.construction;
    if (!construction) return false;
    if (construction.type === 'direct-sum' || construction.type === 'tensor') return refreshBinaryConstructedSheaf(sheaf, construction);
    if (construction.type === 'self-direct-sum') return refreshSelfSumConstructedSheaf(sheaf, construction);
    if (construction.type === 'schur') return refreshSchurConstructedSheaf(sheaf, construction);
    if (construction.type === 'pullback' || construction.type === 'pushforward') return refreshMapConstructedSheaf(sheaf, construction);
    if (construction.type === 'ses-term') return refreshSesTermSheaf(sheaf, construction);
    return false;
  }

  function refreshBinaryConstructedSheaf(sheaf, construction) {
    const [left, right] = (construction.sheafIds || []).map((id) => state.sheaves.find((item) => item.id === id));
    if (!left || !right) return false;
    const opLatex = construction.type === 'direct-sum' ? '\\oplus' : tensorOperationLatex(construction.derived !== false);
    const oldDefault = construction.defaultName || defaultBinarySheafNameFromObjects(left, right, opLatex);
    const nextDefault = defaultBinarySheafNameFromObjects(left, right, opLatex);
    let changed = false;
    if (sheaf.baseVarietyId !== left.baseVarietyId) {
      sheaf.baseVarietyId = left.baseVarietyId;
      changed = true;
    }
    const nextRank = constructionRankPlaceholder(construction.type === 'direct-sum' ? 'direct-sum-sheaf' : 'tensor-sheaf', left, right);
    if (sheaf.rank !== nextRank) {
      sheaf.rank = nextRank;
      changed = true;
    }
    if (!sheaf.nameDirty && canonicalMathLabel(sheaf.name) !== canonicalMathLabel(nextDefault)) {
      sheaf.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    return changed;
  }

  function refreshSelfSumConstructedSheaf(sheaf, construction) {
    const parent = state.sheaves.find((item) => item.id === construction.sheafId);
    if (!parent) return false;
    const multiplicity = normalizeSelfSumMultiplicity(construction.multiplicity);
    const oldDefault = construction.defaultName || defaultSelfSumSheafNameFromObjects(parent, multiplicity);
    const nextDefault = defaultSelfSumSheafNameFromObjects(parent, multiplicity);
    let changed = false;
    if (sheaf.baseVarietyId !== parent.baseVarietyId) {
      sheaf.baseVarietyId = parent.baseVarietyId;
      changed = true;
    }
    const nextRank = selfSumRankPlaceholder(parent, multiplicity);
    if (sheaf.rank !== nextRank) {
      sheaf.rank = nextRank;
      changed = true;
    }
    const nextBasis = 'chern';
    if (sheaf.basis !== nextBasis) {
      sheaf.basis = nextBasis;
      changed = true;
    }
    if (construction.multiplicity !== multiplicity) {
      construction.multiplicity = multiplicity;
      changed = true;
    }
    if (!sheaf.nameDirty && canonicalMathLabel(sheaf.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(sheaf.name) !== canonicalMathLabel(nextDefault)) {
      sheaf.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    return changed;
  }

  function refreshSchurConstructedSheaf(sheaf, construction) {
    const parent = state.sheaves.find((item) => item.id === construction.sheafId);
    if (!parent) return false;
    const partition = normalizeSchurPartition(construction.partition) || [1];
    const oldDefault = construction.defaultName || defaultSchurSheafNameFromObjects(parent, partition);
    const nextDefault = defaultSchurSheafNameFromObjects(parent, partition);
    let changed = false;
    if (sheaf.baseVarietyId !== parent.baseVarietyId) {
      sheaf.baseVarietyId = parent.baseVarietyId;
      changed = true;
    }
    const nextRank = schurRankPlaceholder(parent, partition);
    if (sheaf.rank !== nextRank) {
      sheaf.rank = nextRank;
      changed = true;
    }
    const nextBasis = 'chern';
    if (sheaf.basis !== nextBasis) {
      sheaf.basis = nextBasis;
      changed = true;
    }
    if (JSON.stringify(construction.partition || []) !== JSON.stringify(partition)) {
      construction.partition = partition;
      changed = true;
    }
    if (!sheaf.nameDirty && canonicalMathLabel(sheaf.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(sheaf.name) !== canonicalMathLabel(nextDefault)) {
      sheaf.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    return changed;
  }

  function refreshMapConstructedSheaf(sheaf, construction) {
    const map = state.maps.find((item) => item.id === construction.mapId);
    const sourceSheaf = state.sheaves.find((item) => item.id === construction.sheafId);
    if (!map || !sourceSheaf) return false;
    const isPullback = construction.type === 'pullback';
    const functorOptions = { derived: construction.derived !== false, proper: !!construction.proper };
    const oldDefault = construction.defaultName || (isPullback ? defaultPullbackSheafNameFromObjects(map, sourceSheaf, functorOptions) : defaultPushforwardSheafNameFromObjects(map, sourceSheaf, functorOptions));
    const nextDefault = isPullback ? defaultPullbackSheafNameFromObjects(map, sourceSheaf, functorOptions) : defaultPushforwardSheafNameFromObjects(map, sourceSheaf, functorOptions);
    let changed = false;
    const nextBase = isPullback ? map.domainId : map.codomainId;
    if (map.domainKind === 'variety' && map.codomainKind === 'variety' && sheaf.baseVarietyId !== nextBase) {
      sheaf.baseVarietyId = nextBase;
      changed = true;
    }
    const nextRank = isPullback ? sanitizeRankInput(sourceSheaf.rank) : 'r';
    if (sheaf.rank !== nextRank) {
      sheaf.rank = nextRank;
      changed = true;
    }
    if (!sheaf.nameDirty && canonicalMathLabel(sheaf.name) !== canonicalMathLabel(nextDefault)) {
      sheaf.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    return changed;
  }

  function refreshSesTermSheaf(sheaf, construction) {
    const sources = (construction.sourceSheafIds || []).map((id) => state.sheaves.find((item) => item.id === id)).filter(Boolean);
    if (!sources.length) return false;
    const sequence = sesSequenceForTermSheaf(sheaf);
    const terms = sesTermSheaves(sequence);
    const termIndex = terms.findIndex((term) => term?.id === sheaf.id);
    let changed = false;
    const baseId = sources[0]?.baseVarietyId || sheaf.baseVarietyId;
    if (baseId && sheaf.baseVarietyId !== baseId) {
      sheaf.baseVarietyId = baseId;
      changed = true;
    }
    const nextRank = termIndex >= 0 ? sesRankPlaceholderFromTerms(terms, termIndex) : null;
    if (nextRank && sheaf.rank !== nextRank) {
      sheaf.rank = nextRank;
      changed = true;
    }
    if (!sheaf.nameDirty && construction.defaultName && canonicalMathLabel(sheaf.name) !== canonicalMathLabel(construction.defaultName)) {
      sheaf.name = construction.defaultName;
      changed = true;
    }
    if (syncObjectLineage(sheaf, 'sheaf')) changed = true;
    return changed;
  }

  function refreshConstructedMap(map) {
    const construction = map?.construction;
    if (construction?.type === 'projection') return refreshProjectionMap(map, construction);
    if (construction?.type === 'abel-jacobi') return refreshAbelJacobiMap(map, construction);
    if (construction?.type === 'short-exact-sequence-map') return refreshSesMap(map, construction);
    if (construction?.type === 'blow-down') return refreshBlowdownMap(map, construction);
    if (construction?.type === 'grassmannian-map') return refreshGrassmannianMap(map, construction);
    if (construction?.type !== 'composition') return false;
    const [first, second] = (construction.mapIds || []).map((id) => state.maps.find((item) => item.id === id));
    if (!first || !second) return false;
    const oldDefault = construction.defaultName || defaultComposedMapNameFromObjects(first, second);
    const nextDefault = defaultComposedMapNameFromObjects(first, second);
    let changed = false;
    if (map.domainKind !== first.domainKind || map.domainId !== first.domainId || map.codomainKind !== second.codomainKind || map.codomainId !== second.codomainId) {
      map.domainKind = first.domainKind;
      map.domainId = first.domainId;
      map.codomainKind = second.codomainKind;
      map.codomainId = second.codomainId;
      map.curve = null;
      changed = true;
    }
    const nameDirty = map.nameDirty || construction.nameDirty;
    if (!nameDirty && canonicalMathLabel(map.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(map.name) !== canonicalMathLabel(nextDefault)) {
      map.name = nextDefault;
      changed = true;
    }
    if (map.nameDirty !== !!nameDirty) {
      map.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.nameDirty !== !!nameDirty) {
      construction.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (ensureAbelJacobiKnownHomologyRules(map)) changed = true;
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function refreshSesMap(map, construction) {
    const sheaves = (construction.sheafIds || []).map((id) => state.sheaves.find((item) => item.id === id));
    if (!sheaves[0] || !sheaves[1] || !sheaves[2]) return false;
    const domain = construction.position === 1 ? sheaves[1] : sheaves[0];
    const codomain = construction.position === 1 ? sheaves[2] : sheaves[1];
    let changed = false;
    if (map.domainKind !== 'sheaf' || map.domainId !== domain.id || map.codomainKind !== 'sheaf' || map.codomainId !== codomain.id) {
      map.domainKind = 'sheaf';
      map.domainId = domain.id;
      map.codomainKind = 'sheaf';
      map.codomainId = codomain.id;
      map.curve = null;
      changed = true;
    }
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function refreshBlowdownMap(map, construction) {
    const blowup = state.varieties.find((item) => item.id === construction.blowupId);
    const base = state.varieties.find((item) => item.id === construction.baseId);
    if (!blowup || !base) return false;
    let changed = false;
    if (map.domainKind !== 'variety' || map.domainId !== blowup.id || map.codomainKind !== 'variety' || map.codomainId !== base.id) {
      map.domainKind = 'variety';
      map.domainId = blowup.id;
      map.codomainKind = 'variety';
      map.codomainId = base.id;
      map.curve = null;
      changed = true;
    }
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function refreshGrassmannianMap(map, construction) {
    const bundle = state.sheaves.find((item) => item.id === construction.sheafId);
    const base = state.varieties.find((item) => item.id === bundle?.baseVarietyId);
    const target = state.varieties.find((item) => item.id === construction.targetId);
    if (!bundle || !base || !target) return false;
    let changed = false;
    if (map.domainKind !== 'variety' || map.domainId !== base.id || map.codomainKind !== 'variety' || map.codomainId !== target.id) {
      map.domainKind = 'variety';
      map.domainId = base.id;
      map.codomainKind = 'variety';
      map.codomainId = target.id;
      map.curve = null;
      changed = true;
    }
    if (construction.baseId !== base.id) {
      construction.baseId = base.id;
      changed = true;
    }
    const nextDefault = defaultGrassmannianMapNameFromObjects(bundle);
    if (!map.nameDirty && canonicalMathLabel(map.name) !== canonicalMathLabel(nextDefault)) {
      map.name = nextDefault;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function refreshAbelJacobiMap(map, construction) {
    const curve = state.varieties.find((item) => item.id === construction.curveId);
    const jacobian = state.varieties.find((item) => item.id === construction.jacobianId);
    if (!curve || !jacobian) return false;
    const genus = abelJacobiCurveGenus(geometryFromVariety(curve));
    if (genus == null) return false;
    const oldDefault = construction.defaultName || defaultAbelJacobiMapNameFromCurve(curve);
    const nextDefault = defaultAbelJacobiMapNameFromCurve(curve);
    let changed = false;
    if (map.domainKind !== 'variety' || map.domainId !== curve.id || map.codomainKind !== 'variety' || map.codomainId !== jacobian.id) {
      map.domainKind = 'variety';
      map.domainId = curve.id;
      map.codomainKind = 'variety';
      map.codomainId = jacobian.id;
      map.curve = null;
      changed = true;
    }
    const nameDirty = map.nameDirty || construction.nameDirty;
    if (!nameDirty && canonicalMathLabel(map.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(map.name) !== canonicalMathLabel(nextDefault)) {
      map.name = nextDefault;
      changed = true;
    }
    if (map.nameDirty !== !!nameDirty) {
      map.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.nameDirty !== !!nameDirty) {
      construction.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function refreshProjectionMap(map, construction) {
    const product = state.varieties.find((item) => item.id === construction.productId);
    if (!product?.construction || product.construction.type !== 'product') return false;
    const factorIndex = normalizedInt(construction.factorIndex, 0, 1, 0);
    const factor = state.varieties.find((item) => item.id === product.construction.varietyIds?.[factorIndex]);
    if (!factor) return false;
    const oldDefault = construction.defaultName || defaultProjectionMapNameFromObjects(product, factor, factorIndex);
    const nextDefault = defaultProjectionMapNameFromObjects(product, factor, factorIndex);
    let changed = false;
    if (map.domainKind !== 'variety' || map.domainId !== product.id || map.codomainKind !== 'variety' || map.codomainId !== factor.id) {
      map.domainKind = 'variety';
      map.domainId = product.id;
      map.codomainKind = 'variety';
      map.codomainId = factor.id;
      map.curve = null;
      changed = true;
    }
    const nameDirty = map.nameDirty || construction.nameDirty;
    if (!nameDirty && canonicalMathLabel(map.name) === canonicalMathLabel(oldDefault) && canonicalMathLabel(map.name) !== canonicalMathLabel(nextDefault)) {
      map.name = nextDefault;
      changed = true;
    }
    if (map.nameDirty !== !!nameDirty) {
      map.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.nameDirty !== !!nameDirty) {
      construction.nameDirty = !!nameDirty;
      changed = true;
    }
    if (construction.defaultName !== nextDefault) {
      construction.defaultName = nextDefault;
      changed = true;
    }
    if (syncObjectLineage(map, 'map')) changed = true;
    return changed;
  }

  function recompute() {
    try {
      refreshConstructedObjects();
      normalizeControlVisibility();
      VARS.clear();
      const chosenSheaf = inputIsModifyMode() ? selectedSheaf() : null;
      const chosenVariety = inputIsModifyMode() && modifyKind() === 'variety' ? selectedVariety() : null;
      const baseVariety = chosenSheaf ? baseVarietyForSheaf(chosenSheaf) : chosenVariety;
      const geometry = baseVariety ? geometryFromVariety(baseVariety) : null;
      const sheaf = chosenSheaf && geometry ? sheafFromObject(chosenSheaf, geometry) : null;
      const result = buildResult(geometry, sheaf);
      state.lastResult = result;
      if (refs.classMessage) refs.classMessage.textContent = '';
      renderResult(result);
      refreshExport();
    } catch (error) {
      state.lastResult = null;
      if (refs.status) refs.status.textContent = error.message || 'unable to compute';
      if (refs.classActions) refs.classActions.hidden = true;
      if (refs.classCard) refs.classCard.hidden = true;
      if (refs.basisRow) refs.basisRow.hidden = true;
      if (refs.rootFormRow) refs.rootFormRow.hidden = true;
      if (refs.classTermRow) refs.classTermRow.hidden = true;
      if (refs.classChart) refs.classChart.hidden = true;
      if (refs.classMessage) {
        refs.classMessage.className = 'err';
        refs.classMessage.textContent = error.message || 'Unable to compute.';
        refs.classMessage.hidden = false;
      }
      if (refs.hodgeActions) refs.hodgeActions.hidden = true;
      if (refs.hodgeCard) refs.hodgeCard.hidden = true;
      if (refs.hodgeChart) {
        refs.hodgeChart.hidden = true;
        refs.hodgeChart.innerHTML = '';
      }
      if (refs.hodgeMessage) {
        refs.hodgeMessage.textContent = 'No Hodge numbers available for the current input.';
        refs.hodgeMessage.hidden = false;
      }
      if (refs.cohomologyActions) refs.cohomologyActions.hidden = true;
      if (refs.cohomologyCard) refs.cohomologyCard.hidden = true;
      if (refs.cohomologyChart) {
        refs.cohomologyChart.hidden = true;
        refs.cohomologyChart.innerHTML = '';
      }
      if (refs.cohomologyMessage) {
        refs.cohomologyMessage.textContent = 'No sheaf cohomology available for the current input.';
        refs.cohomologyMessage.hidden = false;
      }
      renderHomologyPanel(null);
      renderCanvas(null);
      syncChartRevealControls(null);
    }
  }

  function reportInputActionError(error) {
    const message = typeof error === 'string'
      ? error
      : (error?.message || 'Unable to build or update this object.');
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(error);
    if (refs.status) refs.status.textContent = message;
    if (refs.classMessage) {
      refs.classMessage.className = 'err';
      refs.classMessage.textContent = message;
      refs.classMessage.hidden = false;
    }
    if (refs.mapPickStatus && mapInputMode()) {
      refs.mapPickStatus.textContent = message;
      refs.mapPickStatus.hidden = false;
    }
    try {
      renderCanvas(state.lastResult);
      syncChartRevealControls(state.lastResult);
    } catch (renderError) {
      if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(renderError);
    }
  }

  function resetHomologyRulePasses() {
    state.homologyRulePasses = DEFAULT_HOMOLOGY_RULE_PASSES;
  }

  function buildResult(geometry, sheaf) {
    if (geometry && sheaf) return buildCharacteristicClasses(geometry, sheaf);
    if (geometry) {
      const hodge = buildHodgeNumbers(geometry);
      return {
        geometry,
        sheaf: null,
        bundle: null,
        hodge,
        cohomology: buildSheafCohomology(geometry, null, hodge),
        classRows: []
      };
    }
    return {
      geometry: null,
      sheaf,
      bundle: null,
      hodge: null,
      cohomology: null,
      classRows: []
    };
  }

  function normalizeControlVisibility() {
    syncInputAvailabilityControls();
    syncMapTypeOptions();
    syncSheafBaseOptions();
    const hasVariety = state.varieties.length > 0;
    const hasSheaf = !!activeSheaf();
    const draftingNumber = inputIsModifyMode() ? !!state.activeGlobalInvariantId : refs.addObjectKind?.value === 'number';
    const editingSheaf = inputIsModifyMode() && !!state.activeSheafId;
    const editingMap = inputIsModifyMode() && !!state.activeMapId;
    const draftingMap = !draftingNumber && (inputIsModifyMode() ? editingMap : (refs.addObjectKind?.value === 'map' || combinedAbelJacobiCreateMode()));
    const draftingCombinedSes = combinedSesCreateMode();
    const draftingCombinedBlowup = combinedBlowupCreateMode();
    const draftingCombinedTautologicalSes = combinedGrassmannianTautologicalSesCreateMode();
    const draftingCombinedGrassmannianMap = combinedGrassmannianMapCreateMode();
    const draftingCombinedStructure = draftingCombinedSes || draftingCombinedBlowup || draftingCombinedTautologicalSes || draftingCombinedGrassmannianMap;
    const draftingSheaf = !draftingNumber && !draftingMap && !draftingCombinedStructure && (inputIsModifyMode() ? editingSheaf : refs.addObjectKind?.value === 'sheaf');
    const draftingVariety = !draftingNumber && !draftingMap && !draftingSheaf;
    syncProductVarietyOption();
    const draftVariety = refs.varietyType.value;
    const activeVarietyType = activeVariety()?.type || 'abstract';
    const activeSheafType = activeSheaf()?.type || 'abstract';
    const draftBase = draftBaseVariety();
    const draftBaseType = draftBase?.type || 'abstract';
    let draftSheaf = refs.sheafType.value;
    const hasTwistBase = state.varieties.some((variety) => varietySupportsTwist(variety.type || 'abstract'));
    const hasUniversalBundleBase = state.varieties.some((variety) => varietySupportsUniversalBundle(variety.type || 'abstract'));
    const sheafTypeHasParentRow = (type) => type === 'map-operation' || type === 'direct-sum' || type === 'self-direct-sum' || type === 'ideal-sheaf' || type === 'tensor' || type === 'schur';
    let sheafHasParentRow = false;
    let waitingForSheafBase = false;
    let editingSheafMapOperation = false;
    let creatingSheafMapOperation = false;
    let editingSheafBinary = false;
    let creatingSheafBinary = false;
    let editingSheafSelfSum = false;
    let creatingSheafSelfSum = false;
    let editingSheafIdeal = false;
    let creatingSheafIdeal = false;
    let editingSheafSchur = false;
    let creatingSheafSchur = false;
    const refreshSheafTypeFlags = () => {
      sheafHasParentRow = sheafTypeHasParentRow(draftSheaf);
      waitingForSheafBase = inputIsCreateMode() && draftingSheaf && !sheafHasParentRow && !state.draftSheafBaseVarietyId;
      editingSheafMapOperation = inputIsModifyMode() && draftingSheaf && draftSheaf === 'map-operation';
      creatingSheafMapOperation = inputIsCreateMode() && draftingSheaf && draftSheaf === 'map-operation';
      editingSheafBinary = inputIsModifyMode() && draftingSheaf && (draftSheaf === 'direct-sum' || draftSheaf === 'tensor');
      creatingSheafBinary = inputIsCreateMode() && draftingSheaf && (draftSheaf === 'direct-sum' || draftSheaf === 'tensor');
      editingSheafSelfSum = inputIsModifyMode() && draftingSheaf && draftSheaf === 'self-direct-sum';
      creatingSheafSelfSum = inputIsCreateMode() && draftingSheaf && draftSheaf === 'self-direct-sum';
      editingSheafIdeal = inputIsModifyMode() && draftingSheaf && draftSheaf === 'ideal-sheaf';
      creatingSheafIdeal = inputIsCreateMode() && draftingSheaf && draftSheaf === 'ideal-sheaf';
      editingSheafSchur = inputIsModifyMode() && draftingSheaf && draftSheaf === 'schur';
      creatingSheafSchur = inputIsCreateMode() && draftingSheaf && draftSheaf === 'schur';
    };
    refreshSheafTypeFlags();
    const canTwist = draftingSheaf
      ? (waitingForSheafBase ? hasTwistBase : !!draftBase && varietySupportsTwist(draftBaseType))
      : hasVariety && varietySupportsTwist(activeVarietyType);
    const canUniversalBundle = draftingSheaf
      ? (waitingForSheafBase ? hasUniversalBundleBase : !!draftBase && varietySupportsUniversalBundle(draftBaseType))
      : hasVariety && varietySupportsUniversalBundle(activeVarietyType);
    const canMapOperationSheaf = hasVariety
      && state.maps.some((map) => map.domainKind === 'variety' && map.codomainKind === 'variety')
      && state.sheaves.some((sheaf) => !editingSheafMapOperation || sheaf.id !== state.activeSheafId);
    const canBinarySheaf = state.sheaves.filter((sheaf) => !editingSheafBinary || sheaf.id !== state.activeSheafId).length > 0;
    const canSelfSumSheaf = state.sheaves.some((sheaf) => !editingSheafSelfSum || sheaf.id !== state.activeSheafId);
    const canIdealSheaf = state.maps.some((map) => allowableSheafIdealMapPick(map.id)) || editingSheafIdeal;
    const canSchurSheaf = state.sheaves.some((sheaf) => (
      (!editingSheafSchur || sheaf.id !== state.activeSheafId) && sheafHasLocallyFreeLabel(sheaf)
    ));
    if (refs.twistOption) {
      refs.twistOption.hidden = !canTwist;
      refs.twistOption.disabled = !canTwist;
    }
    if (refs.universalBundleOption) {
      refs.universalBundleOption.hidden = !canUniversalBundle;
      refs.universalBundleOption.disabled = !canUniversalBundle;
    }
    const mapOperationOption = refs.sheafType?.querySelector?.('option[value="map-operation"]');
    if (mapOperationOption) {
      mapOperationOption.disabled = !canMapOperationSheaf;
      if (!canMapOperationSheaf && draftSheaf === 'map-operation' && !editingSheafMapOperation) {
        refs.sheafType.value = 'abstract';
        draftSheaf = 'abstract';
        clearSheafMapDraft();
        syncDefaultRank(true);
        syncDefaultSheafName();
      }
    }
    ['direct-sum', 'tensor'].forEach((type) => {
      const option = refs.sheafType?.querySelector?.(`option[value="${type}"]`);
      if (!option) return;
      option.disabled = !canBinarySheaf;
    });
    if (!canBinarySheaf && (draftSheaf === 'direct-sum' || draftSheaf === 'tensor') && !editingSheafBinary) {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      clearSheafBinaryDraft();
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    const selfSumOption = refs.sheafType?.querySelector?.('option[value="self-direct-sum"]');
    if (selfSumOption) selfSumOption.disabled = !canSelfSumSheaf;
    if (!canSelfSumSheaf && draftSheaf === 'self-direct-sum' && !editingSheafSelfSum) {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      clearSheafSelfSumDraft();
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    const idealOption = refs.sheafType?.querySelector?.('option[value="ideal-sheaf"]');
    if (idealOption) idealOption.disabled = !canIdealSheaf;
    if (!canIdealSheaf && draftSheaf === 'ideal-sheaf' && !editingSheafIdeal) {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      clearSheafIdealDraft();
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    const schurOption = refs.sheafType?.querySelector?.('option[value="schur"]');
    if (schurOption) schurOption.disabled = !canSchurSheaf;
    if (!canSchurSheaf && draftSheaf === 'schur' && !editingSheafSchur) {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      clearSheafSchurDraft();
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    if (!canTwist && draftSheaf === 'twist') {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    if (!canUniversalBundle && isUniversalBundleSheafType(draftSheaf)) {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    refreshSheafTypeFlags();
    const showCurve = draftVariety === 'curve';
    const showPoint = draftVariety === 'point';
    const showGrassmannian = draftVariety === 'grassmannian';
    const showCi = draftVariety === 'complete-intersection';
    const showProduct = (draftVariety === 'product' && !inputIsModifyMode() && currentInputKind() === 'variety') || combinedProductCreateMode();
    const editingProduct = draftVariety === 'product' && inputIsModifyMode() && currentInputKind() === 'variety';
    const productMode = showProduct || editingProduct;
    const varietyTypeRow = refs.varietyType?.closest('.sheaf-field-row');
    if (varietyTypeRow) varietyTypeRow.hidden = combinedProductCreateMode();
    const mapTypeRow = refs.mapType?.closest('.sheaf-field-row');
    if (mapTypeRow) mapTypeRow.hidden = combinedAbelJacobiCreateMode();
    if (productMode) updateProductDraftControls();
    else if (refs.productFactorsRow || refs.productPickNote) updateProductDraftControls();
    updateCombinedDraftControls();
    if (refs.dim) refs.dim.closest('.sheaf-field-row').hidden = productMode;
    if (refs.varietyName) refs.varietyName.closest('.sheaf-field-row').hidden = showProduct && productDraftFactors().length < 2;
    if (refs.grassmannianParamsRow) refs.grassmannianParamsRow.hidden = !showGrassmannian;
    if (showGrassmannian) syncGrassmannianControls();
    if (refs.pointNamePresetRow) refs.pointNamePresetRow.hidden = !showPoint;
    if (refs.curveGenusRow) refs.curveGenusRow.hidden = !showCurve;
    refs.ciDegreesRow.hidden = !showCi;
    if (refs.ciEquationCountRow) refs.ciEquationCountRow.hidden = !showCi;
    if (refs.ciDegreeSliders) refs.ciDegreeSliders.hidden = !showCi || completeIntersectionDegrees().length === 0;
    refs.ciNote.hidden = !showCi;
    if (refs.dim && showGrassmannian) refs.dim.readOnly = true;
    else if (refs.dim) refs.dim.readOnly = false;
    refs.twistRow.hidden = !draftingSheaf || draftSheaf !== 'twist';
    updateSheafBinaryDraftControls();
    updateSheafSelfSumDraftControls();
    updateSheafIdealDraftControls();
    updateSheafSchurDraftControls();
    updateSheafMapDraftControls();
    updateMapDraftControls();
    const activeSupportsRoots = sheafSupportsChernRoots(activeSheaf());
    const needsBasisInput = hasVariety && hasSheaf && (
      activeSupportsRoots
      || (activeVarietyType === 'abstract' && (activeSheafType === 'tangent' || activeSheafType === 'cotangent' || activeSheafType === 'canonical'))
    );
    syncBasisOptions(activeSupportsRoots);
    if (!needsBasisInput) refs.basis.value = 'chern';
    refs.basisRow.hidden = !needsBasisInput;
    syncClassDisplayControls();
    refs.rankRow.hidden = !draftingSheaf || (draftSheaf !== 'abstract' && draftSheaf !== 'locally-free');
    refs.sheafBaseRow.hidden = !draftingSheaf || sheafHasParentRow || !hasVariety;
    updateSheafBaseButton();
    if (refs.addObject) {
      const editingSequence = activeSesEditMode();
      const canAddSheaf = !draftingSheaf || creatingSheafMapOperation || creatingSheafBinary || creatingSheafSelfSum || creatingSheafIdeal || creatingSheafSchur || !!draftBase;
      const hasEditableObject = !inputIsModifyMode() || editingSequence || !!activeObjectForKind(currentInputKind());
      const creatingMap = draftingMap && inputIsCreateMode();
      const mapReady = !draftingMap || !!(mapCompositionInputMode()
        ? mapCompositionConstructionData()
        : (abelJacobiMapInputMode() ? mapDraftAbelJacobiCurve() : ordinaryMapDraftData()));
      const creatingProduct = showProduct;
      const updatingProduct = editingProduct && selectedVariety()?.construction?.type === 'product';
      const creatingSheaf = draftingSheaf && inputIsCreateMode();
      const sheafMapReady = !(creatingSheafMapOperation || editingSheafMapOperation) || !!mapOperationSheafConstructionData();
      const sheafBinaryReady = !(creatingSheafBinary || editingSheafBinary) || !!binarySheafConstructionData();
      const sheafSelfSumReady = !(creatingSheafSelfSum || editingSheafSelfSum) || !!selfSumSheafConstructionData();
      const sheafIdealReady = !(creatingSheafIdeal || editingSheafIdeal) || !!idealSheafConstructionData();
      const sheafSchurReady = !(creatingSheafSchur || editingSheafSchur) || !!schurSheafConstructionData();
      const creatingParentSheaf = creatingSheafMapOperation || creatingSheafBinary || creatingSheafSelfSum || creatingSheafIdeal || creatingSheafSchur;
      const productFactors = productDraftFactors();
      const productDim = productFactors.length === 2 ? productDimensionFromFactors(productFactors[0], productFactors[1]) : 0;
      const productNeedsFactors = creatingProduct || updatingProduct;
      const productReady = !productNeedsFactors || (productFactors.length === 2 && productDim <= MAX_DIMENSION);
      const grassmannianParams = draftingVariety && draftVariety === 'grassmannian' ? syncGrassmannianControls() : null;
      const grassmannianReady = !grassmannianParams || grassmannianParams.dim <= MAX_DIMENSION;
      const sesReady = !draftingCombinedSes || !!shortExactSequenceData();
      const sesEditReady = !activeSesEditMode() || !!shortExactSequenceData({ requireComplete: true, requireMaps: true });
      const blowupReady = !draftingCombinedBlowup || !!blowupConstructionData();
      const tautologicalSesReady = !draftingCombinedTautologicalSes || !!tautologicalSesConstructionData();
      const grassmannianMapParams = draftingCombinedGrassmannianMap ? syncGrassmannianMapControls() : null;
      const grassmannianMapReady = !draftingCombinedGrassmannianMap || !!grassmannianMapConstructionData();
      const numberReady = !draftingNumber || globalInvariantNameIsValid(refs.globalInvariantName?.value);
      refs.addObject.disabled = (draftingMap && !mapReady) || (productNeedsFactors && !productReady) || !grassmannianReady || !sesReady || !sesEditReady || !blowupReady || !tautologicalSesReady || !grassmannianMapReady || !numberReady || ((creatingSheafMapOperation || editingSheafMapOperation) && !sheafMapReady) || ((creatingSheafBinary || editingSheafBinary) && !sheafBinaryReady) || ((creatingSheafSelfSum || editingSheafSelfSum) && !sheafSelfSumReady) || ((creatingSheafIdeal || editingSheafIdeal) && !sheafIdealReady) || ((creatingSheafSchur || editingSheafSchur) && !sheafSchurReady) || (creatingSheaf && !creatingParentSheaf && waitingForSheafBase) || (creatingSheaf && !creatingParentSheaf && !hasVariety) || (!canAddSheaf && draftingSheaf && !creatingSheaf) || !hasEditableObject;
      refs.addObject.textContent = inputIsModifyMode() ? 'update' : (combinedCreateMode() ? 'build' : 'add');
      let addTitle = '';
      if (creatingMap) {
        addTitle = mapCompositionInputMode()
          ? mapCompositionPickHint()
          : (abelJacobiMapInputMode() ? abelJacobiMapPickHint() : ordinaryMapPickHint());
      } else if (!numberReady) {
        addTitle = globalInvariantNameWarning();
      } else if (draftingCombinedSes) {
        addTitle = activeSesEditMode() && !sesEditReady ? 'Use existing sheaves and maps for all five SES slots' : sesPickHint();
      } else if (draftingCombinedBlowup) {
        addTitle = blowupPickHint();
      } else if (draftingCombinedTautologicalSes) {
        addTitle = tautologicalSesPickHint();
      } else if (draftingCombinedGrassmannianMap) {
        addTitle = grassmannianMapPickHint(grassmannianMapParams);
      } else if (!grassmannianReady) {
        addTitle = `Grassmannian dimension ${grassmannianParams.dim} exceeds the calculator limit ${MAX_DIMENSION}`;
      } else if (productNeedsFactors) {
        addTitle = productFactors.length === 2 && productDim > MAX_DIMENSION
          ? `Product dimension ${productDim} exceeds the calculator limit ${MAX_DIMENSION}`
          : 'Pick two varieties on the canvas';
      } else if ((creatingSheafMapOperation || editingSheafMapOperation) && !sheafMapReady) {
        addTitle = sheafMapPickHint();
      } else if ((creatingSheafBinary || editingSheafBinary) && !sheafBinaryReady) {
        addTitle = sheafBinaryPickHint();
      } else if ((creatingSheafSelfSum || editingSheafSelfSum) && !sheafSelfSumReady) {
        addTitle = sheafSelfSumPickHint();
      } else if ((creatingSheafIdeal || editingSheafIdeal) && !sheafIdealReady) {
        addTitle = sheafIdealPickHint();
      } else if ((creatingSheafSchur || editingSheafSchur) && !sheafSchurReady) {
        addTitle = sheafSchurPickHint();
      } else if (creatingSheaf && !creatingParentSheaf && waitingForSheafBase) {
        addTitle = hasVariety ? 'Pick a base variety on the canvas first' : 'Add a variety first';
      } else if (draftingSheaf && !creatingParentSheaf && !draftBase) {
        addTitle = 'Add a base variety first';
      }
      refs.addObject.title = addTitle;
    }
    updateMapPickStatus();
    syncGlobalPickButton();
    syncInputEditorVisibility();
  }

  function syncProductVarietyOption() {
    const option = refs.varietyType?.querySelector?.('option[value="product"]');
    if (!option) return;
    const activeProduct = inputIsModifyMode() && selectedVariety()?.construction?.type === 'product';
    const canPickProduct = combinedProductCreateMode() || (inputIsModifyMode() ? activeProduct : false);
    option.hidden = !canPickProduct;
    option.disabled = !canPickProduct;
    if (!canPickProduct && refs.varietyType.value === 'product') refs.varietyType.value = 'abstract';
  }

  function geometryFromVariety(variety) {
    const type = variety?.type || 'abstract';
    if (variety?.construction?.type === 'product') {
      const [left, right] = (variety.construction.varietyIds || []).map((id) => state.varieties.find((item) => item.id === id));
      if (left && right) {
        const leftGeometry = geometryFromVariety(left);
        const rightGeometry = geometryFromVariety(right);
        const dim = Math.min(MAX_DIMENSION, leftGeometry.dim + rightGeometry.dim);
        const labelLatex = sanitizeMathLabel(variety.name, defaultProductVarietyNameFromObjects(left, right));
        Object.assign(variety, { type: 'abstract', dim: String(dim), name: labelLatex });
        const geometry = {
          type: 'product',
          dim,
          ambient: null,
          degrees: [],
          codim: null,
          labelLatex,
          labelPlain: latexToPlain(labelLatex),
          ambientLatex: 'product',
          ambientPlain: 'product',
          productFactorIds: [left.id, right.id],
          productFactors: [leftGeometry, rightGeometry]
        };
        return attachHomologyToGeometry(variety, geometry);
      }
    }
    if (type === 'projective') {
      const n = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const labelLatex = sanitizeMathLabel(variety.name, `\\mathbb{P}^{${n}}`);
      Object.assign(variety, { dim: String(n), name: labelLatex });
      const geometry = {
        type,
        dim: n,
        ambient: n,
        degrees: [],
        codim: 0,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${n}}`,
        ambientPlain: `P^${n}`
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'grassmannian') {
      const { r, n, dim } = normalizedGrassmannianParams(variety);
      const labelLatex = sanitizeMathLabel(variety.name, `\\operatorname{Gr}(${r},${n})`);
      Object.assign(variety, {
        dim: String(dim),
        grassmannianR: String(r),
        grassmannianN: String(n),
        name: labelLatex
      });
      const geometry = {
        type,
        dim,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{C}^{${n}}`,
        ambientPlain: `C^${n}`,
        grassmannianR: r,
        grassmannianN: n,
        grassmannianQRank: n - r,
        grassmannianYoungBasis: variety.grassmannianYoungBasis === true
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'curve') {
      const genus = sanitizeGenusInput(variety.genus);
      const labelLatex = sanitizeMathLabel(variety.name, curveDefaultName(genus));
      Object.assign(variety, { dim: '1', genus, name: labelLatex });
      const geometry = {
        type,
        dim: 1,
        genus,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'curve',
        ambientPlain: 'curve'
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'abelian') {
      const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 2);
      const labelLatex = sanitizeMathLabel(variety.name, 'A');
      Object.assign(variety, { dim: String(dim), name: labelLatex });
      const isJacobian = variety.construction?.type === 'jacobian' || variety.specialLabels?.includes('jacobian');
      const jacobianCurve = isJacobian
        ? state.varieties.find((item) => item.id === variety.construction?.curveId)
        : null;
      const jacobianCurveGenus = jacobianCurve ? numericalCurveGenus(geometryFromVariety(jacobianCurve)) : dim;
      const geometry = {
        type,
        dim,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'abelian',
        ambientPlain: 'abelian',
        ...(isJacobian ? {
          specialLabels: ['jacobian'],
          jacobianCurveId: jacobianCurve?.id || variety.construction?.curveId || null,
          jacobianCurveGenus
        } : {})
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'point') {
      const labelLatex = sanitizeMathLabel(variety.name, POINT_VARIETY_NAMES[0]);
      Object.assign(variety, { dim: '0', name: labelLatex });
      const geometry = {
        type,
        dim: 0,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'point',
        ambientPlain: 'point'
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'complete-intersection') {
      const degrees = parseDegrees(variety.ciDegrees || '');
      const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const ambient = derivedCompleteIntersectionAmbientFor(variety, degrees);
      const defaultLabel = degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
      const labelLatex = sanitizeMathLabel(variety.name, defaultLabel);
      Object.assign(variety, { dim: String(dim), ciAmbient: String(ambient), name: labelLatex });
      const geometry = {
        type,
        dim,
        ambient,
        degrees,
        codim: degrees.length,
        labelLatex,
        labelPlain: degrees.length ? `${latexToPlain(labelLatex)} in P^${ambient}` : latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${ambient}}`,
        ambientPlain: `P^${ambient}`
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
    const labelLatex = sanitizeMathLabel(variety.name, 'X');
    Object.assign(variety, { dim: String(dim), name: labelLatex });
    const geometry = {
      type: 'abstract',
      dim,
      ambient: null,
      degrees: [],
      codim: null,
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      ambientLatex: 'abstract',
      ambientPlain: 'abstract'
    };
    return attachHomologyToGeometry(variety, geometry);
  }

  function attachHomologyToGeometry(variety, geometry) {
    const genus = numericalCurveGenus(geometry);
    const specialLabels = [
      ...(Array.isArray(geometry.specialLabels) ? geometry.specialLabels : []),
      ...(genus != null ? ['curve', 'numerical-curve'] : [])
    ].filter((label, index, all) => label && all.indexOf(label) === index);
    const scopedGeometry = {
      ...geometry,
      ...(genus != null ? { curveGenus: genus } : {}),
      specialLabels,
      varietyId: variety?.id || null
    };
    if (variety) variety.specialLabels = specialLabels;
    const homology = ensureHomologySystem(variety, scopedGeometry);
    return { ...scopedGeometry, homology };
  }

  function ensureHomologySystem(variety, geometry) {
    const homology = variety.homology && typeof variety.homology === 'object' ? variety.homology : {};
    homology.classes = homology.classes && typeof homology.classes === 'object' ? homology.classes : {};
    homology.customClasses = Array.isArray(homology.customClasses) ? homology.customClasses : [];
    homology.customClasses = homology.customClasses.map((item) => normalizeCustomHomologyClass(item, geometry)).filter(Boolean);
    homology.rules = Array.isArray(homology.rules) ? homology.rules : [];

    const classDefs = baseHomologyClassDefinitions({ ...geometry, homology });
    classDefs.forEach((def) => {
      const existing = homology.classes[def.id] && typeof homology.classes[def.id] === 'object'
        ? homology.classes[def.id]
        : {};
      existing.symbol = sanitizeHomologySymbol(existing.symbol, def.defaultSymbol);
      homology.classes[def.id] = existing;
    });

    const existingStandardRules = new Map(homology.rules
      .filter((rule) => isStandardHomologyRuleId(rule.id))
      .map((rule) => [rule.id, rule]));
    const customRules = homology.rules.filter((rule) => !isStandardHomologyRuleId(rule.id));
    const standardRules = standardHomologyRules(geometry, existingStandardRules);
    const normalizationGeometry = { ...geometry, homology };
    homology.rules = [
      ...standardRules,
      ...customRules.map((rule) => normalizeHomologyRule(rule, normalizationGeometry, {
        includeMapClasses: false,
        preserveUnknownVariables: true
      })).filter(Boolean)
    ];
    variety.homology = homology;
    return homology;
  }

  function ensureSheafHomologySystem(sheaf, geometry) {
    if (!sheaf || !geometry) return { rules: [] };
    const homology = sheaf.homology && typeof sheaf.homology === 'object' ? sheaf.homology : {};
    homology.rules = Array.isArray(homology.rules) ? homology.rules : [];
    const normalizedSheaf = sheaf.labelLatex ? sheaf : sheafFromObject(sheaf, geometry);
    homology.rules = homology.rules.map((rule) => normalizeSheafHomologyRule(rule, normalizedSheaf, geometry)).filter(Boolean);
    sheaf.homology = homology;
    return homology;
  }

  function normalizeSheafHomologyRule(rule, sheaf, geometry) {
    if (!rule || typeof rule !== 'object') return null;
    const ruleGeometry = sheafHomologyGeometry(sheaf, geometry);
    const sheafDefs = sheafHomologyClassDefinitions(sheaf, geometry);
    const defs = [...homologyClassDefinitions(ruleGeometry), ...sheafDefs];
    sheafDefs.forEach(defineSheafClassVariable);
    const variableIds = new Set(defs.flatMap((def) => [...homologyDefVariableIds(def, ruleGeometry)]));
    const lhsPowers = normalizeSheafHomologyPowers(rule.lhs?.powers || rule.lhsPowers, variableIds, ruleGeometry);
    const rhsTerms = normalizeSheafHomologyRuleTerms(rule.rhs || rule.rhsTerms, variableIds, ruleGeometry);
    if (!lhsPowers || !rhsTerms) return null;
    const lhsIds = Object.keys(lhsPowers);
    if (lhsIds.length !== 1 || !sheafDefs.some((def) => def.id === lhsIds[0]) || lhsPowers[lhsIds[0]] !== 1) return null;
    const normalized = {
      id: rule.id || nextInputId('R'),
      builtin: false,
      enabled: rule.enabled !== false,
      lhs: { powers: lhsPowers },
      rhs: rhsTerms
    };
    return homologyRulePreservesDegree(normalized, defs, { geometry: ruleGeometry }) ? normalized : null;
  }

  function normalizeSheafHomologyPowers(powers, variableIds, geometry) {
    if (!powers || typeof powers !== 'object') return null;
    const out = {};
    for (const [id, exp] of Object.entries(powers)) {
      const normalizedId = variableIds.has(id) ? id : canonicalHomologyVariableId(id, geometry);
      if (!variableIds.has(normalizedId)) return null;
      const exponent = normalizedInt(exp, 0, MAX_DIMENSION, 0);
      if (exponent > 0) out[normalizedId] = (out[normalizedId] || 0) + exponent;
    }
    return Object.keys(out).length ? out : null;
  }

  function normalizeSheafHomologyRuleTerms(terms, variableIds, geometry) {
    if (!Array.isArray(terms)) return null;
    const out = [];
    for (const term of terms) {
      if (!term || typeof term !== 'object') return null;
      const powers = normalizeSheafHomologyPowers(term.powers || {}, variableIds, geometry) || {};
      let coefficient;
      try {
        coefficient = formatFractionPlain(parseRuleCoefficient(term.coefficient || '1'));
      } catch (_) {
        return null;
      }
      if (parseRuleCoefficient(coefficient).isZero()) continue;
      out.push({ coefficient, powers });
    }
    return out;
  }

  function sheafHomologyGeometry(sheaf, geometry) {
    const sourceObject = sheaf?.sourceObject || sheaf || activeSheaf();
    return {
      ...geometry,
      homology: {
        classes: geometry.homology?.classes || {},
        customClasses: geometry.homology?.customClasses || [],
        rules: [
          ...(geometry.homology?.rules || []),
          ...(sourceObject?.homology?.rules || [])
        ]
      }
    };
  }

  function homologyClassDefinitions(geometry, options = {}) {
    const defs = baseHomologyClassDefinitions(geometry);
    if (options.includeMapClasses === false) return defs;
    return [...defs, ...mapHomologyClassDefinitions(geometry, defs)];
  }

  function baseHomologyClassDefinitions(geometry) {
    if (!geometry) return [];
    const homology = geometry.homology || {};
    const defs = [
      homologyClassDefinition(
        HOMOLOGY_UNIT_CLASS,
        0,
        '1',
        'unit',
        homology,
        '1',
        geometry
      )
    ];
    if (geometryHasThetaClass(geometry)) {
      defs.push(homologyClassDefinition(
        HOMOLOGY_THETA_CLASS,
        1,
        '\\Theta',
        'theta divisor',
        homology,
        '\\Theta',
        geometry
      ));
    }
    defs.push(...grassmannianHomologyClassDefinitions(geometry, homology));
    if (varietyHasHyperplaneClass(geometry.type)) {
      defs.push(homologyClassDefinition(
        HOMOLOGY_HYPERPLANE_CLASS,
        1,
        'H',
        'hyperplane',
        homology,
        'H',
        geometry
      ));
    }
    defs.push(...curveSymplecticClassDefinitions(geometry, homology));
    if (Number.isInteger(geometry.dim) && geometry.dim >= 0) {
      defs.push(homologyClassDefinition(
        HOMOLOGY_POINT_CLASS,
        geometry.dim,
        '[p]',
        'point',
        homology,
        '[p]',
        geometry
      ));
    }
    defs.push(...productBoxClassDefinitions(geometry, homology));
    for (const custom of homology.customClasses || []) {
      const normalized = normalizeCustomHomologyClass(custom, geometry);
      if (!normalized) continue;
      const def = homologyClassDefinition(
        normalized.id,
        normalized.degree,
        normalized.symbol,
        normalized.special === 'tangent-chern' ? 'special' : 'custom',
        homology,
        normalized.symbol,
        geometry
      );
      if (normalized.special) def.special = normalized.special;
      defs.push(def);
    }
    return defs;
  }

  function productBoxClassDefinitions(geometry, homology) {
    const context = productGeometryContext(geometry);
    if (!context) return [];
    const leftMonomials = productFactorBoxMonomials(context.leftGeometry);
    const rightMonomials = productFactorBoxMonomials(context.rightGeometry);
    const defs = [];
    for (const left of leftMonomials) {
      for (const right of rightMonomials) {
        if (!left.key && !right.key) continue;
        const degree = left.degree + right.degree;
        if (degree > geometry.dim) continue;
        const cohomologyDegree = left.cohomologyDegree + right.cohomologyDegree;
        if (cohomologyDegree > 2 * geometry.dim) continue;
        if (!productBidegreeFits(context, [left.cohomologyDegree, right.cohomologyDegree])) continue;
        const productBox = {
          factorIds: context.factorIds,
          leftKey: left.key,
          rightKey: right.key,
          leftDegree: left.degree,
          rightDegree: right.degree,
          leftCohomologyDegree: left.cohomologyDegree,
          rightCohomologyDegree: right.cohomologyDegree
        };
        const id = productBoxClassId(productBox);
        const symbol = productBoxSymbolLatex(left.latex, right.latex);
        const plain = productBoxSymbolPlain(left.plain, right.plain);
        const def = homologyClassDefinition(
          id,
          degree,
          symbol,
          'product box',
          homology,
          symbol,
          geometry
        );
        def.cohomologyDegree = cohomologyDegree;
        def.symbolPlain = plain;
        def.productBox = productBox;
        defs.push(def);
        if (defs.length >= MAX_PRODUCT_BOX_CLASSES) return defs;
      }
    }
    return defs;
  }

  function grassmannianHomologyClassDefinitions(geometry, homology) {
    const params = grassmannianParamsFromGeometry(geometry);
    if (!params) return [];
    const defs = [];
    for (let index = 1; index <= Math.min(params.r, params.dim); index += 1) {
      const symbol = grassmannianTautologicalClassSymbol(index);
      defs.push(homologyClassDefinition(
        grassmannianTautologicalClassId(index),
        index,
        symbol,
        'tautological',
        homology,
        symbol,
        geometry
      ));
    }
    if (grassmannianYoungBasisEnabled(geometry)) {
      grassmannianPartitions(params.r, params.q).forEach((partition) => {
        if (!partition.length) return;
        const id = grassmannianYoungClassId(partition);
        const symbol = grassmannianYoungClassSymbol(partition);
        const def = homologyClassDefinition(
          id,
          partition.reduce((sum, part) => sum + part, 0),
          symbol,
          'Schubert class',
          homology,
          symbol,
          geometry
        );
        def.grassmannianYoungPartition = partition;
        defs.push(def);
      });
    }
    return defs;
  }

  function grassmannianTautologicalClassId(index) {
    return `${HOMOLOGY_GRASSMANNIAN_TAUTOLOGICAL_CLASS_PREFIX}${index}`;
  }

  function grassmannianTautologicalClassSymbol(index) {
    return `c_{${index}}(S)`;
  }

  function grassmannianTautologicalChernClassPoly(geometry, index) {
    const classId = grassmannianTautologicalClassId(index);
    const id = homologyVariableId(classId, geometry);
    const def = homologyClassDefById(geometry, classId);
    defineVariable(id, index, def?.symbolLatex || grassmannianTautologicalClassSymbol(index));
    return Poly.variable(id);
  }

  function grassmannianTautologicalChernComponents(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const d = geometry.dim;
    const comps = zeroComponentArray(d);
    if (!params) return comps;
    for (let index = 1; index <= Math.min(params.r, d); index += 1) {
      comps[index] = grassmannianTautologicalChernClassPoly(geometry, index);
    }
    return comps;
  }

  function grassmannianPluckerFirstChernPoly(geometry) {
    return grassmannianTautologicalChernClassPoly(geometry, 1).neg();
  }

  function grassmannianYoungBasisEnabled(geometry) {
    if (geometry?.type !== 'grassmannian') return false;
    if (geometry.grassmannianYoungBasis === true) return true;
    const variety = geometry.varietyId ? state.varieties.find((item) => item.id === geometry.varietyId) : null;
    return variety?.grassmannianYoungBasis === true;
  }

  function grassmannianYoungClassId(partition) {
    const normalized = normalizeGrassmannianPartition(partition);
    return `${HOMOLOGY_GRASSMANNIAN_YOUNG_CLASS_PREFIX}${normalized.length ? normalized.join('_') : 'empty'}`;
  }

  function grassmannianYoungClassSymbol(partition) {
    const normalized = normalizeGrassmannianPartition(partition);
    return `\\sigma_{${normalized.length ? normalized.join(',') : '0'}}`;
  }

  function grassmannianColumnPartition(length) {
    return Array.from({ length }, () => 1);
  }

  function normalizeGrassmannianPartition(partition) {
    if (!Array.isArray(partition)) return [];
    return partition.map((part) => Number(part)).filter((part) => Number.isInteger(part) && part > 0);
  }

  function grassmannianPartitions(r, q) {
    const rows = Math.max(0, r);
    const width = Math.max(0, q);
    const out = [];
    const visit = (row, maxPart, parts) => {
      if (row === rows) {
        out.push(normalizeGrassmannianPartition(parts));
        return;
      }
      for (let part = maxPart; part >= 0; part -= 1) {
        visit(row + 1, part, part > 0 ? [...parts, part] : parts);
      }
    };
    visit(0, width, []);
    return out;
  }

  function grassmannianParamsFromGeometry(geometry) {
    if (geometry?.type !== 'grassmannian') return null;
    const n = normalizedInt(geometry.grassmannianN, 2, MAX_GRASSMANNIAN_N, 4);
    const r = normalizedInt(geometry.grassmannianR, 1, Math.max(1, n - 1), Math.min(2, n - 1));
    const q = n - r;
    const dim = grassmannianDimension(r, n);
    if (dim > MAX_DIMENSION) return null;
    return { r, n, q, dim };
  }

  function productGeometryContext(geometry) {
    if (geometry?.type !== 'product' || !Array.isArray(geometry.productFactors) || geometry.productFactors.length !== 2) return null;
    const [leftGeometry, rightGeometry] = geometry.productFactors;
    if (!leftGeometry || !rightGeometry) return null;
    const factorIds = Array.isArray(geometry.productFactorIds) && geometry.productFactorIds.length === 2
      ? geometry.productFactorIds.map((id, index) => id || geometry.productFactors[index]?.varietyId || `factor${index}`)
      : geometry.productFactors.map((factor, index) => factor?.varietyId || `${homologyScopeId(factor)}_${index}`);
    return { leftGeometry, rightGeometry, factorIds };
  }

  function productBidegreeFromBox(productBox) {
    if (!productBox) return null;
    const left = Number(productBox.leftCohomologyDegree);
    const right = Number(productBox.rightCohomologyDegree);
    return Number.isFinite(left) && Number.isFinite(right) ? [left, right] : null;
  }

  function productHomologyBidegreeForDef(def, geometry, context = productGeometryContext(geometry)) {
    if (!context || !def) return null;
    if (def.id === HOMOLOGY_UNIT_CLASS) return [0, 0];
    if (def.id === HOMOLOGY_POINT_CLASS) {
      return [2 * context.leftGeometry.dim, 2 * context.rightGeometry.dim];
    }
    if (Array.isArray(def.productBidegree)) return def.productBidegree;
    return productBidegreeFromBox(def.productBox);
  }

  function productHomologyBidegreeForVariable(id, geometry, context = productGeometryContext(geometry)) {
    if (!context) return null;
    const variableId = canonicalHomologyVariableId(id, geometry);
    if (variableId === homologyVariableId(HOMOLOGY_UNIT_CLASS, geometry)) return [0, 0];
    if (variableId === homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)) {
      return [2 * context.leftGeometry.dim, 2 * context.rightGeometry.dim];
    }
    const data = VARS.get(variableId);
    if (Array.isArray(data?.productBidegree)) return data.productBidegree;
    return productBidegreeFromBox(data?.productBox || productBoxDataForVariable(variableId));
  }

  function productHomologyBidegreeForPowers(powers, geometry, context = productGeometryContext(geometry)) {
    if (!context) return null;
    let total = [0, 0];
    for (const [id, exp] of Object.entries(powers || {})) {
      const bidegree = productHomologyBidegreeForVariable(id, geometry, context);
      if (!bidegree) return null;
      const exponent = Number(exp) || 0;
      total = [
        total[0] + bidegree[0] * exponent,
        total[1] + bidegree[1] * exponent
      ];
    }
    return total;
  }

  function productHomologyBidegreeForMonomial(mono, geometry, context = productGeometryContext(geometry)) {
    if (!context) return null;
    if (Array.isArray(mono?.productBidegree)) return mono.productBidegree;
    return productHomologyBidegreeForPowers(parseMonoKey(mono?.key || ''), geometry, context);
  }

  function addProductBidegrees(left, right) {
    if (!left || !right) return null;
    return [left[0] + right[0], left[1] + right[1]];
  }

  function productBidegreeFits(context, bidegree) {
    if (!context || !bidegree) return true;
    return bidegree[0] >= 0
      && bidegree[1] >= 0
      && bidegree[0] <= 2 * context.leftGeometry.dim
      && bidegree[1] <= 2 * context.rightGeometry.dim;
  }

  function productBidegreesEqual(left, right) {
    if (!left || !right) return false;
    return left[0] === right[0] && left[1] === right[1];
  }

  function productFactorBoxMonomials(geometry) {
    if (!geometry) return [];
    return homologyMonomialDefinitions(geometry)
      .filter((mono) => mono.degree <= (geometry.dim ?? MAX_DIMENSION));
  }

  function productBoxClassId(productBox) {
    return `${HOMOLOGY_PRODUCT_BOX_CLASS_PREFIX}${hashString(productBoxSignature(productBox))}`;
  }

  function productBoxSignature(productBox) {
    const factorIds = productBox?.factorIds || [];
    return [
      factorIds[0] || 'left',
      productBox?.leftKey || '',
      factorIds[1] || 'right',
      productBox?.rightKey || ''
    ].join('::');
  }

  function productBoxSymbolLatex(leftLatex, rightLatex) {
    return `${leftLatex || '1'}\\boxtimes ${rightLatex || '1'}`;
  }

  function productBoxSymbolPlain(leftPlain, rightPlain) {
    return `${leftPlain || '1'} box ${rightPlain || '1'}`;
  }

  function productBoxDefForKeys(geometry, leftKey, rightKey) {
    const signature = productBoxSignature({
      factorIds: productGeometryContext(geometry)?.factorIds || [],
      leftKey: monoKey(parseMonoKey(leftKey || '')),
      rightKey: monoKey(parseMonoKey(rightKey || ''))
    });
    return baseHomologyClassDefinitions(geometry).find((def) => def.productBox && productBoxSignature(def.productBox) === signature) || null;
  }

  function productBoxPolyForKeys(geometry, leftKey, rightKey) {
    const normalizedLeftKey = monoKey(parseMonoKey(leftKey || ''));
    const normalizedRightKey = monoKey(parseMonoKey(rightKey || ''));
    if (!normalizedLeftKey && !normalizedRightKey) return Poly.one();
    const def = productBoxDefForKeys(geometry, normalizedLeftKey, normalizedRightKey);
    return def ? Poly.variable(homologyDefVariableId(def, geometry)) : Poly.zero();
  }

  function productBoxDataForVariable(id) {
    const data = VARS.get(id);
    return data?.kind === 'productBox' && data.productBox ? data.productBox : null;
  }

  function homologyDefinitionVariableMeta(def) {
    const meta = { cohomologyDegree: def.cohomologyDegree };
    if (Array.isArray(def.productBidegree)) meta.productBidegree = def.productBidegree;
    if (def.productBox) {
      meta.kind = 'productBox';
      meta.productBox = def.productBox;
      meta.productBidegree = productBidegreeFromBox(def.productBox);
    }
    return meta;
  }

  function normalizeCustomHomologyClass(item, geometry) {
    if (!item || typeof item !== 'object') return null;
    const id = String(item.id || '').trim() || nextInputId('C');
    if (isReservedHomologyClassId(id)) return null;
    const dim = Number.isInteger(geometry?.dim) ? geometry.dim : MAX_DIMENSION;
    const cohomologyDegree = normalizedInt(
      item.cohomologyDegree ?? homologyClassCohomologyDegree(item),
      0,
      2 * dim,
      Math.min(2, 2 * dim)
    );
    const degree = cohomologyDegree / 2;
    const fallback = nextHomologyClassSymbol({ customClasses: [] }, geometry);
    const symbol = sanitizeHomologySymbol(item.symbol, fallback);
    const special = item.special === 'tangent-chern' ? item.special : null;
    return { id, symbol, degree, cohomologyDegree, special };
  }

  function homologyClassCohomologyDegree(item) {
    if (Number.isInteger(item?.cohomologyDegree)) return item.cohomologyDegree;
    const degree = Number(item?.degree);
    return Number.isFinite(degree) ? Math.round(degree * 2) : 2;
  }

  function isReservedHomologyClassId(id) {
    return [HOMOLOGY_UNIT_CLASS, HOMOLOGY_HYPERPLANE_CLASS, HOMOLOGY_THETA_CLASS, HOMOLOGY_POINT_CLASS].includes(id)
      || isCurveSymplecticClassId(id)
      || String(id || '').startsWith(HOMOLOGY_GRASSMANNIAN_TAUTOLOGICAL_CLASS_PREFIX)
      || String(id || '').startsWith(HOMOLOGY_GRASSMANNIAN_YOUNG_CLASS_PREFIX)
      || String(id || '').startsWith(HOMOLOGY_PRODUCT_BOX_CLASS_PREFIX);
  }

  function curveSmallNumericGenus(geometry) {
    const value = numericalCurveGenus(geometry);
    return Number.isInteger(value) && value > 0 && value < 10 ? value : null;
  }

  function curveSymplecticClassDefinitions(geometry, homology) {
    const genus = curveSmallNumericGenus(geometry) || jacobianCurveGenus(geometry);
    if (!genus) return [];
    const defs = [];
    for (let index = 1; index <= genus; index += 1) {
      defs.push(curveSymplecticClassDefinition('a', index, homology, geometry));
      defs.push(curveSymplecticClassDefinition('b', index, homology, geometry));
    }
    return defs;
  }

  function jacobianCurveGenus(geometry) {
    if (!geometry?.specialLabels?.includes('jacobian')) return null;
    const value = Number.isInteger(geometry?.jacobianCurveGenus)
      ? geometry.jacobianCurveGenus
      : (Number.isInteger(geometry?.dim) ? geometry.dim : null);
    return Number.isInteger(value) && value > 0 && value < 10 ? value : null;
  }

  function curveSymplecticClassDefinition(kind, index, homology, geometry) {
    const id = curveSymplecticClassId(kind, index);
    const symbol = `${kind}_{${index}}`;
    return homologyClassDefinition(id, 0.5, symbol, 'symplectic', homology, symbol, geometry);
  }

  function curveSymplecticClassId(kind, index) {
    const prefix = kind === 'b' ? HOMOLOGY_CURVE_B_CLASS_PREFIX : HOMOLOGY_CURVE_A_CLASS_PREFIX;
    return `${prefix}${index}`;
  }

  function geometryHasThetaClass(geometry) {
    return geometry?.specialLabels?.includes('jacobian') || geometry?.specialLabels?.includes('theta-divisor');
  }

  function isCurveSymplecticClassId(id) {
    const text = String(id || '');
    return text.startsWith(HOMOLOGY_CURVE_A_CLASS_PREFIX) || text.startsWith(HOMOLOGY_CURVE_B_CLASS_PREFIX);
  }

  function nextHomologyClassSymbol(homology, geometry) {
    const used = new Set(baseHomologyClassDefinitions({ ...geometry, homology: { ...homology, customClasses: [] } })
      .map((def) => canonicalMathLabel(def.symbolLatex)));
    (homology?.customClasses || []).forEach((item) => used.add(canonicalMathLabel(item.symbol)));
    const candidates = ['A', 'B', 'C', 'D', 'L', 'M', 'N', 'Z'];
    return candidates.find((symbol) => !used.has(canonicalMathLabel(symbol))) || `A_{${(homology?.customClasses || []).length + 1}}`;
  }

  function homologyClassDefinition(id, degree, defaultSymbol, kind, homology, fallbackSymbol = defaultSymbol, geometry = null) {
    const symbol = sanitizeHomologySymbol(homology?.classes?.[id]?.symbol, fallbackSymbol || defaultSymbol);
    const custom = homology?.customClasses?.find((item) => item.id === id);
    return {
      id,
      variableId: homologyVariableId(id, geometry),
      degree,
      cohomologyDegree: Number.isInteger(custom?.cohomologyDegree)
        ? custom.cohomologyDegree
        : Math.round(2 * degree),
      defaultSymbol,
      kind,
      symbolLatex: symbol,
      symbolPlain: latexToPlain(symbol)
    };
  }

  function homologyClassDefById(geometry, classId) {
    return homologyClassDefinitions(geometry).find((def) => def.id === classId) || null;
  }

  function tangentChernHomologyClassId(index) {
    return `${HOMOLOGY_TANGENT_CHERN_CLASS_PREFIX}${index}`;
  }

  function tangentChernHomologyClassSymbol(geometry, index) {
    return `c_{${index}}(${geometry?.labelLatex || 'X'})`;
  }

  function tangentChernClassRowCanAdd(context, index) {
    return !!context
      && context.geometry?.type === 'abstract'
      && context.sheaf?.type === 'tangent'
      && normalizeBasisValue(context.sheaf?.basis) === 'chern'
      && Number.isInteger(index)
      && Number.isInteger(context.geometry.dim)
      && index >= 1
      && index <= context.geometry.dim
      && !context.geometry.homology?.customClasses?.some((item) => item.id === tangentChernHomologyClassId(index));
  }

  function homologyVariableId(classId, geometry = null) {
    const text = String(classId || '');
    if (text.startsWith('map_')) return text;
    if (text.startsWith('monomial_')) return text;
    const mapClass = parseMapHomologyClassId(text);
    if (mapClass) {
      const map = state.maps.find((item) => item.id === mapClass.mapId || variableIdSafe(item.id) === mapClass.mapId) || { id: mapClass.mapId };
      const sourceGeometry = map.domainKind === 'variety' && map.codomainKind === 'variety'
        ? (mapClass.operation === 'pullback' ? geometryByVarietyId(map.codomainId) : geometryByVarietyId(map.domainId))
        : null;
      return mapHomologyVariableId(map, mapClass.operation, homologyVariableId(mapClass.sourceClassId, sourceGeometry));
    }
    return scopedHomologyVariableId(text, geometry);
  }

  function homologyDefVariableId(def, geometry = null) {
    return def?.variableId || homologyVariableId(def?.id, geometry);
  }

  function homologyDefVariableIds(def, geometry = null) {
    const ids = new Set([homologyDefVariableId(def, geometry)]);
    const sourceKey = def?.sourceKey;
    if (sourceKey || sourceKey === '') {
      Object.keys(parseMonoKey(sourceKey)).forEach((id) => ids.add(id));
    }
    if (def?.sourceGeometry && def.sourceGeometry !== geometry) ids.add(homologyDefVariableId(def, def.sourceGeometry));
    return ids;
  }

  function scopedHomologyVariableId(classId, geometry = null) {
    const scope = homologyScopeId(geometry);
    if (classId === HOMOLOGY_UNIT_CLASS) return `homology_${scope}_unit`;
    if (classId === HOMOLOGY_HYPERPLANE_CLASS) return `homology_${scope}_H`;
    if (String(classId || '').startsWith(HOMOLOGY_GRASSMANNIAN_TAUTOLOGICAL_CLASS_PREFIX)) {
      return `homology_${scope}_${variableIdSafe(classId)}`;
    }
    if (classId === HOMOLOGY_POINT_CLASS) return `homology_${scope}_point`;
    return `homology_${scope}_${variableIdSafe(classId || 'class')}`;
  }

  function homologyScopeId(geometry = null) {
    if (geometry?.varietyId) return `v_${variableIdSafe(geometry.varietyId)}`;
    const label = geometry?.labelPlain || geometry?.labelLatex || geometry?.type || 'draft';
    return `draft_${hashString(label)}`;
  }

  function canonicalHomologyVariableId(id, geometry = null) {
    const text = String(id || '');
    if (!text) return text;
    if (text.startsWith('map_')) return canonicalMapHomologyVariableId(text);
    const legacyBase = legacyBaseHomologyClassId(text);
    if (legacyBase) return homologyVariableId(legacyBase, geometry);
    const legacyCustom = text.match(/^homology_(.+)$/);
    if (legacyCustom && !legacyCustom[1].startsWith('v_') && !legacyCustom[1].startsWith('draft_')) {
      return homologyVariableId(legacyCustom[1], geometry);
    }
    return text;
  }

  function legacyBaseHomologyClassId(id) {
    if (id === 'unit') return HOMOLOGY_UNIT_CLASS;
    if (id === 'H') return HOMOLOGY_HYPERPLANE_CLASS;
    if (id === 'point') return HOMOLOGY_POINT_CLASS;
    return null;
  }

  function canonicalMapHomologyVariableId(id) {
    const parsed = parseMapHomologyVariableId(id);
    if (!parsed) return id;
    if (String(parsed.sourceId || '').startsWith('map_')) return id;
    const map = state.maps.find((item) => variableIdSafe(item.id) === parsed.mapKey || item.id === parsed.mapKey);
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return id;
    const sourceGeometry = parsed.operation === 'pullback'
      ? geometryByVarietyId(map.codomainId)
      : geometryByVarietyId(map.domainId);
    const sourceScope = homologyScopeId(sourceGeometry);
    if (parsed.sourceId.startsWith(`homology_${sourceScope}_`) || parsed.sourceId.startsWith('monomial_')) {
      return mapHomologyVariableId(map, parsed.operation, parsed.sourceId);
    }
    const sourceId = canonicalHomologyVariableId(parsed.sourceId, sourceGeometry);
    return mapHomologyVariableId(map, parsed.operation, sourceId);
  }

  function parseMapHomologyClassId(classId) {
    const text = String(classId || '');
    const match = text.match(/^(pullback|pushforward)_([^_]+)_(.+)$/);
    if (!match) return null;
    return {
      operation: match[1],
      mapId: match[2],
      sourceClassId: match[3]
    };
  }

  function mapHomologyClassDefinitions(geometry, baseDefs = null) {
    const context = activeHomologyMapContext();
    if (!context || !geometry?.varietyId) return [];
    const map = context.map;
    if (geometry.varietyId === context.domain.variety.id) {
      const sourceDefs = homologyPullbackClassDefinitionsForMap(context.codomain.geometry);
      const defs = sourceDefs.map((def) => mapOperationHomologyClassDefinition(map, 'pullback', def, geometry)).filter(Boolean);
      if (defs.length || geometry.dim !== 0) return defs;
      const unit = baseHomologyClassDefinitions(context.codomain.geometry).find((def) => def.id === HOMOLOGY_UNIT_CLASS);
      const unitDef = unit ? mapOperationHomologyClassDefinition(map, 'pullback', unit, geometry) : null;
      return unitDef ? [unitDef] : [];
    }
    if (geometry.varietyId === context.codomain.variety.id) {
      return mapPushforwardClassDefinitions(map, context.domain.geometry, geometry);
    }
    return [];
  }

  function homologyPullbackClassDefinitionsForMap(geometry) {
    return baseHomologyClassDefinitions(geometry)
      .filter((def) => def.id !== HOMOLOGY_UNIT_CLASS && def.kind !== 'product box');
  }

  function homologyMonomialClassDefinitionsForMap(geometry) {
    const baseDefs = baseHomologyClassDefinitions(geometry);
    const byVariable = new Map(baseDefs.map((def) => [homologyDefVariableId(def, geometry), def]));
    return homologyMonomialDefinitions(geometry)
      .map((mono) => homologyMonomialClassDefinition(geometry, mono, byVariable))
      .filter(Boolean);
  }

  function homologyMonomialClassDefinition(geometry, mono, baseDefByVariable = null) {
    if (!mono || !Number.isFinite(mono.degree)) return null;
    if (!mono.key) {
      const unitDef = baseHomologyClassDefinitions(geometry).find((def) => def.id === HOMOLOGY_UNIT_CLASS);
      return unitDef ? { ...unitDef, sourceKey: '' } : null;
    }
    const powers = parseMonoKey(mono.key);
    const ids = Object.keys(powers);
    if (ids.length === 1 && powers[ids[0]] === 1) {
      const def = baseDefByVariable?.get(ids[0])
        || baseHomologyClassDefinitions(geometry).find((item) => homologyDefVariableId(item, geometry) === ids[0]);
      if (def) return def;
    }
    const id = homologyMonomialClassId(mono.key);
    const productBox = ids.length === 1 && powers[ids[0]] === 1 ? productBoxDataForVariable(ids[0]) : null;
    return {
      id,
      variableId: id,
      degree: mono.degree,
      cohomologyDegree: mono.cohomologyDegree,
      ...(Array.isArray(mono.productBidegree) ? { productBidegree: mono.productBidegree } : {}),
      defaultSymbol: mono.latex || '1',
      kind: mono.key ? 'monomial' : 'unit',
      symbolLatex: mono.latex || '1',
      symbolPlain: mono.plain || latexToPlain(mono.latex || '1'),
      sourceKey: mono.key,
      ...(productBox ? {
        productBox,
        kind: 'product box',
        defaultSymbol: mono.latex || productBoxSymbolLatex('1', '1')
      } : {})
    };
  }

  function homologyMonomialClassId(key) {
    return key ? `monomial_${hashString(key)}` : HOMOLOGY_UNIT_CLASS;
  }

  function mapPushforwardClassDefinitions(map, domainGeometry, codomainGeometry) {
    return homologyMonomialDefinitions(domainGeometry)
      .map((mono) => mapPushforwardMonomialClassDefinition(map, mono, domainGeometry, codomainGeometry))
      .filter(Boolean);
  }

  function mapOperationHomologyClassDefinition(map, operation, sourceDef, targetGeometry) {
    if (!sourceDef || !Number.isFinite(sourceDef.degree) || !Number.isInteger(targetGeometry.dim)) return null;
    const sourceGeometry = operation === 'pullback'
      ? geometryByVarietyId(map.codomainId)
      : geometryByVarietyId(map.domainId);
    const degree = mapOperationTargetDegree(operation, sourceDef.degree, sourceGeometry, targetGeometry);
    if (degree == null) return null;
    const cohomologyDegree = mapOperationTargetCohomologyDegree(operation, sourceDef.cohomologyDegree, sourceGeometry, targetGeometry);
    if (cohomologyDegree == null) return null;
    const id = mapHomologyClassId(map, operation, sourceDef.id);
    const symbol = mapHomologySymbolLatex(map, operation, sourceDef.symbolLatex);
    const sourceVariableId = homologyDefVariableId(sourceDef, sourceGeometry);
    defineVariable(sourceVariableId, sourceDef.degree, sourceDef.symbolLatex, homologyDefinitionVariableMeta(sourceDef));
    const sourceKey = Object.prototype.hasOwnProperty.call(sourceDef, 'sourceKey')
      ? sourceDef.sourceKey
      : monoKey({ [sourceVariableId]: 1 });
    const sourceId = sourceDef.sourceKey && sourceDef.variableId === sourceDef.id
      ? sourceDef.id
      : sourceVariableId;
    const productBidegree = mapOperationTargetProductBidegree(map, operation, sourceDef, sourceGeometry, targetGeometry);
    defineMapHomologyVariable(map, operation, sourceId, degree, sourceDef.symbolLatex, {
      cohomologyDegree,
      sourceKey,
      ...(productBidegree ? { productBidegree } : {})
    });
    const operator = operation === 'pullback'
      ? mapPullbackOperatorLatex(map)
      : mapPushforwardOperatorLatex(map);
    const defaultSymbol = `${operator}${sourceDef.defaultSymbol}`;
    const def = homologyClassDefinition(
      id,
      degree,
      defaultSymbol,
      operation === 'pullback' ? `pullback of ${sourceDef.kind}` : `pushforward of ${sourceDef.kind}`,
      targetGeometry.homology,
      symbol,
      targetGeometry
    );
    if (productBidegree) def.productBidegree = productBidegree;
    return def;
  }

  function mapOperationTargetProductBidegree(map, operation, sourceDef, sourceGeometry, targetGeometry) {
    if (operation !== 'pullback' || targetGeometry?.type !== 'product') return null;
    const context = projectionMapContext(map);
    if (!context || context.productGeometry.varietyId !== targetGeometry.varietyId) return null;
    if (sourceGeometry?.varietyId && context.factorGeometry.varietyId && sourceGeometry.varietyId !== context.factorGeometry.varietyId) return null;
    const degree = sourceDef?.cohomologyDegree;
    if (!Number.isFinite(degree)) return null;
    return context.factorIndex === 0 ? [degree, 0] : [0, degree];
  }

  function mapPushforwardMonomialClassDefinition(map, mono, domainGeometry, codomainGeometry) {
    if (!mono || !Number.isFinite(mono.degree) || !Number.isInteger(domainGeometry?.dim) || !Number.isInteger(codomainGeometry?.dim)) return null;
    const targetDegree = mapOperationTargetDegree('pushforward', mono.degree, domainGeometry, codomainGeometry);
    if (targetDegree == null) return null;
    const targetCohomologyDegree = mapOperationTargetCohomologyDegree('pushforward', mono.cohomologyDegree, domainGeometry, codomainGeometry);
    if (targetCohomologyDegree == null) return null;
    const sourcePowers = parseMonoKey(mono.key);
    if (Object.keys(sourcePowers).length === 1) {
      const [sourceId, exponent] = Object.entries(sourcePowers)[0];
      if (exponent === 1) {
        const sourceDef = baseHomologyClassDefinitions(domainGeometry).find((def) => homologyDefVariableId(def, domainGeometry) === sourceId);
        if (sourceDef) return mapOperationHomologyClassDefinition(map, 'pushforward', sourceDef, codomainGeometry);
      }
    }
    const variableId = pushforwardTermVariableId(map, mono.key, targetDegree, { proper: false, cohomologyDegree: targetCohomologyDegree });
    const data = VARS.get(variableId) || {};
    return {
      id: variableId,
      degree: targetDegree,
      cohomologyDegree: targetCohomologyDegree,
      defaultSymbol: data.latex || mapHomologySymbolLatex(map, 'pushforward', mono.latex || '1'),
      kind: mono.key ? 'pushforward of product' : 'pushforward of unit',
      symbolLatex: data.latex || mapHomologySymbolLatex(map, 'pushforward', mono.latex || '1'),
      symbolPlain: data.plain || latexToPlain(data.latex || ''),
      variableId
    };
  }

  function mapOperationTargetDegree(operation, sourceDegree, sourceGeometry, targetGeometry) {
    if (!Number.isFinite(sourceDegree) || !Number.isInteger(sourceGeometry?.dim) || !Number.isInteger(targetGeometry?.dim)) return null;
    const degreeShift = operation === 'pushforward' ? targetGeometry.dim - sourceGeometry.dim : 0;
    const degree = sourceDegree + degreeShift;
    return degree >= 0 && degree <= targetGeometry.dim ? degree : null;
  }

  function mapOperationTargetCohomologyDegree(operation, sourceCohomologyDegree, sourceGeometry, targetGeometry) {
    if (!Number.isInteger(sourceCohomologyDegree) || !Number.isInteger(sourceGeometry?.dim) || !Number.isInteger(targetGeometry?.dim)) return null;
    const degreeShift = operation === 'pushforward' ? 2 * (targetGeometry.dim - sourceGeometry.dim) : 0;
    const degree = sourceCohomologyDegree + degreeShift;
    return degree >= 0 && degree <= 2 * targetGeometry.dim ? degree : null;
  }

  function homologyMonomialDefinitions(geometry, options = {}) {
    const maxDegree = Number.isFinite(options.maxDegree) ? options.maxDegree : (geometry?.dim ?? MAX_DIMENSION);
    const assignedKeys = options.includeAssigned ? new Set() : assignedHomologyMonomialKeys(geometry);
    const productContext = productGeometryContext(geometry);
    const positiveDefs = baseHomologyClassDefinitions(geometry)
      .filter((def) => def.degree > 0 && def.degree <= maxDegree)
      .map((def) => ({
        id: homologyDefVariableId(def, geometry),
        degree: def.degree,
        cohomologyDegree: def.cohomologyDegree,
        productBox: !!def.productBox,
        productBidegree: productContext ? productHomologyBidegreeForDef(def, geometry, productContext) : null
      }));
    defineBaseHomologyVariables(geometry);
    const out = [{
      key: '',
      degree: 0,
      cohomologyDegree: 0,
      latex: '1',
      plain: '1',
      ...(productContext ? { productBidegree: [0, 0] } : {})
    }];
    const seen = new Set(['']);
    const visit = (startIndex, powers, degree, cohomologyDegree, productBidegree = productContext ? [0, 0] : null) => {
      if (out.length > 160) return;
      for (let index = startIndex; index < positiveDefs.length; index += 1) {
        const def = positiveDefs[index];
        const hasPowers = Object.keys(powers).length > 0;
        if (homologyClassIsOdd(def) && powers[def.id]) continue;
        if (def.productBox && hasPowers) continue;
        if (!def.productBox && homologyPowersContainProductBox(powers)) continue;
        if (productContext && hasPowers && !productBidegree) continue;
        if (productContext && hasPowers && !def.productBidegree) continue;
        const nextProductBidegree = productContext
          ? (def.productBidegree ? addProductBidegrees(productBidegree || [0, 0], def.productBidegree) : null)
          : null;
        if (productContext && def.productBidegree && !productBidegreeFits(productContext, nextProductBidegree)) continue;
        const nextDegree = degree + def.degree;
        if (nextDegree > maxDegree) continue;
        const nextCohomologyDegree = cohomologyDegree + (def.cohomologyDegree ?? Math.round(2 * def.degree));
        const nextPowers = { ...powers, [def.id]: (powers[def.id] || 0) + 1 };
        const key = monoKey(nextPowers);
        if (!seen.has(key)) {
          seen.add(key);
          if (!assignedKeys.has(key)) {
            out.push({
              key,
              degree: nextDegree,
              cohomologyDegree: nextCohomologyDegree,
              latex: monomialLatex(key),
              plain: monomialPlain(key),
              ...(nextProductBidegree ? { productBidegree: nextProductBidegree } : {})
            });
          }
        }
        visit(index, nextPowers, nextDegree, nextCohomologyDegree, nextProductBidegree);
      }
    };
    visit(0, {}, 0, 0);
    return out.sort((a, b) => a.degree - b.degree || a.key.localeCompare(b.key));
  }

  function homologyPowersContainProductBox(powers) {
    return Object.keys(powers || {}).some((id) => !!productBoxDataForVariable(id));
  }

  function assignedHomologyMonomialKeys(geometry) {
    const defs = homologyClassDefinitions(geometry, { includeMapClasses: false });
    const available = new Set(defs.flatMap((def) => [...homologyDefVariableIds(def, geometry)]));
    const keys = new Set();
    for (const rule of geometry?.homology?.rules || []) {
      if (rule.enabled === false || !rule.lhs?.powers) continue;
      if (!homologyRuleUsesAvailableVariables(rule, available, { resolveMapVariables: false })) continue;
      const key = monoKey(rule.lhs.powers);
      if (key) keys.add(key);
    }
    return keys;
  }

  function mapHomologySymbolLatex(map, operation, sourceLatex) {
    const operator = operation === 'pullback'
      ? mapPullbackOperatorLatex(map)
      : mapPushforwardOperatorLatex(map);
    return `${operator}\\left(${sourceLatex}\\right)`;
  }

  function mapHomologyClassId(map, operation, sourceClassId) {
    return `${operation}_${map.id}_${sourceClassId}`;
  }

  function geometryByVarietyId(varietyId) {
    const variety = state.varieties.find((item) => item.id === varietyId);
    return variety ? geometryFromVariety(variety) : null;
  }

  function defineHomologyVariables(geometry) {
    homologyClassDefinitions(geometry).forEach((def) => {
      defineVariable(homologyDefVariableId(def, geometry), def.degree, def.symbolLatex, homologyDefinitionVariableMeta(def));
    });
  }

  function defineBaseHomologyVariables(geometry) {
    baseHomologyClassDefinitions(geometry).forEach((def) => {
      defineVariable(homologyDefVariableId(def, geometry), def.degree, def.symbolLatex, homologyDefinitionVariableMeta(def));
    });
  }

  function defineMapHomologyVariable(map, operation, sourceId, degree, sourceLatex, meta = {}) {
    const id = mapHomologyVariableId(map, operation, sourceId);
    const sourceKey = Object.prototype.hasOwnProperty.call(meta, 'sourceKey')
      ? meta.sourceKey
      : monoKey({ [sourceId]: 1 });
    const cohomologyDegree = Number.isInteger(meta.cohomologyDegree)
      ? meta.cohomologyDegree
      : Math.round(2 * degree);
    defineVariable(id, degree, mapHomologySymbolLatex(map, operation, sourceLatex), {
      kind: 'mapHomology',
      mapId: map?.id || null,
      operation,
      sourceId,
      sourceKey,
      ...meta,
      cohomologyDegree
    });
    return id;
  }

  function ensureMapHomologyVariableFromId(id) {
    if (!String(id || '').startsWith('map_') || VARS.has(id)) return VARS.get(id) || null;
    const parsed = parseMapHomologyVariableId(id);
    if (!parsed) return null;
    const map = state.maps.find((item) => variableIdSafe(item.id) === parsed.mapKey || item.id === parsed.mapKey);
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const sourceGeometry = parsed.operation === 'pullback'
      ? geometryByVarietyId(map.codomainId)
      : geometryByVarietyId(map.domainId);
    const targetGeometry = parsed.operation === 'pullback'
      ? geometryByVarietyId(map.domainId)
      : geometryByVarietyId(map.codomainId);
    const sourceId = sourceGeometry ? canonicalHomologyVariableId(parsed.sourceId, sourceGeometry) : parsed.sourceId;
    const sourceData = sourceGeometry ? homologyVariableDataById(sourceGeometry, sourceId) : null;
    if (!sourceData || !targetGeometry) return null;
    const variableId = defineMapHomologyVariable(map, parsed.operation, sourceId, parsed.operation === 'pullback'
      ? sourceData.degree
      : sourceData.degree + targetGeometry.dim - sourceGeometry.dim, sourceData.latex, {
        cohomologyDegree: parsed.operation === 'pullback'
          ? sourceData.cohomologyDegree
          : sourceData.cohomologyDegree + 2 * (targetGeometry.dim - sourceGeometry.dim),
        sourceKey: monoKey({ [sourceId]: 1 })
      });
    return VARS.get(variableId) || VARS.get(id) || null;
  }

  function parseMapHomologyVariableId(id) {
    const match = String(id || '').match(/^map_(pullback|pushforward)_([^_]+)_(.+)$/);
    if (!match) return null;
    return { operation: match[1], mapKey: match[2], sourceId: match[3] };
  }

  function homologyVariableDataById(geometry, variableId) {
    defineHomologyVariables(geometry);
    const normalizedId = canonicalHomologyVariableId(variableId, geometry);
    if (VARS.has(normalizedId)) return VARS.get(normalizedId);
    const def = homologyClassDefinitions(geometry).find((item) => homologyDefVariableId(item, geometry) === normalizedId);
    if (!def) return null;
    return { degree: def.degree, cohomologyDegree: def.cohomologyDegree, latex: def.symbolLatex, plain: def.symbolPlain, ...homologyDefinitionVariableMeta(def) };
  }

  function standardHomologyRules(geometry, existingRules = new Map()) {
    return [
      standardPointHomologyUnitRule(geometry, existingRules.get(HOMOLOGY_POINT_UNIT_RULE_ID)),
      ...standardGrassmannianRules(geometry, existingRules),
      standardHomologyTopRule(geometry, existingRules.get(HOMOLOGY_TOP_RULE_ID)),
      ...standardCurveSymplecticRules(geometry, existingRules),
      ...standardJacobianSymplecticRules(geometry, existingRules),
      standardThetaTopRule(geometry, existingRules.get(HOMOLOGY_THETA_TOP_RULE_ID)),
      ...standardProductBoxRules(geometry, existingRules)
    ].filter(Boolean);
  }

  function isStandardHomologyRuleId(id) {
    const text = String(id || '');
    return text === HOMOLOGY_TOP_RULE_ID
      || text === HOMOLOGY_THETA_TOP_RULE_ID
      || text === HOMOLOGY_POINT_UNIT_RULE_ID
      || text === HOMOLOGY_JACOBIAN_THETA_RULE_ID
      || text === HOMOLOGY_JACOBIAN_TOP_RULE_ID
      || text.startsWith(HOMOLOGY_CURVE_SYMPLECTIC_RULE_PREFIX)
      || text.startsWith(HOMOLOGY_GRASSMANNIAN_RULE_PREFIX)
      || text.startsWith(HOMOLOGY_PRODUCT_BOX_RULE_PREFIX);
  }

  function standardHomologyTopRule(geometry, existingRule = null) {
    if (!varietyHasHyperplaneClass(geometry?.type) || !Number.isInteger(geometry.dim) || geometry.dim <= 0) return null;
    const degreeProduct = (geometry.degrees || []).reduce((product, degree) => product * BigInt(degree), 1n);
    return {
      id: HOMOLOGY_TOP_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [homologyVariableId(HOMOLOGY_HYPERPLANE_CLASS, geometry)]: geometry.dim } },
      rhs: [
        {
          coefficient: degreeProduct.toString(),
          powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 }
        }
      ]
    };
  }

  function standardThetaTopRule(geometry, existingRule = null) {
    if (!geometryHasThetaClass(geometry) || !Number.isInteger(geometry.dim) || geometry.dim <= 0) return null;
    return {
      id: HOMOLOGY_THETA_TOP_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [homologyVariableId(HOMOLOGY_THETA_CLASS, geometry)]: geometry.dim } },
      rhs: [
        {
          coefficient: factorialBigInt(geometry.dim).toString(),
          powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 }
        }
      ]
    };
  }

  function standardPointHomologyUnitRule(geometry, existingRule = null) {
    if (geometry?.type !== 'point') return null;
    return {
      id: HOMOLOGY_POINT_UNIT_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 } },
      rhs: [{ coefficient: '1', powers: {} }]
    };
  }

  function standardGrassmannianRules(geometry, existingRules = new Map()) {
    const params = grassmannianParamsFromGeometry(geometry);
    if (!params || !grassmannianYoungBasisEnabled(geometry)) return [];
    const rules = [];
    grassmannianPartitions(params.r, params.q).forEach((partition) => {
      if (!partition.length) return;
      const id = homologyVariableId(grassmannianYoungClassId(partition), geometry);
      const def = homologyClassDefById(geometry, grassmannianYoungClassId(partition));
      defineVariable(id, partition.reduce((sum, part) => sum + part, 0), def?.symbolLatex || grassmannianYoungClassSymbol(partition));
    });
    for (let index = 1; index <= Math.min(params.r, params.dim); index += 1) {
      const lhsId = homologyVariableId(grassmannianTautologicalClassId(index), geometry);
      const partition = grassmannianColumnPartition(index);
      const rhsId = homologyVariableId(grassmannianYoungClassId(partition), geometry);
      const ruleId = `${HOMOLOGY_GRASSMANNIAN_RULE_PREFIX}tautological-${index}`;
      rules.push({
        id: ruleId,
        builtin: true,
        enabled: existingRules.get(ruleId)?.enabled !== false,
        lhs: { powers: { [lhsId]: 1 } },
        rhs: [{
          coefficient: index % 2 === 0 ? '1' : '-1',
          powers: { [rhsId]: 1 }
        }]
      });
    }
    const topPartition = Array.from({ length: params.r }, () => params.q);
    const topId = homologyVariableId(grassmannianYoungClassId(topPartition), geometry);
    const pointId = homologyVariableId(HOMOLOGY_POINT_CLASS, geometry);
    const topRuleId = `${HOMOLOGY_GRASSMANNIAN_RULE_PREFIX}young-top-point`;
    if (topId && topId !== pointId) {
      rules.push({
        id: topRuleId,
        builtin: true,
        enabled: existingRules.get(topRuleId)?.enabled !== false,
        lhs: { powers: { [topId]: 1 } },
        rhs: [{ coefficient: '1', powers: { [pointId]: 1 } }]
      });
    }
    return rules;
  }

  function grassmannianQuotientChernComponents(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const d = geometry.dim;
    const comps = zeroComponentArray(d);
    if (!params) return comps;
    const tautological = grassmannianTautologicalChernComponents(geometry);
    const quotientTotal = inverseUnit(totalFromComponents(tautological, d, Poly.one()), d);
    for (let index = 1; index <= Math.min(params.q, d); index += 1) {
      comps[index] = homogeneousPart(quotientTotal, index);
    }
    return comps;
  }

  function standardCurveSymplecticRules(geometry, existingRules = new Map()) {
    const genus = curveSmallNumericGenus(geometry);
    if (!genus) return [];
    const basis = [];
    for (let index = 1; index <= genus; index += 1) {
      basis.push({ id: curveSymplecticClassId('a', index), kind: 'a', index });
      basis.push({ id: curveSymplecticClassId('b', index), kind: 'b', index });
    }
    const pointId = homologyVariableId(HOMOLOGY_POINT_CLASS, geometry);
    const rules = [];
    for (let leftIndex = 0; leftIndex < basis.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < basis.length; rightIndex += 1) {
        const left = basis[leftIndex];
        const right = basis[rightIndex];
        const id = curveSymplecticRuleId(left.id, right.id);
        const existingRule = existingRules.get(id);
        const paired = left.kind === 'a' && right.kind === 'b' && left.index === right.index;
        rules.push({
          id,
          builtin: true,
          enabled: existingRule ? existingRule.enabled !== false : true,
          lhs: {
            powers: {
              [homologyVariableId(left.id, geometry)]: 1,
              [homologyVariableId(right.id, geometry)]: 1
            }
          },
          rhs: paired
            ? [{ coefficient: '1', powers: { [pointId]: 1 } }]
            : []
        });
      }
    }
    return rules;
  }

  function curveSymplecticRuleId(leftId, rightId) {
    return `${HOMOLOGY_CURVE_SYMPLECTIC_RULE_PREFIX}${variableIdSafe(leftId)}-${variableIdSafe(rightId)}`;
  }

  function standardJacobianSymplecticRules(geometry, existingRules = new Map()) {
    const genus = jacobianCurveGenus(geometry);
    if (!genus) return [];
    const thetaRule = standardJacobianThetaRule(geometry, genus, existingRules.get(HOMOLOGY_JACOBIAN_THETA_RULE_ID));
    const topRule = standardJacobianTopRule(geometry, genus, existingRules.get(HOMOLOGY_JACOBIAN_TOP_RULE_ID));
    return [thetaRule, topRule].filter(Boolean);
  }

  function standardJacobianThetaRule(geometry, genus, existingRule = null) {
    return {
      id: HOMOLOGY_JACOBIAN_THETA_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [homologyVariableId(HOMOLOGY_THETA_CLASS, geometry)]: 1 } },
      rhs: Array.from({ length: genus }, (_, index) => ({
        coefficient: '1',
        powers: {
          [homologyVariableId(curveSymplecticClassId('a', index + 1), geometry)]: 1,
          [homologyVariableId(curveSymplecticClassId('b', index + 1), geometry)]: 1
        }
      }))
    };
  }

  function standardJacobianTopRule(geometry, genus, existingRule = null) {
    const powers = {};
    for (let index = 1; index <= genus; index += 1) {
      powers[homologyVariableId(curveSymplecticClassId('a', index), geometry)] = 1;
      powers[homologyVariableId(curveSymplecticClassId('b', index), geometry)] = 1;
    }
    return {
      id: HOMOLOGY_JACOBIAN_TOP_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers },
      rhs: [{
        coefficient: jacobianTopOrientationSign(genus) < 0 ? '-1' : '1',
        powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 }
      }]
    };
  }

  function jacobianTopOrientationSign(genus) {
    return ((genus * (genus - 1)) / 2) % 2 === 0 ? 1 : -1;
  }

  function standardProductBoxRules(geometry, existingRules = new Map()) {
    const context = productGeometryContext(geometry);
    if (!context) return [];
    const pointRule = standardProductBoxPointRule(geometry, context, existingRules);
    return pointRule ? [pointRule] : [];
  }

  function standardProductBoxPointRule(geometry, context, existingRules = new Map()) {
    if (!Number.isInteger(geometry?.dim)) return null;
    const leftTopKey = productFactorTopClassKey(context.leftGeometry);
    const rightTopKey = productFactorTopClassKey(context.rightGeometry);
    const def = productBoxDefForKeys(geometry, leftTopKey, rightTopKey);
    if (!def) return null;
    const pointId = homologyVariableId(HOMOLOGY_POINT_CLASS, geometry);
    const defId = homologyDefVariableId(def, geometry);
    if (defId === pointId) return null;
    const id = `${HOMOLOGY_PRODUCT_BOX_RULE_PREFIX}point`;
    const existingRule = existingRules.get(id);
    return {
      id,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [defId]: 1 } },
      rhs: [{ coefficient: '1', powers: { [pointId]: 1 } }]
    };
  }

  function productFactorTopClassKey(geometry) {
    if (!Number.isInteger(geometry?.dim) || geometry.dim <= 0) return '';
    return monoKey({ [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 });
  }

  function normalizeHomologyRule(rule, geometry, options = {}) {
    if (!rule || typeof rule !== 'object') return null;
    const defs = homologyClassDefinitions(geometry, { includeMapClasses: options.includeMapClasses !== false });
    const variableIds = new Set(defs.map((def) => homologyDefVariableId(def, geometry)));
    const normalizeOptions = { preserveUnknownVariables: !!options.preserveUnknownVariables, geometry };
    let lhsPowers = normalizeHomologyPowers(rule.lhs?.powers || rule.lhsPowers, variableIds, normalizeOptions);
    let rhsTerms = normalizeHomologyRuleTerms(rule.rhs || rule.rhsTerms, variableIds, normalizeOptions);
    if ((!lhsPowers || !rhsTerms) && rule.source && rule.target) {
      const sourceDef = defs.find((def) => def.id === rule.source);
      const targetDef = defs.find((def) => def.id === rule.target);
      if (!sourceDef || !targetDef) return null;
      const power = normalizedInt(rule.power, 1, Math.max(1, geometry?.dim || MAX_DIMENSION), 1);
      lhsPowers = { [homologyDefVariableId(sourceDef, geometry)]: power };
      try {
        rhsTerms = [
          {
            coefficient: formatFractionPlain(parseRuleCoefficient(rule.coefficient || '1')),
            powers: { [homologyDefVariableId(targetDef, geometry)]: 1 }
          }
        ];
      } catch (_) {
        return null;
      }
    }
    if (!lhsPowers || !rhsTerms) return null;
    const normalized = {
      id: rule.id || nextInputId('R'),
      builtin: !!rule.builtin,
      ...(rule.automatic ? { automatic: rule.automatic } : {}),
      enabled: rule.enabled !== false,
      lhs: { powers: lhsPowers },
      rhs: rhsTerms
    };
    if (options.preserveUnknownVariables && !homologyRuleUsesAvailableVariables(normalized, variableIds, { resolveMapVariables: false })) return normalized;
    return homologyRulePreservesDegree(normalized, defs, { resolveMapVariables: options.preserveUnknownVariables !== true, geometry }) ? normalized : null;
  }

  function normalizeHomologyPowers(powers, variableIds, options = {}) {
    if (!powers || typeof powers !== 'object') return null;
    const out = {};
    for (const [id, exp] of Object.entries(powers)) {
      const canonicalId = variableIds.has(id) ? id : canonicalHomologyVariableId(id, options.geometry);
      const normalizedId = variableIds.has(canonicalId) || options.preserveUnknownVariables
        ? canonicalId
        : id;
      if (!variableIds.has(normalizedId) && !options.preserveUnknownVariables) return null;
      const exponent = normalizedInt(exp, 0, MAX_DIMENSION, 0);
      if (exponent > 0) out[normalizedId] = (out[normalizedId] || 0) + exponent;
    }
    return Object.keys(out).length ? out : null;
  }

  function normalizeHomologyRuleTerms(terms, variableIds, options = {}) {
    if (!Array.isArray(terms)) return null;
    const out = [];
    for (const term of terms) {
      if (!term || typeof term !== 'object') return null;
      const powers = normalizeHomologyPowers(term.powers || {}, variableIds, options) || {};
      let coefficient;
      try {
        coefficient = formatFractionPlain(parseRuleCoefficient(term.coefficient || '1'));
      } catch (_) {
        return null;
      }
      if (parseRuleCoefficient(coefficient).isZero()) continue;
      out.push({ coefficient, powers });
    }
    return out;
  }

  function serializeHomologyPoly(poly) {
    return sortedTerms(poly).map(([key, coeff]) => ({
      coefficient: formatFractionPlain(coeff),
      powers: parseMonoKey(key)
    }));
  }

  function homologyRuleRhsPoly(rule) {
    if (!Array.isArray(rule?.rhs)) return Poly.zero();
    let out = Poly.zero();
    for (const term of rule.rhs) {
      let coeff;
      try {
        coeff = parseRuleCoefficient(term.coefficient || '1');
      } catch (_) {
        continue;
      }
      if (coeff.isZero()) continue;
      out = out.add(polyFromPowers(term.powers || {}).scale(coeff));
    }
    return out;
  }

  function homologyRuleInputText(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleInputMonomial(rule.lhs?.powers || {})}=${formatHomologyInputPoly(homologyRuleRhsPoly(rule))}`;
  }

  function formatHomologyInputPoly(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatHomologyInputTerm(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? `-${body}` : `+${body}`;
    });
    return out;
  }

  function formatHomologyInputTerm(key, absCoeff) {
    const mono = homologyRuleInputMonomial(parseMonoKey(key));
    if (!mono) return absCoeff.toPlainAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toPlainAbs()}${mono}`;
  }

  function homologyRuleInputMonomial(powers) {
    return Object.entries(powers || {}).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.plain : id;
      return exp === 1 ? base : `${base}^${exp}`;
    }).join('');
  }

  function polyFromPowers(powers) {
    const clean = {};
    for (const [id, exp] of Object.entries(powers || {})) {
      const exponent = Number(exp) || 0;
      if (exponent > 0) clean[id] = exponent;
    }
    let out = Poly.one();
    for (const [id, exp] of Object.entries(clean)) {
      out = out.mul(polyPower(Poly.variable(id), exp, MAX_DIMENSION), MAX_DIMENSION);
      if (out.isZero()) return out;
    }
    return out;
  }

  function homologyRuleLhsLatex(rule, geometry) {
    defineHomologyVariables(geometry);
    return monomialLatex(monoKey(rule.lhs?.powers || {})) || '1';
  }

  function homologyRuleLhsPlain(rule, geometry) {
    defineHomologyVariables(geometry);
    return monomialPlain(monoKey(rule.lhs?.powers || {})) || '1';
  }

  function homologyRulePlainEquation(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleInputMonomial(rule.lhs?.powers || {})} = ${formatHomologyInputPoly(homologyRuleRhsPoly(rule))}`;
  }

  function defaultHomologyRulePlaceholder(geometry) {
    const standardRule = standardHomologyRules(geometry)[0];
    if (standardRule) return homologyRuleInputText(standardRule, geometry);
    const defs = homologyClassDefinitions(geometry);
    return defs.length ? `${defs[0].symbolPlain}=0` : '';
  }

  function parseHomologyRuleEquation(text, geometry) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('Enter a rule as left=right.');
    const parts = raw.split('=');
    if (parts.length !== 2) throw new Error('Use exactly one equals sign.');
    defineHomologyVariables(geometry);
    const lhs = parseHomologyExpression(parts[0], geometry, { side: 'left' });
    const rhs = parseHomologyExpression(parts[1], geometry, { side: 'right' });
    if (lhs.isZero()) throw new Error('Left side cannot be zero.');
    const lhsTerms = sortedTerms(lhs);
    if (lhsTerms.length !== 1 || !lhsTerms[0][1].isOne()) {
      throw new Error('Left side must be one monomial with coefficient 1.');
    }
    const lhsPowers = parseMonoKey(lhsTerms[0][0]);
    const rule = {
      id: nextInputId('R'),
      builtin: false,
      enabled: true,
      lhs: { powers: lhsPowers },
      rhs: serializeHomologyPoly(rhs)
    };
    const defs = homologyClassDefinitions(geometry);
    if (!homologyRulePreservesDegree(rule, defs, { geometry })) throw new Error('Rule degrees must match.');
    return {
      ...rule,
      input: raw
    };
  }

  function parseHomologyExpression(text, geometry, { side = 'right' } = {}) {
    const source = String(text || '').trim();
    if (!source) throw new Error(`${side === 'left' ? 'Left' : 'Right'} side is empty.`);
    const compact = source
      .replace(/\\cdot/g, '*')
      .replace(/\\,/g, '')
      .replace(/\\left/g, '')
      .replace(/\\right/g, '')
      .replace(/\^\{\\ast\}/g, '^*')
      .replace(/\^\{([^{}]+)\}/g, '^$1')
      .replace(/\s+/g, '');
    if (compact === '0') return Poly.zero();
    defineHomologyVariables(geometry);
    const aliases = homologyParseAliases(geometry);
    const pieces = splitSignedHomologyTerms(compact);
    let out = Poly.zero();
    for (const piece of pieces) {
      const term = parseHomologyTerm(piece.body, aliases);
      out = out.add(term.scale(fraction(piece.sign)));
    }
    return out;
  }

  function homologyParseAliases(geometry) {
    return homologyClassDefinitions(geometry)
      .flatMap((def) => {
        const id = homologyDefVariableId(def, geometry);
        return homologyAliasCandidates(def)
          .filter(Boolean)
          .map((alias) => ({ alias: String(alias).replace(/\s+/g, ''), id }));
      })
      .filter((entry, index, all) => entry.alias && all.findIndex((item) => item.alias === entry.alias && item.id === entry.id) === index)
      .sort((a, b) => b.alias.length - a.alias.length);
  }

  function homologyAliasCandidates(def) {
    const aliases = [def.symbolLatex, def.symbolPlain, def.defaultSymbol];
    [def.symbolLatex, def.defaultSymbol].forEach((alias) => {
      const text = String(alias || '');
      if (!text) return;
      const compact = normalizeHomologyAliasText(text);
      aliases.push(compact);
      aliases.push(compact.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')'));
      aliases.push(compact.replace(/\\left\(([^()]*)\\right\)/g, '$1'));
      aliases.push(compact.replace(/\\left/g, '').replace(/\\right/g, ''));
      aliases.push(compact.replace(/\\left/g, '').replace(/\\right/g, '').replace(/\(([^()]*)\)/g, '$1'));
    });
    return aliases;
  }

  function normalizeHomologyAliasText(text) {
    return String(text || '')
      .replace(/\^\{\\ast\}/g, '^*')
      .replace(/\^\{([^{}]+)\}/g, '^$1')
      .replace(/_\{([^{}]+)\}/g, '_$1')
      .replace(/\s+/g, '');
  }

  function splitSignedHomologyTerms(text) {
    const terms = [];
    let start = 0;
    let sign = 1;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '{' || char === '[' || char === '(') depth += 1;
      else if (char === '}' || char === ']' || char === ')') depth = Math.max(0, depth - 1);
      else if ((char === '+' || char === '-') && depth === 0) {
        if (i > start) terms.push({ sign, body: text.slice(start, i) });
        sign = char === '-' ? -1 : 1;
        start = i + 1;
      }
    }
    if (start < text.length) terms.push({ sign, body: text.slice(start) });
    return terms.filter((term) => term.body);
  }

  function parseHomologyTerm(text, aliases) {
    let rest = text.replace(/(^|[^^])\*/g, '$1');
    if (!rest) throw new Error('Rule contains an empty term.');
    let coeff = Fraction.one();
    const coeffMatch = rest.match(/^(\d+(?:\/\d+)?)/);
    if (coeffMatch) {
      coeff = parseRuleCoefficient(coeffMatch[1]);
      rest = rest.slice(coeffMatch[1].length);
    }
    let term = Poly.constant(coeff);
    while (rest) {
      const match = aliases.find((entry) => rest.startsWith(entry.alias));
      if (!match) throw new Error(`Unknown class in rule near "${rest}".`);
      rest = rest.slice(match.alias.length);
      const parsedPower = parseHomologyExponent(rest);
      rest = parsedPower.rest;
      term = term.mul(polyPower(Poly.variable(match.id), parsedPower.exponent, MAX_DIMENSION), MAX_DIMENSION);
    }
    return term;
  }

  function parseHomologyExponent(text) {
    if (!text.startsWith('^')) return { exponent: 1, rest: text };
    const body = text.slice(1);
    const braced = body.match(/^\{(\d+)\}/);
    if (braced) return { exponent: normalizedInt(braced[1], 0, MAX_DIMENSION, 1), rest: body.slice(braced[0].length) };
    const plain = body.match(/^(\d+)/);
    if (plain) return { exponent: normalizedInt(plain[1], 0, MAX_DIMENSION, 1), rest: body.slice(plain[1].length) };
    throw new Error('Rule exponent must be a nonnegative integer.');
  }

  function sheafFromObject(sheaf, geometry) {
    const type = canonicalSheafType(sheaf?.type);
    const twist = normalizedInt(sheaf.twist, -24, 24, 1);
    let basis = normalizeBasisValue(sheaf.basis);
    if (basis === 'roots' && !sheafSupportsChernRoots(sheaf)) basis = 'chern';
    const baseVariety = baseVarietyForSheaf(sheaf);
    const rankPlain = type === 'structure'
      ? '1'
      : (isUniversalBundleSheafType(type) ? universalBundleRankPlain(geometry) : sanitizeRankInput(sheaf.rank));
    const labelLatex = sanitizeMathLabel(sheaf.name, defaultSheafNameFor(type, rankPlain, twist, geometry?.labelLatex || 'X', geometry));
    const specialLabels = sheafHasLocallyFreeLabel(sheaf) ? ['locally-free'] : [];
    Object.assign(sheaf, { type, twist: String(twist), basis, rank: rankPlain, name: labelLatex, baseVarietyId: baseVariety?.id || sheaf.baseVarietyId || null, specialLabels });
    return {
      type,
      twist,
      baseVarietyId: sheaf.baseVarietyId,
      basis,
      rankPlain,
      rankLatex: simplifyScalarExpressionLatex(rankPlain, { kind: 'sheaf', id: sheaf.id, field: 'rank' }),
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      specialLabels,
      construction: sheaf.construction || null,
      sourceObject: sheaf
    };
  }

  function readGeometry() {
    const type = refs.varietyType.value;
    if (type === 'projective') {
      const n = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = String(n);
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, `\\mathbb{P}^{${n}}`);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim: n,
        ambient: n,
        degrees: [],
        codim: 0,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${n}}`,
        ambientPlain: `P^${n}`
      };
    }
    if (type === 'grassmannian') {
      const { r, n, dim } = syncGrassmannianControls();
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, `\\operatorname{Gr}(${r},${n})`);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{C}^{${n}}`,
        ambientPlain: `C^${n}`,
        grassmannianR: r,
        grassmannianN: n,
        grassmannianQRank: n - r,
        grassmannianYoungBasis: activeVariety()?.grassmannianYoungBasis === true
      };
    }
    if (type === 'curve') {
      refs.dim.value = '1';
      refs.curveGenus.value = sanitizeGenusInput(refs.curveGenus.value);
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, curveDefaultName(refs.curveGenus.value));
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim: 1,
        genus: refs.curveGenus.value,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'curve',
        ambientPlain: 'curve'
      };
    }
    if (type === 'abelian') {
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 2);
      refs.dim.value = String(dim);
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, 'A');
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'abelian',
        ambientPlain: 'abelian'
      };
    }
    if (type === 'point') {
      refs.dim.value = '0';
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, POINT_VARIETY_NAMES[0]);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim: 0,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'point',
        ambientPlain: 'point'
      };
    }
    if (type === 'complete-intersection') {
      const degrees = parseDegrees(refs.ciDegrees.value);
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = String(dim);
      const ambient = Math.min(MAX_AMBIENT, dim + degrees.length);
      const defaultLabel = degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, defaultLabel);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim,
        ambient,
        degrees,
        codim: degrees.length,
        labelLatex,
        labelPlain: degrees.length ? `${latexToPlain(labelLatex)} in P^${ambient}` : latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${ambient}}`,
        ambientPlain: `P^${ambient}`
      };
    }
    const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
    refs.dim.value = String(dim);
    const labelLatex = sanitizeMathLabel(refs.varietyName.value, 'X');
    refs.varietyName.value = labelLatex;
    return {
      type: 'abstract',
      dim,
      ambient: null,
      degrees: [],
      codim: null,
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      ambientLatex: 'abstract',
      ambientPlain: 'abstract'
    };
  }

  function readSheaf() {
    const type = refs.sheafType.value;
    const twist = normalizedInt(refs.twist.value, -24, 24, 1);
    let basis = normalizeBasisValue(refs.basis.value);
    if (basis === 'roots' && type !== 'abstract' && !sheafHasLocallyFreeLabel({ type })) basis = 'chern';
    const rankPlain = type === 'structure' ? '1' : sanitizeRankInput(refs.rank.value);
    refs.rank.value = rankPlain;
    const labelLatex = sanitizeMathLabel(refs.sheafName.value, defaultSheafNameLatex());
    refs.sheafName.value = labelLatex;
    return {
      type,
      twist,
      basis,
      rankPlain,
      rankLatex: simplifyScalarExpressionLatex(rankPlain),
      labelLatex,
      labelPlain: latexToPlain(labelLatex)
    };
  }

  function buildCharacteristicClasses(geometry, sheaf) {
    defineHomologyVariables(geometry);
    const d = geometry.dim;
    const bundle = buildBundleForSheaf(geometry, sheaf);
    bundle.defaultSheafHomologyRules = defaultSheafHomologyRulesFromBundle(sheaf, geometry, bundle);
    const canApplySheafRules = sheafUsesFreeClassVariables(sheaf);
    const sheafHomology = canApplySheafRules && sheaf?.sourceObject ? ensureSheafHomologySystem(sheaf.sourceObject, geometry) : null;
    if (canApplySheafRules && sheafHomology?.rules?.length) {
      const ruleGeometry = sheafHomologyGeometry(sheaf, geometry);
      const sheafDisplayOptions = {
        geometry: ruleGeometry,
        homology: ruleGeometry.homology,
        sheaf,
        baseGeometry: geometry,
        homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
      };
      applySheafHomologyRulesToBundle(bundle, d, sheafDisplayOptions);
    }
    const hodge = buildHodgeNumbers(geometry);

    const result = {
      geometry,
      sheaf,
      bundle,
      hodge,
      cohomology: buildSheafCohomology(geometry, sheaf, hodge),
      classRows: [],
      classDisplay: classDisplayOptions(geometry, sheaf)
    };
    result.classRows = buildClassRows(bundle, d, result.classDisplay);
    return result;
  }

  function applySheafHomologyRulesToBundle(bundle, d, options) {
    const defs = sheafHomologyClassDefinitions(options.sheaf, options.baseGeometry || options.geometry);
    defs.forEach(defineSheafClassVariable);
    const rules = (options.homology?.rules || []).filter((rule) => rule.enabled !== false);
    const basis = normalizeBasisValue(options.sheaf?.basis);
    for (const def of defs) {
      const rule = mapHomologyRuleForVariable(rules, def.id);
      if (!rule) continue;
      const rhs = homologyRuleRhsPoly(rule).truncate(d);
      if (basis === 'character') bundle.chComps[def.degree] = rhs;
      else bundle.cComps[def.degree] = rhs;
    }
    if (basis === 'character') {
      bundle.pComps = zeroComponentArray(d);
      for (let i = 1; i <= d; i += 1) {
        bundle.pComps[i] = componentOrZero(bundle.chComps, i).scale(fraction(factorialBigInt(i)));
      }
      bundle.cComps = chernFromPowerSums(bundle.pComps, d);
    } else {
      bundle.pComps = powerSumsFromChern(bundle.cComps, d);
      bundle.chComps = chComponentsFromPowerSums(bundle.pComps, d);
    }
    bundle.cTotal = totalFromComponents(bundle.cComps, d, Poly.one());
    bundle.segre = inverseUnit(bundle.cTotal, d);
    const logTodd = toddLogFromPowerSums(bundle.pComps, d);
    bundle.todd = expPoly(logTodd, d);
    bundle.sqrtTodd = expPoly(logTodd.scale(fraction(1, 2)), d);
    return bundle;
  }

  function defaultSheafHomologyRulesFromBundle(sheaf, geometry, bundle) {
    if (!sheaf || !geometry || !bundle || sheafUsesFreeClassVariables(sheaf)) return [];
    const basis = normalizeBasisValue(sheaf.basis);
    const defs = sheafHomologyClassDefinitions(sheaf, geometry);
    return defs.map((def) => {
      const rhsPoly = basis === 'character'
        ? componentOrZero(bundle.chComps, def.degree)
        : componentOrZero(bundle.cComps, def.degree);
      return {
        id: `default-sheaf-rule-${def.id}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [def.id]: 1 } },
        rhs: serializeHomologyPoly(rhsPoly)
      };
    });
  }

  function sheafUsesFreeClassVariables(sheaf) {
    if (!sheaf) return true;
    if (sheaf.construction) return false;
    return sheaf.type === 'abstract' || sheaf.type === 'locally-free';
  }

  function buildBundleForSheaf(geometry, sheaf, options = {}) {
    const d = geometry.dim;
    if (sheaf.construction) return buildConstructedSheafBundle(geometry, sheaf, options);
    if (sheaf.type === 'structure') return buildTrivialBundle(d, 1, sheaf.labelLatex, sheaf.labelPlain);
    if (sheaf.type === 'locally-free') return buildLocallyFreeBundle(d, sheaf, options);
    if (sheaf.type === 'abstract') return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
    if (geometryHasNumericalCurveLabel(geometry) && (sheaf.type === 'tangent' || sheaf.type === 'cotangent' || sheaf.type === 'canonical')) {
      return buildCurveLineBundle(geometry, sheaf, sheaf.type);
    }
    if (geometry.type === 'grassmannian') return buildGrassmannianSheafBundle(geometry, sheaf, options);
    if (geometry.type === 'abstract' || geometry.type === 'curve' || geometry.type === 'abelian' || geometry.type === 'point') return buildAbstractGeometrySheaf(geometry, sheaf, options);
    return buildEmbeddedGeometrySheaf(geometry, sheaf, options);
  }

  function classDisplayOptions(geometry, sheaf) {
    const supportsRoots = sheafSupportsChernRoots(sheaf);
    const expression = supportsRoots && sheaf.basis === 'roots' ? 'roots' : 'standard';
    const rootForm = refs.rootForm?.value === 'expanded' ? 'expanded' : 'product';
    const termMode = refs.classTermOnly?.checked ? 'term' : 'total';
    const termIndex = termMode === 'term'
      ? normalizedInt(refs.classTermIndex?.value, 0, geometry.dim, 1)
      : null;
    if (termMode === 'term' && refs.classTermIndex) refs.classTermIndex.value = String(termIndex);
    return {
      expression,
      rootForm,
      termMode,
      termIndex,
      geometry,
      homology: geometry.homology || null,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    };
  }

  function buildClassRows(bundle, d, options) {
    if (options.expression === 'roots') {
      if (options.rootForm === 'expanded' && rootExpansionRankFromPlain(bundle.rankPlain, d) != null) {
        return buildExpandedRootClassRows(bundle, d, options);
      }
      return buildProductRootClassRows(bundle, options);
    }
    return buildStandardClassRows(bundle, d, options);
  }

  function formatClassPolyLatex(poly, options) {
    return formatPolyLatex(applyHomologyRules(poly, options));
  }

  function formatClassPolyPlain(poly, options) {
    return formatPolyPlain(applyHomologyRules(poly, options));
  }

  function formatRankPlusClassPolyLatex(rank, poly, options) {
    return formatRankPlusPolyLatex(rank, applyHomologyRules(poly, options));
  }

  function formatRankPlusClassPolyPlain(rank, poly, options) {
    return formatRankPlusPolyPlain(rank, applyHomologyRules(poly, options));
  }

  function buildStandardClassRows(bundle, d, options) {
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `chern_${i}`, latex: formatClassPolyLatex(i === 0 ? Poly.one() : componentOrZero(bundle.cComps, i), options), plain: formatClassPolyPlain(i === 0 ? Poly.one() : componentOrZero(bundle.cComps, i), options) },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `character_${i}`, latex: i === 0 ? (bundle.rankLatex || '0') : formatClassPolyLatex(componentOrZero(bundle.chComps, i), options), plain: i === 0 ? (bundle.rankPlain || '0') : formatClassPolyPlain(componentOrZero(bundle.chComps, i), options) },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `todd_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.todd, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.todd, i), options) },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `segre_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.segre, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.segre, i), options) },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `sqrtTodd_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.sqrtTodd, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.sqrtTodd, i), options) }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'chern', latex: formatClassPolyLatex(bundle.cTotal, options), plain: formatClassPolyPlain(bundle.cTotal, options) },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'character', latex: formatRankPlusClassPolyLatex(bundle.rankLatex, positiveTotal(bundle.chComps, d), options), plain: formatRankPlusClassPolyPlain(bundle.rankPlain, positiveTotal(bundle.chComps, d), options) },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'todd', latex: formatClassPolyLatex(bundle.todd, options), plain: formatClassPolyPlain(bundle.todd, options) },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'segre', latex: formatClassPolyLatex(bundle.segre, options), plain: formatClassPolyPlain(bundle.segre, options) },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'sqrtTodd', latex: formatClassPolyLatex(bundle.sqrtTodd, options), plain: formatClassPolyPlain(bundle.sqrtTodd, options) }
    ];
  }

  function buildProductRootClassRows(bundle, options) {
    const rankLatex = bundle.rankLatex || 'r';
    const rankPlain = bundle.rankPlain || 'r';
    const explicitRank = explicitRootRankFromPlain(rankPlain);
    const total = explicitRank == null
      ? indexedRootTotals(rankLatex, rankPlain)
      : explicitRootTotals(explicitRank);
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      const term = i === 0 ? rootDegreeZeroTerms(rankLatex, rankPlain) : {
        chern: coefficientLatexPlain(total.chern, i),
        character: explicitRank == null ? rootCharacterTerm(i, rankLatex, rankPlain) : explicitRootCharacterTerm(i, explicitRank),
        todd: coefficientLatexPlain(total.todd, i),
        segre: coefficientLatexPlain(total.segre, i),
        sqrtTodd: coefficientLatexPlain(total.sqrtTodd, i)
      };
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `root_chern_${i}`, latex: term.chern.latex, plain: term.chern.plain },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `root_character_${i}`, latex: term.character.latex, plain: term.character.plain },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `root_todd_${i}`, latex: term.todd.latex, plain: term.todd.plain },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `root_segre_${i}`, latex: term.segre.latex, plain: term.segre.plain },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `root_sqrtTodd_${i}`, latex: term.sqrtTodd.latex, plain: term.sqrtTodd.plain }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'root_chern', latex: total.chern.latex, plain: total.chern.plain },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'root_character', latex: total.character.latex, plain: total.character.plain },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'root_todd', latex: total.todd.latex, plain: total.todd.plain },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'root_segre', latex: total.segre.latex, plain: total.segre.plain },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'root_sqrtTodd', latex: total.sqrtTodd.latex, plain: total.sqrtTodd.plain }
    ];
  }

  function indexedRootTotals(rankLatex, rankPlain) {
    const alpha = '\\alpha_j';
    const rangeLatex = `_{j=1}^{${rankLatex}}`;
    const rangePlain = `_{j=1}^${rankPlain}`;
    return {
      chern: {
        latex: `\\prod${rangeLatex}(1+${alpha})`,
        plain: `prod${rangePlain}(1 + alpha_j)`
      },
      character: {
        latex: `\\sum${rangeLatex} e^{${alpha}}`,
        plain: `sum${rangePlain} exp(alpha_j)`
      },
      todd: {
        latex: `\\prod${rangeLatex}\\frac{${alpha}}{1-e^{-${alpha}}}`,
        plain: `prod${rangePlain} alpha_j/(1 - exp(-alpha_j))`
      },
      segre: {
        latex: `\\prod${rangeLatex}(1+${alpha})^{-1}`,
        plain: `prod${rangePlain}(1 + alpha_j)^-1`
      },
      sqrtTodd: {
        latex: `\\prod${rangeLatex}\\sqrt{\\frac{${alpha}}{1-e^{-${alpha}}}}`,
        plain: `prod${rangePlain} sqrt(alpha_j/(1 - exp(-alpha_j)))`
      }
    };
  }

  function explicitRootTotals(rank) {
    const roots = Array.from({ length: rank }, (_, index) => index + 1);
    return {
      chern: explicitProductDisplay(roots.map((i) => ({
        latex: `(1+${rootLatex(i)})`,
        plain: `(1 + ${rootPlain(i)})`
      })), '1'),
      character: explicitSumDisplay(roots.map((i) => ({
        latex: `e^{${rootLatex(i)}}`,
        plain: `exp(${rootPlain(i)})`
      })), '0'),
      todd: explicitProductDisplay(roots.map((i) => ({
        latex: `\\left(\\frac{${rootLatex(i)}}{1-e^{-${rootLatex(i)}}}\\right)`,
        plain: `(${rootPlain(i)}/(1 - exp(-${rootPlain(i)})))`
      })), '1'),
      segre: explicitProductDisplay(roots.map((i) => ({
        latex: `(1+${rootLatex(i)})^{-1}`,
        plain: `(1 + ${rootPlain(i)})^-1`
      })), '1'),
      sqrtTodd: explicitProductDisplay(roots.map((i) => ({
        latex: `\\sqrt{\\frac{${rootLatex(i)}}{1-e^{-${rootLatex(i)}}}}`,
        plain: `sqrt(${rootPlain(i)}/(1 - exp(-${rootPlain(i)})))`
      })), '1')
    };
  }

  function explicitProductDisplay(factors, emptyValue) {
    if (!factors.length) return { latex: emptyValue, plain: emptyValue };
    return {
      latex: factors.map((factor) => factor.latex).join(''),
      plain: factors.map((factor) => factor.plain).join('*')
    };
  }

  function explicitSumDisplay(terms, emptyValue) {
    if (!terms.length) return { latex: emptyValue, plain: emptyValue };
    return {
      latex: terms.map((term) => term.latex).join(' + '),
      plain: terms.map((term) => term.plain).join(' + ')
    };
  }

  function explicitRootCharacterTerm(degree, rank) {
    const denom = factorialBigInt(degree).toString();
    const terms = Array.from({ length: rank }, (_, index) => {
      const i = index + 1;
      const latexRoot = rootLatex(i);
      const plainRoot = rootPlain(i);
      return {
        latex: degree === 1 ? latexRoot : `${latexRoot}^{${degree}}`,
        plain: degree === 1 ? plainRoot : `${plainRoot}^${degree}`
      };
    });
    const sum = explicitSumDisplay(terms, '0');
    if (denom === '1' || sum.latex === '0') return sum;
    return {
      latex: `\\frac{1}{${denom}}\\left(${sum.latex}\\right)`,
      plain: `1/${denom}*(${sum.plain})`
    };
  }

  function rootLatex(index) {
    return `\\alpha_{${index}}`;
  }

  function rootPlain(index) {
    return `alpha_${index}`;
  }

  function buildExpandedRootClassRows(bundle, d, options) {
    const rank = rootExpansionRankFromPlain(bundle.rankPlain, d);
    if (rank == null) return buildProductRootClassRows(bundle, { ...options, rootForm: 'product' });
    const rootDisplay = buildExpandedRootPolynomials(rank, d);
    if (rootDisplayHasLargeExpansion(rootDisplay, options)) {
      options.rootForm = 'product';
      return buildProductRootClassRows(bundle, { ...options, rootForm: 'product' });
    }
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `root_chern_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.chern, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.chern, i)) },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `root_character_${i}`, latex: i === 0 ? String(rank) : formatPolyLatex(homogeneousPart(rootDisplay.character, i)), plain: i === 0 ? String(rank) : formatPolyPlain(homogeneousPart(rootDisplay.character, i)) },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `root_todd_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.todd, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.todd, i)) },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `root_segre_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.segre, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.segre, i)) },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `root_sqrtTodd_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.sqrtTodd, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.sqrtTodd, i)) }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'root_chern', latex: formatPolyLatex(rootDisplay.chern), plain: formatPolyPlain(rootDisplay.chern) },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'root_character', latex: formatRankPlusPolyLatex(String(rank), rootDisplay.character), plain: formatRankPlusPolyPlain(String(rank), rootDisplay.character) },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'root_todd', latex: formatPolyLatex(rootDisplay.todd), plain: formatPolyPlain(rootDisplay.todd) },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'root_segre', latex: formatPolyLatex(rootDisplay.segre), plain: formatPolyPlain(rootDisplay.segre) },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'root_sqrtTodd', latex: formatPolyLatex(rootDisplay.sqrtTodd), plain: formatPolyPlain(rootDisplay.sqrtTodd) }
    ];
  }

  function buildExpandedRootPolynomials(rank, d) {
    const roots = chernRootVariables(rank);
    const pComps = powerSumsFromRoots(roots, d);
    return {
      chern: multiplyRootFactors(roots.map((root) => Poly.one().add(root)), d),
      character: positiveTotal(chComponentsFromPowerSums(pComps, d), d),
      todd: multiplyRootSeries(roots, toddFactorCoefficients(d), d),
      segre: multiplyRootSeries(roots, segreFactorCoefficients(d), d),
      sqrtTodd: multiplyRootSeries(roots, sqrtToddFactorCoefficients(d), d)
    };
  }

  function chernComponentsFromRoots(rank, d) {
    const total = chernRootVariables(rank)
      .reduce((product, root) => product.mul(Poly.one().add(root), d), Poly.one());
    const cComps = zeroComponentArray(d);
    cComps[0] = Poly.one();
    for (let i = 1; i <= d; i++) cComps[i] = homogeneousPart(total, i);
    return cComps;
  }

  function chernRootVariables(rank) {
    return Array.from({ length: rank }, (_, index) => chernRootVariable(index + 1));
  }

  function chernRootVariable(index) {
    const id = `chernRoot${index}`;
    defineVariable(id, 1, `\\alpha_{${index}}`);
    return Poly.variable(id);
  }

  function componentOrZero(comps, index) {
    return comps && comps[index] ? comps[index] : Poly.zero();
  }

  function powerSumsFromRoots(roots, d) {
    const sums = zeroComponentArray(d);
    for (const root of roots) {
      let power = Poly.one();
      for (let i = 1; i <= d; i++) {
        power = power.mul(root, d);
        sums[i] = sums[i].add(power);
      }
    }
    return sums;
  }

  function multiplyRootFactors(factors, d) {
    return factors.reduce((product, factor) => product.mul(factor, d), Poly.one()).truncate(d);
  }

  function multiplyRootSeries(roots, coeffs, d) {
    return multiplyRootFactors(roots.map((root) => polyFromRootSeries(root, coeffs, d)), d);
  }

  function polyFromRootSeries(root, coeffs, d) {
    let total = Poly.zero();
    let power = Poly.one();
    for (let i = 0; i <= d; i++) {
      const coeff = Fraction.from(coeffs[i] || Fraction.zero());
      if (!coeff.isZero()) total = total.add(power.scale(coeff));
      if (i < d) power = power.mul(root, d);
    }
    return total.truncate(d);
  }

  function segreFactorCoefficients(d) {
    return Array.from({ length: d + 1 }, (_, i) => fraction(i % 2 === 0 ? 1 : -1));
  }

  function toddFactorCoefficients(d) {
    const denominator = Array.from({ length: d + 1 }, (_, i) => fraction(i % 2 === 0 ? 1 : -1, factorialBigInt(i + 1)));
    return seriesInverse(denominator, d);
  }

  function sqrtToddFactorCoefficients(d) {
    return seriesExp(seriesScale(toddLogCoefficients(d), fraction(1, 2), d), d);
  }

  function rootDisplayHasLargeExpansion(display, options) {
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const polys = [
        homogeneousPart(display.chern, i),
        i === 0 ? Poly.one() : homogeneousPart(display.character, i),
        homogeneousPart(display.todd, i),
        homogeneousPart(display.segre, i),
        homogeneousPart(display.sqrtTodd, i)
      ];
      return polys.some((poly) => poly.terms.size > MAX_ROOT_EXPANSION_MONOMIALS);
    }
    return [display.chern, display.character, display.todd, display.segre, display.sqrtTodd]
      .some((poly) => poly.terms.size > MAX_ROOT_EXPANSION_MONOMIALS);
  }

  function homogeneousPart(poly, degree) {
    poly = Poly.from(poly);
    const terms = new Map();
    for (const [key, coeff] of poly.terms) {
      if (monoDegree(key) === degree) terms.set(key, coeff);
    }
    return new Poly(terms);
  }

  function applyHomologyRules(poly, options = {}) {
    poly = Poly.from(poly);
    const geometry = options.geometry || null;
    const homology = options.homology || geometry?.homology || null;
    defineHomologyVariables(geometry);
    const startPoly = simplifyProductBoxPolynomial(
      maybeExpandMapHomologyVariables(poly, options),
      geometry,
      options
    );
    // Map expansion inspects source varieties and can rebind shared symbols such as [p].
    // Rebind the target geometry before checking or applying target-side rules.
    defineHomologyVariables(geometry);
    const defs = homologyClassDefinitions(geometry);
    const available = new Set(defs.flatMap((def) => [...homologyDefVariableIds(def, geometry)]));
    const storedRules = homology?.rules || [];
    const defaultRules = options.includeDefaultMapRules === false
      ? []
      : defaultMapHomologyRulesForGeometry(geometry)
        .filter((rule) => !storedRules.some((stored) => homologyRuleHasSameLhs(stored, rule)));
    const rules = [...storedRules, ...defaultRules].filter((rule) => (
      rule.enabled !== false
      && homologyRulePreservesDegree(rule, defs, { geometry })
      && homologyRuleUsesAvailableVariables(rule, available)
    ));
    defineHomologyVariables(geometry);
    if (!rules.length) return startPoly.truncate(geometry?.dim ?? MAX_DIMENSION);
    let out = startPoly;
    const passes = Math.max(1, normalizedInt(options.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES));
    for (let pass = 1; pass <= passes; pass += 1) {
      const before = out;
      out = maybeExpandMapHomologyVariables(out, options);
      out = simplifyProductBoxPolynomial(out, geometry, options);
      defineHomologyVariables(geometry);
      out = applyHomologyRuleSweep(out, rules, geometry?.dim ?? MAX_DIMENSION);
      out = maybeExpandMapHomologyVariables(out, options);
      out = simplifyProductBoxPolynomial(out, geometry, options);
      defineHomologyVariables(geometry);
      out = applyHomologyRuleSweep(out, rules, geometry?.dim ?? MAX_DIMENSION);
      if (polyEquals(before, out)) return out.truncate(geometry?.dim ?? MAX_DIMENSION);
    }
    defineHomologyVariables(geometry);
    return out.truncate(geometry?.dim ?? MAX_DIMENSION);
  }

  function maybeExpandMapHomologyVariables(poly, options = {}) {
    if (options.expandNestedMaps === false) return Poly.from(poly);
    return expandNestedMapHomologyVariables(poly, options);
  }

  function simplifyProductBoxPolynomial(poly, geometry, options = {}) {
    if (options.simplifyProductBoxes === false || !productGeometryContext(geometry)) return Poly.from(poly);
    let out = Poly.from(poly);
    for (let pass = 0; pass < 4; pass += 1) {
      const next = simplifyProductBoxPolynomialOnce(out, geometry, options);
      if (polyEquals(next, out)) return out.truncate(geometry?.dim ?? MAX_DIMENSION);
      out = next;
    }
    return out.truncate(geometry?.dim ?? MAX_DIMENSION);
  }

  function simplifyProductBoxPolynomialOnce(poly, geometry, options = {}) {
    const maxDegree = geometry?.dim ?? MAX_DIMENSION;
    const terms = new Map();
    for (const [key, coeff] of Poly.from(poly).terms) {
      const replacement = simplifyProductBoxMonomial(parseMonoKey(key), geometry, options);
      const expanded = (replacement || polyFromPowers(parseMonoKey(key))).scale(coeff);
      for (const [nextKey, nextCoeff] of expanded.terms) {
        const next = (terms.get(nextKey) || Fraction.zero()).add(nextCoeff);
        if (next.isZero()) terms.delete(nextKey);
        else terms.set(nextKey, next);
      }
    }
    return new Poly(terms).truncate(maxDegree);
  }

  function simplifyProductBoxMonomial(powers, geometry, options = {}) {
    const context = productGeometryContext(geometry);
    if (!context) return null;
    let totalLeft = Poly.one();
    let totalRight = Poly.one();
    const residualPowers = {};
    let foundBox = false;
    let maxDegree = geometry?.dim ?? MAX_DIMENSION;
    for (const [id, exp] of Object.entries(powers || {})) {
      const exponent = Number(exp) || 0;
      if (exponent <= 0) continue;
      const box = productBoxDataForVariable(id);
      if (!box) {
        residualPowers[id] = (residualPowers[id] || 0) + exponent;
        continue;
      }
      foundBox = true;
      const leftFactor = polyPower(polyFromPowers(parseMonoKey(box.leftKey || '')), exponent, context.leftGeometry.dim);
      const rightFactor = polyPower(polyFromPowers(parseMonoKey(box.rightKey || '')), exponent, context.rightGeometry.dim);
      totalLeft = totalLeft.mul(leftFactor, context.leftGeometry.dim);
      totalRight = totalRight.mul(rightFactor, context.rightGeometry.dim);
      if (totalLeft.isZero() || totalRight.isZero()) return Poly.zero();
    }
    if (!foundBox) return null;
    totalLeft = applyHomologyRules(totalLeft, {
      geometry: context.leftGeometry,
      homology: context.leftGeometry.homology,
      expandNestedMaps: false,
      simplifyProductBoxes: false,
      includeDefaultMapRules: false,
      homologyRulePasses: options.homologyRulePasses
    });
    totalRight = applyHomologyRules(totalRight, {
      geometry: context.rightGeometry,
      homology: context.rightGeometry.homology,
      expandNestedMaps: false,
      simplifyProductBoxes: false,
      includeDefaultMapRules: false,
      homologyRulePasses: options.homologyRulePasses
    });
    let out = Poly.zero();
    for (const [leftKey, leftCoeff] of totalLeft.terms) {
      for (const [rightKey, rightCoeff] of totalRight.terms) {
        const boxPoly = productBoxPolyForKeys(geometry, leftKey, rightKey);
        if (boxPoly.isZero()) return null;
        out = out.add(boxPoly.scale(leftCoeff.mul(rightCoeff)));
      }
    }
    const residual = polyFromPowers(residualPowers);
    return out.mul(residual, maxDegree).truncate(maxDegree);
  }

  function polyEquals(a, b) {
    a = Poly.from(a);
    b = Poly.from(b);
    if (a.terms.size !== b.terms.size) return false;
    for (const [key, coeff] of a.terms) {
      const other = b.terms.get(key);
      if (!other || coeff.num !== other.num || coeff.den !== other.den) return false;
    }
    return true;
  }

  function polySignature(poly) {
    return sortedTerms(Poly.from(poly))
      .map(([key, coeff]) => `${key}:${coeff.num}/${coeff.den}`)
      .join(';');
  }

  function expandNestedMapHomologyVariables(poly, options = {}) {
    poly = Poly.from(poly);
    const geometry = options.geometry || null;
    const maxDegree = geometry?.dim ?? MAX_DIMENSION;
    let out = poly;
    for (let pass = 0; pass < 4; pass += 1) {
      const next = expandNestedMapHomologyVariablesOnce(out, options, maxDegree);
      if (polyEquals(next, out)) return out.truncate(maxDegree);
      out = next;
    }
    return out.truncate(maxDegree);
  }

  function expandNestedMapHomologyVariablesOnce(poly, options, maxDegree) {
    const terms = new Map();
    for (const [key, coeff] of Poly.from(poly).terms) {
      let replacement = Poly.one();
      for (const [id, exp] of Object.entries(parseMonoKey(key))) {
        const factor = expandOneMapHomologyVariable(id, options);
        replacement = replacement.mul(polyPower(factor, exp, maxDegree), maxDegree);
      }
      replacement = replacement.scale(coeff);
      for (const [nextKey, nextCoeff] of replacement.terms) {
        const next = (terms.get(nextKey) || Fraction.zero()).add(nextCoeff);
        if (next.isZero()) terms.delete(nextKey);
        else terms.set(nextKey, next);
      }
    }
    return new Poly(terms).truncate(maxDegree);
  }

  function expandOneMapHomologyVariable(id, options = {}) {
    const data = VARS.get(id) || ensureMapHomologyVariableFromId(id);
    if (data?.kind !== 'mapHomology') return Poly.variable(id);
    if (!data.sourceKey && data.sourceKey !== '') return Poly.variable(id);
    const seen = options.mapExpansionStack || new Set();
    if (seen.has(id)) return Poly.variable(id);
    const map = state.maps.find((item) => item.id === data.mapId);
    if (!map || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return Poly.variable(id);
    const sourceGeometry = data.operation === 'pullback'
      ? geometryByVarietyId(map.codomainId)
      : geometryByVarietyId(map.domainId);
    const targetGeometry = data.operation === 'pullback'
      ? geometryByVarietyId(map.domainId)
      : (options.geometry || geometryByVarietyId(map.codomainId));
    if (!sourceGeometry || !targetGeometry) return Poly.variable(id);
    defineHomologyVariables(sourceGeometry);
    if (data.operation === 'pushforward') {
      defineHomologyVariables(targetGeometry);
      const abelJacobiKnown = abelJacobiPushforwardSourceKey(map, data.sourceKey, targetGeometry);
      if (abelJacobiKnown) return abelJacobiKnown.truncate(targetGeometry.dim);
      const projected = projectionFormulaPushforwardSourceKey(map, data.sourceKey, sourceGeometry.dim, targetGeometry.dim, { proper: false });
      if (projected) return projected.truncate(targetGeometry.dim);
    }
    const sourcePoly = polyFromPowers(parseMonoKey(data.sourceKey));
    const simplifiedSource = applyHomologyRules(sourcePoly, {
      geometry: sourceGeometry,
      homology: sourceGeometry.homology,
      homologyRulePasses: options.homologyRulePasses,
      expandNestedMaps: true,
      includeDefaultMapRules: false,
      mapExpansionStack: new Set([...seen, id])
    });
    if (polyEquals(sourcePoly, simplifiedSource)) return Poly.variable(id);
    if (data.operation === 'pullback') return pullbackPolynomial(simplifiedSource, map).truncate(targetGeometry.dim);
    if (data.operation === 'pushforward') return pushforwardPolynomialByDegree(map, simplifiedSource, sourceGeometry.dim, targetGeometry.dim, { proper: false });
    return Poly.variable(id);
  }

  function applyHomologyRuleSweep(poly, rules, maxDegree) {
    let out = Poly.from(poly);
    const seen = new Set([polySignature(out)]);
    const limit = Math.max(1, Math.min(64, rules.length + 1));
    for (let step = 0; step < limit; step += 1) {
      const before = out;
      for (const rule of rules) out = applyOneHomologyRule(out, rule, maxDegree);
      if (polyEquals(before, out)) return out.truncate(maxDegree);
      const signature = polySignature(out);
      if (seen.has(signature)) return out.truncate(maxDegree);
      seen.add(signature);
    }
    return out.truncate(maxDegree);
  }

  function applyOneHomologyRule(poly, rule, maxDegree) {
    const lhsPowers = rule.lhs?.powers || {};
    const rhs = homologyRuleRhsPoly(rule);
    const terms = new Map();
    for (const [key, coeff] of poly.terms) {
      const powers = parseMonoKey(key);
      const count = monomialFactorCount(powers, lhsPowers);
      const factorization = count > 0 ? removeMonomialFactor(powers, lhsPowers, count) : null;
      const replacement = count > 0 && factorization
        ? polyPower(rhs, count, maxDegree).mul(factorization.remainder, maxDegree).scale(coeff.mul(factorization.sign))
        : polyFromPowers(powers).scale(coeff);
      for (const [nextKey, nextCoeff] of replacement.terms) {
        const next = (terms.get(nextKey) || Fraction.zero()).add(nextCoeff);
        if (next.isZero()) terms.delete(nextKey);
        else terms.set(nextKey, next);
      }
    }
    return new Poly(terms).truncate(maxDegree);
  }

  function defaultMapHomologyRulesForGeometry(geometry) {
    if (!geometry?.varietyId) return [];
    const pullbackRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.domainId === geometry.varietyId)
      .map((map) => defaultPullbackUnitRule(map));
    const projectionPullbackRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.domainId === geometry.varietyId)
      .flatMap((map) => defaultProjectionPullbackRules(map, geometry));
    const pointPushforwardRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.codomainId === geometry.varietyId)
      .flatMap((map) => defaultPointPushforwardRules(map, geometry));
    const projectionPushforwardRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.codomainId === geometry.varietyId)
      .flatMap((map) => defaultProjectionPushforwardRules(map, geometry));
    const abelJacobiPullbackRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.domainId === geometry.varietyId)
      .flatMap((map) => defaultAbelJacobiPullbackRules(map, geometry));
    const abelJacobiPushforwardRules = state.maps
      .filter((map) => map.domainKind === 'variety' && map.codomainKind === 'variety' && map.codomainId === geometry.varietyId)
      .flatMap((map) => defaultAbelJacobiPushforwardRules(map, geometry));
    return uniqueHomologyRulesByLhs([
      ...pullbackRules,
      ...projectionPullbackRules,
      ...pointPushforwardRules,
      ...projectionPushforwardRules,
      ...abelJacobiPullbackRules,
      ...abelJacobiPushforwardRules
    ].filter(Boolean));
  }

  function defaultPullbackUnitRule(map) {
    const sourceGeometry = geometryByVarietyId(map?.codomainId);
    const sourceUnitId = homologyVariableId(HOMOLOGY_UNIT_CLASS, sourceGeometry);
    defineVariable(sourceUnitId, 0, '1');
    const variableId = defineMapHomologyVariable(map, 'pullback', sourceUnitId, 0, '1');
    return {
      id: `default-pullback-unit-${map.id}`,
      builtin: true,
      enabled: true,
      lhs: { powers: { [variableId]: 1 } },
      rhs: [{ coefficient: '1', powers: {} }]
    };
  }

  function defaultPointPushforwardRules(map, targetGeometry = geometryByVarietyId(map?.codomainId)) {
    const sourceGeometry = geometryByVarietyId(map?.domainId);
    if (!map || !sourceGeometry || !targetGeometry) return [];
    const rules = [];
    if (sourceGeometry.type !== 'point' && targetGeometry.type !== 'point') {
      const sourcePoint = homologyClassDefById(sourceGeometry, HOMOLOGY_POINT_CLASS);
      const targetPoint = homologyClassDefById(targetGeometry, HOMOLOGY_POINT_CLASS);
      const targetDef = mapOperationHomologyClassDefinition(map, 'pushforward', sourcePoint, targetGeometry);
      if (targetDef && targetPoint) {
        rules.push({
          id: `default-point-pushforward-${map.id}`,
          builtin: true,
          enabled: true,
          lhs: { powers: { [homologyDefVariableId(targetDef, targetGeometry)]: 1 } },
          rhs: [{ coefficient: '1', powers: { [homologyDefVariableId(targetPoint, targetGeometry)]: 1 } }]
        });
      }
    }
    if (sourceGeometry.type === 'point') {
      const variableId = defineMapHomologyVariable(map, 'pushforward', mapSourceUnitVariableId(map), targetGeometry.dim, '1', {
        cohomologyDegree: 2 * targetGeometry.dim,
        sourceKey: ''
      });
      rules.push({
        id: `default-point-source-pushforward-${map.id}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [variableId]: 1 } },
        rhs: [{ coefficient: '1', powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS, targetGeometry)]: 1 } }]
      });
    }
    if (targetGeometry.type === 'point') {
      const sourcePointId = homologyVariableId(HOMOLOGY_POINT_CLASS, sourceGeometry);
      const sourcePoint = homologyClassDefById(sourceGeometry, HOMOLOGY_POINT_CLASS);
      defineVariable(sourcePointId, sourceGeometry.dim, sourcePoint?.symbolLatex || '[p]', {
        cohomologyDegree: sourcePoint?.cohomologyDegree ?? 2 * sourceGeometry.dim
      });
      const variableId = defineMapHomologyVariable(map, 'pushforward', sourcePointId, 0, sourcePoint?.symbolLatex || '[p]', {
        cohomologyDegree: 0,
        sourceKey: monoKey({ [sourcePointId]: 1 })
      });
      rules.push({
        id: `default-point-target-pushforward-${map.id}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [variableId]: 1 } },
        rhs: [{ coefficient: '1', powers: {} }]
      });
    }
    return rules;
  }

  function defaultProjectionPullbackRules(map, productGeometry = geometryByVarietyId(map?.domainId)) {
    const context = projectionMapContext(map);
    if (!context || context.productGeometry.varietyId !== productGeometry?.varietyId) return [];
    const rules = [];
    const sourceDefs = homologyPullbackClassDefinitionsForMap(context.factorGeometry);
    for (const sourceDef of sourceDefs) {
      const sourceKey = Object.prototype.hasOwnProperty.call(sourceDef, 'sourceKey')
        ? sourceDef.sourceKey
        : monoKey({ [homologyDefVariableId(sourceDef, context.factorGeometry)]: 1 });
      const targetDef = mapOperationHomologyClassDefinition(map, 'pullback', sourceDef, context.productGeometry);
      if (!targetDef) continue;
      const rhs = context.factorIndex === 0
        ? productBoxPolyForKeys(context.productGeometry, sourceKey, '')
        : productBoxPolyForKeys(context.productGeometry, '', sourceKey);
      if (rhs.isZero()) continue;
      rules.push({
        id: `default-projection-pullback-${map.id}-${hashString(sourceKey)}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [homologyDefVariableId(targetDef, context.productGeometry)]: 1 } },
        rhs: serializeHomologyPoly(rhs)
      });
    }
    return rules;
  }

  function defaultProjectionPushforwardRules(map, targetGeometry = geometryByVarietyId(map?.codomainId)) {
    const context = projectionMapContext(map);
    if (!context || context.factorGeometry.varietyId !== targetGeometry?.varietyId) return [];
    const rules = [];
    defineBaseHomologyVariables(context.productGeometry);
    defineBaseHomologyVariables(context.factorGeometry);
    for (const sourceDef of homologyMonomialClassDefinitionsForMap(context.productGeometry)) {
      if (!sourceDef.productBox) continue;
      const targetDef = mapOperationHomologyClassDefinition(map, 'pushforward', sourceDef, context.factorGeometry);
      if (!targetDef) continue;
      const rhs = projectionPushforwardProductBoxRhs(context, sourceDef.productBox);
      if (!rhs) continue;
      rules.push({
        id: `default-projection-pushforward-${map.id}-${hashString(productBoxSignature(sourceDef.productBox))}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [homologyDefVariableId(targetDef, context.factorGeometry)]: 1 } },
        rhs: serializeHomologyPoly(rhs)
      });
    }
    const pointRule = defaultProjectionPointPushforwardRule(map, context);
    if (pointRule) rules.push(pointRule);
    return rules;
  }

  function defaultProjectionPointPushforwardRule(map, context) {
    const sourcePoint = homologyClassDefById(context.productGeometry, HOMOLOGY_POINT_CLASS);
    const targetPoint = homologyClassDefById(context.factorGeometry, HOMOLOGY_POINT_CLASS);
    if (!sourcePoint || !targetPoint) return null;
    const targetDef = mapOperationHomologyClassDefinition(map, 'pushforward', sourcePoint, context.factorGeometry);
    if (!targetDef) return null;
    return {
      id: `default-projection-point-pushforward-${map.id}`,
      builtin: true,
      enabled: true,
      lhs: { powers: { [homologyDefVariableId(targetDef, context.factorGeometry)]: 1 } },
      rhs: [{ coefficient: '1', powers: { [homologyDefVariableId(targetPoint, context.factorGeometry)]: 1 } }]
    };
  }

  function defaultAbelJacobiPullbackRules(map, curveGeometry = geometryByVarietyId(map?.domainId)) {
    const context = abelJacobiMapContext(map);
    if (!context || context.curveGeometry.varietyId !== curveGeometry?.varietyId) return [];
    const genus = jacobianCurveGenus(context.jacobianGeometry) || curveSmallNumericGenus(context.curveGeometry);
    if (!genus) return [];
    const rules = defaultAbelJacobiSymplecticPullbackRules(map, context, genus);
    const thetaDef = homologyClassDefById(context.jacobianGeometry, HOMOLOGY_THETA_CLASS);
    const pointDef = homologyClassDefById(context.curveGeometry, HOMOLOGY_POINT_CLASS);
    if (!thetaDef || !pointDef) return rules;
    const targetDef = mapOperationHomologyClassDefinition(map, 'pullback', thetaDef, context.curveGeometry);
    if (!targetDef) return rules;
    rules.push({
      id: `default-abel-jacobi-theta-pullback-${map.id}`,
      builtin: true,
      enabled: true,
      lhs: { powers: { [homologyDefVariableId(targetDef, context.curveGeometry)]: 1 } },
      rhs: [{ coefficient: String(genus), powers: { [homologyDefVariableId(pointDef, context.curveGeometry)]: 1 } }]
    });
    return rules;
  }

  function defaultAbelJacobiSymplecticPullbackRules(map, context, genus) {
    const rules = [];
    for (let index = 1; index <= genus; index += 1) {
      ['a', 'b'].forEach((kind) => {
        const classId = curveSymplecticClassId(kind, index);
        const sourceDef = homologyClassDefById(context.jacobianGeometry, classId);
        const curveDef = homologyClassDefById(context.curveGeometry, classId);
        if (!sourceDef || !curveDef) return;
        const targetDef = mapOperationHomologyClassDefinition(map, 'pullback', sourceDef, context.curveGeometry);
        if (!targetDef) return;
        rules.push({
          id: `default-abel-jacobi-${kind}${index}-pullback-${map.id}`,
          builtin: true,
          enabled: true,
          lhs: { powers: { [homologyDefVariableId(targetDef, context.curveGeometry)]: 1 } },
          rhs: [{ coefficient: '1', powers: { [homologyDefVariableId(curveDef, context.curveGeometry)]: 1 } }]
        });
      });
    }
    return rules;
  }

  function defaultAbelJacobiPushforwardRules(map, jacobianGeometry = geometryByVarietyId(map?.codomainId)) {
    const context = abelJacobiMapContext(map);
    if (!context || context.jacobianGeometry.varietyId !== jacobianGeometry?.varietyId) return [];
    const genus = jacobianCurveGenus(context.jacobianGeometry) || curveSmallNumericGenus(context.curveGeometry);
    if (!genus) return [];
    const rules = [];
    defineBaseHomologyVariables(context.curveGeometry);
    defineBaseHomologyVariables(context.jacobianGeometry);
    for (const mono of homologyMonomialDefinitions(context.curveGeometry)) {
      const targetDef = mapPushforwardMonomialClassDefinition(map, mono, context.curveGeometry, context.jacobianGeometry);
      if (!targetDef) continue;
      const rhs = abelJacobiPushforwardSourceKey(map, mono.key, context.jacobianGeometry);
      if (!rhs) continue;
      rules.push({
        id: `default-abel-jacobi-pushforward-${map.id}-${hashString(mono.key || 'unit')}`,
        builtin: true,
        enabled: true,
        lhs: { powers: { [homologyDefVariableId(targetDef, context.jacobianGeometry)]: 1 } },
        rhs: serializeHomologyPoly(rhs)
      });
    }
    return rules;
  }

  function abelJacobiCurveClassPoly(jacobianGeometry, genus) {
    const thetaDef = homologyClassDefById(jacobianGeometry, HOMOLOGY_THETA_CLASS);
    if (!thetaDef) return null;
    const thetaId = homologyDefVariableId(thetaDef, jacobianGeometry);
    return polyPower(Poly.variable(thetaId), genus - 1, jacobianGeometry.dim)
      .scale(fraction(1, factorialBigInt(genus - 1)))
      .truncate(jacobianGeometry.dim);
  }

  function ensureAbelJacobiKnownHomologyRules(map) {
    const context = abelJacobiMapContext(map);
    if (!context) return false;
    const rules = [
      ...defaultAbelJacobiPullbackRules(map, context.curveGeometry),
      ...defaultAbelJacobiPushforwardRules(map, context.jacobianGeometry)
    ];
    if (!rules.length) return false;
    let changed = false;
    rules.forEach((rule) => {
      const variableId = Object.keys(rule.lhs?.powers || {})[0];
      if (!variableId) return;
      const mapVariable = VARS.get(variableId) || ensureMapHomologyVariableFromId(variableId);
      const geometry = mapVariable?.operation === 'pushforward' ? context.jacobianGeometry : context.curveGeometry;
      const variety = geometry.varietyId === context.curveGeometry.varietyId ? context.curve : context.jacobian;
      const homology = ensureHomologySystem(variety, geometry);
      const existing = mapHomologyRuleForVariable(homology.rules, variableId, { includeBuiltin: true });
      if (existing && !existing.builtin && existing.automatic !== 'abel-jacobi') return;
      const stored = { ...rule, builtin: true, automatic: 'abel-jacobi' };
      if (!existing || serializeHomologyRuleTerms(existing.rhs || []) !== serializeHomologyRuleTerms(stored.rhs || []) || existing.enabled === false) {
        homology.rules = withoutHomologyRuleForVariable(homology.rules, variableId, { includeBuiltin: true });
        homology.rules.push(stored);
        changed = true;
      }
    });
    return changed;
  }

  function projectionPushforwardProductBoxRhs(context, productBox) {
    const keptKey = context.factorIndex === 0 ? productBox.leftKey : productBox.rightKey;
    const fiberKey = context.factorIndex === 0 ? productBox.rightKey : productBox.leftKey;
    const keptGeometry = context.factorGeometry;
    const fiberGeometry = context.otherGeometry;
    const fiberPoly = applyHomologyRules(polyFromPowers(parseMonoKey(fiberKey || '')), {
      geometry: fiberGeometry,
      homology: fiberGeometry.homology,
      expandNestedMaps: false,
      simplifyProductBoxes: false,
      includeDefaultMapRules: false,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
    const integral = integrateTopHomologyClass(fiberPoly, fiberGeometry);
    if (integral == null) return null;
    if (integral.isZero()) return Poly.zero();
    const keptPoly = applyHomologyRules(polyFromPowers(parseMonoKey(keptKey || '')), {
      geometry: keptGeometry,
      homology: keptGeometry.homology,
      expandNestedMaps: false,
      simplifyProductBoxes: false,
      includeDefaultMapRules: false,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
    return keptPoly.scale(integral).truncate(keptGeometry.dim);
  }

  function integrateTopHomologyClass(poly, geometry) {
    poly = Poly.from(poly);
    if (poly.isZero()) return Fraction.zero();
    if (!Number.isInteger(geometry?.dim)) return null;
    if (geometry.dim === 0) {
      return poly.terms.size === 1 && poly.terms.has('') ? poly.terms.get('') : null;
    }
    const pointKey = monoKey({ [homologyVariableId(HOMOLOGY_POINT_CLASS, geometry)]: 1 });
    let total = Fraction.zero();
    for (const [key, coeff] of poly.terms) {
      if (key !== pointKey) {
        if (monoDegree(key) === geometry.dim) return null;
        continue;
      }
      total = total.add(coeff);
    }
    return total;
  }

  function projectionMapContext(map) {
    if (!map || map.construction?.type !== 'projection' || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const productGeometry = geometryByVarietyId(map.domainId);
    const factorGeometry = geometryByVarietyId(map.codomainId);
    const productContext = productGeometryContext(productGeometry);
    if (!productContext || !factorGeometry) return null;
    const constructionIndex = normalizedInt(map.construction.factorIndex, 0, 1, 0);
    const matchedIndex = productContext.factorIds[constructionIndex] === map.codomainId
      ? constructionIndex
      : productContext.factorIds.findIndex((id) => id === map.codomainId);
    const factorIndex = matchedIndex === 1 ? 1 : 0;
    const expectedGeometry = factorIndex === 0 ? productContext.leftGeometry : productContext.rightGeometry;
    const otherGeometry = factorIndex === 0 ? productContext.rightGeometry : productContext.leftGeometry;
    if (expectedGeometry?.varietyId && factorGeometry.varietyId && expectedGeometry.varietyId !== factorGeometry.varietyId) return null;
    return {
      map,
      productGeometry,
      factorGeometry,
      otherGeometry,
      factorIndex,
      productContext
    };
  }

  function abelJacobiMapContext(map) {
    if (!map || map.construction?.type !== 'abel-jacobi' || map.domainKind !== 'variety' || map.codomainKind !== 'variety') return null;
    const curve = state.varieties.find((item) => item.id === (map.construction.curveId || map.domainId));
    const jacobian = state.varieties.find((item) => item.id === (map.construction.jacobianId || map.codomainId));
    if (!curve || !jacobian) return null;
    const curveGeometry = geometryFromVariety(curve);
    const jacobianGeometry = geometryFromVariety(jacobian);
    if (!geometryHasNumericalCurveLabel(curveGeometry) || !geometryHasThetaClass(jacobianGeometry)) return null;
    return { map, curve, jacobian, curveGeometry, jacobianGeometry };
  }

  function uniqueHomologyRulesByLhs(rules) {
    const seen = new Set();
    const out = [];
    for (const rule of rules || []) {
      const key = monoKey(rule?.lhs?.powers || {});
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(rule);
    }
    return out;
  }

  function homologyRuleHasSameLhs(left, right) {
    return monoKey(left?.lhs?.powers || {}) === monoKey(right?.lhs?.powers || {});
  }

  function homologyRulePreservesDegree(rule, defs, options = {}) {
    const lhsDegree = homologyPowersDegree(rule.lhs?.powers || {}, defs, options);
    if (lhsDegree == null || lhsDegree < 0 || !Object.keys(rule.lhs?.powers || {}).length) return false;
    const lhsCohomologyDegree = homologyPowersCohomologyDegree(rule.lhs?.powers || {}, defs, options);
    if (lhsCohomologyDegree == null) return false;
    const productContext = productGeometryContext(options.geometry);
    const lhsProductBidegree = productContext
      ? homologyPowersProductBidegree(rule.lhs?.powers || {}, defs, { ...options, productContext })
      : null;
    const rhs = homologyRuleRhsPoly(rule);
    if (rhs.isZero()) return true;
    return sortedTerms(rhs).every(([key]) => {
      const powers = parseMonoKey(key);
      return homologyPowersDegree(powers, defs, options) === lhsDegree
        && homologyPowersCohomologyDegree(powers, defs, options) === lhsCohomologyDegree
        && (!lhsProductBidegree || productBidegreesEqual(
          homologyPowersProductBidegree(powers, defs, { ...options, productContext }),
          lhsProductBidegree
        ));
    });
  }

  function homologyRuleUsesAvailableVariables(rule, availableIds, options = {}) {
    const resolveMapVariables = options.resolveMapVariables !== false;
    const allTerms = [rule.lhs || {}, ...(rule.rhs || [])];
    return allTerms.every((term) => Object.keys(term.powers || {}).every((id) => (
      availableIds.has(id)
      || (resolveMapVariables && (mapHomologyVariableIsDefined(id) || !!ensureMapHomologyVariableFromId(id)))
    )));
  }

  function homologyRuleContainsVariable(rule, variableId) {
    const allTerms = [rule?.lhs || {}, ...(rule?.rhs || [])];
    return allTerms.some((term) => Object.prototype.hasOwnProperty.call(term.powers || {}, variableId));
  }

  function validateHomologyRuleInput(rule, geometry) {
    if (!rule || !geometry) return '';
    const existingRules = (geometry.homology?.rules || []).filter((existing) => (
      existing.enabled !== false
      && !homologyRuleHasSameLhs(existing, rule)
    ));
    if (!existingRules.length) return '';
    const lhsKey = monoKey(rule.lhs?.powers || {});
    const lhsMessage = homologyMonomialReductionWarning(geometry, lhsKey, existingRules, 'left');
    if (lhsMessage) return lhsMessage;
    const reducible = (rule.rhs || []).find((term) => {
      const key = monoKey(term.powers || {});
      return key && !homologyMonomialIsRuleNormalForm(geometry, key, existingRules);
    });
    if (!reducible) return '';
    return homologyMonomialReductionWarning(geometry, monoKey(reducible.powers || {}), existingRules, 'right');
  }

  function homologyMonomialReductionWarning(geometry, key, rules = null, side = 'right') {
    if (!key || homologyMonomialIsRuleNormalForm(geometry, key, rules)) return '';
    const activeRules = rules || (geometry?.homology?.rules || []).filter((rule) => rule.enabled !== false);
    const simplified = applyHomologyRules(polyFromPowers(parseMonoKey(key)), {
      geometry,
      homology: { ...(geometry?.homology || {}), rules: activeRules },
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
    const from = monomialPlain(key) || '1';
    const to = formatPolyPlain(simplified);
    return side === 'left'
      ? `${from} is already determined as ${to}. Choose an undetermined expression to assign.`
      : `${from} is already determined as ${to}. Use the simplified expression instead.`;
  }

  function homologyMonomialIsRuleNormalForm(geometry, key, rules = null) {
    if (!key) return true;
    const activeRules = rules || (geometry?.homology?.rules || []).filter((rule) => rule.enabled !== false);
    if (!activeRules.length) return true;
    const original = polyFromPowers(parseMonoKey(key));
    const simplified = applyHomologyRules(original, {
      geometry,
      homology: { ...(geometry?.homology || {}), rules: activeRules },
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
    return polyEquals(original, simplified);
  }

  function homologyPowersDegree(powers, defs, options = {}) {
    const resolveMapVariables = options.resolveMapVariables !== false;
    let degree = 0;
    for (const [id, exp] of Object.entries(powers || {})) {
      const def = defs.find((entry) => homologyDefVariableIds(entry, options.geometry).has(id));
      const fallback = !def && resolveMapVariables
        ? (VARS.get(id) || ensureMapHomologyVariableFromId(id))
        : null;
      if (!def && !fallback) return null;
      degree += (def ? def.degree : fallback.degree) * (Number(exp) || 0);
    }
    return degree;
  }

  function homologyPowersCohomologyDegree(powers, defs, options = {}) {
    const resolveMapVariables = options.resolveMapVariables !== false;
    let degree = 0;
    for (const [id, exp] of Object.entries(powers || {})) {
      const def = defs.find((entry) => homologyDefVariableIds(entry, options.geometry).has(id));
      const fallback = !def && resolveMapVariables
        ? (VARS.get(id) || ensureMapHomologyVariableFromId(id))
        : null;
      if (!def && !fallback) return null;
      degree += (def ? def.cohomologyDegree : fallback.cohomologyDegree ?? Math.round(2 * fallback.degree)) * (Number(exp) || 0);
    }
    return degree;
  }

  function homologyPowersProductBidegree(powers, defs, options = {}) {
    const context = options.productContext || productGeometryContext(options.geometry);
    if (!context) return null;
    let total = [0, 0];
    for (const [id, exp] of Object.entries(powers || {})) {
      const def = defs.find((entry) => homologyDefVariableIds(entry, options.geometry).has(id));
      const bidegree = def
        ? productHomologyBidegreeForDef(def, options.geometry, context)
        : productHomologyBidegreeForVariable(id, options.geometry, context);
      if (!bidegree) return null;
      const exponent = Number(exp) || 0;
      total = [
        total[0] + bidegree[0] * exponent,
        total[1] + bidegree[1] * exponent
      ];
    }
    return productBidegreeFits(context, total) ? total : null;
  }

  function homologyClassIsOdd(defOrData) {
    const degree = defOrData?.cohomologyDegree ?? (Number.isFinite(defOrData?.degree) ? Math.round(2 * defOrData.degree) : 0);
    return Math.abs(degree % 2) === 1;
  }

  function mapHomologyVariableIsDefined(id) {
    return String(id || '').startsWith('map_') && (VARS.has(id) || !!ensureMapHomologyVariableFromId(id));
  }

  function monomialFactorCount(powers, factorPowers) {
    const entries = Object.entries(factorPowers || {});
    if (!entries.length) return 0;
    let count = Infinity;
    for (const [id, exp] of entries) {
      const exponent = Number(exp) || 0;
      if (exponent <= 0) return 0;
      count = Math.min(count, Math.floor((powers[id] || 0) / exponent));
    }
    return Number.isFinite(count) ? count : 0;
  }

  function removeMonomialFactor(powers, factorPowers, count) {
    const factorization = gradedMonomialFactorization(powers, factorPowers, count);
    if (!factorization) return null;
    return {
      remainder: polyFromPowers(factorization.remainderPowers),
      sign: factorization.sign
    };
  }

  function gradedMonomialFactorization(powers, factorPowers, count = 1) {
    const repeatedFactorPowers = {};
    for (const [id, exp] of Object.entries(factorPowers || {})) {
      const exponent = (Number(exp) || 0) * count;
      if (exponent > 0) repeatedFactorPowers[id] = exponent;
    }
    if (!Object.keys(repeatedFactorPowers).length) return null;
    const remainderPowers = { ...powers };
    for (const [id, exp] of Object.entries(repeatedFactorPowers)) {
      remainderPowers[id] = (remainderPowers[id] || 0) - exp;
      if (remainderPowers[id] < 0) return null;
      if (remainderPowers[id] === 0) delete remainderPowers[id];
    }
    const product = multiplyMonomialPowers(repeatedFactorPowers, remainderPowers);
    if (!product) return null;
    return {
      remainderPowers,
      sign: product.sign
    };
  }

  function polyPower(poly, exponent, maxDegree) {
    let out = Poly.one();
    for (let i = 0; i < exponent; i++) out = out.mul(poly, maxDegree);
    return out;
  }

  function coefficientLatexPlain(total, degree) {
    return {
      latex: `\\left[${total.latex}\\right]_{${degree}}`,
      plain: `degree_${degree}(${total.plain})`
    };
  }

  function rootDegreeZeroTerms(rankLatex, rankPlain) {
    return {
      chern: { latex: '1', plain: '1' },
      character: { latex: rankLatex, plain: rankPlain },
      todd: { latex: '1', plain: '1' },
      segre: { latex: '1', plain: '1' },
      sqrtTodd: { latex: '1', plain: '1' }
    };
  }

  function rootCharacterTerm(degree, rankLatex, rankPlain) {
    const denom = factorialBigInt(degree).toString();
    const powerLatex = degree === 1 ? '\\alpha_j' : `\\alpha_j^{${degree}}`;
    const powerPlain = degree === 1 ? 'alpha_j' : `alpha_j^${degree}`;
    const sumLatex = `\\sum_{j=1}^{${rankLatex}} ${powerLatex}`;
    const sumPlain = `sum_{j=1}^${rankPlain} ${powerPlain}`;
    if (denom === '1') return { latex: sumLatex, plain: sumPlain };
    return {
      latex: `\\frac{1}{${denom}}${sumLatex}`,
      plain: `1/${denom}*${sumPlain}`
    };
  }

  function buildConstructedSheafBundle(geometry, sheaf, options = {}) {
    const construction = sheaf.construction || {};
    if (construction.type === 'trivial-bundle') {
      const rank = sanitizeRankInput(construction.rank || sheaf.rankPlain || sheaf.rank);
      return buildTrivialBundle(geometry.dim, rank, sheaf.labelLatex, sheaf.labelPlain);
    }
    if (construction.type === 'ses-term') {
      const inferred = buildSesTermBundle(geometry, sheaf, construction);
      if (inferred) return inferred;
      return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
    }
    if (construction.type === 'direct-sum' || construction.type === 'tensor') {
      const [leftObject, rightObject] = (construction.sheafIds || []).map((id) => state.sheaves.find((item) => item.id === id));
      if (!leftObject || !rightObject) return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      const left = buildSourceSheafBundle(geometry, leftObject);
      const right = buildSourceSheafBundle(geometry, rightObject);
      return construction.type === 'direct-sum'
        ? buildDirectSumBundle(geometry.dim, sheaf, left, right)
        : buildTensorBundle(geometry.dim, sheaf, left, right);
    }
    if (construction.type === 'self-direct-sum') {
      const parentObject = state.sheaves.find((item) => item.id === construction.sheafId);
      if (!parentObject) return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      const parent = buildSourceSheafBundle(geometry, parentObject);
      return buildSelfDirectSumBundle(geometry.dim, sheaf, parent, construction.multiplicity);
    }
    if (construction.type === 'schur') {
      const parentObject = state.sheaves.find((item) => item.id === construction.sheafId);
      const partition = normalizeSchurPartition(construction.partition);
      if (!parentObject || !partition) return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      const parent = buildSourceSheafBundle(geometry, parentObject);
      return buildSchurBundle(geometry.dim, sheaf, parent, partition);
    }
    if (construction.type === 'pullback' || construction.type === 'pushforward') {
      if (construction.type === 'pullback') {
        const pulled = buildPullbackSheafBundle(geometry, sheaf, construction, options);
        if (pulled) return pulled;
      } else {
        const pushed = buildPushforwardSheafBundle(geometry, sheaf, construction, options);
        if (pushed) return pushed;
      }
      return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, {
        ...options,
        variablePrefix: constructionVariablePrefix(sheaf.sourceObject || sheaf, construction.type),
        chernSubjectLatex: sheaf.labelLatex,
        characterSubjectLatex: sheaf.labelLatex
      });
    }
    return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildSourceSheafBundle(geometry, sheafObject) {
    const source = sheafFromObject(sheafObject, geometry);
    const bundle = buildBundleForSheaf(geometry, source);
    return applyStoredSheafHomologyRulesToSourceBundle(bundle, geometry, source);
  }

  function applyStoredSheafHomologyRulesToSourceBundle(bundle, geometry, sheaf) {
    if (!sheafUsesFreeClassVariables(sheaf) || !sheaf?.sourceObject) return bundle;
    const homology = ensureSheafHomologySystem(sheaf.sourceObject, geometry);
    if (!homology.rules?.length) return bundle;
    const ruleGeometry = sheafHomologyGeometry(sheaf, geometry);
    return applySheafHomologyRulesToBundle(bundle, geometry.dim, {
      geometry: ruleGeometry,
      homology: ruleGeometry.homology,
      sheaf,
      baseGeometry: geometry,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
  }

  function buildSesTermBundle(geometry, sheaf, construction) {
    const sequence = sesSequenceForTermSheaf(sheaf);
    const terms = sesTermSheaves(sequence);
    const missingIndex = terms.findIndex((term) => term?.id === sheaf.sourceObject?.id);
    if (missingIndex < 0) return null;
    const bundles = terms.map((term, index) => (
      index === missingIndex || !term ? null : buildSourceSheafBundle(geometry, term)
    ));
    const known = bundles.filter(Boolean);
    if (known.length !== 2) return null;
    const d = geometry.dim;
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i += 1) {
      if (missingIndex === 0) {
        chComps[i] = componentOrZero(bundles[1].chComps, i).sub(componentOrZero(bundles[2].chComps, i));
      } else if (missingIndex === 1) {
        chComps[i] = componentOrZero(bundles[0].chComps, i).add(componentOrZero(bundles[2].chComps, i));
      } else {
        chComps[i] = componentOrZero(bundles[1].chComps, i).sub(componentOrZero(bundles[0].chComps, i));
      }
    }
    const rankLatex = sesRankLatexFromBundles(bundles, missingIndex, sheaf.rankLatex);
    const rankPlain = sesRankPlainFromBundles(bundles, missingIndex, sheaf.rankPlain);
    return buildBundleFromCh(chComps, rankLatex, rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function sesSequenceForTermSheaf(sheaf) {
    const source = sheaf?.sourceObject || sheaf;
    return (state.sequences || []).find((sequence) => (
      sequence.type === 'short-exact-sequence'
      && (sequence.sheafIds || []).includes(source?.id)
    )) || null;
  }

  function sesTermSheaves(sequence) {
    return (sequence?.sheafIds || []).slice(0, 3).map((id) => state.sheaves.find((item) => item.id === id) || null);
  }

  function sesRankLatexFromBundles(bundles, missingIndex, fallback) {
    return sesRankDisplayFromBundles(bundles, missingIndex, 'rankLatex', fallback || 'r');
  }

  function sesRankPlainFromBundles(bundles, missingIndex, fallback) {
    return sesRankDisplayFromBundles(bundles, missingIndex, 'rankPlain', fallback || 'r');
  }

  function sesRankDisplayFromBundles(bundles, missingIndex, key, fallback) {
    const left = bundles[0]?.[key] || null;
    const middle = bundles[1]?.[key] || null;
    const right = bundles[2]?.[key] || null;
    if (missingIndex === 0 && middle && right) return rankDifferenceDisplay(middle, right, key === 'rankLatex', fallback);
    if (missingIndex === 1 && left && right) return rankSumDisplay(left, right, key === 'rankLatex');
    if (missingIndex === 2 && middle && left) return rankDifferenceDisplay(middle, left, key === 'rankLatex', fallback);
    return fallback;
  }

  function rankSumDisplay(left, right, latex = true) {
    const text = `${left || '0'}+${right || '0'}`;
    return latex ? simplifyScalarExpressionLatex(text) : simplifyScalarExpressionPlain(text);
  }

  function rankDifferenceDisplay(left, right, latex = true, fallback = 'r') {
    if (!left || !right) return fallback;
    const text = `${left}-${right}`;
    return latex ? simplifyScalarExpressionLatex(text) : simplifyScalarExpressionPlain(text);
  }

  function rankDisplayTerm(value, latex = true) {
    const rank = String(value || 'r');
    if (!latex) return `(${rank})`;
    return /^[A-Za-z0-9_{}\\^]+$/.test(rank) ? rank : `\\left(${rank}\\right)`;
  }

  function buildPullbackSheafBundle(geometry, sheaf, construction) {
    const map = state.maps.find((item) => item.id === construction.mapId);
    const sourceSheaf = state.sheaves.find((item) => item.id === construction.sheafId);
    const codomain = state.varieties.find((item) => item.id === map?.codomainId);
    if (!map || !sourceSheaf || !codomain) return null;
    const codomainGeometry = geometryFromVariety(codomain);
    defineBaseHomologyVariables(codomainGeometry);
    const sourceBundle = buildSourceSheafBundle(codomainGeometry, sourceSheaf);
    const chComps = pullbackComponentArray(sourceBundle.chComps, geometry.dim, map);
    defineHomologyVariables(geometry);
    return buildBundleFromCh(chComps, sourceBundle.rankLatex, sourceBundle.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildPushforwardSheafBundle(geometry, sheaf, construction) {
    const map = state.maps.find((item) => item.id === construction.mapId);
    const sourceSheaf = state.sheaves.find((item) => item.id === construction.sheafId);
    const domain = state.varieties.find((item) => item.id === map?.domainId);
    if (!map || !sourceSheaf || !domain) return null;
    const domainGeometry = geometryFromVariety(domain);
    defineBaseHomologyVariables(domainGeometry);
    const sourceBundle = buildSourceSheafBundle(domainGeometry, sourceSheaf);
    const sourceTangent = buildTangentClassBundle(domainGeometry);
    const sourceChTotal = bundleChernCharacterTotal(sourceBundle, domainGeometry.dim, 'pushSourceRank');
    const grrSource = sourceChTotal.mul(sourceTangent.todd, domainGeometry.dim);
    const pushedTotal = pushforwardPolynomialByDegree(map, grrSource, domainGeometry.dim, geometry.dim, construction);
    defineHomologyVariables(geometry);
    const targetTangent = buildTangentClassBundle(geometry);
    const targetChTotal = pushedTotal.mul(inverseUnit(targetTangent.todd, geometry.dim), geometry.dim);
    const chComps = zeroComponentArray(geometry.dim);
    for (let i = 1; i <= geometry.dim; i += 1) chComps[i] = homogeneousPart(targetChTotal, i);
    const rankPoly = homogeneousPart(targetChTotal, 0);
    const rankDisplayOptions = {
      geometry,
      homology: geometry.homology || null,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    };
    const reducedRankPoly = applyHomologyRules(rankPoly, rankDisplayOptions);
    const rankLatex = reducedRankPoly.isZero() ? '0' : formatPolyLatex(reducedRankPoly);
    const rankPlain = reducedRankPoly.isZero() ? '0' : formatPolyPlain(reducedRankPoly);
    return buildBundleFromCh(chComps, rankLatex, rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildTangentClassBundle(geometry) {
    const labelLatex = `\\mathcal{T}_{${geometry.labelLatex}}`;
    return buildBundleForSheaf(geometry, {
      type: 'tangent',
      basis: 'character',
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      rankLatex: String(geometry.dim),
      rankPlain: String(geometry.dim)
    });
  }

  function bundleChernCharacterTotal(bundle, d, idSeed) {
    return rankAsDegreeZeroPoly(bundle, idSeed).add(positiveTotal(bundle.chComps, d));
  }

  function pullbackComponentArray(comps, d, map) {
    const out = zeroComponentArray(d);
    const limit = Math.min(d, (comps?.length || 1) - 1);
    for (let i = 1; i <= limit; i += 1) out[i] = pullbackPolynomial(comps[i], map).truncate(d);
    return out;
  }

  function pullbackPolynomial(poly, map) {
    return remapPolynomialVariables(poly, (id) => pullbackVariableId(map, id));
  }

  function pullbackVariableId(map, id) {
    const data = VARS.get(id) || ensureMapHomologyVariableFromId(id) || { degree: 1, latex: id };
    return defineMapHomologyVariable(map, 'pullback', id, data.degree, data.latex || id);
  }

  function pushforwardPolynomialByDegree(map, poly, sourceDim, targetDim, construction) {
    let out = Poly.zero();
    const degreeShift = targetDim - sourceDim;
    const sourceGeometry = geometryByVarietyId(map?.domainId);
    const targetGeometry = geometryByVarietyId(map?.codomainId);
    if (sourceGeometry) defineHomologyVariables(sourceGeometry);
    if (targetGeometry) defineHomologyVariables(targetGeometry);
    for (const [key, coeff] of Poly.from(poly).terms) {
      const sourceDegree = monoDegree(key);
      if (sourceDegree < 0 || sourceDegree > sourceDim) continue;
      const targetDegree = sourceDegree + degreeShift;
      if (targetDegree < 0 || targetDegree > targetDim) continue;
      const projected = projectionFormulaPushforwardSourceKey(map, key, sourceDim, targetDim, construction);
      if (projected) {
        out = out.add(projected.scale(coeff));
        continue;
      }
      const id = pushforwardTermVariableId(map, key, targetDegree, construction);
      out = out.add(Poly.variable(id).scale(coeff));
    }
    return out.truncate(targetDim);
  }

  function projectionFormulaPushforwardSourceKey(map, sourceKey, sourceDim, targetDim, construction = {}) {
    const split = splitProjectionFormulaPullbacks(map, sourceKey);
    if (!split) return null;
    const degreeShift = targetDim - sourceDim;
    const remainingDegree = monoDegree(split.remainingKey);
    const remainingTargetDegree = remainingDegree + degreeShift;
    if (remainingTargetDegree < 0 || remainingTargetDegree > targetDim) return null;
    const pushedId = pushforwardTermVariableId(map, split.remainingKey, remainingTargetDegree, construction);
    return split.codomainFactor.mul(Poly.variable(pushedId), targetDim).truncate(targetDim);
  }

  function abelJacobiPushforwardSourceKey(map, sourceKey, targetGeometry) {
    const context = abelJacobiMapContext(map);
    if (!context || context.jacobianGeometry.varietyId !== targetGeometry?.varietyId) return null;
    const genus = jacobianCurveGenus(context.jacobianGeometry) || curveSmallNumericGenus(context.curveGeometry);
    if (!genus) return null;
    const curveClass = abelJacobiCurveClassPoly(context.jacobianGeometry, genus);
    if (!curveClass) return null;
    const sourcePowers = parseMonoKey(sourceKey);
    const pointPushforward = abelJacobiPointPushforwardPoly(sourcePowers, context);
    if (pointPushforward) return pointPushforward;
    const lifted = abelJacobiCodomainFactorForCurvePowers(map, sourcePowers, context, genus);
    if (!lifted) return null;
    return lifted.factor.mul(curveClass, targetGeometry.dim).scale(lifted.coefficient).truncate(targetGeometry.dim);
  }

  function abelJacobiPointPushforwardPoly(sourcePowers, context) {
    const curvePointId = homologyVariableId(HOMOLOGY_POINT_CLASS, context.curveGeometry);
    if (monoKey(sourcePowers) !== monoKey({ [curvePointId]: 1 })) return null;
    const jacobianPointDef = homologyClassDefById(context.jacobianGeometry, HOMOLOGY_POINT_CLASS);
    return jacobianPointDef ? Poly.variable(homologyDefVariableId(jacobianPointDef, context.jacobianGeometry)) : null;
  }

  function abelJacobiCodomainFactorForCurvePowers(map, sourcePowers, context, genus) {
    const curveDefs = new Map(baseHomologyClassDefinitions(context.curveGeometry)
      .map((def) => [homologyDefVariableId(def, context.curveGeometry), def]));
    const codomainPowers = {};
    let coefficient = Fraction.one();
    for (const [id, exp] of Object.entries(sourcePowers || {})) {
      const exponent = Number(exp) || 0;
      if (exponent <= 0) continue;
      const pullbackSourcePowers = sameMapPullbackSourcePowers(map, id);
      if (pullbackSourcePowers) {
        for (const [sourceId, sourceExp] of Object.entries(pullbackSourcePowers)) {
          if (sourceExp <= 0) continue;
          const sourceData = homologyVariableDataById(context.jacobianGeometry, sourceId);
          if (!sourceData || sourceData.degree <= 0) continue;
          codomainPowers[sourceId] = (codomainPowers[sourceId] || 0) + sourceExp * exponent;
        }
        continue;
      }
      const def = curveDefs.get(id);
      if (!def || def.id === HOMOLOGY_UNIT_CLASS) continue;
      if (isCurveSymplecticClassId(def.id)) {
        const targetId = homologyVariableId(def.id, context.jacobianGeometry);
        codomainPowers[targetId] = (codomainPowers[targetId] || 0) + exponent;
        continue;
      }
      if (def.id === HOMOLOGY_POINT_CLASS) {
        const thetaId = homologyVariableId(HOMOLOGY_THETA_CLASS, context.jacobianGeometry);
        codomainPowers[thetaId] = (codomainPowers[thetaId] || 0) + exponent;
        coefficient = coefficient.mul(fraction(1, bigintPow(BigInt(genus), exponent)));
        continue;
      }
      return null;
    }
    return {
      factor: polyFromPowers(codomainPowers),
      coefficient
    };
  }

  function splitProjectionFormulaPullbacks(map, sourceKey) {
    const powers = flattenProjectionSourcePowers(parseMonoKey(sourceKey), { preservePullbacksForMap: map });
    const remaining = {};
    const codomainPowers = {};
    let moved = false;
    for (const [id, exp] of Object.entries(powers)) {
      const sourcePowers = sameMapPullbackSourcePowers(map, id);
      if (!sourcePowers) {
        remaining[id] = (remaining[id] || 0) + exp;
        continue;
      }
      moved = true;
      const sourceGeometry = geometryByVarietyId(map?.codomainId);
      const sourceUnitId = homologyVariableId(HOMOLOGY_UNIT_CLASS, sourceGeometry);
      for (const [sourceId, sourceExp] of Object.entries(sourcePowers)) {
        if (sourceId === sourceUnitId || legacyBaseHomologyClassId(sourceId) === HOMOLOGY_UNIT_CLASS) continue;
        codomainPowers[sourceId] = (codomainPowers[sourceId] || 0) + sourceExp * exp;
      }
    }
    if (!moved) return null;
    return {
      remainingKey: monoKey(remaining),
      codomainFactor: polyFromPowers(codomainPowers)
    };
  }

  function sameMapPullbackSourcePowers(map, id) {
    const data = VARS.get(id) || ensureMapHomologyVariableFromId(id);
    if (data?.kind !== 'mapHomology' || data.operation !== 'pullback') return null;
    if (!sameMapId(data.mapId, map?.id)) return null;
    if (data.sourceKey || data.sourceKey === '') return flattenProjectionSourcePowers(parseMonoKey(data.sourceKey));
    return parseMonoKey(monoKey({ [data.sourceId]: 1 }));
  }

  function flattenProjectionSourcePowers(powers, options = {}, seen = new Set()) {
    const out = {};
    for (const [id, exp] of Object.entries(powers || {})) {
      const exponent = Number(exp) || 0;
      if (exponent <= 0) continue;
      const data = VARS.get(id) || ensureMapHomologyVariableFromId(id);
      const preserveSameMapPullback = data?.kind === 'mapHomology'
        && data.operation === 'pullback'
        && options.preservePullbacksForMap
        && sameMapId(data.mapId, options.preservePullbacksForMap.id);
      const canFlatten = data?.kind === 'mapHomology'
        && (data.sourceKey || data.sourceKey === '')
        && !preserveSameMapPullback
        && !seen.has(id)
        && sourceKeyDegreeMatchesVariable(data, id);
      if (!canFlatten) {
        out[id] = (out[id] || 0) + exponent;
        continue;
      }
      const nested = flattenProjectionSourcePowers(parseMonoKey(data.sourceKey), options, new Set([...seen, id]));
      for (const [nestedId, nestedExp] of Object.entries(nested)) {
        out[nestedId] = (out[nestedId] || 0) + nestedExp * exponent;
      }
    }
    return out;
  }

  function sourceKeyDegreeMatchesVariable(data, id) {
    if (!data || !Number.isFinite(data.degree)) return false;
    return monoDegree(data.sourceKey) === data.degree;
  }

  function sameMapId(left, right) {
    return String(left || '') === String(right || '')
      || variableIdSafe(left || '') === variableIdSafe(right || '');
  }

  function pushforwardTermVariableId(map, sourceKey, targetDegree, construction) {
    if (!sourceKey) {
      return defineMapHomologyVariable(map, 'pushforward', mapSourceUnitVariableId(map), targetDegree, '1', {
        sourceKey: '',
        ...(Number.isInteger(construction?.cohomologyDegree) ? { cohomologyDegree: construction.cohomologyDegree } : {})
      });
    }
    const powers = parseMonoKey(sourceKey);
    const ids = Object.keys(powers);
    if (ids.length === 1 && powers[ids[0]] === 1) {
      const data = VARS.get(ids[0]) || ensureMapHomologyVariableFromId(ids[0]) || { latex: ids[0] };
      return defineMapHomologyVariable(map, 'pushforward', ids[0], targetDegree, data.latex || ids[0], { sourceKey });
    }
    const id = `${mapHomologyVariableId(map, 'pushforward', 'term')}_${hashString(sourceKey)}`;
    const operator = pushforwardClassOperatorLatex(map, construction);
    defineVariable(id, targetDegree, `${operator}\\left(${monomialLatex(sourceKey) || '1'}\\right)`, {
      cohomologyDegree: Number.isInteger(construction?.cohomologyDegree)
        ? construction.cohomologyDegree
        : Math.round(2 * targetDegree),
      kind: 'mapHomology',
      mapId: map?.id || null,
      operation: 'pushforward',
      sourceId: 'term',
      sourceKey
    });
    return id;
  }

  function pushforwardClassOperatorLatex(map, construction = {}) {
    return mapPushforwardOperatorLatex(map);
  }

  function mapSourceUnitVariableId(map) {
    return homologyVariableId(HOMOLOGY_UNIT_CLASS, geometryByVarietyId(map?.domainId));
  }

  function mapHomologyVariableId(map, operation, sourceId) {
    return `map_${operation}_${variableIdSafe(map?.id || 'f')}_${variableIdSafe(sourceId)}`;
  }

  function remapPolynomialVariables(poly, mapId) {
    poly = Poly.from(poly);
    const terms = new Map();
    for (const [key, coeff] of poly.terms) {
      const powers = {};
      for (const [id, exp] of Object.entries(parseMonoKey(key))) {
        const nextId = mapId(id);
        powers[nextId] = (powers[nextId] || 0) + exp;
      }
      const nextKey = monoKey(powers);
      const next = (terms.get(nextKey) || Fraction.zero()).add(coeff);
      if (next.isZero()) terms.delete(nextKey);
      else terms.set(nextKey, next);
    }
    return new Poly(terms);
  }

  function buildDirectSumBundle(d, sheaf, left, right) {
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      chComps[i] = componentOrZero(left.chComps, i).add(componentOrZero(right.chComps, i));
    }
    return buildBundleFromCh(chComps, rankSumLatex(left, right), rankSumPlain(left, right), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildSelfDirectSumBundle(d, sheaf, parent, multiplicity) {
    const n = normalizeSelfSumMultiplicity(multiplicity);
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      chComps[i] = componentOrZero(parent.chComps, i).scale(fraction(n));
    }
    return buildBundleFromCh(chComps, selfSumRankLatex(parent, n), selfSumRankPlain(parent, n), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildTensorBundle(d, sheaf, left, right) {
    const chComps = zeroComponentArray(d);
    const leftRank = rankAsDegreeZeroPoly(left, `${constructionSafeId(sheaf.labelPlain)}Left`);
    const rightRank = rankAsDegreeZeroPoly(right, `${constructionSafeId(sheaf.labelPlain)}Right`);
    for (let i = 1; i <= d; i++) {
      let term = componentOrZero(left.chComps, i).mul(rightRank, d)
        .add(componentOrZero(right.chComps, i).mul(leftRank, d));
      for (let j = 1; j < i; j += 1) {
        term = term.add(componentOrZero(left.chComps, j).mul(componentOrZero(right.chComps, i - j), d));
      }
      chComps[i] = term;
    }
    return buildBundleFromCh(chComps, rankProductLatex(left, right), rankProductPlain(left, right), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildSchurBundle(d, sheaf, parent, partition) {
    const rank = explicitRootRankFromPlain(parent.rankPlain);
    const parentName = parent.labelPlain || parent.labelLatex || 'E';
    if (rank != null && partition.length > rank) {
      throw new Error(`The Young diagram ${formatSchurPartitionInput(partition)} has more rows than rank ${rank}.`);
    }
    const rankContext = schurRankContext(partition, parent.rankLatex, parent.rankPlain, parentName);
    const chComps = schurChComponentsFromParentCharacter(partition, rankContext, parent.chComps, d);
    const rankValue = evaluateSymmetricPowerPolynomialAtRank(schurPowerSumPolynomial(partition), rankContext, d);
    const rankLatex = rankValue instanceof Fraction ? formatFractionLatex(rankValue) : formatPolyLatex(rankValue);
    const rankPlain = rankValue instanceof Fraction ? formatFractionPlain(rankValue) : formatPolyPlain(rankValue);
    return buildBundleFromCh(chComps, rankLatex, rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function schurChComponentsFromParentCharacter(partition, rankContext, parentChComps, d) {
    const chComps = zeroComponentArray(d);
    const schur = schurPowerSumPolynomial(partition);
    for (let n = 1; n <= d; n += 1) {
      let total = Poly.zero();
      for (const nu of integerPartitionCounts(n)) {
        const coeff = evaluateSymmetricPowerPolynomialAtRank(applyPowerSumDerivationPartition(schur, nu), rankContext, d);
        if (coefficientIsZero(coeff)) continue;
        let term = Poly.one();
        for (const [degreeText, count] of Object.entries(nu)) {
          const degree = Number(degreeText);
          if (!Number.isInteger(degree) || degree <= 0 || count <= 0) continue;
          const dividedPower = polyPower(componentOrZero(parentChComps, degree), count, d)
            .scale(fraction(1, factorialBigInt(count)));
          term = term.mul(dividedPower, d);
          if (term.isZero()) break;
        }
        total = total.add(multiplyByCoefficient(term, coeff, d));
      }
      chComps[n] = total.truncate(d);
    }
    return chComps;
  }

  function rankAsDegreeZeroPoly(bundle, idSeed) {
    const plain = String(bundle.rankPlain || '').trim();
    const poly = scalarExpressionPoly(plain || bundle.rankLatex || 'r');
    if (poly) return poly;
    const id = `rank${constructionSafeId(bundle.rankLatex || bundle.rankPlain || idSeed)}`;
    defineVariable(id, 0, bundle.rankLatex || plain || 'r');
    return Poly.variable(id);
  }

  function rankSumLatex(left, right) {
    return simplifyScalarExpressionLatex(`${left.rankPlain || '0'}+${right.rankPlain || '0'}`);
  }

  function rankSumPlain(left, right) {
    return simplifyScalarExpressionPlain(`${left.rankPlain || '0'}+${right.rankPlain || '0'}`);
  }

  function rankProductLatex(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) * Number(right.rankPlain));
    }
    return `${rankLatexTerm(left)}${rankLatexTerm(right)}`;
  }

  function rankProductPlain(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) * Number(right.rankPlain));
    }
    return `(${left.rankPlain || 'r'})*(${right.rankPlain || 's'})`;
  }

  function selfSumRankLatex(parent, multiplicity) {
    const rank = parent.rankLatex || parent.rankPlain || 'r';
    if (/^-?\d+$/.test(parent.rankPlain || '')) return String(Number(parent.rankPlain) * multiplicity);
    if (multiplicity === 1) return rank;
    return `${multiplicity}${rankLatexTerm(parent)}`;
  }

  function selfSumRankPlain(parent, multiplicity) {
    const rank = parent.rankPlain || 'r';
    if (/^-?\d+$/.test(rank)) return String(Number(rank) * multiplicity);
    if (multiplicity === 1) return rank;
    return `${multiplicity}*(${rank})`;
  }

  function rankLatexTerm(bundle) {
    const rank = bundle.rankLatex || bundle.rankPlain || 'r';
    return /^[A-Za-z0-9_{}\\^]+$/.test(rank) ? rank : `\\left(${rank}\\right)`;
  }

  function constructionVariablePrefix(object, role) {
    return `${role}${constructionSafeId(object?.id || object?.name || 'object')}_`;
  }

  function constructionSafeId(value) {
    return String(value || 'x').replace(/[^A-Za-z0-9]/g, '') || 'x';
  }

  function defaultSheafVariablePrefix(sheaf) {
    const source = sheaf?.sourceObject || sheaf;
    if (source?.id) return `sheaf_${variableIdSafe(source.id)}_`;
    const label = sheaf?.labelLatex || sheaf?.labelPlain || source?.name || 'draft';
    return `sheaf_draft_${hashString(label)}_`;
  }

  function variableIdSafe(value) {
    return String(value || 'x').replace(/[^A-Za-z0-9_]/g, '_') || 'x';
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function buildAbstractGeometrySheaf(geometry, sheaf, options = {}) {
    if (sheaf.type === 'tangent') {
      return buildAbstractTangentBundle(geometry, sheaf);
    }
    if (sheaf.type === 'cotangent') {
      return buildAbstractCotangentBundle(geometry, sheaf);
    }
    if (sheaf.type === 'canonical') {
      return buildAbstractCanonicalBundle(geometry, sheaf);
    }
    if (sheaf.type === 'twist') {
      throw new Error('O_X(r) requires a map to projective space.');
    }
    if (isUniversalBundleSheafType(sheaf.type)) {
      throw new Error('Universal bundle requires projective space or a Grassmannian.');
    }
    return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildAbstractTangentBundle(geometry, sheaf) {
    if (geometry.type === 'abelian' || geometry.type === 'point') {
      return buildTrivialBundle(geometry.dim, geometry.dim, sheaf.labelLatex, sheaf.labelPlain);
    }
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'tangent');
    }
    const d = geometry.dim;
    if (sheaf.basis === 'character') {
      return buildBundleFromCh(abstractTangentChComponents(geometry), String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
    }
    return buildBundleFromChern(abstractTangentChernComponents(geometry), String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractCotangentBundle(geometry, sheaf) {
    if (geometry.type === 'abelian' || geometry.type === 'point') {
      return buildTrivialBundle(geometry.dim, geometry.dim, sheaf.labelLatex, sheaf.labelPlain);
    }
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'cotangent');
    }
    const d = geometry.dim;
    if (sheaf.basis === 'character') {
      const chComps = abstractTangentChComponents(geometry).map((comp, i) => (
        i === 0 ? comp : comp.scale(fraction(i % 2 === 0 ? 1 : -1))
      ));
      return buildBundleFromCh(chComps, String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
    }
    const cComps = abstractTangentChernComponents(geometry).map((comp, i) => (
      i === 0 ? comp : comp.scale(fraction(i % 2 === 0 ? 1 : -1))
    ));
    return buildBundleFromChern(cComps, String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractCanonicalBundle(geometry, sheaf) {
    if (geometry.type === 'abelian' || geometry.type === 'point') {
      return buildTrivialBundle(geometry.dim, 1, sheaf.labelLatex, sheaf.labelPlain);
    }
    if (geometry.type === 'grassmannian') {
      return buildGrassmannianPluckerLineBundle(geometry, -geometry.grassmannianN, geometry.dim, sheaf.labelLatex, sheaf.labelPlain);
    }
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'canonical');
    }
    const d = geometry.dim;
    const firstChern = sheaf.basis === 'character'
      ? (abstractTangentChComponents(geometry)[1] || Poly.zero()).scale(fraction(-1))
      : (abstractTangentChernComponents(geometry)[1] || Poly.zero()).scale(fraction(-1));
    return buildLineFromFirstChern(firstChern, d, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildGrassmannianSheafBundle(geometry, sheaf, options = {}) {
    const d = geometry.dim;
    if (sheaf.type === 'tangent') {
      const tangent = buildGrassmannianTangentBundle(geometry, sheaf);
      return relabelBundle(tangent, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'cotangent') {
      const tangent = buildGrassmannianTangentBundle(geometry, sheaf);
      const chComps = tangent.chComps.map((comp, i) => (
        i === 0 ? comp : comp.scale(fraction(i % 2 === 0 ? 1 : -1))
      ));
      return buildBundleFromCh(chComps, tangent.rankLatex, tangent.rankPlain, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'canonical') {
      return buildGrassmannianPluckerLineBundle(geometry, -geometry.grassmannianN, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'twist') {
      return buildGrassmannianPluckerLineBundle(geometry, sheaf.twist, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (isUniversalBundleSheafType(sheaf.type)) {
      return relabelBundle(buildGrassmannianSubBundle(geometry), sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildGrassmannianTangentBundle(geometry, sheaf = null) {
    const params = grassmannianParamsFromGeometry(geometry);
    if (!params) return buildTrivialBundle(geometry.dim, geometry.dim, `\\mathcal{T}_{${geometry.labelLatex}}`, `T_${geometry.labelPlain}`);
    const d = geometry.dim;
    const subjectLatex = sheaf ? sheafLabelLatex(sheaf) : `\\mathcal{T}_{${geometry.labelLatex}}`;
    const subjectPlain = sheaf ? sheafLabelPlain(sheaf) : `T_${geometry.labelPlain}`;
    return buildTensorBundle(d, { labelLatex: subjectLatex, labelPlain: subjectPlain }, buildGrassmannianDualSubBundle(geometry), buildGrassmannianQuotientBundle(geometry));
  }

  function buildGrassmannianSubBundle(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const cComps = params ? grassmannianTautologicalChernComponents(geometry) : zeroComponentArray(geometry.dim);
    return buildBundleFromChern(cComps, String(params?.r ?? 0), String(params?.r ?? 0), 'S', 'S');
  }

  function buildGrassmannianQuotientBundle(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const d = geometry.dim;
    const cComps = params ? grassmannianQuotientChernComponents(geometry) : zeroComponentArray(d);
    return buildBundleFromChern(cComps, String(params?.q ?? 0), String(params?.q ?? 0), 'Q', 'Q');
  }

  function buildGrassmannianDualSubBundle(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const d = geometry.dim;
    const sub = buildGrassmannianSubBundle(geometry);
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i += 1) {
      chComps[i] = componentOrZero(sub.chComps, i).scale(fraction(i % 2 === 0 ? 1 : -1));
    }
    return buildBundleFromCh(chComps, String(params?.r ?? 0), String(params?.r ?? 0), 'S^*', 'S^*');
  }

  function buildGrassmannianPluckerLineBundle(geometry, twist, d, labelLatex, labelPlain) {
    return buildLineFromFirstChern(grassmannianPluckerFirstChernPoly(geometry).scale(fraction(twist)), d, labelLatex, labelPlain);
  }

  function relabelBundle(bundle, labelLatex, labelPlain) {
    return {
      ...bundle,
      labelLatex,
      labelPlain
    };
  }

  function buildTrivialBundle(d, rank, labelLatex, labelPlain) {
    return buildBundleFromChern(zeroComponentArray(d), String(rank), String(rank), labelLatex, labelPlain);
  }

  function buildCurveLineBundle(geometry, sheaf, kind) {
    const point = curvePointClass(geometry);
    const firstChern = kind === 'tangent' ? curveTangentFirstChern(geometry, point) : curveCanonicalFirstChern(geometry, point);
    return buildLineFromFirstChern(firstChern, 1, sheaf.labelLatex, sheaf.labelPlain);
  }

  function curvePointClass(geometry) {
    const id = homologyVariableId(HOMOLOGY_POINT_CLASS, geometry);
    const pointClass = homologyClassDefById(geometry, HOMOLOGY_POINT_CLASS);
    defineVariable(id, 1, pointClass?.symbolLatex || '[p]');
    return Poly.variable(id);
  }

  function curveTangentFirstChern(geometry, point) {
    const numericalGenus = numericalCurveGenus(geometry);
    if (numericalGenus != null) return point.scale(fraction(2 - 2 * numericalGenus));
    const genus = sanitizeGenusInput(geometry.genus);
    if (/^\d+$/.test(genus)) return point.scale(fraction(2 - 2 * Number(genus)));
    defineVariable('curveGenus', 0, 'g');
    return point.scale(fraction(2)).sub(Poly.variable('curveGenus').mul(point, 1).scale(fraction(2)));
  }

  function curveCanonicalFirstChern(geometry, point) {
    return curveTangentFirstChern(geometry, point).neg();
  }

  function abstractTangentChernComponents(geometry) {
    const d = geometry.dim;
    const cComps = zeroComponentArray(d);
    const scope = homologyScopeId(geometry);
    for (let i = 1; i <= d; i++) {
      const tangentClassId = tangentChernHomologyClassId(i);
      const hasHomologyClass = geometry.homology?.customClasses?.some((item) => item.id === tangentClassId);
      const id = hasHomologyClass ? homologyVariableId(tangentClassId, geometry) : `chern_${scope}_tangent_${i}`;
      defineVariable(id, i, `c_{${i}}(${geometry.labelLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return cComps;
  }

  function abstractTangentChComponents(geometry) {
    const d = geometry.dim;
    const chComps = zeroComponentArray(d);
    const scope = homologyScopeId(geometry);
    for (let i = 1; i <= d; i++) {
      const id = `character_${scope}_tangent_${i}`;
      defineVariable(id, i, `\\operatorname{ch}_{${i}}(${geometry.labelLatex})`);
      chComps[i] = Poly.variable(id);
    }
    return chComps;
  }

  function buildEmbeddedGeometrySheaf(geometry, sheaf, options = {}) {
    const d = geometry.dim;
    if (sheaf.type === 'tangent') {
      const terms = [{ multiplicity: geometry.ambient + 1, twist: 1 }, { multiplicity: -1, twist: 0 }];
      geometry.degrees.forEach((degree) => terms.push({ multiplicity: -1, twist: degree }));
      const chComps = chComponentsFromLineTerms(geometry, terms, d);
      return buildBundleFromCh(chComps, String(d), String(d), sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'cotangent') {
      const terms = [{ multiplicity: geometry.ambient + 1, twist: -1 }, { multiplicity: -1, twist: 0 }];
      geometry.degrees.forEach((degree) => terms.push({ multiplicity: -1, twist: -degree }));
      const chComps = chComponentsFromLineTerms(geometry, terms, d);
      return buildBundleFromCh(chComps, String(d), String(d), sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'canonical') {
      const q = geometry.degrees.reduce((sum, degree) => sum + degree, 0) - geometry.ambient - 1;
      return buildLineFromHyperplane(geometry, q, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'twist') {
      return buildLineFromHyperplane(geometry, sheaf.twist, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (isUniversalBundleSheafType(sheaf.type)) {
      return buildLineFromHyperplane(geometry, -1, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildLocallyFreeBundle(d, sheaf, options = {}) {
    const prefix = options.variablePrefix ?? defaultSheafVariablePrefix(sheaf);
    const numericRank = numericRankFromPlain(sheaf.rankPlain);
    if (sheaf.basis === 'character') {
      if (numericRank == null) {
        return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      }
      const maxCharacterIndex = Math.min(d, numericRank);
      const freeChComps = zeroComponentArray(maxCharacterIndex);
      for (let i = 1; i <= maxCharacterIndex; i++) {
        const id = `${prefix}ch${i}`;
        defineVariable(id, i, `\\operatorname{ch}_{${i}}(${sheaf.labelLatex})`);
        freeChComps[i] = Poly.variable(id);
      }
      const freePComps = zeroComponentArray(maxCharacterIndex);
      for (let i = 1; i <= maxCharacterIndex; i++) {
        freePComps[i] = freeChComps[i].scale(fraction(factorialBigInt(i)));
      }
      const freeCComps = chernFromPowerSums(freePComps, maxCharacterIndex);
      const cComps = zeroComponentArray(d);
      for (let i = 1; i <= maxCharacterIndex; i++) cComps[i] = freeCComps[i];
      return buildBundleFromChern(cComps, sheaf.rankLatex, sheaf.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
    }
    const cComps = zeroComponentArray(d);
    const maxChernIndex = numericRank == null ? d : Math.min(d, numericRank);
    for (let i = 1; i <= maxChernIndex; i++) {
      const id = `${prefix}c${i}`;
      defineVariable(id, i, `c_{${i}}(${sheaf.labelLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return buildBundleFromChern(cComps, sheaf.rankLatex, sheaf.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractBundle(d, sheaf, subjectLatex, subjectPlain, rankLatex, rankPlain, options = {}) {
    const chernSubjectLatex = options.chernSubjectLatex || subjectLatex;
    const characterSubjectLatex = options.characterSubjectLatex || subjectLatex;
    const prefix = options.variablePrefix ?? defaultSheafVariablePrefix(sheaf);
    if (sheaf.basis === 'character') {
      const chComps = zeroComponentArray(d);
      for (let i = 1; i <= d; i++) {
        const id = `${prefix}ch${i}`;
        defineVariable(id, i, `\\operatorname{ch}_{${i}}(${characterSubjectLatex})`);
        chComps[i] = Poly.variable(id);
      }
      return buildBundleFromCh(chComps, rankLatex, rankPlain, subjectLatex, subjectPlain);
    }
    const cComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      const id = `${prefix}c${i}`;
      defineVariable(id, i, `c_{${i}}(${chernSubjectLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return buildBundleFromChern(cComps, rankLatex, rankPlain, subjectLatex, subjectPlain);
  }

  function buildLineFromHyperplane(geometry, twist, d, labelLatex, labelPlain) {
    const hyperplaneId = homologyVariableId(HOMOLOGY_HYPERPLANE_CLASS, geometry);
    const hyperplane = homologyClassDefById(geometry, HOMOLOGY_HYPERPLANE_CLASS);
    defineVariable(hyperplaneId, 1, hyperplane?.symbolLatex || 'H');
    return buildLineFromFirstChern(Poly.variable(hyperplaneId).scale(fraction(twist)), d, labelLatex, labelPlain);
  }

  function buildLineFromFirstChern(firstChern, d, labelLatex, labelPlain) {
    const cComps = zeroComponentArray(d);
    if (d >= 1) cComps[1] = firstChern;
    return buildBundleFromChern(cComps, '1', '1', labelLatex, labelPlain);
  }

  function buildBundleFromChern(cComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = cComps.length - 1;
    const pComps = powerSumsFromChern(cComps, d);
    const chComps = chComponentsFromPowerSums(pComps, d);
    return finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain);
  }

  function buildBundleFromCh(chComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = chComps.length - 1;
    const pComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) pComps[i] = chComps[i].scale(fraction(factorialBigInt(i)));
    const cComps = chernFromPowerSums(pComps, d);
    return finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain);
  }

  function finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = cComps.length - 1;
    const cTotal = totalFromComponents(cComps, d, Poly.one());
    const segre = inverseUnit(cTotal, d);
    const logTodd = toddLogFromPowerSums(pComps, d);
    const todd = expPoly(logTodd, d);
    const sqrtTodd = expPoly(logTodd.scale(fraction(1, 2)), d);
    return {
      cComps,
      chComps,
      pComps,
      cTotal,
      segre,
      todd,
      sqrtTodd,
      rankLatex,
      rankPlain,
      labelLatex,
      labelPlain
    };
  }

  function chComponentsFromLineTerms(geometry, terms, d) {
    const chComps = zeroComponentArray(d);
    const hyperplaneId = homologyVariableId(HOMOLOGY_HYPERPLANE_CLASS, geometry);
    const hyperplane = homologyClassDefById(geometry, HOMOLOGY_HYPERPLANE_CLASS);
    defineVariable(hyperplaneId, 1, hyperplane?.symbolLatex || 'H');
    const H = Poly.variable(hyperplaneId);
    const powers = [Poly.one()];
    for (let i = 1; i <= d; i++) powers[i] = powers[i - 1].mul(H, d);
    for (let i = 1; i <= d; i++) {
      let coeff = Fraction.zero();
      for (const term of terms) {
        const qPower = bigintPow(BigInt(term.twist), i);
        coeff = coeff.add(fraction(BigInt(term.multiplicity) * qPower, factorialBigInt(i)));
      }
      chComps[i] = chComps[i].add(powers[i].scale(coeff));
    }
    return chComps;
  }

  function zeroComponentArray(d) {
    return Array.from({ length: d + 1 }, () => Poly.zero());
  }

  function totalFromComponents(comps, d, constant) {
    let total = constant || Poly.zero();
    for (let i = 1; i <= d; i++) total = total.add(comps[i]);
    return total.truncate(d);
  }

  function positiveTotal(comps, d) {
    return totalFromComponents(comps, d, Poly.zero());
  }

  function powerSumsFromChern(cComps, d) {
    const p = zeroComponentArray(d);
    for (let k = 1; k <= d; k++) {
      let sum = Poly.zero();
      for (let i = 1; i < k; i++) {
        const sign = i % 2 === 1 ? 1 : -1;
        sum = sum.add(cComps[i].mul(p[k - i], d).scale(fraction(sign)));
      }
      const lastSign = k % 2 === 1 ? 1 : -1;
      sum = sum.add(cComps[k].scale(fraction(lastSign * k)));
      p[k] = sum.truncate(d);
    }
    return p;
  }

  function chernFromPowerSums(pComps, d) {
    const c = zeroComponentArray(d);
    c[0] = Poly.one();
    for (let k = 1; k <= d; k++) {
      let sum = Poly.zero();
      for (let i = 1; i <= k; i++) {
        const sign = i % 2 === 1 ? 1 : -1;
        sum = sum.add(c[k - i].mul(pComps[i], d).scale(fraction(sign)));
      }
      c[k] = sum.scale(fraction(1, k)).truncate(d);
    }
    return c;
  }

  function chComponentsFromPowerSums(pComps, d) {
    const ch = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) ch[i] = pComps[i].scale(fraction(1, factorialBigInt(i)));
    return ch;
  }

  function inverseUnit(poly, d) {
    const u = poly.sub(Poly.one()).truncate(d);
    let total = Poly.one();
    let term = Poly.one();
    for (let i = 1; i <= d; i++) {
      term = term.mul(u, d).scale(fraction(-1));
      if (term.isZero()) break;
      total = total.add(term);
    }
    return total.truncate(d);
  }

  function expPoly(poly, d) {
    let total = Poly.one();
    let term = Poly.one();
    for (let i = 1; i <= d; i++) {
      term = term.mul(poly, d).scale(fraction(1, i));
      if (term.isZero()) break;
      total = total.add(term);
    }
    return total.truncate(d);
  }

  function toddLogFromPowerSums(pComps, d) {
    const coeffs = toddLogCoefficients(d);
    let out = Poly.zero();
    for (let i = 1; i <= d; i++) {
      if (!coeffs[i] || coeffs[i].isZero()) continue;
      out = out.add(pComps[i].scale(coeffs[i]));
    }
    return out.truncate(d);
  }

  function buildHodgeNumbers(geometry) {
    const d = geometry.dim;
    if (geometry.type === 'point') {
      return {
        entries: [[{ latex: '1', plain: '1' }]],
        message: 'Point Hodge numbers.'
      };
    }
    if (geometry.type === 'abelian') {
      return buildAbelianHodgeNumbers(geometry);
    }
    if (geometry.type === 'grassmannian') {
      return buildGrassmannianHodgeNumbers(geometry);
    }
    if (geometryHasNumericalCurveLabel(geometry)) {
      const genus = String(numericalCurveGenus(geometry));
      return {
        entries: [
          [
            { latex: '1', plain: '1' },
            { latex: genus, plain: genus }
          ],
          [
            { latex: genus, plain: genus },
            { latex: '1', plain: '1' }
          ]
        ],
        message: `Curve Hodge numbers with genus ${genus}.`
      };
    }
    if (geometry.type === 'product' && Array.isArray(geometry.productFactors) && geometry.productFactors.length === 2) {
      const left = buildHodgeNumbers(geometry.productFactors[0]);
      const right = buildHodgeNumbers(geometry.productFactors[1]);
      return productHodgeNumbers(left, right, geometry);
    }
    if (geometry.type === 'curve') {
      const genus = genusLatex(geometry.genus);
      return {
        entries: [
          [
            { latex: '1', plain: '1' },
            { latex: genus, plain: genusPlain(geometry.genus) }
          ],
          [
            { latex: genus, plain: genusPlain(geometry.genus) },
            { latex: '1', plain: '1' }
          ]
        ],
        message: `Curve Hodge numbers with genus ${genusPlain(geometry.genus)}.`
      };
    }
    if (geometry.type === 'abstract') {
      if (d === 2) {
        return {
          entries: [
            [
              { latex: '1', plain: '1' },
              { latex: 'q', plain: 'q' },
              { latex: 'p_g', plain: 'p_g' }
            ],
            [
              { latex: 'q', plain: 'q' },
              { latex: 'h^{1,1}', plain: 'h^1,1' },
              { latex: 'q', plain: 'q' }
            ],
            [
              { latex: 'p_g', plain: 'p_g' },
              { latex: 'q', plain: 'q' },
              { latex: '1', plain: '1' }
            ]
          ],
          message: 'Abstract surface: standard notation for Hodge numbers.'
        };
      }
      const entries = Array.from({ length: d + 1 }, (_, p) => (
        Array.from({ length: d + 1 }, (_, q) => ({
          latex: `h^{${p},${q}}`,
          plain: `h^${p},${q}`
        }))
      ));
      return {
        entries,
        message: 'Abstract variety: entries are symbolic Hodge numbers.'
      };
    }

    const chi = chiYCoefficientsForCompleteIntersection(geometry);
    const entries = Array.from({ length: d + 1 }, () => (
      Array.from({ length: d + 1 }, () => Fraction.zero())
    ));
    for (let p = 0; p <= d; p++) entries[p][p] = entries[p][p].add(Fraction.one());
    for (let p = 0; p <= d; p++) {
      const diagonal = fraction(p % 2 === 0 ? 1 : -1);
      const sign = fraction((d - p) % 2 === 0 ? 1 : -1);
      const primitive = chi[p].sub(diagonal).mul(sign);
      if (!primitive.isZero()) {
        const q = d - p;
        entries[p][q] = entries[p][q].add(primitive);
      }
    }
    return {
      entries: entries.map((row) => row.map((value) => ({
        latex: formatFractionLatex(value),
        plain: formatFractionPlain(value)
      }))),
      message: geometry.type === 'projective'
        ? 'Projective-space Hodge numbers.'
        : 'Smooth complete-intersection Hodge numbers, computed from the Hirzebruch chi_y genus.'
    };
  }

  function buildAbelianHodgeNumbers(geometry) {
    const d = geometry.dim;
    return {
      entries: Array.from({ length: d + 1 }, (_, p) => (
        Array.from({ length: d + 1 }, (_, q) => {
          const value = binomialBigInt(d, p) * binomialBigInt(d, q);
          return {
            latex: value.toString(),
            plain: value.toString()
          };
        })
      )),
      message: 'Abelian-variety Hodge numbers.'
    };
  }

  function buildGrassmannianHodgeNumbers(geometry) {
    const params = grassmannianParamsFromGeometry(geometry);
    const d = geometry.dim;
    const diagonal = params ? grassmannianBettiNumbers(params.r, params.n) : [];
    return {
      entries: Array.from({ length: d + 1 }, (_, p) => (
        Array.from({ length: d + 1 }, (_, q) => {
          const value = p === q ? BigInt(diagonal[p] || 0) : 0n;
          return {
            latex: value.toString(),
            plain: value.toString()
          };
        })
      )),
      message: 'Grassmannian Hodge numbers: Schubert classes are pure of type (p,p).'
    };
  }

  function grassmannianBettiNumbers(r, n) {
    const q = n - r;
    const dim = grassmannianDimension(r, n);
    const counts = Array.from({ length: dim + 1 }, () => 0n);
    const visit = (row, maxPart, total) => {
      if (row === r) {
        counts[total] += 1n;
        return;
      }
      for (let part = maxPart; part >= 0; part -= 1) {
        visit(row + 1, part, total + part);
      }
    };
    visit(0, q, 0);
    return counts;
  }

  function productHodgeNumbers(left, right, geometry) {
    const leftDim = geometry.productFactors[0].dim;
    const rightDim = geometry.productFactors[1].dim;
    const entries = Array.from({ length: geometry.dim + 1 }, (_, p) => (
      Array.from({ length: geometry.dim + 1 }, (_, q) => {
        const terms = [];
        for (let a = 0; a <= leftDim; a += 1) {
          const b = p - a;
          if (b < 0 || b > rightDim) continue;
          for (let c = 0; c <= leftDim; c += 1) {
            const e = q - c;
            if (e < 0 || e > rightDim) continue;
            terms.push(multiplyHodgeEntries(left.entries[a][c], right.entries[b][e]));
          }
        }
        return sumHodgeEntries(terms);
      })
    ));
    return {
      entries,
      message: `Product Hodge numbers from ${geometry.productFactors[0].labelPlain} and ${geometry.productFactors[1].labelPlain}.`
    };
  }

  function multiplyHodgeEntries(left, right) {
    const leftNumber = parseSimpleLatexNumber(left?.latex);
    const rightNumber = parseSimpleLatexNumber(right?.latex);
    if (leftNumber && rightNumber) {
      const value = leftNumber.mul(rightNumber);
      return {
        latex: formatFractionLatex(value),
        plain: formatFractionPlain(value)
      };
    }
    if (leftNumber?.isZero() || rightNumber?.isZero()) return { latex: '0', plain: '0' };
    if (leftNumber?.isOne()) return { latex: right.latex, plain: right.plain };
    if (rightNumber?.isOne()) return { latex: left.latex, plain: left.plain };
    const leftLatex = leftNumber ? formatFractionLatex(leftNumber) : left.latex;
    const rightLatex = rightNumber ? formatFractionLatex(rightNumber) : right.latex;
    const leftPlain = leftNumber ? formatFractionPlain(leftNumber) : left.plain;
    const rightPlain = rightNumber ? formatFractionPlain(rightNumber) : right.plain;
    return {
      latex: `${hodgeFactorLatex(leftLatex)}${hodgeFactorLatex(rightLatex)}`,
      plain: `${hodgeFactorPlain(leftPlain)}*${hodgeFactorPlain(rightPlain)}`
    };
  }

  function sumHodgeEntries(entries) {
    const numeric = entries.map((entry) => parseSimpleLatexNumber(entry.latex));
    if (numeric.every((value) => value != null)) {
      const total = numeric.reduce((sum, value) => sum.add(value), Fraction.zero());
      return {
        latex: formatFractionLatex(total),
        plain: formatFractionPlain(total)
      };
    }
    return {
      latex: formatHodgeExpressionLatex(entries.map((entry) => ({ ...entry, sign: 1 }))),
      plain: entries.map((entry) => entry.plain).filter((plain) => plain && plain !== '0').join(' + ') || '0'
    };
  }

  function hodgeFactorLatex(value) {
    const text = String(value || '0');
    return /^[A-Za-z0-9_{}\\^]+$/.test(text) || parseSimpleLatexNumber(text) ? text : `\\left(${text}\\right)`;
  }

  function hodgeFactorPlain(value) {
    const text = String(value || '0');
    return /^[A-Za-z0-9_^,]+$/.test(text) ? text : `(${text})`;
  }

  function buildSheafCohomology(geometry, sheaf, hodge = null) {
    if (!geometry) return null;
    const target = cohomologyTargetForSheaf(geometry, sheaf);
    if (target.kind === 'line') {
      const dimensions = lineBundleCohomologyDimensions(geometry, target.twist);
      if (dimensions) {
        return {
          subjectLatex: target.subjectLatex,
          subjectPlain: target.subjectPlain,
          dimensions,
          message: target.message || lineBundleCohomologyMessage(geometry, target.twist)
        };
      }
    }
    if (target.kind === 'structure') {
      const dimensions = structureSheafCohomologyDimensions(geometry, hodge || buildHodgeNumbers(geometry));
      if (dimensions) {
        return {
          subjectLatex: target.subjectLatex,
          subjectPlain: target.subjectPlain,
          dimensions,
          message: target.message || 'Structure-sheaf cohomology read from the Hodge row h^{0,i}.'
        };
      }
    }
    if (target.kind === 'hodge-row') {
      const dimensions = hodgeRowSheafCohomologyDimensions(geometry, hodge || buildHodgeNumbers(geometry), target.hodgeP);
      if (dimensions) {
        return {
          subjectLatex: target.subjectLatex,
          subjectPlain: target.subjectPlain,
          dimensions,
          message: target.message || `Cohomology dimensions read from the Hodge row h^${target.hodgeP},i.`
        };
      }
    }
    if (target.kind === 'acyclic') {
      return {
        subjectLatex: target.subjectLatex,
        subjectPlain: target.subjectPlain,
        dimensions: zeroSheafCohomologyDimensions(geometry),
        message: target.message || 'All sheaf cohomology groups vanish.'
      };
    }
    return {
      subjectLatex: target.subjectLatex || sheafLabelLatex(sheaf || {}),
      subjectPlain: target.subjectPlain || sheafLabelPlain(sheaf || {}),
      dimensions: null,
      message: target.message || 'Cohomology is available for O_X(r) on projective spaces and smooth complete intersections.'
    };
  }

  function cohomologyTargetForSheaf(geometry, sheaf) {
    if (!sheaf) {
      return {
        kind: embeddedGeometrySupportsLineCohomology(geometry) ? 'line' : 'structure',
        twist: 0,
        subjectLatex: `\\mathcal{O}_{${geometry.labelLatex}}`,
        subjectPlain: `O_${geometry.labelPlain}`,
        message: embeddedGeometrySupportsLineCohomology(geometry) ? '' : 'Structure-sheaf cohomology read from the Hodge row h^{0,i}.'
      };
    }
    if (sheaf.type === 'structure') {
      return {
        kind: embeddedGeometrySupportsLineCohomology(geometry) ? 'line' : 'structure',
        twist: 0,
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: embeddedGeometrySupportsLineCohomology(geometry) ? '' : 'Structure-sheaf cohomology read from the Hodge row h^{0,i}.'
      };
    }
    if (sheaf.type === 'twist') {
      return {
        kind: embeddedGeometrySupportsLineCohomology(geometry) ? 'line' : 'unsupported',
        twist: normalizedInt(sheaf.twist, -24, 24, 0),
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: embeddedGeometrySupportsLineCohomology(geometry)
          ? ''
          : 'Twist sheaf cohomology needs a projective-space or complete-intersection embedding.'
      };
    }
    if (isUniversalBundleSheafType(sheaf.type) && varietyHasHyperplaneClass(geometry?.type || 'abstract')) {
      return {
        kind: embeddedGeometrySupportsLineCohomology(geometry) ? 'line' : 'unsupported',
        twist: -1,
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: embeddedGeometrySupportsLineCohomology(geometry)
          ? 'Universal bundle identified with O_X(-1).'
          : 'Universal bundle cohomology needs a projective-space or complete-intersection embedding.'
      };
    }
    if (isUniversalBundleSheafType(sheaf.type) && geometry?.type === 'grassmannian') {
      return {
        kind: 'acyclic',
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: 'Universal subbundle cohomology on the Grassmannian: all H^i vanish.'
      };
    }
    if (sheaf.type === 'canonical' && embeddedGeometrySupportsLineCohomology(geometry)) {
      const twist = completeIntersectionCanonicalTwist(geometry);
      return {
        kind: 'line',
        twist,
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: `Canonical sheaf identified with O_X(${twist}) by adjunction.`
      };
    }
    if (sheaf.type === 'cotangent') {
      return {
        kind: 'hodge-row',
        hodgeP: 1,
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf),
        message: 'Cotangent-sheaf cohomology uses dim H^i(X, Omega_X^1)=h^{1,i}.'
      };
    }
    if (sheaf.type === 'abstract' && (canonicalMathLabel(sheaf.labelLatex) === canonicalMathLabel(`\\mathcal{O}_{${geometry.labelLatex}}`) || canonicalMathLabel(sheaf.labelLatex) === canonicalMathLabel('\\mathcal{O}_X'))) {
      return {
        kind: embeddedGeometrySupportsLineCohomology(geometry) ? 'line' : 'structure',
        twist: 0,
        subjectLatex: sheafLabelLatex(sheaf),
        subjectPlain: sheafLabelPlain(sheaf)
      };
    }
    return {
      kind: 'unsupported',
      subjectLatex: sheafLabelLatex(sheaf),
      subjectPlain: sheafLabelPlain(sheaf),
      message: `Cohomology of ${sheafTypeLabel(sheaf.type)} is not determined by the current input.`
    };
  }

  function embeddedGeometrySupportsLineCohomology(geometry) {
    return geometry?.type === 'projective' || geometry?.type === 'complete-intersection';
  }

  function lineBundleCohomologyMessage(geometry, twist) {
    if (geometry.type === 'projective') return `Line-bundle cohomology on ${geometry.ambientPlain}, for twist ${twist}.`;
    return `Assuming a smooth complete intersection in ${geometry.ambientPlain}; computed from the Hilbert series and Serre duality.`;
  }

  function lineBundleCohomologyDimensions(geometry, twist) {
    if (!embeddedGeometrySupportsLineCohomology(geometry)) return null;
    const ambient = Number.isInteger(geometry.ambient) ? geometry.ambient : geometry.dim;
    const degrees = Array.isArray(geometry.degrees) ? geometry.degrees : [];
    const dim = Math.max(0, ambient - degrees.length);
    return Array.from({ length: dim + 1 }, (_, q) => cohomologyDimensionEntry(completeIntersectionLineCohomologyAt(ambient, degrees, q, twist)));
  }

  function completeIntersectionLineCohomologyAt(ambient, degrees, q, twist) {
    const dim = ambient - degrees.length;
    if (q === 0) {
      if (ambient === degrees.length) return completeIntersectionDegreeProduct(degrees);
      return twist >= 0 ? completeIntersectionHilbertCoefficient(ambient, degrees, twist) : 0n;
    }
    if (q === dim) {
      return completeIntersectionLineCohomologyAt(ambient, degrees, 0, completeIntersectionCanonicalTwist({ ambient, degrees }) - twist);
    }
    return 0n;
  }

  function completeIntersectionCanonicalTwist(geometry) {
    const ambient = Number.isInteger(geometry.ambient) ? geometry.ambient : geometry.dim;
    const degrees = Array.isArray(geometry.degrees) ? geometry.degrees : [];
    return degrees.reduce((sum, degree) => sum + degree, 0) - ambient - 1;
  }

  function completeIntersectionDegreeProduct(degrees) {
    return (degrees || []).reduce((product, degree) => product * BigInt(degree), 1n);
  }

  function completeIntersectionHilbertCoefficient(ambient, degrees, degree) {
    if (!Number.isInteger(degree) || degree < 0) return 0n;
    let total = 0n;
    const count = degrees.length;
    const subsets = 1 << count;
    for (let mask = 0; mask < subsets; mask += 1) {
      let degreeSum = 0;
      let parity = 0;
      for (let i = 0; i < count; i += 1) {
        if (!(mask & (1 << i))) continue;
        degreeSum += degrees[i];
        parity += 1;
      }
      const shifted = degree - degreeSum;
      if (shifted < 0) continue;
      const contribution = binomialBigInt(ambient + shifted, ambient);
      total += parity % 2 === 0 ? contribution : -contribution;
    }
    return total < 0n ? 0n : total;
  }

  function structureSheafCohomologyDimensions(geometry, hodge) {
    return hodgeRowSheafCohomologyDimensions(geometry, hodge, 0);
  }

  function hodgeRowSheafCohomologyDimensions(geometry, hodge, p) {
    if (!hodge?.entries?.[0]) return null;
    if (!Number.isInteger(p) || p < 0 || p > geometry.dim || !hodge.entries[p]) return null;
    return Array.from({ length: geometry.dim + 1 }, (_, i) => {
      const entry = hodge.entries[p][i] || { latex: '0', plain: '0' };
      return {
        latex: entry.latex || '0',
        plain: entry.plain || latexToPlain(entry.latex || '0')
      };
    });
  }

  function zeroSheafCohomologyDimensions(geometry) {
    const dim = Math.max(0, geometry?.dim || 0);
    return Array.from({ length: dim + 1 }, () => cohomologyDimensionEntry(0n));
  }

  function cohomologyDimensionEntry(value) {
    return {
      latex: value.toString(),
      plain: value.toString()
    };
  }

  function chiYCoefficientsForCompleteIntersection(geometry) {
    const d = geometry.dim;
    const values = [];
    for (let y = 0; y <= d; y++) values.push(chiYValueAt(geometry, fraction(y)));
    return interpolateAtConsecutiveIntegers(values);
  }

  function chiYValueAt(geometry, y) {
    const d = geometry.dim;
    const ambient = geometry.ambient;
    const degrees = geometry.degrees;
    let series = seriesPow(hirzebruchQSeries(1, y, d), ambient + 1, d);
    series = seriesScale(series, Fraction.one().div(Fraction.one().add(y)), d);
    for (const degree of degrees) {
      series = seriesMultiply(series, seriesInverse(hirzebruchQSeries(degree, y, d), d), d);
    }
    const degreeProduct = degrees.reduce((prod, degree) => prod * BigInt(degree), 1n);
    return series[d].mul(fraction(degreeProduct));
  }

  function hirzebruchQSeries(scaleValue, y, d) {
    const aCoeffs = hirzebruchACoeffs(d);
    return Array.from({ length: d + 1 }, (_, k) => {
      const positive = fraction(bigintPow(BigInt(scaleValue), k));
      const negative = fraction(bigintPow(BigInt(-scaleValue), k));
      return aCoeffs[k].mul(positive).add(y.mul(aCoeffs[k]).mul(negative));
    });
  }

  function hirzebruchACoeffs(d) {
    if (hodgeACoeffCache.has(d)) return hodgeACoeffCache.get(d);
    const denominator = Array.from({ length: d + 1 }, (_, n) => {
      const sign = n % 2 === 0 ? 1 : -1;
      return fraction(sign, factorialBigInt(n + 1));
    });
    const coeffs = seriesInverse(denominator, d);
    hodgeACoeffCache.set(d, coeffs);
    return coeffs;
  }

  function seriesPow(series, exponent, d) {
    let result = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    let base = series.slice();
    let n = exponent;
    while (n > 0) {
      if (n % 2 === 1) result = seriesMultiply(result, base, d);
      n = Math.floor(n / 2);
      if (n > 0) base = seriesMultiply(base, base, d);
    }
    return result;
  }

  function interpolateAtConsecutiveIntegers(values) {
    const d = values.length - 1;
    let result = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i <= d; i++) {
      let basis = [Fraction.one()];
      let denominator = Fraction.one();
      for (let j = 0; j <= d; j++) {
        if (i === j) continue;
        basis = yPolyMultiplyLinear(basis, fraction(-j), Fraction.one(), d);
        denominator = denominator.mul(fraction(i - j));
      }
      const scale = values[i].div(denominator);
      result = yPolyAdd(result, yPolyScale(basis, scale, d), d);
    }
    return result;
  }

  function yPolyMultiplyLinear(poly, constant, linear, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i < poly.length && i <= d; i++) {
      out[i] = out[i].add(poly[i].mul(constant));
      if (i + 1 <= d) out[i + 1] = out[i + 1].add(poly[i].mul(linear));
    }
    return out;
  }

  function yPolyScale(poly, scalar, d) {
    return Array.from({ length: d + 1 }, (_, i) => (poly[i] || Fraction.zero()).mul(scalar));
  }

  function yPolyAdd(a, b, d) {
    return Array.from({ length: d + 1 }, (_, i) => (a[i] || Fraction.zero()).add(b[i] || Fraction.zero()));
  }

  const toddLogCache = new Map();
  function toddLogCoefficients(d) {
    if (toddLogCache.has(d)) return toddLogCache.get(d);
    const g = Array.from({ length: d + 1 }, (_, n) => fraction(n % 2 === 0 ? 1 : -1, factorialBigInt(n + 1)));
    const f = seriesInverse(g, d);
    const logF = seriesLogUnit(f, d);
    toddLogCache.set(d, logF);
    return logF;
  }

  function seriesInverse(series, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    out[0] = Fraction.one().div(series[0]);
    for (let n = 1; n <= d; n++) {
      let sum = Fraction.zero();
      for (let i = 1; i <= n; i++) sum = sum.add(series[i].mul(out[n - i]));
      out[n] = sum.neg().div(series[0]);
    }
    return out;
  }

  function seriesLogUnit(series, d) {
    const u = series.slice();
    u[0] = u[0].sub(Fraction.one());
    let total = Array.from({ length: d + 1 }, () => Fraction.zero());
    let power = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    for (let k = 1; k <= d; k++) {
      power = seriesMultiply(power, u, d);
      const scale = fraction(k % 2 === 1 ? 1 : -1, k);
      total = seriesAdd(total, seriesScale(power, scale, d), d);
    }
    return total;
  }

  function seriesExp(series, d) {
    let total = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    let power = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    for (let k = 1; k <= d; k++) {
      power = seriesMultiply(power, series, d);
      total = seriesAdd(total, seriesScale(power, fraction(1, factorialBigInt(k)), d), d);
    }
    return total;
  }

  function seriesMultiply(a, b, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i <= d; i++) {
      if (a[i].isZero()) continue;
      for (let j = 0; j + i <= d; j++) {
        if (!b[j] || b[j].isZero()) continue;
        out[i + j] = out[i + j].add(a[i].mul(b[j]));
      }
    }
    return out;
  }

  function seriesScale(series, scalar, d) {
    return Array.from({ length: d + 1 }, (_, i) => series[i].mul(scalar));
  }

  function seriesAdd(a, b, d) {
    return Array.from({ length: d + 1 }, (_, i) => a[i].add(b[i]));
  }

  class Fraction {
    constructor(num = 0n, den = 1n) {
      num = toBigInt(num);
      den = toBigInt(den);
      if (den === 0n) throw new Error('Division by zero.');
      if (num === 0n) {
        this.num = 0n;
        this.den = 1n;
        return;
      }
      if (den < 0n) {
        num = -num;
        den = -den;
      }
      const g = bigintGcd(bigintAbs(num), den);
      this.num = num / g;
      this.den = den / g;
    }

    static zero() { return new Fraction(0n, 1n); }
    static one() { return new Fraction(1n, 1n); }
    static from(value) {
      if (value instanceof Fraction) return value;
      return new Fraction(value, 1n);
    }

    add(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den);
    }

    sub(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den);
    }

    mul(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.num, this.den * other.den);
    }

    div(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den, this.den * other.num);
    }

    neg() { return new Fraction(-this.num, this.den); }
    abs() { return new Fraction(bigintAbs(this.num), this.den); }
    isZero() { return this.num === 0n; }
    isOne() { return this.num === this.den; }
    sign() { return this.num < 0n ? -1 : this.num > 0n ? 1 : 0; }

    toLatexAbs() {
      const abs = this.abs();
      if (abs.den === 1n) return abs.num.toString();
      return `\\frac{${abs.num.toString()}}{${abs.den.toString()}}`;
    }

    toPlainAbs() {
      const abs = this.abs();
      if (abs.den === 1n) return abs.num.toString();
      return `${abs.num.toString()}/${abs.den.toString()}`;
    }
  }

  class Poly {
    constructor(terms = null) {
      this.terms = new Map();
      if (terms) {
        for (const [key, coeff] of terms.entries ? terms.entries() : Object.entries(terms)) {
          const c = Fraction.from(coeff);
          if (!c.isZero()) this.terms.set(key, c);
        }
      }
    }

    static zero() { return new Poly(); }
    static one() { return new Poly(new Map([['', Fraction.one()]])); }
    static constant(value) {
      const c = Fraction.from(value);
      return c.isZero() ? Poly.zero() : new Poly(new Map([['', c]]));
    }
    static variable(id) { return new Poly(new Map([[monoKey({ [id]: 1 }), Fraction.one()]])); }

    add(other) {
      other = Poly.from(other);
      const terms = new Map(this.terms);
      for (const [key, coeff] of other.terms) {
        const next = (terms.get(key) || Fraction.zero()).add(coeff);
        if (next.isZero()) terms.delete(key);
        else terms.set(key, next);
      }
      return new Poly(terms);
    }

    sub(other) { return this.add(Poly.from(other).neg()); }
    neg() { return this.scale(fraction(-1)); }

    scale(value) {
      const scalar = Fraction.from(value);
      if (scalar.isZero()) return Poly.zero();
      const terms = new Map();
      for (const [key, coeff] of this.terms) terms.set(key, coeff.mul(scalar));
      return new Poly(terms);
    }

    mul(other, maxDegree = MAX_DIMENSION) {
      other = Poly.from(other);
      if (this.isZero() || other.isZero()) return Poly.zero();
      const terms = new Map();
      for (const [aKey, aCoeff] of this.terms) {
        const aPowers = parseMonoKey(aKey);
        for (const [bKey, bCoeff] of other.terms) {
          const product = multiplyMonomialPowers(aPowers, parseMonoKey(bKey));
          if (!product) continue;
          const key = monoKey(product.powers);
          if (monoDegree(key) > maxDegree) continue;
          const next = (terms.get(key) || Fraction.zero()).add(aCoeff.mul(bCoeff).mul(product.sign));
          if (next.isZero()) terms.delete(key);
          else terms.set(key, next);
        }
      }
      return new Poly(terms);
    }

    truncate(maxDegree) {
      const terms = new Map();
      for (const [key, coeff] of this.terms) {
        if (monoDegree(key) <= maxDegree) terms.set(key, coeff);
      }
      return new Poly(terms);
    }

    isZero() { return this.terms.size === 0; }

    static from(value) {
      if (value instanceof Poly) return value;
      return Poly.constant(value);
    }
  }

  function defineVariable(id, degree, latex, meta = {}) {
    VARS.set(id, {
      degree,
      cohomologyDegree: Math.round(2 * degree),
      latex,
      plain: latexToPlain(latex),
      ...meta
    });
  }

  function monoKey(powers) {
    return Object.entries(powers)
      .filter(([, exp]) => exp > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, exp]) => `${id}:${exp}`)
      .join('|');
  }

  function multiplyMonomialPowers(left, right) {
    const leftEntries = Object.entries(left || {}).filter(([, exp]) => exp > 0).sort(([a], [b]) => a.localeCompare(b));
    const rightEntries = Object.entries(right || {}).filter(([, exp]) => exp > 0).sort(([a], [b]) => a.localeCompare(b));
    const powers = {};
    for (const [id, exp] of leftEntries) {
      if (homologyClassIsOdd(VARS.get(id)) && exp > 1) return null;
      powers[id] = (powers[id] || 0) + exp;
    }
    for (const [id, exp] of rightEntries) {
      const data = VARS.get(id);
      if (homologyClassIsOdd(data) && ((powers[id] || 0) > 0 || exp > 1)) return null;
      powers[id] = (powers[id] || 0) + exp;
    }
    let swaps = 0;
    for (const [leftId, leftExp] of leftEntries) {
      if (!homologyClassIsOdd(VARS.get(leftId))) continue;
      for (const [rightId, rightExp] of rightEntries) {
        if (leftId <= rightId || !homologyClassIsOdd(VARS.get(rightId))) continue;
        swaps += leftExp * rightExp;
      }
    }
    return {
      powers,
      sign: fraction(swaps % 2 === 0 ? 1 : -1)
    };
  }

  function parseMonoKey(key) {
    if (!key) return {};
    const out = {};
    for (const part of key.split('|')) {
      const [id, exp] = part.split(':');
      out[id] = Number(exp);
    }
    return out;
  }

  function monoDegree(key) {
    if (!key) return 0;
    let degree = 0;
    const powers = parseMonoKey(key);
    for (const [id, exp] of Object.entries(powers)) {
      const data = VARS.get(id);
      degree += (data ? data.degree : 1) * exp;
    }
    return degree;
  }

  function monomialLatex(key) {
    if (!key) return '';
    return Object.entries(parseMonoKey(key)).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.latex : id;
      return exp === 1 ? base : `{${base}}^{${exp}}`;
    }).join('\\,');
  }

  function monomialPlain(key) {
    if (!key) return '';
    return Object.entries(parseMonoKey(key)).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.plain : id;
      return exp === 1 ? base : `${base}^${exp}`;
    }).join('*');
  }

  function sortedTerms(poly) {
    return Array.from(poly.terms.entries()).sort((a, b) => {
      const byDegree = monoDegree(a[0]) - monoDegree(b[0]);
      if (byDegree) return byDegree;
      return a[0].localeCompare(b[0]);
    });
  }

  function formatPolyLatex(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatTermLatex(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function formatTermLatex(key, absCoeff) {
    const mono = monomialLatex(key);
    if (!mono) return absCoeff.toLatexAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toLatexAbs()}\\,${mono}`;
  }

  function formatPolyPlain(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatTermPlain(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function formatTermPlain(key, absCoeff) {
    const mono = monomialPlain(key);
    if (!mono) return absCoeff.toPlainAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toPlainAbs()}*${mono}`;
  }

  function formatRankPlusPolyLatex(rank, poly) {
    if (poly.isZero()) return rank || '0';
    const body = formatPolyLatex(poly);
    if (!rank || rank === '0') return body;
    return body.startsWith('-') ? `${rank} - ${body.slice(1)}` : `${rank} + ${body}`;
  }

  function formatRankPlusPolyPlain(rank, poly) {
    if (poly.isZero()) return rank || '0';
    const body = formatPolyPlain(poly);
    if (!rank || rank === '0') return body;
    return body.startsWith('-') ? `${rank} - ${body.slice(1)}` : `${rank} + ${body}`;
  }

  function renderHomologyPanel(result = state.lastResult) {
    if (!refs.homologyCard) return;
    const context = activeHomologyContext(result);
    if (context.kind === 'map') return renderMapHomologyPanel(context);
    if (context.kind === 'sheaf') return renderSheafHomologyPanel(context);
    if (context.kind === 'empty') return renderEmptyHomologyPanel();
    return renderVarietyHomologyPanel(context);
  }

  function renderEmptyHomologyPanel() {
    if (refs.homologyActive) refs.homologyActive.textContent = 'Add a variety.';
    hideMapHomologyTools();
    if (refs.homologyGrassmannianBasisRow) refs.homologyGrassmannianBasisRow.hidden = true;
    if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = true;
    if (refs.homologyPointRow) refs.homologyPointRow.hidden = true;
    if (refs.homologySymbols) {
      refs.homologySymbols.hidden = true;
      refs.homologySymbols.innerHTML = '';
    }
    if (refs.homologyRules) {
      refs.homologyRules.hidden = true;
      refs.homologyRules.innerHTML = '';
    }
    if (refs.homologyAddClass) refs.homologyAddClass.hidden = true;
    if (refs.homologyAddRule) refs.homologyAddRule.hidden = true;
    if (refs.homologyMessage) refs.homologyMessage.textContent = '';
  }

  function renderVarietyHomologyPanel(context) {
    const { geometry } = context;
    const defs = homologyClassDefinitions(geometry);
    const baseDefs = baseHomologyClassDefinitions(geometry);
    const hyperplane = baseDefs.find((def) => def.id === HOMOLOGY_HYPERPLANE_CLASS);
    const point = baseDefs.find((def) => def.id === HOMOLOGY_POINT_CLASS);

    if (refs.homologyActive) setInlineMath(refs.homologyActive, homologyActiveLatex(geometry));
    hideMapHomologyTools();
    renderVarietyHomologyExpressionTools(geometry);
    renderGrassmannianBasisToggle(context.variety, geometry);
    if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = !hyperplane;
    if (refs.homologyHyperplaneSymbol && hyperplane) refs.homologyHyperplaneSymbol.value = hyperplane.symbolLatex;
    if (refs.homologyPointRow) refs.homologyPointRow.hidden = !point;
    if (refs.homologyPointSymbol && point) refs.homologyPointSymbol.value = point.symbolLatex;

    renderHomologySymbols(geometry, defs);
    renderHomologyRules(geometry, defs);
    renderHomologyClassCreator(geometry);
    renderHomologyRuleCreator(geometry, defs);
    if (refs.homologyMessage) refs.homologyMessage.textContent = '';
    typeset(refs.homologyCard);
  }

  function renderGrassmannianBasisToggle(variety, geometry) {
    if (!refs.homologyGrassmannianBasisRow) return;
    const show = geometry?.type === 'grassmannian' && !!variety;
    refs.homologyGrassmannianBasisRow.hidden = !show;
    if (show && refs.homologyGrassmannianYoungBasis) {
      refs.homologyGrassmannianYoungBasis.checked = variety.grassmannianYoungBasis === true;
    }
  }

  function renderMapHomologyPanel(context) {
    const map = context.map;
    const domainGeometry = context.domain.geometry;
    const codomainGeometry = context.codomain.geometry;
    const pullbackDefs = homologyPullbackClassDefinitionsForMap(codomainGeometry)
      .map((def) => mapOperationHomologyClassDefinition(map, 'pullback', def, domainGeometry))
      .filter(Boolean);
    const pushforwardDefs = mapPushforwardClassDefinitions(map, domainGeometry, codomainGeometry);
    const relationDefs = [
      ...pullbackDefs.map((def) => ({ def, geometry: domainGeometry, variety: context.domain.variety })),
      ...pushforwardDefs.map((def) => ({ def, geometry: codomainGeometry, variety: context.codomain.variety }))
    ];
    if (refs.homologyActive) setInlineMath(refs.homologyActive, homologyMapActiveLatex(context));
    renderMapHomologyTools(context);
    if (refs.homologyGrassmannianBasisRow) refs.homologyGrassmannianBasisRow.hidden = true;
    if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = true;
    if (refs.homologyPointRow) refs.homologyPointRow.hidden = true;
    if (refs.homologySymbols) {
      refs.homologySymbols.hidden = true;
      refs.homologySymbols.innerHTML = '';
    }
    if (refs.homologyAddClass) refs.homologyAddClass.hidden = true;
    if (refs.homologyAddRule) refs.homologyAddRule.hidden = true;
    renderMapHomologyRuleInputs(relationDefs);
    if (refs.homologyMessage) refs.homologyMessage.textContent = abelJacobiHomologyMessage(context);
    typeset(refs.homologyCard);
  }

  function abelJacobiHomologyMessage(context) {
    const aj = abelJacobiMapContext(context?.map);
    if (!aj) return '';
    const genus = numericalCurveGenus(aj.curveGeometry);
    const hasSymplecticBasis = genus === 0 || !!aj.curve.homology?.symplecticBasisConfirmed;
    return hasSymplecticBasis
      ? 'Abel-Jacobi defaults include theta on the Jacobian and matching symplectic bases on the curve and its Jacobian.'
      : 'Use a positive numerical genus below 10 so the symplectic bases can be added.';
  }

  function renderSheafHomologyPanel(context) {
    const { sheafObject, sheaf, geometry, result } = context;
    if (refs.homologyActive) setInlineMath(refs.homologyActive, homologySheafActiveLatex(context));
    renderSheafHomologyTools(context);
    if (refs.homologyGrassmannianBasisRow) refs.homologyGrassmannianBasisRow.hidden = true;
    if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = true;
    if (refs.homologyPointRow) refs.homologyPointRow.hidden = true;
    if (refs.homologySymbols) {
      refs.homologySymbols.hidden = true;
      refs.homologySymbols.innerHTML = '';
    }
    if (refs.homologyAddClass) refs.homologyAddClass.hidden = true;
    if (refs.homologyAddRule) refs.homologyAddRule.hidden = true;
    ensureSheafHomologySystem(sheafObject, geometry);
    renderSheafHomologyRuleInputs(sheafHomologyClassDefinitions(sheaf, geometry), result?.bundle?.defaultSheafHomologyRules || []);
    if (refs.homologyMessage) refs.homologyMessage.textContent = '';
    typeset(refs.homologyCard);
  }

  function hideMapHomologyTools() {
    if (refs.homologyMapTools) refs.homologyMapTools.hidden = true;
    if (refs.homologyExpressionChart) refs.homologyExpressionChart.innerHTML = '';
    clearHomologyMonomialAssignmentForm();
    updateHomologyExpressionTransposeButton();
  }

  function renderVarietyHomologyExpressionTools(geometry) {
    if (!refs.homologyMapTools) return;
    refs.homologyMapTools.hidden = false;
    if (refs.homologyMapInputMode) {
      refs.homologyMapInputMode.closest('.homology-map-mode-row')?.removeAttribute('hidden');
      refs.homologyMapInputMode.value = state.homologyMapInputMode === 'coefficients' ? 'coefficients' : 'formula';
    }
    if (refs.homologyUpdateAll) refs.homologyUpdateAll.hidden = true;
    if (refs.homologyExpressionPanel) {
      refs.homologyExpressionPanel.open = !!state.homologyMapClassTableOpen;
    }
    renderVarietyHomologyExpressionTable(geometry);
  }

  function renderMapHomologyTools(context) {
    if (!refs.homologyMapTools) return;
    clearHomologyMonomialAssignmentForm();
    refs.homologyMapTools.hidden = false;
    if (refs.homologyMapInputMode) {
      refs.homologyMapInputMode.closest('.homology-map-mode-row')?.removeAttribute('hidden');
      refs.homologyMapInputMode.value = state.homologyMapInputMode === 'coefficients' ? 'coefficients' : 'formula';
    }
    if (refs.homologyUpdateAll) refs.homologyUpdateAll.hidden = false;
    if (refs.homologyExpressionPanel) {
      refs.homologyExpressionPanel.open = !!state.homologyMapClassTableOpen;
    }
    renderMapHomologyExpressionTable(context);
  }

  function renderSheafHomologyTools(context) {
    if (!refs.homologyMapTools) return;
    clearHomologyMonomialAssignmentForm();
    refs.homologyMapTools.hidden = false;
    if (refs.homologyMapInputMode) {
      refs.homologyMapInputMode.closest('.homology-map-mode-row')?.removeAttribute('hidden');
      refs.homologyMapInputMode.value = state.homologyMapInputMode === 'coefficients' ? 'coefficients' : 'formula';
    }
    if (refs.homologyUpdateAll) refs.homologyUpdateAll.hidden = false;
    if (refs.homologyExpressionPanel) {
      refs.homologyExpressionPanel.open = !!state.homologyMapClassTableOpen;
    }
    renderSheafHomologyExpressionTable(context);
  }

  function renderVarietyHomologyExpressionTable(geometry) {
    if (!refs.homologyExpressionChart) return;
    const subjects = [{ label: `\\(H^i(${geometry.labelLatex})\\)`, geometry, assignable: true }];
    refs.homologyExpressionChart.innerHTML = renderHomologyExpressionTableHtml(subjects, geometry.dim || 0);
    updateHomologyExpressionTransposeButton();
  }

  function renderMapHomologyExpressionTable(context) {
    if (!refs.homologyExpressionChart) return;
    const domainGeometry = context.domain.geometry;
    const codomainGeometry = context.codomain.geometry;
    const maxDegree = Math.max(domainGeometry.dim || 0, codomainGeometry.dim || 0);
    const subjects = [
      { label: `\\(H^i(${domainGeometry.labelLatex})\\)`, geometry: domainGeometry },
      { label: `\\(H^i(${codomainGeometry.labelLatex})\\)`, geometry: codomainGeometry }
    ];
    refs.homologyExpressionChart.innerHTML = renderHomologyExpressionTableHtml(subjects, maxDegree);
    updateHomologyExpressionTransposeButton();
  }

  function renderSheafHomologyExpressionTable(context) {
    if (!refs.homologyExpressionChart) return;
    const { geometry } = context;
    const subjects = [{ label: `\\(H^i(${geometry.labelLatex})\\)`, geometry }];
    refs.homologyExpressionChart.innerHTML = renderHomologyExpressionTableHtml(subjects, geometry.dim || 0);
    updateHomologyExpressionTransposeButton();
  }

  function renderHomologyExpressionTableHtml(subjects, maxDegree) {
    if (state.homologyExpressionTransposed) {
      const headCells = Array.from({ length: 2 * maxDegree + 1 }, (_, degree) => `<th scope="col">${degree}</th>`).join('');
      const rows = subjects.map((subject) => `
        <tr>
          <th scope="row">${subject.label}</th>
          ${Array.from({ length: 2 * maxDegree + 1 }, (_, degree) => `<td>${homologyExpressionListHtml(subject.geometry, degree, { assignable: subject.assignable })}</td>`).join('')}
        </tr>
      `).join('');
      return `
        <table class="homology-expression-table">
          <thead>
            <tr>
              <th scope="col">i</th>
              ${headCells}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }
    const subjectHeaders = subjects.map((subject) => `<th scope="col">${subject.label}</th>`).join('');
    const rows = Array.from({ length: 2 * maxDegree + 1 }, (_, degree) => `
      <tr>
        <th scope="row">${degree}</th>
        ${subjects.map((subject) => `<td>${homologyExpressionListHtml(subject.geometry, degree, { assignable: subject.assignable })}</td>`).join('')}
      </tr>
    `).join('');
    return `
      <table class="homology-expression-table">
        <thead>
          <tr>
            <th scope="col">i</th>
            ${subjectHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function updateHomologyExpressionTransposeButton() {
    if (!refs.homologyTransposeExpressions) return;
    refs.homologyTransposeExpressions.setAttribute('aria-pressed', state.homologyExpressionTransposed ? 'true' : 'false');
    refs.homologyTransposeExpressions.textContent = state.homologyExpressionTransposed ? 'vertical' : 'horizontal';
  }

  function homologyExpressionListHtml(geometry, cohomologyDegree, options = {}) {
    const expressions = homologyDisplayMonomialsOfCohomologyDegree(geometry, cohomologyDegree)
      .map((mono) => ({
        ...mono,
        displayLatex: homologyExpressionDisplayLatex(geometry, mono)
      }))
      .filter((mono) => mono.displayLatex !== '0');
    if (!expressions.length) return '<span class="homology-coefficient-empty">0</span>';
    return `<div class="homology-expression-list">${expressions.map((mono) => `
      ${options.assignable && mono.key
        ? `<button class="homology-expression-token" type="button" data-homology-assign-monomial="${escapeHtml(mono.key)}" title="${escapeHtml(mono.plain || '1')}">\\(${mono.displayLatex}\\)</button>`
        : `<span>\\(${mono.displayLatex}\\)</span>`}
    `).join('')}</div>`;
  }

  function homologyExpressionDisplayLatex(geometry, mono) {
    if (!mono?.key) return mono?.latex || '1';
    const original = polyFromPowers(parseMonoKey(mono.key));
    const simplified = applyHomologyRules(original, {
      geometry,
      homology: geometry?.homology,
      homologyRulePasses: Math.max(1, normalizedInt(state.homologyRulePasses, 1, 999, DEFAULT_HOMOLOGY_RULE_PASSES))
    });
    return formatPolyLatex(simplified);
  }

  function homologyDisplayMonomialsOfDegree(geometry, degree, options = {}) {
    const context = productGeometryContext(geometry);
    return homologyMonomialDefinitions(geometry, { maxDegree: degree })
      .filter((mono) => (
        mono.degree === degree
        && (!options.productBidegree || productBidegreesEqual(productHomologyBidegreeForMonomial(mono, geometry, context), options.productBidegree))
      ))
      .sort((left, right) => {
        const byFactors = homologyMonomialFactorCount(right) - homologyMonomialFactorCount(left);
        if (byFactors) return byFactors;
        return left.key.localeCompare(right.key);
      });
  }

  function homologyDisplayMonomialsOfCohomologyDegree(geometry, cohomologyDegree, options = {}) {
    const context = productGeometryContext(geometry);
    return homologyMonomialDefinitions(geometry, { maxDegree: cohomologyDegree / 2 })
      .filter((mono) => (
        mono.cohomologyDegree === cohomologyDegree
        && (!options.productBidegree || productBidegreesEqual(productHomologyBidegreeForMonomial(mono, geometry, context), options.productBidegree))
      ))
      .sort((left, right) => {
        const byFactors = homologyMonomialFactorCount(right) - homologyMonomialFactorCount(left);
        if (byFactors) return byFactors;
        return left.key.localeCompare(right.key);
      });
  }

  function homologyMonomialFactorCount(mono) {
    return Object.values(parseMonoKey(mono?.key || '')).reduce((sum, exp) => sum + exp, 0);
  }

  function renderHomologySymbols(geometry, defs) {
    if (!refs.homologySymbols) return;
    refs.homologySymbols.hidden = defs.length === 0;
    refs.homologySymbols.innerHTML = defs.map((def) => `
      <div class="homology-symbol-row ${def.kind === 'custom' ? 'homology-custom-class-row' : ''}">
        ${def.kind === 'custom' ? `
          <input class="sheaf-input homology-map-rule-input" type="text" value="${escapeHtml(def.symbolLatex)}" maxlength="48" spellcheck="false" autocomplete="off" aria-label="Custom homology class symbol" data-homology-class-symbol="${escapeHtml(def.id)}">
          <input class="sheaf-input homology-map-rule-input" type="number" min="0" max="${2 * geometry.dim}" step="1" value="${escapeHtml(def.cohomologyDegree)}" aria-label="Custom homology class degree" data-homology-class-degree="${escapeHtml(def.id)}">
          <button class="btn btn-ghost homology-rule-delete" type="button" data-homology-class-delete="${escapeHtml(def.id)}">delete</button>
        ` : `
          <span>\\(${def.symbolLatex}\\in H^{${def.cohomologyDegree}}(${geometry.labelLatex})\\)</span>
          <span class="homology-symbol-kind">${escapeHtml(def.kind)}</span>
        `}
      </div>
    `).join('');
  }

  function renderHomologyRules(geometry, defs) {
    if (!refs.homologyRules) return;
    const available = new Set(defs.flatMap((def) => [...homologyDefVariableIds(def, geometry)]));
    const rules = (geometry.homology?.rules || []).filter((rule) => (
      homologyRulePreservesDegree(rule, defs, { geometry })
      && homologyRuleUsesAvailableVariables(rule, available)
    ));
    defineHomologyVariables(geometry);
    refs.homologyRules.hidden = rules.length === 0;
    refs.homologyRules.innerHTML = rules.map((rule) => `
      <div class="homology-rule-row" data-rule-id="${escapeHtml(rule.id)}">
        <label class="homology-rule-toggle">
          <input type="checkbox" data-homology-rule-toggle="${escapeHtml(rule.id)}" ${rule.enabled !== false ? 'checked' : ''}>
          <span>\\(${homologyRuleLatex(rule, geometry)}\\)</span>
        </label>
        ${rule.builtin ? '<span class="homology-symbol-kind">standard</span>' : `<button class="btn btn-ghost homology-rule-delete" type="button" data-homology-rule-delete="${escapeHtml(rule.id)}">delete</button>`}
      </div>
    `).join('');
  }

  function renderMapHomologyRuleInputs(geometryOrRelations, defs = null) {
    const relations = Array.isArray(defs)
      ? defs.map((def) => ({ def, geometry: geometryOrRelations }))
      : (geometryOrRelations || []);
    refs.homologyRules.hidden = !relations.length;
    if (!relations.length) {
      refs.homologyRules.innerHTML = '';
      return;
    }
    const coefficientMode = state.homologyMapInputMode === 'coefficients';
    const rows = relations.map(({ def, geometry }) => {
      const storedRule = storedMapHomologyRuleForDef(geometry, def);
      const automaticRule = storedRule || automaticMapHomologyRuleForDef(geometry, def);
      return {
        stored: !!automaticRule,
        html: coefficientMode
          ? renderMapHomologyCoefficientRow(def, geometry, automaticRule)
          : renderMapHomologyFormulaRow(def, geometry, automaticRule)
      };
    });
    const savedRows = rows.filter((row) => row.stored).map((row) => row.html);
    const waitingRows = rows.filter((row) => !row.stored).map((row) => row.html);
    refs.homologyRules.innerHTML = [
      ...savedRows,
      savedRows.length && waitingRows.length ? '<div class="homology-rule-separator" aria-hidden="true"></div>' : '',
      ...waitingRows
    ].filter(Boolean).join('');
  }

  function renderMapHomologyFormulaRow(def, geometry, storedRule = storedMapHomologyRuleForDef(geometry, def)) {
    defineHomologyVariables(geometry);
    const rule = mapHomologyRuleForDef(geometry, def);
    const value = rule ? formatHomologyInputPoly(homologyRuleRhsPoly(rule)) : '';
    const checked = rule?.builtin ? ' checked' : '';
    if (storedRule) return renderSavedMapHomologyRow(def, geometry, storedRule);
    return `
      <div class="homology-rule-row is-map-relation is-waiting">
        <span>\\(${def.symbolLatex}=\\)</span>
        <input class="sheaf-input homology-map-rule-input" type="text" value="${escapeHtml(value)}" placeholder="0" spellcheck="false" autocomplete="off" aria-label="Right side for ${escapeHtml(latexToPlain(def.symbolLatex))}" data-map-homology-rule="${escapeHtml(def.id)}" data-map-homology-variety="${escapeHtml(geometry.varietyId || '')}">
        <label class="homology-map-assign-toggle">
          <input type="checkbox" data-map-homology-assign aria-label="Include this relation when updating"${checked}>
        </label>
      </div>
    `;
  }

  function renderMapHomologyCoefficientRow(def, geometry, storedRule = storedMapHomologyRuleForDef(geometry, def)) {
    defineHomologyVariables(geometry);
    const rule = mapHomologyRuleForDef(geometry, def);
    if (storedRule) return renderSavedMapHomologyRow(def, geometry, storedRule);
    const coefficients = rule ? homologyRuleCoefficientMap(rule) : new Map();
    const checked = rule?.builtin ? ' checked' : '';
    const terms = homologyDisplayMonomialsOfDegree(geometry, def.degree, {
      productBidegree: def.productBidegree
    });
    const editor = terms.length
      ? terms.map((mono, index) => `
          ${index ? '<span class="homology-coefficient-plus">+</span>' : ''}
          <label class="homology-coefficient-term">
            <input class="sheaf-input homology-coefficient-input" type="text" value="${escapeHtml(coefficients.get(mono.key) || '')}" placeholder="0" spellcheck="false" autocomplete="off" aria-label="Coefficient of ${escapeHtml(mono.plain || '1')} in ${escapeHtml(latexToPlain(def.symbolLatex))}" data-map-homology-coeff data-monomial-key="${escapeHtml(mono.key)}">
            <span>\\(${mono.latex || '1'}\\)</span>
          </label>
        `).join('')
      : '<span class="homology-coefficient-empty">0</span>';
    return `
      <div class="homology-rule-row is-map-relation is-waiting">
        <span>\\(${def.symbolLatex}=\\)</span>
        <div class="homology-coefficient-editor" data-map-homology-coeff-editor data-map-homology-rule="${escapeHtml(def.id)}" data-map-homology-variety="${escapeHtml(geometry.varietyId || '')}">
          ${editor}
        </div>
        <label class="homology-map-assign-toggle">
          <input type="checkbox" data-map-homology-assign aria-label="Include this relation when updating"${checked}>
        </label>
      </div>
    `;
  }

  function renderSavedMapHomologyRow(def, geometry, rule) {
    return `
      <div class="homology-rule-row is-map-relation is-saved">
        <span>\\(${def.symbolLatex}=\\)</span>
        <span>\\(${formatPolyLatex(homologyRuleRhsPoly(rule))}\\)</span>
        ${rule.builtin
          ? '<span class="homology-symbol-kind">known</span>'
          : `<button class="btn btn-ghost homology-rule-delete" type="button" data-homology-rule-delete="${escapeHtml(rule.id)}">delete</button>`}
      </div>
    `;
  }

  function renderSheafHomologyRuleInputs(defs, defaultRules = []) {
    if (!refs.homologyRules) return;
    refs.homologyRules.hidden = !defs?.length;
    if (!defs?.length) {
      refs.homologyRules.innerHTML = '';
      return;
    }
    if (defaultRules.length) {
      renderSheafHomologyDefaultRules(defs, defaultRules);
      return;
    }
    const coefficientMode = state.homologyMapInputMode === 'coefficients';
    const rows = defs.map((def) => {
      const storedRule = storedSheafHomologyRuleForDef(def);
      return {
        stored: !!storedRule,
        html: storedRule
          ? renderSavedSheafHomologyRow(def, storedRule)
          : (coefficientMode
              ? renderSheafHomologyCoefficientRow(def, defaultRules)
              : renderSheafHomologyFormulaRow(def, defaultRules))
      };
    });
    const savedRows = rows.filter((row) => row.stored).map((row) => row.html);
    const waitingRows = rows.filter((row) => !row.stored).map((row) => row.html);
    refs.homologyRules.innerHTML = [
      ...savedRows,
      savedRows.length && waitingRows.length ? '<div class="homology-rule-separator" aria-hidden="true"></div>' : '',
      ...waitingRows
    ].filter(Boolean).join('');
  }

  function renderSheafHomologyDefaultRules(defs, defaultRules) {
    const context = activeHomologySheafContext();
    refs.homologyRules.innerHTML = defs.map((def) => {
      defineHomologyVariables(def.geometry);
      defineSheafClassVariable(def);
      const rule = sheafHomologyRuleForDef(def, defaultRules);
      const value = rule ? formatPolyLatex(homologyRuleRhsPoly(rule)) : '0';
      const action = renderSheafHomologySpecialAction(def, context);
      return `
        <div class="homology-rule-row is-map-relation">
          <span>\\(${def.symbolLatex}=\\)</span>
          <span>\\(${value}\\)</span>
          ${action}
        </div>
      `;
    }).join('');
  }

  function renderSheafHomologySpecialAction(def, context = activeHomologySheafContext()) {
    if (tangentChernClassRowCanAdd(context, def.degree)) {
      return `<button class="btn btn-ghost homology-rule-delete" type="button" data-add-tangent-chern-class="${escapeHtml(def.degree)}">add class</button>`;
    }
    return '<span class="homology-symbol-kind">special</span>';
  }

  function renderSavedSheafHomologyRow(def, rule) {
    return `
      <div class="homology-rule-row is-map-relation is-saved">
        <span>\\(${def.symbolLatex}=\\)</span>
        <span>\\(${formatPolyLatex(homologyRuleRhsPoly(rule))}\\)</span>
        ${rule.builtin
          ? '<span class="homology-symbol-kind">special</span>'
          : `<button class="btn btn-ghost homology-rule-delete" type="button" data-homology-rule-delete="${escapeHtml(rule.id)}">delete</button>`}
      </div>
    `;
  }

  function renderSheafHomologyFormulaRow(def, defaultRules = []) {
    defineHomologyVariables(def.geometry);
    defineSheafClassVariable(def);
    const rule = sheafHomologyRuleForDef(def, defaultRules);
    const value = rule ? formatHomologyInputPoly(homologyRuleRhsPoly(rule)) : '';
    const disabled = rule?.builtin ? 'disabled' : '';
    const checked = value ? ' checked' : '';
    return `
      <div class="homology-rule-row is-map-relation">
        <span>\\(${def.symbolLatex}=\\)</span>
        <input class="sheaf-input homology-map-rule-input" type="text" value="${escapeHtml(value)}" placeholder="0" spellcheck="false" autocomplete="off" aria-label="Right side for ${escapeHtml(latexToPlain(def.symbolLatex))}" data-sheaf-homology-rule="${escapeHtml(def.id)}" ${disabled}>
        ${rule?.builtin
          ? '<span class="homology-symbol-kind">special</span>'
          : `<label class="homology-map-assign-toggle">
              <input type="checkbox" data-sheaf-homology-assign aria-label="Include this relation when updating"${checked}>
            </label>`}
      </div>
    `;
  }

  function renderSheafHomologyCoefficientRow(def, defaultRules = []) {
    defineHomologyVariables(def.geometry);
    defineSheafClassVariable(def);
    const rule = sheafHomologyRuleForDef(def, defaultRules);
    const coefficients = rule ? homologyRuleCoefficientMap(rule) : new Map();
    const terms = homologyDisplayMonomialsOfDegree(def.sourceGeometry || def.geometry, def.degree);
    const disabled = rule?.builtin ? 'disabled' : '';
    const checked = coefficients.size ? ' checked' : '';
    const editor = terms.length
      ? terms.map((mono, index) => `
          ${index ? '<span class="homology-coefficient-plus">+</span>' : ''}
          <label class="homology-coefficient-term">
            <input class="sheaf-input homology-coefficient-input" type="text" value="${escapeHtml(coefficients.get(mono.key) || '')}" placeholder="0" spellcheck="false" autocomplete="off" aria-label="Coefficient of ${escapeHtml(mono.plain || '1')} in ${escapeHtml(latexToPlain(def.symbolLatex))}" data-sheaf-homology-coeff data-monomial-key="${escapeHtml(mono.key)}" ${disabled}>
            <span>\\(${mono.latex || '1'}\\)</span>
          </label>
        `).join('')
      : '<span class="homology-coefficient-empty">0</span>';
    return `
      <div class="homology-rule-row is-map-relation">
        <span>\\(${def.symbolLatex}=\\)</span>
        <div class="homology-coefficient-editor" data-sheaf-homology-coeff-editor data-sheaf-homology-rule="${escapeHtml(def.id)}">
          ${editor}
        </div>
        ${rule?.builtin
          ? '<span class="homology-symbol-kind">special</span>'
          : `<label class="homology-map-assign-toggle">
              <input type="checkbox" data-sheaf-homology-assign aria-label="Include this relation when updating"${checked}>
            </label>`}
      </div>
    `;
  }

  function homologyRuleCoefficientMap(rule) {
    const out = new Map();
    sortedTerms(homologyRuleRhsPoly(rule)).forEach(([key, coeff]) => {
      out.set(key, formatFractionPlain(coeff));
    });
    return out;
  }

  function sheafHomologyClassDefinitions(sheaf, geometry) {
    if (!sheaf || !geometry) return [];
    const basis = normalizeBasisValue(sheaf.basis);
    const prefix = defaultSheafVariablePrefix(sheaf);
    const labelLatex = sheafLabelLatex(sheaf);
    const labelPlain = sheafLabelPlain(sheaf);
    const numericRank = numericRankFromPlain(sheaf.rankPlain);
    const maxIndex = basis === 'character' && numericRank != null
      ? Math.min(geometry.dim, numericRank)
      : geometry.dim;
    const kind = basis === 'character' ? 'character' : 'chern';
    const ruleGeometry = sheafHomologyGeometry(sheaf, geometry);
    return Array.from({ length: maxIndex }, (_, index) => {
      const degree = index + 1;
      const id = `${prefix}${basis === 'character' ? 'ch' : 'c'}${degree}`;
      return {
        id,
        degree,
        cohomologyDegree: 2 * degree,
        kind,
        geometry: ruleGeometry,
        sourceGeometry: geometry,
        sheafObject: sheaf.sourceObject || sheaf,
        variableId: id,
        symbolLatex: basis === 'character'
          ? `\\operatorname{ch}_{${degree}}(${labelLatex})`
          : `c_{${degree}}(${labelLatex})`,
        symbolPlain: basis === 'character'
          ? `ch_${degree}(${labelPlain})`
          : `c_${degree}(${labelPlain})`
      };
    });
  }

  function defineSheafClassVariable(def) {
    defineVariable(def.id, def.degree, def.symbolLatex, {
      cohomologyDegree: def.cohomologyDegree ?? Math.round(2 * def.degree)
    });
    return def.id;
  }

  function sheafHomologyRuleForDef(def, defaultRules = []) {
    defineSheafClassVariable(def);
    const defaultRule = mapHomologyRuleForVariable(defaultRules, def.id, { includeBuiltin: true });
    if (defaultRule) return defaultRule;
    return storedSheafHomologyRuleForDef(def);
  }

  function storedSheafHomologyRuleForDef(def) {
    const sheafObject = def?.sheafObject || selectedSheaf();
    const homology = sheafObject ? ensureSheafHomologySystem(sheafObject, def.sourceGeometry || def.geometry) : null;
    return (homology?.rules || []).find((rule) => (
      !rule.builtin
      && rule.lhs?.powers
      && Object.keys(rule.lhs.powers).length === 1
      && rule.lhs.powers[def?.id] === 1
    )) || null;
  }

  function mapHomologyRuleForDef(geometry, def) {
    const stored = storedMapHomologyRuleForDef(geometry, def);
    if (stored) return stored;
    const variableId = homologyDefVariableId(def, geometry);
    const defaultRule = defaultMapHomologyRulesForGeometry(geometry)
      .find((rule) => rule.lhs?.powers?.[variableId] === 1);
    if (defaultRule) return defaultRule;
    const mapVariable = VARS.get(variableId) || ensureMapHomologyVariableFromId(variableId);
    if (mapVariable?.kind === 'mapHomology' && mapVariable.operation === 'pushforward') {
      const map = state.maps.find((item) => sameMapId(item.id, mapVariable.mapId));
      const rule = map ? defaultPointPushforwardRules(map, geometry)
        .find((item) => item.lhs?.powers?.[variableId] === 1) : null;
      if (rule) return rule;
    }
    const mapClass = parseMapHomologyClassId(def.id);
    const map = mapClass?.operation === 'pullback' && mapClass.sourceClassId === HOMOLOGY_UNIT_CLASS
      ? state.maps.find((item) => item.id === mapClass.mapId)
      : null;
    return map ? defaultPullbackUnitRule(map) : null;
  }

  function automaticMapHomologyRuleForDef(geometry, def) {
    const rule = mapHomologyRuleForDef(geometry, def);
    return rule?.builtin && String(rule.id || '').startsWith('default-abel-jacobi-') ? rule : null;
  }

  function storedMapHomologyRuleForDef(geometry, def) {
    const variableId = homologyDefVariableId(def, geometry);
    return (geometry.homology?.rules || []).find((rule) => (
      !rule.builtin
      && rule.lhs?.powers
      && Object.keys(rule.lhs.powers).length === 1
      && rule.lhs.powers[variableId] === 1
    )) || null;
  }

  function setMapHomologyRuleFromInput(input, options = {}) {
    resetHomologyRulePasses();
    const context = mapHomologyRelationContext(input);
    if (!context) return false;
    const value = String(input.value || '').trim();
    if (!value) {
      return clearMapHomologyRule(context, options);
    }
    let rhs;
    try {
      rhs = parseHomologyExpression(value, context.geometry, { side: 'right' });
    } catch (error) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid right side.';
      return false;
    }
    return saveMapHomologyRuleTerms(context, serializeHomologyPoly(rhs), options);
  }

  function setMapHomologyRuleFromCoefficientEditor(editor, options = {}) {
    resetHomologyRulePasses();
    const context = mapHomologyRelationContext(editor);
    if (!context) return false;
    const terms = [];
    for (const input of editor.querySelectorAll('[data-map-homology-coeff]')) {
      const raw = String(input.value || '').trim();
      if (!raw) continue;
      let coefficient;
      try {
        coefficient = parseRuleCoefficient(raw);
      } catch (error) {
        if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid coefficient.';
        return false;
      }
      if (coefficient.isZero()) continue;
      terms.push({
        coefficient: formatFractionPlain(coefficient),
        powers: parseMonoKey(input.dataset.monomialKey || '')
      });
    }
    return saveMapHomologyRuleTerms(context, terms, options);
  }

  function updateAllHomologyAssignments() {
    const context = activeHomologyContext();
    if (context.kind === 'map') {
      updateAllMapHomologyAssignments();
      return;
    }
    if (context.kind === 'sheaf') {
      updateAllSheafHomologyAssignments(context);
    }
  }

  function updateAllMapHomologyAssignments() {
    if (!refs.homologyRules) return;
    const controls = state.homologyMapInputMode === 'coefficients'
      ? Array.from(refs.homologyRules.querySelectorAll('[data-map-homology-coeff-editor]'))
      : Array.from(refs.homologyRules.querySelectorAll('input[data-map-homology-rule]'));
    let changed = 0;
    let skipped = 0;
    for (const control of controls) {
      if (!mapHomologyControlShouldUpdate(control)) {
        skipped += 1;
        continue;
      }
      if (state.homologyMapInputMode === 'coefficients') {
        if (setMapHomologyRuleFromCoefficientEditor(control, { deferRecompute: true })) changed += 1;
      } else if (setMapHomologyRuleFromInput(control, { deferRecompute: true })) changed += 1;
    }
    recompute();
    if (refs.homologyMessage) {
      refs.homologyMessage.textContent = changed
        ? `Updated ${changed} relation${changed === 1 ? '' : 's'}.`
        : (skipped ? 'No checked relations changed.' : 'No relations changed.');
    }
  }

  function mapHomologyControlShouldUpdate(control) {
    const row = control.closest?.('.homology-rule-row');
    const toggle = row?.querySelector('[data-map-homology-assign]');
    return !toggle || toggle.checked;
  }

  function sheafHomologyControlShouldUpdate(control) {
    const row = control.closest?.('.homology-rule-row');
    const toggle = row?.querySelector('[data-sheaf-homology-assign]');
    return !toggle || toggle.checked;
  }

  function updateAllSheafHomologyAssignments(context = activeHomologySheafContext()) {
    if (!refs.homologyRules || !context) return;
    const controls = state.homologyMapInputMode === 'coefficients'
      ? Array.from(refs.homologyRules.querySelectorAll('[data-sheaf-homology-coeff-editor]'))
      : Array.from(refs.homologyRules.querySelectorAll('input[data-sheaf-homology-rule]'));
    let changed = 0;
    let skipped = 0;
    for (const control of controls) {
      if (!sheafHomologyControlShouldUpdate(control)) {
        skipped += 1;
        continue;
      }
      if (state.homologyMapInputMode === 'coefficients') {
        if (setSheafHomologyRuleFromCoefficientEditor(control, context, { deferRecompute: true })) changed += 1;
      } else if (setSheafHomologyRuleFromInput(control, context, { deferRecompute: true })) changed += 1;
    }
    recompute();
    if (refs.homologyMessage) {
      refs.homologyMessage.textContent = changed
        ? `Updated ${changed} relation${changed === 1 ? '' : 's'}.`
        : (skipped ? 'No checked relations changed.' : 'No relations changed.');
    }
  }

  function assignmentTermsChanged(before, nextTerms) {
    const beforeTerms = serializeHomologyRuleTerms(before?.rhs || []);
    const next = serializeHomologyRuleTerms(nextTerms || []);
    return beforeTerms !== next;
  }

  function serializeHomologyRuleTerms(terms) {
    try {
      return JSON.stringify((terms || [])
        .map((term) => ({
          coefficient: formatFractionPlain(parseRuleCoefficient(term.coefficient || '1')),
          powers: monoKey(term.powers || {})
        }))
        .sort((left, right) => left.powers.localeCompare(right.powers) || left.coefficient.localeCompare(right.coefficient)));
    } catch (_) {
      return JSON.stringify(terms || []);
    }
  }

  function mapHomologyRelationContext(control) {
    const varietyId = control.dataset.mapHomologyVariety || activeHomologyVariety()?.id;
    const variety = state.varieties.find((item) => item.id === varietyId) || null;
    if (!variety) return null;
    const geometry = geometryFromVariety(variety);
    if (!geometry) return null;
    const def = homologyClassDefinitions(geometry).find((item) => item.id === control.dataset.mapHomologyRule);
    return def ? { variety, geometry, def } : null;
  }

  function setSheafHomologyRuleFromInput(input, context, options = {}) {
    resetHomologyRulePasses();
    const relation = sheafHomologyRelationContext(input, context);
    if (!relation) return false;
    const value = String(input.value || '').trim();
    if (!value) return clearSheafHomologyRule(relation, options);
    let rhs;
    try {
      rhs = parseHomologyExpression(value, relation.geometry, { side: 'right' });
    } catch (error) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid right side.';
      return false;
    }
    return saveSheafHomologyRuleTerms(relation, serializeHomologyPoly(rhs), options);
  }

  function setSheafHomologyRuleFromCoefficientEditor(editor, context, options = {}) {
    resetHomologyRulePasses();
    const relation = sheafHomologyRelationContext(editor, context);
    if (!relation) return false;
    const terms = [];
    for (const input of editor.querySelectorAll('[data-sheaf-homology-coeff]')) {
      const raw = String(input.value || '').trim();
      if (!raw) continue;
      let coefficient;
      try {
        coefficient = parseRuleCoefficient(raw);
      } catch (error) {
        if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid coefficient.';
        return false;
      }
      if (coefficient.isZero()) continue;
      terms.push({
        coefficient: formatFractionPlain(coefficient),
        powers: parseMonoKey(input.dataset.monomialKey || '')
      });
    }
    return saveSheafHomologyRuleTerms(relation, terms, options);
  }

  function sheafHomologyRelationContext(control, context = activeHomologySheafContext()) {
    if (!context) return null;
    const defId = control.dataset.sheafHomologyRule;
    const def = sheafHomologyClassDefinitions(context.sheaf, context.geometry).find((item) => item.id === defId);
    return def ? { ...context, def, geometry: def.geometry, sourceGeometry: def.sourceGeometry || context.geometry } : null;
  }

  function clearMapHomologyRule(context, options = {}) {
    const { variety, geometry, def } = context;
    const homology = ensureHomologySystem(variety, geometry);
    const variableId = homologyDefVariableId(def, geometry);
    const before = homology.rules.length;
    homology.rules = withoutMapHomologyRuleForVariable(homology.rules, variableId);
    finishMapHomologyRuleUpdate(options);
    return homology.rules.length !== before;
  }

  function clearSheafHomologyRule(context, options = {}) {
    const { sheafObject, def, geometry } = context;
    const homology = ensureSheafHomologySystem(sheafObject, context.sourceGeometry || geometry);
    const before = homology.rules.length;
    homology.rules = withoutMapHomologyRuleForVariable(homology.rules, def.id);
    finishSheafHomologyRuleUpdate(options);
    return homology.rules.length !== before;
  }

  function saveMapHomologyRuleTerms(context, rhsTerms, options = {}) {
    const { variety, geometry, def } = context;
    const variableId = homologyDefVariableId(def, geometry);
    const rule = {
      id: `map-rule-${def.id}`,
      builtin: false,
      enabled: true,
      lhs: { powers: { [variableId]: 1 } },
      rhs: rhsTerms
    };
    const defs = homologyClassDefinitions(geometry);
    if (!homologyRulePreservesDegree(rule, defs, { geometry })) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = 'Rule degrees must match.';
      return false;
    }
    const homology = ensureHomologySystem(variety, geometry);
    const storedBefore = mapHomologyRuleForVariable(homology.rules, variableId);
    const before = storedBefore || mapHomologyRuleForDef(geometry, def);
    homology.rules = withoutMapHomologyRuleForVariable(homology.rules, variableId);
    homology.rules.push(rule);
    finishMapHomologyRuleUpdate(options);
    return !storedBefore || assignmentTermsChanged(before, rule.rhs);
  }

  function saveSheafHomologyRuleTerms(context, rhsTerms, options = {}) {
    const { sheafObject, def, geometry } = context;
    defineSheafClassVariable(def);
    const rule = {
      id: `sheaf-rule-${def.id}`,
      builtin: false,
      enabled: true,
      lhs: { powers: { [def.id]: 1 } },
      rhs: rhsTerms
    };
    const defs = [...homologyClassDefinitions(geometry), def];
    if (!homologyRulePreservesDegree(rule, defs, { geometry })) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = 'Rule degrees must match.';
      return false;
    }
    const homology = ensureSheafHomologySystem(sheafObject, context.sourceGeometry || geometry);
    const before = mapHomologyRuleForVariable(homology.rules, def.id);
    homology.rules = withoutMapHomologyRuleForVariable(homology.rules, def.id);
    homology.rules.push(rule);
    finishSheafHomologyRuleUpdate(options);
    return !before || assignmentTermsChanged(before, rule.rhs);
  }

  function mapHomologyRuleForVariable(rules, variableId, options = {}) {
    return (rules || []).find((rule) => (
      (options.includeBuiltin || !rule.builtin)
      && rule.lhs?.powers
      && Object.keys(rule.lhs.powers).length === 1
      && rule.lhs.powers[variableId] === 1
    )) || null;
  }

  function withoutMapHomologyRuleForVariable(rules, variableId) {
    return withoutHomologyRuleForVariable(rules, variableId);
  }

  function withoutHomologyRuleForVariable(rules, variableId, options = {}) {
    return (rules || []).filter((rule) => !(
      (options.includeBuiltin || !rule.builtin)
      && rule.lhs?.powers
      && Object.keys(rule.lhs.powers).length === 1
      && rule.lhs.powers[variableId] === 1
    ));
  }

  function withoutHomologyRuleForMonomial(rules, key) {
    const normalizedKey = monoKey(parseMonoKey(key));
    return (rules || []).filter((rule) => !(
      !rule.builtin
      && rule.lhs?.powers
      && monoKey(rule.lhs.powers) === normalizedKey
    ));
  }

  function finishMapHomologyRuleUpdate(options = {}) {
    if (!options.deferRecompute) recompute();
    if (refs.homologyMessage) refs.homologyMessage.textContent = 'Updated relation.';
  }

  function finishSheafHomologyRuleUpdate(options = {}) {
    if (!options.deferRecompute) recompute();
    if (refs.homologyMessage) refs.homologyMessage.textContent = 'Updated relation.';
  }

  function renderHomologyRuleCreator(geometry, defs) {
    if (!refs.homologyAddRule) return;
    refs.homologyAddRule.hidden = defs.length === 0;
    if (defs.length === 0) return;
    if (refs.homologyRuleEquation) {
      refs.homologyRuleEquation.placeholder = defaultHomologyRulePlaceholder(geometry);
    }
  }

  function renderHomologyClassCreator(geometry) {
    if (!refs.homologyAddClass) return;
    refs.homologyAddClass.hidden = !geometry;
    if (refs.homologyClassDegree && geometry) {
      refs.homologyClassDegree.max = String(2 * geometry.dim);
      refs.homologyClassDegree.value = String(normalizedInt(refs.homologyClassDegree.value, 0, 2 * geometry.dim, Math.min(2, 2 * geometry.dim)));
    }
    if (refs.homologyClassSymbol && geometry && !refs.homologyClassSymbol.value) {
      refs.homologyClassSymbol.placeholder = nextHomologyClassSymbol(geometry.homology, geometry);
    }
  }

  function homologyActiveLatex(geometry) {
    const context = activeHomologyMapContext();
    if (!context) return `\\text{classes on } ${geometry.labelLatex}`;
    if (geometry.varietyId === context.domain.variety.id) {
      const mapName = sanitizeMathLabel(context.map.name, 'f');
      return `${mapPullbackOperatorLatex(context.map)}\\text{ relations for codomain classes}\\quad(${mapName}:${context.domain.geometry.labelLatex}\\to ${context.codomain.geometry.labelLatex})`;
    }
    if (geometry.varietyId === context.codomain.variety.id) {
      const mapName = sanitizeMathLabel(context.map.name, 'f');
      return `${mapPushforwardOperatorLatex(context.map)}\\text{ relations for domain classes}\\quad(${mapName}:${context.domain.geometry.labelLatex}\\to ${context.codomain.geometry.labelLatex})`;
    }
    return `\\text{classes on } ${geometry.labelLatex}`;
  }

  function homologyMapActiveLatex(context) {
    const mapName = sanitizeMathLabel(context.map.name, 'f');
    const arrow = `${mapName}:${context.domain.geometry.labelLatex}\\to ${context.codomain.geometry.labelLatex}`;
    return `${mapPullbackOperatorLatex(context.map)}\\text{ and }${mapPushforwardOperatorLatex(context.map)}\\text{ relations}\\quad(${arrow})`;
  }

  function homologySheafActiveLatex(context) {
    return `\\text{class relations for } ${sheafLabelLatex(context.sheaf)}\\quad\\text{on }${context.geometry.labelLatex}`;
  }

  function homologyRuleLatex(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleLhsLatex(rule, geometry)}=${formatPolyLatex(homologyRuleRhsPoly(rule))}`;
  }

  function homologyRulePlain(rule, geometry) {
    return homologyRulePlainEquation(rule, geometry);
  }

  function renderStatusLine(extra = '') {
    if (!refs.status) return;
    const countText = [
      `${state.varieties.length} variet${state.varieties.length === 1 ? 'y' : 'ies'}`,
      `${state.sheaves.length} ${state.sheaves.length === 1 ? 'sheaf' : 'sheaves'}`,
      `${state.maps.length} map${state.maps.length === 1 ? '' : 's'}`,
      `${(state.sequences || []).length} SES`
    ].concat(extra ? [extra] : []).join(' · ');
    const invariants = visibleGlobalInvariants();
    refs.status.innerHTML = `${escapeHtml(countText)}${invariants.length ? renderGlobalInvariantChips(invariants) : ''}`;
    if (invariants.length) typeset(refs.status);
  }

  function visibleGlobalInvariants() {
    refreshGlobalInvariantReferences();
    return (state.globalInvariants || []).filter((invariant) => !invariant.auto || globalInvariantReferences(invariant).length || invariant.hasValue);
  }

  function renderGlobalInvariantChips(invariants) {
    return `<span class="global-invariant-list">${invariants.map((invariant) => {
      const active = invariant.id === state.activeGlobalInvariantId ? ' is-active' : '';
      const replaced = invariant.hasValue && invariant.replaceWithValue ? ' is-replaced' : '';
      const chipValue = globalInvariantChipValue(invariant);
      const label = `${symbolToLatex(invariant.name)}${chipValue ? `\\mapsto ${chipValue}` : ''}`;
      return `<button class="global-invariant-chip${active}${replaced}" type="button" data-global-invariant-id="${escapeHtml(invariant.id)}" title="${escapeHtml(formatGlobalInvariantReferences(invariant))}">\\(${label}\\)</button>`;
    }).join('')}</span>`;
  }

  function renderResult(result) {
    const { geometry, bundle } = result;
    const badgeParts = [];
    if (geometry) badgeParts.push(geometry.labelLatex);
    if (bundle) badgeParts.push(bundle.labelLatex);
    setInlineMath(refs.objectBadge, badgeParts.length ? badgeParts.join(',\\ ') : '\\text{empty}');
    const basis = basisStatusLabel(result.sheaf?.basis);
    renderStatusLine(bundle ? `${basis} basis` : '');
    setInlineMath(refs.ringSummary, geometry ? `A^*(${geometry.labelLatex})_{\\le ${geometry.dim}}` : '\\text{add a variety}');
    renderHomologyPanel(result);
    if (result.classRows.length) {
      if (refs.classActions) refs.classActions.hidden = false;
      if (refs.furtherSimplify) refs.furtherSimplify.textContent = `further simplify (${result.classDisplay?.homologyRulePasses || DEFAULT_HOMOLOGY_RULE_PASSES})`;
      syncClassDisplayControls(result);
      refs.classChart.hidden = false;
      refs.classMessage.hidden = true;
      refs.classChart.innerHTML = result.classRows.map((row) => `
        <div class="sheaf-formula-row">
          <span class="sheaf-formula-label">\\(${row.labelLatex}\\)</span>
          <span class="sheaf-formula-value">\\(${row.latex}\\)</span>
        </div>
      `).join('');
      refs.classMessage.textContent = '';
    } else {
      if (refs.classActions) refs.classActions.hidden = true;
      refs.basisRow.hidden = true;
      if (refs.rootFormRow) refs.rootFormRow.hidden = true;
      if (refs.classTermRow) refs.classTermRow.hidden = true;
      refs.classChart.hidden = true;
      refs.classChart.innerHTML = '';
      refs.classMessage.className = 'hint';
      refs.classMessage.hidden = false;
      refs.classMessage.textContent = classChartEmptyMessage();
    }
    if (result.hodge) {
      if (refs.hodgeActions) refs.hodgeActions.hidden = false;
      refs.hodgeChart.hidden = false;
      refs.hodgeMessage.hidden = false;
      renderHodgeChart(result);
    } else {
      if (refs.hodgeActions) refs.hodgeActions.hidden = true;
      refs.hodgeChart.hidden = true;
      refs.hodgeChart.innerHTML = '';
      refs.hodgeMessage.hidden = false;
      refs.hodgeMessage.textContent = hodgeChartEmptyMessage();
    }
    renderSheafCohomologyChart(result);
    syncChartRevealControls(result);
    typeset(refs.classChart);
    typeset(refs.cohomologyChart);
    typeset(refs.hodgeChart);
    renderCanvas(result);
  }

  function classChartEmptyMessage() {
    if (inputIsCreateMode()) {
      if (currentInputKind() === 'sheaf') return state.draftSheafBaseVarietyId
        ? 'Set the sheaf data, then click add to create it.'
        : 'Pick a base variety on the canvas to start the sheaf.';
      if (currentInputKind() === 'map') return 'Finish creating the map; characteristic classes use a modified sheaf.';
      return 'Switch to Modify and choose a sheaf for characteristic classes.';
    }
    return 'Select a sheaf for characteristic classes.';
  }

  function hodgeChartEmptyMessage() {
    if (inputIsCreateMode()) return 'Add a variety, then switch to Modify to inspect its Hodge numbers.';
    return 'Select a variety for Hodge numbers.';
  }

  function cohomologyChartEmptyMessage() {
    if (inputIsCreateMode()) {
      if (currentInputKind() === 'sheaf') return state.draftSheafBaseVarietyId
        ? 'Set the sheaf data, then click add to create it.'
        : 'Pick a base variety on the canvas to start the sheaf.';
      return 'Switch to Modify and choose a sheaf or variety for sheaf cohomology.';
    }
    return 'Select a sheaf or variety for sheaf cohomology.';
  }

  function renderSheafCohomologyChart(result) {
    if (!refs.cohomologyChart || !refs.cohomologyMessage) return;
    const cohomology = result?.cohomology;
    const dimensions = cohomology?.dimensions;
    if (!dimensions?.length) {
      if (refs.cohomologyActions) refs.cohomologyActions.hidden = true;
      refs.cohomologyChart.hidden = true;
      refs.cohomologyChart.innerHTML = '';
      refs.cohomologyMessage.hidden = false;
      refs.cohomologyMessage.textContent = cohomology?.message || cohomologyChartEmptyMessage();
      return;
    }
    const dimOnly = !!refs.cohomologyDimOnly?.checked;
    if (refs.cohomologyActions) refs.cohomologyActions.hidden = false;
    refs.cohomologyChart.hidden = false;
    refs.cohomologyMessage.hidden = false;
    const subject = cohomology.subjectLatex || '\\mathcal{F}';
    const valueLabel = dimOnly ? `\\dim H^i(${result.geometry.labelLatex},${subject})` : `H^i(${result.geometry.labelLatex},${subject})`;
    const indexCells = dimensions.map((_, i) => `<td>\\(${i}\\)</td>`).join('');
    const valueCells = dimensions.map((entry) => `<td>\\(${dimOnly ? entry.latex : cohomologyGroupLatex(entry.latex)}\\)</td>`).join('');
    refs.cohomologyChart.innerHTML = `
      <table class="cohomology-table">
        <tbody>
          <tr><th>\\(i\\)</th>${indexCells}</tr>
          <tr><th>\\(${valueLabel}\\)</th>${valueCells}</tr>
        </tbody>
      </table>`;
    refs.cohomologyMessage.textContent = cohomology.message || '';
  }

  function cohomologyGroupLatex(dimensionLatex) {
    const numeric = parseSimpleLatexNumber(dimensionLatex);
    if (numeric?.isZero()) return '0';
    if (numeric?.isOne()) return '\\mathbb{C}';
    const body = cohomologyExponentLatex(dimensionLatex);
    return `\\mathbb{C}^{${body}}`;
  }

  function cohomologyExponentLatex(value) {
    const text = String(value || '0').trim();
    if (/^[A-Za-z0-9_{}\\^,]+$/.test(text) || parseSimpleLatexNumber(text)) return text;
    return `\\left(${text}\\right)`;
  }

  function setInlineMath(element, latex) {
    element.innerHTML = `\\(${latex}\\)`;
    typeset(element);
  }

  function renderHodgeChart(result) {
    const d = result.geometry.dim;
    const entries = result.hodge.entries;
    const expanded = state.hodgeExpanded;
    const chiOffset = expanded && d > 0 ? -d - 1 : 0;
    const leftPaddingCols = expanded && d > 0 ? Math.max(2 * d, -chiOffset) : 0;
    const hodgeOffset = expanded ? leftPaddingCols : 0;
    const hodgeEndCol = hodgeOffset + 2 * d + 1;
    const chiEndCol = expanded ? hodgeOffset + chiOffset + 2 * d + 1 : hodgeEndCol;
    const totalCols = Math.max(hodgeEndCol, chiEndCol);
    const rowOffset = expanded ? 1 : 0;
    const totalRows = 2 * d + 1 + rowOffset;
    const boardCells = [];
    const connectorCells = [];
    const diagonalLines = [];
    const bettiCol = totalCols + 2;
    const shortenLine = (x1, y1, x2, y2, amount = 0.42) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      if (!length || length <= amount * 2) return { x1, y1, x2, y2 };
      const ux = dx / length;
      const uy = dy / length;
      const round = (value) => Number(value.toFixed(3));
      return {
        x1: round(x1 + ux * amount),
        y1: round(y1 + uy * amount),
        x2: round(x2 - ux * amount),
        y2: round(y2 - uy * amount)
      };
    };
    const hodgeGridPosition = (p, q) => ({
      row: 2 * d - (p + q) + 1 + rowOffset,
      col: hodgeOffset + d + p - q + 1
    });
    const chiGridColumn = (p) => hodgeOffset + chiOffset + 2 * p + 1;
    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const { row, col } = hodgeGridPosition(p, q);
        boardCells.push(`<span class="hodge-cell" style="grid-row:${row};grid-column:${col};" title="h^${p},${q}">\\(${entries[p][q].latex}\\)</span>`);
      }
    }
    if (expanded) {
      const connectorKeys = new Set();
      const addBettiConnector = (p, q) => {
        const { row, col } = hodgeGridPosition(p, q);
        const startCol = Math.min(col, bettiCol);
        const endCol = Math.max(col, bettiCol);
        if (endCol - startCol < 2) return;
        const key = `${row}:${startCol}:${endCol}`;
        if (connectorKeys.has(key)) return;
        connectorKeys.add(key);
        connectorCells.push(`<span class="hodge-betti-line" style="grid-row:${row};grid-column:${startCol + 1}/${endCol};"></span>`);
      };
      for (let p = 0; p <= d; p++) addBettiConnector(p, 0);
      for (let q = 0; q <= d; q++) addBettiConnector(d, q);
      for (let p = 0; p <= d; p++) {
        const hodge = hodgeGridPosition(p, d);
        const chiCol = chiGridColumn(p);
        const line = shortenLine(hodge.col - 0.5, hodge.row - 0.5, chiCol - 0.5, 0.5);
        diagonalLines.push(`<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"></line>`);
      }
      hodgeChiDisplays(result).forEach((chi, p) => {
        const col = chiGridColumn(p);
        boardCells.push(`<span class="hodge-chi" style="grid-row:1;grid-column:${col};">\\(${chi}\\)</span>`);
      });
      const eulerDisplay = hodgeEulerDisplay(result);
      const eulerClass = parseSimpleLatexNumber(eulerDisplay) == null ? '' : ' is-number';
      boardCells.push(`<span class="hodge-euler${eulerClass}" style="grid-row:1;grid-column:${bettiCol};">\\(${eulerDisplay}\\)</span>`);
      hodgeBettiDisplays(result).forEach((betti, k) => {
        const row = 2 * d - k + 1 + rowOffset;
        const bettiClass = parseSimpleLatexNumber(betti) == null ? '' : ' is-number';
        boardCells.push(`<span class="hodge-betti${bettiClass}" style="grid-row:${row};grid-column:${bettiCol};">\\(${betti}\\)</span>`);
      });
    }
    const expandedClass = expanded ? ' is-expanded' : '';
    if (refs.hodgeExpanded) refs.hodgeExpanded.checked = expanded;
    syncHodgeCellSizeControl();
    refs.hodgeChart.setAttribute('aria-expanded', String(expanded));
    refs.hodgeChart.innerHTML = `
      <div class="hodge-frame${expandedClass}">
        <div class="hodge-board${expandedClass}" style="--hodge-cell:${state.hodgeCellSize}px;--hodge-row:${state.hodgeCellSize}px;--hodge-total-cols:${totalCols};--hodge-cols:${2 * d + 1};--hodge-rows:${totalRows};">
          ${expanded ? `<svg class="hodge-diagonal-guides" viewBox="0 0 ${totalCols} ${totalRows}" style="grid-row:1/${totalRows + 1};grid-column:1/${totalCols + 1};">${diagonalLines.join('')}</svg>` : ''}
          ${connectorCells.join('')}${boardCells.join('')}
        </div>
      </div>`;
    refs.hodgeMessage.textContent = result.hodge.message;
  }

  function toggleHodgeExpanded() {
    state.hodgeExpanded = !state.hodgeExpanded;
    if (state.lastResult?.hodge) {
      renderHodgeChart(state.lastResult);
      typeset(refs.hodgeChart);
    }
  }

  function setHodgeWide(enabled) {
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    state.hodgeWide = !!enabled && canUseWide;
    syncHodgeWidePlacement();
  }

  function setHodgeCellSize(value) {
    state.hodgeCellSize = normalizedInt(value, 15, 30, 20);
    syncHodgeCellSizeControl();
    const board = refs.hodgeChart?.querySelector('.hodge-board');
    if (board) {
      board.style.setProperty('--hodge-cell', `${state.hodgeCellSize}px`);
      board.style.setProperty('--hodge-row', `${state.hodgeCellSize}px`);
    }
  }

  function syncHodgeCellSizeControl() {
    if (refs.hodgeCellSize) refs.hodgeCellSize.value = String(state.hodgeCellSize);
    if (refs.hodgeCellSizeValue) refs.hodgeCellSizeValue.textContent = `${state.hodgeCellSize}px`;
  }

  function syncHodgeWidePlacement() {
    const card = refs.hodgeCard;
    const sideAnchor = refs.hodgeSideAnchor;
    const wideHost = refs.hodgeWideHost;
    if (!card || !sideAnchor || !wideHost) return;
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    if (!canUseWide) state.hodgeWide = false;
    if (state.hodgeWide) {
      if (card.parentElement !== wideHost) wideHost.appendChild(card);
    } else if (sideAnchor.parentElement && card.parentElement !== sideAnchor.parentElement) {
      sideAnchor.insertAdjacentElement('afterend', card);
    }
    card.classList.toggle('wide', state.hodgeWide);
    wideHost.hidden = !state.hodgeWide;
    if (refs.toggleHodgeWide) {
      refs.toggleHodgeWide.textContent = state.hodgeWide ? 'side' : 'wide';
      refs.toggleHodgeWide.setAttribute('aria-pressed', state.hodgeWide ? 'true' : 'false');
      refs.toggleHodgeWide.disabled = !canUseWide;
    }
  }

  function hodgeChiDisplays(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') {
      const variety = result.geometry.labelLatex;
      return Array.from({ length: d + 1 }, (_, p) => {
        if (p === 0) return `\\chi(\\mathcal{O}_{${variety}})`;
        if (p === d) return `\\chi(\\omega_{${variety}})`;
        if (p === 1) return `\\chi(\\Omega_{${variety}})`;
        return `\\chi(\\Omega_{${variety}}^{${p}})`;
      });
    }
    return hodgeChiExpressions(result.hodge.entries, d);
  }

  function hodgeBettiDisplays(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') {
      return Array.from({ length: 2 * d + 1 }, (_, k) => `b_{${k}}`);
    }
    return hodgeBettiExpressions(result.hodge.entries, d);
  }

  function hodgeEulerDisplay(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') return 'e';
    let total = Fraction.zero();
    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const value = parseSimpleLatexNumber(result.hodge.entries[p][q].latex);
        if (value == null) return 'e';
        total = total.add(value.mul(fraction((p + q) % 2 === 0 ? 1 : -1)));
      }
    }
    return formatFractionLatex(total);
  }

  function hodgeBettiExpressions(entries, d) {
    const out = [];
    for (let k = 0; k <= 2 * d; k++) {
      const terms = [];
      const pMin = Math.max(0, k - d);
      const pMax = Math.min(d, k);
      for (let p = pMin; p <= pMax; p++) {
        const q = k - p;
        terms.push({ ...entries[p][q], sign: 1 });
      }
      out[k] = formatHodgeExpressionLatex(terms);
    }
    return out;
  }

  function hodgeChiExpressions(entries, d) {
    const out = [];
    for (let p = 0; p <= d; p++) {
      const terms = [];
      for (let q = 0; q <= d; q++) {
        terms.push({ ...entries[p][q], sign: q % 2 === 0 ? 1 : -1 });
      }
      out[p] = formatHodgeExpressionLatex(terms);
    }
    return out;
  }

  function formatHodgeExpressionLatex(terms) {
    let numeric = Fraction.zero();
    const symbolic = new Map();
    for (const term of terms) {
      const sign = term.sign < 0 ? -1 : 1;
      const numericValue = parseSimpleLatexNumber(term.latex);
      if (numericValue) {
        numeric = numeric.add(numericValue.mul(fraction(sign)));
        continue;
      }
      if (!term.latex || term.latex === '0') continue;
      const current = symbolic.get(term.latex) || Fraction.zero();
      symbolic.set(term.latex, current.add(fraction(sign)));
    }
    const pieces = [];
    if (!numeric.isZero()) pieces.push({ coeff: numeric, body: '' });
    for (const [latex, coeff] of symbolic.entries()) {
      if (!coeff.isZero()) pieces.push({ coeff, body: latex });
    }
    if (!pieces.length) return '0';
    let out = '';
    pieces.forEach((piece, index) => {
      const sign = piece.coeff.sign();
      const body = hodgeTermBodyLatex(piece.body, piece.coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function hodgeTermBodyLatex(body, coeff) {
    if (!body) return coeff.toLatexAbs();
    if (coeff.isOne()) return body;
    return `${coeff.toLatexAbs()}\\,${body}`;
  }

  function parseSimpleLatexNumber(latex) {
    const text = String(latex || '').trim();
    if (!text || text === '0') return Fraction.zero();
    const integer = text.match(/^-?\d+$/);
    if (integer) return fraction(BigInt(integer[0]));
    const fracMatch = text.match(/^-?\\frac\{(\d+)\}\{(\d+)\}$/);
    if (fracMatch) {
      const sign = text.startsWith('-') ? -1n : 1n;
      return fraction(sign * BigInt(fracMatch[1]), BigInt(fracMatch[2]));
    }
    return null;
  }

  function renderCanvas(result) {
    const canvas = refs.canvas;
    if (!canvas) return;
    syncShowCanvasButton();
    const wrap = canvas.parentElement;
    const measuredWidth = wrap.clientWidth || canvas.getBoundingClientRect?.().width || 760;
    const cssWidth = Math.max(1, Math.floor(measuredWidth));
    const cssHeight = cssWidth < 620 ? 330 : 280;
    const ratio = window.devicePixelRatio || 1;
    canvas.style.setProperty('height', `${cssHeight}px`, 'important');
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    state.canvasWidth = cssWidth;
    state.canvasHeight = cssHeight;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    drawCanvasBackground(ctx, cssWidth, cssHeight);
    if (!visibleCanvasVarieties().length && !visibleCanvasSheaves().length) {
      renderCanvasMessage(cssWidth, cssHeight, hasHiddenCanvasObjects() ? '\\text{Labels hidden}' : '\\text{Add a variety}');
      return;
    }
    ensureCanvasLabelPositions(cssWidth, cssHeight);
    drawSheafBaseLines(ctx, cssWidth, cssHeight);
    drawMapArrows(ctx, cssWidth, cssHeight);
    drawShortExactSequenceTailArrows(ctx, cssWidth, cssHeight);
    renderCanvasLabels(cssWidth, cssHeight);
  }

  function redrawCanvasSurface() {
    const canvas = refs.canvas;
    if (!canvas || !state.canvasWidth || !state.canvasHeight) return;
    const ratio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    drawCanvasBackground(ctx, state.canvasWidth, state.canvasHeight);
    if (!visibleCanvasVarieties().length && !visibleCanvasSheaves().length) {
      if (hasHiddenCanvasObjects()) renderCanvasMessage(state.canvasWidth, state.canvasHeight, '\\text{Labels hidden}');
      return;
    }
    ensureCanvasLabelPositions(state.canvasWidth, state.canvasHeight);
    drawSheafBaseLines(ctx, state.canvasWidth, state.canvasHeight);
    drawMapArrows(ctx, state.canvasWidth, state.canvasHeight);
    drawShortExactSequenceTailArrows(ctx, state.canvasWidth, state.canvasHeight);
  }

  function renderCanvasMessage(width, height, latex) {
    if (!refs.canvasLabels) return;
    syncShowCanvasButton();
    refs.canvasLabels.innerHTML = `<div class="sheaf-canvas-label" style="left:${width / 2}px;top:${height / 2}px;color:var(--accent2);">\\(${latex}\\)</div>`;
    typeset(refs.canvasLabels);
  }

  function visibleCanvasVarieties() {
    return state.varieties.filter((variety) => !variety.hiddenOnCanvas);
  }

  function visibleCanvasSheaves() {
    return state.sheaves.filter((sheaf) => !sheaf.hiddenOnCanvas);
  }

  function visibleCanvasMaps() {
    return state.maps.filter((map) => !map.hiddenOnCanvas);
  }

  function renderCanvasLabels(width, height) {
    if (!refs.canvasLabels) return;
    syncShowCanvasButton();
    const labels = canvasOverviewLabels(width, height);
    const controls = mapCurveControlLabels(labels, width, height);
    const sequenceControls = shortExactSequenceTailControls(labels, width, height);
    refs.canvasLabels.innerHTML = labels.map((label) => `
      <div class="${label.className || 'sheaf-canvas-label'}" style="left:${label.x}px;top:${label.y}px;max-width:${label.maxWidth}px;" ${label.objectKind ? `data-object-kind="${label.objectKind}" data-object-id="${escapeHtml(label.objectId)}" role="button" tabindex="0" aria-label="${escapeHtml(label.ariaLabel || label.main)}"` : ''}>
        <span>\\(${label.main}\\)</span>
      </div>
    `).join('') + sequenceControls.map((control) => control.type === 'label' ? `
      <button class="${control.className}" type="button" style="left:${control.x}px;top:${control.y}px;max-width:${control.maxWidth || 80}px;" data-object-kind="sequence" data-object-id="${escapeHtml(control.sequenceId)}" data-sequence-tail-control="${escapeHtml(control.control)}" aria-label="${escapeHtml(control.ariaLabel)}" title="${escapeHtml(control.title)}"><span>\\(${control.main}\\)</span></button>
    ` : `
      <button class="${control.className}" type="button" style="left:${control.x}px;top:${control.y}px;" data-sequence-id="${escapeHtml(control.sequenceId)}" data-sequence-tail-control="${escapeHtml(control.control)}" aria-label="${escapeHtml(control.ariaLabel)}" title="${escapeHtml(control.title)}" ${control.disabled ? 'disabled' : ''}></button>
    `).join('') + controls.map((control) => `
      <button class="${control.className || 'sheaf-map-control'}" type="button" style="left:${control.x}px;top:${control.y}px;" data-map-id="${escapeHtml(control.mapId)}" data-map-control="${escapeHtml(control.control)}" aria-label="${escapeHtml(control.ariaLabel)}" title="${escapeHtml(control.title)}" ${control.disabled ? 'disabled' : ''}></button>
    `).join('');
    typeset(refs.canvasLabels);
  }

  function canvasOverviewLabels(width, height) {
    const labels = canvasObjectLabels(width, height);
    const showSelection = inputIsModifyMode();
    visibleCanvasMaps().forEach((map) => {
      const endpoints = mapEndpointLabels(map, labels);
      if (!endpoints) return;
      const pos = mapLabelPosition(map, endpoints, width, height);
      const name = sanitizeMathLabel(map.name, 'f');
      const classes = ['sheaf-canvas-label', 'is-map'];
      if (showSelection && map.id === state.activeMapId) classes.push('is-active');
      if (sheafMapOperationInputMode()) {
        if (state.sheafMapDraft?.mapId === map.id) classes.push('is-active');
        else if (state.canvasPickEnabled && state.sheafMapPickTarget === 'map' && allowableSheafMapOperationMap(map.id)) classes.push('is-pick-candidate');
      }
      if (sheafIdealInputMode()) {
        if (state.sheafIdealDraft?.mapId === map.id) classes.push('is-active');
        else if (state.canvasPickEnabled && allowableSheafIdealMapPick(map.id)) classes.push('is-pick-candidate');
      }
      if (mapCompositionInputMode()) {
        const ids = mapDraftMapIds();
        if (ids[0] === map.id) classes.push('is-map-domain');
        if (ids[1] === map.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && ids[0] !== map.id && ids[1] !== map.id && allowableMapCompositionPick(map.id)) classes.push('is-pick-candidate');
      }
      if (combinedSesCreateMode()) {
        const draft = sesDraftIds();
        if (draft.mapABId === map.id) classes.push('is-map-domain');
        if (draft.mapBCId === map.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && allowableSesMapPick(map.id, state.sesPickTarget)) classes.push('is-pick-candidate');
      }
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: 96,
        main: name,
        ariaLabel: `map ${latexToPlain(name)}`,
        className: classes.join(' '),
        objectKind: 'map',
        objectId: map.id
      });
    });
    return labels;
  }

  function shortExactSequenceTailControls(labels, width, height) {
    const labelMap = canvasLabelMap(labels);
    return (state.sequences || []).flatMap((sequence) => {
      if (sequence.type !== 'short-exact-sequence') return [];
      if (sequence.tail?.hiddenOnCanvas) return [];
      const rightId = sequence.sheafIds?.[2];
      const right = rightId ? labelMap.get(`sheaf:${rightId}`) : null;
      const geometry = right ? shortExactSequenceTailGeometry(sequence, right, width, height) : null;
      if (!geometry) return [];
      const path = geometry.path;
      const lastIndex = path?.anchors?.length ? path.anchors.length - 1 : sequenceTailEndAnchorIndex(sequence);
      const active = inputIsModifyMode() && sequence.id === state.activeSequenceId;
      const controls = [{
        sequenceId: sequence.id,
        control: 'label',
        type: 'label',
        main: '+1',
        x: geometry.label.x,
        y: geometry.label.y,
        maxWidth: 54,
        className: `sheaf-canvas-label is-map is-sequence-tail-label${sequence.id === state.activeSequenceId ? ' is-active' : ''}`,
        title: 'Modify this short exact sequence. Right-click to hide the +1 tail.',
        ariaLabel: 'modify short exact sequence plus one tail'
      }];
      if (active && path) {
        if (sequenceTailPointCount(sequence.tail) !== STRAIGHT_MAP_POINT_COUNT) {
          sequenceTailHandleControls(path, sequence.id).forEach((control) => controls.push(control));
        }
        path.anchors.forEach((anchor, index) => {
          controls.push({
            sequenceId: sequence.id,
            control: `anchor:${index}`,
            x: anchor.x,
            y: anchor.y,
            className: `sheaf-map-control is-anchor${index === 0 ? ' is-endpoint' : ''}${index === lastIndex ? ' is-sequence-tail-end' : ''}`,
            disabled: index === 0,
            title: index === 0 ? 'endpoint follows the final sheaf' : (index === lastIndex ? 'drag empty target of the +1 tail' : 'drag tail point'),
            ariaLabel: index === 0 ? 'source endpoint for short exact sequence plus one tail' : (index === lastIndex ? 'empty target for short exact sequence plus one tail' : 'anchor point for short exact sequence tail')
          });
        });
      }
      return controls;
    });
  }

  function sequenceTailHandleControls(path, sequenceId) {
    const lastIndex = path.anchors.length - 1;
    const controls = [];
    path.anchors.forEach((anchor, index) => {
      if (index === 0) {
        addSequenceTailHandleControl(controls, path.outHandles[index], sequenceId, `handle:${index}:out`, 'outgoing');
        return;
      }
      if (index === lastIndex) {
        addSequenceTailHandleControl(controls, path.inHandles[index], sequenceId, `handle:${index}:in`, 'incoming');
        return;
      }
      addSequenceTailHandleControl(controls, path.inHandles[index], sequenceId, `handle:${index}:in`, 'incoming');
      addSequenceTailHandleControl(controls, path.outHandles[index], sequenceId, `handle:${index}:out`, 'outgoing');
    });
    return controls;
  }

  function addSequenceTailHandleControl(controls, point, sequenceId, control, directionLabel) {
    if (!point) return;
    controls.push({
      sequenceId,
      control,
      className: 'sheaf-map-control is-handle',
      x: point.x,
      y: point.y,
      title: `drag ${directionLabel} +1 tail handle`,
      ariaLabel: `${directionLabel} control handle for short exact sequence plus one tail`
    });
  }

  function canvasObjectLabels(width, height) {
    const compact = width < 620;
    const layout = canvasOverviewLayout(width, height, compact);
    const labels = [];
    const showSelection = inputIsModifyMode();
    const varieties = visibleCanvasVarieties();
    const sheaves = visibleCanvasSheaves();
    varieties.forEach((variety, index) => {
      const rect = layout.varietyNodes[index] || layout.varietyPanel;
      const pos = canvasLabelPosition(variety, 'variety', rect, width, height, index, varieties.length);
      const name = sanitizeMathLabel(variety.name, 'X');
      const classes = ['sheaf-canvas-label', 'is-variety'];
      if (showSelection && !state.activeSheafId && !state.activeMapId && variety.id === state.activeVarietyId) classes.push('is-active');
      const activeEndpointRole = activeMapEndpointRole('variety', variety.id);
      if (activeEndpointRole === 'domain') classes.push('is-map-domain');
      else if (activeEndpointRole === 'codomain') classes.push('is-map-codomain');
      if (productVarietyInputMode()) {
        const productIds = productDraftFactorIds();
        if (productIds[0] === variety.id) classes.push('is-map-domain');
        if (productIds[1] === variety.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && productIds[0] !== variety.id && productIds[1] !== variety.id && productCanPickVariety(variety.id)) {
          classes.push('is-pick-candidate');
        }
      }
      if (combinedBlowupCreateMode()) {
        const base = blowupDraftVariety('base');
        const point = blowupDraftVariety('point');
        if (base?.id === variety.id) classes.push('is-map-domain');
        if (point?.id === variety.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && allowableBlowupPick(variety.id, state.blowupPickTarget)) classes.push('is-pick-candidate');
      }
      if (combinedGrassmannianTautologicalSesCreateMode()) {
        const base = tautologicalSesDraftBase();
        if (base?.id === variety.id) classes.push('is-active');
        else if (state.canvasPickEnabled && allowableTautologicalSesBasePick(variety.id)) classes.push('is-pick-candidate');
      }
      const creatingMapOperationSheaf = sheafMapOperationInputMode() && inputIsCreateMode();
      if (state.canvasPickEnabled && sheafBasePickInputMode() && allowableSheafBase(variety.id)) classes.push('is-pick-candidate');
      if (currentInputKind() === 'sheaf' && inputIsCreateMode() && !creatingMapOperationSheaf && state.draftSheafBaseVarietyId === variety.id) classes.push('is-active');
      if (ordinaryMapInputMode() && !sheafMapInputMode()) {
        const domain = mapDraftEndpointObject('domain');
        const codomain = mapDraftEndpointObject('codomain');
        if (domain?.id === variety.id) classes.push('is-map-domain');
        else if (codomain?.id === variety.id) classes.push('is-map-codomain');
        else if (state.canvasPickEnabled) classes.push(state.mapPickTarget === 'codomain' ? 'is-map-codomain-candidate' : 'is-pick-candidate');
      }
      if (abelJacobiMapInputMode()) {
        const sourceCurve = mapDraftAbelJacobiCurve();
        if (sourceCurve?.id === variety.id) classes.push('is-map-domain');
        else if (state.canvasPickEnabled && allowableAbelJacobiCurvePick(variety.id)) classes.push('is-pick-candidate');
      }
      if (sheafMapOperationInputMode() && sheafMapDraftBase()?.id === variety.id) classes.push('is-active');
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `variety ${latexToPlain(name)}`,
        className: classes.join(' '),
        objectKind: 'variety',
        objectId: variety.id
      });
    });
    sheaves.forEach((sheaf, index) => {
      const rect = layout.sheafNodes[index] || layout.sheafPanel;
      const pos = canvasLabelPosition(sheaf, 'sheaf', rect, width, height, index, sheaves.length);
      const name = sanitizeMathLabel(sheaf.name, '\\mathcal{E}');
      const classes = ['sheaf-canvas-label', 'is-sheaf'];
      if (showSelection && sheaf.id === state.activeSheafId) classes.push('is-active');
      const activeEndpointRole = activeMapEndpointRole('sheaf', sheaf.id);
      if (activeEndpointRole === 'domain') classes.push('is-map-domain');
      else if (activeEndpointRole === 'codomain') classes.push('is-map-codomain');
      if (sheafBinaryInputMode()) {
        const ids = sheafBinaryDraftIds();
        if (ids[0] === sheaf.id) classes.push('is-map-domain');
        if (ids[1] === sheaf.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && ids[0] !== sheaf.id && ids[1] !== sheaf.id && allowableSheafBinaryPick(sheaf.id)) classes.push('is-pick-candidate');
      }
      if (sheafSelfSumInputMode()) {
        const parent = sheafSelfSumDraftSheaf();
        if (parent?.id === sheaf.id) classes.push('is-active');
        else if (state.canvasPickEnabled && allowableSheafSelfSumPick(sheaf.id)) classes.push('is-pick-candidate');
      }
      if (combinedSesCreateMode()) {
        const draft = sesDraftIds();
        if (draft.sheafAId === sheaf.id) classes.push('is-map-domain');
        if (draft.sheafBId === sheaf.id) classes.push('is-active');
        if (draft.sheafCId === sheaf.id) classes.push('is-map-codomain');
        if (state.canvasPickEnabled && allowableSesSheafPick(sheaf.id, state.sesPickTarget)) classes.push('is-pick-candidate');
      }
      if (combinedGrassmannianMapCreateMode()) {
        const parent = grassmannianMapDraftSheaf();
        if (parent?.id === sheaf.id) classes.push('is-active');
        else if (state.canvasPickEnabled && allowableGrassmannianMapSheafPick(sheaf.id)) classes.push('is-pick-candidate');
      }
      if (sheafSchurInputMode()) {
        const parent = sheafSchurDraftSheaf();
        if (parent?.id === sheaf.id) classes.push('is-active');
        else if (state.canvasPickEnabled && allowableSheafSchurPick(sheaf.id)) classes.push('is-pick-candidate');
      }
      if (sheafMapOperationInputMode()) {
        if (state.sheafMapDraft?.sheafId === sheaf.id) classes.push('is-active');
        else if (state.canvasPickEnabled && state.sheafMapPickTarget === 'sheaf' && allowableSheafMapOperationSheaf(sheaf.id)) classes.push('is-pick-candidate');
      }
      if (ordinaryMapInputMode() && sheafMapInputMode()) {
        const domain = mapDraftEndpointObject('domain');
        const codomain = mapDraftEndpointObject('codomain');
        if (domain?.id === sheaf.id) classes.push('is-map-domain');
        else if (codomain?.id === sheaf.id) classes.push('is-map-codomain');
        else if (state.canvasPickEnabled) classes.push(state.mapPickTarget === 'codomain' ? 'is-map-codomain-candidate' : 'is-pick-candidate');
      }
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `sheaf ${latexToPlain(name)}`,
        className: classes.join(' '),
        objectKind: 'sheaf',
        objectId: sheaf.id
      });
    });
    return labels;
  }

  function activeMapEndpointRole(kind, id) {
    if (!inputIsModifyMode() || !state.activeMapId) return null;
    const map = selectedMap();
    if (!map) return null;
    if (map.domainKind === kind && map.domainId === id) return 'domain';
    if (map.codomainKind === kind && map.codomainId === id) return 'codomain';
    return null;
  }

  function drawCanvasBackground(ctx, width, height) {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);
  }

  function drawSheafBaseLines(ctx, width, height) {
    const labels = canvasObjectLabels(width, height);
    const labelMap = new Map();
    labels.forEach((label) => {
      if (!label.objectKind || !label.objectId) return;
      labelMap.set(`${label.objectKind}:${label.objectId}`, label);
    });
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 58, 42, 0.65)';
    ctx.lineWidth = 1.6;
    labels.forEach((label) => {
      if (label.objectKind !== 'sheaf') return;
      const sheaf = state.sheaves.find((item) => item.id === label.objectId);
      if (!sheaf?.baseVarietyId) return;
      const base = labelMap.get(`variety:${sheaf.baseVarietyId}`);
      if (!base) return;
      ctx.beginPath();
      ctx.moveTo(label.x, label.y);
      ctx.lineTo(base.x, base.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawMapArrows(ctx, width, height) {
    const labels = canvasObjectLabels(width, height);
    const labelMap = canvasLabelMap(labels);
    ctx.save();
    visibleCanvasMaps().forEach((map) => {
      const from = labelMap.get(`${map.domainKind}:${map.domainId}`);
      const to = labelMap.get(`${map.codomainKind}:${map.codomainId}`);
      if (!from || !to) return;
      drawMapArrow(ctx, map, from, to, map.id === state.activeMapId ? '#8b3a2a' : 'rgba(139,58,42,0.72)', width, height);
    });
    if (state.mapDrag) {
      const from = labelMap.get(`${state.mapDrag.domainKind}:${state.mapDrag.domainId}`);
      if (from) drawArrowFromLabel(ctx, from, state.mapDrag.x, state.mapDrag.y, 'rgba(139,58,42,0.42)');
    }
    ctx.restore();
  }

  function drawShortExactSequenceTailArrows(ctx, width, height) {
    const labels = canvasObjectLabels(width, height);
    const labelMap = canvasLabelMap(labels);
    ctx.save();
    (state.sequences || []).forEach((sequence) => {
      if (sequence.type !== 'short-exact-sequence') return;
      if (sequence.tail?.hiddenOnCanvas) return;
      const rightId = sequence.sheafIds?.[2];
      const right = rightId ? labelMap.get(`sheaf:${rightId}`) : null;
      if (!right) return;
      const geometry = shortExactSequenceTailGeometry(sequence, right, width, height);
      if (!geometry) return;
      const active = sequence.id === state.activeSequenceId;
      const color = active ? '#8b3a2a' : 'rgba(139,58,42,0.7)';
      if (geometry.path) drawBezierPathArrow(ctx, geometry.path, color);
      else drawArrow(ctx, geometry.start.x, geometry.start.y, geometry.end.x, geometry.end.y, color);
      if (active && inputIsModifyMode()) drawSequenceTailGuides(ctx, geometry);
    });
    ctx.restore();
  }

  function drawArrowBetweenLabels(ctx, from, to, color) {
    const endpoints = clippedArrowEndpoints(from, to);
    if (!endpoints) return;
    drawArrow(ctx, endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2, color);
  }

  function drawMapArrow(ctx, map, from, to, color, width, height) {
    const path = mapCurveGeometry(map, from, to, width, height);
    if (!path) {
      drawArrowBetweenLabels(ctx, from, to, color);
      return;
    }
    drawBezierPathArrow(ctx, path, color);
    if (inputIsModifyMode() && map.id === state.activeMapId) {
      drawMapPenGuides(ctx, map, from, to, width, height);
    }
  }

  function drawArrowFromLabel(ctx, from, x2, y2, color) {
    const start = labelEdgePoint(from, x2, y2, 6);
    if (!start || Math.hypot(x2 - start.x, y2 - start.y) < 12) return;
    drawArrow(ctx, start.x, start.y, x2, y2, color);
  }

  function shortExactSequenceTailGeometry(sequence, rightLabel, width, height) {
    if (!sequence || !rightLabel || sequence.tail?.hiddenOnCanvas) return null;
    const tail = normalizeSequenceTailCurve(sequence.tail);
    const bounds = estimatedLabelBounds(rightLabel);
    const defaultStart = {
      x: clamp(rightLabel.x + bounds.halfWidth + 12, 18, width - 18),
      y: clamp(rightLabel.y, 20, height - 20)
    };
    const defaultLength = clamp(width * 0.07, 38, 64);
    const defaultEnd = {
      x: Math.min(width - 18, defaultStart.x + defaultLength),
      y: defaultStart.y
    };
    const end = tail?.end
      ? {
        x: clamp(tail.end.x * width, 14, width - 14),
        y: clamp(tail.end.y * height, 14, height - 14)
      }
      : defaultEnd;
    const start = tail?.end
      ? labelEdgePoint(rightLabel, end.x, end.y, 6) || defaultStart
      : defaultStart;
    if (Math.hypot(end.x - start.x, end.y - start.y) < 16) return null;
    const pointCount = sequenceTailPointCount(tail || sequence.tail);
    const path = sequenceTailPathGeometry(start, end, tail, pointCount, width, height);
    const finalSegment = path?.segments?.[path.segments.length - 1];
    const straightTail = pointCount === STRAIGHT_MAP_POINT_COUNT;
    const midpoint = straightTail
      ? { point: lerpPoint(start, end, 0.5), tangent: { x: end.x - start.x, y: end.y - start.y } }
      : pointOnBezierPathByArcRatio(path, 0.5);
    const labelTangent = midpoint?.tangent || (finalSegment
      ? cubicBezierTangent(finalSegment.start, finalSegment.c1, finalSegment.c2, finalSegment.end, 0.5)
      : { x: end.x - start.x, y: end.y - start.y });
    return {
      start,
      end,
      label: sequenceTailLabelPoint(midpoint.point, labelTangent, width, height),
      labelNormal: sequenceTailLabelNormal(labelTangent),
      path
    };
  }

  function normalizeSequenceTailCurve(tail) {
    if (!tail) return null;
    const pointCount = sequenceTailPointCount(tail);
    const storedAnchors = Array.isArray(tail.anchors)
      ? tail.anchors.map((anchor) => anchor ? normalizedCurvePoint(anchor, 0.5, 0.5) : null)
      : [];
    const storedHandles = Array.isArray(tail.handles)
      ? tail.handles.map((handle) => handle ? normalizedCurvePoint(handle, 0.5, 0.5) : null)
      : [];
    const endIndex = sequenceTailInteriorPointCount(pointCount) + 1;
    const endSource = tail.end || tail.anchor || storedAnchors[endIndex] || (Number.isFinite(tail.x) || Number.isFinite(tail.y) ? tail : null);
    const end = endSource ? normalizedCurvePoint(endSource, 0.86, 0.5) : null;
    const hasLegacyHandle = !!(tail.handle || tail.control);
    const handle = hasLegacyHandle ? normalizedCurvePoint(tail.handle || tail.control, end ? end.x - 0.04 : 0.82, end ? end.y : 0.5) : null;
    const normalized = {
      end,
      anchors: storedAnchors,
      handles: storedHandles,
      bent: !!tail.bent || hasLegacyHandle,
      pointCount
    };
    if (handle) normalized.handle = handle;
    if (tail.hiddenOnCanvas) normalized.hiddenOnCanvas = true;
    return normalized;
  }

  function sequenceTailPointCount(tail) {
    const raw = tail?.pointCount ?? tail?.tailPointCount ?? tail?.points ?? DEFAULT_SEQUENCE_TAIL_POINT_COUNT;
    const numeric = Number(raw);
    if (numeric === STRAIGHT_MAP_POINT_COUNT || numeric === LEGACY_STRAIGHT_MAP_POINT_COUNT) return STRAIGHT_MAP_POINT_COUNT;
    return normalizedInt(raw, 2, MAX_SEQUENCE_TAIL_POINT_COUNT, 2);
  }

  function sequenceTailPointCountFromSliderValue(value) {
    const index = normalizedInt(value, 0, SEQUENCE_TAIL_POINT_COUNT_OPTIONS.length - 1, 0);
    return SEQUENCE_TAIL_POINT_COUNT_OPTIONS[index] ?? DEFAULT_SEQUENCE_TAIL_POINT_COUNT;
  }

  function sequenceTailPointCountSliderValue(count) {
    const normalized = sequenceTailPointCount({ pointCount: count });
    const index = SEQUENCE_TAIL_POINT_COUNT_OPTIONS.indexOf(normalized);
    return index >= 0 ? index : SEQUENCE_TAIL_POINT_COUNT_OPTIONS.indexOf(DEFAULT_SEQUENCE_TAIL_POINT_COUNT);
  }

  function formatSequenceTailPointCount(count) {
    return String(sequenceTailPointCount({ pointCount: count }));
  }

  function sequenceTailInteriorPointCount(tailOrCount) {
    const count = typeof tailOrCount === 'number' ? sequenceTailPointCount({ pointCount: tailOrCount }) : sequenceTailPointCount(tailOrCount);
    return count === STRAIGHT_MAP_POINT_COUNT ? 0 : Math.max(0, count - 2);
  }

  function sequenceTailEndAnchorIndex(sequenceOrTail) {
    const tail = sequenceOrTail?.tail || sequenceOrTail;
    return sequenceTailInteriorPointCount(tail) + 1;
  }

  function sequenceTailPathGeometry(start, end, tail, pointCount, width, height) {
    const count = sequenceTailInteriorPointCount(pointCount);
    const anchors = [start];
    const storedAnchors = Array.isArray(tail?.anchors) ? tail.anchors : [];
    const legacyHandle = tail?.handle
      ? {
        x: tail.handle.x * width,
        y: tail.handle.y * height
      }
      : null;
    for (let index = 1; index <= count; index += 1) {
      if (storedAnchors[index]) {
        anchors.push({
          x: clamp(storedAnchors[index].x * width, 14, width - 14),
          y: clamp(storedAnchors[index].y * height, 14, height - 14)
        });
        continue;
      }
      const t = index / (count + 1);
      const base = lerpPoint(start, end, t);
      if (tail?.bent && legacyHandle) {
        const influence = Math.sin(Math.PI * t);
        anchors.push({
          x: clamp(base.x + (legacyHandle.x - base.x) * influence, 14, width - 14),
          y: clamp(base.y + (legacyHandle.y - base.y) * influence, 14, height - 14)
        });
      } else {
        anchors.push(base);
      }
    }
    anchors.push(end);
    const normalizedAnchors = anchors.map((anchor) => normalizedCurvePoint({ x: anchor.x / Math.max(1, width), y: anchor.y / Math.max(1, height) }, 0.5, 0.5));
    const standardHandles = standardMapHandles(normalizedAnchors, width, height, 0);
    const straight = sequenceTailPointCount({ pointCount }) === STRAIGHT_MAP_POINT_COUNT;
    if (straight) {
      return {
        anchors,
        handles: [],
        outHandles: [],
        inHandles: [],
        segments: Array.from({ length: Math.max(0, anchors.length - 1) }, (_, index) => {
          const segmentStart = anchors[index];
          const segmentEnd = anchors[index + 1];
          return {
            index,
            start: segmentStart,
            c1: lerpPoint(segmentStart, segmentEnd, 1 / 3),
            c2: lerpPoint(segmentStart, segmentEnd, 2 / 3),
            end: segmentEnd
          };
        })
      };
    }
    const normalizedHandles = sequenceTailNormalizedHandles(tail, anchors, legacyHandle, standardHandles, width, height);
    const handles = normalizedHandles.map((point) => point ? anchorToPoint(point, width, height) : null);
    const outHandles = anchors.map((anchor, index) => handles[index] || fallbackRawHandle(anchors, index, true));
    const inHandles = anchors.map((anchor, index) => reflectedHandlePoint(anchor, outHandles[index]) || fallbackRawHandle(anchors, index, false));
    const segments = Array.from({ length: Math.max(0, anchors.length - 1) }, (_, index) => {
      const segmentStart = anchors[index];
      const segmentEnd = anchors[index + 1];
      return {
        index,
        start: segmentStart,
        c1: outHandles[index] || lerpPoint(segmentStart, segmentEnd, 1 / 3),
        c2: inHandles[index + 1] || lerpPoint(segmentStart, segmentEnd, 2 / 3),
        end: segmentEnd
      };
    });
    return { anchors, handles, outHandles, inHandles, segments };
  }

  function sequenceTailNormalizedHandles(tail, anchors, legacyHandle, standardHandles, width, height) {
    const storedHandles = Array.isArray(tail?.handles) ? tail.handles : [];
    if (storedHandles.some(Boolean)) {
      return anchors.map((anchor, index) => storedHandles[index]
        ? normalizedCurvePoint(storedHandles[index], standardHandles[index]?.x ?? anchor.x / Math.max(1, width), standardHandles[index]?.y ?? anchor.y / Math.max(1, height))
        : (standardHandles[index] || normalizedCurvePoint({ x: anchor.x / Math.max(1, width), y: anchor.y / Math.max(1, height) }, 0.5, 0.5)));
    }
    if (tail?.bent && legacyHandle && anchors.length === 2) {
      const start = anchors[0];
      const end = anchors[1];
      const c1 = {
        x: start.x + (legacyHandle.x - start.x) * 2 / 3,
        y: start.y + (legacyHandle.y - start.y) * 2 / 3
      };
      const c2 = {
        x: end.x + (legacyHandle.x - end.x) * 2 / 3,
        y: end.y + (legacyHandle.y - end.y) * 2 / 3
      };
      return [
        normalizedCurvePoint({ x: c1.x / Math.max(1, width), y: c1.y / Math.max(1, height) }, 0.5, 0.5),
        normalizedCurvePoint({ x: (end.x * 2 - c2.x) / Math.max(1, width), y: (end.y * 2 - c2.y) / Math.max(1, height) }, 0.5, 0.5)
      ];
    }
    return standardHandles;
  }

  function parseSequenceTailControlRef(value, sequence) {
    if (value === 'label') return { type: 'label' };
    if (value === 'end') return { type: 'anchor', index: sequenceTailEndAnchorIndex(sequence) };
    return parseMapControlRef(value);
  }

  function sequenceTailAnchorIndex(control, sequence = null) {
    const parsed = parseSequenceTailControlRef(control, sequence);
    return parsed?.type === 'anchor' ? parsed.index : null;
  }

  function ensureSequenceTailCurveState(sequence, width = state.canvasWidth || refs.canvas?.clientWidth || 760, height = state.canvasHeight || refs.canvas?.clientHeight || 280) {
    if (!sequence) return null;
    const geometry = sequenceTailGeometryFromCanvas(sequence, width, height);
    if (!geometry?.path) return null;
    sequence.tail = sequenceTailStateFromPath(sequence.tail, geometry.path, width, height);
    return sequence.tail;
  }

  function sequenceTailStateFromPath(currentTail, path, width, height) {
    const normalized = normalizeSequenceTailCurve(currentTail) || {};
    const anchors = path.anchors.map((anchor) => normalizedCurvePoint({ x: anchor.x / Math.max(1, width), y: anchor.y / Math.max(1, height) }, 0.5, 0.5));
    const handles = path.handles.map((handle, index) => {
      if (handle) return normalizedCurvePoint({ x: handle.x / Math.max(1, width), y: handle.y / Math.max(1, height) }, anchors[index]?.x ?? 0.5, anchors[index]?.y ?? 0.5);
      return null;
    });
    const tail = {
      end: anchors[anchors.length - 1],
      anchors,
      handles,
      pointCount: normalized.pointCount
    };
    if (normalized.hiddenOnCanvas) tail.hiddenOnCanvas = true;
    return tail;
  }

  function sequenceTailWithPointCount(tail, start, end, count, width, height) {
    const normalized = normalizeSequenceTailCurve(tail) || {};
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const oldCount = sequenceTailInteriorPointCount(normalized);
    const newInteriorCount = sequenceTailInteriorPointCount(count);
    const oldEndIndex = oldCount + 1;
    const newEndIndex = newInteriorCount + 1;
    const oldAnchors = Array.isArray(normalized.anchors) ? normalized.anchors : [];
    const oldHandles = Array.isArray(normalized.handles) ? normalized.handles : [];
    const endAnchor = oldAnchors[oldEndIndex] || normalized.end || normalizedCurvePoint({ x: end.x / safeWidth, y: end.y / safeHeight }, 0.86, 0.5);
    const endHandle = oldHandles[oldEndIndex] || null;
    const anchors = [normalizedCurvePoint({ x: start.x / safeWidth, y: start.y / safeHeight }, 0.5, 0.5)];
    const handles = [oldHandles[0] || null];
    const preservedInteriorCount = Math.min(oldCount, newInteriorCount);
    for (let index = 1; index <= newInteriorCount; index += 1) {
      const t = index / (newInteriorCount + 1);
      anchors[index] = (index <= preservedInteriorCount && oldAnchors[index]) || normalizedCurvePoint({
        x: (start.x + (end.x - start.x) * t) / safeWidth,
        y: (start.y + (end.y - start.y) * t) / safeHeight
      }, 0.5, 0.5);
      handles[index] = index <= preservedInteriorCount ? (oldHandles[index] || null) : null;
    }
    anchors[newEndIndex] = endAnchor;
    handles[newEndIndex] = endHandle;
    return {
      end: endAnchor,
      anchors,
      handles,
      pointCount: sequenceTailPointCount({ pointCount: count }),
      ...(normalized.hiddenOnCanvas ? { hiddenOnCanvas: true } : {})
    };
  }

  function sequenceTailLabelNormal(tangent) {
    const length = Math.hypot(tangent?.x || 0, tangent?.y || 0) || 1;
    return {
      x: (tangent?.y || 0) / length,
      y: -(tangent?.x || 0) / length
    };
  }

  function sequenceTailLabelPoint(point, tangent, width, height) {
    const normal = sequenceTailLabelNormal(tangent);
    const offset = 14;
    return {
      x: clamp(point.x + normal.x * offset, 14, width - 14),
      y: clamp(point.y + normal.y * offset, 14, height - 14)
    };
  }

  function drawSequenceTailGuides(ctx, geometry) {
    const path = geometry?.path;
    if (!path) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(139,58,42,0.32)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    path.anchors.forEach((anchor, index) => {
      const lastIndex = path.anchors.length - 1;
      const handles = [];
      if (index === 0) handles.push(path.outHandles[index]);
      else if (index === lastIndex) handles.push(path.inHandles[index]);
      else handles.push(path.inHandles[index], path.outHandles[index]);
      handles.forEach((handle) => {
        if (!handle) return;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(handle.x, handle.y);
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  function clippedArrowEndpoints(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 18) return null;
    const ux = dx / length;
    const uy = dy / length;
    let startOffset = labelExitOffset(from, ux, uy) + 6;
    let endOffset = labelExitOffset(to, -ux, -uy) + 9;
    const maxOffset = length - 12;
    if (startOffset + endOffset > maxOffset) {
      const scale = maxOffset / (startOffset + endOffset);
      startOffset *= scale;
      endOffset *= scale;
    }
    return {
      x1: from.x + ux * startOffset,
      y1: from.y + uy * startOffset,
      x2: to.x - ux * endOffset,
      y2: to.y - uy * endOffset
    };
  }

  function labelEdgePoint(label, x, y, extra = 6) {
    const dx = x - label.x;
    const dy = y - label.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return null;
    const ux = dx / length;
    const uy = dy / length;
    const offset = Math.min(length - 1, labelExitOffset(label, ux, uy) + extra);
    return {
      x: label.x + ux * offset,
      y: label.y + uy * offset
    };
  }

  function labelExitOffset(label, ux, uy) {
    const bounds = estimatedLabelBounds(label);
    const xOffset = Math.abs(ux) < 0.001 ? Infinity : bounds.halfWidth / Math.abs(ux);
    const yOffset = Math.abs(uy) < 0.001 ? Infinity : bounds.halfHeight / Math.abs(uy);
    return Math.min(xOffset, yOffset);
  }

  function mapCurveControlLabels(labels, width, height) {
    if (!inputIsModifyMode() || !state.activeMapId) return [];
    const map = selectedMap();
    if (!map || map.hiddenOnCanvas) return [];
    if (isStraightMapCurve(map.curve)) return [];
    const endpoints = mapEndpointLabels(map, labels.filter((label) => label.objectKind !== 'map'));
    if (!endpoints) return [];
    const path = mapRawCurveGeometry(map, endpoints.from, endpoints.to, width, height);
    if (!path) return [];
    const plainName = latexToPlain(map.name || 'f');
    const controls = [];
    mapVisibleHandleControls(path, map.id, plainName).forEach((control) => controls.push(control));
    path.anchors.forEach((anchor, index) => {
      const endpoint = index === 0 || index === path.anchors.length - 1;
      controls.push({
        mapId: map.id,
        control: `anchor:${index}`,
        className: `sheaf-map-control is-anchor${endpoint ? ' is-endpoint' : ''}`,
        disabled: endpoint,
        x: anchor.x,
        y: anchor.y,
        title: endpoint ? 'endpoint follows the object label' : 'drag anchor point',
        ariaLabel: `${endpoint ? 'endpoint' : 'anchor point'} for ${plainName}`
      });
    });
    return controls;
  }

  function mapVisibleHandleControls(path, mapId, plainName = 'map') {
    const lastIndex = path.anchors.length - 1;
    const controls = [];
    path.anchors.forEach((anchor, index) => {
      if (index === 0) {
        addMapHandleControl(controls, path.outHandles[index], mapId, `handle:${index}:out`, plainName, 'outgoing');
        return;
      }
      if (index === lastIndex) {
        addMapHandleControl(controls, path.inHandles[index], mapId, `handle:${index}:in`, plainName, 'incoming');
        return;
      }
      addMapHandleControl(controls, path.inHandles[index], mapId, `handle:${index}:in`, plainName, 'incoming');
      addMapHandleControl(controls, path.outHandles[index], mapId, `handle:${index}:out`, plainName, 'outgoing');
    });
    return controls;
  }

  function addMapHandleControl(controls, point, mapId, control, plainName, directionLabel) {
    if (!point) return;
    controls.push({
      mapId,
      control,
      className: 'sheaf-map-control is-handle',
      x: point.x,
      y: point.y,
      title: `drag ${directionLabel} control handle`,
      ariaLabel: `${directionLabel} control handle for ${plainName}`
    });
  }

  function normalizeMapCurve(curve) {
    if (!curve) return null;
    if (isStraightMapCurve(curve)) return straightMapCurve();
    let anchors;
    if (Array.isArray(curve.anchors)) {
      anchors = curve.anchors
        .map((point, index) => normalizedCurvePoint(point, index === 0 ? 0.28 : 0.72, 0.44))
        .slice(0, MAX_MAP_POINT_COUNT);
      if (anchors.length < 2) anchors = [normalizedCurvePoint(null, 0.28, 0.44), normalizedCurvePoint(null, 0.72, 0.44)];
      const handles = anchors.map((anchor, index) => {
        const legacy = curve.handles?.[index];
        const point = curve.anchorHandles?.[index] || curve.handles?.[index]?.point || legacy?.c1 || legacy?.c2 || legacy;
        return normalizedCurvePoint(point, fallbackHandleX(anchors, index), fallbackHandleY(anchors, index));
      });
      return { anchors, handles };
    }
    anchors = [normalizedCurvePoint(null, 0.28, 0.44), normalizedCurvePoint(null, 0.72, 0.44)];
    const handles = [
      normalizedCurvePoint(curve?.c1, 0.36, 0.44),
      normalizedCurvePoint(curve?.c2, 0.64, 0.44)
    ];
    return { anchors, handles };
  }

  function straightMapCurve() {
    return { type: 'straight', anchors: [], handles: [] };
  }

  function isStraightMapCurve(curve) {
    return curve?.type === 'straight' || curve?.mode === 'straight' || curve?.straight === true;
  }

  function ensureMapCurve(map, from, to, width, height) {
    if (!map || !from || !to) return null;
    if (!map.curve) {
      const bend = Number.isFinite(map.defaultBendPx) ? map.defaultBendPx : 0;
      map.curve = standardMapCurve(from, to, width, height, DEFAULT_MAP_POINT_COUNT, bend);
      map.defaultBendPx = bend;
      map.labelOffset = normalizedMapLabelOffset(map.labelOffset);
      map.labelT = Number.isFinite(map.labelT) ? clamp(map.labelT, 0.06, 0.94) : DEFAULT_MAP_LABEL_T;
    } else {
      map.curve = normalizeMapCurve(map.curve);
    }
    return map.curve;
  }

  function standardMapCurve(from, to, width, height, pointCount = DEFAULT_MAP_POINT_COUNT, bendPx = null) {
    const count = normalizedMapPointCount(pointCount);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 1) {
      return standardSelfMapCurve(from, width, height, count, bendPx);
    }
    if (count === STRAIGHT_MAP_POINT_COUNT) return straightMapCurve();
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const bend = Number.isFinite(bendPx) ? bendPx : 0;
    const anchors = Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const arch = Math.sin(Math.PI * t);
      return normalizedCurvePoint({
        x: (from.x + dx * t + nx * bend * arch) / Math.max(1, width),
        y: (from.y + dy * t + ny * bend * arch) / Math.max(1, height)
      }, 0.5, 0.5);
    });
    return {
      anchors,
      handles: standardMapHandles(anchors, width, height, bend)
    };
  }

  function standardSelfMapCurve(label, width, height, pointCount = DEFAULT_MAP_POINT_COUNT, bendPx = null) {
    const count = Math.max(3, normalizedMapPointCount(pointCount) === STRAIGHT_MAP_POINT_COUNT ? 3 : normalizedMapPointCount(pointCount));
    const loopIndex = selfMapLoopIndex(label?.objectKind, label?.objectId);
    const baseAngle = ((Number.isFinite(bendPx) ? bendPx : loopIndex * 120) + 30) * Math.PI / 180;
    const bounds = estimatedLabelBounds(label);
    const rx = Math.max(42, bounds.halfWidth + 24);
    const ry = Math.max(32, bounds.halfHeight + 20);
    const cx = label.x + Math.cos(baseAngle) * (bounds.halfWidth + rx * 0.38);
    const cy = label.y + Math.sin(baseAngle) * (bounds.halfHeight + ry * 0.38);
    const startAngle = baseAngle + Math.PI + 0.5;
    const endAngle = baseAngle + Math.PI - 0.5;
    const anchors = Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const theta = startAngle + (endAngle + Math.PI * 2 - startAngle) * t;
      return normalizedCurvePoint({
        x: (cx + rx * Math.cos(theta)) / Math.max(1, width),
        y: (cy + ry * Math.sin(theta)) / Math.max(1, height)
      }, 0.5, 0.5);
    });
    return {
      anchors,
      handles: standardMapHandles(anchors, width, height, 0)
    };
  }

  function selfMapLoopIndex(kind, id) {
    if (!kind || !id) return 0;
    return state.maps.filter((item) => (
      item.domainKind === kind
      && item.domainId === id
      && item.codomainKind === kind
      && item.codomainId === id
    )).length;
  }

  function standardMapHandles(anchors, width, height, bendPx = 0) {
    const bend = Number.isFinite(bendPx) ? bendPx : 0;
    if (anchors.length === 2 && Math.abs(bend) > 0.001) {
      const start = anchorToPoint(anchors[0], width, height);
      const end = anchorToPoint(anchors[1], width, height);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;
      const c1 = {
        x: start.x + dx / 3 + nx * bend,
        y: start.y + dy / 3 + ny * bend
      };
      const c2 = {
        x: start.x + dx * 2 / 3 + nx * bend,
        y: start.y + dy * 2 / 3 + ny * bend
      };
      return [
        normalizedCurvePoint({ x: c1.x / Math.max(1, width), y: c1.y / Math.max(1, height) }, anchors[0].x, anchors[0].y),
        normalizedCurvePoint({ x: (end.x * 2 - c2.x) / Math.max(1, width), y: (end.y * 2 - c2.y) / Math.max(1, height) }, anchors[1].x, anchors[1].y)
      ];
    }
    return anchors.map((anchor, index) => {
      const previous = anchors[Math.max(0, index - 1)];
      const next = anchors[Math.min(anchors.length - 1, index + 1)];
      const base = anchorToPoint(anchor, width, height);
      const before = anchorToPoint(previous, width, height);
      const after = anchorToPoint(next, width, height);
      const vx = after.x - before.x;
      const vy = after.y - before.y;
      const scale = index === 0 || index === anchors.length - 1 ? 1 / 3 : 1 / 6;
      return normalizedCurvePoint({
        x: (base.x + vx * scale) / Math.max(1, width),
        y: (base.y + vy * scale) / Math.max(1, height)
      }, anchor.x, anchor.y);
    });
  }

  function fallbackHandleX(anchors, index) {
    const before = anchors[Math.max(0, index - 1)];
    const after = anchors[Math.min(anchors.length - 1, index + 1)];
    const scale = index === 0 || index === anchors.length - 1 ? 1 / 3 : 1 / 6;
    return anchors[index].x + (after.x - before.x) * scale;
  }

  function fallbackHandleY(anchors, index) {
    const before = anchors[Math.max(0, index - 1)];
    const after = anchors[Math.min(anchors.length - 1, index + 1)];
    const scale = index === 0 || index === anchors.length - 1 ? 1 / 3 : 1 / 6;
    return anchors[index].y + (after.y - before.y) * scale;
  }

  function mapCurveGeometry(map, from, to, width, height) {
    const raw = mapRawCurveGeometry(map, from, to, width, height);
    if (!raw) return null;
    if (isSelfMap(map)) return raw;
    return clipBezierPathByLabels(raw, from, to);
  }

  function mapRawCurveGeometry(map, from, to, width, height) {
    const curve = ensureMapCurve(map, from, to, width, height);
    if (!curve) return null;
    if (isStraightMapCurve(curve)) return straightMapRawGeometry(from, to);
    const selfMap = map.domainKind === map.codomainKind && map.domainId === map.codomainId;
    const anchors = curve.anchors.map((anchor, index) => {
      if (index === 0) return selfMap ? selfMapEndpoint(anchor, from, width, height) : { x: from.x, y: from.y };
      if (index === curve.anchors.length - 1) return selfMap ? selfMapEndpoint(anchor, to, width, height) : { x: to.x, y: to.y };
      return anchorToPoint(anchor, width, height);
    });
    const handles = curve.handles.map((handle) => anchorToPoint(handle, width, height));
    const outHandles = anchors.map((anchor, index) => handles[index] || fallbackRawHandle(anchors, index, true));
    const inHandles = anchors.map((anchor, index) => reflectedHandlePoint(anchor, outHandles[index]) || fallbackRawHandle(anchors, index, false));
    const segments = Array.from({ length: Math.max(0, anchors.length - 1) }, (_, index) => {
      const start = anchors[index];
      const end = anchors[index + 1];
      return {
        index,
        start,
        c1: outHandles[index] || lerpPoint(start, end, 1 / 3),
        c2: inHandles[index + 1] || lerpPoint(start, end, 2 / 3),
        end
      };
    }).filter((segment) => segment.start && segment.end);
    return { anchors, handles, outHandles, inHandles, segments };
  }

  function straightMapRawGeometry(from, to) {
    const start = { x: from.x, y: from.y };
    const end = { x: to.x, y: to.y };
    const c1 = lerpPoint(start, end, 1 / 3);
    const c2 = lerpPoint(start, end, 2 / 3);
    return {
      anchors: [start, end],
      handles: [],
      outHandles: [],
      inHandles: [],
      segments: [{ start, c1, c2, end }]
    };
  }

  function selfMapEndpoint(anchor, label, width, height) {
    const target = anchorToPoint(anchor, width, height);
    return labelEdgePoint(label, target.x, target.y, 0) || { x: label.x, y: label.y };
  }

  function fallbackRawHandle(anchors, index, forward = true) {
    const anchor = anchors[index];
    if (!anchor) return null;
    const neighbor = forward ? anchors[Math.min(anchors.length - 1, index + 1)] : anchors[Math.max(0, index - 1)];
    if (!neighbor || neighbor === anchor) return anchor;
    return lerpPoint(anchor, neighbor, 1 / 3);
  }

  function reflectedHandlePoint(anchor, handle) {
    if (!anchor || !handle) return null;
    return {
      x: anchor.x * 2 - handle.x,
      y: anchor.y * 2 - handle.y
    };
  }

  function clipBezierPathByLabels(path, from, to) {
    if (!path?.segments?.length) return null;
    const segments = path.segments.map((segment) => ({ ...segment }));
    const first = segments[0];
    const startT = firstOutsideBezierT(first, from, 7, true, true);
    if (segments.length === 1) {
      const endT = firstOutsideBezierT(first, to, 9, false, true);
      if (startT == null || endT == null || endT - startT < 0.06) return clippedStraightPathFallback(from, to);
      segments[0] = splitCubicSegment(first.start, first.c1, first.c2, first.end, startT, endT);
    } else {
      if (startT == null) return clippedStraightPathFallback(from, to);
      segments[0] = splitCubicSegment(first.start, first.c1, first.c2, first.end, startT, 1);
      const lastIndex = segments.length - 1;
      const last = segments[lastIndex];
      const endT = firstOutsideBezierT(last, to, 9, false, true);
      if (endT == null) return clippedStraightPathFallback(from, to);
      segments[lastIndex] = splitCubicSegment(last.start, last.c1, last.c2, last.end, 0, endT);
    }
    return { anchors: path.anchors, segments };
  }

  function firstOutsideBezierT(segment, label, extra, forward, requireBoundaryInside = false) {
    const boundary = forward ? segment.start : segment.end;
    if (requireBoundaryInside && !pointInsideEstimatedLabel(boundary, label, extra)) return forward ? 0 : 1;
    if (forward) {
      for (let i = 0; i <= MAP_CURVE_SAMPLE_COUNT; i += 1) {
        const t = i / MAP_CURVE_SAMPLE_COUNT;
        const point = cubicBezierPoint(segment.start, segment.c1, segment.c2, segment.end, t);
        if (!pointInsideEstimatedLabel(point, label, extra)) return t;
      }
      return null;
    }
    for (let i = MAP_CURVE_SAMPLE_COUNT; i >= 0; i -= 1) {
      const t = i / MAP_CURVE_SAMPLE_COUNT;
      const point = cubicBezierPoint(segment.start, segment.c1, segment.c2, segment.end, t);
      if (!pointInsideEstimatedLabel(point, label, extra)) return t;
    }
    return null;
  }

  function clippedStraightPathFallback(from, to) {
    const endpoints = clippedArrowEndpoints(from, to);
    if (!endpoints) return null;
    const start = { x: endpoints.x1, y: endpoints.y1 };
    const end = { x: endpoints.x2, y: endpoints.y2 };
    const startHandle = lerpPoint(start, end, 1 / 3);
    const endHandle = lerpPoint(end, start, 1 / 3);
    return {
      anchors: [start, end],
      outHandles: [startHandle, null],
      inHandles: [null, endHandle],
      segments: [{
        start,
        c1: startHandle,
        c2: endHandle,
        end
      }]
    };
  }

  function pointInsideEstimatedLabel(point, label, extra = 0) {
    const bounds = estimatedLabelBounds(label);
    return Math.abs(point.x - label.x) <= bounds.halfWidth + extra
      && Math.abs(point.y - label.y) <= bounds.halfHeight + extra;
  }

  function anchorToPoint(anchor, width, height) {
    return {
      x: anchor.x * width,
      y: anchor.y * height
    };
  }

  function normalizedCurvePoint(point, fallbackX, fallbackY) {
    return {
      x: Number.isFinite(point?.x) ? point.x : fallbackX,
      y: Number.isFinite(point?.y) ? point.y : fallbackY
    };
  }

  function mapCurveAnchorCount(map) {
    if (isStraightMapCurve(map?.curve)) return STRAIGHT_MAP_POINT_COUNT;
    return normalizedMapPointCount(map?.curve?.anchors?.length || DEFAULT_MAP_POINT_COUNT);
  }

  function normalizedMapPointCount(value) {
    const numeric = Number(value);
    if (numeric === STRAIGHT_MAP_POINT_COUNT || numeric === LEGACY_STRAIGHT_MAP_POINT_COUNT) return STRAIGHT_MAP_POINT_COUNT;
    return normalizedInt(value, 2, MAX_MAP_POINT_COUNT, 2);
  }

  function mapPointCountFromSliderValue(value) {
    const index = normalizedInt(value, 0, MAP_POINT_COUNT_OPTIONS.length - 1, 0);
    return MAP_POINT_COUNT_OPTIONS[index] ?? DEFAULT_MAP_POINT_COUNT;
  }

  function mapPointCountSliderValue(count) {
    const normalized = normalizedMapPointCount(count);
    const index = MAP_POINT_COUNT_OPTIONS.indexOf(normalized);
    return index >= 0 ? index : MAP_POINT_COUNT_OPTIONS.indexOf(DEFAULT_MAP_POINT_COUNT);
  }

  function formatMapPointCount(count) {
    return String(normalizedMapPointCount(count));
  }

  function normalizedMapLabelOffset(value) {
    return normalizedInt(value, MIN_MAP_LABEL_OFFSET, MAX_MAP_LABEL_OFFSET, DEFAULT_MAP_LABEL_OFFSET);
  }

  function setMapPointCount(map, value) {
    if (!map) return;
    applyStandardMapCurve(map, mapPointCountFromSliderValue(value));
  }

  function setMapLabelOffset(map, value) {
    if (!map) return;
    map.labelOffset = normalizedMapLabelOffset(value);
    map.modified = true;
    syncMapCurveControls(map);
  }

  function lerpNumber(a, b, t) {
    return a + (b - a) * t;
  }

  function splitCubicSegment(p0, p1, p2, p3, t0, t1) {
    const firstSplit = splitCubic(p0, p1, p2, p3, clamp(t0, 0, 1));
    const right = firstSplit.right;
    const span = 1 - t0;
    const localT = span <= 0 ? 1 : clamp((t1 - t0) / span, 0, 1);
    const secondSplit = splitCubic(right[0], right[1], right[2], right[3], localT);
    const segment = secondSplit.left;
    return {
      start: segment[0],
      c1: segment[1],
      c2: segment[2],
      end: segment[3]
    };
  }

  function splitCubic(p0, p1, p2, p3, t) {
    const p01 = lerpPoint(p0, p1, t);
    const p12 = lerpPoint(p1, p2, t);
    const p23 = lerpPoint(p2, p3, t);
    const p012 = lerpPoint(p01, p12, t);
    const p123 = lerpPoint(p12, p23, t);
    const p0123 = lerpPoint(p012, p123, t);
    return {
      left: [p0, p01, p012, p0123],
      right: [p0123, p123, p23, p3]
    };
  }

  function lerpPoint(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  function cubicBezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y
    };
  }

  function cubicBezierTangent(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: 3 * mt ** 2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
      y: 3 * mt ** 2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y)
    };
  }

  function estimatedLabelBounds(label) {
    const plain = latexToPlain(label.main || '');
    const lines = Math.max(1, Math.ceil(plain.length / 22));
    const maxWidth = label.maxWidth || 260;
    const width = Math.min(maxWidth, Math.max(label.objectKind === 'map' ? 30 : 42, plain.length * 8 + 24));
    const height = label.objectKind === 'map' ? 24 : Math.max(26, lines * 22 + 6);
    return {
      halfWidth: width / 2,
      halfHeight: height / 2
    };
  }

  function canvasLabelMap(labels = canvasOverviewLabels(state.canvasWidth || 760, state.canvasHeight || 280)) {
    const labelMap = new Map();
    labels.forEach((label) => {
      if (!label.objectKind || !label.objectId || label.objectKind === 'map') return;
      labelMap.set(`${label.objectKind}:${label.objectId}`, label);
    });
    return labelMap;
  }

  function mapEndpointLabels(map, labels) {
    if (map.hiddenOnCanvas) return null;
    const labelMap = canvasLabelMap(labels);
    const from = labelMap.get(`${map.domainKind}:${map.domainId}`);
    const to = labelMap.get(`${map.codomainKind}:${map.codomainId}`);
    return from && to ? { from, to } : null;
  }

  function mapLabelPosition(map, endpoints, width, height) {
    const path = mapCurveGeometry(map, endpoints.from, endpoints.to, width, height);
    if (!path) {
      return {
        x: (endpoints.from.x + endpoints.to.x) / 2,
        y: (endpoints.from.y + endpoints.to.y) / 2
      };
    }
    const labelPoint = pointOnBezierPathByArcRatio(path, Number.isFinite(map.labelT) ? map.labelT : DEFAULT_MAP_LABEL_T);
    const point = labelPoint.point;
    const tangent = labelPoint.tangent;
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / length;
    const ny = tangent.x / length;
    const offset = normalizedMapLabelOffset(map.labelOffset);
    return {
      x: clamp(point.x + nx * offset, 24, width - 24),
      y: clamp(point.y + ny * offset, 24, height - 24)
    };
  }

  function pointOnBezierPathByArcRatio(path, ratio = 0.5) {
    const samples = [];
    let total = 0;
    path.segments.forEach((segment) => {
      for (let i = samples.length ? 1 : 0; i <= MAP_CURVE_SAMPLE_COUNT; i += 1) {
        const t = i / MAP_CURVE_SAMPLE_COUNT;
        const point = cubicBezierPoint(segment.start, segment.c1, segment.c2, segment.end, t);
        const previous = samples[samples.length - 1]?.point;
        if (previous) total += Math.hypot(point.x - previous.x, point.y - previous.y);
        samples.push({ segment, t, point, length: total });
      }
    });
    if (!samples.length) return { point: { x: 0, y: 0 }, tangent: { x: 1, y: 0 } };
    const target = total * clamp(ratio, 0, 1);
    const sample = samples.find((entry) => entry.length >= target) || samples[Math.floor(samples.length / 2)];
    return {
      point: sample.point,
      tangent: cubicBezierTangent(sample.segment.start, sample.segment.c1, sample.segment.c2, sample.segment.end, sample.t)
    };
  }

  function closestBezierPathRatio(path, x, y) {
    const samples = [];
    let total = 0;
    let best = null;
    path.segments.forEach((segment) => {
      for (let i = samples.length ? 1 : 0; i <= MAP_CURVE_SAMPLE_COUNT; i += 1) {
        const t = i / MAP_CURVE_SAMPLE_COUNT;
        const point = cubicBezierPoint(segment.start, segment.c1, segment.c2, segment.end, t);
        const previous = samples[samples.length - 1]?.point;
        if (previous) total += Math.hypot(point.x - previous.x, point.y - previous.y);
        const entry = { point, length: total };
        samples.push(entry);
        const distance = Math.hypot(point.x - x, point.y - y);
        if (!best || distance < best.distance) best = { distance, length: total };
      }
    });
    return total ? clamp((best?.length || 0) / total, 0.04, 0.96) : DEFAULT_MAP_LABEL_T;
  }

  function drawWideOverview(ctx, width, height, result) {
    drawInputOverview(ctx, canvasOverviewLayout(width, height, false), result);
  }

  function drawCompactOverview(ctx, width, height, result) {
    drawInputOverview(ctx, canvasOverviewLayout(width, height, true), result);
  }

  function canvasOverviewLayout(width, height, compact) {
    if (compact) {
      const margin = 28;
      const panelW = Math.max(120, width - margin * 2);
      const varietyPanel = { x: margin, y: 28, w: panelW, h: 120 };
      const sheafPanel = { x: margin, y: 176, w: panelW, h: 120 };
      return {
        varietyPanel,
        sheafPanel,
        varietyNodes: objectNodeRects(visibleCanvasVarieties().length, varietyPanel),
        sheafNodes: objectNodeRects(visibleCanvasSheaves().length, sheafPanel),
        hodge: { x: margin, y: 232, w: (panelW - 12) / 2, h: 70 },
        classes: { x: margin + (panelW + 12) / 2, y: 232, w: (panelW - 12) / 2, h: 70 }
      };
    }
    const margin = 36;
    const colW = Math.max(120, (width - margin * 2) / 2);
    const varietyPanel = { x: margin, y: 36, w: colW, h: height - 72 };
    const sheafPanel = { x: width - margin - colW, y: 36, w: colW, h: height - 72 };
    return {
      varietyPanel,
      sheafPanel,
      varietyNodes: objectNodeRects(visibleCanvasVarieties().length, varietyPanel),
      sheafNodes: objectNodeRects(visibleCanvasSheaves().length, sheafPanel),
      hodge: { x: 0, y: 0, w: 0, h: 0 },
      classes: { x: 0, y: 0, w: 0, h: 0 }
    };
  }

  function objectNodeRects(count, panel) {
    const safeCount = Math.max(1, count);
    const gap = Math.max(18, Math.min(34, panel.h / (safeCount + 2)));
    const nodeH = Math.max(26, Math.min(40, (panel.h - gap * (safeCount + 1)) / safeCount));
    return Array.from({ length: count }, (_, index) => ({
      x: panel.x,
      y: panel.y + gap + index * (nodeH + gap),
      w: panel.w,
      h: nodeH
    }));
  }

  function drawInputOverview(ctx, layout) {
    const varieties = visibleCanvasVarieties();
    const sheaves = visibleCanvasSheaves();
    drawObjectPanel(ctx, layout.varietyPanel, layout.varietyNodes, varieties, state.activeVarietyId, '#3d6b4f', '#f7f4ef');
    drawObjectPanel(ctx, layout.sheafPanel, layout.sheafNodes, sheaves, state.activeSheafId, '#3d6b4f', '#ffffff');
    drawClassNode(ctx, layout.hodge.x, layout.hodge.y, layout.hodge.w, layout.hodge.h, 0);
    drawClassNode(ctx, layout.classes.x, layout.classes.y, layout.classes.w, layout.classes.h, 0);
    const activeVarietyRect = layout.varietyNodes[varieties.findIndex((item) => item.id === state.activeVarietyId)];
    const activeSheafRect = layout.sheafNodes[sheaves.findIndex((item) => item.id === state.activeSheafId)];
    if (activeVarietyRect) drawArrow(ctx, activeVarietyRect.x + activeVarietyRect.w, activeVarietyRect.y + activeVarietyRect.h / 2, layout.hodge.x, layout.hodge.y + layout.hodge.h / 2, '#3d6b4f');
    if (activeSheafRect) drawArrow(ctx, activeSheafRect.x + activeSheafRect.w, activeSheafRect.y + activeSheafRect.h / 2, layout.classes.x, layout.classes.y + layout.classes.h / 2, '#8b3a2a');
  }

  function drawObjectPanel(ctx, panel, nodes, items, activeId, color, fill) {
    roundedRect(ctx, panel.x, panel.y, panel.w, panel.h, 8, '#fffdf8', '#d8d0c4');
    nodes.forEach((node, index) => {
      const active = items[index]?.id === activeId;
      roundedRect(ctx, node.x, node.y, node.w, node.h, 6, active ? fill : 'rgba(255,255,255,0.58)', active ? color : '#d8d0c4');
    });
  }

  function sanitizeDimensionText(value) {
    return String(normalizedInt(value, 0, MAX_DIMENSION, 3));
  }

  function drawAmbient(ctx, x, y, w, h, geometry) {
    roundedRect(ctx, x, y, w, h, 8, '#f7f4ef', '#d8d0c4');
    ctx.save();
    ctx.strokeStyle = '#3d6b4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 8, Math.max(40, w * 0.34), Math.max(22, h * 0.2), -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSheafNode(ctx, x, y, w, h, bundle) {
    roundedRect(ctx, x, y, w, h, 8, '#ffffff', '#3d6b4f');
  }

  function drawClassNode(ctx, x, y, w, h, dim) {
    roundedRect(ctx, x, y, w, h, 8, '#fff7f3', '#8b3a2a');
  }

  function canvasLabelPosition(object, kind, fallbackRect, width, height) {
    if (Number.isFinite(object.labelX) && Number.isFinite(object.labelY)) {
      return {
        x: clamp(object.labelX * width, 24, width - 24),
        y: clamp(object.labelY * height, 24, height - 24)
      };
    }
    return {
      x: clamp(fallbackRect.x + fallbackRect.w / 2, 24, width - 24),
      y: clamp(fallbackRect.y + fallbackRect.h / 2, 24, height - 24)
    };
  }

  function ensureCanvasLabelPositions(width, height) {
    const compact = width < 620;
    const layout = canvasOverviewLayout(width, height, compact);
    visibleCanvasVarieties().forEach((variety, index) => {
      if (Number.isFinite(variety.labelX) && Number.isFinite(variety.labelY)) return;
      const rect = layout.varietyNodes[index] || layout.varietyPanel;
      setCanvasLabelPosition(variety, rect.x + rect.w / 2, rect.y + rect.h / 2, width, height);
    });
    visibleCanvasSheaves().forEach((sheaf, index) => {
      if (Number.isFinite(sheaf.labelX) && Number.isFinite(sheaf.labelY)) return;
      const rect = layout.sheafNodes[index] || layout.sheafPanel;
      setCanvasLabelPosition(sheaf, rect.x + rect.w / 2, rect.y + rect.h / 2, width, height);
    });
    visibleCanvasMaps().forEach((map) => {
      if (map.curve) return;
      positionMapLabel(map, width, height);
    });
  }

  function setCanvasLabelPosition(object, x, y, width, height) {
    object.labelX = clamp(width ? x / width : 0.5, 0.04, 0.96);
    object.labelY = clamp(height ? y / height : 0.5, 0.07, 0.93);
  }

  function positionMapLabel(map, width = state.canvasWidth || 760, height = state.canvasHeight || 280) {
    const labels = canvasObjectLabels(width, height);
    const endpoints = mapEndpointLabels(map, labels);
    if (!endpoints) {
      return;
    }
    ensureMapCurve(map, endpoints.from, endpoints.to, width, height);
  }

  function startCanvasLabelDrag(target, event) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    const item = objectByKind(kind, id);
    if (!item || !refs.canvas) return;
    event.preventDefault();
    target.classList.add('is-dragging');
    const canvasRect = refs.canvas.getBoundingClientRect();
    const labelRect = target.getBoundingClientRect();
    state.labelDrag = {
      item,
      kind,
      id,
      target,
      canvasRect,
      offsetX: event.clientX - labelRect.left,
      offsetY: event.clientY - labelRect.top,
      startX: event.clientX,
      startY: event.clientY,
      lastLabelX: labelRect.left - canvasRect.left + labelRect.width / 2,
      lastLabelY: labelRect.top - canvasRect.top + labelRect.height / 2,
      pointerId: event.pointerId,
      moved: false
    };
    try { target.setPointerCapture?.(event.pointerId); } catch (_) {}
    document.addEventListener('pointermove', updateCanvasLabelDrag);
    document.addEventListener('pointerup', finishCanvasLabelDrag);
    document.addEventListener('pointercancel', finishCanvasLabelDrag);
  }

  function updateCanvasLabelDrag(event) {
    const drag = state.labelDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const width = drag.canvasRect.width || 1;
    const height = drag.canvasRect.height || 1;
    const x = event.clientX - drag.canvasRect.left - drag.offsetX + drag.target.offsetWidth / 2;
    const y = event.clientY - drag.canvasRect.top - drag.offsetY + drag.target.offsetHeight / 2;
    const clampedX = clamp(x, 24, width - 24);
    const clampedY = clamp(y, 24, height - 24);
    if (drag.kind === 'map') {
      updateMapLabelDragPosition(drag.item, clampedX, clampedY, width, height);
    } else {
      preserveEndpointHandlesForMovedObject(drag.kind, drag.id, clampedX - drag.lastLabelX, clampedY - drag.lastLabelY, width, height);
      setCanvasLabelPosition(drag.item, clampedX, clampedY, width, height);
      drag.item.labelPositionDirty = true;
      drag.lastLabelX = clampedX;
      drag.lastLabelY = clampedY;
    }
    drag.target.style.left = `${clampedX}px`;
    drag.target.style.top = `${clampedY}px`;
    if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) {
      drag.moved = true;
      redrawCanvasSurface();
    }
  }

  function updateMapLabelDragPosition(map, x, y, width, height) {
    const labels = canvasObjectLabels(width, height);
    const endpoints = mapEndpointLabels(map, labels);
    if (!endpoints) return;
    const path = mapCurveGeometry(map, endpoints.from, endpoints.to, width, height);
    if (!path) return;
    const ratio = closestBezierPathRatio(path, x, y);
    const point = pointOnBezierPathByArcRatio(path, ratio);
    const tangentLength = Math.hypot(point.tangent.x, point.tangent.y) || 1;
    const nx = -point.tangent.y / tangentLength;
    const ny = point.tangent.x / tangentLength;
    const offset = (x - point.point.x) * nx + (y - point.point.y) * ny;
    map.labelT = ratio;
    map.labelOffset = clamp(offset, MIN_MAP_LABEL_OFFSET, MAX_MAP_LABEL_OFFSET);
    map.modified = true;
    syncMapCurveControls(map);
  }

  function preserveEndpointHandlesForMovedObject(kind, id, dx, dy, width, height) {
    if (!kind || !id || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) return;
    state.maps.forEach((map) => {
      if (!map.curve || isStraightMapCurve(map.curve)) return;
      map.curve = normalizeMapCurve(map.curve);
      if (!map.curve?.handles?.length) return;
      const lastIndex = map.curve.anchors.length - 1;
      const endpointIndexes = [];
      if (map.domainKind === kind && map.domainId === id) endpointIndexes.push(0);
      if (map.codomainKind === kind && map.codomainId === id) endpointIndexes.push(lastIndex);
      [...new Set(endpointIndexes)].forEach((index) => {
        const handle = map.curve.handles[index];
        if (!handle) return;
        map.curve.handles[index] = normalizedCurvePoint({
          x: handle.x + dx / Math.max(1, width),
          y: handle.y + dy / Math.max(1, height)
        }, handle.x, handle.y);
        map.modified = true;
      });
    });
  }

  function finishCanvasLabelDrag(event) {
    const drag = state.labelDrag;
    document.removeEventListener('pointermove', updateCanvasLabelDrag);
    document.removeEventListener('pointerup', finishCanvasLabelDrag);
    document.removeEventListener('pointercancel', finishCanvasLabelDrag);
    if (!drag) return;
    drag.target.classList.remove('is-dragging');
    try { drag.target.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    const moved = drag.moved;
    const outside = event && pointOutsideRect(event.clientX, event.clientY, drag.canvasRect);
    state.labelDrag = null;
    if (moved && outside) {
      state.suppressLabelClickUntil = Date.now() + 180;
      removeCanvasObject(drag.kind, drag.id);
      return;
    }
    if (!moved && event?.type !== 'pointercancel' && !outside) {
      state.suppressLabelClickUntil = Date.now() + 180;
      selectObject(drag.kind, drag.id);
      return;
    }
    if (moved) {
      state.suppressLabelClickUntil = Date.now() + 180;
      recompute();
    }
  }

  function startMapControlDrag(target, event) {
    const map = state.maps.find((item) => item.id === target.dataset.mapId);
    const control = parseMapControlRef(target.dataset.mapControl);
    if (!map || !control || !refs.canvas) return;
    event.preventDefault();
    activateObject('map', map.id, { mode: 'modify', loadDraft: true });
    const canvasRect = refs.canvas.getBoundingClientRect();
    state.mapControlDrag = {
      map,
      control,
      target,
      canvasRect,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    target.classList.add('is-dragging');
    try { target.setPointerCapture?.(event.pointerId); } catch (_) {}
    document.addEventListener('pointermove', updateMapControlDrag);
    document.addEventListener('pointerup', finishMapControlDrag);
    document.addEventListener('pointercancel', finishMapControlDrag);
  }

  function parseMapControlRef(value) {
    const parts = String(value || '').split(':');
    if (parts[0] === 'anchor' && parts.length === 2) {
      const index = Number(parts[1]);
      return Number.isInteger(index) ? { type: 'anchor', index } : null;
    }
    if (parts[0] === 'handle' && (parts.length === 2 || parts.length === 3)) {
      const index = Number(parts[1]);
      const direction = parts[2] === 'in' ? 'in' : 'out';
      return Number.isInteger(index) ? { type: 'handle', index, direction } : null;
    }
    return null;
  }

  function handleMapControlKey(event, target) {
    const map = state.maps.find((item) => item.id === target.dataset.mapId);
    const control = parseMapControlRef(target.dataset.mapControl);
    if (!map || !control) return;
    const step = event.shiftKey ? 18 : 6;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -step;
    else if (event.key === 'ArrowRight') dx = step;
    else if (event.key === 'ArrowUp') dy = -step;
    else if (event.key === 'ArrowDown') dy = step;
    else return;
    event.preventDefault();
    activateObject('map', map.id, { mode: 'modify', loadDraft: true });
    const width = state.canvasWidth || refs.canvas?.clientWidth || 760;
    const height = state.canvasHeight || refs.canvas?.clientHeight || 280;
    const endpoints = mapEndpointLabels(map, canvasObjectLabels(width, height));
    if (!endpoints) return;
    moveMapControl(map, control, dx, dy, width, height);
    recompute();
  }

  function updateMapControlDrag(event) {
    const drag = state.mapControlDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const width = drag.canvasRect.width || 1;
    const height = drag.canvasRect.height || 1;
    const x = event.clientX - drag.canvasRect.left;
    const y = event.clientY - drag.canvasRect.top;
    setMapControlPoint(drag.map, drag.control, x, y, width, height);
    if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) drag.moved = true;
    redrawCanvasSurface();
    updateMapOverlayPositions(drag.map);
  }

  function setMapControlPoint(map, control, x, y, width, height) {
    map.curve = normalizeMapCurve(map.curve) || standardMapCurve({ x: width * 0.28, y: height * 0.44 }, { x: width * 0.72, y: height * 0.44 }, width, height);
    const point = normalizedCurvePoint({ x: x / width, y: y / height }, 0.5, 0.5);
    if (control.type === 'anchor') {
      if (control.index <= 0 || control.index >= map.curve.anchors.length - 1) return;
      const oldAnchor = map.curve.anchors[control.index];
      const dx = point.x - oldAnchor.x;
      const dy = point.y - oldAnchor.y;
      map.curve.anchors[control.index] = point;
      if (map.curve.handles?.[control.index]) {
        const handle = map.curve.handles[control.index];
        map.curve.handles[control.index] = normalizedCurvePoint({ x: handle.x + dx, y: handle.y + dy }, point.x, point.y);
      }
      map.modified = true;
      return;
    }
    if (!map.curve.handles?.[control.index]) return;
    if (control.direction === 'in') {
      const anchor = currentCurveAnchorPoint(map, control.index, width, height);
      if (!anchor) return;
      map.curve.handles[control.index] = normalizedCurvePoint({
        x: (anchor.x * 2 - x) / width,
        y: (anchor.y * 2 - y) / height
      }, (anchor.x * 2 - x) / width, (anchor.y * 2 - y) / height);
    } else {
      map.curve.handles[control.index] = point;
    }
    map.modified = true;
  }

  function currentCurveAnchorPoint(map, index, width, height) {
    const endpoints = mapEndpointLabels(map, canvasObjectLabels(width, height));
    if (!endpoints) return null;
    if (index === 0) return { x: endpoints.from.x, y: endpoints.from.y };
    if (index === map.curve.anchors.length - 1) return { x: endpoints.to.x, y: endpoints.to.y };
    return anchorToPoint(map.curve.anchors[index], width, height);
  }

  function moveMapControl(map, control, dx, dy, width, height) {
    const endpoints = mapEndpointLabels(map, canvasObjectLabels(width, height));
    if (!endpoints) return;
    const path = mapRawCurveGeometry(map, endpoints.from, endpoints.to, width, height);
    if (!path) return;
    let point = null;
    if (control.type === 'anchor') point = path.anchors[control.index];
    else point = mapControlVisiblePoint(path, control);
    if (!point) return;
    setMapControlPoint(map, control, point.x + dx, point.y + dy, width, height);
  }

  function mapControlVisiblePoint(path, control) {
    if (!path || control.type !== 'handle') return null;
    return control.direction === 'in' ? path.inHandles[control.index] : path.outHandles[control.index];
  }

  function finishMapControlDrag(event) {
    const drag = state.mapControlDrag;
    document.removeEventListener('pointermove', updateMapControlDrag);
    document.removeEventListener('pointerup', finishMapControlDrag);
    document.removeEventListener('pointercancel', finishMapControlDrag);
    if (!drag) return;
    drag.target.classList.remove('is-dragging');
    try { drag.target.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    const moved = drag.moved;
    state.mapControlDrag = null;
    if (moved) {
      state.suppressLabelClickUntil = Date.now() + 180;
      recompute();
    }
  }

  function sequenceFromTailControl(target) {
    const sequenceId = target?.dataset?.objectId || target?.dataset?.sequenceId;
    return (state.sequences || []).find((item) => item.id === sequenceId) || null;
  }

  function startSequenceTailDrag(target, event) {
    const sequence = sequenceFromTailControl(target);
    const control = target?.dataset?.sequenceTailControl || 'end';
    if (!sequence || !refs.canvas || control === 'label') return;
    event.preventDefault();
    activateObject('sequence', sequence.id, { mode: 'modify', loadDraft: true });
    const canvasRect = refs.canvas.getBoundingClientRect();
    ensureSequenceTailCurveState(sequence, canvasRect.width || 1, canvasRect.height || 1);
    state.sequenceTailDrag = {
      sequence,
      control,
      target,
      canvasRect,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    target.classList.add('is-dragging');
    try { target.setPointerCapture?.(event.pointerId); } catch (_) {}
    document.addEventListener('pointermove', updateSequenceTailDrag);
    document.addEventListener('pointerup', finishSequenceTailDrag);
    document.addEventListener('pointercancel', finishSequenceTailDrag);
  }

  function updateSequenceTailDrag(event) {
    const drag = state.sequenceTailDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const width = drag.canvasRect.width || 1;
    const height = drag.canvasRect.height || 1;
    const x = event.clientX - drag.canvasRect.left;
    const y = event.clientY - drag.canvasRect.top;
    setSequenceTailPoint(drag.sequence, drag.control, x, y, width, height, { labelPosition: drag.control === 'label' });
    if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) drag.moved = true;
    redrawCanvasSurface();
    updateSequenceTailOverlayPositions(drag.sequence);
  }

  function finishSequenceTailDrag(event) {
    const drag = state.sequenceTailDrag;
    document.removeEventListener('pointermove', updateSequenceTailDrag);
    document.removeEventListener('pointerup', finishSequenceTailDrag);
    document.removeEventListener('pointercancel', finishSequenceTailDrag);
    if (!drag) return;
    drag.target.classList.remove('is-dragging');
    try { drag.target.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    const moved = drag.moved;
    const sequence = drag.sequence;
    state.sequenceTailDrag = null;
    if (moved) {
      state.suppressLabelClickUntil = Date.now() + 180;
      recompute();
      return;
    }
    const parsed = parseSequenceTailControlRef(drag.control, sequence);
    const endIndex = sequenceTailEndAnchorIndex(sequence);
    if (event?.type !== 'pointercancel' && (drag.control === 'label' || (parsed?.type === 'anchor' && parsed.index === endIndex))) {
      state.suppressLabelClickUntil = Date.now() + 180;
      activateObject('sequence', sequence.id, { mode: 'modify', loadDraft: true });
      recompute();
    }
  }

  function handleSequenceTailControlKey(event, target) {
    const sequence = sequenceFromTailControl(target);
    const control = target?.dataset?.sequenceTailControl || 'end';
    if (!sequence) return false;
    const parsed = parseSequenceTailControlRef(control, sequence);
    const endIndex = sequenceTailEndAnchorIndex(sequence);
    if ((control === 'label' || (parsed?.type === 'anchor' && parsed.index === endIndex)) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      activateObject('sequence', sequence.id, { mode: 'modify', loadDraft: true });
      recompute();
      return true;
    }
    if (control === 'label') return false;
    const step = event.shiftKey ? 18 : 6;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -step;
    else if (event.key === 'ArrowRight') dx = step;
    else if (event.key === 'ArrowUp') dy = -step;
    else if (event.key === 'ArrowDown') dy = step;
    else return false;
    event.preventDefault();
    activateObject('sequence', sequence.id, { mode: 'modify', loadDraft: true });
    moveSequenceTailControl(sequence, control, dx, dy);
    recompute();
    return true;
  }

  function moveSequenceTailControl(sequence, control, dx, dy, width = state.canvasWidth || refs.canvas?.clientWidth || 760, height = state.canvasHeight || refs.canvas?.clientHeight || 280) {
    const geometry = sequenceTailGeometryFromCanvas(sequence, width, height);
    if (!geometry?.path) return;
    const parsed = parseSequenceTailControlRef(control, sequence);
    let point = null;
    if (parsed?.type === 'anchor') point = geometry.path.anchors?.[parsed.index];
    else if (parsed?.type === 'handle') point = mapControlVisiblePoint(geometry.path, parsed);
    if (!point) return;
    setSequenceTailPoint(sequence, control, point.x + dx, point.y + dy, width, height);
  }

  function setSequenceTailPoint(sequence, control, x, y, width, height, options = {}) {
    if (!sequence) return;
    const safeWidth = Math.max(1, width || 1);
    const safeHeight = Math.max(1, height || 1);
    const current = sequenceTailGeometryFromCanvas(sequence, safeWidth, safeHeight);
    if (!current?.path) return;
    sequence.tail = sequenceTailStateFromPath(sequence.tail, current.path, safeWidth, safeHeight);
    const parsed = parseSequenceTailControlRef(control, sequence);
    const pointCount = sequenceTailPointCount(sequence.tail);
    const endIndex = sequenceTailEndAnchorIndex(sequence.tail);
    const anchors = Array.isArray(sequence.tail.anchors) ? sequence.tail.anchors.slice() : [];
    const handles = Array.isArray(sequence.tail.handles) ? sequence.tail.handles.slice() : [];
    if (parsed?.type === 'anchor') {
      if (parsed.index <= 0 || parsed.index > endIndex) return;
      const oldAnchor = anchors[parsed.index];
      const point = normalizedCurvePoint({
        x: clamp(x, 14, safeWidth - 14) / safeWidth,
        y: clamp(y, 14, safeHeight - 14) / safeHeight
      }, 0.5, 0.5);
      const dx = oldAnchor ? point.x - oldAnchor.x : 0;
      const dy = oldAnchor ? point.y - oldAnchor.y : 0;
      anchors[parsed.index] = point;
      if (handles[parsed.index]) {
        handles[parsed.index] = normalizedCurvePoint({
          x: handles[parsed.index].x + dx,
          y: handles[parsed.index].y + dy
        }, point.x, point.y);
      }
      sequence.tail = {
        ...sequence.tail,
        anchors,
        handles,
        end: anchors[endIndex],
        pointCount
      };
      sequence.modified = true;
      return;
    }
    if (parsed?.type === 'handle') {
      const anchor = current.path.anchors?.[parsed.index];
      if (!anchor || parsed.index < 0 || parsed.index >= anchors.length) return;
      if (parsed.direction === 'in') {
        handles[parsed.index] = normalizedCurvePoint({
          x: (anchor.x * 2 - x) / safeWidth,
          y: (anchor.y * 2 - y) / safeHeight
        }, (anchor.x * 2 - x) / safeWidth, (anchor.y * 2 - y) / safeHeight);
      } else {
        handles[parsed.index] = normalizedCurvePoint({
          x: x / safeWidth,
          y: y / safeHeight
        }, anchors[parsed.index]?.x ?? 0.5, anchors[parsed.index]?.y ?? 0.5);
      }
      sequence.tail = {
        ...sequence.tail,
        anchors,
        handles,
        end: anchors[endIndex],
        pointCount
      };
      sequence.modified = true;
      return;
    }
    if (control !== 'label') return;
    const normal = current?.labelNormal || { x: 0, y: -1 };
    const end = options.labelPosition
      ? {
        x: clamp(x - normal.x * 14, 14, safeWidth - 14),
        y: clamp(y - normal.y * 14, 14, safeHeight - 14)
      }
      : {
        x: clamp(x, 14, safeWidth - 14),
        y: clamp(y, 14, safeHeight - 14)
      };
    const oldAnchor = anchors[endIndex];
    const point = normalizedCurvePoint({ x: end.x / safeWidth, y: end.y / safeHeight }, 0.86, 0.5);
    const dx = oldAnchor ? point.x - oldAnchor.x : 0;
    const dy = oldAnchor ? point.y - oldAnchor.y : 0;
    anchors[endIndex] = point;
    if (handles[endIndex]) {
      handles[endIndex] = normalizedCurvePoint({
        x: handles[endIndex].x + dx,
        y: handles[endIndex].y + dy
      }, point.x, point.y);
    }
    sequence.tail = {
      ...sequence.tail,
      anchors,
      handles,
      end: point,
      pointCount
    };
    sequence.modified = true;
  }

  function sequenceTailGeometryFromCanvas(sequence, width, height) {
    if (sequence?.tail?.hiddenOnCanvas) return null;
    const labels = canvasObjectLabels(width, height);
    const labelMap = canvasLabelMap(labels);
    const rightId = sequence?.sheafIds?.[2];
    const right = rightId ? labelMap.get(`sheaf:${rightId}`) : null;
    return right ? shortExactSequenceTailGeometry(sequence, right, width, height) : null;
  }

  function updateSequenceTailOverlayPositions(sequence) {
    if (!sequence || sequence.tail?.hiddenOnCanvas || !refs.canvasLabels || !state.canvasWidth || !state.canvasHeight) return;
    const geometry = sequenceTailGeometryFromCanvas(sequence, state.canvasWidth, state.canvasHeight);
    if (!geometry) return;
    const labelControl = refs.canvasLabels.querySelector(`[data-object-kind="sequence"][data-object-id="${cssEscape(sequence.id)}"][data-sequence-tail-control="label"]`);
    if (labelControl) {
      labelControl.style.left = `${geometry.label.x}px`;
      labelControl.style.top = `${geometry.label.y}px`;
    }
    const path = geometry.path;
    if (!path) return;
    path.anchors.forEach((_, index) => {
      updateSequenceTailControlElement(sequence.id, `handle:${index}:in`, path.inHandles[index]);
      updateSequenceTailControlElement(sequence.id, `handle:${index}:out`, path.outHandles[index]);
    });
    path.anchors.forEach((anchor, index) => {
      updateSequenceTailControlElement(sequence.id, `anchor:${index}`, anchor);
    });
    redrawCanvasSurface();
  }

  function updateSequenceTailControlElement(sequenceId, control, point) {
    const element = refs.canvasLabels.querySelector(`[data-sequence-id="${cssEscape(sequenceId)}"][data-sequence-tail-control="${cssEscape(control)}"]`);
    if (!element || !point) return;
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  }

  function updateMapOverlayPositions(map) {
    if (!map || !refs.canvasLabels || !state.canvasWidth || !state.canvasHeight) return;
    const labels = canvasObjectLabels(state.canvasWidth, state.canvasHeight);
    const endpoints = mapEndpointLabels(map, labels);
    if (!endpoints) return;
    const pos = mapLabelPosition(map, endpoints, state.canvasWidth, state.canvasHeight);
    const mapLabel = refs.canvasLabels.querySelector(`[data-object-kind="map"][data-object-id="${cssEscape(map.id)}"]`);
    if (mapLabel) {
      mapLabel.style.left = `${pos.x}px`;
      mapLabel.style.top = `${pos.y}px`;
    }
    const curve = mapRawCurveGeometry(map, endpoints.from, endpoints.to, state.canvasWidth, state.canvasHeight);
    if (!curve) return;
    curve.anchors.forEach((_, index) => {
      updateMapControlElement(map.id, `handle:${index}:in`, curve.inHandles[index]);
      updateMapControlElement(map.id, `handle:${index}:out`, curve.outHandles[index]);
    });
    curve.anchors.forEach((anchor, index) => {
      updateMapControlElement(map.id, `anchor:${index}`, anchor);
    });
    redrawCanvasSurface();
  }

  function updateMapControlElement(mapId, control, point) {
    const element = refs.canvasLabels.querySelector(`[data-map-id="${cssEscape(mapId)}"][data-map-control="${cssEscape(control)}"]`);
    if (!element || !point) return;
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  }

  function objectByKind(kind, id) {
    if (kind === 'number') return (state.globalInvariants || []).find((entry) => entry.id === id);
    if (kind === 'sheaf') return state.sheaves.find((entry) => entry.id === id);
    if (kind === 'map') return state.maps.find((entry) => entry.id === id);
    if (kind === 'sequence') return (state.sequences || []).find((entry) => entry.id === id);
    return state.varieties.find((entry) => entry.id === id);
  }

  function pointOutsideRect(x, y, rect) {
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle - 0.45), y2 - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - 10 * Math.cos(angle + 0.45), y2 - 10 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  function drawBezierPathArrow(ctx, path, color) {
    const segments = path?.segments || [];
    if (!segments.length) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(segments[0].start.x, segments[0].start.y);
    segments.forEach((segment) => {
      ctx.bezierCurveTo(segment.c1.x, segment.c1.y, segment.c2.x, segment.c2.y, segment.end.x, segment.end.y);
    });
    ctx.stroke();
    const last = segments[segments.length - 1];
    const tangent = cubicBezierTangent(last.start, last.c1, last.c2, last.end, 1);
    const fallback = { x: last.end.x - last.c2.x, y: last.end.y - last.c2.y };
    const angle = Math.atan2(
      Math.abs(tangent.y) > 0.001 || Math.abs(tangent.x) > 0.001 ? tangent.y : fallback.y,
      Math.abs(tangent.y) > 0.001 || Math.abs(tangent.x) > 0.001 ? tangent.x : fallback.x
    );
    ctx.beginPath();
    ctx.moveTo(last.end.x, last.end.y);
    ctx.lineTo(last.end.x - 10 * Math.cos(angle - 0.45), last.end.y - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(last.end.x - 10 * Math.cos(angle + 0.45), last.end.y - 10 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  function drawMapPenGuides(ctx, map, from, to, width, height) {
    const path = mapRawCurveGeometry(map, from, to, width, height);
    if (!path) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(139,58,42,0.34)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    path.anchors.forEach((anchor, index) => {
      const lastIndex = path.anchors.length - 1;
      const handles = [];
      if (index === 0) handles.push(path.outHandles[index]);
      else if (index === lastIndex) handles.push(path.inHandles[index]);
      else handles.push(path.inHandles[index], path.outHandles[index]);
      handles.forEach((handle) => {
        if (!handle) return;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(handle.x, handle.y);
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  function refreshExport(scope = state.exportScope || 'main') {
    if (!refs.exportOut) return;
    state.exportScope = scope || 'main';
    if (!state.lastResult) {
      refs.exportOut.value = '';
      return;
    }
    const format = refs.exportFormat.value;
    refs.exportOut.value = exportResult(state.lastResult, format, state.exportScope);
  }

  function openChartExport(scope) {
    refreshExport(scope);
    if (refs.exportCard) refs.exportCard.classList.remove('collapsed');
    refs.status.textContent = scope === 'hodge' ? 'hodge numbers export ready' : 'characteristic classes export ready';
  }

  function exportResult(result, format, scope = 'main') {
    if (format === 'preset-json') return exportPresetState();
    if (scope === 'classes') {
      if (!result.classRows.length) return `No characteristic classes available. ${classChartEmptyMessage()}`;
      return exportClassChart(result, format);
    }
    if (scope === 'hodge') {
      if (!result.hodge || !result.geometry) return `No Hodge numbers available. ${hodgeChartEmptyMessage()}`;
      return exportHodgeChart(result, format);
    }
    return exportMainCanvas(result, format);
  }

  function exportPresetState() {
    return JSON.stringify(buildPresetState());
  }

  function setPresetImportPanelVisible(visible) {
    if (!refs.importPresetPanel) return;
    refs.importPresetPanel.hidden = !visible;
    if (refs.importPresetToggle) refs.importPresetToggle.setAttribute('aria-expanded', visible ? 'true' : 'false');
    showPresetImportMessage('', false);
    if (visible) refs.importPresetInput?.focus?.();
  }

  function showPresetImportMessage(message, isError = false) {
    if (!refs.importPresetMessage) return;
    refs.importPresetMessage.textContent = message || '';
    refs.importPresetMessage.classList.toggle('is-error', !!isError);
  }

  function importPresetFromText(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('Paste Preset JSON before loading.');
    let preset;
    try {
      preset = JSON.parse(raw);
    } catch (_) {
      throw new Error('Preset JSON is not valid JSON.');
    }
    applyPresetState(preset);
    showPresetImportMessage('loaded', false);
    if (refs.status) refs.status.textContent = 'preset imported';
    if (refs.importPresetInput) refs.importPresetInput.value = '';
    setPresetImportPanelVisible(false);
    return true;
  }

  function applyPresetState(preset) {
    validatePresetEnvelope(preset);
    const normalized = normalizePresetState(preset);
    replaceInputState(normalized);
    applyPresetOptions(normalized.options || {});
    activatePresetSelection(normalized.active || {});
    completePresetImport();
    return normalized;
  }

  function validatePresetEnvelope(preset) {
    if (!preset || typeof preset !== 'object' || Array.isArray(preset)) throw new Error('Preset must be a JSON object.');
    if (preset.schema !== 'sheaf-calculator-preset') throw new Error('Preset schema is not for this calculator.');
    if (Number(preset.version || 0) !== 1) throw new Error(`Preset version ${preset.version || '?'} is not supported.`);
  }

  function normalizePresetState(preset) {
    const objects = preset.objects && typeof preset.objects === 'object' ? preset.objects : {};
    const normalized = {
      active: sanitizePresetActive(preset.active),
      options: sanitizePresetOptions(preset.options),
      hidden: sanitizePresetHiddenRefs(preset.hidden),
      nextObjectIndex: normalizedInt(preset.nextObjectIndex, 1, 1000000, 1),
      objects: {
        numbers: sanitizePresetObjects(objects.numbers, sanitizePresetGlobalInvariant),
        varieties: sanitizePresetObjects(objects.varieties, sanitizePresetVariety),
        sheaves: sanitizePresetObjects(objects.sheaves, sanitizePresetSheaf),
        maps: sanitizePresetObjects(objects.maps, sanitizePresetMap),
        sequences: sanitizePresetObjects(objects.sequences, sanitizePresetSequence)
      }
    };
    ensurePresetCollectionsHaveUniqueIds(normalized.objects);
    return normalized;
  }

  function sanitizePresetObjects(items, sanitizer) {
    if (!Array.isArray(items)) return [];
    return items.map(sanitizer).filter(Boolean);
  }

  function sanitizePresetGlobalInvariant(item) {
    if (!item || typeof item !== 'object') return null;
    const id = sanitizePresetId(item.id);
    if (!id) return null;
    const invariant = {
      id,
      type: 'rational-number',
      name: sanitizeGlobalInvariantName(item.name, 'a'),
      value: sanitizeIntegerString(item.value, '0'),
      hasValue: item.hasValue === true,
      replaceWithValue: item.replaceWithValue === true,
      auto: item.auto === true,
      unused: item.unused === true
    };
    if (Array.isArray(item.sources)) invariant.sources = item.sources.map((source) => sanitizePresetId(source)).filter(Boolean);
    return invariant;
  }

  function sanitizePresetVariety(item) {
    if (!item || typeof item !== 'object') return null;
    const id = sanitizePresetId(item.id);
    if (!id) return null;
    const type = sanitizePresetEnum(item.type, ['abstract', 'projective', 'grassmannian', 'curve', 'abelian', 'point', 'complete-intersection'], 'abstract');
    const variety = {
      id,
      type,
      dim: sanitizeDimensionText(item.dim ?? '3'),
      name: sanitizeMathLabel(item.name, type === 'projective' ? '\\mathbb{P}^3' : 'X'),
      genus: sanitizeGenusInput(item.genus),
      ciDegrees: sanitizePresetString(item.ciDegrees, '', 80),
      nameDirty: item.nameDirty === true,
      hiddenOnCanvas: item.hiddenOnCanvas === true,
      grassmannianR: String(normalizedInt(item.grassmannianR, 1, MAX_GRASSMANNIAN_N, 2)),
      grassmannianN: String(normalizedInt(item.grassmannianN, 2, MAX_GRASSMANNIAN_N, 4)),
      grassmannianYoungBasis: item.grassmannianYoungBasis === true
    };
    const ciAmbient = normalizedInt(item.ciAmbient, 0, MAX_AMBIENT, NaN);
    if (Number.isFinite(ciAmbient)) variety.ciAmbient = String(ciAmbient);
    copyPresetCanvasPosition(item, variety);
    if (item.homology && typeof item.homology === 'object') variety.homology = cloneSerializableValue(item.homology);
    const construction = sanitizePresetConstruction(item.construction, 'variety');
    if (construction) variety.construction = construction;
    return variety;
  }

  function sanitizePresetSheaf(item) {
    if (!item || typeof item !== 'object') return null;
    const id = sanitizePresetId(item.id);
    if (!id) return null;
    const type = canonicalSheafType(sanitizePresetEnum(item.type, ['abstract', 'locally-free', 'structure', 'tangent', 'cotangent', 'canonical', 'twist', 'universal-bundle', 'universal-line'], 'abstract'));
    const sheaf = {
      id,
      type,
      name: sanitizeMathLabel(item.name, '\\mathcal{E}'),
      twist: String(normalizedInt(item.twist, -24, 24, 1)),
      rank: sanitizeRankInput(item.rank),
      baseVarietyId: sanitizePresetId(item.baseVarietyId),
      basis: normalizeBasisValue(item.basis),
      nameDirty: item.nameDirty === true,
      hiddenOnCanvas: item.hiddenOnCanvas === true
    };
    copyPresetCanvasPosition(item, sheaf);
    if (item.homology && typeof item.homology === 'object') sheaf.homology = cloneSerializableValue(item.homology);
    const construction = sanitizePresetConstruction(item.construction, 'sheaf');
    if (construction) sheaf.construction = construction;
    return sheaf;
  }

  function sanitizePresetMap(item) {
    if (!item || typeof item !== 'object') return null;
    const id = sanitizePresetId(item.id);
    if (!id) return null;
    const map = {
      id,
      name: sanitizeMathLabel(item.name, 'f'),
      domainKind: sanitizePresetEndpointKind(item.domainKind),
      domainId: sanitizePresetId(item.domainId),
      codomainKind: sanitizePresetEndpointKind(item.codomainKind),
      codomainId: sanitizePresetId(item.codomainId),
      nameDirty: item.nameDirty === true,
      hiddenOnCanvas: item.hiddenOnCanvas === true,
      modified: item.modified === true
    };
    const bend = Number(item.defaultBendPx);
    if (Number.isFinite(bend)) map.defaultBendPx = clamp(bend, -240, 240);
    map.labelOffset = normalizedMapLabelOffset(item.labelOffset);
    const labelT = Number(item.labelT);
    map.labelT = Number.isFinite(labelT) ? clamp(labelT, 0.06, 0.94) : DEFAULT_MAP_LABEL_T;
    copyPresetCanvasPosition(item, map);
    const construction = sanitizePresetConstruction(item.construction, 'map');
    if (construction) map.construction = construction;
    const curve = normalizeMapCurve(item.curve);
    if (curve) map.curve = curve;
    return map.domainKind && map.domainId && map.codomainKind && map.codomainId ? map : null;
  }

  function sanitizePresetSequence(item) {
    if (!item || typeof item !== 'object') return null;
    const id = sanitizePresetId(item.id);
    if (!id) return null;
    return {
      id,
      type: item.type === 'short-exact-sequence' ? 'short-exact-sequence' : 'short-exact-sequence',
      sheafIds: Array.isArray(item.sheafIds) ? item.sheafIds.map(sanitizePresetId).filter(Boolean).slice(0, 3) : [],
      mapIds: Array.isArray(item.mapIds) ? item.mapIds.map(sanitizePresetId).filter(Boolean).slice(0, 2) : [],
      baseVarietyId: sanitizePresetId(item.baseVarietyId),
      tail: normalizeSequenceTailCurve(item.tail) || normalizeSequenceTailCurve({ pointCount: DEFAULT_SEQUENCE_TAIL_POINT_COUNT }),
      modified: item.modified === true
    };
  }

  function sanitizePresetConstruction(construction, ownerKind) {
    if (!construction || typeof construction !== 'object') return null;
    const type = construction.type;
    const out = { type };
    if (ownerKind === 'variety' && type === 'product') {
      out.varietyIds = Array.isArray(construction.varietyIds) ? construction.varietyIds.map(sanitizePresetId).filter(Boolean).slice(0, 2) : [];
    } else if (ownerKind === 'variety' && type === 'jacobian') {
      out.curveId = sanitizePresetId(construction.curveId);
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'variety' && type === 'blow-up-point') {
      out.baseId = sanitizePresetId(construction.baseId);
      out.pointId = sanitizePresetId(construction.pointId);
    } else if (ownerKind === 'variety' && type === 'grassmannian-target') {
      out.sheafId = sanitizePresetId(construction.sheafId);
      out.baseId = sanitizePresetId(construction.baseId);
    } else if (ownerKind === 'sheaf' && (type === 'direct-sum' || type === 'tensor')) {
      out.sheafIds = Array.isArray(construction.sheafIds) ? construction.sheafIds.map(sanitizePresetId).filter(Boolean).slice(0, 2) : [];
      out.derived = construction.derived === true;
      out.exact = construction.exact === true;
    } else if (ownerKind === 'sheaf' && type === 'self-direct-sum') {
      out.sheafId = sanitizePresetId(construction.sheafId);
      out.multiplicity = normalizeSelfSumMultiplicity(construction.multiplicity);
    } else if (ownerKind === 'sheaf' && type === 'schur') {
      out.sheafId = sanitizePresetId(construction.sheafId);
      out.partition = normalizeSchurPartition(construction.partition) || [1];
    } else if (ownerKind === 'sheaf' && (type === 'pullback' || type === 'pushforward')) {
      out.mapId = sanitizePresetId(construction.mapId);
      out.sheafId = sanitizePresetId(construction.sheafId);
      out.derived = construction.derived === true;
      out.exact = construction.exact === true;
      out.proper = type === 'pushforward' && construction.proper === true;
    } else if (ownerKind === 'sheaf' && type === 'ses-term') {
      out.role = sanitizePresetEnum(construction.role, ['subobject', 'extension', 'quotient'], 'extension');
      out.sourceSheafIds = Array.isArray(construction.sourceSheafIds) ? construction.sourceSheafIds.map(sanitizePresetId).filter(Boolean).slice(0, 3) : [];
      out.idealSheafMapId = sanitizePresetId(construction.idealSheafMapId);
      out.structureSheafId = sanitizePresetId(construction.structureSheafId);
      out.targetStructureSheafId = sanitizePresetId(construction.targetStructureSheafId);
      out.pushforwardSheafId = sanitizePresetId(construction.pushforwardSheafId);
      out.sequenceId = sanitizePresetId(construction.sequenceId);
      out.inclusionMapId = sanitizePresetId(construction.inclusionMapId);
      out.quotientMapId = sanitizePresetId(construction.quotientMapId);
    } else if (ownerKind === 'sheaf' && type === 'trivial-bundle') {
      out.rank = sanitizeRankInput(construction.rank);
    } else if (ownerKind === 'map' && type === 'composition') {
      out.mapIds = Array.isArray(construction.mapIds) ? construction.mapIds.map(sanitizePresetId).filter(Boolean).slice(0, 2) : [];
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'map' && type === 'projection') {
      out.productId = sanitizePresetId(construction.productId);
      out.factorIndex = normalizedInt(construction.factorIndex, 0, 1, 0);
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'map' && type === 'abel-jacobi') {
      out.curveId = sanitizePresetId(construction.curveId);
      out.jacobianId = sanitizePresetId(construction.jacobianId);
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'map' && type === 'short-exact-sequence-map') {
      out.sequenceId = sanitizePresetId(construction.sequenceId);
      out.position = normalizedInt(construction.position, 0, 1, 0);
      out.sheafIds = Array.isArray(construction.sheafIds) ? construction.sheafIds.map(sanitizePresetId).filter(Boolean).slice(0, 3) : [];
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'map' && type === 'blow-down') {
      out.blowupId = sanitizePresetId(construction.blowupId);
      out.baseId = sanitizePresetId(construction.baseId);
      out.pointId = sanitizePresetId(construction.pointId);
      out.nameDirty = construction.nameDirty === true;
    } else if (ownerKind === 'map' && type === 'grassmannian-map') {
      out.sheafId = sanitizePresetId(construction.sheafId);
      out.baseId = sanitizePresetId(construction.baseId);
      out.targetId = sanitizePresetId(construction.targetId);
      out.nameDirty = construction.nameDirty === true;
    } else {
      return null;
    }
    if (construction.defaultName != null) out.defaultName = sanitizeMathLabel(construction.defaultName, '');
    return compactSerializable(out);
  }

  function replaceInputState(preset) {
    state.globalInvariants = preset.objects.numbers;
    state.varieties = preset.objects.varieties;
    state.sheaves = preset.objects.sheaves;
    state.maps = preset.objects.maps;
    state.sequences = preset.objects.sequences;
    normalizeImportedReferences();
    applyPresetHiddenRefs(preset.hidden);
    refreshConstructedObjects();
    state.nextObjectId = Math.max(preset.nextObjectIndex, nextPresetObjectIndex());
    state.labelDrag = null;
    state.mapDrag = null;
    state.mapControlDrag = null;
    state.sequenceTailDrag = null;
    state.productDraft = null;
    state.sesDraft = null;
    state.blowupDraft = null;
    state.tautologicalSesDraft = null;
    state.grassmannianMapDraft = null;
    state.mapDraft = null;
    state.sheafBinaryDraft = null;
    state.sheafSelfSumDraft = null;
    state.sheafIdealDraft = null;
    state.sheafSchurDraft = null;
    state.sheafMapDraft = null;
    setCanvasPickEnabled(false, { render: false });
  }

  function normalizeImportedReferences() {
    const varietyIds = new Set(state.varieties.map((item) => item.id));
    state.sheaves = state.sheaves.filter((sheaf) => !sheaf.baseVarietyId || varietyIds.has(sheaf.baseVarietyId));
    const sheafIds = new Set(state.sheaves.map((item) => item.id));
    state.maps = state.maps.filter((map) => (
      map.domainKind === map.codomainKind
      && endpointSetForKind(map.domainKind, varietyIds, sheafIds).has(map.domainId)
      && endpointSetForKind(map.codomainKind, varietyIds, sheafIds).has(map.codomainId)
    ));
    const currentMapIds = new Set(state.maps.map((item) => item.id));
    const currentSheafIds = new Set(state.sheaves.map((item) => item.id));
    state.sequences = state.sequences.filter((sequence) => (
      (sequence.sheafIds || []).every((id) => currentSheafIds.has(id))
      && (sequence.mapIds || []).every((id) => currentMapIds.has(id))
    ));
    state.sequences.forEach(attachShortExactSequenceMemberships);
    [...state.varieties, ...state.sheaves, ...state.maps].forEach((object) => syncObjectLineage(object));
  }

  function endpointSetForKind(kind, varietyIds, sheafIds) {
    if (kind === 'sheaf') return sheafIds;
    return kind === 'variety' ? varietyIds : new Set();
  }

  function applyPresetOptions(options) {
    if (refs.repeatNames) refs.repeatNames.checked = options.repeatNames === true;
    if (refs.repeatStyle) refs.repeatStyle.value = sanitizePresetEnum(options.repeatStyle, ['letters', 'prime', 'paren', 'subscript'], 'letters');
    if (refs.basis) refs.basis.value = normalizeBasisValue(options.classBasis);
    if (refs.rootForm) refs.rootForm.value = sanitizePresetEnum(options.rootForm, ['product', 'expanded'], 'product');
    if (refs.classTermOnly) refs.classTermOnly.checked = options.classTermOnly === true;
    if (refs.classTermIndex) refs.classTermIndex.value = String(normalizedInt(options.classTermIndex, 0, MAX_DIMENSION, 1));
    state.hodgeExpanded = options.hodgeExpanded === true;
    state.hodgeWide = options.hodgeWide === true;
    state.hodgeCellSize = normalizedInt(options.hodgeCellSize, 15, 30, 20);
    state.revealedCharts = {
      hodge: options.revealedCharts?.hodge === true,
      classes: options.revealedCharts?.classes === true,
      cohomology: options.revealedCharts?.cohomology === true
    };
    state.homologyRulePasses = normalizedInt(options.homologyRulePasses, 1, 20, DEFAULT_HOMOLOGY_RULE_PASSES);
    const homologyInputMode = options.homologyMapInputMode === 'expression' ? 'formula' : options.homologyMapInputMode;
    state.homologyMapInputMode = sanitizePresetEnum(homologyInputMode, ['coefficients', 'formula'], 'coefficients');
    state.homologyExpressionTransposed = options.homologyExpressionTransposed === true;
    state.exportScope = sanitizePresetEnum(options.exportScope, ['main', 'classes', 'hodge'], 'main');
    if (refs.hodgeExpanded) refs.hodgeExpanded.checked = !!state.hodgeExpanded;
    if (refs.hodgeCellSize) refs.hodgeCellSize.value = String(state.hodgeCellSize);
    if (refs.hodgeCellSizeValue) refs.hodgeCellSizeValue.textContent = `${state.hodgeCellSize}px`;
    if (refs.homologyMapInputMode) refs.homologyMapInputMode.value = state.homologyMapInputMode;
    if (refs.homologyTransposeExpressions) refs.homologyTransposeExpressions.setAttribute('aria-pressed', state.homologyExpressionTransposed ? 'true' : 'false');
    if (refs.exportFormat && refs.exportFormat.value === 'preset-json') refs.exportFormat.value = 'preset-json';
  }

  function activatePresetSelection(active) {
    state.activeGlobalInvariantId = null;
    state.activeVarietyId = state.varieties[0]?.id || null;
    state.activeSheafId = null;
    state.activeMapId = null;
    state.activeSequenceId = null;
    const desiredKind = sanitizePresetEnum(active.kind, ['number', 'variety', 'sheaf', 'map', 'sequence'], 'variety');
    const desired = {
      number: active.numberId,
      variety: active.varietyId,
      sheaf: active.sheafId,
      map: active.mapId,
      sequence: active.sequenceId
    };
    const kind = objectByKind(desiredKind, desired[desiredKind]) ? desiredKind : firstPresetActiveKind();
    const desiredId = kind ? desired[kind] : null;
    const id = kind ? (objectByKind(kind, desiredId) ? desiredId : firstPresetActiveId(kind)) : null;
    if (kind === 'number') state.activeGlobalInvariantId = id;
    else if (kind === 'variety') state.activeVarietyId = id;
    else if (kind === 'sheaf') {
      state.activeSheafId = id;
      state.activeVarietyId = state.sheaves.find((sheaf) => sheaf.id === id)?.baseVarietyId || state.activeVarietyId;
    } else if (kind === 'map') state.activeMapId = id;
    else if (kind === 'sequence') {
      state.activeSequenceId = id;
      state.activeVarietyId = state.sequences.find((sequence) => sequence.id === id)?.baseVarietyId || state.activeVarietyId;
    }
    if (!hasInputControlDom()) {
      state.inputMode = active.mode === 'create' ? 'create' : 'modify';
      return;
    }
    setInputMode(active.mode === 'create' ? 'create' : 'modify', { loadDraft: false });
    if (state.inputMode === 'modify' && activeObjectForModifyMode()) loadActiveObjectIntoDraft(modifyKind());
    else if (state.inputMode === 'create') resetDraftForKind(firstPresetCreateKind(active.kind));
  }

  function completePresetImport() {
    if (!hasInputControlDom()) {
      state.hiddenObjects = hiddenObjectRefs();
      return;
    }
    syncSheafBaseOptions(true);
    syncInputEditorVisibility();
    normalizeControlVisibility();
    syncShowCanvasButton();
    syncHodgeWidePlacement();
    recompute();
    typeset(refs.varietyEditor);
    typeset(refs.sheafEditor);
    typeset(refs.mapEditor);
    typeset(refs.combinedEditor);
  }

  function hasInputControlDom() {
    return !!(refs.inputMode && refs.addObjectKind && refs.varietyEditor && refs.sheafEditor);
  }

  function firstPresetActiveKind() {
    if (state.sheaves.length) return 'sheaf';
    if (state.varieties.length) return 'variety';
    if (state.maps.length) return 'map';
    if ((state.sequences || []).length) return 'sequence';
    if ((state.globalInvariants || []).length) return 'number';
    return null;
  }

  function firstPresetActiveId(kind) {
    if (kind === 'number') return state.globalInvariants[0]?.id || null;
    if (kind === 'sheaf') return state.sheaves[0]?.id || null;
    if (kind === 'map') return state.maps[0]?.id || null;
    if (kind === 'sequence') return state.sequences[0]?.id || null;
    return state.varieties[0]?.id || null;
  }

  function firstPresetCreateKind(kind) {
    return sanitizePresetEnum(kind, ['number', 'variety', 'sheaf', 'map'], 'variety');
  }

  function sanitizePresetActive(active) {
    const source = active && typeof active === 'object' ? active : {};
    return {
      mode: source.mode === 'create' ? 'create' : 'modify',
      kind: sanitizePresetEnum(source.kind, ['number', 'variety', 'sheaf', 'map', 'sequence'], 'variety'),
      varietyId: sanitizePresetId(source.varietyId),
      sheafId: sanitizePresetId(source.sheafId),
      mapId: sanitizePresetId(source.mapId),
      sequenceId: sanitizePresetId(source.sequenceId),
      numberId: sanitizePresetId(source.numberId)
    };
  }

  function sanitizePresetOptions(options) {
    return options && typeof options === 'object' ? options : {};
  }

  function sanitizePresetHiddenRefs(items) {
    if (!Array.isArray(items)) return [];
    const kinds = ['number', 'variety', 'sheaf', 'map', 'sequence-tail'];
    return items.map((item) => {
      if (!item || typeof item !== 'object') return null;
      const kind = sanitizePresetEnum(item.kind, kinds, null);
      const id = sanitizePresetId(item.id);
      return kind && id ? { kind, id } : null;
    }).filter(Boolean);
  }

  function applyPresetHiddenRefs(hiddenRefs) {
    const keys = new Set((hiddenRefs || []).map((item) => `${item.kind}:${item.id}`));
    state.varieties.forEach((item) => { item.hiddenOnCanvas = keys.has(`variety:${item.id}`); });
    state.sheaves.forEach((item) => { item.hiddenOnCanvas = keys.has(`sheaf:${item.id}`); });
    state.maps.forEach((item) => { item.hiddenOnCanvas = keys.has(`map:${item.id}`); });
    state.sequences.forEach((sequence) => {
      sequence.tail = normalizeSequenceTailCurve(sequence.tail) || {};
      sequence.tail.hiddenOnCanvas = keys.has(`sequence-tail:${sequence.id}`);
    });
    state.hiddenObjects = hiddenObjectRefs();
  }

  function sanitizePresetId(value) {
    const text = String(value ?? '').trim();
    if (!text || text.length > 80) return null;
    return /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(text) ? text : null;
  }

  function sanitizePresetEndpointKind(value) {
    return value === 'sheaf' || value === 'variety' ? value : null;
  }

  function sanitizePresetEnum(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function sanitizePresetString(value, fallback = '', maxLength = 120) {
    const text = String(value ?? fallback);
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  function copyPresetCanvasPosition(source, target) {
    const x = Number(source.labelX);
    const y = Number(source.labelY);
    if (Number.isFinite(x)) target.labelX = clamp(x, 0.04, 0.96);
    if (Number.isFinite(y)) target.labelY = clamp(y, 0.07, 0.93);
    if (source.labelPositionDirty === true) target.labelPositionDirty = true;
  }

  function ensurePresetCollectionsHaveUniqueIds(objects) {
    const seen = new Set();
    Object.values(objects).forEach((items) => {
      items.forEach((item) => {
        if (!item?.id || seen.has(item.id)) item.id = null;
        else seen.add(item.id);
      });
    });
    Object.keys(objects).forEach((key) => {
      objects[key] = objects[key].filter((item) => item?.id);
    });
  }

  function nextPresetObjectIndex() {
    let max = 0;
    const visit = (id) => {
      const match = String(id || '').match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    };
    [
      ...state.varieties,
      ...state.sheaves,
      ...state.maps,
      ...(state.sequences || []),
      ...(state.globalInvariants || [])
    ].forEach((item) => visit(item.id));
    return max + 1;
  }

  function buildPresetState() {
    const inputKind = currentInputKind();
    return compactSerializable({
      schema: 'sheaf-calculator-preset',
      version: 1,
      exportedAt: new Date().toISOString(),
      active: {
        mode: state.inputMode,
        kind: inputKind,
        varietyId: state.activeVarietyId,
        sheafId: state.activeSheafId,
        mapId: state.activeMapId,
        sequenceId: state.activeSequenceId,
        numberId: state.activeGlobalInvariantId
      },
      options: {
        repeatNames: !!refs.repeatNames?.checked,
        repeatStyle: refs.repeatStyle?.value || 'letters',
        classBasis: refs.basis?.value || 'chern',
        rootForm: refs.rootForm?.value || 'product',
        classTermOnly: !!refs.classTermOnly?.checked,
        classTermIndex: normalizedInt(refs.classTermIndex?.value, 0, MAX_DIMENSION, 1),
        hodgeExpanded: !!state.hodgeExpanded,
        hodgeWide: !!state.hodgeWide,
        hodgeCellSize: state.hodgeCellSize,
        revealedCharts: { ...state.revealedCharts },
        homologyRulePasses: state.homologyRulePasses,
        homologyMapInputMode: state.homologyMapInputMode,
        homologyExpressionTransposed: state.homologyExpressionTransposed,
        exportScope: state.exportScope || 'main'
      },
      objects: {
        numbers: (state.globalInvariants || []).map(presetGlobalInvariant),
        varieties: state.varieties.map(presetVariety),
        sheaves: state.sheaves.map(presetSheaf),
        maps: state.maps.map(presetMap),
        sequences: (state.sequences || []).map(presetSequence)
      },
      hidden: hiddenObjectRefs(),
      nextObjectIndex: state.nextObjectId
    });
  }

  function presetGlobalInvariant(invariant) {
    return pickSerializable(invariant, [
      'id', 'type', 'name', 'value', 'hasValue', 'replaceWithValue',
      'auto', 'unused', 'sources'
    ]);
  }

  function presetVariety(variety) {
    return pickSerializable(variety, [
      'id', 'type', 'dim', 'name', 'genus', 'ciDegrees', 'ciAmbient',
      'grassmannianR', 'grassmannianN', 'grassmannianYoungBasis',
      'homology', 'construction', 'nameDirty', 'hiddenOnCanvas',
      'labelX', 'labelY', 'labelPositionDirty'
    ]);
  }

  function presetSheaf(sheaf) {
    return pickSerializable(sheaf, [
      'id', 'type', 'name', 'twist', 'rank', 'baseVarietyId', 'basis',
      'homology', 'construction', 'nameDirty', 'hiddenOnCanvas',
      'labelX', 'labelY', 'labelPositionDirty'
    ]);
  }

  function presetMap(map) {
    return pickSerializable(map, [
      'id', 'name', 'domainKind', 'domainId', 'codomainKind', 'codomainId',
      'construction', 'curve', 'nameDirty', 'hiddenOnCanvas', 'modified',
      'defaultBendPx', 'labelOffset', 'labelT', 'labelX', 'labelY',
      'labelPositionDirty'
    ]);
  }

  function presetSequence(sequence) {
    return pickSerializable(sequence, [
      'id', 'type', 'sheafIds', 'mapIds', 'baseVarietyId',
      'tail', 'modified'
    ]);
  }

  function pickSerializable(source, keys) {
    const out = {};
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(source || {}, key)) return;
      const value = source[key];
      if (value === undefined || typeof value === 'function') return;
      out[key] = cloneSerializableValue(value);
    });
    return compactSerializable(out);
  }

  function cloneSerializableValue(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneSerializableValue);
    if (typeof value === 'object') {
      const out = {};
      Object.keys(value).forEach((key) => {
        if (key === 'parents' || key === 'subobjects' || key === 'sourceObject') return;
        const item = value[key];
        if (item === undefined || typeof item === 'function') return;
        out[key] = cloneSerializableValue(item);
      });
      return compactSerializable(out);
    }
    return value;
  }

  function compactSerializable(value) {
    if (Array.isArray(value)) return value.map(compactSerializable);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.entries(value).forEach(([key, item]) => {
      const compact = compactSerializable(item);
      if (compact == null) return;
      if (compact === false) return;
      if (Array.isArray(compact) && compact.length === 0) return;
      if (typeof compact === 'object' && !Array.isArray(compact) && Object.keys(compact).length === 0) return;
      out[key] = compact;
    });
    return out;
  }

  function exportMainCanvas(result, format) {
    const lines = [];
    const basisPlain = basisLabel(result.sheaf?.basis);
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: main canvas');
      state.varieties.forEach((variety, index) => {
        const marker = variety.id === state.activeVarietyId ? '\\quad\\text{active for }h^{p,q}' : '';
        lines.push(`\\[X_{${index + 1}}:\\ ${exportVarietyLatex(variety)}${marker}\\]`);
      });
      state.sheaves.forEach((sheaf, index) => {
        const marker = sheaf.id === state.activeSheafId ? '\\quad\\text{active for }A^*' : '';
        lines.push(`\\[E_{${index + 1}}:\\ ${exportSheafLatex(sheaf)}${marker}\\]`);
      });
      state.maps.forEach((map, index) => {
        const marker = map.id === state.activeMapId ? '\\quad\\text{active map}' : '';
        lines.push(`\\[f_{${index + 1}}:\\ ${exportMapLatex(map)}${marker}\\]`);
      });
      (state.sequences || []).forEach((sequence, index) => {
        lines.push(`\\[S_{${index + 1}}:\\ ${defaultShortExactSequenceLabel(sequence)}\\]`);
      });
      if (result.sheaf) lines.push(`% basis: ${basisPlain}`);
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: main canvas');
      state.varieties.forEach((variety, index) => {
        const marker = variety.id === state.activeVarietyId ? ' active for hodge numbers' : '';
        lines.push(`# X_${index + 1}: ${exportVarietyPlain(variety)}${marker}`);
      });
      state.sheaves.forEach((sheaf, index) => {
        const marker = sheaf.id === state.activeSheafId ? ' active for characteristic classes' : '';
        lines.push(`# E_${index + 1}: ${exportSheafPlain(sheaf)}${marker}`);
      });
      state.maps.forEach((map, index) => {
        const marker = map.id === state.activeMapId ? ' active map' : '';
        lines.push(`# f_${index + 1}: ${exportMapPlain(map)}${marker}`);
      });
      (state.sequences || []).forEach((sequence, index) => {
        lines.push(`# S_${index + 1}: ${latexToPlain(defaultShortExactSequenceLabel(sequence))}`);
      });
      if (result.sheaf) lines.push(`# basis: ${basisPlain}`);
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: main canvas');
    state.varieties.forEach((variety, index) => {
      const marker = variety.id === state.activeVarietyId ? ' active for Hodge numbers' : '';
      lines.push(`X_${index + 1}: ${exportVarietyPlain(variety)}${marker}`);
    });
    state.sheaves.forEach((sheaf, index) => {
      const marker = sheaf.id === state.activeSheafId ? ' active for characteristic classes' : '';
      lines.push(`E_${index + 1}: ${exportSheafPlain(sheaf)}${marker}`);
    });
    state.maps.forEach((map, index) => {
      const marker = map.id === state.activeMapId ? ' active map' : '';
      lines.push(`f_${index + 1}: ${exportMapPlain(map)}${marker}`);
    });
    (state.sequences || []).forEach((sequence, index) => {
      lines.push(`S_${index + 1}: ${latexToPlain(defaultShortExactSequenceLabel(sequence))}`);
    });
    if (result.sheaf) lines.push(`basis: ${basisPlain}`);
    return lines.join('\n');
  }

  function exportVarietyLatex(variety) {
    const geometry = geometryFromVariety(variety);
    const parts = [
      `${sanitizeMathLabel(variety.name, 'X')}`,
      `\\operatorname{type}=\\text{${varietyTypeLabel(variety.type)}}`,
      `\\dim=${geometry.dim}`
    ];
    if (geometryHasNumericalCurveLabel(geometry)) parts.push(`g=${genusLatex(geometry.type === 'curve' ? geometry.genus : numericalCurveGenus(geometry))}`);
    if (geometry.type === 'projective') parts.push(`\\text{ambient}=\\mathbb{P}^{${geometry.ambient}}`);
    if (geometry.type === 'grassmannian') parts.push(`(r,n)=(${geometry.grassmannianR},${geometry.grassmannianN})`);
    if (geometry.type === 'complete-intersection') {
      parts.push(`\\text{ambient}=\\mathbb{P}^{${geometry.ambient}}`);
      parts.push(`\\text{degrees}=(${geometry.degrees.join(',') || '0'})`);
    }
    return parts.join(',\\ ');
  }

  function exportSheafLatex(sheaf) {
    const base = baseVarietyForSheaf(sheaf);
    const rank = sanitizeRankInput(sheaf.rank);
    const parts = [
      `${sanitizeMathLabel(sheaf.name, '\\mathcal{E}')}`,
      `\\operatorname{type}=\\text{${sheafTypeLabel(sheaf.type)}}`,
      `\\operatorname{rk}=${simplifyScalarExpressionLatex(rank, { kind: 'sheaf', id: sheaf.id, field: 'rank' })}`
    ];
    if (base) parts.push(`\\text{base}=${sanitizeMathLabel(base.name, 'X')}`);
    if (sheaf.type === 'twist') parts.push(`r=${normalizedInt(sheaf.twist, -24, 24, 1)}`);
    if (sheaf.construction?.type === 'self-direct-sum') parts.push(`n=${normalizeSelfSumMultiplicity(sheaf.construction.multiplicity)}`);
    if (sheaf.construction?.type === 'schur') parts.push(`\\lambda=${schurPartitionLatex(sheaf.construction.partition)}`);
    parts.push(`\\text{basis}=\\text{${basisLabel(sheaf.basis)}}`);
    return parts.join(',\\ ');
  }

  function exportMapLatex(map) {
    return `${sanitizeMathLabel(map.name, 'f')}: ${objectLatexLabel(map.domainKind, map.domainId)}\\to ${objectLatexLabel(map.codomainKind, map.codomainId)}`;
  }

  function exportVarietyPlain(variety) {
    const geometry = geometryFromVariety(variety);
    const parts = [
      `name ${latexToPlain(variety.name)}`,
      `type ${varietyTypeLabel(variety.type)}`,
      `dim ${geometry.dim}`
    ];
    if (geometryHasNumericalCurveLabel(geometry)) parts.push(`genus ${genusPlain(geometry.type === 'curve' ? geometry.genus : numericalCurveGenus(geometry))}`);
    if (geometry.type === 'projective') parts.push(`ambient P^${geometry.ambient}`);
    if (geometry.type === 'grassmannian') parts.push(`r ${geometry.grassmannianR}`, `n ${geometry.grassmannianN}`);
    if (geometry.type === 'complete-intersection') {
      parts.push(`ambient P^${geometry.ambient}`);
      parts.push(`degrees ${geometry.degrees.join(',') || 'none'}`);
    }
    return parts.join('; ');
  }

  function exportSheafPlain(sheaf) {
    const base = baseVarietyForSheaf(sheaf);
    const parts = [
      `name ${latexToPlain(sheaf.name)}`,
      `type ${sheafTypeLabel(sheaf.type)}`,
      `rank ${sanitizeRankInput(sheaf.rank)}`
    ];
    if (base) parts.push(`base ${latexToPlain(base.name)}`);
    if (sheaf.type === 'twist') parts.push(`twist ${normalizedInt(sheaf.twist, -24, 24, 1)}`);
    if (sheaf.construction?.type === 'self-direct-sum') parts.push(`multiplicity ${normalizeSelfSumMultiplicity(sheaf.construction.multiplicity)}`);
    if (sheaf.construction?.type === 'schur') parts.push(`diagram ${formatSchurPartitionInput(sheaf.construction.partition)}`);
    parts.push(`basis ${basisLabel(sheaf.basis)}`);
    return parts.join('; ');
  }

  function exportMapPlain(map) {
    return `${latexToPlain(map.name)}: ${objectPlainLabel(map.domainKind, map.domainId)} -> ${objectPlainLabel(map.codomainKind, map.codomainId)}`;
  }

  function objectLatexLabel(kind, id) {
    if (kind === 'variety') return sanitizeMathLabel(state.varieties.find((item) => item.id === id)?.name, 'X');
    if (kind === 'sheaf') return sanitizeMathLabel(state.sheaves.find((item) => item.id === id)?.name, '\\mathcal{E}');
    return sanitizeMathLabel(state.maps.find((item) => item.id === id)?.name, 'f');
  }

  function varietyTypeLabel(type) {
    if (type === 'projective') return 'projective space';
    if (type === 'complete-intersection') return 'complete intersection';
    if (type === 'grassmannian') return 'Grassmannian';
    if (type === 'curve') return 'curve';
    if (type === 'abelian') return 'abelian variety';
    if (type === 'point') return 'point';
    return 'abstract variety';
  }

  function sheafTypeLabel(type) {
    if (type === 'structure') return 'structure sheaf';
    if (type === 'locally-free') return 'locally free';
    if (type === 'tangent') return 'tangent sheaf';
    if (type === 'cotangent') return 'cotangent sheaf';
    if (type === 'canonical') return 'canonical sheaf';
    if (type === 'twist') return 'twist';
    if (isUniversalBundleSheafType(type)) return 'universal bundle';
    if (type === 'self-direct-sum') return 'self direct sum';
    if (type === 'schur') return 'Schur functor';
    return 'abstract sheaf';
  }

  function exportClassChart(result, format) {
    const lines = [];
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: characteristic classes');
      lines.push(`% X: ${result.geometry.labelPlain}`);
      lines.push(`% E: ${result.bundle.labelPlain}`);
      lines.push(`% display: ${classDisplayDescription(result)}`);
      lines.push(...exportHomologyNotes(result.geometry, format));
      result.classRows.forEach((row) => lines.push(`\\[${row.labelLatex} = ${row.latex}\\]`));
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: characteristic classes');
      lines.push(`# X: ${result.geometry.labelPlain}`);
      lines.push(`# E: ${result.bundle.labelPlain}`);
      lines.push(`# display: ${classDisplayDescription(result)}`);
      lines.push(...exportHomologyNotes(result.geometry, format));
      result.classRows.forEach((row) => lines.push(`${row.key} = ${row.plain}`));
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: characteristic classes');
    lines.push(`X: ${result.geometry.labelPlain}`);
    lines.push(`E: ${result.bundle.labelPlain}`);
    lines.push(`display: ${classDisplayDescription(result)}`);
    lines.push(...exportHomologyNotes(result.geometry, format));
    result.classRows.forEach((row) => lines.push(`${row.label} = ${row.plain}`));
    return lines.join('\n');
  }

  function exportHomologyNotes(geometry, format) {
    const defs = homologyClassDefinitions(geometry);
    if (!defs.length) return [];
    const rules = (geometry.homology?.rules || []).filter((rule) => (
      rule.enabled !== false
      && homologyRulePreservesDegree(rule, defs, { geometry })
    ));
    if (format === 'latex') {
      return [
        ...defs.map((def) => `% ${def.symbolLatex} in H^{${def.cohomologyDegree}}(${geometry.labelPlain}): ${def.kind}`),
        ...rules.map((rule) => `% rule: ${homologyRulePlain(rule, geometry)}`)
      ];
    }
    const prefix = format === 'sage' ? '# ' : '';
    return [
      ...defs.map((def) => `${prefix}${def.symbolPlain} in H^${def.cohomologyDegree}(${geometry.labelPlain}): ${def.kind}`),
      ...rules.map((rule) => `${prefix}rule: ${homologyRulePlain(rule, geometry)}`)
    ];
  }

  function classDisplayDescription(result) {
    const expression = result.classRows.some((row) => row.key.startsWith('root_')) ? 'Chern roots' : 'class variables';
    const term = result.classDisplay?.termMode === 'term' ? `i=${result.classDisplay.termIndex}` : 'total';
    const form = expression === 'Chern roots' ? `, ${result.classDisplay?.rootForm === 'expanded' ? 'expanded polynomial' : 'product'}` : '';
    const passes = result.classDisplay?.homologyRulePasses || DEFAULT_HOMOLOGY_RULE_PASSES;
    return `${expression}${form}, ${term}, ${passes} homology rule pass${passes === 1 ? '' : 'es'}`;
  }

  function exportHodgeChart(result, format) {
    const lines = [];
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: Hodge numbers');
      lines.push('% requires \\usepackage{tikz-cd}');
      lines.push(`% X: ${result.geometry.labelPlain}`);
      lines.push(exportHodgeTikzcd(result, state.hodgeExpanded));
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: Hodge numbers');
      lines.push(`# X: ${result.geometry.labelPlain}`);
      lines.push(...exportHodgeLines(result, 'plain'));
      if (state.hodgeExpanded) lines.push(...exportExpandedHodgeLines(result, 'plain'));
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: Hodge numbers');
    lines.push(`X: ${result.geometry.labelPlain}`);
    lines.push(...exportHodgeLines(result, 'plain'));
    if (state.hodgeExpanded) lines.push(...exportExpandedHodgeLines(result, 'plain'));
    return lines.join('\n');
  }

  function exportHodgeTikzcd(result, expanded) {
    const d = result.geometry.dim;
    const entries = result.hodge.entries;
    const layout = hodgeExportLayout(d, expanded);
    const rows = Array.from({ length: layout.totalRows }, () => (
      Array.from({ length: layout.totalCols }, () => '')
    ));
    const arrows = [];
    const arrowKeys = new Set();
    const setCell = (row, col, value) => {
      rows[row - 1][col - 1] = value;
    };
    const addArrow = (from, to) => {
      const key = `${from.row}-${from.col}:${to.row}-${to.col}`;
      if (arrowKeys.has(key)) return;
      arrowKeys.add(key);
      arrows.push(`  \\arrow[dotted, no head, shorten <=3pt, shorten >=3pt, from=${from.row}-${from.col}, to=${to.row}-${to.col}]`);
    };

    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const pos = layout.hodgeGridPosition(p, q);
        setCell(pos.row, pos.col, entries[p][q].latex);
      }
    }

    if (expanded) {
      hodgeChiDisplays(result).forEach((chi, p) => {
        setCell(1, layout.chiGridColumn(p), chi);
        addArrow(layout.hodgeGridPosition(p, d), { row: 1, col: layout.chiGridColumn(p) });
      });
      const euler = hodgeEulerDisplay(result);
      setCell(1, layout.bettiCol, euler);
      hodgeBettiDisplays(result).forEach((betti, k) => {
        const row = 2 * d - k + 1 + layout.rowOffset;
        setCell(row, layout.bettiCol, betti);
      });
      for (let p = 0; p <= d; p++) addArrow(layout.hodgeGridPosition(p, 0), { row: 2 * d - p + 1 + layout.rowOffset, col: layout.bettiCol });
      for (let q = 0; q <= d; q++) addArrow(layout.hodgeGridPosition(d, q), { row: d - q + 1 + layout.rowOffset, col: layout.bettiCol });
    }

    const matrix = rows.map((row, index) => {
      const terminator = index === rows.length - 1 ? '' : ' \\\\';
      return `  ${row.map((cell) => (cell ? `{${cell}}` : '{}')).join(' & ')}${terminator}`;
    }).join('\n');
    const arrowBlock = arrows.length ? `\n${arrows.join('\n')}` : '';
    return [
      '\\[',
      '\\begin{tikzcd}[row sep=1.15em, column sep=1.15em, cells={nodes={inner sep=1pt}}]',
      matrix,
      arrowBlock,
      '\\end{tikzcd}',
      '\\]'
    ].filter(Boolean).join('\n');
  }

  function hodgeExportLayout(d, expanded) {
    const chiOffset = expanded && d > 0 ? -d - 1 : 0;
    const leftPaddingCols = expanded && d > 0 ? Math.max(2 * d, -chiOffset) : 0;
    const hodgeOffset = expanded ? leftPaddingCols : 0;
    const hodgeEndCol = hodgeOffset + 2 * d + 1;
    const chiEndCol = expanded ? hodgeOffset + chiOffset + 2 * d + 1 : hodgeEndCol;
    const coreCols = Math.max(hodgeEndCol, chiEndCol);
    const rowOffset = expanded ? 1 : 0;
    const bettiCol = coreCols + 2;
    return {
      rowOffset,
      bettiCol,
      totalCols: expanded ? bettiCol : coreCols,
      totalRows: 2 * d + 1 + rowOffset,
      hodgeGridPosition: (p, q) => ({
        row: 2 * d - (p + q) + 1 + rowOffset,
        col: hodgeOffset + d + p - q + 1
      }),
      chiGridColumn: (p) => hodgeOffset + chiOffset + 2 * p + 1
    };
  }

  function exportHodgeLines(result, format) {
    const d = result.geometry.dim;
    const lines = [format === 'latex' ? '% h^{p,q}, rows indexed by p' : 'h^p,q, rows indexed by p'];
    for (let p = 0; p <= d; p++) {
      const row = [];
      for (let q = 0; q <= d; q++) row.push(result.hodge.entries[p][q][format === 'latex' ? 'latex' : 'plain']);
      lines.push(format === 'latex' ? `% p=${p}: ${row.join(', ')}` : `p=${p}: ${row.join(', ')}`);
    }
    return lines;
  }

  function exportExpandedHodgeLines(result, format) {
    const lines = ['', format === 'latex' ? '% expanded invariants' : 'expanded invariants'];
    hodgeChiDisplays(result).forEach((chi, p) => {
      lines.push(format === 'latex' ? `% chi_${p}: ${chi}` : `chi_${p}: ${latexToPlain(chi)}`);
    });
    const euler = hodgeEulerDisplay(result);
    lines.push(format === 'latex' ? `% e: ${euler}` : `e: ${latexToPlain(euler)}`);
    hodgeBettiDisplays(result).forEach((betti, k) => {
      lines.push(format === 'latex' ? `% b_{${k}}: ${betti}` : `b_${k}: ${latexToPlain(betti)}`);
    });
    return lines;
  }

  function copyExport() {
    if (!refs.exportOut.value) refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { refs.status.textContent = 'export copied'; })
        .catch(fallbackCopyExport);
    } else {
      fallbackCopyExport();
    }
  }

  function fallbackCopyExport() {
    refs.exportOut.focus();
    refs.exportOut.select();
    try {
      document.execCommand('copy');
      refs.status.textContent = 'export copied';
    } catch (_) {
      refs.status.textContent = 'copy unavailable';
    }
  }

  function bindCards() {
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < state.suppressCardToggleUntil) return;
        if (event.target.closest('button,input,select,textarea,a,.drag-handle')) return;
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    const side = document.querySelector('.side');
    if (!side) return;
    let dragCard = null;
    let placeholder = null;
    let pointerId = null;
    let startY = 0;
    let ghost = null;
    let ghostOffsetY = 0;
    let dragging = false;
    const pointerOptions = { passive: false };

    side.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.card');
      if (!card || card.parentElement !== side) return;
      event.preventDefault();
      event.stopPropagation();
      dragCard = card;
      pointerId = event.pointerId;
      startY = event.clientY;
      dragging = false;
      const rect = card.getBoundingClientRect();
      ghostOffsetY = startY - rect.top;
      try { handle.setPointerCapture(pointerId); } catch (_) {}
      document.addEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.addEventListener('pointerup', finishCardDrag, pointerOptions);
      document.addEventListener('pointercancel', finishCardDrag, pointerOptions);
    }, pointerOptions);

    function handleCardDragMove(event) {
      if (!dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      if (!dragging && Math.abs(event.clientY - startY) < 6) return;
      if (!dragging) {
        const rect = dragCard.getBoundingClientRect();
        dragging = true;
        state.suppressCardToggleUntil = Date.now() + 500;
        document.body.classList.add('card-dragging');
        dragCard.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.style.cssText = `height:${rect.height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;`;
        dragCard.parentElement.insertBefore(placeholder, dragCard);
        ghost = dragCard.cloneNode(true);
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          top: `${event.clientY - ghostOffsetY}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: '0.88',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: '4px'
        });
        document.body.appendChild(ghost);
        dragCard.style.display = 'none';
      }
      if (ghost) ghost.style.top = `${event.clientY - ghostOffsetY}px`;
      const after = getCardAfterPointer(side, event.clientY, dragCard, placeholder);
      if (after) side.insertBefore(placeholder, after);
      else side.appendChild(placeholder);
    }

    function finishCardDrag(event) {
      if (!dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      document.removeEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.removeEventListener('pointerup', finishCardDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishCardDrag, pointerOptions);
      if (dragging && placeholder) side.insertBefore(dragCard, placeholder);
      if (placeholder) placeholder.remove();
      if (ghost) ghost.remove();
      dragCard.style.display = '';
      dragCard.classList.remove('dragging');
      document.body.classList.remove('card-dragging');
      dragCard = null;
      placeholder = null;
      ghost = null;
      pointerId = null;
      dragging = false;
    }
  }

  function getCardAfterPointer(container, y, dragCard, placeholder) {
    const cards = Array.from(container.children).filter((child) => child.classList.contains('card') && child !== dragCard && child !== placeholder);
    let candidate = null;
    let candidateOffset = Number.NEGATIVE_INFINITY;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const offset = y - rect.top - rect.height / 2;
      if (offset < 0 && offset > candidateOffset) {
        candidateOffset = offset;
        candidate = card;
      }
    }
    return candidate;
  }

  function typeset(element) {
    if (!window.MathJax?.typesetPromise) return;
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([element]);
    polishDisplayLatexScripts(element);
    state.mathJaxQueue = state.mathJaxQueue
      .then(() => window.MathJax.typesetPromise([element]))
      .catch(() => {});
  }

  function polishDisplayLatexScripts(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!String(node.nodeValue || '').includes('}_{')) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('mjx-container, script, style, textarea, input, select, option')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const polished = polishLatexScriptsForDisplay(node.nodeValue);
      if (polished !== node.nodeValue) node.nodeValue = polished;
    });
  }

  function polishLatexScriptsForDisplay(text) {
    const source = String(text || '');
    let out = '';
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] !== '_' || source[index + 1] !== '{') {
        out += source[index];
        continue;
      }
      const subscript = readLatexBraceGroup(source, index + 1);
      if (!subscript || source[subscript.end + 1] !== '_' || source[subscript.end + 2] !== '{') {
        out += source[index];
        continue;
      }
      const decoration = readLatexBraceGroup(source, subscript.end + 2);
      if (!decoration || !/^[!*]$/.test(decoration.content)) {
        out += source[index];
        continue;
      }
      out += `_{${subscript.content},${decoration.content}}`;
      index = decoration.end;
    }
    return out;
  }

  function readLatexBraceGroup(source, openIndex) {
    if (source[openIndex] !== '{') return null;
    let depth = 0;
    for (let index = openIndex; index < source.length; index += 1) {
      const ch = source[index];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return {
            content: source.slice(openIndex + 1, index),
            end: index
          };
        }
      }
      if (depth < 0) return null;
    }
    return null;
  }

  function parseDegrees(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const parts = raw.replace(/[;|]/g, ',').split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 1 && parts[0] === '0') return [];
    if (parts.length > MAX_CI_EQUATIONS) throw new Error(`Use at most ${MAX_CI_EQUATIONS} equations.`);
    const degrees = parts.map((part) => Number(part));
    if (degrees.some((degree) => !Number.isInteger(degree) || degree <= 0 || degree > 99)) {
      throw new Error('Complete-intersection degrees must be positive integers, or blank for projective space.');
    }
    return degrees;
  }

  function normalizedInt(value, min, max, fallback) {
    const number = Math.floor(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeSelfSumMultiplicity(value) {
    return normalizedInt(value, 1, MAX_SELF_DIRECT_SUM_MULTIPLICITY, 2);
  }

  function sanitizeRankInput(value) {
    const raw = String(value || '').trim();
    if (/^-?\d+$/.test(raw)) return raw;
    const simplified = simplifyScalarExpressionPlain(raw);
    if (simplified && /^[A-Za-z0-9_+\-\s]+$/.test(simplified)) return simplified.replace(/\s+/g, '');
    if (/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(raw)) return raw;
    return 'r';
  }

  function numericRankFromPlain(value) {
    const raw = String(value || '').trim();
    if (/^\d+$/.test(raw)) return Math.min(MAX_DIMENSION, Number(raw));
    const scalarValue = scalarExpressionIntegerValue(raw);
    return scalarValue != null && scalarValue >= 0 ? Math.min(MAX_DIMENSION, scalarValue) : null;
  }

  function explicitRootRankFromPlain(value) {
    const raw = String(value || '').trim();
    const rank = /^\d+$/.test(raw) ? Number(raw) : scalarExpressionIntegerValue(raw);
    if (!Number.isInteger(rank) || rank < 0 || rank > MAX_EXPLICIT_ROOT_FACTORS) return null;
    return rank;
  }

  function rootExpansionRankFromPlain(value, d = MAX_DIMENSION) {
    const raw = String(value || '').trim();
    const rank = /^\d+$/.test(raw) ? Number(raw) : scalarExpressionIntegerValue(raw);
    if (!Number.isInteger(rank) || rank < 0) return null;
    const monomialBound = binomial(rank + d, d);
    if (!Number.isFinite(monomialBound) || monomialBound > MAX_ROOT_EXPANSION_MONOMIALS) return null;
    return rank;
  }

  function binomial(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let out = 1;
    for (let i = 1; i <= k; i++) {
      out *= (n - k + i) / i;
      if (out > MAX_ROOT_EXPANSION_MONOMIALS) return out;
    }
    return out;
  }

  function binomialBigInt(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0n;
    k = Math.min(k, n - k);
    let out = 1n;
    for (let i = 1; i <= k; i += 1) {
      out = (out * BigInt(n - k + i)) / BigInt(i);
    }
    return out;
  }

  function bitCount(value) {
    if (typeof value === 'bigint') {
      let count = 0;
      while (value) {
        value &= value - 1n;
        count += 1;
      }
      return count;
    }
    let count = 0;
    while (value) {
      value &= value - 1;
      count += 1;
    }
    return count;
  }

  function currentSchurPartition() {
    return parseSchurPartition(refs.sheafSchurPartition?.value);
  }

  function parseSchurPartition(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const parts = raw.replace(/[;|(){}\[\]]/g, ',').split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return null;
    const values = parts.map((part) => Number(part));
    return normalizeSchurPartition(values);
  }

  function normalizeSchurPartition(value) {
    if (!Array.isArray(value)) {
      const raw = String(value || '').trim();
      if (!raw) return null;
      value = raw.replace(/[;|(){}\[\]]/g, ',').split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    }
    const values = value.map((part) => Number(part));
    if (!values?.length) return null;
    if (values.some((part) => !Number.isInteger(part) || part <= 0)) return null;
    const partition = values.filter((part) => part > 0);
    for (let i = 1; i < partition.length; i += 1) {
      if (partition[i] > partition[i - 1]) return null;
    }
    const size = partition.reduce((sum, part) => sum + part, 0);
    if (size <= 0 || size > MAX_SCHUR_PARTITION_SIZE) return null;
    return partition;
  }

  function formatSchurPartitionInput(partition) {
    const normalized = normalizeSchurPartition(partition) || [2, 1];
    return normalized.join(', ');
  }

  function schurPartitionLatex(partition) {
    const normalized = normalizeSchurPartition(partition) || [2, 1];
    return `(${normalized.join(',')})`;
  }

  function schurRepresentationRank(partition, rank) {
    const normalized = normalizeSchurPartition(partition);
    if (!normalized || !Number.isInteger(rank) || rank < normalized.length) return 0n;
    let value = Fraction.one();
    for (let row = 0; row < normalized.length; row += 1) {
      for (let col = 1; col <= normalized[row]; col += 1) {
        value = value.mul(fraction(BigInt(rank + col - row - 1), BigInt(schurHookLength(normalized, row, col))));
      }
    }
    return value.den === 1n ? value.num : 0n;
  }

  function schurPowerSumPolynomial(partition) {
    const normalized = normalizeSchurPartition(partition);
    if (!normalized) return symmetricPowerZero();
    const key = normalized.join(',');
    if (schurPowerPolynomialCache.has(key)) return schurPowerPolynomialCache.get(key);
    const length = normalized.length;
    const matrix = [];
    for (let i = 0; i < length; i += 1) {
      const row = [];
      for (let j = 0; j < length; j += 1) {
        row.push(completeSymmetricPowerPolynomial(normalized[i] - i + j));
      }
      matrix.push(row);
    }
    const out = determinantSymmetricPowerPolynomial(matrix);
    schurPowerPolynomialCache.set(key, out);
    return out;
  }

  function completeSymmetricPowerPolynomial(n) {
    if (n < 0) return symmetricPowerZero();
    if (n === 0) return symmetricPowerOne();
    if (completeSymmetricCache.has(n)) return completeSymmetricCache.get(n);
    let out = symmetricPowerZero();
    for (const counts of integerPartitionCounts(n)) {
      let denom = 1n;
      const powers = {};
      Object.entries(counts).forEach(([degreeText, count]) => {
        const degree = Number(degreeText);
        powers[degree] = count;
        denom *= bigintPow(BigInt(degree), count) * factorialBigInt(count);
      });
      out = addSymmetricPowerPolynomials(out, new Map([[powerSumKey(powers), fraction(1, denom)]]));
    }
    completeSymmetricCache.set(n, out);
    return out;
  }

  function determinantSymmetricPowerPolynomial(matrix) {
    const n = matrix.length;
    if (!n) return symmetricPowerOne();
    const dp = new Map([[0n, symmetricPowerOne()]]);
    const fullMask = (1n << BigInt(n)) - 1n;
    for (let mask = 0n; mask <= fullMask; mask += 1n) {
      const current = dp.get(mask);
      if (!current) continue;
      const row = bitCount(mask);
      if (row >= n) continue;
      for (let col = 0; col < n; col += 1) {
        const bit = 1n << BigInt(col);
        if (mask & bit) continue;
        const greaterUsed = bitCount(mask & ~((1n << BigInt(col + 1)) - 1n));
        const signedEntry = greaterUsed % 2 === 0
          ? matrix[row][col]
          : scaleSymmetricPowerPolynomial(matrix[row][col], fraction(-1));
        const nextMask = mask | bit;
        const next = multiplySymmetricPowerPolynomials(current, signedEntry);
        dp.set(nextMask, addSymmetricPowerPolynomials(dp.get(nextMask) || symmetricPowerZero(), next));
      }
    }
    return dp.get(fullMask) || symmetricPowerZero();
  }

  function applyPowerSumDerivationPartition(poly, counts) {
    let out = poly;
    Object.entries(counts).forEach(([degreeText, count]) => {
      const degree = Number(degreeText);
      for (let i = 0; i < count; i += 1) out = applyPowerSumDerivation(out, degree);
    });
    return out;
  }

  function applyPowerSumDerivation(poly, degree) {
    const out = symmetricPowerZero();
    for (const [key, coeff] of poly) {
      const powers = parsePowerSumKey(key);
      Object.entries(powers).forEach(([partText, exponent]) => {
        const part = Number(partText);
        if (!exponent) return;
        const nextPowers = { ...powers };
        if (exponent === 1) delete nextPowers[partText];
        else nextPowers[partText] = exponent - 1;
        const nextKey = powerSumKey(nextPowers);
        const delta = coeff.mul(fraction(exponent)).mul(fraction(bigintPow(BigInt(part), degree)));
        out.set(nextKey, (out.get(nextKey) || Fraction.zero()).add(delta));
      });
    }
    return cleanSymmetricPowerPolynomial(out);
  }

  function evaluateSymmetricPowerPolynomial(poly, rank) {
    let total = Fraction.zero();
    for (const [key, coeff] of poly) {
      const powers = parsePowerSumKey(key);
      const factor = Object.values(powers).reduce((sum, exponent) => sum + exponent, 0);
      total = total.add(coeff.mul(fraction(bigintPow(BigInt(rank), factor))));
    }
    return total;
  }

  function evaluateSymmetricPowerPolynomialAtRank(poly, rankContext, d = MAX_DIMENSION) {
    if (rankContext.numeric != null) return evaluateSymmetricPowerPolynomial(poly, rankContext.numeric);
    let total = Poly.zero();
    for (const [key, coeff] of poly) {
      const powers = parsePowerSumKey(key);
      const factor = Object.values(powers).reduce((sum, exponent) => sum + exponent, 0);
      const term = factor ? polyPower(rankContext.poly, factor, d).scale(coeff) : Poly.constant(coeff);
      total = total.add(term);
    }
    return total.truncate(d);
  }

  function schurRankContext(partition, rankLatex, rankPlain, parentName) {
    const numeric = explicitRootRankFromPlain(rankPlain);
    if (numeric != null) return { numeric, poly: Poly.constant(BigInt(numeric)) };
    const id = `rankSchurParent${hashString(`${parentName}:${formatSchurPartitionInput(partition)}:${rankPlain || rankLatex || 'r'}`)}`;
    defineVariable(id, 0, rankLatex || symbolToLatex(rankPlain || 'r'));
    return { numeric: null, poly: Poly.variable(id) };
  }

  function coefficientIsZero(value) {
    return value instanceof Fraction ? value.isZero() : Poly.from(value).isZero();
  }

  function multiplyByCoefficient(poly, coeff, d) {
    return coeff instanceof Fraction ? poly.scale(coeff) : poly.mul(coeff, d);
  }

  function symmetricPowerZero() {
    return new Map();
  }

  function symmetricPowerOne() {
    return new Map([['', Fraction.one()]]);
  }

  function addSymmetricPowerPolynomials(left, right) {
    const out = new Map(left);
    for (const [key, coeff] of right) {
      out.set(key, (out.get(key) || Fraction.zero()).add(coeff));
    }
    return cleanSymmetricPowerPolynomial(out);
  }

  function scaleSymmetricPowerPolynomial(poly, scalar) {
    scalar = Fraction.from(scalar);
    if (scalar.isZero()) return symmetricPowerZero();
    const out = new Map();
    for (const [key, coeff] of poly) out.set(key, coeff.mul(scalar));
    return cleanSymmetricPowerPolynomial(out);
  }

  function multiplySymmetricPowerPolynomials(left, right) {
    if (!left.size || !right.size) return symmetricPowerZero();
    const out = new Map();
    for (const [leftKey, leftCoeff] of left) {
      const leftPowers = parsePowerSumKey(leftKey);
      for (const [rightKey, rightCoeff] of right) {
        const powers = { ...leftPowers };
        Object.entries(parsePowerSumKey(rightKey)).forEach(([degree, exponent]) => {
          powers[degree] = (powers[degree] || 0) + exponent;
        });
        const key = powerSumKey(powers);
        out.set(key, (out.get(key) || Fraction.zero()).add(leftCoeff.mul(rightCoeff)));
      }
    }
    return cleanSymmetricPowerPolynomial(out);
  }

  function cleanSymmetricPowerPolynomial(poly) {
    for (const [key, coeff] of Array.from(poly.entries())) {
      if (coeff.isZero()) poly.delete(key);
    }
    return poly;
  }

  function powerSumKey(powers) {
    return Object.entries(powers || {})
      .map(([degree, exponent]) => [Number(degree), Number(exponent)])
      .filter(([degree, exponent]) => Number.isInteger(degree) && degree > 0 && exponent > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([degree, exponent]) => `${degree}:${exponent}`)
      .join('|');
  }

  function parsePowerSumKey(key) {
    if (!key) return {};
    const out = {};
    key.split('|').forEach((part) => {
      const [degree, exponent] = part.split(':');
      out[degree] = Number(exponent);
    });
    return out;
  }

  function integerPartitionCounts(n) {
    if (integerPartitionCountCache.has(n)) return integerPartitionCountCache.get(n);
    const out = [];
    const counts = {};
    const visit = (remaining, maxPart) => {
      if (remaining === 0) {
        out.push({ ...counts });
        return;
      }
      for (let part = Math.min(maxPart, remaining); part >= 1; part -= 1) {
        counts[part] = (counts[part] || 0) + 1;
        visit(remaining - part, part);
        counts[part] -= 1;
        if (!counts[part]) delete counts[part];
      }
    };
    visit(n, n);
    integerPartitionCountCache.set(n, out);
    return out;
  }

  function schurHookLength(partition, row, col) {
    let below = 0;
    for (let i = row + 1; i < partition.length; i += 1) {
      if (partition[i] >= col) below += 1;
    }
    return partition[row] - col + below + 1;
  }

  function sanitizeMathLabel(value, fallback) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    const safeFallback = String(fallback || 'X').trim() || 'X';
    if (!raw) return safeFallback;
    if (raw.length > 120) return safeFallback;
    if (!/^[A-Za-z0-9_{}\\^()\[\]+,\-'\s*!*\/]+$/.test(raw)) return safeFallback;
    return raw;
  }

  function sanitizeHomologySymbol(value, fallback) {
    return sanitizeMathLabel(value, fallback);
  }

  function parseRuleCoefficient(value) {
    const raw = String(value || '1').trim().replace(/\s+/g, '');
    if (!raw) return Fraction.one();
    const match = raw.match(/^([+-]?\d+)(?:\/(\d+))?$/);
    if (!match) throw new Error('Rule coefficient must be an integer or fraction.');
    const den = BigInt(match[2] || '1');
    if (den === 0n) throw new Error('Rule coefficient has zero denominator.');
    return new Fraction(BigInt(match[1]), den);
  }

  function sheafLabelLatex(sheaf) {
    return sheaf.labelLatex || '\\mathcal{E}';
  }

  function sheafLabelPlain(sheaf) {
    return sheaf.labelPlain || latexToPlain(sheafLabelLatex(sheaf));
  }

  function symbolToLatex(value) {
    const raw = sanitizeGlobalInvariantName(value, 'r');
    if (/^-?\d+$/.test(raw)) return raw;
    const greek = { rho: '\\rho', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma' };
    if (greek[raw]) return greek[raw];
    const match = raw.match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
    if (match) return `${match[1]}_{${match[2]}}`;
    return raw;
  }

  function latexToPlain(latex) {
    return String(latex)
      .replace(/\\operatorname\{Gr\}/g, 'Gr')
      .replace(/\\operatorname\{ch\}_\{(\d+)\}\(([^)]+)\)/g, 'ch_$1($2)')
      .replace(/\\mathcal\{([^}]+)\}/g, '$1')
      .replace(/\\mathbb\{([^}]+)\}/g, '$1')
      .replace(/\\times/g, ' x ')
      .replace(/\\oplus/g, ' + ')
      .replace(/\\otimes/g, ' tensor ')
      .replace(/\\circ/g, ' o ')
      .replace(/\\Omega/g, 'Omega')
      .replace(/\\omega/g, 'omega')
      .replace(/[{}\\]/g, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value ?? ''));
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function formatFractionLatex(value) {
    value = Fraction.from(value);
    if (value.isZero()) return '0';
    const body = value.abs().toLatexAbs();
    return value.sign() < 0 ? `-${body}` : body;
  }

  function formatFractionPlain(value) {
    value = Fraction.from(value);
    if (value.isZero()) return '0';
    const body = value.abs().toPlainAbs();
    return value.sign() < 0 ? `-${body}` : body;
  }

  function fraction(num, den = 1) {
    return new Fraction(num, den);
  }

  function toBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (value instanceof Fraction) {
      if (value.den !== 1n) throw new Error('Expected integer fraction.');
      return value.num;
    }
    return BigInt(Math.trunc(Number(value)));
  }

  function bigintAbs(value) {
    return value < 0n ? -value : value;
  }

  function bigintGcd(a, b) {
    while (b !== 0n) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1n;
  }

  function bigintPow(base, exponent) {
    let out = 1n;
    for (let i = 0; i < exponent; i++) out *= base;
    return out;
  }

  const factorialCache = [1n];
  function factorialBigInt(n) {
    for (let i = factorialCache.length; i <= n; i++) factorialCache[i] = factorialCache[i - 1] * BigInt(i);
    return factorialCache[n];
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
})();
