(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare.js') : root.MosaicPoincare,
    typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare_uniformization.js') : root.MosaicPoincareUniformization,
    typeof module !== 'undefined' && module.exports ? require('./mosaic_intrinsic_metric.js') : root.MosaicIntrinsicMetric);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MosaicCompleteInterior = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function(P, U, I) {
  'use strict';
  const LIMITS = Object.freeze({ radius: 5, copies: 10000, boundaryLifts: 512, length: 12, step: 0.02, tolerance: 1e-4 });
  const norm = p => Math.hypot(p.x, p.y);
  const unit = p => { const n = norm(p); if (!(n > 1e-12)) throw new Error('The local direction is numerically degenerate.'); return { x: p.x / n, y: p.y / n }; };
  const identity = { planes: [], refinementError: 0, renderPoint: p => ({ ...p }), inverse: p => ({ ...p }) };

  // Hyperboloid interpolation becomes ordinary barycentric interpolation in
  // Klein coordinates, with weights multiplied by the vertices' time coordinates.
  function inverseTriangle(copy, triangle, point) {
    const center = copy.vertices[0];
    const vertices = copy.vertices.map(p => P.toOrigin(p, center));
    const z = P.toOrigin(point, center);
    const klein = p => ({ x: 2 * p.x / (1 + norm(p) ** 2), y: 2 * p.y / (1 + norm(p) ** 2) });
    const kleinWeights = P.barycentric(klein(z), vertices.map(klein));
    let weights = kleinWeights.map((v, i) => v * (1 - norm(vertices[i]) ** 2) / (1 + norm(vertices[i]) ** 2));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) < 1e-14) throw new Error('Inverse triangle coordinates are singular.');
    weights = weights.map(v => v / sum);
    return { kleinWeights, weights, local: localPoint(triangle, weights) };
  }
  function localPoint(triangle, weights) {
    return triangle.local.reduce((p, v, i) => ({ x: p.x + weights[i] * v.x, y: p.y + weights[i] * v.y }), { x: 0, y: 0 });
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

  class FrozenController {
    constructor() { this.listeners = new Set(); this.generation = 0; this.status = 'idle'; this.condition = ''; this.trail = []; this.playing = false; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    notify() { for (const listener of this.listeners) listener(this.snapshot()); }
    invalidate(reason = 'Geometry changed. Prepare a new complete-interior session.') {
      this.generation++; this.playing = false; this.status = 'idle'; this.condition = reason;
      this.result = this.development = this.map = this.pose = this.launchPose = this.ray = this.coverage = null;
      this.length = 0; this.trail = []; this.notify();
    }
    prepare(result, sample) {
      this.invalidate('Developing the finite complete-interior approximation…');
      if (!result || result.status !== 'ready' || result.method !== 'discrete') throw new Error('A ready discrete hyperbolic metric is required.');
      const id = sample ? P.locate(result, sample.tileIndex, sample.local) : 0;
      if (id == null) throw new Error('The launch is outside the discrete mesh.');
      this.development = new P.Development(result, id); this.result = result;
      if (this.development.verifyVertexFans() > LIMITS.tolerance) throw new Error('Numerical loop closure exceeds 10⁻⁴ hyperbolic units.');
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
        if (this.development.warnings.size) throw new Error([...this.development.warnings].join(' '));
        this.coverage = new Set(this.development.visible);
        this.map = this.result.mesh.vertices.some(v => v.boundary) ? new U.InteriorMap(this.development, this.center) : identity;
        this.status = 'ready'; this.condition = '';
        if (this.hasLaunch) this.launch(this.seedSample);
      } catch (error) { this.status = 'error'; this.pause(error.message); }
      this.notify(); return false;
    }
    forward(copy, local) { return this.map.renderPoint(P.mapPoint(copy, this.result.mesh.triangles[copy.triangleId], local)); }
    neighbor(copy, opposite) {
      if (copy.neighbors.has(opposite)) return copy.neighbors.get(opposite);
      // The BFS can hit its cap before linking two already visible copies.
      // Finish that correspondence without expanding the frozen neighborhood.
      const candidate = P.adjacent(this.result, copy, opposite);
      const next = candidate && (this.development.byTriangle.get(candidate.triangleId) || []).find(c => this.coverage.has(c) && P.matching(c, candidate));
      if (next) {
        copy.neighbors.set(opposite, next);
        const edgeId = this.result.mesh.triangles[copy.triangleId].edgeIds[opposite];
        next.neighbors.set(this.result.mesh.triangles[next.triangleId].edgeIds.indexOf(edgeId), copy);
      }
      return next || null;
    }
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
    locateSource(source, start, disk) {
      let copy = start; const seen = new Set();
      let reason = 'Triangle lookup could not be verified within 10⁻⁴ hyperbolic units.';
      const inspect = candidate => {
        const triangle = this.result.mesh.triangles[candidate.triangleId];
        const inverse = inverseTriangle(candidate, triangle, source);
        // Half-plane tests use Klein weights. Extrapolated hyperboloid weights
        // can change sign when normalized outside a triangle.
        if (Math.min(...inverse.kleinWeights) < -1e-12) return { inverse };
        const positive = inverse.weights.map(w => Math.max(0, w));
        const sum = positive.reduce((a, b) => a + b, 0), weights = positive.map(w => w / sum);
        const local = localPoint(triangle, weights);
        if (P.distance(P.mapPoint(candidate, triangle, local), source) > LIMITS.tolerance) throw new Error('Triangle round trip exceeds 10⁻⁴ hyperbolic units.');
        return { inverse, pose: { copy: candidate, triangleId: candidate.triangleId, tileIndex: triangle.tileIndex, source, ...inverse, weights, local } };
      };
      for (let i = 0; i < 128; i++) {
        if (!copy || !this.coverage.has(copy)) { reason = 'Finite radius-5 / 10,000-copy coverage exhausted.'; break; }
        if (seen.has(copy)) break;
        seen.add(copy);
        const { inverse, pose } = inspect(copy);
        if (pose) return pose;
        const triangle = this.result.mesh.triangles[copy.triangleId];
        const opposite = inverse.kleinWeights.indexOf(Math.min(...inverse.kleinWeights));
        if (this.result.mesh.edges[triangle.edgeIds[opposite]].triangles.length === 1) {
          reason = 'The physical boundary is at infinity; finite mapping accuracy is exhausted (no reflection).';
          break;
        }
        copy = this.neighbor(copy, opposite);
      }
      // A greedy walk can cycle at a numerically closed vertex fan. Search all
      // outgoing half-planes there before diagnosing an unavailable inverse.
      const queue = [...seen], visited = new Set(queue);
      let snapped = null, bestError = LIMITS.tolerance;
      for (let i = 0; i < queue.length && i < 512; i++) {
        const candidate = queue[i], triangle = this.result.mesh.triangles[candidate.triangleId];
        const { inverse, pose } = inspect(candidate);
        if (pose) return pose;
        for (let opposite = 0; opposite < 3; opposite++) {
          if (inverse.kleinWeights[opposite] > 1e-8) continue;
          const next = this.neighbor(candidate, opposite);
          if (!next || !this.coverage.has(next)) continue;
          if (!visited.has(next)) { visited.add(next); queue.push(next); }
          // Matched copies may leave a gap below the loop-closure tolerance.
          // Snap only to a verified shared edge, never a physical boundary.
          const pair = this.edgePair(candidate, opposite, next, source, disk);
          if (pair && pair.error < bestError) {
            bestError = pair.error;
            snapped = { copy: candidate, triangleId: candidate.triangleId, tileIndex: triangle.tileIndex, source, weights: pair.from.weights, local: pair.from.local };
          }
        }
      }
      if (snapped) return snapped;
      throw new Error(reason);
    }
    edgePair(copy, opposite, next, source, disk) {
      const triangle = this.result.mesh.triangles[copy.triangleId], other = this.result.mesh.triangles[next.triangleId];
      const inverse = inverseTriangle(copy, triangle, source);
      const weights = inverse.weights.map((w, i) => i === opposite ? 0 : Math.max(0, w));
      const sum = weights.reduce((a, b) => a + b, 0);
      if (!(sum > 0)) return null;
      const fromWeights = weights.map(w => w / sum);
      const toWeights = other.ids.map(id => {
        const i = triangle.ids.indexOf(id); return i < 0 ? 0 : fromWeights[i];
      });
      const from = { weights: fromWeights, local: localPoint(triangle, fromWeights) };
      const to = { weights: toWeights, local: localPoint(other, toWeights) };
      const error = Math.max(P.distance(P.mapPoint(copy, triangle, from.local), source), P.distance(P.mapPoint(next, other, to.local), source));
      if (error > LIMITS.tolerance) return null;
      if (disk && Math.max(P.distance(this.forward(copy, from.local), disk), P.distance(this.forward(next, to.local), disk)) > LIMITS.tolerance) return null;
      return { from, to, error };
    }
    crossFan(start, end) {
      // At a vertex the outgoing face need not share an edge with the incoming
      // face. Traverse only edges incident to the same checked event position.
      const queue = [{ copy: start.copy, path: [] }], seen = new Set([start.copy]);
      for (let i = 0; i < queue.length && i < 128; i++) {
        const item = queue[i];
        if (item.copy === end.copy) {
          const poses = [];
          for (const { copy, next, opposite, pair } of item.path) {
            const t = this.result.mesh.triangles[copy.triangleId], n = this.result.mesh.triangles[next.triangleId];
            const exit = { ...start, ...pair.from, copy, triangleId: t.id, tileIndex: t.tileIndex, disk: end.disk, source: end.source };
            const seam = t.tileIndex !== n.tileIndex || norm({ x: pair.from.local.x - pair.to.local.x, y: pair.from.local.y - pair.to.local.y }) > 1e-5;
            poses.push(exit, { ...end, ...pair.to, copy: next, triangleId: n.id, tileIndex: n.tileIndex, breakBefore: seam,
              crossing: { from: copy.id, to: next.id, edgeId: t.edgeIds[opposite] } });
          }
          poses.push(end);
          return poses;
        }
        for (let opposite = 0; opposite < 3; opposite++) {
          const next = this.neighbor(item.copy, opposite);
          if (!next || !this.coverage.has(next) || seen.has(next)) continue;
          const pair = this.edgePair(item.copy, opposite, next, end.source, end.disk);
          if (!pair) continue;
          seen.add(next);
          queue.push({ copy: next, path: item.path.concat({ copy: item.copy, next, opposite, pair }) });
        }
      }
      throw new Error('Cannot verify the mesh-vertex or seam transition within 10⁻⁴ hyperbolic units.');
    }
    checkedPose(disk, previous) {
      const source = this.inverseDisplay(disk, previous && previous.source);
      const pose = this.locateSource(source, previous ? previous.copy : this.development.seed, disk);
      const fn = local => P.toOrigin(this.forward(pose.copy, local), disk);
      const { j, det } = jacobian(fn, pose.local);
      const base = jacobian(local => P.toOrigin(P.mapPoint(pose.copy, this.result.mesh.triangles[pose.triangleId], local), source), pose.local);
      if (det * base.det <= 0) throw new Error('The displayed mapping folds this triangle.');
      if (P.distance(this.forward(pose.copy, pose.local), disk) > LIMITS.tolerance) throw new Error('Forward/inverse agreement exceeds 10⁻⁴ hyperbolic units.');
      return { ...pose, disk: { ...disk }, jacobian: j };
    }
    launch(sample = this.seedSample) {
      if (!this.map) return false;
      let id = P.locate(this.result, sample.tileIndex, sample.local);
      // Choosing a new direction at the paused ball keeps its current lift,
      // even after a noncontractible loop returns to the same source triangle.
      const current = this.pose && this.pose.tileIndex === sample.tileIndex
        && Math.min(...P.barycentric(sample.local, this.result.mesh.triangles[this.pose.triangleId].local)) >= -1e-7
        ? this.pose.copy : null;
      if (current) id = current.triangleId;
      const copy = current || (this.development.seed.triangleId === id ? this.development.seed : (this.development.byTriangle.get(id) || []).find(c => this.coverage.has(c)));
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
        return this.crossFan(start, end);
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
        let step = Math.min(LIMITS.step, target - this.length), accepted = null, failure, direction;
        while (step >= 1e-7) {
          try {
            const proposed = this.resolve(this.length, this.length + step, this.pose);
            const end = proposed[proposed.length - 1];
            const tangent = P.toOrigin(this.at(this.length + step + 1e-6), end.disk);
            direction = unit(solveLinear(end.jacobian, tangent));
            accepted = proposed; break;
          }
          catch (error) { failure = error; step /= 2; }
        }
        if (!accepted) { this.pause(failure.message); break; }
        this.length += step; this.pose = accepted[accepted.length - 1];
        this.pose.direction = direction;
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
  // Motion owns only a small, replaceable local atlas. No renderer, artwork
  // map, viewport radius or camera is consulted by this controller.
  class Controller extends FrozenController {
    invalidate(reason) {
      this.metric = null; this.frames = []; this.frame = 0; this.sequence = 0; this.nextCopy = 0;
      this.segmentLength = 0; this.segmentOrigin = null; this.curve = null; this.savedLaunch = null; this.collar = null;
      super.invalidate(reason);
    }
    prepare(result, sample) {
      const token = super.prepare(result, sample);
      this.metric = new I.Metric(result);
      this.resetAtlas(this.development.seed.triangleId);
      this.condition = 'Preparing a fixed intrinsic metric…';
      return token;
    }
    resetAtlas(id) {
      this.development = new P.Development(this.result, id);
      const insert = this.development.insert.bind(this.development);
      this.development.seed.id = this.nextCopy++;
      this.development.insert = candidate => {
        const n = this.development.copies.length, copy = insert(candidate);
        if (this.development.copies.length > n) copy.id = this.nextCopy++;
        return copy;
      };
      this.coverage = new Set([this.development.seed]);
      this.map = identity;
    }
    prepareStep(generation = this.generation, budget = 6) {
      if (generation !== this.generation || this.status !== 'preparing') return false;
      try {
        if (this.metric.step(budget)) return true;
        this.status = 'ready'; this.condition = '';
        const t = this.result.mesh.triangles[this.development.seed.triangleId];
        this.center = P.mapPoint(this.development.seed, t, this.seedSample.local);
        if (this.hasLaunch) this.launch(this.seedSample);
      } catch (error) { this.status = 'error'; this.pause(error.message); }
      this.notify(); return false;
    }
    neighbor(copy, opposite) {
      const next = this.development.neighbor(copy, opposite);
      if (next) this.coverage.add(next);
      return next;
    }
    launch(sample = this.seedSample) {
      if (!this.metric || this.metric.status !== 'ready') return false;
      const id = P.locate(this.result, sample.tileIndex, sample.local);
      if (id == null) throw new Error('The launch is outside the intrinsic mesh.');
      const current = this.pose && this.pose.tileIndex === sample.tileIndex && Math.min(...P.barycentric(sample.local, this.result.mesh.triangles[this.pose.triangleId].local)) >= -1e-7;
      if (!current) { this.resetAtlas(id); this.pose = null; this.generation++; this.frames = []; this.frame = 0; }
      super.launch(sample);
      this.savedLaunch = { tileIndex: sample.tileIndex, local: { ...sample.local }, direction: sample.direction && { ...sample.direction } };
      this.segmentLength = 0; this.segmentOrigin = { ...this.pose.disk }; this.heading = this.ray && Math.atan2(this.ray.y, this.ray.x); this.collar = null;
      this.center = { ...this.pose.disk };
      this.notify(); return true;
    }
    entry(pose, breakBefore = false) { return { ...super.entry(pose, breakBefore), sequence: ++this.sequence, frame: this.frame }; }
    at(length) {
      if (this.curve) return this.curve(length).point;
      const r = Math.tanh((length - this.segmentLength) / 2);
      return P.fromOrigin({ x: r * this.ray.x, y: r * this.ray.y }, this.segmentOrigin || this.launchPose.disk);
    }
    rebase() {
      const center = { ...this.pose.disk }, oldPose = this.pose;
      const tangent = this.metric.bordered ? { x: Math.cos(this.heading), y: Math.sin(this.heading) } : unit(P.toOrigin(this.at(this.length + 1e-5), center));
      const retained = new Set(this.development.copies.filter(c => c === oldPose.copy || c.vertices.every(p => P.distance(p, center) < 2)));
      this.development.copies = [...retained]; this.development.byTriangle = new Map();
      for (const c of retained) {
        c.vertices = c.vertices.map(p => P.toOrigin(p, center));
        for (const [edge, next] of c.neighbors) if (next && !retained.has(next)) c.neighbors.delete(edge);
        const list = this.development.byTriangle.get(c.triangleId) || []; list.push(c); this.development.byTriangle.set(c.triangleId, list);
      }
      this.development.seed = oldPose.copy; this.coverage = retained;
      // Development's constructor queue and the saved launch must not retain
      // discarded neighbor graphs after many chart changes.
      this.development.queue = [oldPose.copy]; this.development.cursor = 0;
      this.development.queued = new Set([oldPose.copy.id]); this.development.visible = [];
      this.pose = this.checkedPose({ x: 0, y: 0 }, { copy: oldPose.copy, source: { x: 0, y: 0 } });
      this.pose.direction = oldPose.direction;
      for (const p of this.trail) {
        if (p.hidden) continue;
        const z = P.toOrigin(p.disk, center);
        if (z.x * z.x + z.y * z.y > 1 - 1e-10) p.hidden = true;
        else { p.disk = z; p.x = z.x; p.y = z.y; }
      }
      if (this.launchPose !== oldPose && this.launchPose.disk) this.launchPose = { ...this.launchPose, disk: P.toOrigin(this.launchPose.disk, center) };
      else this.launchPose = { ...this.launchPose, disk: { x: 0, y: 0 } };
      delete this.launchPose.copy;
      this.center = { x: 0, y: 0 }; this.segmentOrigin = { x: 0, y: 0 }; this.segmentLength = this.length;
      this.ray = tangent; this.heading = Math.atan2(tangent.y, tangent.x);
      this.frame++; this.frames.push({ frame: this.frame, center }); if (this.frames.length > 64) this.frames.shift();
      this.notify();
    }
    derivative(state, start) {
      const pose = this.locateSource(state.point, start.copy);
      const m = this.metric.sample(pose.copy, state.point), z = state.point, factor = (1 - z.x * z.x - z.y * z.y) / 2;
      if (!(factor > 0) || !Number.isFinite(m.value) || m.value <= 0) throw new Error('The intrinsic boundary chart needs refinement.');
      const c = Math.cos(state.heading), s = Math.sin(state.heading);
      return { x: factor * m.value * c, y: factor * m.value * s,
        heading: factor * (-s * (m.value * z.x / factor - m.gradient.x) + c * (m.value * z.y / factor - m.gradient.y)) };
    }
    integrate(state, distance, start) {
      const add = (a, k, h) => ({ point: { x: a.point.x + h * k.x, y: a.point.y + h * k.y }, heading: a.heading + h * k.heading });
      const a = this.derivative(state, start), b = this.derivative(add(state, a, distance / 2), start);
      const c = this.derivative(add(state, b, distance / 2), start), d = this.derivative(add(state, c, distance), start);
      return { point: { x: state.point.x + distance * (a.x + 2 * b.x + 2 * c.x + d.x) / 6, y: state.point.y + distance * (a.y + 2 * b.y + 2 * c.y + d.y) / 6 },
        heading: state.heading + distance * (a.heading + 2 * b.heading + 2 * c.heading + d.heading) / 6 };
    }
    enterCollar() {
      if (!this.metric.bordered || this.collar) return !!this.collar;
      const p = this.pose, initial = this.result.mesh.triangles[p.triangleId];
      if (this.metric.value(p.copy, p.disk) > 0.002) return false;
      const boundaryIds = initial.ids.filter(id => this.result.mesh.vertices[id].boundary);
      const queue = [p.copy], seen = new Set(queue);
      for (let k = 0; k < queue.length && k < 128; k++) {
      const copy = queue[k], t = this.result.mesh.triangles[copy.triangleId];
      for (let opposite = 0; opposite < 3; opposite++) {
        if (this.result.mesh.edges[t.edgeIds[opposite]].triangles.length !== 1) {
          if (boundaryIds.some(id => t.ids.includes(id) && t.ids[opposite] !== id)) {
            const next = this.neighbor(copy, opposite);
            if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
          }
          continue;
        }
        const frame = I.boundaryFrame(copy, t, opposite), q = I.fermi(frame, p.disk);
        if (!(q.d > 0 && q.d < 0.0005 && q.t >= 0 && q.t <= frame.length)) continue;
        const basis = this.collarBasis(frame, q.d, q.t), direction = { x: Math.cos(this.heading), y: Math.sin(this.heading) };
        this.collar = { copy, frame, r: Math.log(q.d), t: q.t,
          angle: Math.atan2(direction.x * basis.t.x + direction.y * basis.t.y, direction.x * basis.d.x + direction.y * basis.d.y) };
        return true;
      }
      }
      return false;
    }
    collarBasis(frame, d, t) {
      const h = 1e-6;
      const a = I.fromFermi(frame, d + h, t), b = I.fromFermi(frame, d - h, t);
      const c = I.fromFermi(frame, d, t + h), e = I.fromFermi(frame, d, t - h);
      return { d: unit({ x: a.x - b.x, y: a.y - b.y }), t: unit({ x: c.x - e.x, y: c.y - e.y }) };
    }
    advanceCollar(step) {
      const initial = this.collar;
      const derivative = q => {
        const d = Math.exp(q.r), w = Math.tanh(d), ratio = d < 1e-8 ? 1 - d * d / 3 : w / d;
        return { r: ratio * Math.cos(q.angle), t: w / Math.cosh(d) * Math.sin(q.angle), angle: (1 - 2 * w * w) * Math.sin(q.angle) };
      };
      const add = (q, v, h) => ({ r: q.r + h * v.r, t: q.t + h * v.t, angle: q.angle + h * v.angle });
      const a = derivative(initial), b = derivative(add(initial, a, step / 2));
      const c = derivative(add(initial, b, step / 2)), e = derivative(add(initial, c, step));
      const next = { ...initial };
      for (const key of ['r', 't', 'angle']) next[key] += step * (a[key] + 2 * b[key] + 2 * c[key] + e[key]) / 6;
      const crossings = [];
      while (next.t < 0 || next.t > next.frame.length) {
        const forward = next.t > next.frame.length, oldFrame = next.frame, oldCopy = next.copy;
        const oldTriangle = this.result.mesh.triangles[oldCopy.triangleId], vertex = oldTriangle.ids[forward ? oldFrame.j : oldFrame.i];
        const edge = this.result.mesh.edges.find(e => e.id !== oldFrame.edgeId && e.triangles.length === 1 && (e.a === vertex || e.b === vertex));
        if (!edge) throw new Error('The physical boundary has an unresolved vertex.');
        const queue = [oldCopy], seen = new Set(queue); let copy;
        for (let i = 0; i < queue.length && i < 128; i++) {
          const current = queue[i], t = this.result.mesh.triangles[current.triangleId];
          if (t.edgeIds.includes(edge.id)) { copy = current; break; }
          for (let j = 0; j < 3; j++) {
            if (t.ids[j] === vertex) continue;
            const n = this.neighbor(current, j);
            if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
          }
        }
        if (!copy) throw new Error('The boundary vertex fan did not close.');
        const t = this.result.mesh.triangles[copy.triangleId], frame = I.boundaryFrame(copy, t, t.edgeIds.indexOf(edge.id));
        if (t.ids[forward ? frame.i : frame.j] !== vertex) throw new Error('Inconsistent physical boundary orientation.');
        next.t = forward ? next.t - oldFrame.length : next.t + frame.length;
        next.frame = frame; next.copy = copy;
        crossings.push({ from: oldCopy.id, to: copy.id, boundaryVertex: vertex });
      }
      const d = Math.exp(next.r), point = I.fromFermi(next.frame, d, next.t);
      const pose = this.checkedPose(point, { copy: next.copy, source: point });
      const basis = this.collarBasis(next.frame, d, next.t);
      const tangent = { x: Math.cos(next.angle) * basis.d.x + Math.sin(next.angle) * basis.t.x, y: Math.cos(next.angle) * basis.d.y + Math.sin(next.angle) * basis.t.y };
      pose.direction = unit(solveLinear(pose.jacobian, tangent));
      this.pose = pose; this.heading = Math.atan2(tangent.y, tangent.x); this.length += step;
      this.collar = d > 0.00075 ? null : next;
      this.trail.push({ ...this.entry(pose, crossings.length > 0), collar: { edgeId: next.frame.edgeId, logDistance: next.r, along: next.t }, crossings });
    }
    advance(distance) {
      if (!this.playing || !Number.isFinite(distance) || distance <= 0) return this.snapshot();
      const target = this.length + distance;
      while (this.length < target - 1e-12) {
        if (this.enterCollar()) {
          try { this.advanceCollar(Math.min(LIMITS.step, target - this.length)); }
          catch (error) { this.pause(error.message); break; }
          if (this.trail.length > 6000) this.trail.splice(0, this.trail.length - 6000);
          continue;
        }
        if (P.distance(this.pose.disk, this.center) > 0.75 || this.development.copies.length > 512) this.rebase();
        let step = Math.min(LIMITS.step, target - this.length), accepted, endState, failure;
        const minimumStep = Math.min(1e-7, step);
        while (step >= minimumStep) {
          try {
            if (this.metric.bordered) {
              const state = { point: this.pose.disk, heading: this.heading }, start = this.pose, s0 = this.length;
              const full = this.integrate(state, step, start), half = this.integrate(state, step / 2, start), fine = this.integrate(half, step / 2, start);
              const value = this.metric.value(this.locateSource(fine.point, start.copy).copy, fine.point);
              if (P.distance(full.point, fine.point) / value > 1e-6 || Math.abs(full.heading - fine.heading) > 1e-5) throw new Error('Intrinsic geodesic step needs refinement.');
              endState = fine;
              this.curve = s => { const h = s - s0; return this.integrate(this.integrate(state, h / 2, start), h / 2, start); };
            }
            accepted = this.resolve(this.length, this.length + step, this.pose);
            const end = accepted[accepted.length - 1];
            const tangent = this.metric.bordered ? { x: Math.cos(endState.heading), y: Math.sin(endState.heading) } : P.toOrigin(this.at(this.length + step + 1e-6), end.disk);
            end.direction = unit(solveLinear(end.jacobian, tangent));
            break;
          } catch (error) { failure = error; accepted = null; step /= 2; }
          finally { this.curve = null; }
        }
        if (!accepted) { this.pause(failure.message); break; }
        this.length += step; this.pose = accepted[accepted.length - 1];
        if (endState) this.heading = endState.heading;
        for (const p of accepted) this.trail.push({ ...this.entry(p, !!p.breakBefore), crossing: p.crossing });
        if (this.trail.length > 6000) this.trail.splice(0, this.trail.length - 6000);
      }
      this.notify(); return this.snapshot();
    }
    restart() {
      if (!this.savedLaunch) return false;
      const sample = this.savedLaunch; this.pose = null;
      return this.launch(sample);
    }
    clear() { this.savedLaunch = null; this.collar = null; super.clear(); }
    snapshot() { return { ...super.snapshot(), intrinsic: true, frame: this.frame || 0, frames: this.frames || [], metricResidual: this.metric && this.metric.residual,
      collar: this.collar && { edgeId: this.collar.frame.edgeId, logDistance: this.collar.r, along: this.collar.t, angle: this.collar.angle } }; }
  }
  return { Controller, FrozenController, inverseTriangle, jacobian, LIMITS };
});
