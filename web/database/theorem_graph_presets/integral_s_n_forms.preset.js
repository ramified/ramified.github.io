// Save this file as theorem_graph_presets/integral_s_n_forms.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Integral S_n Forms", key: "integral_s_n_forms", file: "integral_s_n_forms.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.integral_s_n_forms = {
  "schemaVersion": 9,
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
      "x": 478.6,
      "y": 100.4
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
      "x": 102.7,
      "y": 82.6
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
      "x": 145.1,
      "y": 458.2
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
      "x": 540.2,
      "y": 233
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
      "x": 203.4,
      "y": 310.4
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
      "x": 574.1,
      "y": 323.3
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
      "x": 125,
      "y": 580.1
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
      "x": 536.3,
      "y": 507
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
      "x": 593.8,
      "y": 646.9
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
      "x": 92.4,
      "y": 734.6
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
      "x": 389.3,
      "y": 757.4
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
      "x": 400.1,
      "y": 920.2
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
      "x": 697.1,
      "y": 742.5
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
      "x": 144.8,
      "y": 898
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
      "x": 606.9,
      "y": 849.3
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
      "x": 351.9,
      "y": 488.7,
      "childGraph": {
        "title": "my graph",
        "nodes": [
          {
            "id": "n16",
            "type": "theorem",
            "label": "Jordan--Zassenhaus",
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a4d9b",
            "fillColor": "#f4f1f8",
            "x": 580.7,
            "y": 308.4
          },
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
          },
          {
            "id": "n18",
            "type": "misc",
            "label": "maximal order",
            "details": [],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 570.2,
            "y": 187.4
          }
        ],
        "arrows": [
          {
            "id": "a1",
            "sourceId": "n18",
            "targetId": "n16",
            "label": "",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "hook",
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
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 560,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 1.7143
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
    "selectedId": "n1",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 1191,
    "canvasRatioLocked": false,
    "canvasAspectRatio": 0.6935,
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