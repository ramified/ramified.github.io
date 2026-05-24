(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    rawD: 2,
    primeBound: 47,
    showInfinite: true,
    selectedKey: 'p:2',
    hitboxes: [],
    places: []
  };

  const PLACE_STYLE = {
    ramified: { fill: '#8b3a2a', stroke: '#6b2a1f', label: 'ramified' },
    split: { fill: '#3d6b4f', stroke: '#294936', label: 'split' },
    inert: { fill: '#4d6478', stroke: '#314253', label: 'inert' },
    complex: { fill: '#8b3a2a', stroke: '#6b2a1f', label: 'complex' }
  };

  function normalizedField() {
    const raw = Math.trunc(Number(state.rawD) || 0);
    if (raw === 0 || raw === 1) {
      return { error: 'd must be an integer different from 0 and 1.' };
    }
    const d = squarefreePart(raw);
    if (d === 1) return { error: 'd must define a nontrivial quadratic extension.' };
    const mod4 = positiveMod(d, 4);
    const discriminant = mod4 === 1 ? d : 4 * d;
    const realPlaces = d > 0 ? 2 : 0;
    const complexPlaces = d > 0 ? 0 : 1;
    return {
      raw,
      d,
      discriminant,
      realPlaces,
      complexPlaces,
      signature: `(${realPlaces}, ${complexPlaces})`,
      ring: mod4 === 1 ? `Z[(1+sqrt(${d}))/2]` : `Z[sqrt(${d})]`,
      polynomial: `x^2 - (${d})`
    };
  }

  function squarefreePart(value) {
    const sign = value < 0 ? -1 : 1;
    let n = Math.abs(value);
    let result = 1;
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      let count = 0;
      while (n % p === 0) {
        n = Math.floor(n / p);
        count++;
      }
      if (count % 2) result *= p;
    }
    if (n > 1) result *= n;
    return sign * result;
  }

  function positiveMod(a, m) {
    return ((a % m) + m) % m;
  }

  function primesUpTo(n) {
    const limit = Math.max(2, Math.floor(n));
    const sieve = Array(limit + 1).fill(true);
    sieve[0] = false;
    sieve[1] = false;
    for (let p = 2; p * p <= limit; p++) {
      if (!sieve[p]) continue;
      for (let k = p * p; k <= limit; k += p) sieve[k] = false;
    }
    const out = [];
    for (let p = 2; p <= limit; p++) if (sieve[p]) out.push(p);
    return out;
  }

  function factorInteger(value) {
    let n = Math.abs(Math.trunc(value));
    if (n <= 1) return [];
    const factors = [];
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      if (n % p) continue;
      let exponent = 0;
      while (n % p === 0) {
        n = Math.floor(n / p);
        exponent++;
      }
      factors.push([p, exponent]);
    }
    if (n > 1) factors.push([n, 1]);
    return factors;
  }

  function factorText(value) {
    const sign = value < 0 ? '-' : '';
    const factors = factorInteger(value);
    if (!factors.length) return String(value);
    return sign + factors.map(([p, e]) => e === 1 ? String(p) : `${p}^${e}`).join(' * ');
  }

  function modPow(base, exponent, modulus) {
    let b = positiveMod(base, modulus);
    let e = exponent;
    let out = 1;
    while (e > 0) {
      if (e & 1) out = (out * b) % modulus;
      b = (b * b) % modulus;
      e >>= 1;
    }
    return out;
  }

  function legendreSymbol(a, p) {
    if (p === 2) return 0;
    const residue = positiveMod(a, p);
    if (residue === 0) return 0;
    const value = modPow(residue, (p - 1) / 2, p);
    return value === 1 ? 1 : -1;
  }

  function finitePlace(field, p) {
    const D = field.discriminant;
    if (D % p === 0) {
      return {
        key: `p:${p}`,
        label: String(p),
        base: `p=${p}`,
        kind: 'ramified',
        e: 2,
        f: 1,
        g: 1,
        ideals: [`P^2 over ${p}`],
        detail: `${p} divides the field discriminant ${D}.`
      };
    }
    if (p === 2) {
      const mod8 = positiveMod(D, 8);
      if (mod8 === 1) {
        return {
          key: 'p:2',
          label: '2',
          base: 'p=2',
          kind: 'split',
          e: 1,
          f: 1,
          g: 2,
          ideals: ['P_1', 'P_2'],
          detail: 'D is congruent to 1 modulo 8.'
        };
      }
      return {
        key: 'p:2',
        label: '2',
        base: 'p=2',
        kind: 'inert',
        e: 1,
        f: 2,
        g: 1,
        ideals: ['P'],
        detail: 'D is congruent to 5 modulo 8.'
      };
    }
    const chi = legendreSymbol(D, p);
    if (chi === 1) {
      return {
        key: `p:${p}`,
        label: String(p),
        base: `p=${p}`,
        kind: 'split',
        e: 1,
        f: 1,
        g: 2,
        ideals: ['P_1', 'P_2'],
        detail: `The Kronecker symbol (D/${p}) is 1.`
      };
    }
    return {
      key: `p:${p}`,
      label: String(p),
      base: `p=${p}`,
      kind: 'inert',
      e: 1,
      f: 2,
      g: 1,
      ideals: ['P'],
      detail: `The Kronecker symbol (D/${p}) is -1.`
    };
  }

  function infinitePlace(field) {
    if (field.d > 0) {
      return {
        key: 'inf',
        label: 'inf',
        base: 'real infinity',
        kind: 'split',
        e: 1,
        f: 1,
        g: 2,
        ideals: ['real place 1', 'real place 2'],
        detail: 'The field has two real embeddings.'
      };
    }
    return {
      key: 'inf',
      label: 'inf',
      base: 'real infinity',
      kind: 'complex',
      e: 2,
      f: 1,
      g: 1,
      ideals: ['complex place'],
      detail: 'The real place becomes complex.'
    };
  }

  function buildPlaces(field) {
    const places = [];
    if (state.showInfinite) places.push(infinitePlace(field));
    primesUpTo(state.primeBound).forEach((p) => places.push(finitePlace(field, p)));
    return places;
  }

  function htmlRows(rows) {
    return rows.map(([label, value]) =>
      `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${escapeHtml(value)}</span></div>`
    ).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function fieldLabel(field) {
    return `Q(sqrt(${field.d}))`;
  }

  function render() {
    const field = normalizedField();
    if (field.error) {
      renderError(field.error);
      return;
    }
    state.places = buildPlaces(field);
    if (!state.places.some((place) => place.key === state.selectedKey)) {
      state.selectedKey = state.places[0]?.key || 'p:2';
    }
    syncControls(field);
    renderInvariants(field);
    renderPlacesTable();
    renderSelectedPlace();
    drawCanvas(field);
    renderExport(field);
  }

  function renderError(message) {
    $('ramification-status').textContent = 'invalid field';
    $('ramification-input-note').textContent = message;
    $('field-invariants').innerHTML = `<p class="err">${escapeHtml(message)}</p>`;
    $('places-table').innerHTML = '';
    $('selected-place-data').innerHTML = '';
    const canvas = $('ramification-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function syncControls(field) {
    $('quadratic-d').value = String(state.rawD);
    $('prime-bound').value = String(state.primeBound);
    $('prime-bound-output').textContent = String(state.primeBound);
    $('show-infinite').checked = state.showInfinite;
    $('ramification-status').textContent = fieldLabel(field);
    $('ramification-input-note').textContent = field.raw === field.d
      ? 'quadratic field over Q'
      : `same field as d=${field.d}`;
    const finiteCount = state.places.filter((place) => place.key.startsWith('p:')).length;
    $('ramification-count-label').textContent = `finite primes shown: ${finiteCount}`;
  }

  function renderInvariants(field) {
    $('field-invariants').innerHTML = htmlRows([
      ['Field', fieldLabel(field)],
      ['Polynomial', field.polynomial],
      ['Disc(K)', `${field.discriminant} = ${factorText(field.discriminant)}`],
      ['Signature', field.signature],
      ['O_K', field.ring],
      ['Ramified finite primes', factorInteger(field.discriminant).map(([p]) => p).join(', ') || 'none'],
      ['Degree', '2']
    ]);
  }

  function renderPlacesTable() {
    const rows = state.places.map((place) => {
      const selected = place.key === state.selectedKey ? ' style="font-weight:700;color:var(--text);"' : '';
      return `<tr${selected}><td>${escapeHtml(place.label)}</td><td>${PLACE_STYLE[place.kind].label}</td><td>${place.e}</td><td>${place.f}</td><td>${place.g}</td></tr>`;
    }).join('');
    $('places-table').innerHTML = `
      <table class="ramification-table">
        <thead><tr><th>place</th><th>type</th><th>e</th><th>f</th><th>g</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderSelectedPlace() {
    const place = state.places.find((item) => item.key === state.selectedKey) || state.places[0];
    if (!place) {
      $('selected-place-data').innerHTML = '<p class="hint">No place selected.</p>';
      return;
    }
    $('ramification-selected-label').textContent = `selected place: ${place.label}`;
    $('selected-place-data').innerHTML = htmlRows([
      ['base place', place.base],
      ['behavior', PLACE_STYLE[place.kind].label],
      ['e', place.e],
      ['f', place.f],
      ['g', place.g],
      ['places above', place.ideals.join(', ')],
      ['criterion', place.detail]
    ]);
  }

  function drawCanvas(field) {
    const canvas = $('ramification-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = 920;
    const columns = 5;
    const cellW = W / columns;
    const cellH = 124;
    const rows = Math.max(1, Math.ceil(state.places.length / columns));
    const H = 38 + rows * cellH + 24;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7a6f65';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${fieldLabel(field)} over Q, primes p <= ${state.primeBound}`, 22, 18);
    state.hitboxes = [];
    state.places.forEach((place, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * cellW + cellW / 2;
      const y = 58 + row * cellH;
      drawPlaceGlyph(ctx, place, x, y, cellW - 22, cellH - 14, place.key === state.selectedKey);
      state.hitboxes.push({ key: place.key, x: x - cellW / 2 + 8, y: y - 8, w: cellW - 16, h: cellH - 18 });
    });
  }

  function drawPlaceGlyph(ctx, place, cx, top, width, height, selected) {
    const style = PLACE_STYLE[place.kind];
    const left = cx - width / 2;
    const right = cx + width / 2;
    const bottomY = top + height - 24;
    const topY = top + 34;

    ctx.save();
    ctx.fillStyle = selected ? 'rgba(61,107,79,0.08)' : 'rgba(255,255,255,0.48)';
    ctx.strokeStyle = selected ? '#3d6b4f' : '#d8d0c4';
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, left, top, width, height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = place.kind === 'ramified' || place.kind === 'complex' ? 3 : 1.6;
    ctx.lineCap = 'round';

    const base = { x: cx, y: bottomY };
    const tops = place.g === 2
      ? [{ x: cx - width * 0.2, y: topY }, { x: cx + width * 0.2, y: topY }]
      : [{ x: cx, y: topY }];
    tops.forEach((point) => {
      ctx.beginPath();
      ctx.moveTo(base.x, base.y - 9);
      ctx.lineTo(point.x, point.y + 9);
      ctx.stroke();
    });

    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#1a1612';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(base.x, base.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    tops.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    if (place.kind === 'ramified' || place.kind === 'complex') {
      ctx.beginPath();
      ctx.arc(tops[0].x, tops[0].y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.fillStyle = '#1a1612';
    ctx.font = '700 13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(place.label, base.x, base.y + 0.5);

    ctx.fillStyle = style.stroke;
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(PLACE_STYLE[place.kind].label, cx, top + height - 16);
    ctx.fillStyle = '#7a6f65';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`e=${place.e}, f=${place.f}, g=${place.g}`, cx, top + 8);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function renderExport(field) {
    const payload = {
      calculator: 'Place ramification calculator',
      extension: `${fieldLabel(field)} / Q`,
      squarefreeD: field.d,
      discriminant: field.discriminant,
      signature: field.signature,
      primeBound: state.primeBound,
      showInfinite: state.showInfinite,
      places: state.places.map((place) => ({
        place: place.label,
        behavior: PLACE_STYLE[place.kind].label,
        e: place.e,
        f: place.f,
        g: place.g,
        detail: place.detail
      }))
    };
    $('ramification-export-out').value = JSON.stringify(payload, null, 2);
  }

  function bindInputs() {
    $('quadratic-d').addEventListener('change', (event) => {
      state.rawD = Math.trunc(Number(event.target.value) || 0);
      render();
    });
    $('prime-bound').addEventListener('input', (event) => {
      state.primeBound = Math.floor(Number(event.target.value) || 2);
      render();
    });
    $('show-infinite').addEventListener('change', (event) => {
      state.showInfinite = event.target.checked;
      render();
    });
    document.querySelectorAll('[data-d]').forEach((button) => {
      button.addEventListener('click', () => {
        state.rawD = Number(button.dataset.d);
        state.selectedKey = state.rawD < 0 ? 'inf' : 'p:2';
        render();
      });
    });
    $('ramification-refresh-export').addEventListener('click', () => {
      const field = normalizedField();
      if (!field.error) renderExport(field);
    });
    $('ramification-select-export').addEventListener('click', () => {
      const out = $('ramification-export-out');
      out.focus();
      out.select();
    });
    $('ramification-canvas').addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', () => {
      const field = normalizedField();
      if (!field.error) drawCanvas(field);
    });
  }

  function handleCanvasClick(event) {
    const canvas = $('ramification-canvas');
    const rect = canvas.getBoundingClientRect();
    const logicalW = 920;
    const logicalH = canvas.height / (window.devicePixelRatio || 1);
    const x = (event.clientX - rect.left) * logicalW / rect.width;
    const y = (event.clientY - rect.top) * logicalH / rect.height;
    const hit = state.hitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (hit) {
      state.selectedKey = hit.key;
      render();
    }
  }

  function bindCards() {
    let suppressCardToggleUntil = 0;
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < suppressCardToggleUntil) return;
        if (event.target.closest('button,input,select,textarea,a,.drag-handle')) return;
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    const side = document.querySelector('.side');
    if (!side) return;
    let dragCard = null;
    let placeholder = null;
    let pointerId = null;
    let startY = 0;
    let ghost = null;
    let ghostOffsetY = 0;
    let dragging = false;
    const pointerOptions = { passive: false };

    side.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.card');
      if (!card || card.parentElement !== side) return;
      event.preventDefault();
      event.stopPropagation();
      dragCard = card;
      pointerId = event.pointerId;
      startY = event.clientY;
      dragging = false;
      const rect = card.getBoundingClientRect();
      ghostOffsetY = startY - rect.top;
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(pointerId); } catch (_) {}
      }
      document.addEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.addEventListener('pointerup', finishCardDrag, pointerOptions);
      document.addEventListener('pointercancel', finishCardDrag, pointerOptions);
    }, pointerOptions);

    function handleCardDragMove(event) {
      if (!dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      if (!dragging && Math.abs(event.clientY - startY) < 6) return;
      if (!dragging) {
        const rect = dragCard.getBoundingClientRect();
        dragging = true;
        suppressCardToggleUntil = Date.now() + 500;
        document.body.classList.add('card-dragging');
        dragCard.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.style.cssText = `height:${rect.height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;`;
        dragCard.parentElement.insertBefore(placeholder, dragCard);
        ghost = dragCard.cloneNode(true);
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          top: `${event.clientY - ghostOffsetY}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: '0.88',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: '4px'
        });
        document.body.appendChild(ghost);
        dragCard.style.display = 'none';
      }
      if (ghost) ghost.style.top = `${event.clientY - ghostOffsetY}px`;
      const after = getCardAfterPointer(side, event.clientY, dragCard, placeholder);
      if (after) side.insertBefore(placeholder, after);
      else side.appendChild(placeholder);
    }

    function finishCardDrag(event) {
      if (!dragCard || (event && event.pointerId !== pointerId)) return;
      if (event) event.preventDefault();
      document.removeEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.removeEventListener('pointerup', finishCardDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishCardDrag, pointerOptions);
      document.body.classList.remove('card-dragging');
      if (dragging && placeholder) {
        dragCard.style.display = '';
        side.insertBefore(dragCard, placeholder);
        placeholder.remove();
        if (ghost) ghost.remove();
        suppressCardToggleUntil = Date.now() + 500;
      }
      if (dragCard) dragCard.classList.remove('dragging');
      dragCard = null;
      placeholder = null;
      ghost = null;
      pointerId = null;
      dragging = false;
    }
  }

  function getCardAfterPointer(side, y, dragCard, placeholder) {
    const cards = [...side.querySelectorAll('.card')]
      .filter((card) => card !== dragCard && card !== placeholder);
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: card };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindInputs();
    bindCards();
    render();
  });
})();
