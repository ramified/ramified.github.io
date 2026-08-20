# Theorem graph presets

Use one small registry file plus one `.preset.js` file per saved graph.

In `presets.js`, list each preset:

```js
window.THEOREM_GRAPH_PRESETS = [
  {
    label: 'My Graph',
    key: 'my_graph',
    file: 'my_graph.preset.js'
  }
];
```

The calculator's Import / Export panel already produces the full contents of a `.preset.js` file.
Copy that output into `my_graph.preset.js`.

It will look like:

```js
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.my_graph = {
  "schemaVersion": 7,
  "title": "My Graph",
  "nodes": [],
  "arrows": [],
  "references": [
    {
      "key": "diagram",
      "citeKey": "diagram"
    }
  ],
  "view": {
    "layoutAvoidOverlap": true
  }
};
```

The `key` in `presets.js` must match the property name used in the `.preset.js` file.

You can also set the global default rows for each node type in `presets.js`:

```js
window.THEOREM_GRAPH_NODE_TYPE_ROWS = {
  theorem: ['setting', 'condition', 'result', 'proof sketch'],
  object: ['definition', 'examples', 'properties'],
  property: ['definition', 'criteria', 'examples'],
  misc: []
};
```

These rows apply by node type across every graph. They are not per-preset overrides.
