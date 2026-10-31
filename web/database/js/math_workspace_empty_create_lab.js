(function (root) {
  'use strict';
  const variants = [
    ['outline', 'Outline'], ['neutral', 'Ghost neutral (default)'], ['inline', 'Inline link'],
    ['dashed', 'Dashed drop zone'], ['round', 'Round +'], ['none', 'No button'], ['current', 'Original filled']
  ];
  // The approved appearance also applies outside Design Lab. Temporary changes
  // survive renders and experiment switching; Reset and exit restore this default.
  const defaults = { variant: 'neutral', aboveCenter: true };
  let selection = defaults.variant, raised = defaults.aboveCenter, openCreate = () => {};
  const el = (tag, text = '', className = '') => Object.assign(document.createElement(tag), { textContent: text, className });
  function decorate(empty, variant = selection, aboveCenter = raised) {
    if (!variant) return;
    empty.dataset.emptyCreateVariant = variant;
    empty.dataset.emptyCreateRaised = String(aboveCenter);
    const button = empty.querySelector('.workspace-assets-create'), hint = empty.lastElementChild;
    const body = el('div', '', 'workspace-empty-create-body'); body.append(...empty.childNodes); empty.append(body);
    hint.classList.add('workspace-empty-create-hint');
    if (variant !== 'current') button.classList.add('btn-ghost');
    if (variant === 'inline') {
      const sentence = el('p', '', 'workspace-empty-create-sentence');
      button.textContent = 'Create an object'; button.before(sentence);
      sentence.append(button, document.createTextNode(', or right-click anywhere here.')); hint.remove();
    } else if (variant === 'dashed') button.textContent = '+ New object';
    else if (variant === 'round') { button.textContent = '+'; button.setAttribute('aria-label', 'New object'); button.title = 'New object'; }
    else if (variant === 'none') hint.textContent = 'Right-click here or use the context menu to create an object. You can also double-click anywhere here.';
  }
  root.MathWorkspaceEmptyCreateLab = { decorate, init(open) { openCreate = open; } };
  root.MathWorkspaceDesignLab.register({
    id: 'empty-create-button', title: 'Empty Assets · New object',
    description: 'Ghost neutral above center is the default. Compare alternatives with Use this; Reset or exiting Design Lab restores the default. Preview actions open the existing New object dialog.',
    mount(host, { renderWorkspace }) {
      const cards = new Map(), options = el('div', '', 'workspace-empty-create-options');
      const row = el('label', '', 'workspace-check'), toggle = el('input'); toggle.type = 'checkbox'; toggle.dataset.emptyCreatePosition = '';
      row.append(toggle, document.createTextNode('Place empty content slightly above center (about 40%)'));
      const status = el('output', '', 'workspace-design-status'); status.setAttribute('role', 'status');
      function update() {
        toggle.checked = raised;
        cards.forEach(({ card, choose, preview }, id) => {
          const selected = id === selection;
          card.dataset.selected = String(selected); choose.setAttribute('aria-pressed', String(selected));
          preview.querySelector('.workspace-assets-empty').dataset.emptyCreateRaised = String(raised);
        });
        status.textContent = `Applied: ${variants.find(([id]) => id === selection)[1]} · ${raised ? 'above center' : 'centered'}.`;
      }
      toggle.addEventListener('change', () => { raised = toggle.checked; update(); renderWorkspace(); });
      for (const [id, label] of variants) {
        const card = el('div', '', 'workspace-empty-create-option'); card.dataset.emptyCreateOption = id;
        const heading = el('strong', label, 'workspace-empty-create-label');
        const preview = el('div', '', 'workspace-assets-content workspace-empty-create-preview'); preview.dataset.assetsEmpty = 'empty';
        const empty = el('div', '', 'workspace-assets-empty'), button = el('button', 'New object', 'btn workspace-assets-create');
        button.type = 'button'; button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', () => openCreate());
        empty.append(el('strong', 'This Assets view is empty.'), button, el('p', 'You can also right-click here to create a mathematical object.'));
        decorate(empty, id); preview.append(empty);
        // Sample gestures never reach the workspace context menu or create assets.
        preview.addEventListener('contextmenu', event => event.preventDefault());
        preview.addEventListener('dblclick', event => { if (id === 'none' && !event.target.closest('button,a')) button.click(); });
        const choose = el('button', 'Use this', 'btn btn-ghost'); choose.type = 'button'; choose.dataset.emptyCreateUse = id;
        choose.setAttribute('aria-label', 'Use ' + label + ' empty state');
        choose.addEventListener('click', () => { selection = id; update(); renderWorkspace(); });
        card.append(heading, preview, choose); options.append(card); cards.set(id, { card, choose, preview });
      }
      host.append(row, options, status); update();
      function reset() { selection = defaults.variant; raised = defaults.aboveCenter; update(); }
      return { reset, destroy: reset, settings: () => ({ emptyCreateButton: { variant: selection, aboveCenter: raised } }) };
    }
  });
})(window);
