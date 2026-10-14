'use strict';

const assert = require('node:assert/strict');
const settings = require('./calculator_input_settings.js');

class Input {
  constructor(value, type = 'text') {
    this.tagName = 'INPUT'; this.type = type; this.value = value;
    this.listeners = new Map(); this.isConnected = true;
    this.selectionStart = type === 'number' ? null : value.length;
    this.selectionEnd = this.selectionStart; this.selectionDirection = 'none';
    this.ownerDocument = { activeElement: this, defaultView: { Event } };
  }
  getRootNode() { return this.ownerDocument; }
  get validity() { return { valid: this.type !== 'number' || (this.value !== '' && Number.isFinite(Number(this.value))), badInput: false }; }
  addEventListener(type, listener) { const handlers = this.listeners.get(type) || []; handlers.push(listener); this.listeners.set(type, handlers); }
  dispatchEvent(event) {
    const dispatched = { type: event.type, target: this, isComposing: !!event.isComposing };
    for (const handler of this.listeners.get(event.type) || []) handler.call(this, dispatched);
  }
  setSelectionRange(start, end, direction) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
  focus() { this.ownerDocument.activeElement = this; this.dispatchEvent(new Event('focus')); }
  blur() { this.ownerDocument.activeElement = null; this.dispatchEvent(new Event('blur')); }
}

async function run() {
  const size = new Input('6', 'number'); let modelSize = 6, previews = 0;
  settings.listenEditable(size, 'input', () => { previews++; modelSize = Math.max(1, Number(size.value)); size.value = String(modelSize); });
  size.value = ''; size.dispatchEvent(new Event('input'));
  assert.equal(size.value, ''); assert.equal(modelSize, 6); assert.equal(previews, 0);
  assert.equal(settings.syncEditableValue(size, 6), false, 'a delayed model render must preserve the empty draft');
  size.value = '7'; size.dispatchEvent(new Event('input'));
  assert.equal(size.value, '7'); assert.equal(modelSize, 7);
  size.value = ''; size.dispatchEvent(new Event('input')); size.dispatchEvent(new Event('change'));
  await Promise.resolve(); assert.equal(size.value, '7', 'empty commit restores the last valid number');

  const title = new Input(''); let modelTitle = '';
  settings.listenEditable(title, 'input', () => { modelTitle = title.value.trim(); title.value = modelTitle; title.selectionStart = 0; });
  for (const value of ['d', 'daily', 'daily ', 'daily task']) {
    title.value = value; title.selectionStart = value.length; title.selectionEnd = value.length;
    title.dispatchEvent(new Event('input'));
    assert.equal(title.value, value); assert.equal(title.selectionStart, value.length);
  }
  title.value = 'daily task '; title.dispatchEvent(new Event('input')); title.dispatchEvent(new Event('change'));
  await Promise.resolve(); assert.equal(title.value, 'daily task', 'trimming occurs on commit');

  title.dispatchEvent(new Event('compositionstart'));
  title.value = '每日任务'; title.dispatchEvent({ type: 'input', isComposing: true });
  assert.equal(modelTitle, 'daily task', 'IME composition must not publish an incomplete label');
  settings.syncEditableValue(title, modelTitle); assert.equal(title.value, '每日任务');
  title.dispatchEvent(new Event('compositionend')); await Promise.resolve();
  assert.equal(modelTitle, '每日任务');

  title.value = 'draft '; title.dispatchEvent(new Event('input'));
  assert.equal(settings.syncEditableValue(title, 'other title'), false);
  settings.syncEditableValue(title, 'reset', { force: true }); assert.equal(title.value, 'reset');

  const committed = new Input('6', 'number'); let commits = 0;
  settings.listenEditable(committed, 'input', () => {}, { commitHandled: true });
  committed.addEventListener('change', () => { commits++; });
  committed.value = ''; committed.dispatchEvent(new Event('input')); committed.dispatchEvent(new Event('change'));
  await Promise.resolve(); committed.blur(); await Promise.resolve();
  assert.equal(commits, 1, 'existing commit handlers must not run twice');

  const initiallyDisabled = new Input('6', 'number'); initiallyDisabled.disabled = true;
  settings.listenEditable(initiallyDisabled, 'input', () => {});
  initiallyDisabled.disabled = false; initiallyDisabled.value = '7'; initiallyDisabled.focus();
  initiallyDisabled.value = ''; initiallyDisabled.dispatchEvent(new Event('input'));
  initiallyDisabled.dispatchEvent(new Event('change')); await Promise.resolve();
  assert.equal(initiallyDisabled.value, '7', 'a control enabled later must still remember its value at focus');

  const resetOnInput = new Input('old');
  settings.listenEditable(resetOnInput, 'input', () => settings.syncEditableValue(resetOnInput, 'reset', { force: true }));
  resetOnInput.value = 'new '; resetOnInput.dispatchEvent(new Event('input'));
  assert.equal(resetOnInput.value, 'reset', 'an explicit forced reset must not be undone by draft restoration');
  console.log('calculator_input_drafts_test: empty numeric drafts, delayed renders, spaces, caret, commit, IME, and explicit reset passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
