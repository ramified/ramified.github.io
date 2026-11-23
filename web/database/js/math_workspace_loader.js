(function (root) {
  'use strict';
  const enabled = new URLSearchParams(root.location.search).get('loader') !== 'classic';
  const entries = new Map(), actions = new Map();
  const mathConfig = root.MathJax, mathHistory = [];
  const mathBackup = 'https://cdn.bootcdn.net/ajax/libs/mathjax/3.2.2/es5/tex-chtml.js';
  const words = {
    en: { loading:label=>`Loading ${label}…`, failed:label=>`Could not download resources for ${label}.`, retry:'Retry download', math:'Formula formatting is loading.', mathFailed:'Formula download failed; raw formulas remain visible.', link:'Unknown calculator view in the URL.' },
    zh: { loading:label=>`正在加载${label}…`, failed:label=>`无法下载${label}所需的资源。`, retry:'重试下载', math:'正在加载公式排版。', mathFailed:'公式下载失败，暂时显示公式原文。', link:'网址中的计算器视图不存在。' }
  };
  const t = key => words[/^zh/i.test(document.documentElement.lang) ? 'zh' : 'en'][key];
  let shell = false, mathPhase = 'waiting', shellAt = null, linkFailure = '', revision = 0;
  let mathTask = null, mathSource = null, mathCycle = 0;
  let box, message, retryButton;

  function notify() {
    if (!shell) return;
    if (!box) {
      box = document.createElement('section'); box.id = 'workspace-engine-loader';
      box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      Object.assign(box.style, { gridColumn:'1 / -1', padding:'8px 12px', fontSize:'0.9rem' });
      message = document.createElement('span');
      retryButton = document.createElement('button'); retryButton.type = 'button';
      retryButton.className = 'btn btn-ghost';
      retryButton.addEventListener('click', () => {
        const failed = [...actions.values()].filter(action => action.failed);
        if (failed.length) failed.forEach(run);
        else if (mathPhase === 'error') loadMath();
      });
      box.append(message, retryButton); document.querySelector('main').prepend(box);
    }
    const current = [...actions.values()].find(action=>action.failed) || [...actions.values()].at(-1);
    message.textContent = current ? t(current.failed ? 'failed' : 'loading')(current.label)
      : linkFailure || (mathPhase === 'error' ? t('mathFailed') : mathPhase === 'loading' ? t('math') : '');
    retryButton.textContent = t('retry');
    retryButton.hidden = current ? !current.failed : mathPhase !== 'error';
    box.hidden = !message.textContent;
  }
  function cancel(key) {
    if (actions.delete(key)) notify();
  }
  function cancelActions() {
    actions.clear();
    notify();
  }
  async function run(task) {
    const {key,ids,action,onError} = task;
    task.failed = false;
    notify();
    try { await ensure(ids); }
    catch (_) {
      if (actions.get(key) === task) { task.failed = true; notify(); }
      return;
    }
    if (actions.get(key) !== task) return;
    cancel(key);
    try { return await action(); }
    catch (error) { onError(error); }
  }
  function perform(key, ids, label, action, onError) {
    cancel(key);
    if (!needs(ids)) return action();
    const task = {key,ids,label,action,onError};
    actions.set(key,task);
    return run(task);
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
    if (id !== 'native') entries.set(id, { id, url, promise:null });
  }
  function valid(id) {
    if (id === 'knot') return !!root.MosaicKnotData;
    if (id === 'link') return !!root.MosaicLinkData;
    return !!root.MathWorkspaceNativeEditors?.factories?.[id]?.mount;
  }
  function needs(ids) { return ids.some(id => !valid(id)); }
  function load(id) {
    if (valid(id)) return Promise.resolve();
    let entry = entries.get(id);
    if (!entry) {
      const url = root.MathWorkspaceNativeEditors?.urls?.[id];
      if (!url) return Promise.reject(new Error('Unknown workspace resource: ' + id));
      entry = {id,url,promise:null}; entries.set(id,entry);
    }
    if (entry.promise) return entry.promise;
    entry.promise = new Promise((resolve, reject) => {
      const node = document.createElement('script'); node.async = true; node.src = entry.url;
      node.dataset.workspaceResource = entry.id;
      const fail = message => { node.remove(); reject(new Error(message + entry.id)); };
      const timer = root.setTimeout(() => fail('Download timed out: '), 60000);
      node.onload = () => {
        root.clearTimeout(timer);
        if (!valid(entry.id)) { fail('Resource did not initialize: '); return; }
        revision++;
        resolve();
      };
      node.onerror = () => { root.clearTimeout(timer); fail('Download failed: '); };
      document.head.append(node);
    }).catch(error => { entry.promise = null; throw error; });
    return entry.promise;
  }
  function ensure(ids) { return Promise.all(ids.map(load)); }
  function editorResources(id) { return id === 'mosaic' ? [id,'knot','link'] : id ? [id] : []; }
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
  function shellReady(callbacks) {
    if (shell) return;
    shell = true; shellAt = performance.now();
    const canvas = new URLSearchParams(root.location.search).get('canvas');
    if (canvas) {
      if (['assets', 'mosaic', 'places', 'sheaf-complexes'].includes(canvas)) callbacks.open(canvas);
      else linkFailure = t('link');
    }
    notify();
    if (enabled) requestAnimationFrame(() => requestAnimationFrame(loadMath));
  }
  root.addEventListener('site-language-change', notify);
  root.MathWorkspaceLoader = {
    enabled, include, needs, ensure, editorResources, perform, cancel, cancelActions, shellReady,
    loadingMessage:label=>t('loading')(label), failureMessage:label=>t('failed')(label),
    get retryLabel() { return t('retry'); },
    get revision() { return revision; },
    get shellAt() { return shellAt; },
    get mathPhase() { return mathPhase; }, get mathSource() { return mathSource; },
    get mathAttempts() { return mathHistory.map(record => ({ ...record })); }
  };
})(window);
