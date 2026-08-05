// Save this file as theorem_graph_presets/fukaya_categories_of_surfaces.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Fukaya Categories of Surfaces", key: "fukaya_categories_of_surfaces", file: "fukaya_categories_of_surfaces.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.fukaya_categories_of_surfaces = {
  "schemaVersion": 9,
  "title": "Fukaya Categories of Surfaces",
  "titleNode": {
    "id": "__title__",
    "type": "title",
    "label": "Fukaya Categories of Surfaces",
    "details": [
      {
        "id": "link",
        "label": "link",
        "type": "textbox",
        "text": "\\cite{ChatGPT}"
      }
    ],
    "setting": "",
    "condition": "",
    "result": "",
    "proofSketch": "",
    "citationKeys": [
      "ChatGPT"
    ],
    "color": "#8b5f2a",
    "fillColor": "#fff7df"
  },
  "nodes": [
    {
      "id": "n1",
      "type": "misc",
      "label": "Entry diagnostic",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Set the difficulty correctly. You already know symplectic and Lagrangian definitions, but Hamiltonian isotopy, Floer theory, and A-infinity categories are new.\n\\cite{Auroux13}"
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Derive X_H for H(x,y)=x^2+y^2 on (R^2, dx∧dy)\n- [x] Compute homology of a three-term chain complex\n- [x] Write the path algebra of 1→2→3 and one representation\n- [x] basic Morse theory"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "Skip only the items you can do without notes."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "30–60 minutes"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Auroux13"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 527.2,
      "y": 93.4
    },
    {
      "id": "n3",
      "type": "misc",
      "label": "Symplectic surfaces",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Exploit the special simplification in real dimension two: a symplectic form is an area form compatible with an orientation."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Check that f(x,y) dx∧dy is symplectic exactly when f never vanishes\n- [x] Describe standard area forms on disk, annulus, torus, and pair of pants\n- [x] Identify exact and non-exact examples"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "Given an oriented surface with an area form, you can state what is genuinely symplectic and what is merely topological. (I guess all are merely topological...)"
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "2 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 299.5,
      "y": 93.4
    },
    {
      "id": "n4",
      "type": "misc",
      "label": "Lagrangian curves and arcs",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Translate Lagrangian geometry into immersed or embedded one-dimensional curves, with endpoints allowed at marked boundary data."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Draw transverse intersections of two arcs\n- [x] Practice perturbing curves into transverse position"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "A curve is automatically Lagrangian in dimension two, but a Fukaya object may additionally require a grading, sign data, a local system, and exactness or unobstructedness conditions. These determine degrees, signs, coefficients and whether Floer operations are well-defined."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "2 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 212,
      "y": 302.2
    },
    {
      "id": "n5",
      "type": "misc",
      "label": "Hamiltonian flow and isotopy",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Rebuild Hamiltonian dynamics from the equation ι_{X_H}ω = -dH and understand Hamiltonian isotopy as the allowed motion of Lagrangians."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Compute Hamiltonian vector fields for H=x, H=y, and H=(x^2+y^2)/2\n- [x] Sketch their flows in R^2\n- [x] Move an arc by a compactly supported Hamiltonian and track intersections (checked on S^2)\n- [x] Compare Hamiltonian isotopy with arbitrary smooth isotopy (checked on S^2)"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can derive X_H, integrate a simple flow, and say why Floer theory is expected to be invariant under Hamiltonian isotopy."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        },
        {
          "id": "cite",
          "label": "cite",
          "type": "textbox",
          "text": "\\cite{volk2025}"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "volk2025"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 109.2,
      "y": 139.9
    },
    {
      "id": "n6",
      "type": "misc",
      "label": "Exactness, action, grading",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Learn the extra data that makes surface computations clean: primitives, exact Lagrangians, line fields, and Maslov-type gradings."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] For ω=dλ, test whether λ|_L is exact\n- [ ] Relate differences of primitives to areas of bigons\n- [ ] Assign relative degrees to intersection points in a simple graded disk example"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can state what exactness prevents and why a line field is used to grade curves on a surface."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "3–4 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 94.2,
      "y": 367.1
    },
    {
      "id": "n9",
      "type": "misc",
      "label": "perfect complex",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Understand shifts, cones, perfect complexes, and why Fukaya categories are usually compared only after passing to twisted or derived completions."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Construct the cone of a map of complexes\n- [x] Interpret a short exact sequence as a triangle\n- [x] Compute a simple perfect complex over kA2"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain what Perf(A) means and why mapping cones encode extensions."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 672.5,
      "y": 260.3,
      "childGraph": {
        "title": "perfect complex",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 1317,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 0.5718
        }
      }
    },
    {
      "id": "n10",
      "type": "misc",
      "label": "$A_\\infty$ intuition",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Learn the meaning, not every sign: μ1 is a differential, μ2 is composition, μ3 measures associativity up to homotopy, and higher μk impose coherent corrections."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Write the A-infinity relations for n=1,2,3 schematically\n- [x] Identify the ordinary dg case where μk=0 for k≥3 (remove in future)\n- [x] Relate μk to polygons with k+1 sides"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can describe why strict associativity is replaced by coherent higher operations and read formulas without panicking over signs."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        },
        {
          "id": "examples",
          "label": "examples",
          "type": "checkbox",
          "text": "- [x] $\\Omega X$ is an $A_{\\infty}$ space\n- [x] Associative algebra\n- [x] Associative dg algebra$=A_{\\infty}$ with $m_i=0$ for $i>2$\n- [x] Hochschild cocycles $=A_{\\infty}$ on $B \\otimes k[\\epsilon]$ lifting multiplications\n- [x] Kadeishvili's theorem: the homology algebra of an dg algebra is an $A_{\\infty}$ algebra"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 669.6,
      "y": 467
    },
    {
      "id": "n11",
      "type": "misc",
      "label": "Morse homology",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Use Morse homology as the finite-dimensional prototype for Floer theory."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Choose a Morse function on S^1 or S^2\n- [x] Generate a complex by critical points\n- [x] Count gradient trajectories in a simple example\n- [x] Check why broken trajectories imply d^2=0\n- [ ] relate Morse homology with cellular homology, e.p. identify the number of broken trajectories with the degree of gluing map"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can tell the Floer story by replacing critical points with intersections and gradient lines with holomorphic strips."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "3 sessions"
        },
        {
          "id": "examples",
          "label": "examples",
          "type": "checkbox",
          "text": "- [x] $\\mathbb{S}^2$\n- [x] $\\mathbb{T}^2$\n- [x] $\\mathbb{RP}^n$"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 518.2,
      "y": 222.1
    },
    {
      "id": "n12",
      "type": "misc",
      "label": "Floer cochains $CF(L_0,L_1)$",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Build the morphism complex from transverse intersection points of two Lagrangian curves."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Draw two transverse arcs and list generators\n- [ ] Assign relative degrees in a simple graded example\n- [ ] State the hypotheses that keep the complex finite and unobstructed"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "Given two suitable curves, you can write the underlying graded vector space CF(L0,L1)."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "2–3 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 333.8,
      "y": 359.4
    },
    {
      "id": "n13",
      "type": "misc",
      "label": "Bigon differential",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "In dimension two, replace abstract holomorphic-strip analysis with combinatorial counting of immersed bigons whenever the setup permits."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Find all embedded bigons between two curves\n- [ ] Determine their input and output corners\n- [ ] Compute a differential over F2\n- [ ] Check d^2=0 by pairing broken configurations"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can calculate HF(L0,L1) for a small drawing by hand."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 558,
      "y": 329
    },
    {
      "id": "n14",
      "type": "misc",
      "label": "Hamiltonian invariance",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Understand continuation maps and the principle that Hamiltonian motion changes the chain model but not Floer cohomology."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Create and cancel a pair of intersections by an isotopy\n- [ ] Compare the two complexes before and after the move\n- [ ] Explain the role of continuation maps at a conceptual level"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can distinguish geometric intersection count from Hamiltonian-isotopy-invariant Floer cohomology."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "2–3 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 392.2,
      "y": 464.8
    },
    {
      "id": "n22",
      "type": "misc",
      "label": "Arc systems as generators",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Understand why a full arc system can generate the partially wrapped category after taking shifts, cones, and summands."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Cut the surface along the arcs and inspect the polygonal pieces\n- [ ] Form the direct sum of generating arcs\n- [ ] Compute its endomorphism A-infinity algebra"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can state the strategy: choose arcs, compute End(G), then replace geometry by Perf(End(G))."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "3 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 672.5,
      "y": 620.8
    },
    {
      "id": "n23",
      "type": "misc",
      "label": "Extract a gentle algebra",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Read a graded gentle quiver with relations from an arc dissection."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Assign vertices to generating arcs\n- [x] Assign arrows from oriented corners\n- [x] Write quadratic zero relations from forbidden compositions\n- [ ] Check the gentle local conditions"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "Given a small dissection, you can write its quiver and relations."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 672.5,
      "y": 820.8
    },
    {
      "id": "n24",
      "type": "misc",
      "label": "Curves = objects; crossings = morphisms",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Use the geometric model for derived categories of gentle algebras: curves represent indecomposables and intersections represent morphisms."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Translate several strings into arcs\n- [ ] Find a closed curve corresponding to band-type data\n- [ ] Count intersections to predict morphism dimensions"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can move between a curve picture and an indecomposable object in the gentle derived category."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 550.5,
      "y": 739.8
    },
    {
      "id": "n25",
      "type": "misc",
      "label": "Cones = smoothing crossings",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Interpret mapping cones and extensions by resolving intersections of curves."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Choose one crossing of two curves\n- [ ] Draw both smoothings\n- [ ] Compare the smoothing picture with a cone triangle"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain geometrically why derived-category operations are visible on the surface."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "3 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 343.4,
      "y": 865.5
    },
    {
      "id": "n26",
      "type": "misc",
      "label": "Cluster algebras from surfaces",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Review the Fomin-Shapiro-Thurston dictionary: tagged arcs, triangulations, exchange matrices, and surface cluster variables."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [x] Construct a quiver from an unpunctured triangulated polygon\n- [ ] Compute one exchange relation\n- [ ] Identify compatible arcs with a cluster"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can recover the surface quiver and cluster combinatorics from a triangulation."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "3–5 sessions"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 79.5,
      "y": 507.8
    },
    {
      "id": "n28",
      "type": "misc",
      "label": "Keep three bridges distinct",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Avoid a common conceptual mistake: the surface cluster algebra, the partially wrapped Fukaya/gentle derived category, and a 2-Calabi-Yau cluster category are related but are not literally the same object."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Write one sentence defining each of the three constructions\n- [ ] Record what arcs represent in each construction\n- [ ] Record what mutation, cone, and wrapping mean in their own settings"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can state precisely which equivalence or analogy you are using at each step."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 session"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 276.5,
      "y": 682.5
    },
    {
      "id": "n29",
      "type": "misc",
      "label": "cluster categorification",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Add quivers with potential, Ginzburg dg algebras, and 2-Calabi-Yau cluster categories only after the surface Fukaya examples are comfortable."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Read the definition of a quiver with potential\n- [ ] See how the Ginzburg dg algebra enters categorification\n- [ ] Compare categorical mutation with surface flips"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain the extra categorical layer connecting quiver mutation to derived and cluster categories."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1–2 weeks, optional"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 82.8,
      "y": 705.4
    },
    {
      "id": "n30",
      "type": "misc",
      "label": "disk computation",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Produce a complete worked note for a stopped disk: objects, morphisms, differential, products, generator, quiver, and derived equivalence."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Draw the surface and arc system cleanly\n- [ ] Write every nonzero morphism and product\n- [ ] Identify the type-A algebra\n- [ ] Explain convention-dependent indexing"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can teach this example from the picture without consulting a reference."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 354.1,
      "y": 749.1
    },
    {
      "id": "n31",
      "type": "misc",
      "label": "annulus computation",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Compute a small stopped annulus example and match geometric curves with string/band behavior of a gentle algebra."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Choose stops and a full arc system\n- [ ] Extract the gentle quiver with relations\n- [ ] Classify several indecomposable curve objects\n- [ ] Compute sample morphisms by intersections"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain what new phenomena appear when π1 is nontrivial."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1–2 weeks"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 627.8,
      "y": 932.1
    },
    {
      "id": "n32",
      "type": "misc",
      "label": "flip and mutation",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Compare one local triangulation flip from three viewpoints: surface cluster combinatorics, change of generators, and derived categorical operations."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Draw both triangulations\n- [ ] Mutate the quiver\n- [ ] Relate the replaced arc to a cone or exchange triangle\n- [ ] State carefully which category each statement belongs to"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can navigate the cluster/Fukaya bridge without conflating the constructions."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "1 week"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#7a4d9b",
      "fillColor": "#f4f1f8",
      "x": 107.8,
      "y": 851.7
    },
    {
      "id": "n33",
      "type": "misc",
      "label": "Read the surface-category papers",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "After computations, read selected sections of the main papers rather than attempting them linearly from page one."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [?] Auroux: Floer complexes, products, Fukaya-category overview\\cite{Auroux13}(more analysis)\n- [ ] HKK: elementary surface category and arc generators\\cite[Section 3]{HKK17}\n- [ ] Lekili-Polishchuk: surface from a gentle algebra and equivalence statement\\cite{LP20}\n- [ ] Opper-Plamondon-Schroll: curves, morphisms, and cones\\cite{OPS18}"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can locate your hand computations inside the general theorems and identify which technical hypotheses you have suppressed."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "2–3 weeks, selective reading"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Auroux13",
        "HKK17",
        "LP20",
        "OPS18"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 257.2,
      "y": 977.6
    },
    {
      "id": "n34",
      "type": "misc",
      "label": "Optional: closed surfaces or orbifolds",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Branch only after the core route: closed higher-genus surfaces require different care; orbifold surfaces connect to skew-gentle and type-D phenomena."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Read Abouzaid \\cite{Abouzaid07} for combinatorial closed-surface Fukaya categories\n- [ ] Try a genus-two curve configuration\n- [ ] For representation theory, sample the orbifold-disk/type-D story"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain which new analytic or algebraic issues are absent in the stopped-boundary examples."
        },
        {
          "id": "pace",
          "label": "suggested pace",
          "type": "textbox",
          "text": "Optional research branch"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Abouzaid07"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 497.3,
      "y": 977.6
    },
    {
      "id": "n35",
      "type": "misc",
      "label": "stable submanifold",
      "details": [
        {
          "id": "link",
          "label": "link",
          "type": "textbox",
          "text": "https://chatgpt.com/c/6a64c762-afc8-83eb-a43c-fa5755ee84a8"
        },
        {
          "id": "examples",
          "label": "examples",
          "type": "checkbox",
          "text": "- [x] $\\mathbb{S}^2$\n- [x] $\\mathbb{T}^2$\n- [ ] $\\mathbb{RP}^n$"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 322.4,
      "y": 207
    },
    {
      "id": "n36",
      "type": "misc",
      "label": "Triangulation Flips and Surface-Quiver Mutation",
      "details": [
        {
          "id": "link",
          "label": "link",
          "type": "textbox",
          "text": "\\cite{FST08}\nhttps://chatgpt.com/share/6a6b8b81-ff54-83eb-8d0f-9c088e0a90e9"
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "FST08"
      ],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 232.8,
      "y": 519,
      "childGraph": {
        "title": "Triangulation Flips and Surface-Quiver Mutation",
        "nodes": [
          {
            "id": "n1",
            "type": "definition",
            "label": "1. Marked surfaces",
            "details": [
              {
                "id": "alias",
                "label": "alias",
                "type": "list",
                "text": "bordered surface\nciliated surface(纤毛虫)"
              },
              {
                "id": "invariants",
                "label": "invariants",
                "type": "textbox",
                "text": "$(g,b,p)$"
              }
            ],
            "setting": "Read Section 2, Definition 2.1.",
            "condition": "Know what the pair (S,M) records: an oriented bordered surface, boundary marked points, and punctures.",
            "result": "You can recognize the geometric objects on which ideal triangulations are defined.",
            "proofSketch": "Draw three examples: a pentagon, an annulus with marked boundary points, and a once-punctured triangle. For a first pass, use the pentagon and postpone punctures.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 294.3,
            "y": 54
          },
          {
            "id": "n2",
            "type": "definition",
            "label": "2. Arcs and compatibility",
            "setting": "Read Definitions 2.2 and 2.4.",
            "condition": "Distinguish an arc from a boundary segment, and remember that arcs are considered up to isotopy.",
            "result": "You can decide when two arcs are compatible: they can be represented without interior intersections.",
            "proofSketch": "In a pentagon, list several diagonals and mark which pairs cross. Compatible pairs are exactly the noncrossing pairs.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 526.7,
            "y": 54
          },
          {
            "id": "n3",
            "type": "definition",
            "label": "3. Ideal triangulations",
            "setting": "Read Definition 2.6 and glance at Figure 1.",
            "condition": "Understand maximality: an ideal triangulation is a maximal collection of pairwise compatible arcs.",
            "result": "You can identify the internal arcs of a triangulation and the ideal triangles they bound.",
            "proofSketch": "Triangulate a pentagon in two different ways. Note that boundary segments are sides of triangles but are not arcs of the triangulation.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 335.9,
            "y": 152.6
          },
          {
            "id": "n4",
            "type": "example",
            "label": "4. Polygon warm-up",
            "setting": "Use the unpunctured pentagon as a model; compare with the polygon examples in Sections 2 and 3.",
            "condition": "Avoid self-folded triangles during the first pass.",
            "result": "You see that a triangulation is local combinatorial data, not a rigid geometric drawing.",
            "proofSketch": "Label all internal arcs. Redraw the same arcs by isotopy and check that the triangulation has not changed.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 549.5,
            "y": 216.4
          },
          {
            "id": "n5",
            "type": "definition",
            "label": "5. Triangulation flip",
            "setting": "Read Definition 3.5 and the paragraph immediately following it.",
            "condition": "For a flippable arc $\\gamma$, removing $\\gamma$ produces a quadrilateral; the replacement gamma' is its other diagonal.",
            "result": "You can construct $T'$ from $T$ by one local flip and know why a folded side is exceptional.",
            "proofSketch": "In your pentagon, flip one diagonal. Keep the labels of all unchanged arcs and give the new diagonal the old position label $k$.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 315.4,
            "y": 272.7
          },
          {
            "id": "n6",
            "type": "definition",
            "label": "6. Signed adjacency matrix",
            "setting": "Read Definition 4.1; for the unpunctured case, ignore the map pi_T and use the clockwise rule triangle by triangle.",
            "condition": "Rows and columns are indexed by internal arcs. Each non-self-folded triangle contributes entries 0, +1, or -1.",
            "result": "You can compute B(T) by summing the local signed contributions of the triangles.",
            "proofSketch": "Compute B(T) for a triangulated pentagon. Check that it is skew-symmetric. Then recompute after the flip from Node 5.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 520.7,
            "y": 341.7
          },
          {
            "id": "n8",
            "type": "definition",
            "label": "8. Matrix and quiver mutation",
            "setting": "Read Definition 4.7. Interpret its formula as quiver mutation at the vertex k.",
            "condition": "In quiver language: add arrows along every path i -> k -> j, reverse arrows incident with k, then cancel oriented 2-cycles.",
            "result": "You can compute mu_k(B) and the corresponding mutated quiver without referring to the surface.",
            "proofSketch": "Mutate the matrix and quiver from Node 6 at the label k of the flipped diagonal. Verify that the two calculations agree.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 488.7,
            "y": 465.3
          },
          {
            "id": "n9",
            "type": "proposition",
            "label": "9. Flip equals mutation",
            "setting": "Read Proposition 4.8 and its short proof.",
            "condition": "$T'$ is obtained from $T$ by flipping the arc labeled $k$; all other arc labels remain fixed.",
            "result": "The central statement is $B(T') = \\mu_k(B(T))$, equivalently $Q(T') = \\mu_k(Q(T))$ after fixing the matrix-to-quiver convention.",
            "proofSketch": "Compare only the two triangles adjacent to $k$. Everything outside that local region contributes identically before and after the flip.",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 273.2,
            "y": 550
          },
          {
            "id": "n10",
            "type": "example",
            "label": "10. Local mastery check",
            "setting": "Work with a quadrilateral whose sides are labeled a,b,c,d and whose diagonal is k.",
            "condition": "Compute both routes independently: flip k and rebuild the quiver; mutate Q(T) at k.",
            "result": "You understand the concept when the two resulting quivers agree and you can explain the cancellation of 2-cycles.",
            "proofSketch": "Repeat with one or more boundary sides omitted. Then revisit self-folded triangles and the pi_T convention only if your application involves punctures.",
            "citationKeys": [],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 491.4,
            "y": 606.3
          },
          {
            "id": "n11",
            "type": "example",
            "label": "triangulations for type E",
            "details": [
              {
                "id": "question",
                "label": "question",
                "type": "textbox",
                "text": "In https://arxiv.org/pdf/math/0608367, the paper gives the triangulations for type A and D. Do you know if any triangulations for type E exist?"
              },
              {
                "id": "answer",
                "label": "answer",
                "type": "textbox",
                "text": "**Yes and no.**\n\nIn the strict sense used by Fomin–Shapiro–Thurston—ideal or tagged triangulations of a bordered surface with marked points—**there is no model for finite types (E_6,E_7,E_8)**. The paper explicitly notes that the exceptional (E)-types do not arise from triangulated surfaces. Among finite simply-laced types, the surface construction gives (A_n) from an unpunctured ((n+3))-gon and (D_n) from a once-punctured (n)-gon. \n\nThere are, however, close **polygonal analogues**. Lisa Lamberti constructed a combinatorial model using coloured, oriented, single and paired diagonals:\n\n[\nE_6 \\leftrightarrow \\text{a 7-gon},\\qquad\nE_7 \\leftrightarrow \\text{a 10-gon},\\qquad\nE_8 \\leftrightarrow \\text{a 16-gon}.\n]\n\nFor (E_6), all (833) cluster-tilting sets are described as configurations of six compatible coloured diagonals in two heptagons, and many mutations appear as diagonal flips. \n\nThe important caveat is that these are **not ordinary triangulations**: the diagonals carry colours, orientations and pairing data, and “maximal non-crossing” by itself does not characterize every cluster. The (E_7) and (E_8) rules are considerably more complicated. Later work by Duan–Lamberti–Li extended this coloured-diagonal model to (m)-cluster categories and described compatibility through intersections of associated curves. \n\nSo the closest answer is:\n\n[\n\\boxed{\\text{No genuine FST surface triangulations for type }E,\\\n\\text{but coloured-diagonal polygon models do exist.}}\n]"
              },
              {
                "id": "link",
                "label": "link",
                "type": "textbox",
                "text": "https://chatgpt.com/share/6a6f7d3b-f2fc-83ed-b1dd-2262a0dde228"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 152.9,
            "y": 486.4
          },
          {
            "id": "n12",
            "type": "misc",
            "label": "7. Matrix-to-quiver dictionary",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Translate the skew-symmetric matrix B(T) into a quiver Q(T). Fix one convention: b_ij > 0 means b_ij arrows i -> j. Reversing this convention replaces every quiver by its opposite."
              },
              {
                "id": "target",
                "label": "target",
                "type": "textbox",
                "text": "Vertices are internal arcs. A triangle usually gives an oriented 3-cycle among its internal sides; boundary sides are omitted, and opposite arrows cancel."
              },
              {
                "id": "exercise",
                "label": "exercise",
                "type": "textbox",
                "text": "Draw Q(T) from the matrix computed in Node 6, and reconstruct the matrix from the quiver."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 307.4,
            "y": 380.7
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a2",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a5",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a8",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a9",
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
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a11",
            "sourceId": "n6",
            "targetId": "n12",
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
          },
          {
            "id": "a12",
            "sourceId": "n12",
            "targetId": "n8",
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
          },
          {
            "id": "a13",
            "sourceId": "n12",
            "targetId": "n11",
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
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 661,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 0.5718
        }
      }
    },
    {
      "id": "n37",
      "type": "misc",
      "label": "Surface Fukaya Computations",
      "details": [
        {
          "id": "purpose",
          "label": "purpose",
          "type": "textbox",
          "text": "A ten-node reading route through Grossack's paper, emphasizing computations rather than analytic foundations. Complete each node's checklist before following its outgoing arrows.\n\\cite{Grossack26}"
        },
        {
          "id": "convention",
          "label": "convention",
          "type": "list",
          "text": "Grossack’s convention: stops are forbidden points\n\nHKK-style convention: marked regions are allowed endpoints\n\ncircle always connected via points/edge/points/edge...\n\nbut be careful to distinguish Fukaya category with cluster category\n\nSo there is generally no mathematical contradiction. Grossack uses the forbidden-point convention, while many topological Fukaya and cluster-style papers use an allowed-endpoint convention, often after collapsing allowed boundary intervals to marked points."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "Grossack26"
      ],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 466.5,
      "y": 573.1,
      "childGraph": {
        "title": "Surface Fukaya Computations",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "Computational promise",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.1, pp. 1–2. Read for scope and the basic geometric–algebraic dictionary.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [x] State which partially wrapped/topological surface Fukaya category the paper is computing.\n- [x] Explain why surfaces with nonempty boundary admit a combinatorial model.\n- [x] Write the dictionary: curves = objects, intersections = morphisms, polygons = compositions and higher products."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can summarize the paper’s aim in three sentences without using analytic details."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 171.9,
            "y": 106
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "Marked surfaces and stops",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.2, pp. 2–3; Figures 1.1–1.2.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [x] Draw a marked surface and identify its stops.\n- [x] Explain positive wrapping and why the moving source curve stops at marked points.\n- [x] Distinguish an interior Hamiltonian perturbation from boundary wrapping.\n- [x] Predict when missing stops may create infinitely many wrapped intersections."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "Given two arcs near a boundary component, you can draw the perturbation used to compute a Hom space."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 561.5,
            "y": 71.8
          },
          {
            "id": "n3",
            "type": "misc",
            "label": "Generators and dissections",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.2, pp. 3–5; Figures 1.3–1.4.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [x] Restate the definitions of generating family and dissection in your own words.\n- [x] Dissect a stopped disk and a stopped annulus by hand.\n- [x] Check that each complementary polygon satisfies the one-boundary-edge(in fact, one stop) rule.\n- [ ] Explain why a dissection removes the ambiguity responsible for higher A-infinity products."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "Starting from a small marked surface, you can choose arcs that cut it into the required polygons."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 148.5,
            "y": 225.4
          },
          {
            "id": "n4",
            "type": "misc",
            "label": "Angles and quivers",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.3, pp. 5–6; Figures 1.5–1.6.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Turn each generating arc into a quiver vertex.\n- [ ] Turn each allowed boundary angle after wrapping into an arrow.\n- [ ] Assign its Z/2-degree from the relative orientations.\n- [ ] Decide when two angles compose and when the composition is zero.\n- [ ] Locate a closed polygon that would contribute a higher product.\nask AI for \"partially wrapped category\""
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "From a small dissection, you can write the graded quiver and its obvious zero relations."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#46786e",
            "fillColor": "#eef7f4",
            "x": 564.3,
            "y": 179.5
          },
          {
            "id": "n5",
            "type": "misc",
            "label": "Disk",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.3, pp. 6–7; Figure 1.7.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [x] Recover the A3 quiver from the disk with four stops.\n- [x] Explain why the quiver arrows are opposite to the displayed curve maps.(I think it is due to a bad notation)\n- [x] Identify the generating arcs with projective modules.\n- [x] Write the orange arc as a cone and simplify its two-term complex.\n- [x] Match resolution of an intersection with the corresponding cone."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can reproduce Figure 1.7 as both a surface computation and a module computation."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 164.5,
            "y": 354.1
          },
          {
            "id": "n6",
            "type": "misc",
            "label": "Closed curves and monodromy",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.3, pp. 7–8; Figures 1.8–1.9.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Explain why local systems on arcs can be suppressed but not on closed curves.\n- [ ] Represent a rank-r local system by monodromy M in GL_r(k).\n- [ ] Build the differential using identity matrices along ordinary angles and M on the closing angle.\n- [ ] Work out the rank-one annulus/Kronecker example before reading the larger matrix example."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "Given a closed curve following generating arcs, you can write the shape of its associated dg-module."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 560.4,
            "y": 332.5
          },
          {
            "id": "n7",
            "type": "misc",
            "label": "Intersections, Ext, resolutions",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "End of §1.3, pp. 8–9. Revisit Figures 1.7, 1.12, and 1.13 as needed.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Explain why an interior crossing supplies maps in both Hom directions.\n- [ ] Write the differential δf = δ_B f − (−1)^|f| f δ_A for a two-term example.\n- [ ] Identify a degree-one crossing whose cone is represented by resolving the crossing.\n- [ ] Explain how wrapping around a stopless boundary can produce countably many maps."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can pass between a drawn crossing, a cohomology class in Ext, and a cone/resolution picture."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 570.8,
            "y": 536.1
          },
          {
            "id": "n8",
            "type": "misc",
            "label": "Line fields and Z-gradings",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.4, pp. 9–10; Figures 1.10–1.11.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Interpret a line field both as a section of PTS and as a foliation.\n- [ ] Describe a grading on a curve as a homotopy from the line field to its tangent line.\n- [ ] Use Figure 1.10 to decide whether a closed curve admits a grading.\n- [ ] Compute one intersection degree by counting signed half-turns.\n- [ ] Verify that the two complementary intersection degrees sum to one."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can explain precisely what extra data upgrades the Z/2-graded model to a Z-graded one."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 557.3,
            "y": 707
          },
          {
            "id": "n9",
            "type": "misc",
            "label": "Punctured torus",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.5.1, pp. 11–12; Figure 1.12.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Reconstruct the two-vertex, three-arrow quiver from the generating curves.\n- [ ] Attach rank-one local systems with parameters λ and μ to the two closed curves.\n- [ ] Compute the Hom differential and identify the surviving Ext^1 generator.\n- [ ] Form its cone and match it with the geometrically resolved curve.\n- [ ] Repeat once in Z/2 grading and note what changes in the Z-graded version."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can reproduce the punctured-torus computation without copying the final Ext generator."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 157.5,
            "y": 518.7
          },
          {
            "id": "n10",
            "type": "misc",
            "label": "Pairs of pants and polygons",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "§1.5.2, pp. 12–14; Figures 1.13–1.14.\n\\cite{Grossack26}"
              },
              {
                "id": "focus",
                "label": "focus checklist",
                "type": "checkbox",
                "text": "- [ ] Compare the quivers for stopped and stopless boundary components.\n- [ ] Explain finite versus countably infinite morphism spaces in the examples.\n- [ ] Identify the triangle that invalidates naive simultaneous resolution of p and q.\n- [ ] Use the bigon to explain why one crossing becomes null-homologous after resolving the other.\n- [ ] Run the full workflow on one new genus-zero marked surface: dissect, extract the quiver, choose curves, compute a Hom, and interpret a cone."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can diagnose when polygon contributions make a naive curve-resolution rule fail."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "Grossack26"
            ],
            "color": "#2f5f9f",
            "fillColor": "#eef4fb",
            "x": 173.8,
            "y": 707
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
            "sourceId": "n2",
            "targetId": "n3",
            "label": "choose arcs",
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
            "id": "a3",
            "sourceId": "n3",
            "targetId": "n4",
            "label": "extract algebra",
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
            "body": "dashed",
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
            "id": "a5",
            "sourceId": "n4",
            "targetId": "n6",
            "label": "add monodromy",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0,
            "labelOffset": 0,
            "labelPosition": 0.6,
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a6",
            "sourceId": "n6",
            "targetId": "n7",
            "label": "compute Homs",
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
            "id": "a7",
            "sourceId": "n7",
            "targetId": "n8",
            "label": "refine degrees",
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
            "id": "a8",
            "sourceId": "n8",
            "targetId": "n9",
            "label": "",
            "remark": "",
            "body": "dashed",
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
            "labelAlign": "center-clear",
            "color": "#5f574e"
          },
          {
            "id": "a14",
            "sourceId": "n5",
            "targetId": "n9",
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
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 761,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 0.5718
        }
      }
    },
    {
      "id": "n38",
      "type": "misc",
      "label": "$A_\\infty$ from",
      "details": [
        {
          "id": "source",
          "label": "source",
          "type": "textbox",
          "text": "A six-node reading plan for §3 of \\cite{HKK17}. Main rule: do every type and degree check on one fixed marked disk before moving to the invariant/global constructions."
        },
        {
          "id": "method",
          "label": "working method",
          "type": "checkbox",
          "text": "- [ ] Keep one running notation sheet for objects, morphisms, degrees, and signs.\n- [ ] Maintain one explicit marked-disk example through Nodes 2–5.\n- [ ] Do not mark a node complete until you can compute, not merely paraphrase, its central construction."
        }
      ],
      "setting": "",
      "condition": "",
      "result": "",
      "proofSketch": "",
      "citationKeys": [
        "HKK17"
      ],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 522.2,
      "y": 498.6,
      "childGraph": {
        "title": "$A_\\infty$ from",
        "nodes": [
          {
            "id": "n1",
            "type": "misc",
            "label": "1. $A_\\infty$ conventions",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Read §3.1, pp. 269–271 of \\cite{HKK17}. For a slower algebraic pass, use §§3 and 7 of \\cite{Keller01}."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [x] Record the convention $|\\mu^d|=2-d$ and the reduced degree $\\|a\\|=|a|-1$.\n- [x] Expand equation (3.1) for $d=1,2,3$ and identify $({\\mu^1})^2=0$, Leibniz, and associativity up to the stated terms.\n- [x] Check the strict-unit formulas (3.2)–(3.4), including the sign in $\\mu^2(a,1_X)$.\n- [x] Write the data of an $A_\\infty$-functor and distinguish a strict functor from a general one.\n- [ ] Construct one twisted complex $(V,\\delta)$ and verify the Maurer–Cartan equation $\\sum_{k\\ge1}\\mu^k(\\delta,\\ldots,\\delta)=0$."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can type-check every term in (3.1) and explain why $H^0(\\operatorname{Tw}\\mathcal A)$ is the triangulated category used later."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17",
              "Keller01"
            ],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 253.7,
            "y": 80.2
          },
          {
            "id": "n2",
            "type": "misc",
            "label": "2. Marked surfaces and graded arcs",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Read §3.2, pp. 271–272 of \\cite{HKK17}."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [x] Draw a compact surface with corners and label $M\\subset\\partial S$ and $\\partial S\\setminus M$.\n- [x] Distinguish boundary arcs, internal arcs, arc systems, and full arc systems.\n- [ ] For a full arc system $\\mathcal A$, draw the dual ribbon graph $\\Gamma$ and its cyclic order at each vertex.\n- [ ] Compute one half-edge degree $d(h)$ from (3.15).\n- [ ] Verify $\\sum_{h\\to v}d(h)=\\operatorname{val}(v)-2$ for one polygon and explain the converse gluing construction."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "Given a small picture, you can recover both the graded arc system and the graded ribbon-graph data."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17"
            ],
            "color": "#46786e",
            "fillColor": "#eef7f4",
            "x": 575.7,
            "y": 223.9
          },
          {
            "id": "n3",
            "type": "misc",
            "label": "3. Objects, morphisms, $\\mu^1,\\mu^2$",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Read the opening of §3.3 on pp. 272–273 of \\cite{HKK17}, through the definition of composition."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [ ] On a marked disk, list the objects: the arcs $X\\in\\mathcal A$.\n- [ ] For each pair $(X,Y)$, list the boundary-path basis of $\\operatorname{Hom}(X,Y)$ and add $1_X$ only when $X=Y$.\n- [ ] Keep the types separate: $X$ is an object, while $1_X\\in\\operatorname{Hom}^0(X,X)$ is a morphism.\n- [ ] Compute $|a|=i_p(X,a)-i_q(Y,a)$ for at least two boundary paths.\n- [ ] Decide exactly when $a\\cdot b$ is a boundary path and verify $(-1)^{|a|}\\mu^2(b,a)=a\\cdot b$.\n- [ ] Check source, target, and degree for every nonzero $\\mu^2$ in your example."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can write the complete graded category underlying $\\mathcal F_{\\mathcal A}(S)$ for one polygon before any higher products are added."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 202.4,
            "y": 348.5
          },
          {
            "id": "n4",
            "type": "misc",
            "label": "4. Disk sequences and $\\mu^d$",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Read §3.3, pp. 273–275 of \\cite{HKK17}: (3.18)–(3.21), Lemma 3.1, Proposition 3.1, and the square/cylinder exceptions. Compare the polygon-counting picture in \\cite{Auroux14}."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [ ] Restate a disk sequence as the image of the marked boundary intervals of a mapped marked disk.\n- [ ] Type-check $\\mu^n(a_n,\\ldots,a_1b)=(-1)^{|b|}b$ and $\\mu^n(ba_n,\\ldots,a_1)=b$.\n- [ ] Set $b=1_{X_0}$ and derive the pure polygon formula $\\mu^n(a_n,\\ldots,a_1)=1_{X_0}$.\n- [ ] Prove Lemma 3.1 in your own words: the residual path in a disk factorization is unique.\n- [ ] For one composable sequence, list every potentially nonzero term in (3.1) and pair the cancellations used in Proposition 3.1.\n- [ ] Check the sign using $\\sum_i\\|a_i\\|=-2$ for a disk sequence.\n- [ ] Record why the square and cylinder require special treatment of $\\mu^2$."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "Without prose shortcuts, you can compute $\\mu^d$ on any sequence of basis morphisms by a finite case distinction."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17",
              "Auroux14"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 590,
            "y": 441.5
          },
          {
            "id": "n5",
            "type": "misc",
            "label": "5. From $\\mathcal F_{\\mathcal A}(S)$ to $\\mathcal F(S)$",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Finish §3.3, pp. 275–276 of \\cite{HKK17}: the disk calculation, Lemma 3.2, and Proposition 3.3. Revisit twisted objects in §7 of \\cite{Keller01}."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [ ] For a disk with $n$ marked components, verify (3.21) and identify $\\operatorname{Tw}\\mathcal F_{\\mathcal A}(S)$ with the derived category of the linearly oriented $A_{n-1}$ quiver.\n- [ ] Show explicitly how $n-1$ boundary arcs generate the remaining arc as a twisted complex.\n- [ ] Explain why adjoining one arc $Y$ gives a Morita equivalence (Lemma 3.2).\n- [ ] Separate quasi-equivalence of $A_\\infty$-categories from equivalence of their triangulated envelopes.\n- [ ] State the definition $\\mathcal F(S)\\simeq\\operatorname{Tw}\\mathcal F_{\\mathcal A}(S)$ and exactly in what sense it is independent of $\\mathcal A$."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can explain why the arc system is a computational presentation rather than part of the invariant category."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17",
              "Keller01"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 165,
            "y": 625.3
          },
          {
            "id": "n6",
            "type": "misc",
            "label": "6. Formality, localization, and gluing",
            "details": [
              {
                "id": "read",
                "label": "read",
                "type": "textbox",
                "text": "Read §§3.4–3.6, pp. 276–282 of \\cite{HKK17}. Use \\cite{PS19} for a broader local-to-global/topological Fukaya viewpoint."
              },
              {
                "id": "goals",
                "label": "focus goals",
                "type": "checkbox",
                "text": "- [ ] Turn a formal arc system into a graded quiver with quadratic monomial relations and prove $\\mu^d=0$ for $d\\ge3$ by excluding disk sequences.\n- [ ] Work one example of the quotient $\\mathcal A/E$ by adjoining $\\varepsilon$ of degree $-1$ with $\\mu^1(\\varepsilon)=1_E$.\n- [ ] Explain Proposition 3.6 geometrically: changing a boundary arc into marked boundary kills the corresponding object.\n- [ ] For the dual ribbon graph $G$, write the local categories $\\mathcal C_e$ and $\\mathcal C_v$ and the functors $\\mathcal C_e\\to\\mathcal C_v$.\n- [ ] State Theorem 3.1 as $\\mathcal F(S)$ being represented by the homotopy-colimit/global-sections construction on $G$.\n- [ ] Draw one final triangle of viewpoints: explicit polygonal $A_\\infty$ model $\\leftrightarrow$ formal quiver model $\\leftrightarrow$ cosheaf gluing, with localization handling missing boundary arcs."
              },
              {
                "id": "checkpoint",
                "label": "stop when",
                "type": "textbox",
                "text": "You can choose the appropriate model—polygon, quiver, quotient, or cosheaf—and explain why it computes the same Morita class."
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17",
              "PS19"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 474.8,
            "y": 669.6
          },
          {
            "id": "n7",
            "type": "misc",
            "label": "grading of surfaces and arcs",
            "details": [
              {
                "id": "ref",
                "label": "ref",
                "type": "textbox",
                "text": "\\cite{HKK17}"
              }
            ],
            "setting": "",
            "condition": "",
            "result": "",
            "proofSketch": "",
            "citationKeys": [
              "HKK17"
            ],
            "color": "#46786e",
            "fillColor": "#eef7f4",
            "x": 484.8,
            "y": 66.8
          }
        ],
        "arrows": [
          {
            "id": "a1",
            "sourceId": "n1",
            "targetId": "n3",
            "label": "$A_\\infty$ structure",
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
            "label": "geometric generators",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": -0.1,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a3",
            "sourceId": "n1",
            "targetId": "n4",
            "label": "relations and signs",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0.1,
            "labelOffset": 48.2,
            "labelPosition": 0.3,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a4",
            "sourceId": "n2",
            "targetId": "n4",
            "label": "immersed disks",
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
            "sourceId": "n3",
            "targetId": "n4",
            "label": "basis inputs",
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
            "id": "a6",
            "sourceId": "n3",
            "targetId": "n5",
            "label": "$\\operatorname{Tw}$ and generation",
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
            "sourceId": "n4",
            "targetId": "n5",
            "label": "Proposition 3.1",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": -0.1,
            "labelOffset": 15,
            "labelPosition": 0.5,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a8",
            "sourceId": "n5",
            "targetId": "n6",
            "label": "global models",
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
            "sourceId": "n2",
            "targetId": "n6",
            "label": "dual ribbon graph",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": -0.2,
            "labelOffset": 15,
            "labelPosition": 0.7,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a10",
            "sourceId": "n4",
            "targetId": "n6",
            "label": "formality test",
            "remark": "",
            "body": "solid",
            "head": "arrow",
            "tail": "none",
            "level": 1,
            "endpointScale": 1,
            "curve": 0.1,
            "labelOffset": 15,
            "labelPosition": 0.66,
            "labelAlign": "left",
            "color": "#5f574e"
          },
          {
            "id": "a11",
            "sourceId": "n7",
            "targetId": "n2",
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
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false,
          "canvasHeight": 760,
          "canvasRatioLocked": false,
          "canvasAspectRatio": 1.35
        }
      }
    }
  ],
  "arrows": [
    {
      "id": "a5",
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
      "id": "a6",
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
      "id": "a7",
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
      "labelAlign": "center-clear",
      "color": "#5f574e"
    },
    {
      "id": "a10",
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
      "labelAlign": "center-clear",
      "color": "#5f574e"
    },
    {
      "id": "a12",
      "sourceId": "n11",
      "targetId": "n12",
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
      "id": "a13",
      "sourceId": "n6",
      "targetId": "n12",
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
      "id": "a14",
      "sourceId": "n12",
      "targetId": "n13",
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
      "id": "a15",
      "sourceId": "n13",
      "targetId": "n14",
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
      "id": "a28",
      "sourceId": "n22",
      "targetId": "n23",
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
      "id": "a30",
      "sourceId": "n24",
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
      "labelPosition": 0.5,
      "labelAlign": "center-clear",
      "color": "#5f574e"
    },
    {
      "id": "a38",
      "sourceId": "n24",
      "targetId": "n31",
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
      "id": "a39",
      "sourceId": "n25",
      "targetId": "n32",
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
      "id": "a43",
      "sourceId": "n32",
      "targetId": "n33",
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
      "id": "a44",
      "sourceId": "n33",
      "targetId": "n34",
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
      "id": "a45",
      "sourceId": "n1",
      "targetId": "n3",
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
    },
    {
      "id": "a47",
      "sourceId": "n1",
      "targetId": "n9",
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
    },
    {
      "id": "a48",
      "sourceId": "n1",
      "targetId": "n35",
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
    },
    {
      "id": "a49",
      "sourceId": "n35",
      "targetId": "n11",
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
    },
    {
      "id": "a51",
      "sourceId": "n36",
      "targetId": "n26",
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
    },
    {
      "id": "a52",
      "sourceId": "n36",
      "targetId": "n28",
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
    },
    {
      "id": "a53",
      "sourceId": "n26",
      "targetId": "n29",
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
    },
    {
      "id": "a54",
      "sourceId": "n6",
      "targetId": "n36",
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
    },
    {
      "id": "a58",
      "sourceId": "n13",
      "targetId": "n10",
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
    },
    {
      "id": "a59",
      "sourceId": "n37",
      "targetId": "n22",
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
    },
    {
      "id": "a60",
      "sourceId": "n37",
      "targetId": "n28",
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
    },
    {
      "id": "a61",
      "sourceId": "n37",
      "targetId": "n24",
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
    },
    {
      "id": "a62",
      "sourceId": "n37",
      "targetId": "n30",
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
    },
    {
      "id": "a63",
      "sourceId": "n38",
      "targetId": "n37",
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
    },
    {
      "id": "a64",
      "sourceId": "n10",
      "targetId": "n38",
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
    "selectedId": "",
    "layoutAvoidOverlap": true,
    "layoutRunning": false,
    "canvasHeight": 1071,
    "canvasRatioLocked": true,
    "canvasAspectRatio": 0.7024,
    "relativeNodePositions": {
      "n1": {
        "x": 0.701,
        "y": 0.0872
      },
      "n3": {
        "x": 0.3983,
        "y": 0.0872
      },
      "n4": {
        "x": 0.2819,
        "y": 0.2822
      },
      "n5": {
        "x": 0.1452,
        "y": 0.1306
      },
      "n6": {
        "x": 0.1253,
        "y": 0.3428
      },
      "n9": {
        "x": 0.8943,
        "y": 0.243
      },
      "n10": {
        "x": 0.8904,
        "y": 0.436
      },
      "n11": {
        "x": 0.6891,
        "y": 0.2074
      },
      "n12": {
        "x": 0.4439,
        "y": 0.3356
      },
      "n13": {
        "x": 0.742,
        "y": 0.3072
      },
      "n14": {
        "x": 0.5216,
        "y": 0.434
      },
      "n22": {
        "x": 0.8943,
        "y": 0.5797
      },
      "n23": {
        "x": 0.8943,
        "y": 0.7664
      },
      "n24": {
        "x": 0.732,
        "y": 0.6908
      },
      "n25": {
        "x": 0.4567,
        "y": 0.8081
      },
      "n26": {
        "x": 0.1057,
        "y": 0.4741
      },
      "n28": {
        "x": 0.3677,
        "y": 0.6373
      },
      "n29": {
        "x": 0.11,
        "y": 0.6586
      },
      "n30": {
        "x": 0.4709,
        "y": 0.6994
      },
      "n31": {
        "x": 0.8348,
        "y": 0.8703
      },
      "n32": {
        "x": 0.1433,
        "y": 0.7953
      },
      "n33": {
        "x": 0.342,
        "y": 0.9128
      },
      "n34": {
        "x": 0.6613,
        "y": 0.9128
      },
      "n35": {
        "x": 0.4287,
        "y": 0.1933
      },
      "n36": {
        "x": 0.3095,
        "y": 0.4846
      },
      "n37": {
        "x": 0.6204,
        "y": 0.5351
      },
      "n38": {
        "x": 0.6944,
        "y": 0.4655
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
      "key": "bronken app",
      "author": "",
      "title": "bronken app",
      "year": "",
      "citeKey": "diagram",
      "url": "https://dehornoy.lmno.cnrs.fr/Softwares/TressApp/",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://dehornoy.lmno.cnrs.fr/Softwares/TressApp/",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "CdS06",
      "author": "Ana Cannas da Silva",
      "title": "Lectures on Symplectic Geometry",
      "year": "2006",
      "citeKey": "CdS06",
      "url": "https://www.math.ist.utl.pt/~acannas/Books/lsg.pdf",
      "source": "web",
      "rawBibtex": "@book{CdS06, author={Cannas da Silva, Ana}, title={Lectures on Symplectic Geometry}, series={Lecture Notes in Mathematics}, volume={1764}, year={2006}, publisher={Springer}}",
      "links": [
        {
          "url": "https://www.math.ist.utl.pt/~acannas/Books/lsg.pdf",
          "source": "web",
          "label": "lecture notes"
        }
      ]
    },
    {
      "key": "Pedroza17",
      "author": "Andrés Pedroza",
      "title": "A Quick View of Lagrangian Floer Homology",
      "year": "2017",
      "citeKey": "Pedroza17",
      "url": "https://arxiv.org/abs/1701.02293",
      "source": "web",
      "rawBibtex": "@misc{Pedroza17, author={Pedroza, Andrés}, title={A Quick View of Lagrangian Floer Homology}, year={2017}, eprint={1701.02293}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1701.02293",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "Auroux13",
      "author": "Denis Auroux",
      "title": "A Beginner's Introduction to Fukaya Categories",
      "year": "2013",
      "citeKey": "Auroux13",
      "url": "https://arxiv.org/abs/1301.7056",
      "source": "web",
      "rawBibtex": "@misc{Auroux13, author={Auroux, Denis}, title={A Beginner's Introduction to Fukaya Categories}, year={2013}, eprint={1301.7056}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1301.7056",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "KellerAinf",
      "author": "Bernhard Keller",
      "title": "Introduction to A-infinity Algebras and Modules",
      "year": "2001",
      "citeKey": "KellerAinf",
      "url": "https://arxiv.org/abs/math/9910179",
      "source": "web",
      "rawBibtex": "@article{KellerAinf, author={Keller, Bernhard}, title={Introduction to A-infinity Algebras and Modules}, year={2001}, journal={Homology, Homotopy and Applications}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math/9910179",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "Abouzaid07",
      "author": "Mohammed Abouzaid",
      "title": "On the Fukaya Categories of Higher Genus Surfaces",
      "year": "2007",
      "citeKey": "Abouzaid07",
      "url": "https://arxiv.org/abs/math/0606598",
      "source": "web",
      "rawBibtex": "@misc{Abouzaid07, author={Abouzaid, Mohammed}, title={On the Fukaya Categories of Higher Genus Surfaces}, year={2007}, eprint={math/0606598}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math/0606598",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "FST",
      "author": "Sergey Fomin and Michael Shapiro and Dylan Thurston",
      "title": "Cluster Algebras and Triangulated Surfaces. Part I: Cluster Complexes",
      "year": "2006",
      "citeKey": "FST",
      "url": "https://arxiv.org/abs/math/0608367",
      "source": "web",
      "rawBibtex": "@misc{FST, author={Fomin, Sergey and Shapiro, Michael and Thurston, Dylan}, title={Cluster Algebras and Triangulated Surfaces. Part I: Cluster Complexes}, year={2006}, eprint={math/0608367}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math/0608367",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "HKK17",
      "author": "Fabian Haiden and Ludmil Katzarkov and Maxim Kontsevich",
      "title": "Flat Surfaces and Stability Structures",
      "year": "2017",
      "citeKey": "HKK17",
      "url": "https://arxiv.org/abs/1409.8611",
      "source": "web",
      "rawBibtex": "@article{HKK17, author={Haiden, Fabian and Katzarkov, Ludmil and Kontsevich, Maxim}, title={Flat Surfaces and Stability Structures}, journal={Publications Mathématiques de l'IHÉS}, volume={126}, pages={247--318}, year={2017}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1409.8611",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "LP20",
      "author": "Yanki Lekili and Alexander Polishchuk",
      "title": "Derived Equivalences of Gentle Algebras via Fukaya Categories",
      "year": "2020",
      "citeKey": "LP20",
      "url": "https://arxiv.org/abs/1801.06370",
      "source": "web",
      "rawBibtex": "@article{LP20, author={Lekili, Yanki and Polishchuk, Alexander}, title={Derived Equivalences of Gentle Algebras via Fukaya Categories}, journal={Mathematische Annalen}, year={2020}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1801.06370",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "OPS",
      "author": "Sebastian Opper and Pierre-Guy Plamondon and Sibylle Schroll",
      "title": "A Geometric Model for the Derived Category of Gentle Algebras",
      "year": "2018",
      "citeKey": "OPS18",
      "url": "https://arxiv.org/abs/1801.09659",
      "source": "web",
      "rawBibtex": "@misc{OPS, author={Opper, Sebastian and Plamondon, Pierre-Guy and Schroll, Sibylle}, title={A Geometric Model for the Derived Category of Gentle Algebras}, year={2018}, eprint={1801.09659}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1801.09659",
          "source": "web",
          "label": "arXiv (revised 2025)"
        }
      ]
    },
    {
      "key": "KellerCluster",
      "author": "Bernhard Keller",
      "title": "Cluster Algebras and Derived Categories",
      "year": "2012",
      "citeKey": "KellerCluster",
      "url": "https://arxiv.org/abs/1202.4161",
      "source": "web",
      "rawBibtex": "@misc{KellerCluster, author={Keller, Bernhard}, title={Cluster Algebras and Derived Categories}, year={2012}, eprint={1202.4161}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1202.4161",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "BarmeierWang26",
      "author": "Severin Barmeier and Zhengfang Wang",
      "title": "Fukaya Categories of Orbifold Surfaces in Representation Theory",
      "year": "2026",
      "citeKey": "BarmeierWang26",
      "url": "https://arxiv.org/abs/2602.17370",
      "source": "web",
      "rawBibtex": "@misc{BarmeierWang26, author={Barmeier, Severin and Wang, Zhengfang}, title={Fukaya Categories of Orbifold Surfaces in Representation Theory}, year={2026}, eprint={2602.17370}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2602.17370",
          "source": "web",
          "label": "arXiv"
        }
      ]
    },
    {
      "key": "volk2025",
      "author": "Luke Volk and Boris Khesin",
      "title": "Morse-Bott Volume Forms",
      "year": "2025",
      "citeKey": "volk2025",
      "url": "https://arxiv.org/abs/2503.00541",
      "source": "web",
      "rawBibtex": "@misc{volk2025morsebottvolumeforms,\n      title={Morse-Bott Volume Forms}, \n      author={Luke Volk and Boris Khesin},\n      year={2025},\n      eprint={2503.00541},\n      archivePrefix={arXiv},\n      primaryClass={math.DG},\n      url={https://arxiv.org/abs/2503.00541}, \n}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2503.00541",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "ChatGPT",
      "author": "",
      "title": "general advice",
      "year": "",
      "citeKey": "ChatGPT",
      "url": "https://chatgpt.com/share/6a678b48-a868-83eb-8cb2-8e44bd3c30c4",
      "source": "web",
      "rawBibtex": "",
      "links": [
        {
          "url": "https://chatgpt.com/share/6a678b48-a868-83eb-8cb2-8e44bd3c30c4",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "FST08",
      "author": "Fomin, Sergey; Shapiro, Michael; Thurston, Dylan",
      "title": "Cluster algebras and triangulated surfaces. Part I: Cluster complexes",
      "year": "2008",
      "citeKey": "FST08",
      "url": "https://arxiv.org/abs/math/0608367",
      "source": "web",
      "rawBibtex": "@article{FST2008, author={Fomin, Sergey and Shapiro, Michael and Thurston, Dylan}, title={Cluster algebras and triangulated surfaces. Part I: Cluster complexes}, journal={Acta Mathematica}, volume={201}, number={1}, pages={83--146}, year={2008}, doi={10.1007/s11511-008-0030-7}, eprint={math/0608367}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math/0608367",
          "source": "web",
          "label": "arXiv abstract"
        },
        {
          "url": "https://arxiv.org/pdf/math/0608367",
          "source": "web",
          "label": "PDF"
        }
      ]
    },
    {
      "key": "Grossack26",
      "author": "Chris (Christina) Grossack",
      "title": "Explicitly Computing with Fukaya Categories of Surfaces with Boundary",
      "year": "2026",
      "citeKey": "Grossack26",
      "url": "https://arxiv.org/abs/2510.10867",
      "source": "web",
      "rawBibtex": "@misc{Grossack26, author={Grossack, Chris}, title={Explicitly Computing with Fukaya Categories of Surfaces with Boundary}, year={2026}, eprint={2510.10867}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/2510.10867",
          "source": "web",
          "label": "main paper"
        }
      ]
    },
    {
      "key": "Auroux14",
      "author": "Denis Auroux",
      "title": "A Beginner's Introduction to Fukaya Categories",
      "year": "2014",
      "citeKey": "Auroux14",
      "url": "https://arxiv.org/abs/1301.7056",
      "source": "web",
      "rawBibtex": "@incollection{Auroux14, author={Auroux, Denis}, title={A Beginner's Introduction to Fukaya Categories}, booktitle={Contact and Symplectic Topology}, year={2014}, pages={85--136}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1301.7056",
          "source": "web",
          "label": "background"
        }
      ]
    },
    {
      "key": "Bocklandt21",
      "author": "Raf Bocklandt",
      "title": "A Gentle Introduction to Homological Mirror Symmetry",
      "year": "2021",
      "citeKey": "Bocklandt21",
      "url": "https://doi.org/10.1017/9781108692458",
      "source": "web",
      "rawBibtex": "@book{Bocklandt21, author={Bocklandt, Raf}, title={A Gentle Introduction to Homological Mirror Symmetry}, publisher={Cambridge University Press}, year={2021}}",
      "links": [
        {
          "url": "https://doi.org/10.1017/9781108692458",
          "source": "web",
          "label": "textbook"
        }
      ]
    },
    {
      "key": "OPS18",
      "author": "Sebastian Opper and Pierre-Guy Plamondon and Sibylle Schroll",
      "title": "A Geometric Model for the Derived Category of Gentle Algebras",
      "year": "2018",
      "citeKey": "OPS18",
      "url": "https://arxiv.org/abs/1801.09659",
      "source": "web",
      "rawBibtex": "@misc{OPS18, author={Opper, Sebastian and Plamondon, Pierre-Guy and Schroll, Sibylle}, title={A Geometric Model for the Derived Category of Gentle Algebras}, year={2018}, eprint={1801.09659}, archivePrefix={arXiv}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1801.09659",
          "source": "web",
          "label": "curves and cones"
        }
      ]
    },
    {
      "key": "Keller01",
      "author": "Bernhard Keller",
      "title": "Introduction to A-infinity Algebras and Modules",
      "year": "2001",
      "citeKey": "Keller01",
      "url": "https://arxiv.org/abs/math/9910179",
      "source": "web",
      "rawBibtex": "@article{Keller01, author={Keller, Bernhard}, title={Introduction to A-infinity Algebras and Modules}, journal={Homology, Homotopy and Applications}, volume={3}, number={1}, year={2001}, pages={1--35}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/math/9910179",
          "source": "web",
          "label": "A-infinity reference"
        }
      ]
    },
    {
      "key": "hartshorne1977",
      "author": "Robin Hartshorne",
      "title": "Algebraic Geometry",
      "year": "1977",
      "citeKey": "hartshorne1977",
      "url": "",
      "source": "bibtex",
      "rawBibtex": "@book{hartshorne1977, title={Algebraic Geometry}, author={Hartshorne, Robin}, year={1977}}",
      "links": []
    },
    {
      "key": "Wel81",
      "author": "Welters, G. E.",
      "title": "Abel-Jacobi isogenies for certain types of Fano threefolds",
      "year": "1981",
      "citeKey": "Wel81",
      "url": "https://scispace.com/pdf/abel-jacobi-isogenies-for-certain-types-of-fano-threefolds-32wgtkrz9m.pdf",
      "source": "bibtex",
      "rawBibtex": "@book{Wel81,\n author = {Welters, G. E.},\n title = {Abel-{Jacobi} isogenies for certain types of {Fano} threefolds},\n fseries = {Mathematical Centre Tracts},\n series = {Math. Cent. Tracts},\n volume = {141},\n year = {1981},\n publisher = {Centrum voor Wiskunde en Informatica (CWI), Amsterdam},\n language = {English},\n keywords = {14J30,14K30,14H40},\n zbMATH = {3743439},\n Zbl = {0474.14028}\n}",
      "links": [
        {
          "url": "https://scispace.com/pdf/abel-jacobi-isogenies-for-certain-types-of-fano-threefolds-32wgtkrz9m.pdf",
          "source": "bibtex",
          "label": ""
        }
      ]
    },
    {
      "key": "zbMATH04091651",
      "author": "Picco Botta, Luciana",
      "title": "On the intersection of three quadrics",
      "year": "1989",
      "citeKey": "zbMATH04091651",
      "url": "https://eudml.org/doc/153159",
      "source": "web",
      "rawBibtex": "@article{zbMATH04091651,\n author = {Picco Botta, Luciana},\n title = {On the intersection of three quadrics},\n fjournal = {Journal f{\\\"u}r die Reine und Angewandte Mathematik},\n journal = {J. Reine Angew. Math.},\n issn = {0075-4102},\n volume = {399},\n pages = {188--207},\n year = {1989},\n language = {English},\n doi = {10.1515/crll.1989.399.188},\n keywords = {14J25,14C17,11E16},\n url = {https://eudml.org/doc/153159},\n zbMATH = {4091651},\n Zbl = {0667.14019}\n}",
      "links": [
        {
          "url": "https://eudml.org/doc/153159",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "bauer2020",
      "author": "Thomas Bauer and Slawomir Rams",
      "title": "Counting lines on projective surfaces",
      "year": "2020",
      "citeKey": "bauer2020countinglinesprojectivesurfaces",
      "url": "https://arxiv.org/abs/1902.05133",
      "source": "web",
      "rawBibtex": "@misc{bauer2020countinglinesprojectivesurfaces,\n      title={Counting lines on projective surfaces}, \n      author={Thomas Bauer and Slawomir Rams},\n      year={2020},\n      eprint={1902.05133},\n      archivePrefix={arXiv},\n      primaryClass={math.AG},\n      url={https://arxiv.org/abs/1902.05133}, \n}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1902.05133",
          "source": "web",
          "label": ""
        }
      ]
    },
    {
      "key": "zbMATH03291827",
      "author": "Griffiths, Phillip A.",
      "title": "Periods of integrals on algebraic manifolds. II: Local study of the period mapping",
      "year": "1968",
      "citeKey": "zbMATH03291827",
      "url": "https://www.jstor.org/stable/2373485?seq=1",
      "source": "bibtex",
      "rawBibtex": "@article{zbMATH03291827,\n author = {Griffiths, Phillip A.},\n title = {Periods of integrals on algebraic manifolds. {II}: {Local} study of the period mapping},\n fjournal = {American Journal of Mathematics},\n journal = {Am. J. Math.},\n issn = {0002-9327},\n volume = {90},\n pages = {805--865},\n year = {1968},\n language = {English},\n doi = {10.2307/2373485},\n keywords = {14-XX},\n zbMATH = {3291827},\n Zbl = {0183.25501}\n}",
      "links": [
        {
          "url": "https://www.jstor.org/stable/2373485?seq=1",
          "source": "bibtex",
          "label": ""
        }
      ]
    },
    {
      "key": "PS19",
      "author": "James Pascaleff; Nicolò Sibilla",
      "title": "Topological Fukaya category and mirror symmetry for punctured surfaces",
      "year": "2019",
      "citeKey": "PS19",
      "url": "https://arxiv.org/abs/1604.06448",
      "source": "web",
      "rawBibtex": "@article{PS19, author={Pascaleff, James and Sibilla, Nicolò}, title={Topological Fukaya category and mirror symmetry for punctured surfaces}, journal={Compositio Mathematica}, volume={155}, number={3}, pages={599--644}, year={2019}, doi={10.1112/S0010437X19007073}}",
      "links": [
        {
          "url": "https://arxiv.org/abs/1604.06448",
          "source": "web",
          "label": "arXiv"
        }
      ]
    }
  ]
};
