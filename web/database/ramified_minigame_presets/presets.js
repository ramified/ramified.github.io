(function(root, factory) {
  const presets = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
  if (root) root.RAMIFIED_MINIGAME_PRESETS = presets;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  const defaultForEntries = [
    ["gomoku", "boundary-glue-board"],
    ["go", "three-slits"],
    ["connect-four", "connect-four-exchange"],
    ["2048", "ramified-cover"],
    ["reversi", "focus-frame"],
    ["chinese-checkers", "octahedron-with-square-holes"],
    ["sokoban", "classic-fans"]
  ];
  return {
    gameOrder: defaultForEntries.map(([mode]) => mode),
    defaultFor: Object.fromEntries(defaultForEntries),
    presets: [
    {
      "gameTypes": [
        "2048",
        "Gomoku",
        "Go",
        "Reversi"
      ],
      "id": "boundary-glue-board",
      "label": "boundary glue board",
      "key": "boundary_glue_board",
      "file": "boundary_glue_board.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "classic-4x4",
      "label": "4*4 classic",
      "key": "classic_4x4",
      "file": "classic_4x4.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "twisted-torus",
      "label": "twisted torus",
      "key": "twisted_torus",
      "file": "twisted_torus.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "genus-2",
      "label": "genus 2",
      "key": "genus_2",
      "file": "genus_2.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "random-glue-4x4",
      "label": "random glue 4*4",
      "key": "random_glue_4x4",
      "file": "random_glue_4x4.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "half-glued",
      "label": "half-glued",
      "key": "half_glued",
      "file": "half_glued.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "ramified-cover",
      "label": "ramified cover",
      "key": "ramified_cover",
      "file": "ramified_cover.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "rubiks-cube-2x2x2",
      "label": "Rubik's Cube 2*2*2",
      "key": "rubiks_cube_2x2x2",
      "file": "rubiks_cube_2x2x2.preset.js"
    },
    {
      "gameTypes": [
        "2048","Gomoku", "Go"
      ],
      "id": "rubiks-cube-3x3x3",
      "label": "Rubik's Cube 3*3*3",
      "key": "rubiks_cube_3x3x3",
      "file": "rubiks_cube_3x3x3.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "usual-strip",
      "label": "usual strip",
      "key": "usual_strip",
      "file": "usual_strip.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "mobius-strip",
      "label": "M\u00f6bius strip",
      "key": "mobius_strip",
      "file": "mobius_strip.preset.js"
    },
    {
      "gameTypes": [
        "2048"
      ],
      "id": "hex-classic-4x4",
      "label": "hex classic 4*4",
      "key": "hex_classic_4x4",
      "file": "hex_classic_4x4.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku"
      ],
      "id": "gomoku-tic-tac-toe",
      "label": "Tic-tac-toe",
      "key": "gomoku_tic_tac_toe",
      "file": "gomoku_tic_tac_toe.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku", "Go"
      ],
      "id": "gomoku-strange-corner",
      "label": "strange corner",
      "key": "gomoku_strange_corner",
      "file": "gomoku_strange_corner.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku"
      ],
      "id": "gomoku-small-holes",
      "label": "small holes",
      "key": "gomoku_small_holes",
      "file": "gomoku_small_holes.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku"
      ],
      "id": "gomoku-big-hole",
      "label": "big hole",
      "key": "gomoku_big_hole",
      "file": "gomoku_big_hole.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku"
      ],
      "id": "gomoku-m4-15x15",
      "label": "genus 4",
      "key": "gomoku_m4_15x15",
      "file": "gomoku_m4_15x15.preset.js"
    },
    {"gameTypes":["Gomoku", "Go"],"id":"trefoil","label":"trefoil","key":"trefoil","file":"trefoil.preset.js"},
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-6x7",
      "label": "Connect Four 6*7",
      "key": "connect_four_6x7",
      "file": "connect_four_6x7.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-high-hit",
      "label": "high hit",
      "key": "connect_four_high_hit",
      "file": "connect_four_high_hit.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-high-hit-2",
      "label": "high hit2",
      "key": "connect_four_high_hit_2",
      "file": "connect_four_high_hit_2.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-all-horizontal",
      "label": "all horizontal",
      "key": "connect_four_all_horizontal",
      "file": "connect_four_all_horizontal.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-top-fight",
      "label": "top fight",
      "key": "connect_four_top_fight",
      "file": "connect_four_top_fight.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-exchange",
      "label": "exchange",
      "key": "connect_four_exchange",
      "file": "connect_four_exchange.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-across",
      "label": "across",
      "key": "connect_four_across",
      "file": "connect_four_across.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-usual-strip",
      "label": "usual strip",
      "key": "connect_four_usual_strip",
      "file": "connect_four_usual_strip.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-mobius-strip",
      "label": "M\u00f6bius strip",
      "key": "connect_four_mobius_strip",
      "file": "connect_four_mobius_strip.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-hex-usual-strip",
      "label": "hex usual strip",
      "key": "connect_four_hex_usual_strip",
      "file": "connect_four_hex_usual_strip.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "falling-in-two-ways",
      "label": "falling in two ways",
      "key": "falling_in_two_ways",
      "file": "falling_in_two_ways.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-hex-bad-mobius-strip",
      "label": "hex bad M\u00f6bius strip",
      "key": "connect_four_hex_bad_mobius_strip",
      "file": "connect_four_hex_bad_mobius_strip.preset.js"
    },
    {
      "gameTypes": [
        "Connect Four"
      ],
      "id": "connect-four-hex-good-mobius-strip",
      "label": "hex good M\u00f6bius strip",
      "key": "connect_four_hex_good_mobius_strip",
      "file": "connect_four_hex_good_mobius_strip.preset.js"
    },
    {"gameTypes":["Connect Four"],"id":"r","label":"R","key":"r","file":"r.preset.js"},
    {
      "gameTypes": [
        "Connect Four",
        "Gomoku"
      ],
      "id": "xi",
      "label": "\u56cd",
      "key": "xi",
      "file": "xi.preset.js"
    },
    {
      "gameTypes": [
        "Go"
        ],
      "id": "three-slits",
      "label": "three_slits",
      "key": "three_slits",
      "file": "three_slits.preset.js"
    },
    {
      "gameTypes": [
        "Chinese Checkers"
      ],
      "id": "chinese-checkers-hex-rhombus-9x9",
      "label": "hex rhombus 9*9",
      "key": "chinese_checkers_hex_rhombus_9x9",
      "file": "chinese_checkers_hex_rhombus_9x9.preset.js"
    },
    {
      "gameTypes": [
        "Chinese Checkers"
      ],
      "id": "chinese-checkers-hex-strip-9x9",
      "label": "hex strip 9*9",
      "key": "chinese_checkers_hex_strip_9x9",
      "file": "chinese_checkers_hex_strip_9x9.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku",
        "Connect Four",
        "Go"
        ],
      "id": "tunnels",
      "label": "tunnels",
      "key": "tunnels",
      "file": "tunnels.preset.js"
    },
    {
      "gameTypes": [
        "Chinese Checkers"
        ],
      "id": "classic-chinese-checkers",
      "label": "classic chinese checkers",
      "key": "classic_chinese_checkers",
      "file": "classic_chinese_checkers.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku",
        "Go",
        "Chinese Checkers"
        ],
      "id": "octahedron-with-square-holes",
      "label": "octahedron with square holes",
      "key": "octahedron_with_square_holes",
      "file": "octahedron_with_square_holes.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku",
        "Go",
        "Chinese Checkers"
        ],
      "id": "octahedron-with-square-glues",
      "label": "octahedron with square glues",
      "key": "octahedron_with_square_glues",
      "file": "octahedron_with_square_glues.preset.js"
    },
    {
      "gameTypes": [
        "Gomoku",
        "Go",
        "Chinese Checkers"
        ],
      "id": "dodecahedron-with-pentagon-holes",
      "label": "dodecahedron with pentagon holes",
      "key": "dodecahedron_with_pentagon_holes",
      "file": "dodecahedron_with_pentagon_holes.preset.js"
    },
    {
      "gameTypes": [
        "Reversi"
        ],
      "id": "focus-frame",
      "label": "focus frame",
      "key": "focus_frame",
      "file": "focus_frame.preset.js"
    },
    {
      "gameTypes": [
        "Sokoban"
        ],
      "id": "classic-fans",
      "label": "classic_fans",
      "key": "classic_fans",
      "file": "classic_fans.preset.js"
    },
    {
      "gameTypes": [
        "Sokoban"
        ],
      "id": "classic-fans-glue",
      "label": "classic_fans_glue",
      "key": "classic_fans_glue",
      "file": "classic_fans_glue.preset.js"
    },
    {
      "gameTypes": [
        "Sokoban"
        ],
      "id": "ice-test",
      "label": "ice_test",
      "key": "ice_test",
      "file": "ice_test.preset.js"
    },
    {
      "gameTypes": [
        "Sokoban"
        ],
      "id": "energy-test",
      "label": "energy_test",
      "key": "energy_test",
      "file": "energy_test.preset.js"
    },
    ]
  };
});
