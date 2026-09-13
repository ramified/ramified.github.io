const assert = require('assert');

class FakeGain {
  constructor() { this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
  connect() { return this; }
}
class FakeOscillator {
  constructor() {
    this.frequency = { setValueAtTime() {}, linearRampToValueAtTime() {} };
    this.onended = null;
  }
  connect() { return this; }
  start() {}
  stop() { if (this.onended) this.onended(); }
}
class FakeBufferSource {
  connect() { return this; }
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = {}; this.sampleRate = 8000; this.state = 'running'; }
  createGain() { return new FakeGain(); }
  createOscillator() { return new FakeOscillator(); }
  createBufferSource() { return new FakeBufferSource(); }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
}

globalThis.AudioContext = FakeAudioContext;
require('./ramified_minigames_sfx.js');
const sfx = globalThis.RamifiedMinigameSfx;

assert.ok(sfx);
assert.deepStrictEqual(sfx.VARIANTS, ['physical', 'clear', 'arcade']);
assert.ok(sfx.EVENTS.length >= 30);
sfx.EVENTS.forEach((event) => assert.deepStrictEqual(event.variants, sfx.VARIANTS));
const defaults = sfx.defaultVariants();
assert.strictEqual(Object.keys(defaults).length, sfx.EVENTS.length);
assert.strictEqual(defaults['billiards-strike'], 'arcade');
assert.strictEqual(defaults['checkers-lake-hop'], 'arcade');
assert.strictEqual(sfx.normalizeVariants({ 'billiards-strike': 'soft' })['billiards-strike'], 'physical');
assert.strictEqual(sfx.normalizeVariants({ 'billiards-strike': 'arcade', invalid: 'clear' })['billiards-strike'], 'arcade');
assert.strictEqual(sfx.normalizeVariants({ 'billiards-strike': 'bad' })['billiards-strike'], 'arcade');
assert.strictEqual(sfx.AUDITION_SEEDS.length, 12);
assert.strictEqual(sfx.auditionSeedsForCategory('stone').length, 3);
assert.deepStrictEqual(sfx.normalizeSeeds({ 'checkers-lake-hop': 'stone-skip-2', invalid: 'win-1' }), { 'checkers-lake-hop': 'stone-skip-2' });
assert.strictEqual(sfx.auditionSeedId('stone', 'skip # 284531!'), 'stone:284531');
assert.deepStrictEqual(sfx.auditionSeedInfo('stone:284531'), { id: 'stone:284531', category: 'stone', seed: '284531', labelKey: '' });
assert.deepStrictEqual(sfx.normalizeSeeds({ 'checkers-lake-hop': 'stone:284531' }), { 'checkers-lake-hop': 'stone:284531' });
assert.deepStrictEqual(sfx.normalizeSeeds({ 'checkers-lake-hop': 'not-a-seed' }), {});
assert.ok(sfx.eventsForMode('billiards').some((event) => event.id === 'billiards-pocket'));
assert.ok(!sfx.eventsForMode('billiards').some((event) => event.id === 'sokoban-push'));
assert.strictEqual(sfx.play('2048-slide', { soundEnabled: false, soundVolume: 1, soundVariants: defaults }), false);
assert.strictEqual(sfx.play('2048-slide', { soundEnabled: true, soundVolume: 1, soundVariants: defaults }), true);
assert.strictEqual(sfx.play('unknown', { soundEnabled: true, soundVolume: 1, soundVariants: defaults }), false);

console.log('ramified_minigames_sfx_test: catalog, variants, and audio gating passed');
