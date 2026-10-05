// Save this file as theorem_graph_presets/daily_tasks.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "daily tasks", key: "daily_tasks", file: "daily_tasks.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.daily_tasks = {
  "schemaVersion": 11,
  "title": "daily tasks",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "daily tasks",
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
      "id": "n50",
      "type": "misc",
      "label": "typo emails",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 202.3,
      "y": 110.9
    },
    {
      "id": "n51",
      "type": "misc",
      "label": "Farkas course video",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 209.9,
      "y": 182.3
    },
    {
      "id": "n53",
      "type": "misc",
      "label": "Hamburg works",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 380.7,
      "y": 96.2,
      "childGraph": {
        "title": "Hamburg works",
        "nodes": [
          {
            "id": "n6",
            "type": "misc",
            "label": "add websites for Hamburg",
            "details": [
              {
                "id": "web-lists",
                "label": "web lists",
                "type": "checkbox",
                "text": "- [x] https://www.math.uni-hamburg.de/\n- [x] https://www.kus.uni-hamburg.de/en.html\n- [x] https://www.rrz.uni-hamburg.de/"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 237.4,
            "y": 101.1
          },
          {
            "id": "n8",
            "type": "misc",
            "label": "softwares",
            "details": [
              {
                "id": "tools",
                "label": "tools",
                "type": "checkbox",
                "text": "- [ ] chatgpt and codex\n- [ ] everything\n- [ ] snipaste\neverything\n- [x] 小狼毫\nbandzip\ngithub"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 505.1,
            "y": 162.1
          }
        ],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 337,
          "canvasRatioLocked": true,
          "canvasAspectRatio": 2.2315
        }
      }
    },
    {
      "id": "n54",
      "type": "misc",
      "label": "Youtube video",
      "details": [
        {
          "id": "check",
          "label": "check",
          "type": "checkbox",
          "text": "\\cite{link1} 48:33"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "link1"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 409.3,
      "y": 192.8
    }
  ],
  "arrows": [],
  "view": {
    "selectedId": "",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 300,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 2.5067,
    "relativeNodePositions": {
      "n50": {
        "x": 0.2687,
        "y": 0.3697
      },
      "n51": {
        "x": 0.2787,
        "y": 0.6075
      },
      "n53": {
        "x": 0.5056,
        "y": 0.3207
      },
      "n54": {
        "x": 0.5436,
        "y": 0.6428
      }
    },
    "selectedReferenceKeys": []
  },
  "references": [
    {
      "key": "link1",
      "author": "",
      "title": "Livestream of Heidelberg Laureate Forum Panel Discussion",
      "year": "",
      "citeKey": "link1",
      "url": "https://www.youtube.com/live/-RzGo0GaG2I",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://www.youtube.com/live/-RzGo0GaG2I",
          "source": "web",
          "label": ""
        }
      ]
    }
  ]
};