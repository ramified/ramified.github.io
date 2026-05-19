(() => {
  'use strict';

  const MAX_SIZE = 8;
  const TOL = 1e-10;
  const DISPLAY_TOL = 1e-12;
  const CHARPOLY_TIMEOUT_MS = 1500;

  class Complex {
    constructor(re = 0, im = 0) {
      this.re = Number(re) || 0;
      this.im = Number(im) || 0;
    }

    static from(value) {
      return value instanceof Complex ? value : new Complex(value, 0);
    }

    clone() { return new Complex(this.re, this.im); }
    add(other) { other = Complex.from(other); return new Complex(this.re + other.re, this.im + other.im); }
    sub(other) { other = Complex.from(other); return new Complex(this.re - other.re, this.im - other.im); }
    neg() { return new Complex(-this.re, -this.im); }
    scale(k) { return new Complex(this.re * k, this.im * k); }
    conj() { return new Complex(this.re, -this.im); }
    abs2() { return this.re * this.re + this.im * this.im; }
    abs() { return Math.hypot(this.re, this.im); }
    isZero(tol = TOL) { return this.abs2() <= tol * tol; }

    mul(other) {
      other = Complex.from(other);
      return new Complex(
        this.re * other.re - this.im * other.im,
        this.re * other.im + this.im * other.re
      );
    }

    div(other) {
      other = Complex.from(other);
      const den = other.abs2();
      if (den <= TOL * TOL) throw new Error('Division by zero.');
      return new Complex(
        (this.re * other.re + this.im * other.im) / den,
        (this.im * other.re - this.re * other.im) / den
      );
    }

    sqrt() {
      if (Math.abs(this.im) < DISPLAY_TOL && this.re >= 0) return new Complex(Math.sqrt(this.re), 0);
      const r = this.abs();
      const re = Math.sqrt(Math.max(0, (r + this.re) / 2));
      const imSign = this.im < 0 ? -1 : 1;
      const im = imSign * Math.sqrt(Math.max(0, (r - this.re) / 2));
      return new Complex(re, im);
    }
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
    static fromInt(value) { return new Fraction(toBigInt(value), 1n); }

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
    isMinusOne() { return this.num === -this.den; }
    sign() { return this.num < 0n ? -1 : this.num > 0n ? 1 : 0; }
    toNumber() { return Number(this.num) / Number(this.den); }

    static from(value) {
      return value instanceof Fraction ? value : new Fraction(value, 1n);
    }
  }

  class ExactScalar {
    constructor(re = Fraction.zero(), im = Fraction.zero()) {
      this.re = Fraction.from(re);
      this.im = Fraction.from(im);
    }

    static zero() { return new ExactScalar(Fraction.zero(), Fraction.zero()); }
    static one() { return new ExactScalar(Fraction.one(), Fraction.zero()); }
    static fromFraction(value) { return new ExactScalar(value, Fraction.zero()); }

    clone() { return new ExactScalar(this.re, this.im); }
    add(other) { other = ExactScalar.from(other); return new ExactScalar(this.re.add(other.re), this.im.add(other.im)); }
    sub(other) { other = ExactScalar.from(other); return new ExactScalar(this.re.sub(other.re), this.im.sub(other.im)); }
    neg() { return new ExactScalar(this.re.neg(), this.im.neg()); }
    isZero() { return this.re.isZero() && this.im.isZero(); }
    isReal() { return this.im.isZero(); }

    mul(other) {
      other = ExactScalar.from(other);
      return new ExactScalar(
        this.re.mul(other.re).sub(this.im.mul(other.im)),
        this.re.mul(other.im).add(this.im.mul(other.re))
      );
    }

    div(other) {
      other = ExactScalar.from(other);
      const den = other.re.mul(other.re).add(other.im.mul(other.im));
      if (den.isZero()) throw new Error('Division by zero.');
      return new ExactScalar(
        this.re.mul(other.re).add(this.im.mul(other.im)).div(den),
        this.im.mul(other.re).sub(this.re.mul(other.im)).div(den)
      );
    }

    toComplex() {
      return new Complex(this.re.toNumber(), this.im.toNumber());
    }

    static from(value) {
      if (value instanceof ExactScalar) return value;
      if (value instanceof Fraction) return ExactScalar.fromFraction(value);
      return new ExactScalar(new Fraction(value, 1n), Fraction.zero());
    }
  }

  const state = {
    rows: 5,
    cols: 5,
    lastOperationResult: null,
    entries: [
      ['1', '0', '0', '0', '0'],
      ['0', '1', '0', '0', '0'],
      ['0', '0', '1', '0', '0'],
      ['0', '0', '0', '1', '0'],
      ['0', '0', '0', '0', '1']
    ]
  };

  const refs = {};
  let mathJaxTypesetQueue = Promise.resolve();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    bindControls();
    bindCards();
    renderMatrixGrid();
    refreshAll();
    refreshExport();
  }

  function collectRefs() {
    refs.grid = $('matrix-grid');
    refs.rows = $('matrix-rows');
    refs.cols = $('matrix-cols');
    refs.presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
    refs.dataType = $('data-type-select');
    refs.statusBadge = $('status-badge');
    refs.matrixStatus = $('matrix-status');
    refs.matrixSummary = $('matrix-summary');
    refs.clearMatrix = $('clear-matrix');
    refs.outSize = $('out-size');
    refs.outRank = $('out-rank');
    refs.outTrace = $('out-trace');
    refs.outDet = $('out-det');
    refs.outCharpoly = $('out-charpoly');
    refs.charpolyFactor = $('charpoly-factor');
    refs.operation = $('operation-select');
    refs.resultMode = $('result-mode-select');
    refs.powerRow = $('power-row');
    refs.powerExponent = $('power-exponent');
    refs.compute = $('compute-operation');
    refs.exportOperation = $('export-operation');
    refs.clearOutput = $('clear-output');
    refs.operationMessage = $('operation-message');
    refs.operationOutput = $('operation-output');
    refs.applyBulk = $('apply-bulk');
    refs.bulkMessage = $('bulk-message');
    refs.importDialog = $('import-dialog');
    refs.importText = $('import-text');
    refs.importDialogMessage = $('import-dialog-message');
    refs.confirmImport = $('confirm-import');
    refs.cancelImport = $('cancel-import');
    refs.exportFormat = $('export-format');
    refs.refreshExport = $('refresh-export');
    refs.copyExport = $('copy-export');
    refs.exportOut = $('export-out');
  }

  function $(id) {
    return document.getElementById(id);
  }

  function bindControls() {
    refs.rows.addEventListener('change', applySizeInputs);
    refs.cols.addEventListener('change', applySizeInputs);
    refs.presetButtons.forEach((button) => {
      button.addEventListener('click', () => setPresetEntries(button.dataset.preset));
    });
    refs.dataType.addEventListener('change', () => {
      clearOperationResult();
      refreshAll();
    });
    refs.clearMatrix.addEventListener('click', () => setAllEntries(''));
    refs.operation.addEventListener('change', updateOperationControls);
    refs.resultMode.addEventListener('change', clearOperationResult);
    refs.charpolyFactor.addEventListener('click', factorCharacteristicPolynomial);
    refs.operationOutput.addEventListener('click', handleOperationOutputClick);
    refs.powerExponent.addEventListener('change', () => {
      refs.powerExponent.value = String(clampInt(refs.powerExponent.value, -12, 12, 2));
    });
    refs.compute.addEventListener('click', computeSelectedOperation);
    refs.exportOperation.addEventListener('click', exportOperationResult);
    refs.clearOutput.addEventListener('click', () => {
      clearOperationResult();
    });
    refs.applyBulk.addEventListener('click', openImportDialog);
    refs.confirmImport.addEventListener('click', applyBulkInput);
    refs.cancelImport.addEventListener('click', closeImportDialog);
    refs.importDialog.addEventListener('click', (event) => {
      if (event.target === refs.importDialog) closeImportDialog();
    });
    refs.importText.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeImportDialog();
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') applyBulkInput();
    });
    refs.exportFormat.addEventListener('change', refreshExport);
    refs.refreshExport.addEventListener('click', refreshExport);
    refs.copyExport.addEventListener('click', copyExport);
    updateOperationControls();
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
        ghost.id = 'dnd-ghost';
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
      dragCard.classList.remove('dragging');
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

  function renderMatrixGrid() {
    refs.grid.style.gridTemplateColumns = `repeat(${state.cols}, minmax(76px, 88px))`;
    refs.grid.innerHTML = '';
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'matrix-cell';
        input.inputMode = 'text';
        input.spellcheck = false;
        input.autocomplete = 'off';
        input.value = state.entries[r]?.[c] ?? '';
        input.setAttribute('aria-label', `matrix entry row ${r + 1}, column ${c + 1}`);
        input.dataset.row = String(r);
        input.dataset.col = String(c);
        input.addEventListener('input', () => {
          state.entries[r][c] = input.value;
          clearOperationResult();
          refreshAll();
        });
        input.addEventListener('focus', () => input.select());
        refs.grid.appendChild(input);
      }
    }
  }

  function applySizeInputs() {
    const rows = clampInt(refs.rows.value, 1, MAX_SIZE, state.rows);
    const cols = clampInt(refs.cols.value, 1, MAX_SIZE, state.cols);
    resizeMatrix(rows, cols);
    clearOperationResult();
  }

  function resizeMatrix(rows, cols) {
    const next = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(state.entries[r]?.[c] ?? '');
      next.push(row);
    }
    state.rows = rows;
    state.cols = cols;
    state.entries = next;
    refs.rows.value = String(rows);
    refs.cols.value = String(cols);
    clearOperationResult();
    renderMatrixGrid();
    refreshAll();
  }

  function setPresetEntries(kind) {
    const rows = state.rows;
    const cols = state.cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (kind === 'zero') state.entries[r][c] = '0';
        else if (kind === 'identity') state.entries[r][c] = r === c ? '1' : '0';
        else if (kind === 'diagonal') {
          if (r !== c) state.entries[r][c] = '0';
        } else if (kind === 'random') state.entries[r][c] = randomEntryForType();
        else if (kind === 'cyclic') state.entries[r][c] = cyclicEntry(r, c);
        else if (kind === 'upper' && r > c) state.entries[r][c] = '0';
        else if (kind === 'symmetric' && r > c) state.entries[r][c] = state.entries[c]?.[r] ?? '0';
        else if (kind === 'antisymmetric') {
          if (r === c) state.entries[r][c] = '0';
          else if (r > c) state.entries[r][c] = negateEntryText(state.entries[c]?.[r] ?? '0');
        }
      }
    }
    clearOperationResult();
    renderMatrixGrid();
    refreshAll();
  }

  function randomEntryForType() {
    const type = refs.dataType ? refs.dataType.value : 'complex';
    if (type === 'integer') return String(randomInt(-5, 5));
    if (type === 'rational') {
      const den = randomInt(1, 7);
      const num = randomInt(-9, 9);
      return formatReducedFraction(num, den);
    }
    if (type === 'real') return formatReal((Math.random() * 10) - 5, 5);
    const re = randomInt(-4, 4);
    const im = randomInt(-4, 4);
    if (im === 0) return String(re);
    if (re === 0) return im === 1 ? 'i' : im === -1 ? '-i' : `${im}i`;
    return `${re}${im > 0 ? '+' : ''}${im === 1 ? 'i' : im === -1 ? '-i' : `${im}i`}`;
  }

  function negateEntryText(text) {
    const raw = String(text ?? '').trim();
    if (!raw || raw === '0') return '0';
    try {
      const parsed = parseEntry(raw);
      const neg = parsed.value.neg();
      return formatComplex(neg, 14).replace(/\s+/g, '');
    } catch (_) {
      return raw.startsWith('-') ? raw.slice(1) : `-(${raw})`;
    }
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatReducedFraction(num, den) {
    if (den === 0) return '0';
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcdInt(Math.abs(num), Math.abs(den));
    const n = num / g;
    const d = den / g;
    return d === 1 ? String(n) : `${n}/${d}`;
  }

  function gcdInt(a, b) {
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function toBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) throw new Error('Expected an integer.');
      return BigInt(value);
    }
    return BigInt(String(value));
  }

  function bigintAbs(value) {
    return value < 0n ? -value : value;
  }

  function bigintGcd(a, b) {
    a = bigintAbs(a);
    b = bigintAbs(b);
    while (b !== 0n) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1n;
  }

  function pow10BigInt(exp) {
    let out = 1n;
    for (let i = 0; i < exp; i++) out *= 10n;
    return out;
  }

  function cyclicEntry(r, c) {
    if (r === 0 || c === 0) return state.entries[r]?.[c] ?? '0';
    return state.entries[r - 1]?.[c - 1] ?? '0';
  }

  function setAllEntries(value) {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) state.entries[r][c] = value;
    }
    clearOperationResult();
    renderMatrixGrid();
    refreshAll();
  }

  function updateOperationControls() {
    refs.powerRow.hidden = refs.operation.value !== 'power';
  }

  function refreshAll() {
    const data = readMatrix(true);
    updateInvariants(data);
    refreshExport();
  }

  function readMatrix(markCells) {
    const matrix = [];
    const details = [];
    const errors = [];
    for (let r = 0; r < state.rows; r++) {
      const row = [];
      const detailRow = [];
      for (let c = 0; c < state.cols; c++) {
        const text = state.entries[r]?.[c] ?? '';
        const input = refs.grid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        try {
          const parsed = parseEntry(text);
          validateEntryType(parsed);
          row.push(parsed.value);
          detailRow.push(parsed);
          if (markCells && input) input.classList.remove('invalid');
        } catch (error) {
          row.push(new Complex(0, 0));
          detailRow.push(null);
          errors.push({ row: r + 1, col: c + 1, message: error.message });
          if (markCells && input) input.classList.add('invalid');
        }
      }
      matrix.push(row);
      details.push(detailRow);
    }
    return { matrix, details, errors, rows: state.rows, cols: state.cols };
  }

  function validateEntryType(entry) {
    const type = refs.dataType ? refs.dataType.value : 'complex';
    if (type === 'complex') return;
    if (Math.abs(entry.value.im) > DISPLAY_TOL) {
      throw new Error(`Expected a ${type} entry.`);
    }
    if (type === 'real') return;
    if (type === 'rational' && !isExactRationalPart(entry.real)) {
      throw new Error('Expected an exact rational entry, such as 2 or -3/5.');
    }
    if (type === 'integer' && !isExactIntegerPart(entry.real)) {
      throw new Error('Expected an integer entry.');
    }
  }

  function isExactRationalPart(part) {
    const raw = stripLeadingPlus(String(part.raw || '').trim());
    if (/^-?\d+$/.test(raw)) return true;
    if (/^-?\d+\/-?\d+$/.test(raw)) return Math.abs(Number(raw.split('/')[1])) > DISPLAY_TOL;
    return false;
  }

  function isExactIntegerPart(part) {
    return /^-?\d+$/.test(stripLeadingPlus(String(part.raw || '').trim()));
  }

  function updateInvariants(data) {
    const sizeText = `${data.rows} x ${data.cols}`;
    refs.statusBadge.textContent = sizeText;
    refs.outSize.textContent = sizeText;

    if (data.errors.length) {
      const first = data.errors[0];
      refs.matrixStatus.textContent = `invalid entry at (${first.row}, ${first.col})`;
      refs.matrixSummary.textContent = first.message;
      for (const ref of [refs.outRank, refs.outTrace, refs.outDet, refs.outCharpoly]) ref.textContent = '-';
      return;
    }

    const rankValue = matrixRank(data.matrix);
    refs.outRank.textContent = String(rankValue);
    refs.outTrace.textContent = data.rows === data.cols ? formatComplex(trace(data.matrix)) : 'not square';
    refs.outDet.textContent = data.rows === data.cols ? formatComplex(determinant(data.matrix)) : 'not square';
    if (data.rows === data.cols) {
      const result = charPolyForDisplay(data);
      refs.outCharpoly.textContent = charPolyDisplayText(result);
      refs.outCharpoly.title = result.error || result.note || 'click chi_A(T) to factor over the selected field';
    } else {
      refs.outCharpoly.textContent = 'not square';
      refs.outCharpoly.title = '';
    }
    refs.matrixStatus.textContent = 'ready';
    refs.matrixSummary.textContent = `rank ${rankValue}`;
  }

  function parseEntry(text) {
    const raw = String(text ?? '').trim();
    if (!raw) return zeroDetail(raw);
    let s = raw
      .replace(/[−–—]/g, '-')
      .replace(/\s+/g, '')
      .replace(/[jJ]/g, 'i')
      .replace(/\*/g, '');
    s = stripOuterParens(s);
    if (!s) return zeroDetail(raw);
    if (!/^[0-9eE+\-./i()]+$/.test(s)) throw new Error('Use numbers such as 2, -3/5, 1.2, or 1+2i.');

    const iCount = (s.match(/i/g) || []).length;
    if (iCount > 1) throw new Error('Use one imaginary unit per entry, e.g. 1+2i.');

    let realPart;
    let imagPart;
    if (iCount === 0) {
      realPart = parseRealComponent(s, false);
      imagPart = makePart(0, '0');
    } else if (s.endsWith('i')) {
      const body = s.slice(0, -1);
      const split = findSplitSign(body);
      if (split > 0) {
        realPart = parseRealComponent(body.slice(0, split), false);
        imagPart = parseRealComponent(body.slice(split), true);
      } else {
        realPart = makePart(0, '0');
        imagPart = parseRealComponent(body, true);
      }
    } else {
      const iIndex = s.indexOf('i');
      const imagText = s.slice(0, iIndex);
      const realText = s.slice(iIndex + 1);
      if (!realText || !/^[+-]/.test(realText)) throw new Error('Write complex numbers as a+bi or bi+a.');
      realPart = parseRealComponent(realText, false);
      imagPart = parseRealComponent(imagText, true);
    }

    return {
      raw,
      real: realPart,
      imag: imagPart,
      value: new Complex(realPart.value, imagPart.value)
    };
  }

  function zeroDetail(raw) {
    return {
      raw,
      real: makePart(0, '0'),
      imag: makePart(0, '0'),
      value: new Complex(0, 0)
    };
  }

  function parseRealComponent(text, allowUnit) {
    const token = stripOuterParens(String(text || ''));
    if (token === '' || token === '+') {
      if (allowUnit) return makePart(1, '1');
      throw new Error('Missing real component.');
    }
    if (token === '-') {
      if (allowUnit) return makePart(-1, '-1');
      throw new Error('Missing real component.');
    }

    const slashCount = (token.match(/\//g) || []).length;
    if (slashCount === 1) {
      const [numText, denText] = token.split('/');
      const num = Number(numText);
      const den = Number(denText);
      if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < TOL) {
        throw new Error('Invalid rational number.');
      }
      return makePart(num / den, token, { numText, denText });
    }
    if (slashCount > 1) throw new Error('Invalid rational number.');

    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error('Invalid real number.');
    return makePart(value, token);
  }

  function makePart(value, raw, rational = null) {
    return { value, raw: String(raw), rational };
  }

  function exactScalarFromDetail(entry) {
    return new ExactScalar(exactFractionFromPart(entry.real), exactFractionFromPart(entry.imag));
  }

  function exactFractionFromPart(part) {
    if (part.rational) {
      return new Fraction(toBigInt(part.rational.numText), toBigInt(part.rational.denText));
    }
    return exactFractionFromDecimalText(part.raw);
  }

  function exactFractionFromDecimalText(text) {
    let raw = stripLeadingPlus(String(text || '0').trim());
    if (!raw || raw === '-') return new Fraction(raw === '-' ? -1n : 0n, 1n);
    let sign = 1n;
    if (raw.startsWith('-')) {
      sign = -1n;
      raw = raw.slice(1);
    }
    const match = raw.match(/^(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/);
    if (!match) throw new Error('Symbolic mode supports decimal, integer, and rational entries.');
    const whole = match[1] || '0';
    const frac = match[2] ?? match[3] ?? '';
    const exp = Number(match[4] || '0');
    const digits = (whole + frac).replace(/^0+(?=\d)/, '') || '0';
    let num = BigInt(digits) * sign;
    let den = pow10BigInt(frac.length);
    if (exp >= 0) num *= pow10BigInt(exp);
    else den *= pow10BigInt(-exp);
    return new Fraction(num, den);
  }

  function exactMatrixFromDetails(details) {
    return details.map((row) => row.map(exactScalarFromDetail));
  }

  function stripOuterParens(text) {
    let s = String(text || '');
    while (s.length >= 2 && s[0] === '(' && s[s.length - 1] === ')' && hasBalancedOuterParens(s)) {
      s = s.slice(1, -1);
    }
    return s;
  }

  function hasBalancedOuterParens(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') depth--;
      if (depth === 0 && i < s.length - 1) return false;
      if (depth < 0) return false;
    }
    return depth === 0;
  }

  function findSplitSign(text) {
    for (let i = text.length - 1; i > 0; i--) {
      const ch = text[i];
      const prev = text[i - 1];
      if ((ch === '+' || ch === '-') && prev !== 'e' && prev !== 'E') return i;
    }
    return -1;
  }

  function clampInt(value, min, max, fallback) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function copyMatrix(A) {
    return A.map((row) => row.map((z) => z.clone()));
  }

  function zeros(rows, cols) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Complex(0, 0)));
  }

  function identity(n) {
    const out = zeros(n, n);
    for (let i = 0; i < n; i++) out[i][i] = new Complex(1, 0);
    return out;
  }

  function matrixAdd(A, B) {
    return A.map((row, r) => row.map((z, c) => z.add(B[r][c])));
  }

  function matrixScale(A, k) {
    return A.map((row) => row.map((z) => z.scale(k)));
  }

  function matrixMultiply(A, B) {
    const rows = A.length;
    const inner = A[0]?.length || 0;
    const cols = B[0]?.length || 0;
    const out = zeros(rows, cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = new Complex(0, 0);
        for (let k = 0; k < inner; k++) sum = sum.add(A[r][k].mul(B[k][c]));
        out[r][c] = sum;
      }
    }
    return out;
  }

  function transpose(A) {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    const out = zeros(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) out[c][r] = A[r][c].clone();
    }
    return out;
  }

  function trace(A) {
    let sum = new Complex(0, 0);
    for (let i = 0; i < A.length; i++) sum = sum.add(A[i][i]);
    return sum;
  }

  function maxMatrixNorm(A) {
    let max = 0;
    for (const row of A) {
      let total = 0;
      for (const z of row) total += z.abs();
      max = Math.max(max, total);
    }
    return max;
  }

  function matrixRank(A) {
    return rref(A).rank;
  }

  function rref(A, tol = TOL) {
    const M = copyMatrix(A);
    const rows = M.length;
    const cols = M[0]?.length || 0;
    let pivotRow = 0;
    const pivots = [];
    for (let col = 0; col < cols && pivotRow < rows; col++) {
      let best = pivotRow;
      let bestAbs = M[best][col].abs();
      for (let r = pivotRow + 1; r < rows; r++) {
        const value = M[r][col].abs();
        if (value > bestAbs) {
          best = r;
          bestAbs = value;
        }
      }
      if (bestAbs <= tol) continue;
      if (best !== pivotRow) [M[pivotRow], M[best]] = [M[best], M[pivotRow]];
      const pivot = M[pivotRow][col];
      for (let c = col; c < cols; c++) M[pivotRow][c] = M[pivotRow][c].div(pivot);
      for (let r = 0; r < rows; r++) {
        if (r === pivotRow) continue;
        const factor = M[r][col];
        if (factor.isZero(tol)) continue;
        for (let c = col; c < cols; c++) M[r][c] = M[r][c].sub(factor.mul(M[pivotRow][c]));
      }
      pivots.push(col);
      pivotRow++;
    }
    return { matrix: M, pivots, rank: pivotRow };
  }

  function nullspace(A, tol = TOL) {
    const cols = A[0]?.length || 0;
    const { matrix: R, pivots } = rref(A, tol);
    const pivotSet = new Set(pivots);
    const freeCols = [];
    for (let c = 0; c < cols; c++) if (!pivotSet.has(c)) freeCols.push(c);
    return freeCols.map((freeCol) => {
      const v = Array.from({ length: cols }, () => new Complex(0, 0));
      v[freeCol] = new Complex(1, 0);
      for (let i = pivots.length - 1; i >= 0; i--) {
        const pivotCol = pivots[i];
        let sum = new Complex(0, 0);
        for (const c of freeCols) sum = sum.add(R[i][c].mul(v[c]));
        v[pivotCol] = sum.neg();
      }
      return normalizeVector(v);
    });
  }

  function nullity(A, tol = TOL) {
    const cols = A[0]?.length || 0;
    return cols - rref(A, tol).rank;
  }

  function determinant(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Determinant requires a square matrix.');
    const n = A.length;
    const M = copyMatrix(A);
    let det = new Complex(1, 0);
    let sign = 1;
    for (let col = 0; col < n; col++) {
      let pivotRow = col;
      let pivotAbs = M[col][col].abs();
      for (let r = col + 1; r < n; r++) {
        const value = M[r][col].abs();
        if (value > pivotAbs) {
          pivotRow = r;
          pivotAbs = value;
        }
      }
      if (pivotAbs <= TOL) return new Complex(0, 0);
      if (pivotRow !== col) {
        [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
        sign *= -1;
      }
      const pivot = M[col][col];
      det = det.mul(pivot);
      for (let r = col + 1; r < n; r++) {
        const factor = M[r][col].div(pivot);
        for (let c = col; c < n; c++) M[r][c] = M[r][c].sub(factor.mul(M[col][c]));
      }
    }
    return det.scale(sign);
  }

  function inverse(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Inverse requires a square matrix.');
    const n = A.length;
    const M = A.map((row, r) => [
      ...row.map((z) => z.clone()),
      ...identity(n)[r].map((z) => z.clone())
    ]);

    for (let col = 0; col < n; col++) {
      let pivotRow = col;
      let pivotAbs = M[col][col].abs();
      for (let r = col + 1; r < n; r++) {
        const value = M[r][col].abs();
        if (value > pivotAbs) {
          pivotRow = r;
          pivotAbs = value;
        }
      }
      if (pivotAbs <= TOL) throw new Error('The matrix is singular.');
      if (pivotRow !== col) [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      const pivot = M[col][col];
      for (let c = 0; c < 2 * n; c++) M[col][c] = M[col][c].div(pivot);
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = M[r][col];
        if (factor.isZero()) continue;
        for (let c = 0; c < 2 * n; c++) M[r][c] = M[r][c].sub(factor.mul(M[col][c]));
      }
    }
    return M.map((row) => row.slice(n));
  }

  function matrixPower(A, exponent) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Matrix powers require a square matrix.');
    if (!Number.isInteger(exponent)) throw new Error('Use an integer exponent.');
    let n = exponent;
    let base = copyMatrix(A);
    if (n < 0) {
      base = inverse(base);
      n = -n;
    }
    let result = identity(A.length);
    while (n > 0) {
      if (n % 2 === 1) result = matrixMultiply(result, base);
      base = matrixMultiply(base, base);
      n = Math.floor(n / 2);
    }
    return result;
  }

  function exactZeros(rows, cols) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ExactScalar.zero()));
  }

  function exactIdentity(n) {
    const out = exactZeros(n, n);
    for (let i = 0; i < n; i++) out[i][i] = ExactScalar.one();
    return out;
  }

  function exactMatrixMultiply(A, B) {
    const rows = A.length;
    const inner = A[0]?.length || 0;
    const cols = B[0]?.length || 0;
    const out = exactZeros(rows, cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = ExactScalar.zero();
        for (let k = 0; k < inner; k++) sum = sum.add(A[r][k].mul(B[k][c]));
        out[r][c] = sum;
      }
    }
    return out;
  }

  function exactTranspose(A) {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    const out = exactZeros(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) out[c][r] = A[r][c].clone();
    }
    return out;
  }

  function exactTrace(A) {
    let sum = ExactScalar.zero();
    for (let i = 0; i < A.length; i++) sum = sum.add(A[i][i]);
    return sum;
  }

  function exactInverse(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Inverse requires a square matrix.');
    const n = A.length;
    const I = exactIdentity(n);
    const M = A.map((row, r) => [...row.map((z) => z.clone()), ...I[r].map((z) => z.clone())]);
    for (let col = 0; col < n; col++) {
      let pivotRow = col;
      while (pivotRow < n && M[pivotRow][col].isZero()) pivotRow++;
      if (pivotRow === n) throw new Error('The matrix is singular.');
      if (pivotRow !== col) [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      const pivot = M[col][col];
      for (let c = 0; c < 2 * n; c++) M[col][c] = M[col][c].div(pivot);
      for (let r = 0; r < n; r++) {
        if (r === col || M[r][col].isZero()) continue;
        const factor = M[r][col];
        for (let c = 0; c < 2 * n; c++) M[r][c] = M[r][c].sub(factor.mul(M[col][c]));
      }
    }
    return M.map((row) => row.slice(n));
  }

  function exactMatrixPower(A, exponent) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Matrix powers require a square matrix.');
    if (!Number.isInteger(exponent)) throw new Error('Use an integer exponent.');
    let n = exponent;
    let base = exactMatrixCopy(A);
    if (n < 0) {
      base = exactInverse(base);
      n = -n;
    }
    let result = exactIdentity(A.length);
    while (n > 0) {
      if (n % 2 === 1) result = exactMatrixMultiply(result, base);
      base = exactMatrixMultiply(base, base);
      n = Math.floor(n / 2);
    }
    return result;
  }

  function exactMatrixCopy(A) {
    return A.map((row) => row.map((z) => z.clone()));
  }

  function matrixExp(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Matrix exponential requires a square matrix.');
    const n = A.length;
    const norm = maxMatrixNorm(A);
    const scalePower = norm > 0.5 ? Math.max(0, Math.ceil(Math.log2(norm / 0.5))) : 0;
    const B = matrixScale(A, 1 / Math.pow(2, scalePower));
    let result = identity(n);
    let term = identity(n);
    for (let k = 1; k <= 80; k++) {
      term = matrixScale(matrixMultiply(term, B), 1 / k);
      result = matrixAdd(result, term);
      if (maxMatrixNorm(term) < 1e-13) break;
    }
    for (let i = 0; i < scalePower; i++) result = matrixMultiply(result, result);
    return result;
  }

  function bruhatDecomposition(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Bruhat decomposition requires a square matrix.');
    const n = A.length;
    if (matrixRank(A) < n) throw new Error('This Bruhat decomposition routine expects an invertible matrix in GL(n).');

    const M = copyMatrix(A);
    const leftTransform = identity(n);
    const rightTransform = identity(n);
    const pivots = [];
    let maxRow = n - 1;
    let minCol = 0;

    while (maxRow >= 0 && minCol < n) {
      let pivotRow = -1;
      let pivotCol = -1;
      let pivotAbs = 0;

      for (let r = maxRow; r >= 0; r--) {
        for (let c = minCol; c < n; c++) {
          const value = M[r][c].abs();
          if (value > TOL) {
            pivotRow = r;
            pivotCol = c;
            pivotAbs = value;
            break;
          }
        }
        if (pivotRow >= 0) break;
      }
      if (pivotAbs <= TOL || pivotRow < 0 || pivotCol < 0) break;

      const pivot = M[pivotRow][pivotCol];
      for (let r = 0; r < pivotRow; r++) {
        if (M[r][pivotCol].isZero()) continue;
        const factor = M[r][pivotCol].div(pivot);
        for (let c = 0; c < n; c++) M[r][c] = M[r][c].sub(factor.mul(M[pivotRow][c]));
        for (let c = 0; c < n; c++) leftTransform[r][c] = leftTransform[r][c].sub(factor.mul(leftTransform[pivotRow][c]));
      }

      for (let c = pivotCol + 1; c < n; c++) {
        if (M[pivotRow][c].isZero()) continue;
        const factor = M[pivotRow][c].div(pivot);
        for (let r = 0; r < n; r++) M[r][c] = M[r][c].sub(M[r][pivotCol].mul(factor));
        for (let r = 0; r < n; r++) rightTransform[r][c] = rightTransform[r][c].sub(rightTransform[r][pivotCol].mul(factor));
      }

      pivots.push({ row: pivotRow, col: pivotCol });
      maxRow = pivotRow - 1;
      minCol = pivotCol + 1;
    }

    if (pivots.length !== n) {
      throw new Error('Could not find a full Bruhat pivot pattern for this matrix.');
    }

    const W = zeros(n, n);
    const D = zeros(n, n);
    for (const { row, col } of pivots) {
      W[row][col] = new Complex(1, 0);
      D[col][col] = M[row][col].clone();
    }

    const B1 = inverseUpperTriangular(leftTransform);
    const B2 = matrixMultiply(D, inverseUpperTriangular(rightTransform));
    return { B1, W, B2, pivots };
  }

  function exactBruhatDecomposition(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Bruhat decomposition requires a square matrix.');
    const n = A.length;
    const M = exactMatrixCopy(A);
    const leftTransform = exactIdentity(n);
    const rightTransform = exactIdentity(n);
    const pivots = [];
    let maxRow = n - 1;
    let minCol = 0;

    while (maxRow >= 0 && minCol < n) {
      let pivotRow = -1;
      let pivotCol = -1;

      for (let r = maxRow; r >= 0; r--) {
        for (let c = minCol; c < n; c++) {
          if (!M[r][c].isZero()) {
            pivotRow = r;
            pivotCol = c;
            break;
          }
        }
        if (pivotRow >= 0) break;
      }
      if (pivotRow < 0 || pivotCol < 0) break;

      const pivot = M[pivotRow][pivotCol];
      for (let r = 0; r < pivotRow; r++) {
        if (M[r][pivotCol].isZero()) continue;
        const factor = M[r][pivotCol].div(pivot);
        for (let c = 0; c < n; c++) M[r][c] = M[r][c].sub(factor.mul(M[pivotRow][c]));
        for (let c = 0; c < n; c++) leftTransform[r][c] = leftTransform[r][c].sub(factor.mul(leftTransform[pivotRow][c]));
      }

      for (let c = pivotCol + 1; c < n; c++) {
        if (M[pivotRow][c].isZero()) continue;
        const factor = M[pivotRow][c].div(pivot);
        for (let r = 0; r < n; r++) M[r][c] = M[r][c].sub(M[r][pivotCol].mul(factor));
        for (let r = 0; r < n; r++) rightTransform[r][c] = rightTransform[r][c].sub(rightTransform[r][pivotCol].mul(factor));
      }

      pivots.push({ row: pivotRow, col: pivotCol });
      maxRow = pivotRow - 1;
      minCol = pivotCol + 1;
    }

    if (pivots.length !== n) {
      throw new Error('Could not find a full Bruhat pivot pattern for this matrix.');
    }

    const W = exactZeros(n, n);
    const D = exactZeros(n, n);
    for (const { row, col } of pivots) {
      W[row][col] = ExactScalar.one();
      D[col][col] = M[row][col].clone();
    }

    const B1 = exactInverseUpperTriangular(leftTransform);
    const B2 = exactMatrixMultiply(D, exactInverseUpperTriangular(rightTransform));
    return { B1, W, B2, pivots };
  }

  function inverseUpperTriangular(T) {
    const n = T.length;
    const X = zeros(n, n);
    for (let col = 0; col < n; col++) {
      for (let row = n - 1; row >= 0; row--) {
        let sum = row === col ? new Complex(1, 0) : new Complex(0, 0);
        for (let k = row + 1; k < n; k++) sum = sum.sub(T[row][k].mul(X[k][col]));
        if (T[row][row].isZero()) throw new Error('Upper triangular factor is singular.');
        X[row][col] = sum.div(T[row][row]);
      }
    }
    return X;
  }

  function exactInverseUpperTriangular(T) {
    const n = T.length;
    const X = exactZeros(n, n);
    for (let col = 0; col < n; col++) {
      for (let row = n - 1; row >= 0; row--) {
        let sum = row === col ? ExactScalar.one() : ExactScalar.zero();
        for (let k = row + 1; k < n; k++) sum = sum.sub(T[row][k].mul(X[k][col]));
        if (T[row][row].isZero()) throw new Error('Upper triangular factor is singular.');
        X[row][col] = sum.div(T[row][row]);
      }
    }
    return X;
  }

  function qrDecomposition(A) {
    const m = A.length;
    const n = A[0]?.length || 0;
    const Qcols = [];
    const R = zeros(n, n);
    const dependent = [];
    for (let j = 0; j < n; j++) {
      let v = column(A, j);
      for (let i = 0; i < j; i++) {
        const qi = Qcols[i] || Array.from({ length: m }, () => new Complex(0, 0));
        const r = dotConj(qi, v);
        R[i][j] = r;
        v = v.map((z, row) => z.sub(qi[row].mul(r)));
      }
      const norm = vectorNorm(v);
      if (norm <= TOL) {
        Qcols[j] = Array.from({ length: m }, () => new Complex(0, 0));
        R[j][j] = new Complex(0, 0);
        dependent.push(j + 1);
      } else {
        Qcols[j] = v.map((z) => z.scale(1 / norm));
        R[j][j] = new Complex(norm, 0);
      }
    }
    const Q = zeros(m, n);
    for (let c = 0; c < n; c++) {
      for (let r = 0; r < m; r++) Q[r][c] = Qcols[c][r].clone();
    }
    return { Q, R, dependent };
  }

  function column(A, c) {
    return A.map((row) => row[c].clone());
  }

  function dotConj(u, v) {
    let sum = new Complex(0, 0);
    for (let i = 0; i < u.length; i++) sum = sum.add(u[i].conj().mul(v[i]));
    return sum;
  }

  function vectorNorm(v) {
    return Math.sqrt(v.reduce((sum, z) => sum + z.abs2(), 0));
  }

  function jordanDecomposition(A) {
    if (A.length !== (A[0]?.length || 0)) throw new Error('Jordan decomposition requires a square matrix.');
    const n = A.length;
    const groups = jordanEigenvalueGroups(A);
    const J = zeros(n, n);
    const pColumns = [];
    const summaries = [];
    let offset = 0;
    let canBuildP = true;

    for (const group of groups) {
      const lambda = cleanComplex(group.lambda, 1e-9);
      const N = subtractScalarIdentity(A, lambda);
      const structure = jordanStructureForEigenvalue(A, N, group.multiplicity);
      const blockSizes = structure.blockSizes;
      const basesByPower = canBuildP
        ? nullspaceBasesByPower(N, Math.max(...blockSizes), structure.tol)
        : [];

      summaries.push(`${formatComplex(lambda)}: alg ${group.multiplicity}, eig ${structure.nullities[1] || 0}, blocks ${blockSizes.join('+')}`);

      for (const size of blockSizes) {
        for (let i = 0; i < size; i++) {
          J[offset + i][offset + i] = lambda.clone();
          if (i < size - 1) J[offset + i][offset + i + 1] = new Complex(1, 0);
        }
        if (canBuildP) {
          const chain = chooseJordanChain(N, size, pColumns, basesByPower, structure.tol);
          if (chain) pColumns.push(...chain);
          else canBuildP = false;
        }
        offset += size;
      }
    }

    const blocks = [];
    let formula = 'Jordan form J';
    if (canBuildP && pColumns.length === n) {
      const P = matrixFromColumns(pColumns);
      const residual = jordanResidual(A, P, J);
      const scale = Math.max(1, maxMatrixNorm(A), maxMatrixNorm(P), maxMatrixNorm(J));
      if (matrixRank(P) === n && residual <= 1e-6 * scale * scale) {
        blocks.push({ title: 'P', matrix: P });
        formula = 'A = P J P^{-1}';
      }
    }
    blocks.push({ title: 'J', matrix: J });

    const pNote = blocks.length > 1
      ? 'P was constructed from eigenvectors and generalized eigenvectors.'
      : 'Only J is shown because a stable generalized eigenvector basis P could not be constructed numerically.';
    return {
      formula,
      blocks,
      note: `Eigenvalues: ${summaries.join('; ')}. ${pNote} Numerical Jordan data is tolerance-sensitive for repeated or nearby eigenvalues.`
    };
  }

  function jordanEigenvalueGroups(A) {
    const triangular = triangularEigenvalues(A);
    const roots = triangular || polynomialRoots(characteristicPolynomial(A));
    return clusterEigenvalues(roots).sort((a, b) => {
      if (Math.abs(a.lambda.re - b.lambda.re) > 1e-9) return a.lambda.re - b.lambda.re;
      return a.lambda.im - b.lambda.im;
    });
  }

  function triangularEigenvalues(A) {
    const n = A.length;
    let upper = true;
    let lower = true;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r > c && !A[r][c].isZero(1e-10)) upper = false;
        if (r < c && !A[r][c].isZero(1e-10)) lower = false;
      }
    }
    if (!upper && !lower) return null;
    return A.map((row, i) => row[i].clone());
  }

  function characteristicPolynomial(A, guard = null) {
    const n = A.length;
    const coeffs = [new Complex(1, 0)];
    let B = identity(n);
    for (let k = 1; k <= n; k++) {
      checkDeadline(guard);
      const AB = matrixMultiply(A, B);
      const coeff = trace(AB).scale(-1 / k);
      coeffs.push(cleanComplex(coeff, 1e-12));
      B = copyMatrix(AB);
      for (let i = 0; i < n; i++) B[i][i] = B[i][i].add(coeff);
    }
    return coeffs;
  }

  function exactCharacteristicPolynomial(A, guard = null) {
    const n = A.length;
    const coeffs = [ExactScalar.one()];
    let B = exactIdentity(n);
    for (let k = 1; k <= n; k++) {
      checkDeadline(guard);
      const AB = exactMatrixMultiply(A, B);
      const coeff = exactTrace(AB).div(ExactScalar.fromFraction(Fraction.fromInt(k))).neg();
      coeffs.push(coeff);
      B = exactMatrixCopy(AB);
      for (let i = 0; i < n; i++) B[i][i] = B[i][i].add(coeff);
    }
    return coeffs;
  }

  function charPolyForDisplay(data) {
    const guard = makeDeadline(CHARPOLY_TIMEOUT_MS);
    try {
      return {
        coeffs: exactCharacteristicPolynomial(exactMatrixFromDetails(data.details), guard),
        mode: 'symbolic',
        note: 'Exact characteristic polynomial.'
      };
    } catch (error) {
      if (!isTimeoutError(error)) {
        try {
          return {
            coeffs: characteristicPolynomial(data.matrix, guard),
            mode: 'numeric',
            note: 'Numeric characteristic polynomial.'
          };
        } catch (numericError) {
          return {
            coeffs: null,
            mode: 'error',
            error: isTimeoutError(numericError) ? 'χ_A(T) timed out after 1.5 seconds.' : numericError.message
          };
        }
      }
      const numericGuard = makeDeadline(CHARPOLY_TIMEOUT_MS);
      try {
        return {
          coeffs: characteristicPolynomial(data.matrix, numericGuard),
          mode: 'numeric',
          note: 'Exact χ_A(T) took more than 1.5 seconds; numeric coefficients are shown.'
        };
      } catch (numericError) {
        return {
          coeffs: null,
          mode: 'error',
          error: isTimeoutError(numericError) ? 'χ_A(T) timed out after 1.5 seconds.' : numericError.message
        };
      }
    }
  }

  function charPolyDisplayText(result) {
    if (result.error) return result.error;
    const text = formatPolynomial(result.coeffs, 'T');
    return result.mode === 'numeric' && result.note ? `warning: ${result.note} ${text}` : text;
  }

  function timedNumericCharPoly(data) {
    try {
      return {
        coeffs: characteristicPolynomial(data.matrix, makeDeadline(CHARPOLY_TIMEOUT_MS)),
        mode: 'numeric'
      };
    } catch (error) {
      return {
        coeffs: null,
        mode: 'error',
        error: isTimeoutError(error) ? 'χ_A(T) timed out after 1.5 seconds.' : error.message
      };
    }
  }

  function makeDeadline(ms) {
    return { expires: performanceNow() + ms };
  }

  function checkDeadline(guard) {
    if (guard && performanceNow() > guard.expires) throw new Error('CHARPOLY_TIMEOUT');
  }

  function isTimeoutError(error) {
    return error && error.message === 'CHARPOLY_TIMEOUT';
  }

  function performanceNow() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  function factorCharacteristicPolynomial() {
    refs.operationMessage.textContent = '';
    const data = readMatrix(true);
    if (data.errors.length) {
      const first = data.errors[0];
      refs.operationMessage.textContent = `Invalid entry at (${first.row}, ${first.col}): ${first.message}`;
      return;
    }
    if (data.rows !== data.cols) {
      refs.operationMessage.textContent = 'Characteristic polynomial requires a square matrix.';
      return;
    }

    try {
      const result = charPolyForDisplay(data);
      if (result.error) {
        refs.outCharpoly.textContent = result.error;
        refs.outCharpoly.title = result.error;
        refs.matrixStatus.textContent = 'characteristic polynomial timed out';
        return;
      }
      const coeffs = result.coeffs;
      const field = refs.dataType ? refs.dataType.value : 'complex';
      const factorGuard = makeDeadline(CHARPOLY_TIMEOUT_MS);
      const factorization = factorPolynomialForField(coeffs, field, 'T', factorGuard);
      checkDeadline(factorGuard);
      refs.outCharpoly.textContent = factorization.text;
      refs.outCharpoly.title = [result.note, factorization.note].filter(Boolean).join(' ');
      refs.matrixStatus.textContent = `characteristic polynomial factored over ${fieldName(field)}`;
      return;
    } catch (error) {
      if (isTimeoutError(error)) {
        const field = refs.dataType ? refs.dataType.value : 'complex';
        const fallback = timeoutFactorizationFallback(data, field, 'T');
        refs.outCharpoly.textContent = fallback.error || `warning: factorization took more than 1.5 seconds; ${fallback.text}`;
        refs.outCharpoly.title = fallback.error || fallback.note;
        refs.matrixStatus.textContent = fallback.error ? 'characteristic polynomial timed out' : 'numeric factorization shown';
      } else {
        refs.operationMessage.textContent = error.message;
      }
    }
  }

  function factorPolynomialForField(coeffs, field, variable, guard = null) {
    checkDeadline(guard);
    if (field === 'complex') return factorPolynomialOverComplex(coeffs, variable, guard);
    if (field === 'real') return factorPolynomialOverReal(coeffs, variable, guard);
    return factorPolynomialOverRationals(coeffs, variable, field, guard);
  }

  function timeoutFactorizationFallback(data, field, variable) {
    const numeric = timedNumericCharPoly(data);
    if (numeric.error) return numeric;
    try {
      if (field === 'real') {
        const factorization = numericRealFactorizationFromComplexRoots(numeric.coeffs, variable);
        return {
          text: `numeric real factorization shown. ${factorization.text}`,
          note: 'Exact factorization took more than 1.5 seconds; complex numerical roots were paired into real factors.'
        };
      }
      if (field === 'complex') {
        const factorization = numericComplexFactorization(numeric.coeffs, variable);
        return {
          text: `numeric complex factorization shown. ${factorization.text}`,
          note: 'Exact factorization took more than 1.5 seconds; complex numerical factors are shown.'
        };
      }
      return {
        text: `numeric χ_A(T) shown. ${formatPolynomial(numeric.coeffs, variable)}`,
        note: 'Factorization took more than 1.5 seconds; numeric characteristic polynomial is shown.'
      };
    } catch (error) {
      return {
        text: `numeric χ_A(T) shown. ${formatPolynomial(numeric.coeffs, variable)}`,
        note: `Factorization took more than 1.5 seconds; numeric factorization fallback failed: ${error.message}`
      };
    }
  }

  function factorPolynomialOverComplex(coeffs, variable, guard = null) {
    const exact = exactLinearFactorParts(coeffs, variable, guard);
    const parts = exact.parts.slice();
    if (exact.remaining.length <= 1) {
      return {
        text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable),
        note: 'Exact factorization into rational linear factors.'
      };
    }
    checkDeadline(guard);
    const roots = polynomialRoots(polyToComplex(exact.remaining), guard);
    const groups = clusterEigenvalues(roots);
    parts.push(...groups.map((group) => powerText(linearFactorText(group.lambda, variable, false), group.multiplicity)));
    return {
      text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable),
      note: exact.parts.length
        ? 'Exact rational linear factors are shown first; remaining complex roots are computed numerically.'
        : 'Roots are computed numerically, so nearby or repeated roots may be clustered.'
    };
  }

  function numericComplexFactorization(coeffs, variable) {
    const roots = polynomialRoots(polyToComplex(coeffs));
    const groups = clusterEigenvalues(roots);
    const parts = groups.map((group) => powerText(linearFactorText(group.lambda, variable, false), group.multiplicity));
    return {
      text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable)
    };
  }

  function factorPolynomialOverReal(coeffs, variable, guard = null) {
    if (!polyHasRealCoefficients(coeffs)) {
      return {
        text: factorPolynomialOverComplex(coeffs, variable, guard).text,
        note: 'The polynomial has non-real coefficients, so complex numerical linear factors are shown.'
      };
    }
    const exact = exactLinearFactorParts(coeffs, variable, guard);
    const parts = exact.parts.slice();
    if (exact.remaining.length <= 1) {
      return {
        text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable),
        note: 'Exact factorization into rational linear factors.'
      };
    }
    checkDeadline(guard);
    const roots = polynomialRoots(polyToComplex(exact.remaining), guard);
    parts.push(...realFactorsFromComplexRoots(roots, variable));
    return {
      text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable),
      note: exact.parts.length
        ? 'Exact rational linear factors are shown first; remaining real factorization is numerical.'
        : 'Real factorization is numerical; non-real conjugate pairs are shown as real quadratic factors.'
    };
  }

  function numericRealFactorizationFromComplexRoots(coeffs, variable) {
    if (!polyHasRealCoefficients(coeffs)) return numericComplexFactorization(coeffs, variable);
    const roots = polynomialRoots(polyToComplex(coeffs));
    const parts = realFactorsFromComplexRoots(roots, variable);
    return {
      text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable)
    };
  }

  function realFactorsFromComplexRoots(roots, variable) {
    const used = Array.from({ length: roots.length }, () => false);
    const parts = [];
    for (let i = 0; i < roots.length; i++) {
      if (used[i]) continue;
      const root = roots[i];
      if (Math.abs(root.im) <= 1e-7) {
        used[i] = true;
        let multiplicity = 1;
        for (let j = i + 1; j < roots.length; j++) {
          if (!used[j] && Math.abs(roots[j].im) <= 1e-7 && Math.abs(roots[j].re - root.re) <= 1e-6) {
            used[j] = true;
            multiplicity++;
          }
        }
        parts.push(powerText(linearFactorText(new Complex(root.re, 0), variable, false), multiplicity));
        continue;
      }

      let match = -1;
      let best = Infinity;
      for (let j = i + 1; j < roots.length; j++) {
        if (used[j]) continue;
        const distance = root.conj().sub(roots[j]).abs();
        if (distance < best) {
          best = distance;
          match = j;
        }
      }
      used[i] = true;
      if (match >= 0 && best <= 1e-5 * Math.max(1, root.abs())) {
        used[match] = true;
        const a = (root.re + roots[match].re) / 2;
        const b = (Math.abs(root.im) + Math.abs(roots[match].im)) / 2;
        const quadratic = [
          new Complex(1, 0),
          new Complex(-2 * a, 0),
          new Complex(a * a + b * b, 0)
        ].map((z) => cleanComplex(z, 1e-8));
        parts.push(`(${formatPolynomial(quadratic, variable)})`);
      } else {
        parts.push(linearFactorText(root, variable, false));
      }
    }
    return parts;
  }

  function factorPolynomialOverRationals(coeffs, variable, field, guard = null) {
    if (!polyIsExact(coeffs) || !polyHasRealCoefficients(coeffs)) {
      return {
        text: factorPolynomialOverComplex(coeffs, variable, guard).text,
        note: `Exact factorization over ${fieldName(field)} needs real exact coefficients; complex numerical factors are shown.`
      };
    }
    const factors = rationalPolynomialFactors(coeffs, guard);
    const parts = [];
    for (const factor of factors.factors) parts.push(powerText(`(${formatPolynomial(factor.poly, variable)})`, factor.multiplicity));
    if (factors.remaining.length > 1) parts.push(`(${formatPolynomial(factors.remaining, variable)})`);
    return {
      text: parts.length ? parts.join(' ') : formatPolynomial(coeffs, variable),
      note: factors.complete
        ? `Exact factorization over ${fieldName(field)}.`
        : `Exact factors detected over ${fieldName(field)}; the remaining factor is shown unchanged.`
    };
  }

  function exactLinearFactorParts(coeffs, variable, guard = null) {
    if (!polyIsExact(coeffs) || !polyHasRealCoefficients(coeffs)) {
      return { parts: [], remaining: trimPolynomial(coeffs) };
    }
    const factors = rationalPolynomialFactors(coeffs, guard);
    return {
      parts: factors.factors.map((factor) => powerText(`(${formatPolynomial(factor.poly, variable)})`, factor.multiplicity)),
      remaining: factors.remaining
    };
  }

  function rationalPolynomialFactors(coeffs, guard = null) {
    let remaining = trimPolynomial(coeffs);
    const factors = [];
    while (remaining.length > 1) {
      checkDeadline(guard);
      const root = findRationalRoot(remaining, guard);
      if (!root) break;
      const factor = [ExactScalar.one(), ExactScalar.fromFraction(root).neg()];
      const division = exactPolynomialDivmod(remaining, factor);
      if (!division || !polynomialIsZero(division.remainder)) break;
      pushPolynomialFactor(factors, factor);
      remaining = trimPolynomial(division.quotient);
    }
    return { factors, remaining, complete: remaining.length <= 1 };
  }

  function findRationalRoot(coeffs, guard = null) {
    coeffs = trimPolynomial(coeffs);
    if (coeffs.length <= 1) return null;
    const integerCoeffs = integerPolynomialCoefficients(coeffs);
    if (!integerCoeffs) return null;
    const leading = bigintAbs(integerCoeffs[0]);
    const constant = bigintAbs(integerCoeffs[integerCoeffs.length - 1]);
    if (constant === 0n) return Fraction.zero();
    const numerators = bigintDivisorsGuarded(constant, guard);
    const denominators = bigintDivisorsGuarded(leading, guard);
    for (const num of numerators) {
      for (const den of denominators) {
        for (const sign of [1n, -1n]) {
          checkDeadline(guard);
          const candidate = new Fraction(sign * num, den);
          if (exactPolynomialEval(coeffs, ExactScalar.fromFraction(candidate)).isZero()) {
            return candidate;
          }
        }
      }
    }
    return null;
  }

  function integerPolynomialCoefficients(coeffs) {
    if (!polyIsExact(coeffs) || !polyHasRealCoefficients(coeffs)) return null;
    let den = 1n;
    for (const coeff of coeffs) den = bigintLcm(den, coeff.re.den);
    return coeffs.map((coeff) => coeff.re.num * (den / coeff.re.den));
  }

  function bigintLcm(a, b) {
    a = bigintAbs(a);
    b = bigintAbs(b);
    return a === 0n || b === 0n ? 0n : (a / bigintGcd(a, b)) * b;
  }

  function bigintDivisors(value) {
    return bigintDivisorsGuarded(value, null);
  }

  function bigintDivisorsGuarded(value, guard) {
    value = bigintAbs(value);
    if (value === 0n) return [0n];
    const out = [];
    for (let d = 1n; d * d <= value; d++) {
      checkDeadline(guard);
      if (value % d === 0n) {
        out.push(d);
        if (d * d !== value) out.push(value / d);
      }
    }
    return out.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  }

  function exactPolynomialEval(coeffs, x) {
    let value = coeffs[0].clone();
    for (let i = 1; i < coeffs.length; i++) value = value.mul(x).add(coeffs[i]);
    return value;
  }

  function pushPolynomialFactor(factors, poly) {
    const key = formatPolynomial(poly, 'T');
    const existing = factors.find((factor) => factor.key === key);
    if (existing) existing.multiplicity++;
    else factors.push({ key, poly, multiplicity: 1 });
  }

  function exactPolynomialDivmod(dividend, divisor) {
    dividend = trimPolynomial(dividend);
    divisor = trimPolynomial(divisor);
    if (!divisor.length || scalarIsZero(divisor[0])) throw new Error('Division by zero polynomial.');
    const degreeDiff = dividend.length - divisor.length;
    if (degreeDiff < 0) return { quotient: [ExactScalar.zero()], remainder: dividend };
    const rem = dividend.map((z) => z.clone());
    const quotient = Array.from({ length: degreeDiff + 1 }, () => ExactScalar.zero());
    for (let i = 0; i <= degreeDiff; i++) {
      const factor = rem[i].div(divisor[0]);
      quotient[i] = factor;
      if (factor.isZero()) continue;
      for (let j = 0; j < divisor.length; j++) rem[i + j] = rem[i + j].sub(factor.mul(divisor[j]));
    }
    return {
      quotient: trimPolynomial(quotient),
      remainder: trimPolynomial(rem.slice(degreeDiff + 1))
    };
  }

  function polynomialIsZero(coeffs) {
    return coeffs.every(scalarIsZero);
  }

  function trimPolynomial(coeffs) {
    let index = 0;
    while (index < coeffs.length - 1 && scalarIsZero(coeffs[index])) index++;
    return coeffs.slice(index);
  }

  function polyToComplex(coeffs) {
    return coeffs.map((coeff) => coeff instanceof ExactScalar ? coeff.toComplex() : Complex.from(coeff));
  }

  function polyIsExact(coeffs) {
    return coeffs.every((coeff) => coeff instanceof ExactScalar);
  }

  function polyHasRealCoefficients(coeffs) {
    return coeffs.every((coeff) => {
      if (coeff instanceof ExactScalar) return coeff.im.isZero();
      coeff = Complex.from(coeff);
      return Math.abs(coeff.im) <= 1e-8;
    });
  }

  function formatPolynomial(coeffs, variable = 'T') {
    coeffs = trimPolynomial(coeffs);
    const degree = coeffs.length - 1;
    const terms = [];
    for (let i = 0; i < coeffs.length; i++) {
      const coeff = coeffs[i];
      if (scalarIsZero(coeff)) continue;
      const power = degree - i;
      const realCoeff = scalarIsReal(coeff);
      const sign = realCoeff ? scalarRealSign(coeff) : 1;
      const absCoeff = realCoeff && sign < 0 ? scalarNeg(coeff) : coeff;
      const coeffIsOne = scalarIsOne(absCoeff);
      let body = '';
      if (power === 0) {
        body = realCoeff ? formatScalar(absCoeff) : `(${formatScalar(absCoeff)})`;
      } else {
        const variablePart = power === 1 ? variable : `${variable}^${power}`;
        body = coeffIsOne ? variablePart : `${formatScalarForFactor(absCoeff)}${variablePart}`;
      }
      if (!terms.length) terms.push(sign < 0 ? `-${body}` : body);
      else terms.push(`${sign < 0 ? ' - ' : ' + '}${body}`);
    }
    return terms.length ? terms.join('') : '0';
  }

  function formatScalarForFactor(value) {
    if (!scalarIsReal(value)) return `(${formatScalar(value)}) `;
    return `${formatScalar(value)} `;
  }

  function formatScalar(value) {
    if (value instanceof ExactScalar) {
      if (value.im.isZero()) return formatExactFraction(value.re);
      if (value.re.isZero()) return formatExactImag(value.im);
      const sign = value.im.sign() < 0 ? ' - ' : ' + ';
      return `${formatExactFraction(value.re)}${sign}${formatExactImag(value.im.abs())}`;
    }
    return formatComplex(value, 10);
  }

  function formatExactFraction(value) {
    value = Fraction.from(value);
    return value.den === 1n ? value.num.toString() : `${value.num.toString()}/${value.den.toString()}`;
  }

  function formatExactImag(value) {
    value = Fraction.from(value);
    if (value.isOne()) return 'i';
    if (value.isMinusOne()) return '-i';
    return `${formatExactFraction(value)}i`;
  }

  function scalarIsZero(value) {
    if (value instanceof ExactScalar) return value.isZero();
    return Complex.from(value).isZero(DISPLAY_TOL);
  }

  function scalarIsOne(value) {
    if (value instanceof ExactScalar) return value.im.isZero() && value.re.isOne();
    const z = Complex.from(value);
    return Math.abs(z.re - 1) <= DISPLAY_TOL && Math.abs(z.im) <= DISPLAY_TOL;
  }

  function scalarIsReal(value) {
    if (value instanceof ExactScalar) return value.isReal();
    return Math.abs(Complex.from(value).im) <= DISPLAY_TOL;
  }

  function scalarRealSign(value) {
    if (value instanceof ExactScalar) return value.im.isZero() ? value.re.sign() : 1;
    const z = Complex.from(value);
    return Math.abs(z.im) <= DISPLAY_TOL && z.re < 0 ? -1 : 1;
  }

  function scalarNeg(value) {
    if (value instanceof ExactScalar) return value.neg();
    return Complex.from(value).neg();
  }

  function linearFactorText(root, variable, exact) {
    const z = exact ? root : cleanComplex(root, 1e-8);
    if (z instanceof ExactScalar && z.im.isZero()) {
      if (z.re.isZero()) return `(${variable})`;
      return z.re.sign() < 0
        ? `(${variable} + ${formatExactFraction(z.re.abs())})`
        : `(${variable} - ${formatExactFraction(z.re)})`;
    }
    if (!(z instanceof ExactScalar) && Math.abs(z.im) <= DISPLAY_TOL) {
      if (Math.abs(z.re) <= DISPLAY_TOL) return `(${variable})`;
      return z.re < 0
        ? `(${variable} + ${formatReal(Math.abs(z.re), 10)})`
        : `(${variable} - ${formatReal(z.re, 10)})`;
    }
    return `(${variable} - (${formatScalar(z)}))`;
  }

  function powerText(text, multiplicity) {
    return multiplicity > 1 ? `${text}^${multiplicity}` : text;
  }

  function fieldName(field) {
    if (field === 'complex') return 'C';
    if (field === 'real') return 'R';
    if (field === 'rational') return 'Q';
    if (field === 'integer') return 'Q';
    return field;
  }

  function polynomialRoots(coeffs, guard = null) {
    const degree = coeffs.length - 1;
    if (degree < 1) return [];
    checkDeadline(guard);
    const leading = coeffs[0];
    const poly = leading.sub(1).abs() <= DISPLAY_TOL
      ? coeffs.map((z) => z.clone())
      : coeffs.map((z) => z.div(leading));
    if (degree === 1) return [poly[1].neg()];
    if (degree === 2) return quadraticRoots(poly);

    const radius = 1 + Math.max(...poly.slice(1).map((z) => z.abs()));
    let roots = Array.from({ length: degree }, (_, i) => {
      const theta = (2 * Math.PI * (i + 0.37)) / degree;
      return new Complex(radius * Math.cos(theta), radius * Math.sin(theta));
    });

    for (let iter = 0; iter < 220; iter++) {
      checkDeadline(guard);
      let maxDelta = 0;
      roots = roots.map((root, i) => {
        let denom = new Complex(1, 0);
        for (let j = 0; j < roots.length; j++) {
          if (i !== j) denom = denom.mul(root.sub(roots[j]));
        }
        if (denom.abs() <= 1e-14) denom = new Complex(1e-14, 1e-14);
        const delta = polynomialEval(poly, root).div(denom);
        maxDelta = Math.max(maxDelta, delta.abs());
        return root.sub(delta);
      });
      if (maxDelta <= 1e-12) break;
    }
    return roots.map((z) => cleanComplex(z, 1e-8));
  }

  function quadraticRoots(coeffs) {
    const b = coeffs[1];
    const c = coeffs[2];
    const disc = b.mul(b).sub(c.scale(4)).sqrt();
    return [b.neg().add(disc).scale(0.5), b.neg().sub(disc).scale(0.5)].map((z) => cleanComplex(z, 1e-10));
  }

  function polynomialEval(coeffs, x) {
    let value = coeffs[0].clone();
    for (let i = 1; i < coeffs.length; i++) value = value.mul(x).add(coeffs[i]);
    return value;
  }

  function clusterEigenvalues(values) {
    const clusters = [];
    const sorted = values.map((z) => z.clone()).sort((a, b) => {
      if (Math.abs(a.re - b.re) > 1e-9) return a.re - b.re;
      return a.im - b.im;
    });
    for (const root of sorted) {
      const scale = Math.max(1, root.abs());
      let match = null;
      let bestDistance = Infinity;
      for (const cluster of clusters) {
        const distance = root.sub(cluster.lambda).abs();
        const tol = 1e-5 * Math.max(scale, 1, cluster.lambda.abs());
        if (distance <= tol && distance < bestDistance) {
          match = cluster;
          bestDistance = distance;
        }
      }
      if (!match) {
        clusters.push({ lambda: root.clone(), sum: root.clone(), multiplicity: 1 });
      } else {
        match.sum = match.sum.add(root);
        match.multiplicity++;
        match.lambda = match.sum.scale(1 / match.multiplicity);
      }
    }
    return clusters.map((cluster) => ({
      lambda: cleanComplex(cluster.lambda, 1e-8),
      multiplicity: cluster.multiplicity
    }));
  }

  function jordanStructureForEigenvalue(A, N, multiplicity) {
    const scale = Math.max(1, maxMatrixNorm(A), maxMatrixNorm(N));
    const tolerances = [1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5].map((tol) => tol * scale);
    let best = null;
    for (const tol of tolerances) {
      const nullities = jordanNullities(N, multiplicity, tol).map((d) => Math.min(d, multiplicity));
      const good = nullities[multiplicity] === multiplicity && nullities[1] > 0 && hasJordanNullityShape(nullities);
      const score = (nullities[multiplicity] || 0) * 100 + (nullities[1] || 0);
      if (!best || score > best.score) {
        best = { tol, nullities, score };
      }
      if (good) {
        best = { tol, nullities, score };
        break;
      }
    }
    const repaired = repairJordanNullities(best.nullities, multiplicity);
    return {
      tol: best.tol,
      nullities: repaired,
      blockSizes: blockSizesFromNullities(repaired, multiplicity)
    };
  }

  function jordanNullities(N, multiplicity, tol) {
    const n = N.length;
    const values = [0];
    let power = identity(n);
    for (let k = 1; k <= multiplicity; k++) {
      power = matrixMultiply(power, N);
      values.push(nullity(power, tol));
    }
    return values;
  }

  function hasJordanNullityShape(nullities) {
    let previousIncrement = Infinity;
    for (let k = 1; k < nullities.length; k++) {
      const increment = nullities[k] - nullities[k - 1];
      if (increment < 0 || increment > previousIncrement) return false;
      previousIncrement = increment;
    }
    return true;
  }

  function repairJordanNullities(nullities, multiplicity) {
    const repaired = [0];
    for (let k = 1; k <= multiplicity; k++) {
      const value = Math.round(nullities[k] || 0);
      repaired[k] = Math.max(repaired[k - 1], Math.min(multiplicity, value));
    }
    repaired[multiplicity] = multiplicity;
    return repaired;
  }

  function blockSizesFromNullities(nullities, multiplicity) {
    const atLeast = Array.from({ length: multiplicity + 2 }, () => 0);
    for (let k = 1; k <= multiplicity; k++) {
      atLeast[k] = Math.max(0, nullities[k] - nullities[k - 1]);
    }
    for (let k = 2; k <= multiplicity; k++) atLeast[k] = Math.min(atLeast[k], atLeast[k - 1]);
    let total = atLeast.reduce((sum, value) => sum + value, 0);
    while (total < multiplicity) {
      atLeast[1]++;
      total++;
    }
    for (let k = multiplicity; total > multiplicity && k >= 1; k--) {
      const floor = atLeast[k + 1] || 0;
      const drop = Math.min(atLeast[k] - floor, total - multiplicity);
      if (drop > 0) {
        atLeast[k] -= drop;
        total -= drop;
      }
    }

    const sizes = [];
    for (let k = multiplicity; k >= 1; k--) {
      const exact = Math.max(0, atLeast[k] - (atLeast[k + 1] || 0));
      for (let i = 0; i < exact; i++) sizes.push(k);
    }
    return sizes.length ? sizes : [multiplicity];
  }

  function nullspaceBasesByPower(N, maxPower, tol) {
    const bases = [[]];
    let power = identity(N.length);
    for (let k = 1; k <= maxPower; k++) {
      power = matrixMultiply(power, N);
      bases[k] = nullspace(power, tol);
    }
    return bases;
  }

  function chooseJordanChain(N, size, existingColumns, basesByPower, tol) {
    const basis = basesByPower[size] || [];
    const before = rankOfColumns(existingColumns, tol);
    for (const candidate of jordanChainCandidates(basis)) {
      const chain = jordanChainFromTop(N, candidate, size);
      if (chain.some((v) => vectorNorm(v) <= tol)) continue;
      const after = rankOfColumns(existingColumns.concat(chain), tol);
      if (after >= before + size) return scaleChainForDisplay(chain);
    }
    return null;
  }

  function jordanChainCandidates(basis) {
    const candidates = basis.map((v) => v.map((z) => z.clone()));
    for (let i = 0; i < basis.length; i++) {
      for (let j = i + 1; j < basis.length; j++) {
        candidates.push(addVectors(basis[i], basis[j]));
        candidates.push(addVectors(basis[i], basis[j].map((z) => z.mul(new Complex(0, 1)))));
      }
    }
    return candidates;
  }

  function jordanChainFromTop(N, top, size) {
    const chain = [top.map((z) => z.clone())];
    let current = top.map((z) => z.clone());
    for (let k = 1; k < size; k++) {
      current = matrixVectorMultiply(N, current);
      chain.unshift(current);
    }
    return chain;
  }

  function scaleChainForDisplay(chain) {
    const top = chain[chain.length - 1];
    const norm = vectorNorm(top);
    if (norm <= TOL) return chain;
    return chain.map((v) => v.map((z) => z.scale(1 / norm)));
  }

  function jordanResidual(A, P, J) {
    const AP = matrixMultiply(A, P);
    const PJ = matrixMultiply(P, J);
    return maxMatrixNorm(matrixAdd(AP, matrixScale(PJ, -1)));
  }

  function subtractScalarIdentity(A, scalar) {
    const out = copyMatrix(A);
    for (let i = 0; i < out.length; i++) out[i][i] = out[i][i].sub(scalar);
    return out;
  }

  function matrixVectorMultiply(A, v) {
    return A.map((row) => row.reduce((sum, z, c) => sum.add(z.mul(v[c])), new Complex(0, 0)));
  }

  function addVectors(a, b) {
    return a.map((z, i) => z.add(b[i]));
  }

  function rankOfColumns(cols, tol) {
    if (!cols.length) return 0;
    return rref(matrixFromColumns(cols), tol).rank;
  }

  function cleanComplex(z, tol = DISPLAY_TOL) {
    z = Complex.from(z);
    return new Complex(Math.abs(z.re) < tol ? 0 : z.re, Math.abs(z.im) < tol ? 0 : z.im);
  }

  function normalizeVector(v) {
    const norm = vectorNorm(v);
    if (norm <= TOL) return v;
    return v.map((z) => z.scale(1 / norm));
  }

  function matrixFromColumns(cols) {
    const rows = cols[0].length;
    const out = zeros(rows, cols.length);
    for (let c = 0; c < cols.length; c++) {
      for (let r = 0; r < rows; r++) out[r][c] = cols[c][r].clone();
    }
    return out;
  }

  function computeSelectedOperation() {
    refs.operationMessage.textContent = '';
    state.lastOperationResult = null;
    const data = readMatrix(true);
    if (data.errors.length) {
      const first = data.errors[0];
      refs.operationMessage.textContent = `Invalid entry at (${first.row}, ${first.col}): ${first.message}`;
      return;
    }

    try {
      const A = data.matrix;
      const op = refs.operation.value;
      const symbolic = refs.resultMode.value === 'symbolic';
      let payload = null;
      if (symbolic && canComputeSymbolically(op)) {
        payload = computeSymbolicOperation(data, op);
      } else if (op === 'transpose') {
        payload = {
          title: 'Transpose',
          formula: 'A^T',
          blocks: [{ title: 'A^T', matrix: transpose(A) }]
        };
      } else if (op === 'inverse') {
        payload = {
          title: 'Inverse',
          formula: 'A^{-1}',
          blocks: [{ title: 'A^{-1}', matrix: inverse(A) }]
        };
      } else if (op === 'power') {
        const n = clampInt(refs.powerExponent.value, -12, 12, 2);
        refs.powerExponent.value = String(n);
        const powerLabel = `A^{${n}}`;
        payload = {
          title: `Power ${n}`,
          formula: powerLabel,
          blocks: [{ title: powerLabel, matrix: matrixPower(A, n) }]
        };
      } else if (op === 'exp') {
        payload = {
          title: 'Matrix Exponential',
          formula: 'exp(A)',
          blocks: [{ title: 'exp(A)', matrix: matrixExp(A) }],
          note: 'Computed numerically by scaling, Taylor summation, and squaring.'
        };
      } else if (op === 'jordan') {
        const result = jordanDecomposition(A);
        payload = {
          title: 'Jordan Decomposition',
          formula: result.formula,
          blocks: result.blocks,
          note: result.note
        };
      } else if (op === 'bruhat') {
        const result = bruhatDecomposition(A);
        payload = {
          title: 'Bruhat Decomposition',
          formula: 'A = B_1\\omega B_2',
          blocks: [
            { title: 'B_1', matrix: result.B1 },
            { title: '\\omega', matrix: result.W },
            { title: 'B_2', matrix: result.B2 }
          ],
          note: 'Numerical Bruhat form in GL(n): A = B_1 omega B_2, with B_1 and B_2 upper triangular and omega a permutation matrix.'
        };
      } else if (op === 'qr') {
        const result = qrDecomposition(A);
        const note = result.dependent.length
          ? `Thin QR computed numerically; dependent columns: ${result.dependent.join(', ')}.`
          : 'Thin QR computed numerically with the complex inner product.';
        payload = {
          title: 'QR Decomposition',
          formula: 'A = Q R',
          blocks: [{ title: 'Q', matrix: result.Q }, { title: 'R', matrix: result.R }],
          note
        };
      }
      if (payload && symbolic && !canComputeSymbolically(op)) {
        payload.note = [payload.note, 'Symbolic mode is not available for this operation here, so the displayed result is numerical.']
          .filter(Boolean)
          .join(' ');
      }
      if (payload) renderOperationResult(payload);
    } catch (error) {
      refs.operationMessage.textContent = error.message;
    }
  }

  function canComputeSymbolically(op) {
    return op === 'transpose' || op === 'inverse' || op === 'power' || op === 'bruhat';
  }

  function computeSymbolicOperation(data, op) {
    const A = exactMatrixFromDetails(data.details);
    if (op === 'transpose') {
      return {
        title: 'Transpose',
        formula: 'A^T',
        blocks: [{ title: 'A^T', matrix: exactTranspose(A), exact: true }]
      };
    }
    if (op === 'inverse') {
      return {
        title: 'Inverse',
        formula: 'A^{-1}',
        blocks: [{ title: 'A^{-1}', matrix: exactInverse(A), exact: true }]
      };
    }
    if (op === 'power') {
      const n = clampInt(refs.powerExponent.value, -12, 12, 2);
      refs.powerExponent.value = String(n);
      const powerLabel = `A^{${n}}`;
      return {
        title: `Power ${n}`,
        formula: powerLabel,
        blocks: [{ title: powerLabel, matrix: exactMatrixPower(A, n), exact: true }]
      };
    }
    if (op === 'bruhat') {
      const result = exactBruhatDecomposition(A);
      return {
        title: 'Bruhat Decomposition',
        formula: 'A = B_1\\omega B_2',
        blocks: [
          { title: 'B_1', matrix: result.B1, exact: true },
          { title: '\\omega', matrix: result.W, exact: true },
          { title: 'B_2', matrix: result.B2, exact: true }
        ],
        note: 'Exact Bruhat form in GL(n): A = B_1 omega B_2, with B_1 and B_2 upper triangular and omega a permutation matrix.'
      };
    }
    throw new Error('Symbolic mode is not available for this operation.');
  }

  function renderOperationResult(payload) {
    state.lastOperationResult = payload;
    clearOperationMath();
    refs.operationOutput.innerHTML =
      operationFormulaBlock(payload) +
      (payload.blocks || []).map((block, index) => matrixLatexBlock(block, index)).join('') +
      (payload.expressions || []).map((block) => expressionBlock(block.title, block.value)).join('') +
      (payload.note ? `<div class="matrix-output-note">${escapeHtml(payload.note)}</div>` : '');
    typesetOperationOutput();
  }

  function operationFormulaBlock(payload) {
    return payload.formula
      ? `<div class="matrix-formula-line">${inlineMathHtml(payload.formula)}</div>`
      : '';
  }

  function handleOperationOutputClick(event) {
    const button = event.target.closest('.matrix-result-name');
    if (!button || button.closest('#operation-output') !== refs.operationOutput) return;
    const index = Number(button.dataset.blockIndex);
    const block = state.lastOperationResult?.blocks?.[index];
    if (!block) return;
    loadMatrixBlockIntoCanvas(block);
  }

  function loadMatrixBlockIntoCanvas(block) {
    const matrix = block.matrix || [];
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    if (!rows || !cols) {
      refs.operationMessage.textContent = 'This result is empty.';
      return;
    }
    if (rows > MAX_SIZE || cols > MAX_SIZE) {
      refs.operationMessage.textContent = `This result is ${rows} x ${cols}; the editor is capped at ${MAX_SIZE} x ${MAX_SIZE}.`;
      return;
    }
    state.rows = rows;
    state.cols = cols;
    state.entries = matrix.map((row) => row.map((value) => matrixEntryText(value, block.exact)));
    refs.rows.value = String(rows);
    refs.cols.value = String(cols);
    refs.operationMessage.textContent = '';
    renderMatrixGrid();
    refreshAll();
    refs.matrixStatus.textContent = `${block.title} loaded into canvas`;
  }

  function clearOperationResult() {
    state.lastOperationResult = null;
    refs.operationMessage.textContent = '';
    clearOperationMath();
    refs.operationOutput.innerHTML = '<span class="hint">No computation yet.</span>';
  }

  function exportOperationResult() {
    if (!state.lastOperationResult) {
      refs.operationMessage.textContent = 'Compute an operation first.';
      return;
    }
    refs.operationMessage.textContent = '';
    refs.exportOut.value = exportOperationPayload(state.lastOperationResult, refs.exportFormat.value);
    const exportCard = refs.exportOut.closest('.card');
    if (exportCard) exportCard.classList.remove('collapsed');
    refs.matrixStatus.textContent = 'operation export ready';
  }

  function exportOperationPayload(result, format) {
    if (format === 'latex') return exportOperationLatex(result);
    if (format === 'python') return exportOperationCode(result, 'python');
    if (format === 'sage') return exportOperationCode(result, 'sage');
    if (format === 'macaulay2') return exportOperationCode(result, 'macaulay2');
    if (format === 'mathematica') return exportOperationCode(result, 'mathematica');
    if (format === 'matlab') return exportOperationCode(result, 'matlab');
    if (format === 'rows' || format === 'bulk') return exportOperationRows(result);
    return exportOperationPlain(result);
  }

  function exportOperationPlain(result) {
    const lines = [`# ${result.title}`];
    if (result.formula) lines.push(`# ${result.formula}`);
    for (const block of result.blocks || []) {
      lines.push('', `${block.title} =`, formatMatrixPlain(block.matrix, block.exact));
    }
    for (const block of result.expressions || []) {
      lines.push('', `${block.title} = ${block.value}`);
    }
    if (result.note) lines.push('', `# ${result.note}`);
    return lines.join('\n').trim();
  }

  function exportOperationLatex(result) {
    const lines = [];
    if (result.formula) lines.push(`% ${result.formula}`);
    for (const block of result.blocks || []) {
      lines.push(`${escapeLatexName(block.title)} = ${matrixToLatexValue(block.matrix, block.exact)}`);
    }
    for (const block of result.expressions || []) {
      lines.push(`${escapeLatexName(block.title)} = ${block.value}`);
    }
    if (result.note) lines.push(`% ${result.note}`);
    return lines.join('\n');
  }

  function exportOperationRows(result) {
    const lines = [`# ${result.title}`];
    if (result.formula) lines.push(`# ${result.formula}`);
    for (const block of result.blocks || []) {
      lines.push('', `${block.title}:`, matrixRowsValue(block.matrix, block.exact));
    }
    for (const block of result.expressions || []) {
      lines.push('', `${block.title}:`, block.value);
    }
    if (result.note) lines.push('', `# ${result.note}`);
    return lines.join('\n').trim();
  }

  function exportOperationCode(result, format) {
    const comment = format === 'mathematica' ? '(*' : format === 'matlab' ? '%' : format === 'macaulay2' ? '--' : '#';
    const commentEnd = format === 'mathematica' ? ' *)' : '';
    const lines = [];
    if (format === 'python' && operationNeedsPythonFraction(result)) {
      lines.push('from fractions import Fraction', '');
    }
    lines.push(`${comment} ${result.title}${commentEnd}`);
    if (result.formula) lines.push(`${comment} ${result.formula}${commentEnd}`);
    for (const block of result.blocks || []) {
      const name = operationVariableName(block.title, format);
      lines.push(operationAssignment(name, block.matrix, format, block.exact));
    }
    for (const block of result.expressions || []) {
      const name = operationVariableName(block.title, format);
      lines.push(expressionAssignment(name, block.value, format));
    }
    if (result.note) lines.push(`${comment} ${result.note}${commentEnd}`);
    return lines.join('\n');
  }

  function operationNeedsPythonFraction(result) {
    return (result.blocks || []).some((block) => block.exact && exactMatrixNeedsFraction(block.matrix));
  }

  function exactMatrixNeedsFraction(matrix) {
    return matrix.some((row) => row.some((value) => {
      value = ExactScalar.from(value);
      return value.re.den !== 1n || value.im.den !== 1n;
    }));
  }

  function operationAssignment(name, matrix, format, exact = false) {
    if (format === 'python') return `${name} = ${matrixCodeValue(matrix, format, exact)}`;
    if (format === 'sage') return `${name} = Matrix(${matrixCodeValue(matrix, format, exact)})`;
    if (format === 'macaulay2') return `${name} = matrix ${matrixCodeValue(matrix, format, exact)}`;
    if (format === 'mathematica') return `${name} = ${matrixCodeValue(matrix, format, exact)};`;
    if (format === 'matlab') return `${name} = ${matrixCodeValue(matrix, format, exact)};`;
    return `${name} = ${formatMatrixPlain(matrix, exact)}`;
  }

  function expressionAssignment(name, value, format) {
    if (format === 'mathematica' || format === 'matlab') return `${name} = ${value};`;
    return `${name} = ${value}`;
  }

  function matrixCodeValue(matrix, format, exact = false) {
    if (format === 'macaulay2') {
      return '{' + matrix.map((row) => '{' + row.map((z) => matrixEntrySource(z, format, exact)).join(', ') + '}').join(', ') + '}';
    }
    if (format === 'mathematica') {
      return '{' + matrix.map((row) => '{' + row.map((z) => matrixEntrySource(z, format, exact)).join(', ') + '}').join(', ') + '}';
    }
    if (format === 'matlab') {
      return '[' + matrix.map((row) => row.map((z) => matrixEntrySource(z, format, exact)).join(', ')).join('; ') + ']';
    }
    return '[' + matrix.map((row) => '[' + row.map((z) => matrixEntrySource(z, format, exact)).join(', ') + ']').join(', ') + ']';
  }

  function matrixEntrySource(value, format, exact) {
    return exact ? exactScalarSource(value, format) : numericComplexSource(value, format);
  }

  function matrixEntryText(value, exact = false) {
    return exact ? formatScalar(value).replace(/\s+/g, '') : formatComplex(value, 14).replace(/\s+/g, '');
  }

  function numericComplexSource(z, format) {
    z = Complex.from(z);
    const re = Math.abs(z.re) < DISPLAY_TOL ? 0 : z.re;
    const im = Math.abs(z.im) < DISPLAY_TOL ? 0 : z.im;
    if (im === 0) return formatReal(re, 12);
    if (format === 'python') return `complex(${formatReal(re, 12)}, ${formatReal(im, 12)})`;
    const unit = imagUnit(format);
    const absIm = Math.abs(im);
    const coeff = Math.abs(absIm - 1) < DISPLAY_TOL ? '' : `${formatReal(absIm, 12)}*`;
    if (re === 0) return `${im < 0 ? '-' : ''}${coeff}${unit}`;
    return `${formatReal(re, 12)} ${im < 0 ? '-' : '+'} ${coeff}${unit}`;
  }

  function exactScalarSource(value, format) {
    value = ExactScalar.from(value);
    if (value.im.isZero()) return exactFractionSource(value.re, format);
    if (format === 'python') {
      return `complex(${exactFractionSource(value.re, format)}, ${exactFractionSource(value.im, format)})`;
    }
    const unit = imagUnit(format);
    if (value.re.isZero()) return exactImagSource(value.im, format, unit, false);
    const sign = value.im.sign() < 0 ? ' - ' : ' + ';
    return `${exactFractionSource(value.re, format)}${sign}${exactImagSource(value.im.abs(), format, unit, true)}`;
  }

  function exactFractionSource(value, format) {
    value = Fraction.from(value);
    if (value.den === 1n) return value.num.toString();
    if (format === 'latex') return exactLatexFraction(value);
    if (format === 'python') return `Fraction(${value.num.toString()}, ${value.den.toString()})`;
    return `${value.num.toString()}/${value.den.toString()}`;
  }

  function exactLatexFraction(value) {
    value = Fraction.from(value);
    const sign = value.sign() < 0 ? '-' : '';
    return `${sign}\\frac{${bigintAbs(value.num).toString()}}{${value.den.toString()}}`;
  }

  function exactImagSource(value, format, unit, omitSign) {
    value = Fraction.from(value);
    const abs = value.abs();
    const sign = value.sign() < 0 && !omitSign ? '-' : '';
    if (abs.isOne()) return `${sign}${unit}`;
    const coeff = exactFractionSource(omitSign ? abs : value, format);
    if (format === 'latex') return `${coeff}${unit}`;
    return `${coeff}*${unit}`;
  }

  function operationVariableName(title, format) {
    const base = String(title || 'result').replace(/\^/g, '_pow_').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'result';
    if (format === 'mathematica') return base.replace(/^([0-9])/, 'm$1');
    return base.replace(/^([0-9])/, 'm$1');
  }

  function escapeLatexName(title) {
    return String(title).replace(/_/g, '\\_');
  }

  function formatMatrixPlain(matrix, exact = false) {
    return matrix.map((row) => '[' + row.map((z) => exact ? formatScalar(z) : formatComplex(z, 12)).join(', ') + ']').join('\n');
  }

  function matrixToLatexValue(matrix, exact = false) {
    return `\\begin{pmatrix}${matrix.map((row) => row.map((z) => exact ? exactScalarSource(z, 'latex') : formatComplex(z, 12)).join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;
  }

  function matrixLatexBlock(block, index) {
    const latex = matrixToLatexValue(block.matrix, block.exact);
    return `<div class="matrix-result-block matrix-latex-row"><button class="matrix-result-name" type="button" data-block-index="${index}" title="load ${escapeHtml(block.title)} into canvas">${inlineMathHtml(block.title)}</button><span class="matrix-equals">=</span><span class="matrix-latex-code">${inlineMathHtml(latex)}</span></div>`;
  }

  function matrixBlock(title, matrix, note = '', exact = false) {
    const noteHtml = note ? `<div class="matrix-output-note">${escapeHtml(note)}</div>` : '';
    return `<div class="matrix-result-block"><div class="matrix-result-title">${escapeHtml(title)}</div>${matrixToHtml(matrix, exact)}${noteHtml}</div>`;
  }

  function expressionBlock(title, value) {
    return `<div class="matrix-result-block"><div class="matrix-result-title">${escapeHtml(title)}</div><div class="matrix-polynomial">${escapeHtml(value)}</div></div>`;
  }

  function inlineMathHtml(latex) {
    return `\\(${escapeHtml(latex)}\\)`;
  }

  function typesetOperationOutput() {
    if (!window.MathJax?.typesetPromise) return;
    mathJaxTypesetQueue = mathJaxTypesetQueue
      .then(() => window.MathJax.typesetPromise([refs.operationOutput]))
      .catch(() => {});
  }

  function clearOperationMath() {
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([refs.operationOutput]);
  }

  function matrixToHtml(matrix, exact = false) {
    const rows = matrix.map((row) => '<tr>' + row.map((z) => {
      const value = exact ? formatScalar(z) : formatComplex(z);
      const title = exact ? value : formatComplex(z, 12);
      return `<td title="${escapeHtml(title)}">${escapeHtml(value)}</td>`;
    }).join('') + '</tr>').join('');
    return `<table class="matrix-table">${rows}</table>`;
  }

  function formatReal(value, digits = 8) {
    if (Math.abs(value) < DISPLAY_TOL) value = 0;
    const nearInteger = Math.round(value);
    if (Math.abs(value - nearInteger) < DISPLAY_TOL) return String(nearInteger);
    return Number(value.toPrecision(digits)).toString();
  }

  function formatComplex(z, digits = 8) {
    z = Complex.from(z);
    const re = Math.abs(z.re) < DISPLAY_TOL ? 0 : z.re;
    const im = Math.abs(z.im) < DISPLAY_TOL ? 0 : z.im;
    if (im === 0) return formatReal(re, digits);
    if (re === 0) {
      if (Math.abs(im - 1) < DISPLAY_TOL) return 'i';
      if (Math.abs(im + 1) < DISPLAY_TOL) return '-i';
      return `${formatReal(im, digits)}i`;
    }
    const sign = im < 0 ? '-' : '+';
    const absIm = Math.abs(im);
    const imag = Math.abs(absIm - 1) < DISPLAY_TOL ? 'i' : `${formatReal(absIm, digits)}i`;
    return `${formatReal(re, digits)} ${sign} ${imag}`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openImportDialog() {
    refs.bulkMessage.textContent = '';
    refs.importDialogMessage.textContent = '';
    refs.importText.value = exportBulkInputFromEntries();
    refs.importDialog.hidden = false;
    refs.importText.focus();
    refs.importText.select();
  }

  function closeImportDialog() {
    refs.importDialog.hidden = true;
    refs.importDialogMessage.textContent = '';
  }

  function applyBulkInput() {
    refs.bulkMessage.textContent = '';
    refs.importDialogMessage.textContent = '';
    try {
      const parsed = parseImportedMatrix(refs.importText.value);
      const rows = parsed.rows;
      const rowCount = rows.length;
      const colCount = rows[0]?.length || 0;
      if (rowCount < 1 || colCount < 1) throw new Error('Enter at least one row and one column.');
      if (rowCount > MAX_SIZE || colCount > MAX_SIZE) throw new Error(`The browser editor is capped at ${MAX_SIZE} x ${MAX_SIZE}.`);
      state.rows = rowCount;
      state.cols = colCount;
      state.entries = rows;
      refs.rows.value = String(rowCount);
      refs.cols.value = String(colCount);
      clearOperationResult();
      renderMatrixGrid();
      refreshAll();
      refs.bulkMessage.textContent = `Imported ${parsed.style}.`;
      closeImportDialog();
    } catch (error) {
      refs.importDialogMessage.textContent = error.message;
    }
  }

  function parseImportedMatrix(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('No input was provided.');
    if (/\\begin\s*\{[pbvBV]?matrix\}/.test(raw) || /&/.test(raw) || /\\\\/.test(raw)) {
      return { style: 'LaTeX matrix', rows: parseLatexMatrix(raw) };
    }
    return { style: 'bulk input', rows: parseBulkMatrix(raw) };
  }

  function parseLatexMatrix(text) {
    let body = String(text || '').trim();
    body = body
      .replace(/^\s*\\left[\[(|{]?\s*/, '')
      .replace(/\s*\\right[\])|}]?\s*$/, '');
    const env = body.match(/\\begin\s*\{[pbvBV]?matrix\}([\s\S]*?)\\end\s*\{[pbvBV]?matrix\}/);
    if (env) body = env[1];
    body = body
      .replace(/\\dfrac/g, '\\frac')
      .replace(/\\tfrac/g, '\\frac')
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2')
      .replace(/\\mathrm\s*\{i\}/g, 'i')
      .replace(/\\operatorname\s*\{i\}/g, 'i')
      .replace(/\\,/g, '')
      .replace(/\\;/g, '')
      .replace(/\\!/g, '')
      .replace(/\$/g, '');
    const rowTexts = body.split(/\\\\/).map((row) => row.trim()).filter(Boolean);
    if (!rowTexts.length) throw new Error('No matrix rows found in LaTeX input.');
    const rows = rowTexts.map((row) => row
      .split('&')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== ''));
    validateImportedRows(rows);
    return rows;
  }

  function parseBulkMatrix(text) {
    const lines = String(text || '')
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error('Enter rows separated by newlines or semicolons.');
    const rows = lines.map((line) => {
      const parts = line.includes(',')
        ? line.split(',').map((x) => x.trim()).filter((x) => x !== '')
        : line.split(/\s+/).filter(Boolean);
      if (!parts.length) throw new Error('Empty row in bulk input.');
      for (const part of parts) validateEntryType(parseEntry(part));
      return parts;
    });
    const width = rows[0].length;
    if (rows.some((row) => row.length !== width)) throw new Error('Every row must have the same number of entries.');
    return rows;
  }

  function validateImportedRows(rows) {
    if (!rows.length || !rows[0]?.length) throw new Error('Enter at least one row and one column.');
    const width = rows[0].length;
    for (const row of rows) {
      if (row.length !== width) throw new Error('Every row must have the same number of entries.');
      for (const part of row) validateEntryType(parseEntry(part));
    }
  }

  function exportBulkInputFromEntries() {
    return state.entries.map((row) => row.map((entry) => String(entry || '0').trim() || '0').join(', ')).join('\n');
  }

  function refreshExport() {
    if (!refs.exportOut) return;
    const data = readMatrix(false);
    if (data.errors.length) {
      const first = data.errors[0];
      refs.exportOut.value = `Invalid entry at (${first.row}, ${first.col}): ${first.message}`;
      return;
    }
    const format = refs.exportFormat.value;
    refs.exportOut.value = exportMatrix(data.details, format);
  }

  function exportMatrix(details, format) {
    if (format === 'latex') return exportLatex(details);
    if (format === 'python') return exportPython(details);
    if (format === 'sage') return exportSage(details);
    if (format === 'macaulay2') return exportMacaulay2(details);
    if (format === 'mathematica') return exportMathematica(details);
    if (format === 'matlab') return exportMatlab(details);
    if (format === 'rows' || format === 'bulk') return exportRows(details);
    return '';
  }

  function exportLatex(details) {
    const rows = details.map((row) => row.map((entry) => sourceComplex(entry, 'latex')).join(' & ')).join(' \\\\\n');
    return `\\begin{pmatrix}\n${rows}\n\\end{pmatrix}`;
  }

  function exportPython(details) {
    const usesFraction = details.flat().some((entry) => entry.real.rational || entry.imag.rational);
    const rows = details.map((row) => '[' + row.map((entry) => sourceComplex(entry, 'python')).join(', ') + ']').join(',\n    ');
    const prefix = usesFraction ? 'from fractions import Fraction\n\n' : '';
    return `${prefix}A = [\n    ${rows}\n]`;
  }

  function exportSage(details) {
    const rows = details.map((row) => '[' + row.map((entry) => sourceComplex(entry, 'sage')).join(', ') + ']').join(',\n    ');
    return `A = Matrix([\n    ${rows}\n])`;
  }

  function exportMacaulay2(details) {
    const rows = details.map((row) => '{' + row.map((entry) => sourceComplex(entry, 'macaulay2')).join(', ') + '}').join(',\n    ');
    return `A = matrix {\n    ${rows}\n}`;
  }

  function exportMathematica(details) {
    const rows = details.map((row) => '{' + row.map((entry) => sourceComplex(entry, 'mathematica')).join(', ') + '}').join(',\n     ');
    return `A = {\n     ${rows}\n};`;
  }

  function exportMatlab(details) {
    const rows = details.map((row) => row.map((entry) => sourceComplex(entry, 'matlab')).join(', ')).join(';\n     ');
    return `A = [${rows}];`;
  }

  function exportRows(details) {
    return details.map((row) => row.map((entry) => entry.raw && entry.raw.trim() ? entry.raw.trim() : '0').join(', ')).join('\n');
  }

  function matrixRowsValue(matrix, exact = false) {
    return matrix.map((row) => row.map((z) => exact ? formatScalar(z) : formatComplex(z, 12)).join(', ')).join('\n');
  }

  function sourceComplex(entry, format) {
    const reZero = Math.abs(entry.value.re) < DISPLAY_TOL;
    const imZero = Math.abs(entry.value.im) < DISPLAY_TOL;
    if (imZero) return sourcePart(entry.real, format);
    if (format === 'python') return `complex(${sourcePart(entry.real, format)}, ${sourcePart(entry.imag, format)})`;
    const unit = imagUnit(format);
    if (reZero) return sourceImag(entry.imag, format, unit, false);
    const sign = entry.imag.value < 0 ? ' - ' : ' + ';
    return `${sourcePart(entry.real, format)}${sign}${sourceImag(absPart(entry.imag), format, unit, true)}`;
  }

  function sourceImag(part, format, unit, omitSign) {
    const coeff = sourcePart(omitSign ? absPart(part) : part, format);
    const value = Math.abs(part.value);
    if (Math.abs(value - 1) < DISPLAY_TOL) {
      if (format === 'latex') return part.value < 0 && !omitSign ? `-${unit}` : unit;
      return part.value < 0 && !omitSign ? `-${unit}` : unit;
    }
    if (format === 'latex') return `${coeff}${unit}`;
    if (format === 'matlab') return `${coeff}*${unit}`;
    return `${coeff}*${unit}`;
  }

  function sourcePart(part, format) {
    if (part.rational) {
      const num = Number(part.rational.numText);
      const den = Number(part.rational.denText);
      if (format === 'latex') return latexFraction(num, den);
      if (format === 'python') return `Fraction(${formatReal(num, 14)}, ${formatReal(den, 14)})`;
      return `${formatReal(num, 14)}/${formatReal(den, 14)}`;
    }
    const raw = stripLeadingPlus(part.raw);
    if (format === 'latex') return raw;
    return raw;
  }

  function latexFraction(num, den) {
    const sign = num * den < 0 ? '-' : '';
    return `${sign}\\frac{${formatReal(Math.abs(num), 14)}}{${formatReal(Math.abs(den), 14)}}`;
  }

  function absPart(part) {
    if (part.value >= 0) return {
      value: part.value,
      raw: stripLeadingPlus(part.raw),
      rational: part.rational
        ? {
          numText: stripLeadingPlus(part.rational.numText),
          denText: stripLeadingPlus(part.rational.denText)
        }
        : null
    };
    if (part.rational) {
      return makePart(Math.abs(part.value), String(Math.abs(Number(part.rational.numText))) + '/' + String(Math.abs(Number(part.rational.denText))), {
        numText: String(Math.abs(Number(part.rational.numText))),
        denText: String(Math.abs(Number(part.rational.denText)))
      });
    }
    return makePart(Math.abs(part.value), String(Math.abs(part.value)));
  }

  function stripLeadingPlus(text) {
    const raw = String(text ?? '').trim();
    return raw.startsWith('+') ? raw.slice(1) : raw;
  }

  function imagUnit(format) {
    if (format === 'latex') return 'i';
    if (format === 'mathematica') return 'I';
    if (format === 'macaulay2') return 'ii';
    if (format === 'matlab') return '1i';
    return 'I';
  }

  function copyExport() {
    if (!refs.exportOut.value) refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { refs.matrixStatus.textContent = 'export copied'; })
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
      refs.matrixStatus.textContent = 'export copied';
    } catch (_) {
      refs.matrixStatus.textContent = 'copy unavailable';
    }
  }
})();
