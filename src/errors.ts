// Error codes defined normatively in RFC-0008 §8 and RFC-0009 §8.
// This module is derived solely from the public specification text at
// Aarmatix/avar-spec. No code lineage from any commercial verifier.

export const ERROR_CODES = {
  // RFC-0009 Producer Contract
  E_SIG_INVALID: "E-SIG-INVALID",
  E_CANON_INVALID: "E-CANON-INVALID",
  E_KEY_NOT_FOUND: "E-KEY-NOT-FOUND",
  E_CHAIN_BROKEN: "E-CHAIN-BROKEN",
  E_TIME_OUT_OF_RANGE: "E-TIME-OUT-OF-RANGE",
  E_PRODUCER_MISSING: "E-PRODUCER-MISSING",
  // RFC-0008 Evidence Model
  E_DEPTH_INVALID: "E-DEPTH-INVALID",
  E_SOURCE_INVALID: "E-SOURCE-INVALID",
  E_CLAIMS_MISSING: "E-CLAIMS-MISSING",
  E_CLAIMS_CONTRADICTION: "E-CLAIMS-CONTRADICTION",
  E_COHERENCE: "E-COHERENCE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class VerifyError extends Error {
  constructor(public code: ErrorCode, message: string, public path?: string) {
    super(`${code}: ${message}${path ? ` (at ${path})` : ""}`);
    this.name = "VerifyError";
  }
}
