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
      "x": 181.2,
      "y": 224.9
    },
    {
      "id": "n53",
      "type": "misc",
      "label": "daily works",
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
        "title": "daily works",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "hair cutting",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 322.1,
            "y": 55.3
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "clean the house",
            "details": [
              {
                "id": "check",
                "label": "check",
                "type": "checkbox",
                "text": "wall\nclothes"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 188.9,
            "y": 281.7
          },
          {
            "id": "n3",
            "type": "misc",
            "label": "cook",
            "details": [
              {
                "id": "check",
                "label": "check",
                "type": "checkbox",
                "text": "- [x] Spiegelkarpfen\n- [ ] white fungus\n- [?] tiramisu\n- [ ] antler"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 563,
            "y": 238.4
          },
          {
            "id": "n4",
            "type": "misc",
            "label": "prepare talks",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 405.5,
            "y": 281.7
          },
          {
            "id": "n5",
            "type": "misc",
            "label": "buy flight tickets",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 132.5,
            "y": 81.8
          },
          {
            "id": "n6",
            "type": "misc",
            "label": "add websites for Hamburg",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 566.7,
            "y": 99.8
          },
          {
            "id": "n7",
            "type": "misc",
            "label": "save scanned documents",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 323.7,
            "y": 173.6
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
      "x": 409.4,
      "y": 192.9
    }
  ],
  "arrows": [],
  "view": {
    "selectedId": "n54",
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
        "x": 0.2406,
        "y": 0.7497
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