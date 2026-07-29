// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 8,
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
      "x": 183.2,
      "y": 33.8,
      "childGraph": {
        "title": "Sheaf Calculator",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false
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
      "x": 63.9,
      "y": 203.7
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
      "x": 177.7,
      "y": 274.5
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
      "x": 476,
      "y": 388.6
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
      "x": 374.6,
      "y": 261.3
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
      "x": 398.1,
      "y": 34
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
      "x": 298.5,
      "y": 129.5
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
          "text": "- [x] default type is misc\n- [x] other type can also type in Extra\n- [x] run layout will not push too the right too much and left side outside of the screen\n- [x] can choose run layout so that nodes don't coincide\n- [x] add citation cross-reference\n- [x] \\cite{diagram} in the edit should be only diagram, code will add \\cite{...} for a preparation\n- [x] add node for the title, allow to add some extras\n- [x] allow users to double click the node to expand to another graph. It will be like tab in Google Chrome, where the delete button is replaced by returning button."
        },
        {
          "id": "bug",
          "label": "bug",
          "type": "checkbox",
          "text": "- [x] if user add some info in the textbox (in node A), and then click the other node B without clicking other area beforehead, then the textbox in node A will cover all the info in node B, which is what we don't want to see"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 578.5,
      "y": 41.9
    },
    {
      "id": "n61",
      "type": "misc",
      "label": "feedback",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 691.4,
      "y": 151.7
    },
    {
      "id": "n62",
      "type": "misc",
      "label": "Strand Diagram Calculator",
      "details": [
        {
          "id": "cite",
          "label": "cite",
          "type": "textbox",
          "text": "\\cite{diagram}"
        },
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "- [x] In the main canvas there is a big strand\n- [x] User can add basic elements step-by-step\n- [x] Different expressions for symmetric groups, see https://github.com/ramified/master_thesis"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 278.5,
      "y": 386.5
    },
    {
      "id": "n64",
      "type": "misc",
      "label": "Sokoban",
      "details": [
        {
          "id": "bugs",
          "label": "display bugs",
          "type": "checkbox",
          "text": "- [x] The beamers should not get over the glued boundary in a half circle way, that is cut off by the gluing\n- [x] When user move the beamer the energy bridge and beamer are both flicking, which should be fixed. They should have the animation of movement. If user move the energy bridge instead, the energy bridge won't create the beamer during the movement."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 689,
      "y": 363.6
    },
    {
      "id": "n65",
      "type": "misc",
      "label": "typo",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] title node can not add extra objects\n- [x] ref edit should follow the same method as node edit; that is, there is no delete button, and user click the title of the row to modify/delete the term\n- [x] Add a tiny padding in the main canvas on top and bottom, so that the node is not attaching the boundary"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 540.6,
      "y": 256.1
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
    },
    {
      "id": "a50",
      "sourceId": "n64",
      "targetId": "n48",
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
      "id": "a51",
      "sourceId": "n65",
      "targetId": "n60",
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
    "selectedId": "",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.8101,
    "relativeNodePositions": {
      "n4": {
        "x": 0.2433,
        "y": 0.0813
      },
      "n37": {
        "x": 0.0848,
        "y": 0.4896
      },
      "n39": {
        "x": 0.236,
        "y": 0.6598
      },
      "n48": {
        "x": 0.6321,
        "y": 0.9342
      },
      "n55": {
        "x": 0.4975,
        "y": 0.628
      },
      "n58": {
        "x": 0.5287,
        "y": 0.0816
      },
      "n59": {
        "x": 0.3964,
        "y": 0.3112
      },
      "n60": {
        "x": 0.7683,
        "y": 0.1006
      },
      "n61": {
        "x": 0.9182,
        "y": 0.3645
      },
      "n62": {
        "x": 0.3699,
        "y": 0.929
      },
      "n64": {
        "x": 0.915,
        "y": 0.874
      },
      "n65": {
        "x": 0.7179,
        "y": 0.6157
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
    },
    {
      "key": "bronken app",
      "author": "",
      "title": "bronken app",
      "year": "",
      "citeKey": "diagram",
      "url": "https://dehornoy.lmno.cnrs.fr/Softwares/TressApp/",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://dehornoy.lmno.cnrs.fr/Softwares/TressApp/",
          "source": "web",
          "label": ""
        }
      ]
    }
  ]
};