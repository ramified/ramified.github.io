{
  "id": "glue-test",
  "label": "glue_test",
  "lattice": "square",
  "rows": 5,
  "cols": 5,
  "surface": "Sigma_0,2",
  "removedTiles": [],
  "connectFourHoles": [],
  "inputHoles": [],
  "cutEdges": [],
  "gluedEdges": [
    {
      "group": 0,
      "orientation": "opposite",
      "reversed": false,
      "firstArrowReversed": false,
      "secondArrowReversed": true,
      "first": {
        "row": 1,
        "col": 3,
        "dir": 3,
        "edge": "N"
      },
      "second": {
        "row": 3,
        "col": 1,
        "dir": 2,
        "edge": "W"
      }
    },
    {
      "group": 0,
      "orientation": "opposite",
      "reversed": false,
      "firstArrowReversed": false,
      "secondArrowReversed": true,
      "first": {
        "row": 1,
        "col": 4,
        "dir": 3,
        "edge": "N"
      },
      "second": {
        "row": 4,
        "col": 1,
        "dir": 2,
        "edge": "W"
      }
    },
    {
      "group": 0,
      "orientation": "opposite",
      "reversed": false,
      "firstArrowReversed": false,
      "secondArrowReversed": true,
      "first": {
        "row": 1,
        "col": 5,
        "dir": 3,
        "edge": "N"
      },
      "second": {
        "row": 5,
        "col": 1,
        "dir": 2,
        "edge": "W"
      }
    }
  ],
  "sokoban": {
    "targets": [
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 4
      },
      {
        "row": 5,
        "col": 5
      }
    ],
    "energyBridges": [
      {
        "row": 2,
        "col": 1
      },
      {
        "row": 3,
        "col": 4
      },
      {
        "row": 4,
        "col": 2
      }
    ],
    "players": [
      {
        "row": 1,
        "col": 5
      }
    ]
  }
}