import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { operations, execute, rational, validateAssetValue } from './kernel.mjs';
import * as Rep from './representation.mjs';
import { parseRecipe, printRecipe, literal, resolveValue } from './recipe.mjs';
import { ProjectStore, newProject, validateProject } from './project.mjs';
import { examples } from './examples.mjs';
import { detectImport, matrixCAS } from './formats.mjs';
import { messages, tk, setLocale } from './locales.mjs';
import { buildCatalog } from './catalog.mjs';
const store = () => new ProjectStore(operations, execute);
const get = (s, name) => s.project.assets.find(a => a.name === name);
const P = rows => execute('partition', [rows]);
const M = rows => execute('matrix', [rows]);

test('recipe roundtrip, comments, quoted exact numbers, nested references', () => {
  const p = parseRecipe('# example\nA = matrix([["9007199254740993", "1/3"]], "QQ")\nB = sample({"v":[A,true,null],"label":"a\\nb"})');
  assert.equal(printRecipe(parseRecipe(printRecipe(p))), printRecipe(p));
  assert.deepEqual(resolveValue(p[1].args[0], n => n), { v: ['A', true, null], label: 'a\nb' });
});
test('recipe rejects executable code, unsafe numbers, duplicate names and records', () => {
  for (const input of ['x = eval("alert(1)")\nx = partition([])', 'x = partition([9007199254740993])', 'x = partition([1]); alert(1)', 'x = partition([1+2])', 'x = window.alert(1)', 'x = f({"__proto__":1})', 'x = f({"a":1,"a":2})', 'x = f("unclosed)']) assert.throws(() => parseRecipe(input), undefined, input);
});
for (const example of examples) test(`example: ${example.key} completes and roundtrips`, async () => {
  const s = store(); await s.runRecipe(example.source);
  assert.ok(s.project.assets.length); assert.deepEqual(validateProject(JSON.parse(JSON.stringify(s.project)), operations), s.project);
  assert.ok(example.show.every(n => get(s, n)));
  if (example.key === 'exampleSurface') assert.equal(get(s, 'H').data.group, 'Z^2');
  if (example.key === 'exampleSheaf') assert.deepEqual(get(s, 'H').data.dimensions, ['0','0','1']);
});
test('hook formula and LR decomposition agree with mathematical fixtures', async () => {
  const p = await P([3,2]); assert.equal((await execute('hooks',[p])).data.standardTableaux, '5');
  assert.deepEqual((await execute('conjugate',[p])).data.rows, [2,2,1]);
  const lr = await execute('littlewoodRichardson',[await P([1]),await P([1])]);
  assert.deepEqual(lr.data.terms.map(t => [t.nu,t.coefficient]), [[[2],1],[[1,1],1]]);
  assert.equal((await execute('hooks',[await P([])])).data.standardTableaux, '1');
});
test('representation kernel preserves legacy decomposition coefficients', async () => {
  for (const [op, fn, left, right] of [['kronecker', Rep.decomposeKronecker, [2,1],[2,1]], ['plethysm', Rep.decomposePlethysm,[2],[2]], ['classicalStable',Rep.decomposeClassicalStable,[1],[1]]]) {
    assert.deepEqual((await execute(op,[await P(left),await P(right)])).data.terms.map(t => [t.nu,t.coefficient]), fn(left,right).map(t => [t.nu,t.coefficient]));
  }
});
test('matrix arithmetic is exact, preserves large integers and rejects singular inverse', async () => {
  const A = await M([['9007199254740993','1/3'],['0','2']]);
  assert.equal((await execute('determinant',[A])).data.value, '18014398509481986');
  assert.deepEqual((await execute('multiply',[A,await execute('inverse',[A])])).data.rows, [['1','0'],['0','1']]);
  assert.deepEqual((await execute('power',[A,0])).data.rows, [['1','0'],['0','1']]);
  await assert.rejects(execute('inverse',[await M([[1,2],[2,4]])]), /singular/);
  await assert.rejects(execute('multiply',[await M([[1,2]]),await M([[1,2]])]), /dimensions/);
  assert.throws(() => rational('1e1000000'), /decimal or fraction/);
});
test('every registered operation has a passing representative execution', async () => {
  const p = await P([1]), roots = await execute('rootSystem',['A',2]), rep = await execute('representation',[p,roots]);
  const m = await M([[1,0],[0,1]]), points = await execute('points',[[[0,0],[1,1]]]), cone = await execute('cone',[[[1,0],[0,1]]]);
  const fanSpec = { ambientDimension:2, cones:[{id:'sigma', generators:cone.data.generators}] }, fan = await execute('fan',[fanSpec]);
  const strand = await execute('strand',[3,[1,2]]), surfaceSpec = {lattice:'square',rows:1,cols:1}, surface = await execute('surface',[surfaceSpec]);
  const catSpec = {objects:['X','Y'],morphisms:[{id:'f',source:'X',target:'Y'}]}, cat = await execute('category',[catSpec]);
  const field = await execute('fieldExtension',[{kind:'Q'},'x^2-2']), variety = await execute('projectiveSpace',[2]), line = await execute('lineBundle',[variety,-3]);
  const cases = {
    partition:[[2,1]], skew:[await P([2,1]),p], conjugate:[p], hooks:[p], tableaux:[p,[1]], littlewoodRichardson:[p,p],
    kronecker:[p,p], plethysm:[p,p], classicalStable:[p,p], rootSystem:['A',2], cartan:[roots], positiveRoots:[roots], representation:[p,roots],
    weylDimension:[rep], weylOrbit:[rep], character:[rep], tensor:[rep,rep], schurFunctor:[rep,p], grassmannianCup:[p,p,2,2], giambelli:[p,2,2],
    matrix:[[[1,0],[0,1]]], transpose:[m], inverse:[m], determinant:[m], rref:[m], rank:[m], multiply:[m,m], power:[m,-2], points:[[[0,0],[1,1]]],
    frame:[m,[0,0]], project:[points,m], cone:[[[1,0],[0,1]]], analyzeCone:[cone], fan:[fanSpec], analyzeFan:[fan], strand:[3,[1,2]],
    strandEvaluate:[strand,'tl'], strandRelations:[strand,{target:'tl'}], surface:[surfaceSpec], homology:[surface], category:[catSpec],
    functor:[cat,cat,{X:'X',Y:'Y'},{f:'f'}], fieldExtension:[{kind:'Q'},'x^2-2'], ramification:[field], projectiveSpace:[2], curve:[2], abelianVariety:[2],
    grassmannian:[2,4], completeIntersection:[4,[5]], varietyProduct:[variety,variety], hodge:[variety], lineBundle:[variety,-3], structureSheaf:[variety],
    sheafCohomology:[line], koszulBetti:[variety], sheafComplex:[[{degree:0,sheaf:line}]],
  };
  assert.deepEqual([...operations.keys()].sort(), Object.keys(cases).sort());
  for (const [name,args] of Object.entries(cases)) {
    try { const result = await execute(name,args); validateAssetValue(result); assert.ok(result.type); }
    catch (e) { throw new Error(`${name}: ${e.message}`, {cause:e}); }
  }
});
test('source edit retains old values and invalidates transitive outputs', async () => {
  const s = store(); await s.runRecipe('A = matrix([[1,0],[0,2]])\nB = inverse(A)\nC = determinant(B)');
  const originalB = structuredClone(get(s,'B').data), a = get(s,'A');
  await s.editSource(a.id,[literal([['2','0'],['0','2']])]);
  assert.equal(get(s,'A').revision,2); assert.equal(get(s,'B').status,'stale'); assert.equal(get(s,'C').status,'stale'); assert.deepEqual(get(s,'B').data,originalB);
  assert.equal(get(s,'A').history[0].value.data.rows[0][0],'1');
  await s.runRecipe(printRecipe(s.project.statements)); assert.equal(get(s,'C').data.value,'1/4'); assert.equal(get(s,'C').status,'current');
  assert.deepEqual(validateProject(s.project,operations),s.project);
});
test('failed edits and recipes are atomic and preserve previous results', async () => {
  const s = store(); await s.runRecipe('A = matrix([[1]])\nB = inverse(A)'); const old = structuredClone(s.project);
  await assert.rejects(s.runRecipe('A = matrix([[0]])\nB = inverse(A)'),/singular/); assert.deepEqual(s.project,old);
  await assert.rejects(s.editSource(get(s,'A').id,[literal([[1,2],[1]])]),/rectangular/); assert.deepEqual(s.project,old);
  await assert.rejects(s.runRecipe('B = inverse(missing)'),/reference/); assert.deepEqual(s.project,old);
  await assert.rejects(s.runRecipe('A = eval("1")'),/Unknown operation/);
});
test('cancellation and concurrent mutation cannot publish a partial result', async () => {
  const s = store(), controller = new AbortController(); await s.runRecipe('A = partition([1])'); const old = structuredClone(s.project);
  s.executor = async (name,args) => { controller.abort(); return execute(name,args); };
  await assert.rejects(s.runRecipe('A = partition([2])',{signal:controller.signal}),{name:'AbortError'}); assert.deepEqual(s.project,old);
  s.executor = async (name,args) => { s.addView(); return execute(name,args); };
  await assert.rejects(s.runRecipe('A = partition([2])'),/Project changed/); assert.deepEqual(get(s,'A').data.rows,[1]);
});
test('undo and redo restore mathematics, views and stale flags', async () => {
  const s = store(); await s.runRecipe('a = partition([2])\nb = conjugate(a)'); s.addView(); s.updateView(s.project.views[1].id,{assetIds:[get(s,'a').id]});
  const before = structuredClone(s.project); await s.editSource(get(s,'a').id,[literal([3])]); const after = structuredClone(s.project);
  s.undo(); assert.deepEqual(s.project,before); s.redo(); assert.deepEqual(s.project,after);
});
test('deletion is blocked by dependencies; selection exports their closure', async () => {
  const s = store(); await s.runRecipe('a = partition([2])\nb = conjugate(a)\nc = hooks(b)\nunrelated = partition([1])');
  assert.throws(() => s.deleteAsset(get(s,'a').id),/dependent/);
  const exported = s.exportSelection([get(s,'c').id]); assert.deepEqual(exported.assets.map(a=>a.name),['a','b','c']);
  assert.deepEqual(validateProject(exported,operations),exported);
  s.deleteAsset(get(s,'c').id); s.deleteAsset(get(s,'b').id); s.deleteAsset(get(s,'a').id); assert.equal(s.project.assets.length,1);
});
test('merge remaps colliding names, IDs, dependencies, recipes, computations and views', async () => {
  const s = store(); await s.runRecipe('a = partition([2])\nb = conjugate(a)'); s.updateView(s.project.views[0].id,{assetIds:[get(s,'b').id]});
  const original = structuredClone(s.project); s.importProject(original,true);
  assert.equal(s.project.assets.length,4); assert.equal(new Set(s.project.assets.map(a=>a.id)).size,4);
  assert.deepEqual(get(s,'b_2').dependencies,[get(s,'a_2').id]);
  assert.equal(s.project.statements.find(s=>s.name==='b_2').args[0].ref,'a_2'); assert.deepEqual(s.project.views[1].assetIds,[get(s,'b_2').id]);
  await s.runRecipe(printRecipe(s.project.statements)); assert.deepEqual(get(s,'b').data,get(s,'b_2').data);
});
test('project import rejects broken references, future versions, malformed matrices and prototypes', async () => {
  const s = store(); await s.runRecipe('A = matrix([[1]])\nB = inverse(A)'); const before = structuredClone(s.project);
  for (const mutate of [p=>p.version++,p=>p.assets[1].dependencies=['missing'],p=>p.assets[0].data.rows=[[1],[1,2]],p=>p.assets[0].type='unknown',p=>p.computations[0].inputs[0].revision=99,p=>p.statements[0].operation='eval']) {
    const bad = structuredClone(before); mutate(bad); assert.throws(()=>s.importProject(bad)); assert.deepEqual(s.project,before);
  }
  assert.throws(()=>s.importProject(JSON.parse('{"schema":"pure-math-workspace","version":1,"__proto__":{"x":1}}')),/Reserved/);
});
test('legacy imports are explicit and CAS exports retain exact coefficient context', async () => {
  assert.equal(detectImport('{"partition":[3,2]}').value,'lambda = partition([3,2])');
  assert.equal(parseRecipe(detectImport('{"lambda":[2],"mu":[1]}').value).length,2);
  const s = store(); await s.runRecipe(detectImport('1/2 2\n3 4').value);
  assert.match(matrixCAS(get(s,'A'),'sage'),/matrix\(QQ, \[\[1\/2, 2\], \[3, 4\]\]\)/);
  assert.match(matrixCAS(get(s,'A'),'macaulay2'),/matrix\(QQ, \{\{1\/2, 2\}, \{3, 4\}\}\)/);
});
test('new interface has matching English and Chinese keys and an isolated stylesheet', () => {
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages['zh-cn']).sort());
  const html = fs.readFileSync(new URL('../../math_workspace.html',import.meta.url),'utf8');
  for (const [,key] of html.matchAll(/data-i18n(?:-placeholder|-title|-aria-label)?="([^"]+)"/g)) assert.ok(messages.en[key] && messages['zh-cn'][key],key);
  for (const locale of ['en','zh-cn']) { setLocale(locale); for (const key of Object.keys(messages.en)) assert.ok(tk(key).trim()); }
  setLocale('en'); assert.match(html,/css\/math_workspace.css/); assert.doesNotMatch(html,/<iframe/i);
});
test('catalog explicitly separates inventory from completed migration', () => {
  const catalog=buildCatalog(operations); assert.equal(catalog.fullParity,false); assert.equal(catalog.families.length,12);
  for(const f of catalog.families) { assert.ok(f.sources.length && f.fields.length && f.assets.length && f.limitations.length); }
});
