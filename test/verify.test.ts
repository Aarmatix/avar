// Round-trip tests for the reference verifier.
// Uses Node's built-in ed25519 to mint a fresh keypair, sign a receipt
// per RFC-0009, then verify. Also exercises each rejection path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { canonicalize, verifyReceipt, ERROR_CODES } from "../dist/index.js";

function newKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubB64 = publicKey.export({ format: "der", type: "spki" }).toString("base64");
  return { publicKey, privateKey, pubB64 };
}

function signReceipt(receiptWithoutSig: any, privateKey: any): any {
  const canonical = canonicalize(receiptWithoutSig);
  const sig = edSign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64");
  return { ...receiptWithoutSig, signature: sig };
}

function baseReceipt(pubB64: string) {
  return {
    spec_version: "1.10",
    producer: { name: "test-producer", version: "0.1.0", source: "sdk-wrapper", public_key: pubB64 },
    issued_at: new Date().toISOString(),
    session_id: "01900000-0000-7000-8000-000000000000",
    entries: [
      {
        prev_hash: null,
        depth: "action",
        source: "sdk-wrapper",
        destination: "api.example.com",
        method: "POST",
        path_or_call: "/v1/chat",
        arguments: { prompt: "hi" },
        response_status: 200,
        actor_identity: "user-42",
        session_binding: "sess-1",
        claims: {
          destination: true, method: true, path_or_call: true,
          arguments: true, payload_contents: false, response_status: true,
          response_contents: false, actor_identity: true, session_binding: true,
        },
      },
    ],
  };
}

test("verifies a well-formed AVAR 1.10 receipt", async () => {
  const { privateKey, pubB64 } = newKey();
  const receipt = signReceipt(baseReceipt(pubB64), privateKey);
  const result = await verifyReceipt(receipt);
  assert.equal(result.valid, true);
  assert.equal(result.legacy, false);
  assert.equal(result.warnings.length, 0);
});

test("rejects invalid signature", async () => {
  const { privateKey, pubB64 } = newKey();
  const receipt = signReceipt(baseReceipt(pubB64), privateKey);
  receipt.entries[0].destination = "tampered.example.com";
  await assert.rejects(verifyReceipt(receipt), (err: any) =>
    err.code === ERROR_CODES.E_SIG_INVALID);
});

test("rejects claims contradiction", async () => {
  const { privateKey, pubB64 } = newKey();
  const r = baseReceipt(pubB64);
  // payload_contents populated but claims false
  r.entries[0].payload_contents = "secret";
  const signed = signReceipt(r, privateKey);
  await assert.rejects(verifyReceipt(signed), (err: any) =>
    err.code === ERROR_CODES.E_CLAIMS_CONTRADICTION);
});

test("rejects depth × claims incoherence", async () => {
  const { privateKey, pubB64 } = newKey();
  const r = baseReceipt(pubB64);
  r.entries[0].depth = "transport"; // transport allows only destination + session_binding
  const signed = signReceipt(r, privateKey);
  await assert.rejects(verifyReceipt(signed), (err: any) =>
    err.code === ERROR_CODES.E_COHERENCE);
});

test("rejects broken chain", async () => {
  const { privateKey, pubB64 } = newKey();
  const r = baseReceipt(pubB64);
  const second = JSON.parse(JSON.stringify(r.entries[0]));
  second.prev_hash = "0000000000000000000000000000000000000000000000000000000000000000";
  r.entries.push(second);
  const signed = signReceipt(r, privateKey);
  await assert.rejects(verifyReceipt(signed), (err: any) =>
    err.code === ERROR_CODES.E_CHAIN_BROKEN);
});

test("accepts legacy 1.9 receipt with legacy flag", async () => {
  const { privateKey, pubB64 } = newKey();
  const r = {
    spec_version: "1.9",
    producer: { name: "legacy", version: "0.0.1", source: "application", public_key: pubB64 },
    issued_at: new Date().toISOString(),
    entries: [{ prev_hash: null, destination: "api.example.com" }],
  };
  const signed = signReceipt(r, privateKey);
  const result = await verifyReceipt(signed);
  assert.equal(result.valid, true);
  assert.equal(result.legacy, true);
});
