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
      "y": 81.4,
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
      "y": 370.6
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
      "y": 81.4
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
          "text": "- [x] The textbox in import chart does not allow copy-paste"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
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
      "x": 469,
      "y": 370.6,
      "childGraph": {
        "title": "double click",
        "nodes": [
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
            "x": 319.6,
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
          "text": "Isoball 4\nStephen's Sausage Roll\nThe Geometer's Sketchpad\nPlotTropCurve\nProjective Hex"
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
      "x": 658.1,
      "y": 343.7
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
      "x": 359,
      "y": 147.1
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
          "text": "- [ ] Add hex support for Tile matching\n- [ ] \"Click the white cue ball and drag away from the intended shot; it travels in the opposite direction.\" should appear in the main canvas, like the caption. \"drag to shoot\" label can be removed\n- [ ] For the Hex, click undo should remove \"red wins. Start another round with the same game settings.\" chart\n- [ ] Like \"Test in Minigames\" row in Mosaic calculator export page, there should be also a \"edit in Mosaic calculator\" row in minigames export page. When clicked, the default boundary should be \"Glued\", Mode being \"Background space\", Click action being \"Add/remove decorations\"\n- [x] The code should only store reusable game-specific computations when the checkbox is clicked and user click \"refresh\".\n- [x] For Import chart in Mosaic calculator, the Catalog row should be a selectbox of \"knot/link\", \"stable curve\" and \"minigames\". Under the minigames choice there is a row for the types of the minigame and finally the name of the level(there are some special cases where rows and colomns should be specified further). Remove the Preset row in the background space mode, as they will be covered by this.\n- [x] For those objects in Decoration palette, if they appear in the main canvas and be dragged out of the main canvas then it should be removed, like what we see in Tiling preferences."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 419.4,
      "y": 271.2
    },
    {
      "id": "n70",
      "type": "misc",
      "label": "index",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] For index.html, as those gifs take a lot of time to be loaded, I would like the corresponding demo-strip disappear when the gifs are not loaded. It should preserve the Masonn"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 628.8,
      "y": 178.9
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
    "selectedId": "n68",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 452,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.6674,
    "relativeNodePositions": {
      "n4": {
        "x": 0.1015,
        "y": 0.18
      },
      "n37": {
        "x": 0.1548,
        "y": 0.6851
      },
      "n39": {
        "x": 0.388,
        "y": 0.82
      },
      "n58": {
        "x": 0.3574,
        "y": 0.18
      },
      "n60": {
        "x": 0.7958,
        "y": 0.1943
      },
      "n63": {
        "x": 0.6229,
        "y": 0.82
      },
      "n65": {
        "x": 0.874,
        "y": 0.7603
      },
      "n66": {
        "x": 0.4768,
        "y": 0.3255
      },
      "n68": {
        "x": 0.557,
        "y": 0.5999
      },
      "n70": {
        "x": 0.8351,
        "y": 0.3959
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