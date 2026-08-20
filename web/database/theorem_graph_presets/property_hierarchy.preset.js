// Save this file as theorem_graph_presets/property_hierarchy.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "property hierarchy", key: "property_hierarchy", file: "property_hierarchy.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.property_hierarchy = {
  "schemaVersion": 9,
  "title": "property hierarchy",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "property hierarchy",
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
      "id": "n70",
      "type": "misc",
      "label": "group",
      "details": [
        {
          "id": "cite",
          "label": "cite",
          "type": "textbox",
          "text": "\\cite{CR81}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "CR81"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 444.4,
      "y": 190,
      "childGraph": {
        "title": "group",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "p-groups",
            "details": [
              {
                "id": "def",
                "label": "def",
                "type": "textbox",
                "text": "$|G|=p^r$ for some $r$"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 452.3,
            "y": 54
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "nilpotent groups",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 249.1,
            "y": 82.5
          },
          {
            "id": "n3",
            "type": "misc",
            "label": "supersolvable groups",
            "details": [
              {
                "id": "def",
                "label": "def",
                "type": "list",
                "text": "solvable\nexist a composition series where each subgroup is normal"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 421,
            "y": 215
          },
          {
            "id": "n4",
            "type": "misc",
            "label": "solvable groups",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 258.8,
            "y": 339.3
          },
          {
            "id": "n5",
            "type": "misc",
            "label": "p-solvable groups",
            "details": [
              {
                "id": "def",
                "label": "def",
                "type": "textbox",
                "text": "exist a normal series where each facor is either $p$-group or \"p'\"-group"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 434.9,
            "y": 394
          },
          {
            "id": "n8",
            "type": "misc",
            "label": "has a normal p-complement",
            "details": [
              {
                "id": "def",
                "label": "def",
                "type": "textbox",
                "text": "$G=H \\rtimes S$ where $S$ is a Sylow $p$-subgroup"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 588.2,
            "y": 295.7
          },
          {
            "id": "n9",
            "type": "misc",
            "label": "$S_1 \\times \\cdots \\times S_n$ for Sylow subgroups",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 105.9,
            "y": 199.3
          }
        ],
        "arrows": [
          {
            "id": "a1",
            "sourceId": "n1",
            "targetId": "n2",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a2",
            "sourceId": "n2",
            "targetId": "n3",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a3",
            "sourceId": "n3",
            "targetId": "n4",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a4",
            "sourceId": "n4",
            "targetId": "n5",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a5",
            "sourceId": "n8",
            "targetId": "n5",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a6",
            "sourceId": "n2",
            "targetId": "n9",
            "label": "$\\textcolor{blue}{\\text{finite group}}$",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 2,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          }
        ],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": false,
          "layoutRunning": false,
          "canvasHeight": 501,
          "canvasRatioLocked": true,
          "canvasAspectRatio": 1.501
        }
      }
    }
  ],
  "arrows": [],
  "view": {
    "selectedId": "",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 300,
    "canvasRatioLocked": false,
    "canvasAspectRatio": 1.9789,
    "selectedReferenceKeys": []
  },
  "references": []
};

