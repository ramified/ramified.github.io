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
      "x": 80.1,
      "y": 54,
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
      "x": 124.9,
      "y": 282.7
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
      "x": 283.9,
      "y": 334
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
      "x": 284.9,
      "y": 54
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
      "x": 534.4,
      "y": 54
    },
    {
      "id": "n61",
      "type": "misc",
      "label": "extra",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "allow user to move one node inside or outside"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 342,
      "y": 128.9
    },
    {
      "id": "n62",
      "type": "misc",
      "label": "others",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "export button being on the left of the update button\nwhen click a node or arrow, if node/arrow card is collapsed then it auto expands itself;\nwhen click a citation in node/arrow card, if reference card is collapsed then it auto expands itself(and node/arrow card preserve itself);"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 706,
      "y": 166.8
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
      "x": 398.2,
      "y": 302.7,
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
      "id": "n64",
      "type": "misc",
      "label": "Higher-Dimensional Slice Calculator",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "Add fundamental weights, simple roots and roots(as a point set, use can also choose \"positive\").\nIf both weight lattice and cover root lattice (for the same Dynkin type) appear, then only the extra vertices of the weight lattice will appear, those coincided vertices will only appear for the UI of root lattice\nAdd KL polynomials and length expression, from https://www.jgibson.id.au/lievis/affine_weyl"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 607.9,
      "y": 265.1
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
          "text": "The Geometer's Sketchpad\nIsoball 4"
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
      "x": 614.7,
      "y": 334
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
          "text": "change the field extension to two different field, with a single primitive generator\nTry to identify number field with labels in LMFDB\nfor a number field gives the lattice"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 369.5,
      "y": 217.6
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
      "sourceId": "n61",
      "targetId": "n60",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
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
      "sourceId": "n62",
      "targetId": "n60",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 15,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#5f574e"
    },
    {
      "id": "a52",
      "sourceId": "n66",
      "targetId": "n64",
      "label": "",
      "remark": "realize two important lattices in number theory",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
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
    "selectedId": "n63",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 388,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.9381,
    "relativeNodePositions": {
      "n4": {
        "x": 0.1066,
        "y": 0.1392
      },
      "n37": {
        "x": 0.1661,
        "y": 0.7286
      },
      "n39": {
        "x": 0.3776,
        "y": 0.8608
      },
      "n58": {
        "x": 0.3788,
        "y": 0.1392
      },
      "n60": {
        "x": 0.7107,
        "y": 0.1392
      },
      "n61": {
        "x": 0.4548,
        "y": 0.3323
      },
      "n62": {
        "x": 0.9388,
        "y": 0.43
      },
      "n63": {
        "x": 0.5295,
        "y": 0.7802
      },
      "n64": {
        "x": 0.8084,
        "y": 0.6833
      },
      "n65": {
        "x": 0.8174,
        "y": 0.8608
      },
      "n66": {
        "x": 0.4914,
        "y": 0.5608
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