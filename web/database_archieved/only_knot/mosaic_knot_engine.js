/*
 * Mosaic knot graph, PD, DT, and table identification engine.
 * DT convention and data generation are aligned with KnotFolio's KnotGraph.get_dt().
 * KnotFolio is GPL-2.0; keep this attribution with derived code/data.
 */
(function (global) {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const METHODS = ['hybrid', 'invariants', 'dt'];
  const EMPTY_PD = 'PD[P[1,1]]';
  const EMPTY_DT = 'DT[]';
  const ARC_DEFORMATION_SAMPLES = 24;
  const HEX_DIAMETER_NUDGE = 0.055;

  const LATTICES = {
    hexagonal: {
      dirNames: ['E', 'SE', 'SW', 'W', 'NW', 'NE'],
      opposite: [3, 4, 5, 0, 1, 2],
      angles: [0, 60, 120, 180, 240, 300].map(toRadians),
      sides: 6,
      shape: 'hex'
    },
    square: {
      dirNames: ['E', 'S', 'W', 'N'],
      opposite: [2, 3, 0, 1],
      angles: [0, 90, 180, 270].map(toRadians),
      sides: 4,
      shape: 'square'
    }
  };

  const HEX_AXIAL_DELTAS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1]
  ];

  function identify(input) {
    const method = normalizeMethod(input && input.method);
    const diagram = buildDiagram(input);
    if (!diagram.ok) {
      return {
        ok: false,
        status: 'diagram unavailable',
        name: diagram.error || 'could not encode diagram',
        methodResult: 'not run',
        pd: diagram.pd || '',
        dt: diagram.dt || '',
        dtKey: diagram.dtKey || '',
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }

    const result = identifyDiagram(diagram, method);
    return Object.assign({
      ok: true,
      pd: diagram.pd,
      dt: diagram.dt,
      dtKey: diagram.dtKey,
      crossingCount: diagram.crossingCount,
      tone: result && result.name ? 'good' : 'bad'
    }, result || noMatchResult(diagram));
  }

  function buildDiagram(input) {
    if (!input || typeof input !== 'object') {
      return failedDiagram('missing mosaic input');
    }
    if (input.wrapped) {
      return failedDiagram('wrapped canvases are not identified');
    }
    const rows = toPositiveInt(input.rows);
    const cols = toPositiveInt(input.cols);
    const lattice = LATTICES[input.lattice] || LATTICES.hexagonal;
    if (!rows || !cols) return failedDiagram('invalid board size');

    const tileCount = rows * cols;
    const tiles = Array.from({ length: tileCount }, (_, index) => normalizeTile(input.tiles && input.tiles[index], lattice.sides));
    const graph = buildGraph({ rows, cols, lattice, tiles });
    if (!graph.ok) return graph;

    if (graph.crossings.length === 0) {
      return {
        ok: true,
        pd: EMPTY_PD,
        dt: EMPTY_DT,
        dtKey: '',
        mirrorDtKey: '',
        crossingCount: 0,
        pdEntries: [],
        occurrences: [],
        graph
      };
    }

    const trace = traceGraph(graph);
    if (!trace.ok) {
      return failedDiagram(trace.error || 'diagram trace failed');
    }

    const pdEntries = buildPdEntries(graph, trace.occurrences);
    if (!pdEntries.ok) return failedDiagram(pdEntries.error || 'PD code failed');

    const dtCode = canonicalDtFromOccurrences(trace.occurrences, false);
    const mirrorDtCode = canonicalDtFromOccurrences(trace.occurrences, true);
    if (!dtCode) {
      return failedDiagram('DT code failed', formatPd(pdEntries.entries), '');
    }

    return {
      ok: true,
      pd: formatPd(pdEntries.entries),
      dt: formatDt(dtCode),
      dtKey: keyOf(dtCode),
      mirrorDtKey: mirrorDtCode ? keyOf(mirrorDtCode) : '',
      crossingCount: graph.crossings.length,
      hasMultiCrossingTile: !!graph.hasMultiCrossingTile,
      pdEntries: pdEntries.entries,
      occurrences: trace.occurrences,
      graph
    };
  }

  function buildGraph(context) {
    const { rows, cols, lattice, tiles } = context;
    const nodes = [];
    const edges = [];
    const adj = [];
    const boundaryNodes = new Map();
    const crossingRefsByArc = new Map();
    const crossings = [];
    let hasMultiCrossingTile = false;

    const addNode = (meta) => {
      const id = nodes.length;
      nodes.push(meta);
      adj[id] = [];
      return id;
    };
    const addEdge = (from, to, event = null) => {
      const id = edges.length;
      edges.push({ from, to, event });
      adj[from].push(id);
      adj[to].push(id);
      return id;
    };
    const portKey = (index, dir) => `${index}:${dir}`;
    const arcKey = (index, arcIndex) => `${index}:${arcIndex}`;
    const getBoundaryNode = (index, dir) => {
      const key = portKey(index, dir);
      if (!boundaryNodes.has(key)) {
        boundaryNodes.set(key, addNode({ type: 'port', index, dir }));
      }
      return boundaryNodes.get(key);
    };

    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex += 1) {
      const arcs = tiles[tileIndex];
      if (!arcs.length) continue;
      const tileCrossings = [];
      for (let left = 0; left < arcs.length; left += 1) {
        for (let right = left + 1; right < arcs.length; right += 1) {
          if (pairsCrossInTile(arcs[left], arcs[right], lattice.sides)) {
            tileCrossings.push([left, right]);
          }
        }
      }
      const useThreeDiameterDeformation = isHexThreeDiameterTile(arcs, lattice);
      if (tileCrossings.length > 1) hasMultiCrossingTile = true;
      for (const [leftArcIndex, rightArcIndex] of tileCrossings) {
        const underArcIndex = Math.min(leftArcIndex, rightArcIndex);
        const overArcIndex = Math.max(leftArcIndex, rightArcIndex);
        const crossing = {
          id: crossings.length,
          tileIndex,
          underArcIndex,
          overArcIndex,
          underDirs: arcs[underArcIndex].slice(0, 2),
          overDirs: arcs[overArcIndex].slice(0, 2),
          nodesByDir: new Map(),
          rays: []
        };

        crossing.underDirs.forEach((dir) => addCrossingRay(crossing, dir, false, addNode, lattice));
        crossing.overDirs.forEach((dir) => addCrossingRay(crossing, dir, true, addNode, lattice));
        crossing.rays.sort(compareRaysByAngle);
        if (!raysAlternate(crossing.rays)) {
          return failedDiagram('ambiguous crossing rotation');
        }

        crossings.push(crossing);
        addArcCrossingRef(
          crossingRefsByArc,
          arcKey(tileIndex, leftArcIndex),
          crossing,
          arcs[leftArcIndex],
          arcs[rightArcIndex],
          lattice,
          useThreeDiameterDeformation,
          leftArcIndex
        );
        addArcCrossingRef(
          crossingRefsByArc,
          arcKey(tileIndex, rightArcIndex),
          crossing,
          arcs[rightArcIndex],
          arcs[leftArcIndex],
          lattice,
          useThreeDiameterDeformation,
          rightArcIndex
        );
      }
    }

    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex += 1) {
      const arcs = tiles[tileIndex];
      for (let arcIndex = 0; arcIndex < arcs.length; arcIndex += 1) {
        const pair = arcs[arcIndex];
        const crossingRefs = (crossingRefsByArc.get(arcKey(tileIndex, arcIndex)) || [])
          .slice()
          .sort(compareArcCrossingRefs);
        if (!crossingRefs.length) {
          addEdge(getBoundaryNode(tileIndex, pair[0]), getBoundaryNode(tileIndex, pair[1]));
          continue;
        }

        let previousNode = getBoundaryNode(tileIndex, pair[0]);
        for (const ref of crossingRefs) {
          const entryNode = ref.crossing.nodesByDir.get(pair[0]);
          const exitNode = ref.crossing.nodesByDir.get(pair[1]);
          if (entryNode == null || exitNode == null) {
            return failedDiagram('crossing segment data is incomplete');
          }
          addEdge(previousNode, entryNode);
          previousNode = exitNode;
        }
        addEdge(previousNode, getBoundaryNode(tileIndex, pair[1]));
      }
    }

    crossings.forEach((crossing) => {
      addEdge(
        crossing.nodesByDir.get(crossing.underDirs[0]),
        crossing.nodesByDir.get(crossing.underDirs[1]),
        { crossing: crossing.id, over: false }
      );
      addEdge(
        crossing.nodesByDir.get(crossing.overDirs[0]),
        crossing.nodesByDir.get(crossing.overDirs[1]),
        { crossing: crossing.id, over: true }
      );
    });

    for (const [key, node] of boundaryNodes.entries()) {
      const [indexText, dirText] = key.split(':');
      const index = Number(indexText);
      const dir = Number(dirText);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const next = neighbor(row, col, dir, rows, cols, lattice);
      if (!next) return failedDiagram('open edge in diagram graph');
      const nextIndex = indexOf(next.row, next.col, cols);
      const opposite = lattice.opposite[dir];
      const nextNode = boundaryNodes.get(portKey(nextIndex, opposite));
      if (nextNode == null) return failedDiagram('unmatched edge in diagram graph');
      if (index < nextIndex || (index === nextIndex && dir < opposite)) addEdge(node, nextNode);
    }

    const badNode = adj.findIndex((entries) => entries.length !== 2);
    if (badNode >= 0) return failedDiagram('diagram graph is not 2-valent');

    return {
      ok: true,
      nodes,
      edges,
      adj,
      crossings,
      hasMultiCrossingTile,
      rows,
      cols,
      lattice
    };
  }

  function addCrossingRay(crossing, dir, over, addNode, lattice) {
    const node = addNode({ type: 'crossing', crossing: crossing.id, dir, over });
    crossing.nodesByDir.set(dir, node);
    crossing.rays.push({
      dir,
      over,
      node,
      angle: normalizeAngle(lattice.angles[dir])
    });
  }

  function addArcCrossingRef(refsByArc, key, crossing, arc, otherArc, lattice, useThreeDiameterDeformation, arcIndex) {
    const refs = refsByArc.get(key) || [];
    refs.push({
      crossing,
      arcIndex,
      position: crossingPositionAlongArc(arc, otherArc, lattice, useThreeDiameterDeformation)
    });
    refsByArc.set(key, refs);
  }

  function traceGraph(graph) {
    const startEdge = graph.edges.findIndex((edge) => edge.event);
    if (startEdge < 0) {
      return {
        ok: true,
        occurrences: [],
        usedEdges: new Set()
      };
    }

    const startNode = graph.edges[startEdge].from;
    let currentNode = startNode;
    let edgeIndex = startEdge;
    const usedEdges = new Set();
    const occurrences = [];

    for (let guard = 0; guard <= graph.edges.length + 1; guard += 1) {
      if (usedEdges.has(edgeIndex)) {
        return { ok: false, error: 'diagram trace repeated an edge early' };
      }
      usedEdges.add(edgeIndex);
      const edge = graph.edges[edgeIndex];
      const nextNode = edge.from === currentNode ? edge.to : edge.from;
      if (edge.event) {
        occurrences.push({
          crossing: edge.event.crossing,
          over: edge.event.over,
          from: currentNode,
          to: nextNode
        });
      }
      const nextEdges = graph.adj[nextNode].filter((candidate) => candidate !== edgeIndex);
      if (nextEdges.length !== 1) return { ok: false, error: 'diagram trace is not a circuit' };
      currentNode = nextNode;
      edgeIndex = nextEdges[0];
      if (edgeIndex === startEdge && currentNode === startNode) break;
    }

    if (usedEdges.size !== graph.edges.length) return { ok: false, error: 'diagram has more than one circuit' };
    if (occurrences.length !== graph.crossings.length * 2) return { ok: false, error: 'crossing trace is incomplete' };

    const seen = new Map();
    occurrences.forEach((occurrence) => {
      const list = seen.get(occurrence.crossing) || [];
      list.push(occurrence);
      seen.set(occurrence.crossing, list);
    });
    for (const list of seen.values()) {
      if (list.length !== 2 || list[0].over === list[1].over) {
        return { ok: false, error: 'crossing over-under data is inconsistent' };
      }
    }

    return { ok: true, occurrences, usedEdges };
  }

  function buildPdEntries(graph, occurrences) {
    if (!occurrences.length) return { ok: true, entries: [] };
    const labelByNode = new Map();
    occurrences.forEach((occurrence, index) => {
      const label = index + 1;
      const next = occurrences[(index + 1) % occurrences.length];
      labelByNode.set(occurrence.to, label);
      labelByNode.set(next.from, label);
    });

    const entries = [];
    for (const crossing of graph.crossings) {
      const rays = crossing.rays.slice();
      while (rays.length && rays[0].over) rays.push(rays.shift());
      const labels = rays.map((ray) => labelByNode.get(ray.node) || 0);
      if (labels.some((label) => label <= 0)) {
        return { ok: false, error: 'PD labels are incomplete' };
      }
      entries.push(labels);
    }
    return { ok: true, entries };
  }

  function canonicalDtFromOccurrences(occurrences, mirror) {
    if (!occurrences.length) return [];
    const candidates = dtCandidates(occurrences, mirror);
    if (!candidates.length) return null;
    candidates.sort(compareDtCodes);
    return candidates[0];
  }

  function dtCandidates(occurrences, mirror) {
    const total = occurrences.length;
    const crossingCount = total / 2;
    const candidates = [];

    for (const reversed of [false, true]) {
      for (let shift = 0; shift < total; shift += 1) {
        const sequence = [];
        for (let index = 0; index < total; index += 1) {
          const sourceIndex = reversed
            ? modulo(shift - index, total)
            : modulo(shift + index, total);
          const occurrence = occurrences[sourceIndex];
          sequence.push({
            crossing: occurrence.crossing,
            over: mirror ? !occurrence.over : occurrence.over
          });
        }

        const byCrossing = new Map();
        sequence.forEach((occurrence, index) => {
          const list = byCrossing.get(occurrence.crossing) || [];
          list.push({ index, over: occurrence.over });
          byCrossing.set(occurrence.crossing, list);
        });
        if (byCrossing.size !== crossingCount) continue;

        let valid = true;
        for (const list of byCrossing.values()) {
          valid = valid && list.length === 2 && list[0].over !== list[1].over;
        }
        if (!valid) continue;

        const code = [];
        for (let index = 0; index < total; index += 2) {
          const occurrence = sequence[index];
          const list = byCrossing.get(occurrence.crossing);
          const mate = list[0].index === index ? list[1] : list[0];
          let value = mate.index + 1;
          if (occurrence.over) value = -value;
          code.push(value);
        }
        if (code[0] < 0) {
          for (let index = 0; index < code.length; index += 1) code[index] = -code[index];
        }
        candidates.push(code);
      }
    }

    return candidates;
  }

  function identifyDiagram(diagram, method) {
    if (diagram.hasMultiCrossingTile) {
      const invariantResult = identifyByInvariants(diagram);
      if (invariantResult && invariantResult.name) return invariantResult;
      if (method === 'invariants') return invariantResult;

      const dtResult = identifyByDt(diagram, method === 'dt' ? 'DT match' : 'DT fallback');
      if (dtResult && dtResult.name) return dtResult;
      return null;
    }

    if (method === 'dt') return identifyByDt(diagram, 'DT match');
    if (method === 'invariants') return identifyByInvariants(diagram);

    const invariantResult = identifyByInvariants(diagram);
    if (invariantResult && invariantResult.name) return invariantResult;
    const dtResult = identifyByDt(diagram, 'DT fallback');
    if (dtResult && dtResult.name) return dtResult;
    return null;
  }

  function identifyByInvariants(diagram) {
    if (diagram.crossingCount <= 2) {
      return resultFromName('0_1', 'invariant match', 'invariant table match');
    }

    const data = getData();
    if (!data.entries) return null;
    const jonesVectors = computeJonesVectors(diagram.pdEntries);
    if (!jonesVectors.length) {
      return reducesToUnknot(diagram.occurrences)
        ? resultFromName('0_1', 'invariant match', 'invariant table match')
        : null;
    }
    const candidates = invariantCandidatesByJones(jonesVectors, diagram.crossingCount);
    return invariantResultFromCandidates(candidates);
  }

  function identifyByDt(diagram, methodResult) {
    const match = lookupDt(diagram);
    if (!match) return null;
    return resultFromName(match.name, methodResult, methodResult === 'DT fallback' ? 'DT fallback match' : 'DT table match');
  }

  function invariantCandidatesByJones(jonesVectors, crossingCount) {
    const data = getData();
    const index = getJonesIndex();
    const candidates = new Map();
    jonesVectors.forEach((vector) => {
      [
        vector,
        reverseJonesVector(vector)
      ].forEach((candidateVector) => {
        const names = index[JSON.stringify(candidateVector)] || [];
        names.forEach((name) => {
          const entry = data.entries && data.entries[name];
          if (!entry || entry.crossingNumber > crossingCount) return;
          candidates.set(name, entry);
        });
      });
    });
    return Array.from(candidates.keys()).sort(compareKnotNames);
  }

  function invariantResultFromCandidates(candidates) {
    if (!candidates.length) return null;
    if (candidates.length === 1) {
      return resultFromName(candidates[0], 'invariant match', 'invariant table match');
    }
    const shortList = candidates.slice(0, 5).join(', ');
    const first = candidates[0];
    return {
      status: 'invariant table match',
      name: candidates.length > 5 ? `candidate knots: ${shortList}, ...` : `candidate knots: ${shortList}`,
      href: knotInfoHref(first),
      linkText: 'more data',
      methodResult: 'invariant candidates',
      candidates: candidates.map(candidateFromName),
      tone: 'good'
    };
  }

  function getJonesIndex() {
    const data = getData();
    if (data._jonesIndex) return data._jonesIndex;
    const index = {};
    if (data.entries) {
      Object.keys(data.entries).forEach((name) => {
        const entry = data.entries[name];
        if (!entry || !entry.jones) return;
        const key = JSON.stringify(entry.jones);
        if (!index[key]) index[key] = [];
        index[key].push(name);
      });
    }
    data._jonesIndex = index;
    return index;
  }

  function lookupDt(diagram) {
    const data = getData();
    if (!data.dt) return null;
    return data.dt[diagram.dtKey] || data.dt[diagram.mirrorDtKey] || null;
  }

  function resultFromName(name, methodResult, status) {
    const data = getData();
    const entry = (data.entries && data.entries[name]) || null;
    const href = entry && entry.href ? entry.href : knotInfoHref(name);
    const braid = braidWordForName(name);
    return {
      status,
      name: displayName(name),
      href,
      linkText: 'more data',
      methodResult,
      braid,
      candidates: [{
        name,
        label: displayName(name),
        href,
        braid
      }],
      tone: 'good'
    };
  }

  function candidateFromName(name) {
    const data = getData();
    const entry = (data.entries && data.entries[name]) || null;
    return {
      name,
      label: displayName(name),
      href: entry && entry.href ? entry.href : knotInfoHref(name),
      braid: braidWordForName(name)
    };
  }

  function noMatchResult(diagram) {
    return {
      status: diagram.crossingCount ? 'code generated' : 'unknot diagram',
      name: diagram.crossingCount ? 'no local match' : displayName('0_1'),
      href: diagram.crossingCount ? 'https://find-a-knot.onrender.com/' : knotInfoHref('0_1'),
      linkText: diagram.crossingCount ? 'Find-A-Knot' : 'more data',
      methodResult: diagram.crossingCount ? 'no match' : 'invariant match',
      braid: diagram.crossingCount ? null : braidWordForName('0_1'),
      tone: diagram.crossingCount ? 'bad' : 'good'
    };
  }

  function computeJonesVectors(pdEntries) {
    if (!pdEntries || !pdEntries.length) return [[0, 1]];
    if (pdEntries.length > 16) return [];

    const bracket = computeBracketPolynomial(pdEntries);
    const vectors = new Map();
    const crossingCount = pdEntries.length;
    for (let writhe = -crossingCount; writhe <= crossingCount; writhe += 2) {
      const normalized = shiftScalePoly(bracket, -3 * writhe, writhe % 2 === 0 ? 1 : -1);
      const vector = bracketToJonesVector(normalized);
      if (vector) vectors.set(JSON.stringify(vector), vector);
    }
    return Array.from(vectors.values());
  }

  function computeBracketPolynomial(pdEntries) {
    const stateCount = 2 ** pdEntries.length;
    let bracket = new Map();

    for (let state = 0; state < stateCount; state += 1) {
      const uf = new UnionFind();
      let exponent = 0;
      pdEntries.forEach(([a, b, c, d], crossingIndex) => {
        uf.add(a);
        uf.add(b);
        uf.add(c);
        uf.add(d);
        if (state & (1 << crossingIndex)) {
          exponent -= 1;
          uf.union(a, d);
          uf.union(b, c);
        } else {
          exponent += 1;
          uf.union(a, b);
          uf.union(c, d);
        }
      });

      const loops = uf.countRoots();
      const contribution = shiftPoly(deltaPower(Math.max(0, loops - 1)), exponent);
      bracket = addPoly(bracket, contribution);
    }

    return bracket;
  }

  function bracketToJonesVector(poly) {
    const terms = new Map();
    for (const [exponentText, coeff] of poly.entries()) {
      if (!coeff) continue;
      const exponent = Number(exponentText);
      if (exponent % 2 !== 0) return null;
      const tExponent = -exponent / 2;
      terms.set(tExponent, (terms.get(tExponent) || 0) + coeff);
    }
    return polyMapToVector(terms);
  }

  function reverseJonesVector(vector) {
    if (!vector || vector.length < 2) return vector;
    const coeffs = vector.slice(1).reverse();
    const minExponent = -vector[0] - coeffs.length + 1;
    return normalizeVector([minExponent].concat(coeffs));
  }

  function polyMapToVector(terms) {
    const nonzero = Array.from(terms.entries())
      .filter((entry) => entry[1] !== 0)
      .sort((left, right) => left[0] - right[0]);
    if (!nonzero.length) return [0];
    const minExponent = nonzero[0][0];
    const maxExponent = nonzero[nonzero.length - 1][0];
    const coeffs = [];
    for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
      coeffs.push(terms.get(exponent) || 0);
    }
    return normalizeVector([minExponent].concat(coeffs));
  }

  function normalizeVector(vector) {
    if (!vector || vector.length < 2) return [0];
    let minExponent = vector[0];
    const coeffs = vector.slice(1);
    while (coeffs.length && coeffs[0] === 0) {
      coeffs.shift();
      minExponent += 1;
    }
    while (coeffs.length && coeffs[coeffs.length - 1] === 0) coeffs.pop();
    return coeffs.length ? [minExponent].concat(coeffs) : [0];
  }

  function deltaPower(power) {
    let poly = new Map([[0, 1]]);
    const delta = new Map([
      [2, -1],
      [-2, -1]
    ]);
    for (let index = 0; index < power; index += 1) {
      poly = multiplyPoly(poly, delta);
    }
    return poly;
  }

  function addPoly(left, right) {
    const out = new Map(left);
    for (const [exponent, coeff] of right.entries()) {
      const next = (out.get(exponent) || 0) + coeff;
      if (next) out.set(exponent, next);
      else out.delete(exponent);
    }
    return out;
  }

  function multiplyPoly(left, right) {
    const out = new Map();
    for (const [leftExponent, leftCoeff] of left.entries()) {
      for (const [rightExponent, rightCoeff] of right.entries()) {
        const exponent = leftExponent + rightExponent;
        const coeff = (out.get(exponent) || 0) + (leftCoeff * rightCoeff);
        if (coeff) out.set(exponent, coeff);
        else out.delete(exponent);
      }
    }
    return out;
  }

  function shiftPoly(poly, shift) {
    return shiftScalePoly(poly, shift, 1);
  }

  function shiftScalePoly(poly, shift, scale) {
    const out = new Map();
    for (const [exponent, coeff] of poly.entries()) {
      if (coeff * scale) out.set(exponent + shift, coeff * scale);
    }
    return out;
  }

  function reducesToUnknot(occurrences) {
    if (!occurrences || !occurrences.length) return true;
    let sequence = occurrences.map((occurrence) => ({
      crossing: occurrence.crossing,
      over: occurrence.over
    }));
    if (crossingCountInSequence(sequence) <= 2) return true;

    let changed = true;
    while (changed && sequence.length) {
      changed = false;
      const r1 = findAdjacentSameCrossing(sequence);
      if (r1) {
        sequence = removeSequenceIndexes(sequence, r1);
        changed = true;
        continue;
      }
      const r2 = findSimpleBigon(sequence);
      if (r2) {
        sequence = removeSequenceIndexes(sequence, r2);
        changed = true;
      }
    }

    return sequence.length === 0 || crossingCountInSequence(sequence) <= 2;
  }

  function findAdjacentSameCrossing(sequence) {
    const total = sequence.length;
    for (let index = 0; index < total; index += 1) {
      const next = (index + 1) % total;
      if (sequence[index].crossing === sequence[next].crossing) return [index, next];
    }
    return null;
  }

  function findSimpleBigon(sequence) {
    const total = sequence.length;
    for (let index = 0; index < total; index += 1) {
      const next = (index + 1) % total;
      const first = sequence[index];
      const second = sequence[next];
      if (first.crossing === second.crossing) continue;
      for (let other = index + 2; other < total; other += 1) {
        const otherNext = (other + 1) % total;
        if (otherNext === index) continue;
        const third = sequence[other];
        const fourth = sequence[otherNext];
        const reversed = third.crossing === second.crossing && fourth.crossing === first.crossing;
        const matched = third.crossing === first.crossing && fourth.crossing === second.crossing;
        if (!reversed && !matched) continue;
        const firstMate = matched ? third : fourth;
        const secondMate = matched ? fourth : third;
        if (first.over !== firstMate.over && second.over !== secondMate.over) {
          return [index, next, other, otherNext];
        }
      }
    }
    return null;
  }

  function removeSequenceIndexes(sequence, indexes) {
    const remove = new Set(indexes);
    return sequence.filter((_, index) => !remove.has(index));
  }

  function crossingCountInSequence(sequence) {
    return new Set(sequence.map((occurrence) => occurrence.crossing)).size;
  }

  function normalizeTile(tile, sides) {
    if (typeof tile === 'number') return tileFromMask(tile, sides);
    if (!Array.isArray(tile)) return [];
    return tile
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const first = normalizeDir(pair[0], sides);
        const second = normalizeDir(pair[1], sides);
        if (first === second) return null;
        return [first, second];
      })
      .filter(Boolean);
  }

  function tileFromMask(mask, sides) {
    const dirs = [];
    for (let dir = 0; dir < sides; dir += 1) {
      if (mask & (1 << dir)) dirs.push(dir);
    }
    const pairs = [];
    for (let index = 0; index + 1 < dirs.length; index += 2) {
      pairs.push([dirs[index], dirs[index + 1]]);
    }
    return pairs;
  }

  function pairsCrossInTile(left, right, sides) {
    if (left[0] === right[0] || left[0] === right[1] || left[1] === right[0] || left[1] === right[1]) {
      return false;
    }
    const rightStartInside = dirBetweenCyclic(right[0], left[0], left[1], sides);
    const rightEndInside = dirBetweenCyclic(right[1], left[0], left[1], sides);
    return rightStartInside !== rightEndInside;
  }

  function isHexThreeDiameterTile(arcs, lattice) {
    if (lattice.shape !== 'hex' || arcs.length !== 3) return false;
    const keys = new Set(arcs.map(diameterKey).filter(Boolean));
    return keys.size === 3 && keys.has('0:3') && keys.has('1:4') && keys.has('2:5');
  }

  function diameterKey(arc) {
    if (!arc || arc.length < 2) return '';
    const first = Math.min(arc[0], arc[1]);
    const second = Math.max(arc[0], arc[1]);
    if ((first === 0 && second === 3) || (first === 1 && second === 4) || (first === 2 && second === 5)) {
      return `${first}:${second}`;
    }
    return '';
  }

  function crossingPositionAlongArc(arc, otherArc, lattice, useThreeDiameterDeformation) {
    const intersection = arcPathIntersection(arc, otherArc, lattice, useThreeDiameterDeformation);
    if (intersection && Number.isFinite(intersection.first)) {
      return clamp(intersection.first, 0, 1);
    }

    const span = modulo(arc[1] - arc[0], lattice.sides);
    if (span <= 0) return 0.5;
    for (const dir of otherArc) {
      const offset = modulo(dir - arc[0], lattice.sides);
      if (offset > 0 && offset < span) return offset / span;
    }
    return 0.5;
  }

  function arcPathIntersection(firstArc, secondArc, lattice, useThreeDiameterDeformation) {
    const firstPath = sampleArcPath(firstArc, lattice, useThreeDiameterDeformation);
    const secondPath = sampleArcPath(secondArc, lattice, useThreeDiameterDeformation);
    const hits = [];

    for (let firstIndex = 0; firstIndex + 1 < firstPath.length; firstIndex += 1) {
      const firstStart = firstPath[firstIndex];
      const firstEnd = firstPath[firstIndex + 1];
      for (let secondIndex = 0; secondIndex + 1 < secondPath.length; secondIndex += 1) {
        const secondStart = secondPath[secondIndex];
        const secondEnd = secondPath[secondIndex + 1];
        const hit = segmentIntersectionParameters(
          firstStart.point,
          firstEnd.point,
          secondStart.point,
          secondEnd.point
        );
        if (!hit || !isSegmentParameter(hit.first) || !isSegmentParameter(hit.second)) continue;

        hits.push({
          first: lerp(firstStart.t, firstEnd.t, hit.first),
          second: lerp(secondStart.t, secondEnd.t, hit.second)
        });
      }
    }

    if (!hits.length) return null;
    hits.sort((left, right) => Math.abs(left.first - 0.5) - Math.abs(right.first - 0.5));
    return hits[0];
  }

  function sampleArcPath(arc, lattice, useThreeDiameterDeformation) {
    const start = directionPoint(arc[0], lattice);
    const end = directionPoint(arc[1], lattice);
    const control = deformedArcControlPoint(arc, lattice, useThreeDiameterDeformation);
    if (!control) {
      return [
        { point: start, t: 0 },
        { point: end, t: 1 }
      ];
    }

    const samples = [];
    for (let index = 0; index <= ARC_DEFORMATION_SAMPLES; index += 1) {
      const t = index / ARC_DEFORMATION_SAMPLES;
      samples.push({
        point: quadraticPoint(start, control, end, t),
        t
      });
    }
    return samples;
  }

  function deformedArcControlPoint(arc, lattice, useThreeDiameterDeformation) {
    if (!useThreeDiameterDeformation || lattice.shape !== 'hex' || !isZeroThreeDiameter(arc)) return null;

    const start = directionPoint(0, lattice);
    const end = directionPoint(3, lattice);
    const vector = {
      x: end.x - start.x,
      y: end.y - start.y
    };
    const right = screenRightNormal(vector);
    return {
      x: (start.x + end.x) / 2 + (right.x * HEX_DIAMETER_NUDGE),
      y: (start.y + end.y) / 2 + (right.y * HEX_DIAMETER_NUDGE)
    };
  }

  function isZeroThreeDiameter(arc) {
    return (arc[0] === 0 && arc[1] === 3) || (arc[0] === 3 && arc[1] === 0);
  }

  function quadraticPoint(start, control, end, t) {
    const inverse = 1 - t;
    return {
      x: (inverse * inverse * start.x) + (2 * inverse * t * control.x) + (t * t * end.x),
      y: (inverse * inverse * start.y) + (2 * inverse * t * control.y) + (t * t * end.y)
    };
  }

  function segmentIntersectionParameters(firstStart, firstEnd, secondStart, secondEnd) {
    const first = {
      x: firstEnd.x - firstStart.x,
      y: firstEnd.y - firstStart.y
    };
    const second = {
      x: secondEnd.x - secondStart.x,
      y: secondEnd.y - secondStart.y
    };
    const denominator = cross2d(first, second);
    if (Math.abs(denominator) < 1e-9) return NaN;

    const delta = {
      x: secondStart.x - firstStart.x,
      y: secondStart.y - firstStart.y
    };
    return {
      first: cross2d(delta, second) / denominator,
      second: cross2d(delta, first) / denominator
    };
  }

  function directionPoint(dir, lattice) {
    const angle = lattice.angles[dir];
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  }

  function screenRightNormal(vector) {
    const length = Math.hypot(vector.x, vector.y);
    if (!Number.isFinite(length) || length < 1e-9) return { x: 0, y: 0 };
    return {
      x: -vector.y / length,
      y: vector.x / length
    };
  }

  function isSegmentParameter(value) {
    return Number.isFinite(value) && value >= -1e-8 && value <= 1 + 1e-8;
  }

  function lerp(start, end, t) {
    return start + ((end - start) * t);
  }

  function cross2d(left, right) {
    return (left.x * right.y) - (left.y * right.x);
  }

  function dirBetweenCyclic(dir, start, end, sides) {
    const span = modulo(end - start, sides);
    const offset = modulo(dir - start, sides);
    return offset > 0 && offset < span;
  }

  function neighbor(row, col, dir, rows, cols, lattice) {
    if (lattice.shape === 'square') {
      const deltas = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0]
      ];
      const [dr, dc] = deltas[dir];
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
      return { row: nextRow, col: nextCol };
    }

    const axial = offsetToAxial(row, col);
    const [dq, dr] = HEX_AXIAL_DELTAS[dir];
    const next = axialToOffset(axial.q + dq, axial.r + dr);
    if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) return null;
    return next;
  }

  function offsetToAxial(row, col) {
    return {
      q: col - Math.floor(row / 2),
      r: row
    };
  }

  function axialToOffset(q, r) {
    return {
      row: r,
      col: q + Math.floor(r / 2)
    };
  }

  function raysAlternate(rays) {
    if (rays.length !== 4) return false;
    return rays.every((ray, index) => ray.over !== rays[(index + 1) % rays.length].over);
  }

  function compareRaysByAngle(left, right) {
    return left.angle - right.angle;
  }

  function compareArcCrossingRefs(left, right) {
    const delta = left.position - right.position;
    if (Math.abs(delta) > 1e-9) return delta;
    if (left.arcIndex !== right.arcIndex) return left.arcIndex - right.arcIndex;
    return left.crossing.id - right.crossing.id;
  }

  function compareDtCodes(left, right) {
    if (left.length !== right.length) return left.length - right.length;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  }

  function compareKnotNames(left, right) {
    const leftParts = knotNameParts(left);
    const rightParts = knotNameParts(right);
    if (leftParts.crossing !== rightParts.crossing) return leftParts.crossing - rightParts.crossing;
    if (leftParts.rank !== rightParts.rank) return leftParts.rank - rightParts.rank;
    return left.localeCompare(right);
  }

  function knotNameParts(name) {
    const match = /^(\d+)_([0-9]+)$/.exec(name);
    return {
      crossing: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
      rank: match ? Number(match[2]) : Number.MAX_SAFE_INTEGER
    };
  }

  function formatPd(pd) {
    if (!pd.length) return EMPTY_PD;
    return `PD[${pd.map((entry) => `X[${entry.join(',')}]`).join(', ')}]`;
  }

  function formatDt(code) {
    return `DT[${code.join(',')}]`;
  }

  function displayName(name) {
    if (name === '0_1') return 'unknot (0_1)';
    if (name === '3_1') return 'trefoil knot (3_1)';
    if (name === '4_1') return 'figure-eight knot (4_1)';
    return `knot ${name}`;
  }

  function knotInfoHref(name) {
    return `https://knotinfo.org/diagram_display.php?${encodeURIComponent(name)}`;
  }

  function braidWordForName(name) {
    const data = getData();
    const word = data.braid && data.braid[name];
    return Array.isArray(word) ? word.slice() : null;
  }

  function invariantKey(conway, jones) {
    return `${JSON.stringify(conway || null)}|${JSON.stringify(jones || null)}`;
  }

  function getData() {
    return global.MosaicKnotData || {};
  }

  function keyOf(code) {
    return Array.isArray(code) ? code.join(',') : '';
  }

  function normalizeMethod(method) {
    return METHODS.includes(method) ? method : 'hybrid';
  }

  function normalizeDir(dir, sides) {
    const numeric = Number(dir);
    if (!Number.isFinite(numeric)) return 0;
    return modulo(Math.trunc(numeric), sides);
  }

  function normalizeAngle(angle) {
    return moduloFloat(angle, TWO_PI);
  }

  function modulo(value, size) {
    return ((value % size) + size) % size;
  }

  function moduloFloat(value, size) {
    return ((value % size) + size) % size;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toPositiveInt(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const integer = Math.trunc(numeric);
    return integer > 0 ? integer : 0;
  }

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function indexOf(row, col, cols) {
    return row * cols + col;
  }

  function failedDiagram(error, pd = '', dt = '') {
    return { ok: false, error, pd, dt };
  }

  class UnionFind {
    constructor() {
      this.parent = new Map();
    }

    add(value) {
      if (!this.parent.has(value)) this.parent.set(value, value);
    }

    find(value) {
      this.add(value);
      const parent = this.parent.get(value);
      if (parent === value) return value;
      const root = this.find(parent);
      this.parent.set(value, root);
      return root;
    }

    union(left, right) {
      const leftRoot = this.find(left);
      const rightRoot = this.find(right);
      if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
    }

    countRoots() {
      const roots = new Set();
      for (const value of this.parent.keys()) roots.add(this.find(value));
      return roots.size;
    }
  }

  global.MosaicKnotEngine = {
    identify,
    buildDiagram,
    normalizeMethod
  };
})(typeof window !== 'undefined' ? window : globalThis);
