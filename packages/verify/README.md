# `@avar-standard/verify`

High-level entry point for the open AVAR standard verifier.

Most applications should import from here rather than `@avar-standard/core`.
This package re-exports the stable verification API and is versioned
independently of any commercial runtime.

## Install

```bash
npm install @avar-standard/verify
```

## Usage

```ts
import { verifyReceipt } from "@avar-standard/verify";

const result = await verifyReceipt(receipt);
console.log(result.valid, result.producer, result.spec_version);
```

## Standalone binary

For command-line verification, use the `avar` binary instead:

```bash
brew install aarmatix/tap/avar
avar verify path/to/receipt.json
```

## License

Apache-2.0. See `LICENSE`.
