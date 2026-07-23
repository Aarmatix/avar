#!/usr/bin/env node
// D#9 publish guard: every packages/* directory must be namespaced
// under @avar-standard/*. Forbids reintroducing deprecated @aarmos/*
// package names or any legacy avar-core / avar-verify-wasm names in
// this public repo.
//
// Also enforces ADR-0001: @avar-standard/verify MUST NOT export a
// ./wasm subpath (WASM ships as its own reserved package).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PKG_DIR = join(ROOT, "packages");
if (!existsSync(PKG_DIR)) {
  console.log("✓ publish-guard: no packages/ directory, nothing to check");
  process.exit(0);
}

const FORBIDDEN = [
  { pattern: /^@aarmos\//, note: "deprecated @aarmos/* namespace — publish only under @avar-standard/*" },
  { pattern: /^avar-core$/, note: "legacy unscoped package name" },
  { pattern: /^avar-verify-wasm$/, note: "legacy unscoped package name" },
];

const problems = [];
const seen = [];
for (const dir of readdirSync(PKG_DIR)) {
  const pkgPath = join(PKG_DIR, dir, "package.json");
  if (!existsSync(pkgPath)) continue;
  const st = statSync(join(PKG_DIR, dir));
  if (!st.isDirectory()) continue;

  let pj;
  try {
    pj = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (err) {
    problems.push(`packages/${dir}/package.json is not valid JSON: ${err.message}`);
    continue;
  }
  seen.push(pj.name);

  if (pj.private === true) continue; // private helper packages are fine

  for (const { pattern, note } of FORBIDDEN) {
    if (pattern.test(pj.name || "")) {
      problems.push(`packages/${dir}: "${pj.name}" — ${note}`);
    }
  }
  if (!/^@avar-standard\//.test(pj.name || "")) {
    problems.push(`packages/${dir}: "${pj.name}" must be scoped under @avar-standard/* (or set "private": true)`);
  }

  // ADR-0001: @avar-standard/verify must not expose a ./wasm subpath.
  if (pj.name === "@avar-standard/verify" && pj.exports && typeof pj.exports === "object") {
    for (const key of Object.keys(pj.exports)) {
      if (key === "./wasm" || key.startsWith("./wasm.") || key.startsWith("./wasm/")) {
        problems.push(
          `packages/${dir}: @avar-standard/verify exports "${key}" — forbidden by ADR-0001 (WASM ships as @avar-standard/verify-wasm)`,
        );
      }
    }
  }
}

if (problems.length) {
  console.error("✗ publish-guard violations:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`✓ publish-guard clean (${seen.length} package(s): ${seen.join(", ")})`);
