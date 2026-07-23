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
