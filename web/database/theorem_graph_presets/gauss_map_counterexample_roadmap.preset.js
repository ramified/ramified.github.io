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
      "id": "n1",
      "type": "misc",
      "label": "1. Canonical systems refresh",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Be fluent with $K_X(-p)$ and vanishing orders. \\cite{ACGH1985}\n- [x] Recall Riemann--Roch for degree $g-1$ line bundles. \\cite{ACGH1985}\n- [x] Review base-point-free pencils and degrees of associated maps. \\cite{ACGH1985}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "ACGH1985"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 327.6,
      "y": 54,
      "childGraph": {
        "title": "1. Canonical systems refresh",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "test",
            "details": [
              {
                "id": "render",
                "label": "render",
                "type": "textbox",
                "text": "$P_{\\mathbf Q}=H^1(A_0,\\mathbf Q)\\hookrightarrow H^1(\\Gamma _0,\\mathbf Q)$\n$F^1(P_{\\mathbf C})=H^0\\bigl(\\Gamma_0,K_{\\Gamma _0}(-p_0)\\bigr)$"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 476.8,
            "y": 280
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "counter example",
            "details": [
              {
                "id": "text",
                "label": "text",
                "type": "checkbox",
                "text": "For the pair ((X,L)) and quotient $q:JX \\twoheadrightarrow A$ supplied by Lemma lem:fixed-plane-deformation, let$f\\to A$ be an Abel--Jacobi map followed by (q), and put\n\n[\nC=f(X).\n]"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
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
      "id": "n2",
      "type": "misc",
      "label": "2. Jacobians + quotients",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Review the Abel--Jacobi map $X\\to JX$ and why the Abel curve generates $JX$. \\cite{ACGH1985}\n- [x] Understand quotients $q:JX\\twoheadrightarrow A$ on tangent and cotangent spaces. \\cite{BirkenhakeLange2004}\n- [x] Review complementary abelian factors up to isogeny. \\cite{BirkenhakeLange2004}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "ACGH1985",
        "BirkenhakeLange2004"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 641.9,
      "y": 65.7
    },
    {
      "id": "n3",
      "type": "misc",
      "label": "3. Weight-one Hodge structures",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [x] Review $H^1_{\\mathbf C}=F^1\\oplus\\overline{F^1}$. \\cite{BirkenhakeLange2004}\n- [x] Understand why a six-dimensional rational weight-one Hodge substructure corresponds to an abelian threefold up to isogeny, and why proper Hodge substructures correspond to unwanted abelian factors.\n- [x] Explain why a polarizable rational weight-one Hodge structure gives a complex abelian variety up to isogeny. \\cite{BirkenhakeLange2004}\n- [x] Relate simplicity of the Hodge structure to simplicity of the abelian factor in this blueprint. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "BirkenhakeLange2004",
        "blueprint"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 449,
      "y": 121.5
    },
    {
      "id": "n4",
      "type": "misc",
      "label": "4. Theta characteristics ★",
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
      "x": 114.8,
      "y": 96.6
    },
    {
      "id": "n5",
      "type": "misc",
      "label": "5. Hyperelliptic seed geometry",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Review Weierstrass gap sequences and odd-degree hyperelliptic models. \\cite{ACGH1985}\n- [ ] Derive $K_{\\Gamma_0}\\simeq\\mathcal O(6p_0)$ and $L_0=\\mathcal O(3p_0)$. \\cite{blueprint}\n- [ ] Verify $h^0(L_0)=2$. \\cite{blueprint}\n- [ ] Verify $\\operatorname{Sym}^2H^0(L_0)=H^0(K_{\\Gamma_0}(-p_0))$ using $1,B,B^2$. \\cite{blueprint}"
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 87.2,
      "y": 327.5
    },
    {
      "id": "n6",
      "type": "misc",
      "label": "6. Tangential covers",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Understand finite covers $(\\Gamma,p)\\to(E,0)$ and tangentiality in the Treibich--Verdier sense. \\cite{EilbeckEnolskiiPreviato2001}\n- [ ] Learn the cotangent criterion $W_E^\\perp=H^0(\\Gamma,K_\\Gamma(-p))$. \\cite{ColomboPirolaPreviato1994}\n- [ ] Understand why the integer Lamé spectral curve supplies the needed hyperelliptic-to-elliptic cover. \\cite{Maier2003}\n- [ ] Understand why that spectral cover is tangential; keep the detailed integrable-systems machinery as a black box initially. \\cite{EilbeckEnolskiiPreviato2001}"
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
      "x": 241.2,
      "y": 218.1
    },
    {
      "id": "n7",
      "type": "misc",
      "label": "7. Frobenius certificate",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Reconstruct the point counts $N_r$ and the genus-$4$ Weil polynomial in the blueprint. \\cite{blueprint}\n- [ ] Divide out the elliptic factor to obtain the complementary degree-$6$ polynomial. \\cite{blueprint}\n- [ ] Reproduce the irreducibility test modulo $3$ and deduce simplicity. \\cite{blueprint}\n- [ ] Check ordinarity and apply the threefold absolute-simplicity criterion. \\cite{AriasEtAl2016}"
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 661.2,
      "y": 289.7
    },
    {
      "id": "n8",
      "type": "misc",
      "label": "8. Reconstruct the seed lemma",
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
      "x": 453.6,
      "y": 262.8
    },
    {
      "id": "n9",
      "type": "misc",
      "label": "9. Spin deformation ★",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Learn enough deformation theory to interpret a local marked deformation space and upper semicontinuity. \\cite{Sernesi2006}\n- [ ] Understand spin curves locally and why parity persists in families. \\cite{Cornalba1989,Mumford1971}\n- [ ] Reproduce the blueprint's dimension count: spin space $9$, theta-null at least $8$, hence $\\dim Z\\ge8-6=2$. \\cite{blueprint}\n- [ ] Understand why $P_{\\mathbf C}=\\mathcal W\\oplus\\overline{\\mathcal W}$ along the aligned locus. \\cite{blueprint}\n- [ ] Understand the finiteness input that gives $\\dim(Z\\cap\\mathcal H_4)\\le1$. \\cite{Treibich2025}\n- [ ] Understand the Baire-category step excluding proper rational Hodge substructures. \\cite{blueprint}"
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 277.6,
      "y": 329.7
    },
    {
      "id": "n10",
      "type": "misc",
      "label": "10. Degree-3 Gauss map",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Show $L$ is base-point-free and $\\varphi_L:X\\to\\mathbf P^1$ has degree $3$. \\cite{blueprint,ACGH1985}\n- [ ] Identify $W=\\langle s^2,st,t^2\\rangle$. \\cite{blueprint}\n- [ ] Derive $\\gamma=[s^2:st:t^2]=\\nu_2\\circ\\varphi_L$. \\cite{blueprint}\n- [ ] Conclude $\\deg\\gamma=3$. \\cite{blueprint}\n- [ ] Reproduce the normalization argument for $X\\to C$. \\cite{blueprint}"
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
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 508.9,
      "y": 412
    },
    {
      "id": "n11",
      "type": "misc",
      "label": "11. Rigidity + counterexample",
      "details": [
        {
          "id": "goals",
          "label": "goals",
          "type": "checkbox",
          "text": "- [ ] Prove scalar rigidity: $du_0=\\lambda\\operatorname{id}$ forces $u=[1]$ or $[-1]$ on the simple factor. \\cite{blueprint}\n- [ ] Review endomorphisms/automorphisms of complex abelian varieties as needed for the rigidity proof. \\cite{BirkenhakeLange2004}\n- [ ] Exclude the $[-1]$ case using the degree-$3$ Gauss map. \\cite{blueprint}\n- [ ] Exclude nonzero translations via an order-$3$ action and Riemann--Hurwitz. \\cite{blueprint}\n- [ ] Assemble the lemmas into the final counterexample. \\cite{blueprint}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "blueprint",
        "BirkenhakeLange2004"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 291.9,
      "y": 412
    }
  ],
  "arrows": [
    {
      "id": "a1",
      "sourceId": "n1",
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
      "labelPosition": 0.5,
      "labelAlign": "left",
      "color": "#5f574e"
    },
    {
      "id": "a3",
      "sourceId": "n2",
      "targetId": "n3",
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
      "id": "a5",
      "sourceId": "n2",
      "targetId": "n7",
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
      "id": "a7",
      "sourceId": "n3",
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
      "id": "a10",
      "sourceId": "n4",
      "targetId": "n5",
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
      "id": "a18",
      "sourceId": "n9",
      "targetId": "n10",
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
    "selectedId": "n9",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 466,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 1.6137,
    "relativeNodePositions": {
      "n1": {
        "x": 0.4356,
        "y": 0.1159
      },
      "n2": {
        "x": 0.8536,
        "y": 0.141
      },
      "n3": {
        "x": 0.5971,
        "y": 0.2607
      },
      "n4": {
        "x": 0.1527,
        "y": 0.2074
      },
      "n5": {
        "x": 0.116,
        "y": 0.7027
      },
      "n6": {
        "x": 0.3208,
        "y": 0.468
      },
      "n7": {
        "x": 0.8793,
        "y": 0.6217
      },
      "n8": {
        "x": 0.6032,
        "y": 0.564
      },
      "n9": {
        "x": 0.3692,
        "y": 0.7075
      },
      "n10": {
        "x": 0.6767,
        "y": 0.8841
      },
      "n11": {
        "x": 0.3882,
        "y": 0.8841
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
