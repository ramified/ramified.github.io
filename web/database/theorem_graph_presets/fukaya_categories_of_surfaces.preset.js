// Save this file as theorem_graph_presets/fukaya_categories_of_surfaces.preset.js
// Add this entry to theorem_graph_presets/presets.js:
// { label: "Fukaya Categories of Surfaces", key: "fukaya_categories_of_surfaces", file: "fukaya_categories_of_surfaces.preset.js" }
window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};
window.THEOREM_GRAPH_PRESET_DATA.fukaya_categories_of_surfaces = {
  "schemaVersion": 8,
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
    "citationKeys": [],
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
          "text": "Skip only the items you can do without notes. In your case, do the Hamiltonian and Floer branches fully; the quiver branch may be shortened if the last two tasks are easy."
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
      "citationKeys": [],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 331.9,
      "y": 22
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
      "citationKeys": [
        "CdS06"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 110,
      "y": 28.8
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
          "text": "- [x] Draw transverse intersections of two arcs\n- [x] Practice perturbing curves into transverse position\n- [ ] Distinguish closed curves, properly embedded arcs, and immersed curves"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain why every smooth curve in a symplectic surface is automatically Lagrangian, and why extra brane data still matters."
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
      "citationKeys": [
        "Auroux13"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 131.1,
      "y": 278.7
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
        "CdS06",
        "Pedroza17"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 48,
      "y": 127.3
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
      "citationKeys": [
        "Auroux13",
        "HKK17"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 48,
      "y": 356.4
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
      "citationKeys": [
        "KellerAinf",
        "OPS"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 528.3,
      "y": 30.8,
      "childGraph": {
        "title": "perfect complex",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false
        }
      }
    },
    {
      "id": "n10",
      "type": "misc",
      "label": "A-infinity intuition",
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
      "citationKeys": [
        "KellerAinf",
        "Auroux13"
      ],
      "color": "#8b3a2a",
      "fillColor": "#fbefee",
      "x": 701,
      "y": 33.1
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
      "citationKeys": [
        "Pedroza17"
      ],
      "color": "#2f5f9f",
      "fillColor": "#eef4fb",
      "x": 424.6,
      "y": 103.7
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
      "citationKeys": [
        "Auroux13",
        "Pedroza17"
      ],
      "color": "#46786e",
      "fillColor": "#eef7f4",
      "x": 258.3,
      "y": 216.1
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
      "citationKeys": [
        "Abouzaid07",
        "Auroux13"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 474.8,
      "y": 218.5
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
      "citationKeys": [
        "Auroux13",
        "Pedroza17"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 695.8,
      "y": 303.8
    },
    {
      "id": "n15",
      "type": "misc",
      "label": "Triangle product $\\mu_2$",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Compute composition by counting triangles bounded by three Lagrangians."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Draw three arcs with one relevant triangle\n- [ ] Compute μ2 on chosen intersection generators\n- [ ] Track source, target, and degree conventions"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can read a triangle in the surface as a categorical composition."
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
      "citationKeys": [
        "Auroux13"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 665.1,
      "y": 204.2
    },
    {
      "id": "n16",
      "type": "misc",
      "label": "Higher polygon products $\\mu_k$",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "See the Fukaya category as an A-infinity category whose higher products count polygons."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Identify a quadrilateral contributing to μ3\n- [ ] Relate polygon degenerations to an A-infinity relation\n- [ ] Work over F2 first; postpone orientations and signs"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain geometrically why the A-infinity equations arise from boundaries of one-dimensional polygon moduli spaces."
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
      "citationKeys": [
        "Auroux13",
        "KellerAinf",
        "Abouzaid07"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 700.7,
      "y": 418.2,
      "childGraph": {
        "title": "Higher polygon products $\\mu_k$",
        "nodes": [],
        "arrows": [],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false
        }
      }
    },
    {
      "id": "n17",
      "type": "misc",
      "label": "Marked surfaces and stops",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Set up surfaces with boundary markings that control where wrapping is forbidden and which arcs are admissible."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Draw a disk, annulus, and pair of pants with stops\n- [ ] List admissible arcs up to isotopy\n- [ ] Observe how adding or removing a stop changes allowable wrapping"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can state the geometric data of a marked graded surface used in partially wrapped Fukaya categories."
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
      "citationKeys": [
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 262,
      "y": 342.1
    },
    {
      "id": "n18",
      "type": "misc",
      "label": "Partial wrapping",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Understand morphisms generated after positive wrapping near the boundary while respecting stops."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Wrap one arc slightly and record new intersections\n- [ ] Compare compact and wrapped morphisms\n- [ ] Explain intuitively why stops make computations finite"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain what is being wrapped, in which direction, and what a stop prevents."
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
      "citationKeys": [
        "Auroux13",
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 483.6,
      "y": 327.9
    },
    {
      "id": "n19",
      "type": "misc",
      "label": "Disk: type-A model",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Compute the first complete Fukaya-category example: a stopped disk with an ordered arc system whose endomorphism algebra is a type-A path algebra (indexing depends on conventions)."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Choose a chain of noncrossing generating arcs\n- [ ] Compute all morphism generators\n- [ ] Compute compositions from triangles\n- [ ] Identify the resulting directed type-A quiver"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can derive the quiver from the picture rather than merely quote the equivalence."
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
      "citationKeys": [
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 554.9,
      "y": 453.2
    },
    {
      "id": "n20",
      "type": "misc",
      "label": "Annulus or cotangent cylinder",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Meet wrapping, winding number, and closed-curve behavior in the simplest surface with nontrivial fundamental group."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Choose bridging and boundary-parallel arcs\n- [ ] Track intersections under repeated wrapping\n- [ ] Relate winding to string-like and band-like behavior"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can explain why the annulus has richer indecomposables than the disk and why affine-A language appears."
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
      "citationKeys": [
        "HKK17",
        "OPS"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 286.7,
      "y": 432
    },
    {
      "id": "n21",
      "type": "misc",
      "label": "Pair of pants",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Practice polygon counts and gluing intuition on a three-ended surface."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Choose an arc decomposition into a polygon\n- [ ] Compute the local quiver and zero relations\n- [ ] Identify which polygons contribute to higher products"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can turn a surface dissection into algebraic data and see how local pieces might glue."
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
      "citationKeys": [
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 664.7,
      "y": 528.4
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
          "text": "- [ ] Cut the surface along the arcs and inspect the polygonal pieces\n- [ ] Form the direct sum of generating arcs\n- [ ] Compute its endomorphism A-infinity algebra"
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
      "citationKeys": [
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 426.8,
      "y": 527.9
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
          "text": "- [ ] Assign vertices to generating arcs\n- [ ] Assign arrows from oriented corners\n- [ ] Write quadratic zero relations from forbidden compositions\n- [ ] Check the gentle local conditions"
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
      "citationKeys": [
        "LP20",
        "OPS"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 273.9,
      "y": 611.4
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
      "citationKeys": [
        "OPS"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 522.6,
      "y": 586.2
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
      "citationKeys": [
        "OPS"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 521.8,
      "y": 762.7
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
          "text": "- [ ] Construct a quiver from an unpunctured triangulated polygon\n- [ ] Compute one exchange relation\n- [ ] Identify compatible arcs with a cluster"
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
      "citationKeys": [
        "FST"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 189.2,
      "y": 546.4
    },
    {
      "id": "n27",
      "type": "misc",
      "label": "Flip = quiver mutation",
      "details": [
        {
          "id": "goal",
          "label": "goal",
          "type": "textbox",
          "text": "Verify locally that flipping a diagonal changes the signed adjacency quiver by mutation."
        },
        {
          "id": "tasks",
          "label": "practice",
          "type": "checkbox",
          "text": "- [ ] Do the quadrilateral calculation by hand\n- [ ] Mutate the corresponding quiver\n- [ ] Compare arrows before and after canceling 2-cycles\nExplain what a triangulation flip does to a surface quiver"
        },
        {
          "id": "checkpoint",
          "label": "mastery check",
          "type": "list",
          "text": "You can demonstrate the flip-mutation correspondence in a concrete polygon."
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
      "citationKeys": [
        "FST"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 48,
      "y": 656.5
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
      "citationKeys": [
        "FST",
        "LP20",
        "KellerCluster"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 179.3,
      "y": 766.6
    },
    {
      "id": "n29",
      "type": "misc",
      "label": "Optional: cluster categorification",
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
      "citationKeys": [
        "KellerCluster"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 48,
      "y": 863.2
    },
    {
      "id": "n30",
      "type": "misc",
      "label": "Capstone A: disk computation",
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
      "citationKeys": [
        "Auroux13",
        "HKK17",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 429.2,
      "y": 697.2
    },
    {
      "id": "n31",
      "type": "misc",
      "label": "Capstone B: annulus computation",
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
      "citationKeys": [
        "HKK17",
        "OPS",
        "LP20"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 698.7,
      "y": 706.6
    },
    {
      "id": "n32",
      "type": "misc",
      "label": "Capstone C: flip and mutation",
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
      "citationKeys": [
        "FST",
        "OPS",
        "KellerCluster"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 328.3,
      "y": 828.6
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
          "text": "- [ ] Auroux: Floer complexes, products, Fukaya-category overview\n- [ ] HKK: elementary surface category and arc generators\n- [ ] Lekili-Polishchuk: surface from a gentle algebra and equivalence statement\n- [ ] Opper-Plamondon-Schroll: curves, morphisms, and cones"
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
        "OPS"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 518.4,
      "y": 891.1
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
          "text": "- [ ] Read Abouzaid for combinatorial closed-surface Fukaya categories\n- [ ] Try a genus-two curve configuration\n- [ ] For representation theory, sample the orbifold-disk/type-D story"
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
        "Abouzaid07",
        "BarmeierWang26"
      ],
      "color": "#7a6f65",
      "fillColor": "#f7f5f1",
      "x": 701,
      "y": 837.7
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
      "x": 194.7,
      "y": 126.7
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
      "citationKeys": [],
      "color": "#8b5f2a",
      "fillColor": "#fff7df",
      "x": 80,
      "y": 460.7,
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
            "citationKeys": [
              "FST2008"
            ],
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
            "citationKeys": [
              "FST2008"
            ],
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
            "citationKeys": [
              "FST2008"
            ],
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
            "citationKeys": [
              "FST2008"
            ],
            "color": "#8b3a2a",
            "fillColor": "#fbefee",
            "x": 549.5,
            "y": 207.9
          },
          {
            "id": "n5",
            "type": "definition",
            "label": "5. Triangulation flip",
            "setting": "Read Definition 3.5 and the paragraph immediately following it.",
            "condition": "For a flippable arc gamma, removing gamma produces a quadrilateral; the replacement gamma' is its other diagonal.",
            "result": "You can construct T' from T by one local flip and know why a folded side is exceptional.",
            "proofSketch": "In your pentagon, flip one diagonal. Keep the labels of all unchanged arcs and give the new diagonal the old position label k.",
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
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
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 520.7,
            "y": 341.7
          },
          {
            "id": "n7",
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
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 281.4,
            "y": 397.8
          },
          {
            "id": "n8",
            "type": "definition",
            "label": "8. Matrix and quiver mutation",
            "setting": "Read Definition 4.7. Interpret its formula as quiver mutation at the vertex k.",
            "condition": "In quiver language: add arrows along every path i -> k -> j, reverse arrows incident with k, then cancel oriented 2-cycles.",
            "result": "You can compute mu_k(B) and the corresponding mutated quiver without referring to the surface.",
            "proofSketch": "Mutate the matrix and quiver from Node 6 at the label k of the flipped diagonal. Verify that the two calculations agree.",
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 488.7,
            "y": 464.9
          },
          {
            "id": "n9",
            "type": "proposition",
            "label": "9. Flip equals mutation",
            "setting": "Read Proposition 4.8 and its short proof.",
            "condition": "T' is obtained from T by flipping the arc labeled k; all other arc labels remain fixed.",
            "result": "The central statement is B(T') = mu_k(B(T)), equivalently Q(T') = mu_k(Q(T)) after fixing the matrix-to-quiver convention.",
            "proofSketch": "Compare only the two triangles adjacent to k. Everything outside that local region contributes identically before and after the flip.",
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
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
            "citationKeys": [
              "FST2008"
            ],
            "color": "#7a6f65",
            "fillColor": "#f7f5f1",
            "x": 492.1,
            "y": 589
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
            "id": "a6",
            "sourceId": "n6",
            "targetId": "n7",
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
            "id": "a7",
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
          }
        ],
        "view": {
          "selectedId": "",
          "layoutAvoidOverlap": true,
          "layoutRunning": false
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
      "id": "a16",
      "sourceId": "n10",
      "targetId": "n15",
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
      "id": "a17",
      "sourceId": "n13",
      "targetId": "n15",
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
      "id": "a18",
      "sourceId": "n15",
      "targetId": "n16",
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
      "id": "a19",
      "sourceId": "n6",
      "targetId": "n17",
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
      "id": "a20",
      "sourceId": "n17",
      "targetId": "n18",
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
      "id": "a21",
      "sourceId": "n16",
      "targetId": "n18",
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
      "id": "a22",
      "sourceId": "n18",
      "targetId": "n19",
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
      "id": "a23",
      "sourceId": "n18",
      "targetId": "n20",
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
      "id": "a24",
      "sourceId": "n18",
      "targetId": "n21",
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
      "id": "a25",
      "sourceId": "n19",
      "targetId": "n22",
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
      "id": "a26",
      "sourceId": "n20",
      "targetId": "n22",
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
      "id": "a27",
      "sourceId": "n21",
      "targetId": "n22",
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
      "id": "a29",
      "sourceId": "n23",
      "targetId": "n24",
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
      "id": "a32",
      "sourceId": "n17",
      "targetId": "n26",
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
      "id": "a33",
      "sourceId": "n26",
      "targetId": "n27",
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
      "id": "a34",
      "sourceId": "n23",
      "targetId": "n28",
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
      "id": "a35",
      "sourceId": "n27",
      "targetId": "n28",
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
      "id": "a36",
      "sourceId": "n28",
      "targetId": "n29",
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
      "id": "a37",
      "sourceId": "n23",
      "targetId": "n30",
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
      "id": "a40",
      "sourceId": "n28",
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
      "id": "a41",
      "sourceId": "n30",
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
      "id": "a42",
      "sourceId": "n31",
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
      "id": "a50",
      "sourceId": "n36",
      "targetId": "n27",
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
    "canvasRatioLocked": true,
    "canvasAspectRatio": 0.8105,
    "relativeNodePositions": {
      "n1": {
        "x": 0.4431,
        "y": 0.0238
      },
      "n3": {
        "x": 0.1469,
        "y": 0.0312
      },
      "n4": {
        "x": 0.175,
        "y": 0.3017
      },
      "n5": {
        "x": 0.0641,
        "y": 0.1377
      },
      "n6": {
        "x": 0.0641,
        "y": 0.3857
      },
      "n9": {
        "x": 0.7053,
        "y": 0.0333
      },
      "n10": {
        "x": 0.9359,
        "y": 0.0358
      },
      "n11": {
        "x": 0.567,
        "y": 0.1122
      },
      "n12": {
        "x": 0.3448,
        "y": 0.2339
      },
      "n13": {
        "x": 0.6339,
        "y": 0.2365
      },
      "n14": {
        "x": 0.929,
        "y": 0.3288
      },
      "n15": {
        "x": 0.8879,
        "y": 0.221
      },
      "n16": {
        "x": 0.9355,
        "y": 0.4526
      },
      "n17": {
        "x": 0.3498,
        "y": 0.3702
      },
      "n18": {
        "x": 0.6456,
        "y": 0.3548
      },
      "n19": {
        "x": 0.7408,
        "y": 0.4905
      },
      "n20": {
        "x": 0.3828,
        "y": 0.4675
      },
      "n21": {
        "x": 0.8875,
        "y": 0.5719
      },
      "n22": {
        "x": 0.5698,
        "y": 0.5713
      },
      "n23": {
        "x": 0.3657,
        "y": 0.6617
      },
      "n24": {
        "x": 0.6978,
        "y": 0.6344
      },
      "n25": {
        "x": 0.6967,
        "y": 0.8254
      },
      "n26": {
        "x": 0.2526,
        "y": 0.5913
      },
      "n27": {
        "x": 0.0641,
        "y": 0.7105
      },
      "n28": {
        "x": 0.2393,
        "y": 0.8296
      },
      "n29": {
        "x": 0.0641,
        "y": 0.9342
      },
      "n30": {
        "x": 0.573,
        "y": 0.7546
      },
      "n31": {
        "x": 0.9328,
        "y": 0.7647
      },
      "n32": {
        "x": 0.4383,
        "y": 0.8968
      },
      "n33": {
        "x": 0.6921,
        "y": 0.9644
      },
      "n34": {
        "x": 0.9359,
        "y": 0.9066
      },
      "n35": {
        "x": 0.26,
        "y": 0.1371
      },
      "n36": {
        "x": 0.1068,
        "y": 0.4986
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
      "citeKey": "OPS",
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
    }
  ]
};