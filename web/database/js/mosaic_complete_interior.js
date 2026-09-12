(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare.js') : root.MosaicPoincare,
    typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare_uniformization.js') : root.MosaicPoincareUniformization);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MosaicCompleteInterior = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function(P, U) {
  'use strict';
  const LIMITS = Object.freeze({ radius: 5, copies: 10000, boundaryLifts: 512, length: 12, step: 0.02, tolerance: 1e-4 });
  const norm = p => Math.hypot(p.x, p.y);
  const unit = p => { const n = norm(p); if (!(n > 1e-12)) throw new Error('The local direction is numerically degenerate.'); return { x: p.x / n, y: p.y / n }; };
  const mix = (a, b, t) => ({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
  const identity = { planes: [], refinementError: 0, renderPoint: p => ({ ...p }), inverse: p => ({ ...p }) };

  // Hyperboloid interpolation becomes ordinary barycentric interpolation in
  // Klein coordinates, with weights multiplied by the vertices' time coordinates.
  function inverseTriangle(copy, triangle, point) {
    const center = copy.vertices[0];
    const vertices = copy.vertices.map(p => P.toOrigin(p, center));
    const z = P.toOrigin(point, center);
    const klein = p => ({ x: 2 * p.x / (1 + norm(p) ** 2), y: 2 * p.y / (1 + norm(p) ** 2) });
    let weights = P.barycentric(klein(z), vertices.map(klein)).map((v, i) => v * (1 - norm(vertices[i]) ** 2) / (1 + norm(vertices[i]) ** 2));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) < 1e-14) throw new Error('Inverse triangle coordinates are singular.');
    weights = weights.map(v => v / sum);
    return { weights, local: triangle.local.reduce((p, v, i) => ({ x: p.x + weights[i] * v.x, y: p.y + weights[i] * v.y }), { x: 0, y: 0 }) };
  }
  function jacobian(fn, p, h = 1e-6) {
    const a = fn({ x: p.x + h, y: p.y }), b = fn({ x: p.x - h, y: p.y });
    const c = fn({ x: p.x, y: p.y + h }), d = fn({ x: p.x, y: p.y - h });
    const j = [(a.x - b.x) / (2 * h), (c.x - d.x) / (2 * h), (a.y - b.y) / (2 * h), (c.y - d.y) / (2 * h)];
    const det = j[0] * j[3] - j[1] * j[2], scale = j.reduce((s, v) => s + v * v, 0);
    if (!Number.isFinite(det) || !(Math.abs(det) > 1e-9 * scale) || scale < 1e-18) throw new Error('The displayed mapping has a degenerate Jacobian.');
    return { j, det };
  }
  function solveLinear(j, p) { const d = j[0] * j[3] - j[1] * j[2]; return { x: (j[3] * p.x - j[1] * p.y) / d, y: (j[0] * p.y - j[2] * p.x) / d }; }

  class Controller {
    constructor() { this.listeners = new Set(); this.generation = 0; this.status = 'idle'; this.condition = ''; this.trail = []; this.playing = false; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    notify() { for (const listener of this.listeners) listener(this.snapshot()); }
    invalidate(reason = 'Geometry changed. Prepare a new complete-interior session.') {
      this.generation++; this.playing = false; this.status = 'idle'; this.condition = reason;
      this.result = this.development = this.map = this.pose = this.launchPose = this.ray = null; this.trail = []; this.notify();
    }
    prepare(result, sample) {
      this.invalidate('Developing the finite complete-interior approximation…');
      const id = sample ? P.locate(result, sample.tileIndex, sample.local) : 0;
      if (id == null) throw new Error('The launch is outside the discrete mesh.');
      this.development = new P.Development(result, id); this.result = result;
      this.development.verifyVertexFans();
      const triangle = result.mesh.triangles[id];
      this.hasLaunch = !!sample;
      this.seedSample = sample ? { ...sample, local: { ...sample.local } } : {
        tileIndex: triangle.tileIndex, local: triangle.local.reduce((p, v) => ({ x: p.x + v.x / 3, y: p.y + v.y / 3 }), { x: 0, y: 0 })
      };
      this.center = P.mapPoint(this.development.seed, triangle, this.seedSample.local);
      this.development.resetNeighborhood(this.development.seed, this.center, LIMITS.copies, LIMITS.radius);
      this.status = 'preparing'; this.notify(); return this.generation;
    }
    prepareStep(generation = this.generation, budget = 6) {
      if (generation !== this.generation || this.status !== 'preparing') return false;
      try {
        if (this.development.expand(budget)) return true;
        this.coverage = new Set(this.development.visible);
        this.map = this.result.mesh.vertices.some(v => v.boundary) ? new U.InteriorMap(this.development, this.center) : identity;
        this.status = 'ready'; this.condition = '';
        if (this.hasLaunch) this.launch(this.seedSample);
      } catch (error) { this.status = 'error'; this.pause(error.message); }
      this.notify(); return false;
    }
    forward(copy, local) { return this.map.renderPoint(P.mapPoint(copy, this.result.mesh.triangles[copy.triangleId], local)); }
    // Work in a nearby disk frame so finite differences remain resolved near
    // the rim. Newton solves the rendered collar, not its analytic precursor.
    inverseDisplay(target, previous) {
      if (this.map === identity) return { ...target };
      const attempt = initial => {
        let source = { ...initial };
        for (let i = 0; i < 18; i++) {
          const fn = q => P.toOrigin(this.map.renderPoint(P.fromOrigin(q, source)), target);
          const value = fn({ x: 0, y: 0 });
          const { j, det } = jacobian(fn, { x: 0, y: 0 });
          if (!(det > 0)) throw new Error('The displayed boundary collar is folded.');
          if (norm(value) < 1e-9) return source;
          const delta = solveLinear(j, value);
          let improved = false;
          for (let scale = 1; scale >= 1 / 128; scale /= 2) {
            const step = { x: -delta.x * scale, y: -delta.y * scale };
            if (norm(step) >= 0.8) continue;
            const next = P.fromOrigin(step, source);
            if (norm(P.toOrigin(this.map.renderPoint(next), target)) < norm(value)) { source = next; improved = true; break; }
          }
          if (!improved) break;
        }
        if (P.distance(this.map.renderPoint(source), target) > LIMITS.tolerance) throw new Error('Displayed-map inversion exceeds 10⁻⁴ hyperbolic units.');
        return source;
      };
      let analytic;
      try { analytic = this.map.inverse(target); } catch (_) { /* Previous position still supplies a continuous inverse. */ }
      const source = attempt(previous || analytic);
      if (analytic && P.distance(analytic, source) > 1e-4) {
        let other;
        try { other = attempt(analytic); } catch (_) { /* A rejected seed is not a second inverse. */ }
        if (other && P.distance(other, source) > LIMITS.tolerance) throw new Error('The displayed collar has ambiguous inverse coordinates.');
      }
      return source;
    }
    locateSource(source, start) {
      let copy = start; const seen = new Set();
      for (let i = 0; i < 128; i++) {
        if (!copy || !this.coverage.has(copy)) throw new Error('Finite radius-5 / 10,000-copy coverage exhausted.');
        if (seen.has(copy)) throw new Error('Ambiguous triangle crossing near a mesh vertex.');
        seen.add(copy);
        const triangle = this.result.mesh.triangles[copy.triangleId], inverse = inverseTriangle(copy, triangle, source);
        const minimum = Math.min(...inverse.weights);
        if (minimum >= -1e-8) {
          if (P.distance(P.mapPoint(copy, triangle, inverse.local), source) > LIMITS.tolerance) throw new Error('Triangle round trip exceeds 10⁻⁴ hyperbolic units.');
          return { copy, triangleId: copy.triangleId, tileIndex: triangle.tileIndex, source, ...inverse };
        }
        const opposite = inverse.weights.indexOf(minimum);
        if (this.result.mesh.edges[triangle.edgeIds[opposite]].triangles.length === 1) throw new Error('The physical boundary is at infinity; finite mapping accuracy is exhausted (no reflection).');
        copy = copy.neighbors.get(opposite);
      }
      throw new Error('Triangle crossing could not be resolved within finite coverage.');
    }
    checkedPose(disk, previous) {
      const source = this.inverseDisplay(disk, previous && previous.source);
      const pose = this.locateSource(source, previous ? previous.copy : this.development.seed);
      const fn = local => P.toOrigin(this.forward(pose.copy, local), disk);
      const { j, det } = jacobian(fn, pose.local);
      const base = jacobian(local => P.toOrigin(P.mapPoint(pose.copy, this.result.mesh.triangles[pose.triangleId], local), source), pose.local);
      if (det * base.det <= 0) throw new Error('The displayed mapping folds this triangle.');
      if (P.distance(this.forward(pose.copy, pose.local), disk) > LIMITS.tolerance) throw new Error('Forward/inverse agreement exceeds 10⁻⁴ hyperbolic units.');
      return { ...pose, disk: { ...disk }, jacobian: j };
    }
    launch(sample = this.seedSample) {
      if (!this.map) return false;
      const id = P.locate(this.result, sample.tileIndex, sample.local);
      const copy = this.development.seed.triangleId === id ? this.development.seed : (this.development.byTriangle.get(id) || []).find(c => this.coverage.has(c));
      if (!copy) throw new Error('The launch is outside frozen coverage.');
      const disk = this.forward(copy, sample.local);
      this.pose = this.checkedPose(disk, { copy, source: P.mapPoint(copy, this.result.mesh.triangles[id], sample.local) });
      this.launchPose = this.pose; this.launchDirection = sample.direction && { ...sample.direction };
      this.ray = null; this.length = 0; this.playing = false; this.condition = '';
      if (sample.direction) {
        const j = this.pose.jacobian, d = sample.direction;
        this.ray = unit({ x: j[0] * d.x + j[1] * d.y, y: j[2] * d.x + j[3] * d.y });
        this.pose.direction = unit(sample.direction);
      }
      this.trail = [this.entry(this.pose)]; this.notify(); return true;
    }
    at(length) { const r = Math.tanh(length / 2); return P.fromOrigin({ x: r * this.ray.x, y: r * this.ray.y }, this.launchPose.disk); }
    entry(pose, breakBefore = false) { return { x: pose.disk.x, y: pose.disk.y, disk: { ...pose.disk }, local: { ...pose.local }, tileIndex: pose.tileIndex, triangleId: pose.triangleId, copyId: pose.copy.id, breakBefore }; }
    resolve(a, b, start, depth = 0) {
      const disk = this.at(b), end = this.checkedPose(disk, start);
      const middle = this.checkedPose(this.at((a + b) / 2), start);
      if (start.copy === end.copy && start.copy === middle.copy) return [end];
      if (depth >= 22 || b - a < 1e-8) {
        const edge = [...start.copy.neighbors].find(([, next]) => next === end.copy);
        if (!edge) throw new Error('A seam crossing is ambiguous at numerical precision.');
        // Exit and entry are separate source coordinates even for self-gluing.
        const exit = { ...start, ...inverseTriangle(start.copy, this.result.mesh.triangles[start.triangleId], end.source), disk: end.disk, source: end.source };
        const t = this.result.mesh.triangles[start.triangleId];
        const next = this.result.mesh.triangles[end.triangleId];
        const seam = t.tileIndex !== next.tileIndex || Math.hypot(exit.local.x - end.local.x, exit.local.y - end.local.y) > 1e-5;
        return [exit, { ...end, breakBefore: seam, crossing: { from: start.copy.id, to: end.copy.id, edgeId: t.edgeIds[edge[0]] } }];
      }
      const first = this.resolve(a, (a + b) / 2, start, depth + 1);
      return first.concat(this.resolve((a + b) / 2, b, first[first.length - 1], depth + 1));
    }
    play() { if (this.status !== 'ready' || !this.ray || this.condition) return false; this.playing = true; this.notify(); return true; }
    pause(reason = '') { this.playing = false; if (reason) this.condition = reason; this.notify(); }
    advance(distance) {
      if (!this.playing || !Number.isFinite(distance) || distance <= 0) return this.snapshot();
      const target = Math.min(LIMITS.length, this.length + distance);
      while (this.length < target - 1e-12) {
        let step = Math.min(LIMITS.step, target - this.length), accepted = null, failure;
        while (step >= 1e-7) {
          try { accepted = this.resolve(this.length, this.length + step, this.pose); break; }
          catch (error) { failure = error; step /= 2; }
        }
        if (!accepted) { this.pause(failure.message); break; }
        this.length += step; this.pose = accepted[accepted.length - 1];
        const tangent = P.toOrigin(this.at(this.length + 1e-6), this.pose.disk);
        this.pose.direction = unit(solveLinear(this.pose.jacobian, tangent));
        for (const pose of accepted) this.trail.push({ ...this.entry(pose, !!pose.breakBefore), crossing: pose.crossing });
      }
      if (this.length >= LIMITS.length - 1e-10) this.pause('Arclength-12 numerical limit reached; no boundary collision.');
      this.notify(); return this.snapshot();
    }
    restart() {
      if (!this.launchPose) return false;
      this.pose = this.launchPose; this.length = 0; this.condition = ''; this.playing = false;
      this.trail = [this.entry(this.pose)]; this.notify(); return true;
    }
    clear() { this.pose = this.launchPose = this.ray = null; this.trail = []; this.length = 0; this.playing = false; this.condition = ''; this.notify(); }
    snapshot() {
      const p = this.pose;
      return { generation: this.generation, status: this.status, playing: this.playing, condition: this.condition, length: this.length || 0,
        position: p && { ...p.disk }, disk: p && { ...p.disk }, local: p && { ...p.local }, direction: p && p.direction && { ...p.direction },
        tileIndex: p && p.tileIndex, triangleId: p && p.triangleId, copyId: p && p.copy.id,
        points: this.trail, trailSegments: this.trail, launch: this.launchPose && { ...this.launchPose.disk } };
    }
  }
  return { Controller, inverseTriangle, jacobian, LIMITS };
});
