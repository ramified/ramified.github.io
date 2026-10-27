(function(root){
  'use strict';
  // `field` remains the historical storage kind and reference prefix. Both
  // fields and the integer ring use this single coefficient-ring asset model.
  const fieldTypes = new Set(['complex','real','rational','finite-field','finite-extension','rational-function','function-field','number-field']);
  const isRing = asset => asset?.kind === 'field' && (asset.data?.dataType === 'integer' || fieldTypes.has(asset.data?.dataType));
  const isField = asset => isRing(asset) && fieldTypes.has(asset.data.dataType);
  const classification = data => data.dataType === 'integer' ? 'Integral domain · not a field' : fieldTypes.has(data.dataType) ? 'Field' : 'Unsupported coefficient ring';
  function issues(asset, assets) {
    const data = asset.data, get = ref => assets.find(item => item.kind + ':' + item.id === ref);
    if (asset.kind === 'field' && data.dataType === 'function-field' && !isField(get(data.constantField))) return ['Choose a field as the constant field; the integer ring is not a field.'];
    if (asset.kind !== 'field-extension') return [];
    const out = [];
    if (!isField(get(data.base))) out.push('A field extension requires a base field; the integer ring is not a field.');
    if (data.target && !isField(get(data.target))) out.push('A field extension requires a field as its target.');
    if (data.target && data.base === data.target) out.push('An extension needs distinct base and target field assets.');
    return out;
  }
  function validateGraph(assets) {
    for (const asset of assets) {
      const failures = issues(asset, assets);
      if (failures.length) throw new Error(failures.join(' '));
    }
  }
  const api = { isRing, isField, classification, issues, validateGraph };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceRings = api;
})(typeof window !== 'undefined' ? window : globalThis);
