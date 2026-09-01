// Save this file as theorem_graph_presets/integral_s_n_forms.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Integral S_n Forms", key: "integral_s_n_forms", file: "integral_s_n_forms.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.integral_s_n_forms = {
  "schemaVersion": 10,
  "title": "Integral S_n Forms",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Integral S_n Forms",
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
      "type": "definition",
      "label": "1. Integral forms: what is classified?",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Explain the difference between a Z-representation, a ZS_n-lattice, and a Z-form of V.\n- [ ] Distinguish rational equivalence from integral equivalence.\n- [ ] Prove that any two full lattices in the same rational space are commensurable.\n- [ ] Work out the standard 2-dimensional representation of S_3 as a first lattice example."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{CR81,james}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Classify full ZS_n-lattices L ⊂ V up to ZS_n-isomorphism, not merely the rational irreducibles.",
      "proofSketch": "",
      "citationKeys": [
        "CR81",
        "james"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 477,
      "y": 54
    },
    {
      "id": "n2",
      "type": "definition",
      "label": "2. Integral equivalence & commensurability",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Translate ZS_n-lattice isomorphism into change of integral basis.\n- [ ] Use finite-index inclusions L ⊂ M and compute M/L.\n- [ ] Use Smith normal form to read elementary divisors and indices.\n- [ ] Check explicitly when two rationally conjugate matrix representations fail to be integrally conjugate."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{CR81,reiner}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Integral isomorphism is controlled by GL_d(Z), whereas rational equivalence only sees GL_d(Q).",
      "proofSketch": "",
      "citationKeys": [
        "CR81",
        "reiner"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 126.5,
      "y": 54
    },
    {
      "id": "n3",
      "type": "definition",
      "label": "3. Orders & endomorphism rings",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Know what an order and a lattice over an order are.\n- [ ] Compute End_{QS_n}(V) for an irreducible rational Specht module in examples.\n- [ ] Understand homothety versus genuine ZS_n-isomorphism.\n- [ ] See why semisimplicity over Q does not imply splitting over Z."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{CR81,reiner}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Order-theoretic language explains why lattice classification is arithmetic rather than ordinary semisimple representation theory.",
      "proofSketch": "",
      "citationKeys": [
        "CR81",
        "reiner"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 89,
      "y": 410.7
    },
    {
      "id": "n4",
      "type": "definition",
      "label": "4. Specht lattices as canonical Z-forms",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Construct S^λ_Z inside S^λ_Q from polytabloids without relearning tableau theory.\n- [ ] Compare S^λ_Z with its dual lattice.\n- [ ] Track the effect of conjugating λ and tensoring with sign.\n- [ ] Compute an integral Gram matrix for one small nontrivial λ."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{james,james-kerber}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "S^λ_Z gives a distinguished S_n-stable lattice inside S^λ_Q, but generally not the only integral form.",
      "proofSketch": "",
      "citationKeys": [
        "james",
        "james-kerber"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 649.1,
      "y": 313.4
    },
    {
      "id": "n5",
      "type": "definition",
      "label": "5. Integral invariants of a lattice",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Compute L* and the discriminant group L*/L in examples.\n- [ ] Relate index changes to determinants and Gram matrices.\n- [ ] Use Smith normal form to compare candidate lattices.\n- [ ] Identify which invariants survive localization at a prime p."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{reiner,james}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Indices, duals, discriminants, and elementary divisors provide computable obstructions to lattice isomorphism.",
      "proofSketch": "",
      "citationKeys": [
        "reiner",
        "james"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 198.4,
      "y": 344.8
    },
    {
      "id": "n6",
      "type": "theorem",
      "label": "6. Jordan–Zassenhaus finiteness",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] State Jordan–Zassenhaus in the form relevant to a fixed V.\n- [ ] Understand why the theorem gives finiteness but not an explicit list.\n- [ ] Separate the finite classification problem for fixed V from the impossible-looking task of classifying all ZS_n-modules at once.\n- [ ] Explain why explicit families of representatives are the real goal."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{CR81,reiner}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "There are only finitely many ZS_n-lattice isomorphism classes with rational span V.",
      "proofSketch": "",
      "citationKeys": [
        "CR81",
        "reiner"
      ],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 545.7,
      "y": 379.7
    },
    {
      "id": "n7",
      "type": "definition",
      "label": "7. Localization, p-adic forms & genus",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Move fluently among Z, Z_p, Q, and Q_p forms.\n- [ ] Factor lattice indices prime by prime.\n- [ ] Define when two lattices lie in the same genus.\n- [ ] Understand why only finitely many primes can distinguish a fixed pair of lattices."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{reiner,plesken}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "The global problem decomposes into local lattice problems plus a local-to-global patching question.",
      "proofSketch": "",
      "citationKeys": [
        "reiner",
        "plesken"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 222.9,
      "y": 481.8
    },
    {
      "id": "n8",
      "type": "definition",
      "label": "8. Z_pS_n-lattices over a DVR",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Classify simple toy examples of Z_p-lattices up to homothety.\n- [ ] Understand pM ⊂ L ⊂ M as a way to generate neighboring lattices.\n- [ ] Relate such neighbors to S_n-stable subspaces of M/pM.\n- [ ] Work one example for S_4 at p = 2 or p = 3."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{plesken,reiner}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Chains of over- and underlattices can be studied using p-adic valuation, Nakayama-type arguments, and invariant subquotients.",
      "proofSketch": "",
      "citationKeys": [
        "plesken",
        "reiner"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 697.4,
      "y": 454.5
    },
    {
      "id": "n9",
      "type": "definition",
      "label": "9. Reduction mod p as a constraint",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Compute L/pL for several Specht lattices.\n- [ ] Read the relevant decomposition-number information for a chosen λ and p.\n- [ ] Use blocks and composition factors to rule out impossible neighboring lattices.\n- [ ] Keep clear the distinction between classifying F_pS_n-modules and classifying Z_pS_n-lattices."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{james,james-kerber,plesken}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "Modular composition factors, blocks, and extensions constrain possible integral lifts, although reduction alone does not classify them.",
      "proofSketch": "",
      "citationKeys": [
        "james",
        "james-kerber",
        "plesken"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 345.6,
      "y": 546.6
    },
    {
      "id": "n10",
      "type": "example",
      "label": "10. Test case: the natural hook (n−1,1)",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Identify S_Z^(n−1,1) with a natural A-type lattice model.\n- [ ] Compare the root lattice with its dual/weight-lattice enlargement.\n- [ ] Derive the divisor parametrization of the integral forms in this natural-hook case.\n- [ ] Verify the expected τ(n) classes for S_n in a small example such as n = 4 or 6."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{hofmann,plesken}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "This family is the first explicit model for seeing several non-isomorphic integral forms inside one rational irreducible.",
      "proofSketch": "",
      "citationKeys": [
        "hofmann",
        "plesken"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 48,
      "y": 708.1
    },
    {
      "id": "n11",
      "type": "proposition",
      "label": "11. Exterior powers and hook Specht modules",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Prove or reconstruct S_Q^(n−k,1^k) ≅ ∧^k S_Q^(n−1,1).\n- [ ] Compare ∧^k L for different integral forms L of the natural module.\n- [ ] Check carefully that exterior-power lattices need not exhaust all integral forms automatically.\n- [ ] Work out k = 2 explicitly."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{james,danz-hofmann}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "The isomorphism S_Q^(n−k,1^k) ≅ ∧^k U_Q turns the natural module into a laboratory for higher hooks.",
      "proofSketch": "",
      "citationKeys": [
        "james",
        "danz-hofmann"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 378.9,
      "y": 693.4
    },
    {
      "id": "n12",
      "type": "definition",
      "label": "12. Craig–Plesken local classification machinery",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Understand the Craig–Plesken description used for the natural representation.\n- [ ] Reproduce the local classification at one prime p dividing n.\n- [ ] Learn how duality and lattice chains cut down the candidate list.\n- [ ] Write representatives in a form you can actually compare by index and reduction mod p."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{plesken,hofmann,danz-hofmann}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "This is the main technical bridge from the natural module to explicit classifications of hook forms.",
      "proofSketch": "",
      "citationKeys": [
        "plesken",
        "hofmann",
        "danz-hofmann"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 477.2,
      "y": 855.8
    },
    {
      "id": "n13",
      "type": "theorem",
      "label": "13. Danz–Hofmann: p-adic hook forms",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] State the odd-prime classification theorem precisely.\n- [ ] Understand the representative lattices well enough to recover them from the construction, not just quote the theorem.\n- [ ] Track what changes at p = 2.\n- [ ] Memorize the proved p = 2 range: n not congruent to 0 mod 4 with k = 2 or k = n−3."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{danz-hofmann}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "For every odd prime p, Danz–Hofmann give representatives for the Z_p-forms of every hook; they also settle specified p = 2 cases.",
      "proofSketch": "",
      "citationKeys": [
        "danz-hofmann"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 616.1,
      "y": 535
    },
    {
      "id": "n14",
      "type": "corollary",
      "label": "14. Patch local data to global Z-forms",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] Understand what local information must agree in order to patch a global lattice.\n- [ ] Follow the passage from p-adic representatives to Z-representatives in the hook paper.\n- [ ] Reconstruct the global list for (n−2,1^2) when n is not congruent to 0 mod 4.\n- [ ] Do one complete numerical case from start to finish."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{danz-hofmann,reiner}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "The hook results yield explicit global Z-forms in particular cases, including (n−2,1^2) and its conjugate-side partner under the stated 2-adic hypothesis.",
      "proofSketch": "",
      "citationKeys": [
        "danz-hofmann",
        "reiner"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 233.8,
      "y": 814.3
    },
    {
      "id": "n15",
      "type": "misc",
      "label": "15. Beyond hooks: know the frontier",
      "details": [
        {
          "id": "goals",
          "label": "Goals",
          "type": "checkbox",
          "text": "- [ ] For a chosen non-hook λ, search whether integral or p-adic forms have been explicitly classified.\n- [ ] Identify the obstructing primes from Gram determinants, modular structure, and local data.\n- [ ] Formulate a small research-sized target: fixed n, λ, and p rather than all S_n at once.\n- [ ] Be able to explain exactly what is known for hooks and what remains outside this roadmap."
        },
        {
          "id": "reading",
          "label": "Reading",
          "type": "textbox",
          "text": "\\cite{CR81,danz-hofmann}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "The goal is to distinguish general finiteness from families where a practical explicit classification is actually known.",
      "proofSketch": "",
      "citationKeys": [
        "CR81",
        "danz-hofmann"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 618.2,
      "y": 690.9
    },
    {
      "id": "n17",
      "type": "misc",
      "label": "my graph",
      "details": [
        {
          "id": "progress",
          "label": "progress",
          "type": "list",
          "text": "stop at 3.C"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 331,
      "y": 287.2,
      "childGraph": {
        "title": "my graph",
        "nodes": [
          {
            "id": "n17",
            "type": "definition",
            "label": "Cartan--Brauer triangle",
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
      "id": "n18",
      "type": "misc",
      "label": "Curtis–Reiner",
      "details": [],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 456.8,
      "y": 212.6,
      "childGraph": {
        "title": "Curtis–Reiner",
        "nodes": [
          {
            "id": "n1",
            "type": "definition",
            "label": "§23 — Lattices and orders",
            "details": [
              {
                "id": "concepts",
                "label": "concepts",
                "type": "list",
                "text": "$R$-lattice, p522\nprojective is required for $R$-lattice\nproj->torsion free\nDedekind domain + f.g., get reverse\n$R->\\operatorname{End}_R(M)$ helps understand a $\\Lambda$-module $M$, where $\\Lambda$ is an $R$-algebra, p523\n$\\operatorname{End}_R(M)$ is an $R$-lattice\n$R$-order: $R$-algebra + $R$-lattice, p523\n$R$-order in f.g. $K(R)$-algebra\n$\\Lambda$-lattice, p524\n$R$-pure $\\Lambda$-sublattice, p526\nsaturated, p527"
              },
              {
                "id": "results",
                "label": "results",
                "type": "checkbox",
                "text": "- [x] pure integral ~ rational  \\cite[(23.7)]{CR81}\n- [x] saturated ~ $S^{-1}R$ localized \\cite[(23.12)]{CR81}\n- [x] pure = specially saturated \\cite[before (23.14)]{CR81}\n- [x] When will a rational rep find its integral model: PID, (h,dim)=1 or field extension remedy"
              }
            ],
            "setting": "Specialize the book's order-and-lattice language to the integral group ring $\\Lambda=\\mathbb{Z}S_n$.",
            "condition": "Write the definitions of an $R$-order and a $\\Lambda$-lattice. Then check explicitly that a free integral representation $\\rho:S_n\\to\\mathrm{GL}_r(\\mathbb{Z})$ gives a $\\mathbb{Z}S_n$-lattice, and conversely.",
            "result": "Checkpoint: translate without hesitation between integral matrix representations and $\\mathbb{Z}S_n$-lattices. \\cite[§23, p. 525]{CR81}",
            "proofSketch": "Quick recall: the classification problem is classification of $\\mathbb{Z}S_n$-lattices up to $\\mathbb{Z}S_n$-isomorphism, with indecomposable lattices as the basic building blocks.",
            "citationKeys": [
              "CR81"
            ],
            "color": "#8b3a2a",
            "fillColor": "#f7f5f1",
            "x": 238.8,
            "y": 127.3
          },
          {
            "id": "n2",
            "type": "theorem",
            "label": "§24 — Jordan–Zassenhaus finiteness",
            "details": [
              {
                "id": "concepts",
                "label": "concepts",
                "type": "list",
                "text": "left order/left multiplier ring $O_l(M)$"
              }
            ],
            "setting": "Fix the order $\\Lambda=\\mathbb{Z}S_n$ and a rank $r$.",
            "condition": "Read the Jordan–Zassenhaus (not proved) theorem and rewrite its hypotheses specifically for $\\mathbb{Z}S_n$-lattices.",
            "result": "Checkpoint: state precisely why there are only finitely many isomorphism classes of $\\mathbb{Z}S_n$-lattices of a fixed $\\mathbb{Z}$-rank. Also explain why this does not imply finite representation type when rank varies. \\cite[(24.2)]{CR81}\nlocal version:\\cite[(24.7)]{CR81}",
            "proofSketch": "Use this as the finiteness guarantee for bounded-rank classification projects.",
            "citationKeys": [
              "CR81"
            ],
            "color": "#8b3a2a",
            "fillColor": "#f7f5f1",
            "x": 125.4,
            "y": 303
          },
          {
            "id": "n3",
            "type": "object",
            "label": "§27 — Group rings and maximal orders",
            "details": [
              {
                "id": "setting",
                "label": "setting",
                "type": "textbox",
                "text": "Place $\\mathbb{Z}S_n$ inside the semisimple algebra $\\mathbb{Q}S_n$ and compare the integral group ring with maximal orders."
              },
              {
                "id": "condition",
                "label": "condition",
                "type": "textbox",
                "text": "Read the beginning of §27 and write the statement of Theorem 27.1. Record what changes when one passes from the nonmaximal order $\\mathbb{Z}S_n$ to a maximal order in $\\mathbb{Q}S_n$."
              },
              {
                "id": "result",
                "label": "result",
                "type": "textbox",
                "text": "Checkpoint: identify which part of the difficulty of integral representation theory comes from $\\mathbb{Z}S_n$ generally not being maximal. \\cite[§27, p. 559; Thm. 27.1]{CR81}"
              },
              {
                "id": "proof-sketch",
                "label": "proof sketch",
                "type": "textbox",
                "text": "This is the structural bridge from general orders to the arithmetic of integral group rings."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "CR81"
            ],
            "color": "#46786e",
            "fillColor": "#eef7f4",
            "x": 443,
            "y": 61.6
          },
          {
            "id": "n4",
            "type": "object",
            "label": "§30 — Local theory",
            "details": [
              {
                "id": "setting",
                "label": "setting",
                "type": "textbox",
                "text": "For each prime $p$, pass from $L$ to the local lattice $L_p=\\mathbb{Z}_p\\otimes_{\\mathbb{Z}}L$ over $\\mathbb{Z}_pS_n$."
              },
              {
                "id": "condition",
                "label": "condition",
                "type": "textbox",
                "text": "Begin with primes $p\\mid n!$. For each such $p$, write a Sylow $p$-subgroup of $S_n$, compute the reduction of a sample lattice modulo $p$, and note which local invariants remain visible."
              },
              {
                "id": "result",
                "label": "result",
                "type": "textbox",
                "text": "Checkpoint: explain why the integral classification is attacked prime by prime and why primes dividing $|S_n|=n!$ are the essential ones. \\cite[§30, p. 603]{CR81}"
              },
              {
                "id": "proof-sketch",
                "label": "proof sketch",
                "type": "textbox",
                "text": "Use the local theory as the computational layer before attempting global isomorphism classification."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "CR81"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 402.6,
            "y": 274.6
          },
          {
            "id": "n5",
            "type": "definition",
            "label": "§31 — Genus and local-to-global classification",
            "setting": "Compare two $\\mathbb{Z}S_n$-lattices $L$ and $M$ through their localizations $L_p$ and $M_p$.",
            "condition": "Write the definition of genus from §31A. Then separate two questions: which local types occur, and how many global isomorphism classes occur inside one genus.",
            "result": "Checkpoint: state the genus relation and summarize the role of Roiter's theorem in the local-to-global program. \\cite[§31, p. 642; §31A, p. 643; §31C, p. 659]{CR81}",
            "proofSketch": "Classification by genus is the natural organization once the local $\\mathbb{Z}_pS_n$-types are known.",
            "citationKeys": [
              "CR81"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 612.3,
            "y": 215.1
          },
          {
            "id": "n6",
            "type": "property",
            "label": "§32 — Projective lattices over group rings",
            "details": [
              {
                "id": "setting",
                "label": "setting",
                "type": "textbox",
                "text": "Restrict the classification problem to projective $\\mathbb{Z}S_n$-lattices."
              },
              {
                "id": "condition",
                "label": "condition",
                "type": "textbox",
                "text": "Read the local and global cases separately, then compare the character information afforded by projective lattices."
              },
              {
                "id": "result",
                "label": "result",
                "type": "textbox",
                "text": "Checkpoint: write Swan's theorem in the form used here, identify the local-to-global input, and record which projective-lattice invariants are computable for $S_n$. \\cite[§32, p. 670; §32A, p. 671; §32B, p. 676; §32C, p. 679]{CR81}"
              },
              {
                "id": "proof-sketch",
                "label": "proof sketch",
                "type": "textbox",
                "text": "This gives a structured subclass where the general local/global machinery becomes concrete."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "CR81"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 564.4,
            "y": 422.9
          },
          {
            "id": "n7",
            "type": "theorem",
            "label": "§33 — Finite representation type",
            "setting": "Now allow the rank of indecomposable $\\mathbb{Z}S_n$-lattices to vary.",
            "condition": "Read the group-ring criterion in §33A and the finite-type machinery in §33B. Apply it to the Sylow subgroups of $S_n$.",
            "result": "Concrete answer: the finite-type criterion gives finite integral representation type for $S_n$ exactly when $n\\le 3$. For $n\\ge 4$, verify directly that $V_4=\\{1,(12)(34),(13)(24),(14)(23)\\}\\le S_n$, so the 2-local structure is noncyclic. \\cite[§33, p. 686; §33A, p. 687; §33B, p. 691]{CR81}",
            "proofSketch": "Checkpoint: distinguish carefully between Jordan–Zassenhaus fixed-rank finiteness and finite representation type across all ranks.",
            "citationKeys": [
              "CR81"
            ],
            "color": "#3d6b4f",
            "fillColor": "#f4f7ed",
            "x": 267.5,
            "y": 440.6
          },
          {
            "id": "n8",
            "type": "example",
            "label": "§34 — Explicit integral representations",
            "setting": "Use §34 to turn the structural theory into explicit classifications and calculations.",
            "condition": "First inspect the extension constructions in §34A. For $S_3$, use $S_3\\cong D_6$ and study the dihedral calculations in §34E. For $n\\ge 4$, treat these examples as models for restricted classification problems rather than expecting a finite list of all indecomposables.",
            "result": "Checkpoint: carry out at least one explicit lattice calculation from §34 and write which ingredients came from §23, §30, §31, and §33. \\cite[§34, p. 711; §34A, p. 712; §34E, p. 755]{CR81}",
            "proofSketch": "End goal: formulate a manageable $S_n$ project by fixing rank, rational type, genus, or a structured family such as projective or permutation lattices.",
            "citationKeys": [
              "CR81"
            ],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 417.3,
            "y": 570.9
          }
        ],
        "arrows": [
          {
            "id": "a1",
            "sourceId": "n1",
            "targetId": "n2",
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
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a2",
            "sourceId": "n1",
            "targetId": "n3",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0.1,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a3",
            "sourceId": "n3",
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
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a4",
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
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a6",
            "sourceId": "n5",
            "targetId": "n6",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": -0.1,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a7",
            "sourceId": "n2",
            "targetId": "n7",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0.1,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a8",
            "sourceId": "n4",
            "targetId": "n7",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": -0.1,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a9",
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
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a10",
            "sourceId": "n6",
            "targetId": "n8",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0.1,
            "labelOffset": 0,
            "labelPosition": 0.5,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          }
        ],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 620,
          "canvasRatioLocked": true,
          "canvasAspectRatio": 1.2129
        }
      }
    }
  ],
  "arrows": [
    {
      "id": "a1",
      "sourceId": "n1",
      "targetId": "n2",
      "label": "integral equivalence",
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
      "id": "a2",
      "sourceId": "n2",
      "targetId": "n3",
      "label": "order viewpoint",
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
      "id": "a3",
      "sourceId": "n1",
      "targetId": "n4",
      "label": "canonical lattice",
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
      "id": "a4",
      "sourceId": "n2",
      "targetId": "n5",
      "label": "computable invariants",
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
      "id": "a5",
      "sourceId": "n4",
      "targetId": "n5",
      "label": "Gram/dual data",
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
      "id": "a6",
      "sourceId": "n3",
      "targetId": "n6",
      "label": "finiteness setting",
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
      "id": "a7",
      "sourceId": "n5",
      "targetId": "n6",
      "label": "finite search",
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
      "id": "a8",
      "sourceId": "n6",
      "targetId": "n7",
      "label": "localize",
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
      "id": "a9",
      "sourceId": "n7",
      "targetId": "n8",
      "label": "work over Z_p",
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
      "id": "a10",
      "sourceId": "n8",
      "targetId": "n9",
      "label": "reduce mod p",
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
      "id": "a11",
      "sourceId": "n4",
      "targetId": "n9",
      "label": "Specht reduction",
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
      "id": "a12",
      "sourceId": "n5",
      "targetId": "n10",
      "label": "test invariants",
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
      "id": "a13",
      "sourceId": "n9",
      "targetId": "n10",
      "label": "mod-p constraints",
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
      "id": "a14",
      "sourceId": "n10",
      "targetId": "n11",
      "label": "exterior powers",
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
      "id": "a15",
      "sourceId": "n4",
      "targetId": "n11",
      "label": "hook Specht modules",
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
      "id": "a16",
      "sourceId": "n7",
      "targetId": "n12",
      "label": "local framework",
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
      "id": "a17",
      "sourceId": "n8",
      "targetId": "n12",
      "label": "lattice chains",
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
      "id": "a18",
      "sourceId": "n9",
      "targetId": "n12",
      "label": "subquotients",
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
      "id": "a19",
      "sourceId": "n10",
      "targetId": "n12",
      "label": "Craig–Plesken case",
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
      "id": "a20",
      "sourceId": "n11",
      "targetId": "n13",
      "label": "higher hooks",
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
      "sourceId": "n12",
      "targetId": "n13",
      "label": "classification machinery",
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
      "id": "a22",
      "sourceId": "n7",
      "targetId": "n14",
      "label": "local-to-global",
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
      "id": "a23",
      "sourceId": "n13",
      "targetId": "n14",
      "label": "patch representatives",
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
      "id": "a24",
      "sourceId": "n14",
      "targetId": "n15",
      "label": "generalize carefully",
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
    "selectedId": "n18",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 921,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 0.8165,
    "relativeNodePositions": {
      "n1": {
        "x": 0.6343,
        "y": 0.0586
      },
      "n2": {
        "x": 0.1682,
        "y": 0.0586
      },
      "n3": {
        "x": 0.1184,
        "y": 0.4459
      },
      "n4": {
        "x": 0.8632,
        "y": 0.3403
      },
      "n5": {
        "x": 0.2638,
        "y": 0.3744
      },
      "n6": {
        "x": 0.7256,
        "y": 0.4123
      },
      "n7": {
        "x": 0.2964,
        "y": 0.5231
      },
      "n8": {
        "x": 0.9274,
        "y": 0.4935
      },
      "n9": {
        "x": 0.4595,
        "y": 0.5935
      },
      "n10": {
        "x": 0.0638,
        "y": 0.7688
      },
      "n11": {
        "x": 0.5038,
        "y": 0.7529
      },
      "n12": {
        "x": 0.6346,
        "y": 0.9292
      },
      "n13": {
        "x": 0.8193,
        "y": 0.5808
      },
      "n14": {
        "x": 0.3109,
        "y": 0.8841
      },
      "n15": {
        "x": 0.8221,
        "y": 0.7502
      },
      "n17": {
        "x": 0.4401,
        "y": 0.3119
      },
      "n18": {
        "x": 0.6075,
        "y": 0.2308
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
      "key": "CR81",
      "author": "Curtis, Charles W.; Reiner, Irving",
      "title": "Methods of Representation Theory, Vol. I",
      "year": "1981",
      "citeKey": "CR81",
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
    }
  ]
};