const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'index.css'), 'utf8');
const scriptStart = html.lastIndexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');
const script = html.slice(scriptStart, scriptEnd);

assert(scriptStart >= '<script>'.length && scriptEnd > scriptStart, 'index inline script should exist');
assert.doesNotThrow(() => new Function(script), 'index inline script should parse');

assert.match(script, /const INDEX_MOTION_DURATION = 640;/);
assert.match(script, /const INDEX_FADE_DURATION = 360;/);
assert.match(script, /prefersReducedMotion\(\)[\s\S]*Math\.abs\(startHeight - targetHeight\)/);
assert.match(script, /cancelCardAnimation\(card, true\)/);
assert.match(script, /Promise\.allSettled\(animations\.map/);
assert.match(script, /animateCardExpanded\(item, item === card && shouldExpand\)/);
assert.match(script, /cancelAllCardAnimations\(\);[\s\S]*arrangeAllMasonryGrids\(\);/);
assert.match(script, /if \(card\.classList\.contains\('is-collapsed'\)\) \{\s*unloadPreview\(card\);/);

assert.match(css, /grid-template-rows 640ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
assert.match(css, /opacity 360ms ease-out/);
assert.match(css, /\.is-collapsed:not\(\.is-card-collapsing\)/);
assert.match(css, /\.is-card-resizing \{\s*overflow: hidden;/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none;/);

console.log('index_card_animation_test: passed');
