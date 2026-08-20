// Save this file as theorem_graph_presets/gauss_map_counterexample_roadmap.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Gauss-Map Counterexample Roadmap", key: "gauss_map_counterexample_roadmap", file: "gauss_map_counterexample_roadmap.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.gauss_map_counterexample_roadmap = {
  "schemaVersion": 9,
  "title": "Gauss-Map Counterexample Roadmap",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Gauss-Map Counterexample Roadmap",
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
      "id": "n4",
      "type": "misc",
      "label": "Theta characteristics",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Learn theta characteristics $L^{\\otimes 2}\\simeq K_X$ and parity. \\cite{Mumford1971}\n- [x] Understand why parity is deformation invariant. \\cite{Mumford1971}\n\n- [?] Understand the theta-null locus $\\{h^0(L)\\ge2\\}$. \\cite{Farkas2012}\n- [x] Understand $\\operatorname{Sym}^2H^0(L)\\to H^0(K_X)$ and the basis $s^2,st,t^2$. \\cite{blueprint}"
        },
        {
          "id": "revised",
          "label": "revised",
          "type": "checkbox",
          "text": "- [x] Understand that the proof deforms the pair $(X,L)$, not just $X$, and follows the rank-$3$ space $\\mathcal W=\\operatorname{Sym}^2 H^0(L)$ in this family.\\cite{Farkas2012,Cornalba1989}\n- [x] Understand that the proof deforms the pair $(X,L)$, not just $X$, and follows the rank-$3$ space $\\mathcal W=\\operatorname{Sym}^2 H^0(L)$ in this family."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Mumford1971",
        "Farkas2012",
        "blueprint",
        "Cornalba1989"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 113.9,
      "y": 176.9
    },
    {
      "id": "n5",
      "type": "misc",
      "label": "Hyperelliptic line bundle identification",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Review Weierstrass gap sequences and odd-degree hyperelliptic models. \\cite{ACGH1985}\n- [x] Derive $K_{\\Gamma_0}\\simeq\\mathcal O(6p_0)$ and $L_0=\\mathcal O(3p_0)$. \\cite{blueprint}\n- [x] Verify $h^0(L_0)=2$. \\cite{blueprint}\n- [x] Verify $\\operatorname{Sym}^2H^0(L_0)=H^0(K_{\\Gamma_0}(-p_0))$ using $1,B,B^2$. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "ACGH1985",
        "blueprint"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 229.6,
      "y": 49.7
    },
    {
      "id": "n6",
      "type": "misc",
      "label": "Tangential covers",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Understand finite covers $(\\Gamma,p)\\to(E,0)$ and tangentiality in the Treibich--Verdier sense. \\cite{EilbeckEnolskiiPreviato2001}\n- [?] Learn the cotangent criterion $W_E^\\perp=H^0(\\Gamma,K_\\Gamma(-p))$. \\cite{ColomboPirolaPreviato1994}\n- [?] Understand why the integer Lamé spectral curve supplies the needed hyperelliptic-to-elliptic cover. \\cite{Maier2003}\n- [?] Understand why that spectral cover is tangential; keep the detailed integrable-systems machinery as a black box initially. \\cite{EilbeckEnolskiiPreviato2001}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "EilbeckEnolskiiPreviato2001",
        "ColomboPirolaPreviato1994",
        "Maier2003"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 409.8,
      "y": 167.9
    },
    {
      "id": "n7",
      "type": "misc",
      "label": "Hyperelliptic construction by equations",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Reconstruct the point counts $N_r$ and the genus-$4$ Weil polynomial in the blueprint. \\cite{blueprint}\n- [x] Divide out the elliptic factor to obtain the complementary degree-$6$ polynomial. \\cite{blueprint}\n- [x] Reproduce the irreducibility test modulo $3$ and deduce simplicity. \\cite{blueprint}\n- [x] Check ordinarity and apply the threefold absolute-simplicity criterion. \\cite{AriasEtAl2016}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "blueprint",
        "AriasEtAl2016"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 518.7,
      "y": 39.3
    },
    {
      "id": "n8",
      "type": "misc",
      "label": "Seed lemma",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Explain: Lamé curve $\\Rightarrow$ degree-$10$ elliptic spectral cover. \\cite{Maier2003}\n- [ ] Explain: spectral cover $\\Rightarrow$ tangential cover. \\cite{EilbeckEnolskiiPreviato2001}\n- [ ] Explain: tangentiality $\\Rightarrow F^1(P_{\\mathbf C})=H^0(\\Gamma_0,K_{\\Gamma_0}(-p_0))$. \\cite{ColomboPirolaPreviato1994}\n- [ ] Explain: finite-field certificate $\\Rightarrow A_0$ absolutely simple. \\cite{AriasEtAl2016}\n- [ ] Reproduce the whole seed lemma without looking at the detailed calculations. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Maier2003",
        "EilbeckEnolskiiPreviato2001",
        "ColomboPirolaPreviato1994",
        "AriasEtAl2016",
        "blueprint"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 627.2,
      "y": 216.4
    },
    {
      "id": "n9",
      "type": "misc",
      "label": "Spin deformation lemma",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [?] Learn enough deformation theory to interpret a local marked deformation space and upper semicontinuity. \\cite{Sernesi2006}\n- [?] Understand spin curves locally and why parity persists in families. \\cite{Cornalba1989,Mumford1971}\n- [ ] Reproduce the blueprint's dimension count: spin space $9$, theta-null at least $8$, hence $\\dim Z\\ge8-6=2$. \\cite{blueprint}\n- [ ] Understand why $P_{\\mathbf C}=\\mathcal W\\oplus\\overline{\\mathcal W}$ along the aligned locus. \\cite{blueprint}\n- [ ] Understand the finiteness input that gives $\\dim(Z\\cap\\mathcal H_4)\\le1$. \\cite{Treibich2025}\n- [ ] Understand the Baire-category step excluding proper rational Hodge substructures. \\cite{blueprint}"
        },
        {
          "id": "revised",
          "label": "revised",
          "type": "checkbox",
          "text": "- [ ] Understand why the local genus-$4$ spin-deformation space has dimension $9$, why $h^0(L)\\ge 2$ defines the theta-null locus of dimension at least $8$, and why $\\mathcal W$ varies as a rank-$3$ bundle."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Sernesi2006",
        "Cornalba1989",
        "Mumford1971",
        "blueprint",
        "Treibich2025"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 194.6,
      "y": 306.7
    },
    {
      "id": "n10",
      "type": "misc",
      "label": "Degree-3 Gauss map",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Show $L$ is base-point-free and $\\varphi_L:X\\to\\mathbf P^1$ has degree $3$. \\cite{blueprint,ACGH1985}\n- [x] Identify $W=\\langle s^2,st,t^2\\rangle$. \\cite{blueprint}\n- [x] Derive $\\gamma=[s^2:st:t^2]=\\nu_2\\circ\\varphi_L$. \\cite{blueprint}\n- [?] Conclude $\\deg\\gamma=3$. \\cite{blueprint}\n- [x] Reproduce the normalization argument for $X\\to C$. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "blueprint",
        "ACGH1985"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 567.1,
      "y": 363.9
    },
    {
      "id": "n11",
      "type": "misc",
      "label": "Final check",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Exclude the $[-1]$ case using the degree-$3$ Gauss map. \\cite{blueprint}\n- [x] Exclude nonzero 10. translations via an order-$3$ action and Riemann--Hurwitz. \\cite{blueprint}\n- [x] Assemble the lemmas into the final counterexample. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "blueprint"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 350.3,
      "y": 361.3
    }
  ],
  "arrows": [
    {
      "id": "a13",
      "sourceId": "n5",
      "targetId": "n6",
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
      "color": "#5f574e"
    },
    {
      "id": "a15",
      "sourceId": "n6",
      "targetId": "n8",
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
      "color": "#5f574e"
    },
    {
      "id": "a16",
      "sourceId": "n7",
      "targetId": "n8",
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
      "color": "#5f574e"
    },
    {
      "id": "a17",
      "sourceId": "n8",
      "targetId": "n9",
      "label": "def",
      "remark": "",
      "body": "solid",
      "head": "arrow",
      "tail": "none",
      "level": 1,
      "endpointScale": 1,
      "curve": 0,
      "labelOffset": -15,
      "labelPosition": 0.5,
      "labelAlign": "right",
      "color": "#5f574e"
    },
    {
      "id": "a18",
      "sourceId": "n9",
      "targetId": "n10",
      "label": "verify",
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
    },
    {
      "id": "a21",
      "sourceId": "n10",
      "targetId": "n11",
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
      "color": "#5f574e"
    }
  ],
  "view": {
    "selectedId": "n5",
    "layoutAvoidOverlap": false,
    "layoutRunning": false,
    "canvasHeight": 414,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.8164,
    "relativeNodePositions": {
      "n4": {
        "x": 0.1515,
        "y": 0.4272
      },
      "n5": {
        "x": 0.3053,
        "y": 0.1199
      },
      "n6": {
        "x": 0.5449,
        "y": 0.4055
      },
      "n7": {
        "x": 0.6897,
        "y": 0.0948
      },
      "n8": {
        "x": 0.8341,
        "y": 0.5228
      },
      "n9": {
        "x": 0.2588,
        "y": 0.7407
      },
      "n10": {
        "x": 0.7541,
        "y": 0.879
      },
      "n11": {
        "x": 0.4659,
        "y": 0.8727
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
    },
    {
      "key": "james",
      "author": "James, Gordon",
      "title": "The Representation Theory of the Symmetric Groups",
      "year": "1978",
      "citeKey": "james",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "james-kerber",
      "author": "James, Gordon; Kerber, Adalbert",
      "title": "The Representation Theory of the Symmetric Group",
      "year": "1981",
      "citeKey": "james-kerber",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "curtis-reiner",
      "author": "Curtis, Charles W.; Reiner, Irving",
      "title": "Methods of Representation Theory, Vol. I",
      "year": "1981",
      "citeKey": "curtis-reiner",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "reiner",
      "author": "Reiner, Irving",
      "title": "Maximal Orders",
      "year": "1975",
      "citeKey": "reiner",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "plesken",
      "author": "Plesken, Wilhelm",
      "title": "Group Rings of Finite Groups over p-adic Integers",
      "year": "1983",
      "citeKey": "plesken",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "hofmann",
      "author": "Hofmann, Tommy",
      "title": "Zeta Functions of Lattices of the Symmetric Group",
      "year": "2016",
      "citeKey": "hofmann",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "danz-hofmann",
      "author": "Danz, Susanne; Hofmann, Tommy",
      "title": "On Integral Forms of Specht Modules Labelled by Hook Partitions",
      "year": "2017",
      "citeKey": "danz-hofmann",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "blueprint",
      "author": "",
      "title": "User blueprint: Gauss-map counterexample proof",
      "year": "",
      "citeKey": "blueprint",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "",
      "links": []
    },
    {
      "key": "Maier2003",
      "author": "Robert S. Maier",
      "title": "Lamé polynomials, hyperelliptic reductions and Lamé band structure",
      "year": "2003",
      "citeKey": "Maier2003",
      "url": "https://arxiv.org/abs/math-ph/0309005",
      "source": "web",
      "rawBibtex": "@article{Maier2003, author={Robert S. Maier}, title={Lamé polynomials, hyperelliptic reductions and Lamé band structure}, year={2003}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math-ph/0309005",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "EilbeckEnolskiiPreviato2001",
      "author": "J. C. Eilbeck, V. Z. Enolskii, E. Previato",
      "title": "Varieties of elliptic solitons",
      "year": "2001",
      "citeKey": "EilbeckEnolskiiPreviato2001",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@article{EilbeckEnolskiiPreviato2001, author={J. C. Eilbeck and V. Z. Enolskii and E. Previato}, title={Varieties of elliptic solitons}, year={2001}}",
      "links": []
    },
    {
      "key": "ColomboPirolaPreviato1994",
      "author": "E. Colombo, G. P. Pirola, E. Previato",
      "title": "Density of elliptic solitons",
      "year": "1994",
      "citeKey": "ColomboPirolaPreviato1994",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@article{ColomboPirolaPreviato1994, author={E. Colombo and G. P. Pirola and E. Previato}, title={Density of elliptic solitons}, year={1994}}",
      "links": []
    },
    {
      "key": "AriasEtAl2016",
      "author": "Sara Arias-de-Reyna, Cécile Armana, Valentijn Karemaker, Marusia Rebolledo, Lara Thomas, Núria Vila",
      "title": "Large Galois images for Jacobian varieties of genus 3 curves",
      "year": "2016",
      "citeKey": "AriasEtAl2016",
      "url": "https://arxiv.org/abs/1507.05913",
      "source": "web",
      "rawBibtex": "@article{AriasEtAl2016, title={Large Galois images for Jacobian varieties of genus 3 curves}, year={2016}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1507.05913",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "Treibich2025",
      "author": "Armando Treibich",
      "title": "Hyperelliptic tangential covers and even elliptic finite-gap potentials, back and forth",
      "year": "2025",
      "citeKey": "Treibich2025",
      "url": "https://arxiv.org/abs/2501.16483",
      "source": "web",
      "rawBibtex": "@article{Treibich2025, author={Armando Treibich}, title={Hyperelliptic tangential covers and even elliptic finite-gap potentials, back and forth}, year={2025}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2501.16483",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "ACGH1985",
      "author": "E. Arbarello; M. Cornalba; P. A. Griffiths; J. Harris",
      "title": "Geometry of Algebraic Curves, Volume I",
      "year": "1985",
      "citeKey": "ACGH1985",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "Use for linear series, Riemann--Roch, canonical systems, hyperelliptic curves, Abel--Jacobi/Jacobians, and base-point-free pencils."
        }
      ],
      "url": "https://doi.org/10.1007/978-1-4757-5323-3",
      "source": "web",
      "rawBibtex": "@book{ACGH1985, author={E. Arbarello and M. Cornalba and P. A. Griffiths and J. Harris}, title={Geometry of Algebraic Curves, Volume I}, publisher={Springer}, year={1985}}",
      "links": [
        {
          "url": "https://doi.org/10.1007/978-1-4757-5323-3",
          "source": "web",
          "label": "Springer / DOI"
        }
      ]
    },
    {
      "key": "BirkenhakeLange2004",
      "author": "Christina Birkenhake; Herbert Lange",
      "title": "Complex Abelian Varieties",
      "year": "2004",
      "citeKey": "BirkenhakeLange2004",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "Use for complex tori and abelian varieties, Jacobians, endomorphisms, isogenies, tangent/cotangent descriptions, and the Hodge-theoretic viewpoint on complex abelian varieties."
        }
      ],
      "url": "https://doi.org/10.1007/978-3-662-06307-1",
      "source": "web",
      "rawBibtex": "@book{BirkenhakeLange2004, author={Christina Birkenhake and Herbert Lange}, title={Complex Abelian Varieties}, edition={2}, publisher={Springer}, year={2004}}",
      "links": [
        {
          "url": "https://doi.org/10.1007/978-3-662-06307-1",
          "source": "web",
          "label": "Springer / DOI"
        }
      ]
    },
    {
      "key": "Mumford1971",
      "author": "David Mumford",
      "title": "Theta characteristics of an algebraic curve",
      "year": "1971",
      "citeKey": "Mumford1971",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "Use for theta characteristics, parity, and deformation invariance of parity."
        }
      ],
      "url": "https://doi.org/10.24033/asens.1209",
      "source": "web",
      "rawBibtex": "@article{Mumford1971, author={David Mumford}, title={Theta characteristics of an algebraic curve}, journal={Annales scientifiques de l\\'École Normale Supérieure}, volume={4}, number={2}, pages={181--192}, year={1971}}",
      "links": [
        {
          "url": "https://doi.org/10.24033/asens.1209",
          "source": "web",
          "label": "DOI / Numdam"
        }
      ]
    },
    {
      "key": "Farkas2012",
      "author": "Gavril Farkas",
      "title": "Theta characteristics and their moduli",
      "year": "2012",
      "citeKey": "Farkas2012",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "Survey/reference for theta characteristics, spin moduli, theta-null geometry, and the broader moduli-space picture."
        }
      ],
      "url": "https://arxiv.org/abs/1201.2557",
      "source": "web",
      "rawBibtex": "@article{Farkas2012, author={Gavril Farkas}, title={Theta characteristics and their moduli}, year={2012}, eprint={1201.2557}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1201.2557",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "Cornalba1989",
      "author": "Maurizio Cornalba",
      "title": "Moduli of curves and theta-characteristics",
      "year": "1989",
      "citeKey": "Cornalba1989",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "Use for the moduli/spin-curve framework behind local deformations of curves with theta characteristics."
        }
      ],
      "url": "https://iris.unipv.it/handle/11571/121459",
      "source": "web",
      "rawBibtex": "@incollection{Cornalba1989, author={Maurizio Cornalba}, title={Moduli of curves and theta-characteristics}, booktitle={Lectures on Riemann Surfaces}, publisher={World Scientific}, pages={560--589}, year={1989}}",
      "links": [
        {
          "url": "https://iris.unipv.it/handle/11571/121459",
          "source": "web",
          "label": "University record"
        }
      ]
    },
    {
      "key": "Sernesi2006",
      "author": "Edoardo Sernesi",
      "title": "Deformations of Algebraic Schemes",
      "year": "2006",
      "citeKey": "Sernesi2006",
      "details": [
        {
          "id": "use",
          "label": "use in roadmap",
          "type": "textbox",
          "text": "General background for deformation theory, families, tangent spaces, and semicontinuity-style arguments."
        }
      ],
      "url": "https://books.google.com/books?id=37CBNQEACAAJ",
      "source": "web",
      "rawBibtex": "@book{Sernesi2006, author={Edoardo Sernesi}, title={Deformations of Algebraic Schemes}, series={Grundlehren der mathematischen Wissenschaften}, volume={334}, publisher={Springer}, year={2006}}",
      "links": [
        {
          "url": "https://books.google.com/books?id=37CBNQEACAAJ",
          "source": "web",
          "label": "Book record"
        }
      ]
    }
  ]
};
