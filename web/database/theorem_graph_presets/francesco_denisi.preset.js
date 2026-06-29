// Save this file as theorem_graph_presets/francesco_denisi.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Francesco Denisi", key: "francesco_denisi", file: "francesco_denisi.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.francesco_denisi = {
  "schemaVersion": 1,
  "title": "Francesco Denisi",
  "nodes": [
    {
      "id": "n4",
      "type": "theorem",
      "label": "$\\operatorname{Bir}(X)$ in families",
      "setting": "",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 359,
      "y": 339
    },
    {
      "id": "n5",
      "type": "example",
      "label": "Example 1.4",
      "setting": "",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 333.1,
      "y": 190.4
    },
    {
      "id": "n6",
      "type": "definition",
      "label": "Hassett divisor",
      "setting": "",
      "condition": "",
      "result": "",
      "citationKeys": [],
      "color": "#66527c",
      "fillColor": "#f4f1f8",
      "x": 310.1,
      "y": 401.2
    }
  ],
  "arrows": [
    {
      "id": "a3",
      "sourceId": "n6",
      "targetId": "n5",
      "label": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a4",
      "sourceId": "n5",
      "targetId": "n4",
      "label": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
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
      "citeText": "\\cite{hartshorne1977}",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@book{hartshorne1977, author={Hartshorne, Robin}, title={Algebraic Geometry}, year={1977}}"
    },
    {
      "key": "den26",
      "author": "Francesco Antonio Denisi and Claudio Onorati and Francesca Rizzo and Sasha Viktorova",
      "title": "Birational automorphism groups in families of hyper-K\\\"ahler manifolds",
      "year": "2026",
      "citeText": "\\cite{den26}",
      "url": "https://arxiv.org/abs/2601.16090",
      "source": "web",
      "rawBibtex": "@misc{den26,\n      title={Birational automorphism groups in families of hyper-K\\\"ahler manifolds}, \n      author={Francesco Antonio Denisi and Claudio Onorati and Francesca Rizzo and Sasha Viktorova},\n      year={2026},\n      eprint={2601.16090},\n      archivePrefix={arXiv},\n      primaryClass={math.AG},\n      url={https://arxiv.org/abs/2601.16090}, \n}"
    }
  ],
  "view": {
    "selectedId": "",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};