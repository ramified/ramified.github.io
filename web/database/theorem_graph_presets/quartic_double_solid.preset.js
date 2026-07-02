

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
      "x": 548.4,
      "y": 186.3
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
      "x": 181.9,
      "y": 256.4
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
      "x": 246.5,
      "y": 463
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
      "x": 333,
      "y": 333.9
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
      "x": 346.4,
      "y": 122.8
    },
    {
      "id": "n8",
      "type": "example",
      "label": "curves in F",
      "setting": "",
      "condition": "",
      "result": "generic smoothness of these curves",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 480.9,
      "y": 304
    },
    {
      "id": "n9",
      "type": "lemma",
      "label": "non-empty for hyperflexes",
      "setting": "“Cayley–Salmon flecnode theorem”; you’ll find it under flecnode polynomial, flecnodal divisor, or Monge–Cayley–Salmon theorem.\n\nThe clean modern reference for the version I used is:\n\nThomas Bauer and Sławomir Rams, “Counting lines on projective surfaces,” Manuscripta Math. 2020.",
      "condition": "",
      "result": "",
      "proofSketch": "\\cite{bauer2020countinglinesprojectivesurfaces}",
      "citationKeys": [],
      "color": "#3d6b4f",
      "fillColor": "#eef7f4",
      "x": 437.6,
      "y": 503.7
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
    },
    {
      "id": "a8",
      "sourceId": "n9",
      "targetId": "n8",
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
    },
    {
      "key": "bauer2020",
      "author": "Thomas Bauer and Slawomir Rams",
      "title": "Counting lines on projective surfaces",
      "year": "2020",
      "citeText": "\\cite{bauer2020countinglinesprojectivesurfaces}",
      "url": "https://arxiv.org/abs/1902.05133",
      "source": "web",
      "rawBibtex": "@misc{bauer2020countinglinesprojectivesurfaces,\n      title={Counting lines on projective surfaces}, \n      author={Thomas Bauer and Slawomir Rams},\n      year={2020},\n      eprint={1902.05133},\n      archivePrefix={arXiv},\n      primaryClass={math.AG},\n      url={https://arxiv.org/abs/1902.05133}, \n}"
    }
  ],
  "view": {
    "selectedId": "n8",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};

