(function (root) {
  'use strict';
  const generic = { young: '▦', lie: '𝔤', field: '𝕂', dynkin: '●—●', strands: '⋈', matrix: '▦', category: '𝒞', functor: '⇒', variety: '𝕍', sheaf: '𝒽', map: '→' };
  const defaults = Object.freeze({ exactColor: '', genericColor: '', stroke: 0.7, hatch: true });
  let settings = { ...defaults }, patternId = 0;
  const cache = new Map();
  const fittedHosts = new Set();
  let fitObserver = null;
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
    if (asset.kind === 'young') {
      const rows = asset.data.rows || [], positive = Math.max(0, ...rows), negative = -Math.min(0, ...rows);
      if (rows.some(Boolean) && rows.length <= 5 && (asset.type === 'generalized' ? positive + negative <= 6 : positive <= 5)) return { source: 'diagram', kind: 'young', rows, positive, negative };
    } else if (asset.kind === 'strands') {
      const lie = resolve(asset.data.lie), model = root.MathWorkspaceObjects;
      if (lie && model && !model.rootObjectIssues(asset, lie).length && !model.lieEngineIssues(lie.data, 'strand').length) {
        const context = model.strandContext(lie.data);
        if (context.strandCount < 5 && asset.data.generators.length < 5 && root.StrandDrawing) return { source: 'diagram', kind: 'strands', ...context, generators: asset.data.generators };
      }
    } else if (letterName(asset.name)) return { source: 'name', name: asset.name };
    return { source: 'generic', symbol: generic[asset.kind] || '◇' };
  }
  function describe(asset, resolve = () => null) {
    const key = JSON.stringify([asset.kind, asset.type, asset.name, asset.data, asset.kind === 'strands' ? resolve(asset.data.lie)?.data : null]);
    if (!cache.has(key)) { if (cache.size >= 256) cache.delete(cache.keys().next().value); cache.set(key, describeValue(asset, resolve)); }
    return cache.get(key);
  }
  function svgNode(tag, attributes = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value)); return node;
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
  function render(asset, resolve) {
    const model = describe(asset, resolve), host = document.createElement('span');
    host.className = 'workspace-asset-icon'; host.dataset.iconSource = model.source; host.setAttribute('aria-hidden', 'true');
    if (model.source === 'generic') host.textContent = model.symbol;
    else if (model.kind === 'young') host.append(youngIcon(model));
    else if (model.kind === 'strands') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const color = settings.exactColor || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#486c68';
      root.StrandDrawing.thumbnail(canvas.getContext('2d'), 256, 256, model, color); host.append(canvas);
    } else {
      const formula = document.createElement('span'); formula.className = 'workspace-icon-formula'; formula.textContent = '\\(' + model.name + '\\)'; host.append(formula);
      host.dataset.iconName = model.name; host.dataset.iconFallback = generic[asset.kind] || '◇';
      if (!root.MathJax?.typesetPromise) { host.textContent=host.dataset.iconFallback;host.dataset.iconSource='generic';delete host.dataset.iconName; }
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
        if (host.querySelector('mjx-merror,[data-mjx-error]') || !host.querySelector('mjx-container')) { host.textContent = host.dataset.iconFallback; host.dataset.iconSource = 'generic'; continue; }
        watch(host);
      }
    } catch (_) { hosts.forEach(host => { host.textContent = host.dataset.iconFallback; host.dataset.iconSource = 'generic'; }); }
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
  const api = { defaults, describe, letterName, render, typeset, configure, settings: () => ({ ...settings }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceAssetIcons = api;
}(typeof window !== 'undefined' ? window : globalThis));
