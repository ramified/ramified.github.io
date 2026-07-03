// Save this file as theorem_graph_presets/corrections_wait.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Corrections wait", key: "corrections_wait", file: "corrections_wait.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.corrections_wait = {
  "schemaVersion": 2,
  "title": "Corrections wait",
  "nodes": [
    {
      "id": "n4",
      "type": "example",
      "label": "Sheaf Calculator",
      "setting": "Add related objects: embedding into \\mathbb{P}^n, AJ, ramification locus, actual vector bundle.\nIdentification of some sheaves with others in the step-by-step calculation: ramification locus, \\Omega_{\\mathbb{P}^n}, etc.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 574.3,
      "y": 374
    },
    {
      "id": "n11",
      "type": "example",
      "label": "hidden sheaves",
      "setting": "Sometimes relative tangent/cotangent sheaves are easier than the other ones; then there is no need to construct hidden sheaves.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 593.7,
      "y": 153.8
    },
    {
      "id": "n13",
      "type": "example",
      "label": "Theorem Graph Calculator",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 301,
      "y": 374
    },
    {
      "id": "n21",
      "type": "example",
      "label": "Ramified Minigames",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 375.4,
      "y": 218
    },
    {
      "id": "n25",
      "type": "example",
      "label": "hypersurface",
      "setting": "add the normal sheaf identification rule for the hypersurface.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 421.3,
      "y": 46
    },
    {
      "id": "n28",
      "type": "misc",
      "label": "add default color",
      "details": [
        {
          "id": "setting",
          "label": "setting",
          "type": "textbox",
          "text": "set the braun color as default color (make a list of the current default colors, I felt like fore different type the default color is different)"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fffdf8",
      "x": 483.1,
      "y": 293.8
    },
    {
      "id": "n29",
      "type": "example",
      "label": "big number",
      "setting": "those numbers like 128 and 1024... the textsize for them are too big and the text is outside of the box",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 170.5,
      "y": 156.3
    },
    {
      "id": "n30",
      "type": "example",
      "label": "add presets",
      "setting": "genus 2 preset;\nrandom glue preset;\nsome hex presets",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 176.1,
      "y": 310.8
    },
    {
      "id": "n32",
      "type": "example",
      "label": "debug",
      "setting": "add a debug mode",
      "condition": "in this mode, the user can give any number (2^k) to the tile. And there is an export telling the current status of the game.",
      "result": "I need to use this to fix the bug of moving continuously",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 266.9,
      "y": 46
    }
  ],
  "arrows": [
    {
      "id": "a7",
      "sourceId": "n11",
      "targetId": "n4",
      "label": "",
      "remark": "",
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
      "id": "a20",
      "sourceId": "n11",
      "targetId": "n25",
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
      "id": "a21",
      "sourceId": "n28",
      "targetId": "n13",
      "label": "",
      "remark": "",
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
      "id": "a22",
      "sourceId": "n29",
      "targetId": "n21",
      "label": "",
      "remark": "",
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
      "id": "a23",
      "sourceId": "n30",
      "targetId": "n21",
      "label": "",
      "remark": "",
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
      "id": "a24",
      "sourceId": "n32",
      "targetId": "n21",
      "label": "",
      "remark": "",
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
      "key": "normal bundle",
      "author": "",
      "title": "normal bundle of hypersurface",
      "year": "",
      "citeText": "",
      "url": "https://chatgpt.com/share/6a43e9be-c214-83eb-95ad-5540eb27b907",
      "source": "web",
      "rawBibtex": ""
    }
  ],
  "view": {
    "selectedId": "n28",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};