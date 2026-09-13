import { tk } from './locales.mjs';
import { Strand, operations } from './kernel.mjs';
export const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
export const code = text => { const n = el('pre', text); n.lang = 'en'; n.dataset.i18nIgnore = ''; return n; };
const svgEl = (name, attrs = {}, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text !== undefined) n.textContent = text; return n; };
function svg(width = 500, height = 260) { return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'diagram', role: 'img', 'aria-label': tk('visual') }); }
export function partitionGrid(rows, { hooks, inner = [], edit } = {}) {
  const wrap = el('div', undefined, 'partition-grid'), width = Math.max(1, (rows[0] || 0) + (edit ? 1 : 0));
  wrap.style.gridTemplateColumns = `repeat(${width}, 26px)`;
  for (let r = 0; r < rows.length + (edit ? 1 : 0); r++) {
    for (let c = 0; c < width; c++) {
      const exists = c < (rows[r] || 0) && c >= (inner[r] || 0);
      const canAdd = edit && c === (rows[r] || 0) && (r === 0 || c < rows[r - 1]);
      const canRemove = edit && c === rows[r] - 1 && c >= (rows[r + 1] || 0);
      const cell = el(edit && (canAdd || canRemove) ? 'button' : 'span', exists ? String(hooks?.[r]?.[c] ?? '') : canAdd ? '+' : '', `partition-cell${exists ? '' : canAdd ? ' boundary' : ' blank'}`);
      if (cell.tagName === 'BUTTON') {
        cell.type = 'button'; cell.setAttribute('aria-label', tk('cell', { r: r + 1, c: c + 1 }));
        cell.onclick = () => { const next = [...rows]; next[r] = c + (canAdd ? 1 : 0); while (next.at(-1) === 0) next.pop(); edit(next); };
      }
      wrap.append(cell);
    }
  }
  return wrap;
}
function matrixTable(rows) {
  const table = el('table', undefined, 'matrix-table');
  const body = el('tbody');
  for (const row of rows) { const tr = el('tr'); row.forEach(value => tr.append(el('td', String(value)))); body.append(tr); }
  table.append(body); return table;
}
function pointsDiagram(points, edges = [], closed = false) {
  const numeric = points.map(p => p.slice(0, 2).map(x => { const [n, d = '1'] = String(x).split('/'); return Number(n) / Number(d); })).filter(p => p.every(Number.isFinite));
  const s = svg(); if (!numeric.length) return s;
  const xs = numeric.map(p => p[0]), ys = numeric.map(p => p[1] || 0), xmin = Math.min(0, ...xs), xmax = Math.max(1, ...xs), ymin = Math.min(0, ...ys), ymax = Math.max(1, ...ys);
  const x = v => 35 + (v - xmin) / (xmax - xmin) * 430, y = v => 225 - (v - ymin) / (ymax - ymin) * 190;
  s.append(svgEl('line', { x1: 25, x2: 475, y1: y(0), y2: y(0), stroke: '#bac8bc' }), svgEl('line', { x1: x(0), x2: x(0), y1: 20, y2: 235, stroke: '#bac8bc' }));
  if (closed) s.append(svgEl('polygon', { points: numeric.map(p=>`${x(p[0])},${y(p[1]||0)}`).join(' '), fill:'#d2e4cc',stroke:'#236754','stroke-width':2 }));
  for(const [i,j] of edges) if(numeric[i]&&numeric[j]) s.append(svgEl('line',{x1:x(numeric[i][0]),y1:y(numeric[i][1]||0),x2:x(numeric[j][0]),y2:y(numeric[j][1]||0),stroke:'#70947c','stroke-width':1.5}));
  numeric.forEach((p, i) => { s.append(svgEl('circle', { cx: x(p[0]), cy: y(p[1] || 0), r: 5, fill: '#236754' })); s.append(svgEl('text', { x: x(p[0]) + 8, y: y(p[1] || 0) - 5, 'font-size': 11 }, `(${points[i].join(', ')})`)); });
  return s;
}
function strandDiagram(a) {
  const model = Strand.makeBraidDiagram(a.rank, a.word, 'up-down', 'braid');
  const s = svg(400, 320), g = svgEl('g', { transform: 'translate(20 10) scale(360 300)' });
  const colors = ['#236754', '#a46238', '#596a9b', '#89719a'];
  model.paths.forEach((path, i) => g.append(svgEl('path', { d: Strand.pathToSvgData(path), fill: 'none', stroke: colors[i % colors.length], 'stroke-width': .008 })));
  for (const o of model.overlays) {
    for (const [color, width] of [['white', .022], ['#233c38', .006]]) g.append(svgEl('line', { x1: o.from.x, y1: o.from.y, x2: o.to.x, y2: o.to.y, stroke: color, 'stroke-width': width }));
  }
  s.append(g); return s;
}
function conicDiagram(a) {
  const number = x => {const [n,d='1']=String(x).split('/');return Number(n)/Number(d);};
  const centre=a.center.map(number), g=a.gram.map(row=>row.map(number)), r=number(a.radiusSquared);
  if(a.kind==='point') return pointsDiagram([a.center]);
  const points=[];
  for(let i=0;i<96;i++) {const theta=i*Math.PI*2/96, x=Math.cos(theta),y=Math.sin(theta),scale=Math.sqrt(r/(g[0][0]*x*x+2*g[0][1]*x*y+g[1][1]*y*y));points.push([centre[0]+scale*x,centre[1]+scale*y].map(String));}
  // Omit numerical sample labels; the inspector retains the exact coefficients.
  const s=pointsDiagram(points,[],true);s.querySelectorAll('text,circle').forEach(n=>n.remove());return s;
}
function categoryDiagram(a) {
  const s = svg(600, 240), positions = new Map(a.objects.map((name, i) => [name, [50 + i * (500 / Math.max(1, a.objects.length - 1)), 130]]));
  for (const m of a.morphisms) {
    const p = positions.get(m.source), q = positions.get(m.target);
    const d = m.source === m.target ? `M${p[0]-10},120 C${p[0]-70},20 ${p[0]+70},20 ${p[0]+10},120` : `M${p[0]+15},125 Q${(p[0]+q[0])/2},50 ${q[0]-15},125`;
    s.append(svgEl('path', { d, fill: 'none', stroke: '#236754', 'stroke-width': 2 }));
    s.append(svgEl('text', { x: (p[0] + q[0]) / 2, y: 75, 'text-anchor': 'middle', 'font-size': 16 }, `${m.id} →`));
  }
  for (const [name, [x, y]] of positions) { s.append(svgEl('circle', { cx: x, cy: y, r: 19, fill: '#e1ecdc', stroke: '#70947c' })); s.append(svgEl('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15 }, name)); }
  return s;
}
function surfaceDiagram(snapshot) {
  const s = svg(400, 300), rows = snapshot.rows || 1, cols = snapshot.cols || 1;
  const size = Math.min(240 / rows, 320 / cols), ox = (400 - cols * size) / 2, oy = (300 - rows * size) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (snapshot.activeTiles && !snapshot.activeTiles[r * cols + c]) continue;
    s.append(svgEl('rect', { x: ox + c * size, y: oy + r * size, width: size, height: size, fill: '#e5eddf', stroke: '#72937b' }));
  }
  if (snapshot.lattice !== 'square') return code(JSON.stringify(snapshot, null, 2));
  const side = (index, dir) => { const x = ox + (index % cols) * size, y = oy + Math.floor(index / cols) * size; return [[x + size, y + size / 2], [x + size / 2, y + size], [x, y + size / 2], [x + size / 2, y]][dir]; };
  (snapshot.gluedEdges || []).forEach((pair, i) => [pair.first, pair.second].forEach(edge => {
    const point = side(edge.index, edge.dir); if (point) s.append(svgEl('text', { x: point[0], y: point[1], 'text-anchor': 'middle', fill: '#a46238', 'font-size': 18 }, `${i + 1}${pair.reversed ? '↔' : '→'}`));
  }));
  return s;
}
export async function renderAsset(asset, container, { mode = 'visual', edit } = {}) {
  const a = asset.data;
  if (mode === 'data') { container.append(code(JSON.stringify({ type: asset.type, data: a, context: asset.context, assumptions: asset.assumptions }, null, 2))); return; }
  switch (asset.type) {
    case 'partition': container.append(partitionGrid(a.rows, { edit })); if (edit) container.append(el('p', tk('partitionHelp'), 'hint')); break;
    case 'skew': container.append(partitionGrid(a.outer, { inner: a.inner })); break;
    case 'hookTable': container.append(partitionGrid(a.hooks.map(r => r.length), { hooks: a.hooks }), el('p', tk('hooksCount', { cells: a.size, count: a.standardTableaux }))); break;
    case 'matrix': container.append(matrixTable(a.rows)); break;
    case 'numericMatrix': container.append(matrixTable(a.rows.map(row=>row.map(z=>Number(z.im)===0?z.re:`${z.re} + (${z.im})i`)))); break;
    case 'matrixDecomposition':
      for(const [name,rows] of Object.entries(a.factors)) {
        container.append(code(name),matrixTable(rows.map(row=>row.map(z=>Number(z.im)===0?z.re:`${z.re} + (${z.im})i`))));
      }
      container.append(code(JSON.stringify(a.diagnostics,null,2))); break;
    case 'scalar': container.append(el('p', String(a.value), 'asset-name')); break;
    case 'invariantTable': {
      if (a.entries) {
        const table = el('table', undefined, 'matrix-table'), header = el('tr'); header.append(el('th', 'p \\ q'));
        a.entries[0].forEach((_, i) => header.append(el('th', String(i)))); table.append(header);
        a.entries.forEach((row, i) => { const tr = el('tr'); tr.append(el('th', String(i))); row.forEach(v => tr.append(el('td', v))); table.append(tr); }); container.append(table);
      } else if (a.dimensions) {
        const table = el('table', undefined, 'matrix-table'), head = el('tr'), values = el('tr');
        a.dimensions.forEach((v, i) => { head.append(el('th', `h^${i}`)); values.append(el('td', v)); }); table.append(head, values); container.append(table);
      } else container.append(code(JSON.stringify(a, null, 2)));
      break;
    }
    case 'variety': container.append(el('p', a.type === 'projective' ? `ℙ${String(a.dim).replace(/[0-9]/g, n => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)])}` : a.type === 'grassmannian' ? `Gr(${a.r}, ${a.n})` : `${a.type} · dim ${a.dim}`, 'asset-name')); break;
    case 'sheaf': container.append(el('p', a.type === 'line-bundle' ? `𝒪(${a.twist})` : '𝒪', 'asset-name')); break;
    case 'symmetricFunction': container.append(code(a.terms.map(t=>`${t.coefficient} ${a.basis}[${t.partition.join(',')}]`).join(' + ') || '0')); break;
    case 'symmetricPolynomial': container.append(code(a.terms.map(t=>`${t.coefficient} ${t.exponents.map((e,i)=>e?`${a.variables[i]}${e===1?'':`^${e}`}`:'').filter(Boolean).join('*')}`).join(' + ') || '0')); break;
    case 'polytope': container.append(el('p',tk('coordinateProjection'),'hint'),pointsDiagram(a.vertices,a.edges)); break;
    case 'slice2d':
      if(a.kind==='empty') container.append(el('p',tk('emptySection')));
      else container.append(pointsDiagram(a.vertices, a.kind==='segment'&&a.vertices.length>1?[[0,a.vertices.length-1]]:[],a.kind==='polygon'));
      if(a.touchesClipBoundary) container.append(el('p',tk('clippedSection'),'hint'));
      break;
    case 'conic2d': if(a.kind==='empty') container.append(el('p',tk('emptySection'))); else container.append(conicDiagram(a),el('p',tk('exactConic'),'hint')); break;
    case 'permutation': container.append(matrixTable([a.values.map((_,i)=>i+1),a.values])); break;
    case 'symbolicCategory': {
      container.append(el('p',`${a.label}${a.opposite?'ᵒᵖ':''}`,'asset-name'));
      container.append(code(`Ob = { ${a.objectSymbol} : ${a.objectCondition || '?'} }\nHom = { ${a.morphismElement} : ${a.morphismCondition || '?'} }`));break;
    }
    case 'symbolicFunctor': container.append(code(`${a.label}: ${a.source.label}${a.source.opposite?'^op':''} → ${a.target.label}${a.target.opposite?'^op':''}\n${a.variance}\n${a.source.morphismElement} ↦ ${a.label}(${a.source.morphismElement})`)); break;
    case 'numberField': container.append(el('p',a.payload.field.label,'asset-name'),code(JSON.stringify(a.payload.field,null,2)));break;
    case 'decomposition':
      container.append(el('p', tk('decompositionTerms', { count: a.terms.length }), 'hint'));
      for (const term of a.terms) { const row = el('div', undefined, 'term-row'); row.append(el('strong', `${term.coefficient} ×`)); if (term.nu) row.append(partitionGrid(term.nu)); else row.append(code(JSON.stringify(term))); if (term.dimension) row.append(el('span', `dim = ${term.dimension}`)); container.append(row); }
      break;
    case 'rootSystem': {
      const C = (await operations.get('cartan').run(asset)).data.rows, s = svg(500, 180), positions = C.map((_, i) => [40 + 420 * i / Math.max(1, C.length - 1), i % 2 ? 105 : 75]);
      C.forEach((r, i) => r.forEach((n, j) => { if (j > i && Number(n)) { const [x1, y1] = positions[i], [x2, y2] = positions[j]; s.append(svgEl('line', { x1, y1, x2, y2, stroke: '#236754', 'stroke-width': 2 })); const m = Math.max(Math.abs(Number(n)), Math.abs(Number(C[j][i]))); if (m > 1) s.append(svgEl('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7, 'font-size': 12 }, `${n}/${C[j][i]}`)); } }));
      positions.forEach(([x, y], i) => { s.append(svgEl('circle', { cx: x, cy: y, r: 8, fill: '#e1ecdc', stroke: '#236754', 'stroke-width': 2 })); s.append(svgEl('text', { x, y: y + 25, 'text-anchor': 'middle', 'font-size': 12 }, String(i + 1))); });
      container.append(s); break;
    }
    case 'points': container.append(el('p',tk('coordinateProjection'),'hint'),pointsDiagram(a.points)); break;
    case 'cone': container.append(el('p',tk('coordinateProjection'),'hint'),pointsDiagram(a.generators.map(g => g.coordinates))); break;
    case 'strand': container.append(strandDiagram(a)); break;
    case 'category': container.append(categoryDiagram(a)); break;
    case 'surface': container.append(surfaceDiagram(a.snapshot)); break;
    case 'ramification': {
      const table = el('table', undefined, 'matrix-table');
      for (const p of a.places) { const row = el('tr'); row.append(el('td', p.label), el('td', p.behavior || p.status), el('td', (p.components || []).map(c => `(e=${c.e ?? '?'}, f=${c.f ?? '?'})`).join(', '))); table.append(row); }
      container.append(table); break;
    }
    default: container.append(code(JSON.stringify(a, null, 2)));
  }
}
