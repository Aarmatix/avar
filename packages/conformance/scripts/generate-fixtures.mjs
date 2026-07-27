// One-shot fixture generator. Run once inside the Aarmatix/avar repo
// to fill in publicKey/sig placeholders across vectors/*.json.
//
//   node packages/conformance/scripts/generate-fixtures.mjs
//
// Idempotent: reads existing vector inputs, signs the canonicalized
// unsigned form with a freshly generated ed25519 key, writes the key
// and signature back. Commit the resulting JSON.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha512 } from "@noble/hashes/sha512";
import * as ed from "@noble/ed25519";
import { canonicalize } from "../../verify-wasm/src/canonical.js";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const HERE = dirname(fileURLToPath(import.meta.url));
const VDIR = join(HERE, "..", "vectors");

const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, "0")).join("");
const enc = new TextEncoder();

// One key per suite — simpler than per-vector.
const priv = ed.utils.randomPrivateKey();
const pub = ed.getPublicKey(priv);

for (const f of (await readdir(VDIR)).sort()) {
  if (!f.endsWith(".json")) continue;
  const p = join(VDIR, f);
  const v = JSON.parse(await readFile(p, "utf8"));
  if (typeof v.input !== "object" || v.input === null) continue;
  const { sig: _drop, ...unsigned } = v.input;
  const bytes = enc.encode(canonicalize(unsigned));
  const sig = ed.sign(bytes, priv);
  v.publicKey = hex(pub);
  // Vector 002 keeps a stale signature to test tamper detection.
  v.input.sig = f.startsWith("002-") ? hex(sig).replace(/.$/, "0") : hex(sig);
  await writeFile(p, JSON.stringify(v, null, 2) + "\n");
  console.log("updated", f);
}
