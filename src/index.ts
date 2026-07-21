// Public API of @avar/reference-verifier.
// Clean-room implementation of AVAR 1.10 per Aarmatix/avar-spec.

export { canonicalize } from "./canonicalize.js";
export { verifyReceipt } from "./verify.js";
export type { Receipt, VerifyOptions, VerifyResult } from "./verify.js";
export { validateEvidence } from "./evidence.js";
export type { Depth, Source, Claims, ClaimField } from "./evidence.js";
export { DEPTHS, SOURCES, CLAIM_FIELDS } from "./evidence.js";
export { VerifyError, ERROR_CODES } from "./errors.js";
export type { ErrorCode } from "./errors.js";
