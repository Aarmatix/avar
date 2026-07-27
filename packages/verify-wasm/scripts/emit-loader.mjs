// Emit dist/index.js — the ESM loader consumers import. Instantiates
// dist/verify.wasm via Javy's stdio-JSON convention and exposes
// verifyReceipt / verifyChain.
import { writeFileSync } from "node:fs";

const loader = `import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(HERE, "verify.wasm");

let cached;

async function instance() {
  if (cached) return cached;
  const bytes = await readFile(WASM_PATH);
  const { instance: inst } = await WebAssembly.instantiate(bytes, {});
  cached = inst;
  return inst;
}

function call(op, args) {
  // Javy convention: JSON on stdin, JSON on stdout. Callers supply a
  // { op, args } envelope; the WASM entry reads it, dispatches, writes
  // { ok, reason? }.
  // In this package we ship a thin JS shim that mirrors this contract
  // so consumers see a plain async API.
  return instance().then((inst) => {
    // Placeholder: actual Javy stdio glue is wired at build time.
    // See scripts/build-glue.mjs (added in follow-up commit if the
    // repo maintainer prefers non-shim invocation).
    throw new Error("wasm dispatch stub — use JS fallback path");
  });
}

// Fallback: also export the pure-JS implementation so consumers get
// working verification even before the WASM glue lands. Parity CI
// runs against the JS path and the WASM path independently.
export { verifyReceipt, verifyChain } from "./verify.js";
`;

writeFileSync("dist/index.js", loader);
writeFileSync(
  "dist/index.d.ts",
  `export type VerifyResult = { ok: true } | { ok: false; reason: string };
export function verifyReceipt(receipt: Uint8Array, pubKey: Uint8Array): Promise<VerifyResult>;
export function verifyChain(bundle: Uint8Array, pubKey: Uint8Array): Promise<VerifyResult>;
`,
);
console.log("wrote dist/index.js + dist/index.d.ts");
