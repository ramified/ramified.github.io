(function (root) {
  'use strict';
  const enabled = new URLSearchParams(root.location.search).get('loader') === 'twophase';
  const entries = new Map(), generations = new Map();
  const mathConfig = root.MathJax, mathHistory = [];
  const mathBackup = 'https://cdn.bootcdn.net/ajax/libs/mathjax/3.2.2/es5/tex-chtml.js';
  const words = {
    en: { loading:'Engine loading… Import is available when the calculators are ready.', failed:'Calculator download failed. Retry to continue pending actions.', retry:'Retry download', math:'Calculators are ready; formulas are loading.', mathFailed:'Formula download failed; raw formulas remain visible.', link:'Unknown calculator view in the URL.' },
    zh: { loading:'引擎加载中，计算器就绪后即可导入。', failed:'计算器下载失败，重试后继续等待的操作。', retry:'重试下载', math:'计算器已就绪，正在加载公式排版。', mathFailed:'公式下载失败，暂时显示公式原文。', link:'网址中的计算器视图不存在。' }
  };
  const t = key => words[/^zh/i.test(document.documentElement.lang) ? 'zh' : 'en'][key];
  let shell = false, ready = !enabled, phase = enabled ? 'waiting' : 'legacy';
  let mathPhase = 'waiting', attempt = null, shellAt = null, engineAt = null, linkFailure = '';
  let mathTask = null, mathSource = null, mathCycle = 0;
  let box, message, retryButton, release;
  const gate = new Promise(resolve => { release = resolve; });
  if (!enabled) release();

  function shouldWait() { return enabled && !ready; }
  function assertImportReady() {
    if (!shouldWait()) return;
    const error = new Error(t('loading'));
    error.name = 'WorkspaceEngineLoadingError'; error.code = 'WORKSPACE_ENGINE_LOADING';
    throw error;
  }
  function notify() {
    if (!shell || !enabled && mathPhase !== 'error' && !box) return;
    if (!box) {
      box = document.createElement('section'); box.id = 'workspace-engine-loader';
      box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      Object.assign(box.style, { gridColumn:'1 / -1', padding:'8px 12px', fontSize:'0.9rem' });
      message = document.createElement('span');
      retryButton = document.createElement('button'); retryButton.type = 'button';
      retryButton.className = 'btn btn-ghost';
      retryButton.addEventListener('click', () => { retry().catch(() => {}); });
      box.append(message, retryButton); document.querySelector('main').prepend(box);
    }
    message.textContent = linkFailure || (phase === 'error' ? t('failed') : !ready ? t('loading') : mathPhase === 'error' ? t('mathFailed') : mathPhase !== 'ready' ? t('math') : '');
    retryButton.textContent = t('retry');
    retryButton.hidden = phase !== 'error' && mathPhase !== 'error';
    box.hidden = !message.textContent; box.dataset.phase = phase;
    root.dispatchEvent(new Event('workspace-loader-state'));
  }
  function cancel(key) {
    if (enabled) generations.set(key, (generations.get(key) || 0) + 1);
  }
  function afterReady(key, action) {
    if (!shouldWait()) return action();
    const version = (generations.get(key) || 0) + 1;
    if (key) generations.set(key, version);
    return gate.then(() => { if (!key || generations.get(key) === version) return action(); });
  }
  function include(id, url, async = false) {
    if (id === 'mathjax') {
      entries.set(id, { id, url });
      if (!enabled) loadMath();
      return;
    }
    if (!enabled) {
      const escaped = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      document.write('<script ' + (async ? 'async ' : '') + 'src="' + escaped + '"></' + 'script>');
      return;
    }
    entries.set(id, { id, url, done:false, promise:null });
  }
  function valid(id) {
    if (id === 'native') return !!root.MathWorkspaceNativeEditors?.factories;
    if (id === 'knot') return !!root.MosaicKnotData;
    if (id === 'link') return !!root.MosaicLinkData;
    return true;
  }
  function load(entry) {
    if (!entry) return Promise.reject(new Error('Missing loader resource.'));
    if (entry.done) return Promise.resolve();
    if (entry.promise) return entry.promise;
    entry.promise = new Promise((resolve, reject) => {
      const node = document.createElement('script'); node.async = true; node.src = entry.url;
      node.dataset.workspaceResource = entry.id;
      node.onload = () => {
        if (!valid(entry.id)) { reject(new Error('Resource did not initialize: ' + entry.id)); return; }
        entry.done = true; resolve();
      };
      node.onerror = () => { node.remove(); reject(new Error('Download failed: ' + entry.id)); };
      document.head.append(node);
    }).catch(error => { entry.promise = null; throw error; });
    return entry.promise;
  }
  async function mathText(url) {
    const controller = new AbortController();
    let timer;
    const arm = () => { root.clearTimeout(timer); timer = root.setTimeout(() => controller.abort(), 5000); };
    arm();
    try {
      const response = await root.fetch(url, { signal:controller.signal, credentials:'omit' });
      if (!response.ok) throw new Error('MathJax HTTP ' + response.status);
      if (!/javascript|ecmascript/i.test(response.headers.get('content-type') || '')) throw new Error('MathJax response is not JavaScript.');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let text = ''; arm();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        text += decoder.decode(chunk.value, { stream:true }); arm();
      }
      return text + decoder.decode();
    } finally { root.clearTimeout(timer); }
  }
  function loadMath() {
    if (mathTask) return mathTask;
    const cycle = ++mathCycle;
    mathPhase = 'loading'; notify();
    mathTask = (async () => {
      try {
        let text, selected;
        for (const url of [entries.get('mathjax').url, mathBackup]) {
          const record = { url, startedAt:performance.now(), status:'loading' }; mathHistory.push(record);
          try { text = await mathText(url); selected = url; record.status = 'downloaded'; }
          catch (error) { record.status = 'failed'; record.reason = error.name + ': ' + error.message; }
          record.finishedAt = performance.now();
          if (selected) break;
        }
        if (!selected) throw new Error('Both MathJax sources failed.');
        if (cycle !== mathCycle) return;
        const base = new URL('.', selected).href.replace(/\/$/, '');
        root.MathJax = { ...mathConfig,
          tex:{ ...mathConfig.tex }, options:{ ...mathConfig.options }, startup:{ ...mathConfig.startup },
          loader:{ ...mathConfig.loader, paths:{ ...mathConfig.loader?.paths, mathjax:base } },
          chtml:{ ...mathConfig.chtml, fontURL:mathConfig.chtml?.fontURL || base + '/output/chtml/fonts/woff-v2' }
        };
        // Execute only a completely downloaded, selected response. Aborted
        // sources never insert a script and cannot execute late after failover.
        const node = document.createElement('script'); node.dataset.workspaceResource = 'mathjax';
        node.textContent = text + '\n//# sourceURL=' + selected;
        document.head.append(node); mathSource = selected;
        await root.MathJax.startup.promise;
        if (!root.MathJax.typesetPromise) throw new Error('Formula renderer did not initialize.');
        mathPhase = 'ready';
      } catch (_) { mathPhase = 'error'; }
      finally { mathTask = null; notify(); }
    })();
    return mathTask;
  }
  function retry() {
    if (mathPhase === 'waiting' || mathPhase === 'error') loadMath();
    if (!enabled || ready) { notify(); return Promise.resolve(); }
    if (attempt) return attempt;
    phase = 'loading'; notify();
    attempt = Promise.all(['native', 'knot', 'link'].map(id => load(entries.get(id))))
      .then(() => {
        engineAt = performance.now(); ready = true; phase = 'ready';
        notify(); release(); root.dispatchEvent(new Event('workspace-engine-ready'));
      })
      .catch(error => { phase = 'error'; notify(); throw error; })
      .finally(() => { attempt = null; });
    return attempt;
  }
  function shellReady(callbacks) {
    if (shell) return;
    shell = true; shellAt = performance.now();
    if (!enabled) { notify(); return; }
    const canvas = new URLSearchParams(root.location.search).get('canvas');
    if (canvas) {
      if (['assets', 'mosaic', 'places', 'sheaf-complexes'].includes(canvas)) callbacks.open(canvas);
      else linkFailure = t('link');
    }
    notify();
    // Let the fully wired shell paint before requesting the large resources.
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { retry().catch(() => {}); }, 0)));
  }
  root.addEventListener('site-language-change', notify);
  root.MathWorkspaceLoader = {
    enabled, include, shouldWait, assertImportReady, afterReady, cancel, shellReady, retry,
    whenReady:() => ready ? Promise.resolve() : gate,
    get ready() { return ready; }, get phase() { return phase; },
    get loadingMessage() { return t('loading'); },
    get shellAt() { return shellAt; }, get engineAt() { return engineAt; },
    get mathPhase() { return mathPhase; }, get mathSource() { return mathSource; },
    get mathAttempts() { return mathHistory.map(record => ({ ...record })); }
  };
})(window);
