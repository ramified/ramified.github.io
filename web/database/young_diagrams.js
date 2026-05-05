// ─────────────────────────────────────────────
//  BigInt shim (uses native BigInt if available)
// ─────────────────────────────────────────────
const BI = (typeof BigInt !== 'undefined')
  ? { from: n => BigInt(n), mul: (a,b) => a*b, div: (a,b) => a/b, str: n => n.toString() }
  : null; // fallback: use Number (lossy for large n, acceptable)

function bigMul(a, b) { return BI ? BI.mul(a, b) : a * b; }
function bigDiv(a, b) { return BI ? BI.div(a, b) : a / b; }
function bigFrom(n)   { return BI ? BI.from(n)   : n; }
function bigStr(n)    { return BI ? BI.str(n)     : n.toString(); }

// ─────────────────────────────────────────────
//  Factorial (returns BigInt or string for big n)
// ─────────────────────────────────────────────
function factorial(n) {
  if (n <= 0) return bigFrom(1);
  let r = bigFrom(1);
  for (let i = 2; i <= n; i++) r = bigMul(r, bigFrom(i));
  return r;
}

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
const MAX_GRID_COLS = 25;
const MAX_GRID_ROWS = 15;
// Must match the CSS layout breakpoint where .layout changes from two columns to one.
const SMALL_SCREEN_QUERY = '(max-width: 780px)';
const layoutBreakpointMedia = typeof window.matchMedia === 'function'
  ? window.matchMedia(SMALL_SCREEN_QUERY)
  : null;

function defaultGridSize() {
  const isSmallScreen = layoutBreakpointMedia ? layoutBreakpointMedia.matches : false;
  return isSmallScreen
    ? { cols: 10, rows: 6 }
    : { cols: 13, rows: 13 };
}

const _initialGrid = defaultGridSize();
let gridCols = _initialGrid.cols;
let gridRows = _initialGrid.rows;
let gridSizeWasCustomized = false;
let blocks = [];   // blocks[r][c] ∈ {0,1}
let hooks  = [];
let n = 0;

