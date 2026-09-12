const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'ramified_minigames_setup.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../ramified_minigames.html'), 'utf8');
// Parse element ancestry, rather than accepting a matching ID anywhere in the page.
const stack = [];
const panels = [];
const voids = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
for (const match of html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi, '').matchAll(/<(\/?)([\w-]+)\b([^>]*)>/g)) {
  const [, closing, tag, attrs] = match;
  if (closing) { const at = stack.map(e => e.tag).lastIndexOf(tag); if (at >= 0) stack.length = at; continue; }
  const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
  if (id === 'fullscreen-settings-controls') panels.push(stack.map(e => e.id));
  if (!voids.has(tag) && !attrs.endsWith('/')) stack.push({tag, id});
}
assert.equal(panels.length, 1);
assert.ok(panels[0].includes('fullscreen-settings-dialog'));
assert.ok(!panels[0].some(id => id && id.includes('import')));

const names = ['wrappedTouchSample', 'cancelWrappedGameplay', 'clearWrappedViewGestures',
  'handleWrappedViewPointerDown', 'handleWrappedViewPointerMove', 'clearWrappedPanGesture',
  'handleWrappedViewPointerUp', 'handleWrappedViewPointerCancel', 'handleCanvasLostPointerCapture',
  'panWrappedViewByClientDelta', 'zoomWrappedViewAtClientPoint'];
const functions = names.map(name => {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}).join('\n');
const context = vm.createContext({console});
vm.runInContext(`
let game = {}, active = true, wrappedTouchGame = null, wrappedTouchTakingOver = false;
const wrappedTouchPointers = new Map(), wrappedTouchConsumed = new Set();
let wrappedPanGesture = null, wrappedPinchGesture = null;
let swipeGesture = null, fideChessDrag = null, billiardsPointer = null;
let cancelled = 0, suppressed = 0;
const geometry = {width:800,height:600};
const camera = {x:0,y:0,scale:1};
const WRAPPED_VIEW_MIN_SCALE = 0.2, WRAPPED_VIEW_MAX_SCALE = 4;
const captured = new Set();
const refs = {canvas: {
  getBoundingClientRect: () => ({left:0,top:0,width:800,height:600}),
  setPointerCapture: id => captured.add(id),
  releasePointerCapture: id => { if (captured.delete(id)) handleCanvasLostPointerCapture({pointerId:id}); }
}};
function wrappedViewIsActive() {return active;}
function wrappedViewCamera() {return camera;}
function render() {}
function syncWrappedViewUi() {}
function clearPlacementReachAssist() {cancelled++;}
function clearPlacementHover() {}
function resetSwipeGesture() {swipeGesture = null;}
function releaseSwipePointer(id) {refs.canvas.releasePointerCapture(id);}
function captureSwipePointer(id) {refs.canvas.setPointerCapture(id);}
function cancelFideChessPieceDrag() {const id=fideChessDrag.pointerId; fideChessDrag=null; releaseSwipePointer(id);}
function handleBilliardsPointerCancel() {billiardsPointer=null; return false;}
function activeFideChessDragEvent() {return false;}
function activeSwipeEvent() {return false;}
function suppressUpcomingCanvasClick() {suppressed++;}
${functions}
function event(id,x,y) {return {pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}};}
`, context);
const run = code => vm.runInContext(code, context);
assert.equal(run('handleWrappedViewPointerDown(event(1,300,300))'), false, 'one finger stays in gameplay');
run('swipeGesture={pointerId:1}; fideChessDrag={pointerId:1}; captured.add(1)');
assert.equal(run('handleWrappedViewPointerDown(event(2,500,300))'), true);
assert.equal(run('swipeGesture === null && fideChessDrag === null'), true, 'takeover cancels without playing');
assert.equal(run('wrappedTouchPointers.size'), 2, 'capture release during takeover must not cancel navigation');
run('handleWrappedViewPointerMove(event(1,200,300)); handleWrappedViewPointerMove(event(2,600,300))');
assert.equal(run('camera.scale'), 2);
assert.ok(Math.abs(run('camera.x')) < 1e-9, 'symmetric pinch stays anchored at midpoint');
run('handleWrappedViewPointerMove(event(1,220,320)); handleWrappedViewPointerMove(event(2,620,320))');
assert.ok(Math.abs(run('camera.x') - 20) < 1e-9);
assert.ok(Math.abs(run('camera.y') - 20) < 1e-9);
run('handleWrappedViewPointerDown(event(3,700,320)); handleWrappedViewPointerUp(event(1,220,320))');
const scale = run('camera.scale');
run('handleWrappedViewPointerMove(event(3,700,320))');
assert.equal(run('camera.scale'), scale, 'replacement finger is rebased');
run('handleWrappedViewPointerUp(event(3,700,320))');
assert.equal(run('handleWrappedViewPointerMove(event(2,650,320))'), true, 'remaining finger cannot play');
assert.equal(run('handleWrappedViewPointerUp(event(2,650,320))'), true);
assert.equal(run('wrappedTouchPointers.size'), 0);
assert.equal(run('handleWrappedViewPointerDown(event(1,100,100))'), false, 'fresh touch can play again');
run('handleWrappedViewPointerUp(event(1,100,100)); active=false');
assert.equal(run('handleWrappedViewPointerDown(event(1,100,100))'), false);
run('active=true; handleWrappedViewPointerDown(event(1,100,100)); handleWrappedViewPointerDown(event(2,200,100)); handleWrappedViewPointerCancel(event(1,100,100))');
assert.equal(run('wrappedTouchPointers.size'), 0);
assert.equal(run('handleWrappedViewPointerUp(event(2,200,100))'), true, 'cancelled sequence cannot commit');
run('zoomWrappedViewAtClientPoint(400,300,100)');
assert.equal(run('camera.scale'), 4);
run('zoomWrappedViewAtClientPoint(400,300,0.001)');
assert.equal(run('camera.scale'), 0.2);
assert.equal(run("handleWrappedViewPointerDown({...event(9,100,100),pointerType:'mouse',button:1})"), true);
run('handleWrappedViewPointerMove(event(9,110,120)); handleWrappedViewPointerUp(event(9,110,120))');
assert.equal(run('wrappedPanGesture'), null);
run("wrappedTouchConsumed.add(5); active=false; handleWrappedViewPointerDown(event(5,100,100))");
assert.equal(run('wrappedTouchConsumed.has(5)'), false, 'fresh pointer IDs are reusable after leaving wrapped view');
console.log('ramified_minigames_touch_test: settings containment and gesture tests passed');
