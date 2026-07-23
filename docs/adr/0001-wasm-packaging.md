# ADR-0001: WASM packaging for the AVAR reference verifier

- Status: **Accepted** — 2026-07-23
- Deciders: Aarmatix maintainers
- Supersedes: none

## Context

The AVAR reference verifier is published to npm as two Node-first packages:

- `@avar-standard/core` — receipt types, canonicalization, hash-chain math
- `@avar-standard/verify` — verification API (WebCrypto, Node 20+)

There is also demand — eventually — to verify AVAR receipts inside browsers,
edge runtimes, and non-Node hosts, where a WASM build of the verifier is a
natural fit.

Three shapes were considered:

1. **Do nothing.** Leave WASM out of the standard entirely; browser
   consumers write their own build.
2. **Ship `@avar-standard/verify-wasm` as its own package**, symmetric with
   `core` / `verify`, built from the same clean-room source in this repo.
3. **Fold WASM into `@avar-standard/verify`** as an optional subpath export
   (e.g. `@avar-standard/verify/wasm`).

## Decision

**Option 1 now. Option 2 later, when browser demand is confirmed.**
**Option 3 is rejected permanently.**

Concretely:

- `@avar-standard/verify` remains a Node-first WebCrypto verifier. It will
  **never** export a `./wasm` subpath, ship a `.wasm` asset, or take on a
  WASM build dependency.
- The name `@avar-standard/verify-wasm` is **reserved** for a future
  standalone WASM package built from this repository, on the same clean-room
  source, and published with npm OIDC provenance.
- The deprecated `@aarmos/avar-verify-wasm` package remains deprecated and
  will not be revived, renamed, or resurrected under the `@avar-standard`
  namespace.

## Consequences

Positive:

- Node and browser release cadences stay decoupled. A browser-only fix
  cannot force a Node re-release, and vice versa.
- `@avar-standard/verify` stays small and dependency-light. Node consumers
  never download a WASM blob they do not use.
- The clean-room story stays legible: one package, one target, one build
  path.
- The reserved name blocks squatting and keeps the future migration
  straightforward.

Negative:

- Browser verification today requires either the standalone `avar` binary
  or a downstream build. This is acceptable given no known browser consumer.

## Trigger to revisit

Publish `@avar-standard/verify-wasm@0.1.0` when **any** of the following is
true:

- A named external integrator (spec-implementer, auditor, or partner)
  requests browser verification with a concrete use case.
- A conformance suite target requires WASM parity.
- The Node verifier gains a runtime that cannot host WebCrypto.

Until then, no WASM ships from this repository.

## Enforcement

- The `packages/verify/package.json` `exports` map MUST NOT contain a
  `./wasm` (or `./wasm.*`) key.
- The publish guard (`scripts/check-publish-names.mjs`) rejects any package
  whose name is not under `@avar-standard/*` and additionally rejects a
  `./wasm` export on `@avar-standard/verify`.
- Reintroducing `@aarmos/avar-verify-wasm` in any form is a publish-guard
  violation.
