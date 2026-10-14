# Sheaf Identification Rules

This document is a catalogue for future sheaf-rewrite rules in the calculator.
These are not homology rules. A homology rule rewrites a class expression such as
`H^n -> d[p]`; a sheaf identification rule rewrites a sheaf object or sheaf
expression into an isomorphic sheaf expression that is easier to compute with.

The intended use is computational: when a user asks for cohomology,
characteristic classes, Chern roots, or step-by-step formulas of a sheaf `F`,
the calculator may first replace `F` by an identified expression `G`, then use
the existing formulas for `G`.

## Rule Shape

A future implementation should treat these rules as derived computation rules,
not as destructive edits to the user's stored sheaf object.

Suggested rule record fields:

| Field | Meaning |
| --- | --- |
| `id` | Stable internal id, for example `identify-abelian-tangent-${variety.id}`. |
| `source` | Sheaf pattern to recognize, such as `tangent` on an abelian variety. |
| `target` | Easier sheaf expression, such as `O_A^{oplus n}`. |
| `guards` | Conditions required for the identification to be valid. |
| `surfaces` | Outputs that may use the rewrite: cohomology, classes, roots, or steps. |
| `notes` | Mathematical explanation and implementation caveats. |

Target expressions should reuse existing sheaf construction shapes whenever
possible: `structure`, `twist`, `direct-sum`, `tensor`, `dual`, `pullback`,
and later tautological or Hodge-bundle expressions such as `S`, `Q`, and `E`.

Cycle guards are important. For example, `O_X(0) -> O_X` should not create a
reverse rewrite back to `O_X(0)`, and `omega_X -> O_X(k)` should not conflict
with a user-created line bundle named as a canonical sheaf.

## Direct V1 Identification Candidates

These are the highest-value rules because their targets are already close to
the calculator's existing sheaf types.

| Geometry | Source sheaf | Target expression | Guards | Notes |
| --- | --- | --- | --- | --- |
| Any variety `X` | no selected sheaf | `O_X` | Main calculation has a variety but no sheaf selected. | Already used implicitly in some cohomology paths. |
| Any variety `X` | `O_X(0)` | `O_X` | `twist = 0`. | Normalization rule for line-bundle computations. |
| Abelian variety `A`, `dim A = n` | `T_A` | `O_A^{oplus n}` | `A` is an abelian variety. | Current class formulas already use trivial tangent data. This rewrite also helps sheaf cohomology. |
| Abelian variety `A`, `dim A = n` | `Omega^1_A` | `O_A^{oplus n}` | `A` is an abelian variety. | Dual of the trivial tangent bundle. |
| Abelian variety `A` | `omega_A` | `O_A` | `A` is an abelian variety. | Trivial canonical bundle. |
| Projective space `P^N` | `omega_{P^N}` | `O_{P^N}(-N-1)` | Base is projective space. | Empty-degree case of the complete-intersection adjunction formula. |
| Projective line `P^1` | `omega_{P^1}` | `O_{P^1}(-2)` | Base is `P^1`. | Special visible case of the previous rule. |
| Projective line `P^1` | `T_{P^1}` | `O_{P^1}(2)` | Base is `P^1`. | Equivalent to `omega_{P^1}^{-1}`. |
| Smooth complete intersection `X in P^N` of degrees `d_1,...,d_c` | `omega_X` | `O_X(d_1 + ... + d_c - N - 1)` | Base has embedded complete-intersection data. | This is the adjunction formula. |
| Projective-like embedded target `X` | universal line or universal bundle | `O_X(-1)` | Base supports the projective hyperplane twist. | Current cohomology support already treats projective universal bundle this way. |
| Grassmannian `Gr(r,N)` | universal bundle | `S` | Base is a Grassmannian. | The universal bundle is the tautological subbundle. |
| Grassmannian `Gr(r,N)` | `T_Gr` | `S^* tensor Q` | Base is a Grassmannian with tautological `S` and quotient `Q`. | Existing characteristic formula uses this tensor description. |
| Grassmannian `Gr(r,N)` | `Omega^1_Gr` | `S tensor Q^*` | Base is a Grassmannian with tautological `S` and quotient `Q`. | Dual of the tangent identification. |
| Grassmannian `Gr(r,N)` | `omega_Gr` | `O_Gr(-N)` | Plucker twist is available. | `N` is the ambient vector-space dimension in `Gr(r,N)`, not the dimension of the Grassmannian. |
| Smooth curve `C` | `Omega^1_C` | `omega_C` | Base is a smooth curve. | On a smooth curve, the cotangent bundle is the canonical line bundle. |
| Smooth curve `C` | `T_C` | `omega_C^{-1}` | Base is a smooth curve. | The tangent line is the dual of the canonical line. |
| Smooth curve `C`, genus `g` | `omega_C` | line bundle of degree `2g - 2` | Curve genus is known or symbolic. | Useful for class and degree-level calculations even when no `O(k)` exists. |
| Product `X x Y` | `T_{X x Y}` | `p_X^*T_X direct-sum p_Y^*T_Y` | Product projections are known. | Current class formula already pulls back factor tangent bundles. |
| Product `X x Y` | `Omega^1_{X x Y}` | `p_X^*Omega^1_X direct-sum p_Y^*Omega^1_Y` | Product projections are known. | Dual product formula. |
| Product `X x Y` | `omega_{X x Y}` | `p_X^*omega_X tensor p_Y^*omega_Y` | Product projections are known. | Exterior top form of the cotangent direct sum. |

