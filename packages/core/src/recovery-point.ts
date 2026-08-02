// Governance Recovery Point (GRP) verification — AVAR spec addendum 1.13.
//
// A GRP is DERIVED state: it NAMES the artifacts a workspace can resume
// governed execution from, and contains none of them. That is why it can be
// verified by a third party with no access to policy text, key material, or
// receipt bodies.
//
// Wire format (normative):
//   identityDigest = sha256(canonicalize({ kind, version, workspaceId, refs }))
//   envelope       = createdAt / provenance / changeSetId? / deviceFingerprint
//                    / devicePubKey / signature   (outside the digest)
//
// Verification is pure: no clock, no network. A GRP describes a state, not a
// session, so an old `createdAt` is not an error.
//
// Clean-room implementation derived solely from the public specification
// text. No code lineage from any commercial implementation.

import { createHash, createPublicKey, verify as edVerify } from "node:crypto";
import { canonicalize } from "./canonicalize.js";

export const RECOVERY_POINT_KIND = "aarmos-governance-recovery-point";
export const RECOVERY_POINT_VERSION = 1;

/** Closed set. Unknown keys are rejected, never ignored — silent tolerance
 *  is how a reference object turns into a container. */
export const RECOVERY_POINT_REF_KEYS = [
  "policyBundleHash",
  "authorityFrameVersion",
  "identityVersion",
  "receiptChainHead",
  "configurationDigest",
] as const;

export type RecoveryPointRefKey = (typeof RECOVERY_POINT_REF_KEYS)[number];
export type RecoveryPointRefs = Record<RecoveryPointRefKey, string>;

export type RecoveryPointProvenance =
  | "manual"
  | "scheduled"
  | "automatic"
  | "pre-change"
  | "post-change";

export const RECOVERY_POINT_PROVENANCE: readonly RecoveryPointProvenance[] = [
  "manual",
  "scheduled",
  "automatic",
  "pre-change",
  "post-change",
];

export interface RecoveryPointEnvelope {
  createdAt: string;
  provenance: RecoveryPointProvenance;
  changeSetId?: string;
  deviceFingerprint: string;
  devicePubKey: string;
  signature: string;
}

export interface RecoveryPoint {
  kind: typeof RECOVERY_POINT_KIND;
  version: 1;
  workspaceId: string;
  refs: RecoveryPointRefs;
  identityDigest: string;
  envelope: RecoveryPointEnvelope;
}

export type RecoveryPointErrorCode =
  | "GRP_WRONG_KIND"
  | "GRP_UNSUPPORTED_VERSION"
  | "GRP_MALFORMED"
  | "GRP_UNKNOWN_REF"
  | "GRP_FORBIDDEN_FIELD"
  | "GRP_DIGEST_MISMATCH"
  | "GRP_SIGNATURE_INVALID";

export interface RecoveryPointIssue {
  code: RecoveryPointErrorCode;
  detail: string;
}

export interface RecoveryPointReport {
  ok: boolean;
  identityDigest?: string;
  digestMatches: boolean;
  signatureVerified: boolean;
  issues: RecoveryPointIssue[];
}

/** Field names that must never appear anywhere in a GRP. */
const FORBIDDEN_FIELD_PATTERN =
  /(secret|password|passphrase|privatekey|private_key|apikey|api_key|token|credential|bearer)/i;

