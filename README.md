# AVAR Reference Verifier

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

The **reference implementation** of the AVAR standard verifier. Correctness
over performance. Written clean-room from
[avar-spec](https://github.com/Aarmatix/avar-spec) — no shared code lineage
with any commercial verifier.

## What This Is

A minimal, spec-faithful verifier for AVAR receipts. Its job is to be the
**authoritative correctness reference** — if a receipt verifies here, it is
AVAR-compliant. If it fails here, it is not.

## What This Is NOT

- ❌ A high-performance verifier (see commercial implementations)
- ❌ A policy engine (AVAR standardizes receipts, not policies)
- ❌ A receipt producer (see RFC-0009 §2 for producer requirements)
- ❌ A SIEM/observability tool

## Install

```bash
# TBD after first release
```

## Usage

```bash
avar-verify receipt.json
avar-verify --key public.pem receipt.json
avar-verify --spec-version 1.10 receipt.json
```

Exit codes:
- `0` — receipt verified
- `1` — receipt rejected (see stderr for error code)
- `2` — usage error

## Supported AVAR Versions

- 1.10 (current)
- 1.0–1.9 (legacy mode; see RFC-0008 §7)

## Conformance

This verifier passes every test in
[Aarmatix/avar-conformance](https://github.com/Aarmatix/avar-conformance) at
the `verifier/` tier. CI enforces this on every PR.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bugs against spec behavior are
fixed here; spec changes go through RFCs in `avar-spec`.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
