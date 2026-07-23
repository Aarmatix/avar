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

## License

Apache-2.0. See `LICENSE`.
