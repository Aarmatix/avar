// Public entry point for the open AVAR standard verifier.
// Re-exports the stable verification API from @avar-standard/core.

export {
  canonicalize,
  verifyReceipt,
  validateEvidence,
  VerifyError,
  ERROR_CODES,
  EVIDENCE_TYPES,
  SOURCES,
  CLAIM_FIELDS,
  /** @deprecated Use EVIDENCE_TYPES. */
  DEPTHS,
} from "@avar-standard/core";

export type {
  Receipt,
  VerifyOptions,
  VerifyResult,
  EvidenceEntry,
  ValidationOutput,
  EvidenceType,
  Source,
  ClaimField,
  Claims,
  ErrorCode,
  /** @deprecated Use EvidenceType. */
  Depth,
} from "@avar-standard/core";

// AVAR 1.0 (Normative) — Bundle-level verification (SPEC §5, §6).
export {
  SPEC_VERSION,
  parseBundle,
  verifyBundle,
  verifyBundleBytes,
  canonicalReport,
  evaluateCompatibility,
  ENTRY_FIELDS_1_0,
} from "@avar-standard/core";

export type {
  Bundle,
  BundleManifest,
  Entry,
  Step,
  Issue,
  IssueKind,
  Verdict,
  VerificationReport,
  CompatibilityReport,
} from "@avar-standard/core";
