(function () {
  'use strict';
  const tabs = document.getElementById('workspace-canvas-tabs');
  if (!tabs) return;
  let frame = 0;
  function update() {
    frame = 0;
    const edge = tabs.getBoundingClientRect().bottom - 1;
    tabs.querySelectorAll('.workspace-canvas-tab-group').forEach(tab => {
      const touches = Math.abs(tab.getBoundingClientRect().bottom - edge) < 1;
      tab.toggleAttribute('data-pane-edge', touches);
      tab.toggleAttribute('data-connected-edge', touches && !!tab.querySelector('.active'));
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  // Open/close/selection rebuilds the tabs; wrapping and scrolling can change
  // which ones physically touch the pane without changing the selection.
  new MutationObserver(schedule).observe(tabs, { childList: true });
  new ResizeObserver(schedule).observe(tabs);
  tabs.addEventListener('scroll', schedule);
  document.fonts?.ready.then(schedule);
  schedule();
})();
