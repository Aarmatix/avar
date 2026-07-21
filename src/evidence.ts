// Evidence-model validation per RFC-0008.
// Clean-room implementation from spec text.

import { VerifyError, ERROR_CODES } from "./errors.js";

export const DEPTHS = ["transport", "protocol", "action", "intent"] as const;
export type Depth = (typeof DEPTHS)[number];

export const SOURCES = [
  "network-proxy",
  "sdk-wrapper",
  "os-agent",
  "application",
  "broker",
] as const;
export type Source = (typeof SOURCES)[number];

export const CLAIM_FIELDS = [
  "destination",
  "method",
  "path_or_call",
  "arguments",
  "payload_contents",
  "response_status",
  "response_contents",
  "actor_identity",
  "session_binding",
] as const;
export type ClaimField = (typeof CLAIM_FIELDS)[number];

export type Claims = Record<ClaimField, boolean>;

// RFC-0008 §6 depth × claims coherence table.
const COHERENCE: Record<Depth, ReadonlySet<ClaimField>> = {
  transport: new Set(["destination", "session_binding"]),
  protocol: new Set([
    "destination",
    "session_binding",
    "method",
    "path_or_call",
    "response_status",
  ]),
  action: new Set([
    "destination",
    "session_binding",
    "method",
    "path_or_call",
    "response_status",
    "arguments",
    "actor_identity",
  ]),
  intent: new Set(CLAIM_FIELDS),
};

// Wire-name mapping: fields whose presence in the evidence body corresponds
// to a claim flag. Populated at the entry level, per spec §5.
const FIELD_TO_CLAIM: Record<string, ClaimField> = {
  destination: "destination",
  method: "method",
  path_or_call: "path_or_call",
  arguments: "arguments",
  payload_contents: "payload_contents",
  response_status: "response_status",
  response_contents: "response_contents",
  actor_identity: "actor_identity",
  session_binding: "session_binding",
};

export interface EvidenceEntry {
  depth?: string;
  source?: string;
  claims?: Partial<Claims>;
  [key: string]: unknown;
}

export interface ValidationOutput {
  warnings: string[];
  legacy: boolean;
}

/**
 * Validate a single evidence entry per RFC-0008.
 * Throws VerifyError on rejectable violations; returns warnings for
 * non-rejectable issues (e.g. unknown `source` per §4).
 *
 * @param entry the evidence object under `entries[]`
 * @param path JSON path for error messages
 * @param specVersion producer-declared AVAR version, e.g. "1.10"
 */
export function validateEvidence(
  entry: EvidenceEntry,
  path: string,
  specVersion: string,
): ValidationOutput {
  const warnings: string[] = [];
  const isLegacy = compareVersion(specVersion, "1.10") < 0;

  // §7 Wire compatibility: legacy receipts get implicit defaults and pass.
  if (isLegacy) {
    return { warnings, legacy: true };
  }

  // §3 Depth
  if (!entry.depth || !DEPTHS.includes(entry.depth as Depth)) {
    throw new VerifyError(
      ERROR_CODES.E_DEPTH_INVALID,
      `depth must be one of ${DEPTHS.join(", ")}`,
      path,
    );
  }
  const depth = entry.depth as Depth;

  // §4 Source (unknown → warning, not rejection)
  if (!entry.source) {
    throw new VerifyError(
      ERROR_CODES.E_SOURCE_INVALID,
      "source is required",
      path,
    );
  }
  if (!SOURCES.includes(entry.source as Source)) {
    warnings.push(`${ERROR_CODES.E_SOURCE_INVALID}: unknown source "${entry.source}" at ${path}`);
  }

  // §5 Claims block required
  if (!entry.claims || typeof entry.claims !== "object") {
    throw new VerifyError(
      ERROR_CODES.E_CLAIMS_MISSING,
      "claims object required on AVAR 1.10+ evidence",
      path,
    );
  }
  const claims = entry.claims as Claims;
  for (const f of CLAIM_FIELDS) {
    if (typeof claims[f] !== "boolean") {
      throw new VerifyError(
        ERROR_CODES.E_CLAIMS_MISSING,
        `claims.${f} must be boolean`,
        path,
      );
    }
  }

  // §5 Contradiction: field populated where claims.X == false
  for (const [field, claimName] of Object.entries(FIELD_TO_CLAIM)) {
    const v = (entry as Record<string, unknown>)[field];
    const hasValue = v !== undefined && v !== null;
    if (hasValue && claims[claimName] === false) {
      throw new VerifyError(
        ERROR_CODES.E_CLAIMS_CONTRADICTION,
        `field "${field}" populated but claims.${claimName} is false`,
        path,
      );
    }
  }

  // §6 Coherence: no claim true beyond depth allowance
  const allowed = COHERENCE[depth];
  for (const f of CLAIM_FIELDS) {
    if (claims[f] === true && !allowed.has(f)) {
      throw new VerifyError(
        ERROR_CODES.E_COHERENCE,
        `claims.${f} not permitted at depth "${depth}"`,
        path,
      );
    }
  }

  return { warnings, legacy: false };
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
