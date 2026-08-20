// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 10,
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
      "details": [
        {
          "id": "bug",
          "label": "bug",
          "type": "checkbox",
          "text": "For Hodge numbers chart, the formula for c_1^2 and c_2 is wrong"
        }
      ],
      "setting": "Add related objects: embedding into \\mathbb{P}^n, AJ, ramification locus, actual vector bundle.\nIdentification of some sheaves with others in the step-by-step calculation: ramification locus, \\Omega_{\\mathbb{P}^n}, etc.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 76.4,
      "y": 69.5,
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
      "x": 116.6,
      "y": 309.7
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
      "x": 292.2,
      "y": 393.3
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
      "x": 269.1,
      "y": 58.7
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
          "text": "- [x] \\cite{...} in reference chart can be touched. When touched, it shows the name of nodes/arrows which cites this article\n- [x] add a new type for the node: object/property\n- [x] For different type of nodes I should be able to change the default rows\n- [x] title in the tab should be the \"name of the title node\", like \"Maintenance Tracker\", but not \"Theorem Graph Calculator\"\n- [x] user should be also able to export a single reference"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "..."
      ],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 599.2,
      "y": 87.8
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
      "x": 469.6,
      "y": 393.3,
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
      "x": 650.4,
      "y": 344.5
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
      "x": 344.5,
      "y": 153.4
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
          "text": "add chinese version"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 304.6,
      "y": 239.2
    },
    {
      "id": "n69",
      "type": "misc",
      "label": "prompt",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "- [x] In Theorem Graph Calculator, add a link before the \"send feedback\" hyperlink, which suggests user how to use the AI to generate the theorem graph, and what AI should usually do to create an ideal json text"
        },
        {
          "id": "functions",
          "label": "functions",
          "type": "checkbox",
          "text": "- [x] told AI that:\n- [x] This page support ref, it is recommended to give a reference for each goal in detail(which page or which chapter, for example). If all goals use a citation for one whole book, then user may not find what they want quickly\n- [x] This page support MathJax rendering\n- [x] When generating roadmaps, focus on the examples and definitions; the AI can provide user a list of definition, and check if user know or not know. A quick recall of unknown definition(with reference) can help user to understand quickly\n- [x] The goal can be more realizable, avoid \"understand ...\" (It has several kind of understanding. Reader can written down the theorem and its proof, or check the logic of each step, or check where the conditions are used, these are all called \"understanding\"). Unless user specifies, if a question has concrete answer(correct/false, or a concrete number), then just tell the user(like \"compute the degree of map\" can be changed to \"verify that the degree of the map is 3\")\n- [x] This website should also make a introduction about the structure of json text, so that AI don't need to search for the js document for writing it."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 494.1,
      "y": 222.8,
      "childGraph": {
        "title": "prompt",
        "nodes": [],
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
      "id": "a49",
      "sourceId": "n69",
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
    "selectedId": "n69",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 452,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.6674,
    "relativeNodePositions": {
      "n4": {
        "x": 0.1015,
        "y": 0.1538
      },
      "n37": {
        "x": 0.1548,
        "y": 0.6851
      },
      "n39": {
        "x": 0.388,
        "y": 0.8702
      },
      "n58": {
        "x": 0.3574,
        "y": 0.1298
      },
      "n60": {
        "x": 0.7958,
        "y": 0.1943
      },
      "n63": {
        "x": 0.6237,
        "y": 0.8702
      },
      "n65": {
        "x": 0.8638,
        "y": 0.7621
      },
      "n66": {
        "x": 0.4575,
        "y": 0.3393
      },
      "n68": {
        "x": 0.4045,
        "y": 0.5291
      },
      "n69": {
        "x": 0.6562,
        "y": 0.493
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