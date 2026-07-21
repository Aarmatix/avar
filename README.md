# AVAR Reference Verifier

Clean-room reference implementation of the [AVAR specification](https://github.com/Aarmatix/avar-spec).

**Purpose.** Establish an independent, permissively licensed verifier so that
any producer of AVAR receipts can be checked against the standard rather than
against a single commercial implementation.

**Non-goals.** This verifier is normative, not fast. It does not implement
policy evaluation, ASP grammar, or any runtime concerns beyond receipt
verification per RFC-0008 and RFC-0009.

## Install

```bash
npm install @avar/reference-verifier
```

## Use as a library

```ts
import { verifyReceipt } from "@avar/reference-verifier";

const result = await verifyReceipt(receipt);
// { valid, legacy, warnings, producer, spec_version }
```

## Use as a CLI

```bash
npx avar-ref verify path/to/receipt.json
```

Exit codes: `0` valid, `1` rejected with an AVAR error code, `2` usage error.

## Conformance

Every commit runs against [Aarmatix/avar-conformance](https://github.com/Aarmatix/avar-conformance).
A third-party verifier is "AVAR 1.10 compliant" iff it passes the same suite.

## Clean-room rule

See [CLEAN-ROOM.md](./CLEAN-ROOM.md). This repository does not include or
adapt code from any commercial AVAR verifier.

## License

Apache-2.0. See [LICENSE](./LICENSE).
