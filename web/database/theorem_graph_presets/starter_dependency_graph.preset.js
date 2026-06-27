// Save this file as theorem_graph_presets/starter_dependency_graph.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Starter Dependency Graph", key: "starter_dependency_graph", file: "starter_dependency_graph.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.starter_dependency_graph = {
  "schemaVersion": 1,
  "title": "Starter Dependency Graph",
  "nodes": [
    {
      "id": "n1",
      "type": "lemma",
      "label": "MT group",
      "setting": "",
      "condition": "",
      "result": "",
      "citationKeys": [
        "hartshorne1977"
      ],
      "color": "#1a1612",
      "x": 210.7,
      "y": 180
    },
    {
      "id": "n2",
      "type": "theorem",
      "label": "HC for abelian fourfold",
      "setting": "",
      "condition": "",
      "result": "",
      "citationKeys": [
        "hartshorne1977"
      ],
      "color": "#7a4d9b",
      "x": 487.3,
      "y": 169.3
    }
  ],
  "arrows": [
    {
      "id": "a3",
      "sourceId": "n1",
      "targetId": "n2",
      "label": "",
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    }
  ],
  "references": [
    {
      "key": "hartshorne1977",
      "author": "Robin Hartshorne",
      "title": "Algebraic Geometry",
      "year": "1977",
      "citeText": "\\cite{hartshorne1977}",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@book{hartshorne1977, title={Algebraic Geometry}, author={Hartshorne, Robin}, year={1977}}"
    }
  ],
  "view": {
    "selectedId": "",
    "selectedReferenceKeys": [
      "hartshorne1977"
    ],
    "layoutRunning": false
  }
};