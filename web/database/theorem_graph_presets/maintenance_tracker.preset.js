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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 84,
      "y": 54.1,
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
      "x": 117.1,
      "y": 270.8
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
      "x": 283.1,
      "y": 334.9
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
      "x": 287,
      "y": 54.1
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
          "text": "\\cite{...} in reference chart can be touched. When touched, it shows the name of nodes/arrows which cites this article"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "..."
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 591.6,
      "y": 81.7
    },
    {
      "id": "n63",
      "type": "misc",
      "label": "double click",
      "details": [
        {
          "id": "new-functions-intro",
          "label": "new functions intro",
          "type": "checkbox",
          "text": "you can double click this node to open a new graph\ntry drag a node into this node"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 487,
      "y": 334.9,
      "childGraph": {
        "title": "double click",
        "nodes": [
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
            "x": 454.9,
            "y": 280
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
                "text": "- [ ] Newton polygon\n- [x] tropical curve\n- [ ] Arnold's classification\n- [ ] Simple singularities\n- [ ] \\cite{simple sing}"
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
            "x": 318.7,
            "y": 333
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
            "x": 383.4,
            "y": 201.9
          }
        ],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 560,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 1.7143
        }
      }
    },
    {
      "id": "n65",
      "type": "misc",
      "label": "Acknowledgements",
      "details": [
        {
          "id": "4d",
          "label": "4d",
          "type": "checkbox",
          "text": "https://www.dimensions-math.org/Dim_E.htm\n4d toys"
        },
        {
          "id": "3-2d",
          "label": "3/2d",
          "type": "checkbox",
          "text": "Isoball 4\nStephen's Sausage Roll\nThe Geometer's Sketchpad\nPlotTropCurve"
        },
        {
          "id": "updates",
          "label": "updates",
          "type": "checkbox",
          "text": "Lievis is also used in Higher-Dimensional Slice Calculator"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 633.7,
      "y": 261.1
    },
    {
      "id": "n66",
      "type": "misc",
      "label": "Place Ramification Calculator",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "- [ ] change the field extension to two different field, with a single primitive generator\n- [x] Try to identify number field with labels in LMFDB\n- [x] for a number field gives the lattice"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 362.6,
      "y": 110.1
    },
    {
      "id": "n68",
      "type": "misc",
      "label": "Ramified Minigames",
      "details": [
        {
          "id": "bugs",
          "label": "bugs",
          "type": "checkbox",
          "text": "For Chinese checker game:\nLooks like the player who join the room can no longer pick the sides, but this is weird, as the player who join the room don't has the correct game, the color choice is confusing. The code should allow player who join the room pick the color after join the room and then confirm\nIt is weird that player who join the room can only move after the player who create the room move, I still wish every player can move\nAnd if a color is controlled by another player, then there should be no highlight for this color on this side\nAdd the name for the player, so user knows who is playing\nHow do you usually indicate when it's the opponent's turn in online Go games? Like a \"not allowed\" cursor?"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 366,
      "y": 246.7
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
    "selectedId": "n65",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 389,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.9381,
    "relativeNodePositions": {
      "n4": {
        "x": 0.1116,
        "y": 0.1392
      },
      "n37": {
        "x": 0.1555,
        "y": 0.6962
      },
      "n39": {
        "x": 0.3759,
        "y": 0.8608
      },
      "n58": {
        "x": 0.3811,
        "y": 0.1392
      },
      "n60": {
        "x": 0.7856,
        "y": 0.2099
      },
      "n63": {
        "x": 0.6468,
        "y": 0.8608
      },
      "n65": {
        "x": 0.8416,
        "y": 0.6711
      },
      "n66": {
        "x": 0.4816,
        "y": 0.283
      },
      "n68": {
        "x": 0.486,
        "y": 0.6341
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