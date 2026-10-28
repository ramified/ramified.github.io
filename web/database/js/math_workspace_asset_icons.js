(function (root) {
  'use strict';
  const generic = { 'mosaic-space':'⬡','mosaic-diagram':'⋈', filtration:'⊏',complex:'•→•','field-extension':'L/K', number: '𝑎', young: '▦', lie: '𝔤', field: '𝑅', dynkin: '●—●', strands: '⋈', matrix: '▦', category: '𝒞', functor: '⇒', variety: '𝕍', sheaf: 'ℱ', map: '→', frame:'⊞', point:'•', vector:'↗', polytope:'⬡', sphere:'◯', roots:'✳', lattice:'▦', voronoi:'⬡', formula:'ƒ', tropical:'⊕', weyl:'◈', cone:'△', fan:'⋔' };
  const defaults = Object.freeze({ exactColor: '', genericColor: '#a8510b', stroke: 0.7, strandStroke:19, hatch: true,
    matrixStroke: 2.1, matrixEntryStroke: 0.7, matrixFontSize: 20, matrixFontFamily: '"Times New Roman", serif',
    matrixRowGap: 0, matrixColumnGap: 0, matrixBracketGap: 1, matrixBracketCurve: 3, matrixPadding: 0,
    fanNegativeLength:0.7,coneNegativeLength:0.7 });
  const representatives = {
    filtration:{kind:'filtration',variant:'flag'},
    complex:{kind:'complex',variant:'differentials'},
    'field-extension':{kind:'field-extension',variant:'quotient'},
    polytope:{kind:'polytope',variant:'simplex'},
    voronoi:{kind:'voronoi',variant:'cell-patch'},
    sphere:{kind:'sphere',variant:'sphere'},
    roots:{kind:'roots'},
    weyl:{kind:'weyl'},
    frame:{kind:'frame'},
    fan:{kind:'fan',emphasizedCone:null},
    cone:{kind:'cone',emphasizedCone:0},
    sheaf:{kind:'sheaf',name:'\\mathcal{F}',fallback:'ℱ'},
    lattice:{kind:'lattice',points:Array.from({length:3},(_,j)=>Array.from({length:3},(_,i)=>({x:i-1+(j-1)/2,y:(j-1)*Math.sqrt(3)/2}))).flat()},
    dynkin:{kind:'dynkin',family:'D',rank:5,vertices:[2],quiver:null},
    lie:{kind:'lie',name:'E_{6}',fallback:'E6'},
    young:{kind:'young',rows:[3,1],positive:3,negative:0},
    strands:{kind:'strands',groupType:'symmetric',strandCount:3,generators:[{family:'braid',index:1,sign:1},{family:'braid',index:2,sign:-1}]},
    matrix:{kind:'matrix',entries:[['*','*'],['*','*']]}
  };
  let settings = { ...defaults }, patternId = 0;
  const cache = new Map();
  const fittedHosts = new Set();
  let fitObserver = null;
  let matrixMeasureContext = null;
  const dynkinGeometry = root.DynkinDiagramGeometry || (typeof require === 'function' ? require('./dynkin_diagram_geometry.js') : null);
  const greek = 'alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi omicron pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega'.split(' ');
  function letterName(value) {
    let text = String(value || '').trim();
    const atom = '(?:[A-Za-z\\u0370-\\u03ff]|\\\\(?:' + greek.join('|') + ')(?![A-Za-z]))';
    const base = new RegExp('^(?:' + atom + '|\\\\(?:mathcal|mathscr|mathfrak|mathbb|mathbf|mathrm|mathsf|mathtt|mathit)\\s*\\{\\s*' + atom + '\\s*\\})');
    const match = text.match(base); if (!match) return false;
    text = text.slice(match[0].length); const seen = new Set();
    while (text.trim()) {
      text = text.trimStart(); const script = text[0];
      if (!['_', '^'].includes(script) || seen.has(script)) return false;
      seen.add(script); text = text.slice(1).trimStart();
      if (text[0] === '{') {
        let depth = 0, end = -1;
        for (let i = 0; i < text.length; i++) { if (text[i] === '{') depth++; if (text[i] === '}' && --depth === 0) { end = i; break; } }
        if (end < 1) return false;
        const content = text.slice(1, end);
        if (!/^[A-Za-z0-9\s+\-.,{}\\_^]*$/.test(content) || /\\(?:href|html|style|class|require|def|newcommand)\b/.test(content)) return false;
        text = text.slice(end + 1);
      } else {
        const m = text.match(new RegExp('^(?:' + atom + '|[0-9])')); if (!m) return false;
        text = text.slice(m[0].length);
      }
    }
    return true;
  }
  function describeValue(asset, resolve = () => null) {
    if (asset.kind === 'mosaic-space' || asset.kind === 'mosaic-diagram') return { source: 'generic', kind: asset.kind, symbol: generic[asset.kind] };
    if (asset.kind === 'matrix') {
      let data = asset.data || {};
      if (data.construction) {
        try { data = root.MathWorkspaceSlicing.materialize(asset, [resolve(data.construction.lie)].filter(Boolean)).data; }
        catch (_) { return { source: 'generic', representative: representatives.matrix }; }
      }
      const { rows, cols, entries } = data;
      if ([rows, cols].every(n => Number.isInteger(n) && n >= 1 && n <= 4)) {
        const values = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => integerEntry(entries?.[r]?.[c])));
        const exact = values.every(row => row.every(value => value !== null));
        return { source: exact ? 'diagram' : 'generic', kind: 'matrix', entries: exact ? values : values.map(row => row.map(() => '*')) };
      }
    } else if (asset.kind === 'young') {
      const rows = asset.data.rows || [], positive = Math.max(0, ...rows), negative = -Math.min(0, ...rows);
      if (rows.some(Boolean) && rows.length <= 5 && (asset.type === 'generalized' ? positive + negative <= 6 : positive <= 5)) return { source: 'diagram', kind: 'young', rows, positive, negative };
    } else if (asset.kind === 'dynkin') {
      const lie = resolve(asset.data?.lie), model = root.MathWorkspaceObjects;
      if (dynkinGeometry && lie && model && !model.rootObjectIssues(asset,lie).length && !model.lieEngineIssues(lie.data,'dynkin').length) return {source:'diagram',kind:'dynkin',...lie.data,vertices:asset.data.vertices,quiver:asset.data.quiver};
    } else if (asset.kind === 'strands') {
      const lie = resolve(asset.data.lie), model = root.MathWorkspaceObjects;
      if (lie && model && !model.rootObjectIssues(asset, lie).length && !model.lieEngineIssues(lie.data, 'strand').length) {
        const context = model.strandContext(lie.data);
        if (context.strandCount < 5 && root.StrandDrawing) {
          const scene = root.StrandDrawing.scene({ ...context, generators: asset.data.generators });
          if (root.StrandDrawing.consecutiveRows(scene.records).length < 5) return { source: 'diagram', kind: 'strands', ...context, generators: asset.data.generators };
        }
      }
    } else if (asset.kind === 'lie') {
      const { family, rank } = asset.data || {};
      if (['A','B','C','D','E6','E7','E8','F4','G2'].includes(family) && Number.isSafeInteger(rank) && rank >= 0) {
        const letter = family[0];
        return {source:'name',name:letter + '_{' + rank + '}',fallback:letter + rank};
      }
    } else if (letterName(asset.name)) return { source: 'name', name: asset.name };
    return { source: 'generic', symbol: generic[asset.kind] || '◇', ...(representatives[asset.kind] ? {representative:representatives[asset.kind]} : {}) };
  }
  function describe(asset, resolve = () => null) {
    const key = JSON.stringify([asset.kind, asset.type, asset.name, asset.data, ['strands','dynkin'].includes(asset.kind) ? resolve(asset.data?.lie)?.data : asset.kind === 'matrix' && asset.data?.construction ? resolve(asset.data.construction.lie)?.data : null]);
    if (!cache.has(key)) { if (cache.size >= 256) cache.delete(cache.keys().next().value); cache.set(key, describeValue(asset, resolve)); }
    return cache.get(key);
  }
  function svgNode(tag, attributes = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value)); return node;
  }
  function integerEntry(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim().replace(/\u2212/g, '-');
    if (/^[+-]?\d+$/.test(text)) return BigInt(text).toString();
    // Decide integrality exactly; floating point rounding can turn a fraction
    // such as 1.00000000000000001 into an apparent integer.
    const parts = text.split('/');
    if (parts.length > 2) return null;
    const fractions = parts.map(part => {
      const match = part.trim().match(/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/);
      if (!match) return null;
      const exponent = Number(match[3] || 0) - (match[2].split('.')[1]?.length || 0);
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return null;
      const numerator = BigInt(match[1] + match[2].replace('.', ''));
      return exponent >= 0 ? [numerator * 10n ** BigInt(exponent), 1n] : [numerator, 10n ** BigInt(-exponent)];
    });
    if (fractions.some(part => !part)) return null;
    const [a, b] = fractions[0], [c, d] = fractions[1] || [1n, 1n];
    const numerator = a * d, denominator = b * c;
    return denominator !== 0n && numerator % denominator === 0n ? String(numerator / denominator) : null;
  }
  function matrixIcon(model) {
    const rows = model.entries.length, cols = model.entries[0].length;
    const stars = model.entries.every(row => row.every(value => value === '*'));
    const fontSize = settings.matrixFontSize, glyphHeight = fontSize * (stars ? 0.55 : 1);
    matrixMeasureContext ||= document.createElement('canvas').getContext('2d');
    matrixMeasureContext.font = `${fontSize}px ${settings.matrixFontFamily}`;
    const metrics = [...new Set(model.entries.flat())].map(value => matrixMeasureContext.measureText(value));
    // Center the visible ink on the parenthesis midpoint, rather than the
    // font's em box. Asterisks sit above the alphabetic baseline, and that
    // distance varies between fonts.
    const ascent = Math.max(...metrics.map(metric => metric.actualBoundingBoxAscent));
    const descent = Math.max(...metrics.map(metric => metric.actualBoundingBoxDescent));
    const baselineOffset = (ascent - descent) / 2;
    const rowStep = glyphHeight + settings.matrixRowGap, padding = settings.matrixPadding + settings.matrixStroke / 2;
    const curve = settings.matrixBracketCurve, side = padding + curve + settings.matrixBracketGap;
    const widths = Array.from({ length: cols }, (_, c) => Math.max(...model.entries.map(row => row[c].length)) * fontSize * (stars ? 0.55 : 0.65) + settings.matrixEntryStroke);
    const width = widths.reduce((sum, value) => sum + value, 0) + (cols - 1) * settings.matrixColumnGap + side * 2;
    const height = glyphHeight + (rows - 1) * rowStep + padding * 2 + settings.matrixEntryStroke;
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMidYMid meet' });
    svg.append(svgNode('path', { d: `M${padding + curve} ${padding} Q${padding - curve} ${height / 2} ${padding + curve} ${height - padding} M${width - padding - curve} ${padding} Q${width - padding + curve} ${height / 2} ${width - padding - curve} ${height - padding}`, fill: 'none', stroke: 'currentColor', 'stroke-width': settings.matrixStroke, 'stroke-linecap': 'round' }));
    let x = side;
    widths.forEach((columnWidth, c) => {
      model.entries.forEach((row, r) => {
        const text = svgNode('text', { x: x + columnWidth / 2, y: height / 2 + (r - (rows - 1) / 2) * rowStep + baselineOffset, 'text-anchor': 'middle', 'dominant-baseline': 'alphabetic', 'font-family': settings.matrixFontFamily, 'font-size': fontSize, fill: 'currentColor', stroke: 'currentColor', 'stroke-width': settings.matrixEntryStroke, 'paint-order': 'stroke fill' });
        text.textContent = row[c]; svg.append(text);
      });
      x += columnWidth + settings.matrixColumnGap;
    });
    return svg;
  }
  function youngIcon(model) {
    const width = model.positive + model.negative, height = model.rows.length, svg = svgNode('svg', { viewBox: `-0.5 -0.5 ${width + 1} ${height + 1}`, preserveAspectRatio: 'xMidYMid meet' });
    const id = 'workspace-negative-' + (++patternId), defs = svgNode('defs'), pattern = svgNode('pattern', { id, width: 0.4, height: 0.4, patternUnits: 'userSpaceOnUse' });
    pattern.append(svgNode('path', { d: 'M-.1 .1L.1 -.1M0 .4L.4 0M.3 .5L.5 .3', stroke: 'currentColor', 'stroke-width': 0.045 })); defs.append(pattern); svg.append(defs);
    model.rows.forEach((row, y) => { for (let c = 0; c < Math.abs(row); c++) {
      const x = row >= 0 ? model.negative + c : model.negative - c - 1;
      svg.append(svgNode('rect', { x, y, width: 1, height: 1, fill: row < 0 && settings.hatch ? `url(#${id})` : 'currentColor', 'fill-opacity': row < 0 && settings.hatch ? 1 : 0.18, stroke: 'currentColor', 'stroke-width': settings.stroke / 8 }));
    } });
    if (model.negative) svg.append(svgNode('path', { d: `M${model.negative} -.2V${height + .2}`, stroke: 'currentColor', 'stroke-width': 0.11 }));
    return svg;
  }
  function dynkinIcon(model) {
    const {nodes,edges}=dynkinGeometry.scene(model),padding=34;
    const left=Math.min(...nodes.map(n=>n.x))-padding,top=Math.min(...nodes.map(n=>n.y))-padding;
    const width=Math.max(...nodes.map(n=>n.x))+padding-left,height=Math.max(...nodes.map(n=>n.y))+padding-top;
    const svg=svgNode('svg',{viewBox:`${left} ${top} ${width} ${height}`,preserveAspectRatio:'xMidYMid meet'});
    for(const edge of edges){
      const a=nodes[edge.i],b=nodes[edge.j],length=Math.hypot(b.x-a.x,b.y-a.y),ux=(b.x-a.x)/length,uy=(b.y-a.y)/length;
      const group=svgNode('g',{'data-dynkin-edge':edge.i+'-'+edge.j,'data-multiplicity':edge.multiplicity,fill:'none',stroke:'currentColor','stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'});
      for(const offset of edge.multiplicity===1?[0]:edge.multiplicity===2?[-7,7]:[-12,0,12])group.append(svgNode('path',{d:`M${a.x+ux*24-uy*offset} ${a.y+uy*24+ux*offset}L${b.x-ux*24-uy*offset} ${b.y-uy*24+ux*offset}`}));
      if(edge.arrowTarget!==null){
        const to=nodes[edge.arrowTarget],sign=edge.arrowTarget===edge.j?1:-1,dx=ux*sign,dy=uy*sign,x=to.x-dx*34,y=to.y-dy*34;
        group.append(svgNode('path',{'data-dynkin-arrow-target':edge.arrowTarget+1,d:`M${x-dx*18-dy*12} ${y-dy*18+dx*12}L${x} ${y}L${x-dx*18+dy*12} ${y-dy*18-dx*12}`}));
      }
      svg.append(group);
    }
    for(const node of nodes)svg.append(svgNode('circle',{cx:node.x,cy:node.y,r:21,'data-dynkin-vertex':node.index+1,'data-marked':node.marked,fill:node.marked?'currentColor':'var(--surface, #fffdf8)',stroke:'currentColor','stroke-width':6}));
    return svg;
  }
  function latticeIcon(model) {
    const halfHeight=Math.sqrt(3)/2+0.3;
    const svg=svgNode('svg',{viewBox:`-1.8 ${-halfHeight} 3.6 ${2*halfHeight}`,preserveAspectRatio:'xMidYMid meet'});
    for(const point of model.points)svg.append(svgNode('circle',{cx:point.x,cy:-point.y,r:0.12,fill:'currentColor'}));
    return svg;
  }
  function frameIcon() {
    const svg=svgNode('svg',{viewBox:'0 0 40 40',preserveAspectRatio:'xMidYMid meet'});
    svg.append(svgNode('path',{d:'M4 20H36M31 15L36 20L31 25M20 36V4M15 9L20 4L25 9',fill:'none',stroke:'currentColor','stroke-width':2.2,'stroke-linecap':'round','stroke-linejoin':'round'}));
    svg.append(svgNode('circle',{cx:20,cy:20,r:1.6,fill:'currentColor'}));
    return svg;
  }
  function fanIcon(model) {
    const svg=svgNode('svg',{viewBox:'0 0 40 40',preserveAspectRatio:'xMidYMid meet'});
    const emphasized=model.emphasizedCone===0;
    // Standard P2 rays: (1,0), (0,1), and (-1,-1); screen y points down.
    if(emphasized)svg.append(svgNode('path',{'data-fan-cone':0,d:'M20 20H36V4H20Z',fill:'currentColor','fill-opacity':0.18}));
    const negative=16*(emphasized?settings.coneNegativeLength:settings.fanNegativeLength);
    for(const [index,point] of [[36,20],[20,4],[20-negative,20+negative]].entries()) {
      const muted=emphasized&&index===2;
      svg.append(svgNode('path',{'data-fan-ray':index,d:`M20 20L${point[0]} ${point[1]}`,fill:'none',stroke:'currentColor','stroke-width':muted?1.6:emphasized?3.2:2.2,opacity:muted?0.28:1,'stroke-linecap':'round'}));
    }
    svg.append(svgNode('circle',{cx:20,cy:20,r:2,fill:'currentColor'}));
    return svg;
  }
  function a2Icon(chambers) {
    const svg=svgNode('svg',{viewBox:'0 0 40 40',preserveAspectRatio:'xMidYMid meet'});
    const directions=Array.from({length:6},(_,i)=>{
      const angle=i*Math.PI/3+(chambers?Math.PI/6:0);
      return {x:Math.cos(angle),y:-Math.sin(angle)};
    });
    if(chambers)directions.forEach((a,i)=>{
      const b=directions[(i+1)%6];
      svg.append(svgNode('path',{'data-weyl-chamber':i,d:`M20 20L${20+17*a.x} ${20+17*a.y}L${20+17*b.x} ${20+17*b.y}Z`,fill:'currentColor','fill-opacity':i%2?0.12:0.28}));
    });
    directions.forEach((direction,i)=>{
      const x=20+17*direction.x,y=20+17*direction.y;
      let d=`M20 20L${x} ${y}`;
      if(!chambers)d+=`M${x-4*direction.x-2.3*direction.y} ${y-4*direction.y+2.3*direction.x}L${x} ${y}L${x-4*direction.x+2.3*direction.y} ${y-4*direction.y-2.3*direction.x}`;
      svg.append(svgNode('path',{[chambers?'data-weyl-wall':'data-root-arrow']:i,d,fill:'none',stroke:'currentColor','stroke-width':chambers?1.6:2,'stroke-linecap':'round','stroke-linejoin':'round'}));
    });
    svg.append(svgNode('circle',{cx:20,cy:20,r:1.2,fill:'currentColor'}));
    return svg;
  }
  function mosaicIcon(kind) {
    const svg=svgNode('svg',{viewBox:'0 0 40 40',fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round'});
    const field='M13 5L21 9.5V18.5L13 23L5 18.5V9.5ZM29 5L37 9.5V18.5L29 23L21 18.5V9.5ZM21 18.5L29 23V32L21 36.5L13 32V23Z';
    svg.append(svgNode('path',{d:field,...(kind==='mosaic-diagram'?{'stroke-opacity':'.55'}:{})}));
    if(kind==='mosaic-space')svg.append(svgNode('path',{d:'M13 23L21 18.5L29 23','stroke-opacity':'.5'}));
    else for(const d of ['M13 10L16.5 12V16L13 18L9.5 16V12Z','M21 23.5L24.5 25.5V29.5L21 31.5L17.5 29.5V25.5Z'])
      svg.append(svgNode('path',{'data-mosaic-piece':'',d,fill:'currentColor',stroke:'none'}));
    return svg;
  }
  function objectTypeIcon(model) {
    const svg=svgNode('svg',{viewBox:'0 0 40 40',fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round'});
    const path=(d,attributes={})=>svg.append(svgNode('path',{d,...attributes}));
    const dot=(x,y,r=1.5)=>svg.append(svgNode('circle',{cx:x,cy:y,r,fill:'currentColor',stroke:'none'}));
    const text=(value,x,y,size,attributes={})=>{
      const node=svgNode('text',{x,y,'font-size':size,'font-family':'Georgia, "Times New Roman", serif','font-style':'italic',fill:'currentColor',stroke:'none',...attributes});
      node.textContent=value;svg.append(node);
    };
    if(model.kind==='filtration'){
      for(const [x,y,width,height] of [[5,5,30,30],[5,15,20,20],[5,25,10,10]])svg.append(svgNode('rect',{x,y,width,height,fill:'currentColor','fill-opacity':.06}));
    }else if(model.kind==='complex'){
      [4,20,36].forEach(x=>dot(x,24,2));
      for(const x of [8,24]){path(`M${x} 24h8m-3-3 3 3-3 3`);text('d',x+1,17,10);}
    }else if(model.kind==='field-extension'){
      text('L/K',20,28,20,{'text-anchor':'middle'});
    }else if(model.kind==='polytope'){
      path('M20 4 4 29 31 36 20 4 33 16 31 36');
      path('M4 29 33 16',{'stroke-dasharray':'2 3','stroke-opacity':.55});
    }else if(model.kind==='sphere'){
      svg.append(svgNode('circle',{cx:20,cy:20,r:16,fill:'currentColor','fill-opacity':.06}));
      path('M20 4A16 16 0 0 1 20 36C34 30 34 10 20 4Z',{fill:'currentColor','fill-opacity':.08,stroke:'none'});
      path('M4 20C4 12 36 12 36 20',{'stroke-dasharray':'2 2','stroke-opacity':.5});
      path('M4 20C4 28 36 28 36 20');
      svg.append(svgNode('ellipse',{cx:20,cy:20,rx:6,ry:16,transform:'rotate(-20 20 20)','stroke-opacity':.65}));
    }else if(model.kind==='voronoi'){
      const hex=(cx,cy)=>Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return [cx+7*Math.cos(a),cy+7*Math.sin(a)];});
      const outline=(cx,cy,attributes)=>path('M'+hex(cx,cy).map(point=>point.join(' ')).join('L')+'Z',attributes);
      for(let i=0;i<6;i++){
        const a=(i+.5)*Math.PI/3;
        outline(20+Math.sqrt(3)*7*Math.cos(a),20+Math.sqrt(3)*7*Math.sin(a),{'stroke-opacity':.28,'stroke-width':1});
      }
      outline(20,20,{fill:'currentColor','fill-opacity':.12});dot(20,20,2);
    }
    return svg;
  }
  function genericFallback(host) {
    const model=representatives[host.dataset.iconKind];
    if(model?.variant){host.replaceChildren(objectTypeIcon(model));host.dataset.iconVariant=model.variant;}
    else host.textContent=host.dataset.iconFallback;
    host.dataset.iconSource='generic';delete host.dataset.iconName;
  }
  function render(asset, resolve) {
    const description = describe(asset, resolve), model=description.representative || description, host = document.createElement('span');
    host.className = 'workspace-asset-icon'; host.dataset.iconSource = description.source; host.dataset.iconKind=asset.kind; host.setAttribute('aria-hidden', 'true');
    if (model.variant) { host.dataset.iconVariant=model.variant;host.append(objectTypeIcon(model)); }
    else if (model.kind === 'mosaic-space' || model.kind === 'mosaic-diagram') host.append(mosaicIcon(model.kind));
    else if (model.kind === 'matrix') host.append(matrixIcon(model));
    else if (model.kind === 'roots' || model.kind === 'weyl') host.append(a2Icon(model.kind==='weyl'));
    else if (model.kind === 'frame') host.append(frameIcon());
    else if (model.kind === 'fan' || model.kind === 'cone') host.append(fanIcon(model));
    else if (model.kind === 'lattice') host.append(latticeIcon(model));
    else if (model.kind === 'dynkin' && dynkinGeometry) host.append(dynkinIcon(model));
    else if (model.kind === 'young') host.append(youngIcon(model));
    else if (model.kind === 'strands' && root.StrandDrawing) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const isGeneric=description.source==='generic';
      const color = settings[isGeneric?'genericColor':'exactColor'] || getComputedStyle(document.documentElement).getPropertyValue(isGeneric?'--muted':'--accent').trim() || (isGeneric?'#8b8175':'#486c68');
      root.StrandDrawing.thumbnail(canvas.getContext('2d'), 256, 256, model, color,{strokeWidth:settings.strandStroke});host.append(canvas);
    } else if (description.source==='generic' && !model.name) host.textContent=description.symbol;
    else {
      const formula = document.createElement('span'); formula.className = 'workspace-icon-formula'; formula.textContent = '\\(' + model.name + '\\)'; host.append(formula);
      host.dataset.iconName = model.name; host.dataset.iconFallback = model.fallback || generic[asset.kind] || '◇';
      if (!root.MathJax?.typesetPromise) genericFallback(host);
    }
    return host;
  }
  function fit(host) {
    if(!host.isConnected)return;
    const formula=host.querySelector('.workspace-icon-formula'),box=host.getBoundingClientRect();
    // A hidden Assets tab has no measurable dimensions. Keep its previous
    // transform and refit when ResizeObserver sees the tab become visible.
    if(!formula?.querySelector('mjx-container')||box.width<=0||box.height<=0)return;
    const width=formula.offsetWidth,height=formula.offsetHeight;
    if(width>0&&height>0)formula.style.transform=`scale(${Math.min(1,box.width/width,box.height/height)})`;
  }
  function watch(host) {
    for(const old of fittedHosts)if(!old.isConnected){fitObserver?.unobserve(old);fittedHosts.delete(old);}
    if(!fitObserver&&typeof ResizeObserver!=='undefined')fitObserver=new ResizeObserver(entries=>entries.forEach(({target})=>fit(target)));
    fittedHosts.add(host);fitObserver?.observe(host);fit(host);
  }
  async function typeset(container) {
    const hosts = [...container.querySelectorAll('[data-icon-name]')];
    if (!hosts.length) return;
    try {
      if (!root.MathJax?.typesetPromise) { if (!root.MathJax?.startup?.promise) return; await root.MathJax.startup.promise; }
      await root.MathJax.typesetPromise(hosts);
      for (const host of hosts) {
        if (!host.isConnected) continue;
        if (host.querySelector('mjx-merror,[data-mjx-error]') || !host.querySelector('mjx-container')) { genericFallback(host); continue; }
        watch(host);
      }
    } catch (_) { hosts.forEach(genericFallback); }
  }
  function configure(next = {}) {
    settings = Object.fromEntries(Object.keys(defaults).map(key=>[key,next[key]??defaults[key]])); cache.clear();
    if (typeof document !== 'undefined') {
      const style = document.documentElement.style;
      style.setProperty('--workspace-icon-exact', settings.exactColor || 'var(--accent)');
      style.setProperty('--workspace-icon-generic', settings.genericColor || 'var(--muted)');
    }
    return { ...settings };
  }
  const api = { defaults, describe, letterName, render, renderType:kind=>render({kind,name:'',data:{}}), typeset, configure, settings: () => ({ ...settings }) };
  if (typeof document !== 'undefined') configure();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceAssetIcons = api;
}(typeof window !== 'undefined' ? window : globalThis));
