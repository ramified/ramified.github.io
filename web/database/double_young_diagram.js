
  (() => {
    'use strict';

    const MAX_EXACT_CELLS = 25;
    const MAX_STABLE_BOXES_TYPE_A = 15;
    const MAX_STABLE_BOXES_CLASSICAL = 12;
    const MAX_WEYL_ORBIT = 60000;
    const MAX_SUPPORT_BOX = 26000;
    const MAX_PRODUCT_WEIGHT_PAIRS = 90000;
    const MAX_DOMINANT_CANDIDATES = 3000;
    const MAX_EXCEPTIONAL_SUBDIAGRAM_CANDIDATES = 3000;
    const MAX_EXCEPTIONAL_TYPE_A_SOURCE_BOXES = 12;
    const MAX_KOSTANT_STEPS = 220000;
    const MAX_FREUDENTHAL_WEIGHTS = 20000;
    const MAX_NORM_BOUND_CANDIDATES = 12000;
    const MAX_SLICE_CHARACTER_CANDIDATES = 5000;
    const MAX_SLICE_PROJECTION_CANDIDATES = 3000000;
    const SLICE_PROJECTION_BOX_WARNING_CANDIDATES = 600000;
    const MAX_SLICE_PROJECTION_BOX_CANDIDATES = 6000000;
    const SLICE_FREUDENTHAL_EPS = 1e-7;
    const MAX_KOSTKA_STEPS = 250000;
    const MAX_KOSTKA_TABLEAUX = 3000;
    const MAX_KRONECKER_BOXES = 12;
    const MAX_PLETHYSM_BOXES = 12;
    const MAX_POWER_SUM_TERMS = 6000;
    const MAX_SCHUR_FUNCTOR_CHAR_TERMS = 16000;
    const MAX_SCHUR_FUNCTOR_DECOMP_TERMS = 800;
    const MAX_GRASSMANNIAN_TERMS = 1200;
    const MAX_CHERN_DETERMINANT_SIZE = 7;
    const MAX_CHERN_POLY_TERMS = 4000;

    const state = {
      lambda: { rows: [], maxRows: 5, maxCols: 5, canvas: null, ctx: null, geometry: null },
      mu: { rows: [], maxRows: 5, maxCols: 5, canvas: null, ctx: null, geometry: null },
      lastDecomposition: null,
      lastKostka: null,
      lastKronecker: null,
      lastPlethysm: null,
      lastSchurFunctor: null,
      lastGrassmannian: null,
      lastSymmetricPolynomial: null,
      exportFilename: 'young_diagram2_calculator.bib',
      exportMode: 'citation'
    };

    const $ = (id) => document.getElementById(id);
    const key = (v) => v.join(',');
    const add = (a,b) => a.map((x,i) => x + b[i]);
    const sub = (a,b) => a.map((x,i) => x - b[i]);
    const scale = (a,k) => a.map(x => x * k);
    const dot = (a,b) => a.reduce((s,x,i) => s + x*b[i], 0);

    function trimPartition(p) {
      const out = [];
      for (const x of p) {
        const v = Math.max(0, Math.floor(Number(x) || 0));
        if (v > 0) out.push(v);
      }
      while (out.length && out[out.length - 1] === 0) out.pop();
      return out;
    }
    function normalizePartition(p) { return trimPartition(p).sort((a,b) => b - a); }
    function parsePartition(text) {
      if (!String(text || '').trim()) return [];
      const cleaned = String(text).replace(/[\[\](){}]/g, ' ').replace(/[;,]/g, ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (!parts.length) return [];
      const raw = parts.map(Number);
      if (raw.some(x => !Number.isFinite(x) || x < 0 || Math.floor(x) !== x)) throw new Error('Use nonnegative integers, e.g. (4,2,1) or 4,2,1.');
      return normalizePartition(raw);
    }
    function partitionToString(p) {
      const q = trimPartition(p);
      return q.length ? '(' + q.join(',') + ')' : '∅';
    }
    function partitionKey(p) { return trimPartition(p).join(','); }
    function sizeOf(p) { return trimPartition(p).reduce((a,b) => a + b, 0); }
    function containsPartition(outer, inner) {
      const n = Math.max(outer.length, inner.length);
      for (let i = 0; i < n; i++) if ((outer[i] || 0) < (inner[i] || 0)) return false;
      return true;
    }
    function conjugatePartition(p) {
      p = trimPartition(p);
      const max = p[0] || 0;
      const out = [];
      for (let c = 1; c <= max; c++) out.push(p.filter(r => r >= c).length);
      return out;
    }
    function hookLengthDimension(lambda, n) {
      lambda = trimPartition(lambda);
      if (lambda.length > n) return 0;
      const cols = conjugatePartition(lambda);
      let result = 1;
      for (let i = 1; i <= lambda.length; i++) {
        for (let j = 1; j <= lambda[i - 1]; j++) {
          const numerator = n + j - i;
          const hook = lambda[i - 1] - j + (cols[j - 1] || 0) - i + 1;
          if (numerator <= 0) return 0;
          result *= numerator / hook;
        }
      }
      return Math.round(result);
    }
    function partitionsOf(total, maxPart = total, maxLen = total) {
      const out = [];
      function rec(rem, top, acc) {
        if (rem === 0) { out.push(acc.slice()); return; }
        if (acc.length >= maxLen) return;
        const m = Math.min(top, rem, maxPart);
        for (let x = m; x >= 1; x--) { acc.push(x); rec(rem - x, x, acc); acc.pop(); }
      }
      if (total === 0) return [[]];
      rec(total, maxPart, []);
      return out;
    }
    function skewCells(outer, inner) {
      const cells = [];
      for (let r = 0; r < outer.length; r++) {
        const start = inner[r] || 0;
        for (let c = start; c < outer[r]; c++) cells.push([r,c]);
      }
      return cells;
    }
    function lrCoefficient(lambda, mu, nu) {
      lambda = trimPartition(lambda); mu = trimPartition(mu); nu = trimPartition(nu);
      if (!containsPartition(nu, lambda)) return 0;
      if (sizeOf(nu) !== sizeOf(lambda) + sizeOf(mu)) return 0;
      const total = sizeOf(mu);
      if (total === 0) return partitionKey(lambda) === partitionKey(nu) ? 1 : 0;
      if (total > MAX_EXACT_CELLS) throw new Error(`Exact LR computation capped at ${MAX_EXACT_CELLS} skew boxes.`);
      const k = mu.length;
      const cells = skewCells(nu, lambda).sort((a,b) => (a[0] - b[0]) || (b[1] - a[1]));
      const grid = new Map();
      const remaining = mu.slice();
      const prefixCounts = Array(k).fill(0);
      let count = 0;
      const get = (r,c) => grid.get(r + ',' + c);
      function ballotOK() { for (let i=0;i<k-1;i++) if (prefixCounts[i] < prefixCounts[i+1]) return false; return true; }
      function rec(index) {
        if (index === cells.length) { count++; return; }
        const [r,c] = cells[index];
        const right = get(r, c + 1);
        const above = get(r - 1, c);
        for (let value = 1; value <= k; value++) {
          if (remaining[value - 1] <= 0) continue;
          if (right !== undefined && value > right) continue;
          if (above !== undefined && value <= above) continue;
          remaining[value - 1]--; prefixCounts[value - 1]++;
          if (ballotOK()) { grid.set(r + ',' + c, value); rec(index + 1); grid.delete(r + ',' + c); }
          prefixCounts[value - 1]--; remaining[value - 1]++;
        }
      }
      rec(0);
      return count;
    }
    function stableClassicalCoefficient(lambda, mu, nu) {
      lambda = trimPartition(lambda); mu = trimPartition(mu); nu = trimPartition(nu);
      const L = sizeOf(lambda), M = sizeOf(mu), N = sizeOf(nu);
      const a = (L + M - N) / 2, b = (L + N - M) / 2, c = (M + N - L) / 2;
      if (![a,b,c].every(x => Number.isInteger(x) && x >= 0)) return 0;
      const work = a + b + c;
      if (work > MAX_EXACT_CELLS) throw new Error(`Classical coefficient capped at total auxiliary size ${MAX_EXACT_CELLS}.`);
      let total = 0;
      for (const alpha of partitionsOf(a)) for (const beta of partitionsOf(b)) {
        const first = lrCoefficient(alpha, beta, lambda);
        if (!first) continue;
        for (const gamma of partitionsOf(c)) {
          const second = lrCoefficient(alpha, gamma, mu);
          if (!second) continue;
          const third = lrCoefficient(beta, gamma, nu);
          if (third) total += first * second * third;
        }
      }
      return total;
    }
    function decomposeTypeAStable(lambda, mu) {
      const total = sizeOf(lambda) + sizeOf(mu);
      if (total > MAX_STABLE_BOXES_TYPE_A) throw new Error(`Stable type A decomposition capped at ${MAX_STABLE_BOXES_TYPE_A} total boxes.`);
      const terms = [];
      for (const nu of partitionsOf(total, total, total || 1)) {
        if (!containsPartition(nu, lambda)) continue;
        const c = lrCoefficient(lambda, mu, nu);
        if (c) terms.push({ labels: null, nu, coefficient: c, dimension: null });
      }
      return terms;
    }
    function decomposeClassicalStable(lambda, mu) {
      const total = sizeOf(lambda) + sizeOf(mu);
      if (total > MAX_STABLE_BOXES_CLASSICAL) throw new Error(`Classical stable decomposition capped at ${MAX_STABLE_BOXES_CLASSICAL} total boxes.`);
      const terms = [];
      for (let s = total; s >= 0; s -= 2) for (const nu of partitionsOf(s, s, s || 1)) {
        const c = stableClassicalCoefficient(lambda, mu, nu);
        if (c) terms.push({ labels: null, nu, coefficient: c, dimension: null });
      }
      return terms;
    }

    function currentType() { return $('lie-type').value; }
    function isClassicalType(type) { return ['A','B','C','D'].includes(type); }
    function isExceptionalType(type) { return ['E6','E7','E8','F4','G2'].includes(type); }
    function currentRank() {
      const type = currentType();
      if (type === 'E6') return 6;
      if (type === 'E7') return 7;
      if (type === 'E8') return 8;
      if (type === 'F4') return 4;
      if (type === 'G2') return 2;
      return Math.max(1, Math.floor(Number($('lie-rank').value) || 1));
    }
    function typeDescription(type, rank) {
      const desc = { A: `sl(${rank + 1}), rank ${rank}`, B: `so(${2*rank + 1}), rank ${rank}`, C: `sp(${2*rank}), rank ${rank}`, D: `so(${2*rank}), rank ${rank}`, E6: 'rank 6', E7: 'rank 7', E8: 'rank 8', F4: 'rank 4', G2: 'rank 2' };
      return desc[type] || '';
    }
    function lieAlgebraLabel(type, rank) {
      return isClassicalType(type) ? `${type}_${rank}` : type;
    }
    function vectorDimensionForType(type, rank) {
      if (type === 'A') return rank + 1;
      if (type === 'B') return 2*rank + 1;
      if (type === 'C' || type === 'D') return 2*rank;
      return null;
    }

    function cartanMatrix(type, rank) {
      const make = (n, cb) => Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => cb(i,j)));
      if (type === 'A') return make(rank, (i,j) => i === j ? 2 : Math.abs(i-j) === 1 ? -1 : 0);
      if (type === 'B') {
        const C = make(rank, (i,j) => i === j ? 2 : Math.abs(i-j) === 1 ? -1 : 0);
        if (rank >= 2) { C[rank-2][rank-1] = -2; C[rank-1][rank-2] = -1; }
        return C;
      }
      if (type === 'C') {
        const C = make(rank, (i,j) => i === j ? 2 : Math.abs(i-j) === 1 ? -1 : 0);
        if (rank >= 2) { C[rank-2][rank-1] = -1; C[rank-1][rank-2] = -2; }
        return C;
      }
      if (type === 'D') {
        const C = make(rank, (i,j) => i === j ? 2 : 0);
        for (let i=0;i<rank-2;i++) { C[i][i+1] = -1; C[i+1][i] = -1; }
        if (rank >= 3) { C[rank-3][rank-1] = -1; C[rank-1][rank-3] = -1; }
        return C;
      }
      if (type === 'G2') return [[2,-1],[-3,2]];
      if (type === 'F4') return [[2,-1,0,0],[-1,2,-2,0],[0,-1,2,-1],[0,0,-1,2]];
      if (type === 'E6') {
        const C = make(6, (i,j) => i === j ? 2 : 0);
        [[0,1],[1,2],[2,3],[3,4],[2,5]].forEach(([a,b]) => { C[a][b] = -1; C[b][a] = -1; });
        return C;
      }
      if (type === 'E7') {
        const C = make(7, (i,j) => i === j ? 2 : 0);
        [[0,1],[1,2],[2,3],[3,4],[4,5],[2,6]].forEach(([a,b]) => { C[a][b] = -1; C[b][a] = -1; });
        return C;
      }
      if (type === 'E8') {
        const C = make(8, (i,j) => i === j ? 2 : 0);
        [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,7]].forEach(([a,b]) => { C[a][b] = -1; C[b][a] = -1; });
        return C;
      }
      throw new Error('Unsupported Lie type.');
    }
    function transpose(M) { return M[0].map((_,j) => M.map(row => row[j])); }
    function simpleToDynkin(simple, C) {
      const n = C.length;
      return Array.from({length:n}, (_,j) => simple.reduce((s,x,i) => s + x*C[i][j], 0));
    }
    function solveLinear(A, b) {
      const n = A.length;
      const M = A.map((row,i) => row.map(Number).concat([Number(b[i])]));
      for (let col=0; col<n; col++) {
        let pivot = col;
        for (let r=col+1; r<n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
        if (Math.abs(M[pivot][col]) < 1e-10) return null;
        [M[col], M[pivot]] = [M[pivot], M[col]];
        const div = M[col][col];
        for (let j=col; j<=n; j++) M[col][j] /= div;
        for (let r=0; r<n; r++) if (r !== col) {
          const f = M[r][col];
          for (let j=col; j<=n; j++) M[r][j] -= f*M[col][j];
        }
      }
      return M.map(row => row[n]);
    }
    function dynkinToSimple(v, C) {
      const sol = solveLinear(transpose(C), v);
      if (!sol) return null;
      const rounded = sol.map(x => Math.round(x));
      for (let i=0;i<sol.length;i++) if (Math.abs(sol[i] - rounded[i]) > 1e-7) return null;
      return rounded;
    }
    function isNonnegativeIntVector(v) { return !!v && v.every(x => Number.isInteger(x) && x >= 0); }
    function isDominantDynkin(labels) { return !!labels && labels.every(x => Number.isInteger(x) && x >= 0); }
    function positiveRoots(C) {
      const n = C.length;
      const roots = new Map();
      const queue = [];
      for (let i=0;i<n;i++) { const e = Array(n).fill(0); e[i] = 1; roots.set(key(e), e); queue.push(e); }
      while (queue.length) {
        const r = queue.pop();
        for (let i=0;i<n;i++) {
          const bracket = r.reduce((s,x,j) => s + x*C[j][i], 0);
          const nr = r.slice(); nr[i] -= bracket;
          if (nr.every(x => x >= 0) && !roots.has(key(nr))) { roots.set(key(nr), nr); queue.push(nr); }
        }
      }
      return Array.from(roots.values()).sort((a,b) => a.reduce((s,x)=>s+x,0) - b.reduce((s,x)=>s+x,0));
    }
    function reflectDynkin(v, i, C) {
      const ai = v[i];
      return v.map((x,j) => x - ai*C[i][j]);
    }
    function weylOrbitSigned(v, C, cap = MAX_WEYL_ORBIT) {
      const seen = new Map();
      const q = [{ wt: v.slice(), sign: 1 }];
      seen.set(key(v), { wt: v.slice(), sign: 1 });
      for (let head=0; head<q.length; head++) {
        const cur = q[head];
        for (let i=0;i<C.length;i++) {
          const nw = reflectDynkin(cur.wt, i, C);
          const k = key(nw);
          if (!seen.has(k)) {
            const item = { wt: nw, sign: -cur.sign };
            seen.set(k, item); q.push(item);
            if (seen.size > cap) throw new Error(`Weyl orbit has more than ${cap} weights; lower the rank or use stable mode.`);
          }
        }
      }
      return Array.from(seen.values());
    }
    function factorialBI(n) {
      let r = 1n;
      for (let i=2;i<=n;i++) r *= BigInt(i);
      return r;
    }
    function powBI(base, exp) {
      let r = 1n, b = BigInt(base);
      for (let i=0;i<exp;i++) r *= b;
      return r;
    }
    function cartanEdgeWeight(C, i, j) {
      return Math.abs((C[i][j] || 0) * (C[j][i] || 0));
    }
    function componentAdjacency(C, nodes) {
      const adj = new Map(nodes.map(i => [i, []]));
      for (let a=0;a<nodes.length;a++) {
        for (let b=a+1;b<nodes.length;b++) {
          const i = nodes[a], j = nodes[b];
          const w = cartanEdgeWeight(C, i, j);
          if (w > 0) { adj.get(i).push({ node:j, weight:w }); adj.get(j).push({ node:i, weight:w }); }
        }
      }
      return adj;
    }
    function dynkinComponents(C, nodes) {
      const nodeSet = new Set(nodes), seen = new Set(), comps = [];
      for (const start of nodes) {
        if (seen.has(start)) continue;
        const comp = [], stack = [start]; seen.add(start);
        while (stack.length) {
          const i = stack.pop(); comp.push(i);
          for (const j of nodeSet) {
            if (seen.has(j)) continue;
            if (cartanEdgeWeight(C, i, j) > 0) { seen.add(j); stack.push(j); }
          }
        }
        comps.push(comp.sort((a,b)=>a-b));
      }
      return comps;
    }
    function isPathAdjacency(adj, nodes) {
      if (nodes.length === 1) return true;
      const deg = nodes.map(i => adj.get(i).length).sort((a,b)=>a-b);
      return deg[0] === 1 && deg[1] === 1 && deg.slice(2).every(d => d === 2);
    }
    function doubleEdgeTouchesPathEnd(adj, nodes) {
      for (const i of nodes) for (const e of adj.get(i)) {
        if (i < e.node && e.weight === 2) return adj.get(i).length === 1 || adj.get(e.node).length === 1;
      }
      return false;
    }
    function armLengthsFromBranch(adj, branch) {
      const arms = [];
      for (const first of adj.get(branch).map(e => e.node)) {
        let len = 1, prev = branch, cur = first;
        while (adj.get(cur).length > 1) {
          const next = adj.get(cur).map(e => e.node).find(v => v !== prev);
          if (next === undefined) break;
          prev = cur; cur = next; len += 1;
        }
        arms.push(len);
      }
      return arms.sort((a,b)=>a-b);
    }
    function irreducibleWeylOrderFromCartan(C, nodes) {
      const n = nodes.length;
      if (n === 0) return 1n;
      if (n === 1) return 2n;
      const adj = componentAdjacency(C, nodes);
      const edgeWeights = [];
      for (let a=0;a<nodes.length;a++) for (let b=a+1;b<nodes.length;b++) {
        const w = cartanEdgeWeight(C, nodes[a], nodes[b]);
        if (w > 0) edgeWeights.push(w);
      }
      const maxEdge = Math.max(...edgeWeights);
      if (n === 2) {
        if (maxEdge === 1) return 6n;
        if (maxEdge === 2) return 8n;
        if (maxEdge === 3) return 12n;
      }
      if (maxEdge > 1) {
        if (n === 4 && isPathAdjacency(adj, nodes) && maxEdge === 2 && !doubleEdgeTouchesPathEnd(adj, nodes)) return 1152n; // F4
        if (isPathAdjacency(adj, nodes) && maxEdge === 2) return powBI(2, n) * factorialBI(n); // B/C
      }
      if (maxEdge === 1) {
        if (isPathAdjacency(adj, nodes)) return factorialBI(n + 1); // A_n
        const branchNodes = nodes.filter(i => adj.get(i).length === 3);
        if (branchNodes.length === 1) {
          const arms = armLengthsFromBranch(adj, branchNodes[0]);
          const keyArms = arms.join(',');
          if (arms[0] === 1 && arms[1] === 1) return powBI(2, n - 1) * factorialBI(n); // D_n
          if (keyArms === '1,2,2') return 51840n;     // E6
          if (keyArms === '1,2,3') return 2903040n;   // E7
          if (keyArms === '1,2,4') return 696729600n; // E8
        }
      }
      throw new Error('Unsupported Dynkin subdiagram for Weyl-order shortcut.');
    }
    function weylGroupOrderFromCartan(C, nodes = null) {
      const useNodes = nodes || Array.from({length:C.length}, (_,i)=>i);
      if (!useNodes.length) return 1n;
      return dynkinComponents(C, useNodes).reduce((prod, comp) => prod * irreducibleWeylOrderFromCartan(C, comp), 1n);
    }
    function weylOrbitSizeDominant(labels, C) {
      const zeroNodes = labels.map((a,i) => a === 0 ? i : -1).filter(i => i >= 0);
      return (weylGroupOrderFromCartan(C) / weylGroupOrderFromCartan(C, zeroNodes)).toString();
    }

    function diagramToDynkinLabels(rows, rank) {
      const r = Array.from({length:rank}, (_,i) => trimPartition(rows)[i] || 0);
      return Array.from({length:rank}, (_,i) => r[i] - (r[i+1] || 0));
    }
    function dynkinLabelsToDiagram(labels) {
      const rows = Array(labels.length).fill(0);
      for (let i=labels.length-1;i>=0;i--) rows[i] = labels[i] + (rows[i+1] || 0);
      return trimPartition(rows);
    }
    function gcdBI(a,b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a,b] = [b, a%b]; return a; }
    function normalizeFrac(fr) {
      let [a,b] = fr;
      if (b < 0n) { a = -a; b = -b; }
      const g = gcdBI(a, b);
      return [a / g, b / g];
    }
    function mulFrac(fr, num, den) {
      let [a,b] = normalizeFrac(fr);
      let c = BigInt(num), d = BigInt(den);
      [c,d] = normalizeFrac([c,d]);
      let g = gcdBI(c, b); c /= g; b /= g;
      g = gcdBI(a, d); a /= g; d /= g;
      return normalizeFrac([a*c, b*d]);
    }
    function weylDimensionFrac(labels, C) {
      const coroots = positiveRoots(transpose(C));
      let fr = [1n, 1n];
      for (const cr of coroots) {
        const num = cr.reduce((s,x,i) => s + x*(labels[i] + 1), 0);
        const den = cr.reduce((s,x) => s + x, 0);
        fr = mulFrac(fr, num, den);
      }
      return normalizeFrac(fr);
    }
    function weylDimensionBigInt(labels, C) {
      const fr = weylDimensionFrac(labels, C);
      if (fr[1] === 1n) return fr[0];
      if (fr[0] % fr[1] === 0n) return fr[0] / fr[1];
      throw new Error(`Weyl dimension did not reduce to an integer: ${fr[0].toString()}/${fr[1].toString()}`);
    }
    function weylDimension(labels, C) {
      try { return weylDimensionBigInt(labels, C).toString(); }
      catch (err) {
        const fr = weylDimensionFrac(labels, C);
        return `${fr[0].toString()}/${fr[1].toString()}`;
      }
    }
    function makeWeylContext(type, rank) {
      const C = cartanMatrix(type, rank);
      const rootsSimple = positiveRoots(C);
      const rho = Array(C.length).fill(1);
      const partitionMemo = new Map();
      const orbitMemo = new Map();
      const weightMultMemo = new Map();
      let kostantSteps = 0;
      function orbit(v) {
        const k = key(v);
        if (!orbitMemo.has(k)) orbitMemo.set(k, weylOrbitSigned(v, C));
        return orbitMemo.get(k);
      }
      function partitionFunction(gammaDyn) {
        const gamma = dynkinToSimple(gammaDyn, C);
        if (!isNonnegativeIntVector(gamma)) return 0;
        const k0 = key(gamma);
        if (partitionMemo.has(k0)) return partitionMemo.get(k0);
        const memo = new Map();
        function rec(index, rem) {
          if (++kostantSteps > MAX_KOSTANT_STEPS) throw new Error(`Kostant partition recursion exceeded ${MAX_KOSTANT_STEPS} steps. The candidate list is small, but this coefficient is still too expensive in the browser; try smaller diagrams or use Sage/LiE for this exceptional case.`);
          if (rem.some(x => x < 0)) return 0;
          if (index === rootsSimple.length) return rem.every(x => x === 0) ? 1 : 0;
          const mk = index + '|' + key(rem);
          if (memo.has(mk)) return memo.get(mk);
          const root = rootsSimple[index];
          let total = 0;
          let next = rem.slice();
          while (next.every(x => x >= 0)) {
            total += rec(index + 1, next);
            next = next.map((x,i) => x - root[i]);
          }
          memo.set(mk, total);
          return total;
        }
        const val = rec(0, gamma);
        partitionMemo.set(k0, val);
        return val;
      }
      function weightMultiplicity(highest, wt) {
        const mk = key(highest) + '::' + key(wt);
        if (weightMultMemo.has(mk)) return weightMultMemo.get(mk);
        // Fast dominance/root-lattice rejection: every weight of V^highest is
        // highest minus a nonnegative integral sum of simple roots.  This avoids
        // thousands of unnecessary Kostant sums in tensor-product calculations.
        const deltaFromHighest = dynkinToSimple(sub(highest, wt), C);
        if (!isNonnegativeIntVector(deltaFromHighest)) {
          weightMultMemo.set(mk, 0);
          return 0;
        }
        const top = add(highest, rho);
        const target = add(wt, rho);
        let total = 0;
        for (const ow of orbit(top)) total += ow.sign * partitionFunction(sub(ow.wt, target));
        weightMultMemo.set(mk, total);
        return total;
      }
      function support(highest) {
        const orbitHighest = orbit(highest);
        const maxDelta = Array(C.length).fill(0);
        for (const ow of orbitHighest) {
          const d = dynkinToSimple(sub(highest, ow.wt), C);
          if (d) for (let i=0;i<d.length;i++) maxDelta[i] = Math.max(maxDelta[i], d[i]);
        }
        const box = maxDelta.reduce((p,x) => p * (x + 1), 1);
        if (box > MAX_SUPPORT_BOX) throw new Error(`Weight support search box has ${box} points. Try smaller diagrams/rank, or use stable mode.`);
        const out = new Map();
        function rec(i, delta) {
          if (i === maxDelta.length) {
            const wt = sub(highest, simpleToDynkin(delta, C));
            const m = weightMultiplicity(highest, wt);
            if (m > 0) out.set(key(wt), { wt, mult: m });
            return;
          }
          for (let x=0; x<=maxDelta[i]; x++) { delta[i] = x; rec(i + 1, delta); }
        }
        rec(0, Array(C.length).fill(0));
        return Array.from(out.values());
      }
      function tensorCoeff(lambda, mu, nu) {
        let total = 0;
        const nuRho = add(nu, rho);
        const lambdaRho = add(lambda, rho);
        for (const ow of orbit(nuRho)) total += ow.sign * weightMultiplicity(mu, sub(ow.wt, lambdaRho));
        return Math.max(0, Math.round(total));
      }
      return { C, rootsSimple, rho, orbit, support, tensorCoeff, weightMultiplicity };
    }

    function weightMultiplicityByWeylCharacter(highestLabels, weightLabels, type, rank) {
      if (!isDominantDynkin(highestLabels)) throw new Error('Weight multiplicity requires a dominant integral highest weight.');
      const C = cartanMatrix(type, rank);
      const delta = dynkinToSimple(sub(highestLabels, weightLabels), C);
      if (!isNonnegativeIntVector(delta)) {
        return { value: 0, engine: 'character multiplicity', checked: 'root-lattice rejection' };
      }
      const ctx = makeWeylContext(type, rank);
      const value = ctx.weightMultiplicity(highestLabels, weightLabels);
      return { value, engine: 'character multiplicity', checked: 'character expansion' };
    }

    function dominantCandidatesBelow(top, C) {
      // Enumerate dominant γ with top - γ in the positive root lattice.
      // Write top - γ = Σ_i d_i α_i.  In Dynkin coordinates,
      // γ = top - C^T d.  Since (C^T)^{-1} has nonnegative entries for finite
      // type, d_i <= ((C^T)^{-1} top)_i gives a finite, sharp coordinate bound.
      const upperReal = solveLinear(transpose(C), top);
      if (!upperReal) throw new Error('Could not compute the dominance bounds for candidate highest weights.');
      const upper = upperReal.map(x => Math.max(0, Math.floor(x + 1e-9)));
      const scanSize = upper.reduce((p, x) => p * (x + 1), 1);
      if (scanSize > MAX_SUPPORT_BOX) throw new Error(`Dominant highest-weight search has ${scanSize} root-lattice points. Try smaller diagrams/rank, or use stable mode.`);

      const candidates = new Map();
      function rec(i, delta) {
        if (i === upper.length) {
          const gamma = sub(top, simpleToDynkin(delta, C));
          if (!gamma.every(x => x >= 0)) return;
          const diff = dynkinToSimple(sub(top, gamma), C);
          if (!isNonnegativeIntVector(diff)) return;
          candidates.set(key(gamma), gamma);
          return;
        }
        for (let x = 0; x <= upper[i]; x++) {
          delta[i] = x;
          rec(i + 1, delta);
          if (candidates.size > MAX_DOMINANT_CANDIDATES) throw new Error(`Found more than ${MAX_DOMINANT_CANDIDATES} dominant candidate highest weights below λ+μ. Try smaller diagrams/rank, or use stable mode.`);
        }
      }
      rec(0, Array(C.length).fill(0));
      return Array.from(candidates.values());
    }

    function decomposeFixedRankTypeA(lambdaRows, muRows, rank) {
      // Exact finite-rank A_n tensor product.  Regard the page diagram
      // (a_1,...,a_n) as the GL_{n+1} partition (a_1,...,a_n,0), decompose
      // by Littlewood--Richardson coefficients, then quotient by determinant
      // twists by removing the last row from every output partition.
      const glRank = rank + 1;
      const lambda = trimPartition(lambdaRows).slice(0, glRank);
      const mu = trimPartition(muRows).slice(0, glRank);
      const total = sizeOf(lambda) + sizeOf(mu);
      if (total > MAX_EXACT_CELLS) throw new Error(`Fixed-rank type A exact LR computation capped at ${MAX_EXACT_CELLS} total boxes.`);
      const combined = new Map();
      for (const nuGL of partitionsOf(total, total, glRank)) {
        if (!containsPartition(nuGL, lambda)) continue;
        const c = lrCoefficient(lambda, mu, nuGL);
        if (!c) continue;
        const detTwist = nuGL[glRank - 1] || 0;
        const diagramRows = Array.from({length: rank}, (_, i) => (nuGL[i] || 0) - detTwist);
        const labels = diagramToDynkinLabels(diagramRows, rank);
        const k = key(labels);
        const old = combined.get(k);
        if (old) old.coefficient += c;
        else combined.set(k, { labels, nu: dynkinLabelsToDiagram(labels), coefficient: c, dimension: null });
      }
      const C = cartanMatrix('A', rank);
      for (const term of combined.values()) term.dimension = weylDimension(term.labels, C);
      return Array.from(combined.values()).filter(t => t.coefficient > 0).sort(compareTerms);
    }

    function shiftedWeylStraighten(labels, C) {
      // Move labels + rho into the dominant chamber by the shifted Weyl action.
      // Returns { labels, sign, singular }.  It is deliberately cheap: no
      // character expansion and no full Weyl orbit enumeration.
      const rho = Array(C.length).fill(1);
      let x = add(labels, rho);
      let sign = 1;
      const seen = new Set();
      for (let steps = 0; steps < 4 * C.length * C.length + 20; steps++) {
        if (x.some(v => v === 0)) return { singular: true, labels: null, sign: 0 };
        const i = x.findIndex(v => v < 0);
        if (i < 0) {
          const dominant = sub(x, rho);
          if (dominant.some(v => v < 0)) return { singular: true, labels: null, sign: 0 };
          return { singular: false, labels: dominant, sign };
        }
        const k = key(x);
        if (seen.has(k)) return { singular: true, labels: null, sign: 0 };
        seen.add(k);
        x = reflectDynkin(x, i, C);
        sign *= -1;
      }
      return { singular: true, labels: null, sign: 0 };
    }


    function cartanSymmetrizer(C) {
      // Return positive numbers d_i with d_j C_{ij} = d_i C_{ji}.
      // Then (α_i, α_j) = d_j C_{ij} gives a symmetric bilinear form
      // in the simple-root basis, up to a harmless common scalar.
      const n = C.length;
      const d = Array(n).fill(null);
      d[0] = 1;
      const q = [0];
      for (let head = 0; head < q.length; head++) {
        const i = q[head];
        for (let j = 0; j < n; j++) {
          if (i === j || !C[i][j] || !C[j][i]) continue;
          const val = d[i] * C[j][i] / C[i][j];
          if (d[j] == null) { d[j] = val; q.push(j); }
        }
      }
      return d.map(x => x == null ? 1 : x);
    }

    function makeDynkinInnerProduct(C) {
      const d = cartanSymmetrizer(C);
      const B = C.map((row, i) => row.map((_, j) => C[i][j] * d[j]));
      return function innerDynkin(a, b) {
        const as = solveLinear(transpose(C), a);
        const bs = solveLinear(transpose(C), b);
        if (!as || !bs) return NaN;
        let total = 0;
        for (let i = 0; i < C.length; i++) {
          for (let j = 0; j < C.length; j++) total += as[i] * B[i][j] * bs[j];
        }
        return total;
      };
    }

    function simpleRootGram(C) {
      const d = cartanSymmetrizer(C);
      return C.map((row, i) => row.map((_, j) => C[i][j] * d[j]));
    }

    function quadraticForm(M, v) {
      let total = 0;
      for (let i = 0; i < v.length; i++) {
        if (!v[i]) continue;
        for (let j = 0; j < v.length; j++) {
          if (v[j]) total += v[i] * M[i][j] * v[j];
        }
      }
      return total;
    }

    function makeDynkinGram(C) {
      // Gram matrix in Dynkin-label / fundamental-weight coordinates.
      // The form is induced from the standard W-invariant form on X^*(T).
      const inner = makeDynkinInnerProduct(C);
      const n = C.length;
      const G = Array.from({length:n}, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        const ei = Array(n).fill(0); ei[i] = 1;
        for (let j = 0; j < n; j++) {
          const ej = Array(n).fill(0); ej[j] = 1;
          G[i][j] = inner(ei, ej);
        }
      }
      return G;
    }

    function normSquaredDynkin(labels, G) {
      let total = 0;
      for (let i = 0; i < labels.length; i++) {
        if (!labels[i]) continue;
        for (let j = 0; j < labels.length; j++) {
          if (labels[j]) total += labels[i] * labels[j] * G[i][j];
        }
      }
      return total;
    }

    function dominantNormBoundCandidates(lambdaRows, muRows, type, rank, C) {
      // Candidate source suggested by the user:
      // enumerate dominant nonnegative highest weights γ with
      //     ||γ|| <= ||λ|| + ||μ||
      // for the standard invariant inner product on X^*(T).
      // This avoids Weyl-group candidate loops and also avoids Young-diagram
      // containment heuristics, which are unreliable for exceptional types.
      const lambdaLabels = diagramToDynkinLabels(lambdaRows, rank);
      const muLabels = diagramToDynkinLabels(muRows, rank);
      const G = makeDynkinGram(C);
      const lambdaLen = Math.sqrt(Math.max(0, normSquaredDynkin(lambdaLabels, G)));
      const muLen = Math.sqrt(Math.max(0, normSquaredDynkin(muLabels, G)));
      const radius = lambdaLen + muLen;
      const radius2 = radius * radius + 1e-8;
      const n = C.length;

      // Since fundamental weights have nonnegative pairwise inner products in
      // finite type, each coordinate is bounded by the one-coordinate norm.
      const maxCoord = [];
      let searchBox = 1;
      for (let i = 0; i < n; i++) {
        const ei = Array(n).fill(0); ei[i] = 1;
        const unit2 = normSquaredDynkin(ei, G);
        const m = unit2 > 1e-12 ? Math.floor(radius / Math.sqrt(unit2) + 1e-9) : 0;
        maxCoord.push(Math.max(0, m));
        searchBox *= (Math.max(0, m) + 1);
        if (searchBox > MAX_NORM_BOUND_CANDIDATES * 200) {
          throw new Error(`Norm-bound candidate box has ${searchBox} points before pruning. Try smaller diagrams/rank.`);
        }
      }

      const candidates = new Map();
      function rec(i, acc) {
        const partialNorm2 = normSquaredDynkin(acc, G);
        if (partialNorm2 > radius2) return;
        if (i === n) {
          const k = key(acc);
          candidates.set(k, {
            labels: acc.slice(),
            nu: dynkinLabelsToDiagram(acc),
            candidateSource: `norm ≤ ${radius.toFixed(4)}`,
            normSquared: partialNorm2
          });
          if (candidates.size > MAX_NORM_BOUND_CANDIDATES) {
            throw new Error(`Norm-bound candidate list exceeded ${MAX_NORM_BOUND_CANDIDATES}; try smaller diagrams/rank.`);
          }
          return;
        }
        for (let x = 0; x <= maxCoord[i]; x++) {
          acc[i] = x;
          rec(i + 1, acc);
        }
        acc[i] = 0;
      }
      rec(0, Array(n).fill(0));
      const arr = Array.from(candidates.values()).sort((a,b) => compareTerms({nu:a.nu, labels:a.labels}, {nu:b.nu, labels:b.labels}));
      arr.radius = radius;
      arr.searchBox = searchBox;
      arr.coordinateBounds = maxCoord;
      return arr;
    }

    function irreducibleCharacterFreudenthal(highest, C, cap = MAX_FREUDENTHAL_WEIGHTS) {
      if (!isDominantDynkin(highest)) throw new Error('Freudenthal character generation requires a dominant integral highest weight.');
      // Build the full weight-multiplicity dictionary of V^highest using
      // Freudenthal recursion.  This replaces the old Kostant partition
      // recursion in tensor-product calculations.
      const n = C.length;
      const rho = Array(n).fill(1);
      const rootsSimple = positiveRoots(C);
      const rootsDynkin = rootsSimple.map(r => simpleToDynkin(r, C));
      const simpleRootsDynkin = Array.from({length:n}, (_, i) => {
        const e = Array(n).fill(0); e[i] = 1;
        return simpleToDynkin(e, C);
      });
      const inner = makeDynkinInnerProduct(C);
      const topNorm = inner(add(highest, rho), add(highest, rho));
      const char = new Map();
      const tested = new Set();
      const topKey = key(highest);
      char.set(topKey, { wt: highest.slice(), mult: 1, level: 0 });
      tested.add(topKey);
      let frontier = [highest.slice()];
      let level = 0;

      function multiplicityByFreudenthal(wt) {
        const wtRho = add(wt, rho);
        const denom = topNorm - inner(wtRho, wtRho);
        if (!(denom > 1e-10)) return 0;
        let sum = 0;
        for (const alpha of rootsDynkin) {
          let z = add(wt, alpha);
          while (true) {
            const item = char.get(key(z));
            if (!item) break;
            sum += inner(z, alpha) * item.mult;
            z = add(z, alpha);
          }
        }
        const value = (2 * sum) / denom;
        if (!Number.isFinite(value)) return 0;
        const rounded = Math.round(value);
        return Math.abs(value - rounded) < 1e-6 ? Math.max(0, rounded) : Math.max(0, rounded);
      }

      while (frontier.length) {
        const candidates = new Map();
        for (const wt of frontier) {
          for (const alpha of simpleRootsDynkin) {
            const cand = sub(wt, alpha);
            const k = key(cand);
            if (tested.has(k) || candidates.has(k)) continue;
            // It must still be below the highest weight in the positive root lattice.
            const delta = dynkinToSimple(sub(highest, cand), C);
            if (!isNonnegativeIntVector(delta)) continue;
            candidates.set(k, cand);
          }
        }
        if (!candidates.size) break;
        const next = [];
        level += 1;
        for (const [k, cand] of candidates) {
          tested.add(k);
          const mult = multiplicityByFreudenthal(cand);
          if (mult > 0) {
            char.set(k, { wt: cand, mult, level });
            next.push(cand);
            if (char.size > cap) throw new Error(`Freudenthal character generation exceeded ${cap} weights. Try smaller diagrams/rank.`);
          }
        }
        frontier = next;
      }
      char.highest = highest.slice();
      return char;
    }

    function weightMultiplicityByFreudenthal(highestLabels, weightLabels, C) {
      const delta = dynkinToSimple(sub(highestLabels, weightLabels), C);
      if (!isNonnegativeIntVector(delta)) return { value: 0, characterSize: 0 };
      const char = irreducibleCharacterFreudenthal(highestLabels, C);
      const item = char.get(key(weightLabels));
      return { value: item ? item.mult : 0, characterSize: char.size };
    }

    function kostkaNumber(lambdaRows, contentRows) {
      const shape = trimPartition(lambdaRows), content = trimPartition(contentRows);
      const total = sizeOf(shape);
      if (total !== sizeOf(content)) return 0;
      if (total === 0) return 1;
      if (total > MAX_EXACT_CELLS) throw new Error(`Kostka calculation is capped at ${MAX_EXACT_CELLS} boxes in this browser page.`);
      const m = content.length;
      if (m === 0) return 0;
      const cells = [];
      for (let r=0;r<shape.length;r++) for (let c=0;c<shape[r];c++) cells.push([r,c]);
      const grid = shape.map(len => Array(len).fill(0));
      const supply = content.slice();
      let count = 0, steps = 0;
      function rec(i) {
        if (++steps > MAX_KOSTKA_STEPS) throw new Error(`Kostka recursion exceeded ${MAX_KOSTKA_STEPS} steps; try a smaller shape/content.`);
        if (i === cells.length) { count += 1; return; }
        const [r,c] = cells[i];
        let lo = 1;
        if (c > 0) lo = Math.max(lo, grid[r][c-1]);
        if (r > 0 && c < shape[r-1]) lo = Math.max(lo, grid[r-1][c] + 1);
        for (let v=lo; v<=m; v++) {
          if (supply[v-1] <= 0) continue;
          grid[r][c] = v; supply[v-1] -= 1;
          rec(i + 1);
          supply[v-1] += 1; grid[r][c] = 0;
        }
      }
      rec(0);
      return count;
    }


    function semistandardTableaux(lambdaRows, contentRows) {
      const shape = trimPartition(lambdaRows), content = trimPartition(contentRows);
      const total = sizeOf(shape);
      if (total !== sizeOf(content)) return { tableaux: [], count: 0, capped: false, steps: 0, message: '|λ| and |μ| are different.' };
      if (total === 0) return { tableaux: [[]], count: 1, capped: false, steps: 0, message: '' };
      if (total > MAX_EXACT_CELLS) throw new Error(`Tableaux enumeration is capped at ${MAX_EXACT_CELLS} boxes in this browser page.`);
      const m = content.length;
      if (m === 0) return { tableaux: [], count: 0, capped: false, steps: 0, message: 'Nonempty shape with empty content.' };
      const cells = [];
      for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r]; c++) cells.push([r, c]);
      const grid = shape.map(len => Array(len).fill(0));
      const supply = content.slice();
      const tableaux = [];
      let steps = 0, capped = false;
      function rec(i) {
        if (++steps > MAX_KOSTKA_STEPS) throw new Error(`Tableaux recursion exceeded ${MAX_KOSTKA_STEPS} steps; try a smaller shape/content.`);
        if (i === cells.length) {
          tableaux.push(grid.map(row => row.slice()));
          if (tableaux.length >= MAX_KOSTKA_TABLEAUX) capped = true;
          return;
        }
        if (capped) return;
        const [r, c] = cells[i];
        let lo = 1;
        if (c > 0) lo = Math.max(lo, grid[r][c - 1]);
        if (r > 0 && c < shape[r - 1]) lo = Math.max(lo, grid[r - 1][c] + 1);
        for (let v = lo; v <= m; v++) {
          if (supply[v - 1] <= 0) continue;
          grid[r][c] = v;
          supply[v - 1] -= 1;
          rec(i + 1);
          supply[v - 1] += 1;
          grid[r][c] = 0;
          if (capped) return;
        }
      }
      rec(0);
      return { tableaux, count: tableaux.length, capped, steps, message: capped ? `Display capped at ${MAX_KOSTKA_TABLEAUX} tableaux.` : '' };
    }

    function tableauToHTML(tableau) {
      if (!tableau.length) return '<span class="decomp-label">∅</span>';
      let html = '<table class="ssyt-table" aria-label="semistandard Young tableau"><tbody>';
      for (const row of tableau) html += '<tr>' + row.map(v => `<td>${v}</td>`).join('') + '</tr>';
      return html + '</tbody></table>';
    }

    function renderKostkaTableaux(result, lambda, mu) {
      const out = $('kostka-out');
      out.innerHTML = '';
      const summary = document.createElement('div');
      summary.className = 'ssyt-summary';
      const kText = result.capped ? `≥ ${result.count}` : String(result.count);
      summary.innerHTML = `K<sub>λ,μ</sub> = <strong>${kText}</strong> for shape λ = ${partitionToString(lambda)} and weight μ = ${partitionToString(mu)}.`;
      out.appendChild(summary);
      if (result.message) {
        const msg = document.createElement('div');
        msg.className = result.capped ? 'warning-text' : 'hint';
        msg.textContent = result.message;
        out.appendChild(msg);
      }
      if (!result.tableaux.length) {
        const none = document.createElement('span');
        none.className = 'hint';
        none.textContent = 'No semistandard tableaux.';
        out.appendChild(none);
        return;
      }
      const list = document.createElement('div');
      list.className = 'ssyt-list';
      result.tableaux.forEach((tab, i) => {
        const item = document.createElement('div');
        item.className = 'ssyt-item';
        item.innerHTML = `<span class="ssyt-index">#${i + 1}</span>${tableauToHTML(tab)}`;
        list.appendChild(item);
      });
      out.appendChild(list);
    }

    function formatKostkaForExport(data) {
      const lines = [];
      lines.push('# double_young_diagram semistandard Young tableaux');
      lines.push(`# shape lambda: ${partitionToString(data.lambda)}`);
      lines.push(`# weight mu: ${partitionToString(data.mu)}`);
      lines.push(`# K_lambda,mu: ${data.result.capped ? 'at least ' : ''}${data.result.count}`);
      if (data.result.message) lines.push(`# note: ${data.result.message}`);
      lines.push('');
      if (!data.result.tableaux.length) {
        lines.push('No semistandard tableaux.');
        return lines.join('\n');
      }
      data.result.tableaux.forEach((tab, i) => {
        lines.push(`Tableau ${i + 1}:`);
        if (!tab.length) lines.push('  ∅');
        else for (const row of tab) lines.push('  ' + row.join(' '));
        lines.push('');
      });
      return lines.join('\n').trimEnd();
    }

    function computeKostkaTableaux() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      try {
        const result = semistandardTableaux(lambda, mu);
        state.lastKostka = { lambda, mu, result };
        renderKostkaTableaux(result, lambda, mu);
        clearDoubleCardStale('kostka-out');
      } catch (err) {
        state.lastKostka = null;
        $('kostka-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        clearDoubleCardStale('kostka-out');
      }
      refreshExport({ force: true });
    }

    function exportKostkaTableaux() {
      if (!state.lastKostka) computeKostkaTableaux();
      if (!state.lastKostka) return;
      state.exportMode = 'kostka';
      state.exportFilename = 'kostka_tableaux.txt';
      $('export-out').value = formatKostkaForExport(state.lastKostka);
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }


    function factorialNumber(n) {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }

    function standardTableauxCount(lambda) {
      lambda = trimPartition(lambda);
      const n = sizeOf(lambda);
      if (n === 0) return 1;
      const cols = conjugatePartition(lambda);
      let denom = 1;
      for (let r = 0; r < lambda.length; r++) {
        for (let c = 0; c < lambda[r]; c++) {
          denom *= (lambda[r] - c) + ((cols[c] || 0) - r - 1);
        }
      }
      return Math.round(factorialNumber(n) / denom);
    }

    function zValue(cycleType) {
      const counts = new Map();
      for (const p of trimPartition(cycleType)) counts.set(p, (counts.get(p) || 0) + 1);
      let z = 1;
      for (const [part, mult] of counts.entries()) z *= Math.pow(part, mult) * factorialNumber(mult);
      return z;
    }

    function subpartitionsOfShape(shape, targetSize) {
      shape = trimPartition(shape);
      const out = [];
      function rec(i, prev, acc, used) {
        if (used > targetSize) return;
        if (i === shape.length) {
          if (used === targetSize) out.push(trimPartition(acc));
          return;
        }
        const max = Math.min(shape[i], prev, targetSize - used);
        for (let x = max; x >= 0; x--) {
          acc.push(x);
          rec(i + 1, x, acc, used + x);
          acc.pop();
        }
      }
      rec(0, shape[0] || 0, [], 0);
      const seen = new Set();
      return out.filter((p) => {
        const k = partitionKey(p);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    function skewCellList(outer, inner) {
      outer = trimPartition(outer); inner = trimPartition(inner);
      const cells = [];
      for (let r = 0; r < outer.length; r++) {
        for (let c = inner[r] || 0; c < outer[r]; c++) cells.push([r, c]);
      }
      return cells;
    }

    function isConnectedCellSet(cells) {
      if (!cells.length) return false;
      const set = new Set(cells.map(([r, c]) => r + ',' + c));
      const stack = [cells[0].join(',')];
      const seen = new Set(stack);
      while (stack.length) {
        const [r, c] = stack.pop().split(',').map(Number);
        for (const [rr, cc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
          const k = rr + ',' + cc;
          if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
        }
      }
      return seen.size === cells.length;
    }

    function hasTwoByTwo(cells) {
      const set = new Set(cells.map(([r, c]) => r + ',' + c));
      for (const [r, c] of cells) {
        if (set.has(r + ',' + c) && set.has((r + 1) + ',' + c) && set.has(r + ',' + (c + 1)) && set.has((r + 1) + ',' + (c + 1))) return true;
      }
      return false;
    }

    function isBorderStrip(outer, inner) {
      const cells = skewCellList(outer, inner);
      return cells.length > 0 && isConnectedCellSet(cells) && !hasTwoByTwo(cells);
    }

    const symmetricCharacterMemo = new Map();
    function rimHookRemovals(shape, stripSize) {
      shape = trimPartition(shape);
      const targetSize = sizeOf(shape) - stripSize;
      if (targetSize < 0) return [];
      const out = [];
      for (const inner of subpartitionsOfShape(shape, targetSize)) {
        if (!isBorderStrip(shape, inner)) continue;
        const cells = skewCellList(shape, inner);
        const rows = new Set(cells.map(([r]) => r));
        out.push({ remaining: inner, height: rows.size - 1 });
      }
      return out;
    }

    function symmetricCharacter(shape, cycleType) {
      shape = trimPartition(shape);
      cycleType = trimPartition(cycleType).sort((a, b) => b - a);
      if (sizeOf(shape) !== sizeOf(cycleType)) return 0;
      const memoKey = partitionKey(shape) + '|' + partitionKey(cycleType);
      if (symmetricCharacterMemo.has(memoKey)) return symmetricCharacterMemo.get(memoKey);
      let val;
      if (!cycleType.length) {
        val = shape.length ? 0 : 1;
      } else {
        const k = cycleType[0];
        const rest = cycleType.slice(1);
        val = 0;
        for (const rem of rimHookRemovals(shape, k)) {
          val += (rem.height % 2 ? -1 : 1) * symmetricCharacter(rem.remaining, rest);
        }
      }
      symmetricCharacterMemo.set(memoKey, val);
      return val;
    }

    function kroneckerCoefficient(lambda, mu, nu) {
      const n = sizeOf(lambda);
      if (sizeOf(mu) !== n || sizeOf(nu) !== n) return 0;
      let total = 0;
      for (const rho of partitionsOf(n)) {
        total += symmetricCharacter(lambda, rho) * symmetricCharacter(mu, rho) * symmetricCharacter(nu, rho) / zValue(rho);
      }
      return Math.max(0, Math.round(total));
    }

    function decomposeKronecker(lambda, mu) {
      lambda = trimPartition(lambda); mu = trimPartition(mu);
      const n = sizeOf(lambda);
      if (n !== sizeOf(mu)) throw new Error('Kronecker decomposition requires |λ| = |μ|.');
      if (n > MAX_KRONECKER_BOXES) throw new Error(`Kronecker computation capped at ${MAX_KRONECKER_BOXES} boxes.`);
      const terms = [];
      for (const nu of partitionsOf(n)) {
        const c = kroneckerCoefficient(lambda, mu, nu);
        if (c) terms.push({ nu, coefficient: c, dimension: standardTableauxCount(nu) });
      }
      const found = terms.reduce((s, t) => s + t.coefficient * t.dimension, 0);
      const target = standardTableauxCount(lambda) * standardTableauxCount(mu);
      terms.dimensionCheck = { found, target, ok: found === target };
      return terms.sort(compareTerms);
    }

    function addToPowerMap(map, partition, coeff) {
      if (Math.abs(coeff) < 1e-12) return;
      const p = trimPartition(partition).sort((a, b) => b - a);
      const k = partitionKey(p);
      map.set(k, (map.get(k) || 0) + coeff);
      if (map.size > MAX_POWER_SUM_TERMS) throw new Error(`Power-sum expansion exceeded ${MAX_POWER_SUM_TERMS} terms.`);
    }

    function multiplyPowerMaps(A, B) {
      const out = new Map();
      for (const [ka, ca] of A.entries()) {
        const pa = ka ? ka.split(',').map(Number) : [];
        for (const [kb, cb] of B.entries()) {
          const pb = kb ? kb.split(',').map(Number) : [];
          addToPowerMap(out, pa.concat(pb), ca * cb);
        }
      }
      return out;
    }

    function scaledSchurPowerExpansion(shape, scalePart) {
      shape = trimPartition(shape);
      const n = sizeOf(shape);
      const out = new Map();
      for (const beta of partitionsOf(n)) {
        const coeff = symmetricCharacter(shape, beta) / zValue(beta);
        if (!coeff) continue;
        addToPowerMap(out, beta.map((x) => x * scalePart), coeff);
      }
      return out;
    }

    function plethysmPowerExpansion(lambda, mu) {
      const m = sizeOf(lambda), n = sizeOf(mu);
      if (m === 0) return new Map([['', 1]]);
      if (n === 0) throw new Error('Plethysm with empty μ is not implemented in this browser card.');
      if (m * n > MAX_PLETHYSM_BOXES) throw new Error(`Plethysm computation capped at ${MAX_PLETHYSM_BOXES} output boxes.`);
      const total = new Map();
      for (const alpha of partitionsOf(m)) {
        const outer = symmetricCharacter(lambda, alpha) / zValue(alpha);
        if (!outer) continue;
        let product = new Map([['', 1]]);
        for (const part of alpha) product = multiplyPowerMaps(product, scaledSchurPowerExpansion(mu, part));
        for (const [rhoKey, coeff] of product.entries()) {
          const rho = rhoKey ? rhoKey.split(',').map(Number) : [];
          addToPowerMap(total, rho, outer * coeff);
        }
      }
      return total;
    }

    function decomposePlethysm(lambda, mu) {
      lambda = trimPartition(lambda); mu = trimPartition(mu);
      const totalSize = sizeOf(lambda) * sizeOf(mu);
      if (totalSize > MAX_PLETHYSM_BOXES) throw new Error(`Plethysm computation capped at ${MAX_PLETHYSM_BOXES} output boxes.`);
      const power = plethysmPowerExpansion(lambda, mu);
      const terms = [];
      for (const nu of partitionsOf(totalSize)) {
        let coeff = 0;
        for (const [rhoKey, a] of power.entries()) {
          const rho = rhoKey ? rhoKey.split(',').map(Number) : [];
          coeff += a * symmetricCharacter(nu, rho);
        }
        const c = Math.round(coeff);
        if (c) terms.push({ nu, coefficient: c });
      }
      terms.powerTermCount = power.size;
      terms.dimensionCheck = null;
      return terms.sort(compareTerms);
    }

    function addToWeightCharacter(map, wt, coeff, cap = MAX_SCHUR_FUNCTOR_CHAR_TERMS) {
      if (Math.abs(coeff) < 1e-10) return;
      const k = key(wt);
      const next = (map.get(k) || 0) + coeff;
      if (Math.abs(next) < 1e-10) map.delete(k);
      else map.set(k, next);
      if (map.size > cap) throw new Error(`Schur-functor character expansion exceeded ${cap} weights; try a smaller λ or μ.`);
    }

    function freudenthalMapToWeightCharacter(char) {
      const out = new Map();
      for (const item of char.values()) addToWeightCharacter(out, item.wt, item.mult);
      return out;
    }

    function multiplyWeightCharacters(A, B, cap = MAX_SCHUR_FUNCTOR_CHAR_TERMS) {
      const out = new Map();
      for (const [ka, ca] of A.entries()) {
        const a = ka ? ka.split(',').map(Number) : [];
        for (const [kb, cb] of B.entries()) {
          const b = kb ? kb.split(',').map(Number) : [];
          const wt = a.map((x, i) => x + (b[i] || 0));
          addToWeightCharacter(out, wt, ca * cb, cap);
        }
      }
      return out;
    }

    function scaleWeightCharacterWeights(A, factor, cap = MAX_SCHUR_FUNCTOR_CHAR_TERMS) {
      const out = new Map();
      for (const [ka, ca] of A.entries()) {
        const a = ka ? ka.split(',').map(Number) : [];
        addToWeightCharacter(out, a.map(x => x * factor), ca, cap);
      }
      return out;
    }

    function schurFunctorCharacter(muRows, baseChar, rank) {
      // Character formula for Schur functors:
      //   ch(S^μ W) = Σ_{α⊢|μ|} χ^μ(α)/z_α · ∏_{k∈α} ψ_k(ch W),
      // where ψ_k(e^ν)=e^{kν}.  Here ch W is the finite-type character of V^λ.
      const mu = trimPartition(muRows);
      const degree = sizeOf(mu);
      const zero = Array(rank).fill(0);
      if (degree === 0) return { char: new Map([[key(zero), 1]]), powerTermCount: 1 };
      if (degree > MAX_PLETHYSM_BOXES) throw new Error(`Schur functor degree capped at ${MAX_PLETHYSM_BOXES}.`);
      const total = new Map();
      let powerTermCount = 0;
      for (const alpha of partitionsOf(degree)) {
        const outer = symmetricCharacter(mu, alpha) / zValue(alpha);
        if (!outer) continue;
        let product = new Map([[key(zero), 1]]);
        for (const part of alpha) {
          const adams = scaleWeightCharacterWeights(baseChar, part);
          product = multiplyWeightCharacters(product, adams);
        }
        powerTermCount += product.size;
        for (const [wtKey, coeff] of product.entries()) {
          const wt = wtKey ? wtKey.split(',').map(Number) : zero.slice();
          addToWeightCharacter(total, wt, outer * coeff);
        }
      }
      // Clean numerical roundoff: final multiplicities are integers.
      for (const [k, v] of Array.from(total.entries())) {
        const r = Math.round(v);
        if (Math.abs(v - r) < 1e-7) {
          if (r === 0) total.delete(k);
          else total.set(k, r);
        }
      }
      return { char: total, powerTermCount };
    }

    function chooseHighestResidualWeight(residual, C) {
      const G = makeDynkinGram(C);
      const candidates = [];
      for (const [k, coeff] of residual.entries()) {
        const c = Math.round(coeff);
        if (c <= 0 || Math.abs(coeff - c) > 1e-6) continue;
        const wt = k ? k.split(',').map(Number) : [];
        if (!wt.every(x => x >= 0)) continue;
        candidates.push({ wt, coeff: c, norm: normSquaredDynkin(wt, G), height: wt.reduce((a,b)=>a+b,0) });
      }
      if (!candidates.length) return null;
      candidates.sort((a, b) => {
        const dn = b.norm - a.norm;
        if (Math.abs(dn) > 1e-8) return dn;
        const dh = b.height - a.height;
        if (dh) return dh;
        for (let i = 0; i < Math.max(a.wt.length, b.wt.length); i++) {
          const d = (b.wt[i] || 0) - (a.wt[i] || 0);
          if (d) return d;
        }
        return 0;
      });
      return candidates[0];
    }

    function cleanResidualCharacter(residual) {
      for (const [k, v] of Array.from(residual.entries())) {
        const r = Math.round(v);
        if (Math.abs(v - r) < 1e-7) {
          if (r === 0) residual.delete(k);
          else residual.set(k, r);
        } else if (Math.abs(v) < 1e-8) residual.delete(k);
      }
    }

    function decomposeCharacterByHighestWeightPeeling(characterMap, type, rank, C) {
      // Decompose a finite-type character into irreducibles by repeatedly taking
      // the largest dominant residual weight and subtracting that irreducible
      // character.  This produces terms V^γ, so the final answer respects the
      // selected Dynkin type/rank rather than ordinary symmetric-function
      // plethysm alone.
      const residual = new Map(characterMap);
      cleanResidualCharacter(residual);
      const terms = [];
      let iterations = 0;
      while (residual.size) {
        if (++iterations > MAX_SCHUR_FUNCTOR_DECOMP_TERMS) throw new Error(`Schur-functor decomposition exceeded ${MAX_SCHUR_FUNCTOR_DECOMP_TERMS} irreducible terms.`);
        const top = chooseHighestResidualWeight(residual, C);
        if (!top) break;
        const mult = top.coeff;
        const gammaChar = irreducibleCharacterFreudenthal(top.wt, C);
        for (const item of gammaChar.values()) {
          const k = key(item.wt);
          residual.set(k, (residual.get(k) || 0) - mult * item.mult);
        }
        cleanResidualCharacter(residual);
        terms.push({
          labels: top.wt,
          nu: dynkinLabelsToDiagram(top.wt),
          coefficient: mult,
          dimensionBigInt: weylDimensionBigInt(top.wt, C),
          dimension: weylDimension(top.wt, C),
          characterWeights: gammaChar.size
        });
      }
      terms.residualWeightCount = residual.size;
      terms.residualL1 = Array.from(residual.values()).reduce((s, x) => s + Math.abs(x), 0);
      return terms.sort(compareTerms);
    }

    function decomposeSchurFunctorFiniteType(lambdaRows, muRows, type, rank) {
      const C = cartanMatrix(type, rank);
      const lambdaLabels = diagramToDynkinLabels(lambdaRows, rank);
      const baseCharFreudenthal = irreducibleCharacterFreudenthal(lambdaLabels, C);
      const baseChar = freudenthalMapToWeightCharacter(baseCharFreudenthal);
      const schurCharData = schurFunctorCharacter(muRows, baseChar, rank);
      const terms = decomposeCharacterByHighestWeightPeeling(schurCharData.char, type, rank, C);
      const targetDimension = Math.round(Array.from(schurCharData.char.values()).reduce((s, x) => s + x, 0));
      let found = 0n;
      for (const t of terms) found += BigInt(t.coefficient) * t.dimensionBigInt;
      terms.dimensionCheck = { found: found.toString(), target: String(targetDimension), ok: found === BigInt(targetDimension) };
      terms.baseCharacterWeightCount = baseCharFreudenthal.size;
      terms.schurCharacterWeightCount = schurCharData.char.size;
      terms.powerTermCount = schurCharData.powerTermCount;
      terms.lambdaLabels = lambdaLabels;
      return terms;
    }

    function renderLieSchurFunctorDecomposition(outputId, lambda, mu, terms, type, rank) {
      const out = $(outputId);
      out.innerHTML = '';
      if (!terms.length) {
        out.innerHTML = '<span class="hint">No nonzero irreducible terms found under the current cap.</span>';
        return;
      }
      const algebraLabel = lieAlgebraLabel(type, rank);
      const formula = document.createElement('div');
      formula.className = 'decomp-formula';
      formula.innerHTML = `𝕊<sup>${partitionToString(mu)}</sup>(V<sup>${partitionToString(lambda)}</sup><sub>${algebraLabel}</sub>) = ` +
        terms.map(t => `${t.coefficient > 1 ? t.coefficient + '·' : ''}V<sup>${partitionToString(t.nu)}</sup><sub>${algebraLabel}</sub>`).join(' ⊕ ');
      out.appendChild(formula);
      for (const t of terms.slice(0, 100)) {
        const row = document.createElement('div'); row.className = 'decomp-row';
        const mult = document.createElement('span'); mult.className = 'decomp-mult'; mult.textContent = t.coefficient > 1 ? `×${t.coefficient}` : '×1';
        const diagram = document.createElement('span'); diagram.className = 'decomp-diagram'; diagram.innerHTML = miniDiagram(t.nu, 25);
        const label = document.createElement('span'); label.className = 'decomp-label';
        label.textContent = `${partitionToString(t.nu)}  Dynkin=[${t.labels.join(', ')}]  dim=${t.dimension}`;
        row.appendChild(mult); row.appendChild(diagram); row.appendChild(label); out.appendChild(row);
      }
      if (terms.length > 100) {
        const more = document.createElement('div'); more.className = 'hint';
        more.textContent = `… ${terms.length - 100} more terms omitted.`;
        out.appendChild(more);
      }
      if (terms.dimensionCheck) {
        const check = document.createElement('div');
        check.className = terms.dimensionCheck.ok ? 'hint' : 'warning-text';
        check.textContent = terms.dimensionCheck.ok
          ? `Dimension check passed: ${terms.dimensionCheck.found} = ${terms.dimensionCheck.target}.`
          : `Dimension check failed: displayed ${terms.dimensionCheck.found}, target ${terms.dimensionCheck.target}.`;
        out.appendChild(check);
      }
      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = `Base character V^λ had ${terms.baseCharacterWeightCount || 0} weights; Schur-functor character had ${terms.schurCharacterWeightCount || 0} weights; power-sum formula used ${terms.powerTermCount || 0} intermediate terms. Output is decomposed into irreducibles for ${algebraLabel}.`;
      out.appendChild(note);
      if (terms.residualWeightCount) {
        const warn = document.createElement('div'); warn.className = 'warning-text';
        warn.textContent = `Residual character was not fully decomposed (${terms.residualWeightCount} weights remain; total absolute coefficient ${terms.residualL1}).`;
        out.appendChild(warn);
      }
    }

    function formatLieSchurFunctorExport(data) {
      const algebraLabel = lieAlgebraLabel(data.type, data.rank);
      const lines = [];
      lines.push('# Schur functor decomposition');
      lines.push(`# type: ${algebraLabel}`);
      lines.push(`# lambda: ${partitionToString(data.lambda)}`);
      lines.push(`# mu: ${partitionToString(data.mu)}`);
      lines.push(`# lambda Dynkin labels: [${data.terms.lambdaLabels.join(', ')}]`);
      lines.push('');
      lines.push(`S^${partitionToString(data.mu)}(V^${partitionToString(data.lambda)}_${algebraLabel}) =`);
      if (!data.terms.length) lines.push('  0');
      else for (const t of data.terms) {
        lines.push(`  ${t.coefficient === 1 ? '' : t.coefficient + '*'}V^${partitionToString(t.nu)}_${algebraLabel}  dynkin=[${t.labels.join(', ')}]  dim=${t.dimension}`);
      }
      if (data.terms.dimensionCheck) lines.push(`# dimension check: displayed=${data.terms.dimensionCheck.found} target=${data.terms.dimensionCheck.target} ok=${data.terms.dimensionCheck.ok}`);
      lines.push(`# base character weights: ${data.terms.baseCharacterWeightCount || 0}`);
      lines.push(`# Schur-functor character weights: ${data.terms.schurCharacterWeightCount || 0}`);
      lines.push(`# power-sum intermediate terms: ${data.terms.powerTermCount || 0}`);
      if (data.terms.residualWeightCount) lines.push(`# residual weights: ${data.terms.residualWeightCount}; residual L1=${data.terms.residualL1}`);
      return lines.join('\n');
    }

    function renderCoefficientDecomposition(outputId, leftHTML, terms, options = {}) {
      const out = $(outputId);
      out.innerHTML = '';
      if (!terms.length) {
        out.innerHTML = '<span class="hint">No nonzero terms found under the current cap.</span>';
        return;
      }
      const formula = document.createElement('div');
      formula.className = 'decomp-formula';
      formula.innerHTML = leftHTML + ' = ' + terms.map(t => `${t.coefficient > 1 ? t.coefficient + '·' : ''}s<sub>${partitionToString(t.nu)}</sub>`).join(' ⊕ ');
      out.appendChild(formula);
      const hue = options.hue || 250;
      for (const t of terms.slice(0, 100)) {
        const row = document.createElement('div'); row.className = 'decomp-row';
        const mult = document.createElement('span'); mult.className = 'decomp-mult'; mult.textContent = t.coefficient > 1 ? `×${t.coefficient}` : '×1';
        const diagram = document.createElement('span'); diagram.className = 'decomp-diagram'; diagram.innerHTML = miniDiagram(t.nu, hue);
        const label = document.createElement('span'); label.className = 'decomp-label';
        label.textContent = `${partitionToString(t.nu)}${t.dimension != null ? '  dim=' + t.dimension : ''}`;
        row.appendChild(mult); row.appendChild(diagram); row.appendChild(label); out.appendChild(row);
      }
      if (terms.length > 100) {
        const more = document.createElement('div');
        more.className = 'hint';
        more.textContent = `… ${terms.length - 100} more terms omitted.`;
        out.appendChild(more);
      }
      if (terms.dimensionCheck) {
        const check = document.createElement('div');
        check.className = terms.dimensionCheck.ok ? 'hint' : 'warning-text';
        check.textContent = terms.dimensionCheck.ok
          ? `Dimension check passed: ${terms.dimensionCheck.found} = ${terms.dimensionCheck.target}.`
          : `Dimension check failed: displayed ${terms.dimensionCheck.found}, target ${terms.dimensionCheck.target}.`;
        out.appendChild(check);
      }
      if (options.note) {
        const note = document.createElement('div');
        note.className = 'hint';
        note.textContent = options.note;
        out.appendChild(note);
      }
    }

    function formatCoefficientExport(title, left, lambda, mu, terms, extraLines = []) {
      const lines = [`# ${title}`, `# lambda: ${partitionToString(lambda)}`, `# mu: ${partitionToString(mu)}`, '', `${left} =`];
      if (!terms.length) lines.push('  0');
      else for (const t of terms) lines.push(`  ${t.coefficient === 1 ? '' : t.coefficient + '*'}s_${partitionToString(t.nu)}`);
      lines.push('', '# terms');
      for (const t of terms) lines.push(`multiplicity=${t.coefficient}  partition=${partitionToString(t.nu)}${t.dimension != null ? '  dim=' + t.dimension : ''}`);
      if (terms.dimensionCheck) lines.push(`# dimension check: displayed=${terms.dimensionCheck.found} target=${terms.dimensionCheck.target} ok=${terms.dimensionCheck.ok}`);
      for (const line of extraLines) lines.push(`# ${line}`);
      return lines.join('\n');
    }

    function computeKronecker() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      try {
        const terms = decomposeKronecker(lambda, mu);
        state.lastKronecker = { lambda, mu, terms, kind: 'kronecker' };
        renderCoefficientDecomposition('kronecker-out', `s<sub>${partitionToString(lambda)}</sub> * s<sub>${partitionToString(mu)}</sub>`, terms, {
          hue: 280,
          note: 'Kronecker coefficients are computed from symmetric-group characters using the Murnaghan–Nakayama rule.'
        });
        clearDoubleCardStale('kronecker-out');
      } catch (err) {
        state.lastKronecker = null;
        $('kronecker-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        clearDoubleCardStale('kronecker-out');
      }
      refreshExport({ force: true });
    }

    function exportKronecker() {
      if (!state.lastKronecker) computeKronecker();
      if (!state.lastKronecker) return;
      const { lambda, mu, terms } = state.lastKronecker;
      state.exportMode = 'kronecker';
      state.exportFilename = 'kronecker_decomposition.txt';
      $('export-out').value = formatCoefficientExport('Kronecker decomposition', `s_${partitionToString(lambda)} * s_${partitionToString(mu)}`, lambda, mu, terms, [
        'Kronecker coefficients via symmetric-group characters and the Murnaghan--Nakayama rule.'
      ]);
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }

    function computePlethysm() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      try {
        const terms = decomposePlethysm(lambda, mu);
        state.lastPlethysm = { lambda, mu, terms, kind: 'plethysm' };
        renderCoefficientDecomposition('plethysm-out', `s<sub>${partitionToString(lambda)}</sub> ∘ s<sub>${partitionToString(mu)}</sub>`, terms, {
          hue: 315,
          note: `Power-sum expansion used ${terms.powerTermCount || 0} intermediate term${terms.powerTermCount === 1 ? '' : 's'}. Dimension-completeness guard can be added later.`
        });
        clearDoubleCardStale('plethysm-out');
      } catch (err) {
        state.lastPlethysm = null;
      state.lastSchurFunctor = null;
        $('plethysm-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        clearDoubleCardStale('plethysm-out');
      }
      refreshExport({ force: true });
    }

    function exportPlethysm() {
      if (!state.lastPlethysm) computePlethysm();
      if (!state.lastPlethysm) return;
      const { lambda, mu, terms } = state.lastPlethysm;
      state.exportMode = 'plethysm';
      state.exportFilename = 'plethysm_decomposition.txt';
      $('export-out').value = formatCoefficientExport('Plethysm decomposition', `s_${partitionToString(lambda)} o s_${partitionToString(mu)}`, lambda, mu, terms, [
        `Power-sum expansion terms: ${terms.powerTermCount || 0}.`,
        'Dimension-completeness guard can be added later.'
      ]);
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }

    function computeSchurFunctor() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank();
      try {
        const terms = decomposeSchurFunctorFiniteType(lambda, mu, type, rank);
        state.lastSchurFunctor = { lambda, mu, terms, type, rank, kind: 'schur-functor' };
        renderLieSchurFunctorDecomposition('schur-functor-out', lambda, mu, terms, type, rank);
        clearDoubleCardStale('schur-functor-out');
      } catch (err) {
        state.lastSchurFunctor = null;
        $('schur-functor-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        clearDoubleCardStale('schur-functor-out');
      }
      refreshExport({ force: true });
    }

    function exportSchurFunctor() {
      if (!state.lastSchurFunctor) computeSchurFunctor();
      if (!state.lastSchurFunctor) return;
      state.exportMode = 'schur-functor';
      state.exportFilename = 'schur_functor_decomposition.txt';
      $('export-out').value = formatLieSchurFunctorExport(state.lastSchurFunctor);
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }

    function candidateListFromStableTerms(stableTerms, rank) {
      const candidates = new Map();
      for (const term of stableTerms) {
        const nu = trimPartition(term.nu);
        if (nu.length > rank) continue;
        const labels = diagramToDynkinLabels(nu, rank);
        const k = key(labels);
        if (!candidates.has(k)) candidates.set(k, { nu, labels, sourceNu: nu, stableCoefficient: term.coefficient });
      }
      return Array.from(candidates.values()).sort((a,b) => compareTerms({nu:a.nu, labels:a.labels}, {nu:b.nu, labels:b.labels}));
    }

    function decomposeByCandidatesBrauerKlimyk(lambdaRows, muRows, candidates, type, rank, C) {
      // Brauer--Klimyk / Klimyk--Racah--Speiser engine:
      // compute the character of the smaller factor by Freudenthal recursion,
      // then straighten larger + η under the shifted Weyl action.  The supplied
      // candidate list is used only as a filter for allowed highest weights.
      const lambdaLabels = diagramToDynkinLabels(lambdaRows, rank);
      const muLabels = diagramToDynkinLabels(muRows, rank);
      const dimLambda = weylDimensionBigInt(lambdaLabels, C);
      const dimMu = weylDimensionBigInt(muLabels, C);
      const useMuAsCharacter = dimMu <= dimLambda;
      const charHighest = useMuAsCharacter ? muLabels : lambdaLabels;
      const larger = useMuAsCharacter ? lambdaLabels : muLabels;
      const char = irreducibleCharacterFreudenthal(charHighest, C);
      const wanted = new Map(candidates.map(c => [key(c.labels), c]));
      const combined = new Map();
      for (const item of char.values()) {
        const straight = shiftedWeylStraighten(add(larger, item.wt), C);
        if (straight.singular) continue;
        const k = key(straight.labels);
        const cand = wanted.get(k);
        if (!cand) continue;
        const coeff = straight.sign * item.mult;
        if (!coeff) continue;
        const old = combined.get(k);
        if (old) old.coefficient += coeff;
        else combined.set(k, {
          labels: straight.labels,
          nu: dynkinLabelsToDiagram(straight.labels),
          coefficient: coeff,
          dimensionBigInt: weylDimensionBigInt(straight.labels, C),
          candidateSource: cand.sourceNu ? `subdiagram/source ${partitionToString(cand.sourceNu)}` : 'candidate',
          sourceNu: cand.sourceNu,
          stableCoefficient: cand.stableCoefficient,
          characterWeights: char.size,
          characterSide: useMuAsCharacter ? 'μ' : 'λ'
        });
      }
      const terms = Array.from(combined.values()).filter(t => t.coefficient > 0).sort(compareTerms);
      terms.characterWeightCount = char.size;
      terms.characterSide = useMuAsCharacter ? 'μ' : 'λ';
      return terms;
    }

    function fixedRankCandidateTermsFromStable(lambdaRows, muRows, type) {
      // The stable decomposition is used only as a small list of possible
      // finite-rank summands η for classical types.  This is the key speed-up:
      // we no longer scan a root-lattice box or enumerate the full tensor-
      // product weight support.
      if (type === 'A') return decomposeTypeAStable(lambdaRows, muRows).sort(compareTerms);
      if (['B','C','D'].includes(type)) return decomposeClassicalStable(lambdaRows, muRows).sort(compareTerms);
      throw new Error('Stable candidate generation is not available for exceptional types.');
    }

    function allSubdiagramsOf(partition, maxRows) {
      // Return every Young diagram γ contained in `partition`, including ∅.
      // Example: [2] contributes [2], [1], ∅; [1,1] contributes [1,1], [1], ∅.
      const top = trimPartition(partition).slice(0, maxRows);
      const out = [];
      function rec(row, prev, acc) {
        if (row === maxRows) { out.push(trimPartition(acc)); return; }
        const bound = Math.min(prev, top[row] || 0);
        for (let x = bound; x >= 0; x--) {
          acc[row] = x;
          rec(row + 1, x, acc);
        }
      }
      rec(0, top[0] || 0, Array(maxRows).fill(0));
      return out;
    }

    function exceptionalCandidateDiagramsFromTypeAStable(lambdaRows, muRows, rank) {
      // Exceptional types do not have a stable Young-diagram tensor rule.
      // We use the user's proposed finite candidate source:
      //   1. compute the ordinary type-A stable LR summand diagrams ν;
      //   2. enumerate all sub-Young diagrams γ ⊆ ν;
      //   3. remove duplicates;
      //   4. test every γ by the finite-rank Klimyk/Racah--Speiser coefficient.
      const total = sizeOf(lambdaRows) + sizeOf(muRows);
      if (total > MAX_EXCEPTIONAL_TYPE_A_SOURCE_BOXES) {
        throw new Error(`Exceptional candidate source is capped at |λ|+|μ| ≤ ${MAX_EXCEPTIONAL_TYPE_A_SOURCE_BOXES}; current total is ${total}.`);
      }
      const sources = decomposeTypeAStable(lambdaRows, muRows).sort(compareTerms);
      const candidates = new Map();
      for (const source of sources) {
        for (const p of allSubdiagramsOf(source.nu, rank)) {
          const labels = diagramToDynkinLabels(p, rank);
          const k = partitionKey(p);
          if (!candidates.has(k)) candidates.set(k, { nu: p, labels, sourceNu: source.nu });
          if (candidates.size > MAX_EXCEPTIONAL_SUBDIAGRAM_CANDIDATES) {
            throw new Error(`Exceptional subdiagram candidate list exceeded ${MAX_EXCEPTIONAL_SUBDIAGRAM_CANDIDATES}; try smaller diagrams.`);
          }
        }
      }
      const arr = Array.from(candidates.values()).sort((a,b) => compareTerms({nu:a.nu, labels:a.labels}, {nu:b.nu, labels:b.labels}));
      arr.sourceCount = sources.length;
      return arr;
    }

    function dimensionCheckForTerms(lambdaRows, muRows, terms, type, rank, C) {
      const lambdaLabels = diagramToDynkinLabels(lambdaRows, rank);
      const muLabels = diagramToDynkinLabels(muRows, rank);
      const target = weylDimensionBigInt(lambdaLabels, C) * weylDimensionBigInt(muLabels, C);
      let found = 0n;
      for (const t of terms) {
        const dim = t.dimensionBigInt != null ? t.dimensionBigInt : weylDimensionBigInt(t.labels, C);
        t.dimensionBigInt = dim;
        t.dimension = dim.toString();
        found += BigInt(t.coefficient) * dim;
      }
      const missing = target - found;
      return { target: target.toString(), found: found.toString(), missing: missing.toString(), ok: missing === 0n };
    }

    function appendWarning(existing, extra) {
      return existing ? existing + ' ' + extra : extra;
    }

    function decomposeFixedRank(lambdaRows, muRows, type, rank) {
      if (type === 'A') {
        const terms = decomposeFixedRankTypeA(lambdaRows, muRows, rank);
        const C = cartanMatrix(type, rank);
        for (const term of terms) term.dimensionBigInt = weylDimensionBigInt(term.labels, C);
        terms.dimensionCheck = dimensionCheckForTerms(lambdaRows, muRows, terms, type, rank, C);
        if (!terms.dimensionCheck.ok) {
          terms.warning = appendWarning(terms.warning, `Dimension check failed: displayed dimension ${terms.dimensionCheck.found} but tensor product dimension is ${terms.dimensionCheck.target}; missing ${terms.dimensionCheck.missing}.`);
        }
        return terms;
      }

      const C = cartanMatrix(type, rank);
      if (!['B','C','D'].includes(type) && !isExceptionalType(type)) {
        throw new Error('Unsupported fixed-rank type.');
      }

      const candidates = dominantNormBoundCandidates(lambdaRows, muRows, type, rank, C);
      const candidateCount = candidates.length;
      const candidateSource = `dominant norm-bound weights (‖γ‖ ≤ ‖λ‖ + ‖μ‖, radius ${candidates.radius.toFixed(4)})`;

      const terms = decomposeByCandidatesBrauerKlimyk(lambdaRows, muRows, candidates, type, rank, C);
      terms.candidateCount = candidateCount;
      terms.candidateSource = candidateSource;
      terms.candidateRadius = candidates.radius;
      terms.candidateCoordinateBounds = candidates.coordinateBounds;
      terms.candidateSearchBox = candidates.searchBox;
      terms.dimensionCheck = dimensionCheckForTerms(lambdaRows, muRows, terms, type, rank, C);
      terms.engineInfo = `Candidate source: dominant norm ball with coordinate bounds [${candidates.coordinateBounds.join(', ')}] (${candidateCount} candidates after pruning). Coefficient engine: Freudenthal character generation for ${terms.characterSide || 'the smaller factor'} (${terms.characterWeightCount || 0} weights) plus Brauer–Klimyk straightening; no Kostant partition recursion is used.`;
      if (!terms.dimensionCheck.ok) {
        const diffText = terms.dimensionCheck.missing.startsWith('-')
          ? `overcount ${terms.dimensionCheck.missing.slice(1)}`
          : `missing ${terms.dimensionCheck.missing}`;
        terms.warning = appendWarning(terms.warning, `Dimension check failed: displayed dimension ${terms.dimensionCheck.found} but tensor product dimension is ${terms.dimensionCheck.target}; ${diffText}.`);
      }
      return terms;
    }
    function compareTerms(a,b) {
      const A = trimPartition(a.nu), B = trimPartition(b.nu);
      const s = sizeOf(B) - sizeOf(A); if (s) return s;
      for (let i=0;i<Math.max(A.length,B.length);i++) { const d = (B[i]||0) - (A[i]||0); if (d) return d; }
      const la = a.labels || [], lb = b.labels || [];
      for (let i=0;i<Math.max(la.length,lb.length);i++) { const d=(lb[i]||0)-(la[i]||0); if(d) return d; }
      return 0;
    }
    function miniDiagram(partition, hue = 145) {
      const p = trimPartition(partition);
      if (!p.length) return '<span class="decomp-label">∅</span>';
      const bs = 14, width = (p[0] || 0) * bs, height = p.length * bs;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="display:inline-block;vertical-align:middle;">`;
      for (let r=0;r<p.length;r++) for (let c=0;c<p[r];c++) svg += `<rect x="${c*bs}" y="${r*bs}" width="${bs}" height="${bs}" fill="hsl(${hue},40%,70%)" stroke="hsl(${hue},30%,35%)" stroke-width="0.7"/>`;
      return svg + '</svg>';
    }
    function renderDecomposition(terms, lambda, mu, type, rank, fixed) {
      const out = $('schur-out'); out.innerHTML = '';
      if (!terms.length) { out.innerHTML = '<span class="hint">No nonzero terms found under the current mode and cap.</span>'; return; }
      const formula = document.createElement('div'); formula.className = 'decomp-formula';
      const algebraLabel = lieAlgebraLabel(type, rank);
      const left = fixed ? `V<sup>${partitionToString(lambda)}</sup><sub>${algebraLabel}</sub> ⊗ V<sup>${partitionToString(mu)}</sup><sub>${algebraLabel}</sub>` : (type === 'A' ? `S<sup>${partitionToString(lambda)}</sup>(V) ⊗ S<sup>${partitionToString(mu)}</sup>(V)` : `stable ${type}-classical tensor ${partitionToString(lambda)} ⊗ ${partitionToString(mu)}`);
      formula.innerHTML = left + ' = ' + terms.map(t => `${t.coefficient > 1 ? t.coefficient + '·' : ''}V<sup>${partitionToString(t.nu)}</sup><sub>${fixed ? algebraLabel : (type === 'A' ? 'GL' : type)}</sub>`).join(' ⊕ ');
      out.appendChild(formula);
      const hue = fixed ? 175 : (type === 'A' ? 145 : 205);
      for (const t of terms.slice(0, 100)) {
        const row = document.createElement('div'); row.className = 'decomp-row';
        const mult = document.createElement('span'); mult.className = 'decomp-mult'; mult.textContent = t.coefficient > 1 ? `×${t.coefficient}` : '×1';
        const diagram = document.createElement('span'); diagram.className = 'decomp-diagram'; diagram.innerHTML = miniDiagram(t.nu, hue);
        const label = document.createElement('span'); label.className = 'decomp-label';
        const dynkin = fixed && t.labels ? `  Dynkin=[${t.labels.join(', ')}]` : '';
        const dim = fixed && t.dimension ? `  dim=${t.dimension}` : '';
        label.textContent = `${partitionToString(t.nu)}${dynkin}${dim}`;
        row.appendChild(mult); row.appendChild(diagram); row.appendChild(label); out.appendChild(row);
      }
      if (terms.length > 100) { const more = document.createElement('div'); more.className = 'hint'; more.textContent = `… ${terms.length - 100} more terms omitted.`; out.appendChild(more); }
      if (fixed && terms.engineInfo) { const info = document.createElement('div'); info.className = 'hint'; info.textContent = terms.engineInfo; out.appendChild(info); }
      if (fixed && terms.warning) { const warning = document.createElement('div'); warning.className = 'warning-text'; warning.textContent = terms.warning; out.appendChild(warning); }
      if (fixed && terms.dimensionCheck) {
        const check = document.createElement('div');
        check.className = terms.dimensionCheck.ok ? 'hint' : 'warning-text';
        check.textContent = terms.dimensionCheck.ok
          ? `Dimension check passed: ${terms.dimensionCheck.found} = ${terms.dimensionCheck.target}.`
          : `Dimension check: displayed ${terms.dimensionCheck.found} / tensor product ${terms.dimensionCheck.target}; difference ${terms.dimensionCheck.missing}.`;
        out.appendChild(check);
      }
      if (fixed && terms.candidateCount != null) {
        const meta = document.createElement('div'); meta.className = 'hint';
        const source = terms.candidateSource || 'candidate';
        meta.textContent = `Fixed-rank loop tested ${terms.candidateCount} ${source} candidate${terms.candidateCount === 1 ? '' : 's'}; character side ${terms.characterSide || '—'} had ${terms.characterWeightCount || 0} weights; no Kostant partition recursion was used.`;
        out.appendChild(meta);
      }
    }
    function computeSchur() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank();
      const fixed = isExceptionalType(type) ? true : $('fixed-rank-mode').checked;
      if (isExceptionalType(type)) $('fixed-rank-mode').checked = true;
      try {
        let terms;
        if (fixed) terms = decomposeFixedRank(lambda, mu, type, rank);
        else if (type === 'A') terms = decomposeTypeAStable(lambda, mu).sort(compareTerms);
        else if (['B','C','D'].includes(type)) terms = decomposeClassicalStable(lambda, mu).sort(compareTerms);
        else throw new Error('Stable browser-side decomposition is implemented for A/B/C/D. Exceptional types are forced to fixed-rank mode.');
        state.lastDecomposition = { lambda, mu, terms, type, rank, fixed };
        renderDecomposition(terms, lambda, mu, type, rank, fixed);
        clearDoubleCardStale('schur-out');
      } catch (err) {
        $('schur-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        state.lastDecomposition = null;
        clearDoubleCardStale('schur-out');
      }
      refreshExport({ force: true });
    }

    function formatDecompositionForExport(dec) {
      const algebraLabel = lieAlgebraLabel(dec.type, dec.rank);
      const mode = dec.fixed ? `fixed ${algebraLabel}` : `stable ${dec.type}`;
      const lines = [];
      lines.push('# double_young_diagram Littlewood--Richardson decomposition');
      lines.push(`# mode: ${mode}`);
      lines.push(`# lambda: ${partitionToString(dec.lambda)}`);
      lines.push(`# mu: ${partitionToString(dec.mu)}`);
      lines.push('');
      lines.push(dec.terms.map(t => `${t.coefficient > 1 ? t.coefficient + '*' : ''}V^${partitionToString(t.nu)}`).join(' + ') || '0');
      lines.push('');
      lines.push('# terms');
      for (const t of dec.terms) {
        const bits = [`multiplicity=${t.coefficient}`, `partition=${partitionToString(t.nu)}`];
        if (t.labels) bits.push(`dynkin=[${t.labels.join(', ')}]`);
        if (t.dimension) bits.push(`dim=${t.dimension}`);
        if (t.stableSource) bits.push(`stable_source=${partitionToString(t.stableSource)}`);
        if (t.sourceNu) bits.push(`source_LR_summand=${partitionToString(t.sourceNu)}`);
        if (t.straighteningSign) bits.push(`straightening_sign=${t.straighteningSign}`);
        lines.push(bits.join('  '));
      }
      if (dec.terms.engineInfo) lines.push(`# engine: ${dec.terms.engineInfo}`);
      if (dec.terms.warning) lines.push(`# warning: ${dec.terms.warning}`);
      if (dec.terms.dimensionCheck) lines.push(`# dimension check: displayed=${dec.terms.dimensionCheck.found} tensor=${dec.terms.dimensionCheck.target} difference=${dec.terms.dimensionCheck.missing} ok=${dec.terms.dimensionCheck.ok}`);
      if (dec.terms.candidateCount != null) lines.push(`# candidates: ${dec.terms.candidateCount} (${dec.terms.candidateSource || 'candidate'})`);
      return lines.join('\n');
    }
    function exportSchur() {
      if (!state.lastDecomposition) computeSchur();
      if (!state.lastDecomposition) return;
      const text = formatDecompositionForExport(state.lastDecomposition);
      const suffix = state.lastDecomposition.fixed ? 'fixed' : 'stable';
      state.exportMode = 'lr';
      state.exportFilename = `lr_decomposition_${suffix}.txt`;
      $('export-out').value = text;
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }

    function resizeCanvases() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      for (const which of ['lambda','mu']) {
        const canvas = state[which].canvas;
        const slot = canvas.closest('.diagram-slot');
        const width = Math.max(90, Math.floor(slot.clientWidth));
        const height = Math.max(90, Math.floor(width * 0.72));
        state[which].displayWidth = width;
        state[which].displayHeight = height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        if (state[which].ctx) state[which].ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      drawAll();
    }
    function drawDiagram(which) {
      const d = state[which], canvas = d.canvas, ctx = d.ctx;
      const width = d.displayWidth || canvas.clientWidth || canvas.width;
      const height = d.displayHeight || canvas.clientHeight || canvas.height;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0,0,width,height);
      const gridDensity = Math.min(1, Math.max(0, (Math.max(d.maxRows, d.maxCols) - 5) / 13));
      const relaxedPad = Math.max(8, Math.min(20, Math.floor(width * 0.055)));
      const compactPad = 4;
      const pad = Math.round(relaxedPad * (1 - gridDensity) + compactPad * gridDensity);
      const availableCell = Math.min((width - 2*pad) / d.maxCols, (height - 2*pad) / d.maxRows);
      const cell = Math.max(5, Math.floor(availableCell * 0.88));
      const x0 = Math.floor((width - cell*d.maxCols)/2), y0 = Math.floor((height - cell*d.maxRows)/2);
      ctx.lineWidth = 0.75;
      for (let r=0;r<d.maxRows;r++) for (let c=0;c<d.maxCols;c++) {
        const x = x0 + c*cell, y = y0 + r*cell;
        const filled = c < (d.rows[r] || 0);
        ctx.fillStyle = filled ? (which === 'lambda' ? '#e5eee7' : '#efe5e0') : '#fffdf9';
        ctx.strokeStyle = filled ? 'rgba(142,132,119,0.34)' : 'rgba(216,208,196,0.56)';
        ctx.fillRect(x,y,cell,cell);
        ctx.strokeRect(x+0.5,y+0.5,Math.max(0,cell-1),Math.max(0,cell-1));
      }
      d.geometry = { x0, y0, cell };
      $(which + '-partition').value = trimPartition(d.rows).join(',');
    }
    function enforcePartition(rows, maxRows, maxCols) {
      rows = rows.slice(0, maxRows).map(x => Math.max(0, Math.min(maxCols, Math.floor(x || 0))));
      for (let i=1;i<rows.length;i++) rows[i] = Math.min(rows[i], rows[i-1]);
      return trimPartition(rows);
    }
    let applyingDoubleUrlState = false;

    function updateDoubleUrlState() {
      if (applyingDoubleUrlState || !window.history || !window.URLSearchParams) return;
      const params = new URLSearchParams(window.location.search);
      const lambda = trimPartition(state.lambda.rows);
      const mu = trimPartition(state.mu.rows);
      if (lambda.length) params.set('lambda', lambda.join(','));
      else params.delete('lambda');
      if (mu.length) params.set('mu', mu.join(','));
      else params.delete('mu');
      params.set('rows', String(state.lambda.maxRows));
      params.set('cols', String(state.lambda.maxCols));
      const type = $('lie-type')?.value;
      const rank = $('lie-rank')?.value;
      if (type) params.set('type', type);
      if (rank) params.set('rank', rank);
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? '?' + query : ''}${window.location.hash}`);
    }

    function applyDoubleUrlState() {
      if (!window.URLSearchParams) return false;
      const params = new URLSearchParams(window.location.search);
      const lambdaText = params.get('lambda');
      const muText = params.get('mu');
      const rows = Number(params.get('rows'));
      const cols = Number(params.get('cols'));
      const type = params.get('type');
      const rank = params.get('rank');
      if (!lambdaText && !muText && !rows && !cols && !type && !rank) return false;
      applyingDoubleUrlState = true;
      try {
        if (Number.isInteger(rows) && rows > 0) $('grid-rows').value = String(Math.min(18, rows));
        if (Number.isInteger(cols) && cols > 0) $('grid-cols').value = String(Math.min(18, cols));
        if (type && $('lie-type')) $('lie-type').value = type;
        if (rank && $('lie-rank')) $('lie-rank').value = rank;
        applyGridSize();
        setDiagram('lambda', lambdaText ? parsePartition(lambdaText) : [3, 2]);
        setDiagram('mu', muText ? parsePartition(muText) : [2, 1]);
      } catch (_) {
        return false;
      } finally {
        applyingDoubleUrlState = false;
      }
      return true;
    }

    function setDiagram(which, rows) {
      const d = state[which];
      d.rows = enforcePartition(rows, d.maxRows, d.maxCols);
      const staleFlags = currentDoubleResultFlags();
      state.lastDecomposition = null;
      state.lastKostka = null;
      state.lastKronecker = null;
      state.lastPlethysm = null;
      state.lastSchurFunctor = null;
      state.lastGrassmannian = null;
      markDoubleComputedCardsStale(staleFlags);
      drawAll(); updateStats(); updateInvariants(); markSymmetricPolynomialStale(); refreshExport();
      updateDoubleUrlState();
    }
    function handleCanvasClick(which, event) {
      const d = state[which], rect = d.canvas.getBoundingClientRect(), g = d.geometry;
      if (!g) return;
      const logicalW = d.displayWidth || rect.width || d.canvas.clientWidth || d.canvas.width;
      const logicalH = d.displayHeight || rect.height || d.canvas.clientHeight || d.canvas.height;
      const x = (event.clientX - rect.left) * logicalW / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) * logicalH / Math.max(1, rect.height);
      const c = Math.floor((x - g.x0) / g.cell), r = Math.floor((y - g.y0) / g.cell);
      if (r < 0 || r >= d.maxRows || c < 0 || c >= d.maxCols) return;
      const rows = Array.from({ length: d.maxRows }, (_, i) => d.rows[i] || 0);
      const clickedFilled = c < (rows[r] || 0);

      if (clickedFilled) {
        // Old Young-diagram applet behavior: remove the southeast rectangle
        // whose northwest corner is the clicked box.  In row-length form this
        // means every row at or below r is truncated to at most c boxes.
        for (let i = r; i < d.maxRows; i++) rows[i] = Math.min(rows[i] || 0, c);
      } else {
        // Fill the northwest rectangle ending at the clicked empty box.
        for (let i = 0; i <= r; i++) rows[i] = Math.max(rows[i] || 0, c + 1);
      }

      setDiagram(which, rows);
    }
    function drawAll() { drawDiagram('lambda'); drawDiagram('mu'); }
    function applyGridSize() {
      const rows = Math.max(1, Math.min(18, Number($('grid-rows').value) || 5));
      const cols = Math.max(1, Math.min(18, Number($('grid-cols').value) || 5));
      $('grid-rows').value = rows; $('grid-cols').value = cols;
      for (const which of ['lambda','mu']) {
        state[which].maxRows = rows; state[which].maxCols = cols;
        state[which].rows = enforcePartition(state[which].rows, rows, cols);
      }
      const staleFlags = currentDoubleResultFlags();
      state.lastDecomposition = null;
      state.lastKostka = null;
      state.lastKronecker = null;
      state.lastPlethysm = null;
      state.lastSchurFunctor = null;
      state.lastGrassmannian = null;
      markDoubleComputedCardsStale(staleFlags);
      resizeCanvases(); updateStats(); updateInvariants(); markSymmetricPolynomialStale(); refreshExport();
      updateDoubleUrlState();
    }
    function updateStats(options = {}) {
      if (!options.force && !isCardExpandedById('stats-out')) return;
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank(), algebraLabel = lieAlgebraLabel(type, rank);
      const lambdaLabels = diagramToDynkinLabels(lambda, rank);
      const muLabels = diagramToDynkinLabels(mu, rank);
      let lambdaDim = '—', muDim = '—';
      try {
        const C = cartanMatrix(type, rank);
        lambdaDim = weylDimension(lambdaLabels, C);
        muDim = weylDimension(muLabels, C);
      } catch (err) {
        lambdaDim = muDim = 'not computed';
      }
      const rows = [
        ['λ', partitionToString(lambda)],
        ['μ', partitionToString(mu)],
        ['|λ|, |μ|', `${sizeOf(lambda)}, ${sizeOf(mu)}`],
        ['λ Dynkin labels', `[${lambdaLabels.join(', ')}]`],
        ['μ Dynkin labels', `[${muLabels.join(', ')}]`],
        [`dim V<sup>λ</sup> (${algebraLabel})`, lambdaDim],
        [`dim V<sup>μ</sup> (${algebraLabel})`, muDim]
      ];
      const warnings = [];
      if (lambda.length > rank) warnings.push(`λ has ${lambda.length} rows; fixed-rank ${algebraLabel} reads only the first n rows in the page convention.`);
      if (mu.length > rank) warnings.push(`μ has ${mu.length} rows; fixed-rank ${algebraLabel} reads only the first n rows in the page convention.`);
      $('stats-out').innerHTML = rows.map(([a,b]) => `<div class="stat-row"><span class="stat-label">${a}</span><span class="stat-value">${b}</span></div>`).join('') + (warnings.length ? `<div class="warning-text">${warnings.join('; ')}</div>` : '');
    }
    function updateInvariants(options = {}) {
      if (!options.force && !isCardExpandedById('invariants-out')) return;
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank(), algebraLabel = lieAlgebraLabel(type, rank);
      const C = cartanMatrix(type, rank);
      const lambdaLabels = diagramToDynkinLabels(lambda, rank);
      const muLabels = diagramToDynkinLabels(mu, rank);
      const rows = [];
      const warnings = [];

      rows.push([`Highest weight λ`, `${partitionToString(lambda)} &nbsp; <span class="code-inline">[${lambdaLabels.join(', ')}]</span>`]);
      rows.push([`Queried weight μ`, `${partitionToString(mu)} &nbsp; <span class="code-inline">[${muLabels.join(', ')}]</span>`]);

      let lambdaDim = '—';
      try { lambdaDim = weylDimension(lambdaLabels, C); }
      catch (err) { lambdaDim = 'not computed'; warnings.push(err.message); }
      rows.push([`dim V<sup>λ</sup> (${algebraLabel})`, lambdaDim]);

      let weightDim = '—';
      try {
        const mult = weightMultiplicityByWeylCharacter(lambdaLabels, muLabels, type, rank);
        weightDim = `${mult.value}`;
      } catch (err) {
        weightDim = 'not computed'; warnings.push(`weight multiplicity: ${err.message}`);
      }
      rows.push([`dim (V<sup>λ</sup>)<sub>μ</sub>`, weightDim]);

      let orbitSize = '—';
      try { orbitSize = weylOrbitSizeDominant(muLabels, C); }
      catch (err) {
        try { orbitSize = String(weylOrbitSigned(muLabels, C).length); }
        catch (err2) { orbitSize = 'not computed'; warnings.push(`Weyl orbit: ${err.message}`); }
      }
      rows.push([`|W·μ|`, orbitSize]);

      if (lambda.length > rank) warnings.push(`λ has ${lambda.length} rows; ${algebraLabel} uses only the first n rows for Dynkin labels.`);
      if (mu.length > rank) warnings.push(`μ has ${mu.length} rows; ${algebraLabel} uses only the first n rows for Dynkin labels.`);

      $('invariants-out').innerHTML = rows.map(([a,b]) => `<div class="stat-row"><span class="stat-label">${a}</span><span class="stat-value">${b}</span></div>`).join('') +
        (warnings.length ? `<div class="warning-text">${warnings.join('<br>')}</div>` : '');
    }


    function fitsGrassmannianRectangle(partition, r, k) {
      const p = trimPartition(partition);
      return p.length <= r && p.every(x => x <= k);
    }

    function decomposeGrassmannianCup(lambdaRows, muRows, r, k) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      if (!fitsGrassmannianRectangle(lambda, r, k)) throw new Error(`λ must fit inside the ${r} × ${k} Grassmannian rectangle.`);
      if (!fitsGrassmannianRectangle(mu, r, k)) throw new Error(`μ must fit inside the ${r} × ${k} Grassmannian rectangle.`);
      const total = sizeOf(lambda) + sizeOf(mu);
      if (total > r * k) {
        const empty = [];
        empty.rectangle = { r, k, n: r + k };
        return empty;
      }
      if (total > MAX_EXACT_CELLS) throw new Error(`Grassmannian cup product is capped at ${MAX_EXACT_CELLS} total boxes in this browser page.`);
      const terms = [];
      for (const nu of partitionsOf(total, k, r)) {
        if (!fitsGrassmannianRectangle(nu, r, k)) continue;
        const c = lrCoefficient(lambda, mu, nu);
        if (c) {
          terms.push({ nu, coefficient: c });
          if (terms.length > MAX_GRASSMANNIAN_TERMS) throw new Error(`Grassmannian output exceeded ${MAX_GRASSMANNIAN_TERMS} terms.`);
        }
      }
      terms.rectangle = { r, k, n: r + k };
      return terms.sort(compareTerms);
    }

    function chernZeroPoly() { return new Map(); }
    function chernOnePoly(k) { return new Map([[Array(k).fill(0).join(','), 1]]); }
    function chernVariablePoly(index, k) {
      if (index === 0) return chernOnePoly(k);
      if (index < 0 || index > k) return chernZeroPoly();
      const exps = Array(k).fill(0);
      exps[index - 1] = 1;
      return new Map([[exps.join(','), 1]]);
    }
    function chernAdd(A, B, scaleB = 1, cap = MAX_CHERN_POLY_TERMS) {
      const out = new Map(A);
      for (const [m, c] of B.entries()) {
        const next = (out.get(m) || 0) + scaleB * c;
        if (next === 0) out.delete(m);
        else out.set(m, next);
        if (out.size > cap) throw new Error(`Chern polynomial expansion exceeded ${cap} monomials.`);
      }
      return out;
    }
    function chernMultiply(A, B, k, cap = MAX_CHERN_POLY_TERMS) {
      if (!A.size || !B.size) return chernZeroPoly();
      const out = new Map();
      for (const [ma, ca] of A.entries()) {
        const ea = ma ? ma.split(',').map(Number) : Array(k).fill(0);
        for (const [mb, cb] of B.entries()) {
          const eb = mb ? mb.split(',').map(Number) : Array(k).fill(0);
          const exps = Array.from({ length: k }, (_, i) => (ea[i] || 0) + (eb[i] || 0));
          const keyMono = exps.join(',');
          const next = (out.get(keyMono) || 0) + ca * cb;
          if (next === 0) out.delete(keyMono);
          else out.set(keyMono, next);
          if (out.size > cap) throw new Error(`Chern polynomial expansion exceeded ${cap} monomials.`);
        }
      }
      return out;
    }
    function chernScale(A, factor) {
      if (factor === 1) return new Map(A);
      const out = new Map();
      for (const [m, c] of A.entries()) if (c * factor) out.set(m, c * factor);
      return out;
    }

    function permutationSign(perm) {
      let inv = 0;
      for (let i = 0; i < perm.length; i++) for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) inv += 1;
      return inv % 2 ? -1 : 1;
    }

    function determinantPolynomial(matrix, k) {
      const n = matrix.length;
      if (n === 0) return chernOnePoly(k);
      if (n > MAX_CHERN_DETERMINANT_SIZE) throw new Error(`Giambelli determinant expansion is capped at size ${MAX_CHERN_DETERMINANT_SIZE}.`);
      let total = chernZeroPoly();
      const used = Array(n).fill(false);
      const perm = [];
      function rec(row, product) {
        if (!product.size) return;
        if (row === n) {
          total = chernAdd(total, product, permutationSign(perm));
          return;
        }
        for (let col = 0; col < n; col++) {
          if (used[col]) continue;
          used[col] = true;
          perm.push(col);
          rec(row + 1, chernMultiply(product, matrix[row][col], k));
          perm.pop();
          used[col] = false;
        }
      }
      rec(0, chernOnePoly(k));
      return total;
    }

    function giambelliPolynomial(partition, r, k) {
      const nu = trimPartition(partition);
      if (!nu.length) return chernOnePoly(k);
      const ell = Math.min(r, nu.length);
      const matrix = [];
      for (let i = 0; i < ell; i++) {
        const row = [];
        for (let j = 0; j < ell; j++) row.push(chernVariablePoly((nu[i] || 0) + (j + 1) - (i + 1), k));
        matrix.push(row);
      }
      return determinantPolynomial(matrix, k);
    }

    function grassmannianChernPolynomial(terms, r, k) {
      let total = chernZeroPoly();
      for (const t of terms) {
        const det = giambelliPolynomial(t.nu, r, k);
        total = chernAdd(total, det, t.coefficient);
      }
      return total;
    }

    function monomialToHTML(keyMono) {
      const exps = keyMono ? keyMono.split(',').map(Number) : [];
      const bits = [];
      exps.forEach((e, i) => {
        if (!e) return;
        bits.push(e === 1 ? `c<sub>${i + 1}</sub>` : `c<sub>${i + 1}</sub><sup>${e}</sup>`);
      });
      return bits.length ? bits.join('') : '1';
    }
    function monomialToText(keyMono) {
      const exps = keyMono ? keyMono.split(',').map(Number) : [];
      const bits = [];
      exps.forEach((e, i) => {
        if (!e) return;
        bits.push(e === 1 ? `c_${i + 1}` : `c_${i + 1}^${e}`);
      });
      return bits.length ? bits.join('*') : '1';
    }
    function chernPolynomialToHTML(poly) {
      if (!poly.size) return '0';
      const entries = Array.from(poly.entries()).sort((a, b) => {
        const da = a[0].split(',').reduce((s, x) => s + Number(x || 0), 0);
        const db = b[0].split(',').reduce((s, x) => s + Number(x || 0), 0);
        if (db !== da) return db - da;
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      });
      return entries.map(([m, c], idx) => {
        const abs = Math.abs(c);
        const mono = monomialToHTML(m);
        const body = mono === '1' ? String(abs) : (abs === 1 ? mono : `${abs}${mono}`);
        if (idx === 0) return c < 0 ? `−${body}` : body;
        return c < 0 ? ` − ${body}` : ` + ${body}`;
      }).join('');
    }
    function chernPolynomialToText(poly) {
      if (!poly.size) return '0';
      const entries = Array.from(poly.entries()).sort((a, b) => {
        const da = a[0].split(',').reduce((s, x) => s + Number(x || 0), 0);
        const db = b[0].split(',').reduce((s, x) => s + Number(x || 0), 0);
        if (db !== da) return db - da;
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      });
      return entries.map(([m, c], idx) => {
        const abs = Math.abs(c);
        const mono = monomialToText(m);
        const body = mono === '1' ? String(abs) : (abs === 1 ? mono : `${abs}*${mono}`);
        if (idx === 0) return c < 0 ? `-${body}` : body;
        return c < 0 ? ` - ${body}` : ` + ${body}`;
      }).join('');
    }

    function renderGrassmannianCup(data) {
      const out = $('grassmannian-out');
      out.innerHTML = '';
      const { lambda, mu, terms, r, k, presentation } = data;
      const formula = document.createElement('div');
      formula.className = 'decomp-formula';
      if (presentation === 'chern') {
        formula.innerHTML = `σ<sub>${partitionToString(lambda)}</sub> ∪ σ<sub>${partitionToString(mu)}</sub> = ${data.chernHTML}`;
        out.appendChild(formula);
        const note = document.createElement('div');
        note.className = 'hint';
        note.innerHTML = `Computed in H*(Gr(${r},${r + k})) using Giambelli determinants in c<sub>1</sub>,…,c<sub>${k}</sub>.`;
        out.appendChild(note);
      } else {
        formula.innerHTML = `σ<sub>${partitionToString(lambda)}</sub> ∪ σ<sub>${partitionToString(mu)}</sub> = ` + (terms.length ? terms.map(t => `${t.coefficient > 1 ? t.coefficient + '·' : ''}σ<sub>${partitionToString(t.nu)}</sub>`).join(' + ') : '0');
        out.appendChild(formula);
        for (const t of terms.slice(0, 100)) {
          const row = document.createElement('div'); row.className = 'decomp-row';
          const mult = document.createElement('span'); mult.className = 'decomp-mult'; mult.textContent = t.coefficient > 1 ? `×${t.coefficient}` : '×1';
          const diagram = document.createElement('span'); diagram.className = 'decomp-diagram'; diagram.innerHTML = miniDiagram(t.nu, 95);
          const label = document.createElement('span'); label.className = 'decomp-label'; label.textContent = partitionToString(t.nu);
          row.appendChild(mult); row.appendChild(diagram); row.appendChild(label); out.appendChild(row);
        }
        if (terms.length > 100) {
          const more = document.createElement('div'); more.className = 'hint'; more.textContent = `… ${terms.length - 100} more terms omitted.`; out.appendChild(more);
        }
      }
      const meta = document.createElement('div');
      meta.className = 'hint';
      meta.textContent = `Grassmannian rectangle: ${r} × ${k}; equivalently Gr(${r},${r + k}). ${terms.length} nonzero term${terms.length === 1 ? '' : 's'}.`;
      out.appendChild(meta);
    }

    function computeGrassmannianCup() {
      const lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows);
      const r = state.lambda.maxRows, k = state.lambda.maxCols;
      const presentation = $('grassmannian-presentation').value;
      try {
        const terms = decomposeGrassmannianCup(lambda, mu, r, k);
        const data = { lambda, mu, terms, r, k, n: r + k, presentation, kind: 'grassmannian-cup-product' };
        if (presentation === 'chern') {
          const poly = grassmannianChernPolynomial(terms, r, k);
          data.chernPolynomial = Array.from(poly.entries());
          data.chernHTML = chernPolynomialToHTML(poly);
          data.chernText = chernPolynomialToText(poly);
        }
        state.lastGrassmannian = data;
        renderGrassmannianCup(data);
        clearDoubleCardStale('grassmannian-out');
      } catch (err) {
        state.lastGrassmannian = null;
        $('grassmannian-out').innerHTML = `<span class="warning-text">${err.message}</span>`;
        clearDoubleCardStale('grassmannian-out');
      }
      refreshExport({ force: true });
    }

    function formatGrassmannianExport(data) {
      const lines = [];
      lines.push('# Grassmannian cup product');
      lines.push(`# Grassmannian: Gr(${data.r},${data.n}); rectangle ${data.r} x ${data.k}`);
      lines.push(`# lambda: ${partitionToString(data.lambda)}`);
      lines.push(`# mu: ${partitionToString(data.mu)}`);
      lines.push(`# presentation: ${data.presentation}`);
      lines.push('');
      if (data.presentation === 'chern') {
        lines.push(`sigma_${partitionToString(data.lambda)} cup sigma_${partitionToString(data.mu)} = ${data.chernText || '0'}`);
      } else {
        lines.push(`sigma_${partitionToString(data.lambda)} cup sigma_${partitionToString(data.mu)} = ` + (data.terms.length ? data.terms.map(t => `${t.coefficient === 1 ? '' : t.coefficient + '*'}sigma_${partitionToString(t.nu)}`).join(' + ') : '0'));
      }
      lines.push('');
      lines.push('# Young diagram terms');
      for (const t of data.terms) lines.push(`multiplicity=${t.coefficient}  partition=${partitionToString(t.nu)}`);
      return lines.join('\n');
    }

    function exportGrassmannianCup() {
      if (!state.lastGrassmannian || state.lastGrassmannian.presentation !== $('grassmannian-presentation').value) computeGrassmannianCup();
      if (!state.lastGrassmannian) return;
      state.exportMode = 'grassmannian';
      state.exportFilename = 'grassmannian_cup_product.txt';
      $('export-out').value = formatGrassmannianExport(state.lastGrassmannian);
      setCardCollapsed($('export-out').closest('.card'), false, false);
      $('export-out').focus();
    }

    const SYMPOLY_VARIABLE_MAX = 18 * 18;
    const SYMPOLY_POLYNOMIAL_TERM_LIMIT = 1000000;
    const SYMPOLY_EXPANSION_PARTITION_LIMIT = 500000;
    const SYMPOLY_PRODUCT_PARTITION_LIMIT = 50000;
    const SYMPOLY_BASIS_CONVERSION_LIMIT = 180;
    const SYMPOLY_LINEAR_MODE_PARTITION_LIMIT = 180;
    const SYMPOLY_SCHUR_DETERMINANT_LIMIT = 8;
    const SYMPOLY_PLETHYSM_BOX_LIMIT = 50;
    const SYMPOLY_PRODUCT_TIME_LIMIT_MS = 3000;
    const SYMPOLY_ORDER = ['m', 'p', 'e', 'h', 's'];
    let sympolyVariableCountTouched = false;
    let sympolySavedFiniteVariableCount = '3';
    let sympolyComputationDeadline = 0;
    let sympolyComputationCheckCounter = 0;
    let sympolyComputationStage = '';
    const sympolyPartitionCountCache = new Map();

    function sympolyNow() {
      return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    function startSympolyComputationTimer(operation) {
      sympolyComputationCheckCounter = 0;
      sympolyComputationStage = '';
      sympolyComputationDeadline = operation === 'product'
        ? sympolyNow() + SYMPOLY_PRODUCT_TIME_LIMIT_MS
        : 0;
    }

    function clearSympolyComputationTimer() {
      sympolyComputationDeadline = 0;
      sympolyComputationCheckCounter = 0;
      sympolyComputationStage = '';
    }

    function setSympolyComputationStage(stage) {
      sympolyComputationStage = stage || '';
      checkSympolyComputationDeadline(true);
    }

    function checkSympolyComputationDeadline(force = false) {
      if (!sympolyComputationDeadline) return;
      if (!force) {
        sympolyComputationCheckCounter = (sympolyComputationCheckCounter + 1) & 1023;
        if (sympolyComputationCheckCounter) return;
      }
      if (sympolyNow() > sympolyComputationDeadline) {
        const err = new Error('sympoly-timeout');
        err.stage = sympolyComputationStage;
        throw err;
      }
    }

    function sympolyPartitionCount(size) {
      const n = Math.max(0, Math.floor(Number(size) || 0));
      if (sympolyPartitionCountCache.has(n)) return sympolyPartitionCountCache.get(n);
      const dp = Array(n + 1).fill(0n);
      dp[0] = 1n;
      for (let part = 1; part <= n; part++) {
        for (let total = part; total <= n; total++) {
          dp[total] += dp[total - part];
        }
      }
      sympolyPartitionCountCache.set(n, dp[n]);
      return dp[n];
    }

    function sympolyPartitionCountDescription(size) {
      return sympolyPartitionCount(size).toString();
    }

    function sympolyProductPartitionCounts(lambdaRows, muRows) {
      const lambdaSize = sizeOf(trimPartition(lambdaRows));
      const muSize = sizeOf(trimPartition(muRows));
      const totalDegree = lambdaSize + muSize;
      return [
        { label: `p(|lambda|)=p(${lambdaSize})`, size: lambdaSize, count: sympolyPartitionCount(lambdaSize) },
        { label: `p(|mu|)=p(${muSize})`, size: muSize, count: sympolyPartitionCount(muSize) },
        { label: `p(|lambda|+|mu|)=p(${totalDegree})`, size: totalDegree, count: sympolyPartitionCount(totalDegree) },
      ];
    }

    function formatSympolyProductPartitionCounts(counts) {
      return counts.map(item => `${item.label}=${item.count.toString()}`).join('; ');
    }

    function assertSympolyProductPartitionWithinLimit(lambdaRows, muRows) {
      const counts = sympolyProductPartitionCounts(lambdaRows, muRows);
      const limit = BigInt(SYMPOLY_PRODUCT_PARTITION_LIMIT);
      if (counts.some(item => item.count > limit)) {
        const err = new Error('product-partition-too-large');
        err.partitionCounts = counts;
        throw err;
      }
    }

    function sympolyLimitDetails(config) {
      if (!config) return '';
      const degree = sympolyOutputDegree(config.operation, config.lambda, config.mu);
      const parts = [`degree ${degree}`, `p(${degree})=${sympolyPartitionCountDescription(degree)}`];
      if (config.variableChoice?.count !== null) {
        parts.push(`N=${config.variableChoice.count}`, `term cap ${SYMPOLY_POLYNOMIAL_TERM_LIMIT}`);
      } else {
        parts.push(`partition cap ${SYMPOLY_EXPANSION_PARTITION_LIMIT}`);
        if (config.operation === 'product') {
          parts.push(`multiplication partition cap ${SYMPOLY_PRODUCT_PARTITION_LIMIT}`);
          parts.push(formatSympolyProductPartitionCounts(sympolyProductPartitionCounts(config.lambda, config.mu)));
        }
        if (config.mode === 'linear') parts.push(`linear cap ${SYMPOLY_LINEAR_MODE_PARTITION_LIMIT}`);
        else parts.push(`basis-solve cap ${SYMPOLY_BASIS_CONVERSION_LIMIT}`);
        const conversionBasis = conversionBasisForSympolyMode(config.targetBasis, config.mode);
        if (config.mode === 'polynomial' && config.targetBasis === 'm') parts.push('m_n=p_n generators');
        if (conversionBasis !== config.targetBasis) parts.push(`conversion basis ${conversionBasis}`);
      }
      if (config.operation === 'product') parts.push(`${SYMPOLY_PRODUCT_TIME_LIMIT_MS / 1000}s product budget`);
      if (config.operation === 'plethysm') parts.push(`plethysm box cap ${SYMPOLY_PLETHYSM_BOX_LIMIT}`);
      return parts.join('; ');
    }

    function appendSympolyLimitDetails(message, config) {
      const details = sympolyLimitDetails(config);
      return details ? `${message} Limits: ${details}.` : message;
    }

    function sympolyComplexityPreviewHTML(config) {
      return '';
    }

    function sympolyEscapeHtml(value) {
      return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[ch]));
    }

    function sympolyPartitionLabel(part) {
      const p = trimPartition(part);
      return p.length ? '(' + p.join(', ') + ')' : '()';
    }

    function sympolyPartKey(part) {
      return trimPartition(part).join(',');
    }

    function sympolyPlethysmLimitMessage(lambdaRows, muRows) {
      const degree = sizeOf(trimPartition(lambdaRows)) * sizeOf(trimPartition(muRows));
      return `Plethysm output degree |lambda| * |mu| is ${degree}; this browser chart is capped at ${SYMPOLY_PLETHYSM_BOX_LIMIT} output boxes. Draw smaller diagrams.`;
    }

    function sympolyOutputDegree(operation, lambdaRows, muRows) {
      const lambdaSize = sizeOf(trimPartition(lambdaRows));
      const muSize = sizeOf(trimPartition(muRows));
      return operation === 'plethysm' ? lambdaSize * muSize : lambdaSize + muSize;
    }

    function sympolyLinearModeLimitMessage(operation, lambdaRows, muRows) {
      const degree = sympolyOutputDegree(operation, lambdaRows, muRows);
      const degreeRule = operation === 'plethysm' ? '|lambda| * |mu|' : '|lambda| + |mu|';
      return `Linear mode in degree ${degree} (${degreeRule}) would need more than ${SYMPOLY_LINEAR_MODE_PARTITION_LIMIT} partition-indexed output terms.`;
    }

    function assertSympolyLinearModeWithinLimit(operation, mode, lambdaRows, muRows) {
      if (mode !== 'linear') return;
      const degree = sympolyOutputDegree(operation, lambdaRows, muRows);
      const data = partitionsOfSizeLimited(degree, SYMPOLY_LINEAR_MODE_PARTITION_LIMIT);
      if (data.truncated) throw new Error('linear-mode-too-large');
    }

    function sympolyProductLabelHTML(leftKind, rightKind, operation) {
      const op = operation === 'plethysm' ? '&#8728;' : '&middot;';
      return `<span class="sympoly-product-label"><span>${leftKind}<sub>&lambda;</sub></span><span>${op}</span><span>${rightKind}<sub>&mu;</sub></span></span>`;
    }

    function sympolyBasisSymbol(kind, part) {
      const p = trimPartition(part);
      if (!p.length) return '1';
      return `<span class="symfun-symbol">${kind}<sub>${sympolyEscapeHtml(sympolyPartitionLabel(p))}</sub></span>`;
    }

    function selectedSympolyLeftKind() {
      const select = $('sympoly-left-kind');
      return SYMPOLY_ORDER.includes(select?.value) ? select.value : 'm';
    }

    function selectedSympolyRightKind() {
      const select = $('sympoly-right-kind');
      return SYMPOLY_ORDER.includes(select?.value) ? select.value : 'm';
    }

    function selectedSympolyOperation() {
      const select = $('sympoly-operation');
      return select?.value === 'plethysm' ? 'plethysm' : 'product';
    }

    function selectedSympolyBasis() {
      const select = $('sympoly-basis');
      return SYMPOLY_ORDER.includes(select?.value) ? select.value : 'm';
    }

    function selectedSympolyMode() {
      const select = $('sympoly-mode');
      return select?.value === 'polynomial' ? 'polynomial' : 'linear';
    }

    function conversionBasisForSympolyMode(targetBasis, mode) {
      return mode === 'polynomial' && targetBasis === 'm' ? 'p' : targetBasis;
    }

    function defaultSympolyVariableCount() {
      return 3;
    }

    function syncSympolyVariableControl(lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows)) {
      const input = $('sympoly-variable-count');
      const infinite = $('sympoly-infinite');
      const basisSelect = $('sympoly-basis');
      const modeSelect = $('sympoly-mode');
      if (!input) return { infinite: false };

      if (infinite?.checked) {
        input.type = 'text';
        input.readOnly = true;
        input.value = '\u221e';
        if (basisSelect) basisSelect.disabled = false;
        if (modeSelect) modeSelect.disabled = false;
        return { infinite: true };
      }

      input.type = 'number';
      input.min = '0';
      input.max = String(SYMPOLY_VARIABLE_MAX);
      input.step = '1';
      input.readOnly = false;
      if (basisSelect) basisSelect.disabled = true;
      if (modeSelect) modeSelect.disabled = true;
      if (!sympolyVariableCountTouched || input.value.trim() === '\u221e') {
        input.value = String(defaultSympolyVariableCount(lambda, mu));
      }
      return { infinite: false };
    }

    function readSympolyVariableCount(lambda = trimPartition(state.lambda.rows), mu = trimPartition(state.mu.rows)) {
      const controlState = syncSympolyVariableControl(lambda, mu);
      if (controlState.infinite) return { count: null, infinite: true, error: '' };

      const input = $('sympoly-variable-count');
      if (!input) return { count: defaultSympolyVariableCount(lambda, mu), infinite: false, error: '' };
      const raw = String(input.value || '').trim();
      if (!raw) return { count: null, infinite: false, pending: true, error: '' };
      const count = Number(raw);
      if (!Number.isInteger(count) || count < 0 || count > SYMPOLY_VARIABLE_MAX) {
        return { count: null, infinite: false, error: `Choose 0-${SYMPOLY_VARIABLE_MAX} variables, or turn on infinite.` };
      }
      return { count, infinite: false, error: '' };
    }

    function handleSympolyVariableInput() {
      const input = $('sympoly-variable-count');
      const infinite = $('sympoly-infinite');
      if (infinite?.checked) return;
      const raw = String(input?.value || '').trim();
      sympolyVariableCountTouched = true;
      sympolySavedFiniteVariableCount = raw;
      markSymmetricPolynomialStale();
    }

    function toggleSympolyInfinite() {
      const input = $('sympoly-variable-count');
      const infinite = $('sympoly-infinite');
      if (!input || !infinite) return;

      if (infinite.checked) {
        if (input.value.trim() && input.value.trim() !== '\u221e') {
          sympolySavedFiniteVariableCount = input.value.trim();
        }
        input.type = 'text';
        input.readOnly = true;
        input.value = '\u221e';
      } else {
        input.type = 'number';
        input.min = '0';
        input.max = String(SYMPOLY_VARIABLE_MAX);
        input.step = '1';
        input.readOnly = false;
        input.value = sympolyVariableCountTouched && sympolySavedFiniteVariableCount
          ? sympolySavedFiniteVariableCount
          : String(defaultSympolyVariableCount());
      }
      markSymmetricPolynomialStale();
    }

    function partitionsOfSizeLimited(size, limit = SYMPOLY_EXPANSION_PARTITION_LIMIT) {
      if (size === 0) return { parts: [[]], truncated: false };
      const parts = [];
      let truncated = false;
      function gen(rem, maxPart, current) {
        checkSympolyComputationDeadline();
        if (parts.length > limit) {
          truncated = true;
          return;
        }
        if (rem === 0) {
          parts.push(current.slice());
          if (parts.length > limit) truncated = true;
          return;
        }
        for (let p = Math.min(maxPart, rem); p >= 1; p--) {
          current.push(p);
          gen(rem - p, p, current);
          current.pop();
          if (truncated) return;
        }
      }
      gen(size, size, []);
      return { parts: parts.slice(0, limit), truncated };
    }

    function comparePartitionsDesc(a, b) {
      const A = trimPartition(a), B = trimPartition(b);
      const s = sizeOf(B) - sizeOf(A);
      if (s) return s;
      for (let i = 0; i < Math.max(A.length, B.length); i++) {
        const d = (B[i] || 0) - (A[i] || 0);
        if (d) return d;
      }
      return 0;
    }

    function sympolyBigCombSmall(n, k) {
      if (k < 0 || k > n) return 0n;
      k = Math.min(k, n - k);
      let result = 1n;
      for (let i = 1; i <= k; i++) {
        result = (result * BigInt(n - k + i)) / BigInt(i);
      }
      return result;
    }

    function sympolyCapacityGroups(stateCaps) {
      const groups = [];
      for (const cap of stateCaps) {
        if (cap <= 0) continue;
        const last = groups[groups.length - 1];
        if (last && last.cap === cap) last.count++;
        else groups.push({ cap, count: 1 });
      }
      return groups;
    }

    const sympolyGroupProfileCache = new Map();
    const sympolyRowTransitionCache = new Map();
    const sympolyPowerTransitionCache = new Map();

    function sympolyGroupAllocationProfiles(cap, count, maxPerColumn) {
      const maxAlloc = maxPerColumn == null ? cap : Math.min(cap, maxPerColumn);
      const cacheKey = `${cap}|${count}|${maxAlloc}`;
      const cached = sympolyGroupProfileCache.get(cacheKey);
      if (cached) return cached;

      const profiles = [];
      const allocationCounts = [];

      function rec(allocation, remainingCount, used) {
        checkSympolyComputationDeadline();
        if (allocation > maxAlloc) {
          if (remainingCount !== 0) return;
          let ways = 1n;
          let unassigned = count;
          const caps = [];
          for (let a = 0; a <= maxAlloc; a++) {
            const take = allocationCounts[a] || 0;
            ways *= sympolyBigCombSmall(unassigned, take);
            unassigned -= take;
            const nextCap = cap - a;
            for (let i = 0; i < take; i++) {
              if (nextCap > 0) caps.push(nextCap);
            }
          }
          profiles.push({ used, caps, ways });
          return;
        }

        for (let take = 0; take <= remainingCount; take++) {
          allocationCounts[allocation] = take;
          rec(allocation + 1, remainingCount - take, used + allocation * take);
        }
        allocationCounts[allocation] = 0;
      }

      rec(0, count, 0);
      sympolyGroupProfileCache.set(cacheKey, profiles);
      return profiles;
    }

    function sympolySortedPositiveState(caps) {
      return caps.filter(c => c > 0).sort((a, b) => b - a);
    }

    function sympolyRowTransitionStates(stateCaps, rowSum, maxPerColumn) {
      const cacheKey = `${stateCaps.join(',')}|${rowSum}|${maxPerColumn == null ? 'inf' : maxPerColumn}`;
      const cached = sympolyRowTransitionCache.get(cacheKey);
      if (cached) return cached;

      const groups = sympolyCapacityGroups(stateCaps);
      const byKey = new Map();

      function rec(groupIndex, used, caps, ways) {
        checkSympolyComputationDeadline();
        if (used > rowSum) return;
        if (groupIndex === groups.length) {
          if (used !== rowSum) return;
          const nextState = sympolySortedPositiveState(caps);
          const k = sympolyPartKey(nextState);
          byKey.set(k, (byKey.get(k) || 0n) + ways);
          return;
        }

        const group = groups[groupIndex];
        for (const profile of sympolyGroupAllocationProfiles(group.cap, group.count, maxPerColumn)) {
          if (used + profile.used > rowSum) continue;
          rec(groupIndex + 1, used + profile.used, caps.concat(profile.caps), ways * profile.ways);
        }
      }

      rec(0, 0, [], 1n);
      const result = [...byKey.entries()].map(([k, ways]) => ({
        state: k ? k.split(',').map(Number) : [],
        ways,
      }));
      sympolyRowTransitionCache.set(cacheKey, result);
      return result;
    }

    function sympolyPowerRowTransitionStates(stateCaps, rowSum) {
      const cacheKey = `${stateCaps.join(',')}|${rowSum}`;
      const cached = sympolyPowerTransitionCache.get(cacheKey);
      if (cached) return cached;

      const groups = sympolyCapacityGroups(stateCaps);
      const byKey = new Map();

      for (let i = 0; i < groups.length; i++) {
        checkSympolyComputationDeadline();
        const group = groups[i];
        if (group.cap < rowSum) continue;
        const caps = [];
        for (let j = 0; j < groups.length; j++) {
          const g = groups[j];
          const count = j === i ? g.count - 1 : g.count;
          for (let c = 0; c < count; c++) caps.push(g.cap);
        }
        const reduced = group.cap - rowSum;
        if (reduced > 0) caps.push(reduced);
        const nextState = sympolySortedPositiveState(caps);
        const k = sympolyPartKey(nextState);
        byKey.set(k, (byKey.get(k) || 0n) + BigInt(group.count));
      }

      const result = [...byKey.entries()].map(([k, ways]) => ({
        state: k ? k.split(',').map(Number) : [],
        ways,
      }));
      sympolyPowerTransitionCache.set(cacheKey, result);
      return result;
    }

    function sympolyCountRowTransitionCoefficient(lambda, mu, transitionForRow) {
      const memo = new Map();

      function rec(rowIndex, stateCaps) {
        checkSympolyComputationDeadline();
        const cacheKey = `${rowIndex}|${stateCaps.join(',')}`;
        if (memo.has(cacheKey)) return memo.get(cacheKey);
        if (rowIndex === lambda.length) {
          const value = stateCaps.length === 0 ? 1n : 0n;
          memo.set(cacheKey, value);
          return value;
        }

        let total = 0n;
        for (const next of transitionForRow(stateCaps, lambda[rowIndex])) {
          total += next.ways * rec(rowIndex + 1, next.state);
        }
        memo.set(cacheKey, total);
        return total;
      }

      return rec(0, trimPartition(mu));
    }

    function sympolyCoefficientForBasis(kind, lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      if (!lambda.length) return !mu.length ? 1n : 0n;
      if (kind === 'm') return sympolyPartKey(lambda) === sympolyPartKey(mu) ? 1n : 0n;
      if (kind === 's') return BigInt(kostkaNumber(lambda, mu));
      if (kind === 'p') return sympolyCountRowTransitionCoefficient(lambda, mu, sympolyPowerRowTransitionStates);
      if (kind === 'e') return sympolyCountRowTransitionCoefficient(lambda, mu, (stateCaps, rowSum) => sympolyRowTransitionStates(stateCaps, rowSum, 1));
      return sympolyCountRowTransitionCoefficient(lambda, mu, (stateCaps, rowSum) => sympolyRowTransitionStates(stateCaps, rowSum, null));
    }

    function symRatGcd(a, b) {
      a = a < 0n ? -a : a;
      b = b < 0n ? -b : b;
      while (b) {
        const t = a % b;
        a = b;
        b = t;
      }
      return a || 1n;
    }

    function symRat(n, d = 1n) {
      n = BigInt(n);
      d = BigInt(d);
      if (d === 0n) throw new Error('zero denominator');
      if (n === 0n) return { n: 0n, d: 1n };
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const g = symRatGcd(n, d);
      return { n: n / g, d: d / g };
    }

    function symRatIsZero(a) {
      return a.n === 0n;
    }

    function symRatIsOneAbs(a) {
      return (a.n === 1n || a.n === -1n) && a.d === 1n;
    }

    function symRatAdd(a, b) {
      if (a.n === 0n) return b;
      if (b.n === 0n) return a;
      return symRat(a.n * b.d + b.n * a.d, a.d * b.d);
    }

    function symRatSub(a, b) {
      if (b.n === 0n) return a;
      return symRat(a.n * b.d - b.n * a.d, a.d * b.d);
    }

    function symRatMul(a, b) {
      if (a.n === 0n || b.n === 0n) return symRat(0n);
      return symRat(a.n * b.n, a.d * b.d);
    }

    function symRatDiv(a, b) {
      if (b.n === 0n) throw new Error('division by zero');
      return symRat(a.n * b.d, a.d * b.n);
    }

    function symRatNeg(a) {
      return { n: -a.n, d: a.d };
    }

    function symRatAbs(a) {
      return a.n < 0n ? symRatNeg(a) : a;
    }

    function symRatFromInteger(value) {
      return symRat(BigInt(value), 1n);
    }

    function formatSymRatCoefficient(coeff) {
      const abs = symRatAbs(coeff);
      return abs.d === 1n ? abs.n.toString() : `${abs.n.toString()}/${abs.d.toString()}`;
    }

    function sympolyAddLinearTerm(map, part, coeff) {
      if (symRatIsZero(coeff)) return;
      const clean = trimPartition(part);
      const k = sympolyPartKey(clean);
      const existing = map.get(k);
      const next = symRatAdd(existing ? existing.coeff : symRat(0n), coeff);
      if (symRatIsZero(next)) map.delete(k);
      else map.set(k, { part: clean, coeff: next });
    }

    function sympolyBasisLinearCombinationToMonomialVector(sourceTerms, sourceKind, parts) {
      const result = parts.map(() => symRat(0n));
      for (const { coeff, part } of sourceTerms) {
        checkSympolyComputationDeadline();
        if (symRatIsZero(coeff)) continue;
        for (let i = 0; i < parts.length; i++) {
          checkSympolyComputationDeadline();
          const c = sympolyCoefficientForBasis(sourceKind, part, parts[i]);
          if (c !== 0n) {
            result[i] = symRatAdd(result[i], symRatMul(coeff, symRatFromInteger(c)));
          }
        }
      }
      return result;
    }

    function sympolyConvertBasisLinearCombination(sourceTerms, sourceKind, targetKind, parts) {
      if (targetKind === sourceKind) {
        const byKey = new Map();
        for (const { part, coeff } of sourceTerms) {
          checkSympolyComputationDeadline();
          sympolyAddLinearTerm(byKey, part, coeff);
        }
        return [...byKey.values()].sort((a, b) => comparePartitionsDesc(a.part, b.part));
      }

      const rhs = sympolyBasisLinearCombinationToMonomialVector(sourceTerms, sourceKind, parts);
      if (targetKind === 'm') {
        return parts.map((part, i) => {
          checkSympolyComputationDeadline();
          return { part, coeff: rhs[i] };
        });
      }

      if (parts.length > SYMPOLY_BASIS_CONVERSION_LIMIT) {
        throw new Error('basis-conversion-too-large');
      }

      const size = parts.length;
      const matrix = parts.map((mPart, row) => {
        checkSympolyComputationDeadline();
        const values = parts.map(basisPart => {
          checkSympolyComputationDeadline();
          return symRatFromInteger(sympolyCoefficientForBasis(targetKind, basisPart, mPart));
        });
        values.push(rhs[row]);
        return values;
      });

      for (let col = 0; col < size; col++) {
        checkSympolyComputationDeadline(true);
        let pivot = col;
        while (pivot < size && symRatIsZero(matrix[pivot][col])) pivot++;
        if (pivot === size) throw new Error('basis conversion matrix is singular');
        if (pivot !== col) {
          const tmp = matrix[col];
          matrix[col] = matrix[pivot];
          matrix[pivot] = tmp;
        }

        const pivotValue = matrix[col][col];
        for (let j = col; j <= size; j++) matrix[col][j] = symRatDiv(matrix[col][j], pivotValue);

        for (let row = 0; row < size; row++) {
          checkSympolyComputationDeadline();
          if (row === col) continue;
          const factor = matrix[row][col];
          if (symRatIsZero(factor)) continue;
          for (let j = col; j <= size; j++) {
            matrix[row][j] = symRatSub(matrix[row][j], symRatMul(factor, matrix[col][j]));
          }
        }
      }

      return parts.map((part, i) => {
        checkSympolyComputationDeadline();
        return { part, coeff: matrix[i][size] };
      });
    }

    function zeroExponentVector(variableCount) {
      return Array(variableCount).fill(0);
    }

    function polyKey(exponents) {
      return exponents.join(',');
    }

    function exponentsFromKey(polyKeyText) {
      return polyKeyText ? polyKeyText.split(',').map(Number) : [];
    }

    function onePolynomial(variableCount) {
      return new Map([[polyKey(zeroExponentVector(variableCount)), 1n]]);
    }

    function addPolynomialTerm(poly, exponents, coeff = 1n) {
      if (coeff === 0n) return;
      checkSympolyComputationDeadline();
      const k = polyKey(exponents);
      const next = (poly.get(k) || 0n) + coeff;
      if (next === 0n) poly.delete(k);
      else poly.set(k, next);
      if (poly.size > SYMPOLY_POLYNOMIAL_TERM_LIMIT) throw new Error('polynomial-too-large');
    }

    function addScaledPolynomial(target, source, scale = 1n) {
      if (scale === 0n) return target;
      for (const [k, coeff] of source.entries()) {
        checkSympolyComputationDeadline();
        addPolynomialTerm(target, exponentsFromKey(k), coeff * scale);
      }
      return target;
    }

    function multiplyPolynomials(left, right, variableCount) {
      if (!left.size || !right.size) return new Map();
      const product = new Map();
      for (const [leftKey, leftCoeff] of left.entries()) {
        checkSympolyComputationDeadline();
        const leftExp = exponentsFromKey(leftKey);
        for (const [rightKey, rightCoeff] of right.entries()) {
          checkSympolyComputationDeadline();
          const rightExp = exponentsFromKey(rightKey);
          const exp = zeroExponentVector(variableCount);
          for (let i = 0; i < variableCount; i++) exp[i] = leftExp[i] + rightExp[i];
          addPolynomialTerm(product, exp, leftCoeff * rightCoeff);
        }
      }
      return product;
    }

    function multiplyPolynomialList(polys, variableCount) {
      let result = onePolynomial(variableCount);
      for (const poly of polys) {
        checkSympolyComputationDeadline(true);
        result = multiplyPolynomials(result, poly, variableCount);
        if (!result.size) break;
      }
      return result;
    }

    function pSeedPolynomial(k, variableCount) {
      const poly = new Map();
      for (let i = 0; i < variableCount; i++) {
        checkSympolyComputationDeadline();
        const exp = zeroExponentVector(variableCount);
        exp[i] = k;
        addPolynomialTerm(poly, exp);
      }
      return poly;
    }

    function eSeedPolynomial(k, variableCount) {
      if (k > variableCount) return new Map();
      const poly = new Map();
      const exp = zeroExponentVector(variableCount);
      function rec(start, remaining) {
        checkSympolyComputationDeadline();
        if (remaining === 0) {
          addPolynomialTerm(poly, exp);
          return;
        }
        for (let i = start; i <= variableCount - remaining; i++) {
          exp[i] = 1;
          rec(i + 1, remaining - 1);
          exp[i] = 0;
        }
      }
      rec(0, k);
      return poly;
    }

    function hSeedPolynomial(k, variableCount) {
      if (variableCount <= 0) return k === 0 ? onePolynomial(variableCount) : new Map();
      const poly = new Map();
      const exp = zeroExponentVector(variableCount);
      function rec(index, remaining) {
        checkSympolyComputationDeadline();
        if (index === variableCount - 1) {
          exp[index] = remaining;
          addPolynomialTerm(poly, exp);
          exp[index] = 0;
          return;
        }
        for (let a = remaining; a >= 0; a--) {
          exp[index] = a;
          rec(index + 1, remaining - a);
        }
        exp[index] = 0;
      }
      rec(0, k);
      return poly;
    }

    function mPolynomial(partition, variableCount) {
      const lambda = trimPartition(partition);
      if (lambda.length > variableCount) return new Map();
      const values = lambda.concat(Array(variableCount - lambda.length).fill(0));
      const counts = new Map();
      for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
      const distinctValues = [...counts.keys()].sort((a, b) => b - a);
      const exp = zeroExponentVector(variableCount);
      const poly = new Map();
      function rec(index) {
        checkSympolyComputationDeadline();
        if (index === variableCount) {
          addPolynomialTerm(poly, exp);
          return;
        }
        for (const value of distinctValues) {
          const count = counts.get(value) || 0;
          if (!count) continue;
          counts.set(value, count - 1);
          exp[index] = value;
          rec(index + 1);
          exp[index] = 0;
          counts.set(value, count);
        }
      }
      rec(0);
      return poly;
    }

    function schurPolynomial(lambdaRows, variableCount) {
      const lambda = trimPartition(lambdaRows);
      if (!lambda.length) return onePolynomial(variableCount);
      if (lambda.length > variableCount) return new Map();
      const degree = sizeOf(lambda);
      const { parts, truncated } = partitionsOfSizeLimited(degree);
      if (truncated) throw new Error('polynomial-too-large');
      const result = new Map();
      for (const mu of parts) {
        checkSympolyComputationDeadline();
        if (mu.length > variableCount) continue;
        const coeff = BigInt(kostkaNumber(lambda, mu));
        if (coeff === 0n) continue;
        addScaledPolynomial(result, mPolynomial(mu, variableCount), coeff);
      }
      return result;
    }

    function finiteSympolyPolynomial(kind, partition, variableCount) {
      const lambda = trimPartition(partition);
      if (!lambda.length) return onePolynomial(variableCount);
      if (kind === 'm') return mPolynomial(lambda, variableCount);
      if (kind === 's') return schurPolynomial(lambda, variableCount);
      const seeds = lambda.map(part => {
        if (kind === 'p') return pSeedPolynomial(part, variableCount);
        if (kind === 'e') return eSeedPolynomial(part, variableCount);
        return hSeedPolynomial(part, variableCount);
      });
      return multiplyPolynomialList(seeds, variableCount);
    }

    function compareExponentKeys(aKey, bKey) {
      const a = exponentsFromKey(aKey);
      const b = exponentsFromKey(bKey);
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (b[i] || 0) - (a[i] || 0);
        if (d !== 0) return d;
      }
      return 0;
    }

    function formatVariableMonomial(exponents) {
      const factors = [];
      for (let i = 0; i < exponents.length; i++) {
        const pow = exponents[i];
        if (!pow) continue;
        const base = `x<sub>${i + 1}</sub>`;
        factors.push(pow === 1 ? base : `${base}<sup>${pow}</sup>`);
      }
      return factors.length ? factors.join('') : '1';
    }

    function formatFiniteSympolyPolynomial(poly) {
      if (!poly.size) return '0';
      return [...poly.entries()]
        .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
        .map(([k, coeff], index) => {
          checkSympolyComputationDeadline();
          const negative = coeff < 0n;
          const absCoeff = negative ? -coeff : coeff;
          const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
          const monomial = formatVariableMonomial(exponentsFromKey(k));
          if (monomial === '1') return `${sign}${absCoeff.toString()}`;
          if (absCoeff === 1n) return `${sign}${monomial}`;
          return `${sign}<span class="symfun-coeff">${absCoeff.toString()}</span>${monomial}`;
        })
        .join('');
    }

    function exponentPartition(exponents) {
      return exponents.filter(x => x > 0).sort((a, b) => b - a);
    }

    function sortedUnionPartition(a, b) {
      return trimPartition(a).concat(trimPartition(b)).sort((x, y) => y - x);
    }

    function stableMonomialProductTerms(lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      if (!lambda.length) return [{ part: mu, coeff: 1n }];
      if (!mu.length) return [{ part: lambda, coeff: 1n }];
      const variableCount = lambda.length + mu.length;
      const product = multiplyPolynomials(mPolynomial(lambda, variableCount), mPolynomial(mu, variableCount), variableCount);
      const byPart = new Map();
      for (const [k, coeff] of product.entries()) {
        checkSympolyComputationDeadline();
        const part = exponentPartition(exponentsFromKey(k));
        const partKey = sympolyPartKey(part);
        if (!byPart.has(partKey)) {
          byPart.set(partKey, { part, coeff });
        } else if (byPart.get(partKey).coeff !== coeff) {
          throw new Error('monomial product collection failed');
        }
      }
      return [...byPart.values()].sort((a, b) => comparePartitionsDesc(a.part, b.part));
    }

    function schurProductTerms(lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      if (!lambda.length) return [{ part: mu, coeff: 1n }];
      if (!mu.length) return [{ part: lambda, coeff: 1n }];
      const total = sizeOf(lambda) + sizeOf(mu);
      const { parts, truncated } = partitionsOfSizeLimited(total);
      if (truncated) throw new Error('expansion-too-large');
      const terms = [];
      for (const nu of parts) {
        checkSympolyComputationDeadline();
        if (!containsPartition(nu, lambda)) continue;
        const coeff = lrCoefficient(lambda, mu, nu);
        if (coeff) terms.push({ part: nu, coeff: BigInt(coeff) });
      }
      return terms.sort((a, b) => comparePartitionsDesc(a.part, b.part));
    }

    function sympolyExpansionInMonomialBasis(kind, partition, parts) {
      return parts
        .map(part => ({ part, coeff: symRatFromInteger(sympolyCoefficientForBasis(kind, partition, part)) }))
        .filter(term => !symRatIsZero(term.coeff));
    }

    function sympolyMultiplyMonomialLinearTerms(leftTerms, rightTerms) {
      const byKey = new Map();
      for (const left of leftTerms) {
        checkSympolyComputationDeadline(true);
        if (symRatIsZero(left.coeff)) continue;
        for (const right of rightTerms) {
          checkSympolyComputationDeadline();
          if (symRatIsZero(right.coeff)) continue;
          const scale = symRatMul(left.coeff, right.coeff);
          for (const productTerm of stableMonomialProductTerms(left.part, right.part)) {
            checkSympolyComputationDeadline();
            sympolyAddLinearTerm(byKey, productTerm.part, symRatMul(scale, symRatFromInteger(productTerm.coeff)));
          }
        }
      }
      return [...byKey.values()].sort((a, b) => comparePartitionsDesc(a.part, b.part));
    }

    function infiniteSympolyProductTerms(leftKind, rightKind, targetKind, mode, lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      const totalDegree = sizeOf(lambda) + sizeOf(mu);
      assertSympolyLinearModeWithinLimit('product', mode, lambda, mu);
      assertSympolyProductPartitionWithinLimit(lambda, mu);
      setSympolyComputationStage('enumerating partitions');
      const leftData = partitionsOfSizeLimited(sizeOf(lambda), SYMPOLY_PRODUCT_PARTITION_LIMIT);
      const rightData = partitionsOfSizeLimited(sizeOf(mu), SYMPOLY_PRODUCT_PARTITION_LIMIT);
      const totalData = partitionsOfSizeLimited(totalDegree, SYMPOLY_PRODUCT_PARTITION_LIMIT);
      if (leftData.truncated || rightData.truncated || totalData.truncated) throw new Error('expansion-too-large');

      setSympolyComputationStage('expanding the left factor to monomials');
      const leftTerms = sympolyExpansionInMonomialBasis(leftKind, lambda, leftData.parts);
      checkSympolyComputationDeadline(true);
      setSympolyComputationStage('expanding the right factor to monomials');
      const rightTerms = sympolyExpansionInMonomialBasis(rightKind, mu, rightData.parts);
      checkSympolyComputationDeadline(true);
      setSympolyComputationStage('multiplying monomial-basis terms');
      const monomialTerms = sympolyMultiplyMonomialLinearTerms(leftTerms, rightTerms);
      checkSympolyComputationDeadline(true);
      const conversionBasis = conversionBasisForSympolyMode(targetKind, mode);
      setSympolyComputationStage(`converting to ${conversionBasis}-basis coordinates`);
      return sympolyConvertBasisLinearCombination(monomialTerms, 'm', conversionBasis, totalData.parts);
    }

    function sympolyBasisElementTerms(kind, partition, targetKind) {
      const lambda = trimPartition(partition);
      const data = partitionsOfSizeLimited(sizeOf(lambda));
      if (data.truncated) throw new Error('expansion-too-large');
      return sympolyConvertBasisLinearCombination([{ part: lambda, coeff: symRat(1n) }], kind, targetKind, data.parts);
    }

    function sympolyAddPowerTerm(map, part, coeff) {
      if (symRatIsZero(coeff)) return;
      const clean = trimPartition(part).sort((a, b) => b - a);
      const k = sympolyPartKey(clean);
      const next = symRatAdd(map.get(k) || symRat(0n), coeff);
      if (symRatIsZero(next)) map.delete(k);
      else map.set(k, next);
      if (map.size > SYMPOLY_POLYNOMIAL_TERM_LIMIT) throw new Error('polynomial-too-large');
    }

    function sympolyPowerMapFromTerms(terms) {
      const map = new Map();
      for (const { part, coeff } of terms) sympolyAddPowerTerm(map, part, coeff);
      return map;
    }

    function sympolyPowerTermsFromMap(map) {
      return [...map.entries()]
        .map(([k, coeff]) => ({ part: k ? k.split(',').map(Number) : [], coeff }))
        .sort((a, b) => comparePartitionsDesc(a.part, b.part));
    }

    function sympolyOnePowerMap() {
      return new Map([['', symRat(1n)]]);
    }

    function sympolyMultiplyPowerMaps(left, right) {
      const product = new Map();
      for (const [leftKey, leftCoeff] of left.entries()) {
        const leftPart = leftKey ? leftKey.split(',').map(Number) : [];
        for (const [rightKey, rightCoeff] of right.entries()) {
          const rightPart = rightKey ? rightKey.split(',').map(Number) : [];
          sympolyAddPowerTerm(product, leftPart.concat(rightPart), symRatMul(leftCoeff, rightCoeff));
        }
      }
      return product;
    }

    function sympolyAdamsPowerMap(map, factor) {
      const out = new Map();
      for (const [k, coeff] of map.entries()) {
        const part = k ? k.split(',').map(Number) : [];
        sympolyAddPowerTerm(out, part.map(x => x * factor), coeff);
      }
      return out;
    }

    function sympolyPlethysmPowerTerms(leftKind, rightKind, lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      const totalDegree = sizeOf(lambda) * sizeOf(mu);
      if (totalDegree > SYMPOLY_PLETHYSM_BOX_LIMIT) throw new Error('plethysm-too-large');

      const outerTerms = sympolyBasisElementTerms(leftKind, lambda, 'p');
      const innerMap = sympolyPowerMapFromTerms(sympolyBasisElementTerms(rightKind, mu, 'p'));
      const total = new Map();

      for (const outer of outerTerms) {
        if (symRatIsZero(outer.coeff)) continue;
        let product = sympolyOnePowerMap();
        for (const part of outer.part) {
          product = sympolyMultiplyPowerMaps(product, sympolyAdamsPowerMap(innerMap, part));
        }
        for (const [k, coeff] of product.entries()) {
          const rho = k ? k.split(',').map(Number) : [];
          sympolyAddPowerTerm(total, rho, symRatMul(outer.coeff, coeff));
        }
      }

      return sympolyPowerTermsFromMap(total);
    }

    function infiniteSympolyPlethysmTerms(leftKind, rightKind, targetKind, mode, lambdaRows, muRows) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      const totalDegree = sizeOf(lambda) * sizeOf(mu);
      assertSympolyLinearModeWithinLimit('plethysm', mode, lambda, mu);
      const totalData = partitionsOfSizeLimited(totalDegree);
      if (totalData.truncated) throw new Error('expansion-too-large');
      const conversionBasis = conversionBasisForSympolyMode(targetKind, mode);
      return sympolyConvertBasisLinearCombination(
        sympolyPlethysmPowerTerms(leftKind, rightKind, lambda, mu),
        'p',
        conversionBasis,
        totalData.parts,
      );
    }

    function oneRationalPolynomial(variableCount) {
      return new Map([[polyKey(zeroExponentVector(variableCount)), symRat(1n)]]);
    }

    function addRationalPolynomialTerm(poly, exponents, coeff) {
      if (symRatIsZero(coeff)) return;
      const k = polyKey(exponents);
      const next = symRatAdd(poly.get(k) || symRat(0n), coeff);
      if (symRatIsZero(next)) poly.delete(k);
      else poly.set(k, next);
      if (poly.size > SYMPOLY_POLYNOMIAL_TERM_LIMIT) throw new Error('polynomial-too-large');
    }

    function addScaledRationalPolynomial(target, source, scale) {
      if (symRatIsZero(scale)) return target;
      for (const [k, coeff] of source.entries()) {
        addRationalPolynomialTerm(target, exponentsFromKey(k), symRatMul(coeff, scale));
      }
      return target;
    }

    function rationalizePolynomial(poly) {
      const out = new Map();
      for (const [k, coeff] of poly.entries()) out.set(k, symRatFromInteger(coeff));
      return out;
    }

    function multiplyRationalPolynomials(left, right, variableCount) {
      if (!left.size || !right.size) return new Map();
      const product = new Map();
      for (const [leftKey, leftCoeff] of left.entries()) {
        const leftExp = exponentsFromKey(leftKey);
        for (const [rightKey, rightCoeff] of right.entries()) {
          const rightExp = exponentsFromKey(rightKey);
          const exp = zeroExponentVector(variableCount);
          for (let i = 0; i < variableCount; i++) exp[i] = leftExp[i] + rightExp[i];
          addRationalPolynomialTerm(product, exp, symRatMul(leftCoeff, rightCoeff));
        }
      }
      return product;
    }

    function adamsRationalPolynomial(poly, factor) {
      const out = new Map();
      for (const [k, coeff] of poly.entries()) {
        addRationalPolynomialTerm(out, exponentsFromKey(k).map(e => e * factor), coeff);
      }
      return out;
    }

    function finiteSympolyPlethysmPolynomial(leftKind, rightKind, lambdaRows, muRows, variableCount) {
      const lambda = trimPartition(lambdaRows);
      const mu = trimPartition(muRows);
      const totalDegree = sizeOf(lambda) * sizeOf(mu);
      if (totalDegree > SYMPOLY_PLETHYSM_BOX_LIMIT) throw new Error('plethysm-too-large');

      const outerTerms = sympolyBasisElementTerms(leftKind, lambda, 'p');
      const innerPoly = rationalizePolynomial(finiteSympolyPolynomial(rightKind, mu, variableCount));
      const total = new Map();

      for (const outer of outerTerms) {
        if (symRatIsZero(outer.coeff)) continue;
        let product = oneRationalPolynomial(variableCount);
        for (const part of outer.part) {
          product = multiplyRationalPolynomials(product, adamsRationalPolynomial(innerPoly, part), variableCount);
        }
        addScaledRationalPolynomial(total, product, outer.coeff);
      }

      return total;
    }

    function formatFiniteRationalSympolyPolynomial(poly) {
      if (!poly.size) return '0';
      return [...poly.entries()]
        .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
        .map(([k, coeff], index) => {
          const negative = coeff.n < 0n;
          const absCoeff = symRatAbs(coeff);
          const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
          const monomial = formatVariableMonomial(exponentsFromKey(k));
          if (monomial === '1') return `${sign}${formatSymRatCoefficient(absCoeff)}`;
          if (symRatIsOneAbs(absCoeff)) return `${sign}${monomial}`;
          return `${sign}<span class="symfun-coeff">${formatSymRatCoefficient(absCoeff)}</span>${monomial}`;
        })
        .join('');
    }

    function sympolyGeneratorSymbolHTML(kind, n) {
      return `<span class="symfun-symbol">${kind}<sub>${n}</sub></span>`;
    }

    function sympolyGeneratorMonomialHTML(part, generatorKind) {
      const clean = part.filter(n => n > 0);
      if (!clean.length) return '1';
      const counts = new Map();
      for (const n of clean) counts.set(n, (counts.get(n) || 0) + 1);
      return [...counts.entries()]
        .sort(([a], [b]) => b - a)
        .map(([n, count]) => {
          const symbol = sympolyGeneratorSymbolHTML(generatorKind, n);
          return count === 1 ? symbol : `${symbol}<sup>${count}</sup>`;
        })
        .join(' ');
    }

    function sympolyNormalizedGeneratorPart(part) {
      return part.filter(n => n > 0).sort((a, b) => b - a);
    }

    function sympolyGeneratorPartFromKey(k) {
      return k ? k.split(',').filter(Boolean).map(Number) : [];
    }

    function sympolyAddGeneratorPolynomialTerm(poly, part, coeff) {
      if (symRatIsZero(coeff)) return;
      const k = sympolyPartKey(sympolyNormalizedGeneratorPart(part));
      const next = symRatAdd(poly.get(k) || symRat(0n), coeff);
      if (symRatIsZero(next)) poly.delete(k);
      else poly.set(k, next);
    }

    function sympolyMultiplyGeneratorPolynomials(left, right) {
      const product = new Map();
      for (const [leftKey, leftCoeff] of left.entries()) {
        checkSympolyComputationDeadline();
        const leftPart = sympolyGeneratorPartFromKey(leftKey);
        for (const [rightKey, rightCoeff] of right.entries()) {
          checkSympolyComputationDeadline();
          sympolyAddGeneratorPolynomialTerm(
            product,
            leftPart.concat(sympolyGeneratorPartFromKey(rightKey)),
            symRatMul(leftCoeff, rightCoeff),
          );
          if (product.size > SYMPOLY_POLYNOMIAL_TERM_LIMIT) throw new Error('polynomial-too-large');
        }
      }
      return product;
    }

    const sympolySchurGeneratorCache = new Map();

    function sympolySchurGeneratorPolynomial(part) {
      const lambda = trimPartition(part);
      const cacheKey = lambda.join(',');
      const cached = sympolySchurGeneratorCache.get(cacheKey);
      if (cached) return cached;

      if (!lambda.length) {
        const one = new Map([['', symRat(1n)]]);
        sympolySchurGeneratorCache.set(cacheKey, one);
        return one;
      }
      if (lambda.length > SYMPOLY_SCHUR_DETERMINANT_LIMIT) throw new Error('schur-generator-too-large');

      const size = lambda.length;
      const used = Array(size).fill(false);
      const perm = [];
      let total = new Map();

      function permutationSign(cols) {
        let inv = 0;
        for (let i = 0; i < cols.length; i++) {
          for (let j = i + 1; j < cols.length; j++) {
            if (cols[i] > cols[j]) inv++;
          }
        }
        return inv % 2 ? -1n : 1n;
      }

      function hGeneratorPoly(k) {
        if (k < 0) return new Map();
        if (k === 0) return new Map([['', symRat(1n)]]);
        return new Map([[String(k), symRat(1n)]]);
      }

      function rec(row) {
        checkSympolyComputationDeadline();
        if (row === size) {
          let product = new Map([['', symRat(1n)]]);
          for (let r = 0; r < size; r++) {
            const k = lambda[r] - (r + 1) + (perm[r] + 1);
            product = sympolyMultiplyGeneratorPolynomials(product, hGeneratorPoly(k));
            if (!product.size) return;
          }
          const sign = symRat(permutationSign(perm));
          for (const [k, coeff] of product.entries()) {
            sympolyAddGeneratorPolynomialTerm(total, sympolyGeneratorPartFromKey(k), symRatMul(sign, coeff));
          }
          return;
        }

        for (let col = 0; col < size; col++) {
          if (used[col]) continue;
          used[col] = true;
          perm.push(col);
          rec(row + 1);
          perm.pop();
          used[col] = false;
        }
      }

      rec(0);
      sympolySchurGeneratorCache.set(cacheKey, total);
      return total;
    }

    function sympolyExpandSchurLinearTermsToGeneratorPolynomial(terms) {
      const result = new Map();
      for (const { coeff, part } of terms) {
        checkSympolyComputationDeadline();
        if (symRatIsZero(coeff)) continue;
        const poly = sympolySchurGeneratorPolynomial(part);
        for (const [k, innerCoeff] of poly.entries()) {
          checkSympolyComputationDeadline();
          sympolyAddGeneratorPolynomialTerm(result, sympolyGeneratorPartFromKey(k), symRatMul(coeff, innerCoeff));
        }
      }
      return [...result.entries()]
        .map(([k, coeff]) => ({ part: sympolyGeneratorPartFromKey(k), coeff }))
        .sort((a, b) => comparePartitionsDesc(a.part, b.part));
    }

    function formatSympolyBasisLinearCombination(terms, kind) {
      const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
      if (!nonzero.length) return '0';
      return nonzero.map(({ coeff, part }, index) => {
        checkSympolyComputationDeadline();
        const negative = coeff.n < 0n;
        const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
        const symbol = sympolyBasisSymbol(kind, part);
        const absCoeff = symRatAbs(coeff);
        if (symbol === '1') return `${sign}${formatSymRatCoefficient(absCoeff)}`;
        const coeffText = symRatIsOneAbs(absCoeff) ? '' : `<span class="symfun-coeff">${formatSymRatCoefficient(absCoeff)}</span>`;
        return `${sign}${coeffText}${symbol}`;
      }).join('');
    }

    function formatSympolyBasisPolynomialCombination(terms, generatorKind) {
      if (generatorKind === 's') {
        terms = sympolyExpandSchurLinearTermsToGeneratorPolynomial(terms);
      }
      const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
      if (!nonzero.length) return '0';

      return nonzero.map(({ coeff, part }, index) => {
        checkSympolyComputationDeadline();
        const negative = coeff.n < 0n;
        const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
        const absCoeff = symRatAbs(coeff);
        const monomial = sympolyGeneratorMonomialHTML(part, generatorKind);
        const body = monomial === '1'
          ? formatSymRatCoefficient(absCoeff)
          : `${symRatIsOneAbs(absCoeff) ? '' : `<span class="symfun-coeff">${formatSymRatCoefficient(absCoeff)}</span> `}${monomial}`;
        return `${sign}${body}`;
      }).join('');
    }

    function currentSympolyConfig() {
      const lambda = trimPartition(state.lambda.rows);
      const mu = trimPartition(state.mu.rows);
      return {
        lambda,
        mu,
        leftKind: selectedSympolyLeftKind(),
        rightKind: selectedSympolyRightKind(),
        operation: selectedSympolyOperation(),
        targetBasis: selectedSympolyBasis(),
        mode: selectedSympolyMode(),
        variableChoice: readSympolyVariableCount(lambda, mu)
      };
    }

    function sympolyConfigSignature(config) {
      return JSON.stringify({
        lambda: config.lambda,
        mu: config.mu,
        leftKind: config.leftKind,
        rightKind: config.rightKind,
        operation: config.operation,
        targetBasis: config.targetBasis,
        mode: config.mode,
        variables: config.variableChoice?.infinite ? 'infinite' : config.variableChoice?.count
      });
    }

    function sympolyResultFilename(operation) {
      return operation === 'plethysm'
        ? 'symmetric_polynomial_plethysm.txt'
        : 'symmetric_polynomial_product.txt';
    }

    function sympolyComputationErrorMessage(err, config) {
      const targetBasis = config?.targetBasis || selectedSympolyBasis();
      const mode = config?.mode || selectedSympolyMode();
      const operation = config?.operation || selectedSympolyOperation();
      const lambda = config?.lambda || trimPartition(state.lambda.rows);
      const mu = config?.mu || trimPartition(state.mu.rows);
      const conversionBasis = config ? conversionBasisForSympolyMode(config.targetBasis, config.mode) : targetBasis;
      const stageText = err?.stage ? ` while ${err.stage}` : '';
      const message = err && err.message === 'sympoly-timeout'
        ? `Multiplication stopped after ${SYMPOLY_PRODUCT_TIME_LIMIT_MS / 1000} seconds${stageText}.`
        : err && err.message === 'product-partition-too-large'
          ? `Multiplication needs more partition-indexed terms than the multiplication cap allows: ${formatSympolyProductPartitionCounts(err.partitionCounts || sympolyProductPartitionCounts(lambda, mu))}.`
        : err && err.message === 'polynomial-too-large'
          ? `Complete polynomial expansion has more than ${SYMPOLY_POLYNOMIAL_TERM_LIMIT} terms.`
          : err && err.message === 'expansion-too-large'
            ? `Complete infinite-variable expansion has more than ${SYMPOLY_EXPANSION_PARTITION_LIMIT} Young-diagram terms.`
            : err && err.message === 'basis-conversion-too-large'
              ? `The selected ${mode} output needs an exact ${conversionBasis}-basis conversion matrix larger than this browser chart allows.`
              : err && err.message === 'schur-generator-too-large'
                ? `Schur polynomial mode is capped at Jacobi-Trudi size ${SYMPOLY_SCHUR_DETERMINANT_LIMIT}.`
                : err && err.message === 'plethysm-too-large'
                  ? sympolyPlethysmLimitMessage(lambda, mu)
                  : err && err.message === 'linear-mode-too-large'
                    ? sympolyLinearModeLimitMessage(operation, lambda, mu)
                    : (err?.message || String(err));
      return appendSympolyLimitDetails(message, config);
    }

    function buildSymmetricPolynomialProductResult(config = currentSympolyConfig()) {
      const { lambda, mu, leftKind, rightKind, operation, targetBasis, mode, variableChoice } = config;
      if (variableChoice.error) return { error: variableChoice.error };
      if (variableChoice.pending) return { pending: true };

      let valueHTML;
      let valueText;
      const leftText = `${sympolySymbolText(leftKind, 'lambda')} ${operation === 'plethysm' ? 'o' : '*'} ${sympolySymbolText(rightKind, 'mu')}`;
      const lines = [
        `# Symmetric polynomial ${operation}`,
        `# lambda = ${sympolyPartitionLabel(lambda)}`,
        `# mu = ${sympolyPartitionLabel(mu)}`,
        `# left type = ${leftKind}`,
        `# right type = ${rightKind}`,
        `# operation = ${operation}`,
      ];

      if (variableChoice.count !== null) {
        lines.push(`# variables: x_1,...,x_${variableChoice.count}`);
        if (operation === 'plethysm') {
          setSympolyComputationStage('computing finite plethysm');
          const poly = finiteSympolyPlethysmPolynomial(leftKind, rightKind, lambda, mu, variableChoice.count);
          setSympolyComputationStage('formatting the finite polynomial');
          valueHTML = formatFiniteRationalSympolyPolynomial(poly);
          valueText = formatFiniteRationalSympolyPolynomialText(poly);
        } else {
          setSympolyComputationStage('expanding the left factor');
          const leftPoly = finiteSympolyPolynomial(leftKind, lambda, variableChoice.count);
          setSympolyComputationStage('expanding the right factor');
          const rightPoly = finiteSympolyPolynomial(rightKind, mu, variableChoice.count);
          setSympolyComputationStage('multiplying finite polynomials');
          const product = multiplyPolynomials(leftPoly, rightPoly, variableChoice.count);
          setSympolyComputationStage('formatting the finite polynomial');
          valueHTML = formatFiniteSympolyPolynomial(product);
          valueText = formatFiniteSympolyPolynomialText(product);
        }
      } else {
        setSympolyComputationStage(operation === 'plethysm'
          ? 'expanding infinite plethysm terms'
          : 'expanding infinite product terms');
        const terms = operation === 'plethysm'
          ? infiniteSympolyPlethysmTerms(leftKind, rightKind, targetBasis, mode, lambda, mu)
          : infiniteSympolyProductTerms(leftKind, rightKind, targetBasis, mode, lambda, mu);
        lines.push('# variables: infinite');
        lines.push(`# basis = ${sympolySymbolText(targetBasis, 'lambda')}`);
        lines.push(`# mode = ${mode}`);
        setSympolyComputationStage('formatting the infinite-variable result');
        if (mode === 'polynomial') {
          valueHTML = formatSympolyBasisPolynomialCombination(terms, targetBasis);
          valueText = formatSympolyBasisPolynomialCombinationText(terms, targetBasis);
        } else {
          const conversionBasis = conversionBasisForSympolyMode(targetBasis, mode);
          valueHTML = formatSympolyBasisLinearCombination(terms, conversionBasis);
          valueText = formatSympolyBasisLinearCombinationText(terms, conversionBasis);
        }
      }

      lines.push(`${leftText} = ${valueText}`);
      const computedAt = new Date().toLocaleTimeString();
      return {
        signature: sympolyConfigSignature(config),
        html: `
          ${sympolyComplexityPreviewHTML(config)}
          <div class="symfun-row sympoly-product-row">
            <span class="symfun-label">${sympolyProductLabelHTML(leftKind, rightKind, operation)}</span>
            <span class="symfun-value">${valueHTML}</span>
          </div>
          <div class="result-meta">computed ${sympolyEscapeHtml(computedAt)} for lambda=${sympolyEscapeHtml(sympolyPartitionLabel(lambda))}, mu=${sympolyEscapeHtml(sympolyPartitionLabel(mu))}</div>
        `,
        text: lines.join('\n'),
        filename: sympolyResultFilename(operation),
        computedAt
      };
    }

    function sympolyStaleHint() {
      return 'Click compute to update the symmetric-polynomial result.';
    }

    function renderSymmetricPolynomialProduct(options = {}) {
      const output = $('sympoly-output');
      if (!output) return;
      const card = output.closest('.card');
      if (!options.force && card && card.classList.contains('collapsed')) return;
      clearDoubleCardStale('sympoly-output');

      const config = currentSympolyConfig();
      if (config.variableChoice.error) {
        output.innerHTML = `${sympolyComplexityPreviewHTML(config)}<div class="symfun-too-large">${sympolyEscapeHtml(config.variableChoice.error)}</div>`;
        return;
      }
      if (config.variableChoice.pending) {
        output.innerHTML = `${sympolyComplexityPreviewHTML(config)}<span class="hint">Enter N or turn on infinite mode before computing.</span>`;
        return;
      }

      const cached = state.lastSymmetricPolynomial;
      if (cached && cached.signature === sympolyConfigSignature(config)) {
        output.innerHTML = cached.html;
      } else {
        output.innerHTML = `${sympolyComplexityPreviewHTML(config)}<span class="hint">${sympolyEscapeHtml(sympolyStaleHint())}</span>`;
      }
    }

    function markSymmetricPolynomialStale() {
      state.lastSymmetricPolynomial = null;
      clearDoubleCardStale('sympoly-output');
      renderSymmetricPolynomialProduct({ force: true });
      if (state.exportMode === 'symmetric-polynomials') {
        const exportOut = $('export-out');
        if (exportOut) exportOut.value = symmetricPolynomialProductExportText();
        state.exportFilename = sympolyResultFilename(selectedSympolyOperation());
      }
    }

    function computeSymmetricPolynomialProduct() {
      const output = $('sympoly-output');
      if (!output) return;
      clearDoubleCardStale('sympoly-output');
      const config = currentSympolyConfig();
      if (config.variableChoice.error) {
        state.lastSymmetricPolynomial = null;
        output.innerHTML = `<div class="symfun-too-large">${sympolyEscapeHtml(config.variableChoice.error)}</div>`;
        return;
      }
      if (config.variableChoice.pending) {
        state.lastSymmetricPolynomial = null;
        output.innerHTML = '<span class="hint">Enter N or turn on infinite mode before computing.</span>';
        return;
      }
      try {
        startSympolyComputationTimer(config.operation);
        const result = buildSymmetricPolynomialProductResult(config);
        if (result.error) {
          state.lastSymmetricPolynomial = null;
          output.innerHTML = `<div class="symfun-too-large">${sympolyEscapeHtml(result.error)}</div>`;
          return;
        }
        if (result.pending) {
          state.lastSymmetricPolynomial = null;
          output.innerHTML = '<span class="hint">Enter N or turn on infinite mode before computing.</span>';
          return;
        }
        state.lastSymmetricPolynomial = result;
        output.innerHTML = result.html;
        clearDoubleCardStale('sympoly-output');
        if (state.exportMode === 'symmetric-polynomials') {
          const exportOut = $('export-out');
          if (exportOut) exportOut.value = result.text;
          state.exportFilename = result.filename;
        }
      } catch (err) {
        const message = sympolyComputationErrorMessage(err, config);
        const errorResult = {
          signature: sympolyConfigSignature(config),
          html: `${sympolyComplexityPreviewHTML(config)}<div class="symfun-too-large">${sympolyEscapeHtml(message)}</div>`,
          text: message,
          filename: sympolyResultFilename(config.operation),
          failed: true
        };
        state.lastSymmetricPolynomial = errorResult;
        output.innerHTML = errorResult.html;
        clearDoubleCardStale('sympoly-output');
        if (state.exportMode === 'symmetric-polynomials') {
          const exportOut = $('export-out');
          if (exportOut) exportOut.value = errorResult.text;
        }
      } finally {
        clearSympolyComputationTimer();
      }
    }

    function sympolySymbolText(kind, partText) {
      return `${kind}_${partText}`;
    }

    function formatVariableMonomialText(exponents) {
      const factors = [];
      for (let i = 0; i < exponents.length; i++) {
        const pow = exponents[i];
        if (!pow) continue;
        factors.push(pow === 1 ? `x_${i + 1}` : `x_${i + 1}^${pow}`);
      }
      return factors.length ? factors.join('*') : '1';
    }

    function formatFiniteSympolyPolynomialText(poly) {
      if (!poly.size) return '0';
      return [...poly.entries()]
        .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
        .map(([k, coeff], index) => {
          checkSympolyComputationDeadline();
          const negative = coeff < 0n;
          const absCoeff = negative ? -coeff : coeff;
          const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
          const monomial = formatVariableMonomialText(exponentsFromKey(k));
          if (monomial === '1') return `${sign}${absCoeff.toString()}`;
          if (absCoeff === 1n) return `${sign}${monomial}`;
          return `${sign}${absCoeff.toString()}*${monomial}`;
        })
        .join('');
    }

    function formatFiniteRationalSympolyPolynomialText(poly) {
      if (!poly.size) return '0';
      return [...poly.entries()]
        .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
        .map(([k, coeff], index) => {
          checkSympolyComputationDeadline();
          const negative = coeff.n < 0n;
          const absCoeff = symRatAbs(coeff);
          const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
          const monomial = formatVariableMonomialText(exponentsFromKey(k));
          if (monomial === '1') return `${sign}${formatSymRatText(absCoeff)}`;
          if (symRatIsOneAbs(absCoeff)) return `${sign}${monomial}`;
          return `${sign}${formatSymRatText(absCoeff)}*${monomial}`;
        })
        .join('');
    }

    function formatSymRatText(coeff) {
      const abs = symRatAbs(coeff);
      return abs.d === 1n ? abs.n.toString() : `${abs.n.toString()}/${abs.d.toString()}`;
    }

    function sympolyGeneratorMonomialText(part, generatorKind) {
      const clean = part.filter(n => n > 0);
      if (!clean.length) return '1';
      const counts = new Map();
      for (const n of clean) counts.set(n, (counts.get(n) || 0) + 1);
      return [...counts.entries()]
        .sort(([a], [b]) => b - a)
        .map(([n, count]) => count === 1 ? `${generatorKind}_${n}` : `${generatorKind}_${n}^${count}`)
        .join('*');
    }

    function formatSympolyBasisLinearCombinationText(terms, kind) {
      const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
      if (!nonzero.length) return '0';
      return nonzero.map(({ coeff, part }, index) => {
        checkSympolyComputationDeadline();
        const negative = coeff.n < 0n;
        const absCoeff = symRatAbs(coeff);
        const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
        if (!part.length) return `${sign}${formatSymRatText(absCoeff)}`;
        const symbol = sympolySymbolText(kind, sympolyPartitionLabel(part));
        return `${sign}${symRatIsOneAbs(absCoeff) ? '' : formatSymRatText(absCoeff) + '*'}${symbol}`;
      }).join('');
    }

    function formatSympolyBasisPolynomialCombinationText(terms, generatorKind) {
      if (generatorKind === 's') {
        terms = sympolyExpandSchurLinearTermsToGeneratorPolynomial(terms);
      }
      const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
      if (!nonzero.length) return '0';
      return nonzero.map(({ coeff, part }, index) => {
        checkSympolyComputationDeadline();
        const negative = coeff.n < 0n;
        const absCoeff = symRatAbs(coeff);
        const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
        const monomial = sympolyGeneratorMonomialText(part, generatorKind);
        const body = monomial === '1'
          ? formatSymRatText(absCoeff)
          : `${symRatIsOneAbs(absCoeff) ? '' : formatSymRatText(absCoeff) + '*'}${monomial}`;
        return `${sign}${body}`;
      }).join('');
    }

    function cachedSymmetricPolynomialProduct() {
      const config = currentSympolyConfig();
      const cached = state.lastSymmetricPolynomial;
      return cached && cached.signature === sympolyConfigSignature(config) ? cached : null;
    }

    function symmetricPolynomialProductExportText() {
      const config = currentSympolyConfig();
      if (config.variableChoice.error) return config.variableChoice.error;
      if (config.variableChoice.pending) return 'Enter N or turn on infinite mode, then click compute before exporting.';
      const cached = cachedSymmetricPolynomialProduct();
      return cached ? cached.text : sympolyStaleHint();
    }

    function exportSymmetricPolynomialProduct() {
      const exportOut = $('export-out');
      if (!exportOut) return;
      const cached = cachedSymmetricPolynomialProduct();
      exportOut.value = symmetricPolynomialProductExportText();
      state.exportMode = 'symmetric-polynomials';
      state.exportFilename = cached ? cached.filename : sympolyResultFilename(selectedSympolyOperation());
      setCardCollapsed(exportOut.closest('.card'), false, false);
      exportOut.focus();
    }

    function cardForElementId(id) {
      const el = $(id);
      return el ? el.closest('.card') : null;
    }
    function isCardExpandedById(id) {
      const card = cardForElementId(id);
      return !!card && !card.classList.contains('collapsed');
    }
    function setCardStaleById(id, stale = true) {
      const card = cardForElementId(id);
      if (card) card.classList.toggle('is-stale', !!stale);
    }
    function currentDoubleResultFlags() {
      return {
        decomposition: !!state.lastDecomposition,
        kostka: !!state.lastKostka,
        kronecker: !!state.lastKronecker,
        plethysm: !!state.lastPlethysm,
        schurFunctor: !!state.lastSchurFunctor,
        grassmannian: !!state.lastGrassmannian
      };
    }
    function markDoubleComputedCardsStale(flags = currentDoubleResultFlags()) {
      [
        ['decomposition', 'schur-out'],
        ['kostka', 'kostka-out'],
        ['kronecker', 'kronecker-out'],
        ['plethysm', 'plethysm-out'],
        ['schurFunctor', 'schur-functor-out'],
        ['grassmannian', 'grassmannian-out']
      ].forEach(([key, id]) => {
        if (flags[key]) setCardStaleById(id, true);
      });
    }
    function clearDoubleCardStale(id) {
      setCardStaleById(id, false);
    }
    function refreshExport(options = {}) {
      const force = !!options.force;
      if (!force && !isCardExpandedById('export-out')) return;
      if (!force && state.exportMode !== 'json') return;
      const payload = {
        app: 'double_young_diagram', type: currentType(), rank: currentRank(), fixedRankMode: $('fixed-rank-mode').checked,
        grid: { rows: state.lambda.maxRows, cols: state.lambda.maxCols }, lambda: trimPartition(state.lambda.rows), mu: trimPartition(state.mu.rows),
        decomposition: state.lastDecomposition,
        kostkaTableaux: state.lastKostka,
        kroneckerDecomposition: state.lastKronecker,
        plethysmDecomposition: state.lastPlethysm,
        schurFunctorDecomposition: state.lastSchurFunctor,
        grassmannianCupProduct: state.lastGrassmannian
      };
      state.exportMode = 'json';
      state.exportFilename = 'double_young_diagram_export.json';
      $('export-out').value = JSON.stringify(payload, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
    }
    function copyExport() { $('export-out').select(); document.execCommand('copy'); }
    function downloadExport() {
      if (state.exportMode === 'json') refreshExport({ force: true });
      const isJson = state.exportMode === 'json';
      const blob = new Blob([$('export-out').value], { type: isJson ? 'application/json' : 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = state.exportFilename || (isJson ? 'double_young_diagram_export.json' : 'double_young_diagram_export.txt');
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); a.remove();
    }
    window.onTypeChange = function onTypeChange() {
      const type = currentType(), rankInput = $('lie-rank'), rankWrap = $('lie-rank-wrap');
      if (isClassicalType(type)) {
        const mins = { A:1, B:2, C:2, D:3 };
        rankWrap.style.display = 'flex'; rankInput.min = String(mins[type]);
        if (Number(rankInput.value) < mins[type]) rankInput.value = String(mins[type]);
      } else rankWrap.style.display = 'none';
      $('lie-algebra-desc').textContent = typeDescription(type, currentRank());
      const hadDecomposition = !!state.lastDecomposition;
      const hadSchurFunctor = !!state.lastSchurFunctor;
      state.lastDecomposition = null;
      state.lastSchurFunctor = null;
      if (hadDecomposition) setCardStaleById('schur-out', true);
      if (hadSchurFunctor) setCardStaleById('schur-functor-out', true);
      refreshLRModeHint();
      updateStats();
      updateInvariants();
      refreshExport();
      updateDoubleUrlState();
    };
    window.onAlgebraChange = function onAlgebraChange() { window.onTypeChange(); };
    function refreshLRModeHint() {
      const type = currentType(), rank = currentRank();
      const box = $('fixed-rank-mode');
      if (isExceptionalType(type)) {
        box.checked = true;
        box.disabled = true;
        $('lr-mode-hint').innerHTML = `Exceptional type ${lieAlgebraLabel(type, rank)} has no stable Young-diagram mode, so fixed-rank mode is forced. Candidates are dominant weights in the invariant norm ball ‖γ‖ ≤ ‖λ‖ + ‖μ‖; coefficients are computed by Freudenthal characters plus Brauer–Klimyk straightening.`;
      } else {
        box.disabled = false;
        const fixed = box.checked;
        if (!fixed) $('lr-mode-hint').innerHTML = 'Unchecked: stable <em>n</em> ≫ 0. Type A gives ordinary LR coefficients; B/C/D gives stable Newell–Littlewood coefficients.';
        else $('lr-mode-hint').innerHTML = `Checked: fixed ${lieAlgebraLabel(type, rank)}. The page enumerates dominant weights in the invariant norm ball, builds the smaller character by Freudenthal recursion, applies Brauer–Klimyk straightening, then translates dominant labels back to diagram rows.`;
      }
      const hadDecomposition = !!state.lastDecomposition;
      state.lastDecomposition = null;
      if (hadDecomposition) setCardStaleById('schur-out', true);
      refreshExport();
    }
    window.refreshLRModeHint = refreshLRModeHint;

    function runCardOpenRefresh(card) {
      if (!card) return;
      if (card.querySelector('#stats-out')) updateStats({ force: true });
      if (card.querySelector('#invariants-out')) updateInvariants({ force: true });
      if (card.querySelector('#slice-stats-out')) updateSliceCard({ force: true });
      if (card.querySelector('#sympoly-output')) renderSymmetricPolynomialProduct({ force: true });
      const exportOut = card.querySelector('#export-out');
      if (exportOut && (!exportOut.value.trim() || state.exportMode === 'json')) refreshExport({ force: true });
    }
    const MAX_OPEN_CHART_CARDS = 3;
    let openChartCardSequence = 0;

    function isOpenChartLimitCard(card) {
      if (!card || !card.classList.contains('card')) return false;
      if (card.closest('.canvas-panel')) return false;
      if (card.querySelector('#export-out')) return false;
      if (card.id === 'diagram-input-card' && card.getAttribute('draggable') !== 'true') return false;
      if (card.style.display === 'none') return false;
      return true;
    }

    function openChartCardGroupKey(card) {
      if (card && ['slice-card', 'slice-layer-card', 'slice-weight-info-card'].includes(card.id)) return 'slice';
      if (!card.dataset.openChartKey) card.dataset.openChartKey = `card-${++openChartCardSequence}`;
      return card.dataset.openChartKey;
    }

    function setCardAriaExpanded(card, expanded) {
      const head = card?.querySelector('.card-head');
      if (head) head.setAttribute('aria-expanded', String(!!expanded));
    }

    function collapseCardForOpenLimit(card) {
      if (!card) return;
      card.classList.add('collapsed');
      setCardAriaExpanded(card, false);
    }

    function toggleCardPinned(card, pinned) {
      if (!card) return;
      const next = pinned == null ? !card.classList.contains('is-pinned') : !!pinned;
      card.classList.toggle('is-pinned', next);
      const btn = card.querySelector('.card-pin-btn');
      if (btn) {
        btn.setAttribute('aria-pressed', String(next));
        btn.setAttribute('aria-label', next ? 'unpin card' : 'pin card');
        btn.title = next ? 'unpin card' : 'pin card';
      }
    }

    const CARD_PIN_ICON = '<svg class="card-pin-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"></path><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16h14v-.8a2 2 0 0 0-1.1-1.7l-1.8-.9A2 2 0 0 1 15 10.8V7a2 2 0 0 1 .6-1.4L17 4.2V2H7v2.2l1.4 1.4A2 2 0 0 1 9 7z"></path></svg>';

    function stopCardPinEvent(event) {
      event.stopPropagation();
    }

    function initCardChrome() {
      document.querySelectorAll('.card').forEach(card => {
        const head = card.querySelector('.card-head');
        if (!head || head.querySelector('.card-title-tools')) return;
        const tools = document.createElement('span');
        tools.className = 'card-title-tools';
        const stale = document.createElement('span');
        stale.className = 'card-stale-badge';
        stale.textContent = 'stale';
        const pin = document.createElement('button');
        pin.className = 'card-pin-btn';
        pin.type = 'button';
        pin.innerHTML = CARD_PIN_ICON;
        pin.title = 'pin card';
        pin.setAttribute('aria-label', 'pin card');
        pin.setAttribute('aria-pressed', 'false');
        ['pointerdown', 'mousedown'].forEach(type => {
          pin.addEventListener(type, stopCardPinEvent);
        });
        pin.addEventListener('touchstart', stopCardPinEvent, { passive: true });
        pin.addEventListener('click', event => {
          event.preventDefault();
          stopCardPinEvent(event);
          toggleCardPinned(card);
        });
        tools.appendChild(stale);
        tools.appendChild(pin);
        const toggle = head.querySelector('.toggle-icon');
        if (toggle) head.insertBefore(tools, toggle);
        else head.appendChild(tools);
      });
    }

    function enforceOpenChartCardLimit(activeCard) {
      if (!isOpenChartLimitCard(activeCard)) return;
      activeCard.dataset.openChartOrder = String(++openChartCardSequence);
      const activeGroupKey = openChartCardGroupKey(activeCard);
      const groups = new Map();
      for (const card of Array.from(document.querySelectorAll('.card:not(.collapsed)')).filter(isOpenChartLimitCard)) {
        const key = openChartCardGroupKey(card);
        const order = Number(card.dataset.openChartOrder || 0);
        const existing = groups.get(key) || { key, cards: [], order: 0, pinned: false };
        existing.cards.push(card);
        existing.order = Math.max(existing.order, order);
        existing.pinned = existing.pinned || card.classList.contains('is-pinned');
        groups.set(key, existing);
      }
      const openGroups = Array.from(groups.values()).sort((a, b) => a.order - b.order);
      while (openGroups.length > MAX_OPEN_CHART_CARDS) {
        const victim = openGroups.find(group => group.key !== activeGroupKey && !group.pinned);
        if (!victim) break; // Never close pinned groups just to satisfy the open-card limit.
        victim.cards.forEach(collapseCardForOpenLimit);
        openGroups.splice(openGroups.indexOf(victim), 1);
      }
    }

    function setCardCollapsed(card, collapsed, refreshOnOpen = true) {
      if (!card) return;
      card.classList.toggle('collapsed', collapsed);
      setCardAriaExpanded(card, !collapsed);
      if (!collapsed) {
        enforceOpenChartCardLimit(card);
        if (refreshOnOpen) runCardOpenRefresh(card);
      }
    }
    function setupCards() {
      document.addEventListener('click', (event) => {
        const head = event.target.closest('.card-head');
        if (!head || event.target.closest('.drag-handle') || event.target.closest('.card-pin-btn')) return;
        const card = head.closest('.card');
        setCardCollapsed(card, !card.classList.contains('collapsed'));
      });
      initCardChrome();
      document.querySelectorAll('.card').forEach(card => setCardCollapsed(card, true, false));
    }
    function setupPointerDnd() {
      const side = $('cards');
      let drag = null, ghost = null, placeholder = null, offsetY = 0;
      function cards() { return Array.from(side.querySelectorAll(':scope > .card')); }
      side.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        const card = handle.closest('.card');
        if (!card || card.parentElement !== side) return;
        e.preventDefault();
        const rect = card.getBoundingClientRect(); offsetY = e.clientY - rect.top; drag = card;
        placeholder = document.createElement('div'); placeholder.style.cssText = `height:${rect.height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,.06);`;
        ghost = card.cloneNode(true); Object.assign(ghost.style, { position:'fixed', left:rect.left+'px', top:rect.top+'px', width:rect.width+'px', zIndex:9999, pointerEvents:'none', opacity:.9, boxShadow:'0 8px 32px rgba(0,0,0,.22)' });
        card.after(placeholder); card.style.display = 'none'; document.body.appendChild(ghost); handle.setPointerCapture?.(e.pointerId);
      });
      window.addEventListener('pointermove', (e) => {
        if (!drag) return; e.preventDefault(); ghost.style.top = (e.clientY - offsetY) + 'px';
        let before = null;
        for (const c of cards()) {
          if (c === drag || c === placeholder) continue;
          const r = c.getBoundingClientRect(); if (e.clientY < r.top + r.height/2) { before = c; break; }
        }
        if (before) side.insertBefore(placeholder, before); else side.appendChild(placeholder);
      }, { passive:false });
      window.addEventListener('pointerup', () => {
        if (!drag) return;
        drag.style.display = ''; side.insertBefore(drag, placeholder); placeholder.remove(); ghost.remove(); drag = ghost = placeholder = null;
        placeSliceCompanionCards();
      });
    }
    function setupResponsiveDiagramInput() {
      const mq = window.matchMedia('(max-width: 980px)');
      const card = $('diagram-input-card'), anchor = $('diagram-input-anchor'), side = $('cards');
      function apply() { if (mq.matches) side.insertBefore(card, side.firstChild); else anchor.after(card); }
      mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
      apply();
    }
    function initCustomTooltips() {
      if (document.body.dataset.customTooltipsReady === '1') return;
      document.body.dataset.customTooltipsReady = '1';

      const tip = document.createElement('div');
      tip.className = 'custom-tooltip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);

      let activeEl = null;

      function placeTooltip(el) {
        const rect = el.getBoundingClientRect();
        const margin = 10;
        const gap = 8;
        tip.style.left = '0px';
        tip.style.top = '0px';
        const tipRect = tip.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

        let top = rect.top - tipRect.height - gap;
        if (top < margin) top = rect.bottom + gap;
        top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin));

        tip.style.left = `${Math.round(left)}px`;
        tip.style.top = `${Math.round(top)}px`;
      }

      function showTooltip(el) {
        const text = el.getAttribute('data-tooltip');
        if (!text) return;
        activeEl = el;
        tip.textContent = text;
        tip.classList.add('visible');
        placeTooltip(el);
      }

      function hideTooltip(el) {
        if (el && activeEl && el !== activeEl) return;
        tip.classList.remove('visible');
        activeEl = null;
      }

      document.addEventListener('pointerenter', (event) => {
        const el = event.target.closest?.('[data-tooltip]');
        if (el) showTooltip(el);
      }, true);
      document.addEventListener('pointerleave', (event) => {
        const el = event.target.closest?.('[data-tooltip]');
        if (el) hideTooltip(el);
      }, true);
      document.addEventListener('focusin', (event) => {
        const el = event.target.closest?.('[data-tooltip]');
        if (el) showTooltip(el);
      });
      document.addEventListener('focusout', (event) => {
        const el = event.target.closest?.('[data-tooltip]');
        if (el) hideTooltip(el);
      });
      window.addEventListener('scroll', () => { if (activeEl) placeTooltip(activeEl); }, true);
      window.addEventListener('resize', () => { if (activeEl) placeTooltip(activeEl); });
    }
    function setupEvents() {
      for (const which of ['lambda','mu']) {
        state[which].canvas = $(which + '-canvas'); state[which].ctx = state[which].canvas.getContext('2d');
        state[which].canvas.addEventListener('click', (e) => handleCanvasClick(which, e));
        $(which === 'lambda' ? 'set-lambda' : 'set-mu').addEventListener('click', () => { try { setDiagram(which, parsePartition($(which + '-partition').value)); } catch (err) { alert(err.message); } });
        $(which === 'lambda' ? 'clear-lambda' : 'clear-mu').addEventListener('click', () => setDiagram(which, []));
      }
      $('grid-rows').addEventListener('change', applyGridSize); $('grid-cols').addEventListener('change', applyGridSize);
      $('swap-diagrams').addEventListener('click', () => { const staleFlags = currentDoubleResultFlags(); const a = state.lambda.rows.slice(); state.lambda.rows = state.mu.rows.slice(); state.mu.rows = a; state.lastDecomposition = null; state.lastKostka = null; state.lastKronecker = null; state.lastPlethysm = null;
      state.lastSchurFunctor = null; state.lastGrassmannian = null; markDoubleComputedCardsStale(staleFlags); drawAll(); updateStats(); updateInvariants(); markSymmetricPolynomialStale(); refreshExport(); updateDoubleUrlState(); });
      $('lie-type').addEventListener('change', window.onTypeChange); $('lie-rank').addEventListener('change', window.onAlgebraChange);
      $('fixed-rank-mode').addEventListener('change', refreshLRModeHint);
      $('compute-schur').addEventListener('click', computeSchur);
      $('export-schur').addEventListener('click', exportSchur);
      $('compute-kostka').addEventListener('click', computeKostkaTableaux);
      $('export-kostka').addEventListener('click', exportKostkaTableaux);
      $('compute-kronecker').addEventListener('click', computeKronecker);
      $('export-kronecker').addEventListener('click', exportKronecker);
      $('compute-plethysm').addEventListener('click', computePlethysm);
      $('export-plethysm').addEventListener('click', exportPlethysm);
      $('compute-schur-functor').addEventListener('click', computeSchurFunctor);
      $('export-schur-functor').addEventListener('click', exportSchurFunctor);
      $('compute-grassmannian').addEventListener('click', computeGrassmannianCup);
      $('export-grassmannian').addEventListener('click', exportGrassmannianCup);
      $('grassmannian-presentation').addEventListener('change', () => { const hadGrassmannian = !!state.lastGrassmannian; state.lastGrassmannian = null; if (hadGrassmannian) setCardStaleById('grassmannian-out', true); refreshExport(); });
      $('sympoly-variable-count').addEventListener('input', handleSympolyVariableInput);
      $('sympoly-infinite').addEventListener('change', toggleSympolyInfinite);
      $('sympoly-left-kind').addEventListener('change', markSymmetricPolynomialStale);
      $('sympoly-right-kind').addEventListener('change', markSymmetricPolynomialStale);
      $('sympoly-operation').addEventListener('change', markSymmetricPolynomialStale);
      $('sympoly-basis').addEventListener('change', markSymmetricPolynomialStale);
      $('sympoly-mode').addEventListener('change', markSymmetricPolynomialStale);
      $('compute-sympoly').addEventListener('click', computeSymmetricPolynomialProduct);
      $('export-sympoly').addEventListener('click', exportSymmetricPolynomialProduct);
      $('refresh-export').addEventListener('click', () => refreshExport({ force: true })); $('copy-export').addEventListener('click', copyExport); $('download-export').addEventListener('click', downloadExport);
      window.addEventListener('resize', resizeCanvases);
    }
    function init() {
      setupEvents(); setupCards(); setupPointerDnd(); setupResponsiveDiagramInput(); initCustomTooltips();
      if (!applyDoubleUrlState()) {
        applyGridSize(); setDiagram('lambda', [3,2]); setDiagram('mu', [2,1]);
      }
      window.onTypeChange(); refreshLRModeHint(); resizeCanvases();
    }
    window.__dbg = {decomposeFixedRank, decomposeFixedRankTypeA, dominantCandidatesBelow, dominantNormBoundCandidates, boundedSliceLatticePoints, dominantSliceRepresentative, buildSliceFreudenthalContext, sliceMultiplicityFreudenthal, irreducibleCharacterFreudenthal, decomposeByCandidatesBrauerKlimyk, weightMultiplicityByFreudenthal, weightMultiplicityByWeylCharacter, kostkaNumber, semistandardTableaux, computeKostkaTableaux, decomposeKronecker, decomposePlethysm, computeKronecker, computePlethysm, computeSchurFunctor, decomposeSchurFunctorFiniteType, computeGrassmannianCup, decomposeGrassmannianCup, grassmannianChernPolynomial, schurFunctorCharacter, decomposeCharacterByHighestWeightPeeling, decomposePlethysm, weylOrbitSizeDominant, updateInvariants};

    // ══════════════════════════════════════════════════════
    //  2-D WEIGHT SLICE
    // ══════════════════════════════════════════════════════

    // State for the slice canvas
    const sliceState = {
      visible: false,
      sliceCanvas: null,
      sliceCtx: null,
      lastData: null,  // cached slice data for resize
      hitPoints: [],
      selectedPoint: null,
      showDiagramsInSlice: false,
      characterMode: 'none',
      characterProjectionMode: 'slice',
      activeCharacter: null,
      infoPoint: null,
      gammaInputMode: 'dynkin',
      gammaInputText: '',
      gammaInputError: '',
      latticeMode: 'weight',
      lieInfoCollapsed: false,
      view: {
        zoom: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        moved: false,
        suppressClick: false,
        pointers: new Map(),
        gesture: null
      },
      layerModes: {
        weylChambers: 'none',
        fundamental: 'none',
        simpleRoots: 'none',
        roots: 'none',
        positiveRoots: 'none'
      }
    };

    // ── Geometry helpers ──────────────────────────────────

    // Inner product of two weight vectors given by Dynkin labels.
    // Returns a float (up to Cartan normalisation — same scale throughout).
    function sliceInnerProduct(aLabels, bLabels, type, rank) {
      const C = cartanMatrix(type, rank);
      const inner = makeDynkinInnerProduct(C);
      return inner(aLabels, bLabels);
    }

    // ‖v‖² in the same metric
    function sliceNormSq(labels, type, rank) {
      return sliceInnerProduct(labels, labels, type, rank);
    }

    // Gram-Schmidt: given v1 (nonzero), compute unit e1 and component of v2
    // perpendicular to e1.  All arithmetic done in the Dynkin-label inner product.
    // Returns { e1coords, e2coords } in the "display plane" basis where
    //   display-x ∝ e1,  display-y ∝ e2
    // and every lattice vector w has canvas coords (w·e1/|e1|², w·e2/|e2|²) times scale.
    function computePlaneProjectors(lambdaLabels, muLabels, type, rank) {
      const C = cartanMatrix(type, rank);
      const inner = makeDynkinInnerProduct(C);

      const ll = inner(lambdaLabels, lambdaLabels);
      const mm = inner(muLabels, muLabels);
      const lm = inner(lambdaLabels, muLabels);
      if (ll < 1e-14) return null;   // λ is zero weight

      // e1 = λ direction
      // mu_perp = mu - proj_lambda(mu)
      const proj = lm / ll;                             // scalar
      const mu_perp = muLabels.map((x, i) => x - proj * lambdaLabels[i]);   // Dynkin-label coords
      const mu_perp_norm2 = inner(mu_perp, mu_perp);

      // Check 2-d (not collinear)
      const cos2 = (lm * lm) / (ll * mm + 1e-30);     // cos²(angle)
      const is2D = (mm > 1e-14) && (1 - cos2 > 1e-6);

      return { e1: lambdaLabels.slice(), e1norm2: ll,
               e2: mu_perp,              e2norm2: mu_perp_norm2,
               ll, mm, lm, cos2, is2D,
               lambdaLabels, muLabels,
               angle: Math.acos(Math.min(1, Math.max(-1, lm / Math.sqrt(ll * mm + 1e-30)))) };
    }

    // Find an integer lattice basis for the 2-plane:
    // given e1 = λ (non-zero), e2 = μ_perp (could be non-lattice), find integer
    // lattice vectors b1, b2 in the plane that generate the full integer span of
    // the plane ∩ (root lattice + weight lattice).
    // Strategy: among the weights we'll enumerate, pick b1 = λ itself,
    // then b2 = shortest non-λ-parallel weight vector in the plane (after
    // Gram-Schmidt).  We do this lazily: the caller passes candidate weights.
    function findPlaneBasis(planeWeights2D) {
      // planeWeights2D = array of [u,v] with (u,v) rational
      // b1 is the direction (1,0) — i.e. λ itself (u=1, v=0)
      // b2: find smallest |v| > ε then reduce u mod b1
      let bestV = Infinity, bestU = 0;
      for (const [u, v] of planeWeights2D) {
        if (Math.abs(v) > 1e-6 && Math.abs(v) < bestV - 1e-9) {
          bestV = Math.abs(v); bestU = u;
        }
      }
      if (!isFinite(bestV)) return null;   // only 1-d
      // Reduce u mod 1 to stay in [0,1) range (fundamental domain along e1)
      const b2v = bestV;
      const b2u = bestU - Math.round(bestU);   // representative
      return { b1: [1, 0], b2: [b2u, b2v] };
    }

    function gcdInt(a, b) {
      a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b));
      while (b) [a, b] = [b, a % b];
      return a;
    }
    function vectorGcd(v) {
      return v.reduce((g, x) => gcdInt(g, x), 0);
    }
    function lcmInt(a, b) {
      a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b));
      if (!a || !b) return 0;
      return Math.abs(a / gcdInt(a, b) * b);
    }
    function posMod(a, m) {
      return ((a % m) + m) % m;
    }
    function formatDynkinVector(v) {
      return '[' + v.join(', ') + ']';
    }
    function escapeHTML(text) {
      return String(text).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch]));
    }
    function determinantIntMatrix(M) {
      const n = M.length;
      if (!n) return 1;
      const A = M.map(row => row.map(x => BigInt(Math.trunc(x))));
      let sign = 1n;
      let prev = 1n;
      for (let k = 0; k < n - 1; k++) {
        let pivot = k;
        while (pivot < n && A[pivot][k] === 0n) pivot++;
        if (pivot === n) return 0;
        if (pivot !== k) {
          [A[k], A[pivot]] = [A[pivot], A[k]];
          sign = -sign;
        }
        const pivotValue = A[k][k];
        for (let i = k + 1; i < n; i++) {
          for (let j = k + 1; j < n; j++) {
            A[i][j] = (A[i][j] * pivotValue - A[i][k] * A[k][j]) / prev;
          }
        }
        prev = pivotValue;
        for (let i = k + 1; i < n; i++) A[i][k] = 0n;
      }
      return Number(sign * A[n - 1][n - 1]);
    }
    function formatBasisCoords(x, y, d) {
      const f = (n) => {
        if (n === 0) return '0';
        if (d === 1 || n % d === 0) return String(n / d);
        return `${n}/${d}`;
      };
      return `(${f(x)}, ${f(y)})`;
    }
    function vectorFromLambdaMuCoords(lambdaLabels, muLabels, x, y, d) {
      const out = [];
      for (let i = 0; i < lambdaLabels.length; i++) {
        const n = x * lambdaLabels[i] + y * muLabels[i];
        if (n % d !== 0) return null;
        out.push(n / d);
      }
      return out;
    }
    function normalizeSliceBasisVector(vec) {
      let g = gcdInt(Math.abs(vec.denom || 1), Math.abs(vec.coords?.[0] || 0));
      g = gcdInt(g, Math.abs(vec.coords?.[1] || 0));
      if (g <= 1) return vec;
      return { ...vec, coords: [vec.coords[0] / g, vec.coords[1] / g], denom: vec.denom / g };
    }
    function combineSliceBasisVector(basis, a, b) {
      const v1 = basis[0], v2 = basis[1];
      const denom = lcmInt(v1.denom, v2.denom);
      const scale1 = denom / v1.denom;
      const scale2 = denom / v2.denom;
      return normalizeSliceBasisVector({
        coords: [
          a * v1.coords[0] * scale1 + b * v2.coords[0] * scale2,
          a * v1.coords[1] * scale1 + b * v2.coords[1] * scale2
        ],
        denom,
        labels: v1.labels.map((x, i) => a * x + b * v2.labels[i]),
        weightCoords: [a, b]
      });
    }
    function findSaturatedPlaneBasis(lambdaLabels, muLabels, minorGcd, lambdaGcd) {
      if (!minorGcd || !lambdaGcd) return null;
      const d = minorGcd;
      const g = lambdaGcd;
      if (d % g !== 0) return null;
      const v1 = lambdaLabels.map(x => x / g);
      const v2Y = g;
      let best = null;
      for (let x = 0; x < d; x++) {
        const labels = vectorFromLambdaMuCoords(lambdaLabels, muLabels, x, v2Y, d);
        if (!labels) continue;
        const norm = labels.reduce((s, a) => s + a*a, 0);
        const centeredX = x > d / 2 ? x - d : x;
        const candidate = {
          coords: [centeredX, v2Y],
          denom: d,
          labels,
          norm
        };
        if (!best || candidate.norm < best.norm || (candidate.norm === best.norm && Math.abs(centeredX) < Math.abs(best.coords[0]))) {
          best = candidate;
        }
      }
      if (!best) return null;
      return [
        { coords: [1, 0], denom: g, labels: v1 },
        best
      ];
    }
    function computeRootSliceLatticeInfo(weightBasis, C) {
      if (!weightBasis || weightBasis.length < 2 || !C) return { rank2: false, basis: null };
      const cartanIndex = Math.max(1, Math.abs(determinantIntMatrix(C)) || 1);
      const searchBounds = [Math.max(10, cartanIndex * 2 + 2), Math.max(24, cartanIndex * 4 + 4), 80];
      let best = null;

      for (const bound of searchBounds) {
        const candidates = [];
        for (let a = -bound; a <= bound; a++) {
          for (let b = -bound; b <= bound; b++) {
            if (!a && !b) continue;
            const vec = combineSliceBasisVector(weightBasis, a, b);
            const simpleCoords = dynkinToSimple(vec.labels, C);
            if (!simpleCoords) continue;
            candidates.push({ ...vec, simpleCoords });
          }
        }
        for (let i = 0; i < candidates.length; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            const u = candidates[i], v = candidates[j];
            const det = u.weightCoords[0] * v.weightCoords[1] - u.weightCoords[1] * v.weightCoords[0];
            if (!det) continue;
            const index = Math.abs(det);
            const score = u.labels.reduce((s, x) => s + x * x, 0) + v.labels.reduce((s, x) => s + x * x, 0);
            if (!best || index < best.index || (index === best.index && score < best.score)) {
              best = { u, v, index, score, searchBound: bound };
            }
          }
        }
        if (best && best.index <= cartanIndex) break;
      }

      if (!best) return { rank2: false, basis: null, index: null };
      const basis = reduceSecondSliceBasisVector([best.u, best.v], C).map(normalizeSliceBasisVector);
      return {
        rank2: true,
        basis,
        displayBasis: basis,
        index: best.index,
        searchBound: best.searchBound
      };
    }
    function reduceSecondSliceBasisVector(basis, C) {
      if (!basis || basis.length < 2 || !C) return basis;
      const inner = makeDynkinInnerProduct(C);
      const v1 = basis[0], v2 = basis[1];
      const v1norm = inner(v1.labels, v1.labels);
      if (Math.abs(v1norm) < 1e-12) return basis;
      const k = Math.round(inner(v1.labels, v2.labels) / v1norm);
      if (!k) return basis;
      const denom = lcmInt(v1.denom, v2.denom);
      if (!denom) return basis;
      const scale1 = denom / v1.denom;
      const scale2 = denom / v2.denom;
      const labels = v2.labels.map((x, i) => x - k * v1.labels[i]);
      return [
        v1,
        {
          coords: [
            v2.coords[0] * scale2 - k * v1.coords[0] * scale1,
            v2.coords[1] * scale2 - k * v1.coords[1] * scale1
          ],
          denom,
          labels,
          reducedFrom: v2,
          reductionK: k
        }
      ];
    }
    function computeSliceLatticeInfo(lambdaLabels, muLabels, C = null) {
      const lambdaGcd = vectorGcd(lambdaLabels);
      const muGcd = vectorGcd(muLabels);
      let minorGcd = 0;
      for (let i = 0; i < lambdaLabels.length; i++) {
        for (let j = i + 1; j < lambdaLabels.length; j++) {
          minorGcd = gcdInt(minorGcd, lambdaLabels[i] * muLabels[j] - lambdaLabels[j] * muLabels[i]);
        }
      }
      const rank2 = minorGcd > 0;
      const displayBasis = rank2 ? findSaturatedPlaneBasis(lambdaLabels, muLabels, minorGcd, lambdaGcd) : null;
      const basis = reduceSecondSliceBasisVector(displayBasis, C);
      const root = rank2 && basis && C ? computeRootSliceLatticeInfo(basis, C) : null;
      return {
        lambdaGcd,
        muGcd,
        minorGcd,
        index: minorGcd,
        rank2,
        saturated: rank2 && minorGcd === 1,
        basis,
        displayBasis,
        root
      };
    }
    function latticeBasisHTML(info) {
      if (!info.rank2) return 'not available';
      const displayBasis = info.displayBasis || info.basis;
      if (!displayBasis) return `index ${info.index}; basis search skipped`;
      return displayBasis.map((b, i) =>
        `<div class="slice-basis-line"><span class="slice-basis-name">v<sub>${i + 1}</sub></span><code>${formatDynkinVector(b.labels)}</code></div>`
      ).join('');
    }
    function sliceLayerModeButtons(layer) {
      const modes = [
        ['none', 'off'],
        ['normal', 'slice'],
        ['projection', 'proj']
      ];
      const active = sliceState.layerModes[layer] || 'none';
      return '<div class="slice-mode-row">' + modes.map(([mode, label]) =>
        `<button class="slice-mode-btn ${active === mode ? 'active' : ''}" data-slice-layer="${layer}" data-slice-layer-mode="${mode}" type="button">${label}</button>`
      ).join('') + '</div>';
    }
    function sliceLayerToggleButtons(layer) {
      const active = sliceState.layerModes[layer] || 'none';
      const modes = [
        ['none', 'off'],
        ['normal', 'on']
      ];
      return '<div class="slice-mode-row">' + modes.map(([mode, label]) =>
        `<button class="slice-mode-btn ${active === mode ? 'active' : ''}" data-slice-layer="${layer}" data-slice-layer-mode="${mode}" type="button">${label}</button>`
      ).join('') + '</div>';
    }
    function sliceLatticeModeButtons() {
      const modes = [
        ['weight', 'weight'],
        ['root', 'root'],
        ['none', 'hide']
      ];
      const active = sliceState.latticeMode || 'weight';
      return '<div class="slice-mode-row">' + modes.map(([mode, label]) =>
        `<button class="slice-mode-btn ${active === mode ? 'active' : ''}" data-slice-lattice-mode="${mode}" type="button">${label}</button>`
      ).join('') + '</div>';
    }
    function lieRootCountFormula(type, rank) {
      switch (type) {
        case 'A': return rank * (rank + 1);
        case 'B': return 2 * rank * rank;
        case 'C': return 2 * rank * rank;
        case 'D': return 2 * rank * (rank - 1);
        case 'E6': return 72;
        case 'E7': return 126;
        case 'E8': return 240;
        case 'F4': return 48;
        case 'G2': return 12;
        default: return null;
      }
    }
    function lieCoxeterNumber(type, rank) {
      switch (type) {
        case 'A': return rank + 1;
        case 'B': return 2 * rank;
        case 'C': return 2 * rank;
        case 'D': return 2 * rank - 2;
        case 'E6': return 12;
        case 'E7': return 18;
        case 'E8': return 30;
        case 'F4': return 12;
        case 'G2': return 6;
        default: return null;
      }
    }
    function lieWeylGroupOrder(type, rank) {
      switch (type) {
        case 'A': return factorialBI(rank + 1).toString();
        case 'B':
        case 'C': return (powBI(2, rank) * factorialBI(rank)).toString();
        case 'D': return (powBI(2, rank - 1) * factorialBI(rank)).toString();
        case 'E6': return '51840';
        case 'E7': return '2903040';
        case 'E8': return '696729600';
        case 'F4': return '1152';
        case 'G2': return '12';
        default: return 'not available';
      }
    }
    function lieCenterQuotient(type, rank) {
      switch (type) {
        case 'A': return `Z/${rank + 1}Z`;
        case 'B':
        case 'C':
        case 'E7': return 'Z/2Z';
        case 'D': return rank % 2 === 0 ? 'Z/2Z × Z/2Z' : 'Z/4Z';
        case 'E6': return 'Z/3Z';
        case 'E8':
        case 'F4':
        case 'G2': return 'trivial';
        default: return 'not available';
      }
    }
    function centerCardinalityFromQuotient(quotient) {
      const matches = String(quotient).match(/Z\/(\d+)Z/g);
      if (!matches) return quotient === 'trivial' ? 1 : 'not available';
      return matches.reduce((prod, part) => prod * Number(part.match(/\d+/)[0]), 1);
    }
    function invariantTooltipLabel(symbol, tooltip) {
      return `<span class="tooltip-label" tabindex="0" data-tooltip="${tooltip}">${symbol}</span>`;
    }
    function sliceLieInvariantHTML() {
      const type = currentType(), rank = currentRank();
      const rootCount = lieRootCountFormula(type, rank);
      const center = lieCenterQuotient(type, rank);
      const rows = [
        [invariantTooltipLabel('|S|', '|S|: the rank, equivalently the number of simple roots.'), rank],
        [invariantTooltipLabel('|R|', '|R|: the number of roots.'), rootCount ?? 'not available'],
        [invariantTooltipLabel('P/Q', 'P/Q: the quotient of the weight lattice P by the root lattice Q, i.e. the center of the simply connected group.'), center],
        [invariantTooltipLabel('|P/Q|', '|P/Q|: the cardinality of the lattice quotient P/Q.'), centerCardinalityFromQuotient(center)],
        [invariantTooltipLabel('|W|', '|W|: the order of the Weyl group.'), lieWeylGroupOrder(type, rank)],
        [invariantTooltipLabel('h', 'h: the Coxeter number.'), lieCoxeterNumber(type, rank) ?? 'not available']
      ];
      const body = sliceState.lieInfoCollapsed
        ? ''
        : `<dl class="slice-invariant-list">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
      const icon = sliceState.lieInfoCollapsed ? '▸' : '▾';
      const title = sliceState.lieInfoCollapsed ? 'show invariants' : 'hide invariants';
      return `
        <div class="slice-invariant-head">
          <button class="slice-invariant-toggle" data-slice-lie-info-toggle="1" type="button" title="${title}" aria-label="${title}">${icon}</button>
        </div>
        ${body}
      `;
    }
    function computeSliceWeylWalls(data, C) {
      if (!data || !data.lambdaLabels || !data.muLabels) return [];
      const walls = [];
      const byAngle = new Map();
      const eps = 1e-9;
      for (const coroot of positiveRoots(transpose(C))) {
        const a = dot(coroot, data.lambdaLabels);
        const b = dot(coroot, data.muLabels);
        if (Math.abs(a) < eps && Math.abs(b) < eps) continue;
        let angle = Math.atan2(-a, b);
        while (angle < 0) angle += Math.PI;
        while (angle >= Math.PI) angle -= Math.PI;
        const angleKey = String(Math.round(angle * 1e6));
        const existing = byAngle.get(angleKey);
        if (existing) {
          existing.multiplicity += 1;
          continue;
        }
        const wall = { a, b, angle, multiplicity: 1 };
        byAngle.set(angleKey, wall);
        walls.push(wall);
      }
      walls.sort((p, q) => p.angle - q.angle);
      return walls;
    }
    function sliceWeylChamberNote(C) {
      if (!sliceState.lastData) return '';
      const walls = computeSliceWeylWalls(sliceState.lastData, C);
      const text = `${walls.length ? 2 * walls.length : 1} sectors in the slice`;
      return `<span class="slice-layer-note">${text}</span>`;
    }
    function renderSliceLayerCard() {
      const out = $('slice-layer-controls');
      if (!out) return;
      let chamberNote = '';
      try {
        const type = currentType(), rank = currentRank();
        const C = cartanMatrix(type, rank);
        chamberNote = sliceWeylChamberNote(C);
      } catch (_) {}
      const rows = [
        ['invariants', sliceLieInvariantHTML()],
        ['lattice', sliceLatticeModeButtons()],
        ['Weyl chambers', sliceLayerToggleButtons('weylChambers') + chamberNote],
        ['fundamental weights', sliceLayerModeButtons('fundamental')],
        ['simple roots', sliceLayerModeButtons('simpleRoots')],
        ['roots', sliceLayerModeButtons('roots')],
        ['positive roots', sliceLayerModeButtons('positiveRoots')]
      ];
      out.innerHTML = rows.map(([a, b]) =>
        `<div class="slice-info-row"><span class="slice-info-label">${a}</span><span class="slice-info-value">${b}</span></div>`
      ).join('');
    }
    function solveIntegralSliceBasisCoords(labels, basis) {
      if (!basis || basis.length < 2) return null;
      const b1 = basis[0].labels, b2 = basis[1].labels;
      for (let r = 0; r < labels.length; r++) {
        for (let s = r + 1; s < labels.length; s++) {
          const det = b1[r] * b2[s] - b1[s] * b2[r];
          if (!det) continue;
          const anum = labels[r] * b2[s] - labels[s] * b2[r];
          const bnum = b1[r] * labels[s] - b1[s] * labels[r];
          if (anum % det || bnum % det) continue;
          const a = anum / det, b = bnum / det;
          const ok = labels.every((x, i) => x === a * b1[i] + b * b2[i]);
          if (ok) return [a, b];
        }
      }
      return null;
    }

    // ── Card update ───────────────────────────────────────

    function updateSliceCard(options = {}) {
      const cardBody = $('slice-card-body');
      if (!cardBody) return;
      // only update when card is open (unless forced)
      const card = cardBody.closest('.card');
      if (!options.force && card && card.classList.contains('collapsed')) return;

      const lambda = trimPartition(state.lambda.rows);
      const mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      const lambdaLabels = diagramToDynkinLabels(lambda, rank);
      const muLabels = diagramToDynkinLabels(mu, rank);
      const latticeInfo = computeSliceLatticeInfo(lambdaLabels, muLabels, C);

      const inner = makeDynkinInnerProduct(C);
      const ll = inner(lambdaLabels, lambdaLabels);
      const mm = inner(muLabels, muLabels);
      const lm = inner(lambdaLabels, muLabels);
      const lenL = Math.sqrt(Math.max(0, ll));
      const lenM = Math.sqrt(Math.max(0, mm));

      let cosAngle = null, angleDeg = null, is2D = false;
      if (lenL > 1e-7 && lenM > 1e-7) {
        cosAngle = Math.max(-1, Math.min(1, lm / (lenL * lenM)));
        angleDeg = Math.acos(cosAngle) * 180 / Math.PI;
        is2D = (1 - cosAngle * cosAngle) > 1e-6;
      }

      // Render info rows
      const rows = [];
      rows.push(['λ Dynkin', `<code>${formatDynkinVector(lambdaLabels)}</code>`]);
      rows.push(['μ Dynkin', `<code>${formatDynkinVector(muLabels)}</code>`]);
      rows.push(['‖λ‖', lenL < 1e-7 ? '0 (zero weight)' : lenL.toFixed(5)]);
      rows.push(['‖μ‖', lenM < 1e-7 ? '0 (zero weight)' : lenM.toFixed(5)]);
      rows.push(['⟨λ, μ⟩', lm.toFixed(6)]);
      if (cosAngle !== null) {
        rows.push(['cos θ', cosAngle.toFixed(6)]);
        rows.push(['angle θ', angleDeg.toFixed(3) + '°']);
        rows.push(['span', is2D ? '2-dimensional ✓' : 'collinear (1-dimensional)']);
      } else {
        rows.push(['span', 'one or both weights are zero']);
      }

      if (is2D) {
        rows.push(['primitive', latticeInfo.saturated ? 'yes' : 'no']);
        rows.push(['basis', latticeBasisHTML(latticeInfo)]);
      }

      $('slice-stats-out').innerHTML = rows.map(([a,b]) =>
        `<div class="slice-info-row"><span class="slice-info-label">${a}</span><span class="slice-info-value">${b}</span></div>`
      ).join('');

      const btn = $('open-slice-btn');
      if (is2D) {
        btn.disabled = false;
        updateSliceButtonLabel();
        if (sliceState.visible) renderSliceLayerCard();
        $('slice-card-hint').textContent = sliceState.visible
          ? 'The 2d slice canvas is shown. Click the button again to hide it.'
          : 'λ and μ span a 2-dimensional subspace. Click the button to draw the weight slice.';
      } else {
        hideSlice();
        btn.disabled = true;
        $('slice-card-hint').textContent = 'λ and μ must be linearly independent weights to enable the 2d slice canvas.';
      }
    }

    // ── Slice canvas drawing ──────────────────────────────

    function computeSliceData() {
      const lambda = trimPartition(state.lambda.rows);
      const mu = trimPartition(state.mu.rows);
      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      const lambdaLabels = diagramToDynkinLabels(lambda, rank);
      const muLabels = diagramToDynkinLabels(mu, rank);
      const latticeInfo = computeSliceLatticeInfo(lambdaLabels, muLabels, C);

      const proj = computePlaneProjectors(lambdaLabels, muLabels, type, rank);
      if (!proj || !proj.is2D) return null;

      // Lightweight anchor points used only for canvas framing.
      const weights = [
        { uv: [0, 0] },
        { uv: [1, 0] },
        { uv: [0, 1] }
      ];

      // Label for plane
      const angleDeg = (proj.angle * 180 / Math.PI).toFixed(1);
      const lenRatio = (Math.sqrt(proj.mm) / Math.sqrt(proj.ll)).toFixed(4);

      return { proj, weights, latticeInfo, angleDeg, lenRatio, lambdaLabels, muLabels };
    }

    function drawSliceCanvas(data) {
      if (!data) return;
      const canvas = sliceState.sliceCanvas;
      const ctx = sliceState.sliceCtx;
      if (!canvas || !ctx) return;

      const W = sliceState.displayWidth || canvas.clientWidth || canvas.width;
      const H = sliceState.displayHeight || canvas.clientHeight || canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fbfaf7';
      ctx.fillRect(0, 0, W, H);

      const { proj, weights, latticeInfo, angleDeg, lenRatio } = data;
      if (!weights.length) return;

      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      const inner = makeDynkinInnerProduct(C);

      function vectorSliceGS(labels, requireInPlane) {
        const u = inner(labels, proj.e1) / (proj.e1norm2 || 1);
        const v = proj.e2norm2 > 1e-12 ? inner(labels, proj.e2) / proj.e2norm2 : 0;
        if (requireInPlane) {
          const residual = labels.map((x, i) => x - u * proj.e1[i] - v * proj.e2[i]);
          const err2 = inner(residual, residual);
          const norm2 = Math.max(1e-12, Math.abs(inner(labels, labels)));
          if (err2 > 1e-7 * norm2) return null;
        }
        return [u, v];
      }

      function buildSliceLayerPoints() {
        const points = [];
        const byKey = new Map();
        const snapCoord = (x) => Math.round(x * 1e5);
        const addPoint = (kind, mode, labels, label, index = 0) => {
          if (mode === 'none') return;
          const uv = vectorSliceGS(labels, mode === 'normal');
          if (!uv) return;
          const latticeCoords = mode === 'normal' ? solveIntegralSliceBasisCoords(labels, latticeInfo.basis) : null;
          const coordKey = latticeCoords
            ? `lattice:${latticeCoords[0]},${latticeCoords[1]}`
            : `proj:${snapCoord(uv[0])},${snapCoord(uv[1])}`;
          const k = `${kind}|${mode}|${coordKey}`;
          const existing = byKey.get(k);
          if (existing) {
            existing.multiplicity = (existing.multiplicity || 1) + 1;
            if (label && existing.label && !existing.label.split(',').includes(label)) existing.label += ',' + label;
            return;
          }
          const point = { kind, mode, labels, label, index, uv, multiplicity: 1 };
          byKey.set(k, point);
          points.push(point);
        };

        const fundamentalMode = sliceState.layerModes.fundamental || 'none';
        if (fundamentalMode !== 'none') {
          for (let i = 0; i < rank; i++) {
            const labels = Array(rank).fill(0);
            labels[i] = 1;
            addPoint('fundamental', fundamentalMode, labels, `ω${i + 1}`, i);
          }
        }

        const simpleMode = sliceState.layerModes.simpleRoots || 'none';
        if (simpleMode !== 'none') {
          for (let i = 0; i < rank; i++) {
            const simple = Array(rank).fill(0);
            simple[i] = 1;
            addPoint('simpleRoots', simpleMode, simpleToDynkin(simple, C), '\u03b1' + (i + 1), i);
          }
        }

        const positiveMode = sliceState.layerModes.positiveRoots || 'none';
        const allRootsMode = sliceState.layerModes.roots || 'none';
        if (positiveMode !== 'none' || allRootsMode !== 'none') {
          const positive = positiveRoots(C).map(root => simpleToDynkin(root, C));
          if (allRootsMode !== 'none') {
            for (const labels of positive) {
              addPoint('roots', allRootsMode, labels, '', 0);
              addPoint('roots', allRootsMode, scale(labels, -1), '', 0);
            }
          }
          if (positiveMode !== 'none') {
            for (const labels of positive) addPoint('positiveRoots', positiveMode, labels, '', 0);
          }
        }
        return points;
      }

      const sliceLayerPoints = buildSliceLayerPoints();
      const sliceWeylWalls = (sliceState.layerModes.weylChambers || 'none') !== 'none'
        ? computeSliceWeylWalls(data, C)
        : [];

      // ── Coordinate system ──────────────────────────────────────────────────
      //
      // We draw in a 2D canvas plane where:
      //   • e1 (= λ direction) points to the RIGHT  (canvas angle = 0)
      //   • e2 (= μ direction) is at the ACTUAL angle θ = ⟨λ,μ⟩ measured
      //     counter-clockwise from e1  (canvas y-axis points DOWN, so we negate)
      //
      // Every weight w has plane coordinates (u, v) where
      //   w = u·λ + v·μ   (in the {λ,μ} basis, NOT the Gram-Schmidt basis).
      //
      // Canvas pixel position of (u, v):
      //   px =  u * pxL  +  v * pxM * cos(θ)
      //   py = -v * pxM * sin(θ)          (minus: canvas y down, math y up)
      //
      // where pxL = pixel length of λ, pxM = pixel length of μ.
      //
      // We choose pxL = W / 6 so λ is always ~1/6 of canvas width.
      // pxM = pxL * (‖μ‖/‖λ‖) to preserve the true length ratio.

      const theta = proj.angle;          // angle between λ and μ, in (0, π)
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);      // always > 0 for θ ∈ (0,π)

      const pxL = W / 6;                // pixel length of λ
      const lenL = Math.sqrt(proj.ll);
      const lenM = Math.sqrt(proj.mm);
      const pxM = (lenL > 1e-12) ? pxL * (lenM / lenL) : pxL;

      // Convert (u, v) plane coords → canvas pixel offset from origin
      function toPixelOffset(u, v) {
        return [
           u * pxL + v * pxM * cosT,
          -v * pxM * sinT             // canvas y flipped
        ];
      }

      // Plane coordinates of λ and μ in the {λ,μ} basis
      const lambdaUV = [1, 0];
      const muUV     = [0, 1];

      // The weights stored in data.weights have .uv = [u_e1, v_e2] in the
      // GRAM-SCHMIDT basis {e1, e2_perp}.  We need to convert them to the
      // {λ, μ} basis to use toPixelOffset correctly.
      //
      // Recall:  e1 = λ,  e2 = μ - (lm/ll)·λ
      // So:  w = u_e1·e1 + v_e2·e2
      //        = u_e1·λ  + v_e2·(μ - (lm/ll)·λ)
      //        = (u_e1 - v_e2·lm/ll)·λ + v_e2·μ
      //
      // Hence in {λ,μ} basis:  u = u_e1 - v_e2*(lm/ll),  v = v_e2
      const lmOverLL = proj.ll > 1e-14 ? proj.lm / proj.ll : 0;

      function gsToLM(uv_gs) {
        const [u_gs, v_gs] = uv_gs;
        return [u_gs - v_gs * lmOverLL, v_gs];
      }

      // Canvas pixel position (with origin at canvas center)
      const ox = W / 2, oy = H / 2;
      function canvasXY_lm(u, v) {
        const [dx, dy] = toPixelOffset(u, v);
        return [ox + dx, oy + dy];
      }
      function canvasXY(uv_gs) {
        const [u, v] = gsToLM(uv_gs);
        return canvasXY_lm(u, v);
      }

      // Bounding box of the lambda/mu anchor triangle + origin.
      let minPX = 0, maxPX = 0, minPY = 0, maxPY = 0;
      for (const w of weights) {
        const [u, v] = gsToLM(w.uv);
        const [dx, dy] = toPixelOffset(u, v);
        minPX = Math.min(minPX, dx); maxPX = Math.max(maxPX, dx);
        minPY = Math.min(minPY, dy); maxPY = Math.max(maxPY, dy);
      }
      for (const p of sliceLayerPoints) {
        const [u, v] = gsToLM(p.uv);
        const [dx, dy] = toPixelOffset(u, v);
        minPX = Math.min(minPX, dx); maxPX = Math.max(maxPX, dx);
        minPY = Math.min(minPY, dy); maxPY = Math.max(maxPY, dy);
      }

      // If the anchor triangle overflows canvas, scale down uniformly.
      const pad = 40;
      const scaleX = (maxPX - minPX > 1e-3) ? (W - 2*pad) / (maxPX - minPX) : 1;
      const scaleY = (maxPY - minPY > 1e-3) ? (H - 2*pad) / (maxPY - minPY) : 1;
      const globalScale = Math.min(1, scaleX, scaleY);

      function canvasXYscaled(uv_gs) {
        const [u, v] = gsToLM(uv_gs);
        const [dx, dy] = toPixelOffset(u, v);
        return applySliceView(ox + dx * globalScale, oy + dy * globalScale);
      }
      function canvasXY_lm_scaled(u, v) {
        const [dx, dy] = toPixelOffset(u, v);
        return applySliceView(ox + dx * globalScale, oy + dy * globalScale);
      }
      function applySliceView(x, y) {
        const view = sliceState.view || {};
        const zoom = Number.isFinite(view.zoom) ? view.zoom : 1;
        const panX = Number.isFinite(view.panX) ? view.panX : 0;
        const panY = Number.isFinite(view.panY) ? view.panY : 0;
        return [
          ox + (x - ox) * zoom + panX,
          oy + (y - oy) * zoom + panY
        ];
      }
      const [viewOx, viewOy] = canvasXY_lm_scaled(0, 0);

      function drawWeylChambers() {
        if (!sliceWeylWalls.length) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(70,84,116,0.34)';
        ctx.lineWidth = 1;
        ctx.setLineDash([9, 5]);
        for (const wall of sliceWeylWalls) {
          const du = wall.b;
          const dv = -wall.a;
          const [pdx, pdy] = toPixelOffset(du, dv);
          const pixelLen = Math.hypot(pdx * globalScale * (sliceState.view?.zoom || 1), pdy * globalScale * (sliceState.view?.zoom || 1));
          if (pixelLen < 1e-8) continue;
          const t = (Math.hypot(W, H) * 0.65 + 24) / pixelLen;
          const [x1, y1] = canvasXY_lm_scaled(-t * du, -t * dv);
          const [x2, y2] = canvasXY_lm_scaled( t * du,  t * dv);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(viewOx, viewOy, 5.5, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(70,84,116,0.45)';
        ctx.stroke();
        ctx.restore();
      }

      // ── Grid ──────────────────────────────────────────────────────────────
      // Draw parallelogram grid lines in the {λ,μ} basis.
      // Integer range of u_lm and v_lm across the anchor triangle.
      const uLM = weights.map(w => gsToLM(w.uv)[0]);
      const vLM = weights.map(w => gsToLM(w.uv)[1]);
      const uMin = Math.floor(Math.min(0, ...uLM)) - 1;
      const uMax = Math.ceil (Math.max(0, ...uLM)) + 1;
      const vMin = Math.floor(Math.min(0, ...vLM)) - 1;
      const vMax = Math.ceil (Math.max(0, ...vLM)) + 1;

      if (false) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,170,150,0.3)';
      ctx.lineWidth = 0.8;
      // Lines parallel to μ (constant u)
      for (let u = uMin; u <= uMax; u++) {
        const [x1, y1] = canvasXY_lm_scaled(u, vMin - 1);
        const [x2, y2] = canvasXY_lm_scaled(u, vMax + 1);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // Lines parallel to λ (constant v)
      for (let v = vMin; v <= vMax; v++) {
        const [x1, y1] = canvasXY_lm_scaled(uMin - 1, v);
        const [x2, y2] = canvasXY_lm_scaled(uMax + 1, v);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();
      }

      // ── Axes (through origin) ──────────────────────────────────────────────
      if (false) {
      ctx.save();
      ctx.lineWidth = 1.2;
      // λ axis (horizontal)
      ctx.strokeStyle = 'rgba(61,107,79,0.5)';
      ctx.beginPath();
      ctx.moveTo(...canvasXY_lm_scaled(uMin - 0.5, 0));
      ctx.lineTo(...canvasXY_lm_scaled(uMax + 0.5, 0));
      ctx.stroke();
      // μ axis
      ctx.strokeStyle = 'rgba(163,64,32,0.5)';
      ctx.beginPath();
      ctx.moveTo(...canvasXY_lm_scaled(0, vMin - 0.5));
      ctx.lineTo(...canvasXY_lm_scaled(0, vMax + 0.5));
      ctx.stroke();
      ctx.restore();
      }

      drawWeylChambers();

      // ── Weight dots ───────────────────────────────────────────────────────
      const overlayEntryByKey = new Map();
      const activeCharacterIsProjection = sliceState.activeCharacter?.positionMode === 'projection';
      if (!activeCharacterIsProjection && sliceState.characterMode !== 'none' && sliceState.activeCharacter && Array.isArray(sliceState.activeCharacter.entries)) {
        for (const entry of sliceState.activeCharacter.entries) overlayEntryByKey.set(key(entry.labels), entry);
      }
      const originLabelKey = Array(rank).fill(0).join(',');
      sliceState.hitPoints = [];
      let weightB1uv = null, weightB2uv = null;
      if (latticeInfo && latticeInfo.basis && latticeInfo.basis.length >= 2) {
        const wb1 = latticeInfo.basis[0], wb2 = latticeInfo.basis[1];
        weightB1uv = [wb1.coords[0] / wb1.denom, wb1.coords[1] / wb1.denom];
        weightB2uv = [wb2.coords[0] / wb2.denom, wb2.coords[1] / wb2.denom];
      }
      const latticeMode = sliceState.latticeMode || 'weight';
      const pointLatticeInfo = latticeMode === 'root' ? latticeInfo?.root : latticeMode === 'weight' ? latticeInfo : null;
      if (pointLatticeInfo && pointLatticeInfo.basis && pointLatticeInfo.basis.length >= 2) {
        const b1 = pointLatticeInfo.basis[0], b2 = pointLatticeInfo.basis[1];
        const b1uv = [b1.coords[0] / b1.denom, b1.coords[1] / b1.denom];
        const b2uv = [b2.coords[0] / b2.denom, b2.coords[1] / b2.denom];
        const b1px = toPixelOffset(b1uv[0], b1uv[1]);
        const b2px = toPixelOffset(b2uv[0], b2uv[1]);
        const viewZoom = sliceState.view?.zoom || 1;
        const minStep = Math.max(4, Math.min(Math.hypot(...b1px), Math.hypot(...b2px)) * globalScale * viewZoom);
        const radius = Math.min(48, Math.ceil(Math.max(W, H) / minStep) + 3);
        const verticalRadius = 20;
        const seenPoints = new Set();
        for (let i = -radius; i <= radius; i++) {
          for (let j = -verticalRadius; j <= verticalRadius; j++) {
            const u = i * b1uv[0] + j * b2uv[0];
            const v = i * b1uv[1] + j * b2uv[1];
            const [x, y] = canvasXY_lm_scaled(u, v);
            if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
            const labels = b1.labels.map((a, k) => i * a + j * b2.labels[k]);
            const key = labels.join(',');
            if (seenPoints.has(key)) continue;
            seenPoints.add(key);
            sliceState.hitPoints.push({
              i, j, u, v, x, y, labels, key, latticeMode
            });
          }
        }
        for (const p of sliceState.hitPoints) {
          const selected = sliceState.selectedPoint &&
            sliceState.selectedPoint.key === p.key;
          const overlayEntry = overlayEntryByKey.get(p.key);
          if (overlayEntry) continue;
          const isOrigin = p.labels.every(x => x === 0);
          ctx.beginPath();
          ctx.arc(p.x, p.y, selected ? 4.8 : isOrigin ? 3.8 : 2.1, 0, 2*Math.PI);
          const latticeFill = latticeMode === 'root' ? 'rgba(47,125,112,0.38)' : 'rgba(80,76,68,0.34)';
          ctx.fillStyle = selected ? '#5f6f8f' : isOrigin ? '#222' : latticeFill;
          ctx.fill();
          if (selected) {
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      function drawSliceLayerPoints() {
        if (!sliceLayerPoints.length) return;
        const ordered = sliceLayerPoints.slice().sort((a, b) => {
          const order = { roots: 0, positiveRoots: 1, simpleRoots: 2, fundamental: 3 };
          return (order[a.kind] || 0) - (order[b.kind] || 0);
        });
        const styles = {
          fundamental: { stroke: '#5a58a8', fill: 'rgba(90,88,168,0.78)' },
          simpleRoots: { stroke: '#8a5a24', fill: 'rgba(190,128,52,0.72)' },
          roots: { stroke: '#7d5061', fill: 'rgba(125,80,97,0.58)' },
          positiveRoots: { stroke: '#2f7d70', fill: 'rgba(47,125,112,0.62)' }
        };
        const labelBoxes = [];
        function overlapsLabelBox(box) {
          return labelBoxes.some(other =>
            box.x < other.x + other.w &&
            box.x + box.w > other.x &&
            box.y < other.y + other.h &&
            box.y + box.h > other.y
          );
        }
        function drawLayerLabel(text, x, y, color, font = '12px JetBrains Mono, monospace') {
          if (!text) return;
          ctx.save();
          ctx.font = font;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          const w = ctx.measureText(text).width;
          const h = font.startsWith('10px') ? 12 : 14;
          const candidates = [
            [7, -7],
            [7, 17],
            [-w - 7, -7],
            [-w - 7, 17],
            [-w / 2, -16],
            [-w / 2, 27],
            [12, 4],
            [-w - 12, 4]
          ];
          let chosen = candidates[0];
          for (const cand of candidates) {
            const box = { x: x + cand[0] - 2, y: y + cand[1] - h + 2, w: w + 4, h };
            if (!overlapsLabelBox(box)) { chosen = cand; break; }
          }
          const box = { x: x + chosen[0] - 2, y: y + chosen[1] - h + 2, w: w + 4, h };
          labelBoxes.push(box);
          ctx.fillStyle = 'rgba(251,250,247,0.82)';
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.fillStyle = color;
          ctx.fillText(text, x + chosen[0], y + chosen[1]);
          ctx.restore();
        }
        for (const p of ordered) {
          const [u, v] = gsToLM(p.uv);
          const [x, y] = canvasXY_lm_scaled(u, v);
          if (x < -16 || x > W + 16 || y < -16 || y > H + 16) continue;
          const style = styles[p.kind] || styles.roots;
          const projection = p.mode === 'projection';
          ctx.save();
          ctx.strokeStyle = style.stroke;
          ctx.fillStyle = projection ? 'rgba(251,250,247,0.82)' : style.fill;
          ctx.lineWidth = projection ? 1.4 : 1.1;
          if (projection && (p.kind === 'fundamental' || p.kind === 'simpleRoots')) {
            ctx.setLineDash([3, 4]);
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(viewOx, viewOy);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
          }
          if (p.kind === 'fundamental') {
            ctx.beginPath();
            ctx.arc(x, y, 5.2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.font = '12px JetBrains Mono, monospace';
            ctx.fillStyle = style.stroke;
            drawLayerLabel('\u03c9' + (p.index + 1), x, y, style.stroke);
          } else if (p.kind === 'simpleRoots') {
            const r = 4.8;
            ctx.beginPath();
            ctx.rect(x - r, y - r, 2 * r, 2 * r);
            ctx.fill();
            ctx.stroke();
            ctx.font = '12px JetBrains Mono, monospace';
            ctx.fillStyle = style.stroke;
            drawLayerLabel(p.label || ('\u03b1' + (p.index + 1)), x, y, style.stroke);
          } else if (p.kind === 'positiveRoots') {
            const r = 4.8;
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r * 0.9, y + r * 0.65);
            ctx.lineTo(x - r * 0.9, y + r * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            const r = 4.0;
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r, y);
            ctx.lineTo(x, y + r);
            ctx.lineTo(x - r, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          if (p.mode === 'projection' && (p.kind === 'roots' || p.kind === 'positiveRoots') && p.multiplicity > 1) {
            drawLayerLabel(`×${p.multiplicity}`, x, y, style.stroke, '10px JetBrains Mono, monospace');
          }
          ctx.restore();
        }
      }
      drawSliceLayerPoints();

      function sliceDimensionDotRadius(value) {
        const dim = Math.abs(value);
        if (dim <= 1) return 2.2;
        if (dim === 2) return 3.8;
        if (dim === 3) return 5.0;
        if (dim === 4) return 6.0;
        return 7.0;
      }

      function drawSliceDimensionOverlay() {
        if (sliceState.characterMode === 'none' || !sliceState.activeCharacter) return;
        const entries = sliceState.activeCharacter.entries || [];
        for (const e of entries) {
          let u, v;
          if (e.positionMode === 'projection') {
            u = e.u;
            v = e.v;
          } else {
            if (!weightB1uv || !weightB2uv) return;
            u = e.a * weightB1uv[0] + e.b * weightB2uv[0];
            v = e.a * weightB1uv[1] + e.b * weightB2uv[1];
          }
          const [x, y] = canvasXY_lm_scaled(u, v);
          if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;
          const positive = e.value >= 0;
          const selected = !!(sliceState.selectedPoint && (
            e.positionMode === 'projection'
              ? e.sourceKeys?.includes(sliceState.selectedPoint.key)
              : sliceState.selectedPoint.key === key(e.labels)
          ));
          if (sliceState.characterMode === 'numbers') {
            ctx.save();
            ctx.font = '11px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const text = String(e.value);
            const textWidth = ctx.measureText(text).width;
            const r = Math.max(8.5, textWidth / 2 + 5.8);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2*Math.PI);
            ctx.fillStyle = positive ? 'rgba(223,238,249,0.94)' : 'rgba(250,229,213,0.94)';
            ctx.fill();
            ctx.strokeStyle = selected ? '#111' : (positive ? '#1f5f9c' : '#b45a1c');
            ctx.lineWidth = selected ? 1.4 : 1.0;
            ctx.stroke();
            ctx.fillStyle = '#111';
            ctx.fillText(text, x, y + 0.4);
            ctx.restore();
          } else {
            const r = sliceDimensionDotRadius(e.value);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2*Math.PI);
            ctx.fillStyle = positive ? 'rgba(42,109,169,0.38)' : 'rgba(199,106,36,0.44)';
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = selected ? 1.5 : 1.0;
            ctx.stroke();
          }
        }
      }

      // ── Arrows for λ and μ ─────────────────────────────────────────────────
      function drawArrow(u_lm, v_lm, color, lbl) {
        const [tx, ty] = canvasXY_lm_scaled(u_lm, v_lm);
        const dx = tx - viewOx, dy = ty - viewOy;
        const len = Math.hypot(dx, dy);
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(viewOx, viewOy); ctx.lineTo(tx, ty); ctx.stroke();
        if (len > 6) {
          const ux = dx/len, uy = dy/len, as = 10;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - as*(ux - 0.4*uy), ty - as*(uy + 0.4*ux));
          ctx.lineTo(tx - as*(ux + 0.4*uy), ty - as*(uy - 0.4*ux));
          ctx.closePath(); ctx.fill();
        }
        ctx.font = 'italic 14px serif';
        ctx.fillText(lbl, tx + 7, ty - 5);
        ctx.restore();
      }
      drawArrow(1, 0, '#3d6b4f', 'λ');
      drawArrow(0, 1, '#a34020', 'μ');

      function drawBasisArrow(basisVector, color, lbl) {
        const u = basisVector.coords[0] / basisVector.denom;
        const v = basisVector.coords[1] / basisVector.denom;
        const [tx, ty] = canvasXY_lm_scaled(u, v);
        const dx = tx - viewOx, dy = ty - viewOy;
        const len = Math.hypot(dx, dy);
        if (len < 6) return;
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(viewOx, viewOy); ctx.lineTo(tx, ty); ctx.stroke();
        const ux = dx/len, uy = dy/len, as = 8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - as*(ux - 0.4*uy), ty - as*(uy + 0.4*ux));
        ctx.lineTo(tx - as*(ux + 0.4*uy), ty - as*(uy - 0.4*ux));
        ctx.closePath(); ctx.fill();
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.fillText(lbl, tx + 7, ty + 12);
        ctx.restore();
      }
      if (latticeInfo && !latticeInfo.saturated && latticeInfo.basis) {
        const displayBasis = latticeInfo.displayBasis || latticeInfo.basis;
        drawBasisArrow(displayBasis[0], '#5f6f8f', 'v1');
        drawBasisArrow(displayBasis[1], '#5f6f8f', 'v2');
      }

      function drawManualGammaProjection() {
        const point = sliceState.infoPoint;
        if (!point || !point.manual || !Array.isArray(point.labels)) return;
        const [u, v] = projectDynkinToSliceLM(point.labels, data, C);
        const [x, y] = canvasXY_lm_scaled(u, v);
        if (x < -18 || x > W + 18 || y < -18 || y > H + 18) return;
        ctx.save();
        ctx.strokeStyle = '#7b2e5d';
        ctx.fillStyle = 'rgba(123,46,93,0.14)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(viewOx, viewOy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
        ctx.font = 'italic 14px serif';
        ctx.fillStyle = '#7b2e5d';
        ctx.fillText('\u03b3', x + 9, y - 7);
        ctx.restore();
      }

      // Origin dot, then dimension overlay so a nonzero origin weight remains readable.
      const originPointVisible = sliceState.hitPoints.some(p => p.key === originLabelKey);
      if (latticeMode !== 'none' && !originPointVisible && !overlayEntryByKey.has(originLabelKey)) {
        ctx.beginPath(); ctx.arc(viewOx, viewOy, 4, 0, 2*Math.PI);
        ctx.fillStyle = '#222'; ctx.fill();
      }
      drawManualGammaProjection();
      drawSliceDimensionOverlay();

      // ── Angle arc between λ and μ arrows ──────────────────────────────────
      if (false) {
      {
        const [lx, ly] = canvasXY_lm_scaled(1, 0);
        const [mx, my] = canvasXY_lm_scaled(0, 1);
        const angleL = Math.atan2(ly - viewOy, lx - viewOx);   // should be 0 (rightward)
        const angleM = Math.atan2(my - viewOy, mx - viewOx);   // should be -theta (upward in canvas)
        const arcR = Math.min(28, Math.hypot(lx - viewOx, ly - viewOy) * 0.35);
        if (arcR > 8) {
          // Draw arc from λ direction to μ direction (counter-clockwise in math = clockwise on canvas)
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(100,80,60,0.55)';
          ctx.lineWidth = 1;
          // go from angleL to angleM in the short direction
          ctx.arc(viewOx, viewOy, arcR, angleL, angleM, sinT > 0);
          ctx.stroke();
          const midA = (angleL + angleM) / 2;
          ctx.font = '11px serif';
          ctx.fillStyle = '#888';
          ctx.fillText(`${angleDeg}°`, viewOx + (arcR + 8)*Math.cos(midA), viewOy + (arcR + 8)*Math.sin(midA));
        }
      }
      }

      // ── Legend ────────────────────────────────────────────────────────────
      const legend = $('slice-legend');
      if (legend) {
        legend.innerHTML = '';
        /*
        legend.innerHTML = [
          `<span><span class="slice-legend-dot" style="background:#3d6b4f;"></span> weights of V<sup>λ</sup> (${lCount})</span>`,
          `<span><span class="slice-legend-dot" style="background:#a34020;"></span> weights of V<sup>μ</sup> (${mCount})</span>`,
          `<span><span class="slice-legend-dot" style="background:#8b5e3c;"></span> in both (${bCount})</span>`,
          `<span style="color:var(--muted);">angle(λ,μ) = ${angleDeg}°&nbsp;&nbsp;‖μ‖/‖λ‖ = ${lenRatio}</span>`,
          `<span style="color:var(--muted);">numbers = multiplicity in V<sup>λ</sup> | V<sup>μ</sup></span>`
        ].filter(Boolean).join('');
        */
      }
      const planeLabel = $('slice-plane-label');
      if (planeLabel) {
        planeLabel.textContent = '';
      }
    }

    function sliceCardIsExpanded() {
      const body = $('slice-card-body');
      const card = body ? body.closest('.card') : null;
      return !!card && !card.classList.contains('collapsed');
    }

    function placeSliceCompanionCards() {
      const main = $('slice-card') || $('slice-card-body')?.closest('.card');
      const layer = $('slice-layer-card');
      const info = $('slice-weight-info-card');
      const parent = main?.parentElement;
      if (!main || !parent) return;
      let next = main.nextSibling;
      if (layer && layer !== main) {
        if (layer !== next) parent.insertBefore(layer, next);
        next = layer.nextSibling;
      }
      if (info && info !== main && info !== layer) {
        if (info !== next) parent.insertBefore(info, next);
      }
    }

    function updateSliceButtonLabel() {
      const btn = $('open-slice-btn');
      if (btn) btn.textContent = sliceState.visible ? 'hide 2d slice canvas' : 'show 2d slice canvas';
    }

    function setSliceFocusMode(active) {
      const panel = document.querySelector('.canvas-panel');
      if (panel) {
        panel.classList.toggle('slice-focus', !!active);
        panel.classList.toggle('show-diagrams', !!active && !!sliceState.showDiagramsInSlice);
      }
      const btn = $('slice-diagram-toggle');
      if (btn) {
        btn.textContent = sliceState.showDiagramsInSlice ? 'hide diagrams' : 'show diagrams';
        btn.setAttribute('aria-pressed', String(!!sliceState.showDiagramsInSlice));
      }
    }

    function showSliceWeightInfoCard(collapsed = true) {
      const card = $('slice-weight-info-card');
      if (!card) return;
      const wasHidden = card.style.display === 'none';
      if (wasHidden) placeSliceCompanionCards();
      card.style.display = '';
      setCardCollapsed(card, collapsed, false);
      renderSliceWeightInfo(sliceState.infoPoint, sliceState.activeCharacter, false);
    }

    function hideSliceWeightInfoCard() {
      const card = $('slice-weight-info-card');
      if (!card) return;
      setCardCollapsed(card, true, false);
      card.style.display = 'none';
      const out = $('slice-weight-info-out');
      if (out) out.innerHTML = '<span class="hint">Click a lattice point in the 2d slice canvas.</span>';
      sliceState.selectedPoint = null;
      sliceState.infoPoint = null;
      sliceState.activeCharacter = null;
    }

    function showSliceLayerCard(collapsed = false) {
      const card = $('slice-layer-card');
      if (!card) return;
      const wasHidden = card.style.display === 'none';
      if (wasHidden) placeSliceCompanionCards();
      card.style.display = '';
      if (wasHidden) setCardCollapsed(card, collapsed, false);
      renderSliceLayerCard();
    }

    function hideSliceLayerCard() {
      const card = $('slice-layer-card');
      if (!card) return;
      setCardCollapsed(card, true, false);
      card.style.display = 'none';
    }

    function cleanSliceDynkin(labels) {
      return labels.map(x => Math.abs(x) < SLICE_FREUDENTHAL_EPS ? 0 : Math.round(x));
    }

    function isDominantDynkinLoose(labels) {
      return !!labels && labels.every(x => Number.isInteger(x) && x >= -SLICE_FREUDENTHAL_EPS);
    }

    function dominantSliceRepresentative(C, labels) {
      let w = cleanSliceDynkin(labels);
      const seen = new Set();
      for (let steps = 0; steps < 400; steps++) {
        const k = key(w);
        if (seen.has(k)) return null;
        seen.add(k);
        const i = w.findIndex(x => x < -SLICE_FREUDENTHAL_EPS);
        if (i < 0) return cleanSliceDynkin(w);
        w = cleanSliceDynkin(reflectDynkin(w, i, C));
      }
      return null;
    }

    function buildSliceFreudenthalContext(highest, C) {
      const inner = makeDynkinInnerProduct(C);
      const rho = Array(C.length).fill(1);
      const rootsDynkin = positiveRoots(C).map(root => simpleToDynkin(root, C));
      return {
        C,
        highest: highest.slice(),
        highestKey: key(highest),
        highestNorm: inner(highest, highest),
        highestRhoNorm: inner(add(highest, rho), add(highest, rho)),
        rho,
        rootsDynkin,
        inner
      };
    }

    function isReachableFromSliceHighest(ctx, gammaDynRaw) {
      const gammaDyn = cleanSliceDynkin(gammaDynRaw);
      if (!isDominantDynkinLoose(gammaDyn)) return false;
      const diff = dynkinToSimple(sub(ctx.highest, gammaDyn), ctx.C);
      return isNonnegativeIntVector(diff);
    }

    function sliceMultiplicityFreudenthal(ctx) {
      const memo = new Map([[ctx.highestKey, 1]]);
      const visiting = new Set();

      function multiplicity(gammaDynRaw) {
        const gammaDyn = cleanSliceDynkin(gammaDynRaw);
        const k = key(gammaDyn);
        if (memo.has(k)) return memo.get(k);
        if (visiting.has(k)) return 0;
        if (!isReachableFromSliceHighest(ctx, gammaDyn)) {
          memo.set(k, 0);
          if (memo.size > MAX_FREUDENTHAL_WEIGHTS) throw new Error(`Slice Freudenthal recursion exceeded ${MAX_FREUDENTHAL_WEIGHTS} dominant orbit representatives; choose a smaller dominant weight or a smaller slice.`);
          return 0;
        }

        const gammaNorm = ctx.inner(gammaDyn, gammaDyn);
        if (gammaNorm > ctx.highestNorm + SLICE_FREUDENTHAL_EPS) {
          memo.set(k, 0);
          if (memo.size > MAX_FREUDENTHAL_WEIGHTS) throw new Error(`Slice Freudenthal recursion exceeded ${MAX_FREUDENTHAL_WEIGHTS} dominant orbit representatives; choose a smaller dominant weight or a smaller slice.`);
          return 0;
        }

        const gammaRho = add(gammaDyn, ctx.rho);
        const denom = ctx.highestRhoNorm - ctx.inner(gammaRho, gammaRho);
        if (denom <= SLICE_FREUDENTHAL_EPS) {
          memo.set(k, 0);
          if (memo.size > MAX_FREUDENTHAL_WEIGHTS) throw new Error(`Slice Freudenthal recursion exceeded ${MAX_FREUDENTHAL_WEIGHTS} dominant orbit representatives; choose a smaller dominant weight or a smaller slice.`);
          return 0;
        }

        visiting.add(k);
        let sum = 0;
        for (const alpha of ctx.rootsDynkin) {
          for (let step = 1; ; step++) {
            const beta = add(gammaDyn, scale(alpha, step));
            if (ctx.inner(beta, beta) > ctx.highestNorm + SLICE_FREUDENTHAL_EPS) break;
            if (step > 10000) throw new Error('Slice Freudenthal recursion did not reach the norm bound; choose a smaller dominant weight or a smaller slice.');
            const dom = dominantSliceRepresentative(ctx.C, beta);
            if (!dom) continue;
            const m = multiplicity(dom);
            if (!m) continue;
            sum += ctx.inner(beta, alpha) * m;
          }
        }
        visiting.delete(k);

        const raw = (2 * sum) / denom;
        const value = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
        memo.set(k, value);
        if (memo.size > MAX_FREUDENTHAL_WEIGHTS) throw new Error(`Slice Freudenthal recursion exceeded ${MAX_FREUDENTHAL_WEIGHTS} dominant orbit representatives; choose a smaller dominant weight or a smaller slice.`);
        return value;
      }

      multiplicity.memo = memo;
      return multiplicity;
    }

    function boundedSliceLatticePoints(highestLabels, basis, C, cap = MAX_SLICE_CHARACTER_CANDIDATES) {
      if (!basis || basis.length < 2) throw new Error('No integral 2d slice basis is available.');
      const inner = makeDynkinInnerProduct(C);
      const b1 = basis[0].labels;
      const b2 = basis[1].labels;
      const A = inner(b1, b1);
      const B = inner(b1, b2);
      const D = inner(b2, b2);
      const R2 = Math.max(0, inner(highestLabels, highestLabels));
      if (!(A > 1e-12) || !(D > 1e-12)) throw new Error('The slice basis is degenerate.');
      const perpD = D - (B * B) / A;
      if (!(perpD > 1e-10)) throw new Error('The slice basis vectors are numerically collinear.');

      const eps = 1e-8;
      const bMax = Math.floor(Math.sqrt((R2 + eps) / perpD));
      const points = [];
      const seen = new Set();
      let rectangularBox = 0;
      for (let b = -bMax; b <= bMax; b++) {
        const minForB = perpD * b * b;
        if (minForB > R2 + eps) continue;
        const centerA = -B * b / A;
        const aSpan = Math.sqrt(Math.max(0, (R2 - minForB + eps) / A));
        const aMin = Math.ceil(centerA - aSpan - eps);
        const aMax = Math.floor(centerA + aSpan + eps);
        rectangularBox += Math.max(0, aMax - aMin + 1);
        for (let a = aMin; a <= aMax; a++) {
          const labels = b1.map((x, i) => a * x + b * b2[i]);
          const q = inner(labels, labels);
          if (q > R2 + 1e-6) continue;
          const k = key(labels);
          if (seen.has(k)) continue;
          seen.add(k);
          points.push({ a, b, labels, normSquared: q });
          if (points.length > cap) {
            throw new Error(`The slice norm bound contains more than ${cap} lattice weights; choose a smaller dominant weight or a smaller slice.`);
          }
        }
      }
      points.sort((p, q) => (p.b - q.b) || (p.a - q.a));
      return { points, radius: Math.sqrt(R2), radiusSquared: R2, gram: { A, B, D }, rectangularBox };
    }

    function projectDynkinToSliceLM(labels, data, C) {
      const inner = makeDynkinInnerProduct(C);
      const proj = data.proj;
      const uGs = inner(labels, proj.e1) / (proj.e1norm2 || 1);
      const vGs = proj.e2norm2 > 1e-12 ? inner(labels, proj.e2) / proj.e2norm2 : 0;
      const lmOverLL = proj.ll > 1e-14 ? proj.lm / proj.ll : 0;
      return [uGs - vGs * lmOverLL, vGs];
    }

    function boundedProjectionWeightCandidates(highestLabels, C, cap = MAX_SLICE_PROJECTION_CANDIDATES) {
      const n = C.length;
      const B = simpleRootGram(C);
      const center = solveLinear(transpose(C), highestLabels);
      if (!center) throw new Error('Could not express the highest weight in simple-root coordinates.');
      const radiusSquared = quadraticForm(B, center) + 1e-8;
      const bounds = [];
      let boxSize = 1;
      let statusNote = '';
      for (let i = 0; i < n; i++) {
        const unit = Array(n).fill(0);
        unit[i] = 1;
        const invCol = solveLinear(B, unit);
        if (!invCol || !(invCol[i] > 0)) throw new Error('Could not bound the projection norm ball.');
        const span = Math.sqrt(radiusSquared * invCol[i]) + 1e-9;
        const lo = Math.max(0, Math.ceil(center[i] - span - 1e-9));
        const hi = Math.floor(center[i] + span + 1e-9);
        bounds.push([lo, hi]);
        boxSize *= Math.max(0, hi - lo + 1);
        if (boxSize > MAX_SLICE_PROJECTION_BOX_CANDIDATES) {
          throw new Error(`Projected dimension norm-bound box has ${boxSize} candidates before pruning; choose a smaller dominant weight.`);
        }
      }
      if (boxSize >= SLICE_PROJECTION_BOX_WARNING_CANDIDATES) {
        statusNote = `Projected dimension norm-bound box has ${boxSize.toLocaleString()} candidates before pruning; computation may be slow.`;
      }

      const points = [];
      function rec(i, delta) {
        if (i === n) {
          const simpleCoords = center.map((x, k) => x - delta[k]);
          const q = quadraticForm(B, simpleCoords);
          if (q > radiusSquared) return;
          const labels = sub(highestLabels, simpleToDynkin(delta, C));
          points.push({ labels, delta: delta.slice(), normSquared: q });
          if (points.length > cap) {
            throw new Error(`Projected dimension norm ball contains more than ${cap} candidate weights after pruning; choose a smaller dominant weight.`);
          }
          return;
        }
        const [lo, hi] = bounds[i];
        for (let x = lo; x <= hi; x++) {
          delta[i] = x;
          rec(i + 1, delta);
        }
        delta[i] = 0;
      }
      rec(0, Array(n).fill(0));
      points.sort((p, q) => key(p.labels).localeCompare(key(q.labels)));
      return { points, bounds, boxSize, radiusSquared, statusNote };
    }

    function computeSliceCharacter(point) {
      const data = sliceState.lastData;
      if (!point || !data || !data.latticeInfo || !data.latticeInfo.basis) return null;
      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      const highest = point.labels.slice();
      if (!isDominantDynkin(highest)) {
        return {
          status: 'dimensions require a dominant highest weight γ (all Dynkin labels ≥ 0)',
          entries: []
        };
      }

      try {
        const positionMode = sliceState.characterProjectionMode === 'projection' ? 'projection' : 'slice';
        if (positionMode === 'projection') {
          const bounded = boundedProjectionWeightCandidates(highest, C);
          const ctx = buildSliceFreudenthalContext(highest, C);
          const multiplicity = sliceMultiplicityFreudenthal(ctx);
          const groups = new Map();
          const snap = (x) => Math.round(x * 1e6);
          for (const cand of bounded.points) {
            const dom = dominantSliceRepresentative(C, cand.labels);
            if (!dom) continue;
            const value = multiplicity(dom);
            if (value <= 0) continue;
            const [u, v] = projectDynkinToSliceLM(cand.labels, data, C);
            const projectionKey = `${snap(u)},${snap(v)}`;
            let group = groups.get(projectionKey);
            if (!group) {
              group = {
                u,
                v,
                labels: cand.labels.slice(),
                sourceKeys: [],
                value: 0,
                projectedCount: 0,
                projectionKey,
                positionMode
              };
              groups.set(projectionKey, group);
            }
            group.value += value;
            group.projectedCount += 1;
            group.sourceKeys.push(key(cand.labels));
          }
          if (groups.size > MAX_SLICE_CHARACTER_CANDIDATES) {
            throw new Error(`Projected dimensions contain more than ${MAX_SLICE_CHARACTER_CANDIDATES} points; choose a smaller dominant weight.`);
          }
          const entries = Array.from(groups.values()).sort((p, q) => (p.v - q.v) || (p.u - q.u));
          return {
            status: 'computed',
            entries,
            positionMode,
            candidateCount: bounded.points.length,
            statusNote: bounded.statusNote || ''
          };
        }

        const bounded = boundedSliceLatticePoints(highest, data.latticeInfo.basis, C);
        const ctx = buildSliceFreudenthalContext(highest, C);
        const multiplicity = sliceMultiplicityFreudenthal(ctx);
        const entries = [];
        for (const cand of bounded.points) {
          const dom = dominantSliceRepresentative(C, cand.labels);
          if (!dom) continue;
          const value = multiplicity(dom);
          if (value > 0) {
            entries.push({
              a: cand.a,
              b: cand.b,
              labels: cand.labels.slice(),
              dominantLabels: dom.slice(),
              value,
              positionMode
            });
          }
        }
        entries.sort((p, q) => (p.b - q.b) || (p.a - q.a));
        return {
          status: 'computed',
          entries,
          positionMode
        };
      } catch (err) {
        return {
          status: err.message,
          entries: [],
          positionMode: sliceState.characterProjectionMode === 'projection' ? 'projection' : 'slice'
        };
      }
    }

    function parseIntegerVectorInput(text, rank, label) {
      const raw = String(text || '').trim();
      if (!raw) throw new Error(`Enter ${label}.`);
      const cleaned = raw.replace(/[\[\](){}]/g, ' ').replace(/[;,]/g, ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length > rank) throw new Error(`${label} has ${parts.length} entries; rank is ${rank}.`);
      const values = parts.map(part => {
        if (!/^[+-]?\d+$/.test(part)) throw new Error(`${label} must use integer coefficients.`);
        return Number(part);
      });
      while (values.length < rank) values.push(0);
      return values;
    }

    function parseRationalNumber(text, label) {
      const raw = String(text || '').trim();
      if (/^[+-]?\d+$/.test(raw)) return Number(raw);
      const frac = raw.match(/^([+-]?\d+)\/([+-]?\d+)$/);
      if (frac) {
        const num = Number(frac[1]);
        const den = Number(frac[2]);
        if (!den) throw new Error(`${label} has a zero denominator.`);
        return num / den;
      }
      throw new Error(`${label} must use integer or rational coefficients.`);
    }

    function parseRationalVectorInput(text, rank, label) {
      const raw = String(text || '').trim();
      if (!raw) throw new Error(`Enter ${label}.`);
      const cleaned = raw.replace(/[\[\](){}]/g, ' ').replace(/[;,]/g, ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length > rank) throw new Error(`${label} has ${parts.length} entries; rank is ${rank}.`);
      const values = parts.map(part => parseRationalNumber(part, label));
      while (values.length < rank) values.push(0);
      return values;
    }

    function integralVectorOrNull(v, eps = 1e-7) {
      const rounded = v.map(x => Math.round(x));
      return v.every((x, i) => Math.abs(x - rounded[i]) <= eps) ? rounded : null;
    }

    function parseSimpleRootInput(text, rank) {
      const raw = String(text || '').trim();
      if (!raw) throw new Error('Enter simple-root coefficients.');
      if (!/(a|alpha|α)/i.test(raw)) return parseIntegerVectorInput(raw, rank, 'simple-root coefficients');

      let compact = raw
        .replace(/[−–—]/g, '-')
        .replace(/alpha/gi, 'a')
        .replace(/α/g, 'a')
        .replace(/\s+/g, '')
        .replace(/-/g, '+-');
      if (compact.startsWith('+-')) compact = '-' + compact.slice(2);
      const parts = compact.split('+').filter(Boolean);
      const values = Array(rank).fill(0);
      for (const part of parts) {
        const m = part.match(/^([+-]?\d*)\*?a_?(\d+)$/i);
        if (!m) throw new Error('Use simple-root terms such as 2a1-a3, or integer coefficients.');
        const coeffText = m[1];
        const coeff = coeffText === '' || coeffText === '+' ? 1 : coeffText === '-' ? -1 : Number(coeffText);
        const index = Number(m[2]);
        if (!Number.isInteger(coeff) || index < 1 || index > rank) throw new Error(`Simple-root index must be between 1 and ${rank}.`);
        values[index - 1] += coeff;
      }
      return values;
    }

    function parseSimpleRootRationalInput(text, rank) {
      const raw = String(text || '').trim();
      if (!raw) throw new Error('Enter simple-root coefficients.');
      if (!/(a|alpha|\u03b1)/i.test(raw)) return parseRationalVectorInput(raw, rank, 'simple-root coefficients');

      let compact = raw
        .replace(/[\u2212\u2013\u2014]/g, '-')
        .replace(/alpha/gi, 'a')
        .replace(/\u03b1/g, 'a')
        .replace(/\s+/g, '')
        .replace(/-/g, '+-');
      if (compact.startsWith('+-')) compact = '-' + compact.slice(2);
      const parts = compact.split('+').filter(Boolean);
      const values = Array(rank).fill(0);
      for (const part of parts) {
        const m = part.match(/^([+-]?(?:\d+(?:\/\d+)?)?)\*?a_?(\d+)$/i);
        if (!m) throw new Error('Use simple-root terms such as 1/2a1-a3, or rational coefficients.');
        const coeffText = m[1];
        const coeff = coeffText === '' || coeffText === '+' ? 1 : coeffText === '-' ? -1 : parseRationalNumber(coeffText, 'simple-root coefficient');
        const index = Number(m[2]);
        if (index < 1 || index > rank) throw new Error(`Simple-root index must be between 1 and ${rank}.`);
        values[index - 1] += coeff;
      }
      return values;
    }

    function parseSliceGammaInputText(text, mode = sliceState.gammaInputMode || 'dynkin') {
      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      if (mode === 'partition') return diagramToDynkinLabels(parsePartition(text), rank);
      if (mode === 'simple') {
        const labels = simpleToDynkin(parseSimpleRootRationalInput(text, rank), C);
        const integral = integralVectorOrNull(labels);
        if (!integral) throw new Error('This simple-root combination is not an integral weight.');
        return integral;
      }
      return parseIntegerVectorInput(text, rank, 'Dynkin labels');
    }

    function parseSliceGammaInput() {
      return parseSliceGammaInputText(sliceState.gammaInputText || '', sliceState.gammaInputMode || 'dynkin');
    }

    function makeSliceInfoPoint(labels, source = 'manual') {
      const clean = labels.map(x => Math.trunc(Number(x) || 0));
      return {
        labels: clean,
        key: key(clean),
        latticeMode: source,
        manual: source === 'manual'
      };
    }

    function rationalApprox(x, maxDen = 1000000) {
      if (!Number.isFinite(x)) return null;
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x);
      if (Math.abs(x - Math.round(x)) < 1e-10) return [sign * Math.round(x), 1];
      let h1 = 1, h0 = 0, k1 = 0, k0 = 1;
      let value = x;
      for (let i = 0; i < 32; i++) {
        const a = Math.floor(value);
        const h = a * h1 + h0;
        const k = a * k1 + k0;
        if (k > maxDen) break;
        if (Math.abs(h / k - x) < 1e-10) return [sign * h, k];
        h0 = h1; h1 = h; k0 = k1; k1 = k;
        const rest = value - a;
        if (Math.abs(rest) < 1e-12) break;
        value = 1 / rest;
      }
      return [sign * h1, k1 || 1];
    }

    function formatRationalNumber(x) {
      if (Math.abs(x) < 1e-10) return '0';
      const fr = rationalApprox(x);
      if (!fr) return String(x);
      const [num, den] = fr;
      return den === 1 ? String(num) : `${num}/${den}`;
    }

    function formatInputVector(v) {
      return '[' + v.map(formatRationalNumber).join(',') + ']';
    }

    function standardSliceGammaInput(labels, preferredMode = sliceState.gammaInputMode || 'dynkin') {
      const clean = labels.map(x => Math.trunc(Number(x) || 0));
      if (preferredMode === 'partition') {
        if (isDominantDynkin(clean)) {
          return { mode: 'partition', text: partitionToString(dynkinLabelsToDiagram(clean)), warning: '' };
        }
        return {
          mode: 'dynkin',
          text: formatInputVector(clean),
          warning: 'This weight is not a partition/highest weight, so γ is shown in Dynkin labels.'
        };
      }
      if (preferredMode === 'simple') {
        const C = cartanMatrix(currentType(), currentRank());
        const simple = solveLinear(transpose(C), clean);
        if (simple) return { mode: 'simple', text: formatInputVector(simple), warning: '' };
        return {
          mode: 'dynkin',
          text: formatInputVector(clean),
          warning: 'This weight is not in the root lattice, so γ is shown in Dynkin labels.'
        };
      }
      return { mode: 'dynkin', text: formatInputVector(clean), warning: '' };
    }

    function setSliceGammaTextFromLabels(labels, preferredMode = sliceState.gammaInputMode || 'dynkin') {
      const formatted = standardSliceGammaInput(labels, preferredMode);
      sliceState.gammaInputMode = formatted.mode;
      sliceState.gammaInputText = formatted.text;
      sliceState.gammaInputError = formatted.warning || '';
    }

    function sliceGammaPlaceholder() {
      const rank = currentRank();
      const mode = sliceState.gammaInputMode || 'dynkin';
      if (mode === 'partition') return 'e.g. (4,2,1)';
      if (mode === 'simple') return rank >= 3 ? 'e.g. [1/2,0,-1] or 1/2a1-a3' : 'e.g. [1/2,1]';
      return rank >= 3 ? 'e.g. [1,0,0]' : 'e.g. [1,0]';
    }

    function sliceGammaInputControls() {
      const mode = sliceState.gammaInputMode || 'dynkin';
      const modes = [
        ['dynkin', 'Dynkin'],
        ['partition', 'partition'],
        ['simple', 'simple roots']
      ];
      const buttons = modes.map(([value, label]) =>
        `<button class="slice-mode-btn ${mode === value ? 'active' : ''}" data-slice-gamma-format="${value}" type="button">${label}</button>`
      ).join('');
      const error = sliceState.gammaInputError
        ? `<div class="warning-text">${escapeHTML(sliceState.gammaInputError)}</div>`
        : '';
      return `
        <div class="slice-gamma-control">
          <div class="slice-mode-row">${buttons}</div>
          <div class="slice-gamma-entry">
            <input data-slice-gamma-input type="text" value="${escapeHTML(sliceState.gammaInputText || '')}" placeholder="${escapeHTML(sliceGammaPlaceholder())}">
            <button class="slice-mode-btn" data-slice-gamma-apply type="button">set γ</button>
          </div>
          ${error}
        </div>`;
    }

    function readSliceGammaInputValue() {
      const input = document.querySelector('[data-slice-gamma-input]');
      if (input) sliceState.gammaInputText = input.value;
    }

    function applySliceGammaInput() {
      readSliceGammaInputValue();
      try {
        const labels = parseSliceGammaInput();
        const point = makeSliceInfoPoint(labels, 'manual');
        setSliceGammaTextFromLabels(labels, sliceState.gammaInputMode);
        sliceState.infoPoint = point;
        sliceState.selectedPoint = null;
        sliceState.activeCharacter = sliceState.characterMode === 'none' ? null : computeSliceCharacter(point);
        renderSliceWeightInfo(point, sliceState.activeCharacter);
        if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
      } catch (err) {
        sliceState.gammaInputError = err.message;
        renderSliceWeightInfo(sliceState.infoPoint, sliceState.activeCharacter, false);
      }
    }

    function sliceDimensionModeButtons() {
      const displayModes = [
        ['none', 'none'],
        ['dots', 'dots'],
        ['numbers', 'numbers']
      ];
      const display = '<div class="slice-mode-row">' + displayModes.map(([mode, label]) =>
        `<button class="slice-mode-btn ${sliceState.characterMode === mode ? 'active' : ''}" data-slice-character-mode="${mode}" type="button">${label}</button>`
      ).join('') + '</div>';
      if (sliceState.characterMode === 'none') return display;
      const positionMode = sliceState.characterProjectionMode === 'projection' ? 'projection' : 'slice';
      const positions = [
        ['slice', 'slice'],
        ['projection', 'proj']
      ];
      const position = '<div class="slice-mode-row slice-dimension-subrow">' + positions.map(([mode, label]) =>
        `<button class="slice-mode-btn ${positionMode === mode ? 'active' : ''}" data-slice-character-position-mode="${mode}" type="button">${label}</button>`
      ).join('') + '</div>';
      return display + position;
    }

    function sliceWeightSummaryRows(point) {
      const type = currentType(), rank = currentRank();
      const C = cartanMatrix(type, rank);
      const labels = point.labels.slice();

      let normText = 'not computed';
      try {
        const norm = Math.sqrt(Math.max(0, makeDynkinInnerProduct(C)(labels, labels)));
        normText = norm < 1e-9 ? '0' : norm.toFixed(6);
      } catch (_) {}

      let dim = 'not dominant';
      if (isDominantDynkin(labels)) {
        try { dim = weylDimension(labels, C); }
        catch (_) { dim = 'not computed'; }
      }

      let orbitSize = 'not computed';
      try {
        const dom = dominantSliceRepresentative(C, labels);
        orbitSize = dom ? weylOrbitSizeDominant(dom, C) : String(weylOrbitSigned(labels, C).length);
      } catch (_) {
        try { orbitSize = String(weylOrbitSigned(labels, C).length); }
        catch (_) { orbitSize = 'not computed'; }
      }

      return [
        ['|γ|', normText],
        ['dim V<sup>γ</sup>', dim],
        ['|W·γ|', orbitSize]
      ];
    }

    function renderSliceWeightInfo(point = sliceState.infoPoint, character = sliceState.activeCharacter, expand = true) {
      const card = $('slice-weight-info-card');
      const out = $('slice-weight-info-out');
      if (!card || !out) return;
      card.style.display = '';
      if (expand) setCardCollapsed(card, false, false);
      const rows = [
        ['γ input', sliceGammaInputControls()]
      ];
      if (point) {
        rows.push(
          ['Dynkin labels', `<code>${formatDynkinVector(point.labels)}</code>`],
          ...sliceWeightSummaryRows(point),
          ['dimensions', sliceDimensionModeButtons()]
        );
      } else {
        rows.push(['status', '<span class="hint">Click a lattice point in the 2d slice canvas, or enter γ above.</span>']);
      }
      if (sliceState.characterMode !== 'none' && character && character.status && character.status !== 'computed') {
        rows.push(['status', character.status]);
      } else if (sliceState.characterMode !== 'none' && character && character.statusNote) {
        rows.push(['status', `<span class="warning-text">${character.statusNote}</span>`]);
      }
      out.innerHTML = rows.map(([a, b]) =>
        `<div class="slice-info-row"><span class="slice-info-label">${a}</span><span class="slice-info-value">${b}</span></div>`
      ).join('');
    }

    function resetSliceView() {
      const view = sliceState.view;
      view.zoom = 1;
      view.panX = 0;
      view.panY = 0;
      view.isPanning = false;
      view.pointerId = null;
      view.startX = 0;
      view.startY = 0;
      view.startPanX = 0;
      view.startPanY = 0;
      view.moved = false;
      view.suppressClick = false;
      view.pointers?.clear?.();
      view.gesture = null;
    }

    function clearSlicePointSelection() {
      sliceState.selectedPoint = null;
      sliceState.infoPoint = null;
      sliceState.activeCharacter = null;
      const out = $('slice-weight-info-out');
      if (out) renderSliceWeightInfo(null, null, false);
    }

    function updateSliceCanvasCursor(event = null) {
      if (!sliceState.sliceCanvas) return;
      const view = sliceState.view;
      if ((view.isPanning && view.moved) || (view.pointers && view.pointers.size > 1)) {
        sliceState.sliceCanvas.style.cursor = 'grabbing';
        return;
      }
      sliceState.sliceCanvas.style.cursor = event && nearestSliceHitPoint(event) ? 'pointer' : 'default';
    }

    function sliceCanvasEventXY(event) {
      if (!sliceState.sliceCanvas) return null;
      const rect = sliceState.sliceCanvas.getBoundingClientRect();
      const logicalW = sliceState.displayWidth || rect.width || sliceState.sliceCanvas.clientWidth || sliceState.sliceCanvas.width;
      const logicalH = sliceState.displayHeight || rect.height || sliceState.sliceCanvas.clientHeight || sliceState.sliceCanvas.height;
      const sx = logicalW / Math.max(1, rect.width);
      const sy = logicalH / Math.max(1, rect.height);
      return [(event.clientX - rect.left) * sx, (event.clientY - rect.top) * sy];
    }

    function sliceViewCenter() {
      const W = sliceState.displayWidth || sliceState.sliceCanvas.clientWidth || sliceState.sliceCanvas.width;
      const H = sliceState.displayHeight || sliceState.sliceCanvas.clientHeight || sliceState.sliceCanvas.height;
      return [W / 2, H / 2];
    }

    function clampSliceZoom(zoom) {
      return Math.max(0.35, Math.min(10, zoom));
    }

    function slicePointerPair() {
      const points = Array.from(sliceState.view.pointers.values());
      if (points.length < 2) return null;
      return [points[0], points[1]];
    }

    function slicePairCenter(pair) {
      return [(pair[0].x + pair[1].x) / 2, (pair[0].y + pair[1].y) / 2];
    }

    function slicePairDistance(pair) {
      return Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
    }

    function startSlicePinchGesture() {
      const pair = slicePointerPair();
      if (!pair) return;
      const view = sliceState.view;
      view.gesture = {
        startDistance: Math.max(1, slicePairDistance(pair)),
        startCenter: slicePairCenter(pair),
        startZoom: view.zoom || 1,
        startPanX: view.panX || 0,
        startPanY: view.panY || 0
      };
      view.isPanning = false;
      view.pointerId = null;
      view.moved = true;
      view.suppressClick = true;
    }

    function applySliceZoomAt(xy, newZoom, oldZoom, startPanX = sliceState.view.panX, startPanY = sliceState.view.panY) {
      const view = sliceState.view;
      const [ox, oy] = sliceViewCenter();
      const relX = (xy[0] - ox - startPanX) / oldZoom;
      const relY = (xy[1] - oy - startPanY) / oldZoom;
      view.zoom = newZoom;
      view.panX = xy[0] - ox - relX * newZoom;
      view.panY = xy[1] - oy - relY * newZoom;
    }

    function nearestSliceHitPoint(event, maxDist = 9) {
      if (!sliceState.visible || !sliceState.sliceCanvas || !sliceState.hitPoints.length) return null;
      const xy = sliceCanvasEventXY(event);
      if (!xy) return null;
      const [x, y] = xy;
      let best = null, bestD2 = Infinity;
      for (const p of sliceState.hitPoints) {
        const d2 = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d2 < bestD2) { best = p; bestD2 = d2; }
      }
      return best && bestD2 <= maxDist * maxDist ? best : null;
    }

    function handleSliceCanvasPointerMove(event) {
      if (!sliceState.sliceCanvas) return;
      const view = sliceState.view;
      if (view.pointers?.has?.(event.pointerId)) {
        const xy = sliceCanvasEventXY(event);
        if (!xy) return;
        view.pointers.set(event.pointerId, { x: xy[0], y: xy[1] });
        if (view.pointers.size >= 2) {
          event.preventDefault();
          if (!view.gesture) startSlicePinchGesture();
          const pair = slicePointerPair();
          if (!pair || !view.gesture) return;
          const center = slicePairCenter(pair);
          const dist = Math.max(1, slicePairDistance(pair));
          const newZoom = clampSliceZoom(view.gesture.startZoom * dist / view.gesture.startDistance);
          applySliceZoomAt(
            view.gesture.startCenter,
            newZoom,
            view.gesture.startZoom,
            view.gesture.startPanX,
            view.gesture.startPanY
          );
          view.panX += center[0] - view.gesture.startCenter[0];
          view.panY += center[1] - view.gesture.startCenter[1];
          view.moved = true;
          view.suppressClick = true;
          updateSliceCanvasCursor(event);
          if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
          return;
        }
      }
      if (view.isPanning && view.pointerId === event.pointerId) {
        const xy = sliceCanvasEventXY(event);
        if (!xy) return;
        const dx = xy[0] - view.startX;
        const dy = xy[1] - view.startY;
        if (!view.moved && Math.hypot(dx, dy) > 2) view.moved = true;
        if (view.moved) {
          event.preventDefault();
          view.panX = view.startPanX + dx;
          view.panY = view.startPanY + dy;
          updateSliceCanvasCursor(event);
          if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
        }
        return;
      }
      updateSliceCanvasCursor(event);
    }

    function handleSliceCanvasPointerDown(event) {
      if (!sliceState.visible) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const xy = sliceCanvasEventXY(event);
      if (!xy) return;
      if (event.pointerType !== 'mouse') event.preventDefault();
      const view = sliceState.view;
      if (!view.pointers) view.pointers = new Map();
      view.pointers.set(event.pointerId, { x: xy[0], y: xy[1] });
      sliceState.sliceCanvas.setPointerCapture?.(event.pointerId);
      if (view.pointers.size >= 2) {
        startSlicePinchGesture();
        updateSliceCanvasCursor(event);
        return;
      }
      view.isPanning = true;
      view.pointerId = event.pointerId;
      view.startX = xy[0];
      view.startY = xy[1];
      view.startPanX = view.panX;
      view.startPanY = view.panY;
      view.moved = false;
    }

    function handleSliceCanvasPointerUp(event) {
      const view = sliceState.view;
      const hadPointer = view.pointers?.has?.(event.pointerId);
      if (hadPointer) view.pointers.delete(event.pointerId);
      if (view.gesture) {
        view.suppressClick = true;
        if (view.pointers && view.pointers.size >= 2) {
          startSlicePinchGesture();
        } else if (view.pointers && view.pointers.size === 1) {
          const [[id, p]] = Array.from(view.pointers.entries());
          view.gesture = null;
          view.isPanning = true;
          view.pointerId = id;
          view.startX = p.x;
          view.startY = p.y;
          view.startPanX = view.panX;
          view.startPanY = view.panY;
          view.moved = true;
        } else {
          view.gesture = null;
          view.isPanning = false;
          view.pointerId = null;
        }
        sliceState.sliceCanvas?.releasePointerCapture?.(event.pointerId);
        updateSliceCanvasCursor(event);
        return;
      }
      if (!view.isPanning || view.pointerId !== event.pointerId) {
        sliceState.sliceCanvas?.releasePointerCapture?.(event.pointerId);
        updateSliceCanvasCursor(event);
        return;
      }
      const wasTouchTap = event.pointerType !== 'mouse' && !view.moved;
      if (view.moved) view.suppressClick = true;
      view.isPanning = false;
      view.pointerId = null;
      sliceState.sliceCanvas?.releasePointerCapture?.(event.pointerId);
      updateSliceCanvasCursor(event);
      if (wasTouchTap) {
        selectSliceHitPoint(event);
        view.suppressClick = true;
      }
    }

    function handleSliceCanvasPointerLeave() {
      if (!sliceState.sliceCanvas || sliceState.view.isPanning) return;
      sliceState.sliceCanvas.style.cursor = 'default';
    }

    function handleSliceCanvasWheel(event) {
      if (!sliceState.visible) return;
      const xy = sliceCanvasEventXY(event);
      if (!xy) return;
      event.preventDefault();
      const view = sliceState.view;
      const oldZoom = view.zoom || 1;
      const factor = Math.exp(-event.deltaY * 0.001);
      const newZoom = clampSliceZoom(oldZoom * factor);
      applySliceZoomAt(xy, newZoom, oldZoom);
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
      updateSliceCanvasCursor(event);
    }

    function handleSliceCanvasDoubleClick(event) {
      if (!sliceState.visible) return;
      event.preventDefault();
      resetSliceView();
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
    }

    function selectSliceHitPoint(event) {
      const best = nearestSliceHitPoint(event);
      if (!best) return false;
      sliceState.selectedPoint = { i: best.i, j: best.j, key: best.key, latticeMode: best.latticeMode };
      sliceState.infoPoint = best;
      setSliceGammaTextFromLabels(best.labels, sliceState.gammaInputMode);
      sliceState.activeCharacter = sliceState.characterMode === 'none' ? null : computeSliceCharacter(best);
      renderSliceWeightInfo(best, sliceState.activeCharacter);
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
      return true;
    }

    function handleSliceCanvasClick(event) {
      if (sliceState.view.suppressClick) {
        sliceState.view.suppressClick = false;
        return;
      }
      selectSliceHitPoint(event);
    }

    function toggleSliceDiagrams() {
      if (!sliceState.visible) return;
      sliceState.showDiagramsInSlice = !sliceState.showDiagramsInSlice;
      setSliceFocusMode(true);
      sizeSliceCanvasToStack();
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
    }

    function handleSliceWeightInfoClick(event) {
      const gammaFormatBtn = event.target.closest('[data-slice-gamma-format]');
      if (gammaFormatBtn) {
        const oldMode = sliceState.gammaInputMode || 'dynkin';
        readSliceGammaInputValue();
        const newMode = gammaFormatBtn.dataset.sliceGammaFormat || 'dynkin';
        let labels = sliceState.infoPoint?.labels || null;
        if (!labels && String(sliceState.gammaInputText || '').trim()) {
          try { labels = parseSliceGammaInputText(sliceState.gammaInputText, oldMode); }
          catch (_) {}
        }
        sliceState.gammaInputMode = newMode;
        if (labels) setSliceGammaTextFromLabels(labels, newMode);
        else sliceState.gammaInputError = '';
        renderSliceWeightInfo(sliceState.infoPoint, sliceState.activeCharacter, false);
        return;
      }
      const gammaApplyBtn = event.target.closest('[data-slice-gamma-apply]');
      if (gammaApplyBtn) {
        applySliceGammaInput();
        return;
      }
      const positionBtn = event.target.closest('[data-slice-character-position-mode]');
      if (positionBtn) {
        const mode = positionBtn.dataset.sliceCharacterPositionMode;
        sliceState.characterProjectionMode = mode === 'projection' ? 'projection' : 'slice';
        const point = sliceState.infoPoint;
        if (sliceState.characterMode !== 'none' && point) sliceState.activeCharacter = computeSliceCharacter(point);
        if (point) renderSliceWeightInfo(point, sliceState.activeCharacter);
        if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
        return;
      }
      const btn = event.target.closest('[data-slice-character-mode]');
      if (!btn) return;
      const mode = btn.dataset.sliceCharacterMode;
      sliceState.characterMode = (mode === 'dots' || mode === 'numbers') ? mode : 'none';
      const point = sliceState.infoPoint;
      if (sliceState.characterMode === 'none') sliceState.activeCharacter = null;
      else if (point) sliceState.activeCharacter = computeSliceCharacter(point);
      if (point) renderSliceWeightInfo(point, sliceState.activeCharacter);
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
    }

    function handleSliceWeightInfoKeydown(event) {
      if (event.key !== 'Enter' || !event.target.closest('[data-slice-gamma-input]')) return;
      event.preventDefault();
      applySliceGammaInput();
    }

    function handleSliceLayerModeClick(event) {
      const infoToggle = event.target.closest('[data-slice-lie-info-toggle]');
      if (infoToggle) {
        sliceState.lieInfoCollapsed = !sliceState.lieInfoCollapsed;
        renderSliceLayerCard();
        return;
      }
      const latticeBtn = event.target.closest('[data-slice-lattice-mode]');
      if (latticeBtn) {
        const mode = latticeBtn.dataset.sliceLatticeMode;
        sliceState.latticeMode = (mode === 'root' || mode === 'none') ? mode : 'weight';
        clearSlicePointSelection();
        renderSliceLayerCard();
        if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
        return;
      }
      const btn = event.target.closest('[data-slice-layer]');
      if (!btn) return;
      const layer = btn.dataset.sliceLayer;
      const mode = btn.dataset.sliceLayerMode;
      if (!sliceState.layerModes || !(layer in sliceState.layerModes)) return;
      sliceState.layerModes[layer] = (mode === 'normal' || mode === 'projection') ? mode : 'none';
      renderSliceLayerCard();
      if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
    }

    function hideSlice() {
      const sp = $('slice-panel');
      if (sp) sp.style.display = 'none';
      sliceState.showDiagramsInSlice = false;
      setSliceFocusMode(false);
      sliceState.visible = false;
      sliceState.lastData = null;
      sliceState.hitPoints = [];
      sliceState.activeCharacter = null;
      resetSliceView();
      if (sliceState.sliceCtx && sliceState.sliceCanvas) {
        sliceState.sliceCtx.clearRect(0, 0, sliceState.sliceCanvas.width, sliceState.sliceCanvas.height);
      }
      const legend = $('slice-legend');
      if (legend) legend.innerHTML = '';
      const planeLabel = $('slice-plane-label');
      if (planeLabel) planeLabel.textContent = '';
      handleSliceCanvasPointerLeave();
      hideSliceWeightInfoCard();
      hideSliceLayerCard();
      updateSliceButtonLabel();
    }

    function sizeSliceCanvasToStack() {
      if (!sliceState.sliceCanvas) return;
      const canvasStack = $('canvas-stack');
      const targetW = canvasStack ? Math.max(300, canvasStack.clientWidth) : 640;
      const targetH = Math.round(targetW * 0.72);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      sliceState.displayWidth = targetW;
      sliceState.displayHeight = targetH;
      sliceState.sliceCanvas.style.width = targetW + 'px';
      sliceState.sliceCanvas.style.height = targetH + 'px';
      sliceState.sliceCanvas.width = Math.max(1, Math.round(targetW * dpr));
      sliceState.sliceCanvas.height = Math.max(1, Math.round(targetH * dpr));
      if (sliceState.sliceCtx) sliceState.sliceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function openSlice() {
      if (!sliceCardIsExpanded()) return;
      const data = computeSliceData();
      if (!data) {
        hideSlice();
        alert('λ and μ must be linearly independent weights.');
        return;
      }
      sliceState.lastData = data;
      const sp = $('slice-panel');
      sp.style.display = '';
      sliceState.showDiagramsInSlice = false;
      setSliceFocusMode(true);
      sliceState.visible = true;
      resetSliceView();
      updateSliceButtonLabel();
      showSliceWeightInfoCard(true);
      showSliceLayerCard(false);

      // Size canvas to match Young diagrams panel width
      sizeSliceCanvasToStack();

      drawSliceCanvas(data);
      sp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function toggleSlice() {
      if (sliceState.visible) hideSlice();
      else openSlice();
      updateSliceCard();
    }

    function refreshSlice() {
      if (!sliceState.visible) return;
      const infoCard = $('slice-weight-info-card');
      const layerCard = $('slice-layer-card');
      const keepInfoCollapsed = infoCard ? infoCard.classList.contains('collapsed') : true;
      const keepLayerCollapsed = layerCard ? layerCard.classList.contains('collapsed') : false;
      const data = computeSliceData();
      if (!data) {
        hideSlice();
        return;
      }
      sliceState.lastData = data;
      sliceState.selectedPoint = null;
      sliceState.infoPoint = null;
      sliceState.activeCharacter = null;
      resetSliceView();
      showSliceWeightInfoCard(keepInfoCollapsed);
      showSliceLayerCard(keepLayerCollapsed);
      drawSliceCanvas(data);
    }

    function setupSlice() {
      sliceState.sliceCanvas = $('slice-canvas');
      sliceState.sliceCtx = sliceState.sliceCanvas.getContext('2d');
      updateSliceButtonLabel();

      $('open-slice-btn').addEventListener('click', toggleSlice);
      const diagramToggle = $('slice-diagram-toggle');
      if (diagramToggle) diagramToggle.addEventListener('click', toggleSliceDiagrams);
      const layerCardBody = $('slice-layer-card-body');
      if (layerCardBody) layerCardBody.addEventListener('click', handleSliceLayerModeClick);
      const infoOut = $('slice-weight-info-out');
      if (infoOut) {
        infoOut.addEventListener('click', handleSliceWeightInfoClick);
        infoOut.addEventListener('keydown', handleSliceWeightInfoKeydown);
      }
      sliceState.sliceCanvas.addEventListener('click', handleSliceCanvasClick);
      sliceState.sliceCanvas.addEventListener('dblclick', handleSliceCanvasDoubleClick);
      sliceState.sliceCanvas.addEventListener('wheel', handleSliceCanvasWheel, { passive: false });
      sliceState.sliceCanvas.addEventListener('pointerdown', handleSliceCanvasPointerDown);
      sliceState.sliceCanvas.addEventListener('pointermove', handleSliceCanvasPointerMove);
      sliceState.sliceCanvas.addEventListener('pointerup', handleSliceCanvasPointerUp);
      sliceState.sliceCanvas.addEventListener('pointercancel', handleSliceCanvasPointerUp);
      sliceState.sliceCanvas.addEventListener('pointerleave', handleSliceCanvasPointerLeave);

      // Resize slice canvas on window resize without recomputing slice data.
      window.addEventListener('resize', () => {
        if (!sliceState.visible) return;
        sizeSliceCanvasToStack();
        if (sliceState.lastData) drawSliceCanvas(sliceState.lastData);
      });
    }

    // Hook slice into existing diagram/algebra changes.
    function setupSliceHooks() {
      // Hook into diagram change by wrapping the canvas click handlers after init
      // and also patching setDiagram via override on the state objects.
      // Best approach: observe diagram changes via the existing MutationObserver trick
      // or simply poll/refresh on input.  Here we use a simpler approach:
      // monkey-patch the global state setter by rewriting setDiagram.
      // Since setDiagram is called by the buttons and canvas clicks, we can hook
      // it by intercepting after init by wrapping the exposed updateStats cascade.
      // Actually cleanest: add extra event listeners to the canvas clicks.
      for (const which of ['lambda', 'mu']) {
        const canvas = $(which + '-canvas');
        if (canvas) {
          canvas.addEventListener('click', () => {
            setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10);
          });
        }
        const setBtn = $(which === 'lambda' ? 'set-lambda' : 'set-mu');
        if (setBtn) setBtn.addEventListener('click', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
        const clrBtn = $(which === 'lambda' ? 'clear-lambda' : 'clear-mu');
        if (clrBtn) clrBtn.addEventListener('click', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
      }
      $('swap-diagrams') && $('swap-diagrams').addEventListener('click', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
      $('lie-type') && $('lie-type').addEventListener('change', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
      $('lie-rank') && $('lie-rank').addEventListener('change', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
      $('grid-rows') && $('grid-rows').addEventListener('change', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
      $('grid-cols') && $('grid-cols').addEventListener('change', () => setTimeout(() => { updateSliceCard(); refreshSlice(); }, 10));
    }

    init();
    setupSlice();
    setupSliceHooks();
  })();
