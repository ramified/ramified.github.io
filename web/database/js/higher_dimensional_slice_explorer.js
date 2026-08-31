(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finiteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  const positiveNumber = (value, fallback = 1) => {
    const number = finiteNumber(value, fallback);
    return number > 0 ? number : fallback;
  };
  const fmt = (value, digits = 3) => {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.abs(value) < 10 ** -digits ? 0 : value;
    return Number(rounded.toFixed(digits)).toString();
  };
  const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  const OBJECT_TYPES = [
    { key: "regular-polytope", label: "regular polytope", color: "#2f7d70", pointSize: 4, lineWidth: 2 },
    { key: "simplex", label: "simplex", color: "#5577aa", pointSize: 4, lineWidth: 2 },
    { key: "sphere", label: "sphere S^{n-1}", color: "#8a4f9f", pointSize: 3, lineWidth: 2 },
    { key: "cartesian-frame", label: "Cartesian frame", color: "#b05835", pointSize: 4, lineWidth: 3 },
    { key: "point", label: "point", color: "#c58a20", pointSize: 7, lineWidth: 2 },
    { key: "vector", label: "vector", color: "#1f8f91", pointSize: 5, lineWidth: 2 },
    { key: "matrix", label: "matrix", color: "#6e7f2f", pointSize: 4, lineWidth: 2 },
    { key: "dynkin-type", label: "Dynkin type", color: "#8a6242", pointSize: 4, lineWidth: 2 },
    { key: "root-set", label: "roots", color: "#a64f6f", pointSize: 5, lineWidth: 2 },
    { key: "lattice", label: "lattice", color: "#4f7a55", pointSize: 4, lineWidth: 2 },
    { key: "voronoi-diagram", label: "Voronoi diagram", color: "#b36b4a", pointSize: 4, lineWidth: 2 },
    { key: "formula-set", label: "formula set", color: "#4f7fbd", pointSize: 4, lineWidth: 2 },
    { key: "tropical-polynomial", label: "tropical polynomial", color: "#2f6fb0", pointSize: 4, lineWidth: 2 },
    { key: "weyl-chambers", label: "Weyl chambers", color: "#7b5cb8", pointSize: 4, lineWidth: 2 },
    { key: "toric-cone", label: "rational cone", color: "#2c6f78", pointSize: 5, lineWidth: 2 },
    { key: "toric-fan", label: "toric variety (fan)", color: "#7f5b3b", pointSize: 5, lineWidth: 2 },
  ];
  const TROPICAL_DISTRICT_COLORS = [
    "#d95f5f",
    "#2f8f7f",
    "#4f73c6",
    "#d2a33a",
    "#8a66b5",
    "#cf6f3d",
    "#3f8ab8",
    "#7aa54a",
    "#c95f93",
    "#6f7f3d",
  ];
  const WEYL_CHAMBER_COLORS = [
    "#7b5cb8",
    "#2f8f7f",
    "#d2a33a",
    "#4f73c6",
    "#cf6f3d",
    "#7aa54a",
    "#c95f93",
    "#3f8ab8",
    "#d95f5f",
    "#6f7f3d",
    "#8a66b5",
    "#b05835",
  ];
  const EXACT_SLICE_TYPES = new Set(["regular-polytope", "cube", "simplex", "sphere", "formula-set", "tropical-polynomial", "weyl-chambers", "voronoi-diagram", "toric-cone"]);
  const VECTOR_INPUT_MODES = new Set(["manual", "import", "targets"]);
  const MATRIX_INPUT_MODES = new Set(["manual", "import", "targets"]);
  const MATRIX_PRESET_KINDS = new Set(["manual", "simple-roots", "fundamental-weights"]);
  const LATTICE_BASIS_MODES = new Set(["matrix-input", "matrix-object", "dynkin", "lmfdb-field"]);
  const LATTICE_DYNKIN_KINDS = new Set(["root", "weight"]);
  const EMBEDDING_COORDINATE_MODES = new Set(["raw", "minkowski"]);
  const ROOT_SET_SIGN_MODES = new Set(["all", "positive"]);
  const VIEWPORT_BOUND_SHAPES = new Set(["box", "disk"]);
  const LATTICE_BOUND_SHAPES = new Set(["box", "ball"]);
  const TROPICAL_DISTRICT_LABEL_DENSITIES = new Set(["all", "active"]);
  const WEYL_LABEL_MODES = new Set(["permutation", "word", "length", "kl", "kl-v1"]);
  const WEYL_LABEL_DENSITIES = new Set(["all", "active"]);
  const LATTICE_ENUMERATION_CAP = 8000;
  const LATTICE_PROJECTION_ENUMERATION_CAP = 250000;
  const LATTICE_PROJECTION_POINT_CAP = 1800;
  const VORONOI_PROJECTION_HALFSPACE_CAP = 180;
  const VORONOI_PROJECTION_COMBINATION_CAP = 120000;
  const VORONOI_PROJECTION_VERTEX_CAP = 2400;
  const VORONOI_PROJECTION_EDGE_CAP = 8000;
  const VORONOI_LLL_ITERATION_CAP = 900;
  const VORONOI_COSET_ENUMERATION_CAP = 120000;
  const VORONOI_RELEVANT_VECTOR_CAP = 2048;
  const VIEWPORT_DISK_POLYGON_SEGMENTS = 96;
  const WEYL_KL_SUBWORD_CAP = 100000;
  const WEYL_KL_INTERVAL_CAP = 1500;
  const WEYL_KL_CACHE_LIMIT = 64;
  const WEYL_KL_PENDING_STATUS = "Computing KL polynomial, please wait...";
  const WEYL_KL_STATUS_ROW_CHAR_LIMIT = 52;
  const WEIGHT_INFO_DIMENSION_MODES = new Set(["none", "dots", "numbers"]);
  const WEIGHT_INFO_FREUDENTHAL_CAP = 20000;
  const WEIGHT_INFO_PROJECTION_POINT_CAP = 6000;
  const WEIGHT_INFO_PROJECTION_BOX_CAP = 250000;
  const WEIGHT_INFO_PROJECTION_BOX_WARNING = 60000;
  const WEIGHT_INFO_EPS = 1e-7;
  const RATIONAL_WHEEL_STEP = 0.1;
  const RATIONAL_WHEEL_MIN = -6;
  const RATIONAL_WHEEL_MAX = 6;
  const REGULAR_POLYTOPE_FAMILIES = [
    { key: "regular-simplex", label: "regular simplex" },
    { key: "hypercube", label: "hypercube" },
    { key: "cross-polytope", label: "cross-polytope" },
    { key: "dodecahedron", label: "dodecahedron", dimensions: [3] },
    { key: "icosahedron", label: "icosahedron", dimensions: [3] },
    { key: "24-cell", label: "24-cell", dimensions: [4] },
    { key: "120-cell", label: "120-cell", dimensions: [4] },
    { key: "600-cell", label: "600-cell", dimensions: [4] },
  ];
  const MOTION_DEFAULTS = {
    translationSpeed: 1,
    rotationSpeed: 60,
    translationStep: 0.1,
    rotationStep: 8,
  };
  const MOTION_LIMITS = {
    translationSpeed: [0.05, 4],
    rotationSpeed: [1, 180],
    translationStep: [0.01, 2],
    rotationStep: [0.5, 45],
  };
  const MOTION_RAMP_MS = 180;
  const DEFAULT_CANVAS_LABEL_SIZE_REM = 1.05;
  const TORIC_ANALYSIS_LIMITS = Object.freeze({ maxGenerators: 32, maxFaces: 4096, maxCandidates: 500000 });
  const TORIC_PRESETS = new Set(["zero", "positive-orthant", "singular-simplicial", "square-cone"]);
  const TORIC_FAN_PRESETS = new Set(["affine-space", "projective-space", "weighted-projective-space"]);
  const regularGeometryCache = new Map();
  const regularHalfspaceCache = new Map();
  const weylRootSystemCache = new Map();
  const latticeProjectionStatsCache = new Map();
  const voronoiProjectionCache = new Map();
  const voronoiRelevantVectorCache = new Map();
  const finiteRootSetCache = new Map();
  const finiteWeylKlCalculatorCache = new Map();
  const dynkinWeightCharacterCache = new Map();
  const matrixTargetDrafts = new Map();
  const lmfdbFieldSearchDrafts = new Map();
  const toricAnalysisCache = new Map();
  const toricAnalysisPending = new Map();
  const toricFanAnalysisCache = new Map();
  const toricSliceIssueByObject = new Map();
  let toricAnalysisWorker = null;
  let toricWorkerUnavailable = false;
  let toricAnalysisRequestCounter = 1;
  let toricGeneratorCounter = 1;
  let toricRenderedEditorKey = "";
  let finiteWeylKlScheduledFrame = 0;
  let finiteWeylKlScheduledKey = "";
  let finiteWeylKlImmediateKey = "";
  const runtimeStats = {
    drawMs: 0,
    exactSliceMs: 0,
    halfspaceMs: 0,
    halfspaceCount: 0,
    heavyFamily: "",
  };

  let objectCounter = 1;

  const state = {
    ambientDim: 4,
    sliceDim: 2,
    slideInputMode: "move",
    directInputMode: "manual",
    activeDirection: defaultDirection(4),
    motionMode: "continuous",
    translationSpeed: MOTION_DEFAULTS.translationSpeed,
    rotationSpeed: MOTION_DEFAULTS.rotationSpeed,
    translationStep: MOTION_DEFAULTS.translationStep,
    rotationStep: MOTION_DEFAULTS.rotationStep,
    rotationPair: defaultRotationPair(4),
    autoSchmidt: true,
    p: [0, 0, 0, 0],
    frame: identityFrame(4),
    viewport: {
      zoom: 1,
      showAxes: true,
      showGrid: true,
      showLabels: false,
      showBox: true,
      boundShape: "box",
      cameraDistance: 3,
      boxRadius: 4,
      labelSize: DEFAULT_CANVAS_LABEL_SIZE_REM,
      exactSphereGuide: false,
      tolerance: 0.0001,
    },
    sourceMode: "modify",
    addType: "cartesian-frame",
    addRegularFamily: "hypercube",
    addWeylDynkinType: "A",
    addWeylDynkinSourceId: "",
    addMatrixVariant: "manual",
    addLatticeVariant: "matrix-input",
    addVoronoiLatticeSourceId: "",
    addToricPreset: "zero",
    addToricFanPreset: "projective-space",
    objects: [],
    activeObjectId: null,
    selectedVertex: null,
    activeVectorTarget: null,
    pickCandidates: [],
    tropicalDistrictPickCandidates: [],
    activeTropicalDistrict: null,
    weylChamberPickCandidates: [],
    activeWeylChamber: null,
    weylKlTargetChamber: null,
    activeToricFace: null,
    toricTab: "build",
    toricFanTab: "build",
    toricConePickCandidates: [],
    weightInfoDimensionMode: "none",
    lastWarning: "Projection and exact/numeric 2D slice layers are active.",
    lastWarningMath: null,
  };

  const motionHold = {
    translationPositive: new Set(),
    translationNegative: new Set(),
    rotationPositive: new Set(),
    rotationNegative: new Set(),
    translationVelocity: 0,
    rotationVelocity: 0,
    lastTimestamp: 0,
    rafId: 0,
  };

  let mathTypesetQueued = false;
  let mathTypesetDirty = false;

  function identityFrame(n) {
    return Array.from({ length: n }, (_, col) =>
      Array.from({ length: n }, (_, row) => (row === col ? 1 : 0))
    );
  }

  function dot(a, b) {
    let total = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) total += a[i] * b[i];
    return total;
  }

  function norm(v) {
    return Math.sqrt(dot(v, v));
  }

  function add(a, b) {
    return a.map((value, index) => value + (b[index] || 0));
  }

  function subtract(a, b) {
    return a.map((value, index) => value - (b[index] || 0));
  }

  function scale(v, scalar) {
    return v.map((value) => value * scalar);
  }

  function normalize(v, fallbackIndex = 0) {
    const length = norm(v);
    if (length > 1e-12) return v.map((value) => value / length);
    return Array.from({ length: state.ambientDim }, (_, index) => (index === fallbackIndex ? 1 : 0));
  }

  function resizeVector(vector, n) {
    const next = vector.slice(0, n);
    while (next.length < n) next.push(0);
    return next;
  }

  function parseRationalNumber(rawValue) {
    const text = String(rawValue ?? "").trim();
    const numberPattern = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
    if (!text) return { ok: false, error: "Enter a number or fraction." };
    const parts = text.split("/");
    if (parts.length > 2) return { ok: false, error: "Use at most one fraction slash." };
    const numberRegex = new RegExp(`^${numberPattern}$`);
    if (!numberRegex.test(parts[0].trim())) return { ok: false, error: "Invalid numerator." };
    const numerator = Number(parts[0].trim());
    if (parts.length === 1) return Number.isFinite(numerator)
      ? { ok: true, value: numerator }
      : { ok: false, error: "Invalid number." };
    if (!numberRegex.test(parts[1].trim())) return { ok: false, error: "Invalid denominator." };
    const denominator = Number(parts[1].trim());
    if (!Number.isFinite(denominator)) return { ok: false, error: "Invalid denominator." };
    if (denominator === 0) return { ok: false, error: "Denominator cannot be zero." };
    return { ok: true, value: numerator / denominator };
  }

  function normalizeSlideInputMode(mode) {
    return mode === "direct" || mode === "direct input" ? "direct" : "move";
  }

  function normalizeDirectInputMode(mode) {
    return mode === "import" ? "import" : "manual";
  }

  function normalizeVectorInputMode(mode) {
    if (mode === "manual input") return "manual";
    return VECTOR_INPUT_MODES.has(mode) ? mode : "manual";
  }

  function normalizeMatrixInputMode(mode) {
    if (mode === "manual input") return "manual";
    return MATRIX_INPUT_MODES.has(mode) ? mode : "manual";
  }

  function normalizeToricImportOrientation(value) {
    return value === "legacy-rows" ? "legacy-rows" : "columns";
  }

  function normalizeMatrixPresetKind(kind) {
    if (kind === "simple roots") return "simple-roots";
    if (kind === "fundamental weights") return "fundamental-weights";
    return MATRIX_PRESET_KINDS.has(kind) ? kind : "manual";
  }

  function normalizeLatticeBasisMode(mode) {
    if (mode === "matrix input") return "matrix-input";
    if (mode === "matrix object") return "matrix-object";
    if (mode === "LMFDB field" || mode === "lmfdb") return "lmfdb-field";
    return LATTICE_BASIS_MODES.has(mode) ? mode : "matrix-input";
  }

  function normalizeDynkinLatticeKind(kind) {
    if (kind === "root lattice") return "root";
    if (kind === "weight lattice") return "weight";
    return LATTICE_DYNKIN_KINDS.has(kind) ? kind : "root";
  }

  function normalizeEmbeddingCoordinateMode(mode) {
    if (mode === "scaled" || mode === "sqrt2" || mode === "minkowski scaled") return "minkowski";
    return EMBEDDING_COORDINATE_MODES.has(mode) ? mode : "raw";
  }

  function normalizeRootSetSignMode(mode) {
    if (mode === "positive roots") return "positive";
    if (mode === "all roots") return "all";
    return ROOT_SET_SIGN_MODES.has(mode) ? mode : "all";
  }

  function normalizeViewportBoundShape(shape) {
    if (shape === "D^2" || shape === "S^1" || shape === "sphere" || shape === "ball" || shape === "disk") return "disk";
    return VIEWPORT_BOUND_SHAPES.has(shape) ? shape : "box";
  }

  function viewportBoundLabel(shape = state.viewport.boundShape) {
    return normalizeViewportBoundShape(shape) === "disk" ? "D^2" : "box";
  }

  function viewportBoundDescription(shape = state.viewport.boundShape, radius = state.viewport.boxRadius) {
    const normalized = normalizeViewportBoundShape(shape);
    return normalized === "disk"
      ? `D^2 radius ${fmt(radius, 2)}`
      : `box [-${fmt(radius, 2)}, ${fmt(radius, 2)}]^2`;
  }

  function normalizeLatticeBoundShape(shape) {
    if (shape === "D^n" || shape === "S^n" || shape === "sphere" || shape === "ball") return "ball";
    return LATTICE_BOUND_SHAPES.has(shape) ? shape : "ball";
  }

  function latticeBoundLabel(shape = "ball") {
    return normalizeLatticeBoundShape(shape) === "ball" ? "D^n" : "box";
  }

  function normalizeLatticeBoundRadius(value) {
    return clamp(positiveNumber(value, 2), 0.1, 12);
  }

  function latticeBoundDescription(data = {}) {
    const shape = normalizeLatticeBoundShape(data.latticeBoundShape);
    const radius = normalizeLatticeBoundRadius(data.latticeBoundRadius);
    return shape === "ball"
      ? `D^${state.ambientDim} radius ${fmt(radius, 2)}`
      : `box [-${fmt(radius, 2)}, ${fmt(radius, 2)}]^${state.ambientDim}`;
  }

  function normalizeCanvasLabelSize(value) {
    return clamp(finiteNumber(value, DEFAULT_CANVAS_LABEL_SIZE_REM), 0.75, 2);
  }

  function normalizeTropicalDistrictLabelDensity(density) {
    if (density === "label all") return "all";
    if (density === "active labels") return "active";
    return TROPICAL_DISTRICT_LABEL_DENSITIES.has(density) ? density : "all";
  }

  function normalizeWeylLabelMode(mode) {
    if (mode === "KL" || mode === "KL polynomials") return "kl";
    if (mode === "KL(v=1)" || mode === "KL polynomial at v=1") return "kl-v1";
    return WEYL_LABEL_MODES.has(mode) ? mode : "word";
  }

  function normalizeWeylElementDisplayMode(mode, fallback = "word") {
    if (mode === "permutation") return "permutation";
    if (mode === "word") return "word";
    return fallback === "permutation" ? "permutation" : "word";
  }

  function normalizeWeylLabelDensity(density) {
    if (density === "label all") return "all";
    if (density === "active labels") return "active";
    return WEYL_LABEL_DENSITIES.has(density) ? density : "active";
  }

  function normalizeFormulaInputMode(mode) {
    return mode === "import-q" || mode === "import Q" ? "import-q" : "formula";
  }

  function zeroFormulaPolynomial(n = state.ambientDim) {
    return {
      constant: 0,
      linear: Array(n).fill(0),
      quadratic: Array.from({ length: n }, () => Array(n).fill(0)),
    };
  }

  function constantFormulaPolynomial(value, n = state.ambientDim) {
    const polynomial = zeroFormulaPolynomial(n);
    polynomial.constant = value;
    return polynomial;
  }

  function variableFormulaPolynomial(index, n = state.ambientDim) {
    const polynomial = zeroFormulaPolynomial(n);
    polynomial.linear[index] = 1;
    return polynomial;
  }

  function cleanFormulaPolynomial(polynomial, n = state.ambientDim) {
    const cleaned = {
      constant: finiteNumber(polynomial?.constant, 0),
      linear: resizeVector(Array.isArray(polynomial?.linear) ? polynomial.linear : [], n),
      quadratic: Array.from({ length: n }, (_, row) =>
        resizeVector(Array.isArray(polynomial?.quadratic?.[row]) ? polynomial.quadratic[row] : [], n)
      ),
    };
    if (Math.abs(cleaned.constant) < 1e-12) cleaned.constant = 0;
    cleaned.linear = cleaned.linear.map((value) => (Math.abs(finiteNumber(value, 0)) < 1e-12 ? 0 : finiteNumber(value, 0)));
    for (let row = 0; row < n; row += 1) {
      for (let col = row; col < n; col += 1) {
        const value = row === col
          ? finiteNumber(cleaned.quadratic[row][col], 0)
          : (finiteNumber(cleaned.quadratic[row][col], 0) + finiteNumber(cleaned.quadratic[col][row], 0)) / 2;
        const compact = Math.abs(value) < 1e-12 ? 0 : value;
        cleaned.quadratic[row][col] = compact;
        cleaned.quadratic[col][row] = compact;
      }
    }
    return cleaned;
  }

  function formulaPolynomialDegree(polynomial) {
    const tolerance = 1e-10;
    if (polynomial.quadratic.some((row) => row.some((value) => Math.abs(value) > tolerance))) return 2;
    if (polynomial.linear.some((value) => Math.abs(value) > tolerance)) return 1;
    if (Math.abs(polynomial.constant) > tolerance) return 0;
    return 0;
  }

  function formulaPolynomialHasVariables(polynomial) {
    return formulaPolynomialDegree({ ...polynomial, constant: 0 }) > 0;
  }

  function addFormulaPolynomials(left, right, sign = 1) {
    const n = left.linear.length;
    const result = zeroFormulaPolynomial(n);
    result.constant = left.constant + sign * right.constant;
    for (let row = 0; row < n; row += 1) {
      result.linear[row] = left.linear[row] + sign * right.linear[row];
      for (let col = 0; col < n; col += 1) {
        result.quadratic[row][col] = left.quadratic[row][col] + sign * right.quadratic[row][col];
      }
    }
    return cleanFormulaPolynomial(result, n);
  }

  function scaleFormulaPolynomial(polynomial, factor) {
    const n = polynomial.linear.length;
    const result = zeroFormulaPolynomial(n);
    result.constant = polynomial.constant * factor;
    for (let row = 0; row < n; row += 1) {
      result.linear[row] = polynomial.linear[row] * factor;
      for (let col = 0; col < n; col += 1) result.quadratic[row][col] = polynomial.quadratic[row][col] * factor;
    }
    return cleanFormulaPolynomial(result, n);
  }

  function multiplyFormulaPolynomials(left, right) {
    const n = left.linear.length;
    const leftDegree = formulaPolynomialDegree(left);
    const rightDegree = formulaPolynomialDegree(right);
    if (leftDegree + rightDegree > 2) {
      throw new Error("Unsupported nonlinear formula: exact rendering is limited to degree 2.");
    }
    const result = zeroFormulaPolynomial(n);
    result.constant = left.constant * right.constant;
    for (let row = 0; row < n; row += 1) {
      result.linear[row] = left.constant * right.linear[row] + right.constant * left.linear[row];
      for (let col = 0; col < n; col += 1) {
        result.quadratic[row][col] =
          left.constant * right.quadratic[row][col] +
          right.constant * left.quadratic[row][col] +
          left.linear[row] * right.linear[col];
      }
    }
    return cleanFormulaPolynomial(result, n);
  }

  function formulaConstantValue(polynomial) {
    const cleaned = cleanFormulaPolynomial(polynomial, polynomial.linear.length);
    return formulaPolynomialHasVariables(cleaned) ? null : cleaned.constant;
  }

  function powerFormulaPolynomial(base, exponent) {
    const exponentValue = formulaConstantValue(exponent);
    const baseValue = formulaConstantValue(base);
    if (exponentValue == null) {
      throw new Error("Unsupported nonlinear formula: variable exponents are not exact-rendered.");
    }
    if (baseValue != null) {
      const value = Math.pow(baseValue, exponentValue);
      if (!Number.isFinite(value)) throw new Error("Formula power produced a non-finite value.");
      return constantFormulaPolynomial(value, base.linear.length);
    }
    if (!Number.isInteger(exponentValue) || exponentValue < 0) {
      throw new Error("Unsupported nonlinear formula: polynomial powers must be nonnegative integers.");
    }
    if (formulaPolynomialDegree(base) * exponentValue > 2) {
      throw new Error("Unsupported nonlinear formula: exact rendering is limited to degree 2.");
    }
    let result = constantFormulaPolynomial(1, base.linear.length);
    for (let count = 0; count < exponentValue; count += 1) result = multiplyFormulaPolynomials(result, base);
    return result;
  }

  function formulaVariableIndex(identifier, n = state.ambientDim) {
    const text = String(identifier || "").toLowerCase();
    const match = text.match(/^x_?(\d+)$/);
    if (match) {
      const index = Number(match[1]) - 1;
      if (index < 0 || index >= n) throw new Error(`Unknown variable ${identifier}; current ambient dimension is ${n}.`);
      return index;
    }
    if (text === "x" && n >= 1) return 0;
    if (text === "y" && n >= 2) return 1;
    return null;
  }

  function tokenizeFormulaExpression(text) {
    const tokens = [];
    let index = 0;
    while (index < text.length) {
      const char = text[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      const numberMatch = text.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (numberMatch) {
        tokens.push({ type: "number", value: Number(numberMatch[0]) });
        index += numberMatch[0].length;
        continue;
      }
      const identifierMatch = text.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifierMatch) {
        tokens.push({ type: "id", value: identifierMatch[0] });
        index += identifierMatch[0].length;
        continue;
      }
      if ("+-*/^(),".includes(char)) {
        tokens.push({ type: char });
        index += 1;
        continue;
      }
      throw new Error(`Unexpected character "${char}" in formula.`);
    }
    tokens.push({ type: "end" });
    return tokens;
  }

  function formulaFunctionInfo(identifier) {
    const text = String(identifier || "").toLowerCase();
    if (["sqrt", "abs", "sin", "cos", "tan", "exp", "ln", "log"].includes(text)) return { name: text };
    const logBase = text.match(/^log_([A-Za-z0-9.]+)$/);
    if (logBase) return { name: "log_base", base: logBase[1] };
    return null;
  }

  function parseFormulaFunctionBase(rawBase) {
    const text = String(rawBase || "").toLowerCase();
    if (text === "e") return Math.E;
    if (text === "pi") return Math.PI;
    const parsed = parseRationalNumber(text);
    if (parsed.ok && Number.isFinite(parsed.value)) return parsed.value;
    return null;
  }

  function evaluateFormulaFunction(info, args, n) {
    const values = args.map(formulaConstantValue);
    if (values.some((value) => value == null)) {
      throw new Error(`Unsupported nonlinear formula: ${info.name.replace("_base", "_a")} with variables is not exact-rendered.`);
    }
    let value;
    if (info.name === "sqrt") value = Math.sqrt(values[0]);
    else if (info.name === "abs") value = Math.abs(values[0]);
    else if (info.name === "sin") value = Math.sin(values[0]);
    else if (info.name === "cos") value = Math.cos(values[0]);
    else if (info.name === "tan") value = Math.tan(values[0]);
    else if (info.name === "exp") value = Math.exp(values[0]);
    else if (info.name === "ln") value = Math.log(values[0]);
    else if (info.name === "log") {
      value = values.length >= 2 ? Math.log(values[1]) / Math.log(values[0]) : Math.log10(values[0]);
    } else if (info.name === "log_base") {
      const base = parseFormulaFunctionBase(info.base);
      if (base == null) throw new Error("Unsupported nonlinear formula: symbolic logarithm bases are not exact-rendered.");
      value = Math.log(values[0]) / Math.log(base);
    }
    if (!Number.isFinite(value)) throw new Error(`${info.name} produced a non-finite value.`);
    return constantFormulaPolynomial(value, n);
  }

  class FormulaExpressionParser {
    constructor(text, n) {
      this.tokens = tokenizeFormulaExpression(text);
      this.index = 0;
      this.n = n;
    }

    peek() {
      return this.tokens[this.index] || { type: "end" };
    }

    consume(type) {
      const token = this.peek();
      if (token.type !== type) throw new Error(`Expected "${type}" in formula.`);
      this.index += 1;
      return token;
    }

    parse() {
      const polynomial = this.parseAdditive();
      if (this.peek().type !== "end") throw new Error("Unexpected extra formula text.");
      return cleanFormulaPolynomial(polynomial, this.n);
    }

    parseAdditive() {
      let left = this.parseMultiplicative();
      while (this.peek().type === "+" || this.peek().type === "-") {
        const operator = this.peek().type;
        this.index += 1;
        const right = this.parseMultiplicative();
        left = addFormulaPolynomials(left, right, operator === "-" ? -1 : 1);
      }
      return left;
    }

    startsImplicitFactor(token) {
      return token.type === "number" || token.type === "id" || token.type === "(";
    }

    parseMultiplicative() {
      let left = this.parsePower();
      while (this.peek().type === "*" || this.peek().type === "/" || this.startsImplicitFactor(this.peek())) {
        if (this.peek().type === "*") {
          this.index += 1;
          left = multiplyFormulaPolynomials(left, this.parsePower());
        } else if (this.peek().type === "/") {
          this.index += 1;
          const divisor = this.parsePower();
          const value = formulaConstantValue(divisor);
          if (value == null) throw new Error("Unsupported nonlinear formula: division by a variable expression is not exact-rendered.");
          if (Math.abs(value) <= 1e-12) throw new Error("Formula division by zero.");
          left = scaleFormulaPolynomial(left, 1 / value);
        } else {
          left = multiplyFormulaPolynomials(left, this.parsePower());
        }
      }
      return left;
    }

    parsePower() {
      const base = this.parseUnary();
      if (this.peek().type !== "^") return base;
      this.index += 1;
      return powerFormulaPolynomial(base, this.parsePower());
    }

    parseUnary() {
      if (this.peek().type === "+") {
        this.index += 1;
        return this.parseUnary();
      }
      if (this.peek().type === "-") {
        this.index += 1;
        return scaleFormulaPolynomial(this.parseUnary(), -1);
      }
      return this.parsePrimary();
    }

    parsePrimary() {
      const token = this.peek();
      if (token.type === "number") {
        this.index += 1;
        if (!Number.isFinite(token.value)) throw new Error("Formula number is not finite.");
        return constantFormulaPolynomial(token.value, this.n);
      }
      if (token.type === "id") {
        this.index += 1;
        const identifier = token.value;
        const variableIndex = formulaVariableIndex(identifier, this.n);
        if (variableIndex != null) return variableFormulaPolynomial(variableIndex, this.n);
        const lower = identifier.toLowerCase();
        if (lower === "pi") return constantFormulaPolynomial(Math.PI, this.n);
        if (lower === "e") return constantFormulaPolynomial(Math.E, this.n);
        const functionInfo = formulaFunctionInfo(identifier);
        if (functionInfo) return this.parseFunctionCall(functionInfo);
        throw new Error(`Unknown variable or function "${identifier}". Use x1 through x${this.n}.`);
      }
      if (token.type === "(") {
        this.index += 1;
        const expression = this.parseAdditive();
        this.consume(")");
        return expression;
      }
      throw new Error("Expected a number, variable, function, or parenthesized expression.");
    }

    parseFunctionCall(functionInfo) {
      const args = [];
      if (this.peek().type === "(") {
        this.index += 1;
        if (this.peek().type !== ")") {
          do {
            args.push(this.parseAdditive());
            if (this.peek().type !== ",") break;
            this.index += 1;
          } while (true);
        }
        this.consume(")");
      } else {
        args.push(this.parseUnary());
      }
      if (functionInfo.name === "log" && args.length !== 1 && args.length !== 2) throw new Error("log expects one argument, or log(base, value).");
      if (functionInfo.name !== "log" && args.length !== 1) throw new Error(`${functionInfo.name} expects one argument.`);
      return evaluateFormulaFunction(functionInfo, args, this.n);
    }
  }

  function formulaFunctionFromInfo(info) {
    if (info.name !== "log_base") return { name: info.name };
    const base = parseFormulaFunctionBase(info.base);
    if (base == null || !Number.isFinite(base) || base <= 0 || Math.abs(base - 1) <= 1e-12) {
      throw new Error("Unsupported formula: logarithm bases must be positive finite constants other than 1.");
    }
    return { name: "log_base", base };
  }

  class NumericFormulaExpressionParser {
    constructor(text, n) {
      this.tokens = tokenizeFormulaExpression(text);
      this.index = 0;
      this.n = n;
    }

    peek() {
      return this.tokens[this.index] || { type: "end" };
    }

    consume(type) {
      const token = this.peek();
      if (token.type !== type) throw new Error(`Expected "${type}" in formula.`);
      this.index += 1;
      return token;
    }

    parse() {
      const ast = this.parseAdditive();
      if (this.peek().type !== "end") throw new Error("Unexpected extra formula text.");
      validateFormulaConstants(ast);
      return ast;
    }

    parseAdditive() {
      let left = this.parseMultiplicative();
      while (this.peek().type === "+" || this.peek().type === "-") {
        const operator = this.peek().type;
        this.index += 1;
        left = { type: "binary", op: operator, left, right: this.parseMultiplicative() };
      }
      return left;
    }

    startsImplicitFactor(token) {
      return token.type === "number" || token.type === "id" || token.type === "(";
    }

    parseMultiplicative() {
      let left = this.parsePower();
      while (this.peek().type === "*" || this.peek().type === "/" || this.startsImplicitFactor(this.peek())) {
        if (this.peek().type === "*") {
          this.index += 1;
          left = { type: "binary", op: "*", left, right: this.parsePower() };
        } else if (this.peek().type === "/") {
          this.index += 1;
          left = { type: "binary", op: "/", left, right: this.parsePower() };
        } else {
          left = { type: "binary", op: "*", left, right: this.parsePower() };
        }
      }
      return left;
    }

    parsePower() {
      const base = this.parseUnary();
      if (this.peek().type !== "^") return base;
      this.index += 1;
      return { type: "binary", op: "^", left: base, right: this.parsePower() };
    }

    parseUnary() {
      if (this.peek().type === "+") {
        this.index += 1;
        return this.parseUnary();
      }
      if (this.peek().type === "-") {
        this.index += 1;
        return { type: "unary", op: "-", value: this.parseUnary() };
      }
      return this.parsePrimary();
    }

    parsePrimary() {
      const token = this.peek();
      if (token.type === "number") {
        this.index += 1;
        if (!Number.isFinite(token.value)) throw new Error("Formula number is not finite.");
        return { type: "constant", value: token.value };
      }
      if (token.type === "id") {
        this.index += 1;
        const identifier = token.value;
        const variableIndex = formulaVariableIndex(identifier, this.n);
        if (variableIndex != null) return { type: "variable", index: variableIndex };
        const lower = identifier.toLowerCase();
        if (lower === "pi") return { type: "constant", value: Math.PI };
        if (lower === "e") return { type: "constant", value: Math.E };
        const functionInfo = formulaFunctionInfo(identifier);
        if (functionInfo) return this.parseFunctionCall(formulaFunctionFromInfo(functionInfo));
        throw new Error(`Unknown variable or function "${identifier}". Use x1 through x${this.n}.`);
      }
      if (token.type === "(") {
        this.index += 1;
        const expression = this.parseAdditive();
        this.consume(")");
        return expression;
      }
      throw new Error("Expected a number, variable, function, or parenthesized expression.");
    }

    parseFunctionCall(functionInfo) {
      const args = [];
      if (this.peek().type === "(") {
        this.index += 1;
        if (this.peek().type !== ")") {
          do {
            args.push(this.parseAdditive());
            if (this.peek().type !== ",") break;
            this.index += 1;
          } while (true);
        }
        this.consume(")");
      } else {
        args.push(this.parseUnary());
      }
      if (functionInfo.name === "log" && args.length !== 1 && args.length !== 2) throw new Error("log expects one argument, or log(base, value).");
      if (functionInfo.name !== "log" && args.length !== 1) throw new Error(`${functionInfo.name} expects one argument.`);
      return { type: "function", name: functionInfo.name, base: functionInfo.base, args };
    }
  }

  function formulaAstHasVariables(ast) {
    if (!ast) return false;
    if (ast.type === "variable") return true;
    if (ast.type === "unary") return formulaAstHasVariables(ast.value);
    if (ast.type === "binary") return formulaAstHasVariables(ast.left) || formulaAstHasVariables(ast.right);
    if (ast.type === "function") return ast.args.some(formulaAstHasVariables);
    return false;
  }

  function evaluateFormulaAst(ast, variables = []) {
    let value = NaN;
    if (!ast) return NaN;
    if (ast.type === "constant") value = ast.value;
    else if (ast.type === "variable") value = variables[ast.index];
    else if (ast.type === "unary") {
      const inner = evaluateFormulaAst(ast.value, variables);
      value = ast.op === "-" ? -inner : inner;
    } else if (ast.type === "binary") {
      const left = evaluateFormulaAst(ast.left, variables);
      const right = evaluateFormulaAst(ast.right, variables);
      if (ast.op === "+") value = left + right;
      else if (ast.op === "-") value = left - right;
      else if (ast.op === "*") value = left * right;
      else if (ast.op === "/") value = left / right;
      else if (ast.op === "^") value = Math.pow(left, right);
    } else if (ast.type === "function") {
      const args = ast.args.map((arg) => evaluateFormulaAst(arg, variables));
      if (ast.name === "sqrt") value = Math.sqrt(args[0]);
      else if (ast.name === "abs") value = Math.abs(args[0]);
      else if (ast.name === "sin") value = Math.sin(args[0]);
      else if (ast.name === "cos") value = Math.cos(args[0]);
      else if (ast.name === "tan") value = Math.tan(args[0]);
      else if (ast.name === "exp") value = Math.exp(args[0]);
      else if (ast.name === "ln") value = Math.log(args[0]);
      else if (ast.name === "log") value = args.length >= 2 ? Math.log(args[1]) / Math.log(args[0]) : Math.log10(args[0]);
      else if (ast.name === "log_base") value = Math.log(args[0]) / Math.log(ast.base);
    }
    return Number.isFinite(value) ? value : NaN;
  }

  function validateFormulaConstants(ast) {
    if (!ast || formulaAstHasVariables(ast)) return;
    const value = evaluateFormulaAst(ast, []);
    if (!Number.isFinite(value)) throw new Error("Formula contains a non-finite constant expression.");
  }

  function validateFormulaAstConstants(ast) {
    if (!ast) return;
    if (ast.type === "unary") validateFormulaAstConstants(ast.value);
    else if (ast.type === "binary") {
      validateFormulaAstConstants(ast.left);
      validateFormulaAstConstants(ast.right);
    } else if (ast.type === "function") {
      ast.args.forEach(validateFormulaAstConstants);
    }
    validateFormulaConstants(ast);
  }

  function compileNumericFormulaRelation(relation, n) {
    const leftAst = new NumericFormulaExpressionParser(relation.left, n).parse();
    const rightAst = new NumericFormulaExpressionParser(relation.right, n).parse();
    const formulaAst = { type: "binary", op: "-", left: leftAst, right: rightAst };
    validateFormulaAstConstants(formulaAst);
    if (!formulaAstHasVariables(formulaAst)) {
      throw new Error("Formula must contain at least one x_i term.");
    }
    return formulaAst;
  }

  function isExactFormulaUnsupportedError(error) {
    return /^Unsupported nonlinear formula:/.test(String(error?.message || ""));
  }

  function splitFormulaRelation(rawFormula) {
    const text = String(rawFormula || "").trim();
    if (!text) throw new Error("Formula is empty.");
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "(") depth += 1;
      else if (char === ")") depth = Math.max(0, depth - 1);
      if (depth !== 0) continue;
      const two = text.slice(index, index + 2);
      if (two === "<=" || two === ">=") {
        return {
          left: text.slice(0, index).trim(),
          right: text.slice(index + 2).trim(),
          relation: two,
          strict: false,
        };
      }
      if (char === "=" || char === "<" || char === ">") {
        return {
          left: text.slice(0, index).trim(),
          right: text.slice(index + 1).trim(),
          relation: char === "<" ? "<=" : char === ">" ? ">=" : "=",
          strict: char === "<" || char === ">",
        };
      }
    }
    throw new Error("Formula needs a relation: =, <=, >=, <, or >.");
  }

  function compileFormulaRelation(rawFormula, n = state.ambientDim) {
    const relation = splitFormulaRelation(rawFormula);
    if (!relation.left || !relation.right) throw new Error("Both sides of the formula relation are required.");
    const formulaAst = compileNumericFormulaRelation(relation, n);
    let polynomial = null;
    let exactError = null;
    try {
      const left = new FormulaExpressionParser(relation.left, n).parse();
      const right = new FormulaExpressionParser(relation.right, n).parse();
      polynomial = addFormulaPolynomials(left, right, -1);
      if (!formulaPolynomialHasVariables(polynomial)) {
        throw new Error("Formula must contain at least one x_i term.");
      }
    } catch (error) {
      exactError = error;
    }
    const result = {
      formulaRelation: relation.relation,
      formulaStrict: relation.strict,
      formulaAst,
      formulaRenderMode: polynomial ? "exact" : "numeric",
      formulaPolynomial: polynomial ? cleanFormulaPolynomial(polynomial, n) : null,
    };
    if (exactError && isExactFormulaUnsupportedError(exactError)) {
      result.formulaRenderWarning = `${exactError.message} Rendering with numerical marching squares.`;
    } else if (exactError && !polynomial) {
      result.formulaRenderWarning = `Rendering with numerical marching squares.`;
    }
    return result;
  }

  function compileExactFormulaRelation(rawFormula, n = state.ambientDim) {
    const relation = splitFormulaRelation(rawFormula);
    if (!relation.left || !relation.right) throw new Error("Both sides of the formula relation are required.");
    const left = new FormulaExpressionParser(relation.left, n).parse();
    const right = new FormulaExpressionParser(relation.right, n).parse();
    const polynomial = addFormulaPolynomials(left, right, -1);
    if (!formulaPolynomialHasVariables(polynomial)) {
      throw new Error("Formula must contain at least one x_i term.");
    }
    return {
      formulaRelation: relation.relation,
      formulaStrict: relation.strict,
      formulaRenderMode: "exact",
      formulaPolynomial: cleanFormulaPolynomial(polynomial, n),
    };
  }

  function normalizeTropicalConvention(value) {
    return String(value || "").toLowerCase() === "min" ? "min" : "max";
  }

  function normalizeTropicalNotationMode(value) {
    const mode = String(value || "").toLowerCase();
    return mode === "affine" || mode === "tropical" ? mode : "u";
  }

  function defaultTropicalInput(n = state.ambientDim) {
    return n >= 2 ? "p^0 + u1 + u2" : "p^0 + u1";
  }

  function parseTropicalRational(rawValue, label = "coefficient") {
    const parsed = parseRationalNumber(rawValue);
    if (!parsed.ok || !Number.isFinite(parsed.value)) throw new Error(`Tropical ${label} must be a finite rational value.`);
    return parsed.value;
  }

  function formatTropicalCoefficient(value) {
    return fmt(value, 6);
  }

  function formatTropicalCoefficientTex(value) {
    return formatTropicalCoefficient(value).replace(/-/g, "-");
  }

  function tropicalCoefficientToken(value) {
    const text = formatTropicalCoefficient(value);
    return value < 0 ? `p^{${text}}` : `p^${text}`;
  }

  function tropicalCoefficientTokenTex(value) {
    return `p^{${formatTropicalCoefficientTex(value)}}`;
  }

  function tropicalMonomialLabel(exponent, symbol = "u", options = {}) {
    const useUnderscore = options.underscore === true;
    const parts = [];
    exponent.forEach((power, index) => {
      if (!power) return;
      const variable = useUnderscore ? `${symbol}_${index + 1}` : `${symbol}${index + 1}`;
      parts.push(power === 1 ? variable : `${variable}^${power}`);
    });
    return parts.join("") || "1";
  }

  function tropicalTermToText(term) {
    const monomial = tropicalMonomialLabel(term.exponent);
    if (monomial === "1") return tropicalCoefficientToken(term.coefficient);
    if (Math.abs(term.coefficient) <= 1e-12) return monomial;
    return `${tropicalCoefficientToken(term.coefficient)} ${monomial}`;
  }

  function tropicalTermsToText(terms) {
    return terms.map(tropicalTermToText).join(" + ");
  }

  function tropicalMonomialTex(exponent, symbol = "u") {
    const parts = [];
    (Array.isArray(exponent) ? exponent : []).forEach((power, index) => {
      if (!power) return;
      const variable = `${symbol}_{${index + 1}}`;
      parts.push(power === 1 ? variable : `${variable}^{${power}}`);
    });
    return parts.join("") || "1";
  }

  function tropicalTermToTex(term) {
    const monomial = tropicalMonomialTex(term?.exponent || [], "u");
    if (monomial === "1") return tropicalCoefficientTokenTex(term?.coefficient || 0);
    if (Math.abs(term?.coefficient || 0) <= 1e-12) return monomial;
    return `${tropicalCoefficientTokenTex(term.coefficient)}${monomial}`;
  }

  function tropicalTermsToTex(terms) {
    return terms.map(tropicalTermToTex).join(" + ");
  }

  function tropicalAffineTermToText(term) {
    const parts = [];
    const coefficient = finiteNumber(term?.coefficient, 0);
    const exponent = Array.isArray(term?.exponent) ? term.exponent : [];
    if (Math.abs(coefficient) > 1e-12 || !exponent.some(Boolean)) parts.push(formatTropicalCoefficient(coefficient));
    exponent.forEach((power, index) => {
      if (!power) return;
      parts.push(power === 1 ? `x_${index + 1}` : `${power}x_${index + 1}`);
    });
    return parts.join(" + ") || "0";
  }

  function tropicalAffineTermToTex(term) {
    const parts = [];
    const coefficient = finiteNumber(term?.coefficient, 0);
    const exponent = Array.isArray(term?.exponent) ? term.exponent : [];
    if (Math.abs(coefficient) > 1e-12 || !exponent.some(Boolean)) parts.push(formatTropicalCoefficientTex(coefficient));
    exponent.forEach((power, index) => {
      if (!power) return;
      parts.push(power === 1 ? `x_{${index + 1}}` : `${power}x_{${index + 1}}`);
    });
    return parts.join(" + ") || "0";
  }

  function tropicalTermsToAffineText(terms, convention = "max") {
    const mode = normalizeTropicalConvention(convention);
    return `${mode}{${terms.map(tropicalAffineTermToText).join(", ")}}`;
  }

  function tropicalTermsToAffineTex(terms, convention = "max") {
    const mode = normalizeTropicalConvention(convention);
    return `\\${mode}\\{${terms.map(tropicalAffineTermToTex).join(", ")}\\}`;
  }

  function tropicalAlgebraTermToText(term) {
    const coefficient = formatTropicalCoefficient(finiteNumber(term?.coefficient, 0));
    const monomial = tropicalMonomialLabel(term?.exponent || [], "x", { underscore: true });
    if (monomial === "1") return coefficient;
    if (Math.abs(finiteNumber(term?.coefficient, 0)) <= 1e-12) return monomial;
    return `${coefficient}\u2297${monomial}`;
  }

  function tropicalAlgebraTermToTex(term) {
    const coefficient = formatTropicalCoefficientTex(finiteNumber(term?.coefficient, 0));
    const monomial = tropicalMonomialTex(term?.exponent || [], "x");
    if (monomial === "1") return coefficient;
    if (Math.abs(finiteNumber(term?.coefficient, 0)) <= 1e-12) return monomial;
    return `${coefficient}\\otimes ${monomial}`;
  }

  function tropicalTermsToAlgebraText(terms) {
    return terms.map(tropicalAlgebraTermToText).join(" \u2295 ");
  }

  function tropicalTermsToAlgebraTex(terms) {
    return terms.map(tropicalAlgebraTermToTex).join(" \\oplus ");
  }

  function tropicalNotationText(data, mode = data?.tropicalNotationMode) {
    const terms = Array.isArray(data?.terms) ? data.terms : [];
    const notation = normalizeTropicalNotationMode(mode);
    const convention = normalizeTropicalConvention(data?.tropicalConvention);
    if (notation === "affine") return data?.normalizedTropicalAffine || tropicalTermsToAffineText(terms, convention);
    if (notation === "tropical") return data?.normalizedTropicalAlgebra || tropicalTermsToAlgebraText(terms);
    return data?.normalizedTropical || tropicalTermsToText(terms);
  }

  function tropicalTermDisplay(term, mode = "u", convention = "max") {
    const notation = normalizeTropicalNotationMode(mode);
    if (notation === "affine") return {
      plain: tropicalAffineTermToText(term),
      tex: tropicalAffineTermToTex(term),
    };
    if (notation === "tropical") return {
      plain: tropicalAlgebraTermToText(term),
      tex: tropicalAlgebraTermToTex(term),
    };
    return {
      plain: tropicalTermToText(term),
      tex: tropicalTermToTex(term),
    };
  }

  function normalizeTropicalInputSyntax(rawInput) {
    let text = String(rawInput || "").trim();
    while (/^\$[\s\S]*\$$/.test(text)) text = text.slice(1, -1).trim();
    return text
      .replace(/\\left\b|\\right\b/g, "")
      .replace(/\\\{/g, "{")
      .replace(/\\\}/g, "}")
      .replace(/\\(?:oplus|vee)\b|⊕|\boplus\b/gi, "+")
      .replace(/\\(?:otimes|odot)\b|⊗|\botimes\b/gi, "*")
      .replace(/\\cdot\b|·/g, "*");
  }

  function splitTopLevelList(text, delimiter = ",") {
    const parts = [];
    let start = 0;
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if ("({[".includes(char)) depth += 1;
      else if (")}]".includes(char)) depth = Math.max(0, depth - 1);
      if (char === delimiter && depth === 0) {
        const part = text.slice(start, index).trim();
        if (part) parts.push(part);
        start = index + 1;
      }
    }
    const last = text.slice(start).trim();
    if (last) parts.push(last);
    return parts;
  }

  function splitTropicalTerms(rawInput) {
    const text = String(rawInput || "").trim();
    if (!text) throw new Error("Tropical polynomial is empty.");
    const terms = [];
    let start = 0;
    let depth = 0;
    const previousNonspace = (index) => {
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        if (!/\s/.test(text[cursor])) return text[cursor];
      }
      return "";
    };
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if ("({[".includes(char)) depth += 1;
      else if (")}]".includes(char)) depth = Math.max(0, depth - 1);
      if ((char === "+" || char === "-") && depth === 0 && index > start) {
        const previous = previousNonspace(index);
        if (!previous || "^*/+-(".includes(previous)) continue;
        const term = text.slice(start, index).trim();
        if (term) terms.push(term);
        start = index;
      }
    }
    const last = text.slice(start).trim();
    if (last) terms.push(last);
    if (!terms.length) throw new Error("Tropical polynomial needs at least one term.");
    return terms;
  }

  function readTropicalPowerValue(text, start, label, { integer = false } = {}) {
    let index = start;
    while (/\s/.test(text[index])) index += 1;
    if (text[index] !== "^") {
      return { value: integer ? 1 : 1, nextIndex: start };
    }
    index += 1;
    while (/\s/.test(text[index])) index += 1;
    let raw = "";
    if (text[index] === "{" || text[index] === "(") {
      const open = text[index];
      const close = open === "{" ? "}" : ")";
      index += 1;
      const valueStart = index;
      let depth = 1;
      while (index < text.length && depth > 0) {
        if (text[index] === open) depth += 1;
        else if (text[index] === close) depth -= 1;
        if (depth > 0) index += 1;
      }
      if (depth !== 0) throw new Error(`Unclosed ${label} power.`);
      raw = text.slice(valueStart, index).trim();
      index += 1;
    } else {
      const match = text.slice(index).match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?/);
      if (!match) throw new Error(`${label} power must be a number.`);
      raw = match[0];
      index += raw.length;
    }
    const value = integer ? Number(raw) : parseTropicalRational(raw, `${label} power`);
    if (integer) {
      if (!Number.isInteger(value) || value < 0) throw new Error(`${label} powers must be nonnegative integers.`);
      return { value, nextIndex: index };
    }
    return { value, nextIndex: index };
  }

  function parseTropicalTextTerm(rawTerm, n = state.ambientDim) {
    let text = String(rawTerm || "").trim();
    if (!text) throw new Error("Empty tropical term.");
    let sign = 1;
    if (text[0] === "+" || text[0] === "-") {
      sign = text[0] === "-" ? -1 : 1;
      text = text.slice(1).trim();
    }
    if (!text) throw new Error("Empty tropical term after sign.");
    const exponent = Array(n).fill(0);
    let coefficient = 0;
    let sawFactor = false;
    let sawCoefficient = false;
    let index = 0;
    while (index < text.length) {
      const char = text[index];
      if (/\s/.test(char) || char === "*") {
        index += 1;
        continue;
      }
      const pMatch = text.slice(index).match(/^p\b/i);
      if (pMatch) {
        index += pMatch[0].length;
        const power = readTropicalPowerValue(text, index, "p");
        coefficient += power.value;
        index = power.nextIndex;
        sawFactor = true;
        sawCoefficient = true;
        continue;
      }
      const numberMatch = text.slice(index).match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?/);
      if (numberMatch) {
        coefficient += parseTropicalRational(numberMatch[0], "coefficient");
        index += numberMatch[0].length;
        sawFactor = true;
        sawCoefficient = true;
        continue;
      }
      const variableMatch = text.slice(index).match(/^[ux]_?(\d+)/i);
      if (variableMatch) {
        const coordinate = Number(variableMatch[1]) - 1;
        if (coordinate < 0 || coordinate >= n) throw new Error(`Unknown tropical symbol ${variableMatch[0]}; current ambient dimension is ${n}.`);
        index += variableMatch[0].length;
        const power = readTropicalPowerValue(text, index, variableMatch[0], { integer: true });
        exponent[coordinate] += power.value;
        index = power.nextIndex;
        sawFactor = true;
        continue;
      }
      throw new Error(`Unexpected tropical term text near "${text.slice(index)}".`);
    }
    if (!sawFactor) throw new Error("Empty tropical term.");
    if (sign < 0 && !sawCoefficient) coefficient = 1;
    return {
      coefficient: sign * coefficient,
      exponent,
      label: tropicalMonomialLabel(exponent),
      implicitCoefficient: !sawCoefficient,
    };
  }

  function normalizeTropicalTerms(terms, convention = "max", n = state.ambientDim) {
    const mode = normalizeTropicalConvention(convention);
    const merged = new Map();
    for (const term of terms) {
      const coefficient = finiteNumber(term?.coefficient, NaN);
      if (!Number.isFinite(coefficient)) throw new Error("Tropical term coefficient is not finite.");
      if (!Array.isArray(term?.exponent)) throw new Error("Tropical term needs an exponent vector.");
      if (term.exponent.length !== n) throw new Error(`Tropical exponent vectors need ${n} entries.`);
      const exponent = term.exponent.map((value, index) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Tropical exponent ${index + 1} must be a nonnegative integer.`);
        return parsed;
      });
      const key = exponent.join(",");
      const existing = merged.get(key);
      if (!existing || (mode === "max" ? coefficient > existing.coefficient : coefficient < existing.coefficient)) {
        merged.set(key, { coefficient, exponent, label: tropicalMonomialLabel(exponent) });
      }
    }
    const normalized = Array.from(merged.values());
    if (!normalized.length) throw new Error("Tropical polynomial needs at least one term.");
    normalized.sort((left, right) => {
      const degreeLeft = left.exponent.reduce((total, value) => total + value, 0);
      const degreeRight = right.exponent.reduce((total, value) => total + value, 0);
      if (degreeLeft !== degreeRight) return degreeLeft - degreeRight;
      for (let index = 0; index < n; index += 1) {
        if (left.exponent[index] !== right.exponent[index]) return right.exponent[index] - left.exponent[index];
      }
      return left.coefficient - right.coefficient;
    });
    return normalized;
  }

  function parseTropicalJsonTerms(rawInput, convention, n = state.ambientDim) {
    const parsed = JSON.parse(rawInput);
    const source = Array.isArray(parsed) ? parsed : parsed?.terms;
    if (!Array.isArray(source)) throw new Error("Tropical JSON must be an array of terms or an object with terms.");
    const terms = source.map((entry, index) => {
      const term = Array.isArray(entry)
        ? { coefficient: entry[0], exponent: entry[1] }
        : entry;
      if (!term || typeof term !== "object") throw new Error(`Tropical JSON term ${index + 1} must be an object.`);
      const coefficient = typeof term.coefficient === "string"
        ? parseTropicalRational(term.coefficient, "coefficient")
        : finiteNumber(term.coefficient, NaN);
      return {
        coefficient,
        exponent: Array.isArray(term.exponent) ? term.exponent : [],
        label: term.label,
      };
    });
    return normalizeTropicalTerms(terms, convention, n);
  }

  function parseTropicalAffineExpression(rawTerm, n = state.ambientDim) {
    const text = String(rawTerm || "").trim();
    if (!text) throw new Error("Empty affine tropical term.");
    const exponent = Array(n).fill(0);
    let coefficient = 0;
    let index = 0;
    let sawPiece = false;
    const numberPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?/;
    while (index < text.length) {
      while (/\s/.test(text[index])) index += 1;
      let sign = 1;
      if (text[index] === "+" || text[index] === "-") {
        sign = text[index] === "-" ? -1 : 1;
        index += 1;
      } else if (sawPiece) {
        throw new Error(`Expected + or - in affine term near "${text.slice(index)}".`);
      }
      while (/\s/.test(text[index])) index += 1;
      const numberMatch = text.slice(index).match(numberPattern);
      let scalar = 1;
      let hasNumber = false;
      if (numberMatch) {
        scalar = parseTropicalRational(numberMatch[0], "affine coefficient");
        index += numberMatch[0].length;
        hasNumber = true;
      }
      while (/\s/.test(text[index])) index += 1;
      if (text[index] === "*") {
        index += 1;
        while (/\s/.test(text[index])) index += 1;
      }
      const variableMatch = text.slice(index).match(/^x_?(\d+)/i);
      if (variableMatch) {
        const coordinate = Number(variableMatch[1]) - 1;
        if (coordinate < 0 || coordinate >= n) throw new Error(`Unknown affine tropical symbol ${variableMatch[0]}; current ambient dimension is ${n}.`);
        const amount = sign * scalar;
        if (!Number.isInteger(amount) || amount < 0) throw new Error("Affine tropical slopes must be nonnegative integers.");
        exponent[coordinate] += amount;
        index += variableMatch[0].length;
      } else if (hasNumber) {
        coefficient += sign * scalar;
      } else {
        throw new Error(`Expected a number or x_i term near "${text.slice(index)}".`);
      }
      sawPiece = true;
    }
    if (!sawPiece) throw new Error("Empty affine tropical term.");
    return { coefficient, exponent, label: tropicalMonomialLabel(exponent) };
  }

  function parseTropicalAffineSet(rawInput, n = state.ambientDim) {
    const text = String(rawInput || "").trim();
    const match = text.match(/^\\?(max|min)\s*([({])/i);
    if (!match) return null;
    const convention = normalizeTropicalConvention(match[1]);
    const open = match[2];
    const close = open === "{" ? "}" : ")";
    if (!text.endsWith(close)) throw new Error(`Tropical ${convention} notation needs a closing ${close}.`);
    const body = text.slice(match[0].length, -1).trim();
    const pieces = splitTopLevelList(body, ",");
    if (!pieces.length) throw new Error(`Tropical ${convention} notation needs at least one affine term.`);
    return {
      convention,
      terms: normalizeTropicalTerms(pieces.map((piece) => parseTropicalAffineExpression(piece, n)), convention, n),
    };
  }

  function compileTropicalPolynomial(rawInput, convention = "max", n = state.ambientDim) {
    const tropicalInput = String(rawInput || "").trim();
    if (!tropicalInput) throw new Error("Tropical polynomial is empty.");
    const normalizedInput = normalizeTropicalInputSyntax(tropicalInput);
    const affineSet = parseTropicalAffineSet(normalizedInput, n);
    const tropicalConvention = affineSet?.convention || normalizeTropicalConvention(convention);
    const terms = affineSet
      ? affineSet.terms
      : /^[\[{]/.test(normalizedInput)
        ? parseTropicalJsonTerms(normalizedInput, tropicalConvention, n)
        : normalizeTropicalTerms(splitTropicalTerms(normalizedInput).map((term) => parseTropicalTextTerm(term, n)), tropicalConvention, n);
    return {
      tropicalInput,
      tropicalConvention,
      terms,
      normalizedTropical: tropicalTermsToText(terms),
      normalizedTropicalAffine: tropicalTermsToAffineText(terms, tropicalConvention),
      normalizedTropicalAlgebra: tropicalTermsToAlgebraText(terms),
    };
  }

  function resizeTropicalTerms(terms, n = state.ambientDim) {
    if (!Array.isArray(terms)) return [];
    return terms.map((term) => ({
      coefficient: finiteNumber(term?.coefficient, NaN),
      exponent: resizeVector(Array.isArray(term?.exponent) ? term.exponent : [], n).map((value) => Math.round(finiteNumber(value, 0))),
    }));
  }

  function defaultDirection(n = state.ambientDim) {
    return { basis: "frame", index: Math.max(0, Math.min(2, n - 1)) };
  }

  function defaultRotationPair(n = state.ambientDim) {
    return [0, Math.min(2, n - 1)];
  }

  function lowestDistinctIndex(index, n = state.ambientDim) {
    for (let candidate = 0; candidate < n; candidate += 1) {
      if (candidate !== index) return candidate;
    }
    return 0;
  }

  function normalizeRotationPair(pair, n = state.ambientDim) {
    const fallback = defaultRotationPair(n);
    const source = Array.isArray(pair) ? pair : fallback;
    const first = clamp(Math.round(finiteNumber(source[0], fallback[0])), 0, n - 1);
    let second = clamp(Math.round(finiteNumber(source[1], fallback[1])), 0, n - 1);
    if (second === first) second = lowestDistinctIndex(first, n);
    return [first, second];
  }

  function normalizeDirection(direction, n = state.ambientDim) {
    if (typeof direction === "number") {
      return { basis: "ambient", index: clamp(Math.round(finiteNumber(direction, 0)), 0, n - 1) };
    }
    const basis = direction?.basis === "ambient" ? "ambient" : "frame";
    const index = clamp(Math.round(finiteNumber(direction?.index, defaultDirection(n).index)), 0, n - 1);
    return { basis, index };
  }

  function directionKey(direction = state.activeDirection) {
    const normalized = normalizeDirection(direction);
    return `${normalized.basis}:${normalized.index}`;
  }

  function directionLabel(direction = state.activeDirection) {
    const normalized = normalizeDirection(direction);
    return `${normalized.basis === "ambient" ? "e" : "v"}${normalized.index + 1}`;
  }

  function activeDirectionVector() {
    const direction = normalizeDirection(state.activeDirection);
    if (direction.basis === "ambient") {
      return Array.from({ length: state.ambientDim }, (_, index) => (index === direction.index ? 1 : 0));
    }
    return resizeVector(state.frame[direction.index] || [], state.ambientDim);
  }

  function resizeFrame(frame, n) {
    const next = [];
    for (let col = 0; col < n; col += 1) {
      if (frame[col]) {
        next.push(resizeVector(frame[col], n));
      } else {
        next.push(Array.from({ length: n }, (_, row) => (row === col ? 1 : 0)));
      }
    }
    state.frame = next;
    gramSchmidtFrame();
  }

  function orthonormalizeFrameColumns(columns, n = state.ambientDim) {
    const repaired = [];
    for (let col = 0; col < n; col += 1) {
      let vector = resizeVector(Array.isArray(columns[col]) ? columns[col] : [], n);
      for (const previous of repaired) {
        vector = add(vector, scale(previous, -dot(vector, previous)));
      }
      const length = norm(vector);
      if (!(length > 1e-10)) {
        return {
          ok: false,
          error: `Frame matrix is rank deficient at column v_${col + 1}.`,
        };
      }
      repaired.push(vector.map((value) => value / length));
    }
    return { ok: true, frame: repaired };
  }

  function gramSchmidtFrame() {
    const repaired = [];
    for (let col = 0; col < state.ambientDim; col += 1) {
      let vector = state.frame[col] ? resizeVector(state.frame[col], state.ambientDim) : [];
      if (vector.length === 0) vector = Array.from({ length: state.ambientDim }, (_, row) => (row === col ? 1 : 0));
      for (const previous of repaired) {
        vector = add(vector, scale(previous, -dot(vector, previous)));
      }
      if (norm(vector) <= 1e-10) {
        vector = Array.from({ length: state.ambientDim }, (_, row) => (row === col ? 1 : 0));
        for (const previous of repaired) {
          vector = add(vector, scale(previous, -dot(vector, previous)));
        }
      }
      repaired.push(normalize(vector, col));
    }
    state.frame = repaired;
  }

  function clampMotionState() {
    state.motionMode = state.motionMode === "discrete" ? "discrete" : "continuous";
    for (const [key, limits] of Object.entries(MOTION_LIMITS)) {
      state[key] = clamp(finiteNumber(state[key], MOTION_DEFAULTS[key]), limits[0], limits[1]);
    }
    state.rotationPair = normalizeRotationPair(state.rotationPair);
  }

  function directInputHasFocus() {
    const active = document.activeElement;
    return !!active?.closest?.("[data-slide-input-mode-row='direct']");
  }

  function directFrameRowsText(columns = state.frame) {
    return matrixRowsText(frameRows(columns));
  }

  function matrixRowsText(rows, digits = 6) {
    return rows
      .map((row) => row.map((value) => fmt(value, digits)).join(", "))
      .join("\n");
  }

  function formatRationalInputValue(value, digits = 6) {
    return fmt(finiteNumber(value, 0), digits);
  }

  function rationalWheelInputValue(rawValue, fallback = 0) {
    const parsed = parseRationalNumber(rawValue);
    if (parsed.ok && Number.isFinite(parsed.value)) return parsed.value;
    return finiteNumber(rawValue, fallback);
  }

  function attachRationalInputBehavior(input, options = {}) {
    const digits = options.digits ?? 6;
    const formatValue = options.formatValue || ((value) => formatRationalInputValue(value, digits));
    const currentValue = () => finiteNumber(typeof options.currentValue === "function" ? options.currentValue() : input.value, 0);
    const restoreValue = () => {
      input.value = input.dataset.originalValue || formatValue(currentValue());
    };
    const commitValue = (meta = {}) => {
      const parsed = parseRationalNumber(input.value);
      if (!parsed.ok || !Number.isFinite(parsed.value)) {
        state.lastWarning = options.invalidMessage || "Entry must be a finite rational value.";
        restoreValue();
        if (typeof options.onInvalid === "function") options.onInvalid(input);
        return false;
      }
      if (typeof options.validateValue === "function" && !options.validateValue(parsed.value)) {
        state.lastWarning = options.invalidMessage || "Entry must be valid.";
        restoreValue();
        if (typeof options.onInvalid === "function") options.onInvalid(input);
        return false;
      }
      const next = meta.clampToWheelBounds
        ? clamp(parsed.value, RATIONAL_WHEEL_MIN, RATIONAL_WHEEL_MAX)
        : parsed.value;
      if (typeof options.onCommit === "function") options.onCommit(next, input, meta);
      input.value = formatValue(typeof options.currentValue === "function" && options.formatCommittedValue !== false ? currentValue() : next);
      input.dataset.originalValue = input.value;
      if (typeof options.afterCommit === "function") options.afterCommit(input, meta);
      return true;
    };
    input.addEventListener("focus", () => {
      input.dataset.originalValue = input.value;
    });
    input.addEventListener("change", () => commitValue());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitValue();
        input.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        restoreValue();
        input.blur();
      }
    });
    if (options.wheel !== false) {
      input.addEventListener("wheel", (event) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        const wheelStep = options.wheelStep ?? RATIONAL_WHEEL_STEP;
        const wheelMin = options.wheelMin ?? RATIONAL_WHEEL_MIN;
        const wheelMax = options.wheelMax ?? RATIONAL_WHEEL_MAX;
        const next = clamp(
          rationalWheelInputValue(input.value, currentValue()) + direction * wheelStep,
          wheelMin,
          wheelMax
        );
        input.value = formatValue(next);
        input.dataset.originalValue = input.value;
        if (options.commitOnWheel !== false && typeof options.onCommit === "function") {
          options.onCommit(next, input, { wheel: true, clampToWheelBounds: true });
          input.value = formatValue(typeof options.currentValue === "function" ? currentValue() : next);
          input.dataset.originalValue = input.value;
          if (typeof options.afterCommit === "function") options.afterCommit(input, { wheel: true, clampToWheelBounds: true });
        }
      }, { passive: false });
    }
    return { commit: commitValue, restore: restoreValue };
  }

  function appendRationalTupleInputs(container, values, options = {}) {
    values.forEach((value, index) => {
      if (index > 0) container.append(document.createTextNode(", "));
      const label = document.createElement("label");
      label.className = options.labelClassName || "slice-param-vector";
      const input = document.createElement("input");
      input.className = options.inputClassName || "slice-input slice-coordinate-input";
      input.type = "text";
      input.inputMode = "decimal";
      input.value = (options.formatValue || ((entry) => formatRationalInputValue(entry, options.digits ?? 6)))(value);
      if (options.datasetName) input.dataset[options.datasetName] = String(index);
      input.setAttribute("aria-label", typeof options.ariaLabel === "function" ? options.ariaLabel(index) : `coordinate ${index + 1}`);
      attachRationalInputBehavior(input, {
        digits: options.digits ?? 6,
        formatValue: options.formatValue,
        currentValue: () => options.currentValue(index),
        invalidMessage: typeof options.invalidMessage === "function" ? options.invalidMessage(index) : options.invalidMessage,
        onCommit: (next, entry, meta) => options.onCommit(index, next, entry, meta),
        afterCommit: options.afterCommit,
        onInvalid: options.onInvalid,
      });
      label.append(input);
      container.append(label);
    });
  }

  function buildRationalMatrixGrid(grid, options = {}) {
    const n = options.dimension || state.ambientDim;
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `${options.rowLabelWidth || 32}px repeat(${n}, ${options.cellWidth || 58}px)`;
    const corner = document.createElement("span");
    corner.className = options.labelClassName || "slice-direct-matrix-label";
    corner.textContent = "";
    grid.append(corner);
    for (let col = 0; col < n; col += 1) {
      const label = document.createElement("span");
      label.className = options.labelClassName || "slice-direct-matrix-label";
      const colLabel = typeof options.columnLabel === "function" ? options.columnLabel(col) : `c${col + 1}`;
      setMathText(label, colLabel.plain || colLabel, colLabel.tex || labelToTex(colLabel));
      grid.append(label);
    }
    for (let row = 0; row < n; row += 1) {
      const rowLabel = document.createElement("span");
      rowLabel.className = options.labelClassName || "slice-direct-matrix-label";
      const rowLabelText = typeof options.rowLabel === "function" ? options.rowLabel(row) : `r${row + 1}`;
      setMathText(rowLabel, rowLabelText.plain || rowLabelText, rowLabelText.tex || labelToTex(rowLabelText));
      grid.append(rowLabel);
      for (let col = 0; col < n; col += 1) {
        const input = document.createElement("input");
        input.className = options.inputClassName || "slice-input slice-direct-matrix-cell";
        input.type = "text";
        input.inputMode = "decimal";
        input.value = formatRationalInputValue(options.valueAt(row, col), options.digits ?? 6);
        input.dataset[options.rowDataset || "matrixRow"] = String(row);
        input.dataset[options.columnDataset || "matrixColumn"] = String(col);
        input.setAttribute("aria-label", typeof options.ariaLabel === "function" ? options.ariaLabel(row, col) : `Matrix entry ${row + 1}, ${col + 1}`);
        attachRationalInputBehavior(input, {
          digits: options.digits ?? 6,
          currentValue: () => options.valueAt(row, col),
          invalidMessage: typeof options.invalidMessage === "function" ? options.invalidMessage(row, col) : options.invalidMessage,
          onCommit: (next, entry, meta) => options.onCommit?.(row, col, next, entry, meta),
          afterCommit: options.afterCommit,
          onInvalid: options.onInvalid,
          commitOnWheel: options.commitOnWheel,
          formatCommittedValue: options.formatCommittedValue,
        });
        grid.append(input);
      }
    }
  }

  function readRationalMatrixGrid(grid, options = {}) {
    const n = options.dimension || state.ambientDim;
    const rows = Array.from({ length: n }, () => Array(n).fill(0));
    const rowDataset = options.rowDataset || "matrixRow";
    const columnDataset = options.columnDataset || "matrixColumn";
    const inputs = Array.from(grid.querySelectorAll(`[data-${datasetNameToAttribute(rowDataset)}]`));
    if (inputs.length !== n * n) throw new Error(`${options.label || "Matrix"} needs ${n} x ${n} entries.`);
    inputs.forEach((input) => {
      const row = Number(input.dataset[rowDataset]);
      const col = Number(input.dataset[columnDataset]);
      const parsed = parseRationalNumber(input.value);
      if (!parsed.ok || !Number.isFinite(parsed.value)) {
        const entryLabel = typeof options.entryLabel === "function"
          ? options.entryLabel(row, col)
          : `row ${row + 1}, column ${col + 1}`;
        throw new Error(`${options.label || "Matrix"} entry ${entryLabel} is not a finite rational value.`);
      }
      rows[row][col] = parsed.value;
    });
    return rows;
  }

  function datasetNameToAttribute(name) {
    return String(name).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  }

  function finiteVector(vector, n = state.ambientDim) {
    return resizeVector(Array.isArray(vector) ? vector.map((value) => finiteNumber(value, 0)) : [], n);
  }

  function normalizedMatrixRows(rows, n = state.ambientDim) {
    return Array.from({ length: n }, (_, row) =>
      resizeVector(Array.isArray(rows?.[row]) ? rows[row].map((value) => finiteNumber(value, 0)) : [], n)
    );
  }

  function matrixColumnFromRows(rows, columnIndex, n = state.ambientDim) {
    const matrix = normalizedMatrixRows(rows, n);
    return Array.from({ length: n }, (_, row) => finiteNumber(matrix[row]?.[columnIndex], 0));
  }

  function setMatrixColumnRows(rows, columnIndex, vector, n = state.ambientDim) {
    const matrix = normalizedMatrixRows(rows, n);
    const nextVector = finiteVector(vector, n);
    for (let row = 0; row < n; row += 1) matrix[row][columnIndex] = nextVector[row] || 0;
    return matrix;
  }

  function vectorRowsText(vector, digits = 6) {
    return matrixRowsText([finiteVector(vector, state.ambientDim)], digits);
  }

  function vectorToTupleText(vector, digits = 3) {
    return `(${finiteVector(vector, state.ambientDim).map((value) => fmt(value, digits)).join(", ")})`;
  }

  function vectorToTupleTex(vector, digits = 3) {
    return `\\left(${finiteVector(vector, state.ambientDim).map((value) => fmt(value, digits)).join(", ")}\\right)`;
  }

  function matrixRowsFromColumns(columns, n = state.ambientDim) {
    return Array.from({ length: n }, (_, row) =>
      Array.from({ length: n }, (_, col) => finiteNumber(columns?.[col]?.[row], 0))
    );
  }

  function cloneMatrixRows(rows, n = state.ambientDim) {
    return normalizedMatrixRows(rows, n).map((row) => row.slice());
  }

  function transposeMatrix(rows) {
    const rowCount = rows.length;
    const columnCount = rows[0]?.length || 0;
    return Array.from({ length: columnCount }, (_, col) =>
      Array.from({ length: rowCount }, (_, row) => rows[row]?.[col] || 0)
    );
  }

  function multiplyMatrixVector(rows, vector) {
    return rows.map((row) => row.reduce((total, value, index) => total + value * (vector[index] || 0), 0));
  }

  function multiplyMatrices(left, right) {
    const rightColumns = transposeMatrix(right);
    return left.map((row) => rightColumns.map((column) => dot(row, column)));
  }

  function symmetricEigenvalues(matrix) {
    const n = matrix.length;
    const values = matrix.map((row) => row.slice());
    const tolerance = 1e-12;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      let pivotRow = 0;
      let pivotCol = 1;
      let maxOff = 0;
      for (let row = 0; row < n; row += 1) {
        for (let col = row + 1; col < n; col += 1) {
          const off = Math.abs(values[row][col]);
          if (off > maxOff) {
            maxOff = off;
            pivotRow = row;
            pivotCol = col;
          }
        }
      }
      if (maxOff <= tolerance) break;
      const app = values[pivotRow][pivotRow];
      const aqq = values[pivotCol][pivotCol];
      const apq = values[pivotRow][pivotCol];
      const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      for (let index = 0; index < n; index += 1) {
        if (index === pivotRow || index === pivotCol) continue;
        const aip = values[index][pivotRow];
        const aiq = values[index][pivotCol];
        values[index][pivotRow] = cosine * aip - sine * aiq;
        values[pivotRow][index] = values[index][pivotRow];
        values[index][pivotCol] = sine * aip + cosine * aiq;
        values[pivotCol][index] = values[index][pivotCol];
      }
      values[pivotRow][pivotRow] = cosine ** 2 * app - 2 * sine * cosine * apq + sine ** 2 * aqq;
      values[pivotCol][pivotCol] = sine ** 2 * app + 2 * sine * cosine * apq + cosine ** 2 * aqq;
      values[pivotRow][pivotCol] = 0;
      values[pivotCol][pivotRow] = 0;
    }
    return values.map((row, index) => row[index]);
  }

  function latticeMinStretch(basisRows) {
    const gram = multiplyMatrices(transposeMatrix(basisRows), basisRows);
    const eigenvalues = symmetricEigenvalues(gram).filter((value) => Number.isFinite(value));
    const minEigenvalue = Math.min(...eigenvalues);
    return minEigenvalue > 1e-12 ? Math.sqrt(minEigenvalue) : 0;
  }

  function lllReduceBasisRows(basisRows, options = {}) {
    const n = state.ambientDim;
    const delta = clamp(finiteNumber(options.delta, 0.75), 0.51, 0.99);
    const columns = transposeMatrix(cloneMatrixRows(basisRows, n)).map((column) => column.slice());
    const tolerance = 1e-12;
    const gramSchmidt = () => {
      const star = [];
      const mu = Array.from({ length: n }, () => Array(n).fill(0));
      const normSq = Array(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        let vector = columns[i].slice();
        for (let j = 0; j < i; j += 1) {
          mu[i][j] = normSq[j] > tolerance ? dot(columns[i], star[j]) / normSq[j] : 0;
          vector = subtract(vector, scale(star[j], mu[i][j]));
        }
        star[i] = vector;
        normSq[i] = dot(vector, vector);
      }
      return { mu, normSq };
    };

    let k = 1;
    let iterations = 0;
    let capped = false;
    while (k < n) {
      iterations += 1;
      if (iterations > VORONOI_LLL_ITERATION_CAP) {
        capped = true;
        break;
      }
      let gs = gramSchmidt();
      for (let j = k - 1; j >= 0; j -= 1) {
        const q = Math.round(gs.mu[k][j] || 0);
        if (!q) continue;
        columns[k] = subtract(columns[k], scale(columns[j], q));
        gs = gramSchmidt();
      }
      const lhs = gs.normSq[k] || 0;
      const rhs = (delta - (gs.mu[k][k - 1] || 0) ** 2) * (gs.normSq[k - 1] || 0);
      if (lhs + tolerance >= rhs) {
        k += 1;
      } else {
        [columns[k], columns[k - 1]] = [columns[k - 1], columns[k]];
        k = Math.max(1, k - 1);
      }
    }

    return {
      basisRows: matrixRowsFromColumns(columns, n),
      capped,
      iterations,
    };
  }

  function choleskyUpperFromGram(gram) {
    const n = gram.length;
    const upper = Array.from({ length: n }, () => Array(n).fill(0));
    for (let row = 0; row < n; row += 1) {
      for (let col = row; col < n; col += 1) {
        let sum = gram[row][col];
        for (let k = 0; k < row; k += 1) sum -= upper[k][row] * upper[k][col];
        if (row === col) {
          if (sum <= 1e-12) return null;
          upper[row][row] = Math.sqrt(sum);
        } else {
          upper[row][col] = sum / upper[row][row];
        }
      }
    }
    return upper;
  }

  function quadraticFormValue(gram, coeffs) {
    let total = 0;
    for (let row = 0; row < coeffs.length; row += 1) {
      for (let col = 0; col < coeffs.length; col += 1) {
        total += coeffs[row] * gram[row][col] * coeffs[col];
      }
    }
    return total;
  }

  function normalizedParity(value) {
    return ((Math.round(finiteNumber(value, 0)) % 2) + 2) % 2;
  }

  function initialParityCosetCoeffs(parity) {
    const active = [];
    parity.forEach((value, index) => {
      if (normalizedParity(value)) active.push(index);
    });
    const coeffs = [];
    const signCount = 1 << active.length;
    for (let mask = 0; mask < signCount; mask += 1) {
      const coeff = Array(parity.length).fill(0);
      active.forEach((index, signIndex) => {
        coeff[index] = (mask & (1 << signIndex)) ? -1 : 1;
      });
      coeffs.push(coeff);
    }
    return coeffs;
  }

  function parityIntegersInRange(low, high, parity, center, cap = Infinity) {
    const normalized = normalizedParity(parity);
    let start = Math.ceil(low);
    const end = Math.floor(high);
    while (start <= end && normalizedParity(start) !== normalized) start += 1;
    const count = start <= end ? Math.floor((end - start) / 2) + 1 : 0;
    if (count > cap) return null;
    const values = [];
    for (let value = start; value <= end; value += 2) values.push(value);
    values.sort((left, right) => Math.abs(left - center) - Math.abs(right - center));
    return values;
  }

  function shortestVectorsInParityCoset(basisRows, parity, options = {}) {
    const n = state.ambientDim;
    const gram = gramMatrix(transposeMatrix(basisRows));
    const upper = choleskyUpperFromGram(gram);
    const coeffs = Array(n).fill(0);
    const solutions = [];
    const seen = new Set();
    let bestSq = Infinity;
    let capped = false;
    let nodeCount = 0;
    const cap = options.cap || VORONOI_COSET_ENUMERATION_CAP;

    const record = (candidate, sq) => {
      if (!Number.isFinite(sq)) return;
      const tolerance = Number.isFinite(bestSq) ? Math.max(1e-8, bestSq * 1e-8) : 1e-8;
      if (!Number.isFinite(bestSq) || sq < bestSq - tolerance) {
        bestSq = sq;
        solutions.length = 0;
        seen.clear();
      }
      const nextTolerance = Number.isFinite(bestSq) ? Math.max(1e-8, bestSq * 1e-8) : 1e-8;
      if (sq <= bestSq + nextTolerance) {
        const key = candidate.join(",");
        if (!seen.has(key)) {
          seen.add(key);
          solutions.push(candidate.slice());
        }
      }
    };

    for (const candidate of initialParityCosetCoeffs(parity)) {
      record(candidate, quadraticFormValue(gram, candidate));
    }
    if (!upper || !Number.isFinite(bestSq)) {
      return {
        vectors: solutions.map((candidate) => {
          const ambient = multiplyMatrixVector(basisRows, candidate);
          return { coeffs: candidate, ambient, length: norm(ambient) };
        }),
        bestSq,
        capped: true,
        nodeCount,
      };
    }

    const visit = (index, partialSq) => {
      if (capped) return;
      if (index < 0) {
        record(coeffs, quadraticFormValue(gram, coeffs));
        return;
      }
      let offset = 0;
      for (let col = index + 1; col < n; col += 1) offset += upper[index][col] * coeffs[col];
      const diagonal = upper[index][index];
      if (!(diagonal > 1e-12)) {
        capped = true;
        return;
      }
      const tolerance = Number.isFinite(bestSq) ? Math.max(1e-8, bestSq * 1e-8) : 1e-8;
      const remaining = bestSq + tolerance - partialSq;
      if (remaining < -tolerance) return;
      const radius = Math.sqrt(Math.max(0, remaining));
      const low = (-radius - offset) / diagonal;
      const high = (radius - offset) / diagonal;
      const center = -offset / diagonal;
      const values = parityIntegersInRange(low - 1e-12, high + 1e-12, parity[index], center, cap);
      if (!values) {
        capped = true;
        return;
      }
      for (const value of values) {
        nodeCount += 1;
        if (nodeCount > cap) {
          capped = true;
          return;
        }
        coeffs[index] = value;
        const term = diagonal * value + offset;
        const nextSq = partialSq + term * term;
        if (nextSq <= bestSq + tolerance) visit(index - 1, nextSq);
        if (capped) return;
      }
    };

    visit(n - 1, 0);
    const vectors = solutions.map((candidate) => {
      const ambient = multiplyMatrixVector(basisRows, candidate);
      return { coeffs: candidate.slice(), ambient, length: norm(ambient) };
    }).sort((left, right) => left.length - right.length);
    return { vectors, bestSq, capped, nodeCount };
  }

  function voronoiRelevantVectorCacheKey(basisRows) {
    return `${state.ambientDim}|${matrixRowsText(basisRows, 8)}`;
  }

  function voronoiRelevantVectorsForBasis(basisRows) {
    const cacheKey = voronoiRelevantVectorCacheKey(basisRows);
    const cached = voronoiRelevantVectorCache.get(cacheKey);
    if (cached) return cached;
    const reduction = lllReduceBasisRows(basisRows);
    const reducedRows = reduction.basisRows;
    const n = state.ambientDim;
    const vectors = [];
    const seen = new Set();
    let capped = reduction.capped;
    let nodeCount = 0;
    let cosetCount = 0;
    const cosetLimit = 2 ** n;
    for (let mask = 1; mask < cosetLimit; mask += 1) {
      const parity = Array.from({ length: n }, (_, index) => (mask >> index) & 1);
      const coset = shortestVectorsInParityCoset(reducedRows, parity);
      cosetCount += 1;
      nodeCount += coset.nodeCount;
      capped = capped || coset.capped;
      for (const vector of coset.vectors) {
        const key = vectorKey(vector.ambient, 8);
        if (seen.has(key)) continue;
        seen.add(key);
        vectors.push({ ...vector, parity });
        if (vectors.length >= VORONOI_RELEVANT_VECTOR_CAP) {
          capped = true;
          break;
        }
      }
      if (vectors.length >= VORONOI_RELEVANT_VECTOR_CAP) break;
    }
    vectors.sort((left, right) => left.length - right.length);
    const result = {
      vectors,
      reducedBasisRows: reducedRows,
      capped,
      reductionCapped: reduction.capped,
      cosetCount,
      nodeCount,
      status: capped ? "Voronoi relevant-vector search capped/partial" : "",
    };
    if (voronoiRelevantVectorCache.size > 32) voronoiRelevantVectorCache.clear();
    voronoiRelevantVectorCache.set(cacheKey, result);
    return result;
  }

  function inverseMatrix(rows, label = "Matrix") {
    const n = rows.length;
    const matrix = rows.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== n) throw new Error(`${label} needs ${n} x ${n} entries.`);
      return row.map((value, colIndex) => {
        const number = finiteNumber(value, NaN);
        if (!Number.isFinite(number)) throw new Error(`${label} entry ${rowIndex + 1}, ${colIndex + 1} is not finite.`);
        return number;
      });
    });
    const augmented = matrix.map((row, index) => [
      ...row,
      ...Array.from({ length: n }, (_, col) => (col === index ? 1 : 0)),
    ]);
    const scaleValue = Math.max(1, ...matrix.flat().map((value) => Math.abs(value)));
    const tolerance = Math.max(1e-10, scaleValue * 1e-10);
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
      }
      if (Math.abs(augmented[pivot][col]) <= tolerance) throw new Error(`${label} is rank deficient.`);
      if (pivot !== col) [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
      const divisor = augmented[col][col];
      for (let entry = 0; entry < 2 * n; entry += 1) augmented[col][entry] /= divisor;
      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = augmented[row][col];
        if (Math.abs(factor) <= tolerance) continue;
        for (let entry = 0; entry < 2 * n; entry += 1) augmented[row][entry] -= factor * augmented[col][entry];
      }
    }
    return augmented.map((row) => row.slice(n));
  }

  function matrixRank(rows, n = rows.length, toleranceScale = 1e-10) {
    const matrix = rows.map((row) => resizeVector(Array.isArray(row) ? row.map((value) => finiteNumber(value, NaN)) : [], n));
    const maxAbs = Math.max(1, ...matrix.flat().map((value) => Math.abs(finiteNumber(value, 0))));
    const tolerance = Math.max(1e-10, maxAbs * toleranceScale);
    let rank = 0;
    for (let col = 0; col < n && rank < matrix.length; col += 1) {
      let pivot = rank;
      for (let row = rank + 1; row < matrix.length; row += 1) {
        if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      }
      if (!Number.isFinite(matrix[pivot][col]) || Math.abs(matrix[pivot][col]) <= tolerance) continue;
      [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
      const divisor = matrix[rank][col];
      for (let entry = col; entry < n; entry += 1) matrix[rank][entry] /= divisor;
      for (let row = 0; row < matrix.length; row += 1) {
        if (row === rank) continue;
        const factor = matrix[row][col];
        for (let entry = col; entry < n; entry += 1) matrix[row][entry] -= factor * matrix[rank][entry];
      }
      rank += 1;
    }
    return rank;
  }

  function validateFiniteMatrixRows(rows, n = state.ambientDim, label = "Matrix") {
    if (!Array.isArray(rows) || rows.length !== n) throw new Error(`${label} needs ${n} rows.`);
    return rows.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== n) throw new Error(`${label} row ${rowIndex + 1} needs ${n} entries.`);
      return row.map((value, colIndex) => {
        const number = finiteNumber(value, NaN);
        if (!Number.isFinite(number)) throw new Error(`${label} entry row ${rowIndex + 1}, column ${colIndex + 1} is not finite.`);
        return number;
      });
    });
  }

  function validateFullRankMatrixRows(rows, n = state.ambientDim, label = "Matrix") {
    const matrix = validateFiniteMatrixRows(rows, n, label);
    if (matrixRank(matrix, n) !== n) throw new Error(`${label} must be full rank.`);
    return matrix;
  }

  function matrixFieldTargetLabelsKey(fieldKey) {
    return fieldKey === "matrixRows" ? "matrixTargetLabels" : `${fieldKey}TargetLabels`;
  }

  function isMatrixRowsField(data, fieldKey, slotCount = 0) {
    return slotCount > 1 || Array.isArray(data?.[fieldKey]?.[0]) || /Rows$/.test(String(fieldKey || ""));
  }

  function matrixColumnLabels(data, fallbackPrefix = "v", n = state.ambientDim) {
    const labels = Array.isArray(data?.matrixColumnLabels) ? data.matrixColumnLabels : [];
    return Array.from({ length: n }, (_, index) => String(labels[index] || `${fallbackPrefix}_${index + 1}`));
  }

  function lmfdbProxyUrl() {
    return String(window.SLICE_LMFDB_PROXY_URL || window.RAMIFICATION_LMFDB_PROXY_URL || "").trim().replace(/\/+$/, "");
  }

  function buildLmfdbProxyFieldUrl(proxy, query) {
    const clean = proxy.replace(/\/+$/, "");
    const endpoint = clean.endsWith("/field") ? clean : `${clean}/field`;
    const url = new URL(endpoint);
    url.searchParams.set("q", query);
    return url.toString();
  }

  function lmfdbFieldSearchDraftFor(object) {
    const key = object?.id || "missing";
    const existing = lmfdbFieldSearchDrafts.get(key);
    if (existing) return existing;
    const draft = {
      loading: false,
      status: "",
      statusKind: "",
      pendingField: null,
    };
    lmfdbFieldSearchDrafts.set(key, draft);
    return draft;
  }

  function numberFromLmfdbValue(value, fallback = NaN) {
    if (value && typeof value === "object" && "data" in value) {
      const literal = Number(value.data);
      return Number.isFinite(literal) ? literal : fallback;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeLmfdbFieldData(field) {
    if (!field || typeof field !== "object") return null;
    const degree = Math.round(numberFromLmfdbValue(field.degree, 0));
    const r2 = clamp(Math.round(numberFromLmfdbValue(field.r2, 0)), 0, Math.floor(degree / 2));
    const r1 = Math.max(0, Math.round(numberFromLmfdbValue(field.r1, degree - 2 * r2)));
    const coeffs = Array.isArray(field.coeffs)
      ? field.coeffs.map((value) => numberFromLmfdbValue(value, NaN))
      : [];
    const integralBasis = Array.isArray(field.integralBasis)
      ? field.integralBasis.map((value) => String(value))
      : [];
    const embeddings = normalizeStoredLmfdbEmbeddings(field.embeddings, r1, r2);
    if (!field.label || degree < 1) return null;
    return {
      label: String(field.label),
      url: String(field.url || `https://www.lmfdb.org/NumberField/${encodeURIComponent(String(field.label))}`),
      query: String(field.query || field.label),
      queryType: String(field.queryType || "label"),
      normalizedInput: String(field.normalizedInput || field.label),
      degree,
      r1,
      r2,
      coeffs,
      integralBasis,
      embeddings,
      warnings: Array.isArray(field.warnings) ? field.warnings.map(String) : [],
    };
  }

  function normalizeStoredLmfdbEmbeddings(embeddings, r1, r2) {
    const real = Array.isArray(embeddings?.real)
      ? embeddings.real.map((value) => numberFromLmfdbValue(value, NaN)).filter(Number.isFinite)
      : [];
    const complex = Array.isArray(embeddings?.complex)
      ? embeddings.complex.map((value) => ({
          re: numberFromLmfdbValue(value?.re ?? value?.real ?? value?.[0], NaN),
          im: numberFromLmfdbValue(value?.im ?? value?.imag ?? value?.[1], NaN),
        })).filter((value) => Number.isFinite(value.re) && Number.isFinite(value.im))
      : [];
    return {
      real: real.slice(0, r1),
      complex: complex.slice(0, r2),
    };
  }

  function normalizeLmfdbPayloadForLattice(payload) {
    const record = payload?.field || null;
    if (!record || !record.label) throw new Error("LMFDB proxy response did not include a field record.");
    const coeffs = Array.isArray(record.coeffs) ? record.coeffs.map((value) => numberFromLmfdbValue(value, NaN)) : [];
    const degree = Math.round(numberFromLmfdbValue(record.degree, Math.max(0, coeffs.length - 1)));
    const r2 = clamp(Math.round(numberFromLmfdbValue(record.r2, 0)), 0, Math.floor(degree / 2));
    const r1 = Math.max(0, degree - 2 * r2);
    const integralBasis = Array.isArray(payload.extra?.zk) ? payload.extra.zk.map((value) => String(value)) : [];
    if (!Number.isInteger(degree) || degree < 2) throw new Error("Only number fields of degree 2 through 8 can be loaded as lattices.");
    if (degree > 8) throw new Error(`LMFDB field ${record.label} has degree ${degree}; this calculator supports degree at most 8.`);
    if (integralBasis.length !== degree) throw new Error("LMFDB response did not include a full zk integral basis.");
    if (coeffs.length !== degree + 1 || coeffs.some((value) => !Number.isFinite(value))) {
      throw new Error("LMFDB response did not include usable defining-polynomial coefficients.");
    }
    integralBasis.forEach((expression, index) => {
      parseLmfdbBasisExpression(expression, degree, `zk_${index + 1}`);
    });
    const embeddings = lmfdbEmbeddingsFromPayload(record, { degree, r1, r2, coeffs });
    return {
      label: String(record.label),
      url: `https://www.lmfdb.org/NumberField/${encodeURIComponent(String(record.label))}`,
      query: String(payload.query || record.label),
      queryType: String(payload.queryType || "label"),
      normalizedInput: String(payload.normalizedInput || record.label),
      degree,
      r1,
      r2,
      coeffs,
      integralBasis,
      embeddings,
      warnings: Array.isArray(payload.warnings) ? payload.warnings.map(String) : [],
    };
  }

  function lmfdbEmbeddingsFromPayload(record, field) {
    const realParts = Array.isArray(record.embeddings_gen_real)
      ? record.embeddings_gen_real.map((value) => numberFromLmfdbValue(value, NaN))
      : [];
    const imagParts = Array.isArray(record.embeddings_gen_imag)
      ? record.embeddings_gen_imag.map((value) => numberFromLmfdbValue(value, NaN))
      : [];
    const count = Math.max(realParts.length, imagParts.length);
    if (count) {
      const roots = Array.from({ length: count }, (_, index) => ({
        re: numberFromLmfdbValue(realParts[index], 0),
        im: numberFromLmfdbValue(imagParts[index], 0),
      })).filter((root) => Number.isFinite(root.re) && Number.isFinite(root.im));
      try {
        return canonicalNumberFieldEmbeddings(roots, field.r1, field.r2);
      } catch (_) {}
    }
    return fallbackLmfdbEmbeddingsFromPolynomial(field);
  }

  function fallbackLmfdbEmbeddingsFromPolynomial(field) {
    const roots = polynomialRootsFromCoeffs(field.coeffs);
    return canonicalNumberFieldEmbeddings(roots, field.r1, field.r2);
  }

  function canonicalNumberFieldEmbeddings(roots, r1, r2) {
    const tolerance = 1e-7;
    const normalizedRoots = roots
      .map((root) => ({
        re: Math.abs(numberFromLmfdbValue(root.re, NaN)) < tolerance ? 0 : numberFromLmfdbValue(root.re, NaN),
        im: Math.abs(numberFromLmfdbValue(root.im, NaN)) < tolerance ? 0 : numberFromLmfdbValue(root.im, NaN),
      }))
      .filter((root) => Number.isFinite(root.re) && Number.isFinite(root.im));
    const real = normalizedRoots
      .filter((root) => Math.abs(root.im) <= tolerance)
      .map((root) => root.re)
      .sort((a, b) => a - b);
    if (real.length < r1) {
      const nearReal = normalizedRoots
        .filter((root) => Math.abs(root.im) > tolerance)
        .sort((a, b) => Math.abs(a.im) - Math.abs(b.im))
        .slice(0, r1 - real.length)
        .map((root) => root.re);
      real.push(...nearReal);
      real.sort((a, b) => a - b);
    }
    let complex = normalizedRoots
      .filter((root) => Math.abs(root.im) > tolerance && root.im > 0)
      .map((root) => ({ re: root.re, im: Math.abs(root.im) }))
      .sort((a, b) => a.re === b.re ? a.im - b.im : a.re - b.re);
    if (complex.length < r2) {
      const extras = normalizedRoots
        .filter((root) => Math.abs(root.im) > tolerance && !complex.some((entry) =>
          Math.abs(entry.re - root.re) <= tolerance && Math.abs(entry.im - Math.abs(root.im)) <= tolerance
        ))
        .map((root) => ({ re: root.re, im: Math.abs(root.im) }))
        .sort((a, b) => a.re === b.re ? a.im - b.im : a.re - b.re);
      complex = [...complex, ...extras];
    }
    if (real.length < r1 || complex.length < r2) {
      throw new Error("Could not determine enough real and complex generator embeddings.");
    }
    return {
      real: real.slice(0, r1),
      complex: complex.slice(0, r2),
    };
  }

  function complex(re = 0, im = 0) {
    return { re, im };
  }

  function complexAdd(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
  }

  function complexSubtract(a, b) {
    return { re: a.re - b.re, im: a.im - b.im };
  }

  function complexMultiply(a, b) {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re,
    };
  }

  function complexDivide(a, b) {
    const denominator = b.re * b.re + b.im * b.im;
    if (denominator <= 1e-30) return complex(0, 0);
    return {
      re: (a.re * b.re + a.im * b.im) / denominator,
      im: (a.im * b.re - a.re * b.im) / denominator,
    };
  }

  function complexAbs(a) {
    return Math.hypot(a.re, a.im);
  }

  function evaluatePolynomialAtComplex(coeffs, root) {
    let value = complex(0, 0);
    for (let index = coeffs.length - 1; index >= 0; index -= 1) {
      value = complexAdd(complexMultiply(value, root), complex(coeffs[index], 0));
    }
    return value;
  }

  function polynomialRootsFromCoeffs(coeffs) {
    const degree = coeffs.length - 1;
    const leading = coeffs[degree];
    if (degree < 1 || !Number.isFinite(leading) || Math.abs(leading) <= 1e-14) {
      throw new Error("Defining polynomial is not usable for embedding fallback.");
    }
    const normalized = coeffs.map((value) => value / leading);
    const radius = 1 + Math.max(0, ...normalized.slice(0, degree).map((value) => Math.abs(value)));
    let roots = Array.from({ length: degree }, (_, index) => {
      const angle = (2 * Math.PI * (index + 0.31)) / degree;
      return complex(radius * Math.cos(angle), radius * Math.sin(angle));
    });
    for (let iteration = 0; iteration < 180; iteration += 1) {
      let maxDelta = 0;
      const previous = roots.map((root) => ({ ...root }));
      roots = previous.map((root, index) => {
        let denominator = complex(1, 0);
        for (let other = 0; other < previous.length; other += 1) {
          if (other === index) continue;
          denominator = complexMultiply(denominator, complexSubtract(root, previous[other]));
        }
        if (complexAbs(denominator) <= 1e-24) {
          denominator = complex(1e-12, 1e-12 * (index + 1));
        }
        const delta = complexDivide(evaluatePolynomialAtComplex(normalized, root), denominator);
        maxDelta = Math.max(maxDelta, complexAbs(delta));
        return complexSubtract(root, delta);
      });
      if (maxDelta <= 1e-12) break;
    }
    return roots;
  }

  function normalizeLmfdbBasisExpression(rawExpression) {
    return String(rawExpression || "")
      .replace(/\\\(/g, "")
      .replace(/\\\)/g, "")
      .replace(/\\left/g, "")
      .replace(/\\right/g, "")
      .replace(/\\cdot/g, "*")
      .replace(/−/g, "-")
      .replace(/\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}/g, "$1/$2")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, "");
  }

  function parseLmfdbBasisExpression(rawExpression, degree, label = "zk") {
    const source = normalizeLmfdbBasisExpression(rawExpression);
    if (!source) throw new Error(`${label} is empty.`);
    if (/[^0-9aA+\-*/.^]/.test(source)) throw new Error(`${label} contains unsupported syntax.`);
    const coeffs = Array(degree).fill(0);
    const terms = source.match(/[+-]?[^+-]+/g) || [];
    terms.forEach((term) => {
      let sign = 1;
      let body = term;
      if (body.startsWith("+")) body = body.slice(1);
      if (body.startsWith("-")) {
        sign = -1;
        body = body.slice(1);
      }
      if (!body) throw new Error(`${label} has an empty term.`);
      const generatorIndex = body.search(/[aA]/);
      let exponent = 0;
      let coefficientText = body;
      if (generatorIndex >= 0) {
        coefficientText = body.slice(0, generatorIndex);
        let tail = body.slice(generatorIndex + 1);
        exponent = 1;
        if (tail.startsWith("^")) {
          const exponentMatch = /^\^(\d+)/.exec(tail);
          if (!exponentMatch) throw new Error(`${label} has unsupported generator syntax.`);
          exponent = Number(exponentMatch[1]);
          tail = tail.slice(exponentMatch[0].length);
        }
        coefficientText = `${coefficientText}${tail}`;
        if (exponent >= degree) throw new Error(`${label} uses a^${exponent}, outside the degree-${degree} power basis.`);
      }
      coeffs[exponent] += sign * parseLmfdbRationalProduct(coefficientText || "1", label);
    });
    return coeffs;
  }

  function parseLmfdbRationalProduct(rawValue, label = "zk") {
    let source = String(rawValue || "1").replace(/^\*+|\*+$/g, "");
    if (!source) source = "1";
    const factors = source.split("*").filter((part) => part !== "");
    if (!factors.length) factors.push("1");
    return factors.reduce((total, factor) => {
      const normalized = factor.startsWith("/") ? `1${factor}` : factor;
      const parsed = parseRationalNumber(normalized);
      if (!parsed.ok || !Number.isFinite(parsed.value)) throw new Error(`${label} has an invalid rational coefficient.`);
      return total * parsed.value;
    }, 1);
  }

  function lmfdbBasisRowsFromField(field, coordinateMode = "raw", n = state.ambientDim) {
    const normalized = normalizeLmfdbFieldData(field);
    if (!normalized) throw new Error("No LMFDB field has been loaded.");
    if (normalized.degree !== n) {
      throw new Error(`LMFDB field degree ${normalized.degree} does not match current R^${n}.`);
    }
    if (normalized.integralBasis.length !== n) {
      throw new Error("LMFDB field is missing a full zk integral basis.");
    }
    const mode = normalizeEmbeddingCoordinateMode(coordinateMode);
    const scaleComplex = mode === "minkowski" ? Math.SQRT2 : 1;
    const embeddings = (normalized.embeddings.real.length === normalized.r1 && normalized.embeddings.complex.length === normalized.r2)
      ? normalized.embeddings
      : fallbackLmfdbEmbeddingsFromPolynomial(normalized);
    const columns = normalized.integralBasis.map((expression, index) => {
      const polynomial = parseLmfdbBasisExpression(expression, n, `zk_${index + 1}`);
      const coordinates = [];
      embeddings.real.forEach((root) => {
        coordinates.push(evaluatePolynomialAtComplex(polynomial, complex(root, 0)).re);
      });
      embeddings.complex.forEach((root) => {
        const value = evaluatePolynomialAtComplex(polynomial, complex(root.re, root.im));
        coordinates.push(scaleComplex * value.re, scaleComplex * value.im);
      });
      return coordinates.map((value) => (Math.abs(value) < 1e-12 ? 0 : value));
    });
    return validateFullRankMatrixRows(matrixRowsFromColumns(columns, n), n, "LMFDB integral basis");
  }

  function embeddingCoordinateModeLabel(mode) {
    return normalizeEmbeddingCoordinateMode(mode) === "minkowski" ? "sqrt(2)-scaled" : "raw Re/Im";
  }

  function dynkinTypeObjects(n = state.ambientDim) {
    return state.objects.filter((object) =>
      objectTypeKey(object) === "dynkin-type" &&
      (object.data?.ambientDimension || n) === n
    );
  }

  function defaultDynkinRawType(n = state.ambientDim) {
    const active = activeObject();
    if (objectTypeKey(active) === "weyl-chambers") return normalizeWeylDynkinType(active.data?.dynkinType, n);
    const weyl = state.objects.find((object) => objectTypeKey(object) === "weyl-chambers");
    if (weyl) return normalizeWeylDynkinType(weyl.data?.dynkinType, n);
    return currentAddWeylDynkinType(n);
  }

  function defaultDynkinReferenceValue(n = state.ambientDim) {
    const source = dynkinTypeObjects(n)[0];
    return source ? `source:${source.id}` : `type:${defaultDynkinRawType(n)}`;
  }

  function dynkinReferenceOptions(n = state.ambientDim, options = {}) {
    const sourceOptions = dynkinTypeObjects(n).map((object) => {
      const type = normalizeWeylDynkinType(object.data?.dynkinType, n);
      return {
        value: `source:${object.id}`,
        label: `${object.name} (${weylDynkinLabel(type, n)})`,
      };
    });
    const rawOptions = weylDynkinOptions(n).map((option) => ({
      value: `type:${option.type}`,
      label: option.label,
    }));
    if (sourceOptions.length) return options.includeRawTypes ? [...sourceOptions, ...rawOptions] : sourceOptions;
    return rawOptions;
  }

  function dynkinReferenceValueFromData(data = {}, n = state.ambientDim, options = {}) {
    const sources = dynkinTypeObjects(n);
    if (data.dynkinSourceId && sources.some((object) => object.id === data.dynkinSourceId)) {
      return `source:${data.dynkinSourceId}`;
    }
    if (options.preferRawType || !sources.length) return `type:${normalizeWeylDynkinType(data.dynkinType, n)}`;
    if (sources.length) return `source:${sources[0].id}`;
    return `type:${normalizeWeylDynkinType(data.dynkinType, n)}`;
  }

  function parseDynkinReferenceValue(value, n = state.ambientDim) {
    const text = String(value || "").trim();
    if (text.startsWith("source:")) {
      const sourceId = text.slice("source:".length);
      const source = dynkinTypeObjects(n).find((object) => object.id === sourceId);
      if (source) {
        return {
          dynkinSourceId: source.id,
          dynkinType: normalizeWeylDynkinType(source.data?.dynkinType, n),
          dynkinRank: n,
        };
      }
    }
    const rawType = text.startsWith("type:") ? text.slice("type:".length) : text;
    return {
      dynkinSourceId: null,
      dynkinType: normalizeWeylDynkinType(rawType || defaultDynkinRawType(n), n),
      dynkinRank: n,
    };
  }

  function resolveDynkinReference(data = {}, n = state.ambientDim) {
    if (data.dynkinSourceId) {
      const source = dynkinTypeObjects(n).find((object) => object.id === data.dynkinSourceId);
      if (source) {
        const dynkinType = normalizeWeylDynkinType(source.data?.dynkinType, n);
        return {
          dynkinType,
          dynkinRank: n,
          dynkinSourceId: source.id,
          source,
          label: `${source.name} (${weylDynkinLabel(dynkinType, n)})`,
          sourceMissing: false,
        };
      }
      const dynkinType = normalizeWeylDynkinType(data.dynkinType, n);
      return {
        dynkinType,
        dynkinRank: n,
        dynkinSourceId: data.dynkinSourceId,
        source: null,
        label: `missing Dynkin source; frozen ${weylDynkinLabel(dynkinType, n)}`,
        sourceMissing: true,
      };
    }
    const dynkinType = normalizeWeylDynkinType(data.dynkinType, n);
    return {
      dynkinType,
      dynkinRank: n,
      dynkinSourceId: null,
      source: null,
      label: weylDynkinLabel(dynkinType, n),
      sourceMissing: false,
    };
  }

  function applyDynkinReferenceToData(data, value, n = state.ambientDim) {
    const parsed = parseDynkinReferenceValue(value, n);
    data.dynkinSourceId = parsed.dynkinSourceId;
    data.dynkinType = parsed.dynkinType;
    data.dynkinRank = n;
    return parsed;
  }

  function simpleRootMatrixRows(dynkinType, n = state.ambientDim) {
    const system = weylRootSystem(dynkinType, n);
    return matrixRowsFromColumns(system.simpleRootBasis || system.simpleRoots, n);
  }

  function fundamentalWeightMatrixRows(dynkinType, n = state.ambientDim) {
    const rootRows = simpleRootMatrixRows(dynkinType, n);
    const roots = Array.from({ length: n }, (_, col) => matrixColumnFromRows(rootRows, col, n));
    const diagonal = Array.from({ length: n }, (_, row) =>
      Array.from({ length: n }, (_, col) => (row === col ? dot(roots[row], roots[row]) / 2 : 0))
    );
    return multiplyMatrices(inverseMatrix(transposeMatrix(rootRows), `${weylDynkinLabel(dynkinType, n)} simple roots`), diagonal);
  }

  function dynkinMatrixRows(dynkinType, kind, n = state.ambientDim) {
    return kind === "fundamental-weights"
      ? fundamentalWeightMatrixRows(dynkinType, n)
      : simpleRootMatrixRows(dynkinType, n);
  }

  function dynkinMatrixColumnLabels(kind, n = state.ambientDim) {
    const prefix = kind === "fundamental-weights" ? "\\omega" : "\\alpha";
    const plainPrefix = kind === "fundamental-weights" ? "omega" : "alpha";
    return Array.from({ length: n }, (_, index) => `${plainPrefix}_${index + 1}`).map((label, index) => ({
      plain: label,
      tex: `${prefix}_{${index + 1}}`,
    }));
  }

  function matrixPresetDisplayName(kind) {
    return kind === "fundamental-weights" ? "fundamental weights" : "simple roots";
  }

  function latticeBasisRowsFromDynkin(data, n = state.ambientDim) {
    const kind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    return kind === "weight"
      ? fundamentalWeightMatrixRows(data.dynkinType, n)
      : simpleRootMatrixRows(data.dynkinType, n);
  }

  function rebuildDirectPositionInputs() {
    const container = $("direct-position-inputs");
    if (!container) return;
    container.innerHTML = "";
    appendRationalTupleInputs(container, resizeVector(state.p, state.ambientDim), {
      labelClassName: "slice-param-vector",
      inputClassName: "slice-input slice-coordinate-input",
      datasetName: "directPositionIndex",
      digits: 6,
      ariaLabel: (index) => `Direct position coordinate p_${index + 1}`,
      currentValue: (index) => state.p[index] || 0,
      invalidMessage: (index) => `Direct position p_${index + 1} must be a finite rational value.`,
      onCommit: (index, next) => {
        state.p = resizeVector(state.p, state.ambientDim);
        state.p[index] = next;
      },
      afterCommit: () => renderAll(),
      onInvalid: () => renderAll(),
    });
  }

  function rebuildDirectFrameGrid() {
    const grid = $("direct-frame-grid");
    if (!grid) return;
    buildRationalMatrixGrid(grid, {
      dimension: state.ambientDim,
      rowDataset: "directFrameRow",
      columnDataset: "directFrameColumn",
      rowLabel: (row) => ({ plain: `e${row + 1}`, tex: `e_{${row + 1}}` }),
      columnLabel: (col) => ({ plain: `v${col + 1}`, tex: `v_{${col + 1}}` }),
      valueAt: (row, col) => state.frame[col]?.[row] || 0,
      ariaLabel: (row, col) => `Frame entry e_${row + 1}, v_${col + 1}`,
      invalidMessage: "Manual frame entries must be finite rational values.",
      onCommit: () => {},
      onInvalid: () => renderAll(),
      commitOnWheel: false,
      formatCommittedValue: false,
    });
  }

  function syncDirectFrameGrid() {
    const grid = $("direct-frame-grid");
    if (!grid) return;
    const inputs = Array.from(grid.querySelectorAll("[data-direct-frame-row]"));
    if (inputs.length !== state.ambientDim * state.ambientDim) {
      rebuildDirectFrameGrid();
      return;
    }
    inputs.forEach((input) => {
      const row = Number(input.dataset.directFrameRow);
      const col = Number(input.dataset.directFrameColumn);
      input.value = formatRationalInputValue(state.frame[col]?.[row] || 0);
    });
  }

  function syncDirectInputFields(options = {}) {
    if (!options.force && directInputHasFocus()) return;
    const container = $("direct-position-inputs");
    if (container) {
      const inputs = Array.from(container.querySelectorAll("[data-direct-position-index]"));
      if (inputs.length !== state.ambientDim) {
        rebuildDirectPositionInputs();
      } else {
        inputs.forEach((input, index) => {
          input.value = formatRationalInputValue(state.p[index] || 0);
        });
      }
    }
    syncDirectFrameGrid();
    const matrix = $("direct-frame-import");
    if (matrix) matrix.value = directFrameRowsText();
  }

  function syncDirectInputModeControls() {
    state.directInputMode = normalizeDirectInputMode(state.directInputMode);
    setSegmentActive("direct-input-mode-controls", "data-direct-input-mode", state.directInputMode);
    document.querySelectorAll("[data-direct-input-mode-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.directInputModePanel !== state.directInputMode;
    });
  }

  function syncSlideInputControls() {
    state.slideInputMode = normalizeSlideInputMode(state.slideInputMode);
    setSegmentActive("slide-input-mode-controls", "data-slide-input-mode", state.slideInputMode);
    document.querySelectorAll("[data-slide-input-mode-row]").forEach((row) => {
      row.hidden = row.dataset.slideInputModeRow !== state.slideInputMode;
    });
    syncDirectInputModeControls();
    if (state.slideInputMode === "direct") syncDirectInputFields();
  }

  function syncMotionControls() {
    clampMotionState();
    setSegmentActive("motion-mode-controls", "data-motion-mode", state.motionMode);
    document.querySelectorAll("[data-motion-mode-row]").forEach((row) => {
      row.hidden = state.slideInputMode !== "move" || row.dataset.motionModeRow !== state.motionMode;
    });
    const entries = [
      ["translation-speed-slider", "translation-speed-value", "translationSpeed", 2],
      ["rotation-speed-slider", "rotation-speed-value", "rotationSpeed", 1],
      ["translation-step-slider", "translation-step-value", "translationStep", 2],
      ["rotation-step-slider", "rotation-step-value", "rotationStep", 1],
    ];
    for (const [sliderId, outputId, key, digits] of entries) {
      const slider = $(sliderId);
      const output = $(outputId);
      if (!slider || !output) continue;
      slider.value = String(state[key]);
      output.value = fmt(state[key], digits);
      output.textContent = fmt(state[key], digits);
    }
  }

  function readRotationPairFromControls(changedIndex = null) {
    let first = Math.round(finiteNumber($("rotation-i").value, state.rotationPair[0] ?? 0));
    let second = Math.round(finiteNumber($("rotation-j").value, state.rotationPair[1] ?? Math.min(1, state.ambientDim - 1)));
    first = clamp(first, 0, state.ambientDim - 1);
    second = clamp(second, 0, state.ambientDim - 1);
    if (first === second) {
      if (changedIndex === 0) second = lowestDistinctIndex(first);
      else first = lowestDistinctIndex(second);
    }
    state.rotationPair = normalizeRotationPair([first, second]);
    syncRotationControls();
  }

  function syncRotationControls() {
    state.rotationPair = normalizeRotationPair(state.rotationPair);
    const first = $("rotation-i");
    const second = $("rotation-j");
    if (first) first.value = String(state.rotationPair[0]);
    if (second) second.value = String(state.rotationPair[1]);
  }

  function applyTranslationDistance(distance, options = {}) {
    state.activeDirection = normalizeDirection(state.activeDirection);
    const direction = activeDirectionVector();
    state.p = state.p.map((value, index) => value + distance * (direction[index] || 0));
    if (options.render !== false) renderAll();
  }

  function applyRotationDegrees(degrees, options = {}) {
    state.rotationPair = normalizeRotationPair(state.rotationPair);
    const [i, j] = state.rotationPair;
    if (i === j) {
      state.lastWarning = "Choose two different frame vectors before rotating.";
      if (options.render !== false) renderAll();
      return;
    }
    const theta = (Math.PI * finiteNumber(degrees, 0)) / 180;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const vi = state.frame[i].slice();
    const vj = state.frame[j].slice();
    state.frame[i] = vi.map((value, row) => c * value + s * vj[row]);
    state.frame[j] = vi.map((value, row) => -s * value + c * vj[row]);
    if (state.autoSchmidt) gramSchmidtFrame();
    state.lastWarning = `Frame-plane rotation applied to (v_${i + 1}, v_${j + 1}).`;
    if (options.render !== false) renderAll();
  }

  function applyDiscreteMotion(kind, sign) {
    if (kind === "translation") {
      applyTranslationDistance(sign * state.translationStep);
    } else {
      applyRotationDegrees(sign * state.rotationStep);
    }
  }

  function motionTargetSign(kind) {
    const positive = kind === "translation" ? motionHold.translationPositive : motionHold.rotationPositive;
    const negative = kind === "translation" ? motionHold.translationNegative : motionHold.rotationNegative;
    return (positive.size ? 1 : 0) - (negative.size ? 1 : 0);
  }

  function setMotionHold(kind, sign, token, active) {
    const positive = kind === "translation" ? motionHold.translationPositive : motionHold.rotationPositive;
    const negative = kind === "translation" ? motionHold.translationNegative : motionHold.rotationNegative;
    const target = sign > 0 ? positive : negative;
    const opposite = sign > 0 ? negative : positive;
    if (active) {
      target.add(token);
      opposite.delete(token);
      ensureMotionLoop();
    } else {
      target.delete(token);
    }
  }

  function clearMotionToken(token) {
    motionHold.translationPositive.delete(token);
    motionHold.translationNegative.delete(token);
    motionHold.rotationPositive.delete(token);
    motionHold.rotationNegative.delete(token);
  }

  function hasLiveMotion() {
    return motionTargetSign("translation") !== 0 ||
      motionTargetSign("rotation") !== 0 ||
      Math.abs(motionHold.translationVelocity) > 1e-5 ||
      Math.abs(motionHold.rotationVelocity) > 1e-5;
  }

  function ensureMotionLoop() {
    if (state.slideInputMode !== "move" || state.motionMode !== "continuous" || motionHold.rafId) return;
    motionHold.lastTimestamp = 0;
    motionHold.rafId = window.requestAnimationFrame(stepMotionFrame);
  }

  function approach(current, target, maxSpeed, dt) {
    const rampSeconds = MOTION_RAMP_MS / 1000;
    const rate = Math.max(Math.abs(current), Math.abs(target), maxSpeed, 1e-6) / rampSeconds;
    const delta = rate * dt;
    if (Math.abs(target - current) <= delta) return target;
    return current + Math.sign(target - current) * delta;
  }

  function stepMotionFrame(timestamp) {
    motionHold.rafId = 0;
    if (state.slideInputMode !== "move" || state.motionMode !== "continuous") {
      motionHold.translationVelocity = 0;
      motionHold.rotationVelocity = 0;
      motionHold.lastTimestamp = 0;
      return;
    }
    const previous = motionHold.lastTimestamp || timestamp;
    const dt = Math.min(0.05, Math.max(0, (timestamp - previous) / 1000));
    motionHold.lastTimestamp = timestamp;

    const translationTarget = motionTargetSign("translation") * state.translationSpeed;
    const rotationTarget = motionTargetSign("rotation") * state.rotationSpeed;
    motionHold.translationVelocity = approach(motionHold.translationVelocity, translationTarget, state.translationSpeed, dt);
    motionHold.rotationVelocity = approach(motionHold.rotationVelocity, rotationTarget, state.rotationSpeed, dt);

    let changed = false;
    if (Math.abs(motionHold.translationVelocity) > 1e-5) {
      applyTranslationDistance(motionHold.translationVelocity * dt, { render: false });
      changed = true;
    }
    if (Math.abs(motionHold.rotationVelocity) > 1e-5) {
      applyRotationDegrees(motionHold.rotationVelocity * dt, { render: false });
      changed = true;
    }
    if (changed) renderAll();
    if (hasLiveMotion()) motionHold.rafId = window.requestAnimationFrame(stepMotionFrame);
    else motionHold.lastTimestamp = 0;
  }

  function setMotionMode(mode) {
    state.motionMode = mode === "discrete" ? "discrete" : "continuous";
    clearAllMotion();
    state.lastWarning = state.motionMode === "continuous"
      ? "Continuous movement is active. Hold W/S or A/D to move."
      : "Discrete movement is active. Each key press applies one step.";
    renderAll();
  }

  function setSlideInputMode(mode) {
    const next = normalizeSlideInputMode(mode);
    if (next !== "move") clearAllMotion();
    state.slideInputMode = next;
    if (next === "direct") syncDirectInputFields({ force: true });
    state.lastWarning = next === "move"
      ? "Move input mode is active."
      : "Direct input mode is active.";
    renderAll();
  }

  function setDirectInputMode(mode) {
    state.directInputMode = normalizeDirectInputMode(mode);
    if (state.slideInputMode === "direct") syncDirectInputFields({ force: true });
    state.lastWarning = state.directInputMode === "manual"
      ? "Manual direct input is active."
      : "Frame matrix import is active.";
    renderAll();
  }

  function clearAllMotion() {
    motionHold.translationPositive.clear();
    motionHold.translationNegative.clear();
    motionHold.rotationPositive.clear();
    motionHold.rotationNegative.clear();
    motionHold.translationVelocity = 0;
    motionHold.rotationVelocity = 0;
    motionHold.lastTimestamp = 0;
    if (motionHold.rafId) {
      window.cancelAnimationFrame(motionHold.rafId);
      motionHold.rafId = 0;
    }
  }

  function setRotationPairFromShortcut(index) {
    if (index < 0 || index >= state.ambientDim) return false;
    const pair = normalizeRotationPair(state.rotationPair);
    if (index <= 1) {
      pair[0] = index;
      if (pair[1] === pair[0]) pair[1] = lowestDistinctIndex(pair[0]);
    } else {
      pair[1] = index;
      if (pair[0] === pair[1]) pair[0] = lowestDistinctIndex(pair[1]);
    }
    state.rotationPair = normalizeRotationPair(pair);
    state.lastWarning = `Rotation pair set to (v_${state.rotationPair[0] + 1}, v_${state.rotationPair[1] + 1}).`;
    renderAll();
    return true;
  }

  function regularFamilyOptions(n = state.ambientDim) {
    return REGULAR_POLYTOPE_FAMILIES
      .filter((family) => !family.dimensions || family.dimensions.includes(n))
      .map((family) => ({
        key: family.key,
        label: regularFamilyLabel(family.key, n),
      }));
  }

  function regularFamilyAvailable(family, n = state.ambientDim) {
    return regularFamilyOptions(n).some((option) => option.key === family);
  }

  function normalizeRegularFamily(family, n = state.ambientDim) {
    if (family === "cube") return "hypercube";
    if (family === "octahedron") return "cross-polytope";
    if (family === "tetrahedron" || family === "5-cell") return "regular-simplex";
    if (family === "tesseract") return "hypercube";
    if (family === "16-cell") return "cross-polytope";
    return regularFamilyAvailable(family, n) ? family : "hypercube";
  }

  function regularFamilyLabel(family, n = state.ambientDim) {
    if (family === "regular-simplex") {
      if (n === 3) return "tetrahedron";
      if (n === 4) return "5-cell";
      return "regular simplex";
    }
    if (family === "hypercube") {
      if (n === 3) return "cube";
      if (n === 4) return "tesseract";
      return "hypercube";
    }
    if (family === "cross-polytope") {
      if (n === 3) return "octahedron";
      if (n === 4) return "16-cell";
      return "cross-polytope";
    }
    return REGULAR_POLYTOPE_FAMILIES.find((item) => item.key === family)?.label || "hypercube";
  }

  function regularPolytopeInstanceLabel(family, n = state.ambientDim) {
    return regularFamilyLabel(normalizeRegularFamily(family, n), n);
  }

  function weylDynkinOptions(n = state.ambientDim) {
    const options = [
      { key: "A", type: "A", rank: n, label: `A_${n}` },
      { key: "B", type: "B", rank: n, label: `B_${n}` },
      { key: "C", type: "C", rank: n, label: `C_${n}` },
    ];
    if (n >= 4) options.push({ key: "D", type: "D", rank: n, label: `D_${n}` });
    if (n === 2) options.push({ key: "G", type: "G", rank: 2, label: "G_2" });
    if (n === 4) options.push({ key: "F", type: "F", rank: 4, label: "F_4" });
    if (n >= 6 && n <= 8) options.push({ key: "E", type: "E", rank: n, label: `E_${n}` });
    return options;
  }

  function normalizeWeylDynkinType(type, n = state.ambientDim) {
    const raw = String(type || "A").trim().toUpperCase().replace(/^([ABCDEFG]).*$/, "$1");
    const options = weylDynkinOptions(n);
    return options.some((option) => option.type === raw) ? raw : options[0].type;
  }

  function weylDynkinLabel(type, rank = state.ambientDim) {
    return `${normalizeWeylDynkinType(type, rank)}_${rank}`;
  }

  function currentAddRegularFamily(n = state.ambientDim) {
    state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, n);
    return state.addRegularFamily;
  }

  function currentAddWeylDynkinType(n = state.ambientDim) {
    state.addWeylDynkinType = normalizeWeylDynkinType(state.addWeylDynkinType, n);
    return state.addWeylDynkinType;
  }

  function currentAddDynkinReferenceValue(n = state.ambientDim) {
    const sources = dynkinTypeObjects(n);
    const sourceId = state.addWeylDynkinSourceId;
    if (sourceId && sources.some((object) => object.id === sourceId)) return `source:${sourceId}`;
    if (sources.length) return `source:${sources[0].id}`;
    return `type:${currentAddWeylDynkinType(n)}`;
  }

  function matrixAddVariantOptions(n = state.ambientDim) {
    const references = dynkinReferenceOptions(n);
    return [
      { value: "manual", label: "manual matrix" },
      ...references.flatMap((reference) => [
        { value: `simple-roots|${reference.value}`, label: `simple roots: ${reference.label}` },
        { value: `fundamental-weights|${reference.value}`, label: `fundamental weights: ${reference.label}` },
      ]),
    ];
  }

  function latticeAddVariantOptions(n = state.ambientDim) {
    const references = dynkinReferenceOptions(n);
    return [
      { value: "matrix-input", label: "matrix input" },
      { value: "lmfdb-field", label: "LMFDB field" },
      ...references.flatMap((reference) => [
        { value: `root|${reference.value}`, label: `root lattice: ${reference.label}` },
        { value: `weight|${reference.value}`, label: `weight lattice: ${reference.label}` },
      ]),
    ];
  }

  function latticeObjectOptions(n = state.ambientDim) {
    return state.objects.filter((candidate) =>
      objectTypeKey(candidate) === "lattice" &&
      (candidate.data?.ambientDimension || n) === n
    );
  }

  function defaultLatticeSourceId(n = state.ambientDim) {
    const sourceId = state.addVoronoiLatticeSourceId;
    if (sourceId && latticeObjectOptions(n).some((object) => object.id === sourceId)) return sourceId;
    return latticeObjectOptions(n)[0]?.id || "";
  }

  function voronoiAddVariantOptions(n = state.ambientDim) {
    const lattices = latticeObjectOptions(n);
    if (!lattices.length) return [{ value: "", label: "create a lattice first" }];
    return lattices.map((object) => ({
      value: object.id,
      label: object.name,
    }));
  }

  function parseMatrixAddVariant(value, n = state.ambientDim) {
    const text = String(value || "manual");
    if (text === "manual") return { matrixPresetKind: "manual" };
    const [kind, reference] = text.split("|");
    const matrixPresetKind = normalizeMatrixPresetKind(kind);
    if (matrixPresetKind === "manual") return { matrixPresetKind: "manual" };
    return { matrixPresetKind, dynkinRef: reference || defaultDynkinReferenceValue(n) };
  }

  function parseLatticeAddVariant(value, n = state.ambientDim) {
    const text = String(value || "matrix-input");
    if (text === "matrix-input") return { basisMode: "matrix-input" };
    if (text === "lmfdb-field") return { basisMode: "lmfdb-field" };
    const [kind, reference] = text.split("|");
    const dynkinLatticeKind = normalizeDynkinLatticeKind(kind);
    return {
      basisMode: "dynkin",
      dynkinLatticeKind,
      dynkinRef: reference || defaultDynkinReferenceValue(n),
    };
  }

  function parseVoronoiAddVariant(value, n = state.ambientDim) {
    const sourceId = String(value || defaultLatticeSourceId(n) || "");
    return { latticeSourceId: sourceId };
  }

  function makeRegularPolytopeData(n, family = "hypercube") {
    const normalizedFamily = normalizeRegularFamily(family, n);
    return {
      name: regularPolytopeInstanceLabel(normalizedFamily, n),
      kind: "geometry",
      objectType: "regular-polytope",
      ambientDimension: n,
      family: normalizedFamily,
      scale: 1,
      description: `${regularFamilyLabel(normalizedFamily, n)} source in R^${n}, with projection and exact 2D slice layers.`,
    };
  }

  function regularPolytopeGeometry(data, n = state.ambientDim) {
    const family = normalizeRegularFamily(data?.family, n);
    const key = `${family}:${n}`;
    if (!regularGeometryCache.has(key)) {
      const points = regularPolytopeVertices(family, n);
      regularGeometryCache.set(key, {
        points,
        edges: minimumDistanceEdges(points),
        family,
      });
    }
    return regularGeometryCache.get(key);
  }

  function regularPolytopeVertices(family, n) {
    if (family === "regular-simplex") return regularSimplexVertices(n);
    if (family === "cross-polytope") return crossPolytopeVertices(n);
    if (family === "dodecahedron" && n === 3) return dodecahedronVertices();
    if (family === "icosahedron" && n === 3) return icosahedronVertices();
    if (family === "24-cell" && n === 4) return twentyFourCellVertices();
    if (family === "120-cell" && n === 4) return oneTwentyCellVertices();
    if (family === "600-cell" && n === 4) return sixHundredCellVertices();
    return hypercubeVertices(n);
  }

  function hypercubeVertices(n) {
    const points = [];
    for (let mask = 0; mask < 2 ** n; mask += 1) {
      points.push(Array.from({ length: n }, (_, bit) => ((mask >> bit) & 1 ? 1 : -1)));
    }
    return points;
  }

  function crossPolytopeVertices(n) {
    const points = [];
    for (let index = 0; index < n; index += 1) {
      const positive = Array(n).fill(0);
      positive[index] = 1;
      const negative = Array(n).fill(0);
      negative[index] = -1;
      points.push(positive, negative);
    }
    return points;
  }

  function regularSimplexVertices(n) {
    const basis = [];
    for (let k = 0; k < n; k += 1) {
      const denominator = Math.sqrt((k + 1) * (k + 2));
      const vector = Array(n + 1).fill(0);
      for (let index = 0; index <= k; index += 1) vector[index] = 1 / denominator;
      vector[k + 1] = -(k + 1) / denominator;
      basis.push(vector);
    }
    const centroid = 1 / (n + 1);
    return Array.from({ length: n + 1 }, (_, vertexIndex) => {
      const ambient = Array.from({ length: n + 1 }, (_, index) => (index === vertexIndex ? 1 : 0) - centroid);
      return basis.map((basisVector) => dot(ambient, basisVector));
    });
  }

  function icosahedronVertices() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const points = [];
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        points.push([0, a, b * phi], [a, b * phi, 0], [a * phi, 0, b]);
      }
    }
    return points;
  }

  function dodecahedronVertices() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const invPhi = 1 / phi;
    const points = [];
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        for (const z of [-1, 1]) points.push([x, y, z]);
      }
    }
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        points.push([0, a * invPhi, b * phi], [a * invPhi, b * phi, 0], [a * phi, 0, b * invPhi]);
      }
    }
    return points;
  }

  function twentyFourCellVertices() {
    const points = [];
    for (let first = 0; first < 4; first += 1) {
      for (let second = first + 1; second < 4; second += 1) {
        for (const a of [-1, 1]) {
          for (const b of [-1, 1]) {
            const point = [0, 0, 0, 0];
            point[first] = a;
            point[second] = b;
            points.push(point);
          }
        }
      }
    }
    return points;
  }

  function sixHundredCellVertices() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const invPhi = 1 / phi;
    const points = [];
    for (let coordinate = 0; coordinate < 4; coordinate += 1) {
      for (const sign of [-2, 2]) {
        const point = [0, 0, 0, 0];
        point[coordinate] = sign;
        points.push(point);
      }
    }
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        for (const c of [-1, 1]) {
          for (const d of [-1, 1]) points.push([a, b, c, d]);
        }
      }
    }
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        for (const c of [-1, 1]) {
          for (const point of evenPermutations([0, a * invPhi, b, c * phi])) points.push(point);
        }
      }
    }
    return dedupeVectors(points);
  }

  function oneTwentyCellVertices() {
    const vertices600 = sixHundredCellVertices();
    const facets = sixHundredCellFacetPlanes(vertices600);
    const polarVertices = facets.map((plane) => plane.normal.map((value) => value / plane.c));
    return normalizeVertexRadius(dedupeVectors(polarVertices), 2);
  }

  function sixHundredCellFacetPlanes(vertices600 = sixHundredCellVertices()) {
    const { edges } = regularPolytopeGeometry({ family: "600-cell" }, 4);
    const adjacency = Array.from({ length: vertices600.length }, () => new Set());
    for (const [a, b] of edges) {
      adjacency[a].add(b);
      adjacency[b].add(a);
    }
    const planes = [];
    const seen = new Set();
    for (let a = 0; a < vertices600.length; a += 1) {
      const neighbors = Array.from(adjacency[a]).filter((index) => index > a);
      for (let bi = 0; bi < neighbors.length; bi += 1) {
        const b = neighbors[bi];
        for (let ci = bi + 1; ci < neighbors.length; ci += 1) {
          const c = neighbors[ci];
          if (!adjacency[b].has(c)) continue;
          for (let di = ci + 1; di < neighbors.length; di += 1) {
            const d = neighbors[di];
            if (!adjacency[b].has(d) || !adjacency[c].has(d)) continue;
            const plane = supportingPlaneFromIndices(vertices600, [a, b, c, d], 4);
            if (!plane || plane.c <= 1e-10) continue;
            const key = plane.normal.map((value) => fmt(value, 8)).join(",") + `:${fmt(plane.c, 8)}`;
            if (!seen.has(key)) {
              seen.add(key);
              planes.push(plane);
            }
          }
        }
      }
    }
    return planes;
  }

  function evenPermutations(values) {
    const results = [];
    const used = Array(values.length).fill(false);
    const permutation = [];
    const visit = () => {
      if (permutation.length === values.length) {
        if (permutationParity(permutation.map((item) => item.index)) === 0) {
          results.push(permutation.map((item) => item.value));
        }
        return;
      }
      for (let index = 0; index < values.length; index += 1) {
        if (used[index]) continue;
        used[index] = true;
        permutation.push({ value: values[index], index });
        visit();
        permutation.pop();
        used[index] = false;
      }
    };
    visit();
    return results;
  }

  function permutationParity(indices) {
    let inversions = 0;
    for (let i = 0; i < indices.length; i += 1) {
      for (let j = i + 1; j < indices.length; j += 1) {
        if (indices[i] > indices[j]) inversions += 1;
      }
    }
    return inversions % 2;
  }

  function dedupeVectors(points, digits = 10) {
    const map = new Map();
    for (const point of points) {
      const cleaned = point.map((value) => (Math.abs(value) < 1e-12 ? 0 : value));
      map.set(cleaned.map((value) => value.toFixed(digits)).join(","), cleaned);
    }
    return Array.from(map.values());
  }

  function normalizeVertexRadius(points, targetRadius) {
    const radius = Math.max(...points.map((point) => norm(point)));
    if (!Number.isFinite(radius) || radius <= 1e-12) return points;
    const factor = targetRadius / radius;
    return points.map((point) => scale(point, factor));
  }

  function minimumDistanceEdges(points) {
    let minDistance = Infinity;
    const distances = [];
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const distance = Math.sqrt(points[a].reduce((total, value, index) => total + (value - points[b][index]) ** 2, 0));
        distances.push([a, b, distance]);
        if (distance > 1e-8) minDistance = Math.min(minDistance, distance);
      }
    }
    const tolerance = Math.max(1e-7, minDistance * 1e-6);
    return distances
      .filter(([, , distance]) => Math.abs(distance - minDistance) <= tolerance)
      .map(([a, b]) => [a, b]);
  }

  function currentTypeLabel(typeKey = state.addType, n = state.ambientDim) {
    if (typeKey === "regular-polytope") return "regular polytope";
    if (typeKey === "simplex") return "simplex";
    if (typeKey === "sphere") return `sphere S^${n - 1}`;
    if (typeKey === "cartesian-frame" || typeKey === "fan") return "Cartesian frame";
    if (typeKey === "point") return "point";
    if (typeKey === "vector") return "vector";
    if (typeKey === "matrix") return "matrix";
    if (typeKey === "dynkin-type") return "Dynkin type";
    if (typeKey === "root-set") return "roots";
    if (typeKey === "lattice") return "lattice";
    if (typeKey === "voronoi-diagram") return "Voronoi diagram";
    if (typeKey === "formula-set") return "formula set";
    if (typeKey === "tropical-polynomial") return "tropical polynomial";
    if (typeKey === "weyl-chambers") return "Weyl chambers";
    if (typeKey === "toric-cone") return "rational cone";
    if (typeKey === "toric-fan") return "toric variety";
    if (typeKey === "cube") return "cube";
    return "regular polytope";
  }

  function makeObjectData(typeKey, n = state.ambientDim, options = {}) {
    if (typeKey === "regular-polytope" || typeKey === "cube") return makeRegularPolytopeData(n, options.family || "hypercube");
    if (typeKey === "simplex") return makeSimplexData(n);
    if (typeKey === "sphere") return makeSphereData(n);
    if (typeKey === "cartesian-frame" || typeKey === "fan") return makeCartesianFrameData(n);
    if (typeKey === "point") return makePointData(n);
    if (typeKey === "vector") return makeVectorData(n);
    if (typeKey === "matrix") return makeMatrixData(n, options);
    if (typeKey === "dynkin-type") return makeDynkinTypeData(n, options.dynkinType || defaultDynkinRawType(n));
    if (typeKey === "root-set") return makeRootSetData(n, options);
    if (typeKey === "lattice") return makeLatticeData(n, options);
    if (typeKey === "voronoi-diagram") return makeVoronoiDiagramData(n, options);
    if (typeKey === "formula-set") return makeFormulaSetData(n);
    if (typeKey === "tropical-polynomial") return makeTropicalPolynomialData(n);
    if (typeKey === "weyl-chambers") return makeWeylChambersData(n, options);
    if (typeKey === "toric-cone") return makeToricConeData(n, options.toricPreset || options.preset || "zero");
    if (typeKey === "toric-fan") return makeToricFanData(n, options.toricFanPreset || options.preset || "projective-space");
    return makeRegularPolytopeData(n, "hypercube");
  }

  function makeCubeData(n) {
    const points = [];
    for (let mask = 0; mask < 2 ** n; mask += 1) {
      points.push(Array.from({ length: n }, (_, bit) => ((mask >> bit) & 1 ? 1 : -1)));
    }
    const edges = [];
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        let diff = 0;
        for (let i = 0; i < n; i += 1) if (points[a][i] !== points[b][i]) diff += 1;
        if (diff === 1) edges.push([a, b]);
      }
    }
    return {
      name: currentTypeLabel("cube", n),
      kind: "geometry",
      objectType: "cube",
      ambientDimension: n,
      scale: 1,
      description: `Hypercube vertices and edges in R^${n}, currently shown by frame projection.`,
      points,
      edges,
    };
  }

  function makeSimplexData(n) {
    const points = [];
    for (let i = 0; i < n; i += 1) {
      points.push(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    }
    points.push(Array(n).fill(-1 / n));
    const edges = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) edges.push([i, j]);
    }
    return {
      name: currentTypeLabel("simplex", n),
      kind: "geometry",
      objectType: "simplex",
      ambientDimension: n,
      scale: 1,
      description: `Standard-basis simplex in R^${n} plus one balanced negative vertex.`,
      points,
      edges,
    };
  }

  function makeCartesianFrameData(n) {
    return {
      name: currentTypeLabel("cartesian-frame", n),
      kind: "geometry",
      objectType: "cartesian-frame",
      ambientDimension: n,
      description: `Coordinate frame rays in R^${n}, drawn from either the fixed e_i basis or the moving v_i frame.`,
      origin: Array(n).fill(0),
      basis: "ambient",
      length: 4,
    };
  }

  function makeSphereData(n) {
    return {
      name: currentTypeLabel("sphere", n),
      kind: "sphere",
      objectType: "sphere",
      ambientDimension: n,
      description: `Radius-one S^${n - 1} in R^${n}, with projection and exact 2D slice layers.`,
      center: Array(n).fill(0),
      centerInputMode: "manual",
      radius: 1,
    };
  }

  function makePointData(n) {
    return {
      name: currentTypeLabel("point", n),
      kind: "geometry",
      objectType: "point",
      ambientDimension: n,
      description: `Single movable point a in R^${n}.`,
      position: Array(n).fill(0),
      positionInputMode: "manual",
    };
  }

  function makeVectorData(n) {
    return {
      name: currentTypeLabel("vector", n),
      kind: "geometry",
      objectType: "vector",
      ambientDimension: n,
      description: `Single ambient vector in R^${n}, shown as a directed origin-to-vector segment.`,
      label: "v",
      vector: Array.from({ length: n }, (_, index) => (index === 0 ? 1 : 0)),
      vectorInputMode: "manual",
    };
  }

  function makeMatrixData(n, options = {}) {
    const presetKind = normalizeMatrixPresetKind(options.matrixPresetKind);
    const base = {
      name: currentTypeLabel("matrix", n),
      kind: "matrix",
      objectType: "matrix",
      ambientDimension: n,
      description: `Square ${n} x ${n} displayed matrix; columns are ambient vectors v_i.`,
      matrixRows: frameRows(identityFrame(n)),
      matrixColumnLabels: Array.from({ length: n }, (_, index) => `v_${index + 1}`),
      matrixInputMode: "manual",
    };
    if (presetKind === "manual") return base;
    const reference = parseDynkinReferenceValue(options.dynkinRef || defaultDynkinReferenceValue(n), n);
    const rows = dynkinMatrixRows(reference.dynkinType, presetKind, n);
    return {
      ...base,
      name: matrixPresetDisplayName(presetKind),
      description: `${matrixPresetDisplayName(presetKind)} for ${weylDynkinLabel(reference.dynkinType, n)}, stored as a live-linked matrix object.`,
      matrixRows: rows,
      matrixColumnLabels: dynkinMatrixColumnLabels(presetKind, n).map((entry) => entry.plain),
      matrixPresetKind: presetKind,
      dynkinSourceId: reference.dynkinSourceId,
      dynkinType: reference.dynkinType,
      dynkinRank: n,
    };
  }

  function makeDynkinTypeData(n, dynkinType = "A") {
    const normalizedDynkinType = normalizeWeylDynkinType(dynkinType, n);
    return {
      name: currentTypeLabel("dynkin-type", n),
      kind: "dynkin",
      objectType: "dynkin-type",
      ambientDimension: n,
      description: `Shared finite Dynkin type ${weylDynkinLabel(normalizedDynkinType, n)} for Weyl chambers, root/weight matrices, and Dynkin lattices.`,
      dynkinType: normalizedDynkinType,
      dynkinRank: n,
    };
  }

  function makeRootSetData(n, options = {}) {
    const reference = parseDynkinReferenceValue(options.dynkinRef || options.dynkinType || defaultDynkinReferenceValue(n), n);
    const normalizedDynkinType = normalizeWeylDynkinType(reference.dynkinType, n);
    return {
      name: currentTypeLabel("root-set", n),
      kind: "geometry",
      objectType: "root-set",
      ambientDimension: n,
      description: `Finite ${weylDynkinLabel(normalizedDynkinType, n)} roots as a projected point set.`,
      dynkinSourceId: reference.dynkinSourceId,
      dynkinType: normalizedDynkinType,
      dynkinRank: n,
      rootSignMode: normalizeRootSetSignMode(options.rootSignMode),
    };
  }

  function makeLatticeData(n, options = {}) {
    const basisMode = normalizeLatticeBasisMode(options.basisMode || (options.dynkinLatticeKind ? "dynkin" : "matrix-input"));
    const reference = parseDynkinReferenceValue(options.dynkinRef || defaultDynkinReferenceValue(n), n);
    const dynkinLatticeKind = normalizeDynkinLatticeKind(options.dynkinLatticeKind);
    const base = {
      name: currentTypeLabel("lattice", n),
      kind: "lattice",
      objectType: "lattice",
      ambientDimension: n,
      description: `Full-rank lattice in R^${n}, with bounded projection points.`,
      basisRows: frameRows(identityFrame(n)),
      basisInputMode: "manual",
      basisMode,
      matrixSourceId: null,
      dynkinSourceId: basisMode === "dynkin" ? reference.dynkinSourceId : null,
      dynkinType: basisMode === "dynkin" ? reference.dynkinType : defaultDynkinRawType(n),
      dynkinRank: n,
      dynkinLatticeKind,
      lmfdbQuery: "Qi",
      lmfdbField: null,
      embeddingCoordinateMode: "raw",
      showLatticePoints: true,
      latticeBoundShape: "ball",
      latticeBoundRadius: 2,
    };
    if (basisMode === "dynkin") {
      base.name = dynkinLatticeKind === "weight" ? "weight lattice" : "root lattice";
      base.basisRows = latticeBasisRowsFromDynkin(base, n);
      base.description = `${base.name} for ${weylDynkinLabel(base.dynkinType, n)}, generated from Dynkin data.`;
    } else if (basisMode === "lmfdb-field") {
      base.name = "LMFDB field lattice";
      base.description = `Full integer-ring lattice from an LMFDB number field search.`;
    }
    return base;
  }

  function makeVoronoiDiagramData(n, options = {}) {
    const latticeSourceId = String(options.latticeSourceId || defaultLatticeSourceId(n) || "");
    return {
      name: currentTypeLabel("voronoi-diagram", n),
      kind: "voronoi",
      objectType: "voronoi-diagram",
      ambientDimension: n,
      description: latticeSourceId
        ? `Exact 2D slice of a Voronoi cell for the selected lattice.`
        : `Exact 2D Voronoi-cell slice; choose a lattice source first.`,
      latticeSourceId,
      latticePoint: Array(n).fill(0),
      cachedBasisRows: frameRows(identityFrame(n)),
      voronoiStatus: "",
    };
  }

  function makeFormulaSetData(n) {
    return {
      name: currentTypeLabel("formula-set", n),
      kind: "formula",
      objectType: "formula-set",
      ambientDimension: n,
      description: `Single 2D slice formula in R^${n}, exact for degree 2 and numerical for broader relations.`,
      formulaInputMode: "formula",
      formula: "x1^2 + x2^2 <= 1",
      ...compileFormulaRelation("x1^2 + x2^2 <= 1", n),
    };
  }

  function makeTropicalPolynomialData(n) {
    const tropicalInput = defaultTropicalInput(n);
    return {
      name: currentTypeLabel("tropical-polynomial", n),
      kind: "tropical",
      objectType: "tropical-polynomial",
      ambientDimension: n,
      description: `Tropical polynomial in R^${n}, using u_i as the monomial symbol for p^{X_i}.`,
      showDistricts: true,
      tropicalDistrictLabelDensity: "all",
      tropicalNotationMode: "u",
      ...compileTropicalPolynomial(tropicalInput, "max", n),
    };
  }

  function makeWeylChambersData(n, options = {}) {
    const reference = parseDynkinReferenceValue(options.dynkinRef || options.dynkinType || defaultDynkinReferenceValue(n), n);
    const normalizedDynkinType = normalizeWeylDynkinType(reference.dynkinType, n);
    return {
      name: currentTypeLabel("weyl-chambers", n),
      kind: "weyl",
      objectType: "weyl-chambers",
      ambientDimension: n,
      description: `Finite Weyl chamber arrangement ${weylDynkinLabel(normalizedDynkinType, n)} in R^${n}, rendered by exact 2D slice.`,
      dynkinSourceId: reference.dynkinSourceId,
      dynkinType: normalizedDynkinType,
      dynkinRank: n,
      showChambers: true,
      weylLabelMode: "word",
      weylElementDisplayMode: "word",
      weylLabelDensity: "active",
    };
  }

  function normalizeToricPreset(value, n = state.ambientDim) {
    const preset = TORIC_PRESETS.has(value) ? value : "zero";
    return preset === "square-cone" && n < 3 ? "zero" : preset;
  }

  function toricPresetGenerators(preset, n = state.ambientDim) {
    if (!window.ToricConeMath) return [];
    return window.ToricConeMath.presetGenerators(normalizeToricPreset(preset, n), n);
  }

  function makeToricConeData(n, preset = "zero") {
    const normalizedPreset = normalizeToricPreset(preset, n);
    return {
      name: currentTypeLabel("toric-cone", n),
      kind: "toric",
      objectType: "toric-cone",
      ambientDimension: n,
      generators: toricPresetGenerators(normalizedPreset, n),
      preset: normalizedPreset,
      generatorInputMode: "manual",
      generatorImportOrientation: "columns",
      description: `Strongly convex rational polyhedral cone in N_R of rank ${n}, with affine toric variety U_sigma.`,
    };
  }

  function normalizeToricFanPreset(value) {
    return TORIC_FAN_PRESETS.has(value) ? value : "projective-space";
  }

  function normalizeToricFanSourceMode(value) {
    return value === "cone-list" ? "cone-list" : "preset";
  }

  function toricFanPresetCones(preset, n = state.ambientDim) {
    return window.ToricConeMath?.presetFan(normalizeToricFanPreset(preset), n) || [];
  }

  function cloneToricFanCone(cone, n = state.ambientDim) {
    return {
      id: String(cone?.id || ""),
      label: String(cone?.label || "cone"),
      sourceId: String(cone?.sourceId || ""),
      generators: (Array.isArray(cone?.generators) ? cone.generators : []).map((generator, index) => ({
        id: String(generator?.id || `generator-${index + 1}`),
        label: String(generator?.label || `u_${index + 1}`),
        coordinates: resizeVector(Array.isArray(generator?.coordinates) ? generator.coordinates : [], n).map((value) => String(value ?? "0")),
      })),
    };
  }

  function makeToricFanData(n, preset = "projective-space") {
    const normalizedPreset = normalizeToricFanPreset(preset);
    return {
      name: currentTypeLabel("toric-fan", n),
      kind: "toric",
      objectType: "toric-fan",
      ambientDimension: n,
      constructionMode: "preset",
      preset: normalizedPreset,
      coneSourceIds: [],
      cones: toricFanPresetCones(normalizedPreset, n).map((cone) => cloneToricFanCone(cone, n)),
      characterLatticeSourceId: "",
      description: `Normal toric variety X_Sigma assembled from a rational fan Sigma in N_R of rank ${n}.`,
    };
  }

  function isProjectionlessSourceType(typeKey) {
    return typeKey === "formula-set" || typeKey === "tropical-polynomial" || typeKey === "weyl-chambers" || typeKey === "dynkin-type";
  }

  function makeObjectForType(typeKey, name = "", options = {}) {
    const type = OBJECT_TYPES.find((item) => item.key === typeKey) || OBJECT_TYPES[0];
    const data = makeObjectData(type.key, state.ambientDim, options);
    return normalizeSourceObject({
      id: `object-${objectCounter++}`,
      name: name.trim() || data.name || currentTypeLabel(type.key, state.ambientDim),
      kind: data.kind || "geometry",
      visibleProjection: !isProjectionlessSourceType(type.key),
      visibleSlice: supportsExact2DSliceType(type.key),
      labels: false,
      style: {
        color: type.color,
        opacity: 0.85,
        pointSize: type.pointSize,
        lineWidth: type.lineWidth,
      },
      data,
    });
  }

  function addOptionsForCurrentType() {
    if (state.addType === "regular-polytope") return { family: currentAddRegularFamily() };
    if (state.addType === "dynkin-type") return { dynkinType: currentAddWeylDynkinType() };
    if (state.addType === "root-set") return { dynkinRef: currentAddDynkinReferenceValue() };
    if (state.addType === "weyl-chambers") return { dynkinRef: currentAddDynkinReferenceValue() };
    if (state.addType === "matrix") return parseMatrixAddVariant(state.addMatrixVariant, state.ambientDim);
    if (state.addType === "lattice") return parseLatticeAddVariant(state.addLatticeVariant, state.ambientDim);
    if (state.addType === "voronoi-diagram") return parseVoronoiAddVariant(state.addVoronoiLatticeSourceId, state.ambientDim);
    if (state.addType === "toric-cone") return { toricPreset: normalizeToricPreset(state.addToricPreset, state.ambientDim) };
    if (state.addType === "toric-fan") return { toricFanPreset: normalizeToricFanPreset(state.addToricFanPreset) };
    return {};
  }

  function makePreviewObject() {
    const type = OBJECT_TYPES.find((item) => item.key === state.addType) || OBJECT_TYPES[0];
    const options = addOptionsForCurrentType();
    const data = makeObjectData(type.key, state.ambientDim, options);
    return {
      id: "__add-preview__",
      name: `preview ${data.name || currentTypeLabel(type.key, state.ambientDim)}`,
      kind: data.kind || "geometry",
      visibleProjection: !isProjectionlessSourceType(type.key),
      visibleSlice: false,
      labels: false,
      style: {
        color: "#e5bd45",
        opacity: 0.46,
        pointSize: Math.max(5, type.pointSize + 1),
        lineWidth: Math.max(3, type.lineWidth + 1),
      },
      data,
    };
  }

  function activeObject() {
    return state.objects.find((object) => object.id === state.activeObjectId) || state.objects[0];
  }

  function toricConeRevision(object) {
    if (objectTypeKey(object) !== "toric-cone") return "";
    return JSON.stringify({
      ambientDimension: state.ambientDim,
      generators: (object.data?.generators || []).map((generator) => ({
        id: generator.id,
        label: generator.label,
        coordinates: generator.coordinates,
      })),
    });
  }

  function toricAnalysisKey(object, revision = toricConeRevision(object)) {
    return `${object?.id || "missing"}:${revision}`;
  }

  function invalidateToricAnalysis(object = null) {
    const prefix = object ? `${object.id}:` : "";
    for (const key of Array.from(toricAnalysisCache.keys())) {
      if (!object || key.startsWith(prefix)) toricAnalysisCache.delete(key);
    }
    for (const key of Array.from(toricAnalysisPending.keys())) {
      if (!object || key.startsWith(prefix)) toricAnalysisPending.delete(key);
    }
    if (object) toricSliceIssueByObject.delete(object.id);
    else toricSliceIssueByObject.clear();
    if (!object || state.activeToricFace?.objectId === object.id) state.activeToricFace = null;
    if (!object) state.toricConePickCandidates = [];
    else state.toricConePickCandidates = state.toricConePickCandidates.filter((candidate) => candidate.objectId !== object.id);
    hideToricConePickMenu();
    toricRenderedEditorKey = "";
  }

  function toricPendingAnalysis(object) {
    return {
      status: "pending",
      valid: false,
      ambientDimension: state.ambientDim,
      generators: (object.data?.generators || []).map((generator) => ({
        id: generator.id,
        label: generator.label,
        coordinates: generator.coordinates,
        status: "pending",
      })),
      issues: ["Exact cone analysis is running."],
      warnings: [],
    };
  }

  function computeToricAnalysisSync(object, revision = toricConeRevision(object)) {
    const key = toricAnalysisKey(object, revision);
    try {
      const analysis = window.ToricConeMath.analyzeCone({
        ambientDimension: state.ambientDim,
        generators: object.data?.generators || [],
      }, TORIC_ANALYSIS_LIMITS);
      toricAnalysisCache.set(key, analysis);
      return analysis;
    } catch (error) {
      const analysis = {
        status: "invalid",
        valid: false,
        ambientDimension: state.ambientDim,
        generators: [],
        issues: [`Exact cone analysis failed: ${error.message}`],
        warnings: [],
      };
      toricAnalysisCache.set(key, analysis);
      return analysis;
    }
  }

  function toricConeAnalysis(object, options = {}) {
    if (!object || objectTypeKey(object) !== "toric-cone") return null;
    const revision = toricConeRevision(object);
    const key = toricAnalysisKey(object, revision);
    if (toricAnalysisCache.has(key)) return toricAnalysisCache.get(key);
    if (!window.ToricConeMath) {
      return { status: "invalid", valid: false, generators: [], issues: ["Toric cone math module is unavailable."], warnings: [] };
    }
    if (options.sync || String(object.id || "").startsWith("__") || toricWorkerUnavailable || !toricAnalysisWorker) return computeToricAnalysisSync(object, revision);
    if (!toricAnalysisPending.has(key)) {
      const requestId = toricAnalysisRequestCounter++;
      toricAnalysisPending.set(key, { requestId, objectId: object.id, revision });
      toricAnalysisWorker.postMessage({
        type: "analyze-cone",
        requestId,
        objectId: object.id,
        revision,
        input: { ambientDimension: state.ambientDim, generators: object.data?.generators || [] },
        limits: TORIC_ANALYSIS_LIMITS,
      });
    }
    return toricPendingAnalysis(object);
  }

  function initToricAnalysisWorker() {
    if (typeof Worker === "undefined") {
      toricWorkerUnavailable = true;
      return;
    }
    try {
      toricAnalysisWorker = new Worker("js/toric_cone_worker.js?v=20260830-2");
      toricAnalysisWorker.addEventListener("message", (event) => {
        const message = event.data || {};
        if (message.type !== "cone-analysis" && message.type !== "cone-analysis-error") return;
        const key = `${message.objectId}:${message.revision}`;
        const pending = toricAnalysisPending.get(key);
        if (!pending || pending.requestId !== message.requestId) return;
        toricAnalysisPending.delete(key);
        const object = state.objects.find((candidate) => candidate.id === message.objectId);
        if (!object || toricConeRevision(object) !== message.revision) return;
        if (message.type === "cone-analysis") {
          toricAnalysisCache.set(key, message.analysis);
        } else {
          toricAnalysisCache.set(key, {
            status: "invalid",
            valid: false,
            generators: [],
            issues: [`Exact cone analysis failed: ${message.error}`],
            warnings: [],
          });
        }
        if (state.activeObjectId === object.id && state.sourceMode === "modify") syncObjectPanel();
        renderAll();
      });
      toricAnalysisWorker.addEventListener("error", () => {
        toricWorkerUnavailable = true;
        if (toricAnalysisWorker) toricAnalysisWorker.terminate();
        toricAnalysisWorker = null;
        const pending = Array.from(toricAnalysisPending.values());
        toricAnalysisPending.clear();
        pending.forEach((entry) => {
          const object = state.objects.find((candidate) => candidate.id === entry.objectId);
          if (object && toricConeRevision(object) === entry.revision) computeToricAnalysisSync(object, entry.revision);
        });
        if (objectTypeKey(activeObject()) === "toric-cone" && state.sourceMode === "modify") syncObjectPanel();
        renderAll();
      });
    } catch {
      toricWorkerUnavailable = true;
      toricAnalysisWorker = null;
    }
  }

  function sourceLabel(object) {
    const labels = {
      cube: "cube",
      "regular-polytope": regularFamilyLabel(object?.data?.family, state.ambientDim),
      simplex: "simplex",
      sphere: "sphere",
      "cartesian-frame": "frame",
      point: "point",
      vector: "vector",
      matrix: "matrix",
      "dynkin-type": "Dynkin type",
      "root-set": "roots",
      lattice: "lattice",
      "voronoi-diagram": "Voronoi diagram",
      "formula-set": "formula",
      "tropical-polynomial": "tropical",
      "weyl-chambers": "Weyl chambers",
      "toric-cone": "toric cone",
      "toric-fan": "toric variety",
    };
    const type = object?.data?.objectType || object?.kind || "object";
    return labels[type] || type;
  }

  function setActiveObject(objectId) {
    const found = state.objects.find((object) => object.id === objectId);
    if (found) state.activeObjectId = found.id;
  }

  function clearWeylInteraction(objectId = "") {
    if (!objectId || state.activeWeylChamber?.objectId === objectId) state.activeWeylChamber = null;
    if (!objectId || state.weylKlTargetChamber?.objectId === objectId) state.weylKlTargetChamber = null;
  }

  function fillTypeSelect() {
    const select = $("source-add-type");
    select.innerHTML = "";
    for (const type of OBJECT_TYPES) {
      const option = document.createElement("option");
      option.value = type.key;
      option.textContent = type.label;
      select.appendChild(option);
    }
    select.value = state.addType;
    fillAddVariantSelect();
  }

  function fillAddVariantSelect() {
    const select = $("source-add-variant");
    if (!select) return;
    select.innerHTML = "";
    if (state.addType === "regular-polytope") {
      state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
      for (const family of regularFamilyOptions(state.ambientDim)) {
        const option = document.createElement("option");
        option.value = family.key;
        option.textContent = family.label;
        select.appendChild(option);
      }
      select.value = state.addRegularFamily;
      select.setAttribute("aria-label", "Regular polytope family");
      select.title = "Regular polytope family";
    } else if (state.addType === "dynkin-type") {
      state.addWeylDynkinType = normalizeWeylDynkinType(state.addWeylDynkinType, state.ambientDim);
      for (const dynkin of weylDynkinOptions(state.ambientDim)) {
        const option = document.createElement("option");
        option.value = dynkin.type;
        option.textContent = dynkin.label;
        select.appendChild(option);
      }
      select.value = state.addWeylDynkinType;
      select.setAttribute("aria-label", "Dynkin type");
      select.title = "Dynkin type";
    } else if (state.addType === "root-set") {
      const options = dynkinReferenceOptions(state.ambientDim);
      const currentValue = currentAddDynkinReferenceValue(state.ambientDim);
      for (const dynkin of options) {
        const option = document.createElement("option");
        option.value = dynkin.value;
        option.textContent = dynkin.label;
        select.appendChild(option);
      }
      select.value = options.some((option) => option.value === currentValue) ? currentValue : defaultDynkinReferenceValue(state.ambientDim);
      select.setAttribute("aria-label", "Dynkin type");
      select.title = "Dynkin type";
    } else if (state.addType === "weyl-chambers") {
      const options = dynkinReferenceOptions(state.ambientDim);
      const currentValue = currentAddDynkinReferenceValue(state.ambientDim);
      for (const dynkin of options) {
        const option = document.createElement("option");
        option.value = dynkin.value;
        option.textContent = dynkin.label;
        select.appendChild(option);
      }
      select.value = options.some((option) => option.value === currentValue) ? currentValue : defaultDynkinReferenceValue(state.ambientDim);
      select.setAttribute("aria-label", "Dynkin type");
      select.title = "Dynkin type";
    } else if (state.addType === "matrix") {
      const options = matrixAddVariantOptions(state.ambientDim);
      const selected = options.some((option) => option.value === state.addMatrixVariant) ? state.addMatrixVariant : "manual";
      for (const entry of options) {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      }
      select.value = selected;
      state.addMatrixVariant = selected;
      select.setAttribute("aria-label", "Matrix source");
      select.title = "Matrix source";
    } else if (state.addType === "lattice") {
      const options = latticeAddVariantOptions(state.ambientDim);
      const selected = options.some((option) => option.value === state.addLatticeVariant) ? state.addLatticeVariant : "matrix-input";
      for (const entry of options) {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      }
      select.value = selected;
      state.addLatticeVariant = selected;
      select.setAttribute("aria-label", "Lattice source");
      select.title = "Lattice source";
    } else if (state.addType === "voronoi-diagram") {
      const options = voronoiAddVariantOptions(state.ambientDim);
      const selected = options.some((option) => option.value === state.addVoronoiLatticeSourceId)
        ? state.addVoronoiLatticeSourceId
        : defaultLatticeSourceId(state.ambientDim);
      for (const entry of options) {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      }
      select.value = selected;
      state.addVoronoiLatticeSourceId = selected;
      select.disabled = !selected;
      select.setAttribute("aria-label", "Voronoi lattice source");
      select.title = "Voronoi lattice source";
    } else if (state.addType === "toric-cone") {
      const options = [
        ["zero", "zero cone"],
        ["positive-orthant", "positive orthant"],
        ["singular-simplicial", "singular simplicial"],
        ...(state.ambientDim >= 3 ? [["square-cone", "square cone"]] : []),
      ];
      state.addToricPreset = normalizeToricPreset(state.addToricPreset, state.ambientDim);
      options.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = state.addToricPreset;
      select.setAttribute("aria-label", "Rational cone preset");
      select.title = "Rational cone preset";
    } else if (state.addType === "toric-fan") {
      const options = [
        ["projective-space", "projective space P^n"],
        ["affine-space", "affine space A^n"],
        ["weighted-projective-space", "weighted P(1,...,1,2)"],
      ];
      state.addToricFanPreset = normalizeToricFanPreset(state.addToricFanPreset);
      options.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = state.addToricFanPreset;
      select.setAttribute("aria-label", "Toric variety fan preset");
      select.title = "Toric variety fan preset";
    } else {
      select.setAttribute("aria-label", "Source variant");
      select.title = "";
    }
  }

  function refreshTypeLabels() {
    const select = $("source-add-type");
    if (!select) return;
    Array.from(select.options).forEach((option) => {
      option.textContent = currentTypeLabel(option.value, state.ambientDim);
    });
    fillAddVariantSelect();
  }

  function syncObjectSelect() {
    const select = $("object-select");
    select.innerHTML = "";
    state.objects.forEach((object) => {
      const option = document.createElement("option");
      option.value = object.id;
      option.textContent = object.name;
      select.appendChild(option);
    });
    if (activeObject()) select.value = activeObject().id;
    $("object-delete").disabled = state.objects.length <= 1;
  }

  function syncSourceMode() {
    $("source-add-type").value = state.addType;
    const variantSelect = $("source-add-variant");
    if (variantSelect) {
      state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
      state.addWeylDynkinType = normalizeWeylDynkinType(state.addWeylDynkinType, state.ambientDim);
      fillAddVariantSelect();
      variantSelect.hidden = !["regular-polytope", "dynkin-type", "root-set", "weyl-chambers", "matrix", "lattice", "voronoi-diagram", "toric-cone", "toric-fan"].includes(state.addType);
      variantSelect.disabled = variantSelect.hidden || (state.addType === "voronoi-diagram" && !defaultLatticeSourceId(state.ambientDim));
    }
    const addButton = $("source-add-object");
    if (addButton) addButton.disabled = state.sourceMode === "add" && state.addType === "voronoi-diagram" && !defaultLatticeSourceId(state.ambientDim);
    setSegmentActive("source-mode-controls", "data-source-mode", state.sourceMode);
    document.querySelectorAll("[data-source-mode-row]").forEach((row) => {
      row.hidden = row.dataset.sourceModeRow !== state.sourceMode;
    });
  }

  function setSegmentActive(containerId, attribute, value) {
    const container = $(containerId);
    container.querySelectorAll(`[${attribute}]`).forEach((button) => {
      button.classList.toggle("active", button.getAttribute(attribute) === String(value));
    });
  }

  function syncObjectPanel() {
    const object = activeObject();
    if (!object) return;
    const labelsInput = $("object-labels");
    const labelsWrap = labelsInput.closest("label");
    const labelsEnabled = objectLabelsEnabled(object);
    if (!labelsEnabled) object.labels = false;
    $("object-name").value = object.name;
    $("object-color").value = object.style.color;
    $("object-opacity").value = object.style.opacity;
    $("object-point-size").value = object.style.pointSize;
    $("object-line-width").value = object.style.lineWidth;
    labelsInput.checked = labelsEnabled && object.labels;
    labelsInput.disabled = !labelsEnabled;
    if (labelsWrap) labelsWrap.hidden = !labelsEnabled;
    syncLayerButtons(object);
    rebuildObjectParams();
    renderSourceStatusText($("source-status"), "Projection and exact/numeric 2D slice layers are active.");
  }

  function objectTypeKey(object) {
    return object?.data?.objectType || (object?.kind === "sphere" ? "sphere" : "geometry");
  }

  function supportsExact2DSliceType(type) {
    return EXACT_SLICE_TYPES.has(type);
  }

  function supportsExact2DSlice(object) {
    return supportsExact2DSliceType(objectTypeKey(object));
  }

  function canDrawExact2DSlice(object) {
    return state.sliceDim === 2 && supportsExact2DSlice(object);
  }

  function objectLabelsEnabled(object) {
    return objectTypeKey(object) !== "lattice";
  }

  function shouldDrawObjectLabels(object) {
    return objectLabelsEnabled(object) && (object.labels || state.viewport.showLabels);
  }

  function syncLayerButtons(object) {
    const projectionButton = $("object-visible-projection");
    const sliceButton = $("object-visible-slice");
    const type = objectTypeKey(object);
    const projectionEnabled = !isProjectionlessSourceType(type);
    if (!projectionEnabled) object.visibleProjection = false;
    projectionButton.disabled = !projectionEnabled;
    projectionButton.title = projectionEnabled ? "show projection layer" : `${sourceLabel(object)} projection is unavailable in this build`;
    projectionButton.classList.toggle("active", !!object.visibleProjection);
    projectionButton.setAttribute("aria-pressed", object.visibleProjection ? "true" : "false");
    const sliceEnabled = canDrawExact2DSlice(object);
    if (!sliceEnabled) object.visibleSlice = false;
    sliceButton.disabled = !sliceEnabled;
    sliceButton.title = sliceEnabled ? "show exact/numeric 2D slice layer" : "2D slice is available only for supported geometric, formula, chamber, Voronoi, and toric-cone sources in 2D frame mode";
    sliceButton.classList.toggle("active", !!object.visibleSlice);
    sliceButton.setAttribute("aria-pressed", object.visibleSlice ? "true" : "false");
  }

  function rebuildObjectParams() {
    const container = $("object-params");
    if (!container) return;
    container.innerHTML = "";
    const object = activeObject();
    if (!object) {
      container.textContent = "no active object";
      return;
    }
    const type = objectTypeKey(object);
    if (type === "regular-polytope") {
      buildRegularPolytopeParams(container, object);
      return;
    }
    if (type === "cube" || type === "simplex") {
      buildScalarParam(container, object, "scale", "size", 0.05, 6, 0.05);
      return;
    }
    if (type === "sphere") {
      buildSphereParams(container, object);
      return;
    }
    if (type === "cartesian-frame") {
      buildFrameParams(container, object);
      return;
    }
    if (type === "point") {
      buildPointParams(container, object);
      return;
    }
    if (type === "vector") {
      buildVectorParams(container, object);
      return;
    }
    if (type === "matrix") {
      buildMatrixParams(container, object);
      return;
    }
    if (type === "dynkin-type") {
      buildDynkinTypeParams(container, object);
      return;
    }
    if (type === "root-set") {
      buildRootSetParams(container, object);
      return;
    }
    if (type === "lattice") {
      buildLatticeParams(container, object);
      return;
    }
    if (type === "formula-set") {
      buildFormulaParams(container, object);
      return;
    }
    if (type === "tropical-polynomial") {
      buildTropicalParams(container, object);
      return;
    }
    if (type === "weyl-chambers") {
      buildWeylParams(container, object);
      return;
    }
    if (type === "toric-cone") {
      buildToricConeParams(container, object);
      return;
    }
    container.textContent = "no parameters";
  }

  function buildToricConeParams(container, object) {
    const analysis = toricConeAnalysis(object);
    const summary = document.createElement("span");
    summary.className = "slice-card-note";
    if (analysis?.status === "computed") {
      summary.textContent = `${analysis.extremeRayCount} rays / dim ${analysis.dimension} / ${analysis.valid ? "valid" : analysis.status}`;
    } else {
      summary.textContent = `${object.data?.generators?.length || 0} generators / ${analysis?.status || "waiting"}`;
    }
    const button = document.createElement("button");
    button.className = "slice-btn";
    button.type = "button";
    button.textContent = "edit cone";
    button.addEventListener("click", () => {
      state.toricTab = "build";
      openCardByLabel("Toric Cone");
      renderToricConeCard();
    });
    container.append(summary, button);
  }

  function setToricTab(tab) {
    state.toricTab = ["build", "faces", "variety"].includes(tab) ? tab : "build";
    const tabs = $("toric-cone-tabs");
    tabs?.querySelectorAll("[data-toric-tab]").forEach((button) => {
      const active = button.dataset.toricTab === state.toricTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-toric-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.toricPanel !== state.toricTab;
    });
  }

  function toricBadge(text, status = "") {
    const badge = document.createElement("span");
    badge.className = `slice-toric-badge${status ? ` ${status}` : ""}`;
    badge.textContent = text;
    return badge;
  }

  function renderToricSummary(object, analysis) {
    const output = $("toric-cone-summary");
    if (!output) return;
    output.innerHTML = "";
    if (analysis?.status === "pending") {
      output.append(toricBadge("analyzing"), toricBadge(`${object.data?.generators?.length || 0} entered`));
      return;
    }
    const status = analysis?.valid ? "valid" : "invalid";
    output.append(
      toricBadge(analysis?.valid ? "valid cone" : analysis?.status || "invalid", status),
      toricBadge(`rank ${state.ambientDim}`),
      toricBadge(`dim ${analysis?.dimension ?? "?"}`),
      toricBadge(`${analysis?.extremeRayCount ?? 0} rays`)
    );
    if (analysis?.valid) output.append(toricBadge(`${analysis.faceCount} faces`));
  }

  function toricGeneratorAnalysisMap(analysis) {
    return new Map((analysis?.generators || []).map((generator) => [generator.id, generator]));
  }

  function applyToricManualMatrix(object) {
    const grid = $("toric-cone-generators");
    if (!grid) return;
    (object.data?.generators || []).forEach((generator, index) => {
      const labelInput = Array.from(grid.querySelectorAll("[data-toric-generator-label-id]"))
        .find((input) => input.dataset.toricGeneratorLabelId === generator.id);
      const coordinates = Array.from(grid.querySelectorAll("[data-toric-coordinate]"))
        .filter((input) => input.dataset.toricGeneratorId === generator.id)
        .sort((left, right) => Number(left.dataset.toricCoordinate) - Number(right.dataset.toricCoordinate))
        .map((input) => input.value.trim());
      generator.label = labelInput?.value.trim() || generator.label || `u_${index + 1}`;
      generator.coordinates = coordinates;
      try {
        const primitive = window.ToricConeMath.primitiveVector(coordinates, state.ambientDim);
        if (!primitive.zero) generator.coordinates = primitive.exact;
      } catch {
        // Invalid text remains part of the editable draft and is diagnosed by the exact analyzer.
      }
    });
    object.data.preset = "zero";
    invalidateToricAnalysis(object);
    state.activeToricFace = null;
    state.lastWarning = `Manual ray matrix applied; columns were primitive-normalized where valid.`;
    syncObjectPanel();
    renderAll();
  }

  function toricGeneratorMatrixRows(object, dimension = state.ambientDim) {
    const generators = object?.data?.generators || [];
    return Array.from({ length: dimension }, (_, row) => generators.map((generator) => (
      String(resizeVector(generator.coordinates || [], dimension)[row] ?? "0")
    )));
  }

  function toricGeneratorMatrixText(object, dimension = state.ambientDim) {
    const generators = object?.data?.generators || [];
    if (!generators.length) return "";
    return toricGeneratorMatrixRows(object, dimension).map((row) => row.join(", ")).join("\n");
  }

  function deleteToricConeObject(object, message = "Toric cone deleted with its affine variety.") {
    invalidateToricAnalysis(object);
    state.objects = state.objects.filter((candidate) => candidate.id !== object.id);
    if (!state.objects.length) state.objects = [makeObjectForType("cartesian-frame")];
    state.activeObjectId = state.objects[0].id;
    state.sourceMode = "modify";
    state.selectedVertex = null;
    clearVectorTargetSession();
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.activeToricFace = null;
    state.lastWarning = message;
    syncObjectSelect();
    syncObjectPanel();
    renderAll();
  }

  function renderToricGeneratorEditor(object, analysis, force = false) {
    const grid = $("toric-cone-generators");
    if (!grid) return;
    const analysisKey = (analysis?.generators || []).map((generator) => `${generator.id}:${generator.status}`).join("|");
    const editorKey = `${object.id}:${toricConeRevision(object)}:${analysis?.status || "missing"}:${analysisKey}`;
    if (!force && toricRenderedEditorKey === editorKey) return;
    toricRenderedEditorKey = editorKey;
    grid.innerHTML = "";
    const generators = object.data?.generators || [];
    if (!generators.length) {
      const note = document.createElement("span");
      note.className = "slice-card-note";
      note.textContent = `The zero cone has no generators and realizes the torus (G_m)^${state.ambientDim}.`;
      grid.style.gridTemplateColumns = "minmax(0, 1fr)";
      grid.append(note);
      return;
    }
    grid.style.gridTemplateColumns = `44px repeat(${generators.length}, 78px)`;
    const analyzed = toricGeneratorAnalysisMap(analysis);

    const corner = document.createElement("span");
    corner.className = "slice-toric-matrix-corner";
    corner.textContent = "U";
    grid.append(corner);

    generators.forEach((generator, index) => {
      const head = document.createElement("div");
      head.className = "slice-toric-ray-head";
      const label = document.createElement("input");
      label.className = "slice-input slice-toric-generator-label";
      label.type = "text";
      label.value = generator.label;
      label.dataset.toricGeneratorLabelId = generator.id;
      label.setAttribute("aria-label", `Generator ${index + 1} label`);
      const remove = document.createElement("button");
      remove.className = "slice-icon-btn";
      remove.type = "button";
      remove.textContent = "x";
      remove.title = "delete this cone and its affine variety";
      remove.setAttribute("aria-label", `Delete cone because ${generator.label} is being deleted`);
      remove.addEventListener("click", () => {
        const confirmed = typeof window.confirm !== "function" || window.confirm(`Deleting ${generator.label} deletes the entire cone ${object.name} and U_sigma. Continue?`);
        if (confirmed) deleteToricConeObject(object, `${object.name} deleted because generator ${generator.label} was deleted.`);
      });
      head.append(label, remove);
      grid.append(head);
    });

    for (let coordinate = 0; coordinate < state.ambientDim; coordinate += 1) {
      const rowLabel = document.createElement("span");
      rowLabel.className = "slice-toric-matrix-row-label";
      rowLabel.textContent = `e_${coordinate + 1}`;
      grid.append(rowLabel);
      generators.forEach((generator) => {
        const entry = analyzed.get(generator.id);
        const input = document.createElement("input");
        input.className = "slice-input slice-toric-coordinate";
        if (["invalid", "zero"].includes(entry?.status)) input.classList.add("slice-toric-generator-cell-invalid");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = String(resizeVector(generator.coordinates || [], state.ambientDim)[coordinate] ?? "0");
        input.dataset.toricGeneratorId = generator.id;
        input.dataset.toricCoordinate = String(coordinate);
        input.setAttribute("aria-label", `${generator.label} coordinate ${coordinate + 1}`);
        grid.append(input);
      });
    }

    const statusLabel = document.createElement("span");
    statusLabel.className = "slice-toric-matrix-row-label";
    statusLabel.textContent = "status";
    grid.append(statusLabel);
    generators.forEach((generator) => {
      const meta = document.createElement("div");
      meta.className = "slice-toric-column-meta";
      const entry = analyzed.get(generator.id);
      const status = entry?.status || analysis?.status || "pending";
      const statusBadge = document.createElement("span");
      statusBadge.className = `slice-toric-generator-status ${status}`;
      statusBadge.textContent = status;
      if (entry?.error) statusBadge.title = entry.error;
      meta.append(statusBadge);
      if (entry?.primitive) {
        const primitive = document.createElement("span");
        primitive.className = "slice-toric-primitive";
        primitive.textContent = `(${entry.primitive.join(", ")})`;
        meta.append(primitive);
      }
      if (entry?.redundancyWitness?.length) {
        const witness = document.createElement("span");
        witness.className = "slice-toric-primitive";
        witness.textContent = `in cone(${entry.redundancyWitness.join(", ")})`;
        meta.append(witness);
      }
      if (entry?.error) {
        const error = document.createElement("span");
        error.className = "slice-toric-primitive";
        error.textContent = entry.error;
        meta.append(error);
      }
      grid.append(meta);
    });
  }

  function renderToricInputMode(object) {
    const mode = normalizeMatrixInputMode(object.data?.generatorInputMode);
    object.data.generatorInputMode = mode;
    $("toric-cone-input-mode-controls")?.querySelectorAll("[data-toric-input-mode]").forEach((button) => {
      const active = button.dataset.toricInputMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.querySelectorAll("[data-toric-input-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.toricInputPanel !== mode;
    });
  }

  function renderToricImportEditor(object) {
    const orientation = normalizeToricImportOrientation(object.data?.generatorImportOrientation);
    object.data.generatorImportOrientation = orientation;
    const select = $("toric-cone-import-orientation");
    const textarea = $("toric-cone-rows-import");
    if (select) select.value = orientation;
    if (!textarea) return;
    const sourceKey = `${toricConeRevision(object)}:${orientation}`;
    if (textarea.dataset.toricSourceKey !== sourceKey) {
      textarea.value = orientation === "legacy-rows"
        ? (object.data?.generators || []).map((generator) => resizeVector(generator.coordinates || [], state.ambientDim).join(", ")).join("\n")
        : toricGeneratorMatrixText(object);
      textarea.dataset.toricSourceKey = sourceKey;
    }
  }

  function renderToricTargetEditor(object) {
    const slots = $("toric-cone-target-slots");
    const note = $("toric-cone-target-note");
    if (!slots || !note) return;
    slots.innerHTML = "";
    const generators = object.data?.generators || [];
    if (!generators.length) {
      const empty = document.createElement("span");
      empty.className = "slice-card-note";
      empty.textContent = "The zero cone has no ray columns. Add a ray column before choosing a target.";
      slots.append(empty);
      note.textContent = "Targets fill existing ray columns; the zero cone remains unchanged.";
      return;
    }
    generators.forEach((generator, index) => {
      const button = document.createElement("button");
      const active = targetSessionMatches(object, "generators", index);
      button.className = `slice-target-slot-button${active ? " active" : ""}`;
      button.type = "button";
      button.dataset.toricTargetSlot = String(index);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.title = `Activate ${generator.label} ray target`;
      button.textContent = generator.label;
      const tuple = document.createElement("span");
      tuple.className = "slice-toric-target-display";
      tuple.textContent = `(${resizeVector(generator.coordinates || [], state.ambientDim).join(", ")})`;
      button.append(tuple);
      button.addEventListener("click", () => {
        if (active) {
          clearVectorTargetSession();
          state.lastWarning = `${object.name} ray target cleared.`;
        } else {
          activateVectorTargetSlot(object, "generators", index, generator.label);
        }
        renderAll();
      });
      slots.append(button);
    });
    const activeIndex = activeTargetSlotIndex(object, "generators", generators.length);
    note.textContent = activeIndex == null
      ? "Select a ray column, then click a visible point or fill from a vector object."
      : `Active ray: ${generators[activeIndex].label}. Click a visible point or fill from a vector object.`;
  }

  function renderToricVectorSource() {
    const select = $("toric-cone-vector-source");
    const button = $("toric-cone-add-vector");
    if (!select || !button) return;
    const previous = select.value;
    select.innerHTML = "";
    const vectors = vectorObjectOptions();
    if (!vectors.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "no vector objects";
      select.append(option);
      select.disabled = true;
      button.disabled = true;
      return;
    }
    vectors.forEach((vector) => {
      const option = document.createElement("option");
      option.value = vector.id;
      option.textContent = `${vector.name} (${vectorToTupleText(vector.data?.vector, 2)})`;
      select.append(option);
    });
    if (vectors.some((vector) => vector.id === previous)) select.value = previous;
    select.disabled = false;
    const object = activeToricConeObject();
    button.disabled = !object?.data?.generators?.length;
  }

  function renderToricValidation(analysis, object) {
    const output = $("toric-cone-validation");
    if (!output) return;
    output.innerHTML = "";
    if (analysis?.status === "pending") {
      const note = document.createElement("span");
      note.className = "slice-card-note";
      note.textContent = "Exact analysis is running in the cone worker.";
      output.append(note);
      return;
    }
    if (analysis?.valid) {
      appendWeightInfoRow(output, "validation", analysis.dimension === 0 ? "zero cone; strongly convex" : "strongly convex rational cone");
      appendWeightInfoRow(output, "canonical rays", String(analysis.extremeRayCount));
      if (analysis.metrics?.candidateChecks != null) appendWeightInfoRow(output, "exact checks", analysis.metrics.candidateChecks.toLocaleString());
    }
    (analysis?.issues || []).forEach((message) => {
      const warning = document.createElement("div");
      warning.className = "slice-toric-warning";
      warning.textContent = message;
      output.append(warning);
    });
    (analysis?.warnings || []).forEach((message) => {
      const warning = document.createElement("span");
      warning.className = "slice-card-note";
      warning.textContent = message;
      output.append(warning);
    });
    const sliceIssue = object ? toricSliceIssueByObject.get(object.id) : "";
    if (sliceIssue) {
      const warning = document.createElement("div");
      warning.className = "slice-toric-warning";
      warning.textContent = sliceIssue;
      output.append(warning);
    }
  }

  function selectedToricFace(object, analysis) {
    if (!analysis?.valid) return null;
    const key = state.activeToricFace?.objectId === object.id
      ? state.activeToricFace.faceKey
      : analysis.selectedFaceDefault;
    return analysis.faces.find((face) => face.key === key) || analysis.faces.find((face) => face.key === analysis.selectedFaceDefault) || analysis.faces[0];
  }

  function toricFaceLabel(face) {
    if (!face || face.key === "0") return "0 cone";
    return `cone(${face.rayLabels.join(", ")})`;
  }

  function renderToricFaceInfo(object, analysis, face) {
    const output = $("toric-cone-face-info");
    if (!output) return;
    output.innerHTML = "";
    if (!face) return;
    appendWeightInfoRow(output, "selected", toricFaceLabel(face));
    appendWeightInfoRow(output, "dimension", String(face.dimension));
    appendWeightInfoRow(output, "orbit", `(G_m)^${face.orbitDimension}`);
    appendWeightInfoRow(output, "orbit closure", `dimension ${face.orbitDimension}`);
    appendWeightInfoRow(output, "closure contains", (face.orbitClosureFaceKeys || [face.key])
      .map((key) => analysis.faces.find((item) => item.key === key))
      .filter(Boolean)
      .map((item) => `O(${toricFaceLabel(item)})`)
      .join("; "));
    appendWeightInfoRow(output, "simplicial", face.simplicial ? "yes" : "no");
    appendWeightInfoRow(output, "smooth", face.smooth ? "yes" : "no");
    appendWeightInfoRow(output, "multiplicity", face.multiplicity ?? "not defined for a nonsimplicial face");
    appendWeightInfoRow(output, "facets", face.facets.length ? face.facets.map((key) => analysis.faces.find((item) => item.key === key)).filter(Boolean).map(toricFaceLabel).join("; ") : "none");
    appendWeightInfoRow(output, "cofaces", face.cofaces.length ? face.cofaces.map((key) => analysis.faces.find((item) => item.key === key)).filter(Boolean).map(toricFaceLabel).join("; ") : "none");
  }

  function renderToricFaces(object, analysis) {
    const list = $("toric-cone-face-list");
    if (!list) return;
    list.innerHTML = "";
    if (!analysis?.valid) {
      const note = document.createElement("div");
      note.className = "slice-toric-warning";
      note.textContent = analysis?.status === "pending" ? "Faces will appear after exact analysis." : "A face poset is available only after the draft defines a strongly convex cone.";
      list.append(note);
      $("toric-cone-face-info").innerHTML = "";
      return;
    }
    const selected = selectedToricFace(object, analysis);
    const dimensions = Array.from(new Set(analysis.faces.map((face) => face.dimension))).sort((a, b) => b - a);
    dimensions.forEach((dimension) => {
      const group = document.createElement("div");
      group.className = "slice-toric-face-group";
      const heading = document.createElement("span");
      heading.className = "slice-toric-face-heading";
      heading.textContent = `dimension ${dimension}`;
      group.append(heading);
      analysis.faces.filter((face) => face.dimension === dimension).forEach((face) => {
        const button = document.createElement("button");
        button.className = `slice-btn slice-toric-face-button${selected?.key === face.key ? " active" : ""}`;
        button.type = "button";
        button.dataset.toricFaceKey = face.key;
        const name = document.createElement("span");
        name.textContent = toricFaceLabel(face);
        const orbit = document.createElement("span");
        orbit.textContent = `O: ${face.orbitDimension}D`;
        button.append(name, orbit);
        button.addEventListener("click", () => {
          state.activeToricFace = { objectId: object.id, faceKey: face.key };
          state.toricTab = "faces";
          renderAll();
        });
        group.append(button);
      });
      list.append(group);
    });
    renderToricFaceInfo(object, analysis, selected);
  }

  function renderToricVariety(object, analysis) {
    const output = $("toric-cone-variety-info");
    if (!output) return;
    output.innerHTML = "";
    if (!analysis?.valid) {
      const warning = document.createElement("div");
      warning.className = "slice-toric-warning";
      warning.textContent = analysis?.status === "pending"
        ? "Affine invariants will appear after exact analysis."
        : "This draft does not define U_sigma until every generator is valid and the cone is strongly convex.";
      output.append(warning);
      return;
    }
    appendWeightInfoRow(output, "variety", `U_sigma = Spec ${analysis.semigroupRing}`);
    appendWeightInfoRow(output, "dimension", String(state.ambientDim));
    appendWeightInfoRow(output, "cone dimension", String(analysis.dimension));
    appendWeightInfoRow(output, "cone codimension", String(analysis.codimension));
    appendWeightInfoRow(output, "facets", String(analysis.facetCount));
    appendWeightInfoRow(output, "torus factor", `(G_m)^${analysis.torusFactorRank}`);
    appendWeightInfoRow(output, "coordinate ring", analysis.smoothCoordinateRing || analysis.semigroupRing);
    appendWeightInfoRow(output, "dual cone", analysis.extremeRays.length
      ? analysis.extremeRays.map((ray) => `<m, ${ray.label}> >= 0`).join("; ")
      : "sigma^vee = M_R");
    appendWeightInfoRow(output, "simplicial", analysis.simplicial ? "yes; U_sigma is Q-factorial" : "no; U_sigma is not Q-factorial");
    appendWeightInfoRow(output, "smooth", analysis.smooth ? "yes; U_sigma is factorial" : "no; singular");
    appendWeightInfoRow(output, "multiplicity", analysis.multiplicity ?? "not a single simplicial index");
    appendWeightInfoRow(output, "Cl(U_sigma)", analysis.classGroup.display);
    appendWeightInfoRow(output, "canonical divisor", analysis.canonical.divisor);
    appendWeightInfoRow(output, "K Q-Cartier", analysis.canonical.qGorenstein ? "yes" : "no");
    appendWeightInfoRow(output, "K Cartier / Gorenstein", analysis.canonical.gorenstein ? "yes" : analysis.canonical.qGorenstein ? `no; index ${analysis.canonical.index}` : "no");
    appendWeightInfoRow(output, "singular locus", analysis.singularFaceKeys.length
      ? analysis.singularFaceKeys.map((key) => toricFaceLabel(analysis.faces.find((face) => face.key === key))).join("; ")
      : "empty");
    if (analysis.quotientLattice) appendWeightInfoRow(output, "quotient lattice", analysis.quotientLattice.display);
    appendWeightInfoRow(output, "normal / affine", "yes / yes");
  }

  function renderToricConeCard(options = {}) {
    const card = $("slice-toric-cone-card");
    if (!card) return;
    const object = activeObject();
    const visible = state.sourceMode === "modify" && objectTypeKey(object) === "toric-cone";
    card.hidden = !visible;
    if (!visible) {
      toricRenderedEditorKey = "";
      return;
    }
    const analysis = toricConeAnalysis(object);
    setToricTab(state.toricTab);
    renderToricSummary(object, analysis);
    renderToricInputMode(object);
    renderToricGeneratorEditor(object, analysis, options.forceEditor);
    renderToricImportEditor(object);
    renderToricTargetEditor(object);
    renderToricVectorSource();
    renderToricValidation(analysis, object);
    renderToricFaces(object, analysis);
    renderToricVariety(object, analysis);
    const squareOption = $("toric-cone-preset")?.querySelector('option[value="square-cone"]');
    if (squareOption) squareOption.disabled = state.ambientDim < 3;
  }

  function buildRegularPolytopeParams(container, object) {
    const data = object.data || {};
    data.family = normalizeRegularFamily(data.family, state.ambientDim);
    const wrap = document.createElement("div");
    wrap.className = "slice-param-pack";
    const family = document.createElement("select");
    family.className = "slice-select";
    family.setAttribute("aria-label", "Regular polytope family");
    for (const optionData of regularFamilyOptions(state.ambientDim)) {
      const option = document.createElement("option");
      option.value = optionData.key;
      option.textContent = optionData.label;
      family.appendChild(option);
    }
    family.value = data.family;
    family.addEventListener("change", () => {
      data.family = normalizeRegularFamily(family.value, state.ambientDim);
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.lastWarning = `${regularFamilyLabel(data.family, state.ambientDim)} family selected.`;
      renderAll();
    });
    const scalarHost = document.createElement("span");
    scalarHost.className = "slice-param-pack";
    wrap.append(family, scalarHost);
    container.appendChild(wrap);
    buildScalarParam(scalarHost, object, "scale", "size", 0.05, 6, 0.05);
  }

  function buildScalarParam(container, object, key, label, min, max, step) {
    const data = object.data || {};
    data[key] = positiveNumber(data[key], 1);
    const wrap = document.createElement("label");
    wrap.className = "slice-param-pack";
    const text = document.createElement("span");
    text.textContent = label;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(clamp(data[key], min, max));
    slider.setAttribute("aria-label", `${label} slider`);
    const number = document.createElement("input");
    number.className = "slice-input slice-param-number";
    number.type = "text";
    number.inputMode = "decimal";
    number.value = fmt(data[key], 4);
    number.setAttribute("aria-label", `${label} value`);
    const sync = () => {
      slider.value = String(clamp(data[key], min, max));
      number.value = fmt(data[key], 4);
    };
    const updateFromSlider = (raw) => {
      data[key] = clamp(finiteNumber(raw, data[key]), min, max);
      sync();
      renderAll();
    };
    slider.addEventListener("input", () => updateFromSlider(slider.value));
    attachRationalInputBehavior(number, {
      digits: 4,
      currentValue: () => data[key],
      validateValue: (value) => value > 0,
      invalidMessage: `${label} must be a positive number or fraction.`,
      onCommit: (value) => {
        data[key] = value;
      },
      afterCommit: () => {
        sync();
        renderAll();
      },
      onInvalid: () => {
        sync();
        renderAll();
      },
      wheel: false,
    });
    wrap.append(text, slider, number);
    container.appendChild(wrap);
  }

  function targetSessionMatches(object, fieldKey, slotIndex) {
    const target = state.activeVectorTarget;
    return !!target &&
      target.objectId === object.id &&
      target.fieldKey === fieldKey &&
      target.slotIndex === slotIndex;
  }

  function clearVectorTargetSession() {
    state.activeVectorTarget = null;
  }

  function activateVectorTargetSlot(object, fieldKey, slotIndex, slotLabel, targetLabelsKey = "", options = {}) {
    state.activeVectorTarget = {
      objectId: object.id,
      objectName: object.name,
      fieldKey,
      slotIndex,
      slotLabel,
      targetLabelsKey,
      targetDraftKey: options.targetDraftKey || "",
    };
    state.lastWarning = `Target ${object.name} / ${slotLabel} is active. Click an existing visible canvas point or choose a vector object.`;
  }

  function activeTargetSlotIndex(object, fieldKey, slotCount) {
    const target = state.activeVectorTarget;
    if (target?.objectId === object.id && target.fieldKey === fieldKey && target.slotIndex >= 0 && target.slotIndex < slotCount) {
      return target.slotIndex;
    }
    return slotCount === 1 ? 0 : null;
  }

  function vectorObjectOptions() {
    return state.objects.filter((candidate) => objectTypeKey(candidate) === "vector");
  }

  function vectorSourceSelect(options = {}) {
    const select = document.createElement("select");
    select.className = "slice-select slice-target-source-select";
    select.setAttribute("aria-label", "Vector object source");
    const vectors = vectorObjectOptions();
    if (!vectors.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "no vector objects";
      select.append(option);
      select.disabled = true;
      return { select, vectors };
    }
    vectors.forEach((object) => {
      const option = document.createElement("option");
      option.value = object.id;
      option.textContent = `${object.name} (${object.data?.label || "v"} = ${vectorToTupleText(object.data?.vector, 2)})`;
      select.append(option);
    });
    if (options.preferredId && vectors.some((object) => object.id === options.preferredId)) select.value = options.preferredId;
    return { select, vectors };
  }

  function matrixTargetDraftKey(object, fieldKey) {
    return `${object?.id || "missing"}:${fieldKey || "matrixRows"}:${state.ambientDim}`;
  }

  function matrixTargetDraftFor(object, fieldKey, targetLabelsKey = matrixFieldTargetLabelsKey(fieldKey)) {
    const key = matrixTargetDraftKey(object, fieldKey);
    const existing = matrixTargetDrafts.get(key);
    if (existing && existing.dimension === state.ambientDim) return existing;
    const data = object?.data || {};
    const draft = {
      key,
      dimension: state.ambientDim,
      rows: cloneMatrixRows(data[fieldKey], state.ambientDim),
      labels: resizeVector(Array.isArray(data[targetLabelsKey]) ? data[targetLabelsKey] : [], state.ambientDim)
        .map((value) => String(value || "")),
      dirty: false,
    };
    matrixTargetDrafts.set(key, draft);
    return draft;
  }

  function clearMatrixTargetDraft(object, fieldKey) {
    matrixTargetDrafts.delete(matrixTargetDraftKey(object, fieldKey));
  }

  function commitMatrixTargetDraftValue(target, rawVector, sourceLabel = "vector", targetDisplayLabel = "") {
    const object = state.objects.find((candidate) => candidate.id === target.objectId);
    if (!object) {
      clearVectorTargetSession();
      state.lastWarning = "Target object is no longer available.";
      renderAll();
      return false;
    }
    const labelsKey = target.targetLabelsKey || matrixFieldTargetLabelsKey(target.fieldKey);
    const draft = matrixTargetDrafts.get(target.targetDraftKey) || matrixTargetDraftFor(object, target.fieldKey, labelsKey);
    const vector = finiteVector(rawVector, state.ambientDim);
    draft.rows = setMatrixColumnRows(draft.rows, target.slotIndex, vector, state.ambientDim);
    draft.labels = resizeVector(Array.isArray(draft.labels) ? draft.labels : [], state.ambientDim)
      .map((value) => String(value || ""));
    draft.labels[target.slotIndex] = String(targetDisplayLabel || target.slotLabel || `v_${target.slotIndex + 1}`);
    draft.dirty = true;
    state.activeObjectId = object.id;
    state.sourceMode = "modify";
    state.lastWarning = `Drafted ${object.name} / ${target.slotLabel} from ${sourceLabel}; click apply targets to update the matrix.`;
    syncObjectPanel();
    syncSourceMode();
    renderAll();
    return true;
  }

  function commitToricGeneratorTargetValue(target, rawVector, sourceLabel = "vector", targetDisplayLabel = "") {
    const object = state.objects.find((candidate) => candidate.id === target.objectId && objectTypeKey(candidate) === "toric-cone");
    const generator = object?.data?.generators?.[target.slotIndex];
    if (!object || !generator) {
      clearVectorTargetSession();
      state.lastWarning = "The selected ray target is no longer available.";
      renderAll();
      return false;
    }
    const raw = resizeVector(Array.isArray(rawVector) ? rawVector : [], state.ambientDim).map((value) => String(value ?? "0"));
    let coordinates = raw;
    try {
      const primitive = window.ToricConeMath.primitiveVector(raw, state.ambientDim);
      if (!primitive.zero) coordinates = primitive.exact;
    } catch (error) {
      state.lastWarning = `Ray target rejected: ${error.message}`;
      renderAll();
      return false;
    }
    generator.coordinates = coordinates;
    if (targetDisplayLabel && (!generator.label || /^u_\d+$/.test(generator.label))) generator.label = String(targetDisplayLabel);
    object.data.preset = "zero";
    invalidateToricAnalysis(object);
    state.activeObjectId = object.id;
    state.sourceMode = "modify";
    state.selectedVertex = null;
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.lastWarning = `${generator.label} filled from ${sourceLabel} and primitive-normalized.`;
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    renderAll();
    return true;
  }

  function commitVectorTargetValue(target, rawVector, sourceLabel = "vector", targetDisplayLabel = "") {
    if (!target) return false;
    if (target.targetDraftKey) return commitMatrixTargetDraftValue(target, rawVector, sourceLabel, targetDisplayLabel);
    if (target.fieldKey === "generators") return commitToricGeneratorTargetValue(target, rawVector, sourceLabel, targetDisplayLabel);
    const object = state.objects.find((candidate) => candidate.id === target.objectId);
    if (!object) {
      clearVectorTargetSession();
      state.lastWarning = "Target object is no longer available.";
      renderAll();
      return false;
    }
    const vector = finiteVector(rawVector, state.ambientDim);
    const data = object.data || {};
    data.ambientDimension = state.ambientDim;
    if (isMatrixRowsField(data, target.fieldKey)) {
      const nextRows = setMatrixColumnRows(data[target.fieldKey], target.slotIndex, vector, state.ambientDim);
      if (objectTypeKey(object) === "lattice" && target.fieldKey === "basisRows") {
        try {
          validateFullRankMatrixRows(nextRows, state.ambientDim, `${object.name} basis`);
        } catch (error) {
          state.lastWarning = `Target fill rejected: ${error.message}`;
          renderAll();
          return false;
        }
        data.basisMode = "matrix-input";
        data.basisInputMode = "targets";
      }
      data[target.fieldKey] = nextRows;
      const labelsKey = target.targetLabelsKey || matrixFieldTargetLabelsKey(target.fieldKey);
      data[labelsKey] = resizeVector(Array.isArray(data[labelsKey]) ? data[labelsKey] : [], state.ambientDim)
        .map((value) => String(value || ""));
      data[labelsKey][target.slotIndex] = String(targetDisplayLabel || target.slotLabel || `v_${target.slotIndex + 1}`);
    } else {
      data[target.fieldKey] = vector;
      data[`${target.fieldKey}TargetLabel`] = String(targetDisplayLabel || "");
    }
    object.data = data;
    object.data.name = object.name;
    state.activeObjectId = object.id;
    state.sourceMode = "modify";
    state.selectedVertex = null;
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.lastWarning = `Filled ${object.name} / ${target.slotLabel} from ${sourceLabel}.`;
    if (objectTypeKey(object) === "lattice") {
      commitLatticeParamChange(object, null, {
        message: state.lastWarning,
      });
      return true;
    }
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    renderAll();
    return true;
  }

  function resetVectorTargetValue(object, fieldKey, slotIndex, slotLabel, resetVector, targetLabelsKey = "") {
    commitVectorTargetValue({
      objectId: object.id,
      objectName: object.name,
      fieldKey,
      slotIndex,
      slotLabel,
      targetLabelsKey,
    }, resetVector || Array(state.ambientDim).fill(0), "reset vector", slotLabel);
  }

  function buildTargetSlotControls(container, object, options = {}) {
    const fieldKey = options.fieldKey;
    const slotCount = options.slotCount || 1;
    const targetLabelsKey = options.targetLabelsKey || matrixFieldTargetLabelsKey(fieldKey);
    const slotLabel = options.slotLabel || ((index) => (slotCount === 1 ? "vector" : `v_${index + 1}`));
    const slotVector = options.slotVector || (() => Array(state.ambientDim).fill(0));
    const slotDisplay = options.slotDisplay || ((index, vector, label) => ({
      plain: `${label} ${vectorToInline(vector, 2)}`,
      tex: `${labelToTex(label)}\\ ${vectorToTex(vector, 2)}`,
    }));
    const targetOptions = options.targetOptions || {};
    const syncAfterTargetAction = (message = "") => {
      const handled = typeof options.afterTargetAction === "function" && options.afterTargetAction(object, {
        fieldKey,
        message: message || state.lastWarning,
      }) === true;
      if (handled) return;
      syncObjectPanel();
      renderAll();
    };
    const slots = document.createElement("div");
    slots.className = "slice-target-slots";
    if (options.wrapSlotsInParens) {
      const open = document.createElement("span");
      open.className = "slice-target-separator";
      setMathText(open, "(", "(");
      slots.append(open);
    }
    for (let index = 0; index < slotCount; index += 1) {
      const label = slotLabel(index);
      const vector = finiteVector(slotVector(index), state.ambientDim);
      if (options.wrapSlotsInParens && index > 0) {
        const comma = document.createElement("span");
        comma.className = "slice-target-separator";
        setMathText(comma, ",", ",");
        slots.append(comma);
      }
      const button = document.createElement("button");
      button.className = "slice-target-slot-button";
      button.type = "button";
      button.dataset.targetSlot = String(index);
      button.classList.toggle("active", targetSessionMatches(object, fieldKey, index));
      button.setAttribute("aria-pressed", targetSessionMatches(object, fieldKey, index) ? "true" : "false");
      button.title = `Activate ${label} target slot`;
      const display = slotDisplay(index, vector, label);
      setMathText(button, display.plain, display.tex);
      button.addEventListener("click", () => {
        if (targetSessionMatches(object, fieldKey, index)) {
          clearVectorTargetSession();
          state.lastWarning = `${object.name} target slot cleared.`;
        } else {
          activateVectorTargetSlot(object, fieldKey, index, label, targetLabelsKey, targetOptions);
        }
        syncAfterTargetAction();
      });
      slots.append(button);
    }
    if (options.wrapSlotsInParens) {
      const close = document.createElement("span");
      close.className = "slice-target-separator";
      setMathText(close, ")", ")");
      slots.append(close);
    }

    const sourceLine = document.createElement("div");
    sourceLine.className = "slice-target-source-line";
    const { select } = vectorSourceSelect();
    const fill = document.createElement("button");
    fill.className = "slice-btn";
    fill.type = "button";
    fill.dataset.targetFill = "true";
    fill.textContent = "fill slot";
    fill.disabled = select.disabled;
    fill.addEventListener("click", () => {
      const slotIndex = activeTargetSlotIndex(object, fieldKey, slotCount);
      if (slotIndex == null) {
        state.lastWarning = "Choose a target slot before filling from a vector object.";
        renderAll();
        return;
      }
      const source = state.objects.find((candidate) => candidate.id === select.value && objectTypeKey(candidate) === "vector");
      if (!source) {
        state.lastWarning = "Choose an existing vector object first.";
        renderAll();
        return;
      }
      commitVectorTargetValue({
        objectId: object.id,
        objectName: object.name,
        fieldKey,
        slotIndex,
        slotLabel: slotLabel(slotIndex),
        targetLabelsKey,
      }, source.data?.vector, `vector object ${source.name}`, source.data?.label || `v_${slotIndex + 1}`);
    });

    const resetSlot = document.createElement("button");
    resetSlot.className = "slice-btn";
    resetSlot.type = "button";
    resetSlot.dataset.targetResetSlot = "true";
    resetSlot.textContent = "reset slot";
    resetSlot.addEventListener("click", () => {
      const slotIndex = activeTargetSlotIndex(object, fieldKey, slotCount);
      if (slotIndex == null) {
        state.lastWarning = "Choose a target slot before resetting it.";
        renderAll();
        return;
      }
      const resetVector = typeof options.resetVector === "function" ? options.resetVector(slotIndex) : undefined;
      resetVectorTargetValue(object, fieldKey, slotIndex, slotLabel(slotIndex), resetVector, targetLabelsKey);
    });

    const resetAll = document.createElement("button");
    resetAll.className = "slice-btn";
    resetAll.type = "button";
    resetAll.dataset.targetResetAll = "true";
    resetAll.textContent = "reset targets";
    resetAll.addEventListener("click", () => {
      if (typeof options.onResetAllTargets === "function" && options.onResetAllTargets(object, {
        fieldKey,
        targetLabelsKey,
      }) === true) {
        return;
      }
      if (isMatrixRowsField(object.data, fieldKey, slotCount)) {
        object.data[fieldKey] = typeof options.resetRows === "function"
          ? options.resetRows()
          : Array.from({ length: state.ambientDim }, () => Array(state.ambientDim).fill(0));
        object.data[targetLabelsKey] = [];
        if (objectTypeKey(object) === "lattice" && fieldKey === "basisRows") {
          object.data.basisMode = "matrix-input";
          object.data.basisInputMode = "targets";
        }
      } else {
        object.data[fieldKey] = Array(state.ambientDim).fill(0);
        object.data[`${fieldKey}TargetLabel`] = "";
      }
      clearVectorTargetSession();
      state.lastWarning = `${object.name} target values reset.`;
      if (objectTypeKey(object) === "lattice") {
        commitLatticeParamChange(object, null, {
          message: state.lastWarning,
        });
        return;
      }
      syncObjectPanel();
      renderAll();
    });

    const note = document.createElement("span");
    note.className = "slice-target-note";
    note.textContent = state.activeVectorTarget?.objectId === object.id && state.activeVectorTarget.fieldKey === fieldKey
      ? `active: ${state.activeVectorTarget.slotLabel}`
      : "click a slot, then click a visible point";

    sourceLine.append(select, fill, resetSlot);
    if (slotCount > 1) sourceLine.append(resetAll);
    container.append(slots, sourceLine, note);
  }

  function buildVectorInputEditor(container, object, options = {}) {
    const data = object.data || {};
    object.data = data;
    const fieldKey = options.fieldKey;
    const modeKey = options.modeKey;
    const label = options.label || "vector";
    const targetLabel = options.targetLabel || label;
    data[fieldKey] = finiteVector(data[fieldKey], state.ambientDim);
    data[modeKey] = normalizeVectorInputMode(data[modeKey]);
    data.ambientDimension = state.ambientDim;

    const panel = document.createElement("div");
    panel.className = "slice-vector-panel";
    const modes = document.createElement("div");
    modes.className = "slice-segmented";
    modes.setAttribute("aria-label", `${label} input mode`);
    [
      ["manual", "manual input"],
      ["import", "import"],
      ["targets", "targets"],
    ].forEach(([mode, text]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.vectorInputMode = mode;
      button.textContent = text;
      button.classList.toggle("active", data[modeKey] === mode);
      button.addEventListener("click", () => {
        data[modeKey] = normalizeVectorInputMode(mode);
        if (mode === "targets") activateVectorTargetSlot(object, fieldKey, 0, targetLabel);
        else clearVectorTargetSession();
        state.lastWarning = `${label} ${text} is active.`;
        syncObjectPanel();
        renderAll();
      });
      modes.append(button);
    });

    const manualPane = document.createElement("div");
    manualPane.className = "slice-vector-mode-panel";
    manualPane.hidden = data[modeKey] !== "manual";
    const tuple = document.createElement("div");
    tuple.className = "slice-direct-vector";
    const prefix = document.createElement("span");
    setMathText(prefix, `${label} = (`, `${labelToTex(label)}=(`);
    tuple.append(prefix);
    const tupleInputs = document.createElement("span");
    tupleInputs.className = "slice-direct-position-list";
    appendRationalTupleInputs(tupleInputs, data[fieldKey], {
      labelClassName: "slice-param-vector",
      inputClassName: "slice-input slice-coordinate-input",
      datasetName: `${fieldKey}Coordinate`,
      digits: 4,
      ariaLabel: (index) => `${label}_${index + 1}`,
      currentValue: (index) => data[fieldKey]?.[index] || 0,
      invalidMessage: (index) => `${label} coordinate ${index + 1} must be a finite rational value.`,
      onCommit: (index, next) => {
        data[fieldKey] = finiteVector(data[fieldKey], state.ambientDim);
        data[fieldKey][index] = next;
        data.ambientDimension = state.ambientDim;
        if (typeof options.afterVectorChange === "function") options.afterVectorChange(object);
      },
      afterCommit: () => renderAll(),
      onInvalid: () => renderAll(),
    });
    tuple.append(tupleInputs);
    const suffix = document.createElement("span");
    setMathText(suffix, ")", ")");
    tuple.append(suffix);
    manualPane.append(tuple);

    const importPane = document.createElement("div");
    importPane.className = "slice-vector-mode-panel";
    importPane.hidden = data[modeKey] !== "import";
    const textarea = document.createElement("textarea");
    textarea.className = "slice-textarea slice-vector-textarea";
    textarea.spellcheck = false;
    textarea.value = vectorRowsText(data[fieldKey]);
    textarea.setAttribute("aria-label", `${label} Rows import`);
    textarea.placeholder = "1, 0, 0, 0";
    const apply = document.createElement("button");
    apply.className = "slice-btn";
    apply.type = "button";
    apply.textContent = "apply import";
    const applyImport = () => {
      try {
        data[fieldKey] = parseVectorRows(textarea.value, state.ambientDim, label);
        data.ambientDimension = state.ambientDim;
        if (typeof options.afterVectorChange === "function") options.afterVectorChange(object);
        state.lastWarning = `${label} vector imported.`;
        syncObjectPanel();
        renderAll();
      } catch (error) {
        state.lastWarning = `${label} import rejected: ${error.message}`;
        updateDebug();
      }
    };
    apply.addEventListener("click", applyImport);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyImport();
      } else if (event.key === "Escape") {
        event.preventDefault();
        textarea.value = vectorRowsText(data[fieldKey]);
        textarea.blur();
      }
    });
    importPane.append(textarea, apply);

    const targetsPane = document.createElement("div");
    targetsPane.className = "slice-vector-mode-panel";
    targetsPane.hidden = data[modeKey] !== "targets";
    if (!targetsPane.hidden && !targetSessionMatches(object, fieldKey, 0)) {
      activateVectorTargetSlot(object, fieldKey, 0, targetLabel);
    }
    buildTargetSlotControls(targetsPane, object, {
      fieldKey,
      slotCount: 1,
      slotLabel: () => targetLabel,
      slotVector: () => data[fieldKey],
      slotDisplay: (index, vector) => ({
        plain: vectorToTupleText(vector, 2),
        tex: vectorToTupleTex(vector, 2),
      }),
    });

    panel.append(modes, manualPane, importPane, targetsPane);
    container.append(panel);
  }

  function buildMatrixInputEditor(container, object, options = {}) {
    const data = object.data || {};
    object.data = data;
    const fieldKey = options.fieldKey || "matrixRows";
    const modeKey = options.modeKey || "matrixInputMode";
    const targetLabelsKey = options.targetLabelsKey || matrixFieldTargetLabelsKey(fieldKey);
    const editorLabel = options.label || "Matrix";
    const columnLabel = options.columnLabel || ((col) => ({ plain: `v${col + 1}`, tex: `v_{${col + 1}}` }));
    const rowLabel = options.rowLabel || ((row) => ({ plain: `e${row + 1}`, tex: `e_{${row + 1}}` }));
    data[fieldKey] = normalizedMatrixRows(data[fieldKey], state.ambientDim);
    data[modeKey] = normalizeMatrixInputMode(data[modeKey]);
    data.ambientDimension = state.ambientDim;
    const targetDraft = matrixTargetDraftFor(object, fieldKey, targetLabelsKey);

    const panel = document.createElement("div");
    panel.className = "slice-matrix-panel";
    const modes = document.createElement("div");
    modes.className = "slice-segmented";
    modes.setAttribute("aria-label", `${editorLabel} input mode`);
    [
      ["manual", "manual input"],
      ["import", "import"],
      ["targets", "targets"],
    ].forEach(([mode, text]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.matrixInputMode = mode;
      button.textContent = text;
      button.classList.toggle("active", data[modeKey] === mode);
      button.addEventListener("click", () => {
        data[modeKey] = normalizeMatrixInputMode(mode);
        clearVectorTargetSession();
        let message = `Matrix ${text} is active.`;
        if (mode === "targets") {
          const firstLabelValue = columnLabel(0);
          const firstSlotLabel = firstLabelValue.plain || firstLabelValue || "v_1";
          activateVectorTargetSlot(object, fieldKey, 0, firstSlotLabel, targetLabelsKey, {
            targetDraftKey: targetDraft.key,
          });
          message = state.lastWarning;
        }
        syncModeUi();
        state.lastWarning = message;
        const handled = typeof options.afterModeChange === "function" && options.afterModeChange(object, { mode, text, message }) === true;
        if (handled) return;
        renderAll();
      });
      modes.append(button);
    });

    const manualPane = document.createElement("div");
    manualPane.className = "slice-vector-mode-panel";
    manualPane.hidden = data[modeKey] !== "manual";
    const gridWrap = document.createElement("div");
    gridWrap.className = "slice-direct-matrix-wrap";
    const grid = document.createElement("div");
    grid.className = "slice-direct-matrix-grid";
    grid.setAttribute("aria-label", `${editorLabel} manual matrix`);
    buildRationalMatrixGrid(grid, {
      dimension: state.ambientDim,
      rowDataset: "objectMatrixRow",
      columnDataset: "objectMatrixColumn",
      rowLabel,
      columnLabel,
      valueAt: (row, col) => data[fieldKey]?.[row]?.[col] || 0,
      ariaLabel: (row, col) => `${editorLabel} entry ${row + 1}, ${col + 1}`,
      invalidMessage: `Manual ${editorLabel.toLowerCase()} entries must be finite rational values.`,
      onCommit: () => {},
      onInvalid: () => renderAll(),
      commitOnWheel: false,
      formatCommittedValue: false,
    });
    const manualApply = document.createElement("button");
    manualApply.className = "slice-btn";
    manualApply.type = "button";
    manualApply.textContent = "apply manual";
    manualApply.addEventListener("click", () => {
      try {
        const rows = readRationalMatrixGrid(grid, {
          dimension: state.ambientDim,
          rowDataset: "objectMatrixRow",
          columnDataset: "objectMatrixColumn",
          label: editorLabel,
          entryLabel: (row, col) => `${row + 1}, ${col + 1}`,
        });
        data[fieldKey] = typeof options.validateRows === "function"
          ? options.validateRows(rows)
          : rows;
        data[targetLabelsKey] = [];
        data.ambientDimension = state.ambientDim;
        clearMatrixTargetDraft(object, fieldKey);
        state.lastWarning = `Manual ${editorLabel.toLowerCase()} applied.`;
        const handled = typeof options.afterMatrixChange === "function" && options.afterMatrixChange(object, {
          fieldKey,
          mode: "manual",
          message: state.lastWarning,
        }) === true;
        if (handled) return;
        syncObjectPanel();
        renderAll();
      } catch (error) {
        state.lastWarning = `${editorLabel} rejected: ${error.message}`;
        updateDebug();
      }
    });
    gridWrap.append(grid);
    manualPane.append(gridWrap, manualApply);

    const importPane = document.createElement("div");
    importPane.className = "slice-vector-mode-panel";
    importPane.hidden = data[modeKey] !== "import";
    const textarea = document.createElement("textarea");
    textarea.className = "slice-textarea slice-vector-textarea";
    textarea.spellcheck = false;
    textarea.value = matrixRowsText(data[fieldKey]);
    textarea.setAttribute("aria-label", `${editorLabel} Rows import`);
    textarea.placeholder = "Paste matrix_calculator Rows here";
    const importApply = document.createElement("button");
    importApply.className = "slice-btn";
    importApply.type = "button";
    importApply.textContent = "apply import";
    const applyImport = () => {
      try {
        const rows = parseMatrixRows(textarea.value, state.ambientDim, editorLabel);
        data[fieldKey] = typeof options.validateRows === "function"
          ? options.validateRows(rows)
          : rows;
        data[targetLabelsKey] = [];
        data.ambientDimension = state.ambientDim;
        clearMatrixTargetDraft(object, fieldKey);
        state.lastWarning = `${editorLabel} rows imported.`;
        const handled = typeof options.afterMatrixChange === "function" && options.afterMatrixChange(object, {
          fieldKey,
          mode: "import",
          message: state.lastWarning,
        }) === true;
        if (handled) return;
        syncObjectPanel();
        renderAll();
      } catch (error) {
        state.lastWarning = `${editorLabel} import rejected: ${error.message}`;
        updateDebug();
      }
    };
    importApply.addEventListener("click", applyImport);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyImport();
      } else if (event.key === "Escape") {
        event.preventDefault();
        textarea.value = matrixRowsText(data[fieldKey]);
        textarea.blur();
      }
    });
    importPane.append(textarea, importApply);

    const targetsPane = document.createElement("div");
    targetsPane.className = "slice-vector-mode-panel";
    targetsPane.hidden = data[modeKey] !== "targets";
    buildTargetSlotControls(targetsPane, object, {
      fieldKey,
      targetLabelsKey,
      slotCount: state.ambientDim,
      slotLabel: (index) => {
        const labelValue = columnLabel(index);
        return labelValue.plain || labelValue;
      },
      slotVector: (index) => matrixColumnFromRows(targetDraft.rows, index, state.ambientDim),
      resetVector: options.resetVector,
      resetRows: options.resetRows,
      wrapSlotsInParens: true,
      slotDisplay: (index, vector, label) => {
        const displayLabel = String(targetDraft.labels?.[index] || label);
        return {
          plain: displayLabel,
          tex: labelToTex(displayLabel),
        };
      },
      targetOptions: {
        targetDraftKey: targetDraft.key,
      },
      onResetAllTargets: () => {
        targetDraft.rows = typeof options.resetRows === "function"
          ? options.resetRows()
          : Array.from({ length: state.ambientDim }, () => Array(state.ambientDim).fill(0));
        targetDraft.labels = [];
        targetDraft.dirty = true;
        clearVectorTargetSession();
        state.lastWarning = `${object.name} target draft reset; click apply targets to update the matrix.`;
        syncObjectPanel();
        renderAll();
        return true;
      },
    });

    const targetActions = document.createElement("div");
    targetActions.className = "slice-target-source-line";
    const applyTargets = document.createElement("button");
    applyTargets.className = "slice-btn";
    applyTargets.type = "button";
    applyTargets.textContent = "apply targets";
    applyTargets.addEventListener("click", () => {
      try {
        const rows = typeof options.validateRows === "function"
          ? options.validateRows(targetDraft.rows)
          : cloneMatrixRows(targetDraft.rows, state.ambientDim);
        data[fieldKey] = rows;
        data[targetLabelsKey] = resizeVector(Array.isArray(targetDraft.labels) ? targetDraft.labels : [], state.ambientDim)
          .map((value) => String(value || ""));
        data.ambientDimension = state.ambientDim;
        clearMatrixTargetDraft(object, fieldKey);
        state.lastWarning = `Target ${editorLabel.toLowerCase()} applied.`;
        const handled = typeof options.afterMatrixChange === "function" && options.afterMatrixChange(object, {
          fieldKey,
          mode: "targets",
          message: state.lastWarning,
        }) === true;
        if (handled) return;
        syncObjectPanel();
        renderAll();
      } catch (error) {
        state.lastWarning = `${editorLabel} targets rejected: ${error.message}`;
        updateDebug();
      }
    });
    const draftNote = document.createElement("span");
    draftNote.className = "slice-target-note";
    draftNote.textContent = targetDraft.dirty ? "draft changes pending" : "targets edit a draft until applied";
    targetActions.append(applyTargets, draftNote);
    targetsPane.append(targetActions);

    function syncModeUi() {
      const activeMode = normalizeMatrixInputMode(data[modeKey]);
      data[modeKey] = activeMode;
      modes.querySelectorAll("[data-matrix-input-mode]").forEach((button) => {
        const active = button.dataset.matrixInputMode === activeMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      manualPane.hidden = activeMode !== "manual";
      importPane.hidden = activeMode !== "import";
      targetsPane.hidden = activeMode !== "targets";
      syncTargetSlotButtons();
    }

    function syncTargetSlotButtons() {
      targetsPane.querySelectorAll("[data-target-slot]").forEach((button) => {
        const slotIndex = Number(button.dataset.targetSlot);
        const active = targetSessionMatches(object, fieldKey, slotIndex);
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    panel.append(modes, manualPane, importPane, targetsPane);
    syncModeUi();
    container.append(panel);
  }

  function buildFrameParams(container, object) {
    const data = object.data || {};
    data.basis = data.basis === "moving" ? "moving" : "ambient";
    data.length = positiveNumber(data.length, 4);
    const wrap = document.createElement("div");
    wrap.className = "slice-param-pack";
    const basis = document.createElement("select");
    basis.className = "slice-select";
    basis.setAttribute("aria-label", "Cartesian frame basis");
    basis.innerHTML = `
      <option value="ambient">ambient e_i</option>
      <option value="moving">moving v_i</option>
    `;
    basis.value = data.basis;
    basis.addEventListener("change", () => {
      data.basis = basis.value === "moving" ? "moving" : "ambient";
      state.selectedVertex = null;
      renderAll();
    });
    const lengthLabel = document.createElement("span");
    lengthLabel.textContent = "length";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0.05";
    slider.max = "8";
    slider.step = "0.05";
    slider.value = String(clamp(data.length, 0.05, 8));
    slider.setAttribute("aria-label", "Frame length slider");
    const number = document.createElement("input");
    number.className = "slice-input slice-param-number";
    number.type = "text";
    number.inputMode = "decimal";
    number.value = fmt(data.length, 4);
    number.setAttribute("aria-label", "Frame length value");
    const sync = () => {
      slider.value = String(clamp(data.length, 0.05, 8));
      number.value = fmt(data.length, 4);
    };
    const updateFromSlider = (raw) => {
      data.length = clamp(finiteNumber(raw, data.length), 0.05, 8);
      sync();
      renderAll();
    };
    const commitText = () => {
      const parsed = parseRationalNumber(number.value);
      if (!parsed.ok || parsed.value <= 0) {
        state.lastWarning = "Frame length must be a positive number or fraction.";
        sync();
        renderAll();
        return;
      }
      data.length = parsed.value;
      sync();
      renderAll();
    };
    slider.addEventListener("input", () => updateFromSlider(slider.value));
    number.addEventListener("change", commitText);
    number.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitText();
        number.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        sync();
        number.blur();
      }
    });
    wrap.append(basis, lengthLabel, slider, number);
    container.appendChild(wrap);
  }

  function buildSphereParams(container, object) {
    const data = object.data || {};
    data.ambientDimension = state.ambientDim;
    data.center = finiteVector(data.center, state.ambientDim);
    data.centerInputMode = normalizeVectorInputMode(data.centerInputMode);
    const panel = document.createElement("div");
    panel.className = "slice-vector-panel";
    const radiusHost = document.createElement("span");
    radiusHost.className = "slice-param-pack";
    buildScalarParam(radiusHost, object, "radius", "size", 0.05, 6, 0.05);
    const centerHost = document.createElement("div");
    buildVectorInputEditor(centerHost, object, {
      fieldKey: "center",
      modeKey: "centerInputMode",
      label: "center",
    });
    panel.append(radiusHost, centerHost);
    container.appendChild(panel);
  }

  function buildPointParams(container, object) {
    buildVectorInputEditor(container, object, {
      fieldKey: "position",
      modeKey: "positionInputMode",
      label: "position",
      afterVectorChange: () => {
        if (state.selectedVertex?.objectId === object.id) {
          state.selectedVertex = { objectId: object.id, vertexKey: "point:0" };
        }
      },
    });
  }

  function buildVectorParams(container, object) {
    const data = object.data || {};
    data.label = String(data.label || "v").trim() || "v";
    const labelLine = document.createElement("label");
    labelLine.className = "slice-param-pack";
    const labelText = document.createElement("span");
    labelText.textContent = "label";
    const labelInput = document.createElement("input");
    labelInput.className = "slice-input slice-param-number";
    labelInput.type = "text";
    labelInput.value = data.label;
    labelInput.setAttribute("aria-label", "Vector displayed label");
    labelInput.addEventListener("change", () => {
      data.label = labelInput.value.trim() || "v";
      state.lastWarning = `Vector label set to ${data.label}.`;
      renderAll();
    });
    labelInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        labelInput.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        labelInput.value = data.label;
        labelInput.blur();
      }
    });
    labelLine.append(labelText, labelInput);
    container.append(labelLine);
    buildVectorInputEditor(container, object, {
      fieldKey: "vector",
      modeKey: "vectorInputMode",
      label: data.label,
      targetLabel: data.label,
    });
  }

  function buildDynkinReferencePicker(container, object, options = {}) {
    const data = object.data || {};
    object.data = data;
    const line = document.createElement("div");
    line.className = "slice-control-line";
    const label = document.createElement("span");
    label.className = "slice-row-label";
    label.textContent = options.label || "Dynkin";
    const select = document.createElement("select");
    select.className = "slice-select";
    select.setAttribute("aria-label", options.ariaLabel || "Dynkin reference");
    const choices = dynkinReferenceOptions(state.ambientDim, {
      includeRawTypes: !!options.includeRawTypes,
    });
    const currentValue = dynkinReferenceValueFromData(data, state.ambientDim, {
      preferRawType: !!options.includeRawTypes,
    });
    const value = choices.some((choice) => choice.value === currentValue) ? currentValue : defaultDynkinReferenceValue(state.ambientDim);
    if (value !== currentValue) {
      applyDynkinReferenceToData(data, value, state.ambientDim);
    }
    for (const choice of choices) {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = choice.label;
      select.append(option);
    }
    select.value = value;
    select.addEventListener("change", () => {
      object.data = data;
      applyDynkinReferenceToData(data, select.value, state.ambientDim);
      object.data = data;
      const handled = typeof options.afterChange === "function" && options.afterChange(object) === true;
      if (handled) return;
      state.activeTropicalDistrict = null;
      clearWeylInteraction(object.id);
      const reference = resolveDynkinReference(object.data, state.ambientDim);
      state.lastWarning = `${options.messageLabel || object.name} linked to ${reference.label}.`;
      syncObjectPanel();
      renderAll();
    });
    line.append(label, select);
    container.append(line);
  }

  function buildDynkinTypeParams(container, object) {
    object.kind = "dynkin";
    object.visibleProjection = false;
    object.visibleSlice = false;
    object.data = normalizeDynkinTypeData(object.data || {}, state.ambientDim);
    const data = object.data;
    const panel = document.createElement("div");
    panel.className = "slice-tropical-panel";
    const line = document.createElement("div");
    line.className = "slice-control-line";
    const label = document.createElement("span");
    label.className = "slice-row-label";
    label.textContent = "Dynkin";
    const select = document.createElement("select");
    select.className = "slice-select";
    select.setAttribute("aria-label", "Dynkin type");
    for (const optionData of weylDynkinOptions(state.ambientDim)) {
      const option = document.createElement("option");
      option.value = optionData.type;
      option.textContent = optionData.label;
      select.append(option);
    }
    select.value = data.dynkinType;
    select.addEventListener("change", () => {
      data.dynkinType = normalizeWeylDynkinType(select.value, state.ambientDim);
      data.dynkinRank = state.ambientDim;
      data.description = `Shared finite Dynkin type ${weylDynkinLabel(data.dynkinType, state.ambientDim)} for Weyl chambers, root/weight matrices, and Dynkin lattices.`;
      const warnings = refreshLinkedObjects({ warn: true });
      clearWeylInteraction();
      state.lastWarning = warnings[0] || `${object.name} set to ${weylDynkinLabel(data.dynkinType, state.ambientDim)}.`;
      syncObjectPanel();
      renderAll();
    });
    line.append(label, select);
    panel.append(line);
    container.append(panel);
  }

  function buildRootSetParams(container, object) {
    object.kind = "geometry";
    object.visibleSlice = false;
    object.data = normalizeRootSetData(object.data || {}, state.ambientDim);
    const data = object.data;
    const panel = document.createElement("div");
    panel.className = "slice-tropical-panel";

    buildDynkinReferencePicker(panel, object, {
      label: "Dynkin",
      messageLabel: "roots",
      afterChange: () => {
        object.data = normalizeRootSetData(object.data, state.ambientDim);
        const reference = resolveDynkinReference(object.data, state.ambientDim);
        state.selectedVertex = null;
        state.lastWarning = `roots linked to ${reference.label}.`;
        syncObjectPanel();
        renderAll();
        return true;
      },
    });

    const signModes = document.createElement("div");
    signModes.className = "slice-segmented";
    signModes.setAttribute("aria-label", "Root set sign mode");
    [
      ["all", "all roots"],
      ["positive", "positive roots"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.rootSignMode = mode;
      button.textContent = label;
      button.classList.toggle("active", data.rootSignMode === mode);
      button.addEventListener("click", () => {
        object.data = {
          ...object.data,
          rootSignMode: normalizeRootSetSignMode(mode),
        };
        state.selectedVertex = null;
        state.lastWarning = `Root set switched to ${label}.`;
        syncObjectPanel();
        renderAll();
      });
      signModes.append(button);
    });

    panel.append(signModes);
    container.append(panel);
  }

  function buildMatrixParams(container, object) {
    const data = object.data || {};
    data.matrixPresetKind = normalizeMatrixPresetKind(data.matrixPresetKind);
    refreshMatrixPresetFromDynkin(object);
    const panel = document.createElement("div");
    panel.className = "slice-matrix-panel";
    const sourceModes = document.createElement("div");
    sourceModes.className = "slice-segmented";
    sourceModes.setAttribute("aria-label", "Matrix source");
    [
      ["manual", "manual matrix"],
      ["simple-roots", "simple roots"],
      ["fundamental-weights", "fundamental weights"],
    ].forEach(([kind, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.matrixPresetKind = kind;
      button.textContent = label;
      button.classList.toggle("active", data.matrixPresetKind === kind);
      button.addEventListener("click", () => {
        const previousKind = data.matrixPresetKind;
        data.matrixPresetKind = normalizeMatrixPresetKind(kind);
        if (data.matrixPresetKind === "manual") {
          data.dynkinSourceId = null;
          data.matrixColumnLabels = Array.from({ length: state.ambientDim }, (_, index) => `v_${index + 1}`);
          state.lastWarning = "Matrix switched to manual input.";
        } else {
          const referenceValue = previousKind === "manual"
            ? defaultDynkinReferenceValue(state.ambientDim)
            : dynkinReferenceValueFromData(data, state.ambientDim);
          applyDynkinReferenceToData(data, referenceValue, state.ambientDim);
          refreshMatrixPresetFromDynkin(object, { warn: true });
          state.lastWarning = `${matrixPresetDisplayName(data.matrixPresetKind)} matrix generated.`;
        }
        syncObjectPanel();
        renderAll();
      });
      sourceModes.append(button);
    });
    panel.append(sourceModes);
    if (data.matrixPresetKind === "manual") {
      container.append(panel);
      buildMatrixInputEditor(container, object, {
        fieldKey: "matrixRows",
        modeKey: "matrixInputMode",
        targetLabelsKey: "matrixTargetLabels",
        columnLabel: (index) => ({
          plain: matrixColumnLabels(data, "v", state.ambientDim)[index],
          tex: labelToTex(matrixColumnLabels(data, "v", state.ambientDim)[index]),
        }),
      });
      return;
    }
    buildDynkinReferencePicker(panel, object, {
      label: "Dynkin",
      messageLabel: matrixPresetDisplayName(data.matrixPresetKind),
      afterChange: () => refreshMatrixPresetFromDynkin(object, { warn: true }),
    });
    container.append(panel);
  }

  function matrixObjectOptions() {
    return state.objects.filter((candidate) => objectTypeKey(candidate) === "matrix");
  }

  function normalizeLatticeDataInPlace(object, n = state.ambientDim) {
    const data = object?.data && typeof object.data === "object" ? object.data : {};
    const normalized = normalizeLatticeData(data, n);
    for (const key of Object.keys(data)) delete data[key];
    Object.assign(data, normalized);
    if (object) object.data = data;
    return data;
  }

  function normalizeActiveLatticeObject(object, options = {}) {
    if (!object || objectTypeKey(object) !== "lattice") return "";
    object.kind = "lattice";
    object.labels = false;
    const data = normalizeLatticeDataInPlace(object, state.ambientDim);
    data.name = object.name;
    if (data.basisMode === "dynkin") data.showLatticePoints = true;
    return options.refreshBasis === false ? "" : refreshLatticeBasis(object, { warn: options.warn !== false });
  }

  function latticeMutationMessage(message, object) {
    return typeof message === "function" ? message(object) : String(message || "");
  }

  function latticeBoundChangeStatus(object, before, after) {
    if (!before || !after || after.displayCapped || after.enumerationCapped) return "";
    if (before.visible !== after.visible || before.drawn !== after.drawn) return "";
    const ambientChanged = before.enumerated !== after.enumerated;
    const ambientText = ambientChanged
      ? `ambient lattice points changed ${before.enumerated} -> ${after.enumerated}, `
      : "";
    return `${object.name}: ${ambientText}visible projected points unchanged inside current ${viewportBoundDescription()}.`;
  }

  function commitLatticeParamChange(object, mutate, options = {}) {
    if (!object || objectTypeKey(object) !== "lattice") {
      if (typeof mutate === "function") mutate(object?.data || {});
      if (options.syncPanel !== false) syncObjectPanel();
      renderAll();
      return "";
    }
    const beforeStats = latticeProjectionStatsCache.get(object.id);
    if (typeof mutate === "function") mutate(object.data || {});
    const warning = normalizeActiveLatticeObject(object, {
      refreshBasis: options.refreshBasis !== false,
      warn: true,
    });
    state.selectedVertex = null;
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    const message = warning || latticeMutationMessage(options.message, object);
    if (message) state.lastWarning = message;
    if (options.syncPanel !== false) syncObjectPanel();
    renderAll();
    updateLatticeBoundSummaryElements();
    if (options.boundChange) {
      const nextStats = latticeProjectionStatsCache.get(object.id);
      const unchangedStatus = latticeBoundChangeStatus(object, beforeStats, nextStats);
      if (unchangedStatus) {
        state.lastWarning = unchangedStatus;
        updateDebug();
        updateLatticeBoundSummaryElements();
      }
    }
    return warning;
  }

  function latticeProjectionSummaryText(object) {
    const stats = latticeProjectionStatsCache.get(object?.id);
    if (!stats) return `drawn - / visible - / ambient -`;
    if (stats.showPoints === false) return `points hidden / ambient ${stats.enumerated}`;
    const suppressed = finiteNumber(stats.suppressedByRootLattice, 0);
    return `${stats.drawn} drawn / ${stats.visible} visible / ${stats.enumerated} ambient${suppressed ? ` / ${suppressed} root-owned` : ""}`;
  }

  function updateLatticeBoundSummaryElements() {
    document.querySelectorAll("[data-lattice-bound-summary]").forEach((element) => {
      const object = state.objects.find((candidate) => candidate.id === element.dataset.latticeBoundSummary);
      if (object) element.textContent = latticeProjectionSummaryText(object);
    });
  }

  function syncDynkinLatticeDisplayName(object) {
    if (!object || objectTypeKey(object) !== "lattice") return;
    const kind = normalizeDynkinLatticeKind(object.data?.dynkinLatticeKind);
    const current = String(object.name || "").trim().toLowerCase();
    if (!current || current === "lattice" || current === "root lattice" || current === "weight lattice") {
      object.name = kind === "weight" ? "weight lattice" : "root lattice";
      if (object.data) object.data.name = object.name;
    }
  }

  function syncLmfdbLatticeDisplayName(object) {
    if (!object || objectTypeKey(object) !== "lattice") return;
    const current = String(object.name || "").trim().toLowerCase();
    if (!current || current === "lattice" || current === "lmfdb field lattice" || current === "o_f lattice") {
      object.name = "O_F lattice";
      if (object.data) object.data.name = object.name;
    }
  }

  function applyLmfdbFieldToLattice(objectId, field, options = {}) {
    let object = state.objects.find((candidate) => candidate.id === objectId);
    if (!object || objectTypeKey(object) !== "lattice") {
      state.lastWarning = "LMFDB lattice object is no longer available.";
      renderAll();
      return false;
    }
    const normalized = normalizeLmfdbFieldData(field);
    if (!normalized) throw new Error("No usable LMFDB field was loaded.");
    const mode = normalizeEmbeddingCoordinateMode(object.data?.embeddingCoordinateMode);
    const rows = lmfdbBasisRowsFromField(normalized, mode, normalized.degree);
    if (normalized.degree !== state.ambientDim) {
      if (!options.allowResize) throw new Error(`Field degree ${normalized.degree} does not match current R^${state.ambientDim}.`);
      changeAmbientDimension(normalized.degree);
      object = state.objects.find((candidate) => candidate.id === objectId);
      if (!object || objectTypeKey(object) !== "lattice") {
        state.lastWarning = "LMFDB lattice object disappeared after resizing.";
        renderAll();
        return false;
      }
    }
    const draft = lmfdbFieldSearchDraftFor(object);
    draft.pendingField = null;
    draft.status = normalized.warnings.length
      ? `Loaded ${normalized.label}; ${normalized.warnings[0]}`
      : `Loaded ${normalized.label}.`;
    draft.statusKind = "ok";
    commitLatticeParamChange(object, (latticeData) => {
      clearMatrixTargetDraft(object, "basisRows");
      latticeData.basisMode = "lmfdb-field";
      latticeData.lmfdbQuery = normalized.query || normalized.label;
      latticeData.lmfdbField = normalized;
      latticeData.embeddingCoordinateMode = mode;
      latticeData.basisRows = rows;
      latticeData.basisTargetLabels = [];
      syncLmfdbLatticeDisplayName(object);
    }, {
      message: `${object.name} loaded from LMFDB ${normalized.label} in ${embeddingCoordinateModeLabel(mode)} coordinates.`,
    });
    return true;
  }

  async function searchLmfdbFieldForLattice(objectId) {
    const object = state.objects.find((candidate) => candidate.id === objectId);
    if (!object || objectTypeKey(object) !== "lattice") return;
    const data = object.data || {};
    const draft = lmfdbFieldSearchDraftFor(object);
    if (draft.loading) return;
    const proxy = lmfdbProxyUrl();
    data.lmfdbQuery = String(data.lmfdbQuery || "").trim();
    if (!proxy) {
      draft.status = "LMFDB proxy URL is not configured.";
      draft.statusKind = "error";
      draft.pendingField = null;
      renderAll();
      return;
    }
    if (!data.lmfdbQuery) {
      draft.status = "Enter an LMFDB label, nickname, or monic integer polynomial.";
      draft.statusKind = "error";
      draft.pendingField = null;
      renderAll();
      return;
    }
    draft.loading = true;
    draft.status = "Searching LMFDB...";
    draft.statusKind = "";
    draft.pendingField = null;
    renderAll();
    let applied = false;
    try {
      const response = await fetch(buildLmfdbProxyFieldUrl(proxy, data.lmfdbQuery), {
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `LMFDB proxy returned HTTP ${response.status}.`);
      const field = normalizeLmfdbPayloadForLattice(payload);
      if (field.degree !== state.ambientDim) {
        draft.pendingField = field;
        draft.status = `LMFDB ${field.label} has degree ${field.degree}; current ambient space is R^${state.ambientDim}.`;
        draft.statusKind = "confirm";
      } else {
        draft.loading = false;
        applied = applyLmfdbFieldToLattice(objectId, field);
      }
    } catch (error) {
      draft.status = error.message || "LMFDB search failed.";
      draft.statusKind = "error";
      draft.pendingField = null;
    } finally {
      draft.loading = false;
      if (!applied) renderAll();
    }
  }

  function buildLmfdbLatticeControls(panel, object) {
    const data = object.data || {};
    data.lmfdbQuery = String(data.lmfdbQuery || "Qi");
    data.embeddingCoordinateMode = normalizeEmbeddingCoordinateMode(data.embeddingCoordinateMode);
    const draft = lmfdbFieldSearchDraftFor(object);

    const searchRow = document.createElement("div");
    searchRow.className = "slice-row";
    const searchLabel = document.createElement("span");
    searchLabel.className = "slice-row-label";
    searchLabel.textContent = "LMFDB";
    const searchControls = document.createElement("div");
    searchControls.className = "slice-control-line";
    const input = document.createElement("input");
    input.className = "slice-input";
    input.type = "text";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.value = data.lmfdbQuery;
    input.placeholder = "2.0.4.1, Qi, Qsqrt5, x^2-x-1";
    input.setAttribute("aria-label", "LMFDB number field query");
    input.addEventListener("input", () => {
      data.lmfdbQuery = input.value;
      draft.pendingField = null;
      if (draft.statusKind === "confirm") {
        draft.status = "";
        draft.statusKind = "";
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      searchLmfdbFieldForLattice(object.id);
    });
    const button = document.createElement("button");
    button.className = "slice-btn";
    button.type = "button";
    button.textContent = draft.loading ? "searching" : "search";
    button.disabled = draft.loading || !lmfdbProxyUrl();
    button.addEventListener("click", () => searchLmfdbFieldForLattice(object.id));
    searchControls.append(input, button);
    searchRow.append(searchLabel, searchControls);
    panel.append(searchRow);

    const statusRow = document.createElement("div");
    statusRow.className = "slice-row";
    const statusLabel = document.createElement("span");
    statusLabel.className = "slice-row-label";
    statusLabel.textContent = "field";
    const status = document.createElement("span");
    status.className = "slice-target-note";
    const loaded = normalizeLmfdbFieldData(data.lmfdbField);
    status.textContent = !lmfdbProxyUrl()
      ? "LMFDB proxy URL is not configured."
      : draft.status || (loaded
        ? `LMFDB ${loaded.label}, degree ${loaded.degree}, signature (${loaded.r1}, ${loaded.r2})`
        : "search to load O_F from LMFDB");
    statusRow.append(statusLabel, status);
    panel.append(statusRow);

    if (draft.pendingField) {
      const confirmRow = document.createElement("div");
      confirmRow.className = "slice-row";
      const label = document.createElement("span");
      label.className = "slice-row-label";
      label.textContent = "dimension";
      const controls = document.createElement("div");
      controls.className = "slice-control-line";
      const confirm = document.createElement("button");
      confirm.className = "slice-btn";
      confirm.type = "button";
      confirm.textContent = `set n=${draft.pendingField.degree} and load`;
      confirm.addEventListener("click", () => {
        try {
          applyLmfdbFieldToLattice(object.id, draft.pendingField, { allowResize: true });
        } catch (error) {
          draft.status = error.message || "LMFDB field load failed.";
          draft.statusKind = "error";
          renderAll();
        }
      });
      const cancel = document.createElement("button");
      cancel.className = "slice-btn";
      cancel.type = "button";
      cancel.textContent = "cancel";
      cancel.addEventListener("click", () => {
        draft.pendingField = null;
        draft.status = "LMFDB load cancelled.";
        draft.statusKind = "";
        renderAll();
      });
      const note = document.createElement("span");
      note.className = "slice-target-note";
      note.textContent = `loaded field degree ${draft.pendingField.degree}; current n is ${state.ambientDim}`;
      controls.append(confirm, cancel, note);
      confirmRow.append(label, controls);
      panel.append(confirmRow);
    }

    const modeRow = document.createElement("div");
    modeRow.className = "slice-row";
    const modeLabel = document.createElement("span");
    modeLabel.className = "slice-row-label";
    modeLabel.textContent = "complex";
    const modeControls = document.createElement("div");
    modeControls.className = "slice-segmented";
    modeControls.setAttribute("aria-label", "Complex embedding coordinate mode");
    [
      ["raw", "raw Re/Im"],
      ["minkowski", "sqrt(2) scaled"],
    ].forEach(([mode, label]) => {
      const modeButton = document.createElement("button");
      modeButton.className = "slice-segment";
      modeButton.type = "button";
      modeButton.dataset.embeddingCoordinateMode = mode;
      modeButton.textContent = label;
      modeButton.classList.toggle("active", data.embeddingCoordinateMode === mode);
      modeButton.addEventListener("click", () => {
        commitLatticeParamChange(object, (latticeData) => {
          latticeData.basisMode = "lmfdb-field";
          latticeData.embeddingCoordinateMode = normalizeEmbeddingCoordinateMode(mode);
        }, {
          message: `${object.name} complex embedding coordinates set to ${label}.`,
        });
      });
      modeControls.append(modeButton);
    });
    modeRow.append(modeLabel, modeControls);
    panel.append(modeRow);
  }

  function buildDynkinLatticeKindControls(panel, object) {
    const data = object.data;
    const row = document.createElement("div");
    row.className = "slice-row";
    const label = document.createElement("span");
    label.className = "slice-row-label";
    label.textContent = "lattice kind";
    const controls = document.createElement("div");
    controls.className = "slice-segmented";
    controls.setAttribute("aria-label", "Dynkin lattice kind");
    [
      ["root", "root lattice"],
      ["weight", "weight lattice"],
    ].forEach(([kind, text]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.dynkinLatticeKind = kind;
      button.textContent = text;
      button.classList.toggle("active", data.dynkinLatticeKind === kind);
      button.addEventListener("click", () => {
        commitLatticeParamChange(object, (latticeData) => {
          clearMatrixTargetDraft(object, "basisRows");
          latticeData.basisMode = "dynkin";
          latticeData.dynkinLatticeKind = normalizeDynkinLatticeKind(kind);
          latticeData.showLatticePoints = true;
          syncDynkinLatticeDisplayName(object);
        }, {
          message: (latticeObject) => `${latticeObject.name} regenerated as a ${text}.`,
        });
      });
      controls.append(button);
    });
    row.append(label, controls);
    panel.append(row);
  }

  function buildLatticeBoundControls(panel, object) {
    const data = object.data;
    data.latticeBoundShape = normalizeLatticeBoundShape(data.latticeBoundShape);
    data.latticeBoundRadius = normalizeLatticeBoundRadius(data.latticeBoundRadius);
    const row = document.createElement("div");
    row.className = "slice-row";
    const label = document.createElement("span");
    label.className = "slice-row-label";
    label.textContent = "point bound";

    const controls = document.createElement("div");
    controls.className = "slice-control-line";
    const modes = document.createElement("div");
    modes.className = "slice-segmented";
    modes.setAttribute("aria-label", "Lattice point bound shape");
    [
      ["ball", "D^n"],
      ["box", "box"],
    ].forEach(([shape, text]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.latticeBoundShape = shape;
      button.textContent = text;
      button.classList.toggle("active", data.latticeBoundShape === shape);
      button.addEventListener("click", () => {
        commitLatticeParamChange(object, (latticeData) => {
          latticeData.latticeBoundShape = normalizeLatticeBoundShape(shape);
        }, {
          message: (latticeObject) => `${latticeObject.name} point bound set to ${latticeBoundLabel(latticeObject.data?.latticeBoundShape)}.`,
          refreshBasis: false,
          boundChange: true,
        });
      });
      modes.append(button);
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0.1";
    slider.max = "12";
    slider.step = "0.25";
    slider.value = String(data.latticeBoundRadius);
    slider.setAttribute("aria-label", "Lattice point bound radius slider");

    const radius = document.createElement("input");
    radius.className = "slice-input slice-param-number";
    radius.type = "text";
    radius.inputMode = "decimal";
    radius.value = fmt(data.latticeBoundRadius, 4);
    radius.setAttribute("aria-label", "Lattice point bound radius value");

    const summary = document.createElement("span");
    summary.className = "slice-target-note";
    summary.dataset.latticeBoundSummary = object.id;
    summary.textContent = latticeProjectionSummaryText(object);

    const syncRadiusControls = () => {
      const value = normalizeLatticeBoundRadius(object.data?.latticeBoundRadius);
      slider.value = String(value);
      radius.value = fmt(value, 4);
      summary.textContent = latticeProjectionSummaryText(object);
    };
    const commitRadius = (raw, meta = {}) => {
      const next = normalizeLatticeBoundRadius(raw);
      commitLatticeParamChange(object, (latticeData) => {
        latticeData.latticeBoundRadius = next;
      }, {
        message: `${object.name} point bound radius ${fmt(next, 2)}.`,
        refreshBasis: false,
        syncPanel: meta.syncPanel === true,
        boundChange: true,
      });
      syncRadiusControls();
    };

    slider.addEventListener("input", () => commitRadius(slider.value));
    attachRationalInputBehavior(radius, {
      digits: 4,
      wheelStep: 0.25,
      wheelMin: 0.1,
      wheelMax: 12,
      currentValue: () => object.data?.latticeBoundRadius ?? data.latticeBoundRadius,
      validateValue: (value) => value > 0,
      invalidMessage: "Lattice point-bound radius must be a positive number or fraction.",
      onCommit: (value) => commitRadius(value),
      afterCommit: syncRadiusControls,
      onInvalid: () => {
        syncRadiusControls();
        updateDebug();
      },
    });

    controls.append(modes, slider, radius, summary);
    row.append(label, controls);
    panel.append(row);
  }

  function buildLatticeParams(container, object) {
    normalizeActiveLatticeObject(object, { warn: false });
    const data = object.data;
    const dynkinBacked = data.basisMode === "dynkin";
    if (dynkinBacked) data.showLatticePoints = true;
    const panel = document.createElement("div");
    panel.className = "slice-matrix-panel";

    const basisModes = document.createElement("div");
    basisModes.className = "slice-segmented";
    basisModes.setAttribute("aria-label", "Lattice basis mode");
    [
      ["matrix-input", "matrix input"],
      ["matrix-object", "matrix object"],
      ["dynkin", "Dynkin"],
      ["lmfdb-field", "LMFDB field"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.latticeBasisMode = mode;
      button.textContent = label;
      button.classList.toggle("active", data.basisMode === mode);
      button.addEventListener("click", () => {
        commitLatticeParamChange(object, (latticeData) => {
          clearMatrixTargetDraft(object, "basisRows");
          latticeData.basisMode = normalizeLatticeBasisMode(mode);
          if (latticeData.basisMode === "matrix-object" && !latticeData.matrixSourceId) {
            latticeData.matrixSourceId = matrixObjectOptions()[0]?.id || null;
          }
          if (latticeData.basisMode === "dynkin" && !latticeData.dynkinSourceId) {
            applyDynkinReferenceToData(latticeData, defaultDynkinReferenceValue(state.ambientDim), state.ambientDim);
          }
          if (latticeData.basisMode === "lmfdb-field" && !latticeData.lmfdbQuery) {
            latticeData.lmfdbQuery = "Qi";
          }
          if (latticeData.basisMode === "dynkin") {
            latticeData.showLatticePoints = true;
            syncDynkinLatticeDisplayName(object);
          }
        }, {
          message: `Lattice basis mode switched to ${label}.`,
        });
      });
      basisModes.append(button);
    });

    const toggles = document.createElement("div");
    toggles.className = "slice-target-source-line";
    [
      ["showLatticePoints", "points"],
    ].forEach(([key, label]) => {
      const wrap = document.createElement("label");
      wrap.className = "slice-inline-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = data[key] !== false;
      checkbox.addEventListener("change", () => {
        const checked = checkbox.checked;
        commitLatticeParamChange(object, (latticeData) => {
          latticeData[key] = checked;
        }, {
          message: `${label} ${checked ? "shown" : "hidden"}.`,
          refreshBasis: false,
          syncPanel: false,
        });
      });
      wrap.append(checkbox, document.createTextNode(label));
      toggles.append(wrap);
    });

    panel.append(basisModes);
    if (!dynkinBacked) panel.append(toggles);

    if (data.basisMode === "matrix-input") {
      const editorHost = document.createElement("div");
      panel.append(editorHost);
      buildMatrixInputEditor(editorHost, object, {
        fieldKey: "basisRows",
        modeKey: "basisInputMode",
        targetLabelsKey: "basisTargetLabels",
        label: "Lattice basis",
        columnLabel: (index) => ({ plain: `b_${index + 1}`, tex: `b_{${index + 1}}` }),
        validateRows: (rows) => validateFullRankMatrixRows(rows, state.ambientDim, "Lattice basis"),
        resetVector: (index) => Array.from({ length: state.ambientDim }, (_, coordinate) => (coordinate === index ? 1 : 0)),
        resetRows: () => frameRows(identityFrame(state.ambientDim)),
        afterModeChange: (latticeObject, meta) => {
          commitLatticeParamChange(latticeObject, null, {
            message: meta.message || `Lattice basis ${meta.text} is active.`,
            refreshBasis: false,
            syncPanel: false,
          });
          return true;
        },
        afterMatrixChange: (latticeObject, meta) => {
          commitLatticeParamChange(latticeObject, (latticeData) => {
            latticeData.basisMode = "matrix-input";
          }, {
            message: meta.message,
          });
          return true;
        },
      });
    } else if (data.basisMode === "matrix-object") {
      const line = document.createElement("div");
      line.className = "slice-control-line";
      const label = document.createElement("span");
      label.className = "slice-row-label";
      label.textContent = "matrix";
      const select = document.createElement("select");
      select.className = "slice-select";
      select.setAttribute("aria-label", "Matrix object basis source");
      const matrices = matrixObjectOptions();
      if (!matrices.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "no matrix objects";
        select.append(option);
        select.disabled = true;
      } else {
        matrices.forEach((matrixObject) => {
          const option = document.createElement("option");
          option.value = matrixObject.id;
          option.textContent = matrixObject.name;
          select.append(option);
        });
        if (!data.matrixSourceId || !matrices.some((matrixObject) => matrixObject.id === data.matrixSourceId)) {
          data.matrixSourceId = matrices[0].id;
        }
        select.value = data.matrixSourceId;
      }
      select.addEventListener("change", () => {
        const sourceName = select.options[select.selectedIndex]?.textContent || "";
        commitLatticeParamChange(object, (latticeData) => {
          clearMatrixTargetDraft(object, "basisRows");
          latticeData.matrixSourceId = select.value || null;
        }, {
          message: `Lattice linked to matrix ${sourceName}.`,
        });
      });
      line.append(label, select);
      panel.append(line);
    } else if (data.basisMode === "lmfdb-field") {
      buildLmfdbLatticeControls(panel, object);
    } else {
      buildDynkinLatticeKindControls(panel, object);
      buildDynkinReferencePicker(panel, object, {
        label: "Dynkin",
        messageLabel: "lattice",
        includeRawTypes: true,
        afterChange: (latticeObject) => {
          const reference = resolveDynkinReference(latticeObject.data, state.ambientDim);
          clearMatrixTargetDraft(latticeObject, "basisRows");
          commitLatticeParamChange(latticeObject, null, {
            message: `lattice linked to ${reference.label}.`,
          });
          return true;
        },
      });
    }

    buildLatticeBoundControls(panel, object);

    container.append(panel);
  }

  function fallbackFormulaQMatrix(data) {
    const n = state.ambientDim;
    if (Array.isArray(data.quadraticMatrix)) {
      return Array.from({ length: n }, (_, row) =>
        resizeVector(Array.isArray(data.quadraticMatrix[row]) ? data.quadraticMatrix[row] : [], n)
      );
    }
    if (Array.isArray(data.formulaPolynomial?.quadratic)) {
      return Array.from({ length: n }, (_, row) =>
        resizeVector(Array.isArray(data.formulaPolynomial.quadratic[row]) ? data.formulaPolynomial.quadratic[row] : [], n)
      );
    }
    const identity = identityFrame(n);
    return frameRows(identity);
  }

  function formatFormulaCoefficient(value) {
    return fmt(value, 6);
  }

  function quadraticFormulaText(matrix, relation, rhs) {
    const terms = [];
    const n = matrix.length;
    for (let row = 0; row < n; row += 1) {
      for (let col = row; col < n; col += 1) {
        const coefficient = row === col ? matrix[row][col] : 2 * matrix[row][col];
        if (Math.abs(coefficient) <= 1e-12) continue;
        const variable = row === col ? `x${row + 1}^2` : `x${row + 1}*x${col + 1}`;
        const absCoefficient = Math.abs(coefficient);
        const body = Math.abs(absCoefficient - 1) <= 1e-12 ? variable : `${formatFormulaCoefficient(absCoefficient)}*${variable}`;
        terms.push({ sign: coefficient < 0 ? "-" : "+", body });
      }
    }
    if (!terms.length) return `0 ${relation} ${formatFormulaCoefficient(rhs)}`;
    const first = terms[0].sign === "-" ? `-${terms[0].body}` : terms[0].body;
    const rest = terms.slice(1).map((term) => ` ${term.sign} ${term.body}`).join("");
    return `${first}${rest} ${relation} ${formatFormulaCoefficient(rhs)}`;
  }

  function validateSymmetricMatrix(rows, n = state.ambientDim) {
    if (!Array.isArray(rows) || rows.length !== n || rows.some((row) => !Array.isArray(row) || row.length !== n)) {
      throw new Error(`Q matrix needs ${n} x ${n} entries.`);
    }
    const matrix = rows.map((row) => row.map((value) => finiteNumber(value, NaN)));
    const maxAbs = Math.max(1, ...matrix.flat().map((value) => Math.abs(value)));
    const tolerance = Math.max(1e-9, maxAbs * 1e-9);
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!Number.isFinite(matrix[row][col])) throw new Error(`Q entry row ${row + 1}, column ${col + 1} is not finite.`);
        if (Math.abs(matrix[row][col] - matrix[col][row]) > tolerance) {
          throw new Error(`Q matrix must be symmetric; entries (${row + 1}, ${col + 1}) and (${col + 1}, ${row + 1}) differ.`);
        }
      }
    }
    if (!matrix.some((row) => row.some((value) => Math.abs(value) > tolerance))) {
      throw new Error("Q matrix needs at least one nonzero entry.");
    }
    return matrix.map((row, rowIndex) => row.map((value, colIndex) => (value + matrix[colIndex][rowIndex]) / 2));
  }

  function compileQuadraticMatrixFormula(rows, relation, rhsRaw, n = state.ambientDim) {
    const normalizedRelation = relation === ">=" || relation === "=" ? relation : "<=";
    const rhs = parseRationalNumber(rhsRaw);
    if (!rhs.ok || !Number.isFinite(rhs.value)) throw new Error("Q right-hand side must be a finite rational value.");
    const matrix = validateSymmetricMatrix(rows, n);
    const polynomial = zeroFormulaPolynomial(n);
    polynomial.constant = -rhs.value;
    polynomial.quadratic = matrix.map((row) => row.slice());
    const formula = quadraticFormulaText(matrix, normalizedRelation, rhs.value);
    const formulaAst = compileNumericFormulaRelation(splitFormulaRelation(formula), n);
    return {
      formulaInputMode: "import-q",
      formula,
      quadraticMatrix: matrix,
      quadraticRelation: normalizedRelation,
      quadraticRhs: rhs.value,
      formulaRelation: normalizedRelation,
      formulaStrict: false,
      formulaAst,
      formulaRenderMode: "exact",
      formulaPolynomial: cleanFormulaPolynomial(polynomial, n),
    };
  }

  function buildFormulaParams(container, object) {
    const data = object.data || {};
    data.formulaInputMode = normalizeFormulaInputMode(data.formulaInputMode);
    const panel = document.createElement("div");
    panel.className = "slice-formula-panel";

    const modes = document.createElement("div");
    modes.className = "slice-segmented";
    modes.setAttribute("aria-label", "Formula input mode");
    [
      ["formula", "formula"],
      ["import-q", "import Q"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.formulaInputMode = mode;
      button.textContent = label;
      button.classList.toggle("active", data.formulaInputMode === mode);
      button.addEventListener("click", () => {
        data.formulaInputMode = mode;
        state.lastWarning = mode === "formula" ? "Formula input mode is active." : "Q matrix import is active.";
        modes.querySelectorAll("[data-formula-input-mode]").forEach((entry) => {
          entry.classList.toggle("active", entry.dataset.formulaInputMode === mode);
        });
        formulaPane.hidden = mode !== "formula";
        importPane.hidden = mode !== "import-q";
        updateDebug();
      });
      modes.append(button);
    });

    const formulaPane = document.createElement("div");
    formulaPane.className = "slice-formula-mode-panel";
    formulaPane.hidden = data.formulaInputMode !== "formula";
    const textarea = document.createElement("textarea");
    textarea.className = "slice-textarea slice-formula-textarea";
    textarea.dataset.formulaText = "true";
    textarea.spellcheck = false;
    textarea.value = data.formula || "x1^2 + x2^2 <= 1";
    textarea.setAttribute("aria-label", "Formula relation");
    textarea.placeholder = "x1^2 + x2^2 <= 1";
    const formulaApply = document.createElement("button");
    formulaApply.className = "slice-btn";
    formulaApply.type = "button";
    formulaApply.dataset.formulaApply = "true";
    formulaApply.textContent = "apply formula";
    const applyFormula = () => applyFormulaTextInput(object, textarea.value);
    formulaApply.addEventListener("click", applyFormula);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyFormula();
      } else if (event.key === "Escape") {
        event.preventDefault();
        textarea.value = data.formula || "x1^2 + x2^2 <= 1";
        textarea.blur();
      }
    });
    formulaPane.append(textarea, formulaApply);

    const importPane = document.createElement("div");
    importPane.className = "slice-formula-mode-panel";
    importPane.hidden = data.formulaInputMode !== "import-q";
    const matrixInput = document.createElement("textarea");
    matrixInput.className = "slice-textarea slice-formula-matrix-textarea";
    matrixInput.dataset.formulaQImport = "true";
    matrixInput.spellcheck = false;
    matrixInput.value = matrixRowsText(fallbackFormulaQMatrix(data));
    matrixInput.setAttribute("aria-label", "Q matrix Rows import");
    matrixInput.placeholder = "Paste matrix_calculator Rows for symmetric Q";
    const importControls = document.createElement("div");
    importControls.className = "slice-formula-import-controls";
    const relation = document.createElement("select");
    relation.className = "slice-select";
    relation.dataset.formulaQRelation = "true";
    relation.setAttribute("aria-label", "Q relation");
    ["=", "<=", ">="].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      relation.append(option);
    });
    relation.value = ["=", "<=", ">="].includes(data.quadraticRelation) ? data.quadraticRelation : data.formulaRelation || "<=";
    const rhs = document.createElement("input");
    rhs.className = "slice-input slice-param-number";
    rhs.type = "text";
    rhs.inputMode = "decimal";
    rhs.dataset.formulaQRhs = "true";
    rhs.value = formatRationalInputValue(data.quadraticRhs ?? 1);
    rhs.setAttribute("aria-label", "Q right-hand side");
    attachRationalInputBehavior(rhs, {
      currentValue: () => data.quadraticRhs ?? 1,
      invalidMessage: "Q right-hand side must be a finite rational value.",
      onCommit: () => {},
      onInvalid: () => updateDebug(),
      wheel: false,
      formatCommittedValue: false,
    });
    const importApply = document.createElement("button");
    importApply.className = "slice-btn";
    importApply.type = "button";
    importApply.dataset.formulaQApply = "true";
    importApply.textContent = "apply import";
    const applyImport = () => applyFormulaMatrixImport(object, matrixInput.value, relation.value, rhs.value);
    importApply.addEventListener("click", applyImport);
    matrixInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyImport();
      } else if (event.key === "Escape") {
        event.preventDefault();
        matrixInput.value = matrixRowsText(fallbackFormulaQMatrix(data));
        matrixInput.blur();
      }
    });
    importControls.append(relation, rhs, importApply);
    importPane.append(matrixInput, importControls);

    panel.append(modes, formulaPane, importPane);
    container.appendChild(panel);
  }

  function applyFormulaTextInput(object, rawFormula) {
    try {
      const candidate = {
        formulaInputMode: "formula",
        formula: String(rawFormula || "").trim(),
        ...compileFormulaRelation(rawFormula, state.ambientDim),
      };
      delete candidate.quadraticMatrix;
      delete candidate.quadraticRelation;
      delete candidate.quadraticRhs;
      object.kind = "formula";
      object.visibleProjection = false;
      object.visibleSlice = true;
      object.data = {
        ...object.data,
        ...candidate,
        kind: "formula",
        objectType: "formula-set",
        ambientDimension: state.ambientDim,
        name: object.name,
      };
      delete object.data.quadraticMatrix;
      delete object.data.quadraticRelation;
      delete object.data.quadraticRhs;
      if (candidate.formulaRenderMode === "numeric") {
        const strictNote = candidate.formulaStrict ? " Strict inequality is rendered as a closed boundary." : "";
        state.lastWarning = `Formula applied with numerical implicit renderer.${strictNote}`;
      } else {
      state.lastWarning = candidate.formulaStrict
          ? "Formula applied. Strict inequality is rendered as a closed boundary."
          : "Formula applied.";
      }
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      renderAll();
    } catch (error) {
      state.lastWarning = `Formula rejected: ${error.message}`;
      updateDebug();
    }
  }

  function applyFormulaMatrixImport(object, rawRows, relation, rhsRaw) {
    try {
      const rows = parseMatrixRows(rawRows, state.ambientDim, "Q matrix");
      const candidate = compileQuadraticMatrixFormula(rows, relation, rhsRaw, state.ambientDim);
      object.kind = "formula";
      object.visibleProjection = false;
      object.visibleSlice = true;
      object.data = {
        ...object.data,
        ...candidate,
        kind: "formula",
        objectType: "formula-set",
        ambientDimension: state.ambientDim,
        name: object.name,
      };
      state.lastWarning = "Q matrix formula imported.";
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      renderAll();
    } catch (error) {
      state.lastWarning = `Q import rejected: ${error.message}`;
      updateDebug();
    }
  }

  function buildTropicalParams(container, object) {
    const data = object.data || {};
    data.tropicalConvention = normalizeTropicalConvention(data.tropicalConvention);
    data.showDistricts = data.showDistricts !== false;
    data.tropicalDistrictLabelDensity = normalizeTropicalDistrictLabelDensity(data.tropicalDistrictLabelDensity);
    data.tropicalNotationMode = normalizeTropicalNotationMode(data.tropicalNotationMode);
    const panel = document.createElement("div");
    panel.className = "slice-tropical-panel";

    const modes = document.createElement("div");
    modes.className = "slice-segmented";
    modes.setAttribute("aria-label", "Tropical convention");
    ["max", "min"].forEach((mode) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.tropicalConvention = mode;
      button.textContent = mode;
      button.classList.toggle("active", data.tropicalConvention === mode);
      button.addEventListener("click", () => {
        setTropicalConvention(object, mode, data.tropicalNotationMode);
      });
      modes.append(button);
    });

    const notationModes = document.createElement("div");
    notationModes.className = "slice-segmented";
    notationModes.setAttribute("aria-label", "Tropical notation");
    ["u", "affine", "tropical"].forEach((mode) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.tropicalNotation = mode;
      button.textContent = mode;
      button.classList.toggle("active", data.tropicalNotationMode === mode);
      button.addEventListener("click", () => {
        switchTropicalNotation(object, mode);
      });
      notationModes.append(button);
    });

    const textarea = document.createElement("textarea");
    textarea.className = "slice-textarea slice-tropical-textarea";
    textarea.dataset.tropicalInput = "true";
    textarea.spellcheck = false;
    textarea.value = tropicalNotationText(data, data.tropicalNotationMode);
    textarea.setAttribute("aria-label", "Tropical polynomial");
    textarea.placeholder = "p^0 + u1 + u2";
    const apply = document.createElement("button");
    apply.className = "slice-btn";
    apply.type = "button";
    apply.dataset.tropicalApply = "true";
    apply.textContent = "apply tropical";
    const applyCurrent = () => applyTropicalInput(object, textarea.value, data.tropicalConvention, data.tropicalNotationMode);
    apply.addEventListener("click", applyCurrent);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyCurrent();
      } else if (event.key === "Escape") {
        event.preventDefault();
        textarea.value = tropicalNotationText(data, data.tropicalNotationMode);
        textarea.blur();
      }
    });

    const districtToggle = document.createElement("label");
    districtToggle.className = "slice-inline-check";
    const districtCheckbox = document.createElement("input");
    districtCheckbox.type = "checkbox";
    districtCheckbox.checked = data.showDistricts;
    districtCheckbox.addEventListener("change", () => {
      object.data = {
        ...object.data,
        showDistricts: districtCheckbox.checked,
      };
      if (!districtCheckbox.checked) state.activeTropicalDistrict = null;
      state.lastWarning = districtCheckbox.checked ? "Tropical districts shown." : "Tropical districts hidden.";
      renderAll();
    });
    districtToggle.append(districtCheckbox, document.createTextNode("districts"));

    const densityModes = document.createElement("div");
    densityModes.className = "slice-segmented";
    densityModes.setAttribute("aria-label", "Tropical district label density");
    [
      ["all", "label all"],
      ["active", "active labels"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.tropicalDistrictLabelDensity = mode;
      button.textContent = label;
      button.classList.toggle("active", data.tropicalDistrictLabelDensity === mode);
      button.addEventListener("click", () => {
        object.data = {
          ...object.data,
          tropicalDistrictLabelDensity: normalizeTropicalDistrictLabelDensity(mode),
        };
        if (mode !== "active") state.activeTropicalDistrict = null;
        state.lastWarning = `Tropical district labels switched to ${label}.`;
        syncObjectPanel();
        renderAll();
      });
      densityModes.append(button);
    });

    panel.append(modes, notationModes, textarea, apply, districtToggle, densityModes);
    container.appendChild(panel);
  }

  function buildWeylParams(container, object) {
    object.kind = "weyl";
    object.visibleProjection = false;
    object.visibleSlice = true;
    object.data = normalizeWeylChambersData(object.data || {}, state.ambientDim);
    const data = object.data;
    const panel = document.createElement("div");
    panel.className = "slice-tropical-panel";

    buildDynkinReferencePicker(panel, object, {
      label: "Dynkin",
      messageLabel: "Weyl chambers",
      afterChange: () => {
        object.data = normalizeWeylChambersData(object.data, state.ambientDim);
        refreshWeylFromDynkin(object, { warn: true });
        clearWeylInteraction(object.id);
      },
    });

    const chamberToggle = document.createElement("label");
    chamberToggle.className = "slice-inline-check";
    const chamberCheckbox = document.createElement("input");
    chamberCheckbox.type = "checkbox";
    chamberCheckbox.checked = data.showChambers;
    chamberCheckbox.addEventListener("change", () => {
      object.data = {
        ...object.data,
        showChambers: chamberCheckbox.checked,
      };
      state.activeTropicalDistrict = null;
      if (!chamberCheckbox.checked) clearWeylInteraction(object.id);
      state.lastWarning = chamberCheckbox.checked ? "Weyl chambers shown." : "Weyl chamber fills and labels hidden.";
      renderAll();
    });
    chamberToggle.append(chamberCheckbox, document.createTextNode("chambers"));

    const labelModes = document.createElement("div");
    labelModes.className = "slice-segmented";
    labelModes.setAttribute("aria-label", "Weyl label mode");
    [
      ["permutation", "permutation"],
      ["word", "word"],
      ["length", "length"],
      ["kl", "KL"],
      ["kl-v1", "KL(v=1)"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.weylLabelMode = mode;
      button.textContent = label;
      button.classList.toggle("active", data.weylLabelMode === mode);
      button.addEventListener("click", () => {
        const normalizedMode = normalizeWeylLabelMode(mode);
        const nextData = {
          ...object.data,
          weylLabelMode: normalizedMode,
        };
        if (normalizedMode === "word" || normalizedMode === "permutation") {
          nextData.weylElementDisplayMode = normalizedMode;
        }
        object.data = nextData;
        state.activeTropicalDistrict = null;
        state.lastWarning = `Weyl labels switched to ${label}.`;
        syncObjectPanel();
        renderAll();
      });
      labelModes.append(button);
    });

    const densityModes = document.createElement("div");
    densityModes.className = "slice-segmented";
    densityModes.setAttribute("aria-label", "Weyl label density");
    [
      ["all", "label all"],
      ["active", "active labels"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      button.dataset.weylLabelDensity = mode;
      button.textContent = label;
      button.classList.toggle("active", data.weylLabelDensity === mode);
      button.addEventListener("click", () => {
        object.data = {
          ...object.data,
          weylLabelDensity: normalizeWeylLabelDensity(mode),
        };
        state.activeTropicalDistrict = null;
        if (mode !== "active") state.activeWeylChamber = null;
        state.lastWarning = `Weyl label density switched to ${label}.`;
        syncObjectPanel();
        renderAll();
      });
      densityModes.append(button);
    });

    panel.append(chamberToggle, labelModes, densityModes);
    container.appendChild(panel);
  }

  function setTropicalConvention(object, convention, notationMode) {
    try {
      const mode = normalizeTropicalConvention(convention);
      const selectedNotation = normalizeTropicalNotationMode(notationMode || object.data?.tropicalNotationMode);
      const terms = normalizeTropicalTerms(resizeTropicalTerms(object.data?.terms || [], state.ambientDim), mode, state.ambientDim);
      const candidate = {
        tropicalConvention: mode,
        terms,
        normalizedTropical: tropicalTermsToText(terms),
        normalizedTropicalAffine: tropicalTermsToAffineText(terms, mode),
        normalizedTropicalAlgebra: tropicalTermsToAlgebraText(terms),
      };
      object.data = {
        ...object.data,
        ...candidate,
        tropicalInput: tropicalNotationText(candidate, selectedNotation),
        tropicalNotationMode: selectedNotation,
      };
      state.activeTropicalDistrict = null;
      state.lastWarning = `Tropical convention switched to ${mode}.`;
      syncObjectPanel();
      renderAll();
    } catch (error) {
      state.lastWarning = `Tropical convention rejected: ${error.message}`;
      updateDebug();
    }
  }

  function switchTropicalNotation(object, notationMode) {
    const mode = normalizeTropicalNotationMode(notationMode);
    object.data = {
      ...object.data,
      tropicalNotationMode: mode,
      tropicalInput: tropicalNotationText(object.data || {}, mode),
    };
    state.lastWarning = `Tropical notation switched to ${mode}.`;
    syncObjectPanel();
    renderAll();
  }

  function applyTropicalInput(object, rawInput, convention, notationMode) {
    try {
      const candidate = compileTropicalPolynomial(rawInput, convention, state.ambientDim);
      const selectedNotation = normalizeTropicalNotationMode(notationMode || object.data?.tropicalNotationMode);
      object.kind = "tropical";
      object.visibleProjection = false;
      object.visibleSlice = true;
      object.data = {
        ...object.data,
        ...candidate,
        kind: "tropical",
        objectType: "tropical-polynomial",
        ambientDimension: state.ambientDim,
        showDistricts: object.data?.showDistricts !== false,
        tropicalDistrictLabelDensity: normalizeTropicalDistrictLabelDensity(object.data?.tropicalDistrictLabelDensity),
        tropicalNotationMode: selectedNotation,
        tropicalInput: tropicalNotationText(candidate, selectedNotation),
        name: object.name,
      };
      state.lastWarning = `Tropical polynomial applied in ${candidate.tropicalConvention} convention.`;
      state.selectedVertex = null;
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      syncObjectPanel();
      renderAll();
    } catch (error) {
      state.lastWarning = `Tropical input rejected: ${error.message}`;
      updateDebug();
    }
  }

  function rebuildDirectionButtons() {
    const container = $("direction-controls");
    container.innerHTML = "";
    const makeButton = (basis, index) => {
      const label = `${basis === "ambient" ? "e" : "v"}${index + 1}`;
      const button = document.createElement("button");
      button.className = "slice-segment";
      button.type = "button";
      setMathText(button, label, `${basis === "ambient" ? "e" : "v"}_{${index + 1}}`);
      button.title = basis === "ambient" ? `move along ambient ${label}` : `move along frame ${label}`;
      button.dataset.directionKey = `${basis}:${index}`;
      button.addEventListener("click", () => {
        state.activeDirection = { basis, index };
        renderAll();
      });
      container.appendChild(button);
    };
    for (let index = 0; index < state.ambientDim; index += 1) makeButton("ambient", index);
    for (let index = 0; index < state.ambientDim; index += 1) makeButton("frame", index);
  }

  function rebuildRotationSelects() {
    state.rotationPair = normalizeRotationPair(state.rotationPair);
    const selects = [$("rotation-i"), $("rotation-j")];
    selects.forEach((select, selectIndex) => {
      select.innerHTML = "";
      for (let index = 0; index < state.ambientDim; index += 1) {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = `v${index + 1}`;
        select.appendChild(option);
      }
      select.value = String(state.rotationPair[selectIndex]);
    });
  }

  function changeAmbientDimension(rawValue) {
    const next = clamp(Math.round(finiteNumber(rawValue, state.ambientDim)), 2, 8);
    if (next === state.ambientDim) {
      $("ambient-dimension").value = String(next);
      return;
    }
    if (next < state.ambientDim) {
      for (const object of state.objects.filter((candidate) => objectTypeKey(candidate) === "toric-cone")) {
        for (const generator of object.data?.generators || []) {
          for (let coordinate = next; coordinate < (generator.coordinates?.length || 0); coordinate += 1) {
            try {
              if (!window.ToricConeMath.parseRational(generator.coordinates[coordinate] || "0").isZero()) {
                $("ambient-dimension").value = String(state.ambientDim);
                state.lastWarning = `Cannot reduce to R^${next}: ${object.name} / ${generator.label} uses coordinate ${coordinate + 1}.`;
                renderAll();
                return;
              }
            } catch {
              $("ambient-dimension").value = String(state.ambientDim);
              state.lastWarning = `Cannot reduce to R^${next}: ${object.name} / ${generator.label} has an invalid discarded coordinate.`;
              renderAll();
              return;
            }
          }
        }
      }
    }
    state.ambientDim = next;
    state.p = resizeVector(state.p, next);
    resizeFrame(state.frame, next);
    state.activeDirection = normalizeDirection(state.activeDirection, next);
    state.sliceDim = 2;
    state.rotationPair = normalizeRotationPair(state.rotationPair, next);
    state.addWeylDynkinType = normalizeWeylDynkinType(state.addWeylDynkinType, next);
    const resizeWarnings = [];
    state.objects.forEach((object) => {
      const warning = resizeManagedObjectToAmbient(object);
      if (warning) resizeWarnings.push(warning);
    });
    state.selectedVertex = null;
    clearVectorTargetSession();
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.activeToricFace = null;
    invalidateToricAnalysis();
    $("ambient-dimension").value = String(next);
    rebuildDynamicControls();
    refreshTypeLabels();
    syncObjectPanel();
    state.lastWarning = resizeWarnings[0] || `Ambient space resized to R^${next}.`;
    renderAll();
  }

  function rebuildDynamicControls() {
    rebuildDirectionButtons();
    rebuildRotationSelects();
    rebuildDirectPositionInputs();
    syncDirectInputFields({ force: true });
  }

  function directPositionValues() {
    const inputs = Array.from($("direct-position-inputs").querySelectorAll("[data-direct-position-index]"));
    if (inputs.length !== state.ambientDim) {
      throw new Error(`Position vector needs ${state.ambientDim} entries.`);
    }
    return inputs.map((input, index) => {
      const parsed = parseRationalNumber(input.value);
      if (!parsed.ok || !Number.isFinite(parsed.value)) {
        throw new Error(`Position entry p_${index + 1} is not a finite rational value.`);
      }
      return parsed.value;
    });
  }

  function directManualFrameRows() {
    return readRationalMatrixGrid($("direct-frame-grid"), {
      dimension: state.ambientDim,
      rowDataset: "directFrameRow",
      columnDataset: "directFrameColumn",
      label: "Frame matrix",
      entryLabel: (row, col) => `e_${row + 1}, v_${col + 1}`,
    });
  }

  function cleanMatrixRowText(rowText) {
    return String(rowText || "")
      .trim()
      .replace(/^\s*[\[\(\{]\s*/, "")
      .replace(/\s*[\]\)\}]\s*,?\s*$/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
  }

  function splitMatrixRowEntries(rowText) {
    return (String(rowText || "").includes(",") ? String(rowText || "").split(",") : String(rowText || "").split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function parseVectorRows(rawValue, n = state.ambientDim, label = "Vector") {
    const text = String(rawValue || "").trim();
    if (!text) throw new Error(`${label} input is empty.`);
    const rowTexts = text
      .split(/\n|;/)
      .map(cleanMatrixRowText)
      .filter(Boolean);
    let parts = [];
    if (rowTexts.length === 1) {
      parts = splitMatrixRowEntries(rowTexts[0]);
    } else if (rowTexts.length === n) {
      parts = rowTexts.map((rowText, rowIndex) => {
        const entries = splitMatrixRowEntries(rowText);
        if (entries.length !== 1) throw new Error(`${label} row ${rowIndex + 1} needs one entry for column-vector Rows import.`);
        return entries[0];
      });
    } else {
      throw new Error(`${label} needs either one row with ${n} entries or ${n} one-entry rows.`);
    }
    if (parts.length !== n) throw new Error(`${label} needs ${n} entries.`);
    return parts.map((part, index) => {
      const parsed = parseRationalNumber(part);
      if (!parsed.ok || !Number.isFinite(parsed.value)) {
        throw new Error(`${label} entry ${index + 1} is not a finite rational value.`);
      }
      return parsed.value;
    });
  }

  function parseMatrixRows(rawValue, n = state.ambientDim, label = "Matrix") {
    const text = String(rawValue || "").trim();
    if (!text) throw new Error(`${label} rows are empty.`);
    const rowTexts = text
      .split(/\n|;/)
      .map(cleanMatrixRowText)
      .filter(Boolean);
    if (rowTexts.length !== n) {
      throw new Error(`${label} needs ${n} rows.`);
    }
    return rowTexts.map((rowText, rowIndex) => {
      const parts = splitMatrixRowEntries(rowText);
      if (parts.length !== n) {
        throw new Error(`${label} row ${rowIndex + 1} needs ${n} entries.`);
      }
      return parts.map((part, columnIndex) => {
        const parsed = parseRationalNumber(part);
        if (!parsed.ok || !Number.isFinite(parsed.value)) {
          throw new Error(`${label} entry row ${rowIndex + 1}, column ${columnIndex + 1} is not a finite rational value.`);
        }
        return parsed.value;
      });
    });
  }

  function parseDirectMatrixRows(rawValue) {
    return parseMatrixRows(rawValue, state.ambientDim, "Frame matrix");
  }

  function columnsFromRows(rows) {
    return Array.from({ length: state.ambientDim }, (_, columnIndex) =>
      rows.map((row) => row[columnIndex])
    );
  }

  function applyDirectFrameRows(rows, nextP, successMessage) {
    const candidate = orthonormalizeFrameColumns(columnsFromRows(rows), state.ambientDim);
    if (!candidate.ok) throw new Error(candidate.error);
    if (nextP) state.p = nextP;
    state.frame = candidate.frame;
    state.lastWarning = successMessage;
    syncDirectInputFields({ force: true });
    renderAll();
  }

  function applyDirectManualInput() {
    try {
      const nextP = directPositionValues();
      const rows = directManualFrameRows();
      applyDirectFrameRows(rows, nextP, "Manual slide position applied.");
    } catch (error) {
      state.lastWarning = `Direct input rejected: ${error.message}`;
      updateDebug();
    }
  }

  function applyDirectImportInput() {
    try {
      const rows = parseDirectMatrixRows($("direct-frame-import").value);
      applyDirectFrameRows(rows, null, "Imported frame matrix applied.");
    } catch (error) {
      state.lastWarning = `Frame import rejected: ${error.message}`;
      updateDebug();
    }
  }

  function updateObjectFromControls() {
    const object = activeObject();
    if (!object) return;
    object.name = $("object-name").value.trim() || object.name;
    object.style.color = $("object-color").value;
    object.style.opacity = finiteNumber($("object-opacity").value, object.style.opacity);
    object.style.pointSize = finiteNumber($("object-point-size").value, object.style.pointSize);
    object.style.lineWidth = finiteNumber($("object-line-width").value, object.style.lineWidth);
    object.labels = objectLabelsEnabled(object) && $("object-labels").checked;
    if (object.data) object.data.name = object.name;
    if (!objectHasVisibleLayer(object) && state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
  }

  function objectHasVisibleLayer(object) {
    return !!object?.visibleProjection || (!!object?.visibleSlice && canDrawExact2DSlice(object));
  }

  function refreshMatrixPresetFromDynkin(object, options = {}) {
    const data = object?.data || {};
    const presetKind = normalizeMatrixPresetKind(data.matrixPresetKind);
    if (objectTypeKey(object) !== "matrix" || presetKind === "manual") return "";
    const reference = resolveDynkinReference(data, state.ambientDim);
    data.ambientDimension = state.ambientDim;
    data.dynkinType = reference.dynkinType;
    data.dynkinRank = state.ambientDim;
    if (reference.sourceMissing) {
      data.matrixLinkStatus = reference.label;
      if (options.warn) return `${object.name} kept its last ${matrixPresetDisplayName(presetKind)} matrix because its Dynkin source is missing.`;
      return "";
    }
    data.matrixRows = dynkinMatrixRows(reference.dynkinType, presetKind, state.ambientDim);
    data.matrixColumnLabels = dynkinMatrixColumnLabels(presetKind, state.ambientDim).map((entry) => entry.plain);
    data.matrixTargetLabels = [];
    data.matrixLinkStatus = `${matrixPresetDisplayName(presetKind)} linked to ${reference.label}`;
    data.description = `${matrixPresetDisplayName(presetKind)} for ${weylDynkinLabel(reference.dynkinType, state.ambientDim)}, stored as a live-linked matrix object.`;
    return "";
  }

  function refreshWeylFromDynkin(object, options = {}) {
    const data = object?.data || {};
    if (objectTypeKey(object) !== "weyl-chambers") return "";
    const reference = resolveDynkinReference(data, state.ambientDim);
    data.ambientDimension = state.ambientDim;
    data.dynkinType = reference.dynkinType;
    data.dynkinRank = state.ambientDim;
    data.weylLinkStatus = reference.label;
    data.description = `Finite Weyl chamber arrangement ${weylDynkinLabel(reference.dynkinType, state.ambientDim)} in R^${state.ambientDim}, rendered by exact 2D slice.`;
    if (reference.sourceMissing && options.warn) {
      return `${object.name} kept ${weylDynkinLabel(reference.dynkinType, state.ambientDim)} because its Dynkin source is missing.`;
    }
    return "";
  }

  function refreshRootSetFromDynkin(object, options = {}) {
    const data = object?.data || {};
    if (objectTypeKey(object) !== "root-set") return "";
    const reference = resolveDynkinReference(data, state.ambientDim);
    data.ambientDimension = state.ambientDim;
    data.dynkinType = reference.dynkinType;
    data.dynkinRank = state.ambientDim;
    data.rootSignMode = normalizeRootSetSignMode(data.rootSignMode);
    data.rootStatus = reference.label;
    data.description = `Finite ${weylDynkinLabel(reference.dynkinType, state.ambientDim)} roots as a projected point set.`;
    if (reference.sourceMissing && options.warn) {
      return `${object.name} kept ${weylDynkinLabel(reference.dynkinType, state.ambientDim)} because its Dynkin source is missing.`;
    }
    return "";
  }

  function refreshLatticeBasis(object, options = {}) {
    const data = object?.data || {};
    if (objectTypeKey(object) !== "lattice") return "";
    data.ambientDimension = state.ambientDim;
    data.basisMode = normalizeLatticeBasisMode(data.basisMode);
    data.dynkinLatticeKind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    try {
      if (data.basisMode === "matrix-object") {
        const source = state.objects.find((candidate) => candidate.id === data.matrixSourceId && objectTypeKey(candidate) === "matrix");
        if (!source) {
          data.latticeStatus = "missing matrix source; frozen last basis";
          return options.warn ? `${object.name} kept its last basis because its matrix source is missing.` : "";
        }
        refreshMatrixPresetFromDynkin(source);
        const rows = validateFullRankMatrixRows(source.data?.matrixRows, state.ambientDim, `${source.name} matrix`);
        data.basisRows = cloneMatrixRows(rows, state.ambientDim);
        data.latticeStatus = `linked to matrix ${source.name}`;
      } else if (data.basisMode === "dynkin") {
        const reference = resolveDynkinReference(data, state.ambientDim);
        data.dynkinType = reference.dynkinType;
        data.dynkinRank = state.ambientDim;
        if (reference.sourceMissing) {
          data.latticeStatus = reference.label;
          return options.warn ? `${object.name} kept its last Dynkin lattice basis because its Dynkin source is missing.` : "";
        }
        data.basisRows = latticeBasisRowsFromDynkin(data, state.ambientDim);
        validateFullRankMatrixRows(data.basisRows, state.ambientDim, `${object.name} basis`);
        data.latticeStatus = `${data.dynkinLatticeKind} lattice linked to ${reference.label}`;
        data.description = `${data.dynkinLatticeKind === "weight" ? "Weight" : "Root"} lattice for ${weylDynkinLabel(data.dynkinType, state.ambientDim)}, generated from Dynkin data.`;
      } else if (data.basisMode === "lmfdb-field") {
        const field = normalizeLmfdbFieldData(data.lmfdbField);
        data.embeddingCoordinateMode = normalizeEmbeddingCoordinateMode(data.embeddingCoordinateMode);
        if (!field) {
          data.latticeStatus = "LMFDB field not loaded; search for a number field";
          data.basisRows = validateFullRankMatrixRows(data.basisRows, state.ambientDim, `${object.name} placeholder basis`);
          return "";
        }
        data.lmfdbField = field;
        data.lmfdbQuery = data.lmfdbQuery || field.query || field.label;
        data.basisRows = lmfdbBasisRowsFromField(field, data.embeddingCoordinateMode, state.ambientDim);
        data.latticeStatus = `O_F lattice for LMFDB ${field.label}, ${embeddingCoordinateModeLabel(data.embeddingCoordinateMode)}`;
        data.description = `Integer-ring lattice O_F for LMFDB ${field.label}, embedded with ${embeddingCoordinateModeLabel(data.embeddingCoordinateMode)} complex coordinates.`;
      } else {
        data.basisRows = validateFullRankMatrixRows(data.basisRows, state.ambientDim, `${object.name} basis`);
        data.latticeStatus = "manual matrix basis";
      }
    } catch (error) {
      data.latticeStatus = `lattice basis warning: ${error.message}`;
      if (options.warn) return `${object.name}: ${error.message}`;
    }
    return "";
  }

  function refreshVoronoiFromLattice(object, options = {}) {
    const data = object?.data || {};
    if (objectTypeKey(object) !== "voronoi-diagram") return "";
    data.ambientDimension = state.ambientDim;
    data.latticePoint = finiteVector(data.latticePoint, state.ambientDim);
    const lattices = latticeObjectOptions(state.ambientDim);
    if (!data.latticeSourceId && lattices.length) data.latticeSourceId = lattices[0].id;
    const source = lattices.find((candidate) => candidate.id === data.latticeSourceId);
    if (!source) {
      data.voronoiStatus = "missing lattice source; frozen last basis";
      return options.warn ? `${object.name} kept its last Voronoi basis because its lattice source is missing.` : "";
    }
    const warning = refreshLatticeBasis(source, options);
    try {
      data.cachedBasisRows = validateFullRankMatrixRows(source.data?.basisRows, state.ambientDim, `${source.name} basis`);
      data.voronoiStatus = `linked to lattice ${source.name}`;
      data.description = `Exact 2D Voronoi-cell slice for lattice ${source.name}.`;
      return warning || "";
    } catch (error) {
      data.voronoiStatus = `Voronoi basis warning: ${error.message}`;
      return options.warn ? `${object.name}: ${error.message}` : warning || "";
    }
  }

  function refreshLinkedObjects(options = {}) {
    const warnings = [];
    for (const object of state.objects) {
      const type = objectTypeKey(object);
      let warning = "";
      if (type === "matrix") warning = refreshMatrixPresetFromDynkin(object, options);
      else if (type === "weyl-chambers") warning = refreshWeylFromDynkin(object, options);
      else if (type === "root-set") warning = refreshRootSetFromDynkin(object, options);
      else if (type === "lattice") warning = refreshLatticeBasis(object, options);
      else if (type === "voronoi-diagram") warning = refreshVoronoiFromLattice(object, options);
      if (warning) warnings.push(warning);
    }
    return warnings;
  }

  function resizeManagedObjectToAmbient(object) {
    const data = object.data || {};
    const type = objectTypeKey(object);
    if (type === "regular-polytope" || type === "cube") {
      const previousFamily = data.family || (type === "cube" ? "hypercube" : "hypercube");
      const nextFamily = normalizeRegularFamily(previousFamily, state.ambientDim);
      let warning = "";
      if (previousFamily !== nextFamily) {
        warning = `${regularFamilyLabel(previousFamily, data.ambientDimension || state.ambientDim)} is unavailable in R^${state.ambientDim}; switched to ${regularFamilyLabel(nextFamily, state.ambientDim)}.`;
      }
      object.data = {
        ...makeRegularPolytopeData(state.ambientDim, nextFamily),
        scale: positiveNumber(data.scale, 1),
        name: object.name,
      };
      return warning;
    } else if (type === "simplex") {
      const scaleValue = positiveNumber(data.scale, 1);
      object.data = { ...makeSimplexData(state.ambientDim), scale: scaleValue, name: object.name };
    } else if (type === "sphere") {
      data.ambientDimension = state.ambientDim;
      data.center = finiteVector(data.center, state.ambientDim);
      data.centerInputMode = normalizeVectorInputMode(data.centerInputMode);
      data.radius = positiveNumber(data.radius, 1);
    } else if (type === "point") {
      data.ambientDimension = state.ambientDim;
      data.position = finiteVector(data.position, state.ambientDim);
      data.positionInputMode = normalizeVectorInputMode(data.positionInputMode);
    } else if (type === "vector") {
      data.ambientDimension = state.ambientDim;
      data.vector = finiteVector(data.vector, state.ambientDim);
      data.vectorInputMode = normalizeVectorInputMode(data.vectorInputMode);
    } else if (type === "matrix") {
      data.ambientDimension = state.ambientDim;
      data.matrixPresetKind = normalizeMatrixPresetKind(data.matrixPresetKind);
      data.matrixRows = normalizedMatrixRows(data.matrixRows, state.ambientDim);
      data.matrixColumnLabels = resizeVector(Array.isArray(data.matrixColumnLabels) ? data.matrixColumnLabels : [], state.ambientDim)
        .map((value, index) => String(value || `v_${index + 1}`));
      data.matrixTargetLabels = resizeVector(Array.isArray(data.matrixTargetLabels) ? data.matrixTargetLabels : [], state.ambientDim)
        .map((value) => String(value || ""));
      data.matrixInputMode = normalizeMatrixInputMode(data.matrixInputMode);
      const warning = refreshMatrixPresetFromDynkin(object, { warn: true });
      if (warning) return warning;
    } else if (type === "dynkin-type") {
      const previousType = data.dynkinType || "A";
      object.kind = "dynkin";
      object.visibleProjection = false;
      object.visibleSlice = false;
      object.data = normalizeDynkinTypeData(data, state.ambientDim);
      object.data.name = object.name;
      if (previousType !== object.data.dynkinType) {
        return `${previousType} is unavailable in R^${state.ambientDim}; switched to ${weylDynkinLabel(object.data.dynkinType, state.ambientDim)}.`;
      }
    } else if (type === "root-set") {
      const previousType = data.dynkinType || "A";
      object.kind = "geometry";
      object.visibleSlice = false;
      object.data = normalizeRootSetData(data, state.ambientDim);
      object.data.name = object.name;
      const warning = refreshRootSetFromDynkin(object, { warn: true });
      if (warning) return warning;
      if (!object.data.dynkinSourceId && previousType !== object.data.dynkinType) {
        return `${previousType} is unavailable in R^${state.ambientDim}; switched to ${weylDynkinLabel(object.data.dynkinType, state.ambientDim)}.`;
      }
    } else if (type === "lattice") {
      object.kind = "lattice";
      object.visibleProjection = true;
      object.visibleSlice = false;
      normalizeLatticeDataInPlace(object, state.ambientDim);
      object.data.name = object.name;
      const warning = refreshLatticeBasis(object, { warn: true });
      if (warning) return warning;
    } else if (type === "voronoi-diagram") {
      object.kind = "voronoi";
      object.visibleSlice = true;
      object.data = normalizeVoronoiDiagramData(data, state.ambientDim);
      object.data.name = object.name;
      const warning = refreshVoronoiFromLattice(object, { warn: true });
      if (warning) return warning;
    } else if (type === "toric-cone") {
      object.kind = "toric";
      object.visibleProjection = true;
      object.visibleSlice = true;
      object.data = normalizeToricConeData(data, state.ambientDim);
      object.data.name = object.name;
      invalidateToricAnalysis(object);
    } else if (type === "cartesian-frame") {
      data.ambientDimension = state.ambientDim;
      data.origin = resizeVector(Array.isArray(data.origin) ? data.origin : [], state.ambientDim);
      data.length = positiveNumber(data.length, 4);
      data.basis = data.basis === "moving" ? "moving" : "ambient";
    } else if (type === "formula-set") {
      const previousDimension = data.ambientDimension || state.ambientDim;
      try {
        object.kind = "formula";
        object.visibleProjection = false;
        object.visibleSlice = true;
        object.data = normalizeFormulaSetData(data, state.ambientDim);
        object.data.name = object.name;
        if (previousDimension !== state.ambientDim && Array.isArray(data.quadraticMatrix)) {
          return `Formula Q matrix resized to R^${state.ambientDim}.`;
        }
      } catch (error) {
        object.kind = "formula";
        object.visibleProjection = false;
        object.visibleSlice = true;
        object.data = { ...makeFormulaSetData(state.ambientDim), name: object.name };
        return `Formula reset while resizing: ${error.message}`;
      }
    } else if (type === "tropical-polynomial") {
      const previousDimension = data.ambientDimension || state.ambientDim;
      try {
        object.kind = "tropical";
        object.visibleProjection = false;
        object.visibleSlice = true;
        object.data = normalizeTropicalPolynomialData(data, state.ambientDim);
        object.data.name = object.name;
        if (previousDimension !== state.ambientDim) {
          return `Tropical polynomial resized to R^${state.ambientDim}.`;
        }
      } catch (error) {
        object.kind = "tropical";
        object.visibleProjection = false;
        object.visibleSlice = true;
        object.data = { ...makeTropicalPolynomialData(state.ambientDim), name: object.name };
        return `Tropical polynomial reset while resizing: ${error.message}`;
      }
    } else if (type === "weyl-chambers") {
      const previousType = data.dynkinType || "A";
      object.kind = "weyl";
      object.visibleProjection = false;
      object.visibleSlice = true;
      object.data = normalizeWeylChambersData(data, state.ambientDim);
      object.data.name = object.name;
      const warning = refreshWeylFromDynkin(object, { warn: true });
      if (warning) return warning;
      if (!object.data.dynkinSourceId && previousType !== object.data.dynkinType) {
        return `${previousType} is unavailable in R^${state.ambientDim}; switched to ${weylDynkinLabel(object.data.dynkinType, state.ambientDim)}.`;
      }
    }
    return "";
  }

  function normalizeFormulaSetData(data, n = state.ambientDim) {
    const normalized = {
      ...data,
      kind: "formula",
      objectType: "formula-set",
      ambientDimension: n,
      formulaInputMode: normalizeFormulaInputMode(data.formulaInputMode),
    };
    if (Array.isArray(normalized.quadraticMatrix) && normalized.formulaInputMode === "import-q") {
      const rows = Array.from({ length: n }, (_, row) =>
        resizeVector(Array.isArray(normalized.quadraticMatrix[row]) ? normalized.quadraticMatrix[row] : [], n)
      );
      return {
        ...normalized,
        ...compileQuadraticMatrixFormula(
          rows,
          normalized.quadraticRelation || normalized.formulaRelation || "<=",
          normalized.quadraticRhs ?? 1,
          n
        ),
      };
    }
    const formula = String(normalized.formula || "x1^2 + x2^2 <= 1").trim();
    return {
      ...normalized,
      formula,
      ...compileFormulaRelation(formula, n),
    };
  }

  function normalizeTropicalPolynomialData(data, n = state.ambientDim) {
    const tropicalConvention = normalizeTropicalConvention(data.tropicalConvention);
    const base = {
      ...data,
      kind: "tropical",
      objectType: "tropical-polynomial",
      ambientDimension: n,
      tropicalConvention,
      showDistricts: data.showDistricts !== false,
      tropicalDistrictLabelDensity: normalizeTropicalDistrictLabelDensity(data.tropicalDistrictLabelDensity),
      tropicalNotationMode: normalizeTropicalNotationMode(data.tropicalNotationMode),
    };
    if (Array.isArray(data.terms) && data.terms.length) {
      const terms = normalizeTropicalTerms(resizeTropicalTerms(data.terms, n), tropicalConvention, n);
      const normalizedData = {
        ...base,
        terms,
        normalizedTropical: tropicalTermsToText(terms),
        normalizedTropicalAffine: tropicalTermsToAffineText(terms, tropicalConvention),
        normalizedTropicalAlgebra: tropicalTermsToAlgebraText(terms),
      };
      return {
        ...normalizedData,
        tropicalInput: String(data.tropicalInput || tropicalNotationText(normalizedData, normalizedData.tropicalNotationMode)),
      };
    }
    return {
      ...base,
      ...compileTropicalPolynomial(data.tropicalInput || defaultTropicalInput(n), tropicalConvention, n),
    };
  }

  function normalizeWeylChambersData(data, n = state.ambientDim) {
    const reference = resolveDynkinReference(data, n);
    const dynkinType = normalizeWeylDynkinType(reference.dynkinType, n);
    const weylLabelMode = normalizeWeylLabelMode(data.weylLabelMode);
    const elementDisplayFallback = weylLabelMode === "permutation" ? "permutation" : "word";
    return {
      name: data.name || "Weyl chambers",
      kind: "weyl",
      objectType: "weyl-chambers",
      ambientDimension: n,
      dynkinSourceId: reference.sourceMissing ? data.dynkinSourceId : reference.dynkinSourceId,
      dynkinType,
      dynkinRank: n,
      showChambers: data.showChambers !== false,
      weylLabelMode,
      weylElementDisplayMode: normalizeWeylElementDisplayMode(data.weylElementDisplayMode, elementDisplayFallback),
      weylLabelDensity: normalizeWeylLabelDensity(data.weylLabelDensity),
      description: `Finite Weyl chamber arrangement ${weylDynkinLabel(dynkinType, n)} in R^${n}, rendered by exact 2D slice.`,
    };
  }

  function normalizeDynkinTypeData(data, n = state.ambientDim) {
    const dynkinType = normalizeWeylDynkinType(data.dynkinType || data.type, n);
    return {
      name: data.name || "Dynkin type",
      kind: "dynkin",
      objectType: "dynkin-type",
      ambientDimension: n,
      dynkinType,
      dynkinRank: n,
      description: `Shared finite Dynkin type ${weylDynkinLabel(dynkinType, n)} for Weyl chambers, root/weight matrices, and Dynkin lattices.`,
    };
  }

  function normalizeRootSetData(data, n = state.ambientDim) {
    const reference = resolveDynkinReference(data, n);
    const dynkinType = normalizeWeylDynkinType(reference.dynkinType, n);
    return {
      name: data.name || "roots",
      kind: "geometry",
      objectType: "root-set",
      ambientDimension: n,
      dynkinSourceId: reference.sourceMissing ? data.dynkinSourceId : reference.dynkinSourceId,
      dynkinType,
      dynkinRank: n,
      rootSignMode: normalizeRootSetSignMode(data.rootSignMode),
      rootStatus: String(data.rootStatus || ""),
      description: data.description || `Finite ${weylDynkinLabel(dynkinType, n)} roots as a projected point set.`,
    };
  }

  function normalizeLatticeData(data, n = state.ambientDim) {
    const basisMode = normalizeLatticeBasisMode(data.basisMode);
    const dynkinLatticeKind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    const rows = normalizedMatrixRows(data.basisRows || data.matrixRows || data.basis, n);
    const reference = resolveDynkinReference(data, n);
    return {
      name: data.name || "lattice",
      kind: "lattice",
      objectType: "lattice",
      ambientDimension: n,
      basisRows: rows,
      basisInputMode: normalizeMatrixInputMode(data.basisInputMode),
      basisMode,
      matrixSourceId: data.matrixSourceId || null,
      dynkinSourceId: reference.sourceMissing ? data.dynkinSourceId : reference.dynkinSourceId,
      dynkinType: normalizeWeylDynkinType(reference.dynkinType, n),
      dynkinRank: n,
      dynkinLatticeKind,
      lmfdbQuery: String(data.lmfdbQuery || "Qi"),
      lmfdbField: normalizeLmfdbFieldData(data.lmfdbField),
      embeddingCoordinateMode: normalizeEmbeddingCoordinateMode(data.embeddingCoordinateMode),
      showLatticePoints: basisMode === "dynkin" ? true : data.showLatticePoints !== false,
      latticeBoundShape: normalizeLatticeBoundShape(data.latticeBoundShape),
      latticeBoundRadius: normalizeLatticeBoundRadius(data.latticeBoundRadius),
      basisTargetLabels: resizeVector(Array.isArray(data.basisTargetLabels) ? data.basisTargetLabels : [], n)
        .map((value) => String(value || "")),
      latticeStatus: String(data.latticeStatus || ""),
      description: data.description || `Full-rank lattice in R^${n}, with bounded projection points.`,
    };
  }

  function normalizeVoronoiDiagramData(data, n = state.ambientDim) {
    return {
      name: data.name || "Voronoi diagram",
      kind: "voronoi",
      objectType: "voronoi-diagram",
      ambientDimension: n,
      latticeSourceId: String(data.latticeSourceId || ""),
      latticePoint: finiteVector(data.latticePoint || data.center || [], n),
      cachedBasisRows: normalizedMatrixRows(data.cachedBasisRows || data.basisRows || data.matrixRows, n),
      voronoiStatus: String(data.voronoiStatus || ""),
      description: data.description || `Exact 2D Voronoi-cell slice for a selected lattice source.`,
    };
  }

  function nextToricGeneratorId(existingIds = new Set()) {
    let id = `generator-${toricGeneratorCounter++}`;
    while (existingIds.has(id)) id = `generator-${toricGeneratorCounter++}`;
    return id;
  }

  function normalizeToricConeData(data, n = state.ambientDim) {
    const existingIds = new Set();
    const generators = (Array.isArray(data.generators) ? data.generators : []).map((raw, index) => {
      let id = String(raw?.id || "").trim();
      if (!id || existingIds.has(id)) id = nextToricGeneratorId(existingIds);
      existingIds.add(id);
      let coordinates = resizeVector(Array.isArray(raw?.coordinates) ? raw.coordinates.map((value) => String(value)) : [], n)
        .map((value) => String(value ?? "0"));
      try {
        const primitive = window.ToricConeMath.primitiveVector(coordinates, n);
        if (!primitive.zero) coordinates = primitive.exact;
      } catch {
        // Invalid imported coordinates stay editable and are diagnosed by exact analysis.
      }
      return {
        id,
        label: String(raw?.label || `u_${index + 1}`).trim() || `u_${index + 1}`,
        coordinates,
      };
    });
    return {
      name: data.name || "rational cone",
      kind: "toric",
      objectType: "toric-cone",
      ambientDimension: n,
      generators,
      preset: normalizeToricPreset(data.preset, n),
      generatorInputMode: normalizeMatrixInputMode(data.generatorInputMode),
      generatorImportOrientation: normalizeToricImportOrientation(data.generatorImportOrientation),
      description: data.description || `Strongly convex rational polyhedral cone in N_R of rank ${n}, with affine toric variety U_sigma.`,
    };
  }

  function normalizeObjectData(data, fallbackKind) {
    const normalized = { ...data };
    normalized.kind = normalized.kind || fallbackKind || "geometry";
    normalized.objectType = normalized.objectType || (normalized.kind === "sphere" ? "sphere" : "geometry");
    if (normalized.objectType === "fan" || normalized.kind === "fan") {
      normalized.kind = "geometry";
      normalized.objectType = "cartesian-frame";
      normalized.basis = "ambient";
      normalized.length = finiteNumber(normalized.length, state.viewport.boxRadius || 4);
      delete normalized.rays;
    }
    normalized.ambientDimension = clamp(
      Math.round(finiteNumber(normalized.ambientDimension ?? normalized.dimension, state.ambientDim)),
      2,
      8
    );
    if (normalized.objectType === "cube") {
      normalized.kind = "geometry";
      normalized.objectType = "regular-polytope";
      normalized.family = "hypercube";
      normalized.scale = positiveNumber(normalized.scale, 1);
      delete normalized.points;
      delete normalized.edges;
    }
    if (normalized.objectType === "regular-polytope") {
      normalized.kind = "geometry";
      normalized.family = normalizeRegularFamily(normalized.family || "hypercube", normalized.ambientDimension);
      normalized.scale = positiveNumber(normalized.scale, 1);
      delete normalized.points;
      delete normalized.edges;
    }
    if (normalized.objectType === "cube" || normalized.objectType === "simplex") {
      normalized.scale = positiveNumber(normalized.scale, 1);
      if (!Array.isArray(normalized.points)) {
        const generated = normalized.objectType === "cube"
          ? makeCubeData(normalized.ambientDimension)
          : makeSimplexData(normalized.ambientDimension);
        normalized.points = generated.points;
        normalized.edges = generated.edges;
        normalized.name = normalized.name || generated.name;
      }
    }
    if (normalized.objectType === "point") {
      normalized.kind = "geometry";
      normalized.position = finiteVector(normalized.position, normalized.ambientDimension);
      normalized.positionInputMode = normalizeVectorInputMode(normalized.positionInputMode);
    }
    if (normalized.objectType === "vector") {
      normalized.kind = "geometry";
      normalized.label = String(normalized.label || "v").trim() || "v";
      normalized.vector = finiteVector(normalized.vector, normalized.ambientDimension);
      normalized.vectorInputMode = normalizeVectorInputMode(normalized.vectorInputMode);
    }
    if (normalized.objectType === "matrix") {
      normalized.kind = "matrix";
      normalized.matrixPresetKind = normalizeMatrixPresetKind(normalized.matrixPresetKind);
      normalized.dynkinType = normalizeWeylDynkinType(normalized.dynkinType, normalized.ambientDimension);
      normalized.dynkinRank = normalized.ambientDimension;
      normalized.dynkinSourceId = normalized.dynkinSourceId || null;
      normalized.matrixRows = normalizedMatrixRows(normalized.matrixRows || normalized.matrix, normalized.ambientDimension);
      normalized.matrixColumnLabels = resizeVector(Array.isArray(normalized.matrixColumnLabels) ? normalized.matrixColumnLabels : [], normalized.ambientDimension)
        .map((value, index) => String(value || `v_${index + 1}`));
      normalized.matrixTargetLabels = resizeVector(Array.isArray(normalized.matrixTargetLabels) ? normalized.matrixTargetLabels : [], normalized.ambientDimension)
        .map((value) => String(value || ""));
      normalized.matrixInputMode = normalizeMatrixInputMode(normalized.matrixInputMode);
    }
    if (normalized.objectType === "dynkin-type" || normalized.kind === "dynkin") {
      return normalizeDynkinTypeData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "root-set") {
      return normalizeRootSetData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "lattice" || normalized.kind === "lattice") {
      return normalizeLatticeData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "voronoi-diagram" || normalized.kind === "voronoi") {
      return normalizeVoronoiDiagramData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "toric-cone" || normalized.kind === "toric") {
      return normalizeToricConeData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "cartesian-frame") {
      normalized.kind = "geometry";
      normalized.basis = normalized.basis === "moving" ? "moving" : "ambient";
      normalized.length = positiveNumber(normalized.length, 4);
      normalized.origin = resizeVector(
        (Array.isArray(normalized.origin) ? normalized.origin : []).map((value) => finiteNumber(value, 0)),
        normalized.ambientDimension
      );
    }
    if (normalized.objectType === "formula-set" || normalized.kind === "formula") {
      return normalizeFormulaSetData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "tropical-polynomial" || normalized.kind === "tropical") {
      return normalizeTropicalPolynomialData(normalized, normalized.ambientDimension);
    }
    if (normalized.objectType === "weyl-chambers" || normalized.kind === "weyl") {
      return normalizeWeylChambersData(normalized, normalized.ambientDimension);
    }
    if (Array.isArray(normalized.points)) {
      normalized.points = normalized.points
        .map((point) => (Array.isArray(point) ? point : point.coords))
        .filter(Array.isArray)
        .map((point) => resizeVector(point.map(Number), normalized.ambientDimension));
    }
    if (Array.isArray(normalized.rays)) {
      normalized.rays = normalized.rays
        .map((ray) => {
          if (Array.isArray(ray)) return resizeVector(ray.map(Number), normalized.ambientDimension);
          return {
            origin: Array.isArray(ray.origin) ? resizeVector(ray.origin.map(Number), normalized.ambientDimension) : undefined,
            direction: Array.isArray(ray.direction) ? resizeVector(ray.direction.map(Number), normalized.ambientDimension) : Array(normalized.ambientDimension).fill(0),
            label: ray.label,
          };
        });
    }
    if (Array.isArray(normalized.origin)) normalized.origin = resizeVector(normalized.origin.map(Number), normalized.ambientDimension);
    if (Array.isArray(normalized.center)) normalized.center = resizeVector(normalized.center.map(Number), normalized.ambientDimension);
    if (normalized.kind === "sphere" || normalized.objectType === "sphere") {
      normalized.kind = "sphere";
      normalized.objectType = "sphere";
      normalized.radius = positiveNumber(normalized.radius ?? normalized.scale, 1);
      normalized.center = finiteVector(normalized.center, normalized.ambientDimension);
      normalized.centerInputMode = normalizeVectorInputMode(normalized.centerInputMode);
    }
    return normalized;
  }

  function normalizeSourceObject(object) {
    const data = normalizeObjectData(object.data || {}, object.kind);
    const isFormulaSet = data.objectType === "formula-set";
    const isTropical = data.objectType === "tropical-polynomial";
    const isWeyl = data.objectType === "weyl-chambers";
    const isDynkin = data.objectType === "dynkin-type";
    const isRootSet = data.objectType === "root-set";
    const isLattice = data.objectType === "lattice";
    const isVoronoi = data.objectType === "voronoi-diagram";
    const isToric = data.objectType === "toric-cone";
    const isProjectionless = isProjectionlessSourceType(data.objectType);
    const sliceSupported = supportsExact2DSliceType(data.objectType);
    const visibleProjection = isProjectionless ? false : object.visibleProjection ?? object.projectionVisible ?? object.visible ?? true;
    const visibleSlice = isProjectionless
      ? (sliceSupported ? object.visibleSlice ?? object.sliceVisible ?? true : false)
      : object.visibleSlice ?? object.sliceVisible ?? sliceSupported;
    const normalized = {
      id: object.id || `object-${objectCounter++}`,
      name: String(object.name || data.name || "object").trim(),
      kind: isFormulaSet ? "formula" : isTropical ? "tropical" : isWeyl ? "weyl" : isDynkin ? "dynkin" : isRootSet ? "geometry" : isLattice ? "lattice" : isVoronoi ? "voronoi" : isToric ? "toric" : data.kind || object.kind || "geometry",
      visibleProjection: visibleProjection !== false,
      visibleSlice: !!visibleSlice,
      labels: isLattice ? false : !!(object.labels ?? object.showLabels),
      style: {
        color: "#2f7d70",
        opacity: 0.85,
        pointSize: 4,
        lineWidth: 2,
        ...(object.style || {}),
      },
      data,
    };
    normalized.data.name = normalized.name;
    return normalized;
  }

  function normalizeImportedSourceObject(object, targetAmbientDimension = state.ambientDim) {
    const envelope = object?.data ? object : {
      id: object?.id,
      name: object?.name,
      kind: object?.kind,
      visibleProjection: object?.visibleProjection,
      visibleSlice: object?.visibleSlice,
      labels: object?.labels,
      style: object?.style,
      data: object || {},
    };
    const rawData = envelope.data || {};
    if (rawData.objectType === "toric-cone" || rawData.kind === "toric") {
      for (const [generatorIndex, generator] of (rawData.generators || []).entries()) {
        const coordinates = Array.isArray(generator?.coordinates) ? generator.coordinates : [];
        for (let coordinate = targetAmbientDimension; coordinate < coordinates.length; coordinate += 1) {
          let parsed;
          try {
            parsed = window.ToricConeMath.parseRational(coordinates[coordinate] ?? "0");
          } catch {
            throw new Error(`Cannot import ${generator?.label || `generator ${generatorIndex + 1}`} into R^${targetAmbientDimension}: discarded coordinate ${coordinate + 1} is invalid.`);
          }
          if (!parsed.isZero()) {
            throw new Error(`Cannot import ${generator?.label || `generator ${generatorIndex + 1}`} into R^${targetAmbientDimension}: discarded coordinate ${coordinate + 1} is nonzero.`);
          }
        }
      }
    }
    const normalized = normalizeSourceObject(envelope);
    if (objectTypeKey(normalized) === "toric-cone") {
      normalized.kind = "toric";
      normalized.visibleProjection = envelope.visibleProjection !== false;
      normalized.visibleSlice = envelope.visibleSlice !== false;
      normalized.data = normalizeToricConeData(normalized.data, targetAmbientDimension);
      normalized.data.name = normalized.name;
    }
    return normalized;
  }

  function serializableObject(object) {
    const normalized = normalizeSourceObject(object || {});
    return {
      id: normalized.id,
      name: normalized.name,
      kind: normalized.kind,
      visibleProjection: normalized.visibleProjection,
      visibleSlice: normalized.visibleSlice,
      labels: normalized.labels,
      style: normalized.style,
      data: normalized.data,
    };
  }

  function parseObjectPayload(raw) {
    const parsed = JSON.parse(raw || "{}");
    const object = parsed && parsed.kind === "slice-explorer-object" ? parsed.object : parsed;
    if (!object || typeof object !== "object" || Array.isArray(object)) {
      throw new Error("Object JSON must contain an object payload.");
    }
    return normalizeImportedSourceObject(object, state.ambientDim);
  }

  function syncScalarPair(sliderId, numberId, target, key, callback) {
    const slider = $(sliderId);
    const number = $(numberId);
    const update = (raw) => {
      target[key] = finiteNumber(raw, target[key]);
      slider.value = String(target[key]);
      number.value = String(target[key]);
      if (callback) callback();
      renderAll();
    };
    slider.addEventListener("input", () => update(slider.value));
    number.addEventListener("input", () => update(number.value));
  }

  function bindCardCollapse() {
    if (window.CalculatorCards) window.CalculatorCards.init({ side: "#cards" });
  }

  function bindMotionSlider(sliderId, key) {
    const slider = $(sliderId);
    if (!slider) return;
    slider.addEventListener("input", () => {
      const limits = MOTION_LIMITS[key];
      state[key] = clamp(finiteNumber(slider.value, MOTION_DEFAULTS[key]), limits[0], limits[1]);
      syncMotionControls();
    });
  }

  function bindMotionButton(buttonId, kind, sign) {
    const button = $(buttonId);
    if (!button) return;
    const token = `button:${buttonId}`;
    button.addEventListener("pointerdown", (event) => {
      if (state.motionMode === "discrete") return;
      event.preventDefault();
      button.classList.add("active");
      if (button.setPointerCapture && event.pointerId != null) button.setPointerCapture(event.pointerId);
      setMotionHold(kind, sign, token, true);
    });
    const stop = (event) => {
      if (state.motionMode !== "continuous") return;
      if (event) event.preventDefault();
      button.classList.remove("active");
      setMotionHold(kind, sign, token, false);
    };
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("click", (event) => {
      if (state.motionMode !== "discrete") return;
      event.preventDefault();
      applyDiscreteMotion(kind, sign);
    });
  }

  function clearCanvasObjects() {
    invalidateToricAnalysis();
    state.objects = [makeObjectForType("cartesian-frame")];
    state.activeObjectId = state.objects[0].id;
    state.sourceMode = "modify";
    state.selectedVertex = null;
    clearVectorTargetSession();
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.addVoronoiLatticeSourceId = "";
    state.lastWarning = "Canvas cleared to the Cartesian frame.";
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    renderAll();
  }

  function isTypingTarget(target) {
    const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select" || !!target?.isContentEditable;
  }

  function activeToricConeObject() {
    const object = activeObject();
    return objectTypeKey(object) === "toric-cone" ? object : null;
  }

  function replaceToricGenerators(object, generators, message) {
    object.data.generators = generators;
    object.data.preset = "zero";
    if (state.activeVectorTarget?.objectId === object.id && state.activeVectorTarget.fieldKey === "generators") {
      clearVectorTargetSession();
    }
    invalidateToricAnalysis(object);
    state.activeToricFace = null;
    state.lastWarning = message;
    syncObjectPanel();
    renderAll();
  }

  function appendToricGenerator(object, coordinates, label = "") {
    if ((object.data?.generators || []).length >= TORIC_ANALYSIS_LIMITS.maxGenerators) {
      state.lastWarning = `A toric cone accepts at most ${TORIC_ANALYSIS_LIMITS.maxGenerators} entered ray columns.`;
      renderAll();
      return false;
    }
    const existingIds = new Set((object.data?.generators || []).map((generator) => generator.id));
    const id = nextToricGeneratorId(existingIds);
    const index = object.data.generators.length;
    const raw = resizeVector(Array.isArray(coordinates) ? coordinates : [], state.ambientDim).map((value) => String(value ?? "0"));
    let normalized = raw;
    try {
      const primitive = window.ToricConeMath.primitiveVector(raw, state.ambientDim);
      if (!primitive.zero) normalized = primitive.exact;
    } catch {
      // The editable draft keeps invalid coordinates for diagnosis.
    }
    object.data.generators.push({ id, label: String(label || `u_${index + 1}`), coordinates: normalized });
    object.data.preset = "zero";
    invalidateToricAnalysis(object);
    state.lastWarning = `${object.data.generators[index].label} added to ${object.name}.`;
    syncObjectPanel();
    renderAll();
    return true;
  }

  function parseToricGeneratorRows(raw, dimension = state.ambientDim) {
    const rows = String(raw || "").split(/\n|;/).map(cleanMatrixRowText).filter(Boolean);
    if (!rows.length) return [];
    if (rows.length > TORIC_ANALYSIS_LIMITS.maxGenerators) {
      throw new Error(`Generator import has ${rows.length} rows; the limit is ${TORIC_ANALYSIS_LIMITS.maxGenerators}.`);
    }
    return rows.map((row, rowIndex) => {
      const entries = splitMatrixRowEntries(row);
      if (entries.length !== dimension) throw new Error(`Generator row ${rowIndex + 1} needs ${dimension} entries.`);
      entries.forEach((entry, coordinate) => {
        try {
          window.ToricConeMath.parseRational(entry);
        } catch (error) {
          throw new Error(`Generator row ${rowIndex + 1}, coordinate ${coordinate + 1}: ${error.message}`);
        }
      });
      const primitive = window.ToricConeMath.primitiveVector(entries, dimension);
      const coordinates = primitive.zero ? entries : primitive.exact;
      return { id: "", label: `u_${rowIndex + 1}`, coordinates };
    });
  }

  function parseToricRayMatrix(raw, dimension = state.ambientDim, orientation = "columns") {
    if (normalizeToricImportOrientation(orientation) === "legacy-rows") {
      return parseToricGeneratorRows(raw, dimension);
    }
    const rows = String(raw || "").split(/\n|;/).map(cleanMatrixRowText).filter(Boolean);
    if (!rows.length) return [];
    if (rows.length !== dimension) throw new Error(`Ray matrix U needs ${dimension} rows, one for each ambient coordinate.`);
    const entriesByRow = rows.map((row) => splitMatrixRowEntries(row));
    const rayCount = entriesByRow[0].length;
    if (!rayCount) return [];
    if (rayCount > TORIC_ANALYSIS_LIMITS.maxGenerators) {
      throw new Error(`Ray matrix U has ${rayCount} columns; the limit is ${TORIC_ANALYSIS_LIMITS.maxGenerators}.`);
    }
    entriesByRow.forEach((entries, row) => {
      if (entries.length !== rayCount) throw new Error(`Ray matrix row ${row + 1} needs ${rayCount} entries.`);
      entries.forEach((entry, column) => {
        try {
          window.ToricConeMath.parseRational(entry);
        } catch (error) {
          throw new Error(`Ray matrix entry ${row + 1}, ${column + 1}: ${error.message}`);
        }
      });
    });
    return Array.from({ length: rayCount }, (_, column) => {
      const entries = entriesByRow.map((row) => row[column]);
      const primitive = window.ToricConeMath.primitiveVector(entries, dimension);
      return {
        id: "",
        label: `u_${column + 1}`,
        coordinates: primitive.zero ? entries : primitive.exact,
      };
    });
  }

  function preserveToricGeneratorIdentity(object, generators) {
    const previous = object.data?.generators || [];
    const usedIds = new Set();
    return generators.map((generator, index) => {
      const prior = previous[index];
      let id = String(prior?.id || "").trim();
      if (!id || usedIds.has(id)) id = nextToricGeneratorId(usedIds);
      usedIds.add(id);
      return {
        ...generator,
        id,
        label: String(prior?.label || generator.label || `u_${index + 1}`).trim() || `u_${index + 1}`,
      };
    });
  }

  function motionActionFromKey(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === "w" || key === "ArrowUp" || key === "+" || key === "=") return { kind: "translation", sign: 1 };
    if (key === "s" || key === "ArrowDown" || key === "-" || key === "_") return { kind: "translation", sign: -1 };
    if (key === "a" || key === "ArrowLeft") return { kind: "rotation", sign: -1 };
    if (key === "d" || key === "ArrowRight") return { kind: "rotation", sign: 1 };
    return null;
  }

  function motionTokenForKey(event, action) {
    return `key:${action.kind}:${action.sign}:${event.code || event.key}`;
  }

  function setupEventListeners() {
    bindCardCollapse();

    $("clear-canvas").addEventListener("click", clearCanvasObjects);
    $("slice-weight-info-card")?.addEventListener("click", (event) => {
      const button = typeof event.target?.closest === "function"
        ? event.target.closest("[data-weight-info-dimension-mode]")
        : null;
      if (!button) return;
      state.weightInfoDimensionMode = normalizeWeightInfoDimensionMode(button.dataset.weightInfoDimensionMode);
      renderAll();
    });
    $("toric-cone-tabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-toric-tab]");
      if (!button) return;
      setToricTab(button.dataset.toricTab);
    });
    $("toric-cone-input-mode-controls")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-toric-input-mode]");
      const object = activeToricConeObject();
      if (!button || !object) return;
      const mode = normalizeMatrixInputMode(button.dataset.toricInputMode);
      object.data.generatorInputMode = mode;
      clearVectorTargetSession();
      if (mode === "targets" && object.data.generators.length) {
        activateVectorTargetSlot(object, "generators", 0, object.data.generators[0].label);
      } else {
        state.lastWarning = `Ray matrix ${mode === "manual" ? "manual input" : mode} is active.`;
      }
      renderAll();
    });
    $("toric-cone-import-orientation")?.addEventListener("change", () => {
      const object = activeToricConeObject();
      if (!object) return;
      object.data.generatorImportOrientation = normalizeToricImportOrientation($("toric-cone-import-orientation").value);
      state.lastWarning = object.data.generatorImportOrientation === "columns"
        ? "Import expects n matrix rows with rays as columns."
        : "Legacy import expects one complete ray vector per row.";
      renderAll();
    });
    $("toric-cone-apply-manual")?.addEventListener("click", () => {
      const object = activeToricConeObject();
      if (object) applyToricManualMatrix(object);
    });
    $("toric-cone-generators")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;
      const object = activeToricConeObject();
      if (!object) return;
      event.preventDefault();
      applyToricManualMatrix(object);
    });
    $("toric-cone-apply-preset")?.addEventListener("click", () => {
      const object = activeToricConeObject();
      if (!object) return;
      const preset = normalizeToricPreset($("toric-cone-preset").value, state.ambientDim);
      const hasGenerators = (object.data?.generators || []).length > 0;
      const confirmed = !hasGenerators || typeof window.confirm !== "function" || window.confirm(`Replace all generators of ${object.name} with the ${$("toric-cone-preset").selectedOptions[0]?.textContent || preset} preset?`);
      if (!confirmed) return;
      const generators = toricPresetGenerators(preset, state.ambientDim);
      object.data.generators = generators;
      object.data.preset = preset;
      if (state.activeVectorTarget?.objectId === object.id && state.activeVectorTarget.fieldKey === "generators") {
        clearVectorTargetSession();
      }
      invalidateToricAnalysis(object);
      state.lastWarning = `${object.name} reset to the ${$("toric-cone-preset").selectedOptions[0]?.textContent || preset} preset.`;
      syncObjectPanel();
      renderAll();
    });
    $("toric-cone-add-generator")?.addEventListener("click", () => {
      const object = activeToricConeObject();
      if (!object) return;
      const index = object.data.generators.length % state.ambientDim;
      appendToricGenerator(object, Array.from({ length: state.ambientDim }, (_, coordinate) => coordinate === index ? "1" : "0"));
    });
    $("toric-cone-add-vector")?.addEventListener("click", () => {
      const object = activeToricConeObject();
      const source = state.objects.find((candidate) => candidate.id === $("toric-cone-vector-source")?.value && objectTypeKey(candidate) === "vector");
      if (!object || !source) return;
      const slotIndex = activeTargetSlotIndex(object, "generators", object.data.generators.length);
      if (slotIndex == null) {
        state.lastWarning = "Choose a ray target before filling from a vector object.";
        renderAll();
        return;
      }
      commitVectorTargetValue({
        objectId: object.id,
        objectName: object.name,
        fieldKey: "generators",
        slotIndex,
        slotLabel: object.data.generators[slotIndex].label,
      }, source.data?.vector || [], `vector object ${source.name}`, source.data?.label || object.data.generators[slotIndex].label);
    });
    $("toric-cone-apply-rows")?.addEventListener("click", () => {
      const object = activeToricConeObject();
      if (!object) return;
      try {
        const orientation = normalizeToricImportOrientation(object.data.generatorImportOrientation);
        const parsed = parseToricRayMatrix($("toric-cone-rows-import").value, state.ambientDim, orientation);
        const generators = preserveToricGeneratorIdentity(object, parsed);
        replaceToricGenerators(object, generators, `${generators.length} ray columns imported into ${object.name}.`);
      } catch (error) {
        state.lastWarning = `Ray matrix import rejected: ${error.message}`;
        renderAll();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      const menu = $("toric-cone-pick-menu");
      if (!menu || menu.hidden || menu.contains(event.target) || event.target === $("slice-viewport")) return;
      hideToricConePickMenu();
    });

    $("source-mode-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-source-mode]");
      if (!button) return;
      state.sourceMode = button.dataset.sourceMode === "add" ? "add" : "modify";
      if (state.sourceMode === "add") {
        state.selectedVertex = null;
        clearVectorTargetSession();
        state.activeTropicalDistrict = null;
        clearWeylInteraction();
        state.activeToricFace = null;
        hideToricConePickMenu();
      }
      syncSourceMode();
      renderAll();
    });

    $("source-add-type").addEventListener("change", () => {
      state.addType = $("source-add-type").value;
      syncSourceMode();
      renderAll();
    });

    $("source-add-variant").addEventListener("change", () => {
      const value = $("source-add-variant").value;
      if (state.addType === "regular-polytope") {
        state.addRegularFamily = normalizeRegularFamily(value, state.ambientDim);
      } else if (state.addType === "dynkin-type") {
        state.addWeylDynkinType = normalizeWeylDynkinType(value, state.ambientDim);
      } else if (state.addType === "root-set") {
        const reference = parseDynkinReferenceValue(value, state.ambientDim);
        state.addWeylDynkinSourceId = reference.dynkinSourceId || "__raw__";
        state.addWeylDynkinType = reference.dynkinType;
      } else if (state.addType === "weyl-chambers") {
        const reference = parseDynkinReferenceValue(value, state.ambientDim);
        state.addWeylDynkinSourceId = reference.dynkinSourceId || "__raw__";
        state.addWeylDynkinType = reference.dynkinType;
      } else if (state.addType === "matrix") {
        state.addMatrixVariant = value;
      } else if (state.addType === "lattice") {
        state.addLatticeVariant = value;
      } else if (state.addType === "voronoi-diagram") {
        state.addVoronoiLatticeSourceId = value;
      } else if (state.addType === "toric-cone") {
        state.addToricPreset = normalizeToricPreset(value, state.ambientDim);
      } else if (state.addType === "toric-fan") {
        state.addToricFanPreset = normalizeToricFanPreset(value);
      }
      renderAll();
    });

    $("source-add-object").addEventListener("click", () => {
      if (state.addType === "voronoi-diagram" && !defaultLatticeSourceId(state.ambientDim)) {
        state.lastWarning = "Create a lattice before adding a Voronoi diagram.";
        renderAll();
        return;
      }
      const options = addOptionsForCurrentType();
      const data = makeObjectData(state.addType, state.ambientDim, options);
      const object = makeObjectForType(state.addType, uniqueObjectName(data.name || currentTypeLabel(state.addType, state.ambientDim)), options);
      state.objects.push(object);
      state.activeObjectId = object.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      hideToricConePickMenu();
      const addedType = objectTypeKey(object);
      state.lastWarning = isProjectionlessSourceType(addedType) && supportsExact2DSliceType(addedType)
        ? `${object.name} added to the exact slice layer.`
        : isProjectionlessSourceType(addedType)
          ? `${object.name} added as a source-data object.`
          : supportsExact2DSliceType(addedType)
            ? `${object.name} added to the projection and slice view.`
            : `${object.name} added to the projection view.`;
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
    });

    $("object-select").addEventListener("change", () => {
      setActiveObject($("object-select").value);
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      hideToricConePickMenu();
      syncObjectPanel();
      renderAll();
    });

    $("object-name").addEventListener("input", () => {
      updateObjectFromControls();
      syncObjectSelect();
      renderAll();
    });

    $("object-delete").addEventListener("click", () => {
      if (state.objects.length <= 1) return;
      const deletedObject = activeObject();
      if (objectTypeKey(deletedObject) === "toric-cone") invalidateToricAnalysis(deletedObject);
      state.objects = state.objects.filter((object) => object.id !== state.activeObjectId);
      state.activeObjectId = state.objects[0].id;
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      hideToricConePickMenu();
      const linkWarnings = refreshLinkedObjects({ warn: true });
      state.lastWarning = linkWarnings[0] ? `Active object deleted. ${linkWarnings[0]}` : "Active object deleted.";
      syncObjectSelect();
      syncObjectPanel();
      renderAll();
    });

    $("object-export").addEventListener("click", () => {
      exportActiveObjectToImport();
    });

    $("object-visible-projection").addEventListener("click", () => {
      const object = activeObject();
      if (!object) return;
      if (isProjectionlessSourceType(objectTypeKey(object))) {
        object.visibleProjection = false;
        state.lastWarning = supportsExact2DSliceType(objectTypeKey(object))
          ? `${sourceLabel(object)} projection is unavailable; use the exact slice layer.`
          : `${sourceLabel(object)} projection is unavailable for this source-data object.`;
        syncLayerButtons(object);
        renderAll();
        return;
      }
      object.visibleProjection = !object.visibleProjection;
      if (!objectHasVisibleLayer(object)) {
        if (state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
        if (state.activeVectorTarget?.objectId === object.id) clearVectorTargetSession();
        if (state.activeTropicalDistrict?.objectId === object.id) state.activeTropicalDistrict = null;
        clearWeylInteraction(object.id);
        if (state.activeToricFace?.objectId === object.id) state.activeToricFace = null;
        hideToricConePickMenu();
      }
      syncLayerButtons(object);
      renderAll();
    });

    $("object-visible-slice").addEventListener("click", () => {
      const object = activeObject();
      if (!object || !canDrawExact2DSlice(object)) return;
      object.visibleSlice = !object.visibleSlice;
      if (!objectHasVisibleLayer(object)) {
        if (state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
        if (state.activeVectorTarget?.objectId === object.id) clearVectorTargetSession();
        if (state.activeTropicalDistrict?.objectId === object.id) state.activeTropicalDistrict = null;
        clearWeylInteraction(object.id);
        if (state.activeToricFace?.objectId === object.id) state.activeToricFace = null;
        hideToricConePickMenu();
      }
      syncLayerButtons(object);
      renderAll();
    });

    ["object-color", "object-opacity", "object-point-size", "object-line-width", "object-labels"].forEach((id) => {
      $(id).addEventListener("input", () => {
        updateObjectFromControls();
        renderAll();
      });
      $(id).addEventListener("change", () => {
        updateObjectFromControls();
        renderAll();
      });
    });

    $("ambient-dimension").addEventListener("input", () => changeAmbientDimension($("ambient-dimension").value));
    $("ambient-dimension").addEventListener("change", () => changeAmbientDimension($("ambient-dimension").value));

    $("slide-input-mode-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-slide-input-mode]");
      if (!button) return;
      setSlideInputMode(button.dataset.slideInputMode);
    });
    $("direct-input-mode-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-direct-input-mode]");
      if (!button) return;
      setDirectInputMode(button.dataset.directInputMode);
    });
    $("direct-manual-apply").addEventListener("click", applyDirectManualInput);
    $("direct-import-apply").addEventListener("click", applyDirectImportInput);
    $("direct-frame-import").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyDirectImportInput();
      } else if (event.key === "Escape") {
        event.preventDefault();
        syncDirectInputFields({ force: true });
        $("direct-frame-import").blur();
      }
    });

    syncScalarPair("box-radius-slider", "box-radius-number", state.viewport, "boxRadius");
    syncScalarPair("tolerance-slider", "tolerance-number", state.viewport, "tolerance");

    $("motion-mode-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-motion-mode]");
      if (!button) return;
      setMotionMode(button.dataset.motionMode);
    });
    bindMotionSlider("translation-speed-slider", "translationSpeed");
    bindMotionSlider("rotation-speed-slider", "rotationSpeed");
    bindMotionSlider("translation-step-slider", "translationStep");
    bindMotionSlider("rotation-step-slider", "rotationStep");
    bindMotionButton("move-negative", "translation", -1);
    bindMotionButton("move-positive", "translation", 1);
    $("reset-position").addEventListener("click", () => {
      state.p = Array(state.ambientDim).fill(0);
      renderAll();
    });

    $("rotation-i").addEventListener("change", () => {
      readRotationPairFromControls(0);
      renderAll();
    });
    $("rotation-j").addEventListener("change", () => {
      readRotationPairFromControls(1);
      renderAll();
    });
    $("schmidt-frame").addEventListener("click", () => {
      gramSchmidtFrame();
      state.lastWarning = "Frame repaired by Gram-Schmidt.";
      renderAll();
    });
    $("auto-schmidt").addEventListener("change", () => {
      state.autoSchmidt = $("auto-schmidt").checked;
      renderAll();
    });
    $("reset-frame").addEventListener("click", () => {
      const resetPosition = $("reset-position-enabled")?.checked !== false;
      const resetDirection = $("reset-direction-enabled")?.checked !== false;
      if (!resetPosition && !resetDirection) {
        state.lastWarning = "Choose position or direction before resetting.";
        renderAll();
        return;
      }
      if (resetPosition) state.p = Array(state.ambientDim).fill(0);
      if (resetDirection) state.frame = identityFrame(state.ambientDim);
      state.lastWarning = resetPosition && resetDirection
        ? "Position reset to 0 and direction reset to the identity matrix."
        : resetPosition
          ? "Position reset to 0."
          : "Direction reset to the identity matrix.";
      renderAll();
    });

    $("screen-zoom").addEventListener("input", () => {
      state.viewport.zoom = finiteNumber($("screen-zoom").value, 1);
      draw();
      updateDebug();
    });
    $("label-size-slider").addEventListener("input", () => {
      state.viewport.labelSize = normalizeCanvasLabelSize($("label-size-slider").value);
      syncCanvasLabelSize();
      $("label-size-value").textContent = `${fmt(state.viewport.labelSize, 2)}rem`;
      queueMathTypeset();
    });
    $("reset-screen").addEventListener("click", () => {
      state.viewport.zoom = 1;
      $("screen-zoom").value = "1";
      renderAll();
    });
    $("reset-orbit").addEventListener("click", () => {
      state.viewport.cameraDistance = 3;
      $("camera-distance").value = "3";
      state.lastWarning = "3D orbit reset placeholder. Three.js orbit controls arrive with the 3D renderer.";
      renderAll();
    });
    $("camera-distance").addEventListener("input", () => {
      state.viewport.cameraDistance = finiteNumber($("camera-distance").value, 3);
      renderAll();
    });
    $("viewport-bound-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-viewport-bound]");
      if (!button) return;
      state.viewport.boundShape = normalizeViewportBoundShape(button.dataset.viewportBound);
      state.lastWarning = `Viewport bound set to ${viewportBoundLabel()}.`;
      renderAll();
    });
    ["show-axes", "show-grid", "show-labels", "show-box", "exact-sphere-guide"].forEach((id) => {
      $(id).addEventListener("change", () => {
        state.viewport.showAxes = $("show-axes").checked;
        state.viewport.showGrid = $("show-grid").checked;
        state.viewport.showLabels = $("show-labels").checked;
        state.viewport.showBox = $("show-box").checked;
        state.viewport.exactSphereGuide = $("exact-sphere-guide").checked;
        renderAll();
      });
    });

    $("copy-position").addEventListener("click", () => copyText(JSON.stringify(state.p), "position copied"));
    $("copy-frame").addEventListener("click", () => copyText(JSON.stringify(state.frame), "frame copied"));
    $("copy-slice").addEventListener("click", () => copyText(JSON.stringify(frameState(), null, 2), "frame JSON copied"));
    $("copy-state").addEventListener("click", () => copyText(JSON.stringify(fullState(), null, 2), "state copied"));
    $("download-state").addEventListener("click", downloadState);
    $("import-apply").addEventListener("click", importState);
    $("import-object-new").addEventListener("click", importObjectAsNew);
    $("import-object-replace").addEventListener("click", replaceActiveObject);
    $("reset-preset").addEventListener("click", resetToPreset);

    $("slice-viewport").addEventListener("click", handleCanvasClick);
    $("slice-viewport").addEventListener("mousemove", handleCanvasPointerMove);
    $("slice-viewport").addEventListener("mouseleave", () => {
      $("slice-viewport").style.cursor = "default";
    });

    window.addEventListener("keydown", handleKeyboardDown);
    window.addEventListener("keyup", handleKeyboardUp);
    window.addEventListener("blur", clearAllMotion);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("load", () => queueMathTypeset());
  }

  function handleKeyboardDown(event) {
    if (isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (state.slideInputMode !== "move") return;
    if (/^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (index < state.ambientDim) {
        event.preventDefault();
        setRotationPairFromShortcut(index);
      }
      return;
    }
    const action = motionActionFromKey(event);
    if (!action) return;
    event.preventDefault();
    if (state.motionMode === "discrete") {
      if (!event.repeat) applyDiscreteMotion(action.kind, action.sign);
      return;
    }
    setMotionHold(action.kind, action.sign, motionTokenForKey(event, action), true);
  }

  function handleKeyboardUp(event) {
    if (state.slideInputMode !== "move") return;
    const action = motionActionFromKey(event);
    if (!action) return;
    clearMotionToken(motionTokenForKey(event, action));
  }

  function renderAll() {
    state.sliceDim = 2;
    state.viewport.boundShape = normalizeViewportBoundShape(state.viewport.boundShape);
    state.viewport.labelSize = normalizeCanvasLabelSize(state.viewport.labelSize);
    state.activeDirection = normalizeDirection(state.activeDirection);
    clampMotionState();
    refreshLinkedObjects();
    $("ambient-dimension").value = String(state.ambientDim);
    $("screen-zoom").value = String(state.viewport.zoom);
    $("label-size-slider").value = String(state.viewport.labelSize);
    $("label-size-value").textContent = `${fmt(state.viewport.labelSize, 2)}rem`;
    $("camera-distance").value = String(state.viewport.cameraDistance);
    $("box-radius-slider").value = String(state.viewport.boxRadius);
    $("box-radius-number").value = String(state.viewport.boxRadius);
    $("tolerance-slider").value = String(state.viewport.tolerance);
    $("tolerance-number").value = String(state.viewport.tolerance);
    $("show-axes").checked = state.viewport.showAxes;
    $("show-grid").checked = state.viewport.showGrid;
    $("show-labels").checked = state.viewport.showLabels;
    $("show-box").checked = state.viewport.showBox;
    $("exact-sphere-guide").checked = state.viewport.exactSphereGuide;
    setSegmentActive("viewport-bound-controls", "data-viewport-bound", state.viewport.boundShape);
    $("auto-schmidt").checked = state.autoSchmidt;

    setSegmentActive("direction-controls", "data-direction-key", directionKey());
    syncSlideInputControls();
    syncMotionControls();
    syncRotationControls();
    syncSourceMode();
    syncObjectSelect();
    const object = activeObject();
    if (object) syncLayerButtons(object);
    renderToricConeCard();
    $("toolbar-source").textContent = object ? sourceLabel(object) : "none";
    $("toolbar-slice").textContent = `${state.sliceDim}D`;
    syncCanvasLabelSize();
    updateReadouts();
    draw();
    updateDebug();
    updateLatticeBoundSummaryElements();
    queueMathTypeset();
  }

  function updateReadouts() {
    setMathText(
      $("position-vector"),
      `p = [${state.p.map((value) => fmt(value, 4)).join(", ")}]`,
      `p=${vectorToTex(state.p, 4)}`
    );
    const fullRows = frameRows(state.frame);
    const frameColLabels = state.frame.map((_, index) => `v_${index + 1}`);
    const frameRowLabels = Array.from({ length: state.ambientDim }, (_, index) => `e_${index + 1}`);
    setMathText($("frame-matrix"), frameMatrixToString(state.frame), matrixToTex(fullRows, {
      rowLabels: frameRowLabels,
      colLabels: frameColLabels,
    }), { display: true });
    setMathText($("active-slice-matrix"), frameMatrixToString(state.frame.slice(0, state.sliceDim)), matrixToTex(frameRows(state.frame.slice(0, state.sliceDim)), {
      rowLabels: frameRowLabels,
      colLabels: frameColLabels.slice(0, state.sliceDim),
    }), { display: true });
    setMathText($("gram-matrix"), matrixToString(gramMatrix(state.frame)), matrixToTex(gramMatrix(state.frame), {
      rowLabels: frameColLabels,
      colLabels: frameColLabels,
    }), { display: true });
    const vectors = Array.from({ length: state.sliceDim }, (_, index) => `y_${index + 1}v_${index + 1}`).join(" + ");
    const texVectors = Array.from({ length: state.sliceDim }, (_, index) => `y_{${index + 1}}v_{${index + 1}}`).join(" + ");
    setMathText($("affine-formula"), `x = p + ${vectors}`, `x=p+${texVectors}`);
  }

  function frameRows(columns) {
    const rows = [];
    for (let row = 0; row < state.ambientDim; row += 1) {
      rows.push(columns.map((column) => column[row] || 0));
    }
    return rows;
  }

  function gramMatrix(columns) {
    return columns.map((a) => columns.map((b) => dot(a, b)));
  }

  function matrixToString(rows) {
    return rows
      .map((row) => `[${row.map((value) => fmt(value, 4).padStart(7, " ")).join(" ")}]`)
      .join("\n");
  }

  function cleanLatticeCoefficient(value) {
    const number = finiteNumber(value, 0);
    if (Math.abs(number) <= 1e-9) return 0;
    const rounded = Math.round(number);
    return Math.abs(number - rounded) <= Math.max(1e-7, sliceTolerance() * 10) ? rounded : number;
  }

  function latticeCoefficientText(value) {
    const cleaned = cleanLatticeCoefficient(value);
    if (Number.isInteger(cleaned)) return String(cleaned);
    return fmt(cleaned, 6);
  }

  function latticeBasisLabelEntriesForObject(object) {
    const data = object?.data || {};
    const basisMode = normalizeLatticeBasisMode(data.basisMode);
    if (basisMode === "lmfdb-field") {
      return Array.from({ length: state.ambientDim }, (_, index) => ({
        plain: `zk_${index + 1}`,
        tex: `\\mathrm{zk}_{${index + 1}}`,
      }));
    }
    if (basisMode === "dynkin") {
      const kind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
      const prefix = kind === "weight" ? "omega" : "alpha";
      return Array.from({ length: state.ambientDim }, (_, index) => ({
        plain: `${prefix}_${index + 1}`,
        tex: `${kind === "weight" ? "\\omega" : "\\alpha"}_{${index + 1}}`,
      }));
    }
    return Array.from({ length: state.ambientDim }, (_, index) => ({
      plain: `b_${index + 1}`,
      tex: `b_{${index + 1}}`,
    }));
  }

  function normalizeLatticeBasisLabelEntries(labels) {
    return resizeVector(Array.isArray(labels) ? labels : [], state.ambientDim)
      .map((label, index) => {
        if (label && typeof label === "object") {
          const plain = String(label.plain || label.text || `b_${index + 1}`);
          return { plain, tex: label.tex || labelToTex(plain) };
        }
        const plain = String(label || `b_${index + 1}`);
        return { plain, tex: labelToTex(plain) };
      });
  }

  function latticeCoefficientExpressionDisplay(coefficients, labels) {
    const sizedCoefficients = resizeVector(Array.isArray(coefficients) ? coefficients : [], state.ambientDim)
      .map(cleanLatticeCoefficient);
    const sizedLabels = normalizeLatticeBasisLabelEntries(labels);
    const terms = [];
    sizedCoefficients.forEach((coefficient, index) => {
      if (Math.abs(coefficient) <= 1e-9) return;
      const sign = coefficient < 0 ? "-" : "+";
      const magnitude = Math.abs(coefficient);
      const plainCoefficientPrefix = Math.abs(magnitude - 1) <= 1e-9 ? "" : `${latticeCoefficientText(magnitude)} `;
      const texCoefficientPrefix = Math.abs(magnitude - 1) <= 1e-9 ? "" : `${latticeCoefficientText(magnitude)}\\,`;
      terms.push({
        sign,
        plain: `${plainCoefficientPrefix}${sizedLabels[index].plain}`,
        tex: `${texCoefficientPrefix}${sizedLabels[index].tex}`,
      });
    });
    if (!terms.length) return { plain: "0", tex: "0" };
    return {
      plain: terms.map((term, index) => {
        if (index === 0) return term.sign === "-" ? `-${term.plain}` : term.plain;
        return ` ${term.sign} ${term.plain}`;
      }).join(""),
      tex: terms.map((term, index) => {
        if (index === 0) return term.sign === "-" ? `-${term.tex}` : term.tex;
        return ` ${term.sign} ${term.tex}`;
      }).join(""),
    };
  }

  function latticeCoefficientExpression(coefficients, labels) {
    return latticeCoefficientExpressionDisplay(coefficients, labels).plain;
  }

  function dynkinLatticeBasisRows(kind, dynkinType, n = state.ambientDim) {
    return normalizeDynkinLatticeKind(kind) === "weight"
      ? fundamentalWeightMatrixRows(dynkinType, n)
      : simpleRootMatrixRows(dynkinType, n);
  }

  function dynkinLatticeCoordinates(kind, dynkinType, point, preferredCoefficients = null) {
    if (Array.isArray(preferredCoefficients) && preferredCoefficients.length) {
      return resizeVector(preferredCoefficients, state.ambientDim).map(cleanLatticeCoefficient);
    }
    const basisRows = dynkinLatticeBasisRows(kind, dynkinType, state.ambientDim);
    const inverseRows = inverseMatrix(basisRows, `${weylDynkinLabel(dynkinType, state.ambientDim)} ${kind} lattice`);
    return multiplyMatrixVector(inverseRows, resizeVector(point, state.ambientDim)).map(cleanLatticeCoefficient);
  }

  function matchingVisibleDynkinCompanionLattice(object) {
    const data = object?.data || {};
    if (objectTypeKey(object) !== "lattice" || normalizeLatticeBasisMode(data.basisMode) !== "dynkin") return null;
    const currentKind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    const companionKind = currentKind === "weight" ? "root" : "weight";
    const dynkinType = normalizeWeylDynkinType(data.dynkinType, state.ambientDim);
    return state.objects.find((candidate) => {
      if (!candidate.visibleProjection || candidate.id === object.id || objectTypeKey(candidate) !== "lattice") return false;
      const candidateData = candidate.data || {};
      return normalizeLatticeBasisMode(candidateData.basisMode) === "dynkin" &&
        normalizeDynkinLatticeKind(candidateData.dynkinLatticeKind) === companionKind &&
        normalizeWeylDynkinType(candidateData.dynkinType, state.ambientDim) === dynkinType &&
        (candidateData.ambientDimension || state.ambientDim) === state.ambientDim;
    }) || null;
  }

  function dynkinLatticePickReadout(object, candidate) {
    const data = object?.data || {};
    const currentKind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    const dynkinType = normalizeWeylDynkinType(data.dynkinType, state.ambientDim);
    const companion = matchingVisibleDynkinCompanionLattice(object);
    const companionKind = currentKind === "weight" ? "root" : "weight";
    const kinds = companion ? [currentKind, companionKind] : [currentKind];
    const entries = kinds.map((kind) => {
      const labelPrefix = kind === "weight" ? "omega" : "alpha";
      const labelTex = kind === "weight" ? "\\omega" : "\\alpha";
      const labels = Array.from({ length: state.ambientDim }, (_, index) => ({
        plain: `${labelPrefix}_${index + 1}`,
        tex: `${labelTex}_{${index + 1}}`,
      }));
      const preferred = kind === currentKind ? candidate.latticeCoefficients : null;
      const coordinates = dynkinLatticeCoordinates(kind, dynkinType, candidate.ambient, preferred);
      return latticeCoefficientExpressionDisplay(coordinates, labels);
    });
    return {
      plain: `= ${entries.map((entry) => entry.plain).join(" = ")}`,
      tex: `= ${entries.map((entry) => entry.tex).join(" = ")}`,
    };
  }

  function latticePickReadout(candidate) {
    if (!candidate?.latticePoint) return null;
    const object = state.objects.find((item) => item.id === candidate.objectId);
    if (!object || objectTypeKey(object) !== "lattice") return null;
    const data = object.data || {};
    if (normalizeLatticeBasisMode(data.basisMode) === "dynkin") {
      try {
        return dynkinLatticePickReadout(object, candidate);
      } catch (error) {
        return null;
      }
    }
    let coefficients = candidate.latticeCoefficients;
    if (!Array.isArray(coefficients) || !coefficients.length) {
      try {
        const resolved = resolveLatticeBasis(object);
        if (!resolved.ok) return null;
        coefficients = multiplyMatrixVector(
          inverseMatrix(resolved.basisRows, `${object.name} lattice basis`),
          resizeVector(candidate.ambient, state.ambientDim)
        );
      } catch (error) {
        return null;
      }
    }
    const expression = latticeCoefficientExpressionDisplay(coefficients, latticeBasisLabelEntriesForObject(object));
    return {
      plain: `= ${expression.plain}`,
      tex: `= ${expression.tex}`,
    };
  }

  function pickedCandidateBaseTex(candidate) {
    return `\\text{${texText(candidate.objectName)} / }${labelToTex(candidate.label)}`;
  }

  function pickedCandidateDisplay(candidate, options = {}) {
    if (!candidate) return null;
    const includeCoordinates = options.includeCoordinates !== false;
    const basisReadout = latticePickReadout(candidate);
    const basePlain = `${candidate.objectName} / ${candidate.label}`;
    const baseTex = pickedCandidateBaseTex(candidate);
    const coordinatePlain = includeCoordinates
      ? `  x=${vectorToInline(candidate.ambient)}  y=${vectorToInline(candidate.frameCoords)}`
      : "";
    const coordinateTex = includeCoordinates
      ? `\\quad x=${vectorToTex(candidate.ambient, 3)}\\quad y=${vectorToTex(candidate.frameCoords, 3)}`
      : "";
    return {
      plain: `${basePlain}${coordinatePlain}${basisReadout ? `  ${basisReadout.plain}` : ""}`,
      tex: `${baseTex}${coordinateTex}${basisReadout ? `\\quad ${basisReadout.tex}` : ""}`,
      basisReadout,
    };
  }

  function pickedCandidateStatusDisplay(candidate) {
    if (!candidate) return null;
    const basisReadout = latticePickReadout(candidate);
    const basePlain = `${candidate.objectName} / ${candidate.label}`;
    const baseTex = pickedCandidateBaseTex(candidate);
    const equationReadout = basisReadout?.plain?.startsWith("=");
    const plain = basisReadout
      ? `Picked ${basePlain}${equationReadout ? " " : ": "}${basisReadout.plain}`
      : `Picked ${basePlain}.`;
    const tex = basisReadout
      ? `\\text{Picked }${baseTex}${equationReadout ? "\\quad " : "\\colon "}${basisReadout.tex}`
      : `\\text{${texText(plain)}}`;
    return { plain, tex };
  }

  function normalizeWeightInfoDimensionMode(mode) {
    return WEIGHT_INFO_DIMENSION_MODES.has(mode) ? mode : "none";
  }

  function dynkinVectorKey(vector) {
    return (vector || []).map((value) => {
      const cleaned = cleanLatticeCoefficient(value);
      return Number.isInteger(cleaned) ? String(cleaned) : fmt(cleaned, 8);
    }).join(",");
  }

  function dynkinCartanMatrix(dynkinType, n = state.ambientDim) {
    const type = normalizeWeylDynkinType(dynkinType, n);
    const make = (rank, callback) => Array.from({ length: rank }, (_, row) =>
      Array.from({ length: rank }, (_, col) => callback(row, col))
    );
    if (type === "A") return make(n, (row, col) => (row === col ? 2 : Math.abs(row - col) === 1 ? -1 : 0));
    if (type === "B") {
      const matrix = make(n, (row, col) => (row === col ? 2 : Math.abs(row - col) === 1 ? -1 : 0));
      if (n >= 2) {
        matrix[n - 2][n - 1] = -2;
        matrix[n - 1][n - 2] = -1;
      }
      return matrix;
    }
    if (type === "C") {
      const matrix = make(n, (row, col) => (row === col ? 2 : Math.abs(row - col) === 1 ? -1 : 0));
      if (n >= 2) {
        matrix[n - 2][n - 1] = -1;
        matrix[n - 1][n - 2] = -2;
      }
      return matrix;
    }
    if (type === "D") {
      const matrix = make(n, (row, col) => (row === col ? 2 : 0));
      for (let index = 0; index < n - 2; index += 1) {
        matrix[index][index + 1] = -1;
        matrix[index + 1][index] = -1;
      }
      if (n >= 3) {
        matrix[n - 3][n - 1] = -1;
        matrix[n - 1][n - 3] = -1;
      }
      return matrix;
    }
    if (type === "G") return [[2, -1], [-3, 2]];
    if (type === "F") return [[2, -1, 0, 0], [-1, 2, -2, 0], [0, -1, 2, -1], [0, 0, -1, 2]];
    return eCartanMatrix(n);
  }

  function solveLinearSystem(rows, vector, label = "linear system") {
    try {
      return multiplyMatrixVector(inverseMatrix(rows, label), vector);
    } catch {
      return null;
    }
  }

  function dynkinSimpleToLabels(simpleCoordinates, cartanRows) {
    return multiplyMatrixVector(transposeMatrix(cartanRows), simpleCoordinates);
  }

  function dynkinLabelsToSimpleCoordinates(labels, cartanRows) {
    return solveLinearSystem(transposeMatrix(cartanRows), labels, "Dynkin-label to simple-root coordinates");
  }

  function integralVectorOrNull(vector, tolerance = WEIGHT_INFO_EPS) {
    if (!Array.isArray(vector)) return null;
    const rounded = vector.map((value) => Math.round(finiteNumber(value, NaN)));
    return vector.every((value, index) => Number.isFinite(value) && Math.abs(value - rounded[index]) <= tolerance)
      ? rounded
      : null;
  }

  function isNonnegativeIntVector(vector) {
    return Array.isArray(vector) && vector.every((value) => Number.isInteger(value) && value >= 0);
  }

  function isDominantDynkinLabels(labels) {
    return isNonnegativeIntVector(labels);
  }

  function dynkinCartanSymmetrizer(cartanRows) {
    const n = cartanRows.length;
    const weights = Array(n).fill(null);
    weights[0] = 1;
    const queue = [0];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const row = queue[cursor];
      for (let col = 0; col < n; col += 1) {
        if (row === col || !cartanRows[row][col] || !cartanRows[col][row]) continue;
        const value = (weights[row] * cartanRows[col][row]) / cartanRows[row][col];
        if (weights[col] == null) {
          weights[col] = value;
          queue.push(col);
        }
      }
    }
    return weights.map((value) => value ?? 1);
  }

  function simpleRootGramFromCartan(cartanRows) {
    const symmetrizer = dynkinCartanSymmetrizer(cartanRows);
    return cartanRows.map((row, rowIndex) => row.map((_, colIndex) => cartanRows[rowIndex][colIndex] * symmetrizer[colIndex]));
  }

  function quadraticForm(rows, vector) {
    let total = 0;
    for (let row = 0; row < vector.length; row += 1) {
      if (!vector[row]) continue;
      for (let col = 0; col < vector.length; col += 1) {
        if (vector[col]) total += vector[row] * rows[row][col] * vector[col];
      }
    }
    return total;
  }

  function dynkinInnerProductFromCartan(cartanRows) {
    const gram = simpleRootGramFromCartan(cartanRows);
    const transposeCartan = transposeMatrix(cartanRows);
    return (leftLabels, rightLabels) => {
      const leftSimple = solveLinearSystem(transposeCartan, leftLabels, "Dynkin inner product");
      const rightSimple = solveLinearSystem(transposeCartan, rightLabels, "Dynkin inner product");
      if (!leftSimple || !rightSimple) return NaN;
      let total = 0;
      for (let row = 0; row < cartanRows.length; row += 1) {
        for (let col = 0; col < cartanRows.length; col += 1) {
          total += leftSimple[row] * gram[row][col] * rightSimple[col];
        }
      }
      return total;
    };
  }

  function positiveRootSimpleCoordinates(cartanRows) {
    const n = cartanRows.length;
    const roots = new Map();
    const queue = [];
    for (let index = 0; index < n; index += 1) {
      const root = Array(n).fill(0);
      root[index] = 1;
      roots.set(dynkinVectorKey(root), root);
      queue.push(root);
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const root = queue[cursor];
      for (let index = 0; index < n; index += 1) {
        const bracket = root.reduce((sum, value, col) => sum + value * cartanRows[col][index], 0);
        const reflected = root.slice();
        reflected[index] -= bracket;
        if (reflected.every((value) => value >= 0)) {
          const key = dynkinVectorKey(reflected);
          if (!roots.has(key)) {
            roots.set(key, reflected);
            queue.push(reflected);
          }
        }
      }
    }
    return Array.from(roots.values()).sort((left, right) =>
      left.reduce((sum, value) => sum + value, 0) - right.reduce((sum, value) => sum + value, 0)
    );
  }

  function reflectDynkinLabels(labels, index, cartanRows) {
    const coordinate = labels[index] || 0;
    return labels.map((value, col) => value - coordinate * cartanRows[index][col]);
  }

  function cleanDynkinLabels(labels) {
    return labels.map((value) => cleanLatticeCoefficient(value));
  }

  function dominantDynkinRepresentative(cartanRows, labels) {
    let current = cleanDynkinLabels(labels);
    const seen = new Set();
    for (let step = 0; step < 400; step += 1) {
      const key = dynkinVectorKey(current);
      if (seen.has(key)) return null;
      seen.add(key);
      const index = current.findIndex((value) => value < -WEIGHT_INFO_EPS);
      if (index < 0) return cleanDynkinLabels(current);
      current = cleanDynkinLabels(reflectDynkinLabels(current, index, cartanRows));
    }
    return null;
  }

  function factorialBigInt(value) {
    let result = 1n;
    for (let index = 2; index <= value; index += 1) result *= BigInt(index);
    return result;
  }

  function powerBigInt(base, exponent) {
    let result = 1n;
    for (let index = 0; index < exponent; index += 1) result *= BigInt(base);
    return result;
  }

  function cartanEdgeWeight(cartanRows, row, col) {
    return Math.abs((cartanRows[row][col] || 0) * (cartanRows[col][row] || 0));
  }

  function dynkinComponentAdjacency(cartanRows, nodes) {
    const adjacency = new Map(nodes.map((node) => [node, []]));
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const row = nodes[left];
        const col = nodes[right];
        const weight = cartanEdgeWeight(cartanRows, row, col);
        if (weight > 0) {
          adjacency.get(row).push({ node: col, weight });
          adjacency.get(col).push({ node: row, weight });
        }
      }
    }
    return adjacency;
  }

  function dynkinComponents(cartanRows, nodes) {
    const nodeSet = new Set(nodes);
    const seen = new Set();
    const components = [];
    for (const start of nodes) {
      if (seen.has(start)) continue;
      const component = [];
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const node = stack.pop();
        component.push(node);
        for (const candidate of nodeSet) {
          if (seen.has(candidate)) continue;
          if (cartanEdgeWeight(cartanRows, node, candidate) > 0) {
            seen.add(candidate);
            stack.push(candidate);
          }
        }
      }
      components.push(component.sort((left, right) => left - right));
    }
    return components;
  }

  function isPathAdjacency(adjacency, nodes) {
    if (nodes.length === 1) return true;
    const degrees = nodes.map((node) => adjacency.get(node).length).sort((left, right) => left - right);
    return degrees[0] === 1 && degrees[1] === 1 && degrees.slice(2).every((degree) => degree === 2);
  }

  function doubleEdgeTouchesPathEnd(adjacency, nodes) {
    for (const node of nodes) {
      for (const edge of adjacency.get(node)) {
        if (node < edge.node && edge.weight === 2) {
          return adjacency.get(node).length === 1 || adjacency.get(edge.node).length === 1;
        }
      }
    }
    return false;
  }

  function armLengthsFromBranch(adjacency, branch) {
    const arms = [];
    for (const first of adjacency.get(branch).map((edge) => edge.node)) {
      let length = 1;
      let previous = branch;
      let current = first;
      while (adjacency.get(current).length > 1) {
        const next = adjacency.get(current).map((edge) => edge.node).find((node) => node !== previous);
        if (next === undefined) break;
        previous = current;
        current = next;
        length += 1;
      }
      arms.push(length);
    }
    return arms.sort((left, right) => left - right);
  }

  function irreducibleWeylOrderFromCartan(cartanRows, nodes) {
    const n = nodes.length;
    if (n === 0) return 1n;
    if (n === 1) return 2n;
    const adjacency = dynkinComponentAdjacency(cartanRows, nodes);
    const edgeWeights = [];
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const weight = cartanEdgeWeight(cartanRows, nodes[left], nodes[right]);
        if (weight > 0) edgeWeights.push(weight);
      }
    }
    const maxEdge = Math.max(...edgeWeights);
    if (n === 2) {
      if (maxEdge === 1) return 6n;
      if (maxEdge === 2) return 8n;
      if (maxEdge === 3) return 12n;
    }
    if (maxEdge > 1) {
      if (n === 4 && isPathAdjacency(adjacency, nodes) && maxEdge === 2 && !doubleEdgeTouchesPathEnd(adjacency, nodes)) return 1152n;
      if (isPathAdjacency(adjacency, nodes) && maxEdge === 2) return powerBigInt(2, n) * factorialBigInt(n);
    }
    if (maxEdge === 1) {
      if (isPathAdjacency(adjacency, nodes)) return factorialBigInt(n + 1);
      const branchNodes = nodes.filter((node) => adjacency.get(node).length === 3);
      if (branchNodes.length === 1) {
        const arms = armLengthsFromBranch(adjacency, branchNodes[0]).join(",");
        if (arms.startsWith("1,1,")) return powerBigInt(2, n - 1) * factorialBigInt(n);
        if (arms === "1,2,2") return 51840n;
        if (arms === "1,2,3") return 2903040n;
        if (arms === "1,2,4") return 696729600n;
      }
    }
    throw new Error("Unsupported Dynkin subdiagram for Weyl-order shortcut.");
  }

  function weylGroupOrderFromCartan(cartanRows, nodes = null) {
    const useNodes = nodes || Array.from({ length: cartanRows.length }, (_, index) => index);
    if (!useNodes.length) return 1n;
    return dynkinComponents(cartanRows, useNodes).reduce(
      (product, component) => product * irreducibleWeylOrderFromCartan(cartanRows, component),
      1n
    );
  }

  function weylOrbitSizeDominantDynkin(labels, cartanRows) {
    const zeroNodes = labels.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
    return (weylGroupOrderFromCartan(cartanRows) / weylGroupOrderFromCartan(cartanRows, zeroNodes)).toString();
  }

  function gcdBigInt(left, right) {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function normalizeFraction(fraction) {
    let [numerator, denominator] = fraction;
    if (denominator < 0n) {
      numerator = -numerator;
      denominator = -denominator;
    }
    const divisor = gcdBigInt(numerator, denominator);
    return [numerator / divisor, denominator / divisor];
  }

  function multiplyFractionByRatio(fraction, numerator, denominator) {
    let [leftNumerator, leftDenominator] = normalizeFraction(fraction);
    let rightNumerator = BigInt(numerator);
    let rightDenominator = BigInt(denominator);
    [rightNumerator, rightDenominator] = normalizeFraction([rightNumerator, rightDenominator]);
    let divisor = gcdBigInt(rightNumerator, leftDenominator);
    rightNumerator /= divisor;
    leftDenominator /= divisor;
    divisor = gcdBigInt(leftNumerator, rightDenominator);
    leftNumerator /= divisor;
    rightDenominator /= divisor;
    return normalizeFraction([leftNumerator * rightNumerator, leftDenominator * rightDenominator]);
  }

  function weylDimensionFraction(labels, cartanRows) {
    const positiveCoroots = positiveRootSimpleCoordinates(transposeMatrix(cartanRows));
    let dimension = [1n, 1n];
    for (const coroot of positiveCoroots) {
      const numerator = coroot.reduce((sum, value, index) => sum + value * (labels[index] + 1), 0);
      const denominator = coroot.reduce((sum, value) => sum + value, 0);
      dimension = multiplyFractionByRatio(dimension, numerator, denominator);
    }
    return normalizeFraction(dimension);
  }

  function weylDimensionDynkin(labels, cartanRows) {
    const [numerator, denominator] = weylDimensionFraction(labels, cartanRows);
    return denominator === 1n ? numerator.toString() : `${numerator.toString()}/${denominator.toString()}`;
  }

  function boundedWeightProjectionCandidates(highestLabels, cartanRows, cap = WEIGHT_INFO_PROJECTION_POINT_CAP) {
    const n = cartanRows.length;
    const gram = simpleRootGramFromCartan(cartanRows);
    const center = dynkinLabelsToSimpleCoordinates(highestLabels, cartanRows);
    if (!center) throw new Error("Could not express the highest weight in simple-root coordinates.");
    const radiusSquared = quadraticForm(gram, center) + 1e-8;
    const bounds = [];
    let boxSize = 1;
    let statusNote = "";
    for (let index = 0; index < n; index += 1) {
      const unit = Array(n).fill(0);
      unit[index] = 1;
      const inverseColumn = solveLinearSystem(gram, unit, "projection norm bound");
      if (!inverseColumn || !(inverseColumn[index] > 0)) throw new Error("Could not bound the projection norm ball.");
      const span = Math.sqrt(radiusSquared * inverseColumn[index]) + 1e-9;
      const lower = Math.max(0, Math.ceil(center[index] - span - 1e-9));
      const upper = Math.floor(center[index] + span + 1e-9);
      bounds.push([lower, upper]);
      boxSize *= Math.max(0, upper - lower + 1);
      if (boxSize > WEIGHT_INFO_PROJECTION_BOX_CAP) {
        throw new Error(`Projected dimension norm-bound box has ${boxSize} candidates before pruning; choose a smaller dominant weight.`);
      }
    }
    if (boxSize >= WEIGHT_INFO_PROJECTION_BOX_WARNING) {
      statusNote = `Projected dimension norm-bound box has ${boxSize.toLocaleString()} candidates before pruning; computation may be slow.`;
    }
    const points = [];
    const visit = (index, delta) => {
      if (index === n) {
        const simpleCoordinates = center.map((value, col) => value - delta[col]);
        if (quadraticForm(gram, simpleCoordinates) > radiusSquared) return;
        const labels = highestLabels.map((value, col) => value - dynkinSimpleToLabels(delta, cartanRows)[col]);
        points.push({ labels: cleanDynkinLabels(labels), delta: delta.slice() });
        if (points.length > cap) {
          throw new Error(`Projected dimension norm ball contains more than ${cap} candidate weights; choose a smaller dominant weight.`);
        }
        return;
      }
      const [lower, upper] = bounds[index];
      for (let value = lower; value <= upper; value += 1) {
        delta[index] = value;
        visit(index + 1, delta);
      }
      delta[index] = 0;
    };
    visit(0, Array(n).fill(0));
    points.sort((left, right) => dynkinVectorKey(left.labels).localeCompare(dynkinVectorKey(right.labels)));
    return { points, bounds, boxSize, radiusSquared, statusNote };
  }

  function buildWeightInfoFreudenthalContext(highestLabels, cartanRows) {
    const inner = dynkinInnerProductFromCartan(cartanRows);
    const rho = Array(cartanRows.length).fill(1);
    const rootsDynkin = positiveRootSimpleCoordinates(cartanRows).map((root) => dynkinSimpleToLabels(root, cartanRows));
    return {
      cartanRows,
      highest: highestLabels.slice(),
      highestKey: dynkinVectorKey(highestLabels),
      highestNorm: inner(highestLabels, highestLabels),
      highestRhoNorm: inner(add(highestLabels, rho), add(highestLabels, rho)),
      rho,
      rootsDynkin,
      inner,
    };
  }

  function isReachableFromHighestWeight(context, labels) {
    const cleanLabels = cleanDynkinLabels(labels);
    if (!cleanLabels.every((value) => Number.isInteger(value) && value >= -WEIGHT_INFO_EPS)) return false;
    const difference = dynkinLabelsToSimpleCoordinates(subtract(context.highest, cleanLabels), context.cartanRows);
    return isNonnegativeIntVector(integralVectorOrNull(difference));
  }

  function weightInfoMultiplicityFreudenthal(context) {
    const memo = new Map([[context.highestKey, 1]]);
    const visiting = new Set();
    const multiplicity = (rawLabels) => {
      const labels = cleanDynkinLabels(rawLabels);
      const key = dynkinVectorKey(labels);
      if (memo.has(key)) return memo.get(key);
      if (visiting.has(key)) return 0;
      if (!isReachableFromHighestWeight(context, labels)) {
        memo.set(key, 0);
        if (memo.size > WEIGHT_INFO_FREUDENTHAL_CAP) throw new Error(`Freudenthal recursion exceeded ${WEIGHT_INFO_FREUDENTHAL_CAP} dominant orbit representatives; choose a smaller dominant weight.`);
        return 0;
      }
      const labelsNorm = context.inner(labels, labels);
      if (labelsNorm > context.highestNorm + WEIGHT_INFO_EPS) {
        memo.set(key, 0);
        if (memo.size > WEIGHT_INFO_FREUDENTHAL_CAP) throw new Error(`Freudenthal recursion exceeded ${WEIGHT_INFO_FREUDENTHAL_CAP} dominant orbit representatives; choose a smaller dominant weight.`);
        return 0;
      }
      const labelsRho = add(labels, context.rho);
      const denominator = context.highestRhoNorm - context.inner(labelsRho, labelsRho);
      if (denominator <= WEIGHT_INFO_EPS) {
        memo.set(key, 0);
        if (memo.size > WEIGHT_INFO_FREUDENTHAL_CAP) throw new Error(`Freudenthal recursion exceeded ${WEIGHT_INFO_FREUDENTHAL_CAP} dominant orbit representatives; choose a smaller dominant weight.`);
        return 0;
      }
      visiting.add(key);
      let sum = 0;
      for (const root of context.rootsDynkin) {
        for (let step = 1; ; step += 1) {
          const beta = add(labels, scale(root, step));
          if (context.inner(beta, beta) > context.highestNorm + WEIGHT_INFO_EPS) break;
          if (step > 10000) throw new Error("Freudenthal recursion did not reach the norm bound; choose a smaller dominant weight.");
          const dominant = dominantDynkinRepresentative(context.cartanRows, beta);
          if (!dominant) continue;
          const value = multiplicity(dominant);
          if (!value) continue;
          sum += context.inner(beta, root) * value;
        }
      }
      visiting.delete(key);
      const rawValue = (2 * sum) / denominator;
      const value = Number.isFinite(rawValue) ? Math.max(0, Math.round(rawValue)) : 0;
      memo.set(key, value);
      if (memo.size > WEIGHT_INFO_FREUDENTHAL_CAP) throw new Error(`Freudenthal recursion exceeded ${WEIGHT_INFO_FREUDENTHAL_CAP} dominant orbit representatives; choose a smaller dominant weight.`);
      return value;
    };
    multiplicity.memo = memo;
    return multiplicity;
  }

  function dynkinWeightProjectionCharacter(info) {
    if (!info?.dominant) return { status: "dimensions require a dominant highest weight gamma", entries: [] };
    const cacheKey = `${info.dynkinType}:${info.rank}:${dynkinVectorKey(info.gammaLabels)}`;
    if (dynkinWeightCharacterCache.has(cacheKey)) return dynkinWeightCharacterCache.get(cacheKey);
    try {
      const bounded = boundedWeightProjectionCandidates(info.gammaLabels, info.cartanRows);
      const context = buildWeightInfoFreudenthalContext(info.gammaLabels, info.cartanRows);
      const multiplicity = weightInfoMultiplicityFreudenthal(context);
      const basisRows = fundamentalWeightMatrixRows(info.dynkinType, info.rank);
      const entries = [];
      for (const candidate of bounded.points) {
        const dominant = dominantDynkinRepresentative(info.cartanRows, candidate.labels);
        if (!dominant) continue;
        const value = multiplicity(dominant);
        if (value <= 0) continue;
        entries.push({
          labels: candidate.labels.slice(),
          ambient: multiplyMatrixVector(basisRows, candidate.labels),
          value,
          key: dynkinVectorKey(candidate.labels),
        });
        if (entries.length > WEIGHT_INFO_PROJECTION_POINT_CAP) {
          throw new Error(`Projected dimensions contain more than ${WEIGHT_INFO_PROJECTION_POINT_CAP} points; choose a smaller dominant weight.`);
        }
      }
      const result = {
        status: "computed",
        entries,
        candidateCount: bounded.points.length,
        statusNote: bounded.statusNote,
      };
      if (dynkinWeightCharacterCache.size > 24) dynkinWeightCharacterCache.clear();
      dynkinWeightCharacterCache.set(cacheKey, result);
      return result;
    } catch (error) {
      return { status: error.message, entries: [] };
    }
  }

  function formatDynkinVectorDisplay(vector) {
    const values = vector.map((value) => latticeCoefficientText(value));
    return {
      plain: `[${values.join(", ")}]`,
      tex: `\\left[${values.join(", ")}\\right]`,
    };
  }

  function dynkinBasisExpressionDisplay(coefficients, prefix) {
    const symbol = prefix === "omega" ? "\\omega" : "\\alpha";
    const labels = Array.from({ length: state.ambientDim }, (_, index) => ({
      plain: `${prefix}_${index + 1}`,
      tex: `${symbol}_{${index + 1}}`,
    }));
    return latticeCoefficientExpressionDisplay(coefficients, labels);
  }

  function isDynkinLatticePickCandidate(candidate) {
    if (!candidate?.latticePoint) return false;
    const object = state.objects.find((item) => item.id === candidate.objectId);
    return !!object &&
      objectTypeKey(object) === "lattice" &&
      normalizeLatticeBasisMode(object.data?.basisMode) === "dynkin";
  }

  function dynkinWeightInfoForCandidate(candidate) {
    if (!isDynkinLatticePickCandidate(candidate)) return null;
    const object = state.objects.find((item) => item.id === candidate.objectId);
    const data = object?.data || {};
    const dynkinType = normalizeWeylDynkinType(data.dynkinType, state.ambientDim);
    const kind = normalizeDynkinLatticeKind(data.dynkinLatticeKind);
    try {
      const omegaCoordinates = dynkinLatticeCoordinates(
        "weight",
        dynkinType,
        candidate.ambient,
        kind === "weight" ? candidate.latticeCoefficients : null
      );
      const alphaCoordinates = dynkinLatticeCoordinates(
        "root",
        dynkinType,
        candidate.ambient,
        kind === "root" ? candidate.latticeCoefficients : null
      );
      const gammaLabels = integralVectorOrNull(omegaCoordinates) || cleanDynkinLabels(omegaCoordinates);
      const cartanRows = dynkinCartanMatrix(dynkinType, state.ambientDim);
      const simpleCoordinates = dynkinLabelsToSimpleCoordinates(gammaLabels, cartanRows);
      const simpleIntegral = integralVectorOrNull(simpleCoordinates);
      const inner = dynkinInnerProductFromCartan(cartanRows);
      const normValue = Math.sqrt(Math.max(0, inner(gammaLabels, gammaLabels)));
      const dominant = isDominantDynkinLabels(gammaLabels);
      let orbitSize = "not computed";
      try {
        const dominantRepresentative = dominantDynkinRepresentative(cartanRows, gammaLabels);
        orbitSize = dominantRepresentative ? weylOrbitSizeDominantDynkin(dominantRepresentative, cartanRows) : "not computed";
      } catch {
        orbitSize = "not computed";
      }
      return {
        object,
        candidate,
        kind,
        dynkinType,
        rank: state.ambientDim,
        cartanRows,
        gammaLabels,
        omegaCoordinates,
        alphaCoordinates,
        simpleIntegral,
        normValue,
        dominant,
        dimension: dominant ? weylDimensionDynkin(gammaLabels, cartanRows) : "not dominant",
        orbitSize,
        gammaDisplay: dynkinBasisExpressionDisplay(gammaLabels, "omega"),
        alphaDisplay: simpleIntegral ? dynkinBasisExpressionDisplay(simpleIntegral, "alpha") : null,
      };
    } catch (error) {
      return {
        object,
        candidate,
        kind,
        dynkinType,
        rank: state.ambientDim,
        error: error.message,
      };
    }
  }

  function appendWeightInfoRow(container, label, value) {
    const row = document.createElement("div");
    row.className = "slice-info-row";
    const labelElement = document.createElement("span");
    labelElement.className = "slice-info-label";
    labelElement.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.className = "slice-info-value";
    if (typeof Node !== "undefined" && value instanceof Node) {
      valueElement.append(value);
    } else if (value && typeof value === "object" && ("plain" in value || "tex" in value)) {
      const math = document.createElement("span");
      setMathText(math, value.plain || "", value.tex || labelToTex(value.plain || ""));
      valueElement.append(math);
    } else {
      valueElement.textContent = String(value ?? "");
    }
    row.append(labelElement, valueElement);
    container.append(row);
  }

  function weightInfoDimensionControls() {
    state.weightInfoDimensionMode = normalizeWeightInfoDimensionMode(state.weightInfoDimensionMode);
    const controls = document.createElement("div");
    controls.className = "slice-segmented";
    controls.setAttribute("aria-label", "Weight dimension projection overlay");
    [
      ["none", "none"],
      ["dots", "dots"],
      ["numbers", "numbers"],
    ].forEach(([mode, label]) => {
      const button = document.createElement("button");
      button.className = `slice-segment${state.weightInfoDimensionMode === mode ? " active" : ""}`;
      button.type = "button";
      button.dataset.weightInfoDimensionMode = mode;
      button.textContent = label;
      button.setAttribute("aria-pressed", state.weightInfoDimensionMode === mode ? "true" : "false");
      controls.append(button);
    });
    return controls;
  }

  function renderWeightInfoCard(candidate = currentSelectedCandidate()) {
    const output = $("slice-weight-info-out");
    if (!output) return;
    output.innerHTML = "";
    const info = dynkinWeightInfoForCandidate(candidate);
    if (!info) {
      const note = document.createElement("span");
      note.className = "slice-card-note";
      note.textContent = "Click a Dynkin root or weight lattice point in the projection canvas.";
      output.append(note);
      return;
    }
    appendWeightInfoRow(output, "source", `${info.object.name} / ${info.candidate.label}`);
    appendWeightInfoRow(output, "type", weylDynkinLabel(info.dynkinType, info.rank));
    if (info.error) {
      appendWeightInfoRow(output, "status", info.error);
      return;
    }
    appendWeightInfoRow(output, "gamma", info.gammaDisplay);
    appendWeightInfoRow(output, "Dynkin", formatDynkinVectorDisplay(info.gammaLabels));
    appendWeightInfoRow(output, "simple", info.alphaDisplay || "not in root lattice");
    appendWeightInfoRow(output, "|gamma|", fmt(info.normValue, 6));
    appendWeightInfoRow(output, "dim V^gamma", info.dimension);
    appendWeightInfoRow(output, "|W.gamma|", info.orbitSize);
    appendWeightInfoRow(output, "dimensions", weightInfoDimensionControls());
    if (state.weightInfoDimensionMode !== "none") {
      const character = dynkinWeightProjectionCharacter(info);
      if (character.status === "computed") {
        appendWeightInfoRow(output, "projection", `${character.entries.length} points from ${character.candidateCount} candidates`);
        if (character.statusNote) appendWeightInfoRow(output, "status", character.statusNote);
      } else {
        appendWeightInfoRow(output, "status", character.status || "dimension overlay unavailable");
      }
    }
  }

  function weightInfoDimensionDotRadius(value) {
    const dim = Math.abs(finiteNumber(value, 1));
    if (dim <= 1) return 5.8;
    if (dim === 2) return 7.8;
    if (dim === 3) return 9.2;
    if (dim === 4) return 10.4;
    return 12.0;
  }

  function drawWeightInfoDimensionOverlay(ctx, view) {
    state.weightInfoDimensionMode = normalizeWeightInfoDimensionMode(state.weightInfoDimensionMode);
    if (state.weightInfoDimensionMode === "none") return;
    const info = dynkinWeightInfoForCandidate(currentSelectedCandidate());
    if (!info || info.error || !info.dominant) return;
    const character = dynkinWeightProjectionCharacter(info);
    if (character.status !== "computed" || !character.entries.length) return;
    const mode = state.weightInfoDimensionMode;
    const selectedKey = dynkinVectorKey(info.gammaLabels);
    const ratio = view.ratio || 1;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const entry of character.entries) {
      const projected = projectAmbient(entry.ambient, view);
      if (projected.frameCoords && !viewportPointInside(projected.frameCoords, state.viewport.boxRadius)) continue;
      const selected = entry.key === selectedKey;
      if (mode === "numbers") {
        const text = String(entry.value);
        ctx.font = `${Math.max(13, 13 * ratio)}px "JetBrains Mono", Consolas, monospace`;
        const radius = Math.max(11.5 * ratio, ctx.measureText(text).width / 2 + 7.2 * ratio);
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#dfeef9";
        ctx.fill();
        ctx.strokeStyle = selected ? "#111" : "#1f5f9c";
        ctx.lineWidth = selected ? 2.0 * ratio : 1.35 * ratio;
        ctx.stroke();
        ctx.fillStyle = "#111";
        ctx.fillText(text, projected.x, projected.y + 0.4 * ratio);
      } else {
        const radius = weightInfoDimensionDotRadius(entry.value) * ratio;
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#dfeef9";
        ctx.fill();
        ctx.strokeStyle = "#1f5f9c";
        ctx.lineWidth = selected ? 2.0 * ratio : 1.35 * ratio;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function frameMatrixToString(columns) {
    const rows = frameRows(columns);
    const header = `      ${columns.map((_, index) => `v${index + 1}`.padStart(7, " ")).join(" ")}`;
    const body = rows
      .map((row, rowIndex) => `e${rowIndex + 1}`.padEnd(4, " ") + `[${row.map((value) => fmt(value, 4).padStart(7, " ")).join(" ")}]`)
      .join("\n");
    return `${header}\n${body}`;
  }

  function updateDebug() {
    const counts = collectCounts();
    const picked = currentSelectedCandidate();
    const pickedDisplay = pickedCandidateDisplay(picked);
    const pickedStatus = pickedCandidateStatusDisplay(picked);
    const latticeWarningText = counts.latticeWarnings.length
      ? counts.latticeWarnings[0]
      : `${counts.latticeProjectionDrawn}/${counts.latticeProjectionVisible} visible lattice pts from ${counts.latticeProjectionGenerated} ambient${counts.latticeProjectionSuppressed ? ` / ${counts.latticeProjectionSuppressed} root-owned hidden` : ""} / ${counts.sliceVoronoiHalfspaces} Voronoi halfspaces${counts.latticeInfoMessages.length ? `; ${counts.latticeInfoMessages[0]}` : ""}`;
    const latticeCapText = counts.latticeProjectionDisplayCapped
      ? `drawing capped at ${counts.latticeProjectionDrawn}/${counts.latticeProjectionVisible} visible; reduce that lattice point-bound radius`
      : counts.latticeEnumerationCapped
        ? "lattice point search capped; reduce that lattice point-bound radius"
        : "none";
    const voronoiProjectionText = counts.voronoiProjectionVertices || counts.voronoiProjectionEdges || counts.voronoiProjectionBuildMs
      ? `${counts.voronoiProjectionVertices} vertices / ${counts.voronoiProjectionEdges} edges${counts.voronoiProjectionCapped ? " (partial)" : ""}`
      : "none";
    const klStatus = counts.sliceWeylKlStatus || "";
    const klNeedsAttention = /select|skipped|exceeded|outside/i.test(klStatus);
    const highlightWarning = !!counts.latticeWarnings.length || !!counts.projectionWarnings.length || counts.latticeProjectionDisplayCapped || counts.latticeEnumerationCapped || counts.voronoiProjectionCapped || klNeedsAttention;
    writeDefinitionList("visible-counts", [
      ["objects", `${counts.visibleObjects}/${state.objects.length}`],
      ["proj objects", String(counts.projectionObjects)],
      ["proj pts", String(counts.points)],
      ["proj edges", String(counts.edges)],
      ["proj rays", String(counts.rays)],
      ["slice objects", state.sliceDim === 2 ? String(counts.sliceObjects) : "disabled in 3D"],
      ["slice cells", `${counts.slicePolygons} poly / ${counts.sliceCircles} circ / ${counts.sliceConics} conic / ${counts.sliceImplicit} implicit / ${counts.sliceTropicalSegments} tropical seg / ${counts.sliceTropicalDistricts} tropical dist / ${counts.sliceWeylWalls} Weyl walls / ${counts.sliceWeylChambers} Weyl chambers / ${counts.sliceVoronoiCells} Voronoi / ${counts.slicePoints} pts`],
    ]);
    writeDefinitionList("slice-diagnostics", [
      ["renderer", "projection + exact/numeric 2D slice"],
      ["frame dimension", `${state.sliceDim}D`],
      ["formula/tropical/Weyl renderer", state.sliceDim === 2 ? "formula exact/numeric; tropical/Weyl exact" : "2D only"],
      ["draw runtime", `${fmt(runtimeStats.drawMs, 2)} ms`],
      ["slice runtime", `${fmt(runtimeStats.exactSliceMs, 2)} ms`],
      ["tropical skips", counts.sliceTropicalSkippedPairs || counts.sliceTropicalSkippedDistricts ? `${counts.sliceTropicalSkippedPairs} pairs / ${counts.sliceTropicalSkippedDistricts} districts` : "none"],
      ["Weyl skips", counts.sliceWeylSkippedWalls || counts.sliceWeylDuplicateWalls ? `${counts.sliceWeylSkippedWalls} skipped / ${counts.sliceWeylDuplicateWalls} duplicate` : "none"],
      ["Weyl KL", klStatus || "none"],
      ["lattice", latticeWarningText],
      ["lattice build", `${fmt(counts.latticeBuildMs, 2)} ms`],
      ["lattice caps", latticeCapText],
      ["Voronoi proj", voronoiProjectionText],
      ["Vor proj build", counts.voronoiProjectionBuildMs ? `${fmt(counts.voronoiProjectionBuildMs, 2)} ms` : "none"],
      ["halfspaces", runtimeStats.halfspaceCount ? `${runtimeStats.halfspaceCount} (${runtimeStats.heavyFamily})` : "none"],
      ["halfspace build", `${fmt(runtimeStats.halfspaceMs, 2)} ms`],
      ["empty warning", counts.visibleObjects ? "none" : "no visible objects"],
      ["orth error", fmt(maxOrthogonalityError(), 6)],
    ]);
    const statusMessage = klStatus || state.lastWarning;
    const warningMessage = highlightWarning
      ? (counts.latticeWarnings[0] || counts.projectionWarnings[0] || (klNeedsAttention ? klStatus : "") || statusMessage)
      : statusMessage;
    $("debug-warnings").textContent = warningMessage;
    const sourceStatus = $("source-status");
    if (pickedStatus) {
      renderSourceStatusMath(sourceStatus, pickedStatus.plain, pickedStatus.tex);
    } else if (!highlightWarning && counts.sliceWeylKlStatusFormula && warningMessage === klStatus) {
      renderSourceStatusFormula(sourceStatus, counts.sliceWeylKlStatusFormula);
    } else if (!highlightWarning && counts.sliceWeylKlStatusParts && warningMessage === klStatus) {
      renderSourceStatusParts(sourceStatus, counts.sliceWeylKlStatusParts);
    } else if (!highlightWarning && state.lastWarningMath?.plain === warningMessage) {
      renderSourceStatusMath(sourceStatus, state.lastWarningMath.plain, state.lastWarningMath.tex);
    } else {
      renderSourceStatusText(sourceStatus, warningMessage);
    }
    $("debug-warnings").classList.toggle("highlight", highlightWarning);
    $("source-status").classList.toggle("highlight", highlightWarning && !pickedStatus);
    const targetText = state.activeVectorTarget
      ? `${state.activeVectorTarget.objectName} / ${state.activeVectorTarget.slotLabel}`
      : "";
    const previewText = state.sourceMode === "add" ? `preview ${currentTypeLabel(state.addType, state.ambientDim)}` : "";
    renderHudChips([
      { plain: `n=${state.ambientDim}`, tex: `n=${state.ambientDim}` },
      { plain: `k=${state.sliceDim}`, tex: `k=${state.sliceDim}` },
      { plain: `active ${directionLabel()}`, tex: `\\mathrm{active}\\ ${labelToTex(directionLabel())}` },
      { plain: "projection / exact+numeric 2D slice", tex: "\\mathrm{projection\\ /\\ exact{+}numeric\\ 2D\\ slice}" },
      ...(previewText ? [{ plain: previewText, tex: `\\text{${texText(previewText)}}` }] : []),
      ...(pickedDisplay ? [{ plain: `picked: ${pickedDisplay.plain}`, tex: `\\text{picked: }${pickedDisplay.tex}` }] : []),
      ...(targetText ? [{ plain: `target: ${targetText}`, tex: `\\text{target: ${texText(targetText)}}` }] : []),
    ]);
    renderStatusBar([
      { plain: `p [${state.p.map((value) => fmt(value, 2)).join(", ")}]`, tex: `p\\ ${vectorToTex(state.p, 2)}` },
      { plain: `objects ${counts.visibleObjects} visible`, tex: `\\mathrm{objects}\\ ${counts.visibleObjects}\\ \\mathrm{visible}` },
      { plain: `zoom ${fmt(state.viewport.zoom, 2)}`, tex: `\\mathrm{zoom}\\ ${fmt(state.viewport.zoom, 2)}` },
      { plain: `${viewportBoundLabel()} ${fmt(state.viewport.boxRadius, 2)}`, tex: `\\mathrm{${texText(viewportBoundLabel())}}\\ ${fmt(state.viewport.boxRadius, 2)}` },
      ...(pickedDisplay ? [{ plain: `picked ${pickedDisplay.plain}`, tex: `\\text{picked }${pickedDisplay.tex}` }] : []),
    ]);
    renderWeightInfoCard(picked);
    queueMathTypeset();
  }

  function writeDefinitionList(id, rows) {
    const list = $(id);
    list.innerHTML = "";
    for (const [term, description] of rows) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = description;
      list.append(dt, dd);
    }
  }

  function syncStaticMathLabels() {
    const dimensionLabel = document.querySelector(".slice-toolbar-dimension span");
    if (dimensionLabel) setMathText(dimensionLabel, "n=", "n=");
    const directVectorParts = document.querySelectorAll(".slice-direct-vector > span:not(#direct-position-inputs)");
    if (directVectorParts[0]) setMathText(directVectorParts[0], "p = (", "p=(");
    if (directVectorParts[1]) setMathText(directVectorParts[1], ")", ")");
  }

  function syncCanvasLabelSize() {
    const overlay = $("slice-label-overlay");
    if (!overlay) return;
    overlay.style.setProperty("--slice-canvas-label-size", `${normalizeCanvasLabelSize(state.viewport.labelSize)}rem`);
  }

  function renderHudChips(chips) {
    const hud = $("slice-hud");
    hud.innerHTML = "";
    chips.forEach((chip) => {
      const span = document.createElement("span");
      span.className = "slice-chip";
      setMathText(span, chip.plain, chip.tex);
      hud.append(span);
    });
  }

  function renderStatusBar(items) {
    const bar = $("slice-status-bar");
    bar.innerHTML = "";
    items.forEach((item) => {
      const span = document.createElement("span");
      setMathText(span, item.plain, item.tex);
      bar.append(span);
    });
  }

  function clearMathTextElement(element) {
    element.classList.remove("slice-math");
    delete element.dataset.mathPlain;
    delete element.dataset.mathTex;
  }

  function renderSourceStatusText(element, text) {
    if (!element) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([element]);
    clearMathTextElement(element);
    element.classList.remove("slice-kl-status-rendered");
    element.textContent = String(text || "");
  }

  function renderSourceStatusParts(element, parts) {
    if (!element) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([element]);
    clearMathTextElement(element);
    element.classList.remove("slice-kl-status-rendered");
    element.innerHTML = "";
    (parts || []).forEach((part) => {
      if (typeof part === "string") {
        element.append(document.createTextNode(part));
        return;
      }
      const span = document.createElement("span");
      span.className = `slice-kl-status-term${part.active ? " active" : ""}`;
      span.textContent = String(part.text || "");
      element.append(span);
    });
  }

  function renderSourceStatusMath(element, plain, tex) {
    if (!element) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([element]);
    element.classList.remove("slice-kl-status-rendered");
    setMathText(element, plain, tex);
  }

  function renderSourceStatusFormula(element, formula) {
    if (!element) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([element]);
    clearMathTextElement(element);
    element.classList.add("slice-kl-status-rendered");
    element.innerHTML = "";
    const label = document.createElement("span");
    label.className = "slice-kl-status-label";
    label.textContent = formula?.label ? `${formula.label}:` : "";
    const math = document.createElement("div");
    math.className = "slice-kl-status-formula";
    math.dataset.mathPlain = formula?.plain || "0";
    const rows = Array.isArray(formula?.rows) && formula.rows.length
      ? formula.rows
      : [{ parts: [{ text: formula?.plain || "0", tex: formula?.tex || "0", active: false }] }];
    rows.forEach((row) => {
      const rowElement = document.createElement("div");
      rowElement.className = "slice-kl-status-row";
      (row.parts || []).forEach((part) => {
        const partElement = document.createElement("span");
        partElement.className = part.separator
          ? "slice-kl-status-separator"
          : `slice-kl-status-term${part.active ? " active" : ""}`;
        setMathText(partElement, part.text || "", part.tex || labelToTex(part.text || ""));
        rowElement.append(partElement);
      });
      math.append(rowElement);
    });
    element.append(label, math);
  }

  function collectCounts() {
    const counts = {
      visibleObjects: 0,
      projectionObjects: 0,
      sliceObjects: 0,
      points: 0,
      edges: 0,
      rays: 0,
      slicePolygons: 0,
      sliceCircles: 0,
      sliceConics: 0,
      sliceImplicit: 0,
      sliceTropicalSegments: 0,
      sliceTropicalDistricts: 0,
      sliceTropicalSkippedPairs: 0,
      sliceTropicalSkippedDistricts: 0,
      sliceWeylWalls: 0,
      sliceWeylChambers: 0,
      sliceWeylSkippedWalls: 0,
      sliceWeylDuplicateWalls: 0,
      sliceWeylKlStatus: "",
      sliceWeylKlStatusParts: null,
      sliceWeylKlStatusFormula: null,
      sliceVoronoiCells: 0,
      sliceVoronoiHalfspaces: 0,
      latticeProjectionPoints: 0,
      latticeProjectionGenerated: 0,
      latticeProjectionVisible: 0,
      latticeProjectionDrawn: 0,
      latticeProjectionSuppressed: 0,
      latticeProjectionDisplayCapped: false,
      latticeEnumerationCapped: false,
      latticeWarnings: [],
      latticeInfoMessages: [],
      latticeBuildMs: 0,
      voronoiProjectionVertices: 0,
      voronoiProjectionEdges: 0,
      voronoiProjectionCapped: false,
      voronoiProjectionBuildMs: 0,
      projectionWarnings: [],
      slicePoints: 0,
    };
    for (const object of state.objects) {
      let hasVisibleLayer = false;
      if (object.visibleProjection) {
        hasVisibleLayer = true;
        counts.projectionObjects += 1;
        const drawable = drawableData(object);
        counts.points += drawable.points.length;
        counts.edges += drawable.edges.length;
        counts.rays += drawable.rays.length;
        if (objectTypeKey(object) === "lattice") {
          const lattice = drawable.lattice || {};
          counts.latticeProjectionPoints += drawable.points.length;
          counts.latticeProjectionGenerated += finiteNumber(lattice.enumerated, drawable.points.length);
          counts.latticeProjectionVisible += finiteNumber(lattice.visible, drawable.points.length);
          counts.latticeProjectionDrawn += finiteNumber(lattice.drawn, drawable.points.length);
          counts.latticeProjectionSuppressed += finiteNumber(lattice.suppressedByRootLattice, 0);
          counts.latticeProjectionDisplayCapped = counts.latticeProjectionDisplayCapped || !!lattice.displayCapped;
          counts.latticeEnumerationCapped = counts.latticeEnumerationCapped || !!lattice.enumerationCapped;
          if (lattice.status) {
            if (lattice.infoOnly) counts.latticeInfoMessages.push(lattice.status);
            else counts.latticeWarnings.push(lattice.status);
          }
          if (object.data?.latticeStatus && /warning|missing|capped|rank/i.test(object.data.latticeStatus)) {
            counts.latticeWarnings.push(object.data.latticeStatus);
          }
        } else if (objectTypeKey(object) === "voronoi-diagram") {
          const projection = drawable.voronoiProjection || {};
          counts.voronoiProjectionVertices += finiteNumber(projection.vertexCount, drawable.points.length);
          counts.voronoiProjectionEdges += finiteNumber(projection.edgeCount, drawable.edges.length);
          counts.voronoiProjectionCapped = counts.voronoiProjectionCapped || !!projection.capped;
          counts.voronoiProjectionBuildMs += finiteNumber(projection.buildMs, 0);
          if (projection.status && /warning|missing|capped|partial|rank|invalid/i.test(projection.status)) {
            counts.projectionWarnings.push(projection.status);
          }
        }
      }
      if (object.visibleSlice && canDrawExact2DSlice(object)) {
        hasVisibleLayer = true;
        const slice = exactSliceData(object);
        if (slice.kind !== "empty") {
          counts.sliceObjects += 1;
          if (slice.kind === "polygon") counts.slicePolygons += 1;
          if (slice.kind === "circle") counts.sliceCircles += 1;
          if (slice.kind === "conic") counts.sliceConics += 1;
          if (slice.kind === "implicit-formula") counts.sliceImplicit += 1;
          if (slice.kind === "tropical-curve") {
            counts.sliceTropicalSegments += (slice.segments || []).length;
            if (slice.showDistricts !== false) counts.sliceTropicalDistricts += (slice.districts || []).length;
            counts.sliceTropicalSkippedPairs += slice.skippedPairs || 0;
            counts.sliceTropicalSkippedDistricts += slice.skippedDistricts || 0;
          }
          if (slice.kind === "weyl-chambers") {
            counts.sliceWeylWalls += (slice.walls || []).length;
            if (slice.showChambers !== false) counts.sliceWeylChambers += (slice.chambers || []).length;
            counts.sliceWeylSkippedWalls += slice.skippedWalls || 0;
            counts.sliceWeylDuplicateWalls += slice.duplicateWalls || 0;
            if (slice.klStatus) {
              if (typeof slice.klStatus === "string") {
                counts.sliceWeylKlStatus = slice.klStatus;
                counts.sliceWeylKlStatusParts = null;
                counts.sliceWeylKlStatusFormula = null;
              } else {
                counts.sliceWeylKlStatus = slice.klStatus.plain || "";
                counts.sliceWeylKlStatusParts = slice.klStatus.parts || null;
                counts.sliceWeylKlStatusFormula = slice.klStatus.formula || null;
              }
            }
          }
          if (slice.kind === "lattice-voronoi") {
            counts.sliceVoronoiCells += 1;
            counts.sliceVoronoiHalfspaces += slice.latticeHalfspaces || (slice.halfspaces || []).length;
            counts.latticeBuildMs += finiteNumber(slice.latticeBuildMs, 0);
            counts.latticeEnumerationCapped = counts.latticeEnumerationCapped || !!slice.latticeEnumerationCapped;
            if (slice.latticeStatus && /warning|missing|capped|rank/i.test(slice.latticeStatus)) {
              counts.latticeWarnings.push(slice.latticeStatus);
            }
          }
          if (slice.kind === "point") counts.slicePoints += 1;
          if (slice.kind === "segment") counts.slicePoints += 2;
        }
      }
      if (hasVisibleLayer) counts.visibleObjects += 1;
    }
    return counts;
  }

  function maxOrthogonalityError() {
    let maxError = 0;
    const gram = gramMatrix(state.frame);
    for (let i = 0; i < gram.length; i += 1) {
      for (let j = 0; j < gram.length; j += 1) {
        const target = i === j ? 1 : 0;
        maxError = Math.max(maxError, Math.abs(gram[i][j] - target));
      }
    }
    return maxError;
  }

  function resizeCanvas() {
    const canvas = $("slice-viewport");
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width * ratio));
    const height = Math.max(320, Math.floor(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    draw();
  }

  function draw() {
    const drawStart = nowMs();
    runtimeStats.drawMs = 0;
    runtimeStats.exactSliceMs = 0;
    runtimeStats.halfspaceMs = 0;
    runtimeStats.halfspaceCount = 0;
    runtimeStats.heavyFamily = "";
    const canvas = $("slice-viewport");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    clearCanvasMathLabels();
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);

    const view = {
      centerX: width / 2,
      centerY: height / 2,
      scale: (Math.min(width, height) / (2.3 * state.viewport.boxRadius)) * state.viewport.zoom,
      ratio,
    };
    state.pickCandidates = [];
    state.tropicalDistrictPickCandidates = [];
    state.weylChamberPickCandidates = [];
    state.toricConePickCandidates = [];

    if (state.viewport.showGrid) drawGrid(ctx, view, width, height);
    if (state.viewport.showBox) drawViewportBound(ctx, view);
    if (state.viewport.showAxes) drawAxes(ctx, view);

    for (const object of state.objects) {
      if (object.visibleProjection) drawObject(ctx, view, object, { registerPick: true });
    }

    for (const object of state.objects) {
      if (object.visibleSlice && canDrawExact2DSlice(object)) drawExactSliceObject(ctx, view, object, { registerPick: true });
    }

    drawWeightInfoDimensionOverlay(ctx, view);

    if (state.sourceMode === "add") drawObject(ctx, view, makePreviewObject(), { preview: true, registerPick: false });
    drawSelectedVertex(ctx, view);

    if (state.viewport.exactSphereGuide) drawSphereGuide(ctx, view);
    runtimeStats.drawMs = nowMs() - drawStart;
    queueMathTypeset();
  }

  function drawGrid(ctx, view, width, height) {
    const step = view.scale;
    ctx.save();
    ctx.strokeStyle = "rgba(216, 208, 196, 0.58)";
    ctx.lineWidth = 1 * view.ratio;
    for (let x = view.centerX % step; x < width; x += step) line(ctx, x, 0, x, height);
    for (let y = view.centerY % step; y < height; y += step) line(ctx, 0, y, width, y);
    ctx.restore();
  }

  function drawViewportBound(ctx, view) {
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      drawDiskBound(ctx, view);
    } else {
      drawBox(ctx, view);
    }
  }

  function applyViewportCanvasClip(ctx, view) {
    const r = state.viewport.boxRadius;
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      const center = projectY([0, 0, 0], view);
      ctx.beginPath();
      ctx.arc(center.x, center.y, r * view.scale, 0, Math.PI * 2);
      ctx.clip();
      return;
    }
    const a = projectY([-r, -r, 0], view);
    const b = projectY([r, r, 0], view);
    ctx.beginPath();
    ctx.rect(a.x, b.y, b.x - a.x, a.y - b.y);
    ctx.clip();
  }

  function drawBox(ctx, view) {
    const r = state.viewport.boxRadius;
    const a = projectY([-r, -r, 0], view);
    const b = projectY([r, r, 0], view);
    ctx.save();
    ctx.strokeStyle = "rgba(47, 125, 112, 0.32)";
    ctx.lineWidth = 1.5 * view.ratio;
    ctx.strokeRect(a.x, b.y, b.x - a.x, a.y - b.y);
    ctx.restore();
  }

  function drawDiskBound(ctx, view) {
    const r = state.viewport.boxRadius;
    const center = projectY([0, 0, 0], view);
    ctx.save();
    ctx.strokeStyle = "rgba(47, 125, 112, 0.32)";
    ctx.lineWidth = 1.5 * view.ratio;
    ctx.beginPath();
    ctx.arc(center.x, center.y, r * view.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawAxes(ctx, view) {
    const r = state.viewport.boxRadius;
    const x0 = projectY([-r, 0, 0], view);
    const x1 = projectY([r, 0, 0], view);
    const y0 = projectY([0, -r, 0], view);
    const y1 = projectY([0, r, 0], view);
    ctx.save();
    ctx.strokeStyle = "rgba(44, 74, 85, 0.72)";
    ctx.lineWidth = 1.2 * view.ratio;
    line(ctx, x0.x, x0.y, x1.x, x1.y);
    line(ctx, y0.x, y0.y, y1.x, y1.y);
    if (state.viewport.showLabels) {
      addCanvasMathLabel(view, x1, "y1", "y_{1}", { offsetX: 6, offsetY: -4, color: "#2c4a55" });
      addCanvasMathLabel(view, y1, "y2", "y_{2}", { offsetX: 6, offsetY: -4, color: "#2c4a55" });
    }
    ctx.restore();
  }

  function drawObject(ctx, view, object, options = {}) {
    const rawData = object.data || {};
    const style = object.style || {};
    const color = style.color || "#2f7d70";
    const alpha = clamp(finiteNumber(style.opacity, 0.85), 0.05, 1);
    const pointSize = finiteNumber(style.pointSize, 4) * view.ratio;
    const lineWidth = finiteNumber(style.lineWidth, 2) * view.ratio;
    if (rawData.objectType === "toric-cone") {
      drawToricConeProjection(ctx, view, object, { ...options, color, alpha, pointSize, lineWidth });
      return;
    }
    if ((object.kind === "sphere" || rawData.objectType === "sphere") && state.sliceDim === 2) {
      drawAnalyticSphereObject(ctx, view, object, { ...options, color, alpha, pointSize, lineWidth });
      return;
    }
    const data = drawableData(object);
    const projected = data.points.map((point) => projectAmbient(point, view));
    const pointMetadata = Array.isArray(data.pointMetadata) ? data.pointMetadata : [];
    const registerPick = options.registerPick !== false;
    const rayOriginKeys = new Set();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (options.preview) ctx.setLineDash([6 * view.ratio, 5 * view.ratio]);
    applyViewportCanvasClip(ctx, view);

    for (const [a, b] of data.edges) {
      if (!projected[a] || !projected[b]) continue;
      line(ctx, projected[a].x, projected[a].y, projected[b].x, projected[b].y);
    }

    for (const [rayIndex, ray] of data.rays.entries()) {
      const origin = projectAmbient(ray.origin, view);
      const rayLength = finiteNumber(ray.length, state.viewport.boxRadius);
      const tipAmbient = add(ray.origin, scale(normalize(resizeVector(ray.direction, state.ambientDim)), rayLength));
      const tip = projectAmbient(tipAmbient, view);
      line(ctx, origin.x, origin.y, tip.x, tip.y);
      drawArrowHead(ctx, origin, tip, Math.max(7 * view.ratio, lineWidth * 2.4));
      const originKey = `ray-origin:${origin.ambient.map((value) => fmt(value, 6)).join(",")}`;
      if (!rayOriginKeys.has(originKey)) {
        rayOriginKeys.add(originKey);
        drawPoint(ctx, origin.x, origin.y, Math.max(pointSize, 3 * view.ratio));
        if (registerPick) recordPickCandidate(object, origin, "origin", originKey, Math.max(pointSize, 3 * view.ratio));
      }
      drawPoint(ctx, tip.x, tip.y, Math.max(pointSize, 4 * view.ratio));
      if (registerPick) {
        recordPickCandidate(object, tip, ray.label || `rho_${rayIndex + 1}`, `ray-tip:${rayIndex}`, Math.max(pointSize, 4 * view.ratio));
      }
      if (shouldDrawObjectLabels(object) && rayIndex < 48) {
        const label = ray.label || `rho_${rayIndex + 1}`;
        addCanvasMathLabel(view, tip, label, labelToTex(label), { offsetX: 5, offsetY: -5, color });
      }
    }

    const pointLabels = Array.isArray(data.pointLabels) ? data.pointLabels : [];
    const pointTexLabels = Array.isArray(data.pointTexLabels) ? data.pointTexLabels : [];
    projected.forEach((point, index) => {
      const pickLabel = pointLabels[index] || `v_${index + 1}`;
      const displayLabel = pointLabels[index] || String(index);
      const displayTex = pointTexLabels[index] || labelToTex(displayLabel);
      drawPoint(ctx, point.x, point.y, pointSize);
      if (registerPick) recordPickCandidate(object, point, pickLabel, `point:${index}`, pointSize, pointMetadata[index]);
      if (shouldDrawObjectLabels(object) && index < 48) {
        addCanvasMathLabel(view, point, displayLabel, displayTex, { offsetX: 5, offsetY: -5, color });
      }
    });

    ctx.restore();
  }

  function toricProjectionEntries(object, analysis) {
    const analyzed = toricGeneratorAnalysisMap(analysis);
    return (object.data?.generators || []).map((generator) => {
      const result = analyzed.get(generator.id) || {};
      let numeric = Array.isArray(result.numeric) ? result.numeric : null;
      let primitive = Array.isArray(result.primitive) ? result.primitive : null;
      if (!numeric) {
        try {
          const normalized = window.ToricConeMath.primitiveVector(generator.coordinates || [], state.ambientDim);
          numeric = normalized.numeric;
          primitive = normalized.exact;
        } catch {
          numeric = null;
        }
      }
      return {
        id: generator.id,
        label: generator.label,
        numeric,
        primitive,
        status: result.status || analysis?.status || "pending",
      };
    });
  }

  function drawToricConeProjection(ctx, view, object, options = {}) {
    const analysis = toricConeAnalysis(object);
    const entries = toricProjectionEntries(object, analysis);
    const selectedFace = selectedToricFace(object, analysis);
    const selectedRayIds = new Set(selectedFace?.rayIds || []);
    const originAmbient = Array(state.ambientDim).fill(0);
    const origin = projectAmbient(originAmbient, view);
    const registerPick = options.registerPick !== false;
    const baseColor = options.color || "#2c6f78";
    const active = state.sourceMode === "modify" && object.id === state.activeObjectId;
    const baseLineWidth = active ? Math.max(options.lineWidth * 1.35, options.lineWidth + 0.7 * view.ratio) : options.lineWidth;
    const rayLength = Math.max(2, state.viewport.boxRadius * 1.35);
    const statusColors = {
      extremal: baseColor,
      redundant: "#8a6242",
      duplicate: "#77736d",
      invalid: "#b05835",
      zero: "#b05835",
      pending: baseColor,
      generator: baseColor,
    };
    ctx.save();
    applyViewportCanvasClip(ctx, view);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    entries.forEach((entry, index) => {
      if (!entry.numeric || entry.numeric.every((value) => Math.abs(value) < 1e-12)) return;
      const direction = normalize(resizeVector(entry.numeric, state.ambientDim));
      const tip = projectAmbient(scale(direction, rayLength), view);
      const selected = selectedRayIds.has(entry.id);
      ctx.save();
      ctx.globalAlpha = options.alpha ?? 0.85;
      ctx.strokeStyle = selected ? "#bd8518" : statusColors[entry.status] || baseColor;
      ctx.fillStyle = selected ? "#bd8518" : statusColors[entry.status] || baseColor;
      ctx.lineWidth = selected ? Math.max(baseLineWidth * 1.8, 3 * view.ratio) : baseLineWidth;
      if (entry.status === "redundant" || entry.status === "duplicate") ctx.setLineDash([5 * view.ratio, 4 * view.ratio]);
      line(ctx, origin.x, origin.y, tip.x, tip.y);
      drawArrowHead(ctx, origin, tip, Math.max(7 * view.ratio, options.lineWidth * 2.6));
      drawPoint(ctx, tip.x, tip.y, Math.max(options.pointSize, selected ? 6 * view.ratio : 4 * view.ratio));
      ctx.restore();
      if (registerPick) {
        recordPickCandidate(object, tip, entry.label || `u_${index + 1}`, `toric-generator:${entry.id}`, Math.max(options.pointSize, 5 * view.ratio), {
          toricGeneratorId: entry.id,
          toricFaceKey: analysis?.faces?.some((face) => face.key === entry.id) ? entry.id : null,
        });
      }
      if (shouldDrawObjectLabels(object)) {
        addCanvasMathLabel(view, tip, entry.label, labelToTex(entry.label), { offsetX: 5, offsetY: -5, color: statusColors[entry.status] || baseColor });
      }
    });
    ctx.globalAlpha = options.alpha ?? 0.85;
    ctx.fillStyle = analysis?.valid ? baseColor : "#b05835";
    drawPoint(ctx, origin.x, origin.y, Math.max(options.pointSize, 4 * view.ratio));
    if (!analysis?.valid && analysis?.status !== "pending") {
      ctx.strokeStyle = "#b05835";
      ctx.lineWidth = 2 * view.ratio;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, Math.max(options.pointSize + 5 * view.ratio, 10 * view.ratio), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (registerPick) {
      recordPickCandidate(object, origin, "0 cone", "toric-origin", Math.max(options.pointSize, 5 * view.ratio), {
        toricFaceKey: "0",
      });
    }
    ctx.restore();
  }

  function drawAnalyticSphereObject(ctx, view, object, options = {}) {
    const data = object.data || {};
    const center = projectAmbient(resizeVector(data.center || [], state.ambientDim), view);
    const radius = positiveNumber(data.radius, 1);
    const pointSize = options.pointSize || 4 * view.ratio;
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 0.85;
    ctx.strokeStyle = options.color || "#8a4f9f";
    ctx.fillStyle = options.color || "#8a4f9f";
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    if (options.preview) ctx.setLineDash([6 * view.ratio, 5 * view.ratio]);
    applyViewportCanvasClip(ctx, view);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * view.scale, 0, Math.PI * 2);
    ctx.stroke();
    drawPoint(ctx, center.x, center.y, Math.max(pointSize, 3 * view.ratio));
    if (options.registerPick !== false) recordPickCandidate(object, center, "center", "sphere-center", Math.max(pointSize, 3 * view.ratio));
    if (shouldDrawObjectLabels(object)) {
      addCanvasMathLabel(view, center, "center", labelToTex("center"), { offsetX: 5, offsetY: -5, color: options.color || "#8a4f9f" });
    }
    ctx.restore();
  }

  function drawExactSliceObject(ctx, view, object, options = {}) {
    const slice = exactSliceData(object, { profile: true });
    if (slice.kind === "empty") return;
    const style = object.style || {};
    const color = style.color || "#2f7d70";
    const alpha = clamp(finiteNumber(style.opacity, 0.85), 0.05, 1);
    const pointSize = Math.max(finiteNumber(style.pointSize, 4) * view.ratio + 1 * view.ratio, 4 * view.ratio);
    const activeToric = objectTypeKey(object) === "toric-cone" && state.sourceMode === "modify" && object.id === state.activeObjectId;
    const lineWidth = Math.max(finiteNumber(style.lineWidth, 2) * view.ratio + (activeToric ? 1.5 : 0.8) * view.ratio, 2 * view.ratio);
    const registerPick = options.registerPick !== false;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    applyViewportCanvasClip(ctx, view);

    if (slice.kind === "polygon") {
      const projected = slice.vertices.map((vertex) => projectFramePoint(vertex.y, view));
      if (projected.length >= 3) {
        ctx.globalAlpha = alpha * 0.22;
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        for (let index = 1; index < projected.length; index += 1) ctx.lineTo(projected[index].x, projected[index].y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.stroke();
        if (registerPick && slice.toricCone) recordToricConeCandidate(object, slice, projected, view);
      }
      projected.forEach((point, index) => {
        drawPoint(ctx, point.x, point.y, pointSize);
        if (registerPick) recordPickCandidate(object, point, `slice v_${index + 1}`, `slice-point:${index}`, pointSize);
        if (shouldDrawObjectLabels(object) && index < 48) {
          addCanvasMathLabel(view, point, `s${index}`, `s_{${index}}`, { offsetX: 5, offsetY: -5, color });
        }
      });
    } else if (slice.kind === "segment") {
      const projected = slice.vertices.map((vertex) => projectFramePoint(vertex.y, view));
      ctx.globalAlpha = alpha;
      line(ctx, projected[0].x, projected[0].y, projected[1].x, projected[1].y);
      if (registerPick && slice.toricCone) recordToricConeCandidate(object, slice, projected, view);
      projected.forEach((point, index) => {
        drawPoint(ctx, point.x, point.y, pointSize);
        if (registerPick) recordPickCandidate(object, point, `slice v_${index + 1}`, `slice-point:${index}`, pointSize);
        if (shouldDrawObjectLabels(object) && index < 48) {
          addCanvasMathLabel(view, point, `s${index}`, `s_{${index}}`, { offsetX: 5, offsetY: -5, color });
        }
      });
    } else if (slice.kind === "point") {
      const point = projectFramePoint(slice.point.y, view);
      ctx.globalAlpha = alpha;
      drawPoint(ctx, point.x, point.y, pointSize + 1 * view.ratio);
      if (registerPick && slice.toricCone) recordToricConeCandidate(object, slice, [point], view);
      if (registerPick) recordPickCandidate(object, point, slice.label || "slice point", "slice-point:0", pointSize + 1 * view.ratio);
      if (shouldDrawObjectLabels(object)) {
        const label = slice.label || "slice point";
        addCanvasMathLabel(view, point, label, labelToTex(label), { offsetX: 5, offsetY: -5, color });
      }
    } else if (slice.kind === "circle") {
      const center = projectFramePoint(slice.center.y, view);
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, slice.radius * view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.stroke();
      drawPoint(ctx, center.x, center.y, pointSize);
      if (registerPick) recordPickCandidate(object, center, "slice center", "slice-center", pointSize);
      if (shouldDrawObjectLabels(object)) {
        addCanvasMathLabel(view, center, "slice center", labelToTex("slice center"), { offsetX: 5, offsetY: -5, color });
      }
    } else if (slice.kind === "conic") {
      drawFormulaConicSlice(ctx, view, slice, { alpha, lineWidth });
    } else if (slice.kind === "implicit-formula") {
      drawNumericFormulaSlice(ctx, view, slice, { alpha, lineWidth });
    } else if (slice.kind === "tropical-curve") {
      drawTropicalCurveSlice(ctx, view, object, slice, { alpha, lineWidth, registerPick });
    } else if (slice.kind === "weyl-chambers") {
      drawWeylChambersSlice(ctx, view, object, slice, { alpha, lineWidth, color, registerPick });
    } else if (slice.kind === "lattice-voronoi") {
      drawLatticeVoronoiSlice(ctx, view, object, slice, { alpha, lineWidth, color });
    }

    ctx.restore();
  }

  function exactSliceData(object, options = {}) {
    if (!canDrawExact2DSlice(object)) return { kind: "empty" };
    const start = options.profile ? nowMs() : 0;
    const type = objectTypeKey(object);
    let result = { kind: "empty" };
    if (type === "regular-polytope") result = exactPolytopeSlice(object, regularPolytopeSliceHalfPlanes(object, options));
    else if (type === "cube") result = exactPolytopeSlice(object, cubeSliceHalfPlanes(object));
    else if (type === "simplex") result = exactPolytopeSlice(object, simplexSliceHalfPlanes(object));
    else if (type === "sphere") result = exactSphereSlice(object);
    else if (type === "formula-set") result = exactFormulaSlice(object);
    else if (type === "tropical-polynomial") result = exactTropicalSlice(object);
    else if (type === "weyl-chambers") result = exactWeylSlice(object);
    else if (type === "voronoi-diagram") result = exactVoronoiSlice(object);
    else if (type === "toric-cone") result = exactToricConeSlice(object);
    if (options.profile) runtimeStats.exactSliceMs += nowMs() - start;
    return result;
  }

  function exactPolytopeSlice(object, halfPlanes) {
    let polygon = initialClipPolygon(sliceClipRadiusForObject(object));
    for (const plane of halfPlanes) {
      polygon = clipPolygonByHalfPlane(polygon, plane.a, plane.b, plane.c);
      if (polygon.length === 0) return { kind: "empty" };
    }
    polygon = cleanPolygon(polygon);
    if (polygon.length === 0) return { kind: "empty" };
    const area = Math.abs(polygonArea(polygon));
    if (polygon.length >= 3 && area > sliceTolerance()) {
      return { kind: "polygon", vertices: polygon.map(sliceVertex) };
    }
    const endpoints = farthestPair(uniquePoints(polygon));
    if (endpoints.length === 2 && distanceSq2(endpoints[0], endpoints[1]) > sliceTolerance() ** 2) {
      return { kind: "segment", vertices: endpoints.map(sliceVertex) };
    }
    return { kind: "point", point: sliceVertex(endpoints[0] || polygon[0]) };
  }

  function toricSlicePointInside(analysis, y, tolerance = sliceTolerance()) {
    if (!viewportPointInside(y, state.viewport.boxRadius)) return false;
    const ambient = ambientFromFrameCoords(y);
    for (const equation of analysis.hRepresentation?.spanEquations || []) {
      if (Math.abs(dot(equation.numeric || [], ambient)) > tolerance * Math.max(1, norm(equation.numeric || []))) return false;
    }
    for (const inequality of analysis.hRepresentation?.inequalities || []) {
      if (dot(inequality.normalNumeric || [], ambient) < -tolerance * Math.max(1, norm(inequality.normalNumeric || []))) return false;
    }
    return true;
  }

  function toricLineSlice(analysis, equationRows) {
    const tolerance = sliceTolerance();
    const row = equationRows.find((entry) => Math.hypot(entry.a, entry.b) > tolerance);
    if (!row) return null;
    const y0 = Math.abs(row.a) >= Math.abs(row.b) ? [-row.c / row.a, 0] : [0, -row.c / row.b];
    const directionLength = Math.hypot(row.a, row.b);
    const direction = [-row.b / directionLength, row.a / directionLength];
    for (const equation of equationRows) {
      const atBase = equation.a * y0[0] + equation.b * y0[1] + equation.c;
      const along = equation.a * direction[0] + equation.b * direction[1];
      if (Math.abs(atBase) > tolerance * 4 || Math.abs(along) > tolerance * 4) return { kind: "empty" };
    }
    let minT = -Infinity;
    let maxT = Infinity;
    const restrictLower = (value) => { minT = Math.max(minT, value); };
    const restrictUpper = (value) => { maxT = Math.min(maxT, value); };
    const radius = state.viewport.boxRadius;
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      const projection = y0[0] * direction[0] + y0[1] * direction[1];
      const constant = y0[0] ** 2 + y0[1] ** 2 - radius ** 2;
      const discriminant = projection ** 2 - constant;
      if (discriminant < -tolerance) return { kind: "empty" };
      const root = Math.sqrt(Math.max(0, discriminant));
      restrictLower(-projection - root);
      restrictUpper(-projection + root);
    } else {
      for (let coordinate = 0; coordinate < 2; coordinate += 1) {
        const slope = direction[coordinate];
        if (Math.abs(slope) <= tolerance) {
          if (Math.abs(y0[coordinate]) > radius + tolerance) return { kind: "empty" };
          continue;
        }
        const left = (-radius - y0[coordinate]) / slope;
        const right = (radius - y0[coordinate]) / slope;
        restrictLower(Math.min(left, right));
        restrictUpper(Math.max(left, right));
      }
    }
    for (const inequality of analysis.hRepresentation?.inequalities || []) {
      const normal = inequality.normalNumeric || [];
      const baseAmbient = ambientFromFrameCoords(y0);
      const directionAmbient = add(scale(state.frame[0], direction[0]), scale(state.frame[1], direction[1]));
      const beta = dot(normal, baseAmbient);
      const alpha = dot(normal, directionAmbient);
      if (Math.abs(alpha) <= tolerance) {
        if (beta < -tolerance) return { kind: "empty" };
      } else {
        const bound = -beta / alpha;
        if (alpha > 0) restrictLower(bound);
        else restrictUpper(bound);
      }
    }
    if (minT > maxT + tolerance || !Number.isFinite(minT) || !Number.isFinite(maxT)) return { kind: "empty" };
    const endpoints = [
      [y0[0] + minT * direction[0], y0[1] + minT * direction[1]],
      [y0[0] + maxT * direction[0], y0[1] + maxT * direction[1]],
    ];
    if (distanceSq2(endpoints[0], endpoints[1]) <= tolerance ** 2) {
      return { kind: "point", point: sliceVertex(endpoints[0]), toricCone: true, analysis };
    }
    return { kind: "segment", vertices: endpoints.map(sliceVertex), toricCone: true, analysis };
  }

  function exactToricConeSlice(object) {
    const analysis = toricConeAnalysis(object);
    if (!analysis?.valid) return { kind: "empty", toricCone: true, analysis };
    if (typeof window.ToricConeMath?.sliceCone === "function") {
      try {
        const exact = window.ToricConeMath.sliceCone(
          analysis,
          state.p.map(String),
          state.frame.slice(0, 2).map((vector) => vector.map(String)),
          { clipRadius: String(state.viewport.boxRadius), limits: TORIC_ANALYSIS_LIMITS }
        );
        const result = { kind: exact.kind, toricCone: true, analysis, exact: true, candidateChecks: exact.candidateChecks };
        if (exact.vertices) {
          result.exactVertices = exact.vertices.map((vertex) => vertex.exact);
          result.vertices = exact.vertices.map((vertex) => sliceVertex(vertex.numeric));
        }
        if (exact.point) {
          result.exactPoint = exact.point.exact;
          result.point = sliceVertex(exact.point.numeric);
        }
        toricSliceIssueByObject.delete(object.id);
        return result;
      } catch (error) {
        const issue = `Exact toric slice is uncomputed: ${error.message}`;
        toricSliceIssueByObject.set(object.id, issue);
        return {
          kind: "empty",
          toricCone: true,
          analysis,
          exact: true,
          uncomputed: true,
          issue,
        };
      }
    }
    const equations = (analysis.hRepresentation?.spanEquations || []).map((equation) => ({
      a: dot(equation.numeric || [], state.frame[0]),
      b: dot(equation.numeric || [], state.frame[1]),
      c: dot(equation.numeric || [], state.p),
    }));
    const tolerance = sliceTolerance();
    const activeEquations = equations.filter((equation) => Math.hypot(equation.a, equation.b) > tolerance);
    for (const equation of equations) {
      if (Math.hypot(equation.a, equation.b) <= tolerance && Math.abs(equation.c) > tolerance) {
        return { kind: "empty", toricCone: true, analysis };
      }
    }
    let independentPair = null;
    for (let left = 0; left < activeEquations.length && !independentPair; left += 1) {
      for (let right = left + 1; right < activeEquations.length; right += 1) {
        const determinant = activeEquations[left].a * activeEquations[right].b - activeEquations[right].a * activeEquations[left].b;
        if (Math.abs(determinant) > tolerance) {
          independentPair = [activeEquations[left], activeEquations[right], determinant];
          break;
        }
      }
    }
    if (independentPair) {
      const [first, second, determinant] = independentPair;
      const y = [
        (-first.c * second.b + first.b * second.c) / determinant,
        (-first.a * second.c + first.c * second.a) / determinant,
      ];
      return toricSlicePointInside(analysis, y, tolerance * 4)
        ? { kind: "point", point: sliceVertex(y), toricCone: true, analysis }
        : { kind: "empty", toricCone: true, analysis };
    }
    if (activeEquations.length) return toricLineSlice(analysis, equations);
    let polygon = initialClipPolygon(state.viewport.boxRadius);
    for (const inequality of analysis.hRepresentation?.inequalities || []) {
      const normal = inequality.normalNumeric || [];
      const a = dot(normal, state.frame[0]);
      const b = dot(normal, state.frame[1]);
      const c = dot(normal, state.p);
      polygon = clipPolygonByHalfPlane(polygon, -a, -b, c);
      if (!polygon.length) return { kind: "empty", toricCone: true, analysis };
    }
    polygon = cleanPolygon(polygon);
    if (!polygon.length) return { kind: "empty", toricCone: true, analysis };
    const area = Math.abs(polygonArea(polygon));
    if (polygon.length >= 3 && area > tolerance) {
      return { kind: "polygon", vertices: polygon.map(sliceVertex), toricCone: true, analysis };
    }
    const endpoints = farthestPair(uniquePoints(polygon));
    if (endpoints.length === 2 && distanceSq2(endpoints[0], endpoints[1]) > tolerance ** 2) {
      return { kind: "segment", vertices: endpoints.map(sliceVertex), toricCone: true, analysis };
    }
    return { kind: "point", point: sliceVertex(endpoints[0] || polygon[0]), toricCone: true, analysis };
  }

  function cubeSliceHalfPlanes(object) {
    const data = object.data || {};
    const size = positiveNumber(data.scale, 1);
    const planes = [];
    for (let coordinate = 0; coordinate < state.ambientDim; coordinate += 1) {
      planes.push({
        a: state.frame[0][coordinate] || 0,
        b: state.frame[1][coordinate] || 0,
        c: size - (state.p[coordinate] || 0),
      });
      planes.push({
        a: -(state.frame[0][coordinate] || 0),
        b: -(state.frame[1][coordinate] || 0),
        c: size + (state.p[coordinate] || 0),
      });
    }
    return planes;
  }

  function regularPolytopeSliceHalfPlanes(object, options = {}) {
    const data = object.data || {};
    const family = normalizeRegularFamily(data.family || "hypercube", state.ambientDim);
    if (family === "hypercube") return cubeSliceHalfPlanes(object);
    if (family === "cross-polytope") return crossPolytopeSliceHalfPlanes(object);
    const size = positiveNumber(data.scale, 1);
    const baseHalfspaces = regularBaseHalfspaces(family, state.ambientDim, options);
    if (options.profile) {
      runtimeStats.halfspaceCount = Math.max(runtimeStats.halfspaceCount, baseHalfspaces.length);
      runtimeStats.heavyFamily = regularFamilyLabel(family, state.ambientDim);
    }
    return baseHalfspaces.map((plane) => {
      const scaledC = size * plane.c;
      return {
        a: dot(plane.normal, state.frame[0]),
        b: dot(plane.normal, state.frame[1]),
        c: scaledC - dot(plane.normal, state.p),
      };
    });
  }

  function crossPolytopeSliceHalfPlanes(object) {
    const data = object.data || {};
    const size = positiveNumber(data.scale, 1);
    const planes = [];
    for (let mask = 0; mask < 2 ** state.ambientDim; mask += 1) {
      const signs = Array.from({ length: state.ambientDim }, (_, index) => ((mask >> index) & 1 ? 1 : -1));
      planes.push({
        a: dot(signs, state.frame[0]),
        b: dot(signs, state.frame[1]),
        c: size - dot(signs, state.p),
      });
    }
    return planes;
  }

  function regularBaseHalfspaces(family, n, options = {}) {
    const normalizedFamily = normalizeRegularFamily(family, n);
    const key = `${normalizedFamily}:${n}`;
    if (regularHalfspaceCache.has(key)) return regularHalfspaceCache.get(key);
    const start = nowMs();
    const halfspaces = normalizedFamily === "600-cell" && n === 4
      ? dualRegularHalfspaces("600-cell", n)
      : normalizedFamily === "120-cell" && n === 4
        ? dualRegularHalfspaces("120-cell", n)
        : convexHalfspacesFromVertices(regularPolytopeVertices(normalizedFamily, n), n);
    regularHalfspaceCache.set(key, halfspaces);
    if (options.profile) runtimeStats.halfspaceMs += nowMs() - start;
    return halfspaces;
  }

  function dualRegularHalfspaces(family, n) {
    const primal = regularPolytopeVertices(family, n);
    const dual = family === "600-cell"
      ? regularPolytopeVertices("120-cell", n)
      : regularPolytopeVertices("600-cell", n);
    return dual.map((normal) => ({
      normal,
      c: Math.max(...primal.map((vertex) => dot(normal, vertex))),
    }));
  }

  function convexHalfspacesFromVertices(vertices, n) {
    const halfspaces = [];
    const seen = new Set();
    const indices = Array.from({ length: n }, (_, index) => index);
    const visit = (start, depth) => {
      if (depth === n) {
        const plane = supportingPlaneFromIndices(vertices, indices, n);
        if (plane) {
          const key = plane.normal.map((value) => fmt(value, 7)).join(",") + `:${fmt(plane.c, 7)}`;
          if (!seen.has(key)) {
            seen.add(key);
            halfspaces.push(plane);
          }
        }
        return;
      }
      for (let index = start; index <= vertices.length - (n - depth); index += 1) {
        indices[depth] = index;
        visit(index + 1, depth + 1);
      }
    };
    visit(0, 0);
    return halfspaces;
  }

  function supportingPlaneFromIndices(vertices, indices, n) {
    const base = vertices[indices[0]];
    const rows = indices.slice(1).map((index) => vertices[index].map((value, coordinate) => value - base[coordinate]));
    const normal = nullVector(rows, n);
    if (!normal) return null;
    let c = dot(normal, base);
    const values = vertices.map((vertex) => dot(normal, vertex) - c);
    const tolerance = 1e-7;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    if (maxValue <= tolerance) {
      return { normal, c };
    }
    if (minValue >= -tolerance) {
      return { normal: normal.map((value) => -value), c: -c };
    }
    return null;
  }

  function nullVector(rows, n) {
    const matrix = rows.map((row) => row.slice());
    const pivots = [];
    let rank = 0;
    const tolerance = 1e-9;
    for (let col = 0; col < n && rank < matrix.length; col += 1) {
      let pivot = rank;
      for (let row = rank + 1; row < matrix.length; row += 1) {
        if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      }
      if (Math.abs(matrix[pivot][col]) <= tolerance) continue;
      [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
      const divisor = matrix[rank][col];
      for (let entry = col; entry < n; entry += 1) matrix[rank][entry] /= divisor;
      for (let row = 0; row < matrix.length; row += 1) {
        if (row === rank) continue;
        const factor = matrix[row][col];
        for (let entry = col; entry < n; entry += 1) matrix[row][entry] -= factor * matrix[rank][entry];
      }
      pivots.push(col);
      rank += 1;
    }
    if (rank < n - 1) return null;
    const pivotSet = new Set(pivots);
    let freeCol = n - 1;
    while (freeCol >= 0 && pivotSet.has(freeCol)) freeCol -= 1;
    if (freeCol < 0) return null;
    const vector = Array(n).fill(0);
    vector[freeCol] = 1;
    for (let row = pivots.length - 1; row >= 0; row -= 1) {
      const pivotCol = pivots[row];
      vector[pivotCol] = -matrix[row][freeCol];
    }
    const length = norm(vector);
    if (length <= tolerance) return null;
    return vector.map((value) => value / length);
  }

  function simplexSliceHalfPlanes(object) {
    const data = object.data || {};
    const size = positiveNumber(data.scale, 1);
    const n = state.ambientDim;
    const sumP = state.p.reduce((total, value) => total + value, 0);
    const sumV1 = state.frame[0].reduce((total, value) => total + value, 0);
    const sumV2 = state.frame[1].reduce((total, value) => total + value, 0);
    const planes = [{ a: sumV1, b: sumV2, c: size - sumP }];
    for (let coordinate = 0; coordinate < n; coordinate += 1) {
      planes.push({
        a: sumV1 - 2 * n * (state.frame[0][coordinate] || 0),
        b: sumV2 - 2 * n * (state.frame[1][coordinate] || 0),
        c: size - (sumP - 2 * n * (state.p[coordinate] || 0)),
      });
    }
    return planes;
  }

  function exactSphereSlice(object) {
    const data = object.data || {};
    const center = resizeVector(data.center || [], state.ambientDim).map((value) => finiteNumber(value, 0));
    const radius = positiveNumber(data.radius, 1);
    const delta = center.map((value, index) => value - (state.p[index] || 0));
    const y = [dot(delta, state.frame[0]), dot(delta, state.frame[1])];
    const activeSq = y[0] ** 2 + y[1] ** 2;
    const perpSq = Math.max(0, dot(delta, delta) - activeSq);
    const radiusSq = radius ** 2 - perpSq;
    const tolerance = sliceTolerance();
    if (radiusSq < -tolerance) return { kind: "empty" };
    if (Math.abs(radiusSq) <= tolerance) {
      return { kind: "point", point: sliceVertex(y), label: "slice tangent" };
    }
    return {
      kind: "circle",
      center: sliceVertex(y),
      radius: Math.sqrt(Math.max(0, radiusSq)),
    };
  }

  function formulaQuadraticForm(matrix, left, right) {
    let total = 0;
    for (let row = 0; row < state.ambientDim; row += 1) {
      for (let col = 0; col < state.ambientDim; col += 1) {
        total += (left[row] || 0) * (matrix[row]?.[col] || 0) * (right[col] || 0);
      }
    }
    return total;
  }

  function restrictFormulaPolynomialToSlice(polynomial) {
    const clean = cleanFormulaPolynomial(polynomial, state.ambientDim);
    const v1 = state.frame[0] || [];
    const v2 = state.frame[1] || [];
    const p = resizeVector(state.p, state.ambientDim);
    const q = clean.quadratic;
    const linear = clean.linear;
    return {
      A: formulaQuadraticForm(q, v1, v1),
      B: 2 * formulaQuadraticForm(q, v1, v2),
      C: formulaQuadraticForm(q, v2, v2),
      D: 2 * formulaQuadraticForm(q, v1, p) + dot(linear, v1),
      E: 2 * formulaQuadraticForm(q, v2, p) + dot(linear, v2),
      F: formulaQuadraticForm(q, p, p) + dot(linear, p) + clean.constant,
    };
  }

  function exactFormulaSlice(object) {
    const data = object.data || {};
    const relation = data.formulaRelation === ">=" || data.formulaRelation === "=" ? data.formulaRelation : "<=";
    if (data.formulaRenderMode === "numeric" || !data.formulaPolynomial) {
      return numericFormulaSlice(object, relation);
    }
    const coeffs = restrictFormulaPolynomialToSlice(data.formulaPolynomial || zeroFormulaPolynomial());
    const tolerance = sliceTolerance();
    const hasQuadratic = Math.abs(coeffs.A) > tolerance || Math.abs(coeffs.B) > tolerance || Math.abs(coeffs.C) > tolerance;
    if (!hasQuadratic) {
      return exactFormulaLinearSlice(coeffs.D, coeffs.E, coeffs.F, relation, object);
    }
    return {
      kind: "conic",
      coeffs,
      relation,
      classification: classifyConic(coeffs),
      clipRadius: formulaClipRadius(object),
    };
  }

  function numericFormulaSlice(object, relation) {
    const data = object.data || {};
    if (!data.formulaAst) return { kind: "empty" };
    return {
      kind: "implicit-formula",
      ast: data.formulaAst,
      relation,
      strict: !!data.formulaStrict,
      clipRadius: formulaClipRadius(object),
    };
  }

  function exactFormulaLinearSlice(a, b, constant, relation, object) {
    const tolerance = sliceTolerance();
    const radius = formulaClipRadius(object);
    if (Math.hypot(a, b) <= tolerance) {
      const satisfied = relation === "="
        ? Math.abs(constant) <= tolerance
        : relation === ">="
          ? constant >= -tolerance
          : constant <= tolerance;
      if (!satisfied) return { kind: "empty" };
      return { kind: "polygon", vertices: initialClipPolygon(radius).map(sliceVertex) };
    }
    if (relation === "=") {
      const endpoints = lineBoxIntersections(a, b, -constant, radius);
      if (endpoints.length >= 2) return { kind: "segment", vertices: endpoints.slice(0, 2).map(sliceVertex) };
      if (endpoints.length === 1) return { kind: "point", point: sliceVertex(endpoints[0]) };
      return { kind: "empty" };
    }
    const plane = relation === ">="
      ? { a: -a, b: -b, c: constant }
      : { a, b, c: -constant };
    let polygon = initialClipPolygon(radius);
    polygon = clipPolygonByHalfPlane(polygon, plane.a, plane.b, plane.c);
    polygon = cleanPolygon(polygon);
    if (!polygon.length) return { kind: "empty" };
    if (polygon.length >= 3 && Math.abs(polygonArea(polygon)) > tolerance) {
      return { kind: "polygon", vertices: polygon.map(sliceVertex) };
    }
    const endpoints = farthestPair(uniquePoints(polygon));
    if (endpoints.length === 2 && distanceSq2(endpoints[0], endpoints[1]) > tolerance ** 2) {
      return { kind: "segment", vertices: endpoints.map(sliceVertex) };
    }
    return endpoints.length ? { kind: "point", point: sliceVertex(endpoints[0]) } : { kind: "empty" };
  }

  function lineBoxIntersections(a, b, c, radius) {
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      return lineDiskIntersections(a, b, c, radius);
    }
    const candidates = [];
    const tolerance = sliceTolerance();
    const push = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x < -radius - tolerance || x > radius + tolerance || y < -radius - tolerance || y > radius + tolerance) return;
      const point = [clamp(x, -radius, radius), clamp(y, -radius, radius)];
      if (!candidates.some((candidate) => distanceSq2(candidate, point) <= tolerance ** 2)) candidates.push(point);
    };
    if (Math.abs(b) > tolerance) {
      push(-radius, (c + a * radius) / b);
      push(radius, (c - a * radius) / b);
    }
    if (Math.abs(a) > tolerance) {
      push((c + b * radius) / a, -radius);
      push((c - b * radius) / a, radius);
    }
    return farthestPair(candidates);
  }

  function lineDiskIntersections(a, b, c, radius) {
    const r = Math.max(1, radius);
    const tolerance = sliceTolerance();
    const lengthSq = a * a + b * b;
    if (lengthSq <= tolerance ** 2) return [];
    const distance = Math.abs(c) / Math.sqrt(lengthSq);
    if (distance > r + tolerance) return [];
    const base = [a * c / lengthSq, b * c / lengthSq];
    const halfLengthSq = Math.max(0, r * r - distance * distance);
    if (halfLengthSq <= tolerance ** 2) return [base];
    const halfLength = Math.sqrt(halfLengthSq);
    const scaleValue = halfLength / Math.sqrt(lengthSq);
    return [
      [base[0] - b * scaleValue, base[1] + a * scaleValue],
      [base[0] + b * scaleValue, base[1] - a * scaleValue],
    ];
  }

  function formulaClipRadius() {
    return Math.max(state.viewport.boxRadius, 1);
  }

  function classifyConic(coeffs) {
    const discriminant = coeffs.B ** 2 - 4 * coeffs.A * coeffs.C;
    const tolerance = Math.max(sliceTolerance(), 1e-9) * Math.max(1, Math.abs(coeffs.A), Math.abs(coeffs.B), Math.abs(coeffs.C));
    if (Math.abs(discriminant) <= tolerance) return "parabola/degenerate";
    return discriminant < 0 ? "ellipse" : "hyperbola";
  }

  function formulaConicValue(coeffs, x, y) {
    return coeffs.A * x * x + coeffs.B * x * y + coeffs.C * y * y + coeffs.D * x + coeffs.E * y + coeffs.F;
  }

  function drawFormulaConicSlice(ctx, view, slice, options = {}) {
    const radius = slice.clipRadius || formulaClipRadius();
    if (slice.relation !== "=") drawConicInequalityFill(ctx, view, slice, radius, options.alpha ?? 0.85);
    const segments = conicBoundarySegments(slice.coeffs, radius);
    ctx.globalAlpha = options.alpha ?? 0.85;
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    for (const segment of segments) {
      const start = projectFramePoint(segment[0], view);
      const end = projectFramePoint(segment[1], view);
      line(ctx, start.x, start.y, end.x, end.y);
    }
  }

  function drawConicInequalityFill(ctx, view, slice, radius, alpha) {
    const steps = 112;
    const cell = (2 * radius) / steps;
    ctx.save();
    ctx.globalAlpha = alpha * 0.13;
    for (let row = 0; row < steps; row += 1) {
      const y = -radius + (row + 0.5) * cell;
      for (let col = 0; col < steps; col += 1) {
        const x = -radius + (col + 0.5) * cell;
        if (!viewportPointInside([x, y], radius)) continue;
        const value = formulaConicValue(slice.coeffs, x, y);
        const inside = slice.relation === ">=" ? value >= -sliceTolerance() : value <= sliceTolerance();
        if (!inside) continue;
        const left = view.centerX + (-radius + col * cell) * view.scale;
        const top = view.centerY - (-radius + (row + 1) * cell) * view.scale;
        ctx.fillRect(left, top, Math.ceil(cell * view.scale) + 0.5, Math.ceil(cell * view.scale) + 0.5);
      }
    }
    ctx.restore();
  }

  function conicBoundarySegments(coeffs, radius) {
    const steps = 150;
    const cell = (2 * radius) / steps;
    const segments = [];
    const interpolate = (pointA, pointB, valueA, valueB) => {
      const denominator = valueA - valueB;
      const t = Math.abs(denominator) <= 1e-14 ? 0.5 : valueA / denominator;
      return [
        pointA[0] + clamp(t, 0, 1) * (pointB[0] - pointA[0]),
        pointA[1] + clamp(t, 0, 1) * (pointB[1] - pointA[1]),
      ];
    };
    for (let row = 0; row < steps; row += 1) {
      const y0 = -radius + row * cell;
      const y1 = y0 + cell;
      for (let col = 0; col < steps; col += 1) {
        const x0 = -radius + col * cell;
        const x1 = x0 + cell;
        const corners = [
          { p: [x0, y0], v: formulaConicValue(coeffs, x0, y0) },
          { p: [x1, y0], v: formulaConicValue(coeffs, x1, y0) },
          { p: [x1, y1], v: formulaConicValue(coeffs, x1, y1) },
          { p: [x0, y1], v: formulaConicValue(coeffs, x0, y1) },
        ];
        const intersections = [];
        for (let edge = 0; edge < 4; edge += 1) {
          const current = corners[edge];
          const next = corners[(edge + 1) % 4];
          if (Math.abs(current.v) <= 1e-12) intersections.push(current.p);
          if ((current.v < 0 && next.v > 0) || (current.v > 0 && next.v < 0)) {
            intersections.push(interpolate(current.p, next.p, current.v, next.v));
          }
        }
        const unique = uniquePoints(intersections);
        if (unique.length === 2) segments.push(unique);
        else if (unique.length > 2) {
          for (let index = 0; index + 1 < unique.length; index += 2) segments.push([unique[index], unique[index + 1]]);
        }
      }
    }
    return segments;
  }

  function numericFormulaSteps(view, radius) {
    const pixelWidth = 2 * radius * view.scale;
    return clamp(Math.round(pixelWidth / Math.max(5 * view.ratio, 3)), 72, 180);
  }

  function sliceAmbientPoint(x, y) {
    const point = resizeVector(state.p, state.ambientDim);
    const v1 = state.frame[0] || [];
    const v2 = state.frame[1] || [];
    for (let index = 0; index < state.ambientDim; index += 1) {
      point[index] += x * (v1[index] || 0) + y * (v2[index] || 0);
    }
    return point;
  }

  function numericFormulaValue(ast, x, y) {
    return evaluateFormulaAst(ast, sliceAmbientPoint(x, y));
  }

  function numericFormulaInside(value, relation) {
    if (!Number.isFinite(value)) return false;
    const tolerance = sliceTolerance();
    if (relation === "=") return Math.abs(value) <= tolerance;
    return relation === ">=" ? value >= -tolerance : value <= tolerance;
  }

  function sampleNumericFormulaGrid(ast, radius, steps) {
    const cell = (2 * radius) / steps;
    const values = Array.from({ length: steps + 1 }, () => Array(steps + 1).fill(NaN));
    for (let row = 0; row <= steps; row += 1) {
      const y = -radius + row * cell;
      for (let col = 0; col <= steps; col += 1) {
        values[row][col] = numericFormulaValue(ast, -radius + col * cell, y);
      }
    }
    return { values, cell };
  }

  function drawNumericFormulaSlice(ctx, view, slice, options = {}) {
    const radius = slice.clipRadius || formulaClipRadius();
    const steps = numericFormulaSteps(view, radius);
    const grid = sampleNumericFormulaGrid(slice.ast, radius, steps);
    const alpha = options.alpha ?? 0.85;
    if (slice.relation !== "=") drawNumericFormulaInequalityFill(ctx, view, slice, radius, steps, grid.cell, alpha);
    const segments = numericFormulaBoundarySegments(grid.values, radius, steps, grid.cell);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    for (const segment of segments) {
      const start = projectFramePoint(segment[0], view);
      const end = projectFramePoint(segment[1], view);
      line(ctx, start.x, start.y, end.x, end.y);
    }
    ctx.restore();
  }

  function drawNumericFormulaInequalityFill(ctx, view, slice, radius, steps, cell, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.12;
    for (let row = 0; row < steps; row += 1) {
      const y = -radius + (row + 0.5) * cell;
      for (let col = 0; col < steps; col += 1) {
        const x = -radius + (col + 0.5) * cell;
        if (!viewportPointInside([x, y], radius)) continue;
        if (!numericFormulaInside(numericFormulaValue(slice.ast, x, y), slice.relation)) continue;
        const left = view.centerX + (-radius + col * cell) * view.scale;
        const top = view.centerY - (-radius + (row + 1) * cell) * view.scale;
        ctx.fillRect(left, top, Math.ceil(cell * view.scale) + 0.5, Math.ceil(cell * view.scale) + 0.5);
      }
    }
    ctx.restore();
  }

  function numericFormulaBoundarySegments(values, radius, steps, cell) {
    const segments = [];
    const zeroTolerance = Math.max(sliceTolerance(), 1e-9);
    const interpolate = (pointA, pointB, valueA, valueB) => {
      const denominator = valueA - valueB;
      const t = Math.abs(denominator) <= 1e-14 ? 0.5 : valueA / denominator;
      return [
        pointA[0] + clamp(t, 0, 1) * (pointB[0] - pointA[0]),
        pointA[1] + clamp(t, 0, 1) * (pointB[1] - pointA[1]),
      ];
    };
    const signedValue = (value) => {
      if (!Number.isFinite(value)) return null;
      if (Math.abs(value) <= zeroTolerance) return 0;
      return value < 0 ? -1 : 1;
    };
    for (let row = 0; row < steps; row += 1) {
      const y0 = -radius + row * cell;
      const y1 = y0 + cell;
      for (let col = 0; col < steps; col += 1) {
        const x0 = -radius + col * cell;
        const x1 = x0 + cell;
        const corners = [
          { p: [x0, y0], v: values[row][col] },
          { p: [x1, y0], v: values[row][col + 1] },
          { p: [x1, y1], v: values[row + 1][col + 1] },
          { p: [x0, y1], v: values[row + 1][col] },
        ];
        const intersections = [];
        for (let edge = 0; edge < 4; edge += 1) {
          const current = corners[edge];
          const next = corners[(edge + 1) % 4];
          const currentSign = signedValue(current.v);
          const nextSign = signedValue(next.v);
          if (currentSign == null || nextSign == null) continue;
          if (currentSign === 0) intersections.push(current.p);
          if (currentSign * nextSign < 0) intersections.push(interpolate(current.p, next.p, current.v, next.v));
        }
        const unique = uniquePoints(intersections);
        if (unique.length === 2) segments.push(unique);
        else if (unique.length > 2) {
          for (let index = 0; index + 1 < unique.length; index += 2) segments.push([unique[index], unique[index + 1]]);
        }
      }
    }
    return segments;
  }

  function exactTropicalSlice(object) {
    const data = object.data || {};
    const terms = normalizeTropicalTerms(resizeTropicalTerms(data.terms || [], state.ambientDim), data.tropicalConvention, state.ambientDim);
    const radius = formulaClipRadius(object);
    const convention = normalizeTropicalConvention(data.tropicalConvention);
    const functions = restrictTropicalTermsToSlice(terms, convention);
    const tolerance = sliceTolerance();
    const districtResult = computeTropicalDistricts(functions, radius, tolerance);
    const districtLabelDensity = normalizeTropicalDistrictLabelDensity(data.tropicalDistrictLabelDensity);
    const labelKeys = selectTropicalDistrictLabelKeys(districtResult.districts, districtLabelDensity, object.id);
    const labelKeySet = new Set(labelKeys);
    if (terms.length < 2) {
      return {
        kind: "tropical-curve",
        segments: [],
        districts: districtResult.districts,
        clipRadius: radius,
        convention,
        notationMode: normalizeTropicalNotationMode(data.tropicalNotationMode),
        showDistricts: data.showDistricts !== false,
        districtLabelDensity,
        labelKeySet,
        skippedPairs: 0,
        skippedDistricts: districtResult.skippedDistricts,
      };
    }
    const segments = [];
    let skippedPairs = 0;
    for (let left = 0; left < functions.length; left += 1) {
      for (let right = left + 1; right < functions.length; right += 1) {
        const diffA = functions[left].a - functions[right].a;
        const diffB = functions[left].b - functions[right].b;
        const diffC = functions[left].c - functions[right].c;
        const scaleValue = Math.max(1, Math.abs(diffA), Math.abs(diffB), Math.abs(diffC));
        if (Math.hypot(diffA, diffB) <= tolerance * scaleValue) {
          skippedPairs += Math.abs(diffC) <= tolerance * scaleValue ? 1 : 0;
          continue;
        }
        const endpoints = lineBoxIntersections(diffA, diffB, -diffC, radius);
        if (endpoints.length < 2) continue;
        const clipped = clipTropicalSegmentByDominance(endpoints, functions[left], functions, tolerance);
        if (!clipped) continue;
        if (distanceSq2(clipped[0], clipped[1]) <= tolerance ** 2) continue;
        segments.push({
          y0: clipped[0],
          y1: clipped[1],
          pair: [functions[left].term.label, functions[right].term.label],
        });
      }
    }
    return {
      kind: "tropical-curve",
      segments: uniqueTropicalSegments(segments),
      districts: districtResult.districts,
      clipRadius: radius,
      convention,
      notationMode: normalizeTropicalNotationMode(data.tropicalNotationMode),
      showDistricts: data.showDistricts !== false,
      districtLabelDensity,
      labelKeySet,
      skippedPairs,
      skippedDistricts: districtResult.skippedDistricts,
    };
  }

  function restrictTropicalTermsToSlice(terms, convention) {
    const sign = normalizeTropicalConvention(convention) === "min" ? -1 : 1;
    return terms.map((term) => {
      const exponent = resizeVector(term.exponent || [], state.ambientDim);
      const restricted = {
        a: dot(exponent, state.frame[0]),
        b: dot(exponent, state.frame[1]),
        c: finiteNumber(term.coefficient, 0) + dot(exponent, state.p),
        term,
      };
      return {
        a: sign * restricted.a,
        b: sign * restricted.b,
        c: sign * restricted.c,
        term,
      };
    });
  }

  function clipTropicalSegmentByDominance(segment, activeFunction, functions, tolerance) {
    const start = segment[0];
    const end = segment[1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    let lo = 0;
    let hi = 1;
    for (const candidate of functions) {
      const diffA = activeFunction.a - candidate.a;
      const diffB = activeFunction.b - candidate.b;
      const diffC = activeFunction.c - candidate.c;
      const base = diffA * start[0] + diffB * start[1] + diffC;
      const slope = diffA * dx + diffB * dy;
      if (Math.abs(slope) <= tolerance) {
        if (base < -tolerance) return null;
        continue;
      }
      const threshold = (-tolerance - base) / slope;
      if (slope > 0) lo = Math.max(lo, threshold);
      else hi = Math.min(hi, threshold);
      if (lo - hi > tolerance) return null;
    }
    lo = clamp(lo, 0, 1);
    hi = clamp(hi, 0, 1);
    if (lo > hi) return null;
    return [
      [start[0] + lo * dx, start[1] + lo * dy],
      [start[0] + hi * dx, start[1] + hi * dy],
    ];
  }

  function computeTropicalDistricts(functions, radius, tolerance) {
    const districts = [];
    let skippedDistricts = 0;
    for (let activeIndex = 0; activeIndex < functions.length; activeIndex += 1) {
      const activeFunction = functions[activeIndex];
      let polygon = initialClipPolygon(radius);
      let duplicateRestrictedTerm = false;
      for (let candidateIndex = 0; candidateIndex < functions.length; candidateIndex += 1) {
        if (candidateIndex === activeIndex) continue;
        const candidate = functions[candidateIndex];
        const diffA = activeFunction.a - candidate.a;
        const diffB = activeFunction.b - candidate.b;
        const diffC = activeFunction.c - candidate.c;
        const scaleValue = Math.max(1, Math.abs(diffA), Math.abs(diffB), Math.abs(diffC));
        if (Math.hypot(diffA, diffB) <= tolerance * scaleValue) {
          if (Math.abs(diffC) <= tolerance * scaleValue) {
            if (candidateIndex < activeIndex) duplicateRestrictedTerm = true;
            continue;
          }
          if (diffC < -tolerance * scaleValue) polygon = [];
          if (!polygon.length) break;
          continue;
        }
        polygon = clipPolygonByHalfPlane(polygon, -diffA, -diffB, diffC);
        if (!polygon.length) break;
      }
      if (duplicateRestrictedTerm) {
        skippedDistricts += 1;
        continue;
      }
      polygon = cleanPolygon(polygon);
      const area = Math.abs(polygonArea(polygon));
      if (polygon.length < 3 || area <= tolerance ** 2) continue;
      const anchor = polygonCentroid(polygon);
      districts.push({
        key: tropicalDistrictKey(activeFunction.term, activeIndex),
        termIndex: activeIndex,
        label: activeFunction.term.label,
        term: activeFunction.term,
        vertices: polygon,
        area,
        color: TROPICAL_DISTRICT_COLORS[activeIndex % TROPICAL_DISTRICT_COLORS.length],
        anchor,
        ambient: ambientFromFrameCoords(anchor),
        labelEligible: area > Math.max(0.02, tolerance * 10),
      });
    }
    return { districts, skippedDistricts };
  }

  function tropicalDistrictKey(term, index = 0) {
    const exponent = resizeVector(term?.exponent || [], state.ambientDim).join(",");
    return `${index}:${fmt(finiteNumber(term?.coefficient, 0), 8)}:${exponent}`;
  }

  function selectTropicalDistrictLabelKeys(districts, density, objectId) {
    const eligible = districts.filter((district) => district.labelEligible);
    if (density === "all") return eligible.map((district) => district.key);
    const active = state.activeTropicalDistrict;
    return active && active.objectId === objectId && eligible.some((district) => district.key === active.districtKey)
      ? [active.districtKey]
      : [];
  }

  function uniqueTropicalSegments(segments) {
    const seen = new Set();
    const unique = [];
    const keyPoint = (point) => point.map((value) => fmt(value, 7)).join(",");
    for (const segment of segments) {
      const a = keyPoint(segment.y0);
      const b = keyPoint(segment.y1);
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(segment);
    }
    return unique;
  }

  function drawTropicalCurveSlice(ctx, view, object, slice, options = {}) {
    ctx.save();
    const alpha = options.alpha ?? 0.85;
    const curveColor = ctx.strokeStyle;
    if (slice.showDistricts !== false) {
      for (const district of slice.districts || []) {
        const projected = (district.vertices || []).map((vertex) => projectFramePoint(vertex, view));
        if (projected.length < 3) continue;
        ctx.globalAlpha = alpha * 0.22;
        ctx.fillStyle = district.color || "#d95f5f";
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        for (let index = 1; index < projected.length; index += 1) ctx.lineTo(projected[index].x, projected[index].y);
        ctx.closePath();
        ctx.fill();
        if (options.registerPick !== false) {
          const display = tropicalTermDisplay(district.term || { coefficient: 0, exponent: [] }, slice.notationMode, slice.convention);
          recordTropicalDistrictCandidate(object, district, projected, display);
        }
      }
      for (const district of slice.districts || []) {
        if (!district.anchor) continue;
        if (slice.labelKeySet && !slice.labelKeySet.has(district.key)) continue;
        if (!slice.labelKeySet && !district.labelEligible) continue;
        const point = projectFramePoint(district.anchor, view);
        const display = tropicalTermDisplay(district.term || { coefficient: 0, exponent: [] }, slice.notationMode, slice.convention);
        addCanvasMathLabel(view, point, display.plain, display.tex, {
          centered: true,
          color: "rgba(34, 46, 62, 0.88)",
        });
      }
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const segment of slice.segments || []) {
      const start = projectFramePoint(segment.y0, view);
      const end = projectFramePoint(segment.y1, view);
      line(ctx, start.x, start.y, end.x, end.y);
    }
    ctx.restore();
  }

  function exactWeylSlice(object) {
    object.data = normalizeWeylChambersData(object.data || {}, state.ambientDim);
    refreshWeylFromDynkin(object);
    const data = object.data;
    const system = weylRootSystem(data.dynkinType, state.ambientDim);
    const radius = formulaClipRadius(object);
    const tolerance = sliceTolerance();
    const restricted = restrictWeylRootsToSlice(system.hyperplaneRoots, radius, tolerance);
    const chambers = computeWeylChambers(system, restricted.walls, radius, data, tolerance);
    const klStatus = applyWeylKlDisplays(system, object, chambers, data);
    const labelDensity = normalizeWeylLabelDensity(data.weylLabelDensity);
    const labelKeys = selectWeylLabelKeys(chambers, labelDensity, object.id);
    const labelKeySet = new Set(labelKeys);
    return {
      kind: "weyl-chambers",
      dynkinType: data.dynkinType,
      dynkinRank: state.ambientDim,
      system,
      walls: restricted.walls,
      chambers,
      showChambers: data.showChambers !== false,
      labelMode: data.weylLabelMode,
      labelDensity,
      labelKeySet,
      klStatus,
      skippedWalls: restricted.skippedWalls,
      duplicateWalls: restricted.duplicateWalls,
      clipRadius: radius,
    };
  }

  function clearWeylKlChamberDisplays(chambers) {
    chambers.forEach((chamber) => {
      chamber.display = { plain: "", tex: "" };
      chamber.labelEligible = false;
    });
  }

  function finiteWeylKlCalculatorCacheKey(system, selectedElement) {
    const type = system?.type || "";
    const rank = Math.round(finiteNumber(system?.rank, state.ambientDim));
    const elementKey = selectedElement?.key || "";
    const wordKey = Array.isArray(selectedElement?.word) ? selectedElement.word.join(",") : "";
    return `${type}:${rank}:${elementKey}:${wordKey}`;
  }

  function rememberFiniteWeylKlCalculatorCacheEntry(cacheKey, entry) {
    if (!cacheKey) return;
    if (finiteWeylKlCalculatorCache.has(cacheKey)) finiteWeylKlCalculatorCache.delete(cacheKey);
    finiteWeylKlCalculatorCache.set(cacheKey, entry);
    while (finiteWeylKlCalculatorCache.size > WEYL_KL_CACHE_LIMIT) {
      const oldestKey = finiteWeylKlCalculatorCache.keys().next().value;
      if (oldestKey == null) break;
      finiteWeylKlCalculatorCache.delete(oldestKey);
    }
  }

  function scheduleFiniteWeylKlCalculation(cacheKey) {
    if (!cacheKey || finiteWeylKlCalculatorCache.has(cacheKey)) return;
    if (finiteWeylKlScheduledFrame && finiteWeylKlScheduledKey === cacheKey) return;
    if (finiteWeylKlScheduledFrame && typeof window !== "undefined" && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(finiteWeylKlScheduledFrame);
    }
    finiteWeylKlScheduledKey = cacheKey;
    const run = () => {
      finiteWeylKlScheduledFrame = 0;
      const immediateKey = finiteWeylKlScheduledKey;
      finiteWeylKlScheduledKey = "";
      finiteWeylKlImmediateKey = immediateKey;
      try {
        renderAll();
      } finally {
        if (finiteWeylKlImmediateKey === immediateKey) finiteWeylKlImmediateKey = "";
      }
    };
    finiteWeylKlScheduledFrame = typeof window !== "undefined" && window.requestAnimationFrame
      ? window.requestAnimationFrame(run)
      : setTimeout(run, 0);
  }

  function finiteWeylKlCalculatorResult(system, selectedElement) {
    const cacheKey = finiteWeylKlCalculatorCacheKey(system, selectedElement);
    const cached = finiteWeylKlCalculatorCache.get(cacheKey);
    if (cached?.errorMessage) throw new Error(cached.errorMessage);
    if (cached?.calculator) return { calculator: cached.calculator, pending: false };
    if (finiteWeylKlImmediateKey !== cacheKey) {
      scheduleFiniteWeylKlCalculation(cacheKey);
      return { calculator: null, pending: true };
    }
    try {
      const calculator = makeFiniteWeylKlCalculator(system, selectedElement);
      rememberFiniteWeylKlCalculatorCacheEntry(cacheKey, { calculator });
      return { calculator, pending: false };
    } catch (error) {
      const errorMessage = error?.message || String(error);
      rememberFiniteWeylKlCalculatorCacheEntry(cacheKey, { errorMessage });
      throw new Error(errorMessage);
    }
  }

  function applyWeylKlDisplays(system, object, chambers, data) {
    if (!isWeylKlLabelMode(data.weylLabelMode)) return "";
    const target = state.weylKlTargetChamber;
    if (!target || target.objectId !== object.id) {
      clearWeylKlChamberDisplays(chambers);
      return "Click a Weyl chamber x to show KL polynomial labels h_{w,x}.";
    }
    const selectedElement = weylKlTargetElement(system, target, chambers);
    if (!selectedElement) {
      clearWeylKlChamberDisplays(chambers);
      return "Click a Weyl chamber x again to save its Weyl group element for KL labels.";
    }
    try {
      const klResult = finiteWeylKlCalculatorResult(system, selectedElement);
      if (klResult.pending) {
        clearWeylKlChamberDisplays(chambers);
        return WEYL_KL_PENDING_STATUS;
      }
      const calculator = klResult.calculator;
      const displayMode = normalizeWeylElementDisplayMode(data.weylElementDisplayMode, "word");
      const currentRef = state.activeWeylChamber?.objectId === object.id ? state.activeWeylChamber : null;
      const currentChamber = currentRef ? chambers.find((chamber) => chamber.key === currentRef.chamberKey) || null : null;
      let currentElement = null;
      chambers.forEach((chamber) => {
        const element = calculator.elementFromAmbient(chamber.ambient);
        if (!calculator.contains(element)) {
          chamber.display = { plain: "0", tex: "0" };
        } else {
          const polynomial = calculator.polynomialFor(element);
          if (data.weylLabelMode === "kl-v1") {
            const value = polynomialValueAtOne(polynomial);
            chamber.display = { plain: String(value), tex: String(value) };
          } else {
            chamber.display = formatSoergelKlPolynomial(polynomial, element.length, selectedElement.length);
          }
        }
        chamber.word = element.word;
        chamber.length = element.length;
        chamber.labelEligible = chamber.display.plain !== "" && chamber.area > Math.max(0.018, sliceTolerance() * 10);
        if (currentChamber && chamber.key === currentChamber.key) {
          currentElement = element;
        }
      });
      if (!currentElement && currentChamber) {
        currentElement = calculator.elementFromAmbient(currentChamber.ambient);
      }
      return formatWeylKlExpansionStatus(system, data, calculator, selectedElement, currentElement, displayMode);
    } catch (error) {
      clearWeylKlChamberDisplays(chambers);
      return `KL polynomial labels skipped: ${error.message}`;
    }
  }

  function formatWeylKlExpansionStatus(system, data, calculator, selectedElement, currentElement, displayMode) {
    const modeLabel = data.weylLabelMode === "kl-v1" ? "KL(v=1)" : "KL polynomial";
    const terms = (calculator.intervalElements || [])
      .map((element) => {
        const polynomial = calculator.polynomialFor(element);
        const coefficient = data.weylLabelMode === "kl-v1"
          ? { plain: String(polynomialValueAtOne(polynomial)), tex: String(polynomialValueAtOne(polynomial)) }
          : formatSoergelKlPolynomial(polynomial, element.length, selectedElement.length);
        const term = heckeStatusTermDisplay(system, element, coefficient, displayMode);
        return term
          ? {
              text: term.plain,
              tex: term.tex,
              key: element.key,
              length: element.length,
              sortText: heckeBasisSubscript(system, element, displayMode),
              active: !!currentElement && currentElement.key === element.key,
            }
          : null;
      })
      .filter(Boolean)
      .sort((left, right) => (right.length - left.length) || left.sortText.localeCompare(right.sortText));
    const parts = [`${modeLabel}: `];
    if (!terms.length) {
      parts.push("0");
    } else {
      terms.forEach((term, index) => {
        if (index) parts.push(" + ");
        parts.push({ text: term.text, active: term.active });
      });
    }
    const plain = parts.map((part) => typeof part === "string" ? part : part.text).join("");
    return {
      plain,
      parts,
      formula: formatWeylKlStatusFormula(modeLabel, terms),
    };
  }

  function heckeStatusTermText(system, element, coefficient, displayMode) {
    const display = heckeStatusTermDisplay(system, element, coefficient, displayMode);
    return display ? display.plain : "";
  }

  function heckeStatusTermDisplay(system, element, coefficient, displayMode) {
    const coefficientDisplay = formatHeckeStatusCoefficientDisplay(coefficient);
    if (!coefficientDisplay) return null;
    const basisPlain = `T_${heckeBasisSubscript(system, element, displayMode)}`;
    const basisTex = `T_{${heckeBasisSubscriptTex(system, element, displayMode)}}`;
    if (!coefficientDisplay.plain) {
      return { plain: basisPlain, tex: basisTex };
    }
    return {
      plain: `${coefficientDisplay.plain} ${basisPlain}`,
      tex: `${coefficientDisplay.tex}${basisTex}`,
    };
  }

  function formatHeckeStatusCoefficient(coefficient) {
    const display = formatHeckeStatusCoefficientDisplay(coefficient);
    return display ? display.plain : null;
  }

  function formatHeckeStatusCoefficientDisplay(coefficient) {
    const rawPlain = typeof coefficient === "object" && coefficient
      ? coefficient.plain
      : coefficient;
    const rawTex = typeof coefficient === "object" && coefficient
      ? coefficient.tex
      : coefficient;
    const text = String(rawPlain == null ? "" : rawPlain).trim();
    if (!text || text === "0") return null;
    const tex = String(rawTex == null ? rawPlain : rawTex).trim();
    if (text === "1" && tex === "1") return { plain: "", tex: "" };
    if (/\s/.test(text)) {
      return {
        plain: `(${text})`,
        tex: `\\left(${tex}\\right)`,
      };
    }
    return { plain: text, tex };
  }

  function heckeBasisSubscript(system, element, displayMode) {
    if (!element?.length) return "e";
    return weylElementDisplay(system, element, displayMode).plain;
  }

  function heckeBasisSubscriptTex(system, element, displayMode) {
    if (!element?.length) return "e";
    return weylElementDisplay(system, element, displayMode).tex;
  }

  function formatWeylKlStatusFormula(label, terms) {
    if (!terms.length) {
      return {
        label,
        plain: "0",
        rows: [{ plain: "0", parts: [{ text: "0", tex: "0", active: false }] }],
      };
    }
    const rows = [];
    let current = { plain: "", parts: [] };
    const appendTerm = (term, leadingPlus) => {
      if (leadingPlus) current.parts.push({ text: "+", tex: "+", separator: true });
      current.parts.push({ text: term.text, tex: term.tex, active: term.active });
      current.plain = current.plain
        ? `${current.plain} + ${term.text}`
        : leadingPlus
          ? `+ ${term.text}`
          : term.text;
    };
    terms.forEach((term, index) => {
      const nextPlain = current.plain ? `${current.plain} + ${term.text}` : term.text;
      if (current.parts.length && nextPlain.length > WEYL_KL_STATUS_ROW_CHAR_LIMIT) {
        rows.push(current);
        current = { plain: "", parts: [] };
        appendTerm(term, true);
      } else {
        appendTerm(term, index > 0);
      }
    });
    if (current.parts.length || !rows.length) rows.push(current.parts.length ? current : { plain: "0", parts: [{ text: "0", tex: "0", active: false }] });
    return {
      label,
      plain: rows.map((row) => row.plain).join("\n"),
      rows,
    };
  }

  function restrictWeylRootsToSlice(roots, radius, tolerance) {
    const walls = [];
    const seen = new Set();
    let skippedWalls = 0;
    let duplicateWalls = 0;
    for (const root of roots) {
      const a = dot(root, state.frame[0]);
      const b = dot(root, state.frame[1]);
      const c = dot(root, state.p);
      const scaleValue = Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c));
      if (Math.hypot(a, b) <= tolerance * scaleValue) {
        skippedWalls += 1;
        continue;
      }
      const key = canonicalRestrictedLineKey(a, b, c);
      if (seen.has(key)) {
        duplicateWalls += 1;
        continue;
      }
      seen.add(key);
      const endpoints = lineBoxIntersections(a, b, -c, radius);
      if (endpoints.length < 2) {
        skippedWalls += 1;
        continue;
      }
      walls.push({ a, b, c, root, endpoints });
    }
    return { walls, skippedWalls, duplicateWalls };
  }

  function canonicalRestrictedLineKey(a, b, c) {
    const length = Math.max(Math.hypot(a, b), 1e-12);
    let values = [a / length, b / length, c / length];
    const first = values.find((value) => Math.abs(value) > 1e-10) || 1;
    if (first < 0) values = values.map((value) => -value);
    return values.map((value) => fmt(value, 7)).join(",");
  }

  function computeWeylChambers(system, walls, radius, data, tolerance) {
    let cells = [{ vertices: initialClipPolygon(radius) }];
    for (const wall of walls) {
      const nextCells = [];
      for (const cell of cells) {
        const split = splitPolygonByLine(cell.vertices, wall.a, wall.b, wall.c, tolerance);
        if (split.positive.length >= 3 && Math.abs(polygonArea(split.positive)) > tolerance ** 2) {
          nextCells.push({ vertices: split.positive });
        }
        if (split.negative.length >= 3 && Math.abs(polygonArea(split.negative)) > tolerance ** 2) {
          nextCells.push({ vertices: split.negative });
        }
      }
      cells = nextCells;
      if (!cells.length) break;
    }
    return cells.map((cell, index) => {
      const vertices = cleanPolygon(cell.vertices);
      const area = Math.abs(polygonArea(vertices));
      const anchor = polygonCentroid(vertices);
      const ambient = ambientFromFrameCoords(anchor);
      const signPattern = weylSignPattern(system.hyperplaneRoots, ambient);
      const word = weylReducedWord(system, ambient);
      const display = weylChamberDisplay(system, ambient, data.weylLabelMode);
      const key = signPattern.join("");
      return {
        key,
        index,
        vertices,
        area,
        anchor,
        ambient,
        signPattern,
        word,
        length: word.length,
        color: WEYL_CHAMBER_COLORS[Math.abs(hashString(key || String(index))) % WEYL_CHAMBER_COLORS.length],
        labelEligible: display.plain !== "" && area > Math.max(0.018, tolerance * 10),
        display,
      };
    });
  }

  function splitPolygonByLine(polygon, a, b, c, tolerance) {
    const values = polygon.map((point) => a * point[0] + b * point[1] + c);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    if (minValue >= -tolerance) return { positive: polygon.slice(), negative: [] };
    if (maxValue <= tolerance) return { positive: [], negative: polygon.slice() };
    const positive = [];
    const negative = [];
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const currentValue = values[index];
      const nextValue = values[(index + 1) % polygon.length];
      const currentPositive = currentValue >= -tolerance;
      const currentNegative = currentValue <= tolerance;
      if (currentPositive) positive.push(current);
      if (currentNegative) negative.push(current);
      if ((currentValue < -tolerance && nextValue > tolerance) || (currentValue > tolerance && nextValue < -tolerance)) {
        const point = intersectionPoint(current, next, currentValue, nextValue);
        positive.push(point);
        negative.push(point);
      }
    }
    return {
      positive: cleanPolygon(positive),
      negative: cleanPolygon(negative),
    };
  }

  function selectWeylLabelKeys(chambers, density, objectId) {
    const normalizedDensity = normalizeWeylLabelDensity(density);
    const eligible = chambers.filter((chamber) => chamber.labelEligible);
    if (normalizedDensity === "all") return eligible.map((chamber) => chamber.key);
    const active = state.activeWeylChamber;
    return active && active.objectId === objectId && eligible.some((chamber) => chamber.key === active.chamberKey)
      ? [active.chamberKey]
      : [];
  }

  function drawWeylChambersSlice(ctx, view, object, slice, options = {}) {
    const alpha = options.alpha ?? 0.85;
    if (slice.showChambers !== false) {
      for (const chamber of slice.chambers || []) {
        const projected = chamber.vertices.map((vertex) => projectFramePoint(vertex, view));
        if (projected.length < 3) continue;
        ctx.globalAlpha = alpha * 0.19;
        ctx.fillStyle = chamber.color || "#7b5cb8";
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        for (let index = 1; index < projected.length; index += 1) ctx.lineTo(projected[index].x, projected[index].y);
        ctx.closePath();
        ctx.fill();
        if (options.registerPick !== false) recordWeylChamberCandidate(object, chamber, projected);
      }
      for (const chamber of slice.chambers || []) {
        if (!slice.labelKeySet?.has(chamber.key)) continue;
        const point = projectFramePoint(chamber.anchor, view);
        addCanvasMathLabel(view, point, chamber.display.plain, chamber.display.tex, {
          centered: true,
          color: "rgba(44, 35, 62, 0.9)",
        });
      }
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = options.color || ctx.strokeStyle;
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const wall of slice.walls || []) {
      const start = projectFramePoint(wall.endpoints[0], view);
      const end = projectFramePoint(wall.endpoints[1], view);
      line(ctx, start.x, start.y, end.x, end.y);
    }
  }

  function resolveLatticeBasis(object, options = {}) {
    normalizeLatticeDataInPlace(object, state.ambientDim);
    const warning = refreshLatticeBasis(object, options);
    const rows = cloneMatrixRows(object.data.basisRows, state.ambientDim);
    try {
      validateFullRankMatrixRows(rows, state.ambientDim, `${object.name} basis`);
      return { ok: true, basisRows: rows, warning };
    } catch (error) {
      object.data.latticeStatus = `lattice basis warning: ${error.message}`;
      return { ok: false, basisRows: rows, warning: warning || error.message };
    }
  }

  function latticeCoefficientBounds(basisRows, ambientRadius, boundShape = "ball") {
    try {
      const inverse = inverseMatrix(basisRows, "Lattice basis");
      const shape = normalizeLatticeBoundShape(boundShape);
      return inverse.map((row) => {
        const stretch = shape === "box"
          ? row.reduce((total, value) => total + Math.abs(value), 0)
          : norm(row);
        return Math.max(1, Math.ceil(stretch * ambientRadius + 1));
      });
    } catch {
      return Array(state.ambientDim).fill(1);
    }
  }

  function ambientInLatticeProjectionBound(point, radius, boundShape = "ball") {
    const tolerance = sliceTolerance();
    if (normalizeLatticeBoundShape(boundShape) === "ball") return norm(point) <= radius + tolerance;
    return point.every((coordinate) => Math.abs(coordinate) <= radius + tolerance);
  }

  function enumerateLatticeVectors(basisRows, ambientRadius, options = {}) {
    const n = state.ambientDim;
    const cap = options.cap || LATTICE_ENUMERATION_CAP;
    const includeZero = options.includeZero === true;
    const boundShape = normalizeLatticeBoundShape(options.boundShape || "ball");
    const bounds = latticeCoefficientBounds(basisRows, ambientRadius, boundShape);
    const maxShell = Math.min(options.maxShell || Math.max(...bounds), Math.max(...bounds));
    const vectors = [];
    let candidateCount = 0;
    let capped = false;
    const seen = new Set();
    const visitShell = (shell, index, coeffs, shellUsed) => {
      if (capped) return;
      if (index === n) {
        if (!shellUsed && shell > 0) return;
        if (!includeZero && coeffs.every((value) => value === 0)) return;
        candidateCount += 1;
        if (candidateCount > cap) {
          capped = true;
          return;
        }
        const key = coeffs.join(",");
        if (seen.has(key)) return;
        seen.add(key);
        const ambient = multiplyMatrixVector(basisRows, coeffs);
        const length = norm(ambient);
        if (ambientInLatticeProjectionBound(ambient, ambientRadius, boundShape)) {
          vectors.push({ coeffs: coeffs.slice(), ambient, length });
        }
        return;
      }
      const bound = Math.min(bounds[index], shell);
      for (let value = -bound; value <= bound; value += 1) {
        coeffs[index] = value;
        visitShell(shell, index + 1, coeffs, shellUsed || Math.abs(value) === shell);
        if (capped) return;
      }
    };
    for (let shell = includeZero ? 0 : 1; shell <= maxShell; shell += 1) {
      visitShell(shell, 0, Array(n).fill(0), shell === 0);
      if (capped) break;
    }
    vectors.sort((left, right) => left.length - right.length);
    return { vectors, candidateCount, capped, bounds, maxShell, boundShape, boundRadius: ambientRadius };
  }

  function matchingVisibleRootLatticeForWeightLattice(object) {
    const data = object?.data || {};
    if (
      objectTypeKey(object) !== "lattice" ||
      data.basisMode !== "dynkin" ||
      normalizeDynkinLatticeKind(data.dynkinLatticeKind) !== "weight"
    ) {
      return null;
    }
    const dynkinType = normalizeWeylDynkinType(data.dynkinType, state.ambientDim);
    return state.objects.find((candidate) => {
      if (!candidate.visibleProjection || candidate.id === object.id || objectTypeKey(candidate) !== "lattice") return false;
      const candidateData = candidate.data || {};
      return candidateData.basisMode === "dynkin" &&
        normalizeDynkinLatticeKind(candidateData.dynkinLatticeKind) === "root" &&
        normalizeWeylDynkinType(candidateData.dynkinType, state.ambientDim) === dynkinType &&
        (candidateData.ambientDimension || state.ambientDim) === state.ambientDim;
    }) || null;
  }

  function rootLatticeMembershipTesterForWeightLattice(object) {
    const rootLattice = matchingVisibleRootLatticeForWeightLattice(object);
    if (!rootLattice) return null;
    const dynkinType = normalizeWeylDynkinType(object.data?.dynkinType, state.ambientDim);
    try {
      const rootRows = simpleRootMatrixRows(dynkinType, state.ambientDim);
      const inverseRootRows = inverseMatrix(rootRows, `${weylDynkinLabel(dynkinType, state.ambientDim)} root lattice`);
      return {
        rootLattice,
        contains: (point) => {
          const coefficients = multiplyMatrixVector(inverseRootRows, resizeVector(point, state.ambientDim));
          return coefficients.every((value) => Math.abs(value - Math.round(value)) <= Math.max(1e-7, sliceTolerance() * 10));
        },
      };
    } catch {
      return null;
    }
  }

  function latticeProjectionData(object) {
    const resolved = resolveLatticeBasis(object);
    if (!resolved.ok) {
      const empty = {
        points: [],
        pointMetadata: [],
        rays: [],
        status: resolved.warning || "invalid lattice basis",
        capped: false,
        enumerationCapped: false,
        displayCapped: false,
        enumerated: 0,
        visible: 0,
        drawn: 0,
        suppressedByRootLattice: 0,
        infoOnly: false,
        showPoints: true,
      };
      latticeProjectionStatsCache.set(object.id, {
        enumerated: 0,
        visible: 0,
        drawn: 0,
        suppressedByRootLattice: 0,
        displayCapped: false,
        enumerationCapped: false,
        showPoints: true,
      });
      return empty;
    }
    const data = object.data || {};
    data.latticeBoundShape = normalizeLatticeBoundShape(data.latticeBoundShape);
    data.latticeBoundRadius = normalizeLatticeBoundRadius(data.latticeBoundRadius);
    const boundShape = data.latticeBoundShape;
    const radius = data.latticeBoundRadius;
    const rootMembership = rootLatticeMembershipTesterForWeightLattice(object);
    const enumeration = enumerateLatticeVectors(resolved.basisRows, radius, {
      boundShape,
      cap: LATTICE_PROJECTION_ENUMERATION_CAP,
      includeZero: true,
    });
    const projectedVectors = enumeration.vectors.filter((vector) => viewportPointInside(frameCoordsForAmbient(vector.ambient), state.viewport.boxRadius));
    const suppressedByRootLattice = rootMembership
      ? projectedVectors.filter((vector) => rootMembership.contains(vector.ambient)).length
      : 0;
    const visibleVectors = data.showLatticePoints === false
      ? []
      : projectedVectors.filter((vector) => !rootMembership || !rootMembership.contains(vector.ambient));
    const drawnVectors = visibleVectors.slice(0, LATTICE_PROJECTION_POINT_CAP);
    const points = drawnVectors.map((vector) => vector.ambient);
    const pointMetadata = drawnVectors.map((vector) => ({
      lattice: true,
      coeffs: vector.coeffs.slice(),
      length: vector.length,
    }));
    const displayCapped = data.showLatticePoints !== false && visibleVectors.length > LATTICE_PROJECTION_POINT_CAP;
    const capped = enumeration.capped || displayCapped;
    const boundText = latticeBoundDescription(data);
    const shrinkHint = "reduce this lattice point-bound radius for complete drawing";
    const suppressionText = suppressedByRootLattice
      ? `${suppressedByRootLattice} shared ${rootMembership.rootLattice.name} point${suppressedByRootLattice === 1 ? "" : "s"} hidden from ${object.name}`
      : "";
    const status = enumeration.capped
      ? `${object.name} lattice point search capped in ${boundText} after ${enumeration.candidateCount} candidates; ${shrinkHint}`
      : displayCapped
        ? `${object.name} showing ${points.length}/${visibleVectors.length} visible projected lattice points from ${enumeration.vectors.length} in ${boundText}; ${shrinkHint}`
        : suppressionText;
    const result = {
      points,
      pointMetadata,
      rays: [],
      status,
      capped,
      enumerationCapped: enumeration.capped,
      displayCapped,
      enumerated: enumeration.vectors.length,
      visible: visibleVectors.length,
      drawn: points.length,
      suppressedByRootLattice,
      candidateCount: enumeration.candidateCount,
      boundShape,
      boundRadius: radius,
      bounds: enumeration.bounds,
      maxShell: enumeration.maxShell,
      complete: !capped,
      infoOnly: !enumeration.capped && !displayCapped && !!suppressionText,
      showPoints: data.showLatticePoints !== false,
    };
    latticeProjectionStatsCache.set(object.id, {
      enumerated: result.enumerated,
      visible: result.visible,
      drawn: result.drawn,
      suppressedByRootLattice: result.suppressedByRootLattice,
      displayCapped: result.displayCapped,
      enumerationCapped: result.enumerationCapped,
      showPoints: result.showPoints,
    });
    return result;
  }

  function resolveVoronoiBasis(object, options = {}) {
    const data = object?.data || {};
    object.data = normalizeVoronoiDiagramData(data, state.ambientDim);
    const warning = refreshVoronoiFromLattice(object, options);
    const rows = cloneMatrixRows(object.data.cachedBasisRows, state.ambientDim);
    try {
      validateFullRankMatrixRows(rows, state.ambientDim, `${object.name} basis`);
      return { ok: true, basisRows: rows, warning };
    } catch (error) {
      object.data.voronoiStatus = `Voronoi basis warning: ${error.message}`;
      return { ok: false, basisRows: rows, warning: warning || error.message };
    }
  }

  function exactVoronoiSlice(object) {
    const resolved = resolveVoronoiBasis(object);
    const data = object.data || {};
    const radius = formulaClipRadius(object);
    if (!resolved.ok) {
      return {
        kind: "empty",
        latticeStatus: resolved.warning || "invalid Voronoi lattice basis",
        latticeEnumerationCapped: false,
        latticeHalfspaces: 0,
      };
    }
    const start = nowMs();
    const center = finiteVector(data.latticePoint, state.ambientDim);
    const relevant = voronoiRelevantVectorsForBasis(resolved.basisRows);
    const vectors = relevant.vectors.filter((vector) => vector.length > sliceTolerance());
    let polygon = initialClipPolygon(radius);
    const halfspaces = [];
    let skipped = 0;
    const tolerance = sliceTolerance();

    for (const vector of vectors) {
      const lambda = vector.ambient;
      const a = dot(lambda, state.frame[0]);
      const b = dot(lambda, state.frame[1]);
      const c = dot(center, lambda) + (dot(lambda, lambda) / 2) - dot(lambda, state.p);
      const scaleValue = Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c));
      if (Math.hypot(a, b) <= tolerance * scaleValue) {
        if (c < -tolerance) {
          polygon = [];
          break;
        }
        skipped += 1;
        continue;
      }
      const maxBoundValue = maxLinearValueOnViewportBound(a, b, c, radius);
      if (maxBoundValue < -tolerance) {
        skipped += 1;
        continue;
      }
      if (maxLinearValueOnPolygon(polygon, a, b, c) <= tolerance * scaleValue) {
        skipped += 1;
        continue;
      }
      polygon = clipPolygonByHalfPlane(polygon, a, b, c);
      halfspaces.push({ a, b, c, lambda, length: vector.length });
      if (!polygon.length) break;
    }

    const buildMs = nowMs() - start;
    const cleaned = cleanPolygon(polygon);
    const status = [
      relevant.capped ? (relevant.status || "Voronoi relevant-vector search capped/partial") : "",
      skipped ? `${skipped} inactive/degenerate lattice inequalities skipped` : "",
    ].filter(Boolean).join("; ");
    object.data.voronoiStatus = status || `${halfspaces.length} Voronoi halfspaces from ${vectors.length} relevant vectors`;
    if (!cleaned.length) {
      return {
        kind: "empty",
        latticeStatus: object.data.voronoiStatus,
        latticeEnumerationCapped: relevant.capped,
        latticeHalfspaces: halfspaces.length,
        latticeBuildMs: buildMs,
      };
    }
    return {
      kind: "lattice-voronoi",
      vertices: cleaned,
      halfspaces,
      center,
      latticeStatus: object.data.voronoiStatus,
      latticeEnumerationCapped: relevant.capped,
      latticeHalfspaces: halfspaces.length,
      latticeVectorCount: vectors.length,
      latticeCosetCount: relevant.cosetCount,
      latticeNodeCount: relevant.nodeCount,
      latticeBuildMs: buildMs,
      clipRadius: radius,
    };
  }

  function voronoiProjectionCacheKey(object, basisRows, center) {
    return [
      object.id,
      state.ambientDim,
      vectorKey(center, 8),
      matrixRowsText(basisRows, 8),
    ].join("|");
  }

  function voronoiHalfspaceFromLatticeVector(vector, center) {
    const normal = vector.ambient.slice();
    return {
      normal,
      offset: dot(center, normal) + dot(normal, normal) / 2,
      lambda: normal,
      length: vector.length,
    };
  }

  function voronoiProjectionHalfspaces(basisRows, center) {
    const relevant = voronoiRelevantVectorsForBasis(basisRows);
    let halfspaceCapped = false;
    const halfspaces = [];
    let vertexResult = { vertices: [], checked: 0, capped: false };
    const vectors = relevant.vectors
      .filter((vector) => vector.length > sliceTolerance())
      .map((vector) => voronoiHalfspaceFromLatticeVector(vector, center))
      .sort((left, right) => left.length - right.length);

    let index = 0;
    while (index < vectors.length && !halfspaceCapped && !vertexResult.capped) {
      const groupLength = vectors[index].length;
      const group = [];
      while (index < vectors.length && Math.abs(vectors[index].length - groupLength) <= 1e-8) {
        group.push(vectors[index]);
        index += 1;
      }
      let added = 0;
      for (const halfspace of group) {
        const cutsCurrentCell = !vertexResult.vertices.length || vertexResult.vertices.some((vertex) =>
          voronoiHalfspaceValue(halfspace, vertex.point) > Math.max(1e-7, sliceTolerance() * 10) * voronoiHalfspaceScale(halfspace, vertex.point)
        );
        if (!cutsCurrentCell) continue;
        halfspaces.push(halfspace);
        added += 1;
        if (halfspaces.length >= VORONOI_PROJECTION_HALFSPACE_CAP) {
          halfspaceCapped = true;
          break;
        }
      }
      if (added) vertexResult = enumerateVoronoiProjectionVertices(halfspaces, state.ambientDim);
    }

    const complete = !relevant.capped && !halfspaceCapped && !vertexResult.capped && !!vertexResult.vertices.length;

    return {
      halfspaces,
      vertexResult,
      candidateCount: vectors.length,
      capped: !complete,
      vectorCapped: relevant.capped,
      halfspaceCapped,
      complete,
      relevantStatus: relevant.status,
      relevantCosetCount: relevant.cosetCount,
      relevantNodeCount: relevant.nodeCount,
    };
  }

  function solveVoronoiVertex(halfspaces, indices) {
    const normals = indices.map((index) => halfspaces[index].normal);
    const offsets = indices.map((index) => halfspaces[index].offset);
    try {
      return multiplyMatrixVector(inverseMatrix(normals, "Voronoi vertex system"), offsets);
    } catch {
      return null;
    }
  }

  function voronoiHalfspaceValue(halfspace, point) {
    return dot(halfspace.normal, point) - halfspace.offset;
  }

  function voronoiHalfspaceScale(halfspace, point) {
    return Math.max(1, norm(halfspace.normal), Math.abs(halfspace.offset), norm(point));
  }

  function activeVoronoiFacets(halfspaces, point, fallbackIndices = []) {
    const active = new Set(fallbackIndices);
    const tolerance = Math.max(1e-7, sliceTolerance() * 10);
    halfspaces.forEach((halfspace, index) => {
      const value = voronoiHalfspaceValue(halfspace, point);
      if (Math.abs(value) <= tolerance * voronoiHalfspaceScale(halfspace, point)) active.add(index);
    });
    return Array.from(active).sort((left, right) => left - right);
  }

  function pointSatisfiesVoronoiHalfspaces(halfspaces, point) {
    if (!point || point.some((value) => !Number.isFinite(value))) return false;
    const tolerance = Math.max(1e-7, sliceTolerance() * 10);
    return halfspaces.every((halfspace) =>
      voronoiHalfspaceValue(halfspace, point) <= tolerance * voronoiHalfspaceScale(halfspace, point)
    );
  }

  function enumerateVoronoiProjectionVertices(halfspaces, n) {
    const vertices = [];
    const seen = new Set();
    const combo = [];
    let checked = 0;
    let capped = false;

    const visit = (start, depth) => {
      if (capped) return;
      if (depth === n) {
        checked += 1;
        if (checked > VORONOI_PROJECTION_COMBINATION_CAP) {
          capped = true;
          return;
        }
        const point = solveVoronoiVertex(halfspaces, combo);
        if (!pointSatisfiesVoronoiHalfspaces(halfspaces, point)) return;
        const key = vectorKey(point, 7);
        if (seen.has(key)) return;
        seen.add(key);
        vertices.push({
          point,
          active: activeVoronoiFacets(halfspaces, point, combo),
        });
        if (vertices.length >= VORONOI_PROJECTION_VERTEX_CAP) capped = true;
        return;
      }
      const remaining = n - depth;
      for (let index = start; index <= halfspaces.length - remaining; index += 1) {
        combo[depth] = index;
        visit(index + 1, depth + 1);
        if (capped) return;
      }
    };

    if (halfspaces.length >= n) visit(0, 0);
    return { vertices, checked, capped };
  }

  function forEachIndexSubset(indices, size, callback, capState) {
    const subset = [];
    const visit = (start, depth) => {
      if (capState.capped) return;
      if (depth === size) {
        capState.count += 1;
        if (capState.count > capState.cap) {
          capState.capped = true;
          return;
        }
        callback(subset.slice());
        return;
      }
      const remaining = size - depth;
      for (let index = start; index <= indices.length - remaining; index += 1) {
        subset[depth] = indices[index];
        visit(index + 1, depth + 1);
        if (capState.capped) return;
      }
    };
    if (size <= 0) return;
    visit(0, 0);
  }

  function enumerateVoronoiProjectionEdges(vertices, halfspaces, n) {
    const edgeSet = new Set();
    const groups = new Map();
    const subsetCap = { count: 0, cap: VORONOI_PROJECTION_EDGE_CAP * Math.max(4, n), capped: false };
    const edgeCap = { capped: false };

    vertices.forEach((vertex, vertexIndex) => {
      if (vertex.active.length < n - 1 || subsetCap.capped) return;
      forEachIndexSubset(vertex.active, n - 1, (subset) => {
        const normals = subset.map((index) => halfspaces[index].normal);
        if (matrixRank(normals, n) < n - 1) return;
        const key = subset.join(",");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(vertexIndex);
      }, subsetCap);
    });

    const addEdge = (left, right) => {
      if (left === right || edgeCap.capped) return;
      const a = Math.min(left, right);
      const b = Math.max(left, right);
      edgeSet.add(`${a},${b}`);
      if (edgeSet.size >= VORONOI_PROJECTION_EDGE_CAP) edgeCap.capped = true;
    };

    for (const group of groups.values()) {
      if (edgeCap.capped) break;
      const unique = Array.from(new Set(group));
      if (unique.length === 2) {
        addEdge(unique[0], unique[1]);
      } else if (unique.length > 2) {
        let best = [unique[0], unique[1]];
        let bestDistance = -Infinity;
        for (let i = 0; i < unique.length; i += 1) {
          for (let j = i + 1; j < unique.length; j += 1) {
            const distance = norm(subtract(vertices[unique[i]].point, vertices[unique[j]].point));
            if (distance > bestDistance) {
              bestDistance = distance;
              best = [unique[i], unique[j]];
            }
          }
        }
        addEdge(best[0], best[1]);
      }
    }

    return {
      edges: Array.from(edgeSet, (key) => key.split(",").map((value) => Number(value))),
      capped: subsetCap.capped || edgeCap.capped,
      groupCount: groups.size,
      subsetCount: subsetCap.count,
    };
  }

  function voronoiProjectionData(object) {
    const resolved = resolveVoronoiBasis(object);
    if (!resolved.ok) {
      return {
        points: [],
        edges: [],
        rays: [],
        status: resolved.warning || "invalid Voronoi lattice basis",
        capped: false,
        halfspaceCount: 0,
        vertexCount: 0,
        edgeCount: 0,
        buildMs: 0,
      };
    }

    const start = nowMs();
    const data = object.data || {};
    const center = finiteVector(data.latticePoint, state.ambientDim);
    const cacheKey = voronoiProjectionCacheKey(object, resolved.basisRows, center);
    const cached = voronoiProjectionCache.get(cacheKey);
    if (cached) return cached;

    const halfspaceResult = voronoiProjectionHalfspaces(resolved.basisRows, center);
    const vertexResult = halfspaceResult.vertexResult || enumerateVoronoiProjectionVertices(halfspaceResult.halfspaces, state.ambientDim);
    const edgeResult = enumerateVoronoiProjectionEdges(vertexResult.vertices, halfspaceResult.halfspaces, state.ambientDim);
    const capped = halfspaceResult.capped || vertexResult.capped || edgeResult.capped;
    const statusParts = [
      halfspaceResult.vectorCapped ? (halfspaceResult.relevantStatus || "relevant-vector search capped") : "",
      halfspaceResult.halfspaceCapped ? "halfspace cap reached" : "",
      !halfspaceResult.complete ? "cell completion not certified" : "",
      vertexResult.capped ? "vertex enumeration capped" : "",
      edgeResult.capped ? "edge enumeration capped" : "",
      !vertexResult.vertices.length ? "no projection vertices found" : "",
    ].filter(Boolean);
    const status = statusParts.length
      ? `${object.name} Voronoi projection partial/capped: ${statusParts.join("; ")}`
      : "";
    const result = {
      points: vertexResult.vertices.map((vertex) => vertex.point),
      edges: edgeResult.edges,
      rays: [],
      status,
      capped,
      halfspaceCount: halfspaceResult.halfspaces.length,
      vertexCount: vertexResult.vertices.length,
      edgeCount: edgeResult.edges.length,
      candidateCount: halfspaceResult.candidateCount,
      cosetCount: halfspaceResult.relevantCosetCount,
      nodeCount: halfspaceResult.relevantNodeCount,
      combinationCount: vertexResult.checked,
      edgeGroupCount: edgeResult.groupCount,
      buildMs: nowMs() - start,
    };
    if (voronoiProjectionCache.size > 32) voronoiProjectionCache.clear();
    voronoiProjectionCache.set(cacheKey, result);
    return result;
  }

  function drawLatticeVoronoiSlice(ctx, view, object, slice, options = {}) {
    const projected = (slice.vertices || []).map((vertex) => projectFramePoint(vertex, view));
    if (projected.length < 3) return;
    const alpha = options.alpha ?? 0.85;
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = options.color || ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let index = 1; index < projected.length; index += 1) ctx.lineTo(projected[index].x, projected[index].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = options.color || ctx.strokeStyle;
    ctx.lineWidth = options.lineWidth || 2 * view.ratio;
    ctx.stroke();
    if (shouldDrawObjectLabels(object)) {
      const center = polygonCentroid(slice.vertices);
      const point = projectFramePoint(center, view);
      const latticePoint = finiteVector(slice.center || object.data?.latticePoint || [], state.ambientDim);
      const isOrigin = norm(latticePoint) <= sliceTolerance();
      addCanvasMathLabel(view, point, isOrigin ? "Vor(0)" : `Vor(${vectorToTupleText(latticePoint, 2)})`, isOrigin ? "\\mathrm{Vor}(0)" : `\\mathrm{Vor}\\!\\left(${vectorToTupleTex(latticePoint, 2)}\\right)`, {
        centered: true,
        color: options.color || "#4f7a55",
      });
    }
    ctx.restore();
  }

  function weylRootSystem(type, rank = state.ambientDim) {
    const dynkinType = normalizeWeylDynkinType(type, rank);
    const key = `${dynkinType}:${rank}`;
    if (weylRootSystemCache.has(key)) return weylRootSystemCache.get(key);
    let system;
    if (dynkinType === "A") system = aWeylRootSystem(rank);
    else if (dynkinType === "B" || dynkinType === "C") system = bcWeylRootSystem(dynkinType, rank);
    else if (dynkinType === "D") system = dWeylRootSystem(rank);
    else if (dynkinType === "G") system = g2WeylRootSystem();
    else if (dynkinType === "F") system = f4WeylRootSystem();
    else system = exceptionalEWeylRootSystem(rank);
    weylRootSystemCache.set(key, system);
    return system;
  }

  function aWeylRootSystem(rank) {
    const basis = sumZeroOrthonormalBasis(rank);
    const rootCoord = (i, j) => basis.map((vector) => vector[i] - vector[j]);
    const hyperplaneRoots = [];
    for (let i = 0; i <= rank; i += 1) {
      for (let j = i + 1; j <= rank; j += 1) hyperplaneRoots.push(normalizeVector(rootCoord(i, j)));
    }
    const simpleRootBasis = Array.from({ length: rank }, (_, index) => rootCoord(index, index + 1));
    return {
      type: "A",
      rank,
      simpleRootBasis,
      simpleRoots: simpleRootBasis.map(normalizeVector),
      hyperplaneRoots,
      permutationCoordinates: (point) => {
        const coords = Array(rank + 1).fill(0);
        for (let basisIndex = 0; basisIndex < rank; basisIndex += 1) {
          for (let coordinate = 0; coordinate <= rank; coordinate += 1) {
            coords[coordinate] += (point[basisIndex] || 0) * basis[basisIndex][coordinate];
          }
        }
        return coords;
      },
    };
  }

  function bcWeylRootSystem(type, rank) {
    const roots = [];
    for (let i = 0; i < rank; i += 1) roots.push(unitVector(rank, i));
    for (let i = 0; i < rank; i += 1) {
      for (let j = i + 1; j < rank; j += 1) {
        roots.push(unitVector(rank, i).map((value, index) => value + (index === j ? 1 : 0)));
        roots.push(unitVector(rank, i).map((value, index) => value - (index === j ? 1 : 0)));
      }
    }
    const simpleRoots = [];
    for (let i = 0; i < rank - 1; i += 1) simpleRoots.push(unitVector(rank, i).map((value, index) => value - (index === i + 1 ? 1 : 0)));
    simpleRoots.push(type === "C"
      ? unitVector(rank, rank - 1).map((value) => 2 * value)
      : unitVector(rank, rank - 1));
    return {
      type,
      rank,
      simpleRootBasis: simpleRoots.map((root) => root.slice()),
      simpleRoots: simpleRoots.map(normalizeVector),
      hyperplaneRoots: uniqueHyperplaneRoots(roots),
    };
  }

  function dWeylRootSystem(rank) {
    const roots = [];
    for (let i = 0; i < rank; i += 1) {
      for (let j = i + 1; j < rank; j += 1) {
        roots.push(unitVector(rank, i).map((value, index) => value + (index === j ? 1 : 0)));
        roots.push(unitVector(rank, i).map((value, index) => value - (index === j ? 1 : 0)));
      }
    }
    const simpleRoots = [];
    for (let i = 0; i < rank - 1; i += 1) simpleRoots.push(unitVector(rank, i).map((value, index) => value - (index === i + 1 ? 1 : 0)));
    simpleRoots.push(unitVector(rank, rank - 2).map((value, index) => value + (index === rank - 1 ? 1 : 0)));
    return {
      type: "D",
      rank,
      simpleRootBasis: simpleRoots.map((root) => root.slice()),
      simpleRoots: simpleRoots.map(normalizeVector),
      hyperplaneRoots: uniqueHyperplaneRoots(roots),
    };
  }

  function g2WeylRootSystem() {
    const wallAngleOffset = Math.PI / 12;
    const hyperplaneRoots = Array.from({ length: 6 }, (_, index) => [
      Math.cos(wallAngleOffset + (Math.PI * index) / 6),
      Math.sin(wallAngleOffset + (Math.PI * index) / 6),
    ]);
    const simpleAngle = (5 * Math.PI) / 12;
    const simpleRootBasis = [
      [Math.sqrt(3) * Math.cos(simpleAngle), Math.sqrt(3) * Math.sin(simpleAngle)],
      [Math.cos(simpleAngle), -Math.sin(simpleAngle)],
    ];
    return {
      type: "G",
      rank: 2,
      simpleRootBasis,
      simpleRoots: simpleRootBasis.map(normalizeVector),
      hyperplaneRoots: uniqueHyperplaneRoots(hyperplaneRoots),
    };
  }

  function f4WeylRootSystem() {
    const rank = 4;
    const roots = [];
    for (let i = 0; i < rank; i += 1) {
      roots.push(unitVector(rank, i));
      roots.push(unitVector(rank, i).map((value) => -value));
    }
    for (let i = 0; i < rank; i += 1) {
      for (let j = i + 1; j < rank; j += 1) {
        for (const si of [-1, 1]) {
          for (const sj of [-1, 1]) {
            roots.push(Array.from({ length: rank }, (_, index) => (index === i ? si : index === j ? sj : 0)));
          }
        }
      }
    }
    for (let mask = 0; mask < 16; mask += 1) {
      roots.push(Array.from({ length: rank }, (_, index) => ((mask >> index) & 1 ? -0.5 : 0.5)));
    }
    const simpleRoots = [
      [0, 1, -1, 0],
      [0, 0, 1, -1],
      [0, 0, 0, 1],
      [0.5, -0.5, -0.5, -0.5],
    ];
    return {
      type: "F",
      rank,
      simpleRootBasis: simpleRoots.map((root) => root.slice()),
      simpleRoots: simpleRoots.map(normalizeVector),
      hyperplaneRoots: uniqueHyperplaneRoots(roots),
    };
  }

  function exceptionalEWeylRootSystem(rank) {
    const simpleRoots = choleskyVectorsFromGram(eCartanMatrix(rank));
    const roots = rootsFromSimpleReflections(simpleRoots);
    return {
      type: "E",
      rank,
      simpleRootBasis: simpleRoots.map((root) => root.slice()),
      simpleRoots: simpleRoots.map(normalizeVector),
      hyperplaneRoots: uniqueHyperplaneRoots(roots),
    };
  }

  function eCartanMatrix(rank) {
    const matrix = Array.from({ length: rank }, (_, row) =>
      Array.from({ length: rank }, (_, col) => (row === col ? 2 : 0))
    );
    const edges = rank === 6
      ? [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]]
      : rank === 7
        ? [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]]
        : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7]];
    for (const [left, right] of edges) {
      matrix[left][right] = -1;
      matrix[right][left] = -1;
    }
    return matrix;
  }

  function choleskyVectorsFromGram(gram) {
    const n = gram.length;
    const lower = Array.from({ length: n }, () => Array(n).fill(0));
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        let sum = gram[row][col];
        for (let k = 0; k < col; k += 1) sum -= lower[row][k] * lower[col][k];
        if (row === col) lower[row][col] = Math.sqrt(Math.max(sum, 0));
        else lower[row][col] = Math.abs(lower[col][col]) <= 1e-12 ? 0 : sum / lower[col][col];
      }
    }
    return lower;
  }

  function rootsFromSimpleReflections(simpleRoots) {
    const roots = [];
    const queue = [];
    const seen = new Set();
    const enqueue = (root) => {
      const cleaned = root.map((value) => (Math.abs(value) < 1e-10 ? 0 : value));
      const key = vectorKey(cleaned, 8);
      if (seen.has(key)) return;
      seen.add(key);
      roots.push(cleaned);
      queue.push(cleaned);
    };
    simpleRoots.forEach((root) => {
      enqueue(root);
      enqueue(root.map((value) => -value));
    });
    for (let cursor = 0; cursor < queue.length && roots.length < 1000; cursor += 1) {
      const root = queue[cursor];
      for (const simpleRoot of simpleRoots) enqueue(reflectVector(root, simpleRoot));
    }
    return roots;
  }

  function finiteRootSet(dynkinType, rank = state.ambientDim) {
    const type = normalizeWeylDynkinType(dynkinType, rank);
    const key = `${type}:${rank}`;
    if (finiteRootSetCache.has(key)) return finiteRootSetCache.get(key);
    const system = weylRootSystem(type, rank);
    const simpleRootBasis = system.simpleRootBasis || system.simpleRoots;
    const roots = rootsFromSimpleReflections(simpleRootBasis)
      .map((root) => resizeVector(root, rank))
      .filter((root) => norm(root) > 1e-10);
    const simpleRows = matrixRowsFromColumns(simpleRootBasis, rank);
    const simpleInverse = inverseMatrix(simpleRows, `${weylDynkinLabel(type, rank)} simple roots`);
    const rootEntries = roots.map((root) => {
      const coefficients = multiplyMatrixVector(simpleInverse, root).map(cleanRootCoefficient);
      const positive = coefficients.every((value) => value >= -1e-7);
      const negative = coefficients.every((value) => value <= 1e-7);
      const canonicalCoefficients = negative ? coefficients.map((value) => -value) : coefficients;
      return {
        root,
        coefficients,
        positive,
        display: rootCoefficientDisplay(coefficients),
        sortKey: [
          positive ? 0 : 1,
          canonicalCoefficients.reduce((total, value) => total + Math.abs(value), 0),
          ...canonicalCoefficients.map((value) => Math.abs(value)),
          ...coefficients,
        ],
      };
    });
    rootEntries.sort(compareRootEntries);
    const result = {
      type,
      rank,
      roots: rootEntries,
      positiveRoots: rootEntries.filter((entry) => entry.positive),
    };
    finiteRootSetCache.set(key, result);
    return result;
  }

  function cleanRootCoefficient(value) {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) <= 1e-7) return rounded;
    return Math.abs(value) <= 1e-9 ? 0 : value;
  }

  function compareRootEntries(left, right) {
    const a = left.sortKey || [];
    const b = right.sortKey || [];
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const diff = finiteNumber(a[index], 0) - finiteNumber(b[index], 0);
      if (Math.abs(diff) > 1e-10) return diff;
    }
    return 0;
  }

  function rootCoefficientDisplay(coefficients) {
    const terms = [];
    const texTerms = [];
    coefficients.forEach((coefficient, index) => {
      if (Math.abs(coefficient) <= 1e-9) return;
      const sign = coefficient < 0 ? "-" : "+";
      const absValue = Math.abs(coefficient);
      const coeffText = Math.abs(absValue - 1) <= 1e-9 ? "" : fmt(absValue, 3);
      const plainTerm = `${coeffText}alpha_${index + 1}`;
      const texCoeff = Math.abs(absValue - 1) <= 1e-9 ? "" : fmt(absValue, 3);
      const texTerm = `${texCoeff}\\alpha_{${index + 1}}`;
      terms.push({ sign, text: plainTerm });
      texTerms.push({ sign, text: texTerm });
    });
    if (!terms.length) return { plain: "0", tex: "0" };
    const plain = terms.map((term, index) =>
      index === 0
        ? `${term.sign === "-" ? "-" : ""}${term.text}`
        : ` ${term.sign} ${term.text}`
    ).join("");
    const tex = texTerms.map((term, index) =>
      index === 0
        ? `${term.sign === "-" ? "-" : ""}${term.text}`
        : ` ${term.sign} ${term.text}`
    ).join("");
    return { plain, tex };
  }

  function rootSetProjectionData(object) {
    object.data = normalizeRootSetData(object.data || {}, state.ambientDim);
    refreshRootSetFromDynkin(object);
    const data = object.data || {};
    try {
      const roots = finiteRootSet(data.dynkinType, state.ambientDim);
      const entries = normalizeRootSetSignMode(data.rootSignMode) === "positive"
        ? roots.positiveRoots
        : roots.roots;
      data.rootStatus = `${entries.length}/${roots.roots.length} ${data.rootSignMode === "positive" ? "positive " : ""}roots for ${weylDynkinLabel(data.dynkinType, state.ambientDim)}`;
      return {
        points: entries.map((entry) => entry.root),
        edges: [],
        rays: [],
        pointLabels: entries.map((entry) => entry.display.plain),
        pointTexLabels: entries.map((entry) => entry.display.tex),
        rootSet: {
          shown: entries.length,
          total: roots.roots.length,
          positive: roots.positiveRoots.length,
          status: data.rootStatus,
        },
      };
    } catch (error) {
      data.rootStatus = `root-set warning: ${error.message}`;
      return { points: [], edges: [], rays: [], rootSet: { shown: 0, total: 0, positive: 0, status: data.rootStatus } };
    }
  }

  function reflectVector(vector, root) {
    const rootNormSq = Math.max(dot(root, root), 1e-12);
    const factor = (2 * dot(vector, root)) / rootNormSq;
    return vector.map((value, index) => value - factor * (root[index] || 0));
  }

  function sumZeroOrthonormalBasis(rank) {
    const raw = [];
    for (let index = 0; index < rank; index += 1) {
      raw.push(Array.from({ length: rank + 1 }, (_, coordinate) => (coordinate === index ? 1 : coordinate === rank ? -1 : 0)));
    }
    const basis = [];
    for (const vector of raw) {
      let candidate = vector.slice();
      for (const existing of basis) {
        const projection = dot(candidate, existing);
        candidate = candidate.map((value, index) => value - projection * existing[index]);
      }
      basis.push(normalizeVector(candidate));
    }
    return basis;
  }

  function unitVector(n, index) {
    return Array.from({ length: n }, (_, coordinate) => (coordinate === index ? 1 : 0));
  }

  function normalizeVector(vector) {
    const length = Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
    return length > 1e-12 ? vector.map((value) => value / length) : vector.slice();
  }

  function uniqueHyperplaneRoots(roots) {
    const seen = new Set();
    const unique = [];
    for (const root of roots) {
      const canonical = canonicalHyperplaneRoot(root);
      const key = vectorKey(canonical, 8);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(canonical);
    }
    return unique;
  }

  function canonicalHyperplaneRoot(root) {
    const normalized = normalizeVector(root);
    const first = normalized.find((value) => Math.abs(value) > 1e-10) || 1;
    return first < 0 ? normalized.map((value) => -value) : normalized;
  }

  function vectorKey(vector, digits = 8) {
    return vector.map((value) => fmt(value, digits)).join(",");
  }

  function weylSignPattern(roots, ambient) {
    const tolerance = sliceTolerance();
    return roots.map((root) => {
      const value = dot(root, ambient);
      if (value > tolerance) return "+";
      if (value < -tolerance) return "-";
      return "0";
    });
  }

  function isWeylKlLabelMode(mode) {
    const normalizedMode = normalizeWeylLabelMode(mode);
    return normalizedMode === "kl" || normalizedMode === "kl-v1";
  }

  function weylChamberDisplay(system, ambient, mode) {
    const normalizedMode = normalizeWeylLabelMode(mode);
    if (normalizedMode === "length") {
      const length = weylReducedWord(system, ambient).length;
      return {
        plain: String(length),
        tex: String(length),
      };
    }
    if (isWeylKlLabelMode(normalizedMode)) return { plain: "", tex: "" };
    if (normalizedMode === "word" || !["A", "B", "C", "D"].includes(system.type)) return weylWordDisplay(system, ambient);
    return weylPermutationDisplay(system, ambient);
  }

  function weylPermutationDisplay(system, ambient) {
    if (system.type === "A") {
      const coords = system.permutationCoordinates(ambient);
      const order = coords.map((value, index) => ({ value, index: index + 1 }))
        .sort((left, right) => right.value - left.value)
        .map((entry) => entry.index);
      return {
        plain: `(${order.join(" ")})`,
        tex: `\\left(${order.join("\\,")}\\right)`,
      };
    }
    const order = ambient.map((value, index) => ({ value, index: index + 1, abs: Math.abs(value) }))
      .sort((left, right) => right.abs - left.abs);
    const plainEntries = order.map((entry) => `${entry.value < 0 ? "-" : "+"}${entry.index}`);
    const texEntries = order.map((entry) => entry.value < 0 ? `\\bar{${entry.index}}` : String(entry.index));
    return {
      plain: `[${plainEntries.join(" ")}]`,
      tex: `\\left[${texEntries.join("\\,")}\\right]`,
    };
  }

  function weylWordDisplay(system, ambient) {
    const word = weylReducedWord(system, ambient);
    if (!word.length) return { plain: "e", tex: "e" };
    return {
      plain: word.map((index) => `s${index}`).join(""),
      tex: word.map((index) => `s_{${index}}`).join(""),
    };
  }

  function weylElementDisplay(system, element, mode = "word") {
    const displayMode = normalizeWeylElementDisplayMode(mode, "word");
    if (displayMode === "permutation") return weylChamberDisplay(system, element.ambient, "permutation");
    const word = Array.isArray(element?.word) ? element.word : weylReducedWord(system, element?.ambient || []);
    if (!word.length) return { plain: "e", tex: "e" };
    return {
      plain: word.map((index) => `s${index}`).join(""),
      tex: word.map((index) => `s_{${index}}`).join(""),
    };
  }

  function weylReducedWord(system, ambient) {
    let point = ambient.slice();
    const word = [];
    const tolerance = sliceTolerance();
    const maxSteps = Math.max(32, system.hyperplaneRoots.length * 4);
    for (let step = 0; step < maxSteps; step += 1) {
      let reflected = false;
      for (let index = 0; index < system.simpleRoots.length; index += 1) {
        const simpleRoot = system.simpleRoots[index];
        if (dot(point, simpleRoot) < -tolerance) {
          point = reflectVector(point, simpleRoot);
          word.push(index + 1);
          reflected = true;
          break;
        }
      }
      if (!reflected) break;
    }
    return word;
  }

  function dominantWeylBasePoint(system) {
    const simpleRows = (system.simpleRootBasis || system.simpleRoots).map((root) => resizeVector(root, system.rank));
    try {
      return multiplyMatrixVector(inverseMatrix(simpleRows, `${weylDynkinLabel(system.type, system.rank)} simple root pairings`), Array(system.rank).fill(1));
    } catch {
      return normalize(Array(system.rank).fill(1), 0);
    }
  }

  function weylPointFromWord(system, word) {
    let point = dominantWeylBasePoint(system);
    for (let index = word.length - 1; index >= 0; index -= 1) {
      const simpleRoot = system.simpleRoots[(word[index] || 1) - 1];
      point = reflectVector(point, simpleRoot);
    }
    return point;
  }

  function normalizeWeylWord(word, generatorCount) {
    if (!Array.isArray(word)) return null;
    const limit = Math.max(1, Math.round(finiteNumber(generatorCount, 1)));
    return word
      .map((entry) => Math.round(finiteNumber(entry, NaN)))
      .filter((entry) => Number.isInteger(entry) && entry >= 1 && entry <= limit);
  }

  function weylElementFromWord(system, word) {
    const normalizedWord = normalizeWeylWord(word, system.simpleRoots.length);
    if (!normalizedWord) return null;
    return weylElementFromReducedWord(system, normalizedWord);
  }

  function weylElementFromAmbient(system, ambient) {
    const word = weylReducedWord(system, ambient);
    return weylElementFromReducedWord(system, word);
  }

  function weylElementFromReducedWord(system, word) {
    const normalizedWord = normalizeWeylWord(word, system.simpleRoots.length) || [];
    const ambient = weylPointFromWord(system, normalizedWord);
    const reducedWord = weylReducedWord(system, ambient);
    const regularAmbient = weylPointFromWord(system, reducedWord);
    return {
      key: weylSignPattern(system.hyperplaneRoots, regularAmbient).join(""),
      word: reducedWord,
      length: reducedWord.length,
      ambient: regularAmbient,
    };
  }

  function weylKlTargetElement(system, target, chambers) {
    const fromWord = weylElementFromWord(system, target?.word);
    if (fromWord) return fromWord;
    const selected = chambers.find((chamber) => chamber.key === target?.chamberKey);
    return selected ? weylElementFromAmbient(system, selected.ambient) : null;
  }

  function makeFiniteWeylKlCalculator(system, selectedElement) {
    const generators = Array.from({ length: system.simpleRoots.length }, (_, index) => index + 1);
    const elementByKey = new Map();
    const elementByWord = new Map();
    const lowerSetMemo = new Map();
    const polynomialMemo = new Map();

    const rememberElement = (element) => {
      const existing = elementByKey.get(element.key);
      if (!existing || element.length < existing.length) elementByKey.set(element.key, element);
      elementByWord.set(element.word.join(","), element);
      return elementByKey.get(element.key) || element;
    };

    const elementFromWord = (word) => {
      const normalizedWord = word.map((entry) => clamp(Math.round(finiteNumber(entry, 1)), 1, generators.length));
      const wordKey = normalizedWord.join(",");
      const cached = elementByWord.get(wordKey);
      if (cached) return cached;
      const ambient = weylPointFromWord(system, normalizedWord);
      const reducedWord = weylReducedWord(system, ambient);
      const element = rememberElement(weylElementFromReducedWord(system, reducedWord));
      elementByWord.set(wordKey, element);
      return element;
    };

    rememberElement(elementFromWord([]));
    rememberElement(selectedElement);

    const leftMultiply = (element, generator) => elementFromWord([generator, ...element.word]);

    const lowerSet = (element) => {
      const cached = lowerSetMemo.get(element.key);
      if (cached) return cached;
      const values = new Map();
      values.set(elementFromWord([]).key, elementFromWord([]));
      let checked = 0;
      for (const generator of element.word) {
        const current = Array.from(values.values());
        for (const candidate of current) {
          checked += 1;
          if (checked > WEYL_KL_SUBWORD_CAP) {
            const capped = { values, capped: true, reason: `subword search exceeded ${WEYL_KL_SUBWORD_CAP}` };
            lowerSetMemo.set(element.key, capped);
            return capped;
          }
          const next = elementFromWord([...candidate.word, generator]);
          values.set(next.key, next);
          if (values.size > WEYL_KL_INTERVAL_CAP) {
            const capped = { values, capped: true, reason: `interval exceeded ${WEYL_KL_INTERVAL_CAP} elements` };
            lowerSetMemo.set(element.key, capped);
            return capped;
          }
        }
      }
      values.set(element.key, element);
      const result = { values, capped: false, reason: "" };
      lowerSetMemo.set(element.key, result);
      return result;
    };

    const bruhatLeq = (left, right) => {
      if (left.key === right.key) return true;
      if (left.length > right.length) return false;
      const lower = lowerSet(right);
      if (lower.capped) throw new Error(lower.reason);
      return lower.values.has(left.key);
    };

    const leftDescents = (element) => generators.filter((generator) => leftMultiply(element, generator).length < element.length);

    const klPolynomial = (left, right) => {
      const memoKey = `${left.key}|${right.key}`;
      if (polynomialMemo.has(memoKey)) return polynomialMemo.get(memoKey);
      let result;
      if (left.key === right.key) {
        result = [1];
      } else if (left.length > right.length || !bruhatLeq(left, right)) {
        result = [];
      } else {
        const descent = leftDescents(right)[0];
        if (!descent) {
          result = [];
        } else {
          const leftStep = leftMultiply(left, descent);
          const rightStep = leftMultiply(right, descent);
          if (leftStep.length < left.length) {
            result = klPolynomial(leftStep, rightStep);
          } else {
            // Standard KL recurrence for P_{left,right}(q) with a left descent of right.
            result = polynomialAdd(
              polynomialShift(klPolynomial(leftStep, rightStep), 1),
              klPolynomial(left, rightStep)
            );
            const lower = lowerSet(rightStep);
            if (lower.capped) throw new Error(lower.reason);
            for (const middle of lower.values.values()) {
              if (middle.key === rightStep.key || !bruhatLeq(left, middle)) continue;
              if (leftMultiply(middle, descent).length >= middle.length) continue;
              const mu = klMuCoefficient(middle, rightStep);
              if (!mu) continue;
              const exponent = (right.length - middle.length) / 2;
              if (Math.abs(exponent - Math.round(exponent)) > 1e-9) continue;
              const correction = polynomialScale(polynomialShift(klPolynomial(left, middle), Math.round(exponent)), -mu);
              result = polynomialAdd(result, correction);
            }
          }
        }
      }
      result = polynomialTrim(result);
      polynomialMemo.set(memoKey, result);
      return result;
    };

    const klMuCoefficient = (left, right) => {
      const degree = (right.length - left.length - 1) / 2;
      if (degree < 0 || Math.abs(degree - Math.round(degree)) > 1e-9) return 0;
      return klPolynomial(left, right)[Math.round(degree)] || 0;
    };

    const selectedLower = lowerSet(selectedElement);
    if (selectedLower.capped) throw new Error(selectedLower.reason);
    return {
      selected: selectedElement,
      lowerSize: selectedLower.values.size,
      intervalElements: Array.from(selectedLower.values.values()),
      elementFromAmbient: (ambient) => rememberElement(weylElementFromAmbient(system, ambient)),
      polynomialFor: (element) => klPolynomial(element, selectedElement),
      contains: (element) => bruhatLeq(element, selectedElement),
    };
  }

  function polynomialTrim(poly) {
    const result = (poly || []).map((value) => Math.round(finiteNumber(value, 0)));
    while (result.length && result[result.length - 1] === 0) result.pop();
    return result;
  }

  function polynomialAdd(left, right) {
    const n = Math.max(left?.length || 0, right?.length || 0);
    return polynomialTrim(Array.from({ length: n }, (_, index) => finiteNumber(left?.[index], 0) + finiteNumber(right?.[index], 0)));
  }

  function polynomialScale(poly, scalar) {
    return polynomialTrim((poly || []).map((value) => finiteNumber(value, 0) * scalar));
  }

  function polynomialShift(poly, degree) {
    const shift = Math.max(0, Math.round(finiteNumber(degree, 0)));
    if (!poly?.length) return [];
    return polynomialTrim([...Array(shift).fill(0), ...poly]);
  }

  function polynomialValueAtOne(poly) {
    return (poly || []).reduce((total, value) => total + finiteNumber(value, 0), 0);
  }

  function formatSoergelKlPolynomial(poly, leftLength, rightLength) {
    if (!poly?.length) return { plain: "0", tex: "0" };
    const plainTerms = [];
    const texTerms = [];
    const baseDegree = rightLength - leftLength;
    poly.forEach((coefficient, qDegree) => {
      const coeff = Math.round(finiteNumber(coefficient, 0));
      if (!coeff) return;
      const vDegree = baseDegree - 2 * qDegree;
      const sign = coeff < 0 ? "-" : "+";
      const absCoeff = Math.abs(coeff);
      const coeffText = absCoeff === 1 && vDegree !== 0 ? "" : String(absCoeff);
      const vPlain = vDegree === 0 ? "" : vDegree === 1 ? "v" : `v^${vDegree}`;
      const vTex = vDegree === 0 ? "" : vDegree === 1 ? "v" : `v^{${vDegree}}`;
      plainTerms.push({ sign, text: `${coeffText}${vPlain || (coeffText ? "" : "1")}` });
      texTerms.push({ sign, text: `${coeffText}${vTex || (coeffText ? "" : "1")}` });
    });
    if (!plainTerms.length) return { plain: "0", tex: "0" };
    const plain = plainTerms.map((term, index) =>
      index === 0
        ? `${term.sign === "-" ? "-" : ""}${term.text}`
        : ` ${term.sign} ${term.text}`
    ).join("");
    const tex = texTerms.map((term, index) =>
      index === 0
        ? `${term.sign === "-" ? "-" : ""}${term.text}`
        : ` ${term.sign} ${term.text}`
    ).join("");
    return { plain, tex };
  }

  function hashString(value) {
    let hash = 0;
    for (let index = 0; index < String(value).length; index += 1) {
      hash = ((hash << 5) - hash + String(value).charCodeAt(index)) | 0;
    }
    return hash;
  }

  function initialClipPolygon(radius) {
    const r = Math.max(1, radius);
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      return Array.from({ length: VIEWPORT_DISK_POLYGON_SEGMENTS }, (_, index) => {
        const theta = (Math.PI * 2 * index) / VIEWPORT_DISK_POLYGON_SEGMENTS;
        return [r * Math.cos(theta), r * Math.sin(theta)];
      });
    }
    return [[-r, -r], [r, -r], [r, r], [-r, r]];
  }

  function viewportPointInside(point, radius = state.viewport.boxRadius, shape = state.viewport.boundShape) {
    const tolerance = sliceTolerance();
    const x = point?.[0] || 0;
    const y = point?.[1] || 0;
    if (normalizeViewportBoundShape(shape) === "disk") {
      return x * x + y * y <= radius * radius + tolerance;
    }
    return Math.abs(x) <= radius + tolerance && Math.abs(y) <= radius + tolerance;
  }

  function maxLinearValueOnViewportBound(a, b, c, radius = state.viewport.boxRadius) {
    if (normalizeViewportBoundShape(state.viewport.boundShape) === "disk") {
      return Math.hypot(a, b) * radius - c;
    }
    return Math.abs(a) * radius + Math.abs(b) * radius - c;
  }

  function maxLinearValueOnPolygon(polygon, a, b, c) {
    if (!polygon.length) return -Infinity;
    return Math.max(...polygon.map((point) => a * (point[0] || 0) + b * (point[1] || 0) - c));
  }

  function sliceClipRadiusForObject(object) {
    const data = object.data || {};
    const type = objectTypeKey(object);
    if (type === "formula-set" || type === "tropical-polynomial" || type === "weyl-chambers" || type === "voronoi-diagram") return formulaClipRadius(object);
    const size = type === "sphere"
      ? positiveNumber(data.radius, 1)
      : positiveNumber(data.scale, 1);
    return Math.max(state.viewport.boxRadius, norm(state.p) + size * Math.sqrt(state.ambientDim) + 2, 8);
  }

  function clipPolygonByHalfPlane(polygon, a, b, c) {
    const output = [];
    const tolerance = sliceTolerance();
    const value = (point) => a * point[0] + b * point[1] - c;
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const currentValue = value(current);
      const nextValue = value(next);
      const currentInside = currentValue <= tolerance;
      const nextInside = nextValue <= tolerance;
      if (currentInside && nextInside) {
        output.push(next);
      } else if (currentInside && !nextInside) {
        output.push(intersectionPoint(current, next, currentValue, nextValue));
      } else if (!currentInside && nextInside) {
        output.push(intersectionPoint(current, next, currentValue, nextValue));
        output.push(next);
      }
    }
    return cleanPolygon(output);
  }

  function intersectionPoint(current, next, currentValue, nextValue) {
    const denominator = currentValue - nextValue;
    if (Math.abs(denominator) <= 1e-12) return current.slice();
    const t = currentValue / denominator;
    return [
      current[0] + t * (next[0] - current[0]),
      current[1] + t * (next[1] - current[1]),
    ];
  }

  function cleanPolygon(points) {
    const cleaned = [];
    for (const point of points) {
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
      if (!cleaned.length || distanceSq2(cleaned[cleaned.length - 1], point) > sliceTolerance() ** 2) {
        cleaned.push(point);
      }
    }
    if (cleaned.length > 1 && distanceSq2(cleaned[0], cleaned[cleaned.length - 1]) <= sliceTolerance() ** 2) {
      cleaned.pop();
    }
    return cleaned;
  }

  function uniquePoints(points) {
    const unique = [];
    for (const point of points) {
      if (!unique.some((candidate) => distanceSq2(candidate, point) <= sliceTolerance() ** 2)) unique.push(point);
    }
    return unique;
  }

  function farthestPair(points) {
    if (points.length <= 2) return points;
    let best = [points[0], points[1]];
    let bestDistance = distanceSq2(points[0], points[1]);
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const distance = distanceSq2(points[i], points[j]);
        if (distance > bestDistance) {
          best = [points[i], points[j]];
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      area += current[0] * next[1] - next[0] * current[1];
    }
    return area / 2;
  }

  function polygonCentroid(points) {
    const area = polygonArea(points);
    if (Math.abs(area) <= sliceTolerance()) {
      const total = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
      return points.length ? [total[0] / points.length, total[1] / points.length] : [0, 0];
    }
    let x = 0;
    let y = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const cross = current[0] * next[1] - next[0] * current[1];
      x += (current[0] + next[0]) * cross;
      y += (current[1] + next[1]) * cross;
    }
    return [x / (6 * area), y / (6 * area)];
  }

  function distanceSq2(a, b) {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  }

  function sliceTolerance() {
    return Math.max(1e-9, finiteNumber(state.viewport.tolerance, 0.0001));
  }

  function sliceVertex(y) {
    return {
      y: y.slice(0, 2),
      ambient: ambientFromFrameCoords(y),
    };
  }

  function ambientFromFrameCoords(y) {
    const result = resizeVector(state.p, state.ambientDim);
    for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
      for (let coordinate = 0; coordinate < state.ambientDim; coordinate += 1) {
        result[coordinate] += (y[frameIndex] || 0) * (state.frame[frameIndex][coordinate] || 0);
      }
    }
    return result;
  }

  function frameCoordsForAmbient(point) {
    const ambient = resizeVector(point, state.ambientDim);
    const centered = ambient.map((value, index) => value - state.p[index]);
    return [
      dot(centered, state.frame[0] || []),
      dot(centered, state.frame[1] || []),
    ];
  }

  function projectFramePoint(y, view) {
    return {
      ...projectY([y[0] || 0, y[1] || 0, 0], view),
      ambient: ambientFromFrameCoords(y),
      frameCoords: [y[0] || 0, y[1] || 0],
    };
  }

  function drawableData(object) {
    const data = object.data || {};
    const type = data.objectType || (object.kind === "sphere" || data.kind === "sphere" ? "sphere" : "geometry");
    if (type === "sphere") {
      if (state.sliceDim === 2) return { points: [], edges: [], rays: [], circles: 1 };
      return {
        points: sphereSamples(
          resizeVector(data.center || [], state.ambientDim),
          positiveNumber(data.radius, 1),
          160
        ),
        edges: [],
        rays: [],
      };
    }
    if (type === "point") {
      return {
        points: [finiteVector(data.position, state.ambientDim)],
        edges: [],
        rays: [],
      };
    }
    if (type === "vector") {
      const vector = finiteVector(data.vector, state.ambientDim);
      return {
        points: [],
        edges: [],
        rays: [{
          origin: Array(state.ambientDim).fill(0),
          direction: vector,
          length: norm(vector),
          label: data.label || "v",
        }],
      };
    }
    if (type === "matrix") {
      const rows = normalizedMatrixRows(data.matrixRows, state.ambientDim);
      const labels = matrixColumnLabels(data, "v", state.ambientDim);
      return {
        points: [],
        edges: [],
        rays: Array.from({ length: state.ambientDim }, (_, index) => {
          const vector = matrixColumnFromRows(rows, index, state.ambientDim);
          return {
            origin: Array(state.ambientDim).fill(0),
            direction: vector,
            length: norm(vector),
            label: labels[index] || `v_${index + 1}`,
          };
        }),
      };
    }
    if (type === "root-set") {
      return rootSetProjectionData(object);
    }
    if (type === "lattice") {
      const lattice = latticeProjectionData(object);
      return {
        points: lattice.points,
        pointMetadata: lattice.pointMetadata,
        edges: [],
        rays: lattice.rays,
        lattice,
      };
    }
    if (type === "voronoi-diagram") {
      const voronoiProjection = voronoiProjectionData(object);
      return {
        points: voronoiProjection.points,
        edges: voronoiProjection.edges,
        rays: [],
        voronoiProjection,
      };
    }
    if (type === "toric-cone") {
      const analysis = toricConeAnalysis(object);
      const entries = toricProjectionEntries(object, analysis).filter((entry) => entry.numeric && entry.numeric.some((value) => Math.abs(value) > 1e-12));
      return {
        points: [],
        edges: [],
        rays: entries.map((entry) => ({
          origin: Array(state.ambientDim).fill(0),
          direction: entry.numeric,
          length: state.viewport.boxRadius,
          label: entry.label,
        })),
      };
    }
    if (type === "cartesian-frame") {
      const origin = resizeVector(data.origin || [], state.ambientDim);
      const basis = data.basis === "moving" ? "moving" : "ambient";
      const lengthValue = positiveNumber(data.length, 4);
      return {
        points: [],
        edges: [],
        rays: Array.from({ length: state.ambientDim }, (_, index) => ({
          origin,
          direction: basis === "moving"
            ? resizeVector(state.frame[index] || [], state.ambientDim)
            : Array.from({ length: state.ambientDim }, (_, coordinate) => (coordinate === index ? 1 : 0)),
          length: lengthValue,
          label: basis === "moving" ? `v_${index + 1}` : `e_${index + 1}`,
        })),
      };
    }
    if (type === "formula-set" || type === "tropical-polynomial" || type === "weyl-chambers" || type === "dynkin-type") {
      return { points: [], edges: [], rays: [] };
    }
    if (type === "regular-polytope") {
      const geometry = regularPolytopeGeometry(data, state.ambientDim);
      const size = positiveNumber(data.scale, 1);
      return {
        points: geometry.points.map((point) => scale(point, size)),
        edges: geometry.edges,
        rays: [],
      };
    }

    const points = Array.isArray(data.points)
      ? data.points.map((point) => resizeVector(point.map((value) => finiteNumber(value, 0)), state.ambientDim))
      : [];
    const scaledPoints = (type === "cube" || type === "simplex")
      ? points.map((point) => scale(point, positiveNumber(data.scale, 1)))
      : points;
    const edges = Array.isArray(data.edges)
      ? data.edges
          .filter((edge) => Array.isArray(edge) && edge.length >= 2)
          .map((edge) => [Math.round(finiteNumber(edge[0], 0)), Math.round(finiteNumber(edge[1], 0))])
      : [];
    const origin = resizeVector(data.origin || [], state.ambientDim);
    const rays = Array.isArray(data.rays)
      ? data.rays.map((ray) => {
          if (Array.isArray(ray)) {
            return { origin, direction: resizeVector(ray.map((value) => finiteNumber(value, 0)), state.ambientDim) };
          }
          return {
            origin: resizeVector((ray.origin || origin).map((value) => finiteNumber(value, 0)), state.ambientDim),
            direction: resizeVector((ray.direction || []).map((value) => finiteNumber(value, 0)), state.ambientDim),
            length: finiteNumber(ray.length, state.viewport.boxRadius),
            label: ray.label,
          };
        })
      : [];
    return { points: scaledPoints, edges, rays };
  }

  function sphereSamples(center, radius, count) {
    const points = [];
    for (let index = 0; index < count; index += 1) {
      let vector = [];
      let seed = index + 1;
      for (let coordinate = 0; coordinate < state.ambientDim; coordinate += 1) {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        const u1 = (seed + 1) / 4294967297;
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        const u2 = (seed + 1) / 4294967297;
        vector.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2));
      }
      vector = normalize(vector).map((value, coordinate) => center[coordinate] + radius * value);
      points.push(vector);
    }
    return points;
  }

  function projectAmbient(point, view) {
    const ambient = resizeVector(point, state.ambientDim);
    const centered = ambient.map((value, index) => value - state.p[index]);
    const frameCoords = [];
    for (let index = 0; index < Math.min(3, state.sliceDim); index += 1) {
      frameCoords.push(dot(centered, state.frame[index]));
    }
    while (frameCoords.length < 3) frameCoords.push(0);
    return {
      ...projectY(frameCoords, view),
      ambient,
      frameCoords,
    };
  }

  function projectY(y, view) {
    const z = state.sliceDim === 3 ? y[2] : 0;
    const distance = Math.max(0.5, state.viewport.cameraDistance);
    const perspective = state.sliceDim === 3 ? distance / (distance + 0.12 * z) : 1;
    return {
      x: view.centerX + y[0] * view.scale * perspective,
      y: view.centerY - y[1] * view.scale * perspective,
      z,
    };
  }

  function drawSphereGuide(ctx, view) {
    const activeCenter = [];
    let pNormSq = dot(state.p, state.p);
    let activeSq = 0;
    for (let index = 0; index < state.sliceDim; index += 1) {
      const coordinate = dot(state.p, state.frame[index]);
      activeCenter.push(-coordinate);
      activeSq += coordinate * coordinate;
    }
    const perpSq = Math.max(0, pNormSq - activeSq);
    const radiusSq = 1 - perpSq;

    ctx.save();
    ctx.strokeStyle = radiusSq >= 0 ? "rgba(138, 79, 159, 0.85)" : "rgba(176, 88, 53, 0.75)";
    ctx.lineWidth = 2 * view.ratio;
    ctx.setLineDash([7 * view.ratio, 5 * view.ratio]);
    if (radiusSq >= 0) {
      const center = projectY([activeCenter[0] || 0, activeCenter[1] || 0, activeCenter[2] || 0], view);
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.sqrt(radiusSq) * view.scale, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const size = 18 * view.ratio;
      line(ctx, view.centerX - size, view.centerY - size, view.centerX + size, view.centerY + size);
      line(ctx, view.centerX + size, view.centerY - size, view.centerX - size, view.centerY + size);
    }
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawPoint(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawArrowHead(ctx, start, end, size) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    if (!Number.isFinite(angle) || (Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) < 1e-6) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function recordPickCandidate(object, projected, label, vertexKey, radius, metadata = null) {
    if (projected.frameCoords && !viewportPointInside(projected.frameCoords, state.viewport.boxRadius)) return;
    const pointMetadata = metadata && typeof metadata === "object" ? metadata : null;
    state.pickCandidates.push({
      objectId: object.id,
      objectName: object.name,
      label,
      vertexKey,
      ambient: projected.ambient.slice(),
      frameCoords: projected.frameCoords.slice(0, state.sliceDim),
      x: projected.x,
      y: projected.y,
      radius,
      latticePoint: pointMetadata?.lattice === true,
      latticeCoefficients: Array.isArray(pointMetadata?.coeffs) ? pointMetadata.coeffs.slice() : null,
      toricGeneratorId: pointMetadata?.toricGeneratorId || null,
      toricFaceKey: pointMetadata?.toricFaceKey || null,
    });
  }

  function recordTropicalDistrictCandidate(object, district, projectedPolygon, display) {
    state.tropicalDistrictPickCandidates.push({
      objectId: object.id,
      objectName: object.name,
      districtKey: district.key,
      label: display?.plain || district.label || district.key,
      ambient: (district.ambient || ambientFromFrameCoords(district.anchor || [0, 0])).slice(),
      frameCoords: (district.anchor || [0, 0]).slice(0, 2),
      area: district.area,
      polygon: projectedPolygon.map((point) => [point.x, point.y]),
    });
  }

  function recordWeylChamberCandidate(object, chamber, projectedPolygon) {
    const fallbackWord = chamber.word?.length ? chamber.word.map((index) => `s${index}`).join("") : "e";
    state.weylChamberPickCandidates.push({
      objectId: object.id,
      objectName: object.name,
      chamberKey: chamber.key,
      label: chamber.display?.plain || fallbackWord || chamber.key,
      ambient: chamber.ambient.slice(),
      word: Array.isArray(chamber.word) ? chamber.word.slice() : [],
      frameCoords: chamber.anchor.slice(0, 2),
      length: chamber.length,
      area: chamber.area,
      polygon: projectedPolygon.map((point) => [point.x, point.y]),
    });
  }

  function recordToricConeCandidate(object, slice, projected, view) {
    if (!projected.length) return;
    const kind = slice.kind;
    const frameVertices = kind === "point"
      ? [slice.point?.y?.slice(0, 2) || [0, 0]]
      : (slice.vertices || []).map((vertex) => vertex.y.slice(0, 2));
    state.toricConePickCandidates.push({
      objectId: object.id,
      objectName: object.name,
      kind,
      polygon: projected.map((point) => [point.x, point.y]),
      frameVertices,
      area: kind === "polygon" ? Math.abs(polygonArea(frameVertices)) : 0,
      view: { centerX: view.centerX, centerY: view.centerY, scale: view.scale },
      boundShape: state.viewport.boundShape,
      boundRadius: state.viewport.boxRadius,
      analysis: slice.analysis,
    });
  }

  function currentSelectedCandidate() {
    if (!state.selectedVertex) return null;
    return state.pickCandidates.find((candidate) =>
      candidate.objectId === state.selectedVertex.objectId &&
      candidate.vertexKey === state.selectedVertex.vertexKey
    ) || null;
  }

  function drawSelectedVertex(ctx, view) {
    const candidate = currentSelectedCandidate();
    if (!candidate) return;
    const radius = Math.max(candidate.radius + 6 * view.ratio, 10 * view.ratio);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255, 235, 142, 0.3)";
    ctx.strokeStyle = "rgba(189, 133, 24, 0.92)";
    ctx.lineWidth = 2 * view.ratio;
    ctx.beginPath();
    ctx.arc(candidate.x, candidate.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function canvasPointFromEvent(event) {
    const canvas = $("slice-viewport");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function nearestPickCandidate(x, y) {
    const ratio = window.devicePixelRatio || 1;
    let best = null;
    let bestDistanceSq = Infinity;
    for (const candidate of state.pickCandidates) {
      const dx = candidate.x - x;
      const dy = candidate.y - y;
      const distanceSq = dx * dx + dy * dy;
      const tolerance = Math.max(10 * ratio, candidate.radius + 7 * ratio);
      if (distanceSq <= tolerance * tolerance && distanceSq < bestDistanceSq) {
        best = candidate;
        bestDistanceSq = distanceSq;
      }
    }
    return best;
  }

  function nearestWeylChamberCandidate(x, y) {
    return nearestPolygonCandidate(state.weylChamberPickCandidates, x, y);
  }

  function nearestTropicalDistrictCandidate(x, y) {
    return nearestPolygonCandidate(state.tropicalDistrictPickCandidates, x, y);
  }

  function pointSegmentDistanceSq(point, start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 1e-12) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
    const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSq, 0, 1);
    const nearest = [start[0] + t * dx, start[1] + t * dy];
    return (point[0] - nearest[0]) ** 2 + (point[1] - nearest[1]) ** 2;
  }

  function toricConeCandidatesAt(x, y) {
    const tolerance = 9 * (window.devicePixelRatio || 1);
    return state.toricConePickCandidates.filter((candidate) => {
      const framePoint = [
        (x - candidate.view.centerX) / candidate.view.scale,
        (candidate.view.centerY - y) / candidate.view.scale,
      ];
      if (!viewportPointInside(framePoint, candidate.boundRadius, candidate.boundShape)) return false;
      if (candidate.kind === "polygon") return pointInPolygon([x, y], candidate.polygon);
      if (candidate.kind === "segment" && candidate.polygon.length >= 2) {
        return pointSegmentDistanceSq([x, y], candidate.polygon[0], candidate.polygon[1]) <= tolerance ** 2;
      }
      if (candidate.kind === "point" && candidate.polygon[0]) {
        return (x - candidate.polygon[0][0]) ** 2 + (y - candidate.polygon[0][1]) ** 2 <= tolerance ** 2;
      }
      return false;
    }).sort((left, right) => left.area - right.area || left.objectName.localeCompare(right.objectName));
  }

  function toricFaceKeyAtPoint(candidate, x, y) {
    const analysis = candidate.analysis;
    if (!analysis?.valid) return null;
    const view = candidate.view;
    const framePoint = [(x - view.centerX) / view.scale, (view.centerY - y) / view.scale];
    const ambient = ambientFromFrameCoords(framePoint);
    const activeFacets = (analysis.facets || []).filter((facet) => {
      const normal = facet.normalNumeric || [];
      const threshold = (7 / Math.max(view.scale, 1)) * Math.max(1, norm(normal));
      return Math.abs(dot(normal, ambient)) <= threshold;
    });
    if (!activeFacets.length) return analysis.selectedFaceDefault;
    let rayIds = (analysis.extremeRays || []).map((ray) => ray.id);
    activeFacets.forEach((facet) => { rayIds = rayIds.filter((id) => facet.rayIds.includes(id)); });
    const key = rayIds.length ? rayIds.slice().sort().join("|") : "0";
    return analysis.faces.some((face) => face.key === key) ? key : analysis.selectedFaceDefault;
  }

  function hideToricConePickMenu() {
    const menu = $("toric-cone-pick-menu");
    if (!menu) return;
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function activateToricConeCandidate(candidate, point, explicitFaceKey = null) {
    const object = state.objects.find((item) => item.id === candidate.objectId);
    if (!object || objectTypeKey(object) !== "toric-cone") return;
    const analysis = candidate.analysis || toricConeAnalysis(object);
    const faceKey = explicitFaceKey || toricFaceKeyAtPoint(candidate, point.x, point.y) || analysis?.selectedFaceDefault || "0";
    state.activeObjectId = object.id;
    state.sourceMode = "modify";
    state.selectedVertex = null;
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.activeToricFace = { objectId: object.id, faceKey };
    state.toricTab = faceKey === analysis?.selectedFaceDefault ? "variety" : "faces";
    const face = analysis?.faces?.find((entry) => entry.key === faceKey);
    state.lastWarning = face
      ? `Picked ${object.name} / ${toricFaceLabel(face)}; orbit dimension ${face.orbitDimension}.`
      : `Picked ${object.name}.`;
    hideToricConePickMenu();
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    openCardByLabel("Toric Cone");
    renderAll();
  }

  function showToricConePickMenu(event, candidates, point) {
    const menu = $("toric-cone-pick-menu");
    const stage = menu?.parentElement;
    if (!menu || !stage) return;
    menu.innerHTML = "";
    candidates.forEach((candidate) => {
      const object = state.objects.find((item) => item.id === candidate.objectId);
      if (!object) return;
      const button = document.createElement("button");
      button.className = "slice-btn";
      button.type = "button";
      button.role = "menuitem";
      const faceKey = toricFaceKeyAtPoint(candidate, point.x, point.y);
      const face = candidate.analysis?.faces?.find((entry) => entry.key === faceKey);
      button.textContent = face ? `${object.name} / ${toricFaceLabel(face)}` : object.name;
      button.addEventListener("click", () => activateToricConeCandidate(candidate, point, faceKey));
      menu.append(button);
    });
    const rect = stage.getBoundingClientRect();
    const left = clamp(event.clientX - rect.left + 8, 8, Math.max(8, rect.width - 260));
    const top = clamp(event.clientY - rect.top + 8, 8, Math.max(8, rect.height - 180));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.hidden = false;
  }

  function nearestPolygonCandidate(candidates, x, y) {
    let best = null;
    let bestArea = Infinity;
    for (const candidate of candidates) {
      if (!pointInPolygon([x, y], candidate.polygon)) continue;
      if (candidate.area < bestArea) {
        best = candidate;
        bestArea = candidate.area;
      }
    }
    return best;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const current = polygon[index];
      const last = polygon[previous];
      const intersects = ((current[1] > point[1]) !== (last[1] > point[1]))
        && point[0] < ((last[0] - current[0]) * (point[1] - current[1])) / ((last[1] - current[1]) || 1e-12) + current[0];
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function handleCanvasClick(event) {
    const point = canvasPointFromEvent(event);
    const candidate = nearestPickCandidate(point.x, point.y);
    if (state.activeVectorTarget) {
      if (candidate) {
        commitVectorTargetValue(state.activeVectorTarget, candidate.ambient, `${candidate.objectName} / ${candidate.label}`, candidate.label);
        return;
      }
      state.lastWarning = `No pickable point for ${state.activeVectorTarget.objectName} / ${state.activeVectorTarget.slotLabel}.`;
      renderAll();
      return;
    }
    if (candidate) {
      const pickedObject = state.objects.find((object) => object.id === candidate.objectId);
      if (objectTypeKey(pickedObject) === "toric-cone") {
        const overlappingCones = toricConeCandidatesAt(point.x, point.y);
        if (overlappingCones.length > 1) {
          showToricConePickMenu(event, overlappingCones, point);
          return;
        }
        const analysis = toricConeAnalysis(pickedObject);
        const region = overlappingCones[0] || state.toricConePickCandidates.find((entry) => entry.objectId === pickedObject.id);
        activateToricConeCandidate(region || {
          objectId: pickedObject.id,
          objectName: pickedObject.name,
          analysis,
          view: { centerX: point.x, centerY: point.y, scale: 1 },
        }, point, candidate.toricFaceKey || analysis?.selectedFaceDefault || "0");
        return;
      }
      state.selectedVertex = {
        objectId: candidate.objectId,
        vertexKey: candidate.vertexKey,
      };
      state.activeObjectId = candidate.objectId;
      state.sourceMode = "modify";
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      const pickStatus = pickedCandidateStatusDisplay(candidate);
      state.lastWarning = pickStatus?.plain || `Picked ${candidate.objectName} / ${candidate.label}.`;
      state.lastWarningMath = pickStatus || null;
      if (isDynkinLatticePickCandidate(candidate)) openCardByLabel("weight info in 2d slice");
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
      return;
    }
    const toricCandidates = toricConeCandidatesAt(point.x, point.y);
    if (toricCandidates.length === 1) {
      activateToricConeCandidate(toricCandidates[0], point);
      return;
    }
    if (toricCandidates.length > 1) {
      showToricConePickMenu(event, toricCandidates, point);
      return;
    }
    hideToricConePickMenu();
    const district = nearestTropicalDistrictCandidate(point.x, point.y);
    if (district) {
      state.selectedVertex = null;
      state.activeTropicalDistrict = {
        objectId: district.objectId,
        districtKey: district.districtKey,
      };
      clearWeylInteraction();
      state.activeObjectId = district.objectId;
      state.sourceMode = "modify";
      state.lastWarning = `Picked ${district.objectName} / ${district.label}  x=${vectorToInline(district.ambient)}  y=${vectorToInline(district.frameCoords)}.`;
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
      return;
    }
    const chamber = nearestWeylChamberCandidate(point.x, point.y);
    if (chamber) {
      state.selectedVertex = null;
      state.activeTropicalDistrict = null;
      state.activeWeylChamber = {
        objectId: chamber.objectId,
        chamberKey: chamber.chamberKey,
      };
      state.weylKlTargetChamber = {
        objectId: chamber.objectId,
        chamberKey: chamber.chamberKey,
        word: Array.isArray(chamber.word) ? chamber.word.slice() : [],
        length: chamber.length,
      };
      state.activeObjectId = chamber.objectId;
      state.sourceMode = "modify";
      const chamberObject = state.objects.find((object) => object.id === chamber.objectId);
      let targetDisplay = chamber.label;
      if (chamberObject && objectTypeKey(chamberObject) === "weyl-chambers") {
        const data = normalizeWeylChambersData(chamberObject.data || {}, state.ambientDim);
        const system = weylRootSystem(data.dynkinType, state.ambientDim);
        targetDisplay = weylElementDisplay(system, weylElementFromAmbient(system, chamber.ambient), data.weylElementDisplayMode).plain;
      }
      state.lastWarning = `Picked ${chamber.objectName} / KL target x=${targetDisplay}${Number.isFinite(chamber.length) ? `, length ${chamber.length}` : ""}  ambient=${vectorToInline(chamber.ambient)}  y=${vectorToInline(chamber.frameCoords)}.`;
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
      return;
    }
    if (!candidate) {
      state.selectedVertex = null;
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.lastWarning = "No projected vertex selected.";
      renderAll();
      return;
    }
  }

  function handleCanvasPointerMove(event) {
    const point = canvasPointFromEvent(event);
    const vertex = nearestPickCandidate(point.x, point.y);
    if (state.activeVectorTarget) {
      $("slice-viewport").style.cursor = vertex ? "pointer" : "crosshair";
      return;
    }
    const district = vertex ? null : nearestTropicalDistrictCandidate(point.x, point.y);
    const toric = vertex || district ? [] : toricConeCandidatesAt(point.x, point.y);
    const chamber = vertex || district || toric.length ? null : nearestWeylChamberCandidate(point.x, point.y);
    $("slice-viewport").style.cursor = vertex || district || toric.length || chamber ? "pointer" : "default";
    const nextTropicalActive = district
      ? { objectId: district.objectId, districtKey: district.districtKey }
      : null;
    const previousTropical = state.activeTropicalDistrict;
    const tropicalChanged = (previousTropical?.objectId || "") !== (nextTropicalActive?.objectId || "")
      || (previousTropical?.districtKey || "") !== (nextTropicalActive?.districtKey || "");
    const nextWeylActive = chamber
      ? { objectId: chamber.objectId, chamberKey: chamber.chamberKey }
      : null;
    const previous = state.activeWeylChamber;
    const weylChanged = (previous?.objectId || "") !== (nextWeylActive?.objectId || "")
      || (previous?.chamberKey || "") !== (nextWeylActive?.chamberKey || "");
    let shouldRender = false;
    if (tropicalChanged) {
      state.activeTropicalDistrict = nextTropicalActive;
      const touchedObjectId = nextTropicalActive?.objectId || previousTropical?.objectId;
      shouldRender = shouldRender || state.objects.some((object) =>
        object.id === touchedObjectId && object.data?.tropicalDistrictLabelDensity === "active"
      );
    }
    if (weylChanged) {
      state.activeWeylChamber = nextWeylActive;
      const touchedObjectId = nextWeylActive?.objectId || previous?.objectId;
      if (state.objects.some((object) => object.id === touchedObjectId && (object.data?.weylLabelDensity === "active" || isWeylKlLabelMode(object.data?.weylLabelMode)))) {
        shouldRender = true;
      }
    }
    if (shouldRender) renderAll();
  }

  function vectorToInline(vector, digits = 3) {
    return `[${vector.map((value) => fmt(value, digits)).join(", ")}]`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function texText(value) {
    return String(value)
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[{}_$%&#]/g, (char) => `\\${char}`)
      .replace(/\^/g, "\\textasciicircum{}");
  }

  function vectorToTex(vector, digits = 3) {
    return `\\left[${vector.map((value) => fmt(value, digits)).join(", ")}\\right]`;
  }

  function labelToTex(label) {
    const text = String(label || "").trim();
    const greekIndexed = text.match(/^(alpha|omega)_?(\d+)$/i);
    if (greekIndexed) {
      const symbol = greekIndexed[1].toLowerCase() === "alpha"
        ? "\\alpha"
        : "\\omega";
      return `${symbol}_{${greekIndexed[2]}}`;
    }
    const indexed = text.match(/^(rho|[beuvxys])_?(\d+)$/i);
    if (indexed) {
      const symbol = indexed[1].toLowerCase() === "rho" ? "\\rho" : indexed[1];
      return `${symbol}_{${indexed[2]}}`;
    }
    const powered = text.match(/^([ux])_?(\d+)\^(\d+)$/i);
    if (powered) return `${powered[1].toLowerCase()}_{${powered[2]}}^{${powered[3]}}`;
    if (/^\d+$/.test(text)) return text;
    if (text === "origin" || text === "center" || text === "slice center" || text === "slice tangent") {
      return `\\mathrm{${text.replace(/\s+/g, "\\ ")}}`;
    }
    return `\\text{${texText(text)}}`;
  }

  function setMathText(element, plain, tex, options = {}) {
    if (!element) return;
    const display = options.display === true;
    element.classList.add("slice-math");
    element.dataset.mathPlain = String(plain ?? "");
    element.dataset.mathTex = display ? `\\[${tex}\\]` : `\\(${tex}\\)`;
    element.textContent = String(plain ?? "");
  }

  function queueMathTypeset() {
    const nodes = Array.from(document.querySelectorAll(".slice-math"));
    if (!nodes.length) return;
    if (!window.MathJax?.typesetPromise) {
      nodes.forEach((node) => {
        if (node.dataset.mathPlain != null) node.textContent = node.dataset.mathPlain;
      });
      return;
    }
    mathTypesetDirty = true;
    if (mathTypesetQueued) return;
    mathTypesetQueued = true;
    const run = () => {
      mathTypesetDirty = false;
      const targets = Array.from(document.querySelectorAll(".slice-math"));
      if (window.MathJax?.typesetClear) window.MathJax.typesetClear(targets);
      targets.forEach((node) => {
        if (node.dataset.mathTex) node.innerHTML = node.dataset.mathTex;
      });
      window.MathJax.typesetPromise(targets)
        .catch(() => {})
        .finally(() => {
          mathTypesetQueued = false;
          if (mathTypesetDirty) queueMathTypeset();
        });
    };
    if (window.MathJax.startup?.promise) {
      window.MathJax.startup.promise.then(run).catch(() => { mathTypesetQueued = false; });
    } else {
      Promise.resolve().then(run);
    }
  }

  function addCanvasMathLabel(view, projected, plain, tex, options = {}) {
    const overlay = $("slice-label-overlay");
    if (!overlay || !projected || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return;
    if (projected.frameCoords && !viewportPointInside(projected.frameCoords, state.viewport.boxRadius)) return;
    const label = document.createElement("span");
    label.className = "slice-canvas-label";
    if (options.centered) label.classList.add("centered");
    if (options.color) label.style.color = options.color;
    const offsetX = finiteNumber(options.offsetX, 0);
    const offsetY = finiteNumber(options.offsetY, 0);
    label.style.left = `${projected.x / view.ratio + offsetX}px`;
    label.style.top = `${projected.y / view.ratio + offsetY}px`;
    setMathText(label, plain, tex);
    overlay.append(label);
  }

  function clearCanvasMathLabels() {
    const overlay = $("slice-label-overlay");
    if (!overlay) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([overlay]);
    overlay.innerHTML = "";
  }

  function matrixToTex(rows, options = {}) {
    const rowLabels = options.rowLabels || [];
    const colLabels = options.colLabels || [];
    const hasLabels = rowLabels.length || colLabels.length;
    const columnCount = rows[0]?.length || colLabels.length || 1;
    const spec = hasLabels ? `c|${"r".repeat(columnCount)}` : "r".repeat(columnCount);
    const lines = [];
    if (colLabels.length) {
      lines.push(["", ...colLabels.map(labelToTex)].join(" & "));
      lines.push("\\hline");
    }
    rows.forEach((row, rowIndex) => {
      const entries = row.map((value) => fmt(value, 4));
      lines.push(rowLabels[rowIndex] ? [labelToTex(rowLabels[rowIndex]), ...entries].join(" & ") : entries.join(" & "));
    });
    return `\\begin{array}{${spec}}${lines.join(" \\\\ ")}\\end{array}`;
  }

  function frameState() {
    return {
      ambientDimension: state.ambientDim,
      frameDimension: state.sliceDim,
      position: state.p,
      activeFrame: state.frame.slice(0, state.sliceDim),
      formula: $("affine-formula").dataset.mathPlain || $("affine-formula").textContent,
    };
  }

  function fullState() {
    return {
      version: 1,
      module: "higher-dimensional-slice-explorer",
      activeModeTitle: "Projection / exact+numeric 2D slice",
      ambientDimension: state.ambientDim,
      frameDimension: state.sliceDim,
      slideInputMode: state.slideInputMode,
      directInputMode: state.directInputMode,
      activeDirection: state.activeDirection,
      motionMode: state.motionMode,
      translationSpeed: state.translationSpeed,
      rotationSpeed: state.rotationSpeed,
      translationStep: state.translationStep,
      rotationStep: state.rotationStep,
      rotationPair: state.rotationPair,
      autoSchmidt: state.autoSchmidt,
      position: state.p,
      frame: state.frame,
      viewport: state.viewport,
      addType: state.addType,
      addRegularFamily: state.addRegularFamily,
      addWeylDynkinType: state.addWeylDynkinType,
      addWeylDynkinSourceId: state.addWeylDynkinSourceId,
      addMatrixVariant: state.addMatrixVariant,
      addLatticeVariant: state.addLatticeVariant,
      addVoronoiLatticeSourceId: state.addVoronoiLatticeSourceId,
      addToricPreset: state.addToricPreset,
      activeObjectId: state.activeObjectId,
      objects: state.objects.map(serializableObject),
    };
  }

  async function copyText(text, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      state.lastWarning = message;
    } catch (error) {
      state.lastWarning = `Copy failed: ${error.message}`;
    }
    renderAll();
  }

  function downloadState() {
    const blob = new Blob([JSON.stringify(fullState(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "higher_dimensional_slice_calculator_state.json";
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
    state.lastWarning = "State JSON download started.";
    renderAll();
  }

  function objectExportPayload(object) {
    return {
      version: 1,
      kind: "slice-explorer-object",
      object: serializableObject(object),
    };
  }

  function exportActiveObjectToImport() {
    const object = activeObject();
    if (!object) return;
    $("import-state").value = JSON.stringify(objectExportPayload(object), null, 2);
    openCardByLabel("Import / Export");
    state.lastWarning = "Active object JSON exported to Import / Export.";
    renderAll();
  }

  function openCardByLabel(label) {
    const cards = Array.from(document.querySelectorAll(".card"));
    const card = cards.find((item) => item.querySelector(".card-head-label")?.textContent.trim() === label);
    if (!card) return;
    if (window.CalculatorCards) window.CalculatorCards.openCard(card);
    else {
      card.classList.remove("collapsed");
      const head = card.querySelector(".card-head");
      if (head) head.setAttribute("aria-expanded", "true");
    }
  }

  function importState() {
    try {
      const imported = JSON.parse($("import-state").value || "{}");
      if (imported.kind === "slice-explorer-object") {
        throw new Error("Use object import buttons for exported object JSON.");
      }
      state.ambientDim = clamp(Math.round(finiteNumber(imported.ambientDimension, 4)), 2, 8);
      state.sliceDim = 2;
      state.slideInputMode = normalizeSlideInputMode(imported.slideInputMode);
      state.directInputMode = normalizeDirectInputMode(imported.directInputMode);
      state.activeDirection = normalizeDirection(imported.activeDirection, state.ambientDim);
      state.motionMode = imported.motionMode === "discrete" ? "discrete" : "continuous";
      state.translationSpeed = finiteNumber(imported.translationSpeed, MOTION_DEFAULTS.translationSpeed);
      state.rotationSpeed = finiteNumber(imported.rotationSpeed, MOTION_DEFAULTS.rotationSpeed);
      state.translationStep = finiteNumber(imported.translationStep ?? imported.moveStep, MOTION_DEFAULTS.translationStep);
      state.rotationStep = finiteNumber(imported.rotationStep ?? imported.rotationAngleDeg, MOTION_DEFAULTS.rotationStep);
      state.rotationPair = normalizeRotationPair(imported.rotationPair, state.ambientDim);
      state.autoSchmidt = imported.autoSchmidt !== false;
      state.p = resizeVector(Array.isArray(imported.position) ? imported.position.map((value) => finiteNumber(value, 0)) : [], state.ambientDim);
      state.frame = Array.isArray(imported.frame) ? imported.frame.map((vector) => resizeVector(vector.map((value) => finiteNumber(value, 0)), state.ambientDim)) : identityFrame(state.ambientDim);
      resizeFrame(state.frame, state.ambientDim);
      state.viewport = { ...state.viewport, ...(imported.viewport || {}) };
      state.viewport.boundShape = normalizeViewportBoundShape(state.viewport.boundShape);
      state.addType = OBJECT_TYPES.some((type) => type.key === imported.addType) ? imported.addType : "cartesian-frame";
      state.addRegularFamily = normalizeRegularFamily(imported.addRegularFamily || state.addRegularFamily || "hypercube", state.ambientDim);
      state.addWeylDynkinType = normalizeWeylDynkinType(imported.addWeylDynkinType || state.addWeylDynkinType || "A", state.ambientDim);
      state.addWeylDynkinSourceId = String(imported.addWeylDynkinSourceId || "");
      state.addMatrixVariant = String(imported.addMatrixVariant || "manual");
      state.addLatticeVariant = String(imported.addLatticeVariant || "matrix-input");
      state.addVoronoiLatticeSourceId = String(imported.addVoronoiLatticeSourceId || "");
      state.addToricPreset = normalizeToricPreset(imported.addToricPreset || "zero", state.ambientDim);
      clampMotionState();
      state.objects = Array.isArray(imported.objects) && imported.objects.length
        ? imported.objects.map((object) => normalizeImportedSourceObject(object, state.ambientDim))
        : [makeObjectForType("cartesian-frame")];
      refreshLinkedObjects();
      state.activeObjectId = imported.activeObjectId && state.objects.some((object) => object.id === imported.activeObjectId)
        ? imported.activeObjectId
        : state.objects[0].id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      invalidateToricAnalysis();
      state.lastWarning = "State JSON imported.";
      rebuildDynamicControls();
      refreshTypeLabels();
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
    } catch (error) {
      state.lastWarning = `Import failed: ${error.message}`;
      renderAll();
    }
  }

  function importObjectAsNew() {
    try {
      const object = parseObjectPayload($("import-state").value);
      object.id = `object-${objectCounter++}`;
      object.name = uniqueObjectName(object.name);
      object.data.name = object.name;
      state.objects.push(object);
      refreshLinkedObjects();
      state.activeObjectId = object.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      hideToricConePickMenu();
      state.lastWarning = "Object JSON imported as a new object.";
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
    } catch (error) {
      state.lastWarning = `Object import failed: ${error.message}`;
      renderAll();
    }
  }

  function replaceActiveObject() {
    try {
      const index = state.objects.findIndex((object) => object.id === state.activeObjectId);
      if (index < 0) throw new Error("No active object to replace.");
      const replacedObject = state.objects[index];
      const imported = parseObjectPayload($("import-state").value);
      imported.id = state.objects[index].id;
      state.objects[index] = imported;
      if (objectTypeKey(replacedObject) === "toric-cone" || objectTypeKey(imported) === "toric-cone") invalidateToricAnalysis();
      refreshLinkedObjects();
      state.activeObjectId = imported.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
      clearVectorTargetSession();
      state.activeTropicalDistrict = null;
      clearWeylInteraction();
      state.activeToricFace = null;
      hideToricConePickMenu();
      state.lastWarning = "Active object replaced from object JSON.";
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
    } catch (error) {
      state.lastWarning = `Object replace failed: ${error.message}`;
      renderAll();
    }
  }

  function uniqueObjectName(baseName) {
    const existing = new Set(state.objects.map((object) => object.name));
    if (!existing.has(baseName)) return baseName;
    let index = 2;
    while (existing.has(`${baseName} ${index}`)) index += 1;
    return `${baseName} ${index}`;
  }

  function resetToPreset() {
    state.ambientDim = 4;
    state.sliceDim = 2;
    state.slideInputMode = "move";
    state.directInputMode = "manual";
    state.activeDirection = defaultDirection(4);
    state.motionMode = "continuous";
    state.translationSpeed = MOTION_DEFAULTS.translationSpeed;
    state.rotationSpeed = MOTION_DEFAULTS.rotationSpeed;
    state.translationStep = MOTION_DEFAULTS.translationStep;
    state.rotationStep = MOTION_DEFAULTS.rotationStep;
    state.rotationPair = defaultRotationPair(4);
    state.autoSchmidt = true;
    state.p = [0, 0, 0, 0];
    state.frame = identityFrame(4);
    state.viewport = {
      zoom: 1,
      showAxes: true,
      showGrid: true,
      showLabels: false,
      showBox: true,
      boundShape: "box",
      cameraDistance: 3,
      boxRadius: 4,
      labelSize: DEFAULT_CANVAS_LABEL_SIZE_REM,
      exactSphereGuide: false,
      tolerance: 0.0001,
    };
    state.sourceMode = "modify";
    state.addType = "cartesian-frame";
    state.addRegularFamily = "hypercube";
    state.addWeylDynkinType = "A";
    state.addWeylDynkinSourceId = "";
    state.addMatrixVariant = "manual";
    state.addLatticeVariant = "matrix-input";
    state.addVoronoiLatticeSourceId = "";
    state.addToricPreset = "zero";
    state.selectedVertex = null;
    clearVectorTargetSession();
    state.activeTropicalDistrict = null;
    clearWeylInteraction();
    state.activeToricFace = null;
    state.toricTab = "build";
    state.toricConePickCandidates = [];
    invalidateToricAnalysis();
    state.pickCandidates = [];
    state.tropicalDistrictPickCandidates = [];
    state.weylChamberPickCandidates = [];
    clearAllMotion();
    state.objects = [makeObjectForType("cartesian-frame")];
    state.activeObjectId = state.objects[0].id;
    state.lastWarning = "Reset to the projection and exact/numeric 2D slice demo.";
    rebuildDynamicControls();
    refreshTypeLabels();
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    renderAll();
  }

  function init() {
    initToricAnalysisWorker();
    state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
    state.addWeylDynkinType = normalizeWeylDynkinType(state.addWeylDynkinType, state.ambientDim);
    state.addWeylDynkinSourceId = "";
    state.addMatrixVariant = "manual";
    state.addLatticeVariant = "matrix-input";
    state.addVoronoiLatticeSourceId = "";
    state.addToricPreset = "zero";
    state.objects = [makeObjectForType("cartesian-frame")];
    state.activeObjectId = state.objects[0].id;
    fillTypeSelect();
    rebuildDynamicControls();
    refreshTypeLabels();
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    syncStaticMathLabels();
    setupEventListeners();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resizeCanvas);
      observer.observe($("slice-viewport"));
    }
    resizeCanvas();
    renderAll();
  }

  window.SiteImportExportPageAdapter = {
    importKinds: [
      { value: "state", label: "Full calculator state" },
      { value: "object-new", label: "Object as new", replacesState: false },
      { value: "object-replace", label: "Replace active object" },
      { value: "frame", label: "Frame matrix" }
    ],
    exportDefault() {
      return {
        text: JSON.stringify(fullState(), null, 2),
        filename: "higher_dimensional_slice_calculator_state.json",
        mimeType: "application/json"
      };
    },
    exporters: {
      "active-object"() {
        const object = activeObject();
        if (!object) throw new Error("There is no active object to export.");
        return { text: JSON.stringify(objectExportPayload(object), null, 2), filename: "slice-explorer-object.json", mimeType: "application/json" };
      },
      position() {
        return { text: JSON.stringify(state.p), filename: "slice-position.json", mimeType: "application/json" };
      },
      frame() {
        return { text: directFrameRowsText(), filename: "slice-frame.txt", mimeType: "text/plain" };
      },
      "frame-json"() {
        return { text: JSON.stringify(frameState(), null, 2), filename: "slice-frame.json", mimeType: "application/json" };
      }
    },
    validateImport(kind, raw) {
      const text = String(raw?.text || "").trim();
      if (!text) throw new Error("Paste or choose data to import.");
      if (kind === "frame") return { text, rows: parseDirectMatrixRows(text) };
      const data = JSON.parse(text);
      if (kind === "state") {
        if (data.kind === "slice-explorer-object") throw new Error("Choose an object import action for object JSON.");
        if (data.module && data.module !== "higher-dimensional-slice-explorer") throw new Error("This is not a slice calculator state.");
      } else if (data.kind !== "slice-explorer-object" && !data.object && !data.objectType && !data.data?.objectType) {
        throw new Error("This is not a slice object export.");
      }
      return { text, data };
    },
    applyImport(kind, prepared) {
      if (kind === "frame") {
        applyDirectFrameRows(prepared.rows, null, "Imported frame matrix applied.");
        return;
      }
      $("import-state").value = prepared.text;
      if (kind === "state") importState();
      else if (kind === "object-new") importObjectAsNew();
      else replaceActiveObject();
    },
    hasMeaningfulState() {
      return state.objects.length > 1
        || state.objects[0]?.type !== "cartesian-frame"
        || state.p.some((value) => Math.abs(value) > 1e-12)
        || state.ambientDim !== 4;
    },
    filename(name) {
      if (name === "active-object") return "slice-explorer-object.json";
      if (name === "frame") return "slice-frame.txt";
      return "higher_dimensional_slice_calculator_state.json";
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
