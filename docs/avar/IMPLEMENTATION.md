# AVAR Implementation Requirements

**Status: normative.** This document is part of the AVAR standard.

| Document | Answers |
| --- | --- |
| `SPEC.md` | What is an AVAR Entry, Bundle, and Verification Result? |
| `IMPLEMENTATION.md` (this file) | When may software call itself an AVAR implementation? |
| `fixtures/` | Did it actually? |

Where this document and `SPEC.md` disagree, `SPEC.md` governs the wire format
and this document governs implementation conformance. Where either disagrees
with the normative fixture corpus, the disagreement is a **blocking defect** in
one of the two — never a matter of interpretation.

---

## 1. Scope and maturity

AVAR is defined by its specification and its fixtures, not by the number of
implementations that exist.

> **Third-party implementations are encouraged but not required.**

One conforming implementation is enough to define the standard. Multiple
independently developed implementations strengthen *confidence* in it. That is a
maturity property, not a validity requirement. No reader should conclude that
AVAR is incomplete because a given language binding does not yet exist.

---

## 2. What counts as an AVAR implementation

> A package MAY describe itself as an AVAR verifier only if it conforms to the
> normative AVAR implementation requirements **for every AVAR version it claims
> to support**.

The requirement is recursive by design. A package advertising support for
`1.0`, `1.1`, and `1.2` must clear the fixture corpus of all three. Partial
support MUST be declared as partial support.

For each declared AVAR version, a conforming implementation:

1. **Passes the normative fixtures** published for that AVAR version.
2. **Emits normative Verification Results** — the issue kinds and error codes
   defined in `SPEC.md` §6, not bespoke strings.
3. **Implements normative canonicalization** — currently RFC-8785 JCS with
   Unicode NFC.
4. **Advertises its supported AVAR version(s)** both in package metadata and at
   runtime.
5. **Is installable and callable** from its published artifact, proven by a
   pack-and-import check: install the published tarball into a clean directory,
   import the declared entry point, verify one fixture.
6. **Identifies itself in every verification result** — verifier name,
   implementation version, AVAR version, fixture-corpus version, and OPTIONALLY
   the canonicalization profile.

Example self-identification block:

```text
Implementation:            @avar-standard/verify 1.2.3
Implements:                AVAR 1.0
Fixture corpus:            1.0.1
Canonicalization profile:  RFC8785-JCS+NFC   (optional)
```

Software that does not meet all six for a declared version is **experimental**.
It may exist, and it may be published, but it MUST NOT describe itself as an
AVAR verifier or imply a conformance claim.

### Why requirement 6 is a verifier requirement, not a wire-format field

An Entry and a Bundle carry evidence. They deliberately carry no provenance
about who later inspected them. The `VerificationResult` is verifier output, so
self-identification is enforced by the conformance suite without reopening the
AVAR 1.0 core wire format.

---

## 3. Invariants

- **I-A — One semantics per AVAR version.** For any declared AVAR version there
  is exactly one normative verification semantics. All conforming
  implementations of that version MUST produce identical results for the
  normative fixtures.
- **I-B — Conformance-gated publication.** No artifact publishes under the
  `@avar-standard` namespace unless it passes the normative conformance suite
  for its declared capability.
- **I-C — No unrunnable verdict-bearing artifact.** A verifier that throws on
  import is a false claim about the standard.
- **I-D — Honest conformance reporting.** Implementations sharing an author or a
  code family with the reference are disclosed as such. The reported property is
  *independently developed conformance*, never a count of implementations.
- **I-E — Self-identifying results.** Every verification result states which
  verifier, implementation version, AVAR version, and fixture corpus produced
  it.
- **I-F — Fixture immutability.** Once published, a normative fixture corpus is
  immutable. Corrections are made only by publishing a new corpus version.
  Corpus `1.0.1` is never overwritten; `1.0.2` supersedes it.

---

## 4. Version layers

Three versions move independently.

| Layer | Example | Changes when |
| --- | --- | --- |
| AVAR specification | `1.0`, `1.1`, `2.0` | Wire format, semantics, or canonicalization rules change |
| Fixture corpus | `1.0.0`, `1.0.1` | Vectors added, clarified, or expected error codes tightened without changing AVAR semantics |
| Implementation | `@avar-standard/verify@1.2.3` | Implementation fixes or optimizations |

A verifier declares: *"Conforms to AVAR 1.0 against fixture corpus 1.0.1."*

Patch-level corpus bumps do not require a new AVAR minor version. Per **I-F**
they are additive publications, never edits.

The corpus is distributed as `@avar-standard/fixtures@<corpus-version>` on npm.
npm was chosen over release assets deliberately: versioned, immutable, cached,
dependency-managed, offline-capable, and natural in CI. Release assets remain
available for humans.

---

## 5. Conformance reporting

Conformance is reported as a matrix, with independence stated in words rather
than as a boolean.

| Implementation | Family | Author | AVAR | Fixtures | Independence |
| --- | --- | --- | --- | --- | --- |
| `@avar-standard/verify` | JS | Aarmatix | 1.0 | 13/13 | Reference |
| `@aarmos/cli` | JS (consumes reference) | Aarmatix | 1.0 | 13/13 | Same implementation family |
| Aarmos runtime | JS (consumes reference) | Aarmatix | 1.0 | 13/13 | Same implementation family |
| *(none yet)* | — | third party | — | — | Independently developed |

The empty row is deliberate. It states the standard's real maturity and makes
the first external conformer's arrival visible.

---

## 6. Publication gate

Every published verifier MUST clear two passes in CI:

- **Local pass** — against the working-copy fixtures, which catches drift during
  specification development.
- **Published pass** — against the released fixture corpus for the declared AVAR
  version, which catches divergence at publication time.

Publication is blocked if either fails.
