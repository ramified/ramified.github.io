/* Touch gestures are kept separate from the slice mathematics. */
(function () {
  "use strict";

  window.SliceTouch = {
    bind(canvas, { onDrag, onPinch, onTap }) {
      const pointers = new Map();
      let start = null;
      let dragged = false;
      let multiTouch = false;
      let suppressClick = false;
      const distance = () => {
        const [a, b] = [...pointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
      };
      const clear = () => {
        const ids = [...pointers.keys()];
        pointers.clear();
        start = null;
        ids.forEach((id) => {
          if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        });
      };
      canvas.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") {
          suppressClick = false;
          return;
        }
        if (event.button !== 0) return;
        event.preventDefault();
        suppressClick = true;
        if (!pointers.size) {
          start = { x: event.clientX, y: event.clientY };
          dragged = false;
          multiTouch = false;
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size > 1) multiTouch = true;
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener("pointermove", (event) => {
        const previous = pointers.get(event.pointerId);
        if (!previous) return;
        event.preventDefault();
        const before = pointers.size === 2 ? distance() : 0;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
          const after = distance();
          if (before > 0 && after > 0) onPinch(after / before);
        } else if (!multiTouch) {
          if (!dragged && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
          const dx = event.clientX - (dragged ? previous.x : start.x);
          dragged = true;
          onDrag(dx, canvas.getBoundingClientRect().width);
        }
      });
      canvas.addEventListener("pointerup", (event) => {
        if (!pointers.has(event.pointerId)) return;
        event.preventDefault();
        const tap = !dragged && !multiTouch && start
          && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8;
        pointers.delete(event.pointerId);
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (tap) onTap(event);
      });
      const cancel = (event) => {
        if (pointers.has(event.pointerId)) clear();
      };
      canvas.addEventListener("pointercancel", cancel);
      canvas.addEventListener("lostpointercapture", cancel);
      // Selection already happened on pointerup; ignore the compatibility click.
      canvas.addEventListener("click", (event) => {
        if (suppressClick && event.detail !== 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
      window.addEventListener("blur", clear);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clear();
      });
    }
  };
})();
