// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 5,
  "title": "Maintenance Tracker",
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
      "color": "#8b3a2a",
      "fillColor": "#fffdf8",
      "x": 176.8,
      "y": 76.4
    },
    {
      "id": "n37",
      "type": "misc",
      "label": "complex calculator",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "- [x] add complex,\n- [x] allowing user to truncate to shorter complex\n- [x] SES is a special complex\n- [x] SES induces LES\n- [x] filtration and quotient\n- [ ] it induces spectral sequence\n- [ ] triangle can change to a SES if user claim sp\n- [ ] triangle can shift itself"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 86.6,
      "y": 148.2
    },
    {
      "id": "n39",
      "type": "misc",
      "label": "category calculator",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "- [x] Similar to Sheaf Calculator, I need to make a calculator with category and functors\n- [x] The main terms are \"Ob(C)\" and morphisms, user can assign a typical symbol for objects in this category\n- [x] User can pick opposite category, and set functors to be covariant/contravariant\n- [ ] Add natural transformation\n- [ ] Add a large presets of categories and functors"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 148.9,
      "y": 212
    },
    {
      "id": "n48",
      "type": "misc",
      "label": "minigame",
      "details": [
        {
          "id": "future",
          "label": "future?",
          "type": "checkbox",
          "text": "- [x] Go\n- [ ] Billiard\n- [x] Reversi"
        },
        {
          "id": "bugs",
          "label": "bugs",
          "type": "checkbox",
          "text": "actual loop in sokoban, allow reset in the loop\nallow to press Z long time to speed up cancellation"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 329.3,
      "y": 220.4
    },
    {
      "id": "n55",
      "type": "misc",
      "label": "Mosaic Calculator",
      "details": [
        {
          "id": "hard-realization",
          "label": "hard realization",
          "type": "checkbox",
          "text": "not only realize divisors, but also all degeneralizations\nD(A|B) realization"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 255.8,
      "y": 177.3
    },
    {
      "id": "n58",
      "type": "misc",
      "label": "$M_{g,n}$",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 288.9,
      "y": 46
    },
    {
      "id": "n59",
      "type": "misc",
      "label": "Others",
      "details": [
        {
          "id": "future",
          "label": "future",
          "type": "checkbox",
          "text": "Newton polygon/tropical curve\nArnold's classification\nSimple singularities\n\\cite{simple sing}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 236,
      "y": 254
    },
    {
      "id": "n60",
      "type": "misc",
      "label": "Theorem Graph Calculator",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "other type can also type in Extra\nrun layout will not push too the right too much and left side outside of the screen\ncan choose run layout so that nodes don't coincide"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 296.7,
      "y": 126.7
    }
  ],
  "arrows": [
    {
      "id": "a28",
      "sourceId": "n37",
      "targetId": "n4",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "hook",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 15,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#5f574e"
    },
    {
      "id": "a37",
      "sourceId": "n4",
      "targetId": "n39",
      "label": "same UI",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "labelPosition": 0.5,
      "labelAlign": "center-clear",
      "color": "#5f574e"
    },
    {
      "id": "a48",
      "sourceId": "n58",
      "targetId": "n4",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "hook",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 15,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#5f574e"
    }
  ],
  "references": [
    {
      "key": "mo1",
      "author": "",
      "title": "Simple singularities algorithm?",
      "year": "",
      "citeText": "\\cite{simple sing}",
      "url": "https://mathoverflow.net/questions/185692/how-can-one-determine-if-a-singularity-is-simple",
      "source": "mathoverflow",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://mathoverflow.net/questions/185692/how-can-one-determine-if-a-singularity-is-simple",
          "source": "mathoverflow",
          "label": ""
        }
      ]
    }
  ],
  "view": {
    "selectedId": "n60",
    "selectedReferenceKeys": [],
    "layoutRunning": false,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.4659,
    "relativeNodePositions": {
      "n4": {
        "x": 0.4159,
        "y": 0.2545
      },
      "n37": {
        "x": 0.2037,
        "y": 0.494
      },
      "n39": {
        "x": 0.3503,
        "y": 0.7066
      },
      "n48": {
        "x": 0.7749,
        "y": 0.7348
      },
      "n55": {
        "x": 0.6018,
        "y": 0.591
      },
      "n58": {
        "x": 0.6797,
        "y": 0.1533
      },
      "n59": {
        "x": 0.5554,
        "y": 0.8467
      },
      "n60": {
        "x": 0.698,
        "y": 0.4223
      }
    }
  }
};