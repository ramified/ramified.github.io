(function (root) {
  'use strict';

  const styleId = 'design-lab-interface-theme';
  const colorVariables = {
    bg: ['--bg'],
    surface: ['--surface', '--ws-surface', '--ws-surface-strong'],
    border: ['--border'],
    text: ['--text'],
    muted: ['--muted'],
    accent: ['--accent'],
    danger: ['--accent2', '--ws-danger']
  };
  const labels = { bg: '页面底色', surface: '面板底色', border: '边框', text: '文字', muted: '次要文字', accent: '强调色', danger: '危险色' };
  const presets = {
    A: { bg: '#F7F7F4', surface: '#FFFFFF', border: '#CDD3CE', header: 'light' },
    B: { bg: '#F1F3EF', surface: '#FFFFFF', border: '#BAC3BC', header: 'light' },
    C: { bg: '#F1F3EF', surface: '#FFFFFF', border: '#BAC3BC', header: 'dark' }
  };

  root.MathWorkspaceDesignLab.register({
    id: 'interface-theme',
    title: 'Interface theme',
    description: '临时试用界面色板和外壳样式，退出后恢复。Shadow DOM 内的阴影只跟随颜色，不跟随几何。',
    mount(host) {
      const body = document.body, events = new AbortController();
      const previous = new Map(), overrides = new Map(), inputs = new Map(), hexLabels = new Map();
      const hadStyleAttribute = body.hasAttribute('style');
      let style = null, preset = 'current', headerStyle = 'light', controlStyle = 'white';
      let headerChanged = false, controlsChanged = false;

      function hex(value) {
        const text = value.trim();
        if (/^#[\da-f]{6}$/i.test(text)) return text.toUpperCase();
        const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(text);
        if (short) return ('#' + short.slice(1).map(part => part + part).join('')).toUpperCase();
        throw new Error('Interface theme expects a hexadecimal base color.');
      }
      const computed = getComputedStyle(body);
      const initialColors = Object.fromEntries(Object.entries(colorVariables).map(([name, variables]) => [name, hex(computed.getPropertyValue(variables[0]))]));
      let colors = { ...initialColors };

      function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
      }
      function selectField(label, key, options) {
        const row = element('label', '', 'workspace-field');
        const select = element('select', '', 'workspace-control');
        select.dataset.interfaceTheme = key;
        select.setAttribute('aria-label', label);
        for (const [value, title] of options) select.append(new Option(title, value));
        row.append(element('span', label, 'input-label'), select);
        host.append(row);
        return select;
      }
      const presetInput = selectField('预设', 'preset', [['current', 'Current'], ['A', 'A 纸白'], ['B', 'B 首页同款'], ['C', 'C 深色头部']]);
      const colorFields = element('div', '', 'workspace-form-fields');
      for (const name of Object.keys(colorVariables)) {
        const row = element('label', '', 'workspace-field');
        const input = element('input', '', 'workspace-control');
        input.type = 'color'; input.dataset.interfaceThemeColor = name; input.setAttribute('aria-label', labels[name]);
        const output = element('output'); output.dataset.interfaceThemeHex = name;
        row.append(element('span', labels[name], 'input-label'), input, output); colorFields.append(row);
        inputs.set(name, input); hexLabels.set(name, output);
        input.addEventListener('input', () => {
          colors[name] = input.value.toUpperCase();
          for (const variable of colorVariables[name]) setVariable(variable, colors[name]);
          syncControls();
        }, { signal: events.signal });
      }
      host.append(colorFields);
      const headerInput = selectField('头部样式', 'header', [['light', '浅色'], ['dark', '深色']]);
      const controlInput = selectField('控件样式', 'controls', [['outline', '线框（透明加 1px 边框）'], ['white', '白底加边框']]);

      function setVariable(name, value) {
        if (!previous.has(name)) previous.set(name, { value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) });
        overrides.set(name, value); body.style.setProperty(name, value);
      }
      function syncControls() {
        presetInput.value = preset; headerInput.value = headerStyle; controlInput.value = controlStyle;
        for (const name of inputs.keys()) { inputs.get(name).value = colors[name]; hexLabels.get(name).textContent = colors[name]; }
      }
      function updateRules() {
        const rules = [];
        if (headerChanged) {
          const dark = headerStyle === 'dark';
          rules.push(`body.ramified-theme > header { background: ${dark ? '#18212B' : '#FFFFFF'}; color: ${dark ? '#F1F3EF' : 'var(--text)'}; border-bottom: ${dark ? '0' : '1px solid var(--border)'}; }`);
          rules.push('body.ramified-theme > header :is(h1,.wordmark) { color: inherit; }');
          rules.push(`body.ramified-theme > header span { color: ${dark ? '#A9B3AE' : 'var(--muted)'}; }`);
        }
        if (controlsChanged) {
          const background = controlStyle === 'white' ? '#FFFFFF' : 'transparent';
          const controls = 'body.ramified-theme :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),select,textarea)';
          rules.push(`${controls} { background: ${background}; color: var(--text); border: 1px solid var(--border); }`);
          rules.push(`${controls}:focus { border-color: var(--accent); ${preset === 'A' ? 'border-width: 2px; outline: none;' : ''} }`);
          rules.push(`body.ramified-theme .workspace-canvas-tab-group { background: ${background}; border: 1px solid var(--border); }`);
          rules.push(`body.ramified-theme .workspace-canvas-tab { background: ${background}; }`);
          rules.push(`body.ramified-theme .btn-ghost { background: ${background}; }`);
        }
        if (preset !== 'current') {
          rules.push('body.ramified-theme :is(.card,.canvas-panel) { background: var(--surface); border-color: var(--border); }');
          rules.push('body.ramified-theme :is(.workspace-create-dialog,.workspace-settings-dialog,.workspace-assets-delete-dialog) { background: var(--surface); color: var(--text); border-color: var(--border); }');
          rules.push('body.ramified-theme #dnd-ghost { box-shadow: 0 6px 18px var(--ws-shadow) !important; }');
          if (preset === 'B') {
            rules.push('body.ramified-theme .workspace-canvas-tab.active { box-shadow: inset 0 -2px 0 var(--accent); }');
            rules.push('body.ramified-theme :is(.card-head-label,.workspace-panel-title .panel-title-text) { color: var(--text); }');
          }
        }
        if (!rules.length) { style?.remove(); style = null; return; }
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.append(style); }
        style.textContent = rules.join('\n');
      }
      function reset() {
        style?.remove(); style = null;
        for (const [name, original] of previous) {
          if (original.value) body.style.setProperty(name, original.value, original.priority);
          else body.style.removeProperty(name);
        }
        previous.clear(); overrides.clear();
        preset = 'current'; colors = { ...initialColors }; headerStyle = 'light'; controlStyle = 'white';
        headerChanged = false; controlsChanged = false; syncControls();
        const removeEmptyStyle = () => {
          if (!hadStyleAttribute && body.getAttribute('style') === '') body.removeAttribute('style');
        };
        removeEmptyStyle();
        // The lab renders once more after reset/destroy; remove only an empty
        // attribute, without touching properties added by another experiment.
        queueMicrotask(removeEmptyStyle);
      }
      presetInput.addEventListener('change', () => {
        if (presetInput.value === 'current') { reset(); return; }
        preset = presetInput.value;
        const selected = presets[preset];
        colors = { ...initialColors, ...Object.fromEntries(Object.keys(colorVariables).filter(name => name in selected).map(name => [name, selected[name]])), danger: '#8B3A2A' };
        for (const name of Object.keys(colorVariables)) for (const variable of colorVariables[name]) setVariable(variable, colors[name]);
        setVariable('--ws-danger-tint', '#FBEFEA'); setVariable('--ws-accent-tint', '#D3E8E3');
        // This variable occupies only the color part of native editors' shadows.
        setVariable('--ws-shadow', 'rgba(24,33,43,0.14)');
        headerStyle = selected.header; controlStyle = 'white'; headerChanged = true; controlsChanged = true;
        syncControls(); updateRules();
      }, { signal: events.signal });
      headerInput.addEventListener('change', () => { headerStyle = headerInput.value; headerChanged = true; updateRules(); }, { signal: events.signal });
      controlInput.addEventListener('change', () => { controlStyle = controlInput.value; controlsChanged = true; updateRules(); }, { signal: events.signal });
      syncControls();
      return {
        reset,
        settings: () => ({ preset, colors: { ...colors }, headerStyle, controlStyle, overriddenVariables: [...overrides.keys()], variables: Object.fromEntries(overrides), shadowDOM: 'color only; native shadow geometry is unchanged' }),
        destroy() { reset(); events.abort(); }
      };
    }
  });
})(window);
