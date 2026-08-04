// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 9,
  "title": "Maintenance Tracker",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Maintenance Tracker",
    "details": [],
    "setting": "",
    "condition": "",
    "result": "",
    "proofSketch": "",
    "citationKeys": [],
    "color": "#8b5f2a",
    "fillColor": "#fff7df"
  },
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
      "x": 193.7,
      "y": 71.3,
      "childGraph": {
        "title": "Sheaf Calculator",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 416,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 1.8101
        }
      }
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
      "x": 98.3,
      "y": 232.3
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
      "x": 263.6,
      "y": 268.7
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
          "text": "- [x] actual loop in sokoban, allow reset in the loop\n- [x] allow to press Z long time to speed up cancellation"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 512.3,
      "y": 301.8
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
        },
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "pair of pants decomposition\nspanning tree: detect and creation\nhomology class"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 521.3,
      "y": 187.4
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
      "x": 406.1,
      "y": 54
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
      "citationKeys": [
        "simple sing"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 335.8,
      "y": 153.2
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
          "text": "- [x] checkbox can use right click to turn it into a yellow question symbol(The current \"[x]\" are quite different compared with previous one, looks like the symbol get smaller and the border is missing, could you fix it?)\n- [x] delete selected button is replaced by the return button in the subgraph, but we still need this delete selected button"
        },
        {
          "id": "bug",
          "label": "bug",
          "type": "checkbox",
          "text": "- [x] citation should be checked, if they are not used they should be removed\n- [x] When user change the \"cite as\" row all the node refering this reference will change the expression so that the reference link is not broken\n- [x] when deleted, the warning should also tell user which nodes or arrows cite this reference, so that user can clear them before delete it\n- [x] connect bug: when user is in modification of one node and try to connect the two other nodes, the modified node will cover the first node(where the arrow comes from), this is bad\n- [x] the graph and the subgraph can have different main canvas height, and don't affact each other\n- [x] dashed lines should have weaker force in the run layout process, and dotted lines even weaker"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 597.6,
      "y": 54
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
  "view": {
    "selectedId": "n60",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 416,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.8101,
    "relativeNodePositions": {
      "n4": {
        "x": 0.2572,
        "y": 0.1715
      },
      "n37": {
        "x": 0.1305,
        "y": 0.5583
      },
      "n39": {
        "x": 0.35,
        "y": 0.6459
      },
      "n48": {
        "x": 0.6804,
        "y": 0.7256
      },
      "n55": {
        "x": 0.6923,
        "y": 0.4505
      },
      "n58": {
        "x": 0.5393,
        "y": 0.1298
      },
      "n59": {
        "x": 0.4459,
        "y": 0.3683
      },
      "n60": {
        "x": 0.7936,
        "y": 0.1298
      }
    },
    "selectedReferenceKeys": []
  },
  "references": [
    {
      "key": "mo1",
      "author": "",
      "title": "Simple singularities algorithm?",
      "year": "",
      "citeKey": "simple sing",
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
  ]
};