// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 7,
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
      "x": 221.2,
      "y": 45.7
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
      "x": 89.4,
      "y": 208.4
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
      "x": 202.5,
      "y": 290.8
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
      "x": 587.3,
      "y": 383
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
      "x": 460.2,
      "y": 283.6
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
      "x": 443,
      "y": 32.2
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
      "x": 338.2,
      "y": 152.3
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
          "text": "- [x] default type is misc\n- [x] other type can also type in Extra\n- [x] run layout will not push too the right too much and left side outside of the screen\n- [x] can choose run layout so that nodes don't coincide\n- [x] add citation cross-reference\n- [x] \\cite{diagram} in the edit should be only diagram, code will add \\cite{...} for a preparation\n- [ ] add node for the title, allow to add some extras\n- [ ] allow users to double click the node to expand to another graph. It will be like tab in Google Chrome, where the delete button is replaced by returning button."
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 611.1,
      "y": 65
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 682.2,
      "y": 229
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
          "text": "In the main canvas there is a big strand\nUser can add basic elements step-by-step\nDifferent expressions for symmetric groups, see https://github.com/ramified/master_thesis"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 333.8,
      "y": 384.6
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
  ],
  "view": {
    "selectedId": "n60",
    "selectedReferenceKeys": [],
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.8101,
    "relativeNodePositions": {
      "n4": {
        "x": 0.2937,
        "y": 0.1098
      },
      "n37": {
        "x": 0.1187,
        "y": 0.5009
      },
      "n39": {
        "x": 0.2689,
        "y": 0.699
      },
      "n48": {
        "x": 0.78,
        "y": 0.9206
      },
      "n55": {
        "x": 0.6112,
        "y": 0.6818
      },
      "n58": {
        "x": 0.5883,
        "y": 0.0775
      },
      "n59": {
        "x": 0.4492,
        "y": 0.3661
      },
      "n60": {
        "x": 0.8116,
        "y": 0.1562
      },
      "n61": {
        "x": 0.906,
        "y": 0.5506
      },
      "n62": {
        "x": 0.4433,
        "y": 0.9246
      }
    }
  }
};