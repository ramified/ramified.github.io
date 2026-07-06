// Save this file as theorem_graph_presets/corrections_wait.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Corrections wait", key: "corrections_wait", file: "corrections_wait.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.corrections_wait = {
  "schemaVersion": 4,
  "title": "Corrections wait",
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
      "x": 379.7,
      "y": 155.8
    },
    {
      "id": "n11",
      "type": "example",
      "label": "hidden sheaves",
      "setting": "Sometimes relative tangent/cotangent sheaves are easier than the other ones; then there is no need to construct hidden sheaves.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 551.6,
      "y": 46
    },
    {
      "id": "n13",
      "type": "example",
      "label": "Theorem Graph Calculator",
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 396.4,
      "y": 293.3
    },
    {
      "id": "n25",
      "type": "example",
      "label": "hypersurface",
      "setting": "add the normal sheaf identification rule for the hypersurface.",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 360.5,
      "y": 46
    },
    {
      "id": "n37",
      "type": "misc",
      "label": "complex calculator",
      "details": [
        {
          "id": "tasks",
          "label": "tasks",
          "type": "list",
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
      "x": 164.9,
      "y": 46
    },
    {
      "id": "n38",
      "type": "misc",
      "label": "tiny fixes",
      "details": [
        {
          "id": "bugs",
          "label": "bugs",
          "type": "list",
          "text": "add a warning when user try to delete the page: do you save?\ndefault preset(shown on the internet when I open the page) should be Corrections wait(do you have better name for that? This records the website maintenance I have fixed/still remains to be fixed)"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 143.4,
      "y": 374
    },
    {
      "id": "n39",
      "type": "misc",
      "label": "category calculator",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "list",
          "text": "Similar to Sheaf Calculator, I need to make a calculator with category and functors\nThe main terms are \"Ob(C)\" and morphisms, user can assign a typical symbol for objects in this category\nUser can pick opposite category, and set functors to be covariant/contravariant\nAdd natural transformation\nAdd a large presets of categories and functors"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 473.2,
      "y": 344.6
    },
    {
      "id": "n40",
      "type": "misc",
      "label": "double scripts",
      "details": [
        {
          "id": "code",
          "label": "code",
          "type": "textbox",
          "text": "{\n  \"schema\": \"sheaf-calculator-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-06T12:45:48.269Z\",\n  \"active\": {\n    \"mode\": \"modify\",\n    \"kind\": \"sheaf\",\n    \"varietyId\": \"X7\",\n    \"sheafId\": \"E12\"\n  },\n  \"options\": {\n    \"repeatNames\": true,\n    \"repeatStyle\": \"letters\",\n    \"classBasis\": \"chern\",\n    \"rootForm\": \"product\",\n    \"classTermIndex\": 1,\n    \"classFamilies\": [\n      \"chern\",\n      \"character\"\n    ],\n    \"hodgeCellSize\": 20,\n    \"homologyRulePasses\": 1,\n    \"homologyMapInputMode\": \"coefficients\",\n    \"homologyExpressionTransposed\": true,\n    \"exportScope\": \"saved-step-formulas\"\n  },\n  \"objects\": {\n    \"numbers\": [\n      {\n        \"id\": \"auto-g\",\n        \"type\": \"rational-number\",\n        \"name\": \"g\",\n        \"value\": \"0\",\n        \"positive\": true,\n        \"auto\": true,\n        \"sources\": [\n          {\n            \"kind\": \"variety\",\n            \"id\": \"X1\",\n            \"field\": \"genus\"\n          },\n          {\n            \"kind\": \"variety\",\n            \"id\": \"curve\",\n            \"field\": \"genus\"\n          }\n        ]\n      }\n    ],\n    \"varieties\": [\n      {\n        \"id\": \"X1\",\n        \"type\": \"curve\",\n        \"dim\": \"1\",\n        \"name\": \"C\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"1\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.22,\n        \"labelY\": 0.6\n      },\n      {\n        \"id\": \"X3\",\n        \"type\": \"abstract\",\n        \"dim\": \"2\",\n        \"name\": \"X\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"2\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.36864864864864866,\n        \"labelY\": 0.6\n      },\n      {\n        \"id\": \"X7\",\n        \"type\": \"point\",\n        \"dim\": \"0\",\n        \"name\": \"\\\\{*\\\\}\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"0\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          },\n          \"rules\": [\n            {\n              \"id\": \"point-class-unit\",\n              \"builtin\": true,\n              \"enabled\": true,\n              \"lhs\": {\n                \"powers\": {\n                  \"homology_v_X7_point\": 1\n                }\n              },\n              \"rhs\": [\n                {\n                  \"coefficient\": \"1\"\n                }\n              ]\n            }\n          ]\n        },\n        \"labelX\": 0.47394953547297297,\n        \"labelY\": 0.9091517857142857,\n        \"labelPositionDirty\": true\n      }\n    ],\n    \"sheaves\": [\n      {\n        \"id\": \"E5\",\n        \"type\": \"canonical\",\n        \"name\": \"K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X3\",\n        \"basis\": \"chern\",\n        \"labelX\": 0.3986486486486487,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E6\",\n        \"type\": \"abstract\",\n        \"name\": \"f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X1\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pullback\",\n          \"mapId\": \"M4\",\n          \"sheafId\": \"E5\",\n          \"exact\": true,\n          \"defaultName\": \"f^{*}K_{X}\"\n        },\n        \"labelX\": 0.25,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E9\",\n        \"type\": \"abstract\",\n        \"name\": \"g_{*}f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X7\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M8\",\n          \"sheafId\": \"E6\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"g_{*}f^{*}K_{X}\"\n        },\n        \"labelX\": 0.26402027027027025,\n        \"labelY\": 0.8957589285714286,\n        \"labelPositionDirty\": true\n      },\n      {\n        \"id\": \"E11\",\n        \"type\": \"abstract\",\n        \"name\": \"f_{*}f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X3\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M4\",\n          \"sheafId\": \"E6\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"f_{*}f^{*}K_{X}\"\n        },\n        \"labelX\": 0.5056756756756757,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E12\",\n        \"type\": \"abstract\",\n        \"name\": \"E\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X7\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M10\",\n          \"sheafId\": \"E11\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"h_{*}f_{*}f^{*}K_{X}\"\n        },\n        \"nameDirty\": true,\n        \"labelX\": 0.5039495354729729,\n        \"labelY\": 0.7091517857142857\n      }\n    ],\n    \"maps\": [\n      {\n        \"id\": \"M4\",\n        \"name\": \"f\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X1\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X3\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"modified\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -17.546875,\n        \"labelT\": 0.4583333333333334\n      },\n      {\n        \"id\": \"M8\",\n        \"name\": \"g\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X1\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X7\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"nameDirty\": true,\n        \"modified\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": 17.781136711537293,\n        \"labelT\": 0.14583333333333315\n      },\n      {\n        \"id\": \"M10\",\n        \"name\": \"h\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X3\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X7\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"nameDirty\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -18,\n        \"labelT\": 0.5\n      }\n    ]\n  },\n  \"step\": {\n    \"savedRules\": [\n      {\n        \"id\": \"step-saved-rt0kug\",\n        \"kind\": \"rewrite\",\n        \"family\": \"formula\",\n        \"target\": \"formula\",\n        \"degree\": 0,\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"labelLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n        \"labelPlain\": \"ch_0(g_*f^*K_X)\",\n        \"lhsLatex\": \"sheaf_E9_ch0\",\n        \"rhsLatex\": \"-g + 1 - map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\",\n        \"lhsPlain\": \"sheaf_E9_ch0\",\n        \"rhsPlain\": \"-g + 1 - map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\",\n        \"displayLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})=-g + 1 - map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\",\n        \"displayPlain\": \"ch_0(g_*f^*K_X)=-g + 1 - map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\",\n        \"formulaTokens\": [\n          {\n            \"type\": \"atom\",\n            \"atomKind\": \"sheaf-class\",\n            \"geometryId\": \"X7\",\n            \"sheafId\": \"E9\",\n            \"family\": \"character\",\n            \"degree\": 0,\n            \"polyData\": [\n              [\n                \"sheaf_E9_ch0:1\",\n                \"1\"\n              ]\n            ],\n            \"latex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n            \"plain\": \"ch_0(g_*f^*K_X)\"\n          }\n        ],\n        \"formulaSignature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n        \"lhs\": {\n          \"powers\": {\n            \"sheaf_E9_ch0\": 1\n          }\n        },\n        \"rhs\": [\n          {\n            \"coefficient\": \"-1\",\n            \"powers\": {\n              \"curveGenus\": 1\n            }\n          },\n          {\n            \"coefficient\": \"1\"\n          },\n          {\n            \"coefficient\": \"-1\",\n            \"powers\": {\n              \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\": 1\n            }\n          }\n        ],\n        \"variableIds\": [\n          \"sheaf_E9_ch0\",\n          \"curveGenus\",\n          \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1\"\n        ],\n        \"sourceLabel\": \"\"\n      }\n    ],\n    \"formulaEditorOpen\": true,\n    \"formulaBuilder\": {\n      \"varietyId\": \"X7\",\n      \"tokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-class\",\n          \"geometryId\": \"X7\",\n          \"sheafId\": \"E9\",\n          \"family\": \"character\",\n          \"degree\": 0,\n          \"polyData\": [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"plain\": \"ch_0(g_*f^*K_X)\"\n        }\n      ],\n      \"mode\": \"builder\",\n      \"classFamily\": \"character\",\n      \"classDegree\": \"0\",\n      \"classSheafId\": \"E9\",\n      \"cursorIndex\": 1,\n      \"insertMode\": \"insert\",\n      \"nextSlotId\": 1,\n      \"editingSavedFormulaId\": \"step-saved-rt0kug\",\n      \"message\": \"Saved formula loaded for editing.\"\n    },\n    \"activeSession\": {\n      \"formulaSession\": true,\n      \"stopped\": true,\n      \"family\": \"formula\",\n      \"target\": \"formula\",\n      \"index\": 0,\n      \"layout\": \"wide\",\n      \"dimension\": 0,\n      \"geometryId\": \"X7\",\n      \"bundleLabelLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n      \"bundleLabelPlain\": \"ch_0(g_*f^*K_X)\",\n      \"rankLatex\": \"0\",\n      \"rankPlain\": \"0\",\n      \"components\": [\n        [\n          [\n            \"curveGenus:1\",\n            \"-1\"\n          ],\n          [\n            \"\",\n            \"1\"\n          ],\n          [\n            \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n            \"-1\"\n          ]\n        ]\n      ],\n      \"originalComponents\": [\n        [\n          [\n            \"sheaf_E9_ch0:1\",\n            \"1\"\n          ]\n        ]\n      ],\n      \"formulaPoly\": [\n        [\n          \"curveGenus:1\",\n          \"-1\"\n        ],\n        [\n          \"\",\n          \"1\"\n        ],\n        [\n          \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n          \"-1\"\n        ]\n      ],\n      \"originalFormulaPoly\": [\n        [\n          \"sheaf_E9_ch0:1\",\n          \"1\"\n        ]\n      ],\n      \"formulaLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n      \"formulaPlain\": \"ch_0(g_*f^*K_X)\",\n      \"formulaTokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-class\",\n          \"geometryId\": \"X7\",\n          \"sheafId\": \"E9\",\n          \"family\": \"character\",\n          \"degree\": 0,\n          \"polyData\": [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"plain\": \"ch_0(g_*f^*K_X)\"\n        }\n      ],\n      \"sourceSignature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n      \"stepHistory\": [\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"value\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"reason\": \"start\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E9_ch0:1\",\n                  \"1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E9_ch0:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n            \"formulaPlain\": \"ch_0(g_*f^*K_X)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"value\": \"g_{*}\\\\left(\\\\operatorname{td}_{1}(C)\\\\right)\\\\,r(f^{*}K_{X}) + g_{*}\\\\left(\\\\operatorname{ch}_{1}(f^{*}K_{X})\\\\right)\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"map_pushforward_M8_class_step_td_v_X1_1:1|sheaf_E6_ch0:1\",\n                  \"1\"\n                ],\n                [\n                  \"map_pushforward_M8_sheaf_E6_ch1:1\",\n                  \"1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"map_pushforward_M8_class_step_td_v_X1_1:1|sheaf_E6_ch0:1\",\n                \"1\"\n              ],\n              [\n                \"map_pushforward_M8_sheaf_E6_ch1:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n            \"formulaPlain\": \"ch_0(g_*f^*K_X)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"value\": \"\\\\frac{1}{2}\\\\,g_{*}\\\\left(c_{1}(C)\\\\right) - g_{*}\\\\left(f^{*}\\\\left(c_{1}(X)\\\\right)\\\\right)\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"map_pushforward_M8_homology_v_X1_tangent_chern_1:1\",\n                  \"1/2\"\n                ],\n                [\n                  \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n                  \"-1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"map_pushforward_M8_homology_v_X1_tangent_chern_1:1\",\n                \"1/2\"\n              ],\n              [\n                \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n                \"-1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n            \"formulaPlain\": \"ch_0(g_*f^*K_X)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n          \"value\": \"-g - g_{*}\\\\left(f^{*}\\\\left(c_{1}(X)\\\\right)\\\\right) + 1\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"curveGenus:1\",\n                  \"-1\"\n                ],\n                [\n                  \"\",\n                  \"1\"\n                ],\n                [\n                  \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n                  \"-1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"curveGenus:1\",\n                \"-1\"\n              ],\n              [\n                \"\",\n                \"1\"\n              ],\n              [\n                \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n                \"-1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\",\n            \"formulaPlain\": \"ch_0(g_*f^*K_X)\"\n          }\n        }\n      ],\n      \"message\": \"Step result is kept for this formula chart.\"\n    },\n    \"cache\": [\n      {\n        \"signature\": \"formula::X1::X1::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X1\\\",\\\"sheafId\\\":\\\"E6\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E6_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 1,\n        \"geometryId\": \"X1\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"curveGenus:1\",\n              \"-1\"\n            ],\n            [\n              \"\",\n              \"1\"\n            ],\n            [\n              \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n              \"-1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      }\n    ]\n  },\n  \"nextObjectIndex\": 13\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 598.7,
      "y": 374
    },
    {
      "id": "n41",
      "type": "misc",
      "label": "no rule for f_*([p])=[p]",
      "details": [
        {
          "id": "code",
          "label": "code",
          "type": "textbox",
          "text": "{\n  \"schema\": \"sheaf-calculator-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-06T12:48:28.497Z\",\n  \"active\": {\n    \"mode\": \"modify\",\n    \"kind\": \"map\",\n    \"varietyId\": \"X7\",\n    \"mapId\": \"M4\"\n  },\n  \"options\": {\n    \"repeatNames\": true,\n    \"repeatStyle\": \"letters\",\n    \"classBasis\": \"chern\",\n    \"rootForm\": \"product\",\n    \"classTermIndex\": 1,\n    \"classFamilies\": [\n      \"chern\",\n      \"character\"\n    ],\n    \"hodgeCellSize\": 20,\n    \"homologyRulePasses\": 1,\n    \"homologyMapInputMode\": \"coefficients\",\n    \"homologyExpressionTransposed\": true,\n    \"exportScope\": \"saved-step-formulas\"\n  },\n  \"objects\": {\n    \"numbers\": [\n      {\n        \"id\": \"auto-g\",\n        \"type\": \"rational-number\",\n        \"name\": \"g\",\n        \"value\": \"0\",\n        \"positive\": true,\n        \"auto\": true,\n        \"sources\": [\n          {\n            \"kind\": \"variety\",\n            \"id\": \"X1\",\n            \"field\": \"genus\"\n          },\n          {\n            \"kind\": \"variety\",\n            \"id\": \"curve\",\n            \"field\": \"genus\"\n          }\n        ]\n      }\n    ],\n    \"varieties\": [\n      {\n        \"id\": \"X1\",\n        \"type\": \"curve\",\n        \"dim\": \"1\",\n        \"name\": \"C\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"1\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.22,\n        \"labelY\": 0.6\n      },\n      {\n        \"id\": \"X3\",\n        \"type\": \"abstract\",\n        \"dim\": \"2\",\n        \"name\": \"X\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"2\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.36864864864864866,\n        \"labelY\": 0.6\n      },\n      {\n        \"id\": \"X7\",\n        \"type\": \"point\",\n        \"dim\": \"0\",\n        \"name\": \"\\\\{*\\\\}\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"0\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          },\n          \"rules\": [\n            {\n              \"id\": \"point-class-unit\",\n              \"builtin\": true,\n              \"enabled\": true,\n              \"lhs\": {\n                \"powers\": {\n                  \"homology_v_X7_point\": 1\n                }\n              },\n              \"rhs\": [\n                {\n                  \"coefficient\": \"1\"\n                }\n              ]\n            }\n          ]\n        },\n        \"labelX\": 0.47394953547297297,\n        \"labelY\": 0.9091517857142857,\n        \"labelPositionDirty\": true\n      }\n    ],\n    \"sheaves\": [\n      {\n        \"id\": \"E5\",\n        \"type\": \"canonical\",\n        \"name\": \"K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X3\",\n        \"basis\": \"chern\",\n        \"labelX\": 0.3986486486486487,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E6\",\n        \"type\": \"abstract\",\n        \"name\": \"f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X1\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pullback\",\n          \"mapId\": \"M4\",\n          \"sheafId\": \"E5\",\n          \"exact\": true,\n          \"defaultName\": \"f^{*}K_{X}\"\n        },\n        \"labelX\": 0.25,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E9\",\n        \"type\": \"abstract\",\n        \"name\": \"g_{*}f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X7\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M8\",\n          \"sheafId\": \"E6\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"g_{*}f^{*}K_{X}\"\n        },\n        \"labelX\": 0.26402027027027025,\n        \"labelY\": 0.8957589285714286,\n        \"labelPositionDirty\": true\n      },\n      {\n        \"id\": \"E11\",\n        \"type\": \"abstract\",\n        \"name\": \"f_{*}f^{*}K_{X}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X3\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M4\",\n          \"sheafId\": \"E6\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"f_{*}f^{*}K_{X}\"\n        },\n        \"labelX\": 0.5056756756756757,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E12\",\n        \"type\": \"abstract\",\n        \"name\": \"E\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X7\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M10\",\n          \"sheafId\": \"E11\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"h_{*}f_{*}f^{*}K_{X}\"\n        },\n        \"nameDirty\": true,\n        \"labelX\": 0.5039495354729729,\n        \"labelY\": 0.7091517857142857\n      }\n    ],\n    \"maps\": [\n      {\n        \"id\": \"M4\",\n        \"name\": \"f\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X1\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X3\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"modified\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -17.61328125,\n        \"labelT\": 0.4583333333333334\n      },\n      {\n        \"id\": \"M8\",\n        \"name\": \"g\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X1\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X7\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"nameDirty\": true,\n        \"modified\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": 17.781136711537293,\n        \"labelT\": 0.14583333333333315\n      },\n      {\n        \"id\": \"M10\",\n        \"name\": \"h\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X3\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X7\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"nameDirty\": true,\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -18,\n        \"labelT\": 0.5\n      }\n    ]\n  },\n  \"step\": {\n    \"formulaBuilder\": {\n      \"varietyId\": \"X7\",\n      \"tokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-class\",\n          \"geometryId\": \"X7\",\n          \"sheafId\": \"E12\",\n          \"family\": \"character\",\n          \"degree\": 0,\n          \"polyData\": [\n            [\n              \"sheaf_E12_ch0:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}_{0}(E)\",\n          \"plain\": \"ch_0(E)\"\n        }\n      ],\n      \"mode\": \"stepping\",\n      \"classFamily\": \"character\",\n      \"classDegree\": \"0\",\n      \"classSheafId\": \"E12\",\n      \"cursorIndex\": 1,\n      \"insertMode\": \"insert\",\n      \"nextSlotId\": 1,\n      \"message\": \"Step-by-step session started.\"\n    },\n    \"activeSession\": {\n      \"formulaSession\": true,\n      \"family\": \"formula\",\n      \"target\": \"formula\",\n      \"index\": 0,\n      \"layout\": \"wide\",\n      \"dimension\": 0,\n      \"geometryId\": \"X7\",\n      \"bundleLabelLatex\": \"\\\\operatorname{ch}_{0}(E)\",\n      \"bundleLabelPlain\": \"ch_0(E)\",\n      \"rankLatex\": \"0\",\n      \"rankPlain\": \"0\",\n      \"components\": [\n        [\n          [\n            \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n            \"1\"\n          ]\n        ]\n      ],\n      \"originalComponents\": [\n        [\n          [\n            \"sheaf_E12_ch0:1\",\n            \"1\"\n          ]\n        ]\n      ],\n      \"formulaPoly\": [\n        [\n          \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n          \"1\"\n        ]\n      ],\n      \"originalFormulaPoly\": [\n        [\n          \"sheaf_E12_ch0:1\",\n          \"1\"\n        ]\n      ],\n      \"formulaLatex\": \"\\\\operatorname{ch}_{0}(E)\",\n      \"formulaPlain\": \"ch_0(E)\",\n      \"formulaTokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-class\",\n          \"geometryId\": \"X7\",\n          \"sheafId\": \"E12\",\n          \"family\": \"character\",\n          \"degree\": 0,\n          \"polyData\": [\n            [\n              \"sheaf_E12_ch0:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}_{0}(E)\",\n          \"plain\": \"ch_0(E)\"\n        }\n      ],\n      \"sourceSignature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E12\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E12_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(E)\\\",\\\"plain\\\":\\\"ch_0(E)\\\",\\\"title\\\":\\\"ch_0 of E\\\"}]\",\n      \"stepHistory\": [\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(E)\",\n          \"value\": \"\\\\operatorname{ch}_{0}(E)\",\n          \"reason\": \"start\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E12_ch0:1\",\n                  \"1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E12_ch0:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(E)\",\n            \"formulaPlain\": \"ch_0(E)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}_{0}(E)\",\n          \"value\": \"-g\\\\,h_{*}\\\\left(f_{*}\\\\left([p]\\\\right)\\\\right) + h_{*}\\\\left(f_{*}\\\\left([p]\\\\right)\\\\right) - h_{*}\\\\left(c_{1}(X)\\\\,f_{*}\\\\left(1\\\\right)\\\\right)\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n                  \"1\"\n                ]\n              ]\n            ],\n            \"formulaPoly\": [\n              [\n                \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}_{0}(E)\",\n            \"formulaPlain\": \"ch_0(E)\"\n          }\n        }\n      ],\n      \"message\": \"Selected rules made no change.\"\n    },\n    \"cache\": [\n      {\n        \"signature\": \"formula::X1::X1::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X1\\\",\\\"sheafId\\\":\\\"E6\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E6_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 1,\n        \"geometryId\": \"X1\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"curveGenus:1\",\n              \"-1\"\n            ],\n            [\n              \"\",\n              \"1\"\n            ],\n            [\n              \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n              \"-1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"variableId\\\":null,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E12\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E12_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(E)\\\",\\\"plain\\\":\\\"ch_0(E)\\\",\\\"title\\\":\\\"ch_0 of E\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E12_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      }\n    ]\n  },\n  \"nextObjectIndex\": 13\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 571.3,
      "y": 240
    },
    {
      "id": "n42",
      "type": "misc",
      "label": "SES",
      "details": [
        {
          "id": "priority",
          "label": "priority",
          "type": "textbox",
          "text": "SES can assign the sheaf whose homology classes are computed by other two"
        },
        {
          "id": "new-rules",
          "label": "new rules",
          "type": "list",
          "text": "For hypersurface\nideal sheaf can be written as O_X(-D)\nnormal sheaf/conormal sheaf"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 134.4,
      "y": 192.4
    },
    {
      "id": "n43",
      "type": "misc",
      "label": "no add/identification",
      "details": [
        {
          "id": "code",
          "label": "code",
          "type": "textbox",
          "text": "{\n  \"schema\": \"sheaf-calculator-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-06T13:25:36.796Z\",\n  \"active\": {\n    \"mode\": \"create\",\n    \"kind\": \"sheaf\",\n    \"varietyId\": \"X13\",\n    \"sheafId\": \"E16\"\n  },\n  \"options\": {\n    \"repeatNames\": true,\n    \"repeatStyle\": \"letters\",\n    \"classBasis\": \"chern\",\n    \"rootForm\": \"product\",\n    \"classTermIndex\": 1,\n    \"classFamilies\": [\n      \"chern\",\n      \"character\"\n    ],\n    \"hodgeCellSize\": 20,\n    \"homologyRulePasses\": 1,\n    \"homologyMapInputMode\": \"coefficients\",\n    \"homologyExpressionTransposed\": true,\n    \"exportScope\": \"main\"\n  },\n  \"objects\": {\n    \"varieties\": [\n      {\n        \"id\": \"X13\",\n        \"type\": \"curve\",\n        \"dim\": \"1\",\n        \"name\": \"C\",\n        \"genus\": \"0\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"1\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.21920924831081082,\n        \"labelY\": 0.5991629464285714,\n        \"labelPositionDirty\": true\n      },\n      {\n        \"id\": \"X14\",\n        \"type\": \"abstract\",\n        \"dim\": \"3\",\n        \"name\": \"Y\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"3\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"nameDirty\": true,\n        \"labelX\": 0.36864864864864866,\n        \"labelY\": 0.6\n      }\n    ],\n    \"sheaves\": [\n      {\n        \"id\": \"E16\",\n        \"type\": \"structure\",\n        \"name\": \"\\\\mathcal{O}_{C}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X13\",\n        \"basis\": \"chern\",\n        \"labelX\": 0.24920924831081082,\n        \"labelY\": 0.39916294642857136\n      }\n    ],\n    \"maps\": [\n      {\n        \"id\": \"M15\",\n        \"name\": \"f\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X13\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X14\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -18,\n        \"labelT\": 0.5\n      }\n    ]\n  },\n  \"step\": {\n    \"cache\": [\n      {\n        \"signature\": \"formula::X1::X1::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X1\\\",\\\"sheafId\\\":\\\"E6\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E6_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 1,\n        \"geometryId\": \"X1\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"curveGenus:1\",\n              \"-1\"\n            ],\n            [\n              \"\",\n              \"1\"\n            ],\n            [\n              \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n              \"-1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"variableId\\\":null,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E12\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E12_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(E)\\\",\\\"plain\\\":\\\"ch_0(E)\\\",\\\"title\\\":\\\"ch_0 of E\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E12_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      }\n    ]\n  },\n  \"nextObjectIndex\": 17\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 622,
      "y": 130.8
    },
    {
      "id": "n44",
      "type": "misc",
      "label": "bug",
      "details": [
        {
          "id": "code",
          "label": "code",
          "type": "textbox",
          "text": "{\n  \"schema\": \"sheaf-calculator-preset\",\n  \"version\": 1,\n  \"exportedAt\": \"2026-07-06T13:29:16.786Z\",\n  \"active\": {\n    \"mode\": \"modify\",\n    \"kind\": \"sheaf\",\n    \"varietyId\": \"X13\",\n    \"sheafId\": \"E18\"\n  },\n  \"options\": {\n    \"repeatNames\": true,\n    \"repeatStyle\": \"letters\",\n    \"classBasis\": \"chern\",\n    \"rootForm\": \"product\",\n    \"classTermIndex\": 1,\n    \"classFamilies\": [\n      \"chern\",\n      \"character\"\n    ],\n    \"hodgeCellSize\": 20,\n    \"revealedCharts\": {\n      \"classes\": true\n    },\n    \"homologyRulePasses\": 1,\n    \"homologyMapInputMode\": \"coefficients\",\n    \"homologyExpressionTransposed\": true,\n    \"exportScope\": \"saved-step-formulas\"\n  },\n  \"objects\": {\n    \"varieties\": [\n      {\n        \"id\": \"X13\",\n        \"type\": \"curve\",\n        \"dim\": \"1\",\n        \"name\": \"C\",\n        \"genus\": \"0\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"1\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"labelX\": 0.21920924831081082,\n        \"labelY\": 0.5991629464285714,\n        \"labelPositionDirty\": true\n      },\n      {\n        \"id\": \"X14\",\n        \"type\": \"abstract\",\n        \"dim\": \"3\",\n        \"name\": \"Y\",\n        \"genus\": \"g\",\n        \"ppavGenus\": \"2\",\n        \"ciDegrees\": \"\",\n        \"ciAmbient\": \"3\",\n        \"symmetricProductM\": \"3\",\n        \"symmetricProductGenus\": \"g\",\n        \"grassmannianR\": \"2\",\n        \"grassmannianN\": \"4\",\n        \"homology\": {\n          \"classes\": {\n            \"unit\": {\n              \"symbol\": \"1\"\n            },\n            \"point\": {\n              \"symbol\": \"[p]\"\n            }\n          }\n        },\n        \"nameDirty\": true,\n        \"labelX\": 0.36864864864864866,\n        \"labelY\": 0.6\n      }\n    ],\n    \"sheaves\": [\n      {\n        \"id\": \"E16\",\n        \"type\": \"structure\",\n        \"name\": \"\\\\mathcal{O}_{C}\",\n        \"twist\": \"1\",\n        \"rank\": \"1\",\n        \"baseVarietyId\": \"X13\",\n        \"basis\": \"chern\",\n        \"labelX\": 0.24920924831081082,\n        \"labelY\": 0.39916294642857136\n      },\n      {\n        \"id\": \"E17\",\n        \"type\": \"abstract\",\n        \"name\": \"f_{*}\\\\mathcal{O}_{C}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X14\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pushforward\",\n          \"mapId\": \"M15\",\n          \"sheafId\": \"E16\",\n          \"exact\": true,\n          \"proper\": true,\n          \"defaultName\": \"f_{*}\\\\mathcal{O}_{C}\"\n        },\n        \"labelX\": 0.3986486486486487,\n        \"labelY\": 0.39999999999999997\n      },\n      {\n        \"id\": \"E18\",\n        \"type\": \"abstract\",\n        \"name\": \"\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C}\",\n        \"twist\": \"1\",\n        \"rank\": \"\",\n        \"baseVarietyId\": \"X13\",\n        \"basis\": \"chern\",\n        \"construction\": {\n          \"type\": \"pullback\",\n          \"mapId\": \"M15\",\n          \"sheafId\": \"E17\",\n          \"derived\": true,\n          \"defaultName\": \"\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C}\"\n        },\n        \"labelX\": 0.1269161739864865,\n        \"labelY\": 0.36830357142857145,\n        \"labelPositionDirty\": true\n      }\n    ],\n    \"maps\": [\n      {\n        \"id\": \"M15\",\n        \"name\": \"f\",\n        \"domainKind\": \"variety\",\n        \"domainId\": \"X13\",\n        \"codomainKind\": \"variety\",\n        \"codomainId\": \"X14\",\n        \"curve\": {\n          \"type\": \"straight\"\n        },\n        \"defaultBendPx\": 0,\n        \"labelOffset\": -18,\n        \"labelT\": 0.5\n      }\n    ]\n  },\n  \"step\": {\n    \"formulaBuilder\": {\n      \"varietyId\": \"X13\",\n      \"tokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-total\",\n          \"geometryId\": \"X13\",\n          \"sheafId\": \"E18\",\n          \"family\": \"character\",\n          \"polyData\": [\n            [\n              \"sheaf_E18_chTotal_X13:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"plain\": \"ch(mathbfLf^*f_*O_C)\"\n        }\n      ],\n      \"mode\": \"stepping\",\n      \"classFamily\": \"character\",\n      \"classDegree\": \"\",\n      \"classSheafId\": \"E18\",\n      \"cursorIndex\": 1,\n      \"insertMode\": \"insert\",\n      \"nextSlotId\": 1,\n      \"message\": \"Step-by-step session started.\"\n    },\n    \"activeSession\": {\n      \"formulaSession\": true,\n      \"family\": \"formula\",\n      \"target\": \"formula\",\n      \"index\": 0,\n      \"layout\": \"wide\",\n      \"dimension\": 1,\n      \"geometryId\": \"X13\",\n      \"bundleLabelLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n      \"bundleLabelPlain\": \"ch(mathbfLf^*f_*O_C)\",\n      \"rankLatex\": \"0\",\n      \"rankPlain\": \"0\",\n      \"components\": [\n        [\n          [\n            \"sheaf_E18_ch0:1\",\n            \"1\"\n          ]\n        ],\n        []\n      ],\n      \"originalComponents\": [\n        [\n          [\n            \"sheaf_E18_chTotal_X13:1\",\n            \"1\"\n          ]\n        ],\n        []\n      ],\n      \"formulaPoly\": [\n        [\n          \"sheaf_E18_ch0:1\",\n          \"1\"\n        ]\n      ],\n      \"originalFormulaPoly\": [\n        [\n          \"sheaf_E18_chTotal_X13:1\",\n          \"1\"\n        ]\n      ],\n      \"formulaLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n      \"formulaPlain\": \"ch(mathbfLf^*f_*O_C)\",\n      \"formulaTokens\": [\n        {\n          \"type\": \"atom\",\n          \"atomKind\": \"sheaf-total\",\n          \"geometryId\": \"X13\",\n          \"sheafId\": \"E18\",\n          \"family\": \"character\",\n          \"polyData\": [\n            [\n              \"sheaf_E18_chTotal_X13:1\",\n              \"1\"\n            ]\n          ],\n          \"latex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"plain\": \"ch(mathbfLf^*f_*O_C)\"\n        }\n      ],\n      \"sourceSignature\": \"formula::X13::X13::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-total\\\",\\\"geometryId\\\":\\\"X13\\\",\\\"sheafId\\\":\\\"E18\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":null,\\\"polyData\\\":[[\\\"sheaf_E18_chTotal_X13:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}(\\\\\\\\mathbf{L}f^{*}f_{*}\\\\\\\\mathcal{O}_{C})\\\",\\\"plain\\\":\\\"ch(mathbfLf^*f_*O_C)\\\",\\\"title\\\":\\\"ch of mathbfLf^*f_*O_C\\\"}]\",\n      \"stepHistory\": [\n        {\n          \"label\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"value\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"reason\": \"start\",\n          \"hidden\": true,\n          \"startPlaceholder\": true,\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E18_chTotal_X13:1\",\n                  \"1\"\n                ]\n              ],\n              []\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E18_chTotal_X13:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n            \"formulaPlain\": \"ch(mathbfLf^*f_*O_C)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"value\": \"\\\\operatorname{ch}_{0}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C}) + \\\\operatorname{ch}_{1}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E18_ch0:1\",\n                  \"1\"\n                ],\n                [\n                  \"sheaf_E18_ch1:1\",\n                  \"1\"\n                ]\n              ],\n              []\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E18_ch0:1\",\n                \"1\"\n              ],\n              [\n                \"sheaf_E18_ch1:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n            \"formulaPlain\": \"ch(mathbfLf^*f_*O_C)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"value\": \"\\\\operatorname{ch}_{0}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C}) + f^{*}\\\\left(\\\\operatorname{ch}_{1}(f_{*}\\\\mathcal{O}_{C})\\\\right)\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E18_ch0:1\",\n                  \"1\"\n                ],\n                [\n                  \"map_pullback_M15_sheaf_E17_ch1:1\",\n                  \"1\"\n                ]\n              ],\n              []\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E18_ch0:1\",\n                \"1\"\n              ],\n              [\n                \"map_pullback_M15_sheaf_E17_ch1:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n            \"formulaPlain\": \"ch(mathbfLf^*f_*O_C)\"\n          }\n        },\n        {\n          \"label\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"value\": \"\\\\operatorname{ch}_{0}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n          \"reason\": \"apply\",\n          \"snapshot\": {\n            \"components\": [\n              [\n                [\n                  \"sheaf_E18_ch0:1\",\n                  \"1\"\n                ]\n              ],\n              []\n            ],\n            \"formulaPoly\": [\n              [\n                \"sheaf_E18_ch0:1\",\n                \"1\"\n              ]\n            ],\n            \"formulaLatex\": \"\\\\operatorname{ch}(\\\\mathbf{L}f^{*}f_{*}\\\\mathcal{O}_{C})\",\n            \"formulaPlain\": \"ch(mathbfLf^*f_*O_C)\"\n          }\n        }\n      ],\n      \"message\": \"Selected rules made no change.\"\n    },\n    \"cache\": [\n      {\n        \"signature\": \"formula::X1::X1::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X1\\\",\\\"sheafId\\\":\\\"E6\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E6_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 1,\n        \"geometryId\": \"X1\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E6_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\",\\\"title\\\":\\\"ch_0 of g_*f^*K_X\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"curveGenus:1\",\n              \"-1\"\n            ],\n            [\n              \"\",\n              \"1\"\n            ],\n            [\n              \"map_pushforward_M8_map_pullback_M4_chern_v_X3_tangent_1:1\",\n              \"-1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E9\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"variableId\\\":null,\\\"polyData\\\":[[\\\"sheaf_E9_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(g_{*}f^{*}K_{X})\\\",\\\"plain\\\":\\\"ch_0(g_*f^*K_X)\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E9_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X7::X7::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-class\\\",\\\"geometryId\\\":\\\"X7\\\",\\\"sheafId\\\":\\\"E12\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":0,\\\"polyData\\\":[[\\\"sheaf_E12_ch0:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}_{0}(E)\\\",\\\"plain\\\":\\\"ch_0(E)\\\",\\\"title\\\":\\\"ch_0 of E\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 0,\n        \"geometryId\": \"X7\",\n        \"components\": [\n          [\n            [\n              \"rankghleftfleftprightrighthleftfleftprightrighthleftc1Xfleft1rightright:1\",\n              \"1\"\n            ]\n          ]\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E12_ch0:1\",\n              \"1\"\n            ]\n          ]\n        ]\n      },\n      {\n        \"signature\": \"formula::X13::X13::[{\\\"type\\\":\\\"atom\\\",\\\"atomKind\\\":\\\"sheaf-total\\\",\\\"geometryId\\\":\\\"X13\\\",\\\"sheafId\\\":\\\"E18\\\",\\\"family\\\":\\\"character\\\",\\\"degree\\\":null,\\\"polyData\\\":[[\\\"sheaf_E18_chTotal_X13:1\\\",\\\"1\\\"]],\\\"latex\\\":\\\"\\\\\\\\operatorname{ch}(\\\\\\\\mathbf{L}f^{*}f_{*}\\\\\\\\mathcal{O}_{C})\\\",\\\"plain\\\":\\\"ch(mathbfLf^*f_*O_C)\\\",\\\"title\\\":\\\"ch of mathbfLf^*f_*O_C\\\"}]\",\n        \"family\": \"formula\",\n        \"dimension\": 1,\n        \"geometryId\": \"X13\",\n        \"components\": [\n          [\n            [\n              \"sheaf_E18_ch0:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ],\n        \"originalComponents\": [\n          [\n            [\n              \"sheaf_E18_chTotal_X13:1\",\n              \"1\"\n            ]\n          ],\n          []\n        ]\n      }\n    ],\n    \"controls\": {\n      \"cacheDisabled\": true\n    }\n  },\n  \"nextObjectIndex\": 19\n}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 162.8,
      "y": 256.3
    },
    {
      "id": "n45",
      "type": "misc",
      "label": "genus 1 error",
      "details": [
        {
          "id": "email",
          "label": "email",
          "type": "textbox",
          "text": "Dear [Author Name],\n\nI hope you are doing well.\n\nI was looking at the calculator pages on your site, especially the step-by-step output in the Sheaf Calculator. I think I found a small mathematical issue in the curve polyvector/Hodge-number calculation.\n\nIn `sheaf_calculator.js`, the function `buildCurvePolyvectorParallelogram(geometry)` appears to set\n\n```js\nconst h0T = genus === 0 ? 3n : (genus === 1 ? 1n : 0n);\nconst h1T = genus === 0 ? 0n : BigInt(3 * genus - 3);\n```\n\nThis gives `h¹(T_C)=0` when `g=1`. But for a smooth genus-1 curve, the tangent bundle is trivial, `T_C ≅ O_C`, so we should have\n\n```text\nh⁰(T_C)=1,  h¹(T_C)=1.\n```\n\nEquivalently, Riemann–Roch gives `χ(T_C)=3−3g=0` for `g=1`; since `h⁰(T_C)=1`, it follows that `h¹(T_C)=1`.\n\nSo I think the line for `h1T` should special-case genus 1, for example:\n\n```js\nconst h1T = genus === 0 ? 0n : (genus === 1 ? 1n : BigInt(3 * genus - 3));\n```\n\nI also noticed that the symbolic version seems to display `h¹(T_C)=3g−3`. That formula is correct for smooth curves of genus `g ≥ 2`, but it should probably be made piecewise or explicitly restricted, since it gives the wrong value for `g=0` and `g=1`.\n\nA possible piecewise display would be:\n\n```text\ng = 0: h⁰(T_C)=3, h¹(T_C)=0\ng = 1: h⁰(T_C)=1, h¹(T_C)=1\ng ≥ 2: h⁰(T_C)=0, h¹(T_C)=3g−3\n```\n\nThank you very much for making these tools available. I hope this report is helpful.\n\nBest regards,\n[Your Name]"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 202.7,
      "y": 136.4
    }
  ],
  "arrows": [
    {
      "id": "a7",
      "sourceId": "n11",
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
      "id": "a20",
      "sourceId": "n11",
      "targetId": "n25",
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
      "id": "a29",
      "sourceId": "n38",
      "targetId": "n13",
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
      "id": "a30",
      "sourceId": "n40",
      "targetId": "n13",
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
      "id": "a32",
      "sourceId": "n42",
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
      "id": "a33",
      "sourceId": "n25",
      "targetId": "n37",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "twohead",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "color": "#5f574e"
    },
    {
      "id": "a34",
      "sourceId": "n41",
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
      "id": "a35",
      "sourceId": "n43",
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
      "id": "a36",
      "sourceId": "n44",
      "targetId": "n4",
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
      "id": "a38",
      "sourceId": "n45",
      "targetId": "n4",
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
    }
  ],
  "references": [
    {
      "key": "normal bundle",
      "author": "",
      "title": "normal bundle of hypersurface",
      "year": "",
      "citeText": "",
      "url": "https://chatgpt.com/share/6a43e9be-c214-83eb-95ad-5540eb27b907",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://chatgpt.com/share/6a43e9be-c214-83eb-95ad-5540eb27b907",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "typo search",
      "author": "",
      "title": "typo search",
      "year": "",
      "citeText": "",
      "url": "https://chatgpt.com/c/6a4bbb56-dd44-83eb-8b91-677b4c609d52",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://chatgpt.com/c/6a4bbb56-dd44-83eb-8b91-677b4c609d52",
          "source": "web",
          "label": ""
        }
      ]
    }
  ],
  "view": {
    "selectedId": "",
    "selectedReferenceKeys": [],
    "layoutRunning": false
  }
};