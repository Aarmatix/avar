# @avar-standard/verify-wasm

**Portable WebAssembly conformance implementation of the AVAR verifier.**

Built from the public [AVAR specification](https://github.com/Aarmatix/avar/tree/main/spec).
Verification-only. Runs in browsers, edge runtimes, Node.js, and air-gapped
environments. No key generation, no signing, no network, no randomness.

## What this is (and isn't)

- ✅ A **conformance** implementation — proves AVAR is defined by its
  spec, not by any single implementation.
- ✅ **Independent packaging**: parsing, canonicalization, and chain
  traversal are reimplemented in this package directly from the AVAR
  spec. Nothing imported from `@avar-standard/verify` (the JS
  reference).
- ⚠️ **Shared primitives, disclosed.** Both implementations use
  `@noble/hashes` and `@noble/ed25519`. Cryptographic-primitive
  diversity is on the roadmap via a future native Rust verifier with
  separate crypto (RustCrypto).
- ❌ **Not** a signer. Not an authoring library. Not a runtime.

## Install

```bash
npm i @avar-standard/verify-wasm
```

## Use

```js
import { verifyReceipt, verifyChain } from "@avar-standard/verify-wasm";

const ok = await verifyReceipt(receiptBytes, publicKeyBytes);
const chainOk = await verifyChain(bundleBytes, publicKeyBytes);
```

Both functions return `{ ok: boolean, reason?: string }` and are
synchronous inside WASM. The outer `async` wraps WASM instantiation.

## Conformance

Every published version passes the deterministic AVAR test-vector suite
in [`packages/conformance`](../conformance). CI cross-checks this WASM
build against the JavaScript reference (`@avar-standard/verify`) on
every commit — byte-identical verdicts across the full vector set.

## Roadmap

- **v0.1** (this release) — Portable WASM, Javy + Noble.
- **v0.2** — Additional vector coverage as the spec grows.
- **Future** — Native Rust verifier with separate crypto stack for
  full implementation diversity.

## License

Apache-2.0. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
