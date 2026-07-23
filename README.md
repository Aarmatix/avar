# AVAR Reference Verifier

Clean-room reference implementation of the [AVAR specification](https://github.com/Aarmatix/avar-spec).

**Purpose.** Establish an independent, permissively licensed verifier so that
any producer of AVAR receipts can be checked against the standard rather than
against a single commercial implementation.

**Non-goals.** This verifier is normative, not fast. It does not implement
policy evaluation, ASP grammar, or any runtime concerns beyond receipt
verification per RFC-0008 and RFC-0009.

## Distribution

The AVAR reference verifier ships in two forms:

**1. Standalone binary** — provenance-attested, via GitHub Releases and Homebrew.

```bash
brew install aarmatix/tap/avar
# or download a platform tarball from https://github.com/Aarmatix/avar/releases
avar verify path/to/receipt.json
```

**2. Embeddable npm packages** — for applications that need to verify
receipts inside their own runtime (Node 20+ / any WebCrypto-capable host):

- [`@avar-standard/core`](https://www.npmjs.com/package/@avar-standard/core) — receipt types, parsing, canonicalization
- [`@avar-standard/verify`](https://www.npmjs.com/package/@avar-standard/verify) — embeddable verification API

Both are published from this repository with npm OIDC provenance and are
Apache-2.0 licensed.

### Browser / WASM

A separate `@avar-standard/verify-wasm` package for browser and non-Node
targets is **reserved but not yet published**. See
[`docs/adr/0001-wasm-packaging.md`](./docs/adr/0001-wasm-packaging.md) for
the decision to keep WASM out of `@avar-standard/verify` and ship it as its
own package when browser demand is confirmed.

### Supported platforms

Prebuilt verifier binaries are available for **macOS (arm64, x64)** and
**Linux (arm64, x64)** beginning with **v0.1.1**. Homebrew
(`brew install aarmatix/tap/avar`) is supported on both macOS and Linuxbrew.

## Build from source

```bash
git clone https://github.com/Aarmatix/avar.git
cd avar && npm install && npm run build
node bin/avar.ts verify path/to/receipt.json
```

Exit codes: `0` valid, `1` rejected with an AVAR error code, `2` usage error.

## Conformance

Every commit runs against [Aarmatix/avar-conformance](https://github.com/Aarmatix/avar-conformance).
A third-party verifier is "AVAR 1.10 compliant" iff it passes the same suite.
