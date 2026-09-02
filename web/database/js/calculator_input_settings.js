(() => {
  'use strict';

  const VERSION = 1;
  const STORAGE_PREFIX = 'ramified.calculatorInputSettings.v1.';
  const MAX_BINDINGS = 4;
  const GLOBAL_PROFILE = '__global__';
  const sessions = new Map();
  let listenersReady = false;

  const DEFAULT_STRINGS = Object.freeze({
    settings: 'Controls',
    openSettings: 'Open control settings',
    close: 'Close',
    keyboard: 'Keyboard shortcuts',
    pointer: 'Mouse & touch hints',
    restore: 'Restore defaults',
    addBinding: 'Add key',
    editBinding: 'Change {{binding}}',
    removeBinding: 'Remove binding',
    pressKeys: 'Press a key combination…',
    locked: 'Fixed interaction',
    noBindings: 'No key assigned',
    captureCancelled: 'Key capture cancelled.',
    bindingRemoved: 'Binding removed.',
    bindingSaved: 'Binding saved.',
    bindingLimit: 'An action can use at most {{count}} keys.',
    reserved: 'That key is reserved by the browser or the settings dialog.',
    duplicate: 'That key is already assigned to this action.',
    conflict: '{{binding}} is currently assigned to “{{action}}”. Replace it?',
    replace: 'Replace',
    cancel: 'Cancel',
    restored: 'Default key bindings restored.',
    choosePanel: 'Choose or focus a panel before running its primary action.',
    unavailable: 'This action is not available in the current state.',
    profile: 'Current profile: {{profile}}',
    keysHelp: 'Click a key to change it. Use Add key to keep multiple alternatives.',
    pointerHelp: 'Mouse and touch gestures are shown for reference and cannot be remapped.',
    clearBinding: 'Press Backspace or Delete to clear this binding; Escape cancels.'
  });

  const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"></path></svg>';

  function interpolate(value, parameters) {
    return String(value || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => (
      String(parameters && parameters[key] != null ? parameters[key] : '')
    ));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveElement(value, root = typeof document !== 'undefined' ? document : null) {
    if (!value || !root) return null;
    if (value.nodeType === 1) return value;
    if (typeof value === 'string') return root.querySelector(value);
    return null;
  }

  function normalizeBaseKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const aliases = {
      esc: 'Escape', escape: 'Escape', spacebar: 'Space', space: 'Space', ' ': 'Space',
      return: 'Enter', enter: 'Enter', del: 'Delete', delete: 'Delete', backspace: 'Backspace',
      left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
      arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
      plus: '+', minus: '-', add: '+', subtract: '-'
    };
    const alias = aliases[raw.toLowerCase()];
    if (alias) return alias;
    if (/^f(?:[1-9]|1[0-2])$/i.test(raw)) return raw.toUpperCase();
    if (raw.length === 1) return raw.toLowerCase();
    return raw;
  }

  function normalizeBindingString(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw === '+') return '+';
    const pieces = raw.split('+').map((part) => part.trim()).filter(Boolean);
    const modifiers = new Set();
    let base = '';
    pieces.forEach((piece) => {
      const lower = piece.toLowerCase();
      if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'command' || lower === 'meta' || lower === 'mod') modifiers.add('Mod');
      else if (lower === 'alt' || lower === 'option') modifiers.add('Alt');
      else if (lower === 'shift') modifiers.add('Shift');
      else base = normalizeBaseKey(piece);
    });
    if (!base) return '';
    const ordered = ['Mod', 'Alt', 'Shift'].filter((item) => modifiers.has(item));
    return [...ordered, base].join('+');
  }

  function bindingFromEvent(event) {
    if (!event) return '';
    const base = normalizeBaseKey(event.key);
    if (!base || ['Control', 'Meta', 'Alt', 'Shift'].includes(base)) return '';
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('Mod');
    if (event.altKey) modifiers.push('Alt');
    const printableSymbol = base.length === 1 && !/[a-z0-9]/i.test(base);
    if (event.shiftKey && !printableSymbol) modifiers.push('Shift');
    return [...modifiers, base].join('+');
  }

  function displayBinding(binding, platform = typeof navigator !== 'undefined' ? navigator.platform : '') {
    const normalized = normalizeBindingString(binding);
    if (!normalized) return '';
    const mac = /mac|iphone|ipad/i.test(String(platform || ''));
    return normalized.split('+').map((part) => {
      if (part === 'Mod') return mac ? '⌘' : 'Ctrl';
      if (part === 'Alt') return mac ? '⌥' : 'Alt';
      if (part === 'Shift') return 'Shift';
      if (part === 'ArrowLeft') return '←';
      if (part === 'ArrowRight') return '→';
      if (part === 'ArrowUp') return '↑';
      if (part === 'ArrowDown') return '↓';
      if (part === 'Space') return 'Space';
      return part.length === 1 ? part.toUpperCase() : part;
    }).join(mac ? '' : '+');
  }

  function isReservedBinding(binding) {
    const normalized = normalizeBindingString(binding);
    if (!normalized) return true;
    const parts = normalized.split('+');
    const base = parts[parts.length - 1];
    if (base === 'Tab' || base === 'Escape' || /^F(?:[1-9]|1[0-2])$/.test(base)) return true;
    if (parts.includes('Alt') && /^Arrow(?:Left|Right)$/.test(base)) return true;
    if (parts.includes('Mod') && /^[ltwnrfpsoq]$/.test(base)) return true;
    return false;
  }

  function normalizeBindings(values) {
    const seen = new Set();
    const result = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      const normalized = normalizeBindingString(value);
      if (!normalized || seen.has(normalized) || result.length >= MAX_BINDINGS) return;
      seen.add(normalized);
      result.push(normalized);
    });
    return result;
  }

  function normalizeStoredData(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    if (source.version !== VERSION || !source.profiles || typeof source.profiles !== 'object' || Array.isArray(source.profiles)) {
      return { version: VERSION, profiles: {} };
    }
    const profiles = {};
    Object.entries(source.profiles).forEach(([profile, bindings]) => {
      if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return;
      const clean = {};
      Object.entries(bindings).forEach(([actionId, values]) => {
        if (!Array.isArray(values)) return;
        clean[String(actionId)] = normalizeBindings(values);
      });
      profiles[String(profile)] = clean;
    });
    return { version: VERSION, profiles };
  }

  function readStorage(storage, key) {
    if (!storage || typeof storage.getItem !== 'function') return { version: VERSION, profiles: {} };
    try {
      const raw = storage.getItem(key);
      return normalizeStoredData(raw ? JSON.parse(raw) : null);
    } catch (_error) {
      return { version: VERSION, profiles: {} };
    }
  }

  function writeStorage(storage, key, data) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      storage.setItem(key, JSON.stringify(normalizeStoredData(data)));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function defaultStorage() {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch (_error) {
      return null;
    }
  }

  function isInteractiveTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [contenteditable=""]');
  }

  function canTriggerFromTarget(action, binding, target) {
    return !isInteractiveTarget(target) || !!(action.allowInEditable && binding === 'Mod+Enter');
  }

  function elementAvailable(element) {
    if (!element || element.disabled || element.hidden || element.closest('[hidden]')) return false;
    const card = element.closest('.card');
    if (card && card.classList.contains('collapsed')) return false;
    return true;
  }

  function profileForAction(session, action) {
    if (action.storageProfile === 'global') return GLOBAL_PROFILE;
    return session.profile();
  }

  function actionBindings(session, action) {
    const profile = profileForAction(session, action);
    const stored = session.data.profiles[profile];
    if (stored && Object.prototype.hasOwnProperty.call(stored, action.id)) return normalizeBindings(stored[action.id]);
    return normalizeBindings(action.defaultBindings || []);
  }

  function setActionBindings(session, action, values) {
    const profile = profileForAction(session, action);
    session.data.profiles[profile] ||= {};
    session.data.profiles[profile][action.id] = normalizeBindings(values);
    writeStorage(session.storage, session.storageKey, session.data);
  }

  function translate(session, key, parameters) {
    const fallback = DEFAULT_STRINGS[key] || key;
    if (typeof session.options.translate === 'function') {
      const translated = session.options.translate(key, fallback, parameters);
      if (translated) return String(translated);
    }
    return interpolate(fallback, parameters);
  }

  function actionText(session, action, field) {
    const value = typeof action[field] === 'function' ? action[field]() : action[field];
    const key = action[`${field}Key`];
    if (key && typeof session.options.translate === 'function') {
      const translated = session.options.translate(key, value || key, action.parameters);
      if (translated) return String(translated);
    }
    return String(value || '');
  }

  function currentActions(session) {
    const provider = session.options.actionProvider || session.options.actions;
    const values = typeof provider === 'function' ? provider() : provider;
    return (Array.isArray(values) ? values : [])
      .filter((action) => action && action.id)
      .map((action) => ({
        group: 'General',
        defaultBindings: [],
        repeat: false,
        allowInEditable: false,
        storageProfile: 'profile',
        ...action,
        id: String(action.id)
      }));
  }

  function currentPointerHints(session) {
    const provider = session.options.pointerHintProvider || session.options.pointerHints;
    const values = typeof provider === 'function' ? provider() : provider;
    return (Array.isArray(values) ? values : []).filter(Boolean);
  }

  function actionEnabled(action) {
    try {
      return typeof action.enabled === 'function' ? !!action.enabled() : action.enabled !== false;
    } catch (_error) {
      return false;
    }
  }

  function installGlobalListeners() {
    if (listenersReady || typeof window === 'undefined' || typeof document === 'undefined') return;
    listenersReady = true;
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('keyup', handleGlobalKeyUp, true);
    window.addEventListener('blur', () => sessions.forEach(clearActiveUps));
    document.addEventListener('focusin', rememberInteractionContext, true);
    document.addEventListener('pointerdown', rememberInteractionContext, true);
    document.addEventListener('site-language-change', () => sessions.forEach((session) => {
      updateTrigger(session);
      if (session.isOpen()) render(session);
    }));
  }

  function rememberInteractionContext(event) {
    sessions.forEach((session) => {
      const target = event.target;
      if (!target || !session.root.contains(target)) return;
      if (target.closest('[role="dialog"], .calculator-input-settings-trigger')) return;
      const panel = target.closest('.card, .canvas-panel, [data-shortcut-context]');
      if (panel) session.lastContext = panel;
    });
  }

  function clearActiveUps(session) {
    session.activeUps.forEach((record) => {
      try { record.action.onUp?.(record.event); } catch (_error) { /* Best effort release. */ }
    });
    session.activeUps.clear();
  }

  function handleGlobalKeyDown(event) {
    const session = Array.from(sessions.values()).find((item) => item.root === document || item.root.contains(event.target));
    if (!session) return;
    if (session.capture) {
      handleCaptureKey(session, event);
      return;
    }
    if (session.isOpen() || event.defaultPrevented || event.isComposing) return;
    const binding = bindingFromEvent(event);
    if (!binding) return;
    const actions = currentActions(session);
    const action = actions.find((candidate) => actionBindings(session, candidate).includes(binding));
    if (!action || !actionEnabled(action)) return;
    if (!canTriggerFromTarget(action, binding, event.target)) return;
    if (event.repeat && !action.repeat) {
      return;
    }
    const handled = executeActionDown(session, action, event, binding);
    if (!handled) {
      session.setStatus(translate(session, 'unavailable'));
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handleGlobalKeyUp(event) {
    sessions.forEach((session) => {
      if (!executeActionUp(session, event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    });
  }

  function executeActionDown(session, action, event, binding) {
    let handled = true;
    try {
      if (typeof action.onDown === 'function') handled = action.onDown(event, binding) !== false;
      else if (typeof action.trigger === 'function') handled = action.trigger(event, binding) !== false;
      else handled = false;
    } catch (error) {
      handled = false;
      if (typeof console !== 'undefined' && console.error) console.error('Calculator shortcut failed', error);
    }
    if (handled && typeof action.onUp === 'function') {
      const token = event.code || binding;
      session.activeUps.set(token, { action, event });
    }
    return handled;
  }

  function executeActionUp(session, event) {
    const token = event.code || bindingFromEvent(event);
    const record = session.activeUps.get(token);
    if (!record) return false;
    session.activeUps.delete(token);
    try { record.action.onUp(event, bindingFromEvent(event)); } catch (_error) { /* Best effort release. */ }
    return true;
  }

  function handleCaptureKey(session, event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      session.capture = null;
      session.setStatus(translate(session, 'captureCancelled'));
      render(session);
      return;
    }
    const action = currentActions(session).find((item) => item.id === session.capture.actionId);
    if (!action) {
      session.capture = null;
      render(session);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (Number.isInteger(session.capture.index)) {
        const bindings = actionBindings(session, action);
        bindings.splice(session.capture.index, 1);
        setActionBindings(session, action, bindings);
        session.setStatus(translate(session, 'bindingRemoved'));
      }
      session.capture = null;
      render(session);
      return;
    }
    const binding = bindingFromEvent(event);
    if (!binding) return;
    if (isReservedBinding(binding)) {
      session.setStatus(translate(session, 'reserved'));
      return;
    }
    const ownBindings = actionBindings(session, action);
    if (ownBindings.includes(binding) && ownBindings[session.capture.index] !== binding) {
      session.setStatus(translate(session, 'duplicate'));
      return;
    }
    const conflict = currentActions(session).find((candidate) => (
      candidate.id !== action.id && actionBindings(session, candidate).includes(binding)
    ));
    if (conflict) {
      session.pendingConflict = { actionId: action.id, index: session.capture.index, binding, conflictId: conflict.id };
      session.capture = null;
      render(session);
      return;
    }
    commitCapturedBinding(session, action, session.capture.index, binding);
  }

  function commitCapturedBinding(session, action, index, binding) {
    const bindings = actionBindings(session, action);
    if (Number.isInteger(index)) bindings[index] = binding;
    else if (bindings.length < MAX_BINDINGS) bindings.push(binding);
    else {
      session.setStatus(translate(session, 'bindingLimit', { count: MAX_BINDINGS }));
      session.capture = null;
      render(session);
      return;
    }
    setActionBindings(session, action, bindings);
    session.capture = null;
    session.setStatus(translate(session, 'bindingSaved'));
    render(session);
  }

  function replaceConflict(session) {
    const pending = session.pendingConflict;
    if (!pending) return;
    const actions = currentActions(session);
    const action = actions.find((item) => item.id === pending.actionId);
    const conflict = actions.find((item) => item.id === pending.conflictId);
    if (!action || !conflict) {
      session.pendingConflict = null;
      render(session);
      return;
    }
    session.pendingConflict = null;
    if (!applyConflictReplacement(session, action, conflict, pending.index, pending.binding)) {
      session.setStatus(translate(session, 'bindingLimit', { count: MAX_BINDINGS }));
      render(session);
      return;
    }
    session.capture = null;
    session.setStatus(translate(session, 'bindingSaved'));
    render(session);
  }

  function applyConflictReplacement(session, action, conflict, index, binding) {
    const normalized = normalizeBindingString(binding);
    if (!normalized) return false;
    const bindings = actionBindings(session, action);
    if (!Number.isInteger(index) && bindings.length >= MAX_BINDINGS) return false;
    setActionBindings(session, conflict, actionBindings(session, conflict).filter((item) => item !== normalized));
    if (Number.isInteger(index)) bindings[index] = normalized;
    else bindings.push(normalized);
    setActionBindings(session, action, bindings);
    return true;
  }

  function makeTrigger(session, host) {
    const button = document.createElement('button');
    button.className = 'calculator-input-settings-trigger';
    button.type = 'button';
    button.innerHTML = GEAR_SVG;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => session.open(button));
    host.classList.add('calculator-input-settings-host');
    const title = host.querySelector('.panel-title-text');
    if (title) host.insertBefore(button, title);
    else host.insertBefore(button, host.firstChild);
    session.triggers.push(button);
    updateTrigger(session);
    return button;
  }

  function updateTrigger(session) {
    const label = translate(session, 'openSettings');
    session.triggers.forEach((button) => {
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('aria-expanded', String(session.isOpen()));
    });
  }

  function buildManagedDialog(session) {
    const overlay = document.createElement('div');
    overlay.className = 'calculator-input-settings-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="calculator-input-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="calculator-input-settings-title-${escapeHtml(session.pageId)}">
        <header class="calculator-input-settings-header">
          <h2 id="calculator-input-settings-title-${escapeHtml(session.pageId)}"></h2>
          <button class="calculator-input-settings-close" type="button">×</button>
        </header>
        <div class="calculator-input-settings-content"></div>
      </section>`;
    document.body.appendChild(overlay);
    session.overlay = overlay;
    session.dialog = overlay.querySelector('.calculator-input-settings-dialog');
    session.content = overlay.querySelector('.calculator-input-settings-content');
    overlay.querySelector('.calculator-input-settings-close').addEventListener('click', () => session.close());
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) session.close();
    });
    session.dialog.addEventListener('keydown', (event) => {
      if (session.capture) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        session.close();
      } else if (event.key === 'Tab') trapFocus(session, event);
    });
  }

  function trapFocus(session, event) {
    const focusable = Array.from(session.dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hidden && !element.closest('[hidden]'));
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function render(session) {
    if (!session.content) return;
    const actions = currentActions(session);
    const pointerHints = currentPointerHints(session);
    const groups = new Map();
    actions.forEach((action) => {
      const group = actionText(session, action, 'group') || 'General';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(action);
    });
    const profile = session.profile();
    const profileLabel = typeof session.options.profileLabel === 'function' ? session.options.profileLabel(profile) : '';
    let html = '';
    if (profileLabel) html += `<p class="calculator-input-profile">${escapeHtml(translate(session, 'profile', { profile: profileLabel }))}</p>`;
    html += `<section class="calculator-input-section"><h3>${escapeHtml(translate(session, 'keyboard'))}</h3><p class="calculator-input-help">${escapeHtml(translate(session, 'keysHelp'))}</p>`;
    groups.forEach((items, group) => {
      html += `<div class="calculator-input-group"><h4>${escapeHtml(group)}</h4>`;
      items.forEach((action) => {
        const bindings = actionBindings(session, action);
        const enabled = actionEnabled(action);
        html += `<div class="calculator-input-action${enabled ? '' : ' is-disabled'}" data-action-id="${escapeHtml(action.id)}">
          <div class="calculator-input-action-copy"><strong>${escapeHtml(actionText(session, action, 'label') || action.id)}</strong>${actionText(session, action, 'description') ? `<span>${escapeHtml(actionText(session, action, 'description'))}</span>` : ''}</div>
          <div class="calculator-input-bindings">`;
        if (!bindings.length) html += `<span class="calculator-input-unbound">${escapeHtml(translate(session, 'noBindings'))}</span>`;
        bindings.forEach((binding, index) => {
          const capturing = session.capture && session.capture.actionId === action.id && session.capture.index === index;
          html += `<button class="calculator-input-binding${capturing ? ' is-capturing' : ''}" type="button" data-edit-binding="${index}" aria-label="${escapeHtml(translate(session, 'editBinding', { binding: displayBinding(binding) }))}">${escapeHtml(capturing ? translate(session, 'pressKeys') : displayBinding(binding))}</button>`;
        });
        const adding = session.capture && session.capture.actionId === action.id && !Number.isInteger(session.capture.index);
        html += `<button class="calculator-input-add" type="button" data-add-binding${bindings.length >= MAX_BINDINGS ? ' disabled' : ''}>${escapeHtml(adding ? translate(session, 'pressKeys') : translate(session, 'addBinding'))}</button></div></div>`;
      });
      html += '</div>';
    });
    html += '</section>';
    html += `<section class="calculator-input-section"><h3>${escapeHtml(translate(session, 'pointer'))}</h3><p class="calculator-input-help">${escapeHtml(translate(session, 'pointerHelp'))}</p><div class="calculator-pointer-list">`;
    pointerHints.forEach((hint) => {
      const input = actionText(session, hint, 'input') || actionText(session, hint, 'label');
      const description = actionText(session, hint, 'description');
      html += `<div class="calculator-pointer-hint"><span class="calculator-pointer-lock" aria-hidden="true">🔒</span><strong>${escapeHtml(input)}</strong><span>${escapeHtml(description)}</span></div>`;
    });
    html += `</div></section>`;
    if (session.pendingConflict) {
      const pending = session.pendingConflict;
      const conflict = actions.find((item) => item.id === pending.conflictId);
      html += `<div class="calculator-input-conflict" role="alert"><p>${escapeHtml(translate(session, 'conflict', { binding: displayBinding(pending.binding), action: conflict ? actionText(session, conflict, 'label') : pending.conflictId }))}</p><div><button class="btn" type="button" data-conflict-replace>${escapeHtml(translate(session, 'replace'))}</button><button class="btn btn-ghost" type="button" data-conflict-cancel>${escapeHtml(translate(session, 'cancel'))}</button></div></div>`;
    }
    html += `<footer class="calculator-input-footer"><button class="btn btn-ghost" type="button" data-restore-defaults>${escapeHtml(translate(session, 'restore'))}</button><p class="calculator-input-status" role="status" aria-live="polite">${escapeHtml(session.status || '')}</p></footer>`;
    session.content.innerHTML = html;
    if (session.dialog && !session.options.externalDialog) {
      session.dialog.querySelector('h2').textContent = translate(session, 'settings');
      const close = session.dialog.querySelector('.calculator-input-settings-close');
      close.setAttribute('aria-label', translate(session, 'close'));
      close.title = translate(session, 'close');
    }
    bindRenderedControls(session);
  }

  function bindRenderedControls(session) {
    session.content.querySelectorAll('[data-action-id]').forEach((row) => {
      const actionId = row.getAttribute('data-action-id');
      row.querySelectorAll('[data-edit-binding]').forEach((button) => {
        button.addEventListener('click', () => {
          session.capture = { actionId, index: Number(button.getAttribute('data-edit-binding')) };
          session.pendingConflict = null;
          session.setStatus(translate(session, 'clearBinding'));
          render(session);
        });
      });
      row.querySelector('[data-add-binding]')?.addEventListener('click', () => {
        session.capture = { actionId, index: null };
        session.pendingConflict = null;
        session.setStatus(translate(session, 'clearBinding'));
        render(session);
      });
    });
    session.content.querySelector('[data-conflict-replace]')?.addEventListener('click', () => replaceConflict(session));
    session.content.querySelector('[data-conflict-cancel]')?.addEventListener('click', () => {
      session.pendingConflict = null;
      render(session);
    });
    session.content.querySelector('[data-restore-defaults]')?.addEventListener('click', () => {
      restoreDefaults(session);
      session.setStatus(translate(session, 'restored'));
      render(session);
    });
  }

  function restoreDefaults(session) {
    session.data = { version: VERSION, profiles: {} };
    writeStorage(session.storage, session.storageKey, session.data);
    session.capture = null;
    session.pendingConflict = null;
    if (session.activeUps) clearActiveUps(session);
    return session.data;
  }

  function register(options = {}) {
    if (typeof document === 'undefined') return null;
    const pageId = String(options.pageId || '').trim();
    if (!pageId) throw new Error('CalculatorInputSettings.register requires pageId.');
    if (sessions.has(pageId)) return sessions.get(pageId);
    const root = resolveElement(options.root) || document;
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const storageKey = `${STORAGE_PREFIX}${pageId}`;
    const session = {
      pageId,
      options,
      root,
      storage,
      storageKey,
      data: readStorage(storage, storageKey),
      triggers: [],
      activeUps: new Map(),
      capture: null,
      pendingConflict: null,
      status: '',
      returnFocus: null,
      lastContext: null,
      overlay: null,
      dialog: null,
      content: null,
      profile: () => {
        const value = typeof options.profileProvider === 'function' ? options.profileProvider() : 'default';
        return String(value || 'default');
      },
      isOpen: () => options.externalDialog && typeof options.externalDialog.isOpen === 'function'
        ? !!options.externalDialog.isOpen()
        : !!(session.overlay && !session.overlay.hidden),
      setStatus(message) {
        session.status = String(message || '');
        const status = session.content?.querySelector('.calculator-input-status');
        if (status) status.textContent = session.status;
      },
      open(trigger) {
        session.returnFocus = trigger || document.activeElement;
        render(session);
        if (options.externalDialog && typeof options.externalDialog.open === 'function') {
          options.externalDialog.open('controls', trigger);
        } else if (session.overlay) {
          session.overlay.hidden = false;
          updateTrigger(session);
          const focus = session.dialog.querySelector('.calculator-input-binding, .calculator-input-add, .calculator-input-settings-close');
          focus?.focus();
        }
      },
      close() {
        session.capture = null;
        session.pendingConflict = null;
        clearActiveUps(session);
        if (options.externalDialog && typeof options.externalDialog.close === 'function') options.externalDialog.close();
        else if (session.overlay) session.overlay.hidden = true;
        updateTrigger(session);
        const focus = session.returnFocus && session.returnFocus.isConnected !== false ? session.returnFocus : null;
        session.returnFocus = null;
        focus?.focus();
      },
      refresh() {
        updateTrigger(session);
        if (session.isOpen()) render(session);
      },
      triggerPrimary(selectors) {
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        const candidates = selectorList.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter((element, index, all) => all.indexOf(element) === index && elementAvailable(element));
        const activePanel = document.activeElement?.closest?.('.card, .canvas-panel, [data-shortcut-context]');
        const contexts = [activePanel, session.lastContext].filter(Boolean);
        for (const context of contexts) {
          const match = candidates.find((element) => context.contains(element));
          if (match) {
            match.click();
            return true;
          }
        }
        if (candidates.length === 1) {
          candidates[0].click();
          return true;
        }
        session.setStatus(translate(session, 'choosePanel'));
        return false;
      }
    };
    sessions.set(pageId, session);
    if (options.externalDialog) {
      session.content = resolveElement(options.externalDialog.content);
      session.dialog = resolveElement(options.externalDialog.dialog) || session.content?.closest('[role="dialog"]') || null;
      const existing = resolveElement(options.externalDialog.trigger);
      if (existing) session.triggers.push(existing);
    } else {
      buildManagedDialog(session);
    }
    const host = resolveElement(options.triggerHost || '.canvas-panel .panel-title');
    if (host) makeTrigger(session, host);
    installGlobalListeners();
    render(session);
    return session;
  }

  const api = {
    VERSION,
    STORAGE_PREFIX,
    MAX_BINDINGS,
    register,
    getSession: (pageId) => sessions.get(String(pageId || '')) || null,
    normalizeBindingString,
    bindingFromEvent,
    displayBinding,
    isReservedBinding,
    normalizeBindings,
    normalizeStoredData,
    readStorage,
    writeStorage,
    isInteractiveTarget,
    __test: {
      actionBindings,
      setActionBindings,
      profileForAction,
      currentActions,
      applyConflictReplacement,
      restoreDefaults,
      executeActionDown,
      executeActionUp,
      canTriggerFromTarget
    }
  };

  if (typeof window !== 'undefined') window.CalculatorInputSettings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
