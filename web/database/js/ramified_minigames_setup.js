(() => {
  'use strict';

  const DIRS = { E: 0, S: 1, W: 2, N: 3 };
  const OFFSETS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const GLUE_COLORS = ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'];

  const PRESETS = [
    {
      id: 'classic-4x4',
      label: '4*4 classic',
      rows: 4,
      cols: 4,
      surface: 'square grid',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    {
      id: 'half-glued',
      label: 'half-glued',
      rows: 4,
      cols: 4,
      surface: 'half-glued',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 0, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 0, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } },
        { group: 1, first: { row: 4, col: 1, dir: DIRS.W }, second: { row: 1, col: 4, dir: DIRS.E } },
        { group: 1, first: { row: 3, col: 1, dir: DIRS.W }, second: { row: 2, col: 4, dir: DIRS.E } }
      ]
    },
    {
      id: 'torus',
      label: 'torus',
      rows: 4,
      cols: 4,
      surface: 'M_1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 1, col: 1, dir: DIRS.W } },
        { group: 4, first: { row: 1, col: 3, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 2, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 4, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } }
      ]
    },
    {
      id: 'klein-bottle',
      label: 'Klein bottle',
      rows: 4,
      cols: 4,
      surface: 'N_2',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, reversed: true, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 1, col: 1, dir: DIRS.W } },
        { group: 4, first: { row: 1, col: 3, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 2, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 4, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } }
      ]
    },
    {
      id: 'ramified-cover',
      label: 'ramified cover',
      rows: 4,
      cols: 9,
      surface: 'ramified cover',
      removedTiles: [
        { row: 1, col: 5 },
        { row: 2, col: 5 },
        { row: 3, col: 5 },
        { row: 4, col: 5 }
      ],
      cutEdges: [
        { left: { row: 2, col: 3 }, right: { row: 3, col: 3 } },
        { left: { row: 2, col: 4 }, right: { row: 3, col: 4 } },
        { left: { row: 2, col: 8 }, right: { row: 3, col: 8 } },
        { left: { row: 2, col: 9 }, right: { row: 3, col: 9 } }
      ],
      gluedEdges: [
        { group: 0, first: { row: 2, col: 3, dir: DIRS.S }, second: { row: 3, col: 9, dir: DIRS.N } },
        { group: 0, first: { row: 2, col: 4, dir: DIRS.S }, second: { row: 3, col: 8, dir: DIRS.N } },
        { group: 1, first: { row: 3, col: 3, dir: DIRS.N }, second: { row: 2, col: 8, dir: DIRS.S } },
        { group: 1, first: { row: 3, col: 4, dir: DIRS.N }, second: { row: 2, col: 9, dir: DIRS.S } }
      ]
    }
  ];

  const refs = {};
  let numberBoxes = [];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.select = document.getElementById('surface-preset-select');
    refs.boxStyle = document.getElementById('number-box-style');
    refs.begin = document.getElementById('begin-game');
    refs.statusBadge = document.getElementById('status-badge');
    refs.statusLine = document.getElementById('status-line');
    refs.infoLine = document.getElementById('info-line');
    if (!refs.canvas || !refs.ctx || !refs.select) return;

    refs.select.addEventListener('change', () => {
      numberBoxes = [];
      renderSelectedPreset();
    });
    if (refs.boxStyle) refs.boxStyle.addEventListener('change', renderSelectedPreset);
    if (refs.begin) {
      refs.begin.addEventListener('click', () => {
        const preset = selectedPreset();
        numberBoxes = spawnInitialBoxes(preset);
        drawPreset(preset);
        if (refs.statusBadge) refs.statusBadge.textContent = 'ready';
        if (refs.statusLine) refs.statusLine.textContent = `${preset.label} game seed`;
        if (refs.infoLine) refs.infoLine.textContent = `${numberBoxes.length} number box${numberBoxes.length === 1 ? '' : 'es'} generated`;
      });
    }
    window.addEventListener('resize', renderSelectedPreset);
    renderSelectedPreset();
  }

  function selectedPreset() {
    return PRESETS.find((preset) => preset.id === refs.select.value) || PRESETS[0];
  }

  function renderSelectedPreset() {
    const preset = selectedPreset();
    drawPreset(preset);
    if (refs.statusBadge) refs.statusBadge.textContent = 'setup';
    if (refs.statusLine) refs.statusLine.textContent = `${preset.label} preview`;
    if (refs.infoLine) {
      const removed = preset.removedTiles.length;
      const glued = preset.gluedEdges.length;
      const cuts = preset.cutEdges.length;
      const unmatched = countUnmatchedBoundaries(preset);
      refs.infoLine.textContent = `${preset.rows}x${preset.cols}, ${preset.surface}, ${unmatched} unmatched, ${removed} removed, ${cuts} cut, ${glued} glued`;
    }
  }

  function drawPreset(preset) {
    const wrap = refs.canvas.parentElement;
    const widthAvailable = Math.max(280, Math.floor(wrap ? wrap.clientWidth : refs.canvas.clientWidth || 720));
    const margin = widthAvailable < 430 ? 18 : 28;
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2.5);
    const size = Math.min(Math.max((widthAvailable - margin * 2) / preset.cols, 24), 58);
    const radius = size / 2;
    const logicalWidth = Math.ceil((preset.cols * size) + margin * 2);
    const logicalHeight = Math.ceil((preset.rows * size) + margin * 2);
    refs.canvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.canvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ctx = refs.ctx;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    const geom = {
      margin,
      radius,
      size,
      cols: preset.cols,
      cells: []
    };
    const removed = new Set(preset.removedTiles.map(tileKey));

    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        geom.cells[indexOf(row, col, preset.cols)] = {
          row,
          col,
          x: margin + radius + ((col - 1) * size),
          y: margin + radius + ((row - 1) * size)
        };
        drawTile(ctx, geom, row, col, removed.has(`${row}:${col}`));
      }
    }
    drawBackgroundBoundaries(ctx, geom, preset, removed);
    drawGlueEdges(ctx, geom, preset);
    drawNumberBoxes(ctx, geom);
  }

  function drawTile(ctx, geom, row, col, removed) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const points = squarePoints(cell.x, cell.y, geom.radius * 0.96);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = removed ? '#e9e0d0' : '#fbf5e8';
    ctx.strokeStyle = '#d8c9ac';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    if (!removed) return;
    const mark = geom.radius * 0.28;
    ctx.strokeStyle = 'rgba(128,98,69,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cell.x - mark, cell.y - mark);
    ctx.lineTo(cell.x + mark, cell.y + mark);
    ctx.moveTo(cell.x + mark, cell.y - mark);
    ctx.lineTo(cell.x - mark, cell.y + mark);
    ctx.stroke();
  }

  function drawBackgroundBoundaries(ctx, geom, preset, removed) {
    const glued = gluedEdgeKeySet(preset);
    const cuts = cutEdgeKeySet(preset);
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.8, geom.radius * 0.055);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        if (removed.has(`${row}:${col}`)) continue;
        for (let dir = 0; dir < 4; dir += 1) {
          if (glued.has(boundaryEdgeKey({ row, col, dir }, preset.cols))) continue;
          const next = neighbor(row, col, dir, preset);
          const boundary = !next
            || removed.has(`${next.row}:${next.col}`)
            || cuts.has(cutKey(indexOf(row, col, preset.cols), indexOf(next.row, next.col, preset.cols)));
          if (boundary) drawBackgroundBoundarySegment(ctx, edgeSegment(geom, row, col, dir));
        }
      }
    }
    ctx.restore();
  }

  function countUnmatchedBoundaries(preset) {
    const glued = gluedEdgeKeySet(preset);
    const cuts = cutEdgeKeySet(preset);
    const removed = new Set(preset.removedTiles.map(tileKey));
    let count = 0;
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        if (removed.has(`${row}:${col}`)) continue;
        for (let dir = 0; dir < 4; dir += 1) {
          if (glued.has(boundaryEdgeKey({ row, col, dir }, preset.cols))) continue;
          const next = neighbor(row, col, dir, preset);
          const boundary = !next
            || removed.has(`${next.row}:${next.col}`)
            || cuts.has(cutKey(indexOf(row, col, preset.cols), indexOf(next.row, next.col, preset.cols)));
          if (boundary) count += 1;
        }
      }
    }
    return count;
  }

  function drawGlueEdges(ctx, geom, preset) {
    ctx.save();
    preset.gluedEdges.forEach((pair, index) => {
      const color = GLUE_COLORS[((pair.group || 0) % GLUE_COLORS.length + GLUE_COLORS.length) % GLUE_COLORS.length];
      drawGlueHalf(ctx, geom, pair.first, color, glueFirstArrowReversed(pair));
      drawGlueHalf(ctx, geom, pair.second, color, glueSecondArrowReversed(pair));
    });
    ctx.restore();
  }

  function drawGlueHalf(ctx, geom, edge, color, reverse) {
    const segment = edgeSegment(geom, edge.row, edge.col, edge.dir);
    const lineWidth = Math.max(1.8, geom.radius * 0.055) * 1.15;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawBackgroundBoundarySegment(ctx, segment);
    drawSegmentArrow(ctx, segment, reverse, color, lineWidth, geom.radius);
    ctx.restore();
  }

  function spawnInitialBoxes(preset) {
    const removed = new Set(preset.removedTiles.map(tileKey));
    const candidates = [];
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        if (!removed.has(`${row}:${col}`)) candidates.push({ row, col });
      }
    }
    shuffle(candidates);
    return candidates.slice(0, 2).map((tile) => ({
      row: tile.row,
      col: tile.col,
      value: Math.random() < 0.9 ? 2 : 4
    }));
  }

  function drawNumberBoxes(ctx, geom) {
    if (!numberBoxes.length) return;
    const style = refs.boxStyle ? refs.boxStyle.value : 'paper';
    numberBoxes.forEach((box) => {
      const cell = geom.cells[indexOf(box.row, box.col, geom.cols)];
      if (!cell) return;
      if (style === 'ink') drawInkBox(ctx, cell, geom.radius, box.value);
      else if (style === 'color') drawColorBox(ctx, cell, geom.radius, box.value);
      else drawPaperBox(ctx, cell, geom.radius, box.value);
    });
  }

  function drawPaperBox(ctx, cell, radius, value) {
    const side = radius * 1.24;
    const x = cell.x - side / 2;
    const y = cell.y - side / 2;
    ctx.save();
    ctx.fillStyle = '#efe4cb';
    ctx.strokeStyle = '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.04);
    ctx.shadowColor = 'rgba(45,34,22,0.18)';
    ctx.shadowBlur = radius * 0.1;
    ctx.shadowOffsetY = radius * 0.05;
    ctx.fillRect(x, y, side, side);
    ctx.shadowColor = 'transparent';
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, cell, radius, value, '#2f2118');
    ctx.restore();
  }

  function drawInkBox(ctx, cell, radius, value) {
    const side = radius * 1.18;
    const x = cell.x - side / 2;
    const y = cell.y - side / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(255,253,248,0.88)';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.8, radius * 0.06);
    ctx.fillRect(x, y, side, side);
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, cell, radius, value, '#111111');
    ctx.restore();
  }

  function drawColorBox(ctx, cell, radius, value) {
    const side = radius * 1.26;
    const x = cell.x - side / 2;
    const y = cell.y - side / 2;
    ctx.save();
    ctx.fillStyle = value === 2 ? '#d8b071' : '#c47f17';
    ctx.strokeStyle = value === 2 ? '#8b6f3e' : '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.045);
    ctx.fillRect(x, y, side, side);
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, cell, radius, value, value === 2 ? '#2f2118' : '#fffdf8');
    ctx.restore();
  }

  function drawBoxText(ctx, cell, radius, value, color) {
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.max(16, Math.round(radius * 0.72))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), cell.x, cell.y + radius * 0.02);
  }

  function drawBackgroundBoundarySegment(ctx, segment) {
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  function drawSegmentArrow(ctx, segment, reverse, color, lineWidth, radius) {
    const start = reverse ? segment.end : segment.start;
    const end = reverse ? segment.start : segment.end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return;
    const ux = dx / length;
    const uy = dy / length;
    const size = Math.max(5.5, radius * 0.15);
    const tip = {
      x: start.x + dx * 0.62,
      y: start.y + dy * 0.62
    };
    const base = {
      x: tip.x - ux * size,
      y: tip.y - uy * size
    };
    const normal = { x: -uy, y: ux };
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(base.x + normal.x * size * 0.46, base.y + normal.y * size * 0.46);
    ctx.lineTo(base.x - normal.x * size * 0.46, base.y - normal.y * size * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1, lineWidth * 0.58);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function edgeSegment(geom, row, col, dir) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const points = squarePoints(cell.x, cell.y, geom.radius * 0.96);
    return {
      start: points[(dir + 1) % 4],
      end: points[(dir + 2) % 4]
    };
  }

  function squarePoints(x, y, radius) {
    return [
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y - radius },
      { x: x + radius, y: y + radius },
      { x: x - radius, y: y + radius }
    ];
  }

  function neighbor(row, col, dir, preset) {
    const nextRow = row + OFFSETS[dir][0];
    const nextCol = col + OFFSETS[dir][1];
    if (nextRow < 1 || nextRow > preset.rows || nextCol < 1 || nextCol > preset.cols) return null;
    return { row: nextRow, col: nextCol };
  }

  function gluedEdgeKeySet(preset) {
    const keys = new Set();
    preset.gluedEdges.forEach((pair) => {
      keys.add(boundaryEdgeKey(pair.first, preset.cols));
      keys.add(boundaryEdgeKey(pair.second, preset.cols));
    });
    return keys;
  }

  function cutEdgeKeySet(preset) {
    const keys = new Set();
    preset.cutEdges.forEach((edge) => {
      keys.add(cutKey(indexOf(edge.left.row, edge.left.col, preset.cols), indexOf(edge.right.row, edge.right.col, preset.cols)));
    });
    return keys;
  }

  function boundaryEdgeKey(edge, cols) {
    return `${indexOf(edge.row, edge.col, cols)}:${edge.dir}`;
  }

  function cutKey(left, right) {
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function glueFirstArrowReversed(pair) {
    if (Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed')) return !!pair.firstArrowReversed;
    return !!pair.reversed;
  }

  function glueSecondArrowReversed(pair) {
    if (Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed')) return !!pair.secondArrowReversed;
    return true;
  }

  function indexOf(row, col, cols) {
    return (row - 1) * cols + (col - 1);
  }

  function tileKey(tile) {
    return `${tile.row}:${tile.col}`;
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = items[index];
      items[index] = items[swap];
      items[swap] = current;
    }
    return items;
  }
})();
