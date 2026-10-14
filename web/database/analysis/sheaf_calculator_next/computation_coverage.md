# Implemented Computation Coverage

This document records which object types currently have concrete chart/formula support in the rebuilt sheaf calculator. It deliberately excludes homology-class systems and homology rewrite rules; those need a separate document.

Legend:

- ✔️ concrete implementation
- 🟡 conditional, symbolic, or partial implementation
- ❌ not implemented as a real computation
- ↳ grouping/gloss row; see child rows

## Coverage Trees

### Hodge Numbers

| Type | Status | Notes |
| --- | --- | --- |
| abstract variety | ↳ | Grouping/gloss row; see child rows and extra cases. |
| point | ✔️ | Concrete. |
| curve | ✔️ | Concrete, including symbolic genus. |
| symmetric product of a curve | ✔️ | Concrete Macdonald Hodge numbers. |
| projective space | ✔️ | Concrete. |
| complete intersection | ✔️ | Concrete smooth complete-intersection formula. |
| Grassmannian | ✔️ | Concrete diagonal Hodge numbers from Schubert classes. |
| abelian variety | ✔️ | Concrete binomial formula. |
| moduli of ppav | 🟡 | Symbolic. |
| product variety | 🟡 | Concrete when both factors have Hodge entries. |
| blow-up | 🟡 | Point blow-up only. |

### Polyvector Parallelogram

| Type | Status | Notes |
| --- | --- | --- |
| abstract variety | ↳ | Grouping/gloss row; see child rows and extra cases. |
| point | 🟡 | Symbolic placeholder. |
| curve | ✔️ | Concrete. |
| symmetric product of a curve | 🟡 | Concrete for `Sym^0`, `Sym^1`, and genus 0; otherwise symbolic. |
| projective space | ✔️ | Concrete. |
| complete intersection | 🟡 | Concrete for Calabi-Yau/projective-space cases; otherwise symbolic. |
| Grassmannian | 🟡 | Symbolic placeholder. |
| abelian variety | ✔️ | Concrete. |
| moduli of ppav | 🟡 | Symbolic placeholder. |
| product variety | 🟡 | Concrete when both factor polyvector tables are concrete. |
| blow-up | 🟡 | Symbolic placeholder. |

### Betti Table

| Type | Status | Notes |
| --- | --- | --- |
| abstract variety | ↳ | Grouping/gloss row; see child rows. |
| point | ❌ | No concrete embedding/resolution data. |
| curve | ❌ | No concrete embedding/resolution data. |
| symmetric product of a curve | ❌ | No concrete embedding/resolution data. |
| projective space | ✔️ | Coordinate ring is polynomial. |
| complete intersection | ✔️ | Koszul Betti table of the coordinate ring. |
| Grassmannian | ❌ | No Plucker-coordinate resolution implemented. |
| abelian variety | ❌ | No concrete embedding/resolution data. |
| moduli of ppav | ❌ | No concrete embedding/resolution data. |
| product variety | ❌ | No concrete embedding/resolution data. |
| blow-up | ❌ | No concrete embedding/resolution data. |

### Sheaf Cohomology

| Type | Status | Notes |
| --- | --- | --- |
| abstract sheaf | ↳ | Grouping/gloss row; see child rows and extra cases. |
| structure sheaf | ✔️ | Concrete from line-bundle or Hodge-row logic. |
| locally free sheaf / vector bundle | ❌ | No general cohomology formula. |
| tangent sheaf | ❌ | No general cohomology formula. |
| cotangent sheaf | 🟡 | Via Hodge row `h^{1,i}`. |
| canonical sheaf | 🟡 | Projective space and smooth complete intersection. |
| Serre twisting sheaf | 🟡 | Projective space and smooth complete intersection. |
| divisor sheaf | ❌ | No general cohomology formula. |
| dual bundle | ❌ | No general cohomology formula. |
| direct sum sheaf | ❌ | No general cohomology formula. |
| tensor product sheaf | ❌ | No general cohomology formula. |
| pullback sheaf | ❌ | No general cohomology formula. |
| pushforward sheaf | ❌ | No general cohomology formula. |

Extra sheaf-cohomology cases in the current code:

| Case | Status | Notes |
| --- | --- | --- |
| universal bundle on projective-space-like target | 🟡 | Identified with `O_X(-1)`. |
| universal subbundle on Grassmannian | ✔️ | Acyclic. |
| no selected sheaf | ✔️ | Treated as `O_X`. |

### Characteristic Classes

| Type | Status | Notes |
| --- | --- | --- |
| abstract sheaf | ↳ | Grouping/gloss row; see child rows and extra cases. |
| structure sheaf | ✔️ | Concrete. |
| locally free sheaf / vector bundle | ✔️ | Formal variables. |
| tangent sheaf | ✔️ | Concrete or formal, depending on base variety. |
| cotangent sheaf | ✔️ | Concrete or formal, depending on base variety. |
| canonical sheaf | ✔️ | Concrete or formal, depending on base variety. |
| Serre twisting sheaf | ✔️ | Concrete where defined. |
| divisor sheaf | ✔️ | Concrete from divisor coefficients. |
| dual bundle | ✔️ | Concrete from parent bundle. |
| direct sum sheaf | ✔️ | Concrete from summands. |
| tensor product sheaf | ✔️ | Concrete from factors. |
| pullback sheaf | ✔️ | Concrete from map and source sheaf. |
| pushforward sheaf | ✔️ | GRR/formal support in supported cases. |

