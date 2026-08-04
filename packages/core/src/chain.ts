// AVAR 1.0 (Normative) — hashing, chaining and signature checks (SPEC §3.4, §4).
//
// Written from the public normative specification. Pure functions; no I/O.

import { createHash, createPublicKey, verify as nodeVerify } from "node:crypto";
import { canonicalize } from "./canonicalize.js";
import type { Entry, Step } from "./entry.js";

export const GENESIS_PREV_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const GENESIS_PREV_STEP_HASH = `step-genesis:${GENESIS_PREV_HASH}`;

export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return createHash("sha256").update(bytes).digest("hex");
}

/** SPEC §3.4 — deviceFingerprint = hex(sha256(utf8(devicePubKey)))[0..12]. */
export function deviceFingerprintOf(devicePubKeyB64u: string): string {
  return sha256Hex(devicePubKeyB64u).slice(0, 12);
}

/** SPEC §3.4 — the signed body is the Entry without its signature envelope. */
export function signedBody(entry: Entry): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...entry };
  delete copy["signature"];
  delete copy["devicePubKey"];
  delete copy["deviceFingerprint"];
  delete copy["prevHash"];
  delete copy["entryHash"];
  return copy;
}

/** SPEC §4.1. */
export function entryHashOf(entry: Entry, prevHash: string): string {
  const body: Record<string, unknown> = { ...entry, prevHash };
  delete body["entryHash"];
  delete body["signature"];
  delete body["devicePubKey"];
  return sha256Hex(`${prevHash}\n${canonicalize(body)}`);
}

/** SPEC §4.2. */
export function stepHashOf(step: Step, prevStepHash: string): string {
  const body: Record<string, unknown> = { ...(step as Record<string, unknown>) };
  delete body["stepHash"];
  delete body["prevStepHash"];
  body["prevStepHash"] = prevStepHash;
  return sha256Hex(`${prevStepHash}\n${canonicalize(body)}`);
}

const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function decodeB64Any(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function rawEd25519Key(publicKeyB64u: string) {
  const raw = decodeB64Any(publicKeyB64u);
  if (raw.length !== 32) throw new RangeError(`expected 32-byte Ed25519 key, got ${raw.length}`);
  return createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: "der",
    type: "spki",
  });
}

/** Verify an Ed25519 signature over raw message bytes. Never throws. */
export function verifyBytes(
  message: Uint8Array | string,
  signatureB64: string,
  publicKeyB64u: string,
): boolean {
  try {
    const msg = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
    return nodeVerify(null, msg, rawEd25519Key(publicKeyB64u), decodeB64Any(signatureB64));
  } catch {
    return false;
  }
}

/** Verify an Ed25519 signature over canonical JSON of a value. Never throws. */
export function verifyCanonical(
  value: unknown,
  signatureB64: string,
  publicKeyB64u: string,
): boolean {
  try {
    return verifyBytes(canonicalize(value), signatureB64, publicKeyB64u);
  } catch {
    return false;
  }
}
