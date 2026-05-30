(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const key = (v) => v.join(',');
  const state = {
    type: 'E6',
    rank: 6,
    selected: 0,
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
    return rows.map(([label, value]) =>
      `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`
    ).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
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
    nodes.forEach((node, index) => {
      const selected = index === state.selected;
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
    ctx.fillText(`${typeLabel()}   ${TYPE_DESC[state.type](state.rank)}`, 22, 20);
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
    state.selected = Math.max(0, Math.min(state.rank - 1, state.selected));
    syncControls();
    drawDynkin();
    renderInvariants();
    renderVertexData();
    renderCartan();
    renderExport();
  }

  function renderInvariants() {
    const info = invariants(state.type, state.rank, state.cartan, state.roots);
    $('dynkin-status').textContent = info.label;
    $('dynkin-root-count-label').textContent = `positive roots: ${info.positiveRoots}`;
    $('dynkin-invariants').innerHTML = htmlRows([
      ['Lie algebra', `${info.label} ${escapeHtml(info.desc)}`],
      ['rank', info.rank],
      ['dimension', info.dimension],
      ['roots', `${info.roots} total, ${info.positiveRoots} positive`],
      ['Coxeter h', info.coxeter],
      ['dual Coxeter h^vee', info.dualCoxeter],
      ['exponents', info.exponents.join(', ')],
      ['Weyl group order', formatBigInt(info.weylOrder)],
      ['det Cartan', info.determinant],
      ['P/Q', info.center]
    ]);
  }

  function renderVertexData() {
    const i = state.selected;
    const C = state.cartan;
    const e = Array(state.rank).fill(0);
    e[i] = 1;
    const omega = solveLinear(transpose(C), e) || [];
    const highest = state.roots.reduce((best, root) => rootHeight(root) > rootHeight(best) ? root : best, state.roots[0] || e);
    const sym = cartanSymmetrizer(C);
    const maxLength = Math.max(...sym);
    const normalizedLength = 2 * sym[i] / maxLength;
    const neighbors = C[i].map((value, j) => value || C[j][i] ? j + 1 : null).filter((value) => value && value !== i + 1);
    $('dynkin-selected-label').textContent = `selected vertex: ${i + 1}`;
    $('dynkin-vertex-data').innerHTML = htmlRows([
      ['simple root', `alpha_${i + 1}`],
      ['root length^2', approxFraction(normalizedLength)],
      ['neighbors', neighbors.length ? neighbors.join(', ') : 'none'],
      ['Cartan row', formatVector(C[i])],
      ['Cartan column', formatVector(C.map((row) => row[i]))],
      ['highest-root mark', highest[i]],
      ['highest root', formatVector(highest)],
      ['omega in simple roots', formatVector(omega)]
    ]);
  }

  function renderCartan() {
    const header = Array.from({ length: state.rank }, (_, i) => `<th>${i + 1}</th>`).join('');
    const body = state.cartan.map((row, i) =>
      `<tr><td>${i + 1}</td>${row.map((x) => `<td>${x}</td>`).join('')}</tr>`
    ).join('');
    $('dynkin-cartan').innerHTML = `<table class="dynkin-table"><thead><tr><th></th>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function renderExport() {
    const info = invariants(state.type, state.rank, state.cartan, state.roots);
    const payload = {
      calculator: 'Dynkin diagram calculator',
      type: info.label,
      rank: state.rank,
      selectedVertex: state.selected + 1,
      dimension: info.dimension,
      positiveRoots: info.positiveRoots,
      coxeterNumber: info.coxeter,
      dualCoxeterNumber: info.dualCoxeter,
      cartanMatrix: state.cartan
    };
    $('dynkin-export-out').value = JSON.stringify(payload, null, 2);
  }

  function syncControls() {
    const rankWrap = $('dynkin-rank-wrap');
    rankWrap.style.display = isClassical(state.type) ? 'inline-flex' : 'none';
    $('dynkin-type').value = state.type;
    const input = $('dynkin-rank');
    const bounds = rankBounds(state.type);
    input.min = String(bounds.min);
    input.max = String(bounds.max);
    input.value = String(state.rank);
  }

  function setType(type) {
    state.type = type;
    state.rank = EXCEPTIONAL_RANK[type] || clampRank(type, state.rank);
    state.selected = Math.min(state.selected, state.rank - 1);
    render();
  }

  function setRank(value) {
    state.rank = clampRank(state.type, value);
    state.selected = Math.min(state.selected, state.rank - 1);
    render();
  }

  function bindInputs() {
    $('dynkin-type').addEventListener('change', (event) => setType(event.target.value));
    $('dynkin-rank').addEventListener('change', (event) => setRank(event.target.value));
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
      state.selected = best.hit.index;
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
