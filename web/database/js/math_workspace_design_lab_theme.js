(function (root) {
  'use strict';

  const styleId = 'design-lab-interface-theme';
  const backgrounds = { low: '#F1F3EF', medium: '#EDF0EB', high: '#E7EBE6' };
  const defaults = { bg: backgrounds.medium, border: '#C3CBC5', accent: '#0E6B63', danger: '#8B3A2A' };
  const labels = { bg: '页面底色', border: '边框', accent: '强调色', danger: '危险色' };

  root.MathWorkspaceDesignLab.register({
    id: 'interface-theme',
    title: 'Interface theme',
    description: '临时试用 Layered 界面色板和外壳样式，退出后恢复。Shadow DOM 内的阴影只跟随颜色，不跟随几何。',
    mount(host) {
      const body = document.body, events = new AbortController();
      const previous = new Map(), overrides = new Map(), inputs = new Map(), hexLabels = new Map();
      const hadStyleAttribute = body.hasAttribute('style');
      let style = null, applied = false, depth = 'medium', controlStyle = 'tinted', colors = { ...defaults };

      function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
      }
      function selectField(label, key, options) {
        const row = element('label', '', 'workspace-field');
        const select = element('select', '', 'workspace-control');
        select.dataset.interfaceTheme = key; select.setAttribute('aria-label', label);
        for (const [value, title] of options) select.append(new Option(title, value));
        row.append(element('span', label, 'input-label'), select); host.append(row);
        return select;
      }
      const presetInput = selectField('预设', 'preset', [['layered', 'Layered']]);
      const depthInput = selectField('层次强度', 'depth', [['low', '低'], ['medium', '中'], ['high', '高']]);
      const headerInput = selectField('头部样式', 'header', [['white', '白色']]);
      const controlInput = selectField('控件样式', 'controls', [['tinted', '微灰底加边框'], ['white', '白底加边框']]);
      const colorFields = element('div', '', 'workspace-form-fields');
      for (const name of Object.keys(defaults)) {
        const row = element('label', '', 'workspace-field'), input = element('input', '', 'workspace-control');
        input.type = 'color'; input.dataset.interfaceThemeColor = name; input.setAttribute('aria-label', labels[name]);
        const output = element('output'); output.dataset.interfaceThemeHex = name;
        row.append(element('span', labels[name], 'input-label'), input, output); colorFields.append(row);
        inputs.set(name, input); hexLabels.set(name, output);
        input.addEventListener('input', () => { colors[name] = input.value.toUpperCase(); apply(); }, { signal: events.signal });
      }
      host.append(colorFields);
      const applyButton = element('button', '应用 Layered', 'btn btn-ghost');
      applyButton.type = 'button'; applyButton.dataset.interfaceThemeApply = '';
      const status = element('output', '', 'workspace-card-context'); status.setAttribute('role', 'status');
      host.append(applyButton, status);

      function setVariable(name, value) {
        if (!previous.has(name)) previous.set(name, { value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) });
        overrides.set(name, value); body.style.setProperty(name, value);
      }
      function syncControls() {
        presetInput.value = 'layered'; depthInput.value = depth; headerInput.value = 'white'; controlInput.value = controlStyle;
        for (const name of inputs.keys()) { inputs.get(name).value = colors[name]; hexLabels.get(name).textContent = colors[name]; }
        status.textContent = applied ? 'Layered 预览已应用。' : '页面已还原；调整选项或点击“应用 Layered”重新预览。';
      }
      function apply() {
        const variables = {
          '--bg': colors.bg, '--surface': '#FFFFFF', '--border': colors.border,
          '--text': '#18212B', '--muted': '#4F5A64', '--accent': colors.accent, '--accent2': colors.danger,
          '--ws-surface': '#FFFFFF', '--ws-surface-strong': '#FFFFFF', '--ws-danger': colors.danger,
          '--ws-danger-tint': '#FBEFEA', '--ws-accent-tint': '#D3E8E3', '--ws-shadow': 'rgba(24,33,43,0.14)'
        };
        for (const [name, value] of Object.entries(variables)) setVariable(name, value);
        const inner = controlStyle === 'white' ? '#FFFFFF' : '#F6F8F5';
        const controls = 'body.ramified-theme :where(.workspace-control,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),select,textarea)';
        const secondary = 'body.ramified-theme :is(.btn-ghost,.workspace-card-tool:not([data-workspace-card-action="hide"]),.import-export-tab)';
        const close = 'body.ramified-theme :is(.workspace-canvas-tab-close,.card-head [data-workspace-card-action="hide"])';
        const rules = [
          'body.ramified-theme :is(.card,.canvas-panel) { background: #FFFFFF; border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(24,33,43,0.06); }',
          'body.ramified-theme > header { background: #FFFFFF; color: var(--text); border: 0; border-bottom: 1px solid var(--border); box-shadow: 0 1px 2px rgba(24,33,43,0.06); }',
          'body.ramified-theme > header span { color: var(--muted); }',
          'body.ramified-theme .card-head { background: #FFFFFF; border-color: var(--border); }',
          'body.ramified-theme :is(.workspace-create-dialog,.workspace-settings-dialog,.workspace-assets-delete-dialog,.workspace-card-picker) { background: #FFFFFF; color: var(--text); border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(24,33,43,0.18); }',
          `${controls} { background: ${inner}; color: var(--text); border: 1px solid var(--border); }`,
          `${controls}:focus { border: 2px solid var(--accent); outline: none; }`,
          `body.ramified-theme .workspace-canvas-tab-group { background: ${inner}; border: 1px solid var(--border); }`,
          `body.ramified-theme .workspace-canvas-tab { background: ${inner}; color: var(--text); }`,
          'body.ramified-theme .workspace-canvas-tab.active { background: #FFFFFF; color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }',
          `body.ramified-theme tbody tr:nth-child(even) { background: ${inner}; }`,
          'body.ramified-theme .workspace-asset-item:hover { background: #F6F8F5; }',
          'body.ramified-theme .workspace-asset-item[aria-selected="true"] { background: #D3E8E3; border: 1px solid var(--accent); }',
          'body.ramified-theme .btn:not(.btn-ghost):not(.workspace-assets-delete-confirm) { background: var(--accent); color: #FFFFFF; border-color: var(--accent); }',
          `${secondary} { color: var(--text); border: 1px solid var(--border); background: transparent; }`,
          `${secondary}:hover { color: var(--accent); border-color: var(--accent); background: transparent; }`,
          `${close} { color: var(--muted); background: transparent; }`,
          `${close}:is(:hover,:focus-visible) { color: var(--text); background: transparent; }`,
          'body.ramified-theme .workspace-assets-delete-confirm { background: var(--accent2); border-color: var(--accent2); color: #FFFFFF; }',
          'body.ramified-theme :is(h1,.card-head-label,.panel-title-text,#workspace-canvas-name,.workspace-inspector-head h2) { color: var(--text); font-weight: 600; }',
          'body.ramified-theme .input-label { color: var(--muted); font-weight: 400; }',
          'body.ramified-theme :is(td,dd,.workspace-object-display-details) { color: var(--text); }',
          'body.ramified-theme :is(a,a:visited), body.ramified-theme > header span :is(a,a:visited) { color: var(--accent); }',
          'body.ramified-theme .workspace-canvas-pane { border: 1px solid var(--border); outline: none; }',
          'body.ramified-theme .workspace-canvas-pane.focused { outline: none; }',
          'body.ramified-theme .workspace-canvas-pane:focus-within { border-color: var(--accent); }',
          'body.ramified-theme #dnd-ghost { box-shadow: 0 6px 18px var(--ws-shadow) !important; }'
        ];
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.append(style); }
        style.textContent = rules.join('\n'); applied = true; syncControls();
      }
      function reset() {
        style?.remove(); style = null;
        for (const [name, original] of previous) {
          if (original.value) body.style.setProperty(name, original.value, original.priority);
          else body.style.removeProperty(name);
        }
        previous.clear(); overrides.clear();
        applied = false; depth = 'medium'; controlStyle = 'tinted'; colors = { ...defaults }; syncControls();
        const removeEmptyStyle = () => {
          if (!hadStyleAttribute && body.getAttribute('style') === '') body.removeAttribute('style');
        };
        removeEmptyStyle(); queueMicrotask(removeEmptyStyle);
      }
      presetInput.addEventListener('change', apply, { signal: events.signal });
      depthInput.addEventListener('change', () => { depth = depthInput.value; colors.bg = backgrounds[depth]; apply(); }, { signal: events.signal });
      headerInput.addEventListener('change', apply, { signal: events.signal });
      controlInput.addEventListener('change', () => { controlStyle = controlInput.value; apply(); }, { signal: events.signal });
      applyButton.addEventListener('click', apply, { signal: events.signal });
      apply();
      return {
        reset,
        settings: () => ({ preset: 'layered', applied, depth, colors: { ...colors }, headerStyle: 'white', controlStyle, overriddenVariables: [...overrides.keys()], variables: Object.fromEntries(overrides), shadowDOM: 'color only; native shadow geometry is unchanged' }),
        destroy() { reset(); events.abort(); }
      };
    }
  });
})(window);