/** Content-bearing fields whose size would grow with receipt count. */
const FORBIDDEN_CONTENT_KEYS = new Set([
  "receipts",
  "entries",
  "policy",
  "policyBody",
  "authorityDocument",
  "steps",
  "payload",
  "payloads",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function b64uToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** The exact bytes the identity digest covers. Envelope excluded by design. */
export function recoveryPointIdentityBody(rp: RecoveryPoint): Pick<
  RecoveryPoint,
  "kind" | "version" | "workspaceId" | "refs"
> {
  const refs = {} as RecoveryPointRefs;
  for (const k of RECOVERY_POINT_REF_KEYS) refs[k] = rp.refs[k];
  return { kind: rp.kind, version: rp.version, workspaceId: rp.workspaceId, refs };
}

export function computeRecoveryPointIdentity(rp: RecoveryPoint): string {
  return createHash("sha256")
    .update(canonicalize(recoveryPointIdentityBody(rp)), "utf8")
    .digest("hex");
}

/** The body the envelope signature covers. */
export function recoveryPointSignedBody(rp: RecoveryPoint): Record<string, unknown> {
  const e = rp.envelope;
  const body: Record<string, unknown> = {
    identityDigest: rp.identityDigest,
    createdAt: e.createdAt,
    provenance: e.provenance,
    deviceFingerprint: e.deviceFingerprint,
  };
  if (e.changeSetId !== undefined) body.changeSetId = e.changeSetId;
  return body;
}

function scanForbidden(value: unknown, path: string, issues: RecoveryPointIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbidden(v, `${path}[${i}]`, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [k, v] of Object.entries(value)) {
    const at = path ? `${path}.${k}` : k;
    if (FORBIDDEN_FIELD_PATTERN.test(k)) {
      issues.push({ code: "GRP_FORBIDDEN_FIELD", detail: `secret-shaped field at ${at}` });
    } else if (FORBIDDEN_CONTENT_KEYS.has(k)) {
      issues.push({ code: "GRP_FORBIDDEN_FIELD", detail: `content-bearing field at ${at}` });
    }
    scanForbidden(v, at, issues);
  }
}

/** Structural validation. An empty array means the object is shaped like a GRP. */
export function validateRecoveryPointShape(input: unknown): RecoveryPointIssue[] {
  const issues: RecoveryPointIssue[] = [];
  if (!isRecord(input)) {
    return [{ code: "GRP_MALFORMED", detail: "recovery point must be a JSON object" }];
  }
  if (input.kind !== RECOVERY_POINT_KIND) {
    issues.push({
      code: "GRP_WRONG_KIND",
      detail: `expected kind "${RECOVERY_POINT_KIND}", got ${JSON.stringify(input.kind)}`,
    });
  }
  if (input.version !== RECOVERY_POINT_VERSION) {
    issues.push({
      code: "GRP_UNSUPPORTED_VERSION",
      detail: `expected version ${RECOVERY_POINT_VERSION}, got ${JSON.stringify(input.version)}`,
    });
  }
  if (typeof input.workspaceId !== "string" || input.workspaceId.length === 0) {
    issues.push({ code: "GRP_MALFORMED", detail: "workspaceId must be a non-empty string" });
  }
  if (typeof input.identityDigest !== "string" || !/^[0-9a-f]{64}$/.test(input.identityDigest)) {
    issues.push({ code: "GRP_MALFORMED", detail: "identityDigest must be 64 lowercase hex" });
  }

  const refs = input.refs;
  if (!isRecord(refs)) {
    issues.push({ code: "GRP_MALFORMED", detail: "refs must be an object" });
  } else {
    for (const k of RECOVERY_POINT_REF_KEYS) {
      if (typeof refs[k] !== "string" || (refs[k] as string).length === 0) {
        issues.push({ code: "GRP_MALFORMED", detail: `refs.${k} must be a non-empty string` });
      }
    }
    for (const k of Object.keys(refs)) {
      if (!(RECOVERY_POINT_REF_KEYS as readonly string[]).includes(k)) {
        issues.push({ code: "GRP_UNKNOWN_REF", detail: `unrecognized refs key: ${k}` });
      }
    }
    for (const k of ["policyBundleHash", "receiptChainHead", "configurationDigest"] as const) {
      const v = refs[k];
      if (typeof v === "string" && !/^[0-9a-f]{64}$/.test(v)) {
        issues.push({ code: "GRP_MALFORMED", detail: `refs.${k} must be 64 lowercase hex` });
      }
    }
  }

  const env = input.envelope;
  if (!isRecord(env)) {
    issues.push({ code: "GRP_MALFORMED", detail: "envelope must be an object" });
  } else {
    for (const k of ["createdAt", "deviceFingerprint", "devicePubKey", "signature"] as const) {
      if (typeof env[k] !== "string" || (env[k] as string).length === 0) {
        issues.push({ code: "GRP_MALFORMED", detail: `envelope.${k} must be a non-empty string` });
      }
    }
    if (!RECOVERY_POINT_PROVENANCE.includes(env.provenance as RecoveryPointProvenance)) {
      issues.push({
        code: "GRP_MALFORMED",
        detail: `envelope.provenance must be one of ${RECOVERY_POINT_PROVENANCE.join(", ")}`,
      });
    }
    const needsChange = env.provenance === "pre-change" || env.provenance === "post-change";
    if (needsChange && typeof env.changeSetId !== "string") {
      issues.push({
        code: "GRP_MALFORMED",
        detail: "envelope.changeSetId is required for pre-change / post-change provenance",
      });
    }
    if (!needsChange && env.changeSetId !== undefined) {
      issues.push({
        code: "GRP_MALFORMED",
        detail: "envelope.changeSetId is only valid for pre-change / post-change provenance",
      });
    }
  }

  scanForbidden(input, "", issues);
  return issues;
}

export interface VerifyRecoveryPointOptions {
  /** When false, skip Ed25519 verification (structure + digest only). */
  verifySignature?: boolean;
}

function verifyEnvelopeSignature(rp: RecoveryPoint): boolean {
  try {
    const raw = b64uToBuffer(rp.envelope.devicePubKey);
    // Raw Ed25519 public keys are wrapped in the fixed SPKI prefix so that
    // node:crypto can import them.
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      raw,
    ]);
    const key = createPublicKey({ key: spki, format: "der", type: "spki" });
    return edVerify(
      null,
      Buffer.from(canonicalize(recoveryPointSignedBody(rp)), "utf8"),
      key,
      b64uToBuffer(rp.envelope.signature),
    );
  } catch {
    return false;
  }
}

