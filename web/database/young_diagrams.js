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
const CARD_PIN_SMALL_SCREEN_QUERY = '(max-width: 980px)';
const cardPinBreakpointMedia = typeof window.matchMedia === 'function'
  ? window.matchMedia(CARD_PIN_SMALL_SCREEN_QUERY)
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

const DEFAULT_EXPORT_CITATION = `@misc{young_diagram_calculator,
  title        = {Young Diagram Calculator},
  author       = {Xiaoxiang Zhou},
  year         = {2026},
  url          = {https://ramified.github.io/web/database/young_diagrams.html},
  note         = {Browser-side applet for computations with a single Young diagram.}
}`;

function resetExportToDefaultCitation() {
  const exportOut = document.getElementById('export-out');
  if (exportOut) exportOut.value = DEFAULT_EXPORT_CITATION;
}

// ─────────────────────────────────────────────
//  Canvas setup
// ─────────────────────────────────────────────
const canvasEl = document.getElementById('yd-canvas');
const ctx = canvasEl.getContext('2d');
let W, H, bsize;

function measuredCanvasWrapWidth() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap) return 0;
  const rectWidth = wrap.getBoundingClientRect ? wrap.getBoundingClientRect().width : 0;
  return Math.max(wrap.clientWidth || 0, rectWidth || 0);
}

