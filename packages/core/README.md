# `@avar-standard/core`

Core primitives for the open AVAR standard verifier.

This package contains:

- Receipt TypeScript types
- RFC-8785 canonicalization
- RFC-0008 evidence validation (`evidence_type`, `source`, `claims`, coherence)
- RFC-0009 producer-contract signature verification (Ed25519 via Node crypto)
- Normative error codes

It is intentionally narrow: it verifies AVAR receipts. It does not evaluate
policies, parse ASP, or implement any runtime governance workflow.

## Install

```bash
npm install @avar-standard/core
```

## Usage

```ts
import { verifyReceipt } from "@avar-standard/core";

const result = await verifyReceipt(receipt);
console.log(result.valid, result.producer, result.spec_version);
```

## Governance Recovery Points (spec addendum 1.13)

A Governance Recovery Point (GRP) is derived state: it names the artifacts a
workspace resumes governed execution from, and contains none of them. Anyone
can verify one without access to policy text, key material, or receipt bodies.

```ts
import { verifyRecoveryPoint } from "@avar-standard/core";

const report = await verifyRecoveryPoint(recoveryPoint);
// { ok, identityDigest, digestMatches, signatureVerified, issues }
```

`identityDigest` is `sha256(canonicalize({ kind, version, workspaceId, refs }))`.
The envelope (`createdAt`, `provenance`, `changeSetId?`, `deviceFingerprint`,
`devicePubKey`, `signature`) sits outside the digest, so two devices summarizing
identical governance state produce identical digests. Verification is pure: no
clock, no network. Use `dedupeRecoveryPoints()` to collapse envelopes that
describe the same state.

## License

Apache-2.0. See `LICENSE`.
