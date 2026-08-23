(function(root, factory) {
  const math = typeof module !== 'undefined' && module.exports
    ? require('./topological_billiards_math.js')
    : root.TopologicalBilliardsMath;
  const physics = typeof module !== 'undefined' && module.exports
    ? require('./topological_billiards_physics.js')
    : root.TopologicalBilliardsPhysics;
  const api = factory(math, physics);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TopologicalBilliardsRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis, function(M, Physics) {
  'use strict';

  const textureCache = new Map();
  const texturePixelsCache = new Map();

  function ballLabel(ball) {
    if (ball && ball.kind === 'cue') return '0';
    const number = Number(ball && ball.number);
    return Number.isFinite(number) ? String(Math.floor(number)) : '';
  }

  function drawTextureMappedBallLabel(ctx, ball, centerX, centerY) {
    // The initial sphere chart projects texture v to screen x and texture u to screen y.
    // Pre-transpose the glyph so the numbered patch begins upright and unreflected.
    ctx.save();
    ctx.transform(0, 1, 1, 0, centerX - centerY, centerY - centerX);
    ctx.fillText(ballLabel(ball), centerX, centerY + 1);
    ctx.restore();
  }

  function canvasFactory(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function makeTexture(ball, debug, options = {}) {
    const showNumberPatch = options.showNumberPatch !== false;
    const key = `${debug ? 'debug' : 'pool'}:${showNumberPatch ? 'numbered' : 'plain'}:${ball.number}:${ball.color}`;
    if (textureCache.has(key)) return textureCache.get(key);
    const width = 320;
    const height = 160;
    const canvas = canvasFactory(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = debug ? '#f4d34f' : ball.color;
    ctx.fillRect(0, 0, width, height);

    if (debug) {
      ctx.strokeStyle = '#1c2832';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.fillStyle = '#d2473f';
      ctx.beginPath();
      ctx.arc(width * 0.69, height * 0.28, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#146d7a';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(width * 0.18, height * 0.72);
      ctx.lineTo(width * 0.42, height * 0.72);
      ctx.lineTo(width * 0.36, height * 0.61);
      ctx.moveTo(width * 0.42, height * 0.72);
      ctx.lineTo(width * 0.36, height * 0.83);
      ctx.stroke();
      ctx.fillStyle = '#16191d';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.number || 'Q', width * 0.53, height * 0.37);
    } else {
      if (ball.number >= 9) {
        ctx.fillStyle = '#f7f3e7';
        ctx.fillRect(0, 0, width, height * 0.28);
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
      }
      if (showNumberPatch) {
        const patchX = width / 2;
        const patchY = height / 2;
        ctx.fillStyle = '#fbf8ef';
        ctx.beginPath();
        ctx.arc(patchX, patchY, 29, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#202329';
        ctx.font = 'bold 37px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        drawTextureMappedBallLabel(ctx, ball, patchX, patchY);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(0, 0, width, 8);
    }
    const texture = { key, canvas, width, height };
    textureCache.set(key, texture);
    return texture;
  }

  function texturePixels(texture) {
    if (!texturePixelsCache.has(texture.key)) {
      texturePixelsCache.set(texture.key, texture.canvas.getContext('2d').getImageData(0, 0, texture.width, texture.height).data);
    }
    return texturePixelsCache.get(texture.key);
  }

  function sphericalSprite(ball, orientation, diameter, debug, options = {}) {
    const size = Math.max(12, Math.ceil(diameter));
    const canvas = canvasFactory(size, size);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    const pixels = image.data;
    const texture = makeTexture(ball, debug, options);
    const source = texturePixels(texture);
    const inverse = M.conjugateQuaternion(orientation);
    const center = (size - 1) / 2;
    const radius = Math.max(1, (size / 2) - 0.6);
    const light = M.normalize2({ x: -0.55, y: -0.75 });
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = (x - center) / radius;
        const ny = (y - center) / radius;
        const squared = (nx * nx) + (ny * ny);
        if (squared > 1.03) continue;
        const z = Math.sqrt(Math.max(0, 1 - squared));
        const local = M.rotateVector3(inverse, { x: nx, y: ny, z });
        let u = (Math.atan2(local.y, local.x) / (Math.PI * 2)) + 0.5;
        if (u >= 1) u -= 1;
        if (u < 0) u += 1;
        const v = Math.acos(M.clamp(local.z, -1, 1)) / Math.PI;
        const sourceX = Math.min(texture.width - 1, Math.max(0, Math.floor(u * texture.width)));
        const sourceY = Math.min(texture.height - 1, Math.max(0, Math.floor(v * texture.height)));
        const sourceIndex = ((sourceY * texture.width) + sourceX) * 4;
        const targetIndex = ((y * size) + x) * 4;
        const directional = Math.max(0, (nx * light.x) + (ny * light.y));
        const shade = 0.52 + (0.38 * z) + (0.10 * directional);
        pixels[targetIndex] = source[sourceIndex] * shade;
        pixels[targetIndex + 1] = source[sourceIndex + 1] * shade;
        pixels[targetIndex + 2] = source[sourceIndex + 2] * shade;
        pixels[targetIndex + 3] = Math.round(255 * M.clamp((1.03 - squared) / 0.055, 0, 1));
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  function drawBallOutline(ctx, center, radius) {
    ctx.save();
    ctx.strokeStyle = 'rgba(18, 23, 27, 0.72)';
    ctx.lineWidth = Math.max(0.8, radius * 0.065);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBallBadge(ctx, center, radius, ball) {
    const label = ballLabel(ball);
    const badgeRadius = radius * 0.49;
    drawBallOutline(ctx, center, radius);
    ctx.save();
    ctx.fillStyle = '#fbf8ef';
    ctx.strokeStyle = 'rgba(24, 28, 32, 0.58)';
    ctx.lineWidth = Math.max(0.7, radius * 0.052);
    ctx.beginPath();
    ctx.arc(center.x, center.y, badgeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#202329';
    let fontSize = Math.max(7, radius * (label.length > 2 ? 0.38 : label.length > 1 ? 0.49 : 0.62));
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    if (typeof ctx.measureText === 'function') {
      const width = ctx.measureText(label).width;
      const maximumWidth = badgeRadius * 1.55;
      if (width > maximumWidth && width > 0) {
        fontSize *= maximumWidth / width;
        ctx.font = `900 ${fontSize}px Arial, sans-serif`;
      }
    }
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, center.x, center.y);
    ctx.restore();
  }

  function drawFixedBallLabel(canvas, ball, size) {
    drawBallBadge(canvas.getContext('2d'), { x: size / 2, y: size / 2 }, size / 2, ball);
    return canvas;
  }

  function numberedBallSprite(ball, orientation, diameter, debug = false) {
    const size = Math.max(12, Math.ceil(diameter));
    const canvas = sphericalSprite(ball, orientation, size, debug, { showNumberPatch: false });
    return drawFixedBallLabel(canvas, ball, size);
  }

  function paletteBallSprite(ball, diameter) {
    const orientation = M.quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
    return numberedBallSprite(ball, orientation, diameter, false);
  }

  function fitBoard(canvas, surface) {
    const width = canvas.clientWidth || 720;
    const height = canvas.clientHeight || Math.max(360, width * 0.63);
    const padding = Math.max(18, Math.min(width, height) * 0.055);
    const scale = Math.min((width - (padding * 2)) / surface.width, (height - (padding * 2)) / surface.height);
    const boardWidth = surface.width * scale;
    const boardHeight = surface.height * scale;
    return {
      width,
      height,
      scale,
      x: (width - boardWidth) / 2,
      y: (height - boardHeight) / 2,
      boardWidth,
      boardHeight
    };
  }

  function surfaceToCanvas(point, layout) {
    return { x: layout.x + (point.x * layout.scale), y: layout.y + (point.y * layout.scale) };
  }

  function canvasToSurface(point, layout) {
    return { x: (point.x - layout.x) / layout.scale, y: (point.y - layout.y) / layout.scale };
  }

  function resizeCanvas(canvas, ctx) {
    const width = Math.max(1, Math.floor(canvas.clientWidth || 720));
    const height = Math.max(1, Math.floor(canvas.clientHeight || Math.max(360, width * 0.63)));
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height, dpr };
  }

  function drawBackground(ctx, layout, state) {
    const { x, y, boardWidth, boardHeight } = layout;
    const gradient = ctx.createLinearGradient(x, y, x + boardWidth, y + boardHeight);
    gradient.addColorStop(0, '#176b60');
    gradient.addColorStop(0.55, '#0f5b55');
    gradient.addColorStop(1, '#164d4b');
    ctx.fillStyle = '#e8e1d4';
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, boardWidth, boardHeight);
    ctx.strokeStyle = 'rgba(242, 246, 235, 0.07)';
    ctx.lineWidth = 1;
    for (let index = 1; index < 12; index += 1) {
      const px = x + ((boardWidth * index) / 12);
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + boardHeight);
      ctx.stroke();
    }
    ctx.strokeStyle = '#40382f';
    ctx.lineWidth = Math.max(5, layout.scale * 0.012);
    ctx.strokeRect(x, y, boardWidth, boardHeight);

    state.surface.seams.forEach((seam) => {
      ctx.strokeStyle = seam.color;
      ctx.lineWidth = Math.max(4, layout.scale * 0.009);
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      if (seam.side === 'left' || seam.side === 'right') {
        const px = seam.side === 'left' ? x : x + boardWidth;
        ctx.moveTo(px, y + 4);
        ctx.lineTo(px, y + boardHeight - 4);
      } else {
        const py = seam.side === 'top' ? y : y + boardHeight;
        ctx.moveTo(x + 4, py);
        ctx.lineTo(x + boardWidth - 4, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function drawPockets(ctx, layout, state) {
    state.surface.pockets.forEach((pocket) => {
      const point = surfaceToCanvas(pocket, layout);
      const radius = pocket.radius * layout.scale;
      const gradient = ctx.createRadialGradient(point.x - radius * 0.2, point.y - radius * 0.2, 1, point.x, point.y, radius);
      gradient.addColorStop(0, '#181a1b');
      gradient.addColorStop(0.72, '#080909');
      gradient.addColorStop(1, 'rgba(6, 7, 7, 0.35)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBallImage(ctx, layout, ball, image, debugTexture, fixedLabel) {
    const center = surfaceToCanvas(image.position, layout);
    const radius = ball.radius * layout.scale;
    const sprite = sphericalSprite(ball, image.orientation, radius * 2, debugTexture, { showNumberPatch: !fixedLabel });
    ctx.drawImage(sprite, center.x - radius, center.y - radius, radius * 2, radius * 2);
    if (fixedLabel) drawBallBadge(ctx, center, radius, ball);
    else drawBallOutline(ctx, center, radius);
  }

  function rayCircleDistance(origin, direction, center, radius) {
    const delta = M.sub2(center, origin);
    const projection = M.dot2(delta, direction);
    if (projection <= 0) return null;
    const perpendicularSquared = M.dot2(delta, delta) - (projection * projection);
    const radiusSquared = radius * radius;
    if (perpendicularSquared > radiusSquared) return null;
    return projection - Math.sqrt(Math.max(0, radiusSquared - perpendicularSquared));
  }

  function boundaryRayDistance(point, direction, surface) {
    const candidates = [];
    if (direction.x < -M.EPSILON) candidates.push({ side: 'left', distance: -point.x / direction.x });
    if (direction.x > M.EPSILON) candidates.push({ side: 'right', distance: (surface.width - point.x) / direction.x });
    if (direction.y < -M.EPSILON) candidates.push({ side: 'top', distance: -point.y / direction.y });
    if (direction.y > M.EPSILON) candidates.push({ side: 'bottom', distance: (surface.height - point.y) / direction.y });
    return candidates.filter((item) => item.distance >= 0).sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function firstBallOnRay(state, cue, origin, direction, maximumDistance) {
    let hit = null;
    state.balls.forEach((ball) => {
      if (!ball.active || ball.id === cue.id) return;
      Physics.allLocalBallImages(ball, state.surface, state.parameters.localCoverDepth).forEach((image) => {
        const distance = rayCircleDistance(origin, direction, image.position, cue.radius + ball.radius);
        if (distance == null || distance > maximumDistance) return;
        if (!hit || distance < hit.distance) hit = { distance, ball, image };
      });
    });
    return hit;
  }

  function traceAim(state, direction, mode) {
    const cue = state.balls.find((ball) => ball.kind === 'cue' && ball.active);
    if (!cue) return [];
    if (mode !== 'beginner') {
      return [{ from: cue.position, to: M.add2(cue.position, M.scale2(direction, mode === 'expert' ? 0.10 : 0.23)), hit: false }];
    }
    const segments = [];
    let point = { ...cue.position };
    let velocity = { ...direction };
    for (let guard = 0; guard < 6; guard += 1) {
      const boundary = boundaryRayDistance(point, velocity, state.surface);
      if (!boundary) break;
      const hit = firstBallOnRay(state, cue, point, velocity, boundary.distance);
      const distance = hit ? hit.distance : boundary.distance;
      const end = M.add2(point, M.scale2(velocity, distance));
      segments.push({ from: point, to: end, hit: !!hit });
      if (hit) break;
      const seam = Physics.seamForSide(state.surface, boundary.side);
      if (!seam) break;
      point = M.applyAffine(seam.transform, M.add2(end, M.scale2(velocity, 1e-7)));
      velocity = M.normalize2(M.applyLinear(seam.transform, velocity));
    }
    return segments;
  }

  function drawAim(ctx, layout, state, view) {
    if (state.phase !== 'ready') return;
    const cue = state.balls.find((ball) => ball.kind === 'cue' && ball.active);
    if (!cue) return;
    const direction = M.normalize2(view.aim || { x: 1, y: 0 });
    const segments = traceAim(state, direction, view.assistance || 'normal');
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.x, layout.y, layout.boardWidth, layout.boardHeight);
    ctx.clip();
    ctx.strokeStyle = 'rgba(252, 244, 213, 0.74)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(view.assistance === 'expert' ? [] : [7, 5]);
    segments.forEach((segment) => {
      const from = surfaceToCanvas(segment.from, layout);
      const to = surfaceToCanvas(segment.to, layout);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      if (segment.hit) {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.56)';
        ctx.beginPath();
        ctx.arc(to.x, to.y, cue.radius * layout.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    const cuePoint = surfaceToCanvas(cue.position, layout);
    const pull = 0.075 + ((view.dragPower || 0) * 0.18);
    const back = surfaceToCanvas(M.sub2(cue.position, M.scale2(direction, pull)), layout);
    const farBack = surfaceToCanvas(M.sub2(cue.position, M.scale2(direction, pull + 0.30)), layout);
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#cda86a';
    ctx.lineWidth = Math.max(5, layout.scale * 0.009);
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(farBack.x, farBack.y);
    ctx.stroke();
    ctx.strokeStyle = '#f1e4c4';
    ctx.lineWidth = Math.max(2, layout.scale * 0.0035);
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(cuePoint.x, cuePoint.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawDebug(ctx, layout, state) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.x, layout.y, layout.boardWidth, layout.boardHeight);
    ctx.clip();
    state.balls.filter((ball) => ball.active).forEach((ball) => {
      const images = Physics.findNearbyBallImages(ball, state.surface, { padding: ball.radius, maxDepth: 2 });
      images.forEach((image) => {
        const point = surfaceToCanvas(image.position, layout);
        ctx.strokeStyle = image.depth ? 'rgba(244, 194, 75, 0.82)' : 'rgba(255, 255, 255, 0.74)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, ball.radius * layout.scale, 0, Math.PI * 2);
        ctx.stroke();
      });
      const point = surfaceToCanvas(ball.position, layout);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
      ctx.strokeStyle = '#f4cf59';
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + (ball.velocity.x * layout.scale * 0.22), point.y + (ball.velocity.y * layout.scale * 0.22));
      ctx.stroke();
    });
    if (state.lastCollision) {
      const first = state.balls.find((ball) => ball.id === state.lastCollision.firstId);
      if (first) {
        const point = surfaceToCanvas(first.position, layout);
        ctx.strokeStyle = '#ef6b64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + (state.lastCollision.normal.x * 42), point.y + (state.lastCollision.normal.y * 42));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function render(ctx, canvas, state, view = {}) {
    const sizing = resizeCanvas(canvas, ctx);
    const layout = fitBoard(canvas, state.surface);
    layout.width = sizing.width;
    layout.height = sizing.height;
    ctx.clearRect(0, 0, sizing.width, sizing.height);
    drawBackground(ctx, layout, state);
    drawPockets(ctx, layout, state);
    drawAim(ctx, layout, state, view);
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.x, layout.y, layout.boardWidth, layout.boardHeight);
    ctx.clip();
    state.balls.filter((ball) => ball.active).forEach((ball) => {
      const images = Physics.findNearbyBallImages(ball, state.surface, {
        padding: ball.radius,
        maxDepth: state.parameters.localCoverDepth
      });
      images.forEach((image) => drawBallImage(
        ctx,
        layout,
        ball,
        image,
        !!view.debugTexture,
        state.phase === 'setup' || (state.phase === 'ball-in-hand' && ball.kind === 'cue')
      ));
    });
    ctx.restore();
    if (view.debug) drawDebug(ctx, layout, state);
    return layout;
  }

  return {
    ballLabel,
    canvasToSurface,
    drawBallBadge,
    drawBallOutline,
    drawTextureMappedBallLabel,
    fitBoard,
    makeTexture,
    numberedBallSprite,
    paletteBallSprite,
    render,
    sphericalSprite,
    surfaceToCanvas,
    traceAim
  };
});
