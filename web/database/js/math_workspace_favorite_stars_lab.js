(function (root) {
  'use strict';
  const presets = [
    { id: 'approved', label: '已选方案（默认）', idle: .05, selected: .75, hover: .2 },
    { id: 'original', label: '原样', idle: .25, selected: .6, hover: .25 },
    { id: 'light', label: '较淡', idle: .15, selected: .4, hover: .25 },
    { id: 'faint', label: '更淡', idle: .08, selected: .25, hover: .25 }
  ];
  const variables = ['--workspace-create-favorite-opacity', '--workspace-create-favorite-selected-opacity', '--workspace-create-favorite-hover-opacity'];
  root.MathWorkspaceDesignLab.register({
    id: 'favorite-stars', title: 'Favorite stars · 收藏星标',
    description: '分别按 0–100% 设置未收藏、已收藏及移入卡片时未收藏星标的不透明度。百分比越小越淡。直接悬停或键盘聚焦星标时恢复清晰。退出后恢复进入前的样式。',
    mount(host) {
      const body = document.body;
      const initial = variables.map(name => ({ value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) }));
      const hadStyleAttribute = body.hasAttribute('style'), cards = new Map(), controls = [];
      const computed = getComputedStyle(body);
      const defaults = variables.map((name, index) => Number(computed.getPropertyValue(name).trim() || [.05, .75, .2][index]));
      let values = [...defaults];
      const el = (tag, text = '', className = '') => Object.assign(document.createElement(tag), { textContent: text, className });
      const options = el('div', '', 'workspace-favorite-star-options');
      const status = el('p', '', 'workspace-card-context'); status.setAttribute('role', 'status');
      const fields = el('div', '', 'workspace-form-fields');
      for (const [index, label] of ['未收藏星标', '已收藏星标', '移入卡片时的未收藏星标'].entries()) {
        const row = el('label', '', 'workspace-field'), heading = el('span', '', 'workspace-favorite-star-slider-label');
        const output = el('output'), slider = el('input');
        slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '1';
        slider.dataset.favoriteStarPercent = ['idle', 'selected', 'hover'][index];
        slider.setAttribute('aria-label', label + '不透明度（百分比）');
        slider.addEventListener('input', () => { values[index] = Number(slider.value) / 100; apply(); });
        heading.append(el('span', label), output); row.append(heading, slider); fields.append(row);
        controls.push({ slider, output });
      }
      host.append(fields);
      function apply() {
        variables.forEach((name, index) => body.style.setProperty(name, values[index])); update();
      }
      for (const preset of presets) {
        const card = el('div', '', 'workspace-favorite-star-option'); card.dataset.favoriteStarOption = preset.id;
        [preset.idle, preset.selected, preset.hover].forEach((value, index) => card.style.setProperty(variables[index], value));
        const choose = el('button', preset.label, 'btn btn-ghost'); choose.type = 'button'; choose.dataset.favoriteStarPreset = preset.id;
        choose.addEventListener('click', () => {
          values = [preset.idle, preset.selected, preset.hover];
          apply();
        });
        const samples = el('div', '', 'workspace-favorite-star-samples');
        for (const [selected, label] of [[false, '未收藏'], [true, '已收藏']]) {
          const sample = el('span'), star = el('button', selected ? '★' : '☆', 'workspace-create-favorite');
          star.type = 'button'; star.dataset.favoriteStarSample = String(selected);
          star.setAttribute('aria-pressed', String(selected)); star.setAttribute('aria-label', label + '星标样例');
          // These are visual samples; real favorites are edited in New….
          sample.append(star, el('span', label)); samples.append(sample);
        }
        card.append(choose, el('small', `未收藏 ${preset.idle * 100}% · 已收藏 ${preset.selected * 100}% · 卡片悬停 ${preset.hover * 100}%`), samples);
        cards.set(preset.id, { card, choose, preset }); options.append(card);
      }
      host.append(options, status);
      function update() {
        controls.forEach(({ slider, output }, index) => {
          slider.value = String(Math.round(values[index] * 100)); output.value = slider.value + '%';
          slider.setAttribute('aria-valuetext', output.value);
        });
        cards.forEach(({ card, choose, preset }) => {
          const selected = values[0] === preset.idle && values[1] === preset.selected && values[2] === preset.hover;
          card.dataset.selected = String(selected); choose.setAttribute('aria-pressed', String(selected));
        });
        status.textContent = `当前预览：未收藏 ${Math.round(values[0] * 100)}% · 已收藏 ${Math.round(values[1] * 100)}% · 卡片悬停 ${Math.round(values[2] * 100)}%。`;
      }
      function reset() {
        variables.forEach((name, index) => {
          if (initial[index].value) body.style.setProperty(name, initial[index].value, initial[index].priority);
          else body.style.removeProperty(name);
        });
        if (!hadStyleAttribute && body.getAttribute('style') === '') body.removeAttribute('style');
        values = [...defaults]; update();
      }
      update();
      return { reset, destroy: reset, settings: () => ({ favoriteStars: { opacityPercent: Math.round(values[0] * 100), selectedOpacityPercent: Math.round(values[1] * 100), hoverOpacityPercent: Math.round(values[2] * 100) } }) };
    }
  });
})(window);
