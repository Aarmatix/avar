// Public API of @avar-standard/core.
// Clean-room implementation of AVAR 1.10 per the public AVAR specification.

export { canonicalize } from "./canonicalize.js";
export { verifyReceipt } from "./verify.js";
export type { Receipt, VerifyOptions, VerifyResult } from "./verify.js";
export { validateEvidence } from "./evidence.js";
export type {
  EvidenceEntry,
  EvidenceType,
  Depth,
  Source,
  Claims,
  ClaimField,
  ValidationOutput,
} from "./evidence.js";
export {
  EVIDENCE_TYPES,
  SOURCES,
  CLAIM_FIELDS,
  /** @deprecated Use EVIDENCE_TYPES. */
  DEPTHS,
} from "./evidence.js";
export { VerifyError, ERROR_CODES } from "./errors.js";
export type { ErrorCode } from "./errors.js";


// AVAR spec addendum 1.13 — Governance Recovery Points.
export {
  verifyRecoveryPoint,
  validateRecoveryPointShape,
  computeRecoveryPointIdentity,
  recoveryPointIdentityBody,
  recoveryPointSignedBody,
  dedupeRecoveryPoints,
  RECOVERY_POINT_KIND,
  RECOVERY_POINT_VERSION,
  RECOVERY_POINT_REF_KEYS,
  RECOVERY_POINT_PROVENANCE,
} from "./recovery-point.js";
export type {
  RecoveryPoint,
  RecoveryPointEnvelope,
  RecoveryPointRefs,
  RecoveryPointRefKey,
  RecoveryPointProvenance,
  RecoveryPointReport,
  RecoveryPointIssue,
  RecoveryPointErrorCode,
  VerifyRecoveryPointOptions,
} from "./recovery-point.js";

// AVAR 1.0 (Normative) — Entry, Bundle, and Verification Result.
export { ENTRY_FIELDS_1_0 } from "./entry.js";
export type { Entry, Step, ToolStep, TextStep, DecisionStep, ClosureBlock, AgentIdentity, Outcome } from "./entry.js";
export {
  GENESIS_PREV_HASH,
  GENESIS_PREV_STEP_HASH,
  sha256Hex,
  deviceFingerprintOf,
  signedBody,
  entryHashOf,
  stepHashOf,
  verifyBytes,
  verifyCanonical,
} from "./chain.js";
export {
  COMPAT_SPEC_ID,
  SUPPORTED_MAJORS,
  READABILITY_HORIZON_YEARS,
  parseSpecVersion,
  unresolvedFieldsOf,
  evaluateCompatibility,
} from "./compat.js";
export type { CompatibilityReport, Readability, UnresolvedField } from "./compat.js";
export {
  SPEC_VERSION,
  readZip,
  parseBundle,
  verifyBundle,
  verifyBundleBytes,
  canonicalReport,
} from "./bundle.js";
export type {
  Bundle,
  BundleManifest,
  Issue,
  IssueKind,
  Verdict,
  VerificationReport,
} from "./bundle.js";
