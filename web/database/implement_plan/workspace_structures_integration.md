# Complexes, filtrations and function fields

## Ownership

- Complex Assets own ordered symbolic/linked terms and differentials, starting degree, direction, and an explicitly unverified/declared condition. Existing Map Assets supply endpoints. No rendering is treated as a proof of exactness or of d² = 0.
- Filtration Assets own ordered terms and subquotients, an initial index, increasing/decreasing direction, and a declared/unverified condition. Terms and subquotients can reference existing objects. Decreasing filtrations are reversed for the legacy inclusion renderer; the stored order and indices remain unchanged.
- Function fields are Field Assets with a constant Field reference, independent variables, and an optional algebraic generator and polynomial relation. A polynomial presentation is a declaration, not an irreducibility certificate. Finite extension fields record a prime and degree, allowing finite constant fields of order p^n.
- Field extension Assets own a base Field reference, defining polynomial, generator, optional target Field and optional embedding. A target presentation is not an isomorphism certificate.
- Panels own display controls, calculations, and native engine snapshots. Multiple panels can reference one Asset. Editing definitions invalidates calculated displays.

## Available entry points

- Create Complex / Filtration / Field extension through the existing creation catalog; use Modify, Open and Properties. For function fields, create a Field and select the function-field type in Modify.
- Complexes & Filtrations is the default shared display for both kinds. Each panel owns an ordered list of Asset references, selection, local layout and unsaved previews. Its Assets disclosure adds/removes existing objects. It reuses the standalone chart renderer, templates, import/export and operation UI.
- Modify on a referenced row edits the shared Asset. Clicking a term opens its linked Asset, or focuses that symbolic term in Modify. Removing a row removes only its panel reference. Inline/snake layouts are panel-local; multiple panels can show the same Asset independently.
- Existing operations produce previews. Saving selected previews creates independent Assets, replaces those previews with references, and records the operation and input snapshot as provenance. Preview additions never silently change the source Asset. Old single-object display/operation panel types remain available for backup compatibility but are not advertised as new panels.
- The legacy Sheaf Complexes card can save selected chain complexes and filtrations to Assets. Repeating this action updates the migrated Asset by its legacy entry ID. Original entries are retained; panel presentation settings are handled separately from mathematical definitions.
- Field extension panels expose the ramification canvas, invariants, decomposition and selected-place output. Their compute control uses the existing local arithmetic engine. Number-field bases use the existing LMFDB lookup and may require connectivity.
- A number Field display offers “Ramification over ℚ”; this creates/reuses an explicit extension relation, rather than replacing the Field's identity.
- A rational function Field offers a new extension over itself. An algebraic function Field offers its defining extension over the corresponding rational function Field. The generator in the defining relation is translated to the engine's polynomial variable x. Finite-constant-field bases F_q(t) compute through the existing engine; changing a transitive constant-field dependency invalidates the old result.
- Ramification panels include a collapsible Places control for selecting or adding places, alongside the bound, infinity toggle, and computation status.

## Deliberately retained legacy paths

This is not the final removal of the full calculators. Automatic migration of all old backup-only state and explicit embeddings still require further modeling. The current local ramification engine accepts Q, supported number fields, and F_q(t), with the single base variable named t. Algebraic function fields, multiple variables, and other constant fields can be saved and referenced, but cannot themselves serve as computed ramification bases. Unsupported inputs show a visible explanation and disable computation; no rational base is substituted. Matrix and valued-Number arithmetic over the new field types is explicitly unsupported rather than silently using another coefficient field.

## Next integration work

1. Extend computation certificates and operation provenance/degree conventions for generated diagrams.
2. Extend the arithmetic engine to algebraic function-field bases and additional coefficient-field consumers.
3. Add explicit embedding validation and field-presentation compatibility.
4. Migrate complete legacy backups transactionally only after every legacy feature has an Asset/panel destination.
5. Promote selected places and reusable calculation outputs to Assets on request, without flooding the catalog automatically.

## Verification

`math_workspace_structures_test.js` exercises model boundaries. `math_workspace_structures_ui_test.js` exercises native rendering, real input drafts, local computation, migration, shortcuts and backup restoration. `math_workspace_filtration_fields_ui_test.js` covers linked filtration terms, operation-result saving, function-field form editing, defining-extension creation, F3(t)/F4(t) computations, invalidation, unsupported bases and backup restoration. `math_workspace_diagram_display_ui_test.js` covers mixed displays, direct term editing, independent layouts, a real kernel/cokernel operation, preview ownership, provenance, save-once behavior, removal and backup restore. Run the shared input tests, object/default/catalog/IO regressions and the native builder's `--check` before delivery.
