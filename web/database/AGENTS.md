# Ramified Minigames i18n requirements

When changing `ramified_minigames.html`, `js/ramified_minigames_setup.js`, the minigame preset catalog, or a minigame-specific engine/UI:

1. Read `implement_plan/ramified_i18n_principles.md` before editing user-visible behavior.
2. Treat English and Simplified Chinese as part of the feature's definition of done, even when the request does not mention translation.
3. Give new static text, placeholders, titles, and accessibility labels explicit `data-i18n*` keys.
4. Give new dynamic text stable `tk()` keys. Use parameters for variable sentences; do not add new `tr()`, `__patterns`, or `__fragments` dependencies.
5. Add non-empty English and Chinese entries together. Identical values are allowed for intentional English names, abbreviations, brands, and notation.
6. Use `lang="en" data-i18n-ignore` for intentionally untranslated static text, or the exact `__intentionalEnglish` source allowlist for unavoidable legacy dynamic text. Never use substring suppression.
7. Run `node js/ramified_minigames_i18n_test.js` and the relevant minigame tests.
8. When `js/i18n/ramified_minigames_locales.js` changes, bump its cache query in `ramified_minigames.html`.

Do not turn an ordinary feature request into a full legacy translation audit unless the user asks for one. Convert newly added and directly modified user-visible strings.
