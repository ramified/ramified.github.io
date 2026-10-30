(function (root) {
  'use strict';

  root.MathWorkspaceDesignLab.register({
    id: 'interface-theme',
    title: 'Interface theme',
    description: 'Current 已包含确认的完整绿色轮廓；暂时没有新的界面实验。',
    mount(host) {
      const row = document.createElement('label'); row.className = 'workspace-field';
      const label = document.createElement('span'); label.className = 'input-label'; label.textContent = '预设';
      const preset = document.createElement('select'); preset.className = 'workspace-control';
      preset.dataset.interfaceTheme = 'preset'; preset.setAttribute('aria-label', '预设');
      preset.append(new Option('Current · 当前外观', 'current')); row.append(label, preset); host.append(row);
      const message = document.createElement('p'); message.className = 'workspace-card-context';
      message.textContent = '完整绿色轮廓已设为默认外观。普通页面、Reset 和退出 Design Lab 均保留此样式。';
      host.append(message);
      return {
        reset() { preset.value = 'current'; },
        settings: () => ({ preset: 'current', baseline: 'ramified_ui_refine.css', enabledPatches: [], overriddenVariables: [] })
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
