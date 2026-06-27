# q.uiver Arrow Level Endpoint Model

Source inspected: https://github.com/varkor/quiver/blob/master/src/arrow.mjs

## What level means

In q.uiver, `level` is the n in an n-cell: it is the number of parallel body strands. Changing the level does not primarily mean making one line bolder. It changes the total visual width of the arrow body, and endpoint geometry is recomputed from that width on every redraw.

## Redraw constants

q.uiver derives several drawing constants from `style.level`:

```js
stroke_width = level * STROKE_WIDTH + (level - 1) * LINE_SPACING
edge_width = body_style === SQUIGGLY
  ? level * SQUIGGLY_TRIANGLE_HEIGHT * 2 + STROKE_WIDTH + (level - 1) * LINE_SPACING
  : stroke_width
head_width = LINE_SPACING + STROKE_WIDTH + (level - 1) * 2
head_height = edge_width + (LINE_SPACING + STROKE_WIDTH) * 2
```

The important part is conceptual: endpoint size is based on the total n-line body width. It is not only a fixed icon multiplied by a scale factor.

## Head and tail rendering

q.uiver uses the same endpoint routine for heads and tails. A boolean tells the routine whether it is drawing at the start or end of the arrow, so the same geometry can be mirrored.

Normal arrowheads, mono heads, maps-to bars, and corners use the recomputed `head_width` and `head_height`. As the body becomes wider, those endpoints become taller so they span the n-line body.

The normal head is closer to a Computer Modern `\Rightarrow`-style stroked head than a filled triangle. Its two sides are slightly curved rather than straight. This matters because the body is clipped/shortened near the endpoint and the head is drawn as open strokes, so the strands do not visually run underneath a filled triangular marker.

Hooks are special. q.uiver draws one hook per strand:

```js
for (let i = 0; i < this.style.level; ++i) {
  // draw hook at the ith body strand offset
}
```

This is why hooks remain attached to the individual body lines instead of becoming one oversized semicircle.

Harpoons are also special. q.uiver keeps them centered against the whole multi-line edge rather than drawing one harpoon per strand.

## Better model for this calculator

For the theorem graph calculator, the compatible model is:

1. Compute strand offsets from `level`.
2. Compute the total body width from the body line width and the strand offsets.
3. Draw body strands using those offsets.
4. Size normal heads and bars from the total body width.
5. Draw hooks once per strand.
6. Keep harpoons centered on the full multi-line body.
7. Let the existing endpoint-size slider act as a user multiplier on top of the level-derived geometry.
8. Shorten the visible body near non-empty arrow heads/tails so body strands do not run over the endpoint glyphs.
9. Prefer open stroked heads over filled triangle heads for the normal arrow style.

This keeps the UI meaning aligned with q.uiver while fitting the current canvas renderer.