/**
 * Verify a Governance Recovery Point. Never throws — every failure is a
 * named issue, so a caller can report exactly what did not verify.
 */
export async function verifyRecoveryPoint(
  input: unknown,
  opts: VerifyRecoveryPointOptions = {},
): Promise<RecoveryPointReport> {
  const issues = validateRecoveryPointShape(input);
  const structural = issues.some((i) => i.code !== "GRP_FORBIDDEN_FIELD");
  if (structural) {
    return { ok: false, digestMatches: false, signatureVerified: false, issues };
  }

  const rp = input as RecoveryPoint;
  const identityDigest = computeRecoveryPointIdentity(rp);
  const digestMatches = identityDigest === rp.identityDigest;
  if (!digestMatches) {
    issues.push({
      code: "GRP_DIGEST_MISMATCH",
      detail: `recomputed ${identityDigest}, object claims ${rp.identityDigest}`,
    });
  }

  let signatureVerified = false;
  if (opts.verifySignature !== false) {
    signatureVerified = verifyEnvelopeSignature(rp);
    if (!signatureVerified) {
      issues.push({
        code: "GRP_SIGNATURE_INVALID",
        detail: "envelope signature did not verify against devicePubKey",
      });
    }
  }

  const ok = issues.length === 0 && digestMatches && signatureVerified;
  return { ok, identityDigest, digestMatches, signatureVerified, issues };
}

/**
 * Deduplicate by identity digest — the same governance state, however many
 * envelopes describe it. Deterministic: input order does not affect output.
 */
export function dedupeRecoveryPoints(points: readonly RecoveryPoint[]): RecoveryPoint[] {
  const byDigest = new Map<string, RecoveryPoint[]>();
  for (const p of points) {
    const list = byDigest.get(p.identityDigest) ?? [];
    list.push(p);
    byDigest.set(p.identityDigest, list);
  }
  return [...byDigest.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) =>
      [...list].sort((x, y) =>
        x.envelope.createdAt === y.envelope.createdAt
          ? x.envelope.deviceFingerprint.localeCompare(y.envelope.deviceFingerprint)
          : x.envelope.createdAt.localeCompare(y.envelope.createdAt),
      )[0],
    );
}
