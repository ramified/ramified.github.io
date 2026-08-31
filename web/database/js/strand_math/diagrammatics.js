(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const {
    OperationBudget,
    LaurentPolynomial,
    LinearCombination,
    DELTA,
    identityPermutation,
    reducedWord,
    rightMultiplySimple,
    klToStandard,
    tlIdentityDiagram,
    tlGeneratorDiagram,
    stackTlDiagrams,
    identityMatrix,
    matrixAdd,
    matrixScale,
    matrixMultiply,
    burauGeneratorMatrix,
    tlGeneratorMatrix,
    linkStateTlGeneratorMatrix,
    reducedBurauGeneratorMatrix,
    matrixToLinearCombination
  } = math;

  const DEFAULT_DIAGRAM_LIMITS = Object.freeze({
    rank: 24,
    compositionLength: 160,
    atoms: 240
  });
  const DIAGRAM_DIRECTIONS = new Set(['up-down', 'down-up', 'left-right', 'right-left']);
  const DIAGRAM_SCOPES = new Set(['all', 'basis']);

  function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeDiagramOptions(options) {
    const settings = options || {};
    const limits = settings.limits || {};
    return {
      scope: DIAGRAM_SCOPES.has(settings.scope) ? settings.scope : 'all',
      direction: DIAGRAM_DIRECTIONS.has(settings.direction) ? settings.direction : 'up-down',
      limits: {
        rank: positiveInteger(limits.rank, DEFAULT_DIAGRAM_LIMITS.rank),
        compositionLength: positiveInteger(limits.compositionLength, DEFAULT_DIAGRAM_LIMITS.compositionLength),
        atoms: positiveInteger(limits.atoms, DEFAULT_DIAGRAM_LIMITS.atoms)
      }
    };
  }

  function copyRecords(records) {
    return Array.isArray(records) ? records.map((record) => ({ ...record })) : [];
  }

  function polynomialFromJSON(value) {
    return new LaurentPolynomial(Array.isArray(value) ? value : []);
  }

  function combinationFromJSON(value) {
    const source = value || {};
    return new LinearCombination(source.basisType || 'unknown', (source.terms || []).map((term) => ({
      basis: term.basis,
      coefficient: polynomialFromJSON(term.coefficient)
    })));
  }

  function polynomialTimesBasisLatex(coefficient, label) {
    if (coefficient.equals(LaurentPolynomial.one())) return label;
    if (coefficient.equals(LaurentPolynomial.monomial(0, -1n))) return `-${label}`;
    const latex = coefficient.toLatex();
    return `${coefficient.terms.size > 1 ? `(${latex})` : latex}${label}`;
  }

  function basisSymbolLatex(basis, basisType) {
    if (basisType === 'permutation' || math.SYMMETRIC_PRESENTATIONS?.includes(basisType)) {
      return math.formatPermutationBasisLatex
        ? math.formatPermutationBasisLatex(basis, basisType)
        : `[${basis.values.join(',')}]`;
    }
    if (basisType === 'standard' || basisType === 'hecke-standard') return `H_{[${basis.values.join(',')}]}`;
    if (basisType === 'kl') return `\\underline{H}_{[${basis.values.join(',')}]}`;
    if (basisType === 'diagram' || basisType === 'tl-diagram') {
      const pairs = (basis.pairs || []).map(([left, right]) => `${left + 1}\\!-${right + 1}`).join(',');
      return `D_{\\{${pairs}\\}}`;
    }
    if (basisType === 'matrix-unit' || basisType === 'burau-matrix-unit') return `E_{${basis.row}${basis.column}}`;
    if (basisType === 'vector' || basisType === 'burau-vector') return `e_{${basis.row}}`;
    if (basisType === 'link-state' || basisType === 'burau-link-state') return `L_{${basis.row || basis.cupIndex}}`;
    if (basisType === 'braid-word') return math.sourceWordLatex(basis.word || []);
    return String(basis.key || '?');
  }

  function termParts(coefficientValue, index) {
    let coefficient = coefficientValue instanceof LaurentPolynomial
      ? coefficientValue
      : polynomialFromJSON(coefficientValue);
    const values = [...coefficient.terms.values()];
    const uniformlyNegative = values.length > 0 && values.every((value) => value < 0n);
    let prefix = index ? '+' : '';
    if (uniformlyNegative) {
      coefficient = coefficient.neg();
      prefix = '-';
    }
    const isOne = coefficient.equals(LaurentPolynomial.one());
    const latex = coefficient.toLatex();
    return {
      prefix,
      coefficientLatex: isOne ? '' : coefficient.terms.size > 1 ? `(${latex})` : latex
    };
  }

  function orientPoint(point, direction) {
    if (direction === 'down-up') return { x: point.x, y: 1 - point.y };
    if (direction === 'left-right') return { x: point.y, y: point.x };
    if (direction === 'right-left') return { x: 1 - point.y, y: point.x };
    return { x: point.x, y: point.y };
  }

  function orientPath(path, direction) {
    return {
      ...path,
      start: orientPoint(path.start, direction),
      curves: (path.curves || []).map((curve) => ({
        c1: orientPoint(curve.c1, direction),
        c2: orientPoint(curve.c2, direction),
        end: orientPoint(curve.end, direction)
      }))
    };
  }

  function orientPolygon(polygon, direction) {
    return {
      ...polygon,
      points: (polygon.points || []).map((point) => orientPoint(point, direction))
    };
  }

  function diagramDimensions(rank, layers, direction, square) {
    const baseWidth = square ? Math.max(62, Math.min(210, 30 + rank * 9)) : Math.max(72, Math.min(300, 28 + rank * 12));
    const baseHeight = square ? baseWidth : Math.max(82, Math.min(360, 68 + Math.max(1, layers) * 4));
    return direction === 'left-right' || direction === 'right-left'
      ? { width: baseHeight, height: baseWidth }
      : { width: baseWidth, height: baseHeight };
  }

  function trackCoordinate(track, rank) {
    return rank <= 1 ? 0.5 : 0.08 + (0.84 * track / (rank - 1));
  }

  function layerCoordinate(layer, layers) {
    return 0.08 + (0.84 * layer / Math.max(1, layers));
  }

  function cubicPoint(start, curve, t) {
    const mt = 1 - t;
    const x = (mt ** 3) * start.x
      + 3 * (mt ** 2) * t * curve.c1.x
      + 3 * mt * (t ** 2) * curve.c2.x
      + (t ** 3) * curve.end.x;
    const y = (mt ** 3) * start.y
      + 3 * (mt ** 2) * t * curve.c1.y
      + 3 * mt * (t ** 2) * curve.c2.y
      + (t ** 3) * curve.end.y;
    return { x, y };
  }

  function makeBraidDiagram(rank, records, direction, crossingStyle, label) {
    const word = copyRecords(records);
    const layers = Math.max(1, word.length);
    const paths = Array.from({ length: rank }, (_, strand) => ({
      role: crossingStyle === 'tl' ? 'tl' : 'strand',
      start: { x: trackCoordinate(strand, rank), y: layerCoordinate(0, layers) },
      curves: []
    }));
    let trackToStrand = Array.from({ length: rank }, (_, index) => index);
    const overlays = [];

    if (!word.length) {
      paths.forEach((path, strand) => path.curves.push({
        c1: { x: trackCoordinate(strand, rank), y: 0.36 },
        c2: { x: trackCoordinate(strand, rank), y: 0.64 },
        end: { x: trackCoordinate(strand, rank), y: 0.92 }
      }));
    } else {
      word.forEach((record, layer) => {
        const generator = Math.max(1, Math.min(rank - 1, Number(record.index) || 1));
        const leftTrack = generator - 1;
        const rightTrack = generator;
        const y0 = layerCoordinate(layer, layers);
        const y1 = layerCoordinate(layer + 1, layers);
        const mid = (y0 + y1) / 2;
        const curveByStrand = new Map();
        for (let track = 0; track < rank; track += 1) {
          const strand = trackToStrand[track];
          let endTrack = track;
          if (track === leftTrack) endTrack = rightTrack;
          else if (track === rightTrack) endTrack = leftTrack;
          const start = { x: trackCoordinate(track, rank), y: y0 };
          const curve = {
            c1: { x: start.x, y: mid },
            c2: { x: trackCoordinate(endTrack, rank), y: mid },
            end: { x: trackCoordinate(endTrack, rank), y: y1 }
          };
          paths[strand].curves.push(curve);
          curveByStrand.set(strand, { start, curve });
        }
        if (crossingStyle === 'braid' || crossingStyle === 'hecke') {
          const overTrack = record.sign === -1 ? rightTrack : leftTrack;
          const overStrand = trackToStrand[overTrack];
          const overCurve = curveByStrand.get(overStrand);
          overlays.push({
            role: crossingStyle,
            from: cubicPoint(overCurve.start, overCurve.curve, 0.37),
            to: cubicPoint(overCurve.start, overCurve.curve, 0.63)
          });
        }
        [trackToStrand[leftTrack], trackToStrand[rightTrack]] = [trackToStrand[rightTrack], trackToStrand[leftTrack]];
      });
    }

    const dimensions = diagramDimensions(rank, word.length, direction, false);
    return {
      kind: crossingStyle === 'hecke' ? 'hecke' : crossingStyle === 'symmetric' ? 'permutation' : 'braid',
      rank,
      direction,
      label: label || `${crossingStyle || 'braid'} diagram on ${rank} strands`,
      width: dimensions.width,
      height: dimensions.height,
      paths: paths.map((path) => orientPath(path, direction)),
      overlays: overlays.map((overlay) => ({
        ...overlay,
        from: orientPoint(overlay.from, direction),
        to: orientPoint(overlay.to, direction)
      }))
    };
  }

  function makePermutationDiagram(values, direction) {
    const rank = values.length;
    const paths = [];
    for (let bottom = 0; bottom < rank; bottom += 1) {
      const top = Math.max(0, Math.min(rank - 1, Number(values[bottom]) - 1));
      const start = { x: trackCoordinate(top, rank), y: 0.08 };
      const end = { x: trackCoordinate(bottom, rank), y: 0.92 };
      paths.push(orientPath({
        role: 'permutation',
        start,
        curves: [{
          c1: { x: start.x, y: 0.42 },
          c2: { x: end.x, y: 0.58 },
          end
        }]
      }, direction));
    }
    const dimensions = diagramDimensions(rank, 1, direction, true);
    return {
      kind: 'permutation',
      rank,
      direction,
      label: `permutation ${values.join(', ')}`,
      width: dimensions.width,
      height: dimensions.height,
      paths,
      overlays: []
    };
  }

  function makeTlDiagram(rank, pairs, direction, label) {
    const paths = (pairs || []).map(([leftValue, rightValue]) => {
      let left = Number(leftValue);
      let right = Number(rightValue);
      if (left > right) [left, right] = [right, left];
      const leftTop = left < rank;
      const rightTop = right < rank;
      let start;
      let end;
      let curve;
      if (leftTop && rightTop) {
        start = { x: trackCoordinate(left, rank), y: 0.08 };
        end = { x: trackCoordinate(right, rank), y: 0.08 };
        const depth = Math.min(0.5, 0.16 + Math.abs(right - left) * 0.045);
        curve = { c1: { x: start.x, y: depth }, c2: { x: end.x, y: depth }, end };
      } else if (!leftTop && !rightTop) {
        start = { x: trackCoordinate(left - rank, rank), y: 0.92 };
        end = { x: trackCoordinate(right - rank, rank), y: 0.92 };
        const depth = Math.max(0.5, 0.84 - Math.abs(right - left) * 0.045);
        curve = { c1: { x: start.x, y: depth }, c2: { x: end.x, y: depth }, end };
      } else {
        const top = leftTop ? left : right;
        const bottom = leftTop ? right - rank : left - rank;
        start = { x: trackCoordinate(top, rank), y: 0.08 };
        end = { x: trackCoordinate(bottom, rank), y: 0.92 };
        curve = { c1: { x: start.x, y: 0.42 }, c2: { x: end.x, y: 0.58 }, end };
      }
      return orientPath({ role: 'tl', start, curves: [curve] }, direction);
    });
    const dimensions = diagramDimensions(rank, 1, direction, true);
    return {
      kind: 'tl',
      rank,
      direction,
      label: label || `Temperley-Lieb matching on ${rank} strands`,
      width: dimensions.width,
      height: dimensions.height,
      paths,
      overlays: []
    };
  }

  function makeTlCompositionDiagram(rank, factors, direction, label) {
    const diagrams = (factors || []).map((factor) => factor?.pairs ? factor : tlGeneratorDiagram(rank, Number(factor)));
    if (!diagrams.length) {
      return makeTlDiagram(rank, tlIdentityDiagram(rank).pairs, direction, label || `identity Temperley-Lieb diagram on ${rank} strands`);
    }
    if (diagrams.some((diagram) => diagram.rank !== rank)) throw new TypeError('TL composition ranks differ.');

    const layers = diagrams.length;
    const nodeKey = (boundary, track) => `${boundary}:${track}`;
    const nodePoint = (boundary, track) => ({
      x: trackCoordinate(track, rank),
      y: layerCoordinate(boundary, layers)
    });
    const edges = [];
    const adjacency = new Map();
    const connect = (a, b, curve) => {
      const edgeIndex = edges.length;
      edges.push({ a, b, curve });
      [a, b].forEach((node) => {
        if (!adjacency.has(node)) adjacency.set(node, []);
        adjacency.get(node).push(edgeIndex);
      });
    };

    diagrams.forEach((diagram, layer) => {
      const y0 = layerCoordinate(layer, layers);
      const y1 = layerCoordinate(layer + 1, layers);
      const span = y1 - y0;
      diagram.pairs.forEach(([leftValue, rightValue]) => {
        let left = Number(leftValue);
        let right = Number(rightValue);
        if (left > right) [left, right] = [right, left];
        const leftTop = left < rank;
        const rightTop = right < rank;
        const leftTrack = leftTop ? left : left - rank;
        const rightTrack = rightTop ? right : right - rank;
        const aBoundary = leftTop ? layer : layer + 1;
        const bBoundary = rightTop ? layer : layer + 1;
        const a = nodeKey(aBoundary, leftTrack);
        const b = nodeKey(bBoundary, rightTrack);
        const start = nodePoint(aBoundary, leftTrack);
        const end = nodePoint(bBoundary, rightTrack);
        let curve;
        if (leftTop && rightTop) {
          const depth = y0 + span * Math.min(0.48, 0.3 + Math.abs(rightTrack - leftTrack) * 0.04);
          curve = { c1: { x: start.x, y: depth }, c2: { x: end.x, y: depth }, end };
        } else if (!leftTop && !rightTop) {
          const depth = y1 - span * Math.min(0.48, 0.3 + Math.abs(rightTrack - leftTrack) * 0.04);
          curve = { c1: { x: start.x, y: depth }, c2: { x: end.x, y: depth }, end };
        } else {
          const mid = (start.y + end.y) / 2;
          curve = { c1: { x: start.x, y: mid }, c2: { x: end.x, y: mid }, end };
        }
        connect(a, b, { start, ...curve });
      });
    });

    const visited = new Set();
    const orientedCurve = (edge, from) => {
      if (edge.a === from) return {
        next: edge.b,
        curve: { c1: edge.curve.c1, c2: edge.curve.c2, end: edge.curve.end }
      };
      return {
        next: edge.a,
        curve: { c1: edge.curve.c2, c2: edge.curve.c1, end: edge.curve.start }
      };
    };
    const trace = (startNode, firstEdge, closed) => {
      const curves = [];
      let node = startNode;
      let edgeIndex = firstEdge;
      do {
        visited.add(edgeIndex);
        const oriented = orientedCurve(edges[edgeIndex], node);
        curves.push(oriented.curve);
        node = oriented.next;
        const nextEdges = (adjacency.get(node) || []).filter((candidate) => !visited.has(candidate));
        edgeIndex = nextEdges.length ? Math.min(...nextEdges) : -1;
      } while (edgeIndex >= 0 && (!closed || node !== startNode));
      return { role: 'tl', closed, start: nodePoint(...startNode.split(':').map(Number)), curves };
    };

    const exteriorNodes = [...adjacency.keys()].filter((key) => {
      const boundary = Number(key.split(':')[0]);
      return boundary === 0 || boundary === layers;
    }).sort((left, right) => {
      const [leftBoundary, leftTrack] = left.split(':').map(Number);
      const [rightBoundary, rightTrack] = right.split(':').map(Number);
      return leftBoundary - rightBoundary || leftTrack - rightTrack;
    });
    const paths = [];
    exteriorNodes.forEach((node) => {
      const first = (adjacency.get(node) || []).find((edgeIndex) => !visited.has(edgeIndex));
      if (first != null) paths.push(trace(node, first, false));
    });
    edges.forEach((edge, edgeIndex) => {
      if (!visited.has(edgeIndex)) paths.push(trace(edge.a, edgeIndex, true));
    });

    const dimensions = diagramDimensions(rank, layers, direction, false);
    return {
      kind: 'tl-composition',
      rank,
      layers,
      direction,
      label: label || `glued Temperley-Lieb composition with ${layers} factors on ${rank} strands`,
      width: dimensions.width,
      height: dimensions.height,
      paths: paths.map((path) => orientPath(path, direction)),
      overlays: []
    };
  }

  function makeLoopDiagram(direction, label) {
    const path = orientPath({
      role: 'tl',
      closed: true,
      start: { x: 0.5, y: 0.12 },
      curves: [
        { c1: { x: 0.78, y: 0.12 }, c2: { x: 0.88, y: 0.3 }, end: { x: 0.88, y: 0.5 } },
        { c1: { x: 0.88, y: 0.7 }, c2: { x: 0.78, y: 0.88 }, end: { x: 0.5, y: 0.88 } },
        { c1: { x: 0.22, y: 0.88 }, c2: { x: 0.12, y: 0.7 }, end: { x: 0.12, y: 0.5 } },
        { c1: { x: 0.12, y: 0.3 }, c2: { x: 0.22, y: 0.12 }, end: { x: 0.5, y: 0.12 } }
      ]
    }, direction);
    return {
      kind: 'loop',
      rank: 0,
      direction,
      label: label || 'isolated Temperley-Lieb loop with no boundary strands',
      width: 62,
      height: 62,
      paths: [path],
      overlays: []
    };
  }

  function makeGridDiagram(rank, row, column, direction, vector) {
    const horizontal = vector && (direction === 'left-right' || direction === 'right-left');
    const dimensions = diagramDimensions(Math.min(rank, 18), 1, direction, true);
    const count = Math.max(1, rank);
    const rows = vector && horizontal ? 1 : count;
    const columns = vector && !horizontal ? 1 : count;
    const cells = [];
    for (let displayRow = 0; displayRow < rows; displayRow += 1) {
      for (let displayColumn = 0; displayColumn < columns; displayColumn += 1) {
        const logicalRow = vector
          ? (horizontal ? displayColumn + 1 : displayRow + 1)
          : displayRow + 1;
        const logicalColumn = vector ? column : displayColumn + 1;
        cells.push({
          x: displayColumn / columns,
          y: displayRow / rows,
          width: 1 / columns,
          height: 1 / rows,
          selected: vector
            ? logicalRow === row
            : logicalRow === row && logicalColumn === column
        });
      }
    }
    return {
      kind: vector ? 'vector-unit' : 'matrix-unit',
      rank,
      row,
      column,
      direction,
      horizontal,
      label: vector ? `basis vector e ${row}` : `matrix unit E ${row} ${column}`,
      width: vector ? (horizontal ? dimensions.width : Math.max(38, dimensions.width * 0.42)) : dimensions.width,
      height: vector ? (horizontal ? Math.max(38, dimensions.height * 0.42) : dimensions.height) : dimensions.height,
      cells,
      paths: [],
      overlays: []
    };
  }

  function makeBurauLinkStateDiagram(rank, cupIndex, direction, label) {
    const count = Number(rank);
    const cup = Number(cupIndex);
    if (!Number.isInteger(count) || count < 2) throw new RangeError('A Burau link state requires at least two strands.');
    if (!Number.isInteger(cup) || cup < 1 || cup >= count) {
      throw new RangeError(`Cup index ${cup} is outside 1,...,${count - 1}.`);
    }
    const leftTrack = cup - 1;
    const rightTrack = cup;
    const paths = [];
    const cupStart = { x: trackCoordinate(leftTrack, count), y: 0.08 };
    const cupEnd = { x: trackCoordinate(rightTrack, count), y: 0.08 };
    paths.push(orientPath({
      role: 'link-state',
      start: cupStart,
      curves: [{
        c1: { x: cupStart.x, y: 0.43 },
        c2: { x: cupEnd.x, y: 0.43 },
        end: cupEnd
      }]
    }, direction));
    for (let track = 0; track < count; track += 1) {
      if (track === leftTrack || track === rightTrack) continue;
      const x = trackCoordinate(track, count);
      paths.push(orientPath({
        role: 'link-state',
        endOnPlatform: true,
        start: { x, y: 0.08 },
        curves: [{
          c1: { x, y: 0.34 },
          c2: { x, y: 0.58 },
          end: { x, y: 0.76 }
        }]
      }, direction));
    }
    const platforms = [orientPolygon({
      role: 'platform',
      points: [
        { x: 0.06, y: 0.76 },
        { x: 0.94, y: 0.76 },
        { x: 0.94, y: 0.92 },
        { x: 0.06, y: 0.92 }
      ]
    }, direction)];
    const dimensions = diagramDimensions(count, 1, direction, true);
    return {
      kind: 'burau-link-state',
      rank: count,
      cupIndex: cup,
      direction,
      label: label || `Burau link state L ${cup}: cup at positions ${cup} and ${cup + 1}, with ${count - 2} strands ending on the platform`,
      width: dimensions.width,
      height: dimensions.height,
      paths,
      platforms,
      overlays: []
    };
  }

  function pathToSvgData(path) {
    const scale = (value) => Number((value * 100).toFixed(3));
    const pieces = [`M ${scale(path.start.x)} ${scale(path.start.y)}`];
    (path.curves || []).forEach((curve) => {
      pieces.push(`C ${scale(curve.c1.x)} ${scale(curve.c1.y)} ${scale(curve.c2.x)} ${scale(curve.c2.y)} ${scale(curve.end.x)} ${scale(curve.end.y)}`);
    });
    return pieces.join(' ');
  }

  function warning(context, code, message) {
    if (!context.warningCodes.has(code)) {
      context.warningCodes.add(code);
      context.warnings.push(message);
    }
  }

  function claimDiagram(context, rank, compositionLength) {
    if (rank > context.options.limits.rank) {
      warning(context, 'rank', `Diagrammatic display is limited to rank ${context.options.limits.rank}; larger operands remain symbolic.`);
      return false;
    }
    if (compositionLength > context.options.limits.compositionLength) {
      warning(context, 'composition', `Diagrammatic compositions are limited to ${context.options.limits.compositionLength} generators; longer operands remain symbolic.`);
      return false;
    }
    if (context.remainingAtoms <= 0) {
      warning(context, 'atoms', `Only the first ${context.options.limits.atoms} diagram atoms are rendered; remaining terms stay symbolic.`);
      return false;
    }
    context.remainingAtoms -= 1;
    return true;
  }

  function symbolicOperand(latex) {
    return { kind: 'symbolic', latex: latex || '0' };
  }

  function singleDiagramOperand(diagram, latex, badgeLatex) {
    return diagram
      ? { kind: 'diagram', diagram, latex: latex || '', badgeLatex: badgeLatex || '' }
      : symbolicOperand(latex);
  }

  function atomDiagram(context, atom) {
    const rank = context.rank;
    if (!atom) return null;
    if (atom.kind === 'identity') {
      if (!claimDiagram(context, rank, 0)) return null;
      return makeBraidDiagram(rank, [], context.options.direction, atom.tone || 'symmetric', 'identity diagram');
    }
    if (atom.kind === 'hecke-generator') {
      if (!claimDiagram(context, rank, 1)) return null;
      return makeBraidDiagram(rank, [{ family: 'hecke', index: atom.index, sign: 1 }], context.options.direction, 'hecke', `Hecke generator H ${atom.index}`);
    }
    if (atom.kind === 'tl-generator') {
      if (!claimDiagram(context, rank, 1)) return null;
      const basis = tlGeneratorDiagram(rank, atom.index);
      return makeTlDiagram(rank, basis.pairs, context.options.direction, `Temperley-Lieb generator e ${atom.index}`);
    }
    return null;
  }

  function factorTerm(context, coefficient, atom, index, coefficientLatex) {
    const diagram = atomDiagram(context, atom);
    const basisLatex = atom.kind === 'identity'
      ? '1'
      : atom.kind === 'hecke-generator'
        ? `H_{${atom.index}}`
        : `e_{${atom.index}}`;
    const parts = termParts(coefficient, index);
    if (coefficientLatex) parts.coefficientLatex = coefficientLatex;
    return {
      coefficient: coefficient.toJSON(),
      diagram,
      basisLatex,
      symbolicLatex: polynomialTimesBasisLatex(coefficient, basisLatex),
      parts
    };
  }

  function mappedFactorSpecs(record, sourceFamily, target) {
    const index = record.index;
    const one = LaurentPolynomial.one();
    const minusOne = LaurentPolynomial.monomial(0, -1n);
    const v = LaurentPolynomial.monomial(1, 1n);
    const vInverse = LaurentPolynomial.monomial(-1, 1n);
    if (target === 'hecke') {
      if (sourceFamily === 'braid' && record.sign === 1) return [{ coefficient: v, atom: { kind: 'hecke-generator', index } }];
      if (sourceFamily === 'braid') return [
        { coefficient: vInverse, atom: { kind: 'hecke-generator', index } },
        { coefficient: one.sub(LaurentPolynomial.monomial(-2, 1n)), atom: { kind: 'identity', tone: 'hecke' } }
      ];
      if (sourceFamily === 'kl') return [
        { coefficient: one, atom: { kind: 'hecke-generator', index } },
        { coefficient: v, atom: { kind: 'identity', tone: 'hecke' } }
      ];
      if (sourceFamily === 'hecke' && record.sign === -1) return [
        { coefficient: one, atom: { kind: 'hecke-generator', index } },
        { coefficient: v.sub(vInverse), atom: { kind: 'identity', tone: 'hecke' } }
      ];
      return [{ coefficient: one, atom: { kind: 'hecke-generator', index } }];
    }
    if (target === 'tl') {
      if (sourceFamily === 'braid') return [
        { coefficient: one, atom: { kind: 'identity', tone: 'tl' } },
        { coefficient: (record.sign === -1 ? vInverse : v).neg(), atom: { kind: 'tl-generator', index } }
      ];
      if (sourceFamily === 'kl') return [
        { coefficient: DELTA, atom: { kind: 'identity', tone: 'tl' } },
        { coefficient: minusOne, atom: { kind: 'tl-generator', index } }
      ];
      if (sourceFamily === 'hecke') return [
        { coefficient: record.sign === -1 ? v : vInverse, atom: { kind: 'identity', tone: 'tl' } },
        { coefficient: minusOne, atom: { kind: 'tl-generator', index } }
      ];
      return [{ coefficient: one, atom: { kind: 'tl-generator', index } }];
    }
    return [];
  }

  function buildFactorProduct(context, records, sourceFamily, target, fallbackLatex) {
    if (records.length > context.options.limits.compositionLength || context.rank > context.options.limits.rank) {
      claimDiagram(context, context.rank, records.length);
      return symbolicOperand(fallbackLatex);
    }
    if (!records.length) {
      const diagram = atomDiagram(context, { kind: 'identity', tone: target });
      return singleDiagramOperand(diagram, fallbackLatex);
    }
    const factors = records.map((record) => {
      const specs = mappedFactorSpecs(record, sourceFamily, target);
      return {
        kind: 'linear-combination',
        compact: true,
        terms: specs.map((spec, index) => factorTerm(context, spec.coefficient, spec.atom, index)),
        latex: target === 'hecke' || target === 'tl'
          ? math.mappedWordLatex([record], sourceFamily, target)
          : math.sourceWordLatex([record])
      };
    });
    return { kind: 'factor-product', factors, latex: fallbackLatex };
  }

  function tlWordOperand(context, records, fallbackLatex) {
    if (!claimDiagram(context, context.rank, records.length)) return symbolicOperand(fallbackLatex);
    try {
      const budget = new OperationBudget({ operations: 500000, terms: 5000, timeoutMs: 1500 });
      let diagram = tlIdentityDiagram(context.rank);
      let loops = 0;
      records.forEach((record) => {
        const product = stackTlDiagrams(diagram, tlGeneratorDiagram(context.rank, record.index), budget);
        diagram = product.diagram;
        loops += product.loops;
      });
      const coefficient = loops ? DELTA.pow(loops, budget) : LaurentPolynomial.one();
      return {
        kind: 'linear-combination',
        terms: [{
          coefficient: coefficient.toJSON(),
          diagram: makeTlDiagram(context.rank, diagram.pairs, context.options.direction, 'composed Temperley-Lieb word'),
          basisLatex: basisSymbolLatex(diagram, 'diagram'),
          symbolicLatex: polynomialTimesBasisLatex(coefficient, basisSymbolLatex(diagram, 'diagram')),
          parts: termParts(coefficient, 0)
        }],
        latex: fallbackLatex
      };
    } catch (_) {
      warning(context, 'tl-word', 'A Temperley-Lieb composition could not be diagrammed within the display budget.');
      return symbolicOperand(fallbackLatex);
    }
  }

  function wordOperand(context, semantic, fallbackLatex) {
    const records = copyRecords(semantic.records);
    const family = semantic.family;
    if (family === 'hecke' || family === 'kl') return buildFactorProduct(context, records, family, 'hecke', fallbackLatex);
    if (family === 'tl') return tlWordOperand(context, records, fallbackLatex);
    if (!claimDiagram(context, context.rank, records.length)) return symbolicOperand(fallbackLatex);
    const crossingStyle = family === 'braid' ? 'braid' : 'symmetric';
    return singleDiagramOperand(
      makeBraidDiagram(context.rank, records, context.options.direction, crossingStyle, `${family || 'identity'} word`),
      fallbackLatex
    );
  }

  function mappedProductOperand(context, semantic, fallbackLatex) {
    const records = copyRecords(semantic.records);
    const sourceFamily = semantic.sourceFamily;
    const target = semantic.target;
    if (target === 'hecke' || target === 'tl') return buildFactorProduct(context, records, sourceFamily, target, fallbackLatex);
    if (target === 'symmetric') {
      if (!claimDiagram(context, context.rank, records.length)) return symbolicOperand(fallbackLatex);
      return singleDiagramOperand(
        makeBraidDiagram(context.rank, records, context.options.direction, 'symmetric', 'symmetric-group wiring'),
        fallbackLatex
      );
    }
    if (target === 'braid') {
      if (!claimDiagram(context, context.rank, records.length)) return symbolicOperand(fallbackLatex);
      return singleDiagramOperand(
        makeBraidDiagram(context.rank, records, context.options.direction, 'braid', 'freely reduced braid word'),
        fallbackLatex
      );
    }
    if (target === 'burau') {
      const content = sourceFamily === 'braid'
        ? wordOperand(context, { kind: 'word', family: 'braid', records }, fallbackLatex)
        : buildFactorProduct(context, records, sourceFamily, 'tl', fallbackLatex);
      return { kind: 'representation', badgeLatex: sourceFamily === 'braid' ? '\\rho' : '\\pi', content, latex: fallbackLatex };
    }
    return symbolicOperand(fallbackLatex);
  }

  function basisDiagram(context, basis, basisType) {
    if (basisType === 'permutation' || math.SYMMETRIC_PRESENTATIONS?.includes(basisType)) {
      if (!claimDiagram(context, context.rank, 0)) return null;
      return makePermutationDiagram(basis.values || identityPermutation(context.rank), context.options.direction);
    }
    if (basisType === 'standard' || basisType === 'hecke-standard') {
      const word = reducedWord(basis.values || identityPermutation(context.rank));
      if (!claimDiagram(context, context.rank, word.length)) return null;
      return makeBraidDiagram(
        context.rank,
        word.map((index) => ({ family: 'hecke', index, sign: 1 })),
        context.options.direction,
        'hecke',
        `standard Hecke basis diagram ${basis.values.join(', ')}`
      );
    }
    if (basisType === 'diagram' || basisType === 'tl-diagram') {
      if (!claimDiagram(context, context.rank, 0)) return null;
      return makeTlDiagram(context.rank, basis.pairs || [], context.options.direction, 'canonical Temperley-Lieb basis diagram');
    }
    if (basisType === 'matrix-unit' || basisType === 'burau-matrix-unit') {
      if (!claimDiagram(context, context.rank, 0)) return null;
      return makeGridDiagram(context.rank, basis.row, basis.column, context.options.direction, false);
    }
    if (basisType === 'vector' || basisType === 'burau-vector') {
      if (!claimDiagram(context, context.rank, 0)) return null;
      return makeGridDiagram(context.rank, basis.row, basis.column, context.options.direction, true);
    }
    if (basisType === 'link-state' || basisType === 'burau-link-state') {
      if (!claimDiagram(context, context.rank, 0)) return null;
      return makeBurauLinkStateDiagram(
        context.rank,
        basis.row || basis.cupIndex,
        context.options.direction
      );
    }
    if (basisType === 'braid-word') {
      const word = copyRecords(basis.word);
      if (!claimDiagram(context, context.rank, word.length)) return null;
      return makeBraidDiagram(context.rank, word, context.options.direction, 'braid', 'freely reduced braid word');
    }
    return null;
  }

  function diagramTerm(context, term, basisType, index) {
    const coefficient = term.coefficient instanceof LaurentPolynomial
      ? term.coefficient
      : polynomialFromJSON(term.coefficient);
    const basisLatex = basisSymbolLatex(term.basis, basisType);
    return {
      coefficient: coefficient.toJSON(),
      diagram: basisDiagram(context, term.basis, basisType),
      basisLatex,
      symbolicLatex: polynomialTimesBasisLatex(coefficient, basisLatex),
      parts: termParts(coefficient, index)
    };
  }

  function vectorOperand(context, combination, fallbackLatex, requestedBasisType) {
    const linkState = requestedBasisType === 'link-state' || combination.basisType === 'burau-link-state';
    const diagramBasis = linkState ? 'link-state' : 'vector';
    const columns = new Map();
    combination.terms.forEach((term) => {
      const column = term.basis.column;
      if (!columns.has(column)) columns.set(column, []);
      columns.get(column).push(term);
    });
    const rows = [...columns].sort(([left], [right]) => left - right).map(([column, terms]) => {
      terms.sort((left, right) => left.basis.row - right.basis.row);
      const inputBasis = { row: column, column };
      return {
        column,
        lhs: {
          rhoLatex: linkState ? '\\bar\\rho(\\beta)' : '\\rho(\\beta)',
          diagram: basisDiagram(context, inputBasis, diagramBasis),
          basisLatex: linkState ? `L_{${column}}` : `e_{${column}}`
        },
        terms: terms.map((term, index) => diagramTerm(context, term, diagramBasis, index))
      };
    });
    return { kind: 'vector-system', rows, latex: fallbackLatex };
  }

  function linearCombinationOperand(context, semantic, fallbackLatex) {
    let combination = combinationFromJSON(semantic.value);
    let basisType = semantic.basis || combination.basisType;
    if (basisType === 'kl' || combination.basisType === 'kl') {
      try {
        const budget = new OperationBudget({ operations: 500000, terms: 12000, timeoutMs: 2000 });
        combination = klToStandard(combination, context.rank, budget);
        basisType = 'standard';
      } catch (_) {
        warning(context, 'kl-expansion', 'The exact KL-to-standard diagram expansion exceeded the display budget and remains symbolic.');
        return symbolicOperand(fallbackLatex);
      }
    }
    if (basisType === 'vector' || basisType === 'link-state' || combination.basisType === 'burau-vector' || combination.basisType === 'burau-link-state') {
      return vectorOperand(context, combination, fallbackLatex, basisType);
    }
    if (combination.basisType === 'braid-word') basisType = 'braid-word';
    const terms = combination.sortedTerms().map((term, index) => diagramTerm(context, term, basisType, index));
    return { kind: 'linear-combination', terms, latex: fallbackLatex };
  }

  function semanticOperand(context, semantic, fallbackLatex) {
    if (!semantic) return symbolicOperand(fallbackLatex);
    if (semantic.kind === 'word') return wordOperand(context, semantic, fallbackLatex);
    if (semantic.kind === 'mapped-product') return mappedProductOperand(context, semantic, fallbackLatex);
    if (semantic.kind === 'linear-combination') return linearCombinationOperand(context, semantic, fallbackLatex);
    return symbolicOperand(fallbackLatex);
  }

  function createDiagramContext(calculation, normalized) {
    return {
      calculation,
      rank: positiveInteger(calculation.metadata?.rank, 1),
      options: normalized,
      remainingAtoms: normalized.limits.atoms,
      warnings: [],
      warningCodes: new Set()
    };
  }

  function diagramModel(context, rows, extra) {
    return {
      rows,
      warnings: context.warnings.slice(),
      limits: { ...context.options.limits },
      direction: context.options.direction,
      scope: context.options.scope,
      diagramAtoms: context.options.limits.atoms - context.remainingAtoms,
      ...(extra || {})
    };
  }

  function buildDiagrammaticTraceRows(context) {
    const normalized = context.options;
    return context.calculation.trace.map((step) => {
      const diagramThisRow = normalized.scope === 'all' || !!step.final;
      return {
        relationId: step.relationId,
        annotationLatex: step.annotationLatex || '',
        final: !!step.final,
        lhs: step.lhsLatex
          ? diagramThisRow
            ? semanticOperand(context, step.semantic?.lhs, step.lhsLatex)
            : symbolicOperand(step.lhsLatex)
          : null,
        rhs: diagramThisRow
          ? semanticOperand(context, step.semantic?.rhs, step.rhsLatex)
          : symbolicOperand(step.rhsLatex)
      };
    });
  }

  function minimalRankForIndices(indices, minimum) {
    const largest = (indices || []).reduce((value, index) => Math.max(value, Number(index) || 0), 0);
    return Math.max(Number(minimum) || 0, largest ? largest + 1 : 0);
  }

  const RELATION_REFERENCE = Object.freeze({
    identity: { label: 'Identity interpretation', rank: 1, formulas: ['1'] },
    'coxeter-multiplication': { label: 'Coxeter involution relation', rank: 2, formulas: ['s_i^2=1'] },
    'coxeter-braid': { label: 'Adjacent Coxeter braid relation', rank: 3, formulas: ['s_is_{i+1}s_i=s_{i+1}s_is_{i+1}'] },
    'coxeter-commutation': { label: 'Distant Coxeter commutation relation', rank: 4, formulas: ['s_is_j=s_js_i\\quad(|i-j|>1)'] },
    'braid-free-cancellation': { label: 'Braid inverse relations', rank: 2, formulas: ['\\sigma_i\\sigma_i^{-1}=1', '\\sigma_i^{-1}\\sigma_i=1'] },
    'braid-relation': { label: 'Adjacent braid relation', rank: 3, formulas: ['\\sigma_i\\sigma_{i+1}\\sigma_i=\\sigma_{i+1}\\sigma_i\\sigma_{i+1}'] },
    'braid-commutation': { label: 'Distant braid commutation relation', rank: 4, formulas: ['\\sigma_i\\sigma_j=\\sigma_j\\sigma_i\\quad(|i-j|>1)'] },
    'hecke-multiplication': { label: 'Hecke quadratic relation', rank: 2, formulas: ['H_i^2=1+(v^{-1}-v)H_i'] },
    'hecke-braid': { label: 'Adjacent Hecke braid relation', rank: 3, formulas: ['H_iH_{i+1}H_i=H_{i+1}H_iH_{i+1}'] },
    'hecke-commutation': { label: 'Distant Hecke commutation relation', rank: 4, formulas: ['H_iH_j=H_jH_i\\quad(|i-j|>1)'] },
    'hecke-inverse': { label: 'Inverse Hecke generator expansion', rank: 2, formulas: ['H_i^{-1}=H_i+v-v^{-1}'] },
    'hecke-length-increase': { label: 'Hecke multiplication with increasing Coxeter length', rank: 2, formulas: ['H_wH_i=H_{ws_i}\\quad(\\ell(ws_i)>\\ell(w))'] },
    'hecke-length-decrease': { label: 'Hecke multiplication with decreasing Coxeter length', rank: 2, formulas: ['H_wH_i=H_{ws_i}+(v^{-1}-v)H_w\\quad(\\ell(ws_i)<\\ell(w))'] },
    'tl-quadratic': { label: 'Temperley-Lieb quadratic relation', rank: 2, formulas: ['e_i^2=\\delta e_i'] },
    'tl-adjacent': { label: 'Adjacent Temperley-Lieb triple relations', rank: 3, formulas: ['e_ie_{i+1}e_i=e_i', 'e_{i+1}e_ie_{i+1}=e_{i+1}'] },
    'tl-commutation': { label: 'Distant Temperley-Lieb commutation relation', rank: 4, formulas: ['e_ie_j=e_je_i\\quad(|i-j|>1)'] },
    'tl-loop-removal': { label: 'Isolated Temperley-Lieb loop removal', rank: 0, formulas: ['\\bigcirc=\\delta=v+v^{-1}'] },
    'tl-diagram-stacking': {
      label: 'Canonical Temperley-Lieb diagram stacking',
      rank: 3,
      formulas: ['D_P D_Q=\\delta^{k(P,Q)}D_{P\\star Q}'],
      hint: 'Glue the canonical diagrams D_P and D_Q: each of the k(P,Q) closed circles formed in the middle is removed and replaced by delta = v + v^-1, leaving D_(P star Q) on the outer boundary.'
    },
    'burau-generator': { label: 'Unreduced Burau positive generator', rank: 2, formulas: ['\\rho(\\sigma_i)=\\begin{pmatrix}1-v^2&v^2\\\\1&0\\end{pmatrix}'] },
    'burau-inverse-generator': { label: 'Unreduced Burau inverse generator', rank: 2, formulas: ['\\rho(\\sigma_i^{-1})=\\begin{pmatrix}0&1\\\\v^{-2}&1-v^{-2}\\end{pmatrix}'] },
    'burau-inverse-check': { label: 'Burau inverse verification', rank: 2, formulas: ['\\rho(\\sigma_i\\sigma_i^{-1})=I', '\\rho(\\sigma_i^{-1}\\sigma_i)=I'] },
    'burau-braid-check': { label: 'Burau braid-relation verification', rank: 3, formulas: ['\\rho(\\sigma_i\\sigma_{i+1}\\sigma_i)=\\rho(\\sigma_{i+1}\\sigma_i\\sigma_{i+1})'] },
    'burau-commutation-check': { label: 'Burau distant-commutation verification', rank: 4, formulas: ['\\rho(\\sigma_i\\sigma_j)=\\rho(\\sigma_j\\sigma_i)\\quad(|i-j|>1)'] },
    'link-state-action': { label: 'Temperley-Lieb action on the link-state basis', rank: 4, formulas: ['\\pi(e_i)L_j=\\begin{cases}\\delta L_i,&j=i,\\\\L_i,&|i-j|=1,\\\\0,&|i-j|>1.\\end{cases}'] },
    'reduced-burau-generator': { label: 'Reduced Burau positive generator on link states', rank: 2, formulas: ['\\bar\\rho(\\sigma_i)=I-v\\pi(e_i)'] },
    'reduced-burau-inverse-generator': { label: 'Reduced Burau inverse generator on link states', rank: 2, formulas: ['\\bar\\rho(\\sigma_i^{-1})=I-v^{-1}\\pi(e_i)'] },
    'reduced-burau-inverse-check': { label: 'Reduced Burau inverse verification', rank: 2, formulas: ['\\bar\\rho(\\sigma_i\\sigma_i^{-1})=I', '\\bar\\rho(\\sigma_i^{-1}\\sigma_i)=I'] },
    'reduced-burau-braid-check': { label: 'Reduced Burau braid-relation verification', rank: 3, formulas: ['\\bar\\rho(\\sigma_i\\sigma_{i+1}\\sigma_i)=\\bar\\rho(\\sigma_{i+1}\\sigma_i\\sigma_{i+1})'] },
    'reduced-burau-commutation-check': { label: 'Reduced Burau distant-commutation verification', rank: 4, formulas: ['\\bar\\rho(\\sigma_i\\sigma_j)=\\bar\\rho(\\sigma_j\\sigma_i)\\quad(|i-j|>1)'] },
    'braid-to-burau': { label: 'Braid generators interpreted by the Burau representation', rank: 2, formulas: ['\\sigma_i\\mapsto\\rho(\\sigma_i)', '\\sigma_i^{-1}\\mapsto\\rho(\\sigma_i^{-1})'] },
    'braid-to-symmetric': { label: 'Braid generator interpreted as a transposition', rank: 2, formulas: ['\\sigma_i\\mapsto s_i'] },
    'braid-to-hecke': { label: 'Positive braid generator interpreted in Hecke', rank: 2, formulas: ['\\sigma_i=vH_i'] },
    'braid-inverse-to-hecke': { label: 'Inverse braid generator interpreted in Hecke', rank: 2, formulas: ['\\sigma_i^{-1}=v^{-1}H_i+1-v^{-2}'] },
    'kl-generator-expansion': { label: 'KL generator in the standard Hecke basis', rank: 2, formulas: ['b_i=H_i+v'] },
    'braid-to-tl': { label: 'Braid generators interpreted in Temperley-Lieb', rank: 2, formulas: ['\\sigma_i=1-ve_i', '\\sigma_i^{-1}=1-v^{-1}e_i'] },
    'braid-inverse-to-tl': { label: 'Inverse braid generator interpreted in Temperley-Lieb', rank: 2, formulas: ['\\sigma_i^{-1}=1-v^{-1}e_i'] },
    'hecke-to-tl': { label: 'Hecke generators interpreted in Temperley-Lieb', rank: 2, formulas: ['H_i=v^{-1}-e_i', 'H_i^{-1}=v-e_i'] },
    'kl-through-hecke-to-tl': { label: 'KL generator interpreted in Temperley-Lieb', rank: 2, formulas: ['b_i=\\delta-e_i'] },
    'tl-to-burau': { label: 'Temperley-Lieb generator action in Burau', rank: 2, formulas: ['\\pi(e_i)=v^{-1}(I-\\rho(\\sigma_i))'] },
    'braid-to-reduced-burau': { label: 'Braid generators acting on Burau link states', rank: 2, formulas: ['\\sigma_i\\mapsto I-v\\pi(e_i)', '\\sigma_i^{-1}\\mapsto I-v^{-1}\\pi(e_i)'] },
    'tl-to-reduced-burau': { label: 'Temperley-Lieb generator action on Burau link states', rank: 2, formulas: ['\\pi(e_i)L_j=\\delta L_i\\ (j=i),\\quad L_i\\ (|i-j|=1),\\quad0\\ (|i-j|>1)'] },
    'hecke-to-burau': { label: 'Hecke generator action in Burau', rank: 2, formulas: ['\\pi(H_i)=v^{-1}I-\\pi(e_i)', '\\pi(H_i^{-1})=vI-\\pi(e_i)'] },
    'hecke-to-reduced-burau': { label: 'Hecke generator action on Burau link states', rank: 2, formulas: ['\\bar\\pi(H_i)=v^{-1}I-\\pi(e_i)', '\\bar\\pi(H_i^{-1})=vI-\\pi(e_i)'] },
    'kl-to-burau': { label: 'KL generator action in Burau', rank: 2, formulas: ['\\pi(b_i)=\\delta I-\\pi(e_i)'] },
    'kl-to-reduced-burau': { label: 'KL generator action on Burau link states', rank: 2, formulas: ['\\bar\\pi(b_i)=\\delta I-\\pi(e_i)'] },
    'permutation-basis': { label: 'Permutation basis convention', rank: 2, formulas: ['\\{[w]:w\\in S_n\\}'] },
    'permutation-composition': { label: 'Deterministic reduced composition-word convention', rank: 2, formulas: ['w=s_{i_1}\\cdots s_{i_{\\ell}}\\quad(\\ell\\text{ minimal})'] },
    'permutation-transpositions': { label: 'Adjacent-transposition expression convention', rank: 2, formulas: ['w=(i_1\\ i_1{+}1)\\cdots(i_{\\ell}\\ i_{\\ell}{+}1)'] },
    'permutation-cycle': { label: 'Disjoint-cycle notation convention', rank: 2, formulas: ['w=(a_1\\cdots a_r)(b_1\\cdots b_s)\\cdots'] },
    'permutation-one-line': { label: 'One-line notation convention', rank: 2, formulas: ['w=(w(1),\\ldots,w(n))'] },
    'permutation-two-line': { label: 'Two-line notation convention', rank: 2, formulas: ['w=\\begin{pmatrix}1&\\cdots&n\\\\w(1)&\\cdots&w(n)\\end{pmatrix}'] },
    'permutation-matrix': { label: 'Permutation-matrix convention', rank: 2, formulas: ['(P_w)_{ij}=\\mathbf{1}_{\\{i=w(j)\\}}'] },
    'braid-word-result': { label: 'Freely reduced braid-word convention', rank: 2, formulas: ['\\text{adjacent inverse cancellation; noncanonical}'] },
    'standard-basis-expansion': { label: 'Standard Hecke basis convention', rank: 2, formulas: ['\\{H_w:w\\in S_n\\}'] },
    'kl-basis-change': { label: 'KL canonical basis convention', rank: 2, formulas: ['\\{\\underline H_w:w\\in S_n\\}'] },
    'tl-diagram-basis': { label: 'Canonical Temperley-Lieb diagram basis', rank: 2, formulas: ['\\{D_{\\{\\mathrm{pairing}\\}}\\}'] },
    'matrix-unit-basis': { label: 'Matrix-unit output basis', rank: 2, formulas: ['\\{E_{ij}\\}'] },
    'vector-basis': { label: 'Column-wise vector output basis', rank: 2, formulas: ['\\rho(\\beta)e_j=\\sum_i a_{ij}e_i'] },
    'link-state-basis': { label: 'Burau link-state basis', rank: 2, formulas: ['W_{n,n-2}=\\bigoplus_{j=1}^{n-1}\\mathbb Z[v,v^{-1}]L_j'] }
  });

  const TARGET_RELATION_CATALOGS = Object.freeze({
    symmetric: {
      defining: ['coxeter-multiplication', 'coxeter-braid', 'coxeter-commutation'],
      consequences: []
    },
    braid: {
      defining: ['braid-free-cancellation', 'braid-relation', 'braid-commutation'],
      consequences: []
    },
    hecke: {
      defining: ['hecke-multiplication', 'hecke-braid', 'hecke-commutation'],
      consequences: ['hecke-inverse', 'hecke-length-increase', 'hecke-length-decrease']
    },
    tl: {
      defining: ['tl-quadratic', 'tl-adjacent', 'tl-commutation', 'tl-loop-removal'],
      consequences: ['tl-diagram-stacking']
    },
    burau: {
      defining: ['link-state-action', 'reduced-burau-generator', 'reduced-burau-inverse-generator'],
      consequences: ['reduced-burau-inverse-check', 'reduced-burau-braid-check', 'reduced-burau-commutation-check']
    }
  });
  const UNREDUCED_BURAU_RELATION_CATALOG = Object.freeze({
    defining: ['burau-generator', 'burau-inverse-generator'],
    consequences: ['burau-inverse-check', 'burau-braid-check', 'burau-commutation-check']
  });

  function withRelationRank(context, rank, callback) {
    const previous = context.rank;
    context.rank = rank;
    try {
      return callback();
    } finally {
      context.rank = previous;
    }
  }

  function relationDiagramOperand(context, rank, compositionLength, fallbackLatex, factory) {
    if (!claimDiagram(context, rank, compositionLength)) return symbolicOperand(fallbackLatex);
    return singleDiagramOperand(factory(), fallbackLatex);
  }

  function relationIdentityOperand(context, rank, tone, label) {
    return relationDiagramOperand(context, rank, 0, '1', () => makeBraidDiagram(
      rank,
      [],
      context.options.direction,
      tone || 'symmetric',
      label || `identity on ${rank} strand${rank === 1 ? '' : 's'}`
    ));
  }

  function relationCrossingOperand(context, rank, sign, style, label, fallbackLatex) {
    return relationDiagramOperand(context, rank, 1, fallbackLatex, () => makeBraidDiagram(
      rank,
      [{ family: style === 'hecke' ? 'hecke' : style === 'braid' ? 'braid' : 'coxeter', index: 1, sign }],
      context.options.direction,
      style,
      label
    ));
  }

  function relationTlOperand(context, rank, label) {
    return relationDiagramOperand(context, rank, 1, 'e_{1}', () => {
      const basis = tlGeneratorDiagram(rank, 1);
      return makeTlDiagram(rank, basis.pairs, context.options.direction, label || 'Temperley-Lieb generator e 1 on two strands');
    });
  }

  function relationLoopOperand(context) {
    return relationDiagramOperand(context, 0, 0, '\\bigcirc', () => makeLoopDiagram(
      context.options.direction,
      'isolated Temperley-Lieb loop with no boundary strands'
    ));
  }

  function relationGridOperand(context, rank, row, column, vector, label) {
    const fallback = vector ? `e_{${row}}` : `E_{${row}${column}}`;
    return relationDiagramOperand(context, rank, 0, fallback, () => {
      const diagram = makeGridDiagram(rank, row, column, context.options.direction, vector);
      diagram.label = label || diagram.label;
      return diagram;
    });
  }

  function relationLinkStateOperand(context, rank, cupIndex, label) {
    return relationDiagramOperand(context, rank, 0, `L_{${cupIndex}}`, () => makeBurauLinkStateDiagram(
      rank,
      cupIndex,
      context.options.direction,
      label
    ));
  }

  function relationLinkStateMatrixOperand(context, rank, matrix, fallbackLatex) {
    return withRelationRank(context, rank, () => vectorOperand(
      context,
      matrixToLinearCombination(matrix, 'link-state'),
      fallbackLatex,
      'link-state'
    ));
  }

  function relationLinkStateLinearOperand(context, rank, specs, fallbackLatex) {
    return withRelationRank(context, rank, () => ({
      kind: 'linear-combination',
      terms: (specs || []).map((spec, index) => diagramTerm(context, {
        basis: { key: String(spec.cupIndex), row: spec.cupIndex, cupIndex: spec.cupIndex },
        coefficient: spec.coefficient
      }, 'link-state', index)),
      latex: fallbackLatex
    }));
  }

  function relationLinearOperand(context, rank, specs, fallbackLatex) {
    return withRelationRank(context, rank, () => ({
      kind: 'linear-combination',
      terms: specs.map((spec, index) => factorTerm(context, spec.coefficient, spec.atom, index, spec.coefficientLatex)),
      latex: fallbackLatex
    }));
  }

  function relationMatrixOperand(context, rank, matrix, fallbackLatex) {
    return withRelationRank(context, rank, () => {
      const combination = matrixToLinearCombination(matrix, 'matrix-unit');
      return {
        kind: 'linear-combination',
        terms: combination.sortedTerms().map((term, index) => diagramTerm(context, term, 'matrix-unit', index)),
        latex: fallbackLatex
      };
    });
  }

  function relationProduct(operands, fallbackLatex) {
    return { kind: 'factor-product', factors: operands, latex: fallbackLatex || '' };
  }

  function relationEquation(lhs, operator, rhs) {
    return { lhs: lhs || null, operator: operator || '', rhs };
  }

  function buildMinimalRelationRow(context, relationId) {
    const one = LaurentPolynomial.one();
    const minusOne = LaurentPolynomial.monomial(0, -1n);
    const v = LaurentPolynomial.monomial(1, 1n);
    const vInverse = LaurentPolynomial.monomial(-1, 1n);
    const vInverseSquared = LaurentPolynomial.monomial(-2, 1n);
    const rank = minimalRankForIndices([1], 2);
    const I = (tone, label) => relationIdentityOperand(context, rank, tone, label);
    const B = (sign, label) => relationCrossingOperand(context, rank, sign, 'braid', label, sign === -1 ? '\\sigma_1^{-1}' : '\\sigma_1');
    const S = (label) => relationCrossingOperand(context, rank, 1, 'symmetric', label, 's_1');
    const H = (sign, label) => relationCrossingOperand(context, rank, sign, 'hecke', label, sign === -1 ? 'H_1^{-1}' : 'H_1');
    const E = (label) => relationTlOperand(context, rank, label);
    const heckeExpansion = () => relationLinearOperand(context, rank, [
      { coefficient: one, atom: { kind: 'hecke-generator', index: 1 } },
      { coefficient: v, atom: { kind: 'identity', tone: 'hecke' } }
    ], 'H_1+v');
    const tlPositiveExpansion = () => relationLinearOperand(context, rank, [
      { coefficient: one, atom: { kind: 'identity', tone: 'tl' } },
      { coefficient: v.neg(), atom: { kind: 'tl-generator', index: 1 } }
    ], '1-ve_1');
    const tlInverseExpansion = () => relationLinearOperand(context, rank, [
      { coefficient: one, atom: { kind: 'identity', tone: 'tl' } },
      { coefficient: vInverse.neg(), atom: { kind: 'tl-generator', index: 1 } }
    ], '1-v^{-1}e_1');
    const row = (label, equations, rowRank = rank) => ({ relationId, label, rank: rowRank, equations });

    switch (relationId) {
      case 'identity':
        return row('Identity on one strand', [relationEquation(null, '', relationIdentityOperand(context, 1, 'symmetric', 'identity on one strand'))], 1);
      case 'coxeter-multiplication':
        return row('Coxeter multiplication, minimal example s 1 squared equals the identity', [
          relationEquation(relationProduct([S('first Coxeter generator s 1'), S('second Coxeter generator s 1')], 's_1s_1'), '=', I('symmetric', 'identity permutation on two strands'))
        ]);
      case 'braid-to-symmetric':
        return row('Forget the overcrossing of braid generator sigma 1 on two strands', [
          relationEquation(B(1, 'positive braid generator sigma 1'), '\\mapsto', S('symmetric-group transposition s 1'))
        ]);
      case 'braid-free-cancellation':
        return row('Positive and inverse braid generators cancel on two strands', [
          relationEquation(relationProduct([B(1, 'positive braid generator sigma 1'), B(-1, 'inverse braid generator sigma 1')], '\\sigma_1\\sigma_1^{-1}'), '=', I('braid', 'identity braid on two strands'))
        ]);
      case 'braid-to-hecke':
        return row('Positive braid generator mapped to the Hecke algebra at i equals 1', [
          relationEquation(B(1, 'positive braid generator sigma 1'), '=', relationLinearOperand(context, rank, [
            { coefficient: v, atom: { kind: 'hecke-generator', index: 1 } }
          ], 'vH_1'))
        ]);
      case 'braid-inverse-to-hecke':
        return row('Inverse braid generator mapped to the Hecke algebra at i equals 1', [
          relationEquation(B(-1, 'inverse braid generator sigma 1'), '=', relationLinearOperand(context, rank, [
            { coefficient: vInverse, atom: { kind: 'hecke-generator', index: 1 } },
            { coefficient: one.sub(vInverseSquared), atom: { kind: 'identity', tone: 'hecke' } }
          ], 'v^{-1}H_1+1-v^{-2}'))
        ]);
      case 'hecke-inverse':
        return row('Inverse Hecke generator expansion at i equals 1', [
          relationEquation(H(-1, 'inverse Hecke generator H 1'), '=', relationLinearOperand(context, rank, [
            { coefficient: one, atom: { kind: 'hecke-generator', index: 1 } },
            { coefficient: v.sub(vInverse), atom: { kind: 'identity', tone: 'hecke' } }
          ], 'H_1+v-v^{-1}'))
        ]);
      case 'hecke-length-increase':
        return row('Hecke multiplication with increasing Coxeter length, minimal example', [
          relationEquation(relationProduct([I('hecke', 'identity Hecke diagram'), H(1, 'Hecke generator H 1')], 'H_eH_1'), '=', H(1, 'standard Hecke diagram H 1'))
        ]);
      case 'hecke-length-decrease':
      case 'hecke-multiplication':
        return row('Hecke quadratic multiplication on two strands', [
          relationEquation(relationProduct([H(1, 'first Hecke generator H 1'), H(1, 'second Hecke generator H 1')], 'H_1H_1'), '=', relationLinearOperand(context, rank, [
            { coefficient: one, atom: { kind: 'identity', tone: 'hecke' } },
            { coefficient: vInverse.sub(v), atom: { kind: 'hecke-generator', index: 1 } }
          ], '1+(v^{-1}-v)H_1'))
        ]);
      case 'kl-generator-expansion':
      case 'kl-basis-change':
        return row('Exact standard-Hecke expansion of the minimal KL basis generator', [relationEquation(null, '', heckeExpansion())]);
      case 'braid-to-tl':
        return row('Positive and inverse braid generators mapped to Temperley-Lieb diagrams at i equals 1', [
          relationEquation(B(1, 'positive braid generator sigma 1'), '=', tlPositiveExpansion()),
          relationEquation(B(-1, 'inverse braid generator sigma 1'), '=', tlInverseExpansion())
        ]);
      case 'braid-inverse-to-tl':
        return row('Inverse braid generator mapped to Temperley-Lieb diagrams at i equals 1', [
          relationEquation(B(-1, 'inverse braid generator sigma 1'), '=', tlInverseExpansion())
        ]);
      case 'hecke-to-tl':
        return row('Hecke generator mapped to Temperley-Lieb diagrams at i equals 1', [
          relationEquation(H(1, 'Hecke generator H 1'), '=', relationLinearOperand(context, rank, [
            { coefficient: vInverse, atom: { kind: 'identity', tone: 'tl' } },
            { coefficient: minusOne, atom: { kind: 'tl-generator', index: 1 } }
          ], 'v^{-1}-e_1'))
        ]);
      case 'kl-through-hecke-to-tl':
        return row('Minimal KL basis generator mapped through Hecke to Temperley-Lieb diagrams', [
          relationEquation(heckeExpansion(), '\\mapsto', relationLinearOperand(context, rank, [
            { coefficient: DELTA, coefficientLatex: '\\delta', atom: { kind: 'identity', tone: 'tl' } },
            { coefficient: minusOne, atom: { kind: 'tl-generator', index: 1 } }
          ], '\\delta-e_1'))
        ]);
      case 'tl-to-tl':
        return row('Temperley-Lieb stacking on two strands', [
          relationEquation(relationProduct([E('first Temperley-Lieb generator e 1'), E('second Temperley-Lieb generator e 1')], 'e_1e_1'), '=', relationLinearOperand(context, rank, [
            { coefficient: DELTA, coefficientLatex: '\\delta', atom: { kind: 'tl-generator', index: 1 } }
          ], '\\delta e_1'))
        ]);
      case 'tl-diagram-stacking':
        return row('Canonical Temperley-Lieb diagram stacking', [
          relationEquation(null, '', symbolicOperand('D_P D_Q=\\delta^{k(P,Q)}D_{P\\star Q}'))
        ]);
      case 'tl-loop-removal':
        return row('An isolated Temperley-Lieb loop contributes delta', [
          relationEquation(relationLoopOperand(context), '=', symbolicOperand('\\delta'))
        ], 0);
      case 'burau-generator':
        return row('Unreduced Burau image of the positive braid generator sigma 1 on two strands', [
          relationEquation(B(1, 'positive braid generator sigma 1'), '\\mapsto', relationMatrixOperand(context, rank, burauGeneratorMatrix(rank, 1, 1), '\\rho(\\sigma_1)'))
        ]);
      case 'burau-inverse-generator':
        return row('Unreduced Burau image of the inverse braid generator sigma 1 on two strands', [
          relationEquation(B(-1, 'inverse braid generator sigma 1'), '\\mapsto', relationMatrixOperand(context, rank, burauGeneratorMatrix(rank, 1, -1), '\\rho(\\sigma_1^{-1})'))
        ]);
      case 'tl-to-burau':
        return row('Burau matrix-unit image of Temperley-Lieb generator e 1 on two strands', [
          relationEquation(E('Temperley-Lieb generator e 1'), '\\mapsto', relationMatrixOperand(context, rank, tlGeneratorMatrix(rank, 1), '\\pi(e_1)'))
        ]);
      case 'permutation-basis':
      case 'permutation-composition':
      case 'permutation-transpositions':
      case 'permutation-cycle':
      case 'permutation-one-line':
      case 'permutation-two-line':
      case 'permutation-matrix':
        return row('Minimal nontrivial permutation basis diagram', [relationEquation(null, '', S('permutation basis transposition on two strands'))]);
      case 'braid-word-result':
        return row('Minimal freely reduced braid-word representative', [relationEquation(null, '', B(1, 'freely reduced positive braid word on two strands'))]);
      case 'standard-basis-expansion':
        return row('Minimal standard Hecke basis diagram', [relationEquation(null, '', H(1, 'standard Hecke basis diagram on two strands'))]);
      case 'tl-diagram-basis':
        return row('Minimal nontrivial canonical Temperley-Lieb basis diagram', [relationEquation(null, '', E('canonical Temperley-Lieb basis diagram on two strands'))]);
      case 'matrix-unit-basis':
        return row('Minimal nontrivial matrix-unit basis diagram', [relationEquation(null, '', relationGridOperand(context, rank, 1, 2, false, 'matrix unit E 1 2 in a two by two grid'))]);
      case 'vector-basis':
        return row('Minimal nontrivial standard-vector basis diagram', [relationEquation(null, '', relationGridOperand(context, rank, 1, 1, true, 'first standard basis vector in a two-cell strip'))]);
      case 'link-state-basis':
        return row('Minimal Burau link state: one cup and no propagating platform strands', [
          relationEquation(null, '', relationLinkStateOperand(context, rank, 1, 'Burau link state L 1 on two strands'))
        ]);
      default:
        warning(context, 'relation-model', 'Some relation references have no diagrammatic model and remain symbolic.');
        return {
          relationId,
          label: `Symbolic fallback for ${relationId.replace(/-/g, ' ')}`,
          rank: null,
          fallback: true,
          equations: [relationEquation(null, '', symbolicOperand(math.relationLatex(relationId)))]
        };
    }
  }

  function referenceDefinition(relationId) {
    return RELATION_REFERENCE[relationId] || {
      label: 'Symbolic fallback for ' + relationId.replace(/-/g, ' '),
      rank: null,
      formulas: [math.relationLatex(relationId)]
    };
  }

  function referenceRow(relationId, equations, fallback) {
    const definition = referenceDefinition(relationId);
    return {
      relationId,
      label: definition.label,
      hint: definition.hint || '',
      rank: definition.rank,
      fallback: !!fallback,
      equations
    };
  }

  function symbolicReferenceRow(relationId) {
    const definition = referenceDefinition(relationId);
    return referenceRow(
      relationId,
      definition.formulas.map((formula) => relationEquation(null, '', symbolicOperand(formula))),
      !RELATION_REFERENCE[relationId]
    );
  }

  function targetWordOperand(context, rank, style, records, label, fallbackLatex) {
    const family = style === 'hecke' ? 'hecke' : style === 'braid' ? 'braid' : 'coxeter';
    const word = (records || []).map((record) => typeof record === 'number'
      ? { family, index: Math.abs(record), sign: record < 0 ? -1 : 1 }
      : { family, index: record.index, sign: record.sign === -1 ? -1 : 1 });
    return relationDiagramOperand(context, rank, word.length, fallbackLatex, () => makeBraidDiagram(
      rank,
      word,
      context.options.direction,
      style,
      label
    ));
  }

  function targetTlAtomOperand(context, rank, index, label) {
    return relationDiagramOperand(context, rank, 1, 'e_' + index, () => {
      const basis = tlGeneratorDiagram(rank, index);
      return makeTlDiagram(rank, basis.pairs, context.options.direction, label || 'Temperley-Lieb generator e ' + index + ' on ' + rank + ' strands');
    });
  }

  function tlBasisForWord(rank, word) {
    const budget = new OperationBudget({ operations: 100000, terms: 1000, timeoutMs: 750 });
    let diagram = tlIdentityDiagram(rank);
    (word || []).forEach((index) => {
      diagram = stackTlDiagrams(diagram, tlGeneratorDiagram(rank, index), budget).diagram;
    });
    return diagram;
  }

  function targetTlCompositionOperand(context, rank, factorWords, label, fallbackLatex) {
    const compositionLength = (factorWords || []).reduce((total, word) => total + word.length, 0);
    return relationDiagramOperand(context, rank, compositionLength, fallbackLatex, () => makeTlCompositionDiagram(
      rank,
      factorWords.map((word) => tlBasisForWord(rank, word)),
      context.options.direction,
      label
    ));
  }

  function burauWordMatrix(rank, records) {
    const budget = new OperationBudget({ operations: 250000, terms: 5000, timeoutMs: 1000 });
    let matrix = identityMatrix(rank);
    (records || []).forEach((record) => {
      matrix = matrixMultiply(matrix, burauGeneratorMatrix(rank, record.index, record.sign === -1 ? -1 : 1), budget);
    });
    return matrix;
  }

  function reducedBurauWordMatrix(rank, records) {
    const budget = new OperationBudget({ operations: 250000, terms: 5000, timeoutMs: 1000 });
    let matrix = identityMatrix(rank - 1);
    (records || []).forEach((record) => {
      matrix = matrixMultiply(matrix, reducedBurauGeneratorMatrix(rank, record.index, record.sign === -1 ? -1 : 1), budget);
    });
    return matrix;
  }

  function rhoOperand(content, fallbackLatex, reduced) {
    return { kind: 'representation', badgeLatex: reduced ? '\\bar\\rho' : '\\rho', content, latex: fallbackLatex || '' };
  }

  function buildTargetRelationRow(context, relationId) {
    const one = LaurentPolynomial.one();
    const minusOne = LaurentPolynomial.monomial(0, -1n);
    const v = LaurentPolynomial.monomial(1, 1n);
    const vInverse = LaurentPolynomial.monomial(-1, 1n);
    const W = (style, rank, records, label, fallback) => targetWordOperand(context, rank, style, records, label, fallback);
    const T = (rank, factors, label, fallback) => targetTlCompositionOperand(context, rank, factors, label, fallback);
    const E = (rank, index, label) => targetTlAtomOperand(context, rank, index, label);
    const I = (rank, tone, label) => relationIdentityOperand(context, rank, tone, label);
    const matrix = (rank, value, fallback) => relationMatrixOperand(context, rank, value, fallback);
    const row = (equations) => referenceRow(relationId, equations);

    switch (relationId) {
      case 'coxeter-multiplication':
        return row([relationEquation(
          W('symmetric', 2, [1, 1], 'glued Coxeter word s 1 s 1', 's_1s_1'),
          '=',
          I(2, 'symmetric', 'identity permutation on two strands')
        )]);
      case 'coxeter-braid':
        return row([relationEquation(
          W('symmetric', 3, [1, 2, 1], 'glued Coxeter word s 1 s 2 s 1', 's_1s_2s_1'),
          '=',
          W('symmetric', 3, [2, 1, 2], 'glued Coxeter word s 2 s 1 s 2', 's_2s_1s_2')
        )]);
      case 'coxeter-commutation':
        return row([relationEquation(
          W('symmetric', 4, [1, 3], 'glued Coxeter word s 1 s 3', 's_1s_3'),
          '=',
          W('symmetric', 4, [3, 1], 'glued Coxeter word s 3 s 1', 's_3s_1')
        )]);
      case 'braid-free-cancellation':
        return row([
          relationEquation(
            W('braid', 2, [{ index: 1, sign: 1 }, { index: 1, sign: -1 }], 'glued braid word sigma 1 sigma 1 inverse', '\\sigma_1\\sigma_1^{-1}'),
            '=',
            I(2, 'braid', 'identity braid on two strands')
          ),
          relationEquation(
            W('braid', 2, [{ index: 1, sign: -1 }, { index: 1, sign: 1 }], 'glued braid word sigma 1 inverse sigma 1', '\\sigma_1^{-1}\\sigma_1'),
            '=',
            I(2, 'braid', 'identity braid on two strands')
          )
        ]);
      case 'braid-relation':
        return row([relationEquation(
          W('braid', 3, [1, 2, 1], 'glued braid word sigma 1 sigma 2 sigma 1', '\\sigma_1\\sigma_2\\sigma_1'),
          '=',
          W('braid', 3, [2, 1, 2], 'glued braid word sigma 2 sigma 1 sigma 2', '\\sigma_2\\sigma_1\\sigma_2')
        )]);
      case 'braid-commutation':
        return row([relationEquation(
          W('braid', 4, [1, 3], 'glued braid word sigma 1 sigma 3', '\\sigma_1\\sigma_3'),
          '=',
          W('braid', 4, [3, 1], 'glued braid word sigma 3 sigma 1', '\\sigma_3\\sigma_1')
        )]);
      case 'hecke-multiplication':
      case 'hecke-length-decrease':
        return row([relationEquation(
          W('hecke', 2, [1, 1], 'glued Hecke word H 1 squared', 'H_1H_1'),
          '=',
          relationLinearOperand(context, 2, [
            { coefficient: one, atom: { kind: 'identity', tone: 'hecke' } },
            { coefficient: vInverse.sub(v), atom: { kind: 'hecke-generator', index: 1 } }
          ], '1+(v^{-1}-v)H_1')
        )]);
      case 'hecke-braid':
        return row([relationEquation(
          W('hecke', 3, [1, 2, 1], 'glued Hecke word H 1 H 2 H 1', 'H_1H_2H_1'),
          '=',
          W('hecke', 3, [2, 1, 2], 'glued Hecke word H 2 H 1 H 2', 'H_2H_1H_2')
        )]);
      case 'hecke-commutation':
        return row([relationEquation(
          W('hecke', 4, [1, 3], 'glued Hecke word H 1 H 3', 'H_1H_3'),
          '=',
          W('hecke', 4, [3, 1], 'glued Hecke word H 3 H 1', 'H_3H_1')
        )]);
      case 'hecke-length-increase':
        return row([relationEquation(
          W('hecke', 2, [1], 'minimal increasing-length Hecke product', 'H_eH_1'),
          '=',
          W('hecke', 2, [1], 'standard Hecke diagram H 1', 'H_1')
        )]);
      case 'tl-quadratic':
        return row([relationEquation(
          T(2, [[1], [1]], 'glued Temperley-Lieb product e 1 e 1 with an internal loop', 'e_1e_1'),
          '=',
          relationLinearOperand(context, 2, [{ coefficient: DELTA, coefficientLatex: '\\delta', atom: { kind: 'tl-generator', index: 1 } }], '\\delta e_1')
        )]);
      case 'tl-adjacent':
        return row([
          relationEquation(
            T(3, [[1], [2], [1]], 'glued Temperley-Lieb product e 1 e 2 e 1', 'e_1e_2e_1'),
            '=',
            E(3, 1, 'Temperley-Lieb generator e 1 on three strands')
          ),
          relationEquation(
            T(3, [[2], [1], [2]], 'glued Temperley-Lieb product e 2 e 1 e 2', 'e_2e_1e_2'),
            '=',
            E(3, 2, 'Temperley-Lieb generator e 2 on three strands')
          )
        ]);
      case 'tl-commutation':
        return row([relationEquation(
          T(4, [[1], [3]], 'glued Temperley-Lieb product e 1 e 3', 'e_1e_3'),
          '=',
          T(4, [[3], [1]], 'glued Temperley-Lieb product e 3 e 1', 'e_3e_1')
        )]);
      case 'tl-diagram-stacking':
        return row([relationEquation(
          null,
          '',
          symbolicOperand('D_P D_Q=\\delta^{k(P,Q)}D_{P\\star Q}')
        )]);
      case 'link-state-action': {
        const action = (rankValue, cupIndex, coefficient, outputCup, fallback) => relationEquation(
          {
            kind: 'representation',
            badgeLatex: '\\pi(e_1)',
            content: relationLinkStateOperand(context, rankValue, cupIndex),
            latex: fallback
          },
          '=',
          outputCup == null
            ? symbolicOperand('0')
            : relationLinkStateLinearOperand(context, rankValue, [{ coefficient, cupIndex: outputCup }], fallback)
        );
        return row([
          action(2, 1, DELTA, 1, '\\pi(e_1)L_1=\\delta L_1'),
          action(3, 2, one, 1, '\\pi(e_1)L_2=L_1'),
          action(4, 3, one, null, '\\pi(e_1)L_3=0')
        ]);
      }
      case 'reduced-burau-generator':
        return row([relationEquation(
          W('braid', 2, [1], 'positive braid generator sigma 1', '\\sigma_1'),
          '\\mapsto',
          relationLinkStateMatrixOperand(context, 2, reducedBurauGeneratorMatrix(2, 1, 1), '\\bar\\rho(\\sigma_1)')
        )]);
      case 'reduced-burau-inverse-generator':
        return row([relationEquation(
          W('braid', 2, [{ index: 1, sign: -1 }], 'inverse braid generator sigma 1', '\\sigma_1^{-1}'),
          '\\mapsto',
          relationLinkStateMatrixOperand(context, 2, reducedBurauGeneratorMatrix(2, 1, -1), '\\bar\\rho(\\sigma_1^{-1})')
        )]);
      case 'reduced-burau-inverse-check':
        return row([
          relationEquation(
            rhoOperand(W('braid', 2, [{ index: 1, sign: 1 }, { index: 1, sign: -1 }], 'glued braid word sigma 1 sigma 1 inverse', '\\sigma_1\\sigma_1^{-1}'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 2, identityMatrix(1), 'I')
          ),
          relationEquation(
            rhoOperand(W('braid', 2, [{ index: 1, sign: -1 }, { index: 1, sign: 1 }], 'glued braid word sigma 1 inverse sigma 1', '\\sigma_1^{-1}\\sigma_1'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 2, identityMatrix(1), 'I')
          )
        ]);
      case 'reduced-burau-braid-check': {
        const leftWord = [{ index: 1, sign: 1 }, { index: 2, sign: 1 }, { index: 1, sign: 1 }];
        const rightWord = [{ index: 2, sign: 1 }, { index: 1, sign: 1 }, { index: 2, sign: 1 }];
        const value = reducedBurauWordMatrix(3, leftWord);
        return row([
          relationEquation(
            rhoOperand(W('braid', 3, leftWord, 'glued braid word sigma 1 sigma 2 sigma 1', '\\sigma_1\\sigma_2\\sigma_1'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 3, value, '\\bar\\rho(\\sigma_1\\sigma_2\\sigma_1)')
          ),
          relationEquation(
            rhoOperand(W('braid', 3, rightWord, 'glued braid word sigma 2 sigma 1 sigma 2', '\\sigma_2\\sigma_1\\sigma_2'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 3, value, '\\bar\\rho(\\sigma_2\\sigma_1\\sigma_2)')
          )
        ]);
      }
      case 'reduced-burau-commutation-check': {
        const leftWord = [{ index: 1, sign: 1 }, { index: 3, sign: 1 }];
        const rightWord = [{ index: 3, sign: 1 }, { index: 1, sign: 1 }];
        const value = reducedBurauWordMatrix(4, leftWord);
        return row([
          relationEquation(
            rhoOperand(W('braid', 4, leftWord, 'glued braid word sigma 1 sigma 3', '\\sigma_1\\sigma_3'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 4, value, '\\bar\\rho(\\sigma_1\\sigma_3)')
          ),
          relationEquation(
            rhoOperand(W('braid', 4, rightWord, 'glued braid word sigma 3 sigma 1', '\\sigma_3\\sigma_1'), '', true),
            '=',
            relationLinkStateMatrixOperand(context, 4, value, '\\bar\\rho(\\sigma_3\\sigma_1)')
          )
        ]);
      }
      case 'burau-inverse-check':
        return row([
          relationEquation(
            rhoOperand(W('braid', 2, [{ index: 1, sign: 1 }, { index: 1, sign: -1 }], 'glued braid word sigma 1 sigma 1 inverse', '\\sigma_1\\sigma_1^{-1}')),
            '=',
            matrix(2, identityMatrix(2), 'I')
          ),
          relationEquation(
            rhoOperand(W('braid', 2, [{ index: 1, sign: -1 }, { index: 1, sign: 1 }], 'glued braid word sigma 1 inverse sigma 1', '\\sigma_1^{-1}\\sigma_1')),
            '=',
            matrix(2, identityMatrix(2), 'I')
          )
        ]);
      case 'braid-to-burau':
        return row([
          relationEquation(
            W('braid', 2, [1], 'positive braid generator sigma 1', '\\sigma_1'),
            '\\mapsto',
            matrix(2, burauGeneratorMatrix(2, 1, 1), '\\rho(\\sigma_1)')
          ),
          relationEquation(
            W('braid', 2, [{ index: 1, sign: -1 }], 'inverse braid generator sigma 1', '\\sigma_1^{-1}'),
            '\\mapsto',
            matrix(2, burauGeneratorMatrix(2, 1, -1), '\\rho(\\sigma_1^{-1})')
          )
        ]);
      case 'braid-to-reduced-burau':
        return row([
          relationEquation(
            W('braid', 2, [1], 'positive braid generator sigma 1', '\\sigma_1'),
            '\\mapsto',
            relationLinkStateMatrixOperand(context, 2, reducedBurauGeneratorMatrix(2, 1, 1), '\\bar\\rho(\\sigma_1)')
          ),
          relationEquation(
            W('braid', 2, [{ index: 1, sign: -1 }], 'inverse braid generator sigma 1', '\\sigma_1^{-1}'),
            '\\mapsto',
            relationLinkStateMatrixOperand(context, 2, reducedBurauGeneratorMatrix(2, 1, -1), '\\bar\\rho(\\sigma_1^{-1})')
          )
        ]);
      case 'burau-braid-check': {
        const leftWord = [{ index: 1, sign: 1 }, { index: 2, sign: 1 }, { index: 1, sign: 1 }];
        const rightWord = [{ index: 2, sign: 1 }, { index: 1, sign: 1 }, { index: 2, sign: 1 }];
        const value = burauWordMatrix(3, leftWord);
        return row([
          relationEquation(
            rhoOperand(W('braid', 3, leftWord, 'glued braid word sigma 1 sigma 2 sigma 1', '\\sigma_1\\sigma_2\\sigma_1')),
            '=',
            matrix(3, value, '\\rho(\\sigma_1\\sigma_2\\sigma_1)')
          ),
          relationEquation(
            rhoOperand(W('braid', 3, rightWord, 'glued braid word sigma 2 sigma 1 sigma 2', '\\sigma_2\\sigma_1\\sigma_2')),
            '=',
            matrix(3, value, '\\rho(\\sigma_2\\sigma_1\\sigma_2)')
          )
        ]);
      }
      case 'burau-commutation-check': {
        const leftWord = [{ index: 1, sign: 1 }, { index: 3, sign: 1 }];
        const rightWord = [{ index: 3, sign: 1 }, { index: 1, sign: 1 }];
        const value = burauWordMatrix(4, leftWord);
        return row([
          relationEquation(
            rhoOperand(W('braid', 4, leftWord, 'glued braid word sigma 1 sigma 3', '\\sigma_1\\sigma_3')),
            '=',
            matrix(4, value, '\\rho(\\sigma_1\\sigma_3)')
          ),
          relationEquation(
            rhoOperand(W('braid', 4, rightWord, 'glued braid word sigma 3 sigma 1', '\\sigma_3\\sigma_1')),
            '=',
            matrix(4, value, '\\rho(\\sigma_3\\sigma_1)')
          )
        ]);
      }
      case 'hecke-to-tl':
        return row([
          relationEquation(
            W('hecke', 2, [1], 'Hecke generator H 1', 'H_1'),
            '=',
            relationLinearOperand(context, 2, [
              { coefficient: vInverse, atom: { kind: 'identity', tone: 'tl' } },
              { coefficient: minusOne, atom: { kind: 'tl-generator', index: 1 } }
            ], 'v^{-1}-e_1')
          ),
          relationEquation(
            W('hecke', 2, [{ index: 1, sign: -1 }], 'inverse Hecke generator H 1', 'H_1^{-1}'),
            '=',
            relationLinearOperand(context, 2, [
              { coefficient: v, atom: { kind: 'identity', tone: 'tl' } },
              { coefficient: minusOne, atom: { kind: 'tl-generator', index: 1 } }
            ], 'v-e_1')
          )
        ]);
      case 'hecke-to-burau': {
        const eMatrix = tlGeneratorMatrix(2, 1);
        const positive = matrixAdd(matrixScale(identityMatrix(2), vInverse), matrixScale(eMatrix, minusOne));
        const inverse = matrixAdd(matrixScale(identityMatrix(2), v), matrixScale(eMatrix, minusOne));
        return row([
          relationEquation(W('hecke', 2, [1], 'Hecke generator H 1', 'H_1'), '\\mapsto', matrix(2, positive, '\\pi(H_1)')),
          relationEquation(W('hecke', 2, [{ index: 1, sign: -1 }], 'inverse Hecke generator H 1', 'H_1^{-1}'), '\\mapsto', matrix(2, inverse, '\\pi(H_1^{-1})'))
        ]);
      }
      case 'tl-to-reduced-burau':
        return row([relationEquation(
          E(2, 1, 'Temperley-Lieb generator e 1'),
          '\\mapsto',
          relationLinkStateMatrixOperand(context, 2, linkStateTlGeneratorMatrix(2, 1), '\\bar\\pi(e_1)')
        )]);
      case 'hecke-to-reduced-burau': {
        const eMatrix = linkStateTlGeneratorMatrix(2, 1);
        const positive = matrixAdd(matrixScale(identityMatrix(1), vInverse), matrixScale(eMatrix, minusOne));
        const inverse = matrixAdd(matrixScale(identityMatrix(1), v), matrixScale(eMatrix, minusOne));
        return row([
          relationEquation(W('hecke', 2, [1], 'Hecke generator H 1', 'H_1'), '\\mapsto', relationLinkStateMatrixOperand(context, 2, positive, '\\bar\\pi(H_1)')),
          relationEquation(W('hecke', 2, [{ index: 1, sign: -1 }], 'inverse Hecke generator H 1', 'H_1^{-1}'), '\\mapsto', relationLinkStateMatrixOperand(context, 2, inverse, '\\bar\\pi(H_1^{-1})'))
        ]);
      }
      case 'kl-to-burau': {
        const value = matrixAdd(matrixScale(identityMatrix(2), DELTA), matrixScale(tlGeneratorMatrix(2, 1), minusOne));
        const source = relationLinearOperand(context, 2, [
          { coefficient: one, atom: { kind: 'hecke-generator', index: 1 } },
          { coefficient: v, atom: { kind: 'identity', tone: 'hecke' } }
        ], 'H_1+v');
        return row([relationEquation(source, '\\mapsto', matrix(2, value, '\\pi(b_1)'))]);
      }
      case 'kl-to-reduced-burau': {
        const value = matrixAdd(matrixScale(identityMatrix(1), DELTA), matrixScale(linkStateTlGeneratorMatrix(2, 1), minusOne));
        const source = relationLinearOperand(context, 2, [
          { coefficient: one, atom: { kind: 'hecke-generator', index: 1 } },
          { coefficient: v, atom: { kind: 'identity', tone: 'hecke' } }
        ], 'H_1+v');
        return row([relationEquation(source, '\\mapsto', relationLinkStateMatrixOperand(context, 2, value, '\\bar\\pi(b_1)'))]);
      }
      default: {
        const legacy = buildMinimalRelationRow(context, relationId);
        const definition = RELATION_REFERENCE[relationId];
        if (!definition) return legacy;
        return {
          ...legacy,
          label: definition.label,
          rank: definition.rank
        };
      }
    }
  }

  function basisRelationId(calculation) {
    if (calculation.target === 'symmetric') {
      return math.SYMMETRIC_PRESENTATIONS?.includes(calculation.basis)
        ? `permutation-${calculation.basis}`
        : 'permutation-basis';
    }
    if (calculation.target === 'braid') return 'braid-word-result';
    if (calculation.target === 'hecke') return calculation.basis === 'kl' ? 'kl-basis-change' : 'standard-basis-expansion';
    if (calculation.target === 'tl') return 'tl-diagram-basis';
    if (calculation.basis === 'link-state') return 'link-state-basis';
    return calculation.basis === 'vector' ? 'vector-basis' : 'matrix-unit-basis';
  }

  function interpretationRelationIds(calculation) {
    const ids = [];
    if (calculation.sourceFamily === 'identity') ids.push('identity');
    else if (calculation.target === 'symmetric' && calculation.sourceFamily === 'braid') ids.push('braid-to-symmetric');
    else if (calculation.target === 'hecke' && calculation.sourceFamily === 'braid') ids.push('braid-to-hecke', 'braid-inverse-to-hecke');
    else if (calculation.target === 'hecke' && calculation.sourceFamily === 'kl') ids.push('kl-generator-expansion');
    else if (calculation.target === 'tl' && calculation.sourceFamily === 'braid') ids.push('braid-to-tl');
    else if (calculation.target === 'tl' && calculation.sourceFamily === 'hecke') ids.push('hecke-to-tl');
    else if (calculation.target === 'tl' && calculation.sourceFamily === 'kl') ids.push('kl-through-hecke-to-tl');
    else if (calculation.target === 'burau' && calculation.sourceFamily === 'braid') ids.push(calculation.basis === 'link-state' ? 'braid-to-reduced-burau' : 'braid-to-burau');
    else if (calculation.target === 'burau' && calculation.sourceFamily === 'tl') ids.push(calculation.basis === 'link-state' ? 'tl-to-reduced-burau' : 'tl-to-burau');
    else if (calculation.target === 'burau' && calculation.sourceFamily === 'hecke') ids.push(calculation.basis === 'link-state' ? 'hecke-to-reduced-burau' : 'hecke-to-burau');
    else if (calculation.target === 'burau' && calculation.sourceFamily === 'kl') ids.push(calculation.basis === 'link-state' ? 'kl-to-reduced-burau' : 'kl-to-burau');
    ids.push(basisRelationId(calculation));
    return [...new Set(ids)];
  }

  function relationGroupIds(calculation) {
    const catalog = calculation.target === 'burau' && calculation.basis !== 'link-state'
      ? UNREDUCED_BURAU_RELATION_CATALOG
      : TARGET_RELATION_CATALOGS[calculation.target];
    if (!catalog) throw new TypeError('No relation catalog is available for target ' + calculation.target + '.');
    return [
      { id: 'defining', label: 'Defining relations', relationIds: catalog.defining.slice() },
      { id: 'consequences', label: 'Useful consequences', relationIds: catalog.consequences.slice() },
      { id: 'interpretation', label: 'Interpretation', relationIds: interpretationRelationIds(calculation) }
    ].filter((group) => group.relationIds.length);
  }

  function buildRelationGroups(calculation, rowBuilder) {
    const groups = relationGroupIds(calculation).map((group) => ({
      id: group.id,
      label: group.label,
      rows: group.relationIds.map(rowBuilder)
    }));
    return { groups, rows: groups.flatMap((group) => group.rows) };
  }

  function buildDiagrammaticRelationRows(context) {
    return buildRelationGroups(context.calculation, (relationId) => buildTargetRelationRow(context, relationId));
  }

  function buildDiagrammaticTrace(calculation, options) {
    if (!calculation || !Array.isArray(calculation.trace)) throw new TypeError('A calculation with trace rows is required.');
    const normalized = normalizeDiagramOptions(options);
    const context = createDiagramContext(calculation, normalized);
    return diagramModel(context, buildDiagrammaticTraceRows(context));
  }

  function buildDiagrammaticRelations(calculation, options) {
    if (!calculation || !calculation.target) throw new TypeError('A calculation target is required.');
    const normalized = normalizeDiagramOptions(options);
    const context = createDiagramContext(calculation, normalized);
    const relationModel = buildDiagrammaticRelationRows(context);
    return diagramModel(context, relationModel.rows, { groups: relationModel.groups });
  }

  function buildSymbolicRelations(calculation) {
    if (!calculation || !calculation.target) throw new TypeError('A calculation target is required.');
    const relationModel = buildRelationGroups(calculation, symbolicReferenceRow);
    return {
      ...relationModel,
      warnings: [],
      diagramAtoms: 0
    };
  }

  function buildDiagrammaticPresentation(calculation, options) {
    if (!calculation || !Array.isArray(calculation.trace) || !Array.isArray(calculation.relationsUsed)) {
      throw new TypeError('A calculation with trace rows and relation IDs is required.');
    }
    const normalized = normalizeDiagramOptions(options);
    const context = createDiagramContext(calculation, normalized);
    const traceRows = buildDiagrammaticTraceRows(context);
    const relationModel = buildDiagrammaticRelationRows(context);
    const model = diagramModel(context, traceRows);
    return {
      ...model,
      trace: { rows: traceRows },
      relations: {
        rows: relationModel.rows,
        groups: relationModel.groups
      }
    };
  }

  function formatNumber(value) {
    return Number(value).toFixed(3).replace(/\.?0+$/, '');
  }

  function tikzPoint(point) {
    return `(${formatNumber(point.x)},${formatNumber(point.y)})`;
  }

  function pathToTikz(path, style) {
    const pieces = [`\\draw[${style}] ${tikzPoint(path.start)}`];
    (path.curves || []).forEach((curve) => {
      pieces.push(`.. controls ${tikzPoint(curve.c1)} and ${tikzPoint(curve.c2)} .. ${tikzPoint(curve.end)}`);
    });
    return `${pieces.join(' ')};`;
  }

  function diagramToTikz(diagram) {
    const xScale = Math.max(0.75, Math.min(3.2, diagram.width / 72));
    const yScale = Math.max(0.75, Math.min(3.2, diagram.height / 72));
    const lines = [
      `\\begin{tikzpicture}[baseline=(current bounding box.center),x=${formatNumber(xScale)}cm,y=-${formatNumber(yScale)}cm,line cap=round,line join=round]`
    ];
    if (diagram.kind === 'matrix-unit' || diagram.kind === 'vector-unit') {
      (diagram.cells || []).forEach((cell) => {
        lines.push(`\\draw[${cell.selected ? 'fill=black!22,' : ''}line width=.35pt] (${formatNumber(cell.x)},${formatNumber(cell.y)}) rectangle (${formatNumber(cell.x + cell.width)},${formatNumber(cell.y + cell.height)});`);
      });
    } else {
      (diagram.platforms || []).forEach((platform) => {
        const points = (platform.points || []).map(tikzPoint);
        if (points.length >= 3) lines.push(`\\filldraw[fill=black!12,line width=.45pt] ${points.join(' -- ')} -- cycle;`);
      });
      (diagram.paths || []).forEach((path) => lines.push(pathToTikz(path, 'line width=.55pt')));
      (diagram.overlays || []).forEach((overlay) => {
        lines.push(`\\draw[white,line width=2.2pt] ${tikzPoint(overlay.from)} -- ${tikzPoint(overlay.to)};`);
        lines.push(`\\draw[line width=.65pt] ${tikzPoint(overlay.from)} -- ${tikzPoint(overlay.to)};`);
      });
      const endpoints = [];
      (diagram.paths || []).forEach((path) => {
        if (path.closed) return;
        endpoints.push(path.start);
        const last = path.curves?.[path.curves.length - 1]?.end;
        if (last && !path.endOnPlatform) endpoints.push(last);
      });
      endpoints.forEach((point) => lines.push(`\\fill ${tikzPoint(point)} circle (0.8pt);`));
    }
    lines.push('\\end{tikzpicture}');
    return lines.join('\n');
  }

  function termToTikz(term, index) {
    if (!term.diagram) return `${index ? '+' : ''}${term.symbolicLatex}`;
    const parts = termParts(term.coefficient, index);
    return `${parts.prefix}${parts.coefficientLatex}${diagramToTikz(term.diagram)}`;
  }

  function operandToTikz(operand) {
    if (!operand) return '';
    if (operand.kind === 'symbolic') return operand.latex;
    if (operand.kind === 'diagram') return `${operand.badgeLatex || ''}${diagramToTikz(operand.diagram)}`;
    if (operand.kind === 'linear-combination') return operand.terms.map(termToTikz).join('');
    if (operand.kind === 'factor-product') {
      return operand.factors.map((factor) => `\\left(${operandToTikz(factor)}\\right)`).join('');
    }
    if (operand.kind === 'representation') {
      return `${operand.badgeLatex}\\!\\left(${operandToTikz(operand.content)}\\right)`;
    }
    if (operand.kind === 'vector-system') {
      const rows = operand.rows.map((row) => {
        const lhs = `${row.lhs.rhoLatex}${row.lhs.diagram ? diagramToTikz(row.lhs.diagram) : row.lhs.basisLatex}`;
        return `${lhs}=${row.terms.map(termToTikz).join('')}`;
      });
      return `\\left\\{\\begin{aligned}${rows.join('\\\\')}\\end{aligned}\\right.`;
    }
    return operand.latex || '0';
  }

  function formatDiagrammaticTraceTikz(calculation, options) {
    const model = buildDiagrammaticTrace(calculation, options);
    const rows = model.rows.map((row) => {
      const lhs = row.lhs ? operandToTikz(row.lhs) : '';
      const rhs = operandToTikz(row.rhs);
      return `${lhs} &=${rhs} &&${row.annotationLatex || ''}`;
    });
    const comments = ['% Requires \\usepackage{tikz}'];
    model.warnings.forEach((message) => comments.push(`% Diagrammatic fallback: ${message}`));
    return `${comments.join('\n')}\n\\[\n\\begin{aligned}\n${rows.join('\\\\\n')}\n\\end{aligned}\n\\]`;
  }

  return {
    DEFAULT_DIAGRAM_LIMITS,
    normalizeDiagramOptions,
    polynomialFromJSON,
    combinationFromJSON,
    termParts,
    minimalRankForIndices,
    orientPoint,
    makeBraidDiagram,
    makePermutationDiagram,
    makeTlDiagram,
    makeTlCompositionDiagram,
    makeLoopDiagram,
    makeGridDiagram,
    makeBurauLinkStateDiagram,
    pathToSvgData,
    diagramToTikz,
    buildDiagrammaticTrace,
    buildDiagrammaticRelations,
    buildSymbolicRelations,
    buildDiagrammaticPresentation,
    formatDiagrammaticTraceTikz
  };
});
