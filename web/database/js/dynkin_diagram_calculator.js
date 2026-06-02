(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const key = (v) => v.join(',');
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 360;
  const state = {
    type: 'E6',
    rank: 6,
    selected: 0,
    multiSelect: false,
    selectedSet: [0],
    hitboxes: [],
    edgeHitboxes: [],
    roots: [],
    cartan: [],
    quiverMode: false,
    quiverOrientations: {},
    startingFunctionLayouts: {},
    startingFunctionHeaderVisible: true,
    startingFunctionTransposed: false,
    startingFunctionWide: false,
    startingFunctionARMode: false,
    arHideUnselected: false
  };

  const EXCEPTIONAL_RANK = { E6: 6, E7: 7, E8: 8, F4: 4, G2: 2 };
  const TYPE_NAMES = {
    A: (n) => `A_${n}`,
    B: (n) => `B_${n}`,
    C: (n) => `C_${n}`,
    D: (n) => `D_${n}`,
    E6: () => 'E_6',
    E7: () => 'E_7',
    E8: () => 'E_8',
    F4: () => 'F_4',
    G2: () => 'G_2'
  };
  const TYPE_DESC = {
    A: (n) => `sl(${n + 1})`,
    B: (n) => `so(${2 * n + 1})`,
    C: (n) => `sp(${2 * n})`,
    D: (n) => `so(${2 * n})`,
    E6: () => 'exceptional simple Lie algebra',
    E7: () => 'exceptional simple Lie algebra',
    E8: () => 'exceptional simple Lie algebra',
    F4: () => 'exceptional simple Lie algebra',
    G2: () => 'exceptional simple Lie algebra'
  };

  function isClassical(type) {
    return type === 'A' || type === 'B' || type === 'C' || type === 'D';
  }

  function isSimplyLacedFinite(type) {
    return type === 'A' || type === 'D' || type === 'E6' || type === 'E7' || type === 'E8';
  }

  function supportsStartingFunction(type) {
    return isSimplyLacedFinite(type) || type === 'B' || type === 'C' || type === 'F4' || type === 'G2';
  }

  function supportsQuiverOrientation(type) {
    return isSimplyLacedFinite(type);
  }

  function typeLabel(type = state.type, rank = state.rank) {
    return TYPE_NAMES[type] ? TYPE_NAMES[type](rank) : type;
  }

  function rankBounds(type) {
    if (type === 'A') return { min: 1, max: 12, fallback: 6 };
    if (type === 'B' || type === 'C') return { min: 2, max: 12, fallback: 6 };
    if (type === 'D') return { min: 4, max: 12, fallback: 6 };
    const r = EXCEPTIONAL_RANK[type] || 1;
    return { min: r, max: r, fallback: r };
  }

  function clampRank(type, value) {
    const bounds = rankBounds(type);
    const n = Math.floor(Number(value) || bounds.fallback);
    return Math.max(bounds.min, Math.min(bounds.max, n));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeMatrix(n, callback) {
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => callback(i, j)));
  }

  function cartanMatrix(type, rank) {
    if (type === 'A') return makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
    if (type === 'B') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
      C[rank - 2][rank - 1] = -2;
      C[rank - 1][rank - 2] = -1;
      return C;
    }
    if (type === 'C') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
      C[rank - 2][rank - 1] = -1;
      C[rank - 1][rank - 2] = -2;
      return C;
    }
    if (type === 'D') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : 0);
      for (let i = 0; i < rank - 2; i++) {
        C[i][i + 1] = -1;
        C[i + 1][i] = -1;
      }
      C[rank - 3][rank - 1] = -1;
      C[rank - 1][rank - 3] = -1;
      return C;
    }
    if (type === 'G2') return [[2, -1], [-3, 2]];
    if (type === 'F4') return [[2, -1, 0, 0], [-1, 2, -2, 0], [0, -1, 2, -1], [0, 0, -1, 2]];
    if (type === 'E6') {
      const C = makeMatrix(6, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    if (type === 'E7') {
      const C = makeMatrix(7, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    if (type === 'E8') {
      const C = makeMatrix(8, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    throw new Error('Unsupported Dynkin type.');
  }

  function positiveRoots(C) {
    const n = C.length;
    const roots = new Map();
    const queue = [];
    for (let i = 0; i < n; i++) {
      const e = Array(n).fill(0);
      e[i] = 1;
      roots.set(key(e), e);
      queue.push(e);
    }
    while (queue.length) {
      const r = queue.pop();
      for (let i = 0; i < n; i++) {
        const bracket = r.reduce((sum, x, j) => sum + x * C[j][i], 0);
        const next = r.slice();
        next[i] -= bracket;
        if (next.every((x) => x >= 0) && !roots.has(key(next))) {
          roots.set(key(next), next);
          queue.push(next);
        }
      }
    }
    return Array.from(roots.values()).sort((a, b) => rootHeight(a) - rootHeight(b) || key(a).localeCompare(key(b)));
  }

  function rootHeight(root) {
    return root.reduce((sum, x) => sum + x, 0);
  }

  function factorialBigInt(n) {
    let out = 1n;
    for (let k = 2n; k <= BigInt(n); k++) out *= k;
    return out;
  }

  function powBigInt(base, exponent) {
    let out = 1n;
    for (let i = 0; i < exponent; i++) out *= BigInt(base);
    return out;
  }

  function formatBigInt(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function invariants(type, rank, C, roots) {
    const n = rank;
    const pos = roots.length;
    const total = 2 * pos;
    const dim = rank + total;
    const coxeter = type === 'A' ? n + 1
      : type === 'B' || type === 'C' ? 2 * n
        : type === 'D' ? 2 * n - 2
          : { E6: 12, E7: 18, E8: 30, F4: 12, G2: 6 }[type];
    const dualCoxeter = type === 'A' ? n + 1
      : type === 'B' ? 2 * n - 1
        : type === 'C' ? n + 1
          : type === 'D' ? 2 * n - 2
            : { E6: 12, E7: 18, E8: 30, F4: 9, G2: 4 }[type];
    const exponents = type === 'A' ? Array.from({ length: n }, (_, i) => i + 1)
      : type === 'B' || type === 'C' ? Array.from({ length: n }, (_, i) => 2 * i + 1)
        : type === 'D' ? Array.from({ length: n - 1 }, (_, i) => 2 * i + 1).concat([n - 1]).sort((a, b) => a - b)
          : {
            E6: [1, 4, 5, 7, 8, 11],
            E7: [1, 5, 7, 9, 11, 13, 17],
            E8: [1, 7, 11, 13, 17, 19, 23, 29],
            F4: [1, 5, 7, 11],
            G2: [1, 5]
          }[type];
    const weylOrder = type === 'A' ? factorialBigInt(n + 1)
      : type === 'B' || type === 'C' ? powBigInt(2, n) * factorialBigInt(n)
        : type === 'D' ? powBigInt(2, n - 1) * factorialBigInt(n)
          : BigInt({ E6: 51840, E7: 2903040, E8: 696729600, F4: 1152, G2: 12 }[type]);
    return {
      label: typeLabel(type, rank),
      desc: TYPE_DESC[type](rank),
      rank,
      dimension: dim,
      positiveRoots: pos,
      roots: total,
      coxeter,
      dualCoxeter,
      exponents,
      weylOrder,
      determinant: Math.round(determinant(C)),
      center: centerText(type, rank)
    };
  }

  function centerText(type, rank) {
    if (type === 'A') return `Z/${rank + 1}Z`;
    if (type === 'B' || type === 'C' || type === 'E7') return 'Z/2Z';
    if (type === 'D') return rank % 2 === 0 ? 'Z/2Z x Z/2Z' : 'Z/4Z';
    if (type === 'E6') return 'Z/3Z';
    return 'trivial';
  }

  function determinant(M) {
    const n = M.length;
    const A = M.map((row) => row.map(Number));
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
      if (Math.abs(A[pivot][i]) < 1e-10) return 0;
      if (pivot !== i) {
        [A[i], A[pivot]] = [A[pivot], A[i]];
        det *= -1;
      }
      det *= A[i][i];
      const div = A[i][i];
      for (let r = i + 1; r < n; r++) {
        const factor = A[r][i] / div;
        for (let c = i; c < n; c++) A[r][c] -= factor * A[i][c];
      }
    }
    return det;
  }

  function transpose(M) {
    return M[0].map((_, j) => M.map((row) => row[j]));
  }

  function solveLinear(A, b) {
    const n = A.length;
    const M = A.map((row, i) => row.map(Number).concat([Number(b[i])]));
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      if (Math.abs(M[pivot][col]) < 1e-10) return null;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const div = M[col][col];
      for (let j = col; j <= n; j++) M[col][j] /= div;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = M[r][col];
        for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
      }
    }
    return M.map((row) => row[n]);
  }

  function cartanSymmetrizer(C) {
    const n = C.length;
    const d = Array(n).fill(null);
    d[0] = 1;
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (!C[i][j] || !C[j][i]) continue;
          if (d[i] != null && d[j] == null) {
            d[j] = d[i] * C[j][i] / C[i][j];
            changed = true;
          } else if (d[j] != null && d[i] == null) {
            d[i] = d[j] * C[i][j] / C[j][i];
            changed = true;
          }
        }
      }
    }
    const positive = d.map((x) => Math.abs(x || 1));
    const min = Math.min(...positive.filter((x) => x > 0));
    return positive.map((x) => x / min);
  }

  function approxFraction(value, maxDen = 120) {
    if (Math.abs(value) < 1e-10) return '0';
    const sign = value < 0 ? '-' : '';
    let x = Math.abs(value);
    let bestNum = Math.round(x);
    let bestDen = 1;
    let bestErr = Math.abs(x - bestNum);
    for (let den = 1; den <= maxDen; den++) {
      const num = Math.round(x * den);
      const err = Math.abs(x - num / den);
      if (err < bestErr - 1e-12) {
        bestNum = num;
        bestDen = den;
        bestErr = err;
      }
    }
    if (bestDen === 1) return sign + String(bestNum);
    const g = gcd(bestNum, bestDen);
    return `${sign}${bestNum / g}/${bestDen / g}`;
  }

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x || 1;
  }

  function formatVector(values) {
    return `[${values.map((x) => Number.isInteger(x) ? String(x) : approxFraction(x)).join(', ')}]`;
  }

  function htmlRows(rows) {
    return rows.map(([label, value]) => {
      const valueClass = String(value).includes('\\(') || String(value).includes('\\[')
        ? 'stat-value math-stat-value'
        : 'stat-value';
      return `<div class="stat-row"><span class="stat-label">${label}</span><span class="${valueClass}">${value}</span></div>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function inlineMath(latex) {
    return `\\(${latex}\\)`;
  }

  function displayMath(latex) {
    return `\\[${latex}\\]`;
  }

  function typeLatex(type = state.type, rank = state.rank) {
    if (type === 'A' || type === 'B' || type === 'C' || type === 'D') return `${type}_{${rank}}`;
    if (type === 'E6') return 'E_{6}';
    if (type === 'E7') return 'E_{7}';
    if (type === 'E8') return 'E_{8}';
    if (type === 'F4') return 'F_{4}';
    if (type === 'G2') return 'G_{2}';
    return escapeHtml(type);
  }

  function lieAlgebraLatex(type = state.type, rank = state.rank) {
    if (type === 'A') return `\\mathfrak{sl}_{${rank + 1}}`;
    if (type === 'B') return `\\mathfrak{so}_{${2 * rank + 1}}`;
    if (type === 'C') return `\\mathfrak{sp}_{${2 * rank}}`;
    if (type === 'D') return `\\mathfrak{so}_{${2 * rank}}`;
    if (type === 'E6') return '\\mathfrak{e}_{6}';
    if (type === 'E7') return '\\mathfrak{e}_{7}';
    if (type === 'E8') return '\\mathfrak{e}_{8}';
    if (type === 'F4') return '\\mathfrak{f}_{4}';
    if (type === 'G2') return '\\mathfrak{g}_{2}';
    return typeLatex(type, rank);
  }

  function centerLatex(type, rank) {
    if (type === 'A') return `\\mathbb{Z}/${rank + 1}\\mathbb{Z}`;
    if (type === 'B' || type === 'C' || type === 'E7') return '\\mathbb{Z}/2\\mathbb{Z}';
    if (type === 'D') return rank % 2 === 0 ? '(\\mathbb{Z}/2\\mathbb{Z})^{2}' : '\\mathbb{Z}/4\\mathbb{Z}';
    if (type === 'E6') return '\\mathbb{Z}/3\\mathbb{Z}';
    return '\\{1\\}';
  }

  function fractionLatex(value) {
    const text = approxFraction(value);
    if (!text.includes('/')) return text;
    const sign = text.startsWith('-') ? '-' : '';
    const [num, den] = text.replace('-', '').split('/');
    return `${sign}\\frac{${num}}{${den}}`;
  }

  function vectorLatex(values) {
    return `\\left[${values.map((x) => Number.isInteger(x) ? String(x) : fractionLatex(x)).join(', ')}\\right]`;
  }

  function rootsLatex(values) {
    return values.length ? values.map((value) => `\\alpha_{${value}}`).join(', ') : '\\varnothing';
  }

  function selectedIndices() {
    const raw = state.multiSelect ? state.selectedSet : [state.selected];
    const valid = raw
      .map((index) => Math.max(0, Math.min(state.rank - 1, Number(index) || 0)))
      .filter((index, position, values) => values.indexOf(index) === position)
      .sort((a, b) => a - b);
    return valid.length ? valid : [state.selected];
  }

  function selectedNodesLatex(indices = selectedIndices()) {
    return indices.map((index) => `\\alpha_{${index + 1}}`).join(', ');
  }

  function clampSelection() {
    state.selected = Math.max(0, Math.min(state.rank - 1, state.selected));
    state.selectedSet = (state.selectedSet || [])
      .map((index) => Math.max(0, Math.min(state.rank - 1, Number(index) || 0)))
      .filter((index, position, values) => values.indexOf(index) === position)
      .sort((a, b) => a - b);
    if (!state.selectedSet.length) state.selectedSet = [state.selected];
  }

  function typeSetTarget() {
    return document.querySelector('main');
  }

  function mathTypesetTargets() {
    const parabolic = $('dynkin-parabolic');
    if (!parabolic) return [typeSetTarget()].filter(Boolean);
    const targetSelectors = [
      '#dynkin-status',
      '#dynkin-root-count-label',
      '#dynkin-invariants',
      '#dynkin-selected-label',
      '#dynkin-vertex-data',
      '.parabolic-summary',
      '.parabolic-matrix-wrap',
      '.parabolic-detail-group',
      '.parabolic-stats',
      '#dynkin-starting-function',
      '#dynkin-cartan'
    ];
    return targetSelectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);
  }

  let mathTypesetQueued = false;
  function queueMathTypeset() {
    if (!window.MathJax || mathTypesetQueued) return;
    mathTypesetQueued = true;
    const run = () => {
      mathTypesetQueued = false;
      if (!window.MathJax?.typesetPromise) return;
      const targets = mathTypesetTargets();
      if (!targets.length) return;
      if (window.MathJax.typesetClear) window.MathJax.typesetClear(targets);
      window.MathJax.typesetPromise(targets).catch(() => {});
    };
    if (window.MathJax.startup?.promise) window.MathJax.startup.promise.then(run).catch(() => { mathTypesetQueued = false; });
    else window.setTimeout(run, 0);
  }

  function layoutNodes(type, rank, width, height) {
    const midY = height * 0.52;
    const edge = Math.min(118, Math.max(70, Math.min((width - 172) / Math.max(1, rank - 1), height * 0.22)));
    const nodes = [];
    function line(count, y = midY, centerX = width / 2) {
      const startX = centerX - edge * (count - 1) / 2;
      for (let i = 0; i < count; i++) nodes[i] = { x: startX + edge * i, y };
    }
    if (type === 'A' || type === 'B' || type === 'C' || type === 'F4' || type === 'G2') {
      line(rank);
    } else if (type === 'D') {
      const chainCount = rank - 2;
      const centerX = width / 2 - edge / 2;
      const startX = centerX - edge * (chainCount - 1) / 2;
      for (let i = 0; i < chainCount; i++) {
        nodes[i] = { x: startX + edge * i, y: midY };
      }
      const fork = nodes[rank - 3];
      nodes[rank - 2] = { x: fork.x + edge * Math.cos(Math.PI / 6), y: midY - edge * Math.sin(Math.PI / 6) };
      nodes[rank - 1] = { x: fork.x + edge * Math.cos(Math.PI / 6), y: midY + edge * Math.sin(Math.PI / 6) };
    } else if (type === 'E6' || type === 'E7' || type === 'E8') {
      const chain = rank - 1;
      line(chain);
      nodes[rank - 1] = { x: nodes[2].x, y: midY - edge };
    }
    return nodes;
  }

  function drawDynkin() {
    const canvas = $('dynkin-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, H);

    const nodes = layoutNodes(state.type, state.rank, W, H);
    state.hitboxes = nodes.map((node, index) => ({ ...node, r: 20, index }));
    state.edgeHitboxes = [];
    const C = state.cartan;
    const useQuiverArrows = state.quiverMode && supportsQuiverOrientation(state.type);
    const quiverOrientations = useQuiverArrows ? getQuiverOrientations(state.type, state.rank, C) : null;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < C.length; i++) {
      for (let j = i + 1; j < C.length; j++) {
        if (!C[i][j] && !C[j][i]) continue;
        const multiplicity = Math.max(1, Math.abs(C[i][j] * C[j][i]));
        let arrowTarget = null;
        if (useQuiverArrows) {
          arrowTarget = quiverOrientations[edgeKey(i, j)] === -1 ? i : j;
        } else if (multiplicity > 1) {
          arrowTarget = Math.abs(C[i][j]) > Math.abs(C[j][i]) ? j : i;
        }
        const geometry = drawEdge(ctx, nodes[i], nodes[j], multiplicity, arrowTarget === j ? nodes[j] : arrowTarget === i ? nodes[i] : null);
        state.edgeHitboxes.push({ i, j, ...geometry });
      }
    }
    ctx.restore();

    const sym = cartanSymmetrizer(C);
    const maxD = Math.max(...sym);
    const selectedLookup = new Set(selectedIndices());
    nodes.forEach((node, index) => {
      const selected = selectedLookup.has(index);
      const longRoot = Math.abs(sym[index] - maxD) < 1e-8;
      ctx.beginPath();
      ctx.arc(node.x, node.y, selected ? 20 : 17, 0, Math.PI * 2);
      ctx.fillStyle = selected ? '#3d6b4f' : longRoot ? '#fbfaf7' : '#f1e5d5';
      ctx.fill();
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.strokeStyle = selected ? '#263f31' : '#1a1612';
      ctx.stroke();
      ctx.fillStyle = selected ? '#fffdf8' : '#1a1612';
      ctx.font = '700 14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), node.x, node.y + 0.5);
    });

    ctx.fillStyle = '#7a6f65';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`rank ${state.rank}`, 22, 20);
  }

  function drawEdge(ctx, a, b, multiplicity, arrowTarget) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const radius = 21;
    const start = { x: a.x + ux * radius, y: a.y + uy * radius };
    const end = { x: b.x - ux * radius, y: b.y - uy * radius };
    const offsets = multiplicity === 1 ? [0] : multiplicity === 2 ? [-4, 4] : [-6, 0, 6];
    ctx.strokeStyle = '#1a1612';
    ctx.lineWidth = 2;
    offsets.forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(start.x + px * offset, start.y + py * offset);
      ctx.lineTo(end.x + px * offset, end.y + py * offset);
      ctx.stroke();
    });
    if (arrowTarget) drawArrowHead(ctx, a, b, arrowTarget === b);
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }

  function drawArrowHead(ctx, a, b, pointsToB) {
    const from = pointsToB ? a : b;
    const to = pointsToB ? b : a;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const baseX = to.x - ux * 30;
    const baseY = to.y - uy * 30;
    const back = 13;
    const wing = 9;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX - ux * back - uy * wing, baseY - uy * back + ux * wing);
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX - ux * back + uy * wing, baseY - uy * back - ux * wing);
    ctx.strokeStyle = '#1a1612';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function render() {
    state.cartan = cartanMatrix(state.type, state.rank);
    state.roots = positiveRoots(state.cartan);
    clampSelection();
    syncControls();
    drawDynkin();
    renderInvariants();
    renderVertexData();
    renderParabolic();
    renderStartingFunction();
    renderCartan();
    renderExport();
    syncQuiverControls();
    queueMathTypeset();
  }

  function renderInvariants() {
    const info = invariants(state.type, state.rank, state.cartan, state.roots);
    $('dynkin-status').innerHTML = inlineMath(typeLatex());
    $('dynkin-root-count-label').innerHTML = `positive roots: ${inlineMath(String(info.positiveRoots))}`;
    $('dynkin-invariants').innerHTML = htmlRows([
      ['Lie algebra', inlineMath(`${typeLatex()}\\quad ${lieAlgebraLatex()}`)],
      ['rank', inlineMath(String(info.rank))],
      ['dimension', inlineMath(String(info.dimension))],
      ['roots', inlineMath(`${info.roots}\\text{ total},\\ ${info.positiveRoots}\\text{ positive}`)],
      [inlineMath('h'), inlineMath(String(info.coxeter))],
      [inlineMath('h^\\vee'), inlineMath(String(info.dualCoxeter))],
      ['exponents', inlineMath(info.exponents.join(', '))],
      ['Weyl group order', formatBigInt(info.weylOrder)],
      [inlineMath('\\det C'), inlineMath(String(info.determinant))],
      [inlineMath('P/Q'), inlineMath(centerLatex(state.type, state.rank))]
    ]);
  }

  function renderVertexData() {
    const i = state.selected;
    const indices = selectedIndices();
    const C = state.cartan;
    const e = Array(state.rank).fill(0);
    e[i] = 1;
    const omega = solveLinear(transpose(C), e) || [];
    const highest = state.roots.reduce((best, root) => rootHeight(root) > rootHeight(best) ? root : best, state.roots[0] || e);
    const sym = cartanSymmetrizer(C);
    const maxLength = Math.max(...sym);
    const normalizedLength = 2 * sym[i] / maxLength;
    const neighbors = C[i].map((value, j) => value || C[j][i] ? j + 1 : null).filter((value) => value && value !== i + 1);
    $('dynkin-selected-label').innerHTML = `${state.multiSelect ? 'selected vertices' : 'selected vertex'}: ${inlineMath(selectedNodesLatex(indices))}`;
    $('dynkin-vertex-data').innerHTML = htmlRows([
      ['simple root', inlineMath(`\\alpha_{${i + 1}}`)],
      ['crossed nodes', inlineMath(selectedNodesLatex(indices))],
      [inlineMath('(\\alpha,\\alpha)'), inlineMath(fractionLatex(normalizedLength))],
      ['neighbors', inlineMath(rootsLatex(neighbors))],
      ['Cartan row', inlineMath(vectorLatex(C[i]))],
      ['Cartan column', inlineMath(vectorLatex(C.map((row) => row[i])))],
      ['highest-root mark', inlineMath(String(highest[i]))],
      ['highest root', inlineMath(vectorLatex(highest))],
      [inlineMath('\\omega_i'), inlineMath(vectorLatex(omega))]
    ]);
  }

  function parabolicData(type, rank, selected, roots) {
    const indices = Array.isArray(selected) ? selected.slice().sort((a, b) => a - b) : [selected];
    const nodes = indices.map((index) => index + 1);
    const node = nodes[0];
    const leviPositiveRoots = roots.filter((root) => indices.every((index) => root[index] === 0)).length;
    const nilradicalDimension = roots.length - leviPositiveRoots;
    const dimension = rank + roots.length + leviPositiveRoots;
    const coeffCondition = indices
      .map((index) => `\\operatorname{coeff}_{\\alpha_{${index + 1}}}(\\beta)=0`)
      .join('\\\\');
    return {
      node,
      nodes,
      labelLatex: nodes.length === 1 ? `\\mathfrak{p}_{${node}}` : `\\mathfrak{p}_{\\{${nodes.join(',')}\\}}`,
      rootDefinition: `p_{${nodes.join(',')}} = h + sum_{beta > 0} g_beta + sum_{beta > 0, coeff_i(beta)=0 for all selected i} g_{-beta}`,
      rootDefinitionLatex: `${nodes.length === 1 ? `\\mathfrak{p}_{${node}}` : `\\mathfrak{p}_{\\{${nodes.join(',')}\\}}`}=\\mathfrak{h}\\oplus\\bigoplus_{\\beta\\in\\Phi^+}\\mathfrak{g}_{\\beta}\\oplus\\bigoplus_{\\substack{\\beta\\in\\Phi^+\\\\${coeffCondition}}}\\mathfrak{g}_{-\\beta}`,
      leviPositiveRoots,
      nilradicalDimension,
      dimension,
      model: parabolicMatrixModel(type, rank, indices)
    };
  }

  function parabolicMatrixModel(type, rank, selected) {
    const indices = Array.isArray(selected) ? selected.slice().sort((a, b) => a - b) : [selected];
    const nodes = indices.map((index) => index + 1);
    const i = nodes[0];
    if (type === 'A') {
      const blockSizes = blockSizesFromCuts(rank + 1, nodes);
      return {
        title: `sl(${rank + 1})`,
        titleLatex: lieAlgebraLatex(type, rank),
        blockSizes,
        matrixShape: upperShape(blockSizes.length),
        flag: partialFlagLatex(nodes, rank + 1),
        definitionLines: [
          `${inlineMath(`\\mathfrak{sl}_{${rank + 1}}=\\{X\\in\\operatorname{Mat}_{${rank + 1}}:\\operatorname{tr}(X)=0\\}`)}.`,
          `${inlineMath(parabolicLabelLatex(nodes))} is the trace-zero part of matrices upper triangular for the block split ${inlineMath(blockSizes.join('\\mid '))}.`
        ]
      };
    }
    if (type === 'B') {
      const model = orthosymplecticBlockModel(rank, nodes, 2 * rank + 1);
      return {
        title: `so(${2 * rank + 1})`,
        titleLatex: lieAlgebraLatex(type, rank),
        blockSizes: model.blockSizes,
        matrixShape: upperShape(model.blockSizes.length),
        flag: isotropicFlagLatex(nodes),
        definitionLines: [
          `${inlineMath(`\\mathfrak{so}_{${2 * rank + 1}}=\\{X\\in\\mathfrak{gl}_{${2 * rank + 1}}:X^T J_B+J_BX=0\\}`)}, ${inlineMath(`J_B=\\begin{pmatrix}0&0&I_n\\\\0&1&0\\\\I_n&0&0\\end{pmatrix}`)}.`,
          `${inlineMath(`${parabolicLabelLatex(nodes)}=\\{X\\in\\mathfrak{so}_{${2 * rank + 1}}:XU_j\\subset U_j\\text{ for all }j\\in\\{${nodes.join(',')}\\}\\}`)}.`,
          `The displayed matrix uses the adapted split ${inlineMath(model.splitLatex)}, with sizes ${inlineMath(model.blockSizes.join('\\mid '))}.`
        ]
      };
    }
    if (type === 'C') {
      const model = orthosymplecticBlockModel(rank, nodes, 2 * rank);
      return {
        title: `sp(${2 * rank})`,
        titleLatex: lieAlgebraLatex(type, rank),
        blockSizes: model.blockSizes,
        matrixShape: upperShape(model.blockSizes.length),
        flag: isotropicFlagLatex(nodes),
        definitionLines: [
          `${inlineMath(`\\mathfrak{sp}_{${2 * rank}}=\\{X\\in\\mathfrak{gl}_{${2 * rank}}:X^T J_C+J_CX=0\\}`)}, ${inlineMath(`J_C=\\begin{pmatrix}0&I_n\\\\-I_n&0\\end{pmatrix}`)}.`,
          `${inlineMath(`${parabolicLabelLatex(nodes)}=\\{X\\in\\mathfrak{sp}_{${2 * rank}}:XU_j\\subset U_j\\text{ for all }j\\in\\{${nodes.join(',')}\\}\\}`)}.`,
          `The displayed matrix uses the adapted split ${inlineMath(model.splitLatex)}, with sizes ${inlineMath(model.blockSizes.join('\\mid '))}.`
        ]
      };
    }
    if (type === 'D') {
      const spinNodes = nodes.filter((node) => node >= rank - 1);
      const ordinaryNodes = nodes.filter((node) => node <= rank - 2);
      if (!spinNodes.length) {
        const model = orthosymplecticBlockModel(rank, ordinaryNodes, 2 * rank);
        return {
          title: `so(${2 * rank})`,
          titleLatex: lieAlgebraLatex(type, rank),
          blockSizes: model.blockSizes,
          matrixShape: upperShape(model.blockSizes.length),
          flag: isotropicFlagLatex(ordinaryNodes),
          definitionLines: [
            `${inlineMath(`\\mathfrak{so}_{${2 * rank}}=\\{X\\in\\mathfrak{gl}_{${2 * rank}}:X^T J_D+J_DX=0\\}`)}, ${inlineMath(`J_D=\\begin{pmatrix}0&I_n\\\\I_n&0\\end{pmatrix}`)}.`,
            `${inlineMath(`${parabolicLabelLatex(nodes)}=\\{X\\in\\mathfrak{so}_{${2 * rank}}:XU_j\\subset U_j\\text{ for all }j\\in\\{${ordinaryNodes.join(',')}\\}\\}`)}.`,
            `The displayed matrix uses the adapted split ${inlineMath(model.splitLatex)}, with sizes ${inlineMath(model.blockSizes.join('\\mid '))}.`
          ]
        };
      }
      const spinNode = spinNodes[spinNodes.length - 1];
      const spinBasis = spinNode === rank
        ? `\\langle e_1,\\ldots,e_n\\rangle`
        : `\\langle e_1,\\ldots,e_{n-1},e_n^*\\rangle`;
      const spinBlockSizes = ordinaryNodes.length
        ? blockSizesFromCuts(rank, ordinaryNodes).concat(blockSizesFromCuts(rank, ordinaryNodes).slice().reverse())
        : [rank, rank];
      return {
        title: `so(${2 * rank})`,
        titleLatex: lieAlgebraLatex(type, rank),
        blockSizes: spinBlockSizes,
        matrixShape: upperShape(spinBlockSizes.length),
        flag: ordinaryNodes.length ? `${isotropicFlagLatex(ordinaryNodes)}\\,\\subset\\, L` : `L=${spinBasis}`,
        definitionLines: [
          `${inlineMath(`\\mathfrak{so}_{${2 * rank}}=\\{X\\in\\mathfrak{gl}_{${2 * rank}}:X^T J_D+J_DX=0\\}`)}, ${inlineMath(`J_D=\\begin{pmatrix}0&I_n\\\\I_n&0\\end{pmatrix}`)}.`,
          `${inlineMath(`${parabolicLabelLatex(nodes)}=\\{X\\in\\mathfrak{so}_{${2 * rank}}:XL\\subset L${ordinaryNodes.length ? ',\\ XU_j\\subset U_j\\text{ for the selected }j\\le n-2' : ''}\\}`)} for ${inlineMath(`L=${spinBasis}`)}.`,
          `The displayed matrix uses an adapted split with sizes ${inlineMath(spinBlockSizes.join('\\mid '))}.`
        ]
      };
    }
    return {
      title: typeLabel(type, rank),
      titleLatex: lieAlgebraLatex(type, rank),
      blockSizes: [],
      matrixShape: [],
      flag: '\\text{root-space standard parabolic}',
      definitionLines: [
        `No compact classical block matrix model is attached here.`,
        `The displayed ${inlineMath(parabolicLabelLatex(nodes))} is the standard parabolic defined by the crossed nodes ${inlineMath(nodes.map((node) => `\\alpha_{${node}}`).join(', '))}.`
      ]
    };
  }

  function parabolicLabelLatex(nodes) {
    return nodes.length === 1 ? `\\mathfrak{p}_{${nodes[0]}}` : `\\mathfrak{p}_{\\{${nodes.join(',')}\\}}`;
  }

  function blockSizesFromCuts(total, cuts) {
    const validCuts = cuts
      .filter((cut) => cut > 0 && cut < total)
      .filter((cut, position, values) => values.indexOf(cut) === position)
      .sort((a, b) => a - b);
    const endpoints = [0].concat(validCuts, [total]);
    return endpoints.slice(1).map((value, index) => value - endpoints[index]).filter((value) => value > 0);
  }

  function partialFlagLatex(dimensions, ambientDimension) {
    if (!dimensions.length) return `\\mathbb{C}^{${ambientDimension}}`;
    return dimensions
      .map((dimension) => `\\mathbb{C}^{${dimension}}`)
      .join('\\,\\subset\\,') + `\\,\\subset\\,\\mathbb{C}^{${ambientDimension}}`;
  }

  function isotropicFlagLatex(dimensions) {
    if (!dimensions.length) return '\\text{standard isotropic flag}';
    return dimensions.map((dimension) => `U_{${dimension}}`).join('\\,\\subset\\,');
  }

  function orthosymplecticBlockModel(rank, dimensions, ambientDimension) {
    const cuts = dimensions.filter((dimension) => dimension > 0 && dimension <= rank);
    const largest = cuts.length ? Math.max(...cuts) : 0;
    const leftSizes = largest ? blockSizesFromCuts(largest, cuts) : [];
    const middle = ambientDimension - 2 * largest;
    const blockSizes = leftSizes.slice();
    const splitParts = cuts.map((dimension) => `U_{${dimension}}/U_{${previousCut(cuts, dimension)}}`);
    if (middle > 0) {
      blockSizes.push(middle);
      splitParts.push(`U_{${largest}}^{\\perp}/U_{${largest}}`);
    }
    blockSizes.push(...leftSizes.slice().reverse());
    splitParts.push(...cuts.slice().reverse().map((dimension) => `(U_{${dimension}}/U_{${previousCut(cuts, dimension)}})^{\\vee}`));
    return {
      blockSizes,
      splitLatex: splitParts.join('\\mid ')
    };
  }

  function previousCut(cuts, dimension) {
    const index = cuts.indexOf(dimension);
    return index > 0 ? cuts[index - 1] : 0;
  }

  function renderParabolic() {
    const indices = selectedIndices();
    const data = parabolicData(state.type, state.rank, indices, state.roots);
    const model = data.model;
    const blockText = model.blockSizes.length ? inlineMath(model.blockSizes.join('\\mid ')) : 'root-space only';
    const definitionHtml = model.definitionLines
      .map((line) => `<div>${line}</div>`)
      .join('');
    $('dynkin-parabolic').innerHTML = [
      `<div class="parabolic-summary">standard parabolic for crossed nodes ${inlineMath(selectedNodesLatex(indices))}<br>model: ${inlineMath(model.titleLatex)}<br>blocks: ${blockText}</div>`,
      renderParabolicMatrix(model, data.labelLatex),
      `<div class="parabolic-detail-group"><div class="parabolic-definition">${displayMath(data.rootDefinitionLatex)}</div><div class="parabolic-tex-lines">${definitionHtml}</div></div>`,
      `<div class="parabolic-stats">${htmlRows([
        ['flag', inlineMath(model.flag)],
        [inlineMath('\\dim\\mathfrak{p}'), inlineMath(String(data.dimension))],
        [inlineMath('\\dim\\mathfrak{u}'), inlineMath(String(data.nilradicalDimension))],
        ['Levi positive roots', inlineMath(String(data.leviPositiveRoots))]
      ])}</div>`
    ].join('');
  }

  function renderParabolicMatrix(model, labelLatex) {
    if (!model.matrixShape.length) return '';
    const matrix = matrixShapeLatex(model.matrixShape, model.blockSizes);
    return `<div class="parabolic-matrix-wrap">${displayMath(`${labelLatex}=${matrix}`)}</div>`;
  }

  function upperShape(size) {
    return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => c >= r));
  }

  function matrixShapeLatex(shape, blockSizes) {
    const rows = [];
    const totalSize = blockSizes.reduce((sum, value) => sum + value, 0);
    shape.forEach((blockRow, r) => {
      for (let innerRow = 0; innerRow < blockSizes[r]; innerRow++) {
        const cells = [];
        blockRow.forEach((free, c) => {
          for (let innerCol = 0; innerCol < blockSizes[c]; innerCol++) {
            cells.push(free ? '\\ast' : '');
          }
        });
        rows.push(cells.join(' & '));
      }
    });
    if (totalSize >= 8) return compactMatrixLatex(rows);
    return `\\begin{pmatrix}${rows.join('\\\\')}\\end{pmatrix}`;
  }

  function compactMatrixLatex(rows) {
    return `\\left(\\begin{smallmatrix}${rows.join('\\\\')}\\end{smallmatrix}\\right)`;
  }

  function renderStartingFunction() {
    const target = $('dynkin-starting-function');
    const selected = state.selected;
    const available = supportsStartingFunction(state.type);
    syncStartingFunctionControls(available);
    if (!available) {
      target.innerHTML = `<div class="starting-note">${inlineMath('\\dim\\operatorname{Hom}(P(i),M)')} is shown here for Dynkin types ${inlineMath('A,B,C,D,E,F_4,G_2')}.</div>`;
      return;
    }
    const layout = getStartingFunctionLayout(state.type, state.rank, state.cartan);
    if (state.startingFunctionARMode && canShowStartingFunctionAR()) {
      const data = auslanderReitenDataFromStartingFunctions(state.type, state.rank, state.cartan, layout);
      target.innerHTML = [
        `<div class="ar-summary">${inlineMath('\\Gamma_Q')} simulated from the starting-function charts for the current ${inlineMath('A,D,E')} quiver orientation.</div>`,
        auslanderReitenChartMarkup(data, layout)
      ].join('');
      return;
    }
    const chart = startingFunctionChart(state.type, state.rank, state.cartan, selected, layout);
    target.innerHTML = [
      `<div class="starting-summary">${inlineMath(`M_\\beta\\mapsto\\dim\\operatorname{Hom}(P(${selected + 1}),M_\\beta)=\\operatorname{coeff}_{\\alpha_{${selected + 1}}}(\\beta)`)}.</div>`,
      startingFunctionChartMarkup(chart, layout)
    ].join('');
  }

  function canShowStartingFunctionAR() {
    return state.quiverMode && supportsQuiverOrientation(state.type);
  }

  function startingFunctionChart(type, rank, C, selected, layout) {
    const columnsByVertex = layout.positions.map((position) => position.col);
    const layers = startingFunctionLayers(type, rank, C, columnsByVertex);
    const rows = [];
    const seen = new Set();
    const coxeter = invariants(type, rank, C, state.roots).coxeter;
    const rowCount = coxeter - 1;
    const startColor = layers.findIndex((layer) => layer.includes(selected));
    const prefix = [];
    for (let row = 0; row < rowCount; row++) {
      const color = startColor >= 0 ? (startColor + row) % layers.length : row % layers.length;
      const vertices = layers[color] || [];
      vertices.forEach((vertex, index) => {
        let root = simpleRoot(rank, vertex);
        for (let step = prefix.length - 1; step >= 0; step--) {
          root = reflectRoot(root, prefix[step], C);
        }
        const rootKey = key(root);
        if (root[selected] > 0 && root.every((value) => value >= 0) && !seen.has(rootKey)) {
          rows.push({
            row: row + 1,
            col: columnsByVertex[vertex],
            value: root[selected],
            root
          });
          seen.add(rootKey);
        }
      });
      prefix.push(...vertices);
    }
    return { cells: rows, columns: layout.columns, rows: rowCount };
  }

  function startingFunctionLayers(type, rank, C, columnsByVertex) {
    return bipartiteColorClasses(C, columnsByVertex);
  }

  function startingFunctionChartMarkup(chart, layout) {
    if (state.startingFunctionTransposed) return transposedStartingFunctionMarkup(chart, layout);

    const header = state.startingFunctionHeaderVisible
      ? `<div class="starting-vertex-grid" data-starting-columns="${chart.columns}" aria-label="Starting function vertex columns">` +
          `${startingFunctionVertexLineSvg(layout, state.cartan, false, chart.columns, 2)}` +
          `${startingFunctionVertexLabels(layout, false)}` +
        `</div>`
      : '';
    return `<div class="starting-chart-wrap"><div class="starting-chart-stack" style="--starting-cols:${chart.columns};">` +
      header +
      `<div class="starting-chart-grid">${startingFunctionCells(chart.cells, 0, false)}</div>` +
    `</div></div>`;
  }

  function transposedStartingFunctionMarkup(chart, layout) {
    const headerOffset = state.startingFunctionHeaderVisible ? 2 : 0;
    const totalColumns = headerOffset + chart.rows;
    const header = state.startingFunctionHeaderVisible
      ? startingFunctionVertexLineSvg(layout, state.cartan, true, totalColumns, chart.columns) + startingFunctionVertexLabels(layout, true)
      : '';
    return `<div class="starting-chart-wrap"><div class="starting-chart-stack">` +
      `<div class="starting-transpose-grid" data-starting-columns="${chart.columns}" data-starting-transposed="true" ` +
        `style="--starting-transpose-cols:${totalColumns};--starting-transpose-rows:${chart.columns};">` +
        header +
        `${startingFunctionCells(chart.cells, headerOffset, true)}` +
      `</div>` +
    `</div></div>`;
  }

  function startingFunctionCells(cells, columnOffset, transposed) {
    return cells
      .map((cell) => {
        const value = cell.value ? inlineMath(String(cell.value)) : '&nbsp;';
        const className = cell.value ? 'starting-chart-cell' : 'starting-chart-cell is-empty';
        const title = cell.value ? ` title="${escapeHtml(rootTooltip(cell.root))}"` : '';
        const row = transposed ? cell.col : cell.row;
        const col = transposed ? cell.row + columnOffset : cell.col;
        return `<span class="${className}" style="grid-row:${row};grid-column:${col};"${title}>${value}</span>`;
      })
      .join('');
  }

  function startingFunctionVertexLabels(layout, transposed) {
    const selectedVertices = startingFunctionHeaderSelection();
    return layout.positions
      .map((position, vertex) => {
        const selected = selectedVertices.has(vertex) ? ' is-selected' : '';
        const row = transposed ? position.col : position.row;
        const col = transposed ? position.row : position.col;
        return `<button type="button" class="starting-vertex-label${selected}" ` +
          `data-starting-vertex="${vertex}" data-starting-row="${position.row}" data-starting-column="${position.col}" ` +
          `data-starting-transposed="${transposed ? 'true' : 'false'}" ` +
          `style="grid-row:${row};grid-column:${col};" aria-label="Vertex ${vertex + 1}">${vertex + 1}</button>`;
      })
      .join('');
  }

  function startingFunctionHeaderSelection() {
    return state.startingFunctionARMode && canShowStartingFunctionAR()
      ? new Set(selectedIndices())
      : new Set([state.selected]);
  }

  function startingFunctionVertexLineSvg(layout, C, transposed, viewColumns, viewRows, options = {}) {
    const lines = [];
    const quiverOrientations = options.quiver && state.quiverMode && supportsQuiverOrientation(state.type)
      ? getQuiverOrientations(state.type, state.rank, C)
      : null;
    for (let i = 0; i < C.length; i++) {
      for (let j = i + 1; j < C.length; j++) {
        if (!C[i][j] && !C[j][i]) continue;
        const a = layout.positions[i];
        const b = layout.positions[j];
        if (!a || !b) continue;
        const start = {
          x: transposed ? a.row - 0.5 : a.col - 0.5,
          y: transposed ? a.col - 0.5 : a.row - 0.5
        };
        const end = {
          x: transposed ? b.row - 0.5 : b.col - 0.5,
          y: transposed ? b.col - 0.5 : b.row - 0.5
        };
        const multiplicity = Math.max(1, Math.abs(C[i][j] * C[j][i]));
        let arrowTarget = null;
        if (quiverOrientations) {
          arrowTarget = quiverOrientations[edgeKey(i, j)] === -1 ? start : end;
        } else if (multiplicity > 1) {
          arrowTarget = Math.abs(C[i][j]) > Math.abs(C[j][i]) ? end : start;
        }
        lines.push(startingFunctionEdgeSvg(start, end, multiplicity, arrowTarget));
      }
    }
    if (!lines.length) return '';
    const interactive = options.interactive ? ' is-interactive' : '';
    const ariaHidden = options.interactive ? 'false' : 'true';
    return `<svg class="starting-vertex-lines${interactive}" viewBox="0 0 ${viewColumns} ${viewRows}" preserveAspectRatio="none" aria-hidden="${ariaHidden}">${lines.join('')}</svg>`;
  }

  function startingFunctionEdgeSvg(start, end, multiplicity, arrowTarget) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const offsetScale = 0.075;
    const offsets = multiplicity === 1 ? [0] : multiplicity === 2 ? [-offsetScale, offsetScale] : [-offsetScale * 1.35, 0, offsetScale * 1.35];
    const lines = offsets.map((offset) => {
      const x1 = start.x + px * offset;
      const y1 = start.y + py * offset;
      const x2 = end.x + px * offset;
      const y2 = end.y + py * offset;
      return `<line x1="${formatSvgNumber(x1)}" y1="${formatSvgNumber(y1)}" x2="${formatSvgNumber(x2)}" y2="${formatSvgNumber(y2)}" vector-effect="non-scaling-stroke"></line>`;
    });
    if (arrowTarget) lines.push(startingFunctionArrowSvg(start, end, arrowTarget === end));
    return lines.join('');
  }

  function startingFunctionArrowSvg(start, end, pointsToEnd) {
    const from = pointsToEnd ? start : end;
    const to = pointsToEnd ? end : start;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const tipX = to.x - ux * 0.48;
    const tipY = to.y - uy * 0.48;
    const back = 0.17;
    const wing = 0.115;
    const x1 = tipX - ux * back + px * wing;
    const y1 = tipY - uy * back + py * wing;
    const x2 = tipX - ux * back - px * wing;
    const y2 = tipY - uy * back - py * wing;
    return `<path d="M ${formatSvgNumber(x1)} ${formatSvgNumber(y1)} L ${formatSvgNumber(tipX)} ${formatSvgNumber(tipY)} L ${formatSvgNumber(x2)} ${formatSvgNumber(y2)}" vector-effect="non-scaling-stroke"></path>`;
  }

  function formatSvgNumber(value) {
    return Number(value.toFixed(4));
  }

  function auslanderReitenDataFromStartingFunctions(type, rank, C, layout) {
    const columnsByVertex = layout.positions.map((position) => position.col);
    const layers = bipartiteColorClasses(C, columnsByVertex);
    const heights = quiverVertexHeights(rank, C, getQuiverOrientations(type, rank, C));
    const minHeight = Math.min(...heights);
    const normalizedHeights = heights.map((height) => height - minHeight);
    const charts = Array.from({ length: rank }, (_, vertex) => startingFunctionRowsForVertex(type, rank, C, vertex, layers, columnsByVertex));
    const cellsByPosition = new Map();
    for (let vertex = 0; vertex < rank; vertex++) {
      const shift = normalizedHeights[vertex];
      charts[vertex].forEach((cell) => {
        const row = cell.row + shift;
        const col = cell.col;
        const positionKey = `${row}:${col}`;
        if (!cellsByPosition.has(positionKey)) {
          cellsByPosition.set(positionKey, {
            row,
            col,
            vertex: cell.vertex,
            root: Array(rank).fill(0)
          });
        }
        const positionCell = cellsByPosition.get(positionKey);
        if (positionCell.vertex == null) positionCell.vertex = cell.vertex;
        positionCell.root[vertex] = cell.value;
      });
    }
    const cells = Array.from(cellsByPosition.values())
      .map((cell) => ({ ...cell, key: key(cell.root) }))
      .sort((a, b) => a.row - b.row || a.col - b.col);
    return {
      cells,
      columns: layout.columns,
      rows: Math.max(...cells.map((cell) => cell.row), 1),
      heights: normalizedHeights,
      cartan: C,
      crowdedColumns: startingFunctionCrowdedColumns(layout)
    };
  }

  function startingFunctionCrowdedColumns(layout) {
    const counts = new Map();
    layout.positions.forEach((position) => {
      counts.set(position.col, (counts.get(position.col) || 0) + 1);
    });
    return new Set(Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([column]) => column));
  }

  function startingFunctionRowsForVertex(type, rank, C, selected, layers, columnsByVertex) {
    const rows = [];
    const seen = new Set();
    const coxeter = invariants(type, rank, C, state.roots).coxeter;
    const rowCount = coxeter - 1;
    const startColor = layers.findIndex((layer) => layer.includes(selected));
    const prefix = [];
    for (let row = 0; row < rowCount; row++) {
      const color = startColor >= 0 ? (startColor + row) % layers.length : row % layers.length;
      const vertices = layers[color] || [];
      vertices.forEach((vertex) => {
        let root = simpleRoot(rank, vertex);
        for (let step = prefix.length - 1; step >= 0; step--) {
          root = reflectRoot(root, prefix[step], C);
        }
        const rootKey = key(root);
        if (root[selected] > 0 && root.every((value) => value >= 0) && !seen.has(rootKey)) {
          rows.push({
            row: row + 1,
            col: columnsByVertex[vertex],
            vertex,
            value: root[selected],
            root
          });
          seen.add(rootKey);
        }
      });
      prefix.push(...vertices);
    }
    return rows;
  }

  function quiverVertexHeights(rank, C, orientations) {
    const heights = Array(rank).fill(null);
    for (let start = 0; start < rank; start++) {
      if (heights[start] != null) continue;
      heights[start] = 0;
      const queue = [start];
      while (queue.length) {
        const vertex = queue.shift();
        for (let neighbor = 0; neighbor < rank; neighbor++) {
          if (neighbor === vertex || (!C[vertex][neighbor] && !C[neighbor][vertex])) continue;
          const delta = quiverHeightDelta(vertex, neighbor, orientations);
          const nextHeight = heights[vertex] + delta;
          if (heights[neighbor] == null) {
            heights[neighbor] = nextHeight;
            queue.push(neighbor);
          }
        }
      }
    }
    return heights.map((height) => height ?? 0);
  }

  function quiverHeightDelta(from, to, orientations) {
    const sign = orientations[edgeKey(from, to)] || 1;
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    const tail = sign === 1 ? low : high;
    const head = sign === 1 ? high : low;
    if (from === tail && to === head) return 1;
    if (from === head && to === tail) return -1;
    return 0;
  }

  function auslanderReitenChartMarkup(data, layout) {
    if (state.startingFunctionTransposed) return transposedAuslanderReitenChartMarkup(data, layout);
    const header = state.startingFunctionHeaderVisible
      ? `<div class="starting-vertex-grid" data-starting-columns="${data.columns}" aria-label="AR quiver vertex columns">` +
          `${startingFunctionVertexLineSvg(layout, state.cartan, false, data.columns, 2, { quiver: true, interactive: true })}` +
          `${startingFunctionVertexLabels(layout, false)}` +
        `</div>`
      : '';
    return `<div class="ar-chart-wrap"><div class="ar-chart-stack" style="--starting-cols:${data.columns};">` +
      header +
      `<div class="starting-chart-grid" style="position:relative;">${auslanderReitenArrowSvg(data, 0, false)}${auslanderReitenCells(data, 0, false)}</div>` +
    `</div></div>`;
  }

  function transposedAuslanderReitenChartMarkup(data, layout) {
    const headerOffset = state.startingFunctionHeaderVisible ? 2 : 0;
    const totalColumns = headerOffset + data.rows;
    const header = state.startingFunctionHeaderVisible
      ? startingFunctionVertexLineSvg(layout, state.cartan, true, totalColumns, data.columns, { quiver: true, interactive: true }) + startingFunctionVertexLabels(layout, true)
      : '';
    return `<div class="ar-chart-wrap"><div class="ar-chart-stack">` +
      `<div class="starting-transpose-grid" data-starting-columns="${data.columns}" data-starting-transposed="true" ` +
        `style="--starting-transpose-cols:${totalColumns};--starting-transpose-rows:${data.columns};">` +
        header +
        `${auslanderReitenArrowSvg(data, headerOffset, true)}` +
        `${auslanderReitenCells(data, headerOffset, true)}` +
      `</div>` +
    `</div></div>`;
  }

  function auslanderReitenCells(data, columnOffset, transposed) {
    const visibleVertices = state.arHideUnselected && state.startingFunctionARMode
      ? new Set(selectedIndices())
      : null;
    return data.cells.map((cell) => {
      const viewRow = transposed ? cell.col : cell.row;
      const viewCol = transposed ? cell.row + columnOffset : cell.col;
      const title = ` title="${escapeHtml(rootTooltip(cell.root))}"`;
      return `<span class="ar-vector-cell" style="grid-row:${viewRow};grid-column:${viewCol};"${title}>${dimensionVectorLabel(cell.root, state.type, state.rank, visibleVertices)}</span>`;
    }).join('');
  }

  function dimensionVectorLabel(root, type, rank, visibleVertices = null) {
    if (!root.some(Boolean)) return '<span class="ar-vector-label is-single">0</span>';
    if (root.length === 1) return `<span class="ar-vector-label is-single">${root[0]}</span>`;
    const layout = dimensionVectorLayout(type, rank);
    if (!layout) return `<span class="ar-vector-label is-single">${escapeHtml(root.join(''))}</span>`;
    const entries = root.map((value, index) => {
      const point = layout.points[index] || { row: 1, col: index + 1 };
      const hidden = visibleVertices && !visibleVertices.has(index) ? ' class="is-hidden-coordinate"' : '';
      return `<span${hidden} style="grid-row:${point.row};grid-column:${point.col};">${escapeHtml(String(value || 0))}</span>`;
    }).join('');
    return `<span class="ar-vector-label is-diagram" style="--ar-vector-cols:${layout.columns};--ar-vector-rows:${layout.rows};">${entries}</span>`;
  }

  function dimensionVectorLayout(type, rank) {
    if (type === 'A') {
      return {
        columns: rank,
        rows: 1,
        points: Array.from({ length: rank }, (_, index) => ({ row: 1, col: index + 1 }))
      };
    }
    if (type === 'D') {
      const columns = Math.max(3, rank - 1);
      const points = Array(rank);
      for (let index = 0; index <= rank - 3; index++) points[index] = { row: 2, col: index + 1 };
      points[rank - 2] = { row: 1, col: columns };
      points[rank - 1] = { row: 3, col: columns };
      return { columns, rows: 3, points };
    }
    if (type === 'E6' || type === 'E7' || type === 'E8') {
      const points = Array(rank);
      for (let index = 0; index <= rank - 2; index++) points[index] = { row: 2, col: index + 1 };
      points[rank - 1] = { row: 1, col: 3 };
      return { columns: rank - 1, rows: 2, points };
    }
    return null;
  }

  function auslanderReitenArrowSvg(data, columnOffset, transposed) {
    const arrows = [
      ...auslanderReitenSolidArrows(data),
      ...auslanderReitenDashedArrows(data)
    ];
    if (!arrows.length) return '';
    const columns = transposed ? data.rows + columnOffset : data.columns;
    const rows = transposed ? data.columns : data.rows;
    const paths = arrows.map((arrow) => arArrowPath(arrow.from, arrow.to, columnOffset, transposed, arrow.dashed)).join('');
    return `<svg class="ar-arrow-lines" viewBox="0 0 ${columns} ${rows}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  }

  function auslanderReitenSolidArrows(data) {
    const cells = data.cells;
    const arrows = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        if (Math.abs(a.row - b.row) !== 1) continue;
        if (!areDynkinAdjacent(data.cartan, a.vertex, b.vertex)) continue;
        const from = a.row < b.row ? a : b;
        const to = a.row < b.row ? b : a;
        arrows.push({ from, to, dashed: false });
      }
    }
    return uniqueArArrows(arrows);
  }

  function auslanderReitenDashedArrows(data) {
    const cells = data.cells;
    const arrows = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        if (Math.abs(a.row - b.row) !== 2) continue;
        if (a.vertex == null || a.vertex !== b.vertex) continue;
        if (data.crowdedColumns && data.crowdedColumns.has(a.col)) continue;
        const from = a.row > b.row ? a : b;
        const to = a.row > b.row ? b : a;
        arrows.push({ from, to, dashed: true });
      }
    }
    return uniqueArArrows(arrows);
  }

  function areDynkinAdjacent(C, a, b) {
    return Number.isInteger(a) && Number.isInteger(b) && a !== b &&
      Boolean((C[a] && C[a][b]) || (C[b] && C[b][a]));
  }

  function uniqueArArrows(arrows) {
    const seen = new Set();
    return arrows.filter((arrow) => {
      const arrowKey = `${arCellKey(arrow.from)}>${arCellKey(arrow.to)}:${arrow.dashed ? 'd' : 's'}`;
      if (seen.has(arrowKey)) return false;
      seen.add(arrowKey);
      return true;
    });
  }

  function arCellKey(cell) {
    return `${cell.row}:${cell.col}:${cell.vertex}:${cell.key}`;
  }

  function arArrowPath(from, to, columnOffset, transposed, dashed) {
    const x1 = transposed ? from.row + columnOffset - 0.5 : from.col - 0.5;
    const y1 = transposed ? from.col - 0.5 : from.row - 0.5;
    const x2 = transposed ? to.row + columnOffset - 0.5 : to.col - 0.5;
    const y2 = transposed ? to.col - 0.5 : to.row - 0.5;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const startX = x1 + ux * 0.26;
    const startY = y1 + uy * 0.26;
    const tipX = x2 - ux * 0.28;
    const tipY = y2 - uy * 0.28;
    const back = 0.12;
    const wing = 0.075;
    const px = -uy;
    const py = ux;
    const a1x = tipX - ux * back + px * wing;
    const a1y = tipY - uy * back + py * wing;
    const a2x = tipX - ux * back - px * wing;
    const a2y = tipY - uy * back - py * wing;
    const className = dashed ? ' class="is-dashed"' : '';
    return `<path${className} d="M ${formatSvgNumber(startX)} ${formatSvgNumber(startY)} L ${formatSvgNumber(tipX)} ${formatSvgNumber(tipY)} M ${formatSvgNumber(a1x)} ${formatSvgNumber(a1y)} L ${formatSvgNumber(tipX)} ${formatSvgNumber(tipY)} L ${formatSvgNumber(a2x)} ${formatSvgNumber(a2y)}" vector-effect="non-scaling-stroke"></path>`;
  }

  function getStartingFunctionLayout(type, rank, C) {
    const layoutKey = startingFunctionLayoutKey(type, rank);
    const existing = state.startingFunctionLayouts[layoutKey];
    if (isValidStartingFunctionLayout(existing, rank)) return existing;
    const layout = defaultStartingFunctionLayout(type, rank, C);
    state.startingFunctionLayouts[layoutKey] = layout;
    return layout;
  }

  function startingFunctionLayoutKey(type, rank) {
    return `${type}:${rank}`;
  }

  function isValidStartingFunctionLayout(layout, rank) {
    return Boolean(layout && Number.isInteger(layout.columns) && layout.columns > 0 &&
      Array.isArray(layout.positions) && layout.positions.length === rank &&
      layout.positions.every((position) => position &&
        (position.row === 1 || position.row === 2) &&
        Number.isInteger(position.col) &&
        position.col >= 1 &&
        position.col <= layout.columns));
  }

  function defaultStartingFunctionLayout(type, rank, C) {
    const colors = bipartiteVertexColors(C);
    const columns = startingFunctionDefaultColumnCount(type, rank);
    const positions = Array.from({ length: rank }, (_, vertex) => ({
      row: (colors[vertex] || 0) + 1,
      col: startingFunctionDefaultColumn(type, rank, vertex)
    }));
    return { columns, positions };
  }

  function startingFunctionDefaultColumnCount(type, rank) {
    return (type === 'E6' || type === 'E7' || type === 'E8') ? rank - 1 : rank;
  }

  function startingFunctionDefaultColumn(type, rank, vertex) {
    if (type === 'E6' || type === 'E7' || type === 'E8') {
      return vertex === rank - 1 ? 3 : vertex + 1;
    }
    return vertex + 1;
  }

  function bipartiteColorClasses(C, columnsByVertex) {
    const colors = [[], []];
    const assigned = bipartiteVertexColors(C);
    assigned.forEach((color, vertex) => colors[color].push(vertex));
    return colors.map((group) => group.sort((a, b) => columnsByVertex[a] - columnsByVertex[b] || a - b));
  }

  function orientedStartingFunctionLayers(C, columnsByVertex, orientations) {
    const rank = C.length;
    const current = { ...orientations };
    const layers = [];
    const maxLayers = Math.max(2, rank * 4);
    for (let step = 0; step < maxLayers; step++) {
      const sources = [];
      for (let vertex = 0; vertex < rank; vertex++) {
        if (isQuiverSource(vertex, C, current)) sources.push(vertex);
      }
      const layer = (sources.length ? sources : [step % rank])
        .sort((a, b) => columnsByVertex[a] - columnsByVertex[b] || a - b);
      layers.push(layer);
      layer.forEach((vertex) => reverseIncidentQuiverEdges(vertex, C, current));
      if (layers.length >= 2 && quiverOrientationMatches(current, orientations)) break;
    }
    return layers.length ? layers : bipartiteColorClasses(C, columnsByVertex);
  }

  function isQuiverSource(vertex, C, orientations) {
    for (let neighbor = 0; neighbor < C.length; neighbor++) {
      if (neighbor === vertex || (!C[vertex][neighbor] && !C[neighbor][vertex])) continue;
      const sign = orientations[edgeKey(vertex, neighbor)] || 1;
      const low = Math.min(vertex, neighbor);
      const high = Math.max(vertex, neighbor);
      const tail = sign === 1 ? low : high;
      if (tail !== vertex) return false;
    }
    return true;
  }

  function reverseIncidentQuiverEdges(vertex, C, orientations) {
    for (let neighbor = 0; neighbor < C.length; neighbor++) {
      if (neighbor === vertex || (!C[vertex][neighbor] && !C[neighbor][vertex])) continue;
      const keyName = edgeKey(vertex, neighbor);
      orientations[keyName] = -(orientations[keyName] || 1);
    }
  }

  function quiverOrientationMatches(a, b) {
    const keys = Object.keys(b);
    return keys.length > 0 && keys.every((keyName) => a[keyName] === b[keyName]);
  }

  function bipartiteVertexColors(C) {
    const assigned = Array(C.length).fill(null);
    for (let start = 0; start < C.length; start++) {
      if (assigned[start] != null) continue;
      assigned[start] = 0;
      const queue = [start];
      while (queue.length) {
        const current = queue.shift();
        for (let next = 0; next < C.length; next++) {
          if (!C[current][next] && !C[next][current]) continue;
          if (assigned[next] == null) {
            assigned[next] = 1 - assigned[current];
            queue.push(next);
          }
        }
      }
    }
    return assigned.map((color) => color || 0);
  }

  function simpleRoot(rank, vertex) {
    const root = Array(rank).fill(0);
    root[vertex] = 1;
    return root;
  }

  function reflectRoot(root, vertex, C) {
    const bracket = root.reduce((sum, value, index) => sum + value * C[index][vertex], 0);
    const next = root.slice();
    next[vertex] -= bracket;
    return next;
  }

  function rootTooltip(root) {
    return `beta = ${root.map((value, index) => value ? `${value === 1 ? '' : value}alpha_${index + 1}` : '').filter(Boolean).join(' + ')}`;
  }

  function renderCartan() {
    $('dynkin-cartan').innerHTML = displayMath(matrixLatex(state.cartan, 'pmatrix'));
  }

  function matrixLatex(matrix, environment = 'bmatrix') {
    const rows = matrix.map((row) => row.join(' & ')).join('\\\\');
    return `\\begin{${environment}}${rows}\\end{${environment}}`;
  }

  function edgeKey(i, j) {
    return i < j ? `${i}-${j}` : `${j}-${i}`;
  }

  function quiverLayoutKey(type, rank) {
    return `${type}:${rank}`;
  }

  function defaultQuiverOrientations(C) {
    const orientations = {};
    for (let i = 0; i < C.length; i++) {
      for (let j = i + 1; j < C.length; j++) {
        if (!C[i][j] && !C[j][i]) continue;
        const multiplicity = Math.max(1, Math.abs(C[i][j] * C[j][i]));
        orientations[edgeKey(i, j)] = multiplicity === 1
          ? 1
          : Math.abs(C[i][j]) > Math.abs(C[j][i]) ? 1 : -1;
      }
    }
    return orientations;
  }

  function getQuiverOrientations(type, rank, C) {
    const layoutKey = quiverLayoutKey(type, rank);
    const defaults = defaultQuiverOrientations(C);
    const existing = state.quiverOrientations[layoutKey];
    if (!existing) {
      state.quiverOrientations[layoutKey] = defaults;
      return defaults;
    }
    const next = { ...defaults };
    Object.keys(next).forEach((key) => {
      if (existing[key] === -1 || existing[key] === 1) next[key] = existing[key];
    });
    state.quiverOrientations[layoutKey] = next;
    return next;
  }

  function toggleQuiverEdge(i, j) {
    if (!state.quiverMode || !supportsQuiverOrientation(state.type)) return;
    const orientations = getQuiverOrientations(state.type, state.rank, state.cartan);
    const keyName = edgeKey(i, j);
    orientations[keyName] = -(orientations[keyName] || 1);
    drawDynkin();
    renderStartingFunction();
    queueMathTypeset();
  }

  function renderExport() {
    const info = invariants(state.type, state.rank, state.cartan, state.roots);
    const indices = selectedIndices();
    const parabolic = parabolicData(state.type, state.rank, indices, state.roots);
    const payload = {
      calculator: 'Dynkin diagram calculator',
      type: info.label,
      rank: state.rank,
      selectedVertex: state.selected + 1,
      selectedVertices: indices.map((index) => index + 1),
      multiSelect: state.multiSelect,
      quiver: {
        enabled: state.quiverMode && supportsQuiverOrientation(state.type),
        orientations: supportsQuiverOrientation(state.type)
          ? getQuiverOrientations(state.type, state.rank, state.cartan)
          : null
      },
      dimension: info.dimension,
      positiveRoots: info.positiveRoots,
      coxeterNumber: info.coxeter,
      dualCoxeterNumber: info.dualCoxeter,
      cartanMatrix: state.cartan,
      parabolic: {
        selectedNode: parabolic.node,
        selectedNodes: parabolic.nodes,
        rootDefinition: parabolic.rootDefinition,
        dimension: parabolic.dimension,
        nilradicalDimension: parabolic.nilradicalDimension,
        leviPositiveRoots: parabolic.leviPositiveRoots,
        matrixModel: {
          lieAlgebra: parabolic.model.title,
          flag: parabolic.model.flag,
          blockSizes: parabolic.model.blockSizes
        }
      }
    };
    $('dynkin-export-out').value = JSON.stringify(payload, null, 2);
  }

  function syncControls() {
    const rankWrap = $('dynkin-rank-wrap');
    rankWrap.style.display = isClassical(state.type) ? 'inline-flex' : 'none';
    $('dynkin-type').value = state.type;
    $('dynkin-multi-select').checked = state.multiSelect;
    syncQuiverControls();
    const input = $('dynkin-rank');
    const bounds = rankBounds(state.type);
    input.min = String(bounds.min);
    input.max = String(bounds.max);
    input.value = String(state.rank);
  }

  function setType(type) {
    state.type = type;
    state.rank = EXCEPTIONAL_RANK[type] || clampRank(type, state.rank);
    if (!supportsQuiverOrientation(state.type)) state.quiverMode = false;
    if (!canShowStartingFunctionAR()) state.startingFunctionARMode = false;
    clampSelection();
    render();
  }

  function setRank(value) {
    state.rank = clampRank(state.type, value);
    clampSelection();
    render();
  }

  function setMultiSelect(enabled) {
    state.multiSelect = Boolean(enabled);
    if (state.multiSelect) {
      state.selectedSet = selectedIndices();
    } else {
      state.selected = selectedIndices()[0];
      state.selectedSet = [state.selected];
    }
    render();
  }

  function setQuiverMode(enabled) {
    state.quiverMode = Boolean(enabled) && supportsQuiverOrientation(state.type);
    if (!canShowStartingFunctionAR()) state.startingFunctionARMode = false;
    drawDynkin();
    syncQuiverControls();
    renderStartingFunction();
    queueMathTypeset();
  }

  function setStartingFunctionARMode(enabled) {
    state.startingFunctionARMode = Boolean(enabled) && canShowStartingFunctionAR();
    renderStartingFunction();
    queueMathTypeset();
  }

  function setArHideUnselected(enabled) {
    state.arHideUnselected = Boolean(enabled);
    renderStartingFunction();
    queueMathTypeset();
  }

  function setStartingFunctionHeaderVisible(visible) {
    state.startingFunctionHeaderVisible = Boolean(visible);
    renderStartingFunction();
    queueMathTypeset();
  }

  function setStartingFunctionTransposed(transposed) {
    state.startingFunctionTransposed = Boolean(transposed);
    renderStartingFunction();
    queueMathTypeset();
  }

  function setStartingFunctionWide(enabled) {
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    state.startingFunctionWide = Boolean(enabled) && canUseWide;
    syncStartingFunctionWidePlacement();
  }

  function bindInputs() {
    $('dynkin-type').addEventListener('change', (event) => setType(event.target.value));
    $('dynkin-rank').addEventListener('change', (event) => setRank(event.target.value));
    $('dynkin-multi-select').addEventListener('change', (event) => setMultiSelect(event.target.checked));
    $('dynkin-quiver-mode')?.addEventListener('change', (event) => setQuiverMode(event.target.checked));
    $('dynkin-starting-ar-mode')?.addEventListener('change', (event) => setStartingFunctionARMode(event.target.checked));
    $('dynkin-ar-hide-unselected')?.addEventListener('change', (event) => setArHideUnselected(event.target.checked));
    $('dynkin-refresh-export').addEventListener('click', renderExport);
    $('dynkin-select-export').addEventListener('click', () => {
      const out = $('dynkin-export-out');
      out.focus();
      out.select();
    });
    $('dynkin-canvas').addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', drawDynkin);
    window.addEventListener('resize', syncStartingFunctionWidePlacement);
    $('dynkin-starting-toggle-header')?.addEventListener('click', () => {
      setStartingFunctionHeaderVisible(!state.startingFunctionHeaderVisible);
    });
    $('dynkin-starting-transpose')?.addEventListener('click', () => {
      setStartingFunctionTransposed(!state.startingFunctionTransposed);
    });
    $('dynkin-starting-wide')?.addEventListener('click', () => {
      setStartingFunctionWide(!state.startingFunctionWide);
    });
    syncStartingFunctionWidePlacement();
  }

  function syncQuiverControls() {
    const quiver = $('dynkin-quiver-mode');
    if (!quiver) return;
    const canUseQuiver = supportsQuiverOrientation(state.type);
    if (!canUseQuiver) state.quiverMode = false;
    quiver.checked = state.quiverMode;
    quiver.disabled = !canUseQuiver;
    const label = quiver.closest('label');
    if (label) {
      label.title = canUseQuiver
        ? 'Orient every edge; click an edge on the canvas to reverse it'
        : 'Ordinary quiver orientation is only enabled for simply-laced ADE types';
    }
  }

  function syncStartingFunctionControls(available = supportsStartingFunction(state.type)) {
    const headerButton = $('dynkin-starting-toggle-header');
    const transposeButton = $('dynkin-starting-transpose');
    const arModeCheckbox = $('dynkin-starting-ar-mode');
    const hideUnselectedCheckbox = $('dynkin-ar-hide-unselected');
    const wideButton = $('dynkin-starting-wide');
    const canUseAR = available && canShowStartingFunctionAR();
    if (!canUseAR) state.startingFunctionARMode = false;
    if (headerButton) {
      headerButton.textContent = state.startingFunctionHeaderVisible ? 'hide header' : 'show header';
      headerButton.setAttribute('aria-pressed', state.startingFunctionHeaderVisible ? 'true' : 'false');
      headerButton.disabled = !available;
    }
    if (transposeButton) {
      transposeButton.setAttribute('aria-pressed', state.startingFunctionTransposed ? 'true' : 'false');
      transposeButton.disabled = !available;
    }
    if (arModeCheckbox) {
      arModeCheckbox.checked = state.startingFunctionARMode;
      arModeCheckbox.disabled = !canUseAR;
      const label = arModeCheckbox.closest('label');
      if (label) {
        label.title = canUseAR
          ? 'Show the Auslander-Reiten quiver in this chart'
          : 'Turn on ADE quiver arrows first';
      }
    }
    if (hideUnselectedCheckbox) {
      const canHide = canUseAR && state.startingFunctionARMode;
      hideUnselectedCheckbox.checked = canHide && state.arHideUnselected;
      hideUnselectedCheckbox.disabled = !canHide;
      const label = hideUnselectedCheckbox.closest('label');
      if (label) {
        label.hidden = !canHide;
        label.title = canHide
          ? 'Hide coordinates for vertices that are not selected'
          : 'Available in AR quiver mode';
      }
    }
    if (wideButton) {
      const canUseWide = window.matchMedia('(min-width: 960px)').matches;
      wideButton.textContent = state.startingFunctionWide ? 'side' : 'wide';
      wideButton.setAttribute('aria-pressed', state.startingFunctionWide ? 'true' : 'false');
      wideButton.disabled = !available || !canUseWide;
    }
  }

  function syncStartingFunctionWidePlacement() {
    const card = $('dynkin-starting-card');
    const sideAnchor = $('dynkin-starting-side-anchor');
    const wideHost = $('dynkin-starting-wide-host');
    if (!card || !sideAnchor || !wideHost) return;
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    if (!canUseWide) state.startingFunctionWide = false;
    if (state.startingFunctionWide) {
      if (card.parentElement !== wideHost) wideHost.appendChild(card);
    } else if (sideAnchor.parentElement && card.parentElement !== sideAnchor.parentElement) {
      sideAnchor.insertAdjacentElement('afterend', card);
    }
    card.classList.toggle('wide', state.startingFunctionWide);
    wideHost.hidden = !state.startingFunctionWide;
    syncStartingFunctionControls();
  }

  function bindStartingFunctionDrag() {
    const targets = [$('dynkin-starting-function')].filter(Boolean);
    if (!targets.length) return;

    let gesture = null;
    const pointerOptions = { passive: false };

    targets.forEach((target) => target.addEventListener('click', (event) => {
      if (!state.startingFunctionARMode || !canShowStartingFunctionAR()) return;
      if (event.target.closest('.starting-vertex-label')) return;
      const edge = nearestStartingHeaderEdge(event);
      if (!edge) return;
      event.preventDefault();
      event.stopPropagation();
      toggleQuiverEdge(edge.i, edge.j);
    }));

    targets.forEach((target) => target.addEventListener('pointerdown', (event) => {
      const label = event.target.closest('.starting-vertex-label');
      if (!label || !target.contains(label)) return;
      const grid = label.closest('.starting-vertex-grid,.starting-transpose-grid');
      if (!grid) return;

      const vertex = Number(label.dataset.startingVertex);
      const row = Number(label.dataset.startingRow);
      const column = Number(label.dataset.startingColumn);
      const columns = Number(grid.dataset.startingColumns);
      const transposed = label.dataset.startingTransposed === 'true';
      if (!Number.isInteger(vertex) || !Number.isInteger(row) || !Number.isInteger(column) || !Number.isInteger(columns)) return;

      event.preventDefault();
      event.stopPropagation();

      const gridRect = grid.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const cellSize = transposed
        ? gridRect.height / Math.max(1, columns)
        : gridRect.width / Math.max(1, columns);
      gesture = {
        pointerId: event.pointerId,
        label,
        vertex,
        row,
        column,
        columns,
        transposed,
        dragging: false,
        startPosition: transposed ? event.clientY : event.clientX,
        currentPosition: transposed ? event.clientY : event.clientX,
        gridStart: transposed ? gridRect.top : gridRect.left,
        cellSize,
        circleCenterX: labelRect.left + labelRect.width / 2,
        circleCenterY: labelRect.top + labelRect.height / 2,
        circleRadius: Math.max(labelRect.width, labelRect.height) / 2 + 2
      };
      if (label.setPointerCapture) {
        try { label.setPointerCapture(event.pointerId); } catch (_) {}
      }
      document.addEventListener('pointermove', handleStartingFunctionPointerMove, pointerOptions);
      document.addEventListener('pointerup', finishStartingFunctionGesture, pointerOptions);
      document.addEventListener('pointercancel', finishStartingFunctionGesture, pointerOptions);
    }, pointerOptions));

    function handleStartingFunctionPointerMove(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      event.preventDefault();
      if (!gesture.dragging && !pointInsideOriginalCircle(gesture, event.clientX, event.clientY)) {
        gesture.dragging = true;
        gesture.label.classList.add('is-dragging');
      }
      if (!gesture.dragging) return;
      const minPosition = gesture.gridStart + gesture.cellSize / 2;
      const maxPosition = gesture.gridStart + gesture.cellSize * (gesture.columns - 0.5);
      const pointerPosition = gesture.transposed ? event.clientY : event.clientX;
      gesture.currentPosition = clamp(pointerPosition, minPosition, maxPosition);
      const delta = gesture.currentPosition - gesture.startPosition;
      gesture.label.style.transform = gesture.transposed ? `translateY(${delta}px)` : `translateX(${delta}px)`;
    }

    function finishStartingFunctionGesture(event) {
      if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
      if (event) event.preventDefault();

      document.removeEventListener('pointermove', handleStartingFunctionPointerMove, pointerOptions);
      document.removeEventListener('pointerup', finishStartingFunctionGesture, pointerOptions);
      document.removeEventListener('pointercancel', finishStartingFunctionGesture, pointerOptions);

      const finishedGesture = gesture;
      gesture = null;
      finishedGesture.label.classList.remove('is-dragging');
      finishedGesture.label.style.transform = '';

      if (!event || event.type === 'pointercancel') return;
      if (!finishedGesture.dragging && !pointInsideOriginalCircle(finishedGesture, event.clientX, event.clientY)) {
        finishedGesture.dragging = true;
      }
      if (!finishedGesture.dragging) {
        selectDynkinVertex(finishedGesture.vertex);
        return;
      }

      const minPosition = finishedGesture.gridStart + finishedGesture.cellSize / 2;
      const maxPosition = finishedGesture.gridStart + finishedGesture.cellSize * (finishedGesture.columns - 0.5);
      const pointerPosition = finishedGesture.transposed ? event.clientY : event.clientX;
      finishedGesture.currentPosition = clamp(pointerPosition, minPosition, maxPosition);
      const targetColumn = clamp(
        Math.floor((finishedGesture.currentPosition - finishedGesture.gridStart) / finishedGesture.cellSize) + 1,
        1,
        finishedGesture.columns
      );
      moveStartingFunctionVertex(finishedGesture.vertex, finishedGesture.row, targetColumn);
    }

    function pointInsideOriginalCircle(activeGesture, x, y) {
      return Math.hypot(x - activeGesture.circleCenterX, y - activeGesture.circleCenterY) <= activeGesture.circleRadius;
    }
  }

  function nearestStartingHeaderEdge(event) {
    const grid = event.target.closest('.starting-vertex-grid,.starting-transpose-grid');
    if (!grid || !state.cartan.length) return null;
    const columns = Number(grid.dataset.startingColumns);
    if (!Number.isInteger(columns) || columns <= 0) return null;
    const transposed = grid.dataset.startingTransposed === 'true';
    const rect = grid.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const cellSize = transposed ? rect.height / columns : rect.width / columns;
    if (!cellSize) return null;
    const x = (event.clientX - rect.left) / cellSize;
    const y = (event.clientY - rect.top) / cellSize;
    const layout = getStartingFunctionLayout(state.type, state.rank, state.cartan);
    let best = null;
    for (let i = 0; i < state.cartan.length; i++) {
      for (let j = i + 1; j < state.cartan.length; j++) {
        if (!state.cartan[i][j] && !state.cartan[j][i]) continue;
        const a = layout.positions[i];
        const b = layout.positions[j];
        if (!a || !b) continue;
        const x1 = transposed ? a.row - 0.5 : a.col - 0.5;
        const y1 = transposed ? a.col - 0.5 : a.row - 0.5;
        const x2 = transposed ? b.row - 0.5 : b.col - 0.5;
        const y2 = transposed ? b.col - 0.5 : b.row - 0.5;
        const dist = pointSegmentDistance(x, y, x1, y1, x2, y2);
        if (dist <= 0.26 && (!best || dist < best.dist)) best = { i, j, dist };
      }
    }
    return best;
  }

  function moveStartingFunctionVertex(vertex, row, targetColumn) {
    const layout = getStartingFunctionLayout(state.type, state.rank, state.cartan);
    const current = layout.positions[vertex];
    if (!current || current.row !== row || current.col === targetColumn) return;

    const occupant = layout.positions.findIndex((position, index) =>
      index !== vertex && position.row === row && position.col === targetColumn
    );
    if (occupant >= 0) {
      layout.positions[occupant] = { ...layout.positions[occupant], col: current.col };
    }
    layout.positions[vertex] = { ...current, col: targetColumn };
    renderStartingFunction();
    queueMathTypeset();
  }

  function selectDynkinVertex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.rank) return;
    if (state.multiSelect) {
      const set = new Set(state.selectedSet);
      if (set.has(index) && set.size > 1) set.delete(index);
      else set.add(index);
      state.selectedSet = Array.from(set).sort((a, b) => a - b);
      state.selected = index;
    } else {
      state.selected = index;
      state.selectedSet = [state.selected];
    }
    render();
  }

  function handleCanvasClick(event) {
    const canvas = $('dynkin-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * CANVAS_WIDTH / rect.width;
    const y = (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height;
    if (state.quiverMode && supportsQuiverOrientation(state.type)) {
      const edge = nearestEdgeHit(x, y);
      if (edge) {
        toggleQuiverEdge(edge.i, edge.j);
        return;
      }
    }
    let best = null;
    for (const hit of state.hitboxes) {
      const dist = Math.hypot(x - hit.x, y - hit.y);
      if (dist <= hit.r + 8 && (!best || dist < best.dist)) best = { hit, dist };
    }
    if (best) {
      selectDynkinVertex(best.hit.index);
    }
  }

  function nearestEdgeHit(x, y) {
    let best = null;
    for (const edge of state.edgeHitboxes || []) {
      const dist = pointSegmentDistance(x, y, edge.x1, edge.y1, edge.x2, edge.y2);
      if (dist <= 12 && (!best || dist < best.dist)) best = { ...edge, dist };
    }
    return best;
  }

  function pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    return Math.hypot(px - x, py - y);
  }

  function bindCards() {
    let suppressCardToggleUntil = 0;
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < suppressCardToggleUntil) return;
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
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(pointerId); } catch (_) {}
      }
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
        suppressCardToggleUntil = Date.now() + 500;
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
      if (!dragCard || (event && event.pointerId !== pointerId)) return;
      if (event) event.preventDefault();
      document.removeEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.removeEventListener('pointerup', finishCardDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishCardDrag, pointerOptions);
      document.body.classList.remove('card-dragging');
      if (dragging && placeholder) {
        dragCard.style.display = '';
        side.insertBefore(dragCard, placeholder);
        placeholder.remove();
        if (ghost) ghost.remove();
        suppressCardToggleUntil = Date.now() + 500;
      }
      if (dragCard) dragCard.classList.remove('dragging');
      dragCard = null;
      placeholder = null;
      ghost = null;
      pointerId = null;
      dragging = false;
    }
  }

  function getCardAfterPointer(side, y, dragCard, placeholder) {
    const cards = [...side.querySelectorAll('.card')]
      .filter((card) => card !== dragCard && card !== placeholder);
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: card };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindInputs();
    bindStartingFunctionDrag();
    bindCards();
    render();
  });
})();
