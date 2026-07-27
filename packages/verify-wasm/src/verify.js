// AVAR verifier — reimplemented from the public AVAR spec.
// Verification-only. No signing, no key generation, no network.
//
// Receipt shape (AVAR v0.1, per spec):
//   {
//     v: 1,                          // spec major
//     id: "<uuid>",
//     ts: "<ISO-8601>",
//     prev: "<hex sha-256 of prior receipt>" | null,
//     payload: <arbitrary JSON>,
//     sig: "<hex ed25519 signature>",
//   }
//
// Signed bytes = utf8(canonicalize({ v, id, ts, prev, payload })).

import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import * as ed from "@noble/ed25519";
import { canonicalize } from "./canonical.js";

// @noble/ed25519 v2 is sync when the SHA-512 hook is installed.
// Installing it explicitly rather than relying on Node's WebCrypto
// (unavailable inside Javy/QuickJS-WASM).
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const enc = new TextEncoder();

function hex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

function fromHex(s) {
  if (typeof s !== "string" || s.length % 2 !== 0) throw new Error("bad hex");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

function parseJsonBytes(bytes) {
  const dec = new TextDecoder("utf-8", { fatal: true });
  return JSON.parse(dec.decode(bytes));
}

function shapeOk(r) {
  return (
    r && typeof r === "object" &&
    r.v === 1 &&
    typeof r.id === "string" &&
    typeof r.ts === "string" &&
    (r.prev === null || typeof r.prev === "string") &&
    "payload" in r &&
    typeof r.sig === "string"
  );
}

/** Verify a single AVAR receipt. Returns { ok, reason? }. */
export function verifyReceipt(receiptBytes, publicKeyBytes) {
  let r;
  try { r = parseJsonBytes(receiptBytes); }
  catch { return { ok: false, reason: "invalid-json" }; }
  if (!shapeOk(r)) return { ok: false, reason: "invalid-shape" };
  const { sig, ...signed } = r;
  const signedBytes = enc.encode(canonicalize(signed));
  let ok = false;
  try { ok = ed.verify(fromHex(sig), signedBytes, publicKeyBytes); }
  catch { return { ok: false, reason: "signature-malformed" }; }
  return ok ? { ok: true } : { ok: false, reason: "signature-mismatch" };
}

/** Verify a chain: bundle = { receipts: [...] } in order.
 *  Each receipt.prev must equal sha256(canonicalize(prior receipt including sig)). */
export function verifyChain(bundleBytes, publicKeyBytes) {
  let b;
  try { b = parseJsonBytes(bundleBytes); }
  catch { return { ok: false, reason: "invalid-json" }; }
  if (!b || !Array.isArray(b.receipts)) return { ok: false, reason: "invalid-bundle" };
  let prevHash = null;
  for (let i = 0; i < b.receipts.length; i++) {
    const r = b.receipts[i];
    if (!shapeOk(r)) return { ok: false, reason: `invalid-shape@${i}` };
    if ((r.prev ?? null) !== prevHash) return { ok: false, reason: `chain-break@${i}` };
    const rBytes = enc.encode(JSON.stringify(r));
    const one = verifyReceipt(rBytes, publicKeyBytes);
    if (!one.ok) return { ok: false, reason: `${one.reason}@${i}` };
    prevHash = hex(sha256(enc.encode(canonicalize(r))));
  }
  return { ok: true };
}
