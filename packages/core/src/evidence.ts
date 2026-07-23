// Evidence-model validation per RFC-0008 (amended).
// Clean-room implementation from spec text.
//
// Amendment summary:
//   - `depth` renamed to `evidence_type`. Legacy `depth` accepted as a
//     synonym with a deprecation warning.
//   - `intent` removed from the standardized evidence-type set. Legacy
//     `depth: "intent"` and unknown values are accepted with warnings
//     (RFC-0008 §3 interop rules).
//   - Unknown extension attributes on an entry never cause rejection.

import { VerifyError, ERROR_CODES } from "./errors.js";

export const EVIDENCE_TYPES = ["transport", "protocol", "action"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** @deprecated Use EVIDENCE_TYPES. */
export const DEPTHS = EVIDENCE_TYPES;
/** @deprecated Use EvidenceType. */
export type Depth = EvidenceType;

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

// RFC-0008 §7 evidence-type × claims coherence table.
const COHERENCE: Record<EvidenceType, ReadonlySet<ClaimField>> = {
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
};

// Wire-name mapping: fields whose presence in the evidence body corresponds
// to a claim flag. Populated at the entry level, per spec §6.
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
  evidence_type?: string;
  /** @deprecated Pre-amendment synonym of `evidence_type`. Accepted with warning. */
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
 * Validate a single evidence entry per RFC-0008 (amended).
 * Throws VerifyError on rejectable violations; returns warnings for
 * non-rejectable issues (unknown source, unknown evidence type, legacy
 * `depth` synonym, `intent`, etc.).
 *
 * Unknown extension attributes on the entry are opaque data and never
 * cause rejection (§8, interop rule 2).
 */
export function validateEvidence(
  entry: EvidenceEntry,
  path: string,
  specVersion: string,
): ValidationOutput {
  const warnings: string[] = [];
  const isLegacy = compareVersion(specVersion, "1.10") < 0;

  // §8 Wire compatibility: pre-1.10 receipts get implicit defaults and pass.
  if (isLegacy) {
    return { warnings, legacy: true };
  }

  // §4 Evidence type — accept legacy `depth` as synonym with deprecation warn.
  let rawType = entry.evidence_type;
  if (rawType === undefined && entry.depth !== undefined) {
    warnings.push(
      `${ERROR_CODES.E_EVIDENCE_TYPE_INVALID}: legacy field "depth" used at ${path}; producers MUST emit "evidence_type" on AVAR 1.10+`,
    );
    rawType = entry.depth;
  }
  if (!rawType || typeof rawType !== "string") {
    throw new VerifyError(
      ERROR_CODES.E_EVIDENCE_TYPE_INVALID,
      `evidence_type must be one of ${EVIDENCE_TYPES.join(", ")}`,
      path,
    );
  }

  const known = (EVIDENCE_TYPES as readonly string[]).includes(rawType);
  if (!known) {
    // Unknown values (including legacy "intent") → warn, accept, skip coherence.
    warnings.push(
      `${ERROR_CODES.E_EVIDENCE_TYPE_INVALID}: unknown evidence_type "${rawType}" at ${path}; accepting per RFC-0008 §3 (liberal in what you accept)`,
    );
  }

  // §5 Source (unknown → warning, not rejection)
  if (!entry.source) {
    throw new VerifyError(
      ERROR_CODES.E_SOURCE_INVALID,
      "source is required",
      path,
    );
  }
  if (!SOURCES.includes(entry.source as Source)) {
    warnings.push(
      `${ERROR_CODES.E_SOURCE_INVALID}: unknown source "${entry.source}" at ${path}`,
    );
  }

  // §6 Claims block required
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

  // §6 Contradiction: field populated where claims.X == false
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

  // §7 Coherence: no claim true beyond evidence-type allowance.
  // Skipped for unknown types (see §4 interop rule).
  if (known) {
    const allowed = COHERENCE[rawType as EvidenceType];
    for (const f of CLAIM_FIELDS) {
      if (claims[f] === true && !allowed.has(f)) {
        throw new VerifyError(
          ERROR_CODES.E_COHERENCE,
          `claims.${f} not permitted at evidence_type "${rawType}"`,
          path,
        );
      }
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
