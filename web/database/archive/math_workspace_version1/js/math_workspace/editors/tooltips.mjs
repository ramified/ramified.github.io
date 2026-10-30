// Native editors move controls between several shadow roots. Listen inside
// each surface: pointer events between two children can be retargeted away at
// the outer document. A top-layer popover also escapes pane overflow/isolation.
let nextTooltipId = 0;

export function createEditorTooltips() {
  const events = new AbortController(), surfaces = new WeakSet();
  const tip = document.createElement('div');
  tip.className = 'custom-tooltip';
  tip.id = `workspace-tooltip-${++nextTooltipId}`;
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('popover', 'manual');
  tip.style.cssText = 'margin:0;inset:auto;overflow-wrap:anywhere;box-sizing:border-box;max-height:calc(100vh - 20px);overflow:auto;';
  tip.hidden = true;
  let active = null, hovered = null, focused = null;
  const observer = new MutationObserver(() => {
    if (!active) return;
    const text = active.getAttribute('data-tooltip');
    if (!text) hide();
    else { tip.textContent = text; place(); }
  });

  function removeDescription() {
    if (!active) return;
    const ids = (active.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tip.id);
    if (ids.length) active.setAttribute('aria-describedby', ids.join(' '));
    else active.removeAttribute('aria-describedby');
  }
  function hide() {
    removeDescription(); active = null;
    tip.classList.remove('visible');
    if (tip.matches(':popover-open')) tip.hidePopover();
    tip.hidden = true;
  }
  function place() {
    if (!active) return;
    const rect = active.getBoundingClientRect();
    if (!active.isConnected || !rect.width || !rect.height || !active.getClientRects().length) { hide(); return; }
    const margin = 10, gap = 8;
    tip.style.left = '0px'; tip.style.top = '0px';
    const box = tip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(rect.left + (rect.width - box.width) / 2, innerWidth - box.width - margin));
    let top = rect.top - box.height - gap;
    if (top < margin) top = rect.bottom + gap;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(Math.max(margin, Math.min(top, innerHeight - box.height - margin)))}px`;
  }
  function show(el) {
    const text = el?.getAttribute('data-tooltip');
    if (!text) { hide(); return; }
    if (active !== el) hide();
    active = el; tip.textContent = text;
    const root = el.getRootNode();
    // Keep the ID reference in the label's own accessibility tree. The
    // popover enters the top layer without moving out of this shadow root.
    if (tip.getRootNode() !== root) root.append(tip);
    const ids = new Set((el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(tip.id); el.setAttribute('aria-describedby', [...ids].join(' '));
    tip.hidden = false;
    tip.showPopover(); tip.classList.add('visible'); place();
  }
  function label(event) {
    return event.composedPath().find(node => node.matches?.('[data-tooltip]')) || null;
  }
  function listen(target, type, callback, capture = false) {
    target.addEventListener(type, callback, { capture, signal: events.signal });
  }
  function bind(surface) {
    if (surfaces.has(surface)) return;
    surfaces.add(surface);
    observer.observe(surface, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden', 'class', 'data-tooltip']});
    listen(surface, 'pointerover', event => { hovered = label(event); show(hovered || focused); }, true);
    listen(surface, 'pointerout', event => {
      if (hovered?.contains(event.relatedTarget)) return;
      hovered = null; show(focused);
    }, true);
    listen(surface, 'focusin', event => { focused = label(event); show(focused || hovered); }, true);
    listen(surface, 'focusout', event => {
      if (focused?.contains(event.relatedTarget)) return;
      focused = null; show(hovered);
    }, true);
    listen(surface, 'keydown', event => { if (event.key === 'Escape') { hovered = focused = null; hide(); } }, true);
  }
  listen(document, 'scroll', place, true);
  listen(window, 'resize', place);
  listen(window, 'blur', () => { hovered = focused = null; hide(); });
  return {
    bind,
    hide() { hovered = focused = null; hide(); },
    destroy() { events.abort(); observer.disconnect(); hide(); tip.remove(); }
  };
}
