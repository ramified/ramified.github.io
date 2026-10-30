(function (root) {
  'use strict';
  const keyOf = asset => asset.kind + ':' + asset.id;
  const rings = root.MathWorkspaceRings || (typeof require === 'function' ? require('./math_workspace_rings.js') : null);
  let kernel;
  function normalize(source = {}) {
    const value = String(source.value ?? '0').trim();
    const hasValue = source.hasValue === true;
    if (hasValue && !value) throw new Error('Enter a complete number.');
    return { field: String(source.field || ''), hasValue, value,
      replaceWithValue: hasValue && source.replaceWithValue !== false, positive: source.positive !== false };
  }
  function evaluate(asset, assets) {
    const field = assets.find(item => keyOf(item) === asset.data.field && item.kind === 'field');
    if (!rings.isRing(field)) throw new Error('Choose an existing coefficient Ring for this Number.');
    if (!asset.data.hasValue) return { field, text: asset.name, latex: asset.name, integer: null };
    if (['function-field','finite-extension'].includes(field.data.dataType)) throw new Error('Valued Number arithmetic over this field is not yet supported. A symbolic Number can retain the field reference.');
    if (!kernel) throw new Error('Number mathematics is not ready.');
    return { field, ...kernel(asset.data.value, field.data) };
  }
  function references(kind, type) {
    if (kind === 'number') return [{ field: 'field', label: 'Coefficient ring', expectedKind: 'field' }];
    if (kind === 'variety' && ['curve', 'symmetric-product-curve'].includes(type)) return [{ field: 'genus', legacyField: 'genusNumber', label: 'Genus', expectedKind: 'number', scalar: true, min: 0, defaultValue: '2' }];
    if (kind === 'sheaf' && ['abstract', 'locally-free'].includes(type)) return [{ field: 'rank', legacyField: 'rankNumber', label: 'Rank', expectedKind: 'number', scalar: true, min: 0, defaultValue: '1' }];
    return [];
  }
  function input(data, spec) {
    const value = data[spec.field];
    if (value && typeof value === 'object') {
      if (['literal','expression'].includes(value.kind) && ['string', 'number'].includes(typeof value.value)) return { kind: value.kind, value: String(value.value) };
      if (value.kind === 'reference' && typeof value.ref === 'string') return { kind: 'reference', ref: value.ref };
      throw new Error(spec.label + ' must have one value or asset reference.');
    }
    // Migrate the old pair once. A reference was authoritative in that format.
    return data[spec.legacyField] ? { kind: 'reference', ref: String(data[spec.legacyField]) }
      : { kind: 'literal', value: String(value ?? spec.defaultValue) };
  }
  function referenceKey(data, spec) {
    if (!spec.scalar) return data[spec.field] || '';
    const parameter = input(data, spec);
    return parameter.kind === 'reference' ? parameter.ref : '';
  }
  function normalizeInput(parameter, spec) {
    if(parameter.kind==='expression'){
      const value=String(parameter.value).trim();let depth=0;
      for(const c of value){if('({['.includes(c))depth++;if(')}]'.includes(c))depth--;if(depth<0)throw new Error('Incomplete '+spec.label+' expression.');}
      if(!value||depth||/[+*/^=-]$/.test(value)||!/[A-Za-z0-9]/.test(value))throw new Error('Enter a complete '+spec.label+' expression.');
      return {kind:'expression',value};
    }
    if (parameter.kind === 'reference') {
      if (!parameter.ref.startsWith('number:') || !parameter.ref.slice(7)) throw new Error('Choose a Number asset for ' + spec.label + '.');
      return parameter;
    }
    const raw = parameter.value.trim();
    if (!/^[+-]?\d+$/.test(raw) || BigInt(raw) < BigInt(spec.min)) throw new Error(spec.label + ' must be a complete integer at least ' + spec.min + '.');
    return { kind: 'literal', value: BigInt(raw).toString() };
  }
  function migrateInputs(kind, type, source) {
    const data = { ...source };
    for (const spec of references(kind, type).filter(spec => spec.scalar)) {
      data[spec.field] = input(data, spec);
      delete data[spec.legacyField];
    }
    return data;
  }
  function normalizeInputs(kind, type, source) {
    const data = migrateInputs(kind, type, source);
    for (const spec of references(kind, type).filter(spec => spec.scalar)) data[spec.field] = normalizeInput(data[spec.field], spec);
    return data;
  }
  function literalValue(asset, spec, assets) {
    const parameter = input(asset.data, spec);
    if (['literal','expression'].includes(parameter.kind)) return parameter.value;
    const number = assets.find(item => keyOf(item) === parameter.ref && item.kind === 'number');
    if (!number?.data.hasValue) return '';
    try {
      scalar(asset, spec, assets);
      return evaluate(number, assets).integer;
    } catch (_) { return ''; } // An invalid reference can always be replaced with a fresh literal draft.
  }
  function scalar(asset, spec, assets) {
    const parameter = normalizeInput(input(asset.data, spec), spec);
    if (['literal','expression'].includes(parameter.kind)) return parameter.value;
    const key = parameter.ref;
    const number = assets.find(item => keyOf(item) === key && item.kind === 'number');
    if (!number) throw new Error(spec.label + ' must reference an existing Number.');
    const result = evaluate(number, assets);
    if (['finite-field','finite-extension','function-field'].includes(result.field.data.dataType)) throw new Error(spec.label + ' requires a supported characteristic-zero coefficient ring.');
    if (number.data.hasValue && (result.integer == null || BigInt(result.integer) < BigInt(spec.min))) throw new Error(spec.label + ' must be an integer at least ' + spec.min + '.');
    return number.data.hasValue && number.data.replaceWithValue ? result.integer : symbol(number);
  }
  // Stable internal symbols decouple a reference from editable mathematical names.
  function symbol(asset) {
    let hash=14695981039346656037n;
    for(const char of asset.id)hash=BigInt.asUintN(64,(hash^BigInt(char.codePointAt(0)))*1099511628211n);
    return 'w'+hash.toString(36);
  }
  function validateGraph(assets) {
    rings.validateGraph(assets);
    for (const asset of assets) {
      if (asset.kind === 'number') evaluate(asset, assets);
      for (const spec of references(asset.kind, asset.type)) if (spec.scalar) scalar(asset, spec, assets);
    }
  }
  function project(asset, assets) {
    const specs = references(asset.kind, asset.type).filter(spec => spec.scalar);
    if (!specs.length) return asset;
    const data = { ...asset.data };
    for (const spec of specs) data[spec.field] = scalar(asset, spec, assets);
    return { ...asset, data };
  }
  const api = { normalize, evaluate, references, input, referenceKey, normalizeInput, migrateInputs, normalizeInputs, literalValue, scalar, symbol, project, validateGraph, isReady() { return typeof kernel === 'function'; }, setKernel(value) { kernel = value; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceNumbers = api;
})(typeof window !== 'undefined' ? window : globalThis);
