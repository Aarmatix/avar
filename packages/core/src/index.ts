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