Extra characteristic-class cases in the current code:

| Case | Status | Notes |
| --- | --- | --- |
| generic abstract sheaf | ✔️ | Formal Chern/Chern-character variables. |
| generic locally free sheaf / vector bundle | ✔️ | Formal variables; Chern roots are available. |

### Chern Roots Display

| Type | Status | Notes |
| --- | --- | --- |
| abstract sheaf | ↳ | Grouping/gloss row; see child rows and extra cases. |
| structure sheaf | ❌ | Displayed through Chern classes / character. |
| locally free sheaf / vector bundle | ✔️ | Root variables are available. |
| tangent sheaf | ❌ | Displayed through Chern classes / character. |
| cotangent sheaf | ❌ | Displayed through Chern classes / character. |
| canonical sheaf | ❌ | Displayed through Chern classes / character. |
| Serre twisting sheaf | ❌ | Displayed through Chern classes / character. |
| divisor sheaf | ❌ | Displayed through Chern classes / character. |
| dual bundle | ❌ | Displayed through Chern classes / character. |
| direct sum sheaf | ❌ | Displayed through Chern classes / character. |
| tensor product sheaf | ❌ | Displayed through Chern classes / character. |
| pullback sheaf | ❌ | Displayed through Chern classes / character. |
| pushforward sheaf | ❌ | Displayed through Chern classes / character. |

Extra Chern-roots cases in the current code:

| Case | Status | Notes |
| --- | --- | --- |
| generic abstract sheaf | ✔️ | Root variables are available. |
| generic locally free sheaf / vector bundle | ✔️ | Root variables are available. |

Step-by-step class formulas follow characteristic-class availability.

## Variety-Level Outputs

| Output | Implemented for | Notes |
| --- | --- | --- |
| Hodge numbers | point; curve; projective space; smooth complete intersection; Grassmannian; abelian variety; symmetric product of a curve; product of two supported factors; point blow-up when the base table is numeric; smooth cyclic ramified cover in the supported cases; abstract surface symbolically; moduli of ppav symbolically | Full tables are displayed through dimension 12. Above that, supported types fall back to single-entry queries when possible. |
| Hodge-derived Betti numbers, Euler characteristic, and chi columns | any displayed full Hodge table | These are part of the expanded Hodge card. Abstract surfaces keep symbolic labels such as `b_k`, `e`, and `chi`. |
| Hodge-derived Chern-number displays | any displayed full Hodge table | Shows the top Chern number and, when available from the Hodge table, the `c_1 c_{n-1}` expression. |
| Polyvector parallelogram | curve; projective space; abelian variety; Calabi-Yau complete intersection; symmetric product of a curve in the implemented special cases; product of two factors whose polyvector tables are concrete | Complete intersections with nontrivial canonical class, abstract varieties, and unsupported symbolic cases show symbolic polyvector placeholders when ordinary Hodge numbers do not determine the table. |
| Betti table | projective space; smooth complete intersection | This is the graded Betti table of the homogeneous coordinate ring. Other variety types show a symbolic placeholder because an embedding/resolution is not determined by the variety data alone. |

## Sheaf-Level Outputs

| Output | Implemented for | Notes |
| --- | --- | --- |
| Sheaf cohomology | structure sheaf; Serre twisting sheaf `O_X(r)` on projective spaces and smooth complete intersections; canonical sheaf on projective spaces and smooth complete intersections via adjunction; universal bundle on projective-space-like targets as `O_X(-1)`; universal subbundle on Grassmannians as acyclic; cotangent sheaf via the Hodge row `h^{1,i}` | The chart records dimensions of `H^i`. General abstract, locally free, tangent, divisor, pullback, pushforward, direct sum, tensor, dual, and Schur sheaves do not yet have general sheaf-cohomology formulas. |
| Characteristic classes | abstract sheaf; locally free sheaf; structure sheaf; tangent sheaf; cotangent sheaf; canonical sheaf; Serre twisting sheaf; divisor sheaf; universal bundle; direct sum; tensor product; self sums/products; dual; pullback; pushforward; internal Hom; ideal/normal/relative tangent/relative cotangent constructions; Schur functors in supported cases | Exact formulas depend on the base variety and construction. Free abstract/locally-free sheaves use formal Chern/Chern-character variables unless homology rules provide values. |
| Chern roots display | abstract sheaf and locally free sheaf | Other sheaves are displayed in Chern-class or Chern-character form even when they are locally free, because their formulas are already specialized. |
| Step-by-step class formula | varieties and sheaves with available characteristic-class data | This is not a new invariant, but it is a separate UI/computation surface for reducing formulas, applying rules, and inspecting intermediate terms. |

## Other Implemented Surfaces

| Surface | Implemented for | Notes |
| --- | --- | --- |
| Exports | Hodge numbers; characteristic classes; step-by-step formulas; main object data | Export support follows the same availability as the displayed cards. |
| Single-entry Hodge query | supported high-dimensional variety types | Used when the dimension exceeds the full Hodge-grid display limit. |
| Chart reveal controls | Hodge numbers, Betti table, characteristic classes, sheaf cohomology | A card appears only when the selected object has data for that output. |

## Separate Documents Needed

- Homology class systems by variety type, including bidegrees for products.
- Built-in homology rewrite rules and map/sheaf homology assignment rules.
- Constructor dependency graph, for example which map/sheaf constructions generate companion varieties, sheaves, or maps.
