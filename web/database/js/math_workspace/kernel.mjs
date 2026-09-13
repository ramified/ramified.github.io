import '../toric_cone_math.js';
import '../place_ramification_engine.js';
import '../background_homology.js';
import '../strand_math/core.js';
import '../strand_math/permutation.js';
import '../strand_math/hecke.js';
import '../strand_math/kl.js';
import '../strand_math/temperley_lieb.js';
import '../strand_math/burau.js';
import '../strand_math/calculate.js';
import '../strand_math/diagrammatics.js';
import '../strand_math/basis_catalog.js';
import * as Rep from './representation.mjs';
import * as Sheaf from './sheaf_math.mjs';

const Toric = globalThis.ToricConeMath;
export const Strand = globalThis.StrandMath;
const q = value => {
  if (!['string', 'number'].includes(typeof value) || String(value).length > 512 || /[eE]/.test(String(value))) throw new Error('Use a decimal or fraction with at most 512 characters');
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) throw new Error('Quote large integers');
  return Toric.parseRational(value);
};
export const rational = value => q(value).toString();
const integer = (n, min = 0, max = 100) => {
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`Expected an integer from ${min} to ${max}`);
  return n;
};
const list = (v, max = 10000) => { if (!Array.isArray(v) || v.length > max) throw new Error('Invalid or oversized list'); return v; };
export function serializable(v) {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Map) return [...v].map(([k, value]) => [serializable(k), serializable(value)]);
  if (v instanceof Set) return [...v].map(serializable);
  if (Array.isArray(v)) return v.map(serializable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, serializable(x)]));
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Non-finite mathematical result');
  return v;
}
const object = (type, data, context = {}, assumptions = []) => ({ type, data: serializable(data), context, assumptions });
function asset(v, type) {
  if (!v || !v.type || !Object.hasOwn(v, 'data') || (type && v.type !== type)) throw new Error(`Expected ${type || 'mathematical asset'}`);
  return v;
}
const data = (v, type) => asset(v, type).data;
function partition(v) {
  const rows = list(v, 100).map(n => integer(n, 0, 300));
  if (rows.some((n, i) => i && n > rows[i - 1])) throw new Error('Partition rows must be non-increasing');
  while (rows.at(-1) === 0) rows.pop();
  if (rows.reduce((a, b) => a + b, 0) > 1000) throw new Error('Partition exceeds 1000 cells');
  return rows;
}
function matrix(v, domain = 'QQ') {
  if (!['QQ', 'ZZ'].includes(domain)) throw new Error('This matrix constructor currently supports QQ and ZZ');
  const rows = list(v, 8).map(row => list(row, 8).map(rational));
  if (!rows.length || !rows[0].length || rows.some(row => row.length !== rows[0].length)) throw new Error('Matrix must be nonempty and rectangular, at most 8 × 8');
  if (domain === 'ZZ' && rows.flat().some(x => x.includes('/'))) throw new Error('ZZ entries must be integers');
  return object('matrix', { rows }, { ring: domain, arithmetic: 'exact' });
}
const rowsOf = a => data(a, 'matrix').rows;
const square = a => { const rows = rowsOf(a); if (rows.length !== rows[0].length) throw new Error('Expected a square matrix'); return rows; };
function multiply(a, b) {
  const A = rowsOf(a), B = rowsOf(b);
  if (A[0].length !== B.length) throw new Error('Matrix dimensions do not match');
  return matrix(A.map(row => B[0].map((_, j) => row.reduce((sum, x, k) => sum.add(q(x).mul(q(B[k][j]))), q('0')).toString())), a.context.ring === 'ZZ' && b.context.ring === 'ZZ' ? 'ZZ' : 'QQ');
}
function eliminate(rows, inverse = false) {
  const n = rows.length, width = rows[0].length;
  const m = rows.map((row, i) => [...row.map(q), ...(inverse ? Array.from({ length: n }, (_, j) => q(i === j ? '1' : '0')) : [])]);
  let rank = 0, determinant = q('1');
  for (let c = 0; c < width && rank < n; c++) {
    let p = rank;
    while (p < n && m[p][c].isZero()) p++;
    if (p === n) { determinant = q('0'); continue; }
    if (p !== rank) { [m[p], m[rank]] = [m[rank], m[p]]; determinant = determinant.neg(); }
    const pivot = m[rank][c]; determinant = determinant.mul(pivot);
    m[rank] = m[rank].map(x => x.div(pivot));
    for (let r = 0; r < n; r++) if (r !== rank) {
      const factor = m[r][c]; m[r] = m[r].map((x, j) => x.sub(factor.mul(m[rank][j])));
    }
    rank++;
  }
  if (inverse && rank !== n) throw new Error('Matrix is singular');
  return { rows: m.map(row => row.map(x => x.toString())), rank, determinant: determinant.toString() };
}
function lie(type, rank) {
  const exceptional = { E6: 6, E7: 7, E8: 8, F4: 4, G2: 2 };
  if (!['A', 'B', 'C', 'D', ...Object.keys(exceptional)].includes(type)) throw new Error('Unsupported Lie type');
  if (exceptional[type]) { if (rank !== exceptional[type]) throw new Error('Exceptional type/rank mismatch'); }
  else integer(rank, type === 'D' ? 4 : type === 'A' ? 1 : 2, 16);
  return { type, rank };
}
function decomposition(terms, context = {}) {
  const metadata = Object.fromEntries(Object.keys(terms).filter(k => !/^\d+$/.test(k)).map(k => [k, serializable(terms[k])]));
  return object('decomposition', { terms: serializable(terms), ...metadata }, { arithmetic: 'legacy-number', ...context });
}
function hooks(rows) {
  const columns = Rep.conjugatePartition(rows);
  const result = rows.map((n, r) => Array.from({ length: n }, (_, c) => n - c + columns[c] - r - 1));
  let numerator = 1n, denominator = 1n;
  for (let n = 2; n <= rows.reduce((a, b) => a + b, 0); n++) numerator *= BigInt(n);
  for (const h of result.flat()) denominator *= BigInt(h);
  return { hooks: result, standardTableaux: (numerator / denominator).toString(), size: rows.reduce((a, b) => a + b, 0) };
}
function pointRows(v) {
  const points = list(v, 1000).map(row => list(row, 16).map(rational));
  if (!points.length || !points[0].length || points.some(p => p.length !== points[0].length)) throw new Error('Points must have one common positive dimension');
  return points;
}
function validateGraph(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('Expected a category specification');
  const objects = list(spec.objects, 300);
  if (objects.some(n => typeof n !== 'string' || !n.length) || new Set(objects).size !== objects.length) throw new Error('Category objects must have unique names');
  const morphisms = list(spec.morphisms || [], 1000);
  const ids = new Set();
  for (const m of morphisms) {
    if (!m || typeof m.id !== 'string' || ids.has(m.id) || !objects.includes(m.source) || !objects.includes(m.target)) throw new Error('Invalid category morphism');
    ids.add(m.id);
  }
  return { ...spec, objects, morphisms };
}
export const operations = new Map();
function define(name, family, kind, signature, example, run, options = {}) {
  operations.set(name, { name, version: 1, family, kind, signature, example, run, ...options });
}
define('partition', 'young', 'constructor', ['rows'], 'lambda = partition([3, 2])', rows => object('partition', { rows: partition(rows) }));
define('skew', 'young', 'constructor', ['outer', 'inner'], 'shape = skew(lambda, mu)', (outer, inner) => {
  const a = data(outer, 'partition').rows, b = data(inner, 'partition').rows;
  if (b.some((x, i) => x > (a[i] || 0))) throw new Error('Inner partition must be contained in outer partition');
  return object('skew', { outer: a, inner: b });
});
define('conjugate', 'young', 'operation', ['partition'], 'dual = conjugate(lambda)', a => object('partition', { rows: Rep.conjugatePartition(data(a, 'partition').rows) }), { accepts: ['partition'] });
define('hooks', 'young', 'operation', ['partition'], 'table = hooks(lambda)', a => object('hookTable', hooks(data(a, 'partition').rows)), { accepts: ['partition'] });
define('tableaux', 'young', 'operation', ['partition', 'content'], 'tableaux1 = tableaux(lambda, [2, 2, 1])', (a, content) => object('tableaux', Rep.semistandardTableaux(data(a, 'partition').rows, list(content, 100).map(n => integer(n, 0, 1000)))), { accepts: ['partition'] });
define('littlewoodRichardson', 'representation', 'operation', ['left', 'right'], 'product = littlewoodRichardson(lambda, mu)', (a, b) => decomposition(Rep.decomposeTypeAStable(data(a, 'partition').rows, data(b, 'partition').rows)), { accepts: ['partition'] });
for (const [name, fn] of [['kronecker', Rep.decomposeKronecker], ['plethysm', Rep.decomposePlethysm], ['classicalStable', Rep.decomposeClassicalStable]]) {
  define(name, 'representation', 'operation', ['left', 'right'], `result = ${name}(lambda, mu)`, (a, b) => decomposition(fn(data(a, 'partition').rows, data(b, 'partition').rows)), { accepts: ['partition'] });
}
define('rootSystem', 'dynkin', 'constructor', ['type', 'rank'], 'roots = rootSystem("A", 3)', (type, rank) => object('rootSystem', lie(type, rank)));
define('cartan', 'dynkin', 'operation', ['rootSystem'], 'C = cartan(roots)', a => { const s = data(a, 'rootSystem'); return matrix(Rep.cartanMatrix(s.type, s.rank), 'ZZ'); }, { accepts: ['rootSystem'] });
define('positiveRoots', 'dynkin', 'operation', ['rootSystem'], 'positive = positiveRoots(roots)', a => { const s = data(a, 'rootSystem'); return object('points', { points: Rep.positiveRoots(Rep.cartanMatrix(s.type, s.rank)).map(r => r.map(String)) }, { basis: 'simple-roots', ...s }); }, { accepts: ['rootSystem'] });
define('representation', 'representation', 'constructor', ['partition', 'rootSystem'], 'V = representation(lambda, roots)', (a, b) => {
  const rows = data(a, 'partition').rows, s = data(b, 'rootSystem');
  if (rows.length > s.rank) throw new Error('Partition encoding exceeds the chosen Lie rank');
  return object('representation', { rows, labels: Array.from({ length: s.rank }, (_, i) => (rows[i] || 0) - (rows[i + 1] || 0)) }, s);
});
define('weylDimension', 'representation', 'operation', ['representation'], 'dimension = weylDimension(V)', a => { const s = asset(a, 'representation'); return object('scalar', { value: Rep.weylDimensionBigInt(s.data.labels, Rep.cartanMatrix(s.context.type, s.context.rank)) }); }, { accepts: ['representation'] });
define('weylOrbit', 'representation', 'operation', ['representation'], 'orbit = weylOrbit(V)', a => { const s = asset(a, 'representation'); return object('report', Rep.weylOrbitSigned(s.data.labels, Rep.cartanMatrix(s.context.type, s.context.rank)), s.context); }, { accepts: ['representation'] });
define('character', 'representation', 'operation', ['representation'], 'weights = character(V)', a => { const s = asset(a, 'representation'); return object('report', Rep.irreducibleCharacterFreudenthal(s.data.labels, Rep.cartanMatrix(s.context.type, s.context.rank)), { ...s.context, arithmetic: 'legacy-number' }); }, { accepts: ['representation'] });
define('tensor', 'representation', 'operation', ['left', 'right'], 'W = tensor(V, V)', (a, b) => {
  asset(a, 'representation'); asset(b, 'representation');
  if (a.context.type !== b.context.type || a.context.rank !== b.context.rank) throw new Error('Representations must have the same Lie type and rank');
  return decomposition(Rep.decomposeFixedRank(a.data.rows, b.data.rows, a.context.type, a.context.rank), a.context);
}, { accepts: ['representation'] });
define('schurFunctor', 'representation', 'operation', ['representation', 'partition'], 'S = schurFunctor(V, mu)', (a, b) => {
  asset(a, 'representation'); return decomposition(Rep.decomposeSchurFunctorFiniteType(a.data.rows, data(b, 'partition').rows, a.context.type, a.context.rank), a.context);
}, { accepts: ['representation'] });
define('grassmannianCup', 'representation', 'operation', ['left', 'right', 'r', 'k'], 'cup = grassmannianCup(lambda, mu, 3, 4)', (a, b, r, k) => decomposition(Rep.decomposeGrassmannianCup(data(a, 'partition').rows, data(b, 'partition').rows, integer(r, 1, 18), integer(k, 1, 18)), { grassmannian: { r, n: r + k } }), { accepts: ['partition'] });
define('giambelli', 'representation', 'operation', ['partition', 'r', 'k'], 'chern = giambelli(lambda, 3, 4)', (a, r, k) => object('classExpression', { terms: Rep.giambelliPolynomial(data(a, 'partition').rows, integer(r, 1, 18), integer(k, 1, 18)) }, { grassmannian: { r, n: r + k } }), { accepts: ['partition'] });
define('matrix', 'matrix', 'constructor', ['rows', 'ring?'], 'A = matrix([["1", "2"], ["3", "4"]], "QQ")', matrix);
define('transpose', 'matrix', 'operation', ['matrix'], 'At = transpose(A)', a => { const rows = rowsOf(a); return matrix(rows[0].map((_, j) => rows.map(row => row[j])), a.context.ring); }, { accepts: ['matrix'] });
define('inverse', 'matrix', 'operation', ['matrix'], 'Ai = inverse(A)', a => { const rows = square(a); return matrix(eliminate(rows, true).rows.map(row => row.slice(rows.length))); }, { accepts: ['matrix'] });
define('determinant', 'matrix', 'operation', ['matrix'], 'd = determinant(A)', a => object('scalar', { value: eliminate(square(a)).determinant }, { ring: a.context.ring, arithmetic: 'exact' }), { accepts: ['matrix'] });
define('rref', 'matrix', 'operation', ['matrix'], 'R = rref(A)', a => matrix(eliminate(rowsOf(a)).rows), { accepts: ['matrix'] });
define('rank', 'matrix', 'operation', ['matrix'], 'r = rank(A)', a => object('scalar', { value: String(eliminate(rowsOf(a)).rank) }), { accepts: ['matrix'] });
define('multiply', 'matrix', 'operation', ['left', 'right'], 'B = multiply(A, A)', multiply, { accepts: ['matrix'] });
define('power', 'matrix', 'operation', ['matrix', 'exponent'], 'A2 = power(A, 2)', (a, n) => {
  const rows = square(a); integer(n, -1000, 1000);
  let base = n < 0 ? matrix(eliminate(rows, true).rows.map(r => r.slice(rows.length))) : a;
  let result = matrix(rows.map((r, i) => r.map((_, j) => i === j ? '1' : '0')), a.context.ring); n = Math.abs(n);
  while (n) { if (n % 2) result = multiply(result, base); n = Math.floor(n / 2); if (n) base = multiply(base, base); }
  return result;
}, { accepts: ['matrix'] });
define('points', 'geometry', 'constructor', ['coordinates'], 'P = points([[0, 0, 0], [1, 0, 1], [0, 1, 1]])', v => object('points', { points: pointRows(v) }));
define('frame', 'geometry', 'constructor', ['matrix', 'origin'], 'F = frame(A, [0, 0])', (a, origin) => {
  const rows = rowsOf(a), o = list(origin, 16).map(rational);
  if (o.length !== rows.length || eliminate(rows).rank !== rows[0].length) throw new Error('Frame requires independent columns and a matching origin');
  return object('frame', { basis: rows, origin: o }, { ring: 'QQ', arithmetic: 'exact' });
});
define('project', 'geometry', 'operation', ['points', 'matrix'], 'image = project(P, A)', (a, b) => {
  const ps = data(a, 'points').points, m = rowsOf(b);
  if (ps[0].length !== m[0].length) throw new Error('Projection dimension mismatch');
  return object('points', { points: ps.map(p => m.map(row => row.reduce((s, x, i) => s.add(q(x).mul(q(p[i]))), q('0')).toString())) }, { arithmetic: 'exact', map: 'explicit-linear-projection' });
}, { accepts: ['points'] });
define('cone', 'geometry', 'constructor', ['rays', 'dimension?'], 'sigma = cone([[1, 0], [0, 1]])', (rays, dimension) => {
  const coords = rays.length ? pointRows(rays) : [];
  const n = dimension ?? coords[0]?.length;
  integer(n, 1, 16); if (coords.some(r => r.length !== n)) throw new Error('Ray dimension mismatch');
  return object('cone', { ambientDimension: n, generators: coords.map((coordinates, i) => ({ id: `r${i + 1}`, label: `r${i + 1}`, coordinates })) });
});
define('analyzeCone', 'geometry', 'operation', ['cone'], 'faces = analyzeCone(sigma)', a => object('report', Toric.analyzeCone(data(a, 'cone'))), { accepts: ['cone'] });
define('fan', 'geometry', 'constructor', ['specification'], 'fan1 = fan({"ambientDimension": 2, "cones": []})', spec => {
  if (!spec || typeof spec !== 'object') throw new Error('Expected fan specification');
  const analysis = Toric.analyzeFan(spec); if (!analysis.valid) throw new Error((analysis.issues || ['Invalid fan']).join('; '));
  return object('fan', spec);
});
define('analyzeFan', 'geometry', 'operation', ['fan'], 'fanData = analyzeFan(fan1)', a => object('report', Toric.analyzeFan(data(a, 'fan'))), { accepts: ['fan'] });
define('strand', 'strand', 'constructor', ['rank', 'word'], 'braid = strand(3, [1, -2, 1])', (rank, word) => {
  integer(rank, 2, 16); const records = list(word, 1000).map(x => typeof x === 'number' ? { family: 'braid', index: Math.abs(integer(x, -15, 15)), sign: x < 0 ? -1 : 1 } : x);
  Strand.normalizeWord(records, rank); return object('strand', { rank, word: records });
});
define('strandEvaluate', 'strand', 'operation', ['strand', 'target', 'basis?'], 'image = strandEvaluate(braid, "symmetric")', (a, target, basis) => {
  const s = data(a, 'strand'); return object('strandResult', Strand.serializeCalculation(Strand.calculateStrandWord(s.word, { rank: s.rank, target, ...(basis ? { basis } : {}), includeTrace: true })));
}, { accepts: ['strand'] });
define('strandRelations', 'strand', 'operation', ['strand', 'options?'], 'relations = strandRelations(braid, {"target":"tl"})', (a, options = {}) => {
  const s = data(a, 'strand'); return object('report', Strand.buildSymbolicRelations(Strand.calculateStrandWord(s.word, { ...options, target: options.target || 'tl', rank: s.rank, includeTrace: true })));
}, { accepts: ['strand'] });
define('surface', 'mosaic', 'constructor', ['snapshot'], 'surface1 = surface({"rows": 2, "cols": 2, "lattice": "square"})', snapshot => {
  if (!snapshot || !['square', 'hexagonal'].includes(snapshot.lattice)) throw new Error('Expected a square or hexagonal surface snapshot');
  integer(snapshot.rows, 1, 30); integer(snapshot.cols, 1, 30);
  if (snapshot.rows * snapshot.cols > 300) throw new Error('Surface exceeds 300 cells');
  const sides = snapshot.lattice === 'square' ? 4 : 6, seen = new Set();
  for (const pair of list(snapshot.gluedEdges || [], 1000)) {
    for (const edge of [pair.first, pair.second]) {
      integer(edge?.index, 0, snapshot.rows * snapshot.cols - 1); integer(edge?.dir, 0, sides - 1);
      const key = `${edge.index}:${edge.dir}`; if (seen.has(key)) throw new Error('A surface side cannot be glued twice'); seen.add(key);
    }
    if (pair.reversed !== undefined && typeof pair.reversed !== 'boolean') throw new Error('Gluing orientation must be boolean');
  }
  const complex = globalThis.BackgroundHomology.buildCellComplex(snapshot);
  return object('surface', { snapshot: serializable(snapshot), complex: globalThis.BackgroundHomology.serialize(complex) });
});
define('homology', 'mosaic', 'operation', ['surface'], 'H = homology(surface1)', a => object('report', globalThis.BackgroundHomology.serialize(globalThis.BackgroundHomology.analyze(data(a, 'surface').snapshot))), { accepts: ['surface'] });
define('category', 'category', 'constructor', ['specification'], 'C = category({"objects":["X","Y"],"morphisms":[{"id":"f","source":"X","target":"Y"}]})', spec => object('category', validateGraph(spec), { interpretation: 'presentation', compositionVerified: false }));
define('functor', 'category', 'constructor', ['source', 'target', 'objectMap', 'morphismMap'], 'F = functor(C, C, {"X":"X","Y":"Y"}, {"f":"f"})', (a, b, objectMap, morphismMap) => {
  const A = data(a, 'category'), B = data(b, 'category');
  for (const x of A.objects) if (!B.objects.includes(objectMap?.[x])) throw new Error('Functor object mapping is incomplete');
  for (const f of A.morphisms) {
    const g = B.morphisms.find(g => g.id === morphismMap?.[f.id]);
    if (!g || g.source !== objectMap[f.source] || g.target !== objectMap[f.target]) throw new Error('Functor morphism mapping must preserve endpoints');
  }
  return object('functor', { source: A, target: B, objectMap, morphismMap }, { interpretation: 'presentation-map', compositionVerified: false });
});
define('fieldExtension', 'ramification', 'constructor', ['base', 'polynomial'], 'K = fieldExtension({"kind":"Q"}, "x^2-2")', (base, polynomial) => {
  if (!base || !['Q', 'Fqt', 'lmfdb'].includes(base.kind) || typeof polynomial !== 'string' || polynomial.length > 10000) throw new Error('Invalid field extension');
  return object('fieldExtension', { base, polynomial }, { irreducibility: 'unverified' });
});
define('ramification', 'ramification', 'operation', ['extension', 'selection?'], 'places = ramification(K, {"bound":7,"includeInfinite":false})', (a, selection = { bound: 7, includeInfinite: false }) => {
  const e = data(a, 'fieldExtension'); return object('ramification', globalThis.RamificationLocalEngine.compute({ schemaVersion: 1, base: e.base, extension: { kind: 'polynomial', generator: 'alpha', polynomial: e.polynomial }, selection }));
}, { accepts: ['fieldExtension'] });

