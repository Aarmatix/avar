#!/usr/bin/env node
// Reference verifier CLI.
// Usage: avar-ref verify <receipt.json>
import { readFileSync } from "node:fs";
import { verifyReceipt, VerifyError } from "../dist/index.js";

const [, , cmd, file] = process.argv;

if (cmd !== "verify" || !file) {
  console.error("usage: avar-ref verify <receipt.json>");
  process.exit(2);
}

let receipt;
try {
  receipt = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`could not read ${file}: ${err.message}`);
  process.exit(2);
}

try {
  const result = await verifyReceipt(receipt);
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