function makeEmptyBlocks(rows = gridRows, cols = gridCols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function resetBlocks() {
  blocks = makeEmptyBlocks();
  hooks = [];
  n = 0;
}

resetBlocks();

// ─────────────────────────────────────────────
//  Canvas setup
// ─────────────────────────────────────────────
const canvasEl = document.getElementById('yd-canvas');
const ctx = canvasEl.getContext('2d');
let W, H, bsize;

function resize() {
  const wrap = document.getElementById('canvas-wrap');
  W = Math.max(1, wrap.clientWidth - 32);
  bsize = W / gridCols;
  H = bsize * gridRows;
  canvasEl.width  = Math.round(W);
  canvasEl.height = Math.round(H);
  redraw();
}

window.addEventListener('resize', resize);

// ─────────────────────────────────────────────
//  Hook length at (r,c)
// ─────────────────────────────────────────────
function hookLen(r, c) {
  let h = 1;
  for (let i = r+1; i < gridRows; i++) h += blocks[i][c];
  for (let j = c+1; j < gridCols; j++) h += blocks[r][j];
  return h;
}

// ─────────────────────────────────────────────
//  Compute hooks array + n
// ─────────────────────────────────────────────
function computeHooks() {
  hooks = [];
  n = 0;
  for (let r = 0; r < gridRows; r++) {
    hooks.push([]);
    for (let c = 0; c < gridCols; c++) {
      if (blocks[r][c]) {
        n++;
        hooks[r].push(hookLen(r, c));
      }
    }
  }
}

// ─────────────────────────────────────────────
//  Row lengths (partition)
// ─────────────────────────────────────────────
function rowLengths() {
  const rows = [];
  for (let r = 0; r < gridRows; r++) {
    let len = 0;
    for (let c = 0; c < gridCols; c++) if (blocks[r][c]) len++;
    if (len > 0) rows.push(len);
  }
  return rows;
}

// Column lengths (conjugate partition)
function colLengths() {
  const cols = [];
  for (let c = 0; c < gridCols; c++) {
    let len = 0;
    for (let r = 0; r < gridRows; r++) if (blocks[r][c]) len++;
    if (len > 0) cols.push(len);
  }
  return cols;
}

// ─────────────────────────────────────────────
//  Draw
// ─────────────────────────────────────────────
const PALETTE = [
  null,
  '#7fb3d3','#76c893','#a8d8a8','#f6d860','#f4a261',
  '#e76f51','#c77dff','#e63946','#4cc9f0','#06d6a0',
  '#ffd166','#ef476f','#118ab2'
];

function hslHook(hk) {
  // map hook → hue similar to original (HSB 160+hk*6, s=50, b=80)
  const hue = (160 + hk * 6) % 360;
  return `hsla(${hue},45%,62%,0.72)`;
}

const showHooks   = () => document.getElementById('showhooks').checked;
const shadeHooks  = () => document.getElementById('shadehooks').checked;
const showCoords  = () => document.getElementById('showcoords').checked;

function redraw() {
  computeHooks();
  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(180,170,158,0.45)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= gridCols; i++) {
    ctx.beginPath(); ctx.moveTo(i*bsize, 0); ctx.lineTo(i*bsize, H); ctx.stroke();
  }
  for (let i = 0; i <= gridRows; i++) {
    ctx.beginPath(); ctx.moveTo(0, i*bsize); ctx.lineTo(W, i*bsize); ctx.stroke();
  }

  // cells
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (!blocks[r][c]) continue;
      const h = hookLen(r, c);

      // fill
      ctx.fillStyle = shadeHooks() ? hslHook(h) : 'hsla(210,40%,68%,0.62)';
      ctx.strokeStyle = 'rgba(30,24,18,0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(c*bsize+0.6, r*bsize+0.6, bsize-1.2, bsize-1.2);
      ctx.fill();
      ctx.stroke();

      // hook number
      if (showHooks()) {
        ctx.fillStyle = 'rgba(20,16,10,0.9)';
        ctx.font = `${Math.round(bsize*0.38)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h, c*bsize + bsize/2, r*bsize + bsize/2);
      }

      // coords
      if (showCoords()) {
        ctx.fillStyle = 'rgba(80,60,40,0.6)';
        ctx.font = `${Math.round(bsize*0.21)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${r},${c}`, c*bsize + bsize - 2, r*bsize + bsize - 1);
      }
    }
  }

  // outer border
  ctx.strokeStyle = 'rgba(30,24,18,0.7)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(0.9, 0.9, W-1.8, H-1.8);

  updateShapeBadge();
}

// ─────────────────────────────────────────────
//  Card-scoped calculation scheduling
// ─────────────────────────────────────────────
function cardForElement(el) {
  return el ? el.closest('.card') : null;
}

function isCardExpandedById(id) {
  const el = document.getElementById(id);
  const card = cardForElement(el);
  return !!card && !card.classList.contains('collapsed');
}

function updateShapeBadge() {
  const rows = rowLengths();
  document.getElementById('shape-badge').textContent = rows.length ? '(' + rows.join(', ') + ')' : '( )';
}

function refreshStats() {
  if (isCardExpandedById('out-size')) calc();
}

function refreshCardCalculation(card) {
  if (!card || card.classList.contains('collapsed')) return;

  if (card.querySelector('#out-size')) {
    calc();
  }
  if (card.querySelector('#br-output')) {
    computeBranching();
  }
  if (card.querySelector('#lie-weight')) {
    onTypeChange();
  }
}

function refreshOpenCalculations() {
  document.querySelectorAll('.card:not(.collapsed)').forEach(refreshCardCalculation);
}

function diagramChanged() {
  redraw();
  refreshOpenCalculations();
}

// ─────────────────────────────────────────────
//  User-adjustable canvas dimensions
// ─────────────────────────────────────────────
function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function syncGridSizeInputs() {
  const colsInput = document.getElementById('grid-cols');
  const rowsInput = document.getElementById('grid-rows');
  if (colsInput) colsInput.value = gridCols;
  if (rowsInput) rowsInput.value = gridRows;
}

function resetCalculatedOutputsForEmptyDiagram() {
  document.getElementById('shape-badge').textContent = '( )';
  const exportOut = document.getElementById('export-out');
  if (exportOut) exportOut.value = '';
}

function setGridSize(cols, rows, clearDiagram = true, markCustomized = false) {
  const nextCols = clampInt(cols, 1, MAX_GRID_COLS, gridCols);
  const nextRows = clampInt(rows, 1, MAX_GRID_ROWS, gridRows);
  const changed = nextCols !== gridCols || nextRows !== gridRows;

  if (markCustomized) gridSizeWasCustomized = true;

  gridCols = nextCols;
  gridRows = nextRows;
  syncGridSizeInputs();

  if (clearDiagram && changed) {
    clearAllSilent();
    resetCalculatedOutputsForEmptyDiagram();
  }

  resize();
  refreshOpenCalculations();
}

function applyGridSizeFromInputs() {
  const colsInput = document.getElementById('grid-cols');
  const rowsInput = document.getElementById('grid-rows');
  setGridSize(colsInput?.value, rowsInput?.value, true, true);
}

function handleLayoutBreakpointChange() {
  if (gridSizeWasCustomized) return;
  const nextDefault = defaultGridSize();
  setGridSize(nextDefault.cols, nextDefault.rows, true, false);
}

function initGridSizeControls() {
  const colsInput = document.getElementById('grid-cols');
  const rowsInput = document.getElementById('grid-rows');
  if (colsInput) {
    colsInput.min = 1;
    colsInput.max = MAX_GRID_COLS;
  }
  if (rowsInput) {
    rowsInput.min = 1;
    rowsInput.max = MAX_GRID_ROWS;
  }
  if (layoutBreakpointMedia) {
    if (typeof layoutBreakpointMedia.addEventListener === 'function') {
      layoutBreakpointMedia.addEventListener('change', handleLayoutBreakpointChange);
    } else if (typeof layoutBreakpointMedia.addListener === 'function') {
      layoutBreakpointMedia.addListener(handleLayoutBreakpointChange);
    }
  }
  syncGridSizeInputs();
}

// ─────────────────────────────────────────────
//  Calc stats
// ─────────────────────────────────────────────
function calc() {
  if (!isCardExpandedById('out-size')) return;
  const rows = rowLengths();
  const cols = colLengths();

  let hp = bigFrom(1);
  for (let r = 0; r < gridRows; r++)
    for (let c = 0; c < gridCols; c++)
      if (blocks[r][c]) hp = bigMul(hp, bigFrom(hookLen(r, c)));

  const facN = factorial(n);

  // semistandard: ∏_{(r,c)∈λ} (m + c - r) / ∏ hook lengths
  const mr = parseInt(document.getElementById('maxentry').value) || 5;
  let ssnum = bigFrom(1);
  for (let r = 0; r < gridRows; r++)
    for (let c = 0; c < gridCols; c++)
      if (blocks[r][c]) ssnum = bigMul(ssnum, bigFrom(mr + c - r));

  const shapeStr = rows.length ? '(' + rows.join(', ') + ')' : '( )';
  const conjStr  = cols.length ? '(' + cols.join(', ') + ')' : '( )';

  document.getElementById('out-size').textContent  = n;
  document.getElementById('out-shape').textContent = shapeStr;
  document.getElementById('out-conj').textContent  = conjStr;
  document.getElementById('out-fac').textContent   = n <= 20 ? bigStr(facN) : bigStr(facN).slice(0,30)+'…';
  document.getElementById('out-hprod').textContent = bigStr(hp);
  document.getElementById('out-nstand').textContent = n===0 ? '1' : bigStr(bigDiv(facN, hp));
  document.getElementById('out-sstand').textContent = n===0 ? '1' : bigStr(bigDiv(ssnum, hp));

  document.getElementById('shape-badge').textContent = shapeStr;
}

// ─────────────────────────────────────────────
//  Mouse interaction
// ─────────────────────────────────────────────
canvasEl.addEventListener('click', function(e) {
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;

  if (mx < 0 || mx >= W || my < 0 || my >= H) return;

  const r = Math.floor(my / bsize);
  const c = Math.floor(mx / bsize);

  if (blocks[r][c]) {
    // remove bottom-right rectangle from (r,c)
    for (let i = r; i < gridRows; i++)
      for (let j = c; j < gridCols; j++)
        blocks[i][j] = 0;
  } else {
    // fill top-left rectangle up to (r,c)
    for (let i = 0; i <= r; i++)
      for (let j = 0; j <= c; j++)
        blocks[i][j] = 1;
  }
  diagramChanged();
});

// ─────────────────────────────────────────────
//  Extra actions
// ─────────────────────────────────────────────

function clearAll() {
  clearAllSilent();
  diagramChanged();
}

function setPartition() {
  const raw = document.getElementById('partition-input').value.trim();
  const parts = raw.split(/[\s,]+/).map(Number).filter(x => !isNaN(x) && x > 0);
  if (!parts.length) { showErr('Enter at least one positive integer.'); return; }

  // validate: non-increasing
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] > parts[i-1]) { showErr('Rows must be non-increasing.'); return; }
  }
  if (Math.max(...parts) > gridCols || parts.length > gridRows) {
    showErr(`Max ${gridCols} columns and ${gridRows} rows for the current canvas.`); return;
  }

  clearErr();
  clearAllSilent();
  for (let r = 0; r < parts.length; r++)
    for (let c = 0; c < parts[r]; c++)
      blocks[r][c] = 1;
  diagramChanged();
}

function clearAllSilent() {
  resetBlocks();
}

function conjugate() {
  const rows = rowLengths();
  if (!rows.length) return;
  const cols = colLengths();
  if (cols.length > gridRows || (cols[0] || 0) > gridCols) {
    const hint = document.getElementById('box-hint');
    if (hint) hint.textContent = `Conjugate needs ${cols[0] || 0} columns × ${cols.length} rows. Increase the canvas size first.`;
    return;
  }
  clearAllSilent();
  for (let r = 0; r < cols.length; r++)
    for (let c = 0; c < cols[r]; c++)
      blocks[r][c] = 1;
  diagramChanged();
}

function complement() {
  const rows = rowLengths();
  if (!rows.length) return;
  const R = rows.length;
  const C = rows[0];
 
  // Step 1: collect cells in the R×C box that are NOT in λ
  const missing = [];
  for (let r = 0; r < R; r++)
    for (let c = rows[r]; c < C; c++)
      missing.push([r, c]);
 
  // Step 2: rotate each missing cell 180° within the box → (R-1-r, C-1-c)
  // These rotated cells form a valid Young diagram when sorted.
  // Build the new block grid from them.
  const newBlocks = makeEmptyBlocks();
  for (const [r, c] of missing) {
    newBlocks[R - 1 - r][C - 1 - c] = 1;
  }
 
  for (let r = 0; r < gridRows; r++)
    for (let c = 0; c < gridCols; c++)
      blocks[r][c] = newBlocks[r][c];
  diagramChanged();
}
 

// ─────────────────────────────────────────────
//  Export
// ─────────────────────────────────────────────
function exportLaTeX() {
  const rows = rowLengths();
  if (!rows.length) { document.getElementById('export-out').value = '% empty diagram'; return; }

  let s = '\\begin{ytableau}\n';
  for (let r = 0; r < rows.length; r++) {
    const cells = [];
    for (let c = 0; c < rows[r]; c++) {
      const h = hookLen(r, c);
      cells.push(showHooks() ? h : '\\none');
    }
    s += '  ' + cells.join(' & ') + (r < rows.length-1 ? ' \\\\' : '') + '\n';
  }
  s += '\\end{ytableau}\n% Requires \\usepackage{ytableau}';
  document.getElementById('export-out').value = s;
}

function exportSVG() {
  const rows = rowLengths();
  const bs = 36;
  const cols = rows.length ? rows[0] : 0;
  const W_svg = cols * bs;
  const H_svg = rows.length * bs;

  if (!rows.length) { document.getElementById('export-out').value = '<!-- empty -->'; return; }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_svg}" height="${H_svg}">\n`;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r]; c++) {
      const h = hookLen(r, c);
      const hue = (160 + h * 6) % 360;
      const fill = shadeHooks() ? `hsl(${hue},45%,62%)` : `hsl(210,40%,68%)`;
      svg += `  <rect x="${c*bs}" y="${r*bs}" width="${bs}" height="${bs}" fill="${fill}" stroke="#2a1e12" stroke-width="0.8"/>\n`;
      if (showHooks()) {
        svg += `  <text x="${c*bs+bs/2}" y="${r*bs+bs/2+5}" text-anchor="middle" font-family="monospace" font-size="13" fill="#1a1612">${h}</text>\n`;
      }
    }
  }
  svg += `</svg>`;
  document.getElementById('export-out').value = svg;
}

