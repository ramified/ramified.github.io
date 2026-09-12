(function(root) {
  'use strict';
  const P = root.MosaicPoincare;
  const U = root.MosaicPoincareUniformization;
  const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);
  const unitWeights = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  class View {
    constructor(options) {
      this.options = options;
      const element = suffix => document.getElementById(`${options.prefix || 'poincare'}-${suffix}`);
      this.canvas = element('canvas');
      this.card = element('card');
      this.status = element('status');
      this.follow = element('follow');
      this.mesh = element('mesh');
      this.solve = element('use-discrete');
      this.model = element('model');
      this.play = element('interior-play');
      this.explanation = element('explanation');
      if (this.model) this.model.addEventListener('change', () => options.setMotionMode(this.model.value));
      if (this.play) this.play.addEventListener('click', () => options.play());
      this.restart = element('restart');
      if (this.restart) this.restart.addEventListener('click', () => options.restart());
      if (options.controller) options.controller.subscribe(() => this.schedule());
      this.background = document.createElement('canvas');
      this.camera = new P.Camera(); this.frame = null; this.dirty = true;
      this.follow.addEventListener('change', () => {
        if (this.follow.checked && this.trace && this.trace.error) this.reset();
        this.schedule(true);
      });
      this.mesh.addEventListener('change', () => this.schedule(true));
      this.solve.addEventListener('click', () => options.useDiscrete());
      if (options.wide !== false && element('wide')) element('wide').addEventListener('click', event => {
        event.preventDefault();
        if (root.CalculatorCards) root.CalculatorCards.setWide(this.card, !this.card.classList.contains('wide'));
        this.schedule(true);
      });
      this.recenter = element('recenter');
      if (this.recenter) this.recenter.addEventListener('click', () => this.resetCamera());
      if (element('open')) element('open').addEventListener('click', () => {
        this.card.classList.remove('collapsed'); this.card.scrollIntoView({ block: 'nearest' }); this.schedule(true);
      });
      if (element('close')) element('close').addEventListener('click', () => this.card.classList.add('collapsed'));
      if (options.exploration) {
        this.canvas.addEventListener('click', event => {
          if (this.dragDistance > 4 || !this.isOpen() || !this.interiorMap) return;
          const disk = this.camera.unproject(this.diskPoint(event)), controller = options.controller;
          try {
            const source = controller.inverseDisplay(disk, controller.pose && controller.pose.source);
            const copy = controller.development.nearestCopy(source);
            this.selectCopy(controller.locateSource(source, copy).copy);
          } catch (error) { this.status.textContent = `Exploration stopped: ${error.message}`; }
        });
        for (let i = 0; i < 3; i++) {
          const button = element(`neighbor-${i}`);
          if (button) button.addEventListener('click', () => this.exploreNeighbor(i));
        }
      }
      let wasOpen = this.isOpen();
      new MutationObserver(() => {
        const open = this.isOpen();
        if (open && !wasOpen) { this.reset(); this.schedule(true); }
        else if (open) this.schedule(true);
        else if (this.frame != null) { cancelAnimationFrame(this.frame); this.frame = null; }
        wasOpen = open;
      }).observe(this.card, { attributes: true, attributeFilter: ['class'] });
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.schedule(true)).observe(this.canvas);
      this.canvas.addEventListener('pointerdown', event => {
        if (!this.isOpen()) return;
        const point = this.diskPoint(event);
        if (Math.hypot(point.x, point.y) >= 0.96) return;
        this.dragDistance = 0; this.dragClient = { x: event.clientX, y: event.clientY };
        this.drag = point; this.follow.checked = false; this.canvas.setPointerCapture(event.pointerId);
      });
      this.canvas.addEventListener('pointermove', event => {
        if (!this.drag) return;
        const point = this.diskPoint(event);
        if (Math.hypot(point.x, point.y) >= 0.96) return;
        this.dragDistance = Math.max(this.dragDistance, Math.hypot(event.clientX - this.dragClient.x, event.clientY - this.dragClient.y));
        this.camera.pan(this.drag, point); this.drag = point;
        this.schedule(true);
      });
      const endDrag = () => {
        if (!this.drag) return;
        this.drag = null;
        if (this.development && !this.interiorActive) this.development.resetNeighborhood(this.development.nearestCopy(this.camera.center), this.camera.center);
        this.schedule(true);
      };
      this.canvas.addEventListener('pointerup', endDrag);
      this.canvas.addEventListener('pointercancel', endDrag);
      this.canvas.addEventListener('lostpointercapture', endDrag);
      this.canvas.addEventListener('keydown', event => {
        if (!this.isOpen()) return;
        const delta = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.12], ArrowDown: [0, -0.12] }[event.key];
        if (!delta) return;
        event.preventDefault(); this.follow.checked = false;
        this.camera.pan({ x: 0, y: 0 }, { x: delta[0], y: delta[1] });
        if (this.development && !this.interiorActive) this.development.resetNeighborhood(this.development.nearestCopy(this.camera.center), this.camera.center);
        this.schedule(true);
      });
    }
    isOpen() { return (!this.options.enabled || this.options.enabled()) && !this.card.classList.contains('collapsed') && !this.card.hidden; }
    resetCamera() {
      this.follow.checked = !!this.options.exploration;
      this.selection = null;
      this.camera = new P.Camera(this.launchCenter || { x: 0, y: 0 });
      if (this.development && !this.interiorActive) this.development.resetNeighborhood(this.development.seed, this.camera.center);
      this.schedule(true);
    }
    selectCopy(copy) {
      const controller = this.options.controller;
      if (!controller.coverage || !controller.coverage.has(copy)) return false;
      this.selection = copy; this.follow.checked = false;
      const point = P.interpolate(copy.vertices, [1 / 3, 1 / 3, 1 / 3]);
      this.camera = new P.Camera(this.interiorMap.renderPoint(point)); this.schedule(true); return true;
    }
    selectTile(index) {
      if (!this.development) return false;
      const candidates = this.development.visible.filter(copy => this.result.mesh.triangles[copy.triangleId].tileIndex === index);
      candidates.sort((a, b) => P.distance(this.camera.center, this.interiorMap.renderPoint(P.interpolate(a.vertices, [1 / 3, 1 / 3, 1 / 3])))
        - P.distance(this.camera.center, this.interiorMap.renderPoint(P.interpolate(b.vertices, [1 / 3, 1 / 3, 1 / 3]))));
      if (!candidates.length) { this.status.textContent = 'This tile is outside the frozen coverage.'; return false; }
      return this.selectCopy(candidates[0]);
    }
    exploreNeighbor(opposite) {
      const current = this.selection || this.options.controller.pose && this.options.controller.pose.copy || this.development && this.development.seed;
      const next = current && current.neighbors.get(opposite);
      if (!next || !this.selectCopy(next)) { this.status.textContent = 'Exploration stops at physical boundaries or unavailable finite coverage.'; return false; }
      return true;
    }
    reset() {
      this.development = null; this.trace = null; this.result = null; this.artworkKey = null; this.dirty = true;
      this.interiorMap = null; this.interiorPath = null; this.interiorRunning = false; this.lastInteriorTime = null; this.selection = null; this.sharedGeneration = null; this.mapError = '';
      this.painting = false;
    }
    sync() {
      if (!this.isOpen()) return;
      const snapshot = this.options.snapshot();
      if (this.result !== snapshot.result || this.billiard !== snapshot.billiard) this.reset();
      this.billiard = snapshot.billiard;
      this.schedule();
    }
    schedule(dirty = false) {
      this.dirty = this.dirty || dirty;
      if (this.frame != null || !this.isOpen()) return;
      this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
    }
    ensure() {
      const snapshot = this.options.snapshot();
      this.solve.hidden = snapshot.method === 'discrete' && snapshot.metric !== 'flat';
      const unavailable = !snapshot.eligible ? snapshot.reason
        : snapshot.method !== 'discrete' ? 'The disk requires discrete triangle lengths. Use the discrete solver.'
        : snapshot.metric === 'flat' ? (snapshot.message || 'Select the hyperbolic metric to develop this surface.')
        : snapshot.status !== 'ready' ? (snapshot.message || 'Waiting for a ready discrete metric.') : '';
      if (unavailable || !snapshot.result) {
        this.reset();
        if (this.play) this.play.hidden = true;
        this.status.textContent = unavailable || 'Waiting for a ready discrete metric.'; return false;
      }
      if (this.result !== snapshot.result || this.billiard !== snapshot.billiard) this.reset();
      this.billiard = snapshot.billiard;
      const bordered = snapshot.result.mesh.vertices.some(vertex => vertex.boundary);
      this.interiorActive = snapshot.metric === 'complete-interior';
      if (this.model) this.model.value = snapshot.metric;
      if (this.play) { this.play.hidden = !this.interiorActive; this.play.disabled = !this.interiorMap; }
      if (this.explanation) this.explanation.textContent = this.interiorActive
        ? 'Complete interior (approximation): one shared ball and trajectory on the main canvas and both disk views. Physical boundaries are at infinite distance. The finite uniformization and interpolated boundary collar are numerical approximations; motion pauses when inversion or coverage is insufficient.'
        : bordered
          ? 'Reflecting boundary metric: the physical boundary is geodesic and reachable. This is a development into a region of the ambient disk, not the complete Poincaré metric of the interior. The board billiard is shown as an approximate lifted trajectory.'
          : 'Closed surface: its hyperbolic metric is complete. The disk shows numerical triangle development and the board billiard as an approximate lifted trajectory. Only a finite neighborhood is drawn.';
      if (this.interiorActive) {
        const controller = this.options.controller;
        const shared = controller && controller.snapshot();
        if (!shared || shared.status !== 'ready' || controller.result !== snapshot.result) {
          this.status.textContent = shared && shared.condition || 'Preparing the shared complete-interior geometry…';
          this.play.disabled = true; return false;
        }
        this.result = snapshot.result; this.development = controller.development; this.interiorMap = controller.map;
        this.interiorPath = shared.position ? shared : null; this.interiorRunning = false;
        this.launchCenter = shared.launch || { x: 0, y: 0 };
        if (this.sharedGeneration !== shared.generation) {
          this.sharedGeneration = shared.generation; this.camera = new P.Camera(this.launchCenter); this.dirty = true; this.selection = null;
        }
        if (this.play) { this.play.disabled = !controller.ray || !!shared.condition; this.play.textContent = shared.playing ? 'Pause' : 'Play'; }
        if (this.restart) { this.restart.hidden = false; this.restart.disabled = !shared.position; }
        return true;
      }
      if (this.restart) this.restart.hidden = true;
      if (!this.development) {
        const sample = snapshot.sample;
        const seedId = sample ? P.locate(snapshot.result, sample.tileIndex, sample.local) : 0;
        this.development = new P.Development(snapshot.result, seedId == null ? 0 : seedId);
        this.development.verifyVertexFans();
        this.result = snapshot.result;
        if (sample && seedId != null && !this.interiorActive) this.trace = new P.LiftedTrail(this.development, this.development.seed, sample.local);
        const triangle = snapshot.result.mesh.triangles[this.development.seed.triangleId];
        this.sourceLaunchLocal = sample && seedId != null ? { ...sample.local } : {
          x: triangle.local.reduce((sum, p) => sum + p.x / 3, 0), y: triangle.local.reduce((sum, p) => sum + p.y / 3, 0)
        };
        this.sourceLaunchCenter = P.mapPoint(this.development.seed, triangle, this.sourceLaunchLocal);
        this.sourceLaunchDirection = { ...(sample && sample.direction || { x: 1, y: 0 }) };
        this.launchCenter = this.sourceLaunchCenter;
        this.camera = new P.Camera(this.launchCenter);
        this.development.resetNeighborhood(this.development.seed, this.launchCenter);
        this.dirty = true;
      }
      return true;
    }
    prepareInterior() { return !!this.interiorMap; }
    sample(tileIndex, local, color, length) {
      if (!this.isOpen()) return;
      try {
        if (!this.ensure()) return;
        if (this.interiorActive) return; // Reflecting board motion belongs to a different metric.
        if (!this.trace) {
          const id = P.locate(this.result, tileIndex, local);
          if (id == null) return;
          // A newly placed ball starts its own lift and camera normalization.
          this.reset(); this.ensure();
        }
        if (this.trace) {
          if (this.follow.checked && P.distance({ x: 0, y: 0 }, this.trace.position) > 4) {
            const center = this.trace.position;
            this.launchCenter = P.toOrigin(this.launchCenter, center);
            this.trace.rebase(center);
            this.camera = new P.Camera(); this.dirty = true;
          }
          this.trace.move(tileIndex, local, color, length);
          const snapshot = this.options.snapshot();
          this.trace.trim(snapshot.trailLength, snapshot.infiniteTrail);
        }
      } catch (error) { if (this.trace) this.trace.error = error.message; this.status.textContent = error.message; }
    }
    cross(tileIndex, local, color) {
      if (this.isOpen() && this.trace) this.trace.crossEdge(tileIndex, local, color);
    }
    reflect() { if (this.isOpen() && this.trace) this.trace.reflect(); }
    diskPoint(event) {
      const rect = this.canvas.getBoundingClientRect();
      const r = Math.min(rect.width, rect.height) / 2 - 12;
      return { x: (event.clientX - rect.left - rect.width / 2) / r, y: (event.clientY - rect.top - rect.height / 2) / r };
    }
    diskScreen(point) {
      const p = this.camera.project(point);
      return { x: this.width / 2 + p.x * this.radius, y: this.height / 2 + p.y * this.radius };
    }
    screen(point, boundary = false) {
      return this.diskScreen(this.interiorActive && this.interiorMap ? this.interiorMap.renderPoint(point, boundary) : point);
    }
    mappedWeights(copy, weights) {
      const triangle = this.result.mesh.triangles[copy.triangleId];
      const boundary = triangle.edgeIds.some((id, opposite) => Math.abs(weights[opposite]) < 1e-10 && this.result.mesh.edges[id].triangles.length === 1)
        || weights.some((weight, i) => weight > 1 - 1e-10 && this.result.mesh.vertices[triangle.ids[i]].boundary);
      return this.screen(P.interpolate(copy.vertices, weights), boundary);
    }
    render() {
      if (!this.isOpen()) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      this.width = rect.width; this.height = rect.height; this.radius = Math.min(rect.width, rect.height) / 2 - 12;
      this.dpr = Math.min(2, root.devicePixelRatio || 1);
      const w = Math.round(this.width * this.dpr), h = Math.round(this.height * this.dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = this.background.width = w; this.canvas.height = this.background.height = h; this.dirty = true;
      }
      const ctx = this.canvas.getContext('2d');
      try {
        if (!this.ensure()) { ctx.clearRect(0, 0, w, h); return; }
        if (this.interiorActive && !this.prepareInterior()) { ctx.clearRect(0, 0, w, h); return; }
        const activeTrace = this.interiorActive ? this.interiorPath : this.trace;
        if (this.follow.checked && activeTrace && !this.painting) {
          if (P.distance(this.camera.center, activeTrace.position) > 1e-8) {
            this.camera = new P.Camera(activeTrace.position); this.dirty = true;
          }
          if (!this.interiorActive && P.distance(this.development.center, this.camera.center) > 0.5) {
            this.development.resetNeighborhood(this.trace.copy, this.camera.center);
          }
        }
        if (this.recenter) {
          this.recenter.disabled = this.launchCenter.x ** 2 + this.launchCenter.y ** 2 >= 1 - 1e-9;
          this.recenter.title = this.recenter.disabled ? 'The initial lift is beyond numerical precision. Restart the billiard to return to its launch.' : 'Return to the initial lift';
        }
        const before = this.development.visible.length;
        const more = !this.interiorActive && this.development.expand(6);
        if (before !== this.development.visible.length) this.dirty = true;
        const artwork = this.options.artwork();
        if (artwork.key !== this.artworkKey) { this.artworkKey = artwork.key; this.dirty = true; }
        if (this.dirty || this.painting) { this.painting = this.paintBackground(artwork, this.dirty, 12); this.dirty = false; }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.drawImage(this.background, 0, 0);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.clip();
        if (activeTrace) {
          ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
          const points = activeTrace.points;
          const project = point => this.interiorActive ? this.diskScreen(point) : this.screen(point);
          for (let i = 1; i < points.length; i++) {
            if (points[i].breakBefore) continue;
            const a = project(points[i - 1]), b = project(points[i]);
            ctx.strokeStyle = points[i].color === 'purple' ? '#813da6' : '#1865d8';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          const p = project(activeTrace.position);
          ctx.fillStyle = '#db432d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        }
        if (this.selection) {
          const vertices = this.selection.vertices.map(p => this.screen(p));
          ctx.strokeStyle = '#e89b16'; ctx.lineWidth = 3; ctx.beginPath();
          vertices.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
        }
        ctx.restore();
        const warnings = [...this.development.warnings];
        if (this.trace && this.trace.error) warnings.push(`Lift paused: ${this.trace.error}`);
        const description = this.interiorActive
          ? `Complete-interior approximation · ${this.interiorMap.planes.length} boundary lifts · map refinement Δ ${this.interiorMap.refinementError.toExponential(1)} · shared trajectory s=${(this.options.controller.length || 0).toFixed(2)}${this.options.controller.condition ? ' · paused: ' + this.options.controller.condition : ''}`
          : 'Approximate lifted trajectory';
        this.status.textContent = `${description} · ${this.development.visible.length.toLocaleString()} triangle copies · ${more ? 'developing…' : 'finite radius-5 preview'}${this.painting ? ' · drawing artwork…' : ''}${this.development.queued.size >= this.development.limit ? ' · 10,000-copy limit' : ''}${warnings.length ? ' · ' + warnings.join(' ') : ''}`;
        if (more || this.painting) this.schedule();
      } catch (error) { this.status.textContent = `Disk view: ${error.message}`; }
    }
    paintBackground(artwork, restart = true, budgetMs = Infinity) {
      const ctx = this.background.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (restart) {
        this.paintCursor = 0;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, this.width, this.height);
      }
      ctx.save(); ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.clip();
      if (restart) { ctx.fillStyle = '#ede8df'; ctx.fillRect(0, 0, this.width, this.height); }
      const deadline = Date.now() + budgetMs;
      for (; this.paintCursor < this.development.visible.length && Date.now() <= deadline; this.paintCursor++) {
        const copy = this.development.visible[this.paintCursor];
        const triangle = this.result.mesh.triangles[copy.triangleId];
        const points = unitWeights.map(weights => this.mappedWeights(copy, weights));
        const size = Math.max(...points.map((p, i) => Math.hypot(p.x - points[(i + 1) % 3].x, p.y - points[(i + 1) % 3].y)));
        if (size < 0.7) continue;
        const source = triangle.local.map(p => artwork.sourcePoint(triangle.tileIndex, p));
        this.warp(ctx, artwork.canvas, copy, source, unitWeights, points, 0);
        triangle.edgeIds.forEach((edgeId, opposite) => {
          const edge = this.result.mesh.edges[edgeId];
          const boundary = edge.triangles.length === 1;
          if (boundary && this.interiorActive) return; // These lifts are on the ideal circle already drawn below.
          const seam = boundary || edge.triangles.some(id => this.result.mesh.triangles[id].tileIndex !== triangle.tileIndex);
          if (!boundary && !seam && !this.mesh.checked) return;
          const i = (opposite + 1) % 3, j = (opposite + 2) % 3;
          ctx.strokeStyle = boundary ? '#332e29' : this.mesh.checked ? '#537e9d66' : '#8d827b66';
          ctx.lineWidth = boundary ? 2 : 0.5;
          ctx.beginPath();
          const steps = Math.max(2, Math.min(40, Math.ceil(size / 8)));
          for (let n = 0; n <= steps; n++) {
            const weights = [0, 0, 0]; weights[i] = 1 - n / steps; weights[j] = n / steps;
            const p = this.mappedWeights(copy, weights);
            if (!n) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        });
      }
      ctx.restore(); ctx.strokeStyle = '#5f5b55'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.stroke();
      return this.paintCursor < this.development.visible.length;
    }
    warp(ctx, texture, copy, source, weights, target, depth) {
      const halves = [mid(weights[0], weights[1]), mid(weights[1], weights[2]), mid(weights[2], weights[0])];
      const projected = halves.map(w => this.mappedWeights(copy, w));
      const error = Math.max(...projected.map((p, i) => Math.hypot(p.x - (target[i].x + target[(i + 1) % 3].x) / 2, p.y - (target[i].y + target[(i + 1) % 3].y) / 2)));
      if (error > 0.6 && depth < 6) {
        [[weights[0], halves[0], halves[2]], [halves[0], weights[1], halves[1]], [halves[2], halves[1], weights[2]], halves].forEach(w => {
          this.warp(ctx, texture, copy, source, w, w.map(v => this.mappedWeights(copy, v)), depth + 1);
        });
        return;
      }
      const s = weights.map(w => ({ x: w.reduce((n, v, i) => n + v * source[i].x, 0), y: w.reduce((n, v, i) => n + v * source[i].y, 0) }));
      const ax = s[1].x - s[0].x, ay = s[1].y - s[0].y, bx = s[2].x - s[0].x, by = s[2].y - s[0].y;
      const d = ax * by - ay * bx;
      if (Math.abs(d) < 1e-10) return;
      const ux = target[1].x - target[0].x, uy = target[1].y - target[0].y, vx = target[2].x - target[0].x, vy = target[2].y - target[0].y;
      const a = (ux * by - vx * ay) / d, b = (uy * by - vy * ay) / d, c = (vx * ax - ux * bx) / d, e = (vy * ax - uy * bx) / d;
      ctx.save(); ctx.beginPath();
      // A small overlap prevents antialiasing cracks between texture patches.
      const center = { x: (target[0].x + target[1].x + target[2].x) / 3, y: (target[0].y + target[1].y + target[2].y) / 3 };
      target.forEach((p, i) => {
        const length = Math.hypot(p.x - center.x, p.y - center.y) || 1;
        const x = p.x + (p.x - center.x) * 0.3 / length, y = p.y + (p.y - center.y) * 0.3 / length;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath(); ctx.clip();
      ctx.transform(a, b, c, e, target[0].x - a * s[0].x - c * s[0].y, target[0].y - b * s[0].x - e * s[0].y);
      const left = Math.max(0, Math.floor(Math.min(...s.map(p => p.x))) - 1);
      const top = Math.max(0, Math.floor(Math.min(...s.map(p => p.y))) - 1);
      const width = Math.min(texture.width - left, Math.ceil(Math.max(...s.map(p => p.x))) + 1 - left);
      const height = Math.min(texture.height - top, Math.ceil(Math.max(...s.map(p => p.y))) + 1 - top);
      if (width > 0 && height > 0) ctx.drawImage(texture, left, top, width, height, left, top, width, height);
      ctx.restore();
    }
  }
  root.MosaicPoincareView = { View };
})(typeof globalThis !== 'undefined' ? globalThis : self);
