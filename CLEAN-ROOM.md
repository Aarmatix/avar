# Clean-Room Development Rule

This repository is developed **clean-room** from the AVAR specification.

## What This Means

- No source code is copied, translated, or adapted from any private or
  commercial AVAR verifier (including `@aarmos/avar-core` and
  `@aarmos/avar-verify-wasm`).
- Every implementation decision must be derivable from the public
  specification at `Aarmatix/avar-spec`.
- Contributors who have read private AVAR verifier source code MAY
  contribute, but MUST cite only the public spec in commit messages and
  code comments.

## Why

The reference verifier's authority depends on independence from any single
commercial implementation. If a receipt verifies here, it is compliant with
the standard — not merely compatible with one vendor's interpretation.

## Enforcement

- CI runs `no-aarmos-imports` lint on every commit; any reference to
  `@aarmos/*` or the string `aarmos` in code (case-insensitive) fails the
  build. Documentation naming Aarmos as an example producer is allowed
  only in Markdown files.
- PRs referencing private implementations in commits or comments will be
  rejected.

## For Contributors from Aarmatix

Aarmatix engineers may contribute here, but MUST:

1. Cite only `Aarmatix/avar-spec` RFCs in commit messages.
2. Not paste code, algorithms, or optimizations from the private monorepo.
3. Flag any accidental leakage in PR review.
