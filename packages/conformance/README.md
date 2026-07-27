# AVAR Conformance Suite

Deterministic test vectors that define what a conforming AVAR verifier
MUST return. Every implementation (`@avar-standard/verify`,
`@avar-standard/verify-wasm`, and future native verifiers) MUST pass
every vector byte-identically.

## Layout

```
vectors/
  001-valid-receipt.json
  002-tampered-payload.json
  003-invalid-signature.json
  004-valid-chain.json
  005-broken-chain.json
```

## Vector schema

```json
{
  "name": "human-readable",
  "kind": "receipt" | "chain",
  "publicKey": "<hex ed25519 public key>",
  "input": { ... AVAR receipt or bundle ... },
  "expect": { "ok": true } | { "ok": false, "reason": "<code>" }
}
```

Reason codes are the enum in the AVAR spec's Verifier Errors section
(`invalid-json`, `invalid-shape`, `signature-mismatch`,
`signature-malformed`, `chain-break@<i>`, ...).

## Adding vectors

New vectors MUST land with a spec addendum entry describing the
scenario. Bumping a vector after publication requires a MINOR spec bump.
