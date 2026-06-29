// Save this file as theorem_graph_presets/corrections_wait.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Corrections wait", key: "corrections_wait", file: "corrections_wait.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.corrections_wait = {
  "schemaVersion": 1,
  "title": "Corrections wait",
  "nodes": [
    {
      "id": "n4",
      "type": "example",
      "label": "Sheaf Calculator",
      "setting": "add related objects: embedding into P^n, AJ, ramification locus, actual vector bundle\nidentification of some sheaves with others in the step-by-step calculation (ramification locus, Omega_P^n,...)",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 327.3,
      "y": 346.5
    },
    {
      "id": "n6",
      "type": "example",
      "label": "add extra rules",
      "setting": "ilde{H}=pi^*H; as 2R=pi^*(dH) we know R=d/2\tilde{H}",
      "condition": "ilde{H}^3=2;...",
      "result": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 525,
      "y": 281.3
    },
    {
      "id": "n11",
      "type": "example",
      "label": "hidden sheaves",
      "setting": "Sometimes relative tangent/cotangent sheaves are easier than the other ones, then no need to construct hidden sheaves",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 228.3,
      "y": 164.4
    },
    {
      "id": "n12",
      "type": "example",
      "label": "further examples",
      "setting": "tensor product;\nOmega^i;tangent^i;\nBott formula",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 417.5,
      "y": 140.4
    }
  ],
  "arrows": [
    {
      "id": "a3",
      "sourceId": "n6",
      "targetId": "n4",
      "label": "",
      "body": "solid",
      "head": "arrow",
      "tail": "hook",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a7",
      "sourceId": "n11",
      "targetId": "n4",
      "label": "",
      "body": "solid",
      "head": "arrow",
      "tail": "hook",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a8",
      "sourceId": "n12",
      "targetId": "n4",
      "label": "",
      "body": "solid",
      "head": "arrow",
      "tail": "hook",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    }
  ],
  "references": [
    {
      "key": "hartshorne1977",
      "author": "Hartshorne, Robin",
      "title": "Algebraic Geometry",
      "year": "1977",
      "citeText": "cite{hartshorne1977}",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@book{hartshorne1977, author={Hartshorne, Robin}, title={Algebraic Geometry}, year={1977}}"
    },
    {
      "key": "Bott",
      "author": "",
      "title": "Bott formula",
      "year": "",
      "citeText": "cite{link2}",
      "url": "https://claude.ai/share/142d0460-e54e-4671-9d5e-ac10c469a87b",
      "source": "web",
      "rawBibtex": ""
    }
  ],
  "view": {
    "selectedId": "",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};