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

`@avar-standard/verify-wasm` is **deprecated and archived**. Its `0.1.1`
release did not meet the AVAR implementation requirements (the published
tarball was not importable), and `0.1.2` is a terminal tombstone. The npm name
stays reserved and will not be reused for a different artifact. See
[`packages/_archived/verify-wasm/ARCHIVED.md`](./packages/_archived/verify-wasm/ARCHIVED.md).

`@avar-standard/verify-rs` is reserved for a future independently developed
implementation. None exists today, and AVAR does not require one.

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

The AVAR standard is defined by three normative documents, all in this repository:

| Document | Answers |
| --- | --- |
| [`docs/avar/SPEC.md`](./docs/avar/SPEC.md) | What is an AVAR Entry, Bundle, and Verification Result? |
| [`docs/avar/IMPLEMENTATION.md`](./docs/avar/IMPLEMENTATION.md) | When may software call itself an AVAR implementation? |
| [`docs/avar/fixtures/`](./docs/avar/fixtures) | Did it actually? |

The fixture corpus is published immutably as
[`@avar-standard/fixtures`](https://www.npmjs.com/package/@avar-standard/fixtures).
Software may describe itself as an AVAR verifier only if it satisfies the six
requirements in `IMPLEMENTATION.md` **for every AVAR version it claims to
support**. Third-party implementations are encouraged but not required; one
conforming implementation is enough to define the standard.

### Conformance matrix (AVAR 1.0)

| Implementation | Family | Author | Independently developed | Fixtures |
| --- | --- | --- | --- | --- |
| `@avar-standard/verify` | JavaScript | Aarmatix | No | 13/13 |
| `avar` binary | JavaScript | Aarmatix | No | 13/13 |
| _(none yet)_ | — | third party | Yes | — |