function resize() {
  const measuredWidth = measuredCanvasWrapWidth();
  const fallbackWidth = Math.max(160, Math.min(window.innerWidth || 360, 640) - 56);
  W = Math.max(1, (measuredWidth > 120 ? measuredWidth - 32 : fallbackWidth));
  bsize = W / gridCols;
  H = bsize * gridRows;
  canvasEl.width  = Math.round(W);
  canvasEl.height = Math.round(H);
  redraw();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', scheduleCanvasResizePasses);

function scheduleCanvasResizePasses() {
  resize();
  requestAnimationFrame(resize);
  setTimeout(resize, 80);
  setTimeout(resize, 240);
  setTimeout(resize, 600);
}

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

const showHooks   = () => {
  const el = document.getElementById('showhooks');
  return !!(el && el.checked);
};
const shadeHooks  = () => {
  const el = document.getElementById('shadehooks');
  return !!(el && el.checked);
};
const showCoords  = () => {
  const el = document.getElementById('showcoords');
  return !!(el && el.checked);
};

function redraw() {
  if (!ctx) return;
  computeHooks();
  ctx.clearRect(0, 0, W, H);
  const mobileCanvas = typeof window.matchMedia === 'function' && window.matchMedia(SMALL_SCREEN_QUERY).matches;

  // grid
  ctx.strokeStyle = mobileCanvas ? 'rgba(125,112,100,0.68)' : 'rgba(180,170,158,0.45)';
  ctx.lineWidth = mobileCanvas ? 1 : 0.8;
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
  ctx.strokeStyle = mobileCanvas ? 'rgba(30,24,18,0.82)' : 'rgba(30,24,18,0.7)';
  ctx.lineWidth = mobileCanvas ? 2 : 1.8;
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
  if (card.querySelector('#lie-weight')) {
    onTypeChange();
  }
  if (card.querySelector('#symfun-output')) {
    renderSymmetricFunctionChart();
  }
}

function refreshOpenCalculations() {
  document.querySelectorAll('.card:not(.collapsed)').forEach(refreshCardCalculation);
}

function cardByContainedId(id) {
  const el = document.getElementById(id);
  return el ? el.closest('.card') : null;
}

function setCardStaleById(id, stale = true) {
  const card = cardByContainedId(id);
  if (card) card.classList.toggle('is-stale', !!stale);
}

function diagramChanged() {
  markBranchingStale();
  setCardStaleById('symfun-output', false);
  redraw();
  refreshOpenCalculations();
  updateYoungUrlState();
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
  resetExportToDefaultCitation();
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
  setGridSize(colsInput ? colsInput.value : undefined, rowsInput ? rowsInput.value : undefined, true, true);
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

let applyingYoungUrlState = false;

function updateYoungUrlState() {
  if (applyingYoungUrlState || !window.history || !window.URLSearchParams) return;
  const params = new URLSearchParams(window.location.search);
  const rows = rowLengths();
  if (rows.length) params.set('lambda', rows.join(','));
  else params.delete('lambda');
  params.set('rows', String(gridRows));
  params.set('cols', String(gridCols));
  const typeEl = document.getElementById('lie-type');
  const rankEl = document.getElementById('lie-rank');
  const type = typeEl ? typeEl.value : undefined;
  const rank = rankEl ? rankEl.value : undefined;
  if (type) params.set('type', type);
  if (rank) params.set('rank', rank);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? '?' + query : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function applyYoungUrlState() {
  if (!window.URLSearchParams) return;
  const params = new URLSearchParams(window.location.search);
  const lambdaText = params.get('lambda');
  const nextRows = params.get('rows');
  const nextCols = params.get('cols');
  const type = params.get('type');
  const rank = params.get('rank');
  applyingYoungUrlState = true;
  try {
    if (nextRows || nextCols) setGridSize(nextCols || gridCols, nextRows || gridRows, false, true);
    if (type && document.getElementById('lie-type')) document.getElementById('lie-type').value = type;
    if (rank && document.getElementById('lie-rank')) document.getElementById('lie-rank').value = rank;
    if (lambdaText) {
      const parts = parseIntegerList(lambdaText, 'Partition rows');
      clearAllSilent();
      for (let r = 0; r < parts.length && r < gridRows; r++) {
        for (let c = 0; c < Math.min(parts[r], gridCols); c++) blocks[r][c] = 1;
      }
    }
  } catch (_) {
    clearErr();
  } finally {
    applyingYoungUrlState = false;
  }
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

function parseIntegerList(raw, label, allowZero = false) {
  const tokens = String(raw || '').split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) throw new Error(`Enter at least one ${allowZero ? 'nonnegative' : 'positive'} integer.`);
  const values = tokens.map(t => Number(t));
  if (values.some(x => !Number.isInteger(x) || x < (allowZero ? 0 : 1))) {
    throw new Error(`${label} must be ${allowZero ? 'nonnegative' : 'positive'} integers.`);
  }
  return values;
}

function drawPartitionRows(parts) {
  if (!parts.length) {
    clearErr();
    clearAllSilent();
    diagramChanged();
    return;
  }

  for (let i = 1; i < parts.length; i++) {
    if (parts[i] > parts[i - 1]) throw new Error('Rows must be non-increasing.');
  }
  if (Math.max(...parts) > gridCols || parts.length > gridRows) {
    throw new Error(`Max ${gridCols} columns and ${gridRows} rows for the current canvas.`);
  }

  clearErr();
  clearAllSilent();
  for (let r = 0; r < parts.length; r++)
    for (let c = 0; c < parts[r]; c++)
      blocks[r][c] = 1;
  diagramChanged();
}

function setPartition() {
  try {
    const raw = document.getElementById('partition-input').value.trim();
    const parts = parseIntegerList(raw, 'Partition rows');
    drawPartitionRows(parts);
    const dynkinInput = document.getElementById('dynkin-input');
    if (dynkinInput) dynkinInput.value = parts.map((x, i) => x - (parts[i + 1] || 0)).join(',');
  } catch (err) {
    showErr(err.message);
  }
}

function rowsFromDynkinLabels(labels) {
  const rows = Array(labels.length).fill(0);
  let running = 0;
  for (let i = labels.length - 1; i >= 0; i--) {
    running += labels[i];
    rows[i] = running;
  }
  return rows.filter(x => x > 0);
}

function setDynkinLabels() {
  try {
    const raw = document.getElementById('dynkin-input').value.trim();
    const labels = parseIntegerList(raw, 'Dynkin labels', true);
    const rows = rowsFromDynkinLabels(labels);
    const partitionInput = document.getElementById('partition-input');
    if (partitionInput) partitionInput.value = rows.join(',');
    drawPartitionRows(rows);
  } catch (err) {
    showErr(err.message);
  }
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
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s);
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
function bumpBranchingLRSearch(stats) {
  if (!stats) return;
  stats.steps++;
  if (stats.steps > stats.limit) {
    const err = new Error('branching-lr-search-too-large');
    err.steps = stats.steps;
    err.limit = stats.limit;
    throw err;
  }
}

function lrCoeff(lam, mu, nu, stats = null) {
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
    bumpBranchingLRSearch(stats);
    if (i === cells.length) { count++; return; }
    // Determine valid range for filling[i]
    let lo = 1;
    let hi = numLetters;
    if (prevInRow[i] >= 0) lo = Math.max(lo, filling[prevInRow[i]]);       // weak row increase
    if (prevInCol[i] >= 0) lo = Math.max(lo, filling[prevInCol[i]] + 1);   // strict col increase
    for (let v = lo; v <= hi; v++) {
      bumpBranchingLRSearch(stats);
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

function miniDiagramPlain(mu) {
  if (!mu.length) {
    return `<span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--muted);">∅</span>`;
  }
  const bs = 12;
  const W = mu[0] * bs;
  const H = mu.length * bs;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:inline-block;vertical-align:middle;">`;
  for (let r = 0; r < mu.length; r++) {
    for (let c = 0; c < mu[r]; c++) {
      svg += `<rect x="${c*bs}" y="${r*bs}" width="${bs}" height="${bs}" style="fill:var(--surface);stroke:var(--text);stroke-width:0.7"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}

function miniDiagramDecomp(mu, hue = 200) {
  if (!mu.length) {
    return `<span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--muted);">∅</span>`;
  }
  const maxWidth = 112;
  const bs = Math.max(7, Math.min(14, Math.floor(maxWidth / Math.max(mu[0], 1))));
  const W = mu[0] * bs;
  const H = mu.length * bs;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:inline-block;vertical-align:middle;">`;
  for (let r = 0; r < mu.length; r++) {
    for (let c = 0; c < mu[r]; c++) {
      svg += `<rect x="${c*bs}" y="${r*bs}" width="${bs}" height="${bs}" fill="hsl(${hue},40%,70%)" stroke="hsl(${hue},30%,35%)" stroke-width="0.7"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}
const SYMFUN_EXPANSION_PARTITION_LIMIT = 1200;
const SYMFUN_VARIABLE_MAX = MAX_GRID_COLS * MAX_GRID_ROWS;
const SYMFUN_POLYNOMIAL_TERM_LIMIT = 2400;
const SYMFUN_BASIS_CONVERSION_LIMIT = 180;
const SYMFUN_KOSTKA_STEP_LIMIT = 250000;
const SYMFUN_SCHUR_DETERMINANT_LIMIT = 8;
const SYMFUN_ORDER = ['m', 'p', 'e', 'h', 's'];
let symfunVariableCountTouched = false;
let symfunSavedFiniteVariableCount = '';
let symfunOmegaSource = 'm';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function partitionSize(part) {
  return part.reduce((sum, p) => sum + p, 0);
}

const partitionCountCache = new Map();

function partitionCount(size) {
  const n = Math.max(0, Math.floor(Number(size) || 0));
  if (partitionCountCache.has(n)) return partitionCountCache.get(n);
  const dp = Array(n + 1).fill(0n);
  dp[0] = 1n;
  for (let part = 1; part <= n; part++) {
    for (let total = part; total <= n; total++) dp[total] += dp[total - part];
  }
  partitionCountCache.set(n, dp[n]);
  return dp[n];
}

function partitionLabel(part) {
  return part.length ? '(' + part.join(', ') + ')' : '( )';
}

function symfunPartKey(part) {
  return part.join(',');
}

function partitionsOfSizeLimited(size, limit = SYMFUN_EXPANSION_PARTITION_LIMIT) {
  if (size === 0) return { parts: [[]], truncated: false };

  const parts = [];
  let truncated = false;

  function gen(rem, maxPart, current) {
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

function bigCombSmall(n, k) {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= k; i++) {
    result = (result * BigInt(n - k + i)) / BigInt(i);
  }
  return result;
}

function capacityGroups(state) {
  const groups = [];
  for (const cap of state) {
    if (cap <= 0) continue;
    const last = groups[groups.length - 1];
    if (last && last.cap === cap) {
      last.count++;
    } else {
      groups.push({ cap, count: 1 });
    }
  }
  return groups;
}

const _symfunGroupProfileCache = new Map();
const _symfunRowTransitionCache = new Map();
const _symfunPowerTransitionCache = new Map();
const _symfunKostkaCache = new Map();

function groupAllocationProfiles(cap, count, maxPerColumn) {
  const maxAlloc = maxPerColumn == null ? cap : Math.min(cap, maxPerColumn);
  const cacheKey = `${cap}|${count}|${maxAlloc}`;
  const cached = _symfunGroupProfileCache.get(cacheKey);
  if (cached) return cached;

  const profiles = [];
  const allocationCounts = [];

  function rec(allocation, remainingCount, used) {
    if (allocation > maxAlloc) {
      if (remainingCount !== 0) return;

      let ways = 1n;
      let unassigned = count;
      const caps = [];
      for (let a = 0; a <= maxAlloc; a++) {
        const take = allocationCounts[a] || 0;
        ways *= bigCombSmall(unassigned, take);
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
  _symfunGroupProfileCache.set(cacheKey, profiles);
  return profiles;
}

function sortedPositiveState(caps) {
  return caps.filter(c => c > 0).sort((a, b) => b - a);
}

function rowTransitionStates(state, rowSum, maxPerColumn) {
  const cacheKey = `${state.join(',')}|${rowSum}|${maxPerColumn == null ? 'inf' : maxPerColumn}`;
  const cached = _symfunRowTransitionCache.get(cacheKey);
  if (cached) return cached;

  const groups = capacityGroups(state);
  const byKey = new Map();

  function rec(groupIndex, used, caps, ways) {
    if (used > rowSum) return;
    if (groupIndex === groups.length) {
      if (used !== rowSum) return;
      const nextState = sortedPositiveState(caps);
      const key = symfunPartKey(nextState);
      byKey.set(key, (byKey.get(key) || 0n) + ways);
      return;
    }

    const group = groups[groupIndex];
    for (const profile of groupAllocationProfiles(group.cap, group.count, maxPerColumn)) {
      if (used + profile.used > rowSum) continue;
      rec(groupIndex + 1, used + profile.used, caps.concat(profile.caps), ways * profile.ways);
    }
  }

  rec(0, 0, [], 1n);
  const result = [...byKey.entries()].map(([key, ways]) => ({
    state: key ? key.split(',').map(Number) : [],
    ways,
  }));
  _symfunRowTransitionCache.set(cacheKey, result);
  return result;
}

function powerRowTransitionStates(state, rowSum) {
  const cacheKey = `${state.join(',')}|${rowSum}`;
  const cached = _symfunPowerTransitionCache.get(cacheKey);
  if (cached) return cached;

  const groups = capacityGroups(state);
  const byKey = new Map();

  for (let i = 0; i < groups.length; i++) {
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

    const nextState = sortedPositiveState(caps);
    const key = symfunPartKey(nextState);
    byKey.set(key, (byKey.get(key) || 0n) + BigInt(group.count));
  }

  const result = [...byKey.entries()].map(([key, ways]) => ({
    state: key ? key.split(',').map(Number) : [],
    ways,
  }));
  _symfunPowerTransitionCache.set(cacheKey, result);
  return result;
}

function kostkaNumber(shapeRows, contentRows) {
  const shape = trimPart(shapeRows);
  const content = trimPart(contentRows);
  const total = partitionSize(shape);
  if (total !== partitionSize(content)) return 0n;
  if (total === 0) return 1n;
  if (!content.length) return 0n;

  const cacheKey = `${shape.join(',')}|${content.join(',')}`;
  const cached = _symfunKostkaCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const cells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r]; c++) cells.push([r, c]);
  }

  const grid = shape.map(len => Array(len).fill(0));
  const supply = content.slice();
  let count = 0n;
  let steps = 0;

  function rec(i) {
    if (++steps > SYMFUN_KOSTKA_STEP_LIMIT) {
      throw new Error('kostka-too-large');
    }
    if (i === cells.length) {
      count += 1n;
      return;
    }

    const [r, c] = cells[i];
    let lo = 1;
    if (c > 0) lo = Math.max(lo, grid[r][c - 1]);
    if (r > 0 && c < shape[r - 1]) lo = Math.max(lo, grid[r - 1][c] + 1);

    for (let v = lo; v <= content.length; v++) {
      if (supply[v - 1] <= 0) continue;
      grid[r][c] = v;
      supply[v - 1] -= 1;
      rec(i + 1);
      supply[v - 1] += 1;
      grid[r][c] = 0;
    }
  }

  rec(0);
  _symfunKostkaCache.set(cacheKey, count);
  return count;
}

function countRowTransitionCoefficient(lambda, mu, transitionForRow) {
  const memo = new Map();

  function rec(rowIndex, state) {
    const key = `${rowIndex}|${state.join(',')}`;
    if (memo.has(key)) return memo.get(key);
    if (rowIndex === lambda.length) {
      const value = state.length === 0 ? 1n : 0n;
      memo.set(key, value);
      return value;
    }

    let total = 0n;
    for (const next of transitionForRow(state, lambda[rowIndex])) {
      total += next.ways * rec(rowIndex + 1, next.state);
    }
    memo.set(key, total);
    return total;
  }

  return rec(0, mu.slice());
}

function coefficientForBasis(kind, lambda, mu) {
  if (lambda.length === 0) return mu.length === 0 ? 1n : 0n;
  if (kind === 'm') return symfunPartKey(lambda) === symfunPartKey(mu) ? 1n : 0n;
  if (kind === 's') return kostkaNumber(lambda, mu);
  if (kind === 'p') return countRowTransitionCoefficient(lambda, mu, powerRowTransitionStates);
  if (kind === 'e') return countRowTransitionCoefficient(lambda, mu, (state, rowSum) => rowTransitionStates(state, rowSum, 1));
  return countRowTransitionCoefficient(lambda, mu, (state, rowSum) => rowTransitionStates(state, rowSum, null));
}

function expansionForBasis(kind, lambda, partitions) {
  return partitions.map(mu => ({
    part: mu,
    coeff: coefficientForBasis(kind, lambda, mu),
  }));
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

function symfunDefinition(kind) {
  if (kind === 'm') return 'Monomial symmetric function: m_lambda is the sum of all distinct monomials whose exponent multiset is lambda.';
  if (kind === 's') return 'Schur function: s_lambda is the semistandard Young tableau generating function of shape lambda; equivalently s_lambda = det(h_{lambda_i-i+j}).';
  if (kind === 'p') return 'Power-sum symmetric function: p_lambda = product_j p_{lambda_j}, where p_k = sum_i x_i^k.';
  if (kind === 'e') return 'Elementary symmetric function: e_lambda = product_j e_{lambda_j}, where e_k = sum_{i_1<...<i_k} x_{i_1}...x_{i_k}.';
  return 'Complete homogeneous symmetric function: h_lambda = product_j h_{lambda_j}, where h_k = sum_{i_1<=...<=i_k} x_{i_1}...x_{i_k}.';
}

function symfunSymbolHTML(kind, partLabel = '&lambda;') {
  return `<span class="symfun-symbol tooltip-label" tabindex="0" data-tooltip="${escapeHtml(symfunDefinition(kind))}">${kind}<sub>${partLabel}</sub></span>`;
}

function symmetricBasisSymbol(kind, part) {
  return `<span class="symfun-symbol">${kind}<sub>${escapeHtml(partitionLabel(part))}</sub></span>`;
}

function formatSymRatCoefficient(coeff) {
  const abs = symRatAbs(coeff);
  return abs.d === 1n ? abs.n.toString() : `${abs.n.toString()}/${abs.d.toString()}`;
}

function formatBasisLinearCombination(terms, basisKind) {
  const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
  if (!nonzero.length) return '0';

  return nonzero.map(({ coeff, part }, index) => {
    const negative = coeff.n < 0n;
    const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
    const symbol = symmetricBasisSymbol(basisKind, part);
    const coeffText = symRatIsOneAbs(coeff)
      ? ''
      : `<span class="symfun-coeff">${formatSymRatCoefficient(coeff)}</span>`;
    return `${sign}${coeffText}${symbol}`;
  }).join('');
}

function generatorSymbolHTML(kind, n) {
  return `<span class="symfun-symbol">${kind}<sub>${n}</sub></span>`;
}

function generatorMonomialHTML(part, generatorKind) {
  if (!part.length) return '1';
  const counts = new Map();
  for (const n of part) counts.set(n, (counts.get(n) || 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([n, count]) => {
      const symbol = generatorSymbolHTML(generatorKind, n);
      return count === 1 ? symbol : `${symbol}<sup>${count}</sup>`;
    })
    .join(' ');
}

function normalizedGeneratorPart(part) {
  return part.filter(n => n > 0).sort((a, b) => b - a);
}

function generatorPartFromKey(key) {
  return key ? key.split(',').filter(Boolean).map(Number) : [];
}

function addGeneratorPolynomialTerm(poly, part, coeff) {
  if (symRatIsZero(coeff)) return;
  const key = symfunPartKey(normalizedGeneratorPart(part));
  const next = symRatAdd(poly.get(key) || symRat(0n), coeff);
  if (symRatIsZero(next)) poly.delete(key);
  else poly.set(key, next);
}

function multiplyGeneratorPolynomials(left, right) {
  const product = new Map();
  for (const [leftKey, leftCoeff] of left.entries()) {
    const leftPart = generatorPartFromKey(leftKey);
    for (const [rightKey, rightCoeff] of right.entries()) {
      addGeneratorPolynomialTerm(
        product,
        leftPart.concat(generatorPartFromKey(rightKey)),
        symRatMul(leftCoeff, rightCoeff),
      );
      if (product.size > SYMFUN_POLYNOMIAL_TERM_LIMIT) throw new Error('polynomial-too-large');
    }
  }
  return product;
}

const _symfunSchurGeneratorCache = new Map();

function schurGeneratorPolynomial(part) {
  const lambda = trimPart(part);
  const cacheKey = lambda.join(',');
  const cached = _symfunSchurGeneratorCache.get(cacheKey);
  if (cached) return cached;

  if (!lambda.length) {
    const one = new Map([['', symRat(1n)]]);
    _symfunSchurGeneratorCache.set(cacheKey, one);
    return one;
  }
  if (lambda.length > SYMFUN_SCHUR_DETERMINANT_LIMIT) {
    throw new Error('schur-generator-too-large');
  }

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
    if (row === size) {
      let product = new Map([['', symRat(1n)]]);
      for (let r = 0; r < size; r++) {
        const k = lambda[r] - (r + 1) + (perm[r] + 1);
        product = multiplyGeneratorPolynomials(product, hGeneratorPoly(k));
        if (!product.size) return;
      }
      const sign = symRat(permutationSign(perm));
      for (const [key, coeff] of product.entries()) {
        addGeneratorPolynomialTerm(total, generatorPartFromKey(key), symRatMul(sign, coeff));
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
  _symfunSchurGeneratorCache.set(cacheKey, total);
  return total;
}

function expandSchurLinearTermsToGeneratorPolynomial(terms) {
  const result = new Map();
  for (const { coeff, part } of terms) {
    if (symRatIsZero(coeff)) continue;
    const poly = schurGeneratorPolynomial(part);
    for (const [key, innerCoeff] of poly.entries()) {
      addGeneratorPolynomialTerm(result, generatorPartFromKey(key), symRatMul(coeff, innerCoeff));
    }
  }
  return [...result.entries()]
    .map(([key, coeff]) => ({ part: generatorPartFromKey(key), coeff }))
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.part.length, b.part.length); i++) {
        const d = (b.part[i] || 0) - (a.part[i] || 0);
        if (d !== 0) return d;
      }
      return 0;
    });
}

function formatBasisPolynomialCombination(terms, generatorKind) {
  if (generatorKind === 's') {
    terms = expandSchurLinearTermsToGeneratorPolynomial(terms);
  }
  const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
  if (!nonzero.length) return '0';

  return nonzero.map(({ coeff, part }, index) => {
    const negative = coeff.n < 0n;
    const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
    const monomial = generatorMonomialHTML(part, generatorKind);
    const body = monomial === '1'
      ? formatSymRatCoefficient(coeff)
      : `${symRatIsOneAbs(coeff) ? '' : `<span class="symfun-coeff">${formatSymRatCoefficient(coeff)}</span> `}${monomial}`;
    return `${sign}${body}`;
  }).join('');
}

function basisLinearCombinationToMonomialVector(sourceTerms, sourceKind, parts) {
  const result = parts.map(() => symRat(0n));
  for (const { coeff, part } of sourceTerms) {
    if (symRatIsZero(coeff)) continue;
    for (let i = 0; i < parts.length; i++) {
      const c = coefficientForBasis(sourceKind, part, parts[i]);
      if (c !== 0n) {
        result[i] = symRatAdd(result[i], symRatMul(coeff, symRatFromInteger(c)));
      }
    }
  }
  return result;
}

function convertBasisLinearCombination(sourceTerms, sourceKind, targetKind, parts) {
  if (targetKind === sourceKind) {
    const byKey = new Map();
    for (const { part, coeff } of sourceTerms) {
      addGeneratorPolynomialTerm(byKey, part, coeff);
    }
    return [...byKey.entries()].map(([key, coeff]) => ({
      part: generatorPartFromKey(key),
      coeff,
    }));
  }

  const rhs = basisLinearCombinationToMonomialVector(sourceTerms, sourceKind, parts);
  if (targetKind === 'm') {
    return parts.map((part, i) => ({ part, coeff: rhs[i] }));
  }

  if (parts.length > SYMFUN_BASIS_CONVERSION_LIMIT) {
    throw new Error('basis-conversion-too-large');
  }

  const size = parts.length;
  const matrix = parts.map((mPart, row) => {
    const values = parts.map(basisPart => symRatFromInteger(coefficientForBasis(targetKind, basisPart, mPart)));
    values.push(rhs[row]);
    return values;
  });

  for (let col = 0; col < size; col++) {
    let pivot = col;
    while (pivot < size && symRatIsZero(matrix[pivot][col])) pivot++;
    if (pivot === size) throw new Error('basis conversion matrix is singular');
    if (pivot !== col) {
      const tmp = matrix[col];
      matrix[col] = matrix[pivot];
      matrix[pivot] = tmp;
    }

    const pivotValue = matrix[col][col];
    for (let j = col; j <= size; j++) {
      matrix[col][j] = symRatDiv(matrix[col][j], pivotValue);
    }

    for (let row = 0; row < size; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      if (symRatIsZero(factor)) continue;
      for (let j = col; j <= size; j++) {
        matrix[row][j] = symRatSub(matrix[row][j], symRatMul(factor, matrix[col][j]));
      }
    }
  }

  return parts.map((part, i) => ({ part, coeff: matrix[i][size] }));
}

function convertInfiniteBasisExpansions(lambda, targetKind, parts) {
  if (targetKind === 'm') {
    return SYMFUN_ORDER.map(kind => ({
      kind,
      terms: expansionForBasis(kind, lambda, parts).map(term => ({
        part: term.part,
        coeff: symRatFromInteger(term.coeff),
      })),
    }));
  }

  if (parts.length > SYMFUN_BASIS_CONVERSION_LIMIT) {
    throw new Error('basis-conversion-too-large');
  }

  const size = parts.length;
  const rhsKinds = SYMFUN_ORDER;
  const rhsStart = size;
  const width = size + rhsKinds.length;
  const matrix = parts.map((mPart) => {
    const row = [];
    for (const basisPart of parts) {
      row.push(symRatFromInteger(coefficientForBasis(targetKind, basisPart, mPart)));
    }
    for (const sourceKind of rhsKinds) {
      row.push(symRatFromInteger(coefficientForBasis(sourceKind, lambda, mPart)));
    }
    return row;
  });

  for (let col = 0; col < size; col++) {
    let pivot = col;
    while (pivot < size && symRatIsZero(matrix[pivot][col])) pivot++;
    if (pivot === size) throw new Error('basis conversion matrix is singular');
    if (pivot !== col) {
      const tmp = matrix[col];
      matrix[col] = matrix[pivot];
      matrix[pivot] = tmp;
    }

    const pivotValue = matrix[col][col];
    for (let j = col; j < width; j++) {
      matrix[col][j] = symRatDiv(matrix[col][j], pivotValue);
    }

    for (let row = 0; row < size; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      if (symRatIsZero(factor)) continue;
      for (let j = col; j < width; j++) {
        matrix[row][j] = symRatSub(matrix[row][j], symRatMul(factor, matrix[col][j]));
      }
    }
  }

  return rhsKinds.map((kind, rhsIndex) => ({
    kind,
    terms: parts.map((part, partIndex) => ({
      part,
      coeff: matrix[partIndex][rhsStart + rhsIndex],
    })),
  }));
}

function symfunTitle(kind) {
  return symfunSymbolHTML(kind);
}

function defaultSymfunVariableCount(lambda = rowLengths()) {
  return partitionSize(lambda);
}

function syncSymfunVariableControl(lambda = rowLengths()) {
  const input = document.getElementById('symfun-variable-count');
  const infinite = document.getElementById('symfun-infinite');
  const basisSelect = document.getElementById('symfun-infinite-basis');
  const modeSelect = document.getElementById('symfun-infinite-mode');
  if (!input) return { infinite: false };

  if (infinite && infinite.checked) {
    input.type = 'text';
    input.readOnly = true;
    input.value = '\u221e';
    if (basisSelect) basisSelect.disabled = false;
    if (modeSelect) modeSelect.disabled = false;
    return { infinite: true };
  }

  input.type = 'number';
  input.min = '0';
  input.max = String(SYMFUN_VARIABLE_MAX);
  input.step = '1';
  input.readOnly = false;
  if (basisSelect) basisSelect.disabled = true;
  if (modeSelect) modeSelect.disabled = true;
  if (!symfunVariableCountTouched || input.value.trim() === '\u221e') {
    input.value = String(defaultSymfunVariableCount(lambda));
  }
  return { infinite: false };
}

function handleSymfunVariableInput() {
  const input = document.getElementById('symfun-variable-count');
  const infinite = document.getElementById('symfun-infinite');
  if (infinite && infinite.checked) return;
  const raw = String((input && input.value) || '').trim();
  symfunVariableCountTouched = true;
  symfunSavedFiniteVariableCount = raw;
  if (raw === '') return;
  renderSymmetricFunctionChart();
}

function toggleSymfunInfinite() {
  const input = document.getElementById('symfun-variable-count');
  const infinite = document.getElementById('symfun-infinite');
  if (!input || !infinite) return;

  if (infinite.checked) {
    if (input.value.trim() && input.value.trim() !== '\u221e') {
      symfunSavedFiniteVariableCount = input.value.trim();
    }
    input.type = 'text';
    input.readOnly = true;
    input.value = '\u221e';
  } else {
    input.type = 'number';
    input.min = '0';
    input.max = String(SYMFUN_VARIABLE_MAX);
    input.step = '1';
    input.readOnly = false;
    input.value = symfunVariableCountTouched && symfunSavedFiniteVariableCount
      ? symfunSavedFiniteVariableCount
      : String(defaultSymfunVariableCount());
  }
  renderSymmetricFunctionChart();
}

function initSymfunVariableControls() {
  syncSymfunVariableControl();
}

function selectedSymfunInfiniteBasis() {
  const select = document.getElementById('symfun-infinite-basis');
  return select && ['m', 's', 'p', 'e', 'h'].includes(select.value) ? select.value : 'm';
}

function selectedSymfunOmegaSource() {
  const select = document.getElementById('symfun-omega-source');
  if (select && ['m', 'p', 'e', 'h', 's'].includes(select.value)) {
    symfunOmegaSource = select.value;
  }
  return symfunOmegaSource;
}

function setSymfunOmegaSource() {
  selectedSymfunOmegaSource();
  renderSymmetricFunctionChart();
}

function symfunOmegaSourceSelectHTML() {
  const selected = selectedSymfunOmegaSource();
  const options = SYMFUN_ORDER.map(kind => {
    const isSelected = kind === selected ? ' selected' : '';
    return `<option value="${kind}"${isSelected}>${kind}_\u03bb</option>`;
  }).join('');
  return `<select id="symfun-omega-source" class="symfun-inline-select" onchange="setSymfunOmegaSource()">${options}</select>`;
}

function symfunOmegaLabelHTML() {
  return `<span class="symfun-omega-label tooltip-label" tabindex="0" data-tooltip="The fundamental involution omega sends p_n to (-1)^{n-1}p_n, e_n to h_n, h_n to e_n, and s_lambda to s_{lambda'}." >&omega;(${symfunOmegaSourceSelectHTML()})</span>`;
}

function selectedSymfunInfiniteMode() {
  const select = document.getElementById('symfun-infinite-mode');
  return select && select.value === 'polynomial' ? 'polynomial' : 'linear';
}

function conversionBasisForInfiniteMode(targetBasis, mode) {
  return mode === 'polynomial' && targetBasis === 'm' ? 'p' : targetBasis;
}

function omegaSignForPowerSum(part) {
  return ((partitionSize(part) - part.length) % 2 === 0) ? 1n : -1n;
}

function omegaPowerSumTerms(lambda, sourceKind, parts) {
  const sourceTerms = [{ part: lambda, coeff: symRat(1n) }];
  const asPowerSums = convertBasisLinearCombination(sourceTerms, sourceKind, 'p', parts);
  return asPowerSums.map(term => ({
    part: term.part,
    coeff: symRatMul(term.coeff, symRat(omegaSignForPowerSum(term.part))),
  }));
}

function omegaTermsInBasis(lambda, sourceKind, targetKind, parts) {
  const powerTerms = omegaPowerSumTerms(lambda, sourceKind, parts);
  return convertBasisLinearCombination(powerTerms, 'p', targetKind, parts);
}

function omegaFinitePolynomial(lambda, sourceKind, variableCount) {
  const degree = partitionSize(lambda);
  const { parts, truncated } = partitionsOfSizeLimited(degree);
  if (truncated) throw new Error('polynomial-too-large');

  const powerTerms = omegaPowerSumTerms(lambda, sourceKind, parts);
  const result = new Map();
  for (const { part, coeff } of powerTerms) {
    if (symRatIsZero(coeff)) continue;
    const poly = finiteSymfunPolynomial('p', part, variableCount);
    for (const [key, intCoeff] of poly.entries()) {
      const next = symRatMul(coeff, symRatFromInteger(intCoeff));
      const existing = result.get(key) || symRat(0n);
      const sum = symRatAdd(existing, next);
      if (symRatIsZero(sum)) result.delete(key);
      else result.set(key, sum);
    }
  }
  return result;
}

function readSymfunVariableCount(lambda = rowLengths()) {
  const controlState = syncSymfunVariableControl(lambda);
  if (controlState.infinite) return { count: null, infinite: true, error: '' };

  const input = document.getElementById('symfun-variable-count');
  if (!input) return { count: defaultSymfunVariableCount(lambda), infinite: false, error: '' };
  const raw = String(input.value || '').trim();
  if (!raw) return { count: null, infinite: false, pending: true, error: '' };
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 0 || count > SYMFUN_VARIABLE_MAX) {
    return { count: null, infinite: false, error: `Choose 0-${SYMFUN_VARIABLE_MAX} variables, or turn on infinite.` };
  }
  return { count, infinite: false, error: '' };
}

function zeroExponentVector(variableCount) {
  return Array(variableCount).fill(0);
}

function polyKey(exponents) {
  return exponents.join(',');
}

function exponentsFromKey(key) {
  return key ? key.split(',').map(Number) : [];
}

function onePolynomial(variableCount) {
  return new Map([[polyKey(zeroExponentVector(variableCount)), 1n]]);
}

function addPolynomialTerm(poly, exponents, coeff = 1n) {
  if (coeff === 0n) return;
  const key = polyKey(exponents);
  const next = (poly.get(key) || 0n) + coeff;
  if (next === 0n) poly.delete(key);
  else poly.set(key, next);
  if (poly.size > SYMFUN_POLYNOMIAL_TERM_LIMIT) {
    throw new Error('polynomial-too-large');
  }
}

function addScaledPolynomial(target, source, scale = 1n) {
  if (scale === 0n) return target;
  for (const [key, coeff] of source.entries()) {
    addPolynomialTerm(target, exponentsFromKey(key), coeff * scale);
  }
  return target;
}

function multiplyPolynomials(left, right, variableCount) {
  if (!left.size || !right.size) return new Map();
  const product = new Map();
  for (const [leftKey, leftCoeff] of left.entries()) {
    const leftExp = exponentsFromKey(leftKey);
    for (const [rightKey, rightCoeff] of right.entries()) {
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
    result = multiplyPolynomials(result, poly, variableCount);
    if (!result.size) break;
  }
  return result;
}

function pSeedPolynomial(k, variableCount) {
  const poly = new Map();
  for (let i = 0; i < variableCount; i++) {
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

function mPolynomial(lambda, variableCount) {
  if (lambda.length > variableCount) return new Map();
  const values = lambda.concat(Array(variableCount - lambda.length).fill(0));
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  const distinctValues = [...counts.keys()].sort((a, b) => b - a);
  const exp = zeroExponentVector(variableCount);
  const poly = new Map();

  function rec(index) {
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

function schurPolynomial(lambda, variableCount) {
  if (!lambda.length) return onePolynomial(variableCount);
  if (lambda.length > variableCount) return new Map();

  const degree = partitionSize(lambda);
  const { parts, truncated } = partitionsOfSizeLimited(degree);
  if (truncated) throw new Error('polynomial-too-large');

  const result = new Map();
  for (const mu of parts) {
    if (mu.length > variableCount) continue;
    const coeff = kostkaNumber(lambda, mu);
    if (coeff === 0n) continue;
    addScaledPolynomial(result, mPolynomial(mu, variableCount), coeff);
  }
  return result;
}

function finiteSymfunPolynomial(kind, lambda, variableCount) {
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

function formatFinitePolynomial(poly) {
  if (!poly.size) return '0';
  return [...poly.entries()]
    .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
    .map(([key, coeff]) => {
      const monomial = formatVariableMonomial(exponentsFromKey(key));
      if (monomial === '1') return coeff.toString();
      if (coeff === 1n) return monomial;
      return `<span class="symfun-coeff">${coeff.toString()}</span>${monomial}`;
    })
    .join(' + ');
}

function formatFiniteRationalPolynomial(poly) {
  if (!poly.size) return '0';
  return [...poly.entries()]
    .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
    .map(([key, coeff]) => {
      const monomial = formatVariableMonomial(exponentsFromKey(key));
      const negative = coeff.n < 0n;
      const sign = negative ? '- ' : '';
      const abs = symRatAbs(coeff);
      if (monomial === '1') return `${sign}${formatSymRatCoefficient(abs)}`;
      if (symRatIsOneAbs(abs)) return `${sign}${monomial}`;
      return `${sign}<span class="symfun-coeff">${formatSymRatCoefficient(abs)}</span>${monomial}`;
    })
    .reduce((out, term, index) => {
      if (index === 0) return term;
      return term.startsWith('- ') ? `${out} - ${term.slice(2)}` : `${out} + ${term}`;
    }, '');
}

function renderFiniteSymmetricFunctionChart(lambda, variableCount) {
  let html = SYMFUN_ORDER.map(kind => {
    const poly = finiteSymfunPolynomial(kind, lambda, variableCount);
    return `
      <div class="symfun-row">
        <span class="symfun-label">${symfunTitle(kind)}</span>
        <span class="symfun-value">${formatFinitePolynomial(poly)}</span>
      </div>
    `;
  }).join('');
  const sourceKind = selectedSymfunOmegaSource();
  const omegaPoly = omegaFinitePolynomial(lambda, sourceKind, variableCount);
  html += `
    <div class="symfun-row symfun-omega-row">
      <span class="symfun-label">${symfunOmegaLabelHTML()}</span>
      <span class="symfun-value">${formatFiniteRationalPolynomial(omegaPoly)}</span>
    </div>
  `;
  return html;
}

function renderSymmetricFunctionChart() {
  const output = document.getElementById('symfun-output');
  if (!output) return;

  const lambda = rowLengths();
  const oldSymfunPreview = document.getElementById('symfun-preview');
  if (oldSymfunPreview) oldSymfunPreview.remove();
  setCardStaleById('symfun-output', false);
  const variableChoice = readSymfunVariableCount(lambda);
  if (variableChoice.error) {
    output.innerHTML = `<div class="symfun-too-large">${escapeHtml(variableChoice.error)}</div>`;
    return;
  }
  if (variableChoice.pending) return;

  if (variableChoice.count !== null) {
    try {
      output.innerHTML = renderFiniteSymmetricFunctionChart(lambda, variableChoice.count);
      setCardStaleById('symfun-output', false);
    } catch (err) {
      if (err && err.message === 'polynomial-too-large') {
        output.innerHTML = `<div class="symfun-too-large">Complete polynomial expansion has more than ${SYMFUN_POLYNOMIAL_TERM_LIMIT} terms. Use fewer variables or draw a smaller diagram.</div>`;
        return;
      }
      if (err && err.message === 'kostka-too-large') {
        output.innerHTML = `<div class="symfun-too-large">Schur/Kostka calculation is too large for exact browser-side expansion. Use a smaller diagram.</div>`;
        return;
      }
      throw err;
    }
    return;
  }

  const degree = partitionSize(lambda);
  const { parts, truncated } = partitionsOfSizeLimited(degree);

  if (truncated) {
    output.innerHTML = `<div class="symfun-too-large">Complete monomial-basis expansion in degree ${degree} has more than ${SYMFUN_EXPANSION_PARTITION_LIMIT} Young-diagram terms. Draw a smaller diagram to expand it exactly.</div>`;
    return;
  }

  const targetBasis = selectedSymfunInfiniteBasis();
  const infiniteMode = selectedSymfunInfiniteMode();
  const conversionBasis = conversionBasisForInfiniteMode(targetBasis, infiniteMode);
  let expansions;
  try {
    expansions = convertInfiniteBasisExpansions(lambda, conversionBasis, parts);
  } catch (err) {
    if (err && err.message === 'basis-conversion-too-large') {
      output.innerHTML = `<div class="symfun-too-large">Changing to the ${targetBasis}<sub>&lambda;</sub> ${infiniteMode} mode in degree ${degree} needs a ${parts.length} by ${parts.length} exact matrix solve. Use a smaller diagram or choose linear m<sub>&lambda;</sub>.</div>`;
      return;
    }
    if (err && err.message === 'kostka-too-large') {
      output.innerHTML = `<div class="symfun-too-large">Schur/Kostka calculation is too large for exact browser-side expansion. Use a smaller diagram.</div>`;
      return;
    }
    throw err;
  }

  let blocks = '';
  try {
    blocks = expansions.map(({ kind, terms }) => {
      return `
        <div class="symfun-row">
          <span class="symfun-label">${symfunTitle(kind)}</span>
          <span class="symfun-value">${infiniteMode === 'polynomial'
            ? formatBasisPolynomialCombination(terms, targetBasis)
            : formatBasisLinearCombination(terms, targetBasis)}</span>
        </div>
      `;
    }).join('');
    const omegaSource = selectedSymfunOmegaSource();
    const omegaTerms = omegaTermsInBasis(lambda, omegaSource, conversionBasis, parts);
    blocks += `
      <div class="symfun-row symfun-omega-row">
        <span class="symfun-label">${symfunOmegaLabelHTML()}</span>
        <span class="symfun-value">${infiniteMode === 'polynomial'
          ? formatBasisPolynomialCombination(omegaTerms, targetBasis)
          : formatBasisLinearCombination(omegaTerms, targetBasis)}</span>
      </div>
    `;
  } catch (err) {
    if (err && err.message === 'schur-generator-too-large') {
      output.innerHTML = `<div class="symfun-too-large">Schur polynomial mode is capped at Jacobi-Trudi size ${SYMFUN_SCHUR_DETERMINANT_LIMIT}. Use linear mode or a smaller diagram.</div>`;
      return;
    }
    if (err && err.message === 'polynomial-too-large') {
      output.innerHTML = `<div class="symfun-too-large">Complete polynomial expansion has more than ${SYMFUN_POLYNOMIAL_TERM_LIMIT} terms. Use linear mode or a smaller diagram.</div>`;
      return;
    }
    throw err;
  }

  output.innerHTML = blocks;
  setCardStaleById('symfun-output', false);
}

function symfunSymbolText(kind, partText = 'lambda') {
  return `${kind}_${partText}`;
}

function partitionLabelText(part) {
  return part.length ? '(' + part.join(', ') + ')' : '()';
}

function formatSymRatText(coeff) {
  const abs = symRatAbs(coeff);
  return abs.d === 1n ? abs.n.toString() : `${abs.n.toString()}/${abs.d.toString()}`;
}

function formatBasisLinearCombinationText(terms, basisKind) {
  const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
  if (!nonzero.length) return '0';
  return nonzero.map(({ coeff, part }, index) => {
    const negative = coeff.n < 0n;
    const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
    const coeffText = symRatIsOneAbs(coeff) ? '' : `${formatSymRatText(coeff)}*`;
    return `${sign}${coeffText}${symfunSymbolText(basisKind, partitionLabelText(part))}`;
  }).join('');
}

function generatorMonomialText(part, generatorKind) {
  if (!part.length) return '1';
  const counts = new Map();
  for (const n of part) counts.set(n, (counts.get(n) || 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([n, count]) => count === 1 ? `${generatorKind}_${n}` : `${generatorKind}_${n}^${count}`)
    .join('*');
}

function formatBasisPolynomialCombinationText(terms, generatorKind) {
  if (generatorKind === 's') {
    terms = expandSchurLinearTermsToGeneratorPolynomial(terms);
  }
  const nonzero = terms.filter(term => !symRatIsZero(term.coeff));
  if (!nonzero.length) return '0';
  return nonzero.map(({ coeff, part }, index) => {
    const negative = coeff.n < 0n;
    const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
    const monomial = generatorMonomialText(part, generatorKind);
    const body = monomial === '1'
      ? formatSymRatText(coeff)
      : `${symRatIsOneAbs(coeff) ? '' : `${formatSymRatText(coeff)}*`}${monomial}`;
    return `${sign}${body}`;
  }).join('');
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

function formatFinitePolynomialText(poly) {
  if (!poly.size) return '0';
  return [...poly.entries()]
    .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
    .map(([key, coeff]) => {
      const monomial = formatVariableMonomialText(exponentsFromKey(key));
      if (monomial === '1') return coeff.toString();
      if (coeff === 1n) return monomial;
      return `${coeff.toString()}*${monomial}`;
    })
    .join(' + ');
}

function formatFiniteRationalPolynomialText(poly) {
  if (!poly.size) return '0';
  return [...poly.entries()]
    .sort(([aKey], [bKey]) => compareExponentKeys(aKey, bKey))
    .map(([key, coeff], index) => {
      const negative = coeff.n < 0n;
      const sign = index === 0 ? (negative ? '- ' : '') : (negative ? ' - ' : ' + ');
      const abs = symRatAbs(coeff);
      const monomial = formatVariableMonomialText(exponentsFromKey(key));
      if (monomial === '1') return `${sign}${formatSymRatText(abs)}`;
      if (symRatIsOneAbs(abs)) return `${sign}${monomial}`;
      return `${sign}${formatSymRatText(abs)}*${monomial}`;
    })
    .join('');
}

function symmetricFunctionExportText() {
  const lambda = rowLengths();
  const lambdaText = partitionLabelText(lambda);
  const variableChoice = readSymfunVariableCount(lambda);
  if (variableChoice.error) return variableChoice.error;
  if (variableChoice.pending) return 'Enter N or turn on infinite mode before exporting.';

  const lines = [
    '# Symmetric function expansions',
    `# lambda = ${lambdaText}`,
  ];

  if (variableChoice.count !== null) {
    lines.push(`# variables: x_1,...,x_${variableChoice.count}`);
    for (const kind of SYMFUN_ORDER) {
      const poly = finiteSymfunPolynomial(kind, lambda, variableChoice.count);
      lines.push(`${symfunSymbolText(kind)} = ${formatFinitePolynomialText(poly)}`);
    }
    const omegaSource = selectedSymfunOmegaSource();
    const omegaPoly = omegaFinitePolynomial(lambda, omegaSource, variableChoice.count);
    lines.push(`omega(${symfunSymbolText(omegaSource)}) = ${formatFiniteRationalPolynomialText(omegaPoly)}`);
    return lines.join('\n');
  }

  const degree = partitionSize(lambda);
  const { parts, truncated } = partitionsOfSizeLimited(degree);
  if (truncated) {
    return `Complete infinite-variable expansion in degree ${degree} has more than ${SYMFUN_EXPANSION_PARTITION_LIMIT} Young-diagram terms.`;
  }

  const targetBasis = selectedSymfunInfiniteBasis();
  const infiniteMode = selectedSymfunInfiniteMode();
  const conversionBasis = conversionBasisForInfiniteMode(targetBasis, infiniteMode);
  lines.push('# variables: infinite');
  lines.push(`# basis: ${symfunSymbolText(targetBasis)}`);
  lines.push(`# mode: ${infiniteMode}`);
  const expansions = convertInfiniteBasisExpansions(lambda, conversionBasis, parts);
  for (const { kind, terms } of expansions) {
    const rhs = infiniteMode === 'polynomial'
      ? formatBasisPolynomialCombinationText(terms, targetBasis)
      : formatBasisLinearCombinationText(terms, targetBasis);
    lines.push(`${symfunSymbolText(kind)} = ${rhs}`);
  }
  const omegaSource = selectedSymfunOmegaSource();
  const omegaTerms = omegaTermsInBasis(lambda, omegaSource, conversionBasis, parts);
  const omegaRhs = infiniteMode === 'polynomial'
    ? formatBasisPolynomialCombinationText(omegaTerms, targetBasis)
    : formatBasisLinearCombinationText(omegaTerms, targetBasis);
  lines.push(`omega(${symfunSymbolText(omegaSource)}) = ${omegaRhs}`);
  return lines.join('\n');
}

function cardFromActionEvent(event) {
  const target = event && event.target;
  if (target && target.closest) return target.closest('.card');
  const active = document.activeElement;
  return active && active.closest ? active.closest('.card') : null;
}

function revealExportCard(event) {
  document.querySelectorAll('.card').forEach(c => {
    if (c.querySelector('#export-out')) {
      const sourceFromEvent = cardFromActionEvent(event);
      const sourceCard = sourceFromEvent && sourceFromEvent !== c
        ? sourceFromEvent
        : latestOpenChartCardExcluding(c);
      openCard(c, false, sourceCard);
    }
  });
}

function exportSymmetricFunctions(event) {
  const exportOut = document.getElementById('export-out');
  if (!exportOut) return;
  try {
    exportOut.value = symmetricFunctionExportText();
  } catch (err) {
    if (err && err.message === 'polynomial-too-large') {
      exportOut.value = `Complete polynomial expansion has more than ${SYMFUN_POLYNOMIAL_TERM_LIMIT} terms. Use fewer variables or draw a smaller diagram.`;
    } else if (err && err.message === 'basis-conversion-too-large') {
      exportOut.value = `The selected infinite-variable basis conversion is too large for exact browser-side export. Use a smaller diagram or choose the m_lambda basis.`;
    } else if (err && err.message === 'schur-generator-too-large') {
      exportOut.value = `Schur polynomial-mode export is capped at Jacobi-Trudi size ${SYMFUN_SCHUR_DETERMINANT_LIMIT}. Use linear mode or a smaller diagram.`;
    } else if (err && err.message === 'kostka-too-large') {
      exportOut.value = `Schur/Kostka calculation is too large for exact browser-side export. Use a smaller diagram.`;
    } else {
      exportOut.value = `Unable to export symmetric functions: ${(err && err.message) || err}`;
    }
  }
  revealExportCard(event);
}

const BRANCHING_BOX_LIMIT = 24;
const BRANCHING_PAIR_LIMIT = 3500;
const BRANCHING_LR_SEARCH_STEP_LIMIT = 1000000;
let _lastBranching = null;

function branchingRuleLabel(rule) {
  return rule === 'gl-sp' ? 'GL(2n) -> Sp(2n)' : 'GL(n) -> O(n)';
}

function branchingLRSearchLimitMessage(candidatePairs, stats) {
  return `Branching computation stopped after ${stats.steps.toLocaleString()} LR search steps while checking candidate pair ${candidatePairs}. The browser cap is ${stats.limit.toLocaleString()} LR search steps, chosen to keep the expected computation time under about 3 seconds.`;
}

function ensureBeforeElement(id, beforeId, className) {
  let el = document.getElementById(id);
  if (el) return el;
  const before = document.getElementById(beforeId);
  if (!before || !before.parentNode) return null;
  el = document.createElement('div');
  el.id = id;
  el.className = className;
  before.parentNode.insertBefore(el, before);
  return el;
}

function branchingCandidatePairEstimate(lam, rule) {
  const szLam = partitionSize(lam);
  let count = 0;
  for (let szDelta = 0; szDelta <= szLam; szDelta += 2) {
    const deltas = partitionsEvenParts(szDelta, szLam);
    const szMu = szLam - szDelta;
    for (const delta of deltas) {
      const mus = partitionsOfSize(szMu, lam.length + delta.length + 2, (lam[0] || 0) + (delta[0] || 0));
      count += mus.length;
      if (count > BRANCHING_PAIR_LIMIT) return count;
    }
  }
  return count;
}

function renderBranchingPreview() {
  const oldBranchingPreview = document.getElementById('br-preview');
  if (oldBranchingPreview) oldBranchingPreview.remove();
}

function rejectBranching(message) {
  _lastBranching = null;
  setCardStaleById('br-output', false);
  const out = document.getElementById('br-output');
  const warn = document.getElementById('br-warning');
  if (warn) warn.textContent = message;
  if (out) out.innerHTML = '<span class="hint" style="display:block;padding:8px;">No branching decomposition computed.</span>';
  renderBranchingPreview();
}

function markBranchingStale() {
  _lastBranching = null;
  setCardStaleById('br-output', false);
  const out = document.getElementById('br-output');
  const warn = document.getElementById('br-warning');
  if (warn) warn.textContent = '';
  if (out) out.innerHTML = '<span class="hint">Click compute to update the branching decomposition.</span>';
  renderBranchingPreview();
}

// --- Main branching computation ---
function computeBranching() {
  if (!isCardExpandedById('br-output')) return;
  const lam = rowLengths();
  const rule = document.getElementById('br-rule').value;
  const out  = document.getElementById('br-output');
  const warn = document.getElementById('br-warning');
  _lastBranching = null;
  out.innerHTML = '';
  warn.textContent = '';
  renderBranchingPreview();
  if (!lam.length) {
    out.innerHTML = '<span class="hint">Draw a Young diagram first.</span>';
    return;
  }
  const szLam = lam.reduce((a,b)=>a+b,0);
  if (szLam > BRANCHING_BOX_LIMIT) {
    rejectBranching(`Too large for browser branching computation: |lambda| = ${szLam}. Please use at most ${BRANCHING_BOX_LIMIT} boxes.`);
    return;
  }
  // For GL(2n)→Sp(2n): sum over δ with even parts, use ν = δ' (conjugate of δ)
  // For GL(n)→O(n):   sum over δ with even parts, use ν = δ directly
  // multiplicity of μ = Σ_δ c^λ_{ν μ}  where ν as above, |ν|+|μ|=|λ|
  // We'll accumulate multiplicities indexed by μ
  const multMap = new Map(); // key = JSON.stringify(mu), value = {mu, mult}
  // The max size of δ is |λ|, max single part is |λ|
  let candidatePairs = 0;
  const lrStats = { steps: 0, limit: BRANCHING_LR_SEARCH_STEP_LIMIT };
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
        candidatePairs++;
        if (candidatePairs > BRANCHING_PAIR_LIMIT) {
          rejectBranching(`Too many branching candidates (${candidatePairs}+). The browser cap is ${BRANCHING_PAIR_LIMIT} candidate pairs; this is the number of (delta, mu) pairs tested before each LR coefficient is computed. LR search steps so far: ${lrStats.steps.toLocaleString()} / ${BRANCHING_LR_SEARCH_STEP_LIMIT.toLocaleString()}.`);
          return;
        }
        let c = 0;
        try {
          c = lrCoeff(lam, mu, nu, lrStats);
        } catch (err) {
          if (err && err.message === 'branching-lr-search-too-large') {
            rejectBranching(branchingLRSearchLimitMessage(candidatePairs, lrStats));
            return;
          }
          throw err;
        }
        if (c === 0) continue;
        const key = JSON.stringify(mu);
        if (!multMap.has(key)) multMap.set(key, {mu: mu.slice(), mult: 0});
        multMap.get(key).mult += c;
      }
    }
  }
  if (multMap.size === 0) {
    out.innerHTML = '<span class="hint">No constituents found (empty decomposition).</span>';
    setCardStaleById('br-output', false);
    _lastBranching = {
      rule,
      ruleLabel: branchingRuleLabel(rule),
      lambdaRows: lam.slice(),
      entries: [],
      warning: warn.textContent || '',
      candidatePairs,
      lrSearchSteps: lrStats.steps,
      lrSearchStepLimit: lrStats.limit,
    };
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
  _lastBranching = {
    rule,
    ruleLabel: branchingRuleLabel(rule),
    lambdaRows: lam.slice(),
    entries: entries.map(e => ({mu: e.mu.slice(), mult: e.mult})),
    warning: warn.textContent || '',
    candidatePairs,
    lrSearchSteps: lrStats.steps,
    lrSearchStepLimit: lrStats.limit,
  };
  setCardStaleById('br-output', false);
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
  const meta = document.createElement('div');
  meta.className = 'hint';
  meta.style.cssText = 'padding:4px 0 6px;border-bottom:1px dotted var(--border);';
  meta.textContent = `Checked ${candidatePairs.toLocaleString()} branching candidates; LR search steps ${lrStats.steps.toLocaleString()} / ${lrStats.limit.toLocaleString()}.`;
  out.appendChild(meta);
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
function exportBranching(event) {
  const result = _lastBranching;
  if (!result) {
    const warn = document.getElementById('br-warning');
    if (warn) warn.textContent = 'Click compute before exporting the branching decomposition.';
    return;
  }
  const exportOut = document.getElementById('export-out');
  if (!exportOut) return;
  const lambdaRows = result.lambdaRows.length ? '(' + result.lambdaRows.join(', ') + ')' : '( )';
  const subLabel = result.rule === 'gl-sp' ? 'Sp' : 'O';
  let txt = `# Branching rule decomposition\n`;
  txt += `# rule: ${result.ruleLabel}\n`;
  txt += `# lambda rows: ${lambdaRows}\n`;
  txt += `# candidates checked: ${result.candidatePairs}\n`;
  if (result.lrSearchSteps != null) txt += `# LR search steps: ${result.lrSearchSteps} / ${result.lrSearchStepLimit}\n`;
  if (result.warning) txt += `# warning: ${result.warning}\n`;
  txt += `# formula: V^${lambdaRows}_GL = `;
  txt += result.entries.length
    ? result.entries.map(({mu, mult}) => {
        const muRows = mu.length ? '(' + mu.join(', ') + ')' : '( )';
        return `${mult > 1 ? mult + '*' : ''}V^${muRows}_${subLabel}`;
      }).join(' + ')
    : '0';
  txt += `\n# columns: multiplicity, mu_rows\n`;
  for (const e of result.entries) {
    const rows = e.mu.length ? '(' + e.mu.join(', ') + ')' : '( )';
    txt += `${e.mult}\t${rows}\n`;
  }
  exportOut.value = txt.trimEnd();
  revealExportCard(event);
}

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
  window.toggleCard = function(eventOrHead, maybeHead) {
    if (dragging || Date.now() < suppressToggleUntil) return;
    _origToggle(eventOrHead, maybeHead);
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
  // Convention used by positiveRoots(): C[i][j] = <α_i, α_j∨>.
  // B_n has α_n short, so <α_{n-1},α_n∨> = -2 and <α_n,α_{n-1}∨> = -1.
  C[n-2][n-1] = -2;
  C[n-1][n-2] = -1;
  return C;
}
function makeCn(n) {
  const C = [];
  for(let i=0;i<n;i++){C.push([]); for(let j=0;j<n;j++){
    if(i===j) C[i][j]=2;
    else if(Math.abs(i-j)===1) C[i][j]=-1;
    else C[i][j]=0;
  }}
  // C_n has α_n long, so <α_{n-1},α_n∨> = -1 and <α_n,α_{n-1}∨> = -2.
  C[n-2][n-1] = -1;
  C[n-1][n-2] = -2;
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
  const n = rankOf(typeStr);
  // Convention: the Young diagram rows give λ = (a_1,...,a_n), padded to the rank.
  // The Dynkin/fundamental-weight coordinates are
  //   [a_1-a_2, a_2-a_3, ..., a_{n-1}-a_n, a_n].
  // Thus a single column of height i gives [0,...,0,1,0,...,0],
  // corresponding to the i-th fundamental weight.
  const lam = Array.from({length:n}, (_,i) => rows[i] || 0);
  return Array.from({length:n}, (_,i) => lam[i] - (lam[i + 1] || 0));
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
function factorialBI(n) {
  let r = 1n;
  for (let i = 2; i <= n; i++) r *= BigInt(i);
  return r;
}
function powBI(base, exp) {
  let r = 1n;
  const b = BigInt(base);
  for (let i = 0; i < exp; i++) r *= b;
  return r;
}
function cartanEdgeWeight(C, i, j) {
  return Math.abs((C[i][j] || 0) * (C[j][i] || 0));
}
function dynkinComponents(C, nodes) {
  const nodeSet = new Set(nodes);
  const seen = new Set();
  const comps = [];
  for (const start of nodes) {
    if (seen.has(start)) continue;
    const comp = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      for (const j of nodeSet) {
        if (seen.has(j)) continue;
        if (cartanEdgeWeight(C, i, j) > 0) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    comps.push(comp.sort((a,b)=>a-b));
  }
  return comps;
}
function componentAdjacency(C, nodes) {
  const adj = new Map(nodes.map(i => [i, []]));
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const i = nodes[a], j = nodes[b];
      const w = cartanEdgeWeight(C, i, j);
      if (w > 0) {
        adj.get(i).push({node:j, weight:w});
        adj.get(j).push({node:i, weight:w});
      }
    }
  }
  return adj;
}
function isPathAdjacency(adj, nodes) {
  if (nodes.length === 1) return true;
  const degs = nodes.map(i => adj.get(i).length).sort((a,b)=>a-b);
  return degs[0] === 1 && degs[1] === 1 && degs.slice(2).every(d => d === 2);
}
function doubleEdgeTouchesPathEnd(adj, nodes) {
  for (const i of nodes) {
    for (const e of adj.get(i)) {
      if (i < e.node && e.weight === 2) {
        return adj.get(i).length === 1 || adj.get(e.node).length === 1;
      }
    }
  }
  return false;
}
function armLengthsFromBranch(adj, branch) {
  const arms = [];
  for (const first of adj.get(branch).map(e => e.node)) {
    let len = 1;
    let prev = branch;
    let cur = first;
    while (adj.get(cur).length > 1) {
      const next = adj.get(cur).map(e => e.node).find(v => v !== prev);
      if (next === undefined) break;
      prev = cur;
      cur = next;
      len++;
    }
    arms.push(len);
  }
  return arms.sort((a,b)=>a-b);
}
function irreducibleWeylOrderFromCartan(C, nodes) {
  const n = nodes.length;
  if (n === 0) return 1n;
  if (n === 1) return 2n; // A1

  const adj = componentAdjacency(C, nodes);
  const edgeWeights = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const w = cartanEdgeWeight(C, nodes[a], nodes[b]);
      if (w > 0) edgeWeights.push(w);
    }
  }
  const maxEdge = Math.max(...edgeWeights);

  // Rank-two non-simply-laced types.
  if (n === 2) {
    if (maxEdge === 1) return 6n;   // A2
    if (maxEdge === 2) return 8n;   // B2/C2
    if (maxEdge === 3) return 12n;  // G2
  }

  if (maxEdge > 1) {
    // F4 is the path of length 4 with its double edge in the middle.
    if (n === 4 && isPathAdjacency(adj, nodes) && maxEdge === 2 && !doubleEdgeTouchesPathEnd(adj, nodes)) {
      return 1152n;
    }
    // B_n/C_n: a path with one double edge at an end; |W| = 2^n n!.
    if (isPathAdjacency(adj, nodes) && maxEdge === 2) {
      return powBI(2, n) * factorialBI(n);
    }
  }

  // Simply-laced connected types: A, D, E.
  if (maxEdge === 1) {
    if (isPathAdjacency(adj, nodes)) {
      return factorialBI(n + 1); // A_n
    }
    const branchNodes = nodes.filter(i => adj.get(i).length === 3);
    if (branchNodes.length === 1) {
      const arms = armLengthsFromBranch(adj, branchNodes[0]);
      const key = arms.join(',');
      if (arms[0] === 1 && arms[1] === 1) {
        return powBI(2, n - 1) * factorialBI(n); // D_n
      }
      if (key === '1,2,2') return 51840n;    // E6
      if (key === '1,2,3') return 2903040n;  // E7
      if (key === '1,2,4') return 696729600n;// E8
    }
  }

  throw new Error('Unsupported Dynkin subdiagram for orbit-size shortcut.');
}
function weylGroupOrderFromCartan(C, nodes = null) {
  const useNodes = nodes || Array.from({length:C.length}, (_,i)=>i);
  if (!useNodes.length) return 1n;
  return dynkinComponents(C, useNodes).reduce(
    (prod, comp) => prod * irreducibleWeylOrderFromCartan(C, comp),
    1n
  );
}
function weylOrbitSizeFast(C, dynkinLabels) {
  // For a dominant weight λ, the stabilizer is generated by the simple reflections
  // s_i with Dynkin label <λ, α_i∨> = 0. Thus |W·λ| = |W| / |W_λ|.
  const fullOrder = weylGroupOrderFromCartan(C);
  const zeroNodes = dynkinLabels
    .map((a, i) => a === 0 ? i : -1)
    .filter(i => i >= 0);
  const stabilizerOrder = weylGroupOrderFromCartan(C, zeroNodes);
  return fullOrder / stabilizerOrder;
}
// ── State ──
const ORBIT_LIST_LIMIT = 5000n;
let _lieOrbit = [];
let _lieOrbitSize = 0n;
let _orbitVisible = false;
let _lastOrbitKey = '';
let _lastOrbitLabels = [];
let _lastOrbitTypeStr = '';
let _lastOrbitRank = 0;
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
  updateYoungUrlState();
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
function orbitListLimitText() { return ORBIT_LIST_LIMIT.toString(); }
function renderOrbitTableOrMessage() {
  const container = document.getElementById('lie-orbit-table');
  if (!_lastOrbitLabels.length) {
    container.innerHTML = '<span class="hint">Draw a Young diagram first.</span>';
    return false;
  }
  if (_lieOrbitSize > ORBIT_LIST_LIMIT) {
    container.innerHTML = `<span class="hint">Orbit has ${_lieOrbitSize.toString()} weights. Full listing is disabled above ${orbitListLimitText()} weights to keep the page responsive; the size above is computed exactly by the stabilizer formula.</span>`;
    _lieOrbit = [];
    return false;
  }
  if (_lastOrbitKey && (!_lieOrbit.length || _lieOrbit._key !== _lastOrbitKey)) {
    _lieOrbit = weylOrbitDynkin(_cachedCartan, _lastOrbitLabels);
    _lieOrbit._key = _lastOrbitKey;
  }
  buildOrbitTable(_lastOrbitRank);
  return true;
}
function toggleOrbitTable() {
  _orbitVisible = !_orbitVisible;
  const table = document.getElementById('lie-orbit-table');
  if (_orbitVisible) {
    renderOrbitTableOrMessage();
  }
  table.style.display = _orbitVisible ? 'block' : 'none';
  document.getElementById('lie-orbit-btn').textContent = _orbitVisible ? 'Hide Weyl orbit' : 'Show Weyl orbit';
}
function exportOrbit(event) {
  if (!_lastOrbitLabels.length) return;
  const exportOut = document.getElementById('export-out');
  if (_lieOrbitSize > ORBIT_LIST_LIMIT) {
    exportOut.value = `# Weyl orbit  type=${_lastOrbitTypeStr}  rank=${_lastOrbitRank}\n# Orbit size: ${_lieOrbitSize.toString()}\n# Full export disabled above ${orbitListLimitText()} weights to keep the page responsive.`;
  } else {
    renderOrbitTableOrMessage();
    let out = `# Weyl orbit  type=${_lastOrbitTypeStr}  rank=${_lastOrbitRank}\n`;
    out += _lieOrbit.map(w => '(' + w.join(', ') + ')').join('\n');
    exportOut.value = out;
  }
  revealExportCard(event);
}
function computeWeyl() {
  if (!isCardExpandedById('lie-weight')) return;
  const rows    = rowLengths();
  const typeStr = currentTypeStr();
  const warn    = document.getElementById('lie-warning');
  warn.textContent = '';
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
    _lieOrbitSize = 0n;
    _lastOrbitKey = '';
    _lastOrbitLabels = [];
    _lastOrbitTypeStr = '';
    _lastOrbitRank = 0;
    return;
  }
  // Compute Dynkin labels in the row-difference convention.
  let labels;
  try { labels = toDynkinLabels(typeStr, rows); }
  catch(e) { warn.textContent = '⚠ ' + e.message; return; }
  if (rows.length > n) {
    warn.textContent = `⚠ Only the first ${n} row${n === 1 ? '' : 's'} are used for this rank.`;
  }
  // Warn if any label negative (non-dominant). This should not happen for a valid Young diagram
  // in the row-difference convention, but the guard keeps the Weyl formula safe.
  if (labels.some(a => a < 0)) {
    warn.textContent = '⚠ Weight is not dominant — the orbit-size shortcut expects non-negative Dynkin labels.';
  }
  // Clamp negatives to 0 for dimension only; still display the actual labels.
  const labelsForDim = labels.map(a => Math.max(a, 0));
  // Compute dimension
  let dim;
  try { dim = weylDimGeneral(_cachedCoroots, labelsForDim); }
  catch(e) { warn.textContent = '⚠ Dim error: ' + e.message; return; }
  // Compute orbit size without enumerating the orbit.
  try { _lieOrbitSize = weylOrbitSizeFast(_cachedCartan, labelsForDim); }
  catch(e) { warn.textContent = '⚠ Orbit-size error: ' + e.message; return; }

  _lastOrbitLabels = labels.slice();
  _lastOrbitTypeStr = typeStr;
  _lastOrbitRank = n;
  _lastOrbitKey = `${typeStr}|${labels.join(',')}`;
  if (!_lieOrbit._key || _lieOrbit._key !== _lastOrbitKey) _lieOrbit = [];

  // Format weight display: λ is the padded row-length vector (a_1,...,a_n).
  const lamPad = Array.from({length:n}, (_,i) => rows[i]||0);
  const weightStr = '(' + lamPad.join(', ') + ')';
  document.getElementById('lie-weight').textContent      = weightStr;
  document.getElementById('lie-dynkin').textContent      = '[' + labels.join(', ') + ']';
  document.getElementById('lie-dim').textContent         = dim.toString();
  document.getElementById('lie-orbit-size').textContent  = _lieOrbitSize.toString();

  if (_orbitVisible) renderOrbitTableOrMessage();
  else document.getElementById('lie-orbit-table').innerHTML = '';
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
//  WEIGHT SPACE DECOMPOSITION
//  Lists dominant Weyl-orbit representatives γ with ||γ|| ≤ ||λ||.
//  Multiplicities are computed by Freudenthal's recursion and grouped by Weyl orbit.
// ─────────────────────────────────────────────
const WEIGHT_DECOMP_CANDIDATE_LIMIT = 12000;
const WEIGHT_DECOMP_EPS = 1e-7;
let _lastWeightDecomposition = null;

function cloneMatrix(M) { return M.map(row => row.slice()); }

function invertMatrix(M) {
  const n = M.length;
  const A = M.map((row, i) => {
    const r = row.map(Number);
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    }
    if (Math.abs(A[pivot][col]) < 1e-12) throw new Error('Singular Cartan matrix.');
    if (pivot !== col) [A[pivot], A[col]] = [A[col], A[pivot]];
    const div = A[col][col];
    for (let j = 0; j < 2 * n; j++) A[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col];
      if (Math.abs(f) < 1e-14) continue;
      for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[col][j];
    }
  }
  return A.map(row => row.slice(n));
}

function transposeMatrix(M) {
  return M[0].map((_, j) => M.map(row => row[j]));
}

function matVec(M, v) {
  return M.map(row => row.reduce((s, x, i) => s + x * v[i], 0));
}

function symmetrizerFromCartan(C) {
  const n = C.length;
  const d = Array(n).fill(null);
  for (let start = 0; start < n; start++) {
    if (d[start] !== null) continue;
    d[start] = 1;
    const queue = [start];
    while (queue.length) {
      const i = queue.shift();
      for (let j = 0; j < n; j++) {
        if (i === j || !C[i][j] || !C[j][i]) continue;
        // C[i][j] d_j = C[j][i] d_i, where d_i = (α_i,α_i)/2.
        const next = d[i] * C[j][i] / C[i][j];
        if (d[j] === null) {
          d[j] = next;
          queue.push(j);
        }
      }
    }
  }
  const minPositive = Math.min(...d.filter(x => x > 0));
  return d.map(x => x / minPositive);
}

function fundamentalWeightGram(C, d) {
  const invC = invertMatrix(C);
  const G = invC.map((row, i) => row.map((x, j) => x * d[j]));
  // Numerical symmetrization keeps tiny floating roundoff from affecting norm tests.
  for (let i = 0; i < G.length; i++) {
    for (let j = i + 1; j < G.length; j++) {
      const avg = (G[i][j] + G[j][i]) / 2;
      G[i][j] = avg;
      G[j][i] = avg;
    }
  }
  return G;
}

function dotDyn(a, b, G) {
  let s = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      s += a[i] * G[i][j] * b[j];
  return s;
}

function normDyn(a, G) { return dotDyn(a, a, G); }

function rootDynkinFromSimple(rootSimple, C) {
  const n = C.length;
  return Array.from({length: n}, (_, j) =>
    rootSimple.reduce((s, coeff, i) => s + coeff * C[i][j], 0)
  );
}

function innerWeightRoot(weightDyn, rootSimple, d) {
  return rootSimple.reduce((s, coeff, i) => s + coeff * d[i] * weightDyn[i], 0);
}

function addScaled(a, b, k) {
  return a.map((x, i) => x + k * b[i]);
}

function cleanIntArray(arr) {
  return arr.map(x => Math.abs(x) < WEIGHT_DECOMP_EPS ? 0 : Math.round(x));
}

function isDominantDyn(labels) {
  return labels.every(x => x >= -WEIGHT_DECOMP_EPS);
}

function dominantRepresentativeDyn(C, labels) {
  let w = cleanIntArray(labels);
  const n = C.length;
  const seen = new Set();
  for (let steps = 0; steps < 400; steps++) {
    const key = w.join(',');
    if (seen.has(key)) return null;
    seen.add(key);
    let i = w.findIndex(x => x < -WEIGHT_DECOMP_EPS);
    if (i < 0) return cleanIntArray(w);
    const ai = w[i];
    w = w.map((v, j) => v - ai * C[i][j]);
    w = cleanIntArray(w);
    if (w.length !== n) return null;
  }
  return null;
}

function dynkinToRows(labels) {
  const rows = [];
  let s = 0;
  for (let i = labels.length - 1; i >= 0; i--) {
    s += labels[i];
    rows[i] = s;
  }
  return trimPart(rows.map(x => Math.max(0, Math.round(x))));
}

function typeDisplayHTML(typeStr) {
  const sub = String(typeStr.includes(':') ? typeStr.split(':')[1] : typeStr.replace(/^[A-Z]/, ''))
    .replace(/0/g, '₀').replace(/1/g, '₁').replace(/2/g, '₂').replace(/3/g, '₃').replace(/4/g, '₄')
    .replace(/5/g, '₅').replace(/6/g, '₆').replace(/7/g, '₇').replace(/8/g, '₈').replace(/9/g, '₉');
  const type = typeStr.includes(':') ? typeStr.split(':')[0] : typeStr[0];
  return type + sub;
}

function vectorKey(v) { return v.join(','); }

function simpleRootCoordinatesForDiff(ctx, diffDyn) {
  // rootDyn = C^T * rootSimple, so solve C^T r = diffDyn.
  const coords = matVec(ctx.invCartanTranspose, diffDyn);
  const rounded = coords.map(x => Math.round(x));
  for (let i = 0; i < coords.length; i++) {
    if (Math.abs(coords[i] - rounded[i]) > 1e-6) return null;
    if (rounded[i] < 0) return null;
  }
  return rounded;
}

function isReachableFromHighest(ctx, gammaDyn) {
  if (!isDominantDyn(gammaDyn)) return false;
  const diff = ctx.lambdaDyn.map((x, i) => x - gammaDyn[i]);
  return !!simpleRootCoordinatesForDiff(ctx, diff);
}

function buildWeightDecompContext() {
  const rows = rowLengths();
  if (!rows.length) throw new Error('Draw a Young diagram first.');
  const typeStr = currentTypeStr();
  const C = cartanMatrix(typeStr);
  const rank = rankOf(typeStr);
  const lambdaDyn = toDynkinLabels(typeStr, rows).map(x => Math.max(0, x));
  const d = symmetrizerFromCartan(C);
  const G = fundamentalWeightGram(C, d);
  const positiveRootSimple = positiveRoots(C);
  const positiveRootData = positiveRootSimple.map(simple => ({
    simple,
    dyn: rootDynkinFromSimple(simple, C),
  }));
  const invCartanTranspose = invertMatrix(transposeMatrix(C));
  const rho = Array(rank).fill(1);
  const lambdaNorm = normDyn(lambdaDyn, G);
  const lambdaRhoNorm = normDyn(lambdaDyn.map((x, i) => x + rho[i]), G);
  return {
    rows, typeStr, C, rank, lambdaDyn, d, G, positiveRootData,
    invCartanTranspose, rho, lambdaNorm, lambdaRhoNorm,
    lambdaKey: vectorKey(lambdaDyn),
  };
}

function enumerateDominantWeightCandidates(ctx) {
  const maxPart = Math.max(...ctx.rows, 0);
  const current = [];
  const candidates = [];
  let truncated = false;
  function rec(pos, prev) {
    if (candidates.length >= WEIGHT_DECOMP_CANDIDATE_LIMIT) {
      truncated = true;
      return;
    }
    if (pos === ctx.rank) {
      const rows = trimPart(current.slice());
      const dyn = toDynkinLabels(ctx.typeStr, rows).map(x => Math.max(0, x));
      const gammaNorm = normDyn(dyn, ctx.G);
      if (gammaNorm <= ctx.lambdaNorm + WEIGHT_DECOMP_EPS && isReachableFromHighest(ctx, dyn)) {
        candidates.push({ rows, dyn, norm: gammaNorm });
      }
      return;
    }
    for (let v = prev; v >= 0; v--) {
      current[pos] = v;
      rec(pos + 1, v);
      if (truncated) return;
    }
  }
  rec(0, maxPart);
  candidates.sort((a, b) => {
    const nd = b.norm - a.norm;
    if (Math.abs(nd) > WEIGHT_DECOMP_EPS) return nd;
    for (let i = 0; i < Math.max(a.rows.length, b.rows.length); i++) {
      const d = (b.rows[i] || 0) - (a.rows[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  return { candidates, truncated };
}

function weightMultiplicityFreudenthal(ctx) {
  const memo = new Map([[ctx.lambdaKey, 1]]);
  const visiting = new Set();
  function multiplicity(gammaDynRaw) {
    const gammaDyn = cleanIntArray(gammaDynRaw);
    const key = vectorKey(gammaDyn);
    if (memo.has(key)) return memo.get(key);
    if (visiting.has(key)) return 0;
    if (!isReachableFromHighest(ctx, gammaDyn)) {
      memo.set(key, 0);
      return 0;
    }
    const gammaNorm = normDyn(gammaDyn, ctx.G);
    if (gammaNorm > ctx.lambdaNorm + WEIGHT_DECOMP_EPS) {
      memo.set(key, 0);
      return 0;
    }
    const gammaRho = gammaDyn.map((x, i) => x + ctx.rho[i]);
    const denom = ctx.lambdaRhoNorm - normDyn(gammaRho, ctx.G);
    if (denom <= WEIGHT_DECOMP_EPS) {
      memo.set(key, 0);
      return 0;
    }
    visiting.add(key);
    let sum = 0;
    for (const root of ctx.positiveRootData) {
      for (let k = 1; k < 200; k++) {
        const betaDyn = addScaled(gammaDyn, root.dyn, k);
        if (normDyn(betaDyn, ctx.G) > ctx.lambdaNorm + WEIGHT_DECOMP_EPS) break;
        const dom = dominantRepresentativeDyn(ctx.C, betaDyn);
        if (!dom) continue;
        const m = multiplicity(dom);
        if (m === 0) continue;
        sum += innerWeightRoot(betaDyn, root.simple, ctx.d) * m;
      }
    }
    visiting.delete(key);
    const value = Math.max(0, Math.round((2 * sum) / denom));
    memo.set(key, value);
    return value;
  }
  return multiplicity;
}

function renderWeightSpaceDecomposition(result) {
  const out = document.getElementById('lie-ws-output');
  const summary = document.getElementById('lie-ws-summary');
  const warn = document.getElementById('lie-ws-warning');
  if (!out || !summary || !warn) return;
  warn.textContent = result.warning || '';
  summary.textContent = `${result.entries.length} dominant representative${result.entries.length === 1 ? '' : 's'} · dim check ${result.totalContribution}/${result.dim}`;
  if (!result.entries.length) {
    out.innerHTML = '<span class="hint" style="display:block;padding:8px;">No nonzero dominant weight spaces found.</span>';
    return;
  }
  out.innerHTML = '';
  for (const entry of result.entries) {
    const row = document.createElement('div');
    row.className = 'decomp-row';

    const mult = document.createElement('span');
    mult.className = 'decomp-mult';
    mult.textContent = `×${entry.multiplicity}`;

    const diag = document.createElement('span');
    diag.className = 'decomp-diagram';
    diag.innerHTML = miniDiagramDecomp(entry.rows, 200);

    const label = document.createElement('span');
    label.className = 'decomp-label';
    const rowsText = entry.rows.length ? '(' + entry.rows.join(', ') + ')' : '( )';
    label.innerHTML = `${rowsText}<br><span class="decomp-dyn">[${entry.dyn.join(', ')}]</span> <span class="decomp-orbit">|Wγ|=${entry.orbitSize}</span>`;

    row.appendChild(mult);
    row.appendChild(diag);
    row.appendChild(label);
    out.appendChild(row);
  }
}

function computeWeightSpaceDecomposition() {
  const warn = document.getElementById('lie-ws-warning');
  const out = document.getElementById('lie-ws-output');
  const summary = document.getElementById('lie-ws-summary');
  if (warn) warn.textContent = '';
  try {
    const ctx = buildWeightDecompContext();
    const dim = weylDimGeneral(positiveCoroots(ctx.C), ctx.lambdaDyn).toString();
    const { candidates, truncated } = enumerateDominantWeightCandidates(ctx);
    const mult = weightMultiplicityFreudenthal(ctx);
    const seen = new Set();
    const entries = [];
    for (const cand of candidates) {
      const key = vectorKey(cand.dyn);
      if (seen.has(key)) continue;
      seen.add(key);
      const m = mult(cand.dyn);
      if (!m) continue;
      let orbitSize = 1n;
      try { orbitSize = weylOrbitSizeFast(ctx.C, cand.dyn.map(x => Math.max(0, x))); }
      catch (_) { orbitSize = 1n; }
      const contribution = orbitSize * BigInt(m);
      entries.push({
        rows: cand.rows,
        dyn: cand.dyn,
        multiplicity: m,
        orbitSize: orbitSize.toString(),
        contribution: contribution.toString(),
        norm: cand.norm,
      });
    }
    entries.sort((a, b) => {
      const nd = b.norm - a.norm;
      if (Math.abs(nd) > WEIGHT_DECOMP_EPS) return nd;
      for (let i = 0; i < Math.max(a.rows.length, b.rows.length); i++) {
        const d = (b.rows[i] || 0) - (a.rows[i] || 0);
        if (d !== 0) return d;
      }
      return 0;
    });
    const totalContribution = entries.reduce((s, e) => s + BigInt(e.contribution), 0n).toString();
    const warning = truncated
      ? `⚠ Candidate search stopped at ${WEIGHT_DECOMP_CANDIDATE_LIMIT} dominant diagrams. Increase the cap in the source for larger examples.`
      : (totalContribution !== dim ? `⚠ Dimension check gives ${totalContribution}/${dim}; this can happen if the diagram is too large for the current cap or conventions.` : '');
    const result = {
      typeStr: ctx.typeStr,
      lambdaRows: ctx.rows,
      lambdaDyn: ctx.lambdaDyn,
      dim,
      totalContribution,
      entries,
      warning,
    };
    _lastWeightDecomposition = result;
    renderWeightSpaceDecomposition(result);
  } catch (e) {
    _lastWeightDecomposition = null;
    if (warn) warn.textContent = '⚠ ' + e.message;
    if (summary) summary.textContent = 'Unable to compute decomposition.';
    if (out) out.innerHTML = '<span class="hint" style="display:block;padding:8px;">No decomposition computed.</span>';
  }
}

function exportWeightSpaceDecomposition(event) {
  if (!_lastWeightDecomposition) computeWeightSpaceDecomposition();
  const result = _lastWeightDecomposition;
  if (!result) return;
  const exportOut = document.getElementById('export-out');
  if (!exportOut) return;
  const lambdaRows = result.lambdaRows.length ? '(' + result.lambdaRows.join(', ') + ')' : '( )';
  let txt = `# Weight space decomposition of V^lambda\n`;
  txt += `# type: ${result.typeStr}\n`;
  txt += `# lambda rows: ${lambdaRows}\n`;
  txt += `# lambda Dynkin: [${result.lambdaDyn.join(', ')}]\n`;
  txt += `# grouped by dominant Weyl-orbit representatives gamma\n`;
  txt += `# dimension check: ${result.totalContribution}/${result.dim}\n`;
  txt += `# columns: multiplicity, orbit_size, gamma_rows, gamma_dynkin\n`;
  for (const e of result.entries) {
    const rows = e.rows.length ? '(' + e.rows.join(', ') + ')' : '( )';
    txt += `${e.multiplicity}\t${e.orbitSize}\t${rows}\t[${e.dyn.join(', ')}]\n`;
  }
  exportOut.value = txt.trimEnd();
  revealExportCard(event);
}


// ─────────────────────────────────────────────
//  Card collapse toggle
// ─────────────────────────────────────────────
const MAX_OPEN_CHART_CARDS = 3;
let openChartCardSequence = 0;
let temporaryOpenLimitProtectedCard = null;
let cardPinBreakpointListenerReady = false;

function isOpenChartLimitCard(card) {
  if (!card || !card.classList.contains('card')) return false;
  if (card.closest('.canvas-panel')) return false;
  if (card.id === 'diagram-input-card' && card.getAttribute('draggable') !== 'true') return false;
  return true;
}

function latestOpenChartCardExcluding(excludedCard) {
  return Array.from(document.querySelectorAll('.card:not(.collapsed)'))
    .filter(card => card !== excludedCard && isOpenChartLimitCard(card))
    .sort((a, b) => Number(b.dataset.openChartOrder || 0) - Number(a.dataset.openChartOrder || 0))[0] || null;
}

function cardPinningEnabled() {
  return !(cardPinBreakpointMedia && cardPinBreakpointMedia.matches);
}

function isCardPinnedForOpenLimit(card) {
  return cardPinningEnabled() && card && card.classList.contains('is-pinned');
}

function syncCardPinAvailability() {
  const enabled = cardPinningEnabled();
  document.querySelectorAll('.card-pin-btn').forEach(btn => {
    btn.disabled = !enabled;
    btn.setAttribute('aria-hidden', String(!enabled));
  });
}

function initCardPinBreakpoint() {
  if (!cardPinBreakpointMedia || cardPinBreakpointListenerReady) {
    syncCardPinAvailability();
    return;
  }
  cardPinBreakpointListenerReady = true;
  const listener = () => syncCardPinAvailability();
  if (typeof cardPinBreakpointMedia.addEventListener === 'function') {
    cardPinBreakpointMedia.addEventListener('change', listener);
  } else if (typeof cardPinBreakpointMedia.addListener === 'function') {
    cardPinBreakpointMedia.addListener(listener);
  }
  syncCardPinAvailability();
}

function setCardAriaExpanded(card, expanded) {
  const head = card ? card.querySelector('.card-head') : null;
  if (head) head.setAttribute('aria-expanded', String(!!expanded));
}

function collapseCard(card) {
  if (!card) return;
  card.classList.add('collapsed');
  setCardAriaExpanded(card, false);
}

function toggleCardPinned(card, pinned) {
  if (!card) return;
  if (!cardPinningEnabled()) return;
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
  const protectedCard = temporaryOpenLimitProtectedCard;
  const openCards = Array.from(document.querySelectorAll('.card:not(.collapsed)'))
    .filter(isOpenChartLimitCard)
    .sort((a, b) => Number(a.dataset.openChartOrder || 0) - Number(b.dataset.openChartOrder || 0));
  while (openCards.length > MAX_OPEN_CHART_CARDS) {
    const victim = openCards.find(card => card !== activeCard && card !== protectedCard && !isCardPinnedForOpenLimit(card));
    if (!victim) break; // On wide screens, pinned cards are exempt from the open-card limit.
    collapseCard(victim);
    openCards.splice(openCards.indexOf(victim), 1);
  }
}

function openCard(card, refreshOnOpen = true, protectedCard = null) {
  if (!card) return;
  card.classList.remove('collapsed');
  setCardAriaExpanded(card, true);
  const previousProtectedCard = temporaryOpenLimitProtectedCard;
  temporaryOpenLimitProtectedCard = protectedCard && protectedCard !== card ? protectedCard : previousProtectedCard;
  try {
    enforceOpenChartCardLimit(card);
  } finally {
    temporaryOpenLimitProtectedCard = previousProtectedCard;
  }
  if (refreshOnOpen) refreshCardCalculation(card);
}

function toggleCard(eventOrHead, maybeHead) {
  const event = maybeHead ? eventOrHead : window.event;
  const headEl = maybeHead || eventOrHead;
  if (event && event.target && event.target.closest && event.target.closest('.card-pin-btn')) return;
  const card = headEl.closest('.card');
  if (card.classList.contains('collapsed')) openCard(card);
  else collapseCard(card);
}



// ─────────────────────────────────────────────
//  Custom tooltips (more reliable than native title tooltips inside cards)
// ─────────────────────────────────────────────
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

  document.addEventListener('pointerenter', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
    if (el) showTooltip(el);
  }, true);
  document.addEventListener('pointerleave', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
    if (el) hideTooltip(el);
  }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
    if (el) showTooltip(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
    if (el) hideTooltip(el);
  });
  window.addEventListener('scroll', () => { if (activeEl) placeTooltip(activeEl); }, true);
  window.addEventListener('resize', () => { if (activeEl) placeTooltip(activeEl); });
}

// ─────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────
let youngDiagramPageInitialized = false;
function initYoungDiagramPage() {
  if (youngDiagramPageInitialized) return;
  youngDiagramPageInitialized = true;
  document.querySelectorAll('.card').forEach(card => {
    card.classList.add('collapsed');
    const head = card.querySelector('.card-head');
    if (head) head.setAttribute('aria-expanded', 'false');
  });
  initCardChrome();
  initCardPinBreakpoint();
  initGridSizeControls();
  applyYoungUrlState();
  initCustomTooltips();
  initSymfunVariableControls();
  resetExportToDefaultCitation();
  scheduleCanvasResizePasses();
  onTypeChange();   // initialise lie algebra card UI state without computing collapsed data
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initYoungDiagramPage, { once: true });
} else {
  initYoungDiagramPage();
}
window.addEventListener('load', scheduleCanvasResizePasses, { once: true });
