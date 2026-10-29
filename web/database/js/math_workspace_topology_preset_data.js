// Generated from mosaic_calculator.js KNOT_PRESETS. Run node js/build_math_workspace_topology_presets.mjs.
(function(root){
  const presets=[
  {
    "id": "hopf-link",
    "label": "Hopf link",
    "data": {
      "pd": [
        [
          1,
          3,
          2,
          4
        ],
        [
          4,
          2,
          3,
          1
        ]
      ],
      "circles": 0
    }
  },
  {
    "id": "solomon-link",
    "label": "Solomon link (L4a1)",
    "data": {
      "pd": [
        [
          1,
          8,
          4,
          7
        ],
        [
          6,
          3,
          7,
          4
        ],
        [
          5,
          2,
          8,
          1
        ],
        [
          2,
          5,
          3,
          6
        ]
      ],
      "circles": 0
    }
  },
  {
    "id": "whitehead-link",
    "label": "Whitehead link (L5a1)",
    "data": {
      "pd": [
        [
          10,
          5,
          7,
          6
        ],
        [
          1,
          10,
          6,
          9
        ],
        [
          4,
          2,
          5,
          1
        ],
        [
          3,
          7,
          2,
          8
        ],
        [
          8,
          4,
          9,
          3
        ]
      ],
      "circles": 0
    }
  },
  {
    "id": "trefoil",
    "label": "Trefoil knot (3_1)",
    "data": {
      "pd": [
        [
          4,
          1,
          3,
          6
        ],
        [
          5,
          2,
          6,
          3
        ],
        [
          2,
          5,
          1,
          4
        ]
      ],
      "circles": 0
    }
  },
  {
    "id": "figure-eight",
    "label": "Figure-eight knot (4_1)",
    "data": {
      "pd": [
        [
          5,
          7,
          4,
          8
        ],
        [
          1,
          3,
          8,
          4
        ],
        [
          6,
          1,
          7,
          2
        ],
        [
          3,
          6,
          2,
          5
        ]
      ],
      "circles": 0
    }
  }
];
  if(typeof module!=='undefined'&&module.exports)module.exports=presets;else root.MathWorkspaceTopologyPresetData=presets;
})(typeof window!=='undefined'?window:globalThis);
