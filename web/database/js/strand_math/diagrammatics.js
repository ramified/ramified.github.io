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
    burauGeneratorMatrix,
    tlGeneratorMatrix,
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
    if (basisType === 'permutation') return `[${basis.values.join(',')}]`;
    if (basisType === 'standard' || basisType === 'hecke-standard') return `H_{[${basis.values.join(',')}]}`;
    if (basisType === 'kl') return `\\underline{H}_{[${basis.values.join(',')}]}`;
    if (basisType === 'diagram' || basisType === 'tl-diagram') {
      const pairs = (basis.pairs || []).map(([left, right]) => `${left + 1}\\!-${right + 1}`).join(',');
      return `D_{\\{${pairs}\\}}`;
    }
    if (basisType === 'matrix-unit' || basisType === 'burau-matrix-unit') return `E_{${basis.row}${basis.column}}`;
    if (basisType === 'vector' || basisType === 'burau-vector') return `e_{${basis.row}}`;
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

  function factorTerm(context, coefficient, atom, index) {
    const diagram = atomDiagram(context, atom);
    const basisLatex = atom.kind === 'identity'
      ? '1'
      : atom.kind === 'hecke-generator'
        ? `H_{${atom.index}}`
        : `e_{${atom.index}}`;
    return {
      coefficient: coefficient.toJSON(),
      diagram,
      basisLatex,
      symbolicLatex: polynomialTimesBasisLatex(coefficient, basisLatex),
      parts: termParts(coefficient, index)
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
    if (basisType === 'permutation') {
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

  function vectorOperand(context, combination, fallbackLatex) {
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
          rhoLatex: '\\rho(\\beta)',
          diagram: basisDiagram(context, inputBasis, 'vector'),
          basisLatex: `e_{${column}}`
        },
        terms: terms.map((term, index) => diagramTerm(context, term, 'vector', index))
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
    if (basisType === 'vector' || combination.basisType === 'burau-vector') {
      return vectorOperand(context, combination, fallbackLatex);
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

  function buildDiagrammaticTrace(calculation, options) {
    if (!calculation || !Array.isArray(calculation.trace)) throw new TypeError('A calculation with trace rows is required.');
    const normalized = normalizeDiagramOptions(options);
    const context = {
      calculation,
      rank: positiveInteger(calculation.metadata?.rank, 1),
      options: normalized,
      remainingAtoms: normalized.limits.atoms,
      warnings: [],
      warningCodes: new Set()
    };
    const rows = calculation.trace.map((step) => {
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
    return {
      rows,
      warnings: context.warnings,
      limits: { ...normalized.limits },
      direction: normalized.direction,
      scope: normalized.scope,
      diagramAtoms: normalized.limits.atoms - context.remainingAtoms
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
      (diagram.paths || []).forEach((path) => lines.push(pathToTikz(path, 'line width=.55pt')));
      (diagram.overlays || []).forEach((overlay) => {
        lines.push(`\\draw[white,line width=2.2pt] ${tikzPoint(overlay.from)} -- ${tikzPoint(overlay.to)};`);
        lines.push(`\\draw[line width=.65pt] ${tikzPoint(overlay.from)} -- ${tikzPoint(overlay.to)};`);
      });
      const endpoints = [];
      (diagram.paths || []).forEach((path) => {
        endpoints.push(path.start);
        const last = path.curves?.[path.curves.length - 1]?.end;
        if (last) endpoints.push(last);
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
      return `${lhs} &=${row.final ? `\\boxed{${rhs}}` : rhs} &&${row.annotationLatex || ''}`;
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
    orientPoint,
    makeBraidDiagram,
    makePermutationDiagram,
    makeTlDiagram,
    makeGridDiagram,
    pathToSvgData,
    diagramToTikz,
    buildDiagrammaticTrace,
    formatDiagrammaticTraceTikz
  };
});
