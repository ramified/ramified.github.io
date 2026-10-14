# Homology Rule Catalogue

This is a mathematician-facing catalogue of the homology rules in `sheaf_calculator_next`.

The calculator usually shows a rule in one of two compact ways:

- In **Homology Classes**, a rule appears as a formula such as `[p]=1`, `H^n=d[p]`, or `Sigma=sum sigma_i`.
- In **step-by-step calculation**, a rule appears as a formula plus a short source label such as `built-in`, `user`, `Pullback`, `Todd`, `GRR`, `SES`, or `simplify`.

The internal rule ids are useful for searching the code, but they are not the best way to read the mathematics. This report therefore starts with the visible mathematical names and only gives ids as a secondary reference.

## 1. How To Read A Rule

A homology rule is a replacement

```text
left monomial -> right polynomial
```

The UI prints it with an equals sign:

```text
left = right
```

For example:

```text
[p] = 1
H^n = d[p]
Theta^g = g![p]
sigma_i^2 = 0
```

The rule is directional. It rewrites the left side into the right side; it is not used as a symmetric equation solver.

The left side must be one monomial. The right side may be a sum.

## 2. Visible Homology Class Shorthand

The Homology Classes panel has a symbol list. The short word shown beside a symbol is often the best way to understand the rules.

| UI kind/shorthand | Typical symbol | Meaning |
| --- | --- | --- |
| `unit` | `1` | The degree zero class. |
| `point` | `[p]` | The top-degree point class. |
| `hyperplane` | `H` | Hyperplane class on projective or complete-intersection varieties. |
| `theta divisor` | `Theta` | Theta class on Jacobian/theta/Picard-style geometries. |
| `exceptional divisor` | `E` | Exceptional divisor on a blow-up at a point. |
| `symplectic` | `a_i`, `b_i` | Symplectic basis classes for a curve or Jacobian. |
| `Macdonald divisor` | `eta` | Divisor class on `Sym^m(C)`: divisors containing a fixed point. |
| `Macdonald product` | `sigma_i` | Product class `a_i b_i`, pulled back from the Jacobian. |
| `Macdonald aggregate` | `Sigma`, `Sigma_k` | `Sigma=sum_i sigma_i`; higher aggregate classes are derived from powers of `Sigma`. |
| `tautological` | `c_i(S)`, `lambda_i` | Tautological classes on Grassmannians or PPAV moduli. |
| `Young` | Schubert/Young symbol | Young/Schubert basis class for Grassmannians. |
| `product box` | box-style product class | A class on a product variety, recording bidegree in both factors. |
| `ramified-cover` | `B`, `R`, `L` | Branch, ramification, or cyclic root class for cover constructions. |
| sheaf class | `c_i(E)`, `ch_i(E)` | Formal Chern or Chern character class of a sheaf. |
| map class | `f^*alpha`, `f_*alpha` | Formal pullback or pushforward class attached to a map. |

The most readable rule list is obtained by grouping rules by these names.

## 3. Standard Variety Rules

These are the built-in rules that come from the type of variety.

### Unit And Point

| Short display | Formula | When it appears | Search id |
| --- | --- | --- | --- |
| unit/point | `[p] -> 1` | On a point variety. | `point-class-unit` |

This is the simplest standard rule: the point class of a point is the unit.

### Hyperplane And Top Degree

| Short display | Formula | When it appears | Search id |
| --- | --- | --- | --- |
| top hyperplane/point | `H^n -> deg(X)[p]` | Projective varieties and complete intersections of dimension `n`. | `top-hyperplane-point` |
| theta top/point | `Theta^n -> n![p]` | Theta/Jacobian-style geometry of dimension `n`. | `top-theta-point` |
| exceptional top/point | `E^n -> (-1)^(n+1)[p]` | Blow-up of a point, dimension `n>1`. | `blowup-exceptional-top` |

For complete intersections, `deg(X)` is the product of the defining degrees.

### Curves And Jacobians

| Short display | Formula | When it appears | Search id |
| --- | --- | --- | --- |
| symplectic pair | `a_i b_i -> [p]` | Curve with added symplectic basis. | `curve-symplectic-*` |
| symplectic zero | all other `a_i a_j`, `b_i b_j`, `a_i b_j` with `i!=j` go to `0` | Curve with added symplectic basis. | `curve-symplectic-*` |
| theta/symplectic | `Theta -> sum_i a_i b_i` | Jacobian with added symplectic basis. | `jacobian-theta-symplectic` |
| top symplectic/point | `a_1 b_1 ... a_g b_g -> +/- [p]` | Jacobian of genus `g` with added symplectic basis. | `jacobian-symplectic-point` |

