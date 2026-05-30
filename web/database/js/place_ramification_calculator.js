(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    rawD: 2,
    primeBound: 11,
    showInfinite: true,
    selectedKey: 'p:2',
    hitboxes: [],
    places: [],
    extraPrimes: [],
    hiddenPrimes: [],
    canvasWidth: 920,
    canvasHeight: 340
  };

  const PLACE_STYLE = {
    ramified: { fill: '#8b3a2a', stroke: '#6b2a1f', label: 'ramified' },
    split: { fill: '#3d6b4f', stroke: '#294936', label: 'split' },
    inert: { fill: '#4d6478', stroke: '#314253', label: 'inert' },
    complex: { fill: '#8b3a2a', stroke: '#6b2a1f', label: 'complex' }
  };

  function normalizedField() {
    const raw = Math.trunc(Number(state.rawD) || 0);
    if (raw === 0 || raw === 1) {
      return { error: 'd must be an integer different from 0 and 1.' };
    }
    const d = squarefreePart(raw);
    if (d === 1) return { error: 'd must define a nontrivial quadratic extension.' };
    const mod4 = positiveMod(d, 4);
    const discriminant = mod4 === 1 ? d : 4 * d;
    const realPlaces = d > 0 ? 2 : 0;
    const complexPlaces = d > 0 ? 0 : 1;
    return {
      raw,
      d,
      discriminant,
      realPlaces,
      complexPlaces,
      signature: `(${realPlaces}, ${complexPlaces})`,
      ring: mod4 === 1 ? `Z[(1+sqrt(${d}))/2]` : `Z[sqrt(${d})]`,
      polynomial: `x^2 - (${d})`
    };
  }

  function squarefreePart(value) {
    const sign = value < 0 ? -1 : 1;
    let n = Math.abs(value);
    let result = 1;
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      let count = 0;
      while (n % p === 0) {
        n = Math.floor(n / p);
        count++;
      }
      if (count % 2) result *= p;
    }
    if (n > 1) result *= n;
    return sign * result;
  }

  function positiveMod(a, m) {
    return ((a % m) + m) % m;
  }

  function primesUpTo(n) {
    const limit = Math.max(2, Math.floor(n));
    const sieve = Array(limit + 1).fill(true);
    sieve[0] = false;
    sieve[1] = false;
    for (let p = 2; p * p <= limit; p++) {
      if (!sieve[p]) continue;
      for (let k = p * p; k <= limit; k += p) sieve[k] = false;
    }
    const out = [];
    for (let p = 2; p <= limit; p++) if (sieve[p]) out.push(p);
    return out;
  }

  function isPrime(n) {
    const value = Math.floor(Number(n));
    if (value < 2) return false;
    if (value === 2) return true;
    if (value % 2 === 0) return false;
    for (let p = 3; p * p <= value; p += 2) {
      if (value % p === 0) return false;
    }
    return true;
  }

  function factorInteger(value) {
    let n = Math.abs(Math.trunc(value));
    if (n <= 1) return [];
    const factors = [];
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      if (n % p) continue;
      let exponent = 0;
      while (n % p === 0) {
        n = Math.floor(n / p);
        exponent++;
      }
      factors.push([p, exponent]);
    }
    if (n > 1) factors.push([n, 1]);
    return factors;
  }

  function factorText(value) {
    const sign = value < 0 ? '-' : '';
    const factors = factorInteger(value);
    if (!factors.length) return String(value);
    return sign + factors.map(([p, e]) => e === 1 ? String(p) : `${p}^${e}`).join(' * ');
  }

  function modPow(base, exponent, modulus) {
    let b = positiveMod(base, modulus);
    let e = exponent;
    let out = 1;
    while (e > 0) {
      if (e & 1) out = (out * b) % modulus;
      b = (b * b) % modulus;
      e >>= 1;
    }
    return out;
  }

  function legendreSymbol(a, p) {
    if (p === 2) return 0;
    const residue = positiveMod(a, p);
    if (residue === 0) return 0;
    const value = modPow(residue, (p - 1) / 2, p);
    return value === 1 ? 1 : -1;
  }

  function sqrtLabel(field) {
    return `\\sqrt{${field.d}}`;
  }

  function sqrtTerm(field, root, sign) {
    const radical = sqrtLabel(field);
    if (!root) return radical;
    return sign === 'plus' ? `${radical}+${root}` : `${radical}-${root}`;
  }

  function squareRootModPrime(value, p) {
    const target = positiveMod(value, p);
    if (p === 2) return target;
    for (let r = 0; r <= Math.floor(p / 2); r++) {
      if ((r * r) % p === target) return r;
    }
    return null;
  }

  function primeIdealLabels(field, p, kind) {
    if (kind === 'inert') return [baseIdealLatex(p)];

    if (kind === 'ramified') {
      const simplified = simplifiedRamifiedIdeal(field, p);
      if (simplified) return [simplified];
    }

    if (p === 2 && positiveMod(field.d, 4) === 1 && kind === 'split') {
      const radical = sqrtLabel(field);
      return [
        `\\left(2,\\frac{1+${radical}}{2}\\right)`,
        `\\left(2,\\frac{${radical}-1}{2}\\right)`
      ];
    }

    const root = squareRootModPrime(field.d, p);
    const r = root == null ? (p === 2 ? positiveMod(field.d, 2) : 0) : root;
    if (kind === 'split') {
      return [
        `(${p},${sqrtTerm(field, r, 'minus')})`,
        `(${p},${sqrtTerm(field, r, 'plus')})`
      ];
    }
    return [`(${p},${sqrtTerm(field, r, 'minus')})`];
  }

  function simplifiedRamifiedIdeal(field, p) {
    if (p === 2 && field.d === -1) return `(1+${sqrtLabel(field)})`;
    if (Math.abs(field.d) === p) return `(${sqrtLabel(field)})`;
    return null;
  }

  function baseIdealLatex(p) {
    return `(${p})`;
  }

  function finitePlace(field, p) {
    const D = field.discriminant;
    if (D % p === 0) {
      return {
        key: `p:${p}`,
        label: baseIdealLatex(p),
        base: `\\(${baseIdealLatex(p)}\\)`,
        kind: 'ramified',
        e: 2,
        f: 1,
        g: 1,
        ideals: primeIdealLabels(field, p, 'ramified'),
        detail: `\\(${p}\\) divides \\(\\operatorname{Disc}(K)=${D}\\).`
      };
    }
    if (p === 2) {
      const mod8 = positiveMod(D, 8);
      if (mod8 === 1) {
        return {
          key: 'p:2',
          label: baseIdealLatex(2),
          base: `\\(${baseIdealLatex(2)}\\)`,
          kind: 'split',
          e: 1,
          f: 1,
          g: 2,
          ideals: primeIdealLabels(field, 2, 'split'),
          detail: '\\(\\operatorname{Disc}(K) \\equiv 1 \\pmod 8\\).'
        };
      }
      return {
        key: 'p:2',
        label: baseIdealLatex(2),
        base: `\\(${baseIdealLatex(2)}\\)`,
        kind: 'inert',
        e: 1,
        f: 2,
        g: 1,
        ideals: primeIdealLabels(field, 2, 'inert'),
        detail: '\\(\\operatorname{Disc}(K) \\equiv 5 \\pmod 8\\).'
      };
    }
    const chi = legendreSymbol(D, p);
    if (chi === 1) {
      return {
        key: `p:${p}`,
        label: baseIdealLatex(p),
        base: `\\(${baseIdealLatex(p)}\\)`,
        kind: 'split',
        e: 1,
        f: 1,
        g: 2,
        ideals: primeIdealLabels(field, p, 'split'),
        detail: `The Kronecker symbol \\(\\left(\\frac{D}{${p}}\\right)=1\\).`
      };
    }
    return {
      key: `p:${p}`,
      label: baseIdealLatex(p),
      base: `\\(${baseIdealLatex(p)}\\)`,
      kind: 'inert',
      e: 1,
      f: 2,
      g: 1,
      ideals: primeIdealLabels(field, p, 'inert'),
      detail: `The Kronecker symbol \\(\\left(\\frac{D}{${p}}\\right)=-1\\).`
    };
  }

  function infinitePlace(field) {
    if (field.d > 0) {
      return {
        key: 'inf',
        label: '\\infty',
        base: '\\(\\infty\\)',
        kind: 'split',
        e: 1,
        f: 1,
        g: 2,
        ideals: ['v_1', 'v_2'],
        detail: 'The field has two real embeddings.'
      };
    }
    return {
      key: 'inf',
      label: '\\infty',
      base: '\\(\\infty\\)',
      kind: 'complex',
      e: 2,
      f: 1,
      g: 1,
      ideals: ['w'],
      detail: 'The real place becomes complex.'
    };
  }

  function buildPlaces(field) {
    const hiddenSet = new Set(state.hiddenPrimes);
    const primeSet = new Set(primesUpTo(state.primeBound).filter((p) => !hiddenSet.has(p)));
    state.extraPrimes.forEach((p) => primeSet.add(p));
    const places = [...primeSet].sort((a, b) => a - b).map((p) => finitePlace(field, p));
    if (state.showInfinite) places.push(infinitePlace(field));
    return places;
  }

  function htmlRows(rows) {
    return rows.map(([label, value]) =>
      `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${escapeHtml(value)}</span></div>`
    ).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function fieldLabel(field) {
    return `Q(sqrt(${field.d}))`;
  }

  function fieldLatex(field) {
    return `\\mathbb{Q}(\\sqrt{${field.d}})`;
  }

  function ringLatex(field) {
    return positiveMod(field.d, 4) === 1
      ? `\\mathbb{Z}\\left[\\frac{1+\\sqrt{${field.d}}}{2}\\right]`
      : `\\mathbb{Z}[\\sqrt{${field.d}}]`;
  }

  function polynomialLatex(field) {
    return field.d < 0 ? `x^2+${Math.abs(field.d)}` : `x^2-${field.d}`;
  }

  function render() {
    const field = normalizedField();
    if (field.error) {
      renderError(field.error);
      return;
    }
    state.places = buildPlaces(field);
    if (!state.places.some((place) => place.key === state.selectedKey)) {
      state.selectedKey = state.places[0]?.key || 'p:2';
    }
    syncControls(field);
    renderInvariants(field);
    renderPlaceChips();
    renderSelectedPlace();
    drawCanvas(field);
    renderExport(field);
  }

  function renderError(message) {
    $('ramification-status').textContent = 'invalid field';
    $('ramification-input-note').textContent = message;
    $('field-invariants').innerHTML = `<p class="err">${escapeHtml(message)}</p>`;
    const chipList = $('place-chip-list');
    if (chipList) chipList.innerHTML = '';
    $('selected-place-data').innerHTML = '';
    const canvas = $('ramification-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const labelLayer = $('ramification-labels');
    if (labelLayer) labelLayer.innerHTML = '';
  }

  function syncControls(field) {
    $('quadratic-d').value = String(state.rawD);
    state.primeBound = Math.min(31, Math.max(2, Math.floor(Number(state.primeBound) || 11)));
    $('prime-bound').value = String(state.primeBound);
    $('prime-bound-output').textContent = String(state.primeBound);
    $('show-infinite').checked = state.showInfinite;
    $('ramification-status').innerHTML = `\\(${fieldLatex(field)}\\)`;
    typeset($('ramification-status'));
    $('ramification-input-note').innerHTML = field.raw === field.d
      ? 'quadratic field over \\(\\mathbb{Q}\\)'
      : `same field as \\(d=${field.d}\\)`;
    typeset($('ramification-input-note'));
    const finiteCount = state.places.filter((place) => place.key.startsWith('p:')).length;
    $('ramification-count-label').textContent = `finite primes shown: ${finiteCount}`;
  }

  function renderInvariants(field) {
    $('field-invariants').innerHTML = htmlRows([
      ['Field', `\\(${fieldLatex(field)}\\)`],
      ['Polynomial', `\\(${polynomialLatex(field)}\\)`],
      ['\\(\\operatorname{Disc}(K)\\)', `\\(${field.discriminant}=${factorText(field.discriminant)}\\)`],
      ['Signature', `\\(${field.signature}\\)`],
      ['\\(\\mathcal{O}_K\\)', `\\(${ringLatex(field)}\\)`],
      ['Ramified finite primes', factorInteger(field.discriminant).map(([p]) => `\\(${p}\\)`).join(', ') || 'none'],
      ['Degree', '\\(2\\)']
    ]);
    typeset($('field-invariants'));
  }

  function renderPlaceChips() {
    const chipList = $('place-chip-list');
    if (!chipList) return;
    const finitePlaces = state.places.filter((place) => place.key.startsWith('p:'));
    chipList.innerHTML = finitePlaces.map((place) => {
      const p = Number(place.key.slice(2));
      return `
        <span class="ramification-chip" data-place-key="${escapeHtml(place.key)}">
          <span>\\(${escapeHtml(place.label)}\\)</span>
          <button type="button" data-remove-prime="${p}" aria-label="remove prime ${p}">&times;</button>
        </span>
      `;
    }).join('');
    typeset(chipList);
  }

  function renderSelectedPlace() {
    const place = state.places.find((item) => item.key === state.selectedKey) || state.places[0];
    if (!place) {
      $('selected-place-data').innerHTML = '<p class="hint">No place selected.</p>';
      return;
    }
    $('ramification-selected-label').innerHTML = `selected place: \\(${escapeHtml(place.label)}\\)`;
    $('selected-place-data').innerHTML = htmlRows([
      ['base place', place.base],
      ['behavior', PLACE_STYLE[place.kind].label],
      ['\\((e,f,g)\\)', `\\((${place.e},${place.f},${place.g})\\)`],
      ['places above', `\\(${place.ideals.join(', ')}\\)`],
      ['criterion', place.detail]
    ]);
    typeset($('selected-place-data'));
    typeset($('ramification-selected-label'));
  }

  function drawCanvas(field) {
    void field;
    const canvas = $('ramification-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const wrap = $('ramification-diagram-wrap');
    const stage = wrap?.parentElement;
    const stageWidth = Math.max(760, Math.floor(stage?.clientWidth || 760) - 34);
    const placeCount = Math.max(1, state.places.length);
    const availableSpan = Math.max(360, stageWidth - 112);
    const gaps = weightedGaps(state.places, availableSpan);
    const span = gaps.reduce((total, gap) => total + gap, 0);
    const W = stageWidth;
    const H = 340;
    const topY = 122;
    const bottomY = 254;
    const topLabelY = 56;
    const startX = (W - span) / 2;

    state.canvasWidth = W;
    state.canvasHeight = H;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    if (wrap) {
      wrap.style.width = `${W}px`;
      wrap.style.height = `${H}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, H);

    state.hitboxes = [];
    const labels = [];
    let cursorX = placeCount === 1 ? W / 2 : startX;
    state.places.forEach((place, index) => {
      const x = cursorX;
      const glyphW = needsSplitLabelRoom(place) ? 122 : 78;
      const placeLabels = drawPlaceGlyph(ctx, place, x, topY, bottomY, glyphW, topLabelY, place.key === state.selectedKey);
      labels.push(...placeLabels);
      state.hitboxes.push({ key: place.key, x: x - glyphW / 2, y: topLabelY - 28, w: glyphW, h: bottomY - topLabelY + 78 });
      cursorX += gaps[index] || 0;
    });
    renderCanvasLabels(labels);
  }

  function needsSplitLabelRoom(place) {
    return !!place && place.key !== 'inf' && place.g === 2;
  }

  function weightedGaps(places, availableSpan) {
    if (places.length <= 1) return [];
    const weights = places.slice(0, -1).map((place, index) => {
      const next = places[index + 1];
      return 1 + (needsSplitLabelRoom(place) || needsSplitLabelRoom(next) ? 0.42 : 0);
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    const rawGaps = weights.map((weight) => availableSpan * weight / totalWeight);
    return rawGaps.map((gap) => Math.max(42, gap));
  }

  function drawPlaceGlyph(ctx, place, cx, topY, bottomY, glyphW, topLabelY, selected) {
    const style = PLACE_STYLE[place.kind];
    const splitOffset = needsSplitLabelRoom(place) ? 48 : 24;
    const tops = place.g === 2
      ? [{ x: cx - splitOffset, y: topY, latex: place.ideals[0] }, { x: cx + splitOffset, y: topY, latex: place.ideals[1] }]
      : [{ x: cx, y: topY, latex: place.ideals[0] }];
    const branchLineWidth = place.kind === 'ramified' || place.kind === 'complex' ? 2.1 : 2;
    const labels = [];

    ctx.save();
    if (selected) {
      ctx.fillStyle = 'rgba(61,107,79,0.06)';
      ctx.fillRect(cx - glyphW * 0.56, topLabelY - 26, glyphW * 1.12, bottomY - topLabelY + 80);
    }

    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = selected ? branchLineWidth + 0.8 : branchLineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(place.kind === 'inert' ? [7, 6] : []);

    tops.forEach((point) => {
      if (place.kind === 'ramified' || place.kind === 'complex') {
        drawBranch(ctx, cx, bottomY, point.x, point.y, -3.2);
        drawBranch(ctx, cx, bottomY, point.x, point.y, 3.2);
      } else {
        drawBranch(ctx, cx, bottomY, point.x, point.y, 0);
      }
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = selected ? '#1a1612' : '#7a6f65';
    ctx.lineWidth = selected ? 2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, bottomY - 7);
    ctx.lineTo(cx, bottomY + 7);
    ctx.stroke();

    tops.forEach((point) => {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 7);
      ctx.lineTo(point.x, point.y + 7);
      ctx.stroke();
    });

    tops.forEach((point) => {
      labels.push({
        x: point.x,
        y: topLabelY,
        latex: point.latex,
        className: selected ? 'ramification-label is-top is-selected' : 'ramification-label is-top'
      });
    });
    labels.push({
      x: cx,
      y: bottomY + 34,
      latex: place.label,
      className: selected ? 'ramification-label is-bottom is-selected' : 'ramification-label is-bottom'
    });
    ctx.restore();
    return labels;
  }

  function drawBranch(ctx, x1, y1, x2, y2, offset) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * offset;
    const ny = dx / length * offset;
    ctx.beginPath();
    ctx.moveTo(x1 + nx, y1 + ny);
    ctx.lineTo(x2 + nx, y2 + ny);
    ctx.stroke();
  }

  function renderCanvasLabels(labels) {
    const layer = $('ramification-labels');
    if (!layer) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([layer]);
    layer.innerHTML = labels.map((label) => (
      `<span class="${label.className}" style="left:${label.x}px;top:${label.y}px;">\\(${escapeHtml(label.latex)}\\)</span>`
    )).join('');
    typeset(layer);
  }

  function typeset(element) {
    if (!element || !window.MathJax) return;
    const run = () => {
      if (!window.MathJax?.typesetPromise) return;
      window.MathJax.typesetPromise([element]).catch(() => {});
    };
    if (window.MathJax.startup?.promise) {
      window.MathJax.startup.promise.then(run).catch(() => {});
      return;
    }
    run();
  }

  function renderExport(field) {
    const payload = {
      calculator: 'Place ramification calculator',
      extension: `${fieldLabel(field)} / Q`,
      squarefreeD: field.d,
      discriminant: field.discriminant,
      signature: field.signature,
      primeBound: state.primeBound,
      showInfinite: state.showInfinite,
      places: state.places.map((place) => ({
        place: place.label,
        behavior: PLACE_STYLE[place.kind].label,
        e: place.e,
        f: place.f,
        g: place.g,
        detail: place.detail
      }))
    };
    $('ramification-export-out').value = JSON.stringify(payload, null, 2);
  }

  function bindInputs() {
    $('quadratic-d').addEventListener('change', (event) => {
      state.rawD = Math.trunc(Number(event.target.value) || 0);
      render();
    });
    $('prime-bound').addEventListener('input', (event) => {
      state.primeBound = Math.min(31, Math.max(2, Math.floor(Number(event.target.value) || 11)));
      state.hiddenPrimes = state.hiddenPrimes.filter((p) => p <= state.primeBound);
      render();
    });
    $('add-extra-prime').addEventListener('click', addExtraPrimeFromInput);
    $('extra-prime-input').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addExtraPrimeFromInput();
    });
    $('place-chip-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-prime]');
      if (!button) return;
      const p = Number(button.dataset.removePrime);
      state.extraPrimes = state.extraPrimes.filter((value) => value !== p);
      if (p <= state.primeBound && !state.hiddenPrimes.includes(p)) {
        state.hiddenPrimes.push(p);
        state.hiddenPrimes.sort((a, b) => a - b);
      }
      if (state.selectedKey === `p:${p}`) {
        const fallback = state.places.find((place) => place.key !== `p:${p}` && place.key.startsWith('p:')) || state.places.find((place) => place.key !== `p:${p}`);
        state.selectedKey = fallback?.key || 'p:2';
      }
      render();
    });
    $('show-infinite').addEventListener('change', (event) => {
      state.showInfinite = event.target.checked;
      render();
    });
    document.querySelectorAll('[data-d]').forEach((button) => {
      button.addEventListener('click', () => {
        state.rawD = Number(button.dataset.d);
        state.selectedKey = state.rawD < 0 ? 'inf' : 'p:2';
        render();
      });
    });
    $('ramification-refresh-export').addEventListener('click', () => {
      const field = normalizedField();
      if (!field.error) renderExport(field);
    });
    $('ramification-select-export').addEventListener('click', () => {
      const out = $('ramification-export-out');
      out.focus();
      out.select();
    });
    $('ramification-canvas').addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', () => {
      const field = normalizedField();
      if (!field.error) drawCanvas(field);
    });
  }

  function addExtraPrimeFromInput() {
    const input = $('extra-prime-input');
    const value = Math.floor(Number(input.value));
    if (!isPrime(value)) {
      input.setCustomValidity('Enter a prime number.');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    if (!state.extraPrimes.includes(value)) {
      state.extraPrimes.push(value);
      state.extraPrimes.sort((a, b) => a - b);
    }
    state.hiddenPrimes = state.hiddenPrimes.filter((p) => p !== value);
    state.selectedKey = `p:${value}`;
    input.value = '';
    render();
  }

  function handleCanvasClick(event) {
    const canvas = $('ramification-canvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / (window.devicePixelRatio || 1);
    const x = (event.clientX - rect.left) * logicalW / rect.width;
    const y = (event.clientY - rect.top) * logicalH / rect.height;
    const hit = state.hitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (hit) {
      state.selectedKey = hit.key;
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
