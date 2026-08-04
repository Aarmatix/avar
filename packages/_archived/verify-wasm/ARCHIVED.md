# Archived: `@avar-standard/verify-wasm`

**Status: archived, non-conformant. Do not revive this source.**

This package was published as `0.1.1` and did not meet the AVAR implementation
requirements now recorded in [`docs/avar/IMPLEMENTATION.md`](../../../docs/avar/IMPLEMENTATION.md).
Specifically, it failed requirement 5 (**installable and callable from its
published artifact**): the published tarball omitted `verify.js`, so the
declared entry point could not be imported.

It was archived for **non-conformance**, not because WASM verification is a bad
idea. Nothing about AVAR semantics is deprecated by this action.

## What happened

- `0.1.2` was published as a terminal tombstone release.
- All versions of `@avar-standard/verify-wasm` are deprecated on npm.
- The npm name remains reserved; it will not be reused for a different artifact.
- `@avar-standard/verify-rs` is reserved for a future independently developed
  implementation, should one be built.

## The supported public verification surface

- [`@avar-standard/verify`](https://www.npmjs.com/package/@avar-standard/verify) — embeddable JS verifier
- [`@avar-standard/core`](https://www.npmjs.com/package/@avar-standard/core) — Entry, Bundle, canonicalization
- [`@avar-standard/fixtures`](https://www.npmjs.com/package/@avar-standard/fixtures) — the immutable normative conformance corpus
- `avar` standalone binary — `brew install aarmatix/tap/avar`

Any future WASM implementation MUST clear the fixture corpus for every AVAR
version it declares, and MUST pass the pack-and-import check, before it is
published under the `@avar-standard` scope.
