import { parseRecipe, printRecipe, literal } from './recipe.mjs';
import { rational } from './kernel.mjs';
export function matrixCAS(asset, target) {
  if (!asset || asset.type !== 'matrix' || !['QQ', 'ZZ'].includes(asset.context.ring)) throw new Error('CAS export requires a QQ or ZZ matrix');
  if (!['sage', 'macaulay2'].includes(target)) throw new Error('Unsupported CAS target');
  const { ring } = asset.context, name = asset.name;
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('Invalid matrix identifier');
  const rows = asset.data.rows.map(row => row.map(rational));
  if (ring === 'ZZ' && rows.flat().some(v => v.includes('/'))) throw new Error('Nonintegral ZZ matrix');
  if (target === 'sage') return `${name} = matrix(${ring}, [${rows.map(row => `[${row.join(', ')}]`).join(', ')}])\n`;
  // Macaulay2 names with underscores are indexed variables. Use a fixed safe
  // lowercase identifier, and preserve the workspace name only in a comment.
  return `-- Workspace asset: ${name}\nworkspaceMatrix = matrix(${ring}, {${rows.map(row => `{${row.join(', ')}}`).join(', ')}})\n`;
}
export function detectImport(text) {
  if (text.length > 20 * 1024 * 1024) throw new Error('Import exceeds 20 MB');
  const clean = text.trim();
  if (!clean) throw new Error('Empty import');
  if (clean.startsWith('{')) {
    const value = JSON.parse(clean);
    if (value.schema === 'pure-math-workspace') return { kind: 'project', value };
    const legacy = (format, statements) => ({kind:'recipe',value:printRecipe(statements),legacy:{format,payload:value},notice:'legacyImportNotice'});
    const call=(name,operation,args)=>({name,operation,args});
    if(value.kind==='category-calculator-prototype') {
      if(!Array.isArray(value.categories)||!Array.isArray(value.functors)) throw new Error('Invalid category export');
      const ids=new Map(), statements=value.categories.map((c,i)=>{const name=`category${i+1}`;if(ids.has(c.id)) throw new Error('Duplicate category ID');ids.set(c.id,name);const {id,x,y,...spec}=c;return call(name,'categoryPresentation',[literal(spec)]);});
      value.functors.forEach((f,i)=>{if(!ids.has(f.domainId)||!ids.has(f.codomainId)) throw new Error('Missing functor endpoint');statements.push(call(`functor${i+1}`,'symbolicFunctor',[{ref:ids.get(f.domainId)},{ref:ids.get(f.codomainId)},f.label,f.variance]));});
      return legacy('category-calculator',statements);
    }
    if(value.kind==='strand-diagram-calculator') {
      if(value.groupType&&value.groupType!=='symmetric') throw new Error('Signed B/C/D strand imports are not yet available');
      const records=value.appliedGenerators||(value.appliedSteps||[]).map(index=>({family:'coxeter',index}));
      if(!Array.isArray(records)) throw new Error('Missing strand word');
      // Legacy stores chronological clicks; its calculationWordFromState reverses them.
      const statements=[call('braid','strand',[value.strandCount,literal([...records].reverse())])];
      const settings=value.calculationSettings;
      if(settings?.target) statements.push(call('image','strandEvaluate',[{ref:'braid'},settings.target,...(settings.basis?[settings.basis]:[])]));
      return legacy('strand-diagram',statements);
    }
    if(value.calculator==='Dynkin diagram calculator') {
      const compact=String(value.type).replace(/[_{}]/g,'');
      const type=value.typeKey||(/^(E6|E7|E8|F4|G2)$/.test(compact)?compact:compact.replace(/[0-9]+$/,''));
      return legacy('dynkin-diagram',[call('roots','rootSystem',[type,value.rank])]);
    }
    if(value.calculator==='Place ramification calculator') {
      const statements=[];
      if(value.response) statements.push(call('savedPlaces','ramificationSnapshot',[literal(value.response)]));
      if(value.extension?.polynomial) statements.push(call('extension','fieldExtension',[literal(value.base),value.extension.polynomial]));
      else if(value.extension?.fieldSnapshot) statements.push(call('K','numberFieldSnapshot',[literal({field:value.extension.fieldSnapshot,extra:value.extension.extraSnapshot||{}})]));
      if(!statements.length) throw new Error('Ramification export has no reusable field or response');
      return legacy('place-ramification',statements);
    }
    if(value.kind==='slice-explorer-object') {
      const d=value.object?.data||{},kind=d.objectType||value.object?.kind,n=d.ambientDimension;
      if(kind==='sphere') return legacy('slice-explorer-object',[call('S','sphere',[literal(d.center),rational(d.radius)])]);
      if(kind==='regular-polytope'&&['hypercube','cross-polytope'].includes(d.family)&&(d.scale===undefined||d.scale===1)) return legacy('slice-explorer-object',[call('polytope1','polytope',[d.family,n])]);
      throw new Error('This slice object or its transformation has not yet migrated');
    }
    if (Array.isArray(value.lambda) && Array.isArray(value.mu)) {
      const statements=[call('lambda','partition',[literal(value.lambda)]),call('mu','partition',[literal(value.mu)])];
      if(value.type&&value.rank) {statements.push(call('roots','rootSystem',[value.type,value.rank]));if(value.fixedRankMode) statements.push(call('V','representation',[{ref:'lambda'},{ref:'roots'}]),call('W','representation',[{ref:'mu'},{ref:'roots'}]));}
      return legacy('double-young',statements);
    }
    const rows = value.partition || value.rows || value.shape;
    if (Array.isArray(rows) && rows.every(v => typeof v === 'number')) return legacy('young-diagram',[call('lambda','partition',[literal(rows)])]);
    throw new Error('Unrecognised JSON import; full legacy adapters are listed in the coverage inventory');
  }
  if (/^[A-Za-z][A-Za-z0-9_]*\s*=/.test(clean.replace(/^\s*#.*$/gm, '').trim())) { parseRecipe(clean); return { kind: 'recipe', value: clean }; }
  let matrixText = clean;
  if (/\\begin\{(?:[pbvVB]?matrix|smallmatrix)\}/.test(clean)) matrixText = clean.replace(/\\(?:begin|end)\{[^}]+\}/g, '').replace(/\\\\/g, '\n').replace(/&/g, ' ');
  const rows = matrixText.split(/[\n;]/).filter(line => line.trim()).map(line => line.trim().split(/[\s,]+/).map(rational));
  return { kind: 'recipe', value: printRecipe([{ name: 'A', operation: 'matrix', args: [literal(rows), 'QQ'] }]) };
}
