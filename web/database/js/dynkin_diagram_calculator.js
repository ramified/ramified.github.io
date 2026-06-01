(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const key = (v) => v.join(',');
  const state = {
    type: 'E6',
    rank: 6,
    selected: 0,
    multiSelect: false,
    selectedSet: [0],
    hitboxes: [],
    roots: [],
    cartan: []
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
    if (!state.selectedSet.includes(state.selected)) state.selected = state.selectedSet[0];
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
    const W = 900;
    const H = 420;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, H);

    const nodes = layoutNodes(state.type, state.rank, W, H);
    state.hitboxes = nodes.map((node, index) => ({ ...node, r: 20, index }));
    const C = state.cartan;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < C.length; i++) {
      for (let j = i + 1; j < C.length; j++) {
        if (!C[i][j] && !C[j][i]) continue;
        const multiplicity = Math.max(1, Math.abs(C[i][j] * C[j][i]));
        let arrowTarget = null;
        if (multiplicity > 1) {
          arrowTarget = Math.abs(C[i][j]) > Math.abs(C[j][i]) ? j : i;
        }
        drawEdge(ctx, nodes[i], nodes[j], multiplicity, arrowTarget === j ? nodes[j] : arrowTarget === i ? nodes[i] : null);
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
    const wing = 9;
    const back = 13;
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
    const selected = selectedIndices()[0];
    if (!isSimplyLacedFinite(state.type)) {
      target.innerHTML = `<div class="starting-note">${inlineMath('\\dim\\operatorname{Hom}(P(i),M)')} is shown here for Dynkin types ${inlineMath('A,D,E')}.</div>`;
      return;
    }
    const chart = startingFunctionChart(state.type, state.rank, state.cartan, selected);
    const grid = chart.cells
      .map((cell) => {
        const value = cell.value ? inlineMath(String(cell.value)) : '&nbsp;';
        const className = cell.value ? 'starting-chart-cell' : 'starting-chart-cell is-empty';
        const title = cell.value ? ` title="${escapeHtml(rootTooltip(cell.root))}"` : '';
        return `<span class="${className}" style="grid-row:${cell.row};grid-column:${cell.col};"${title}>${value}</span>`;
      })
      .join('');
    target.innerHTML = [
      `<div class="starting-summary">${inlineMath(`M_\\beta\\mapsto\\dim\\operatorname{Hom}(P(${selected + 1}),M_\\beta)=\\operatorname{coeff}_{\\alpha_{${selected + 1}}}(\\beta)`)}.</div>`,
      `<div class="starting-chart-wrap"><div class="starting-chart-grid" style="--starting-cols:${chart.columns};">${grid}</div></div>`
    ].join('');
  }

  function startingFunctionChart(type, rank, C, selected) {
    const columnsByVertex = startingFunctionVertexColumns(type, rank);
    const colors = bipartiteColorClasses(C, columnsByVertex);
    const rows = [];
    const seen = new Set();
    const coxeter = invariants(type, rank, C, state.roots).coxeter;
    const rowCount = coxeter - 1;
    const startColor = colors[0].includes(selected) ? 0 : 1;
    const columns = Math.max(...columnsByVertex);
    const prefix = [];
    for (let row = 0; row < rowCount; row++) {
      const color = (startColor + row) % 2;
      const vertices = colors[color];
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
    return normalizeStartingFunctionColumns(rows, columns);
  }

  function normalizeStartingFunctionColumns(cells, fallbackColumns) {
    if (!cells.length) return { cells, columns: fallbackColumns };
    const minColumn = Math.min(...cells.map((cell) => cell.col));
    const maxColumn = Math.max(...cells.map((cell) => cell.col));
    const normalized = cells.map((cell) => ({ ...cell, col: cell.col - minColumn + 1 }));
    return { cells: normalized, columns: maxColumn - minColumn + 1 };
  }

  function startingFunctionVertexColumns(type, rank) {
    if (type === 'A') {
      return Array.from({ length: rank }, (_, index) => rank - index);
    }
    if (type === 'D') {
      const columns = Array(rank).fill(1);
      for (let index = 0; index <= rank - 4; index++) columns[index] = rank - index;
      columns[rank - 3] = 2;
      columns[rank - 2] = 1;
      columns[rank - 1] = 3;
      return columns;
    }
    if (type === 'E6' || type === 'E7' || type === 'E8') {
      const columns = Array(rank).fill(1);
      for (let index = 0; index <= rank - 2; index++) columns[index] = rank - index;
      columns[rank - 1] = rank - 2;
      return columns;
    }
    return Array.from({ length: rank }, (_, index) => index + 1);
  }

  function bipartiteColorClasses(C, columnsByVertex) {
    const colors = [[], []];
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
    assigned.forEach((color, vertex) => colors[color].push(vertex));
    return colors.map((group) => group.sort((a, b) => columnsByVertex[a] - columnsByVertex[b] || a - b));
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
    const input = $('dynkin-rank');
    const bounds = rankBounds(state.type);
    input.min = String(bounds.min);
    input.max = String(bounds.max);
    input.value = String(state.rank);
  }

  function setType(type) {
    state.type = type;
    state.rank = EXCEPTIONAL_RANK[type] || clampRank(type, state.rank);
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

  function bindInputs() {
    $('dynkin-type').addEventListener('change', (event) => setType(event.target.value));
    $('dynkin-rank').addEventListener('change', (event) => setRank(event.target.value));
    $('dynkin-multi-select').addEventListener('change', (event) => setMultiSelect(event.target.checked));
    $('dynkin-refresh-export').addEventListener('click', renderExport);
    $('dynkin-select-export').addEventListener('click', () => {
      const out = $('dynkin-export-out');
      out.focus();
      out.select();
    });
    $('dynkin-canvas').addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', drawDynkin);
  }

  function handleCanvasClick(event) {
    const canvas = $('dynkin-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 900 / rect.width;
    const y = (event.clientY - rect.top) * 420 / rect.height;
    let best = null;
    for (const hit of state.hitboxes) {
      const dist = Math.hypot(x - hit.x, y - hit.y);
      if (dist <= hit.r + 8 && (!best || dist < best.dist)) best = { hit, dist };
    }
    if (best) {
      if (state.multiSelect) {
        const index = best.hit.index;
        const set = new Set(state.selectedSet);
        if (set.has(index) && set.size > 1) set.delete(index);
        else set.add(index);
        state.selectedSet = Array.from(set).sort((a, b) => a - b);
        state.selected = index;
      } else {
        state.selected = best.hit.index;
        state.selectedSet = [state.selected];
      }
      render();
    }
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
    bindCards();
    render();
  });
})();
