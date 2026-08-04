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
    { key: "regular-polytope", label: "regular polytope in R^n", color: "#2f7d70", pointSize: 4, lineWidth: 2 },
    { key: "simplex", label: "simplex in R^n", color: "#5577aa", pointSize: 4, lineWidth: 2 },
    { key: "sphere", label: "sphere S^{n-1}", color: "#8a4f9f", pointSize: 3, lineWidth: 2 },
    { key: "cartesian-frame", label: "Cartesian frame", color: "#b05835", pointSize: 4, lineWidth: 3 },
    { key: "point", label: "point in R^n", color: "#c58a20", pointSize: 7, lineWidth: 2 },
    { key: "formula-set", label: "formula set", color: "#4f7fbd", pointSize: 4, lineWidth: 2 },
    { key: "tropical-polynomial", label: "tropical polynomial", color: "#2f6fb0", pointSize: 4, lineWidth: 2 },
  ];
  const EXACT_SLICE_TYPES = new Set(["regular-polytope", "cube", "simplex", "sphere", "formula-set", "tropical-polynomial"]);
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
  const regularGeometryCache = new Map();
  const regularHalfspaceCache = new Map();
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
      cameraDistance: 3,
      boxRadius: 4,
      exactSphereGuide: false,
      tolerance: 0.0001,
    },
    sourceMode: "modify",
    addType: "cartesian-frame",
    addRegularFamily: "hypercube",
    objects: [],
    activeObjectId: null,
    selectedVertex: null,
    pickCandidates: [],
    lastWarning: "Projection and exact/numeric 2D slice layers are active.",
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

  function tropicalCoefficientToken(value) {
    const text = formatTropicalCoefficient(value);
    return value < 0 ? `p^{${text}}` : `p^${text}`;
  }

  function tropicalMonomialLabel(exponent) {
    const parts = [];
    exponent.forEach((power, index) => {
      if (!power) return;
      parts.push(power === 1 ? `u${index + 1}` : `u${index + 1}^${power}`);
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
      const xMatch = text.slice(index).match(/^x_?\d+/i);
      if (xMatch) throw new Error(`Use u_i symbols for tropical monomials; "${xMatch[0]}" is not accepted here.`);
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
      const variableMatch = text.slice(index).match(/^u_?(\d+)/i);
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

  function compileTropicalPolynomial(rawInput, convention = "max", n = state.ambientDim) {
    const tropicalInput = String(rawInput || "").trim();
    if (!tropicalInput) throw new Error("Tropical polynomial is empty.");
    const tropicalConvention = normalizeTropicalConvention(convention);
    const terms = /^[\[{]/.test(tropicalInput)
      ? parseTropicalJsonTerms(tropicalInput, tropicalConvention, n)
      : normalizeTropicalTerms(splitTropicalTerms(tropicalInput).map((term) => parseTropicalTextTerm(term, n)), tropicalConvention, n);
    return {
      tropicalInput,
      tropicalConvention,
      terms,
      normalizedTropical: tropicalTermsToText(terms),
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
    return frameRows(columns)
      .map((row) => row.map((value) => fmt(value, 6)).join(", "))
      .join("\n");
  }

  function formatDirectInputValue(value) {
    return fmt(finiteNumber(value, 0), 6);
  }

  function directWheelInputValue(rawValue, fallback = 0) {
    const parsed = parseRationalNumber(rawValue);
    if (parsed.ok && Number.isFinite(parsed.value)) return parsed.value;
    return finiteNumber(rawValue, fallback);
  }

  function rebuildDirectPositionInputs() {
    const container = $("direct-position-inputs");
    if (!container) return;
    container.innerHTML = "";
    for (let index = 0; index < state.ambientDim; index += 1) {
      if (index > 0) container.append(document.createTextNode(", "));
      const input = document.createElement("input");
      input.className = "slice-input slice-coordinate-input";
      input.type = "text";
      input.inputMode = "decimal";
      input.value = formatDirectInputValue(state.p[index] || 0);
      input.dataset.directPositionIndex = String(index);
      input.setAttribute("aria-label", `Direct position coordinate p_${index + 1}`);
      input.addEventListener("focus", () => {
        input.dataset.originalValue = input.value;
      });
      input.addEventListener("change", () => commitDirectPositionInput(input, index));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDirectPositionInput(input, index);
          input.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          input.value = input.dataset.originalValue || formatDirectInputValue(state.p[index] || 0);
          input.blur();
        }
      });
      input.addEventListener("wheel", (event) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        const next = clamp(directWheelInputValue(input.value, state.p[index] || 0) + direction * 0.1, -6, 6);
        state.p = resizeVector(state.p, state.ambientDim);
        state.p[index] = next;
        input.value = formatDirectInputValue(next);
        input.dataset.originalValue = input.value;
        renderAll();
      }, { passive: false });
      container.append(input);
    }
  }

  function commitDirectPositionInput(input, index) {
    const parsed = parseRationalNumber(input.value);
    if (!parsed.ok || !Number.isFinite(parsed.value)) {
      state.lastWarning = `Direct position p_${index + 1} must be a finite rational value.`;
      input.value = input.dataset.originalValue || formatDirectInputValue(state.p[index] || 0);
      renderAll();
      return false;
    }
    state.p = resizeVector(state.p, state.ambientDim);
    state.p[index] = parsed.value;
    input.value = formatDirectInputValue(state.p[index]);
    input.dataset.originalValue = input.value;
    renderAll();
    return true;
  }

  function rebuildDirectFrameGrid() {
    const grid = $("direct-frame-grid");
    if (!grid) return;
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `32px repeat(${state.ambientDim}, 58px)`;
    const corner = document.createElement("span");
    corner.className = "slice-direct-matrix-label";
    corner.textContent = "";
    grid.append(corner);
    for (let col = 0; col < state.ambientDim; col += 1) {
      const label = document.createElement("span");
      label.className = "slice-direct-matrix-label";
      label.textContent = `v${col + 1}`;
      grid.append(label);
    }
    for (let row = 0; row < state.ambientDim; row += 1) {
      const rowLabel = document.createElement("span");
      rowLabel.className = "slice-direct-matrix-label";
      rowLabel.textContent = `e${row + 1}`;
      grid.append(rowLabel);
      for (let col = 0; col < state.ambientDim; col += 1) {
        const input = document.createElement("input");
        input.className = "slice-input slice-direct-matrix-cell";
        input.type = "text";
        input.inputMode = "decimal";
        input.value = formatDirectInputValue(state.frame[col]?.[row] || 0);
        input.dataset.directFrameRow = String(row);
        input.dataset.directFrameColumn = String(col);
        input.setAttribute("aria-label", `Frame entry e_${row + 1}, v_${col + 1}`);
        input.addEventListener("focus", () => {
          input.dataset.originalValue = input.value;
        });
        input.addEventListener("change", () => commitDirectFrameCell(input));
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDirectFrameCell(input);
            input.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            input.value = input.dataset.originalValue || formatDirectInputValue(state.frame[col]?.[row] || 0);
            input.blur();
          }
        });
        input.addEventListener("wheel", (event) => {
          event.preventDefault();
          const direction = event.deltaY < 0 ? 1 : -1;
          const fallback = state.frame[col]?.[row] || 0;
          const next = clamp(directWheelInputValue(input.value, fallback) + direction * 0.1, -6, 6);
          input.value = formatDirectInputValue(next);
          input.dataset.originalValue = input.value;
        }, { passive: false });
        grid.append(input);
      }
    }
  }

  function commitDirectFrameCell(input) {
    const parsed = parseRationalNumber(input.value);
    if (!parsed.ok || !Number.isFinite(parsed.value)) {
      state.lastWarning = "Manual frame entries must be finite rational values.";
      input.value = input.dataset.originalValue || "0";
      renderAll();
      return false;
    }
    input.value = formatDirectInputValue(parsed.value);
    input.dataset.originalValue = input.value;
    return true;
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
      input.value = formatDirectInputValue(state.frame[col]?.[row] || 0);
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
          input.value = formatDirectInputValue(state.p[index] || 0);
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
    return `${regularFamilyLabel(normalizeRegularFamily(family, n), n)} in R^${n}`;
  }

  function currentAddRegularFamily(n = state.ambientDim) {
    state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, n);
    return state.addRegularFamily;
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
    if (typeKey === "regular-polytope") return `regular polytope in R^${n}`;
    if (typeKey === "simplex") return `simplex in R^${n}`;
    if (typeKey === "sphere") return `S^${n - 1} in R^${n}`;
    if (typeKey === "cartesian-frame" || typeKey === "fan") return `Cartesian frame in R^${n}`;
    if (typeKey === "point") return `point in R^${n}`;
    if (typeKey === "formula-set") return `formula set in R^${n}`;
    if (typeKey === "tropical-polynomial") return `tropical polynomial in R^${n}`;
    if (typeKey === "cube") return `cube in R^${n}`;
    return `regular polytope in R^${n}`;
  }

  function makeObjectData(typeKey, n = state.ambientDim, options = {}) {
    if (typeKey === "regular-polytope" || typeKey === "cube") return makeRegularPolytopeData(n, options.family || "hypercube");
    if (typeKey === "simplex") return makeSimplexData(n);
    if (typeKey === "sphere") return makeSphereData(n);
    if (typeKey === "cartesian-frame" || typeKey === "fan") return makeCartesianFrameData(n);
    if (typeKey === "point") return makePointData(n);
    if (typeKey === "formula-set") return makeFormulaSetData(n);
    if (typeKey === "tropical-polynomial") return makeTropicalPolynomialData(n);
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
      ...compileTropicalPolynomial(tropicalInput, "max", n),
    };
  }

  function isProjectionlessSourceType(typeKey) {
    return typeKey === "formula-set" || typeKey === "tropical-polynomial";
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

  function makePreviewObject() {
    const type = OBJECT_TYPES.find((item) => item.key === state.addType) || OBJECT_TYPES[0];
    const options = type.key === "regular-polytope" ? { family: currentAddRegularFamily() } : {};
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

  function sourceLabel(object) {
    const labels = {
      cube: "cube",
      "regular-polytope": regularFamilyLabel(object?.data?.family, state.ambientDim),
      simplex: "simplex",
      sphere: "sphere",
      "cartesian-frame": "frame",
      point: "point",
      "formula-set": "formula",
      "tropical-polynomial": "tropical",
    };
    const type = object?.data?.objectType || object?.kind || "object";
    return labels[type] || type;
  }

  function setActiveObject(objectId) {
    const found = state.objects.find((object) => object.id === objectId);
    if (found) state.activeObjectId = found.id;
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
    fillAddFamilySelect();
  }

  function fillAddFamilySelect() {
    const select = $("source-add-family");
    if (!select) return;
    select.innerHTML = "";
    state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
    for (const family of regularFamilyOptions(state.ambientDim)) {
      const option = document.createElement("option");
      option.value = family.key;
      option.textContent = family.label;
      select.appendChild(option);
    }
    select.value = state.addRegularFamily;
  }

  function refreshTypeLabels() {
    const select = $("source-add-type");
    if (!select) return;
    Array.from(select.options).forEach((option) => {
      option.textContent = currentTypeLabel(option.value, state.ambientDim);
    });
    fillAddFamilySelect();
  }

  function syncObjectSelect() {
    const select = $("object-select");
    select.innerHTML = "";
    state.objects.forEach((object, index) => {
      const option = document.createElement("option");
      option.value = object.id;
      option.textContent = `${index + 1}. ${object.name}`;
      select.appendChild(option);
    });
    if (activeObject()) select.value = activeObject().id;
    $("object-delete").disabled = state.objects.length <= 1;
  }

  function syncSourceMode() {
    $("source-add-type").value = state.addType;
    const familySelect = $("source-add-family");
    if (familySelect) {
      state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
      familySelect.value = state.addRegularFamily;
      familySelect.hidden = state.addType !== "regular-polytope";
      familySelect.disabled = state.addType !== "regular-polytope";
    }
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
    $("object-name").value = object.name;
    $("object-color").value = object.style.color;
    $("object-opacity").value = object.style.opacity;
    $("object-point-size").value = object.style.pointSize;
    $("object-line-width").value = object.style.lineWidth;
    $("object-labels").checked = object.labels;
    syncLayerButtons(object);
    rebuildObjectParams();
    $("source-status").textContent = "Projection and exact/numeric 2D slice layers are active.";
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
    sliceButton.disabled = !sliceEnabled;
    sliceButton.title = sliceEnabled ? "show exact/numeric 2D slice layer" : "2D slice is available only for regular polytopes, simplex, sphere, formula sets, and tropical polynomials in 2D frame mode";
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
      buildScalarParam(container, object, "radius", "size", 0.05, 6, 0.05);
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
    if (type === "formula-set") {
      buildFormulaParams(container, object);
      return;
    }
    if (type === "tropical-polynomial") {
      buildTropicalParams(container, object);
      return;
    }
    container.textContent = "no parameters";
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
    const commitText = () => {
      const parsed = parseRationalNumber(number.value);
      if (!parsed.ok || parsed.value <= 0) {
        state.lastWarning = `${label} must be a positive number or fraction.`;
        sync();
        renderAll();
        return;
      }
      data[key] = parsed.value;
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
    wrap.append(text, slider, number);
    container.appendChild(wrap);
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

  function buildPointParams(container, object) {
    const data = object.data || {};
    data.position = resizeVector(
      (Array.isArray(data.position) ? data.position : []).map((value) => finiteNumber(value, 0)),
      state.ambientDim
    );
    data.ambientDimension = state.ambientDim;
    const vector = document.createElement("div");
    vector.className = "slice-param-vector";
    vector.append(document.createTextNode("("));
    data.position.forEach((value, index) => {
      if (index > 0) vector.append(document.createTextNode(", "));
      const label = document.createElement("label");
      label.className = "slice-param-vector";
      const input = document.createElement("input");
      input.className = "slice-input slice-coordinate-input";
      input.type = "text";
      input.inputMode = "decimal";
      input.value = fmt(value, 4);
      input.dataset.pointCoordinate = String(index);
      input.setAttribute("aria-label", `a${index + 1}`);
      input.addEventListener("focus", () => {
        input.dataset.originalValue = input.value;
      });
      input.addEventListener("change", () => updatePointCoordinate(object, input, index, input.value));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          updatePointCoordinate(object, input, index, input.value);
          input.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          input.value = input.dataset.originalValue || fmt(data.position[index], 4);
          input.blur();
        }
      });
      input.addEventListener("wheel", (event) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        const next = clamp(finiteNumber(input.value, data.position[index]) + direction * 0.1, -6, 6);
        input.value = fmt(next, 4);
        input.dataset.originalValue = input.value;
        updatePointCoordinate(object, input, index, input.value, { clampToWheelBounds: true });
      }, { passive: false });
      label.append(input);
      vector.append(label);
    });
    vector.append(document.createTextNode(")"));
    container.appendChild(vector);
  }

  function updatePointCoordinate(object, input, index, rawValue, options = {}) {
    const data = object.data || {};
    data.position = resizeVector(Array.isArray(data.position) ? data.position : [], state.ambientDim);
    const parsed = parseRationalNumber(rawValue);
    if (!parsed.ok) {
      state.lastWarning = `Coordinate a_${index + 1} must be a number or fraction.`;
      input.value = fmt(finiteNumber(data.position[index], 0), 4);
      renderAll();
      return;
    }
    data.position[index] = options.clampToWheelBounds ? clamp(parsed.value, -6, 6) : parsed.value;
    input.value = fmt(data.position[index], 4);
    state.selectedVertex = state.selectedVertex?.objectId === object.id
      ? { objectId: object.id, vertexKey: "point:0" }
      : state.selectedVertex;
    renderAll();
  }

  function formulaMatrixRowsText(matrix) {
    return matrix
      .map((row) => row.map((value) => fmt(value, 6)).join(", "))
      .join("\n");
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
    matrixInput.value = formulaMatrixRowsText(fallbackFormulaQMatrix(data));
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
    rhs.value = formatDirectInputValue(data.quadraticRhs ?? 1);
    rhs.setAttribute("aria-label", "Q right-hand side");
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
        matrixInput.value = formulaMatrixRowsText(fallbackFormulaQMatrix(data));
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
      renderAll();
    } catch (error) {
      state.lastWarning = `Q import rejected: ${error.message}`;
      updateDebug();
    }
  }

  function buildTropicalParams(container, object) {
    const data = object.data || {};
    data.tropicalConvention = normalizeTropicalConvention(data.tropicalConvention);
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
        applyTropicalInput(object, data.tropicalInput || textarea.value, mode);
      });
      modes.append(button);
    });

    const textarea = document.createElement("textarea");
    textarea.className = "slice-textarea slice-tropical-textarea";
    textarea.dataset.tropicalInput = "true";
    textarea.spellcheck = false;
    textarea.value = data.tropicalInput || tropicalTermsToText(data.terms || []);
    textarea.setAttribute("aria-label", "Tropical polynomial");
    textarea.placeholder = "p^0 + u1 + u2";
    const apply = document.createElement("button");
    apply.className = "slice-btn";
    apply.type = "button";
    apply.dataset.tropicalApply = "true";
    apply.textContent = "apply tropical";
    const applyCurrent = () => applyTropicalInput(object, textarea.value, data.tropicalConvention);
    apply.addEventListener("click", applyCurrent);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyCurrent();
      } else if (event.key === "Escape") {
        event.preventDefault();
        textarea.value = data.tropicalInput || tropicalTermsToText(data.terms || []);
        textarea.blur();
      }
    });

    const summary = document.createElement("code");
    summary.className = "slice-tropical-summary";
    summary.dataset.tropicalSummary = "true";
    summary.textContent = data.normalizedTropical || tropicalTermsToText(data.terms || []);
    panel.append(modes, textarea, apply, summary);
    container.appendChild(panel);
  }

  function applyTropicalInput(object, rawInput, convention) {
    try {
      const candidate = compileTropicalPolynomial(rawInput, convention, state.ambientDim);
      object.kind = "tropical";
      object.visibleProjection = false;
      object.visibleSlice = true;
      object.data = {
        ...object.data,
        ...candidate,
        kind: "tropical",
        objectType: "tropical-polynomial",
        ambientDimension: state.ambientDim,
        name: object.name,
      };
      state.lastWarning = `Tropical polynomial applied in ${candidate.tropicalConvention} convention.`;
      state.selectedVertex = null;
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
      button.textContent = label;
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
    state.ambientDim = next;
    state.p = resizeVector(state.p, next);
    resizeFrame(state.frame, next);
    state.activeDirection = normalizeDirection(state.activeDirection, next);
    state.sliceDim = 2;
    state.rotationPair = normalizeRotationPair(state.rotationPair, next);
    const resizeWarnings = [];
    state.objects.forEach((object) => {
      const warning = resizeManagedObjectToAmbient(object);
      if (warning) resizeWarnings.push(warning);
    });
    state.selectedVertex = null;
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
    const rows = Array.from({ length: state.ambientDim }, () => Array(state.ambientDim).fill(0));
    const inputs = Array.from($("direct-frame-grid").querySelectorAll("[data-direct-frame-row]"));
    if (inputs.length !== state.ambientDim * state.ambientDim) {
      throw new Error(`Frame matrix needs ${state.ambientDim} x ${state.ambientDim} entries.`);
    }
    inputs.forEach((input) => {
      const row = Number(input.dataset.directFrameRow);
      const col = Number(input.dataset.directFrameColumn);
      const parsed = parseRationalNumber(input.value);
      if (!parsed.ok || !Number.isFinite(parsed.value)) {
        throw new Error(`Frame entry e_${row + 1}, v_${col + 1} is not a finite rational value.`);
      }
      rows[row][col] = parsed.value;
    });
    return rows;
  }

  function cleanMatrixRowText(rowText) {
    return String(rowText || "")
      .trim()
      .replace(/^\s*[\[\(\{]\s*/, "")
      .replace(/\s*[\]\)\}]\s*,?\s*$/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
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
      const parts = (rowText.includes(",") ? rowText.split(",") : rowText.split(/\s+/))
        .map((part) => part.trim())
        .filter(Boolean);
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
    object.labels = $("object-labels").checked;
    if (object.data) object.data.name = object.name;
    if (!objectHasVisibleLayer(object) && state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
  }

  function objectHasVisibleLayer(object) {
    return !!object?.visibleProjection || (!!object?.visibleSlice && canDrawExact2DSlice(object));
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
      data.center = resizeVector(Array.isArray(data.center) ? data.center : [], state.ambientDim);
      data.radius = positiveNumber(data.radius, 1);
    } else if (type === "point") {
      data.ambientDimension = state.ambientDim;
      data.position = resizeVector(Array.isArray(data.position) ? data.position : [], state.ambientDim)
        .map((value) => finiteNumber(value, 0));
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
    };
    if (Array.isArray(data.terms) && data.terms.length) {
      const terms = normalizeTropicalTerms(resizeTropicalTerms(data.terms, n), tropicalConvention, n);
      return {
        ...base,
        tropicalInput: String(data.tropicalInput || tropicalTermsToText(terms)),
        terms,
        normalizedTropical: tropicalTermsToText(terms),
      };
    }
    return {
      ...base,
      ...compileTropicalPolynomial(data.tropicalInput || defaultTropicalInput(n), tropicalConvention, n),
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
      normalized.position = resizeVector(
        (Array.isArray(normalized.position) ? normalized.position : []).map((value) => finiteNumber(value, 0)),
        normalized.ambientDimension
      );
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
    }
    return normalized;
  }

  function normalizeSourceObject(object) {
    const data = normalizeObjectData(object.data || {}, object.kind);
    const isFormulaSet = data.objectType === "formula-set";
    const isTropical = data.objectType === "tropical-polynomial";
    const isProjectionless = isProjectionlessSourceType(data.objectType);
    const visibleProjection = isProjectionless ? false : object.visibleProjection ?? object.projectionVisible ?? object.visible ?? true;
    const visibleSlice = isProjectionless ? object.visibleSlice ?? object.sliceVisible ?? true : object.visibleSlice ?? object.sliceVisible ?? false;
    const normalized = {
      id: object.id || `object-${objectCounter++}`,
      name: String(object.name || data.name || "object").trim(),
      kind: isFormulaSet ? "formula" : isTropical ? "tropical" : data.kind || object.kind || "geometry",
      visibleProjection: visibleProjection !== false,
      visibleSlice: !!visibleSlice,
      labels: !!(object.labels ?? object.showLabels),
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
    return normalizeSourceObject(object);
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
    document.querySelectorAll(".card-head").forEach((head) => {
      const card = head.closest(".card");
      if (!card) return;
      head.setAttribute("aria-expanded", card.classList.contains("collapsed") ? "false" : "true");
      const toggle = () => {
        card.classList.toggle("collapsed");
        head.setAttribute("aria-expanded", card.classList.contains("collapsed") ? "false" : "true");
      };
      head.addEventListener("click", (event) => {
        if (event.target.closest("button,input,select,textarea,a,.drag-handle")) return;
        toggle();
      });
      head.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      });
    });
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

  function isTypingTarget(target) {
    const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select" || !!target?.isContentEditable;
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

    $("source-mode-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-source-mode]");
      if (!button) return;
      state.sourceMode = button.dataset.sourceMode === "add" ? "add" : "modify";
      if (state.sourceMode === "add") state.selectedVertex = null;
      syncSourceMode();
      renderAll();
    });

    $("source-add-type").addEventListener("change", () => {
      state.addType = $("source-add-type").value;
      syncSourceMode();
      renderAll();
    });

    $("source-add-family").addEventListener("change", () => {
      state.addRegularFamily = normalizeRegularFamily($("source-add-family").value, state.ambientDim);
      renderAll();
    });

    $("source-add-object").addEventListener("click", () => {
      const options = state.addType === "regular-polytope" ? { family: currentAddRegularFamily() } : {};
      const data = makeObjectData(state.addType, state.ambientDim, options);
      const object = makeObjectForType(state.addType, uniqueObjectName(data.name || currentTypeLabel(state.addType, state.ambientDim)), options);
      state.objects.push(object);
      state.activeObjectId = object.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
      state.lastWarning = isProjectionlessSourceType(objectTypeKey(object))
        ? `${object.name} added to the exact slice layer.`
        : `${object.name} added to the projection and slice view.`;
      syncObjectSelect();
      syncObjectPanel();
      syncSourceMode();
      renderAll();
    });

    $("object-select").addEventListener("change", () => {
      setActiveObject($("object-select").value);
      state.selectedVertex = null;
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
      state.objects = state.objects.filter((object) => object.id !== state.activeObjectId);
      state.activeObjectId = state.objects[0].id;
      state.selectedVertex = null;
      state.lastWarning = "Active object deleted.";
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
        state.lastWarning = `${sourceLabel(object)} projection is unavailable; use the exact slice layer.`;
        syncLayerButtons(object);
        renderAll();
        return;
      }
      object.visibleProjection = !object.visibleProjection;
      if (!objectHasVisibleLayer(object) && state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
      syncLayerButtons(object);
      renderAll();
    });

    $("object-visible-slice").addEventListener("click", () => {
      const object = activeObject();
      if (!object || !canDrawExact2DSlice(object)) return;
      object.visibleSlice = !object.visibleSlice;
      if (!objectHasVisibleLayer(object) && state.selectedVertex?.objectId === object.id) state.selectedVertex = null;
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
      state.frame = identityFrame(state.ambientDim);
      state.lastWarning = "Frame reset to the standard basis.";
      renderAll();
    });

    $("screen-zoom").addEventListener("input", () => {
      state.viewport.zoom = finiteNumber($("screen-zoom").value, 1);
      draw();
      updateDebug();
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
    state.activeDirection = normalizeDirection(state.activeDirection);
    clampMotionState();
    $("ambient-dimension").value = String(state.ambientDim);
    $("screen-zoom").value = String(state.viewport.zoom);
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
    $("auto-schmidt").checked = state.autoSchmidt;

    setSegmentActive("direction-controls", "data-direction-key", directionKey());
    syncSlideInputControls();
    syncMotionControls();
    syncRotationControls();
    syncSourceMode();
    syncObjectSelect();
    const object = activeObject();
    if (object) syncLayerButtons(object);
    $("toolbar-source").textContent = object ? sourceLabel(object) : "none";
    $("toolbar-slice").textContent = `${state.sliceDim}D`;
    updateReadouts();
    draw();
    updateDebug();
  }

  function updateReadouts() {
    $("position-vector").textContent = `p = [${state.p.map((value) => fmt(value, 4)).join(", ")}]`;
    $("frame-matrix").textContent = frameMatrixToString(state.frame);
    $("active-slice-matrix").textContent = frameMatrixToString(state.frame.slice(0, state.sliceDim));
    $("gram-matrix").textContent = matrixToString(gramMatrix(state.frame));
    const vectors = Array.from({ length: state.sliceDim }, (_, index) => `y_${index + 1}v_${index + 1}`).join(" + ");
    $("affine-formula").textContent = `x = p + ${vectors}`;
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
    writeDefinitionList("visible-counts", [
      ["objects", `${counts.visibleObjects}/${state.objects.length}`],
      ["proj objects", String(counts.projectionObjects)],
      ["proj pts", String(counts.points)],
      ["proj edges", String(counts.edges)],
      ["proj rays", String(counts.rays)],
      ["slice objects", state.sliceDim === 2 ? String(counts.sliceObjects) : "disabled in 3D"],
      ["slice cells", `${counts.slicePolygons} poly / ${counts.sliceCircles} circ / ${counts.sliceConics} conic / ${counts.sliceImplicit} implicit / ${counts.sliceTropicalSegments} tropical seg / ${counts.slicePoints} pts`],
    ]);
    writeDefinitionList("slice-diagnostics", [
      ["renderer", "projection + exact/numeric 2D slice"],
      ["frame dimension", `${state.sliceDim}D`],
      ["formula/tropical renderer", state.sliceDim === 2 ? "formula exact/numeric; tropical exact" : "2D only"],
      ["draw runtime", `${fmt(runtimeStats.drawMs, 2)} ms`],
      ["slice runtime", `${fmt(runtimeStats.exactSliceMs, 2)} ms`],
      ["halfspaces", runtimeStats.halfspaceCount ? `${runtimeStats.halfspaceCount} (${runtimeStats.heavyFamily})` : "none"],
      ["halfspace build", `${fmt(runtimeStats.halfspaceMs, 2)} ms`],
      ["empty warning", counts.visibleObjects ? "none" : "no visible objects"],
      ["orth error", fmt(maxOrthogonalityError(), 6)],
    ]);
    $("debug-warnings").textContent = state.lastWarning;
    $("source-status").textContent = state.lastWarning;
    const picked = currentSelectedCandidate();
    const pickedText = picked
      ? `${picked.objectName} / ${picked.label}  x=${vectorToInline(picked.ambient)}  y=${vectorToInline(picked.frameCoords)}`
      : "";
    const previewText = state.sourceMode === "add" ? `preview ${currentTypeLabel(state.addType, state.ambientDim)}` : "";
    $("slice-hud").innerHTML = `
      <span class="slice-chip">n=${state.ambientDim}</span>
      <span class="slice-chip">k=${state.sliceDim}</span>
      <span class="slice-chip">active ${directionLabel()}</span>
      <span class="slice-chip">projection / exact+numeric 2D slice</span>
      ${previewText ? `<span class="slice-chip">${escapeHtml(previewText)}</span>` : ""}
      ${pickedText ? `<span class="slice-chip">picked: ${escapeHtml(pickedText)}</span>` : ""}
    `;
    $("slice-status-bar").innerHTML = `
      <span><strong>p</strong> [${state.p.map((value) => fmt(value, 2)).join(", ")}]</span>
      <span><strong>objects</strong> ${counts.visibleObjects} visible</span>
      <span><strong>zoom</strong> ${fmt(state.viewport.zoom, 2)}</span>
      <span><strong>box</strong> ${fmt(state.viewport.boxRadius, 2)}</span>
      ${pickedText ? `<span><strong>picked</strong> ${escapeHtml(pickedText)}</span>` : ""}
    `;
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
          if (slice.kind === "tropical-curve") counts.sliceTropicalSegments += (slice.segments || []).length;
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

    if (state.viewport.showGrid) drawGrid(ctx, view, width, height);
    if (state.viewport.showBox) drawBox(ctx, view);
    if (state.viewport.showAxes) drawAxes(ctx, view);

    for (const object of state.objects) {
      if (object.visibleProjection) drawObject(ctx, view, object, { registerPick: true });
    }

    for (const object of state.objects) {
      if (object.visibleSlice && canDrawExact2DSlice(object)) drawExactSliceObject(ctx, view, object, { registerPick: true });
    }

    if (state.sourceMode === "add") drawObject(ctx, view, makePreviewObject(), { preview: true, registerPick: false });
    drawSelectedVertex(ctx, view);

    if (state.viewport.exactSphereGuide) drawSphereGuide(ctx, view);
    runtimeStats.drawMs = nowMs() - drawStart;
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
      ctx.fillStyle = "#2c4a55";
      ctx.font = `${11 * view.ratio}px JetBrains Mono, Consolas, monospace`;
      ctx.fillText("y1", x1.x + 6 * view.ratio, x1.y - 4 * view.ratio);
      ctx.fillText("y2", y1.x + 6 * view.ratio, y1.y - 4 * view.ratio);
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
    if ((object.kind === "sphere" || rawData.objectType === "sphere") && state.sliceDim === 2) {
      drawAnalyticSphereObject(ctx, view, object, { ...options, color, alpha, pointSize, lineWidth });
      return;
    }
    const data = drawableData(object);
    const projected = data.points.map((point) => projectAmbient(point, view));
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
      if ((object.labels || state.viewport.showLabels) && rayIndex < 48) {
        ctx.font = `${10 * view.ratio}px JetBrains Mono, Consolas, monospace`;
        ctx.fillText(ray.label || `rho_${rayIndex + 1}`, tip.x + 5 * view.ratio, tip.y - 5 * view.ratio);
      }
    }

    projected.forEach((point, index) => {
      drawPoint(ctx, point.x, point.y, pointSize);
      if (registerPick) recordPickCandidate(object, point, `v_${index + 1}`, `point:${index}`, pointSize);
      if ((object.labels || state.viewport.showLabels) && index < 48) {
        ctx.font = `${10 * view.ratio}px JetBrains Mono, Consolas, monospace`;
        ctx.fillText(String(index), point.x + 5 * view.ratio, point.y - 5 * view.ratio);
      }
    });

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
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * view.scale, 0, Math.PI * 2);
    ctx.stroke();
    drawPoint(ctx, center.x, center.y, Math.max(pointSize, 3 * view.ratio));
    if (options.registerPick !== false) recordPickCandidate(object, center, "center", "sphere-center", Math.max(pointSize, 3 * view.ratio));
    if (object.labels || state.viewport.showLabels) {
      ctx.font = `${10 * view.ratio}px JetBrains Mono, Consolas, monospace`;
      ctx.fillText("center", center.x + 5 * view.ratio, center.y - 5 * view.ratio);
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
    const lineWidth = Math.max(finiteNumber(style.lineWidth, 2) * view.ratio + 0.8 * view.ratio, 2 * view.ratio);
    const registerPick = options.registerPick !== false;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

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
      }
      projected.forEach((point, index) => {
        drawPoint(ctx, point.x, point.y, pointSize);
        if (registerPick) recordPickCandidate(object, point, `slice v_${index + 1}`, `slice-point:${index}`, pointSize);
        if ((object.labels || state.viewport.showLabels) && index < 48) {
          ctx.font = `${10 * view.ratio}px JetBrains Mono, Consolas, monospace`;
          ctx.fillText(`s${index}`, point.x + 5 * view.ratio, point.y - 5 * view.ratio);
        }
      });
    } else if (slice.kind === "segment") {
      const projected = slice.vertices.map((vertex) => projectFramePoint(vertex.y, view));
      ctx.globalAlpha = alpha;
      line(ctx, projected[0].x, projected[0].y, projected[1].x, projected[1].y);
      projected.forEach((point, index) => {
        drawPoint(ctx, point.x, point.y, pointSize);
        if (registerPick) recordPickCandidate(object, point, `slice v_${index + 1}`, `slice-point:${index}`, pointSize);
      });
    } else if (slice.kind === "point") {
      const point = projectFramePoint(slice.point.y, view);
      ctx.globalAlpha = alpha;
      drawPoint(ctx, point.x, point.y, pointSize + 1 * view.ratio);
      if (registerPick) recordPickCandidate(object, point, slice.label || "slice point", "slice-point:0", pointSize + 1 * view.ratio);
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
      if (object.labels || state.viewport.showLabels) {
        ctx.font = `${10 * view.ratio}px JetBrains Mono, Consolas, monospace`;
        ctx.fillText("slice center", center.x + 5 * view.ratio, center.y - 5 * view.ratio);
      }
    } else if (slice.kind === "conic") {
      drawFormulaConicSlice(ctx, view, slice, { alpha, lineWidth });
    } else if (slice.kind === "implicit-formula") {
      drawNumericFormulaSlice(ctx, view, slice, { alpha, lineWidth });
    } else if (slice.kind === "tropical-curve") {
      drawTropicalCurveSlice(ctx, view, slice, { alpha, lineWidth });
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
    if (terms.length < 2) {
      return { kind: "tropical-curve", segments: [], clipRadius: radius, skippedPairs: 0 };
    }
    const convention = normalizeTropicalConvention(data.tropicalConvention);
    const functions = restrictTropicalTermsToSlice(terms, convention);
    const segments = [];
    let skippedPairs = 0;
    const tolerance = sliceTolerance();
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
      clipRadius: radius,
      convention,
      skippedPairs,
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

  function drawTropicalCurveSlice(ctx, view, slice, options = {}) {
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 0.85;
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

  function initialClipPolygon(radius) {
    const r = Math.max(1, radius);
    return [[-r, -r], [r, -r], [r, r], [-r, r]];
  }

  function sliceClipRadiusForObject(object) {
    const data = object.data || {};
    const type = objectTypeKey(object);
    if (type === "formula-set" || type === "tropical-polynomial") return formulaClipRadius(object);
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
        points: [resizeVector(data.position || [], state.ambientDim).map((value) => finiteNumber(value, 0))],
        edges: [],
        rays: [],
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
    if (type === "formula-set" || type === "tropical-polynomial") {
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

  function recordPickCandidate(object, projected, label, vertexKey, radius) {
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

  function handleCanvasClick(event) {
    const point = canvasPointFromEvent(event);
    const candidate = nearestPickCandidate(point.x, point.y);
    if (!candidate) {
      state.selectedVertex = null;
      state.lastWarning = "No projected vertex selected.";
      renderAll();
      return;
    }
    state.selectedVertex = {
      objectId: candidate.objectId,
      vertexKey: candidate.vertexKey,
    };
    state.activeObjectId = candidate.objectId;
    state.sourceMode = "modify";
    state.lastWarning = `Picked ${candidate.objectName} / ${candidate.label}.`;
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    renderAll();
  }

  function handleCanvasPointerMove(event) {
    const point = canvasPointFromEvent(event);
    $("slice-viewport").style.cursor = nearestPickCandidate(point.x, point.y) ? "pointer" : "default";
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

  function frameState() {
    return {
      ambientDimension: state.ambientDim,
      frameDimension: state.sliceDim,
      position: state.p,
      activeFrame: state.frame.slice(0, state.sliceDim),
      formula: $("affine-formula").textContent,
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
    card.classList.remove("collapsed");
    const head = card.querySelector(".card-head");
    if (head) head.setAttribute("aria-expanded", "true");
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
      state.addType = OBJECT_TYPES.some((type) => type.key === imported.addType) ? imported.addType : "cartesian-frame";
      state.addRegularFamily = normalizeRegularFamily(imported.addRegularFamily || state.addRegularFamily || "hypercube", state.ambientDim);
      clampMotionState();
      state.objects = Array.isArray(imported.objects) && imported.objects.length ? imported.objects.map(normalizeSourceObject) : [makeObjectForType("cartesian-frame")];
      state.activeObjectId = imported.activeObjectId && state.objects.some((object) => object.id === imported.activeObjectId)
        ? imported.activeObjectId
        : state.objects[0].id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
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
      state.activeObjectId = object.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
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
      const imported = parseObjectPayload($("import-state").value);
      imported.id = state.objects[index].id;
      state.objects[index] = imported;
      state.activeObjectId = imported.id;
      state.sourceMode = "modify";
      state.selectedVertex = null;
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
      cameraDistance: 3,
      boxRadius: 4,
      exactSphereGuide: false,
      tolerance: 0.0001,
    };
    state.sourceMode = "modify";
    state.addType = "cartesian-frame";
    state.addRegularFamily = "hypercube";
    state.selectedVertex = null;
    state.pickCandidates = [];
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
    state.addRegularFamily = normalizeRegularFamily(state.addRegularFamily, state.ambientDim);
    state.objects = [makeObjectForType("cartesian-frame")];
    state.activeObjectId = state.objects[0].id;
    fillTypeSelect();
    rebuildDynamicControls();
    refreshTypeLabels();
    syncObjectSelect();
    syncObjectPanel();
    syncSourceMode();
    setupEventListeners();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resizeCanvas);
      observer.observe($("slice-viewport"));
    }
    resizeCanvas();
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
