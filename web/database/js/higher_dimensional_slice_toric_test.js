"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "higher_dimensional_slice_calculator.html"), "utf8");
const explorer = fs.readFileSync(path.join(__dirname, "higher_dimensional_slice_explorer.js"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "toric_cone_worker.js"), "utf8");

[
  "slice-toric-cone-card",
  "toric-cone-build-panel",
  "toric-cone-faces-panel",
  "toric-cone-variety-panel",
  "toric-cone-input-mode-controls",
  "toric-cone-manual-panel",
  "toric-cone-import-panel",
  "toric-cone-targets-panel",
  "toric-cone-generators",
  "toric-cone-apply-manual",
  "toric-cone-import-orientation",
  "toric-cone-target-slots",
  "toric-cone-vector-source",
  "toric-cone-rows-import",
  "toric-cone-pick-menu",
  "slice-toric-fan-card",
  "toric-fan-tabs",
  "toric-fan-source-mode",
  "toric-fan-preset",
  "toric-fan-cone-options",
  "toric-fan-apply-cones",
  "toric-fan-character-lattice",
  "slice-weight-info-out",
].forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`));

["zero", "positive-orthant", "singular-simplicial", "square-cone"].forEach((preset) => {
  assert.match(html, new RegExp(`value=["']${preset}["']`), `missing ${preset} preset`);
});

const mathScript = html.indexOf("js/toric_cone_math.js");
const explorerScript = html.indexOf("js/higher_dimensional_slice_explorer.js");
assert.ok(mathScript >= 0 && explorerScript > mathScript, "exact toric math must load before the explorer");

assert.match(explorer, /key:\s*["']toric-cone["'],\s*label:\s*["']rational cone["']/);
assert.match(explorer, /objectType:\s*["']toric-cone["']/);
assert.match(explorer, /kind:\s*["']toric["']/);
assert.match(explorer, /new Worker\(["']js\/toric_cone_worker\.js/);
assert.match(worker, /ToricConeMath\.analyzeCone/);
assert.match(explorer, /ToricConeMath\.sliceCone/);
assert.match(html, /sigma = cone\(columns U\).*U = \[u_1 \.\.\. u_r\] in Z\^\(n x r\)/);
assert.match(html, /data-toric-input-mode=["']manual["']/);
assert.match(html, /data-toric-input-mode=["']import["']/);
assert.match(html, /data-toric-input-mode=["']targets["']/);
assert.match(html, /value=["']columns["']>n rows; rays are columns/);
assert.match(html, /value=["']legacy-rows["']>legacy: one ray per row/);
assert.match(explorer, /function parseToricRayMatrix\(/);
assert.match(explorer, /entriesByRow\.map\(\(row\) => row\[column\]\)/);
assert.match(explorer, /target\.fieldKey === ["']generators["']/);
assert.match(explorer, /primitive-normalized/);
assert.match(explorer, /key:\s*["']toric-fan["'],\s*label:\s*["']toric variety \(fan\)["']/);
assert.match(explorer, /objectType:\s*["']toric-fan["']/);
assert.match(explorer, /ToricConeMath\.analyzeFan/);
assert.match(explorer, /renderToricFanCard\(\)/);
assert.match(explorer, /data-toric-fan-cone-source/);
assert.match(explorer, /function toricCharacterInfoForCandidate\(/);
assert.match(explorer, /div\(chi\^m\)/);
assert.match(explorer, /underlying line bundle is trivial/);
assert.match(explorer, /piecewise-linear support functions on the fan/);
assert.match(html, /Lattice \/ Equivariant Bundles/);
assert.match(explorer, /const characterFan = candidate\.latticePoint \? toricCharacterFanForCandidate\(candidate\) : null/);
assert.match(explorer, /const priority = characterFan \? 2 : candidate\.latticePoint \? 1 : 0/);
assert.match(explorer, /Math\.sqrt\(distanceSq\) <= Math\.sqrt\(bestDistanceSq\) \+ 3 \* ratio/);

assert.match(explorer, /normalized\.objectType === ["']fan["'] \|\| normalized\.kind === ["']fan["']/);
assert.match(explorer, /normalized\.objectType = ["']cartesian-frame["']/);
assert.match(explorer, /normalizeImportedSourceObject\(object, targetAmbientDimension/);
assert.match(explorer, /discarded coordinate .* is nonzero/);
assert.match(explorer, /const envelope = object\?\.data \? object/);
assert.match(explorer, /!data\.objectType && !data\.data\?\.objectType/);
assert.match(explorer, /analysis\?\.status \|\| ["']missing["']/);

assert.match(explorer, /Deleting .* deletes the entire cone .* and U_sigma\. Continue\?/);
assert.match(explorer, /if \(confirmed\) deleteToricConeObject/);
assert.match(explorer, /state\.objects = state\.objects\.filter\(\(candidate\) => candidate\.id !== object\.id\)/);

assert.match(explorer, /state\.activeToricFace = null/);
assert.match(explorer, /hideToricConePickMenu\(\)/);
assert.match(explorer, /invalidateToricAnalysis\(\)/);

console.log("higher_dimensional_slice_toric_test: all tests passed");
