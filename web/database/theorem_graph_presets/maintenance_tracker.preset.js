// Save this file as theorem_graph_presets/maintenance_tracker.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Maintenance Tracker", key: "maintenance_tracker", file: "maintenance_tracker.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.maintenance_tracker = {
  "schemaVersion": 4,
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
      "x": 533.3,
      "y": 46
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
          "text": "add complex, allowing user to truncate to shorter complex\nSES is a special complex\nSES induces LES\nfiltration and quotient\nit induces spectral sequencez\ntriangle can change to a SES if user claim sp\ntriangle can shift itself"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 269.6,
      "y": 46
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
      "x": 380.6,
      "y": 124
    },
    {
      "id": "n46",
      "type": "misc",
      "label": "wrong glue",
      "details": [
        {
          "id": "preset",
          "label": "preset",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T10:46:51.997Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"half-glued\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"4x4 Sigma_1,1\",\n    \"lattice\": \"square\",\n    \"rows\": 4,\n    \"cols\": 4,\n    \"surface\": \"Sigma_1,1\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 3,\n          \"index\": 14,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 2,\n          \"index\": 1,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 4,\n          \"index\": 15,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 8,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 4,\n          \"index\": 3,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 12,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 4,\n          \"index\": 7,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 16,\n    \"existing\": 16,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 4,\n    \"unmatchedBoundaries\": 8,\n    \"boundaryComponents\": 1,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 1,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_1,1\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"T_1 with 1 hole, 0 cusps\\\">&Sigma;<sub>1,1</sub></span>\",\n    \"surfaceTypeTooltip\": \"T_1 with 1 hole, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": -1,\n    \"action\": \"billiard\",\n    \"multiEdges\": true,\n    \"chainLength\": 2,\n    \"chainReversed\": true,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "type",
          "label": "type",
          "type": "textbox",
          "text": "half-glued"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 266.7,
      "y": 374
    },
    {
      "id": "n47",
      "type": "misc",
      "label": "hyperlink",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "Except the following cases, all calculators only link to the main calculator:\nYoung Diagram Calculator with Young Diagram^2 Calculator are linked to each other\nMosaic Calculator and Ramified Minigames\nSheaf Calculator and Category Calculator"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 636,
      "y": 351.3
    },
    {
      "id": "n48",
      "type": "misc",
      "label": "minigame",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 523,
      "y": 374
    },
    {
      "id": "n49",
      "type": "misc",
      "label": "Theorem Graph Calculator",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 252.3,
      "y": 195.9
    },
    {
      "id": "n50",
      "type": "misc",
      "label": "label",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "label of the arrow should have no background rectangle\nLike the https://q.uiver.app/, user can determine the position of the label, and left align/centre align(clear)/centre align(over)/right align"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 132.3,
      "y": 374
    },
    {
      "id": "n51",
      "type": "misc",
      "label": "better display",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "when the five/four in a line, the reused piece will have several yellow highlights indicating how many times the piece is used, and if a line is used more than once it will also be bolded\nThe display row should also work for \"Connect Four\", while both have default choice display \"vertex E/S/W/N\". Maybe the \"vertex E/S/W/N\" can be called \"gridded board\" and the \"tile centers\" can be called \"tile board\"?"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 363.8,
      "y": 238.6
    },
    {
      "id": "n52",
      "type": "misc",
      "label": "Reversi",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 361.9,
      "y": 374
    },
    {
      "id": "n53",
      "type": "misc",
      "label": "presets",
      "details": [
        {
          "id": "high-hit",
          "label": "high hit2",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:33:57.168Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_0,3\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_0,3\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 2,\n    \"unmatchedBoundaries\": 22,\n    \"boundaryComponents\": 3,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 0,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_0,3\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"S^2 with 3 holes, 0 cusps\\\">&Sigma;<sub>0,3</sub></span>\",\n    \"surfaceTypeTooltip\": \"S^2 with 3 holes, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": -1,\n    \"action\": \"glue-boundary\",\n    \"multiEdges\": false,\n    \"chainLength\": 1,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "high-hit-2",
          "label": "high hit",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:38:32.288Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_1,1\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_1,1\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 2,\n    \"unmatchedBoundaries\": 22,\n    \"boundaryComponents\": 1,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 1,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_1,1\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"T_1 with 1 hole, 0 cusps\\\">&Sigma;<sub>1,1</sub></span>\",\n    \"surfaceTypeTooltip\": \"T_1 with 1 hole, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": -1,\n    \"action\": \"glue-boundary\",\n    \"multiEdges\": false,\n    \"chainLength\": 1,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "all-horizontal",
          "label": "all horizontal",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:46:55.845Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_1,5\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_1,5\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 5,\n          \"index\": 39,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 3,\n          \"index\": 37,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 2,\n        \"color\": \"#6a4c93\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 6,\n          \"index\": 40,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 3,\n        \"color\": \"#c47f17\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 2,\n          \"index\": 36,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 4,\n        \"color\": \"#2f855a\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 5,\n        \"color\": \"#8a4f7d\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 6,\n    \"unmatchedBoundaries\": 14,\n    \"boundaryComponents\": 5,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 1,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_1,5\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"T_1 with 5 holes, 0 cusps\\\">&Sigma;<sub>1,5</sub></span>\",\n    \"surfaceTypeTooltip\": \"T_1 with 5 holes, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": -5,\n    \"action\": \"glue-boundary\",\n    \"multiEdges\": false,\n    \"chainLength\": 1,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "top-fight",
          "label": "top fight",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:44:19.664Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_1,1\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_1,1\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 3,\n          \"index\": 37,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 5,\n          \"index\": 39,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 2,\n        \"color\": \"#6a4c93\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 2,\n          \"index\": 36,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 3,\n        \"color\": \"#c47f17\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 6,\n          \"index\": 40,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 4,\n        \"color\": \"#2f855a\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 5,\n        \"color\": \"#8a4f7d\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 6,\n    \"unmatchedBoundaries\": 14,\n    \"boundaryComponents\": 1,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 1,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_1,1\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"T_1 with 1 hole, 0 cusps\\\">&Sigma;<sub>1,1</sub></span>\",\n    \"surfaceTypeTooltip\": \"T_1 with 1 hole, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": -1,\n    \"action\": \"glue-boundary\",\n    \"multiEdges\": false,\n    \"chainLength\": 1,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "exchange",
          "label": "exchange",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:50:12.337Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_1.5,1^1\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_1.5,1^1\",\n    \"removedTiles\": [],\n    \"cutEdges\": [\n      {\n        \"left\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14\n        },\n        \"right\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21\n        }\n      },\n      {\n        \"left\": {\n          \"row\": 3,\n          \"col\": 2,\n          \"index\": 15\n        },\n        \"right\": {\n          \"row\": 4,\n          \"col\": 2,\n          \"index\": 22\n        }\n      },\n      {\n        \"left\": {\n          \"row\": 3,\n          \"col\": 6,\n          \"index\": 19\n        },\n        \"right\": {\n          \"row\": 4,\n          \"col\": 6,\n          \"index\": 26\n        }\n      },\n      {\n        \"left\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20\n        },\n        \"right\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27\n        }\n      }\n    ],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 2,\n          \"index\": 22,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 6,\n          \"index\": 19,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 6,\n          \"index\": 26,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 1,\n        \"color\": \"#b23a48\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 3,\n          \"edge\": \"N\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 2,\n          \"index\": 15,\n          \"dir\": 1,\n          \"edge\": \"S\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 4,\n    \"gluedEdges\": 4,\n    \"unmatchedBoundaries\": 26,\n    \"boundaryComponents\": 1,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 1.5,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_1.5,1^1\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"T_1.5 with 1 hole, 1 cusp\\\">&Sigma;<sub>1.5,1</sub><sup>1</sup></span>\",\n    \"surfaceTypeTooltip\": \"T_1.5 with 1 hole, 1 cusp\",\n    \"cusps\": 1,\n    \"eulerCharacteristic\": -2,\n    \"action\": \"billiard\",\n    \"multiEdges\": true,\n    \"chainLength\": 2,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 686.8,
      "y": 212.2
    },
    {
      "id": "n54",
      "type": "misc",
      "label": "strip presets",
      "details": [
        {
          "id": "usual-strip",
          "label": "usual strip",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T11:59:52.881Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_0,2\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_0,2\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 6,\n    \"unmatchedBoundaries\": 14,\n    \"boundaryComponents\": 2,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 0,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_0,2\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"S^2 with 2 holes, 0 cusps\\\">&Sigma;<sub>0,2</sub></span>\",\n    \"surfaceTypeTooltip\": \"S^2 with 2 holes, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": 0,\n    \"action\": \"billiard\",\n    \"multiEdges\": true,\n    \"chainLength\": 6,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "m-bius-strip",
          "label": "Möbius strip",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T12:16:09.129Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 N_1,1\",\n    \"lattice\": \"square\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"N_1,1\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 2,\n          \"edge\": \"W\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 6,\n    \"unmatchedBoundaries\": 14,\n    \"boundaryComponents\": 1,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": null,\n    \"nonorientableGenus\": 1,\n    \"orientable\": false,\n    \"surfaceType\": \"N_1,1\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"P_1 with 1 hole, 0 cusps\\\">N<sub>1,1</sub></span>\",\n    \"surfaceTypeTooltip\": \"P_1 with 1 hole, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": 0,\n    \"action\": \"reverse-glue\",\n    \"multiEdges\": true,\n    \"chainLength\": 6,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "hex-usual-strip",
          "label": "hex usual strip",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T12:06:46.678Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 Sigma_0,2\",\n    \"lattice\": \"hexagonal\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"Sigma_0,2\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 7,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 8,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        }\n      },\n      {\n        \"id\": 9,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 10,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 11,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"opposite\",\n        \"reversed\": false,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 11,\n    \"unmatchedBoundaries\": 28,\n    \"boundaryComponents\": 2,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": 0,\n    \"nonorientableGenus\": null,\n    \"orientable\": true,\n    \"surfaceType\": \"Sigma_0,2\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"S^2 with 2 holes, 0 cusps\\\">&Sigma;<sub>0,2</sub></span>\",\n    \"surfaceTypeTooltip\": \"S^2 with 2 holes, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": 0,\n    \"action\": \"billiard\",\n    \"multiEdges\": true,\n    \"chainLength\": 11,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "hex-bad-m-bius-strip",
          "label": "hex bad Möbius strip",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T12:12:16.541Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"6x7 N_0,2^10\",\n    \"lattice\": \"hexagonal\",\n    \"rows\": 6,\n    \"cols\": 7,\n    \"surface\": \"N_0,2^10\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 7,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 8,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        }\n      },\n      {\n        \"id\": 9,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      },\n      {\n        \"id\": 10,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        }\n      },\n      {\n        \"id\": 11,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": true,\n        \"secondArrowReversed\": true,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 42,\n    \"existing\": 42,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 11,\n    \"unmatchedBoundaries\": 28,\n    \"boundaryComponents\": 2,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": null,\n    \"nonorientableGenus\": 0,\n    \"orientable\": false,\n    \"surfaceType\": \"N_0,2^10\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"P_0 with 2 holes, 10 cusps\\\">N<sub>0,2</sub><sup>10</sup></span>\",\n    \"surfaceTypeTooltip\": \"P_0 with 2 holes, 10 cusps\",\n    \"cusps\": 10,\n    \"eulerCharacteristic\": 0,\n    \"action\": \"tile\",\n    \"multiEdges\": true,\n    \"chainLength\": 11,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        },
        {
          "id": "hex-good-m-bius-strip",
          "label": "hex good Möbius strip",
          "type": "textbox",
          "text": "{\n  \"schema\": \"ramified-minigame-background-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-09T12:15:11.455Z\",\n  \"source\": \"mosaic-calculator\",\n  \"sourcePresetId\": \"classic-4x4\",\n  \"preset\": {\n    \"id\": \"mosaic-background\",\n    \"label\": \"7x7 N_0,2\",\n    \"lattice\": \"hexagonal\",\n    \"rows\": 7,\n    \"cols\": 7,\n    \"surface\": \"N_0,2\",\n    \"removedTiles\": [],\n    \"cutEdges\": [],\n    \"gluedEdges\": [\n      {\n        \"id\": 1,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 7,\n          \"col\": 1,\n          \"index\": 42,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 1,\n          \"col\": 7,\n          \"index\": 6,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 2,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 7,\n          \"col\": 1,\n          \"index\": 42,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        }\n      },\n      {\n        \"id\": 3,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 6,\n          \"col\": 1,\n          \"index\": 35,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 4,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        },\n        \"second\": {\n          \"row\": 2,\n          \"col\": 7,\n          \"index\": 13,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        }\n      },\n      {\n        \"id\": 5,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 3,\n          \"col\": 7,\n          \"index\": 20,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 6,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 5,\n          \"col\": 1,\n          \"index\": 28,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        }\n      },\n      {\n        \"id\": 7,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 4,\n          \"col\": 1,\n          \"index\": 21,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 8,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        },\n        \"second\": {\n          \"row\": 4,\n          \"col\": 7,\n          \"index\": 27,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        }\n      },\n      {\n        \"id\": 9,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 5,\n          \"col\": 7,\n          \"index\": 34,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 10,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 3,\n          \"col\": 1,\n          \"index\": 14,\n          \"dir\": 4,\n          \"edge\": \"NW\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 5,\n          \"edge\": \"NE\"\n        }\n      },\n      {\n        \"id\": 11,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 2,\n          \"col\": 1,\n          \"index\": 7,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      },\n      {\n        \"id\": 12,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 2,\n          \"edge\": \"SW\"\n        },\n        \"second\": {\n          \"row\": 6,\n          \"col\": 7,\n          \"index\": 41,\n          \"dir\": 1,\n          \"edge\": \"SE\"\n        }\n      },\n      {\n        \"id\": 13,\n        \"group\": 0,\n        \"color\": \"#1f7a8c\",\n        \"orientation\": \"reversed\",\n        \"reversed\": true,\n        \"firstArrowReversed\": false,\n        \"secondArrowReversed\": false,\n        \"first\": {\n          \"row\": 1,\n          \"col\": 1,\n          \"index\": 0,\n          \"dir\": 3,\n          \"edge\": \"W\"\n        },\n        \"second\": {\n          \"row\": 7,\n          \"col\": 7,\n          \"index\": 48,\n          \"dir\": 0,\n          \"edge\": \"E\"\n        }\n      }\n    ]\n  },\n  \"backgroundSpace\": {\n    \"total\": 49,\n    \"existing\": 49,\n    \"removed\": 0,\n    \"cutEdges\": 0,\n    \"gluedEdges\": 13,\n    \"unmatchedBoundaries\": 28,\n    \"boundaryComponents\": 2,\n    \"components\": 1,\n    \"closedSurface\": false,\n    \"genus\": null,\n    \"nonorientableGenus\": 0,\n    \"orientable\": false,\n    \"surfaceType\": \"N_0,2\",\n    \"surfaceTypeHtml\": \"<span class=\\\"tooltip-label\\\" tabindex=\\\"0\\\" data-tooltip=\\\"P_0 with 2 holes, 0 cusps\\\">N<sub>0,2</sub></span>\",\n    \"surfaceTypeTooltip\": \"P_0 with 2 holes, 0 cusps\",\n    \"cusps\": 0,\n    \"eulerCharacteristic\": 0,\n    \"action\": \"reverse-glue\",\n    \"multiEdges\": true,\n    \"chainLength\": 13,\n    \"chainReversed\": false,\n    \"cuspMarkerScale\": 0.7,\n    \"billiardSpeed\": 0.2,\n    \"billiardTrailLength\": 200,\n    \"billiardArrowLength\": 20,\n    \"billiardHitMarkers\": \"boundary\"\n  }\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 462.3,
      "y": 168.9
    },
    {
      "id": "n55",
      "type": "misc",
      "label": "Mosaic Calculator",
      "details": [
        {
          "id": "improve",
          "label": "improve",
          "type": "textbox",
          "text": "allow more rows and more columns"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 587.2,
      "y": 150.1
    },
    {
      "id": "n56",
      "type": "misc",
      "label": "misc node",
      "details": [
        {
          "id": "bug",
          "label": "bug",
          "type": "textbox",
          "text": "When user try to change the name of the extra, the name should only appear in the textbox, not appear twice"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 56.1,
      "y": 226
    },
    {
      "id": "n57",
      "type": "misc",
      "label": "main canvas",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "main canvas should be allowed to drag longer. User can also lock the ratio, so that the length and width ration is fixed, while the relative position and bigness of the buttons are also fixed."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 114.8,
      "y": 46
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
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a37",
      "sourceId": "n4",
      "targetId": "n39",
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
      "id": "a39",
      "sourceId": "n46",
      "targetId": "n48",
      "label": "23",
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
      "id": "a40",
      "sourceId": "n50",
      "targetId": "n49",
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
      "id": "a41",
      "sourceId": "n51",
      "targetId": "n48",
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
      "id": "a42",
      "sourceId": "n52",
      "targetId": "n48",
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
      "id": "a43",
      "sourceId": "n53",
      "targetId": "n48",
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
      "id": "a44",
      "sourceId": "n54",
      "targetId": "n53",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "arrow",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a45",
      "sourceId": "n54",
      "targetId": "n48",
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
      "id": "a46",
      "sourceId": "n56",
      "targetId": "n49",
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
      "id": "a47",
      "sourceId": "n57",
      "targetId": "n49",
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
  "references": [],
  "view": {
    "selectedId": "n39",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};