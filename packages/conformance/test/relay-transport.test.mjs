// Evidence transport conformance — properties R1–R6 of RELAY.md.
//
// Implementation-agnostic: these assertions exercise the AVAR primitives that
// a transport must not disturb, not any particular storage engine. Ports to
// other languages should re-implement the assertions, not this file.

import test from "node:test";
import assert from "node:assert/strict";
import { canonicalize, sha256Hex } from "@avar-standard/core";

const evidence = () => ({
  spec_version: "1.10",
  seq: 1,
  prev: null,
  outcome: "allow",
  producer: { runtime: "example-runtime", version: "1.0.0" },
});

const identityOf = (value) => sha256Hex(canonicalize(value));

test("R1 · identity is canonical and key-order independent", () => {
  const a = identityOf(evidence());
  const b = identityOf({
    producer: { version: "1.0.0", runtime: "example-runtime" },
    outcome: "allow",
    prev: null,
    seq: 1,
    spec_version: "1.10",
  });
  assert.equal(a, b);
});

test("R2 · stored bytes equal signed bytes", () => {
  // A producer signs exact bytes, including whitespace and key order.
  const signed = '{"seq":1,  "outcome":"allow"}';
  const carried = signed; // a conforming transport carries the string verbatim
  assert.equal(carried, signed);
  // Anything that round-trips through parse/stringify silently changes them.
  assert.notEqual(JSON.stringify(JSON.parse(signed)), signed);
  assert.notEqual(identityOf(JSON.parse(signed)), sha256Hex(signed));
});

test("R3 · ordering and linkage survive transport", () => {
  const first = identityOf(evidence());
  const second = identityOf({ ...evidence(), seq: 2, prev: first });
  const reordered = identityOf({ ...evidence(), seq: 3, prev: first });
  assert.notEqual(first, second);
  assert.notEqual(second, reordered);
});

test("R4 · replay determinism", () => {
  const runs = new Set([identityOf(evidence()), identityOf(evidence()), identityOf(evidence())]);
  assert.equal(runs.size, 1);
});

test("R5 · verification performs no network call", () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
    throw new Error("conformance: no network permitted during verification");
  };
  try {
    identityOf(evidence());
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(called, false);
});

test("R6 · structure only, never semantics", () => {
  // A transport may not treat an unrecognised verdict value as invalid; the
  // identity is computed the same way regardless of semantic content.
  const odd = { ...evidence(), outcome: "not-a-known-outcome" };
  assert.equal(typeof identityOf(odd), "string");
  assert.equal(identityOf(odd).length, 64);
});

test("extension rule · namespaced extensions stay forward compatible", () => {
  const withExt = { ...evidence(), "ext:example": { anything: true } };
  // Extension content changes identity (it is signed evidence) but never
  // prevents a transport from carrying it.
  assert.notEqual(identityOf(withExt), identityOf(evidence()));
  assert.equal(identityOf(withExt), identityOf({ ...withExt }));
});
