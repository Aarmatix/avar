#!/usr/bin/env node
// Scan the compiled WASM for accidental private-code tokens.
import { readFileSync } from "node:fs";

const FORBIDDEN = [
  "aarmos-runtime", "runtime-core", "@aarmos/runtime",
  "policy-engine", "AARMOS_PRIVATE",
];

const file = process.argv[2];
if (!file) { console.error("usage: check-wasm-strings.mjs <verify.wasm>"); process.exit(2); }

const buf = readFileSync(file);
// Extract printable ASCII runs
const s = buf.toString("latin1");
const hits = FORBIDDEN.filter((tok) => s.includes(tok));
if (hits.length) {
  console.error("[strings] forbidden tokens in wasm:", hits);
  process.exit(1);
}
console.log(`[strings] OK — no private tokens (bytes=${buf.length})`);
