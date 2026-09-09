(function(root, factory) {
  const math = root && root.TopologicalBilliardsMath
    ? root.TopologicalBilliardsMath
    : (typeof require === 'function' ? require('./topological_billiards_math.js') : null);
  const physics = root && root.TopologicalBilliardsPhysics
    ? root.TopologicalBilliardsPhysics
    : (typeof require === 'function' ? require('./topological_billiards_physics.js') : null);
  const api = factory(math, physics);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TopologicalBilliardsNative = api;
})(typeof window !== 'undefined' ? window : globalThis, function(M, Physics) {
  'use strict';

  const TAU = Math.PI * 2;
  const EPSILON = 1e-8;
  const CONE_ANGLE_TOLERANCE = 1e-7;
  const PHYSICS_DT = 1 / 240;
  const REALISTIC_PHYSICS_DT = 1 / 480;
  const RESEARCH_PHYSICS_DT = 1 / 960;
  const DEFAULT_PHYSICS_PROFILE = 'legacy';
  const DEFAULT_EQUIPMENT_PROFILE = 'pool-9ft';
  const MIN_TILE_EDGE_LENGTH_M = 0.07;
  const MAX_TILE_EDGE_LENGTH_M = 0.5;
  const SOLVER_TOLERANCES_VERSION = 'event-toi-v1';
  const CUE_INPUT_VERSION = 'power-to-cue-speed-v1';
  const PHYSICS_VERSION = Object.freeze({
    legacy: 'legacy-v1',
    realistic: 'realistic-v2-event',
    research: 'research-v1-event'
  });
  const POSITION_SNAP_CSS_PX = 14;
  const DIRECTION_SNAP_STEP_DEGREES = 15;
  const DIRECTION_SNAP_TOLERANCE_DEGREES = 3;
  const SQUARE_DIRS = ['E', 'S', 'W', 'N'];
  const HEX_DIRS = ['E', 'SE', 'SW', 'W', 'NW', 'NE'];
  const SQUARE_CORNERS = ['NW', 'NE', 'SE', 'SW'];
  const HEX_CORNERS = ['NE', 'N', 'NW', 'SW', 'S', 'SE'];
  const SQUARE_OFFSETS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const HEX_DELTAS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const BALL_COLORS = Physics && Array.isArray(Physics.BALL_COLORS)
    ? Physics.BALL_COLORS.slice()
    : [
      '#f1c84c', '#2f70bb', '#c54b43', '#72509b', '#df7f37', '#3c8d62',
      '#7e3543', '#25262a', '#e4ba3f', '#397ab9', '#cf5147', '#78529b',
      '#e2873e', '#3f9567', '#823b49'
    ];
  const DEFAULT_PARAMETERS = Object.freeze({
    restitution: 0.94,
    wallRestitution: 0.86,
    friction: 1,
    clothFriction: 0.5,
    rollingResistance: 0.36,
    spinResistance: 0.6,
    stopSpeed: 0.004,
    stopSpin: 0.08,
    shotSpeed: 4.8,
    maxShotSeconds: 28,
    localCoverDepth: 3,
    ballBallFriction: 0,
    cushionFriction: 0,
    collisionIterations: 12,
    eventTimeEpsilon: 1e-7,
    swerveCoefficient: 0,
    pocketAcceptanceSpeed: 1e9
  });
  const REALISTIC_PARAMETER_DEFAULTS = Object.freeze({
    ballBallFriction: 0.055,
    cushionFriction: 0.18,
    collisionIterations: 24,
    eventTimeEpsilon: 2e-7,
    swerveCoefficient: 0.0018,
    pocketAcceptanceSpeed: 2.8
  });
  const RESEARCH_PARAMETER_DEFAULTS = Object.freeze({
    ballBallFriction: 0.06,
    cushionFriction: 0.2,
    collisionIterations: 64,
    eventTimeEpsilon: 5e-9,
    swerveCoefficient: 0.0018,
    pocketAcceptanceSpeed: 2.65
  });
  const EQUIPMENT_PROFILES = Object.freeze({
    'pool-9ft': Object.freeze({
      id: 'pool-9ft',
      version: 'wpa-9ft-v1',
      label: '9-foot pool',
      tableLengthM: 2.54,
      tableWidthM: 1.27,
      ballDiameterM: 0.05715,
      ballMassKg: 0.17,
      gravityMps2: 9.80665,
      cueSpeedMaxMps: 7.5,
      cushionNoseHeightM: 0.0366,
      cornerPocketMouthM: 0.114,
      sidePocketMouthM: 0.127,
      clothKineticFriction: 0.20,
      clothRollingResistance: 0.012,
      provenance: 'WPA dimensions; contact coefficients are calibration-v1'
    }),
    'chinese-8ball': Object.freeze({
      id: 'chinese-8ball',
      version: 'wpa-heyball-2025-v1',
      label: 'Chinese 8-ball',
      tableLengthM: 2.54,
      tableWidthM: 1.26,
      ballDiameterM: 0.05715,
      ballMassKg: 0.163,
      gravityMps2: 9.80665,
      cueSpeedMaxMps: 7.5,
      cushionNoseHeightM: 0.0366,
      cornerPocketMouthM: 0.085,
      sidePocketMouthM: 0.088,
      clothKineticFriction: 0.22,
      clothRollingResistance: 0.014,
      provenance: 'WPA Rules of Heyball 2025 dimensions; contact coefficients are calibration-v1'
    })
  });
  const CUE_PROFILES = Object.freeze({
    playing: Object.freeze({ id: 'playing', effectiveMassKg: 0.45, restitution: 0.72, squirtCoefficient: 0.018 }),
    'low-deflection': Object.freeze({ id: 'low-deflection', effectiveMassKg: 0.40, restitution: 0.72, squirtCoefficient: 0.009 }),
    jump: Object.freeze({ id: 'jump', effectiveMassKg: 0.32, restitution: 0.68, squirtCoefficient: 0.014 })
  });
  const TIP_PROFILES = Object.freeze({
    medium: Object.freeze({ id: 'medium', radiusM: 0.0065, friction: 0.62, maxOffset: 0.82 }),
    soft: Object.freeze({ id: 'soft', radiusM: 0.0065, friction: 0.70, maxOffset: 0.86 }),
    hard: Object.freeze({ id: 'hard', radiusM: 0.0065, friction: 0.54, maxOffset: 0.76 })
  });
  const STROKE_PRESETS = Object.freeze({
    center: Object.freeze({ tipOffset: { x: 0, y: 0 }, elevationDeg: 0 }),
    follow: Object.freeze({ tipOffset: { x: 0, y: 0.38 }, elevationDeg: 0 }),
    draw: Object.freeze({ tipOffset: { x: 0, y: -0.38 }, elevationDeg: 0 }),
    stun: Object.freeze({ tipOffset: { x: 0, y: -0.14 }, elevationDeg: 0 }),
    left: Object.freeze({ tipOffset: { x: -0.4, y: 0 }, elevationDeg: 0 }),
    right: Object.freeze({ tipOffset: { x: 0.4, y: 0 }, elevationDeg: 0 }),
    spinHeavy: Object.freeze({ tipOffset: { x: 0.56, y: 0.2 }, elevationDeg: 2 }),
    smooth: Object.freeze({ tipOffset: { x: 0, y: 0.2 }, elevationDeg: 0 }),
    punch: Object.freeze({ tipOffset: { x: 0, y: -0.08 }, elevationDeg: 0 }),
    short: Object.freeze({ tipOffset: { x: 0, y: 0 }, elevationDeg: 0 }),
    masse: Object.freeze({ tipOffset: { x: -0.48, y: -0.18 }, elevationDeg: 55 }),
    jump: Object.freeze({ tipOffset: { x: 0, y: -0.24 }, elevationDeg: 32, cueProfileId: 'jump' })
  });

  function clonePlain(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function normalizeFriction(value, fallback = DEFAULT_PARAMETERS.friction) {
    const number = value == null || value === '' ? NaN : Number(value);
    const fallbackNumber = Number(fallback);
    const resolvedFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : DEFAULT_PARAMETERS.friction;
    return clamp(Number.isFinite(number) ? number : resolvedFallback, 0.5, 2.5);
  }

  function normalizePhysicsProfile(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'realistic' || normalized === 'research' ? normalized : DEFAULT_PHYSICS_PROFILE;
  }

  function physicsTimeStep(profile) {
    const normalized = normalizePhysicsProfile(profile);
    if (normalized === 'research') return RESEARCH_PHYSICS_DT;
    return normalized === 'realistic' ? REALISTIC_PHYSICS_DT : PHYSICS_DT;
  }

  function parametersForPhysicsProfile(profile, overrides = {}) {
    const normalized = normalizePhysicsProfile(profile);
    return {
      ...DEFAULT_PARAMETERS,
      ...(normalized === 'realistic' ? REALISTIC_PARAMETER_DEFAULTS : {}),
      ...(normalized === 'research' ? RESEARCH_PARAMETER_DEFAULTS : {}),
      ...(overrides || {})
    };
  }

  function normalizeEquipmentProfile(value) {
    const id = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(EQUIPMENT_PROFILES, id) ? id : DEFAULT_EQUIPMENT_PROFILE;
  }

  function equipmentProfile(value) {
    return EQUIPMENT_PROFILES[normalizeEquipmentProfile(value)];
  }

  function normalizeTileEdgeLengthM(value, fallback) {
    const number = value == null || value === '' ? NaN : Number(value);
    const fallbackNumber = Number(fallback);
    const resolvedFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : 0.13;
    return clamp(Number.isFinite(number) ? number : resolvedFallback, MIN_TILE_EDGE_LENGTH_M, MAX_TILE_EDGE_LENGTH_M);
  }

  function ballRadiusForTileEdgeLength(equipment, tileEdgeLengthM) {
    return normalizeRadius(equipment.ballDiameterM / (2 * tileEdgeLengthM), 0.22, 0.005, 0.45);
  }

  function pocketRadiusForTileEdgeLength(equipment, tileEdgeLengthM) {
    // Quotient vertices do not have a stable ordinary-table side/corner role.
    // Use the corner mouth as the conservative circular pocket diameter.
    return normalizeRadius(equipment.cornerPocketMouthM / (2 * tileEdgeLengthM), 0.34, 0.005, 0.75);
  }

  function cueProfile(value) {
    const id = String(value || '').trim();
    return CUE_PROFILES[id] || CUE_PROFILES.playing;
  }

  function tipProfile(value) {
    const id = String(value || '').trim();
    return TIP_PROFILES[id] || TIP_PROFILES.medium;
  }

  function normalizeLattice(value) {
    const text = String(value || '').trim().toLowerCase();
    return text === 'hex' || text === 'hexagonal' ? 'hexagonal' : 'square';
  }

  function latticeInfo(preset) {
    const hex = normalizeLattice(preset && preset.lattice) === 'hexagonal';
    return {
      id: hex ? 'hexagonal' : 'square',
      shape: hex ? 'hex' : 'square',
      sides: hex ? 6 : 4,
      dirNames: hex ? HEX_DIRS : SQUARE_DIRS,
      cornerNames: hex ? HEX_CORNERS : SQUARE_CORNERS,
      cornerAngle: hex ? (Math.PI * 2 / 3) : (Math.PI / 2)
    };
  }

  function indexOf(row, col, cols) {
    return (row - 1) * cols + (col - 1);
  }

  function rowCol(index, cols) {
    return { row: Math.floor(index / cols) + 1, col: (index % cols) + 1 };
  }

  function offsetToAxial(rowZero, colZero) {
    return { q: colZero - Math.floor(rowZero / 2), r: rowZero };
  }

  function axialToOffset(q, r) {
    return { row: r, col: q + Math.floor(r / 2) };
  }

  function neighborPosition(row, col, dir, preset) {
    const info = latticeInfo(preset);
    if (info.shape === 'hex') {
      const axial = offsetToAxial(row - 1, col - 1);
      const delta = HEX_DELTAS[dir];
      if (!delta) return null;
      const offset = axialToOffset(axial.q + delta[0], axial.r + delta[1]);
      const next = { row: offset.row + 1, col: offset.col + 1 };
      if (next.row < 1 || next.row > preset.rows || next.col < 1 || next.col > preset.cols) return null;
      return next;
    }
    const delta = SQUARE_OFFSETS[dir];
    if (!delta) return null;
    const next = { row: row + delta[0], col: col + delta[1] };
    if (next.row < 1 || next.row > preset.rows || next.col < 1 || next.col > preset.cols) return null;
    return next;
  }

  function tileOrigin(row, col, info) {
    if (info.shape === 'hex') {
      const axial = offsetToAxial(row - 1, col - 1);
      return {
        x: Math.sqrt(3) * (axial.q + axial.r / 2),
        y: 1.5 * axial.r
      };
    }
    return { x: col - 1, y: row - 1 };
  }

  function localPolygon(info) {
    if (info.shape === 'hex') {
      return Array.from({ length: 6 }, (_, index) => {
        const angle = ((30 + index * 60) * Math.PI) / 180;
        return { x: Math.cos(angle), y: Math.sin(angle) };
      });
    }
    return [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 }
    ];
  }

  function edgeCornerIndices(info, dir) {
    return info.shape === 'hex'
      ? [modulo(dir - 1, info.sides), modulo(dir, info.sides)]
      : [modulo(dir + 1, 4), modulo(dir + 2, 4)];
  }

  function edgeSegmentForPolygon(polygon, info, dir) {
    const corners = edgeCornerIndices(info, dir);
    return { start: polygon[corners[0]], end: polygon[corners[1]], corners };
  }

  function edgeKey(tileIndex, dir) {
    return `${tileIndex}:${dir}`;
  }

  function cutKey(left, right) {
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function normalizeDir(value, info) {
    const number = Number(value);
    if (Number.isInteger(number)) return modulo(number, info.sides);
    const text = String(value || '').trim().toUpperCase();
    const index = info.dirNames.indexOf(text);
    return index >= 0 ? index : null;
  }

  function normalizeEdge(edge, preset, info) {
    if (!edge || typeof edge !== 'object') return null;
    const row = Number(edge.row);
    const col = Number(edge.col);
    const dir = normalizeDir(edge.dir, info);
    if (!Number.isInteger(row) || !Number.isInteger(col) || !Number.isInteger(dir)) return null;
    if (row < 1 || row > preset.rows || col < 1 || col > preset.cols) return null;
    return { row, col, dir, tileIndex: indexOf(row, col, preset.cols) };
  }

  function affineBetweenFrames(sourceStart, sourceEnd, destStart, destEnd, sourceOutward, destOutward) {
    const sourceTangent = M.normalize2(M.sub2(sourceEnd, sourceStart));
    const destTangent = M.normalize2(M.sub2(destEnd, destStart));
    const sourceNormal = M.normalize2(sourceOutward);
    const destNormal = M.normalize2(M.scale2(destOutward, -1));
    const a = (destTangent.x * sourceTangent.x) + (destNormal.x * sourceNormal.x);
    const b = (destTangent.x * sourceTangent.y) + (destNormal.x * sourceNormal.y);
    const c = (destTangent.y * sourceTangent.x) + (destNormal.y * sourceNormal.x);
    const d = (destTangent.y * sourceTangent.y) + (destNormal.y * sourceNormal.y);
    return {
      a,
      b,
      c,
      d,
      tx: destStart.x - (a * sourceStart.x) - (b * sourceStart.y),
      ty: destStart.y - (c * sourceStart.x) - (d * sourceStart.y)
    };
  }

  function edgeFrame(polygon, info, dir) {
    const segment = edgeSegmentForPolygon(polygon, info, dir);
    const tangent = M.sub2(segment.end, segment.start);
    const inward = M.normalize2({ x: -tangent.y, y: tangent.x });
    return { ...segment, inward, outward: M.scale2(inward, -1) };
  }

  function directTransition(source, destination, sourceFrame) {
    const transform = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: source.origin.x - destination.origin.x,
      ty: source.origin.y - destination.origin.y
    };
    return {
      kind: 'direct',
      tileIndex: destination.index,
      dir: sourceFrame.dir,
      transform,
      inverseTransform: M.inverseAffine(transform)
    };
  }

  function glueTransform(sourceTile, sourceFrame, destTile, destFrame, pair, fromFirst) {
    const firstReverse = Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed')
      ? !!pair.firstArrowReversed
      : !!pair.reversed;
    const secondReverse = Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed')
      ? !!pair.secondArrowReversed
      : true;
    const sourceReverse = fromFirst ? firstReverse : secondReverse;
    const destReverse = fromFirst ? secondReverse : firstReverse;
    const sourceStart = sourceReverse ? sourceFrame.end : sourceFrame.start;
    const sourceEnd = sourceReverse ? sourceFrame.start : sourceFrame.end;
    const destStart = destReverse ? destFrame.end : destFrame.start;
    const destEnd = destReverse ? destFrame.start : destFrame.end;
    return affineBetweenFrames(
      sourceStart,
      sourceEnd,
      destStart,
      destEnd,
      sourceFrame.outward,
      destFrame.outward
    );
  }

  function createUnionFind(length) {
    const parent = Array.from({ length }, (_, index) => index);
    const rank = Array(length).fill(0);
    const find = (value) => {
      let current = value;
      while (parent[current] !== current) {
        parent[current] = parent[parent[current]];
        current = parent[current];
      }
      return current;
    };
    const union = (left, right) => {
      let a = find(left);
      let b = find(right);
      if (a === b) return;
      if (rank[a] < rank[b]) [a, b] = [b, a];
      parent[b] = a;
      if (rank[a] === rank[b]) rank[a] += 1;
    };
    return { find, union };
  }

  function buildVertexClasses(atlas, endpointLinks) {
    const sides = atlas.info.sides;
    const uf = createUnionFind(atlas.tiles.length * sides);
    endpointLinks.forEach((link) => {
      uf.union(link.firstTile * sides + link.firstCorner, link.secondTile * sides + link.secondCorner);
    });
    const groups = new Map();
    atlas.tiles.forEach((tile) => {
      tile.polygon.forEach((point, corner) => {
        if (tile.removed) return;
        const root = uf.find(tile.index * sides + corner);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push({
          tileIndex: tile.index,
          row: tile.row,
          col: tile.col,
          corner,
          cornerName: atlas.info.cornerNames[corner],
          point: { ...point }
        });
      });
    });
    const classes = [];
    Array.from(groups.values())
      .sort((left, right) => left[0].tileIndex - right[0].tileIndex || left[0].corner - right[0].corner)
      .forEach((incidences, index) => {
        const unique = [];
        const seen = new Set();
        incidences.forEach((entry) => {
          const key = `${entry.tileIndex}:${entry.corner}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(entry);
          }
        });
        const coneAngle = unique.length * atlas.info.cornerAngle;
        classes.push({
          id: `v${index + 1}`,
          index,
          coneAngle,
          singular: Math.abs(coneAngle - TAU) > CONE_ANGLE_TOLERANCE,
          incidences: unique
        });
      });
    atlas.vertexClasses = classes;
    atlas.vertexByCorner = new Map();
    classes.forEach((vertexClass) => {
      vertexClass.incidences.forEach((entry) => {
        atlas.vertexByCorner.set(`${entry.tileIndex}:${entry.corner}`, vertexClass.index);
      });
    });
  }

  function buildAtlas(preset) {
    if (!preset || typeof preset !== 'object') throw new Error('Billiards requires a normalized preset.');
    const info = latticeInfo(preset);
    const removed = new Set((preset.removedTiles || []).map((tile) => indexOf(Number(tile.row), Number(tile.col), preset.cols)));
    const cuts = new Set((preset.cutEdges || []).map((edge) => cutKey(
      indexOf(Number(edge.left.row), Number(edge.left.col), preset.cols),
      indexOf(Number(edge.right.row), Number(edge.right.col), preset.cols)
    )));
    const basePolygon = localPolygon(info);
    const tiles = [];
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        const index = indexOf(row, col, preset.cols);
        const polygon = basePolygon.map((point) => ({ ...point }));
        const frames = Array.from({ length: info.sides }, (_, dir) => ({
          ...edgeFrame(polygon, info, dir),
          dir
        }));
        tiles[index] = {
          index,
          row,
          col,
          origin: tileOrigin(row, col, info),
          polygon,
          frames,
          removed: removed.has(index),
          transitions: Array(info.sides).fill(null)
        };
      }
    }
    const atlas = {
      info,
      rows: preset.rows,
      cols: preset.cols,
      tiles,
      removed,
      cuts,
      vertexClasses: [],
      vertexByCorner: new Map(),
      chartTransformCache: new Map()
    };
    const endpointLinks = [];
    tiles.forEach((tile) => {
      if (tile.removed) return;
      for (let dir = 0; dir < info.sides; dir += 1) {
        const next = neighborPosition(tile.row, tile.col, dir, preset);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, preset.cols);
        const destination = tiles[nextIndex];
        if (!destination || destination.removed || cuts.has(cutKey(tile.index, nextIndex))) continue;
        const transition = directTransition(tile, destination, tile.frames[dir]);
        tile.transitions[dir] = transition;
        const sourceCorners = tile.frames[dir].corners;
        const destinationDir = modulo(dir + info.sides / 2, info.sides);
        const destinationCorners = destination.frames[destinationDir].corners;
        endpointLinks.push(
          { firstTile: tile.index, firstCorner: sourceCorners[0], secondTile: destination.index, secondCorner: destinationCorners[1] },
          { firstTile: tile.index, firstCorner: sourceCorners[1], secondTile: destination.index, secondCorner: destinationCorners[0] }
        );
      }
    });
    (preset.gluedEdges || []).forEach((pair, pairIndex) => {
      const first = normalizeEdge(pair.first, preset, info);
      const second = normalizeEdge(pair.second, preset, info);
      if (!first || !second || removed.has(first.tileIndex) || removed.has(second.tileIndex)) return;
      const firstTile = tiles[first.tileIndex];
      const secondTile = tiles[second.tileIndex];
      const firstFrame = firstTile.frames[first.dir];
      const secondFrame = secondTile.frames[second.dir];
      const firstTransform = glueTransform(firstTile, firstFrame, secondTile, secondFrame, pair, true);
      const secondTransform = M.inverseAffine(firstTransform);
      firstTile.transitions[first.dir] = {
        kind: 'glued',
        pairIndex,
        tileIndex: second.tileIndex,
        dir: first.dir,
        destinationDir: second.dir,
        transform: firstTransform,
        inverseTransform: secondTransform,
        reversed: M.affineDeterminant(firstTransform) < 0
      };
      secondTile.transitions[second.dir] = {
        kind: 'glued',
        pairIndex,
        tileIndex: first.tileIndex,
        dir: second.dir,
        destinationDir: first.dir,
        transform: secondTransform,
        inverseTransform: firstTransform,
        reversed: M.affineDeterminant(secondTransform) < 0
      };
      const firstReverse = Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed') ? !!pair.firstArrowReversed : !!pair.reversed;
      const secondReverse = Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed') ? !!pair.secondArrowReversed : true;
      const firstCorners = firstReverse ? firstFrame.corners.slice().reverse() : firstFrame.corners;
      const secondCorners = secondReverse ? secondFrame.corners.slice().reverse() : secondFrame.corners;
      endpointLinks.push(
        { firstTile: first.tileIndex, firstCorner: firstCorners[0], secondTile: second.tileIndex, secondCorner: secondCorners[0] },
        { firstTile: first.tileIndex, firstCorner: firstCorners[1], secondTile: second.tileIndex, secondCorner: secondCorners[1] }
      );
    });
    buildVertexClasses(atlas, endpointLinks);
    return atlas;
  }

  function normalizeRules(value) {
    return String(value || '').trim().toLowerCase() === 'competitive' ? 'competitive' : 'solo';
  }

  function normalizeRadius(value, fallback, minimum, maximum) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, minimum, maximum) : fallback;
  }

  function normalizeQuaternion(value) {
    return M.normalizeQuaternion(value && typeof value === 'object' ? value : M.quaternion());
  }

  function normalizeVector2(value) {
    return {
      x: Number.isFinite(Number(value && value.x)) ? Number(value.x) : 0,
      y: Number.isFinite(Number(value && value.y)) ? Number(value.y) : 0
    };
  }

  function normalizeVector3(value) {
    return {
      x: Number.isFinite(Number(value && value.x)) ? Number(value.x) : 0,
      y: Number.isFinite(Number(value && value.y)) ? Number(value.y) : 0,
      z: Number.isFinite(Number(value && value.z)) ? Number(value.z) : 0
    };
  }

  function normalizeMotionState(value, active = true) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['sliding', 'rolling', 'spinning', 'airborne', 'pocket-fall', 'sleeping', 'pocketed'].includes(normalized)) return normalized;
    return active ? 'sleeping' : 'pocketed';
  }

  function ballColor(kind, number) {
    if (kind === 'cue') return '#f7f4e9';
    const normalized = Math.max(1, Math.floor(Number(number) || 1));
    return BALL_COLORS[modulo(normalized - 1, BALL_COLORS.length)];
  }

  function defaultBallOrientation() {
    return M.quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
  }

  function tileIndexFromAt(at, preset, atlas) {
    if (Number.isInteger(at && at.tileIndex) && atlas.tiles[at.tileIndex] && !atlas.tiles[at.tileIndex].removed) return at.tileIndex;
    const row = Number(at && at.row);
    const col = Number(at && at.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    const index = indexOf(row, col, preset.cols);
    return atlas.tiles[index] && !atlas.tiles[index].removed ? index : null;
  }

  function pointFromLocationReference(at, preset, atlas) {
    const tileIndex = tileIndexFromAt(at, preset, atlas);
    if (!Number.isInteger(tileIndex)) return null;
    const tile = atlas.tiles[tileIndex];
    const anchor = String(at && at.anchor || '').trim().toLowerCase();
    if (anchor === 'center') return { tileIndex, position: { x: 0, y: 0 }, anchor: { kind: 'center' } };
    if (at && at.corner != null) {
      const cornerName = String(at.corner).trim().toUpperCase();
      const corner = atlas.info.cornerNames.indexOf(cornerName);
      if (corner < 0 || !tile.polygon[corner]) return null;
      return {
        tileIndex,
        position: { ...tile.polygon[corner] },
        anchor: { kind: 'vertex', corner, cornerName: atlas.info.cornerNames[corner] }
      };
    }
    return { tileIndex, position: normalizeVector2(at), anchor: null };
  }

  function locationReferenceForPoint(tileIndex, position, preset, atlas, tolerance = 1e-7) {
    if (!Number.isInteger(tileIndex) || !atlas.tiles[tileIndex] || atlas.tiles[tileIndex].removed) return null;
    const tile = rowCol(tileIndex, preset.cols);
    const point = normalizeVector2(position);
    if (M.length2(point) <= tolerance) return { row: tile.row, col: tile.col, anchor: 'center' };
    const polygon = atlas.tiles[tileIndex].polygon;
    for (let corner = 0; corner < polygon.length; corner += 1) {
      if (M.length2(M.sub2(point, polygon[corner])) <= tolerance) {
        return { row: tile.row, col: tile.col, corner: atlas.info.cornerNames[corner] };
      }
    }
    return { row: tile.row, col: tile.col, x: point.x, y: point.y };
  }

  function ballFromPayload(source, preset, atlas, defaults, ordinal) {
    const at = source && source.at && typeof source.at === 'object' ? source.at : source;
    const location = pointFromLocationReference(at, preset, atlas);
    if (!location) return null;
    const tileIndex = location.tileIndex;
    const kind = String(source && source.kind || '').trim().toLowerCase() === 'cue' || String(source && source.id || '').trim().toLowerCase() === 'cue'
      ? 'cue'
      : 'target';
    const number = kind === 'target' ? Math.max(1, Math.floor(Number(source && source.number) || ordinal || 1)) : 0;
    const active = source && Object.prototype.hasOwnProperty.call(source, 'active') ? !!source.active : true;
    const velocity = normalizeVector2(source && source.velocity);
    return {
      id: String(source && source.id || (kind === 'cue' ? 'cue' : number)),
      kind,
      number,
      color: ballColor(kind, number),
      tileIndex,
      position: { ...location.position },
      height: Math.max(0, Number(source && source.height) || 0),
      velocity: { ...velocity, z: Number(source && source.velocity && source.velocity.z) || 0 },
      angularVelocity: normalizeVector3(source && source.angularVelocity),
      orientation: source && source.orientation ? normalizeQuaternion(source.orientation) : defaultBallOrientation(),
      radius: normalizeRadius(source && source.radius, defaults.ballRadius, 0.005, 0.45),
      mass: normalizeRadius(source && source.mass, 1, 0.05, 20),
      physicalMassKg: Math.max(0.01, Number(source && source.physicalMassKg) || Number(defaults.physicalMassKg) || 0.17),
      active,
      motionState: normalizeMotionState(source && source.motionState, active),
      pocketedAt: String(source && source.pocketedAt || ''),
      crossings: Math.max(0, Math.floor(Number(source && source.crossings) || 0))
    };
  }

  function lowestMissingTargetNumber(balls) {
    const used = new Set((balls || [])
      .filter((ball) => ball && ball.kind === 'target')
      .map((ball) => Math.max(1, Math.floor(Number(ball.number) || 1))));
    let number = 1;
    while (used.has(number)) number += 1;
    return number;
  }

  function vertexClassFromReference(reference, preset, atlas) {
    if (reference == null) return null;
    if (typeof reference === 'string') {
      const direct = atlas.vertexClasses.find((entry) => entry.id === reference);
      if (direct) return direct;
    }
    if (Number.isInteger(Number(reference.classIndex))) return atlas.vertexClasses[Number(reference.classIndex)] || null;
    const vertex = reference.vertex && typeof reference.vertex === 'object' ? reference.vertex : reference;
    const row = Number(vertex.row);
    const col = Number(vertex.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    const tileIndex = indexOf(row, col, preset.cols);
    const tile = atlas.tiles[tileIndex];
    if (!tile || tile.removed) return null;
    let corner = Number(vertex.corner);
    if (!Number.isInteger(corner)) {
      corner = atlas.info.cornerNames.indexOf(String(vertex.corner || '').trim().toUpperCase());
    }
    if (corner < 0 || corner >= atlas.info.sides) return null;
    const classIndex = atlas.vertexByCorner.get(`${tileIndex}:${corner}`);
    return Number.isInteger(classIndex) ? atlas.vertexClasses[classIndex] : null;
  }

  function pocketsFromPreset(block, preset, atlas, pocketRadius) {
    const explicit = block && Object.prototype.hasOwnProperty.call(block, 'pockets');
    const sources = explicit && Array.isArray(block.pockets)
      ? block.pockets
      : atlas.vertexClasses.filter((entry) => (
        Math.abs(entry.coneAngle - Math.PI) > CONE_ANGLE_TOLERANCE
        && Math.abs(entry.coneAngle - TAU) > CONE_ANGLE_TOLERANCE
      )).map((entry) => ({ classIndex: entry.index }));
    const seen = new Set();
    const pockets = [];
    sources.forEach((source, index) => {
      const vertexClass = vertexClassFromReference(source, preset, atlas);
      if (!vertexClass || seen.has(vertexClass.index)) return;
      seen.add(vertexClass.index);
      pockets.push({
        id: String(source && source.id || `p${index + 1}`),
        classIndex: vertexClass.index,
        radius: normalizeRadius(source && source.radius, pocketRadius, 0.005, 0.75)
      });
    });
    return pockets;
  }

  function createState(preset, options = {}) {
    const atlas = buildAtlas(preset);
    const block = preset.billiards && typeof preset.billiards === 'object' && !Array.isArray(preset.billiards)
      ? preset.billiards
      : {};
    const rules = normalizeRules(options.rules || block.rules);
    const equipmentProfileId = normalizeEquipmentProfile(options.equipmentProfileId || block.equipmentProfileId);
    const equipment = equipmentProfile(equipmentProfileId);
    const legacyBallRadius = normalizeRadius(block.ballRadius, 0.22, 0.005, 0.45);
    const inferredTileEdgeLengthM = equipment.ballDiameterM / (2 * legacyBallRadius);
    const tileEdgeLengthM = normalizeTileEdgeLengthM(
      options.tileEdgeLengthM != null ? options.tileEdgeLengthM : block.tileEdgeLengthM,
      inferredTileEdgeLengthM
    );
    const hasExplicitTileEdgeLength = options.tileEdgeLengthM != null || block.tileEdgeLengthM != null;
    const ballRadius = hasExplicitTileEdgeLength
      ? ballRadiusForTileEdgeLength(equipment, tileEdgeLengthM)
      : legacyBallRadius;
    const pocketRadius = block.pocketRadius != null
      ? normalizeRadius(block.pocketRadius, 0.34, 0.005, 0.75)
      : (hasExplicitTileEdgeLength
        ? pocketRadiusForTileEdgeLength(equipment, tileEdgeLengthM)
        : 0.34);
    const defaults = { ballRadius, pocketRadius, physicalMassKg: equipment.ballMassKg };
    const ballSources = Array.isArray(block.balls) ? block.balls : [];
    const balls = ballSources.map((source, index) => ballFromPayload(source, preset, atlas, defaults, index + 1)).filter(Boolean);
    const physicsProfile = normalizePhysicsProfile(options.physicsProfile || block.physicsProfile);
    const parameters = parametersForPhysicsProfile(physicsProfile, block.parameters);
    parameters.friction = normalizeFriction(
      options.friction != null ? options.friction : parameters.friction
    );
    const state = {
      version: 3,
      gameMode: 'billiards',
      preset,
      atlas,
      phase: 'setup',
      rules,
      ballRadius,
      pocketRadius,
      balls,
      pockets: pocketsFromPreset(block, preset, atlas, pocketRadius),
      scores: { 'player-1': 0, 'player-2': 0 },
      score: 0,
      turn: 'player-1',
      winner: '',
      shots: 0,
      round: 0,
      targetTotal: balls.filter((ball) => ball.kind === 'target').length,
      nextTargetNumber: lowestMissingTargetNumber(balls),
      nextPocketId: 1,
      ballInHand: false,
      ballInHandPlayer: '',
      lastShot: null,
      initialSetup: null,
      rackRecipe: null,
      rackTargetNumbers: [],
      recordMoves: [],
      deterministic: {
        dt: physicsTimeStep(physicsProfile),
        physicsProfile,
        physicsVersion: PHYSICS_VERSION[physicsProfile],
        equipmentProfileId,
        equipmentVersion: equipment.version,
        tileEdgeLengthM,
        solverTolerancesVersion: physicsProfile === 'legacy' ? 'legacy-fixed-step-v1' : SOLVER_TOLERANCES_VERSION,
        cueInputVersion: CUE_INPUT_VERSION,
        seed: Math.max(1, Math.floor(Number(block.seed) || 1)),
        parameters,
        telemetry: null
      },
      removed: new Set(atlas.removed),
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      ending: '',
      debugMessage: ''
    };
    if (block.rack != null) installRackRecipe(state, block.rack);
    while (state.pockets.some((pocket) => pocket.id === `p${state.nextPocketId}`)) state.nextPocketId += 1;
    return state;
  }

  function ballExport(ball, preset) {
    const tile = rowCol(ball.tileIndex, preset.cols);
    return {
      id: ball.id,
      kind: ball.kind,
      ...(ball.kind === 'target' ? { number: ball.number } : {}),
      color: ballColor(ball.kind, ball.number),
      at: { row: tile.row, col: tile.col, x: ball.position.x, y: ball.position.y },
      tileIndex: ball.tileIndex,
      position: { ...ball.position },
      velocity: { ...ball.velocity },
      height: Math.max(0, Number(ball.height) || 0),
      angularVelocity: { ...ball.angularVelocity },
      orientation: { ...ball.orientation },
      radius: ball.radius,
      mass: ball.mass,
      physicalMassKg: Math.max(0.01, Number(ball.physicalMassKg) || 0.17),
      active: !!ball.active,
      motionState: normalizeMotionState(ball.motionState, ball.active),
      pocketedAt: String(ball.pocketedAt || ''),
      crossings: ball.crossings || 0
    };
  }

  function pocketExport(pocket, state) {
    const vertexClass = state.atlas.vertexClasses[pocket.classIndex];
    const representative = vertexClass && vertexClass.incidences[0];
    return {
      id: pocket.id,
      classIndex: pocket.classIndex,
      radius: pocket.radius,
      coneAngle: vertexClass ? vertexClass.coneAngle : 0,
      vertex: representative ? { row: representative.row, col: representative.col, corner: representative.cornerName } : null
    };
  }

  function presetBlockFromState(state, options = {}) {
    const compactRack = intactRackRecipe(state);
    const compactNumbers = compactRack
      ? new Set(Array.from({ length: compactRack.count }, (_, index) => index + 1))
      : null;
    const block = {
      rules: normalizeRules(state.rules),
      physicsProfile: normalizePhysicsProfile(state.deterministic && state.deterministic.physicsProfile),
      equipmentProfileId: normalizeEquipmentProfile(state.deterministic && state.deterministic.equipmentProfileId),
      tileEdgeLengthM: normalizeTileEdgeLengthM(
        state.deterministic && state.deterministic.tileEdgeLengthM,
        localMetersPerUnit(state)
      ),
      ballRadius: state.ballRadius,
      pocketRadius: state.pocketRadius,
      parameters: clonePlain(state.deterministic.parameters),
      balls: state.balls.filter((ball) => (
        (options.activeOnly === false || ball.active)
        && !(compactNumbers && ball.kind === 'target' && compactNumbers.has(ball.number))
      )).map((ball) => {
        const exported = ballExport(ball, state.preset);
        return {
          id: exported.id,
          kind: exported.kind,
          ...(exported.kind === 'target' ? { number: exported.number } : {}),
          at: locationReferenceForPoint(ball.tileIndex, ball.position, state.preset, state.atlas) || exported.at
        };
      }),
      pockets: state.pockets.map((pocket) => {
        const exported = pocketExport(pocket, state);
        return { id: exported.id, vertex: exported.vertex };
      })
    };
    if (compactRack) block.rack = clonePlain(compactRack);
    return block;
  }

  function cloneState(source) {
    const preset = source.preset;
    const clone = createState({ ...preset, billiards: presetBlockFromState(source, { activeOnly: false }) }, { rules: source.rules });
    clone.phase = source.phase;
    clone.balls = source.balls.map((ball) => ({
      ...ball,
      position: { ...ball.position },
      velocity: { ...ball.velocity },
      angularVelocity: { ...ball.angularVelocity },
      orientation: { ...ball.orientation }
    }));
    clone.pockets = source.pockets.map((pocket) => ({ ...pocket }));
    clone.scores = { ...source.scores };
    clone.score = source.score || 0;
    clone.turn = source.turn || 'player-1';
    clone.winner = source.winner || '';
    clone.shots = source.shots || 0;
    clone.round = source.round || clone.shots;
    clone.targetTotal = Math.max(0, Number(source.targetTotal) || 0);
    clone.nextTargetNumber = lowestMissingTargetNumber(clone.balls);
    clone.nextPocketId = Math.max(1, Number(source.nextPocketId) || 1);
    clone.ballInHand = !!source.ballInHand;
    clone.ballInHandPlayer = source.ballInHandPlayer || '';
    clone.lastShot = clonePlain(source.lastShot);
    clone.initialSetup = clonePlain(source.initialSetup);
    clone.rackRecipe = clonePlain(source.rackRecipe);
    clone.rackTargetNumbers = Array.isArray(source.rackTargetNumbers) ? source.rackTargetNumbers.slice() : [];
    clone.recordMoves = clonePlain(source.recordMoves || []);
    clone.deterministic = clonePlain(source.deterministic || clone.deterministic);
    clone.ending = source.ending || '';
    clone.debugMessage = source.debugMessage || '';
    return clone;
  }

  function setPhysicsProfile(source, value) {
    if (!source) return source;
    const profile = normalizePhysicsProfile(value);
    const state = cloneState(source);
    const friction = normalizeFriction(state.deterministic && state.deterministic.parameters && state.deterministic.parameters.friction);
    state.deterministic = {
      ...(state.deterministic || {}),
      dt: physicsTimeStep(profile),
      physicsProfile: profile,
      physicsVersion: PHYSICS_VERSION[profile],
      solverTolerancesVersion: profile === 'legacy' ? 'legacy-fixed-step-v1' : SOLVER_TOLERANCES_VERSION,
      cueInputVersion: CUE_INPUT_VERSION,
      parameters: {
        ...(state.deterministic && state.deterministic.parameters || {}),
        ...(profile === 'realistic' ? REALISTIC_PARAMETER_DEFAULTS : {}),
        ...(profile === 'research' ? RESEARCH_PARAMETER_DEFAULTS : {}),
        ...(profile === 'legacy' ? {
          ballBallFriction: DEFAULT_PARAMETERS.ballBallFriction,
          cushionFriction: DEFAULT_PARAMETERS.cushionFriction,
          collisionIterations: DEFAULT_PARAMETERS.collisionIterations,
          eventTimeEpsilon: DEFAULT_PARAMETERS.eventTimeEpsilon,
          swerveCoefficient: DEFAULT_PARAMETERS.swerveCoefficient,
          pocketAcceptanceSpeed: DEFAULT_PARAMETERS.pocketAcceptanceSpeed
        } : {}),
        friction
      },
      telemetry: null
    };
    return state;
  }

  function setEquipmentProfile(source, value) {
    if (!source) return source;
    const state = cloneState(source);
    const id = normalizeEquipmentProfile(value);
    const equipment = equipmentProfile(id);
    const previousBallRadius = Math.max(EPSILON, Number(state.ballRadius) || 0.22);
    const previousPocketRadius = Math.max(EPSILON, Number(state.pocketRadius) || 0.34);
    const tileEdgeLengthM = normalizeTileEdgeLengthM(
      state.deterministic && state.deterministic.tileEdgeLengthM,
      localMetersPerUnit(state)
    );
    const ballRadius = ballRadiusForTileEdgeLength(equipment, tileEdgeLengthM);
    const radiusScale = ballRadius / previousBallRadius;
    const pocketRadius = pocketRadiusForTileEdgeLength(equipment, tileEdgeLengthM);
    const pocketRadiusScale = pocketRadius / previousPocketRadius;
    state.deterministic = {
      ...(state.deterministic || {}),
      equipmentProfileId: id,
      equipmentVersion: equipment.version,
      tileEdgeLengthM,
      telemetry: null
    };
    state.ballRadius = ballRadius;
    state.pocketRadius = pocketRadius;
    state.balls.forEach((ball) => {
      ball.radius = normalizeRadius(ball.radius * radiusScale, ballRadius, 0.005, 0.45);
      ball.physicalMassKg = equipment.ballMassKg;
    });
    state.pockets.forEach((pocket) => {
      pocket.radius = normalizeRadius(pocket.radius * pocketRadiusScale, pocketRadius, 0.005, 0.75);
    });
    return state;
  }

  function setTileEdgeLengthM(source, value) {
    if (!source) return source;
    const state = cloneState(source);
    const equipment = equipmentProfile(state.deterministic && state.deterministic.equipmentProfileId);
    const previousBallRadius = Math.max(EPSILON, Number(state.ballRadius) || 0.22);
    const previousPocketRadius = Math.max(EPSILON, Number(state.pocketRadius) || 0.34);
    const tileEdgeLengthM = normalizeTileEdgeLengthM(
      value,
      state.deterministic && state.deterministic.tileEdgeLengthM
    );
    const ballRadius = ballRadiusForTileEdgeLength(equipment, tileEdgeLengthM);
    const radiusScale = ballRadius / previousBallRadius;
    const pocketRadius = pocketRadiusForTileEdgeLength(equipment, tileEdgeLengthM);
    const pocketRadiusScale = pocketRadius / previousPocketRadius;
    state.ballRadius = ballRadius;
    state.pocketRadius = pocketRadius;
    state.balls.forEach((ball) => {
      ball.radius = normalizeRadius(ball.radius * radiusScale, ballRadius, 0.005, 0.45);
    });
    state.pockets.forEach((pocket) => {
      pocket.radius = normalizeRadius(pocket.radius * pocketRadiusScale, pocketRadius, 0.005, 0.75);
    });
    state.deterministic = {
      ...(state.deterministic || {}),
      tileEdgeLengthM,
      telemetry: null
    };
    return state;
  }

  function pointEdgeDistance(point, frame) {
    return M.dot2(M.sub2(point, frame.start), frame.inward);
  }

  function pointInsideTile(atlas, tileIndex, point, inset = 0) {
    const tile = atlas.tiles[tileIndex];
    return !!(tile && !tile.removed && tile.frames.every((frame) => pointEdgeDistance(point, frame) >= inset - EPSILON));
  }

  function nearestVertex(atlas, tileIndex, point) {
    const tile = atlas.tiles[tileIndex];
    if (!tile || tile.removed) return null;
    let best = null;
    tile.polygon.forEach((cornerPoint, corner) => {
      const distance = M.length2(M.sub2(point, cornerPoint));
      if (!best || distance < best.distance) {
        const classIndex = atlas.vertexByCorner.get(`${tileIndex}:${corner}`);
        best = { tileIndex, corner, classIndex, point: cornerPoint, distance };
      }
    });
    return best;
  }

  function chartTransformsFromTile(atlas, sourceTileIndex, maxDepth) {
    const depthLimit = Math.max(0, Math.floor(Number(maxDepth) || 0));
    if (!atlas.chartTransformCache) atlas.chartTransformCache = new Map();
    const cacheKey = `${sourceTileIndex}:${depthLimit}`;
    if (atlas.chartTransformCache.has(cacheKey)) return atlas.chartTransformCache.get(cacheKey);
    const all = [];
    const byTile = new Map();
    const byKey = new Map();
    const queue = [];
    const addChart = (tileIndex, transform, depth, path) => {
      const key = `${tileIndex}|${M.affineKey(transform, 6)}`;
      const existing = byKey.get(key);
      if (existing) return existing;
      const chart = {
        index: all.length,
        tileIndex,
        transform,
        inverseTransform: M.inverseAffine(transform),
        depth,
        path,
        edges: []
      };
      all.push(chart);
      byKey.set(key, chart);
      if (!byTile.has(tileIndex)) byTile.set(tileIndex, []);
      byTile.get(tileIndex).push(chart);
      queue.push(chart);
      return chart;
    };
    addChart(sourceTileIndex, M.identityAffine(), 0, '');
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const chart = queue[queueIndex];
      if (chart.depth >= depthLimit) continue;
      const tile = atlas.tiles[chart.tileIndex];
      tile.transitions.forEach((transition, dir) => {
        if (!transition) return;
        const transform = M.composeAffine(transition.transform, chart.transform);
        const child = addChart(
          transition.tileIndex,
          transform,
          chart.depth + 1,
          chart.path ? `${chart.path}.${dir}` : String(dir)
        );
        chart.edges.push({ dir, childIndex: child.index });
      });
    }
    const cached = { all, byTile };
    atlas.chartTransformCache.set(cacheKey, cached);
    return cached;
  }

  function ballImageFromChart(ball, chart, minimal = false, traversal = chart) {
    const image = {
      tileIndex: chart.tileIndex,
      transform: chart.transform,
      inverseTransform: chart.inverseTransform,
      depth: traversal.depth,
      path: traversal.path,
      position: M.applyAffine(chart.transform, ball.position)
    };
    if (minimal) return image;
    image.velocity = M.applyLinear(chart.transform, ball.velocity);
    image.angularVelocity = M.applyLiftedLinear(chart.transform, ball.angularVelocity);
    image.orientation = M.transportOrientation(ball.orientation, chart.transform);
    return image;
  }

  function nearbyImages(ball, atlas, options = {}) {
    const maxDepth = Math.max(0, Math.floor(Number(options.maxDepth) || 0));
    const minimal = options.minimal === true;
    const padding = Number.isFinite(options.padding) ? options.padding : Infinity;
    const charts = chartTransformsFromTile(atlas, ball.tileIndex, maxDepth);
    if (options.onlyIntersecting === false) {
      return charts.all.map((chart) => ballImageFromChart(ball, chart, minimal));
    }
    const images = [];
    const queue = [{ chartIndex: 0, depth: 0, path: '' }];
    const visited = new Set();
    const imagePositions = new Set();
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const traversal = queue[queueIndex];
      const chart = charts.all[traversal.chartIndex];
      if (!chart || visited.has(chart.index)) continue;
      visited.add(chart.index);
      const position = M.applyAffine(chart.transform, ball.position);
      if (!pointInsideTile(atlas, chart.tileIndex, position, -padding)) continue;
      const positionKey = `${chart.tileIndex}|${position.x.toFixed(7)}:${position.y.toFixed(7)}`;
      if (options.deduplicatePositions === false || !imagePositions.has(positionKey)) {
        imagePositions.add(positionKey);
        images.push(ballImageFromChart(ball, chart, minimal, traversal));
      }
      if (traversal.depth >= maxDepth) continue;
      const tile = atlas.tiles[chart.tileIndex];
      chart.edges.forEach((edge) => {
        if (pointEdgeDistance(position, tile.frames[edge.dir]) <= padding + EPSILON) {
          queue.push({
            chartIndex: edge.childIndex,
            depth: traversal.depth + 1,
            path: traversal.path ? `${traversal.path}.${edge.dir}` : String(edge.dir)
          });
        }
      });
    }
    return images;
  }

  function ballImagesInTile(ball, atlas, tileIndex, maxDepth = 3, padding = 0, options = {}) {
    return nearbyImages(ball, atlas, {
      padding,
      maxDepth,
      onlyIntersecting: true,
      minimal: true,
      deduplicatePositions: options.deduplicatePositions
    }).filter((image) => image.tileIndex === tileIndex);
  }

  function activePocketAtClass(state, classIndex) {
    return state.pockets.find((pocket) => pocket.classIndex === classIndex) || null;
  }

  function ballPocketOverlap(state, ball, pocket) {
    const vertexClass = state.atlas.vertexClasses[pocket.classIndex];
    if (!vertexClass) return false;
    return vertexClass.incidences.some((incidence) => {
      if (incidence.tileIndex !== ball.tileIndex) return false;
      return M.length2(M.sub2(ball.position, incidence.point)) < pocket.radius + ball.radius - EPSILON;
    });
  }

  function overlappingBall(state, candidate, ignoredId = '') {
    return state.balls.find((other) => {
      if (!other.active || other.id === ignoredId || other.id === candidate.id) return false;
      const images = ballImagesInTile(
        other,
        state.atlas,
        candidate.tileIndex,
        state.deterministic.parameters.localCoverDepth,
        candidate.radius + other.radius
      );
      return images.some((image) => M.length2(M.sub2(candidate.position, image.position)) < candidate.radius + other.radius - EPSILON);
    }) || null;
  }

  function selfImageOverlap(state, ball) {
    const images = ballImagesInTile(ball, state.atlas, ball.tileIndex, 3, ball.radius * 2, {
      deduplicatePositions: false
    });
    return images.some((image) => image.depth > 0 && M.length2(M.sub2(ball.position, image.position)) < ball.radius * 2 - EPSILON);
  }

  function placementIssue(state, ball, ignoredId = '') {
    if (!Number.isInteger(ball.tileIndex) || !pointInsideTile(state.atlas, ball.tileIndex, ball.position, 0)) return 'choose a point inside an existing tile';
    const tile = state.atlas.tiles[ball.tileIndex];
    for (let dir = 0; dir < state.atlas.info.sides; dir += 1) {
      if (!tile.transitions[dir] && pointEdgeDistance(ball.position, tile.frames[dir]) < ball.radius - EPSILON) {
        return 'ball intersects a physical boundary';
      }
    }
    if (state.pockets.some((pocket) => ballPocketOverlap(state, ball, pocket))) return 'ball intersects a pocket';
    if (overlappingBall(state, ball, ignoredId)) return 'ball overlaps another ball';
    if (selfImageOverlap(state, ball)) return 'ball overlaps its own short glued image';
    return '';
  }

  function setupIssue(state) {
    const cues = state.balls.filter((ball) => ball.active && ball.kind === 'cue');
    if (cues.length !== 1) return 'place exactly one cue ball';
    for (const ball of state.balls.filter((entry) => entry.active)) {
      const issue = placementIssue(state, ball, ball.id);
      if (issue) return `${ball.kind === 'cue' ? 'cue ball' : `ball ${ball.number}`}: ${issue}`;
    }
    return '';
  }

  function placeBall(state, selection, tileIndex, position) {
    const next = cloneState(state);
    const explicit = selection && typeof selection === 'object' && !Array.isArray(selection);
    const normalizedKind = (explicit ? selection.kind : selection) === 'cue' ? 'cue' : 'target';
    const number = normalizedKind === 'target'
      ? (explicit && Number.isFinite(Number(selection.number))
        ? Math.max(1, Math.floor(Number(selection.number)))
        : lowestMissingTargetNumber(next.balls))
      : 0;
    if (normalizedKind === 'cue' && next.balls.some((ball) => ball.kind === 'cue')) {
      return { changed: false, state, message: 'move or erase the existing cue ball first' };
    }
    if (normalizedKind === 'target' && next.balls.some((ball) => ball.kind === 'target' && ball.number === number)) {
      return { changed: false, state, message: `move or erase ball ${number} first` };
    }
    const usedIds = new Set(next.balls.map((ball) => String(ball.id)));
    let id = normalizedKind === 'cue' ? 'cue' : String(number);
    for (let suffix = 2; usedIds.has(id); suffix += 1) id = `ball-${number}-${suffix}`;
    const ball = ballFromPayload({
      id,
      kind: normalizedKind,
      number,
      at: { tileIndex, ...position }
    }, next.preset, next.atlas, next, number);
    if (!ball) return { changed: false, state, message: 'choose a point inside an existing tile' };
    const issue = placementIssue(next, ball, ball.id);
    if (issue) return { changed: false, state, message: issue };
    next.balls.push(ball);
    if (normalizedKind === 'target') {
      next.nextTargetNumber = lowestMissingTargetNumber(next.balls);
      next.targetTotal += 1;
    }
    return { changed: true, state: next, message: normalizedKind === 'cue' ? 'cue ball placed' : `ball ${number} placed` };
  }

  function moveBall(state, ballId, tileIndex, position) {
    const next = cloneState(state);
    const ball = next.balls.find((entry) => entry.id === ballId && entry.active);
    if (!ball) return { changed: false, state, message: 'ball not found' };
    ball.tileIndex = tileIndex;
    ball.position = { ...position };
    ball.velocity = { x: 0, y: 0 };
    ball.angularVelocity = { x: 0, y: 0, z: 0 };
    const issue = placementIssue(next, ball, ball.id);
    if (issue) return { changed: false, state, message: issue };
    if (ball.kind === 'target' && next.rackTargetNumbers.includes(ball.number)) {
      next.rackRecipe = null;
      next.rackTargetNumbers = [];
    }
    return { changed: true, state: next, message: `${ball.kind === 'cue' ? 'cue ball' : `ball ${ball.number}`} moved` };
  }

  function eraseAt(state, tileIndex, position) {
    const next = cloneState(state);
    let bestBall = null;
    next.balls.forEach((ball) => {
      if (!ball.active || ball.tileIndex !== tileIndex) return;
      const distance = M.length2(M.sub2(position, ball.position));
      if (distance <= ball.radius * 1.3 && (!bestBall || distance < bestBall.distance)) bestBall = { ball, distance };
    });
    if (bestBall) {
      next.balls = next.balls.filter((ball) => ball.id !== bestBall.ball.id);
      if (bestBall.ball.kind === 'target') {
        if (next.rackTargetNumbers.includes(bestBall.ball.number)) {
          next.rackRecipe = null;
          next.rackTargetNumbers = [];
        }
        next.targetTotal = Math.max(0, next.targetTotal - 1);
        next.nextTargetNumber = lowestMissingTargetNumber(next.balls);
      }
      return { changed: true, state: next, message: 'ball erased' };
    }
    const vertex = nearestVertex(next.atlas, tileIndex, position);
    if (vertex && vertex.distance <= next.pocketRadius * 1.5) {
      const pocket = activePocketAtClass(next, vertex.classIndex);
      if (pocket) {
        next.pockets = next.pockets.filter((entry) => entry.classIndex !== vertex.classIndex);
        return { changed: true, state: next, message: 'pocket erased' };
      }
    }
    return { changed: false, state, message: 'nothing to erase here' };
  }

  function togglePocket(state, tileIndex, position, forceAdd = false) {
    const next = cloneState(state);
    const vertex = nearestVertex(next.atlas, tileIndex, position);
    if (!vertex) return { changed: false, state, message: 'choose a quotient vertex' };
    const existing = activePocketAtClass(next, vertex.classIndex);
    if (existing && !forceAdd) {
      next.pockets = next.pockets.filter((pocket) => pocket.classIndex !== vertex.classIndex);
      return { changed: true, state: next, message: 'pocket removed' };
    }
    if (existing) return { changed: false, state, message: 'pocket already present' };
    next.pockets.push({ id: `p${next.nextPocketId++}`, classIndex: vertex.classIndex, radius: next.pocketRadius });
    return { changed: true, state: next, message: 'pocket added' };
  }

  // A non-mutating counterpart to the setup tools.  Both the minigame and
  // Mosaic Calculator use this so their cursor feedback describes exactly the
  // action that the native engine would perform.
  function setupInteractionPreview(state, selection, tileIndex, position) {
    const requested = selection && typeof selection === 'object' ? selection : { kind: selection };
    const kind = String(requested && requested.kind || '').trim().toLowerCase();
    const point = position && typeof position === 'object'
      ? { x: Number(position.x) || 0, y: Number(position.y) || 0 }
      : { x: 0, y: 0 };
    const base = { tileIndex, position: point, valid: false, action: 'none', message: 'choose a point inside an existing tile' };
    const tile = state && state.atlas && state.atlas.tiles && state.atlas.tiles[tileIndex];
    if (!tile || tile.removed) return base;
    if (kind === 'cue' || kind === 'target') {
      const normalized = kind === 'cue'
        ? { kind: 'cue' }
        : { kind: 'target', number: Math.max(1, Math.floor(Number(requested.number) || 1)) };
      const result = placeBall(state, normalized, tileIndex, point);
      return {
        ...base,
        type: 'ball',
        kind: normalized.kind,
        number: normalized.kind === 'target' ? normalized.number : 0,
        radius: state.ballRadius,
        valid: !!result.changed,
        action: result.changed ? 'place' : 'blocked',
        message: result.message || base.message
      };
    }
    if (kind === 'pocket') {
      const vertex = nearestVertex(state.atlas, tileIndex, point);
      const vertexClass = vertex && state.atlas.vertexClasses[vertex.classIndex];
      if (!vertex || !vertexClass) return { ...base, type: 'pocket', message: 'choose a quotient vertex' };
      const existing = activePocketAtClass(state, vertex.classIndex);
      return {
        ...base,
        type: 'pocket',
        valid: true,
        action: existing ? 'remove' : 'add',
        message: existing ? 'pocket removed' : 'pocket added',
        classIndex: vertex.classIndex,
        radius: existing ? existing.radius : state.pocketRadius,
        vertex: { tileIndex: vertex.tileIndex, position: { ...vertex.point } },
        incidences: vertexClass.incidences.map((incidence) => ({
          tileIndex: incidence.tileIndex,
          position: { ...incidence.point }
        }))
      };
    }
    if (kind === 'clear' || kind === 'erase') {
      const hit = ballAtPoint(state, tileIndex, point);
      if (hit && hit.ball) {
        return {
          ...base,
          type: 'ball',
          valid: true,
          action: 'erase',
          message: 'ball erased',
          ballId: hit.ball.id,
          kind: hit.ball.kind,
          number: hit.ball.number,
          radius: hit.ball.radius,
          image: { tileIndex: hit.image.tileIndex, position: { ...hit.image.position } }
        };
      }
      const vertex = nearestVertex(state.atlas, tileIndex, point);
      const pocket = vertex && activePocketAtClass(state, vertex.classIndex);
      if (vertex && pocket && vertex.distance <= state.pocketRadius * 1.5) {
        const vertexClass = state.atlas.vertexClasses[vertex.classIndex];
        return {
          ...base,
          type: 'pocket',
          valid: true,
          action: 'erase',
          message: 'pocket erased',
          classIndex: vertex.classIndex,
          radius: pocket.radius,
          incidences: (vertexClass && vertexClass.incidences || []).map((incidence) => ({
            tileIndex: incidence.tileIndex,
            position: { ...incidence.point }
          }))
        };
      }
      return { ...base, type: 'clear', message: 'nothing to erase here' };
    }
    return base;
  }

  function rackRowCount(count) {
    const normalized = Math.max(0, Math.floor(Number(count) || 0));
    const rows = Math.floor((Math.sqrt(1 + (8 * normalized)) - 1) / 2);
    return rows * (rows + 1) / 2 === normalized ? rows : 0;
  }

  function rackDirection(state, tileIndex, center) {
    const tile = state.atlas.tiles[tileIndex];
    if (!tile || !Array.isArray(tile.polygon) || !tile.polygon.length) return null;
    // Keep the legacy one-click fallback pointed down-table. Two-point setup
    // supplies an explicit direction and does not use this branch.
    return { x: 0, y: 1 };
  }

  function normalizedRackDirection(direction, fallback) {
    const vector = direction && Number.isFinite(Number(direction.x)) && Number.isFinite(Number(direction.y))
      ? { x: Number(direction.x), y: Number(direction.y) }
      : fallback;
    const length = M.length2(vector || { x: 0, y: 0 });
    return length > EPSILON ? M.scale2(vector, 1 / length) : fallback;
  }

  function rackLayout(count, center, direction, ballRadius) {
    const rows = rackRowCount(count);
    const normalizedDirection = normalizedRackDirection(direction, { x: 0, y: 1 });
    // Centres in a billiards rack form a triangular lattice, not a square
    // grid.  The minute gap prevents the strict collision test from reading
    // the picture-perfect rack as overlapping balls.
    const spacing = ballRadius * 2 * 1.005;
    const rowSpacing = spacing * Math.sqrt(3) / 2;
    const centroidOffset = (2 * (rows - 1)) / 3;
    const apex = M.sub2(center, M.scale2(normalizedDirection, rowSpacing * centroidOffset));
    const across = { x: -normalizedDirection.y, y: normalizedDirection.x };
    const positions = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column <= row; column += 1) {
        positions.push(M.add2(apex, M.add2(
          M.scale2(normalizedDirection, rowSpacing * row),
          M.scale2(across, spacing * (column - (row / 2)))
        )));
      }
    }
    return { rows, direction: normalizedDirection, spacing, rowSpacing, positions };
  }

  function normalizeRackRecipe(source, preset, atlas) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('invalid billiards rack recipe');
    const count = Math.max(0, Math.floor(Number(source.count) || 0));
    if (!rackRowCount(count)) throw new Error('billiards rack count must form a triangular rack');
    const centerSource = source.center && typeof source.center === 'object' ? source.center : source.at;
    const center = pointFromLocationReference(centerSource, preset, atlas);
    if (!center) throw new Error('billiards rack center must reference an existing tile');
    const angle = normalizeAngleDegrees(source.angle);
    if (angle == null) throw new Error('billiards rack angle must be finite');
    const centerReference = locationReferenceForPoint(center.tileIndex, center.position, preset, atlas);
    return {
      recipe: { count, center: centerReference, angle },
      count,
      tileIndex: center.tileIndex,
      position: { ...center.position },
      direction: directionFromAngleDegrees(angle)
    };
  }

  function expectedRackBalls(state, recipe) {
    const normalized = normalizeRackRecipe(recipe, state.preset, state.atlas);
    const layout = rackLayout(normalized.count, normalized.position, normalized.direction, state.ballRadius);
    const balls = [];
    layout.positions.forEach((rackPosition, index) => {
      const number = index + 1;
      const ball = ballFromPayload({
        id: String(number),
        kind: 'target',
        number,
        at: { tileIndex: normalized.tileIndex, ...rackPosition }
      }, state.preset, state.atlas, state, number);
      if (!ball || !canonicalizeBall(ball, state.atlas)) throw new Error('billiards rack does not fit on this surface');
      balls.push(ball);
    });
    return { normalized, balls };
  }

  function installRackRecipe(state, source) {
    const expected = expectedRackBalls(state, source);
    const generatedNumbers = new Set(Array.from({ length: expected.normalized.count }, (_, index) => index + 1));
    const conflicting = state.balls.find((ball) => ball.kind === 'target' && generatedNumbers.has(ball.number));
    if (conflicting) throw new Error(`billiards rack conflicts with explicit ball ${conflicting.number}`);
    const usedIds = new Set(state.balls.map((ball) => String(ball.id)));
    const placementState = { ...state, balls: state.balls.slice() };
    expected.balls.forEach((ball) => {
      if (usedIds.has(String(ball.id))) throw new Error(`billiards rack conflicts with explicit ball id ${ball.id}`);
      const issue = placementIssue(placementState, ball, ball.id);
      if (issue) throw new Error(`billiards rack does not fit: ${issue}`);
      usedIds.add(String(ball.id));
      placementState.balls.push(ball);
    });
    state.balls = placementState.balls;
    state.rackRecipe = clonePlain(expected.normalized.recipe);
    state.rackTargetNumbers = Array.from(generatedNumbers);
    state.targetTotal = state.balls.filter((ball) => ball.kind === 'target').length;
    state.nextTargetNumber = lowestMissingTargetNumber(state.balls);
    return state;
  }

  function rackRecipeFromPlacement(state, count, tileIndex, position, direction) {
    let angle = angleDegreesFromDirection(direction);
    if (angle == null) return null;
    const nearestStep = normalizeAngleDegrees(Math.round(angle / DIRECTION_SNAP_STEP_DEGREES) * DIRECTION_SNAP_STEP_DEGREES);
    if (Math.abs(modulo(angle - nearestStep + 180, 360) - 180) <= 1e-10) angle = nearestStep;
    const center = locationReferenceForPoint(tileIndex, position, state.preset, state.atlas);
    return center ? { count, center, angle } : null;
  }

  function intactRackRecipe(state) {
    if (!state || !state.rackRecipe) return null;
    let expected;
    try { expected = expectedRackBalls(state, state.rackRecipe); } catch (_) { return null; }
    const tolerance = 1e-7;
    for (const wanted of expected.balls) {
      const actual = state.balls.find((ball) => ball.active && ball.kind === 'target' && ball.number === wanted.number);
      if (!actual || actual.tileIndex !== wanted.tileIndex || M.length2(M.sub2(actual.position, wanted.position)) > tolerance) return null;
    }
    return clonePlain(expected.normalized.recipe);
  }

  function rackPreviewEntries(state, count, tileIndex, center, direction) {
    const layout = rackLayout(count, center, direction, state.ballRadius);
    if (!layout.rows || !Number.isInteger(tileIndex)) return [];
    const previewState = { ...state, balls: state.balls.filter((ball) => ball.kind !== 'target').slice() };
    return layout.positions.map((rackPosition, index) => {
      const ball = ballFromPayload({
        id: `rack-preview-${index + 1}`,
        kind: 'target',
        number: index + 1,
        at: { tileIndex, ...rackPosition }
      }, state.preset, state.atlas, state, index + 1);
      if (!ball || !canonicalizeBall(ball, state.atlas)) return { tileIndex, position: rackPosition, valid: false };
      const issue = placementIssue(previewState, ball, ball.id);
      previewState.balls.push(ball);
      return { tileIndex: ball.tileIndex, position: ball.position, valid: !issue };
    });
  }

  function placeRack(state, count, tileIndex, position, direction) {
    const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
    const fallback = rackDirection(state, tileIndex, position);
    const layout = rackLayout(normalizedCount, position, normalizedRackDirection(direction, fallback), state.ballRadius);
    if (!layout.rows || !fallback) return { changed: false, state, message: 'choose a point inside an existing tile' };
    const next = cloneState(state);
    next.balls = next.balls.filter((ball) => ball.kind !== 'target');
    let number = 1;
    for (const rackPosition of layout.positions) {
        const ball = ballFromPayload({
          id: String(number),
          kind: 'target',
          number,
          at: { tileIndex, ...rackPosition }
        }, next.preset, next.atlas, next, number);
        if (!ball) return { changed: false, state, message: 'rack does not fit on this tile' };
        if (!canonicalizeBall(ball, next.atlas)) return { changed: false, state, message: 'rack does not fit on this tile' };
        const issue = placementIssue(next, ball, ball.id);
        if (issue) return { changed: false, state, message: `rack does not fit: ${issue}` };
        next.balls.push(ball);
        number += 1;
    }
    next.targetTotal = normalizedCount;
    next.nextTargetNumber = lowestMissingTargetNumber(next.balls);
    next.rackRecipe = rackRecipeFromPlacement(next, normalizedCount, tileIndex, position, layout.direction);
    next.rackTargetNumbers = Array.from({ length: normalizedCount }, (_, index) => index + 1);
    return { changed: true, state: next, message: `${normalizedCount}-ball rack placed` };
  }

  function begin(state) {
    const issue = setupIssue(state);
    if (issue) return { changed: false, state, message: issue };
    const next = cloneState(state);
    next.phase = 'ready';
    next.targetTotal = next.balls.filter((ball) => ball.active && ball.kind === 'target').length;
    next.initialSetup = presetBlockFromState(next, { activeOnly: false });
    next.recordMoves = [];
    return { changed: true, state: next, message: next.targetTotal && next.pockets.length ? 'ready to shoot' : 'practice table ready' };
  }

  function canonicalizeBall(ball, atlas) {
    for (let guard = 0; guard < 16; guard += 1) {
      const tile = atlas.tiles[ball.tileIndex];
      let crossing = null;
      tile.frames.forEach((frame, dir) => {
        const distance = pointEdgeDistance(ball.position, frame);
        if (distance < -EPSILON && (!crossing || distance < crossing.distance)) crossing = { dir, distance };
      });
      if (!crossing) return true;
      const transition = tile.transitions[crossing.dir];
      if (!transition) return false;
      ball.position = M.applyAffine(transition.transform, ball.position);
      ball.velocity = M.applyLinear(transition.transform, ball.velocity);
      ball.angularVelocity = M.applyLiftedLinear(transition.transform, ball.angularVelocity);
      ball.orientation = M.transportOrientation(ball.orientation, transition.transform);
      ball.tileIndex = transition.tileIndex;
      ball.crossings = (ball.crossings || 0) + 1;
    }
    return false;
  }

  function resolveWalls(ball, atlas, parameters) {
    const restitution = Math.max(0, Number(parameters && parameters.wallRestitution) || 0);
    const cushionFriction = Math.max(0, Number(parameters && parameters.cushionFriction) || 0);
    const tile = atlas.tiles[ball.tileIndex];
    tile.frames.forEach((frame, dir) => {
      if (tile.transitions[dir]) return;
      const distance = pointEdgeDistance(ball.position, frame);
      if (distance >= ball.radius) return;
      ball.position = M.add2(ball.position, M.scale2(frame.inward, ball.radius - distance + EPSILON));
      const normalSpeed = M.dot2(ball.velocity, frame.inward);
      if (normalSpeed < 0) {
        const normalImpulse = -(1 + restitution) * normalSpeed * ball.mass;
        ball.velocity = M.sub2(ball.velocity, M.scale2(frame.inward, (1 + restitution) * normalSpeed));
        if (cushionFriction > 0 && normalImpulse > EPSILON) {
          const tangent = { x: -frame.inward.y, y: frame.inward.x };
          const contactTangentSpeed = M.dot2(ball.velocity, tangent) - ball.radius * ball.angularVelocity.z;
          const inertia = (2 / 5) * ball.mass * ball.radius * ball.radius;
          const inverseEffectiveMass = (1 / ball.mass) + (ball.radius * ball.radius / Math.max(inertia, EPSILON));
          const requestedImpulse = -contactTangentSpeed / Math.max(inverseEffectiveMass, EPSILON);
          const maximumImpulse = cushionFriction * normalImpulse;
          const tangentImpulse = clamp(requestedImpulse, -maximumImpulse, maximumImpulse);
          ball.velocity = M.add2(ball.velocity, M.scale2(tangent, tangentImpulse / ball.mass));
          ball.angularVelocity.z -= ball.radius * tangentImpulse / Math.max(inertia, EPSILON);
        }
      }
    });
  }

  function applyFriction(ball, dt, parameters) {
    const friction = normalizeFriction(parameters.friction);
    const clothFriction = Math.max(0, Number(parameters.clothFriction) || 0) * friction;
    const rollingResistance = Math.max(0, Number(parameters.rollingResistance) || 0) * friction;
    const spinResistance = Math.max(0, Number(parameters.spinResistance) || 0) * friction;
    const radius = ball.radius;
    const slip = {
      x: ball.velocity.x - radius * ball.angularVelocity.y,
      y: ball.velocity.y + radius * ball.angularVelocity.x
    };
    const slipSpeed = M.length2(slip);
    if (slipSpeed > EPSILON) {
      // The linear and angular responses change contact-point slip by 1.9x the impulse.
      const impulse = Math.min(slipSpeed / 1.9, clothFriction * dt);
      const direction = M.scale2(slip, -1 / slipSpeed);
      ball.velocity = M.add2(ball.velocity, M.scale2(direction, impulse * 0.4));
      const angularScale = impulse * 1.5 / Math.max(radius, EPSILON);
      ball.angularVelocity.x += direction.y * angularScale;
      ball.angularVelocity.y -= direction.x * angularScale;
    } else {
      const speed = M.length2(ball.velocity);
      if (speed > EPSILON) {
        const resistance = Math.min(speed, rollingResistance * dt);
        const rollingFactor = (speed - resistance) / speed;
        ball.velocity = M.scale2(ball.velocity, rollingFactor);
        ball.angularVelocity.x *= rollingFactor;
        ball.angularVelocity.y *= rollingFactor;
      }
    }
    const spinFactor = Math.max(0, 1 - spinResistance * dt);
    ball.angularVelocity.z *= spinFactor;
  }

  function collisionBroadPhase(state, balls) {
    if (balls.length < 2) return [];
    const depth = state.deterministic.parameters.localCoverDepth;
    const maxRadius = balls.reduce((maximum, ball) => Math.max(maximum, ball.radius), 0);
    const cellSize = Math.max(EPSILON * 32, maxRadius * 2);
    const bucketsByTile = new Map();
    const candidates = new Map();

    balls.forEach((ball, ballIndex) => {
      const images = nearbyImages(ball, state.atlas, {
        padding: ball.radius,
        maxDepth: depth,
        onlyIntersecting: true,
        minimal: true
      });
      images.forEach((image) => {
        let cells = bucketsByTile.get(image.tileIndex);
        if (!cells) {
          cells = new Map();
          bucketsByTile.set(image.tileIndex, cells);
        }
        const minCellX = Math.floor((image.position.x - ball.radius) / cellSize);
        const maxCellX = Math.floor((image.position.x + ball.radius) / cellSize);
        const minCellY = Math.floor((image.position.y - ball.radius) / cellSize);
        const maxCellY = Math.floor((image.position.y + ball.radius) / cellSize);
        const entry = { ball, ballIndex, image };
        for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
          for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
            const cellKey = `${cellX}:${cellY}`;
            const occupants = cells.get(cellKey) || [];
            occupants.forEach((other) => {
              if (other.ballIndex === ballIndex) return;
              const leftEntry = other.ballIndex < ballIndex ? other : entry;
              const rightEntry = other.ballIndex < ballIndex ? entry : other;
              const pairKey = `${leftEntry.ballIndex}:${rightEntry.ballIndex}`;
              const delta = M.sub2(rightEntry.image.position, leftEntry.image.position);
              const distance = M.length2(delta);
              const previous = candidates.get(pairKey);
              if (previous && previous.distance <= distance) return;
              candidates.set(pairKey, {
                leftIndex: leftEntry.ballIndex,
                rightIndex: rightEntry.ballIndex,
                leftTileIndex: leftEntry.ball.tileIndex,
                rightTileIndex: rightEntry.ball.tileIndex,
                transform: M.composeAffine(leftEntry.image.inverseTransform, rightEntry.image.transform),
                distance
              });
            });
            occupants.push(entry);
            cells.set(cellKey, occupants);
          }
        }
      });
    });

    return Array.from(candidates.values()).sort((left, right) => (
      left.leftIndex - right.leftIndex || left.rightIndex - right.rightIndex
    ));
  }

  function closestCollisionImage(right, left, atlas, depth, preferredTransform) {
    let contact = null;
    const consider = (transform) => {
      const position = M.applyAffine(transform, right.position);
      const delta = M.sub2(position, left.position);
      const distance = M.length2(delta);
      const target = left.radius + right.radius;
      if (distance < target - EPSILON && (!contact || distance < contact.distance)) {
        contact = {
          position,
          transform,
          inverseTransform: M.inverseAffine(transform),
          delta,
          distance,
          target
        };
      }
    };
    if (preferredTransform) consider(preferredTransform);
    if (!contact) {
      const charts = chartTransformsFromTile(atlas, right.tileIndex, depth).byTile.get(left.tileIndex) || [];
      charts.forEach((chart) => consider(chart.transform));
    }
    return contact;
  }

  function resolveBallCollisions(state) {
    const balls = state.balls.filter((ball) => ball.active);
    const depth = state.deterministic.parameters.localCoverDepth;
    collisionBroadPhase(state, balls).forEach((candidate) => {
      const left = balls[candidate.leftIndex];
      const right = balls[candidate.rightIndex];
      if (!left.active || !right.active) return;
      const sameCharts = left.tileIndex === candidate.leftTileIndex && right.tileIndex === candidate.rightTileIndex;
      const contact = closestCollisionImage(right, left, state.atlas, depth, sameCharts ? candidate.transform : null);
      if (!contact) return;
      const normal = contact.distance > EPSILON ? M.scale2(contact.delta, 1 / contact.distance) : { x: 1, y: 0 };
      let rightVelocity = M.applyLinear(contact.transform, right.velocity);
      let rightAngularVelocity = M.applyLiftedLinear(contact.transform, right.angularVelocity);
      const relative = M.dot2(M.sub2(rightVelocity, left.velocity), normal);
      const inverseMass = (1 / left.mass) + (1 / right.mass);
      let normalImpulse = 0;
      if (relative < 0) {
        normalImpulse = -((1 + state.deterministic.parameters.restitution) * relative) / inverseMass;
        left.velocity = M.sub2(left.velocity, M.scale2(normal, normalImpulse / left.mass));
        rightVelocity = M.add2(rightVelocity, M.scale2(normal, normalImpulse / right.mass));
      }
      const ballBallFriction = Math.max(0, Number(state.deterministic.parameters.ballBallFriction) || 0);
      if (normalImpulse > EPSILON && ballBallFriction > 0) {
        const tangent = { x: -normal.y, y: normal.x };
        const leftContactTangent = M.dot2(left.velocity, tangent) + left.angularVelocity.z * left.radius;
        const rightContactTangent = M.dot2(rightVelocity, tangent) - rightAngularVelocity.z * right.radius;
        const relativeTangent = rightContactTangent - leftContactTangent;
        const leftInertia = (2 / 5) * left.mass * left.radius * left.radius;
        const rightInertia = (2 / 5) * right.mass * right.radius * right.radius;
        const inverseEffectiveMass = inverseMass
          + (left.radius * left.radius / Math.max(leftInertia, EPSILON))
          + (right.radius * right.radius / Math.max(rightInertia, EPSILON));
        const requestedImpulse = -relativeTangent / Math.max(inverseEffectiveMass, EPSILON);
        const maximumImpulse = ballBallFriction * normalImpulse;
        const tangentImpulse = clamp(requestedImpulse, -maximumImpulse, maximumImpulse);
        left.velocity = M.sub2(left.velocity, M.scale2(tangent, tangentImpulse / left.mass));
        rightVelocity = M.add2(rightVelocity, M.scale2(tangent, tangentImpulse / right.mass));
        left.angularVelocity.z -= left.radius * tangentImpulse / Math.max(leftInertia, EPSILON);
        rightAngularVelocity.z -= right.radius * tangentImpulse / Math.max(rightInertia, EPSILON);
      }
      right.velocity = M.applyLinear(contact.inverseTransform, rightVelocity);
      right.angularVelocity = M.applyLiftedLinear(contact.inverseTransform, rightAngularVelocity);
      const correction = Math.max(0, contact.target - contact.distance) / inverseMass * 0.52;
      left.position = M.sub2(left.position, M.scale2(normal, correction / left.mass));
      const correctedRightImage = M.add2(contact.position, M.scale2(normal, correction / right.mass));
      right.position = M.applyAffine(contact.inverseTransform, correctedRightImage);
      canonicalizeBall(left, state.atlas);
      canonicalizeBall(right, state.atlas);
    });
  }

  function capturePockets(state, shotResult) {
    if (!state.pockets.length) return;
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      const pocket = state.pockets.find((entry) => {
        const vertexClass = state.atlas.vertexClasses[entry.classIndex];
        return vertexClass && vertexClass.incidences.some((incidence) => (
          incidence.tileIndex === ball.tileIndex
          && M.length2(M.sub2(ball.position, incidence.point)) <= pocketCaptureRadius(ball, entry)
        ));
      });
      if (!pocket) return;
      ball.active = false;
      ball.velocity = { x: 0, y: 0 };
      ball.angularVelocity = { x: 0, y: 0, z: 0 };
      if (ball.kind === 'cue') shotResult.scratch = true;
      else shotResult.pocketedTargets.push(ball.id);
    });
  }

  function pocketCaptureRadius(ball, pocket) {
    return Math.max(pocket.radius - ball.radius * 0.2, ball.radius * 0.5);
  }

  function ballsAtRest(state) {
    const parameters = state.deterministic.parameters;
    return state.balls.filter((ball) => ball.active).every((ball) => (
      M.length2(ball.velocity) <= parameters.stopSpeed
      && Math.abs(Number(ball.velocity.z) || 0) <= parameters.stopSpeed
      && Math.max(0, Number(ball.height) || 0) <= EPSILON
      && Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z) <= parameters.stopSpin
    ));
  }

  function usesEventSolver(state) {
    return normalizePhysicsProfile(state && state.deterministic && state.deterministic.physicsProfile) !== 'legacy';
  }

  function localMetersPerUnit(state) {
    const equipment = equipmentProfile(state && state.deterministic && state.deterministic.equipmentProfileId);
    const inferred = equipment.ballDiameterM / Math.max(EPSILON, 2 * Number(state && state.ballRadius || 0.22));
    return normalizeTileEdgeLengthM(state && state.deterministic && state.deterministic.tileEdgeLengthM, inferred);
  }

  function totalKineticEnergy(state) {
    const metersPerUnit = localMetersPerUnit(state);
    const equipment = equipmentProfile(state && state.deterministic && state.deterministic.equipmentProfileId);
    const radiusM = equipment.ballDiameterM / 2;
    return state.balls.filter((ball) => ball.active).reduce((sum, ball) => {
      const mass = Math.max(0.01, Number(ball.physicalMassKg) || equipment.ballMassKg);
      const vx = (Number(ball.velocity.x) || 0) * metersPerUnit;
      const vy = (Number(ball.velocity.y) || 0) * metersPerUnit;
      const vz = (Number(ball.velocity.z) || 0) * metersPerUnit;
      const inertia = (2 / 5) * mass * radiusM * radiusM;
      const omega2 = (ball.angularVelocity.x ** 2) + (ball.angularVelocity.y ** 2) + (ball.angularVelocity.z ** 2);
      return sum + 0.5 * mass * (vx * vx + vy * vy + vz * vz) + 0.5 * inertia * omega2;
    }, 0);
  }

  function createPhysicsTelemetry(state) {
    return {
      solver: normalizePhysicsProfile(state.deterministic.physicsProfile) === 'research' ? 'research-event' : 'realistic-event',
      phase: 'simulating',
      events: 0,
      eventCounts: {},
      orderedEvents: [],
      iterations: 0,
      simulatedTime: 0,
      initialEnergyJ: totalKineticEnergy(state),
      finalEnergyJ: 0,
      energyDriftJ: 0,
      warnings: [],
      contacts: []
    };
  }

  function recordPhysicsEvent(telemetry, type, details = {}) {
    if (!telemetry) return;
    telemetry.events += 1;
    telemetry.eventCounts[type] = (telemetry.eventCounts[type] || 0) + 1;
    const event = {
      sequence: telemetry.events,
      time: Number(telemetry.currentEventTime) || 0,
      type,
      ...clonePlain(details)
    };
    if (telemetry.orderedEvents.length < 2048) telemetry.orderedEvents.push(event);
    if (telemetry.contacts.length < 256) telemetry.contacts.push(event);
  }

  function warnPhysics(telemetry, warning) {
    if (!telemetry || telemetry.warnings.includes(warning)) return;
    telemetry.warnings.push(warning);
  }

  function collisionTime3(relativePosition, relativeVelocity, radius, maximumTime, epsilon) {
    const a = relativeVelocity.x ** 2 + relativeVelocity.y ** 2 + relativeVelocity.z ** 2;
    const b = 2 * (
      relativePosition.x * relativeVelocity.x
      + relativePosition.y * relativeVelocity.y
      + relativePosition.z * relativeVelocity.z
    );
    const c = relativePosition.x ** 2 + relativePosition.y ** 2 + relativePosition.z ** 2 - radius ** 2;
    if (c <= epsilon) return b < -epsilon ? 0 : null;
    if (a <= epsilon || b >= 0) return null;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < -epsilon) return null;
    const time = (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
    return time >= -epsilon && time <= maximumTime + epsilon ? Math.max(0, time) : null;
  }

  function eventOrder(left, right, epsilon) {
    if (Math.abs(left.time - right.time) > epsilon) return left.time - right.time;
    const priority = { pocket: 0, 'ball-ball': 1, landing: 2, wall: 3, seam: 4 };
    return (priority[left.type] ?? 9) - (priority[right.type] ?? 9)
      || String(left.key || '').localeCompare(String(right.key || ''));
  }

  function earliestBallBallEvent(state, maximumTime) {
    const balls = state.balls.filter((ball) => ball.active);
    const depth = state.deterministic.parameters.localCoverDepth;
    const epsilon = state.deterministic.parameters.eventTimeEpsilon;
    let earliest = null;
    for (let leftIndex = 0; leftIndex < balls.length; leftIndex += 1) {
      const left = balls[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < balls.length; rightIndex += 1) {
        const right = balls[rightIndex];
        const charts = chartTransformsFromTile(state.atlas, right.tileIndex, depth).byTile.get(left.tileIndex) || [];
        charts.forEach((chart) => {
          const rightPosition = M.applyAffine(chart.transform, right.position);
          const rightVelocity = M.applyLinear(chart.transform, right.velocity);
          const time = collisionTime3({
            x: rightPosition.x - left.position.x,
            y: rightPosition.y - left.position.y,
            z: (Number(right.height) || 0) - (Number(left.height) || 0)
          }, {
            x: rightVelocity.x - left.velocity.x,
            y: rightVelocity.y - left.velocity.y,
            z: (Number(right.velocity.z) || 0) - (Number(left.velocity.z) || 0)
          }, left.radius + right.radius, maximumTime, epsilon);
          if (time == null) return;
          const candidate = {
            type: 'ball-ball',
            time,
            key: `${left.id}:${right.id}:${chart.path}`,
            left,
            right,
            transform: chart.transform,
            inverseTransform: chart.inverseTransform
          };
          if (!earliest || eventOrder(candidate, earliest, epsilon) < 0) earliest = candidate;
        });
      }
    }
    return earliest;
  }

  function earliestBoundaryEvent(state, maximumTime) {
    const epsilon = state.deterministic.parameters.eventTimeEpsilon;
    let earliest = null;
    state.balls.filter((ball) => ball.active).forEach((ball) => {
      const tile = state.atlas.tiles[ball.tileIndex];
      tile.frames.forEach((frame, dir) => {
        const transition = tile.transitions[dir];
        const threshold = transition ? 0 : ball.radius;
        const distance = pointEdgeDistance(ball.position, frame);
        const normalSpeed = M.dot2(ball.velocity, frame.inward);
        if (normalSpeed >= -epsilon || distance < threshold - epsilon) return;
        const time = (threshold - distance) / normalSpeed;
        if (time < -epsilon || time > maximumTime + epsilon) return;
        const candidate = {
          type: transition ? 'seam' : 'wall',
          time: Math.max(0, time),
          key: `${ball.id}:${dir}`,
          ball,
          frame,
          dir,
          transition
        };
        if (!earliest || eventOrder(candidate, earliest, epsilon) < 0) earliest = candidate;
      });
    });
    return earliest;
  }

  function earliestPocketEvent(state, maximumTime) {
    if (!state.pockets.length) return null;
    const epsilon = state.deterministic.parameters.eventTimeEpsilon;
    let earliest = null;
    state.balls.filter((ball) => ball.active && (Number(ball.height) || 0) <= ball.radius * 0.12).forEach((ball) => {
      state.pockets.forEach((pocket) => {
        const vertexClass = state.atlas.vertexClasses[pocket.classIndex];
        if (!vertexClass) return;
        vertexClass.incidences.filter((entry) => entry.tileIndex === ball.tileIndex).forEach((incidence) => {
          const relative = M.sub2(ball.position, incidence.point);
          const time = collisionTime3(
            { x: relative.x, y: relative.y, z: 0 },
            { x: ball.velocity.x, y: ball.velocity.y, z: 0 },
            pocketCaptureRadius(ball, pocket),
            maximumTime,
            epsilon
          );
          if (time == null) return;
          const candidate = {
            type: 'pocket',
            time,
            key: `${pocket.id}:${ball.id}:${incidence.tileIndex}:${incidence.corner}`,
            ball,
            pocket,
            incidence,
            vertexClass
          };
          if (!earliest || eventOrder(candidate, earliest, epsilon) < 0) earliest = candidate;
        });
      });
    });
    return earliest;
  }

  function earliestLandingEvent(state, maximumTime) {
    const equipment = equipmentProfile(state.deterministic.equipmentProfileId);
    const gravity = equipment.gravityMps2 / localMetersPerUnit(state);
    const epsilon = state.deterministic.parameters.eventTimeEpsilon;
    let earliest = null;
    state.balls.filter((ball) => ball.active).forEach((ball) => {
      const height = Math.max(0, Number(ball.height) || 0);
      const verticalSpeed = Number(ball.velocity.z) || 0;
      if (height <= epsilon && verticalSpeed <= epsilon) return;
      const discriminant = verticalSpeed * verticalSpeed + 2 * gravity * height;
      const time = (verticalSpeed + Math.sqrt(Math.max(0, discriminant))) / gravity;
      if (time <= epsilon || time > maximumTime + epsilon) return;
      const candidate = { type: 'landing', time, key: String(ball.id), ball };
      if (!earliest || eventOrder(candidate, earliest, epsilon) < 0) earliest = candidate;
    });
    return earliest;
  }

  function earliestPhysicsEvent(state, maximumTime) {
    const epsilon = state.deterministic.parameters.eventTimeEpsilon;
    return [
      earliestPocketEvent(state, maximumTime),
      earliestBallBallEvent(state, maximumTime),
      earliestBoundaryEvent(state, maximumTime),
      earliestLandingEvent(state, maximumTime)
    ].filter(Boolean).sort((left, right) => eventOrder(left, right, epsilon))[0] || null;
  }

  function advancePhysicalBalls(state, dt) {
    if (dt <= 0) return;
    const equipment = equipmentProfile(state.deterministic.equipmentProfileId);
    const gravity = equipment.gravityMps2 / localMetersPerUnit(state);
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      ball.position = M.add2(ball.position, M.scale2(ball.velocity, dt));
      ball.orientation = M.integrateQuaternion(ball.orientation, ball.angularVelocity, dt);
      const height = Math.max(0, Number(ball.height) || 0);
      const verticalSpeed = Number(ball.velocity.z) || 0;
      if (height > 0 || verticalSpeed > 0) {
        ball.height = Math.max(0, height + verticalSpeed * dt - 0.5 * gravity * dt * dt);
        ball.velocity.z = verticalSpeed - gravity * dt;
        ball.motionState = 'airborne';
      } else {
        ball.height = 0;
        ball.velocity.z = 0;
      }
    });
  }

  function resolveEventBallCollision(state, event, telemetry) {
    const left = event.left;
    const right = event.right;
    const rightPosition = M.applyAffine(event.transform, right.position);
    let rightVelocity = M.applyLinear(event.transform, right.velocity);
    let rightAngularVelocity = M.applyLiftedLinear(event.transform, right.angularVelocity);
    const delta3 = {
      x: rightPosition.x - left.position.x,
      y: rightPosition.y - left.position.y,
      z: (Number(right.height) || 0) - (Number(left.height) || 0)
    };
    const distance = Math.hypot(delta3.x, delta3.y, delta3.z) || 1;
    const normal3 = { x: delta3.x / distance, y: delta3.y / distance, z: delta3.z / distance };
    const relative3 = {
      x: rightVelocity.x - left.velocity.x,
      y: rightVelocity.y - left.velocity.y,
      z: (Number(right.velocity.z) || 0) - (Number(left.velocity.z) || 0)
    };
    const relativeNormal = relative3.x * normal3.x + relative3.y * normal3.y + relative3.z * normal3.z;
    if (relativeNormal >= 0) return;
    const inverseMass = (1 / left.mass) + (1 / right.mass);
    const normalImpulse = -((1 + state.deterministic.parameters.restitution) * relativeNormal) / inverseMass;
    left.velocity.x -= normal3.x * normalImpulse / left.mass;
    left.velocity.y -= normal3.y * normalImpulse / left.mass;
    left.velocity.z = (Number(left.velocity.z) || 0) - normal3.z * normalImpulse / left.mass;
    rightVelocity.x += normal3.x * normalImpulse / right.mass;
    rightVelocity.y += normal3.y * normalImpulse / right.mass;
    right.velocity.z = (Number(right.velocity.z) || 0) + normal3.z * normalImpulse / right.mass;
    const tangentRaw = {
      x: relative3.x - relativeNormal * normal3.x,
      y: relative3.y - relativeNormal * normal3.y
    };
    const tangentSpeed = M.length2(tangentRaw);
    let tangentImpulse = 0;
    if (tangentSpeed > EPSILON) {
      const tangent = M.scale2(tangentRaw, 1 / tangentSpeed);
      const spinSlip = tangentSpeed
        - left.angularVelocity.z * left.radius
        - rightAngularVelocity.z * right.radius;
      const leftInertia = (2 / 5) * left.mass * left.radius * left.radius;
      const rightInertia = (2 / 5) * right.mass * right.radius * right.radius;
      const inverseEffectiveMass = inverseMass
        + left.radius * left.radius / leftInertia
        + right.radius * right.radius / rightInertia;
      const requested = -spinSlip / inverseEffectiveMass;
      const maximum = Math.max(0, state.deterministic.parameters.ballBallFriction) * normalImpulse;
      tangentImpulse = clamp(requested, -maximum, maximum);
      left.velocity = { ...left.velocity, ...M.sub2(left.velocity, M.scale2(tangent, tangentImpulse / left.mass)) };
      rightVelocity = M.add2(rightVelocity, M.scale2(tangent, tangentImpulse / right.mass));
      left.angularVelocity.z -= left.radius * tangentImpulse / leftInertia;
      rightAngularVelocity.z -= right.radius * tangentImpulse / rightInertia;
    }
    right.velocity = { ...right.velocity, ...M.applyLinear(event.inverseTransform, rightVelocity) };
    right.angularVelocity = M.applyLiftedLinear(event.inverseTransform, rightAngularVelocity);
    const separation = state.deterministic.parameters.eventTimeEpsilon * 8;
    left.position = M.sub2(left.position, { x: normal3.x * separation, y: normal3.y * separation });
    right.position = M.applyAffine(event.inverseTransform, {
      x: rightPosition.x + normal3.x * separation,
      y: rightPosition.y + normal3.y * separation
    });
    recordPhysicsEvent(telemetry, 'ball-ball', {
      leftId: left.id,
      rightId: right.id,
      normalImpulse,
      tangentImpulse
    });
  }

  function resolveEventWall(state, event, telemetry) {
    const ball = event.ball;
    const frame = event.frame;
    const normalSpeed = M.dot2(ball.velocity, frame.inward);
    if (normalSpeed >= 0) return;
    const restitution = Math.max(0, Number(state.deterministic.parameters.wallRestitution) || 0);
    const normalImpulse = -(1 + restitution) * normalSpeed * ball.mass;
    ball.velocity = { ...ball.velocity, ...M.sub2(ball.velocity, M.scale2(frame.inward, (1 + restitution) * normalSpeed)) };
    const tangent = { x: -frame.inward.y, y: frame.inward.x };
    const contactSpeed = M.dot2(ball.velocity, tangent) - ball.radius * ball.angularVelocity.z;
    const inertia = (2 / 5) * ball.mass * ball.radius * ball.radius;
    const requested = -contactSpeed / ((1 / ball.mass) + ball.radius * ball.radius / inertia);
    const maximum = Math.max(0, state.deterministic.parameters.cushionFriction) * normalImpulse;
    const tangentImpulse = clamp(requested, -maximum, maximum);
    ball.velocity = { ...ball.velocity, ...M.add2(ball.velocity, M.scale2(tangent, tangentImpulse / ball.mass)) };
    ball.angularVelocity.z -= ball.radius * tangentImpulse / inertia;
    ball.position = M.add2(ball.position, M.scale2(frame.inward, state.deterministic.parameters.eventTimeEpsilon * 8));
    recordPhysicsEvent(telemetry, 'wall', { ballId: ball.id, normalImpulse, tangentImpulse });
  }

  function resolveEventSeam(event, telemetry) {
    const ball = event.ball;
    const transition = event.transition;
    ball.position = M.applyAffine(transition.transform, ball.position);
    const verticalSpeed = Number(ball.velocity.z) || 0;
    ball.velocity = { ...M.applyLinear(transition.transform, ball.velocity), z: verticalSpeed };
    ball.angularVelocity = M.applyLiftedLinear(transition.transform, ball.angularVelocity);
    ball.orientation = M.transportOrientation(ball.orientation, transition.transform);
    ball.tileIndex = transition.tileIndex;
    ball.crossings = (ball.crossings || 0) + 1;
    ball.position = M.add2(ball.position, M.scale2(ball.velocity, 1e-8));
    recordPhysicsEvent(telemetry, 'seam', { ballId: ball.id, fromDirection: event.dir, tileIndex: ball.tileIndex });
  }

  function resolveEventPocket(state, event, shotResult, telemetry) {
    const ball = event.ball;
    const radial = M.sub2(ball.position, event.incidence.point);
    const radialDirection = M.normalize2(radial, { x: 1, y: 0 });
    const speedLocal = M.length2(ball.velocity);
    const speedMps = speedLocal * localMetersPerUnit(state);
    const alignment = speedLocal > EPSILON ? -M.dot2(M.scale2(ball.velocity, 1 / speedLocal), radialDirection) : 1;
    const physical = Math.abs(event.vertexClass.coneAngle - Math.PI / 2) < 0.25
      || Math.abs(event.vertexClass.coneAngle - Math.PI) < 0.25;
    const accepted = !physical
      || speedMps <= state.deterministic.parameters.pocketAcceptanceSpeed
      || alignment >= 0.72;
    if (accepted) {
      ball.active = false;
      ball.motionState = 'pocketed';
      ball.pocketedAt = event.pocket.id;
      ball.height = 0;
      ball.velocity = { x: 0, y: 0, z: 0 };
      ball.angularVelocity = { x: 0, y: 0, z: 0 };
      if (ball.kind === 'cue') shotResult.scratch = true;
      else if (!shotResult.pocketedTargets.includes(ball.id)) shotResult.pocketedTargets.push(ball.id);
      recordPhysicsEvent(telemetry, 'pocket', { ballId: ball.id, pocketId: event.pocket.id, accepted: true, speedMps });
      return;
    }
    const towardPocket = M.dot2(ball.velocity, radialDirection);
    if (towardPocket < 0) {
      ball.velocity = { ...ball.velocity, ...M.sub2(ball.velocity, M.scale2(radialDirection, 1.45 * towardPocket)) };
    }
    ball.position = M.add2(ball.position, M.scale2(radialDirection, state.deterministic.parameters.eventTimeEpsilon * 16));
    recordPhysicsEvent(telemetry, 'pocket-reject', { ballId: ball.id, pocketId: event.pocket.id, accepted: false, speedMps });
  }

  function resolveEventLanding(state, event, telemetry) {
    const ball = event.ball;
    const impactSpeed = Math.abs(Number(ball.velocity.z) || 0);
    ball.height = 0;
    ball.velocity.z = 0;
    ball.motionState = M.length2(ball.velocity) > state.deterministic.parameters.stopSpeed ? 'sliding' : 'spinning';
    recordPhysicsEvent(telemetry, 'landing', { ballId: ball.id, impactSpeed });
  }

  function applyAdvancedCloth(state, ball, dt) {
    if (!ball.active || (Number(ball.height) || 0) > EPSILON) return;
    const parameters = state.deterministic.parameters;
    const equipment = equipmentProfile(state.deterministic.equipmentProfileId);
    const scale = localMetersPerUnit(state);
    const frictionScale = normalizeFriction(parameters.friction);
    const radius = ball.radius;
    const slip = {
      x: ball.velocity.x - radius * ball.angularVelocity.y,
      y: ball.velocity.y + radius * ball.angularVelocity.x
    };
    const slipSpeed = M.length2(slip);
    const slidingAcceleration = equipment.clothKineticFriction * equipment.gravityMps2 * frictionScale / scale;
    if (slipSpeed > Math.max(parameters.stopSpeed, 1e-5)) {
      const slipReduction = Math.min(slipSpeed, 3.5 * slidingAcceleration * dt);
      const direction = M.scale2(slip, -1 / slipSpeed);
      ball.velocity = { ...ball.velocity, ...M.add2(ball.velocity, M.scale2(direction, slipReduction * (2 / 7))) };
      ball.angularVelocity.x += direction.y * slipReduction * (5 / 7) / radius;
      ball.angularVelocity.y -= direction.x * slipReduction * (5 / 7) / radius;
      ball.motionState = 'sliding';
    } else {
      const speed = M.length2(ball.velocity);
      const decrement = equipment.clothRollingResistance * equipment.gravityMps2 * frictionScale * dt / scale;
      if (speed > parameters.stopSpeed) {
        const nextSpeed = Math.max(0, speed - decrement);
        ball.velocity = { ...ball.velocity, ...M.scale2(ball.velocity, nextSpeed / speed) };
        ball.angularVelocity.x = -ball.velocity.y / radius;
        ball.angularVelocity.y = ball.velocity.x / radius;
        ball.motionState = nextSpeed > parameters.stopSpeed ? 'rolling' : 'spinning';
      }
    }
    const speed = M.length2(ball.velocity);
    if (speed > parameters.stopSpeed && Math.abs(ball.angularVelocity.z) > parameters.stopSpin) {
      const turn = parameters.swerveCoefficient * ball.angularVelocity.z * dt;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      ball.velocity = { ...ball.velocity, x: ball.velocity.x * cos - ball.velocity.y * sin, y: ball.velocity.x * sin + ball.velocity.y * cos };
    }
    ball.angularVelocity.z *= Math.max(0, 1 - Math.max(0, parameters.spinResistance) * frictionScale * dt);
    if (M.length2(ball.velocity) <= parameters.stopSpeed) ball.velocity = { ...ball.velocity, x: 0, y: 0 };
    if (M.length2(ball.velocity) <= parameters.stopSpeed && Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z) <= parameters.stopSpin) {
      ball.angularVelocity = { x: 0, y: 0, z: 0 };
      ball.motionState = 'sleeping';
    }
  }

  function stepEventDriven(state, dt, shotResult, telemetry) {
    let remaining = dt;
    let elapsed = 0;
    let iterations = 0;
    const parameters = state.deterministic.parameters;
    const epsilon = Math.max(1e-10, Number(parameters.eventTimeEpsilon) || 1e-7);
    const cap = Math.max(4, Math.floor(Number(parameters.collisionIterations) || 16));
    while (remaining > epsilon && iterations < cap) {
      const event = earliestPhysicsEvent(state, remaining);
      if (!event) {
        advancePhysicalBalls(state, remaining);
        elapsed += remaining;
        remaining = 0;
        break;
      }
      if (event.time > epsilon) {
        advancePhysicalBalls(state, event.time);
        elapsed += event.time;
      }
      if (telemetry) telemetry.currentEventTime = telemetry.simulatedTime + elapsed;
      if (event.type === 'ball-ball') resolveEventBallCollision(state, event, telemetry);
      else if (event.type === 'wall') resolveEventWall(state, event, telemetry);
      else if (event.type === 'seam') resolveEventSeam(event, telemetry);
      else if (event.type === 'pocket') resolveEventPocket(state, event, shotResult, telemetry);
      else if (event.type === 'landing') resolveEventLanding(state, event, telemetry);
      const consumed = Math.max(event.time, epsilon);
      remaining = Math.max(0, remaining - consumed);
      if (event.time <= epsilon) elapsed += consumed;
      iterations += 1;
    }
    if (remaining > epsilon) {
      advancePhysicalBalls(state, remaining);
      warnPhysics(telemetry, 'event iteration cap reached');
    }
    state.balls.forEach((ball) => applyAdvancedCloth(state, ball, dt));
    if (telemetry) {
      delete telemetry.currentEventTime;
      telemetry.iterations += iterations;
      telemetry.simulatedTime += dt;
    }
  }

  function step(state, dt, shotResult) {
    if (usesEventSolver(state)) {
      stepEventDriven(state, dt, shotResult, state.deterministic.telemetry);
      return;
    }
    const parameters = state.deterministic.parameters;
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      ball.orientation = M.integrateQuaternion(ball.orientation, ball.angularVelocity, dt);
      ball.position = M.add2(ball.position, M.scale2(ball.velocity, dt));
      if (!canonicalizeBall(ball, state.atlas)) resolveWalls(ball, state.atlas, parameters);
      resolveWalls(ball, state.atlas, parameters);
    });
    resolveBallCollisions(state);
    capturePockets(state, shotResult);
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      applyFriction(ball, dt, parameters);
      const stoppedLinear = M.length2(ball.velocity) <= parameters.stopSpeed;
      if (stoppedLinear) ball.velocity = { x: 0, y: 0 };
      if (stoppedLinear && Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z) <= parameters.stopSpin) {
        ball.angularVelocity = { x: 0, y: 0, z: 0 };
      }
    });
  }

  function shotPayload(aim, power, contact, shooter, options = {}, source = null) {
    const equipment = equipmentProfile(source && source.deterministic && source.deterministic.equipmentProfileId);
    const normalizedPower = clamp(Number(power) || 0, 0, 1);
    const tipOffset = options.tipOffset && typeof options.tipOffset === 'object' ? options.tipOffset : contact;
    const elevationRad = clamp(Number(options.elevationRad) || 0, 0, Math.PI * 75 / 180);
    return {
      action: 'billiards-shot',
      type: 'billiards-shot',
      shooter,
      aim: M.normalize2(normalizeVector2(aim)),
      power: normalizedPower,
      legacyPower: normalizedPower,
      cueSpeedMps: clamp(
        Number.isFinite(Number(options.cueSpeedMps)) ? Number(options.cueSpeedMps) : normalizedPower * equipment.cueSpeedMaxMps,
        0,
        equipment.cueSpeedMaxMps
      ),
      elevationRad,
      cueProfileId: cueProfile(options.cueProfileId).id,
      tipProfileId: tipProfile(options.tipProfileId).id,
      strokePresetId: String(options.strokePresetId || 'custom'),
      contact: {
        x: clamp(Number(tipOffset && tipOffset.x) || 0, -0.86, 0.86),
        y: clamp(Number(tipOffset && tipOffset.y) || 0, -0.86, 0.86)
      },
      tipOffset: {
        x: clamp(Number(tipOffset && tipOffset.x) || 0, -0.86, 0.86),
        y: clamp(Number(tipOffset && tipOffset.y) || 0, -0.86, 0.86)
      },
      physicsProfile: source && source.deterministic && source.deterministic.physicsProfile || DEFAULT_PHYSICS_PROFILE,
      physicsVersion: source && source.deterministic && source.deterministic.physicsVersion || PHYSICS_VERSION.legacy,
      equipmentProfileId: source && source.deterministic && source.deterministic.equipmentProfileId || DEFAULT_EQUIPMENT_PROFILE,
      equipmentVersion: source && source.deterministic && source.deterministic.equipmentVersion || equipment.version,
      solverTolerancesVersion: source && source.deterministic && source.deterministic.solverTolerancesVersion || 'legacy-fixed-step-v1',
      cueInputVersion: CUE_INPUT_VERSION
    };
  }

  function applyCueImpulse(state, shot) {
    const cue = state.balls.find((ball) => ball.active && ball.kind === 'cue');
    if (!cue) return false;
    if (usesEventSolver(state)) return applyPhysicalCueImpulse(state, cue, shot);
    const speed = state.deterministic.parameters.shotSpeed * shot.power;
    if (speed <= state.deterministic.parameters.stopSpeed * 4) return false;
    cue.velocity = M.scale2(shot.aim, speed);
    const radius = cue.radius;
    const horizontal = shot.contact.x * radius;
    const vertical = -shot.contact.y * radius;
    const reach = Math.sqrt(Math.max(0, radius * radius - horizontal * horizontal - vertical * vertical));
    const left = { x: -shot.aim.y, y: shot.aim.x, z: 0 };
    const contactVector = {
      x: -reach * shot.aim.x + horizontal * left.x,
      y: -reach * shot.aim.y + horizontal * left.y,
      z: vertical
    };
    const impulse = { x: cue.velocity.x * cue.mass, y: cue.velocity.y * cue.mass, z: 0 };
    const torque = M.cross3(contactVector, impulse);
    const inertia = (2 / 5) * cue.mass * radius * radius;
    cue.angularVelocity.x += torque.x / inertia;
    cue.angularVelocity.y += torque.y / inertia;
    cue.angularVelocity.z += torque.z / inertia;
    return true;
  }

  function applyPhysicalCueImpulse(state, cue, shot) {
    const equipment = equipmentProfile(state.deterministic.equipmentProfileId);
    const selectedCue = cueProfile(shot.cueProfileId);
    const selectedTip = tipProfile(shot.tipProfileId);
    const speedMps = clamp(Number(shot.cueSpeedMps) || 0, 0, equipment.cueSpeedMaxMps);
    if (speedMps <= 0.03) return false;
    const offset = normalizeVector2(shot.tipOffset || shot.contact);
    const offsetRadius = Math.hypot(offset.x, offset.y);
    const usableOffset = Math.min(selectedTip.maxOffset, offsetRadius);
    const offsetScale = offsetRadius > EPSILON ? usableOffset / offsetRadius : 0;
    const usable = { x: offset.x * offsetScale, y: offset.y * offsetScale };
    const miscue = offsetRadius > selectedTip.maxOffset + 1e-9;
    const elevation = clamp(Number(shot.elevationRad) || 0, 0, Math.PI * 75 / 180);
    const squirt = selectedCue.squirtCoefficient * usable.x * (0.55 + speedMps / equipment.cueSpeedMaxMps);
    const cosSquirt = Math.cos(squirt);
    const sinSquirt = Math.sin(squirt);
    const aim = {
      x: shot.aim.x * cosSquirt - shot.aim.y * sinSquirt,
      y: shot.aim.x * sinSquirt + shot.aim.y * cosSquirt
    };
    const mass = Math.max(0.01, Number(cue.physicalMassKg) || equipment.ballMassKg);
    const normalImpulse = (1 + selectedCue.restitution) * speedMps
      / ((1 / mass) + (1 / selectedCue.effectiveMassKg));
    const contactDemand = usableOffset;
    const frictionLimit = selectedTip.friction * normalImpulse;
    const tangentImpulse = Math.min(frictionLimit, normalImpulse * contactDemand * 0.72);
    const deliveredScale = miscue ? 0.58 : 1;
    const horizontalSpeedMps = normalImpulse * deliveredScale * Math.cos(elevation) / mass;
    const scale = localMetersPerUnit(state);
    cue.velocity = {
      x: aim.x * horizontalSpeedMps / scale,
      y: aim.y * horizontalSpeedMps / scale,
      z: Math.max(0, normalImpulse * deliveredScale * Math.sin(elevation) * 0.24 / mass / scale)
    };
    cue.height = 0;
    const radiusM = equipment.ballDiameterM / 2;
    const inertia = (2 / 5) * mass * radiusM * radiusM;
    const lateral = { x: -aim.y, y: aim.x };
    const horizontalOffsetM = usable.x * radiusM;
    const verticalOffsetM = -usable.y * radiusM;
    const tangentDirection = tangentImpulse * (offsetRadius > EPSILON ? 1 / offsetRadius : 0);
    const impulse3 = {
      x: aim.x * normalImpulse * deliveredScale + lateral.x * usable.x * tangentDirection,
      y: aim.y * normalImpulse * deliveredScale + lateral.y * usable.x * tangentDirection,
      z: -normalImpulse * Math.sin(elevation)
    };
    const reachM = Math.sqrt(Math.max(0, radiusM * radiusM - horizontalOffsetM ** 2 - verticalOffsetM ** 2));
    const contactVector = {
      x: -reachM * aim.x + horizontalOffsetM * lateral.x,
      y: -reachM * aim.y + horizontalOffsetM * lateral.y,
      z: verticalOffsetM
    };
    const torque = M.cross3(contactVector, impulse3);
    cue.angularVelocity.x += torque.x / inertia;
    cue.angularVelocity.y += torque.y / inertia;
    cue.angularVelocity.z += torque.z / inertia;
    cue.motionState = cue.velocity.z > state.deterministic.parameters.stopSpeed ? 'airborne' : 'sliding';
    shot.aim = aim;
    shot.miscue = miscue;
    shot.miscueMargin = selectedTip.maxOffset - offsetRadius;
    shot.impact = {
      impulseNs: normalImpulse * deliveredScale,
      tangentImpulseNs: tangentImpulse,
      squirtRad: squirt,
      deliveredSpeedMps: horizontalSpeedMps,
      verticalSpeedMps: cue.velocity.z * scale
    };
    return true;
  }

  function appendRecordMove(state, move) {
    const sequence = (state.recordMoves || []).length + 1;
    state.recordMoves = (state.recordMoves || []).concat({ sequence, ...clonePlain(move) });
  }

  function finishShot(state, shot, shotResult) {
    const shooter = shot.shooter;
    const opponent = shooter === 'player-2' ? 'player-1' : 'player-2';
    const scored = shotResult.pocketedTargets.length;
    state.shots += 1;
    state.round = state.shots;
    if (state.rules === 'competitive') {
      state.scores[shooter] = (state.scores[shooter] || 0) + scored;
      state.score = state.scores[shooter];
      state.turn = shotResult.scratch || scored === 0 ? opponent : shooter;
    } else {
      state.score += scored;
      state.scores['player-1'] = state.score;
      state.turn = 'player-1';
    }
    if (shotResult.scratch) {
      state.ballInHand = true;
      state.ballInHandPlayer = state.turn;
      state.phase = 'ball-in-hand';
    } else {
      state.phase = 'ready';
    }
    const activeTargets = state.balls.filter((ball) => ball.active && ball.kind === 'target').length;
    if (state.targetTotal > 0 && state.pockets.length > 0 && activeTargets === 0) {
      state.phase = 'gameover';
      if (state.rules === 'competitive') {
        const first = state.scores['player-1'] || 0;
        const second = state.scores['player-2'] || 0;
        state.winner = first === second ? 'draw' : (first > second ? 'player-1' : 'player-2');
      } else {
        state.winner = 'player-1';
      }
    }
    state.lastShot = {
      ...clonePlain(shot),
      pocketedTargets: shotResult.pocketedTargets.slice(),
      scratch: shotResult.scratch,
      resultingTurn: state.turn
    };
    appendRecordMove(state, state.lastShot);
  }

  function createShotSimulation(source, aim, power, contact, options = {}) {
    if (!source || source.phase !== 'ready') {
      const result = { changed: false, state: source, message: 'wait until the table is ready', simulationSteps: 0 };
      return { done: true, result, stepIndex: 0, maxSteps: 0 };
    }
    const shooter = options.shooter || source.turn || 'player-1';
    if (source.rules === 'competitive' && shooter !== source.turn) {
      const result = { changed: false, state: source, message: `${source.turn} shoots next`, simulationSteps: 0 };
      return { done: true, result, stepIndex: 0, maxSteps: 0 };
    }
    const state = cloneState(source);
    const shot = shotPayload(aim, power, contact, shooter, options, state);
    if (!applyCueImpulse(state, shot)) {
      const result = { changed: false, state: source, message: 'pull farther to shoot', simulationSteps: 0 };
      return { done: true, result, stepIndex: 0, maxSteps: 0 };
    }
    state.phase = 'moving';
    state.deterministic.telemetry = usesEventSolver(state) ? createPhysicsTelemetry(state) : null;
    const shotResult = { pocketedTargets: [], scratch: false };
    const trajectory = [];
    if (options.collectTrajectory) trajectory.push(source.balls.map((ball) => ballExport(ball, source.preset)));
    const simulationDt = Math.max(EPSILON, Number(state.deterministic.dt) || PHYSICS_DT);
    const maxSteps = Math.ceil(state.deterministic.parameters.maxShotSeconds / simulationDt);
    return {
      done: false,
      result: null,
      source,
      state,
      shot,
      shotResult,
      trajectory,
      collectTrajectory: !!options.collectTrajectory,
      stepIndex: 0,
      maxSteps,
      dt: simulationDt,
      trajectoryStride: Math.max(1, Math.round((1 / 30) / simulationDt))
    };
  }

  function finishShotSimulation(simulation) {
    if (simulation.done) return simulation.result;
    const { state, shot, shotResult, trajectory } = simulation;
    const telemetry = state.deterministic.telemetry;
    if (telemetry) {
      telemetry.phase = 'complete';
      telemetry.finalEnergyJ = totalKineticEnergy(state);
      telemetry.energyDriftJ = telemetry.finalEnergyJ - telemetry.initialEnergyJ;
      if (simulation.stepIndex >= simulation.maxSteps && !ballsAtRest(state)) {
        warnPhysics(telemetry, 'maximum simulation duration reached; residual motion was settled');
      }
    }
    state.balls.forEach((ball) => {
      ball.height = 0;
      ball.velocity = { x: 0, y: 0, z: 0 };
      if (Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z) < state.deterministic.parameters.stopSpin * 2) {
        ball.angularVelocity = { x: 0, y: 0, z: 0 };
      }
      if (ball.active) ball.motionState = 'sleeping';
    });
    finishShot(state, shot, shotResult);
    if (simulation.collectTrajectory) trajectory.push(state.balls.map((ball) => ballExport(ball, state.preset)));
    simulation.done = true;
    simulation.result = {
      changed: true,
      state,
      shot: state.lastShot,
      trajectory,
      simulationSteps: simulation.stepIndex,
      telemetry: clonePlain(state.deterministic.telemetry),
      message: shotResult.scratch
        ? 'scratch: ball in hand'
        : `${shotResult.pocketedTargets.length} target${shotResult.pocketedTargets.length === 1 ? '' : 's'} pocketed`
    };
    return simulation.result;
  }

  function advanceShotSimulation(simulation, requestedSteps = 1) {
    if (!simulation || simulation.done) return simulation;
    const stepLimit = Math.max(1, Math.floor(Number(requestedSteps) || 1));
    const endStep = Math.min(simulation.maxSteps, simulation.stepIndex + stepLimit);
    while (simulation.stepIndex < endStep) {
      const index = simulation.stepIndex;
      step(simulation.state, simulation.dt || PHYSICS_DT, simulation.shotResult);
      simulation.stepIndex += 1;
      if (simulation.collectTrajectory && index % (simulation.trajectoryStride || 8) === 0) {
        simulation.trajectory.push(simulation.state.balls.map((ball) => ballExport(ball, simulation.state.preset)));
      }
      if (index > 12 && ballsAtRest(simulation.state)) {
        finishShotSimulation(simulation);
        break;
      }
    }
    if (!simulation.done && simulation.stepIndex >= simulation.maxSteps) finishShotSimulation(simulation);
    return simulation;
  }

  function shotSimulationProgress(simulation) {
    if (!simulation) return { phase: 'idle', progress: 0, stepIndex: 0, maxSteps: 0, telemetry: null };
    return {
      phase: simulation.done ? 'complete' : 'simulating',
      progress: simulation.maxSteps ? clamp(simulation.stepIndex / simulation.maxSteps, 0, 1) : 1,
      stepIndex: simulation.stepIndex,
      maxSteps: simulation.maxSteps,
      simulatedTime: simulation.stepIndex * (simulation.dt || PHYSICS_DT),
      telemetry: clonePlain(simulation.state && simulation.state.deterministic && simulation.state.deterministic.telemetry)
    };
  }

  function shotSimulationResult(simulation) {
    return simulation && simulation.done ? simulation.result : null;
  }

  function resolveShot(source, aim, power, contact, options = {}) {
    const simulation = createShotSimulation(source, aim, power, contact, options);
    while (!simulation.done) advanceShotSimulation(simulation, simulation.maxSteps || 1);
    return shotSimulationResult(simulation);
  }

  function placeCueBallInHand(source, tileIndex, position, player) {
    if (!source.ballInHand || source.phase !== 'ball-in-hand') return { changed: false, state: source, message: 'ball in hand is not active' };
    if (player && source.ballInHandPlayer && player !== source.ballInHandPlayer) return { changed: false, state: source, message: `${source.ballInHandPlayer} places the cue ball` };
    const state = cloneState(source);
    let cue = state.balls.find((ball) => ball.kind === 'cue');
    if (!cue) {
      cue = ballFromPayload({ id: 'cue', kind: 'cue', at: { tileIndex, ...position } }, state.preset, state.atlas, state, 0);
      state.balls.push(cue);
    }
    cue.active = true;
    cue.tileIndex = tileIndex;
    cue.position = { ...position };
    cue.height = 0;
    cue.velocity = { x: 0, y: 0, z: 0 };
    cue.angularVelocity = { x: 0, y: 0, z: 0 };
    cue.motionState = 'sleeping';
    cue.pocketedAt = null;
    const issue = placementIssue(state, cue, cue.id);
    if (issue) return { changed: false, state: source, message: issue };
    state.ballInHand = false;
    state.ballInHandPlayer = '';
    state.phase = 'ready';
    const tile = rowCol(tileIndex, state.preset.cols);
    appendRecordMove(state, {
      action: 'billiards-place-cue',
      type: 'billiards-place-cue',
      player: player || source.ballInHandPlayer || source.turn,
      at: { row: tile.row, col: tile.col, x: position.x, y: position.y }
    });
    return { changed: true, state, message: 'cue ball placed; ready to shoot' };
  }

  function stateExport(state) {
    return {
      rules: state.rules,
      tileEdgeLengthM: localMetersPerUnit(state),
      ballRadius: state.ballRadius,
      pocketRadius: state.pocketRadius,
      phase: state.phase,
      balls: state.balls.map((ball) => ballExport(ball, state.preset)),
      pockets: state.pockets.map((pocket) => pocketExport(pocket, state)),
      scores: { ...state.scores },
      score: state.score,
      turn: state.turn,
      winner: state.winner,
      ballInHand: state.ballInHand,
      ballInHandPlayer: state.ballInHandPlayer,
      shots: state.shots,
      round: state.round,
      targetTotal: state.targetTotal,
      nextTargetNumber: state.nextTargetNumber,
      nextPocketId: state.nextPocketId,
      lastShot: clonePlain(state.lastShot),
      initialSetup: clonePlain(state.initialSetup),
      rackRecipe: clonePlain(state.rackRecipe),
      rackTargetNumbers: Array.isArray(state.rackTargetNumbers) ? state.rackTargetNumbers.slice() : [],
      recordMoves: clonePlain(state.recordMoves),
      deterministic: clonePlain(state.deterministic)
    };
  }

  function stateFromExport(preset, payload) {
    const source = payload && payload.billiardsState && typeof payload.billiardsState === 'object'
      ? payload.billiardsState
      : payload;
    const balls = Array.isArray(source.balls) ? source.balls.map((entry) => {
      if (entry.at) return entry;
      const tile = rowCol(Number(entry.tileIndex), preset.cols);
      return { ...entry, at: { row: tile.row, col: tile.col, ...(entry.position || {}) } };
    }) : [];
    const pockets = Array.isArray(source.pockets) ? source.pockets.map((entry) => ({
      ...entry,
      vertex: entry.vertex || { classIndex: entry.classIndex }
    })) : [];
    const state = createState({
      ...preset,
      billiards: {
        rules: source.rules,
        physicsProfile: source.physicsProfile || (source.deterministic && source.deterministic.physicsProfile),
        equipmentProfileId: source.equipmentProfileId || (source.deterministic && source.deterministic.equipmentProfileId),
        tileEdgeLengthM: source.tileEdgeLengthM != null
          ? source.tileEdgeLengthM
          : (source.deterministic && source.deterministic.tileEdgeLengthM),
        ballRadius: source.ballRadius,
        pocketRadius: source.pocketRadius,
        balls,
        pockets
      }
    }, { rules: source.rules });
    state.phase = ['setup', 'ready', 'moving', 'ball-in-hand', 'gameover'].includes(source.phase) ? source.phase : 'setup';
    state.scores = {
      'player-1': Math.max(0, Number(source.scores && source.scores['player-1']) || 0),
      'player-2': Math.max(0, Number(source.scores && source.scores['player-2']) || 0)
    };
    state.score = Math.max(0, Number(source.score) || 0);
    state.turn = source.turn === 'player-2' ? 'player-2' : 'player-1';
    state.winner = ['player-1', 'player-2', 'draw'].includes(source.winner) ? source.winner : '';
    state.ballInHand = !!source.ballInHand;
    state.ballInHandPlayer = source.ballInHandPlayer === 'player-2' ? 'player-2' : (source.ballInHandPlayer === 'player-1' ? 'player-1' : '');
    state.shots = Math.max(0, Math.floor(Number(source.shots) || 0));
    state.round = state.shots;
    state.targetTotal = Math.max(0, Math.floor(Number(source.targetTotal) || state.balls.filter((ball) => ball.kind === 'target').length));
    state.nextTargetNumber = lowestMissingTargetNumber(state.balls);
    state.nextPocketId = Math.max(1, Math.floor(Number(source.nextPocketId) || state.nextPocketId));
    state.lastShot = clonePlain(source.lastShot || null);
    state.initialSetup = clonePlain(source.initialSetup || null);
    if (source.rackRecipe && typeof source.rackRecipe === 'object') {
      try {
        state.rackRecipe = normalizeRackRecipe(source.rackRecipe, preset, state.atlas).recipe;
        state.rackTargetNumbers = Array.isArray(source.rackTargetNumbers)
          ? source.rackTargetNumbers.map((number) => Math.max(1, Math.floor(Number(number) || 1)))
          : Array.from({ length: state.rackRecipe.count }, (_, index) => index + 1);
      } catch (_) {
        state.rackRecipe = null;
        state.rackTargetNumbers = [];
      }
    }
    state.recordMoves = clonePlain(source.recordMoves || []);
    if (source.deterministic && typeof source.deterministic === 'object') {
      const physicsProfile = normalizePhysicsProfile(source.deterministic.physicsProfile || source.physicsProfile);
      const equipmentProfileId = normalizeEquipmentProfile(source.deterministic.equipmentProfileId || source.equipmentProfileId);
      const currentEquipment = equipmentProfile(equipmentProfileId);
      const tileEdgeLengthM = normalizeTileEdgeLengthM(
        source.deterministic.tileEdgeLengthM,
        state.deterministic.tileEdgeLengthM
      );
      if (source.deterministic.physicsVersion && source.deterministic.physicsVersion !== PHYSICS_VERSION[physicsProfile]) {
        throw new Error(`Unsupported Billiards physics version ${source.deterministic.physicsVersion}; expected ${PHYSICS_VERSION[physicsProfile]}.`);
      }
      const expectedToleranceVersion = physicsProfile === 'legacy' ? 'legacy-fixed-step-v1' : SOLVER_TOLERANCES_VERSION;
      if (source.deterministic.solverTolerancesVersion && source.deterministic.solverTolerancesVersion !== expectedToleranceVersion) {
        throw new Error(`Unsupported Billiards solver tolerance version ${source.deterministic.solverTolerancesVersion}.`);
      }
      if (source.deterministic.equipmentVersion && source.deterministic.equipmentVersion !== currentEquipment.version) {
        throw new Error(`Unsupported Billiards equipment version ${source.deterministic.equipmentVersion}; expected ${currentEquipment.version}.`);
      }
      if (source.deterministic.cueInputVersion && source.deterministic.cueInputVersion !== CUE_INPUT_VERSION) {
        throw new Error(`Unsupported Billiards cue input version ${source.deterministic.cueInputVersion}.`);
      }
      const parameters = parametersForPhysicsProfile(physicsProfile, source.deterministic.parameters);
      parameters.friction = normalizeFriction(parameters.friction);
      state.deterministic = {
        dt: physicsTimeStep(physicsProfile),
        physicsProfile,
        physicsVersion: PHYSICS_VERSION[physicsProfile],
        equipmentProfileId,
        equipmentVersion: currentEquipment.version,
        tileEdgeLengthM,
        solverTolerancesVersion: expectedToleranceVersion,
        cueInputVersion: CUE_INPUT_VERSION,
        seed: Math.max(1, Math.floor(Number(source.deterministic.seed) || 1)),
        parameters,
        telemetry: clonePlain(source.deterministic.telemetry || null)
      };
    }
    return state;
  }

  function localToCanvas(tileIndex, point, geometry, atlas) {
    const cell = geometry && geometry.cells && geometry.cells[tileIndex];
    if (!cell) return null;
    const scale = atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    return { x: cell.x + point.x * scale, y: cell.y + point.y * scale };
  }

  function canvasToLocal(point, geometry, atlas) {
    if (!point || !geometry || !geometry.cells) return null;
    const scale = atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    let best = null;
    atlas.tiles.forEach((tile) => {
      if (tile.removed) return;
      const cell = geometry.cells[tile.index];
      if (!cell) return;
      const local = { x: (point.x - cell.x) / scale, y: (point.y - cell.y) / scale };
      if (!pointInsideTile(atlas, tile.index, local, 0)) return;
      const distance = M.length2(local);
      if (!best || distance < best.distance) best = { tileIndex: tile.index, position: local, distance };
    });
    return best;
  }

  function magneticSnapPoint(atlas, tileIndex, position, geometry, options = {}) {
    const point = normalizeVector2(position);
    const base = { tileIndex, position: point, snapped: false, anchor: null, distanceCss: Infinity };
    const tile = atlas && atlas.tiles && atlas.tiles[tileIndex];
    if (!tile || tile.removed || options.disabled || !geometry) return base;
    const sourceCanvas = localToCanvas(tileIndex, point, geometry, atlas);
    if (!sourceCanvas) return base;
    const scaleX = Number.isFinite(Number(options.cssScaleX)) && Number(options.cssScaleX) > 0 ? Number(options.cssScaleX) : 1;
    const scaleY = Number.isFinite(Number(options.cssScaleY)) && Number(options.cssScaleY) > 0 ? Number(options.cssScaleY) : scaleX;
    const threshold = Number.isFinite(Number(options.thresholdCss))
      ? Math.max(0, Number(options.thresholdCss))
      : POSITION_SNAP_CSS_PX;
    const candidates = [
      { position: { x: 0, y: 0 }, anchor: { kind: 'center' }, order: 0 },
      ...tile.polygon.map((cornerPoint, corner) => ({
        position: { ...cornerPoint },
        anchor: { kind: 'vertex', corner, cornerName: atlas.info.cornerNames[corner] },
        order: corner + 1
      }))
    ];
    let best = null;
    candidates.forEach((candidate) => {
      const canvas = localToCanvas(tileIndex, candidate.position, geometry, atlas);
      if (!canvas) return;
      const distanceCss = Math.hypot(
        (canvas.x - sourceCanvas.x) * scaleX,
        (canvas.y - sourceCanvas.y) * scaleY
      );
      if (!best || distanceCss < best.distanceCss - EPSILON || (
        Math.abs(distanceCss - best.distanceCss) <= EPSILON && candidate.order < best.order
      )) best = { ...candidate, distanceCss };
    });
    if (!best || best.distanceCss > threshold + EPSILON) return base;
    return {
      tileIndex,
      position: { ...best.position },
      snapped: true,
      anchor: { ...best.anchor },
      distanceCss: best.distanceCss
    };
  }

  function normalizeAngleDegrees(value) {
    const angle = Number(value);
    return Number.isFinite(angle) ? modulo(angle, 360) : null;
  }

  function directionFromAngleDegrees(angle) {
    const normalized = normalizeAngleDegrees(angle);
    if (normalized == null) return null;
    const radians = normalized * Math.PI / 180;
    return { x: Math.cos(radians), y: Math.sin(radians) };
  }

  function angleDegreesFromDirection(direction) {
    const vector = normalizedRackDirection(direction, null);
    return vector ? normalizeAngleDegrees(Math.atan2(vector.y, vector.x) * 180 / Math.PI) : null;
  }

  function magneticSnapDirection(direction, options = {}) {
    const angle = angleDegreesFromDirection(direction);
    if (angle == null) return null;
    const base = { direction: directionFromAngleDegrees(angle), angle, snapped: false, deltaDegrees: Infinity };
    if (options.disabled) return base;
    const step = Number.isFinite(Number(options.stepDegrees)) && Number(options.stepDegrees) > 0
      ? Number(options.stepDegrees)
      : DIRECTION_SNAP_STEP_DEGREES;
    const tolerance = Number.isFinite(Number(options.toleranceDegrees))
      ? Math.max(0, Number(options.toleranceDegrees))
      : DIRECTION_SNAP_TOLERANCE_DEGREES;
    const snappedAngle = normalizeAngleDegrees(Math.round(angle / step) * step);
    const delta = Math.abs(modulo(angle - snappedAngle + 180, 360) - 180);
    if (delta > tolerance + EPSILON) return { ...base, deltaDegrees: delta };
    return {
      direction: directionFromAngleDegrees(snappedAngle),
      angle: snappedAngle,
      snapped: true,
      deltaDegrees: delta
    };
  }

  function drawPocketWedges(ctx, geometry, state) {
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    state.pockets.forEach((pocket) => {
      const vertexClass = state.atlas.vertexClasses[pocket.classIndex];
      if (!vertexClass) return;
      vertexClass.incidences.forEach((incidence) => {
        const tile = state.atlas.tiles[incidence.tileIndex];
        const center = localToCanvas(incidence.tileIndex, incidence.point, geometry, state.atlas);
        if (!center) return;
        ctx.save();
        const polygon = tile.polygon.map((point) => localToCanvas(tile.index, point, geometry, state.atlas));
        ctx.beginPath();
        polygon.forEach((point, index) => {
          if (index) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.clip();
        const radius = pocket.radius * scale;
        const gradient = ctx.createRadialGradient(center.x - radius * 0.16, center.y - radius * 0.16, 1, center.x, center.y, radius);
        gradient.addColorStop(0, '#050707');
        gradient.addColorStop(0.72, '#111516');
        gradient.addColorStop(1, 'rgba(12,16,17,0.62)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    });
  }

  function drawBall(ctx, geometry, state, ball, image, renderer, debugTexture) {
    const groundCenter = localToCanvas(image.tileIndex, image.position, geometry, state.atlas);
    if (!groundCenter) return;
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    const radius = ball.radius * scale;
    const lift = Math.max(0, Number(ball.height) || 0) * scale;
    const center = { x: groundCenter.x, y: groundCenter.y - lift };
    const tile = state.atlas.tiles[image.tileIndex];
    ctx.save();
    const polygon = tile.polygon.map((point) => localToCanvas(tile.index, point, geometry, state.atlas));
    ctx.beginPath();
    polygon.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
    if (lift > 0.5) {
      const shadowScale = clamp(1 - lift / Math.max(radius * 8, 1), 0.35, 0.95);
      ctx.fillStyle = `rgba(0,0,0,${clamp(0.28 - lift / Math.max(radius * 40, 1), 0.08, 0.28)})`;
      ctx.beginPath();
      ctx.ellipse(groundCenter.x, groundCenter.y + radius * 0.16, radius * shadowScale, radius * 0.32 * shadowScale, 0, 0, TAU);
      ctx.fill();
    }
    if (renderer && typeof renderer.sphericalSprite === 'function' && typeof renderer.drawBallBadge === 'function') {
      const fixedLabel = state.phase === 'setup' || (state.phase === 'ball-in-hand' && ball.kind === 'cue');
      const sprite = renderer.sphericalSprite(ball, image.orientation, radius * 2 * ballSpriteRasterScale(geometry), !!debugTexture, {
        showNumberPatch: !fixedLabel
      });
      ctx.drawImage(sprite, center.x - radius, center.y - radius, radius * 2, radius * 2);
      if (fixedLabel) renderer.drawBallBadge(ctx, center, radius, ball);
      else if (typeof renderer.drawBallOutline === 'function') renderer.drawBallOutline(ctx, center, radius);
    } else {
      ctx.fillStyle = ball.kind === 'cue' ? '#fbfbf8' : ['#e6b640', '#2a6ba8', '#b44537', '#5e4a91'][modulo(ball.number - 1, 4)];
      ctx.strokeStyle = '#202326';
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      const label = ball.kind === 'cue' ? '0' : String(ball.number);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.49, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = `600 ${Math.max(8, radius * (label.length > 1 ? 0.49 : 0.62))}px sans-serif`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, center.x, center.y);
    }
    ctx.restore();
  }

  function ballSpriteRasterScale(geometry) {
    const backingScale = Math.max(
      Number(geometry && geometry.backingScaleX) || 1,
      Number(geometry && geometry.backingScaleY) || 1
    );
    const deviceScale = Number(geometry && geometry.devicePixelRatio);
    // Normal view caps logical tile size and then enlarges the whole canvas in
    // CSS.  The sprite must follow the complete logical-to-backing-pixel scale,
    // not just devicePixelRatio, or its number texture is enlarged and blurred.
    return Math.min(8, Math.max(1, backingScale, Number.isFinite(deviceScale) ? deviceScale : 1));
  }

  function rayCircleDistance(origin, direction, center, radius) {
    const delta = M.sub2(center, origin);
    const projection = M.dot2(delta, direction);
    if (projection <= EPSILON) return null;
    const perpendicularSquared = M.dot2(delta, delta) - (projection * projection);
    const radiusSquared = radius * radius;
    if (perpendicularSquared > radiusSquared + EPSILON) return null;
    const distance = projection - Math.sqrt(Math.max(0, radiusSquared - perpendicularSquared));
    return distance >= EPSILON ? distance : null;
  }

  function firstAimBall(state, cue, tileIndex, point, direction, maximumDistance) {
    let hit = null;
    const depth = Math.max(1, Math.min(4, Number(state.deterministic.parameters.localCoverDepth) || 1));
    state.balls.forEach((ball) => {
      if (!ball.active || ball.kind !== 'target' || ball.id === cue.id) return;
      ballImagesInTile(ball, state.atlas, tileIndex, depth, cue.radius + ball.radius).forEach((image) => {
        const distance = rayCircleDistance(point, direction, image.position, cue.radius + ball.radius);
        if (distance == null || distance > maximumDistance + EPSILON) return;
        if (!hit || distance < hit.distance) hit = { distance, ball, image };
      });
    });
    return hit;
  }

  function firstAimPocket(state, cue, tileIndex, point, direction, maximumDistance) {
    let hit = null;
    state.pockets.forEach((pocket) => {
      const vertexClass = state.atlas.vertexClasses[pocket.classIndex];
      if (!vertexClass) return;
      vertexClass.incidences.forEach((incidence) => {
        if (incidence.tileIndex !== tileIndex) return;
        const distance = rayCircleDistance(point, direction, incidence.point, pocketCaptureRadius(cue, pocket));
        if (distance == null || distance > maximumDistance + EPSILON) return;
        if (!hit || distance < hit.distance) hit = { distance, pocket, incidence };
      });
    });
    return hit;
  }

  function nextAimEdge(state, cue, tileIndex, point, direction) {
    const tile = state.atlas.tiles[tileIndex];
    let closest = null;
    tile.frames.forEach((frame, dir) => {
      const rate = M.dot2(direction, frame.inward);
      if (rate >= -EPSILON) return;
      const transition = tile.transitions[dir];
      const currentDistance = pointEdgeDistance(point, frame);
      const targetDistance = transition ? 0 : cue.radius;
      const distance = (targetDistance - currentDistance) / rate;
      if (distance < -EPSILON) return;
      if (!closest || distance < closest.distance) {
        closest = { dir, distance: Math.max(0, distance), transition };
      }
    });
    return closest;
  }

  function aimRayStateKey(tileIndex, point, direction) {
    return [tileIndex, point.x, point.y, direction.x, direction.y]
      .map((value, index) => index ? Number(value).toFixed(7) : String(value))
      .join('|');
  }

  function traceAim(state, direction, options = {}) {
    const cue = state && state.balls && state.balls.find((ball) => ball.active && ball.kind === 'cue');
    const aim = M.normalize2(normalizeVector2(direction));
    const requestedTransitions = Number(typeof options === 'number' ? options : options.maxTransitions);
    const maximumTransitions = Number.isFinite(requestedTransitions)
      ? Math.max(0, Math.min(12, Math.floor(requestedTransitions)))
      : 12;
    const result = { segments: [], contactedBall: null, contactedPocket: null, termination: 'none', transitions: 0 };
    if (!cue || M.length2(aim) <= EPSILON) return result;

    let tileIndex = cue.tileIndex;
    let point = { ...cue.position };
    let ray = aim;
    const seen = new Set([aimRayStateKey(tileIndex, point, ray)]);
    while (result.segments.length <= maximumTransitions) {
      const edge = nextAimEdge(state, cue, tileIndex, point, ray);
      if (!edge) {
        result.termination = 'none';
        break;
      }
      const ballHit = firstAimBall(state, cue, tileIndex, point, ray, edge.distance);
      const pocketHit = firstAimPocket(state, cue, tileIndex, point, ray, edge.distance);
      const hit = ballHit && (!pocketHit || ballHit.distance <= pocketHit.distance) ? ballHit : pocketHit;
      const distance = hit ? hit.distance : edge.distance;
      const end = M.add2(point, M.scale2(ray, distance));
      result.segments.push({
        tileIndex,
        from: { ...point },
        to: { ...end },
        hit: !!hit,
        boundary: !hit && !edge.transition
      });
      if (hit && hit === ballHit) {
        result.contactedBall = {
          id: String(hit.ball.id),
          ballId: String(hit.ball.id),
          kind: hit.ball.kind,
          number: hit.ball.number,
          color: ballColor(hit.ball.kind, hit.ball.number),
          tileIndex,
          position: { ...hit.image.position },
          cuePosition: { ...end }
        };
        result.termination = 'ball';
        break;
      }
      if (hit && hit === pocketHit) {
        result.contactedPocket = {
          id: String(hit.pocket.id),
          classIndex: hit.pocket.classIndex,
          tileIndex,
          position: { ...hit.incidence.point },
          cuePosition: { ...end },
          radius: hit.pocket.radius,
          captureRadius: pocketCaptureRadius(cue, hit.pocket)
        };
        result.termination = 'pocket';
        break;
      }
      if (!edge.transition) {
        result.termination = 'wall';
        break;
      }
      if (result.transitions >= maximumTransitions) {
        result.termination = 'max-transitions';
        break;
      }
      const across = M.add2(end, M.scale2(ray, EPSILON * 16));
      point = M.applyAffine(edge.transition.transform, across);
      ray = M.normalize2(M.applyLinear(edge.transition.transform, ray));
      tileIndex = edge.transition.tileIndex;
      result.transitions += 1;
      const key = aimRayStateKey(tileIndex, point, ray);
      if (seen.has(key)) {
        result.termination = 'loop';
        break;
      }
      seen.add(key);
    }
    return result;
  }

  function clipToTile(ctx, geometry, state, tileIndex) {
    const tile = state.atlas.tiles[tileIndex];
    if (!tile) return false;
    const polygon = tile.polygon.map((point) => localToCanvas(tile.index, point, geometry, state.atlas));
    if (polygon.some((point) => !point)) return false;
    ctx.beginPath();
    polygon.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
    return true;
  }

  function aimGuideImages(state, tileIndex, position, radius) {
    const guide = {
      tileIndex,
      position,
      velocity: { x: 0, y: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      orientation: defaultBallOrientation()
    };
    return nearbyImages(guide, state.atlas, {
      padding: radius,
      maxDepth: Math.max(3, Number(state.deterministic.parameters.localCoverDepth) || 0),
      onlyIntersecting: true,
      minimal: true
    });
  }

  function drawAimGuideCircle(ctx, geometry, state, tileIndex, position, radius, scale, style, lineWidth) {
    aimGuideImages(state, tileIndex, position, radius).forEach((image) => {
      const center = localToCanvas(image.tileIndex, image.position, geometry, state.atlas);
      if (!center) return;
      ctx.save();
      if (!clipToTile(ctx, geometry, state, image.tileIndex)) {
        ctx.restore();
        return;
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = style;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * scale, 0, TAU);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawAimPocketHighlight(ctx, geometry, state, contact, scale) {
    const vertexClass = state.atlas.vertexClasses[contact.classIndex];
    if (!vertexClass) return;
    vertexClass.incidences.forEach((incidence) => {
      const center = localToCanvas(incidence.tileIndex, incidence.point, geometry, state.atlas);
      if (!center) return;
      ctx.save();
      if (!clipToTile(ctx, geometry, state, incidence.tileIndex)) {
        ctx.restore();
        return;
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(244,207,89,0.92)';
      ctx.lineWidth = Math.max(2, scale * 0.026);
      ctx.beginPath();
      ctx.arc(center.x, center.y, contact.radius * scale, 0, TAU);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBeginnerAim(ctx, geometry, state, cue, aim, scale) {
    const trace = traceAim(state, aim);
    trace.segments.forEach((segment) => {
      const from = localToCanvas(segment.tileIndex, segment.from, geometry, state.atlas);
      const to = localToCanvas(segment.tileIndex, segment.to, geometry, state.atlas);
      if (!from || !to) return;
      ctx.save();
      if (!clipToTile(ctx, geometry, state, segment.tileIndex)) {
        ctx.restore();
        return;
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.lineWidth = Math.max(1.2, scale * 0.018);
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    });
    const contact = trace.contactedBall || trace.contactedPocket;
    if (!contact) return;
    drawAimGuideCircle(
      ctx,
      geometry,
      state,
      contact.tileIndex,
      contact.cuePosition,
      cue.radius,
      scale,
      'rgba(255,255,255,0.72)',
      Math.max(1.5, scale * 0.022)
    );
    if (trace.contactedPocket) {
      drawAimPocketHighlight(ctx, geometry, state, trace.contactedPocket, scale);
      return;
    }
    const target = state.balls.find((ball) => String(ball.id) === contact.ballId);
    if (!target) return;
    drawAimGuideCircle(
      ctx,
      geometry,
      state,
      target.tileIndex,
      target.position,
      target.radius * 1.18,
      scale,
      'rgba(244,207,89,0.92)',
      Math.max(2, scale * 0.026)
    );
  }

  function drawAim(ctx, geometry, state, view) {
    if (state.phase !== 'ready') return;
    const cue = state.balls.find((ball) => ball.active && ball.kind === 'cue');
    if (!cue) return;
    const center = localToCanvas(cue.tileIndex, cue.position, geometry, state.atlas);
    if (!center) return;
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    const aim = M.normalize2(view.aim || { x: 1, y: 0 });
    ctx.save();
    if (view.assistance === 'beginner') {
      drawBeginnerAim(ctx, geometry, state, cue, aim, scale);
    } else {
      const length = scale * (view.assistance === 'expert' ? 0.65 : 1.55);
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = Math.max(1.2, scale * 0.018);
      ctx.setLineDash(view.assistance === 'expert' ? [] : [7, 5]);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + aim.x * length, center.y + aim.y * length);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const pull = (0.42 + (view.dragPower || 0) * 0.8) * scale;
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = Math.max(4, scale * 0.065);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(center.x - aim.x * pull, center.y - aim.y * pull);
    ctx.lineTo(center.x - aim.x * (pull + scale * 1.25), center.y - aim.y * (pull + scale * 1.25));
    ctx.stroke();
    ctx.restore();
  }

  function setupHoverColor(hover) {
    if (!hover || hover.valid === false) return '#b23a48';
    if (hover.action === 'remove' || hover.action === 'erase') return '#c47f17';
    return '#1f7a8c';
  }

  function drawSetupHoverCircle(ctx, geometry, state, tileIndex, position, radius, color) {
    const point = localToCanvas(tileIndex, position, geometry, state.atlas);
    if (!point) return null;
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    ctx.save();
    if (clipToTile(ctx, geometry, state, tileIndex)) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, scale * 0.026);
      ctx.setLineDash([Math.max(4, scale * 0.10), Math.max(3, scale * 0.075)]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2, radius * scale), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    return point;
  }

  function drawCompleteSetupHoverBall(ctx, geometry, state, tileIndex, position, radius, color, valid) {
    const primary = localToCanvas(tileIndex, position, geometry, state.atlas);
    if (!primary) return null;
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    const drawCircle = (center, clippedTileIndex = null) => {
      ctx.save();
      if (Number.isInteger(clippedTileIndex) && !clipToTile(ctx, geometry, state, clippedTileIndex)) {
        ctx.restore();
        return;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, scale * 0.026);
      ctx.setLineDash([Math.max(4, scale * 0.10), Math.max(3, scale * 0.075)]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(2, radius * scale), 0, TAU);
      ctx.stroke();
      ctx.restore();
    };
    if (valid === false) {
      drawCircle(primary);
      return primary;
    }
    const images = aimGuideImages(state, tileIndex, position, radius);
    if (!images.length) {
      drawCircle(primary);
      return primary;
    }
    images.forEach((image) => {
      const center = localToCanvas(image.tileIndex, image.position, geometry, state.atlas);
      if (center) drawCircle(center, image.tileIndex);
    });
    return primary;
  }

  function drawSetupHoverLabel(ctx, point, label, color) {
    if (!point || !label) return;
    const text = String(label);
    ctx.save();
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    const width = Math.ceil(ctx.measureText(text).width) + 14;
    const x = point.x + 10;
    const y = point.y - 28;
    ctx.fillStyle = 'rgba(255,253,248,0.94)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x, y, width, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#202326';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 7, y + 11.5);
    ctx.restore();
  }

  function drawSetupHoverLabelOverlay(ctx, point, hover) {
    if (!hover) return;
    drawSetupHoverLabel(ctx, point, hover.label, setupHoverColor(hover));
  }

  function drawSetupHover(ctx, geometry, state, hover, options = {}) {
    if (!hover || !Number.isInteger(hover.tileIndex)) return;
    const color = setupHoverColor(hover);
    const radius = Number(hover.radius) || state.ballRadius;
    let labelPoint = null;
    if (hover.type === 'pocket' && Array.isArray(hover.incidences) && hover.incidences.length) {
      hover.incidences.forEach((incidence) => {
        const point = drawSetupHoverCircle(ctx, geometry, state, incidence.tileIndex, incidence.position, radius, color);
        if (!labelPoint) labelPoint = point;
      });
    } else {
      const point = hover.image || hover.vertex || hover;
      const targetTile = Number.isInteger(point.tileIndex) ? point.tileIndex : hover.tileIndex;
      const targetPosition = point.position && typeof point.position === 'object' ? point.position : hover.position;
      if (targetPosition) {
        labelPoint = hover.type === 'ball'
          ? drawCompleteSetupHoverBall(ctx, geometry, state, targetTile, targetPosition, radius, color, hover.valid)
          : drawSetupHoverCircle(ctx, geometry, state, targetTile, targetPosition, radius, color);
      }
    }
    if (options.label !== false) drawSetupHoverLabel(ctx, labelPoint, hover.label, color);
  }

  function drawCuePrompt(ctx, geometry, state, view) {
    if (!view || !view.cuePrompt || state.phase !== 'ready') return;
    const cue = state.balls.find((ball) => ball.active && ball.kind === 'cue');
    if (!cue) return;
    const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
    const time = Number.isFinite(Number(view.pulseTime)) ? Number(view.pulseTime) : 0;
    const wave = (Math.sin(time / 340) + 1) * 0.5;
    const radius = cue.radius * scale * (1.30 + wave * 0.34);
    nearbyImages(cue, state.atlas, {
      padding: cue.radius * 1.8,
      maxDepth: state.deterministic.parameters.localCoverDepth,
      onlyIntersecting: true
    }).forEach((image) => {
      const center = localToCanvas(image.tileIndex, image.position, geometry, state.atlas);
      if (!center) return;
      ctx.save();
      if (clipToTile(ctx, geometry, state, image.tileIndex)) {
        ctx.strokeStyle = `rgba(244, 207, 89, ${0.40 + wave * 0.42})`;
        ctx.lineWidth = Math.max(2, scale * 0.035);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function render(ctx, geometry, state, view = {}) {
    if (!ctx || !geometry || !state) return;
    drawPocketWedges(ctx, geometry, state);
    if (view.setupHover && Number.isInteger(view.setupHover.tileIndex)) {
      drawSetupHover(ctx, geometry, state, view.setupHover, { label: view.setupHoverLabel !== false });
    }
    if (view.rackPreview && Number.isInteger(view.rackPreview.tileIndex)) {
      const preview = view.rackPreview;
      const entries = rackPreviewEntries(state, preview.count, preview.tileIndex, preview.center, preview.direction);
      const center = localToCanvas(preview.tileIndex, preview.center, geometry, state.atlas);
      const directionPoint = preview.directionPoint && localToCanvas(preview.tileIndex, preview.directionPoint, geometry, state.atlas);
      const scale = state.atlas.info.shape === 'hex' ? geometry.radius : geometry.size;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      if (center && directionPoint) {
        ctx.strokeStyle = entries.some((entry) => !entry.valid) ? '#b23a48' : '#1f7a8c';
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(directionPoint.x, directionPoint.y);
        ctx.stroke();
      }
      entries.forEach((entry) => {
        const point = localToCanvas(entry.tileIndex, entry.position, geometry, state.atlas);
        if (!point) return;
        ctx.strokeStyle = entry.valid ? '#1f7a8c' : '#b23a48';
        ctx.beginPath();
        ctx.arc(point.x, point.y, state.ballRadius * scale, 0, TAU);
        ctx.stroke();
      });
      if (center) {
        ctx.setLineDash([]);
        ctx.fillStyle = '#1f7a8c';
        ctx.beginPath();
        ctx.arc(center.x, center.y, Math.max(3, scale * 0.035), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    drawCuePrompt(ctx, geometry, state, view);
    drawAim(ctx, geometry, state, view);
    const renderer = typeof window !== 'undefined' ? window.TopologicalBilliardsRenderer : null;
    state.balls.filter((ball) => ball.active).forEach((ball) => {
      nearbyImages(ball, state.atlas, {
        padding: ball.radius,
        maxDepth: state.deterministic.parameters.localCoverDepth,
        onlyIntersecting: true
      }).forEach((image) => drawBall(ctx, geometry, state, ball, image, renderer, view.debugTexture));
    });
    if (view.debug) {
      ctx.save();
      ctx.font = '11px monospace';
      ctx.fillStyle = '#111';
      state.atlas.vertexClasses.forEach((vertexClass) => {
        const incidence = vertexClass.incidences[0];
        const point = incidence && localToCanvas(incidence.tileIndex, incidence.point, geometry, state.atlas);
        if (point) ctx.fillText(`${vertexClass.id}:${(vertexClass.coneAngle / Math.PI).toFixed(2)}pi`, point.x + 3, point.y - 3);
      });
      ctx.restore();
    }
  }

  function ballAtPoint(state, tileIndex, position) {
    let hit = null;
    state.balls.forEach((ball) => {
      if (!ball.active) return;
      ballImagesInTile(
        ball,
        state.atlas,
        tileIndex,
        state.deterministic.parameters.localCoverDepth,
        ball.radius * 1.35
      ).forEach((image) => {
        const distance = M.length2(M.sub2(position, image.position));
        if (distance <= ball.radius * 1.35 && (!hit || distance < hit.distance)) hit = { ball, image, distance };
      });
    });
    return hit;
  }

  return {
    BALL_COLORS,
    CUE_PROFILES,
    CUE_INPUT_VERSION,
    DEFAULT_EQUIPMENT_PROFILE,
    DEFAULT_PHYSICS_PROFILE,
    DEFAULT_PARAMETERS,
    EQUIPMENT_PROFILES,
    EPSILON,
    POSITION_SNAP_CSS_PX,
    DIRECTION_SNAP_STEP_DEGREES,
    DIRECTION_SNAP_TOLERANCE_DEGREES,
    PHYSICS_DT,
    PHYSICS_VERSION,
    RESEARCH_PARAMETER_DEFAULTS,
    RESEARCH_PHYSICS_DT,
    REALISTIC_PARAMETER_DEFAULTS,
    REALISTIC_PHYSICS_DT,
    SOLVER_TOLERANCES_VERSION,
    STROKE_PRESETS,
    TAU,
    TIP_PROFILES,
    activePocketAtClass,
    ballColor,
    ballAtPoint,
    ballExport,
    ballSpriteRasterScale,
    begin,
    buildAtlas,
    canvasToLocal,
    createShotSimulation,
    cloneState,
    createState,
    defaultBallOrientation,
    drawSetupHover,
    drawSetupHoverLabelOverlay,
    eraseAt,
    indexOf,
    latticeInfo,
    localToCanvas,
    locationReferenceForPoint,
    magneticSnapDirection,
    magneticSnapPoint,
    moveBall,
    nearbyImages,
    nearestVertex,
    normalizeRules,
    normalizeFriction,
    normalizeEquipmentProfile,
    normalizePhysicsProfile,
    normalizeTileEdgeLengthM,
    normalizeRackRecipe,
    placeBall,
    placeRack,
    placeCueBallInHand,
    placementIssue,
    rackLayout,
    pocketExport,
    presetBlockFromState,
    render,
    rackPreviewEntries,
    advanceShotSimulation,
    resolveShot,
    rowCol,
    setupIssue,
    stateExport,
    stateFromExport,
    stepPhysics: step,
    setupInteractionPreview,
    setPhysicsProfile,
    setEquipmentProfile,
    setTileEdgeLengthM,
    shotSimulationProgress,
    totalKineticEnergy,
    shotSimulationResult,
    traceAim,
    togglePocket,
    vertexClassFromReference
  };
});
