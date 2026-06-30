// Save this file as theorem_graph_presets/quartic_double_solid.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Quartic double solid", key: "quartic_double_solid", file: "quartic_double_solid.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.quartic_double_solid = {
  "schemaVersion": 1,
  "title": "Quartic double solid",
  "nodes": [
    {
      "id": "n2",
      "type": "theorem",
      "label": "AJ is iso",
      "setting": "Picco Botta proves the Abel–Jacobi isomorphism for the surface of k-dimensional quadrics on the general complete intersection of three quadrics in \\mathbb{P}^{2k+4}. For k=0, this concerns lines; for k=1, this concerns conics on a complete intersection of three quadrics in \\mathbb{P}^6, matching the case X \\subset \\mathbb{P}^6.",
      "condition": "",
      "result": "\\cite{zbMATH04091651}",
      "proofSketch": "",
      "citationKeys": [
        "zbMATH04091651"
      ],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 536.1,
      "y": 203.8
    },
    {
      "id": "n4",
      "type": "theorem",
      "label": "unirationality of X",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 318,
      "y": 116
    },
    {
      "id": "n5",
      "type": "theorem",
      "label": "formula of Bott",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 212.7,
      "y": 310
    },
    {
      "id": "n6",
      "type": "example",
      "label": "smoothness of F",
      "setting": "",
      "condition": "",
      "result": "\\cite[3]{Wel81}",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 307.1,
      "y": 498.2
    },
    {
      "id": "n7",
      "type": "example",
      "label": "basic infos",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#3d6b4f",
      "fillColor": "#eef7f4",
      "x": 363.7,
      "y": 307.5
    },
    {
      "id": "n8",
      "type": "example",
      "label": "curves in F",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 522.3,
      "y": 432.5
    }
  ],
  "arrows": [
    {
      "id": "a3",
      "sourceId": "n5",
      "targetId": "n4",
      "label": "",
      "remark": "",
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
      "sourceId": "n6",
      "targetId": "n7",
      "label": "",
      "remark": "",
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
      "id": "a5",
      "sourceId": "n7",
      "targetId": "n2",
      "label": "",
      "remark": "",
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
      "id": "a6",
      "sourceId": "n8",
      "targetId": "n7",
      "label": "",
      "remark": "",
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
      "id": "a7",
      "sourceId": "n4",
      "targetId": "n7",
      "label": "",
      "remark": "",
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
      "key": "Wel81",
      "author": "Welters, G. E.",
      "title": "Abel-Jacobi isogenies for certain types of Fano threefolds",
      "year": "1981",
      "citeText": "\\cite{Wel81}",
      "url": "https://scispace.com/pdf/abel-jacobi-isogenies-for-certain-types-of-fano-threefolds-32wgtkrz9m.pdf",
      "source": "bibtex",
      "rawBibtex": "@book{Wel81,\n author = {Welters, G. E.},\n title = {Abel-{Jacobi} isogenies for certain types of {Fano} threefolds},\n fseries = {Mathematical Centre Tracts},\n series = {Math. Cent. Tracts},\n volume = {141},\n year = {1981},\n publisher = {Centrum voor Wiskunde en Informatica (CWI), Amsterdam},\n language = {English},\n keywords = {14J30,14K30,14H40},\n zbMATH = {3743439},\n Zbl = {0474.14028}\n}"
    },
    {
      "key": "zbMATH04091651",
      "author": "Picco Botta, Luciana",
      "title": "On the intersection of three quadrics",
      "year": "1989",
      "citeText": "\\cite{zbMATH04091651}",
      "url": "https://eudml.org/doc/153159",
      "source": "web",
      "rawBibtex": "@article{zbMATH04091651,\n author = {Picco Botta, Luciana},\n title = {On the intersection of three quadrics},\n fjournal = {Journal f{\\\"u}r die Reine und Angewandte Mathematik},\n journal = {J. Reine Angew. Math.},\n issn = {0075-4102},\n volume = {399},\n pages = {188--207},\n year = {1989},\n language = {English},\n doi = {10.1515/crll.1989.399.188},\n keywords = {14J25,14C17,11E16},\n url = {https://eudml.org/doc/153159},\n zbMATH = {4091651},\n Zbl = {0667.14019}\n}"
    }
  ],
  "view": {
    "selectedId": "n2",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};



