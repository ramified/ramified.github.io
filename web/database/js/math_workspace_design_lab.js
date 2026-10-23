(function (root) {
  'use strict';
  const experiments = new Map(), labs = new Set();

  // mount(host, api) builds one experiment's preview and controls. It returns
  // optional reset(), settings(), and destroy() methods. Reset and destroy also
  // run on removal or exit, restoring temporary workspace changes.
  function register(experiment) {
    if (!experiment || !/^[a-z][a-z0-9-]*$/.test(experiment.id) || !experiment.title || typeof experiment.mount !== 'function') throw new Error('A design experiment needs an id, title, and mount function.');
    if (experiments.has(experiment.id)) throw new Error('This design experiment is already registered.');
    experiments.set(experiment.id, experiment);
    labs.forEach(lab => lab.add(experiment));
    return () => {
      if (experiments.get(experiment.id) !== experiment) return;
      experiments.delete(experiment.id);
      labs.forEach(lab => lab.remove(experiment.id));
    };
  }

  function init(api) {
    let panel = null, active = false, selectedId = '';
    const mounted = new Map();
    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }
    function emptyState() {
      if (!panel) return;
      panel.querySelector('[data-design-empty]').hidden = mounted.size > 0;
      panel.querySelector('[data-design-picker-row]').hidden = mounted.size === 0;
    }
    function showExperiment(id) {
      if (!panel) return;
      selectedId = mounted.has(id) ? id : mounted.keys().next().value || '';
      panel.querySelector('[data-design-picker]').value = selectedId;
      mounted.forEach(({ section }, key) => { section.hidden = key !== selectedId; if (!section.hidden) section.open = true; });
    }
    function add(experiment) {
      if (!panel || mounted.has(experiment.id)) return;
      const section = element('details', 'workspace-design-experiment'); section.open = true; section.dataset.designExperiment = experiment.id;
      const summary = element('summary', '', experiment.title), content = element('div', 'workspace-design-experiment-content');
      section.append(summary);
      if (experiment.description) section.append(element('p', 'workspace-card-context', experiment.description));
      section.append(content); panel.querySelector('[data-design-experiments]').append(section);
      const controller = experiment.mount(content, { renderWorkspace: api.render }) || {};
      const actions = element('div', 'workspace-design-actions'), status = element('output', 'workspace-design-status'); status.setAttribute('role', 'status');
      if (typeof controller.reset === 'function') {
        const reset = element('button', 'btn btn-ghost', 'Reset'); reset.type = 'button'; reset.dataset.designReset = experiment.id; reset.setAttribute('aria-label', 'Reset ' + experiment.title);
        reset.addEventListener('click', () => { controller.reset(); status.textContent = 'Experiment reset.'; api.render(); }); actions.append(reset);
      }
      if (typeof controller.settings === 'function') {
        const copy = element('button', 'btn btn-ghost', 'Copy settings'); copy.type = 'button'; copy.dataset.designCopy = experiment.id; copy.setAttribute('aria-label', 'Copy ' + experiment.title + ' settings');
        copy.addEventListener('click', async () => {
          const text = JSON.stringify(controller.settings(), null, 2);
          try { await navigator.clipboard.writeText(text); status.textContent = 'Settings copied.'; }
          catch (_) { status.textContent = text; }
        }); actions.append(copy);
      }
      section.append(actions, status); mounted.set(experiment.id, { section, controller });
      panel.querySelector('[data-design-picker]').append(new Option(experiment.title, experiment.id));
      showExperiment(selectedId || experiment.id); emptyState();
    }
    function remove(id) {
      const entry = mounted.get(id); if (!entry) return;
      entry.controller.reset?.(); entry.controller.destroy?.(); entry.section.remove(); mounted.delete(id);
      [...panel.querySelector('[data-design-picker]').options].find(option => option.value === id)?.remove();
      showExperiment(selectedId === id ? '' : selectedId); emptyState(); api.render();
    }
    function build() {
      panel = element('section', 'card workspace-assets-inspector-card workspace-design-lab'); panel.id = 'workspace-design-lab';
      panel.innerHTML = '<div class="card-head" role="button" tabindex="0" aria-expanded="true"><span class="card-head-label">Design Lab</span><em class="toggle-icon">▾</em></div><div class="card-body"><p class="workspace-card-context">Try temporary interface changes. Each experiment has its own preview and settings.</p><label class="workspace-design-picker" data-design-picker-row>Experiment<select class="workspace-control" data-design-picker aria-label="Design Lab experiment"></select></label><div data-design-empty class="workspace-design-empty"><h3>No active experiments</h3><p>New experiments will appear here.</p></div><div data-design-experiments></div><div class="workspace-design-actions"><button type="button" class="btn btn-ghost" data-design-exit>Exit Design Lab</button></div></div>';
      panel.querySelector('[data-design-exit]').addEventListener('click', exit);
      panel.querySelector('[data-design-picker]').addEventListener('change', event => showExperiment(event.target.value));
      api.mount(panel); experiments.forEach(add); emptyState();
    }
    function open() {
      active = true; const url = new URL(location.href); url.searchParams.set('designLab', '1'); history.replaceState(null, '', url);
      if (!panel) build(); api.show(panel); api.render();
    }
    function exit() {
      active = false; [...mounted.keys()].forEach(remove);
      if (panel) { api.remove(panel); panel = null; }
      const url = new URL(location.href); url.searchParams.delete('designLab'); history.replaceState(null, '', url); api.render();
    }
    document.addEventListener('keydown', event => {
      if (event.isComposing || event.composedPath().some(node => node.matches?.('input,textarea,select,[contenteditable="true"]'))) return;
      if (event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyD') { event.preventDefault(); open(); }
    });
    labs.add({ add, remove });
    if (new URL(location.href).searchParams.get('designLab') === '1') open();
    return { open, exit, get active() { return active; } };
  }
  root.MathWorkspaceDesignLab = { init, register };
})(window);
