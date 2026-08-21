# Browser-only WebAssembly CAS route for the Global Place Ramification Calculator

## Decision

Do not build a new global-field computer algebra system in page JavaScript.
Instead, keep the calculator as a static site and run a proven computer algebra
engine as WebAssembly in each visitor's browser. The page sends no mathematical
input to a server: the browser downloads the engine once, runs the calculation
locally, and renders the returned place decomposition.

This supersedes the removed Sage/FastAPI service path; it is not a small change
to the current calculator.

## Current interim implementation

The page currently includes a deliberately limited JavaScript-only number-field
mode. It accepts monic, expanded integer polynomials of degree 2 through 7 and
uses a squarefree reduction modulo each displayed rational prime. A prime with
repeated reduction is marked **bad** and no local (e_i, f_i) data is shown.
At every displayed squarefree prime, the factor degrees are exact. The mode also
requires a small-prime irreducibility certificate and leaves archimedean data
uncomputed. The F_q(t) selector is reserved for the WebAssembly-CAS work; it
intentionally reports that it is unavailable rather than giving an inexact
answer.

## Why bad places require a CAS

For a number field presented as L = Q(alpha), factoring the displayed
polynomial modulo p computes the factorisation of p O_L only if p does not
divide [O_L : Z[alpha]].

At primes dividing that index, one must first construct the maximal order O_L,
then factor the ideal p O_L. The analogous function-field calculation needs
maximal orders at finite places and at infinity. Thus a browser-only
implementation must carry the same integral-basis, ideal, and local-factorisation
machinery as a CAS; merely translating the current polynomial-mod-prime
JavaScript is not exact at bad places.

## Candidate engines

### First feasibility target: PARI/GP compiled to WebAssembly

PARI/GP is a mature number-theory CAS and the PARI project publishes a browser
WebAssembly GP build and a JavaScript/WASM distribution directory:

- [Run PARI/GP in the browser](https://pari.math.u-bordeaux.fr/gpexpwasm64.html)
- [PARI JavaScript/WASM files](https://pari.math.u-bordeaux.fr/pub/pari/javascript/)
- [PARI/GP documentation](https://pari.math.u-bordeaux.fr/doc.html)

It is the best first target for exact number-field decomposition. A worker
wrapper should expose structured operations equivalent to constructing a number
field, constructing its maximal order, and factoring a rational prime ideal;
it must not expose an unrestricted GP console.

PARI is GPL-2.0-or-later. Shipping its WebAssembly binary with this site
therefore requires a licence review and GPL-compliant source/corresponding-source
distribution. See the [PARI licence FAQ](https://pari.math.u-bordeaux.fr/faq.html).

### Function fields are a separate feasibility gate

The desired F_q(t) extension support, especially exact maximal-order
decomposition, infinity, and inseparability, must be demonstrated against the
selected WebAssembly engine before committing to the integration. Do not claim
that a PARI-only wrapper provides this scope until the following examples pass:

1. F_3(t)(alpha), alpha^2 = t: ramification at t and infinity; split at t - 1;
   inert at t + 1.
2. F_2(t)(alpha), alpha^2 = t: purely inseparable metadata and the unique place
   above every selected base place.
3. A defining polynomial with denominators, so that finite and infinite maximal
   orders are both exercised.

Sage-in-the-browser remains research rather than a dependency to select today:
the CoWasm project explicitly describes full SageMath support as a long-term
target. [CoWasm project](https://github.com/sagemathinc/cowasm)

If no maintained WebAssembly engine passes the function-field gate, retain
browser-only exact support for L/Q and label the F_q(t) mode as unavailable
rather than silently using polynomial reduction at bad places.

## Proposed client architecture

```text
Calculator UI
    |
    v
Typed request: base + polynomial + selected places
    |
    v
Web Worker (no DOM access, cancellable)
    |
    v
CAS adapter  --->  pinned .wasm engine + data files
    |
    v
Typed decomposition response: places, e_i, f_i, g, source, warnings
    |
    v
Existing canvas, table, selected-place panel, and JSON export
```

The Web Worker is important: exact arithmetic can run for seconds and must not
freeze the page. It should terminate/reset the CAS instance after a timeout or
memory failure, then return a structured error to the UI.

## Milestones

1. **Audit and spike.** Pin an engine version, verify its licence obligations,
   build a reproducible WASM artefact, and record its size, cold-start time,
   memory use, and browser support.
2. **Exact L/Q.** Implement a small message protocol in a Worker: health,
   decomposeNumberField, and cancel. Support the current polynomial input,
   p <= B, manually added primes, and the real place. Validate against the
   current Sage service for quadratic, nonquadratic, and index-dividing primes.
3. **Function-field gate.** Implement or reject the three tests above. Only
   expose F_q(t) in the public UI when exact maximal-order results are
   independently verified.
4. **Exports and offline operation.** Put engine version, algorithm source, and
   warnings into the v2 export. Cache versioned WASM assets with a service worker
   only after integrity/versioning behavior is tested.
5. **Expand the browser engine.** Once both supported bases pass the test suite,
   replace the temporary squarefree-reduction calculator with the WebAssembly
   engine and preserve its limits/warnings in exports.

## Non-negotiable safety and correctness rules

- Use a typed request protocol and fixed CAS routines. Do not execute arbitrary
  GP/Sage code derived from text fields.
- Parse and validate field and place input before calling the worker.
- Bound polynomial degree, place count, worker time, and memory; return a
  recoverable computation-too-large result.
- Include the CAS version and full input in every export for reproducibility.
- Compare every new backend result with known examples and, during development,
  with the Sage reference implementation.
- Do not use a factorisation of the presentation polynomial alone as an exact
  answer at bad places.

## Deployment consequence

This path needs only static hosting: Cloudflare Pages/Workers Free can serve the
HTML, JavaScript, and WASM files. Computation happens on the visitor's device,
so no Docker container or Cloudflare server-side CAS is required. The tradeoff
is a potentially large initial download and device-dependent computation time.
