(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const LMFDB_SELECTORS = {
    extension: {
      query: 'lmfdb-query', search: 'lmfdb-search', status: 'lmfdb-search-status', editor: 'lmfdb-shortcut-editor',
      panel: 'lmfdb-shortcut-panel', close: 'lmfdb-shortcut-close', error: 'lmfdb-shortcut-error',
      shortcuts: {
        sqrt: { button: 'lmfdb-quadratic-shortcut', fields: 'lmfdb-square-fields', inputs: ['lmfdb-square-d'] },
        root: { button: 'lmfdb-root-shortcut', fields: 'lmfdb-root-fields', inputs: ['lmfdb-root-n', 'lmfdb-root-d'] },
        zeta: { button: 'lmfdb-zeta-shortcut', fields: 'lmfdb-zeta-fields', inputs: ['lmfdb-zeta-n'] }
      }
    },
    base: {
      query: 'base-lmfdb-query', search: 'base-lmfdb-search', status: 'base-lmfdb-status', editor: 'base-lmfdb-shortcut-editor',
      panel: 'base-lmfdb-shortcut-panel', close: 'base-lmfdb-shortcut-close', error: 'base-lmfdb-shortcut-error',
      shortcuts: {
        sqrt: { button: 'base-lmfdb-quadratic-shortcut', fields: 'base-lmfdb-square-fields', inputs: ['base-lmfdb-square-d'] },
        root: { button: 'base-lmfdb-root-shortcut', fields: 'base-lmfdb-root-fields', inputs: ['base-lmfdb-root-n', 'base-lmfdb-root-d'] },
        zeta: { button: 'base-lmfdb-zeta-shortcut', fields: 'base-lmfdb-zeta-fields', inputs: ['base-lmfdb-zeta-n'] }
      }
    }
  };
  let activeLmfdbShortcut = null;
  let localWorker = null;
  let localRequestId = 0;
  let localRequestReject = null;
  const state = {
    source: 'lmfdb',
    baseKind: 'Q',
    extensionKind: 'lmfdb',
    lmfdbQuery: '2.2.5.1',
    lmfdbField: null,
    lmfdbStatus: '',
    lmfdbStatusKind: '',
    lmfdbLoading: false,
    baseLmfdbQuery: '2.2.5.1',
    baseLmfdbField: null,
    baseLmfdbStatus: '',
    baseLmfdbStatusKind: '',
    baseLmfdbLoading: false,
    generic: {
      baseKind: 'Q', q: '3', generator: 'alpha', polynomial: 'x^2-2',
      response: null, status: '', statusKind: '', loading: false, extraPlaces: [], hiddenPlaces: []
    },
    primeBound: 11,
    functionDegreeBound: 2,
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
    inseparable: { fill: '#875b1d', stroke: '#684311', label: 'inseparable' },
    unresolved: { fill: '#7a6f65', stroke: '#5f564d', label: 'unresolved' },
    unknown: { fill: '#7a6f65', stroke: '#5f564d', label: 'unknown' }
  };

  const GREEK_GENERATORS = new Set([
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta',
    'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma',
    'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega'
  ]);

  function lmfdbProxyUrl() {
    return String(window.RAMIFICATION_LMFDB_PROXY_URL || '').trim().replace(/\/+$/, '');
  }

  function activeField() {
    if (state.source === 'generic') return normalizedGenericField();
    if (state.source === 'lmfdb') {
      if (state.lmfdbField) return state.lmfdbField;
      return { error: state.lmfdbLoading ? 'Loading LMFDB field...' : state.lmfdbStatus || 'Search for an LMFDB field.' };
    }
    return { error: 'Unsupported field source.' };
  }

  function normalizedGenericField() {
    const response = state.generic.response;
    if (!response) return { error: state.generic.status || 'Enter an irreducible monic polynomial and compute E/F locally in the browser.' };
    const extension = response.extension || {};
    const base = response.base || {};
    const places = Array.isArray(response.places)
      ? response.places.map(normalizeGenericPlace).filter((place) => !state.generic.hiddenPlaces.includes(place.key)) : [];
    return {
      source: 'generic', label: null, base, extension, degree: Number(extension.degree || 0),
      coeffs: [], polynomial: String(extension.polynomial || state.generic.polynomial),
      generator: String(extension.generator || state.generic.generator),
      signature: Array.isArray(extension.signature) ? `(${extension.signature.join(', ')})` : '',
      r1: Array.isArray(extension.signature) ? Number(extension.signature[0]) : 0,
      r2: Array.isArray(extension.signature) ? Number(extension.signature[1]) : 0,
      ramps: [], localAlgs: [], frobs: [], backendPlaces: places,
      separableDegree: Number(extension.separableDegree || extension.degree || 0),
      inseparableDegree: Number(extension.inseparableDegree || 1),
      flavor: String(extension.flavor || 'separable'), engine: response.engine || null,
      warnings: Array.isArray(response.warnings) ? response.warnings : []
    };
  }

  function normalizeGenericPlace(place, index) {
    const components = Array.isArray(place?.components) ? place.components.map((component, componentIndex) => ({
      label: String(component.label || `\\mathfrak{p}_{${componentIndex + 1}}`),
      e: component.e == null ? null : Number.isFinite(Number(component.e)) ? Number(component.e) : null,
      f: component.f == null ? null : Number.isFinite(Number(component.f)) ? Number(component.f) : null,
      source: String(component.source || place.source || 'browser local engine'),
      ramified: Number(component.e) > 1
    })) : [];
    const unresolved = place.status === 'unresolved';
    const inseparable = String(place.behavior || '') === 'inseparable' || state.generic.response?.extension?.flavor === 'purely inseparable';
    return {
      key: String(place.id || `generic:${index}`), scope: place.scope === 'infinite' ? 'infinite' : 'finite',
      label: String(place.label || '?'), base: `\\(${String(place.base || place.label || '?')}\\)`,
      kind: unresolved ? 'unresolved' : inseparable ? 'inseparable' : String(place.behavior || 'unknown'),
      e: commonComponentValue(components, 'e'), f: commonComponentValue(components, 'f'),
      g: unresolved ? null : Number(place.g ?? components.length), components: assignComponentLabels(components),
      ideals: components.map((component) => component.label), splittingType: String(place.splittingType || splittingTypeText(components)),
      detail: String(place.detail || ''), source: String(place.source || 'browser local engine'), placeType: String(place.placeType || ''),
      status: unresolved ? 'unresolved' : 'resolved', reasonCode: place.reasonCode || null, certificate: place.certificate || null
    };
  }

  function positiveMod(a, m) {
    return ((a % m) + m) % m;
  }

  function degreeBoundFromCardinality(qValue, cardinalityValue) {
    const q = Math.floor(Number(qValue));
    const cardinality = Math.floor(Number(cardinalityValue));
    if (!Number.isFinite(q) || q < 2 || !Number.isFinite(cardinality) || cardinality < q) return 1;
    let degree = 0;
    for (let size = q; size <= cardinality; size *= q) degree++;
    return Math.max(1, degree);
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

  function baseIdealLatex(p) {
    return `(${p})`;
  }

  function lmfdbFinitePlace(field, p) {
    const ramified = field.ramps.includes(p) || discriminantDivisibleBy(field, p);
    let components = [];
    let source = '';
    let detail = '';
    let status = 'resolved';
    let reasonCode = null;
    let certificate = null;
    let kind = '';

    if (ramified) {
      components = localAlgebraComponents(field, p);
      if (components.length && components.every((component) => component.e != null && component.f != null)) {
        source = 'LMFDB local_algs';
        detail = `LMFDB local algebra label${components.length === 1 ? '' : 's'}: ${components.map((item) => item.rawLabel).join(', ')}.`;
        certificate = 'LMFDB local algebra data';
      } else {
        status = 'unresolved';
        reasonCode = 'lmfdb-local-decomposition-unavailable';
        source = 'LMFDB ramification record';
        detail = `LMFDB certifies that \\(${p}\\) ramifies, but the local decomposition data are unavailable; no \\(e_i,f_i\\) are asserted.`;
        components = [{ e: null, f: null, source, ramified: false }];
        kind = 'unresolved';
      }
    } else {
      components = frobeniusComponents(field, p);
      if (components.length) {
        source = 'LMFDB frobs';
        detail = `LMFDB frobs gives splitting type \\(${splittingTypeText(components)}\\).`;
        certificate = 'LMFDB Frobenius data';
      } else {
        const factored = polynomialFactorComponents(field, p, false);
        if (factored) {
          components = factored;
          source = 'polynomial mod p';
          detail = `Computed by factoring the defining polynomial modulo \\(${p}\\).`;
          certificate = 'unramified Dedekind factorization';
        } else {
          status = 'unresolved';
          reasonCode = 'local-factorization-budget';
          source = 'browser factorization budget';
          detail = `The browser did not complete a certified factorization modulo \\(${p}\\); no local invariants are asserted.`;
          components = [{ e: null, f: null, source, ramified: false }];
          kind = 'unresolved';
        }
      }
    }

    if (!components.length) {
      components = [{ e: ramified ? null : 1, f: null, source, ramified }];
    }

    components = assignComponentLabels(components);
    kind ||= kindFromComponents(components, field.degree, ramified);
    return finitePlaceRecord({ p, kind, components, detail, source, status, reasonCode, certificate });
  }

  function finitePlaceRecord({ p, kind, components, detail, source, status, reasonCode, certificate }) {
    return {
      key: `p:${p}`,
      scope: 'finite',
      label: baseIdealLatex(p),
      base: `\\(${baseIdealLatex(p)}\\)`,
      kind,
      e: commonComponentValue(components, 'e'),
      f: commonComponentValue(components, 'f'),
      g: status === 'unresolved' ? null : components.length,
      components,
      ideals: components.map((component) => component.label),
      splittingType: splittingTypeText(components),
      detail,
      source,
      status: status || 'resolved',
      reasonCode: reasonCode || null,
      certificate: certificate || null
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
      scope: 'infinite',
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
      source: 'signature',
      status: 'resolved',
      reasonCode: null,
      certificate: 'LMFDB signature'
    };
  }

  function buildPlaces(field) {
    if (field.source === 'generic') return field.backendPlaces || [];
    const hiddenSet = new Set(state.hiddenPrimes);
    const primeSet = new Set(primesUpTo(state.primeBound).filter((p) => !hiddenSet.has(p)));
    field.ramps.forEach((p) => {
      if (!hiddenSet.has(p)) primeSet.add(p);
    });
    state.extraPrimes.forEach((p) => primeSet.add(p));
    const places = [...primeSet].sort((a, b) => a - b).map((p) => lmfdbFinitePlace(field, p));
    if (state.showInfinite) places.push(lmfdbInfinitePlace(field));
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
    if (!Array.isArray(field.coeffs) || field.coeffs.length < 2) return null;
    const degrees = factorDegreesModPrime(field.coeffs, p);
    if (!degrees) return null;
    return degrees.map((f) => ({
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

  function fieldLatex(field) {
    if (field.source === 'generic') return `F(${generatorLatex(field.generator)})`;
    if (field.label === '1.1.1.1') return '\\mathbb{Q}';
    return `K_{${field.label}}`;
  }

  function generatorLatex(value) {
    const source = String(value || 'alpha').trim() || 'alpha';
    if (GREEK_GENERATORS.has(source)) return `\\${source}`;
    const escaped = escapeHtml(source
      .replace(/\\/g, '')
      .replace(/[{}#$%&_]/g, '\\$&')
      .replace(/[\^~]/g, ''));
    return `\\mathrm{${escaped || 'alpha'}}`;
  }

  function polynomialLatex(field) {
    if (field.source === 'generic') return String(field.polynomial || '?').replace(/\*/g, '');
    return coeffsToPolynomialLatex(field.coeffs);
  }

  function render() {
    const field = activeField();
    if (field.error) {
      renderError(field.error);
      renderLmfdbStatus('extension');
      renderLmfdbStatus('base');
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
    const ramified = state.places.find((place) => place.kind === 'ramified' && place.scope === 'finite');
    if (field.source === 'lmfdb' && ramified) return ramified.key;
    return state.places[0]?.key || 'p:2';
  }

  function renderError(message) {
    syncInputControls();
    $('ramification-status').textContent = state.lmfdbLoading
      ? 'loading LMFDB...'
      : state.source === 'lmfdb' ? 'no field loaded' : 'invalid field';
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
    $('ramification-selected-label').textContent = 'selected place: none';
    $('ramification-count-label').textContent = 'finite places shown: 0';
    $('ramification-export-out').value = '';
  }

  function syncInputControls() {
    $('lmfdb-query').value = state.lmfdbQuery;
    $('base-lmfdb-query').value = state.baseLmfdbQuery;
    state.primeBound = Math.min(31, Math.max(2, Math.floor(Number(state.primeBound) || 11)));
    state.functionDegreeBound = Math.min(4, Math.max(1, Math.floor(Number(state.functionDegreeBound) || 2)));
    const isFunctionBase = state.baseKind === 'Fqt';
    const activeBound = isFunctionBase ? state.functionDegreeBound : state.primeBound;
    $('prime-bound').min = isFunctionBase ? '1' : '2';
    $('prime-bound').max = isFunctionBase ? '4' : '31';
    $('prime-bound').value = String(activeBound);
    $('prime-bound-output').textContent = String(activeBound);
    $('show-infinite').checked = state.showInfinite;
    $('base-field-kind').value = state.baseKind;
    $('extension-input-kind').value = state.extensionKind;
    $('generic-q').value = String(state.generic.q);
    $('generic-q-control').hidden = state.baseKind !== 'Fqt';
    $('base-lmfdb-selector').hidden = state.baseKind !== 'lmfdb';
    $('extension-lmfdb-selector').hidden = state.extensionKind !== 'lmfdb';
    $('polynomial-extension').hidden = state.extensionKind !== 'polynomial';
    $('prime-bound-control').hidden = false;
    const boundLabel = $('place-bound-label');
    boundLabel.innerHTML = isFunctionBase ? '\\(\\log_q |\\kappa(v_P)| \\le D\\)' : '\\(p \\le B\\)';
    typeset(boundLabel);
    const lmfdbOption = $('extension-input-kind').querySelector('option[value="lmfdb"]');
    if (lmfdbOption) lmfdbOption.disabled = state.baseKind !== 'Q';
    $('generic-generator').value = state.generic.generator;
    $('generic-polynomial').value = state.generic.polynomial;
    renderGenericStatus();
    renderLmfdbStatus('extension');
    renderLmfdbStatus('base');
  }

  function syncControls(field) {
    syncInputControls();
    $('ramification-status').innerHTML = `\\(${fieldLatex(field)}\\)`;
    typeset($('ramification-status'));
    const relation = $('ramification-relation-title');
    if (relation) relation.innerHTML = field.source === 'generic'
      ? `Places of \\(E=F(${generatorLatex(field.generator)})\\) above places of \\(${escapeHtml(field.base?.label || 'F')}\\)`
      : 'Places of \\(E\\) above places of \\(F=\\mathbb{Q}\\)';
    typeset(relation);
    if (field.source === 'generic') {
      const baseKind = field.base?.kind || state.baseKind;
      const isFunction = baseKind === 'Fqt';
      $('finite-places-label').innerHTML = isFunction ? 'Finite places \\(P(t)\\)' : 'Finite places';
      $('extra-prime-input').placeholder = isFunction ? 'monic irreducible P(t)' : 'prime p';
      const completeness = field.engine?.completeness ? `; ${escapeHtml(field.engine.completeness)} local result` : '';
      $('ramification-input-note').innerHTML = `\\(E=F(${generatorLatex(field.generator)})\\), ${escapeHtml(field.flavor)} extension of degree \\(${field.degree}\\)${completeness}.`;
      typeset($('finite-places-label'));
      typeset($('ramification-input-note'));
    } else {
      $('finite-places-label').textContent = 'Finite places';
      $('extra-prime-input').placeholder = 'prime p';
      const warningText = field.warnings.length ? `; ${field.warnings[0]}` : '';
      $('ramification-input-note').textContent = `E/Q from LMFDB label ${field.label}${warningText}`;
    }
    const finiteCount = state.places.filter((place) => place.scope === 'finite').length;
    $('ramification-count-label').textContent = `finite places of F shown: ${finiteCount}`;
    renderLmfdbStatus('extension');
    renderLmfdbStatus('base');
  }

  function selectorState(role) {
    return role === 'base'
      ? { status: state.baseLmfdbStatus, kind: state.baseLmfdbStatusKind, loading: state.baseLmfdbLoading }
      : { status: state.lmfdbStatus, kind: state.lmfdbStatusKind, loading: state.lmfdbLoading };
  }

  function renderLmfdbStatus(role) {
    const definition = LMFDB_SELECTORS[role];
    const current = selectorState(role);
    const status = $(definition.status);
    const searchButton = $(definition.search);
    const hasProxy = !!lmfdbProxyUrl();
    searchButton.disabled = !hasProxy || current.loading;
    status.classList.toggle('is-error', current.kind === 'error' || !hasProxy);
    status.classList.toggle('is-ok', current.kind === 'ok');
    if (!hasProxy) {
      status.textContent = 'LMFDB proxy URL is not configured.';
    } else if (current.loading) {
      status.textContent = 'Searching LMFDB...';
    } else {
      status.textContent = current.status || 'LMFDB proxy ready.';
    }
    renderLmfdbDescription(role);
  }

  function renderLmfdbDescription(role) {
    const target = $(role === 'base' ? 'base-lmfdb-description' : 'lmfdb-description');
    if (!target) return;
    const field = role === 'base' ? state.baseLmfdbField : state.lmfdbField;
    if (!field) {
      target.innerHTML = '';
      return;
    }
    const fieldSymbol = role === 'base' ? 'F' : 'E';
    const presentation = field.label === '1.1.1.1'
      ? `${fieldSymbol}=\\mathbb{Q}`
      : `${fieldSymbol}=\\mathbb{Q}(a),\\quad ${coeffsToPolynomialLatex(field.coeffs, 'a')}=0`;
    target.innerHTML = `LMFDB ${escapeHtml(field.label)}: \\(${escapeHtml(presentation)}\\)`;
    typeset(target);
  }

  function renderInvariants(field) {
    if (field.source === 'generic') {
      const relativeNumberField = field.base?.kind === 'lmfdb';
      const baseLabel = relativeNumberField
        ? '\\mathbb{Q}(a)'
        : field.base?.label || (field.base?.kind === 'Fqt' ? `\\mathbb{F}_{${field.base?.q}}(t)` : '\\mathbb{Q}');
      const rows = [
        ['Base field F', `\\(${baseLabel}\\)`],
        ['Extension E', `\\(E=F(${generatorLatex(field.generator)})\\)`],
        ['Defining polynomial', `\\(${polynomialLatex(field)}\\)`],
        ['Degree', `\\(${field.degree}\\)`],
        ['Extension flavor', field.flavor],
        ['Separable degree', `\\(${field.separableDegree}\\)`],
        ['Inseparable degree', `\\(${field.inseparableDegree}\\)`]
      ];
      if (relativeNumberField) {
        rows.splice(1, 0, ['Base LMFDB label', field.base.label || 'unknown']);
        if (Array.isArray(field.base.coeffs) && field.base.coeffs.length) {
          rows.splice(2, 0, ['Base defining relation', `\\(${coeffsToPolynomialLatex(field.base.coeffs, 'a')}=0\\)`]);
        }
      }
      if (field.engine) rows.push(['Local engine', `${field.engine.name || 'browser local'} ${field.engine.version || ''} (${field.engine.completeness || 'partial'})`]);
      if (field.base?.kind === 'Fqt') rows.splice(1, 0, ['Constant field', `\\(\\mathbb{F}_{${field.base.q}}\\)`]);
      if (field.signature) rows.push(['Signature', `\\(${field.signature}\\)`]);
      $('field-invariants').innerHTML = htmlRows(rows);
      typeset($('field-invariants'));
      return;
    }
    if (field.source === 'lmfdb') {
      const extensionFieldLatex = field.label === '1.1.1.1' ? '\\mathbb{Q}' : '\\mathbb{Q}(a)';
      const definingRelation = field.label === '1.1.1.1'
        ? 'n/a'
        : `\\(${coeffsToPolynomialLatex(field.coeffs, 'a')}=0\\)`;
      $('field-invariants').innerHTML = htmlRows([
        ['Base field F', `\\(\\mathbb{Q}\\)`],
        ['Extension field E', `\\(${extensionFieldLatex}\\)`],
        ['LMFDB label', field.label],
        ['Defining relation', definingRelation],
        ['\\(\\operatorname{Disc}(E)\\)', `\\(${field.discriminantText}\\)`],
        ['Signature', `\\(${field.signature}\\)`],
        ['Ramified finite primes', field.ramps.map((p) => `\\(${p}\\)`).join(', ') || 'none'],
        ['Degree', `\\(${field.degree}\\)`],
        ['Galois label', field.galoisLabel || 'n/a']
      ]);
      typeset($('field-invariants'));
    }
  }

  function renderDecompositionTable() {
    const finitePlaces = state.places.filter((place) => place.scope === 'finite');
    const target = $('decomposition-table');
    if (!target) return;
    if (!finitePlaces.length) {
      target.innerHTML = '<p class="hint">No finite places shown.</p>';
      return;
    }
    const hasUnresolved = finitePlaces.some((place) => place.status === 'unresolved');
    target.innerHTML = `
      <div class="ramification-scroll">
        <table class="ramification-table">
          <thead>
            <tr>
              <th>place of F</th>
              <th>behavior</th>
              <th>type</th>
              <th>g</th>
              <th class="left">(e_i,f_i)</th>
              <th class="left">source</th>
            </tr>
          </thead>
          <tbody>
            ${finitePlaces.map((place) => `
              <tr data-place-row="${escapeHtml(place.key)}"${place.status === 'unresolved' ? ` title="${escapeHtml(place.detail || 'This place is unresolved.')}"` : ''}>
                <td class="nowrap">\\(${escapeHtml(place.label)}\\)</td>
                <td>${escapeHtml(PLACE_STYLE[place.kind]?.label || place.kind)}</td>
                <td class="nowrap">\\(${escapeHtml(place.splittingType)}\\)</td>
                <td>${place.g == null ? '?' : place.g}</td>
                <td class="left nowrap">\\(${escapeHtml(componentEfText(place.components))}\\)</td>
                <td class="left">${escapeHtml(place.source || 'n/a')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${hasUnresolved ? '<p class="hint ramification-unresolved-note"><strong>?</strong> means unresolved: no upper-prime decomposition or local invariants are asserted. Select the place to see the reason.</p>' : ''}
    `;
    typeset(target);
  }

  function renderPlaceChips() {
    const chipList = $('place-chip-list');
    if (!chipList) return;
    const finitePlaces = state.places.filter((place) => place.scope === 'finite');
    chipList.innerHTML = finitePlaces.map((place) => {
      return `
        <span class="ramification-chip" data-place-key="${escapeHtml(place.key)}">
          <span>\\(${escapeHtml(place.label)}\\)</span>
          <button type="button" data-remove-place="${escapeHtml(place.key)}" aria-label="remove place ${escapeHtml(place.label)}">&times;</button>
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
      ['place of F', place.base],
      ['status', place.status || 'resolved'],
      ['behavior', PLACE_STYLE[place.kind]?.label || place.kind],
      ['splitting type', `\\(${place.splittingType}\\)`],
      ['\\(g\\)', `\\(${place.g == null ? '?' : place.g}\\)`],
      ['\\((e_i,f_i)\\)', `\\(${componentEfText(place.components)}\\)`],
      ['places of E above', `\\(${place.ideals.join(', ')}\\)`],
      ['source', place.source || 'n/a'],
      ['certificate', place.certificate || 'none'],
      ['reason', place.reasonCode || 'none'],
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
    ctx.setLineDash(place.kind === 'inert' || place.kind === 'unknown' || place.kind === 'unresolved' ? [7, 6] : []);

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
        title: place.status === 'unresolved' ? place.detail : '',
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
      `<span class="${label.className}" style="left:${label.x}px;top:${label.y}px;"${label.title ? ` title="${escapeHtml(label.title)}"` : ''}>\\(${escapeHtml(label.latex)}\\)</span>`
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
      id: place.key,
      scope: place.scope,
      place: place.label,
      status: place.status || 'resolved',
      reasonCode: place.reasonCode || null,
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
      detail: place.detail,
      certificate: place.certificate || null
    }));

    const base = field.source === 'generic'
      ? state.generic.response.base
      : { kind: 'Q', label: '\\mathbb{Q}' };
    const extension = field.source === 'generic'
      ? state.generic.response.extension
      : {
        kind: 'lmfdb', query: field.query, queryType: field.queryType, label: field.label, url: field.lmfdbUrl,
        fieldSnapshot: field.rawField,
        extraSnapshot: field.rawExtra
      };
    const payload = {
      calculator: 'Place ramification calculator',
      version: 3,
      source: 'field-extension',
      base,
      extension,
      engine: field.source === 'generic'
        ? state.generic.response.engine
        : { name: 'LMFDB proxy', version: field.proxyApiVersion || null, completeness: 'exact' },
      selection: {
        rationalPrimeBound: base.kind === 'Fqt' ? null : state.primeBound,
        functionPlaceDegreeBound: base.kind === 'Fqt' ? state.functionDegreeBound : null,
        includeInfinite: state.showInfinite,
        extraFinitePlaces: field.source === 'generic' ? state.generic.extraPlaces : state.extraPrimes.map(String),
        hiddenPlaces: field.source === 'generic' ? state.generic.hiddenPlaces : state.hiddenPrimes.map((p) => `p:${p}`)
      },
      places,
      response: field.source === 'generic' ? state.generic.response : null
    };
    $('ramification-export-out').value = JSON.stringify(payload, null, 2);
  }

  function buildProxyFieldUrl(proxy, query) {
    const clean = proxy.replace(/\/+$/, '');
    const endpoint = clean.endsWith('/field') ? clean : `${clean}/field`;
    const url = new URL(endpoint);
    url.searchParams.set('q', query);
    return url.toString();
  }

  function normalizeLmfdbPayload(payload, fallbackQuery) {
    const record = payload.field || null;
    if (!record || !record.label) throw new Error('LMFDB proxy response did not include a field record.');
    const coeffs = Array.isArray(record.coeffs) ? record.coeffs.map(Number) : [];
    const degree = Number(record.degree || Math.max(0, coeffs.length - 1));
    const r2 = Number(record.r2 || 0);
    const r1 = Math.max(0, degree - 2 * r2);
    const discAbsRaw = record.disc_abs ?? record.discriminant ?? null;
    const discAbsNumber = Number(discAbsRaw);
    const discSign = Number(record.disc_sign || 1) < 0 ? -1 : 1;
    const safeDisc = Number.isSafeInteger(discAbsNumber) ? discSign * discAbsNumber : null;
    const discriminantText = safeDisc == null
      ? discAbsRaw == null ? 'unknown' : `${discSign < 0 ? '-' : ''}${discAbsRaw}`
      : String(safeDisc);
    const ramps = Array.isArray(record.ramps)
      ? record.ramps.map(Number).filter((p) => Number.isFinite(p)).sort((a, b) => a - b)
      : [];
    return {
      source: 'lmfdb',
      label: String(record.label),
      lmfdbUrl: `https://www.lmfdb.org/NumberField/${encodeURIComponent(record.label)}`,
      query: payload.query || fallbackQuery || state.lmfdbQuery,
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
      proxyApiVersion: Number(payload.proxyApiVersion) || null,
      proxyCapabilities: Array.isArray(payload.capabilities) ? payload.capabilities.map(String) : [],
      warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      rawField: record,
      rawExtra: payload.extra || null
    };
  }

  function readShortcutInteger(id, label) {
    const input = $(id);
    const raw = String(input.value).trim();
    const value = Number(raw);
    if (!/^[+-]?\d+$/.test(raw) || !Number.isSafeInteger(value)) {
      throw shortcutValidationError(input, `${label} must be a safe integer.`);
    }
    input.setCustomValidity('');
    return value;
  }

  function shortcutValidationError(input, message) {
    input.setCustomValidity(message);
    input.reportValidity();
    input.focus();
    const error = new Error(message);
    error.shortcutValidation = true;
    return error;
  }

  function proxyLookupError(payload, response, query) {
    const message = payload.error || `LMFDB proxy returned HTTP ${response.status}.`;
    const needsNaturalNames = /^Q(?:root|zeta)\s*\(/i.test(query);
    const capabilities = Array.isArray(payload.capabilities) ? payload.capabilities : [];
    if (needsNaturalNames && !capabilities.includes('natural-name-resolver') && /monic integer polynomial/i.test(message)) {
      return 'The configured LMFDB proxy does not support this field-name syntax yet. Update the proxy or enter the canonical LMFDB label.';
    }
    return message;
  }

  async function lookupLmfdbSelector(role) {
    const definition = LMFDB_SELECTORS[role];
    const loadingKey = role === 'base' ? 'baseLmfdbLoading' : 'lmfdbLoading';
    const queryKey = role === 'base' ? 'baseLmfdbQuery' : 'lmfdbQuery';
    const fieldKey = role === 'base' ? 'baseLmfdbField' : 'lmfdbField';
    const statusKey = role === 'base' ? 'baseLmfdbStatus' : 'lmfdbStatus';
    const statusKindKey = role === 'base' ? 'baseLmfdbStatusKind' : 'lmfdbStatusKind';
    if (state[loadingKey]) return false;
    const proxy = lmfdbProxyUrl();
    const query = $(definition.query).value.trim();
    state[queryKey] = query;
    if (!proxy) {
      state[statusKey] = 'LMFDB proxy URL is not configured.';
      state[statusKindKey] = 'error';
      render();
      return false;
    }
    if (!query) {
      state[statusKey] = 'Enter an LMFDB label, natural name, or monic integer polynomial.';
      state[statusKindKey] = 'error';
      render();
      return false;
    }

    state[loadingKey] = true;
    state[statusKey] = '';
    state[statusKindKey] = '';
    render();
    let loaded = false;
    try {
      const response = await fetch(buildProxyFieldUrl(proxy, query), { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(proxyLookupError(payload, response, query));
      const field = normalizeLmfdbPayload(payload, query);
      state[fieldKey] = field;
      loaded = true;
      state[statusKey] = payload.warnings?.length ? `Loaded ${field.label}; ${payload.warnings[0]}` : `Loaded ${field.label}.`;
      state[statusKindKey] = 'ok';
      if (role === 'extension') {
        state.source = 'lmfdb';
        state.baseKind = 'Q';
        state.generic.baseKind = 'Q';
        state.extensionKind = 'lmfdb';
        state.hiddenPrimes = [];
        state.selectedKey = `p:${field.ramps[0] || primesUpTo(state.primeBound)[0] || 2}`;
      }
    } catch (error) {
      state[statusKey] = error.message || 'LMFDB search failed.';
      state[statusKindKey] = 'error';
    } finally {
      state[loadingKey] = false;
      render();
    }
    return loaded;
  }

  function openSelectorShortcut(role, mode) {
    const selector = LMFDB_SELECTORS[role];
    const definition = selector.shortcuts[mode];
    if (!definition) return;
    if (activeLmfdbShortcut?.role === role && activeLmfdbShortcut?.mode === mode && !$(selector.panel).hidden) {
      closeSelectorShortcut(true);
      return;
    }
    if (activeLmfdbShortcut) closeSelectorShortcut(false);
    activeLmfdbShortcut = { role, mode };
    $(selector.panel).hidden = false;
    $(selector.error).textContent = '';
    Object.entries(selector.shortcuts).forEach(([key, item]) => {
      $(item.button).setAttribute('aria-expanded', String(key === mode));
      $(item.fields).hidden = key !== mode;
      item.inputs.forEach((id) => $(id).setCustomValidity(''));
    });
    const input = $(definition.inputs[0]);
    input.focus();
    input.select();
    typeset($(selector.panel));
  }

  function closeSelectorShortcut(returnFocus) {
    if (!activeLmfdbShortcut) return;
    const current = activeLmfdbShortcut;
    const selector = LMFDB_SELECTORS[current.role];
    activeLmfdbShortcut = null;
    $(selector.panel).hidden = true;
    Object.values(selector.shortcuts).forEach((item) => $(item.button).setAttribute('aria-expanded', 'false'));
    $(selector.error).textContent = '';
    if (returnFocus) $(selector.shortcuts[current.mode].button).focus();
  }

  function insertSelectorShortcut() {
    if (!activeLmfdbShortcut) return;
    const { role, mode } = activeLmfdbShortcut;
    const selector = LMFDB_SELECTORS[role];
    const inputs = selector.shortcuts[mode].inputs;
    let alias = '';
    try {
      if (mode === 'sqrt') {
        const d = readShortcutInteger(inputs[0], 'd');
        if (d === 0) throw shortcutValidationError($(inputs[0]), 'd must be nonzero.');
        alias = `Qsqrt(${d})`;
      } else if (mode === 'root') {
        const n = readShortcutInteger(inputs[0], 'n');
        const d = readShortcutInteger(inputs[1], 'd');
        if (n < 2) throw shortcutValidationError($(inputs[0]), 'n must be at least 2.');
        if (d === 0) throw shortcutValidationError($(inputs[1]), 'd must be nonzero.');
        alias = `Qroot(${n},${d})`;
      } else {
        const n = readShortcutInteger(inputs[0], 'n');
        if (n < 3) throw shortcutValidationError($(inputs[0]), 'n must be at least 3.');
        alias = `Qzeta(${n})`;
      }
    } catch (error) {
      if (!error.shortcutValidation) throw error;
      $(selector.error).textContent = error.message;
      return;
    }
    const query = $(selector.query);
    query.value = alias;
    if (role === 'base') state.baseLmfdbQuery = alias;
    else state.lmfdbQuery = alias;
    closeSelectorShortcut(false);
    query.focus();
    query.setSelectionRange(alias.length, alias.length);
  }

  function bindLmfdbSelector(role) {
    const selector = LMFDB_SELECTORS[role];
    $(selector.query).addEventListener('input', (event) => {
      if (role === 'base') state.baseLmfdbQuery = event.target.value;
      else state.lmfdbQuery = event.target.value;
    });
    $(selector.query).addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      lookupLmfdbSelector(role);
    });
    $(selector.search).addEventListener('click', () => lookupLmfdbSelector(role));
    Object.entries(selector.shortcuts).forEach(([mode, definition]) => {
      $(definition.button).addEventListener('click', () => openSelectorShortcut(role, mode));
    });
    $(selector.panel).addEventListener('submit', (event) => {
      event.preventDefault();
      insertSelectorShortcut();
    });
    $(selector.panel).addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelectorShortcut(true);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        insertSelectorShortcut();
      }
    });
    $(selector.close).addEventListener('click', () => closeSelectorShortcut(true));
  }

  function bindInputs() {
    $('base-field-kind').addEventListener('change', (event) => {
      state.baseKind = event.target.value;
      state.generic.baseKind = state.baseKind;
      if (state.baseKind !== 'Q') state.extensionKind = 'polynomial';
      if (state.baseKind === 'Fqt' && state.generic.polynomial === 'x^2-2') state.generic.polynomial = 'x^2-t';
      if (state.baseKind === 'lmfdb' && ['x^2-2', 'x^2-t'].includes(state.generic.polynomial)) state.generic.polynomial = 'x^2-a';
      syncInputControls();
      if (state.baseKind === 'lmfdb' && !state.baseLmfdbField) lookupLmfdbSelector('base');
    });
    $('extension-input-kind').addEventListener('change', (event) => {
      state.extensionKind = state.baseKind === 'Q' ? event.target.value : 'polynomial';
      syncInputControls();
      if (state.extensionKind === 'lmfdb' && !state.lmfdbField) lookupLmfdbSelector('extension');
    });
    $('generic-q').addEventListener('input', (event) => { state.generic.q = event.target.value.trim(); });
    $('generic-generator').addEventListener('input', (event) => { state.generic.generator = event.target.value; });
    $('generic-polynomial').addEventListener('input', (event) => { state.generic.polynomial = event.target.value; });
    $('generic-compute').addEventListener('click', computeGenericExtension);
    $('extension-update').addEventListener('click', updateExtensionFromCard);
    document.querySelectorAll('[data-generic-example]').forEach((button) => {
      button.addEventListener('click', () => {
        const example = button.dataset.genericExample;
        if (example !== 'number') state.baseKind = example === 'function' ? 'Fqt' : 'lmfdb';
        state.generic.baseKind = state.baseKind;
        state.extensionKind = 'polynomial';
        state.generic.polynomial = example === 'function' ? 'x^2-t' : example === 'relative' ? 'x^2-a' : 'x^3-x-1';
        syncInputControls();
        if (state.baseKind === 'lmfdb' && !state.baseLmfdbField) lookupLmfdbSelector('base');
      });
    });
    bindLmfdbSelector('base');
    bindLmfdbSelector('extension');
    document.addEventListener('click', (event) => {
      if (!activeLmfdbShortcut) return;
      const selector = LMFDB_SELECTORS[activeLmfdbShortcut.role];
      if (!$(selector.editor).contains(event.target)) closeSelectorShortcut(false);
    });
    $('prime-bound').addEventListener('input', (event) => {
      if (state.baseKind === 'Fqt') {
        state.functionDegreeBound = Math.min(4, Math.max(1, Math.floor(Number(event.target.value) || 2)));
      } else {
        state.primeBound = Math.min(31, Math.max(2, Math.floor(Number(event.target.value) || 11)));
        state.hiddenPrimes = state.hiddenPrimes.filter((p) => p <= state.primeBound);
      }
      if (state.source === 'generic' && state.generic.response) {
        computeGenericExtension();
        return;
      }
      render();
    });
    $('add-extra-prime').addEventListener('click', addExtraPrimeFromInput);
    $('extra-prime-input').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addExtraPrimeFromInput();
    });
    $('place-chip-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-place]');
      if (!button) return;
      const key = button.dataset.removePlace;
      if (state.source === 'generic') {
        const place = state.places.find((item) => item.key === key);
        const value = String(place?.label || '').replace(/^\(|\)$/g, '');
        state.generic.extraPlaces = state.generic.extraPlaces.filter((item) => item !== value);
        if (!state.generic.hiddenPlaces.includes(key)) state.generic.hiddenPlaces.push(key);
        const fallback = state.places.find((item) => item.key !== key && item.scope === 'finite') || state.places.find((item) => item.key !== key);
        state.selectedKey = fallback?.key || 'inf';
        render();
        return;
      }
      const p = Number(key.slice(2));
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
      if (state.source === 'generic' && state.generic.response) {
        computeGenericExtension();
        return;
      }
      render();
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
    if (state.extensionKind === 'polynomial') {
      const value = input.value.trim();
      if (!value) return;
      if (state.baseKind !== 'Fqt' && !isPrime(Number(value))) {
        input.setCustomValidity('Enter a rational prime.');
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      if (!state.generic.extraPlaces.includes(value)) state.generic.extraPlaces.push(value);
      state.generic.hiddenPlaces = [];
      input.value = '';
      computeGenericExtension();
      return;
    }
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

  function localEngineRequest() {
    let base;
    if (state.baseKind === 'Q') {
      base = { kind: 'Q' };
    } else if (state.baseKind === 'lmfdb') {
      const field = state.baseLmfdbField;
      if (!field) throw new Error('Load the LMFDB base field F before computing E/F.');
      base = {
        kind: 'lmfdb', query: field.query, label: field.label, coeffs: field.coeffs,
        zk: Array.isArray(field.rawExtra?.zk) ? field.rawExtra.zk : [],
        fieldSnapshot: field.rawField,
        extraSnapshot: field.rawExtra,
        proxyApiVersion: field.proxyApiVersion,
        proxyCapabilities: field.proxyCapabilities
      };
    } else {
      base = { kind: 'Fqt', q: String(state.generic.q).trim() };
    }
    const extraValues = state.generic.extraPlaces.slice();
    return {
      schemaVersion: 1,
      base,
      extension: { kind: 'polynomial', generator: state.generic.generator, polynomial: state.generic.polynomial },
      selection: {
        bound: state.baseKind === 'Fqt' ? null : state.primeBound,
        functionPlaceDegreeBound: state.baseKind === 'Fqt' ? state.functionDegreeBound : null,
        extraRationalPrimes: state.baseKind === 'Fqt' ? [] : extraValues.map(Number),
        functionPlaces: state.baseKind === 'Fqt' ? extraValues : [],
        includeInfinite: state.showInfinite
      },
      limits: { operationBudget: 300000, timeoutMs: 4500 }
    };
  }

  function cancelLocalComputation(reason) {
    if (localWorker) localWorker.terminate();
    localWorker = null;
    if (localRequestReject) {
      const error = new Error(reason || 'Local computation cancelled.');
      error.code = 'cancelled';
      localRequestReject(error);
    }
    localRequestReject = null;
  }

  function runLocalEngine(request) {
    const runWithoutWorker = () => {
      if (!window.RamificationLocalEngine) return Promise.reject(new Error('The browser-local arithmetic engine is unavailable.'));
      return Promise.resolve().then(() => window.RamificationLocalEngine.compute(request));
    };
    if (typeof window.Worker !== 'function') return runWithoutWorker();
    cancelLocalComputation('Replaced by a newer local computation.');
    const requestId = ++localRequestId;
    try {
      localWorker = new window.Worker('js/place_ramification_worker.js?v=20260830-2');
    } catch (_) {
      localWorker = null;
      return runWithoutWorker();
    }
    return new Promise((resolve, reject) => {
      localRequestReject = reject;
      localWorker.addEventListener('message', (event) => {
        const message = event.data || {};
        if (message.requestId !== requestId) return;
        localRequestReject = null;
        localWorker.terminate();
        localWorker = null;
        if (message.type === 'result') resolve(message.result);
        else {
          const error = new Error(message.error?.message || 'The local ramification computation failed.');
          error.code = message.error?.code || 'local-engine-error';
          reject(error);
        }
      });
      localWorker.addEventListener('error', () => {
        localRequestReject = null;
        localWorker?.terminate();
        localWorker = null;
        reject(new Error('The browser-local arithmetic worker stopped unexpectedly.'));
      });
      localWorker.postMessage({ type: 'compute', requestId, request });
    });
  }

  async function computeGenericExtension() {
    if (state.generic.loading) {
      cancelLocalComputation('Local computation cancelled.');
      state.generic.loading = false;
      state.generic.status = 'Local computation cancelled.';
      state.generic.statusKind = '';
      render();
      return;
    }
    state.extensionKind = 'polynomial';
    state.generic.baseKind = state.baseKind;
    state.generic.q = $('generic-q').value.trim();
    state.generic.generator = $('generic-generator').value.trim() || 'alpha';
    state.generic.polynomial = $('generic-polynomial').value.trim();
    state.generic.loading = true;
    state.generic.status = 'Computing E/F in this browser...';
    state.generic.statusKind = '';
    render();
    try {
      const payload = await runLocalEngine(localEngineRequest());
      state.source = 'generic';
      state.generic.response = payload;
      const unresolved = payload.places.filter((place) => place.status === 'unresolved').length;
      state.generic.status = unresolved
        ? `Computed locally; ${unresolved} place${unresolved === 1 ? ' is' : 's are'} explicitly unresolved.`
        : 'Computed locally with certificates at every displayed place.';
      state.generic.statusKind = unresolved ? '' : 'ok';
      state.selectedKey = normalizedGenericField().backendPlaces.find((place) => place.scope === 'finite')?.key || 'inf';
    } catch (error) {
      if (error.code !== 'cancelled') {
        state.generic.status = error.message || 'The browser-local computation failed.';
        state.generic.statusKind = 'error';
      }
    } finally {
      state.generic.loading = false;
      render();
    }
  }

  async function updateExtensionFromCard() {
    if (state.extensionKind === 'lmfdb') {
      await lookupLmfdbSelector('extension');
      return;
    }
    if (state.baseKind === 'lmfdb') {
      const query = $('base-lmfdb-query').value.trim();
      if (!state.baseLmfdbField || query !== state.baseLmfdbField.query) {
        const loaded = await lookupLmfdbSelector('base');
        if (!loaded) return;
      }
    }
    await computeGenericExtension();
  }

  function renderGenericStatus() {
    const status = $('generic-status');
    const button = $('generic-compute');
    if (!status || !button) return;
    button.disabled = false;
    button.textContent = state.generic.loading ? 'cancel' : 'compute';
    const updateButton = $('extension-update');
    const updateLoading = state.extensionKind === 'lmfdb'
      ? state.lmfdbLoading
      : state.generic.loading || (state.baseKind === 'lmfdb' && state.baseLmfdbLoading);
    updateButton.disabled = updateLoading;
    updateButton.textContent = updateLoading ? 'updating...' : 'update';
    status.classList.toggle('is-error', state.generic.statusKind === 'error');
    status.classList.toggle('is-ok', state.generic.statusKind === 'ok');
    status.textContent = state.generic.status || 'Runs locally; unsupported local cases are marked unresolved.';
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

  function coeffsToPolynomialLatex(coeffs, variable = 'x') {
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
        body = `${coeffText}${variable}${degree === 1 ? '' : `^{${degree}}`}`;
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
      let skippedSearch = false;
      for (let trialDegree = 2; trialDegree <= Math.floor(degree / 2) && !found; trialDegree++) {
        const attempts = Math.pow(p, trialDegree);
        if (attempts > 70000) {
          skippedSearch = true;
          continue;
        }
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
        if (skippedSearch) return null;
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

  function importedLmfdbField(definition) {
    const input = definition || {};
    const fieldSnapshot = input.fieldSnapshot || null;
    if (!fieldSnapshot || !Array.isArray(fieldSnapshot.coeffs)) {
      throw new Error('The LMFDB field definition has no resolved field snapshot.');
    }
    const query = String(input.query || input.label || fieldSnapshot.label || '');
    return normalizeLmfdbPayload({
      proxyApiVersion: input.proxyApiVersion,
      capabilities: input.proxyCapabilities,
      query,
      queryType: input.queryType || 'import',
      field: fieldSnapshot,
      extra: input.extraSnapshot || null,
      warnings: []
    }, query);
  }

  function legacyLmfdbDefinition(data) {
    const field = data.field || {};
    const discriminant = Number(field.discriminant);
    const signatureMatch = String(field.signature || '').match(/(-?\d+)\D+(-?\d+)/);
    const r2 = signatureMatch ? Number(signatureMatch[2]) : 0;
    const label = String(data.lmfdbLabel || data.query || 'imported field');
    return {
      kind: 'lmfdb',
      query: String(data.query || label),
      queryType: String(data.queryType || 'import'),
      label,
      fieldSnapshot: {
        label,
        degree: Number(field.degree) || Math.max(1, field.coeffs.length - 1),
        coeffs: field.coeffs,
        disc_abs: Number.isFinite(discriminant) ? Math.abs(discriminant) : field.discriminant,
        disc_sign: Number.isFinite(discriminant) && discriminant < 0 ? -1 : 1,
        r2,
        ramps: Array.isArray(field.ramifiedPrimes) ? field.ramifiedPrimes : [],
        local_algs: Array.isArray(data.raw?.local_algs) ? data.raw.local_algs : [],
        galois_label: field.galoisLabel || ''
      },
      extraSnapshot: { label, frobs: Array.isArray(data.raw?.frobs) ? data.raw.frobs : [] }
    };
  }

  function normalizedImportedLocalResponse(response) {
    const snapshot = response && typeof response === 'object' ? response : {};
    const places = Array.isArray(snapshot.places) ? snapshot.places.map((place) => {
      const components = Array.isArray(place?.components) ? place.components : [];
      const incomplete = place?.status === 'unresolved'
        || !components.length
        || components.some((component) => component.e == null || component.f == null);
      if (!incomplete) return { ...place, status: 'resolved', reasonCode: place.reasonCode || null };
      return {
        ...place,
        status: 'unresolved',
        behavior: 'unresolved',
        g: null,
        splittingType: '?',
        reasonCode: place.reasonCode || 'imported-unverified-place',
        certificate: null,
        components: components.length
          ? components.map((component) => ({ ...component, e: null, f: null }))
          : [{ label: '?', e: null, f: null, source: 'imported-unverified-place' }]
      };
    }) : [];
    const unresolvedCount = places.filter((place) => place.status === 'unresolved').length;
    return {
      ...snapshot,
      engine: snapshot.engine || {
        name: 'imported legacy snapshot',
        version: null,
        arithmetic: 'imported',
        completeness: unresolvedCount ? 'partial' : 'exact'
      },
      places
    };
  }

  window.SiteImportExportPageAdapter = {
    exportDefault() {
      const field = activeField();
      if (field.error) throw new Error(field.error);
      renderExport(field);
      return { text: $('ramification-export-out').value, filename: 'place-ramification-state.json', mimeType: 'application/json' };
    },
    validateImport(_kind, raw) {
      const text = String(raw?.text || '').trim();
      if (!text) throw new Error('Paste a place ramification export.');
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('This is not a place ramification export.');
      if (data.calculator && data.calculator !== 'Place ramification calculator') throw new Error('This is not a place ramification export.');
      const rawSource = String(data.source || '').toLowerCase();
      if (rawSource === 'quadratic') throw new Error('Offline quadratic exports are no longer supported. Search for the field with QsqrtN instead.');
      if (rawSource === 'lmfdb') {
        if (!data.field || !Array.isArray(data.field.coeffs)) throw new Error('The LMFDB export has no field snapshot.');
        return { data, source: 'lmfdb', extension: legacyLmfdbDefinition(data) };
      }
      if (rawSource === 'polynomial-extension') {
        if (!data.base || !data.extension || !data.response) throw new Error('The polynomial-extension export has no response snapshot.');
        return { data, source: 'generic', base: data.base, extension: data.extension };
      }
      if (rawSource !== 'field-extension') throw new Error('Unsupported place ramification export source.');
      if (Number(data.version) !== 3) throw new Error('Unsupported field-extension export version.');
      const base = data.base || {};
      const extension = data.extension || {};
      if (!['Q', 'lmfdb', 'Fqt'].includes(base.kind)) throw new Error('The field-extension export has an unsupported base field.');
      if (extension.kind === 'lmfdb') {
        if (base.kind !== 'Q') throw new Error('An LMFDB extension snapshot is only valid over Q.');
        importedLmfdbField(extension);
        return { data, source: 'lmfdb', base, extension };
      }
      if (extension.kind !== 'polynomial' || !data.response) {
        throw new Error('The field-extension export has no local polynomial response snapshot.');
      }
      if (base.kind === 'lmfdb') importedLmfdbField(base);
      return { data, source: 'generic', base, extension };
    },
    applyImport(_kind, prepared) {
      const data = prepared.data;
      const selection = data.selection || {};
      const rationalBound = selection.rationalPrimeBound ?? selection.bound ?? data.primeBound ?? 11;
      const functionDegreeBound = selection.functionPlaceDegreeBound
        ?? (selection.residueCardinalityBound == null
          ? 2
          : degreeBoundFromCardinality(prepared.base?.q || 3, selection.residueCardinalityBound));
      state.primeBound = Math.max(2, Math.min(31, Math.floor(Number(rationalBound) || 11)));
      state.functionDegreeBound = Math.max(1, Math.min(4, Math.floor(Number(functionDegreeBound) || 2)));
      state.showInfinite = data.selection?.includeInfinite ?? data.showInfinite !== false;
      state.extraPrimes = [];
      state.hiddenPrimes = [];
      state.generic.loading = false;
      state.lmfdbLoading = false;
      state.baseLmfdbLoading = false;
      if (prepared.source === 'generic') {
        state.source = 'generic';
        state.baseKind = String(prepared.base.kind || 'Q');
        state.extensionKind = 'polynomial';
        state.generic.baseKind = state.baseKind;
        state.generic.q = String(prepared.base.q || 3);
        state.generic.generator = String(prepared.extension.generator || 'alpha');
        state.generic.polynomial = String(prepared.extension.polynomial || '');
        state.generic.extraPlaces = Array.isArray(selection.extraFinitePlaces) ? selection.extraFinitePlaces.map(String) : [];
        state.generic.hiddenPlaces = Array.isArray(selection.hiddenPlaces) ? selection.hiddenPlaces.map(String) : [];
        state.generic.response = normalizedImportedLocalResponse(data.response);
        state.generic.status = 'Loaded exported local-computation snapshot.';
        state.generic.statusKind = 'ok';
        if (state.baseKind === 'lmfdb') {
          state.baseLmfdbField = importedLmfdbField(prepared.base);
          state.baseLmfdbQuery = state.baseLmfdbField.query;
          state.baseLmfdbStatus = `Loaded ${state.baseLmfdbField.label} from the export.`;
          state.baseLmfdbStatusKind = 'ok';
        }
      } else {
        state.source = 'lmfdb';
        state.baseKind = 'Q';
        state.extensionKind = 'lmfdb';
        state.generic.baseKind = 'Q';
        state.lmfdbField = importedLmfdbField(prepared.extension);
        state.lmfdbQuery = state.lmfdbField.query;
        state.lmfdbStatus = `Loaded ${state.lmfdbField.label} from the export.`;
        state.lmfdbStatusKind = 'ok';
        state.extraPrimes = Array.isArray(selection.extraFinitePlaces)
          ? selection.extraFinitePlaces.map(Number).filter(isPrime) : [];
        state.hiddenPrimes = Array.isArray(selection.hiddenPlaces)
          ? selection.hiddenPlaces.map((key) => Number(String(key).replace(/^p:/, ''))).filter(isPrime) : [];
      }
      const imported = activeField();
      state.places = imported.error ? [] : buildPlaces(imported);
      state.selectedKey = state.places.find((place) => place.scope === 'finite')?.key || state.places[0]?.key || 'p:2';
      render();
    },
    hasMeaningfulState() {
      return state.source !== 'lmfdb' || state.baseKind !== 'Q' || state.extensionKind !== 'lmfdb'
        || state.lmfdbQuery !== '2.2.5.1' || state.primeBound !== 11
        || state.functionDegreeBound !== 2
        || state.showInfinite !== true || state.extraPrimes.length > 0 || state.hiddenPrimes.length > 0;
    },
    filename() { return 'place-ramification-state.json'; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindInputs();
    bindCards();
    lookupLmfdbSelector('extension');
  });
})();
