// Workspace-only touch gestures. Mouse/pen events and editable text stay native.
(() => {
  'use strict';
  let gesture = null, suppressUntil = 0, lastTap = null;
  const point = touch => ({ x: touch.clientX, y: touch.clientY });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function hitTest(p) {
    let node = document.elementFromPoint(p.x, p.y), inner;
    while (node?.shadowRoot && (inner = node.shadowRoot.elementFromPoint(p.x, p.y)) && inner !== node) node = inner;
    return node;
  }
  function dragEvent(target, type, g, p) {
    if (!target) return false;
    return !target.dispatchEvent(new DragEvent(type, { bubbles: true, composed: true, cancelable: true,
      clientX: p.x, clientY: p.y, dataTransfer: g.transfer }));
  }
  function cleanup() {
    const g = gesture;
    if (!g) return;
    clearTimeout(g.timer);
    g.target?.removeAttribute('data-touch-held');
    g.ghost?.remove();
    if (g.dragging) {
      dragEvent(g.over, 'dragleave', g, g.position);
      dragEvent(g.asset, 'dragend', g, g.position);
    }
    gesture = null;
  }
  document.addEventListener('touchstart', event => {
    suppressUntil = 0;
    if (event.touches.length !== 1) { cleanup(); lastTap = null; return; }
    const path = event.composedPath();
    if (path.some(node => node.matches?.('input,textarea,select,button,a,[contenteditable="true"]'))) return;
    const view = path.find(node => node.classList?.contains('workspace-assets-view'));
    const label = path.find(node => node.matches?.('[data-object-kind][data-object-id]'));
    if (!view && !label) return;
    cleanup();
    const asset = path.find(node => node.dataset?.assetKey);
    const target = asset || label || path[0];
    const g = gesture = { target, asset, start: point(event.touches[0]), position: point(event.touches[0]), held: false };
    g.timer = setTimeout(() => { g.held = true; target.setAttribute('data-touch-held', 'true'); }, 500);
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    const g = gesture;
    if (!g || event.touches.length !== 1) return;
    g.position = point(event.touches[0]);
    if (!g.held) { if (distance(g.position, g.start) > 9) { cleanup(); lastTap = null; } return; }
    // Cancel scrolling only after a stationary hold; ordinary swipes remain native.
    if (event.cancelable) event.preventDefault();
    if (!g.asset || distance(g.position, g.start) < 9 && !g.dragging) return;
    if (!g.dragging) {
      g.dragging = true;
      g.transfer = new DataTransfer();
      dragEvent(g.asset, 'dragstart', g, g.position);
      g.ghost = g.asset.cloneNode(true);
      g.ghost.removeAttribute('id');
      g.ghost.classList.add('workspace-touch-drag-ghost');
      g.ghost.setAttribute('aria-hidden', 'true');
      g.ghost.inert = true;
      document.body.append(g.ghost);
    }
    g.ghost.style.left = `${g.position.x + 14}px`;
    g.ghost.style.top = `${g.position.y + 14}px`;
    const over = hitTest(g.position);
    if (over !== g.over) {
      dragEvent(g.over, 'dragleave', g, g.position);
      g.over = over;
      dragEvent(over, 'dragenter', g, g.position);
    }
    g.allowed = dragEvent(over, 'dragover', g, g.position);
  }, { passive: false });
  document.addEventListener('touchend', event => {
    const g = gesture;
    if (!g) return;
    if (g.held) {
      if (event.cancelable) event.preventDefault();
      suppressUntil = Date.now() + 700;
      lastTap = null;
      if (g.dragging) {
        if (g.allowed) dragEvent(g.over, 'drop', g, g.position);
      } else if (g.target.isConnected) {
        const menu = new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true,
          clientX: g.position.x, clientY: g.position.y, button: 2 });
        menu.workspaceTouch = true;
        g.target.dispatchEvent(menu);
      }
    } else if (g.asset) {
      const now = Date.now(), key = g.asset.dataset.assetKey;
      if (lastTap?.key === key && now - lastTap.time < 350 && distance(g.position, lastTap.position) < 20) {
        if (event.cancelable) event.preventDefault();
        const doubleTap = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
        doubleTap.workspaceTouch = true;
        g.asset.dispatchEvent(doubleTap);
        lastTap = null;
      } else lastTap = { key, time: now, position: g.position };
    }
    cleanup();
  }, { passive: false });
  document.addEventListener('touchcancel', cleanup, { passive: true });
  window.addEventListener('blur', cleanup);
  document.addEventListener('contextmenu', event => {
    // Suppress the browser's own long-press menu; open ours on release instead.
    if (event.isTrusted && gesture) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', event => {
    if (Date.now() < suppressUntil && (event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
})();
