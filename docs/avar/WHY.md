# Why AVAR Exists

**Status:** Permanent philosophy document. Not an RFC. Not an ADR.
**Audience:** Anyone deciding whether to trust — or implement — AVAR.

---

## The one-sentence answer

**No one should have to trust Aarmatix to trust an AVAR receipt.**

Everything else in this document follows from that sentence.

---

## Why receipts

AI agents are becoming production software. Production software needs
governance. And governance requires a durable answer to a very old
question: *what happened, and who says so?*

A log answers the first half. It is not enough. Logs live inside the
system that produced them, can be edited by whoever operates that
system, and require the reader to trust the writer. That is fine for
debugging. It is not fine for an auditor, a regulator, or a customer
whose trust has run out.

A **receipt** is the smallest unit of durable answer. It records one
observation, signs it at the moment of creation, and links to every
receipt that came before it. Tamper with any earlier receipt and
verification breaks at the tampered point. The reader can check it
without asking the writer for anything.

## Why evidence

A single receipt is a datum. Many receipts, verifiable together,
become **evidence** — the compounding asset that makes governance
provable rather than performative.

AVAR is the standard for that evidence. It defines three things and
only three things:

1. What a receipt looks like on the wire (canonical bytes, signatures,
   hash chain).
2. What claims a receipt is allowed to make (`transport`, `protocol`,
   or `action` — no more).
3. How anyone can verify a receipt without contacting the producer.

That is the entire scope. Everything else — intent, goals, reasoning,
policy, workflow, compliance — belongs to the producers and runtimes
that create receipts. AVAR does not standardise cognition.

## Why independent verification

Independent verification is the whole product.

A receipt no one else can check is a receipt no one else has to
believe. So the reference verifier, the conformance suite, the
specification, and the test vectors are all public. Anyone can build a
second verifier. Anyone can audit the first one. The evidence outlives
any single vendor — including Aarmatix.

Open source is one mechanism for reaching that guarantee. It is not
the goal. The goal is a trust story that does not route through a
single company.

## Why AVAR is open

Trust artifacts want to be open. If the format is proprietary, the
receipt is only as durable as the vendor that reads it. That is not
durable enough.

- The **specification** (`Aarmatix/avar-spec`) is CC BY 4.0.
- The **reference verifier** (`Aarmatix/avar`) is Apache-2.0, built
  clean-room, and publishable to anyone's registry.
- The **conformance suite** (`Aarmatix/avar-conformance`) is
  Apache-2.0.
- The **npm namespace target** is `@avar/*` (validated free on the
  public registry, 2026-07-21) — reserved so that the reference
  implementation does not look like a private product module.

Independence must be structural, not aspirational.

## Why Aarmos is commercial

Trust *production* wants to be operated. Running receipts at
enterprise scale — dedicated retention, federated evidence sources,
custom conformance attestation, private support, MDM push, SSO — is
work someone has to do, at cost, with an SLA behind it.

Aarmos is that work. It is a closed-source runtime that produces,
governs, and manages AVAR evidence. The runtime is where we innovate
rapidly: policy models, planners, adapters, UI, integrations. None of
that innovation compromises the receipts a customer already holds,
because AVAR is defined outside Aarmos.

## Why the boundary exists

Standards benefit from stability and restraint. Products benefit from
iteration and experimentation. Keeping those concerns in different
repositories, with different licenses and different release cadences,
gives both room to succeed:

| Layer                                | What it optimises for |
|--------------------------------------|-----------------------|
| **AVAR** (spec + verifier + tests)   | Stable, boring, vendor-neutral evidence |
| **Aarmos** (runtime + platform)      | Rapid governance and execution features |
| **Aarmatix** (steward)               | Advances both without collapsing them   |

We deliberately do not evolve AVAR into an autonomy framework, a
planning model, or a governance ontology. Those are Aarmos concerns.
AVAR stays small so it can stay universal.

## Two interoperability rules that never change

- *Conservative in what you emit, liberal in what you accept.*
- *Receipts SHOULD remain valid even when consumers do not understand
  every evidence attribute.*

These are the reason old receipts keep verifying against new
verifiers, and new receipts keep making sense to old ones. Break them
and the standard stops being a standard.

## What this document is for

When someone proposes adding a concept to AVAR that is not observable
— *intent*, *goal*, *plan*, *autonomy level*, *risk score* — this is
the document to point at. AVAR records verifiable evidence of
autonomous execution. Aarmos interprets that evidence. Every other
governance concept belongs on the Aarmos side of the line.

That is why AVAR exists, and that is why it is intentionally small.
