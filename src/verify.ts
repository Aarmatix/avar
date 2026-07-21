// Receipt verification per RFC-0009 (Producer Contract) + RFC-0008 (Evidence).
// Clean-room implementation. Signatures use Node's built-in crypto (Ed25519).

import { createHash, createPublicKey, verify as edVerify } from "node:crypto";
import { canonicalize } from "./canonicalize.js";
import { validateEvidence } from "./evidence.js";
import { VerifyError, ERROR_CODES } from "./errors.js";

export interface Receipt {
  spec_version?: string; // e.g. "1.10"
  producer?: {
    name?: string;
    version?: string;
    source?: string;
    public_key?: string; // base64 SPKI, RFC-0009 §4 self-attesting mode
  };
  issued_at?: string; // RFC-3339 UTC
  session_id?: string;
  entries?: Array<Record<string, unknown> & { prev_hash?: string | null }>;
  signature?: string; // base64
  legacy?: boolean;
}

export interface VerifyOptions {
  /** Now, for time-window checks. Defaults to Date.now(). */
  now?: Date;
  /** Look up producer public key (base64 SPKI) by producer identity.
   *  If omitted, only inline keys (RFC-0009 §4 self-attesting) are accepted.
   */
  resolveKey?: (
    producer: NonNullable<Receipt["producer"]>,
  ) => Promise<string | null> | string | null;
  /** Time window in ms: allowed drift into future. Default 24h (RFC-0009 §5). */
  futureWindowMs?: number;
  /** Time window in ms: allowed age. Default 365d. */
  pastWindowMs?: number;
}

export interface VerifyResult {
  valid: boolean;
  legacy: boolean;
  warnings: string[];
  producer: string;
  spec_version: string;
}

const DEFAULT_FUTURE = 24 * 60 * 60 * 1000;
const DEFAULT_PAST = 365 * 24 * 60 * 60 * 1000;

export async function verifyReceipt(
  receipt: Receipt,
  opts: VerifyOptions = {},
): Promise<VerifyResult> {
  const warnings: string[] = [];
  const specVersion = receipt.spec_version ?? "1.9";

  // RFC-0009 §2.5 — producer identity required
  if (!receipt.producer || !receipt.producer.name) {
    throw new VerifyError(ERROR_CODES.E_PRODUCER_MISSING, "producer block missing");
  }

  // RFC-0009 §5 — issued_at required + window
  if (!receipt.issued_at) {
    throw new VerifyError(
      ERROR_CODES.E_TIME_OUT_OF_RANGE,
      "issued_at required",
    );
  }
  const issued = Date.parse(receipt.issued_at);
  if (Number.isNaN(issued)) {
    throw new VerifyError(
      ERROR_CODES.E_TIME_OUT_OF_RANGE,
      "issued_at not RFC-3339",
    );
  }
  const now = (opts.now ?? new Date()).getTime();
  const future = opts.futureWindowMs ?? DEFAULT_FUTURE;
  const past = opts.pastWindowMs ?? DEFAULT_PAST;
  if (issued - now > future) {
    throw new VerifyError(
      ERROR_CODES.E_TIME_OUT_OF_RANGE,
      "issued_at too far in future",
    );
  }
  if (now - issued > past) {
    throw new VerifyError(
      ERROR_CODES.E_TIME_OUT_OF_RANGE,
      "issued_at too old",
    );
  }

  // RFC-0008 §7 — chaining across entries in the session
  const entries = receipt.entries ?? [];
  let prev: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (i === 0) {
      if (e.prev_hash !== null && e.prev_hash !== undefined) {
        throw new VerifyError(
          ERROR_CODES.E_CHAIN_BROKEN,
          "first entry must have prev_hash: null",
          `entries[${i}]`,
        );
      }
    } else {
      if (e.prev_hash !== prev) {
        throw new VerifyError(
          ERROR_CODES.E_CHAIN_BROKEN,
          `prev_hash mismatch (expected ${prev})`,
          `entries[${i}]`,
        );
      }
    }
    prev = sha256Hex(canonicalize(e));

    // RFC-0008 evidence validation
    const out = validateEvidence(e, `entries[${i}]`, specVersion);
    warnings.push(...out.warnings);
  }

  // RFC-0009 §2.1–§2.3 — signature over canonicalized receipt (sans signature)
  if (!receipt.signature) {
    throw new VerifyError(ERROR_CODES.E_SIG_INVALID, "signature missing");
  }
  const { signature, legacy, ...unsigned } = receipt;
  const canonical = canonicalize(unsigned);

  // RFC-0009 §4 — key discovery
  let pubB64: string | null = null;
  if (opts.resolveKey) {
    pubB64 = await opts.resolveKey(receipt.producer);
  }
  if (!pubB64) pubB64 = receipt.producer.public_key ?? null;
  if (!pubB64) {
    throw new VerifyError(
      ERROR_CODES.E_KEY_NOT_FOUND,
      `no key for producer ${receipt.producer.name}`,
    );
  }

  const sigBuf = Buffer.from(signature, "base64");
  let ok = false;
  try {
    const key = createPublicKey({
      key: Buffer.from(pubB64, "base64"),
      format: "der",
      type: "spki",
    });
    ok = edVerify(null, Buffer.from(canonical, "utf8"), key, sigBuf);
  } catch (err) {
    throw new VerifyError(
      ERROR_CODES.E_SIG_INVALID,
      `signature check failed: ${(err as Error).message}`,
    );
  }
  if (!ok) {
    throw new VerifyError(ERROR_CODES.E_SIG_INVALID, "signature invalid");
  }

  return {
    valid: true,
    legacy: compareVersion(specVersion, "1.10") < 0,
    warnings,
    producer: receipt.producer.name,
    spec_version: specVersion,
  };
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
