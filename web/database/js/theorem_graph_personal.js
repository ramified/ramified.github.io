(() => {
  'use strict';
  const { IndexedStore, CloudAPI, Library } = window.TheoremGraphStorage;
  const $ = id => document.getElementById(id);
  const text = (id, value) => { if ($(id) && $(id).textContent !== value) $(id).textContent = value; };
  const time = value => new Date(value).toLocaleString();
  const clone = value => JSON.parse(JSON.stringify(value));

  window.TheoremGraphPersonal = { mount(adapter) {
    const panel = $('theorem-personal');
    if (!panel) return null;
    const base = window.THEOREM_GRAPH_API_BASE;
    const api = base ? new CloudAPI(base) : null;
    const library = new Library({ store: new IndexedStore(), api, onChange: render });
    let ready = false, restoring = false, pendingLocal = false, localError = '', cloudError = '';
    let localTimer, syncTimer, maxTimer, retryTimer, lastKey = '', cloudList = [], actionBusy = false;
    let edited = new Map(), preview = null, localFlight = null, initialPayload = null;
    let loginExpanded = false, loginMessage = '', signedIn = false;
    let personalUrl = '';
    try {
      const url = new URL(window.THEOREM_GRAPH_PERSONAL_URL);
      if (url.protocol === 'https:') personalUrl = url.href;
    } catch { /* The public page can be used before cloud deployment is configured. */ }
    if (personalUrl) $('personal-cloud-link').href = personalUrl;
    const activeKey = 'theorem-personal-active-v1';
    function activeId() { try { return localStorage.getItem(activeKey); } catch { return null; } }
    function remember() { try { if (library.current) localStorage.setItem(activeKey, library.current.id); } catch { /* IndexedDB still owns the draft. */ } }
    function eligible(node) {
      return node && node.matches?.('input, textarea, select') && !node.readOnly && node.type !== 'password'
        && !node.closest('#theorem-personal, #export-card') && !!node.closest('main');
    }
    function selector(node) {
      const parts = [];
      while (node && node !== document.body) {
        if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
        const siblings = [...node.parentElement.children].filter(n => n.tagName === node.tagName);
        parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
        node = node.parentElement;
      }
      return parts.join(' > ');
    }
    function drafts() {
      const context = adapter.context();
      const result = [];
      for (const [key, entry] of edited) {
        const node = document.querySelector(key);
        if (!eligible(node) || (entry.context !== context && key !== '#graph-title')) { edited.delete(key); continue; }
        result.push({ selector: key, value: node.value, checked: node.checked, context,
          selectionStart: node.selectionStart, selectionEnd: node.selectionEnd, focused: node === document.activeElement });
      }
      return result;
    }
    function contentKey() {
      // Caret movement and selecting a different node do not cause cloud writes.
      return JSON.stringify([adapter.signature(), drafts().map(({ selector, value, checked }) => ({ selector, value, checked }))]);
    }
    function capture() { return { ...adapter.capture(), drafts: drafts() }; }
    function restore(payload) {
      restoring = true;
      try {
        adapter.restore(payload);
        edited = new Map();
        let focusedDraft = null;
        for (const draft of payload.drafts || []) {
          if (typeof draft.selector !== 'string') continue;
          let node; try { node = document.querySelector(draft.selector); } catch { continue; }
          if (!eligible(node)) continue;
          if (window.CalculatorInputSettings?.syncEditableValue) window.CalculatorInputSettings.syncEditableValue(node, String(draft.value ?? ''), { force: true });
          else node.value = String(draft.value ?? '');
          if (typeof draft.checked === 'boolean') node.checked = draft.checked;
          if (Number.isInteger(draft.selectionStart) && typeof node.setSelectionRange === 'function') {
            try { node.setSelectionRange(draft.selectionStart, draft.selectionEnd); } catch { /* Native number inputs do not expose selection. */ }
          }
          edited.set(draft.selector, { context: adapter.context() });
          if (draft.focused) focusedDraft = { node, draft };
        }
        if (focusedDraft) {
          const { node, draft } = focusedDraft;
          // Focus handlers may render the normalized model. Re-establish the raw
          // draft afterwards through the existing composition-aware input path.
          node.focus({ preventScroll: true });
          window.CalculatorInputSettings.syncEditableValue(node, String(draft.value ?? ''), { force: true });
          node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
          try { if (Number.isInteger(draft.selectionStart)) node.setSelectionRange(draft.selectionStart, draft.selectionEnd); } catch { /* number field */ }
        }
        lastKey = contentKey(); pendingLocal = false; localError = ''; remember();
      } finally { restoring = false; }
      render();
    }
    function status(message, warning = false) {
      text('personal-status', message); $('personal-status').dataset.warning = String(warning);
    }
    function showGraphs(scroll = false) {
      if (!signedIn) return;
      window.CalculatorCards?.setCardUserVisible(panel, true);
      window.CalculatorCards?.openCard(panel, { reason: 'personal-account' });
      if (scroll) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function renderAccount() {
      const nextSignedIn = !!api && library.online;
      panel.hidden = !nextSignedIn;
      if (signedIn !== nextSignedIn) {
        signedIn = nextSignedIn;
        loginExpanded = false;
        $('personal-password').value = '';
        if (signedIn) { loginMessage = ''; showGraphs(); }
        else {
          window.CalculatorCards?.setCardUserVisible(panel, false);
          $('personal-history-panel').hidden = true;
          $('personal-history-preview').hidden = true;
          loginMessage = cloudError;
        }
      }
      $('personal-sign-in').hidden = signedIn || (!api && !!personalUrl);
      $('personal-sign-in').setAttribute('aria-expanded', String(loginExpanded));
      $('personal-cloud-link').hidden = !!api || !personalUrl;
      $('personal-show-graphs').hidden = !signedIn;
      $('personal-login').hidden = !api || signedIn || !loginExpanded;
      $('personal-login-submit').disabled = actionBusy;
      $('personal-login-cancel').disabled = actionBusy;
      $('personal-login-status').hidden = signedIn || !loginMessage;
      text('personal-login-status', loginMessage);
      $('personal-logout').hidden = !signedIn;
    }
    function render() {
      if (!panel) return;
      renderAccount();
      const current = library.current;
      if (current) {
        const select = $('personal-select');
        let option = [...select.options].find(item => item.value === current.id);
        if (!option) { option = document.createElement('option'); option.value = current.id; select.prepend(option); }
        option.textContent = `${current.title}${current.recovered ? ' (recovered copy)' : ''} · ${library.online && !library.dirty() ? 'cloud' : 'this device'}`;
        $('personal-open').disabled = false;
      }
      text('personal-current', current ? `Current: ${current.title}${current.recovered ? ' (recovered copy)' : ''}` : 'Current graph will be saved on this device when edited.');
      $('personal-conflict').hidden = !current?.conflict;
      $('personal-cloud-version').disabled = !library.online;
      $('personal-sync').disabled = !api || !library.online || !!library.syncing;
      $('personal-revert').disabled = !current || actionBusy;
      if (localError) status(`Local save failed: ${localError}. Download a backup before closing.`, true);
      else if (pendingLocal) status('Saving on this device…');
      else if (current?.conflict) status('Another device has a newer version. Your changes are saved on this device.', true);
      else if (cloudError) status(`Saved on this device. ${cloudError}`, true);
      else if (library.syncing) status('Saved on this device · syncing…');
      else if (current && library.online && !library.dirty()) status('Saved to cloud');
      else if (api && !library.online) status('Saved on this device · sign in to sync', true);
      else status('Saved on this device' + (api && current ? ' · waiting to sync' : ''));
      remember();
    }
    function flushLocal() {
      if (localFlight) return localFlight.then(() => flushLocal());
      localFlight = persistLocal().finally(() => { localFlight = null; });
      return localFlight;
    }
    async function persistLocal() {
      if (!ready || restoring) return;
      clearTimeout(localTimer);
      const key = contentKey();
      if (key === lastKey && !localError) { pendingLocal = false; return; }
      const payload = capture();
      pendingLocal = true;
      try {
        if (!library.current && initialPayload) await library.create(initialPayload);
        await library.save(payload);
        lastKey = key; localError = ''; pendingLocal = contentKey() !== key;
        scheduleCloud();
      } catch (error) { localError = error.message; pendingLocal = true; }
      render();
    }
    function changed() {
      if (!ready || restoring) return;
      pendingLocal = true;
      status('Saving on this device…');
      clearTimeout(localTimer);
      localTimer = setTimeout(flushLocal, 180);
    }
    function scheduleCloud() {
      if (!api || !library.online) return;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(sync, 4000);
      if (!maxTimer) maxTimer = setTimeout(sync, 30000);
    }
    async function sync() {
      clearTimeout(syncTimer); clearTimeout(maxTimer); maxTimer = null;
      await flushLocal();
      if (!library.online) return;
      try { await library.sync(); cloudError = ''; }
      catch (error) {
        cloudError = error.status === 401 ? 'Session expired; sign in again.' : error.message || 'Cloud sync failed; retrying when connected.';
        clearTimeout(retryTimer);
        if (library.online) retryTimer = setTimeout(sync, 30000);
      }
      render();
    }
    async function list() {
      await library.queue;
      const local = await library.store.summaries();
      if (library.online) cloudList = (await api.request('/documents')).documents;
      const merged = new Map(cloudList.map(item => [item.id, { ...item, cloud: true }]));
      for (const item of local) merged.set(item.id, { ...item, cloud: merged.has(item.id) });
      const select = $('personal-select'); const selected = select.value || library.current?.id;
      select.replaceChildren();
      for (const item of [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt)) {
        const option = document.createElement('option'); option.value = item.id;
        option.textContent = `${item.title}${item.recovered ? ' (recovered copy)' : ''} · ${item.cloud && !item.dirty ? 'cloud' : 'this device'}`;
        select.append(option);
      }
      if (merged.has(selected)) select.value = selected;
      $('personal-open').disabled = !merged.size;
    }
    async function action(task) {
      if (actionBusy) return;
      actionBusy = true;
      try { await flushLocal(); if (localError) throw new Error(localError); await task(); }
      catch (error) {
        cloudError = error.message;
        if (error.status === 401) library.online = false;
        if (loginExpanded && !library.online) loginMessage = error.message;
      }
      finally { actionBusy = false; render(); }
    }
    async function showHistory() {
      const current = library.current;
      if (!current) return;
      const entries = current.history.map(item => ({ ...item, source: 'device' }));
      if (library.online && current.cloudRevision) {
        const result = await api.request(`/documents/${current.id}/history`);
        entries.push(...result.history.map(item => ({ ...item, source: 'cloud' })));
      }
      const target = $('personal-history-list'); target.replaceChildren();
      $('personal-history-panel').hidden = false;
      text('personal-history-empty', entries.length ? '' : 'No earlier checkpoints yet.');
      for (const entry of entries.sort((a, b) => b.updatedAt - a.updatedAt)) {
        const li = document.createElement('li'); const label = document.createElement('span');
        label.textContent = `${time(entry.updatedAt)} · ${entry.source}`;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = 'Preview';
        button.addEventListener('click', () => action(async () => {
          const payload = entry.payload || (await api.request(`/documents/${current.id}/history/${entry.revision}`)).payload;
          preview = { id: current.id, payload };
          $('personal-history-preview').hidden = false;
          text('personal-preview-text', JSON.stringify(payload.graph, null, 2));
        }));
        li.append(label, button); target.append(li);
      }
    }
    $('personal-sign-in').addEventListener('click', () => {
      if (actionBusy) return;
      if (!api) {
        loginMessage = 'Personal sign-in is not available yet.';
      } else {
        loginExpanded = !loginExpanded;
        loginMessage = '';
        if (!loginExpanded) $('personal-password').value = '';
      }
      renderAccount();
      if (loginExpanded) $('personal-password').focus();
    });
    $('personal-login-cancel').addEventListener('click', () => {
      if (actionBusy) return;
      loginExpanded = false; loginMessage = '';
      $('personal-password').value = '';
      renderAccount(); $('personal-sign-in').focus();
    });
    $('personal-show-graphs').addEventListener('click', () => showGraphs(true));
    $('personal-login').addEventListener('submit', event => {
      event.preventDefault();
      if (!api || actionBusy) return;
      loginMessage = 'Signing in…';
      action(async () => {
        renderAccount();
        const password = $('personal-password').value;
        try {
          await api.request('/login', 'POST', { username: $('personal-username').value, password });
          library.online = true; cloudError = '';
          await loadAccount();
        } catch (error) {
          loginMessage = error.message || 'Unable to sign in. Please try again.';
          throw error;
        } finally { $('personal-password').value = ''; }
      });
    });
    $('personal-logout').addEventListener('click', () => action(async () => {
      await sync();
      await api.request('/logout', 'POST', {});
      library.online = false; cloudList = []; cloudError = ''; await list();
    }));
    $('personal-sync').addEventListener('click', () => action(async () => { await sync(); await list(); }));
    $('personal-refresh').addEventListener('click', () => action(list));
    $('personal-open').addEventListener('click', () => action(async () => {
      const id = $('personal-select').value;
      if (!id) return;
      const cloud = library.online && cloudList.some(item => item.id === id);
      restore(await (cloud ? library.openCloud(id, flushLocal) : library.openLocal(id)));
      $('personal-history-panel').hidden = true;
    }));
    $('personal-copy').addEventListener('click', () => action(async () => {
      await library.create(capture()); lastKey = contentKey(); await list(); scheduleCloud();
    }));
    $('personal-cloud-version').addEventListener('click', () => action(async () => {
      restore(await library.useCloudVersion(flushLocal)); await list();
    }));
    $('personal-revert').addEventListener('click', () => action(async () => {
      if (!library.opening || !window.confirm('Restore the version from when you opened this graph? The current version will remain in history.')) return;
      const opening = clone(library.opening);
      await library.save(opening, true); restore(opening); scheduleCloud();
    }));
    $('personal-history').addEventListener('click', () => action(showHistory));
    $('personal-restore-history').addEventListener('click', () => action(async () => {
      if (!preview || preview.id !== library.current?.id) throw new Error('Open the graph again before restoring this version.');
      if (!window.confirm('Restore this checkpoint? Your current version will remain in history.')) return;
      await library.save(preview.payload, true); restore(preview.payload); scheduleCloud();
      $('personal-history-preview').hidden = true; await showHistory();
    }));
    $('personal-download').addEventListener('click', () => {
      const payload = capture();
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload.graph, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = `${String(payload.graph.title || 'theorem-graph').replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 80)}.json`;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    // Observe drafts without publishing/normalizing values or changing the caret.
    // The calculator's own live handlers continue to use listenEditable().
    document.addEventListener('input', event => {
      if (!eligible(event.target)) return;
      edited.set(selector(event.target), { context: adapter.context() }); changed();
    });
    document.addEventListener('compositionend', event => { if (eligible(event.target)) changed(); });
    document.addEventListener('change', event => { if (eligible(event.target)) changed(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { flushLocal(); sync(); } });
    window.addEventListener('pagehide', flushLocal);
    window.addEventListener('online', () => { if (api && !library.online) connect(); else sync(); });
    // A short periodic local checkpoint also captures continuous layout movement.
    setInterval(() => { if (ready && !restoring && !adapter.busy() && contentKey() !== lastKey) flushLocal(); }, 1500);
    async function connect() {
      try { await api.request('/session'); library.online = true; cloudError = ''; await loadAccount(); }
      catch (error) { library.online = false; if (error.status !== 401) cloudError = 'Cloud unavailable; local drafts remain available.'; }
      await list(); render();
    }
    async function loadAccount() {
      await sync(); await list();
      const current = library.current;
      if (current?.cloudRevision && !library.dirty(current)) restore(await library.openCloud(current.id, flushLocal));
      else if (!current && cloudList.length) restore(await library.openCloud(cloudList[0].id, flushLocal));
    }
    async function start() {
      try {
        const id = activeId();
        if (id && await library.store.read(id)) restore(await library.openLocal(id));
        else { lastKey = contentKey(); initialPayload = capture(); }
        ready = true;
        await list();
        if (api) await connect();
      } catch (error) { localError = error.message; ready = true; }
      render(); panel.dataset.ready = 'true';
    }
    start();
    return {
      changed, flushLocal,
      checkpoint() {
        if (!ready || restoring) return;
        const payload = capture();
        library.save(payload, true).catch(error => { localError = error.message; render(); });
      },
      hasUnstoredChanges: () => !!localError || pendingLocal || (ready && contentKey() !== lastKey)
    };
  } };
})();
