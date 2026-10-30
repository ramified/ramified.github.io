(function (root) {
  'use strict';

  const styleId = 'design-lab-interface-theme', scope = 'body.ramified-theme';
  const prefix = '--design-lab-interface-';
  const variable = name => `var(${prefix}${name})`;
  const patches = {
    P1: {
      title: '头部与对齐',
      description: '缩小头部；左右对齐主布局，保持页面底色。',
      variables: { 'header-padding': '12px', 'title-size': '24px', 'subtitle-size': '14px' },
      references: ['--bg', '--border', '--text', '--muted'],
      css: `${scope} > header {
        padding-block: ${variable('header-padding')};
        padding-left: max(${variable('layout-left')}, calc((100% - ${variable('layout-max')}) / 2 + ${variable('layout-left')}));
        padding-right: max(${variable('layout-right')}, calc((100% - ${variable('layout-max')}) / 2 + ${variable('layout-right')}));
        background: var(--bg); color: var(--text); border-bottom: 1px solid var(--border);
      }
      ${scope} > header h1 { font-size: ${variable('title-size')}; font-weight: 400; line-height: 1.3; }
      ${scope} > header span { min-width: 0; font: ${variable('subtitle-size')}/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--muted); }`
    },
    P2: {
      title: 'Assets 单线框（减线暂缓）',
      description: '仅规范 Assets 单线框，不改变卡片颜色。只确认一处重复边界，未达两处安全删除条件，暂不实施减线。',
      variables: {}, references: ['--border', '--accent'],
      css: `${scope} .workspace-canvas-pane:has(.workspace-assets-view) { border: 1px solid var(--border); outline: none; }
      ${scope} .workspace-canvas-pane:has(.workspace-assets-view):focus-within { border-color: var(--accent); }
      ${scope} .workspace-assets-view:focus-visible { box-shadow: none; }`
    },
    P4: {
      title: '强调色只用于重点',
      description: '次要按钮和面板工具中性化；当前标签页用下划线，保留删除警示色。',
      variables: { 'secondary-border': '#C9D0CA' }, references: ['--accent', '--accent2', '--text', '--muted', '--border', '--surface'],
      css: `${scope} .btn-ghost { color: var(--text); border: 1px solid ${variable('secondary-border')}; background: transparent; }
      ${scope} .btn-ghost:hover { color: var(--accent); border-color: var(--accent); background: transparent; }
      ${scope} .workspace-canvas-tab-group:has(.active) { border-color: var(--border); }
      ${scope} .workspace-canvas-tab.active { color: var(--text); background-image: linear-gradient(var(--accent), var(--accent)); background-repeat: no-repeat; background-size: 100% 2px; background-position: bottom; }
      ${scope} .workspace-asset-item[aria-selected='true'] { color: var(--text); border-color: var(--accent); }
      ${scope} .card-head :is(.workspace-card-tool, .card-pin-btn, .toggle-icon, .drag-handle),
      ${scope} .workspace-canvas-tab-close { color: var(--muted); background: transparent; }
      ${scope} .card-head :is(.workspace-card-tool, .card-pin-btn, .toggle-icon, .drag-handle):hover,
      ${scope} .card-head :is(.workspace-card-tool, .card-pin-btn):focus-visible,
      ${scope} .workspace-canvas-tab-close:hover,
      ${scope} .workspace-canvas-tab-close:focus-visible { color: var(--text); background: transparent; }
      ${scope} .card-head :is(.workspace-card-tool, .card-pin-btn):disabled { color: var(--muted); opacity: .4; }
      ${scope} .workspace-assets-delete-confirm { border-color: var(--accent2) !important; background: var(--accent2) !important; }`
    },
    P5: {
      title: '更浅的页面底色', description: '仅将页面底色改为 #F7F8F5。',
      variables: {}, bodyVariables: { '--bg': '#F7F8F5' }, references: ['--text', '--muted'], css: ''
    },
    P6: {
      title: '图标颜色（CSS 可控制的部分）',
      description: '分别比较字母和通用图标配色；两项默认保持当前，不改变 canvas 缩略图。',
      variables: {}, references: ['--accent', '--text', '--muted'], css: ''
    }
  };

  root.MathWorkspaceDesignLab.register({
    id: 'interface-theme', title: 'Interface theme',
    description: '在 Current 默认外观上独立试用 P1、P2、P4、P5、P6；取消勾选、Reset 或退出后恢复。不改变画布、预设和 Shadow DOM 内部样式。',
    mount(host) {
      const body = document.body, events = new AbortController(), enabled = new Set();
      const previous = new Map(), inputs = new Map(), iconInputs = new Map();
      const iconColors = { letters: 'current', generic: 'current' };
      const hadStyleAttribute = body.hasAttribute('style');
      let style = null;
      function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
      }
      const presetRow = element('label', '', 'workspace-field');
      const preset = element('select', '', 'workspace-control');
      preset.dataset.interfaceTheme = 'preset'; preset.setAttribute('aria-label', '预设');
      preset.append(new Option('Current', 'current'));
      presetRow.append(element('span', '预设', 'input-label'), preset);
      const list = element('div', '', 'workspace-form-fields');
      for (const [id, patch] of Object.entries(patches)) {
        const entry = element('div'), label = element('label', '', 'workspace-check'), input = element('input');
        input.type = 'checkbox'; input.dataset.interfaceThemePatch = id;
        label.append(input, element('span', `${id} ${patch.title}`));
        entry.append(label, element('p', patch.description, 'workspace-card-context')); list.append(entry); inputs.set(id, input);
        input.addEventListener('change', () => { if (input.checked) enabled.add(id); else enabled.delete(id); apply(); }, { signal: events.signal });
        if (id === 'P6') {
          const choices = {
            letters: ['字母颜色', [['current', '当前'], ['accent', '强调色'], ['text', '墨色']]],
            generic: ['通用图标颜色', [['current', '当前橙色'], ['accent', '强调色'], ['muted', '次要灰']]]
          };
          for (const [key, [title, options]] of Object.entries(choices)) {
            const row = element('label', '', 'workspace-field'), select = element('select', '', 'workspace-control');
            select.dataset.interfaceThemeIcon = key; select.setAttribute('aria-label', title);
            for (const [value, label] of options) select.append(new Option(label, value));
            row.append(element('span', title, 'input-label'), select); entry.append(row); iconInputs.set(key, select);
            select.addEventListener('change', () => {
              iconColors[key] = select.value;
              if (select.value !== 'current') { enabled.add('P6'); inputs.get('P6').checked = true; }
              apply();
            }, { signal: events.signal });
          }
        }
      }
      const status = element('output', 'Current：未应用任何补丁。', 'workspace-card-context');
      status.setAttribute('role', 'status'); host.append(presetRow, list, status);

      function values(id) {
        const patch = patches[id], result = Object.fromEntries(Object.entries(patch.variables).map(([key, value]) => [prefix + key, value]));
        Object.assign(result, patch.bodyVariables);
        if (id === 'P1') {
          const layout = document.querySelector('.math-workspace-layout');
          if (layout) {
            const computed = getComputedStyle(layout);
            result[prefix + 'layout-left'] = computed.paddingLeft;
            result[prefix + 'layout-right'] = computed.paddingRight;
            result[prefix + 'layout-max'] = computed.maxWidth === 'none' ? computed.width : computed.maxWidth;
          }
        }
        if (id === 'P6') {
          if (iconColors.letters !== 'current') result['--workspace-icon-exact'] = iconColors.letters === 'accent' ? 'var(--accent)' : 'var(--text)';
          if (iconColors.generic !== 'current') result['--workspace-icon-generic'] = iconColors.generic === 'accent' ? 'var(--accent)' : 'var(--muted)';
        }
        return result;
      }
      function restore(name, original) {
        if (original.value) body.style.setProperty(name, original.value, original.priority);
        else body.style.removeProperty(name);
      }
      function cleanStyleAttribute() {
        if (!hadStyleAttribute && body.getAttribute('style') === '') body.removeAttribute('style');
      }
      function apply() {
        const wanted = Object.assign({}, ...[...enabled].sort().map(values));
        for (const [name, original] of previous) if (!Object.hasOwn(wanted, name)) { restore(name, original); previous.delete(name); }
        for (const [name, value] of Object.entries(wanted)) {
          if (!previous.has(name)) previous.set(name, { value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) });
          body.style.setProperty(name, value);
        }
        if (enabled.size) {
          if (!style) { style = element('style'); style.id = styleId; document.head.append(style); }
          style.textContent = [...enabled].sort().map(id => patches[id].css).join('\n');
        } else { style?.remove(); style = null; cleanStyleAttribute(); queueMicrotask(cleanStyleAttribute); }
        status.textContent = enabled.size ? `已启用：${[...enabled].sort().join('、')}` : 'Current：未应用任何补丁。';
      }
      function reset() {
        enabled.clear(); preset.value = 'current'; for (const input of inputs.values()) input.checked = false;
        for (const [key, input] of iconInputs) { iconColors[key] = 'current'; input.value = 'current'; }
        apply();
      }
      preset.addEventListener('change', reset, { signal: events.signal });
      // Read the existing responsive layout gutters rather than duplicating its breakpoints or pixel values.
      root.addEventListener('resize', () => { if (enabled.has('P1')) apply(); }, { signal: events.signal });
      return {
        reset,
        settings() {
          const computed = getComputedStyle(body);
          return { preset: 'current', iconColors: { ...iconColors }, enabledPatches: [...enabled].sort(), patches: Object.fromEntries(Object.entries(patches).map(([id, patch]) => [id, {
            enabled: enabled.has(id), variables: values(id), references: Object.fromEntries(patch.references.map(name => [name, computed.getPropertyValue(name).trim()]))
          }])), overriddenVariables: [...previous.keys()].sort(), exclusions: ['Canvas / JS-painted thumbnails', 'Native editor Shadow DOM', 'Mathematical content and code fonts', 'Decorative shadows and native editor shadows'] };
        },
        destroy() { reset(); events.abort(); }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