## Useful Closure Rules

These are generic sheaf-expression simplifications rather than geometry-specific
identifications. They should be lower priority than the direct rules above but
will make the rule engine much more effective.

| Source expression | Target expression | Guards | Notes |
| --- | --- | --- | --- |
| `O_X(a) tensor O_X(b)` | `O_X(a+b)` | Same base and same hyperplane/twist convention. | Applies to projective and embedded complete-intersection twists. |
| `(O_X(a))^*` | `O_X(-a)` | Same twist convention. | Also supports canonical duals such as `T_{P^1}`. |
| `E direct-sum 0` | `E` | Zero sheaf expression exists. | Optional normalization. |
| `E tensor O_X` | `E` | Same base. | Optional normalization. |
| `dual(dual(E))` | `E` | `E` locally free. | Avoid applying when dual is only formal for non-locally-free sheaves. |
| `pullback(f, O_Y(k))` | `O_X(k)` or named pullback line | Pullback map preserves the chosen hyperplane class. | Only safe for maps with known hyperplane-pullback behavior. |

## Sequence-Derived Or Formula-Derived Candidates

These are mathematically important, but they are not simple one-object
replacements in the current model. They should be represented as exact
sequences, K-theory formulas, or specialized class/cohomology formulas unless
the target expression language becomes richer.

| Situation | Mathematical shape | Why it is not a simple direct rewrite |
| --- | --- | --- |
| Projective space tangent | Euler sequence: `0 -> O -> O(1)^{oplus N+1} -> T_{P^N} -> 0`. | Gives classes and sometimes cohomology through a sequence, but `T_{P^N}` is not generally a direct sum of line bundles. |
| Projective space cotangent | Dual Euler sequence. | Same issue as tangent. |
| Smooth complete-intersection tangent | Normal sequence: `0 -> T_X -> T_{P^N}|_X -> direct-sum O_X(d_i) -> 0`. | Computes classes through a sequence, not an isomorphism to a simpler sheaf. |
| Smooth complete-intersection cotangent | Conormal sequence: `0 -> direct-sum O_X(-d_i) -> Omega^1_{P^N}|_X -> Omega^1_X -> 0`. | Sequence rule, not direct replacement. |
| Ramified cover cotangent | `0 -> pi^*Omega^1_X -> Omega^1_Y -> Omega^1_{Y/X} -> 0`. | Existing generated sheaves and SES data should remain sequence-based. |
| Ramified cover tangent | Dual tangent/quotient sequence governed by ramification. | Depends on the ramification divisor and smoothness assumptions. |
| Blow-up canonical | `omega_{Bl_Z X} -> beta^*omega_X tensor O((c-1)E)`. | Direct only after the blow-up center, exceptional divisor, and divisor-line language are first-class. |
| Poincare/Picard constructions | First Chern formulas for Poincare-type line bundles. | Current support is mainly class-level, not a canonical replacement by a simpler stored sheaf. |
| Moduli of ppav | `T` and `Omega^1` expressed through symmetric powers of the Hodge bundle. | Needs a Hodge bundle object and symmetric-power expression support. |
| Symmetric products of curves | Tangent, cotangent, and canonical formulas via Macdonald-style tautological classes. | Current support is formula-level rather than a simple sheaf expression. |

## Suggested Priority

1. Implement direct line/trivial-bundle rewrites: abelian variety,
   projective/complete-intersection canonical, `P^1`, and projective universal
   bundle.
2. Add product rewrites using existing pullback, direct-sum, and tensor sheaf
   constructions.
3. Add Grassmannian rewrites once `S`, `Q`, and their duals are expressible as
   target sheaves rather than only internal formula helpers.
4. Add generic closure simplifications for twists, duals, and identity tensor
   factors.
5. Keep Euler, normal, ramified-cover, blow-up, ppav-moduli, Picard, and
   symmetric-product rules as sequence/formula rules until the expression model
   can represent them cleanly.

## Acceptance Criteria For Future Implementation

- Applying an identification does not rename or overwrite the user's original
  sheaf object.
- The UI can explain the chosen identification, for example
  `T_A identified with O_A^{oplus n}`.
- The rule engine avoids cycles and applies at most one canonical normalization
  direction for equivalent expressions.
- Rules have stable ids so users can suppress or inspect automatic
  identifications later.
- Tests cover abelian tangent/cotangent/canonical rewrites, complete-
  intersection canonical rewrites, the `P^1` canonical and tangent cases,
  projective universal bundle to `O(-1)`, Grassmannian tangent/canonical rules,
  and product tangent/canonical rules.

## Assumptions

- This catalogue lists calculator-relevant rules from the current type system
  and known built-in formulas. It is not intended to enumerate every possible
  sheaf isomorphism in algebraic geometry.
- `omega_{P^1} -> O_{P^1}(-2)` is the canonical rule for `P^1`; `O(2)` belongs
  to `T_{P^1}` or equivalently `omega_{P^1}^{-1}`.
- The first implementation should prefer direct replacements that unlock
  existing computation surfaces over more ambitious exact-sequence reasoning.
