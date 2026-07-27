# Changelog

All notable changes to `@avar-standard/verify-wasm` are documented here.
This package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.1 — 2026-07-27

- Expand conformance suite to 10 vectors covering the full failure grid:
  valid receipt, tampered payload, non-object input, missing required field,
  wrong-type `prev`, malformed signature hex, non-canonical input ordering,
  valid two-receipt chain, chain break at index 1, and non-bundle input.
- Fixture generator now signs chain vectors end-to-end and applies
  reason-driven corruption (`signature-mismatch`, `signature-malformed`,
  `chain-break@i`) so every vector is byte-reproducible from source.
- Ship `CHANGELOG.md` inside the tarball.

## 0.1.0 — Initial release

- Portable WebAssembly conformance implementation of the AVAR verifier,
  compiled with Javy from a clean-room JS entry point.
- Verification-only surface: `verifyReceipt(bytes, publicKey)` and
  `verifyChain(bytes, publicKey)`. No signing, no key generation, no
  network access.
- Independent canonical JSON serializer (not shared with
  `@avar-standard/verify`) to catch canonicalization drift.
- CI parity check against `@avar-standard/verify` on every conformance
  vector; WASM surface allowlist and string scan to keep the binary
  free of private symbols.
- npm provenance enabled.
