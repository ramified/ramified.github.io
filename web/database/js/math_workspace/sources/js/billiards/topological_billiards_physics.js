(function(root, factory) {
  const math = typeof module !== 'undefined' && module.exports
    ? require('./topological_billiards_math.js')
    : root.TopologicalBilliardsMath;
  const api = factory(math);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TopologicalBilliardsPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis, function(M) {
  'use strict';

  if (!M) throw new Error('Topological billiards math module is required.');

  const PHYSICS_DT = 1 / 240;
  const DEFAULT_PARAMETERS = Object.freeze({
    restitution: 0.96,
    clothFriction: 0.16,
    rollingResistance: 0.055,
    spinResistance: 1.0,
    gravity: 1.0,
    stopSpeed: 0.0025,
    stopAngularSpeed: 0.12,
    slipEpsilon: 0.0015,
    collisionIterations: 10,
    localCoverDepth: 2
  });

  const BALL_COLORS = [
    '#f1c84c', '#2f70bb', '#c54b43', '#72509b', '#df7f37', '#3c8d62',
    '#7e3543', '#25262a', '#e4ba3f', '#397ab9', '#cf5147', '#78529b',
    '#e2873e', '#3f9567', '#823b49'
  ];

  function directedSeam(id, side, transform, color) {
    return { id, side, transform, inverseTransform: M.inverseAffine(transform), color };
  }

  function seamPair(id, firstSide, firstTransform, secondSide, color) {
    const inverse = M.inverseAffine(firstTransform);
    return [
      directedSeam(`${id}:a`, firstSide, firstTransform, color),
      directedSeam(`${id}:b`, secondSide, inverse, color)
    ];
  }

  function createSurface(id) {
    const requested = String(id || 'torus').toLowerCase();
    const colors = ['#efb84b', '#4aa4ad', '#d26864', '#8168a6'];
    if (requested === 'mobius') {
      const width = 1;
      const height = 0.62;
      return {
        id: 'mobius',
        label: 'Mobius band',
        width,
        height,
        seams: seamPair('twist', 'left', { a: 1, b: 0, c: 0, d: -1, tx: width, ty: height }, 'right', colors[2]),
        walls: new Set(['top', 'bottom']),
        pockets: interiorPockets(width, height),
        injectivityRadius: Math.min(width, height) / 2
      };
    }
    if (requested === 'klein') {
      const width = 1;
      const height = 0.62;
      return {
        id: 'klein',
        label: 'Klein bottle',
        width,
        height,
        seams: [
          ...seamPair('twist', 'left', { a: 1, b: 0, c: 0, d: -1, tx: width, ty: height }, 'right', colors[2]),
          ...seamPair('vertical', 'top', { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: height }, 'bottom', colors[1])
        ],
        walls: new Set(),
        pockets: interiorPockets(width, height),
        injectivityRadius: Math.min(width, height) / 2
      };
    }
    if (requested === 'quarter-turn') {
      const width = 1;
      const height = 1;
      return {
        id: 'quarter-turn',
        label: 'Quarter-turn square',
        width,
        height,
        seams: [
          ...seamPair('quarter-a', 'right', { a: 0, b: -1, c: 1, d: 0, tx: 1, ty: -1 }, 'top', colors[0]),
          ...seamPair('quarter-b', 'left', { a: 0, b: -1, c: 1, d: 0, tx: 1, ty: 1 }, 'bottom', colors[3])
        ],
        walls: new Set(),
        pockets: interiorPockets(width, height),
        injectivityRadius: 0.5
      };
    }
    if (requested === 'classic') {
      const width = 1;
      const height = 0.62;
      return {
        id: 'classic',
        label: 'Open rectangle',
        width,
        height,
        seams: [],
        walls: new Set(['left', 'right', 'top', 'bottom']),
        pockets: cornerPockets(width, height),
        injectivityRadius: Number.POSITIVE_INFINITY
      };
    }
    const width = 1;
    const height = 0.62;
    return {
      id: 'torus',
      label: 'Translation torus',
      width,
      height,
      seams: [
        ...seamPair('horizontal', 'left', { a: 1, b: 0, c: 0, d: 1, tx: width, ty: 0 }, 'right', colors[0]),
        ...seamPair('vertical', 'top', { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: height }, 'bottom', colors[1])
      ],
      walls: new Set(),
      pockets: interiorPockets(width, height),
      injectivityRadius: Math.min(width, height) / 2
    };
  }

  function interiorPockets(width, height) {
    const inset = Math.min(width, height) * 0.105;
    const radius = Math.min(width, height) * 0.052;
    return [
      { id: 'nw', x: inset, y: inset, radius },
      { id: 'ne', x: width - inset, y: inset, radius },
      { id: 'sw', x: inset, y: height - inset, radius },
      { id: 'se', x: width - inset, y: height - inset, radius }
    ];
  }

  function cornerPockets(width, height) {
    const radius = Math.min(width, height) * 0.065;
    return [
      { id: 'nw', x: 0, y: 0, radius },
      { id: 'ne', x: width, y: 0, radius },
      { id: 'sw', x: 0, y: height, radius },
      { id: 'se', x: width, y: height, radius }
    ];
  }

  function seamForSide(surface, side) {
    return surface.seams.find((seam) => seam.side === side) || null;
  }

  function createBall(options = {}) {
    const radius = Number(options.radius) || 0.027;
    const mass = Number(options.mass) || 1;
    return {
      id: options.id == null ? 0 : options.id,
      number: options.number == null ? options.id || 0 : options.number,
      kind: options.kind || (options.number ? 'target' : 'cue'),
      color: options.color || (options.number ? BALL_COLORS[(options.number - 1) % BALL_COLORS.length] : '#f7f4e9'),
      face: 0,
      position: { x: Number(options.x) || 0, y: Number(options.y) || 0 },
      velocity: { x: Number(options.vx) || 0, y: Number(options.vy) || 0 },
      angularVelocity: {
        x: Number(options.wx) || 0,
        y: Number(options.wy) || 0,
        z: Number(options.wz) || 0
      },
      orientation: M.normalizeQuaternion(options.orientation || M.quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2)),
      radius,
      mass,
      active: options.active !== false,
      pocketedAt: options.pocketedAt || '',
      crossings: Math.max(0, Number(options.crossings) || 0)
    };
  }

  function createInitialState(surfaceOrId = 'torus', options = {}) {
    const surface = typeof surfaceOrId === 'string' ? createSurface(surfaceOrId) : surfaceOrId;
    const radius = Math.min(surface.width, surface.height) * 0.043;
    const centerY = surface.height * 0.5;
    const rackX = surface.width * 0.70;
    const spacing = radius * 2.12;
    const balls = [createBall({ id: 0, number: 0, kind: 'cue', x: surface.width * 0.25, y: centerY, radius })];
    let number = 1;
    for (let column = 0; column < 3; column += 1) {
      for (let row = 0; row <= column; row += 1) {
        balls.push(createBall({
          id: number,
          number,
          x: rackX + (column * spacing * 0.9),
          y: centerY + ((row - (column / 2)) * spacing),
          radius
        }));
        number += 1;
      }
    }
    return {
      version: 2,
      surface,
      balls,
      phase: 'ready',
      shots: 0,
      score: 0,
      seed: Number(options.seed) || 20260823,
      simulatedTime: 0,
      lastCollision: null,
      lastCrossings: [],
      warning: validateBallRadius(surface, radius),
      parameters: { ...DEFAULT_PARAMETERS, ...(options.parameters || {}) }
    };
  }

  function validateBallRadius(surface, radius) {
    if (Number.isFinite(surface.injectivityRadius) && radius * 1.05 >= surface.injectivityRadius) {
      return 'Ball radius is too large for this surface identification.';
    }
    return '';
  }

  function cloneBall(ball) {
    return createBall({
      ...ball,
      x: ball.position.x,
      y: ball.position.y,
      vx: ball.velocity.x,
      vy: ball.velocity.y,
      wx: ball.angularVelocity.x,
      wy: ball.angularVelocity.y,
      wz: ball.angularVelocity.z,
      orientation: { ...ball.orientation }
    });
  }

  function transformBallImage(ball, transform, transformId = 'identity', depth = 0) {
    return {
      ballId: ball.id,
      face: 0,
      transformId,
      depth,
      transformFromCanonical: transform,
      inverseTransform: M.inverseAffine(transform),
      position: M.applyAffine(transform, ball.position),
      velocity: M.applyLinear(transform, ball.velocity),
      angularVelocity: M.applyLiftedLinear(transform, ball.angularVelocity),
      orientation: M.transportOrientation(ball.orientation, transform)
    };
  }

  function allLocalBallImages(ball, surface, maxDepth = 2) {
    const identity = M.identityAffine();
    const queue = [{ transform: identity, transformId: 'identity', depth: 0 }];
    const seen = new Set([M.affineKey(identity)]);
    const images = [];
    while (queue.length) {
      const current = queue.shift();
      images.push(transformBallImage(ball, current.transform, current.transformId, current.depth));
      if (current.depth >= maxDepth) continue;
      surface.seams.forEach((seam) => {
        const transform = M.composeAffine(seam.transform, current.transform);
        const key = M.affineKey(transform);
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({
          transform,
          transformId: current.transformId === 'identity' ? seam.id : `${current.transformId}>${seam.id}`,
          depth: current.depth + 1
        });
      });
    }
    return images;
  }

  function distanceToRectangle(point, width, height) {
    const dx = Math.max(0, -point.x, point.x - width);
    const dy = Math.max(0, -point.y, point.y - height);
    return Math.hypot(dx, dy);
  }

  function findNearbyBallImages(ball, surface, queryRegion = {}) {
    const maxDepth = Number.isInteger(queryRegion.maxDepth) ? queryRegion.maxDepth : 2;
    const images = allLocalBallImages(ball, surface, maxDepth);
    if (queryRegion.point) {
      const radius = Math.max(0, Number(queryRegion.radius) || 0);
      return images.filter((image) => M.length2(M.sub2(image.position, queryRegion.point)) <= radius + M.EPSILON);
    }
    const padding = Math.max(0, Number(queryRegion.padding) || ball.radius);
    return images.filter((image) => distanceToRectangle(image.position, surface.width, surface.height) <= padding + M.EPSILON);
  }

  function boundarySide(position, surface) {
    const overflow = [
      ['left', -position.x],
      ['right', position.x - surface.width],
      ['top', -position.y],
      ['bottom', position.y - surface.height]
    ].filter((entry) => entry[1] > M.EPSILON).sort((a, b) => b[1] - a[1]);
    return overflow.length ? overflow[0][0] : '';
  }

  function transportCanonicalBall(ball, seam) {
    ball.position = M.applyAffine(seam.transform, ball.position);
    ball.velocity = M.applyLinear(seam.transform, ball.velocity);
    ball.angularVelocity = M.applyLiftedLinear(seam.transform, ball.angularVelocity);
    ball.orientation = M.transportOrientation(ball.orientation, seam.transform);
    ball.crossings += 1;
    return { ballId: ball.id, seamId: seam.id, side: seam.side };
  }

  function canonicalizeBall(ball, surface) {
    const crossings = [];
    for (let guard = 0; guard < 12; guard += 1) {
      const side = boundarySide(ball.position, surface);
      if (!side) break;
      const seam = seamForSide(surface, side);
      if (!seam) break;
      crossings.push(transportCanonicalBall(ball, seam));
    }
    return crossings;
  }

  function integrateBallRaw(ball, dt) {
    if (!ball.active || dt <= 0) return;
    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;
    ball.orientation = M.integrateQuaternion(ball.orientation, ball.angularVelocity, dt);
  }

  function applyWallContacts(ball, surface, restitution) {
    if (!ball.active) return;
    const radius = ball.radius;
    if (surface.walls.has('left') && ball.position.x < radius) {
      ball.position.x = radius;
      if (ball.velocity.x < 0) ball.velocity.x *= -restitution;
    }
    if (surface.walls.has('right') && ball.position.x > surface.width - radius) {
      ball.position.x = surface.width - radius;
      if (ball.velocity.x > 0) ball.velocity.x *= -restitution;
    }
    if (surface.walls.has('top') && ball.position.y < radius) {
      ball.position.y = radius;
      if (ball.velocity.y < 0) ball.velocity.y *= -restitution;
    }
    if (surface.walls.has('bottom') && ball.position.y > surface.height - radius) {
      ball.position.y = surface.height - radius;
      if (ball.velocity.y > 0) ball.velocity.y *= -restitution;
    }
  }

  function applyClothFriction(ball, dt, parameters) {
    if (!ball.active || dt <= 0) return;
    const radius = ball.radius;
    const mass = ball.mass;
    const inertia = (2 / 5) * mass * radius * radius;
    const slip = {
      x: ball.velocity.x - (radius * ball.angularVelocity.y),
      y: ball.velocity.y + (radius * ball.angularVelocity.x)
    };
    const slipSpeed = M.length2(slip);
    if (slipSpeed > parameters.slipEpsilon) {
      const effectiveInverseMass = (1 / mass) + ((radius * radius) / inertia);
      const desiredImpulse = slipSpeed / effectiveInverseMass;
      const impulseMagnitude = Math.min(desiredImpulse, parameters.clothFriction * mass * parameters.gravity * dt);
      const impulse = M.scale2(slip, -impulseMagnitude / slipSpeed);
      ball.velocity.x += impulse.x / mass;
      ball.velocity.y += impulse.y / mass;
      ball.angularVelocity.x += (radius * impulse.y) / inertia;
      ball.angularVelocity.y -= (radius * impulse.x) / inertia;
    } else {
      const speed = M.length2(ball.velocity);
      const decrement = parameters.rollingResistance * parameters.gravity * dt;
      if (speed <= decrement + parameters.stopSpeed) {
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        ball.angularVelocity.x = 0;
        ball.angularVelocity.y = 0;
      } else if (speed > 0) {
        const nextSpeed = speed - decrement;
        ball.velocity.x *= nextSpeed / speed;
        ball.velocity.y *= nextSpeed / speed;
        ball.angularVelocity.x = -ball.velocity.y / radius;
        ball.angularVelocity.y = ball.velocity.x / radius;
      }
    }
    const spinDecay = Math.max(0, 1 - (parameters.spinResistance * dt));
    ball.angularVelocity.z *= spinDecay;
    if (Math.abs(ball.angularVelocity.z) < parameters.stopAngularSpeed) ball.angularVelocity.z = 0;
  }

  function collisionTime(position, velocity, radius, maximumTime) {
    const a = M.dot2(velocity, velocity);
    const b = 2 * M.dot2(position, velocity);
    const c = M.dot2(position, position) - (radius * radius);
    if (c <= 0) return b < 0 ? 0 : null;
    if (a < M.EPSILON || b >= 0) return null;
    const discriminant = (b * b) - (4 * a * c);
    if (discriminant < 0) return null;
    const time = (-b - Math.sqrt(discriminant)) / (2 * a);
    return time >= -M.EPSILON && time <= maximumTime + M.EPSILON ? Math.max(0, time) : null;
  }

  function earliestBallCollision(state, maximumTime) {
    const active = state.balls.filter((ball) => ball.active);
    let earliest = null;
    for (let firstIndex = 0; firstIndex < active.length; firstIndex += 1) {
      const first = active[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < active.length; secondIndex += 1) {
        const second = active[secondIndex];
        const reach = first.radius + second.radius
          + ((M.length2(first.velocity) + M.length2(second.velocity)) * maximumTime)
          + 1e-7;
        const images = findNearbyBallImages(second, state.surface, {
          point: first.position,
          radius: reach,
          maxDepth: state.parameters.localCoverDepth
        });
        images.forEach((image) => {
          const relativePosition = M.sub2(image.position, first.position);
          const relativeVelocity = M.sub2(image.velocity, first.velocity);
          const time = collisionTime(relativePosition, relativeVelocity, first.radius + second.radius, maximumTime);
          if (time == null) return;
          if (!earliest || time < earliest.time - 1e-9) {
            earliest = { first, second, image, time };
          }
        });
      }
    }
    return earliest;
  }

  function resolveBallCollision(collision, restitution) {
    const { first, second, image } = collision;
    const secondPosition = M.applyAffine(image.transformFromCanonical, second.position);
    const secondVelocity = M.applyLinear(image.transformFromCanonical, second.velocity);
    const delta = M.sub2(secondPosition, first.position);
    const normal = M.normalize2(delta, { x: 1, y: 0 });
    const relativeNormalSpeed = M.dot2(M.sub2(secondVelocity, first.velocity), normal);
    if (relativeNormalSpeed >= 1e-8) return null;
    const inverseFirstMass = 1 / first.mass;
    const inverseSecondMass = 1 / second.mass;
    const impulseMagnitude = -((1 + restitution) * relativeNormalSpeed) / (inverseFirstMass + inverseSecondMass);
    first.velocity.x -= impulseMagnitude * inverseFirstMass * normal.x;
    first.velocity.y -= impulseMagnitude * inverseFirstMass * normal.y;
    const imageVelocityAfter = {
      x: secondVelocity.x + (impulseMagnitude * inverseSecondMass * normal.x),
      y: secondVelocity.y + (impulseMagnitude * inverseSecondMass * normal.y)
    };
    second.velocity = M.applyLinear(image.inverseTransform, imageVelocityAfter);

    const overlap = (first.radius + second.radius) - M.length2(delta);
    if (overlap > 0) {
      const correction = (overlap + 1e-8) / (inverseFirstMass + inverseSecondMass);
      first.position.x -= normal.x * correction * inverseFirstMass;
      first.position.y -= normal.y * correction * inverseFirstMass;
      const correctedImagePosition = {
        x: secondPosition.x + (normal.x * correction * inverseSecondMass),
        y: secondPosition.y + (normal.y * correction * inverseSecondMass)
      };
      second.position = M.applyAffine(image.inverseTransform, correctedImagePosition);
    }
    return {
      firstId: first.id,
      secondId: second.id,
      normal,
      time: collision.time,
      transformId: image.transformId,
      impulse: impulseMagnitude
    };
  }

  function advanceAll(state, dt) {
    state.balls.forEach((ball) => integrateBallRaw(ball, dt));
  }

  function canonicalizeAndConstrain(state) {
    const crossings = [];
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      crossings.push(...canonicalizeBall(ball, state.surface));
      applyWallContacts(ball, state.surface, state.parameters.restitution);
    });
    state.lastCrossings = crossings;
  }

  function pocketBall(ball, pocket) {
    ball.active = false;
    ball.pocketedAt = pocket.id;
    ball.velocity = { x: 0, y: 0 };
    ball.angularVelocity = { x: 0, y: 0, z: 0 };
  }

  function detectPockets(state) {
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      for (const pocket of state.surface.pockets) {
        const images = findNearbyBallImages(ball, state.surface, {
          point: pocket,
          radius: pocket.radius,
          maxDepth: state.parameters.localCoverDepth
        });
        if (images.some((image) => M.length2(M.sub2(image.position, pocket)) <= pocket.radius - (ball.radius * 0.12))) {
          pocketBall(ball, pocket);
          if (ball.kind === 'target') state.score += 1;
          break;
        }
      }
    });
  }

  function ballsAreMoving(state) {
    return state.balls.some((ball) => ball.active && (
      M.length2(ball.velocity) > state.parameters.stopSpeed
      || Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z) > state.parameters.stopAngularSpeed
    ));
  }

  function activeTargetCount(state) {
    return state.balls.filter((ball) => ball.active && ball.kind === 'target').length;
  }

  function respawnCueBall(state) {
    const cue = state.balls.find((ball) => ball.kind === 'cue');
    if (!cue || cue.active || ballsAreMoving(state)) return false;
    cue.active = true;
    cue.pocketedAt = '';
    cue.position = { x: state.surface.width * 0.25, y: state.surface.height * 0.5 };
    cue.velocity = { x: 0, y: 0 };
    cue.angularVelocity = { x: 0, y: 0, z: 0 };
    state.score = Math.max(0, state.score - 1);
    return true;
  }

  function stepPhysics(state, dt = PHYSICS_DT) {
    if (!state || !state.surface || dt <= 0) return state;
    state.parameters = { ...DEFAULT_PARAMETERS, ...(state.parameters || {}) };
    state.balls.forEach((ball) => applyClothFriction(ball, dt, state.parameters));
    let remaining = dt;
    state.lastCollision = null;
    let iteration = 0;
    while (remaining > 1e-9 && iteration < state.parameters.collisionIterations) {
      const collision = earliestBallCollision(state, remaining);
      if (!collision) {
        advanceAll(state, remaining);
        remaining = 0;
        break;
      }
      if (collision.time > 0) advanceAll(state, collision.time);
      state.lastCollision = resolveBallCollision(collision, state.parameters.restitution) || state.lastCollision;
      canonicalizeAndConstrain(state);
      const consumed = Math.max(collision.time, 1e-7);
      remaining = Math.max(0, remaining - consumed);
      iteration += 1;
    }
    if (remaining > 1e-9) advanceAll(state, remaining);
    canonicalizeAndConstrain(state);
    detectPockets(state);
    state.simulatedTime += dt;
    if (!ballsAreMoving(state)) {
      respawnCueBall(state);
      if (activeTargetCount(state) === 0) state.phase = 'gameover';
      else if (state.phase === 'moving') state.phase = 'ready';
    }
    return state;
  }

  function applyCueImpulse(state, direction, power, contact = { x: 0, y: 0 }) {
    const cue = state.balls.find((ball) => ball.kind === 'cue' && ball.active);
    if (!cue || state.phase !== 'ready' || ballsAreMoving(state)) return false;
    const aim = M.normalize2(direction);
    const normalizedContact = M.normalize2(contact, { x: 0, y: 0 });
    const rawLength = M.length2(contact);
    const contactScale = rawLength > 1 ? 0.88 : 0.88 * rawLength;
    const contactPoint = rawLength > M.EPSILON ? M.scale2(normalizedContact, contactScale) : { x: 0, y: 0 };
    const radius = cue.radius;
    const horizontalOffset = contactPoint.x * radius;
    const verticalOffset = -contactPoint.y * radius;
    const depth = Math.sqrt(Math.max(0, (radius * radius) - (horizontalOffset * horizontalOffset) - (verticalOffset * verticalOffset)));
    const transverse = { x: -aim.y, y: aim.x };
    const contactVector = {
      x: (-depth * aim.x) + (horizontalOffset * transverse.x),
      y: (-depth * aim.y) + (horizontalOffset * transverse.y),
      z: verticalOffset
    };
    const impulseMagnitude = M.clamp(Number(power) || 0, 0, 1) * 0.82;
    if (impulseMagnitude <= 0.005) return false;
    const impulse = { x: impulseMagnitude * aim.x, y: impulseMagnitude * aim.y, z: 0 };
    cue.velocity.x += impulse.x / cue.mass;
    cue.velocity.y += impulse.y / cue.mass;
    const inertia = (2 / 5) * cue.mass * radius * radius;
    const torqueImpulse = M.cross3(contactVector, impulse);
    cue.angularVelocity.x += torqueImpulse.x / inertia;
    cue.angularVelocity.y += torqueImpulse.y / inertia;
    cue.angularVelocity.z += torqueImpulse.z / inertia;
    state.shots += 1;
    state.phase = 'moving';
    return true;
  }

  function simulateDeterministic(specification = {}) {
    const surface = typeof specification.surface === 'string'
      ? createSurface(specification.surface)
      : (specification.surface || createSurface('torus'));
    const state = {
      version: 2,
      surface,
      balls: (specification.initialBallStates || []).map((ball) => createBall(ball)),
      phase: 'moving',
      shots: 0,
      score: 0,
      seed: Number(specification.seed) || 1,
      simulatedTime: 0,
      lastCollision: null,
      lastCrossings: [],
      warning: '',
      parameters: { ...DEFAULT_PARAMETERS, ...(specification.physicsParameters || {}) }
    };
    const dt = Number(specification.dt) || PHYSICS_DT;
    const steps = Math.max(0, Math.floor(Number(specification.numberOfSteps) || 0));
    for (let index = 0; index < steps; index += 1) stepPhysics(state, dt);
    return state;
  }

  return {
    BALL_COLORS,
    DEFAULT_PARAMETERS,
    PHYSICS_DT,
    activeTargetCount,
    allLocalBallImages,
    applyClothFriction,
    applyCueImpulse,
    ballsAreMoving,
    canonicalizeBall,
    cloneBall,
    collisionTime,
    createBall,
    createInitialState,
    createSurface,
    earliestBallCollision,
    findNearbyBallImages,
    resolveBallCollision,
    seamForSide,
    simulateDeterministic,
    stepPhysics,
    transformBallImage,
    transportCanonicalBall,
    validateBallRadius
  };
});