The sign in the Jacobian top rule is `(-1)^(g(g-1)/2)`.

### Symmetric Products And Macdonald Rules

These are the most important rules to read by shorthand.

| UI shorthand | Symbol | Meaning |
| --- | --- | --- |
| Macdonald divisor | `eta` | Divisor class on `Sym^m(C)`. |
| Macdonald product | `sigma_i` | The product `a_i b_i`. |
| Macdonald aggregate | `Sigma` | The sum `sum_i sigma_i`, also equal to `AJ^*Theta` in the Abel-Jacobi setting. |

Rule families:

| Short display | Formula shape | When it appears | Search id |
| --- | --- | --- | --- |
| eta top/point | `eta^m -> [p]` | Symmetric product with symbolic genus. | `symmetric-product-curve-eta-top-point` |
| Macdonald aggregate | `Sigma -> sum_i sigma_i` | Numeric genus with explicit Macdonald products. | `symmetric-product-curve-macdonald-aggregate-1` |
| Macdonald product square | `sigma_i^2 -> 0` | Numeric genus. | `symmetric-product-curve-macdonald-product-square-*` |
| Sigma nilpotent | `Sigma^(g+1) -> 0` | Numeric genus `g`. | `symmetric-product-curve-sigma-nilpotent` |
| eta/Sigma reduction | `eta^(q+c) Sigma^r -> lower eta powers and higher Sigma powers` | Macdonald tautological relations. | `symmetric-product-curve-tautological-eta-*` |

The eta/Sigma reductions are generated from the Macdonald-type parameters

```text
0 <= r <= min(g,m),  c >= 1,  r+c <= g,  q=m+1-r-2c >= 0.
```

The practical reading is:

```text
large eta powers are reduced using Sigma powers
large Sigma powers eventually vanish
individual sigma_i squares vanish
```

### Grassmannian Rules

These rules become visible when the Young basis is enabled.

| Short display | Formula | When it appears | Search id |
| --- | --- | --- | --- |
| tautological/Young | `c_i(S) -> (-1)^i sigma_(1^i)` | Grassmannian with Young basis. | `grassmannian-tautological-*` |
| Young top/point | `sigma_rectangle -> [p]` | Top Young diagram in the Grassmannian. | `grassmannian-young-top-point` |

The Young basis toggle changes both the displayed basis and the standard rules that are generated.

### PPAV Tautological Rules

For the PPAV moduli shorthand, the visible classes are `lambda_i`.

| Short display | Formula shape | When it appears | Search id |
| --- | --- | --- | --- |
| even lambda reduction | `lambda_2, lambda_4, ...` rewritten using lower lambda products | PPAV moduli. | `ppav-tautological-lambda-*` |
| open zero | `lambda_g -> 0` | PPAV genus `g`. | `ppav-tautological-lambda-g-open-zero` |
| low-genus nilpotence | `lambda_1^2 -> 0` for `g=2`, `lambda_1^4 -> 0` for `g=3` | PPAV genus 2 or 3. | `ppav-tautological-lambda-1-power-*` |

### Product Box Rules

Product varieties use product-box classes to remember which factor a class came from.

| Short display | Formula | When it appears | Search id |
| --- | --- | --- | --- |
| product top/point | `(top class on left) box (top class on right) -> [p]` | Product varieties. | `product-box-*` |

There is also hidden product-box simplification, described below.

## 4. Map Rules

Map rules reduce formal pullback and pushforward classes.

The Homology Classes card displays these under headings like:

```text
f^* relations for codomain classes
f_* relations for domain classes
f^* and f_* relations
```

Common map rules:

| Short display | Formula shape | Related map | Search id |
| --- | --- | --- | --- |
| pullback unit | `f^*1 -> 1` | Any map where pullback classes are displayed. | `default-pullback-unit-*` |
| point pushforward | `f_*[p_source] -> [p_target]` | Maps between positive-dimensional varieties. | `default-point-pushforward-*` |
| point source | `f_*1 -> [p]` | Source is a point. | `default-point-source-pushforward-*` |
| point target | `f_*[p] -> 1` | Target is a point. | `default-point-target-pushforward-*` |
| blowdown unit | `f_*1 -> 1` | Blowdown map. | `default-blowdown-unit-pushforward-*` |
| blowdown point pullback | `f^*[p_base] -> [p_blowup]` | Blow-up of a point. | `default-blowdown-point-pullback-*` |
| cover degree | `f_*1 -> deg(f)` | Ramified or finite cover. | `default-ramified-cover-unit-pushforward-*` |
| ramification pushforward | `f_*(R^k ...) -> branch/root expression` | Ramified cover. | `default-ramified-cover-ramification-pushforward-*` |
| projection pullback | `pr_i^*alpha -> alpha in the i-th box factor` | Product projection. | `default-projection-pullback-*` |
| projection pushforward | `pr_{i,*}(box with top fiber part) -> remaining factor class` | Product projection. | `default-projection-pushforward-*` |
| Picard projection eta | `pr_*(eta) -> 1` | Picard/Poincare product. | `default-picard-projection-eta-pushforward-*` |
| Picard projection gamma square | `pr_*(gamma^2) -> -2Theta` | Picard/Poincare product. | `default-picard-projection-gamma-square-pushforward-*` |

