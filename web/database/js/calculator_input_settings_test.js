const assert = require('assert');
const settings = require('./calculator_input_settings.js');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    value(key) { return values.get(key); }
  };
}

assert.strictEqual(settings.normalizeBindingString('cmd+RETURN'), 'Mod+Enter');
assert.strictEqual(settings.normalizeBindingString('Control + ArrowLeft'), 'Mod+ArrowLeft');
assert.strictEqual(settings.normalizeBindingString('plus'), '+');
assert.strictEqual(settings.bindingFromEvent({ key: 'A', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }), 'Mod+Shift+a');
assert.strictEqual(settings.bindingFromEvent({ key: '+', ctrlKey: false, metaKey: false, altKey: false, shiftKey: true }), '+');
assert.strictEqual(settings.displayBinding('Mod+ArrowLeft', 'Win32'), 'Ctrl+←');
assert.strictEqual(settings.displayBinding('Mod+ArrowLeft', 'MacIntel'), '⌘←');

assert.deepStrictEqual(settings.normalizeBindings(['a', 'A', 'b', 'c', 'd', 'e']), ['a', 'b', 'c', 'd']);
['Tab', 'Escape', 'F1', 'F12', 'Alt+ArrowLeft', 'Alt+ArrowRight', 'Mod+l', 'Mod+w', 'Mod+s'].forEach((binding) => {
  assert.strictEqual(settings.isReservedBinding(binding), true, `${binding} must remain reserved`);
});
assert.strictEqual(settings.isReservedBinding('Mod+Shift+t'), true, 'extra modifiers must not bypass reserved browser shortcuts');
assert.strictEqual(settings.isReservedBinding('Alt+Shift+ArrowLeft'), true, 'extra modifiers must not bypass reserved navigation shortcuts');
assert.strictEqual(settings.isReservedBinding('Mod+Enter'), false);

const storageKey = `${settings.STORAGE_PREFIX}unit-test`;
let storage = memoryStorage({ [storageKey]: '{not-json' });
assert.deepStrictEqual(settings.readStorage(storage, storageKey), { version: 1, profiles: {}, cardVisibility: {} });
storage = memoryStorage({ [storageKey]: JSON.stringify({ version: 0, profiles: { old: { run: ['x'] } } }) });
assert.deepStrictEqual(settings.readStorage(storage, storageKey), { version: 1, profiles: {}, cardVisibility: {} });
storage = memoryStorage();
assert.strictEqual(settings.writeStorage(storage, storageKey, { version: 1, profiles: { one: { run: ['A', 'a', 'b'] } } }), true);
assert.deepStrictEqual(JSON.parse(storage.value(storageKey)), { version: 1, profiles: { one: { run: ['a', 'b'] } }, cardVisibility: {} });

let profile = 'square';
const session = {
  data: { version: 1, profiles: {}, cardVisibility: {} },
  storage,
  storageKey,
  options: {},
  profile: () => profile
};
const move = { id: 'move', defaultBindings: ['w', 'ArrowUp'] };
assert.deepStrictEqual(settings.__test.actionBindings(session, move), ['w', 'ArrowUp']);
settings.__test.setActionBindings(session, move, ['i', 'ArrowUp']);
assert.deepStrictEqual(settings.__test.actionBindings(session, move), ['i', 'ArrowUp']);
profile = 'hex';
assert.deepStrictEqual(settings.__test.actionBindings(session, move), ['w', 'ArrowUp'], 'dynamic profiles must be isolated');
settings.__test.setActionBindings(session, move, []);
assert.deepStrictEqual(settings.__test.actionBindings(session, move), [], 'an explicitly empty binding must override defaults');
profile = 'square';
assert.deepStrictEqual(settings.__test.actionBindings(session, move), ['i', 'ArrowUp']);

const globalAction = { id: 'undo', storageProfile: 'global', defaultBindings: ['z'] };
settings.__test.setActionBindings(session, globalAction, ['u']);
profile = 'hex';
assert.deepStrictEqual(settings.__test.actionBindings(session, globalAction), ['u'], 'global actions must span dynamic profiles');

const first = { id: 'first', defaultBindings: ['q'] };
const second = { id: 'second', defaultBindings: ['e'] };
assert.strictEqual(settings.__test.applyConflictReplacement(session, second, first, 0, 'q'), true);
assert.deepStrictEqual(settings.__test.actionBindings(session, first), [], 'conflict replacement removes the old assignment');
assert.deepStrictEqual(settings.__test.actionBindings(session, second), ['q'], 'conflict replacement assigns the requested action');
settings.__test.restoreDefaults(session);
assert.deepStrictEqual(session.data, { version: 1, profiles: {}, cardVisibility: {} });
assert.deepStrictEqual(settings.__test.actionBindings(session, globalAction), ['z'], 'restoring defaults discards saved overrides');

const editable = { closest(selector) { return selector.includes('input') ? this : null; } };
const plain = { closest() { return null; } };
assert.strictEqual(settings.isInteractiveTarget(editable), true);
assert.strictEqual(settings.isInteractiveTarget(plain), false);
assert.strictEqual(settings.__test.canTriggerFromTarget({ allowInEditable: true }, 'Mod+Enter', editable), true);
assert.strictEqual(settings.__test.canTriggerFromTarget({ allowInEditable: true }, 'k', editable), false, 'remapping a contextual action must not make text keys fire inside fields');
assert.strictEqual(settings.__test.canTriggerFromTarget({ allowInEditable: false }, 'Mod+Enter', editable), false);
assert.strictEqual(settings.__test.canTriggerFromTarget({}, 'k', plain), true);

const unavailableStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
assert.deepStrictEqual(settings.readStorage(unavailableStorage, storageKey), { version: 1, profiles: {}, cardVisibility: {} });
assert.strictEqual(settings.writeStorage(unavailableStorage, storageKey, { version: 1, profiles: {} }), false);

const ordinaryCard = { id: 'ordinary', advanced: false };
const advancedCard = { id: 'advanced', advanced: true };
assert.strictEqual(settings.__test.cardIsVisible(session, ordinaryCard), true);
assert.strictEqual(settings.__test.cardIsVisible(session, advancedCard), false);
session.data.cardVisibility.advanced = true;
session.data.cardVisibility.ordinary = false;
assert.strictEqual(settings.__test.cardIsVisible(session, advancedCard), true);
assert.strictEqual(settings.__test.cardIsVisible(session, ordinaryCard), false);

const calls = [];
const heldSession = { activeUps: new Map() };
const heldAction = {
  onDown(_event, binding) { calls.push(`down:${binding}`); },
  onUp(_event, binding) { calls.push(`up:${binding}`); }
};
const downEvent = { key: 'w', code: 'KeyW', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
assert.strictEqual(settings.__test.executeActionDown(heldSession, heldAction, downEvent, 'w'), true);
assert.strictEqual(heldSession.activeUps.has('KeyW'), true);
assert.strictEqual(settings.__test.executeActionUp(heldSession, downEvent), true);
assert.deepStrictEqual(calls, ['down:w', 'up:w']);
assert.strictEqual(settings.__test.executeActionUp(heldSession, downEvent), false, 'keyup must run once per active key');

console.log('calculator_input_settings_test: normalization, storage, profiles, multi-bindings, and input protection passed');