const complexGeometryAssumptions = [{ property: 'baseField', value: 'C', status: 'assumed' }, { property: 'smooth', value: true, status: 'assumed' }, { property: 'projective', value: true, status: 'assumed' }];
define('projectiveSpace', 'sheaf', 'constructor', ['dimension'], 'X = projectiveSpace(2)', dim => object('variety', { type: 'projective', dim: integer(dim, 0, 15), ambient: dim, degrees: [] }, {}, complexGeometryAssumptions));
define('curve', 'sheaf', 'constructor', ['genus'], 'X = curve(2)', genus => object('variety', { type: 'curve', dim: 1, genus: integer(genus, 0, 100000) }, { interpretation: 'genus-specification' }, complexGeometryAssumptions));
define('abelianVariety', 'sheaf', 'constructor', ['dimension'], 'X = abelianVariety(2)', dim => object('variety', { type: 'abelian', dim: integer(dim, 1, 15) }, { interpretation: 'dimension-specification' }, complexGeometryAssumptions));
define('grassmannian', 'sheaf', 'constructor', ['r', 'n'], 'X = grassmannian(2, 4)', (r, n) => {
  integer(n, 1, 16); integer(r, 0, n); if (r * (n - r) > 15) throw new Error('Grassmannian dimension exceeds 15');
  return object('variety', { type: 'grassmannian', dim: r * (n - r), r, n }, {}, complexGeometryAssumptions);
});
define('completeIntersection', 'sheaf', 'constructor', ['ambientDimension', 'degrees'], 'X = completeIntersection(4, [5])', (ambient, degrees) => {
  integer(ambient, 1, 23); const ds = list(degrees, 8).map(d => integer(d, 1, 99)); integer(ambient - ds.length, 0, 15);
  return object('variety', { type: 'complete-intersection', ambient, degrees: ds, dim: ambient - ds.length }, { interpretation: 'smooth-complete-intersection-specification' }, complexGeometryAssumptions);
});
define('varietyProduct', 'sheaf', 'constructor', ['left', 'right'], 'Z = varietyProduct(X, Y)', (a, b) => {
  const A = data(a, 'variety'), B = data(b, 'variety'); integer(A.dim + B.dim, 0, 15);
  return object('variety', { type: 'product', dim: A.dim + B.dim, factors: [A, B] }, {}, complexGeometryAssumptions);
});
function hodgeEntries(g) {
  const d = g.dim, entries = Array.from({ length: d + 1 }, () => Array(d + 1).fill('0'));
  if (g.type === 'projective') { for (let p = 0; p <= d; p++) entries[p][p] = '1'; return entries; }
  if (g.type === 'curve') return [['1', String(g.genus)], [String(g.genus), '1']];
  if (g.type === 'abelian') return Sheaf.buildAbelianHodgeNumbers(g).entries.map(row => row.map(e => e.plain));
  if (g.type === 'grassmannian') { const betti = Sheaf.grassmannianBettiNumbers(g.r, g.n); for (let p = 0; p <= d; p++) entries[p][p] = String(betti[p]); return entries; }
  if (g.type === 'product') {
    const [A, B] = g.factors.map(hodgeEntries);
    for (let p = 0; p < A.length; p++) for (let q = 0; q < A.length; q++) for (let r = 0; r < B.length; r++) for (let s = 0; s < B.length; s++) entries[p + r][q + s] = String(BigInt(entries[p + r][q + s]) + BigInt(A[p][q]) * BigInt(B[r][s]));
    return entries;
  }
  throw new Error('Hodge formulas for this variety have not yet migrated; use the original sheaf calculator');
}
define('hodge', 'sheaf', 'operation', ['variety'], 'diamond = hodge(X)', a => object('invariantTable', { invariant: 'hodge', entries: hodgeEntries(data(a, 'variety')) }, { arithmetic: 'exact', field: 'C' }, a.assumptions), { accepts: ['variety'] });
define('lineBundle', 'sheaf', 'constructor', ['variety', 'twist'], 'L = lineBundle(X, -3)', (a, twist) => {
  const g = data(a, 'variety'); if (!['projective', 'complete-intersection'].includes(g.type)) throw new Error('Serre twists require the specified projective embedding');
  return object('sheaf', { type: 'line-bundle', base: g, twist: integer(twist, -1000, 1000), rank: 1 }, { arithmetic: 'exact' }, a.assumptions);
});
define('structureSheaf', 'sheaf', 'constructor', ['variety'], 'O = structureSheaf(X)', a => object('sheaf', { type: 'structure', base: data(a, 'variety'), rank: 1 }, {}, a.assumptions));
define('sheafCohomology', 'sheaf', 'operation', ['sheaf'], 'H = sheafCohomology(L)', a => {
  const s = data(a, 'sheaf'), g = s.base;
  let dimensions;
  if (s.type === 'structure' && !['projective', 'complete-intersection'].includes(g.type)) dimensions = hodgeEntries(g)[0];
  else if (['projective', 'complete-intersection'].includes(g.type)) dimensions = Array.from({ length: g.dim + 1 }, (_, i) => String(Sheaf.completeIntersectionLineCohomologyAt(g.ambient, g.degrees, i, s.twist || 0)));
  else throw new Error('Sheaf cohomology is not available for this specification');
  return object('invariantTable', { invariant: 'sheaf-cohomology', dimensions }, { arithmetic: 'exact' }, a.assumptions);
}, { accepts: ['sheaf'] });
define('koszulBetti', 'sheaf', 'operation', ['variety'], 'betti = koszulBetti(X)', a => {
  const g = data(a, 'variety'); if (!['projective', 'complete-intersection'].includes(g.type)) throw new Error('Koszul Betti tables require a projective space or a complete intersection');
  const terms = new Map([['0,0', 1]]);
  for (const degree of g.degrees) { const before = [...terms]; for (const [key, value] of before) { const [i, j] = key.split(',').map(Number), next = `${i + 1},${j + degree}`; terms.set(next, (terms.get(next) || 0) + value); } }
  return object('invariantTable', { invariant: 'graded-betti', terms: [...terms].map(([key, value]) => ({ homological: Number(key.split(',')[0]), internal: Number(key.split(',')[1]), value: String(value) })) }, { ring: 'homogeneous-coordinate-ring', arithmetic: 'exact' }, a.assumptions);
}, { accepts: ['variety'] });
define('sheafComplex', 'complex', 'constructor', ['terms'], 'complex1 = sheafComplex([{"degree":0,"sheaf":L}])', terms => {
  const seen = new Set();
  const normalized = list(terms, 100).map(t => { integer(t.degree, -100, 100); if (seen.has(t.degree)) throw new Error('Use one term per complex degree'); seen.add(t.degree); return { degree: t.degree, sheaf: data(t.sheaf, 'sheaf') }; });
  // With no differential input, this constructor explicitly specifies zero maps.
  return object('sheafComplex', { terms: normalized.sort((a, b) => a.degree - b.degree), differentials: 'zero' });
});

