# AVAR Reference Verifier

Clean-room reference implementation of the [AVAR specification](https://github.com/Aarmatix/avar-spec).

**Purpose.** Establish an independent, permissively licensed verifier so that
any producer of AVAR receipts can be checked against the standard rather than
against a single commercial implementation.

**Non-goals.** This verifier is normative, not fast. It does not implement
policy evaluation, ASP grammar, or any runtime concerns beyond receipt
verification per RFC-0008 and RFC-0009.

## Distribution

The AVAR reference verifier is distributed as a **provenance-attested
standalone binary** via GitHub Releases and Homebrew — **not npm**.

```bash
brew install aarmatix/tap/avar
# or download from https://github.com/Aarmatix/avar/releases
avar verify path/to/receipt.json
```

The `package.json` in this repository is an **internal build unit only**
(`private: true`) and is intentionally not published to npm. Public npm
packages will be introduced later as the permanent embeddable SDK:

- `@avar/core` — receipt types, parsing, canonicalization
- `@avar/verify` — embeddable verification API
- `@avar/wasm` — browser / non-Node target

Homebrew answers "how do I verify a receipt?". npm will answer "how do I
embed verification inside my application?" — those are different jobs and
will ship on different timelines.

## Build from source

```bash
git clone https://github.com/Aarmatix/avar.git
cd avar && npm install --package-lock=false && npm run build
node bin/avar-ref.mjs verify path/to/receipt.json
```

Exit codes: `0` valid, `1` rejected with an AVAR error code, `2` usage error.

## Conformance

Every commit runs against [Aarmatix/avar-conformance](https://github.com/Aarmatix/avar-conformance).
A third-party verifier is "AVAR 1.10 compliant" iff it passes the same suite.
