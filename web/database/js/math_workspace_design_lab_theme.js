(function (root) {
  'use strict';

  root.MathWorkspaceDesignLab.register({
    id: 'interface-theme',
    title: 'Interface theme',
    description: 'Current 是已固化的当前外观；暂时没有新的界面实验。',
    mount(host) {
      const events = new AbortController();
      const row = document.createElement('label'); row.className = 'workspace-field';
      const label = document.createElement('span'); label.className = 'input-label'; label.textContent = '预设';
      const preset = document.createElement('select'); preset.className = 'workspace-control';
      preset.dataset.interfaceTheme = 'preset'; preset.setAttribute('aria-label', '预设');
      preset.append(new Option('Current', 'current')); row.append(label, preset); host.append(row);
      const message = document.createElement('p'); message.className = 'workspace-card-context';
      message.textContent = '已选样式由 ramified_ui_refine.css 提供；此框架不再重复应用 P1、P2、P4、P5、P6。';
      host.append(message);
      function reset() { preset.value = 'current'; }
      preset.addEventListener('change', reset, { signal: events.signal });
      return {
        reset,
        settings: () => ({ preset: 'current', baseline: 'ramified_ui_refine.css', enabledPatches: [], overriddenVariables: [] }),
        destroy() { events.abort(); }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
