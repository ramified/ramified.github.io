import '../toric_cone_math.js';
const R = globalThis.ToricConeMath.Rational;
const q = value => R.from(value);
const dot = (a, b) => a.reduce((sum, x, i) => sum.add(q(x).mul(q(b[i]))), q('0'));
const add = (a, b) => a.map((x, i) => q(x).add(b[i]));
const sub = (a, b) => a.map((x, i) => q(x).sub(b[i]));
const scale = (a, s) => a.map(x => q(x).mul(s));
const exact = a => a.map(x => q(x).toString());
const key = point => exact(point).join(',');

export function standardPolytope(family, dimension) {
  const zero = () => Array(dimension).fill('0');
  const halfspaces = [], vertices = [], edges = [];
  const addHalfspace = (normal, bound) => halfspaces.push({ normal: normal.map(String), bound: String(bound) });
  if (family === 'hypercube') {
    for (let i = 0; i < dimension; i++) for (const sign of [-1, 1]) { const a = zero(); a[i] = String(sign); addHalfspace(a, 1); }
    for (let mask = 0; mask < 2 ** dimension; mask++) vertices.push(Array.from({ length: dimension }, (_, i) => mask & (1 << i) ? '1' : '-1'));
    for (let mask = 0; mask < vertices.length; mask++) for (let i = 0; i < dimension; i++) if (!(mask & (1 << i))) edges.push([mask, mask | (1 << i)]);
  } else if (family === 'cross-polytope') {
    for (let mask = 0; mask < 2 ** dimension; mask++) addHalfspace(Array.from({ length: dimension }, (_, i) => mask & (1 << i) ? 1 : -1), 1);
    for (let i = 0; i < dimension; i++) for (const sign of [-1, 1]) { const v = zero(); v[i] = String(sign); vertices.push(v); }
    for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
  } else if (family === 'coordinate-simplex') {
    // Explicitly the coordinate simplex conv(0,e_1,...,e_n); no claim of regularity.
    vertices.push(zero());
    for (let i = 0; i < dimension; i++) { const a = zero(); a[i] = '-1'; addHalfspace(a, 0); const v = zero(); v[i] = '1'; vertices.push(v); }
    addHalfspace(Array(dimension).fill('1'), 1);
    for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) edges.push([i, j]);
  } else throw new Error('Unknown polytope family');
  return { family, dimension, halfspaces, vertices, edges };
}

export function sliceHalfspaces(halfspaces, frame, clipRadius) {
  const radius = q(clipRadius), { basis, origin } = frame;
  if (radius.sign() <= 0) throw new Error('Clip radius must be positive');
  if (basis[0].length !== 2) throw new Error('A two-dimensional slice needs exactly two frame columns');
  const u = basis.map(row => row[0]), v = basis.map(row => row[1]);
  let polygon = [[radius.neg(), radius.neg()], [radius, radius.neg()], [radius, radius], [radius.neg(), radius]];
  const inequalities = halfspaces.map(({ normal, bound }) => ({ a: dot(normal, u), b: dot(normal, v), c: q(bound).sub(dot(normal, origin)) }));
  for (const row of inequalities) {
    const value = point => row.a.mul(point[0]).add(row.b.mul(point[1])).sub(row.c);
    const output = [];
    for (let i = 0; i < polygon.length; i++) {
      const start = polygon[i], end = polygon[(i + 1) % polygon.length], s = value(start), e = value(end);
      if (s.sign() <= 0) output.push(start);
      if ((s.sign() > 0) !== (e.sign() > 0)) output.push(add(start, scale(sub(end, start), s.div(s.sub(e)))));
    }
    polygon = output.filter((point, i) => !i || key(point) !== key(output[i - 1]));
    if (polygon.length && key(polygon[0]) === key(polygon.at(-1))) polygon.pop();
    if (!polygon.length) break;
  }
  const unique = [...new Map(polygon.map(p => [key(p), p])).values()];
  const area = unique.reduce((sum, p, i) => { const next = unique[(i + 1) % unique.length]; return sum.add(p[0].mul(next[1]).sub(p[1].mul(next[0]))); }, q('0'));
  const clipped = unique.some(p => p.some(c => c.equals(radius) || c.equals(radius.neg())));
  return { kind: !unique.length ? 'empty' : unique.length === 1 ? 'point' : area.isZero() ? 'segment' : 'polygon', vertices: unique.map(exact), inequalities: inequalities.map(row => ({ a: row.a.toString(), b: row.b.toString(), c: row.c.toString() })), clipRadius: radius.toString(), touchesClipBoundary: clipped, exact: true };
}

export function sliceSphere(sphere, frame) {
  if (frame.basis[0].length !== 2) throw new Error('A two-dimensional slice needs exactly two frame columns');
  const u = frame.basis.map(r => r[0]), v = frame.basis.map(r => r[1]), offset = sub(frame.origin, sphere.center);
  const a = dot(u, u), b = dot(u, v), c = dot(v, v), determinant = a.mul(c).sub(b.mul(b));
  if (determinant.sign() <= 0) throw new Error('Frame vectors must be independent');
  const h = dot(offset, u).neg(), k = dot(offset, v).neg();
  const centre = [c.mul(h).sub(b.mul(k)).div(determinant), a.mul(k).sub(b.mul(h)).div(determinant)];
  const closest = add(offset, add(scale(u, centre[0]), scale(v, centre[1])));
  const radiusSquared = q(sphere.radius).mul(q(sphere.radius)).sub(dot(closest, closest));
  return { kind: radiusSquared.sign() < 0 ? 'empty' : radiusSquared.isZero() ? 'point' : 'ellipse', center: exact(centre), gram: [[a.toString(), b.toString()], [b.toString(), c.toString()]], radiusSquared: radiusSquared.toString(), exact: true };
}

export function ambientPoint(frame, coordinates) {
  return frame.origin.map((o, i) => q(o).add(dot(frame.basis[i], coordinates)).toString());
}
