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
    const storeName = username => `theorem-graphs-v2:${base || 'local'}:${username || 'guest'}`;
    let library = new Library({ store: new IndexedStore(storeName()), api, onChange: render });
    let user = null, entries = [], renameId = null, shareId = null, resetUser = null;
    let shared = null, sharedDirty = false, sharedPending = null, sharedSaving = false;
    const defaultPayload = clone(adapter.capture());
    let ready = false, restoring = false, pendingLocal = false, localError = '', cloudError = '';
    let localTimer, syncTimer, maxTimer, retryTimer, lastKey = '', cloudList = [], actionBusy = false;
    let edited = new Map(), preview = null, localFlight = null, initialPayload = null;
    let loginExpanded = false, loginMessage = '', signedIn = false;
    let activeKey = storeName() + ':active';
    function activeId() { try { return localStorage.getItem(activeKey); } catch { return null; } }
    function remember() { try { if (library.current) localStorage.setItem(activeKey, library.current.id); else localStorage.removeItem(activeKey); } catch { /* IndexedDB still owns the draft. */ } }
    function eligible(node) {
      return node && node.matches?.('input, textarea, select') && !node.readOnly && node.type !== 'password'
        && !node.closest('#theorem-personal, #export-card, #personal-shared-banner') && !!node.closest('main');
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
      const nextSignedIn = !!user;
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
      $('personal-sign-in').hidden = signedIn;
      $('personal-sign-in').setAttribute('aria-expanded', String(loginExpanded));
      $('personal-cloud-link').hidden = true;
      $('personal-show-graphs').hidden = !signedIn;
      $('personal-login').hidden = !api || signedIn || !loginExpanded;
      $('personal-login-submit').disabled = actionBusy;
      $('personal-login-cancel').disabled = actionBusy;
      $('personal-login-status').hidden = signedIn || !loginMessage;
      text('personal-login-status', loginMessage);
      $('personal-logout').hidden = !signedIn;
      $('personal-users').hidden = !user?.admin;
      text('personal-account-name', user ? `Signed in as ${user.username}` : '');
    }
    function render() {
      if (!panel) return;
      renderAccount();
      renderRows();
      renderShared();
      const current = library.current;
      if (current) {
        const select = $('personal-select');
        let option = [...select.options].find(item => item.value === current.id);
        if (!option) { option = document.createElement('option'); option.value = current.id; select.prepend(option); }
        option.textContent = `${current.title}${current.recovered ? ' (recovered copy)' : ''} · ${library.online && !library.dirty() ? 'cloud' : 'this device'}`;
        $('personal-open').disabled = false;
      }
      text('personal-current', shared ? `Viewing shared graph: ${shared.title}` : current ? `Current: ${current.title}${current.recovered ? ' (recovered copy)' : ''}` : 'Current graph will be saved on this device when edited.');
      $('personal-conflict').hidden = !current?.conflict;
      $('personal-cloud-version').disabled = !library.online;
      $('personal-sync').disabled = !!shared || !api || !library.online || !!library.syncing;
      $('personal-revert').disabled = !!shared || !current || actionBusy;
      $('personal-history').disabled = !!shared || !current;
      $('personal-copy').disabled = !!shared;
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
      if (shared) { stashShared(); return; }
      const key = contentKey();
      if (key === lastKey && !localError) { pendingLocal = false; render(); return; }
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
      if (shared) { if (shared.canEdit) { sharedDirty = true; stashShared(); renderShared(); } return; }
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
        if (error.status === 401) await signOutLocally();
      }
      render();
    }
    async function list() {
      await library.queue;
      const local = await library.store.summaries();
      if (library.online) cloudList = (await api.request('/documents')).documents;
      const merged = new Map(cloudList.map(item => [item.id, { ...item, cloud: true }]));
      for (const item of local) merged.set(item.id, { ...item, cloud: merged.has(item.id) });
      entries = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      const select = $('personal-select'); const selected = select.value || library.current?.id;
      select.replaceChildren();
      for (const item of entries) {
        const option = document.createElement('option'); option.value = item.id;
        option.textContent = `${item.title}${item.recovered ? ' (recovered copy)' : ''} · ${item.cloud && !item.dirty ? 'cloud' : 'this device'}`;
        select.append(option);
      }
      if (merged.has(selected)) select.value = selected;
      $('personal-open').disabled = !merged.size;
      renderRows();
    }
    async function action(task) {
      if (actionBusy) return;
      actionBusy = true;
      try { await flushLocal(); if (localError) throw new Error(localError); await task(); }
      catch (error) {
        cloudError = error.message;
        if (error.status === 401 && user) await signOutLocally();
        if (loginExpanded && !library.online) loginMessage = error.message;
      }
      finally { actionBusy = false; render(); }
    }
    async function switchAccount(session) {
      await flushLocal(); await library.queue;
      const guest = !user && !shared && library.current ? capture() : null;
      user = { username: session.username, admin: !!session.admin };
      library = new Library({ store: new IndexedStore(storeName(user.username)), api, onChange: render });
      library.online = true; cloudList = []; entries = [];
      activeKey = storeName(user.username) + ':active';
      // Import the old single-user cache only into its administrator's library.
      // No guest or newly created account can see these legacy private drafts.
      if (user.admin) {
        for (const record of await new IndexedStore().list()) {
          if (!await library.store.read(record.id)) await library.store.put(record, 0);
        }
      }
      const id = activeId();
      const local = id && await library.store.read(id);
      if (local) {
        const payload = await library.openLocal(id);
        if (!shared) restore(payload);
      } else if (guest && !(await library.store.summaries()).length) {
        await library.create(guest);
        if (!shared) restore(guest);
      } else if (!shared) restore(defaultPayload);
      initialPayload = clone(defaultPayload); pendingLocal = false; localError = ''; preview = null;
      if (!shared) lastKey = contentKey();
      $('personal-history-panel').hidden = true;
      $('personal-rename').hidden = true; $('personal-share-panel').hidden = true;
      render();
    }
    async function signOutLocally() {
      await library.queue;
      library.online = false; api?.setToken(''); user = null;
      library = new Library({ store: new IndexedStore(storeName()), api, onChange: render });
      activeKey = storeName() + ':active'; cloudList = []; entries = []; preview = null;
      initialPayload = clone(defaultPayload); pendingLocal = false; localError = '';
      if (!shared) restore(defaultPayload);
      $('personal-user-password').value = ''; $('personal-user-list').replaceChildren();
      $('personal-users').open = false; $('personal-share-result').hidden = true;
      $('personal-share-url').value = ''; $('personal-rename').hidden = true;
      await list(); render();
    }
    function button(label, handler) {
      const node = document.createElement('button'); node.type = 'button'; node.className = 'btn btn-ghost';
      node.textContent = label; node.addEventListener('click', handler); return node;
    }
    function renderRows() {
      const target = $('personal-graph-list');
      const values = new Map(entries.map(item => [item.id, item]));
      if (library.current) values.set(library.current.id, { ...library.current, dirty: library.dirty(), cloud: !!library.current.cloudRevision });
      const rows = new Map([...target.children].map(row => [row.dataset.id, row]));
      for (const item of [...values.values()].sort((a, b) => b.updatedAt - a.updatedAt)) {
        let row = rows.get(item.id);
        if (!row) {
          row = document.createElement('div'); row.className = 'theorem-personal-item'; row.dataset.id = item.id;
          const name = button('', () => action(() => openGraph(item.id)));
          name.className = 'theorem-personal-item-name';
          const date = document.createElement('time'); date.className = 'theorem-personal-item-date';
          const actions = document.createElement('div'); actions.className = 'theorem-personal-item-actions';
          actions.append(button('Rename', () => {
            renameId = item.id; $('personal-rename').hidden = false;
            const title = library.current?.id === item.id ? library.current.title : entries.find(entry => entry.id === item.id)?.title || item.title;
            $('personal-rename-title').value = title; $('personal-rename-title').focus(); $('personal-rename-title').select();
          }), button('Share', () => action(() => openSharing(item.id))), button('Delete', () => action(async () => {
            if (!confirm('Delete this graph and its history? Its share links will stop working.')) return;
            await library.remove(item.id);
            if (!library.current && !shared) { restore(defaultPayload); initialPayload = clone(defaultPayload); }
            if (shareId === item.id) $('personal-share-panel').hidden = true;
            if (renameId === item.id) $('personal-rename').hidden = true;
            await list();
          })));
          row.append(name, date, actions); target.append(row);
        }
        const current = !shared && library.current?.id === item.id;
        row.classList.toggle('is-current', current);
        if (current) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
        const label = `${item.title}${item.recovered ? ' (recovered copy)' : ''}${current ? ' · Editing' : ''}`;
        if (row.firstChild.textContent !== label) row.firstChild.textContent = label;
        row.children[1].dateTime = new Date(item.updatedAt).toISOString();
        row.children[1].textContent = time(item.updatedAt);
        row.children[1].title = item.dirty ? 'Changes saved on this device' : item.cloud ? 'Saved to cloud' : 'Saved on this device';
        row.querySelectorAll('button').forEach(node => { node.disabled = actionBusy; });
        rows.delete(item.id);
      }
      rows.forEach(row => row.remove());
      $('personal-list-empty').hidden = values.size > 0;
    }
    async function openGraph(id) {
      leaveShared();
      const cloud = library.online && cloudList.some(item => item.id === id);
      restore(await (cloud ? library.openCloud(id, flushLocal) : library.openLocal(id)));
      $('personal-select').value = id; $('personal-history-panel').hidden = true;
      $('personal-rename').hidden = true; $('personal-share-panel').hidden = true;
    }
    $('personal-rename').addEventListener('submit', event => {
      event.preventDefault(); action(async () => {
        const payload = await library.rename(renameId, $('personal-rename-title').value);
        if (!shared && library.current?.id === renameId) restore(payload);
        $('personal-rename').hidden = true; await sync(); await list();
      });
    });
    $('personal-rename-cancel').addEventListener('click', () => { $('personal-rename').hidden = true; });
    async function openSharing(id) {
      if (!library.online) throw new Error('Sign in and connect before sharing a graph.');
      await sync();
      const local = await library.store.read(id);
      if (local && library.dirty(local)) throw new Error('Sync this graph and resolve any conflict before sharing.');
      const graph = await api.request(`/documents/${id}`);
      shareId = id; $('personal-share-panel').hidden = false;
      $('personal-share-result').hidden = true; $('personal-share-url').value = '';
      $('personal-share-edit').checked = false; $('personal-share-save').checked = false; $('personal-share-save').disabled = true;
      text('personal-share-title', `Share: ${graph.title}`); await listShares();
    }
    async function listShares() {
      const result = await api.request(`/documents/${shareId}/shares`);
      const target = $('personal-share-list'); target.replaceChildren();
      for (const entry of result.shares) {
        const row = document.createElement('li'), label = document.createElement('span');
        label.textContent = `${time(entry.createdAt)} · ${entry.canSave ? 'Edit and save' : entry.canEdit ? 'Temporary edits' : 'Read only'}`;
        row.append(label, button('Revoke', () => action(async () => {
          await api.request(`/documents/${shareId}/shares/${entry.id}`, 'DELETE');
          if ($('personal-share-result').dataset.id === entry.id) { $('personal-share-result').hidden = true; $('personal-share-url').value = ''; }
          await listShares();
        }))); target.append(row);
      }
    }
    $('personal-share-edit').addEventListener('change', () => {
      $('personal-share-save').disabled = !$('personal-share-edit').checked;
      if (!$('personal-share-edit').checked) $('personal-share-save').checked = false;
    });
    $('personal-share-form').addEventListener('submit', event => {
      event.preventDefault(); action(async () => {
        const link = await api.request(`/documents/${shareId}/shares`, 'POST', {
          canEdit: $('personal-share-edit').checked, canSave: $('personal-share-save').checked
        });
        const url = new URL(location.href); url.hash = 'share=' + link.token;
        $('personal-share-url').value = url.href; $('personal-share-result').hidden = false;
        text('personal-share-copy', 'Copy link');
        $('personal-share-result').dataset.id = link.id;
        await listShares();
      });
    });
    $('personal-share-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('personal-share-url').value); text('personal-share-copy', 'Copied'); }
      catch { $('personal-share-url').focus(); $('personal-share-url').select(); }
    });
    $('personal-share-close').addEventListener('click', () => { $('personal-share-panel').hidden = true; });
    async function listUsers() {
      if (!user?.admin) return;
      const target = $('personal-user-list'); target.replaceChildren();
      for (const entry of (await api.request('/users')).users) {
        const row = document.createElement('li'), name = document.createElement('span');
        name.textContent = entry.username + (entry.disabled ? ' · disabled' : '');
        row.append(name, button('Reset password', () => {
          resetUser = entry.username; $('personal-user-name').value = entry.username; $('personal-user-name').readOnly = true;
          $('personal-user-password').value = ''; $('personal-user-password').focus();
          text('personal-user-submit', 'Reset password'); $('personal-user-cancel').hidden = false;
        }), button(entry.disabled ? 'Enable' : 'Disable', () => action(async () => {
          await api.request(`/users/${entry.username}`, 'PUT', { disabled: !entry.disabled }); await listUsers();
        }))); target.append(row);
      }
    }
    function resetUserForm() {
      resetUser = null; $('personal-user-form').reset(); $('personal-user-name').readOnly = false;
      text('personal-user-submit', 'Create account'); $('personal-user-cancel').hidden = true;
    }
    $('personal-users').addEventListener('toggle', () => { if ($('personal-users').open) action(listUsers); });
    $('personal-user-cancel').addEventListener('click', resetUserForm);
    $('personal-user-form').addEventListener('submit', event => {
      event.preventDefault(); action(async () => {
        const name = resetUser || $('personal-user-name').value;
        try {
          await api.request(resetUser ? `/users/${name}` : '/users', resetUser ? 'PUT' : 'POST', {
            username: name, password: $('personal-user-password').value
          });
          text('personal-user-status', resetUser ? `Password reset for ${name}.` : `Account ${name} created.`);
          resetUserForm(); await listUsers();
        } finally { $('personal-user-password').value = ''; }
      });
    });
    const shareHeaders = () => ({ 'X-Theorem-Share': shared.token });
    const sharedKey = () => `theorem-shared-draft:${base}:${shared.token}`;
    function stashShared() {
      if (!shared?.canEdit || restoring) return;
      try {
        sessionStorage.setItem(sharedKey(), JSON.stringify({ payload: capture(), revision: shared.revision, dirty: sharedDirty, pending: sharedPending }));
        pendingLocal = false;
      } catch { pendingLocal = sharedDirty; }
    }
    function renderShared() {
      $('personal-shared-banner').hidden = !shared;
      $('personal-shared-save').hidden = !shared?.canSave;
      $('personal-shared-save').disabled = sharedSaving || !sharedDirty;
      if (!shared) return;
      const access = shared.canSave ? 'Edits can be saved to the original graph.' : shared.canEdit ? 'Temporary edits only; saving to the original is disabled.' : 'Read-only shared graph.';
      text('personal-shared-status', shared.message || (sharedSaving ? 'Saving to the original graph…' : `${access}${sharedDirty ? ' Unsaved shared changes.' : ''}`));
    }
    async function openShared(token, discard = false) {
      if (!api || !/^[\w-]{43}$/.test(token)) throw new Error('Invalid share link.');
      await flushLocal();
      let remote;
      try { remote = await api.request('/shared', 'GET', undefined, { 'X-Theorem-Share': token }); }
      catch (error) {
        if (shared?.token === token) {
          shared.message = error.message;
          if ([403, 404].includes(error.status)) { shared.canEdit = false; shared.canSave = false; adapter.setReadOnly?.(true); }
          renderShared();
        }
        throw error;
      }
      shared = { ...remote, token }; sharedDirty = false; sharedPending = null;
      let payload = remote.payload;
      if (!discard && remote.canEdit) {
        try {
          const cached = JSON.parse(sessionStorage.getItem(sharedKey()));
          if (cached?.dirty && cached.payload) {
            payload = cached.payload; sharedDirty = true; sharedPending = cached.pending;
            shared.revision = cached.revision;
            if (cached.revision !== remote.revision) shared.message = 'A newer version exists. Your shared draft is kept; download it before reloading.';
          }
        } catch { /* The remote graph remains available. */ }
      } else if (discard) { try { sessionStorage.removeItem(sharedKey()); } catch {} }
      restore(payload); adapter.setReadOnly?.(!shared.canEdit); render();
    }
    function leaveShared() {
      if (!shared) return;
      stashShared(); shared = null; sharedDirty = false; sharedPending = null; pendingLocal = false;
      adapter.setReadOnly?.(false);
      const url = new URL(location.href); url.hash = ''; history.replaceState(null, '', url);
      restore(library.current?.payload || defaultPayload); render();
    }
    $('personal-shared-leave').addEventListener('click', leaveShared);
    $('personal-shared-reload').addEventListener('click', () => action(async () => {
      if (sharedDirty && !confirm('Discard your temporary shared edits and load the latest original graph?')) return;
      await openShared(shared.token, true);
    }));
    $('personal-shared-save').addEventListener('click', async () => {
      if (!shared?.canSave || sharedSaving || !sharedDirty) return;
      sharedSaving = true; shared.message = ''; renderShared();
      try {
        const token = shared.token;
        const snapshot = { formatVersion: 1, graph: capture().graph, editor: {}, drafts: [] };
        if (!sharedPending) sharedPending = { payload: snapshot, baseRevision: shared.revision,
          writeId: crypto.randomUUID(), sessionId: library.sessionId, checkpoint: false };
        stashShared();
        const sent = sharedPending;
        const acknowledgement = await api.request('/shared', 'PUT', sent, shareHeaders());
        if (shared?.token !== token) return;
        shared.revision = acknowledgement.revision; sharedPending = null;
        sharedDirty = JSON.stringify(capture().graph) !== JSON.stringify(sent.payload.graph);
        shared.message = sharedDirty ? 'Saved. Newer local edits are still waiting to be saved.' : 'Saved to the original graph.';
        stashShared();
      } catch (error) {
        if (shared) {
          shared.message = error.status === 409 ? 'The original changed. Your edits are kept; download a copy before reloading.' : error.message;
          if ([403, 404].includes(error.status)) { shared.canSave = false; shared.canEdit = false; adapter.setReadOnly?.(true); }
        }
      } finally { sharedSaving = false; renderShared(); }
    });
    window.addEventListener('hashchange', () => {
      const token = new URLSearchParams(location.hash.slice(1)).get('share');
      if (token) action(() => openShared(token)); else leaveShared();
    });
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
          const session = await api.request('/login', 'POST', { username: $('personal-username').value, password });
          await switchAccount(session); cloudError = '';
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
      cloudError = ''; await signOutLocally();
    }));
    $('personal-sync').addEventListener('click', () => action(async () => { await sync(); await list(); }));
    $('personal-refresh').addEventListener('click', () => action(list));
    $('personal-open').addEventListener('click', () => action(async () => {
      const id = $('personal-select').value;
      if (!id) return;
      leaveShared();
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
      if (!api.token) return;
      try {
        const session = await api.request('/session');
        if (user?.username !== session.username) await switchAccount(session);
        library.online = true; cloudError = ''; await loadAccount();
      } catch (error) {
        library.online = false;
        if (error.status === 401) await signOutLocally();
        else cloudError = 'Cloud unavailable; local drafts remain available.';
      }
      await list(); render();
    }
    async function loadAccount() {
      await sync(); await list();
      const current = library.current;
      if (!shared && current?.cloudRevision && !library.dirty(current)) restore(await library.openCloud(current.id, flushLocal));
      else if (!shared && !current && cloudList.length) restore(await library.openCloud(cloudList[0].id, flushLocal));
    }
    async function start() {
      try {
        const id = activeId();
        if (id && await library.store.read(id)) restore(await library.openLocal(id));
        else { lastKey = contentKey(); initialPayload = capture(); }
        ready = true;
        await list();
        if (api?.token && api.identity?.username) {
          await switchAccount(api.identity);
          library.online = false;
        }
        if (api) await connect();
        const token = new URLSearchParams(location.hash.slice(1)).get('share');
        if (token) {
          try { await openShared(token); }
          catch (error) {
            $('personal-shared-banner').hidden = false;
            text('personal-shared-status', error.message);
            shared = { token, title: 'Unavailable shared graph', canEdit: false, canSave: false, message: error.message };
            adapter.setReadOnly?.(true);
          }
        }
      } catch (error) { localError = error.message; ready = true; }
      render(); panel.dataset.ready = 'true';
    }
    start();
    return {
      changed, flushLocal,
      checkpoint() {
        if (!ready || restoring || shared) return;
        const payload = capture();
        library.save(payload, true).catch(error => { localError = error.message; render(); });
      },
      hasUnstoredChanges: () => shared ? pendingLocal : !!localError || pendingLocal || (ready && contentKey() !== lastKey)
    };
  } };
})();
