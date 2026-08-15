// Save this file as theorem_graph_presets/half_spin_symmetry_for_conormal_cycles.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Half-Spin Symmetry for Conormal Cycles", key: "half_spin_symmetry_for_conormal_cycles", file: "half_spin_symmetry_for_conormal_cycles.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.half_spin_symmetry_for_conormal_cycles = {
  "schemaVersion": 9,
  "title": "Half-Spin Symmetry for Conormal Cycles",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Half-Spin Symmetry for Conormal Cycles",
    "details": [
      {
        "id": "result",
        "label": "result",
        "type": "textbox",
        "text": "Roadmap of the verified disproof blueprint.\n\\cite{AIexplains}"
      }
    ],
    "setting": "",
    "condition": "",
    "result": "",
    "proofSketch": "",
    "citationKeys": [
      "AIexplains"
    ],
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
          "text": "- [x] compute the hodge numbers of Schoen surfaces\\cite[Proposition 2.1]{CMLR15}\nprove that $V$ is smoothable\\cite[Theorem 2.2]{CMLR15}, actually \\cite{Schoen07}\n- [ ] prove that the ambient abelian variety is of Weil type\nprove that Schoen surfaces are Albanese exotic (I guess of Weil type)\\cite[Proof of Prop 2.4]{CMLR15}, actually \\cite[Theorem 1.1, (iii)]{Schoen07}"
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
      "citationKeys": [
        "CMLR15",
        "Schoen07"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 171.2,
      "y": 78.9,
      "childGraph": {
        "title": "Schoen surface",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "Castelnuovo–de Franchis inequality",
            "details": [
              {
                "id": "cite",
                "label": "cite",
                "type": "textbox",
                "text": "In introduction of \\cite{MLPP12}:\nBy the classical Castelnuovo-De Franchis theorem (cf. \\cite[Proposition X.9]{Beau96}),\nif S has no irrational pencil of genus > 1 then the inequality pg(S) ≥ 2q(S) − 3\n\nbut a cleaner reference for the precise assertion is this one:\nhttps://perso.imj-prg.fr/wp-content/uploads/debarre-pub/1.pdf"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "MLPP12",
              "Beau96"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 236.6,
            "y": 215.5
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "description of dualizing sheaf of reducible surface",
            "details": [
              {
                "id": "citation",
                "label": "citation",
                "type": "list",
                "text": "Need to read \\cite{ACFR02}. This one has many figures and examples"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "ACFR02"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 301.7,
            "y": 348.1
          }
        ],
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
      "x": 382.6,
      "y": 54
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
      "x": 223.9,
      "y": 222
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
      "x": 550,
      "y": 230
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
      "x": 593.3,
      "y": 81.9
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
    "selectedId": "lem_normalized_middle",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 316,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 2.3829,
    "relativeNodePositions": {
      "lem_schoen_family": {
        "x": 0.2273,
        "y": 0.2498
      },
      "lem_wd4_monodromy": {
        "x": 0.5081,
        "y": 0.1709
      },
      "lem_normalized_middle": {
        "x": 0.2973,
        "y": 0.7025
      },
      "lem_nonzero_middle": {
        "x": 0.7304,
        "y": 0.7278
      },
      "thm_counterexample": {
        "x": 0.7879,
        "y": 0.259
      }
    },
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
      "key": "CMLR15",
      "author": "Ciliberto--Mendes Lopes--Roulleau",
      "title": "On Schoen surfaces",
      "year": "2013",
      "citeKey": "CMLR15",
      "details": [
        {
          "id": "remark",
          "label": "remark",
          "type": "textbox",
          "text": "a more geometric approach to Schoen's construction"
        }
      ],
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
    },
    {
      "key": "Beau96",
      "author": "Beauville, Arnaud",
      "title": "Complex algebraic surfaces.",
      "year": "1996",
      "citeKey": "Beau96",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@book{zbMATH00916043,\n author = {Beauville, Arnaud},\n title = {Complex algebraic surfaces.},\n edition = {2nd ed.},\n fseries = {London Mathematical Society Student Texts},\n series = {Lond. Math. Soc. Stud. Texts},\n issn = {0963-1631},\n volume = {34},\n isbn = {0-521-49842-2; 0-521-49510-5},\n year = {1996},\n publisher = {Cambridge: Cambridge Univ. Press},\n language = {English},\n keywords = {14J25,32J15,14-02,14J10,32-02},\n zbMATH = {916043},\n Zbl = {0849.14014}\n}",
      "links": []
    },
    {
      "key": "MLPP12",
      "author": "Lopes, Margarida Mendes and Pardini, Rita and Pirola, Gian Pietro",
      "title": "On surfaces of general type with \\(q=5\\)",
      "year": "2012",
      "citeKey": "MLPP12",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@article{zbMATH06142480,\n author = {Lopes, Margarida Mendes and Pardini, Rita and Pirola, Gian Pietro},\n title = {On surfaces of general type with {{\\(q=5\\)}}},\n fjournal = {Annali della Scuola Normale Superiore di Pisa. Classe di Scienze. Serie V},\n journal = {Ann. Sc. Norm. Super. Pisa, Cl. Sci. (5)},\n issn = {0391-173X},\n volume = {11},\n number = {4},\n pages = {999--1007},\n year = {2012},\n language = {English},\n doi = {10.2422/2036-2145.201102_003},\n keywords = {14J29},\n zbMATH = {6142480},\n Zbl = {1272.14030}\n}",
      "links": []
    },
    {
      "key": "ACFR02",
      "author": "Calabri, Alberto and Ciliberto, Ciro and Flamini, Flaminio and Miranda, Rick",
      "title": "On the geometric genus of reducible surfaces and degenerations of surface to unions of planes",
      "year": "2004",
      "citeKey": "ACFR02",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@incollection{zbMATH02135193,\n author = {Calabri, Alberto and Ciliberto, Ciro and Flamini, Flaminio and Miranda, Rick},\n title = {On the geometric genus of reducible surfaces and degenerations of surface to unions of planes},\n booktitle = {The Fano conference. Papers of the conference organized to commemorate the 50th anniversary of the death of Gino Fano (1871--1952), Torino, Italy, September 29--October 5, 2002},\n isbn = {88-900876-1-7},\n pages = {277--312},\n year = {2004},\n publisher = {Torino: Universit{\\`a} di Torino, Dipartimento di Matematica},\n language = {English},\n keywords = {14N20,14D06,14J10},\n zbMATH = {2135193},\n Zbl = {1071.14057}\n}",
      "links": []
    },
    {
      "key": "Schoen07",
      "author": "Schoen, Chad",
      "title": "A family of surfaces constructed from genus 2 curves",
      "year": "2007",
      "citeKey": "Schoen07",
      "details": [
        {
          "id": "typo",
          "label": "typo",
          "type": "textbox",
          "text": "\\cite[remark 2.3]{CMLR2013}: In [23, Proposition 10.1, (ii)], it is stated that for the general Schoen surface S one has rk(NS(S)) = 2.\nAs one can directly see with an argument as in [14], the right statement is instead that rk(NS(S)) = 1 (that was\nalso pointed to us in [24])."
        }
      ],
      "url": "https://pismin.com/10.1142/S0129167X07004175",
      "source": "web",
      "rawBibtex": "@article{zbMATH05168128,\n author = {Schoen, Chad},\n title = {A family of surfaces constructed from genus 2 curves},\n fjournal = {International Journal of Mathematics},\n journal = {Int. J. Math.},\n issn = {0129-167X},\n volume = {18},\n number = {5},\n pages = {585--612},\n year = {2007},\n language = {English},\n doi = {10.1142/S0129167X07004175},\n keywords = {14J29,32J15,32G05,32G10,14K12,14C30},\n zbMATH = {5168128},\n Zbl = {1118.14042}\n}",
      "links": [
        {
          "url": "https://pismin.com/10.1142/S0129167X07004175",
          "source": "web",
          "label": "scihub"
        }
      ]
    },
    {
      "key": "AIexplains",
      "author": "",
      "title": "openai",
      "year": "",
      "citeKey": "AIexplains",
      "url": "https://chatgpt.com/share/6a809b0f-b6bc-83eb-9aa9-58413b9a4f60",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://chatgpt.com/share/6a809b0f-b6bc-83eb-9aa9-58413b9a4f60",
          "source": "web",
          "label": ""
        }
      ]
    }
  ]
};