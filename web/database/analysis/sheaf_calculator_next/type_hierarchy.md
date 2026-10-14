# Special Type Hierarchy Draft

This document records the current proposed type vocabulary for the rebuilt sheaf calculator.

The visible hierarchy is intentionally not a full mathematical taxonomy. It should list only object types that need their own constructor UI, stored fields, display behavior, or special formulas. Broad facts such as projective, smooth, coherent, locally free, proper, and exact should usually be traits/flags or derived properties.

## Design Rule

Each object should have:

- a primary `kind`: `variety`, `sheaf`, or `map`;
- a primary `type`: the constructor or special behavior family;
- optional properties/traits: smooth, projective, coherent, locally free, proper, exact, etc.;
- special fields only when the type really needs extra input.

This avoids treating every true statement as a new type.

## Variety Types

```text
abstract variety
  point
  curve
  symmetric product of a curve
  projective space
  complete intersection
  Grassmannian
  abelian variety
  moduli of ppav
  product variety
  blow-up
```

Notes:

- Most varieties currently constructed may be smooth projective, but `abstract variety` should remain available for future non-projective or unknown inputs.
- `projective variety` is a trait/category, not a visible type. It should not appear in the constructor list unless a future projective-variety UI needs fields beyond `abstract variety`.
- `product of projective varieties is projective` is a closure property, not a separate type.
- `product variety` stays as a type because it has factor data, projection maps, and homology classes with bidegrees.
- `point`, `curve`, `symmetric product of a curve`, `projective space`, `complete intersection`, `Grassmannian`, `abelian variety`, and `moduli of ppav` stay because they drive special invariants, class systems, default labels, or constructor fields.
- `blow-up` belongs in the beta hierarchy once it has a first-class constructor, because exceptional divisor data and pullback relations are special.

## Sheaf Types

```text
abstract sheaf
  structure sheaf
  locally free sheaf / vector bundle
  tangent sheaf
  cotangent sheaf
  canonical sheaf
  Serre twisting sheaf
  divisor sheaf
  dual bundle
  direct sum sheaf
  tensor product sheaf
  pullback sheaf
  pushforward sheaf
```

Notes:

- `coherent sheaf` is normally a trait/category here, not a visible type, unless a future generic coherent-sheaf constructor needs fields different from `abstract sheaf`.
- `locally free` is both a trait and a useful type when the UI needs rank/vector-bundle behavior.
- `canonical sheaf`, `Serre twisting sheaf`, and `divisor sheaf` are rank-1 locally free sheaves with special formulas/fields, not children of a separate `line bundle` type.
- `direct sum of locally free sheaves is locally free` is a closure rule/property, not a separate type.
- An object may eventually need multiple traits, for example `coherent`, `locallyFree`, `lineBundle`.

## Map Types

```text
abstract map
  variety map
    product projection
    variety map composition
    Abel-Jacobi map
    ramified cover map
    Grassmannian map
  sheaf map
    sheaf map composition
```

Notes:

- `product projection` is a special type of variety map.
- `sheaf map composition` is a special type of sheaf map.
- `variety map` and `sheaf map` remain visible because the UI needs generic maps with different source/target behavior.
- `Grassmannian map` stays because it scaffolds a target Grassmannian/projective space and universal bundle pullbacks from a selected vector bundle.
- Properties such as proper, flat, finite, exact, or rational should be traits/flags, not separate branches unless they need special constructor data.

## Closure Rules / Traits

These should not be inserted as extra type nodes unless the UI needs separate constructor fields. Prefer primitive/generating rules here; consequences obtained by composing earlier rules do not need separate entries.

```text
product(projective variety, projective variety) => projective variety
directSum(locally free sheaf, locally free sheaf) => locally free sheaf
tensor(locally free sheaf, locally free sheaf) => locally free sheaf
dual(locally free sheaf) => locally free sheaf
structure/canonical/Serre twisting/divisor sheaf => locally free sheaf when defined
tangent/cotangent sheaf on a smooth variety => locally free sheaf
locally free sheaf => coherent sheaf
```

Current UI rule:

- A name appears in the visible type hierarchy only if selecting it changes the form, derived fields, available charts, class rules, generated companion objects, or map/sheaf behavior.
- Otherwise it belongs in traits/closure rules, even when it is mathematically important.
