(function (root) {
  'use strict';
  function decorate(empty) {
    empty.dataset.emptyCreateVariant = 'neutral';
    empty.dataset.emptyCreateRaised = 'true';
    const button = empty.querySelector('.workspace-assets-create'), hint = empty.lastElementChild;
    const body = document.createElement('div'); body.className = 'workspace-empty-create-body';
    body.append(...empty.childNodes); empty.append(body);
    hint.classList.add('workspace-empty-create-hint');
    button.classList.add('btn-ghost');
  }
  root.MathWorkspaceEmptyCreateLab = { decorate };
})(window);
