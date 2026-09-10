(function(root) {
  'use strict';
  const P = root.MosaicPoincare;
  const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);
  const unitWeights = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  class View {
    constructor(options) {
      this.options = options;
      this.canvas = document.getElementById('poincare-canvas');
      this.card = document.getElementById('poincare-card');
      this.status = document.getElementById('poincare-status');
      this.follow = document.getElementById('poincare-follow');
      this.mesh = document.getElementById('poincare-mesh');
      this.solve = document.getElementById('poincare-use-discrete');
      this.background = document.createElement('canvas');
      this.camera = new P.Camera(); this.frame = null; this.dirty = true;
      this.follow.addEventListener('change', () => {
        if (this.follow.checked && this.trace && this.trace.error) this.reset();
        this.schedule(true);
      });
      this.mesh.addEventListener('change', () => this.schedule(true));
      this.solve.addEventListener('click', () => options.useDiscrete());
      document.getElementById('poincare-wide').addEventListener('click', event => {
        event.preventDefault();
        if (root.CalculatorCards) root.CalculatorCards.setWide(this.card, !this.card.classList.contains('wide'));
        this.schedule(true);
      });
      this.recenter = document.getElementById('poincare-recenter');
      this.recenter.addEventListener('click', () => {
        this.follow.checked = false; this.camera = new P.Camera(this.launchCenter || { x: 0, y: 0 });
        if (this.development) this.development.resetNeighborhood(this.development.seed, this.camera.center);
        this.schedule(true);
      });
      document.getElementById('poincare-open').addEventListener('click', () => {
        this.card.classList.remove('collapsed'); this.card.scrollIntoView({ block: 'nearest' }); this.schedule(true);
      });
      document.getElementById('poincare-close').addEventListener('click', () => this.card.classList.add('collapsed'));
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
        const point = this.diskPoint(event);
        if (Math.hypot(point.x, point.y) >= 0.96) return;
        this.drag = point; this.follow.checked = false; this.canvas.setPointerCapture(event.pointerId);
      });
      this.canvas.addEventListener('pointermove', event => {
        if (!this.drag) return;
        const point = this.diskPoint(event);
        if (Math.hypot(point.x, point.y) >= 0.96) return;
        this.camera.pan(this.drag, point); this.drag = point;
        this.schedule(true);
      });
      const endDrag = () => {
        if (!this.drag) return;
        this.drag = null;
        if (this.development) this.development.resetNeighborhood(this.development.nearestCopy(this.camera.center), this.camera.center);
        this.schedule(true);
      };
      this.canvas.addEventListener('pointerup', endDrag);
      this.canvas.addEventListener('pointercancel', endDrag);
      this.canvas.addEventListener('lostpointercapture', endDrag);
      this.canvas.addEventListener('keydown', event => {
        const delta = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.12], ArrowDown: [0, -0.12] }[event.key];
        if (!delta) return;
        event.preventDefault(); this.follow.checked = false;
        this.camera.pan({ x: 0, y: 0 }, { x: delta[0], y: delta[1] });
        if (this.development) this.development.resetNeighborhood(this.development.nearestCopy(this.camera.center), this.camera.center);
        this.schedule(true);
      });
    }
    isOpen() { return !this.card.classList.contains('collapsed') && !this.card.hidden; }
    reset() { this.development = null; this.trace = null; this.result = null; this.artworkKey = null; this.dirty = true; }
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
      this.solve.hidden = snapshot.method === 'discrete' && snapshot.metric === 'hyperbolic';
      const unavailable = !snapshot.eligible ? snapshot.reason
        : snapshot.method !== 'discrete' ? 'The disk requires discrete triangle lengths. Use the discrete solver.'
        : snapshot.metric !== 'hyperbolic' ? (snapshot.message || 'Select the hyperbolic metric to develop this surface.')
        : snapshot.status !== 'ready' ? (snapshot.message || 'Waiting for a ready discrete metric.') : '';
      if (unavailable || !snapshot.result) {
        this.reset(); this.status.textContent = unavailable || 'Waiting for a ready discrete metric.'; return false;
      }
      if (this.result !== snapshot.result || this.billiard !== snapshot.billiard) this.reset();
      this.billiard = snapshot.billiard;
      if (!this.development) {
        const sample = snapshot.sample;
        const seedId = sample ? P.locate(snapshot.result, sample.tileIndex, sample.local) : 0;
        this.development = new P.Development(snapshot.result, seedId == null ? 0 : seedId);
        this.development.verifyVertexFans();
        this.result = snapshot.result;
        if (sample && seedId != null) this.trace = new P.LiftedTrail(this.development, this.development.seed, sample.local);
        this.launchCenter = this.trace ? this.trace.position : P.interpolate(this.development.seed.vertices, [1 / 3, 1 / 3, 1 / 3]);
        this.camera = new P.Camera(this.launchCenter);
        this.development.resetNeighborhood(this.development.seed, this.launchCenter);
        this.dirty = true;
      }
      return true;
    }
    sample(tileIndex, local, color, length) {
      if (!this.isOpen()) return;
      try {
        if (!this.ensure()) return;
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
    screen(point) {
      const p = this.camera.project(point);
      return { x: this.width / 2 + p.x * this.radius, y: this.height / 2 + p.y * this.radius };
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
        if (this.follow.checked && this.trace) {
          if (P.distance(this.camera.center, this.trace.position) > 1e-8) {
            this.camera = new P.Camera(this.trace.position); this.dirty = true;
          }
          if (P.distance(this.development.center, this.camera.center) > 0.5) {
            this.development.resetNeighborhood(this.trace.copy, this.camera.center);
          }
        }
        if (this.recenter) {
          this.recenter.disabled = this.launchCenter.x ** 2 + this.launchCenter.y ** 2 >= 1 - 1e-9;
          this.recenter.title = this.recenter.disabled ? 'The initial lift is beyond numerical precision. Restart the billiard to return to its launch.' : 'Return to the initial lift';
        }
        const before = this.development.visible.length;
        const more = this.development.expand(6);
        if (before !== this.development.visible.length) this.dirty = true;
        const artwork = this.options.artwork();
        if (artwork.key !== this.artworkKey) { this.artworkKey = artwork.key; this.dirty = true; }
        if (this.dirty) { this.paintBackground(artwork); this.dirty = false; }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.drawImage(this.background, 0, 0);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.clip();
        if (this.trace) {
          ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
          const points = this.trace.points;
          for (let i = 1; i < points.length; i++) {
            if (points[i].breakBefore) continue;
            const a = this.screen(points[i - 1]), b = this.screen(points[i]);
            ctx.strokeStyle = points[i].color === 'purple' ? '#813da6' : '#1865d8';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          const p = this.screen(this.trace.position);
          ctx.fillStyle = '#db432d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        const warnings = [...this.development.warnings];
        if (this.trace && this.trace.error) warnings.push(`Lift paused: ${this.trace.error}`);
        this.status.textContent = `Approximate lifted trajectory · ${this.development.visible.length.toLocaleString()} triangle copies · ${more ? 'developing…' : 'finite radius-5 preview'}${this.development.queued.size >= this.development.limit ? ' · 10,000-copy limit' : ''}${warnings.length ? ' · ' + warnings.join(' ') : ''}`;
        if (more) this.schedule();
      } catch (error) { this.status.textContent = `Disk view: ${error.message}`; }
    }
    paintBackground(artwork) {
      const ctx = this.background.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, this.width, this.height);
      ctx.save(); ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.clip();
      ctx.fillStyle = '#ede8df'; ctx.fillRect(0, 0, this.width, this.height);
      for (const copy of this.development.visible) {
        const triangle = this.result.mesh.triangles[copy.triangleId];
        const points = copy.vertices.map(p => this.screen(p));
        const size = Math.max(...points.map((p, i) => Math.hypot(p.x - points[(i + 1) % 3].x, p.y - points[(i + 1) % 3].y)));
        if (size < 0.7) continue;
        const source = triangle.local.map(p => artwork.sourcePoint(triangle.tileIndex, p));
        this.warp(ctx, artwork.canvas, copy, source, unitWeights, points, 0);
        triangle.edgeIds.forEach((edgeId, opposite) => {
          const edge = this.result.mesh.edges[edgeId];
          const boundary = edge.triangles.length === 1;
          const seam = boundary || edge.triangles.some(id => this.result.mesh.triangles[id].tileIndex !== triangle.tileIndex);
          if (!boundary && !seam && !this.mesh.checked) return;
          const i = (opposite + 1) % 3, j = (opposite + 2) % 3;
          ctx.strokeStyle = boundary ? '#332e29' : this.mesh.checked ? '#537e9d66' : '#8d827b66';
          ctx.lineWidth = boundary ? 2 : 0.5;
          ctx.beginPath();
          const steps = Math.max(2, Math.min(40, Math.ceil(size / 8)));
          for (let n = 0; n <= steps; n++) {
            const weights = [0, 0, 0]; weights[i] = 1 - n / steps; weights[j] = n / steps;
            const p = this.screen(P.interpolate(copy.vertices, weights));
            if (!n) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        });
      }
      ctx.restore(); ctx.strokeStyle = '#5f5b55'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.width / 2, this.height / 2, this.radius, 0, 2 * Math.PI); ctx.stroke();
    }
    warp(ctx, texture, copy, source, weights, target, depth) {
      const halves = [mid(weights[0], weights[1]), mid(weights[1], weights[2]), mid(weights[2], weights[0])];
      const projected = halves.map(w => this.screen(P.interpolate(copy.vertices, w)));
      const error = Math.max(...projected.map((p, i) => Math.hypot(p.x - (target[i].x + target[(i + 1) % 3].x) / 2, p.y - (target[i].y + target[(i + 1) % 3].y) / 2)));
      if (error > 0.6 && depth < 6) {
        [[weights[0], halves[0], halves[2]], [halves[0], weights[1], halves[1]], [halves[2], halves[1], weights[2]], halves].forEach(w => {
          this.warp(ctx, texture, copy, source, w, w.map(v => this.screen(P.interpolate(copy.vertices, v))), depth + 1);
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
