#!/usr/bin/env bun
// Standalone `avar` CLI entry. Compiled via `bun build --compile` for
// Homebrew distribution. Imports the workspace `@avar-standard/core`
// source directly so `bun --compile` bundles the exact same code
// that ships to npm from packages/core.
import { readFileSync } from "node:fs";
import { verifyReceipt, VerifyError } from "../packages/core/src/index.js";

const argv = process.argv.slice(2);

if (argv[0] === "--version" || argv[0] === "-v") {
  // AVAR_VERSION is injected at compile time via --define.
  console.log(typeof AVAR_VERSION === "string" ? AVAR_VERSION : "0.0.0-dev");
  process.exit(0);
}

const [cmd, file] = argv;

if (cmd !== "verify" || !file) {
  console.error("usage: avar verify <receipt.json>");
  console.error("       avar --version");
  process.exit(2);
}

let receipt: unknown;
try {
  receipt = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`could not read ${file}: ${(err as Error).message}`);
  process.exit(2);
}

try {
  const result = await verifyReceipt(receipt as never);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  process.exit(0);
} catch (err) {
  if (err instanceof VerifyError) {
    console.log(
      JSON.stringify(
        { ok: false, code: err.code, message: err.message, path: err.path },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(2);
}

declare const AVAR_VERSION: string;
