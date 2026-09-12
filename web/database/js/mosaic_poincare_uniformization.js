(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare.js') : root.MosaicPoincare);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MosaicPoincareUniformization = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function(P) {
  'use strict';
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const mul = (a, b) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
  const scale = (a, n) => ({ x: a.x * n, y: a.y * n });
  const abs2 = a => a.x * a.x + a.y * a.y;
  const div = (a, b) => scale(mul(a, { x: b.x, y: -b.y }), 1 / abs2(b));
  const one = { x: 1, y: 0 };
  function sqrt(z) {
    const r = Math.hypot(z.x, z.y);
    if (r === 0) return { x: 0, y: 0 };
    if (z.x >= 0) {
      const x = Math.sqrt((r + z.x) / 2);
      return { x, y: z.y / (2 * x) };
    }
    const y = Math.sqrt((r - z.x) / 2);
    return { x: Math.abs(z.y) / (2 * y), y: z.y < 0 ? -y : y };
  }
  function upperSqrt(z) {
    const w = sqrt(z);
    return w.y < 0 ? scale(w, -1) : w;
  }
  // Marshall–Rohde's geodesic algorithm, Section 1:
  // https://sites.math.washington.edu/~rohde/papers/zipper.pdf
  // A composition of analytic slit maps, NOT a radial stretch of the artwork.
  // The computed Jordan boundary interpolates the supplied boundary samples.
  class RiemannMap {
    constructor(boundary, center = { x: 0, y: 0 }) {
      if (boundary.length < 8) throw new Error('At least eight boundary samples are required.');
      this.z0 = boundary[0]; this.z1 = boundary[1]; this.steps = [];
      const points = boundary.slice(2).map(z => this.initial(z));
      let start = null; // Infinity, the image of z0 under the initial map.
      for (let i = 0; i < points.length; i++) {
        const a = points[i], d = abs2(a);
        if (!(a.y > 1e-25) || !Number.isFinite(d)) throw new Error('Interior conformal map lost boundary ordering.');
        const step = { beta: a.x / d, gamma: a.y / d };
        this.steps.push(step);
        start = start ? this.slit(start, step) : this.slitInfinity(step);
        for (let j = i + 1; j < points.length; j++) points[j] = this.slit(points[j], step);
      }
      this.end = start.x;
      this.center = this.halfPlane(center);
      if (!(this.center.y > 0) || !Number.isFinite(abs2(this.center))) throw new Error('The conformal-map center must be in the interior.');
      this.rotation = one;
      const h = 1e-6, probe = this.forward({ x: center.x + h, y: center.y });
      this.rotation = { x: probe.x / Math.hypot(probe.x, probe.y), y: -probe.y / Math.hypot(probe.x, probe.y) };
    }
    initial(z) { const w = sqrt(div(sub(z, this.z1), sub(z, this.z0))); return { x: -w.y, y: w.x }; }
    slit(z, s) {
      const t = div(scale(z, s.gamma), { x: 1 - s.beta * z.x, y: -s.beta * z.y });
      const w = upperSqrt(add(mul(t, t), one));
      if (w.y === 0 && t.x < 0) w.x = -Math.abs(w.x);
      return w;
    }
    slitInfinity(s) {
      if (Math.abs(s.beta) < 1e-30) throw new Error('Singular boundary normalization.');
      const t = -s.gamma / s.beta;
      return { x: Math.sign(t) * Math.hypot(t, 1), y: 0 };
    }
    halfPlane(z) {
      const initial = this.initial(z);
      let x = initial.x, y = initial.y;
      // Rendering evaluates this composition many thousands of times. Keep
      // the inner loop scalar to avoid an allocation per elementary operation.
      for (const s of this.steps) {
        const dx = 1 - s.beta * x, dy = -s.beta * y, denominator = dx * dx + dy * dy;
        const tx = s.gamma * (x * dx + y * dy) / denominator, ty = s.gamma * (y * dx - x * dy) / denominator;
        const real = tx * tx - ty * ty + 1, imaginary = 2 * tx * ty, radius = Math.hypot(real, imaginary);
        if (real >= 0) {
          const root = Math.sqrt((radius + real) / 2);
          x = tx < 0 ? -root : root; y = root ? Math.abs(imaginary) / (2 * root) : 0;
        } else {
          y = Math.sqrt((radius - real) / 2); x = imaginary / (2 * y);
        }
      }
      const w = { x, y };
      const q = div(w, { x: 1 - x / this.end, y: -y / this.end });
      return scale(mul(q, q), -1);
    }
    forward(z) {
      const w = this.halfPlane(z), a = this.center;
      return mul(this.rotation, div(sub(w, a), sub(w, { x: a.x, y: -a.y })));
    }
    inverse(z) {
      const v = mul(z, { x: this.rotation.x, y: -this.rotation.y }), a = this.center;
      let w = div(sub(a, mul(v, { x: a.x, y: -a.y })), sub(one, v));
      let t = upperSqrt(scale(w, -1));
      w = div(t, { x: 1 + t.x / this.end, y: t.y / this.end });
      for (let i = this.steps.length - 1; i >= 0; i--) {
        const s = this.steps[i];
        t = upperSqrt(sub(mul(w, w), one));
        w = div(t, { x: s.gamma + s.beta * t.x, y: s.beta * t.y });
      }
      const q = scale(mul(w, w), -1);
      return div(sub(mul(q, this.z0), this.z1), sub(q, one));
    }
  }
  const klein = z => scale(z, 2 / (1 + abs2(z)));
  function boundaryPlanes(development, center) {
    const planes = [];
    for (const copy of development.visible) {
      const triangle = development.result.mesh.triangles[copy.triangleId];
      triangle.edgeIds.forEach((id, opposite) => {
        if (development.result.mesh.edges[id].triangles.length !== 1) return;
        const a = klein(P.toOrigin(copy.vertices[(opposite + 1) % 3], center));
        const b = klein(P.toOrigin(copy.vertices[(opposite + 2) % 3], center));
        let n = { x: b.y - a.y, y: a.x - b.x };
        n = scale(n, 1 / Math.hypot(n.x, n.y));
        let c = n.x * a.x + n.y * a.y;
        if (c < 0) { n = scale(n, -1); c = -c; }
        if (!(c > 1e-7 && c < 1)) throw new Error('Choose a launch point strictly inside the surface.');
        // A boundary lift is a complete geodesic. The Klein model turns its
        // supporting half-plane into n.k <= c. Merge collinear mesh segments.
        if (!planes.some(p => Math.hypot(p.n.x - n.x, p.n.y - n.y) < 2e-4 && Math.abs(p.c - c) < 2e-4)) planes.push({ n, c });
        if (planes.length > 512) throw new Error('The complete-interior preview exceeds its 512-boundary-lift limit. Use the reflecting view for this surface.');
      });
    }
    return planes;
  }
  function radialBoundary(planes, angle) {
    const unit = { x: Math.cos(angle), y: Math.sin(angle) };
    let k = 1;
    for (const { n, c } of planes) {
      const dot = n.x * unit.x + n.y * unit.y;
      if (dot > c) k = Math.min(k, c / dot);
    }
    return scale(unit, k / (1 + Math.sqrt(Math.max(0, 1 - k * k))));
  }
  function sampleBoundary(planes, count) {
    const tau = 2 * Math.PI, angles = [];
    for (let i = 0; i < count; i++) angles.push((i + 0.173) * tau / count);
    // Include the corners at the ideal endpoints of every discovered lift.
    for (const { n, c } of planes) {
      const theta = Math.atan2(n.y, n.x), delta = Math.acos(c);
      for (const a of [theta - delta, theta + delta]) angles.push((a + tau) % tau);
    }
    angles.sort((a, b) => a - b);
    return angles.filter((a, i) => !i || a - angles[i - 1] > 1e-8).map(a => radialBoundary(planes, a));
  }
  class InteriorMap {
    constructor(development, center, options = {}) {
      this.center = { ...center };
      this.planes = boundaryPlanes(development, center);
      if (!this.planes.length) throw new Error('No physical boundary lift was found in the finite neighborhood. Complete-interior mapping is unavailable here.');
      const samples = options.samples || 512;
      const coarse = new RiemannMap(sampleBoundary(this.planes, samples));
      this.map = new RiemannMap(sampleBoundary(this.planes, samples * 2));
      this.cache = new Map();
      this.renderCache = new Map();
      // Obtain the boundary correspondence through the inverse map. Forward
      // evaluation on a slit is ambiguous, and the true and sampled boundaries
      // differ slightly. Inverse images approached from D have a unique side.
      this.boundaryTable = Array.from({ length: 2048 }, (_, i) => {
        const angle = i * 2 * Math.PI / 2048;
        const point = this.map.inverse({ x: 0.99999 * Math.cos(angle), y: 0.99999 * Math.sin(angle) });
        return { source: (Math.atan2(point.y, point.x) + 2 * Math.PI) % (2 * Math.PI), angle };
      }).sort((a, b) => a.source - b.source);
      this.boundaryError = 0; this.refinementError = 0;
      for (let i = 0; i < 96; i++) {
        const edge = radialBoundary(this.planes, (i + 0.417) * 2 * Math.PI / 96);
        this.boundaryError = Math.max(this.boundaryError, Math.abs(Math.hypot(...Object.values(this.map.forward(edge))) - 1));
        for (const r of [0.25, 0.7, 0.95]) {
          const z = scale(edge, r), a = coarse.forward(z), b = this.map.forward(z);
          this.refinementError = Math.max(this.refinementError, Math.hypot(a.x - b.x, a.y - b.y));
        }
      }
      // These are discretization checks on a finite half-plane intersection,
      // not a certificate for the infinitely many undiscovered boundary lifts.
      if (!Number.isFinite(this.boundaryError + this.refinementError) || this.boundaryError > 0.01 || this.refinementError > 0.01) {
        throw new Error('Complete-interior map did not converge at this boundary resolution. Move the launch point farther inside or use the reflecting view.');
      }
    }
    forward(point, boundary = false) {
      if (boundary) return this.renderPoint(point, true);
      const key = `${point.x.toPrecision(13)},${point.y.toPrecision(13)},${boundary ? 1 : 0}`;
      if (this.cache.has(key)) return this.cache.get(key);
      const local = P.toOrigin(point, this.center);
      const p = this.map.forward(local);
      if (!Number.isFinite(abs2(p))) throw new Error('Interior map reached numerical precision.');
      if (this.cache.size < 200000) this.cache.set(key, p);
      return p;
    }
    boundaryPoint(angle) {
      const tau = 2 * Math.PI, table = this.boundaryTable;
      angle = (angle + tau) % tau;
      let low = 0, high = table.length;
      while (low < high) { const mid = (low + high) >> 1; if (table[mid].source <= angle) low = mid + 1; else high = mid; }
      const a = table[(low - 1 + table.length) % table.length], b = table[low % table.length];
      const span = (b.source - a.source + tau) % tau, t = ((angle - a.source + tau) % tau) / span;
      const delta = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
      const target = a.angle + t * delta;
      return { x: Math.cos(target), y: Math.sin(target) };
    }
    renderPoint(point, boundary = false) {
      const key = `${point.x.toPrecision(13)},${point.y.toPrecision(13)},${boundary ? 1 : 0}`;
      if (this.renderCache.has(key)) return this.renderCache.get(key);
      const local = P.toOrigin(point, this.center), angle = Math.atan2(local.y, local.x);
      const edge = radialBoundary(this.planes, angle), ratio = Math.hypot(local.x, local.y) / Math.hypot(edge.x, edge.y);
      let p;
      if (boundary) p = this.boundaryPoint(angle);
      else if (ratio <= 0.95) p = this.forward(point);
      else {
        // Display-only collar interpolation reconciles the physical boundary
        // with the nearby sampled Jordan boundary. It is not an exact conformal
        // map or a new metric solver. The analytic map above and disk geodesic
        // remain separate. Convex interpolation keeps interior artwork in D.
        const a = this.map.forward(scale(edge, 0.95)), b = this.boundaryPoint(angle);
        if (!(abs2(a) < 1)) throw new Error('The boundary collar is unresolved. Move the launch point farther inside.');
        const t = Math.max(0, Math.min(1, (ratio - 0.95) / 0.05));
        p = add(scale(a, 1 - t), scale(b, t));
      }
      if (this.renderCache.size < 200000) this.renderCache.set(key, p);
      return p;
    }
    inverse(point) { return P.fromOrigin(this.map.inverse(point), this.center); }
  }
  class DiskGeodesic {
    constructor(start, direction) {
      if (!(abs2(start) < 1 - 1e-10)) throw new Error('Launch the interior geodesic away from the ideal boundary.');
      this.start = { ...start };
      const length = Math.hypot(direction.x, direction.y);
      if (!(length > 0)) throw new Error('An interior launch direction is required.');
      this.direction = scale(direction, 1 / length);
      this.length = 0; this.position = { ...start }; this.points = [{ ...start }];
    }
    advance(distance) {
      // Unit hyperbolic speed. tanh(s/2) stays strictly below 1 at finite s;
      // stopping at 12 is a precision limit, never a boundary collision.
      this.length = Math.min(12, this.length + Math.max(0, distance));
      this.position = P.fromOrigin(scale(this.direction, Math.tanh(this.length / 2)), this.start);
      this.points.push({ ...this.position });
      if (this.points.length > 4000) this.points.splice(1, 1);
      return this.length < 12;
    }
  }
  return { RiemannMap, InteriorMap, DiskGeodesic, boundaryPlanes, radialBoundary, sampleBoundary };
});