export async function execute(name, args) {
  const op = operations.get(name);
  if (!op) throw new Error(`Unknown operation: ${name}`);
  const min = op.signature.filter(s => !s.endsWith('?')).length;
  if (args.length < min || args.length > op.signature.length) throw new Error(`${name} expects ${op.signature.join(', ')}`);
  return serializable(await op.run(...args));
}
export function describeOperations() { return [...operations.values()].map(({ run, ...meta }) => meta); }

export function validateAssetValue(a) {
  const known = ['partition','skew','tableaux','hookTable','decomposition','rootSystem','representation','report','classExpression','matrix','scalar','points','frame','cone','fan','strand','strandResult','surface','category','functor','fieldExtension','ramification','variety','sheaf','sheafComplex','invariantTable'];
  if (!known.includes(a.type)) throw new Error(`Unsupported asset type ${a.type}`);
  const d = a.data;
  if (a.type === 'partition') partition(d.rows);
  if (a.type === 'matrix') matrix(d.rows, a.context.ring);
  if (a.type === 'points') pointRows(d.points);
  if (a.type === 'rootSystem') lie(d.type, d.rank);
  if (a.type === 'representation') { lie(a.context.type, a.context.rank); partition(d.rows); if (!Array.isArray(d.labels) || d.labels.length !== a.context.rank) throw new Error('Invalid highest weight'); }
  if (a.type === 'decomposition' && (!Array.isArray(d.terms) || d.terms.some(t => !Number.isSafeInteger(t.coefficient) || t.coefficient < 0))) throw new Error('Invalid decomposition');
  if (a.type === 'strand') { integer(d.rank, 2, 16); Strand.normalizeWord(list(d.word, 1000), d.rank); }
  if (a.type === 'surface') { integer(d.snapshot?.rows, 1, 30); integer(d.snapshot?.cols, 1, 30); if (d.snapshot.rows * d.snapshot.cols > 300) throw new Error('Oversized surface'); }
  if (a.type === 'category') validateGraph(d);
  if (a.type === 'variety') { integer(d.dim, 0, 15); if (!['projective','curve','abelian','grassmannian','complete-intersection','product'].includes(d.type)) throw new Error('Unsupported variety'); }
  if (a.type === 'sheaf' && (!d.base || !['structure','line-bundle'].includes(d.type))) throw new Error('Unsupported sheaf');
}
operations.validateValue = validateAssetValue;
