// Save this file as theorem_graph_presets/half_spin_symmetry_for_conormal_cycles_roadmap.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Half-Spin Symmetry for Conormal Cycles: Roadmap", key: "half_spin_symmetry_for_conormal_cycles_roadmap", file: "half_spin_symmetry_for_conormal_cycles_roadmap.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.half_spin_symmetry_for_conormal_cycles_roadmap = {
  "schemaVersion": 9,
  "title": "Half-Spin Symmetry for Conormal Cycles: Roadmap",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Half-Spin Symmetry for Conormal Cycles: Roadmap",
    "details": [
      {
        "id": "result",
        "label": "result",
        "type": "textbox",
        "text": "Roadmap of the verified disproof blueprint."
      }
    ],
    "setting": "",
    "condition": "",
    "result": "",
    "proofSketch": "",
    "citationKeys": [],
    "color": "#111827",
    "fillColor": "#ffffff"
  },
  "nodes": [
    {
      "id": "lem_schoen_family",
      "type": "misc",
      "label": "Schoen surface",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "checkbox",
          "text": "compute the hodge numbers of Schoen surfaces\nprove that the ambient abelian variety is of Weil type"
        },
        {
          "id": "setting",
          "label": "setting",
          "type": "textbox",
          "text": "A one-parameter Schoen surface family inside principally polarized abelian fourfolds."
        },
        {
          "id": "condition",
          "label": "condition",
          "type": "textbox",
          "text": "Choose a symmetric smoothing with conormal Gauss degree eight."
        },
        {
          "id": "result",
          "label": "result",
          "type": "textbox",
          "text": "The family gives the geometric stage for the half-spin construction and preserves the needed symmetry and non-degeneracy."
        },
        {
          "id": "proof-sketch",
          "label": "proof sketch",
          "type": "textbox",
          "text": "Use the explicit Schoen degeneration and the Albanese embedding to control the central fiber and the smoothing."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 185.4,
      "y": 218.9,
      "childGraph": {
        "title": "Schoen surface",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 560,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 1.7143
        }
      }
    },
    {
      "id": "lem_wd4_monodromy",
      "type": "lemma",
      "label": "$W(D_4)$-monodromy",
      "setting": "The general Gauss fiber is written as four signed pairs.",
      "condition": "The quartic resolvent and local branch behavior are computed for the Schoen family.",
      "result": "The exact monodromy is the even signed Weyl group W(D_4).",
      "proofSketch": "Irreducibility plus nonsquare discriminant gives S_4 on pairs, and local A_1 monodromy supplies the even sign changes.",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 383.1,
      "y": 95.8
    },
    {
      "id": "lem_normalized_middle",
      "type": "lemma",
      "label": "normalized middle specialization",
      "setting": "A finite base change labels the signed Gauss fibers and forms the half-spin sums.",
      "condition": "Specialize the two half-spin conormal cycles along the Schoen degeneration.",
      "result": "The middle Segre difference specializes to an explicit class on J x J.",
      "proofSketch": "Normalize the finite incidence correspondence, confine excess terms, then determine the three multiplicities.",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 223,
      "y": 305.9
    },
    {
      "id": "lem_nonzero_middle",
      "type": "lemma",
      "label": "different homology class",
      "setting": "The normalized specialization gives a concrete codimension-two difference class.",
      "condition": "Restrict and integrate the class against the natural theta data.",
      "result": "The middle Segre difference is nonzero.",
      "proofSketch": "The class restricts to theta squared over two on the diagonal slice, yielding a nonzero intersection number.",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 497.1,
      "y": 315
    },
    {
      "id": "thm_counterexample",
      "type": "theorem",
      "label": "counterexample",
      "setting": "A very general member of the constructed family satisfies the conjecture hypotheses.",
      "condition": "Use the half-spin cycles for the W(D_4) conormal Gauss cover.",
      "result": "The conjecture is disproved: the two projectivized Lagrangian cycles need not have the same homology class.",
      "proofSketch": "Combine the family, monodromy, specialization, and nonzero middle Segre difference; equality would specialize to zero, contradiction.",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 570.1,
      "y": 201.6
    }
  ],
  "arrows": [
    {
      "id": "arr_family_to_monodromy",
      "sourceId": "lem_schoen_family",
      "targetId": "lem_wd4_monodromy",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#475569"
    },
    {
      "id": "arr_family_to_specialization",
      "sourceId": "lem_schoen_family",
      "targetId": "lem_normalized_middle",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#475569"
    },
    {
      "id": "arr_specialization_to_nonzero",
      "sourceId": "lem_normalized_middle",
      "targetId": "lem_nonzero_middle",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#475569"
    },
    {
      "id": "arr_nonzero_to_counterexample",
      "sourceId": "lem_nonzero_middle",
      "targetId": "thm_counterexample",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 0,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#475569"
    },
    {
      "id": "a1",
      "sourceId": "lem_wd4_monodromy",
      "targetId": "thm_counterexample",
      "label": "",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": 15,
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#5f574e"
    }
  ],
  "view": {
    "viewExtra": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "nodeSerial": 6,
    "arrowSerial": 9,
    "selectedId": "lem_schoen_family",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 369,
    "canvasRatioLocked": false,
    "canvasAspectRatio": 1.8,
    "selectedReferenceKeys": []
  },
  "references": [
    {
      "key": "mo1",
      "author": "",
      "title": "Simple singularities algorithm?",
      "year": "",
      "citeKey": "simple sing",
      "url": "https://mathoverflow.net/questions/185692/how-can-one-determine-if-a-singularity-is-simple",
      "source": "mathoverflow",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://mathoverflow.net/questions/185692/how-can-one-determine-if-a-singularity-is-simple",
          "source": "mathoverflow",
          "label": ""
        }
      ]
    },
    {
      "key": "RRS2016",
      "author": "Rito--Roulleau--Sarti",
      "title": "Explicit Schoen surfaces",
      "year": "2016",
      "citeKey": "RRS2016",
      "url": "https://arxiv.org/abs/1609.02235",
      "source": "web",
      "rawBibtex": "@misc{RRS2016, title={Explicit Schoen surfaces}, author={Rito and Roulleau and Sarti}, year={2016}, eprint={1609.02235}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1609.02235",
          "source": "web",
          "label": "arXiv:1609.02235"
        }
      ]
    },
    {
      "key": "CMLR2013",
      "author": "Ciliberto--Mendes Lopes--Roulleau",
      "title": "On Schoen surfaces",
      "year": "2013",
      "citeKey": "CMLR2013",
      "url": "https://arxiv.org/abs/1303.1750",
      "source": "web",
      "rawBibtex": "@misc{CMLR2013, title={On Schoen surfaces}, author={Ciliberto and Mendes Lopes and Roulleau}, year={2013}, eprint={1303.1750}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1303.1750",
          "source": "web",
          "label": "arXiv:1303.1750"
        }
      ]
    },
    {
      "key": "CK2020",
      "author": "Codogni--Kramer",
      "title": "Semicontinuity of Gauss maps and the Schottky problem",
      "year": "2020",
      "citeKey": "CK2020",
      "url": "https://arxiv.org/abs/2010.00053",
      "source": "web",
      "rawBibtex": "@misc{CK2020, title={Semicontinuity of Gauss maps and the Schottky problem}, author={Codogni and Kramer}, year={2020}, eprint={2010.00053}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2010.00053",
          "source": "web",
          "label": "arXiv:2010.00053"
        }
      ]
    },
    {
      "key": "vG2021",
      "author": "van Geemen",
      "title": "Weil Classes and Decomposable Abelian Fourfolds",
      "year": "2021",
      "citeKey": "vG2021",
      "url": "https://arxiv.org/abs/2108.02087",
      "source": "web",
      "rawBibtex": "@misc{vG2021, title={Weil Classes and Decomposable Abelian Fourfolds}, author={van Geemen}, year={2021}, eprint={2108.02087}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2108.02087",
          "source": "web",
          "label": "arXiv:2108.02087"
        }
      ]
    }
  ]
};