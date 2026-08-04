// Cross-check every conformance vector against BOTH implementations:
//   - This package (WASM path, or JS fallback if WASM glue absent)
//   - @avar-standard/verify (JS reference)
// Verdicts must be byte-identical.
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import * as wasmImpl from "../src/verify.js";
// The JS reference lives in a sibling package; parity CI installs it
// from the workspace. Guarded so local `npm test` doesn't blow up when
// it isn't present yet.
let refImpl;
try { refImpl = await import("@avar-standard/verify"); } catch { refImpl = null; }

const HERE = dirname(fileURLToPath(import.meta.url));
const VECTORS = join(HERE, "..", "..", "conformance", "vectors");

const enc = new TextEncoder();

function bytes(x) {
  if (typeof x === "string") return enc.encode(x);
  return new Uint8Array(x);
}

function fromHex(s) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

const files = (await readdir(VECTORS)).filter((f) => f.endsWith(".json")).sort();

for (const f of files) {
  const v = JSON.parse(await readFile(join(VECTORS, f), "utf8"));
  test(`vector: ${f}`, async () => {
    const pub = fromHex(v.publicKey);
    const input = bytes(JSON.stringify(v.input));
    const fn = v.kind === "chain" ? wasmImpl.verifyChain : wasmImpl.verifyReceipt;
    const got = fn(input, pub);
    assert.equal(got.ok, v.expect.ok, `wasm verdict for ${f}`);
    if (!v.expect.ok) assert.equal(got.reason, v.expect.reason);
    if (refImpl) {
      const refFn = v.kind === "chain" ? refImpl.verifyChain : refImpl.verifyReceipt;
      const refGot = await refFn(input, pub);
      assert.equal(refGot.ok, got.ok, `reference parity for ${f}`);
    }
  });
}
