# Evidence Transport Conformance

An *evidence transport* is any component that moves or stores AVAR evidence
between the place it is produced and the place it is read: a hosted relay, a
customer-hosted relay, an object-store bucket, a queue, a SIEM forwarder, or a
third-party implementation.

A transport is not a verifier. It never re-signs, re-serializes, interprets, or
repairs evidence. The properties below are what an implementation MUST satisfy
to call itself AVAR-conforming transport. They are storage-engine agnostic.

## Normative properties

| ID | Property | Requirement |
| -- | -------- | ----------- |
| R1 | Canonical identity | Identity MUST be derived from RFC-8785 canonical bytes. Key order and insignificant whitespace in the producer's input MUST NOT change identity. |
| R2 | Content preservation | Stored bytes MUST equal signed bytes. A transport MUST NOT parse-and-reserialize evidence on the storage path. |
| R3 | Ordering and linkage | Sequence and `prev` linkage MUST survive transport. Reordering or re-numbering MUST produce a different chain identity, and MUST be detectable by a verifier without transport cooperation. |
| R4 | Replay determinism | The same evidence in MUST produce the same identity out, on every run and on every implementation. |
| R5 | Offline verification | Verification of transported evidence MUST NOT require any network call, and MUST NOT require the transport that carried it. |
| R6 | Structure only | A transport MAY reject evidence on structural grounds (shape, declared extensions, size ceilings). It MUST NOT accept or reject based on the semantic content of a verdict, policy, or participant. |

## Extension rule

Unknown *core* fields MUST be rejected by a transport that advertises a typed
contract. Unknown *namespaced extension* fields MUST be accepted when their
namespace is declared. This keeps transports forward compatible without letting
them become a second, informal schema authority.

## Refusal semantics

When a transport refuses evidence — for example on a size ceiling — the refusal
concerns transport only. The producer's chain remains complete and verifiable
where it was produced. A transport refusal MUST NOT be represented as a
governance outcome.

## Running the suite

```
npm test --workspace @avar-standard/conformance
```

The suite in `test/relay-transport.test.mjs` exercises R1–R6 against
`@avar-standard/core` primitives only. Implementations in other languages
should port the assertions rather than the code.
