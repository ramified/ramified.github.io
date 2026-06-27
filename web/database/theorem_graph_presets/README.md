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

The calculator's Export panel already produces the full contents of a `.preset.js` file.
Copy that output into `my_graph.preset.js`.

It will look like:

```js
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.my_graph = {
  "schemaVersion": 1,
  "title": "My Graph",
  "nodes": [],
  "arrows": [],
  "references": [],
  "view": {}
};
```

The `key` in `presets.js` must match the property name used in the `.preset.js` file.