### Abel-Jacobi Map Rules

For an Abel-Jacobi map `AJ`, the readable rules are:

| Short display | Formula shape | Search id |
| --- | --- | --- |
| theta pullback to curve | `AJ^*Theta -> g[p]` | `default-abel-jacobi-theta-pullback-*` |
| theta pullback to symmetric product | `AJ^*Theta -> Sigma` | `default-abel-jacobi-symmetric-theta-pullback-*` |
| symplectic pullback | `AJ^*a_i -> a_i`, `AJ^*b_i -> b_i` | `default-abel-jacobi-a*-pullback-*`, `default-abel-jacobi-b*-pullback-*` |
| curve class pushforward | `AJ_*1 -> Theta^(g-1)/(g-1)!` | `default-abel-jacobi-pushforward-*` |
| point pushforward | `AJ_*[p] -> [p]` | `default-abel-jacobi-pushforward-*` |
| symmetric-product pushforward | eta/Sigma monomials pushed to Segre/theta expressions | `default-abel-jacobi-symmetric-pushforward-*` |

Some Abel-Jacobi pushforwards are computed directly as formulas rather than shown as stored rules.

## 5. Sheaf Rules

Sheaf rules reduce formal class variables.

The Homology Classes card displays them as:

```text
c_i(E) = ...
ch_i(E) = ...
```

Rows marked `special` are generated from known sheaf geometry rather than directly typed by the user.

| Short display | Formula shape | Meaning | Search id |
| --- | --- | --- | --- |
| Chern class | `c_i(E) -> known expression` | Default or user sheaf Chern relation. | `default-sheaf-rule-*`, `sheaf-rule-*` |
| Chern character | `ch_i(E) -> known expression` | Default or user sheaf character relation. | `default-sheaf-rule-*`, `sheaf-rule-*` |
| tangent Chern | `c_i(T_X) -> known expression` | Tangent class promoted to base homology. | `promoted-*` |
| promoted sheaf class | `c_i(E)` added as a homology symbol | Lets a computed sheaf class become part of the base homology basis. | `promoted-*` |

For an abstract sheaf with free class variables, the user can provide the rule. For a constructed sheaf, the calculator often knows the rule from the construction.

## 6. User Basis-Elimination Rules

These are the rules closest to ordinary mathematical workflow: choose a basis expression and tell the calculator how to eliminate it.

| Input place | Short display | Formula shape |
| --- | --- | --- |
| `add rule` in Homology Classes | user | `left monomial = right expression` |
| monomial assignment panel | assignment | selected monomial `= right expression` |
| map relation editor | map relation | `f^*alpha = ...` or `f_*alpha = ...` |
| sheaf relation editor | sheaf relation | `c_i(E)=...` or `ch_i(E)=...` |
| step-by-step saved formula | saved formula | current step formula reused as a rule |

The calculator warns when the chosen left or right side is already reducible by active rules. Mathematically, that means the rule may not be choosing a genuinely undetermined basis element.

## 7. Construction Rules

Some rules appear because a geometric construction was made.

| Construction | Readable rule shape | Search id |
| --- | --- | --- |
| cyclic ramified cover | `f^*B -> deg(f) R` | `default-ramified-cover-cyclic-branch-*` |
| cyclic root class | `B -> deg(f) L` | `default-ramified-cover-root-branch-*` |
| projective branch divisor | `B -> branch_degree H` | `default-ramified-cover-projective-branch-degree-*` |
| projective root class | `L -> root_twist H` | `default-ramified-cover-root-hyperplane-*` |
| ideal sheaf/image | `f_*1 -> [image]`, `f_*[p] -> [p]` | `map-rule-*` |
| Picard/Poincare | `c_1(P) -> gamma + d eta` | `sheaf-rule-*` |
| Abel-Jacobi construction | theta, symplectic, and pushforward defaults | `default-abel-jacobi-*` |

These are not typed by the user, but they are also not universal. They are tied to the construction that created the map, sheaf, or variety.

## 8. Step-By-Step Rule Labels

The step-by-step panel has the clearest short labels. Each row shows a formula and a label.

