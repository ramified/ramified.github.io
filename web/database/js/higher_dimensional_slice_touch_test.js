"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

class Surface {
  constructor() { this.listeners = {}; this.captured = new Set(); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  fire(type, overrides = {}) {
    const event = { pointerId: 1, pointerType: "touch", button: 0, clientX: 100,
      clientY: 100, detail: 1, preventDefault() { this.prevented = true; },
      stopImmediatePropagation() { this.stopped = true; }, ...overrides };
    for (const callback of this.listeners[type] || []) {
      callback(event);
      if (event.stopped) break;
    }
    return event;
  }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); this.fire("lostpointercapture", { pointerId: id }); }
  getBoundingClientRect() { return { width: 800 }; }
}
const window = new Surface();
const document = new Surface();
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "higher_dimensional_slice_touch.js"), "utf8"), { window, document });
const canvas = new Surface();
let taps = 0;
let clicks = 0;
const drags = [];
const pinches = [];
window.SliceTouch.bind(canvas, {
  onDrag: (dx, width) => drags.push([dx, width]),
  onPinch: (factor) => pinches.push(factor), onTap: () => taps++,
});
canvas.addEventListener("click", () => clicks++);

canvas.fire("pointerdown");
canvas.fire("pointermove", { clientX: 103 });
canvas.fire("pointerup", { clientX: 103 });
canvas.fire("click");
assert.equal(taps, 1, "a slightly shaky tap selects once");
assert.equal(clicks, 0, "compatibility click must not select twice");
assert.equal(drags.length, 0);

canvas.fire("pointerdown");
canvas.fire("pointermove", { clientX: 120 });
canvas.fire("pointermove", { clientX: 130 });
canvas.fire("pointerup", { clientX: 130 });
assert.deepEqual(drags, [[20, 800], [10, 800]]);
assert.equal(taps, 1, "drag must not select");

canvas.fire("pointerdown");
canvas.fire("pointerdown", { pointerId: 2, clientX: 200 });
canvas.fire("pointermove", { pointerId: 2, clientX: 250 });
canvas.fire("pointerup", { pointerId: 2, clientX: 250 });
canvas.fire("pointermove", { clientX: 140 });
canvas.fire("pointerup", { clientX: 140 });
assert.deepEqual(pinches, [1.5]);
assert.equal(drags.length, 2, "lifting one finger after pinch must not move the slice");
assert.equal(taps, 1, "pinch must not select");

for (const interruption of ["pointercancel", "lostpointercapture", "blur", "visibilitychange"]) {
  canvas.fire("pointerdown");
  if (interruption === "blur") window.fire(interruption);
  else if (interruption === "visibilitychange") { document.hidden = true; document.fire(interruption); }
  else canvas.fire(interruption);
  canvas.fire("pointermove", { clientX: 200 });
  canvas.fire("pointerup", { clientX: 200 });
  assert.equal(canvas.captured.size, 0);
}
assert.equal(drags.length, 2, "interrupted gestures must stop");
assert.equal(taps, 1);
canvas.fire("pointerdown", { pointerType: "mouse" });
canvas.fire("pointermove", { pointerType: "mouse", clientX: 200 });
canvas.fire("pointerup", { pointerType: "mouse", clientX: 200 });
canvas.fire("click");
assert.equal(clicks, 1, "mouse clicks continue working");
assert.equal(drags.length, 2, "mouse movement is left to the existing controls");
console.log("higher_dimensional_slice_touch_test: all tests passed");
