# Complexes and field extensions: first integration

## Ownership

- Complex Assets own ordered symbolic/linked terms and differentials, starting degree, direction, and an explicitly unverified/declared condition. Existing Map Assets supply endpoints. No rendering is treated as a proof of exactness or of d² = 0.
- Field extension Assets own a base Field reference, defining polynomial, generator, optional target Field and optional embedding. A target presentation is not an isomorphism certificate.
- Panels own display controls, calculations, and native engine snapshots. Multiple panels can reference one Asset. Editing definitions invalidates calculated displays.

## Available entry points

- Create Complex / Field extension through the existing creation catalog; use Modify, Open and Properties.
- Complex Display reuses the native formula renderer. Complex Operations reuses the existing editor and operations; save generated chain complexes as new Assets. Operations do not silently rewrite the source Asset.
- The legacy Sheaf Complexes card can save selected chain complexes to Assets. Repeating this action updates the migrated Asset by its legacy entry ID. Original entries and their layout metadata are retained.
- Field extension panels expose the ramification canvas, invariants, decomposition and selected-place output. Their compute control uses the existing local arithmetic engine. Number-field bases use the existing LMFDB lookup and may require connectivity.
- A number Field display offers “Ramification over ℚ”; this creates/reuses an explicit extension relation, rather than replacing the Field's identity.

## Deliberately retained legacy paths

This is not the final removal of the full calculators. Filtrations, automatic migration of all old backup-only state, general finite-field function-field base Assets, and explicit embeddings require further modeling. These remain available in the original calculators; unsupported new-panel inputs report their limits rather than substituting a rational base. Legacy filtration entries are never discarded during complex collection.

## Next integration work

1. Add a typed filtration Asset and preserve operation provenance/degree conventions for generated complexes.
2. Model function fields and their constant fields before exposing F_q(t) through the new extension adapter.
3. Add explicit embedding validation and field-presentation compatibility.
4. Migrate complete legacy backups transactionally only after every legacy feature has an Asset/panel destination.
5. Promote selected places and reusable calculation outputs to Assets on request, without flooding the catalog automatically.

## Verification

`math_workspace_structures_test.js` exercises model boundaries. `math_workspace_structures_ui_test.js` exercises native rendering, real input drafts, local computation, migration, shortcuts and backup restoration. Run the shared input tests, object/default/catalog/IO regressions and the native builder's `--check` before delivery.