| Step label | Mathematical meaning |
| --- | --- |
| `built-in` | A built-in homology rule, usually one of the standard variety rules. |
| `user` | A rule typed or assigned by the user. |
| `Pullback` | A pullback functor rule, such as commuting pullback with a class formula. |
| `Tangent class` | A rule replacing a formal tangent Chern class by the computed `c_i(T_X)`. |
| `Todd` | A rule replacing `td_i(X)` by the Todd polynomial in tangent Chern classes. |
| `Segre` | A rule replacing a Segre component by the corresponding derived class polynomial. |
| `sqrt Todd` | A rule replacing a square-root Todd component. |
| `Chern character` | A rule for `ch_i(E)`, including triviality, known computed formulas, or conversion payoffs. |
| `Chern class` | A rule for `c_i(E)`, including rank vanishing and computed Chern formulas. |
| `rank` | Replaces `ch_0(E)` by the known rank. |
| `Switch c/ch` | Conversion between Chern classes and Chern character expressions. |
| `GRR` | Grothendieck-Riemann-Roch pushforward rule. |
| `SES` | Short exact sequence rule. |
| `cached` | A formula remembered from another step. |
| `cached pushforward` | A cached formula after pushforward. |
| `cached pullback` | A cached formula after pullback. |
| `saved formula` | A formula the user explicitly saved as a reusable rule. |
| `assumption` | A formal assumption, usually setting a positive-exponent unresolved term to zero. |
| `simplify` | Runs the ordinary homology simplifier on the current formula. |

Important distinction:

```text
Homology Classes rules are ordinary replacement rules.
Step-by-step rules include ordinary homology rules, but also GRR, SES, Todd, Segre, cached formulas, and other derived identities.
```

## 9. Hidden Default Simplifications

Some reductions affect the output even though they may not appear as ordinary rows in `homology-rules`.

| Hidden mechanism | Mathematical reading |
| --- | --- |
| generated default map rules | Pullback/pushforward rules are generated when a formula needs them. |
| product box simplification | Product classes are normalized by bidegree and impossible bidegrees are removed. |
| nested map expansion | Expressions like `f_*(g^*alpha)` may be expanded structurally. |
| direct projection formulas | Some projection pushforwards are computed directly from the product bidegree. |
| direct Abel-Jacobi formulas | Some Abel-Jacobi pushforwards are computed without first displaying a stored rule. |
| regenerated standard rules | Standard rules are recreated from the variety type unless the user suppressed them. |
| class-step simplify | The step panel can invoke the ordinary simplifier as one selected rule. |

This is why the visible rule list is not always the complete list of possible reductions.

## 10. Practical Classification

| Mathematical source | Short labels/formulas to look for |
| --- | --- |
| Special varieties | unit/point, hyperplane top, theta top, exceptional top, symplectic, Macdonald, Young, PPAV lambda, product box. |
| Maps | `f^*1`, `f_*[p]`, projection pullback/pushforward, Abel-Jacobi, blowdown, ramified cover, Picard projection. |
| Sheaves | `c_i(E)`, `ch_i(E)`, tangent class, promoted Chern class, Poincare first Chern class. |
| User basis elimination | typed equation, monomial assignment, map relation, sheaf relation, saved formula. |
| Hidden defaults | generated map rules, product-box normalization, nested map expansion, direct structural formulas, class-step simplify. |

## 11. Small Code Index

This section is only for locating the implementation.

| Topic | Main implementation names |
| --- | --- |
| Standard variety rules | `standardHomologyRules`, `standardHomologyTopRule`, `standardSymmetricProductMacdonaldRules`, `standardGrassmannianRules`, `standardPpavRules`, `standardCurveSymplecticRules`, `standardJacobianSymplecticRules` |
| Map rules | `defaultMapHomologyRulesForGeometry`, `defaultPullbackUnitRule`, `defaultProjectionPullbackRules`, `defaultProjectionPushforwardRules`, `defaultAbelJacobiPullbackRules`, `defaultAbelJacobiPushforwardRules` |
| Sheaf rules | `defaultSheafHomologyRulesFromBundle`, `applySheafHomologyRulesToBundle`, `renderSheafHomologyRuleInputs` |
| User rules | `addHomologyRuleFromControls`, `parseHomologyRuleEquation`, `saveHomologyMonomialAssignmentFromControls` |
| Step-by-step rules | `collectClassStepRuleCandidates`, `classStepRuleDisplayLatex`, `classStepMaterializeRule`, `applySelectedClassStepRules` |
| Hidden simplification | `applyHomologyRulesBudgeted`, `simplifyProductBoxPolynomial`, `expandNestedMapHomologyVariables` |