function copyShape() {
  const rows = rowLengths();
  const s = rows.length ? '(' + rows.join(', ') + ')' : '( )';
  document.getElementById('export-out').value = s;
  navigator.clipboard?.writeText(s);
}

// ─────────────────────────────────────────────
//  Error helpers
// ─────────────────────────────────────────────
function showErr(msg) { document.getElementById('part-err').textContent = msg; }
function clearErr()   { document.getElementById('part-err').textContent = ''; }


// ─────────────────────────────────────────────
//  BRANCHING RULES  (Littlewood restriction)
//
//  GL(2n) → Sp(2n):
//    [V^λ_GL : V^μ_Sp] = Σ_{δ even-row} c^λ_{δ' μ}
//    where δ' is the conjugate of δ (= δ has even parts ⟺ δ' has even columns)
//
//  GL(n) → O(n):
//    [V^λ_GL : V^μ_O]  = Σ_{δ even-row} c^λ_{δ μ}
//
//  We enumerate all δ with even parts and |δ| + |μ| = |λ|,
//  then sum the LR coefficients c^λ_{ν μ} where ν = δ' (Sp) or ν = δ (O).
// ─────────────────────────────────────────────
// --- LR coefficient c^lam_{mu nu} via the standard algorithm ---
// Count LR tableaux of skew shape lam/mu filled with content nu.
// lam, mu, nu are arrays of row-lengths (non-increasing, trailing zeros omitted).
function lrCoeff(lam, mu, nu) {
  // Basic size check
  const szLam = lam.reduce((a,b)=>a+b,0);
  const szMu  = mu.reduce((a,b)=>a+b,0);
  const szNu  = nu.reduce((a,b)=>a+b,0);
  if (szLam !== szMu + szNu) return 0;
  // lam must contain mu
  for (let i = 0; i < Math.max(lam.length, mu.length); i++) {
    if ((lam[i]||0) < (mu[i]||0)) return 0;
  }
  // Build the skew shape lam/mu as a list of cells (r,c)
  // and fill them with a Yamanouchi word of content nu using backtracking.
  // We count fillings where:
  //   1. rows are weakly increasing
  //   2. columns are strictly increasing
  //   3. the reverse reading word is a lattice permutation of content nu
  const numRows = lam.length;
  // Precompute row ranges
  const rowStart = [];
  const rowEnd   = [];
  for (let r = 0; r < numRows; r++) {
    rowStart[r] = mu[r] || 0;
    rowEnd[r]   = lam[r] || 0;
  }
  // Total cells
  const cells = [];
  for (let r = 0; r < numRows; r++)
    for (let c = rowStart[r]; c < rowEnd[r]; c++)
      cells.push([r, c]);
  if (cells.length === 0) return (szNu === 0) ? 1 : 0;
  const numLetters = nu.length;
  if (numLetters === 0) return 0;
  // filling[i] = letter (1-indexed) assigned to cells[i]
  const filling = new Array(cells.length).fill(0);
  // For lattice permutation check: count of each letter seen so far
  // reading cells in REVERSE order (reverse reading word)
  // We build the filling left-to-right, top-to-bottom (standard cell order).
  // The reverse reading word reads bottom-to-top, right-to-left.
  // Lattice condition on reverse reading word: for each prefix of the reverse word,
  //   count(k) >= count(k+1) for all k.
  // Equivalently, as we place cells in forward order, after placing each cell,
  //   in the SUFFIX from that cell to the end of the reverse word, we need
  //   count of k+1 <= count of k for all k.
  // It is easier to track counts as we go in reverse.
  // We use a standard recursive approach placing cells in order.
  // Let's use the classic approach:
  // Place cells in reading order (left→right, top→bottom).
  // After all cells placed, check that the reverse reading word is a ballot sequence.
  // But for efficiency, prune early using partial ballot check on the partial reverse word.
  // The reverse reading word reads: last cell first.
  // As we place cells[0..k], the reverse word for those k+1 cells
  // is filling[k], filling[k-1], ..., filling[0].
  // Lattice: every prefix of this must have count(i) >= count(i+1) for all i.
  // So after placing filling[0..k], the "current prefix of reverse word" of length k+1
  // is filling[k], ..., filling[0].
  // We need: for every j in [0..k], the sub-sequence filling[j],filling[j-1],...,filling[0]
  // satisfies count(i)>=count(i+1).
  // This is equivalent to: the suffix filling[0..j] has, for each letter pair (i,i+1),
  //   count(i) >= count(i+1).  (Standard ballot condition on the forward word read backwards.)
  // Track suffix counts: suffCount[letter] = how many times letter appears in filling[0..current]
  const suffCount = new Array(numLetters + 1).fill(0);
  // remaining supply of each letter
  const supply = nu.slice();
  // We also need row/column constraints.
  // For row weak increase: filling[i] >= filling[prev cell in same row]
  // For col strict increase: filling[i] > filling[prev cell in same column]
  // Build prev-in-row and prev-in-col indices for each cell
  const prevInRow = new Array(cells.length).fill(-1);
  const prevInCol = new Array(cells.length).fill(-1);
  const lastInRow = {}; // row -> last cell index
  const lastInCol = {}; // col -> last cell index
  for (let i = 0; i < cells.length; i++) {
    const [r, c] = cells[i];
    if (lastInRow[r] !== undefined) prevInRow[i] = lastInRow[r];
    if (lastInCol[c] !== undefined) prevInCol[i] = lastInCol[c];
    lastInRow[r] = i;
    lastInCol[c] = i;
  }
  let count = 0;
  function bt(i) {
    if (i === cells.length) { count++; return; }
    // Determine valid range for filling[i]
    let lo = 1;
    let hi = numLetters;
    if (prevInRow[i] >= 0) lo = Math.max(lo, filling[prevInRow[i]]);       // weak row increase
    if (prevInCol[i] >= 0) lo = Math.max(lo, filling[prevInCol[i]] + 1);   // strict col increase
    for (let v = lo; v <= hi; v++) {
      if (supply[v-1] === 0) continue;
      // Ballot check: after adding v at position i,
      // the new prefix of the reverse word (of length i+1) is v, filling[i-1], ..., filling[0].
      // The new prefix adds v at the FRONT. This only affects the count of v.
      // We need: count(v) after adding <= count(v-1) after adding  (if v > 1)
      // i.e. suffCount[v] + 1 <= suffCount[v-1]  (for v > 1)
      if (v > 1 && suffCount[v] + 1 > suffCount[v-1]) continue;
      filling[i] = v;
      supply[v-1]--;
      suffCount[v]++;
      bt(i + 1);
      supply[v-1]++;
      suffCount[v]--;
      filling[i] = 0;
    }
  }
  bt(0);
  return count;
}
// --- Generate all partitions with even parts and given size ---
function partitionsEvenParts(size, maxPart) {
  // partitions of `size` into even parts, each part <= maxPart (even)
  const result = [];
  function gen(rem, max, current) {
    if (rem === 0) { result.push(current.slice()); return; }
    for (let p = Math.min(max, rem); p >= 2; p -= 2) {
      if (p > rem) continue;
      current.push(p);
      gen(rem - p, p, current);
      current.pop();
    }
  }
  gen(size, maxPart % 2 === 0 ? maxPart : maxPart - 1, []);
  return result;
}
// Conjugate a partition
function conjugatePart(mu) {
  if (!mu.length) return [];
  const maxLen = mu[0];
  const result = [];
  for (let c = 0; c < maxLen; c++) {
    let len = 0;
    for (let r = 0; r < mu.length; r++) {
      if (mu[r] > c) len++; else break;
    }
    result.push(len);
  }
  return result;
}
// Trim trailing zeros
function trimPart(p) {
  const r = p.slice();
  while (r.length && r[r.length-1] === 0) r.pop();
  return r;
}
// --- Generate all partitions of a given size with at most maxRows rows ---
function partitionsOfSize(size, maxRows, maxPart) {
  const result = [];
  function gen(rem, max, current) {
    if (current.length > maxRows) return;
    if (rem === 0) { result.push(current.slice()); return; }
    for (let p = Math.min(max, rem); p >= 1; p--) {
      current.push(p);
      gen(rem - p, p, current);
      current.pop();
    }
  }
  gen(size, maxPart || size, []);
  return result;
}
// --- Draw a small Young diagram as inline SVG ---
function miniDiagram(mu, hue) {
  if (!mu.length) {
    return '<span style="font-family:\'JetBrains Mono\',monospace;font-size:0.78rem;color:var(--muted);">∅ (trivial)</span>';
  }
  const bs = 14;
  const W = mu[0] * bs;
  const H = mu.length * bs;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:inline-block;vertical-align:middle;">`;
  for (let r = 0; r < mu.length; r++) {
    for (let c = 0; c < mu[r]; c++) {
      svg += `<rect x="${c*bs}" y="${r*bs}" width="${bs}" height="${bs}" fill="hsl(${hue},40%,70%)" stroke="hsl(${hue},30%,35%)" stroke-width="0.7"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}
// --- Main branching computation ---
function computeBranching() {
  if (!isCardExpandedById('br-output')) return;
  const lam = rowLengths();
  const rule = document.getElementById('br-rule').value;
  const out  = document.getElementById('br-output');
  const warn = document.getElementById('br-warning');
  out.innerHTML = '';
  warn.textContent = '';
  if (!lam.length) {
    out.innerHTML = '<span class="hint">Draw a Young diagram first.</span>';
    return;
  }
  const szLam = lam.reduce((a,b)=>a+b,0);
  // For GL(2n)→Sp(2n): sum over δ with even parts, use ν = δ' (conjugate of δ)
  // For GL(n)→O(n):   sum over δ with even parts, use ν = δ directly
  // multiplicity of μ = Σ_δ c^λ_{ν μ}  where ν as above, |ν|+|μ|=|λ|
  // We'll accumulate multiplicities indexed by μ
  const multMap = new Map(); // key = JSON.stringify(mu), value = {mu, mult}
  // The max size of δ is |λ|, max single part is |λ|
  for (let szDelta = 0; szDelta <= szLam; szDelta += 2) {
    // All even-part partitions of szDelta
    const deltas = partitionsEvenParts(szDelta, szLam);
    const szMu = szLam - szDelta;
    for (const delta of deltas) {
      // nu = δ' for Sp rule, nu = δ for O rule
      const nu = (rule === 'gl-sp') ? conjugatePart(delta) : delta;
      // All partitions μ of szMu (any number of rows, parts ≤ λ[0])
      const mus = partitionsOfSize(szMu, lam.length + delta.length + 2, lam[0] + (delta[0]||0));
      for (const mu of mus) {
        const c = lrCoeff(lam, mu, nu);
        if (c === 0) continue;
        const key = JSON.stringify(mu);
        if (!multMap.has(key)) multMap.set(key, {mu: mu.slice(), mult: 0});
        multMap.get(key).mult += c;
      }
    }
  }
  if (multMap.size === 0) {
    out.innerHTML = '<span class="hint">No constituents found (empty decomposition).</span>';
    return;
  }
  // Sort by partition (lex on row lengths descending)
  const entries = [...multMap.values()].sort((a, b) => {
    for (let i = 0; i < Math.max(a.mu.length, b.mu.length); i++) {
      const d = (b.mu[i]||0) - (a.mu[i]||0);
      if (d !== 0) return d;
    }
    return 0;
  });
  // Warn if outside stable range
  const n = (rule === 'gl-sp') ? Math.floor(lam.length) : lam.length;
  const glRank = (rule === 'gl-sp') ? lam.length * 2 : lam.length;
  if (lam.length > Math.floor(glRank / 2)) {
    warn.textContent = '⚠ Outside stable range — result may be incomplete (modification rules needed).';
  }
  // Render formula line + small diagrams
  const subLabel = rule === 'gl-sp' ? 'Sp' : 'O';
  const hue = rule === 'gl-sp' ? 200 : 30;
  // Formula string
  let formula = 'V<sup>λ</sup><sub>GL</sub> = ';
  formula += entries.map(({mu, mult}) => {
    const muStr = mu.length ? '(' + mu.join(',') + ')' : '∅';
    return `${mult > 1 ? mult+'·' : ''}V<sup>${muStr}</sup><sub>${subLabel}</sub>`;
  }).join(' ⊕ ');
  const formulaDiv = document.createElement('div');
  formulaDiv.style.cssText = 'font-size:0.82rem;line-height:1.7;word-break:break-word;padding:6px 0 4px;border-bottom:1px dotted var(--border);';
  formulaDiv.innerHTML = formula;
  out.appendChild(formulaDiv);
  // Individual rows with mini diagram
  for (const {mu, mult} of entries) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:3px 0;border-bottom:1px dotted var(--border);';
    const multSpan = document.createElement('span');
    multSpan.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:0.78rem;color:var(--accent);min-width:24px;text-align:right;flex-shrink:0;';
    multSpan.textContent = mult > 1 ? `×${mult}` : '×1';
    const diag = document.createElement('span');
    diag.innerHTML = miniDiagram(mu, hue);
    const label = document.createElement('span');
    label.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:0.72rem;color:var(--muted);';
    label.textContent = mu.length ? '(' + mu.join(', ') + ')' : '( )';
    row.appendChild(multSpan);
    row.appendChild(diag);
    row.appendChild(label);
    out.appendChild(row);
  }
}

// ─────────────────────────────────────────────
//  Drag-and-drop card reordering
// ─────────────────────────────────────────────
(function () {
  let dragSrc = null;
  let dragHandle = null;
  let placeholder = null;
  const pointerListenerOpts = { passive: false };
  function getSide() { return document.querySelector('.side'); }
  function createPlaceholder(height) {
    const el = document.createElement('div');
    el.id = 'dnd-placeholder';
    el.style.cssText = `height:${height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;transition:height 0.15s;`;
    return el;
  }
  function removePlaceholder() {
    const old = document.getElementById('dnd-placeholder');
    if (old) old.remove();
  }
  function cardFromHandle(el) {
    // walk up from the handle/head to the .card
    let node = el;
    while (node && !node.classList.contains('card')) node = node.parentElement;
    return node;
  }
  function initDnd() {
    const side = getSide();
    if (!side || side.dataset.dndReady === '1') return;
    side.dataset.dndReady = '1';
    // We use pointer events for smooth cross-device behaviour.
    // `touch-action: none` on the handle plus pointer capture keeps mobile browsers
    // from converting a small drag into page scrolling and firing pointercancel.
    side.addEventListener('pointerdown', onPointerDown, pointerListenerOpts);
    side.addEventListener('click', suppressHandleClick, true);
  }
  let pointerId = null;
  let dragging  = false;
  let startY    = 0;
  let cardH     = 0;
  let cardTop   = 0;
  let cardLeft  = 0;
  let cardWidth = 0;
  let ghost     = null;
  let ghostOffY = 0;
  let suppressToggleUntil = 0;
  function suppressHandleClick(e) {
    // Tapping or dragging the handle should reorder only, not expand/collapse the card.
    if (!e.target.closest('.drag-handle')) return;
    e.preventDefault();
    e.stopPropagation();
  }
  function onPointerDown(e) {
    // Only trigger when clicking/touching the drag-handle.
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    e.stopPropagation();
    const card = cardFromHandle(handle);
    if (!card) return;
    dragSrc  = card;
    dragHandle = handle;
    pointerId = e.pointerId;
    startY   = e.clientY;
    const _r  = card.getBoundingClientRect();
    cardH    = _r.height;
    cardTop  = _r.top;
    cardLeft = _r.left;
    cardWidth= _r.width;
    dragging = false;
    if (dragHandle.setPointerCapture) {
      try { dragHandle.setPointerCapture(pointerId); } catch (_) {}
    }
    document.addEventListener('pointermove', onPointerMove, pointerListenerOpts);
    document.addEventListener('pointerup',   onPointerUp, pointerListenerOpts);
    document.addEventListener('pointercancel', onPointerCancel, pointerListenerOpts);
  }
  function onPointerMove(e) {
    if (!dragSrc || (pointerId !== null && e.pointerId !== pointerId)) return;
    e.preventDefault();
    const dy = Math.abs(e.clientY - startY);
    if (!dragging && dy < 6) return; // dead zone
    if (!dragging) {
      // Start drag
      dragging = true;
      suppressToggleUntil = Date.now() + 500;
      document.body.classList.add('card-dragging');
      dragSrc.classList.add('dragging');
      // Insert placeholder where the card was
      placeholder = createPlaceholder(cardH);
      dragSrc.parentElement.insertBefore(placeholder, dragSrc);
      // Build ghost (visual clone following the pointer)
      ghost = dragSrc.cloneNode(true);
      ghost.id = 'dnd-ghost';
      // Use rect captured at pointerdown — before placeholder is inserted and shifts the DOM
      ghostOffY = startY - cardTop;
      Object.assign(ghost.style, {
        position: 'fixed',
        left: cardLeft + 'px',
        width: cardWidth + 'px',
        top: (e.clientY - ghostOffY) + 'px',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: '0.88',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        borderRadius: '4px',
        transition: 'none',
        touchAction: 'none',
      });
      document.body.appendChild(ghost);
      // Remove card from flow (keep placeholder)
      dragSrc.style.display = 'none';
    }
    // Move ghost
    ghost.style.top = (e.clientY - ghostOffY) + 'px';
    // Find insertion point
    const side  = getSide();
    const cards = [...side.children].filter(c => c !== placeholder && c !== dragSrc && c.id !== 'dnd-ghost');
    let insertBefore = null;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertBefore = card;
        break;
      }
    }
    if (insertBefore) {
      side.insertBefore(placeholder, insertBefore);
    } else {
      side.appendChild(placeholder);
    }
  }
  function finishDrag() {
    document.removeEventListener('pointermove', onPointerMove, pointerListenerOpts);
    document.removeEventListener('pointerup',   onPointerUp, pointerListenerOpts);
    document.removeEventListener('pointercancel', onPointerCancel, pointerListenerOpts);
    document.body.classList.remove('card-dragging');
    if (dragHandle && dragHandle.releasePointerCapture && pointerId !== null) {
      try { dragHandle.releasePointerCapture(pointerId); } catch (_) {}
    }
    if (!dragSrc) return;
    if (dragging) {
      // Drop: put card where placeholder is. If a rare pointercancel still happens,
      // this restores the card instead of leaving it hidden.
      dragSrc.style.display = '';
      dragSrc.classList.remove('dragging');
      if (placeholder && placeholder.parentElement) {
        placeholder.parentElement.insertBefore(dragSrc, placeholder);
      }
      removePlaceholder();
      if (ghost) { ghost.remove(); ghost = null; }
      suppressToggleUntil = Date.now() + 500;
    }
    dragSrc  = null;
    dragHandle = null;
    dragging = false;
    placeholder = null;
    pointerId   = null;
  }
  function onPointerUp(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    e.preventDefault();
    finishDrag();
  }
  function onPointerCancel(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    finishDrag();
  }
  // Toggle card — but NOT when dragging or just after dragging.
  const _origToggle = window.toggleCard;
  window.toggleCard = function(headEl) {
    if (dragging || Date.now() < suppressToggleUntil) return;
    _origToggle(headEl);
  };
  document.addEventListener('DOMContentLoaded', initDnd);
  // Also init immediately if DOM is ready
  if (document.readyState !== 'loading') initDnd();
})();

// ─────────────────────────────────────────────
//  LIE ALGEBRA WEIGHT INVARIANTS
//  Classical: A_n, B_n, C_n, D_n  (n = rank)
//  Exceptional: G2, F4, E6, E7, E8
//  Uses universal Weyl formula: prod<λ+ρ,α∨> / prod<ρ,α∨>
//  Orbit generated by Cartan-matrix reflections in Dynkin-label space.
// ─────────────────────────────────────────────
// ── Rational arithmetic with BigInt ──
function bgcd(a, b) { a=a<0n?-a:a; b=b<0n?-b:b; while(b){[a,b]=[b,a%b];} return a; }
function bf([a,b],[c,d]){                          // multiply two fractions
  const g1=bgcd(a<0n?-a:a,d<0n?-d:d), g2=bgcd(c<0n?-c:c,b<0n?-b:b);
  return [(a/g1)*(c/g2),(b/g2)*(d/g1)];
}
function bfint([a,b]){ if(b!==1n) throw new Error(`${a}/${b} not integer`); return a; }
// ── Cartan matrices ──
function cartanMatrix(typeStr) {
  // typeStr: "A:n", "B:n", "C:n", "D:n", "G2", "F4", "E6", "E7", "E8"
  const [type, nStr] = typeStr.includes(':') ? typeStr.split(':') : [typeStr, ''];
  const n = nStr ? parseInt(nStr) : 0;
  const C = [];
  const make = (n, cb) => { const C=[]; for(let i=0;i<n;i++){C.push([]); for(let j=0;j<n;j++) C[i][j]=cb(i,j);} return C; };
  if (type === 'A') {
    return make(n, (i,j) => i===j?2:Math.abs(i-j)===1?-1:0);
  }
  if (type === 'B') return makeBn(n);
  if (type === 'C') return makeCn(n);
  if (type === 'D') return makeDn(n);
  if (type === 'G2') return [[2,-1],[-3,2]];
  if (type === 'F4') return [[2,-1,0,0],[-1,2,-2,0],[0,-1,2,-1],[0,0,-1,2]];
  if (type === 'E6') {
    // Bourbaki E6: nodes 1-2-3-4-5 chain, node 3 also connects to 6
    const C = make(6, (i,j)=>i===j?2:0);
    [[0,1],[1,2],[2,3],[3,4],[2,5]].forEach(([a,b])=>{C[a][b]=-1;C[b][a]=-1;});
    return C;
  }
  if (type === 'E7') {
    const C = make(7, (i,j)=>i===j?2:0);
    [[0,1],[1,2],[2,3],[3,4],[4,5],[2,6]].forEach(([a,b])=>{C[a][b]=-1;C[b][a]=-1;});
    return C;
  }
  if (type === 'E8') {
    const C = make(8, (i,j)=>i===j?2:0);
    [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,7]].forEach(([a,b])=>{C[a][b]=-1;C[b][a]=-1;});
    return C;
  }
}
function makeBn(n) {
  const C = [];
  for(let i=0;i<n;i++){C.push([]); for(let j=0;j<n;j++){
    if(i===j) C[i][j]=2;
    else if(Math.abs(i-j)===1) C[i][j]=-1;
    else C[i][j]=0;
  }}
  C[n-2][n-1]=-1; C[n-1][n-2]=-2; // B_n: last node short; overwrite
  return C;
}
function makeCn(n) {
  const C = [];
  for(let i=0;i<n;i++){C.push([]); for(let j=0;j<n;j++){
    if(i===j) C[i][j]=2;
    else if(Math.abs(i-j)===1) C[i][j]=-1;
    else C[i][j]=0;
  }}
  C[n-2][n-1]=-2; C[n-1][n-2]=-1; // C_n: last node long; <α_{n-1},α_n∨>=-2
  return C;
}
function makeDn(n) {
  const C = [];
  for(let i=0;i<n;i++){C.push([]); for(let j=0;j<n;j++){
    if(i===j) C[i][j]=2;
    else if(i<n-2&&Math.abs(i-j)===1) C[i][j]=-1;
    else C[i][j]=0;
  }}
  // D_n: last two nodes both connect to node n-2 (0-indexed: n-3)
  C[n-3][n-2]=-1; C[n-2][n-3]=-1;
  C[n-3][n-1]=-1; C[n-1][n-3]=-1;
  return C;
}
// ── Positive root/coroot enumeration via Cartan matrix ──
function positiveRoots(C) {
  const n = C.length;
  const simple = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => i===j?1:0));
  const roots = new Map();
  simple.forEach(r => roots.set(r.join(','), r));
  const queue = simple.map(r => r.slice());
  while (queue.length) {
    const r = queue.pop();
    for (let i=0; i<n; i++) {
      const bracket = r.reduce((s,v,j) => s + v*C[j][i], 0);
      const nr = r.map((v,j) => j===i ? v-bracket : v);
      if (nr.every(x=>x>=0) && !roots.has(nr.join(','))) {
        roots.set(nr.join(','), nr);
        queue.push(nr);
      }
    }
  }
  return [...roots.values()];
}
function positiveCoroots(C) {
  // Coroots = positive roots of the DUAL algebra (transpose Cartan matrix)
  const CT = C.map((_,i) => C.map((_,j) => C[j][i]));
  return positiveRoots(CT);
}
// ── Weyl dimension formula ──
function weylDimGeneral(coroots, dynkinLabels) {
  const a = dynkinLabels;
  let num = [1n,1n], den = [1n,1n];
  for (const cr of coroots) {
    const lpr = cr.reduce((s,v,j) => s + (a[j]+1)*v, 0);
    const rho = cr.reduce((s,v) => s+v, 0);
    num = bf(num, [BigInt(lpr), 1n]);
    den = bf(den, [BigInt(rho), 1n]);
  }
  return bfint(bf(num, [den[1], den[0]]));
}
// ── Dynkin labels from row lengths ──
function toDynkinLabels(typeStr, rows) {
  const [type, nStr] = typeStr.includes(':') ? typeStr.split(':') : [typeStr, ''];
  const n = nStr ? parseInt(nStr) : {G2:2,F4:4,E6:6,E7:7,E8:8}[typeStr];
  // Pad rows to length n
  const lam = Array.from({length:n}, (_,i) => rows[i]||0);
  // For classical types, Dynkin labels = differences (with special last element)
  // For exceptional, the "rows" are directly interpreted as Dynkin labels a_1,...,a_n
  // (since there's no natural "row-length-to-weight" map for exceptional types)
  if (type === 'A') {
    // A_n = sl(n+1), rank n, lam has length n; Dynkin labels a_i = λ_i - λ_{i+1}
    return Array.from({length:n}, (_,i) => lam[i] - (lam[i+1]||0));
  }
  if (type === 'B' || type === 'C') {
    const labels = Array.from({length:n-1}, (_,i) => lam[i]-lam[i+1]);
    if (type === 'B') labels.push(2*lam[n-1]);   // a_n = 2λ_n for B_n
    else              labels.push(lam[n-1]);       // a_n = λ_n for C_n
    return labels;
  }
  if (type === 'D') {
    const labels = Array.from({length:n-2}, (_,i) => lam[i]-lam[i+1]);
    labels.push(lam[n-2]-lam[n-1]); // a_{n-1}
    labels.push(lam[n-2]+lam[n-1]); // a_n
    return labels;
  }
  // Exceptional: row lengths ARE the Dynkin labels directly
  return lam.slice(0, n);
}
function rankOf(typeStr) {
  if (typeStr.includes(':')) return parseInt(typeStr.split(':')[1]);
  return {G2:2,F4:4,E6:6,E7:7,E8:8}[typeStr];
}
// ── Weyl orbit in Dynkin-label space ──
function weylOrbitDynkin(C, dynkinLabels) {
  const n = C.length;
  const lam = dynkinLabels.slice();
  const orbit = new Map();
  orbit.set(lam.join(','), lam.slice());
  const queue = [lam.slice()];
  while (queue.length) {
    const mu = queue.pop();
    for (let i=0; i<n; i++) {
      const ai = mu[i];  // <mu, αi∨> = a_i in Dynkin-label coords
      const nmu = mu.map((v,j) => v - ai*C[i][j]);
      const key = nmu.join(',');
      if (!orbit.has(key)) { orbit.set(key, nmu); queue.push(nmu); }
    }
  }
  return [...orbit.values()].sort((a,b) => {
    for(let i=0;i<a.length;i++){if(a[i]!==b[i])return b[i]-a[i];} return 0;
  });
}
// ── State ──
let _lieOrbit = [];
let _orbitVisible = false;
let _cachedCartan = null;
let _cachedCoroots = null;
let _cachedTypeStr = '';
function onTypeChange() {
  const type = document.getElementById('lie-type').value;
  const isClassical = ['A','B','C','D'].includes(type);
  const rankWrap = document.getElementById('lie-rank-wrap');
  rankWrap.style.display = isClassical ? 'flex' : 'none';
  // Set sensible default rank and min per type
  const rankInput = document.getElementById('lie-rank');
  if (isClassical) {
    const mins = {A:1, B:2, C:2, D:3};
    rankInput.min = mins[type];
    if (parseInt(rankInput.value) < mins[type]) rankInput.value = mins[type];
  }
  // Update description label
  const desc = document.getElementById('lie-algebra-desc');
  const descMap = {
    A: n => `sl(${n+1}), rank ${n}`,
    B: n => `so(${2*n+1}), rank ${n}`,
    C: n => `sp(${2*n}), rank ${n}`,
    D: n => `so(${2*n}), rank ${n}`,
    E6: () => 'rank 6,  |W|=51840',
    E7: () => 'rank 7,  |W|=2903040',
    E8: () => 'rank 8,  |W|=696729600',
    F4: () => 'rank 4,  |W|=1152',
    G2: () => 'rank 2,  |W|=12',
  };
  const n = parseInt(rankInput.value);
  desc.textContent = isClassical ? descMap[type](n) : (descMap[type] ? descMap[type]() : '');
  computeWeyl();
}
function onAlgebraChange() {
  // Called when rank input changes — update description then recompute
  onTypeChange();
}
function currentTypeStr() {
  const type = document.getElementById('lie-type').value;
  const isClassical = ['A','B','C','D'].includes(type);
  if (!isClassical) return type;
  const n = parseInt(document.getElementById('lie-rank').value);
  return type + ':' + n;
}
function toggleOrbitTable() {
  _orbitVisible = !_orbitVisible;
  document.getElementById('lie-orbit-table').style.display = _orbitVisible ? 'block' : 'none';
  document.getElementById('lie-orbit-btn').textContent = _orbitVisible ? 'Hide Weyl orbit' : 'Show Weyl orbit';
}
function exportOrbit() {
  if (!_lieOrbit.length) return;
  const typeStr = currentTypeStr();
  const n = rankOf(typeStr);
  let out = `# Weyl orbit  type=${typeStr}  rank=${n}\n`;
  out += _lieOrbit.map(w => '(' + w.join(', ') + ')').join('\n');
  document.getElementById('export-out').value = out;
  document.querySelectorAll('.card').forEach(c => {
    if (c.querySelector('#export-out') && c.classList.contains('collapsed'))
      c.classList.remove('collapsed');
  });
}
function computeWeyl() {
  if (!isCardExpandedById('lie-weight')) return;
  const rows    = rowLengths();
  const typeStr = currentTypeStr();
  const warn    = document.getElementById('lie-warning');
  warn.textContent = '';
  const [typeBase] = typeStr.includes(':') ? typeStr.split(':') : [typeStr];
  const n = rankOf(typeStr);
  // Invalidate cache if type changed
  if (_cachedTypeStr !== typeStr) {
    _cachedCartan   = cartanMatrix(typeStr);
    _cachedCoroots  = positiveCoroots(_cachedCartan);
    _cachedTypeStr  = typeStr;
  }
  if (!rows.length) {
    ['lie-weight','lie-dynkin','lie-dim','lie-orbit-size'].forEach(id =>
      document.getElementById(id).textContent = '—');
    document.getElementById('lie-orbit-table').innerHTML = '';
    _lieOrbit = [];
    return;
  }
  // Compute Dynkin labels
  let labels;
  try { labels = toDynkinLabels(typeStr, rows); }
  catch(e) { warn.textContent = '⚠ ' + e.message; return; }
  // Warn if any label negative (non-dominant)
  if (labels.some(a => a < 0)) {
    warn.textContent = '⚠ Weight is not dominant — diagram has too many rows for this rank.';
  }
  // Clamp negatives to 0 for display purposes but still show the labels
  const labelsForDim = labels.map(a => Math.max(a, 0));
  // Compute dimension
  let dim;
  try { dim = weylDimGeneral(_cachedCoroots, labelsForDim); }
  catch(e) { warn.textContent = '⚠ Dim error: ' + e.message; return; }
  // Compute orbit
  _lieOrbit = weylOrbitDynkin(_cachedCartan, labels);
  // Format weight display (for classical: show λ coordinates; for exceptional: show Dynkin labels)
  const isClassical = typeStr.includes(':');
  const lamPad = Array.from({length:n}, (_,i) => rows[i]||0);
  const weightStr = isClassical ? '(' + lamPad.join(', ') + ')' : '[' + labels.join(', ') + ']';
  document.getElementById('lie-weight').textContent      = weightStr;
  document.getElementById('lie-dynkin').textContent      = '[' + labels.join(', ') + ']';
  document.getElementById('lie-dim').textContent         = dim.toString();
  document.getElementById('lie-orbit-size').textContent  = _lieOrbit.length.toString();
  buildOrbitTable(n);
  document.getElementById('lie-orbit-table').style.display = _orbitVisible ? 'block' : 'none';
}
function buildOrbitTable(n) {
  const container = document.getElementById('lie-orbit-table');
  if (!_lieOrbit.length) { container.innerHTML = ''; return; }
  let html = `<table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:0.72rem;width:100%;margin-top:4px;">`;
  html += `<thead><tr style="background:var(--bg);">`;
  for (let i=1; i<=n; i++)
    html += `<th style="padding:3px 5px;border:1px solid var(--border);color:var(--muted);">&varpi;<sub>${i}</sub></th>`;
  html += `</tr></thead><tbody>`;
  _lieOrbit.forEach((w, idx) => {
    const bg = idx%2===0 ? '' : 'background:rgba(0,0,0,0.025);';
    html += `<tr style="${bg}">`;
    w.forEach(v => {
      const col = v > 0 ? 'color:var(--accent)' : v < 0 ? 'color:var(--accent2)' : 'color:var(--muted)';
      html += `<td style="padding:3px 5px;border:1px solid var(--border);text-align:center;${col};">${v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}


// ─────────────────────────────────────────────
//  Card collapse toggle
// ─────────────────────────────────────────────
function toggleCard(headEl) {
  const card = headEl.closest('.card');
  const isCollapsed = card.classList.toggle('collapsed');
  headEl.setAttribute('aria-expanded', String(!isCollapsed));

  if (!isCollapsed) refreshCardCalculation(card);
}


// ─────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────
window.addEventListener('load', () => {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.add('collapsed');
    const head = card.querySelector('.card-head');
    if (head) head.setAttribute('aria-expanded', 'false');
  });
  initGridSizeControls();
  resize();
  onTypeChange();   // initialise lie algebra card UI state without computing collapsed data
});
