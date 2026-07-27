// One-shot fixture generator. Run once inside the Aarmatix/avar repo
// to fill in publicKey/sig placeholders across vectors/*.json.
//
//   node packages/conformance/scripts/generate-fixtures.mjs
//
// Handles three kinds of vectors, driven entirely by file contents:
//   - kind: "receipt", input: object   → sign the canonical unsigned form
//   - kind: "receipt", input: string   → leave input alone (invalid-json/shape probes)
//   - kind: "chain",   input: {receipts:[...]} → sign each receipt in order
//                                                and set prev = sha256(canonical(prior))
//
// Two per-vector opt-in tweaks, keyed off `expect.reason`:
//   - "signature-mismatch"    → flip the last hex nibble of the sig
//   - "signature-malformed"   → truncate the sig to odd length (invalid hex)
//   - "chain-break@<i>"       → after signing, corrupt receipts[i].prev
//
// Idempotent: safe to re-run; deterministic output for the same key.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import * as ed from "@noble/ed25519";
import { canonicalize } from "../../verify-wasm/src/canonical.js";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const HERE = dirname(fileURLToPath(import.meta.url));
const VDIR = join(HERE, "..", "vectors");

const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, "0")).join("");
const enc = new TextEncoder();

// One key across the whole suite — parity check only needs a single pub.
const priv = ed.utils.randomPrivateKey();
const pub = ed.getPublicKey(priv);
const pubHex = hex(pub);

function signReceipt(r) {
  const { sig: _drop, ...unsigned } = r;
  const bytes = enc.encode(canonicalize(unsigned));
  return { ...unsigned, sig: hex(ed.sign(bytes, priv)) };
}

function prevHashOf(r) {
  return hex(sha256(enc.encode(canonicalize(r))));
}

function applyReasonTweak(v) {
  const reason = v.expect?.reason;
  if (reason === "signature-mismatch" && typeof v.input?.sig === "string") {
    v.input.sig = v.input.sig.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
  } else if (reason === "signature-malformed" && typeof v.input?.sig === "string") {
    // Drop one hex char → odd length → fromHex throws → signature-malformed.
    v.input.sig = v.input.sig.slice(0, -1);
  } else if (typeof reason === "string" && reason.startsWith("chain-break@")) {
    const i = Number(reason.split("@")[1]);
    const target = v.input?.receipts?.[i];
    if (target) target.prev = "00".repeat(32);
  }
}

for (const f of (await readdir(VDIR)).sort()) {
  if (!f.endsWith(".json")) continue;
  const p = join(VDIR, f);
  const v = JSON.parse(await readFile(p, "utf8"));
  v.publicKey = pubHex;

  if (v.kind === "receipt" && v.input && typeof v.input === "object") {
    v.input = signReceipt(v.input);
    applyReasonTweak(v);
  } else if (v.kind === "chain" && v.input && Array.isArray(v.input.receipts)) {
    let prev = null;
    const signed = [];
    for (const raw of v.input.receipts) {
      const r = signReceipt({ ...raw, prev });
      signed.push(r);
      prev = prevHashOf(r);
    }
    v.input.receipts = signed;
    applyReasonTweak(v);
  }
  // else: string / null input — leave as-is (invalid-json / invalid-shape probes).

  await writeFile(p, JSON.stringify(v, null, 2) + "\n");
  console.log("updated", f);
}
