(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    source: 'quadratic',
    rawD: 2,
    lmfdbQuery: '2.2.5.1',
    lmfdbField: null,
    lmfdbStatus: '',
    lmfdbStatusKind: '',
    lmfdbLoading: false,
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
    unramified: { fill: '#6b5f83', stroke: '#4b425d', label: 'unramified mixed' },
    complex: { fill: '#8b3a2a', stroke: '#6b2a1f', label: 'complex' },
    unknown: { fill: '#7a6f65', stroke: '#5f564d', label: 'unknown' }
  };

  function lmfdbProxyUrl() {
    return String(window.RAMIFICATION_LMFDB_PROXY_URL || '').trim().replace(/\/+$/, '');
  }

  function normalizedQuadraticField() {
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
      source: 'quadratic',
      raw,
      d,
      label: null,
      degree: 2,
      coeffs: [-d, 0, 1],
      discriminant,
      discriminantText: String(discriminant),
      realPlaces,
      complexPlaces,
      r1: realPlaces,
      r2: complexPlaces,
      signature: `(${realPlaces}, ${complexPlaces})`,
      ring: mod4 === 1 ? `Z[(1+sqrt(${d}))/2]` : `Z[sqrt(${d})]`,
      polynomial: `x^2 - (${d})`,
      ramps: factorInteger(discriminant).map(([p]) => p),
      localAlgs: [],
      frobs: []
    };
  }

  function activeField() {
    if (state.source === 'lmfdb' && state.lmfdbField) return state.lmfdbField;
    return normalizedQuadraticField();
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

  function quadraticFinitePlace(field, p) {
    const D = field.discriminant;
    if (D % p === 0) {
      const ideals = primeIdealLabels(field, p, 'ramified');
      const components = assignComponentLabels([{ e: 2, f: 1, label: ideals[0], source: 'quadratic discriminant', ramified: true }]);
      return finitePlaceRecord({
        p,
        kind: 'ramified',
        components,
        detail: `\\(${p}\\) divides \\(\\operatorname{Disc}(K)=${D}\\).`,
        source: 'quadratic discriminant'
      });
    }
    if (p === 2) {
      const mod8 = positiveMod(D, 8);
      if (mod8 === 1) {
        const ideals = primeIdealLabels(field, 2, 'split');
        const components = assignComponentLabels(ideals.map((label) => ({ e: 1, f: 1, label, source: 'quadratic congruence' })));
        return finitePlaceRecord({
          p,
          kind: 'split',
          components,
          detail: '\\(\\operatorname{Disc}(K) \\equiv 1 \\pmod 8\\).',
          source: 'quadratic congruence'
        });
      }
      const components = assignComponentLabels([{ e: 1, f: 2, label: baseIdealLatex(2), source: 'quadratic congruence' }]);
      return finitePlaceRecord({
        p,
        kind: 'inert',
        components,
        detail: '\\(\\operatorname{Disc}(K) \\equiv 5 \\pmod 8\\).',
        source: 'quadratic congruence'
      });
    }
    const chi = legendreSymbol(D, p);
    if (chi === 1) {
      const ideals = primeIdealLabels(field, p, 'split');
      const components = assignComponentLabels(ideals.map((label) => ({ e: 1, f: 1, label, source: 'Kronecker symbol' })));
      return finitePlaceRecord({
        p,
        kind: 'split',
        components,
        detail: `The Kronecker symbol \\(\\left(\\frac{D}{${p}}\\right)=1\\).`,
        source: 'Kronecker symbol'
      });
    }
    const components = assignComponentLabels([{ e: 1, f: 2, label: baseIdealLatex(p), source: 'Kronecker symbol' }]);
    return finitePlaceRecord({
      p,
      kind: 'inert',
      components,
      detail: `The Kronecker symbol \\(\\left(\\frac{D}{${p}}\\right)=-1\\).`,
      source: 'Kronecker symbol'
    });
  }

  function lmfdbFinitePlace(field, p) {
    const ramified = field.ramps.includes(p) || discriminantDivisibleBy(field, p);
    let components = [];
    let source = '';
    let detail = '';

    if (ramified) {
      components = localAlgebraComponents(field, p);
      if (components.length) {
        source = 'LMFDB local_algs';
        detail = `LMFDB local algebra label${components.length === 1 ? '' : 's'}: ${components.map((item) => item.rawLabel).join(', ')}.`;
      } else {
        components = polynomialFactorComponents(field, p, true);
        source = 'polynomial mod p';
        detail = `\\(${p}\\) is listed as ramified; local algebra labels were not available.`;
      }
    } else {
      components = frobeniusComponents(field, p);
      if (components.length) {
        source = 'LMFDB frobs';
        detail = `LMFDB frobs gives splitting type \\(${splittingTypeText(components)}\\).`;
      } else {
        components = polynomialFactorComponents(field, p, false);
        source = 'polynomial mod p';
        detail = `Computed by factoring the defining polynomial modulo \\(${p}\\).`;
      }
    }

    if (!components.length) {
      components = [{ e: ramified ? null : 1, f: null, source, ramified }];
    }

    components = assignComponentLabels(components);
    const kind = kindFromComponents(components, field.degree, ramified);
    return finitePlaceRecord({ p, kind, components, detail, source });
  }

  function finitePlaceRecord({ p, kind, components, detail, source }) {
    return {
      key: `p:${p}`,
      label: baseIdealLatex(p),
      base: `\\(${baseIdealLatex(p)}\\)`,
      kind,
      e: commonComponentValue(components, 'e'),
      f: commonComponentValue(components, 'f'),
      g: components.length,
      components,
      ideals: components.map((component) => component.label),
      splittingType: splittingTypeText(components),
      detail,
      source
    };
  }

  function quadraticInfinitePlace(field) {
    if (field.d > 0) {
      return {
        key: 'inf',
        label: '\\infty',
        base: '\\(\\infty\\)',
        kind: 'split',
        e: 1,
        f: 1,
        g: 2,
        components: [
          { e: 1, f: 1, label: 'v_1', source: 'signature' },
          { e: 1, f: 1, label: 'v_2', source: 'signature' }
        ],
        ideals: ['v_1', 'v_2'],
        splittingType: '1+1',
        detail: 'The field has two real embeddings.',
        source: 'signature'
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
      components: [{ e: 2, f: 1, label: 'w', source: 'signature', ramified: true }],
      ideals: ['w'],
      splittingType: '2',
      detail: 'The real place becomes complex.',
      source: 'signature'
    };
  }

  function lmfdbInfinitePlace(field) {
    const components = [];
    for (let index = 0; index < field.r1; index++) {
      components.push({ e: 1, f: 1, label: field.r1 === 1 ? 'v' : `v_${index + 1}`, source: 'signature' });
    }
    for (let index = 0; index < field.r2; index++) {
      components.push({ e: 2, f: 1, label: field.r2 === 1 ? 'w' : `w_${index + 1}`, source: 'signature', ramified: true });
    }
    const kind = field.r2 && !field.r1 ? 'complex' : field.r2 ? 'unramified' : 'split';
    return {
      key: 'inf',
      label: '\\infty',
      base: '\\(\\infty\\)',
      kind,
      e: commonComponentValue(components, 'e'),
      f: 1,
      g: components.length,
      components,
      ideals: components.map((component) => component.label),
      splittingType: field.r2 ? `${field.r1} real, ${field.r2} complex` : `${field.r1} real`,
      detail: `The field has signature \\((${field.r1}, ${field.r2})\\).`,
      source: 'signature'
    };
  }

  function buildPlaces(field) {
    const hiddenSet = new Set(state.hiddenPrimes);
    const primeSet = new Set(primesUpTo(state.primeBound).filter((p) => !hiddenSet.has(p)));
    if (field.source === 'lmfdb') {
      field.ramps.forEach((p) => {
        if (!hiddenSet.has(p)) primeSet.add(p);
      });
    }
    state.extraPrimes.forEach((p) => primeSet.add(p));
    const finiteBuilder = field.source === 'lmfdb' ? lmfdbFinitePlace : quadraticFinitePlace;
    const places = [...primeSet].sort((a, b) => a - b).map((p) => finiteBuilder(field, p));
    if (state.showInfinite) {
      places.push(field.source === 'lmfdb' ? lmfdbInfinitePlace(field) : quadraticInfinitePlace(field));
    }
    return places;
  }

  function discriminantDivisibleBy(field, p) {
    if (Number.isSafeInteger(field.discriminant)) return Math.abs(field.discriminant) % p === 0;
    return false;
  }

  function localAlgebraComponents(field, p) {
    return field.localAlgs
      .filter((label) => String(label).startsWith(`${p}.`))
      .map((rawLabel) => {
        const parts = String(rawLabel).split('.');
        const f = Number(parts[1]);
        const e = Number.parseInt(parts[2], 10);
        return {
          e: Number.isFinite(e) ? e : null,
          f: Number.isFinite(f) ? f : null,
          source: 'LMFDB local_algs',
          rawLabel,
          ramified: Number.isFinite(e) ? e > 1 : true
        };
      });
  }

  function frobeniusComponents(field, p) {
    const entry = field.frobs.find((item) => Array.isArray(item) && Number(item[0]) === p);
    const data = entry?.[1];
    if (!Array.isArray(data) || data.length === 0 || data[0] === 0) return [];
    const components = [];
    data.forEach((piece) => {
      if (!Array.isArray(piece) || piece.length < 2) return;
      const f = Number(piece[0]);
      const count = Math.max(0, Math.floor(Number(piece[1]) || 0));
      if (!Number.isFinite(f) || f <= 0) return;
      for (let index = 0; index < count; index++) {
        components.push({ e: 1, f, source: 'LMFDB frobs' });
      }
    });
    return components;
  }

  function polynomialFactorComponents(field, p, ramified) {
    if (!Array.isArray(field.coeffs) || field.coeffs.length < 2) return [];
    return factorDegreesModPrime(field.coeffs, p).map((f) => ({
      e: ramified ? null : 1,
      f,
      source: 'polynomial mod p',
      ramified
    }));
  }

  function assignComponentLabels(components) {
    const count = components.length;
    return components.map((component, index) => ({
      ...component,
      label: component.label || (count === 1 ? '\\mathfrak{p}' : `\\mathfrak{p}_{${index + 1}}`)
    }));
  }

  function commonComponentValue(components, key) {
    if (!components.length) return null;
    const first = components[0][key];
    if (first == null) return null;
    return components.every((component) => component[key] === first) ? first : null;
  }

  function kindFromComponents(components, degree, ramified) {
    if (ramified || components.some((component) => component.ramified || component.e > 1)) return 'ramified';
    if (!components.length || components.some((component) => !component.f)) return 'unknown';
    if (components.length === degree && components.every((component) => component.e === 1 && component.f === 1)) return 'split';
    if (components.length === 1 && components[0].e === 1 && components[0].f === degree) return 'inert';
    if (components.every((component) => component.e === 1)) return 'unramified';
    return 'unknown';
  }

  function splittingTypeText(components) {
    const groups = new Map();
    components.forEach((component) => {
      const e = component.e == null ? '?' : component.e;
      const f = component.f == null ? '?' : component.f;
      const key = component.e === 1 || component.e == null ? String(f) : `${e}e${f}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    return [...groups.entries()].map(([key, count]) => count === 1 ? key : `${key}^${count}`).join(' + ') || '?';
  }

  function componentEfText(components) {
    return components.map((component) => {
      const e = component.e == null ? '?' : component.e;
      const f = component.f == null ? '?' : component.f;
      return `(${e},${f})`;
    }).join(', ');
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
    if (field.source === 'lmfdb') return `LMFDB ${field.label}`;
    return `Q(sqrt(${field.d}))`;
  }

  function fieldLatex(field) {
    if (field.source === 'lmfdb') {
      if (field.label === '1.1.1.1') return '\\mathbb{Q}';
      return `K_{${field.label}}`;
    }
    return `\\mathbb{Q}(\\sqrt{${field.d}})`;
  }

  function ringLatex(field) {
    return positiveMod(field.d, 4) === 1
      ? `\\mathbb{Z}\\left[\\frac{1+\\sqrt{${field.d}}}{2}\\right]`
      : `\\mathbb{Z}[\\sqrt{${field.d}}]`;
  }

  function polynomialLatex(field) {
    if (field.source === 'lmfdb') return coeffsToPolynomialLatex(field.coeffs);
    return field.d < 0 ? `x^2+${Math.abs(field.d)}` : `x^2-${field.d}`;
  }

  function render() {
    const field = activeField();
    if (field.error) {
      renderError(field.error);
      renderLmfdbStatus();
      return;
    }
    state.places = buildPlaces(field);
    if (!state.places.some((place) => place.key === state.selectedKey)) {
      state.selectedKey = preferredSelectedKey(field);
    }
    syncControls(field);
    renderInvariants(field);
    renderDecompositionTable();
    renderPlaceChips();
    renderSelectedPlace();
    drawCanvas(field);
    renderExport(field);
  }

  function preferredSelectedKey(field) {
    const ramified = state.places.find((place) => place.kind === 'ramified' && place.key.startsWith('p:'));
    if (field.source === 'lmfdb' && ramified) return ramified.key;
    return state.places[0]?.key || 'p:2';
  }

  function renderError(message) {
    $('ramification-status').textContent = 'invalid field';
    $('ramification-input-note').textContent = message;
    $('field-invariants').innerHTML = `<p class="err">${escapeHtml(message)}</p>`;
    const table = $('decomposition-table');
    if (table) table.innerHTML = '';
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
    $('lmfdb-query').value = state.lmfdbQuery;
    $('quadratic-d').value = String(state.rawD);
    state.primeBound = Math.min(31, Math.max(2, Math.floor(Number(state.primeBound) || 11)));
    $('prime-bound').value = String(state.primeBound);
    $('prime-bound-output').textContent = String(state.primeBound);
    $('show-infinite').checked = state.showInfinite;
    $('ramification-status').innerHTML = `\\(${fieldLatex(field)}\\)`;
    typeset($('ramification-status'));
    if (field.source === 'lmfdb') {
      const warningText = field.warnings.length ? `; ${field.warnings[0]}` : '';
      $('ramification-input-note').textContent = `LMFDB label ${field.label}${warningText}`;
    } else {
      $('ramification-input-note').innerHTML = field.raw === field.d
        ? 'quadratic field over \\(\\mathbb{Q}\\)'
        : `same field as \\(d=${field.d}\\)`;
      typeset($('ramification-input-note'));
    }
    const finiteCount = state.places.filter((place) => place.key.startsWith('p:')).length;
    $('ramification-count-label').textContent = `finite primes shown: ${finiteCount}`;
    renderLmfdbStatus();
  }

  function renderLmfdbStatus() {
    const status = $('lmfdb-search-status');
    const searchButton = $('lmfdb-search');
    const hasProxy = !!lmfdbProxyUrl();
    searchButton.disabled = !hasProxy || state.lmfdbLoading;
    status.classList.toggle('is-error', state.lmfdbStatusKind === 'error' || !hasProxy);
    status.classList.toggle('is-ok', state.lmfdbStatusKind === 'ok');
    if (!hasProxy) {
      status.textContent = 'LMFDB proxy URL is not configured.';
    } else if (state.lmfdbLoading) {
      status.textContent = 'Searching LMFDB...';
    } else {
      status.textContent = state.lmfdbStatus || 'LMFDB proxy ready.';
    }
  }

  function renderInvariants(field) {
    if (field.source === 'lmfdb') {
      $('field-invariants').innerHTML = htmlRows([
        ['Field', `\\(${fieldLatex(field)}\\)`],
        ['LMFDB label', field.label],
        ['Polynomial', `\\(${polynomialLatex(field)}\\)`],
        ['\\(\\operatorname{Disc}(K)\\)', `\\(${field.discriminantText}\\)`],
        ['Signature', `\\(${field.signature}\\)`],
        ['Ramified finite primes', field.ramps.map((p) => `\\(${p}\\)`).join(', ') || 'none'],
        ['Degree', `\\(${field.degree}\\)`],
        ['Galois label', field.galoisLabel || 'n/a']
      ]);
      typeset($('field-invariants'));
      return;
    }

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

  function renderDecompositionTable() {
    const finitePlaces = state.places.filter((place) => place.key.startsWith('p:'));
    const target = $('decomposition-table');
    if (!target) return;
    if (!finitePlaces.length) {
      target.innerHTML = '<p class="hint">No finite places shown.</p>';
      return;
    }
    target.innerHTML = `
      <div class="ramification-scroll">
        <table class="ramification-table">
          <thead>
            <tr>
              <th>p</th>
              <th>behavior</th>
              <th>type</th>
              <th>g</th>
              <th class="left">(e_i,f_i)</th>
              <th class="left">source</th>
            </tr>
          </thead>
          <tbody>
            ${finitePlaces.map((place) => `
              <tr data-place-row="${escapeHtml(place.key)}">
                <td class="nowrap">\\(${escapeHtml(place.label)}\\)</td>
                <td>${escapeHtml(PLACE_STYLE[place.kind]?.label || place.kind)}</td>
                <td class="nowrap">\\(${escapeHtml(place.splittingType)}\\)</td>
                <td>${place.g}</td>
                <td class="left nowrap">\\(${escapeHtml(componentEfText(place.components))}\\)</td>
                <td class="left">${escapeHtml(place.source || 'n/a')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    typeset(target);
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
      ['behavior', PLACE_STYLE[place.kind]?.label || place.kind],
      ['splitting type', `\\(${place.splittingType}\\)`],
      ['\\(g\\)', `\\(${place.g}\\)`],
      ['\\((e_i,f_i)\\)', `\\(${componentEfText(place.components)}\\)`],
      ['places above', `\\(${place.ideals.join(', ')}\\)`],
      ['source', place.source || 'n/a'],
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
    const startX = placeCount === 1 ? W / 2 : (W - span) / 2;

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
      const glyphW = glyphWidth(place);
      const placeLabels = drawPlaceGlyph(ctx, place, x, topY, bottomY, glyphW, topLabelY, place.key === state.selectedKey);
      labels.push(...placeLabels);
      state.hitboxes.push({ key: place.key, x: x - glyphW / 2, y: topLabelY - 28, w: glyphW, h: bottomY - topLabelY + 78 });
      cursorX += gaps[index] || 0;
    });
    renderCanvasLabels(labels);
  }

  function glyphWidth(place) {
    const count = displayComponents(place).length;
    if (place.key === 'inf') return Math.max(78, count * 44 + 34);
    if (place.g > 4) return 122;
    return Math.max(78, count * 48 + 30);
  }

  function displayComponents(place) {
    if (!place.components || place.components.length <= 4) return place.components || [];
    return [{
      e: commonComponentValue(place.components, 'e'),
      f: commonComponentValue(place.components, 'f'),
      label: `\\mathfrak{p}_{1},\\ldots,\\mathfrak{p}_{${place.components.length}}`,
      source: place.source,
      ramified: place.kind === 'ramified'
    }];
  }

  function weightedGaps(places, availableSpan) {
    if (places.length <= 1) return [];
    const weights = places.slice(0, -1).map((place, index) => {
      const next = places[index + 1];
      return 1 + (displayComponents(place).length + displayComponents(next).length - 2) * 0.22;
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    const rawGaps = weights.map((weight) => availableSpan * weight / totalWeight);
    return rawGaps.map((gap) => Math.max(46, gap));
  }

  function drawPlaceGlyph(ctx, place, cx, topY, bottomY, glyphW, topLabelY, selected) {
    const style = PLACE_STYLE[place.kind] || PLACE_STYLE.unknown;
    const visibleComponents = displayComponents(place);
    const topCount = Math.max(1, visibleComponents.length);
    const spacing = topCount <= 1 ? 0 : Math.min(54, glyphW / Math.max(1.4, topCount - 0.15));
    const tops = visibleComponents.map((component, index) => ({
      x: cx + (index - (topCount - 1) / 2) * spacing,
      y: topY,
      latex: component.label,
      component
    }));
    const labels = [];

    ctx.save();
    if (selected) {
      ctx.fillStyle = 'rgba(61,107,79,0.06)';
      ctx.fillRect(cx - glyphW * 0.56, topLabelY - 26, glyphW * 1.12, bottomY - topLabelY + 80);
    }

    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = selected ? 2.8 : 2;
    ctx.lineCap = 'round';
    ctx.setLineDash(place.kind === 'inert' || place.kind === 'unknown' ? [7, 6] : []);

    tops.forEach((point) => {
      const ramifiedBranch = point.component.ramified || point.component.e > 1 || place.kind === 'complex';
      if (ramifiedBranch) {
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
    const places = state.places.map((place) => ({
      place: place.label,
      behavior: PLACE_STYLE[place.kind]?.label || place.kind,
      splittingType: place.splittingType,
      g: place.g,
      components: place.components.map((component) => ({
        label: component.label,
        e: component.e,
        f: component.f,
        source: component.source,
        rawLabel: component.rawLabel || null
      })),
      detail: place.detail
    }));

    const payload = field.source === 'lmfdb'
      ? {
        calculator: 'Place ramification calculator',
        source: 'LMFDB',
        query: field.query,
        queryType: field.queryType,
        lmfdbLabel: field.label,
        lmfdbUrl: field.lmfdbUrl,
        field: {
          degree: field.degree,
          coeffs: field.coeffs,
          discriminant: field.discriminantText,
          signature: field.signature,
          ramifiedPrimes: field.ramps,
          galoisLabel: field.galoisLabel
        },
        primeBound: state.primeBound,
        showInfinite: state.showInfinite,
        places,
        raw: {
          local_algs: field.localAlgs,
          frobs: field.frobs
        }
      }
      : {
        calculator: 'Place ramification calculator',
        source: 'quadratic',
        extension: `${fieldLabel(field)} / Q`,
        squarefreeD: field.d,
        discriminant: field.discriminant,
        signature: field.signature,
        primeBound: state.primeBound,
        showInfinite: state.showInfinite,
        places
      };
    $('ramification-export-out').value = JSON.stringify(payload, null, 2);
  }

  async function searchLmfdbField() {
    if (state.lmfdbLoading) return;
    const proxy = lmfdbProxyUrl();
    state.lmfdbQuery = $('lmfdb-query').value.trim();
    if (!proxy) {
      state.lmfdbStatus = 'LMFDB proxy URL is not configured.';
      state.lmfdbStatusKind = 'error';
      renderLmfdbStatus();
      return;
    }
    if (!state.lmfdbQuery) {
      state.lmfdbStatus = 'Enter an LMFDB label, nickname, or monic integer polynomial.';
      state.lmfdbStatusKind = 'error';
      renderLmfdbStatus();
      return;
    }

    state.lmfdbLoading = true;
    state.lmfdbStatus = '';
    state.lmfdbStatusKind = '';
    renderLmfdbStatus();
    try {
      const endpoint = buildProxyFieldUrl(proxy, state.lmfdbQuery);
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `LMFDB proxy returned HTTP ${response.status}.`);
      }
      const field = normalizeLmfdbPayload(payload);
      state.source = 'lmfdb';
      state.lmfdbField = field;
      state.hiddenPrimes = [];
      state.selectedKey = `p:${field.ramps[0] || primesUpTo(state.primeBound)[0] || 2}`;
      state.lmfdbStatus = payload.warnings?.length
        ? `Loaded ${field.label}; ${payload.warnings[0]}`
        : `Loaded ${field.label}.`;
      state.lmfdbStatusKind = 'ok';
      const fallback = $('quadratic-fallback');
      if (fallback) fallback.open = false;
    } catch (error) {
      state.lmfdbStatus = error.message || 'LMFDB search failed.';
      state.lmfdbStatusKind = 'error';
    } finally {
      state.lmfdbLoading = false;
      render();
    }
  }

  function buildProxyFieldUrl(proxy, query) {
    const clean = proxy.replace(/\/+$/, '');
    const endpoint = clean.endsWith('/field') ? clean : `${clean}/field`;
    const url = new URL(endpoint);
    url.searchParams.set('q', query);
    return url.toString();
  }

  function normalizeLmfdbPayload(payload) {
    const record = payload.field || null;
    if (!record || !record.label) throw new Error('LMFDB proxy response did not include a field record.');
    const coeffs = Array.isArray(record.coeffs) ? record.coeffs.map(Number) : [];
    const degree = Number(record.degree || Math.max(0, coeffs.length - 1));
    const r2 = Number(record.r2 || 0);
    const r1 = Math.max(0, degree - 2 * r2);
    const discAbsNumber = Number(record.disc_abs);
    const discSign = Number(record.disc_sign || 1) < 0 ? -1 : 1;
    const safeDisc = Number.isSafeInteger(discAbsNumber) ? discSign * discAbsNumber : null;
    const discriminantText = safeDisc == null
      ? `${discSign < 0 ? '-' : ''}${record.disc_abs}`
      : String(safeDisc);
    const ramps = Array.isArray(record.ramps)
      ? record.ramps.map(Number).filter((p) => Number.isFinite(p)).sort((a, b) => a - b)
      : [];
    return {
      source: 'lmfdb',
      label: String(record.label),
      lmfdbUrl: `https://www.lmfdb.org/NumberField/${encodeURIComponent(record.label)}`,
      query: payload.query || state.lmfdbQuery,
      queryType: payload.queryType || 'label',
      normalizedInput: payload.normalizedInput || record.label,
      degree,
      coeffs,
      discriminant: safeDisc,
      discriminantText,
      r1,
      r2,
      signature: `(${r1}, ${r2})`,
      ramps,
      localAlgs: Array.isArray(record.local_algs) ? record.local_algs.map(String) : [],
      frobs: Array.isArray(payload.extra?.frobs) ? payload.extra.frobs : [],
      galoisLabel: record.galois_label || '',
      warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      rawField: record,
      rawExtra: payload.extra || null
    };
  }

  function bindInputs() {
    $('lmfdb-query').addEventListener('input', (event) => {
      state.lmfdbQuery = event.target.value;
    });
    $('lmfdb-query').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      searchLmfdbField();
    });
    $('lmfdb-search').addEventListener('click', searchLmfdbField);
    $('quadratic-d').addEventListener('change', (event) => {
      state.source = 'quadratic';
      state.rawD = Math.trunc(Number(event.target.value) || 0);
      state.selectedKey = state.rawD < 0 ? 'inf' : 'p:2';
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
        state.source = 'quadratic';
        state.rawD = Number(button.dataset.d);
        state.selectedKey = state.rawD < 0 ? 'inf' : 'p:2';
        render();
      });
    });
    $('ramification-refresh-export').addEventListener('click', () => {
      const field = activeField();
      if (!field.error) renderExport(field);
    });
    $('ramification-select-export').addEventListener('click', () => {
      const out = $('ramification-export-out');
      out.focus();
      out.select();
    });
    $('ramification-canvas').addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', () => {
      const field = activeField();
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

  function coeffsToPolynomialLatex(coeffs) {
    if (!Array.isArray(coeffs) || !coeffs.length) return '?';
    const terms = [];
    for (let degree = coeffs.length - 1; degree >= 0; degree--) {
      const coeff = Number(coeffs[degree]);
      if (!coeff) continue;
      const abs = Math.abs(coeff);
      const sign = coeff < 0 ? '-' : '+';
      let body;
      if (degree === 0) {
        body = String(abs);
      } else {
        const coeffText = abs === 1 ? '' : String(abs);
        body = `${coeffText}x${degree === 1 ? '' : `^{${degree}}`}`;
      }
      terms.push({ sign, body });
    }
    if (!terms.length) return '0';
    return terms.map((term, index) => {
      if (index === 0) return term.sign === '-' ? `-${term.body}` : term.body;
      return `${term.sign}${term.body}`;
    }).join('');
  }

  function factorDegreesModPrime(coeffs, p) {
    let poly = normalizePolyMod(coeffs, p);
    const degrees = [];
    let guard = 0;
    while (poly.length > 1 && guard++ < 40) {
      let changed = false;
      for (let root = 0; root < p; root++) {
        while (poly.length > 1 && polyEvalMod(poly, root, p) === 0) {
          const divided = polyDivMod(poly, [positiveMod(-root, p), 1], p);
          if (divided.remainder.length) break;
          degrees.push(1);
          poly = divided.quotient;
          changed = true;
        }
      }
      if (changed) continue;

      const degree = poly.length - 1;
      if (degree <= 1) {
        degrees.push(degree);
        break;
      }

      let found = false;
      for (let trialDegree = 2; trialDegree <= Math.floor(degree / 2) && !found; trialDegree++) {
        const attempts = Math.pow(p, trialDegree);
        if (attempts > 70000) continue;
        for (let code = 0; code < attempts; code++) {
          const divisor = monicPolynomialFromCode(code, trialDegree, p);
          const divided = polyDivMod(poly, divisor, p);
          if (!divided.remainder.length) {
            degrees.push(trialDegree);
            poly = divided.quotient;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        degrees.push(degree);
        break;
      }
    }
    return degrees.filter((degree) => degree > 0).sort((a, b) => a - b);
  }

  function normalizePolyMod(coeffs, p) {
    const poly = coeffs.map((coeff) => positiveMod(Math.trunc(Number(coeff) || 0), p));
    while (poly.length && poly[poly.length - 1] === 0) poly.pop();
    return poly.length ? poly : [0];
  }

  function polyEvalMod(poly, x, p) {
    let out = 0;
    for (let index = poly.length - 1; index >= 0; index--) {
      out = positiveMod(out * x + poly[index], p);
    }
    return out;
  }

  function monicPolynomialFromCode(code, degree, p) {
    const coeffs = [];
    let value = code;
    for (let index = 0; index < degree; index++) {
      coeffs.push(value % p);
      value = Math.floor(value / p);
    }
    coeffs.push(1);
    return coeffs;
  }

  function polyDivMod(dividend, divisor, p) {
    const rem = normalizePolyMod(dividend, p);
    const div = normalizePolyMod(divisor, p);
    const quotient = Array(Math.max(0, rem.length - div.length + 1)).fill(0);
    const divLeadInv = modInverse(div[div.length - 1], p);
    for (let offset = rem.length - div.length; offset >= 0; offset--) {
      const coeff = positiveMod(rem[div.length - 1 + offset] * divLeadInv, p);
      quotient[offset] = coeff;
      for (let j = 0; j < div.length; j++) {
        rem[j + offset] = positiveMod(rem[j + offset] - coeff * div[j], p);
      }
    }
    while (rem.length && rem[rem.length - 1] === 0) rem.pop();
    while (quotient.length && quotient[quotient.length - 1] === 0) quotient.pop();
    return { quotient: quotient.length ? quotient : [0], remainder: rem };
  }

  function modInverse(value, p) {
    const normalized = positiveMod(value, p);
    for (let candidate = 1; candidate < p; candidate++) {
      if ((normalized * candidate) % p === 1) return candidate;
    }
    return 1;
  }

  function bindCards() {
    if (window.CalculatorCards) {
      window.CalculatorCards.init({ side: '#cards' });
      return;
    }
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
