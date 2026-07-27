#!/usr/bin/env node
// Verification-only WASM export surface check.
// Fails if the compiled module exposes functions outside the allowlist.
import { readFileSync } from "node:fs";

const ALLOW = new Set([
  "memory", "_start",             // Javy/WASI defaults
  "canonical_wasi", "wizer.initialize",
  "canonical_abi_free", "canonical_abi_realloc",
  "config_schema", "compile_src", "invoke",
]);
const ALLOW_PREFIX = ["javy_"];

const file = process.argv[2];
if (!file) { console.error("usage: check-wasm-surface.mjs <verify.wasm>"); process.exit(2); }

const bytes = readFileSync(file);
const mod = await WebAssembly.compile(bytes);
const exports = WebAssembly.Module.exports(mod).map((e) => e.name);

const forbidden = exports.filter(
  (n) => !ALLOW.has(n) && !ALLOW_PREFIX.some((p) => n.startsWith(p))
);
console.log(`[surface] exports=${exports.length} forbidden=${forbidden.length}`);
if (forbidden.length) {
  console.error("[surface] non-verification exports:", forbidden);
  process.exit(1);
}
console.log("[surface] OK — verification-only surface");
